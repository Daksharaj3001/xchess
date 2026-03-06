/**
 * Supabase Middleware Helper
 * 
 * Used in Next.js middleware to refresh auth tokens
 * and manage session cookies on each request.
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Skip Supabase if credentials are not configured
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured - skipping auth middleware')
    return { supabaseResponse, user: null, supabase: null }
  }

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              request.cookies.set(name, value)
            )
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Refresh session if expired - required for Server Components
    const { data: { user } } = await supabase.auth.getUser()

    return { supabaseResponse, user, supabase }
  } catch (error) {
    console.error('Supabase middleware error:', error.message)
    return { supabaseResponse, user: null, supabase: null }
  }
}
