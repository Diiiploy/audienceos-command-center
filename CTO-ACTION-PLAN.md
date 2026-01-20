# CTO Action Plan: AudienceOS Production Hardening

**Date:** 2026-01-20
**Current State:** 65-70% Production Ready
**Target State:** 90-95% Production Ready
**Estimated Effort:** ~72 hours

---

## Executive Summary

This plan synthesizes findings from multiple AI audits and the integration status fix work. The repo is now clean (coverage/test artifacts removed, git hygiene restored), integration status displays correctly, and we have a clear path to production.

### What's Already Fixed ✅
1. **Integration Status Display** - Now reads from Supabase `is_connected` (commit 9e87678)
2. **Git Hygiene** - Coverage files, test artifacts removed (commit 714e56f)
3. **Documentation** - 46 files reorganized to 10-folder structure (commit 666693f)
4. **Vercel Deployment** - Working via CLI (webhook issue after repo transfer)

### What Needs Fixing 🔴
| Priority | Category | Issues | Risk |
|----------|----------|--------|------|
| P0 | Security | Empty env fallbacks, no rate limits | Critical |
| P0 | Logging | 100+ console statements exposing data | High |
| P1 | Features | 9 TODO blockers, features non-functional | Medium |
| P2 | Reliability | Token refresh, error boundaries | Medium |

---

## Sprint 1: Security Hardening (Week 1)

### 1.1 Fix Environment Variable Fallbacks (4h)

**Problem:** Critical secrets fall back to empty strings, disabling security features.

**Files to Fix:**
```
lib/crypto.ts (lines 13-14)
app/api/v1/oauth/callback/route.ts
lib/supabase.ts (lines 14-15)
```

**Action:**
```typescript
// Create lib/env.ts with Zod validation
import { z } from 'zod'

const envSchema = z.object({
  OAUTH_STATE_SECRET: z.string().min(32),
  TOKEN_ENCRYPTION_KEY: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
})

export const env = envSchema.parse(process.env)
```

**Test:** Build fails if any required var is missing.

---

### 1.2 Add Rate Limiting to Critical Routes (4h)

**Problem:** Chat, sync, and SEO endpoints can be abused for cost/resource exhaustion.

**Routes Needing Protection:**
| Route | Limit | Reason |
|-------|-------|--------|
| `/api/v1/chat` | 20/min | Gemini API costs |
| `/api/v1/integrations/[id]/sync` | 5/hour | External API quotas |
| `/api/v1/seo/enrich` | 10/hour | $0.02/call |
| `/api/v1/oauth/callback` | 5/hour | Token enumeration |
| `/api/public/*` | 10/min | Unauthenticated scraping |

**Action:** Create `lib/rate-limit.ts` using Upstash Redis or in-memory store:
```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

export const chatLimiter = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(20, '1 m'),
})
```

**Test:** Hit endpoints 21+ times, verify 429 response.

---

### 1.3 Create Structured Logger (4h)

**Problem:** 100+ console statements log sensitive data (user IDs, tokens, emails).

**Action:**
1. Create `lib/logger.ts` with Pino
2. Add ESLint rule `no-console` for `/app/api/` and `/lib/`
3. Replace all console statements in critical paths

```typescript
// lib/logger.ts
import pino from 'pino'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: ['userId', 'email', 'accessToken', 'refreshToken'],
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
})
```

**Critical Files (18 HIGH risk):**
- `lib/crypto.ts`
- `app/api/v1/integrations/*/callback/route.ts`
- `lib/email/*.ts`
- `lib/rbac/*.ts`

**Test:** `grep -r "console\." app/api lib/ | wc -l` should be 0.

---

## Sprint 2: Feature Blockers (Week 2)

### 2.1 Implement UI Pickers (16h)

**Problem:** 5 TODO comments block core client management features.

| Picker | File | Line | Action |
|--------|------|------|--------|
| Owner | `client-detail-panel.tsx` | 154 | Create `OwnerPickerModal` component |
| File | `client-detail-panel.tsx` | 279 | Create `FilePickerModal` with upload |
| Label | `client-detail-panel.tsx` | 284 | Create `LabelPickerModal` component |
| Date | `client-detail-panel.tsx` | 289 | Wire existing `DatePickerModal` |
| Calendar | `date-picker-modal.tsx` | 135 | Implement calendar UI |

**FSD Structure:**
```
components/
├── modals/
│   ├── owner-picker-modal.tsx     # NEW
│   ├── file-picker-modal.tsx      # NEW
│   ├── label-picker-modal.tsx     # NEW
│   └── date-picker-modal.tsx      # UPDATE
└── linear/
    └── client-detail-panel.tsx    # WIRE pickers
```

**Test:** E2E - Click each picker button, verify modal opens and saves.

---

### 2.2 Connect Stage Transition API (8h)

**Problem:** Onboarding stage transitions don't persist (line 621, active-onboardings.tsx).

**Files:**
- `components/onboarding/active-onboardings.tsx` (line 621)
- `app/api/v1/onboarding/[id]/transition/route.ts` (create if missing)

**Action:**
```typescript
// In active-onboardings.tsx
const handleStageTransition = async (onboardingId: string, newStage: string) => {
  const response = await fetch(`/api/v1/onboarding/${onboardingId}/transition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ stage: newStage }),
  })
  if (!response.ok) throw new Error('Transition failed')
  // Refresh data
}
```

**Test:** Move onboarding to new stage, refresh page, verify stage persisted.

---

### 2.3 Implement Reply Sending (8h)

**Problem:** Reply compose works but doesn't actually send (line 77, reply/route.ts).

**Files:**
- `app/api/v1/communications/[id]/reply/route.ts`
- `lib/integrations/gmail-service.ts`
- `lib/integrations/slack-service.ts`

**Action:** Complete the platform routing:
```typescript
// In reply/route.ts
switch (platform) {
  case 'gmail':
    await gmailService.sendReply(threadId, content, credentials)
    break
  case 'slack':
    await slackService.sendMessage(channelId, content, credentials)
    break
  default:
    return NextResponse.json({ error: 'Unknown platform' }, { status: 400 })
}
```

**Test:** Send reply from Communications Hub, verify appears in external platform.

---

## Sprint 3: Reliability (Weeks 3-4)

### 3.1 Implement Token Refresh (8h)

**Problem:** OAuth tokens expire after 1h but refresh never called.

**Files:**
- `lib/integrations/oauth-utils.ts` (create)
- `lib/integrations/gmail-service.ts`
- `app/api/v1/integrations/[id]/sync/route.ts`

**Action:**
```typescript
// lib/integrations/oauth-utils.ts
export async function getValidToken(userId: string, provider: string) {
  const credential = await getCredential(userId, provider)

  if (isExpired(credential.expires_at)) {
    const newTokens = await refreshToken(provider, credential.refresh_token)
    await updateCredential(userId, provider, newTokens)
    return newTokens.access_token
  }

  return credential.access_token
}
```

**Test:** Set token expiry to past, call sync, verify token refreshed.

---

### 3.2 Add Error Boundaries (8h)

**Problem:** No React error boundaries; errors crash entire pages.

**Files:**
- `components/error-boundary.tsx` (create)
- `app/(dashboard)/layout.tsx` (wrap sections)

**Action:**
```tsx
// components/error-boundary.tsx
'use client'
import { Component, ReactNode } from 'react'

export class ErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    logger.error('Error boundary caught', { error: error.message })
  }

  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}
```

**Test:** Throw error in component, verify fallback renders (not white screen).

---

### 3.3 Connect Escalation/Snooze Workflows (8h)

**Problem:** Dashboard escalation and snooze don't persist (lines 875, 884).

**Files:**
- `components/dashboard-view.tsx`
- `app/api/v1/dashboard/escalate/route.ts` (create)
- `app/api/v1/dashboard/snooze/route.ts` (create)

**Action:** Create API endpoints and wire to existing UI buttons.

---

## Sprint 4: Polish (Month 2)

| Task | Hours | Priority |
|------|-------|----------|
| Replace remaining console statements | 4h | P2 |
| Implement Meta Ads sync | 8h | P2 |
| Add health check endpoint | 2h | P2 |
| Load testing (chat, sync) | 4h | P2 |
| Security audit (OWASP) | 8h | P2 |

---

## Quick Wins (< 2h each)

| Task | File | Effort |
|------|------|--------|
| Remove `|| ''` fallbacks | `lib/crypto.ts` | 30min |
| Add `no-console` ESLint rule | `.eslintrc.js` | 15min |
| Create health check endpoint | `app/api/health/route.ts` | 1h |
| Fix unused router reference | `app/signup/page.tsx:25` | 15min |
| Wire include_runs param | `app/api/v1/workflows/route.ts:37` | 30min |

---

## Definition of Done (90% Production Ready)

- [ ] Zero `console.log` in `/app/api/` and `/lib/`
- [ ] Rate limits on chat, sync, SEO, OAuth endpoints
- [ ] All env vars validated at startup (no empty fallbacks)
- [ ] Health check endpoint validates all services
- [ ] Error boundaries around Dashboard, Pipeline, Comms, Settings
- [ ] Token refresh working for Gmail and Slack
- [ ] All 9 TODO blockers resolved
- [ ] Build passes with no warnings
- [ ] E2E tests pass for core flows

---

## Deployment Strategy

1. **Test in Preview** - Push to branch, verify in Vercel Preview
2. **CLI Deploy** - Use `npx vercel --prod` (webhooks still broken)
3. **Verify Production** - Hit health check, test core flows
4. **Monitor** - Watch Vercel logs for first 24h

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Token refresh breaks OAuth | Test in dev with short expiry |
| Rate limits too aggressive | Start high, tune down |
| Logger breaks existing code | Feature flag logging initially |
| Picker modals break UI | Ship behind feature flag |

---

*Created: 2026-01-20 | CTO Session | Synthesizing findings from 4 parallel AI audits*
