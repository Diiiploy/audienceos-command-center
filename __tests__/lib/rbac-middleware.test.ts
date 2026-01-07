/**
 * Edge Case Tests for RBAC Middleware
 * Tests error handling, auth failures, and permission denials
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { withPermission, withAnyPermission, withOwnerOnly } from '@/lib/rbac/with-permission';

// Mock dependencies
vi.mock('@/lib/supabase', () => ({
  createRouteHandlerClient: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}));

vi.mock('@/lib/rbac/permission-service', () => ({
  permissionService: {
    getUserPermissions: vi.fn(),
    checkPermission: vi.fn(),
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/supabase';
import { permissionService } from '@/lib/rbac/permission-service';

describe('RBAC Middleware Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('withPermission', () => {
    it('should handle auth failure gracefully', async () => {
      // Mock auth failure
      vi.mocked(createRouteHandlerClient).mockResolvedValue({} as any);
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        user: null,
        agencyId: null,
        error: new Error('Not authenticated'),
      } as any);

      const handler = vi.fn();
      const middleware = withPermission({ resource: 'clients', action: 'read' })(handler);

      const req = new NextRequest('http://localhost/api/v1/clients');
      const response = await middleware(req);

      expect(response.status).toBe(401);
      expect(handler).not.toHaveBeenCalled();

      const json = await response.json();
      expect(json.code).toBe('AUTH_REQUIRED');
    });

    it('should handle missing app user gracefully', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: null,
                error: new Error('User not found'),
              })),
            })),
          })),
        })),
      };

      vi.mocked(createRouteHandlerClient).mockResolvedValue(mockSupabase as any);
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        agencyId: 'agency-123',
        error: null,
      } as any);

      const handler = vi.fn();
      const middleware = withPermission({ resource: 'clients', action: 'read' })(handler);

      const req = new NextRequest('http://localhost/api/v1/clients');
      const response = await middleware(req);

      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.code).toBe('USER_FETCH_FAILED');
    });

    it('should handle permission denial gracefully', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: {
                  id: 'user-123',
                  email: 'test@example.com',
                  role_id: 'role-member',
                  is_owner: false,
                },
                error: null,
              })),
            })),
          })),
        })),
      };

      vi.mocked(createRouteHandlerClient).mockResolvedValue(mockSupabase as any);
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        agencyId: 'agency-123',
        error: null,
      } as any);

      vi.mocked(permissionService.getUserPermissions).mockResolvedValue([]);
      vi.mocked(permissionService.checkPermission).mockReturnValue(false);

      const handler = vi.fn();
      const middleware = withPermission({ resource: 'settings', action: 'write' })(handler);

      const req = new NextRequest('http://localhost/api/v1/settings');
      const response = await middleware(req);

      expect(response.status).toBe(403);
      expect(handler).not.toHaveBeenCalled();

      const json = await response.json();
      expect(json.code).toBe('PERMISSION_DENIED');
      expect(json.message).toContain('agency settings');
    });

    it('should extract clientId from URL path', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: {
                  id: 'user-123',
                  email: 'test@example.com',
                  role_id: 'role-member',
                  is_owner: false,
                },
                error: null,
              })),
            })),
          })),
        })),
      };

      vi.mocked(createRouteHandlerClient).mockResolvedValue(mockSupabase as any);
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        agencyId: 'agency-123',
        error: null,
      } as any);

      vi.mocked(permissionService.getUserPermissions).mockResolvedValue([]);

      // Check that clientId is passed to permission check
      let capturedClientId: string | undefined;
      vi.mocked(permissionService.checkPermission).mockImplementation((perms, resource, action, clientId) => {
        capturedClientId = clientId;
        return true;
      });

      const handler = vi.fn().mockResolvedValue(new Response('OK'));
      const middleware = withPermission({ resource: 'clients', action: 'read' })(handler);

      const req = new NextRequest('http://localhost/api/v1/clients/client-456');
      await middleware(req);

      expect(capturedClientId).toBe('client-456');
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('withAnyPermission', () => {
    it('should deny when user has none of the required permissions', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: {
                  id: 'user-123',
                  email: 'test@example.com',
                  role_id: 'role-member',
                  is_owner: false,
                },
                error: null,
              })),
            })),
          })),
        })),
      };

      vi.mocked(createRouteHandlerClient).mockResolvedValue(mockSupabase as any);
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        agencyId: 'agency-123',
        error: null,
      } as any);

      vi.mocked(permissionService.getUserPermissions).mockResolvedValue([]);
      vi.mocked(permissionService.checkPermission).mockReturnValue(false);

      const handler = vi.fn();
      const middleware = withAnyPermission([
        { resource: 'clients', action: 'read' },
        { resource: 'clients', action: 'manage' },
      ])(handler);

      const req = new NextRequest('http://localhost/api/v1/clients');
      const response = await middleware(req);

      expect(response.status).toBe(403);
      expect(handler).not.toHaveBeenCalled();
    });

    it('should allow when user has at least one permission', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: {
                  id: 'user-123',
                  email: 'test@example.com',
                  role_id: 'role-member',
                  is_owner: false,
                },
                error: null,
              })),
            })),
          })),
        })),
      };

      vi.mocked(createRouteHandlerClient).mockResolvedValue(mockSupabase as any);
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        agencyId: 'agency-123',
        error: null,
      } as any);

      vi.mocked(permissionService.getUserPermissions).mockResolvedValue([]);

      // First check fails, second succeeds
      let checkCount = 0;
      vi.mocked(permissionService.checkPermission).mockImplementation(() => {
        checkCount++;
        return checkCount === 2;
      });

      const handler = vi.fn().mockResolvedValue(new Response('OK'));
      const middleware = withAnyPermission([
        { resource: 'clients', action: 'manage' },
        { resource: 'clients', action: 'read' },
      ])(handler);

      const req = new NextRequest('http://localhost/api/v1/clients');
      await middleware(req);

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('withOwnerOnly', () => {
    it('should deny non-owner access', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: {
                  id: 'user-123',
                  email: 'test@example.com',
                  role_id: 'role-admin',
                  is_owner: false, // Not owner
                },
                error: null,
              })),
            })),
          })),
        })),
      };

      vi.mocked(createRouteHandlerClient).mockResolvedValue(mockSupabase as any);
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
        agencyId: 'agency-123',
        error: null,
      } as any);

      const handler = vi.fn();
      const middleware = withOwnerOnly()(handler);

      const req = new NextRequest('http://localhost/api/v1/admin/dangerous-action');
      const response = await middleware(req);

      expect(response.status).toBe(403);
      expect(handler).not.toHaveBeenCalled();

      const json = await response.json();
      expect(json.code).toBe('OWNER_ONLY');
    });

    it('should allow owner access', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => ({
                data: {
                  id: 'user-123',
                  email: 'owner@example.com',
                  role_id: 'role-owner',
                  is_owner: true, // Is owner
                },
                error: null,
              })),
            })),
          })),
        })),
      };

      vi.mocked(createRouteHandlerClient).mockResolvedValue(mockSupabase as any);
      vi.mocked(getAuthenticatedUser).mockResolvedValue({
        user: { id: 'user-123', email: 'owner@example.com' },
        agencyId: 'agency-123',
        error: null,
      } as any);

      const handler = vi.fn().mockResolvedValue(new Response('OK'));
      const middleware = withOwnerOnly()(handler);

      const req = new NextRequest('http://localhost/api/v1/admin/dangerous-action');
      await middleware(req);

      expect(handler).toHaveBeenCalled();
    });
  });
});
