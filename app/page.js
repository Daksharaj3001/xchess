'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { UserMenu } from '@/components/auth/UserMenu'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { trackPageView } from '@/lib/firebase/analytics'
import Link from 'next/link'
import { Swords, Puzzle, Users, Trophy, Zap, Target, Globe } from 'lucide-react'

export default function HomePage() {
  const { isAuthenticated, loading, profile } = useAuth()

  useEffect(() => {
    trackPageView('Home', '/')
  }, [])

  return (
    <div className="min-h-screen bg-zinc-900 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/xchess-logo.png" alt="XChess" className="w-9 h-9 rounded-lg object-cover" />
            <span className="text-lg font-bold">XChess</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/play/select" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Play
            </Link>
            <Link href="/puzzles" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Puzzles
            </Link>
            <Link href="/leaderboard" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Leaderboard
            </Link>
          </nav>
          <UserMenu />
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Chess, <span className="text-[#e85555]">Reimagined</span>
          </h1>
          <p className="text-lg text-zinc-400 mb-8 max-w-2xl mx-auto">
            Experience chess with unique mechanics
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuthenticated ? (
              <>
                <Link href="/play/select">
                  <Button size="lg" className="h-12 px-8 bg-[#b94a4a] hover:bg-[#a03e3e] text-white">
                    <Swords className="w-5 h-5 mr-2" />
                    Play Now
                  </Button>
                </Link>
                <Link href="/play/select">
                  <Button size="lg" variant="outline" className="h-12 px-8 border-zinc-600 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                    <Globe className="w-5 h-5 mr-2" />
                    Challenge a Friend
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/play/select">
                  <Button size="lg" className="h-12 px-8 bg-[#b94a4a] hover:bg-[#a03e3e] text-white">
                    <Swords className="w-5 h-5 mr-2" />
                    Play Now
                  </Button>
                </Link>
                <Link href="/auth/login">
                  <Button size="lg" variant="outline" className="h-12 px-8 border-zinc-600 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                    Sign In
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="bg-zinc-800 border-zinc-700 hover:border-[#b94a4a]/50 transition-colors">
            <CardHeader>
              <div className="w-10 h-10 bg-[#b94a4a]/15 rounded-lg flex items-center justify-center mb-2">
                <Target className="w-5 h-5 text-[#b94a4a]" />
              </div>
              <CardTitle className="text-white text-base">Archer Mechanics</CardTitle>
              <CardDescription className="text-zinc-400 text-sm">
                Unique archer pieces that fire across the board. Master new strategies.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-zinc-800 border-zinc-700 hover:border-[#b94a4a]/50 transition-colors">
            <CardHeader>
              <div className="w-10 h-10 bg-[#b94a4a]/15 rounded-lg flex items-center justify-center mb-2">
                <Users className="w-5 h-5 text-[#b94a4a]" />
              </div>
              <CardTitle className="text-white text-base">Online Multiplayer</CardTitle>
              <CardDescription className="text-zinc-400 text-sm">
                Challenge friends with shareable links. Real-time moves with Supabase.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-zinc-800 border-zinc-700 hover:border-[#b94a4a]/50 transition-colors">
            <CardHeader>
              <div className="w-10 h-10 bg-[#b94a4a]/15 rounded-lg flex items-center justify-center mb-2">
                <Zap className="w-5 h-5 text-[#b94a4a]" />
              </div>
              <CardTitle className="text-white text-base">Time Controls</CardTitle>
              <CardDescription className="text-zinc-400 text-sm">
                Bullet, Blitz, Rapid, and Classical. Server-synced chess clocks.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-zinc-800 border-zinc-700 hover:border-[#b94a4a]/50 transition-colors">
            <CardHeader>
              <div className="w-10 h-10 bg-[#b94a4a]/15 rounded-lg flex items-center justify-center mb-2">
                <Swords className="w-5 h-5 text-[#b94a4a]" />
              </div>
              <CardTitle className="text-white text-base">Two Game Modes</CardTitle>
              <CardDescription className="text-zinc-400 text-sm">
                Classical 8x8 or Artillery 10x10 with archers. Play local or online.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-zinc-800 border-zinc-700 hover:border-[#b94a4a]/50 transition-colors">
            <CardHeader>
              <div className="w-10 h-10 bg-[#b94a4a]/15 rounded-lg flex items-center justify-center mb-2">
                <Trophy className="w-5 h-5 text-[#b94a4a]" />
              </div>
              <CardTitle className="text-white text-base">Leaderboards</CardTitle>
              <CardDescription className="text-zinc-400 text-sm">
                Climb the ranks and compete for top positions. ELO ratings.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-zinc-800 border-zinc-700 hover:border-[#b94a4a]/50 transition-colors">
            <CardHeader>
              <div className="w-10 h-10 bg-[#b94a4a]/15 rounded-lg flex items-center justify-center mb-2">
                <Puzzle className="w-5 h-5 text-[#b94a4a]" />
              </div>
              <CardTitle className="text-white text-base">Puzzles</CardTitle>
              <CardDescription className="text-zinc-400 text-sm">
                Train tactical vision with XChess puzzles. Easy to extreme.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA */}
      {!isAuthenticated && (
        <section className="container mx-auto px-4 py-12">
          <Card className="bg-[#b94a4a] border-[#a03e3e]">
            <CardContent className="py-10 text-center">
              <h2 className="text-2xl font-bold mb-3 text-white">Ready to Play?</h2>
              <p className="text-white/70 mb-6 max-w-md mx-auto text-sm">
                Jump right in — no account needed for local play.
              </p>
              <div className="flex gap-3 justify-center">
                <Link href="/play/select">
                  <Button size="lg" className="h-11 px-8 bg-white text-[#b94a4a] hover:bg-zinc-100">
                    Start Playing
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button size="lg" variant="outline" className="h-11 px-8 border-white/40 text-white hover:bg-white/10">
                    Create Account
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-zinc-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src="/xchess-logo.png" alt="XChess" className="w-7 h-7 rounded-lg object-cover" />
              <span className="font-semibold text-sm">XChess</span>
            </div>
            <p className="text-xs text-zinc-500">
              Built with Next.js, Supabase & Firebase
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
