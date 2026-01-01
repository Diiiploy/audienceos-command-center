# AudienceOS Command Center

> **Multi-tenant SaaS for marketing agencies** | Next.js 15 + React 19 + Supabase

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
| Framework | Next.js 15 (App Router) |
| UI | React 19, Tailwind, shadcn/ui (Linear design system) |
| Charts | Recharts |
| State | Zustand |
| Backend | Supabase (Postgres + Auth + Storage + Realtime) |
| AI | Claude API + Gemini File Search (RAG) |

---

## Living Documents

| Document | Path | Purpose |
|----------|------|---------|
| PRD | `docs/01-product/PRD.md` | Product requirements |
| MVP-PRD | `docs/01-product/MVP-PRD.md` | MVP scope and priorities |
| Data Model | `docs/04-technical/DATA-MODEL.md` | 19 tables with RLS |
| API Contracts | `docs/04-technical/API-CONTRACTS.md` | REST API spec |
| Feature Specs | `features/INDEX.md` | 9 MVP features (323 tasks) |

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

features/               # 9 specs, 206 tasks total
├── INDEX.md                        # Feature status tracker
├── client-pipeline-management.md   # 20 tasks
├── unified-communications-hub.md   # 24 tasks
├── ai-intelligence-layer.md        # 48 tasks (Chi Intelligent Chat)
├── dashboard-overview.md           # 22 tasks
├── integrations-management.md      # 26 tasks
├── support-tickets.md              # 18 tasks
├── knowledge-base.md               # 16 tasks
├── automations.md                  # 20 tasks
└── settings.md                     # 12 tasks
```

---

## Commands

```bash
npm install          # Install deps
npm run dev          # Dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
```

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

## Rules for This Project

1. **Living docs only** - Update existing docs, don't create orphan files
2. **Multi-tenant** - All data scoped by agency_id with RLS
3. **Linear design** - Minimal B2B aesthetic (not glassmorphism)
4. **Feature specs** → `features/[feature-name].md`

---

*Updated: 2025-12-31*
