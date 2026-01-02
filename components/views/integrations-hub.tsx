"use client"

import React, { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { VerticalPageLayout, VerticalSection } from "@/components/linear/vertical-section"
import { Search, Check, AlertCircle, Clock, ExternalLink, Settings2 } from "lucide-react"
import { Input } from "@/components/ui/input"

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

// Integration icons as SVG components
const SlackIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
  </svg>
)

const GmailIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
  </svg>
)

const GoogleAdsIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
    <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h5V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h5v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-5v1.9h5c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-5V17h5c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/>
  </svg>
)

const MetaIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
    <path d="M12 2.04c-5.5 0-10 4.49-10 10.02 0 5 3.66 9.15 8.44 9.9v-7H7.9v-2.9h2.54V9.85c0-2.51 1.49-3.89 3.78-3.89 1.09 0 2.23.19 2.23.19v2.47h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.45 2.9h-2.33v7a10 10 0 0 0 8.44-9.9c0-5.53-4.5-10.02-10-10.02z"/>
  </svg>
)

const GoogleAnalyticsIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
    <path d="M22.84 2.9982v17.9987c.0086.7916-.6248 1.4397-1.4164 1.4483-.1447.0016-.2893-.0186-.4279-.0597l.0019.0052c-.5765-.1736-1.0274-.6299-1.1903-1.2044-.0247-.0865-.0405-.1756-.0473-.2654V3.0769c-.0037-.7916.6349-1.4346 1.4265-1.4383.087-.0004.1739.0078.2591.0244.6837.1319 1.2212.6746 1.3944 1.407v-.0718zM12.7142 6.8782v14.0987c-.0298.7806-.6742 1.3957-1.4549 1.3889-.136.0012-.2713-.0177-.4008-.0558-.5765-.1736-1.0274-.6299-1.1903-1.2044-.0247-.0865-.0405-.1756-.0473-.2654V6.9587c-.0037-.7916.6349-1.4346 1.4265-1.4383.087-.0004.1739.0078.2591.0244.6932.1336 1.2364.6928 1.4077 1.4495v-.1161zM2.5765 14.7482v6.2287c-.0298.7806-.6742 1.3957-1.4549 1.3889-.136.0012-.2713-.0177-.4008-.0558-.5765-.1736-1.0274-.6299-1.1903-1.2044-.0247-.0865-.0405-.1756-.0473-.2654V14.833c-.0037-.7916.6349-1.4346 1.4265-1.4383.087-.0004.1739.0078.2591.0244.6932.1336 1.2364.6928 1.4077 1.4495v-.1204z"/>
  </svg>
)

const HubSpotIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
    <path d="M18.164 7.93V5.084a2.198 2.198 0 001.267-1.984v-.066A2.198 2.198 0 0017.23.836h-.065a2.198 2.198 0 00-2.198 2.198v.066c0 .907.55 1.685 1.333 2.016v2.788a5.854 5.854 0 00-2.56 1.08l-8.292-6.46a2.641 2.641 0 10-1.282 1.637l8.03 6.257a5.878 5.878 0 00-.423 2.2 5.878 5.878 0 00.483 2.343l-2.499 2.498a2.199 2.199 0 00-2.835 2.098v.066a2.199 2.199 0 002.199 2.198h.065a2.199 2.199 0 002.199-2.198v-.066c0-.384-.099-.745-.272-1.058l2.433-2.433a5.863 5.863 0 103.456-9.066z"/>
  </svg>
)

const NotionIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
    <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.98-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.823 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.934-.56.934-1.167V6.354c0-.606-.233-.933-.746-.886l-15.177.887c-.56.046-.747.326-.747.933zm14.337.745c.093.42 0 .84-.42.887l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.747 0-.934-.234-1.495-.933l-4.577-7.186v6.952l1.448.327s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.886.747-.933l3.222-.186zM2.8.186l13.402-.84c1.634-.14 2.054-.046 3.082.7l4.25 2.986c.7.514.934.654.934 1.214v16.423c0 1.026-.374 1.634-1.68 1.727l-15.458.933c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.153c0-.84.374-1.54 1.354-1.967z"/>
  </svg>
)

const ZapierIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm4.5 7.5h-4.25L12 5l-.25 2.5H7.5L9.75 10l-2.25 2.5h4.25L12 15l.25-2.5h4.25L14.25 10l2.25-2.5z"/>
  </svg>
)

const mockIntegrations: Integration[] = [
  {
    id: "slack",
    name: "Slack",
    description: "Get notifications and send messages directly from your workspace",
    icon: <SlackIcon />,
    color: "bg-[#4A154B]",
    category: "communication",
    status: "connected",
    lastSync: "2 min ago",
    accounts: 3,
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Sync client communications and track email threads",
    icon: <GmailIcon />,
    color: "bg-[#EA4335]",
    category: "communication",
    status: "connected",
    lastSync: "5 min ago",
    accounts: 2,
  },
  {
    id: "google-ads",
    name: "Google Ads",
    description: "Import campaign performance data and manage ad accounts",
    icon: <GoogleAdsIcon />,
    color: "bg-[#4285F4]",
    category: "advertising",
    status: "connected",
    lastSync: "1 hour ago",
    accounts: 8,
  },
  {
    id: "meta-ads",
    name: "Meta Ads",
    description: "Connect Facebook and Instagram ad accounts for unified reporting",
    icon: <MetaIcon />,
    color: "bg-[#0866FF]",
    category: "advertising",
    status: "connected",
    lastSync: "30 min ago",
    accounts: 5,
  },
  {
    id: "google-analytics",
    name: "Google Analytics",
    description: "Import website analytics and conversion data",
    icon: <GoogleAnalyticsIcon />,
    color: "bg-[#E37400]",
    category: "analytics",
    status: "syncing",
    lastSync: "Syncing...",
    accounts: 12,
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Sync contacts, deals, and marketing data",
    icon: <HubSpotIcon />,
    color: "bg-[#FF7A59]",
    category: "crm",
    status: "disconnected",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Link documentation and project notes",
    icon: <NotionIcon />,
    color: "bg-[#000000]",
    category: "productivity",
    status: "error",
    lastSync: "Failed 2 hours ago",
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Automate workflows with 5,000+ apps",
    icon: <ZapierIcon />,
    color: "bg-[#FF4A00]",
    category: "productivity",
    status: "disconnected",
  },
]

const statusConfig: Record<IntegrationStatus, { icon: React.ReactNode; label: string; className: string }> = {
  connected: {
    icon: <Check className="w-3.5 h-3.5" />,
    label: "Connected",
    className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
  disconnected: {
    icon: null,
    label: "Not connected",
    className: "bg-muted text-muted-foreground border-border",
  },
  error: {
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    label: "Error",
    className: "bg-red-500/10 text-red-500 border-red-500/20",
  },
  syncing: {
    icon: <Clock className="w-3.5 h-3.5 animate-spin" />,
    label: "Syncing",
    className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
}

const categoryLabels: Record<IntegrationCategory, string> = {
  advertising: "Advertising",
  communication: "Communication",
  analytics: "Analytics",
  crm: "CRM",
  productivity: "Productivity",
}

interface IntegrationCardProps {
  integration: Integration
  onClick?: () => void
}

function IntegrationCardComponent({ integration, onClick }: IntegrationCardProps) {
  const status = statusConfig[integration.status]

  return (
    <div
      className="bg-card border border-border rounded-lg p-5 hover:border-primary/50 transition-colors cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0",
            integration.color
          )}
        >
          {integration.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-medium text-foreground">{integration.name}</h3>
            <button className="p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {integration.description}
          </p>
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded border font-medium",
                status.className
              )}
            >
              {status.icon}
              {status.label}
            </span>
            {integration.accounts && integration.status === "connected" && (
              <span className="text-xs text-muted-foreground">
                {integration.accounts} account{integration.accounts > 1 ? "s" : ""}
              </span>
            )}
          </div>
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

export function IntegrationsHub() {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<IntegrationCategory | "all">("all")

  const filteredIntegrations = useMemo(() => {
    let result = mockIntegrations

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
  }, [searchQuery, categoryFilter])

  const connectedCount = mockIntegrations.filter((i) => i.status === "connected").length
  const errorCount = mockIntegrations.filter((i) => i.status === "error").length

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
                "px-3 py-1.5 rounded text-sm font-medium transition-colors",
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredIntegrations.map((integration) => (
          <IntegrationCardComponent
            key={integration.id}
            integration={integration}
            onClick={() => console.log("Configure", integration.name)}
          />
        ))}
      </div>

      {filteredIntegrations.length === 0 && (
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
        <button className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
          <ExternalLink className="w-4 h-4" />
          Request an integration
        </button>
      </VerticalSection>
    </VerticalPageLayout>
  )
}
