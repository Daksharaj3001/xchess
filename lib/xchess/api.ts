/**
 * XChess Game API Routes
 * 
 * Server-authoritative game management endpoints.
 * All game state changes go through these routes.
 */

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  createGame,
  getLegalMoves,
  applyMove,
  isCheckmate,
  isStalemate,
  GameState,
  GameMode,
} from '@/lib/xchess';
import {
  trackGameStarted,
  trackMoveCommitted,
  trackIllegalMoveAttempt,
  trackGameFinished,
  trackArcherFireUsed,
  trackCheckDetected,
  trackCheckmateOccurred,
} from '@/lib/xchess/analytics';

// Helper for CORS
function handleCORS(response: NextResponse) {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}

/**
 * POST /api/games - Create a new game
 */
export async function createNewGame(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return handleCORS(NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ));
    }
    
    const body = await request.json();
    const {
      mode = 'v1_classical',
      timeControlInitial = 600,
      timeControlIncrement = 0,
      rated = true,
      opponentId,
    } = body;
    
    // Validate game mode
    if (!['v1_classical', 'v2_artillery'].includes(mode)) {
      return handleCORS(NextResponse.json(
        { error: 'Invalid game mode' },
        { status: 400 }
      ));
    }
    
    // Create game state
    const gameState = createGame(mode as GameMode);
    
    // Insert game into Supabase
    const { data: game, error } = await supabase
      .from('games')
      .insert({
        white_player_id: user.id,
        black_player_id: opponentId || null,
        mode: mode === 'v2_artillery' ? 'archer' : 'standard',
        time_control_initial: timeControlInitial,
        time_control_increment: timeControlIncrement,
        rated,
        status: opponentId ? 'active' : 'waiting',
        current_fen: gameStateToFen(gameState),
        move_number: 1,
        is_white_turn: true,
        white_time_remaining: timeControlInitial * 1000,
        black_time_remaining: timeControlInitial * 1000,
        archer_state: gameState.gameMode === 'v2_artillery' ? {} : null,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating game:', error);
      return handleCORS(NextResponse.json(
        { error: 'Failed to create game' },
        { status: 500 }
      ));
    }
    
    // Track analytics
    await trackGameStarted(game.id, mode, rated);
    
    // Return game with legal moves
    const legalMoves = getLegalMoves(gameState);
    
    return handleCORS(NextResponse.json({
      gameId: game.id,
      state: gameState,
      legalMoves,
    }));
    
  } catch (error) {
    console.error('Create game error:', error);
    return handleCORS(NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    ));
  }
}

/**
 * GET /api/games/[gameId] - Get game state
 */
export async function getGame(gameId: string) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: game, error } = await supabase
      .from('games')
      .select(`
        *,
        white_player:profiles!games_white_player_id_fkey(id, username, avatar_url),
        black_player:profiles!games_black_player_id_fkey(id, username, avatar_url)
      `)
      .eq('id', gameId)
      .single();
    
    if (error || !game) {
      return handleCORS(NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      ));
    }
    
    // Reconstruct game state from database
    const gameState = reconstructGameState(game);
    const legalMoves = getLegalMoves(gameState);
    
    return handleCORS(NextResponse.json({
      gameId: game.id,
      state: gameState,
      legalMoves,
      players: {
        white: game.white_player,
        black: game.black_player,
      },
      timeRemaining: {
        white: game.white_time_remaining,
        black: game.black_time_remaining,
      },
    }));
    
  } catch (error) {
    console.error('Get game error:', error);
    return handleCORS(NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    ));
  }
}

/**
 * POST /api/games/[gameId]/moves - Submit a move
 */
export async function submitMove(gameId: string, request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return handleCORS(NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ));
    }
    
    const body = await request.json();
    const { from, to, promotionPiece, archerTargets } = body;
    
    // Get current game
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();
    
    if (gameError || !game) {
      return handleCORS(NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      ));
    }
    
    // Validate player is in this game
    const isWhite = game.white_player_id === user.id;
    const isBlack = game.black_player_id === user.id;
    
    if (!isWhite && !isBlack) {
      return handleCORS(NextResponse.json(
        { error: 'You are not a participant in this game' },
        { status: 403 }
      ));
    }
    
    // Validate it's the player's turn
    const isMyTurn = (game.is_white_turn && isWhite) || (!game.is_white_turn && isBlack);
    
    if (!isMyTurn) {
      await trackIllegalMoveAttempt(gameId, game.move_number, game.mode, 'not_your_turn');
      return handleCORS(NextResponse.json(
        { error: 'Not your turn' },
        { status: 400 }
      ));
    }
    
    // Validate game is active
    if (game.status !== 'active') {
      return handleCORS(NextResponse.json(
        { error: 'Game is not active' },
        { status: 400 }
      ));
    }
    
    // Reconstruct game state
    const gameState = reconstructGameState(game);
    
    // Apply move using engine
    const result = applyMove(gameState, from, to, promotionPiece, archerTargets);
    
    if (!result.success) {
      await trackIllegalMoveAttempt(gameId, game.move_number, game.mode, result.error || 'invalid_move');
      return handleCORS(NextResponse.json(
        { error: result.error || 'Invalid move' },
        { status: 400 }
      ));
    }
    
    const newState = result.newState!;
    
    // Record move in database
    const moveData = {
      game_id: gameId,
      move_number: game.move_number,
      is_white: game.is_white_turn,
      san: generateSan(from, to, gameState),
      uci: `${posToUci(from)}${posToUci(to)}${promotionPiece ? promotionPiece[0] : ''}`,
      fen_before: gameStateToFen(gameState),
      fen_after: gameStateToFen(newState),
      is_capture: result.capturedPieces && result.capturedPieces.length > 0,
      is_check: result.isCheck,
      is_checkmate: result.isCheckmate,
      is_archer_shot: archerTargets && archerTargets.length > 0,
      archer_target_square: archerTargets ? archerTargets.map(posToUci).join(',') : null,
    };
    
    const { error: moveError } = await supabase
      .from('game_moves')
      .insert(moveData);
    
    if (moveError) {
      console.error('Error recording move:', moveError);
    }
    
    // Update game state
    const gameUpdate: Record<string, unknown> = {
      current_fen: gameStateToFen(newState),
      move_number: newState.moveNumber,
      is_white_turn: newState.currentTurn === 'white',
      last_move_at: new Date().toISOString(),
    };
    
    // Update status if game ended
    if (result.isCheckmate) {
      gameUpdate.status = 'completed';
      gameUpdate.result = game.is_white_turn ? 'white_wins' : 'black_wins';
      gameUpdate.termination = 'checkmate';
      gameUpdate.winner_id = user.id;
      gameUpdate.completed_at = new Date().toISOString();
      
      await trackCheckmateOccurred(gameId, newState.moveNumber, game.mode, isWhite ? 'white' : 'black');
    } else if (result.isStalemate || newState.isDraw) {
      gameUpdate.status = 'completed';
      gameUpdate.result = 'draw';
      gameUpdate.termination = result.isStalemate ? 'stalemate' : 'fifty_moves';
      gameUpdate.completed_at = new Date().toISOString();
    }
    
    await supabase
      .from('games')
      .update(gameUpdate)
      .eq('id', gameId);
    
    // Track analytics
    await trackMoveCommitted(
      gameId,
      newState.moveNumber,
      game.mode,
      result.capturedPieces && result.capturedPieces.length > 0,
      result.isCheck || false
    );
    
    if (archerTargets && archerTargets.length > 0) {
      await trackArcherFireUsed(gameId, newState.moveNumber, game.mode, archerTargets.length);
    }
    
    if (result.isCheck && !result.isCheckmate) {
      await trackCheckDetected(gameId, newState.moveNumber, game.mode);
    }
    
    // Get new legal moves
    const legalMoves = getLegalMoves(newState);
    
    return handleCORS(NextResponse.json({
      success: true,
      state: newState,
      legalMoves,
      isCheck: result.isCheck,
      isCheckmate: result.isCheckmate,
      isStalemate: result.isStalemate,
      capturedPieces: result.capturedPieces,
    }));
    
  } catch (error) {
    console.error('Submit move error:', error);
    return handleCORS(NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    ));
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert position to UCI notation
 */
function posToUci(pos: { row: number; col: number }): string {
  return String.fromCharCode('a'.charCodeAt(0) + pos.col) + (pos.row + 1);
}

/**
 * Generate SAN notation (simplified)
 */
function generateSan(
  from: { row: number; col: number },
  to: { row: number; col: number },
  state: GameState
): string {
  const piece = state.board[from.row][from.col];
  if (!piece) return '';
  
  const pieceSymbols: Record<string, string> = {
    king: 'K',
    queen: 'Q',
    rook: 'R',
    bishop: 'B',
    knight: 'N',
    archer: 'A',
    pawn: '',
  };
  
  const targetPiece = state.board[to.row][to.col];
  const isCapture = targetPiece !== null;
  const symbol = pieceSymbols[piece.type];
  const dest = posToUci(to);
  
  if (piece.type === 'pawn' && isCapture) {
    return String.fromCharCode('a'.charCodeAt(0) + from.col) + 'x' + dest;
  }
  
  return symbol + (isCapture ? 'x' : '') + dest;
}

/**
 * Convert game state to FEN-like string
 */
function gameStateToFen(state: GameState): string {
  const rows: string[] = [];
  
  for (let row = state.board.length - 1; row >= 0; row--) {
    let rowStr = '';
    let emptyCount = 0;
    
    for (let col = 0; col < state.board[row].length; col++) {
      const piece = state.board[row][col];
      
      if (!piece) {
        emptyCount++;
      } else {
        if (emptyCount > 0) {
          rowStr += emptyCount;
          emptyCount = 0;
        }
        
        const symbols: Record<string, string> = {
          king: 'k',
          queen: 'q',
          rook: 'r',
          bishop: 'b',
          knight: 'n',
          pawn: 'p',
          archer: 'a',
        };
        
        let symbol = symbols[piece.type];
        if (piece.color === 'white') {
          symbol = symbol.toUpperCase();
        }
        rowStr += symbol;
      }
    }
    
    if (emptyCount > 0) {
      rowStr += emptyCount;
    }
    
    rows.push(rowStr);
  }
  
  return rows.join('/');
}

/**
 * Reconstruct game state from database record
 */
import { createInitialGameState, cloneGameState } from '@/lib/xchess';

function reconstructGameState(game: Record<string, unknown>): GameState {
  const mode = game.mode === 'archer' ? 'v2_artillery' : 'v1_classical';
  const state = createInitialGameState(mode as GameMode);
  
  // For now, return initial state
  // In production, we'd parse the FEN and move history
  state.currentTurn = game.is_white_turn ? 'white' : 'black';
  state.moveNumber = game.move_number as number || 1;
  
  return state;
}

export { handleCORS };
