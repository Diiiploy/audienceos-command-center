import { NextResponse } from 'next/server';
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission';
import { initializeMem0Service } from '@/lib/memory/mem0-service';

/**
 * GET /api/v1/memory/debug
 * Diagnostic endpoint that tests the full mem0 pipeline with the authenticated user's
 * real entity params. Visit this URL directly in the browser to see what's happening.
 *
 * TEMPORARY — remove after debugging is complete.
 */
export const GET = withPermission({ resource: 'ai-features', action: 'read' })(
  async (request: AuthenticatedRequest) => {
    const diagnostics: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      step: 'init',
    };

    try {
      const agencyId = request.user.agencyId;
      const userId = request.user.id;

      diagnostics.auth = {
        agencyId,
        userId,
        email: request.user.email,
        isOwner: request.user.isOwner,
      };

      diagnostics.env = {
        DIIIPLOY_GATEWAY_URL: process.env.DIIIPLOY_GATEWAY_URL || '(NOT SET — using default)',
        DIIIPLOY_GATEWAY_API_KEY: process.env.DIIIPLOY_GATEWAY_API_KEY
          ? `${process.env.DIIIPLOY_GATEWAY_API_KEY.substring(0, 8)}...`
          : '(NOT SET — empty string)',
        hasGatewayUrl: !!process.env.DIIIPLOY_GATEWAY_URL,
        hasGatewayKey: !!process.env.DIIIPLOY_GATEWAY_API_KEY,
      };

      // Step 1: Initialize mem0 service
      diagnostics.step = 'initService';
      const mem0 = initializeMem0Service();

      // Step 2: Test listing memories (what the Memory panel does)
      diagnostics.step = 'listMemories';
      const listStart = Date.now();
      let listResult;
      let listError: string | null = null;
      try {
        listResult = await mem0.listMemories(agencyId, userId, 1, 10);
      } catch (e) {
        listError = e instanceof Error ? e.message : String(e);
      }
      diagnostics.listMemories = {
        durationMs: Date.now() - listStart,
        error: listError,
        memoriesCount: listResult?.memories?.length ?? null,
        total: listResult?.total ?? null,
        firstMemory: listResult?.memories?.[0]
          ? {
              id: listResult.memories[0].id,
              contentPreview: listResult.memories[0].content?.substring(0, 100),
              type: listResult.memories[0].metadata?.type,
            }
          : null,
      };

      // Step 3: Test adding a memory
      diagnostics.step = 'addMemory';
      const testContent = `[DIAG] Debug test memory at ${new Date().toISOString()}`;
      const addStart = Date.now();
      let addResult;
      let addError: string | null = null;
      try {
        addResult = await mem0.addMemory({
          content: testContent,
          agencyId,
          userId,
          type: 'insight',
          importance: 'low',
          topic: 'debug-diagnostic',
        });
      } catch (e) {
        addError = e instanceof Error ? `${e.message}\n${e.stack}` : String(e);
      }
      diagnostics.addMemory = {
        durationMs: Date.now() - addStart,
        error: addError,
        memoryId: addResult?.id ?? null,
        content: testContent,
      };

      // Step 4: Wait briefly and re-list
      diagnostics.step = 'waitAndRelist';
      await new Promise((r) => setTimeout(r, 3000));
      const relist = Date.now();
      let relistResult;
      let relistError: string | null = null;
      try {
        relistResult = await mem0.listMemories(agencyId, userId, 1, 10);
      } catch (e) {
        relistError = e instanceof Error ? e.message : String(e);
      }
      diagnostics.relistMemories = {
        durationMs: Date.now() - relist,
        error: relistError,
        memoriesCount: relistResult?.memories?.length ?? null,
        total: relistResult?.total ?? null,
        note: 'Listed 3s after add — mem0 async processing may need up to 10s',
      };

      // Step 5: Search memories
      diagnostics.step = 'searchMemories';
      const searchStart = Date.now();
      let searchResult;
      let searchError: string | null = null;
      try {
        searchResult = await mem0.searchMemories({
          query: 'debug test diagnostic',
          agencyId,
          userId,
          limit: 5,
        });
      } catch (e) {
        searchError = e instanceof Error ? e.message : String(e);
      }
      diagnostics.searchMemories = {
        durationMs: Date.now() - searchStart,
        error: searchError,
        memoriesCount: searchResult?.memories?.length ?? null,
        totalFound: searchResult?.totalFound ?? null,
      };

      // Step 6: Entity check
      diagnostics.step = 'getEntities';
      let entities: Awaited<ReturnType<typeof mem0.getEntities>> | undefined = undefined;
      let entityError: string | null = null;
      try {
        entities = await mem0.getEntities();
      } catch (e) {
        entityError = e instanceof Error ? e.message : String(e);
      }
      diagnostics.entities = {
        error: entityError,
        count: entities?.length ?? null,
        types: entities?.reduce((acc: Record<string, number>, e) => {
          acc[e.type] = (acc[e.type] || 0) + 1;
          return acc;
        }, {}) ?? null,
        // Check if current user's entity params exist
        hasUserEntity: entities?.some((e) => e.type === 'user' && e.name === userId) ?? null,
        hasAppEntity: entities?.some((e) => e.type === 'app' && e.name === agencyId) ?? null,
      };

      diagnostics.step = 'complete';
      diagnostics.summary = {
        authWorking: !!agencyId && !!userId,
        envVarsSet: !!process.env.DIIIPLOY_GATEWAY_URL && !!process.env.DIIIPLOY_GATEWAY_API_KEY,
        addWorking: !addError,
        listWorking: !listError,
        memoriesFound: (listResult?.memories?.length ?? 0) > 0,
        entityParamsExist: diagnostics.entities
          ? (diagnostics.entities as any).hasUserEntity && (diagnostics.entities as any).hasAppEntity
          : false,
      };

      return NextResponse.json(diagnostics, {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      diagnostics.fatalError = error instanceof Error
        ? { message: error.message, stack: error.stack }
        : String(error);
      return NextResponse.json(diagnostics, { status: 500 });
    }
  }
);
