# XChess Database Schema Documentation

## Overview

The XChess database is built on Supabase (PostgreSQL) with Row Level Security (RLS) policies for secure data access. The schema supports:

- User authentication and profiles
- Rating system (ELO-based, per time control)
- Game records and move history
- Real-time matchmaking
- Puzzle training system
- User reports and moderation

## Entity Relationship Diagram

```
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│  auth.users  │       │   profiles   │       │   ratings    │
│  (Supabase)  │──────▶│              │◀──────│              │
└──────────────┘       └──────────────┘       └──────────────┘
                              │                      │
                              │                      │
        ┌─────────────────────┼──────────────────────┤
        │                     │                      │
        ▼                     ▼                      ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│    games     │◀─────▶│  game_moves  │       │  matchmaking │
│              │       │              │       │    _queue    │
└──────────────┘       └──────────────┘       └──────────────┘
        │
        │
        ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│   reports    │       │   puzzles    │◀──────│puzzle_attempts│
│              │       │              │       │              │
└──────────────┘       └──────────────┘       └──────────────┘
```

## Tables

### 1. profiles

User profiles linked to Supabase Auth.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (references auth.users) |
| email | TEXT | User's email |
| username | TEXT | Display name |
| display_name | TEXT | Optional full name |
| avatar_url | TEXT | Profile picture URL |
| bio | TEXT | User biography |
| country | TEXT | Country code |
| games_played | INTEGER | Total games played |
| games_won | INTEGER | Total wins |
| games_lost | INTEGER | Total losses |
| games_drawn | INTEGER | Total draws |
| is_online | BOOLEAN | Online status |
| last_seen | TIMESTAMPTZ | Last activity |
| is_banned | BOOLEAN | Ban status |
| ban_reason | TEXT | Reason for ban |
| created_at | TIMESTAMPTZ | Account creation |
| updated_at | TIMESTAMPTZ | Last update |

**RLS Policies:**
- SELECT: Public (anyone can view profiles)
- INSERT: Own profile only (auth.uid() = id)
- UPDATE: Own profile only
- DELETE: Denied (cascade from auth.users)

### 2. ratings

Separate ELO rating for each game category.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Reference to profiles |
| category | rating_category | bullet/blitz/rapid/classical/puzzle |
| rating | INTEGER | Current ELO rating (default 1200) |
| rating_deviation | INTEGER | Glicko-2 deviation |
| volatility | DECIMAL | Glicko-2 volatility |
| games_played | INTEGER | Games in this category |
| games_won | INTEGER | Wins in this category |
| highest_rating | INTEGER | Peak rating |
| lowest_rating | INTEGER | Lowest rating |
| created_at | TIMESTAMPTZ | Creation time |
| updated_at | TIMESTAMPTZ | Last update |

**Categories (Enum):**
- `bullet` - Under 3 minutes
- `blitz` - 3-10 minutes
- `rapid` - 10-30 minutes
- `classical` - Over 30 minutes
- `puzzle` - Puzzle rating

**RLS Policies:**
- SELECT: Public (for leaderboards)
- INSERT/UPDATE: Own ratings only

### 3. games

Game records storing all game information.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| white_player_id | UUID | White player |
| black_player_id | UUID | Black player |
| mode | game_mode | standard/archer/puzzle/analysis |
| time_control_initial | INTEGER | Starting time (seconds) |
| time_control_increment | INTEGER | Increment per move |
| rated | BOOLEAN | Is rated game |
| status | game_status | waiting/active/completed/abandoned/aborted |
| current_fen | TEXT | Current position |
| move_number | INTEGER | Current move number |
| is_white_turn | BOOLEAN | White to move |
| white_time_remaining | INTEGER | White's clock (ms) |
| black_time_remaining | INTEGER | Black's clock (ms) |
| last_move_at | TIMESTAMPTZ | Time of last move |
| result | game_result | white_wins/black_wins/draw/aborted |
| termination | termination_reason | How game ended |
| winner_id | UUID | Winner's profile |
| white_rating_before | INTEGER | White's rating before |
| black_rating_before | INTEGER | Black's rating before |
| white_rating_change | INTEGER | White's rating change |
| black_rating_change | INTEGER | Black's rating change |
| pgn | TEXT | Full game PGN |
| archer_state | JSONB | XChess archer positions |
| created_at | TIMESTAMPTZ | Game creation |
| started_at | TIMESTAMPTZ | First move time |
| completed_at | TIMESTAMPTZ | Game end time |
| updated_at | TIMESTAMPTZ | Last update |

**RLS Policies:**
- SELECT: Public (for spectating)
- INSERT: Authenticated users
- UPDATE: Participants only
- DELETE: Denied

### 4. game_moves

Individual moves for each game.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| game_id | UUID | Reference to games |
| move_number | INTEGER | Move number |
| is_white | BOOLEAN | White's move |
| san | TEXT | Standard Algebraic Notation |
| uci | TEXT | UCI format |
| fen_before | TEXT | Position before move |
| fen_after | TEXT | Position after move |
| is_capture | BOOLEAN | Capture move |
| is_check | BOOLEAN | Gives check |
| is_checkmate | BOOLEAN | Checkmate |
| is_castle | BOOLEAN | Castling move |
| promotion_piece | TEXT | Promotion piece (q/r/b/n) |
| is_archer_shot | BOOLEAN | XChess archer action |
| archer_target_square | TEXT | Archer target |
| time_spent | INTEGER | Time for move (ms) |
| time_remaining | INTEGER | Clock after move (ms) |
| created_at | TIMESTAMPTZ | Move timestamp |

**RLS Policies:**
- SELECT: Public
- INSERT: Current player only (validates turn)
- UPDATE/DELETE: Denied (immutable)

### 5. matchmaking_queue

Players waiting for opponents.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Player in queue |
| mode | game_mode | Desired game mode |
| time_control_initial | INTEGER | Desired time |
| time_control_increment | INTEGER | Desired increment |
| rated | BOOLEAN | Rated game wanted |
| rating | INTEGER | Player's rating |
| rating_range | INTEGER | Acceptable opponent range |
| is_active | BOOLEAN | Still searching |
| joined_at | TIMESTAMPTZ | Queue join time |
| expires_at | TIMESTAMPTZ | Auto-remove time |

**RLS Policies:**
- SELECT: Authenticated users
- INSERT/UPDATE/DELETE: Own entry only

### 6. puzzles

Chess puzzles for training.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| fen | TEXT | Starting position |
| solution | TEXT[] | Solution moves (UCI) |
| difficulty | puzzle_difficulty | easy/medium/hard/extreme |
| rating | INTEGER | Puzzle rating |
| themes | TEXT[] | Tactical themes |
| times_played | INTEGER | Total attempts |
| times_solved | INTEGER | Successful solves |
| has_archer | BOOLEAN | XChess archer puzzle |
| archer_state | JSONB | Archer positions |
| source | TEXT | Attribution |
| source_id | TEXT | Original ID |
| created_at | TIMESTAMPTZ | Creation time |
| updated_at | TIMESTAMPTZ | Last update |

**RLS Policies:**
- SELECT: Public
- INSERT/UPDATE: Denied (admin only)

### 7. puzzle_attempts

User puzzle attempt history.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Player |
| puzzle_id | UUID | Puzzle attempted |
| solved | BOOLEAN | Was puzzle solved |
| attempts | INTEGER | Number of tries |
| time_spent | INTEGER | Time taken (ms) |
| moves_played | TEXT[] | User's moves |
| rating_before | INTEGER | Rating before |
| rating_after | INTEGER | Rating after |
| created_at | TIMESTAMPTZ | Attempt time |

**RLS Policies:**
- SELECT/INSERT: Own attempts only
- UPDATE: Denied

### 8. reports

User reports for moderation.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| reporter_id | UUID | Who reported |
| reported_user_id | UUID | Who was reported |
| report_type | report_type | Type of report |
| description | TEXT | Report details |
| game_id | UUID | Related game |
| status | report_status | pending/investigating/resolved/dismissed |
| moderator_id | UUID | Handling moderator |
| moderator_notes | TEXT | Internal notes |
| resolution | TEXT | Resolution details |
| created_at | TIMESTAMPTZ | Report time |
| updated_at | TIMESTAMPTZ | Last update |
| resolved_at | TIMESTAMPTZ | Resolution time |

**Report Types:**
- cheating
- harassment
- inappropriate_username
- inappropriate_avatar
- stalling
- sandbagging
- other

**RLS Policies:**
- SELECT: Own reports only
- INSERT: Authenticated (can't report self)
- UPDATE/DELETE: Denied

### 9. friendships

Friend relationships.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| requester_id | UUID | Friend request sender |
| addressee_id | UUID | Friend request receiver |
| status | friendship_status | pending/accepted/blocked |
| created_at | TIMESTAMPTZ | Request time |
| updated_at | TIMESTAMPTZ | Last update |

**RLS Policies:**
- All operations: Participants only

## Functions

### handle_new_user()
Trigger function that creates profile and default ratings when a new user signs up.

### update_updated_at()
Trigger function that updates the `updated_at` timestamp on row modifications.

### update_profile_stats_on_game_complete()
Trigger function that updates player statistics when a game completes.

### update_puzzle_stats_on_attempt()
Trigger function that updates puzzle statistics on each attempt.

### get_user_rating(user_id, category)
Returns a user's rating for a specific category.

### find_match(user_id, mode, time_initial, time_increment, rating, rating_range)
Finds a suitable opponent in the matchmaking queue.

### get_leaderboard(category, limit)
Returns the top players for a rating category.

## Enums

### rating_category
`bullet`, `blitz`, `rapid`, `classical`, `puzzle`

### game_status
`waiting`, `active`, `completed`, `abandoned`, `aborted`

### game_result
`white_wins`, `black_wins`, `draw`, `aborted`

### game_mode
`standard`, `archer`, `puzzle`, `analysis`

### termination_reason
`checkmate`, `resignation`, `timeout`, `stalemate`, `insufficient_material`, `threefold_repetition`, `fifty_moves`, `agreement`, `abandonment`, `abort`

### puzzle_difficulty
`easy`, `medium`, `hard`, `extreme`

### report_type
`cheating`, `harassment`, `inappropriate_username`, `inappropriate_avatar`, `stalling`, `sandbagging`, `other`

### report_status
`pending`, `investigating`, `resolved`, `dismissed`

### friendship_status
`pending`, `accepted`, `blocked`

## Migration Order

1. `001_initial_schema.sql` - Tables and indexes
2. `002_rls_policies.sql` - Row Level Security
3. `003_functions_triggers.sql` - Functions and triggers
4. `004_sample_puzzles.sql` - Sample data

## Running Migrations

1. Go to Supabase Dashboard
2. Navigate to SQL Editor
3. Run each migration file in order
4. Verify with: `SELECT * FROM profiles LIMIT 1;`
