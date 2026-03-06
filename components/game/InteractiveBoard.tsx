'use client';

/**
 * XChess Interactive Board Component — Red Theme
 * 
 * Chess.com-style board with:
 * - Red theme squares (#f3d9d9 / #b94a4a)
 * - SVG chess pieces
 * - Drag-and-drop + tap-to-select
 * - Archer targeting system
 */

import React, { useState, useCallback, useMemo, useEffect, memo } from 'react';
import { GameState, Position, LegalMove, PieceType, PieceColor, Piece } from '@/lib/xchess/types';
import { getArcherFireTargets } from '@/lib/xchess/moves/archer';
import { PieceSVG } from '@/components/game/ChessPieceSVG';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  trackBoardLoaded,
  trackMoveAttempted,
  trackMoveCommitted,
  trackArcherFireModeOpened,
  trackArcherFireConfirmed,
} from '@/lib/firebase/analytics';
import { Crosshair, Move, X, Check } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface InteractiveBoardProps {
  state: GameState;
  legalMoves: LegalMove[];
  onMove: (from: Position, to: Position, promotion?: PieceType, archerTargets?: Position[]) => Promise<boolean>;
  playerColor?: PieceColor | null;
  flipped?: boolean;
  disabled?: boolean;
  showCoordinates?: boolean;
  onSquareHover?: (position: Position | null) => void;
  gameId?: string;
}

type ArcherAction = 'move' | 'fire';

// ============================================================================
// THEME COLORS
// ============================================================================

const THEME = {
  lightSquare: '#f3d9d9',
  darkSquare: '#b94a4a',
  selected: '#ff4d4d',
  legalMove: 'rgba(255,107,107,0.5)',
  lastMoveLight: '#f0c0c0',
  lastMoveDark: '#a04040',
  check: '#ff0000',
  coordLight: '#8a3a3a',
  coordDark: '#e8c8c8',
  border: '#7a2a2a',
};

// ============================================================================
// SQUARE COMPONENT
// ============================================================================

interface SquareProps {
  row: number;
  col: number;
  piece: Piece | null;
  isSelected: boolean;
  isLegalMove: boolean;
  isCapture: boolean;
  isLastMove: boolean;
  isCheck: boolean;
  isArcherTarget: boolean;
  isSelectedArcherTarget: boolean;
  sqPx: number;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  disabled: boolean;
  coordFile?: string;
  coordRank?: number;
}

const Square = memo(function Square({
  row, col, piece, isSelected, isLegalMove, isCapture, isLastMove, isCheck,
  isArcherTarget, isSelectedArcherTarget, sqPx, onClick, onDragStart, onDragOver, onDrop,
  disabled, coordFile, coordRank,
}: SquareProps) {
  const isLight = (row + col) % 2 === 1;

  let bg = isLight ? THEME.lightSquare : THEME.darkSquare;
  if (isSelected) bg = THEME.selected;
  else if (isCheck) bg = THEME.check;
  else if (isSelectedArcherTarget) bg = '#e83030';
  else if (isLastMove) bg = isLight ? THEME.lastMoveLight : THEME.lastMoveDark;

  const coordColor = isLight ? THEME.coordLight : THEME.coordDark;

  return (
    <div
      style={{ width: sqPx, height: sqPx, backgroundColor: bg }}
      className={cn(
        'relative flex items-center justify-center transition-colors select-none',
        !disabled && 'cursor-pointer',
        disabled && 'cursor-default',
      )}
      data-testid={`square-${String.fromCharCode(97 + col)}${row + 1}`}
      onClick={onClick}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Coordinates embedded in corners (chess.com style) */}
      {coordRank !== undefined && (
        <span className="absolute top-0.5 left-1 text-[10px] font-bold leading-none pointer-events-none" style={{ color: coordColor }}>
          {coordRank}
        </span>
      )}
      {coordFile && (
        <span className="absolute bottom-0 right-1 text-[10px] font-bold leading-none pointer-events-none" style={{ color: coordColor }}>
          {coordFile}
        </span>
      )}

      {/* Piece */}
      {piece && (
        <div
          draggable={!disabled}
          onDragStart={onDragStart}
          className={cn(
            'absolute inset-0 flex items-center justify-center z-10',
            !disabled && 'cursor-grab active:cursor-grabbing',
          )}
        >
          <PieceSVG type={piece.type} color={piece.color} size={Math.round(sqPx * 0.82)} />
        </div>
      )}

      {/* Legal move dot */}
      {isLegalMove && !isCapture && !isArcherTarget && (
        <div
          className="absolute rounded-full pointer-events-none z-20"
          style={{
            width: sqPx * 0.28,
            height: sqPx * 0.28,
            backgroundColor: THEME.legalMove,
          }}
        />
      )}

      {/* Capture ring */}
      {(isCapture || (isLegalMove && piece)) && !isArcherTarget && (
        <div
          className="absolute rounded-full pointer-events-none z-20 border-[3px]"
          style={{
            width: sqPx * 0.9,
            height: sqPx * 0.9,
            borderColor: THEME.legalMove,
          }}
        />
      )}

      {/* Archer target */}
      {isArcherTarget && (
        <div className={cn(
          'absolute inset-0 flex items-center justify-center pointer-events-none z-20',
          isSelectedArcherTarget ? 'bg-red-600/50' : 'bg-orange-500/40',
        )}>
          <Crosshair className={cn('w-5 h-5', isSelectedArcherTarget ? 'text-white' : 'text-orange-800')} />
        </div>
      )}
    </div>
  );
});

// ============================================================================
// ARCHER COMPONENTS
// ============================================================================

function ArcherActionSelector({ onSelectAction, onCancel, canFire }: {
  onSelectAction: (action: ArcherAction) => void;
  onCancel: () => void;
  canFire: boolean;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl p-2 flex gap-1.5 -translate-x-1/2 -translate-y-full mb-2">
      <Button size="sm" variant="outline" onClick={() => onSelectAction('move')} className="gap-1 bg-zinc-800 border-zinc-600 text-white hover:bg-zinc-700 hover:text-white">
        <Move className="w-3 h-3" /> Move
      </Button>
      <Button size="sm" variant="outline" onClick={() => onSelectAction('fire')} disabled={!canFire}
        className="gap-1 bg-red-900/60 border-red-700 text-red-200 hover:bg-red-800 hover:text-white disabled:opacity-40">
        <Crosshair className="w-3 h-3" /> Fire
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancel} className="text-zinc-400 hover:text-white hover:bg-zinc-800 px-1.5">
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}

function ArcherFireConfirm({ targetCount, onConfirm, onCancel }: {
  targetCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="bg-zinc-900 border border-red-700 rounded-lg shadow-xl p-2 flex gap-1.5 -translate-x-1/2 -translate-y-full mb-2">
      <Button size="sm" onClick={onConfirm} className="gap-1 bg-red-700 hover:bg-red-600 text-white">
        <Check className="w-3 h-3" /> Fire ({targetCount})
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancel} className="text-zinc-400 hover:text-white hover:bg-zinc-800 px-1.5">
        <X className="w-3 h-3" />
      </Button>
    </div>
  );
}

// ============================================================================
// PROMOTION DIALOG
// ============================================================================

function PromotionDialog({ color, onSelect, onCancel, includeArcher }: {
  color: PieceColor;
  onSelect: (piece: PieceType) => void;
  onCancel: () => void;
  includeArcher: boolean;
}) {
  const pieces: PieceType[] = includeArcher
    ? ['queen', 'rook', 'bishop', 'knight', 'archer']
    : ['queen', 'rook', 'bishop', 'knight'];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-4">
        <p className="text-sm text-zinc-400 mb-3 text-center">Promote to</p>
        <div className="flex gap-2">
          {pieces.map((type) => (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className="w-14 h-14 flex items-center justify-center bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors border border-zinc-600"
            >
              <PieceSVG type={type} color={color} size={40} />
            </button>
          ))}
        </div>
        <Button variant="ghost" className="w-full mt-2 text-zinc-400 hover:text-white" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN INTERACTIVE BOARD
// ============================================================================

export function InteractiveBoard({
  state,
  legalMoves,
  onMove,
  playerColor = null,
  flipped = false,
  disabled = false,
  showCoordinates = true,
  onSquareHover,
  gameId,
}: InteractiveBoardProps) {
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [archerAction, setArcherAction] = useState<ArcherAction | null>(null);
  const [archerTargets, setArcherTargets] = useState<Position[]>([]);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Position; to: Position } | null>(null);
  const [draggedFrom, setDraggedFrom] = useState<Position | null>(null);

  const boardSize = state.board.length;
  const isSpectator = playerColor === null;
  const isMyTurn = !isSpectator && state.currentTurn === playerColor;
  const isInteractive = !disabled && !isSpectator && isMyTurn;

  // Responsive square size
  const sqPx = boardSize === 10 ? 52 : 64;

  useEffect(() => {
    trackBoardLoaded(state.gameMode === 'v2_artillery' ? 'online' : 'vs_ai');
  }, [state.gameMode]);

  const displayRows = useMemo(() => {
    const rows = Array.from({ length: boardSize }, (_, i) => i);
    return flipped ? rows : rows.reverse();
  }, [boardSize, flipped]);

  const displayCols = useMemo(() => {
    const cols = Array.from({ length: boardSize }, (_, i) => i);
    return flipped ? cols.reverse() : cols;
  }, [boardSize, flipped]);

  const selectedPieceMoves = useMemo(() => {
    if (!selectedSquare) return [];
    return legalMoves.filter(m => m.from.row === selectedSquare.row && m.from.col === selectedSquare.col);
  }, [selectedSquare, legalMoves]);

  const archerFireTargetSquares = useMemo(() => {
    if (!selectedSquare || archerAction !== 'fire') return [];
    const piece = state.board[selectedSquare.row]?.[selectedSquare.col];
    if (!piece || piece.type !== 'archer') return [];
    return getArcherFireTargets(state.board, selectedSquare, piece);
  }, [selectedSquare, archerAction, state.board]);

  const isLegalDestination = useCallback((row: number, col: number): boolean => {
    if (archerAction === 'fire') return false;
    return selectedPieceMoves.some(m => m.to.row === row && m.to.col === col && m.moveType !== 'archer_fire');
  }, [selectedPieceMoves, archerAction]);

  const isArcherTargetSquare = useCallback((row: number, col: number): boolean => {
    return archerFireTargetSquares.some(t => t.row === row && t.col === col);
  }, [archerFireTargetSquares]);

  const isSelectedArcherTarget = useCallback((row: number, col: number): boolean => {
    return archerTargets.some(t => t.row === row && t.col === col);
  }, [archerTargets]);

  const lastMove = state.moveHistory[state.moveHistory.length - 1];
  const isLastMoveSquare = useCallback((row: number, col: number): boolean => {
    if (!lastMove) return false;
    return (lastMove.from.row === row && lastMove.from.col === col) ||
           (lastMove.to.row === row && lastMove.to.col === col);
  }, [lastMove]);

  const isKingInCheck = useCallback((row: number, col: number): boolean => {
    if (!state.isCheck) return false;
    const piece = state.board[row]?.[col];
    return piece?.type === 'king' && piece.color === state.currentTurn;
  }, [state.isCheck, state.board, state.currentTurn]);

  const handleSquareClick = useCallback((row: number, col: number) => {
    if (!isInteractive) return;
    const clickedPiece = state.board[row]?.[col];
    const clickedPos: Position = { row, col };

    if (archerAction === 'fire') {
      if (isArcherTargetSquare(row, col)) {
        const alreadySelected = archerTargets.some(t => t.row === row && t.col === col);
        if (alreadySelected) setArcherTargets(prev => prev.filter(t => t.row !== row || t.col !== col));
        else if (archerTargets.length < 2) setArcherTargets(prev => [...prev, clickedPos]);
        return;
      }
      setArcherAction(null); setArcherTargets([]); setSelectedSquare(null);
      return;
    }

    if (!selectedSquare) {
      if (clickedPiece && clickedPiece.color === playerColor) setSelectedSquare(clickedPos);
      return;
    }

    if (selectedSquare.row === row && selectedSquare.col === col) {
      setSelectedSquare(null); setArcherAction(null); return;
    }

    if (clickedPiece && clickedPiece.color === playerColor) {
      setSelectedSquare(clickedPos); setArcherAction(null); return;
    }

    const move = selectedPieceMoves.find(m => m.to.row === row && m.to.col === col && m.moveType !== 'archer_fire');
    if (move) {
      trackMoveAttempted();
      if (move.moveType === 'promotion') {
        setPendingPromotion({ from: selectedSquare, to: clickedPos });
        setShowPromotionDialog(true);
        return;
      }
      executeMove(selectedSquare, clickedPos);
    } else {
      setSelectedSquare(null);
    }
  }, [isInteractive, state.board, playerColor, selectedSquare, selectedPieceMoves, archerAction, archerTargets, isArcherTargetSquare]);

  const executeMove = useCallback(async (from: Position, to: Position, promotion?: PieceType, targets?: Position[]) => {
    const success = await onMove(from, to, promotion, targets);
    if (success) trackMoveCommitted();
    setSelectedSquare(null); setArcherAction(null); setArcherTargets([]);
    setPendingPromotion(null); setShowPromotionDialog(false);
  }, [onMove]);

  const handleArcherActionSelect = useCallback((action: ArcherAction) => {
    setArcherAction(action);
    if (action === 'fire') trackArcherFireModeOpened();
  }, []);

  const handleArcherFireConfirm = useCallback(async () => {
    if (!selectedSquare || archerTargets.length === 0) return;
    trackArcherFireConfirmed(archerTargets.length > 0);
    await executeMove(selectedSquare, selectedSquare, undefined, archerTargets);
  }, [selectedSquare, archerTargets, executeMove]);

  const handlePromotionSelect = useCallback((piece: PieceType) => {
    if (pendingPromotion) executeMove(pendingPromotion.from, pendingPromotion.to, piece);
  }, [pendingPromotion, executeMove]);

  const handleDragStart = useCallback((e: React.DragEvent, row: number, col: number) => {
    if (!isInteractive) { e.preventDefault(); return; }
    const piece = state.board[row]?.[col];
    if (!piece || piece.color !== playerColor) { e.preventDefault(); return; }
    setDraggedFrom({ row, col }); setSelectedSquare({ row, col });
    const target = e.target as HTMLElement;
    e.dataTransfer.setDragImage(target, 25, 25);
    e.dataTransfer.effectAllowed = 'move';
  }, [isInteractive, state.board, playerColor]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }, []);

  const handleDrop = useCallback((e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    if (!draggedFrom) return;
    const move = legalMoves.find(m =>
      m.from.row === draggedFrom.row && m.from.col === draggedFrom.col &&
      m.to.row === row && m.to.col === col && m.moveType !== 'archer_fire'
    );
    if (move) {
      trackMoveAttempted();
      if (move.moveType === 'promotion') {
        setPendingPromotion({ from: draggedFrom, to: { row, col } });
        setShowPromotionDialog(true);
      } else {
        executeMove(draggedFrom, { row, col });
      }
    }
    setDraggedFrom(null);
  }, [draggedFrom, legalMoves, executeMove]);

  const cancelSelection = useCallback(() => {
    setSelectedSquare(null); setArcherAction(null); setArcherTargets([]);
  }, []);

  const selectedPiece = selectedSquare ? state.board[selectedSquare.row]?.[selectedSquare.col] : null;
  const isArcherSelected = selectedPiece?.type === 'archer';
  const canArcherFire = isArcherSelected && archerFireTargetSquares.length > 0;
  const showArcherActionSelector = isArcherSelected && !archerAction && selectedPieceMoves.length > 0;

  const files = 'abcdefghij'.split('').slice(0, boardSize);

  return (
    <div className="relative inline-block" data-testid="interactive-board">
      <div className="relative">
        {/* Board */}
        <div style={{ borderColor: THEME.border }} className="border-2 rounded shadow-lg overflow-hidden">
          {displayRows.map((row, ri) => (
            <div key={row} className="flex">
              {displayCols.map((col, ci) => {
                const piece = state.board[row]?.[col] || null;
                // Chess.com style: coords inside first col / last row squares
                const isFirstCol = ci === 0;
                const isLastRow = ri === displayRows.length - 1;

                return (
                  <Square
                    key={`${row}-${col}`}
                    row={row} col={col} piece={piece}
                    isSelected={selectedSquare?.row === row && selectedSquare?.col === col}
                    isLegalMove={isLegalDestination(row, col)}
                    isCapture={isLegalDestination(row, col) && piece !== null}
                    isLastMove={isLastMoveSquare(row, col)}
                    isCheck={isKingInCheck(row, col)}
                    isArcherTarget={isArcherTargetSquare(row, col)}
                    isSelectedArcherTarget={isSelectedArcherTarget(row, col)}
                    sqPx={sqPx}
                    onClick={() => handleSquareClick(row, col)}
                    onDragStart={(e) => handleDragStart(e, row, col)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, row, col)}
                    disabled={!isInteractive}
                    coordRank={showCoordinates && isFirstCol ? row + 1 : undefined}
                    coordFile={showCoordinates && isLastRow ? files[col] : undefined}
                  />
                );
              })}
            </div>
          ))}
        </div>

        {/* Archer Action Selector */}
        {showArcherActionSelector && selectedSquare && (
          <div className="absolute z-50"
            style={{
              left: `${((flipped ? boardSize - 1 - selectedSquare.col : selectedSquare.col) / boardSize) * 100}%`,
              top: `${((flipped ? selectedSquare.row : boardSize - 1 - selectedSquare.row) / boardSize) * 100}%`,
            }}>
            <ArcherActionSelector onSelectAction={handleArcherActionSelect} onCancel={cancelSelection} canFire={canArcherFire} />
          </div>
        )}

        {/* Archer Fire Confirmation */}
        {archerAction === 'fire' && archerTargets.length > 0 && selectedSquare && (
          <div className="absolute z-50"
            style={{
              left: `${((flipped ? boardSize - 1 - selectedSquare.col : selectedSquare.col) / boardSize) * 100}%`,
              top: `${((flipped ? selectedSquare.row : boardSize - 1 - selectedSquare.row) / boardSize) * 100}%`,
            }}>
            <ArcherFireConfirm targetCount={archerTargets.length} onConfirm={handleArcherFireConfirm} onCancel={cancelSelection} />
          </div>
        )}
      </div>

      {/* Promotion Dialog */}
      {showPromotionDialog && pendingPromotion && (
        <PromotionDialog
          color={playerColor!}
          onSelect={handlePromotionSelect}
          onCancel={() => { setShowPromotionDialog(false); setPendingPromotion(null); setSelectedSquare(null); }}
          includeArcher={state.gameMode === 'v2_artillery'}
        />
      )}
    </div>
  );
}

export default InteractiveBoard;
