'use client';

/**
 * SVG Chess Piece Components
 * Clean, scalable vector pieces for the XChess board.
 */

import React, { memo } from 'react';
import type { PieceType, PieceColor } from '@/lib/xchess/types';

interface PieceSVGProps {
  type: PieceType;
  color: PieceColor;
  size?: number;
}

const FILL = { white: '#fff', black: '#1a1a2e' };
const STROKE = { white: '#333', black: '#000' };
const SW = 1.5;

// Each piece is drawn in a 45x45 viewBox
function King({ color }: { color: PieceColor }) {
  const f = FILL[color], s = STROKE[color];
  return (
    <svg viewBox="0 0 45 45" className="w-full h-full">
      <g fill={f} stroke={s} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
        <line x1="22.5" y1="11.63" x2="22.5" y2="6" />
        <line x1="20" y1="8" x2="25" y2="8" />
        <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" />
        <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" />
        <path d="M11.5 30c5.5-3 15.5-3 21 0" fill="none" />
        <path d="M11.5 33.5c5.5-3 15.5-3 21 0" fill="none" />
        <path d="M11.5 37c5.5-3 15.5-3 21 0" fill="none" />
      </g>
    </svg>
  );
}

function Queen({ color }: { color: PieceColor }) {
  const f = FILL[color], s = STROKE[color];
  return (
    <svg viewBox="0 0 45 45" className="w-full h-full">
      <g fill={f} stroke={s} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
        {[6, 14, 22.5, 31, 39].map((cx, i) => (
          <circle key={i} cx={cx} cy="12" r="2.75" />
        ))}
        <path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-3.5-12.5-5 12.5-5-12.5-3.5 12.5-7.5-13L9 26z" />
        <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" />
        <path d="M11.5 30c3.5-1 18.5-1 22 0" fill="none" />
        <path d="M12 33.5c6-1 15-1 21 0" fill="none" />
      </g>
    </svg>
  );
}

function Rook({ color }: { color: PieceColor }) {
  const f = FILL[color], s = STROKE[color];
  return (
    <svg viewBox="0 0 45 45" className="w-full h-full">
      <g fill={f} stroke={s} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 39h27v-3H9v3zm3.5-7l1.5-2.5h17l1.5 2.5h-20zm-.5 4v-4h21v4H12z" />
        <path d="M14 29.5v-13h17v13H14z" />
        <path d="M14 16.5L11 14h23l-3 2.5H14z" />
        <path d="M11 14V9h4v2h5V9h5v2h5V9h4v5H11z" />
        <path d="M12 35.5h21" fill="none" />
        <path d="M13 31.5h19" fill="none" />
        <path d="M14 29.5h17" fill="none" />
      </g>
    </svg>
  );
}

function Bishop({ color }: { color: PieceColor }) {
  const f = FILL[color], s = STROKE[color];
  return (
    <svg viewBox="0 0 45 45" className="w-full h-full">
      <g fill={f} stroke={s} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
        <g>
          <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z" />
          <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" />
          <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" />
        </g>
        <path d="M17.5 26h10M15 30h15" fill="none" stroke={s} />
      </g>
    </svg>
  );
}

function Knight({ color }: { color: PieceColor }) {
  const f = FILL[color], s = STROKE[color];
  return (
    <svg viewBox="0 0 45 45" className="w-full h-full">
      <g fill={f} stroke={s} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" />
        <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" />
        <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z" fill={s} />
        <path d="M14.933 15.75a.5 1.5 30 1 1-.866-.5.5 1.5 30 1 1 .866.5z" fill={s} />
      </g>
    </svg>
  );
}

function Pawn({ color }: { color: PieceColor }) {
  const f = FILL[color], s = STROKE[color];
  return (
    <svg viewBox="0 0 45 45" className="w-full h-full">
      <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03C15.41 27.09 11 31.58 11 39.5H34c0-7.92-4.41-12.41-7.41-13.47C28.06 24.84 29 23.03 29 21c0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z"
        fill={f} stroke={s} strokeWidth={SW} strokeLinecap="round" />
    </svg>
  );
}

function Archer({ color }: { color: PieceColor }) {
  const f = FILL[color], s = STROKE[color];
  return (
    <svg viewBox="0 0 45 45" className="w-full h-full">
      <g fill="none" stroke={s} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round">
        {/* Bow */}
        <path d="M10 8 Q6 22.5 10 37" strokeWidth={2} />
        {/* Bowstring */}
        <line x1="10" y1="8" x2="10" y2="37" strokeWidth={1} />
        {/* Arrow shaft */}
        <line x1="10" y1="22.5" x2="38" y2="22.5" strokeWidth={1.5} />
        {/* Arrowhead */}
        <path d="M38 22.5 L33 19 L33 26 Z" fill={f} stroke={s} strokeWidth={1} />
        {/* Fletching */}
        <path d="M12 22.5 L15 19 M12 22.5 L15 26" strokeWidth={1} />
      </g>
      {/* Base stand */}
      <path d="M8 38h29v2H8z" fill={f} stroke={s} strokeWidth={1} />
    </svg>
  );
}

const PIECE_MAP: Record<PieceType, React.ComponentType<{ color: PieceColor }>> = {
  king: King,
  queen: Queen,
  rook: Rook,
  bishop: Bishop,
  knight: Knight,
  pawn: Pawn,
  archer: Archer,
};

export const PieceSVG = memo(function PieceSVG({ type, color, size = 40 }: PieceSVGProps) {
  const Component = PIECE_MAP[type];
  return (
    <div
      style={{ width: size, height: size }}
      className="pointer-events-none select-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]"
    >
      <Component color={color} />
    </div>
  );
});

export default PieceSVG;
