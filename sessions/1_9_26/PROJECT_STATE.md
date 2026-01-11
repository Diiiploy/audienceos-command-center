# Project State – AudienceOS Command Center

## Current Status
- Database: MIGRATED to new `command_center` project
- Google OAuth Backend: ✅ TESTED & WORKING (provider enabled, callback route created, credentials fixed)
- Google OAuth Frontend: NOT STARTED (Roderick's task)
- Feature Branch: `trevor/oauth-backend` pushed to origin
- OAuth Test Page: Created at `/test-oauth` (temporary)

## What Is Canonical
1. Supabase Project: `command_center` (ID: `qzkirjjrcblkqvhvalue`)
2. Feature Branch: `trevor/oauth-backend` for OAuth work
3. Plan File: `~/.claude/plans/polymorphic-churning-rocket.md`

## What Is Deprecated
- Old Supabase project `audienceos-cc-fresh` (ebxshdqfaqupnvpghodi) - referenced in some docs but NOT the active project
- References to `trevor/oauth-signup` branch in RUNBOOK (branch name changed to `trevor/oauth-backend`)

## High-Level Architecture (Current)
- Frontend: Next.js 16 + React 19 + Tailwind v4 + shadcn/ui (Linear design system)
- Backend: Supabase (Postgres + Auth + Storage + Realtime)
- Auth: Supabase Auth with email/password + Google OAuth (newly configured)
- Infra: Vercel deployment at `audienceos-agro-bros.vercel.app`
- Data: 24 tables in public schema with RLS enabled

## Supabase Project Details
| Property | Value |
|----------|-------|
| Project Name | `command_center` |
| Project ID | `qzkirjjrcblkqvhvalue` |
| Region | `us-east-2` |
| URL | `https://qzkirjjrcblkqvhvalue.supabase.co` |
| OAuth Callback | `https://qzkirjjrcblkqvhvalue.supabase.co/auth/v1/callback` |

## Active Milestones
- [x] Apply database migrations to new Supabase project
- [x] Configure Google OAuth provider in Supabase
- [x] Create auth callback route (`app/auth/callback/route.ts`)
- [ ] Test OAuth flow with test page
- [ ] Merge `trevor/oauth-backend` to main
- [ ] Frontend: Add "Sign in with Google" button (Roderick)
- [ ] Frontend: Create signup page (Roderick)
