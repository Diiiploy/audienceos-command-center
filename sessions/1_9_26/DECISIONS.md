# Architectural Decisions – Session 2026-01-09

## 2026-01-09 – New Supabase Project Adopted

**Decision:** Use `command_center` (qzkirjjrcblkqvhvalue) instead of `audienceos-cc-fresh` (qzkirjjrcblkqvhvalue)

**Reason:**
- Fresh project discovered via MCP with no tables
- Clean slate for applying migrations properly
- Avoids potential conflicts with old project state

**Implications:**
- All database operations now target `command_center` project
- Old project references in documentation are outdated
- Environment variables need updating on Vercel to point to new project

---

## 2026-01-09 – Feature Branch for OAuth Work

**Decision:** Create `trevor/oauth-backend` branch instead of working on main

**Reason:**
- Follows git best practices (no direct commits to main)
- Allows code review before merge
- Keeps main stable for Roderick's parallel frontend work

**Implications:**
- OAuth callback route is on feature branch, not main
- Vercel preview deployment only available after merge
- PR required to get changes to production

---

## 2026-01-09 – Two-Callback OAuth Architecture

**Decision:** Use Supabase's native OAuth handling with app callback route

**Reason:**
- Supabase handles OAuth complexity (token exchange, user creation)
- App callback route (`/auth/callback`) just exchanges code for session
- Cleaner separation of concerns

**Implications:**
- Two callback URLs in play:
  1. Supabase: `https://qzkirjjrcblkqvhvalue.supabase.co/auth/v1/callback` (Google → Supabase)
  2. App: `/auth/callback` route (Supabase → App session)
- Google Cloud Console only needs the Supabase callback URL

---

## 2026-01-09 – Backend/Frontend Work Split

**Decision:** Trevor handles backend/auth, Roderick handles frontend

**Reason:**
- Clear ownership and parallel work streams
- Avoids merge conflicts
- Backend can be fully configured before frontend implementation

**Implications:**
- Backend OAuth configuration complete, awaiting frontend
- Test page created for backend verification
- Handoff documentation important for coordination

---

## 2026-01-09 – CLAUDE.md as Local-Only File

**Decision:** Keep CLAUDE.md untracked by git, local to each developer

**Reason:**
- Each developer maintains their own project context
- Prevents overwrites when pulling from remote
- Personal configuration shouldn't be shared

**Implications:**
- Added CLAUDE.md to .gitignore
- Removed from git tracking (commit `ac6d5fe`)
- Each developer responsible for maintaining their own copy

---

## 2026-01-09 – Secrets Not Stored in Documentation

**Decision:** Replace actual OAuth credentials with placeholders in committed docs

**Reason:**
- GitHub secret scanning blocks pushes with credentials
- Security best practice
- Credentials already configured in Supabase Dashboard

**Implications:**
- Documentation references `[See Google Cloud Console]` for credentials
- Actual credentials only in Supabase Dashboard and local .env.local
- .env.local is gitignored
