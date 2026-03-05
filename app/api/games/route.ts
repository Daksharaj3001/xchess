/**
 * POST /api/games - Create a new game
 */
import { createNewGame } from '@/lib/xchess/api';

export async function POST(request: Request) {
  return createNewGame(request);
}
