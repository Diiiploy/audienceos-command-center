/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Temporary: Generated Database types have Insert type mismatch after RBAC migration
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withRateLimit, withCsrfProtection, sanitizeString, sanitizeSearchPattern, isValidUUID, createErrorResponse } from '@/lib/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'
import type { TicketCategory, TicketPriority, TicketStatus } from '@/types/database'

// Valid enum values
const VALID_STATUSES: TicketStatus[] = ['new', 'in_progress', 'waiting_client', 'resolved']
const VALID_PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'critical']
const VALID_CATEGORIES: TicketCategory[] = ['technical', 'billing', 'campaign', 'general', 'escalation']

// Mock mode detection
const isMockMode = () => {
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') return true
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  return url.includes('placeholder') || url === ''
}

// Mock tickets for demo
const MOCK_TICKETS = [
  {
    id: 'ticket-001',
    agency_id: 'demo-agency',
    client_id: 'client-001',
    title: 'Pixel misfiring on checkout',
    description: 'Conversion pixel not firing on checkout confirmation page after theme update.',
    category: 'technical' as TicketCategory,
    priority: 'high' as TicketPriority,
    status: 'in_progress' as TicketStatus,
    assignee_id: 'user-004',
    created_by: 'user-001',
    due_date: null,
    resolved_at: null,
    time_spent_minutes: 45,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    client: { id: 'client-001', name: 'Beardbrand', health_status: 'yellow' },
    assignee: { id: 'user-004', first_name: 'Chase', last_name: 'Digital', avatar_url: null },
  },
  {
    id: 'ticket-002',
    agency_id: 'demo-agency',
    client_id: 'client-002',
    title: 'iOS 17 tracking documentation needed',
    description: 'Client requesting clarification on iOS 17 changes and impact on their tracking setup.',
    category: 'general' as TicketCategory,
    priority: 'medium' as TicketPriority,
    status: 'new' as TicketStatus,
    assignee_id: 'user-003',
    created_by: 'user-001',
    due_date: null,
    resolved_at: null,
    time_spent_minutes: 0,
    created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    client: { id: 'client-002', name: 'Allbirds', health_status: 'green' },
    assignee: { id: 'user-003', first_name: 'Trevor', last_name: 'Mills', avatar_url: null },
  },
  {
    id: 'ticket-003',
    agency_id: 'demo-agency',
    client_id: 'client-003',
    title: 'GTM container access request',
    description: 'Waiting for client IT team to provide GTM admin access for pixel installation.',
    category: 'technical' as TicketCategory,
    priority: 'high' as TicketPriority,
    status: 'waiting_client' as TicketStatus,
    assignee_id: 'user-001',
    created_by: 'user-001',
    due_date: null,
    resolved_at: null,
    time_spent_minutes: 30,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    client: { id: 'client-003', name: 'RTA Outdoor Living', health_status: 'yellow' },
    assignee: { id: 'user-001', first_name: 'Brent', last_name: 'Walker', avatar_url: null },
  },
  {
    id: 'ticket-004',
    agency_id: 'demo-agency',
    client_id: 'client-004',
    title: 'Theme compatibility debugging',
    description: 'Custom Shopify theme blocking standard pixel installation methods.',
    category: 'technical' as TicketCategory,
    priority: 'high' as TicketPriority,
    status: 'in_progress' as TicketStatus,
    assignee_id: 'user-001',
    created_by: 'user-002',
    due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    resolved_at: null,
    time_spent_minutes: 120,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    client: { id: 'client-004', name: 'Brooklinen', health_status: 'red' },
    assignee: { id: 'user-001', first_name: 'Brent', last_name: 'Walker', avatar_url: null },
  },
  {
    id: 'ticket-005',
    agency_id: 'demo-agency',
    client_id: 'client-005',
    title: 'Monthly report generation',
    description: 'Generate and send November performance report to client.',
    category: 'general' as TicketCategory,
    priority: 'low' as TicketPriority,
    status: 'resolved' as TicketStatus,
    assignee_id: 'user-003',
    created_by: 'user-003',
    due_date: null,
    resolved_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    time_spent_minutes: 60,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    client: { id: 'client-005', name: 'Gymshark', health_status: 'green' },
    assignee: { id: 'user-003', first_name: 'Trevor', last_name: 'Mills', avatar_url: null },
  },
  {
    id: 'ticket-006',
    agency_id: 'demo-agency',
    client_id: 'client-006',
    title: 'Conversion value discrepancy',
    description: 'Client reporting 12% difference between Meta reported conversions and Shopify orders.',
    category: 'campaign' as TicketCategory,
    priority: 'medium' as TicketPriority,
    status: 'new' as TicketStatus,
    assignee_id: 'user-001',
    created_by: 'user-004',
    due_date: null,
    resolved_at: null,
    time_spent_minutes: 0,
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    client: { id: 'client-006', name: 'Alo Yoga', health_status: 'green' },
    assignee: { id: 'user-001', first_name: 'Brent', last_name: 'Walker', avatar_url: null },
  },
]

// GET /api/v1/tickets - List all tickets for the agency
export const GET = withPermission({ resource: 'tickets', action: 'read' })(
  async (request: AuthenticatedRequest) => {
    // Rate limit: 100 requests per minute
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    // Mock mode - return demo data without auth
    if (isMockMode()) {
      return NextResponse.json({ data: MOCK_TICKETS })
    }

    try {
      const supabase = await createRouteHandlerClient(cookies)

    // Get query params for filtering
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const clientId = searchParams.get('client_id')
    const assigneeId = searchParams.get('assignee_id')
    const category = searchParams.get('category')
    const search = searchParams.get('search')

    // Build query - RLS will filter by agency_id
    let query = supabase
      .from('ticket')
      .select(`
        *,
        client:client_id (
          id,
          name,
          health_status
        ),
        assignee:assignee_id (
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false })

    // Apply filters with validation
    if (status && VALID_STATUSES.includes(status as TicketStatus)) {
      query = query.eq('status', status as TicketStatus)
    }
    if (priority && VALID_PRIORITIES.includes(priority as TicketPriority)) {
      query = query.eq('priority', priority as TicketPriority)
    }
    if (clientId && isValidUUID(clientId)) {
      query = query.eq('client_id', clientId)
    }
    if (assigneeId && isValidUUID(assigneeId)) {
      query = query.eq('assignee_id', assigneeId)
    }
    if (category && VALID_CATEGORIES.includes(category as TicketCategory)) {
      query = query.eq('category', category as TicketCategory)
    }
    if (search) {
      const sanitizedSearch = sanitizeSearchPattern(search)
      if (sanitizedSearch) {
        query = query.or(`title.ilike.%${sanitizedSearch}%,description.ilike.%${sanitizedSearch}%`)
      }
    }

    const { data: tickets, error } = await query

    if (error) {
      return createErrorResponse(500, 'Failed to fetch tickets')
    }

      return NextResponse.json({ data: tickets })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// POST /api/v1/tickets - Create a new ticket
export const POST = withPermission({ resource: 'tickets', action: 'write' })(
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
      const userId = request.user.id

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return createErrorResponse(400, 'Invalid JSON body')
    }

    const { client_id, title, description, category, priority, assignee_id, due_date } = body

    // Validate required fields
    if (!client_id || !isValidUUID(client_id)) {
      return createErrorResponse(400, 'Valid client_id is required')
    }
    if (!title || typeof title !== 'string') {
      return createErrorResponse(400, 'Title is required')
    }
    if (!category || !VALID_CATEGORIES.includes(category as TicketCategory)) {
      return createErrorResponse(400, 'Valid category is required')
    }
    if (!priority || !VALID_PRIORITIES.includes(priority as TicketPriority)) {
      return createErrorResponse(400, 'Valid priority is required')
    }

    // Sanitize inputs
    const sanitizedTitle = sanitizeString(title).slice(0, 500)
    const sanitizedDescription = description ? sanitizeString(description as string).slice(0, 10000) : ''

    if (!sanitizedTitle) {
      return createErrorResponse(400, 'Title is required')
    }

    // Validate optional fields with explicit type narrowing
    const validatedAssigneeId: string | null = typeof assignee_id === 'string' && isValidUUID(assignee_id)
      ? assignee_id
      : null
    const validatedDueDate: string | null = typeof due_date === 'string' && !isNaN(Date.parse(due_date))
      ? due_date
      : null

    // Use agencyId from getAuthenticatedUser (SEC-006 - already fetched from DB)
    // Create ticket
    const { data: ticket, error } = await supabase
      .from('ticket')
      .insert({
        agency_id: agencyId,
        client_id: client_id as string,
        title: sanitizedTitle,
        description: sanitizedDescription,
        category: category as TicketCategory,
        priority: priority as TicketPriority,
        assignee_id: validatedAssigneeId,
        due_date: validatedDueDate,
        created_by: userId,
      })
      .select(`
        *,
        client:client_id (
          id,
          name,
          health_status
        ),
        assignee:assignee_id (
          id,
          first_name,
          last_name,
          avatar_url
        )
      `)
      .single()

    if (error) {
      return createErrorResponse(500, 'Failed to create ticket')
    }

      return NextResponse.json({ data: ticket }, { status: 201 })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
