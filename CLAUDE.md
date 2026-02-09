# AudienceOS Command Center

**What:** Multi-tenant client management platform with AI chat, integrations hub, and marketing automation.
**Stack:** Next.js 15 + Supabase + Gemini 3 + Mem0
**Status:** MVP 95% Frontend, 60% Full-Stack

---

## Quick Context

- Multi-tenant SaaS - agencies manage multiple clients
- HGC = Holy Grail Chat = floating AI assistant (context gaps, see audit)
- Training Cartridges: Backend fixed 2026-01-15

---

## Key Files

| Need | Location |
|------|----------|
| Feature status | `features/INDEX.md` |
| Product requirements | `docs/01-product/PRD.md` |
| Data model | `docs/04-technical/DATA-MODEL.md` |
| API contracts | `docs/04-technical/API-CONTRACTS.md` |
| Feature plans | `docs/05-planning/[feature]/PLAN.md` |
| HGC audit | `docs/HOLY_GRAIL_CHAT_AUDIT.md` |
| Session handover | `HANDOVER.md` |

---

## Commands

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm test           # Run tests
```

---

## Project IDs

- **Production:** https://v0-audience-os-command-center.vercel.app/
- **GitHub:** Diiiploy/audienceos-command-center
- **Supabase:** qzkirjjrcblkqvhvalue
- **Vercel:** chase-6917s-projects/v0-audience-os-command-center

---

## Critical Rules

1. **Gemini 3 only** - No 2.x or 1.x
2. **RLS on all data** - Every table has `agency_id`
3. **Credentials in fetch** - `{ credentials: 'include' }`
4. **pb-28 on pages** - Bottom padding for chat overlay
5. **Runtime verification** - `npm run build` + browser test

---

## Architecture

```
app/
├── api/v1/           # API routes (integrations, chat, clients)
├── (dashboard)/      # Main app pages
└── auth/             # Auth flows

components/
├── chat/             # HGC floating assistant
├── views/            # Page-level components
└── ui/               # shadcn/ui components

lib/
├── chat/             # Gemini service
├── supabase/         # DB client + queries
└── integrations/     # OAuth + gateway clients
```

---

## Known Gaps

1. **HGC Context:** Chat doesn't receive page/client context (critical)
2. **Memory Persistence:** Mem0 retrieval works, storage never called
3. **LinkedIn Integration:** Backend code exists, not in UI
4. **Training Cartridges:** Fixed - see commits 4029fc1→f9b4c7c
5. **RBAC UI Gap:** Database supports 4-tier roles but UI only shows Admin/User - see `features/multi-org-roles.md` Testing Findings (2026-01-18)

---

## Living Documents

Update existing docs, never create dated orphan files:
- `PRD.md` - Features
- `DATA-MODEL.md` - Schema
- `API-CONTRACTS.md` - Endpoints
- `features/INDEX.md` - Status
