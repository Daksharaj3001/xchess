'use client';

/**
 * PostGameAnalysis — Lightweight coaching after each game
 * Shows: Best move, Biggest mistake, Turning point
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { analyzeGame } from '@/lib/xchess';
import type { PostGameInsight } from '@/lib/xchess/analysis';
import type { GameState, PieceColor } from '@/lib/xchess/types';
import { Trophy, AlertTriangle, ArrowRightLeft, Loader2, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PostGameAnalysisProps {
  gameState: GameState;
  humanColor?: PieceColor;
}

export default function PostGameAnalysis({ gameState, humanColor }: PostGameAnalysisProps) {
  const [insight, setInsight] = useState<PostGameInsight | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (gameState.moveHistory.length < 2) return;
    setAnalyzing(true);
    // Run analysis async to avoid blocking UI
    const timer = setTimeout(() => {
      try {
        const result = analyzeGame(gameState);
        setInsight(result);
      } catch (e) {
        console.error('Analysis failed:', e);
      }
      setAnalyzing(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [gameState]);

  if (gameState.moveHistory.length < 2) return null;

  const moveLabel = (idx: number, color: PieceColor) => {
    const num = Math.floor(idx / 2) + 1;
    const side = color === 'white' ? '' : '...';
    return `${num}${side}`;
  };

  const colorLabel = (color: PieceColor) => {
    if (humanColor) return color === humanColor ? 'You' : 'Opponent';
    return color === 'white' ? 'White' : 'Black';
  };

  return (
    <Card className="bg-zinc-800 border-zinc-700" data-testid="post-game-analysis">
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <CardTitle className="text-sm text-white flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-400" />
            Game Analysis
          </span>
          {expanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
        </CardTitle>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-3 pt-0">
          {analyzing ? (
            <div className="flex items-center justify-center gap-2 py-4 text-zinc-400 text-sm" data-testid="analysis-loading">
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing game...
            </div>
          ) : insight ? (
            <>
              {/* Best Move */}
              {insight.bestMove && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20" data-testid="analysis-best-move">
                  <div className="flex items-start gap-2">
                    <Trophy className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-green-400 mb-0.5">Best Move</div>
                      <div className="text-sm text-zinc-200">
                        <span className="font-mono bg-zinc-700/60 px-1.5 py-0.5 rounded text-green-300">
                          {moveLabel(insight.bestMove.moveIndex, insight.bestMove.color)} {insight.bestMove.notation}
                        </span>
                        <span className="text-zinc-400 ml-1.5">by {colorLabel(insight.bestMove.color)}</span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">{insight.bestMove.description}</p>
                      <p className="text-[10px] text-green-500/60 mt-0.5">+{insight.bestMove.evalGain} eval</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Biggest Mistake */}
              {insight.biggestMistake && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20" data-testid="analysis-biggest-mistake">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-red-400 mb-0.5">Biggest Mistake</div>
                      <div className="text-sm text-zinc-200">
                        <span className="font-mono bg-zinc-700/60 px-1.5 py-0.5 rounded text-red-300">
                          {moveLabel(insight.biggestMistake.moveIndex, insight.biggestMistake.color)} {insight.biggestMistake.notation}
                        </span>
                        <span className="text-zinc-400 ml-1.5">by {colorLabel(insight.biggestMistake.color)}</span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">{insight.biggestMistake.description}</p>
                      {insight.biggestMistake.betterMove && (
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Better: <span className="font-mono text-yellow-400/80">{insight.biggestMistake.betterMove}</span>
                        </p>
                      )}
                      <p className="text-[10px] text-red-500/60 mt-0.5">-{insight.biggestMistake.evalLoss} eval</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Turning Point */}
              {insight.turningPoint && (
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20" data-testid="analysis-turning-point">
                  <div className="flex items-start gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-blue-400 mb-0.5">Turning Point</div>
                      <div className="text-sm text-zinc-200">
                        <span className="font-mono bg-zinc-700/60 px-1.5 py-0.5 rounded text-blue-300">
                          {moveLabel(insight.turningPoint.moveIndex, insight.turningPoint.color)} {insight.turningPoint.notation}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">{insight.turningPoint.description}</p>
                      <p className="text-[10px] text-blue-500/60 mt-0.5">{insight.turningPoint.evalSwing} eval swing</p>
                    </div>
                  </div>
                </div>
              )}

              {!insight.bestMove && !insight.biggestMistake && !insight.turningPoint && (
                <p className="text-sm text-zinc-500 text-center py-2" data-testid="analysis-no-insights">
                  Game too short for detailed analysis
                </p>
              )}
            </>
          ) : null}
        </CardContent>
      )}
    </Card>
  );
}
