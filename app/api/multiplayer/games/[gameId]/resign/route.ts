/**
 * POST /api/multiplayer/games/[gameId]/resign - Resign from game
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
    const { playerColor } = body as { playerColor: 'white' | 'black' };

    const db = await getDb();
    const game = await db.collection('games').findOne({ gameId });

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    if (game.status !== 'active') {
      return NextResponse.json({ error: 'Game is not active' }, { status: 400 });
    }

    const winner = playerColor === 'white' ? 'black' : 'white';

    await db.collection('games').updateOne(
      { gameId },
      {
        $set: {
          status: 'completed',
          result: `${winner}_wins`,
          updatedAt: new Date().toISOString(),
        },
      }
    );

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
