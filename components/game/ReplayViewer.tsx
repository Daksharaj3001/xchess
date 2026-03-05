'use client';

/**
 * XChess Replay Viewer Component
 * 
 * Allows stepping through games move by move.
 * Features:
 * - Step forward/backward
 * - Jump to specific move
 * - Move list with click navigation
 * - Keyboard shortcuts
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Play,
  Pause,
} from 'lucide-react';
import {
  ReplayState,
  stepForward,
  stepBackward,
  jumpToMove,
  jumpToStart,
  jumpToEnd,
  getCurrentMove,
  getFormattedMoveList,
} from '@/lib/xchess/replay';
import { GameState } from '@/lib/xchess/types';

interface ReplayViewerProps {
  initialReplay: ReplayState;
  onStateChange?: (state: GameState) => void;
  renderBoard: (state: GameState) => React.ReactNode;
}

export function ReplayViewer({
  initialReplay,
  onStateChange,
  renderBoard,
}: ReplayViewerProps) {
  const [replay, setReplay] = useState<ReplayState>(initialReplay);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1000); // ms per move
  
  // Format move list for display
  const moveList = getFormattedMoveList(replay.moves);
  
  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.(replay.currentState);
  }, [replay.currentState, onStateChange]);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          handleStepBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleStepForward();
          break;
        case 'Home':
          e.preventDefault();
          handleJumpToStart();
          break;
        case 'End':
          e.preventDefault();
          handleJumpToEnd();
          break;
        case ' ':
          e.preventDefault();
          setIsPlaying(prev => !prev);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying || replay.isAtEnd) {
      setIsPlaying(false);
      return;
    }
    
    const timer = setTimeout(() => {
      setReplay(prev => stepForward(prev));
    }, playbackSpeed);
    
    return () => clearTimeout(timer);
  }, [isPlaying, replay, playbackSpeed]);
  
  // Navigation handlers
  const handleStepForward = useCallback(() => {
    setReplay(prev => stepForward(prev));
  }, []);
  
  const handleStepBackward = useCallback(() => {
    setReplay(prev => stepBackward(prev));
  }, []);
  
  const handleJumpToStart = useCallback(() => {
    setReplay(prev => jumpToStart(prev));
  }, []);
  
  const handleJumpToEnd = useCallback(() => {
    setReplay(prev => jumpToEnd(prev));
  }, []);
  
  const handleJumpToMove = useCallback((index: number) => {
    setReplay(prev => jumpToMove(prev, index));
  }, []);
  
  const handleSliderChange = useCallback((value: number[]) => {
    const index = value[0] - 1; // Slider is 0 to totalMoves, index is -1 to totalMoves-1
    setReplay(prev => jumpToMove(prev, index));
  }, []);
  
  const togglePlayback = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);
  
  // Get current move info
  const currentMove = getCurrentMove(replay);
  const displayMoveNumber = replay.currentMoveIndex + 1;
  
  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Board Area */}
      <div className="flex-1">
        {renderBoard(replay.currentState)}
        
        {/* Controls */}
        <Card className="mt-4">
          <CardContent className="pt-4">
            {/* Progress Slider */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>Start</span>
                <span>
                  {displayMoveNumber > 0 
                    ? `Move ${Math.ceil(displayMoveNumber / 2)}${displayMoveNumber % 2 === 1 ? ' (White)' : ' (Black)'}`
                    : 'Initial Position'
                  }
                </span>
                <span>End</span>
              </div>
              <Slider
                value={[displayMoveNumber]}
                min={0}
                max={replay.totalMoves}
                step={1}
                onValueChange={handleSliderChange}
                className="w-full"
              />
            </div>
            
            {/* Navigation Buttons */}
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleJumpToStart}
                disabled={replay.isAtStart}
                title="Jump to start (Home)"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                onClick={handleStepBackward}
                disabled={replay.isAtStart}
                title="Step backward (←)"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Button
                variant={isPlaying ? 'default' : 'outline'}
                size="icon"
                onClick={togglePlayback}
                disabled={replay.isAtEnd}
                title="Play/Pause (Space)"
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                onClick={handleStepForward}
                disabled={replay.isAtEnd}
                title="Step forward (→)"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              
              <Button
                variant="outline"
                size="icon"
                onClick={handleJumpToEnd}
                disabled={replay.isAtEnd}
                title="Jump to end (End)"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Keyboard hints */}
            <p className="text-xs text-center text-muted-foreground mt-3">
              Use arrow keys to navigate, Space to play/pause
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Move List */}
      <Card className="w-full lg:w-64">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Move History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <div className="p-2">
              {/* Initial position */}
              <div
                className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                  replay.currentMoveIndex === -1
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
                onClick={() => handleJumpToMove(-1)}
              >
                <span className="text-xs text-muted-foreground w-8">-</span>
                <span className="text-sm">Initial Position</span>
              </div>
              
              {/* Moves */}
              {moveList.map((entry) => (
                <div key={entry.moveNumber} className="flex items-center gap-1 py-1">
                  <span className="text-xs text-muted-foreground w-8">
                    {entry.moveNumber}.
                  </span>
                  
                  {/* White's move */}
                  {entry.white && (
                    <button
                      className={`flex-1 text-left px-2 py-1 rounded text-sm transition-colors ${
                        replay.currentMoveIndex === entry.white.index
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => handleJumpToMove(entry.white!.index)}
                    >
                      {entry.white.san}
                    </button>
                  )}
                  
                  {/* Black's move */}
                  {entry.black && (
                    <button
                      className={`flex-1 text-left px-2 py-1 rounded text-sm transition-colors ${
                        replay.currentMoveIndex === entry.black.index
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => handleJumpToMove(entry.black!.index)}
                    >
                      {entry.black.san}
                    </button>
                  )}
                </div>
              ))}
              
              {moveList.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No moves yet
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

export default ReplayViewer;
