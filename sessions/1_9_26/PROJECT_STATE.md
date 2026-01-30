# Project State – AudienceOS Command Center

## Current Status
- Database: MIGRATED to new `command_center` project
- Google OAuth Backend: ✅ TESTED & WORKING
- Google OAuth Frontend: NOT STARTED (Roderick's task)
- Feature Branch: `trevor/oauth-backend` pushed to origin (ready to merge)
- OAuth Test Page: `/test-oauth` exists (temporary - remove after login integration)
- Local Dev: `.env.local` configured with new Supabase credentials

## What Is Canonical
1. Supabase Project: `command_center` (ID: `qzkirjjrcblkqvhvalue`)
2. Feature Branch: `trevor/oauth-backend` for OAuth work
3. CLAUDE.md: Local-only file (not tracked by git)

## What Is Deprecated
- Old Supabase project `audienceos-cc-fresh` (qzkirjjrcblkqvhvalue) - DO NOT USE
- References to `trevor/oauth-signup` branch (renamed to `trevor/oauth-backend`)
- Any documentation with old Google OAuth credentials

## High-Level Architecture (Current)
- Frontend: Next.js 16 + React 19 + Tailwind v4 + shadcn/ui (Linear design system)
- Backend: Supabase (Postgres + Auth + Storage + Realtime)
- Auth: Supabase Auth with email/password + Google OAuth (tested & working)
- Infra: Vercel deployment at `audienceos-agro-bros.vercel.app`
- Data: 24 tables in public schema with RLS enabled

## Supabase Project Details
| Property | Value |
|----------|-------|
| Project Name | `command_center` |
| Project ID | `qzkirjjrcblkqvhvalue` |
| Region | `us-east-2` |
| URL | `https://qzkirjjrcblkqvhvalue.supabase.co` |
| Dashboard | https://supabase.com/dashboard/project/qzkirjjrcblkqvhvalue |
| OAuth Callback | `https://qzkirjjrcblkqvhvalue.supabase.co/auth/v1/callback` |

## Active Milestones
- [x] Apply database migrations to new Supabase project
- [x] Configure Google OAuth provider in Supabase
- [x] Create auth callback route (`app/auth/callback/route.ts`)
- [x] Create OAuth test page (`app/test-oauth/page.tsx`)
- [x] Test OAuth flow end-to-end (user created in auth.users)
- [x] Fix Google OAuth credentials (wrong Client ID initially)
- [ ] Update Vercel environment variables for new Supabase project
- [ ] Merge `trevor/oauth-backend` to main
- [ ] Frontend: Add "Sign in with Google" button (Roderick)
- [ ] Frontend: Create signup page (Roderick)
- [ ] Remove `/test-oauth` page after login integration
