-- ============================================================================
-- Multiplayer Games Table
-- ============================================================================
-- Simple JSONB storage for live multiplayer game state.
-- Run this in Supabase SQL Editor: Dashboard > SQL Editor > New Query
-- ============================================================================

CREATE TABLE IF NOT EXISTS multiplayer_games (
  game_id TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow public read/write (games are identified by unique IDs)
ALTER TABLE multiplayer_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON multiplayer_games
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON multiplayer_games
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update" ON multiplayer_games
  FOR UPDATE USING (true);
