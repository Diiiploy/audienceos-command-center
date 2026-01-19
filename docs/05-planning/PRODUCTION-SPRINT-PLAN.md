# AudienceOS Production Sprint Plan
**Status:** Ready to Execute
**Date:** 2026-01-15
**Orchestration:** Chi-CTO

---

## MISSION: Get Everything Production-Ready
- ✅ Port working cartridge backend from RevOS
- ✅ Real Gmail/Slack integration (not mock data)
- ✅ Replace all mock data with real APIs
- ✅ Full E2E verification
- ✅ Deploy to production with confidence

---

## TIER 1: CRITICAL BLOCKERS (Complete This Week)

### 1.1 Port Cartridge Backend from RevOS (3 days)
**Owner:** Chi-CTO
**What:** Copy working code + adapt to AudienceOS schema

**Steps:**
1. Port 5 DB migrations from RevOS to AudienceOS:
   - `003_cartridge_system.sql` (main structure)
   - `037_client_cartridges.sql` (cart tables)
   - Brand/voice/style/preferences/instructions-specific migrations
   - Apply to AudienceOS Supabase

2. Port 12 API endpoints from RevOS `app/api/cartridges/`:
   - POST/GET `/cartridges/brand` (brand info + logo)
   - POST/GET `/cartridges/voice` (voice config)
   - POST/GET `/cartridges/style` (style learning)
   - POST/GET `/cartridges/preferences` (platform/tone/length)
   - POST/GET/DELETE `/cartridges/instructions` (instruction sets)
   - POST `/cartridges/instructions/[id]/upload` (document upload)
   - POST `/cartridges/instructions/[id]/process` (extract knowledge)
   - Change path: `app/api/cartridges/` → `app/api/v1/cartridges/` (for consistency with AudienceOS routing)

3. Port utility functions:
   - `lib/cartridge-utils.ts` - Helper functions
   - `lib/cartridges/voice-cartridge.ts` - Voice processing
   - `lib/cartridges/brand-cartridge.ts` - Brand blueprint generation

4. Adapt for AudienceOS:
   - Change auth (RevOS: user-scoped → AudienceOS: agency-scoped with user_id)
   - Change DB table references (RevOS schema → AudienceOS schema)
   - Change path prefixes (RevOS: /api/cartridges/ → AudienceOS: /api/v1/cartridges/)
   - Verify RLS policies allow agency-scoped access

5. Verify:
   - All 12 endpoints respond (not 404)
   - Test suite from 2026-01-14 runs and passes (53 tests)
   - Claude in Chrome: Save data, verify persistence

**Deliverable:** Training Cartridges fully functional, 53/53 tests passing

---

### 1.2 E2E Test Multi-Org Roles (1 day)
**Owner:** Chi-CTO + Claude in Chrome
**What:** Verify role assignments work end-to-end

**Steps:**
1. Use Claude in Chrome to:
   - Navigate to Settings > Users
   - Create member with "Manager" role
   - Assign to specific clients
   - Verify data access restrictions
   - Try to access unauthorized client (should fail)

2. Test matrix:
   - Owner: can edit all clients ✓
   - Admin: can edit all clients ✓
   - Manager: can edit assigned clients only ✓
   - Member: read-only on assigned clients ✓

**Deliverable:** RBAC feature validated, screenshot evidence

---

## TIER 2: REAL DATA (Complete This Week)

### 2.1 Real Gmail Sync (2 days)
**Owner:** Chi-CTO
**What:** Replace mock email with real Gmail data

**Steps:**
1. Add token storage:
   - New table: `integration_credentials` (agency_id, service, encrypted_token)
   - Migration: `007_add_integration_credentials.sql`
   - Store refresh token after OAuth callback

2. Build OAuth callback:
   - Route: `app/api/oauth/gmail/callback`
   - Exchange authorization code for refresh token
   - Store in `integration_credentials` table
   - Redirect to Settings > Integrations with success toast

3. Create sync service:
   - `lib/integrations/gmail-sync.ts`
   - Scheduled job (5-min interval): fetch new emails
   - Route: `app/api/v1/integrations/sync/gmail`
   - Write emails to `communications` table

4. Wire UI:
   - Settings > Integrations: "Connect Gmail" button → OAuth flow
   - Communications Hub: Show real Gmail threads (not mock)

**Deliverable:** Real Gmail data flowing in, mock data removed

---

### 2.2 Real Slack Sync (2 days)
**Owner:** Chi-CTO
**What:** Add Slack to diiiploy-gateway + sync

**Steps:**
1. Add Slack to diiiploy-gateway:
   - Create `src/routes/slack.ts` in diiiploy-gateway
   - OAuth 2.0 handler + token exchange
   - Slack API methods: channels.list, conversations.history, etc.

2. Deploy diiiploy-gateway:
   - `wrangler deploy` with new Slack route
   - Test via `curl https://diiiploy-gateway.roderic-andrews.workers.dev/health`

3. Implement AudienceOS Slack sync:
   - Route: `app/api/v1/integrations/sync/slack`
   - Fetch Slack conversation history
   - Write to `communications` table with slack_thread_id

4. Wire UI:
   - Settings > Integrations: "Connect Slack" → OAuth via diiiploy-gateway
   - Communications Hub: Show Slack messages + threads

**Deliverable:** Real Slack data flowing in

---

## TIER 3: POLISH (Complete by End of Sprint)

### 3.1 Real Google Ads Data (1 day)
**Owner:** Chi-CTO
**What:** Replace mock ad metrics with real campaigns

**Steps:**
1. Implement OAuth → store Google Ads access token
2. Build sync: `lib/integrations/google-ads-sync.ts`
3. Route: `app/api/v1/integrations/sync/google-ads`
4. Display in dashboard (no more mock numbers)

---

### 3.2 Real Meta Ads Data (1 day)
**Owner:** Chi-CTO
**What:** Replace mock Meta metrics with real campaigns

---

### 3.3 Production Verification Checklist (0.5 day)
- [ ] Build passes: `npm run build`
- [ ] Tests pass: `npm test`
- [ ] Deployment succeeds on Vercel
- [ ] All 12 cartridge endpoints respond (not 404)
- [ ] Gmail sync working (real emails visible)
- [ ] Slack sync working (real messages visible)
- [ ] Multi-org roles tested in Chrome
- [ ] No console errors on production
- [ ] All mock data removed

---

## Timeline

| Week | Task | Days | Owner |
|------|------|------|-------|
| **This Week** | Port Cartridge Backend | 3 | Chi-CTO |
| **This Week** | E2E Test Multi-Org Roles | 1 | Chi-CTO |
| **This Week** | Real Gmail Sync | 2 | Chi-CTO |
| **This Week** | Real Slack Sync | 2 | Chi-CTO |
| **Next Week** | Real Google Ads | 1 | Chi-CTO |
| **Next Week** | Real Meta Ads | 1 | Chi-CTO |
| **Next Week** | Final Verification | 0.5 | Chi-CTO |

**Total:** ~10.5 days of work
**Result:** 100% production-ready, zero mock data, all integrations real

---

## Critical Files to Modify

### AudienceOS (copy FROM RevOS)
- `supabase/migrations/007_cartridge_system.sql` ← RevOS `003_cartridge_system.sql`
- `supabase/migrations/008_client_cartridges.sql` ← RevOS `037_client_cartridges.sql`
- `app/api/v1/cartridges/` directory (all 12 endpoints)
- `lib/cartridges/` directory (utilities)

### New Files to Create
- `app/api/oauth/gmail/callback/route.ts`
- `app/api/oauth/slack/callback/route.ts`
- `app/api/v1/integrations/sync/gmail/route.ts`
- `app/api/v1/integrations/sync/slack/route.ts`
- `app/api/v1/integrations/sync/google-ads/route.ts`
- `app/api/v1/integrations/sync/meta/route.ts`
- `lib/integrations/gmail-sync.ts`
- `lib/integrations/slack-sync.ts`
- `supabase/migrations/009_integration_credentials.sql`

---

## Success Criteria

✅ **Tier 1 Complete:**
- Training Cartridges backend working (all 53 tests pass)
- Multi-org roles tested end-to-end
- "Actually works" claim is truthful (not just "looks good")

✅ **Tier 2 Complete:**
- Real Gmail data visible in Communications Hub
- Real Slack data visible in Communications Hub
- Zero mock email data left

✅ **Production Ready:**
- No console errors on production
- All endpoints respond (zero 404s)
- All data is real (no placeholders)
- Ready for first customer demo

---

## Notes

**Why This Approach?**
- RevOS already has working code → copy, adapt, verify
- Faster than rewriting from scratch
- Proven patterns = lower risk
- AudienceOS stays on v1/cartridges path (consistent with other APIs)

**Why The Order?**
1. Cartridges first (blocks "training system works" claim)
2. Real data second (blocks "production ready" claim)
3. Polish last (nice-to-have)

**Risk Mitigation:**
- Each step has explicit verification (tests + Chrome)
- Database migrations are reversible
- Copy-paste approach reduces custom code
- All changes go through Git + Vercel for safety

---

*Ready for Chi-CTO orchestration*
