'use client';

/**
 * Online Multiplayer Game Page — Chess.com Red Theme
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import InteractiveBoard from '@/components/game/InteractiveBoard';
import MoveHistory from '@/components/game/MoveHistory';
import CapturedPieces from '@/components/game/CapturedPieces';
import ChessTimer from '@/components/game/ChessTimer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import PostGameAnalysis from '@/components/game/PostGameAnalysis';
import type { GameState, LegalMove, Position, PieceType, PieceColor } from '@/lib/xchess/types';
import {
  ArrowLeft, Copy, Check, Loader2, Swords, Target, Flag,
  RotateCcw, Wifi, WifiOff, Crown, Users, Share2, RefreshCw,
} from 'lucide-react';

type GameStatus = 'loading' | 'waiting' | 'joining' | 'active' | 'completed' | 'not_found';

interface GameData {
  gameId: string;
  mode: string;
  status: string;
  creatorColor: PieceColor;
  creatorName: string;
  opponentName: string | null;
  state: GameState;
  legalMoves: LegalMove[];
  moveCount: number;
  result: string | null;
  timeControl?: { base: number; increment: number };
  whiteTimeMs?: number;
  blackTimeMs?: number;
}

// Inline captured row for chess.com layout
function CapturedRow({ pieces, color }: { pieces: { type: string; color: string }[]; color: string }) {
  const S: Record<string, string> = { queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟', archer: '🏹', king: '♚' };
  const order = ['queen', 'rook', 'archer', 'bishop', 'knight', 'pawn'];
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

export default function OnlineGamePage() {
  const params = useParams();
  const gameId = params.gameId as string;

  const [gameStatus, setGameStatus] = useState<GameStatus>('loading');
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [legalMoves, setLegalMoves] = useState<LegalMove[]>([]);
  const [playerColor, setPlayerColor] = useState<PieceColor | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [whiteTime, setWhiteTime] = useState(0);
  const [blackTime, setBlackTime] = useState(0);

  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const supabaseRef = useRef(createClient());
  const roleRef = useRef<'creator' | 'opponent' | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const gameLink = typeof window !== 'undefined' ? `${window.location.origin}/game/${gameId}` : '';

  const fetchGameState = useCallback(async () => {
    try {
      const res = await fetch(`/api/multiplayer/games/${gameId}`);
      if (res.status === 404) { setGameStatus('not_found'); return null; }
      const data: GameData = await res.json();
      setGameData(data);
      if (data.whiteTimeMs !== undefined) setWhiteTime(data.whiteTimeMs);
      if (data.blackTimeMs !== undefined) setBlackTime(data.blackTimeMs);
      return data;
    } catch { return null; }
  }, [gameId]);

  // Init
  useEffect(() => {
    const role = localStorage.getItem(`xchess-role-${gameId}`);
    const storedColor = localStorage.getItem(`xchess-color-${gameId}`) as PieceColor | null;
    const storedName = localStorage.getItem(`xchess-name-${gameId}`);
    if (role && storedColor) {
      roleRef.current = role as 'creator' | 'opponent';
      setPlayerColor(storedColor);
      if (storedName) setPlayerName(storedName);
    }
    fetchGameState().then((data) => {
      if (!data) return;
      if (data.status === 'waiting') {
        if (role === 'creator') { setGameStatus('waiting'); setGameState(data.state); setLegalMoves(data.legalMoves); }
        else setGameStatus('joining');
      } else if (data.status === 'active' || data.status === 'completed') {
        setGameState(data.state); setLegalMoves(data.legalMoves); setGameStatus(data.status as GameStatus);
        if (!role) setPlayerColor(null);
      }
    });
  }, [gameId, fetchGameState]);

  // Realtime
  useEffect(() => {
    if (!gameId) return;
    const supabase = supabaseRef.current;
    const channel = supabase.channel(`game-${gameId}`, { config: { broadcast: { self: false } } });
    channel
      .on('broadcast', { event: 'move' }, (payload) => {
        const { state, legalMoves: moves, gameStatus: status, gameResult, whiteTimeMs: wt, blackTimeMs: bt } = payload.payload;
        setGameState(state); setLegalMoves(moves);
        if (wt !== undefined) setWhiteTime(wt);
        if (bt !== undefined) setBlackTime(bt);
        if (status === 'completed') { setGameStatus('completed'); setGameData(prev => prev ? { ...prev, result: gameResult, status: 'completed' } : prev); }
      })
      .on('broadcast', { event: 'opponent_joined' }, (payload) => {
        setGameData(prev => prev ? { ...prev, opponentName: payload.payload.opponentName, status: 'active' } : prev);
        setGameStatus('active');
      })
      .on('broadcast', { event: 'resign' }, (payload) => {
        setGameStatus('completed');
        setGameData(prev => prev ? { ...prev, result: payload.payload.result, status: 'completed' } : prev);
      })
      .subscribe((status) => setIsConnected(status === 'SUBSCRIBED'));
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [gameId]);

  useEffect(() => { if (playerColor === 'black') setIsFlipped(true); }, [playerColor]);

  // Poll for opponent (waiting)
  useEffect(() => {
    if (gameStatus !== 'waiting') return;
    const interval = setInterval(async () => {
      const data = await fetchGameState();
      if (data && data.status === 'active') {
        setGameState(data.state); setLegalMoves(data.legalMoves); setGameStatus('active');
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [gameStatus, fetchGameState]);

  // Client-side timer countdown
  const hasTimer = (gameData?.timeControl?.base ?? 0) > 0;
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!hasTimer || !gameState || gameStatus !== 'active') return;
    if (gameState.isCheckmate || gameState.isStalemate || gameState.moveHistory.length === 0) return;

    timerRef.current = setInterval(() => {
      if (gameState.currentTurn === 'white') {
        setWhiteTime(prev => Math.max(0, prev - 100));
      } else {
        setBlackTime(prev => Math.max(0, prev - 100));
      }
    }, 100);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [hasTimer, gameState?.currentTurn, gameState?.moveHistory.length, gameStatus, gameState?.isCheckmate, gameState?.isStalemate]);

  const handleJoin = async () => {
    const name = playerName.trim() || 'Player 2';
    try {
      const res = await fetch(`/api/multiplayer/games/${gameId}/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerName: name }) });
      const data = await res.json();
      if (res.ok) {
        roleRef.current = 'opponent'; setPlayerColor(data.playerColor);
        localStorage.setItem(`xchess-role-${gameId}`, 'opponent');
        localStorage.setItem(`xchess-color-${gameId}`, data.playerColor);
        localStorage.setItem(`xchess-name-${gameId}`, name);
        const fresh = await fetchGameState();
        if (fresh) { setGameState(fresh.state); setLegalMoves(fresh.legalMoves); }
        setGameStatus('active');
        channelRef.current?.send({ type: 'broadcast', event: 'opponent_joined', payload: { opponentName: name } });
      }
    } catch (err) { console.error('Join error:', err); }
  };

  const handleMove = async (from: Position, to: Position, promotionPiece?: PieceType): Promise<boolean> => {
    if (!gameState || !playerColor || isSubmitting) return false;
    if (gameState.currentTurn !== playerColor) return false;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/multiplayer/games/${gameId}/moves`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, promotionPiece, playerColor, moveNumber: gameState.moveHistory.length }),
      });
      const data = await res.json();
      if (res.status === 409) {
        const fresh = await fetchGameState();
        if (fresh) { setGameState(fresh.state); setLegalMoves(fresh.legalMoves); }
        return false;
      }
      if (data.success) {
        setGameState(data.state); setLegalMoves(data.legalMoves);
        if (data.whiteTimeMs !== undefined) setWhiteTime(data.whiteTimeMs);
        if (data.blackTimeMs !== undefined) setBlackTime(data.blackTimeMs);
        if (data.gameStatus === 'completed') {
          setGameStatus('completed');
          setGameData(prev => prev ? { ...prev, result: data.gameResult, status: 'completed' } : prev);
        }
        channelRef.current?.send({
          type: 'broadcast', event: 'move',
          payload: { state: data.state, legalMoves: data.legalMoves, gameStatus: data.gameStatus, gameResult: data.gameResult, whiteTimeMs: data.whiteTimeMs, blackTimeMs: data.blackTimeMs },
        });
        return true;
      }
      return false;
    } catch {
      const fresh = await fetchGameState();
      if (fresh) { setGameState(fresh.state); setLegalMoves(fresh.legalMoves); }
      return false;
    } finally { setIsSubmitting(false); }
  };

  const handleResign = async () => {
    if (!playerColor) return;
    try {
      const res = await fetch(`/api/multiplayer/games/${gameId}/resign`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerColor }) });
      const data = await res.json();
      if (data.success) {
        setGameStatus('completed');
        const result = `${playerColor === 'white' ? 'black' : 'white'}_wins`;
        setGameData(prev => prev ? { ...prev, result, status: 'completed' } : prev);
        channelRef.current?.send({ type: 'broadcast', event: 'resign', payload: { result, resignedColor: playerColor } });
      }
    } catch (err) { console.error('Resign error:', err); }
    setShowResignConfirm(false);
  };

  const copyLink = () => { navigator.clipboard.writeText(gameLink); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  // === LOADING / NOT FOUND / JOINING / WAITING ===
  if (gameStatus === 'loading') {
    return (<div className="min-h-screen bg-zinc-900 flex items-center justify-center" data-testid="game-loading"><Loader2 className="w-8 h-8 animate-spin text-zinc-500" /></div>);
  }
  if (gameStatus === 'not_found') {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center" data-testid="game-not-found">
        <Card className="max-w-md w-full mx-4 bg-zinc-800 border-zinc-700">
          <CardContent className="pt-6 text-center space-y-4">
            <Swords className="w-10 h-10 text-zinc-500 mx-auto" />
            <h2 className="text-lg font-semibold text-white">Game Not Found</h2>
            <p className="text-sm text-zinc-400">This game doesn&apos;t exist or has been removed.</p>
            <Link href="/play/select"><Button className="bg-[#b94a4a] hover:bg-[#a03e3e] text-white">Create New Game</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (gameStatus === 'joining') {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center" data-testid="game-join-screen">
        <Card className="max-w-md w-full mx-4 bg-zinc-800 border-zinc-700">
          <CardHeader className="text-center">
            <div className="w-14 h-14 bg-[#b94a4a]/20 rounded-full flex items-center justify-center mx-auto mb-2"><Users className="w-7 h-7 text-[#b94a4a]" /></div>
            <CardTitle className="text-white">Join Game</CardTitle>
            <p className="text-sm text-zinc-400 mt-1">{gameData?.creatorName} invited you to play <span className="font-medium text-white">{gameData?.mode === 'v2_artillery' ? 'XChess Artillery' : 'Classical'}</span></p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block text-zinc-300">Your name</label>
              <Input data-testid="join-name-input" placeholder="Enter your name..." value={playerName} onChange={(e) => setPlayerName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleJoin()} maxLength={20} className="bg-zinc-900 border-zinc-600 text-white" />
            </div>
            <Button className="w-full bg-[#b94a4a] hover:bg-[#a03e3e] text-white" onClick={handleJoin} data-testid="join-game-button"><Swords className="w-4 h-4 mr-2" /> Play</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  if (gameStatus === 'waiting') {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center" data-testid="game-waiting-room">
        <Card className="max-w-lg w-full mx-4 bg-zinc-800 border-zinc-700">
          <CardHeader className="text-center">
            <Loader2 className="w-10 h-10 text-[#b94a4a] animate-spin mx-auto mb-2" />
            <CardTitle className="text-white">Waiting for Opponent</CardTitle>
            <p className="text-sm text-zinc-400 mt-1">Share this link with a friend</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-center gap-4 text-sm text-zinc-400">
              <span className="flex items-center gap-1">{gameData?.mode === 'v2_artillery' ? <><Target className="w-4 h-4" /> Artillery</> : <><Swords className="w-4 h-4" /> Classical</>}</span>
              <span>•</span><span>Playing as {playerColor}</span>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300">Challenge link</label>
              <div className="flex gap-2">
                <Input readOnly value={gameLink} className="font-mono text-xs bg-zinc-900 border-zinc-600 text-zinc-300" data-testid="game-link-input" />
                <Button variant="outline" size="icon" onClick={copyLink} className="border-zinc-600 hover:bg-zinc-700" data-testid="copy-link-button">
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 border-zinc-600 text-zinc-300 hover:bg-zinc-700" onClick={() => { if (navigator.share) navigator.share({ title: 'XChess', url: gameLink }); else copyLink(); }} data-testid="share-button"><Share2 className="w-4 h-4 mr-2" /> Share</Button>
              <Link href="/play/select" className="flex-1"><Button variant="ghost" className="w-full text-zinc-400 hover:text-white" data-testid="cancel-game-button">Cancel</Button></Link>
            </div>
            <div className="flex items-center justify-center gap-1 py-2">
              <div className="w-2 h-2 rounded-full bg-[#b94a4a]/50 animate-bounce [animation-delay:0ms]" />
              <div className="w-2 h-2 rounded-full bg-[#b94a4a]/50 animate-bounce [animation-delay:150ms]" />
              <div className="w-2 h-2 rounded-full bg-[#b94a4a]/50 animate-bounce [animation-delay:300ms]" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // === ACTIVE / COMPLETED GAME ===
  if (!gameState) return null;

  const isMyTurn = gameState.currentTurn === playerColor;
  const isGameOver = gameStatus === 'completed';
  const opponentName = roleRef.current === 'creator' ? (gameData?.opponentName || 'Opponent') : (gameData?.creatorName || 'Opponent');
  const myName = roleRef.current === 'creator' ? (gameData?.creatorName || 'You') : (gameData?.opponentName || 'You');

  const getResultText = () => {
    if (!gameData?.result) return '';
    if (gameData.result === 'draw') return 'Draw!';
    const winnerColor = gameData.result.replace('_wins', '');
    return `${winnerColor === playerColor ? myName : opponentName} wins!`;
  };
  const didIWin = gameData?.result?.startsWith(playerColor || '');

  // Determine which timer is on top/bottom
  const topColor = isFlipped ? 'white' : 'black';
  const bottomColor = isFlipped ? 'black' : 'white';
  const topName = topColor === playerColor ? `${myName} (You)` : opponentName;
  const bottomName = bottomColor === playerColor ? `${myName} (You)` : opponentName;
  const topTime = topColor === 'white' ? whiteTime : blackTime;
  const bottomTime = bottomColor === 'white' ? whiteTime : blackTime;

  return (
    <div className="min-h-screen bg-zinc-900 text-white" data-testid="online-game-page">
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-40">
        <div className="container mx-auto px-4 h-12 flex items-center gap-3">
          <Link href="/play/select"><Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-zinc-800" data-testid="back-to-lobby"><ArrowLeft className="w-4 h-4 mr-1" /> Lobby</Button></Link>
          <h1 className="font-semibold text-sm flex items-center gap-2" data-testid="game-header-title">
            {gameData?.mode === 'v2_artillery' ? <><Target className="w-4 h-4 text-orange-400" /> Artillery</> : <><Swords className="w-4 h-4 text-red-400" /> Classical</>}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs" data-testid="connection-status">
              {isConnected ? <><Wifi className="w-3 h-3 text-green-400" /><span className="text-green-400 hidden sm:inline">Live</span></> : <><WifiOff className="w-3 h-3 text-red-400" /><span className="text-red-400 hidden sm:inline">Offline</span></>}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsFlipped(!isFlipped)} className="text-zinc-400 hover:text-white hover:bg-zinc-800" data-testid="flip-board-btn"><RotateCcw className="w-4 h-4" /></Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4">
        {/* Game over banner */}
        {isGameOver && (
          <div className="mb-4 max-w-3xl mx-auto" data-testid="game-over-banner">
            <Card className={`border ${didIWin ? 'border-green-600/40 bg-green-900/20' : 'border-orange-600/40 bg-orange-900/20'}`}>
              <CardContent className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Crown className={`w-6 h-6 ${didIWin ? 'text-green-400' : 'text-orange-400'}`} />
                  <div><p className="font-semibold" data-testid="game-result-text">{getResultText()}</p><p className="text-xs text-zinc-400">{gameState.moveHistory.length} moves</p></div>
                </div>
                <Link href="/play/select"><Button size="sm" className="bg-[#b94a4a] hover:bg-[#a03e3e] text-white" data-testid="new-game-after-end"><RefreshCw className="w-3 h-3 mr-1" /> New Game</Button></Link>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4 items-start justify-center">
          {/* Board column */}
          <div className="flex-shrink-0" data-testid="online-board-container">
            {/* Top timer */}
            {hasTimer && (
              <div className="mb-2">
                <ChessTimer timeMs={topTime} isActive={!isGameOver && gameState.currentTurn === topColor && gameState.moveHistory.length > 0} isLowTime={hasTimer && topTime < 10_000} playerName={topName} playerColor={topColor} compact />
              </div>
            )}
            {!hasTimer && (
              <div className="mb-2 flex items-center gap-2 px-1" data-testid="opponent-info">
                <div className={`w-3 h-3 rounded-full ${topColor === 'white' ? 'bg-white' : 'bg-zinc-950 border border-zinc-600'}`} />
                <span className="text-sm font-medium text-zinc-300">{topName}</span>
                {!isGameOver && gameState.currentTurn === topColor && <span className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full ml-auto">Thinking...</span>}
              </div>
            )}

            {/* Captured by top player */}
            <div className="mb-1 min-h-[24px] flex items-center gap-0.5 px-1">
              <CapturedRow pieces={topColor === 'white' ? gameState.capturedPieces.white : gameState.capturedPieces.black} color={topColor === 'white' ? 'black' : 'white'} />
            </div>

            <InteractiveBoard
              state={gameState}
              legalMoves={isMyTurn && !isGameOver ? legalMoves : []}
              onMove={handleMove}
              playerColor={playerColor || 'white'}
              flipped={isFlipped}
              showCoordinates
              disabled={!isMyTurn || isGameOver || isSubmitting}
            />

            {/* Captured by bottom player */}
            <div className="mt-1 min-h-[24px] flex items-center gap-0.5 px-1">
              <CapturedRow pieces={bottomColor === 'white' ? gameState.capturedPieces.white : gameState.capturedPieces.black} color={bottomColor === 'white' ? 'black' : 'white'} />
            </div>

            {/* Bottom timer */}
            {hasTimer && (
              <div className="mt-2">
                <ChessTimer timeMs={bottomTime} isActive={!isGameOver && gameState.currentTurn === bottomColor && gameState.moveHistory.length > 0} isLowTime={hasTimer && bottomTime < 10_000} playerName={bottomName} playerColor={bottomColor} compact />
              </div>
            )}
            {!hasTimer && (
              <div className="mt-2 flex items-center gap-2 px-1" data-testid="player-info">
                <div className={`w-3 h-3 rounded-full ${bottomColor === 'white' ? 'bg-white' : 'bg-zinc-950 border border-zinc-600'}`} />
                <span className="text-sm font-medium text-zinc-300">{bottomName}</span>
                {!isGameOver && isMyTurn && <span className="text-xs bg-green-600/20 text-green-400 px-2 py-0.5 rounded-full ml-auto">Your turn</span>}
              </div>
            )}
          </div>

          {/* Side panel */}
          <div className="w-full lg:w-72 space-y-3" data-testid="online-side-panel">
            {!isGameOver && (
              <Card className="bg-zinc-800 border-zinc-700" data-testid="online-status-card">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Turn</span>
                    <span className="font-medium flex items-center gap-1.5" data-testid="online-current-turn">
                      <div className={`w-2.5 h-2.5 rounded-full ${gameState.currentTurn === 'white' ? 'bg-white' : 'bg-zinc-950 border border-zinc-500'}`} />
                      {gameState.currentTurn === 'white' ? 'White' : 'Black'}{isMyTurn && ' (You)'}
                    </span>
                  </div>
                  {gameState.isCheck && <div className="text-red-400 text-xs font-semibold text-center mt-2 py-1 bg-red-500/10 rounded" data-testid="online-check-indicator">Check!</div>}
                </CardContent>
              </Card>
            )}

            <div data-testid="online-move-history">
              <MoveHistory moves={gameState.moveHistory} maxHeight="250px" />
            </div>

            {isGameOver && gameState.moveHistory.length >= 2 && (
              <PostGameAnalysis gameState={gameState} humanColor={playerColor || undefined} />
            )}

            {!isGameOver && playerColor && (
              <div className="flex gap-2">
                {!showResignConfirm ? (
                  <Button variant="outline" size="sm" className="flex-1 text-zinc-400 border-zinc-700 hover:bg-zinc-800 hover:text-white" onClick={() => setShowResignConfirm(true)} data-testid="resign-button"><Flag className="w-3 h-3 mr-1" /> Resign</Button>
                ) : (
                  <>
                    <Button variant="destructive" size="sm" className="flex-1" onClick={handleResign} data-testid="confirm-resign-button">Confirm</Button>
                    <Button variant="outline" size="sm" className="flex-1 border-zinc-700 hover:bg-zinc-800" onClick={() => setShowResignConfirm(false)} data-testid="cancel-resign-button">Cancel</Button>
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
