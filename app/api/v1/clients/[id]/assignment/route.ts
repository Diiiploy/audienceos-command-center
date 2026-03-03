import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withRateLimit, withCsrfProtection, isValidUUID, createErrorResponse } from '@/lib/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT /api/v1/clients/[id]/assignment - Upsert client owner assignment
export const PUT = withPermission({ resource: 'clients', action: 'write' })(
  async (request: AuthenticatedRequest, { params }: RouteParams) => {
    const rateLimitResponse = withRateLimit(request, { maxRequests: 50, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id } = await params

      if (!isValidUUID(id)) {
        return createErrorResponse(400, 'Invalid client ID format')
      }

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      let body: Record<string, unknown>
      try {
        body = await request.json()
      } catch {
        return createErrorResponse(400, 'Invalid JSON body')
      }

      const { user_id } = body

      if (!user_id || typeof user_id !== 'string' || !isValidUUID(user_id as string)) {
        return createErrorResponse(400, 'Valid user_id is required')
      }

      // Verify client exists and belongs to this agency
      const { data: client, error: clientError } = await supabase
        .from('client')
        .select('id')
        .eq('id', id)
        .eq('agency_id', agencyId)
        .single()

      if (clientError || !client) {
        return createErrorResponse(404, 'Client not found')
      }

      // Remove existing owner assignment for this client
      await (supabase as any)
        .from('client_assignment')
        .delete()
        .eq('client_id', id)
        .eq('agency_id', agencyId)
        .eq('role', 'owner')

      // Insert new owner assignment
      const { data: assignment, error: insertError } = await (supabase as any)
        .from('client_assignment')
        .insert({
          agency_id: agencyId,
          client_id: id,
          user_id: user_id as string,
          role: 'owner',
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error creating client assignment:', insertError)
        return createErrorResponse(500, 'Failed to assign client')
      }

      return NextResponse.json({
        data: assignment,
        message: 'Client owner assigned successfully',
      })
    } catch (error) {
      console.error('Client assignment PUT error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
