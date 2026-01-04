import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

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
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (!isMounted) return

        if (error) {
          console.error('Error getting session:', error)
          setState(prev => ({ ...prev, isLoading: false, error: error.message }))
          return
        }

        if (session?.user) {
          const profile = await fetchProfile(session.user.id)
          if (!isMounted) return

          setState({
            user: session.user,
            profile,
            session,
            isLoading: false,
            isAuthenticated: true,
            error: profile ? null : 'Profile not found - please contact support',
          })
        } else {
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

    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
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
