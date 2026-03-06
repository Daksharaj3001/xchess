/**
 * Knight Movement Rules
 * 
 * The Knight moves in an L-shape: two squares in one direction and one perpendicular.
 * Knights can jump over other pieces.
 */

import { Board, Piece, Position, LegalMove } from '../types';
import { KNIGHT_MOVES } from '../constants';
import { isValidPosition, canMoveToSquare, getPieceAt } from '../utils';

/**
 * Get all pseudo-legal knight moves
 */
export function getKnightMoves(
  board: Board,
  from: Position,
  piece: Piece
): LegalMove[] {
  const moves: LegalMove[] = [];
  const boardSize = board.length;
  
  for (const offset of KNIGHT_MOVES) {
    const to: Position = {
      row: from.row + offset.row,
      col: from.col + offset.col,
    };
    
    if (isValidPosition(to, boardSize) && canMoveToSquare(board, to, piece.color)) {
      const targetPiece = getPieceAt(board, to);
      moves.push({
        from,
        to,
        moveType: targetPiece ? 'capture' : 'normal',
      });
    }
  }
  
  return moves;
}
