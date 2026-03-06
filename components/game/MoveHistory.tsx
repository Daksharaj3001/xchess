'use client';

/**
 * Move History Panel Component
 * 
 * Displays game move list with navigation.
 */

import { memo, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Move } from '@/lib/xchess/types';
import { cn } from '@/lib/utils';

interface MoveHistoryProps {
  moves: Move[];
  currentMoveIndex?: number;  // For replay mode
  onMoveClick?: (index: number) => void;
  maxHeight?: string;
}

interface FormattedMove {
  moveNumber: number;
  white: { san: string; index: number } | null;
  black: { san: string; index: number } | null;
}

function formatMoves(moves: Move[]): FormattedMove[] {
  const formatted: FormattedMove[] = [];
  
  for (let i = 0; i < moves.length; i += 2) {
    const whiteMove = moves[i];
    const blackMove = moves[i + 1];
    const moveNumber = Math.floor(i / 2) + 1;
    
    formatted.push({
      moveNumber,
      white: whiteMove ? {
        san: getMoveNotation(whiteMove),
        index: i,
      } : null,
      black: blackMove ? {
        san: getMoveNotation(blackMove),
        index: i + 1,
      } : null,
    });
  }
  
  return formatted;
}

function getMoveNotation(move: Move): string {
  // Generate simple notation from move data
  const pieceSymbols: Record<string, string> = {
    king: 'K',
    queen: 'Q',
    rook: 'R',
    bishop: 'B',
    knight: 'N',
    archer: 'A',
    pawn: '',
  };
  
  if (move.moveType === 'castle_kingside') return 'O-O';
  if (move.moveType === 'castle_queenside') return 'O-O-O';
  
  if (move.moveType === 'archer_fire' && move.archerTargets) {
    const targets = move.archerTargets
      .map(t => String.fromCharCode('a'.charCodeAt(0) + t.col) + (t.row + 1))
      .join(',');
    return `A@${targets}`;
  }
  
  const symbol = pieceSymbols[move.piece.type] || '';
  const to = String.fromCharCode('a'.charCodeAt(0) + move.to.col) + (move.to.row + 1);
  const capture = move.capturedPiece ? 'x' : '';
  
  if (move.piece.type === 'pawn' && capture) {
    const fromFile = String.fromCharCode('a'.charCodeAt(0) + move.from.col);
    return `${fromFile}x${to}${move.promotionPiece ? '=' + pieceSymbols[move.promotionPiece] : ''}`;
  }
  
  return `${symbol}${capture}${to}${move.promotionPiece ? '=' + pieceSymbols[move.promotionPiece] : ''}`;
}

export const MoveHistory = memo(function MoveHistory({
  moves,
  currentMoveIndex,
  onMoveClick,
  maxHeight = '400px',
}: MoveHistoryProps) {
  const formattedMoves = formatMoves(moves);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  
  // Auto-scroll to current move
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [currentMoveIndex]);
  
  return (
    <Card className="bg-zinc-800 border-zinc-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between text-zinc-200">
          <span>Moves</span>
          <span className="text-xs text-zinc-500 font-normal">
            {moves.length} move{moves.length !== 1 ? 's' : ''}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea style={{ maxHeight }} ref={scrollRef}>
          <div className="p-2 space-y-0.5">
            {formattedMoves.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-4">
                No moves yet
              </p>
            ) : (
              formattedMoves.map((entry) => (
                <div key={entry.moveNumber} className="flex items-center gap-1 text-sm">
                  <span className="text-zinc-500 w-6 text-right text-xs">
                    {entry.moveNumber}.
                  </span>
                  
                  {entry.white && (
                    <button
                      ref={currentMoveIndex === entry.white.index ? activeRef : undefined}
                      onClick={() => onMoveClick?.(entry.white!.index)}
                      disabled={!onMoveClick}
                      className={cn(
                        'flex-1 text-left px-2 py-1 rounded transition-colors text-zinc-200',
                        onMoveClick && 'hover:bg-zinc-700 cursor-pointer',
                        currentMoveIndex === entry.white.index && 'bg-[#b94a4a] text-white'
                      )}
                    >
                      {entry.white.san}
                    </button>
                  )}
                  
                  {entry.black && (
                    <button
                      ref={currentMoveIndex === entry.black.index ? activeRef : undefined}
                      onClick={() => onMoveClick?.(entry.black!.index)}
                      disabled={!onMoveClick}
                      className={cn(
                        'flex-1 text-left px-2 py-1 rounded transition-colors text-zinc-200',
                        onMoveClick && 'hover:bg-zinc-700 cursor-pointer',
                        currentMoveIndex === entry.black.index && 'bg-[#b94a4a] text-white'
                      )}
                    >
                      {entry.black.san}
                    </button>
                  )}
                  
                  {!entry.black && <div className="flex-1" />}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
});

export default MoveHistory;
