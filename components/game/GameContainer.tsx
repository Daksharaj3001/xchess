'use client';

/**
 * Complete Game Container Component
 * 
 * Combines all game UI elements:
 * - Interactive board
 * - Game info panel
 * - Move history
 * - Captured pieces
 * - Real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import { InteractiveBoard } from './InteractiveBoard';
import { MoveHistory } from './MoveHistory';
import { CapturedPieces } from './CapturedPieces';
import { GameInfoPanel } from './GameInfoPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import {
  GameState,
  LegalMove,
  Position,
  PieceType,
  PieceColor,
} from '@/lib/xchess/types';
import { applyMove, getLegalMoves } from '@/lib/xchess/engine';
import { Flag, RotateCcw, MessageSquare } from 'lucide-react';
import { trackGameFinished } from '@/lib/firebase/analytics';

interface Player {
  id: string;
  username: string;
  avatarUrl?: string;
  rating?: number;
}

interface GameContainerProps {
  gameId: string;
  initialState: GameState;
  initialLegalMoves: LegalMove[];
  playerColor: PieceColor | null;  // null = spectator
  whitePlayer: Player | null;
  blackPlayer: Player | null;
  whiteTimeRemaining?: number;
  blackTimeRemaining?: number;
  onGameEnd?: (result: string) => void;
}

export function GameContainer({
  gameId,
  initialState,
  initialLegalMoves,
  playerColor,
  whitePlayer,
  blackPlayer,
  whiteTimeRemaining,
  blackTimeRemaining,
  onGameEnd,
}: GameContainerProps) {
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [legalMoves, setLegalMoves] = useState<LegalMove[]>(initialLegalMoves);
  const [whiteTime, setWhiteTime] = useState(whiteTimeRemaining);
  const [blackTime, setBlackTime] = useState(blackTimeRemaining);
  const [isFlipped, setIsFlipped] = useState(playerColor === 'black');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const supabase = createClient();
  const isSpectator = playerColor === null;
  
  // Subscribe to real-time game updates
  useEffect(() => {
    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          console.log('Game updated:', payload);
          // Refresh game state
          // In production, we'd reconstruct from the updated data
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'game_moves',
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          console.log('New move:', payload);
          // Apply the move to local state
          // This handles opponent's moves in real-time
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, supabase]);
  
  // Timer countdown
  useEffect(() => {
    if (gameState.isCheckmate || gameState.isStalemate) return;
    if (whiteTime === undefined || blackTime === undefined) return;
    
    const interval = setInterval(() => {
      if (gameState.currentTurn === 'white') {
        setWhiteTime(prev => prev !== undefined ? Math.max(0, prev - 1000) : undefined);
      } else {
        setBlackTime(prev => prev !== undefined ? Math.max(0, prev - 1000) : undefined);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [gameState.currentTurn, gameState.isCheckmate, gameState.isStalemate, whiteTime, blackTime]);
  
  // Handle move submission
  const handleMove = useCallback(async (
    from: Position,
    to: Position,
    promotion?: PieceType,
    archerTargets?: Position[]
  ): Promise<boolean> => {
    if (isSubmitting) return false;
    
    setIsSubmitting(true);
    
    try {
      // Apply move locally first for optimistic update
      const result = applyMove(gameState, from, to, promotion, archerTargets);
      
      if (!result.success || !result.newState) {
        console.error('Move failed:', result.error);
        return false;
      }
      
      // Update local state optimistically
      setGameState(result.newState);
      setLegalMoves(getLegalMoves(result.newState));
      
      // Send to server
      const response = await fetch(`/api/games/${gameId}/moves`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to,
          promotionPiece: promotion,
          archerTargets,
        }),
      });
      
      if (!response.ok) {
        // Revert on failure
        const error = await response.json();
        console.error('Server rejected move:', error);
        setGameState(gameState);
        setLegalMoves(legalMoves);
        return false;
      }
      
      const data = await response.json();
      
      // Check for game end
      if (data.isCheckmate || data.isStalemate) {
        const resultStr = data.isCheckmate 
          ? (gameState.currentTurn === 'white' ? 'white_wins' : 'black_wins')
          : 'draw';
        
        const resultLabel = data.isCheckmate 
          ? (gameState.currentTurn === 'white' ? 'win' : 'win')
          : 'draw';
        
        trackGameFinished(
          resultLabel,
          'online',
          gameState.moveNumber
        );
        
        onGameEnd?.(resultStr);
      }
      
      return true;
    } catch (error) {
      console.error('Move submission error:', error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [gameId, gameState, legalMoves, isSubmitting, onGameEnd]);
  
  // Handle resign
  const handleResign = useCallback(async () => {
    if (isSpectator) return;
    
    const confirmed = window.confirm('Are you sure you want to resign?');
    if (!confirmed) return;
    
    try {
      await fetch(`/api/games/${gameId}/resign`, {
        method: 'POST',
      });
      
      onGameEnd?.(playerColor === 'white' ? 'black_wins' : 'white_wins');
    } catch (error) {
      console.error('Resign failed:', error);
    }
  }, [gameId, isSpectator, playerColor, onGameEnd]);
  
  // Handle flip board
  const handleFlipBoard = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);
  
  const isGameOver = gameState.isCheckmate || gameState.isStalemate;
  
  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
      {/* Main board area */}
      <div className="flex-shrink-0">
        <InteractiveBoard
          state={gameState}
          legalMoves={legalMoves}
          onMove={handleMove}
          playerColor={playerColor}
          flipped={isFlipped}
          disabled={isSubmitting || isGameOver}
          showCoordinates
          gameId={gameId}
        />
        
        {/* Board controls */}
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFlipBoard}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Flip
          </Button>
          
          {!isSpectator && !isGameOver && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResign}
              className="text-destructive"
            >
              <Flag className="w-4 h-4 mr-1" />
              Resign
            </Button>
          )}
        </div>
      </div>
      
      {/* Side panel */}
      <div className="flex-1 space-y-4 min-w-0 lg:max-w-xs">
        {/* Game info */}
        <GameInfoPanel
          whitePlayer={whitePlayer}
          blackPlayer={blackPlayer}
          currentTurn={gameState.currentTurn}
          whiteTime={whiteTime}
          blackTime={blackTime}
          isCheck={gameState.isCheck}
          isCheckmate={gameState.isCheckmate}
          isStalemate={gameState.isStalemate}
          winner={gameState.winner}
          gameMode={gameState.gameMode}
          flipped={isFlipped}
        />
        
        {/* Captured pieces */}
        <Card>
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
        <MoveHistory
          moves={gameState.moveHistory}
          maxHeight="200px"
        />
      </div>
    </div>
  );
}

export default GameContainer;
