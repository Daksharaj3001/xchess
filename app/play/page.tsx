'use client';

/**
 * Local Play Page — supports hot-seat and vs-bot modes
 */

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import InteractiveBoard from '@/components/game/InteractiveBoard';
import MoveHistory from '@/components/game/MoveHistory';
import ChessTimer from '@/components/game/ChessTimer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createGame, getLegalMoves, applyMove, getBotMove } from '@/lib/xchess';
import type { GameState, LegalMove, Position, PieceType, GameMode, PieceColor } from '@/lib/xchess/types';
import type { BotDifficulty } from '@/lib/xchess/bot';
import { ArrowLeft, RotateCcw, Swords, Target, Flag, RefreshCw, Bot, Loader2, Crown } from 'lucide-react';

const TIME_CONTROLS: Record<string, { base: number; increment: number; label: string }> = {
  'bullet_1': { base: 60_000, increment: 0, label: '1 min' },
  'bullet_2': { base: 120_000, increment: 1000, label: '2+1' },
  'blitz_3': { base: 180_000, increment: 0, label: '3 min' },
  'blitz_5': { base: 300_000, increment: 0, label: '5 min' },
  'blitz_5_3': { base: 300_000, increment: 3000, label: '5+3' },
  'rapid_10': { base: 600_000, increment: 0, label: '10 min' },
  'rapid_15': { base: 900_000, increment: 10_000, label: '15+10' },
  'classical': { base: 1800_000, increment: 0, label: '30 min' },
  'none': { base: 0, increment: 0, label: 'No timer' },
};

const BOT_NAMES: Record<BotDifficulty, string> = {
  beginner: 'Stockfish Jr.',
  casual: 'XBot Casual',
  challenger: 'XBot Challenger',
};
const BOT_DELAY: Record<BotDifficulty, number> = { beginner: 400, casual: 600, challenger: 900 };

// Inline captured row
function CapturedRow({ pieces, color }: { pieces: { type: PieceType; color: string }[]; color: string }) {
  const S: Record<string, string> = { queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟', archer: '🏹', king: '♚' };
  const order: PieceType[] = ['queen', 'rook', 'archer', 'bishop', 'knight', 'pawn'];
  const sorted = [...pieces].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
  if (sorted.length === 0) return null;
  return (
    <div className="flex items-center gap-0.5">
      {sorted.map((p, i) => (
        <span key={i} className="text-sm leading-none" style={{
          color: color === 'white' ? '#ccc' : '#555',
          textShadow: color === 'white' ? '0 0 2px rgba(0,0,0,0.5)' : 'none',
        }}>{S[p.type]}</span>
      ))}
    </div>
  );
}

function PlayContent() {
  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') as GameMode) || 'v1_classical';
  const timeControlKey = searchParams.get('tc') || 'none';
  const tc = TIME_CONTROLS[timeControlKey] || TIME_CONTROLS['none'];
  const botDiffParam = searchParams.get('bot') as BotDifficulty | null;
  const playerColorParam = (searchParams.get('color') as PieceColor) || 'white';

  const isVsBot = !!botDiffParam;
  const botDifficulty = botDiffParam || 'casual';
  const humanColor: PieceColor = playerColorParam;
  const botColor: PieceColor = humanColor === 'white' ? 'black' : 'white';

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [legalMoves, setLegalMoves] = useState<LegalMove[]>([]);
  const [isFlipped, setIsFlipped] = useState(humanColor === 'black');
  const [whiteTime, setWhiteTime] = useState(tc.base);
  const [blackTime, setBlackTime] = useState(tc.base);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [resigned, setResigned] = useState<PieceColor | null>(null);
  const [timeoutWinner, setTimeoutWinner] = useState<PieceColor | null>(null);
  const [botThinking, setBotThinking] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const botTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Init game
  useEffect(() => {
    const state = createGame(mode);
    setGameState(state);
    setLegalMoves(getLegalMoves(state));
    setWhiteTime(tc.base);
    setBlackTime(tc.base);
    setResigned(null);
    setTimeoutWinner(null);
  }, [mode, tc.base]);

  const isGameOver = !!(gameState && (gameState.isCheckmate || gameState.isStalemate || gameState.isDraw || resigned || timeoutWinner));

  // Timer
  useEffect(() => {
    if (!gameState || tc.base === 0 || isGameOver) return;
    if (gameState.moveHistory.length === 0) return;
    timerRef.current = setInterval(() => {
      if (gameState.currentTurn === 'white') {
        setWhiteTime(prev => { if (prev <= 100) { setTimeoutWinner('black'); return 0; } return prev - 100; });
      } else {
        setBlackTime(prev => { if (prev <= 100) { setTimeoutWinner('white'); return 0; } return prev - 100; });
      }
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState?.currentTurn, gameState?.moveHistory.length, tc.base, isGameOver]);

  // Bot auto-move
  useEffect(() => {
    if (!isVsBot || !gameState || isGameOver || botThinking) return;
    if (gameState.currentTurn !== botColor) return;

    setBotThinking(true);
    botTimeoutRef.current = setTimeout(() => {
      const move = getBotMove(gameState, botDifficulty);
      if (move) {
        const result = applyMove(gameState, move.from, move.to, move.promotionPiece, move.archerTargets);
        if (result.success && result.newState) {
          if (tc.increment > 0 && tc.base > 0) {
            if (botColor === 'white') setWhiteTime(prev => prev + tc.increment);
            else setBlackTime(prev => prev + tc.increment);
          }
          setGameState(result.newState);
          setLegalMoves(getLegalMoves(result.newState));
        }
      }
      setBotThinking(false);
    }, BOT_DELAY[botDifficulty]);

    return () => { if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current); };
  }, [gameState, isVsBot, botColor, botDifficulty, isGameOver, botThinking, tc.base, tc.increment]);

  const handleMove = async (from: Position, to: Position, promotion?: PieceType, archerTargets?: Position[]): Promise<boolean> => {
    if (!gameState) return false;
    const result = applyMove(gameState, from, to, promotion, archerTargets);
    if (result.success && result.newState) {
      if (tc.increment > 0 && tc.base > 0) {
        if (gameState.currentTurn === 'white') setWhiteTime(prev => prev + tc.increment);
        else setBlackTime(prev => prev + tc.increment);
      }
      setGameState(result.newState);
      setLegalMoves(getLegalMoves(result.newState));
      return true;
    }
    return false;
  };

  const handleReset = () => {
    if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    const state = createGame(mode);
    setGameState(state);
    setLegalMoves(getLegalMoves(state));
    setWhiteTime(tc.base);
    setBlackTime(tc.base);
    setResigned(null);
    setTimeoutWinner(null);
    setBotThinking(false);
    setShowResignConfirm(false);
  };

  if (!gameState) return <div className="min-h-screen flex items-center justify-center bg-zinc-900"><div className="text-zinc-400">Loading...</div></div>;

  const getResultText = () => {
    if (gameState.isCheckmate) {
      const winner = gameState.winner;
      if (isVsBot) return winner === humanColor ? 'You win by checkmate!' : `${BOT_NAMES[botDifficulty]} wins by checkmate`;
      return `Checkmate! ${winner === 'white' ? 'White' : 'Black'} wins!`;
    }
    if (gameState.isStalemate) return 'Stalemate — Draw!';
    if (gameState.isDraw) return 'Draw!';
    if (resigned) {
      if (isVsBot) return resigned === humanColor ? `${BOT_NAMES[botDifficulty]} wins by resignation` : 'You win by resignation!';
      return `${resigned === 'white' ? 'Black' : 'White'} wins by resignation`;
    }
    if (timeoutWinner) {
      if (isVsBot) return timeoutWinner === humanColor ? 'You win on time!' : `${BOT_NAMES[botDifficulty]} wins on time`;
      return `${timeoutWinner} wins on time!`;
    }
    return '';
  };

  const didHumanWin = isVsBot && (
    (gameState.isCheckmate && gameState.winner === humanColor) ||
    (resigned === botColor) ||
    (timeoutWinner === humanColor)
  );

  const hasTimer = tc.base > 0;
  const currentPlayerColor = isVsBot ? humanColor : gameState.currentTurn;
  const isHumanTurn = isVsBot ? gameState.currentTurn === humanColor : true;
  const topColor: PieceColor = isFlipped ? 'white' : 'black';
  const bottomColor: PieceColor = isFlipped ? 'black' : 'white';
  const topName = isVsBot
    ? (topColor === botColor ? BOT_NAMES[botDifficulty] : 'You')
    : (topColor === 'white' ? 'White' : 'Black');
  const bottomName = isVsBot
    ? (bottomColor === botColor ? BOT_NAMES[botDifficulty] : 'You')
    : (bottomColor === 'white' ? 'White' : 'Black');

  return (
    <div className="min-h-screen bg-zinc-900 text-white" data-testid="play-page">
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-12 flex items-center gap-3">
          <Link href="/play/select">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-zinc-800" data-testid="back-button">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </Link>
          <h1 className="font-semibold text-sm flex items-center gap-2" data-testid="game-mode-title">
            {mode === 'v2_artillery'
              ? <><Target className="w-4 h-4 text-orange-400" /> Artillery</>
              : <><Swords className="w-4 h-4 text-red-400" /> Classical</>}
            {isVsBot && <span className="text-xs text-zinc-500 ml-1">vs {BOT_NAMES[botDifficulty]}</span>}
            {hasTimer && <span className="text-xs text-zinc-500">({tc.label})</span>}
          </h1>
          <div className="ml-auto flex gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => setIsFlipped(!isFlipped)} className="text-zinc-400 hover:text-white hover:bg-zinc-800" data-testid="flip-board-button"><RotateCcw className="w-4 h-4" /></Button>
            <Button variant="ghost" size="sm" onClick={handleReset} className="text-zinc-400 hover:text-white hover:bg-zinc-800" data-testid="new-game-button"><RefreshCw className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start justify-center">
          {/* Board column */}
          <div className="flex-shrink-0" data-testid="chess-board-container">
            {/* Top player info/timer */}
            {hasTimer ? (
              <div className="mb-2">
                <ChessTimer
                  timeMs={topColor === 'white' ? whiteTime : blackTime}
                  isActive={!isGameOver && gameState.currentTurn === topColor && gameState.moveHistory.length > 0}
                  isLowTime={hasTimer && (topColor === 'white' ? whiteTime : blackTime) < 10_000}
                  playerName={topName}
                  playerColor={topColor}
                  compact
                />
              </div>
            ) : (
              <div className="mb-2 flex items-center gap-2 px-1">
                <div className={`w-3 h-3 rounded-full ${topColor === 'white' ? 'bg-white' : 'bg-zinc-950 border border-zinc-600'}`} />
                <span className="text-sm font-medium text-zinc-300">{topName}</span>
                {isVsBot && topColor === botColor && botThinking && !isGameOver && (
                  <span className="text-xs text-zinc-500 flex items-center gap-1 ml-auto"><Loader2 className="w-3 h-3 animate-spin" /> Thinking...</span>
                )}
              </div>
            )}

            <div className="mb-1 min-h-[24px] flex items-center gap-0.5 px-1">
              <CapturedRow pieces={topColor === 'white' ? gameState.capturedPieces.white : gameState.capturedPieces.black} color={topColor === 'white' ? 'black' : 'white'} />
            </div>

            <InteractiveBoard
              state={gameState}
              legalMoves={isGameOver || !isHumanTurn ? [] : legalMoves}
              onMove={handleMove}
              playerColor={isVsBot ? humanColor : (isGameOver ? null : gameState.currentTurn)}
              flipped={isFlipped}
              showCoordinates
              disabled={isGameOver || !isHumanTurn}
            />

            <div className="mt-1 min-h-[24px] flex items-center gap-0.5 px-1">
              <CapturedRow pieces={bottomColor === 'white' ? gameState.capturedPieces.white : gameState.capturedPieces.black} color={bottomColor === 'white' ? 'black' : 'white'} />
            </div>

            {/* Bottom player info/timer */}
            {hasTimer ? (
              <div className="mt-2">
                <ChessTimer
                  timeMs={bottomColor === 'white' ? whiteTime : blackTime}
                  isActive={!isGameOver && gameState.currentTurn === bottomColor && gameState.moveHistory.length > 0}
                  isLowTime={hasTimer && (bottomColor === 'white' ? whiteTime : blackTime) < 10_000}
                  playerName={bottomName}
                  playerColor={bottomColor}
                  compact
                />
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-2 px-1">
                <div className={`w-3 h-3 rounded-full ${bottomColor === 'white' ? 'bg-white' : 'bg-zinc-950 border border-zinc-600'}`} />
                <span className="text-sm font-medium text-zinc-300">{bottomName}</span>
                {isVsBot && bottomColor === humanColor && isHumanTurn && !isGameOver && (
                  <span className="text-xs text-green-400 ml-auto">Your turn</span>
                )}
              </div>
            )}
          </div>

          {/* Side panel */}
          <div className="w-full lg:w-72 space-y-3" data-testid="game-side-panel">
            {isGameOver && (
              <Card className="bg-zinc-800 border-zinc-700" data-testid="game-over-card">
                <CardContent className="py-4 text-center">
                  {didHumanWin !== undefined && <Crown className={`w-6 h-6 mx-auto mb-2 ${didHumanWin ? 'text-yellow-400' : 'text-zinc-500'}`} />}
                  <p className="font-bold text-base" data-testid="game-result-text">{getResultText()}</p>
                  <p className="text-xs text-zinc-400 mt-1">{gameState.moveHistory.length} moves</p>
                  <Button size="sm" className="mt-3 bg-[#b94a4a] hover:bg-[#a03e3e] text-white" onClick={handleReset}>
                    <RefreshCw className="w-3 h-3 mr-1" /> {isVsBot ? 'Rematch' : 'New Game'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {!isGameOver && (
              <Card className="bg-zinc-800 border-zinc-700" data-testid="game-status-card">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Turn</span>
                    <span className="font-medium flex items-center gap-1.5" data-testid="current-turn">
                      <div className={`w-2.5 h-2.5 rounded-full ${gameState.currentTurn === 'white' ? 'bg-white' : 'bg-zinc-950 border border-zinc-500'}`} />
                      {isVsBot ? (gameState.currentTurn === humanColor ? 'You' : BOT_NAMES[botDifficulty]) : (gameState.currentTurn === 'white' ? 'White' : 'Black')}
                    </span>
                  </div>
                  {isVsBot && botThinking && (
                    <div className="text-zinc-500 text-xs text-center mt-2 flex items-center justify-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Bot is thinking...</div>
                  )}
                  {gameState.isCheck && <div className="text-red-400 text-xs font-semibold text-center mt-2 py-1 bg-red-500/10 rounded" data-testid="check-indicator">Check!</div>}
                </CardContent>
              </Card>
            )}

            <div data-testid="move-history-panel">
              <MoveHistory moves={gameState.moveHistory} maxHeight="280px" />
            </div>

            {!isGameOver && (
              <div className="flex gap-2" data-testid="action-buttons">
                {!showResignConfirm ? (
                  <Button variant="outline" size="sm" className="flex-1 text-zinc-400 border-zinc-700 hover:bg-zinc-800 hover:text-white"
                    onClick={() => setShowResignConfirm(true)} data-testid="resign-button">
                    <Flag className="w-3 h-3 mr-1" /> Resign
                  </Button>
                ) : (
                  <>
                    <Button variant="destructive" size="sm" className="flex-1" onClick={() => { setResigned(isVsBot ? humanColor : gameState.currentTurn); setShowResignConfirm(false); }}
                      data-testid="confirm-resign-button">Confirm</Button>
                    <Button variant="outline" size="sm" className="flex-1 border-zinc-700 hover:bg-zinc-800"
                      onClick={() => setShowResignConfirm(false)} data-testid="cancel-resign-button">Cancel</Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-900 flex items-center justify-center text-zinc-400">Loading...</div>}>
      <PlayContent />
    </Suspense>
  );
}
