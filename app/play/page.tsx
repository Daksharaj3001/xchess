'use client';

/**
 * Play Game Page
 * 
 * Interactive game page with full board UI.
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { InteractiveBoard } from '@/components/game/InteractiveBoard';
import { MoveHistory } from '@/components/game/MoveHistory';
import { CapturedPieces } from '@/components/game/CapturedPieces';
import { createGame, getLegalMoves, applyMove } from '@/lib/xchess/engine';
import { GameState, LegalMove, Position, PieceType, GameMode } from '@/lib/xchess/types';
import { ArrowLeft, RotateCcw, Swords, Target } from 'lucide-react';
import { Suspense } from 'react';

function PlayContent() {
  const searchParams = useSearchParams();
  const mode = (searchParams.get('mode') || 'v1_classical') as GameMode;
  
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [legalMoves, setLegalMoves] = useState<LegalMove[]>([]);
  const [isFlipped, setIsFlipped] = useState(false);
  
  // Initialize game
  useEffect(() => {
    const state = createGame(mode);
    setGameState(state);
    setLegalMoves(getLegalMoves(state));
  }, [mode]);
  
  // Handle move
  const handleMove = async (
    from: Position,
    to: Position,
    promotion?: PieceType,
    archerTargets?: Position[]
  ): Promise<boolean> => {
    if (!gameState) return false;
    
    const result = applyMove(gameState, from, to, promotion, archerTargets);
    
    if (result.success && result.newState) {
      setGameState(result.newState);
      setLegalMoves(getLegalMoves(result.newState));
      return true;
    }
    
    return false;
  };
  
  // Reset game
  const handleReset = () => {
    const state = createGame(mode);
    setGameState(state);
    setLegalMoves(getLegalMoves(state));
  };
  
  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background" data-testid="play-page">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/play/select">
            <Button variant="ghost" size="sm" data-testid="back-button">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="font-semibold flex items-center gap-2" data-testid="game-mode-title">
            {mode === 'v2_artillery' ? (
              <><Target className="w-5 h-5" /> XChess Artillery</>
            ) : (
              <><Swords className="w-5 h-5" /> Classical Mode</>
            )}
          </h1>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsFlipped(!isFlipped)} data-testid="flip-board-button">
              <RotateCcw className="w-4 h-4 mr-1" />
              Flip
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset} data-testid="new-game-button">
              New Game
            </Button>
          </div>
        </div>
      </header>
      
      {/* Game area */}
      <main className="container mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start justify-center">
          {/* Board */}
          <div className="flex-shrink-0" data-testid="chess-board-container">
            <InteractiveBoard
              state={gameState}
              legalMoves={legalMoves}
              onMove={handleMove}
              playerColor={gameState.currentTurn}  // Hot-seat mode
              flipped={isFlipped}
              showCoordinates
            />
          </div>
          
          {/* Side panel */}
          <div className="w-full lg:w-72 space-y-4" data-testid="game-side-panel">
            {/* Game status */}
            <Card data-testid="game-status-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Game Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Turn:</span>
                    <span className="font-medium" data-testid="current-turn">
                      {gameState.currentTurn === 'white' ? 'White' : 'Black'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Move:</span>
                    <span className="font-medium" data-testid="move-number">{gameState.moveNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mode:</span>
                    <span className="font-medium" data-testid="board-size">
                      {gameState.board.length}x{gameState.board.length}
                    </span>
                  </div>
                  {gameState.isCheck && !gameState.isCheckmate && (
                    <div className="text-orange-600 font-medium" data-testid="check-indicator">Check!</div>
                  )}
                  {gameState.isCheckmate && (
                    <div className="text-red-600 font-medium" data-testid="checkmate-indicator">
                      Checkmate! {gameState.winner} wins!
                    </div>
                  )}
                  {gameState.isStalemate && (
                    <div className="text-yellow-600 font-medium" data-testid="stalemate-indicator">Stalemate!</div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Captured pieces */}
            <Card data-testid="captured-pieces-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Captured</CardTitle>
              </CardHeader>
              <CardContent>
                <CapturedPieces
                  whiteCaptured={gameState.capturedPieces.white}
                  blackCaptured={gameState.capturedPieces.black}
                  compact
                />
              </CardContent>
            </Card>
            
            {/* Move history */}
            <div data-testid="move-history-panel">
              <MoveHistory
                moves={gameState.moveHistory}
                maxHeight="250px"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PlayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    }>
      <PlayContent />
    </Suspense>
  );
}
