/**
 * Supabase Client Configuration
 * 
 * This module provides the browser-side Supabase client.
 * Uses ONLY the anon key (safe for client-side).
 * 
 * Handles:
 * - User authentication (email/password, OAuth)
 * - Database queries from client components
 * - Realtime subscriptions
 */

import { createBrowserClient } from '@supabase/ssr'

let supabaseClient = null

/**
 * Creates or returns existing Supabase browser client
 * Singleton pattern to avoid multiple client instances
 */
export function createClient() {
  if (supabaseClient) return supabaseClient

  supabaseClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )

  return supabaseClient
}

/**
 * Get the Supabase client instance
 * Convenience export for direct usage
 */
export const supabase = {
  get client() {
    return createClient()
  }
}

export default createClient
