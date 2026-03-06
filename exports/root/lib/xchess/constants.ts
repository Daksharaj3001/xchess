/**
 * XChess Constants
 * 
 * Board configurations, piece setups, and game constants.
 */

import { GameMode, GameModeConfig, PieceType, Position } from './types';

// ============================================================================
// GAME MODE CONFIGURATIONS
// ============================================================================

export const GAME_MODES: Record<GameMode, GameModeConfig> = {
  v1_classical: {
    boardSize: 8,
    hasArchers: false,
    // Knight – Bishop – Rook – Queen – King – Rook – Bishop – Knight
    initialSetup: ['knight', 'bishop', 'rook', 'queen', 'king', 'rook', 'bishop', 'knight'],
  },
  v2_artillery: {
    boardSize: 10,
    hasArchers: true,
    // Knight – Archer – Bishop – Rook – Queen – King – Rook – Bishop – Archer – Knight
    initialSetup: ['knight', 'archer', 'bishop', 'rook', 'queen', 'king', 'rook', 'bishop', 'archer', 'knight'],
  },
};

// ============================================================================
// PIECE VALUES (for evaluation)
// ============================================================================

export const PIECE_VALUES: Record<PieceType, number> = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  archer: 4,  // Slightly more valuable than bishop due to firing ability
  queen: 9,
  king: 0,    // King has infinite value (can't be captured)
};

// ============================================================================
// DIRECTION VECTORS
// ============================================================================

export const DIRECTIONS = {
  // Orthogonal
  NORTH: { row: 1, col: 0 },
  SOUTH: { row: -1, col: 0 },
  EAST: { row: 0, col: 1 },
  WEST: { row: 0, col: -1 },
  // Diagonal
  NORTHEAST: { row: 1, col: 1 },
  NORTHWEST: { row: 1, col: -1 },
  SOUTHEAST: { row: -1, col: 1 },
  SOUTHWEST: { row: -1, col: -1 },
};

export const ORTHOGONAL_DIRECTIONS = [
  DIRECTIONS.NORTH,
  DIRECTIONS.SOUTH,
  DIRECTIONS.EAST,
  DIRECTIONS.WEST,
];

export const DIAGONAL_DIRECTIONS = [
  DIRECTIONS.NORTHEAST,
  DIRECTIONS.NORTHWEST,
  DIRECTIONS.SOUTHEAST,
  DIRECTIONS.SOUTHWEST,
];

export const ALL_DIRECTIONS = [
  ...ORTHOGONAL_DIRECTIONS,
  ...DIAGONAL_DIRECTIONS,
];

// Knight move offsets
export const KNIGHT_MOVES = [
  { row: 2, col: 1 },
  { row: 2, col: -1 },
  { row: -2, col: 1 },
  { row: -2, col: -1 },
  { row: 1, col: 2 },
  { row: 1, col: -2 },
  { row: -1, col: 2 },
  { row: -1, col: -2 },
];

// ============================================================================
// ARCHER FIRING TARGETS
// ============================================================================

/**
 * Get archer firing target positions relative to archer position.
 * Forward/backward is relative to piece color.
 * 
 * For WHITE (forward = +row):
 *   Forward targets: row+3 (center, left, right)
 *   Backward targets: row-3 (center, left, right)
 * 
 * For BLACK (forward = -row):
 *   Forward targets: row-3 (center, left, right)
 *   Backward targets: row+3 (center, left, right)
 */
export function getArcherFireOffsets(isWhite: boolean): Position[] {
  const forward = isWhite ? 3 : -3;
  const backward = isWhite ? -3 : 3;
  
  return [
    // Forward targets (3 squares ahead)
    { row: forward, col: 0 },   // Center
    { row: forward, col: -1 },  // Left
    { row: forward, col: 1 },   // Right
    // Backward targets (3 squares behind)
    { row: backward, col: 0 },  // Center
    { row: backward, col: -1 }, // Left
    { row: backward, col: 1 },  // Right
  ];
}

// ============================================================================
// INITIAL POSITION (FEN-like)
// ============================================================================

export const INITIAL_FEN_V1 = 'knbrqrbk/pppppppp/8/8/8/8/PPPPPPPP/KNBRQRBK w KQkq - 0 1';
export const INITIAL_FEN_V2 = 'knabrqrbak/pppppppppp/10/10/10/10/10/10/PPPPPPPPPP/KNABRQRBAK w KQkq - 0 1';

// ============================================================================
// PROMOTION PIECES
// ============================================================================

export const PROMOTION_PIECES_V1: PieceType[] = ['queen', 'rook', 'bishop', 'knight'];
export const PROMOTION_PIECES_V2: PieceType[] = ['queen', 'rook', 'bishop', 'knight', 'archer'];

export function getPromotionPieces(gameMode: GameMode): PieceType[] {
  return gameMode === 'v2_artillery' ? PROMOTION_PIECES_V2 : PROMOTION_PIECES_V1;
}
