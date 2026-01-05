# Active Tasks

## ✅ Completed Features
- [x] Settings (SET-001-002): Agency + User management
- [x] User Invitations (SET-003): 95% complete - verified 2026-01-05
- [x] Database Connection: Real Supabase connected (1 agency, 4 users, 20 clients)
- [x] Mock Mode Disabled: Local dev now uses real database (2026-01-05)

## ✅ Production Status (Verified 2026-01-05)

### Mock Mode: OFF
- Vercel has no `NEXT_PUBLIC_MOCK_MODE` set → defaults to false
- Runtime verified: `curl /api/v1/clients` returns 401 "No session"
- APIs correctly enforce authentication

### Email Service: Graceful Degradation
- `RESEND_API_KEY` not on Vercel (optional)
- Invitation flow works - email silently skipped
- Accept URLs can be shared manually
- To enable: `vercel env add RESEND_API_KEY`

## ✅ Recently Completed

### Pipeline Settings Wire-up (SET-009) - 2026-01-05
- [x] SET-009: PipelineSection - Connected pipeline settings to real API
- [x] Replaced setTimeout mock with PATCH to /api/v1/settings/agency
- [x] Uses fetchWithCsrf for CSRF protection
- [x] Proper error handling with toast notifications
- Commit: `7a0b30e`

### Agency Profile Wire-up (SET-008) - 2026-01-05
- [x] SET-008: AgencyProfile - Connected agency settings form to real API
- [x] Replaced DEFAULT_AGENCY mock with /api/v1/settings/agency fetch
- [x] Implemented handleSave with PATCH to real endpoint using fetchWithCsrf
- [x] Added loading skeleton and error states
- Commit: `935b90e`

### Settings Wire-up (SET-006, SET-007) - 2026-01-05
- [x] SET-006: UserEdit - Connected profile form to PATCH /users/[id]
- [x] SET-007: UserDelete - Added confirmation dialog + DELETE /users/[id]
- [x] Replaced mock data with real API fetch
- [x] Added loading/error states
- Commit: `a07a8c1`

### Multi-Org Roles Spec Complete - 2026-01-05
- [x] Created comprehensive feature specification (60 tasks)
- [x] Defined 5 role types: Owner, Admin, Manager, Member, Custom
- [x] Permission matrix: 12 resources × 4 actions (read/write/delete/manage)
- [x] Data model: 4 new tables (role, permission, role_permission, member_client_access)
- [x] User stories: US-042 to US-045
- [x] TypeScript implementation patterns included
- Spec: `features/multi-org-roles.md`
- Commit: `59cd1e6`

### Test Coverage Addition - 2026-01-05
- [x] Created 98 new tests across 5 test files
- [x] `__tests__/api/settings-agency.test.ts` (18 tests)
- [x] `__tests__/api/settings-users.test.ts` (16 tests)
- [x] `__tests__/api/settings-users-id.test.ts` (22 tests)
- [x] `__tests__/lib/csrf.test.ts` (15 tests)
- [x] `__tests__/stores/settings-store.test.ts` (27 tests)
- Total: 525 tests passing
- Commit: `59cd1e6`

### Auth Credentials Fix - 2026-01-05
- [x] Added `credentials: 'include'` to authenticated API fetch calls
- [x] Fixed stores: pipeline-store, dashboard-store, ticket-store, settings-store
- [x] Resolves 401 "No session" errors on authenticated endpoints
- Commit: `59cd1e6`

## 🚧 Next Features

### Feature: Multi-Org Roles Implementation
- urgency: 8
- importance: 9
- confidence: 8 (spec complete)
- impact: 9
- tier: READY TO BUILD
- description: Advanced RBAC. Define roles, assign permissions, enforce at API level.
- spec: [features/multi-org-roles.md](../features/multi-org-roles.md)
- tasks: 60 implementation tasks across 12 categories
- next: Spawn workers to implement Core Infrastructure (tasks 1-5)
