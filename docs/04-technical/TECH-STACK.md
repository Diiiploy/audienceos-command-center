# AudienceOS Command Center - Tech Stack MVP

> Generated: 2025-12-31 via TechSnack Pro Prompts
> Status: Approved

---

## Executive Summary

Multi-tenant SaaS for marketing agencies. Next.js 15 frontend with Supabase backend, AI-powered by Claude API + Gemini File Search for RAG.

**Key Decisions:**
- Keep v0 prototype structure, enhance with real backend
- RevOS multi-tenant RLS pattern for tenant isolation
- War Room components: Toast, Progressive Reveal Chat (no Glass CSS - using Linear)
- MCP shortcut for Meta/Google Ads while awaiting OAuth approval
- Vercel deployment with Supabase Postgres

---

## Stack Overview

### Frontend

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Framework | Next.js 15 (App Router) | v0 baseline, Vercel optimized |
| UI Library | React 19 | Latest features, concurrent rendering |
| Components | shadcn/ui (Radix primitives) | v0 baseline, accessible |
| Styling | Tailwind CSS + Linear Design System | Minimal B2B SaaS aesthetic |
| State (Client) | Zustand | Lightweight, persisted |
| State (Server) | TanStack Query v5 | Caching, optimistic updates |
| Forms | React Hook Form + Zod | Type-safe validation |
| Charts | Recharts | v0 baseline |
| Drag-Drop | dnd-kit | Kanban pipeline |
| Icons | Lucide React | v0 baseline |
| Testing | Vitest + Testing Library | Fast, React-focused |

### Backend

| Component | Choice | Rationale |
|-----------|--------|-----------|
| API | Next.js Route Handlers | Colocated, serverless |
| Database | Supabase Postgres | RevOS pattern, RLS |
| Auth | Supabase Auth | Multi-tenant, OAuth providers |
| Realtime | Supabase Realtime | Live comms updates |
| Storage | Supabase Storage | Knowledge Base documents |
| Background Jobs | Vercel Cron + Edge Functions | Hourly sync jobs |
| Secrets | Vercel Env + Supabase Vault | Token encryption |

### AI Layer

| Component | Choice | Rationale |
|-----------|--------|-----------|
| LLM | Claude API (claude-sonnet-4-20250514) | Drafts, chat, risk detection |
| RAG | Gemini File Search | War Room proven, vector search |
| Embeddings | Gemini | Consistent with File Search |
| Memory | Conversation history in DB | Session persistence |

### Integrations

| Integration | Method | Notes |
|-------------|--------|-------|
| Slack | OAuth + Events API | Non-negotiable MVP |
| Gmail | Google OAuth + Gmail API | Non-negotiable MVP |
| Google Ads | chi-gateway MCP (MVP) → OAuth (v2) | Shortcut for launch |
| Meta Ads | chi-gateway MCP (MVP) → OAuth (v2) | Shortcut for launch |

### Infrastructure

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Hosting | Vercel | v0 already deployed |
| Database | Supabase (managed Postgres) | RevOS pattern |
| Monitoring | Sentry | Error tracking |
| CI/CD | GitHub Actions + Vercel | Auto-deploy on push |
| DNS | Vercel | Managed |

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        VERCEL                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Next.js 15 App Router                   │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │    │
│  │  │  Pages   │  │   API    │  │   Cron Jobs      │   │    │
│  │  │ (React)  │  │ Routes   │  │ (hourly sync)    │   │    │
│  │  └──────────┘  └──────────┘  └──────────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────────┐
│   SUPABASE   │    │   CLAUDE     │    │  GEMINI FILE     │
│  - Postgres  │    │   API        │    │  SEARCH          │
│  - Auth      │    │  - Drafts    │    │  - RAG indexing  │
│  - Realtime  │    │  - Chat      │    │  - Vector search │
│  - Storage   │    │  - Risks     │    │                  │
│  - RLS       │    │              │    │                  │
└──────────────┘    └──────────────┘    └──────────────────┘
        │
        ├─── Slack API (OAuth + Events)
        ├─── Gmail API (OAuth + Push)
        ├─── Google Ads API (MCP → OAuth)
        └─── Meta Marketing API (MCP → OAuth)
```

---

## Multi-Tenant Architecture

Following RevOS RLS pattern:

```
Agency (tenant)
├── Users (agency staff)
├── Clients (agency's customers)
│   ├── Communications (synced Slack/Gmail)
│   ├── Tasks
│   ├── Tickets
│   ├── Ads Metrics
│   └── Stage Events
├── Documents (Knowledge Base)
├── Integrations (OAuth credentials)
├── Workflows (automations)
└── Alerts (AI-generated)
```

**RLS Policy Pattern:**
```sql
CREATE POLICY "tenant_isolation" ON clients
  FOR ALL
  USING (agency_id = auth.jwt() ->> 'agency_id');
```

---

## Capability Matrix

| Capability | Required | Implementation |
|------------|----------|----------------|
| Multi-tenant RLS | ✅ | Supabase RLS policies |
| OAuth Integrations | ✅ | Slack, Gmail, Google Ads, Meta |
| Real-time Updates | ✅ | Supabase Realtime subscriptions |
| Background Jobs | ✅ | Vercel Cron (hourly sync) |
| File Storage | ✅ | Supabase Storage |
| RAG/Vector Search | ✅ | Gemini File Search |
| LLM Layer | ✅ | Claude API |
| Offline Support | ❌ | Web-first, not needed |
| Payments | ❌ | Out of MVP scope |
| Mobile App | ❌ | Out of MVP scope |

---

## Multi-Org Roles & Permissions System (RBAC)

**Added:** 2026-01-08 | **Status:** D-1 SpecKit Complete

### Security Architecture

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Permission Middleware** | Custom withPermission() wrapper | API endpoint protection |
| **Role-Based Access** | Custom permission service | 8 resources × 3 actions matrix |
| **Client Scoping** | Custom enforceClientAccess() | Member-only client restrictions |
| **Audit Trail** | PostgreSQL + JSONB | Complete permission attempt logging |
| **Cache Layer** | In-memory + Redis (future) | 5-minute permission cache |

### Database Extensions

| Table | Purpose | Key Features |
|-------|---------|--------------|
| **role** | Role definitions | 4 built-in roles, hierarchy levels |
| **permission** | Permission matrix | 96 permissions (8×3×4) |
| **user_role** | User role assignments | Agency-scoped, audit trail |
| **member_client_access** | Client assignments | Member-only client restrictions |
| **audit_log** | Security logging | All permission attempts + changes |

### Authentication Flow

```
1. User login → Supabase Auth JWT
2. JWT includes: user_id, agency_id, role_id
3. API middleware: withPermission() validates requests
4. Permission service: checks role + resource + action
5. Client scoping: validates Member client access
6. Audit log: records all attempts (allow/deny)
7. Response: 200 (success) or 403 (denied)
```

### Permission Patterns

| Pattern | Use Case | Implementation |
|---------|----------|----------------|
| **withPermission()** | Standard API protection | `{ resource: 'clients', action: 'read' }` |
| **withOwnerOnly()** | Owner-exclusive endpoints | Hard-coded Owner check |
| **withAnyPermission()** | Multiple permission options | OR logic for permission array |
| **Client-scoped** | Member client validation | Auto-extract client ID from URL |

### Role Hierarchy

```
Owner (Level 1)
├── All permissions granted
├── Cannot be deleted/modified
├── Billing access exclusive
└── Role management control

Admin (Level 2)
├── All permissions except billing
├── User management capabilities
├── Client assignment control
└── Audit log access

Manager (Level 3)
├── Client management (RWD)
├── Read-only workflows/integrations
├── Team oversight capabilities
└── No user role changes

Member (Level 4)
├── Assigned clients only (RW)
├── Read-only assigned client documents
├── No admin capabilities
└── Profile self-service only
```

### Performance Optimizations

| Optimization | Implementation | Impact |
|--------------|----------------|--------|
| **Permission Cache** | 5-minute TTL, 1000 entries | <50ms permission checks |
| **Role Level Cache** | Cached in user table | Fast hierarchy validation |
| **Batch Checks** | Multiple permissions per request | Reduced API calls |
| **Client Preload** | Member assignments cached | Fast client filtering |

### Security Features

| Feature | Implementation | Security Benefit |
|---------|----------------|------------------|
| **Dual-layer** | Middleware + RLS policies | Defense in depth |
| **Owner Protection** | Database triggers + middleware | Prevent privilege escalation |
| **Audit Logging** | All access attempts logged | Compliance + forensics |
| **JWT Validation** | Supabase Auth integration | Secure authentication |
| **Rate Limiting** | Per-endpoint limits | DoS protection |

### Integration Points

| Integration | Purpose | Notes |
|-------------|---------|-------|
| **Supabase Auth** | JWT claims extension | Add role_id to JWT |
| **Linear UI** | Permission-aware components | Hide/show based on role |
| **API Middleware** | Blanket protection | All 34 endpoints protected |
| **RLS Policies** | Database-level backup | Automatic agency isolation |

---

## Import from Existing Projects

### From War Room

| Asset | Path | Purpose |
|-------|------|---------|
| Toast System | `hooks/use-toast.ts`, `components/ui/toast.tsx` | Notifications |
| Progressive Reveal | `components/IntelligentChat.tsx` | AI chat typewriter effect |
| Gemini RAG | `services/geminiFileSearchService.ts` | File Search integration |

**Note:** Glass CSS no longer imported - using Linear Design System instead (see `docs/03-design/DESIGN-BRIEF.md`).

### From RevOS

| Asset | Path | Purpose |
|-------|------|---------|
| RLS Policies | `supabase/migrations/009_add_rls_policies_all_tables.sql` | Tenant isolation |
| Admin Check | `lib/auth/admin-check.ts` | Role verification |
| Supabase Server | `lib/supabase/server.ts` | Server client pattern |
| Session Manager | `lib/session-manager.ts` | Conversation persistence |
| Middleware | `middleware.ts` | Cookie handling |

---

## MVP Milestones

| Phase | Deliverable | Dependencies |
|-------|-------------|--------------|
| **M1: Foundation** | Supabase setup, Auth, RLS, basic CRUD | None |
| **M2: Pipeline** | Kanban with dnd-kit, client detail drawer | M1 |
| **M3: Comms** | Slack OAuth, Gmail OAuth, unified inbox | M1 |
| **M4: AI Layer** | Chat widget, RAG setup, risk detection | M1, M3 |
| **M5: Polish** | Linear design system, toast, loading states | M1-M4 |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| OAuth approval delays | High | MCP shortcut for individual accounts |
| Supabase Realtime limits | Medium | Batch updates, polling fallback |
| Gemini File Search latency | Medium | Async indexing, cache frequent queries |
| Token refresh failures | High | Retry logic, alert on 3+ failures |
| RLS complexity | Medium | Comprehensive test suite |

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# AI
ANTHROPIC_API_KEY=
GOOGLE_AI_API_KEY=
GEMINI_FILE_SEARCH_KEY=

# Integrations
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Monitoring
SENTRY_DSN=
```

---

*Generated via TechSnack Pro Prompts - Living Document*
