/**
 * XChess Bot Engine
 *
 * Three difficulty levels:
 * - Beginner:   Mostly random, slight capture preference
 * - Casual:     Greedy one-ply evaluation
 * - Challenger: Minimax with alpha-beta pruning (depth 3)
 *
 * Supports standard pieces and Archer fire mechanics.
 */

import type { GameState, LegalMove, Position, PieceType, PieceColor, Piece, Board } from './types';
import { getLegalMoves, applyMove } from './engine';
import { getArcherFireTargets } from './moves/archer';
import { getPieceAt, getOpponentColor, cloneGameState } from './utils';
import { PIECE_VALUES } from './constants';

export type BotDifficulty = 'beginner' | 'casual' | 'challenger';

// ============================================================================
// PIECE-SQUARE TABLES (positional bonuses, from white's perspective)
// ============================================================================

const CENTER_BONUS_8: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 5, 10, 10, 5, 0, 0],
  [0, 5, 10, 20, 20, 10, 5, 0],
  [0, 5, 10, 20, 20, 10, 5, 0],
  [0, 0, 5, 10, 10, 5, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const PAWN_TABLE_8: number[][] = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

// ============================================================================
// EVALUATION
// ============================================================================

function materialScore(board: Board, color: PieceColor): number {
  let score = 0;
  for (const row of board) {
    for (const piece of row) {
      if (piece) {
        const val = PIECE_VALUES[piece.type] * 100;
        score += piece.color === color ? val : -val;
      }
    }
  }
  return score;
}

function positionalScore(board: Board, color: PieceColor): number {
  let score = 0;
  const size = board.length;
  const isSize8 = size === 8;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      let bonus = 0;

      if (isSize8) {
        // Use piece-square tables for 8x8
        const tableRow = piece.color === 'white' ? r : size - 1 - r;
        if (piece.type === 'pawn') {
          bonus = PAWN_TABLE_8[tableRow]?.[c] ?? 0;
        } else if (piece.type !== 'king') {
          bonus = CENTER_BONUS_8[tableRow]?.[c] ?? 0;
        }
      } else {
        // Simple center bonus for 10x10
        const centerDist = Math.abs(r - (size - 1) / 2) + Math.abs(c - (size - 1) / 2);
        bonus = Math.max(0, 15 - centerDist * 2);
        if (piece.type === 'pawn') {
          // Pawns: advance bonus
          bonus += piece.color === 'white' ? r * 3 : (size - 1 - r) * 3;
        }
      }

      // Archer positional: bonus for having fire targets
      if (piece.type === 'archer') {
        const targets = getArcherFireTargets(board, { row: r, col: c }, piece);
        bonus += targets.length * 15;
      }

      score += piece.color === color ? bonus : -bonus;
    }
  }
  return score;
}

function evaluate(state: GameState, color: PieceColor): number {
  // Check terminal states
  if (state.isCheckmate) {
    return state.currentTurn === color ? -100000 : 100000;
  }
  if (state.isStalemate || state.isDraw) return 0;

  let score = materialScore(state.board, color);
  score += positionalScore(state.board, color);

  // Check bonus
  if (state.isCheck) {
    score += state.currentTurn === color ? -30 : 30;
  }

  return score;
}

// ============================================================================
// MOVE SCORING (for ordering & beginner/casual)
// ============================================================================

function scoreMoveQuick(state: GameState, move: LegalMove): number {
  let score = 0;

  // Captures are good
  if (move.moveType === 'capture' || move.moveType === 'en_passant') {
    const captured = getPieceAt(state.board, move.to);
    if (captured) score += PIECE_VALUES[captured.type] * 100;
    // MVV-LVA: capturing high value with low value is best
    const attacker = getPieceAt(state.board, move.from);
    if (attacker) score += (10 - PIECE_VALUES[attacker.type]) * 10;
  }

  // Archer fire: value of targets
  if (move.moveType === 'archer_fire' && move.archerTargets) {
    for (const t of move.archerTargets) {
      const tp = getPieceAt(state.board, t);
      if (tp) score += PIECE_VALUES[tp.type] * 100;
    }
  }

  // Promotions
  if (move.moveType === 'promotion') score += 800;

  // Checks (via simple heuristic — central moves tend to give checks)
  // We'll refine with actual check detection for challenger

  return score;
}

// ============================================================================
// EXPAND ARCHER FIRE COMBINATIONS
// ============================================================================

/**
 * Archer fire moves have a list of possible targets but the bot needs to pick
 * which 1 or 2 targets to fire at. Expand into concrete moves.
 */
function expandArcherFireMoves(state: GameState, moves: LegalMove[]): LegalMove[] {
  const expanded: LegalMove[] = [];

  for (const move of moves) {
    if (move.moveType !== 'archer_fire') {
      expanded.push(move);
      continue;
    }

    const targets = move.archerTargets || [];
    if (targets.length === 0) continue;

    // Single target options
    for (const t of targets) {
      expanded.push({ ...move, archerTargets: [t] });
    }
    // Double target options (max 2 targets)
    for (let i = 0; i < targets.length; i++) {
      for (let j = i + 1; j < targets.length; j++) {
        expanded.push({ ...move, archerTargets: [targets[i], targets[j]] });
      }
    }
  }

  return expanded;
}

// ============================================================================
// BOT STRATEGIES
// ============================================================================

function beginnerMove(state: GameState, moves: LegalMove[]): LegalMove {
  const expanded = expandArcherFireMoves(state, moves);

  // 30% chance to make a capture if available
  const captures = expanded.filter(m =>
    m.moveType === 'capture' || m.moveType === 'archer_fire' || m.moveType === 'en_passant'
  );
  if (captures.length > 0 && Math.random() < 0.3) {
    return captures[Math.floor(Math.random() * captures.length)];
  }

  // Otherwise random
  return expanded[Math.floor(Math.random() * expanded.length)];
}

function casualMove(state: GameState, moves: LegalMove[]): LegalMove {
  const expanded = expandArcherFireMoves(state, moves);

  // Score each move and pick the best with some randomness
  const scored = expanded.map(m => ({ move: m, score: scoreMoveQuick(state, m) + (Math.random() * 30) }));
  scored.sort((a, b) => b.score - a.score);

  // Top 3 with weighted random pick
  const top = scored.slice(0, Math.min(3, scored.length));
  const weights = top.map((_, i) => Math.pow(0.5, i));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * totalWeight;
  for (let i = 0; i < top.length; i++) {
    r -= weights[i];
    if (r <= 0) return top[i].move;
  }
  return top[0].move;
}

// ============================================================================
// MINIMAX WITH ALPHA-BETA (for Challenger)
// ============================================================================

function minimax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  botColor: PieceColor,
): number {
  if (depth === 0 || state.isCheckmate || state.isStalemate || state.isDraw) {
    return evaluate(state, botColor);
  }

  const moves = getLegalMoves(state);
  if (moves.length === 0) return evaluate(state, botColor);

  const expanded = expandArcherFireMoves(state, moves);

  // Move ordering: score moves for better pruning
  const scored = expanded.map(m => ({ move: m, score: scoreMoveQuick(state, m) }));
  scored.sort((a, b) => b.score - a.score);

  if (maximizing) {
    let maxEval = -Infinity;
    for (const { move } of scored) {
      const result = applyMove(state, move.from, move.to,
        move.moveType === 'promotion' ? 'queen' : undefined,
        move.archerTargets);
      if (!result.success || !result.newState) continue;
      const ev = minimax(result.newState, depth - 1, alpha, beta, false, botColor);
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const { move } of scored) {
      const result = applyMove(state, move.from, move.to,
        move.moveType === 'promotion' ? 'queen' : undefined,
        move.archerTargets);
      if (!result.success || !result.newState) continue;
      const ev = minimax(result.newState, depth - 1, alpha, beta, true, botColor);
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

function challengerMove(state: GameState, moves: LegalMove[], botColor: PieceColor): LegalMove {
  const expanded = expandArcherFireMoves(state, moves);
  const depth = expanded.length > 30 ? 2 : 3;

  let bestMove = expanded[0];
  let bestScore = -Infinity;

  // Score and order for pruning
  const scored = expanded.map(m => ({ move: m, score: scoreMoveQuick(state, m) }));
  scored.sort((a, b) => b.score - a.score);

  for (const { move } of scored) {
    const result = applyMove(state, move.from, move.to,
      move.moveType === 'promotion' ? 'queen' : undefined,
      move.archerTargets);
    if (!result.success || !result.newState) continue;

    // Immediate checkmate is always best
    if (result.isCheckmate) return move;

    const score = minimax(result.newState, depth - 1, -Infinity, Infinity, false, botColor);
    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

// ============================================================================
// PUBLIC API
// ============================================================================

export interface BotMoveResult {
  from: Position;
  to: Position;
  promotionPiece?: PieceType;
  archerTargets?: Position[];
}

/**
 * Get the bot's chosen move for the current position.
 * Returns null if no legal moves are available.
 */
export function getBotMove(
  state: GameState,
  difficulty: BotDifficulty,
): BotMoveResult | null {
  const moves = getLegalMoves(state);
  if (moves.length === 0) return null;

  const botColor = state.currentTurn;
  let chosen: LegalMove;

  switch (difficulty) {
    case 'beginner':
      chosen = beginnerMove(state, moves);
      break;
    case 'casual':
      chosen = casualMove(state, moves);
      break;
    case 'challenger':
      chosen = challengerMove(state, moves, botColor);
      break;
  }

  return {
    from: chosen.from,
    to: chosen.to,
    promotionPiece: chosen.moveType === 'promotion' ? 'queen' : undefined,
    archerTargets: chosen.archerTargets,
  };
}
