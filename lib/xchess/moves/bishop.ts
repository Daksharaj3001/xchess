/**
 * Bishop Movement Rules
 * 
 * The Bishop moves any number of squares diagonally.
 */

import { Board, Piece, Position, LegalMove } from '../types';
import { DIAGONAL_DIRECTIONS } from '../constants';
import { isValidPosition, getPieceAt } from '../utils';

/**
 * Get all pseudo-legal bishop moves
 */
export function getBishopMoves(
  board: Board,
  from: Position,
  piece: Piece
): LegalMove[] {
  const moves: LegalMove[] = [];
  const boardSize = board.length;
  
  // Bishop moves in 4 diagonal directions
  for (const dir of DIAGONAL_DIRECTIONS) {
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
