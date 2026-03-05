'use client';

/**
 * Game Replay Page
 * 
 * View and replay completed games.
 */

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ReplayViewer } from '@/components/game/ReplayViewer';
import { ChessBoard } from '@/components/game/ChessBoard';
import { getGameForReplay } from '@/lib/xchess/state';
import { ReplayState } from '@/lib/xchess/replay';
import { GameState } from '@/lib/xchess/types';

export default function ReplayPage() {
  const params = useParams();
  const gameId = params.gameId as string;
  
  const [replay, setReplay] = useState<ReplayState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function loadGame() {
      try {
        const replayState = await getGameForReplay(gameId);
        if (replayState) {
          setReplay(replayState);
        } else {
          setError('Game not found');
        }
      } catch (err) {
        console.error('Failed to load game:', err);
        setError('Failed to load game');
      } finally {
        setLoading(false);
      }
    }
    
    if (gameId) {
      loadGame();
    }
  }, [gameId]);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error || !replay) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error || 'Game not found'}</p>
            <Link href="/">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="font-semibold">Game Replay</h1>
          <span className="text-sm text-muted-foreground">
            {replay.gameMode === 'v2_artillery' ? 'XChess Artillery' : 'Classical'}
          </span>
        </div>
      </header>
      
      {/* Replay Viewer */}
      <main className="container mx-auto px-4 py-8">
        <ReplayViewer
          initialReplay={replay}
          renderBoard={(state: GameState) => (
            <div className="flex justify-center">
              <ChessBoard state={state} showCoordinates />
            </div>
          )}
        />
      </main>
    </div>
  );
}
