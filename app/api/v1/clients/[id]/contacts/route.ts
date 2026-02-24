/**
 * Client Email Contacts API
 * GET    /api/v1/clients/[id]/contacts — List email contacts for this client
 * POST   /api/v1/clients/[id]/contacts — Add an email contact
 * DELETE  /api/v1/clients/[id]/contacts?contactId=uuid — Remove an email contact
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withRateLimit, withCsrfProtection, createErrorResponse } from '@/lib/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// GET /api/v1/clients/[id]/contacts
export const GET = withPermission({ resource: 'clients', action: 'read' })(
  async (request: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    try {
      const { id: clientId } = await params
      const supabase = await createRouteHandlerClient(cookies)

      const { data, error } = await (supabase as any)
        .from('client_contact')
        .select('id, email, name, role, is_primary, source, created_at')
        .eq('client_id', clientId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true })

      if (error) {
        console.error('[client-contacts] GET error:', error)
        return createErrorResponse(500, 'Failed to fetch contacts')
      }

      return NextResponse.json({ data: data || [] })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// POST /api/v1/clients/[id]/contacts
export const POST = withPermission({ resource: 'clients', action: 'write' })(
  async (request: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id: clientId } = await params
      const agencyId = request.user.agencyId
      const supabase = await createRouteHandlerClient(cookies)

      const body = await request.json()
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
      const name = typeof body.name === 'string' ? body.name.trim() : null
      const role = typeof body.role === 'string' ? body.role : 'primary'

      if (!email || !EMAIL_RE.test(email)) {
        return createErrorResponse(400, 'Valid email address is required')
      }

      const validRoles = ['primary', 'billing', 'technical', 'assistant', 'other']
      if (!validRoles.includes(role)) {
        return createErrorResponse(400, `Invalid role. Must be one of: ${validRoles.join(', ')}`)
      }

      const { data, error } = await (supabase as any)
        .from('client_contact')
        .insert({
          agency_id: agencyId,
          client_id: clientId,
          email,
          name: name || null,
          role,
          is_primary: false,
          source: 'manual',
        })
        .select('id, email, name, role, is_primary, source, created_at')
        .single()

      if (error) {
        if (error.code === '23505') {
          return NextResponse.json(
            { error: 'This email is already linked to this client' },
            { status: 409 }
          )
        }
        console.error('[client-contacts] POST error:', error)
        return createErrorResponse(500, 'Failed to add contact')
      }

      return NextResponse.json({ data }, { status: 201 })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// DELETE /api/v1/clients/[id]/contacts?contactId=uuid
export const DELETE = withPermission({ resource: 'clients', action: 'write' })(
  async (request: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id: clientId } = await params
      const agencyId = request.user.agencyId
      const supabase = await createRouteHandlerClient(cookies)

      const { searchParams } = new URL(request.url)
      const contactId = searchParams.get('contactId')

      if (!contactId || !UUID_RE.test(contactId)) {
        return createErrorResponse(400, 'Valid contactId query parameter is required')
      }

      const { data, error } = await (supabase as any)
        .from('client_contact')
        .delete()
        .eq('id', contactId)
        .eq('client_id', clientId)
        .eq('agency_id', agencyId)
        .select('id')

      if (error) {
        console.error('[client-contacts] DELETE error:', error)
        return createErrorResponse(500, 'Failed to remove contact')
      }

      if (!data || data.length === 0) {
        return createErrorResponse(404, 'Contact not found')
      }

      return NextResponse.json({ data: null, message: 'Contact removed' })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
