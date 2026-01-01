# AudienceOS Command Center - Roadmap Breakdown

> **Source:** [Google Sheets](https://docs.google.com/spreadsheets/d/1620VWQlOxtdn1CGEcDHZi4utcRM3Uu6-uOiHr_cuJyA/edit)
> **Last Synced:** 2026-01-01

---

## Summary

### Contract Overview

| Field | Value |
|-------|-------|
| Client | Chase (Marketing Agency) |
| Provider | Badaboost LLC |
| Duration | January - March 2025 (Traditional: 22 wks, AI: ~8 wks) |
| Total Investment | $16,275 |
| Payment Schedule | 30/25/25/20% milestones |

### DU Economics

| Metric | Value | Notes |
|--------|-------|-------|
| DU Rate | $100/DU | 1 DU = 1 hour equivalent senior effort |
| Paid DUs | 163 | $16,275 ÷ $100 |
| Estimated DUs | 134 | From SOW breakdown |
| Buffer | 29 DUs (22%) | Contingency for scope changes |

### Session Economics (Post-2023 AI Development)

| Metric | Value | Notes |
|--------|-------|-------|
| 1 Session | 2-4 hours | Focused AI work |
| DUs per Session | 3.5 DU | AI-accelerated output |
| Sessions per Week | 5 | Sustainable pace |
| Total Sessions | 38 | 134 DU ÷ 3.5 |
| AI Speedup | ~3x | vs traditional development |

### Hat Breakdown

| Hat | DUs | Rate | Value |
|-----|-----|------|-------|
| STRATEGY | 7 | $175 | $1,225 |
| DESIGN | 20 | $150 | $3,000 |
| ARCHITECTURE | 27 | $150 | $4,050 |
| ENGINEERING | 74 | $100 | $7,400 |
| QUALITY | 6 | $100 | $600 |
| **TOTAL** | **134** | | **$16,275** |

### Phase Breakdown (Dual Timeline)

| Phase | Focus | DUs | Trad. Weeks | AI Sessions | AI Calendar | Payment |
|-------|-------|-----|-------------|-------------|-------------|---------|
| Phase 1-3 | Foundation + Pipeline + Dashboard (MVP) | 35 | Week 1-6 | 10 sessions | ~2 weeks | $4,069 (25%) |
| Phase 4-6 | Comms + Integrations + AI (Core) | 69 | Week 7-14 | 20 sessions | ~4 weeks | $4,069 (25%) |
| Phase 7-10 | KB + Tickets + Automations + Settings | 40 | Week 15-22 | 11 sessions | ~2 weeks | $3,255 (20%) |
| Kickoff | Project start | - | Week 0 | - | - | $4,883 (30%) |
| **TOTAL** | | **134** | **22 weeks** | **~40 sessions** | **~8 weeks** | **$16,275** |

### Compute Costs (Based on Sessions)

| Phase | Sessions | Est. API Cost | Notes |
|-------|----------|---------------|-------|
| Phase 1-3 | 10 | $40-60 | ~$4-6/session |
| Phase 4-6 | 20 | $80-120 | ~$4-6/session |
| Phase 7-10 | 11 | $44-66 | ~$4-6/session |
| **TOTAL** | **40** | **$165-245** | See Expenses tab |

---

## Phase 1-3: MVP

**Traditional:** Weeks 1-6 | **AI Reality:** ~10 sessions (~2 weeks)
**Payment:** $4,069 (25%) due at completion

| Phase | Feature | Tasks | DUs | Trad. | AI Sessions | AI Cal | Status |
|-------|---------|-------|-----|-------|-------------|--------|--------|
| Phase 1 | Foundation - DB, Auth, API | 14 | 10 | Wk 1-2 | 3 sessions | ~3 days | Not Started |
| Phase 2 | Pipeline - Kanban, Client Drawer | 20 | 12 | Wk 3-4 | 3 sessions | ~3 days | Not Started |
| Phase 3 | Dashboard - KPIs, Charts | 22 | 13 | Wk 5-6 | 4 sessions | ~4 days | Not Started |
| **TOTAL** | | **56** | **35** | **6 weeks** | **10 sessions** | **~2 weeks** | |

**COMPUTE:** 10 sessions × $5 = ~$50 API cost

### Detailed Tasks

| Task | Hat | DUs | Sessions | Status |
|------|-----|-----|----------|--------|
| Supabase schema + RLS | ARCH | 3 | 1 | Done |
| Auth flow with agency_id | ARCH | 2 | 0.5 | Not Started |
| API client setup | ENG | 2 | 0.5 | Not Started |
| Kanban board (dnd-kit) | ENG | 4 | 1 | Not Started |
| Client drawer component | DESIGN | 3 | 1 | Not Started |
| Dashboard KPIs | ENG | 3 | 1 | Not Started |
| Recharts integration | ENG | 2 | 0.5 | Not Started |
| Linear design system | DESIGN | 4 | 1 | In Progress |

---

## Phase 4-6: Core

**Traditional:** Weeks 7-14 | **AI Reality:** ~20 sessions (~4 weeks)
**Payment:** $4,069 (25%) due at completion

| Phase | Feature | Tasks | DUs | Trad. | AI Sessions | AI Cal | Status |
|-------|---------|-------|-----|-------|-------------|--------|--------|
| Phase 4 | Communications - Slack/Gmail, Timeline | 24 | 17 | Wk 7-8 | 5 sessions | ~1 week | Not Started |
| Phase 5 | Integrations - OAuth, Tokens | 26 | 17 | Wk 9-10 | 5 sessions | ~1 week | Not Started |
| Phase 6 | AI Intelligence - Chi Chat, Risk | 48 | 35 | Wk 11-14 | 10 sessions | ~2 weeks | Not Started |
| **TOTAL** | | **98** | **69** | **8 weeks** | **20 sessions** | **~4 weeks** | |

**COMPUTE:** 20 sessions × $5 = ~$100 API cost

### Key Risks

| Risk | Mitigation |
|------|------------|
| OAuth complexity | Use chi-gateway MCP as fallback |
| Gemini indexing | Retry mechanism, manual re-index |
| AI response quality | Prompt engineering, user feedback loop |

---

## Phase 7-10: Complete

**Traditional:** Weeks 15-22 | **AI Reality:** ~11 sessions (~2 weeks)
**Payment:** $3,255 (20%) due at completion

| Phase | Feature | Tasks | DUs | Trad. | AI Sessions | AI Cal | Status |
|-------|---------|-------|-----|-------|-------------|--------|--------|
| Phase 7 | Knowledge Base - Upload, Search, RAG | 16 | 9 | Wk 15-16 | 2.5 sessions | ~3 days | Not Started |
| Phase 8 | Support Tickets - Kanban, AI assist | 18 | 10 | Wk 17-18 | 3 sessions | ~3 days | Not Started |
| Phase 9 | Automations - IF/THEN builder | 20 | 14 | Wk 19-20 | 4 sessions | ~4 days | Not Started |
| Phase 10 | Settings - Agency, Users, Prefs | 12 | 7 | Wk 21-22 | 2 sessions | ~2 days | Not Started |
| **TOTAL** | | **66** | **40** | **8 weeks** | **11 sessions** | **~2 weeks** | |

**COMPUTE:** 11 sessions × $5 = ~$55 API cost

### Final Delivery Checklist

- [ ] All 9 features functional
- [ ] Multi-tenant RLS verified
- [ ] Performance benchmarks met

---

## Session Log

| Session | Date | Tasks | DUs | Hat Breakdown | Duration | Notes |
|---------|------|-------|-----|---------------|----------|-------|
| 1 | 2025-01-01 | Infrastructure setup, CI/CD, DevOps | 3 | ARCH:2 ENG:1 | ~2hrs | Commit a78ba01 |
| 2 | 2025-01-01 | Roadmap Breakdown, expense system | 0.5 | STRATEGY:0.5 | ~1hr | This spreadsheet |

### Running Totals

| Metric | Value |
|--------|-------|
| Sessions completed | 2 |
| Total DUs | 3.5 / 134 (-2.60%) |
| Estimated sessions remaining | 43-47 (at 3 DU/session) |

### AI Progress vs Traditional

Traditional: Week 1 of 22 (4.5%)

---

## Expenses

### Compute Costs (Session-Based Calculation)

| Phase | DUs | Sessions | Est. API Cost | Notes |
|-------|-----|----------|---------------|-------|
| Phase 1-3 (MVP) | 35 | 10 | $50 | Foundation, Pipeline, Dashboard |
| Phase 4-6 (Core) | 69 | 20 | $100 | Comms, Integrations, AI |
| Phase 7-10 (Complete) | 40 | 11 | $55 | KB, Tickets, Automations, Settings |
| **TOTAL** | **134** | **40** | **$205** | ~$5/session average |

### Other Estimated Costs

| Item | Est. Amount | Duration | Total | Billed | Notes |
|------|-------------|----------|-------|--------|-------|
| Supabase Pro | $25/mo | 3 months | $75 | Yes | Database - qwlhdeiigwnbmqcydpvu |
| Vercel Pro | $20/mo | 3 months | $60 | Yes | Frontend hosting (if needed) |
| Sentry | $26/mo | 3 months | $78 | No | Error monitoring |
| Domain | $15 | 1 year | $15 | Yes | If project-specific |
| Image Credits | $50 | - | $50 | Yes | DALL-E for UI mockups |

### Total Estimated Expenses

| Category | Amount |
|----------|--------|
| Claude Code API | $205 |
| Infrastructure | $228 |
| **TOTAL** | **$433** |

### Actual Costs (Log as incurred)

| Date | Item | Amount | Currency | Billed | Notes |
|------|------|--------|----------|--------|-------|
| 2025-01-01 | Supabase Pro | $25 | USD | Yes | Database created |

---

*This file mirrors the Google Sheets version. Update both when changes occur.*
