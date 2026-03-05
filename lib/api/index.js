/**
 * Reusable API Layer
 * 
 * Centralized API client for making requests to the backend.
 * All API routes are prefixed with /api as required by the architecture.
 */

/**
 * Base API configuration
 */
const API_BASE = '/api'

/**
 * Generic fetch wrapper with error handling
 * @param {string} endpoint - API endpoint (without /api prefix)
 * @param {object} options - Fetch options
 * @returns {Promise<any>} - Response data
 */
async function fetchApi(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  }

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  }

  try {
    const response = await fetch(url, config)
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ApiError(
        errorData.error || `HTTP ${response.status}`,
        response.status,
        errorData
      )
    }

    return await response.json()
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    throw new ApiError('Network error', 0, { originalError: error.message })
  }
}

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(message, status, data = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

// ==========================================
// AUTH API
// ==========================================

export const authApi = {
  /**
   * Get current user profile
   */
  async getProfile() {
    return fetchApi('/auth/profile')
  },

  /**
   * Create or update user profile
   * @param {object} profileData - { username, avatar_url }
   */
  async upsertProfile(profileData) {
    return fetchApi('/auth/profile', {
      method: 'POST',
      body: JSON.stringify(profileData),
    })
  },
}

// ==========================================
// GAMES API
// ==========================================

export const gamesApi = {
  /**
   * Create a new game
   * @param {object} gameData - Game configuration
   */
  async create(gameData) {
    return fetchApi('/games', {
      method: 'POST',
      body: JSON.stringify(gameData),
    })
  },

  /**
   * Get game by ID
   * @param {string} gameId - Game UUID
   */
  async getById(gameId) {
    return fetchApi(`/games/${gameId}`)
  },

  /**
   * Get user's games
   * @param {object} params - { limit, offset, status }
   */
  async getMyGames(params = {}) {
    const query = new URLSearchParams(params).toString()
    return fetchApi(`/games?${query}`)
  },

  /**
   * Submit a move
   * @param {string} gameId - Game UUID
   * @param {object} moveData - Move information
   */
  async submitMove(gameId, moveData) {
    return fetchApi(`/games/${gameId}/moves`, {
      method: 'POST',
      body: JSON.stringify(moveData),
    })
  },
}

// ==========================================
// MATCHMAKING API
// ==========================================

export const matchmakingApi = {
  /**
   * Join matchmaking queue
   * @param {object} preferences - { time_control, rating_range }
   */
  async joinQueue(preferences) {
    return fetchApi('/matchmaking/queue', {
      method: 'POST',
      body: JSON.stringify(preferences),
    })
  },

  /**
   * Leave matchmaking queue
   */
  async leaveQueue() {
    return fetchApi('/matchmaking/queue', {
      method: 'DELETE',
    })
  },

  /**
   * Get queue status
   */
  async getStatus() {
    return fetchApi('/matchmaking/status')
  },
}

// ==========================================
// PUZZLES API
// ==========================================

export const puzzlesApi = {
  /**
   * Get random puzzle by difficulty
   * @param {string} difficulty - easy | medium | hard | extreme
   */
  async getRandom(difficulty) {
    return fetchApi(`/puzzles/random?difficulty=${difficulty}`)
  },

  /**
   * Get puzzle by ID
   * @param {string} puzzleId - Puzzle UUID
   */
  async getById(puzzleId) {
    return fetchApi(`/puzzles/${puzzleId}`)
  },

  /**
   * Submit puzzle solution
   * @param {string} puzzleId - Puzzle UUID
   * @param {object} solution - Solution data
   */
  async submitSolution(puzzleId, solution) {
    return fetchApi(`/puzzles/${puzzleId}/solve`, {
      method: 'POST',
      body: JSON.stringify(solution),
    })
  },
}

// ==========================================
// RATINGS API
// ==========================================

export const ratingsApi = {
  /**
   * Get user's ratings
   */
  async getMyRatings() {
    return fetchApi('/ratings')
  },

  /**
   * Get leaderboard
   * @param {object} params - { category, limit }
   */
  async getLeaderboard(params = {}) {
    const query = new URLSearchParams(params).toString()
    return fetchApi(`/ratings/leaderboard?${query}`)
  },
}

// Export unified API object
export const api = {
  auth: authApi,
  games: gamesApi,
  matchmaking: matchmakingApi,
  puzzles: puzzlesApi,
  ratings: ratingsApi,
}

export default api
