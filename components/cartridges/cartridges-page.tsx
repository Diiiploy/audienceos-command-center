"use client"

import React from "react"
import { VoiceTab } from "./tabs/voice-tab"

// Future feature: Additional cartridge tabs (Style, Preferences, Instructions, Brand)
// These were ported from RevOS and will be wired up in a later phase.
// When ready, re-enable tab navigation and import these components:
// import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
// import { Palette, SlidersHorizontal, FileText, Building2 } from "lucide-react"
// import { StyleTab } from "./tabs/style-tab"
// import { PreferencesTab } from "./tabs/preferences-tab"
// import { InstructionsTab } from "./tabs/instructions-tab"
// import { BrandTab } from "./tabs/brand-tab"
// import type { CartridgeType } from "@/types/cartridges"
//
// const tabs = [
//   { id: "voice" as const, label: "Voice", icon: Mic, description: "Tone and personality" },
//   { id: "style" as const, label: "Style", icon: Palette, description: "Writing style preferences" },
//   { id: "preferences" as const, label: "Preferences", icon: SlidersHorizontal, description: "Content preferences" },
//   { id: "instructions" as const, label: "Instructions", icon: FileText, description: "AI behavior rules" },
//   { id: "brand" as const, label: "Brand", icon: Building2, description: "Brand identity + Benson" },
// ]

export function CartridgesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">AI Voice Settings</h2>
        <p className="text-muted-foreground">
          Configure how the AI communicates on your behalf.
        </p>
      </div>

      <VoiceTab />
    </div>
  )
}
