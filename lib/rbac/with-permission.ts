/**
 * TASK-011: Permission Middleware Wrapper
 *
 * Wraps API route handlers with permission checking logic.
 * Automatically denies access if user lacks required permissions.
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/supabase';
import { permissionService } from './permission-service';
import type { ResourceType, PermissionAction } from './types';

export interface PermissionRequirement {
  /** The resource being accessed (e.g., 'clients', 'tickets') */
  resource: ResourceType;
  /** The action being performed (e.g., 'read', 'write', 'delete', 'manage') */
  action: PermissionAction;
  /** Optional: Required for client-scoped actions (Members accessing specific clients) */
  clientId?: string;
}

export interface AuthenticatedRequest extends NextRequest {
  user: {
    id: string;
    email: string;
    agencyId: string;
    roleId: string | null;
    isOwner: boolean;
  };
}

/**
 * Middleware wrapper that enforces permission checks on API routes
 *
 * @example
 * ```typescript
 * export const GET = withPermission({ resource: 'clients', action: 'read' })(
 *   async (req: AuthenticatedRequest) => {
 *     // User's permission already verified
 *     const clients = await fetchClients(req.user.agencyId);
 *     return NextResponse.json(clients);
 *   }
 * );
 * ```
 */
export function withPermission(requirement: PermissionRequirement) {
  return function wrapper<T extends (...args: any[]) => Promise<NextResponse>>(
    handler: T
  ) {
    return async function middleware(
      req: NextRequest,
      ...args: any[]
    ): Promise<NextResponse> {
      try {
        // 1. Create Supabase client and authenticate user
        const supabase = await createRouteHandlerClient(cookies);
        const { user, agencyId, error: authError } = await getAuthenticatedUser(supabase);

        if (!user || !agencyId) {
          console.warn('[withPermission] Authentication failed:', {
            resource: requirement.resource,
            action: requirement.action,
            path: req.nextUrl.pathname,
            error: authError,
          });

          return NextResponse.json(
            {
              error: 'Unauthorized',
              code: 'AUTH_REQUIRED',
              message: 'You must be logged in to access this resource',
            },
            { status: 401 }
          );
        }

        // 2. Fetch app user record (for roleId and isOwner)
        const { data: appUser, error: userError } = await supabase
          .from('user')
          .select('id, email, role_id, is_owner')
          .eq('id', user.id)
          .single();

        if (userError || !appUser) {
          console.error('[withPermission] Failed to fetch app user:', userError);
          return NextResponse.json(
            {
              error: 'Internal Server Error',
              code: 'USER_FETCH_FAILED',
              message: 'Could not fetch user information',
            },
            { status: 500 }
          );
        }

        // 3. Fetch user permissions
        const permissions = await permissionService.getUserPermissions(
          user.id,
          agencyId
        );

        // 4. Extract client ID from request if needed
        let clientId = requirement.clientId;
        if (!clientId && requirement.resource === 'clients') {
          // Try to extract from URL path: /api/v1/clients/[id]
          const match = req.nextUrl.pathname.match(/\/clients\/([^\/]+)/);
          if (match) {
            clientId = match[1];
          }
        }

        // 5. Check permission
        const hasPermission = permissionService.checkPermission(
          permissions,
          requirement.resource,
          requirement.action,
          clientId
        );

        if (!hasPermission) {
          // Log permission denial for audit
          console.warn('[withPermission] Permission denied:', {
            userId: user.id,
            email: user.email,
            agencyId,
            roleId: appUser.role_id,
            isOwner: appUser.is_owner,
            required: `${requirement.resource}:${requirement.action}`,
            clientId,
            path: req.nextUrl.pathname,
            method: req.method,
            timestamp: new Date().toISOString(),
          });

          return NextResponse.json(
            {
              error: 'Forbidden',
              code: 'PERMISSION_DENIED',
              required: `${requirement.resource}:${requirement.action}`,
              message: getPermissionDeniedMessage(requirement, clientId),
            },
            { status: 403 }
          );
        }

        // 6. Permission granted - attach user to request and call handler
        const authenticatedReq = req as AuthenticatedRequest;
        authenticatedReq.user = {
          id: user.id,
          email: user.email || appUser.email,
          agencyId,
          roleId: appUser.role_id,
          isOwner: appUser.is_owner,
        };

        return await handler(authenticatedReq, ...args);
      } catch (error) {
        console.error('[withPermission] Middleware error:', error);

        return NextResponse.json(
          {
            error: 'Internal Server Error',
            code: 'PERMISSION_CHECK_FAILED',
            message: 'An error occurred while checking permissions',
          },
          { status: 500 }
        );
      }
    };
  };
}

/**
 * Generate user-friendly permission denied messages
 */
function getPermissionDeniedMessage(
  requirement: PermissionRequirement,
  clientId?: string
): string {
  const { resource, action } = requirement;

  // Resource-specific messages
  if (resource === 'clients') {
    if (clientId) {
      return `You do not have permission to ${action} this client. Contact your administrator to request access.`;
    }
    return `You do not have permission to ${action} clients.`;
  }

  if (resource === 'settings') {
    return `You do not have permission to ${action} agency settings. Only administrators can modify settings.`;
  }

  if (resource === 'users') {
    return `You do not have permission to ${action} user accounts. Only administrators can manage users.`;
  }

  if (resource === 'roles') {
    return `You do not have permission to ${action} roles. Only owners can manage roles.`;
  }

  // Generic fallback
  return `You do not have permission to ${action} ${resource}. Contact your administrator if you believe you should have access.`;
}

/**
 * Helper: Create multiple permission requirements (OR logic)
 * User needs ANY ONE of the specified permissions
 *
 * @example
 * ```typescript
 * export const GET = withAnyPermission([
 *   { resource: 'clients', action: 'read' },
 *   { resource: 'clients', action: 'manage' }
 * ])(handler);
 * ```
 */
export function withAnyPermission(requirements: PermissionRequirement[]) {
  return function wrapper<T extends (...args: any[]) => Promise<NextResponse>>(
    handler: T
  ) {
    return async function middleware(
      req: NextRequest,
      ...args: any[]
    ): Promise<NextResponse> {
      const supabase = await createRouteHandlerClient(cookies);
      const { user, agencyId, error: authError } = await getAuthenticatedUser(supabase);

      if (!user || !agencyId) {
        return NextResponse.json(
          { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
          { status: 401 }
        );
      }

      const { data: appUser } = await supabase
        .from('user')
        .select('id, email, role_id, is_owner')
        .eq('id', user.id)
        .single();

      if (!appUser) {
        return NextResponse.json(
          { error: 'Internal Server Error', code: 'USER_FETCH_FAILED' },
          { status: 500 }
        );
      }

      const permissions = await permissionService.getUserPermissions(
        user.id,
        agencyId
      );

      // Check if user has ANY of the required permissions
      const hasAnyPermission = requirements.some((req) =>
        permissionService.checkPermission(
          permissions,
          req.resource,
          req.action,
          req.clientId
        )
      );

      if (!hasAnyPermission) {
        console.warn('[withAnyPermission] No matching permissions:', {
          userId: user.id,
          required: requirements.map((r) => `${r.resource}:${r.action}`),
        });

        return NextResponse.json(
          {
            error: 'Forbidden',
            code: 'PERMISSION_DENIED',
            message: 'You do not have any of the required permissions',
          },
          { status: 403 }
        );
      }

      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.user = {
        id: user.id,
        email: user.email || appUser.email,
        agencyId,
        roleId: appUser.role_id,
        isOwner: appUser.is_owner,
      };

      return await handler(authenticatedReq, ...args);
    };
  };
}

/**
 * Helper: Owner-only middleware (shorthand for high-privilege routes)
 *
 * @example
 * ```typescript
 * export const DELETE = withOwnerOnly()(async (req) => {
 *   // Only owners can access this
 * });
 * ```
 */
export function withOwnerOnly() {
  return function wrapper<T extends (...args: any[]) => Promise<NextResponse>>(
    handler: T
  ) {
    return async function middleware(
      req: NextRequest,
      ...args: any[]
    ): Promise<NextResponse> {
      const supabase = await createRouteHandlerClient(cookies);
      const { user, agencyId, error: authError } = await getAuthenticatedUser(supabase);

      if (!user || !agencyId) {
        return NextResponse.json(
          { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
          { status: 401 }
        );
      }

      const { data: appUser } = await supabase
        .from('user')
        .select('id, email, role_id, is_owner')
        .eq('id', user.id)
        .single();

      if (!appUser || !appUser.is_owner) {
        console.warn('[withOwnerOnly] Access denied - not owner:', {
          userId: user.id,
          email: user.email,
          isOwner: appUser?.is_owner || false,
        });

        return NextResponse.json(
          {
            error: 'Forbidden',
            code: 'OWNER_ONLY',
            message: 'This action can only be performed by the agency owner',
          },
          { status: 403 }
        );
      }

      const authenticatedReq = req as AuthenticatedRequest;
      authenticatedReq.user = {
        id: user.id,
        email: user.email || appUser.email,
        agencyId,
        roleId: appUser.role_id,
        isOwner: appUser.is_owner,
      };

      return await handler(authenticatedReq, ...args);
    };
  };
}
