import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'
import { withRateLimit, withCsrfProtection, createErrorResponse } from '@/lib/security'

/**
 * GET /api/v1/cartridges/voice
 * Fetch voice cartridge for the authenticated user's agency
 */
export const GET = withPermission({ resource: 'cartridges', action: 'read' })(
  async (request: AuthenticatedRequest) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 100, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      const { data, error } = await (supabase
        .from('voice_cartridge' as any)
        .select('*')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single() as any)

      if (error && error.code !== 'PGRST116') {
        console.error('[Voice Cartridge GET] Query error:', error)
        return createErrorResponse(500, 'Failed to fetch voice cartridge')
      }

      return NextResponse.json(data || null)
    } catch (error) {
      console.error('[Voice Cartridge GET] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

/**
 * POST /api/v1/cartridges/voice
 * Create or update voice cartridge with tone, style, and personality parameters
 */
export const POST = withPermission({ resource: 'cartridges', action: 'write' })(
  async (request: AuthenticatedRequest) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const csrfError = withCsrfProtection(request)
      if (csrfError) return csrfError

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      const body = await request.json()

      // Validation
      if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
        return createErrorResponse(400, 'Voice name is required')
      }

      // Prepare cartridge data
      const cartridgeData = {
        agency_id: agencyId,
        name: body.name.trim(),
        display_name: body.displayName || body.name.trim(),
        system_instructions: body.systemInstructions || null,
        tier: body.tier || 'default',
        is_active: body.isActive !== false,
        voice_params: body.voiceParams || null,
      }

      // Try to update existing cartridge first
      const { data: existing, error: existingError } = await (supabase
        .from('voice_cartridge' as any)
        .select('id')
        .eq('agency_id', agencyId)
        .eq('name', cartridgeData.name)
        .single() as any)

      // Handle actual database errors (not just "no rows found")
      if (existingError && existingError.code !== 'PGRST116') {
        console.error('[Voice Cartridge POST] Lookup error:', existingError)
        return createErrorResponse(500, 'Failed to check existing cartridge')
      }

      let result
      let statusCode = 201

      if (existing) {
        // Update existing
        const { data, error } = await (supabase
          .from('voice_cartridge' as any)
          .update({
            ...cartridgeData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single() as any)

        if (error) {
          console.error('[Voice Cartridge POST Update] Error:', error)
          return createErrorResponse(500, 'Failed to update voice cartridge')
        }

        result = data
        statusCode = 200
      } else {
        // Create new
        const { data, error } = await (supabase
          .from('voice_cartridge' as any)
          .insert([cartridgeData])
          .select()
          .single() as any)

        if (error) {
          console.error('[Voice Cartridge POST Insert] Error:', error)
          return createErrorResponse(500, 'Failed to create voice cartridge')
        }

        result = data
      }

      return NextResponse.json(result, { status: statusCode })
    } catch (error) {
      if (error instanceof SyntaxError) {
        return createErrorResponse(400, 'Invalid JSON in request body')
      }

      console.error('[Voice Cartridge POST] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
