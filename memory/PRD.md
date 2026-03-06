# XChess - Product Requirements Document

## Original Problem Statement
Build a full-stack web application called "XChess" — a chess platform with unique Archer mechanics. Uses Next.js, TypeScript, Tailwind CSS, Supabase (auth/realtime), Firebase (analytics), and MongoDB (game persistence).

## What's Been Implemented

### Prompt 0 — Architecture & Auth
- [x] Project structure, Supabase/Firebase initialization, full auth flow (email/password, Google OAuth)

### Prompt 1 — Database Schema & RLS
- [x] All Supabase tables and RLS policies via SQL migration files

### Prompt 2 — Rules Engine
- [x] Server-authoritative game logic, 34 automated tests

### Prompt 3 — Replay System
- [x] State serialization, reconstruction, 29 automated tests

### Prompt 4 — Board UI
- [x] Interactive 8x8 and 10x10 boards, piece selection, drag-and-drop, Archer targeting, promotion, check/checkmate indicators, hot-seat local play

### Prompt 5 — Realtime Multiplayer (March 2026)
- [x] **Backend API routes**: POST /api/multiplayer/games (create), GET /api/multiplayer/games/[gameId] (state), POST .../join, POST .../moves, POST .../resign
- [x] **MongoDB persistence**: Game state stored and updated atomically with move validation
- [x] **Supabase Realtime Broadcast**: Instant move delivery between players via channel `game-{gameId}`
- [x] **Reconnection logic**: On reconnect, client fetches latest state from API; desync detected via move number mismatch (409 response triggers re-fetch)
- [x] **Chess.com-style game creation**: Name input, color choice (White/Black/Random), shareable challenge link
- [x] **Waiting room**: Spinner, share link, polling for opponent join
- [x] **Join screen**: Opponent sees invite details, enters name, clicks Play
- [x] **Active game UI**: Player/opponent info bars, "Your turn"/"Thinking..." badges, Live connection indicator, resign flow with confirmation
- [x] **Game over**: Result banner, "New Game" button

### Key Files
- `/lib/mongodb.ts` — MongoDB singleton
- `/app/api/multiplayer/games/` — All multiplayer API routes
- `/app/game/[gameId]/page.tsx` — Online game page (waiting room → active → completed)
- `/app/play/select/page.tsx` — Mode selection with Play Online / Play Local
- `/components/game/InteractiveBoard.tsx` — Interactive chess board
- `/lib/xchess/` — Rules engine, types, analytics

## Tech Stack
- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS, Shadcn/UI
- **Backend**: Next.js API Routes, MongoDB (game persistence), Supabase (Auth, Realtime Broadcast)
- **Analytics**: Firebase Analytics
- **Tests**: 63 backend tests passing (engine + replay)

## Prioritized Backlog

### P1 (High)
- Matchmaking queue (random opponent pairing)
- Game replay viewer page
- Time controls

### P2 (Medium)
- Puzzles page
- Leaderboard page
- User profile page
- Rating system (ELO)

### P3 (Low)
- AI opponent
- Game analysis
- Spectator mode
- Mobile optimization
