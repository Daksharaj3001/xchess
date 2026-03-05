'use client';

/**
 * Mode Selection Page
 * 
 * Choose between V1 Classical (8x8) and V2 Artillery (10x10) modes.
 */

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Swords, Target, Users, Bot } from 'lucide-react';

export default function ModeSelectPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="font-semibold">Select Game Mode</h1>
        </div>
      </header>
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-2">Choose Your Mode</h2>
          <p className="text-muted-foreground text-center mb-8">
            Select a game mode to start playing
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* V1 Classical */}
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-2">
                  <Swords className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Classical Mode</CardTitle>
                <CardDescription>8×8 board with standard pieces</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Traditional chess pieces</li>
                  <li>• Standard movement rules</li>
                  <li>• Perfect for beginners</li>
                </ul>
                <div className="flex flex-col gap-2">
                  <Link href="/play?mode=v1_classical">
                    <Button className="w-full">
                      <Users className="w-4 h-4 mr-2" />
                      Play Local
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
            
            {/* V2 Artillery */}
            <Card className="border-2 hover:border-primary/50 transition-colors bg-gradient-to-br from-card to-primary/5">
              <CardHeader>
                <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center mb-2">
                  <Target className="w-6 h-6 text-orange-500" />
                </div>
                <CardTitle className="flex items-center gap-2">
                  XChess Artillery
                  <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded">NEW</span>
                </CardTitle>
                <CardDescription>10×10 board with Archer pieces</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Special Archer pieces</li>
                  <li>• Fire at enemies from range</li>
                  <li>• Strategic depth++</li>
                </ul>
                <div className="flex flex-col gap-2">
                  <Link href="/play?mode=v2_artillery">
                    <Button className="w-full bg-orange-600 hover:bg-orange-700">
                      <Target className="w-4 h-4 mr-2" />
                      Play XChess
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Archer info */}
          <Card className="mt-8">
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
