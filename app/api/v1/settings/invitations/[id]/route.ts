import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withRateLimit, createErrorResponse, isValidUUID } from '@/lib/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'

/**
 * DELETE /api/v1/settings/invitations/:id
 * Revoke a pending invitation (hard delete)
 */
export const DELETE = withPermission({ resource: 'users', action: 'manage' })(
  async (request: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    try {
      const { id } = await params

      if (!isValidUUID(id)) {
        return createErrorResponse(400, 'Invalid invitation ID')
      }

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      // Verify invitation exists and belongs to this agency
      const { data: invitation, error: fetchError } = await (supabase
        .from('user_invitations' as any)
        .select('id, accepted_at')
        .eq('id', id)
        .eq('agency_id', agencyId)
        .single() as any)

      if (fetchError || !invitation) {
        return createErrorResponse(404, 'Invitation not found')
      }

      if (invitation.accepted_at) {
        return createErrorResponse(400, 'Cannot revoke an accepted invitation')
      }

      // Hard delete (council consensus: no soft-delete)
      const { error: deleteError } = await (supabase
        .from('user_invitations' as any)
        .delete()
        .eq('id', id)
        .eq('agency_id', agencyId) as any)

      if (deleteError) {
        console.error('Failed to delete invitation:', deleteError)
        return createErrorResponse(500, 'Failed to revoke invitation')
      }

      return NextResponse.json({ message: 'Invitation revoked successfully' })
    } catch (error) {
      console.error('Revoke invitation error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
