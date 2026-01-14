# 3-System Consolidation Execution Manifest

**Created:** 2026-01-03
**Status:** ✅ COMPLETE (9/10)
**Estimated Duration:** 18-22 hours
**Project:** AudienceOS Command Center (Linear rebuild)

---

## Overview

Consolidate three systems into a unified AudienceOS Command Center:
1. **AudienceOS** (Chase's Intelligence Center UI)
2. **Holy Grail Chat** (AI backend - smart router, RAG, function calling)
3. **RevOS Cartridges** (5-tab AI configuration - Voice, Style, Preferences, Instructions, Brand)

---

## Systems Being Consolidated

### Source 1: AudienceOS (This Project)
- **Location:** `/Users/rodericandrews/_PAI/projects/command_center_audience_OS/`
- **Branch:** `main`
- **Status:** Running on `localhost:3000`
- **Key Components:**
  - `components/linear/sidebar.tsx` - Main nav
  - `components/views/intelligence-center.tsx` - AI section
  - `components/linear/settings-sidebar.tsx` - Intelligence Center sub-nav

### Source 2: Holy Grail Chat (HGC)
- **Location:** `/holy-grail-chat/`
- **What to Port:**
  - Smart Router (5 categories: RAG, Web, Memory, Dashboard, Casual)
  - Gemini File Search integration
  - Function calling (6 functions implemented)
  - Chat service architecture

### Source 3: RevOS Cartridges
- **Location:** `/revos/app/dashboard/cartridges/`
- **What to Port:**
  - 5-tab system: Voice, Style, Preferences, Instructions, Brand
  - Cartridge edit forms (~640 lines)
  - 112-point Benson Blueprint generator
  - ~1700 lines total page code

---

## CC Assignments

| CC | Document | Scope | Status | Dependencies | Est. |
|----|----------|-------|--------|--------------|------|
| CC1 | 01-CC1-nav-restructure.md | Fix nav structure + naming | ✅ Complete (9/10) | None | 2 hrs |
| CC2 | 02-CC2-cartridges-port.md | Port RevOS cartridges | ✅ Complete (9/10) | CC1 | 8 hrs |
| CC3 | 03-CC3-hgc-integration.md | Integrate HGC backend | ✅ Complete (9/10) | CC1 | 4 hrs |
| CC4 | 04-CC4-testing-polish.md | Test + polish | ✅ Complete (9/10) | CC2, CC3 | 4 hrs |
| CC5 | 05-CC5-rls-validation.md | Validate RLS policies | ✅ Complete (9/10) | CC2 schema | 2 hrs |

**Status Legend:**
- ⬜ Pending
- 🔵 In Progress
- ✅ Complete
- ❌ Blocked

---

## Dependency Graph

```
CC1 (Nav Restructure)
  │
  ├──────────────────┐
  ▼                  ▼
CC2 (Cartridges)   CC3 (HGC Backend)
  │                  │
  └────────┬─────────┘
           ▼
       CC4 (Testing)
```

---

## Nav Changes (User Requested)

### Main Sidebar (`sidebar.tsx`)
Current → New:
- Keep Settings at bottom ✓ (already there)
- No changes to main nav items

### Intelligence Center Sub-Nav (`settings-sidebar.tsx`)
Current → New:
- "Capabilities" → **"Cartridges"**
- "Chat History" → **"Activity"**
- "Knowledge Sources" → **"Knowledge Base"** (consolidate with main Knowledge Base)
- Add: **"Settings"** section for AI configuration

### Proposed Intelligence Center Structure
```
AI Assistant
├── Overview (dashboard)
├── Chat (main chat interface)
├── Activity (was "Chat History")
├── Cartridges (was "Capabilities")
│   ├── Voice
│   ├── Style
│   ├── Preferences
│   ├── Instructions
│   └── Brand
└── Settings
    ├── API Keys
    └── Knowledge Sources (moved here)
```

---

## Execution Order

| Wave | CCs | Can Run Parallel? | Prerequisite |
|------|-----|-------------------|--------------|
| 1 | CC1 | No | None |
| 2 | CC2 + CC3 | Yes | CC1 complete |
| 3 | CC4 | No | CC2 + CC3 merged |

---

## Branch Strategy

```bash
# CC1 creates:
feat/nav-restructure

# CC2 branches from CC1:
feat/cartridges-port

# CC3 branches from CC1:
feat/hgc-integration

# CC4 merges CC2+CC3:
feat/consolidation-testing

# Final merge to linear-rebuild
```

---

## Key Files

### To Modify
| File | Change | CC |
|------|--------|-----|
| `components/linear/settings-sidebar.tsx` | Update intelligenceSettingsGroups | CC1 |
| `components/views/intelligence-center.tsx` | New section structure | CC1 |
| `components/linear/sidebar.tsx` | Minor tweaks if needed | CC1 |

### To Create
| File | Purpose | CC |
|------|---------|-----|
| `components/cartridges/` | Cartridge components | CC2 |
| `components/cartridges/voice-form.tsx` | Voice cartridge form | CC2 |
| `components/cartridges/style-form.tsx` | Style cartridge form | CC2 |
| `components/cartridges/brand-form.tsx` | Brand + Benson Blueprint | CC2 |
| `lib/chat/` | HGC chat service | CC3 |
| `lib/chat/router.ts` | Smart router | CC3 |
| `lib/chat/functions/` | Function executors | CC3 |

### To Port From
| Source | Target | CC |
|--------|--------|-----|
| `revos/app/dashboard/cartridges/page.tsx` | `components/cartridges/` | CC2 |
| `revos/components/cartridges/cartridge-edit-form.tsx` | `components/cartridges/forms/` | CC2 |
| `holy-grail-chat/src/lib/chat/` | `lib/chat/` | CC3 |
| `holy-grail-chat/src/lib/functions/` | `lib/chat/functions/` | CC3 |

---

## Progress Log

| Time | CC | Action | Result |
|------|-----|--------|--------|
| 2026-01-03 14:00 | CC1 | Nav restructure complete | ✅ 8 sections render, build passes, 9/10 confidence |
| 2026-01-03 15:30 | CC2 | Cartridges port complete | ✅ 5 tabs working, 12 files, 2066 insertions, 9/10 |
| 2026-01-03 16:00 | CC3 | HGC integration complete | ✅ TypeScript fixed, Gemini 2.0 wired, build passes, 9/10 |
| 2026-01-03 | CC2+CC3 | Merged to feat/hgc-integration | ✅ Commits: 24f4ee5, 62effdd |
| 2026-01-03 17:30 | CC4 | Testing + Polish complete | ✅ TypeScript clean, ESLint fixed (6→0 errors), build passes, 9/10 |
| 2026-01-03 18:00 | - | Merged linear-rebuild → main | ✅ Commit: e6b812f |
| 2026-01-03 18:30 | - | Schema applied to RevOS Supabase | ✅ 5 tables created (verified via browser) |
| 2026-01-03 19:00 | - | Validator found build issues | ⚠️ Merge debris in use-dashboard.ts, infrastructure/ not excluded |
| 2026-01-03 19:30 | - | Fixed build issues | ✅ Commit: 918c9ac, build passes |
| 2026-01-03 20:00 | CC5 | RLS validation started | 🔵 Need to test with real user |
| 2026-01-03 20:30 | CC5 | RLS validation complete | ✅ Helper funcs ✓, User links ✓, 20 policies ✓, Test insert ✓, 9/10 |

---

## Recovery Instructions

If session is lost mid-execution:
1. Read this manifest
2. Check CC status column above
3. Resume from first incomplete CC
4. Each CC document has full context
5. Check git branches for partial work

---

## Exit Criteria

- [ ] All CCs marked ✅ Complete
- [ ] Nav structure matches proposed design
- [ ] Cartridges visible under Intelligence Center
- [ ] Chat interface working with HGC backend
- [ ] 5 cartridge tabs functional (Voice, Style, Preferences, Instructions, Brand)
- [ ] Activity tab showing chat history
- [ ] All tests passing
- [ ] Deployed to staging

---

## Notes

- RevOS cartridges use same shadcn/ui components - should port cleanly
- HGC already has Gemini integration working
- 112-point Benson Blueprint is valuable - must port intact
- Keep Linear design aesthetic (minimal B2B)

---

*Generated by Execution Manifest Protocol v1.0*
*Last Updated: 2026-01-03*
