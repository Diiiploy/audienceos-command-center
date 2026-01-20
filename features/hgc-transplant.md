# HGC Transplant Completion

**Status:** 🚧 Building
**Started:** 2026-01-20
**Last Updated:** 2026-01-20

---

## Overview

Complete the Holy Grail Chat (HGC) integration into AudienceOS. Current implementation is ~80% complete but has critical gaps preventing full functionality.

---

## Audit Summary (2026-01-20)

### What AudienceOS Has (Keep)

| Component | File | Status |
|-----------|------|--------|
| SmartRouter | `lib/chat/router.ts` | ✅ 5 routes (dashboard, rag, web, memory, casual) |
| Function Executors | `lib/chat/functions/` | ✅ 6 of 10 implemented |
| Chat API | `app/api/v1/chat/route.ts` | ✅ Streaming + RBAC |
| Chat UI | `components/chat/chat-interface.tsx` | ✅ Glassmorphism dark theme |
| RAG System | `lib/rag/` | ✅ Gemini File Search |
| Memory Retrieval | `lib/memory/mem0-service.ts` | ✅ Works |
| Type Definitions | `lib/chat/types.ts` | ✅ Complete |

### What's Missing (Port from HGC)

| Component | Source | Gap | Priority |
|-----------|--------|-----|----------|
| Memory Storage | `lib/memory/mem0-service.ts` | `addMemory()` never called | HIGH |
| Context Injection | HGC `lib/context/` | Page/client context not passed | HIGH |
| Rate Limiting | - | Chat route unprotected | HIGH |
| Google Workspace Functions | HGC `lib/functions/executors/google-workspace.ts` | 4 functions missing | MEDIUM |

### Missing Functions (4)

| Function | Purpose | Blocker |
|----------|---------|---------|
| `get_emails` | Gmail inbox queries | Diiiploy-Gateway |
| `get_calendar_events` | Calendar integration | Diiiploy-Gateway |
| `get_drive_files` | Drive search | Diiiploy-Gateway |
| `check_google_connection` | OAuth status check | Diiiploy-Gateway |

---

## Implementation Plan

### Phase 1: Fix Memory Storage (No Blocker)

**Verification:** Unit test that `addMemory()` is called after chat response

**Files to modify:**
- `lib/memory/mem0-service.ts` - Add `addMemory()` implementation
- `app/api/v1/chat/route.ts` - Call `addMemory()` after response

**Test First:**
```typescript
// __tests__/lib/memory-storage.test.ts
describe('Memory Storage', () => {
  it('calls addMemory after chat response', async () => {
    const addMemorySpy = vi.spyOn(mem0Service, 'addMemory');
    await handleChatMessage({ message: 'Remember my name is Rod' });
    expect(addMemorySpy).toHaveBeenCalledWith(expect.objectContaining({
      content: expect.stringContaining('Rod'),
    }));
  });
});
```

### Phase 2: Add Context Injection (No Blocker)

**Verification:** Browser test - chat receives page context

**Files to modify:**
- `components/chat/chat-interface.tsx` - Pass page context to API
- `app/api/v1/chat/route.ts` - Include context in system prompt

**Context to inject:**
- Current page (dashboard, pipeline, client detail, etc.)
- Selected client (if on client detail page)
- Selected ticket (if on ticket detail)
- User role and permissions

**Test First:**
```typescript
// __tests__/api/chat-context.test.ts
describe('Chat Context Injection', () => {
  it('includes page context in system prompt', async () => {
    const response = await POST('/api/v1/chat', {
      message: 'What client am I looking at?',
      context: { page: 'client-detail', clientId: 'abc123' }
    });
    expect(response.message.content).toContain('abc123');
  });
});
```

### Phase 3: Add Rate Limiting (No Blocker)

**Verification:** Test that 11th request in 1 minute returns 429

**Files to modify:**
- `app/api/v1/chat/route.ts` - Add rate limiter
- `lib/rate-limit.ts` - Create rate limit helper (if not exists)

**Rate Limit Config:**
- 10 requests per minute per user
- 100 requests per hour per agency

**Test First:**
```typescript
// __tests__/api/chat-rate-limit.test.ts
describe('Chat Rate Limiting', () => {
  it('returns 429 after rate limit exceeded', async () => {
    for (let i = 0; i < 10; i++) {
      await POST('/api/v1/chat', { message: 'test' });
    }
    const response = await POST('/api/v1/chat', { message: 'test' });
    expect(response.status).toBe(429);
  });
});
```

### Phase 4: Google Workspace Functions (BLOCKED)

**Blocker:** Diiiploy-Gateway must be deployed for multi-tenant OAuth

**Diiiploy-Gateway Status:**
- Spec complete: `docs/04-technical/DIIIPLOY-GATEWAY.md`
- Code exists: `infrastructure/diiiploy-gateway/` (needs verification)
- Deployed: ❓ Need to check

**Decision Point:** Either:
1. Deploy Diiiploy-Gateway first (unblocks all 4 functions)
2. Skip Phase 4 for now, deliver Phases 1-3

**Files to create (when unblocked):**
- `lib/chat/functions/get-emails.ts`
- `lib/chat/functions/get-calendar-events.ts`
- `lib/chat/functions/get-drive-files.ts`
- `lib/chat/functions/check-google-connection.ts`
- `lib/chat/functions/index.ts` - Register new functions

---

## Files Reference

### AudienceOS (Current - Keep)
```
lib/chat/
├── router.ts              # SmartRouter (5 routes)
├── types.ts               # Type definitions
└── functions/
    ├── index.ts           # Function registry (6 functions)
    ├── schemas.ts         # Zod validation
    ├── get-clients.ts
    ├── get-client-details.ts
    ├── get-alerts.ts
    ├── get-agency-stats.ts
    ├── get-recent-communications.ts
    └── navigate-to.ts

lib/memory/
├── index.ts
├── mem0-service.ts        # Retrieval works, storage missing
└── memory-injector.ts     # Recall detection

lib/rag/
├── gemini-rag.ts
├── indexing-pipeline.ts
├── document-manager.ts
└── citation-extractor.ts

components/chat/
├── chat-interface.tsx     # Main UI
├── use-streaming-text.ts
└── typing-cursor.tsx

app/api/v1/chat/
└── route.ts               # Main endpoint
```

### HGC Original (Port From)
```
/Users/rodericandrews/_PAI/projects/holy-grail-chat/src/lib/

functions/executors/
└── google-workspace.ts    # Gmail, Calendar, Drive, OAuth

context/
└── context-provider.ts    # Page/client context injection
```

---

## Success Criteria

| Phase | Test | Pass Criteria |
|-------|------|---------------|
| 1 | Memory storage | `addMemory()` called after chat, memory persists across sessions |
| 2 | Context injection | "What client am I looking at?" returns actual client name |
| 3 | Rate limiting | 11th request in 1 minute returns 429 |
| 4 | Google Workspace | "Show my emails" returns real Gmail data |

---

## Related Documents

- [HGC Original CLAUDE.md](../../holy-grail-chat/CLAUDE.md)
- [Diiiploy-Gateway Spec](../docs/04-technical/DIIIPLOY-GATEWAY.md)
- [AudienceOS Chat Spec](audienceos-chat.md)
- [Integration Management](integrations-management.md)

---

*Living Document - Last updated: 2026-01-20*
