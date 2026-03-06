# XChess - Product Requirements Document

## Original Problem Statement
Build a full-stack web application called "XChess" — a chess platform with unique Archer mechanics. Uses Next.js, TypeScript, Tailwind CSS, Supabase (auth/realtime), Firebase (analytics), and MongoDB (game persistence).

## What's Been Implemented

### Prompt 0 — Architecture & Auth
- [x] Project structure, Supabase/Firebase initialization, full auth flow

### Prompt 1 — Database Schema & RLS
- [x] All Supabase tables and RLS policies via SQL migrations

### Prompt 2 — Rules Engine
- [x] Server-authoritative game logic, 34 automated tests

### Prompt 3 — Replay System
- [x] State serialization, reconstruction, 29 automated tests

### Prompt 4 — Board UI
- [x] Interactive 8x8 and 10x10 boards, piece interaction, Archer targeting, hot-seat local play

### Prompt 5 — Realtime Multiplayer
- [x] Full multiplayer: game creation, joining, server-validated moves, Supabase Realtime broadcast, reconnection, resign

### Prompt 6 — Timers + Chess.com Red Theme (March 2026)
- [x] **Red Theme Board**: Light #f3d9d9 / Dark #b94a4a, Selected #ff4d4d, Legal moves #ff6b6b, Check #ff0000
- [x] **SVG Chess Pieces**: Inline SVG for all pieces (King, Queen, Rook, Bishop, Knight, Pawn, Archer)
- [x] **Chess.com-Style Layout**: Dark zinc background, board left/center, side panel (timers, move history, resign), embedded coordinates
- [x] **Timer System**: Bullet (1min, 2+1), Blitz (3min, 5min, 5+3), Rapid (10min, 15+10), Classical (30min)
  - Server-synced time deduction + increment on each move
  - Client-side countdown for smooth display
  - Active clock highlighted in red, inactive in dark
  - Low-time warning when <10s (pulse animation)
  - Timeout = opponent wins
- [x] **Time Control Picker**: Chess.com-style category selector in game creation
- [x] **Firebase Analytics**: timer_started, timer_low_warning, timeout_win, move_history_opened, board_theme_loaded
- [x] **Mobile Responsive**: Board centered, side panel collapses below, timers always visible

### Prompt 10 — Bot Players (March 2026)
- [x] **Bot Engine** (`/lib/xchess/bot.ts`): Three difficulty levels
  - Beginner: Random moves with slight capture preference (30%)
  - Casual: Greedy one-ply evaluation with top-3 weighted random
  - Challenger: Minimax with alpha-beta pruning (depth 2-3), piece-square tables
- [x] **Archer Fire Support**: Bot expands archer fire combinations, evaluates single/double targets
- [x] **Bot Setup UI**: Purple-themed setup card on mode selection page with difficulty picker, color picker
- [x] **Bot Game Integration**: Auto-move with per-difficulty delay (400ms/600ms/900ms), thinking indicator, bot names
- [x] **Game Over Flow**: Bot-aware result messages, rematch functionality
- [x] **All modes supported**: Classical (8x8) and Artillery (10x10) both work with bot

### Key Files
- `/lib/xchess/bot.ts` — Bot engine with 3 difficulty levels
- `/components/game/ChessPieceSVG.tsx` — SVG piece components
- `/components/game/ChessTimer.tsx` — Timer display component  
- `/components/game/InteractiveBoard.tsx` — Red theme board with SVG pieces
- `/app/play/page.tsx` — Local/Bot play (chess.com layout)
- `/app/game/[gameId]/page.tsx` — Online play (chess.com layout + timers)
- `/app/play/select/page.tsx` — Mode selection with time controls and bot setup
- `/app/api/multiplayer/games/` — API routes with timer logic
- `/lib/mongodb.ts` — MongoDB singleton for multiplayer persistence
- `/lib/xchess/` — Rules engine, types, analytics

## Tech Stack
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS, Shadcn/UI
- **Backend**: Next.js API Routes, MongoDB (multiplayer persistence), Supabase (Auth, Realtime)
- **Analytics**: Firebase Analytics
- **Tests**: 63 backend tests passing

## Pending Issues
- **Google OAuth**: Not a code issue. User needs to enable Google provider in Supabase Dashboard (Authentication → Providers → Google). Graceful error handling already in place.

## Prioritized Backlog

### P1 (High)
- Matchmaking queue (random opponent pairing)
- Game replay viewer page
- Draw offer system

### P2 (Medium)
- Puzzles page
- Leaderboard page
- User profile page
- Rating system (ELO)

### P3 (Low)
- Game analysis
- Spectator mode
- Sound effects
