import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { User, Session, SupabaseClient } from '@supabase/supabase-js'

// Mock mode detection - allows app to work without real Supabase
const MOCK_AGENCY_ID = 'demo-agency'
const isMockMode = () => {
  // Explicit override for development testing
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') return true
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  return url.includes('placeholder') || url === ''
}

/**
 * Parse session from Supabase auth cookie
 * Cookie format: sb-{projectRef}-auth-token = base64-{base64EncodedJSON}
 *
 * NOTE: This bypasses the hanging getSession() issue in @supabase/ssr
 * discovered 2026-01-05. Direct cookie reading is reliable.
 */
function getSessionFromCookie(): { access_token: string; refresh_token: string; user: User } | null {
  if (typeof document === 'undefined') return null

  const cookies = document.cookie.split(';').map(c => c.trim())
  const authCookie = cookies.find(c => c.startsWith('sb-') && c.includes('-auth-token='))

  if (!authCookie) return null

  try {
    let cookieValue = authCookie.split('=').slice(1).join('=')
    cookieValue = decodeURIComponent(cookieValue)

    // Strip 'base64-' prefix if present
    if (cookieValue.startsWith('base64-')) {
      cookieValue = cookieValue.substring(7)
    }

    const session = JSON.parse(atob(cookieValue))

    if (session.access_token && session.refresh_token && session.user) {
      return {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        user: session.user as User
      }
    }
  } catch (e) {
    console.error('[AUTH] Failed to parse session cookie:', e)
  }

  return null
}

/**
 * Initialize session from cookie using setSession()
 * This bypasses the hanging getSession() in @supabase/ssr
 */
async function initSessionFromCookie(supabase: SupabaseClient): Promise<Session | null> {
  const cookieSession = getSessionFromCookie()

  if (!cookieSession) {
    console.log('[AUTH] No session cookie found')
    return null
  }

  console.log('[AUTH] Found session cookie, calling setSession...')
  const startTime = performance.now()

  const { data, error } = await supabase.auth.setSession({
    access_token: cookieSession.access_token,
    refresh_token: cookieSession.refresh_token
  })

  const duration = performance.now() - startTime
  console.log(`[AUTH] setSession completed in ${duration.toFixed(0)}ms`)

  if (error) {
    console.error('[AUTH] setSession error:', error.message)
    return null
  }

  return data.session
}

export interface UserProfile {
  id: string
  agency_id: string
  first_name: string
  last_name: string
  email: string
  avatar_url: string | null
  role: string
}

interface AuthState {
  user: User | null
  profile: UserProfile | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
}

/**
 * Hook for managing authentication state
 * Uses Supabase Auth with automatic session refresh
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    error: null,
  })

  const supabase = createClient()

  // Fetch user profile from database
  const fetchProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('user')
        .select('id, agency_id, first_name, last_name, email, avatar_url, role')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        return null
      }

      return data as UserProfile
    } catch (error) {
      console.error('Error in fetchProfile:', error)
      return null
    }
  }, [supabase])

  // Initialize auth state
  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      // Mock mode - return demo data without hitting Supabase
      if (isMockMode()) {
        console.info('[Auth] Mock mode enabled - using demo agency')
        setState({
          user: null,
          profile: {
            id: 'mock-user-id',
            agency_id: MOCK_AGENCY_ID,
            first_name: 'Demo',
            last_name: 'User',
            email: 'demo@audienceos.dev',
            avatar_url: null,
            role: 'admin',
          },
          session: null,
          isLoading: false,
          isAuthenticated: true, // Treat as authenticated for UI purposes
          error: null,
        })
        return
      }

      try {
        // Use cookie-based session init to bypass hanging getSession()
        const sessionStart = performance.now()
        const session = await initSessionFromCookie(supabase)
        const sessionDuration = performance.now() - sessionStart
        console.log(`[AUTH-SESSION] initSessionFromCookie completed in ${sessionDuration.toFixed(0)}ms`)

        if (!isMounted) return

        if (session?.user) {
          const profileStart = performance.now()
          const profile = await fetchProfile(session.user.id)
          const profileDuration = performance.now() - profileStart
          console.log(`[AUTH-PROFILE] fetchProfile() completed in ${profileDuration.toFixed(0)}ms`)

          if (!isMounted) return

          console.log('[AUTH-SETSTATE] Setting state with user profile, isLoading=false')
          setState({
            user: session.user,
            profile,
            session,
            isLoading: false,
            isAuthenticated: true,
            error: profile ? null : 'Profile not found - please contact support',
          })
        } else {
          console.log('[AUTH-SETSTATE] No session found, setting isLoading=false')
          setState({
            user: null,
            profile: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
            error: null,
          })
        }
      } catch (error) {
        console.error('Error in initAuth:', error)
        if (!isMounted) return
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }))
      }
    }

    // DIAGNOSTIC: Log auth initialization start
    const authStartTime = performance.now()
    console.log('[AUTH-INIT] Starting auth initialization')

    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      const elapsed = performance.now() - authStartTime
      console.warn(`[AUTH-TIMEOUT] Auth timeout after ${elapsed.toFixed(0)}ms`)
      if (isMounted) {
        setState(prev => {
          if (prev.isLoading) {
            console.warn('Auth timeout - setting isLoading to false')
            return { ...prev, isLoading: false, error: 'Auth timeout' }
          }
          return prev
        })
      }
    }, 5000)

    initAuth()

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return
        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await fetchProfile(session.user.id)
          if (!isMounted) return
          setState({
            user: session.user,
            profile,
            session,
            isLoading: false,
            isAuthenticated: true,
            error: null,
          })
        } else if (event === 'SIGNED_OUT') {
          setState({
            user: null,
            profile: null,
            session: null,
            isLoading: false,
            isAuthenticated: false,
            error: null,
          })
        }
      }
    )

    return () => {
      isMounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

  // Sign out
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
    }
  }, [supabase])

  return {
    ...state,
    signOut,
    // Convenience getters
    displayName: state.profile
      ? `${state.profile.first_name} ${state.profile.last_name}`
      : state.user?.email || 'User',
    agencyId: state.profile?.agency_id || null,
  }
}

/**
 * Hook that checks auth status and logs warning if not authenticated
 * Note: Redirect logic should be implemented at the page level
 */
export function useRequireAuth(redirectTo: string = '/login') {
  const auth = useAuth()

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      console.warn(`Auth required. User should be redirected to: ${redirectTo}`)
    }
  }, [auth.isLoading, auth.isAuthenticated, redirectTo])

  return auth
}
