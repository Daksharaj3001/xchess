'use client'

import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { UserMenu } from '@/components/auth/UserMenu'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { trackPageView } from '@/lib/firebase/analytics'
import Link from 'next/link'
import { 
  Swords, 
  Puzzle, 
  Users, 
  Trophy,
  Zap,
  Target
} from 'lucide-react'

export default function HomePage() {
  const { isAuthenticated, loading, profile } = useAuth()

  useEffect(() => {
    trackPageView('Home', '/')
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-xl font-bold text-primary-foreground">X</span>
            </div>
            <span className="text-xl font-bold">XChess</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/play" className="text-sm font-medium hover:text-primary transition-colors">
              Play
            </Link>
            <Link href="/puzzles" className="text-sm font-medium hover:text-primary transition-colors">
              Puzzles
            </Link>
            <Link href="/leaderboard" className="text-sm font-medium hover:text-primary transition-colors">
              Leaderboard
            </Link>
          </nav>
          <UserMenu />
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            Chess, <span className="text-primary">Reimagined</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Experience chess with unique archer mechanics. 
            Strategic depth meets innovative gameplay on XChess.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuthenticated ? (
              <>
                <Link href="/play/select">
                  <Button size="lg" className="h-12 px-8">
                    <Swords className="w-5 h-5 mr-2" />
                    Play Now
                  </Button>
                </Link>
                <Link href="/puzzles">
                  <Button size="lg" variant="outline" className="h-12 px-8">
                    <Puzzle className="w-5 h-5 mr-2" />
                    Solve Puzzles
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/auth/signup">
                  <Button size="lg" className="h-12 px-8">
                    <Zap className="w-5 h-5 mr-2" />
                    Get Started Free
                  </Button>
                </Link>
                <Link href="/auth/login">
                  <Button size="lg" variant="outline" className="h-12 px-8">
                    Sign In
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Archer Mechanics</CardTitle>
              <CardDescription>
                Unique archer pieces that can fire across the board. 
                Master new strategies and outplay your opponents.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Matchmaking</CardTitle>
              <CardDescription>
                Find opponents at your skill level. 
                Fair and competitive matches powered by ELO ratings.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Puzzle className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Puzzles</CardTitle>
              <CardDescription>
                Train your tactical vision with XChess-specific puzzles. 
                From easy to extreme difficulty.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Leaderboards</CardTitle>
              <CardDescription>
                Climb the ranks and compete for top positions. 
                Track your progress over time.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Real-time Games</CardTitle>
              <CardDescription>
                Instant move synchronization with Supabase Realtime. 
                Smooth, lag-free gameplay.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-primary/50 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Swords className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Multiple Modes</CardTitle>
              <CardDescription>
                Play online, vs AI, or analyze positions. 
                Choose your preferred time control.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      {!isAuthenticated && (
        <section className="container mx-auto px-4 py-16">
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="py-12 text-center">
              <h2 className="text-3xl font-bold mb-4">Ready to Play?</h2>
              <p className="text-primary-foreground/80 mb-6 max-w-md mx-auto">
                Join thousands of players experiencing chess in a whole new way.
              </p>
              <Link href="/auth/signup">
                <Button size="lg" variant="secondary" className="h-12 px-8">
                  Create Free Account
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t bg-muted/50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-sm font-bold text-primary-foreground">X</span>
              </div>
              <span className="font-semibold">XChess</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Built with Supabase & Firebase
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
