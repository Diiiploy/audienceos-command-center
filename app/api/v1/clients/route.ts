import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/supabase'
import { withRateLimit, withCsrfProtection, sanitizeString, sanitizeEmail, sanitizeSearchPattern, createErrorResponse } from '@/lib/security'
import type { HealthStatus } from '@/types/database'

// Valid values for enums
const VALID_STAGES = ['Lead', 'Onboarding', 'Installation', 'Audit', 'Live', 'Needs Support', 'Off-Boarding']
const VALID_HEALTH_STATUSES: HealthStatus[] = ['green', 'yellow', 'red']

// Mock mode detection
const isMockMode = () => {
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') return true
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  return url.includes('placeholder') || url === ''
}

// Mock client data for demo
const MOCK_CLIENTS = [
  { id: '1', name: 'GreenLeaf Marketing', stage: 'Live', health_status: 'green', contact_name: 'Sarah Chen', contact_email: 'sarah@greenleaf.com', mrr: 4500, tags: ['ecommerce', 'retail'], is_active: true, created_at: '2025-06-15', updated_at: '2026-01-04' },
  { id: '2', name: 'FitLife Gym', stage: 'Live', health_status: 'red', contact_name: 'Mike Torres', contact_email: 'mike@fitlife.com', mrr: 3200, tags: ['fitness', 'local'], is_active: true, created_at: '2025-07-20', updated_at: '2026-01-04' },
  { id: '3', name: 'Bright Smiles Orthodontics', stage: 'Live', health_status: 'red', contact_name: 'Dr. Emily White', contact_email: 'emily@brightsmiles.com', mrr: 5800, tags: ['healthcare', 'dental'], is_active: true, created_at: '2025-05-10', updated_at: '2026-01-04' },
  { id: '4', name: 'RTA Outdoor Living', stage: 'Audit', health_status: 'yellow', contact_name: 'James Miller', contact_email: 'james@rtaoutdoor.com', mrr: 2900, tags: ['home', 'outdoor'], is_active: true, created_at: '2025-09-01', updated_at: '2026-01-04' },
  { id: '5', name: 'Allbirds', stage: 'Live', health_status: 'green', contact_name: 'Lisa Park', contact_email: 'lisa@allbirds.com', mrr: 12000, tags: ['fashion', 'sustainable'], is_active: true, created_at: '2025-03-15', updated_at: '2026-01-04' },
  { id: '6', name: 'Brooklinen', stage: 'Audit', health_status: 'yellow', contact_name: 'Tom Richards', contact_email: 'tom@brooklinen.com', mrr: 8500, tags: ['home', 'bedding'], is_active: true, created_at: '2025-04-20', updated_at: '2026-01-04' },
  { id: '7', name: 'Metro Dental', stage: 'Installation', health_status: 'yellow', contact_name: 'Dr. Robert Kim', contact_email: 'robert@metrodental.com', mrr: 0, tags: ['healthcare', 'dental'], is_active: true, created_at: '2025-11-15', updated_at: '2026-01-04' },
  { id: '8', name: 'Glow Recipe', stage: 'Live', health_status: 'green', contact_name: 'Amy Lee', contact_email: 'amy@glowrecipe.com', mrr: 15000, tags: ['beauty', 'skincare'], is_active: true, created_at: '2025-02-10', updated_at: '2026-01-04' },
  { id: '9', name: 'MVMT Watches', stage: 'Live', health_status: 'yellow', contact_name: 'Jake Thompson', contact_email: 'jake@mvmt.com', mrr: 9200, tags: ['fashion', 'accessories'], is_active: true, created_at: '2025-08-05', updated_at: '2026-01-04' },
  { id: '10', name: 'Beardbrand', stage: 'Live', health_status: 'red', contact_name: 'Eric Bandholz', contact_email: 'eric@beardbrand.com', mrr: 6700, tags: ['grooming', 'mens'], is_active: true, created_at: '2025-06-01', updated_at: '2026-01-04' },
  { id: '11', name: 'Ruggable', stage: 'Onboarding', health_status: 'green', contact_name: 'Jeneva Bell', contact_email: 'jeneva@ruggable.com', mrr: 0, tags: ['home', 'rugs'], is_active: true, created_at: '2025-12-01', updated_at: '2026-01-04' },
  { id: '12', name: 'LegalShield Pro', stage: 'Live', health_status: 'green', contact_name: 'Mark Stevens', contact_email: 'mark@legalshield.com', mrr: 4100, tags: ['legal', 'services'], is_active: true, created_at: '2025-07-10', updated_at: '2026-01-04' },
  { id: '13', name: 'Urban Auto Detailing', stage: 'Live', health_status: 'green', contact_name: 'Carlos Mendez', contact_email: 'carlos@urbanauto.com', mrr: 2800, tags: ['automotive', 'local'], is_active: true, created_at: '2025-09-20', updated_at: '2026-01-04' },
  { id: '14', name: 'Evergreen Spa', stage: 'Live', health_status: 'green', contact_name: 'Nina Patel', contact_email: 'nina@evergreenspa.com', mrr: 3500, tags: ['wellness', 'spa'], is_active: true, created_at: '2025-10-15', updated_at: '2026-01-04' },
  { id: '15', name: 'TechStart Solutions', stage: 'Lead', health_status: 'green', contact_name: 'David Chen', contact_email: 'david@techstart.io', mrr: 0, tags: ['tech', 'startup'], is_active: true, created_at: '2025-12-20', updated_at: '2026-01-04' },
]

// GET /api/v1/clients - List all clients for the agency
export async function GET(request: NextRequest) {
  // Rate limit: 100 requests per minute
  const rateLimitResponse = withRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  // Mock mode - return demo data
  if (isMockMode()) {
    const { searchParams } = new URL(request.url)
    const stage = searchParams.get('stage')
    const healthStatus = searchParams.get('health_status')
    const search = searchParams.get('search')?.toLowerCase()

    let filtered = [...MOCK_CLIENTS]
    if (stage) filtered = filtered.filter(c => c.stage === stage)
    if (healthStatus) filtered = filtered.filter(c => c.health_status === healthStatus)
    if (search) filtered = filtered.filter(c =>
      c.name.toLowerCase().includes(search) ||
      c.contact_name.toLowerCase().includes(search)
    )

    return NextResponse.json({ data: filtered })
  }

  try {
    const supabase = await createRouteHandlerClient(cookies)

    // Get authenticated user with server verification (SEC-006)
    const { user, agencyId, error: authError } = await getAuthenticatedUser(supabase)

    if (!user || !agencyId) {
      return createErrorResponse(401, authError || 'Unauthorized')
    }

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
    if (isActive !== null && isActive !== undefined) {
      query = query.eq('is_active', isActive === 'true')
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

// POST /api/v1/clients - Create a new client
export async function POST(request: NextRequest) {
  // Rate limit: 30 creates per minute (stricter for writes)
  const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
  if (rateLimitResponse) return rateLimitResponse

  // CSRF protection (TD-005)
  const csrfError = withCsrfProtection(request)
  if (csrfError) return csrfError

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
