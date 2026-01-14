# CC4: Testing & Polish

**Manifest:** [00-MANIFEST.md](./00-MANIFEST.md)
**Status:** ⬜ Pending
**Dependencies:** CC2 + CC3 complete
**Branch:** `feat/consolidation-testing`
**Effort:** 4 hours

---

## Context

Final testing and polish after merging Cartridges (CC2) and HGC (CC3). Ensure everything works together and matches Linear design aesthetic.

---

## Prerequisites

Before starting:
- [ ] CC2 complete (cartridges merged)
- [ ] CC3 complete (HGC merged)
- [ ] Merge branches:
  ```bash
  git checkout feat/nav-restructure
  git merge feat/cartridges-port
  git merge feat/hgc-integration
  git checkout -b feat/consolidation-testing
  ```

---

## Tasks

### Task 1: Integration Smoke Test

**Goal:** Verify all features work together

**Checklist:**

1. **Main Navigation**
   - [ ] Dashboard loads
   - [ ] Pipeline loads
   - [ ] Client List loads
   - [ ] Onboarding Hub loads
   - [ ] Intelligence Center loads
   - [ ] Support Tickets loads
   - [ ] Knowledge Base loads
   - [ ] Automations loads
   - [ ] Integrations loads
   - [ ] Settings loads

2. **Intelligence Center Sub-Nav**
   - [ ] Overview shows capabilities grid
   - [ ] Chat shows chat interface
   - [ ] Activity shows placeholder
   - [ ] Cartridges shows 5 tabs
   - [ ] Custom Prompts loads
   - [ ] Knowledge Base loads
   - [ ] API Keys loads
   - [ ] Preferences loads

3. **Cartridges Tabs**
   - [ ] Voice tab renders form
   - [ ] Style tab renders form
   - [ ] Preferences tab renders form
   - [ ] Instructions tab renders form
   - [ ] Brand tab renders form + Benson Blueprint

4. **Chat Functionality**
   - [ ] Can send message
   - [ ] Receives response
   - [ ] Loading state works
   - [ ] History persists in session

---

### Task 2: Fix Any Broken Imports

**Goal:** Resolve any TypeScript errors from merge

```bash
npm run typecheck
```

Fix any errors that appear.

---

### Task 3: Verify Linear Design Consistency

**Goal:** Ensure all new components match Linear aesthetic

**Check these elements:**
- [ ] Card borders use `border-border`
- [ ] Background colors use `bg-card` or `bg-muted`
- [ ] Text uses `text-foreground` and `text-muted-foreground`
- [ ] Primary actions use `bg-primary`
- [ ] Rounded corners are consistent (`rounded-lg`)
- [ ] Spacing follows 4/8/12/16 pattern
- [ ] No random shadows (Linear is flat)

---

### Task 4: Test Responsive Layouts

**Goal:** Verify mobile/tablet views

**Test at these breakpoints:**
- [ ] Desktop (1440px)
- [ ] Laptop (1024px)
- [ ] Tablet (768px)
- [ ] Mobile (375px)

**Check:**
- [ ] Sidebar collapses properly
- [ ] Cartridge tabs stack on mobile
- [ ] Chat interface is usable on mobile
- [ ] Forms don't overflow

---

### Task 5: Add Loading States

**Goal:** Add loading skeletons where missing

**Check for loading states in:**
- [ ] Intelligence Center sections
- [ ] Cartridges tabs (while loading data)
- [ ] Chat message list
- [ ] Any API-dependent content

**Use shadcn Skeleton component:**
```tsx
import { Skeleton } from "@/components/ui/skeleton"

<Skeleton className="h-4 w-[200px]" />
```

---

### Task 6: Add Error Boundaries

**Goal:** Graceful error handling

**File:** `components/error-boundary.tsx` (if not exists)

Wrap Intelligence Center and Cartridges in error boundaries.

---

### Task 7: Run Full Test Suite

**Goal:** Verify existing tests still pass

```bash
npm test
```

---

### Task 8: Visual QA with AppTester

**Goal:** Use Claude in Chrome for visual testing

**Steps:**
1. Open localhost:3004 in Chrome
2. Navigate through all sections
3. Take screenshots of key states
4. Document any visual issues

**Pages to screenshot:**
- Dashboard
- Intelligence Center → Overview
- Intelligence Center → Chat
- Intelligence Center → Cartridges (each tab)
- Mobile view of Cartridges

---

### Task 9: Update CLAUDE.md

**Goal:** Document new structure in project CLAUDE.md

Add section about:
- Intelligence Center structure
- Cartridges location and purpose
- Chat service configuration

---

### Task 10: Final Commit and Merge

```bash
git add .
git commit -m "test: verify 3-system consolidation integration

- Smoke test all navigation paths
- Fix merge conflicts and import errors
- Ensure Linear design consistency
- Add loading states and error boundaries
- All tests passing

Consolidation complete:
- AudienceOS UI ✓
- Holy Grail Chat backend ✓
- RevOS Cartridges ✓

Part of: 3-System Consolidation"

git push origin feat/consolidation-testing

# Merge to linear-rebuild
git checkout linear-rebuild
git merge feat/consolidation-testing
git push origin linear-rebuild
```

---

## Output When Complete

```
CC4 COMPLETE
- Task 1: ✓ Integration smoke test (all 30+ checkboxes)
- Task 2: ✓ Fixed import errors
- Task 3: ✓ Linear design consistency verified
- Task 4: ✓ Responsive layouts working
- Task 5: ✓ Loading states added
- Task 6: ✓ Error boundaries added
- Task 7: ✓ All tests passing
- Task 8: ✓ Visual QA complete
- Task 9: ✓ CLAUDE.md updated
- Task 10: ✓ Merged to linear-rebuild
- Branch: feat/consolidation-testing
- Deployed: localhost:3004

3-SYSTEM CONSOLIDATION COMPLETE
- AudienceOS UI ✓
- Holy Grail Chat backend ✓
- RevOS Cartridges (5 tabs) ✓
Total time: ~18 hours
```

---

## Recovery

If resuming:
1. Check if CC2 and CC3 are merged
2. Run `npm run typecheck` to see current errors
3. Resume from first failing check
4. This document has full context

---

## Exit Criteria Summary

- [ ] All navigation paths work
- [ ] Cartridges 5 tabs functional
- [ ] Chat sends and receives messages
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] Tests passing
- [ ] Linear design consistent
- [ ] Responsive on mobile
- [ ] Merged to linear-rebuild

---

*Part of 3-System Consolidation - See 00-MANIFEST.md*
