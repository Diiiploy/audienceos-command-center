# AudienceOS Command Center - Technical Debt Register

> **Purpose:** Track known tech debt with clear priority and triggers
> **Last Updated:** 2026-01-03
> **Status:** Active

---

## Priority Tiers

| Tier | Trigger | Action |
|------|---------|--------|
| **P0** | Blocks production or causes bugs | Fix immediately |
| **P1** | Fix before public beta | Schedule in next sprint |
| **P2** | Fix when scaling (100+ clients) | Monitor, fix when needed |
| **P3** | Nice to have | Fix opportunistically |

---

## P0: Critical (Fix Now)

### TD-001: setTimeout Anti-Pattern in useEffect ✅ FIXED
**File:** `app/page.tsx:58-72, 159-163, 177-187`
**Issue:** Using `setTimeout(() => setState(), 0)` to defer state updates
**Effect:** Race conditions, flickering UI, unpredictable state
**Fix:** Use useMemo for derived state, proper effect dependencies
**Status:** Fixed 2026-01-02

### TD-002: Duplicate Client State ✅ FIXED
**File:** `app/page.tsx:47` + `stores/pipeline-store.ts`
**Issue:** Clients exist in both local component state AND Zustand store
**Effect:** Multiple sources of truth, sync bugs, inconsistent UI
**Fix:** Use Zustand store exclusively, remove local state
**Status:** Fixed 2026-01-02

### TD-003: Insufficient HTML Sanitization ✅ FIXED
**File:** `lib/security.ts:29-37`
**Issue:** Regex-based sanitization misses encoding bypasses, SVG vectors
**Effect:** XSS vulnerability
**Fix:** Replace with DOMPurify library
**Status:** Fixed 2026-01-02

### TD-023: Mock Data Fallback Pattern ✅ FIXED
**Files:** `app/page.tsx`, `app/client/[id]/page.tsx`
**Issue:** Views fell back to mockClients when API data unavailable
**Effect:** Fake data shown instead of empty states; confusion about real vs mock
**Fix:** Removed mock imports, return empty arrays, added proper empty state UI
**Status:** Fixed 2026-01-02

---

## P1: Pre-Beta (Fix Before Public Launch)

### TD-004: In-Memory Rate Limiting ✅ FIXED
**File:** `lib/security.ts`
**Issue:** Rate limit store is in-memory Map, resets on restart
**Effect:** Ineffective with load balancing or server restarts
**Fix:** Implemented distributed rate limiting via Supabase with atomic `increment_rate_limit` RPC
**Status:** Fixed 2026-01-02

### TD-005: Missing CSRF Protection ✅ FIXED
**File:** `middleware.ts`, `lib/security.ts`, `lib/csrf.ts`
**Issue:** No CSRF token validation on state-changing requests
**Effect:** Cross-site request forgery possible
**Fix:** Added `withCsrfProtection()` middleware, cookie-based tokens set in middleware, client-side `fetchWithCsrf()` wrapper
**Status:** Fixed 2026-01-02

### TD-006: Email Validation Too Permissive ✅ FIXED
**File:** `lib/security.ts`
**Issue:** Regex allows invalid emails like `test@test..com`
**Effect:** Invalid data in database
**Fix:** Replaced regex with `email-validator` library for RFC 5322 compliant validation
**Status:** Fixed 2026-01-02

### TD-007: Disabled ESLint Dependencies ✅ FIXED
**File:** `hooks/use-dashboard.ts:355`
**Issue:** `eslint-disable-line react-hooks/exhaustive-deps` masks real bugs
**Effect:** Trends don't update when selectedPeriod changes
**Fix:** Added proper dependencies to initial load useEffect
**Status:** Fixed 2026-01-03

### TD-008: IP Spoofing in Rate Limiter ✅ FIXED
**File:** `lib/security.ts`
**Issue:** Trusts X-Forwarded-For header without validation
**Effect:** Rate limit bypass via header spoofing
**Fix:** Added `getClientIp()` with priority: CF-Connecting-IP > X-Real-IP > rightmost X-Forwarded-For, with IP format validation
**Status:** Fixed 2026-01-02

---

## Security (SEC): Pre-Production Hardening

### SEC-001: Unsigned OAuth State ✅ FIXED
**Files:** `app/api/v1/integrations/route.ts`, `app/api/v1/oauth/callback/route.ts`, `lib/crypto.ts`
**Issue:** OAuth state was Base64-encoded JSON without HMAC signature
**Effect:** CSRF vulnerability in OAuth flow - attacker could craft malicious callbacks
**Fix:** Added HMAC-SHA256 signature using `signOAuthState()` and `verifyOAuthState()`
**Status:** Fixed 2026-01-02

### SEC-002: Plaintext OAuth Tokens ✅ FIXED
**Files:** `app/api/v1/oauth/callback/route.ts`, `lib/crypto.ts`
**Issue:** access_token and refresh_token were stored unencrypted in Supabase
**Effect:** Database breach would expose all OAuth tokens
**Fix:** Added AES-256-GCM encryption with `encryptToken()` and `decryptToken()`
**Status:** Fixed 2026-01-02

### SEC-003: Inconsistent agency_id Retrieval ✅ FIXED
**Files:** `lib/supabase.ts`, all workflow and integration routes
**Issue:** Was using `user.user_metadata?.agency_id` instead of database lookup
**Effect:** Stale JWT metadata could cause wrong tenant data access
**Fix:** Created `getAuthenticatedUser()` helper that fetches agency_id from database
**Status:** Fixed 2026-01-02

### SEC-004: No Authentication Middleware ✅ FIXED
**File:** `middleware.ts`
**Issue:** No centralized route protection - each route handled auth individually
**Effect:** New routes could forget auth checks; no single enforcement point
**Fix:** Added Next.js middleware protecting all routes, with demo fallback for specific APIs
**Status:** Fixed 2026-01-02

### SEC-005: No Token Revocation on Disconnect ✅ FIXED
**File:** `app/api/v1/integrations/[id]/route.ts`
**Issue:** Tokens were not revoked when user disconnected integration
**Effect:** Stale OAuth tokens remained valid at provider after "disconnect"
**Fix:** Added `revokeProviderTokens()` function calling provider revocation endpoints
**Status:** Fixed 2026-01-02

### SEC-006: getSession vs getUser Inconsistency ✅ FIXED
**Files:** All API routes now use `getAuthenticatedUser()` from `lib/supabase.ts`
**Issue:** Some routes used `getSession()`, Supabase recommends `getUser()` for server
**Effect:** `getSession()` trusts JWT without server verification; potential auth bypass
**Fix:** Standardized all routes to use `getAuthenticatedUser()` which calls `getUser()`
**Status:** Fixed 2026-01-02

---

## P2: Pre-Scale (Fix at 100+ Clients)

### TD-009: Missing useMemo for Filter Calculations ✅ FIXED
**File:** `app/page.tsx:92-125`
**Issue:** Filter logic recalculates on every render
**Effect:** Performance degradation with large datasets
**Fix:** Wrapped filteredClients in useMemo with proper dependencies
**Status:** Fixed 2026-01-02

### TD-010: Missing React.memo on Kanban Components
**File:** `components/kanban-board.tsx`
**Issue:** DraggableClientCard and DroppableColumn re-render on any change
**Effect:** Janky drag-drop with many cards
**Fix:** Add React.memo with custom comparison
**Trigger:** When seeing drag-drop lag

### TD-011: Eager Loading All Views
**File:** `app/page.tsx:6-18`
**Issue:** 10+ view components imported eagerly
**Effect:** Larger initial bundle, slower first load
**Fix:** Use Next.js dynamic imports
**Trigger:** When bundle size exceeds 500KB

### TD-012: Missing useCallback for Event Handlers
**File:** `app/page.tsx:113-115, 225-267`
**Issue:** Handlers recreated on every render
**Effect:** Unnecessary child re-renders
**Fix:** Wrap handlers in useCallback
**Trigger:** When seeing performance issues

### TD-013: Inefficient Thread Building
**File:** `stores/communications-store.ts:217-265`
**Issue:** Multiple array passes and copies in buildThreadHierarchy
**Effect:** Sluggish with 1000+ messages
**Fix:** Single-pass algorithm
**Trigger:** When message count exceeds 500

### TD-014: Missing Pagination Limits
**File:** `hooks/communications/use-communications.ts:37-50`
**Issue:** No server-side max limit on pagination
**Effect:** Resource exhaustion with `limit=999999`
**Fix:** Enforce max limit (e.g., 100) server-side
**Trigger:** Before API is public

---

## P3: Nice to Have (Opportunistic)

### TD-015: Prop Drilling
**File:** `app/page.tsx` (throughout)
**Issue:** 8+ levels of prop passing
**Effect:** Tight coupling, hard to refactor
**Fix:** Move related state to Zustand or Context
**Trigger:** When refactoring component tree

### TD-016: Magic Numbers/Strings
**Files:** `kanban-board.tsx:242`, `use-communications.ts:108`
**Issue:** Hardcoded values scattered throughout
**Effect:** Maintenance burden
**Fix:** Centralize in `lib/constants.ts`
**Trigger:** During code cleanup sprint

### TD-017: Duplicate Health Status Mapping
**Files:** `pipeline-store.ts:100`, `use-dashboard.ts:28`
**Issue:** Same mapping logic repeated
**Effect:** Bug fixes don't propagate
**Fix:** Create single `mapHealthStatus()` utility
**Trigger:** When touching health logic

### TD-018: Duplicate Filter Logic
**Files:** `app/page.tsx`, `pipeline-store.ts`, `use-communications.ts`
**Issue:** Three separate filter implementations
**Effect:** Inconsistent behavior
**Fix:** Extract to shared utility
**Trigger:** When adding new filter types

### TD-019: Excessive Type Casting
**Files:** `pipeline-store.ts:149`, `ticket-store.ts:213`
**Issue:** Using `as` bypasses TypeScript checks
**Effect:** Runtime errors not caught at compile time
**Fix:** Use type guards or Zod validation
**Trigger:** When seeing type-related runtime errors

### TD-020: Nested Action Calls in Stores
**File:** `communications-store.ts:191-203`
**Issue:** Calling one Zustand action from another
**Effect:** Potential stale state, race conditions
**Fix:** Inline logic or use immer
**Trigger:** When seeing state sync issues

### TD-021: Error State Not Cleared
**Files:** `pipeline-store.ts:169`, `ticket-store.ts:214`
**Issue:** Errors set but never cleared after success
**Effect:** Stale error messages
**Fix:** Clear error on successful operations
**Trigger:** When users report stuck errors

### TD-022: Duplicate Error Handling
**Files:** Multiple API routes and hooks
**Issue:** Same try/catch pattern repeated 20+ times
**Effect:** Inconsistent error logging
**Fix:** Create `handleApiError()` utility
**Trigger:** During error handling standardization

---

## Implementation TODOs (Categorized)

> These are placeholder comments in the codebase that need implementation.

### Cartridge API Calls (12 TODOs)
**Files:** `components/cartridges/tabs/*.tsx`
**Status:** Blocked on cartridge backend
- `voice-tab.tsx:68` - Save cartridge API
- `style-tab.tsx:29` - Upload files API
- `style-tab.tsx:36` - Analyze style API
- `style-tab.tsx:42` - Delete style cartridge API
- `preferences-tab.tsx:24` - Save preferences API
- `preferences-tab.tsx:30` - Delete preferences API
- `brand-tab.tsx:36` - Save brand API
- `brand-tab.tsx:42` - Delete brand API
- `brand-tab.tsx:48` - Generate 112-point blueprint API
- `brand-tab.tsx:56` - Upload logo API
- `instructions-tab.tsx:22,37,46,56` - Instruction set CRUD

### Chat/AI Handlers (4 TODOs)
**Files:** `lib/chat/service.ts`, `lib/chat/functions/*.ts`
**Status:** Partially blocked on Gemini integration
- `service.ts:86` - RAG document search handler
- `service.ts:91` - Web search handler
- `service.ts:96` - Memory/session context handler
- `get-clients.ts:12`, `get-stats.ts:20` - Replace mock with Supabase queries

### Communications API (4 TODOs)
**Files:** `components/communications/communications-hub.tsx`, `app/api/v1/communications/*/route.ts`
**Status:** Blocked on Slack/Gmail integration
- `communications-hub.tsx:157` - Send reply API call
- `communications-hub.tsx:194` - AI draft generation API
- `communications-hub.tsx:215,221` - Pagination with cursor
- `reply/route.ts:78` - Send via Slack/Gmail API

### Workflow Engine (3 TODOs)
**Files:** `lib/workflows/*.ts`
**Status:** Needs notification infrastructure
- `execution-engine.ts:375` - Notification sending via integrations
- `execution-engine.ts:397` - communication_drafts table storage
- `workflow-queries.ts:100` - Count pending approvals

### Tickets (2 TODOs)
**Files:** `app/api/v1/tickets/*/route.ts`, `components/settings/settings-layout.tsx`
**Status:** Needs email queue infrastructure
- `resolve/route.ts:116` - Queue email to client on resolution
- `settings-layout.tsx:63` - Confirmation dialog for destructive actions

---

## Changelog

| Date | Item | Action |
|------|------|--------|
| 2026-01-03 | TD-007 | **Fixed** - Replaced dependency approach with useRef guard for true mount-only behavior |
| 2026-01-03 | Type Safety | Fixed `as any` in client/[id]/page.tsx with `as const` pattern |
| 2026-01-03 | Store Consolidation | Moved `lib/stores/dashboard-store.ts` to `stores/` |
| 2026-01-03 | Implementation TODOs | Categorized 25 TODO comments by feature area |
| 2026-01-03 | Legacy Cleanup | Removed 14 unused components and orphaned view files |
| 2026-01-02 | SEC-006 Complete | Migrated ALL 22 remaining `getSession()` calls to `getAuthenticatedUser()` |
| 2026-01-02 | Security Keys | Added `OAUTH_STATE_SECRET` and `TOKEN_ENCRYPTION_KEY` to `.env.local` |
| 2026-01-02 | Startup Validation | Created `instrumentation.ts` to fail-fast in production if security keys missing |
| 2026-01-02 | SEC-001 to SEC-006 | **Fixed** - OAuth signing, token encryption, agency_id, middleware, revocation, getUser |
| 2026-01-02 | SEC-001 to SEC-006 | Added 6 security items from security audit |
| 2026-01-02 | TD-001, TD-002, TD-003 | Fixed - setTimeout, duplicate state, DOMPurify |
| 2026-01-02 | Initial | Created register with 22 items from audit |

---

*Living Document - Update when debt is added or resolved*
