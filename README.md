# AudienceOS Command Center

> Multi-tenant SaaS for marketing agencies - centralized client lifecycle, communications, ad performance, and AI workflows.

## Quick Start

```bash
git clone https://github.com/growthpigs/audienceos-command-center.git
cd audienceos-command-center
npm install
cp .env.example .env.local
# Fill in Supabase URL and anon key
npm run dev
```

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **UI:** React 19, Tailwind CSS v4, shadcn/ui
- **Database:** Supabase (Postgres + Auth + RLS)
- **State:** Zustand
- **Charts:** Recharts

## Documentation

- [CLAUDE.md](./CLAUDE.md) - Project context and structure
- [docs/](./docs/) - Product specs, technical docs, design system
- [features/](./features/) - Feature specifications

## Development

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build with TypeScript check
npm run test     # Vitest (when tests exist)
```

## Status

**Phase:** E (Testing) - 8 features built, integration in progress

| Feature | Status |
|---------|--------|
| Client Pipeline | ✅ Complete |
| Communications Hub | ✅ Complete |
| Dashboard Overview | ✅ Complete |
| Integrations | ✅ Complete |
| Support Tickets | ✅ Complete |
| Knowledge Base | ✅ Complete |
| Automations | ✅ Complete |
| Settings | ✅ Complete |

---

*Built with [Claude Code](https://claude.ai/claude-code)*
