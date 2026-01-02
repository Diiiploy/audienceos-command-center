"use client"

import type React from "react"
import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings, CheckCircle2, XCircle, RefreshCw, ExternalLink, Building2, Users, Loader2, Zap } from "lucide-react"
import { cn } from "@/lib/utils"
import { useIntegrationsStore, type IntegrationWithMeta } from "@/lib/store"
import type { IntegrationProvider } from "@/types/database"
import { INTEGRATION_META } from "@/lib/integrations/mcp-fallback"

// Provider icons
function SlackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
    </svg>
  )
}

function GmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
    </svg>
  )
}

function MetaIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.239.76-.896 1.395-1.86 1.996-2.593l.992 1.393c.481.673 1.064 1.358 1.72 2.038 1.252 1.297 2.375 1.986 3.68 1.986 1.776 0 2.898-.768 3.594-1.927.245-.392.476-.903.627-1.621.136-.604.21-1.267.21-1.973 0-2.566-.703-5.24-2.044-7.306-1.188-1.833-2.903-3.113-4.871-3.113-.87 0-1.712.26-2.477.723-.652.39-1.27.928-1.834 1.608-.564-.68-1.181-1.217-1.834-1.608-.765-.463-1.606-.723-2.477-.723z" />
    </svg>
  )
}

function GoogleAdsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
    </svg>
  )
}

const PROVIDER_ICONS: Record<IntegrationProvider, React.ReactNode> = {
  slack: <SlackIcon className="h-6 w-6 text-[#4A154B]" />,
  gmail: <GmailIcon className="h-6 w-6 text-rose-500" />,
  google_ads: <GoogleAdsIcon className="h-6 w-6 text-amber-500" />,
  meta_ads: <MetaIcon className="h-6 w-6 text-blue-500" />,
}

interface ConfigModalState {
  isOpen: boolean
  integration: IntegrationWithMeta | null
}

export function IntegrationsView() {
  const { toast } = useToast()
  const [scopeView, setScopeView] = useState<"agency" | "client">("agency")

  // Zustand store
  const {
    integrations,
    isLoading,
    isTesting,
    isSyncing,
    setIntegrations,
    setLoading,
    setTesting,
    setSyncing,
    updateIntegration,
    setIntegrationStatus,
  } = useIntegrationsStore()

  const [configModal, setConfigModal] = useState<ConfigModalState>({
    isOpen: false,
    integration: null,
  })
  const [connectionTested, setConnectionTested] = useState(false)

  // Fetch integrations on mount
  const fetchIntegrations = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/v1/integrations')
      if (!response.ok) {
        throw new Error('Failed to fetch integrations')
      }
      const { data } = await response.json()
      setIntegrations(data || [])
    } catch (error) {
      console.error('Error fetching integrations:', error)
      toast({
        title: "Error",
        description: "Failed to load integrations",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [setIntegrations, setLoading, toast])

  useEffect(() => {
    fetchIntegrations()
  }, [fetchIntegrations])

  // Check URL params for OAuth callback results
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const success = params.get('success')
    const error = params.get('error')

    if (success) {
      toast({
        title: "Connected!",
        description: `${success} integration connected successfully`,
      })
      fetchIntegrations()
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    }

    if (error) {
      toast({
        title: "Connection Failed",
        description: error.replace(/_/g, ' '),
        variant: "destructive",
      })
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [toast, fetchIntegrations])

  // Connect integration (initiate OAuth)
  const handleConnect = async (provider: IntegrationProvider) => {
    try {
      const response = await fetch('/api/v1/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })

      const { data, error } = await response.json()

      if (error) {
        toast({
          title: "Error",
          description: error,
          variant: "destructive",
        })
        return
      }

      // Redirect to OAuth URL
      if (data.oauthUrl) {
        window.location.href = data.oauthUrl
      }
    } catch (error) {
      console.error('Connect error:', error)
      toast({
        title: "Error",
        description: "Failed to initiate connection",
        variant: "destructive",
      })
    }
  }

  // Disconnect integration
  const handleDisconnect = async (id: string) => {
    try {
      const response = await fetch(`/api/v1/integrations/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to disconnect')
      }

      toast({
        title: "Disconnected",
        description: "Integration has been disconnected",
      })

      fetchIntegrations()
    } catch (error) {
      console.error('Disconnect error:', error)
      toast({
        title: "Error",
        description: "Failed to disconnect integration",
        variant: "destructive",
      })
    }
  }

  // Test connection
  const handleTestConnection = async (id: string) => {
    setTesting(id, true)
    try {
      const response = await fetch(`/api/v1/integrations/${id}/test`, {
        method: 'POST',
      })

      const { data } = await response.json()

      if (data.status === 'healthy') {
        toast({
          title: "Connection Healthy",
          description: `Response time: ${data.responseTime}ms`,
        })
        setConnectionTested(true)
      } else {
        toast({
          title: "Connection Issue",
          description: data.suggestedAction || data.error,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Test connection error:', error)
      toast({
        title: "Test Failed",
        description: "Unable to test connection",
        variant: "destructive",
      })
    } finally {
      setTesting(id, false)
    }
  }

  // Trigger sync
  const handleSync = async (id: string) => {
    setSyncing(id, true)
    try {
      const response = await fetch(`/api/v1/integrations/${id}/sync`, {
        method: 'POST',
      })

      const { data, error } = await response.json()

      if (error) {
        throw new Error(error)
      }

      toast({
        title: "Sync Complete",
        description: data.message,
      })

      updateIntegration(id, { last_sync_at: data.syncedAt })
    } catch (error) {
      console.error('Sync error:', error)
      toast({
        title: "Sync Failed",
        description: "Unable to sync integration",
        variant: "destructive",
      })
    } finally {
      setSyncing(id, false)
    }
  }

  const openConfigModal = (integration: IntegrationWithMeta) => {
    setConfigModal({ isOpen: true, integration })
    setConnectionTested(false)
  }

  // Format relative time
  const formatRelativeTime = (dateString: string | null) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} min ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  // All available providers (even if not connected)
  const allProviders: IntegrationProvider[] = ['slack', 'gmail', 'google_ads', 'meta_ads']

  // Build display list with connected + available
  const displayIntegrations = allProviders.map(provider => {
    const existing = integrations.find(i => i.provider === provider)
    const meta = INTEGRATION_META[provider]

    if (existing) {
      return {
        ...existing,
        name: meta.name,
        description: meta.description,
        icon: PROVIDER_ICONS[provider],
        supportsMcpFallback: meta.supportsMcpFallback,
        mcpFallbackNote: meta.mcpFallbackNote,
      }
    }

    // Not connected - show as available
    return {
      id: `available-${provider}`,
      provider,
      name: meta.name,
      description: meta.description,
      icon: PROVIDER_ICONS[provider],
      is_connected: false,
      status: 'disconnected' as const,
      syncStatus: 'idle' as const,
      supportsMcpFallback: meta.supportsMcpFallback,
      mcpFallbackNote: meta.mcpFallbackNote,
      last_sync_at: null,
      agency_id: '',
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      config: null,
      created_at: '',
      updated_at: '',
    }
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Integrations</h1>
          <p className="text-[12px] text-muted-foreground">Manage your connected services and sync settings</p>
        </div>

        <div className="flex items-center bg-secondary rounded-md p-0.5">
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-7 px-2 gap-1.5 text-[11px]", scopeView === "agency" && "bg-background")}
            onClick={() => setScopeView("agency")}
          >
            <Building2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Agency View</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-7 px-2 gap-1.5 text-[11px]", scopeView === "client" && "bg-background")}
            onClick={() => setScopeView("client")}
          >
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Client View</span>
          </Button>
        </div>
      </div>

      {/* Integration List - Linear Style */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-[11px] font-medium">Connected Services</CardTitle>
          <CardDescription className="text-[10px]">Manage your integrations</CardDescription>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="divide-y divide-border">
            {displayIntegrations.map((integration) => {
              const isConnected = integration.is_connected
              const isTestingThis = isTesting[integration.id] || false
              const isSyncingThis = isSyncing[integration.id] || false
              const isAvailable = integration.id.startsWith('available-')

              return (
                <div
                  key={integration.id}
                  className={cn(
                    "flex items-center justify-between py-2.5 px-3 transition-colors",
                    isConnected && "cursor-pointer hover:bg-secondary/50",
                  )}
                  onClick={() => isConnected && openConfigModal(integration as IntegrationWithMeta)}
                >
                  {/* Left: Icon + Content */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex-shrink-0 w-8 h-8 rounded-md bg-secondary flex items-center justify-center">
                      {integration.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium text-foreground">{integration.name}</span>
                        {integration.supportsMcpFallback && !isConnected && (
                          <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                            <Zap className="h-2 w-2" />
                            MCP
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {isConnected
                          ? `Last sync: ${formatRelativeTime(integration.last_sync_at)}`
                          : integration.description}
                      </p>
                    </div>
                  </div>

                  {/* Right: Status + Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Status indicator */}
                    <div className="flex items-center gap-1.5">
                      {isConnected ? (
                        <>
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[10px] text-muted-foreground hidden sm:inline">Connected</span>
                        </>
                      ) : (
                        <span className="text-[10px] text-muted-foreground hidden sm:inline">Not connected</span>
                      )}
                    </div>

                    {/* Actions */}
                    {isConnected ? (
                      <div className="flex items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={isSyncingThis}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSync(integration.id)
                          }}
                        >
                          <RefreshCw className={cn("h-3 w-3", isSyncingThis && "animate-spin")} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation()
                            openConfigModal(integration as IntegrationWithMeta)
                          }}
                        >
                          <Settings className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        className="h-6 text-[9px] px-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleConnect(integration.provider as IntegrationProvider)
                        }}
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Config Modal */}
      <Dialog open={configModal.isOpen} onOpenChange={(open) => setConfigModal((prev) => ({ ...prev, isOpen: open }))}>
        <DialogContent className="bg-card border-border sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-foreground text-[14px] font-semibold">
              Configure {configModal.integration?.provider && INTEGRATION_META[configModal.integration.provider]?.name}
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              Manage integration settings and test connection
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            {/* Provider-specific config fields */}
            {configModal.integration?.provider === "meta_ads" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="adAccountId" className="text-foreground text-[11px]">Ad Account ID</Label>
                  <Input id="adAccountId" placeholder="act_123456789" className="bg-secondary border-border h-8 text-[11px]" />
                </div>
                <div className="flex items-center justify-between p-2 rounded-md bg-secondary/30 border border-border">
                  <div>
                    <p className="text-[11px] font-medium text-foreground">Enable Daily ROAS Sync</p>
                    <p className="text-[10px] text-muted-foreground">Automatically pull ROAS data every 24 hours</p>
                  </div>
                  <Switch defaultChecked className="scale-90" />
                </div>
              </>
            )}

            {configModal.integration?.provider === "slack" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-foreground text-[11px]">Default Channel</Label>
                  <Select defaultValue="channel1">
                    <SelectTrigger className="bg-secondary border-border h-8 text-[11px]">
                      <SelectValue placeholder="Select channel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="channel1" className="text-[11px]">#general</SelectItem>
                      <SelectItem value="channel2" className="text-[11px]">#support</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between p-2 rounded-md bg-secondary/30 border border-border">
                  <div>
                    <p className="text-[11px] font-medium text-foreground">Sync Message History</p>
                    <p className="text-[10px] text-muted-foreground">Import last 30 days of messages</p>
                  </div>
                  <Switch defaultChecked className="scale-90" />
                </div>
              </>
            )}

            {configModal.integration?.provider === "gmail" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="emailFilter" className="text-foreground text-[11px]">Email Filter</Label>
                  <Input id="emailFilter" placeholder="from:client@example.com" className="bg-secondary border-border h-8 text-[11px]" />
                </div>
                <div className="flex items-center justify-between p-2 rounded-md bg-secondary/30 border border-border">
                  <div>
                    <p className="text-[11px] font-medium text-foreground">Auto-archive synced emails</p>
                    <p className="text-[10px] text-muted-foreground">Move processed emails to archive folder</p>
                  </div>
                  <Switch className="scale-90" />
                </div>
              </>
            )}

            {configModal.integration?.provider === "google_ads" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="customerId" className="text-foreground text-[11px]">Customer ID</Label>
                  <Input id="customerId" placeholder="123-456-7890" className="bg-secondary border-border h-8 text-[11px]" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-foreground text-[11px]">Campaign Scope</Label>
                  <Select defaultValue="all">
                    <SelectTrigger className="bg-secondary border-border h-8 text-[11px]">
                      <SelectValue placeholder="Select scope" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-[11px]">All Campaigns</SelectItem>
                      <SelectItem value="search" className="text-[11px]">Search Only</SelectItem>
                      <SelectItem value="display" className="text-[11px]">Display Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Test Connection Button */}
            <div className="pt-1">
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "w-full border-border h-8 text-[11px]",
                  connectionTested && "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                )}
                disabled={isTesting[configModal.integration?.id || '']}
                onClick={() => configModal.integration && handleTestConnection(configModal.integration.id)}
              >
                {isTesting[configModal.integration?.id || ''] ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Testing...
                  </>
                ) : connectionTested ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                    Connection Verified
                  </>
                ) : (
                  "Test Connection"
                )}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-[11px]" onClick={() => setConfigModal((prev) => ({ ...prev, isOpen: false }))}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground h-8 text-[11px]"
              onClick={() => {
                setConfigModal((prev) => ({ ...prev, isOpen: false }))
                toast({
                  title: "Configuration Saved",
                  description: "Integration settings have been updated.",
                })
              }}
            >
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Settings Card */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-[12px] font-medium text-foreground">AI Settings</CardTitle>
          <CardDescription className="text-[10px]">Configure how AudienceOS Intelligence processes your data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 px-3 pb-3">
          <div className="flex items-center justify-between p-2 rounded-md bg-secondary/30 border border-border">
            <div>
              <p className="text-[11px] font-medium text-foreground">Auto-tag incoming messages</p>
              <p className="text-[10px] text-muted-foreground">Automatically categorize messages as Urgent, Bug, Feedback, etc.</p>
            </div>
            <Switch defaultChecked className="scale-90" />
          </div>

          <div className="flex items-center justify-between p-2 rounded-md bg-secondary/30 border border-border">
            <div>
              <p className="text-[11px] font-medium text-foreground">Draft replies automatically</p>
              <p className="text-[10px] text-muted-foreground">Generate suggested responses for client messages</p>
            </div>
            <Switch defaultChecked className="scale-90" />
          </div>

          <div className="flex items-center justify-between p-2 rounded-md bg-secondary/30 border border-border">
            <div>
              <p className="text-[11px] font-medium text-foreground">Flag negative sentiment</p>
              <p className="text-[10px] text-muted-foreground">Alert when client messages indicate frustration or urgency</p>
            </div>
            <Switch defaultChecked className="scale-90" />
          </div>

          <div className="pt-3 border-t border-border">
            <Button variant="outline" size="sm" className="border-border bg-transparent h-8 text-[11px]">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              Manage SOPs for AI Training
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
