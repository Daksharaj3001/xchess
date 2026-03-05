'use client';

/**
 * XChess Interactive Board Component
 * 
 * Full-featured game board supporting:
 * - 8x8 (V1) and 10x10 (V2) boards
 * - Drag and drop + tap to select
 * - Archer targeting system
 * - Real-time updates
 * - Spectator mode
 */

import React, { useState, useCallback, useMemo, useEffect, memo } from 'react';
import { GameState, Position, LegalMove, PieceType, PieceColor, Piece } from '@/lib/xchess/types';
import { positionToAlgebraic } from '@/lib/xchess/serialization';
import { getArcherFireTargets } from '@/lib/xchess/moves/archer';
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
  playerColor?: PieceColor | null;  // null = spectator
  flipped?: boolean;
  disabled?: boolean;
  showCoordinates?: boolean;
  onSquareHover?: (position: Position | null) => void;
  gameId?: string;
}

type ArcherAction = 'move' | 'fire';

// ============================================================================
// PIECE RENDERING
// ============================================================================

const PIECE_UNICODE: Record<PieceType, string> = {
  king: '♚',
  queen: '♛',
  rook: '♜',
  bishop: '♝',
  knight: '♞',
  pawn: '♟',
  archer: '🏹',
};

interface PieceIconProps {
  piece: Piece;
  size?: 'sm' | 'md' | 'lg';
}

// White pieces use filled unicode, black use outlined
const PIECE_DISPLAY: Record<PieceType, { white: string; black: string }> = {
  king: { white: '♔', black: '♚' },
  queen: { white: '♕', black: '♛' },
  rook: { white: '♖', black: '♜' },
  bishop: { white: '♗', black: '♝' },
  knight: { white: '♘', black: '♞' },
  pawn: { white: '♙', black: '♟' },
  archer: { white: '🏹', black: '🏹' },
};

const PieceIcon = memo(function PieceIcon({ piece, size = 'md' }: PieceIconProps) {
  const sizeClasses = {
    sm: 'text-2xl md:text-3xl',
    md: 'text-3xl md:text-4xl',
    lg: 'text-4xl md:text-5xl',
  };

  const isArcher = piece.type === 'archer';
  
  return (
    <span
      className={cn(
        sizeClasses[size],
        'select-none transition-transform',
        piece.color === 'white'
          ? '[text-shadow:_0_0_3px_rgba(0,0,0,0.6),_0_1px_2px_rgba(0,0,0,0.5)]'
          : '[text-shadow:_0_0_2px_rgba(255,255,255,0.3)]',
        isArcher && 'text-2xl md:text-3xl'
      )}
      style={{ color: piece.color === 'white' ? '#f8f8f8' : '#1a1a1a' }}
    >
      {PIECE_DISPLAY[piece.type][piece.color]}
    </span>
  );
});

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
  squareSize: string;
  onClick: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  disabled: boolean;
}

const Square = memo(function Square({
  row,
  col,
  piece,
  isSelected,
  isLegalMove,
  isCapture,
  isLastMove,
  isCheck,
  isArcherTarget,
  isSelectedArcherTarget,
  squareSize,
  onClick,
  onDragStart,
  onDragOver,
  onDrop,
  disabled,
}: SquareProps) {
  const isLight = (row + col) % 2 === 1;
  
  // Determine background color
  let bgColor = isLight ? 'bg-amber-100' : 'bg-amber-700';
  
  if (isSelected) {
    bgColor = 'bg-yellow-400';
  } else if (isCheck) {
    bgColor = 'bg-red-500';
  } else if (isSelectedArcherTarget) {
    bgColor = 'bg-red-400';
  } else if (isLastMove) {
    bgColor = isLight ? 'bg-yellow-200' : 'bg-yellow-600';
  }
  
  return (
    <div
      className={cn(
        squareSize,
        bgColor,
        'relative flex items-center justify-center transition-colors',
        !disabled && 'cursor-pointer hover:brightness-110',
        disabled && 'cursor-default'
      )}
      data-testid={`square-${String.fromCharCode(97 + col)}${row + 1}`}
      onClick={onClick}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* Piece */}
      {piece && (
        <div
          draggable={!disabled}
          onDragStart={onDragStart}
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            !disabled && 'cursor-grab active:cursor-grabbing'
          )}
        >
          <PieceIcon piece={piece} size="md" />
        </div>
      )}
      
      {/* Legal move indicator */}
      {isLegalMove && !isCapture && !isArcherTarget && (
        <div className="absolute w-3 h-3 rounded-full bg-black/30 pointer-events-none" />
      )}
      
      {/* Capture indicator */}
      {(isCapture || (isLegalMove && piece)) && !isArcherTarget && (
        <div className="absolute inset-1 border-4 border-black/30 rounded-full pointer-events-none" />
      )}
      
      {/* Archer target indicator */}
      {isArcherTarget && (
        <div className={cn(
          'absolute inset-0 flex items-center justify-center pointer-events-none',
          isSelectedArcherTarget ? 'bg-red-500/50' : 'bg-orange-500/40'
        )}>
          <Crosshair className={cn(
            'w-6 h-6',
            isSelectedArcherTarget ? 'text-white' : 'text-orange-700'
          )} />
        </div>
      )}
    </div>
  );
});

// ============================================================================
// ARCHER ACTION SELECTOR
// ============================================================================

interface ArcherActionSelectorProps {
  onSelectAction: (action: ArcherAction) => void;
  onCancel: () => void;
  canFire: boolean;
}

function ArcherActionSelector({ onSelectAction, onCancel, canFire }: ArcherActionSelectorProps) {
  return (
    <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-card border rounded-lg shadow-lg p-2 flex gap-2 z-50">
      <Button
        size="sm"
        variant="outline"
        onClick={() => onSelectAction('move')}
        className="flex items-center gap-1"
      >
        <Move className="w-4 h-4" />
        Move
      </Button>
      <Button
        size="sm"
        variant={canFire ? 'default' : 'outline'}
        onClick={() => onSelectAction('fire')}
        disabled={!canFire}
        className="flex items-center gap-1"
      >
        <Crosshair className="w-4 h-4" />
        Fire
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onCancel}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

// ============================================================================
// ARCHER FIRE CONFIRMATION
// ============================================================================

interface ArcherFireConfirmProps {
  targetCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

function ArcherFireConfirm({ targetCount, onConfirm, onCancel }: ArcherFireConfirmProps) {
  return (
    <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 bg-card border rounded-lg shadow-lg p-2 flex gap-2 z-50">
      <span className="text-sm self-center px-2">
        {targetCount} target{targetCount > 1 ? 's' : ''} selected
      </span>
      <Button
        size="sm"
        variant="default"
        onClick={onConfirm}
        className="flex items-center gap-1 bg-red-600 hover:bg-red-700"
      >
        <Check className="w-4 h-4" />
        Fire!
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={onCancel}
      >
        Cancel
      </Button>
    </div>
  );
}

// ============================================================================
// PROMOTION DIALOG
// ============================================================================

interface PromotionDialogProps {
  color: PieceColor;
  onSelect: (piece: PieceType) => void;
  onCancel: () => void;
  includeArcher: boolean;
}

function PromotionDialog({ color, onSelect, onCancel, includeArcher }: PromotionDialogProps) {
  const pieces: PieceType[] = includeArcher
    ? ['queen', 'rook', 'bishop', 'knight', 'archer']
    : ['queen', 'rook', 'bishop', 'knight'];
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border rounded-lg shadow-xl p-4">
        <p className="text-sm text-muted-foreground mb-3 text-center">Choose promotion piece</p>
        <div className="flex gap-2">
          {pieces.map((type) => (
            <button
              key={type}
              onClick={() => onSelect(type)}
              className="w-14 h-14 flex items-center justify-center bg-muted rounded-lg hover:bg-muted/80 transition-colors"
            >
              <PieceIcon piece={{ type, color, hasMoved: true }} size="lg" />
            </button>
          ))}
        </div>
        <Button variant="ghost" className="w-full mt-2" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN INTERACTIVE BOARD COMPONENT
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
  // State
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
  
  // Track board loaded
  useEffect(() => {
    const mode = state.gameMode === 'v2_artillery' ? 'online' : 'vs_ai';
    trackBoardLoaded(mode);
  }, [state.gameMode]);
  
  // Calculate square size based on board size
  const squareSize = boardSize === 10 
    ? 'w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 lg:w-14 lg:h-14'
    : 'w-11 h-11 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16';
  
  // Generate row/col arrays for rendering
  const displayRows = useMemo(() => {
    const rows = Array.from({ length: boardSize }, (_, i) => i);
    return flipped ? rows : rows.reverse();
  }, [boardSize, flipped]);
  
  const displayCols = useMemo(() => {
    const cols = Array.from({ length: boardSize }, (_, i) => i);
    return flipped ? cols.reverse() : cols;
  }, [boardSize, flipped]);
  
  // Get legal moves for selected piece
  const selectedPieceMoves = useMemo(() => {
    if (!selectedSquare) return [];
    return legalMoves.filter(
      m => m.from.row === selectedSquare.row && m.from.col === selectedSquare.col
    );
  }, [selectedSquare, legalMoves]);
  
  // Get archer fire targets if in fire mode
  const archerFireTargetSquares = useMemo(() => {
    if (!selectedSquare || archerAction !== 'fire') return [];
    const piece = state.board[selectedSquare.row]?.[selectedSquare.col];
    if (!piece || piece.type !== 'archer') return [];
    return getArcherFireTargets(state.board, selectedSquare, piece);
  }, [selectedSquare, archerAction, state.board]);
  
  // Check if a position is a legal move destination
  const isLegalDestination = useCallback((row: number, col: number): boolean => {
    if (archerAction === 'fire') return false;
    return selectedPieceMoves.some(
      m => m.to.row === row && m.to.col === col && m.moveType !== 'archer_fire'
    );
  }, [selectedPieceMoves, archerAction]);
  
  // Check if position is an archer target
  const isArcherTargetSquare = useCallback((row: number, col: number): boolean => {
    return archerFireTargetSquares.some(t => t.row === row && t.col === col);
  }, [archerFireTargetSquares]);
  
  // Check if target is selected
  const isSelectedArcherTarget = useCallback((row: number, col: number): boolean => {
    return archerTargets.some(t => t.row === row && t.col === col);
  }, [archerTargets]);
  
  // Check if square is part of last move
  const lastMove = state.moveHistory[state.moveHistory.length - 1];
  const isLastMoveSquare = useCallback((row: number, col: number): boolean => {
    if (!lastMove) return false;
    return (
      (lastMove.from.row === row && lastMove.from.col === col) ||
      (lastMove.to.row === row && lastMove.to.col === col)
    );
  }, [lastMove]);
  
  // Check if square contains king in check
  const isKingInCheck = useCallback((row: number, col: number): boolean => {
    if (!state.isCheck) return false;
    const piece = state.board[row]?.[col];
    return piece?.type === 'king' && piece.color === state.currentTurn;
  }, [state.isCheck, state.board, state.currentTurn]);
  
  // Handle square click
  const handleSquareClick = useCallback((row: number, col: number) => {
    if (!isInteractive) return;
    
    const clickedPiece = state.board[row]?.[col];
    const clickedPos: Position = { row, col };
    
    // If in archer fire mode
    if (archerAction === 'fire') {
      // Check if clicking a valid target
      if (isArcherTargetSquare(row, col)) {
        // Toggle target selection
        const alreadySelected = archerTargets.some(t => t.row === row && t.col === col);
        
        if (alreadySelected) {
          setArcherTargets(prev => prev.filter(t => t.row !== row || t.col !== col));
        } else if (archerTargets.length < 2) {
          setArcherTargets(prev => [...prev, clickedPos]);
        }
        return;
      }
      
      // Clicking elsewhere cancels fire mode
      setArcherAction(null);
      setArcherTargets([]);
      setSelectedSquare(null);
      return;
    }
    
    // If no piece selected
    if (!selectedSquare) {
      // Select own piece
      if (clickedPiece && clickedPiece.color === playerColor) {
        setSelectedSquare(clickedPos);
        
        // If archer, show action selector
        if (clickedPiece.type === 'archer') {
          // Check if archer can fire
          const targets = getArcherFireTargets(state.board, clickedPos, clickedPiece);
          if (targets.length > 0) {
            // Will show action selector via archerAction state
          }
        }
      }
      return;
    }
    
    // If clicking same square, deselect
    if (selectedSquare.row === row && selectedSquare.col === col) {
      setSelectedSquare(null);
      setArcherAction(null);
      return;
    }
    
    // If clicking own piece, switch selection
    if (clickedPiece && clickedPiece.color === playerColor) {
      setSelectedSquare(clickedPos);
      setArcherAction(null);
      return;
    }
    
    // Check if this is a legal move
    const move = selectedPieceMoves.find(
      m => m.to.row === row && m.to.col === col && m.moveType !== 'archer_fire'
    );
    
    if (move) {
      trackMoveAttempted();
      
      // Check for promotion
      if (move.moveType === 'promotion') {
        setPendingPromotion({ from: selectedSquare, to: clickedPos });
        setShowPromotionDialog(true);
        return;
      }
      
      // Execute move
      executeMove(selectedSquare, clickedPos);
    } else {
      // Invalid move, deselect
      setSelectedSquare(null);
    }
  }, [isInteractive, state.board, playerColor, selectedSquare, selectedPieceMoves, archerAction, archerTargets, isArcherTargetSquare]);
  
  // Execute move
  const executeMove = useCallback(async (
    from: Position,
    to: Position,
    promotion?: PieceType,
    targets?: Position[]
  ) => {
    const success = await onMove(from, to, promotion, targets);
    
    if (success) {
      trackMoveCommitted();
    }
    
    // Reset state
    setSelectedSquare(null);
    setArcherAction(null);
    setArcherTargets([]);
    setPendingPromotion(null);
    setShowPromotionDialog(false);
  }, [onMove]);
  
  // Handle archer action selection
  const handleArcherActionSelect = useCallback((action: ArcherAction) => {
    setArcherAction(action);
    
    if (action === 'fire') {
      trackArcherFireModeOpened();
    }
  }, []);
  
  // Handle archer fire confirmation
  const handleArcherFireConfirm = useCallback(async () => {
    if (!selectedSquare || archerTargets.length === 0) return;
    
    trackArcherFireConfirmed(archerTargets.length > 0);
    await executeMove(selectedSquare, selectedSquare, undefined, archerTargets);
  }, [selectedSquare, archerTargets, executeMove]);
  
  // Handle promotion selection
  const handlePromotionSelect = useCallback((piece: PieceType) => {
    if (pendingPromotion) {
      executeMove(pendingPromotion.from, pendingPromotion.to, piece);
    }
  }, [pendingPromotion, executeMove]);
  
  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent, row: number, col: number) => {
    if (!isInteractive) {
      e.preventDefault();
      return;
    }
    
    const piece = state.board[row]?.[col];
    if (!piece || piece.color !== playerColor) {
      e.preventDefault();
      return;
    }
    
    setDraggedFrom({ row, col });
    setSelectedSquare({ row, col });
    
    // Set drag image
    const target = e.target as HTMLElement;
    e.dataTransfer.setDragImage(target, 25, 25);
    e.dataTransfer.effectAllowed = 'move';
  }, [isInteractive, state.board, playerColor]);
  
  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);
  
  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    
    if (!draggedFrom) return;
    
    // Check if valid move
    const move = legalMoves.find(
      m => m.from.row === draggedFrom.row && 
           m.from.col === draggedFrom.col &&
           m.to.row === row && 
           m.to.col === col &&
           m.moveType !== 'archer_fire'
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
  
  // Cancel selection
  const cancelSelection = useCallback(() => {
    setSelectedSquare(null);
    setArcherAction(null);
    setArcherTargets([]);
  }, []);
  
  // Determine if archer can fire from selected position
  const selectedPiece = selectedSquare ? state.board[selectedSquare.row]?.[selectedSquare.col] : null;
  const isArcherSelected = selectedPiece?.type === 'archer';
  const canArcherFire = isArcherSelected && archerFireTargetSquares.length > 0;
  const showArcherActionSelector = isArcherSelected && !archerAction && selectedPieceMoves.length > 0;
  
  // Coordinate labels
  const files = 'abcdefghij'.split('').slice(0, boardSize);
  const ranks = Array.from({ length: boardSize }, (_, i) => i + 1);
  
  return (
    <div className="relative inline-block" data-testid="interactive-board">
      {/* Board container */}
      <div className="relative">
        {/* Coordinates - Ranks (left) */}
        {showCoordinates && (
          <div className="absolute -left-5 top-0 h-full flex flex-col justify-around text-xs text-muted-foreground">
            {displayRows.map(row => (
              <div key={row} className={cn(squareSize, 'flex items-center justify-center !w-5')}>
                {row + 1}
              </div>
            ))}
          </div>
        )}
        
        {/* Board */}
        <div className="border-2 border-amber-900 rounded shadow-lg overflow-hidden">
          {displayRows.map(row => (
            <div key={row} className="flex">
              {displayCols.map(col => {
                const piece = state.board[row]?.[col] || null;
                
                return (
                  <Square
                    key={`${row}-${col}`}
                    row={row}
                    col={col}
                    piece={piece}
                    isSelected={selectedSquare?.row === row && selectedSquare?.col === col}
                    isLegalMove={isLegalDestination(row, col)}
                    isCapture={isLegalDestination(row, col) && piece !== null}
                    isLastMove={isLastMoveSquare(row, col)}
                    isCheck={isKingInCheck(row, col)}
                    isArcherTarget={isArcherTargetSquare(row, col)}
                    isSelectedArcherTarget={isSelectedArcherTarget(row, col)}
                    squareSize={squareSize}
                    onClick={() => handleSquareClick(row, col)}
                    onDragStart={(e) => handleDragStart(e, row, col)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, row, col)}
                    disabled={!isInteractive}
                  />
                );
              })}
            </div>
          ))}
        </div>
        
        {/* Coordinates - Files (bottom) */}
        {showCoordinates && (
          <div className="absolute -bottom-5 left-0 w-full flex justify-around text-xs text-muted-foreground">
            {displayCols.map(col => (
              <div key={col} className={cn(squareSize, 'flex items-center justify-center !h-5')}>
                {files[col]}
              </div>
            ))}
          </div>
        )}
        
        {/* Archer Action Selector */}
        {showArcherActionSelector && selectedSquare && (
          <div 
            className="absolute z-50"
            style={{
              left: `${((flipped ? boardSize - 1 - selectedSquare.col : selectedSquare.col) / boardSize) * 100}%`,
              top: `${((flipped ? selectedSquare.row : boardSize - 1 - selectedSquare.row) / boardSize) * 100}%`,
            }}
          >
            <ArcherActionSelector
              onSelectAction={handleArcherActionSelect}
              onCancel={cancelSelection}
              canFire={canArcherFire}
            />
          </div>
        )}
        
        {/* Archer Fire Confirmation */}
        {archerAction === 'fire' && archerTargets.length > 0 && selectedSquare && (
          <div 
            className="absolute z-50"
            style={{
              left: `${((flipped ? boardSize - 1 - selectedSquare.col : selectedSquare.col) / boardSize) * 100}%`,
              top: `${((flipped ? selectedSquare.row : boardSize - 1 - selectedSquare.row) / boardSize) * 100}%`,
            }}
          >
            <ArcherFireConfirm
              targetCount={archerTargets.length}
              onConfirm={handleArcherFireConfirm}
              onCancel={cancelSelection}
            />
          </div>
        )}
      </div>
      
      {/* Turn indicator */}
      <div className="mt-8 text-center">
        {state.isCheckmate ? (
          <p className="text-lg font-bold text-red-600">
            Checkmate! {state.winner === 'white' ? 'White' : 'Black'} wins!
          </p>
        ) : state.isStalemate ? (
          <p className="text-lg font-bold text-yellow-600">
            Stalemate - Draw!
          </p>
        ) : state.isCheck ? (
          <p className="text-lg font-semibold text-orange-600">
            Check!
          </p>
        ) : null}
        
        {!state.isCheckmate && !state.isStalemate && (
          <p className="text-sm text-muted-foreground mt-1">
            {isSpectator ? (
              <>{state.currentTurn === 'white' ? 'White' : 'Black'} to move</>
            ) : isMyTurn ? (
              <span className="text-primary font-medium">Your turn</span>
            ) : (
              <>Waiting for opponent...</>
            )}
          </p>
        )}
      </div>
      
      {/* Promotion Dialog */}
      {showPromotionDialog && pendingPromotion && (
        <PromotionDialog
          color={playerColor!}
          onSelect={handlePromotionSelect}
          onCancel={() => {
            setShowPromotionDialog(false);
            setPendingPromotion(null);
            setSelectedSquare(null);
          }}
          includeArcher={state.gameMode === 'v2_artillery'}
        />
      )}
    </div>
  );
}

export default InteractiveBoard;
