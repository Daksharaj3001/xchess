'use client';

/**
 * Mode Selection Page — Chess.com-style with time controls and red theme
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Swords, Target, Users, Globe, Loader2, Shuffle, Clock, Bot } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GameMode } from '@/lib/xchess/types';
import type { BotDifficulty } from '@/lib/xchess/bot';

type ColorChoice = 'white' | 'black' | 'random';

interface TimeControl {
  key: string;
  base: number;
  increment: number;
  label: string;
  category: string;
}

const TIME_CONTROLS: TimeControl[] = [
  { key: 'bullet_1', base: 60_000, increment: 0, label: '1 min', category: 'Bullet' },
  { key: 'bullet_2', base: 120_000, increment: 1000, label: '2+1', category: 'Bullet' },
  { key: 'blitz_3', base: 180_000, increment: 0, label: '3 min', category: 'Blitz' },
  { key: 'blitz_5', base: 300_000, increment: 0, label: '5 min', category: 'Blitz' },
  { key: 'blitz_5_3', base: 300_000, increment: 3000, label: '5+3', category: 'Blitz' },
  { key: 'rapid_10', base: 600_000, increment: 0, label: '10 min', category: 'Rapid' },
  { key: 'rapid_15', base: 900_000, increment: 10_000, label: '15+10', category: 'Rapid' },
  { key: 'classical', base: 1800_000, increment: 0, label: '30 min', category: 'Classical' },
];

const CATEGORIES = ['Bullet', 'Blitz', 'Rapid', 'Classical'];

export default function ModeSelectPage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [showOnlineSetup, setShowOnlineSetup] = useState<GameMode | null>(null);
  const [showBotSetup, setShowBotSetup] = useState<GameMode | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [colorChoice, setColorChoice] = useState<ColorChoice>('white');
  const [selectedTC, setSelectedTC] = useState<string>('blitz_5');
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>('casual');

  const handleCreateOnline = async (mode: GameMode) => {
    setCreating(true);
    try {
      const name = playerName.trim() || 'Player 1';
      const tc = TIME_CONTROLS.find(t => t.key === selectedTC);
      const res = await fetch('/api/multiplayer/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          playerColor: colorChoice,
          creatorName: name,
          timeControl: tc ? { base: tc.base, increment: tc.increment } : undefined,
        }),
      });
      const data = await res.json();
      if (data.gameId) {
        localStorage.setItem(`xchess-role-${data.gameId}`, 'creator');
        localStorage.setItem(`xchess-color-${data.gameId}`, data.playerColor);
        localStorage.setItem(`xchess-name-${data.gameId}`, name);
        router.push(`/game/${data.gameId}`);
      }
    } catch (err) { console.error('Create game error:', err); }
    finally { setCreating(false); }
  };

  const colorOptions: { value: ColorChoice; label: string; icon: React.ReactNode }[] = [
    { value: 'white', label: 'White', icon: <div className="w-5 h-5 rounded-full bg-white border border-zinc-400" /> },
    { value: 'black', label: 'Black', icon: <div className="w-5 h-5 rounded-full bg-zinc-900 border border-zinc-600" /> },
    { value: 'random', label: 'Random', icon: <Shuffle className="w-5 h-5 text-zinc-400" /> },
  ];

  return (
    <div className="min-h-screen bg-zinc-900 text-white" data-testid="mode-select-page">
      <header className="border-b border-zinc-800">
        <div className="container mx-auto px-4 h-12 flex items-center gap-4">
          <Link href="/"><Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white hover:bg-zinc-800" data-testid="back-home-button"><ArrowLeft className="w-4 h-4 mr-1" /> Home</Button></Link>
          <h1 className="font-semibold text-sm">Play</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-1" data-testid="page-heading">New Game</h2>
          <p className="text-zinc-400 text-center text-sm mb-6">Choose a mode and start playing</p>

          {/* Online setup */}
          {showOnlineSetup && (
            <Card className="mb-6 bg-zinc-800 border-[#b94a4a]/40" data-testid="online-setup-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Globe className="w-5 h-5 text-[#b94a4a]" />
                  Challenge a Friend — {showOnlineSetup === 'v2_artillery' ? 'Artillery' : 'Classical'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Name */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block text-zinc-300">Your name</label>
                  <Input data-testid="creator-name-input" placeholder="Enter your name..." value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={20} className="bg-zinc-900 border-zinc-600 text-white" />
                </div>

                {/* Color choice */}
                <div>
                  <label className="text-sm font-medium mb-2 block text-zinc-300">Play as</label>
                  <div className="flex gap-2" data-testid="color-choice-group">
                    {colorOptions.map(opt => (
                      <button key={opt.value} onClick={() => setColorChoice(opt.value)} data-testid={`color-${opt.value}`}
                        className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border-2 transition-all text-sm font-medium',
                          colorChoice === opt.value ? 'border-[#b94a4a] bg-[#b94a4a]/10 text-[#e88]' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500')}>
                        {opt.icon} {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time control */}
                <div>
                  <label className="text-sm font-medium mb-2 block text-zinc-300 flex items-center gap-1.5"><Clock className="w-4 h-4" /> Time Control</label>
                  <div className="space-y-2" data-testid="time-control-picker">
                    {CATEGORIES.map(cat => {
                      const tcs = TIME_CONTROLS.filter(t => t.category === cat);
                      return (
                        <div key={cat} className="flex items-center gap-2">
                          <span className="text-xs text-zinc-500 w-16 flex-shrink-0">{cat}</span>
                          <div className="flex gap-1.5 flex-wrap">
                            {tcs.map(tc => (
                              <button key={tc.key} onClick={() => setSelectedTC(tc.key)} data-testid={`tc-${tc.key}`}
                                className={cn('px-3 py-1.5 rounded text-xs font-medium transition-all',
                                  selectedTC === tc.key ? 'bg-[#b94a4a] text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600')}>
                                {tc.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <Button className="flex-1 bg-[#b94a4a] hover:bg-[#a03e3e] text-white" onClick={() => handleCreateOnline(showOnlineSetup)} disabled={creating} data-testid="create-game-button">
                    {creating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : <><Globe className="w-4 h-4 mr-2" /> Create Game</>}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowOnlineSetup(null)} className="text-zinc-400 hover:text-white" data-testid="cancel-setup-button">Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bot setup */}
          {showBotSetup && (
            <Card className="mb-6 bg-zinc-800 border-purple-500/40" data-testid="bot-setup-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Bot className="w-5 h-5 text-purple-400" />
                  Play vs Bot — {showBotSetup === 'v2_artillery' ? 'Artillery' : 'Classical'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Difficulty */}
                <div>
                  <label className="text-sm font-medium mb-2 block text-zinc-300">Difficulty</label>
                  <div className="flex gap-2" data-testid="difficulty-picker">
                    {([
                      { key: 'beginner' as BotDifficulty, label: 'Beginner', desc: 'Random moves' },
                      { key: 'casual' as BotDifficulty, label: 'Casual', desc: 'Decent play' },
                      { key: 'challenger' as BotDifficulty, label: 'Challenger', desc: 'Tough opponent' },
                    ]).map(d => (
                      <button key={d.key} onClick={() => setBotDifficulty(d.key)} data-testid={`diff-${d.key}`}
                        className={cn('flex-1 py-2.5 px-2 rounded-lg border-2 transition-all text-center',
                          botDifficulty === d.key ? 'border-purple-500 bg-purple-500/10' : 'border-zinc-700 hover:border-zinc-500')}>
                        <div className={cn('text-sm font-medium', botDifficulty === d.key ? 'text-purple-300' : 'text-zinc-300')}>{d.label}</div>
                        <div className="text-[10px] text-zinc-500">{d.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color choice */}
                <div>
                  <label className="text-sm font-medium mb-2 block text-zinc-300">Play as</label>
                  <div className="flex gap-2" data-testid="bot-color-choice">
                    {colorOptions.map(opt => (
                      <button key={opt.value} onClick={() => setColorChoice(opt.value)} data-testid={`bot-color-${opt.value}`}
                        className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border-2 transition-all text-sm font-medium',
                          colorChoice === opt.value ? 'border-purple-500 bg-purple-500/10 text-purple-300' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500')}>
                        {opt.icon} {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <Link href={`/play?mode=${showBotSetup}&bot=${botDifficulty}&color=${colorChoice === 'random' ? (Math.random() < 0.5 ? 'white' : 'black') : colorChoice}`} className="flex-1">
                    <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white" data-testid="start-bot-game">
                      <Bot className="w-4 h-4 mr-2" /> Start Game
                    </Button>
                  </Link>
                  <Button variant="ghost" onClick={() => setShowBotSetup(null)} className="text-zinc-400 hover:text-white" data-testid="cancel-bot-setup">Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {/* Classical */}
            <Card className="bg-zinc-800 border-zinc-700 hover:border-[#b94a4a]/50 transition-colors" data-testid="classical-mode-card">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 bg-[#b94a4a]/15 rounded-lg flex items-center justify-center mb-1"><Swords className="w-5 h-5 text-[#b94a4a]" /></div>
                <CardTitle className="text-white text-lg">Classical Mode</CardTitle>
                <CardDescription className="text-zinc-400">8x8 board with standard pieces</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="text-sm text-zinc-400 space-y-1">
                  <li>• Traditional chess pieces</li>
                  <li>• Standard movement rules</li>
                  <li>• Perfect for beginners</li>
                </ul>
                <div className="flex flex-col gap-2">
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white" onClick={() => { setShowBotSetup('v1_classical'); setShowOnlineSetup(null); }} data-testid="classical-play-bot"><Bot className="w-4 h-4 mr-2" /> Play vs Bot</Button>
                  <Link href="/play?mode=v1_classical"><Button variant="outline" className="w-full border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:text-white" data-testid="classical-play-local"><Users className="w-4 h-4 mr-2" /> Play Local</Button></Link>
                </div>
              </CardContent>
            </Card>

            {/* Artillery */}
            <Card className="bg-zinc-800 border-zinc-700 hover:border-orange-500/50 transition-colors" data-testid="artillery-mode-card">
              <CardHeader className="pb-3">
                <div className="w-10 h-10 bg-orange-500/15 rounded-lg flex items-center justify-center mb-1"><Target className="w-5 h-5 text-orange-400" /></div>
                <CardTitle className="text-white text-lg flex items-center gap-2">XChess Artillery <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded font-normal">NEW</span></CardTitle>
                <CardDescription className="text-zinc-400">10x10 board with Archer pieces</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="text-sm text-zinc-400 space-y-1">
                  <li>• Special Archer pieces</li>
                  <li>• Fire at enemies from range</li>
                  <li>• Strategic depth++</li>
                </ul>
                <div className="flex flex-col gap-2">
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white" onClick={() => { setShowBotSetup('v2_artillery'); setShowOnlineSetup(null); }} data-testid="artillery-play-bot"><Bot className="w-4 h-4 mr-2" /> Play vs Bot</Button>
                  <Link href="/play?mode=v2_artillery"><Button variant="outline" className="w-full border-zinc-600 text-zinc-300 hover:bg-zinc-700 hover:text-white" data-testid="artillery-play-local"><Target className="w-4 h-4 mr-2" /> Play Local</Button></Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Archer info */}
          <Card className="mt-6 bg-zinc-800 border-zinc-700" data-testid="archer-info-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-white flex items-center gap-2">About the Archer</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-zinc-400">
              <div className="grid md:grid-cols-2 gap-3">
                <div><h4 className="font-medium text-zinc-200 mb-0.5">Movement</h4><p>Moves like a King (one square)</p></div>
                <div><h4 className="font-medium text-zinc-200 mb-0.5">Action Rule</h4><p>Can Move OR Fire each turn</p></div>
                <div><h4 className="font-medium text-zinc-200 mb-0.5">Firing Range</h4><p>6 squares at distance 3</p></div>
                <div><h4 className="font-medium text-zinc-200 mb-0.5">Multi-Target</h4><p>Up to 2 enemies simultaneously</p></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
