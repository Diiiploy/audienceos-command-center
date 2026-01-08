/**
 * Permission Middleware - API Protection Layer
 * Protects all endpoints with role-based access control
 *
 * Phase: Multi-Org Roles Implementation - Phase 2
 * Last Updated: 2026-01-08
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPermissionService } from '@/lib/permission-service';
import { PermissionAction, Resource } from '@/types/rbac';

// ============================================================================
// Middleware Type Definitions
// ============================================================================

export interface PermissionMiddlewareOptions {
  resource: Resource;
  action: PermissionAction;
  clientIdExtractor?: (req: NextRequest) => string | undefined;
  allowPublic?: boolean; // Allow unauthenticated access
}

export interface AuthenticatedRequest extends NextRequest {
  userId?: string;
  agencyId?: string;
  userRole?: string;
  user?: {
    id: string;
    email: string;
  };
}

// ============================================================================
// Permission Middleware Wrapper
// ============================================================================

/**
 * Main permission middleware - protects a route with permission checking
 *
 * Usage:
 * ```typescript
 * export async function GET(req: NextRequest) {
 *   return withPermission(
 *     async (authReq) => {
 *       // Your handler code
 *     },
 *     { resource: 'clients', action: 'read' }
 *   )(req);
 * }
 * ```
 */
export function withPermission<T extends any = any>(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse<T>>,
  options: PermissionMiddlewareOptions
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      // 1. Authenticate user
      const authResult = await authenticateUser(req);
      if (!authResult.success) {
        return NextResponse.json(
          {
            error: 'AUTH_REQUIRED',
            message: 'Authentication required',
          },
          { status: 401 }
        );
      }

      const { userId, agencyId, user } = authResult;
      const authenicatedReq = req as AuthenticatedRequest;
      authenicatedReq.userId = userId;
      authenicatedReq.agencyId = agencyId;
      authenicatedReq.user = user;

      // 2. Check if public access is allowed
      if (options.allowPublic && !userId) {
        return await handler(authenicatedReq);
      }

      if (!userId) {
        return NextResponse.json(
          { error: 'AUTH_REQUIRED', message: 'Authentication required' },
          { status: 401 }
        );
      }

      // 3. Check permissions
      const supabase = createClient();
      const permissionService = getPermissionService(supabase);

      // Extract client ID if needed (for client-scoped resources)
      let clientId: string | undefined;
      if (options.clientIdExtractor) {
        clientId = options.clientIdExtractor(req);
      }

      const permissionResult = await permissionService.hasPermission(
        userId,
        agencyId,
        options.resource,
        options.action,
        clientId
      );

      // Log access attempt for audit trail
      await permissionService.logAccessAttempt(
        userId,
        agencyId,
        options.resource,
        options.action,
        permissionResult.has_permission ? 'allowed' : 'denied',
        clientId,
        permissionResult.reason
      );

      // 4. Return 403 if permission denied
      if (!permissionResult.has_permission) {
        return NextResponse.json(
          {
            error: 'PERMISSION_DENIED',
            message: permissionResult.reason || 'Permission denied',
            code: clientId ? 'CLIENT_ACCESS_DENIED' : 'PERMISSION_DENIED',
          },
          { status: 403 }
        );
      }

      // 5. Call handler with authenticated request
      return await handler(authenicatedReq);
    } catch (error) {
      console.error('Permission middleware error:', error);
      return NextResponse.json(
        {
          error: 'INTERNAL_ERROR',
          message: 'Internal server error',
        },
        { status: 500 }
      );
    }
  };
}

// ============================================================================
// Owner-Only Middleware
// ============================================================================

/**
 * Restricts access to Owner role only
 */
export function withOwnerOnly<T extends any = any>(
  handler: (req: AuthenticatedRequest) => Promise<NextResponse<T>>
) {
  return withPermission(handler, {
    resource: 'roles',
    action: 'manage',
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Authenticate user from JWT token
 */
async function authenticateUser(req: NextRequest): Promise<{
  success: boolean;
  userId?: string;
  agencyId?: string;
  user?: { id: string; email: string };
}> {
  try {
    const supabase = createClient();

    // Get user from Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { success: false };
    }

    // Get agency from JWT custom claims
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return { success: false };
    }

    // Decode JWT to get agency_id
    let agencyId: string;
    try {
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
      agencyId = payload.agency_id || payload.app_metadata?.agency_id;
    } catch (e) {
      return { success: false };
    }

    if (!agencyId) {
      return { success: false };
    }

    return {
      success: true,
      userId: user.id,
      agencyId,
      user: {
        id: user.id,
        email: user.email || '',
      },
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return { success: false };
  }
}

/**
 * Extract client ID from URL path
 * Supports patterns like /api/v1/clients/[id], /api/v1/clients/[id]/...
 */
export function clientIdFromPath(req: NextRequest): string | undefined {
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/');

  // Find 'clients' segment and get next segment as ID
  const clientsIndex = pathSegments.indexOf('clients');
  if (clientsIndex !== -1 && clientsIndex + 1 < pathSegments.length) {
    const id = pathSegments[clientsIndex + 1];
    if (id && id !== 'new' && !id.startsWith('[')) {
      return id;
    }
  }

  return undefined;
}

/**
 * Extract resource ID from URL path
 * Generic version that works for any resource pattern
 */
export function resourceIdFromPath(req: NextRequest, resource: string): string | undefined {
  const url = new URL(req.url);
  const pathSegments = url.pathname.split('/');

  const resourceIndex = pathSegments.indexOf(resource);
  if (resourceIndex !== -1 && resourceIndex + 1 < pathSegments.length) {
    const id = pathSegments[resourceIndex + 1];
    if (id && id !== 'new' && !id.startsWith('[')) {
      return id;
    }
  }

  return undefined;
}

// ============================================================================
// Decorator/Wrapper for POST/PATCH/DELETE Methods
// ============================================================================

/**
 * Higher-order function to wrap all CRUD handlers
 *
 * Usage:
 * ```typescript
 * const withClientRead = protectRoute('clients', 'read');
 * export const GET = withClientRead(handler);
 * ```
 */
export function protectRoute(resource: Resource, action: PermissionAction) {
  return <T extends any = any>(handler: (req: AuthenticatedRequest) => Promise<NextResponse<T>>) => {
    const options: PermissionMiddlewareOptions = {
      resource,
      action,
      clientIdExtractor:
        resource === 'clients' || resource === 'documents' || resource === 'tickets'
          ? clientIdFromPath
          : undefined,
    };

    return withPermission(handler, options);
  };
}
