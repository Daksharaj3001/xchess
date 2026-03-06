/**
 * XChess Post-Game Analysis
 *
 * Lightweight heuristic coaching:
 * - Best move of the game
 * - Biggest mistake
 * - Turning point
 *
 * Uses the same evaluate() logic as the bot engine.
 */

import type { GameState, Move, Position, PieceColor, Board, PieceType } from './types';
import { createGame, getLegalMoves, applyMove } from './engine';
import { PIECE_VALUES } from './constants';
import { getArcherFireTargets } from './moves/archer';
import { positionToAlgebraic } from './serialization';

// ============================================================================
// EVALUATION (mirrors bot.ts evaluate but exported for analysis)
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
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const piece = board[r][c];
      if (!piece) continue;
      let bonus = 0;
      if (size === 8) {
        const centerDist = Math.abs(r - 3.5) + Math.abs(c - 3.5);
        bonus = Math.max(0, 10 - centerDist * 2);
      } else {
        const centerDist = Math.abs(r - 4.5) + Math.abs(c - 4.5);
        bonus = Math.max(0, 15 - centerDist * 2);
      }
      if (piece.type === 'archer') {
        try {
          const targets = getArcherFireTargets(board, { row: r, col: c }, piece);
          bonus += targets.length * 10;
        } catch { /* ignore */ }
      }
      score += piece.color === color ? bonus : -bonus;
    }
  }
  return score;
}

function evaluatePosition(state: GameState, color: PieceColor): number {
  if (state.isCheckmate) {
    return state.currentTurn === color ? -100000 : 100000;
  }
  if (state.isStalemate || state.isDraw) return 0;
  let score = materialScore(state.board, color);
  score += positionalScore(state.board, color);
  if (state.isCheck) {
    score += state.currentTurn === color ? -30 : 30;
  }
  return score;
}

// ============================================================================
// MOVE NOTATION HELPER
// ============================================================================

function moveToNotation(move: Move): string {
  const pieceSymbols: Record<PieceType, string> = {
    king: 'K', queen: 'Q', rook: 'R', bishop: 'B', knight: 'N', pawn: '', archer: 'A',
  };
  const prefix = pieceSymbols[move.piece.type];
  const from = positionToAlgebraic(move.from);
  const to = positionToAlgebraic(move.to);

  if (move.moveType === 'castle_kingside') return 'O-O';
  if (move.moveType === 'castle_queenside') return 'O-O-O';
  if (move.moveType === 'archer_fire') {
    const targets = move.archerTargets?.map(t => positionToAlgebraic(t)).join(',') || '';
    return `A${from} fires ${targets}`;
  }

  const capture = move.capturedPiece ? 'x' : '';
  const pawnFile = move.piece.type === 'pawn' && capture ? from[0] : '';
  const promo = move.promotionPiece ? `=${pieceSymbols[move.promotionPiece] || 'Q'}` : '';

  return `${prefix || pawnFile}${capture}${to}${promo}`;
}

// ============================================================================
// ANALYSIS TYPES
// ============================================================================

export interface AnalyzedMove {
  moveIndex: number;
  move: Move;
  notation: string;
  color: PieceColor;
  evalBefore: number; // from white's perspective
  evalAfter: number;  // from white's perspective
  evalDelta: number;  // change (positive = good for the mover)
  bestAlternativeNotation?: string;
  bestAlternativeEval?: number;
}

export interface PostGameInsight {
  bestMove: {
    moveIndex: number;
    notation: string;
    color: PieceColor;
    description: string;
    evalGain: number;
  } | null;
  biggestMistake: {
    moveIndex: number;
    notation: string;
    color: PieceColor;
    description: string;
    evalLoss: number;
    betterMove?: string;
  } | null;
  turningPoint: {
    moveIndex: number;
    notation: string;
    color: PieceColor;
    description: string;
    evalSwing: number;
  } | null;
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

/**
 * Analyze a completed game and return coaching insights.
 * Replays the game move by move, evaluating each position.
 */
export function analyzeGame(finalState: GameState): PostGameInsight {
  const moves = finalState.moveHistory;
  if (moves.length < 2) {
    return { bestMove: null, biggestMistake: null, turningPoint: null };
  }

  // Replay the game from scratch to get evaluation at each step
  let replayState = createGame(finalState.gameMode);
  const evaluations: number[] = [evaluatePosition(replayState, 'white')];
  const analyzed: AnalyzedMove[] = [];

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const color = move.piece.color;
    const evalBefore = evaluatePosition(replayState, 'white');

    // Find the best alternative move at this position
    const legalMoves = getLegalMoves(replayState);
    let bestAltEval = -Infinity;
    let bestAltNotation = '';

    // Sample up to 20 moves for performance
    const sampled = legalMoves.length > 20
      ? legalMoves.sort(() => Math.random() - 0.5).slice(0, 20)
      : legalMoves;

    for (const lm of sampled) {
      const testResult = applyMove(
        replayState, lm.from, lm.to,
        lm.moveType === 'promotion' ? 'queen' : undefined,
        lm.archerTargets
      );
      if (testResult.success && testResult.newState) {
        const ev = evaluatePosition(testResult.newState, 'white');
        // For white, higher is better; for black, lower is better
        const adjusted = color === 'white' ? ev : -ev;
        if (adjusted > bestAltEval) {
          bestAltEval = adjusted;
          bestAltNotation = moveToNotation({
            from: lm.from,
            to: lm.to,
            piece: replayState.board[lm.from.row][lm.from.col]!,
            moveType: lm.moveType,
            archerTargets: lm.archerTargets,
          });
        }
      }
    }

    // Apply the actual move
    const result = applyMove(
      replayState, move.from, move.to,
      move.promotionPiece, move.archerTargets
    );

    if (!result.success || !result.newState) break;

    replayState = result.newState;
    const evalAfter = evaluatePosition(replayState, 'white');
    evaluations.push(evalAfter);

    // Delta from the mover's perspective
    const rawDelta = evalAfter - evalBefore;
    const evalDelta = color === 'white' ? rawDelta : -rawDelta;

    analyzed.push({
      moveIndex: i,
      move,
      notation: moveToNotation(move),
      color,
      evalBefore,
      evalAfter,
      evalDelta,
      bestAlternativeNotation: bestAltNotation,
      bestAlternativeEval: bestAltEval,
    });
  }

  // Find best move (largest positive delta for the mover)
  let bestMove: PostGameInsight['bestMove'] = null;
  let bestDelta = -Infinity;
  for (const a of analyzed) {
    if (a.evalDelta > bestDelta) {
      bestDelta = a.evalDelta;
      const desc = a.move.capturedPiece
        ? `Captured ${a.move.capturedPiece.type} with ${a.move.piece.type}`
        : a.move.moveType === 'archer_fire'
          ? 'Devastating archer fire'
          : a.moveIndex < 6
            ? 'Strong opening move'
            : 'Excellent positional play';
      bestMove = {
        moveIndex: a.moveIndex,
        notation: a.notation,
        color: a.color,
        description: desc,
        evalGain: Math.round(a.evalDelta),
      };
    }
  }

  // Find biggest mistake (largest negative delta for the mover)
  let biggestMistake: PostGameInsight['biggestMistake'] = null;
  let worstDelta = Infinity;
  for (const a of analyzed) {
    if (a.evalDelta < worstDelta && a.evalDelta < -20) {
      worstDelta = a.evalDelta;
      const desc = a.move.capturedPiece
        ? `Losing exchange: ${a.move.piece.type} for ${a.move.capturedPiece.type}`
        : 'Positional blunder';
      biggestMistake = {
        moveIndex: a.moveIndex,
        notation: a.notation,
        color: a.color,
        description: desc,
        evalLoss: Math.round(Math.abs(a.evalDelta)),
        betterMove: a.bestAlternativeNotation || undefined,
      };
    }
  }

  // Find turning point (largest absolute swing in evaluation)
  let turningPoint: PostGameInsight['turningPoint'] = null;
  let maxSwing = 0;
  for (let i = 1; i < evaluations.length; i++) {
    const swing = Math.abs(evaluations[i] - evaluations[i - 1]);
    if (swing > maxSwing && swing > 50) {
      maxSwing = swing;
      const a = analyzed[i - 1];
      if (a) {
        const direction = evaluations[i] > evaluations[i - 1] ? 'white' : 'black';
        turningPoint = {
          moveIndex: a.moveIndex,
          notation: a.notation,
          color: a.color,
          description: `Momentum shifted towards ${direction}`,
          evalSwing: Math.round(swing),
        };
      }
    }
  }

  return { bestMove, biggestMistake, turningPoint };
}
