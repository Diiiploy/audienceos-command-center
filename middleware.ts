/**
 * Next.js Middleware
 * Provides centralized authentication for protected routes (SEC-004)
 * Includes CSRF token management (TD-005)
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

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
  '/', // Allow root for demo/dev
  '/login',
  '/auth/callback',
  '/api/v1/oauth/callback', // OAuth callback needs to work without auth
]

// Page routes that allow demo mode (show demo data without auth)
const DEMO_ALLOWED_PAGE_ROUTES = [
  '/',       // Home page (Dashboard/Pipeline) - DEV MODE
  '/client', // Client detail pages work with demo data
]

// API routes that allow demo mode (return mock data instead of 401)
const DEMO_ALLOWED_API_ROUTES = [
  '/api/v1/workflows', // GET returns demo data for unauthenticated users
  '/api/v1/clients',   // GET returns demo data for unauthenticated users
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

  // Skip public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Create response to modify if needed
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create Supabase client for middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
