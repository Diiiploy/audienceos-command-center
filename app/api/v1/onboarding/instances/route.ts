import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withRateLimit, withCsrfProtection, sanitizeString, sanitizeEmail, createErrorResponse } from '@/lib/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'
import { randomBytes } from 'crypto'
import type { Database } from '@/types/database'

type OnboardingStatusType = Database['public']['Enums']['onboarding_status']
const VALID_STATUSES: OnboardingStatusType[] = ['pending', 'in_progress', 'completed', 'cancelled']

// Generate a secure random token for the onboarding link
function generateLinkToken(): string {
  return randomBytes(32).toString('hex')
}

// GET /api/v1/onboarding/instances - List active onboarding instances
export const GET = withPermission({ resource: 'clients', action: 'read' })(
  async (request: AuthenticatedRequest) => {
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    try {
      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      const { searchParams } = new URL(request.url)
      const status = searchParams.get('status') // pending, in_progress, completed, cancelled
      const clientId = searchParams.get('client_id')

      let query = supabase
        .from('onboarding_instance')
        .select(`
          *,
          client:client_id (
            id,
            name,
            contact_email,
            contact_name,
            tier,
            tags
          ),
          journey:journey_id (
            id,
            name,
            stages,
            welcome_video_url,
            ai_analysis_prompt
          ),
          triggered_by_user:triggered_by (
            id,
            first_name,
            last_name,
            avatar_url
          ),
          stage_statuses:onboarding_stage_status (*)
        `)
        .eq('agency_id', agencyId)
        .order('triggered_at', { ascending: false })

      if (status && VALID_STATUSES.includes(status as OnboardingStatusType)) {
        query = query.eq('status', status as OnboardingStatusType)
      } else if (!status) {
        // By default, exclude cancelled
        query = query.neq('status', 'cancelled')
      }

      if (clientId) {
        query = query.eq('client_id', clientId)
      }

      const { data: instances, error } = await query

      if (error) {
        console.error('Failed to fetch onboarding instances:', error)
        return createErrorResponse(500, 'Failed to fetch onboarding instances')
      }

      return NextResponse.json({ data: instances })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// POST /api/v1/onboarding/instances - Trigger new onboarding
export const POST = withPermission({ resource: 'clients', action: 'write' })(
  async (request: AuthenticatedRequest) => {
    const rateLimitResponse = withRateLimit(request, { maxRequests: 20, windowMs: 60000 })
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

      const { client_name, client_email, client_tier, journey_id } = body

      // Validate required fields
      if (!client_name || typeof client_name !== 'string') {
        return createErrorResponse(400, 'Client name is required')
      }
      if (!client_email || typeof client_email !== 'string') {
        return createErrorResponse(400, 'Client email is required')
      }

      const sanitizedName = sanitizeString(client_name).slice(0, 200)
      const sanitizedEmail = sanitizeEmail(client_email)

      if (!sanitizedName) {
        return createErrorResponse(400, 'Client name is required')
      }
      if (!sanitizedEmail) {
        return createErrorResponse(400, 'Valid email is required')
      }

      // Get the journey (use default if not specified)
      let journeyQuery = supabase
        .from('onboarding_journey')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('is_active', true)

      if (journey_id && typeof journey_id === 'string') {
        journeyQuery = journeyQuery.eq('id', journey_id)
      } else {
        journeyQuery = journeyQuery.eq('is_default', true)
      }

      const { data: journey, error: journeyError } = await journeyQuery.single()

      if (journeyError || !journey) {
        return createErrorResponse(400, 'No valid journey template found')
      }

      // Create or find the client
      let clientId: string

      // Check if client with this email already exists
      const { data: existingClient } = await supabase
        .from('client')
        .select('id')
        .eq('agency_id', agencyId)
        .eq('contact_email', sanitizedEmail)
        .single()

      if (existingClient) {
        clientId = existingClient.id
      } else {
        // Create new client
        const validTier = ['Core', 'Enterprise'].includes(client_tier as string) ? client_tier : 'Core'

        const { data: newClient, error: clientError } = await supabase
          .from('client')
          .insert({
            agency_id: agencyId,
            name: sanitizedName,
            contact_email: sanitizedEmail,
            tier: validTier as 'Core' | 'Enterprise',
            stage: 'Onboarding',
            health_status: 'green',
            is_active: true,
          })
          .select('id')
          .single()

        if (clientError || !newClient) {
          console.error('Failed to create client:', clientError)
          return createErrorResponse(500, 'Failed to create client')
        }

        clientId = newClient.id
      }

      // Generate unique link token
      const linkToken = generateLinkToken()

      // Create onboarding instance
      const { data: instance, error: instanceError } = await supabase
        .from('onboarding_instance')
        .insert({
          agency_id: agencyId,
          client_id: clientId,
          journey_id: journey.id,
          link_token: linkToken,
          status: 'pending',
          triggered_by: userId,
          current_stage_id: Array.isArray(journey.stages) && journey.stages.length > 0
            ? (journey.stages[0] as { id?: string })?.id || null
            : null,
        })
        .select(`
          *,
          client:client_id (
            id,
            name,
            contact_email,
            tier
          ),
          journey:journey_id (
            id,
            name,
            stages
          )
        `)
        .single()

      if (instanceError || !instance) {
        console.error('Failed to create onboarding instance:', instanceError)
        return createErrorResponse(500, 'Failed to create onboarding instance')
      }

      // Initialize stage statuses
      if (Array.isArray(journey.stages)) {
        const stageInserts = (journey.stages as Array<{ id: string; name: string; order: number }>).map((stage) => ({
          agency_id: agencyId,
          instance_id: instance.id,
          stage_id: stage.id,
          status: 'pending' as const,
        }))

        if (stageInserts.length > 0) {
          await supabase.from('onboarding_stage_status').insert(stageInserts)
        }
      }

      // Generate the portal URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://audienceos-agro-bros.vercel.app'
      const portalUrl = `${baseUrl}/onboarding/start?token=${linkToken}`

      return NextResponse.json({
        data: {
          ...instance,
          portal_url: portalUrl,
        }
      }, { status: 201 })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
