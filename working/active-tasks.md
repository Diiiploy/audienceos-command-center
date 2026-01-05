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

## 🚧 Next Features (After Blockers Clear)

### Feature: Multi-Org Roles
- urgency: 8
- importance: 9
- confidence: 7
- impact: 9
- tier: IMMEDIATE
- description: Advanced RBAC. Define roles, assign permissions, enforce at API level.

### Feature: Settings Completion (SET-004-007)
- urgency: 7
- importance: 8
- confidence: 8
- impact: 7
- tier: IMMEDIATE
- description: Billing settings, API keys, webhook management, notification preferences.
