import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withRateLimit, createErrorResponse, isValidUUID } from '@/lib/security'
import { sendInvitationEmail } from '@/lib/email/invitation'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'
import type { UserRole } from '@/types/database'

/**
 * POST /api/v1/settings/invitations/:id/resend
 * Resend invitation with a new token and refreshed expiry
 * True resend: same record, new token (council consensus)
 */
export const POST = withPermission({ resource: 'users', action: 'manage' })(
  async (request: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 3600000 })
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
        .select('id, email, role, accepted_at, agency_id')
        .eq('id', id)
        .eq('agency_id', agencyId)
        .single() as any)

      if (fetchError || !invitation) {
        return createErrorResponse(404, 'Invitation not found')
      }

      if (invitation.accepted_at) {
        return createErrorResponse(400, 'Cannot resend an accepted invitation')
      }

      // Generate new secure token (64-char hex)
      const token = crypto.getRandomValues(new Uint8Array(32))
      const tokenHex = Array.from(token)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      // Reset expiry to 72 hours from now
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 72)

      // Update existing record with new token and expiry
      const { error: updateError } = await (supabase
        .from('user_invitations' as any)
        .update({
          token: tokenHex,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('agency_id', agencyId) as any)

      if (updateError) {
        console.error('Failed to update invitation:', updateError)
        return createErrorResponse(500, 'Failed to resend invitation')
      }

      // Send new invitation email
      let emailSent = false
      try {
        const { data: agencyData } = await supabase
          .from('agency')
          .select('name')
          .eq('id', agencyId)
          .single()

        const emailResult = await sendInvitationEmail({
          to: invitation.email,
          inviterName: request.user.email || 'An administrator',
          agencyName: agencyData?.name || 'the agency',
          acceptUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invite/${tokenHex}`,
          role: invitation.role as UserRole,
        })
        emailSent = emailResult.success
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError)
      }

      return NextResponse.json({
        message: emailSent
          ? 'Invitation resent successfully'
          : 'Invitation updated but email delivery failed',
        email_status: emailSent ? 'sent' : 'failed',
      })
    } catch (error) {
      console.error('Resend invitation error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
