/**
 * Check, Checkmate, and Stalemate Detection
 * 
 * A king is in check if it is attacked by:
 * - Any classical chess piece (queen, rook, bishop, knight, pawn)
 * - A valid archer firing square
 */

import { Board, PieceColor, Position, GameState, LegalMove } from './types';
import { 
  findKing, 
  getPieceAt, 
  isValidPosition, 
  getOpponentColor,
  getPawnDirection
} from './utils';
import { 
  ORTHOGONAL_DIRECTIONS, 
  DIAGONAL_DIRECTIONS, 
  KNIGHT_MOVES,
  getArcherFireOffsets
} from './constants';

/**
 * Check if a square is attacked by any piece of the given color
 */
export function isSquareAttacked(
  board: Board,
  square: Position,
  attackerColor: PieceColor
): boolean {
  const boardSize = board.length;
  
  // Check orthogonal attacks (rook, queen)
  for (const dir of ORTHOGONAL_DIRECTIONS) {
    let pos: Position = { row: square.row + dir.row, col: square.col + dir.col };
    while (isValidPosition(pos, boardSize)) {
      const piece = getPieceAt(board, pos);
      if (piece) {
        if (piece.color === attackerColor && (piece.type === 'rook' || piece.type === 'queen')) {
          return true;
        }
        break; // Blocked by any piece
      }
      pos = { row: pos.row + dir.row, col: pos.col + dir.col };
    }
  }
  
  // Check diagonal attacks (bishop, queen)
  for (const dir of DIAGONAL_DIRECTIONS) {
    let pos: Position = { row: square.row + dir.row, col: square.col + dir.col };
    while (isValidPosition(pos, boardSize)) {
      const piece = getPieceAt(board, pos);
      if (piece) {
        if (piece.color === attackerColor && (piece.type === 'bishop' || piece.type === 'queen')) {
          return true;
        }
        break;
      }
      pos = { row: pos.row + dir.row, col: pos.col + dir.col };
    }
  }
  
  // Check knight attacks
  for (const offset of KNIGHT_MOVES) {
    const pos: Position = { row: square.row + offset.row, col: square.col + offset.col };
    if (isValidPosition(pos, boardSize)) {
      const piece = getPieceAt(board, pos);
      if (piece && piece.color === attackerColor && piece.type === 'knight') {
        return true;
      }
    }
  }
  
  // Check pawn attacks
  const pawnDirection = getPawnDirection(attackerColor);
  // Pawns attack diagonally backward relative to their direction
  const pawnAttackPositions = [
    { row: square.row - pawnDirection, col: square.col - 1 },
    { row: square.row - pawnDirection, col: square.col + 1 },
  ];
  for (const pos of pawnAttackPositions) {
    if (isValidPosition(pos, boardSize)) {
      const piece = getPieceAt(board, pos);
      if (piece && piece.color === attackerColor && piece.type === 'pawn') {
        return true;
      }
    }
  }
  
  // Check king attacks (for adjacent squares)
  for (const dir of [...ORTHOGONAL_DIRECTIONS, ...DIAGONAL_DIRECTIONS]) {
    const pos: Position = { row: square.row + dir.row, col: square.col + dir.col };
    if (isValidPosition(pos, boardSize)) {
      const piece = getPieceAt(board, pos);
      if (piece && piece.color === attackerColor && piece.type === 'king') {
        return true;
      }
    }
  }
  
  // Check archer attacks (artillery mode)
  const isAttackerWhite = attackerColor === 'white';
  const archerOffsets = getArcherFireOffsets(isAttackerWhite);
  
  for (const offset of archerOffsets) {
    // Archer would be at square - offset to target this square
    const archerPos: Position = {
      row: square.row - offset.row,
      col: square.col - offset.col,
    };
    
    if (isValidPosition(archerPos, boardSize)) {
      const piece = getPieceAt(board, archerPos);
      if (piece && piece.color === attackerColor && piece.type === 'archer') {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if a color's king is in check
 */
export function isInCheck(board: Board, color: PieceColor): boolean {
  const kingPos = findKing(board, color);
  if (!kingPos) return false; // No king found (shouldn't happen in valid game)
  
  return isSquareAttacked(board, kingPos, getOpponentColor(color));
}

/**
 * Check if a move would leave the king in check
 * Used for filtering pseudo-legal moves
 */
export function wouldBeInCheck(
  board: Board,
  from: Position,
  to: Position,
  color: PieceColor
): boolean {
  // Create a copy of the board with the move applied
  const newBoard = board.map(row => row.map(cell => cell ? { ...cell } : null));
  const piece = newBoard[from.row][from.col];
  
  // Handle en passant capture
  // (captured pawn is not on the destination square)
  
  // Apply the move
  newBoard[to.row][to.col] = piece ? { ...piece, hasMoved: true } : null;
  newBoard[from.row][from.col] = null;
  
  return isInCheck(newBoard, color);
}

/**
 * Get all legal moves for a color (moves that don't leave king in check)
 */
import { getLegalMovesForPiece } from './engine';

export function getAllLegalMoves(state: GameState): LegalMove[] {
  const { board, currentTurn } = state;
  const allMoves: LegalMove[] = [];
  
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const piece = board[row][col];
      if (piece && piece.color === currentTurn) {
        const moves = getLegalMovesForPiece(state, { row, col });
        allMoves.push(...moves);
      }
    }
  }
  
  return allMoves;
}

/**
 * Check if position is checkmate
 */
export function isCheckmate(state: GameState): boolean {
  // Must be in check
  if (!isInCheck(state.board, state.currentTurn)) {
    return false;
  }
  
  // Must have no legal moves
  const legalMoves = getAllLegalMoves(state);
  return legalMoves.length === 0;
}

/**
 * Check if position is stalemate
 */
export function isStalemate(state: GameState): boolean {
  // Must NOT be in check
  if (isInCheck(state.board, state.currentTurn)) {
    return false;
  }
  
  // Must have no legal moves
  const legalMoves = getAllLegalMoves(state);
  return legalMoves.length === 0;
}

/**
 * Check for insufficient material draw
 */
export function hasInsufficientMaterial(board: Board): boolean {
  const pieces: { type: string; color: PieceColor }[] = [];
  
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const piece = board[row][col];
      if (piece && piece.type !== 'king') {
        pieces.push({ type: piece.type, color: piece.color });
      }
    }
  }
  
  // King vs King
  if (pieces.length === 0) return true;
  
  // King + minor piece vs King
  if (pieces.length === 1 && (pieces[0].type === 'knight' || pieces[0].type === 'bishop')) {
    return true;
  }
  
  // King + Bishop vs King + Bishop (same color squares)
  if (pieces.length === 2 && 
      pieces[0].type === 'bishop' && 
      pieces[1].type === 'bishop' &&
      pieces[0].color !== pieces[1].color) {
    // Would need to check if bishops are on same color squares
    // For simplicity, return false here
    return false;
  }
  
  return false;
}
