/**
 * GET /api/multiplayer/games/[gameId] - Get game state
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const { gameId } = await params;
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('multiplayer_games')
      .select('data')
      .eq('game_id', gameId)
      .single() as { data: any; error: any };

    if (error || !data) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    return NextResponse.json(data.data);
  } catch (error) {
    console.error('Get game error:', error);
    return NextResponse.json({ error: 'Failed to get game' }, { status: 500 });
  }
}
