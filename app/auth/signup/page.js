'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, Loader2, CheckCircle, UserPlus } from 'lucide-react'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  
  const { signUp, signInWithGoogle } = useAuth()
  const router = useRouter()

  const handleEmailSignUp = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    const { data, error: signUpError } = await signUp(email, password, username)

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data?.user && !data.session) {
      setSuccess(true)
      setLoading(false)
    } else {
      router.push('/')
    }
  }

  const handleGoogleSignUp = async () => {
    setError('')
    setGoogleLoading(true)

    try {
      const { error: googleError } = await signInWithGoogle()
      if (googleError) {
        setError(googleError.message || 'Google sign-in failed')
        setGoogleLoading(false)
      }
    } catch (err) {
      setError('Google sign-in failed. Please try again.')
      setGoogleLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-900 p-4">
        <Card className="w-full max-w-md shadow-xl bg-zinc-800 border-zinc-700">
          <CardHeader className="text-center">
            <div className="w-14 h-14 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-green-500" />
            </div>
            <CardTitle className="text-xl text-white">Check Your Email</CardTitle>
            <CardDescription className="text-zinc-400">
              We&apos;ve sent a confirmation link to <strong className="text-zinc-200">{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-zinc-400">
            <p>Click the link to verify your account and start playing.</p>
          </CardContent>
          <CardFooter>
            <Link href="/auth/login" className="w-full">
              <Button variant="ghost" className="w-full text-zinc-400 hover:text-white">Back to Sign In</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900 p-4">
      <Card className="w-full max-w-md shadow-xl bg-zinc-800 border-zinc-700">
        <CardHeader className="text-center">
          <img src="/xchess-logo.png" alt="XChess" className="w-14 h-14 rounded-xl object-cover mx-auto mb-4" />
          <CardTitle className="text-xl text-white">Create Your Account</CardTitle>
          <CardDescription className="text-zinc-400">
            Join the XChess community
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-900/30 border border-red-800/50 text-red-300 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full bg-zinc-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-800 px-2 text-zinc-500">Sign up with email</span>
            </div>
          </div>

          <form onSubmit={handleEmailSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-zinc-300">Username</Label>
              <Input id="username" type="text" placeholder="Choose a username" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={2}
                className="bg-zinc-900 border-zinc-600 text-white placeholder:text-zinc-500" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">Email</Label>
              <Input id="email" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="bg-zinc-900 border-zinc-600 text-white placeholder:text-zinc-500" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">Password</Label>
              <Input id="password" type="password" placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                className="bg-zinc-900 border-zinc-600 text-white placeholder:text-zinc-500" />
            </div>
            <Button type="submit" className="w-full h-12 bg-[#b94a4a] hover:bg-[#a03e3e] text-white" disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <UserPlus className="w-5 h-5 mr-2" />}
              Create Account
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <p className="text-sm text-zinc-400 text-center">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-[#b94a4a] hover:underline font-medium">Sign in</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
