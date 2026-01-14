# Chi-CTO: Integrations Implementation Plan

> **Generated:** 2026-01-10
> **Mode:** Overnight Autonomous Implementation
> **Estimated DU:** 13 DU total

---

## Executive Summary

The integrations backend is **90% complete**. The API routes for all 4 integrations (Slack, Gmail, Google Ads, Meta Ads) are fully implemented with:
- OAuth URL generation
- OAuth callback with token exchange
- Token encryption (SEC-002)
- Token revocation on disconnect (SEC-005)
- RBAC middleware + multi-tenant isolation (SEC-007)
- Rate limiting + CSRF protection
- Connection testing
- Sync triggers (placeholder)

**The gap is UI wiring and env configuration.**

---

## Pre-Implementation Checklist

Before running workers, verify:

1. **Vercel Environment Variables** (check via Vercel dashboard or CLI)
   ```
   SLACK_CLIENT_ID
   SLACK_CLIENT_SECRET
   GOOGLE_CLIENT_ID
   GOOGLE_CLIENT_SECRET
   GOOGLE_ADS_CLIENT_ID
   GOOGLE_ADS_CLIENT_SECRET
   META_APP_ID
   META_APP_SECRET
   OAUTH_STATE_SECRET (for HMAC signing)
   TOKEN_ENCRYPTION_KEY (for token encryption)
   ```

2. **OAuth App Configurations**
   - Slack: Redirect URI = `https://audienceos-agro-bros.vercel.app/api/v1/oauth/callback`
   - Google Cloud Console: Same redirect URI for Gmail + Google Ads
   - Meta Developer Console: Same redirect URI

---

## Worker Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CHI-CTO ORCHESTRATOR                          │
├─────────────────────────────────────────────────────────────────────┤
│  Worker 1: UI Wiring (2 DU)                                         │
│  Worker 2: Settings Modal Component (4 DU)                          │
│  Worker 3: Connect/Disconnect UI (2 DU)                             │
│  Worker 4: Integration Testing (2 DU)                               │
│  Worker 5: Documentation & Cleanup (1 DU)                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Worker 1: UI Data Wiring (2 DU)

**File:** `components/views/integrations-hub.tsx`

### Tasks

1. **Replace mock data with hook**
   ```tsx
   // BEFORE (mock data)
   const mockIntegrations: Integration[] = [...]

   // AFTER (real data)
   import { useIntegrations } from '@/hooks/use-integrations'

   export function IntegrationsHub() {
     const { integrations, isLoading, refetch } = useIntegrations()
     // ...
   }
   ```

2. **Map database schema to UI types**
   ```tsx
   // Transform DB integration to UI format
   function mapIntegrationToUI(dbIntegration: DatabaseIntegration): Integration {
     return {
       id: dbIntegration.id,
       name: getProviderName(dbIntegration.provider),
       description: getProviderDescription(dbIntegration.provider),
       icon: integrationIcons[dbIntegration.provider],
       color: getProviderColor(dbIntegration.provider),
       category: getProviderCategory(dbIntegration.provider),
       status: mapStatus(dbIntegration),
       lastSync: dbIntegration.last_sync_at ? formatTimeAgo(dbIntegration.last_sync_at) : undefined,
       accounts: dbIntegration.config?.accounts || undefined,
     }
   }
   ```

3. **Show loading state**
   ```tsx
   if (isLoading) {
     return <IntegrationsHubSkeleton />
   }
   ```

4. **Merge available integrations with connected**
   - Show all 8 integrations (4 MVP + 4 future)
   - Mark connected ones based on DB data
   - Keep disconnected ones as placeholders

### Acceptance Criteria
- [ ] Page fetches from `/api/v1/integrations` on load
- [ ] Loading skeleton shown during fetch
- [ ] Connected integrations show real status
- [ ] Disconnected integrations show "Not connected"

---

## Worker 2: Settings Modal Component (4 DU)

**New File:** `components/linear/integration-settings-modal.tsx`

### Tasks

1. **Create modal component**
   ```tsx
   interface IntegrationSettingsModalProps {
     integration: Integration
     isOpen: boolean
     onClose: () => void
     onDisconnect: () => Promise<void>
     onSync: () => Promise<void>
     onTest: () => Promise<void>
   }
   ```

2. **Modal sections**
   - **Header**: Icon + Name + Status badge
   - **Connection Info**: Connected since, last sync, accounts count
   - **Actions**:
     - "Test Connection" button → POST `/api/v1/integrations/[id]/test`
     - "Sync Now" button → POST `/api/v1/integrations/[id]/sync`
     - "Disconnect" button (red, with confirmation) → DELETE `/api/v1/integrations/[id]`
   - **Activity Log**: Recent sync events (from config.lastManualSync)

3. **Wire to card click**
   ```tsx
   // In integrations-hub.tsx
   const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)

   <IntegrationCardComponent
     integration={integration}
     onClick={() => setSelectedIntegration(integration)}
   />

   <IntegrationSettingsModal
     integration={selectedIntegration}
     isOpen={!!selectedIntegration}
     onClose={() => setSelectedIntegration(null)}
     // ...
   />
   ```

4. **API integration**
   ```tsx
   async function handleTest() {
     setTesting(true)
     const res = await fetch(`/api/v1/integrations/${integration.id}/test`, {
       method: 'POST',
       credentials: 'include',
     })
     const { data } = await res.json()
     setTestResult(data)
     setTesting(false)
   }
   ```

### Acceptance Criteria
- [ ] Modal opens on card click
- [ ] Test Connection shows health status
- [ ] Sync Now triggers sync and updates last_sync_at
- [ ] Disconnect removes integration (with confirmation)
- [ ] Modal closes properly

---

## Worker 3: Connect Button UI (2 DU)

**Files:**
- `components/views/integrations-hub.tsx`
- `components/linear/integration-card.tsx`

### Tasks

1. **Add Connect button to disconnected cards**
   ```tsx
   {integration.status === 'disconnected' && (
     <Button
       variant="outline"
       size="sm"
       onClick={(e) => {
         e.stopPropagation()
         handleConnect(integration.id)
       }}
     >
       Connect
     </Button>
   )}
   ```

2. **Implement handleConnect**
   ```tsx
   async function handleConnect(provider: IntegrationProvider) {
     // Create integration record and get OAuth URL
     const res = await fetch('/api/v1/integrations', {
       method: 'POST',
       credentials: 'include',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ provider }),
     })

     const { data } = await res.json()

     if (data.oauthUrl) {
       // Redirect to OAuth provider
       window.location.href = data.oauthUrl
     }
   }
   ```

3. **Handle OAuth callback success/error**
   ```tsx
   // In integrations-hub.tsx
   useEffect(() => {
     const params = new URLSearchParams(window.location.search)
     const success = params.get('success')
     const error = params.get('error')

     if (success) {
       toast.success(`${success} connected successfully!`)
       refetch()
       // Clear URL params
       window.history.replaceState({}, '', window.location.pathname)
     }

     if (error) {
       toast.error(`Connection failed: ${error}`)
       window.history.replaceState({}, '', window.location.pathname)
     }
   }, [])
   ```

4. **Add reconnect button in modal** for error state integrations

### Acceptance Criteria
- [ ] Disconnected cards show "Connect" button
- [ ] Connect redirects to OAuth provider
- [ ] OAuth callback shows success/error toast
- [ ] Error state integrations can reconnect

---

## Worker 4: Integration Testing (2 DU)

### Tasks

1. **Manual E2E testing on Vercel**
   - Navigate to https://audienceos-agro-bros.vercel.app/?view=integrations
   - Verify data loads from API
   - Click on a connected integration → modal opens
   - Click on disconnected integration → Connect button works

2. **Test OAuth flow** (if env vars configured)
   - Click Connect on Slack → redirects to Slack OAuth
   - Complete OAuth → redirects back with success
   - Integration shows as Connected

3. **Test actions**
   - Test Connection → shows healthy/unhealthy
   - Sync Now → updates last_sync_at
   - Disconnect → removes integration (confirm dialog)

4. **Fix any issues found**

### Acceptance Criteria
- [ ] All 4 connected integrations load correctly
- [ ] Modal opens and shows correct data
- [ ] At least 1 OAuth flow tested end-to-end (if env vars ready)
- [ ] Actions work without errors

---

## Worker 5: Documentation & Cleanup (1 DU)

### Tasks

1. **Update feature spec status**
   - Mark completed tasks in `features/integrations-management.md`
   - Update completion percentage

2. **Update RUNBOOK.md**
   - Add integration-specific env vars section
   - Document OAuth app configuration requirements

3. **Update CLAUDE.md**
   - Add integrations to Feature Completion Matrix

4. **Cleanup**
   - Remove mock data arrays
   - Remove TODO comments that are done
   - Ensure consistent code style

### Acceptance Criteria
- [ ] Feature spec updated with completion status
- [ ] RUNBOOK has env var documentation
- [ ] No leftover mock data in production code

---

## Parallel Execution Strategy

```
Phase 1 (Parallel):
├── Worker 1: UI Wiring
├── Worker 2: Settings Modal
└── Worker 3: Connect Button

Phase 2 (Sequential - requires Phase 1):
├── Worker 4: Testing (depends on UI being complete)
└── Worker 5: Documentation (depends on testing)
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Env vars not set | Document fallback (show warning in UI) |
| OAuth apps not configured | Test with one provider first (Slack is easiest) |
| Token encryption not working | Fallback to plaintext (log warning) |
| Real sync not implemented | Placeholder is acceptable for MVP |

---

## Success Metrics

- [ ] Integrations page loads real data from API
- [ ] At least 1 integration can be connected via OAuth
- [ ] Connected integrations can be tested/synced/disconnected
- [ ] No console errors on production

---

## Post-Implementation

After Chi-CTO completes:
1. Verify on production: https://audienceos-agro-bros.vercel.app/?view=integrations
2. Test one full OAuth flow (recommend: Slack)
3. Update Master Dashboard Work Log with DUs
4. Commit to main with message: `feat(integrations): wire UI to backend APIs`

---

*Generated by Chi for overnight autonomous implementation*
