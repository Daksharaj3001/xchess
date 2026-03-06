/**
 * XChess Game State API
 * 
 * API functions for game state management with Supabase.
 */

import { createClient } from '@/lib/supabase/client';
import {
  GameState,
  GameMode,
  Position,
  PieceType,
} from './types';
import { createInitialGameState, cloneGameState } from './utils';
import { applyMove, getLegalMoves } from './engine';
import { serializeGameState, deserializeGameState, generateMoveNotation, positionToAlgebraic } from './serialization';
import {
  StoredMove,
  ReplayState,
  createReplayState,
  reconstructGame,
  stepForward,
  stepBackward,
  jumpToMove,
} from './replay';

// ============================================================================
// DATABASE TYPES
// ============================================================================

export interface GameRecord {
  id: string;
  white_player_id: string | null;
  black_player_id: string | null;
  mode: string;
  time_control_initial: number;
  time_control_increment: number;
  rated: boolean;
  status: string;
  current_fen: string;
  move_number: number;
  is_white_turn: boolean;
  white_time_remaining: number | null;
  black_time_remaining: number | null;
  last_move_at: string | null;
  result: string | null;
  termination: string | null;
  winner_id: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface MoveRecord {
  id: string;
  game_id: string;
  move_number: number;
  is_white: boolean;
  san: string;
  uci: string;
  fen_before: string;
  fen_after: string;
  is_capture: boolean;
  is_check: boolean;
  is_checkmate: boolean;
  is_castle: boolean;
  promotion_piece: string | null;
  is_archer_shot: boolean;
  archer_target_square: string | null;
  time_spent: number | null;
  time_remaining: number | null;
  created_at: string;
}

// ============================================================================
// GET GAME STATE
// ============================================================================

/**
 * Get current game state from Supabase
 */
export async function getGameState(gameId: string): Promise<{
  game: GameRecord;
  state: GameState;
  legalMoves: ReturnType<typeof getLegalMoves>;
} | null> {
  const supabase = createClient();
  
  // Fetch game record
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();
  
  if (gameError || !game) {
    console.error('Failed to fetch game:', gameError);
    return null;
  }
  
  // Fetch move history
  const { data: moves, error: movesError } = await supabase
    .from('game_moves')
    .select('*')
    .eq('game_id', gameId)
    .order('move_number', { ascending: true })
    .order('is_white', { ascending: false });
  
  if (movesError) {
    console.error('Failed to fetch moves:', movesError);
  }
  
  // Determine game mode
  const gameMode: GameMode = game.mode === 'archer' ? 'v2_artillery' : 'v1_classical';
  
  // Reconstruct game state
  const storedMoves: StoredMove[] = (moves || []).map(convertMoveRecord);
  const { finalState } = reconstructGame(gameMode, storedMoves);
  
  // Get legal moves for current position
  const legalMoves = getLegalMoves(finalState);
  
  return {
    game,
    state: finalState,
    legalMoves,
  };
}

/**
 * Get game for replay (with full move history)
 */
export async function getGameForReplay(gameId: string): Promise<ReplayState | null> {
  const supabase = createClient();
  
  // Fetch game record
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single();
  
  if (gameError || !game) {
    console.error('Failed to fetch game:', gameError);
    return null;
  }
  
  // Fetch all moves
  const { data: moves, error: movesError } = await supabase
    .from('game_moves')
    .select('*')
    .eq('game_id', gameId)
    .order('move_number', { ascending: true })
    .order('is_white', { ascending: false });
  
  if (movesError) {
    console.error('Failed to fetch moves:', movesError);
    return null;
  }
  
  const gameMode: GameMode = game.mode === 'archer' ? 'v2_artillery' : 'v1_classical';
  const storedMoves: StoredMove[] = (moves || []).map(convertMoveRecord);
  
  return createReplayState(gameId, gameMode, storedMoves);
}

// ============================================================================
// APPLY MOVE (WITH DATABASE UPDATE)
// ============================================================================

export interface ApplyMoveResult {
  success: boolean;
  error?: string;
  newState?: GameState;
  isCheck?: boolean;
  isCheckmate?: boolean;
  isStalemate?: boolean;
}

/**
 * Apply a move and persist to Supabase
 */
export async function applyMoveToGame(
  gameId: string,
  from: Position,
  to: Position,
  promotionPiece?: PieceType,
  archerTargets?: Position[]
): Promise<ApplyMoveResult> {
  const supabase = createClient();
  
  // Get current game state
  const gameData = await getGameState(gameId);
  if (!gameData) {
    return { success: false, error: 'Game not found' };
  }
  
  const { game, state } = gameData;
  
  // Check if game is active
  if (game.status !== 'active') {
    return { success: false, error: 'Game is not active' };
  }
  
  // Get the piece being moved
  const piece = state.board[from.row]?.[from.col];
  if (!piece) {
    return { success: false, error: 'No piece at source position' };
  }
  
  // Apply move using engine
  const result = applyMove(state, from, to, promotionPiece, archerTargets);
  
  if (!result.success || !result.newState) {
    return { success: false, error: result.error || 'Invalid move' };
  }
  
  const newState = result.newState;
  
  // Generate move notation
  const isCapture = result.capturedPieces && result.capturedPieces.length > 0;
  const isCastle = piece.type === 'king' && Math.abs(to.col - from.col) === 2;
  const castleSide = isCastle ? (to.col > from.col ? 'kingside' : 'queenside') : null;
  
  const notation = generateMoveNotation(
    from,
    to,
    piece,
    isCapture || false,
    result.isCheck || false,
    result.isCheckmate || false,
    castleSide,
    promotionPiece,
    archerTargets
  );
  
  // Insert move record
  const moveRecord = {
    game_id: gameId,
    move_number: state.moveNumber,
    is_white: state.currentTurn === 'white',
    san: notation.san,
    uci: notation.uci,
    fen_before: serializeGameState(state),
    fen_after: serializeGameState(newState),
    is_capture: isCapture || false,
    is_check: result.isCheck || false,
    is_checkmate: result.isCheckmate || false,
    is_castle: isCastle,
    promotion_piece: promotionPiece || null,
    is_archer_shot: archerTargets && archerTargets.length > 0,
    archer_target_square: archerTargets ? archerTargets.map(t => positionToAlgebraic(t)).join(',') : null,
  };
  
  const { error: moveError } = await supabase
    .from('game_moves')
    .insert(moveRecord);
  
  if (moveError) {
    console.error('Failed to insert move:', moveError);
    return { success: false, error: 'Failed to save move' };
  }
  
  // Update game record
  const gameUpdate: Record<string, unknown> = {
    current_fen: serializeGameState(newState),
    move_number: newState.moveNumber,
    is_white_turn: newState.currentTurn === 'white',
    last_move_at: new Date().toISOString(),
  };
  
  // Handle game end
  if (result.isCheckmate) {
    gameUpdate.status = 'completed';
    gameUpdate.result = state.currentTurn === 'white' ? 'white_wins' : 'black_wins';
    gameUpdate.termination = 'checkmate';
    gameUpdate.completed_at = new Date().toISOString();
  } else if (result.isStalemate || newState.isDraw) {
    gameUpdate.status = 'completed';
    gameUpdate.result = 'draw';
    gameUpdate.termination = result.isStalemate ? 'stalemate' : 'fifty_moves';
    gameUpdate.completed_at = new Date().toISOString();
  }
  
  const { error: updateError } = await supabase
    .from('games')
    .update(gameUpdate)
    .eq('id', gameId);
  
  if (updateError) {
    console.error('Failed to update game:', updateError);
  }
  
  return {
    success: true,
    newState,
    isCheck: result.isCheck,
    isCheckmate: result.isCheckmate,
    isStalemate: result.isStalemate,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function convertMoveRecord(record: MoveRecord): StoredMove {
  return {
    id: record.id,
    gameId: record.game_id,
    moveNumber: record.move_number,
    isWhite: record.is_white,
    san: record.san,
    uci: record.uci,
    fenBefore: record.fen_before,
    fenAfter: record.fen_after,
    isCapture: record.is_capture,
    isCheck: record.is_check,
    isCheckmate: record.is_checkmate,
    isCastle: record.is_castle,
    promotionPiece: record.promotion_piece as PieceType | undefined,
    isArcherShot: record.is_archer_shot,
    archerTargetSquare: record.archer_target_square || undefined,
    timeSpent: record.time_spent || undefined,
    timeRemaining: record.time_remaining || undefined,
    createdAt: record.created_at,
  };
}
