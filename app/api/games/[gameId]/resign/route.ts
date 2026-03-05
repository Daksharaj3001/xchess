/**
 * POST /api/games/[gameId]/resign - Resign from game
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { handleCORS } from '@/lib/xchess/api';

export async function POST(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const { gameId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return handleCORS(NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ));
    }

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

    const isWhite = game.white_player_id === user.id;
    const isBlack = game.black_player_id === user.id;

    if (!isWhite && !isBlack) {
      return handleCORS(NextResponse.json(
        { error: 'You are not a participant in this game' },
        { status: 403 }
      ));
    }

    const winner = isWhite ? 'black_wins' : 'white_wins';
    const winnerId = isWhite ? game.black_player_id : game.white_player_id;

    await supabase
      .from('games')
      .update({
        status: 'completed',
        result: winner,
        termination: 'resignation',
        winner_id: winnerId,
        completed_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    return handleCORS(NextResponse.json({
      success: true,
      result: winner,
    }));
  } catch (error) {
    console.error('Resign error:', error);
    return handleCORS(NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    ));
  }
}
