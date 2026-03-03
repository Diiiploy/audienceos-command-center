import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'
import { withRateLimit } from '@/lib/security'

interface ActivityItem {
  id: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  timestamp: string
  clientName?: string
  clientId?: string
  assignee?: string
  targetTab: 'tasks' | 'clients' | 'alerts' | 'performance'
}

/**
 * GET /api/v1/activity
 *
 * Aggregates recent events from multiple tables into a unified activity feed.
 * Sources: alerts, stage_event, chat_session, communication (needs_reply)
 */
export const GET = withPermission({ resource: 'analytics', action: 'read' })(
  async (request: AuthenticatedRequest) => {
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    try {
      const supabase = await createRouteHandlerClient(cookies)
      const { agencyId } = request.user

      const { searchParams } = new URL(request.url)
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

      // Query all sources in parallel for performance
      const [alertsResult, stageEventsResult, chatSessionsResult, commsResult] = await Promise.all([
        // 1. Active alerts
        supabase
          .from('alert')
          .select('id, severity, title, description, created_at, client_id, client:client_id(company_name)')
          .eq('agency_id', agencyId)
          .in('status', ['active', 'snoozed'])
          .order('created_at', { ascending: false })
          .limit(limit),

        // 2. Recent stage changes (with client name)
        supabase
          .from('stage_event')
          .select('id, from_stage, to_stage, moved_at, client_id, client:client_id(company_name)')
          .eq('agency_id', agencyId)
          .order('moved_at', { ascending: false })
          .limit(limit),

        // 3. Recent chat sessions
        supabase
          .from('chat_session')
          .select('id, title, created_at, last_message_at')
          .eq('agency_id', agencyId)
          .order('last_message_at', { ascending: false, nullsFirst: false })
          .limit(5),

        // 4. Communications needing reply
        supabase
          .from('communication')
          .select('id, subject, content, sender_name, platform, received_at, client_id, client:client_id(company_name)')
          .eq('agency_id', agencyId)
          .eq('needs_reply', true)
          .order('received_at', { ascending: false })
          .limit(limit),
      ])

      const items: ActivityItem[] = []

      // Normalize alerts
      if (alertsResult.data) {
        for (const alert of alertsResult.data) {
          const client = alert.client as any
          items.push({
            id: `alert-${alert.id}`,
            severity: alert.severity === 'high' ? 'critical' : alert.severity === 'medium' ? 'warning' : 'info',
            title: alert.title,
            description: alert.description,
            timestamp: alert.created_at,
            clientName: client?.company_name,
            clientId: alert.client_id || undefined,
            targetTab: 'alerts',
          })
        }
      }

      // Normalize stage events
      if (stageEventsResult.data) {
        for (const event of stageEventsResult.data) {
          const client = event.client as any
          const isRisky = event.to_stage === 'Needs Support' || event.to_stage === 'Off-boarding'
          items.push({
            id: `stage-${event.id}`,
            severity: isRisky ? 'warning' : 'info',
            title: 'Stage Move',
            description: `${client?.company_name || 'Client'} moved${event.from_stage ? ` from ${event.from_stage}` : ''} to ${event.to_stage}`,
            timestamp: event.moved_at,
            clientName: client?.company_name,
            clientId: event.client_id || undefined,
            targetTab: 'clients',
          })
        }
      }

      // Normalize chat sessions as info events
      if (chatSessionsResult.data) {
        for (const session of chatSessionsResult.data) {
          items.push({
            id: `chat-${session.id}`,
            severity: 'info',
            title: 'AI Conversation',
            description: session.title || 'New chat session',
            timestamp: session.last_message_at || session.created_at,
            targetTab: 'tasks',
          })
        }
      }

      // Normalize communications needing reply
      if (commsResult.data) {
        for (const comm of commsResult.data) {
          const client = comm.client as any
          items.push({
            id: `comm-${comm.id}`,
            severity: 'warning',
            title: `Reply Needed (${comm.platform})`,
            description: comm.subject || `Message from ${comm.sender_name || 'unknown'}`,
            timestamp: comm.received_at,
            clientName: client?.company_name,
            clientId: comm.client_id || undefined,
            targetTab: 'tasks',
          })
        }
      }

      // Sort all items by timestamp descending, take the top N
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      const trimmed = items.slice(0, limit)

      return NextResponse.json({ data: trimmed })
    } catch (error) {
      console.error('[Activity] Unexpected error:', error)
      return NextResponse.json(
        { error: 'Internal server error', code: 'INTERNAL_ERROR' },
        { status: 500 }
      )
    }
  }
)
