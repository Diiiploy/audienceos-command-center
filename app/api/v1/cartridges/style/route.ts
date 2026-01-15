import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'
import { withRateLimit, withCsrfProtection, createErrorResponse } from '@/lib/security'

/**
 * GET /api/v1/cartridges/style
 * Fetch style cartridge for the authenticated user's agency
 */
export const GET = withPermission({ resource: 'cartridges', action: 'read' })(
  async (request: AuthenticatedRequest) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 100, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      const { data, error } = await (supabase
        .from('style_cartridge' as any)
        .select('*')
        .eq('agency_id', agencyId)
        .single() as any)

      if (error && error.code !== 'PGRST116') {
        console.error('[Style Cartridge GET] Query error:', error)
        return createErrorResponse(500, 'Failed to fetch style cartridge')
      }

      return NextResponse.json(data || null)
    } catch (error) {
      console.error('[Style Cartridge GET] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

/**
 * POST /api/v1/cartridges/style
 * Create or update style cartridge with analyzed writing patterns
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

      // Prepare cartridge data
      const cartridgeData = {
        agency_id: agencyId,
        source_files: body.sourceFiles || [],
        learned_style: body.learnedStyle || null,
        mem0_namespace: body.mem0Namespace || `style-${agencyId}`,
        analysis_status: body.analysisStatus || 'pending',
      }

      // Try to update existing cartridge first
      const { data: existing, error: existingError } = await (supabase
        .from('style_cartridge' as any)
        .select('id')
        .eq('agency_id', agencyId)
        .single() as any)

      // Handle actual database errors (not just "no rows found")
      if (existingError && existingError.code !== 'PGRST116') {
        console.error('[Style Cartridge POST] Lookup error:', existingError)
        return createErrorResponse(500, 'Failed to check existing cartridge')
      }

      let result
      let statusCode = 201

      if (existing) {
        // Update existing
        const { data, error } = await (supabase
          .from('style_cartridge' as any)
          .update({
            ...cartridgeData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single() as any)

        if (error) {
          console.error('[Style Cartridge POST Update] Error:', error)
          return createErrorResponse(500, 'Failed to update style cartridge')
        }

        result = data
        statusCode = 200
      } else {
        // Create new
        const { data, error } = await (supabase
          .from('style_cartridge' as any)
          .insert([cartridgeData])
          .select()
          .single() as any)

        if (error) {
          console.error('[Style Cartridge POST Insert] Error:', error)
          return createErrorResponse(500, 'Failed to create style cartridge')
        }

        result = data
      }

      return NextResponse.json(result, { status: statusCode })
    } catch (error) {
      if (error instanceof SyntaxError) {
        return createErrorResponse(400, 'Invalid JSON in request body')
      }

      console.error('[Style Cartridge POST] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
