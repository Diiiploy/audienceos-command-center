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
 *
 * SECURITY:
 * - Does NOT expose error messages (information disclosure)
 * - Validates redirect URLs to prevent open redirect attacks
 * - Only allows same-origin, relative paths
 */

/**
 * Validate redirect URL is safe (same-origin, relative path only)
 * Prevents open redirect vulnerabilities
 */
function isValidRedirectUrl(url: string): boolean {
  // Must be a relative path (start with /)
  if (!url.startsWith('/')) return false

  // Must not be a protocol-relative URL (//example.com)
  if (url.startsWith('//')) return false

  // Must not contain protocol markers (http://, https://, etc)
  if (url.includes('://')) return false

  return true
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextParam = requestUrl.searchParams.get('next') ?? '/'
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
      // SECURITY: Do NOT expose error message (prevents information disclosure)
      console.error('[Auth Callback] Code exchange failed:', exchangeError.message)
      return NextResponse.redirect(new URL('/login?error=auth_callback_error', requestUrl.origin))
    }

    // SECURITY: Validate redirect URL to prevent open redirect attacks
    const safeNext = isValidRedirectUrl(nextParam) ? nextParam : '/'
    console.log('[Auth Callback] Session established, redirecting to:', safeNext)
    return NextResponse.redirect(new URL(safeNext, requestUrl.origin))

  } catch (err) {
    console.error('[Auth Callback] Unexpected error:', err)
    return NextResponse.redirect(new URL('/login?error=unexpected_error', requestUrl.origin))
  }
}
