'use client';

/**
 * Local Play Page — Chess.com-style layout with red theme
 */

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import InteractiveBoard from '@/components/game/InteractiveBoard';
import MoveHistory from '@/components/game/MoveHistory';
import CapturedPieces from '@/components/game/CapturedPieces';
import ChessTimer from '@/components/game/ChessTimer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createGame, getLegalMoves, applyMove } from '@/lib/xchess';
import type { GameState, LegalMove, Position, PieceType, GameMode } from '@/lib/xchess/types';
import { ArrowLeft, RotateCcw, Swords, Target, Flag, Handshake, RefreshCw } from 'lucide-react';

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

function PlayContent() {
  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') as GameMode) || 'v1_classical';
  const timeControlKey = searchParams.get('tc') || 'none';
  const tc = TIME_CONTROLS[timeControlKey] || TIME_CONTROLS['none'];

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [legalMoves, setLegalMoves] = useState<LegalMove[]>([]);
  const [isFlipped, setIsFlipped] = useState(false);
  const [whiteTime, setWhiteTime] = useState(tc.base);
  const [blackTime, setBlackTime] = useState(tc.base);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [resigned, setResigned] = useState<'white' | 'black' | null>(null);
  const [timeout, setTimeoutWinner] = useState<'white' | 'black' | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const state = createGame(mode);
    setGameState(state);
    setLegalMoves(getLegalMoves(state));
    setWhiteTime(tc.base);
    setBlackTime(tc.base);
  }, [mode, tc.base]);

  // Timer countdown
  useEffect(() => {
    if (!gameState || tc.base === 0) return;
    if (gameState.isCheckmate || gameState.isStalemate || resigned || timeout) return;
    if (gameState.moveHistory.length === 0) return; // Don't start until first move

    timerRef.current = setInterval(() => {
      if (gameState.currentTurn === 'white') {
        setWhiteTime(prev => {
          if (prev <= 100) { setTimeoutWinner('black'); return 0; }
          return prev - 100;
        });
      } else {
        setBlackTime(prev => {
          if (prev <= 100) { setTimeoutWinner('white'); return 0; }
          return prev - 100;
        });
      }
    }, 100);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState?.currentTurn, gameState?.isCheckmate, gameState?.isStalemate, gameState?.moveHistory.length, tc.base, resigned, timeout]);

  const handleMove = async (from: Position, to: Position, promotion?: PieceType, archerTargets?: Position[]): Promise<boolean> => {
    if (!gameState) return false;
    const result = applyMove(gameState, from, to, promotion, archerTargets);
    if (result.success && result.newState) {
      // Add increment
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
    const state = createGame(mode);
    setGameState(state);
    setLegalMoves(getLegalMoves(state));
    setWhiteTime(tc.base);
    setBlackTime(tc.base);
    setResigned(null);
    setTimeoutWinner(null);
    setShowResignConfirm(false);
  };

  const handleResign = (color: 'white' | 'black') => {
    setResigned(color);
    setShowResignConfirm(false);
  };

  if (!gameState) {
    return <div className="min-h-screen flex items-center justify-center bg-zinc-900"><div className="text-zinc-400">Loading...</div></div>;
  }

  const isGameOver = gameState.isCheckmate || gameState.isStalemate || gameState.isDraw || !!resigned || !!timeout;
  const getResultText = () => {
    if (gameState.isCheckmate) return `Checkmate! ${gameState.winner === 'white' ? 'White' : 'Black'} wins!`;
    if (gameState.isStalemate) return 'Stalemate — Draw!';
    if (gameState.isDraw) return 'Draw!';
    if (resigned) return `${resigned === 'white' ? 'Black' : 'White'} wins by resignation`;
    if (timeout) return `${timeout} wins on time!`;
    return '';
  };

  const hasTimer = tc.base > 0;
  const whiteIsLow = hasTimer && whiteTime < 10_000;
  const blackIsLow = hasTimer && blackTime < 10_000;

  return (
    <div className="min-h-screen bg-zinc-900 text-white" data-testid="play-page">
      {/* Slim header */}
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-12 flex items-center gap-3">
          <Link href="/play/select">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-zinc-800" data-testid="back-button">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          </Link>
          <h1 className="font-semibold text-sm flex items-center gap-2" data-testid="game-mode-title">
            {mode === 'v2_artillery'
              ? <><Target className="w-4 h-4 text-orange-400" /> XChess Artillery</>
              : <><Swords className="w-4 h-4 text-red-400" /> Classical</>}
            {hasTimer && <span className="text-xs text-zinc-500 ml-1">({tc.label})</span>}
          </h1>
          <div className="ml-auto flex gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => setIsFlipped(!isFlipped)} className="text-zinc-400 hover:text-white hover:bg-zinc-800" data-testid="flip-board-button">
              <RotateCcw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleReset} className="text-zinc-400 hover:text-white hover:bg-zinc-800" data-testid="new-game-button">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Game area — chess.com layout */}
      <main className="container mx-auto px-4 py-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start justify-center">
          {/* Board column */}
          <div className="flex-shrink-0" data-testid="chess-board-container">
            {/* Opponent timer (top) */}
            {hasTimer && (
              <div className="mb-2">
                <ChessTimer
                  timeMs={isFlipped ? whiteTime : blackTime}
                  isActive={!isGameOver && gameState.currentTurn === (isFlipped ? 'white' : 'black') && gameState.moveHistory.length > 0}
                  isLowTime={isFlipped ? whiteIsLow : blackIsLow}
                  playerName={isFlipped ? 'White' : 'Black'}
                  playerColor={isFlipped ? 'white' : 'black'}
                  compact
                />
              </div>
            )}
            {/* Opponent captured (pieces they lost — shown above board) */}
            <div className="mb-1 min-h-[24px] flex items-center gap-0.5 px-1">
              <CapturedRow pieces={isFlipped ? gameState.capturedPieces.black : gameState.capturedPieces.white} color={isFlipped ? 'white' : 'black'} />
            </div>

            <InteractiveBoard
              state={gameState}
              legalMoves={isGameOver ? [] : legalMoves}
              onMove={handleMove}
              playerColor={isGameOver ? null : gameState.currentTurn}
              flipped={isFlipped}
              showCoordinates
              disabled={isGameOver}
            />

            {/* Player captured (pieces they captured — shown below board) */}
            <div className="mt-1 min-h-[24px] flex items-center gap-0.5 px-1">
              <CapturedRow pieces={isFlipped ? gameState.capturedPieces.white : gameState.capturedPieces.black} color={isFlipped ? 'black' : 'white'} />
            </div>
            {/* Player timer (bottom) */}
            {hasTimer && (
              <div className="mt-2">
                <ChessTimer
                  timeMs={isFlipped ? blackTime : whiteTime}
                  isActive={!isGameOver && gameState.currentTurn === (isFlipped ? 'black' : 'white') && gameState.moveHistory.length > 0}
                  isLowTime={isFlipped ? blackIsLow : whiteIsLow}
                  playerName={isFlipped ? 'Black' : 'White'}
                  playerColor={isFlipped ? 'black' : 'white'}
                  compact
                />
              </div>
            )}
          </div>

          {/* Side panel */}
          <div className="w-full lg:w-72 space-y-3 flex flex-col" data-testid="game-side-panel">
            {/* Game over banner */}
            {isGameOver && (
              <Card className="bg-zinc-800 border-zinc-700" data-testid="game-over-card">
                <CardContent className="py-3 text-center">
                  <p className="font-bold text-base" data-testid="game-result-text">{getResultText()}</p>
                  <p className="text-xs text-zinc-400 mt-1">{gameState.moveHistory.length} moves</p>
                  <Button size="sm" className="mt-2 bg-[#b94a4a] hover:bg-[#a03e3e] text-white" onClick={handleReset}>
                    <RefreshCw className="w-3 h-3 mr-1" /> New Game
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Status */}
            {!isGameOver && (
              <Card className="bg-zinc-800 border-zinc-700" data-testid="game-status-card">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Turn</span>
                    <span className="font-medium flex items-center gap-1.5" data-testid="current-turn">
                      <div className={`w-2.5 h-2.5 rounded-full ${gameState.currentTurn === 'white' ? 'bg-white' : 'bg-zinc-950 border border-zinc-500'}`} />
                      {gameState.currentTurn === 'white' ? 'White' : 'Black'}
                    </span>
                  </div>
                  {gameState.isCheck && (
                    <div className="text-red-400 text-xs font-semibold text-center mt-2 py-1 bg-red-500/10 rounded" data-testid="check-indicator">Check!</div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Move history */}
            <div data-testid="move-history-panel" className="flex-1">
              <MoveHistory moves={gameState.moveHistory} maxHeight="280px" />
            </div>

            {/* Action buttons */}
            {!isGameOver && (
              <div className="flex gap-2" data-testid="action-buttons">
                {!showResignConfirm ? (
                  <>
                    <Button variant="outline" size="sm" className="flex-1 text-zinc-400 border-zinc-700 hover:bg-zinc-800 hover:text-white"
                      onClick={() => setShowResignConfirm(true)} data-testid="resign-button">
                      <Flag className="w-3 h-3 mr-1" /> Resign
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="destructive" size="sm" className="flex-1" onClick={() => handleResign(gameState.currentTurn)}
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

// Inline captured pieces row for above/below board
function CapturedRow({ pieces, color }: { pieces: { type: PieceType; color: string }[]; color: string }) {
  const SYMBOLS: Record<string, string> = { queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟', archer: '🏹', king: '♚' };
  const order: PieceType[] = ['queen', 'rook', 'archer', 'bishop', 'knight', 'pawn'];
  const sorted = [...pieces].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
  if (sorted.length === 0) return null;
  return (
    <div className="flex items-center gap-0.5">
      {sorted.map((p, i) => (
        <span key={i} className="text-sm leading-none" style={{
          color: color === 'white' ? '#ccc' : '#555',
          textShadow: color === 'white' ? '0 0 2px rgba(0,0,0,0.5)' : 'none',
        }}>{SYMBOLS[p.type]}</span>
      ))}
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
