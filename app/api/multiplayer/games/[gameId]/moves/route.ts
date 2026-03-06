/**
 * POST /api/multiplayer/games/[gameId]/moves - Submit a move
 * Server-authoritative: validates move using XChess engine
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
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

    const db = await getDb();
    const game = await db.collection('games').findOne({ gameId });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== 'active') {
      return NextResponse.json({ error: 'Game is not active' }, { status: 400 });
    }

    const state = game.state as GameState;

    // Verify it's this player's turn
    if (state.currentTurn !== playerColor) {
      return NextResponse.json({ error: 'Not your turn' }, { status: 400 });
    }

    // Verify move number matches (desync prevention)
    if (state.moveHistory.length !== moveNumber) {
      return NextResponse.json({
        error: 'State desynchronized',
        expectedMoveNumber: state.moveHistory.length,
        state: game.state,
        legalMoves: game.legalMoves,
      }, { status: 409 });
    }

    // Apply move using the engine
    const result = applyMove(state, from, to, promotionPiece, archerTargets);

    if (!result.success || !result.newState) {
      return NextResponse.json({ error: result.error || 'Invalid move' }, { status: 400 });
    }

    const newLegalMoves = getLegalMoves(result.newState);

    // Determine game completion
    let newStatus = 'active';
    let gameResult = null;
    if (result.isCheckmate) {
      newStatus = 'completed';
      gameResult = `${playerColor}_wins`;
    } else if (result.isStalemate || result.newState.isDraw) {
      newStatus = 'completed';
      gameResult = 'draw';
    }

    // Store in DB
    await db.collection('games').updateOne(
      { gameId },
      {
        $set: {
          state: JSON.parse(JSON.stringify(result.newState)),
          legalMoves: JSON.parse(JSON.stringify(newLegalMoves)),
          status: newStatus,
          result: gameResult,
          moveCount: result.newState.moveHistory.length,
          updatedAt: new Date().toISOString(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      state: result.newState,
      legalMoves: newLegalMoves,
      isCheck: result.isCheck,
      isCheckmate: result.isCheckmate,
      isStalemate: result.isStalemate,
      gameStatus: newStatus,
      gameResult,
    });
  } catch (error) {
    console.error('Move error:', error);
    return NextResponse.json({ error: 'Failed to process move' }, { status: 500 });
  }
}
