-- ============================================================================
-- XChess Database Schema - Initial Migration
-- ============================================================================
-- This migration creates the complete database schema for XChess platform
-- Run this in Supabase SQL Editor: Dashboard > SQL Editor > New Query
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================
-- User profiles linked to Supabase Auth
-- Created automatically on first login via trigger

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  username TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  country TEXT,
  
  -- Stats (denormalized for performance)
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  games_lost INTEGER DEFAULT 0,
  games_drawn INTEGER DEFAULT 0,
  
  -- Account status
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  is_banned BOOLEAN DEFAULT false,
  ban_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for username searches
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_is_online ON profiles(is_online);

-- ============================================================================
-- 2. RATINGS TABLE
-- ============================================================================
-- Separate rating for each game mode/time control

CREATE TYPE rating_category AS ENUM (
  'bullet',      -- < 3 min
  'blitz',       -- 3-10 min
  'rapid',       -- 10-30 min
  'classical',   -- > 30 min
  'puzzle'       -- puzzle rating
);

CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category rating_category NOT NULL,
  
  -- ELO rating data
  rating INTEGER DEFAULT 1200,
  rating_deviation INTEGER DEFAULT 350,  -- For Glicko-2
  volatility DECIMAL(10, 6) DEFAULT 0.06,
  
  -- Stats for this category
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  highest_rating INTEGER DEFAULT 1200,
  lowest_rating INTEGER DEFAULT 1200,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One rating per user per category
  UNIQUE(user_id, category)
);

CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_category_rating ON ratings(category, rating DESC);

-- ============================================================================
-- 3. GAMES TABLE
-- ============================================================================
-- Stores all game records

CREATE TYPE game_status AS ENUM (
  'waiting',     -- Waiting for opponent
  'active',      -- Game in progress
  'completed',   -- Game finished normally
  'abandoned',   -- Player disconnected
  'aborted'      -- Game cancelled before move 2
);

CREATE TYPE game_result AS ENUM (
  'white_wins',
  'black_wins', 
  'draw',
  'aborted'
);

CREATE TYPE game_mode AS ENUM (
  'standard',    -- Regular XChess
  'archer',      -- XChess with archer mechanics
  'puzzle',      -- Puzzle mode (single player)
  'analysis'     -- Analysis board
);

CREATE TYPE termination_reason AS ENUM (
  'checkmate',
  'resignation',
  'timeout',
  'stalemate',
  'insufficient_material',
  'threefold_repetition',
  'fifty_moves',
  'agreement',
  'abandonment',
  'abort'
);

CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Players
  white_player_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  black_player_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Game configuration
  mode game_mode NOT NULL DEFAULT 'standard',
  time_control_initial INTEGER NOT NULL DEFAULT 600,  -- seconds
  time_control_increment INTEGER NOT NULL DEFAULT 0,   -- seconds per move
  rated BOOLEAN DEFAULT true,
  
  -- Current state
  status game_status NOT NULL DEFAULT 'waiting',
  current_fen TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  move_number INTEGER DEFAULT 0,
  is_white_turn BOOLEAN DEFAULT true,
  
  -- Time remaining (in milliseconds)
  white_time_remaining INTEGER,
  black_time_remaining INTEGER,
  last_move_at TIMESTAMPTZ,
  
  -- Game result
  result game_result,
  termination termination_reason,
  winner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Rating changes (stored after game completes)
  white_rating_before INTEGER,
  black_rating_before INTEGER,
  white_rating_change INTEGER,
  black_rating_change INTEGER,
  
  -- PGN for full game record
  pgn TEXT,
  
  -- Archer-specific state (JSON for flexibility)
  archer_state JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_games_white_player ON games(white_player_id);
CREATE INDEX IF NOT EXISTS idx_games_black_player ON games(black_player_id);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_created_at ON games(created_at DESC);

-- ============================================================================
-- 4. GAME_MOVES TABLE
-- ============================================================================
-- Individual moves for each game

CREATE TABLE IF NOT EXISTS game_moves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  
  -- Move data
  move_number INTEGER NOT NULL,
  is_white BOOLEAN NOT NULL,
  
  -- Standard chess notation
  san TEXT NOT NULL,          -- Standard Algebraic Notation (e.g., "e4", "Nf3")
  uci TEXT NOT NULL,          -- UCI format (e.g., "e2e4")
  fen_before TEXT NOT NULL,   -- Position before move
  fen_after TEXT NOT NULL,    -- Position after move
  
  -- Move metadata
  is_capture BOOLEAN DEFAULT false,
  is_check BOOLEAN DEFAULT false,
  is_checkmate BOOLEAN DEFAULT false,
  is_castle BOOLEAN DEFAULT false,
  promotion_piece TEXT,       -- 'q', 'r', 'b', 'n' if promotion
  
  -- Archer-specific (XChess)
  is_archer_shot BOOLEAN DEFAULT false,
  archer_target_square TEXT,
  
  -- Timing
  time_spent INTEGER,         -- milliseconds spent on this move
  time_remaining INTEGER,     -- time left after move (milliseconds)
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_moves_game_id ON game_moves(game_id);
CREATE INDEX IF NOT EXISTS idx_game_moves_game_move ON game_moves(game_id, move_number);

-- ============================================================================
-- 5. MATCHMAKING_QUEUE TABLE
-- ============================================================================
-- Players waiting for a match

CREATE TABLE IF NOT EXISTS matchmaking_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Match preferences
  mode game_mode NOT NULL DEFAULT 'standard',
  time_control_initial INTEGER NOT NULL,
  time_control_increment INTEGER NOT NULL DEFAULT 0,
  rated BOOLEAN DEFAULT true,
  
  -- Rating for matching
  rating INTEGER NOT NULL,
  rating_range INTEGER DEFAULT 200,  -- Accept opponents within this range
  
  -- Queue status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '10 minutes'),
  
  -- One active queue entry per user
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_matchmaking_active ON matchmaking_queue(is_active, mode, time_control_initial);
CREATE INDEX IF NOT EXISTS idx_matchmaking_rating ON matchmaking_queue(rating);

-- ============================================================================
-- 6. PUZZLES TABLE
-- ============================================================================
-- Chess puzzles for training

CREATE TYPE puzzle_difficulty AS ENUM (
  'easy',      -- < 1200 rating
  'medium',    -- 1200-1600
  'hard',      -- 1600-2000
  'extreme'    -- > 2000
);

CREATE TABLE IF NOT EXISTS puzzles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Puzzle content
  fen TEXT NOT NULL,                    -- Starting position
  solution TEXT[] NOT NULL,             -- Array of moves in UCI format
  
  -- Metadata
  difficulty puzzle_difficulty NOT NULL,
  rating INTEGER DEFAULT 1500,          -- Puzzle rating
  themes TEXT[],                        -- e.g., ['fork', 'pin', 'mate_in_2']
  
  -- Stats
  times_played INTEGER DEFAULT 0,
  times_solved INTEGER DEFAULT 0,
  
  -- XChess specific
  has_archer BOOLEAN DEFAULT false,
  archer_state JSONB DEFAULT '{}'::jsonb,
  
  -- Source (for attribution)
  source TEXT,
  source_id TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_puzzles_difficulty ON puzzles(difficulty);
CREATE INDEX IF NOT EXISTS idx_puzzles_rating ON puzzles(rating);
CREATE INDEX IF NOT EXISTS idx_puzzles_themes ON puzzles USING GIN(themes);

-- ============================================================================
-- 7. PUZZLE_ATTEMPTS TABLE
-- ============================================================================
-- Track user puzzle attempts

CREATE TABLE IF NOT EXISTS puzzle_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  puzzle_id UUID NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,
  
  -- Attempt data
  solved BOOLEAN NOT NULL,
  attempts INTEGER DEFAULT 1,
  time_spent INTEGER,           -- milliseconds
  moves_played TEXT[],          -- User's moves
  
  -- Rating change
  rating_before INTEGER,
  rating_after INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_puzzle_attempts_user ON puzzle_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_puzzle_attempts_puzzle ON puzzle_attempts(puzzle_id);

-- ============================================================================
-- 8. REPORTS TABLE
-- ============================================================================
-- User reports for moderation

CREATE TYPE report_type AS ENUM (
  'cheating',
  'harassment',
  'inappropriate_username',
  'inappropriate_avatar',
  'stalling',
  'sandbagging',
  'other'
);

CREATE TYPE report_status AS ENUM (
  'pending',
  'investigating',
  'resolved',
  'dismissed'
);

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Reporter and reported
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Report details
  report_type report_type NOT NULL,
  description TEXT,
  game_id UUID REFERENCES games(id) ON DELETE SET NULL,  -- Related game if applicable
  
  -- Moderation
  status report_status DEFAULT 'pending',
  moderator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  moderator_notes TEXT,
  resolution TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user ON reports(reported_user_id);

-- ============================================================================
-- 9. FRIENDSHIPS TABLE (Bonus)
-- ============================================================================
-- Friend relationships between users

CREATE TYPE friendship_status AS ENUM (
  'pending',
  'accepted',
  'blocked'
);

CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status friendship_status DEFAULT 'pending',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate friendships
  UNIQUE(requester_id, addressee_id),
  -- Prevent self-friendship
  CHECK (requester_id != addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);
