/**
 * XChess Replay System
 * 
 * Handles game reconstruction and replay functionality.
 * Allows stepping through moves forward/backward and jumping to specific moves.
 */

import {
  GameState,
  Move,
  Position,
  PieceType,
  GameMode,
} from './types';
import { createInitialGameState, cloneGameState } from './utils';
import { applyMove } from './engine';
import { serializeGameState, deserializeGameState, parseUciMove } from './serialization';

// ============================================================================
// STORED MOVE FORMAT
// ============================================================================

export interface StoredMove {
  id: string;
  gameId: string;
  moveNumber: number;
  isWhite: boolean;
  san: string;
  uci: string;
  fenBefore: string;
  fenAfter: string;
  isCapture: boolean;
  isCheck: boolean;
  isCheckmate: boolean;
  isCastle: boolean;
  promotionPiece?: PieceType;
  isArcherShot: boolean;
  archerTargetSquare?: string;
  timeSpent?: number;
  timeRemaining?: number;
  createdAt: string;
}

// ============================================================================
// REPLAY STATE
// ============================================================================

export interface ReplayState {
  gameId: string;
  gameMode: GameMode;
  initialState: GameState;
  currentState: GameState;
  moves: StoredMove[];
  currentMoveIndex: number;  // -1 = initial position, 0 = after first move
  totalMoves: number;
  isAtStart: boolean;
  isAtEnd: boolean;
}

// ============================================================================
// REPLAY FUNCTIONS
// ============================================================================

/**
 * Create a replay state from stored moves
 */
export function createReplayState(
  gameId: string,
  gameMode: GameMode,
  moves: StoredMove[]
): ReplayState {
  const initialState = createInitialGameState(gameMode);
  
  return {
    gameId,
    gameMode,
    initialState: cloneGameState(initialState),
    currentState: cloneGameState(initialState),
    moves: moves.sort((a, b) => {
      // Sort by move number, then by color (white first)
      if (a.moveNumber !== b.moveNumber) {
        return a.moveNumber - b.moveNumber;
      }
      return a.isWhite ? -1 : 1;
    }),
    currentMoveIndex: -1,
    totalMoves: moves.length,
    isAtStart: true,
    isAtEnd: moves.length === 0,
  };
}

/**
 * Reconstruct game state at a specific move
 */
export function reconstructGameAtMove(
  initialState: GameState,
  moves: StoredMove[],
  targetMoveIndex: number
): GameState {
  let state = cloneGameState(initialState);
  
  // Apply moves up to target index
  for (let i = 0; i <= targetMoveIndex && i < moves.length; i++) {
    const move = moves[i];
    const parsed = parseUciMove(move.uci);
    
    const result = applyMove(
      state,
      parsed.from,
      parsed.to,
      parsed.promotion,
      parsed.archerTargets
    );
    
    if (result.success && result.newState) {
      state = result.newState;
    } else {
      console.warn(`Failed to apply move ${i}: ${move.uci}`);
      break;
    }
  }
  
  return state;
}

/**
 * Step forward one move
 */
export function stepForward(replay: ReplayState): ReplayState {
  if (replay.isAtEnd) {
    return replay;
  }
  
  const nextIndex = replay.currentMoveIndex + 1;
  
  if (nextIndex >= replay.moves.length) {
    return replay;
  }
  
  const move = replay.moves[nextIndex];
  const parsed = parseUciMove(move.uci);
  
  const result = applyMove(
    replay.currentState,
    parsed.from,
    parsed.to,
    parsed.promotion,
    parsed.archerTargets
  );
  
  if (!result.success || !result.newState) {
    console.warn(`Failed to apply move: ${move.uci}`);
    return replay;
  }
  
  return {
    ...replay,
    currentState: result.newState,
    currentMoveIndex: nextIndex,
    isAtStart: false,
    isAtEnd: nextIndex >= replay.moves.length - 1,
  };
}

/**
 * Step backward one move
 */
export function stepBackward(replay: ReplayState): ReplayState {
  if (replay.isAtStart) {
    return replay;
  }
  
  const prevIndex = replay.currentMoveIndex - 1;
  
  // Reconstruct state up to previous move
  const newState = prevIndex < 0
    ? cloneGameState(replay.initialState)
    : reconstructGameAtMove(replay.initialState, replay.moves, prevIndex);
  
  return {
    ...replay,
    currentState: newState,
    currentMoveIndex: prevIndex,
    isAtStart: prevIndex < 0,
    isAtEnd: false,
  };
}

/**
 * Jump to a specific move number
 */
export function jumpToMove(replay: ReplayState, moveIndex: number): ReplayState {
  // Clamp to valid range
  const targetIndex = Math.max(-1, Math.min(moveIndex, replay.moves.length - 1));
  
  if (targetIndex === replay.currentMoveIndex) {
    return replay;
  }
  
  // Reconstruct state at target
  const newState = targetIndex < 0
    ? cloneGameState(replay.initialState)
    : reconstructGameAtMove(replay.initialState, replay.moves, targetIndex);
  
  return {
    ...replay,
    currentState: newState,
    currentMoveIndex: targetIndex,
    isAtStart: targetIndex < 0,
    isAtEnd: targetIndex >= replay.moves.length - 1,
  };
}

/**
 * Jump to start (initial position)
 */
export function jumpToStart(replay: ReplayState): ReplayState {
  return jumpToMove(replay, -1);
}

/**
 * Jump to end (final position)
 */
export function jumpToEnd(replay: ReplayState): ReplayState {
  return jumpToMove(replay, replay.moves.length - 1);
}

// ============================================================================
// GAME RECONSTRUCTION FROM DATABASE
// ============================================================================

/**
 * Reconstruct full game from move history
 */
export function reconstructGame(
  gameMode: GameMode,
  moves: StoredMove[]
): {
  states: GameState[];
  finalState: GameState;
} {
  const states: GameState[] = [];
  let state = createInitialGameState(gameMode);
  states.push(cloneGameState(state));
  
  const sortedMoves = [...moves].sort((a, b) => {
    if (a.moveNumber !== b.moveNumber) return a.moveNumber - b.moveNumber;
    return a.isWhite ? -1 : 1;
  });
  
  for (const move of sortedMoves) {
    const parsed = parseUciMove(move.uci);
    
    const result = applyMove(
      state,
      parsed.from,
      parsed.to,
      parsed.promotion,
      parsed.archerTargets
    );
    
    if (result.success && result.newState) {
      state = result.newState;
      states.push(cloneGameState(state));
    }
  }
  
  return {
    states,
    finalState: state,
  };
}

/**
 * Get current game state (latest position)
 */
export function getGameState(replay: ReplayState): GameState {
  return replay.currentState;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get move at index
 */
export function getMoveAt(replay: ReplayState, index: number): StoredMove | null {
  if (index < 0 || index >= replay.moves.length) {
    return null;
  }
  return replay.moves[index];
}

/**
 * Get current move (the last applied move)
 */
export function getCurrentMove(replay: ReplayState): StoredMove | null {
  return getMoveAt(replay, replay.currentMoveIndex);
}

/**
 * Get move list formatted for display
 */
export function getFormattedMoveList(moves: StoredMove[]): Array<{
  moveNumber: number;
  white: { san: string; index: number } | null;
  black: { san: string; index: number } | null;
}> {
  const formatted: Array<{
    moveNumber: number;
    white: { san: string; index: number } | null;
    black: { san: string; index: number } | null;
  }> = [];
  
  const sortedMoves = [...moves].sort((a, b) => {
    if (a.moveNumber !== b.moveNumber) return a.moveNumber - b.moveNumber;
    return a.isWhite ? -1 : 1;
  });
  
  let currentMoveNum = 0;
  let currentEntry: typeof formatted[0] | null = null;
  
  sortedMoves.forEach((move, index) => {
    if (move.moveNumber !== currentMoveNum) {
      if (currentEntry) {
        formatted.push(currentEntry);
      }
      currentMoveNum = move.moveNumber;
      currentEntry = {
        moveNumber: currentMoveNum,
        white: null,
        black: null,
      };
    }
    
    if (currentEntry) {
      if (move.isWhite) {
        currentEntry.white = { san: move.san, index };
      } else {
        currentEntry.black = { san: move.san, index };
      }
    }
  });
  
  if (currentEntry) {
    formatted.push(currentEntry);
  }
  
  return formatted;
}
