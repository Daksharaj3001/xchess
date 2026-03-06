-- ============================================================================
-- XChess Row Level Security Policies
-- ============================================================================
-- Run this AFTER 001_initial_schema.sql
-- ============================================================================

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE puzzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE puzzle_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================
-- Public read, users can only edit their own profile

-- Anyone can view profiles (for leaderboards, game history)
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update only their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users cannot delete profiles (handled by auth cascade)
CREATE POLICY "Users cannot delete profiles"
  ON profiles FOR DELETE
  USING (false);

-- ============================================================================
-- RATINGS POLICIES
-- ============================================================================
-- Public read (for leaderboards), only system can write

-- Anyone can view ratings (leaderboards)
CREATE POLICY "Ratings are viewable by everyone"
  ON ratings FOR SELECT
  USING (true);

-- Users can insert their own initial ratings
CREATE POLICY "Users can insert their own ratings"
  ON ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own ratings (via game completion)
CREATE POLICY "Users can update their own ratings"
  ON ratings FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- GAMES POLICIES
-- ============================================================================
-- Public read, only participants can write

-- Anyone can view games (for spectating, history)
CREATE POLICY "Games are viewable by everyone"
  ON games FOR SELECT
  USING (true);

-- Any authenticated user can create a game
CREATE POLICY "Authenticated users can create games"
  ON games FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Only participants can update game state
CREATE POLICY "Only participants can update games"
  ON games FOR UPDATE
  USING (
    auth.uid() = white_player_id OR 
    auth.uid() = black_player_id
  );

-- Games cannot be deleted (historical record)
CREATE POLICY "Games cannot be deleted"
  ON games FOR DELETE
  USING (false);

-- ============================================================================
-- GAME_MOVES POLICIES
-- ============================================================================
-- Public read (for analysis), only current player can write

-- Anyone can view moves (for spectating, analysis)
CREATE POLICY "Moves are viewable by everyone"
  ON game_moves FOR SELECT
  USING (true);

-- Only the player whose turn it is can insert a move
CREATE POLICY "Only current player can insert moves"
  ON game_moves FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM games g
      WHERE g.id = game_id
      AND g.status = 'active'
      AND (
        (g.is_white_turn = true AND g.white_player_id = auth.uid()) OR
        (g.is_white_turn = false AND g.black_player_id = auth.uid())
      )
    )
  );

-- Moves cannot be updated (immutable history)
CREATE POLICY "Moves cannot be updated"
  ON game_moves FOR UPDATE
  USING (false);

-- Moves cannot be deleted
CREATE POLICY "Moves cannot be deleted"
  ON game_moves FOR DELETE
  USING (false);

-- ============================================================================
-- MATCHMAKING_QUEUE POLICIES
-- ============================================================================
-- Users can only manage their own queue entry

-- Users can see all queue entries (for matchmaking logic)
CREATE POLICY "Queue entries are viewable by authenticated users"
  ON matchmaking_queue FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users can insert their own queue entry
CREATE POLICY "Users can join queue"
  ON matchmaking_queue FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own queue entry
CREATE POLICY "Users can update their queue entry"
  ON matchmaking_queue FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own queue entry (leave queue)
CREATE POLICY "Users can leave queue"
  ON matchmaking_queue FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- PUZZLES POLICIES
-- ============================================================================
-- Public read, no user writes (admin only)

-- Anyone can view puzzles
CREATE POLICY "Puzzles are viewable by everyone"
  ON puzzles FOR SELECT
  USING (true);

-- No user inserts (admin/migration only)
CREATE POLICY "Puzzles insert restricted"
  ON puzzles FOR INSERT
  WITH CHECK (false);

-- No user updates
CREATE POLICY "Puzzles update restricted"
  ON puzzles FOR UPDATE
  USING (false);

-- ============================================================================
-- PUZZLE_ATTEMPTS POLICIES
-- ============================================================================
-- Users can only manage their own attempts

-- Users can view their own attempts
CREATE POLICY "Users can view their own puzzle attempts"
  ON puzzle_attempts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own attempts
CREATE POLICY "Users can record puzzle attempts"
  ON puzzle_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Attempts cannot be updated
CREATE POLICY "Puzzle attempts cannot be updated"
  ON puzzle_attempts FOR UPDATE
  USING (false);

-- ============================================================================
-- REPORTS POLICIES
-- ============================================================================
-- Users can create reports, only see their own

-- Users can view their own reports
CREATE POLICY "Users can view their own reports"
  ON reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- Authenticated users can create reports
CREATE POLICY "Authenticated users can create reports"
  ON reports FOR INSERT
  WITH CHECK (
    auth.uid() = reporter_id AND
    auth.uid() != reported_user_id  -- Can't report yourself
  );

-- Reports cannot be updated by users (moderators only)
CREATE POLICY "Reports cannot be updated by users"
  ON reports FOR UPDATE
  USING (false);

-- Reports cannot be deleted
CREATE POLICY "Reports cannot be deleted"
  ON reports FOR DELETE
  USING (false);

-- ============================================================================
-- FRIENDSHIPS POLICIES
-- ============================================================================
-- Users can manage their own friendships

-- Users can view friendships they're part of
CREATE POLICY "Users can view their friendships"
  ON friendships FOR SELECT
  USING (
    auth.uid() = requester_id OR 
    auth.uid() = addressee_id
  );

-- Users can send friend requests
CREATE POLICY "Users can send friend requests"
  ON friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

-- Users can update friendships they're part of (accept/block)
CREATE POLICY "Users can update their friendships"
  ON friendships FOR UPDATE
  USING (
    auth.uid() = requester_id OR 
    auth.uid() = addressee_id
  );

-- Users can delete friendships they're part of
CREATE POLICY "Users can remove friendships"
  ON friendships FOR DELETE
  USING (
    auth.uid() = requester_id OR 
    auth.uid() = addressee_id
  );
