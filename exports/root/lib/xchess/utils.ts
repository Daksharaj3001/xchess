/**
 * XChess Utility Functions
 * 
 * Helper functions for board manipulation and position handling.
 */

import { Board, Piece, PieceColor, PieceType, Position, Square, GameState, CastlingRights, GameMode } from './types';
import { GAME_MODES } from './constants';

// ============================================================================
// POSITION UTILITIES
// ============================================================================

/**
 * Check if a position is within board bounds
 */
export function isValidPosition(pos: Position, boardSize: number): boolean {
  return pos.row >= 0 && pos.row < boardSize && pos.col >= 0 && pos.col < boardSize;
}

/**
 * Check if two positions are equal
 */
export function positionsEqual(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

/**
 * Convert algebraic notation to position (e.g., "e4" -> {row: 3, col: 4})
 */
export function algebraicToPosition(algebraic: string): Position {
  const col = algebraic.charCodeAt(0) - 'a'.charCodeAt(0);
  const row = parseInt(algebraic[1]) - 1;
  return { row, col };
}

/**
 * Convert position to algebraic notation (e.g., {row: 3, col: 4} -> "e4")
 */
export function positionToAlgebraic(pos: Position): string {
  const col = String.fromCharCode('a'.charCodeAt(0) + pos.col);
  const row = (pos.row + 1).toString();
  return col + row;
}

// ============================================================================
// BOARD UTILITIES
// ============================================================================

/**
 * Create an empty board of the specified size
 */
export function createEmptyBoard(size: number): Board {
  return Array(size).fill(null).map(() => Array(size).fill(null));
}

/**
 * Deep clone a board
 */
export function cloneBoard(board: Board): Board {
  return board.map(row => 
    row.map(square => 
      square ? { ...square } : null
    )
  );
}

/**
 * Get piece at position
 */
export function getPieceAt(board: Board, pos: Position): Square {
  if (!isValidPosition(pos, board.length)) return null;
  return board[pos.row][pos.col];
}

/**
 * Set piece at position (returns new board)
 */
export function setPieceAt(board: Board, pos: Position, piece: Square): Board {
  const newBoard = cloneBoard(board);
  newBoard[pos.row][pos.col] = piece;
  return newBoard;
}

/**
 * Move piece from one position to another (returns new board)
 */
export function movePiece(board: Board, from: Position, to: Position): Board {
  const newBoard = cloneBoard(board);
  const piece = newBoard[from.row][from.col];
  if (piece) {
    newBoard[to.row][to.col] = { ...piece, hasMoved: true };
  }
  newBoard[from.row][from.col] = null;
  return newBoard;
}

/**
 * Find king position for a color
 */
export function findKing(board: Board, color: PieceColor): Position | null {
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const piece = board[row][col];
      if (piece && piece.type === 'king' && piece.color === color) {
        return { row, col };
      }
    }
  }
  return null;
}

/**
 * Find all pieces of a color
 */
export function findPieces(board: Board, color: PieceColor): Array<{ piece: Piece; position: Position }> {
  const pieces: Array<{ piece: Piece; position: Position }> = [];
  
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        pieces.push({ piece, position: { row, col } });
      }
    }
  }
  
  return pieces;
}

/**
 * Get opponent color
 */
export function getOpponentColor(color: PieceColor): PieceColor {
  return color === 'white' ? 'black' : 'white';
}

// ============================================================================
// INITIAL BOARD SETUP
// ============================================================================

/**
 * Create initial board for a game mode
 */
export function createInitialBoard(gameMode: GameMode): Board {
  const config = GAME_MODES[gameMode];
  const board = createEmptyBoard(config.boardSize);
  const setup = config.initialSetup;
  
  // Set up white pieces (rows 0 and 1)
  for (let col = 0; col < setup.length; col++) {
    // Back rank (row 0 for white)
    board[0][col] = {
      type: setup[col],
      color: 'white',
      hasMoved: false,
    };
    // Pawns (row 1 for white)
    board[1][col] = {
      type: 'pawn',
      color: 'white',
      hasMoved: false,
    };
  }
  
  // Set up black pieces (top rows)
  const lastRow = config.boardSize - 1;
  for (let col = 0; col < setup.length; col++) {
    // Back rank for black
    board[lastRow][col] = {
      type: setup[col],
      color: 'black',
      hasMoved: false,
    };
    // Pawns for black
    board[lastRow - 1][col] = {
      type: 'pawn',
      color: 'black',
      hasMoved: false,
    };
  }
  
  return board;
}

/**
 * Create initial game state
 */
export function createInitialGameState(gameMode: GameMode): GameState {
  return {
    board: createInitialBoard(gameMode),
    currentTurn: 'white',
    moveNumber: 1,
    halfMoveClock: 0,
    castlingRights: {
      whiteKingside: true,
      whiteQueenside: true,
      blackKingside: true,
      blackQueenside: true,
    },
    enPassantSquare: null,
    gameMode,
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    isDraw: false,
    winner: null,
    moveHistory: [],
    capturedPieces: {
      white: [],
      black: [],
    },
  };
}

/**
 * Deep clone game state
 */
export function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    board: cloneBoard(state.board),
    castlingRights: { ...state.castlingRights },
    enPassantSquare: state.enPassantSquare ? { ...state.enPassantSquare } : null,
    moveHistory: [...state.moveHistory],
    capturedPieces: {
      white: [...state.capturedPieces.white],
      black: [...state.capturedPieces.black],
    },
  };
}

// ============================================================================
// PIECE UTILITIES
// ============================================================================

/**
 * Check if a piece can capture another (different colors)
 */
export function canCapture(attacker: Piece | null, target: Piece | null): boolean {
  if (!attacker || !target) return false;
  return attacker.color !== target.color;
}

/**
 * Check if square is empty or has enemy piece
 */
export function canMoveToSquare(board: Board, pos: Position, color: PieceColor): boolean {
  const piece = getPieceAt(board, pos);
  return piece === null || piece.color !== color;
}

/**
 * Check if square is empty
 */
export function isSquareEmpty(board: Board, pos: Position): boolean {
  return getPieceAt(board, pos) === null;
}

/**
 * Check if square has enemy piece
 */
export function hasEnemyPiece(board: Board, pos: Position, myColor: PieceColor): boolean {
  const piece = getPieceAt(board, pos);
  return piece !== null && piece.color !== myColor;
}

/**
 * Check if square has friendly piece
 */
export function hasFriendlyPiece(board: Board, pos: Position, myColor: PieceColor): boolean {
  const piece = getPieceAt(board, pos);
  return piece !== null && piece.color === myColor;
}

/**
 * Get the promotion row for a color
 */
export function getPromotionRow(color: PieceColor, boardSize: number): number {
  return color === 'white' ? boardSize - 1 : 0;
}

/**
 * Get pawn direction for a color (+1 for white, -1 for black)
 */
export function getPawnDirection(color: PieceColor): number {
  return color === 'white' ? 1 : -1;
}

/**
 * Get starting pawn row for a color
 */
export function getPawnStartRow(color: PieceColor, boardSize: number): number {
  return color === 'white' ? 1 : boardSize - 2;
}
