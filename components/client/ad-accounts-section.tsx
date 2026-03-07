"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Plus, Unlink, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  useClientAdAccounts,
  useLinkAdAccount,
  useUnlinkAdAccount,
  type AdAccountMapping,
} from "@/hooks/use-client-ad-accounts"

const platformLabels: Record<string, string> = {
  google_ads: "Google Ads",
  meta_ads: "Meta Ads",
}

const platformColors: Record<string, string> = {
  google_ads: "bg-blue-500",
  meta_ads: "bg-indigo-500",
}

const platformPlaceholders: Record<string, string> = {
  google_ads: "e.g., 123-456-7890",
  meta_ads: "e.g., act_12345678 or 12345678",
}

const platformHelpText: Record<string, string> = {
  google_ads: "Find this in Google Ads → Settings → Account Access → Customer ID (format: XXX-XXX-XXXX)",
  meta_ads: "Find this in Meta Business Manager → Ad Accounts → Account ID (starts with act_)",
}

function validateAccountId(platform: string, id: string): string | null {
  const trimmed = id.trim()
  if (!trimmed) return "Account ID is required"
  if (platform === "google_ads") {
    const normalized = trimmed.replace(/-/g, "")
    if (!/^\d{10}$/.test(normalized)) {
      return "Google Ads Customer ID must be 10 digits (e.g., 123-456-7890)"
    }
  }
  if (platform === "meta_ads") {
    const normalized = trimmed.replace(/^act_/, "")
    if (!/^\d+$/.test(normalized)) {
      return "Meta Ad Account ID must be numeric (e.g., act_12345678)"
    }
  }
  return null
}

interface AdAccountsSectionProps {
  clientId: string
  className?: string
}

export function AdAccountsSection({ clientId, className }: AdAccountsSectionProps) {
  const { data: accounts, isLoading } = useClientAdAccounts(clientId)
  const linkMutation = useLinkAdAccount(clientId)
  const unlinkMutation = useUnlinkAdAccount(clientId)

  const [showForm, setShowForm] = useState(false)
  const [newPlatform, setNewPlatform] = useState<string>("google_ads")
  const [newAccountId, setNewAccountId] = useState("")
  const [validationError, setValidationError] = useState<string | null>(null)

  const activeAccounts = accounts?.filter((a) => a.is_active) || []

  const handleLink = async () => {
    const error = validateAccountId(newPlatform, newAccountId)
    if (error) {
      setValidationError(error)
      return
    }
    setValidationError(null)

    // Normalize the ID before sending
    let normalizedId = newAccountId.trim()
    if (newPlatform === "google_ads") {
      normalizedId = normalizedId.replace(/-/g, "")
    }

    try {
      await linkMutation.mutateAsync({
        platform: newPlatform,
        external_account_id: normalizedId,
      })
      setNewAccountId("")
      setShowForm(false)
    } catch {
      // Error handled by mutation state
    }
  }

  const handleUnlink = async (mapping: AdAccountMapping) => {
    try {
      await unlinkMutation.mutateAsync(mapping.id)
    } catch {
      // Error handled by mutation state
    }
  }

  if (isLoading) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-40 bg-muted rounded" />
          <div className="h-12 w-full bg-muted rounded" />
        </div>
      </Card>
    )
  }

  return (
    <Card className={cn("p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Linked Ad Accounts
        </h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Link Account
        </Button>
      </div>

      {/* Link form */}
      {showForm && (
        <div className="mb-4 p-4 rounded-lg border border-border bg-secondary/30 space-y-3">
          <div className="flex gap-2">
            <select
              value={newPlatform}
              onChange={(e) => { setNewPlatform(e.target.value); setValidationError(null) }}
              className="bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground"
            >
              <option value="google_ads">Google Ads</option>
              <option value="meta_ads">Meta Ads</option>
            </select>
            <Input
              placeholder={platformPlaceholders[newPlatform] || "Account ID"}
              value={newAccountId}
              onChange={(e) => { setNewAccountId(e.target.value); setValidationError(null) }}
              className={cn("flex-1", validationError && "border-rose-500")}
              onKeyDown={(e) => e.key === "Enter" && handleLink()}
            />
            <Button
              size="sm"
              onClick={handleLink}
              disabled={linkMutation.isPending || !newAccountId.trim()}
            >
              {linkMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Link"
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setShowForm(false); setNewAccountId(""); setValidationError(null) }}
            >
              Cancel
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {platformHelpText[newPlatform]}
          </p>
          {validationError && (
            <p className="text-xs text-rose-500">{validationError}</p>
          )}
          {linkMutation.isError && (
            <p className="text-xs text-rose-500">{linkMutation.error.message}</p>
          )}
        </div>
      )}

      {/* Account list */}
      {activeAccounts.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground">
          <p className="text-sm">No ad accounts linked yet.</p>
          <p className="text-xs mt-1">Link a Google Ads or Meta Ads account to view performance data.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activeAccounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "w-2.5 h-2.5 rounded-full",
                    platformColors[account.platform] || "bg-zinc-500"
                  )}
                />
                <div>
                  <span className="text-sm font-medium text-foreground">
                    {platformLabels[account.platform] || account.platform}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2 font-mono">
                    {account.external_account_id}
                  </span>
                </div>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-emerald-500 border-emerald-500/30">
                  Active
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleUnlink(account)}
                disabled={unlinkMutation.isPending}
                className="text-muted-foreground hover:text-rose-500"
              >
                {unlinkMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Unlink className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          ))}
        </div>
      )}

      {unlinkMutation.isError && (
        <p className="text-xs text-rose-500 mt-2">{unlinkMutation.error.message}</p>
      )}
    </Card>
  )
}
