/**
 * Pawn Movement Rules
 * 
 * Pawn moves:
 * - Forward one square (if empty)
 * - Forward two squares on first move (if both squares empty)
 * - Captures diagonally
 * - En passant capture
 * - Promotion on reaching final rank
 */

import { Board, Piece, Position, LegalMove, PieceType, GameMode } from '../types';
import { getPromotionPieces } from '../constants';
import { 
  isValidPosition, 
  getPieceAt, 
  isSquareEmpty, 
  hasEnemyPiece,
  getPawnDirection,
  getPawnStartRow,
  getPromotionRow,
  positionsEqual
} from '../utils';

/**
 * Get all pseudo-legal pawn moves
 */
export function getPawnMoves(
  board: Board,
  from: Position,
  piece: Piece,
  enPassantSquare: Position | null,
  gameMode: GameMode
): LegalMove[] {
  const moves: LegalMove[] = [];
  const boardSize = board.length;
  const direction = getPawnDirection(piece.color);
  const startRow = getPawnStartRow(piece.color, boardSize);
  const promotionRow = getPromotionRow(piece.color, boardSize);
  const promotionPieces = getPromotionPieces(gameMode);
  
  // Forward one square
  const oneForward: Position = { row: from.row + direction, col: from.col };
  
  if (isValidPosition(oneForward, boardSize) && isSquareEmpty(board, oneForward)) {
    // Check for promotion
    if (oneForward.row === promotionRow) {
      moves.push({
        from,
        to: oneForward,
        moveType: 'promotion',
        promotionOptions: promotionPieces,
      });
    } else {
      moves.push({
        from,
        to: oneForward,
        moveType: 'normal',
      });
      
      // Forward two squares (only from starting position)
      if (from.row === startRow) {
        const twoForward: Position = { row: from.row + 2 * direction, col: from.col };
        
        if (isValidPosition(twoForward, boardSize) && isSquareEmpty(board, twoForward)) {
          moves.push({
            from,
            to: twoForward,
            moveType: 'normal',
          });
        }
      }
    }
  }
  
  // Diagonal captures
  const captureOffsets = [
    { row: from.row + direction, col: from.col - 1 },
    { row: from.row + direction, col: from.col + 1 },
  ];
  
  for (const to of captureOffsets) {
    if (!isValidPosition(to, boardSize)) continue;
    
    // Regular capture
    if (hasEnemyPiece(board, to, piece.color)) {
      if (to.row === promotionRow) {
        moves.push({
          from,
          to,
          moveType: 'promotion',
          promotionOptions: promotionPieces,
        });
      } else {
        moves.push({
          from,
          to,
          moveType: 'capture',
        });
      }
    }
    
    // En passant capture
    if (enPassantSquare && positionsEqual(to, enPassantSquare)) {
      moves.push({
        from,
        to,
        moveType: 'en_passant',
      });
    }
  }
  
  return moves;
}
