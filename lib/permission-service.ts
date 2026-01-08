/**
 * Permission Service - Core RBAC Permission Checking
 * Handles permission validation, caching, and hierarchy enforcement
 *
 * Phase: Multi-Org Roles Implementation - Phase 1
 * Last Updated: 2026-01-08
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  Permission,
  PermissionAction,
  PermissionCheckResult,
  Resource,
  Role,
  RoleHierarchyLevel,
  UserRole,
} from '@/types/rbac';

// ============================================================================
// Cache Configuration
// ============================================================================

const PERMISSION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const PERMISSION_CACHE_MAX_SIZE = 1000;
const ROLE_HIERARCHY_CACHE_TTL = 60 * 60 * 1000; // 1 hour

// ============================================================================
// In-Memory Cache (simplified Map-based)
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class PermissionCache {
  private permissionCache = new Map<string, CacheEntry<Permission[]>>();
  private roleCache = new Map<string, CacheEntry<Role[]>>();
  private clientAccessCache = new Map<string, CacheEntry<string[]>>();

  /**
   * Get or set permission cache
   */
  getPermissions(key: string): Permission[] | null {
    const entry = this.permissionCache.get(key);
    if (entry && Date.now() - entry.timestamp < entry.ttl) {
      return entry.data;
    }
    this.permissionCache.delete(key);
    return null;
  }

  setPermissions(key: string, permissions: Permission[]): void {
    if (this.permissionCache.size >= PERMISSION_CACHE_MAX_SIZE) {
      // Simple eviction: remove first entry
      const firstKey = this.permissionCache.keys().next().value;
      if (firstKey) {
        this.permissionCache.delete(firstKey);
      }
    }
    this.permissionCache.set(key, {
      data: permissions,
      timestamp: Date.now(),
      ttl: PERMISSION_CACHE_TTL,
    });
  }

  /**
   * Invalidate cache entries for a user (after role change)
   */
  invalidateUser(userId: string): void {
    for (const key of Array.from(this.permissionCache.keys())) {
      if (key.includes(userId)) {
        this.permissionCache.delete(key);
      }
    }
    for (const key of Array.from(this.clientAccessCache.keys())) {
      if (key.includes(userId)) {
        this.clientAccessCache.delete(key);
      }
    }
  }

  /**
   * Get or set role hierarchy cache
   */
  getRoles(key: string): Role[] | null {
    const entry = this.roleCache.get(key);
    if (entry && Date.now() - entry.timestamp < entry.ttl) {
      return entry.data;
    }
    this.roleCache.delete(key);
    return null;
  }

  setRoles(key: string, roles: Role[]): void {
    this.roleCache.set(key, {
      data: roles,
      timestamp: Date.now(),
      ttl: ROLE_HIERARCHY_CACHE_TTL,
    });
  }

  /**
   * Get or set client access cache
   */
  getClientAccess(key: string): string[] | null {
    const entry = this.clientAccessCache.get(key);
    if (entry && Date.now() - entry.timestamp < entry.ttl) {
      return entry.data;
    }
    this.clientAccessCache.delete(key);
    return null;
  }

  setClientAccess(key: string, clientIds: string[]): void {
    this.clientAccessCache.set(key, {
      data: clientIds,
      timestamp: Date.now(),
      ttl: PERMISSION_CACHE_TTL,
    });
  }
}

const cache = new PermissionCache();

// ============================================================================
// Permission Service
// ============================================================================

export class PermissionService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Check if user has permission for a resource+action
   */
  async hasPermission(
    userId: string,
    agencyId: string,
    resource: Resource,
    action: PermissionAction,
    clientId?: string
  ): Promise<PermissionCheckResult> {
    try {
      // Get user's role
      const userRole = await this.getUserRole(userId, agencyId);
      if (!userRole) {
        return {
          user_id: userId,
          resource,
          action,
          client_id: clientId,
          has_permission: false,
          reason: 'User has no role in this agency',
        };
      }

      // Check role hierarchy - quick exit for high-privilege users
      if (userRole.role.hierarchy_level <= 3) {
        // Owner, Admin, Manager always have access (no client scoping except Members)
        return {
          user_id: userId,
          resource,
          action,
          client_id: clientId,
          has_permission: true,
        };
      }

      // For Members (hierarchy_level = 4), check client assignment
      if (userRole.role.hierarchy_level === 4 && clientId) {
        const hasAccess = await this.hasMemberClientAccess(userId, clientId);
        if (!hasAccess) {
          return {
            user_id: userId,
            resource,
            action,
            client_id: clientId,
            has_permission: false,
            reason: 'Member does not have access to this client',
          };
        }
      }

      // Check specific permission in permission matrix
      const permissions = await this.getPermissions(userId, agencyId);
      const hasPermission = permissions.some(
        (p) => p.resource === resource && p.action === action
      );

      if (!hasPermission) {
        return {
          user_id: userId,
          resource,
          action,
          client_id: clientId,
          has_permission: false,
          reason: `${userRole.role.display_name} role does not have ${action} permission for ${resource}`,
        };
      }

      return {
        user_id: userId,
        resource,
        action,
        client_id: clientId,
        has_permission: true,
      };
    } catch (error) {
      console.error('Permission check failed:', error);
      return {
        user_id: userId,
        resource,
        action,
        client_id: clientId,
        has_permission: false,
        reason: 'Permission check error',
      };
    }
  }

  /**
   * Get user's role in an agency
   */
  async getUserRole(userId: string, agencyId: string): Promise<(UserRole & { role: Role }) | null> {
    const cacheKey = `user_role:${userId}:${agencyId}`;
    const cached = cache.getPermissions(cacheKey) as any;
    if (cached) {
      return cached;
    }

    const { data, error } = await this.supabase
      .from('user_role')
      .select('*, role(*)')
      .eq('user_id', userId)
      .eq('agency_id', agencyId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    return data as UserRole & { role: Role };
  }

  /**
   * Get user's permissions for an agency (cached)
   */
  async getPermissions(userId: string, agencyId: string): Promise<Permission[]> {
    const cacheKey = `permissions:${userId}:${agencyId}`;
    const cached = cache.getPermissions(cacheKey);
    if (cached) {
      return cached;
    }

    // Get user's role
    const userRole = await this.getUserRole(userId, agencyId);
    if (!userRole) {
      return [];
    }

    // Get permissions for this role
    const { data, error } = await this.supabase
      .from('permission')
      .select('*')
      .eq('role_id', userRole.role_id);

    if (error || !data) {
      return [];
    }

    cache.setPermissions(cacheKey, data);
    return data;
  }

  /**
   * Check if user (Member role) has access to a specific client
   */
  async hasMemberClientAccess(userId: string, clientId: string): Promise<boolean> {
    const cacheKey = `member_access:${userId}:${clientId}`;
    const cached = cache.getClientAccess(cacheKey);
    if (cached) {
      return cached.includes(clientId);
    }

    const { data, error } = await this.supabase
      .from('member_client_access')
      .select('id')
      .eq('user_id', userId)
      .eq('client_id', clientId)
      .eq('is_active', true)
      .single();

    const hasAccess = !error && !!data;
    cache.setClientAccess(`${userId}:${clientId}`, [clientId]);
    return hasAccess;
  }

  /**
   * Get all clients accessible to a Member user
   */
  async getMemberAccessibleClients(userId: string): Promise<string[]> {
    const cacheKey = `member_clients:${userId}`;
    const cached = cache.getClientAccess(cacheKey);
    if (cached) {
      return cached;
    }

    const { data, error } = await this.supabase
      .from('member_client_access')
      .select('client_id')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error || !data) {
      return [];
    }

    const clientIds = data.map((row) => row.client_id);
    cache.setClientAccess(cacheKey, clientIds);
    return clientIds;
  }

  /**
   * Get user's hierarchy level (for quick role checks)
   */
  async getUserHierarchyLevel(userId: string, agencyId: string): Promise<RoleHierarchyLevel | null> {
    const userRole = await this.getUserRole(userId, agencyId);
    return userRole?.role.hierarchy_level ?? null;
  }

  /**
   * Check if user has management privileges (Owner, Admin, or Manager)
   */
  async hasManagementPrivileges(userId: string, agencyId: string): Promise<boolean> {
    const level = await this.getUserHierarchyLevel(userId, agencyId);
    return level !== null && level <= 3; // 1, 2, or 3
  }

  /**
   * Log an access attempt for audit trail
   */
  async logAccessAttempt(
    userId: string,
    agencyId: string,
    resource: Resource,
    action: PermissionAction,
    result: 'allowed' | 'denied',
    clientId?: string,
    reason?: string
  ): Promise<void> {
    try {
      await this.supabase.from('audit_log').insert({
        user_id: userId,
        agency_id: agencyId,
        action_type: 'permission_check',
        resource,
        permission_action: action,
        result,
        reason,
        resource_id: clientId,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to log audit entry:', error);
    }
  }

  /**
   * Invalidate cache for a user (call after role/permission changes)
   */
  invalidateUserCache(userId: string): void {
    cache.invalidateUser(userId);
  }

  /**
   * Get permission matrix for all roles (for admin UI)
   */
  async getPermissionMatrix(): Promise<Record<string, Record<Resource, PermissionAction[]>>> {
    const cacheKey = 'permission_matrix';
    const cached = cache.getRoles(cacheKey);
    if (cached) {
      return this.buildMatrix(cached);
    }

    const { data: roles, error: rolesError } = await this.supabase
      .from('role')
      .select('*')
      .eq('is_system_role', true);

    if (rolesError || !roles) {
      return {};
    }

    cache.setRoles(cacheKey, roles);

    const { data: permissions, error: permError } = await this.supabase.from('permission').select('*');

    if (permError || !permissions) {
      return {};
    }

    return this.buildMatrix(roles, permissions);
  }

  /**
   * Build permission matrix from roles and permissions
   */
  private buildMatrix(
    roles: Role[],
    permissions?: Permission[]
  ): Record<string, Record<Resource, PermissionAction[]>> {
    const matrix: Record<string, Record<Resource, PermissionAction[]>> = {};

    roles.forEach((role) => {
      matrix[role.id] = {
        [Resource.CLIENTS]: [],
        [Resource.SETTINGS]: [],
        [Resource.USERS]: [],
        [Resource.ROLES]: [],
        [Resource.TEAM_MEMBERS]: [],
        [Resource.DOCUMENTS]: [],
        [Resource.WORKFLOWS]: [],
        [Resource.TICKETS]: [],
      };
    });

    if (permissions) {
      permissions.forEach((perm) => {
        if (matrix[perm.role_id]) {
          matrix[perm.role_id][perm.resource as Resource].push(perm.action as PermissionAction);
        }
      });
    }

    return matrix;
  }
}

// ============================================================================
// Singleton instance
// ============================================================================

let permissionServiceInstance: PermissionService | null = null;

export function getPermissionService(supabase: SupabaseClient): PermissionService {
  if (!permissionServiceInstance) {
    permissionServiceInstance = new PermissionService(supabase);
  }
  return permissionServiceInstance;
}
