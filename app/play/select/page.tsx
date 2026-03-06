'use client';

/**
 * Mode Selection Page — chess.com-style game creation flow
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, Swords, Target, Users, Globe, Loader2, Shuffle, Crown,
} from 'lucide-react';
import type { GameMode } from '@/lib/xchess/types';

type ColorChoice = 'white' | 'black' | 'random';

export default function ModeSelectPage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [showOnlineSetup, setShowOnlineSetup] = useState<GameMode | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [colorChoice, setColorChoice] = useState<ColorChoice>('white');

  const handleCreateOnline = async (mode: GameMode) => {
    setCreating(true);
    try {
      const name = playerName.trim() || 'Player 1';
      const res = await fetch('/api/multiplayer/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, playerColor: colorChoice, creatorName: name }),
      });
      const data = await res.json();
      if (data.gameId) {
        // Store creator info
        localStorage.setItem(`xchess-role-${data.gameId}`, 'creator');
        localStorage.setItem(`xchess-color-${data.gameId}`, data.playerColor);
        localStorage.setItem(`xchess-name-${data.gameId}`, name);
        router.push(`/game/${data.gameId}`);
      }
    } catch (err) {
      console.error('Create game error:', err);
    } finally {
      setCreating(false);
    }
  };

  const colorOptions: { value: ColorChoice; label: string; icon: React.ReactNode }[] = [
    { value: 'white', label: 'White', icon: <div className="w-5 h-5 rounded-full bg-white border border-gray-300" /> },
    { value: 'black', label: 'Black', icon: <div className="w-5 h-5 rounded-full bg-gray-800" /> },
    { value: 'random', label: 'Random', icon: <Shuffle className="w-5 h-5 text-muted-foreground" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted" data-testid="mode-select-page">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="back-home-button">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="font-semibold">Play</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-2" data-testid="page-heading">
            New Game
          </h2>
          <p className="text-muted-foreground text-center mb-8">
            Choose a mode and start playing
          </p>

          {/* Online setup modal/card */}
          {showOnlineSetup && (
            <Card className="mb-8 border-primary/30" data-testid="online-setup-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  Challenge a Friend — {showOnlineSetup === 'v2_artillery' ? 'Artillery' : 'Classical'}
                </CardTitle>
                <CardDescription>Set up your game and share the link</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Name */}
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Your name</label>
                  <Input
                    data-testid="creator-name-input"
                    placeholder="Enter your name..."
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={20}
                  />
                </div>

                {/* Color selection */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Play as</label>
                  <div className="flex gap-2" data-testid="color-choice-group">
                    {colorOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setColorChoice(opt.value)}
                        data-testid={`color-${opt.value}`}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border-2 transition-all text-sm font-medium ${
                          colorChoice === opt.value
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-muted hover:border-muted-foreground/20'
                        }`}
                      >
                        {opt.icon}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    className="flex-1"
                    onClick={() => handleCreateOnline(showOnlineSetup)}
                    disabled={creating}
                    data-testid="create-game-button"
                  >
                    {creating ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                    ) : (
                      <><Globe className="w-4 h-4 mr-2" /> Create &amp; Share Link</>
                    )}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowOnlineSetup(null)} data-testid="cancel-setup-button">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* V1 Classical */}
            <Card className="border-2 hover:border-primary/50 transition-colors" data-testid="classical-mode-card">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                  <Swords className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Classical Mode</CardTitle>
                <CardDescription>8x8 board with standard pieces</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Traditional chess pieces</li>
                  <li>• Standard movement rules</li>
                  <li>• Perfect for beginners</li>
                </ul>
                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full"
                    onClick={() => setShowOnlineSetup('v1_classical')}
                    disabled={creating}
                    data-testid="classical-play-online"
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    Play Online
                  </Button>
                  <Link href="/play?mode=v1_classical">
                    <Button variant="outline" className="w-full" data-testid="classical-play-local">
                      <Users className="w-4 h-4 mr-2" />
                      Play Local
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* V2 Artillery */}
            <Card className="border-2 hover:border-primary/50 transition-colors bg-gradient-to-br from-card to-primary/5" data-testid="artillery-mode-card">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center mb-2">
                  <Target className="w-6 h-6 text-orange-500" />
                </div>
                <CardTitle className="flex items-center gap-2">
                  XChess Artillery
                  <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded">NEW</span>
                </CardTitle>
                <CardDescription>10x10 board with Archer pieces</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Special Archer pieces</li>
                  <li>• Fire at enemies from range</li>
                  <li>• Strategic depth++</li>
                </ul>
                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full bg-orange-600 hover:bg-orange-700"
                    onClick={() => setShowOnlineSetup('v2_artillery')}
                    disabled={creating}
                    data-testid="artillery-play-online"
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    Play Online
                  </Button>
                  <Link href="/play?mode=v2_artillery">
                    <Button variant="outline" className="w-full" data-testid="artillery-play-local">
                      <Target className="w-4 h-4 mr-2" />
                      Play Local
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Archer info */}
          <Card className="mt-8" data-testid="archer-info-card">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="text-2xl">🏹</span>
                About the Archer
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-foreground mb-1">Movement</h4>
                  <p>Moves exactly like a King (one square in any direction)</p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">Action Rule</h4>
                  <p>On its turn, can either Move OR Fire (not both)</p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">Firing Range</h4>
                  <p>6 target squares: 3 forward, 3 backward (at distance 3)</p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">Multi-Target</h4>
                  <p>Can attack up to 2 enemy pieces simultaneously</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
