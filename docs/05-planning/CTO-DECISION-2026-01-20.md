# CTO Decision: RevOS + AudienceOS Unified Platform

**Date:** 2026-01-20
**Decision:** APPROVED with modifications
**Confidence:** 8/10

---

## Executive Summary

CC2's unified platform plan is **approved** with one critical modification: **Security hardening must complete before any integration work begins.**

---

## Approved Decisions

| Decision | Value | Rationale |
|----------|-------|-----------|
| Primary Database | AudienceOS (qzkirjjrcblkqvhvalue) | Cleaner schema, RBAC, tests |
| Table Naming | Singular (user, client) | SQL convention, consistency |
| Mem0 Format | 3-part (agencyId::clientId::userId) | Better multi-tenant scoping |
| AI Backend | HGC Monorepo + AgentKit Adapter | Best of both systems |
| App Switcher | Header dropdown (11 Labs pattern) | Clean UX |
| Data Migration | Not needed | No production data |

---

## Critical Modification: Security First

### Why

CC2's plan lists security hardening as "Priority 1" but then jumps to schema migration. This is backwards.

**Current AudienceOS security gaps:**
- `lib/crypto.ts` falls back to `'insecure-fallback-key'` when env vars missing
- 100+ `console.log` statements expose user IDs, tokens, emails
- 27 API routes have no rate limiting
- Token refresh not implemented (OAuth fails after 1h)

**Risk if we proceed without fixing:**
- New LinkedIn OAuth will have same token refresh issue
- New routes will have no rate limiting
- More console statements = more data exposure
- Larger codebase = harder to audit later

### Decision

**Week 1 is security hardening. No exceptions.**

---

## Revised Timeline

### Week 1: AudienceOS Hardening (BLOCKING)

| Day | Work | Deliverable |
|-----|------|-------------|
| 1 | Fix env fallbacks | `lib/env.ts` with Zod validation |
| 2 | Add rate limiting | Rate limits on chat, sync, OAuth routes |
| 3 | Structured logging | `lib/logger.ts` with Pino, ESLint rule |
| 4 | Token refresh | `lib/integrations/oauth-utils.ts` |
| 5 | Feature blockers | UI pickers, stage transition API |

**Exit Criteria:**
- [ ] Build passes with no `|| ''` fallbacks in secrets
- [ ] `grep -r "console\." app/api lib/ | wc -l` < 10
- [ ] All mutation routes have rate limiting
- [ ] Token refresh tested with Gmail OAuth

### Week 2: Integration Foundation

| Day | Work | Deliverable |
|-----|------|-------------|
| 1-2 | Schema migration | RevOS tables in AudienceOS Supabase |
| 3-4 | Port chips + console | 11 chips, workflow executor working |
| 5 | Verification | All ported features have tests |

**Exit Criteria:**
- [ ] All 11 chips imported and callable
- [ ] WorkflowExecutor can load from DB
- [ ] MarketingConsole generates content
- [ ] RLS policies on all new tables

### Week 3: HGC + App Switcher

| Day | Work | Deliverable |
|-----|------|-------------|
| 1-2 | AgentKit adapter | HGC works with both Gemini and AgentKit |
| 3 | App switcher | Header dropdown component |
| 4 | Routes + sidebar | Conditional rendering based on app context |
| 5 | E2E + polish | Full flow tested, bugs fixed |

**Exit Criteria:**
- [ ] Can switch apps in header
- [ ] RevOS routes show RevOS sidebar
- [ ] AudienceOS routes show AudienceOS sidebar
- [ ] Chat works with both backends

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Security hardening delays integration | Medium | Low | Fixed scope for Week 1 |
| AgentKit adapter complexity | Medium | Medium | Spike test on Day 1 of Week 3 |
| Route collisions | Low | Medium | Namespace planning in Week 2 |
| Token refresh breaks existing OAuth | Low | High | Test in dev environment first |

---

## Resource Allocation

| Resource | Week 1 | Week 2 | Week 3 |
|----------|--------|--------|--------|
| AudienceOS CTO | Security lead | Support | App switcher |
| CC2 (Chi CTO) | Support | Integration lead | HGC lead |
| Testing | Unit tests | Integration tests | E2E tests |

---

## Success Metrics

**Week 1 Complete When:**
- Zero `|| ''` fallbacks in `/lib/` secrets
- Rate limiting on all POST/PUT/DELETE routes
- Console statements < 10 in API/lib paths
- Token refresh working for Gmail

**Week 2 Complete When:**
- All 11 chips ported and tested
- Schema migration applied without rollback
- Workflow executor loads from DB

**Week 3 Complete When:**
- App switcher visible in header
- Sidebar changes based on app context
- Both Gemini and AgentKit backends work via HGC
- E2E tests pass for switching flow

---

## Final Estimate

| Phase | Hours | Status |
|-------|-------|--------|
| Week 1: Security | 40h | TODO |
| Week 2: Integration | 40h | TODO |
| Week 3: UI + Polish | 40h | TODO |
| **Total** | **120h** | **~3 weeks** |

CC2's estimate of 7-10 days was for integration only. With security hardening included, **3 weeks is realistic.**

---

## Approval

**Status:** ✅ APPROVED

**Conditions:**
1. Week 1 security hardening is non-negotiable
2. Exit criteria must be met before proceeding to next week
3. Daily standups to track blockers

**Signed:** CTO (Claude Cowork Session)
**Date:** 2026-01-20

---

*This decision supersedes CTO-ACTION-PLAN.md for the integration timeline but keeps its security hardening requirements as Week 1 scope.*
