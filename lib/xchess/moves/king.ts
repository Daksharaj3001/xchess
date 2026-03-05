/**
 * King Movement Rules
 * 
 * The King moves one square in any direction.
 * Also handles castling detection (validation in separate module).
 */

import { Board, Piece, Position, LegalMove } from '../types';
import { ALL_DIRECTIONS } from '../constants';
import { isValidPosition, canMoveToSquare, getPieceAt } from '../utils';

/**
 * Get all pseudo-legal king moves (before check validation)
 */
export function getKingMoves(
  board: Board,
  from: Position,
  piece: Piece
): LegalMove[] {
  const moves: LegalMove[] = [];
  const boardSize = board.length;
  
  // Regular moves (one square in any direction)
  for (const dir of ALL_DIRECTIONS) {
    const to: Position = {
      row: from.row + dir.row,
      col: from.col + dir.col,
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

/**
 * Get potential castling moves (need further validation for check/attacked squares)
 */
export function getCastlingMoves(
  board: Board,
  from: Position,
  piece: Piece,
  canCastleKingside: boolean,
  canCastleQueenside: boolean
): LegalMove[] {
  const moves: LegalMove[] = [];
  
  // King must not have moved
  if (piece.hasMoved) return moves;
  
  const boardSize = board.length;
  const row = from.row;
  
  // Kingside castling
  if (canCastleKingside) {
    // Find rook position (rightmost rook on the same row)
    const kingsideRookCol = boardSize - 3;  // Position before last knight/archer
    // For V1: col 5 (rook), For V2: col 6 (rook)
    // Actually, let's find the rook
    let rookCol = -1;
    for (let col = from.col + 1; col < boardSize; col++) {
      const p = board[row][col];
      if (p && p.type === 'rook' && p.color === piece.color && !p.hasMoved) {
        rookCol = col;
        break;
      }
    }
    
    if (rookCol > from.col) {
      // Check squares between king and rook are empty
      let canCastle = true;
      for (let col = from.col + 1; col < rookCol; col++) {
        if (board[row][col] !== null) {
          canCastle = false;
          break;
        }
      }
      
      if (canCastle) {
        moves.push({
          from,
          to: { row, col: from.col + 2 },
          moveType: 'castle_kingside',
        });
      }
    }
  }
  
  // Queenside castling
  if (canCastleQueenside) {
    // Find queenside rook
    let rookCol = -1;
    for (let col = from.col - 1; col >= 0; col--) {
      const p = board[row][col];
      if (p && p.type === 'rook' && p.color === piece.color && !p.hasMoved) {
        rookCol = col;
        break;
      }
    }
    
    if (rookCol >= 0 && rookCol < from.col) {
      // Check squares between king and rook are empty
      let canCastle = true;
      for (let col = rookCol + 1; col < from.col; col++) {
        if (board[row][col] !== null) {
          canCastle = false;
          break;
        }
      }
      
      if (canCastle) {
        moves.push({
          from,
          to: { row, col: from.col - 2 },
          moveType: 'castle_queenside',
        });
      }
    }
  }
  
  return moves;
}
