/**
 * Individual User Management API
 * PATCH /api/v1/settings/users/[id] - Update user profile, role, or status
 * DELETE /api/v1/settings/users/[id] - Remove user (soft-delete: deactivate + anonymize PII)
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient, createServiceRoleClient } from '@/lib/supabase'
import { withRateLimit, withCsrfProtection, createErrorResponse } from '@/lib/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'

interface RouteParams {
  params: Promise<{ id: string }>
}

// ============================================================================
// PATCH /api/v1/settings/users/[id]
// ============================================================================

export const PATCH = withPermission({ resource: 'users', action: 'manage' })(
  async (request: AuthenticatedRequest, { params }: RouteParams) => {
    // Rate limit: 30 updates per minute
    const rateLimitResponse = withRateLimit(request, { maxRequests: 30, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    // CSRF protection (TD-005)
    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id: userId } = await params

      // Validate userId is a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(userId)) {
        return createErrorResponse(400, 'Invalid user ID format')
      }

      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId

      // Verify target user exists and belongs to same agency
      const { data: targetUser, error: targetError } = await supabase
        .from('user')
        .select('id, role, is_active')
        .eq('id', userId)
        .eq('agency_id', agencyId)
        .single()

      if (targetError || !targetUser) {
        return createErrorResponse(404, 'User not found')
      }

      // Parse request body
      let body: Record<string, unknown>
      try {
        body = await request.json()
      } catch {
        return createErrorResponse(400, 'Invalid JSON body')
      }

      const { role, is_active, first_name, last_name, nickname } = body as {
        role?: unknown
        is_active?: unknown
        first_name?: unknown
        last_name?: unknown
        nickname?: unknown
      }
      const updates: Record<string, unknown> = {}

      // Handle name changes
      if (first_name !== undefined) {
        if (typeof first_name !== 'string' || first_name.trim().length === 0 || first_name.length > 100) {
          return createErrorResponse(400, 'First name must be a non-empty string (max 100 chars)')
        }
        updates.first_name = first_name.trim()
      }

      if (last_name !== undefined) {
        if (typeof last_name !== 'string' || last_name.trim().length === 0 || last_name.length > 100) {
          return createErrorResponse(400, 'Last name must be a non-empty string (max 100 chars)')
        }
        updates.last_name = last_name.trim()
      }

      // Handle nickname change
      if (nickname !== undefined) {
        if (nickname !== null && (typeof nickname !== 'string' || nickname.length > 50)) {
          return createErrorResponse(400, 'Nickname must be a string (max 50 chars) or null')
        }
        updates.nickname = nickname === null ? null : (nickname as string).trim() || null
      }

      // Handle role change — uses role table (RBAC) as source of truth
      if (role !== undefined) {
        if (typeof role !== 'string' || !['owner', 'admin', 'manager', 'member'].includes(role)) {
          return createErrorResponse(400, 'Role must be "owner", "admin", "manager", or "member"')
        }

        // Look up the target role in the role table (names are Capitalized)
        const roleName = role.charAt(0).toUpperCase() + role.slice(1)
        const { data: roleRecord, error: roleError } = await supabase
          .from('role')
          .select('id, hierarchy_level')
          .eq('agency_id', agencyId)
          .eq('name', roleName)
          .single()

        if (roleError || !roleRecord) {
          console.error('[PATCH /settings/users] Role lookup failed:', roleName, roleError?.message)
          return createErrorResponse(400, `Role "${role}" not found in this workspace`)
        }

        // Prevent removing the last admin (check role table hierarchy_level <= 2)
        if (targetUser.role === 'admin' && role !== 'admin' && role !== 'owner') {
          const { count } = await supabase
            .from('user')
            .select('id', { count: 'exact' })
            .eq('agency_id', agencyId)
            .eq('role', 'admin')

          if (count === 1) {
            return createErrorResponse(400, 'Cannot remove the last admin from the agency')
          }
        }

        // Update role_id (RBAC FK) and map legacy enum column
        updates.role_id = roleRecord.id
        updates.role = (role === 'admin' || role === 'owner') ? 'admin' : 'user'
      }

      // Handle activation status change
      if (is_active !== undefined) {
        if (typeof is_active !== 'boolean') {
          return createErrorResponse(400, 'is_active must be a boolean')
        }
        updates.is_active = is_active
      }

      if (Object.keys(updates).length === 0) {
        return createErrorResponse(400, 'No fields to update')
      }

      // Use service role client for mutation — RLS blocks cross-user updates
      const serviceClient = createServiceRoleClient()
      if (!serviceClient) {
        return createErrorResponse(500, 'Service configuration error')
      }

      const { data: updated, error } = await serviceClient
        .from('user')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .eq('agency_id', agencyId)
        .select()
        .single()

      if (error) {
        console.error('[PATCH /settings/users] Update failed:', error.message)
        return createErrorResponse(500, 'Failed to update user')
      }

      return NextResponse.json({ data: updated })
    } catch (err) {
      console.error('[PATCH /settings/users] Unhandled error:', err)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// ============================================================================
// DELETE /api/v1/settings/users/[id]
// ============================================================================

export const DELETE = withPermission({ resource: 'users', action: 'manage' })(
  async (request: AuthenticatedRequest, { params }: RouteParams) => {
    // Rate limit: 10 removals per minute
    const rateLimitResponse = withRateLimit(request, { maxRequests: 10, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    // CSRF protection (TD-005)
    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id: userId } = await params

      // Validate userId is a UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(userId)) {
        return createErrorResponse(400, 'Invalid user ID format')
      }

      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId
      const user = request.user

      // Cannot delete yourself
      if (userId === user.id) {
        return createErrorResponse(400, 'Cannot delete your own user account')
      }

      // Verify target user exists and belongs to same agency
      const { data: targetUser, error: targetError } = await supabase
        .from('user')
        .select('id, role')
        .eq('id', userId)
        .eq('agency_id', agencyId)
        .single()

      if (targetError || !targetUser) {
        return createErrorResponse(404, 'User not found')
      }

      // Cannot delete owners
      if (targetUser.role === 'owner') {
        return createErrorResponse(403, 'Cannot delete workspace owners')
      }

      // Check if this is the last admin
      if (targetUser.role === 'admin') {
        const { count } = await supabase
          .from('user')
          .select('id', { count: 'exact' })
          .eq('agency_id', agencyId)
          .eq('role', 'admin')

        if (count === 1) {
          return createErrorResponse(400, 'Cannot delete the last admin from the agency')
        }
      }

      // Use service role client for mutations — RLS blocks cross-user operations
      const serviceClient = createServiceRoleClient()
      if (!serviceClient) {
        return createErrorResponse(500, 'Service configuration error')
      }

      // Check for client assignments
      const { data: assignments, error: assignError } = await supabase
        .from('client_assignment')
        .select('id, client_id')
        .eq('user_id', userId)

      if (!assignError && assignments && assignments.length > 0) {
        // Parse body for reassignment instructions
        let bodyData: Record<string, unknown> = {}
        try {
          bodyData = await request.json()
        } catch {
          // If no body, that's ok - we'll ask for reassignment
        }

        const { reassign_to } = bodyData as { reassign_to?: unknown }

        if (!reassign_to || typeof reassign_to !== 'string') {
          return NextResponse.json(
            {
              error: 'reassignment_required',
              message: 'User has active client assignments and must be reassigned',
              assignments: assignments.map((a) => ({
                id: a.id,
                client_id: a.client_id,
              })),
            },
            { status: 400 }
          )
        }

        // Validate reassignment target exists and is active
        const { data: reassignTarget } = await supabase
          .from('user')
          .select('id')
          .eq('id', reassign_to)
          .eq('agency_id', agencyId)
          .eq('is_active', true)
          .single()

        if (!reassignTarget) {
          return createErrorResponse(400, 'Invalid reassignment target user')
        }

        // Reassign all clients (service role to bypass RLS)
        const { error: reassignError } = await serviceClient
          .from('client_assignment')
          .update({ user_id: reassign_to })
          .eq('user_id', userId)

        if (reassignError) {
          console.error('[DELETE /settings/users] Reassign failed:', reassignError.message)
          return createErrorResponse(500, 'Failed to reassign clients')
        }
      }

      // Nullify ticket assignments so removed user's tickets go back to unassigned
      await serviceClient
        .from('ticket')
        .update({ assignee_id: null })
        .eq('assignee_id', userId)

      // Soft-delete: deactivate + anonymize PII instead of hard delete
      // Hard delete is impossible without a migration — 13+ FK constraints
      // reference user(id) without ON DELETE CASCADE, many are NOT NULL
      const { error } = await serviceClient
        .from('user')
        .update({
          is_active: false,
          first_name: 'Removed',
          last_name: 'User',
          nickname: null,
          avatar_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .eq('agency_id', agencyId)

      if (error) {
        console.error('[DELETE /settings/users] Deactivate failed:', error.message)
        return createErrorResponse(500, 'Failed to remove user')
      }

      return NextResponse.json({ message: 'User removed successfully' })
    } catch (err) {
      console.error('[DELETE /settings/users] Unhandled error:', err)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
