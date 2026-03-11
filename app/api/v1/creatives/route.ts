import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withRateLimit, withCsrfProtection, sanitizeString, isValidUUID, createErrorResponse } from '@/lib/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'
import type { CreativeStatus, CreativeFormat } from '@/types/creative'

const VALID_STATUSES: CreativeStatus[] = ['concept', 'in_production', 'review', 'approved', 'live']
const VALID_FORMATS: CreativeFormat[] = ['image', 'video', 'carousel', 'collection']

// GET /api/v1/creatives - List creatives with optional filters
export const GET = withPermission({ resource: 'clients', action: 'read' })(
  async (request: AuthenticatedRequest) => {
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    try {
      const supabase = await createRouteHandlerClient(cookies)
      const { searchParams } = new URL(request.url)
      const campaignId = searchParams.get('campaign_id')
      const clientId = searchParams.get('client_id')
      const status = searchParams.get('status')

      let query = (supabase as any)
        .from('creative')
        .select(`
          *,
          client:client_id (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (campaignId) {
        query = query.eq('campaign_id', campaignId)
      }
      if (clientId && isValidUUID(clientId)) {
        query = query.eq('client_id', clientId)
      }
      if (status && VALID_STATUSES.includes(status as CreativeStatus)) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) {
        return createErrorResponse(500, 'Failed to fetch creatives')
      }

      return NextResponse.json({ data })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// POST /api/v1/creatives - Create a new creative
export const POST = withPermission({ resource: 'clients', action: 'write' })(
  async (request: AuthenticatedRequest) => {
    const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId
      const userId = request.user.id

      let body: Record<string, unknown>
      try {
        body = await request.json()
      } catch {
        return createErrorResponse(400, 'Invalid JSON body')
      }

      const { client_id, title, format, status, campaign_id, hook, body_copy, cta_text, target_audience, platform, description, ai_generated, ai_generation_data, source_onboarding_id } = body

      if (!client_id || !isValidUUID(client_id as string)) {
        return createErrorResponse(400, 'Valid client_id is required')
      }
      if (!title || typeof title !== 'string') {
        return createErrorResponse(400, 'Title is required')
      }

      const sanitizedTitle = sanitizeString(title).slice(0, 300)
      if (!sanitizedTitle) {
        return createErrorResponse(400, 'Title is required')
      }

      const validFormat = format && VALID_FORMATS.includes(format as CreativeFormat) ? format : 'image'
      const validStatus = status && VALID_STATUSES.includes(status as CreativeStatus) ? status : 'concept'

      const { data, error } = await (supabase as any)
        .from('creative')
        .insert({
          agency_id: agencyId,
          client_id: client_id as string,
          campaign_id: campaign_id ? String(campaign_id).slice(0, 100) : null,
          title: sanitizedTitle,
          description: description ? sanitizeString(description as string).slice(0, 5000) : null,
          format: validFormat,
          status: validStatus,
          hook: hook ? sanitizeString(hook as string).slice(0, 2000) : null,
          body_copy: body_copy ? sanitizeString(body_copy as string).slice(0, 5000) : null,
          cta_text: cta_text ? sanitizeString(cta_text as string).slice(0, 100) : null,
          target_audience: target_audience ? sanitizeString(target_audience as string).slice(0, 2000) : null,
          platform: platform ? sanitizeString(platform as string).slice(0, 20) : null,
          ai_generated: ai_generated === true,
          ai_generation_data: ai_generation_data || null,
          source_onboarding_id: source_onboarding_id && isValidUUID(source_onboarding_id as string) ? source_onboarding_id : null,
          created_by: userId,
        })
        .select(`
          *,
          client:client_id (
            id,
            name
          )
        `)
        .single()

      if (error) {
        return createErrorResponse(500, 'Failed to create creative')
      }

      return NextResponse.json({ data }, { status: 201 })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
