/**
 * POST /api/multiplayer/games - Create a new online game
 */
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createGame, getLegalMoves } from '@/lib/xchess';
import type { GameMode } from '@/lib/xchess/types';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mode, playerColor, creatorName, timeControl } = body as {
      mode: GameMode;
      playerColor?: 'white' | 'black' | 'random';
      creatorName?: string;
      timeControl?: { base: number; increment: number };
    };

    if (!mode || !['v1_classical', 'v2_artillery'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid game mode' }, { status: 400 });
    }

    const gameId = uuidv4().slice(0, 8);
    const gameState = createGame(mode);
    const legalMoves = getLegalMoves(gameState);

    let assignedColor: 'white' | 'black' = 'white';
    if (playerColor === 'black') assignedColor = 'black';
    else if (playerColor === 'random') assignedColor = Math.random() < 0.5 ? 'white' : 'black';

    const now = new Date().toISOString();
    const hasTimer = timeControl && timeControl.base > 0;

    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from('multiplayer_games').insert({
      game_id: gameId,
      data: {
        gameId,
        mode,
        status: 'waiting',
        creatorColor: assignedColor,
        creatorName: creatorName || 'Player 1',
        opponentName: null,
        state: gameState,
        legalMoves,
        moveCount: 0,
        result: null,
        timeControl: hasTimer ? { base: timeControl.base, increment: timeControl.increment } : null,
        whiteTimeMs: hasTimer ? timeControl.base : 0,
        blackTimeMs: hasTimer ? timeControl.base : 0,
        lastMoveAt: null,
        createdAt: now,
        updatedAt: now,
      },
    });

    if (error) throw error;

    return NextResponse.json({
      gameId,
      mode,
      playerColor: assignedColor,
      status: 'waiting',
    });
  } catch (error) {
    console.error('Create game error:', error);
    return NextResponse.json({ error: 'Failed to create game' }, { status: 500 });
  }
}
