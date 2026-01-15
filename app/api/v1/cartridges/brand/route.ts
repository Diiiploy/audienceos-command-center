import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'
import { withRateLimit, withCsrfProtection, createErrorResponse } from '@/lib/security'

/**
 * GET /api/v1/cartridges/brand
 * Fetch brand cartridge for the authenticated user's agency
 */
export const GET = withPermission({ resource: 'cartridges', action: 'read' })(
  async (request: AuthenticatedRequest) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 100, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      const { data, error } = await (supabase
        .from('brand_cartridge' as any)
        .select('*')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single() as any)

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found, which is acceptable for new users
        console.error('[Brand Cartridge GET] Query error:', error)
        return createErrorResponse(500, 'Failed to fetch brand cartridge')
      }

      // Return null if no cartridge exists yet (not an error)
      return NextResponse.json(data || null)
    } catch (error) {
      console.error('[Brand Cartridge GET] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

/**
 * POST /api/v1/cartridges/brand
 * Create or update brand cartridge with company information
 *
 * Body:
 * {
 *   name: string (required)
 *   companyName?: string
 *   companyDescription?: string
 *   companyTagline?: string
 *   industry?: string
 *   targetAudience?: string
 *   coreValues?: string[]
 *   brandVoice?: string
 *   brandPersonality?: string[]
 *   logoUrl?: string
 *   brandColors?: { primary, secondary, accent, background, text }
 *   socialLinks?: { linkedin, twitter, facebook, instagram, website }
 *   coreMessaging?: string
 *   bensonBlueprint?: object
 * }
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
        return NextResponse.json(
          { error: 'Brand name is required and must be a non-empty string' },
          { status: 400 }
        )
      }

      // Prepare cartridge data
      const cartridgeData = {
        agency_id: agencyId,
        name: body.name.trim(),
        company_name: body.companyName || null,
        company_description: body.companyDescription || null,
        company_tagline: body.companyTagline || null,
        industry: body.industry || null,
        target_audience: body.targetAudience || null,
        core_values: body.coreValues || [],
        brand_voice: body.brandVoice || null,
        brand_personality: body.brandPersonality || [],
        logo_url: body.logoUrl || null,
        brand_colors: body.brandColors || {},
        social_links: body.socialLinks || {},
        core_messaging: body.coreMessaging || null,
        benson_blueprint: body.bensonBlueprint || null,
      }

      // Try to update existing cartridge first
      const { data: existing, error: existingError } = await (supabase
        .from('brand_cartridge' as any)
        .select('id')
        .eq('agency_id', agencyId)
        .single() as any)

      // Handle actual database errors (not just "no rows found")
      if (existingError && existingError.code !== 'PGRST116') {
        console.error('[Brand Cartridge POST] Lookup error:', existingError)
        return createErrorResponse(500, 'Failed to check existing cartridge')
      }

      let result
      let statusCode = 201

      if (existing) {
        // Update existing
        const { data, error } = await (supabase
          .from('brand_cartridge' as any)
          .update({
            ...cartridgeData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single() as any)

        if (error) {
          console.error('[Brand Cartridge POST Update] Error:', error)
          return createErrorResponse(500, 'Failed to update brand cartridge')
        }

        result = data
        statusCode = 200
      } else {
        // Create new
        const { data, error } = await (supabase
          .from('brand_cartridge' as any)
          .insert([cartridgeData])
          .select()
          .single() as any)

        if (error) {
          console.error('[Brand Cartridge POST Insert] Error:', error)
          return createErrorResponse(500, 'Failed to create brand cartridge')
        }

        result = data
      }

      return NextResponse.json(result, { status: statusCode })
    } catch (error) {
      if (error instanceof SyntaxError) {
        return createErrorResponse(400, 'Invalid JSON in request body')
      }

      console.error('[Brand Cartridge POST] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
