"use client"

import { SettingsLayout, SettingsContent } from "@/components/settings"

interface SettingsViewProps {
  onBack?: () => void
}

export function SettingsView({ onBack }: SettingsViewProps) {
  return (
    <SettingsLayout onBack={onBack}>
      <SettingsContent />
    </SettingsLayout>
  )
}
