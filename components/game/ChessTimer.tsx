'use client';

/**
 * Chess Timer Component
 * Displays a player's clock with real-time countdown and low-time warning.
 */

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';

interface ChessTimerProps {
  timeMs: number;        // Remaining time in milliseconds
  isActive: boolean;     // Is this player's clock running?
  isLowTime?: boolean;   // < 10 seconds
  playerName: string;
  playerColor: 'white' | 'black';
  compact?: boolean;
}

function formatTime(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}:${String(mins).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export const ChessTimer = memo(function ChessTimer({
  timeMs,
  isActive,
  isLowTime,
  playerName,
  playerColor,
  compact = false,
}: ChessTimerProps) {
  const isTimeout = timeMs <= 0;
  const showWarning = isLowTime && isActive && !isTimeout;

  return (
    <div
      data-testid={`timer-${playerColor}`}
      className={cn(
        'flex items-center justify-between rounded-lg px-3 transition-all',
        compact ? 'py-2' : 'py-2.5',
        isActive
          ? 'bg-[#b94a4a] text-white shadow-md'
          : 'bg-zinc-800 text-zinc-300',
        showWarning && 'animate-pulse bg-red-700',
        isTimeout && 'bg-red-900 text-red-200',
      )}
    >
      {/* Player info */}
      <div className="flex items-center gap-2 min-w-0">
        <div className={cn(
          'w-3 h-3 rounded-full flex-shrink-0',
          playerColor === 'white' ? 'bg-white' : 'bg-zinc-950 border border-zinc-600',
        )} />
        <span className={cn(
          'truncate font-medium',
          compact ? 'text-xs' : 'text-sm',
        )}>{playerName}</span>
      </div>

      {/* Timer display */}
      <div className={cn(
        'flex items-center gap-1.5 font-mono font-bold tabular-nums flex-shrink-0',
        compact ? 'text-lg' : 'text-xl',
        showWarning && 'text-red-200',
      )}>
        {showWarning && <Clock className="w-4 h-4 animate-pulse" />}
        <span data-testid={`timer-display-${playerColor}`}>
          {formatTime(timeMs)}
        </span>
      </div>
    </div>
  );
});

export default ChessTimer;
