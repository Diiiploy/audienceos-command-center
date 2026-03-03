import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'
import { withRateLimit, withCsrfProtection } from '@/lib/security'

const VALID_CATEGORIES = ['communication', 'analysis', 'automation', 'other']

/**
 * GET /api/v1/prompts
 * List all custom prompts for the agency
 */
export const GET = withPermission({ resource: 'ai-features', action: 'read' })(
  async (request: AuthenticatedRequest) => {
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    try {
      const supabase = await createRouteHandlerClient(cookies)
      const { agencyId } = request.user

      const { data, error } = await supabase
        .from('custom_prompt')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('[Prompts] Failed to fetch:', error)
        return NextResponse.json(
          { error: 'Failed to fetch prompts', code: 'FETCH_FAILED' },
          { status: 500 }
        )
      }

      return NextResponse.json({ data: data || [] })
    } catch (error) {
      console.error('[Prompts] Unexpected error:', error)
      return NextResponse.json(
        { error: 'Internal server error', code: 'INTERNAL_ERROR' },
        { status: 500 }
      )
    }
  }
)

/**
 * POST /api/v1/prompts
 * Create a new custom prompt
 */
export const POST = withPermission({ resource: 'ai-features', action: 'write' })(
  async (request: AuthenticatedRequest) => {
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const supabase = await createRouteHandlerClient(cookies)
      const { agencyId, id: userId } = request.user

      const body = await request.json()
      const { name, description, prompt_template, category } = body

      if (!name?.trim() || !prompt_template?.trim()) {
        return NextResponse.json(
          { error: 'Name and prompt template are required', code: 'VALIDATION_ERROR' },
          { status: 400 }
        )
      }

      const validCategory = VALID_CATEGORIES.includes(category) ? category : 'other'

      const { data, error } = await supabase
        .from('custom_prompt')
        .insert({
          agency_id: agencyId,
          created_by: userId,
          name: name.trim(),
          description: description?.trim() || null,
          prompt_template: prompt_template.trim(),
          category: validCategory,
        })
        .select()
        .single()

      if (error) {
        console.error('[Prompts] Failed to create:', error)
        return NextResponse.json(
          { error: 'Failed to create prompt', code: 'CREATE_FAILED' },
          { status: 500 }
        )
      }

      return NextResponse.json({ data }, { status: 201 })
    } catch (error) {
      console.error('[Prompts] Unexpected error:', error)
      return NextResponse.json(
        { error: 'Internal server error', code: 'INTERNAL_ERROR' },
        { status: 500 }
      )
    }
  }
)
