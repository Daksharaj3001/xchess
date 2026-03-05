# XChess - Product Requirements Document

## Original Problem Statement
Build a full-stack web application called "XChess" - a chess platform with unique Archer mechanics. The app uses Next.js, TypeScript, Tailwind CSS, Supabase (database/auth/realtime), and Firebase (analytics).

## Key Features
1. **Architecture**: Next.js App Router, Supabase/Firebase initialization, reusable API layer
2. **Authentication**: Email/password (with verification/reset), Google OAuth, auto profile creation
3. **Analytics**: Firebase custom event tracking for gameplay events
4. **Database Schema**: Supabase tables (users, profiles, games, game_moves, matchmaking_queue, ratings, puzzles, reports) with RLS
5. **Rules Engine**: Server-authoritative game logic, two game modes, Archer piece with Fire ability
6. **Replay System**: Game state serialization, reconstruction from move history, replay viewer
7. **Board UI**: Interactive 8x8 and 10x10 boards, drag-and-drop, Archer targeting system

## Tech Stack
- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS, Shadcn/UI
- **Backend**: Next.js API Routes, Supabase (PostgreSQL, Auth, Realtime)
- **Analytics**: Firebase Analytics
- **Architecture**: Server-authoritative game logic, modular engine

## What's Been Implemented

### Completed (as of March 2026)
- [x] **Architecture Blueprint (Prompt 0)**: Project structure, Supabase/Firebase init, full auth flow
- [x] **Database Schema & RLS (Prompt 1)**: All tables and security policies via SQL migrations
- [x] **Rules Engine (Prompt 2)**: Complete game logic with 34 automated tests
- [x] **Replay System (Prompt 3)**: State serialization, reconstruction, 29 automated tests
- [x] **Board UI (Prompt 4)**: Interactive board with:
  - 8x8 Classical and 10x10 Artillery modes
  - Piece selection (tap-to-select), legal move indicators
  - Drag and drop support
  - Archer Move vs Fire mode with targeting UI
  - Promotion dialog, capture tracking
  - Check/checkmate/stalemate indicators
  - Move history panel, captured pieces display
  - Board flip, new game, coordinate labels
  - Hot-seat local play mode
- [x] **API Routes**: Game creation, move submission, resign endpoints
- [x] **Critical Bug Fixes**: tsconfig.json path aliases, Tailwind content config for .tsx files

### Key Files
- `/lib/xchess/` - Rules engine, replay system, analytics, types
- `/components/game/` - InteractiveBoard, ChessBoard, MoveHistory, CapturedPieces, GameContainer
- `/app/play/` - Play page (hot-seat mode) and mode selection
- `/app/api/games/` - API route handlers
- `/supabase/migrations/` - Database schema SQL
- `/tests/` - Engine and replay test suites

## Prioritized Backlog

### P0 (Critical)
- None remaining

### P1 (High)
- Online multiplayer with Supabase Realtime (GameContainer scaffolded)
- Matchmaking system
- Game replay viewer page

### P2 (Medium)
- Puzzles page
- Leaderboard page
- User profile page
- Rating system

### P3 (Low)
- AI opponent
- Time controls
- Game analysis
- Mobile optimization

## Environment Notes
- Project uses Supabase/PostgreSQL (not MongoDB)
- All credentials in `/app/.env`
- Preview URL: https://xchess-board.preview.emergentagent.com
- 63 backend tests passing (engine + replay)
