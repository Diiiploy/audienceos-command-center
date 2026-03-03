import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'
import { withRateLimit, withCsrfProtection } from '@/lib/security'

const VALID_CATEGORIES = ['communication', 'analysis', 'automation', 'other']

/**
 * PUT /api/v1/prompts/[id]
 * Update a custom prompt
 */
export const PUT = withPermission({ resource: 'ai-features', action: 'write' })(
  async (
    request: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id } = await params
      const supabase = await createRouteHandlerClient(cookies)
      const { agencyId } = request.user

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
        .update({
          name: name.trim(),
          description: description?.trim() || null,
          prompt_template: prompt_template.trim(),
          category: validCategory,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('agency_id', agencyId)
        .select()
        .single()

      if (error) {
        console.error('[Prompts] Failed to update:', error)
        return NextResponse.json(
          { error: 'Failed to update prompt', code: 'UPDATE_FAILED' },
          { status: 500 }
        )
      }

      if (!data) {
        return NextResponse.json(
          { error: 'Prompt not found', code: 'NOT_FOUND' },
          { status: 404 }
        )
      }

      return NextResponse.json({ data })
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
 * DELETE /api/v1/prompts/[id]
 * Soft-delete a custom prompt (set is_active = false)
 */
export const DELETE = withPermission({ resource: 'ai-features', action: 'delete' })(
  async (
    request: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id } = await params
      const supabase = await createRouteHandlerClient(cookies)
      const { agencyId } = request.user

      const { error } = await supabase
        .from('custom_prompt')
        .update({ is_active: false })
        .eq('id', id)
        .eq('agency_id', agencyId)

      if (error) {
        console.error('[Prompts] Failed to delete:', error)
        return NextResponse.json(
          { error: 'Failed to delete prompt', code: 'DELETE_FAILED' },
          { status: 500 }
        )
      }

      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('[Prompts] Unexpected error:', error)
      return NextResponse.json(
        { error: 'Internal server error', code: 'INTERNAL_ERROR' },
        { status: 500 }
      )
    }
  }
)
