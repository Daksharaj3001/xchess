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

### 1. Create Profiles Table

Run this SQL in Supabase SQL Editor:

```sql
-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  username TEXT NOT NULL,
  avatar_url TEXT,
  rating INTEGER DEFAULT 1200,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

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

```sql
-- Games
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  white_player_id UUID REFERENCES profiles(id),
  black_player_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'active',
  result TEXT,
  time_control TEXT,
  pgn TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Moves
CREATE TABLE moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  move_number INTEGER,
  notation TEXT,
  fen TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Puzzles
CREATE TABLE puzzles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fen TEXT NOT NULL,
  solution TEXT[] NOT NULL,
  difficulty TEXT,
  rating INTEGER,
  themes TEXT[]
);
```
