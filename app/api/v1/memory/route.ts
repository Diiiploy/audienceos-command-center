import { NextResponse } from 'next/server';
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission';
import { withCsrfProtection } from '@/lib/security';
import { initializeMem0Service } from '@/lib/memory/mem0-service';

/**
 * GET /api/v1/memory
 * List memories for the authenticated user
 *
 * Query params:
 *   - page (default: 1)
 *   - pageSize (default: 50)
 *   - search (optional search query)
 */
export const GET = withPermission({ resource: 'ai-features', action: 'read' })(
  async (request: AuthenticatedRequest) => {
    try {
      const agencyId = request.user.agencyId;
      const userId = request.user.id;

      const url = new URL(request.url);
      const page = parseInt(url.searchParams.get('page') || '1', 10);
      const pageSize = parseInt(url.searchParams.get('pageSize') || '50', 10);
      const search = url.searchParams.get('search');

      console.log('[Memory API] GET request:', {
        agencyId: agencyId?.substring(0, 8) + '...',
        userId: userId?.substring(0, 8) + '...',
        page,
        pageSize,
        search: search || '(none)',
        hasGatewayUrl: !!process.env.DIIIPLOY_GATEWAY_URL,
        hasGatewayKey: !!process.env.DIIIPLOY_GATEWAY_API_KEY,
      });

      const mem0 = initializeMem0Service();

      if (search) {
        // Search mode
        console.log('[Memory API] Search mode:', { query: search });
        const result = await mem0.searchMemories({
          query: search,
          agencyId,
          userId,
          limit: pageSize,
        });
        console.log('[Memory API] Search result:', {
          memoriesCount: result.memories.length,
          totalFound: result.totalFound,
          searchTimeMs: result.searchTimeMs,
        });
        return NextResponse.json({
          memories: result.memories,
          total: result.totalFound,
          page: 1,
          pageSize,
          searchTimeMs: result.searchTimeMs,
        });
      }

      // List mode
      console.log('[Memory API] List mode:', { agencyId: agencyId?.substring(0, 8) + '...', userId: userId?.substring(0, 8) + '...' });
      const result = await mem0.listMemories(agencyId, userId, page, pageSize);
      console.log('[Memory API] List result:', {
        memoriesCount: result.memories.length,
        total: result.total,
        page: result.page,
      });
      return NextResponse.json(result);
    } catch (error) {
      console.error('[Memory API] GET error:', error);
      console.error('[Memory API] GET error stack:', error instanceof Error ? error.stack : 'no stack');
      return NextResponse.json(
        { error: 'Failed to fetch memories' },
        { status: 500 }
      );
    }
  }
);

/**
 * POST /api/v1/memory
 * Confirm and store a suggested memory
 *
 * Body:
 *   - content (string) — the memory content
 *   - type (string) — memory type (decision, preference, task, insight)
 *   - importance (string) — high, medium, low
 *   - topic (string, optional) — memory topic/category
 */
export const POST = withPermission({ resource: 'ai-features', action: 'write' })(
  async (request: AuthenticatedRequest) => {
    const csrfError = withCsrfProtection(request as any);
    if (csrfError) return csrfError;

    try {
      const agencyId = request.user.agencyId;
      const userId = request.user.id;

      const body = await request.json();

      if (!body.content || !body.type) {
        return NextResponse.json(
          { error: 'content and type are required' },
          { status: 400 }
        );
      }

      const mem0 = initializeMem0Service();
      const result = await mem0.addMemory({
        content: body.content,
        agencyId,
        userId,
        type: body.type,
        importance: body.importance || 'high',
        topic: body.topic,
      });

      return NextResponse.json({ success: true, memoryId: result?.id, action: 'confirmed' });
    } catch (error) {
      console.error('[Memory API] POST error:', error);
      return NextResponse.json(
        { error: 'Failed to store memory' },
        { status: 500 }
      );
    }
  }
);

/**
 * DELETE /api/v1/memory
 * Delete a specific memory or all memories
 *
 * Body:
 *   - memoryId (string) — delete a single memory
 *   - deleteAll (boolean) — delete all memories for the user
 */
export const DELETE = withPermission({ resource: 'ai-features', action: 'write' })(
  async (request: AuthenticatedRequest) => {
    // CSRF protection for destructive action
    const csrfError = withCsrfProtection(request as any);
    if (csrfError) return csrfError;

    try {
      const agencyId = request.user.agencyId;
      const userId = request.user.id;

      const body = await request.json();
      const mem0 = initializeMem0Service();

      if (body.deleteAll) {
        const success = await mem0.clearMemories(agencyId, userId);
        return NextResponse.json({ success, action: 'delete_all' });
      }

      if (body.memoryId) {
        const success = await mem0.deleteMemory(body.memoryId);
        return NextResponse.json({ success, action: 'delete', memoryId: body.memoryId });
      }

      return NextResponse.json(
        { error: 'memoryId or deleteAll is required' },
        { status: 400 }
      );
    } catch (error) {
      console.error('[Memory API] DELETE error:', error);
      return NextResponse.json(
        { error: 'Failed to delete memory' },
        { status: 500 }
      );
    }
  }
);

/**
 * PUT /api/v1/memory
 * Update a memory's content
 *
 * Body:
 *   - memoryId (string) — the memory to update
 *   - content (string) — new content
 */
export const PUT = withPermission({ resource: 'ai-features', action: 'write' })(
  async (request: AuthenticatedRequest) => {
    // CSRF protection for mutation
    const csrfError = withCsrfProtection(request as any);
    if (csrfError) return csrfError;

    try {
      const body = await request.json();

      if (!body.memoryId || !body.content) {
        return NextResponse.json(
          { error: 'memoryId and content are required' },
          { status: 400 }
        );
      }

      const mem0 = initializeMem0Service();
      const updated = await mem0.updateMemory(body.memoryId, body.content);

      if (!updated) {
        return NextResponse.json(
          { error: 'Memory not found or update failed' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, memory: updated });
    } catch (error) {
      console.error('[Memory API] PUT error:', error);
      return NextResponse.json(
        { error: 'Failed to update memory' },
        { status: 500 }
      );
    }
  }
);
