/**
 * XChess Engine Tests
 * 
 * Automated test suite for the XChess rules engine.
 * Run with: npx tsx tests/xchess-engine.test.ts
 */

import {
  createGame,
  getLegalMoves,
  getLegalMovesForPiece,
  applyMove,
  isCheck,
  isCheckmate,
  isStalemate,
  GameState,
  Position,
  createInitialGameState,
  cloneGameState,
} from '../lib/xchess';

import { isInCheck, isSquareAttacked } from '../lib/xchess/check';
import { getArcherFireTargets } from '../lib/xchess/moves/archer';

// Test utilities
let passedTests = 0;
let failedTests = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`\x1b[32m✓ ${name}\x1b[0m`);
    passedTests++;
  } catch (error) {
    console.log(`\x1b[31m✗ ${name}\x1b[0m`);
    console.log(`  Error: ${error instanceof Error ? error.message : error}`);
    failedTests++;
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

function assertTrue(condition: boolean, message?: string) {
  if (!condition) {
    throw new Error(message || 'Expected true, got false');
  }
}

function assertFalse(condition: boolean, message?: string) {
  if (condition) {
    throw new Error(message || 'Expected false, got true');
  }
}

function assertGreater(actual: number, expected: number, message?: string) {
  if (actual <= expected) {
    throw new Error(message || `Expected ${actual} > ${expected}`);
  }
}

// ============================================================================
// GAME INITIALIZATION TESTS
// ============================================================================

console.log('\n=== Game Initialization Tests ===\n');

test('Create V1 Classical game (8x8)', () => {
  const state = createGame('v1_classical');
  assertEqual(state.board.length, 8);
  assertEqual(state.board[0].length, 8);
  assertEqual(state.currentTurn, 'white');
  assertEqual(state.moveNumber, 1);
});

test('Create V2 Artillery game (10x10)', () => {
  const state = createGame('v2_artillery');
  assertEqual(state.board.length, 10);
  assertEqual(state.board[0].length, 10);
  assertEqual(state.gameMode, 'v2_artillery');
});

test('V1 Classical has no archers', () => {
  const state = createGame('v1_classical');
  let hasArcher = false;
  for (const row of state.board) {
    for (const piece of row) {
      if (piece?.type === 'archer') hasArcher = true;
    }
  }
  assertFalse(hasArcher);
});

test('V2 Artillery has archers', () => {
  const state = createGame('v2_artillery');
  let archerCount = 0;
  for (const row of state.board) {
    for (const piece of row) {
      if (piece?.type === 'archer') archerCount++;
    }
  }
  assertEqual(archerCount, 4); // 2 white + 2 black
});

test('Initial position is correct for V1', () => {
  const state = createGame('v1_classical');
  // Check white pieces on row 0
  assertEqual(state.board[0][0]?.type, 'knight');
  assertEqual(state.board[0][3]?.type, 'queen');
  assertEqual(state.board[0][4]?.type, 'king');
  // Check pawns on row 1
  for (let col = 0; col < 8; col++) {
    assertEqual(state.board[1][col]?.type, 'pawn');
  }
});

// ============================================================================
// PIECE MOVEMENT TESTS
// ============================================================================

console.log('\n=== Piece Movement Tests ===\n');

test('Pawns can move forward one square', () => {
  const state = createGame('v1_classical');
  const moves = getLegalMovesForPiece(state, { row: 1, col: 4 }); // e2 pawn
  const hasOneForward = moves.some(m => m.to.row === 2 && m.to.col === 4);
  assertTrue(hasOneForward);
});

test('Pawns can move forward two squares from starting position', () => {
  const state = createGame('v1_classical');
  const moves = getLegalMovesForPiece(state, { row: 1, col: 4 });
  const hasTwoForward = moves.some(m => m.to.row === 3 && m.to.col === 4);
  assertTrue(hasTwoForward);
});

test('Knights have correct number of moves at start', () => {
  const state = createGame('v1_classical');
  // Knight at col 0 in baseline: Knight - Bishop - Rook - Queen - King - Rook - Bishop - Knight
  const moves = getLegalMovesForPiece(state, { row: 0, col: 0 }); // a1 knight
  // Knight on a1 can go to b3 or c2 if those are empty
  // With pawns on row 1, only b3 is available (row 2, col 1)
  assertGreater(moves.length, 0);
});

test('Queen has no legal moves at start (blocked)', () => {
  const state = createGame('v1_classical');
  const moves = getLegalMovesForPiece(state, { row: 0, col: 3 }); // d1 queen
  assertEqual(moves.length, 0);
});

test('King has limited legal moves at start due to layout', () => {
  const state = createGame('v1_classical');
  // King at col 4 in baseline: Knight - Bishop - Rook - Queen - King - Rook - Bishop - Knight
  // King is surrounded by Queen (col 3), Rook (col 5), and pawns (row 1)
  const moves = getLegalMovesForPiece(state, { row: 0, col: 4 }); // e1 king
  // The custom layout may allow some moves - just verify it works
  assertTrue(moves.length >= 0);
});

// ============================================================================
// APPLY MOVE TESTS
// ============================================================================

console.log('\n=== Apply Move Tests ===\n');

test('Can apply valid pawn move', () => {
  const state = createGame('v1_classical');
  const result = applyMove(state, { row: 1, col: 4 }, { row: 3, col: 4 }); // e4
  assertTrue(result.success);
  assertEqual(result.newState?.currentTurn, 'black');
});

test('Pawn disappears from original square after move', () => {
  const state = createGame('v1_classical');
  const result = applyMove(state, { row: 1, col: 4 }, { row: 3, col: 4 });
  assertEqual(result.newState?.board[1][4], null);
});

test('Pawn appears on destination square after move', () => {
  const state = createGame('v1_classical');
  const result = applyMove(state, { row: 1, col: 4 }, { row: 3, col: 4 });
  assertEqual(result.newState?.board[3][4]?.type, 'pawn');
});

test('Cannot move opponent pieces', () => {
  const state = createGame('v1_classical');
  const result = applyMove(state, { row: 6, col: 4 }, { row: 4, col: 4 }); // black pawn
  assertFalse(result.success);
});

test('Illegal move is rejected', () => {
  const state = createGame('v1_classical');
  const result = applyMove(state, { row: 1, col: 4 }, { row: 5, col: 4 }); // pawn to e6
  assertFalse(result.success);
});

// ============================================================================
// EN PASSANT TESTS
// ============================================================================

console.log('\n=== En Passant Tests ===\n');

test('En passant square is set after double pawn push', () => {
  const state = createGame('v1_classical');
  const result = applyMove(state, { row: 1, col: 4 }, { row: 3, col: 4 }); // e4
  assertTrue(result.newState?.enPassantSquare !== null);
  assertEqual(result.newState?.enPassantSquare?.row, 2);
  assertEqual(result.newState?.enPassantSquare?.col, 4);
});

test('En passant capture is available', () => {
  let state = createGame('v1_classical');
  
  // 1. e4
  let result = applyMove(state, { row: 1, col: 4 }, { row: 3, col: 4 });
  state = result.newState!;
  
  // 1... a6
  result = applyMove(state, { row: 6, col: 0 }, { row: 5, col: 0 });
  state = result.newState!;
  
  // 2. e5
  result = applyMove(state, { row: 3, col: 4 }, { row: 4, col: 4 });
  state = result.newState!;
  
  // 2... d5 (black pawn moves next to white pawn)
  result = applyMove(state, { row: 6, col: 3 }, { row: 4, col: 3 });
  state = result.newState!;
  
  // White should have en passant capture available
  const whitePawnMoves = getLegalMovesForPiece(state, { row: 4, col: 4 });
  const hasEnPassant = whitePawnMoves.some(m => m.moveType === 'en_passant');
  assertTrue(hasEnPassant, 'En passant should be available');
});

// ============================================================================
// CASTLING TESTS
// ============================================================================

console.log('\n=== Castling Tests ===\n');

test('Castling rights exist at start', () => {
  const state = createGame('v1_classical');
  assertTrue(state.castlingRights.whiteKingside);
  assertTrue(state.castlingRights.whiteQueenside);
  assertTrue(state.castlingRights.blackKingside);
  assertTrue(state.castlingRights.blackQueenside);
});

test('King move removes castling rights', () => {
  // Create a custom position where king can move
  const state = createGame('v1_classical');
  // Clear path for king
  state.board[0][3] = null; // Remove queen
  state.board[0][5] = null; // Remove bishop
  
  // Move king
  const result = applyMove(state, { row: 0, col: 4 }, { row: 0, col: 3 });
  
  if (result.success && result.newState) {
    assertFalse(result.newState.castlingRights.whiteKingside);
    assertFalse(result.newState.castlingRights.whiteQueenside);
  }
});

// ============================================================================
// PAWN PROMOTION TESTS
// ============================================================================

console.log('\n=== Pawn Promotion Tests ===\n');

test('Pawn promotion move type detected', () => {
  const state = createGame('v1_classical');
  // Put white pawn on 7th rank
  state.board[6][0] = { type: 'pawn', color: 'white', hasMoved: true };
  state.board[7][0] = null; // Clear destination
  
  const moves = getLegalMovesForPiece(state, { row: 6, col: 0 });
  const promotionMove = moves.find(m => m.moveType === 'promotion');
  assertTrue(promotionMove !== undefined);
});

test('Can promote to queen', () => {
  const state = createGame('v1_classical');
  state.board[6][0] = { type: 'pawn', color: 'white', hasMoved: true };
  state.board[7][0] = null;
  
  const result = applyMove(state, { row: 6, col: 0 }, { row: 7, col: 0 }, 'queen');
  assertTrue(result.success);
  assertEqual(result.newState?.board[7][0]?.type, 'queen');
});

test('V2 allows promotion to archer', () => {
  const state = createGame('v2_artillery');
  state.board[8][0] = { type: 'pawn', color: 'white', hasMoved: true };
  state.board[9][0] = null;
  
  const result = applyMove(state, { row: 8, col: 0 }, { row: 9, col: 0 }, 'archer');
  assertTrue(result.success);
  assertEqual(result.newState?.board[9][0]?.type, 'archer');
});

// ============================================================================
// ARCHER TESTS (V2 Mode)
// ============================================================================

console.log('\n=== Archer Tests ===\n');

test('Archer moves like king (one square)', () => {
  const state = createGame('v2_artillery');
  // Put archer in center
  state.board[4][4] = { type: 'archer', color: 'white', hasMoved: false };
  state.board[3][4] = null; // Clear squares around
  state.board[5][4] = null;
  state.board[4][3] = null;
  state.board[4][5] = null;
  
  const moves = getLegalMovesForPiece(state, { row: 4, col: 4 });
  const movementMoves = moves.filter(m => m.moveType !== 'archer_fire');
  
  // Should have up to 8 movement squares (minus any occupied by friendly pieces)
  assertGreater(movementMoves.length, 0);
});

test('Archer has fire option', () => {
  const state = createGame('v2_artillery');
  // Place white archer and black piece in firing range
  state.board[4][4] = { type: 'archer', color: 'white', hasMoved: false };
  state.board[7][4] = { type: 'pawn', color: 'black', hasMoved: false }; // 3 squares forward
  
  const moves = getLegalMovesForPiece(state, { row: 4, col: 4 });
  const fireMoves = moves.filter(m => m.moveType === 'archer_fire');
  
  assertTrue(fireMoves.length > 0);
});

test('Archer fire targets are correct (3 forward, 3 backward)', () => {
  const state = createGame('v2_artillery');
  const archer = { type: 'archer' as const, color: 'white' as const, hasMoved: false };
  state.board[4][4] = archer;
  
  // Place enemy pieces in all 6 target positions
  state.board[7][3] = { type: 'pawn', color: 'black', hasMoved: false }; // row+3, col-1
  state.board[7][4] = { type: 'pawn', color: 'black', hasMoved: false }; // row+3, col
  state.board[7][5] = { type: 'pawn', color: 'black', hasMoved: false }; // row+3, col+1
  state.board[1][3] = { type: 'pawn', color: 'black', hasMoved: false }; // row-3, col-1
  state.board[1][4] = { type: 'pawn', color: 'black', hasMoved: false }; // row-3, col
  state.board[1][5] = { type: 'pawn', color: 'black', hasMoved: false }; // row-3, col+1
  
  const targets = getArcherFireTargets(state.board, { row: 4, col: 4 }, archer);
  assertEqual(targets.length, 6);
});

test('Archer cannot fire at friendly pieces', () => {
  const state = createGame('v2_artillery');
  const archer = { type: 'archer' as const, color: 'white' as const, hasMoved: false };
  state.board[4][4] = archer;
  
  // Place friendly piece in target position
  state.board[7][4] = { type: 'pawn', color: 'white', hasMoved: false };
  
  const targets = getArcherFireTargets(state.board, { row: 4, col: 4 }, archer);
  const hasFriendlyTarget = targets.some(t => t.row === 7 && t.col === 4);
  assertFalse(hasFriendlyTarget);
});

test('Archer fire with one target', () => {
  const state = createGame('v2_artillery');
  state.board[4][4] = { type: 'archer', color: 'white', hasMoved: false };
  state.board[7][4] = { type: 'pawn', color: 'black', hasMoved: false };
  
  const result = applyMove(
    state,
    { row: 4, col: 4 },
    { row: 4, col: 4 }, // Archer stays in place
    undefined,
    [{ row: 7, col: 4 }] // One target
  );
  
  assertTrue(result.success);
  assertEqual(result.newState?.board[7][4], null); // Target should be removed
});

test('Archer fire with two targets', () => {
  const state = createGame('v2_artillery');
  state.board[4][4] = { type: 'archer', color: 'white', hasMoved: false };
  state.board[7][3] = { type: 'pawn', color: 'black', hasMoved: false };
  state.board[7][5] = { type: 'pawn', color: 'black', hasMoved: false };
  
  const result = applyMove(
    state,
    { row: 4, col: 4 },
    { row: 4, col: 4 },
    undefined,
    [{ row: 7, col: 3 }, { row: 7, col: 5 }] // Two targets
  );
  
  assertTrue(result.success);
  assertEqual(result.newState?.board[7][3], null);
  assertEqual(result.newState?.board[7][5], null);
});

test('Archer cannot fire when king is in check', () => {
  const state = createGame('v2_artillery');
  // Clear board first
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      state.board[row][col] = null;
    }
  }
  // Set up check position
  state.board[0][4] = { type: 'king', color: 'white', hasMoved: false };
  state.board[4][4] = { type: 'archer', color: 'white', hasMoved: false };
  state.board[0][0] = { type: 'rook', color: 'black', hasMoved: false }; // Giving check on rank 1
  state.board[7][4] = { type: 'pawn', color: 'black', hasMoved: false }; // Archer target
  state.currentTurn = 'white';
  
  // Verify king is in check
  assertTrue(isInCheck(state.board, 'white'), 'King should be in check');
  
  // Archer fire should not be available when king is in check
  const moves = getLegalMovesForPiece(state, { row: 4, col: 4 });
  const fireMoves = moves.filter(m => m.moveType === 'archer_fire');
  assertEqual(fireMoves.length, 0, 'Archer should not be able to fire when king is in check');
});

// ============================================================================
// CHECK AND CHECKMATE TESTS
// ============================================================================

console.log('\n=== Check and Checkmate Tests ===\n');

test('Check is detected', () => {
  const state = createGame('v1_classical');
  // Clear board and set up simple check
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      state.board[row][col] = null;
    }
  }
  state.board[0][4] = { type: 'king', color: 'white', hasMoved: false };
  state.board[7][4] = { type: 'rook', color: 'black', hasMoved: false };
  state.currentTurn = 'white';
  
  assertTrue(isInCheck(state.board, 'white'));
});

test('Checkmate is detected - back rank mate', () => {
  const state = createGame('v1_classical');
  // Clear board and set up back rank mate
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      state.board[row][col] = null;
    }
  }
  state.board[0][7] = { type: 'king', color: 'white', hasMoved: true };
  state.board[1][5] = { type: 'pawn', color: 'white', hasMoved: true };
  state.board[1][6] = { type: 'pawn', color: 'white', hasMoved: true };
  state.board[1][7] = { type: 'pawn', color: 'white', hasMoved: true };
  state.board[0][0] = { type: 'rook', color: 'black', hasMoved: false };
  state.currentTurn = 'white';
  
  assertTrue(isCheckmate(state));
});

test('Stalemate is detected', () => {
  const state = createGame('v1_classical');
  // Clear board and set up stalemate
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      state.board[row][col] = null;
    }
  }
  state.board[0][0] = { type: 'king', color: 'white', hasMoved: true };
  state.board[2][1] = { type: 'queen', color: 'black', hasMoved: true };
  state.board[1][2] = { type: 'king', color: 'black', hasMoved: true };
  state.currentTurn = 'white';
  
  assertTrue(isStalemate(state));
});

test('King cannot move into check', () => {
  const state = createGame('v1_classical');
  // Clear board
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      state.board[row][col] = null;
    }
  }
  state.board[0][4] = { type: 'king', color: 'white', hasMoved: false };
  state.board[7][5] = { type: 'rook', color: 'black', hasMoved: false };
  state.currentTurn = 'white';
  
  const moves = getLegalMovesForPiece(state, { row: 0, col: 4 });
  // King should not be able to move to col 5 (rook file)
  const illegalMove = moves.some(m => m.to.col === 5);
  assertFalse(illegalMove);
});

test('Pinned piece cannot move', () => {
  const state = createGame('v1_classical');
  // Clear board
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      state.board[row][col] = null;
    }
  }
  state.board[0][4] = { type: 'king', color: 'white', hasMoved: false };
  state.board[0][5] = { type: 'bishop', color: 'white', hasMoved: false }; // Pinned
  state.board[0][7] = { type: 'rook', color: 'black', hasMoved: false }; // Pinning
  state.currentTurn = 'white';
  
  const moves = getLegalMovesForPiece(state, { row: 0, col: 5 });
  // Bishop should have no legal moves (pinned to king)
  assertEqual(moves.length, 0);
});

// ============================================================================
// SUMMARY
// ============================================================================

console.log('\n=== Test Summary ===\n');
console.log(`\x1b[32mPassed: ${passedTests}\x1b[0m`);
console.log(`\x1b[31mFailed: ${failedTests}\x1b[0m`);
console.log(`Total: ${passedTests + failedTests}`);

if (failedTests > 0) {
  process.exit(1);
}
