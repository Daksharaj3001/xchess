/**
 * Archer Movement and Firing Rules (XChess-specific)
 * 
 * The Archer is a special artillery unit:
 * - Moves exactly like a King (one square in any direction)
 * - Can EITHER move OR fire on its turn (not both)
 * - Has 6 firing target squares (3 forward, 3 backward)
 * - Can attack up to 2 enemy targets simultaneously
 * - Attacks ignore blocking pieces
 * - Cannot target friendly pieces
 */

import { Board, Piece, Position, LegalMove, PieceColor } from '../types';
import { ALL_DIRECTIONS, getArcherFireOffsets } from '../constants';
import { isValidPosition, canMoveToSquare, getPieceAt, hasEnemyPiece } from '../utils';

/**
 * Get all pseudo-legal archer movement moves (like king)
 */
export function getArcherMovementMoves(
  board: Board,
  from: Position,
  piece: Piece
): LegalMove[] {
  const moves: LegalMove[] = [];
  const boardSize = board.length;
  
  // Archer moves like a king (one square in any direction)
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
 * Get valid archer firing targets
 * Returns positions that contain enemy pieces
 */
export function getArcherFireTargets(
  board: Board,
  from: Position,
  piece: Piece
): Position[] {
  const targets: Position[] = [];
  const boardSize = board.length;
  const isWhite = piece.color === 'white';
  const offsets = getArcherFireOffsets(isWhite);
  
  for (const offset of offsets) {
    const targetPos: Position = {
      row: from.row + offset.row,
      col: from.col + offset.col,
    };
    
    // Must be on board and contain enemy piece
    if (isValidPosition(targetPos, boardSize) && hasEnemyPiece(board, targetPos, piece.color)) {
      targets.push(targetPos);
    }
  }
  
  return targets;
}

/**
 * Get all archer firing moves
 * An archer fire move stays in place but attacks target squares
 */
export function getArcherFireMoves(
  board: Board,
  from: Position,
  piece: Piece
): LegalMove[] {
  const targets = getArcherFireTargets(board, from, piece);
  
  // If no valid targets, no fire moves
  if (targets.length === 0) {
    return [];
  }
  
  // Archer fire is a special move type - archer stays in place
  // The archerTargets field contains valid targets for selection
  return [{
    from,
    to: from,  // Archer doesn't move when firing
    moveType: 'archer_fire',
    archerTargets: targets,
  }];
}

/**
 * Get all archer moves (both movement and firing)
 */
export function getArcherMoves(
  board: Board,
  from: Position,
  piece: Piece
): LegalMove[] {
  return [
    ...getArcherMovementMoves(board, from, piece),
    ...getArcherFireMoves(board, from, piece),
  ];
}

/**
 * Check if a position is targeted by an enemy archer
 * Used for check detection
 */
export function isTargetedByArcher(
  board: Board,
  targetPos: Position,
  attackerColor: PieceColor
): boolean {
  const boardSize = board.length;
  
  // Check all squares where an enemy archer could be to target this position
  // This is the inverse of fire offsets
  const isAttackerWhite = attackerColor === 'white';
  const offsets = getArcherFireOffsets(isAttackerWhite);
  
  for (const offset of offsets) {
    // Archer would be at targetPos - offset
    const archerPos: Position = {
      row: targetPos.row - offset.row,
      col: targetPos.col - offset.col,
    };
    
    if (!isValidPosition(archerPos, boardSize)) continue;
    
    const piece = getPieceAt(board, archerPos);
    if (piece && piece.type === 'archer' && piece.color === attackerColor) {
      // Verify this archer can actually target the position
      const archerTargets = getArcherFireTargets(board, archerPos, piece);
      // Actually we need to check theoretical targeting, not just enemy presence
      // Archer can target any of its 6 squares regardless of content for check detection
      const archerOffsets = getArcherFireOffsets(isAttackerWhite);
      for (const archerOffset of archerOffsets) {
        const archerTarget: Position = {
          row: archerPos.row + archerOffset.row,
          col: archerPos.col + archerOffset.col,
        };
        if (archerTarget.row === targetPos.row && archerTarget.col === targetPos.col) {
          return true;
        }
      }
    }
  }
  
  return false;
}

/**
 * Validate archer fire selection
 * @param selectedTargets - Targets chosen by the player (1-2)
 * @param validTargets - All valid targets
 */
export function validateArcherFireSelection(
  selectedTargets: Position[],
  validTargets: Position[]
): { valid: boolean; error?: string } {
  // Must select 1-2 targets
  if (selectedTargets.length === 0 || selectedTargets.length > 2) {
    return { valid: false, error: 'Must select 1 or 2 targets' };
  }
  
  // All selected targets must be valid
  for (const selected of selectedTargets) {
    const isValid = validTargets.some(
      t => t.row === selected.row && t.col === selected.col
    );
    if (!isValid) {
      return { valid: false, error: 'Invalid target selection' };
    }
  }
  
  // No duplicate targets
  if (selectedTargets.length === 2) {
    if (selectedTargets[0].row === selectedTargets[1].row &&
        selectedTargets[0].col === selectedTargets[1].col) {
      return { valid: false, error: 'Cannot select same target twice' };
    }
  }
  
  return { valid: true };
}
