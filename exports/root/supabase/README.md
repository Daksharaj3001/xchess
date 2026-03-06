# XChess Supabase Setup Guide

## Quick Start

### 1. Run Migrations

Execute the SQL files in order in your Supabase SQL Editor:

```bash
# Order matters!
1. migrations/001_initial_schema.sql
2. migrations/002_rls_policies.sql
3. migrations/003_functions_triggers.sql
4. migrations/004_sample_puzzles.sql  # Optional: sample data
```

### 2. Verify Setup

Run these queries to verify:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Check triggers exist
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';
```

### 3. Enable Google OAuth

1. Go to **Authentication > Providers**
2. Enable **Google**
3. Add your Google OAuth credentials
4. Add redirect URLs:
   - `https://your-project.supabase.co/auth/v1/callback`

### 4. Configure Auth Settings

Go to **Authentication > URL Configuration**:

- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**:
  - `https://your-app.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback`

## Table Summary

| Table | Purpose | RLS |
|-------|---------|-----|
| profiles | User accounts | Public read, own write |
| ratings | ELO ratings per category | Public read, own write |
| games | Game records | Public read, participant write |
| game_moves | Move history | Public read, turn-based write |
| matchmaking_queue | Match finding | Auth read, own write |
| puzzles | Training puzzles | Public read, admin write |
| puzzle_attempts | Puzzle history | Own read/write |
| reports | Moderation reports | Own read, auth write |
| friendships | Friend system | Participant access |

## Automatic Features

### Profile Auto-Creation
When a user signs up, their profile is automatically created with:
- Username from Google or email
- Avatar from Google (if OAuth)
- Default ratings (1200) for all categories

### Stats Auto-Update
- Game completion updates player stats
- Puzzle attempts update puzzle stats
- Timestamps auto-update on changes

## Common Queries

### Get Leaderboard
```sql
SELECT * FROM get_leaderboard('blitz', 100);
```

### Get User Rating
```sql
SELECT get_user_rating('user-uuid-here', 'rapid');
```

### Find Match
```sql
SELECT find_match(
  'user-uuid',
  'standard',
  600,  -- 10 min
  0,    -- no increment
  1200, -- rating
  200   -- rating range
);
```

### Get User Games
```sql
SELECT g.*, 
  wp.username as white_username,
  bp.username as black_username
FROM games g
LEFT JOIN profiles wp ON g.white_player_id = wp.id
LEFT JOIN profiles bp ON g.black_player_id = bp.id
WHERE g.white_player_id = 'user-uuid' 
   OR g.black_player_id = 'user-uuid'
ORDER BY g.created_at DESC
LIMIT 10;
```

## Realtime Subscriptions

Enable realtime for live games:

```sql
-- In Supabase Dashboard > Database > Replication
-- Enable for: games, game_moves, matchmaking_queue
```

Client-side subscription:

```javascript
const channel = supabase
  .channel('game-updates')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'games', filter: `id=eq.${gameId}` },
    (payload) => console.log('Game update:', payload)
  )
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'game_moves', filter: `game_id=eq.${gameId}` },
    (payload) => console.log('New move:', payload)
  )
  .subscribe()
```

## Troubleshooting

### "Permission denied" errors
- Check RLS policies are correct
- Verify user is authenticated
- Check policy conditions match your use case

### Profile not created on signup
- Verify trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`
- Check function exists: `SELECT * FROM pg_proc WHERE proname = 'handle_new_user';`

### Puzzle insert fails
- Puzzles table has restricted insert policy
- Temporarily disable RLS or use service_role key:
  ```sql
  ALTER TABLE puzzles DISABLE ROW LEVEL SECURITY;
  -- Insert puzzles
  ALTER TABLE puzzles ENABLE ROW LEVEL SECURITY;
  ```
