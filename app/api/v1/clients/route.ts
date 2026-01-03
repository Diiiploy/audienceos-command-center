import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { withRateLimit, sanitizeString, sanitizeEmail, createErrorResponse } from '@/lib/security'
import type { HealthStatus } from '@/types/database'

// Admin client for dev mode (bypasses RLS)
const getAdminClient = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Valid values for enums
const VALID_STAGES = ['Lead', 'Onboarding', 'Installation', 'Audit', 'Live', 'Needs Support', 'Off-Boarding']
const VALID_HEALTH_STATUSES: HealthStatus[] = ['green', 'yellow', 'red']

// GET /api/v1/clients - List all clients for the agency
export async function GET(request: NextRequest) {
  // Rate limit: 100 requests per minute
  const rateLimitResponse = withRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = await createRouteHandlerClient(cookies)

    // Get authenticated user with server verification (SEC-006)
    const { user, agencyId, error: authError } = await getAuthenticatedUser(supabase)

    // DEV MODE: Allow unauthenticated access with default agency
    const effectiveAgencyId = agencyId || '11111111-1111-1111-1111-111111111111'
    const isDevMode = !user && process.env.NODE_ENV !== 'production'

    if (!user && process.env.NODE_ENV === 'production') {
      return createErrorResponse(401, authError || 'Unauthorized')
    }

    // Use admin client in dev mode to bypass RLS
    const dbClient = isDevMode ? getAdminClient() : supabase

    // Get query params for filtering (sanitize inputs)
    const { searchParams } = new URL(request.url)
    const stage = searchParams.get('stage')
    const healthStatus = searchParams.get('health_status')
    const isActive = searchParams.get('is_active')
    const search = searchParams.get('search')

    // Build query - RLS will filter by agency_id (or explicit filter in dev mode)
    let query = dbClient
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
        )
      `)
      .eq('agency_id', effectiveAgencyId) // Explicit filter for dev mode
      .order('updated_at', { ascending: false })

    // Apply filters with validation
    if (stage && VALID_STAGES.includes(stage)) {
      query = query.eq('stage', stage)
    }
    if (healthStatus && VALID_HEALTH_STATUSES.includes(healthStatus as HealthStatus)) {
      query = query.eq('health_status', healthStatus as HealthStatus)
    }
    if (isActive !== null && isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true')
    }
    if (search) {
      // Sanitize search input and escape special characters for LIKE pattern
      const sanitizedSearch = sanitizeString(search)
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_')
        .slice(0, 100) // Limit search length
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

// POST /api/v1/clients - Create a new client
export async function POST(request: NextRequest) {
  // Rate limit: 30 creates per minute (stricter for writes)
  const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const supabase = await createRouteHandlerClient(cookies)

    // Get authenticated user with server verification (SEC-006)
    const { user, agencyId, error: authError } = await getAuthenticatedUser(supabase)

    if (!user || !agencyId) {
      return createErrorResponse(401, authError || 'Unauthorized')
    }

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(400, 'Invalid JSON body')
    }

    const { name, contact_email, contact_name, stage, health_status, notes, tags } = body

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

    return NextResponse.json({ data: client }, { status: 201 })
  } catch {
    return createErrorResponse(500, 'Internal server error')
  }
}
