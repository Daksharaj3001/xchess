/**
 * POST /api/multiplayer/games/[gameId]/moves - Submit a move
 * Server-authoritative: validates move using XChess engine
 * Handles timer logic: deduct elapsed time, add increment, detect timeout
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { applyMove, getLegalMoves } from '@/lib/xchess';
import type { GameState, Position, PieceType } from '@/lib/xchess/types';

export async function POST(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const { gameId } = await params;
    const body = await request.json();
    const { from, to, promotionPiece, archerTargets, playerColor, moveNumber } = body as {
      from: Position;
      to: Position;
      promotionPiece?: PieceType;
      archerTargets?: Position[];
      playerColor: 'white' | 'black';
      moveNumber: number;
    };

    const supabase = getSupabaseAdmin();
    const { data: row, error: fetchErr } = await supabase
      .from('multiplayer_games')
      .select('data')
      .eq('game_id', gameId)
      .single() as { data: any; error: any };

    if (fetchErr || !row) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const game = row.data as Record<string, any>;

    if (game.status !== 'active') {
      return NextResponse.json({ error: 'Game is not active' }, { status: 400 });
    }

    const state = game.state as GameState;

    if (state.currentTurn !== playerColor) {
      return NextResponse.json({ error: 'Not your turn' }, { status: 400 });
    }

    if (state.moveHistory.length !== moveNumber) {
      return NextResponse.json({
        error: 'State desynchronized',
        expectedMoveNumber: state.moveHistory.length,
        state: game.state,
        legalMoves: game.legalMoves,
        whiteTimeMs: game.whiteTimeMs,
        blackTimeMs: game.blackTimeMs,
      }, { status: 409 });
    }

    // Timer logic
    const hasTimer = game.timeControl && game.timeControl.base > 0;
    let whiteTimeMs = game.whiteTimeMs || 0;
    let blackTimeMs = game.blackTimeMs || 0;
    const now = Date.now();

    if (hasTimer && game.lastMoveAt) {
      const elapsed = now - new Date(game.lastMoveAt).getTime();
      if (playerColor === 'white') {
        whiteTimeMs = Math.max(0, whiteTimeMs - elapsed);
        if (whiteTimeMs <= 0) {
          game.status = 'completed';
          game.result = 'black_wins';
          game.whiteTimeMs = 0;
          game.updatedAt = new Date().toISOString();
          await supabase.from('multiplayer_games').update({ data: game }).eq('game_id', gameId);
          return NextResponse.json({
            success: false, error: 'Time expired',
            gameStatus: 'completed', gameResult: 'black_wins',
            whiteTimeMs: 0, blackTimeMs,
          });
        }
      } else {
        blackTimeMs = Math.max(0, blackTimeMs - elapsed);
        if (blackTimeMs <= 0) {
          game.status = 'completed';
          game.result = 'white_wins';
          game.blackTimeMs = 0;
          game.updatedAt = new Date().toISOString();
          await supabase.from('multiplayer_games').update({ data: game }).eq('game_id', gameId);
          return NextResponse.json({
            success: false, error: 'Time expired',
            gameStatus: 'completed', gameResult: 'white_wins',
            whiteTimeMs, blackTimeMs: 0,
          });
        }
      }
    }

    // Apply move
    const result = applyMove(state, from, to, promotionPiece, archerTargets);

    if (!result.success || !result.newState) {
      return NextResponse.json({ error: result.error || 'Invalid move' }, { status: 400 });
    }

    // Add increment after successful move
    if (hasTimer && game.timeControl.increment > 0) {
      if (playerColor === 'white') whiteTimeMs += game.timeControl.increment;
      else blackTimeMs += game.timeControl.increment;
    }

    const newLegalMoves = getLegalMoves(result.newState);

    let newStatus = 'active';
    let gameResult = null;
    if (result.isCheckmate) {
      newStatus = 'completed';
      gameResult = `${playerColor}_wins`;
    } else if (result.isStalemate || result.newState.isDraw) {
      newStatus = 'completed';
      gameResult = 'draw';
    }

    game.state = result.newState;
    game.legalMoves = newLegalMoves;
    game.status = newStatus;
    game.result = gameResult;
    game.moveCount = result.newState.moveHistory.length;
    game.whiteTimeMs = whiteTimeMs;
    game.blackTimeMs = blackTimeMs;
    game.lastMoveAt = new Date().toISOString();
    game.updatedAt = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from('multiplayer_games')
      .update({ data: game })
      .eq('game_id', gameId);

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      state: result.newState,
      legalMoves: newLegalMoves,
      isCheck: result.isCheck,
      isCheckmate: result.isCheckmate,
      isStalemate: result.isStalemate,
      gameStatus: newStatus,
      gameResult,
      whiteTimeMs,
      blackTimeMs,
    });
  } catch (error) {
    console.error('Move error:', error);
    return NextResponse.json({ error: 'Failed to process move' }, { status: 500 });
  }
}
