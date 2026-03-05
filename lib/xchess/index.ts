/**
 * XChess Rules Engine - Public API
 * 
 * Server-authoritative game logic for XChess platform.
 * 
 * Usage:
 * ```typescript
 * import { createGame, getLegalMoves, applyMove, isCheckmate } from '@/lib/xchess';
 * 
 * // Create new game
 * const state = createGame('v2_artillery');
 * 
 * // Get legal moves for a piece
 * const moves = getLegalMovesForPiece(state, { row: 1, col: 4 });
 * 
 * // Apply a move
 * const result = applyMove(state, { row: 1, col: 4 }, { row: 3, col: 4 });
 * 
 * // Check game status
 * if (result.isCheckmate) {
 *   console.log(`Checkmate! ${result.newState.winner} wins!`);
 * }
 * ```
 */

// Types
export * from './types';

// Constants
export { GAME_MODES, PIECE_VALUES, getPromotionPieces } from './constants';

// Utilities
export {
  createInitialGameState,
  cloneGameState,
  positionToAlgebraic,
  algebraicToPosition,
  getPieceAt,
  findKing,
  findPieces,
  getOpponentColor,
} from './utils';

// Engine (core functions)
export {
  createGame,
  getLegalMoves,
  getLegalMovesForPiece,
  validateMove,
  applyMove,
  isCheck,
  isCheckmate,
  isStalemate,
} from './engine';

// Check detection (for advanced use)
export { isSquareAttacked, isInCheck } from './check';

// Archer utilities (for UI hints)
export { getArcherFireTargets, validateArcherFireSelection } from './moves/archer';
