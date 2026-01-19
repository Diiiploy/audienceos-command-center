# AudienceOS - Critical Issues Audit (2026-01-14)

**Status:** ⚠️ **59 TODO/FIXME comments found across codebase**
**Assessment:** Application appears complete but has **pervasive missing backend integrations**

---

## 🚨 CRITICAL FINDINGS

The app has a **wiring disconnect** - UI is fully built and functional, but most user actions don't actually call APIs or persist data. Users can:
- ✅ See data (loaded from API on mount)
- ✅ See buttons and menus
- ❌ Actually DO anything with buttons (nothing persists)

---

## 📊 Issues by Module (59 Total)

### 🔴 **TIER 1: BLOCKING (Core Functionality Broken)**

#### **1. CLIENT DETAILS PANEL** (10 TODOs)
**File:** `components/linear/client-detail-panel.tsx`
**Severity:** 🔴 HIGH - Users cannot modify clients

| Action | Status | Issue |
|--------|--------|-------|
| Edit toggle | ❌ Non-functional | TODO: Toggle edit mode not connected |
| Copy ID | ❌ No feedback | TODO: No toast shown on copy |
| Open client | ❌ Non-functional | TODO: Link doesn't open anything |
| Move stage | ❌ Non-functional | TODO: No stage picker modal |
| Assign owner | ❌ Non-functional | TODO: No owner picker modal |
| Add labels | ❌ Non-functional | TODO: No label picker |
| Save notes | ❌ Not saving | TODO: API endpoint not ready, notes only in UI |
| Attach files | ❌ Non-functional | TODO: No file picker |
| Delete client | ❌ Non-functional | TODO: No confirmation modal |
| Date picker | ❌ Non-functional | TODO: Calendar not implemented |

**Impact:** Pipeline management broken - can't actually move clients through stages

---

#### **2. TICKET OPERATIONS** (5 TODOs in detail panel)
**File:** `components/linear/ticket-detail-panel.tsx`
**Severity:** 🔴 HIGH - Already fixed comment bug, but 5 more broken

| Action | Status | Issue |
|--------|--------|-------|
| Edit ticket | ❌ Non-functional | TODO: No edit modal |
| Copy link | ⚠️ Works, no feedback | TODO: No toast notification |
| Change status | ❌ Non-functional | Dropdown exists but no API call |
| Change priority | ❌ Non-functional | Dropdown exists but no API call |
| Assign ticket | ❌ Non-functional | TODO: No assignee API call |
| Delete ticket | ❌ Non-functional | TODO: No confirmation modal |

**Impact:** Cannot change ticket status/priority/assignment after creation

---

#### **3. AUTOMATIONS HUB** (5 TODOs)
**File:** `components/views/automations-hub.tsx`
**Severity:** 🔴 HIGH - Workflows can't be managed

| Action | Status | Issue |
|--------|--------|-------|
| Toggle automation status | ❌ Non-functional | TODO: No API call to activate/deactivate |
| Duplicate workflow | ❌ Non-functional | TODO: No API call |
| Delete workflow | ❌ Non-functional | TODO: No confirmation + API call |
| Test step | ❌ Non-functional | TODO: No test execution |
| Save step config | ❌ Non-functional | TODO: Changes not persisted to API |

**Impact:** Cannot actually manage or test automated workflows

---

### 🟠 **TIER 2: MAJOR (Important Features Broken)**

#### **4. KNOWLEDGE BASE** (4 TODOs)
**File:** `components/views/knowledge-base.tsx`
**Severity:** 🟠 MAJOR - Documents can't be managed

| Action | Status | Issue |
|--------|--------|-------|
| Download document | ❌ Non-functional | TODO: No actual API download |
| Share document | ❌ Non-functional | TODO: No share modal |
| Delete document | ❌ Non-functional | TODO: No confirmation + API call |
| Document operations | ❌ Limited | Share/download are placeholders |

**Impact:** Knowledge base is read-only, no document management possible

---

#### **5. COMMUNICATIONS HUB** (4 TODOs)
**File:** `components/communications/communications-hub.tsx`
**Severity:** 🟠 MAJOR - Cannot reply to messages

| Action | Status | Issue |
|--------|--------|-------|
| Send reply | ❌ Non-functional | TODO: No API call to send |
| AI draft reply | ❌ Non-functional | TODO: No AI API integration |
| Load more messages | ❌ Non-functional | TODO: Pagination not implemented |
| Refresh messages | ❌ Non-functional | TODO: Always shows fake data |

**Impact:** Communications are read-only, can't respond to Slack/Email

---

#### **6. TRAINING CARTRIDGES** (12 TODOs across tabs)
**Files:** `components/cartridges/tabs/*.tsx`
**Severity:** 🟠 MAJOR - AI training config broken

**Brand Tab (4 TODOs):**
- Save brand info → No API
- Delete brand → No API
- Generate 112-point blueprint → Placeholder only
- Upload logo → No file upload API

**Instructions Tab (4 TODOs):**
- Create instruction set → No API
- Upload documents → No API
- Process instructions → Placeholder
- Delete instructions → Placeholder

**Style/Voice/Preferences Tabs (4 TODOs):**
- All save operations → No API persistence
- All modifications → UI-only, not saved

**Impact:** AI personality config doesn't persist - all changes lost on reload

---

### 🟡 **TIER 3: MODERATE (Secondary Features)**

#### **7. ONBOARDING** (1 TODO)
**File:** `components/onboarding/active-onboardings.tsx`
**Severity:** 🟡 MODERATE

| Action | Status | Issue |
|--------|--------|-------|
| Stage transitions | ⚠️ Limited | TODO: No API call when moving instances between stages |

**Impact:** Can't track onboarding progress through stages

---

#### **8. CLIENT LIST SHEET** (3 TODOs)
**File:** `components/client-detail-sheet.tsx`
**Severity:** 🟡 MODERATE
- Context menu actions partially broken
- Some inline edits don't persist

---

#### **9. SETTINGS** (2 TODOs)
**Files:** `components/settings/settings-layout.tsx`, `app/api/v1/settings/users/route.ts`
**Severity:** 🟡 MODERATE
- User deletion → No confirmation dialog
- Some API endpoints incomplete

---

### 🔵 **TIER 4: MINOR (Polish & UX)**

#### **10. DASHBOARD** (1 TODO)
**File:** `components/dashboard-view.tsx`
**Severity:** 🔵 MINOR
- TODO: Firehose data source not implemented (uses mock data)

---

#### **11. DATE PICKER** (1 TODO)
**File:** `components/linear/date-picker-modal.tsx`
**Severity:** 🔵 MINOR
- TODO: Calendar picker not implemented

---

#### **12. INTEGRATIONS SYNC** (3 TODOs)
**File:** `app/api/v1/integrations/[id]/sync/route.ts`
**Severity:** 🔵 MINOR
- Some sync error handling incomplete
- Rate limiting edge cases

---

#### **13. API ENDPOINTS** (4 TODOs)
**Files:** API routes
**Severity:** 🔵 MINOR
- Some error responses incomplete
- A few edge cases unhandled

---

## 📈 SUMMARY BY SEVERITY

| Severity | Count | Modules | Impact |
|----------|-------|---------|--------|
| 🔴 Critical | 20 | Clients, Tickets, Automations | **Core workflows broken** |
| 🟠 Major | 16 | Communications, Knowledge Base, Cartridges | **Important features read-only** |
| 🟡 Moderate | 6 | Onboarding, Settings, Client List | **Secondary features limited** |
| 🔵 Minor | 11+ | Dashboard, UX Polish, API edges | **Nice-to-have fixes** |

---

## 🎯 ROOT CAUSE ANALYSIS

**Pattern Identified:** All TODOs follow the same pattern:
1. ✅ **UI Layer:** Fully implemented (buttons, menus, forms exist)
2. ✅ **State Management:** State management works (local state updates)
3. ❌ **API Integration:** Missing API calls (no `fetch` or `axios` calls)
4. ❌ **Data Persistence:** No backend integration (changes don't persist)
5. ❌ **User Feedback:** No toast/modal feedback (users unaware of failures)

**Example:**
```typescript
// Current state across modules:
const handleSaveNote = () => {
  setNoteText("saved")        // ✅ UI updates
  // TODO: Save to API        // ❌ Never happens
  // Note is lost on reload   // 💥 Data loss
}
```

---

## 🚀 NEXT STEPS

### **Immediate (This Week)**
1. Wire Support Tickets status/priority/assign changes to API *(already fixed comment bug)*
2. Wire Client Details panel to full CRUD API
3. Enable Automations save/delete operations
4. Enable Knowledge Base document operations

### **Short Term (Next Week)**
5. Complete Communications hub reply functionality
6. Complete Training Cartridges API integration
7. Add confirmation modals for destructive actions
8. Add toast feedback for all operations

### **Medium Term (Sprint)**
9. Complete Onboarding stage transitions
10. Complete Settings operations
11. Implement date picker calendar
12. Polish dashboard firehose integration

---

## 📝 Files to Prioritize (Highest Impact First)

1. `components/linear/client-detail-panel.tsx` - 10 TODOs, blocks pipeline
2. `components/linear/ticket-detail-panel.tsx` - 5 TODOs, blocks ticket management
3. `components/views/automations-hub.tsx` - 5 TODOs, blocks workflow management
4. `components/cartridges/tabs/*.tsx` - 12 TODOs, AI training broken
5. `components/communications/communications-hub.tsx` - 4 TODOs, no replies possible
6. `components/views/knowledge-base.tsx` - 4 TODOs, read-only documents

---

## ✅ Already Fixed

- ✅ Support Tickets: Comment submission (2026-01-14)
- ✅ Support Tickets: Notes loading on select (2026-01-14)

---

*Audit Date: 2026-01-14*
*Total Issues: 59 TODOs + estimated 20-30 silent failures*
*Recommendation: Work through Tier 1 (Critical) before user testing*
