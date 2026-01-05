# AudienceOS Command Center

> **Multi-tenant SaaS for marketing agencies** | Next.js 16 + React 19 + Supabase

---

## 🚪 MANDATORY: READ GLOBAL PAI SYSTEM FIRST

**Before doing anything on this project:**

Read `/Users/rodericandrews/.claude/CLAUDE.md` completely.

This file contains:
- The mandatory startup sequence (mem0, chi-gateway MCPs, local docs)
- Tool selection priorities (which tools to use, when)
- The entire PAI infrastructure that makes this system work

**Do not proceed with project work until you understand the global system.**

---

## Project Overview

**AudienceOS Command Center** centralizes client lifecycle management, communications (Slack/Gmail), ad performance (Google Ads/Meta), support tickets, and AI-assisted workflows for marketing agencies.

**Architecture:** Multi-tenant with RLS isolation per agency
**Design System:** Linear (minimal B2B SaaS aesthetic)
**First Customer:** Chase's agency (alpha)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.0.10 (App Router, Turbopack) |
| UI | React 19.2, Tailwind v4.1, shadcn/ui (Linear design system) |
| Charts | Recharts 2.15 |
| State | Zustand 5.0 |
| Backend | Supabase 2.89 (Postgres + Auth + Storage + Realtime) |
| ORM | Drizzle ORM 0.45 |
| AI | Gemini 2.0 Flash (@google/generative-ai 0.24) |
| Forms | React Hook Form + Zod validation |
| DnD | @dnd-kit (Kanban boards) |
| Icons | Lucide React |
| Theming | next-themes |
| Toasts | Sonner |
| Markdown | react-markdown |
| Monitoring | Sentry 10.32 |

---

## Living Documents

| Document | Path | Purpose |
|----------|------|---------|
| PRD | `docs/01-product/PRD.md` | Product requirements |
| MVP-PRD | `docs/01-product/MVP-PRD.md` | MVP scope and priorities |
| Data Model | `docs/04-technical/DATA-MODEL.md` | 19 tables with RLS |
| API Contracts | `docs/04-technical/API-CONTRACTS.md` | REST API spec |
| Feature Specs | `features/INDEX.md` | 10 features (9 MVP + dashboard-redesign) |

---

## Docs Structure (10-Folder)

```
docs/
├── 00-intake/         # Chase's original PRD, FSD (source documents)
├── 01-product/        # PRD, MVP-PRD, EXECUTIVE-SUMMARY
├── 02-specs/          # FRD, USER-STORIES (56), UX-FLOWS (9 flows)
├── 03-design/         # DESIGN-BRIEF, DESIGN-SYSTEM (Linear), UX-BRAINSTORM
├── 04-technical/      # DATA-MODEL, API-CONTRACTS, TECH-STACK, ARCHITECTURE
├── 05-planning/       # ROADMAP (206 tasks), RISK-REGISTER (10 risks)
├── 06-reference/      # AUDIT, WAR-ROOM-PATTERNS (extraction research)
├── 07-business/       # SOW (134 DU, $16,275)
├── 08-reports/        # (future: progress reports)
└── 09-delivered/      # (future: handover docs)

features/               # 10 specs
├── INDEX.md                        # Feature status tracker
├── client-pipeline-management.md   # Pipeline + Kanban
├── unified-communications-hub.md   # Email/Slack/Timeline
├── ai-intelligence-layer.md        # Holy Grail Chat (RAG/Memory)
├── dashboard-overview.md           # KPIs + Charts
├── integrations-management.md      # OAuth + Sync
├── support-tickets.md              # Ticket Kanban
├── knowledge-base.md               # Document RAG
├── automations.md                  # Workflow engine
├── settings.md                     # Agency + User management
└── dashboard-redesign.md           # Linear design refresh
```

---

## Commands

```bash
npm install          # Install deps
npm run dev          # Dev server (localhost:3000)
npm run build        # Production build
npm run test         # Run test suite (Vitest)
npm run lint         # ESLint
npm run typecheck    # TypeScript check
```

---

## Directory Guide

| Directory | Purpose | Count |
|-----------|---------|-------|
| `components/` | React components | 137 files |
| `components/ui/` | shadcn/ui primitives | 27 files |
| `components/linear/` | Linear design system | 28 dirs |
| `lib/` | Utilities and services | 40 files |
| `lib/chat/` | Chat service, router, functions | 7 files |
| `lib/rag/` | Document processing, search | 8 files |
| `lib/workflows/` | Automation engine | 7 files |
| `hooks/` | Custom React hooks | 13 files |
| `types/` | TypeScript definitions | 7 files |
| `stores/` | Zustand state stores | 7 files |
| `app/api/` | API routes | 34 endpoints |
| `__tests__/` | Unit tests (Vitest) | 14 files |
| `e2e/` | E2E tests (Playwright) | 3 files |

### Key Stores

| Store | Purpose |
|-------|---------|
| `pipeline-store` | Client pipeline state |
| `communications-store` | Email/Slack threads |
| `dashboard-store` | KPIs and metrics |
| `ticket-store` | Support tickets |
| `knowledge-base-store` | Documents and RAG |
| `automations-store` | Workflow definitions |
| `settings-store` | Agency/user settings |

---

## Technical Docs (04-technical/)

| Document | Purpose |
|----------|---------|
| DATA-MODEL.md | 19 tables with RLS |
| API-CONTRACTS.md | REST API spec (34 endpoints) |
| TECH-STACK.md | Technology decisions |
| ARCHITECTURE.md | System architecture |
| DEPENDENCIES.md | Package management |
| DEVOPS.md | DevOps setup |
| SCAFFOLDING.md | Project setup |
| WAR-ROOM-MIGRATION.md | Migration patterns |

---

## Google Drive Sync

**Root Folder:** `AudienceOS` (ID: `1U2mwpZDgsppzVa1P0goeceC7NHuNl7Nv`)
**Parent:** DIIIPLOY/Internal/
**Link:** [Open in Drive](https://drive.google.com/drive/folders/1U2mwpZDgsppzVa1P0goeceC7NHuNl7Nv)

| Folder | Drive ID | Synced |
|--------|----------|--------|
| 00-intake | 1rSKcNTyNdwN09CAOamkIOlON51Q_RuYf | ✅ |
| 01-product | 1kDy9fK5Y_U06bUo-8V_Sg3eUuic1FpqT | ✅ |
| 02-specs | 1GhogDDKlBwIDoT2GEIiQOBmci6xcYKFK | ✅ |
| 03-design | 1aFe-oLwA5ourDt-NozvXy6oRmue6O0Do | ✅ |
| 04-technical | 1wHpUId5Tw7sYAepLanOqNjzRewu46TGD | ✅ |
| 05-planning | 1brsKCYXZgKZTun8Z-k3qrGl3d_K0Q4RU | ✅ |
| 06-reference | 1xSYG-Q1PdtiurwlG2wRlHsuerTdujIWl | ✅ |
| 07-business | 1KfRAE6H-ZqKPSMidb2ig6_G6Is8nO2p4 | ✅ |
| 08-reports | 1T7Y1VmbzeQ1giemzrBUQQeCdcHJ0bGiA | - |
| 09-delivered | 1Tn2HJVrZTOBRoTY17EcRzFqw_dqrkDSA | - |

**Sync Rule:** After updating any doc, sync to corresponding Drive folder using `docs_create_formatted`.

---

## Intelligence Center

The Intelligence Center (`/intelligence`) is the AI hub of the application, combining chat, cartridges, and knowledge management.

### Sidebar Navigation (CANONICAL - do not duplicate)

**Assistant group:**
- Overview - AI capabilities dashboard
- Chat History - Past conversations with filters (NOT "Chat" - that was removed)
- Activity - AI activity feed

**Configuration group:**
- Training Cartridges - AI personality/behavior config (NOT "Cartridges")
- Custom Prompts - User-defined prompt templates
- AI Training Data - Documents for RAG

### File Structure

```
components/views/intelligence-center.tsx  # Main view with sub-navigation
components/linear/settings-sidebar.tsx    # Sidebar nav config (intelligenceSettingsGroups)
components/chat/
├── chat-interface.tsx                    # Chat UI component
lib/chat/
├── types.ts                              # ChatMessage, RouteType, etc.
├── router.ts                             # Smart query routing (5 categories)
├── service.ts                            # ChatService with Gemini integration
├── functions/                            # Function executors
│   ├── get-clients.ts
│   ├── get-alerts.ts
│   ├── get-stats.ts
│   ├── get-communications.ts
│   └── navigate-to.ts
app/api/chat/route.ts                     # API endpoint
```

### Training Cartridges (AI Configuration)

5-tab system for configuring AI assistant behavior:
- **Voice** - Tone and personality
- **Style** - Writing patterns
- **Preferences** - Response settings
- **Instructions** - Custom rules
- **Brand** - Company info + 112-Point Blueprint (Jon Benson framework)

Location: `components/cartridges/`

### Chat Service Configuration

```typescript
// Required env var
GOOGLE_AI_API_KEY=your-gemini-api-key

// Model used
gemini-2.0-flash-001
```

### Smart Router Categories

| Route | Purpose |
|-------|---------|
| `dashboard` | Function calling (get clients, alerts, stats) |
| `rag` | Document search |
| `web` | External search |
| `memory` | Session context |
| `casual` | General conversation |

---

## Rules for This Project

1. **Living docs only** - Update existing docs, don't create orphan files
2. **Multi-tenant** - All data scoped by agency_id with RLS
3. **Linear design** - Minimal B2B aesthetic (not glassmorphism)
4. **Feature specs** → `features/[feature-name].md`

---

*Updated: 2026-01-04 (Documentation audit: added Directory Guide, expanded Tech Stack, fixed metrics)*
