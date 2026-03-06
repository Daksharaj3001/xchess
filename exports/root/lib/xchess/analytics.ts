/**
 * XChess Analytics Integration
 * 
 * Sends high-level gameplay events to Firebase Analytics.
 * Does NOT log:
 * - Full board states
 * - Move sequences
 * - Sensitive user data
 */

import { GameMode, AnalyticsEventType, AnalyticsEvent } from './types';
import {
  trackGameStarted as fbGameStarted,
  trackGameFinished as fbGameFinished,
  trackMoveCommitted as fbMoveCommitted,
  trackMoveAttempted as fbMoveAttempted,
  trackIllegalMoveAttempt as fbIllegalMove,
  trackArcherFireConfirmed as fbArcherFire,
} from '@/lib/firebase/analytics';

// ============================================================================
// SERVER-SIDE EVENT LOGGING
// ============================================================================

/**
 * Log analytics event (for server-side tracking)
 * These events are stored for internal analytics
 */
export function logAnalyticsEvent(event: AnalyticsEvent): void {
  // In production, this would send to analytics backend
  // For now, we log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[XChess Analytics]', event.eventType, {
      gameId: event.gameId,
      moveNumber: event.moveNumber,
      gameMode: event.gameMode,
      ...event.metadata,
    });
  }
}

// ============================================================================
// CLIENT-SIDE EVENT HELPERS
// ============================================================================

/**
 * Track game started event
 */
export async function trackGameStarted(
  gameId: string,
  gameMode: GameMode,
  isRated: boolean
): Promise<void> {
  logAnalyticsEvent({
    eventType: 'game_started',
    gameId,
    moveNumber: 0,
    gameMode,
    metadata: { is_rated: isRated },
  });
  
  // Also send to Firebase
  const modeLabel = gameMode === 'v2_artillery' ? 'online' : 'vs_ai';
  await fbGameStarted(modeLabel, gameMode);
}

/**
 * Track move committed event
 */
export async function trackMoveCommitted(
  gameId: string,
  moveNumber: number,
  gameMode: GameMode,
  isCapture: boolean,
  isCheck: boolean
): Promise<void> {
  logAnalyticsEvent({
    eventType: 'move_committed',
    gameId,
    moveNumber,
    gameMode,
    metadata: { is_capture: isCapture, is_check: isCheck },
  });
  
  await fbMoveCommitted();
}

/**
 * Track illegal move attempt
 */
export async function trackIllegalMoveAttempt(
  gameId: string,
  moveNumber: number,
  gameMode: GameMode,
  reason: string
): Promise<void> {
  logAnalyticsEvent({
    eventType: 'illegal_move_attempt',
    gameId,
    moveNumber,
    gameMode,
    metadata: { reason },
  });
  
  await fbIllegalMove(reason);
}

/**
 * Track archer fire event
 */
export async function trackArcherFireUsed(
  gameId: string,
  moveNumber: number,
  gameMode: GameMode,
  targetsHit: number
): Promise<void> {
  logAnalyticsEvent({
    eventType: 'archer_fire_used',
    gameId,
    moveNumber,
    gameMode,
    metadata: { targets_hit: targetsHit },
  });
  
  await fbArcherFire(targetsHit > 0);
}

/**
 * Track check detected
 */
export async function trackCheckDetected(
  gameId: string,
  moveNumber: number,
  gameMode: GameMode
): Promise<void> {
  logAnalyticsEvent({
    eventType: 'check_detected',
    gameId,
    moveNumber,
    gameMode,
  });
}

/**
 * Track checkmate occurred
 */
export async function trackCheckmateOccurred(
  gameId: string,
  moveNumber: number,
  gameMode: GameMode,
  winner: 'white' | 'black'
): Promise<void> {
  logAnalyticsEvent({
    eventType: 'checkmate_occurred',
    gameId,
    moveNumber,
    gameMode,
    metadata: { winner },
  });
  
  await fbGameFinished('win', 'online', moveNumber);
}

/**
 * Track stalemate occurred
 */
export async function trackStalemateOccurred(
  gameId: string,
  moveNumber: number,
  gameMode: GameMode
): Promise<void> {
  logAnalyticsEvent({
    eventType: 'stalemate_occurred',
    gameId,
    moveNumber,
    gameMode,
  });
  
  await fbGameFinished('draw', 'online', moveNumber);
}

/**
 * Track game finished
 */
export async function trackGameFinished(
  gameId: string,
  moveNumber: number,
  gameMode: GameMode,
  result: 'white_wins' | 'black_wins' | 'draw' | 'aborted',
  termination: string
): Promise<void> {
  logAnalyticsEvent({
    eventType: 'game_finished',
    gameId,
    moveNumber,
    gameMode,
    metadata: { result, termination },
  });
  
  const resultLabel = result === 'draw' ? 'draw' : result === 'aborted' ? 'resign' : 'win';
  await fbGameFinished(resultLabel, 'online', moveNumber);
}

/**
 * Track castling performed
 */
export async function trackCastlingPerformed(
  gameId: string,
  moveNumber: number,
  gameMode: GameMode,
  side: 'kingside' | 'queenside'
): Promise<void> {
  logAnalyticsEvent({
    eventType: 'castling_performed',
    gameId,
    moveNumber,
    gameMode,
    metadata: { side },
  });
}

/**
 * Track en passant performed
 */
export async function trackEnPassantPerformed(
  gameId: string,
  moveNumber: number,
  gameMode: GameMode
): Promise<void> {
  logAnalyticsEvent({
    eventType: 'en_passant_performed',
    gameId,
    moveNumber,
    gameMode,
  });
}

/**
 * Track promotion performed
 */
export async function trackPromotionPerformed(
  gameId: string,
  moveNumber: number,
  gameMode: GameMode,
  promotedTo: string
): Promise<void> {
  logAnalyticsEvent({
    eventType: 'promotion_performed',
    gameId,
    moveNumber,
    gameMode,
    metadata: { promoted_to: promotedTo },
  });
}
