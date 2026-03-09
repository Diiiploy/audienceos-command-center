/**
 * Client Ad Performance API
 * GET /api/v1/clients/[id]/ad-performance - Get ad performance for a specific client
 *
 * RBAC: withPermission('clients', 'read')
 * Pattern: Follows /api/v1/dashboard/ad-performance/route.ts
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withRateLimit, isValidUUID, createErrorResponse } from '@/lib/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'
import { fetchClientAdPerformance } from '@/lib/services/dashboard-queries'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/v1/clients/[id]/ad-performance?days=30&platform=google_ads
 * Returns aggregated ad performance data for a specific client
 */
export const GET = withPermission({ resource: 'clients', action: 'read' })(
  async (request: AuthenticatedRequest, { params }: RouteParams) => {
    const rateLimitResponse = withRateLimit(request, { maxRequests: 60, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    try {
      const { id } = await params

      if (!isValidUUID(id)) {
        return createErrorResponse(400, 'Invalid client ID format')
      }

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      // Verify client belongs to user's agency (explicit agency_id check)
      const { data: client, error: clientError } = await supabase
        .from('client')
        .select('id')
        .eq('id', id)
        .eq('agency_id', agencyId)
        .single()

      if (clientError || !client) {
        return createErrorResponse(404, 'Client not found')
      }

      // Parse optional params
      const { searchParams } = new URL(request.url)
      const days = Math.min(Math.max(parseInt(searchParams.get('days') || '30', 10) || 30, 1), 365)
      const platform = searchParams.get('platform') || undefined
      const startDate = searchParams.get('startDate') || undefined
      const endDate = searchParams.get('endDate') || undefined
      const compareStartDate = searchParams.get('compareStartDate') || undefined
      const compareEndDate = searchParams.get('compareEndDate') || undefined
      const accountId = searchParams.get('accountId') || undefined

      const summary = await fetchClientAdPerformance(supabase, id, {
        days,
        platform,
        startDate,
        endDate,
        compareStartDate,
        compareEndDate,
        accountId,
      })

      return NextResponse.json({ data: summary })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
