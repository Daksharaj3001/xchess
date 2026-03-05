/**
 * Rook Movement Rules
 * 
 * The Rook moves any number of squares horizontally or vertically.
 */

import { Board, Piece, Position, LegalMove } from '../types';
import { ORTHOGONAL_DIRECTIONS } from '../constants';
import { isValidPosition, getPieceAt } from '../utils';

/**
 * Get all pseudo-legal rook moves
 */
export function getRookMoves(
  board: Board,
  from: Position,
  piece: Piece
): LegalMove[] {
  const moves: LegalMove[] = [];
  const boardSize = board.length;
  
  // Rook moves in 4 orthogonal directions
  for (const dir of ORTHOGONAL_DIRECTIONS) {
    let currentPos: Position = {
      row: from.row + dir.row,
      col: from.col + dir.col,
    };
    
    while (isValidPosition(currentPos, boardSize)) {
      const targetPiece = getPieceAt(board, currentPos);
      
      if (targetPiece === null) {
        // Empty square
        moves.push({
          from,
          to: { ...currentPos },
          moveType: 'normal',
        });
      } else if (targetPiece.color !== piece.color) {
        // Enemy piece - capture
        moves.push({
          from,
          to: { ...currentPos },
          moveType: 'capture',
        });
        break;
      } else {
        // Friendly piece - blocked
        break;
      }
      
      currentPos = {
        row: currentPos.row + dir.row,
        col: currentPos.col + dir.col,
      };
    }
  }
  
  return moves;
}
