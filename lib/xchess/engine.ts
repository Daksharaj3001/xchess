/**
 * XChess Rules Engine
 * 
 * Server-authoritative game logic for XChess.
 * Validates all moves and enforces game rules.
 * 
 * Exposed functions:
 * - getLegalMoves(gameState, piece)
 * - validateMove(gameState, move)
 * - applyMove(gameState, move)
 * - isCheck(gameState)
 * - isCheckmate(gameState)
 * - isStalemate(gameState)
 */

import {
  GameState,
  GameMode,
  Position,
  Piece,
  PieceColor,
  LegalMove,
  Move,
  MoveResult,
  MoveValidation,
  MoveType,
  PieceType,
  Board,
} from './types';

import {
  getPieceAt,
  cloneGameState,
  movePiece,
  getOpponentColor,
  positionsEqual,
  getPawnDirection,
  getPromotionRow,
  findKing,
  cloneBoard,
  createInitialGameState,
} from './utils';

import { GAME_MODES, getPromotionPieces } from './constants';

import { getKingMoves, getCastlingMoves } from './moves/king';
import { getQueenMoves } from './moves/queen';
import { getRookMoves } from './moves/rook';
import { getBishopMoves } from './moves/bishop';
import { getKnightMoves } from './moves/knight';
import { getPawnMoves } from './moves/pawn';
import { getArcherMoves, getArcherFireTargets, validateArcherFireSelection } from './moves/archer';
import { isInCheck, wouldBeInCheck, isSquareAttacked, isCheckmate, isStalemate, hasInsufficientMaterial } from './check';

// ============================================================================
// GAME INITIALIZATION
// ============================================================================

/**
 * Create a new game with the specified mode
 */
export function createGame(mode: GameMode): GameState {
  return createInitialGameState(mode);
}

// ============================================================================
// LEGAL MOVE GENERATION
// ============================================================================

/**
 * Get pseudo-legal moves for a piece (before check validation)
 */
function getPseudoLegalMoves(state: GameState, from: Position): LegalMove[] {
  const piece = getPieceAt(state.board, from);
  if (!piece) return [];
  
  const { board, castlingRights, enPassantSquare, gameMode } = state;
  
  switch (piece.type) {
    case 'king': {
      const regularMoves = getKingMoves(board, from, piece);
      const canCastleKingside = piece.color === 'white' 
        ? castlingRights.whiteKingside 
        : castlingRights.blackKingside;
      const canCastleQueenside = piece.color === 'white'
        ? castlingRights.whiteQueenside
        : castlingRights.blackQueenside;
      const castlingMoves = getCastlingMoves(board, from, piece, canCastleKingside, canCastleQueenside);
      return [...regularMoves, ...castlingMoves];
    }
    case 'queen':
      return getQueenMoves(board, from, piece);
    case 'rook':
      return getRookMoves(board, from, piece);
    case 'bishop':
      return getBishopMoves(board, from, piece);
    case 'knight':
      return getKnightMoves(board, from, piece);
    case 'pawn':
      return getPawnMoves(board, from, piece, enPassantSquare, gameMode);
    case 'archer':
      return getArcherMoves(board, from, piece);
    default:
      return [];
  }
}

/**
 * Filter moves that would leave king in check
 */
function filterLegalMoves(state: GameState, moves: LegalMove[], color: PieceColor): LegalMove[] {
  return moves.filter(move => {
    // For archer fire, the archer doesn't move - just check if we're currently in check
    // and if the fire would resolve it (it wouldn't, archer fire doesn't block check)
    if (move.moveType === 'archer_fire') {
      // If in check, archer cannot fire (must address check)
      if (isInCheck(state.board, color)) {
        return false;
      }
      return true;
    }
    
    // For castling, need to verify king doesn't pass through check
    if (move.moveType === 'castle_kingside' || move.moveType === 'castle_queenside') {
      // King cannot be in check
      if (isInCheck(state.board, color)) {
        return false;
      }
      
      // King cannot pass through attacked squares
      const kingPos = move.from;
      const direction = move.moveType === 'castle_kingside' ? 1 : -1;
      const opponentColor = getOpponentColor(color);
      
      // Check squares the king passes through (including destination)
      for (let i = 1; i <= 2; i++) {
        const squareToCheck: Position = {
          row: kingPos.row,
          col: kingPos.col + direction * i,
        };
        if (isSquareAttacked(state.board, squareToCheck, opponentColor)) {
          return false;
        }
      }
      
      return true;
    }
    
    // Regular move: check if it leaves king in check
    return !wouldBeInCheck(state.board, move.from, move.to, color);
  });
}

/**
 * Get all legal moves for a piece at a position
 */
export function getLegalMovesForPiece(state: GameState, position: Position): LegalMove[] {
  const piece = getPieceAt(state.board, position);
  if (!piece) return [];
  if (piece.color !== state.currentTurn) return [];
  
  const pseudoLegalMoves = getPseudoLegalMoves(state, position);
  return filterLegalMoves(state, pseudoLegalMoves, piece.color);
}

/**
 * Get all legal moves for the current player
 */
export function getLegalMoves(state: GameState): LegalMove[] {
  const moves: LegalMove[] = [];
  
  for (let row = 0; row < state.board.length; row++) {
    for (let col = 0; col < state.board[row].length; col++) {
      const piece = state.board[row][col];
      if (piece && piece.color === state.currentTurn) {
        moves.push(...getLegalMovesForPiece(state, { row, col }));
      }
    }
  }
  
  return moves;
}

// ============================================================================
// MOVE VALIDATION
// ============================================================================

/**
 * Validate a move request
 */
export function validateMove(
  state: GameState,
  from: Position,
  to: Position,
  promotionPiece?: PieceType,
  archerTargets?: Position[]
): MoveValidation {
  const piece = getPieceAt(state.board, from);
  
  // Basic validations
  if (!piece) {
    return { isValid: false, error: 'No piece at source position' };
  }
  
  if (piece.color !== state.currentTurn) {
    return { isValid: false, error: 'Not your turn' };
  }
  
  // Get legal moves for this piece
  const legalMoves = getLegalMovesForPiece(state, from);
  
  // Find matching move
  const matchingMove = legalMoves.find(m => {
    if (!positionsEqual(m.to, to)) return false;
    
    // For archer fire, check that we have valid targets
    if (m.moveType === 'archer_fire') {
      if (!archerTargets || archerTargets.length === 0) return false;
      return true;
    }
    
    // For promotions, validate promotion piece
    if (m.moveType === 'promotion') {
      if (!promotionPiece) return false;
      if (!m.promotionOptions?.includes(promotionPiece)) return false;
    }
    
    return true;
  });
  
  if (!matchingMove) {
    return { isValid: false, error: 'Illegal move' };
  }
  
  // Additional validation for archer fire
  if (matchingMove.moveType === 'archer_fire' && archerTargets) {
    const validation = validateArcherFireSelection(archerTargets, matchingMove.archerTargets || []);
    if (!validation.valid) {
      return { isValid: false, error: validation.error };
    }
  }
  
  return { isValid: true, moveType: matchingMove.moveType };
}

// ============================================================================
// APPLY MOVE
// ============================================================================

/**
 * Apply a validated move to the game state
 */
export function applyMove(
  state: GameState,
  from: Position,
  to: Position,
  promotionPiece?: PieceType,
  archerTargets?: Position[]
): MoveResult {
  // Validate the move first
  const validation = validateMove(state, from, to, promotionPiece, archerTargets);
  
  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }
  
  // Clone state for immutability
  const newState = cloneGameState(state);
  const piece = getPieceAt(newState.board, from)!;
  const boardSize = newState.board.length;
  const capturedPieces: Piece[] = [];
  
  // Create move record
  const move: Move = {
    from,
    to,
    piece: { ...piece },
    moveType: validation.moveType!,
  };
  
  // Handle different move types
  switch (validation.moveType) {
    case 'normal':
    case 'capture': {
      const targetPiece = getPieceAt(newState.board, to);
      if (targetPiece) {
        move.capturedPiece = targetPiece;
        capturedPieces.push(targetPiece);
        newState.capturedPieces[piece.color].push(targetPiece);
      }
      newState.board = movePiece(newState.board, from, to);
      break;
    }
    
    case 'en_passant': {
      // Capture the pawn that's beside us
      const direction = getPawnDirection(piece.color);
      const capturedPawnPos: Position = { row: to.row - direction, col: to.col };
      const capturedPawn = getPieceAt(newState.board, capturedPawnPos);
      if (capturedPawn) {
        move.capturedPiece = capturedPawn;
        capturedPieces.push(capturedPawn);
        newState.capturedPieces[piece.color].push(capturedPawn);
        newState.board[capturedPawnPos.row][capturedPawnPos.col] = null;
      }
      newState.board = movePiece(newState.board, from, to);
      break;
    }
    
    case 'promotion': {
      const targetPiece = getPieceAt(newState.board, to);
      if (targetPiece) {
        move.capturedPiece = targetPiece;
        capturedPieces.push(targetPiece);
        newState.capturedPieces[piece.color].push(targetPiece);
      }
      move.promotionPiece = promotionPiece;
      newState.board[to.row][to.col] = {
        type: promotionPiece!,
        color: piece.color,
        hasMoved: true,
      };
      newState.board[from.row][from.col] = null;
      break;
    }
    
    case 'castle_kingside': {
      // Move king
      newState.board = movePiece(newState.board, from, to);
      // Move rook
      const rookFromCol = findRookForCastling(newState.board, from.row, from.col, 'kingside');
      if (rookFromCol >= 0) {
        const rookFrom: Position = { row: from.row, col: rookFromCol };
        const rookTo: Position = { row: from.row, col: to.col - 1 };
        newState.board = movePiece(newState.board, rookFrom, rookTo);
      }
      break;
    }
    
    case 'castle_queenside': {
      // Move king
      newState.board = movePiece(newState.board, from, to);
      // Move rook
      const rookFromCol = findRookForCastling(newState.board, from.row, from.col, 'queenside');
      if (rookFromCol >= 0) {
        const rookFrom: Position = { row: from.row, col: rookFromCol };
        const rookTo: Position = { row: from.row, col: to.col + 1 };
        newState.board = movePiece(newState.board, rookFrom, rookTo);
      }
      break;
    }
    
    case 'archer_fire': {
      // Archer doesn't move, but captures targets
      move.archerTargets = archerTargets;
      for (const target of archerTargets || []) {
        const targetPiece = getPieceAt(newState.board, target);
        if (targetPiece) {
          capturedPieces.push(targetPiece);
          newState.capturedPieces[piece.color].push(targetPiece);
          newState.board[target.row][target.col] = null;
        }
      }
      break;
    }
  }
  
  // Update en passant square
  if (piece.type === 'pawn' && Math.abs(to.row - from.row) === 2) {
    const direction = getPawnDirection(piece.color);
    newState.enPassantSquare = { row: from.row + direction, col: from.col };
  } else {
    newState.enPassantSquare = null;
  }
  
  // Update castling rights
  updateCastlingRights(newState, from, to, piece);
  
  // Update half-move clock (for 50-move rule)
  if (piece.type === 'pawn' || move.capturedPiece) {
    newState.halfMoveClock = 0;
  } else {
    newState.halfMoveClock++;
  }
  
  // Switch turns
  if (newState.currentTurn === 'black') {
    newState.moveNumber++;
  }
  newState.currentTurn = getOpponentColor(newState.currentTurn);
  
  // Add move to history
  newState.moveHistory.push(move);
  
  // Check game status
  newState.isCheck = isInCheck(newState.board, newState.currentTurn);
  newState.isCheckmate = isCheckmate(newState);
  newState.isStalemate = isStalemate(newState);
  
  // Check for draws
  if (newState.halfMoveClock >= 100) {
    newState.isDraw = true;
  }
  if (hasInsufficientMaterial(newState.board)) {
    newState.isDraw = true;
  }
  
  // Set winner
  if (newState.isCheckmate) {
    newState.winner = getOpponentColor(newState.currentTurn);
  }
  
  return {
    success: true,
    newState,
    isCheck: newState.isCheck,
    isCheckmate: newState.isCheckmate,
    isStalemate: newState.isStalemate,
    capturedPieces,
  };
}

/**
 * Find rook column for castling
 */
function findRookForCastling(
  board: Board,
  row: number,
  kingCol: number,
  side: 'kingside' | 'queenside'
): number {
  if (side === 'kingside') {
    for (let col = kingCol + 1; col < board.length; col++) {
      const p = board[row][col];
      if (p && p.type === 'rook') {
        return col;
      }
    }
  } else {
    for (let col = kingCol - 1; col >= 0; col--) {
      const p = board[row][col];
      if (p && p.type === 'rook') {
        return col;
      }
    }
  }
  return -1;
}

/**
 * Update castling rights after a move
 */
function updateCastlingRights(
  state: GameState,
  from: Position,
  to: Position,
  piece: Piece
): void {
  const boardSize = state.board.length;
  
  // King move removes all castling rights for that color
  if (piece.type === 'king') {
    if (piece.color === 'white') {
      state.castlingRights.whiteKingside = false;
      state.castlingRights.whiteQueenside = false;
    } else {
      state.castlingRights.blackKingside = false;
      state.castlingRights.blackQueenside = false;
    }
  }
  
  // Rook move from starting position removes that castling right
  if (piece.type === 'rook') {
    if (piece.color === 'white' && from.row === 0) {
      // Check which rook
      const config = GAME_MODES[state.gameMode];
      const setup = config.initialSetup;
      const kingsideRookCol = setup.lastIndexOf('rook');
      const queensideRookCol = setup.indexOf('rook');
      
      if (from.col === kingsideRookCol) {
        state.castlingRights.whiteKingside = false;
      } else if (from.col === queensideRookCol) {
        state.castlingRights.whiteQueenside = false;
      }
    } else if (piece.color === 'black' && from.row === boardSize - 1) {
      const config = GAME_MODES[state.gameMode];
      const setup = config.initialSetup;
      const kingsideRookCol = setup.lastIndexOf('rook');
      const queensideRookCol = setup.indexOf('rook');
      
      if (from.col === kingsideRookCol) {
        state.castlingRights.blackKingside = false;
      } else if (from.col === queensideRookCol) {
        state.castlingRights.blackQueenside = false;
      }
    }
  }
  
  // Capturing a rook also removes castling rights
  const capturedPiece = getPieceAt(state.board, to);
  // Note: we already moved, so check original board (handled by caller)
}

// ============================================================================
// GAME STATUS CHECKS
// ============================================================================

/**
 * Check if the current player's king is in check
 */
export function isCheck(state: GameState): boolean {
  return isInCheck(state.board, state.currentTurn);
}

/**
 * Re-export checkmate check
 */
export { isCheckmate, isStalemate } from './check';
