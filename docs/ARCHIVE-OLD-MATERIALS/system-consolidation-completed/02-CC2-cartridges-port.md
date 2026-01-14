# CC2: Cartridges Port from RevOS

**Manifest:** [00-MANIFEST.md](./00-MANIFEST.md)
**Status:** ⬜ Pending
**Dependencies:** CC1 complete
**Branch:** `feat/cartridges-port`
**Effort:** 8 hours

---

## Context

Port the 5-tab Cartridge system from RevOS to AudienceOS. This includes:
- Voice cartridge (tone, style, personality)
- Style cartridge (writing style preferences)
- Preferences cartridge (content preferences)
- Instructions cartridge (AI behavior rules)
- Brand cartridge (112-point Benson Blueprint)

**Source Files:**
- `/revos/app/dashboard/cartridges/page.tsx` (~1700 lines)
- `/revos/components/cartridges/cartridge-edit-form.tsx` (~640 lines)

**Target:**
- `/Users/rodericandrews/_PAI/projects/command_center_audience_OS/components/cartridges/`
- Integration into Intelligence Center

---

## Prerequisites

Before starting:
- [ ] CC1 complete (nav restructure done)
- [ ] RevOS project accessible at `/Users/rodericandrews/_PAI/projects/revos/`
- [ ] Run: `git checkout feat/nav-restructure && git checkout -b feat/cartridges-port`

---

## Tasks

### Task 1: Create Cartridges Directory Structure

**Goal:** Set up component folder structure

```bash
mkdir -p components/cartridges/forms
mkdir -p components/cartridges/tabs
```

**Structure:**
```
components/cartridges/
├── index.ts                 # Exports
├── cartridges-page.tsx      # Main container with tabs
├── tabs/
│   ├── voice-tab.tsx
│   ├── style-tab.tsx
│   ├── preferences-tab.tsx
│   ├── instructions-tab.tsx
│   └── brand-tab.tsx
└── forms/
    ├── voice-form.tsx
    ├── style-form.tsx
    ├── preferences-form.tsx
    ├── instructions-form.tsx
    └── brand-form.tsx
```

---

### Task 2: Read and Analyze RevOS Cartridge Types

**Goal:** Extract TypeScript interfaces from RevOS

**Source:** Read `revos/app/dashboard/cartridges/page.tsx`

**Key interfaces to extract:**

```typescript
// Types to port (adapt for AudienceOS)

interface VoiceCartridge {
  tone: string;
  style: string;
  personality: string[];
  vocabulary: string;
  contentPreferences: {
    topicsToEmphasize: string[];
    topicsToAvoid: string[];
    preferredFormats: string[];
  };
}

interface StyleCartridge {
  writingStyle: string;
  formality: 'formal' | 'casual' | 'balanced';
  sentenceStructure: string;
  paragraphLength: 'short' | 'medium' | 'long';
  useOfEmoji: boolean;
  useOfHashtags: boolean;
}

interface PreferencesCartridge {
  postingFrequency: string;
  bestTimes: string[];
  contentMix: {
    educational: number;
    promotional: number;
    engagement: number;
    personal: number;
  };
}

interface InstructionCartridge {
  alwaysDo: string[];
  neverDo: string[];
  responseGuidelines: string[];
  escalationTriggers: string[];
}

interface BrandCartridge {
  companyName: string;
  tagline: string;
  missionStatement: string;
  coreValues: string[];
  targetAudience: string;
  uniqueSellingPoints: string[];
  brandVoice: string;
  // 112-point Benson Blueprint
  bensonBlueprint?: BensonBlueprint;
}

interface BensonBlueprint {
  // Full 112-point structure from Jon Benson
  // Copy from RevOS
}
```

---

### Task 3: Create Types File

**Goal:** Create shared types for cartridges

**File:** `types/cartridges.ts`

```typescript
// types/cartridges.ts

export interface VoiceCartridge {
  id: string;
  agencyId: string;
  tone: string;
  style: string;
  personality: string[];
  vocabulary: string;
  contentPreferences: {
    topicsToEmphasize: string[];
    topicsToAvoid: string[];
    preferredFormats: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface StyleCartridge {
  id: string;
  agencyId: string;
  writingStyle: string;
  formality: 'formal' | 'casual' | 'balanced';
  sentenceStructure: string;
  paragraphLength: 'short' | 'medium' | 'long';
  useOfEmoji: boolean;
  useOfHashtags: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PreferencesCartridge {
  id: string;
  agencyId: string;
  postingFrequency: string;
  bestTimes: string[];
  contentMix: {
    educational: number;
    promotional: number;
    engagement: number;
    personal: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface InstructionCartridge {
  id: string;
  agencyId: string;
  alwaysDo: string[];
  neverDo: string[];
  responseGuidelines: string[];
  escalationTriggers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BrandCartridge {
  id: string;
  agencyId: string;
  companyName: string;
  tagline: string;
  missionStatement: string;
  coreValues: string[];
  targetAudience: string;
  uniqueSellingPoints: string[];
  brandVoice: string;
  bensonBlueprint?: BensonBlueprint;
  createdAt: string;
  updatedAt: string;
}

export interface BensonBlueprint {
  // See revos/app/dashboard/cartridges/page.tsx for full structure
  headline: string;
  subheadline: string;
  emotionalHook: string;
  problemStatement: string;
  agitateSection: string[];
  solutionSection: string[];
  benefitsSection: string[];
  proofSection: string[];
  callToAction: string;
  // ... full 112 points
}

export type CartridgeType = 'voice' | 'style' | 'preferences' | 'instructions' | 'brand';

export interface CartridgeTab {
  id: CartridgeType;
  label: string;
  icon: React.ReactNode;
  description: string;
}
```

---

### Task 4: Create Main Cartridges Page Component

**Goal:** Tab-based container matching RevOS

**File:** `components/cartridges/cartridges-page.tsx`

```typescript
"use client"

import React, { useState } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import {
  Mic,
  Palette,
  SlidersHorizontal,
  FileText,
  Building2
} from "lucide-react"
import { VoiceTab } from "./tabs/voice-tab"
import { StyleTab } from "./tabs/style-tab"
import { PreferencesTab } from "./tabs/preferences-tab"
import { InstructionsTab } from "./tabs/instructions-tab"
import { BrandTab } from "./tabs/brand-tab"
import type { CartridgeType } from "@/types/cartridges"

const tabs = [
  { id: "voice" as const, label: "Voice", icon: Mic, description: "Tone and personality" },
  { id: "style" as const, label: "Style", icon: Palette, description: "Writing style preferences" },
  { id: "preferences" as const, label: "Preferences", icon: SlidersHorizontal, description: "Content preferences" },
  { id: "instructions" as const, label: "Instructions", icon: FileText, description: "AI behavior rules" },
  { id: "brand" as const, label: "Brand", icon: Building2, description: "Brand identity + Benson" },
]

export function CartridgesPage() {
  const [activeTab, setActiveTab] = useState<CartridgeType>("voice")

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Cartridges</h2>
        <p className="text-muted-foreground">
          Configure how the AI assistant communicates on your behalf.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CartridgeType)}>
        <TabsList className="grid w-full grid-cols-5">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="voice" className="mt-6">
          <VoiceTab />
        </TabsContent>

        <TabsContent value="style" className="mt-6">
          <StyleTab />
        </TabsContent>

        <TabsContent value="preferences" className="mt-6">
          <PreferencesTab />
        </TabsContent>

        <TabsContent value="instructions" className="mt-6">
          <InstructionsTab />
        </TabsContent>

        <TabsContent value="brand" className="mt-6">
          <BrandTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

---

### Task 5: Port Voice Tab Form

**Goal:** Port voice cartridge form from RevOS

**File:** `components/cartridges/tabs/voice-tab.tsx`

Port the voice form from RevOS, adapting to Linear design system:
- Read `revos/components/cartridges/cartridge-edit-form.tsx`
- Extract voice-related fields
- Use AudienceOS shadcn components

Key fields:
- Tone selector (formal, casual, professional, friendly)
- Style dropdown
- Personality tags (multiselect)
- Vocabulary level
- Content preferences (topics to emphasize/avoid)

---

### Task 6: Port Style Tab Form

**File:** `components/cartridges/tabs/style-tab.tsx`

Key fields:
- Writing style description
- Formality level (formal/casual/balanced)
- Sentence structure preference
- Paragraph length preference
- Emoji usage toggle
- Hashtag usage toggle

---

### Task 7: Port Preferences Tab Form

**File:** `components/cartridges/tabs/preferences-tab.tsx`

Key fields:
- Posting frequency
- Best times for posting
- Content mix sliders (educational/promotional/engagement/personal)

---

### Task 8: Port Instructions Tab Form

**File:** `components/cartridges/tabs/instructions-tab.tsx`

Key fields:
- "Always do" list (add/remove items)
- "Never do" list (add/remove items)
- Response guidelines
- Escalation triggers

---

### Task 9: Port Brand Tab (with Benson Blueprint)

**File:** `components/cartridges/tabs/brand-tab.tsx`

**CRITICAL:** This includes the 112-point Benson Blueprint generator.

Key fields:
- Company name, tagline, mission
- Core values (array)
- Target audience
- USPs (array)
- Brand voice description
- "Generate Benson Blueprint" button
- Blueprint preview/editor

---

### Task 10: Wire Into Intelligence Center

**Goal:** Connect cartridges page to nav

**File:** `components/views/intelligence-center.tsx`

Replace the placeholder cartridges section:

```typescript
import { CartridgesPage } from "@/components/cartridges"

// In the component:
{activeSection === "cartridges" && (
  <SettingsContentSection title="Cartridges">
    <CartridgesPage />
  </SettingsContentSection>
)}
```

---

### Task 11: Commit and Push

```bash
git add types/cartridges.ts
git add components/cartridges/
git add components/views/intelligence-center.tsx
git commit -m "feat(cartridges): port 5-tab cartridge system from RevOS

- Voice cartridge (tone, style, personality)
- Style cartridge (writing preferences)
- Preferences cartridge (content mix)
- Instructions cartridge (AI rules)
- Brand cartridge with 112-point Benson Blueprint

Ported ~2300 lines from RevOS with Linear design system.

Part of: 3-System Consolidation"

git push origin feat/cartridges-port
```

---

## Output When Complete

```
CC2 COMPLETE
- Task 1: ✓ Created cartridges directory structure
- Task 2: ✓ Analyzed RevOS cartridge types
- Task 3: ✓ Created types/cartridges.ts
- Task 4: ✓ Created cartridges-page.tsx with tabs
- Task 5: ✓ Ported voice-tab.tsx
- Task 6: ✓ Ported style-tab.tsx
- Task 7: ✓ Ported preferences-tab.tsx
- Task 8: ✓ Ported instructions-tab.tsx
- Task 9: ✓ Ported brand-tab.tsx with Benson Blueprint
- Task 10: ✓ Wired into Intelligence Center
- Task 11: ✓ Committed and pushed
- Branch: feat/cartridges-port
- Ready for: Merge with CC3, then CC4
```

---

## Recovery

If resuming:
1. Check branch: `git branch | grep cartridges`
2. Check which tab files exist in `components/cartridges/tabs/`
3. Resume from first missing tab
4. Test each tab in browser after creation

---

*Part of 3-System Consolidation - See 00-MANIFEST.md*
