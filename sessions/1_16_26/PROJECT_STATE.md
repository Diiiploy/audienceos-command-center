# Project State – AudienceOS Command Center

## Current Status
- Database: ✅ MIGRATED & VERIFIED (35 tables, all migrations applied)
- Frontend-DB Connection: ✅ VERIFIED (health check: UP, 733ms latency)
- TypeScript Types: ✅ REGENERATED (matches all 35 tables)
- Google OAuth Backend: ✅ TESTED & WORKING
- Google OAuth Frontend: NOT STARTED (Roderick's task)
- Local Dev: `.env.local` configured with correct Supabase credentials

## What Is Canonical
1. Supabase Project: `command_center` (ID: `qzkirjjrcblkqvhvalue`)
2. Main Branch: All work now on `main` (feature branches merged)
3. CLAUDE.md: Local-only file (not tracked by git)

## What Is Deprecated
- Old Supabase project `audienceos-cc-fresh` (qzkirjjrcblkqvhvalue) - DO NOT USE
- References to `trevor/oauth-signup` branch (merged)
- Any documentation with old Google OAuth credentials

## High-Level Architecture (Current)
- Frontend: Next.js 16 + React 19 + Tailwind v4 + shadcn/ui (Linear design system)
- Backend: Supabase (Postgres + Auth + Storage + Realtime)
- Auth: Supabase Auth with email/password + Google OAuth (tested & working)
- Infra: Vercel deployment at `audienceos-agro-bros.vercel.app`
- Data: 35 tables in public schema with RLS enabled

## Supabase Project Details
| Property | Value |
|----------|-------|
| Project Name | `command_center` |
| Project ID | `qzkirjjrcblkqvhvalue` |
| Region | `us-east-2` |
| URL | `https://qzkirjjrcblkqvhvalue.supabase.co` |
| Dashboard | https://supabase.com/dashboard/project/qzkirjjrcblkqvhvalue |
| OAuth Callback | `https://qzkirjjrcblkqvhvalue.supabase.co/auth/v1/callback` |

## Database State (Verified 2026-01-17)
| Metric | Count |
|--------|-------|
| Tables | 35 |
| Agencies | 1 |
| Users | 6 |
| Clients | 3 |
| System Roles | 4 (Owner, Admin, Manager, Member) |
| Health Check | UP (733ms latency) |

## Active Milestones
- [x] Apply database migrations to new Supabase project
- [x] Apply cartridge + onboarding migrations (6 additional migrations)
- [x] Verify frontend-database connection
- [x] Regenerate TypeScript types from Supabase
- [x] Configure Google OAuth provider in Supabase
- [x] Create auth callback route (`app/auth/callback/route.ts`)
- [x] Test OAuth flow end-to-end (user created in auth.users)
- [x] Add `/api/health` to PUBLIC_ROUTES for monitoring
- [ ] Update Vercel environment variables for new Supabase project
- [ ] Frontend: Add "Sign in with Google" button (Roderick)
- [ ] Frontend: Create signup page (Roderick)
- [ ] Remove `/test-oauth` page after login integration
