'use client';

/**
 * XChess Board Component
 * 
 * Renders the game board with pieces.
 * Supports both 8x8 and 10x10 boards.
 */

import { GameState, Position, LegalMove, PieceType, PieceColor } from '@/lib/xchess/types';
import { positionToAlgebraic } from '@/lib/xchess/serialization';

interface ChessBoardProps {
  state: GameState;
  selectedSquare?: Position | null;
  legalMoves?: LegalMove[];
  onSquareClick?: (position: Position) => void;
  flipped?: boolean;
  showCoordinates?: boolean;
}

// Piece SVG icons (Unicode chess symbols)
const PIECE_SYMBOLS: Record<PieceType, { white: string; black: string }> = {
  king: { white: '♔', black: '♚' },
  queen: { white: '♕', black: '♛' },
  rook: { white: '♖', black: '♜' },
  bishop: { white: '♗', black: '♝' },
  knight: { white: '♘', black: '♞' },
  pawn: { white: '♙', black: '♟' },
  archer: { white: '🏹', black: '🏹' }, // Custom for XChess
};

export function ChessBoard({
  state,
  selectedSquare,
  legalMoves = [],
  onSquareClick,
  flipped = false,
  showCoordinates = true,
}: ChessBoardProps) {
  const boardSize = state.board.length;
  const squareSize = boardSize === 10 ? 'w-10 h-10 md:w-12 md:h-12' : 'w-12 h-12 md:w-14 md:h-14';
  const pieceSize = boardSize === 10 ? 'text-3xl md:text-4xl' : 'text-4xl md:text-5xl';
  
  // Get coordinates
  const files = Array.from({ length: boardSize }, (_, i) => 
    String.fromCharCode('a'.charCodeAt(0) + i)
  );
  const ranks = Array.from({ length: boardSize }, (_, i) => i + 1);
  
  // Create array of rows (flipped or not)
  const displayRows = flipped 
    ? [...Array(boardSize).keys()]
    : [...Array(boardSize).keys()].reverse();
  
  const displayCols = flipped
    ? [...Array(boardSize).keys()].reverse()
    : [...Array(boardSize).keys()];
  
  // Check if a square is a legal move destination
  const isLegalDestination = (row: number, col: number): boolean => {
    return legalMoves.some(m => m.to.row === row && m.to.col === col);
  };
  
  // Check if square is selected
  const isSelected = (row: number, col: number): boolean => {
    return selectedSquare?.row === row && selectedSquare?.col === col;
  };
  
  // Check if square is part of last move
  const lastMove = state.moveHistory[state.moveHistory.length - 1];
  const isLastMoveSquare = (row: number, col: number): boolean => {
    if (!lastMove) return false;
    return (
      (lastMove.from.row === row && lastMove.from.col === col) ||
      (lastMove.to.row === row && lastMove.to.col === col)
    );
  };
  
  // Get square color
  const getSquareColor = (row: number, col: number): string => {
    const isLight = (row + col) % 2 === 1;
    
    if (isSelected(row, col)) {
      return 'bg-yellow-400';
    }
    
    if (isLastMoveSquare(row, col)) {
      return isLight ? 'bg-yellow-200' : 'bg-yellow-500';
    }
    
    // Check highlight (king in check)
    if (state.isCheck) {
      const piece = state.board[row][col];
      if (piece?.type === 'king' && piece.color === state.currentTurn) {
        return 'bg-red-500';
      }
    }
    
    return isLight ? 'bg-amber-100' : 'bg-amber-700';
  };
  
  return (
    <div className="inline-block">
      {/* Board */}
      <div 
        className="relative border-2 border-amber-900 rounded shadow-lg"
        style={{ touchAction: 'none' }}
      >
        {/* Coordinates - Ranks (left side) */}
        {showCoordinates && (
          <div className="absolute -left-6 top-0 h-full flex flex-col justify-around">
            {displayRows.map(row => (
              <span key={row} className="text-xs text-muted-foreground h-10 md:h-12 flex items-center">
                {row + 1}
              </span>
            ))}
          </div>
        )}
        
        {/* Board Grid */}
        <div className="flex flex-col">
          {displayRows.map(row => (
            <div key={row} className="flex">
              {displayCols.map(col => {
                const piece = state.board[row][col];
                const isLegal = isLegalDestination(row, col);
                const hasCapture = isLegal && piece !== null;
                
                return (
                  <div
                    key={`${row}-${col}`}
                    className={`
                      ${squareSize}
                      ${getSquareColor(row, col)}
                      relative flex items-center justify-center
                      cursor-pointer transition-all
                      hover:brightness-110
                    `}
                    onClick={() => onSquareClick?.({ row, col })}
                  >
                    {/* Piece */}
                    {piece && (
                      <span 
                        className={`
                          ${pieceSize} select-none
                          ${piece.color === 'white' ? 'text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]' : 'text-gray-900'}
                          ${piece.type === 'archer' ? 'text-2xl md:text-3xl' : ''}
                        `}
                      >
                        {PIECE_SYMBOLS[piece.type][piece.color]}
                      </span>
                    )}
                    
                    {/* Legal move indicator */}
                    {isLegal && !hasCapture && (
                      <div className="absolute w-3 h-3 rounded-full bg-black/30" />
                    )}
                    
                    {/* Capture indicator */}
                    {hasCapture && (
                      <div className="absolute inset-0 border-4 border-black/30 rounded-full" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        
        {/* Coordinates - Files (bottom) */}
        {showCoordinates && (
          <div className="absolute -bottom-5 left-0 w-full flex justify-around">
            {displayCols.map(col => (
              <span key={col} className={`text-xs text-muted-foreground ${squareSize} flex items-center justify-center`}>
                {files[col]}
              </span>
            ))}
          </div>
        )}
      </div>
      
      {/* Game status */}
      <div className="mt-6 text-center">
        {state.isCheckmate && (
          <p className="text-lg font-bold text-red-600">
            Checkmate! {state.winner === 'white' ? 'White' : 'Black'} wins!
          </p>
        )}
        {state.isStalemate && (
          <p className="text-lg font-bold text-yellow-600">
            Stalemate! Game is a draw.
          </p>
        )}
        {state.isCheck && !state.isCheckmate && (
          <p className="text-lg font-semibold text-orange-600">
            {state.currentTurn === 'white' ? 'White' : 'Black'} is in check!
          </p>
        )}
        {!state.isCheckmate && !state.isStalemate && !state.isCheck && (
          <p className="text-sm text-muted-foreground">
            {state.currentTurn === 'white' ? 'White' : 'Black'} to move
          </p>
        )}
      </div>
    </div>
  );
}

export default ChessBoard;
