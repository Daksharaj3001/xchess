/**
 * XChess Replay System Tests
 * 
 * Tests for game state serialization and replay functionality.
 * Run with: npx tsx tests/xchess-replay.test.ts
 */

import {
  createGame,
  applyMove,
  GameState,
} from '../lib/xchess/engine';

import {
  serializeGameState,
  deserializeGameState,
  boardToFen,
  fenToBoard,
  positionToAlgebraic,
  algebraicToPosition,
  generateMoveNotation,
  parseUciMove,
} from '../lib/xchess/serialization';

import {
  createReplayState,
  reconstructGame,
  stepForward,
  stepBackward,
  jumpToMove,
  jumpToStart,
  jumpToEnd,
  getFormattedMoveList,
  StoredMove,
} from '../lib/xchess/replay';

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

// ============================================================================
// POSITION CONVERSION TESTS
// ============================================================================

console.log('\n=== Position Conversion Tests ===\n');

test('positionToAlgebraic converts correctly', () => {
  assertEqual(positionToAlgebraic({ row: 0, col: 0 }), 'a1');
  assertEqual(positionToAlgebraic({ row: 0, col: 4 }), 'e1');
  assertEqual(positionToAlgebraic({ row: 7, col: 7 }), 'h8');
  assertEqual(positionToAlgebraic({ row: 3, col: 4 }), 'e4');
});

test('algebraicToPosition converts correctly', () => {
  const a1 = algebraicToPosition('a1');
  assertEqual(a1.row, 0);
  assertEqual(a1.col, 0);
  
  const e4 = algebraicToPosition('e4');
  assertEqual(e4.row, 3);
  assertEqual(e4.col, 4);
  
  const h8 = algebraicToPosition('h8');
  assertEqual(h8.row, 7);
  assertEqual(h8.col, 7);
});

test('Position conversion is reversible', () => {
  const positions = [
    { row: 0, col: 0 },
    { row: 3, col: 4 },
    { row: 7, col: 7 },
    { row: 5, col: 2 },
  ];
  
  for (const pos of positions) {
    const algebraic = positionToAlgebraic(pos);
    const converted = algebraicToPosition(algebraic);
    assertEqual(converted.row, pos.row);
    assertEqual(converted.col, pos.col);
  }
});

// ============================================================================
// BOARD SERIALIZATION TESTS
// ============================================================================

console.log('\n=== Board Serialization Tests ===\n');

test('boardToFen produces valid FEN for initial V1 position', () => {
  const state = createGame('v1_classical');
  const fen = boardToFen(state.board);
  
  // Should have 8 rows separated by /
  const rows = fen.split('/');
  assertEqual(rows.length, 8);
  
  // First row (black's back rank) should have pieces
  assertTrue(rows[0].length > 0);
  
  // Check pawns row
  assertTrue(rows[1].includes('p'), 'Should have black pawns');
  assertTrue(rows[6].includes('P'), 'Should have white pawns');
});

test('boardToFen produces valid FEN for initial V2 position', () => {
  const state = createGame('v2_artillery');
  const fen = boardToFen(state.board);
  
  // Should have 10 rows separated by /
  const rows = fen.split('/');
  assertEqual(rows.length, 10);
  
  // Should contain archers
  assertTrue(fen.includes('a') || fen.includes('A'), 'Should have archers');
});

test('fenToBoard can reconstruct V1 board', () => {
  const state = createGame('v1_classical');
  const fen = boardToFen(state.board);
  const reconstructedBoard = fenToBoard(fen, 8);
  
  // Compare boards
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const original = state.board[row][col];
      const reconstructed = reconstructedBoard[row][col];
      
      if (original === null) {
        assertEqual(reconstructed, null, `Square ${row},${col} should be empty`);
      } else {
        assertTrue(reconstructed !== null, `Square ${row},${col} should have piece`);
        assertEqual(reconstructed!.type, original.type);
        assertEqual(reconstructed!.color, original.color);
      }
    }
  }
});

test('fenToBoard can reconstruct V2 board', () => {
  const state = createGame('v2_artillery');
  const fen = boardToFen(state.board);
  const reconstructedBoard = fenToBoard(fen, 10);
  
  // Count pieces
  let originalArchers = 0;
  let reconstructedArchers = 0;
  
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      if (state.board[row][col]?.type === 'archer') originalArchers++;
      if (reconstructedBoard[row][col]?.type === 'archer') reconstructedArchers++;
    }
  }
  
  assertEqual(reconstructedArchers, originalArchers, 'Archer count should match');
});

// ============================================================================
// GAME STATE SERIALIZATION TESTS
// ============================================================================

console.log('\n=== Game State Serialization Tests ===\n');

test('serializeGameState includes all components', () => {
  const state = createGame('v1_classical');
  const serialized = serializeGameState(state);
  
  const parts = serialized.split(' ');
  assertTrue(parts.length >= 7, 'Should have at least 7 parts');
  
  // Check components
  assertTrue(parts[0].includes('/'), 'Should have board FEN');
  assertEqual(parts[1], 'w', 'Should be white to move');
  assertTrue(['KQkq', '-'].includes(parts[2]) || parts[2].match(/[KQkq]+/), 'Should have castling rights');
  assertTrue(parts[3] === '-' || parts[3].match(/[a-h][1-8]/), 'Should have en passant');
  assertTrue(!isNaN(parseInt(parts[4])), 'Should have half-move clock');
  assertTrue(!isNaN(parseInt(parts[5])), 'Should have move number');
  assertEqual(parts[6], 'v1_classical', 'Should have game mode');
});

test('deserializeGameState reconstructs state', () => {
  const original = createGame('v2_artillery');
  const serialized = serializeGameState(original);
  const deserialized = deserializeGameState(serialized);
  
  assertEqual(deserialized.gameMode, original.gameMode);
  assertEqual(deserialized.currentTurn, original.currentTurn);
  assertEqual(deserialized.moveNumber, original.moveNumber);
  assertEqual(deserialized.board.length, original.board.length);
});

test('Serialization is reversible after moves', () => {
  let state = createGame('v1_classical');
  
  // Play some moves
  let result = applyMove(state, { row: 1, col: 4 }, { row: 3, col: 4 }); // e4
  state = result.newState!;
  
  result = applyMove(state, { row: 6, col: 4 }, { row: 4, col: 4 }); // e5
  state = result.newState!;
  
  // Serialize and deserialize
  const serialized = serializeGameState(state);
  const deserialized = deserializeGameState(serialized);
  
  assertEqual(deserialized.currentTurn, 'white');
  assertEqual(deserialized.moveNumber, 2);
});

// ============================================================================
// MOVE NOTATION TESTS
// ============================================================================

console.log('\n=== Move Notation Tests ===\n');

test('generateMoveNotation produces correct pawn move', () => {
  const piece = { type: 'pawn' as const, color: 'white' as const, hasMoved: false };
  const notation = generateMoveNotation(
    { row: 1, col: 4 },
    { row: 3, col: 4 },
    piece,
    false,
    false,
    false,
    null
  );
  
  assertEqual(notation.san, 'e4');
  assertEqual(notation.uci, 'e2e4');
});

test('generateMoveNotation produces correct capture', () => {
  const piece = { type: 'knight' as const, color: 'white' as const, hasMoved: false };
  const notation = generateMoveNotation(
    { row: 0, col: 1 },
    { row: 2, col: 2 },
    piece,
    true,
    false,
    false,
    null
  );
  
  assertEqual(notation.san, 'Nxc3');
  assertEqual(notation.uci, 'b1c3');
});

test('generateMoveNotation produces correct castling', () => {
  const piece = { type: 'king' as const, color: 'white' as const, hasMoved: false };
  
  const kingsideNotation = generateMoveNotation(
    { row: 0, col: 4 },
    { row: 0, col: 6 },
    piece,
    false,
    false,
    false,
    'kingside'
  );
  assertEqual(kingsideNotation.san, 'O-O');
  
  const queensideNotation = generateMoveNotation(
    { row: 0, col: 4 },
    { row: 0, col: 2 },
    piece,
    false,
    false,
    false,
    'queenside'
  );
  assertEqual(queensideNotation.san, 'O-O-O');
});

test('generateMoveNotation handles check symbol', () => {
  const piece = { type: 'queen' as const, color: 'white' as const, hasMoved: false };
  const notation = generateMoveNotation(
    { row: 3, col: 3 },
    { row: 7, col: 7 },
    piece,
    false,
    true,
    false,
    null
  );
  
  assertTrue(notation.san.includes('+'), 'Should have check symbol');
});

test('generateMoveNotation handles checkmate symbol', () => {
  const piece = { type: 'queen' as const, color: 'white' as const, hasMoved: false };
  const notation = generateMoveNotation(
    { row: 3, col: 3 },
    { row: 7, col: 7 },
    piece,
    false,
    true,
    true,
    null
  );
  
  assertTrue(notation.san.includes('#'), 'Should have checkmate symbol');
});

test('generateMoveNotation handles archer fire', () => {
  const piece = { type: 'archer' as const, color: 'white' as const, hasMoved: false };
  const targets = [{ row: 6, col: 4 }, { row: 6, col: 5 }];
  
  const notation = generateMoveNotation(
    { row: 3, col: 4 },
    { row: 3, col: 4 },
    piece,
    true,
    false,
    false,
    null,
    undefined,
    targets
  );
  
  assertTrue(notation.san.startsWith('A@'), 'Archer fire should start with A@');
  assertTrue(notation.uci.includes(':'), 'UCI should have target separator');
});

test('parseUciMove parses standard moves', () => {
  const parsed = parseUciMove('e2e4');
  assertEqual(parsed.from.row, 1);
  assertEqual(parsed.from.col, 4);
  assertEqual(parsed.to.row, 3);
  assertEqual(parsed.to.col, 4);
});

test('parseUciMove parses promotion', () => {
  const parsed = parseUciMove('e7e8q');
  assertEqual(parsed.promotion, 'queen');
});

test('parseUciMove parses archer fire', () => {
  const parsed = parseUciMove('e4e4:e7,f7');
  assertTrue(parsed.archerTargets !== undefined);
  assertEqual(parsed.archerTargets!.length, 2);
});

// ============================================================================
// REPLAY SYSTEM TESTS
// ============================================================================

console.log('\n=== Replay System Tests ===\n');

// Create mock moves for testing
// Using positions that work with XChess baseline: Knight-Bishop-Rook-Queen-King-Rook-Bishop-Knight
function createMockMoves(): StoredMove[] {
  return [
    {
      id: '1',
      gameId: 'test-game',
      moveNumber: 1,
      isWhite: true,
      san: 'e4',
      uci: 'e2e4',
      fenBefore: '',
      fenAfter: '',
      isCapture: false,
      isCheck: false,
      isCheckmate: false,
      isCastle: false,
      isArcherShot: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      gameId: 'test-game',
      moveNumber: 1,
      isWhite: false,
      san: 'e5',
      uci: 'e7e5',
      fenBefore: '',
      fenAfter: '',
      isCapture: false,
      isCheck: false,
      isCheckmate: false,
      isCastle: false,
      isArcherShot: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: '3',
      gameId: 'test-game',
      moveNumber: 2,
      isWhite: true,
      san: 'd4',
      uci: 'd2d4',  // Changed from Nf3 to d4 (pawn move that always works)
      fenBefore: '',
      fenAfter: '',
      isCapture: false,
      isCheck: false,
      isCheckmate: false,
      isCastle: false,
      isArcherShot: false,
      createdAt: new Date().toISOString(),
    },
  ];
}

test('createReplayState initializes correctly', () => {
  const moves = createMockMoves();
  const replay = createReplayState('test-game', 'v1_classical', moves);
  
  assertEqual(replay.gameId, 'test-game');
  assertEqual(replay.gameMode, 'v1_classical');
  assertEqual(replay.totalMoves, 3);
  assertEqual(replay.currentMoveIndex, -1);
  assertTrue(replay.isAtStart);
  assertFalse(replay.isAtEnd);
});

test('stepForward advances replay', () => {
  const moves = createMockMoves();
  let replay = createReplayState('test-game', 'v1_classical', moves);
  
  replay = stepForward(replay);
  assertEqual(replay.currentMoveIndex, 0);
  assertFalse(replay.isAtStart);
  
  replay = stepForward(replay);
  assertEqual(replay.currentMoveIndex, 1);
});

test('stepBackward retreats replay', () => {
  const moves = createMockMoves();
  let replay = createReplayState('test-game', 'v1_classical', moves);
  
  // Go forward first
  replay = stepForward(replay);
  replay = stepForward(replay);
  assertEqual(replay.currentMoveIndex, 1);
  
  // Then back
  replay = stepBackward(replay);
  assertEqual(replay.currentMoveIndex, 0);
  
  replay = stepBackward(replay);
  assertEqual(replay.currentMoveIndex, -1);
  assertTrue(replay.isAtStart);
});

test('jumpToMove works correctly', () => {
  const moves = createMockMoves();
  let replay = createReplayState('test-game', 'v1_classical', moves);
  
  replay = jumpToMove(replay, 2);
  assertEqual(replay.currentMoveIndex, 2);
  assertTrue(replay.isAtEnd);
  
  replay = jumpToMove(replay, 0);
  assertEqual(replay.currentMoveIndex, 0);
  assertFalse(replay.isAtEnd);
});

test('jumpToStart returns to initial position', () => {
  const moves = createMockMoves();
  let replay = createReplayState('test-game', 'v1_classical', moves);
  
  replay = stepForward(replay);
  replay = stepForward(replay);
  replay = jumpToStart(replay);
  
  assertEqual(replay.currentMoveIndex, -1);
  assertTrue(replay.isAtStart);
});

test('jumpToEnd goes to final position', () => {
  const moves = createMockMoves();
  let replay = createReplayState('test-game', 'v1_classical', moves);
  
  replay = jumpToEnd(replay);
  
  assertEqual(replay.currentMoveIndex, 2);
  assertTrue(replay.isAtEnd);
});

test('reconstructGame produces all states', () => {
  const moves = createMockMoves();
  const { states, finalState } = reconstructGame('v1_classical', moves);
  
  // Should have initial state + one state per move
  assertEqual(states.length, moves.length + 1);
  
  // Final state should be black's turn (after Nf3)
  assertEqual(finalState.currentTurn, 'black');
});

test('getFormattedMoveList formats moves for display', () => {
  const moves = createMockMoves();
  const formatted = getFormattedMoveList(moves);
  
  assertEqual(formatted.length, 2); // 2 full move pairs
  
  assertEqual(formatted[0].moveNumber, 1);
  assertEqual(formatted[0].white?.san, 'e4');
  assertEqual(formatted[0].black?.san, 'e5');
  
  assertEqual(formatted[1].moveNumber, 2);
  assertEqual(formatted[1].white?.san, 'd4');
  assertEqual(formatted[1].black, null);
});

test('Replay does not go past end', () => {
  const moves = createMockMoves();
  let replay = createReplayState('test-game', 'v1_classical', moves);
  
  replay = jumpToEnd(replay);
  const atEnd = replay.currentMoveIndex;
  
  replay = stepForward(replay);
  assertEqual(replay.currentMoveIndex, atEnd, 'Should not advance past end');
});

test('Replay does not go before start', () => {
  const moves = createMockMoves();
  let replay = createReplayState('test-game', 'v1_classical', moves);
  
  replay = stepBackward(replay);
  assertEqual(replay.currentMoveIndex, -1, 'Should not go before start');
  assertTrue(replay.isAtStart);
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
