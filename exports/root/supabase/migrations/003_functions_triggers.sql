-- ============================================================================
-- XChess Functions and Triggers
-- ============================================================================
-- Run this AFTER 001 and 002
-- ============================================================================

-- ============================================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Create default ratings for all categories
  INSERT INTO public.ratings (user_id, category, rating)
  VALUES 
    (NEW.id, 'bullet', 1200),
    (NEW.id, 'blitz', 1200),
    (NEW.id, 'rapid', 1200),
    (NEW.id, 'classical', 1200),
    (NEW.id, 'puzzle', 1200);
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- UPDATE TIMESTAMPS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_ratings_updated_at ON ratings;
CREATE TRIGGER update_ratings_updated_at
  BEFORE UPDATE ON ratings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_games_updated_at ON games;
CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_puzzles_updated_at ON puzzles;
CREATE TRIGGER update_puzzles_updated_at
  BEFORE UPDATE ON puzzles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_reports_updated_at ON reports;
CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_friendships_updated_at ON friendships;
CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON friendships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- UPDATE PROFILE STATS AFTER GAME
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_profile_stats_on_game_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run when game completes
  IF NEW.status = 'completed' AND OLD.status = 'active' THEN
    -- Update white player stats
    IF NEW.white_player_id IS NOT NULL THEN
      UPDATE profiles 
      SET 
        games_played = games_played + 1,
        games_won = games_won + CASE WHEN NEW.result = 'white_wins' THEN 1 ELSE 0 END,
        games_lost = games_lost + CASE WHEN NEW.result = 'black_wins' THEN 1 ELSE 0 END,
        games_drawn = games_drawn + CASE WHEN NEW.result = 'draw' THEN 1 ELSE 0 END
      WHERE id = NEW.white_player_id;
    END IF;
    
    -- Update black player stats
    IF NEW.black_player_id IS NOT NULL THEN
      UPDATE profiles 
      SET 
        games_played = games_played + 1,
        games_won = games_won + CASE WHEN NEW.result = 'black_wins' THEN 1 ELSE 0 END,
        games_lost = games_lost + CASE WHEN NEW.result = 'white_wins' THEN 1 ELSE 0 END,
        games_drawn = games_drawn + CASE WHEN NEW.result = 'draw' THEN 1 ELSE 0 END
      WHERE id = NEW.black_player_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_game_complete ON games;
CREATE TRIGGER on_game_complete
  AFTER UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_profile_stats_on_game_complete();

-- ============================================================================
-- UPDATE PUZZLE STATS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_puzzle_stats_on_attempt()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE puzzles
  SET 
    times_played = times_played + 1,
    times_solved = times_solved + CASE WHEN NEW.solved THEN 1 ELSE 0 END
  WHERE id = NEW.puzzle_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_puzzle_attempt ON puzzle_attempts;
CREATE TRIGGER on_puzzle_attempt
  AFTER INSERT ON puzzle_attempts
  FOR EACH ROW EXECUTE FUNCTION update_puzzle_stats_on_attempt();

-- ============================================================================
-- CLEANUP EXPIRED QUEUE ENTRIES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_queue()
RETURNS void AS $$
BEGIN
  DELETE FROM matchmaking_queue
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- GET USER RATING FOR CATEGORY
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_rating(
  p_user_id UUID,
  p_category rating_category
)
RETURNS INTEGER AS $$
DECLARE
  v_rating INTEGER;
BEGIN
  SELECT rating INTO v_rating
  FROM ratings
  WHERE user_id = p_user_id AND category = p_category;
  
  RETURN COALESCE(v_rating, 1200);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- FIND MATCH IN QUEUE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.find_match(
  p_user_id UUID,
  p_mode game_mode,
  p_time_initial INTEGER,
  p_time_increment INTEGER,
  p_rating INTEGER,
  p_rating_range INTEGER DEFAULT 200
)
RETURNS UUID AS $$
DECLARE
  v_opponent_id UUID;
BEGIN
  -- Find a suitable opponent
  SELECT user_id INTO v_opponent_id
  FROM matchmaking_queue
  WHERE 
    user_id != p_user_id
    AND mode = p_mode
    AND time_control_initial = p_time_initial
    AND time_control_increment = p_time_increment
    AND is_active = true
    AND ABS(rating - p_rating) <= GREATEST(p_rating_range, rating_range)
  ORDER BY joined_at ASC
  LIMIT 1;
  
  RETURN v_opponent_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GET LEADERBOARD
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_leaderboard(
  p_category rating_category,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  rating INTEGER,
  games_played INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROW_NUMBER() OVER (ORDER BY r.rating DESC) as rank,
    r.user_id,
    p.username,
    p.avatar_url,
    r.rating,
    r.games_played
  FROM ratings r
  JOIN profiles p ON p.id = r.user_id
  WHERE r.category = p_category
  ORDER BY r.rating DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
