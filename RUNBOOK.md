# AudienceOS Command Center - RUNBOOK

---

## ⛔ CRITICAL: Gemini 3 ONLY Policy

**THIS PROJECT USES GEMINI 3 EXCLUSIVELY.**

| Allowed | NOT Allowed |
|---------|-------------|
| `gemini-3-flash-preview` | ~~gemini-2.0-flash-001~~ |
| `gemini-3-pro-preview` | ~~gemini-2.0-flash~~ |
| Any `gemini-3-*` model | ~~gemini-1.5-*~~ |
| | ~~gemini-pro~~ |

**Rationale:** Gemini 3 provides superior function calling, reasoning, and consistency for AudienceOS Chat requirements.

**If you see Gemini 2.x or 1.x anywhere:** Stop. Fix it immediately. Do not proceed.

---

## 👥 Current Work Assignments (Updated 2026-01-06)

| Developer | Working On | Branch | Status |
|-----------|------------|--------|--------|
| **Roderic** | Main features, chat alignment, core functionality | `main` | Active |
| **Trevor** | OAuth + Signup implementation | `trevor/oauth-signup` | In Progress |

### Trevor's Current Task
**Task:** Implement user authentication (signup + Google OAuth)
**Brief:** `working/TREVOR_OAUTH_BRIEF.md`
**Estimated:** 10-12 hours
**Deliverables:**
- Signup page at `/signup`
- "Sign in with Google" button on login page
- OAuth callback handler at `/auth/callback`
- Fix non-functional Google SSO toggle in settings

### Coordination
- **Trevor:** Creates PR from `trevor/oauth-signup` → `main` when ready
- **Roderic:** Reviews and merges Trevor's PR
- **Communication:** Slack/Discord for questions and blockers
- **Testing:** Always test on Vercel preview URLs (not localhost)

---

## Quick Start

```bash
git clone https://github.com/growthpigs/audienceos-command-center.git
cd audienceos-command-center
npm install
cp .env.example .env.local
# Fill in environment variables (see below)
npm run dev
```

---

## 🔧 Claude in Chrome: Active Debugging Workflow

**DIRECTIVE:** Use Claude in Chrome every time you can. You have the tools to do it. Make it happen. Make it work. Find the problems. Fix the problems.

**When debugging ANY issue:**

### ✅ DO THIS (Active Investigation)
1. **Open the app in Claude in Chrome**
   - Navigate to https://audienceos-agro-bros.vercel.app
   - Authenticate as test user (E2E Tester)

2. **Reproduce the problem directly**
   - Click through the UI to trigger the issue
   - Watch Network tab for failed requests
   - Check Console for errors and warnings
   - Take screenshots of broken state

3. **Inspect what's actually happening**
   - **Network tab:** See the actual API responses
   - **Console tab:** Read actual error messages (not guesses)
   - **Sources tab:** Pause execution and inspect state
   - **Accessibility tree:** Understand DOM structure

4. **Capture evidence before claiming anything works**
   - "The feature works" → Show network response proving it
   - "The error is fixed" → Show console output proving success
   - "The data loaded" → Show network timing + response body
   - **File existence ≠ functionality. Runtime execution is truth.**

### ❌ DON'T DO THIS (Guessing)
- ❌ "I added the code, so it should work" → Verify it actually runs
- ❌ "The error is probably..." → Check the actual console output
- ❌ "The API returns X" → Inspect Network tab to see what it actually returns
- ❌ "This should be fixed" → Run a test to prove it's fixed
- ❌ Assume anything without seeing the evidence

### 🎯 Citation Bug Example (Jan 7, 2026)
**Wrong approach:**
- "I added stripping logic" → commit, push, wait
- Issue not fixed → no idea why

**Right approach:**
- Add deployment verification logging → commit, push
- Open app in Claude in Chrome
- Send test query → check Console for logs
- See logs → code is deployed ✅
- See no logs → code not deployed ❌
- See logs but wrong output → fix based on actual data

**Result:** Can see EXACTLY what's happening on production, not guessing.

### 📋 Tools You Have
- **Navigate:** Go to pages, click buttons, type in forms
- **Console:** Read actual errors and custom logs
- **Network:** Capture API requests and responses
- **DOM:** Inspect elements, understand structure
- **Screenshots:** Visual proof of state
- **GIF Recording:** Capture multi-step interactions

### 🔑 Key Principle
**Verification requires execution. File existence does not imply functionality.**

Before saying "this is fixed" or "this should work":
1. Open the app
2. Trigger the feature/bug
3. Show the actual result (console, network, UI)
4. Only then claim success/failure with evidence

---

## Important Notes

> **Development Workflow:** We develop via **push-to-Vercel**, NOT localhost. Make changes, commit, push to `main`, and verify on Vercel preview URLs. The "Failed to load clients" error on Vercel is expected - the app uses mock data locally but Supabase isn't fully configured for production data yet.

> **Chat/AI Integration:** The chat functionality in Intelligence Center will come from a **separate project called Holy Grail Chat (HGC)**. Do NOT implement chat features directly in this codebase. The current `lib/chat/` code is placeholder/mock only. When ready, HGC will be integrated as an external service.

## URLs

| Environment | URL | Status |
|-------------|-----|---------|
| Local | http://localhost:3000 | ⚠️ NOT USED (we use Vercel only) |
| Production | https://audienceos-agro-bros.vercel.app | ✅ Deployed |

**Vercel Project:** `audienceos-agro-bros`
**Vercel Team:** TBD

## Repository

- **GitHub**: https://github.com/growthpigs/audienceos-command-center
- **Clone URL**: `git@github.com:growthpigs/audienceos-command-center.git`
- **Default Branch**: `main`

## Active Worktrees

| Branch | Worktree Path | Purpose |
|--------|---------------|---------|
| `main` | `/Users/rodericandrews/_PAI/projects/command_center_audience_OS` | Production/stable (primary worktree) |

**Current Work:** All development uses the `main` branch in `/Users/rodericandrews/_PAI/projects/command_center_audience_OS`.

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

| Variable | Purpose | Status | Where to get |
|----------|---------|--------|--------------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL | ❌ Required | Supabase dashboard |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anon key | ❌ Required | Supabase API settings |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service role | ❌ Required | Supabase API settings |
| ANTHROPIC_API_KEY | Claude AI integration | ❌ Required | Anthropic Console |
| GOOGLE_AI_API_KEY | Gemini AI integration | ❌ Required | Google AI Studio |
| SLACK_CLIENT_ID | Slack OAuth integration | ⏳ Optional | Slack App Dashboard |
| SLACK_CLIENT_SECRET | Slack OAuth secret | ⏳ Optional | Slack App Dashboard |
| GOOGLE_CLIENT_ID | Google OAuth (Gmail/Ads) | ⏳ Optional | Google Cloud Console |
| GOOGLE_CLIENT_SECRET | Google OAuth secret | ⏳ Optional | Google Cloud Console |
| META_APP_ID | Meta Ads integration | ⏳ Optional | Meta Developer Console |
| META_APP_SECRET | Meta Ads secret | ⏳ Optional | Meta Developer Console |
| SENTRY_DSN | Error monitoring | ⏳ Optional | Sentry Dashboard |

## Development

### Development Workflow (Push-to-Vercel)

**We do NOT use localhost for development.** All changes are verified on Vercel.

```bash
# 1. Make code changes
# 2. Build locally to catch errors
npm run build

# 3. Commit and push
git add . && git commit -m "feat: description" && git push

# 4. Verify on Vercel preview URL
# Check deployment at: https://command-center-linear.vercel.app
```

### Available Scripts

```bash
npm run build        # Create production build (use before committing)
npm run lint         # Run ESLint checks
npm run dev          # Local dev server (NOT recommended - use Vercel)
npm run start        # Run production build locally
```

### Tech Stack

- **Framework**: Next.js 16 (App Router)
- **React**: v19
- **UI Components**: shadcn/ui (Radix primitives)
- **Styling**: Tailwind CSS v4
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **Drag & Drop**: @dnd-kit
- **Charts**: Recharts
- **Icons**: Lucide React

### Key Dependencies

- **dnd-kit**: Kanban board drag & drop functionality
- **zustand**: Global state management
- **zod**: Schema validation
- **react-hook-form**: Form handling
- **recharts**: Dashboard charts and analytics
- **date-fns**: Date manipulation
- **sonner**: Toast notifications

## Deployment

### Prerequisites

**Backend Services Required:**
1. **Supabase Project** - Database, Auth, Storage, Realtime
2. **Anthropic API** - Claude AI for intelligent features
3. **Google AI Studio** - Gemini for document indexing

**Optional Integrations:**
- Slack App (for unified communications)
- Google Cloud Project (for Gmail/Ads OAuth)
- Meta Developer App (for Meta Ads integration)
- Sentry Project (for error monitoring)

### Staging Deployment

```bash
# TBD - Configure Vercel or other hosting
```

### Production Deployment

```bash
# TBD - Configure production hosting
```

## Services & Integrations

| Service | Purpose | Status | Dashboard |
|---------|---------|--------|-----------|
| **Supabase** | Database, Auth, Storage | ✅ Configured | [supabase.com/dashboard](https://supabase.com/dashboard) |
| **Anthropic** | Claude AI integration | ⏳ Optional | [console.anthropic.com](https://console.anthropic.com) |
| **Google AI** | Gemini 3 Flash (Chat + Document RAG) | ✅ Configured | [aistudio.google.com](https://aistudio.google.com) |
| Slack | Communication integration | ⏳ Optional | [api.slack.com/apps](https://api.slack.com/apps) |
| Google Cloud | Gmail/Ads OAuth | ⏳ Optional | [console.cloud.google.com](https://console.cloud.google.com) |
| Meta for Developers | Ads integration | ⏳ Optional | [developers.facebook.com](https://developers.facebook.com) |
| Sentry | Error monitoring | ⏳ Optional | [sentry.io](https://sentry.io) |

### API Key Locations

| Key | Local | Vercel | PAI Secrets |
|-----|-------|--------|-------------|
| `GOOGLE_AI_API_KEY` | `.env.local` | ✅ All envs | `~/.claude/secrets/secrets-vault.md` |
| `SUPABASE_*` | `.env.local` | ✅ All envs | Project-specific |
| `OAUTH_STATE_SECRET` | `.env.local` | ✅ Production | Generated per-project |
| `TOKEN_ENCRYPTION_KEY` | `.env.local` | ✅ Production | Generated per-project |

**Note:** `.env.local` is gitignored. Safe to store actual secrets there for local dev.

### PAI Secrets Vault

**Location:** `~/.claude/secrets/secrets-vault.md`

**What it contains:**
- Global API keys (Gemini, OpenAI, etc.)
- Project-specific credentials (Supabase service role keys)
- Supabase CLI personal access token (for type generation)
- Database connection strings
- Chi-Gateway and Diiiploy-Gateway secrets

**Usage:**
- Chi can reference secrets from here when setting up new services
- All API keys are organized by service and project
- Includes instructions for when/how to add new secrets

**Regenerating Supabase Types:**
```bash
# Requires Supabase personal access token from secrets vault
SUPABASE_ACCESS_TOKEN="[token]" npx supabase gen types typescript \
  --project-id ebxshdqfaqupnvpghodi > types/database.ts
```

## Common Tasks

### First-Time Setup

```bash
# Clone and setup
git clone https://github.com/growthpigs/audienceos-command-center.git
cd audienceos-command-center
npm install

# Environment setup
cp .env.example .env.local
# Edit .env.local with your API keys

# Start development
npm run dev
```

### Database Setup (Supabase)

```sql
-- TBD: Add database schema setup instructions
-- Will be populated when Supabase project is configured
```

### Adding New Dependencies

```bash
# Add new package
npm install package-name

# Add dev dependency
npm install --save-dev package-name

# Update all dependencies
npm update
```

### Code Quality

```bash
# Run linting
npm run lint

# Type checking
npx tsc --noEmit

# Format code (if prettier added)
npm run format
```

## Project Structure

```
audienceos-command-center/
├── app/                     # Next.js App Router pages
│   ├── page.tsx            # Dashboard home
│   ├── client/[id]/        # Client detail pages
│   └── onboarding/start/   # Onboarding flow
├── components/              # React components
│   ├── ui/                 # shadcn/ui primitives
│   ├── kanban-board.tsx    # Pipeline management
│   ├── *-view.tsx          # Feature components
│   └── sidebar.tsx         # Navigation
├── lib/
│   ├── mock-data.ts        # Development data
│   ├── utils.ts            # Utility functions
│   ├── store.ts            # Zustand state
│   └── api.ts              # API client (TBD)
├── features/               # Feature specifications
├── docs/                   # Project documentation
└── stores/                 # Additional stores
```

## UI Verification Commands

**Runtime verification is MANDATORY.** Static file checks are insufficient.

### cursor-pointer Verification
```bash
# Start dev server
npm run dev

# In browser DevTools console, verify any clickable element:
getComputedStyle(document.querySelector('button')).cursor
# Expected: "pointer"

# Or use Claude in Chrome to verify runtime:
# Navigate to element → getComputedStyle check → confirm "pointer"
```

### Build Verification
```bash
# Full build check - catches TypeScript & Next.js issues
npm run build

# Type check only
npx tsc --noEmit
```

### UI Component Checklist
After ANY UI changes, verify:
```
□ npm run build passes (no compile errors)
□ All buttons show cursor: pointer on hover (runtime check)
□ Interactive elements (checkboxes, toggles) actually respond to clicks
□ Scroll containers have overflow-y-auto AND max-height set
□ Flex layouts with button anchoring use flex-col + mt-auto pattern
```

### Related Error Patterns
See `~/.claude/troubleshooting/error-patterns.md`:
- EP-057: "File Existence Fallacy" - static vs runtime verification

---

## Troubleshooting

### Common Issues

**Phantom numbers/badges appearing in sidebar (UI-001):**

*Symptoms:* Random numbers (e.g., 61, 12, 8, 4) appear next to or under navigation menu items in the sidebar. Numbers don't correspond to any feature logic.

*Root cause:* NOT a code issue. The sidebar.tsx has no count/badge logic. Likely causes:
- Browser extension (Vimium, accessibility tools showing keyboard indices)
- Cached build artifacts
- React DevTools accessibility overlay
- Browser DevTools element inspector residue

*Resolution:*
```bash
# 1. Clear Next.js cache
rm -rf .next && npm run dev

# 2. Hard refresh browser
# Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

# 3. Disable browser extensions temporarily
# Check if numbers disappear - if yes, one of your extensions is the cause

# 4. Check for React DevTools accessibility features
# Disable any "accessibility tree" overlays
```

*Verification:* Sidebar code has NO count logic - confirmed via `grep -r "count\|badge\|\.length" components/sidebar.tsx` returns nothing relevant.

---

**Build errors after dependency updates:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Environment variables not loading:**
```bash
# Ensure .env.local exists and has correct format
# Restart development server after changes
npm run dev
```

**TypeScript errors:**
```bash
# Check for type issues
npx tsc --noEmit
```

### Getting Help

- **GitHub Issues**: [Report bugs and request features](https://github.com/growthpigs/audienceos-command-center/issues)
- **Documentation**: Check `docs/` folder for detailed specs
- **Feature Specs**: Review `features/` folder for implementation details

## Status

### ✅ Complete
- [x] Next.js 16 + React 19 setup
- [x] shadcn/ui component system
- [x] All required dependencies installed
- [x] Git repository created and pushed
- [x] Environment configuration template
- [x] Build process verified working
- [x] Vercel deployment (production)
- [x] Supabase configuration
- [x] Email/password login
- [x] Logout button in settings (2026-01-06)
- [x] Send to AI integration (2026-01-06)
  - Global chat opener method
  - Contextual prompts from dashboard
  - Task and client integration
- [x] Settings UX improvements (2026-01-09)
  - Direct red Sign Out button in slide-over settings
  - Removed unnecessary Security wrapper section
  - Team members list cleanup (8 test accounts deleted)
  - Database integrity verified (FK constraints handled)

### ⏳ In Progress (Trevor)
- [ ] Signup page implementation
- [ ] Google OAuth login integration
- [ ] OAuth callback handler
- [ ] Google SSO toggle functionality

### 🎯 In Progress (Roderic)
- [ ] Chat interface refinements
- [ ] Core feature development
- [ ] Integration with Holy Grail Chat (HGC)

### 📋 Pending
- [ ] Email verification flow (Phase 2)
- [ ] Password reset functionality
- [ ] Two-factor authentication
- [ ] Session management improvements
- [ ] CI/CD pipeline enhancements
- [ ] Monitoring and alerting setup

---

*Last updated: 2026-01-09*
*Project Phase: Production (Vercel) | Active Development*
*Current Focus: Authentication (Trevor) + Core Features (Roderic)*