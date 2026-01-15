import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'
import { withRateLimit, withCsrfProtection, createErrorResponse } from '@/lib/security'

/**
 * GET /api/v1/cartridges/instructions
 * Fetch instruction cartridges for the authenticated user's agency
 */
export const GET = withPermission({ resource: 'cartridges', action: 'read' })(
  async (request: AuthenticatedRequest) => {
    try {
      const rateLimitResponse = withRateLimit(request, { maxRequests: 100, windowMs: 60000 })
      if (rateLimitResponse) return rateLimitResponse

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId

      const { data, error } = await (supabase
        .from('instruction_cartridge' as any)
        .select('*')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false }) as any)

      if (error) {
        console.error('[Instruction Cartridge GET] Query error:', error)
        return createErrorResponse(500, 'Failed to fetch instruction cartridges')
      }

      return NextResponse.json(data || [])
    } catch (error) {
      console.error('[Instruction Cartridge GET] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

/**
 * POST /api/v1/cartridges/instructions
 * Create instruction cartridge with training documents and extracted knowledge
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
        return createErrorResponse(400, 'Instruction name is required')
      }

      // Prepare cartridge data
      const cartridgeData = {
        agency_id: agencyId,
        name: body.name.trim(),
        description: body.description || null,
        training_docs: body.trainingDocs || [],
        extracted_knowledge: body.extractedKnowledge || null,
        mem0_namespace: body.mem0Namespace || `instructions-${agencyId}`,
        process_status: body.processStatus || 'pending',
      }

      // Try to update existing instruction
      const { data: existing, error: existingError } = await (supabase
        .from('instruction_cartridge' as any)
        .select('id')
        .eq('agency_id', agencyId)
        .eq('name', cartridgeData.name)
        .single() as any)

      // Handle actual database errors (not just "no rows found")
      if (existingError && existingError.code !== 'PGRST116') {
        console.error('[Instruction Cartridge POST] Lookup error:', existingError)
        return createErrorResponse(500, 'Failed to check existing instruction cartridge')
      }

      let result
      let statusCode = 201

      if (existing) {
        // Update existing
        const { data, error } = await (supabase
          .from('instruction_cartridge' as any)
          .update({
            ...cartridgeData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single() as any)

        if (error) {
          console.error('[Instruction Cartridge POST Update] Error:', error)
          return createErrorResponse(500, 'Failed to update instruction cartridge')
        }

        result = data
        statusCode = 200
      } else {
        // Create new
        const { data, error } = await (supabase
          .from('instruction_cartridge' as any)
          .insert([cartridgeData])
          .select()
          .single() as any)

        if (error) {
          console.error('[Instruction Cartridge POST Insert] Error:', error)
          return createErrorResponse(500, 'Failed to create instruction cartridge')
        }

        result = data
      }

      return NextResponse.json(result, { status: statusCode })
    } catch (error) {
      if (error instanceof SyntaxError) {
        return createErrorResponse(400, 'Invalid JSON in request body')
      }

      console.error('[Instruction Cartridge POST] Unexpected error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
