import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withRateLimit, withCsrfProtection, createErrorResponse } from '@/lib/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'
import { sendOnboardingEmail } from '@/lib/email/onboarding'

// POST /api/v1/onboarding/instances/[id]/resend-email - Resend onboarding welcome email
export const POST = withPermission({ resource: 'clients', action: 'write' })(
  async (request: AuthenticatedRequest, context: { params: Promise<{ id: string }> }) => {
    const rateLimitResponse = withRateLimit(request, { maxRequests: 5, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id: instanceId } = await context.params
      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(instanceId)) {
        return createErrorResponse(400, 'Invalid instance ID format')
      }

      // Fetch instance with client and agency data
      const { data: instance, error: instanceError } = await supabase
        .from('onboarding_instance')
        .select(`
          id,
          link_token,
          client:client_id (
            name,
            contact_email
          ),
          agency:agency_id (
            name
          )
        `)
        .eq('id', instanceId)
        .eq('agency_id', agencyId)
        .single()

      if (instanceError || !instance) {
        return createErrorResponse(404, 'Onboarding instance not found')
      }

      // Extract joined data
      const client = instance.client as unknown as { name: string; contact_email: string } | null
      const agency = instance.agency as unknown as { name: string } | null

      if (!client?.contact_email) {
        return createErrorResponse(400, 'Client has no contact email')
      }

      if (!instance.link_token) {
        return createErrorResponse(400, 'Instance has no link token')
      }

      // Construct portal URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://v0-audience-os-command-center.vercel.app'
      const portalUrl = `${baseUrl}/onboarding/start?token=${instance.link_token}`

      const clientName = client.name || 'Client'
      const agencyName = agency?.name || 'Your Marketing Agency'

      // Send the email
      const emailResult = await sendOnboardingEmail({
        to: client.contact_email,
        clientName,
        agencyName,
        portalUrl,
      })

      if (!emailResult.success) {
        return createErrorResponse(500, emailResult.error || 'Failed to send email')
      }

      return NextResponse.json({
        success: true,
        messageId: emailResult.messageId,
      })
    } catch {
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
