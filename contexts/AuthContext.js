'use client'

/**
 * Authentication Context Provider
 * 
 * Manages user authentication state across the application.
 * Uses Supabase for all auth operations.
 * Creates user profile on first login.
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { trackSignUp, trackLogin } from '@/lib/firebase/analytics'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const supabase = createClient()

  /**
   * Fetch or create user profile
   */
  const fetchOrCreateProfile = useCallback(async (authUser) => {
    if (!authUser) {
      setProfile(null)
      return null
    }

    try {
      // Try to fetch existing profile
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (existingProfile) {
        setProfile(existingProfile)
        return existingProfile
      }

      // Create new profile if doesn't exist
      if (fetchError && fetchError.code === 'PGRST116') {
        const newProfile = {
          id: authUser.id,
          email: authUser.email,
          username: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Player',
          avatar_url: authUser.user_metadata?.avatar_url || null,
          rating: 1200, // Default starting rating
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single()

        if (createError) {
          console.error('Error creating profile:', createError)
          // Don't block auth if profile creation fails
          setProfile(newProfile)
          return newProfile
        }

        setProfile(createdProfile)
        return createdProfile
      }

      // Other error
      if (fetchError) {
        console.error('Error fetching profile:', fetchError)
      }

      return null
    } catch (err) {
      console.error('Profile fetch/create error:', err)
      return null
    }
  }, [supabase])

  /**
   * Initialize auth state on mount
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setUser(session.user)
          await fetchOrCreateProfile(session.user)
        }
      } catch (err) {
        console.error('Auth init error:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchOrCreateProfile(session.user)
        } else {
          setProfile(null)
        }

        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, fetchOrCreateProfile])

  /**
   * Sign up with email and password
   */
  const signUp = async (email, password, username) => {
    setError(null)
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: username,
          },
        },
      })

      if (error) throw error

      // Track sign up event
      await trackSignUp('email')

      return { data, error: null }
    } catch (err) {
      setError(err.message)
      return { data: null, error: err }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Sign in with email and password
   */
  const signIn = async (email, password) => {
    setError(null)
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Track login event
      await trackLogin('email')

      return { data, error: null }
    } catch (err) {
      setError(err.message)
      return { data: null, error: err }
    } finally {
      setLoading(false)
    }
  }

  /**
   * Sign in with Google OAuth
   * REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
   */
  const signInWithGoogle = async () => {
    setError(null)

    try {
      const redirectUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/auth/callback`
        : undefined

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      })

      if (error) throw error

      return { data, error: null }
    } catch (err) {
      setError(err.message)
      return { data: null, error: err }
    }
  }

  /**
   * Sign out
   */
  const signOut = async () => {
    setError(null)

    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      setUser(null)
      setProfile(null)

      return { error: null }
    } catch (err) {
      setError(err.message)
      return { error: err }
    }
  }

  /**
   * Send password reset email
   */
  const resetPassword = async (email) => {
    setError(null)

    try {
      // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
      const redirectUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/auth/reset-password`
        : undefined

      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      })

      if (error) throw error

      return { data, error: null }
    } catch (err) {
      setError(err.message)
      return { data: null, error: err }
    }
  }

  /**
   * Update password (after reset link click)
   */
  const updatePassword = async (newPassword) => {
    setError(null)

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      return { data, error: null }
    } catch (err) {
      setError(err.message)
      return { data: null, error: err }
    }
  }

  /**
   * Update user profile
   */
  const updateProfile = async (updates) => {
    if (!user) return { data: null, error: new Error('Not authenticated') }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error

      setProfile(data)
      return { data, error: null }
    } catch (err) {
      setError(err.message)
      return { data: null, error: err }
    }
  }

  const value = {
    user,
    profile,
    loading,
    error,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    isAuthenticated: !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to access auth context
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
