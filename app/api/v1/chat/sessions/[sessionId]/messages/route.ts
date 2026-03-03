import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'
import { withRateLimit } from '@/lib/security'

/**
 * GET /api/v1/chat/sessions/[sessionId]/messages
 *
 * Get messages for a specific chat session.
 * Supports filtering by role (user/assistant) for tab filtering.
 */
export const GET = withPermission({ resource: 'ai-features', action: 'read' })(
  async (
    request: AuthenticatedRequest,
    { params }: { params: Promise<{ sessionId: string }> }
  ) => {
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    try {
      const { sessionId } = await params
      const supabase = await createRouteHandlerClient(cookies)
      const { agencyId, id: userId } = request.user

      // Verify session belongs to this user
      const { data: session, error: sessionError } = await supabase
        .from('chat_session')
        .select('id, user_id')
        .eq('id', sessionId)
        .eq('agency_id', agencyId)
        .eq('user_id', userId)
        .single()

      if (sessionError || !session) {
        return NextResponse.json(
          { error: 'Session not found', code: 'NOT_FOUND' },
          { status: 404 }
        )
      }

      const { searchParams } = new URL(request.url)
      const role = searchParams.get('role') // 'user' | 'assistant' | null (all)
      const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 200)

      // Build message query
      let query = supabase
        .from('chat_message')
        .select('*')
        .eq('session_id', sessionId)
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: true })
        .limit(limit)

      // Apply role filter for tab filtering
      if (role && (role === 'user' || role === 'assistant')) {
        query = query.eq('role', role)
      }

      const { data: messages, error } = await query

      if (error) {
        console.error('[ChatMessages] Failed to fetch messages:', error)
        return NextResponse.json(
          { error: 'Failed to fetch messages', code: 'FETCH_FAILED' },
          { status: 500 }
        )
      }

      return NextResponse.json({ data: messages || [] })
    } catch (error) {
      console.error('[ChatMessages] Unexpected error:', error)
      return NextResponse.json(
        { error: 'Internal server error', code: 'INTERNAL_ERROR' },
        { status: 500 }
      )
    }
  }
)
