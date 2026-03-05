/**
 * Next.js Middleware
 * 
 * Handles:
 * - Supabase session refresh on each request
 * - Route protection for authenticated pages
 */

import { NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Routes that require authentication
const protectedRoutes = [
  '/profile',
  '/settings',
  '/games',
]

// Routes that should redirect to home if already authenticated
const authRoutes = [
  '/auth/login',
  '/auth/signup',
]

export async function middleware(request) {
  const { pathname } = request.nextUrl

  // Update Supabase session
  const { supabaseResponse, user } = await updateSession(request)

  // Check if route requires authentication
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))

  // Redirect unauthenticated users from protected routes
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users from auth routes
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\..*).*)'
  ],
}
