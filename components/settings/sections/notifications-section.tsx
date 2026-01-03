"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useSettingsStore } from "@/stores/settings-store"
import { CheckCircle2, Loader2 } from "lucide-react"

// Setting row component - matches Linear pattern (same as agency-profile)
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

export function NotificationsSection() {
  const { toast } = useToast()
  const { setHasUnsavedChanges } = useSettingsStore()

  // Local form state
  const [isSaving, setIsSaving] = useState(false)
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [emailTickets, setEmailTickets] = useState(true)
  const [emailMentions, setEmailMentions] = useState(true)
  const [slackEnabled, setSlackEnabled] = useState(false)
  const [slackChannel, setSlackChannel] = useState("")
  const [digestMode, setDigestMode] = useState(false)
  const [digestTime, setDigestTime] = useState("08:00")
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false)
  const [quietStart, setQuietStart] = useState("22:00")
  const [quietEnd, setQuietEnd] = useState("08:00")

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsSaving(false)
    setHasUnsavedChanges(false)
    toast({
      title: "Settings saved",
      description: "Notification preferences have been updated.",
    })
  }

  const handleChange = () => {
    setHasUnsavedChanges(true)
  }

  return (
    <div>
      {/* Page Header - Linear Style */}
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Notifications</h1>
        <p className="text-gray-600">Configure how and when you receive alerts.</p>
      </header>

      {/* Settings Sections */}
      <div className="space-y-8">
        {/* Email Notifications */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Email Notifications</h3>

          <SettingRow
            label="Risk Alerts"
            description="Get notified when clients are flagged as at-risk."
          >
            <Switch
              checked={emailAlerts}
              onCheckedChange={(checked) => {
                setEmailAlerts(checked)
                handleChange()
              }}
            />
          </SettingRow>

          <SettingRow
            label="Support Tickets"
            description="Notifications for new and updated tickets."
          >
            <Switch
              checked={emailTickets}
              onCheckedChange={(checked) => {
                setEmailTickets(checked)
                handleChange()
              }}
            />
          </SettingRow>

          <SettingRow
            label="Mentions"
            description="When someone mentions you in a note or comment."
          >
            <Switch
              checked={emailMentions}
              onCheckedChange={(checked) => {
                setEmailMentions(checked)
                handleChange()
              }}
            />
          </SettingRow>
        </section>

        {/* Slack Notifications */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Slack Notifications</h3>

          <SettingRow
            label="Enable Slack"
            description="Send alerts to your connected Slack workspace."
          >
            <Switch
              checked={slackEnabled}
              onCheckedChange={(checked) => {
                setSlackEnabled(checked)
                handleChange()
              }}
            />
          </SettingRow>

          {slackEnabled && (
            <SettingRow
              label="Slack Channel"
              description="Enter the channel name or ID to receive notifications."
            >
              <Input
                value={slackChannel}
                onChange={(e) => {
                  setSlackChannel(e.target.value)
                  handleChange()
                }}
                placeholder="#alerts"
                className="w-48 bg-white border-gray-300"
              />
            </SettingRow>
          )}
        </section>

        {/* Daily Digest */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Daily Digest</h3>

          <SettingRow
            label="Enable Digest Mode"
            description="Bundle non-urgent notifications into a daily summary."
          >
            <Switch
              checked={digestMode}
              onCheckedChange={(checked) => {
                setDigestMode(checked)
                handleChange()
              }}
            />
          </SettingRow>

          {digestMode && (
            <SettingRow
              label="Delivery Time"
              description="When you want to receive your daily digest."
            >
              <Input
                type="time"
                value={digestTime}
                onChange={(e) => {
                  setDigestTime(e.target.value)
                  handleChange()
                }}
                className="w-32 bg-white border-gray-300"
              />
            </SettingRow>
          )}
        </section>

        {/* Quiet Hours */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Quiet Hours</h3>

          <SettingRow
            label="Enable Quiet Hours"
            description="No notifications will be sent during quiet hours."
          >
            <Switch
              checked={quietHoursEnabled}
              onCheckedChange={(checked) => {
                setQuietHoursEnabled(checked)
                handleChange()
              }}
            />
          </SettingRow>

          {quietHoursEnabled && (
            <>
              <SettingRow
                label="Start Time"
                description="When quiet hours begin."
              >
                <Input
                  type="time"
                  value={quietStart}
                  onChange={(e) => {
                    setQuietStart(e.target.value)
                    handleChange()
                  }}
                  className="w-32 bg-white border-gray-300"
                />
              </SettingRow>

              <SettingRow
                label="End Time"
                description="When quiet hours end."
              >
                <Input
                  type="time"
                  value={quietEnd}
                  onChange={(e) => {
                    setQuietEnd(e.target.value)
                    handleChange()
                  }}
                  className="w-32 bg-white border-gray-300"
                />
              </SettingRow>
            </>
          )}
        </section>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
        <Button
          variant="outline"
          onClick={() => {
            // Reset to defaults
            setEmailAlerts(true)
            setEmailTickets(true)
            setEmailMentions(true)
            setSlackEnabled(false)
            setDigestMode(false)
            setQuietHoursEnabled(false)
            setHasUnsavedChanges(false)
          }}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
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
    </div>
  )
}
