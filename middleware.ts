/**
 * Next.js Middleware
 * Provides centralized authentication for protected routes (SEC-004)
 * Includes CSRF token management (TD-005)
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Environment variables - lazy access to support CI builds without env vars
function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return null // Will skip auth check if env vars missing
  }

  return { url, key }
}

// CSRF Configuration (TD-005)
const CSRF_COOKIE_NAME = '__csrf_token'

/**
 * Generate a CSRF token
 */
function generateCsrfToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Set CSRF cookie on response if not present
 */
function ensureCsrfCookie(request: NextRequest, response: NextResponse): NextResponse {
  // Check if CSRF cookie already exists
  const existingToken = request.cookies.get(CSRF_COOKIE_NAME)?.value
  if (existingToken) {
    return response
  }

  // Generate and set new CSRF token
  const token = generateCsrfToken()
  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by JavaScript to include in headers
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  })

  return response
}

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/login',
  '/auth/callback',
  '/api/v1/oauth/callback', // OAuth callback needs to work without auth
  '/api/v1/settings/invitations/', // Invitation validation/accept API (public for invite flow)
  '/api/public/', // Public endpoints (onboarding portal) - uses service role key internally
  '/invite', // Invitation acceptance pages
  '/onboarding/start', // Client onboarding portal page
  '/test-oauth', // OAuth test page (temporary - remove after testing)
]

// Page routes that allow demo mode (show demo data without auth)
// NOTE: All protected pages now require authentication for production
const DEMO_ALLOWED_PAGE_ROUTES: string[] = [
  // Removed '/' - requires login in production
  // '/client' removed - client pages require auth
]

// API routes that allow demo mode (return mock data instead of 401)
// NOTE: All API routes now require authentication for production
const DEMO_ALLOWED_API_ROUTES: string[] = [
  // Removed - all APIs require auth
]

// Static files and Next.js internals to skip
const SKIP_PATTERNS = [
  '/_next',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.json',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static files and Next.js internals
  if (SKIP_PATTERNS.some(pattern => pathname.startsWith(pattern))) {
    return NextResponse.next()
  }

  // Skip public routes (but ensure CSRF cookie is set - TD-005)
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    const response = NextResponse.next()
    return ensureCsrfCookie(request, response)
  }

  // Create response to modify if needed
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Get Supabase config - if missing, skip auth (CI/build mode)
  const supabaseConfig = getSupabaseConfig()

  // If no Supabase config, allow all requests (build-time or misconfigured)
  if (!supabaseConfig) {
    console.warn('[Middleware] Supabase not configured - skipping auth checks')
    return ensureCsrfCookie(request, response)
  }

  // Create Supabase client for middleware
  const supabase = createServerClient(
    supabaseConfig.url,
    supabaseConfig.key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Refresh session if expired
  const { data: { user }, error } = await supabase.auth.getUser()

  // For API routes
  if (pathname.startsWith('/api/')) {
    // Allow demo routes to pass through (they handle auth internally)
    if (DEMO_ALLOWED_API_ROUTES.some(route => pathname.startsWith(route))) {
      return response
    }

    // Block unauthenticated API requests
    if (error || !user) {
      return NextResponse.json(
        { error: 'unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    return response
  }

  // For page routes - redirect to login if not authenticated
  // (except demo-allowed pages which handle auth internally)
  if (error || !user) {
    if (DEMO_ALLOWED_PAGE_ROUTES.some(route => pathname.startsWith(route))) {
      // Ensure CSRF cookie is set for demo pages (TD-005)
      return ensureCsrfCookie(request, response)
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Ensure CSRF cookie is set for authenticated page requests (TD-005)
  return ensureCsrfCookie(request, response)
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
