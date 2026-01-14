"use client"

import React, { useState, useMemo, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"
import { VerticalPageLayout, VerticalSection } from "@/components/linear/vertical-section"
import { Search, Check, AlertCircle, Clock, ExternalLink, Settings2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { integrationIcons } from "@/components/linear/integration-card"
import { IntegrationSettingsModal } from "@/components/linear/integration-settings-modal"
import { IntegrationConnectModal } from "@/components/linear/integration-connect-modal"
import { useIntegrations } from "@/hooks/use-integrations"
import { toast } from "sonner"
import type { Database } from "@/types/database"

type DbIntegration = Database['public']['Tables']['integration']['Row']
type IntegrationProvider = Database['public']['Enums']['integration_provider']

type IntegrationStatus = "connected" | "disconnected" | "error" | "syncing"
type IntegrationCategory = "advertising" | "communication" | "analytics" | "crm" | "productivity"

interface Integration {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  color: string
  category: IntegrationCategory
  status: IntegrationStatus
  lastSync?: string
  accounts?: number
}

// Integration metadata for all 8 integrations (4 MVP + 4 future)
interface IntegrationMetadata {
  name: string
  description: string
  icon: React.ReactNode
  color: string
  category: IntegrationCategory
}

const integrationMetadata: Record<IntegrationProvider, IntegrationMetadata> = {
  slack: {
    name: "Slack",
    description: "Get notifications and send messages directly from your workspace",
    icon: integrationIcons.slack,
    color: "bg-[#4A154B]",
    category: "communication",
  },
  gmail: {
    name: "Gmail",
    description: "Sync client communications and track email threads",
    icon: integrationIcons.gmail,
    color: "bg-[#EA4335]",
    category: "communication",
  },
  google_ads: {
    name: "Google Ads",
    description: "Import campaign performance data and manage ad accounts",
    icon: integrationIcons.googleAds,
    color: "bg-[#4285F4]",
    category: "advertising",
  },
  meta_ads: {
    name: "Meta Ads",
    description: "Connect Facebook and Instagram ad accounts for unified reporting",
    icon: integrationIcons.meta,
    color: "bg-[#0866FF]",
    category: "advertising",
  },
}

// Future integrations (not in DB yet, shown as "disconnected")
const futureIntegrations: Integration[] = [
  {
    id: "google-analytics",
    name: "Google Analytics",
    description: "Import website analytics and conversion data",
    icon: integrationIcons.googleAnalytics,
    color: "bg-[#E37400]",
    category: "analytics",
    status: "disconnected",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Sync contacts, deals, and marketing data",
    icon: integrationIcons.hubspot,
    color: "bg-[#FF7A59]",
    category: "crm",
    status: "disconnected",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Link documentation and project notes",
    icon: integrationIcons.notion,
    color: "bg-[#000000]",
    category: "productivity",
    status: "disconnected",
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Automate workflows with 5,000+ apps",
    icon: integrationIcons.zapier,
    color: "bg-[#FF4A00]",
    category: "productivity",
    status: "disconnected",
  },
]

/**
 * Format last sync time as relative string
 */
function formatLastSync(lastSyncAt: string | null): string | undefined {
  if (!lastSyncAt) return undefined

  const now = new Date()
  const syncDate = new Date(lastSyncAt)
  const diffMs = now.getTime() - syncDate.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `${diffMins} min ago`

  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`

  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
}

/**
 * Map database integration to UI integration type
 */
function mapDbToUiIntegration(dbIntegration: DbIntegration): Integration {
  const metadata = integrationMetadata[dbIntegration.provider]

  // Determine status based on connection and last sync
  let status: IntegrationStatus = "disconnected"
  if (dbIntegration.is_connected) {
    // Check if sync is recent (within last 10 minutes = syncing)
    const lastSync = dbIntegration.last_sync_at ? new Date(dbIntegration.last_sync_at) : null
    const now = new Date()
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60000)

    if (lastSync && lastSync > tenMinutesAgo) {
      status = "syncing"
    } else {
      status = "connected"
    }
  }

  // Detect error status from config.error or expired token
  const config = dbIntegration.config as any
  if (config?.error) {
    status = "error"
  }

  return {
    id: dbIntegration.id,
    name: metadata.name,
    description: metadata.description,
    icon: metadata.icon,
    color: metadata.color,
    category: metadata.category,
    status,
    lastSync: formatLastSync(dbIntegration.last_sync_at),
    accounts: config?.account_count, // from integration config
  }
}

const statusConfig: Record<IntegrationStatus, { icon: React.ReactNode; label: string; className: string }> = {
  connected: {
    icon: <Check className="w-3 h-3" />,
    label: "Connected",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 backdrop-blur-sm",
  },
  disconnected: {
    icon: null,
    label: "Not connected",
    className: "bg-rose-500/8 text-rose-500/80 dark:text-rose-400/70 backdrop-blur-sm",
  },
  error: {
    icon: <AlertCircle className="w-3 h-3" />,
    label: "Error",
    className: "bg-red-500/15 text-red-600 dark:text-red-400 backdrop-blur-sm",
  },
  syncing: {
    icon: <Clock className="w-3 h-3 animate-spin" />,
    label: "Syncing",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 backdrop-blur-sm",
  },
}

interface IntegrationCardProps {
  integration: Integration
  onClick?: () => void
  onConnect?: (provider: string) => void
}

function IntegrationCardComponent({ integration, onClick, onConnect }: IntegrationCardProps) {
  const status = statusConfig[integration.status]

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.()
    }
  }

  const handleConnectClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onConnect?.(integration.id)
  }

  const showConnectButton = integration.status === "disconnected" || integration.status === "error"

  return (
    <div
      className="relative bg-card border border-border rounded-lg p-5 hover:border-primary/50 transition-colors cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Configure ${integration.name} integration`}
    >
      {/* Status badge - top right corner with glassmorphic style */}
      <span
        className={cn(
          "absolute top-3 right-3 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium",
          status.className
        )}
      >
        {status.icon}
        {status.label}
      </span>

      <div className="flex items-start gap-4">
        <div
          className={cn(
            "w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0",
            integration.color
          )}
        >
          {integration.icon}
        </div>
        <div className="flex-1 min-w-0 pr-20">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-foreground">{integration.name}</h3>
            <button
              className="p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              aria-label={`${integration.name} settings`}
              onClick={(e) => e.stopPropagation()}
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {integration.description}
          </p>
          {integration.accounts && integration.status === "connected" && (
            <p className="text-xs text-muted-foreground mb-3">
              {integration.accounts} account{integration.accounts > 1 ? "s" : ""} connected
            </p>
          )}
          {showConnectButton && (
            <Button
              size="sm"
              variant={integration.status === "error" ? "outline" : "secondary"}
              className="w-full"
              onClick={handleConnectClick}
            >
              {integration.status === "error" ? "Reconnect" : "Connect"}
            </Button>
          )}
          {integration.lastSync && integration.status !== "disconnected" && (
            <p className="text-xs text-muted-foreground mt-2">
              {integration.status === "syncing" ? "Syncing..." : `Last synced ${integration.lastSync}`}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Loading skeleton for integration cards
 */
function IntegrationCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-start gap-4">
        <Skeleton className="w-11 h-11 rounded-lg flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>
    </div>
  )
}

// Providers that need manual credential entry (not OAuth)
const credentialBasedProviders: IntegrationProvider[] = ['slack', 'google_ads', 'meta_ads']

export function IntegrationsHub() {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<IntegrationCategory | "all">("all")
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [connectingProvider, setConnectingProvider] = useState<IntegrationProvider | null>(null)

  // Fetch integrations from API
  const { integrations: dbIntegrations, isLoading, refetch } = useIntegrations()

  // Handle OAuth callback URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const success = params.get('success')
    const error = params.get('error')

    if (success) {
      toast.success(`${success} connected successfully!`)
      // Refetch integrations to update UI
      refetch()
      window.history.replaceState({}, '', window.location.pathname + '?view=integrations')
    }

    if (error) {
      toast.error(`Connection failed: ${error.replace(/_/g, ' ')}`)
      window.history.replaceState({}, '', window.location.pathname + '?view=integrations')
    }
  }, [refetch])

  // Handle Connect button click
  async function handleConnect(provider: string) {
    // Check if this provider needs credential entry modal
    if (credentialBasedProviders.includes(provider as IntegrationProvider)) {
      setConnectingProvider(provider as IntegrationProvider)
      return
    }

    // For OAuth-based providers (gmail), redirect to OAuth flow
    try {
      const res = await fetch('/api/v1/integrations', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })

      const { data, error } = await res.json()

      if (error) {
        toast.error(`Failed to initiate connection: ${error}`)
        return
      }

      if (data?.oauthUrl) {
        // Redirect to OAuth provider
        window.location.href = data.oauthUrl
      }
    } catch (err) {
      toast.error('Connection failed')
      console.error('Integration connection error:', err)
    }
  }

  // Handle successful credential connection
  function handleCredentialSuccess() {
    refetch()
  }

  // Merge DB integrations with future integrations (all 8)
  const allIntegrations = useMemo(() => {
    // Map DB integrations to UI format
    const mappedDb = dbIntegrations.map(mapDbToUiIntegration)

    // Create a set of connected provider IDs
    const connectedProviders = new Set(dbIntegrations.map(i => i.provider))

    // Add placeholder cards for MVP integrations not yet in DB
    const mvpProviders: IntegrationProvider[] = ['slack', 'gmail', 'google_ads', 'meta_ads']
    const missingMvp = mvpProviders
      .filter(provider => !connectedProviders.has(provider))
      .map(provider => {
        const metadata = integrationMetadata[provider]
        return {
          id: provider,
          name: metadata.name,
          description: metadata.description,
          icon: metadata.icon,
          color: metadata.color,
          category: metadata.category,
          status: 'disconnected' as IntegrationStatus,
        }
      })

    // Combine: DB integrations + missing MVP + future integrations
    return [...mappedDb, ...missingMvp, ...futureIntegrations]
  }, [dbIntegrations])

  // Filter integrations by search and category
  const filteredIntegrations = useMemo(() => {
    let result = allIntegrations

    if (categoryFilter !== "all") {
      result = result.filter((i) => i.category === categoryFilter)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(query) ||
          i.description.toLowerCase().includes(query)
      )
    }

    return result
  }, [allIntegrations, searchQuery, categoryFilter])

  const connectedCount = allIntegrations.filter((i) => i.status === "connected").length
  const errorCount = allIntegrations.filter((i) => i.status === "error").length

  const categories: { id: IntegrationCategory | "all"; label: string }[] = [
    { id: "all", label: "All" },
    { id: "advertising", label: "Advertising" },
    { id: "communication", label: "Communication" },
    { id: "analytics", label: "Analytics" },
    { id: "crm", label: "CRM" },
    { id: "productivity", label: "Productivity" },
  ]

  return (
    <VerticalPageLayout
      title="Integrations"
      description="Connect your tools and services to power your workflow"
    >
      {/* Stats */}
      <div className="flex items-center gap-6 mb-6">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">
            {connectedCount} connected
          </span>
        </div>
        {errorCount > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-muted-foreground">
              {errorCount} with errors
            </span>
          </div>
        )}
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary border-border"
          />
        </div>
        <div className="flex items-center gap-1 bg-secondary rounded-md p-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={cn(
                "px-3 py-1.5 rounded text-sm font-medium transition-colors cursor-pointer",
                categoryFilter === cat.id
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Integration grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <IntegrationCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredIntegrations.map((integration) => (
            <IntegrationCardComponent
              key={integration.id}
              integration={integration}
              onClick={() => setSelectedIntegration(integration)}
              onConnect={handleConnect}
            />
          ))}
        </div>
      )}

      {!isLoading && filteredIntegrations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Search className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">No integrations found</p>
        </div>
      )}

      {/* Request integration */}
      <VerticalSection
        title="Missing an integration?"
        description="Request a new integration to be added to the platform"
        className="mt-8"
      >
        <button className="inline-flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer">
          <ExternalLink className="w-4 h-4" />
          Request an integration
        </button>
      </VerticalSection>

      {/* Integration Settings Modal */}
      <IntegrationSettingsModal
        integration={selectedIntegration ? {
          id: selectedIntegration.id,
          name: selectedIntegration.name,
          provider: selectedIntegration.id, // provider ID matches integration ID for MVP
          status: selectedIntegration.status,
          lastSync: selectedIntegration.lastSync,
          accounts: selectedIntegration.accounts,
          icon: selectedIntegration.icon,
          color: selectedIntegration.color.replace('bg-[', '').replace(']', ''),
        } : null}
        isOpen={!!selectedIntegration}
        onClose={() => setSelectedIntegration(null)}
        onRefetch={refetch}
      />

      {/* Integration Connect Modal (for credential-based integrations) */}
      <IntegrationConnectModal
        provider={connectingProvider}
        isOpen={!!connectingProvider}
        onClose={() => setConnectingProvider(null)}
        onSuccess={handleCredentialSuccess}
        icon={connectingProvider ? integrationMetadata[connectingProvider]?.icon : undefined}
        color={connectingProvider ? integrationMetadata[connectingProvider]?.color.replace('bg-[', '').replace(']', '') : undefined}
      />
    </VerticalPageLayout>
  )
}
