/**
 * Ad Performance Dashboard API
 * GET /api/v1/dashboard/ad-performance - Get ad performance summary
 *
 * RBAC: Uses rate limiting + authenticated user check
 * Pattern: Follows /api/v1/dashboard/kpis/route.ts
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/supabase'
import { withRateLimit, createErrorResponse } from '@/lib/security'
import { fetchAdPerformanceSummary } from '@/lib/services/dashboard-queries'

/**
 * GET /api/v1/dashboard/ad-performance
 * Returns aggregated ad spend, impressions, clicks, conversions with trends and breakdowns
 */
export async function GET(request: NextRequest) {
  // Rate limit: 60 requests per minute
  const rateLimitResponse = withRateLimit(request, { maxRequests: 60, windowMs: 60000 })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = await createRouteHandlerClient(cookies)

    const { user, agencyId, error: authError } = await getAuthenticatedUser(supabase)

    if (!user || !agencyId) {
      return createErrorResponse(401, authError || 'Unauthorized')
    }

    // Parse optional parameters
    const { searchParams } = new URL(request.url)
    const days = Math.min(Math.max(parseInt(searchParams.get('days') || '30', 10) || 30, 1), 365)
    const platform = searchParams.get('platform') || undefined
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const compareStartDate = searchParams.get('compareStartDate') || undefined
    const compareEndDate = searchParams.get('compareEndDate') || undefined

    const summary = await fetchAdPerformanceSummary(supabase, agencyId, {
      days,
      platform,
      startDate,
      endDate,
      compareStartDate,
      compareEndDate,
    })

    return NextResponse.json({ data: summary })
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error fetching ad performance:', error)
    }
    return createErrorResponse(500, 'Internal server error')
  }
}
