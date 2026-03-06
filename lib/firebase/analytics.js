/**
 * Firebase Analytics Events
 * 
 * Custom event tracking for XChess platform.
 * All events are high-level and contain NO personal data,
 * NO board state, NO move lists.
 * 
 * Event Categories:
 * - Board/Game lifecycle
 * - Move tracking (counts only, no positions)
 * - Archer mechanics (XChess specific)
 * - Puzzle engagement
 */

import { logEvent as firebaseLogEvent } from 'firebase/analytics'
import { getFirebaseAnalytics } from './client'

/**
 * Safe event logger that handles null analytics gracefully
 * @param {string} eventName - Event name
 * @param {object} params - Event parameters (no PII)
 */
async function logEvent(eventName, params = {}) {
  try {
    const analytics = await getFirebaseAnalytics()
    if (analytics) {
      firebaseLogEvent(analytics, eventName, {
        ...params,
        timestamp: Date.now(),
      })
    }
  } catch (error) {
    // Silently fail - analytics should never break the app
    console.warn('Analytics event failed:', eventName, error.message)
  }
}

// ==========================================
// PAGE/SCREEN TRACKING
// ==========================================

/**
 * Track page/screen views
 * @param {string} pageName - Name of the page
 * @param {string} pageLocation - URL path
 */
export async function trackPageView(pageName, pageLocation) {
  await logEvent('page_view', {
    page_title: pageName,
    page_location: pageLocation,
  })
}

// ==========================================
// BOARD/GAME EVENTS
// ==========================================

/**
 * Fired when a chess board is fully loaded and rendered
 * @param {string} mode - 'online' | 'vs_ai' | 'puzzle' | 'analysis'
 */
export async function trackBoardLoaded(mode) {
  await logEvent('board_loaded', { mode })
}

/**
 * Fired when a new game begins
 * @param {string} mode - 'online' | 'vs_ai'
 * @param {string} timeControl - e.g., 'rapid', 'blitz', 'bullet'
 */
export async function trackGameStarted(mode, timeControl) {
  await logEvent('game_started', { mode, time_control: timeControl })
}

/**
 * Fired when a game ends
 * @param {string} result - 'win' | 'loss' | 'draw' | 'resign' | 'timeout'
 * @param {string} mode - Game mode
 * @param {number} moveCount - Total moves in the game
 */
export async function trackGameFinished(result, mode, moveCount) {
  await logEvent('game_finished', {
    result,
    mode,
    move_count: moveCount,
  })
}

// ==========================================
// MOVE EVENTS
// ==========================================

/**
 * Fired when user attempts to make a move (before validation)
 */
export async function trackMoveAttempted() {
  await logEvent('move_attempted', {})
}

/**
 * Fired when a move is validated and committed to the board
 */
export async function trackMoveCommitted() {
  await logEvent('move_committed', {})
}

/**
 * Fired when user attempts an illegal move
 * @param {string} reason - Brief reason code (e.g., 'in_check', 'invalid_piece')
 */
export async function trackIllegalMoveAttempt(reason) {
  await logEvent('illegal_move_attempt', { reason })
}

// ==========================================
// ARCHER MECHANICS (XChess Specific)
// ==========================================

/**
 * Fired when archer fire mode is opened (target selection UI)
 */
export async function trackArcherFireModeOpened() {
  await logEvent('archer_fire_mode_opened', {})
}

/**
 * Fired when archer fire is confirmed (shot taken)
 * @param {boolean} hit - Whether the shot hit a target
 */
export async function trackArcherFireConfirmed(hit) {
  await logEvent('archer_fire_confirmed', { hit })
}

// ==========================================
// PUZZLE EVENTS
// ==========================================

/**
 * Fired when user starts a puzzle
 * @param {string} difficulty - 'easy' | 'medium' | 'hard' | 'extreme'
 */
export async function trackPuzzleStart(difficulty) {
  await logEvent('puzzle_start', { difficulty })
}

/**
 * Fired when user completes a puzzle
 * @param {boolean} success - Whether puzzle was solved correctly
 * @param {number} attempts - Number of attempts
 * @param {number} timeSpent - Time in seconds
 */
export async function trackPuzzleComplete(success, attempts, timeSpent) {
  await logEvent('puzzle_complete', {
    success,
    attempts,
    time_spent_seconds: timeSpent,
  })
}

// ==========================================
// ENGAGEMENT EVENTS
// ==========================================

/**
 * Track user sign up method
 * @param {string} method - 'email' | 'google'
 */
export async function trackSignUp(method) {
  await logEvent('sign_up', { method })
}

/**
 * Track user login method
 * @param {string} method - 'email' | 'google'
 */
export async function trackLogin(method) {
  await logEvent('login', { method })
}

// Export all tracking functions
export const analytics = {
  trackPageView,
  trackBoardLoaded,
  trackGameStarted,
  trackGameFinished,
  trackMoveAttempted,
  trackMoveCommitted,
  trackIllegalMoveAttempt,
  trackArcherFireModeOpened,
  trackArcherFireConfirmed,
  trackPuzzleStart,
  trackPuzzleComplete,
  trackSignUp,
  trackLogin,
  trackTimerStarted,
  trackTimerLowWarning,
  trackTimeoutWin,
  trackMoveHistoryOpened,
  trackBoardThemeLoaded,
}

// ============================================================================
// TIMER ANALYTICS
// ============================================================================

export async function trackTimerStarted(mode, timeControl) {
  await trackEvent('timer_started', { mode, time_control: timeControl });
}

export async function trackTimerLowWarning(playerColor, timeRemaining) {
  await trackEvent('timer_low_warning', { player_color: playerColor, time_remaining_ms: timeRemaining });
}

export async function trackTimeoutWin(winnerColor, mode) {
  await trackEvent('timeout_win', { winner_color: winnerColor, mode });
}

export async function trackMoveHistoryOpened() {
  await trackEvent('move_history_opened');
}

export async function trackBoardThemeLoaded(theme) {
  await trackEvent('board_theme_loaded', { theme });
}

export default analytics
