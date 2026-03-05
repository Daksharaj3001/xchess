# XChess Platform

A modern chess platform with unique archer mechanics, built with Next.js, Supabase, and Firebase.

## Architecture Overview

```
xchess/
├── app/                          # Next.js App Router
│   ├── api/[[...path]]/          # API routes
│   ├── auth/                     # Auth pages
│   │   ├── login/
│   │   ├── signup/
│   │   ├── callback/             # OAuth callback
│   │   ├── reset-password/
│   │   ├── forgot-password/
│   │   └── error/
│   ├── layout.js                 # Root layout with providers
│   └── page.js                   # Home page
├── components/
│   ├── auth/                     # Auth components
│   │   ├── ProtectedRoute.js
│   │   └── UserMenu.js
│   └── ui/                       # shadcn/ui components
├── contexts/
│   └── AuthContext.js            # Auth state management
├── lib/
│   ├── api/                      # Reusable API layer
│   │   └── index.js
│   ├── firebase/                 # Firebase (Analytics only)
│   │   ├── client.js
│   │   └── analytics.js
│   ├── supabase/                 # Supabase (Auth, DB, Realtime)
│   │   ├── client.js             # Browser client
│   │   ├── server.js             # Server client
│   │   └── middleware.js         # Session management
│   └── utils.js
├── middleware.js                 # Route protection
├── .env.example                  # Environment template
└── README.md
```

## Service Responsibilities

### Supabase Handles:
- **Authentication**: Email/password, Google OAuth
- **Database**: PostgreSQL for all game data
  - User profiles
  - Games & moves
  - Matchmaking queue
  - Ratings & leaderboards
  - Puzzles
- **Realtime**: Live game updates via subscriptions

### Firebase Handles:
- **Analytics**: Event tracking only
  - Page views
  - Game lifecycle events
  - Move tracking (counts only)
  - Puzzle engagement

## Environment Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Fill in your credentials:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
```

## Supabase Setup

### 1. Run Database Migrations

Run the SQL migration files in order in Supabase SQL Editor:

```bash
# Migration files located in /supabase/migrations/
1. 001_initial_schema.sql    # Tables and indexes
2. 002_rls_policies.sql      # Row Level Security
3. 003_functions_triggers.sql # Functions and auto-triggers
4. 004_sample_puzzles.sql    # Sample puzzle data (optional)
```

### Database Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User accounts with stats |
| `ratings` | ELO ratings per category (bullet/blitz/rapid/classical/puzzle) |
| `games` | Complete game records with state |
| `game_moves` | Individual move history |
| `matchmaking_queue` | Players seeking matches |
| `puzzles` | Training puzzles |
| `puzzle_attempts` | User puzzle history |
| `reports` | User reports for moderation |
| `friendships` | Friend relationships |

### Key Features

- **Auto Profile Creation**: Profile created automatically on signup via trigger
- **Default Ratings**: All rating categories initialized to 1200
- **Stats Tracking**: Game/puzzle stats auto-updated via triggers
- **Turn Validation**: RLS ensures only current player can submit moves

See `/supabase/schema.md` for complete documentation.

### 2. Enable Google OAuth

1. Go to Supabase Dashboard > Authentication > Providers
2. Enable Google provider
3. Add your Google OAuth credentials:
   - Client ID
   - Client Secret

4. In Google Cloud Console, add redirect URIs:
   ```
   https://your-project.supabase.co/auth/v1/callback
   ```

### 3. Configure Redirect URLs

In Supabase Dashboard > Authentication > URL Configuration:

- Site URL: `https://your-app.vercel.app`
- Redirect URLs:
  - `https://your-app.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback` (for development)

## Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Google Analytics
3. Register a web app
4. Copy the configuration to your `.env` file

## Authentication Flow

### Email/Password
1. User signs up with email/password
2. Confirmation email sent (if enabled)
3. On first login, profile row created in `profiles` table
4. Session managed via cookies

### Google OAuth
1. User clicks "Continue with Google"
2. Redirected to Google for auth
3. Callback to `/auth/callback`
4. Session established, profile created
5. Redirected to app

## Analytics Events

| Event | Description | Parameters |
|-------|-------------|------------|
| `page_view` | Screen viewed | `page_title`, `page_location` |
| `board_loaded` | Board rendered | `mode` |
| `game_started` | New game begins | `mode`, `time_control` |
| `game_finished` | Game ends | `result`, `mode`, `move_count` |
| `move_attempted` | Move tried | - |
| `move_committed` | Move confirmed | - |
| `illegal_move_attempt` | Invalid move | `reason` |
| `archer_fire_mode_opened` | Archer UI opened | - |
| `archer_fire_confirmed` | Shot fired | `hit` |
| `puzzle_start` | Puzzle begun | `difficulty` |
| `puzzle_complete` | Puzzle finished | `success`, `attempts`, `time_spent_seconds` |

## API Layer Usage

```javascript
import { api } from '@/lib/api'

// Games
const game = await api.games.create({ timeControl: 'rapid' })
const myGames = await api.games.getMyGames({ limit: 10 })

// Matchmaking
await api.matchmaking.joinQueue({ time_control: 'blitz' })

// Puzzles
const puzzle = await api.puzzles.getRandom('medium')
```

## Protected Routes

Routes requiring authentication:
- `/profile`
- `/settings`
- `/play`
- `/games`

Use the `ProtectedRoute` component for client-side protection:

```jsx
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export default function PlayPage() {
  return (
    <ProtectedRoute>
      <GameBoard />
    </ProtectedRoute>
  )
}
```

## Development

```bash
# Install dependencies
yarn install

# Run development server
yarn dev

# Build for production
yarn build
```

## Deployment

### Vercel

1. Connect your GitHub repository
2. Add environment variables in Vercel dashboard
3. Deploy

### Environment Variables for Vercel

Add all variables from `.env.example` to your Vercel project settings.

## Security Notes

- **Anon Key**: Safe to expose in browser (Row Level Security enforced)
- **Service Role Key**: NEVER expose to client (server-side only)
- All database operations go through RLS policies
- OAuth uses secure PKCE flow

## Database Schema (Future)

See `/supabase/schema.md` for complete database documentation.

### Quick Reference

**Game record stores:**
- Players (white_player_id, black_player_id)
- Game mode (standard, archer, puzzle, analysis)
- Current state (FEN, move number, time remaining)
- Game result (winner, termination reason, rating changes)

**Row Level Security ensures:**
- Users can only edit their own profile
- Only game participants can write moves
- Only current player's turn can submit moves
- Leaderboards are public read
- Reports are private to reporter
