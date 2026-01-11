# Trevor's Task: OAuth & Signup Implementation
**Project:** AudienceOS Command Center
**Date:** 2026-01-06
**Estimated Effort:** 10-12 hours
**Priority:** P0 (Blocking user authentication)

---

## 🎯 Goal

Implement complete user authentication flow:
1. **Signup page** - Users can create accounts with email/password
2. **Google OAuth login** - Users can sign in with "Sign in with Google"
3. **Fix non-functional Google SSO toggle** - Make it actually work

**What we're NOT doing:** Database consolidation with RevOS (separate task)

---

## 📋 Current State (What's Missing)

### ❌ No Signup Page
- Login page exists: `app/login/page.tsx` (email/password only)
- **NO signup page exists**
- Users can't create accounts
- Only existing accounts work

### ❌ No Google OAuth for Users
- OAuth exists for **integrations only** (Slack, Gmail, Google Ads)
- Login page has NO "Sign in with Google" button
- Google OAuth credentials exist but unused for user auth

### ❌ Google SSO Toggle Non-Functional
- Toggle exists in Security settings (`components/settings/sections/security-section.tsx:246`)
- It's UI-only, no backend implementation

### ✅ What Works
- Email/password login
- Middleware auth protection (all routes require valid session)
- Logout button (just added)
- Integration OAuth (Slack/Gmail/Ads)

---

## 📦 What You're Building

### Task 1: Signup Page (~4 hours)

**Create:** `app/signup/page.tsx`

**Requirements:**
- Email input (validated)
- Password input (min 8 chars, show strength indicator)
- Confirm password input
- "Create Account" button
- Link to login page ("Already have an account?")
- Call `supabase.auth.signUp({ email, password })`
- Redirect to dashboard after successful signup
- Show errors (email already exists, weak password, etc.)

**Validation:**
- Email format valid
- Password >= 8 characters
- Passwords match
- Handle Supabase errors gracefully

**UI:** Match existing login page style (glassmorphic, centered card)

### Task 2: Google OAuth Login (~6 hours)

**Step A: Configure Supabase (30 min)** ✅ DONE
1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/qzkirjjrcblkqvhvalue
2. Navigate to Authentication → Providers
3. Enable "Google" provider
4. Use these credentials:
   ```
   Client ID: [See Google Cloud Console]
   Client Secret: [See Google Cloud Console]
   ```
5. Set redirect URL: `https://qzkirjjrcblkqvhvalue.supabase.co/auth/v1/callback`

**Step B: Update Login Page (2 hours)**

**File:** `app/login/page.tsx`

Add:
```typescript
const handleGoogleLogin = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })
  if (error) {
    // Handle error
  }
}
```

Add button:
```tsx
<Button variant="outline" onClick={handleGoogleLogin}>
  <GoogleIcon className="h-4 w-4 mr-2" />
  Sign in with Google
</Button>
```

**Step C: Create OAuth Callback Handler (1 hour)**

**Create:** `app/auth/callback/route.ts`

```typescript
import { createRouteHandlerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Redirect to dashboard
  return NextResponse.redirect(new URL('/', requestUrl.origin))
}
```

**Step D: Update Signup Page with Google Option (1 hour)**

Add same "Sign up with Google" button to signup page.

**Step E: Fix Google SSO Toggle (1.5 hours)**

**File:** `components/settings/sections/security-section.tsx`

The toggle at line 246 does nothing. It needs to:
1. Check if Google provider is enabled in Supabase
2. Toggle should call Supabase Admin API to enable/disable provider
3. Show loading state during toggle
4. Show success/error toast

**Note:** This might require `SUPABASE_SERVICE_ROLE_KEY` for admin operations.

### Task 3: Add Link to Signup from Login (~30 min)

**File:** `app/login/page.tsx`

Add below login form:
```tsx
<p className="text-sm text-muted-foreground text-center">
  Don't have an account?{" "}
  <Link href="/signup" className="text-primary hover:underline">
    Sign up
  </Link>
</p>
```

---

## 🔧 Technical Details

### Supabase Credentials (NEW PROJECT: command_center)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://qzkirjjrcblkqvhvalue.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6a2lyampyY2Jsa3F2aHZhbHVlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc4NDM0MTgsImV4cCI6MjA4MzQxOTQxOH0.3wPKZggKWF_1NrqnIdFiwLwgbs2t2HY2AcEbWvaplC8
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF6a2lyampyY2Jsa3F2aHZhbHVlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzg0MzQxOCwiZXhwIjoyMDgzNDE5NDE4fQ.1IZiWbQghwZ67WRsMp6J2eTeFd64HzP6r_CQF4F2iMo
```

### Google OAuth Credentials (Configured in Supabase Dashboard)

```bash
# See Google Cloud Console for actual values
GOOGLE_CLIENT_ID=[See Google Cloud Console]
GOOGLE_CLIENT_SECRET=[See Google Cloud Console]
```

### Key Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `app/login/page.tsx` | Edit | Add Google OAuth button + signup link |
| `app/signup/page.tsx` | Create | New signup page |
| `app/auth/callback/route.ts` | Create | OAuth callback handler |
| `components/settings/sections/security-section.tsx` | Edit | Fix Google SSO toggle (line 246) |

### Supabase Auth API Reference

**Signup:**
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
})
```

**OAuth:**
```typescript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'https://yourapp.com/auth/callback'
  }
})
```

**Exchange Code for Session (in callback):**
```typescript
await supabase.auth.exchangeCodeForSession(code)
```

---

## ✅ Testing Checklist

### Signup Page Tests
- [ ] Navigate to `/signup` - page loads
- [ ] Enter valid email + password - account created
- [ ] Enter existing email - shows "Email already in use" error
- [ ] Enter weak password - shows validation error
- [ ] Passwords don't match - shows error
- [ ] After signup, redirected to dashboard
- [ ] Click "Already have an account?" - goes to login

### Google OAuth Tests
- [ ] Click "Sign in with Google" on login page
- [ ] Redirects to Google consent screen
- [ ] After consent, redirects back to app
- [ ] User is logged in (middleware allows access)
- [ ] Session persists after page refresh
- [ ] Click "Sign up with Google" on signup page - same flow

### Google SSO Toggle Tests
- [ ] Toggle off - Google login disabled
- [ ] Toggle on - Google login enabled
- [ ] Shows loading state during operation
- [ ] Shows success toast after operation
- [ ] Error handling if operation fails

### Integration Tests
- [ ] Logout → Login with email/password → Success
- [ ] Logout → Login with Google → Success
- [ ] Logout → Signup with email/password → Success
- [ ] Logout → Signup with Google → Success
- [ ] Protected routes redirect to login when not authenticated
- [ ] Login page redirects to dashboard when already authenticated

---

## 🚨 Important Notes

### DO NOT Touch
- **RevOS database** - We're NOT consolidating databases
- **Integration OAuth** (Slack/Gmail/Ads) - Different from user auth, already works
- **Middleware** - Already protects routes correctly
- **Chat functionality** - Separate concern

### Code Style
- Match existing patterns in `app/login/page.tsx`
- Use shadcn/ui components (`Button`, `Input`, `Label`, `Card`)
- Use Tailwind classes for styling
- Use `sonner` for toast notifications
- Handle errors gracefully (never crash, show user-friendly messages)

### Git Workflow
```bash
# Create feature branch
git checkout -b trevor/oauth-signup

# Make changes, test locally
npm run build  # ALWAYS build before committing

# Commit
git add .
git commit -m "feat(auth): add signup page and Google OAuth login"

# Push
git push origin trevor/oauth-signup

# Vercel will auto-deploy preview - test there
# When ready, create PR to main
```

### Testing Strategy
1. **Local build test:** `npm run build` (must pass)
2. **Push to branch:** Vercel creates preview deployment
3. **Test on Vercel:** Use preview URL, not localhost
4. **Create PR:** Roderic will review and merge

---

## 📚 Reference Documents

| Document | Path | What It Contains |
|----------|------|------------------|
| **Auth Findings** | `working/AUTH_FINDINGS.md` | Complete auth gap analysis |
| **Login Page** | `app/login/page.tsx` | Current login implementation (template for signup) |
| **Middleware** | `middleware.ts` | Auth protection logic |
| **Security Settings** | `components/settings/sections/security-section.tsx` | Where Google SSO toggle lives |

---

## 🤝 Coordination with Roderic

### Communication
- **Slack/Discord:** Ping when branch is ready for review
- **Questions:** Check `working/AUTH_FINDINGS.md` first, then ask
- **Blockers:** Let Roderic know ASAP if stuck

### Work Split
- **Trevor:** OAuth, signup, authentication pages
- **Roderic:** Main features, chat integration, core functionality

### Merge Strategy
- Trevor creates PR from `trevor/oauth-signup` → `main`
- Roderic reviews and merges
- No direct pushes to `main` (except emergencies)

---

## 📊 Definition of Done

### Must Have (P0)
- [x] Signup page exists at `/signup`
- [x] Users can create accounts with email/password
- [x] Users can sign up with Google OAuth
- [x] Login page has "Sign in with Google" button
- [x] Login page has link to signup page
- [x] OAuth callback handler works
- [x] All tests pass
- [x] `npm run build` succeeds
- [x] Tested on Vercel preview

### Nice to Have (P1)
- [x] Google SSO toggle in settings actually works
- [x] Password strength indicator on signup
- [x] Email verification flow (optional - can be Phase 2)

---

## 💡 Tips

1. **Copy the login page** - It has the right style and structure
2. **Test on Vercel** - Not localhost (per RUNBOOK)
3. **Supabase docs** - https://supabase.com/docs/guides/auth
4. **shadcn/ui docs** - https://ui.shadcn.com (for components)
5. **Ask questions early** - Don't spin for hours on a blocker

---

## 🔗 Helpful Links

- **Supabase Dashboard:** https://supabase.com/dashboard/project/qzkirjjrcblkqvhvalue
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Production URL:** https://audienceos-agro-bros.vercel.app
- **GitHub Repo:** https://github.com/growthpigs/audienceos-command-center

---

**Questions?** Check `working/AUTH_FINDINGS.md` or ping Roderic.

**Ready to start?**
```bash
git checkout -b trevor/oauth-signup
npm install
npm run build  # Make sure everything compiles
```

Good luck! 🚀
