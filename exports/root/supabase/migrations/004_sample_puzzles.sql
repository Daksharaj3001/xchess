-- ============================================================================
-- Sample Puzzles for XChess
-- ============================================================================
-- Run this AFTER the main schema
-- Note: Run this with service_role key or disable RLS temporarily
-- ============================================================================

-- Temporarily disable RLS for puzzle insertion
ALTER TABLE puzzles DISABLE ROW LEVEL SECURITY;

-- Clear existing puzzles
DELETE FROM puzzles;

-- Insert sample puzzles
INSERT INTO puzzles (fen, solution, difficulty, rating, themes, source) VALUES
-- Easy puzzles (< 1200)
('r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4', 
 ARRAY['f3f7'], 'easy', 800, ARRAY['mate_in_1', 'scholars_mate'], 'classic'),

('r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 2 3',
 ARRAY['f3f7'], 'easy', 850, ARRAY['mate_in_1', 'f7_weakness'], 'classic'),

('rnbqkb1r/pppp1ppp/5n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 2 3',
 ARRAY['h5f7'], 'easy', 900, ARRAY['mate_in_1'], 'classic'),

('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5',
 ARRAY['c4f7', 'e8f7', 'f3g5', 'f7g8', 'd1b3'], 'easy', 1000, ARRAY['attack', 'tactic'], 'classic'),

('r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
 ARRAY['f1b5'], 'easy', 1100, ARRAY['development', 'opening'], 'classic'),

-- Medium puzzles (1200-1600)
('r2qkb1r/ppp2ppp/2n1bn2/3pp3/4P3/1PN2N2/PBPP1PPP/R2QKB1R w KQkq - 0 6',
 ARRAY['f3e5', 'c6e5', 'd1h5', 'g7g6', 'h5e5'], 'medium', 1300, ARRAY['tactic', 'fork'], 'lichess'),

('r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
 ARRAY['f3g5', 'd8g5', 'd1f3'], 'medium', 1400, ARRAY['attack', 'knight_sacrifice'], 'lichess'),

('r1b1kb1r/ppppqppp/5n2/4n3/3PP3/2N5/PPP2PPP/R1BQKBNR w KQkq - 1 6',
 ARRAY['d4e5', 'f6e4', 'c1e3'], 'medium', 1450, ARRAY['center_control', 'development'], 'lichess'),

('r1bqkb1r/pp1ppppp/2n2n2/2p5/3PP3/5N2/PPP2PPP/RNBQKB1R w KQkq c6 0 4',
 ARRAY['d4d5', 'c6b8', 'e4e5'], 'medium', 1500, ARRAY['space_advantage', 'pawn_push'], 'lichess'),

('r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
 ARRAY['f3g5', 'd7d5', 'e4d5', 'f6d5', 'g5f7'], 'medium', 1550, ARRAY['sacrifice', 'attack'], 'lichess'),

-- Hard puzzles (1600-2000)
('r1bqr1k1/ppp2ppp/2np1n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQR1K1 w - - 0 8',
 ARRAY['c4f7', 'f8f7', 'f3g5', 'f7f8', 'c3d5'], 'hard', 1700, ARRAY['sacrifice', 'attack', 'initiative'], 'lichess'),

('r2qk2r/ppp1bppp/2npbn2/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 7',
 ARRAY['c4f7', 'e6f7', 'd1b3', 'd8e7', 'f3g5'], 'hard', 1800, ARRAY['sacrifice', 'discovered_attack'], 'lichess'),

('r1bq1rk1/ppp2ppp/2n1pn2/3p4/1bPP4/2N1PN2/PP3PPP/R1BQKB1R w KQ - 0 7',
 ARRAY['c4d5', 'e6d5', 'f1b5', 'c8d7', 'b5c6', 'b7c6'], 'hard', 1850, ARRAY['pawn_structure', 'positional'], 'lichess'),

('r1b1kb1r/pp1n1ppp/2p1pn2/q2p4/2PP4/2N1PN2/PP3PPP/R1BQKB1R w KQkq - 0 7',
 ARRAY['c4d5', 'c6d5', 'f1b5', 'c8d7', 'b5d7', 'b8d7', 'd1a4'], 'hard', 1900, ARRAY['pin', 'positional'], 'lichess'),

('r2qkb1r/pp2pppp/2n2n2/3p4/3P1Bb1/2N1PN2/PP3PPP/R2QKB1R b KQkq - 0 6',
 ARRAY['f6e4', 'f4g3', 'e4c3', 'b2c3', 'd8a5'], 'hard', 1950, ARRAY['tactic', 'queen_attack'], 'lichess'),

-- Extreme puzzles (> 2000)
('r1bqkb1r/pp3ppp/2n1pn2/2pp4/3P1B2/2P1PN2/PP3PPP/RN1QKB1R w KQkq - 0 6',
 ARRAY['d1b3', 'd5d4', 'c3d4', 'c5d4', 'f1b5', 'c8d7', 'b5c6', 'b7c6', 'e3d4', 'c6c5'], 'extreme', 2100, ARRAY['positional', 'pawn_structure'], 'lichess'),

('r1bq1rk1/pp2nppp/2n1p3/2ppP3/3P4/2P2N2/PP1N1PPP/R1BQKB1R w KQ - 0 8',
 ARRAY['f3g5', 'h7h6', 'g5h3', 'f7f5', 'e5f6', 'e7f5', 'f6g7', 'f8f7', 'd2f3'], 'extreme', 2200, ARRAY['attack', 'sacrifice', 'complex'], 'lichess'),

('r2qr1k1/ppp2ppp/2n1bn2/3pp3/8/1BN1PN2/PPPP1PPP/R1BQK2R w KQ - 0 8',
 ARRAY['f3e5', 'c6e5', 'f2f4', 'e5c6', 'e4d5', 'f6d5', 'c3d5', 'e6d5', 'b3d5'], 'extreme', 2300, ARRAY['tactics', 'calculation'], 'lichess'),

('r1b2rk1/pp1nqppp/2pbpn2/3p4/2PP4/2N1PN2/PPQ2PPP/R1B1KB1R w KQ - 0 8',
 ARRAY['c4d5', 'e6d5', 'f1d3', 'f8e8', 'e1g1', 'c6b4', 'd3h7', 'g8h7', 'c2b1'], 'extreme', 2400, ARRAY['sacrifice', 'attack', 'king_hunt'], 'lichess'),

('r1bq1rk1/pp2bppp/2n1pn2/3pP3/3P4/P1N2N2/1P2BPPP/R1BQK2R b KQ - 0 9',
 ARRAY['f6e4', 'c3e4', 'd5e4', 'f3d2', 'e6e5', 'd4e5', 'd8d5'], 'extreme', 2500, ARRAY['tactics', 'counter_attack', 'complex'], 'lichess');

-- Re-enable RLS
ALTER TABLE puzzles ENABLE ROW LEVEL SECURITY;

-- Verify puzzles were inserted
-- SELECT COUNT(*), difficulty FROM puzzles GROUP BY difficulty ORDER BY difficulty;
