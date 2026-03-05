/**
 * GET /api/games/[gameId] - Get game state
 */
import { getGame } from '@/lib/xchess/api';
import { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  const { gameId } = await params;
  return getGame(gameId);
}
