// app/api/v1/cartridges/[id]/set-default/route.ts
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'
import { withRateLimit, createErrorResponse } from '@/lib/security'

// POST /api/v1/cartridges/[id]/set-default - Set a cartridge as default for its type
export const POST = withPermission({ resource: 'cartridges', action: 'write' })(
  async (request: AuthenticatedRequest, { params }: { params: { id: string } }) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const supabase = await createRouteHandlerClient(cookies)
      const { id } = params
      const { type } = await request.json()

      if (!type) {
        return NextResponse.json(
          { error: 'type is required' },
          { status: 400 }
        )
      }

      // Get cartridge to find agency
      const { data: cartridge, error: getError } = await supabase
        .from('cartridges')
        .select('agency_id, type')
        .eq('id', id)
        .single()

      if (getError || !cartridge) {
        return NextResponse.json(
          { error: 'Cartridge not found' },
          { status: 404 }
        )
      }

      // Reset all defaults for this type in this agency
      await supabase
        .from('cartridges')
        .update({ is_default: false })
        .eq('agency_id', cartridge.agency_id)
        .eq('type', type)

      // Set this one as default
      const { error: updateError } = await supabase
        .from('cartridges')
        .update({ is_default: true })
        .eq('id', id)

      if (updateError) {
        console.error('[Set Default Cartridge] UPDATE error:', updateError)
        return NextResponse.json(
          { error: updateError.message },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Default cartridge set',
      })
    } catch (error) {
      console.error('[Set Default Cartridge] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
