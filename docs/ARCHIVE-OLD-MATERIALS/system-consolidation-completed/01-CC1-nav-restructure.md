# CC1: Navigation Restructure

**Manifest:** [00-MANIFEST.md](./00-MANIFEST.md)
**Status:** ⬜ Pending
**Dependencies:** None
**Branch:** `feat/nav-restructure`
**Effort:** 2 hours

---

## Context

Restructure the Intelligence Center navigation to accommodate Cartridges and clarify naming. This is foundational work - CC2 (Cartridges) and CC3 (HGC) depend on these nav changes.

**Current Issues:**
- "Capabilities" is generic → should be "Cartridges"
- "Chat History" → should be "Activity"
- "Knowledge Sources" is confusing vs main "Knowledge Base"
- No clear separation between chat/content and settings

---

## Prerequisites

Before starting:
- [ ] Dev server running on localhost:3004
- [ ] On branch: `linear-rebuild`
- [ ] Run: `git checkout -b feat/nav-restructure`

---

## Tasks

### Task 1: Update Intelligence Center Settings Groups

**Goal:** Rename sections and restructure nav

**File:** `components/linear/settings-sidebar.tsx`

**Current (lines 125-148):**
```typescript
export const intelligenceSettingsGroups: SettingsGroup[] = [
  {
    id: "ai",
    label: "AI Assistant",
    icon: <Building2 className="w-4 h-4" />,
    sections: [
      { id: "overview", label: "Overview" },
      { id: "capabilities", label: "Capabilities" },
      { id: "knowledge", label: "Knowledge Sources" },
      { id: "prompts", label: "Custom Prompts" },
      { id: "history", label: "Chat History" },
    ],
  },
  {
    id: "account",
    label: "My Account",
    icon: <User className="w-4 h-4" />,
    sections: [
      { id: "preferences", label: "Preferences" },
      { id: "notifications", label: "Notifications" },
      { id: "api", label: "API Keys" },
    ],
  },
]
```

**New:**
```typescript
export const intelligenceSettingsGroups: SettingsGroup[] = [
  {
    id: "assistant",
    label: "Assistant",
    icon: <Sparkles className="w-4 h-4" />,
    sections: [
      { id: "overview", label: "Overview" },
      { id: "chat", label: "Chat" },
      { id: "activity", label: "Activity" },
    ],
  },
  {
    id: "configuration",
    label: "Configuration",
    icon: <Settings className="w-4 h-4" />,
    sections: [
      { id: "cartridges", label: "Cartridges" },
      { id: "prompts", label: "Custom Prompts" },
      { id: "knowledge", label: "Knowledge Base" },
    ],
  },
  {
    id: "account",
    label: "Account",
    icon: <User className="w-4 h-4" />,
    sections: [
      { id: "api", label: "API Keys" },
      { id: "preferences", label: "Preferences" },
    ],
  },
]
```

**Changes:**
1. Renamed "AI Assistant" → "Assistant"
2. Added "Chat" section (for main chat interface)
3. Renamed "Chat History" → "Activity"
4. Renamed "Capabilities" → "Cartridges"
5. Moved to new "Configuration" group
6. Renamed "Knowledge Sources" → "Knowledge Base"
7. Removed "Notifications" (keep account simple for now)

**Verification:**
1. Save file
2. Check Intelligence Center nav in browser
3. All sections should render without errors

---

### Task 2: Add Required Imports

**Goal:** Import new icons used in settings groups

**File:** `components/linear/settings-sidebar.tsx`

**Add to imports (if not already present):**
```typescript
import {
  Building2,
  User,
  Sparkles,  // Add this
  Settings,  // Add this
} from "lucide-react"
```

---

### Task 3: Update Intelligence Center Component

**Goal:** Add placeholders for new sections

**File:** `components/views/intelligence-center.tsx`

**Add section rendering logic:**

After the existing content, add handlers for new section IDs:

```typescript
// Add to the component, inside the SettingsLayout
{activeSection === "chat" && (
  <SettingsContentSection title="Chat">
    <div className="bg-card border border-border rounded-lg p-8 text-center">
      <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-lg font-medium mb-2">Chat Interface</h3>
      <p className="text-muted-foreground mb-4">
        AI-powered chat coming soon. Will integrate HGC backend.
      </p>
    </div>
  </SettingsContentSection>
)}

{activeSection === "activity" && (
  <SettingsContentSection title="Activity">
    <div className="bg-card border border-border rounded-lg p-8 text-center">
      <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-lg font-medium mb-2">Activity Feed</h3>
      <p className="text-muted-foreground mb-4">
        View your chat history and AI interactions.
      </p>
    </div>
  </SettingsContentSection>
)}

{activeSection === "cartridges" && (
  <SettingsContentSection title="Cartridges">
    <div className="bg-card border border-border rounded-lg p-8 text-center">
      <Boxes className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-lg font-medium mb-2">AI Cartridges</h3>
      <p className="text-muted-foreground mb-4">
        Configure Voice, Style, Preferences, Instructions, and Brand cartridges.
      </p>
      <p className="text-sm text-muted-foreground">
        Port from RevOS coming in CC2.
      </p>
    </div>
  </SettingsContentSection>
)}
```

**Add imports:**
```typescript
import { History, Boxes } from "lucide-react"
```

---

### Task 4: Update Default Section

**Goal:** Set "overview" as default, handle unknown sections

**File:** `components/views/intelligence-center.tsx`

Ensure the component handles all section IDs gracefully:

```typescript
// Add fallback for unknown sections
{!["overview", "chat", "activity", "cartridges", "prompts", "knowledge", "api", "preferences"].includes(activeSection) && (
  <SettingsContentSection title="Coming Soon">
    <div className="bg-card border border-border rounded-lg p-8 text-center">
      <p className="text-muted-foreground">
        This section is under development.
      </p>
    </div>
  </SettingsContentSection>
)}
```

---

### Task 5: Verify in Browser

**Goal:** Confirm all navigation works

**Steps:**
1. Open http://localhost:3004
2. Navigate to Intelligence Center (sidebar)
3. Click through all nav items:
   - Assistant → Overview ✓
   - Assistant → Chat ✓
   - Assistant → Activity ✓
   - Configuration → Cartridges ✓
   - Configuration → Custom Prompts ✓
   - Configuration → Knowledge Base ✓
   - Account → API Keys ✓
   - Account → Preferences ✓

**Expected:** No errors, placeholder content shows for new sections

---

### Task 6: Commit Changes

```bash
git add components/linear/settings-sidebar.tsx
git add components/views/intelligence-center.tsx
git commit -m "feat(nav): restructure Intelligence Center navigation

- Rename 'Capabilities' → 'Cartridges'
- Rename 'Chat History' → 'Activity'
- Rename 'Knowledge Sources' → 'Knowledge Base'
- Add 'Chat' section for main chat interface
- Reorganize into Assistant / Configuration / Account groups
- Add placeholder content for new sections

Prepares for CC2 (Cartridges port) and CC3 (HGC integration)

Part of: 3-System Consolidation"

git push -u origin feat/nav-restructure
```

---

## Output When Complete

When done, output:
```
CC1 COMPLETE
- Task 1: ✓ Updated intelligenceSettingsGroups
- Task 2: ✓ Added required imports
- Task 3: ✓ Added placeholder sections
- Task 4: ✓ Added fallback handling
- Task 5: ✓ Verified in browser (all 8 sections work)
- Task 6: ✓ Committed and pushed
- Branch: feat/nav-restructure
- Ready for: CC2 (Cartridges) and CC3 (HGC) in parallel
```

---

## Recovery

If resuming after session break:
1. Check branch: `git branch | grep nav-restructure`
2. Check if settings-sidebar.tsx has new groups
3. Resume from first incomplete task
4. This document has full context

---

*Part of 3-System Consolidation - See 00-MANIFEST.md*
