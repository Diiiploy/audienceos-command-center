# Developer Onboarding (Trevor Original)

> Source: Trevor's Project Documents > Markdown Version > Developer Onboarding
> Copied: 2026-01-01

## Developer Onboarding

### Prerequisites
- Node.js 18+, pnpm or npm
- Docker (for local Supabase)
- Git
- Access to: Vercel, Supabase, Google Cloud, OAuth apps

### Required Accounts & Secrets
- Vercel team access
- Supabase admin
- Google Cloud service account
- OAuth client IDs for Slack, Google, Meta
- LLM provider API key
- KMS keys for token encryption

### Local Dev Setup
1. Clone repo
2. Copy .env.example → .env.local
3. docker compose up (local Supabase + Postgres)
4. pnpm install && pnpm dev
5. Run background workers

### Code Conventions
- TypeScript fullstack
- React + Next.js (App Router)
- Tailwind CSS
- Conventional Commits

### Testing
- pnpm test (Jest + React Testing Library)
- CI runs unit tests, lint, build, e2e smoke

### Adding New Integration
1. Create OAuth app in provider console
2. Add INTEGRATION_TYPE in migrations
3. Implement connector in services/integrations/
4. Add UI card in Integrations page
