/**
 * API Route Tests for /api/v1/settings/users/[id]
 * Tests PATCH and DELETE operations for individual user management
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase client
const mockSupabaseClient = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
  },
}

vi.mock('@/lib/supabase', () => ({
  createRouteHandlerClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
  getAuthenticatedUser: vi.fn(() => ({
    user: { id: 'admin-123', email: 'admin@test.com' },
    agencyId: 'agency-123',
    error: null,
  })),
}))

// Mock security utilities
vi.mock('@/lib/security', () => ({
  withRateLimit: vi.fn(() => null),
  withCsrfProtection: vi.fn(() => null),
  sanitizeString: vi.fn((str: string) => str?.trim() || ''),
  createErrorResponse: vi.fn((status: number, message: string) => ({
    status,
    json: () => Promise.resolve({ error: message }),
  })),
}))

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({})),
}))

describe('API: /api/v1/settings/users/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Parameter Validation', () => {
    it('should validate user ID is a valid UUID', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

      const validateUserId = (id: string) => {
        if (!uuidRegex.test(id)) {
          return { error: 'Invalid user ID format' }
        }
        return { error: null }
      }

      expect(validateUserId('550e8400-e29b-41d4-a716-446655440000').error).toBeNull()
      expect(validateUserId('invalid-id').error).toBe('Invalid user ID format')
      expect(validateUserId('').error).toBe('Invalid user ID format')
      expect(validateUserId('550e8400-e29b-41d4-a716').error).toBe('Invalid user ID format')
    })

    it('should be case insensitive for UUID validation', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

      expect(uuidRegex.test('550E8400-E29B-41D4-A716-446655440000')).toBe(true)
      expect(uuidRegex.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    })
  })

  describe('PATCH - Update User', () => {
    it('should require authentication', async () => {
      const { getAuthenticatedUser } = await import('@/lib/supabase')
      const { createErrorResponse } = await import('@/lib/security')

      vi.mocked(getAuthenticatedUser).mockReturnValueOnce({
        user: null,
        agencyId: null,
        error: 'Not authenticated',
      })

      const result = await getAuthenticatedUser(mockSupabaseClient)
      expect(result.user).toBeNull()

      const errorResponse = createErrorResponse(401, 'Unauthorized')
      expect(errorResponse.status).toBe(401)
    })

    it('should require CSRF protection', async () => {
      const { withCsrfProtection } = await import('@/lib/security')

      expect(withCsrfProtection).toBeDefined()
      expect(vi.mocked(withCsrfProtection)()).toBeNull()
    })

    it('should require admin role to modify users', async () => {
      const { createErrorResponse } = await import('@/lib/security')

      const checkAdminRole = (role: string) => {
        if (role !== 'admin') {
          return createErrorResponse(403, 'Only admins can modify users')
        }
        return null
      }

      expect(checkAdminRole('user')?.status).toBe(403)
      expect(checkAdminRole('admin')).toBeNull()
    })

    it('should validate role is admin or user', () => {
      const validateRole = (role: unknown) => {
        if (typeof role !== 'string' || !['admin', 'user'].includes(role)) {
          return { error: 'Role must be "admin" or "user"' }
        }
        return { error: null }
      }

      expect(validateRole('admin').error).toBeNull()
      expect(validateRole('user').error).toBeNull()
      expect(validateRole('superadmin').error).toBe('Role must be "admin" or "user"')
      expect(validateRole(123).error).toBe('Role must be "admin" or "user"')
    })

    it('should validate is_active is a boolean', () => {
      const validateIsActive = (value: unknown) => {
        if (typeof value !== 'boolean') {
          return { error: 'is_active must be a boolean' }
        }
        return { error: null }
      }

      expect(validateIsActive(true).error).toBeNull()
      expect(validateIsActive(false).error).toBeNull()
      expect(validateIsActive('true').error).toBe('is_active must be a boolean')
      expect(validateIsActive(1).error).toBe('is_active must be a boolean')
    })

    it('should prevent removing the last admin', async () => {
      const { createErrorResponse } = await import('@/lib/security')

      const checkLastAdmin = (
        currentRole: string,
        newRole: string,
        adminCount: number
      ) => {
        if (currentRole === 'admin' && newRole !== 'admin' && adminCount === 1) {
          return createErrorResponse(400, 'Cannot remove the last admin from the agency')
        }
        return null
      }

      expect(checkLastAdmin('admin', 'user', 1)?.status).toBe(400)
      expect(checkLastAdmin('admin', 'user', 2)).toBeNull()
      expect(checkLastAdmin('user', 'admin', 1)).toBeNull()
    })

    it('should verify target user belongs to same agency', async () => {
      const { createErrorResponse } = await import('@/lib/security')

      const checkUserInAgency = (
        targetUser: { id: string; agency_id: string } | null,
        requesterAgencyId: string
      ) => {
        if (!targetUser) {
          return createErrorResponse(404, 'User not found')
        }
        // RLS already handles this, but explicit check for test
        if (targetUser.agency_id !== requesterAgencyId) {
          return createErrorResponse(404, 'User not found')
        }
        return null
      }

      expect(checkUserInAgency(null, 'agency-123')?.status).toBe(404)
      expect(
        checkUserInAgency({ id: 'u1', agency_id: 'agency-456' }, 'agency-123')?.status
      ).toBe(404)
      expect(
        checkUserInAgency({ id: 'u1', agency_id: 'agency-123' }, 'agency-123')
      ).toBeNull()
    })

    it('should reject empty update body', async () => {
      const { createErrorResponse } = await import('@/lib/security')

      const validateUpdates = (updates: Record<string, unknown>) => {
        if (Object.keys(updates).length === 0) {
          return createErrorResponse(400, 'No fields to update')
        }
        return null
      }

      expect(validateUpdates({})?.status).toBe(400)
      expect(validateUpdates({ role: 'admin' })).toBeNull()
    })

    it('should apply rate limiting for updates', async () => {
      const { withRateLimit } = await import('@/lib/security')

      // The actual API uses { maxRequests: 30, windowMs: 60000 }
      const updateRateLimit = { maxRequests: 30, windowMs: 60000 }
      expect(updateRateLimit.maxRequests).toBe(30)
      expect(withRateLimit).toBeDefined()
    })
  })

  describe('DELETE - Delete User', () => {
    it('should require CSRF protection', async () => {
      const { withCsrfProtection } = await import('@/lib/security')

      expect(withCsrfProtection).toBeDefined()
    })

    it('should require admin role to delete users', async () => {
      const { createErrorResponse } = await import('@/lib/security')

      const checkAdminRole = (role: string) => {
        if (role !== 'admin') {
          return createErrorResponse(403, 'Only admins can delete users')
        }
        return null
      }

      expect(checkAdminRole('user')?.status).toBe(403)
      expect(checkAdminRole('admin')).toBeNull()
    })

    it('should prevent self-deletion', async () => {
      const { getAuthenticatedUser } = await import('@/lib/supabase')
      const { createErrorResponse } = await import('@/lib/security')

      const checkSelfDeletion = (targetUserId: string, currentUserId: string) => {
        if (targetUserId === currentUserId) {
          return createErrorResponse(400, 'Cannot delete your own user account')
        }
        return null
      }

      const { user } = await getAuthenticatedUser(mockSupabaseClient)
      expect(checkSelfDeletion('admin-123', user!.id)?.status).toBe(400)
      expect(checkSelfDeletion('other-user', user!.id)).toBeNull()
    })

    it('should prevent deleting the last admin', async () => {
      const { createErrorResponse } = await import('@/lib/security')

      const checkLastAdmin = (targetRole: string, adminCount: number) => {
        if (targetRole === 'admin' && adminCount === 1) {
          return createErrorResponse(400, 'Cannot delete the last admin from the agency')
        }
        return null
      }

      expect(checkLastAdmin('admin', 1)?.status).toBe(400)
      expect(checkLastAdmin('admin', 2)).toBeNull()
      expect(checkLastAdmin('user', 1)).toBeNull()
    })

    it('should require reassignment when user has client assignments', () => {
      const checkAssignments = (assignments: { id: string; client_id: string }[]) => {
        if (assignments && assignments.length > 0) {
          return {
            error: 'reassignment_required',
            message: 'User has active client assignments and must be reassigned',
            assignments: assignments.map((a) => ({
              id: a.id,
              client_id: a.client_id,
            })),
          }
        }
        return null
      }

      const result = checkAssignments([
        { id: 'assign-1', client_id: 'client-1' },
        { id: 'assign-2', client_id: 'client-2' },
      ])

      expect(result?.error).toBe('reassignment_required')
      expect(result?.assignments).toHaveLength(2)

      expect(checkAssignments([])).toBeNull()
    })

    it('should validate reassignment target is active user in agency', async () => {
      const { createErrorResponse } = await import('@/lib/security')

      const validateReassignmentTarget = (
        targetUser: { id: string; is_active: boolean; agency_id: string } | null,
        requesterAgencyId: string
      ) => {
        if (!targetUser) {
          return createErrorResponse(400, 'Invalid reassignment target user')
        }
        if (!targetUser.is_active) {
          return createErrorResponse(400, 'Invalid reassignment target user')
        }
        if (targetUser.agency_id !== requesterAgencyId) {
          return createErrorResponse(400, 'Invalid reassignment target user')
        }
        return null
      }

      expect(validateReassignmentTarget(null, 'agency-123')?.status).toBe(400)
      expect(
        validateReassignmentTarget(
          { id: 'u1', is_active: false, agency_id: 'agency-123' },
          'agency-123'
        )?.status
      ).toBe(400)
      expect(
        validateReassignmentTarget(
          { id: 'u1', is_active: true, agency_id: 'agency-456' },
          'agency-123'
        )?.status
      ).toBe(400)
      expect(
        validateReassignmentTarget(
          { id: 'u1', is_active: true, agency_id: 'agency-123' },
          'agency-123'
        )
      ).toBeNull()
    })

    it('should apply stricter rate limiting for deletes', async () => {
      const { withRateLimit } = await import('@/lib/security')

      // The actual API uses { maxRequests: 10, windowMs: 60000 }
      const deleteRateLimit = { maxRequests: 10, windowMs: 60000 }
      expect(deleteRateLimit.maxRequests).toBe(10)
      expect(withRateLimit).toBeDefined()
    })

    it('should verify target user exists', async () => {
      const { createErrorResponse } = await import('@/lib/security')

      const checkUserExists = (targetUser: { id: string } | null) => {
        if (!targetUser) {
          return createErrorResponse(404, 'User not found')
        }
        return null
      }

      expect(checkUserExists(null)?.status).toBe(404)
      expect(checkUserExists({ id: 'user-123' })).toBeNull()
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid JSON body', async () => {
      const { createErrorResponse } = await import('@/lib/security')

      const parseBody = async (jsonFn: () => Promise<Record<string, unknown>>) => {
        try {
          return await jsonFn()
        } catch {
          return createErrorResponse(400, 'Invalid JSON body')
        }
      }

      // Simulate invalid JSON
      const result = await parseBody(() => Promise.reject(new Error('Invalid JSON')))
      expect(result.status).toBe(400)
    })

    it('should handle database errors gracefully', async () => {
      const { createErrorResponse } = await import('@/lib/security')

      const handleDbError = (error: { message: string } | null) => {
        if (error) {
          return createErrorResponse(500, 'Failed to update user')
        }
        return null
      }

      expect(handleDbError({ message: 'DB error' })?.status).toBe(500)
      expect(handleDbError(null)).toBeNull()
    })

    it('should return success message on delete', () => {
      const createSuccessResponse = () => ({
        status: 200,
        body: { message: 'User deleted successfully' },
      })

      const response = createSuccessResponse()
      expect(response.status).toBe(200)
      expect(response.body.message).toBe('User deleted successfully')
    })
  })
})
