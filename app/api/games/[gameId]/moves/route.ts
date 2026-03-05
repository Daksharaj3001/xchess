/**
 * POST /api/games/[gameId]/moves - Submit a move
 */
import { submitMove } from '@/lib/xchess/api';
import { NextRequest } from 'next/server';

export async function POST(
  request: NextRequest,
  { params }: { params: { gameId: string } }
) {
  const { gameId } = await params;
  return submitMove(gameId, request);
}
