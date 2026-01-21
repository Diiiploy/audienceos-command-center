# Unified Platform (AudienceOS + RevOS)

**Status:** Phase 1 Complete (UI Shell) | Phase 2 Pending (Real Integration)
**Last Updated:** 2026-01-21
**Branch:** `feature/unified-platform`
**Preview:** https://v0-audience-os-command-center-vithewpoa.vercel.app

---

## Executive Summary

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Complete | App switcher UI, navigation, stub pages |
| Phase 2 | ⏳ Pending | Port real RevOS components and data |
| Phase 3 | ⏳ Pending | HGC adapter for dual AI backends |

**Current Reality:** App switcher works, but RevOS pages are placeholder stubs. Real RevOS functionality requires porting components, schema, and wiring up the backend.

---

## What's Built (Phase 1)

### ✅ App Switcher Component
- Dropdown to switch between AudienceOS and RevOS
- Gradient branding for each app
- Persists selection to localStorage
- SSR-safe with `skipHydration` pattern

### ✅ Conditional Navigation
- Sidebar shows different nav items per app
- Routes are wired and working
- URLs work directly (e.g., `/campaigns`, `/content`)

### ✅ RevOS Stub Pages
| Route | Component | Status |
|-------|-----------|--------|
| `/campaigns` | `CampaignsHub` | Stub (Coming Soon) |
| `/content` | `ContentHub` | Stub (Coming Soon) |
| `/outreach` | `OutreachHub` | Stub (Coming Soon) |
| `/cartridges` | `RevOSCartridgesHub` | Stub (Coming Soon) |
| `/analytics` | `AnalyticsHub` | Stub (Coming Soon) |

---

## What's Needed (Phase 2 - Real RevOS)

### Database Schema Migration

RevOS uses different tables than AudienceOS. Need to port:

| RevOS Table | Purpose | AudienceOS Equivalent |
|-------------|---------|----------------------|
| `campaigns` | Marketing campaigns | None (new) |
| `leads` | Lead tracking | Partial overlap with `clients` |
| `posts` | LinkedIn content | None (new) |
| `voice_cartridge` | AI voice training | Exists in AudienceOS |
| `style_cartridge` | Writing style | Exists in AudienceOS |
| `brand_cartridge` | Brand identity | Exists in AudienceOS |
| `console_workflows` | HGC workflows | Different structure |

**Decision Needed:** Merge schemas or maintain separate tables with shared auth?

### Component Porting

From `/projects/revos/` to unified platform:

| Component | Location | Complexity |
|-----------|----------|------------|
| `CampaignCardView` | `components/dashboard/CampaignCardView.tsx` | Medium |
| `CampaignTableView` | `components/dashboard/CampaignTableView.tsx` | Medium |
| `CampaignWizard` | `components/dashboard/CampaignWizard.tsx` | High |
| `LeadsTable` | `components/dashboard/LeadsTable.tsx` | Medium |
| `PostComposer` | `components/dashboard/PostComposer.tsx` | High |
| `CartridgeTabs` | `components/dashboard/CartridgeTabs.tsx` | Low (already similar) |
| `FloatingChatBar` | `components/FloatingChatBar.tsx` | Medium (HGC integration) |

### API Endpoints

Need to port or create:

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `/api/campaigns` | CRUD campaigns | Port from RevOS |
| `/api/leads` | Lead management | Port from RevOS |
| `/api/posts` | Content management | Port from RevOS |
| `/api/hgc-v2` | HGC chat (RevOS) | Need adapter |

### HGC Adapter (Phase 3)

RevOS uses OpenAI AgentKit, AudienceOS uses Gemini. Need adapter:

```
┌─────────────────────────────────────────┐
│ HGC Adapter                             │
├─────────────────────────────────────────┤
│ if (activeApp === 'audienceos')         │
│   → Use Gemini backend                  │
│ if (activeApp === 'revos')              │
│   → Use AgentKit backend                │
└─────────────────────────────────────────┘
```

---

## Architecture

### App Switcher

```
┌─────────────────────────────────────────┐
│ Sidebar                                 │
├─────────────────────────────────────────┤
│ [AppSwitcher] ← Click to switch apps    │
│   ├── AudienceOS (Client Management)    │
│   └── RevOS (Marketing Automation)      │
├─────────────────────────────────────────┤
│ Navigation (changes per app)            │
└─────────────────────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `stores/app-store.ts` | Zustand store for active app state |
| `components/app-switcher.tsx` | Dropdown UI component |
| `components/linear/sidebar.tsx` | Conditional navigation |
| `components/views/revos/*` | RevOS stub pages |
| `app/[view]/page.tsx` | Route validation (includes RevOS routes) |
| `app/page.tsx` | CommandCenter with RevOS switch cases |

### State Management

```typescript
// stores/app-store.ts
type AppId = 'audienceos' | 'revos'

// Uses Zustand persist with skipHydration
// Derives config directly to avoid hydration issues
const safeActiveApp = activeApp || 'audienceos'
const activeConfig = APP_CONFIGS[safeActiveApp]
```

---

## Navigation Per App

### AudienceOS (Client Management)
- Dashboard
- Pipeline
- Clients
- Onboarding
- Support
- Intelligence
- Knowledge Base
- Automations
- Integrations
- Settings

### RevOS (Marketing Automation)
- Dashboard (stub)
- Campaigns (stub)
- Content (stub)
- Outreach (stub)
- Cartridges (stub)
- Analytics (stub)
- Integrations (shared)
- Settings (shared)

---

## Current State

### 2026-01-21 (Session 2)
- Created 5 RevOS stub pages with proper branding
- Updated routing to include RevOS views
- Fixed gradient text hydration issue (safeActiveApp pattern)
- Commits: `17b958e`, `170d905`
- Preview: `v0-audience-os-command-center-vithewpoa.vercel.app`

### 2026-01-21 (Session 1)
- Created app switcher UI component
- Implemented Zustand store with localStorage persistence
- Fixed SSR hydration mismatch with `skipHydration: true`
- Updated sidebar to show conditional navigation
- Set up 11 environment variables for Preview deployment

---

## Deployment

### Preview (Development)
- **Team:** `rodericandrews-4022s-projects`
- **URL:** Dynamic per deployment
- **Latest:** https://v0-audience-os-command-center-vithewpoa.vercel.app
- **Env vars:** Manually configured (see RUNBOOK.md)

### Production
- **Team:** `chase-6917s-projects` (access issue pending)
- **URL:** `v0-audience-os-command-center-sage.vercel.app`
- **Status:** DO NOT deploy unified platform yet

---

## Known Issues

1. **Google OAuth on Preview** - Preview URLs not registered in Google Cloud Console
2. **Agro Bros Vercel Access** - Lost access to production workspace (support ticket sent)
3. **RevOS is stubs only** - Real functionality requires Phase 2 work

---

## Commits

| Hash | Description |
|------|-------------|
| `170d905` | fix(app-switcher): add defensive handling for hydration state |
| `17b958e` | feat(revos): add RevOS stub pages and route integration |
| `71fdeda` | fix(app-switcher): use Tailwind classes for gradient text |
| `a890082` | fix(hydration): add skipHydration to app-store and rehydrate on client |
| `6e7ade3` | feat(unified): add app switcher for AudienceOS/RevOS navigation |

---

## Estimated Work for Real RevOS

| Task | Complexity | Estimate |
|------|------------|----------|
| Schema migration | High | 2-3 days |
| Port campaigns components | Medium | 1-2 days |
| Port leads components | Medium | 1-2 days |
| Port content/posts components | Medium | 1-2 days |
| Port cartridges (already similar) | Low | 0.5 days |
| Wire up APIs | High | 2-3 days |
| HGC adapter | High | 2-3 days |
| Testing & polish | Medium | 2 days |
| **Total** | | **~12-15 days** |

---

## Related Documents

| Document | Location |
|----------|----------|
| Execution Plan | `docs/05-planning/UNIFIED-EXECUTION-PLAN.md` |
| CTO Decision | `docs/05-planning/CTO-DECISION-2026-01-20.md` |
| HGC Transplant | `features/hgc-transplant.md` |
| RevOS Source | `/Users/rodericandrews/_PAI/projects/revos/` |

---

*Living document - Last updated: 2026-01-21*
