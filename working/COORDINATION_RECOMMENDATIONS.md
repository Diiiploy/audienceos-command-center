# Coordination Recommendations: Roderic + Trevor
**Project:** AudienceOS Command Center
**Date:** 2026-01-06

---

## 📋 What's Set Up

✅ **Trevor's Brief Created:** `working/TREVOR_OAUTH_BRIEF.md`
- Complete task breakdown (signup + OAuth)
- All credentials included
- Testing checklist
- 10-12 hour estimate

✅ **RUNBOOK Updated:** Work assignments visible to all
- Trevor: `trevor/oauth-signup` branch
- Roderic: `main` branch
- Coordination protocol documented

✅ **Supabase Credentials Shared:** Trevor has everything he needs

---

## 🤝 Coordination Strategy

### 1. Branch Strategy

| Person | Branch | Workflow |
|--------|--------|----------|
| **Trevor** | `trevor/oauth-signup` | Works independently, creates PR when done |
| **Roderic** | `main` | Continue main work, review Trevor's PR when ready |

**Key Point:** Trevor's work is isolated. You can continue on `main` without conflicts.

### 2. Communication Protocol

**Daily Check-ins (Recommended):**
- Quick Slack/Discord ping: "What are you working on today?"
- Trevor shares progress: "Signup page done, working on OAuth"
- You share context: "Working on X, will be ready to review your PR tomorrow"

**Blocker Protocol:**
- Trevor hits blocker → Pings you immediately (don't wait)
- You provide guidance or take over if needed
- Document resolution in RUNBOOK or brief

**PR Review:**
- Trevor creates PR: `trevor/oauth-signup` → `main`
- You review within 24 hours (or set expectation)
- Test on Vercel preview URL before merging
- Merge when approved

### 3. What You Should Monitor

**Trevor's Deliverables:**
- [ ] Signup page works (test: create account, login)
- [ ] Google OAuth works (test: "Sign in with Google")
- [ ] Callback handler doesn't crash
- [ ] All builds pass (`npm run build`)
- [ ] Tested on Vercel preview (not localhost)

**Your Responsibilities:**
- Review PR code quality
- Test auth flow end-to-end
- Ensure no conflicts with your main branch work
- Merge to `main` when ready

### 4. Conflict Prevention

**Files Trevor Will Touch:**
- `app/login/page.tsx` (add Google button)
- `app/signup/page.tsx` (new file)
- `app/auth/callback/route.ts` (new file)
- `components/settings/sections/security-section.tsx` (fix toggle)

**Files You Should Avoid (While Trevor Works):**
- Don't modify `app/login/page.tsx` until his PR is merged
- Don't touch security settings UI
- Everything else is safe

**If You Must Edit Same File:**
- Communicate: "Hey, I need to touch login page for X"
- Coordinate timing: "Can you push your changes first?"
- Or: "I'll wait until your PR is merged"

---

## 💡 Additional Suggestions

### A. Create Shared Test Account

**Why:** Both of you need to test auth flows

**Setup:**
```bash
# Trevor creates during development
Email: test@audienceos.dev
Password: TestAccount123!
```

**Document in:** `.env.local` (gitignored) or shared password manager

### B. Use PR Templates

**Create:** `.github/pull_request_template.md`

```markdown
## What Changed
- Signup page implemented
- Google OAuth integrated

## Testing Done
- [ ] Signup with email/password works
- [ ] Google OAuth login works
- [ ] Builds pass
- [ ] Tested on Vercel preview

## Screenshots
[Add screenshot of signup page]
```

**Benefit:** Trevor fills this out, you know exactly what to test

### C. Establish Definition of "Done"

**Before Trevor's PR is "ready for review":**
- [ ] All code written and tested
- [ ] `npm run build` passes locally
- [ ] Pushed to `trevor/oauth-signup` branch
- [ ] Vercel preview deployment created
- [ ] Trevor tested on Vercel (not localhost)
- [ ] PR description filled out
- [ ] Screenshots added to PR

**Before You Merge:**
- [ ] Code review passed
- [ ] You tested auth flow on Vercel preview
- [ ] No merge conflicts with `main`
- [ ] CI checks pass (if any)

### D. Set Expectations for Response Time

**Communication SLA:**
- **Blocker question:** Response within 2-4 hours (during work hours)
- **PR review:** Within 24 hours
- **Quick question:** Within 1 hour if online

**Why:** Prevents Trevor from being stuck, keeps momentum

### E. Document Decisions

**If Trevor asks:** "Should I implement email verification now?"

**Your response:**
1. Make decision: "No, let's do Phase 2"
2. Document in brief: Update `TREVOR_OAUTH_BRIEF.md` → "Phase 2" section
3. Update RUNBOOK: Add to "Pending" section

**Why:** Prevents re-asking same question

### F. Use Feature Flags (Optional)

**If Trevor's work takes multiple days:**

Add to `.env.local`:
```bash
NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH=false
```

**Trevor's code:**
```typescript
if (process.env.NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH === 'true') {
  // Show Google OAuth button
}
```

**Benefit:** Can merge partially complete work without breaking production

### G. Weekly Sync (If Long-Running)

**15-minute call/chat:**
- What got done this week
- What's blocked
- What's planned for next week
- Any architecture questions

**When:** Friday afternoons or Monday mornings

---

## 🚨 Red Flags to Watch For

### Trevor is Stuck (Signs)
- No commits for 24+ hours
- Same question asked multiple times
- "I think I broke something" messages
- Radio silence

**Action:** Proactively reach out: "How's it going? Need help?"

### Scope Creep (Signs)
- Trevor implements features not in brief
- "I also added password reset" (not requested)
- Multiple new files beyond spec

**Action:** Redirect: "That's great, but let's finish the core first. Save that for Phase 2."

### Quality Issues (Signs)
- No tests
- Code doesn't match project patterns
- Skipping error handling
- "It works on my machine" (didn't test on Vercel)

**Action:** Request changes in PR review, point to examples in codebase

---

## 📊 Success Metrics

**After Trevor's PR is Merged:**
- [ ] Users can sign up with email/password
- [ ] Users can sign in with Google
- [ ] No auth-related bugs in production
- [ ] Code is maintainable (you can read/modify it)
- [ ] Trevor learned project patterns (reusable for future tasks)

**If All Checked:** Success! 🎉

---

## 🔄 Handoff Checklist

**Before Trevor Starts:**
- [x] Brief created and reviewed
- [x] Credentials shared
- [x] Branch strategy agreed
- [x] Communication channel established
- [ ] First check-in scheduled

**During Work:**
- [ ] Daily progress updates
- [ ] Blockers resolved quickly
- [ ] Code pushed to branch regularly
- [ ] Vercel previews tested

**Before Merge:**
- [ ] PR created with description
- [ ] Code review completed
- [ ] Auth flow tested end-to-end
- [ ] No merge conflicts
- [ ] Production deployment planned

**After Merge:**
- [ ] Production deployment verified
- [ ] Trevor notified of merge
- [ ] RUNBOOK status updated
- [ ] Next task discussed (if any)

---

## 🎯 Your Next Actions

### Immediate (Today)
1. Share Trevor's brief with him: `working/TREVOR_OAUTH_BRIEF.md`
2. Confirm he has all credentials (already provided)
3. Agree on check-in schedule (daily? twice daily?)
4. Set PR review expectations (24-hour turnaround?)

### This Week
5. Monitor Trevor's progress (GitHub commits)
6. Be available for questions
7. Continue your main branch work (chat, features)
8. Review PR when ready

### Before Merge
9. Test auth flow thoroughly on Vercel preview
10. Verify no conflicts with your work
11. Merge to `main`
12. Deploy to production

---

## 📞 Contact Points

**For Trevor:**
- Brief: `working/TREVOR_OAUTH_BRIEF.md`
- Credentials: Already shared
- Questions: Slack/Discord with you
- Blockers: Ping you immediately

**For You:**
- Monitor: GitHub commits on `trevor/oauth-signup`
- Review: PR when created
- Deploy: After merge to `main`

---

**Bottom Line:** Trevor's work is well-scoped and isolated. You can continue on `main` without conflicts. Just stay responsive to questions and review the PR when ready.

Good coordination! 🚀
