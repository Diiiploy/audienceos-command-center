import { createBrowserClient, createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// Environment variables - check at runtime, not module load
// This allows builds to succeed even without env vars (CI/CD)
function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    // During build/static generation, these may not be available
    // Return empty strings to prevent crashes - actual usage will fail gracefully
    if (typeof window === 'undefined') {
      console.warn('[Supabase] Environment variables not configured - using placeholders for build')
      return { url: 'https://placeholder.supabase.co', key: 'placeholder-key' }
    }
    throw new Error('Supabase URL and API key are required. Check your environment variables.')
  }

  return { url, key }
}

// Lazy-loaded config to avoid issues during static generation
let _supabaseUrl: string | null = null
let _supabaseAnonKey: string | null = null

function getConfig() {
  if (!_supabaseUrl || !_supabaseAnonKey) {
    const config = getSupabaseConfig()
    _supabaseUrl = config.url
    _supabaseAnonKey = config.key
  }
  return { supabaseUrl: _supabaseUrl, supabaseAnonKey: _supabaseAnonKey }
}

/**
 * Singleton browser client - prevents infinite re-render loops
 * when used in React hooks with dependency arrays
 */
let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

/**
 * Create a Supabase client for browser/client components
 * Uses cookie-based auth with automatic token refresh
 * Returns singleton to prevent re-render loops in hooks
 */
export function createClient() {
  if (!browserClient) {
    const { supabaseUrl, supabaseAnonKey } = getConfig()
    browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
  }
  return browserClient
}

/**
 * Create a Supabase client for Server Components
 * Requires cookies() from next/headers
 */
export async function createServerComponentClient(
  cookiesFn: () => Promise<{
    getAll: () => { name: string; value: string }[]
    set: (name: string, value: string, options?: object) => void
  }>
) {
  const cookieStore = await cookiesFn()
  const { supabaseUrl, supabaseAnonKey } = getConfig()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server Component - can't set cookies
        }
      },
    },
  })
}

/**
 * Create a Supabase client for Route Handlers and Server Actions
 * Requires cookies() from next/headers - async version for Next.js 15
 */
export async function createRouteHandlerClient(
  cookiesFn: () => Promise<{
    getAll: () => { name: string; value: string }[]
    set: (name: string, value: string, options?: object) => void
  }>
) {
  const cookieStore = await cookiesFn()
  const { supabaseUrl, supabaseAnonKey } = getConfig()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        )
      },
    },
  })
}

/**
 * Create a Supabase client for middleware
 * Handles auth token refresh on each request
 */
export function createMiddlewareClient(
  request: Request,
  response: Response
) {
  const cookieHeader = request.headers.get('cookie') || ''
  const cookiePairs = cookieHeader.split(';').filter(Boolean)
  const { supabaseUrl, supabaseAnonKey } = getConfig()

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookiePairs.map((cookie: string) => {
          const [name, ...rest] = cookie.trim().split('=')
          return { name, value: rest.join('=') }
        })
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          response.headers.append('Set-Cookie', `${name}=${value}; Path=/; HttpOnly; SameSite=Lax`)
        })
      },
    },
  })
}

// =============================================================================
// AUTH HELPERS (SEC-003, SEC-006)
// =============================================================================

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Get the current user's agency_id from the database
 * This is more secure than trusting JWT user_metadata which can be stale
 *
 * @returns agency_id or null if user not found
 */
export async function getUserAgencyId(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('user')
    .select('agency_id')
    .eq('id', userId)
    .single()

  if (error || !data?.agency_id) {
    return null
  }

  return data.agency_id
}

/**
 * Get the authenticated user using getUser() (server-verified)
 * This is more secure than getSession() which only validates JWT locally
 *
 * Optimized flow:
 * 1. Quick local check with getSession() - fails fast if no session
 * 2. Server verification with getUser() - only if session exists
 *
 * @returns { user, agencyId } or { user: null, agencyId: null } if not authenticated
 */
export async function getAuthenticatedUser(
  supabase: SupabaseClient<Database>
): Promise<{
  user: Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user']
  agencyId: string | null
  error: string | null
}> {
  // Fast path: check if session exists locally first
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return { user: null, agencyId: null, error: 'No session' }
  }

  // Session exists - verify with server (more secure)
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { user: null, agencyId: null, error: 'Not authenticated' }
  }

  const agencyId = await getUserAgencyId(supabase, user.id)

  if (!agencyId) {
    return { user, agencyId: null, error: 'No agency associated with user' }
  }

  return { user, agencyId, error: null }
}

// Re-export types for convenience
export type { Database }
