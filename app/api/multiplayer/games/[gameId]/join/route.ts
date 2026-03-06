/**
 * POST /api/multiplayer/games/[gameId]/join - Join a game as opponent
 */
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function POST(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  try {
    const { gameId } = await params;
    const body = await request.json();
    const { playerName } = body as { playerName?: string };

    const db = await getDb();
    const game = await db.collection('games').findOne({ gameId });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== 'waiting') {
      return NextResponse.json({ error: 'Game already started or completed' }, { status: 400 });
    }

    await db.collection('games').updateOne(
      { gameId },
      {
        $set: {
          status: 'active',
          opponentName: playerName || 'Player 2',
          updatedAt: new Date().toISOString(),
        },
      }
    );

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
