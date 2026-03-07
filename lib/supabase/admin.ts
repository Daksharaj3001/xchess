/**
 * Supabase admin client for API routes (no cookie dependency).
 *
 * Uses the anon key directly — no user session needed for
 * multiplayer game CRUD.  The "multiplayer_games" table must
 * exist in the Supabase project (see supabase/migrations/).
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient<any, any, any> | null = null;

export function getSupabaseAdmin(): SupabaseClient<any, any, any> {
  if (adminClient) return adminClient;
  adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return adminClient;
}
