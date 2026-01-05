# FEATURE SPEC: AudienceOS Chat

**What:** AI chat assistant for AudienceOS Command Center
**Who:** Agency Account Managers, Support Staff, Agency Directors
**Why:** Enable natural language queries about clients, metrics, communications, and app navigation
**Status:** 🟡 IN PROGRESS - Critical blockers resolved, needs testing
**Parent:** Holy Grail Chat (HGC) - Transplanted 2026-01-04

---

## Origin: Holy Grail Chat Transplant

AudienceOS Chat is a **project-specific adaptation** of Holy Grail Chat (HGC).

| Attribute | HGC (Standalone) | AudienceOS Chat |
|-----------|------------------|-----------------|
| Purpose | Reusable library | Project-specific instance |
| Tests | 339 tests | Inherits patterns |
| Model | Gemini 3 Flash | **Gemini 3 Flash** (ONLY) |
| Service | 1,115 lines | 🔴 24-line stub |
| API Route | N/A (library) | 🔴 Returns 501 |

**Rule:** HGC remains pure. AudienceOS Chat adapts for this project's needs.

---

## Resolved Blockers (2026-01-05)

### Issue 1: Wrong API Library Import - ✅ NOT A BLOCKER
```
Verified: @google/genai IS installed and exports GoogleGenAI
Runtime test: node -e "require('@google/genai').GoogleGenAI" → function
```

### Issue 2: Wrong Environment Variable - ✅ FIXED
```
File: lib/chat/router.ts
Fix: Changed GEMINI_API_KEY → GOOGLE_AI_API_KEY
```

### Issue 3: API Route Returns 501 - ✅ FIXED
```
File: app/api/v1/chat/route.ts
Fix: Rewrote with full SmartRouter + Gemini integration
Deleted: app/api/chat/route.ts (dead stub code)
```

### Issue 4: ChatService Empty - ✅ NOT A BLOCKER
```
Status: Logic implemented directly in route.ts
ChatService is dead code - can be deleted later
```

### Issue 5: Missing Context in API Call - ✅ FIXED
```
File: components/chat/chat-interface.tsx
Fix: Added credentials: 'include', agencyId, userId
```

---

## Model Requirements (NON-NEGOTIABLE)

**WE ONLY USE GEMINI 3. NO EXCEPTIONS.**

| Use Case | Model | Model ID |
|----------|-------|----------|
| Chat, Routing | **Gemini 3 Flash** | `gemini-3-flash-preview` |
| RAG (if needed) | **Gemini 3 Flash** | `gemini-3-flash-preview` |

**FORBIDDEN:**
- `gemini-2.5-flash` - DO NOT USE
- `gemini-2.0-flash-001` - DO NOT USE (FIXED in RAG 2026-01-05)
- Any `gemini-2.x` model - DO NOT USE

**Gemini 3 Enforcement (2026-01-05):**
- ✅ lib/chat/router.ts - gemini-3-flash-preview
- ✅ lib/rag/gemini-rag.ts - gemini-3-flash-preview
- ✅ lib/gemini/file-service.ts - gemini-3-flash-preview
- ✅ app/api/v1/chat/route.ts - gemini-3-flash-preview

---

## Architecture

```
User Message
    ↓
┌─────────────────────────────────────┐
│        ChatInterface Component       │
│  (components/chat/chat-interface.tsx)│
└────────────────┬────────────────────┘
                 │ POST /api/v1/chat
                 │ { message, sessionId, agencyId, userId }
                 ↓
┌─────────────────────────────────────┐
│         API Route Handler            │
│     (app/api/v1/chat/route.ts)       │
│                                      │
│  1. Authenticate (getAuthenticatedUser)
│  2. Get/create session               │
│  3. Route via SmartRouter            │
│  4. Execute via ChatService          │
│  5. Stream response                  │
└────────────────┬────────────────────┘
                 │
    ┌────────────┼────────────┐
    ↓            ↓            ↓
┌───────┐  ┌──────────┐  ┌──────────┐
│SmartRouter│ │ChatService│ │Functions │
│ (5 routes)│ │(streaming)│ │(6 executors)
└───────┘  └──────────┘  └──────────┘
```

### 5 Smart Routes (from HGC)

| Route | Purpose | Status |
|-------|---------|--------|
| `rag` | Document/knowledge queries | ✅ Ported |
| `web` | Current events, real-time | ✅ Ported |
| `memory` | Previous conversation recall | ✅ Ported |
| `casual` | Greetings, simple questions | ✅ Ported |
| `dashboard` | Navigation + function calling | ✅ Ported |

### 6 Function Executors (from HGC)

| Function | Purpose | Status |
|----------|---------|--------|
| `get_clients` | List clients with filters | ✅ Ported |
| `get_client_details` | Single client info | ✅ Ported |
| `get_alerts` | Risk alerts | ✅ Ported |
| `get_agency_stats` | Dashboard KPIs | ✅ Ported |
| `get_recent_communications` | Messages | ✅ Ported |
| `navigate_to` | App navigation | ✅ Ported |

---

## Implementation Tasks

### Phase 1: Fix Critical Blockers - ✅ COMPLETE (2026-01-05)

- [x] TASK-001: Fix API library import - NOT NEEDED (@google/genai works)

- [x] TASK-002: Fix environment variable
  - Changed `GEMINI_API_KEY` → `GOOGLE_AI_API_KEY` in router.ts

- [x] TASK-003: Update model to Gemini 3
  - Verified `gemini-3-flash-preview` is correct model ID
  - Updated RAG service from `gemini-2.0-flash-001` → gemini-3-flash-preview
  - Updated file-service.ts model
  - Added Gemini 3 policy to RUNBOOK.md and CLAUDE.md

- [x] TASK-004: Implement API route
  - Rewrote app/api/v1/chat/route.ts with full implementation
  - Deleted dead stub at app/api/chat/route.ts

- [x] TASK-005: Add context to ChatInterface
  - Added credentials: 'include'
  - Added agencyId and userId to request body

### Phase 2: Port ChatService (4-6 hours)

- [ ] TASK-006: Port ChatService from HGC
  - Copy service.ts from holy-grail-chat/src/lib/chat/
  - Adapt imports for AudienceOS paths
  - Wire streaming to API route

- [ ] TASK-007: Wire SmartRouter to service
  - Initialize router in API handler
  - Pass query to classifyQuery()
  - Route to appropriate handler

- [ ] TASK-008: Test function calling
  - Verify all 6 executors work
  - Test with real Supabase queries
  - Verify fallback to mock data

### Phase 3: Integration Testing (2-3 hours)

- [ ] TASK-009: Test chat flow end-to-end
  - Send message from UI
  - Verify routing classification
  - Verify function execution
  - Verify response streaming

- [ ] TASK-010: Test authentication
  - Verify agencyId scoping
  - Verify userId association
  - Test RLS enforcement

- [ ] TASK-011: Test error handling
  - API key missing
  - Supabase unavailable
  - Model rate limited

### Phase 4: Documentation (1-2 hours)

- [ ] TASK-012: Update RUNBOOK.md
  - Add chat environment variables
  - Add verification commands
  - Document troubleshooting

- [ ] TASK-013: Update features/INDEX.md
  - Add AudienceOS Chat entry
  - Update ai-intelligence-layer.md status

---

## Files to Modify

| File | Action | Priority |
|------|--------|----------|
| `lib/chat/router.ts` | Fix imports, env var, model | P0 |
| `app/api/v1/chat/route.ts` | Implement handler | P0 |
| `components/chat/chat-interface.tsx` | Add context, credentials | P0 |
| `lib/chat/service.ts` | Port from HGC | P1 |
| `lib/rag/gemini-rag.ts` | Update model to Gemini 3 | P1 |
| `lib/gemini/file-service.ts` | Update model to Gemini 3 | P1 |
| `.env.example` | Document GOOGLE_AI_API_KEY | P2 |
| `package.json` | Verify @google/generative-ai | P0 |

---

## Environment Variables Required

```bash
# Required for AudienceOS Chat
GOOGLE_AI_API_KEY=xxx          # Gemini API key
NEXT_PUBLIC_SUPABASE_URL=xxx   # For function executors
SUPABASE_SERVICE_ROLE_KEY=xxx  # For server-side queries

# Optional
CHI_GATEWAY_URL=xxx            # For Mem0 integration
MEM0_API_KEY=xxx               # For cross-session memory
```

---

## Testing Checklist

- [ ] Chat widget appears on all pages (except login)
- [ ] Message sends successfully (no 501)
- [ ] SmartRouter classifies queries correctly
- [ ] Dashboard route executes functions
- [ ] get_clients returns real data from Supabase
- [ ] Responses stream progressively
- [ ] Error states display gracefully
- [ ] Agency scoping works (multi-tenant)
- [ ] Session persists across page navigation

---

## Success Metrics

- **Response Time:** < 3s for simple queries, < 8s for RAG
- **Routing Accuracy:** > 90% correct classification
- **Function Success:** > 95% successful execution
- **Error Rate:** < 5% failed requests

---

## Dependencies

**Blocked By:**
- GOOGLE_AI_API_KEY in Vercel env
- Supabase tables exist (chat_session, chat_message)
- @google/generative-ai package installed

**Enables:**
- Natural language client queries
- AI-assisted risk detection
- Contextual draft generation
- Cross-session memory recall

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-05 | Created spec after investigation. 20 issues found (5 critical). |
| 2026-01-04 | HGC transplant started - router, functions, types ported |

---

*Living Document - AudienceOS-specific adaptation of Holy Grail Chat*
