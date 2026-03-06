/**
 * XChess Type Definitions
 * 
 * Core types for the XChess rules engine.
 * Supports both V1 (8x8 Classical) and V2 (10x10 Artillery) modes.
 */

// ============================================================================
// GAME MODES
// ============================================================================

export type GameMode = 'v1_classical' | 'v2_artillery';

export interface GameModeConfig {
  boardSize: number;
  hasArchers: boolean;
  initialSetup: PieceType[];
}

// ============================================================================
// PIECES
// ============================================================================

export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn' | 'archer';
export type PieceColor = 'white' | 'black';

export interface Piece {
  type: PieceType;
  color: PieceColor;
  hasMoved: boolean;
}

// ============================================================================
// BOARD & POSITIONS
// ============================================================================

export interface Position {
  row: number;  // 0-indexed from white's perspective (0 = rank 1)
  col: number;  // 0-indexed (0 = a-file)
}

export type Square = Piece | null;
export type Board = Square[][];

// ============================================================================
// MOVES
// ============================================================================

export type MoveType = 
  | 'normal'
  | 'capture'
  | 'castle_kingside'
  | 'castle_queenside'
  | 'en_passant'
  | 'promotion'
  | 'archer_fire';

export interface Move {
  from: Position;
  to: Position;
  piece: Piece;
  moveType: MoveType;
  capturedPiece?: Piece;
  promotionPiece?: PieceType;
  // Archer-specific
  archerTargets?: Position[];  // Up to 2 targets
}

export interface MoveResult {
  success: boolean;
  newState?: GameState;
  error?: string;
  isCheck?: boolean;
  isCheckmate?: boolean;
  isStalemate?: boolean;
  capturedPieces?: Piece[];
}

// ============================================================================
// GAME STATE
// ============================================================================

export interface CastlingRights {
  whiteKingside: boolean;
  whiteQueenside: boolean;
  blackKingside: boolean;
  blackQueenside: boolean;
}

export interface GameState {
  board: Board;
  currentTurn: PieceColor;
  moveNumber: number;
  halfMoveClock: number;  // For 50-move rule
  castlingRights: CastlingRights;
  enPassantSquare: Position | null;
  gameMode: GameMode;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
  winner: PieceColor | null;
  moveHistory: Move[];
  capturedPieces: {
    white: Piece[];  // Pieces captured by white
    black: Piece[];  // Pieces captured by black
  };
}

// ============================================================================
// LEGAL MOVES
// ============================================================================

export interface LegalMove {
  from: Position;
  to: Position;
  moveType: MoveType;
  promotionOptions?: PieceType[];
  archerTargets?: Position[];  // Valid archer firing targets
}

// ============================================================================
// VALIDATION
// ============================================================================

export interface MoveValidation {
  isValid: boolean;
  error?: string;
  moveType?: MoveType;
}

// ============================================================================
// API TYPES
// ============================================================================

export interface MoveRequest {
  gameId: string;
  from: Position;
  to: Position;
  promotionPiece?: PieceType;
  archerTargets?: Position[];  // For archer fire action
}

export interface GameResponse {
  gameId: string;
  state: GameState;
  legalMoves: LegalMove[];
}

// ============================================================================
// ANALYTICS EVENTS
// ============================================================================

export type AnalyticsEventType =
  | 'game_started'
  | 'move_committed'
  | 'illegal_move_attempt'
  | 'game_finished'
  | 'archer_fire_used'
  | 'check_detected'
  | 'checkmate_occurred'
  | 'stalemate_occurred'
  | 'castling_performed'
  | 'en_passant_performed'
  | 'promotion_performed';

export interface AnalyticsEvent {
  eventType: AnalyticsEventType;
  gameId: string;
  moveNumber: number;
  gameMode: GameMode;
  metadata?: Record<string, string | number | boolean>;
}
