"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { useSettingsStore } from "@/stores/settings-store"
import { useAuthStore } from "@/lib/store"
import { CheckCircle2, Loader2 } from "lucide-react"
import type { AgencySettings } from "@/types/settings"

// Common timezones
const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Phoenix", label: "Arizona (AZ)" },
  { value: "America/Anchorage", label: "Alaska (AK)" },
  { value: "Pacific/Honolulu", label: "Hawaii (HI)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST)" },
]

// Default agency settings for demo
const DEFAULT_AGENCY: AgencySettings = {
  id: "demo-agency",
  name: "Acme Marketing Agency",
  slug: "acme-marketing",
  logo_url: null,
  domain: "acme-marketing.com",
  timezone: "America/New_York",
  business_hours: {
    start: "09:00",
    end: "17:00",
    days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  },
  pipeline_stages: ["Onboarding", "Installation", "Audit", "Live", "Needs Support", "Off-Boarding"],
  health_thresholds: {
    yellow_days: 7,
    red_days: 14,
  },
}

// Setting row component - matches Linear pattern
function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between py-4 border-b border-gray-100 last:border-0">
      <div className="flex-1 pr-8">
        <h4 className="text-sm font-medium text-gray-900">{label}</h4>
        {description && (
          <p className="text-sm text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

export function AgencyProfileSection() {
  const { toast } = useToast()
  const { user } = useAuthStore()
  const {
    agencySettings,
    setAgencySettings,
    updateAgencySettings,
    isLoadingAgency,
    isSavingAgency,
    setSavingAgency,
    setHasUnsavedChanges,
  } = useSettingsStore()

  const isAdmin = user?.role === "admin"

  // Local form state
  const [formData, setFormData] = useState<Partial<AgencySettings>>({})
  const [autoSave, setAutoSave] = useState(true)

  // Initialize with default data if no settings loaded
  useEffect(() => {
    if (!agencySettings) {
      setAgencySettings(DEFAULT_AGENCY)
    }
  }, [agencySettings, setAgencySettings])

  // Sync form data with store
  useEffect(() => {
    if (agencySettings) {
      setFormData(agencySettings)
    }
  }, [agencySettings])

  const handleInputChange = (field: keyof AgencySettings, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setHasUnsavedChanges(true)
  }

  const handleBusinessHoursChange = (field: "start" | "end", value: string) => {
    setFormData((prev) => ({
      ...prev,
      business_hours: {
        ...(prev.business_hours || { start: "09:00", end: "17:00", days: [] }),
        [field]: value,
      },
    }))
    setHasUnsavedChanges(true)
  }

  const handleSave = async () => {
    setSavingAgency(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    updateAgencySettings(formData)
    setHasUnsavedChanges(false)
    setSavingAgency(false)
    toast({
      title: "Settings saved",
      description: "Agency profile has been updated successfully.",
    })
  }

  if (isLoadingAgency) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div>
      {/* Page Header - Linear Style */}
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">General</h1>
        <p className="text-gray-600">Manage your agency settings and preferences.</p>
      </header>

      {/* Settings Sections */}
      <div className="space-y-8">
        {/* Agency Information */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Agency Information</h3>

          <SettingRow
            label="Agency name"
            description="The name of your agency as it appears across the platform."
          >
            <Input
              value={formData.name || ""}
              onChange={(e) => handleInputChange("name", e.target.value)}
              disabled={!isAdmin}
              className="w-64 bg-white border-gray-300"
            />
          </SettingRow>

          <SettingRow
            label="URL slug"
            description="Your agency's unique identifier in URLs."
          >
            <Input
              value={formData.slug || ""}
              onChange={(e) => handleInputChange("slug", e.target.value)}
              disabled={!isAdmin}
              className="w-64 bg-white border-gray-300"
            />
          </SettingRow>

          <SettingRow
            label="Custom domain"
            description="Your agency's custom domain for the platform."
          >
            <Input
              value={formData.domain || ""}
              onChange={(e) => handleInputChange("domain", e.target.value)}
              disabled={!isAdmin}
              placeholder="youragency.com"
              className="w-64 bg-white border-gray-300"
            />
          </SettingRow>
        </section>

        {/* Timezone & Hours */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Timezone & Business Hours</h3>

          <SettingRow
            label="Timezone"
            description="Set your agency's primary timezone for scheduling and reports."
          >
            <Select
              value={formData.timezone}
              onValueChange={(value) => handleInputChange("timezone", value)}
              disabled={!isAdmin}
            >
              <SelectTrigger className="w-64 bg-white border-gray-300">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingRow>

          <SettingRow
            label="Business hours start"
            description="When your agency's business day begins."
          >
            <Input
              type="time"
              value={formData.business_hours?.start || "09:00"}
              onChange={(e) => handleBusinessHoursChange("start", e.target.value)}
              disabled={!isAdmin}
              className="w-32 bg-white border-gray-300"
            />
          </SettingRow>

          <SettingRow
            label="Business hours end"
            description="When your agency's business day ends."
          >
            <Input
              type="time"
              value={formData.business_hours?.end || "17:00"}
              onChange={(e) => handleBusinessHoursChange("end", e.target.value)}
              disabled={!isAdmin}
              className="w-32 bg-white border-gray-300"
            />
          </SettingRow>
        </section>

        {/* Preferences */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Preferences</h3>

          <SettingRow
            label="Auto-save changes"
            description="Automatically save changes as you make them."
          >
            <Switch
              checked={autoSave}
              onCheckedChange={setAutoSave}
            />
          </SettingRow>
        </section>
      </div>

      {/* Action Buttons */}
      {isAdmin && !autoSave && (
        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={() => {
              if (agencySettings) {
                setFormData(agencySettings)
                setHasUnsavedChanges(false)
              }
            }}
            disabled={isSavingAgency}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSavingAgency}>
            {isSavingAgency ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
