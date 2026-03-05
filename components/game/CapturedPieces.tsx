'use client';

/**
 * Captured Pieces Display Component
 * 
 * Shows pieces captured by each player.
 */

import { memo } from 'react';
import { Piece, PieceColor, PieceType } from '@/lib/xchess/types';
import { cn } from '@/lib/utils';

interface CapturedPiecesProps {
  whiteCaptured: Piece[];  // Pieces captured by white
  blackCaptured: Piece[];  // Pieces captured by black
  compact?: boolean;
}

const PIECE_UNICODE: Record<PieceType, string> = {
  king: '♚',
  queen: '♛',
  rook: '♜',
  bishop: '♝',
  knight: '♞',
  pawn: '♟',
  archer: '🏹',
};

const PIECE_VALUES: Record<PieceType, number> = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  archer: 4,
  queen: 9,
  king: 0,
};

function calculateMaterialAdvantage(captured: Piece[]): number {
  return captured.reduce((sum, p) => sum + PIECE_VALUES[p.type], 0);
}

function sortPieces(pieces: Piece[]): Piece[] {
  const order: PieceType[] = ['queen', 'rook', 'archer', 'bishop', 'knight', 'pawn'];
  return [...pieces].sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
}

interface CapturedRowProps {
  pieces: Piece[];
  label: string;
  advantage: number;
  compact: boolean;
}

function CapturedRow({ pieces, label, advantage, compact }: CapturedRowProps) {
  const sortedPieces = sortPieces(pieces);
  const displayColor = pieces[0]?.color || 'white';
  
  return (
    <div className={cn('flex items-center gap-2', compact && 'gap-1')}>
      <span className={cn('text-xs text-muted-foreground', compact ? 'w-12' : 'w-14')}>
        {label}
      </span>
      <div className="flex flex-wrap gap-0.5">
        {sortedPieces.map((piece, i) => (
          <span
            key={i}
            className={cn(
              'transition-transform hover:scale-110',
              compact ? 'text-lg' : 'text-xl',
              displayColor === 'white'
                ? 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]'
                : 'text-gray-800'
            )}
          >
            {PIECE_UNICODE[piece.type]}
          </span>
        ))}
        {pieces.length === 0 && (
          <span className="text-xs text-muted-foreground">-</span>
        )}
      </div>
      {advantage > 0 && (
        <span className="text-xs text-green-600 font-medium ml-auto">
          +{advantage}
        </span>
      )}
    </div>
  );
}

export const CapturedPieces = memo(function CapturedPieces({
  whiteCaptured,
  blackCaptured,
  compact = false,
}: CapturedPiecesProps) {
  const whiteMaterial = calculateMaterialAdvantage(whiteCaptured);
  const blackMaterial = calculateMaterialAdvantage(blackCaptured);
  const whiteAdvantage = whiteMaterial - blackMaterial;
  const blackAdvantage = blackMaterial - whiteMaterial;
  
  return (
    <div className={cn('space-y-2', compact && 'space-y-1')}>
      <CapturedRow
        pieces={whiteCaptured}
        label="White:"
        advantage={whiteAdvantage > 0 ? whiteAdvantage : 0}
        compact={compact}
      />
      <CapturedRow
        pieces={blackCaptured}
        label="Black:"
        advantage={blackAdvantage > 0 ? blackAdvantage : 0}
        compact={compact}
      />
    </div>
  );
});

export default CapturedPieces;
