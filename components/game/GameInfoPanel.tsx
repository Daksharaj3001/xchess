'use client';

/**
 * Game Info Panel Component
 * 
 * Displays game information including:
 * - Player names and ratings
 * - Time controls
 * - Game status
 */

import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PieceColor } from '@/lib/xchess/types';
import { cn } from '@/lib/utils';
import { Clock, Crown } from 'lucide-react';

interface Player {
  id: string;
  username: string;
  avatarUrl?: string;
  rating?: number;
}

interface GameInfoPanelProps {
  whitePlayer: Player | null;
  blackPlayer: Player | null;
  currentTurn: PieceColor;
  whiteTime?: number;  // milliseconds
  blackTime?: number;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  winner?: PieceColor | null;
  gameMode: string;
  flipped?: boolean;
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

interface PlayerCardProps {
  player: Player | null;
  color: PieceColor;
  time?: number;
  isActive: boolean;
  isWinner: boolean;
}

const PlayerCard = memo(function PlayerCard({
  player,
  color,
  time,
  isActive,
  isWinner,
}: PlayerCardProps) {
  const displayName = player?.username || (color === 'white' ? 'White' : 'Black');
  const initials = displayName.slice(0, 2).toUpperCase();
  
  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-lg transition-colors',
      isActive && !isWinner && 'bg-primary/10 ring-2 ring-primary',
      isWinner && 'bg-green-500/10 ring-2 ring-green-500'
    )}>
      <Avatar className="h-10 w-10">
        <AvatarImage src={player?.avatarUrl} alt={displayName} />
        <AvatarFallback className={cn(
          color === 'white' ? 'bg-white text-gray-900' : 'bg-gray-900 text-white'
        )}>
          {initials}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{displayName}</span>
          {isWinner && <Crown className="w-4 h-4 text-yellow-500" />}
        </div>
        {player?.rating && (
          <span className="text-xs text-muted-foreground">{player.rating}</span>
        )}
      </div>
      
      {time !== undefined && (
        <div className={cn(
          'flex items-center gap-1 px-2 py-1 rounded font-mono text-sm',
          isActive ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}>
          <Clock className="w-3 h-3" />
          {formatTime(time)}
        </div>
      )}
    </div>
  );
});

export const GameInfoPanel = memo(function GameInfoPanel({
  whitePlayer,
  blackPlayer,
  currentTurn,
  whiteTime,
  blackTime,
  isCheck,
  isCheckmate,
  isStalemate,
  winner,
  gameMode,
  flipped = false,
}: GameInfoPanelProps) {
  const isGameOver = isCheckmate || isStalemate;
  
  const topPlayer = flipped ? whitePlayer : blackPlayer;
  const topColor: PieceColor = flipped ? 'white' : 'black';
  const topTime = flipped ? whiteTime : blackTime;
  
  const bottomPlayer = flipped ? blackPlayer : whitePlayer;
  const bottomColor: PieceColor = flipped ? 'black' : 'white';
  const bottomTime = flipped ? blackTime : whiteTime;
  
  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Top player (opponent from perspective) */}
        <PlayerCard
          player={topPlayer}
          color={topColor}
          time={topTime}
          isActive={!isGameOver && currentTurn === topColor}
          isWinner={winner === topColor}
        />
        
        {/* Game status */}
        <div className="flex items-center justify-center gap-2">
          <Badge variant={isGameOver ? 'default' : 'secondary'}>
            {gameMode === 'v2_artillery' ? 'XChess' : 'Classical'}
          </Badge>
          
          {isCheckmate && (
            <Badge variant="destructive">Checkmate</Badge>
          )}
          {isStalemate && (
            <Badge variant="outline">Stalemate</Badge>
          )}
          {isCheck && !isCheckmate && (
            <Badge variant="destructive">Check</Badge>
          )}
        </div>
        
        {/* Bottom player (you) */}
        <PlayerCard
          player={bottomPlayer}
          color={bottomColor}
          time={bottomTime}
          isActive={!isGameOver && currentTurn === bottomColor}
          isWinner={winner === bottomColor}
        />
      </CardContent>
    </Card>
  );
});

export default GameInfoPanel;
