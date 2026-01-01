# Intake Materials Index

> **Project:** AudienceOS Command Center
> **Client:** Chase (marketing agency owner)
> **Imported:** 2025-12-31

---

## Source Documents

| Document | Description | Original Name |
|----------|-------------|---------------|
| [CHASE-ORIGINAL-PRD.md](CHASE-ORIGINAL-PRD.md) | Product Requirements - full v1 spec | Product Requirements Doc.md |
| [CHASE-ORIGINAL-FSD.md](CHASE-ORIGINAL-FSD.md) | Functional Specs - detailed behaviors | Functional Requirements Doc.md |

---

## Key Decisions from Client

### Architecture
- **Original:** "Single-tenant per agency" with isolated Supabase projects
- **Updated:** Multi-tenant with RLS isolation (same outcome, better implementation)

### Naming
- **Original:** "Diiiploy Command Center"
- **Updated:** "AudienceOS Command Center"

### Design
- **Original:** Not specified
- **Updated:** Linear design system (minimal B2B SaaS aesthetic)

---

## Roadmap from Original PRD

### MVP (What we're building first)
- Dashboard
- Pipeline (Kanban)
- Client List
- Basic AI assistant (DB + RAG search)
- Slack + Gmail OAuth
- Meta + Google Ads OAuth
- Intelligence Center v0 (sync status only)

### v1 (Full release)
- Full Intelligence Center
- Support Tickets
- Knowledge Base
- Automations
- AI insights, drafting, risk detection
- KPI graphs
- Performance tab
- Media tab w/ transcripts

### v2 (Future)
- Zoom integration
- More automations
- Multi-org roles
- External Webhook triggers
- More ad platforms
- Full agency-facing reporting suite

---

---

## Trevor's Original Documents (15 files)

From Trevor's previous development work:

| File | Description |
|------|-------------|
| TREVOR-EXECUTIVE-SUMMARY.md | Project overview |
| TREVOR-CLAUDE-MD.md | Original CLAUDE.md |
| TREVOR-PRD.md | Product Requirements |
| TREVOR-FRD.md | Functional Requirements |
| TREVOR-IMPLEMENTATION-PLAN-1.md | Implementation Part 1 |
| TREVOR-IMPLEMENTATION-PLAN-2.md | Implementation Part 2 |
| TREVOR-ERD-SCHEMA.md | Database schema |
| TREVOR-API-DESIGN-SPEC.md | API endpoints |
| TREVOR-USER-STORY-BACKLOG.md | User stories |
| TREVOR-TECHNICAL-ARCHITECTURE.md | Architecture diagram |
| TREVOR-DEVELOPER-ONBOARDING.md | Dev setup guide |
| TREVOR-DEVOPS-MCP-PLAN.md | DevOps plan |
| TREVOR-API-TESTING.md | Testing & RAG prompts |
| TREVOR-PROJECT-SCAFFOLDING.md | Folder structure |
| TREVOR-MEETING-NOTES-2025-12-17.md | Meeting with Chase |

---

*This folder contains CLIENT-PROVIDED materials. Do not modify originals.*
