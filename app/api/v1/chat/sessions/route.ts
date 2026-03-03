import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'
import { withRateLimit } from '@/lib/security'

/**
 * GET /api/v1/chat/sessions
 *
 * List chat sessions for the current user (user-scoped).
 * Returns sessions ordered by most recent activity.
 */
export const GET = withPermission({ resource: 'ai-features', action: 'read' })(
  async (request: AuthenticatedRequest) => {
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    try {
      const supabase = await createRouteHandlerClient(cookies)
      const { agencyId, id: userId } = request.user

      const { searchParams } = new URL(request.url)
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
      const offset = parseInt(searchParams.get('offset') || '0')

      // Fetch sessions for this user, ordered by most recent activity
      const { data: sessions, error, count } = await supabase
        .from('chat_session')
        .select('*', { count: 'exact' })
        .eq('agency_id', agencyId)
        .eq('user_id', userId)
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('[ChatSessions] Failed to fetch sessions:', error)
        return NextResponse.json(
          { error: 'Failed to fetch chat sessions', code: 'FETCH_FAILED' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        data: sessions || [],
        total: count || 0,
        limit,
        offset,
      })
    } catch (error) {
      console.error('[ChatSessions] Unexpected error:', error)
      return NextResponse.json(
        { error: 'Internal server error', code: 'INTERNAL_ERROR' },
        { status: 500 }
      )
    }
  }
)
