import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withRateLimit, withCsrfProtection, sanitizeString, sanitizeEmail, sanitizeSearchPattern, createErrorResponse } from '@/lib/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'
import type { HealthStatus } from '@/types/database'
import { createSlackChannelForClient } from '@/lib/integrations/slack-channel-service'
import { randomBytes } from 'crypto'

// Valid values for enums
const VALID_STAGES = ['Lead', 'Onboarding', 'Installation', 'Audit', 'Live', 'Needs Support', 'Off-boarding']
const VALID_HEALTH_STATUSES: HealthStatus[] = ['green', 'yellow', 'red']

// GET /api/v1/clients - List all clients for the agency
export const GET = withPermission({ resource: 'clients', action: 'read' })(
  async (request: AuthenticatedRequest) => {
    // Rate limit: 100 requests per minute
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    try {
      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId

    // Get query params for filtering (sanitize inputs)
    const { searchParams } = new URL(request.url)
    const stage = searchParams.get('stage')
    const healthStatus = searchParams.get('health_status')
    const isActive = searchParams.get('is_active')
    const search = searchParams.get('search')

    // Build query - RLS will filter by agency_id, explicit filter for defense-in-depth
    let query = supabase
      .from('client')
      .select(`
        *,
        assignments:client_assignment (
          id,
          role,
          user:user_id (
            id,
            first_name,
            last_name,
            avatar_url
          )
        ),
        stage_events:stage_event (
          moved_at
        )
      `)
      .eq('agency_id', agencyId) // Multi-tenant isolation (SEC-007)
      .order('updated_at', { ascending: false })

    // Apply filters with validation
    if (stage && VALID_STAGES.includes(stage)) {
      query = query.eq('stage', stage)
    }
    if (healthStatus && VALID_HEALTH_STATUSES.includes(healthStatus as HealthStatus)) {
      query = query.eq('health_status', healthStatus as HealthStatus)
    }
    // Default to active clients unless explicitly requesting all
    if (isActive === 'all') {
      // No filter - return all clients (for admin/reporting)
    } else if (isActive === 'false') {
      query = query.eq('is_active', false)
    } else {
      // Default: only active clients
      query = query.eq('is_active', true)
    }
    if (search) {
      const sanitizedSearch = sanitizeSearchPattern(search)
      if (sanitizedSearch) {
        query = query.or(`name.ilike.%${sanitizedSearch}%,contact_email.ilike.%${sanitizedSearch}%,contact_name.ilike.%${sanitizedSearch}%`)
      }
    }

    const { data: clients, error } = await query

    if (error) {
      return createErrorResponse(500, 'Failed to fetch clients')
    }

      return NextResponse.json({ data: clients })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// POST /api/v1/clients - Create a new client
export const POST = withPermission({ resource: 'clients', action: 'write' })(
  async (request: AuthenticatedRequest) => {
    // Rate limit: 30 creates per minute (stricter for writes)
    const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    // CSRF protection (TD-005)
    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(400, 'Invalid JSON body')
    }

    const { name, contact_email, contact_name, stage, health_status, notes, tags, assigned_to_user_id, contact_emails } = body

    // Validate and sanitize required fields
    if (!name || typeof name !== 'string') {
      return createErrorResponse(400, 'Client name is required')
    }

    const sanitizedName = sanitizeString(name).slice(0, 200)
    if (!sanitizedName) {
      return createErrorResponse(400, 'Client name is required')
    }

    // Validate optional fields
    const sanitizedEmail = typeof contact_email === 'string' ? sanitizeEmail(contact_email) : null
    const sanitizedContactName = typeof contact_name === 'string' ? sanitizeString(contact_name).slice(0, 200) : null
    const sanitizedNotes = typeof notes === 'string' ? sanitizeString(notes).slice(0, 5000) : null

    // Validate stage and health_status enums
    const validatedStage = typeof stage === 'string' && VALID_STAGES.includes(stage) ? stage : 'Lead'
    const validatedHealthStatus = typeof health_status === 'string' && VALID_HEALTH_STATUSES.includes(health_status as HealthStatus)
      ? (health_status as HealthStatus)
      : 'green'

    // Validate tags array
    const validatedTags = Array.isArray(tags)
      ? tags.filter((t): t is string => typeof t === 'string').map(t => sanitizeString(t).slice(0, 50)).slice(0, 20)
      : []

    // Use agencyId from getAuthenticatedUser (SEC-006 - already fetched from DB)
    const { data: client, error } = await supabase
      .from('client')
      .insert({
        agency_id: agencyId,
        name: sanitizedName,
        contact_email: sanitizedEmail,
        contact_name: sanitizedContactName,
        stage: validatedStage,
        health_status: validatedHealthStatus,
        notes: sanitizedNotes,
        tags: validatedTags,
      })
      .select()
      .single()

    if (error) {
      return createErrorResponse(500, 'Failed to create client')
    }

    // Create initial stage_event so days_in_stage tracking starts from creation
    (supabase as any)
      .from('stage_event')
      .insert({
        agency_id: agencyId,
        client_id: client.id,
        from_stage: null,
        to_stage: validatedStage,
        moved_by: request.user.id,
      })
      .then(({ error: eventError }: { error: unknown }) => {
        if (eventError) {
          console.error('[clients/POST] Failed to create initial stage_event:', eventError)
        }
      })

    // Auto-create Slack channel if configured (fire-and-forget)
    try {
      const { data: slackIntegration } = await supabase
        .from('integration')
        .select('config')
        .eq('agency_id', agencyId)
        .eq('provider', 'slack')
        .eq('is_connected', true)
        .maybeSingle()

      const config = slackIntegration?.config as Record<string, unknown> | null
      if (config?.auto_create_channel === true) {
        // Fire-and-forget: don't block client creation on channel creation
        createSlackChannelForClient({
          agencyId,
          clientId: client.id,
          clientName: client.name,
          isPrivate: config.channel_visibility === 'private',
          supabase,
        }).catch((err) => {
          console.error('[clients/POST] Auto-create Slack channel failed:', err)
        })
      }
    } catch {
      // Non-fatal: Slack auto-create failure should never block client creation
    }

    // Auto-create client assignment (fire-and-forget)
    const assignUserId = (typeof assigned_to_user_id === 'string' && assigned_to_user_id) || request.user.id;
    (supabase as any)
      .from('client_assignment')
      .upsert({
        agency_id: agencyId,
        client_id: client.id,
        user_id: assignUserId,
        role: 'owner',
      }, {
        onConflict: 'client_id,user_id,role',
      })
      .then(({ error: assignError }: { error: unknown }) => {
        if (assignError) {
          console.error('[clients/POST] Failed to create client_assignment:', assignError)
        }
      })

    // Store additional contact emails (fire-and-forget)
    if (Array.isArray(contact_emails) && contact_emails.length > 0) {
      const validEmails = contact_emails
        .filter((e): e is string => typeof e === 'string' && e.trim().length > 0)
        .map(e => sanitizeEmail(e.trim()))
        .filter((e): e is string => e !== null)

      if (validEmails.length > 0) {
        const contactInserts = validEmails.map((email, index) => ({
          agency_id: agencyId,
          client_id: client.id,
          email,
          is_primary: index === 0 && !sanitizedEmail,
          role: 'primary',
          source: 'manual',
        }));
        (supabase as any)
          .from('client_contact')
          .insert(contactInserts)
          .then(({ error: contactError }: { error: unknown }) => {
            if (contactError) {
              console.error('[clients/POST] Failed to create contact emails:', contactError)
            }
          })
      }
    }

    // Auto-create onboarding instance with all stage statuses (fire-and-forget)
    // This ensures every client appears in the Onboarding Pipeline
    try {
      // Find the default active journey
      const { data: journey } = await supabase
        .from('onboarding_journey')
        .select('id, stages')
        .eq('agency_id', agencyId)
        .eq('is_active', true)
        .eq('is_default', true)
        .single()

      if (journey) {
        const linkToken = randomBytes(32).toString('hex')
        const stages = Array.isArray(journey.stages) ? journey.stages as Array<{ id: string; name: string; order: number }> : []

        const { data: instance, error: instanceError } = await supabase
          .from('onboarding_instance')
          .insert({
            agency_id: agencyId,
            client_id: client.id,
            journey_id: journey.id,
            link_token: linkToken,
            status: 'pending',
            triggered_by: request.user.id,
            current_stage_id: stages.length > 0 ? stages[0].id : null,
          })
          .select('id')
          .single()

        if (!instanceError && instance) {
          // Initialize all stage statuses as pending
          if (stages.length > 0) {
            const stageInserts = stages.map((s) => ({
              agency_id: agencyId,
              instance_id: instance.id,
              stage_id: s.id,
              status: 'pending' as const,
            }))
            await supabase.from('onboarding_stage_status').insert(stageInserts)
          }
        } else if (instanceError) {
          console.error('[clients/POST] Failed to create onboarding instance:', instanceError)
        }
      } else {
        console.warn('[clients/POST] No default active journey found — skipping auto-onboard')
      }
    } catch (onboardErr) {
      // Non-fatal: onboarding auto-creation should never block client creation
      console.error('[clients/POST] Auto-onboard failed:', onboardErr)
    }

      return NextResponse.json({ data: client }, { status: 201 })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
