/**
 * POST /api/multiplayer/games/[gameId]/join - Join a game as opponent
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
    const { playerName } = body as { playerName?: string };

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

    if (game.status !== 'waiting') {
      return NextResponse.json({ error: 'Game already started or completed' }, { status: 400 });
    }

    game.status = 'active';
    game.opponentName = playerName || 'Player 2';
    game.updatedAt = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from('multiplayer_games')
      .update({ data: game })
      .eq('game_id', gameId);

    if (updateErr) throw updateErr;

    const opponentColor = game.creatorColor === 'white' ? 'black' : 'white';

    return NextResponse.json({
      gameId,
      playerColor: opponentColor,
      mode: game.mode,
      status: 'active',
    });
  } catch (error) {
    console.error('Join game error:', error);
    return NextResponse.json({ error: 'Failed to join game' }, { status: 500 });
  }
}
