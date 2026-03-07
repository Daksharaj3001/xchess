/**
 * POST /api/multiplayer/games/[gameId]/resign - Resign from game
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const { gameId } = await params;
    const body = await request.json();
    const { playerColor } = body as { playerColor: 'white' | 'black' };

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

    const winner = playerColor === 'white' ? 'black' : 'white';

    game.status = 'completed';
    game.result = `${winner}_wins`;
    game.updatedAt = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from('multiplayer_games')
      .update({ data: game })
      .eq('game_id', gameId);

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      result: `${winner}_wins`,
      reason: 'resignation',
    });
  } catch (error) {
    console.error('Resign error:', error);
    return NextResponse.json({ error: 'Failed to resign' }, { status: 500 });
  }
}
