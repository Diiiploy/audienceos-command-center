import { createRouteHandlerClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * OAuth Callback Handler for User Authentication
 *
 * This route handles the callback from Supabase after Google OAuth consent.
 * It exchanges the authorization code for a session and sets the auth cookies.
 *
 * Flow:
 * 1. User clicks "Sign in with Google"
 * 2. Redirected to Google consent → Supabase callback
 * 3. Supabase redirects here with ?code=xxx
 * 4. We exchange code for session
 * 5. Redirect to dashboard (or specified next URL)
 *
 * NOTE: This is for USER authentication, not integration OAuth.
 * Integration OAuth (Slack, Gmail, Ads) uses /api/v1/oauth/callback
 */
/**
 * Validate and sanitize the redirect path to prevent open redirect attacks
 * Only allows relative paths starting with /
 */
function sanitizeRedirectPath(path: string | null): string {
  if (!path) return '/'

  // Must start with / and not be a protocol-relative URL (//)
  if (!path.startsWith('/') || path.startsWith('//')) {
    return '/'
  }

  // Block any URL-like patterns that could bypass the check
  try {
    const testUrl = new URL(path, 'http://test.com')
    // If the path contains a different host, reject it
    if (testUrl.host !== 'test.com') {
      return '/'
    }
  } catch {
    // Invalid URL, default to root
    return '/'
  }

  return path
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = sanitizeRedirectPath(requestUrl.searchParams.get('next'))
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  // Handle OAuth errors from provider
  if (error) {
    console.error('[Auth Callback] OAuth error:', error, errorDescription)
    const errorUrl = new URL('/login', requestUrl.origin)
    errorUrl.searchParams.set('error', error)
    if (errorDescription) {
      errorUrl.searchParams.set('error_description', errorDescription)
    }
    return NextResponse.redirect(errorUrl)
  }

  // No code = invalid callback
  if (!code) {
    console.error('[Auth Callback] No code provided in callback')
    return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin))
  }

  try {
    const supabase = await createRouteHandlerClient(cookies)

    // Exchange the code for a session
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      // Log the actual error server-side for debugging, but don't expose to client
      console.error('[Auth Callback] Code exchange failed:', exchangeError.message)
      // Return a generic error to avoid exposing internal details
      return NextResponse.redirect(
        new URL('/login?error=auth_callback_error', requestUrl.origin)
      )
    }

    // Success - redirect to the intended destination
    console.log('[Auth Callback] Session established, redirecting to:', next)
    return NextResponse.redirect(new URL(next, requestUrl.origin))

  } catch (err) {
    console.error('[Auth Callback] Unexpected error:', err)
    return NextResponse.redirect(new URL('/login?error=unexpected_error', requestUrl.origin))
  }
}
