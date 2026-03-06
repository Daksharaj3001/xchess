/**
 * XChess Game State Serialization
 * 
 * Handles serializing and deserializing game state.
 * Uses an extended FEN-like notation for XChess (supports 10x10 and archers).
 */

import {
  GameState,
  Board,
  Piece,
  PieceColor,
  PieceType,
  Position,
  CastlingRights,
  GameMode,
} from './types';
import { createEmptyBoard, createInitialGameState } from './utils';
import { GAME_MODES } from './constants';

// Piece to character mapping
const PIECE_TO_CHAR: Record<PieceType, string> = {
  king: 'k',
  queen: 'q',
  rook: 'r',
  bishop: 'b',
  knight: 'n',
  pawn: 'p',
  archer: 'a',
};

const CHAR_TO_PIECE: Record<string, PieceType> = {
  k: 'king',
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
  p: 'pawn',
  a: 'archer',
};

// ============================================================================
// BOARD SERIALIZATION (FEN-like)
// ============================================================================

/**
 * Serialize board to FEN-like string
 * Supports both 8x8 and 10x10 boards
 */
export function boardToFen(board: Board): string {
  const rows: string[] = [];
  
  // Iterate from top row (black's back rank) to bottom (white's back rank)
  for (let row = board.length - 1; row >= 0; row--) {
    let rowStr = '';
    let emptyCount = 0;
    
    for (let col = 0; col < board[row].length; col++) {
      const piece = board[row][col];
      
      if (!piece) {
        emptyCount++;
      } else {
        if (emptyCount > 0) {
          // For 10x10, use (10) notation for 10 empty squares
          rowStr += emptyCount === 10 ? '(10)' : emptyCount.toString();
          emptyCount = 0;
        }
        
        let char = PIECE_TO_CHAR[piece.type];
        if (piece.color === 'white') {
          char = char.toUpperCase();
        }
        rowStr += char;
      }
    }
    
    if (emptyCount > 0) {
      rowStr += emptyCount === 10 ? '(10)' : emptyCount.toString();
    }
    
    rows.push(rowStr);
  }
  
  return rows.join('/');
}

/**
 * Parse FEN-like string to board
 */
export function fenToBoard(fen: string, boardSize: number): Board {
  const board = createEmptyBoard(boardSize);
  const rows = fen.split('/');
  
  for (let i = 0; i < rows.length && i < boardSize; i++) {
    const row = boardSize - 1 - i; // Convert to 0-indexed from bottom
    let col = 0;
    let j = 0;
    
    while (j < rows[i].length && col < boardSize) {
      const char = rows[i][j];
      
      // Handle (10) notation for 10 empty squares
      if (char === '(') {
        const endParen = rows[i].indexOf(')', j);
        if (endParen > j) {
          const num = parseInt(rows[i].substring(j + 1, endParen));
          col += num;
          j = endParen + 1;
          continue;
        }
      }
      
      // Handle number (empty squares)
      if (char >= '0' && char <= '9') {
        col += parseInt(char);
        j++;
        continue;
      }
      
      // Handle piece
      const lowerChar = char.toLowerCase();
      if (CHAR_TO_PIECE[lowerChar]) {
        const color: PieceColor = char === char.toUpperCase() ? 'white' : 'black';
        board[row][col] = {
          type: CHAR_TO_PIECE[lowerChar],
          color,
          hasMoved: false, // Will be updated from move history
        };
        col++;
      }
      j++;
    }
  }
  
  return board;
}

// ============================================================================
// FULL GAME STATE SERIALIZATION
// ============================================================================

/**
 * Serialize complete game state to string
 * Format: board turn castling enpassant halfmove fullmove gamemode
 */
export function serializeGameState(state: GameState): string {
  const parts: string[] = [];
  
  // 1. Board position
  parts.push(boardToFen(state.board));
  
  // 2. Active color
  parts.push(state.currentTurn === 'white' ? 'w' : 'b');
  
  // 3. Castling rights
  let castling = '';
  if (state.castlingRights.whiteKingside) castling += 'K';
  if (state.castlingRights.whiteQueenside) castling += 'Q';
  if (state.castlingRights.blackKingside) castling += 'k';
  if (state.castlingRights.blackQueenside) castling += 'q';
  parts.push(castling || '-');
  
  // 4. En passant square
  if (state.enPassantSquare) {
    parts.push(positionToAlgebraic(state.enPassantSquare));
  } else {
    parts.push('-');
  }
  
  // 5. Half-move clock
  parts.push(state.halfMoveClock.toString());
  
  // 6. Full-move number
  parts.push(state.moveNumber.toString());
  
  // 7. Game mode (XChess extension)
  parts.push(state.gameMode);
  
  return parts.join(' ');
}

/**
 * Deserialize game state from string
 */
export function deserializeGameState(serialized: string): GameState {
  const parts = serialized.split(' ');
  
  // Parse game mode first to know board size
  const gameMode = (parts[6] || 'v1_classical') as GameMode;
  const config = GAME_MODES[gameMode];
  const boardSize = config.boardSize;
  
  // Parse board
  const board = fenToBoard(parts[0], boardSize);
  
  // Parse turn
  const currentTurn: PieceColor = parts[1] === 'b' ? 'black' : 'white';
  
  // Parse castling rights
  const castlingStr = parts[2] || '-';
  const castlingRights: CastlingRights = {
    whiteKingside: castlingStr.includes('K'),
    whiteQueenside: castlingStr.includes('Q'),
    blackKingside: castlingStr.includes('k'),
    blackQueenside: castlingStr.includes('q'),
  };
  
  // Parse en passant
  const epStr = parts[3] || '-';
  const enPassantSquare = epStr === '-' ? null : algebraicToPosition(epStr);
  
  // Parse clocks
  const halfMoveClock = parseInt(parts[4]) || 0;
  const moveNumber = parseInt(parts[5]) || 1;
  
  return {
    board,
    currentTurn,
    moveNumber,
    halfMoveClock,
    castlingRights,
    enPassantSquare,
    gameMode,
    isCheck: false,
    isCheckmate: false,
    isStalemate: false,
    isDraw: false,
    winner: null,
    moveHistory: [],
    capturedPieces: { white: [], black: [] },
  };
}

// ============================================================================
// POSITION UTILITIES
// ============================================================================

/**
 * Convert position to algebraic notation
 */
export function positionToAlgebraic(pos: Position): string {
  const file = String.fromCharCode('a'.charCodeAt(0) + pos.col);
  const rank = (pos.row + 1).toString();
  return file + rank;
}

/**
 * Convert algebraic notation to position
 */
export function algebraicToPosition(algebraic: string): Position {
  const col = algebraic.charCodeAt(0) - 'a'.charCodeAt(0);
  const row = parseInt(algebraic.substring(1)) - 1;
  return { row, col };
}

// ============================================================================
// MOVE NOTATION
// ============================================================================

export interface MoveNotation {
  san: string;      // Standard Algebraic Notation (e.g., "Nf3")
  uci: string;      // UCI format (e.g., "g1f3")
  lan: string;      // Long Algebraic Notation (e.g., "Ng1-f3")
}

/**
 * Generate move notation from move data
 */
export function generateMoveNotation(
  from: Position,
  to: Position,
  piece: Piece,
  isCapture: boolean,
  isCheck: boolean,
  isCheckmate: boolean,
  isCastle: 'kingside' | 'queenside' | null,
  promotionPiece?: PieceType,
  archerTargets?: Position[]
): MoveNotation {
  // UCI notation
  let uci = positionToAlgebraic(from) + positionToAlgebraic(to);
  if (promotionPiece) {
    uci += PIECE_TO_CHAR[promotionPiece];
  }
  if (archerTargets && archerTargets.length > 0) {
    uci += ':' + archerTargets.map(t => positionToAlgebraic(t)).join(',');
  }
  
  // SAN notation
  let san = '';
  
  if (isCastle === 'kingside') {
    san = 'O-O';
  } else if (isCastle === 'queenside') {
    san = 'O-O-O';
  } else if (archerTargets && archerTargets.length > 0) {
    // Archer fire notation: A@e7,e8
    san = 'A@' + archerTargets.map(t => positionToAlgebraic(t)).join(',');
  } else {
    const pieceSymbols: Record<PieceType, string> = {
      king: 'K',
      queen: 'Q',
      rook: 'R',
      bishop: 'B',
      knight: 'N',
      archer: 'A',
      pawn: '',
    };
    
    const symbol = pieceSymbols[piece.type];
    
    if (piece.type === 'pawn') {
      if (isCapture) {
        san = String.fromCharCode('a'.charCodeAt(0) + from.col) + 'x';
      }
      san += positionToAlgebraic(to);
      if (promotionPiece) {
        san += '=' + pieceSymbols[promotionPiece];
      }
    } else {
      san = symbol;
      if (isCapture) san += 'x';
      san += positionToAlgebraic(to);
    }
  }
  
  // Add check/checkmate symbols
  if (isCheckmate) {
    san += '#';
  } else if (isCheck) {
    san += '+';
  }
  
  // LAN notation
  const pieceChar = piece.type === 'pawn' ? '' : PIECE_TO_CHAR[piece.type].toUpperCase();
  const lan = pieceChar + positionToAlgebraic(from) + (isCapture ? 'x' : '-') + positionToAlgebraic(to);
  
  return { san, uci, lan };
}

/**
 * Parse UCI move string
 */
export function parseUciMove(uci: string): {
  from: Position;
  to: Position;
  promotion?: PieceType;
  archerTargets?: Position[];
} {
  // Handle archer fire notation: e4e4:e7,e8
  const archerMatch = uci.match(/^([a-j]\d+)([a-j]\d+):(.+)$/);
  if (archerMatch) {
    const from = algebraicToPosition(archerMatch[1]);
    const to = algebraicToPosition(archerMatch[2]);
    const targets = archerMatch[3].split(',').map(t => algebraicToPosition(t.trim()));
    return { from, to, archerTargets: targets };
  }
  
  // Standard move: e2e4 or e7e8q (with promotion)
  const from = algebraicToPosition(uci.substring(0, 2));
  const to = algebraicToPosition(uci.substring(2, 4));
  
  let promotion: PieceType | undefined;
  if (uci.length > 4) {
    const promoChar = uci[4].toLowerCase();
    if (CHAR_TO_PIECE[promoChar]) {
      promotion = CHAR_TO_PIECE[promoChar];
    }
  }
  
  return { from, to, promotion };
}
