/**
 * Queen Movement Rules
 * 
 * The Queen moves any number of squares horizontally, vertically, or diagonally.
 */

import { Board, Piece, Position, LegalMove } from '../types';
import { ALL_DIRECTIONS } from '../constants';
import { isValidPosition, getPieceAt, canMoveToSquare } from '../utils';

/**
 * Get all pseudo-legal queen moves
 */
export function getQueenMoves(
  board: Board,
  from: Position,
  piece: Piece
): LegalMove[] {
  const moves: LegalMove[] = [];
  const boardSize = board.length;
  
  // Queen moves in all 8 directions
  for (const dir of ALL_DIRECTIONS) {
    let currentPos: Position = {
      row: from.row + dir.row,
      col: from.col + dir.col,
    };
    
    while (isValidPosition(currentPos, boardSize)) {
      const targetPiece = getPieceAt(board, currentPos);
      
      if (targetPiece === null) {
        // Empty square - can move here
        moves.push({
          from,
          to: { ...currentPos },
          moveType: 'normal',
        });
      } else if (targetPiece.color !== piece.color) {
        // Enemy piece - can capture but can't go further
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
