'use client';

/**
 * Online Multiplayer Game Page
 * 
 * Handles the full lifecycle: waiting room → active game → game over.
 * Uses Supabase Realtime Broadcast for instant move delivery.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import InteractiveBoard from '@/components/game/InteractiveBoard';
import MoveHistory from '@/components/game/MoveHistory';
import CapturedPieces from '@/components/game/CapturedPieces';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
}

export default function OnlineGamePage() {
  const params = useParams();
  const router = useRouter();
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

  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const supabaseRef = useRef(createClient());
  const roleRef = useRef<'creator' | 'opponent' | null>(null);

  const gameLink = typeof window !== 'undefined' ? `${window.location.origin}/game/${gameId}` : '';

  // Fetch game state from server
  const fetchGameState = useCallback(async () => {
    try {
      const res = await fetch(`/api/multiplayer/games/${gameId}`);
      if (res.status === 404) {
        setGameStatus('not_found');
        return null;
      }
      const data: GameData = await res.json();
      setGameData(data);
      return data;
    } catch {
      return null;
    }
  }, [gameId]);

  // Initialize game on mount
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
        if (role === 'creator') {
          setGameStatus('waiting');
          setGameState(data.state);
          setLegalMoves(data.legalMoves);
        } else {
          // New player arriving — show join screen
          setGameStatus('joining');
        }
      } else if (data.status === 'active' || data.status === 'completed') {
        setGameState(data.state);
        setLegalMoves(data.legalMoves);
        setGameStatus(data.status as GameStatus);

        // If returning player, restore role
        if (!role) {
          // Spectator
          setPlayerColor(null);
        }
      }
    });
  }, [gameId, fetchGameState]);

  // Set up Supabase Realtime channel
  useEffect(() => {
    if (!gameId) return;

    const supabase = supabaseRef.current;
    const channel = supabase.channel(`game-${gameId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on('broadcast', { event: 'move' }, (payload) => {
        const { state, legalMoves: moves, gameStatus: status, gameResult } = payload.payload;
        setGameState(state);
        setLegalMoves(moves);
        if (status === 'completed') {
          setGameStatus('completed');
          setGameData((prev) => prev ? { ...prev, result: gameResult, status: 'completed' } : prev);
        }
      })
      .on('broadcast', { event: 'opponent_joined' }, (payload) => {
        const { opponentName: name } = payload.payload;
        setGameData((prev) => prev ? { ...prev, opponentName: name, status: 'active' } : prev);
        setGameStatus('active');
      })
      .on('broadcast', { event: 'resign' }, (payload) => {
        const { result, resignedColor } = payload.payload;
        setGameStatus('completed');
        setGameData((prev) => prev ? { ...prev, result, status: 'completed' } : prev);
      })
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  // Flip board for black
  useEffect(() => {
    if (playerColor === 'black') setIsFlipped(true);
  }, [playerColor]);

  // Poll for opponent joining (when waiting)
  useEffect(() => {
    if (gameStatus !== 'waiting') return;
    const interval = setInterval(async () => {
      const data = await fetchGameState();
      if (data && data.status === 'active') {
        setGameState(data.state);
        setLegalMoves(data.legalMoves);
        setGameStatus('active');
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [gameStatus, fetchGameState]);

  // Handle joining the game
  const handleJoin = async () => {
    const name = playerName.trim() || 'Player 2';
    try {
      const res = await fetch(`/api/multiplayer/games/${gameId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: name }),
      });
      const data = await res.json();
      if (res.ok) {
        roleRef.current = 'opponent';
        setPlayerColor(data.playerColor);
        localStorage.setItem(`xchess-role-${gameId}`, 'opponent');
        localStorage.setItem(`xchess-color-${gameId}`, data.playerColor);
        localStorage.setItem(`xchess-name-${gameId}`, name);

        // Fetch fresh state
        const fresh = await fetchGameState();
        if (fresh) {
          setGameState(fresh.state);
          setLegalMoves(fresh.legalMoves);
        }
        setGameStatus('active');

        // Broadcast to creator
        channelRef.current?.send({
          type: 'broadcast',
          event: 'opponent_joined',
          payload: { opponentName: name },
        });
      }
    } catch (err) {
      console.error('Join error:', err);
    }
  };

  // Handle making a move
  const handleMove = async (from: Position, to: Position, promotionPiece?: PieceType): Promise<boolean> => {
    if (!gameState || !playerColor || isSubmitting) return false;
    if (gameState.currentTurn !== playerColor) return false;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/multiplayer/games/${gameId}/moves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to,
          promotionPiece,
          playerColor,
          moveNumber: gameState.moveHistory.length,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        // Desync — re-fetch state
        const fresh = await fetchGameState();
        if (fresh) {
          setGameState(fresh.state);
          setLegalMoves(fresh.legalMoves);
        }
        return false;
      }

      if (data.success) {
        setGameState(data.state);
        setLegalMoves(data.legalMoves);

        if (data.gameStatus === 'completed') {
          setGameStatus('completed');
          setGameData((prev) => prev ? { ...prev, result: data.gameResult, status: 'completed' } : prev);
        }

        // Broadcast to opponent
        channelRef.current?.send({
          type: 'broadcast',
          event: 'move',
          payload: {
            state: data.state,
            legalMoves: data.legalMoves,
            gameStatus: data.gameStatus,
            gameResult: data.gameResult,
          },
        });
        return true;
      }
      return false;
    } catch (err) {
      console.error('Move error:', err);
      // On network error, re-fetch
      const fresh = await fetchGameState();
      if (fresh) {
        setGameState(fresh.state);
        setLegalMoves(fresh.legalMoves);
      }
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle resign
  const handleResign = async () => {
    if (!playerColor) return;
    try {
      const res = await fetch(`/api/multiplayer/games/${gameId}/resign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerColor }),
      });
      const data = await res.json();
      if (data.success) {
        setGameStatus('completed');
        const result = `${playerColor === 'white' ? 'black' : 'white'}_wins`;
        setGameData((prev) => prev ? { ...prev, result, status: 'completed' } : prev);
        channelRef.current?.send({
          type: 'broadcast',
          event: 'resign',
          payload: { result, resignedColor: playerColor },
        });
      }
    } catch (err) {
      console.error('Resign error:', err);
    }
    setShowResignConfirm(false);
  };

  // Copy link
  const copyLink = () => {
    navigator.clipboard.writeText(gameLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // === RENDER STATES ===

  if (gameStatus === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="game-loading">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading game...</p>
        </div>
      </div>
    );
  }

  if (gameStatus === 'not_found') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="game-not-found">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
              <Swords className="w-8 h-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold">Game Not Found</h2>
            <p className="text-muted-foreground text-sm">This game doesn&apos;t exist or has been removed.</p>
            <Link href="/play/select">
              <Button>Create New Game</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // === JOINING SCREEN (opponent arriving) ===
  if (gameStatus === 'joining') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="game-join-screen">
        <Card className="max-w-md w-full mx-4">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Join Game</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {gameData?.creatorName} invited you to play{' '}
              <span className="font-medium text-foreground">
                {gameData?.mode === 'v2_artillery' ? 'XChess Artillery' : 'Classical Chess'}
              </span>
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Your name</label>
              <Input
                data-testid="join-name-input"
                placeholder="Enter your name..."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                maxLength={20}
              />
            </div>
            <Button className="w-full" onClick={handleJoin} data-testid="join-game-button">
              <Swords className="w-4 h-4 mr-2" />
              Play
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // === WAITING ROOM (creator waiting) ===
  if (gameStatus === 'waiting') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" data-testid="game-waiting-room">
        <Card className="max-w-lg w-full mx-4">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <CardTitle>Waiting for Opponent</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Share this link with a friend to start playing
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Game info */}
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                {gameData?.mode === 'v2_artillery' 
                  ? <><Target className="w-4 h-4" /> Artillery</>
                  : <><Swords className="w-4 h-4" /> Classical</>
                }
              </span>
              <span>•</span>
              <span>Playing as {playerColor}</span>
            </div>

            {/* Share link */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Challenge link</label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={gameLink}
                  className="font-mono text-xs"
                  data-testid="game-link-input"
                />
                <Button variant="outline" size="icon" onClick={copyLink} data-testid="copy-link-button">
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Share buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({ title: 'XChess Challenge', url: gameLink });
                  } else {
                    copyLink();
                  }
                }}
                data-testid="share-button"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Link href="/play/select" className="flex-1">
                <Button variant="ghost" className="w-full" data-testid="cancel-game-button">Cancel</Button>
              </Link>
            </div>

            {/* Animated waiting dots */}
            <div className="flex items-center justify-center gap-1 py-2">
              <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:0ms]" />
              <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:150ms]" />
              <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce [animation-delay:300ms]" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // === ACTIVE GAME / COMPLETED ===
  if (!gameState) return null;

  const isMyTurn = gameState.currentTurn === playerColor;
  const isGameOver = gameStatus === 'completed';
  const opponentName = roleRef.current === 'creator' ? (gameData?.opponentName || 'Opponent') : (gameData?.creatorName || 'Opponent');
  const myName = roleRef.current === 'creator' ? (gameData?.creatorName || 'You') : (gameData?.opponentName || 'You');

  const getResultText = () => {
    if (!gameData?.result) return '';
    if (gameData.result === 'draw') return 'Game drawn!';
    const winnerColor = gameData.result.replace('_wins', '');
    const winnerName = winnerColor === playerColor ? myName : opponentName;
    return `${winnerName} wins!`;
  };

  const didIWin = gameData?.result?.startsWith(playerColor || '');

  return (
    <div className="min-h-screen bg-background" data-testid="online-game-page">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/play/select">
            <Button variant="ghost" size="sm" data-testid="back-to-lobby">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Lobby
            </Button>
          </Link>
          <h1 className="font-semibold flex items-center gap-2 text-sm" data-testid="game-header-title">
            {gameData?.mode === 'v2_artillery'
              ? <><Target className="w-4 h-4" /> XChess Artillery</>
              : <><Swords className="w-4 h-4" /> Classical</>
            }
          </h1>
          <div className="ml-auto flex items-center gap-2">
            {/* Connection indicator */}
            <div className="flex items-center gap-1 text-xs" data-testid="connection-status">
              {isConnected
                ? <><Wifi className="w-3 h-3 text-green-500" /><span className="text-green-600 hidden sm:inline">Live</span></>
                : <><WifiOff className="w-3 h-3 text-red-500" /><span className="text-red-600 hidden sm:inline">Reconnecting...</span></>
              }
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsFlipped(!isFlipped)} data-testid="flip-board-btn">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4">
        {/* Game over overlay */}
        {isGameOver && (
          <div className="mb-4" data-testid="game-over-banner">
            <Card className={didIWin ? 'border-green-500/50 bg-green-500/5' : 'border-orange-500/50 bg-orange-500/5'}>
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Crown className={`w-6 h-6 ${didIWin ? 'text-green-500' : 'text-orange-500'}`} />
                  <div>
                    <p className="font-semibold" data-testid="game-result-text">{getResultText()}</p>
                    <p className="text-xs text-muted-foreground">
                      {gameState.moveHistory.length} moves played
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href="/play/select">
                    <Button size="sm" data-testid="new-game-after-end">
                      <RefreshCw className="w-4 h-4 mr-1" />
                      New Game
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4 items-start justify-center">
          {/* Board section */}
          <div className="flex-shrink-0" data-testid="online-board-container">
            {/* Opponent info bar (top) */}
            <div className="flex items-center gap-2 mb-2 px-1" data-testid="opponent-info">
              <div className={`w-3 h-3 rounded-full ${playerColor === 'black' ? 'bg-white border' : 'bg-gray-800'}`} />
              <span className="text-sm font-medium">{opponentName}</span>
              {!isGameOver && !isMyTurn && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-auto">
                  Thinking...
                </span>
              )}
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

            {/* Player info bar (bottom) */}
            <div className="flex items-center gap-2 mt-2 px-1" data-testid="player-info">
              <div className={`w-3 h-3 rounded-full ${playerColor === 'white' ? 'bg-white border' : 'bg-gray-800'}`} />
              <span className="text-sm font-medium">{myName} (You)</span>
              {!isGameOver && isMyTurn && (
                <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full ml-auto">
                  Your turn
                </span>
              )}
            </div>
          </div>

          {/* Side panel */}
          <div className="w-full lg:w-72 space-y-3" data-testid="online-side-panel">
            {/* Turn / Status */}
            <Card data-testid="online-status-card">
              <CardContent className="py-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Turn:</span>
                    <span className="font-medium" data-testid="online-current-turn">
                      {gameState.currentTurn === 'white' ? 'White' : 'Black'}
                      {isMyTurn && !isGameOver && ' (You)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Move:</span>
                    <span className="font-medium">{gameState.moveNumber}</span>
                  </div>
                  {gameState.isCheck && !gameState.isCheckmate && (
                    <div className="text-orange-600 font-medium text-center py-1 bg-orange-500/10 rounded" data-testid="online-check-indicator">
                      Check!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Captured */}
            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs text-muted-foreground font-medium">Captured</CardTitle>
              </CardHeader>
              <CardContent className="pb-3 px-4">
                <CapturedPieces
                  whiteCaptured={gameState.capturedPieces.white}
                  blackCaptured={gameState.capturedPieces.black}
                  compact
                />
              </CardContent>
            </Card>

            {/* Move history */}
            <div data-testid="online-move-history">
              <MoveHistory moves={gameState.moveHistory} maxHeight="200px" />
            </div>

            {/* Actions */}
            {!isGameOver && playerColor && (
              <div className="space-y-2">
                {!showResignConfirm ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setShowResignConfirm(true)}
                    data-testid="resign-button"
                  >
                    <Flag className="w-4 h-4 mr-2" />
                    Resign
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={handleResign}
                      data-testid="confirm-resign-button"
                    >
                      Confirm
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => setShowResignConfirm(false)}
                      data-testid="cancel-resign-button"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
