"use client"

import { useState, useMemo, Suspense, useEffect, useCallback } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import {
  LinearShell,
  type LinearView,
  ListHeader,
  ClientRow,
  ClientDetailPanel,
  KanbanBoard,
  CommandPalette,
  useCommandPalette,
  type FilterConfig,
  type ActiveFilters,
  type SortOption,
} from "@/components/linear"
import { usePipelineStore, type Client as StoreClient } from "@/stores/pipeline-store"
import { getOwnerData, type MinimalClient, type Stage } from "@/types/client"
import { sortClients, type SortMode } from "@/lib/client-priority"
import { useAuth } from "@/hooks/use-auth"

// Convert store client to UI client format (returns MinimalClient)
function adaptStoreClient(client: StoreClient): MinimalClient {
  return {
    id: client.id,
    name: client.name,
    logo: client.name.substring(0, 2).toUpperCase(),
    stage: client.stage,
    health: client.health_status,
    owner: client.owner || "Unassigned",
    daysInStage: client.days_in_stage,
    supportTickets: 0,
    statusNote: client.notes || undefined,
    tier: "Core",
    blocker: null,
  }
}

// Filter configurations for Client List
const clientFiltersConfig: FilterConfig[] = [
  {
    id: "stage",
    label: "Stage",
    options: [
      { label: "Onboarding", value: "Onboarding" },
      { label: "Installation", value: "Installation" },
      { label: "Audit", value: "Audit" },
      { label: "Live", value: "Live" },
      { label: "Needs Support", value: "Needs Support" },
      { label: "Off-boarding", value: "Off-boarding" },
    ],
  },
  {
    id: "health",
    label: "Health",
    options: [
      { label: "Green", value: "Green" },
      { label: "Yellow", value: "Yellow" },
      { label: "Red", value: "Red" },
      { label: "Blocked", value: "Blocked" },
    ],
  },
  {
    id: "owner",
    label: "Owner",
    options: [
      { label: "Brent", value: "Brent" },
      { label: "Roderic", value: "Roderic" },
      { label: "Trevor", value: "Trevor" },
      { label: "Chase", value: "Chase" },
    ],
  },
  {
    id: "tier",
    label: "Tier",
    options: [
      { label: "Enterprise", value: "Enterprise" },
      { label: "Core", value: "Core" },
      { label: "Starter", value: "Starter" },
    ],
  },
]
// Sort options for Client List
const clientSortOptions: SortOption[] = [
  {
    id: "priority",
    label: "Priority",
    description: "Actionable items first",
  },
  {
    id: "health",
    label: "Health",
    description: "Red → Yellow → Blocked → Green",
  },
  {
    id: "stage",
    label: "Stage",
    description: "Onboarding → Live → Off-boarding",
  },
  {
    id: "owner",
    label: "Owner",
    description: "Alphabetical by owner",
  },
  {
    id: "days",
    label: "Days in Stage",
    description: "Longest waiting first",
  },
  {
    id: "name",
    label: "Name",
    description: "Alphabetical A-Z",
  },
]

import { Button } from "@/components/ui/button"
import { Plus, AlertCircle, Loader2 } from "lucide-react"
import { ToastProvider } from "@/components/linear"
import { IntelligenceCenter } from "@/components/views/intelligence-center"
import { OnboardingHub } from "@/components/views/onboarding-hub"
import { SupportTickets } from "@/components/views/support-tickets"
import { IntegrationsHub } from "@/components/views/integrations-hub"
import { KnowledgeBase } from "@/components/views/knowledge-base"
import { AutomationsHub } from "@/components/views/automations-hub"
import { DashboardView } from "@/components/dashboard-view"
import { SettingsView } from "@/components/settings-view"

// Valid filter keys for URL params
const FILTER_KEYS = ["stage", "health", "owner", "tier"] as const

function CommandCenterContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [activeView, setActiveView] = useState<LinearView>("dashboard")
  const [selectedClient, setSelectedClient] = useState<MinimalClient | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  // Separate view modes: Pipeline defaults to board (Kanban), Clients defaults to list
  const [pipelineViewMode, setPipelineViewMode] = useState<"list" | "board">("board")
  const [clientsViewMode, setClientsViewMode] = useState<"list" | "board">("list")
  // Filter state for Client List - initialized from URL params
  const [clientFilters, setClientFilters] = useState<ActiveFilters>(() => {
    const initial: ActiveFilters = {}
    FILTER_KEYS.forEach(key => {
      const value = searchParams.get(key)
      if (value) initial[key] = value
    })
    return initial
  })
  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette()

  // Sort state - default to priority (smart sorting)
  const [clientSort, setClientSort] = useState<SortMode>("priority")

  // Intelligence Center state for deep linking
  const [intelligenceInitialSection, setIntelligenceInitialSection] = useState<string | undefined>()
  const [intelligenceInitialCartridgeTab, setIntelligenceInitialCartridgeTab] = useState<"voice" | "style" | "preferences" | "instructions" | "brand" | undefined>()

  // Pipeline store - fetches from Supabase API
  const { clients: storeClients, fetchClients, isLoading, error: apiError, updateClientStage } = usePipelineStore()

  // Auth hook - provides real user data
  const { profile, displayName, isAuthenticated } = useAuth()

  // Build sidebar user from auth profile
  const sidebarUser = useMemo(() => {
    if (!profile) return undefined
    const initials = profile.first_name && profile.last_name
      ? `${profile.first_name[0]}${profile.last_name[0]}`
      : displayName?.substring(0, 2).toUpperCase() || "U"
    return {
      name: displayName || "User",
      role: profile.role || "Member",
      initials,
      color: "bg-emerald-500", // Could be personalized per user
    }
  }, [profile, displayName])

  // Fetch clients on mount
  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  /**
   * Handle client stage change via drag-and-drop
   * Uses optimistic update with rollback on failure
   */
  const handleClientMove = useCallback(async (clientId: string, toStage: Stage) => {
    const success = await updateClientStage(clientId, toStage)
    if (!success) {
      console.error('[Pipeline] Failed to move client to stage:', toStage)
    }
  }, [updateClientStage])


  // Convert store clients to UI format
  const clients: MinimalClient[] = useMemo(() => {
    return storeClients.map(adaptStoreClient)
  }, [storeClients])

  // Sync URL params when filters change
  const updateUrlParams = useCallback((filters: ActiveFilters) => {
    const params = new URLSearchParams(searchParams.toString())

    // Update filter params
    FILTER_KEYS.forEach(key => {
      if (filters[key]) {
        params.set(key, filters[key] as string)
      } else {
        params.delete(key)
      }
    })

    // Preserve view param if present
    const view = searchParams.get("view")
    if (view) params.set("view", view)

    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname
    router.replace(newUrl, { scroll: false })
  }, [searchParams, pathname, router])

  // Handle filter changes - updates both state and URL
  const handleFilterChange = useCallback((filterId: string, value: string | null) => {
    setClientFilters(prev => {
      const newFilters = { ...prev, [filterId]: value }
      // Update URL in next tick to avoid state/render conflicts
      setTimeout(() => updateUrlParams(newFilters), 0)
      return newFilters
    })
  }, [updateUrlParams])

  // Filter and sort clients by priority
  const filteredClients = useMemo(() => {
    let result = clients

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (client) =>
          client.name.toLowerCase().includes(query) ||
          client.owner.toLowerCase().includes(query) ||
          client.stage.toLowerCase().includes(query)
      )
    }

    // Apply dropdown filters only for Client List view
    if (activeView === "clients") {
      if (clientFilters.stage) {
        result = result.filter(client => client.stage === clientFilters.stage)
      }
      if (clientFilters.health) {
        result = result.filter(client => client.health === clientFilters.health)
      }
      if (clientFilters.owner) {
        result = result.filter(client => client.owner === clientFilters.owner)
      }
      if (clientFilters.tier) {
        result = result.filter(client => client.tier === clientFilters.tier)
      }
    }

    // Sort by the selected sort mode
    return sortClients(result, clientSort)
  }, [clients, searchQuery, activeView, clientFilters, clientSort])

  // Auto-select first client when list changes and nothing is selected
  // Only for Clients view - Pipeline drawer should be closed by default
  useEffect(() => {
    if (activeView === "clients" && filteredClients.length > 0 && !selectedClient) {
      setSelectedClient(filteredClients[0])
    }
  }, [filteredClients, selectedClient, activeView])

  // Transform client to detail panel format
  const clientForPanel = useMemo(() => {
    if (!selectedClient) return null
    const ownerData = getOwnerData(selectedClient.owner)
    return {
      id: selectedClient.logo,
      name: selectedClient.name,
      stage: selectedClient.stage,
      health: selectedClient.health,
      owner: {
        name: ownerData.name,
        initials: ownerData.avatar,
        color: ownerData.color,
      },
      tier: selectedClient.tier || "Core",
      daysInStage: selectedClient.daysInStage,
      blocker: selectedClient.blocker,
      statusNote: selectedClient.statusNote,
    }
  }, [selectedClient])

  const renderContent = () => {
    // Get the correct view mode and setter based on active view
    const isPipeline = activeView === "pipeline"
    const viewMode = isPipeline ? pipelineViewMode : clientsViewMode
    const setViewMode = isPipeline ? setPipelineViewMode : setClientsViewMode

    switch (activeView) {
      case "pipeline":
      case "clients":
        return (
          <>
            <ListHeader
              title={isPipeline ? "Pipeline" : "Client List"}
              count={filteredClients.length}
              onSearch={setSearchQuery}
              searchValue={searchQuery}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              // Show filters only for Client List, not Pipeline
              filters={!isPipeline ? clientFiltersConfig : undefined}
              activeFilters={!isPipeline ? clientFilters : undefined}
              onFilterChange={!isPipeline ? handleFilterChange : undefined}
              // Sort options - show on both Pipeline and Client List
              sortOptions={clientSortOptions}
              activeSort={clientSort}
              onSortChange={(sortId) => setClientSort(sortId as SortMode)}
              actions={
                <Button size="sm" className="h-8 gap-1.5">
                  <Plus className="h-4 w-4" />
                  Add Client
                </Button>
              }
            />
            {/* Loading state */}
            {isLoading && (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            {/* Error state */}
            {apiError && !isLoading && (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <span className="font-medium">Failed to load clients</span>
                </div>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  {apiError}. Please check your connection and try again.
                </p>
                <Button variant="outline" size="sm" onClick={() => fetchClients()}>
                  Retry
                </Button>
              </div>
            )}
            {/* Content - only show when not loading and no error */}
            {!isLoading && !apiError && (
              <>
                {viewMode === "board" ? (
                  <KanbanBoard
                    clients={filteredClients}
                    onClientClick={(client) => setSelectedClient(client)}
                    onClientMove={handleClientMove}
                  />
                ) : (
                  <div className="flex-1 overflow-y-auto">
                    {filteredClients.map((client) => {
                      const ownerData = getOwnerData(client.owner)
                      return (
                        <ClientRow
                          key={client.id}
                          id={client.logo}
                          name={client.name}
                          stage={client.stage}
                          health={client.health}
                          owner={{
                            name: ownerData.name,
                            initials: ownerData.avatar,
                            color: ownerData.color,
                          }}
                          daysInStage={client.daysInStage}
                          blocker={client.blocker}
                          onClick={() => setSelectedClient(client)}
                          selected={selectedClient?.id === client.id}
                        />
                      )
                    })}
                    {filteredClients.length === 0 && (
                      <div className="flex items-center justify-center h-48 text-muted-foreground">
                        No clients found
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )

      case "dashboard":
        return (
          <div className="flex-1 overflow-y-auto p-4">
            <DashboardView
              clients={filteredClients}
              onClientClick={(client) => setSelectedClient(client)}
              onSendToAI={(prompt) => {
                // Retry logic to handle race condition where chat might not be mounted yet
                if (typeof window !== "undefined") {
                  if (window.openChatWithMessage) {
                    window.openChatWithMessage(prompt)
                  } else {
                    // Chat not ready yet - retry after 50ms
                    console.warn('[SEND-TO-AI] Chat not ready, retrying in 50ms...')
                    setTimeout(() => {
                      if (window.openChatWithMessage) {
                        window.openChatWithMessage(prompt)
                      } else {
                        console.error('[SEND-TO-AI] Chat failed to load after retry')
                      }
                    }, 50)
                  }
                }
              }}
            />
          </div>
        )

      case "intelligence":
        return (
          <IntelligenceCenter
            key={`intelligence-${intelligenceInitialSection}-${intelligenceInitialCartridgeTab}`}
            initialSection={intelligenceInitialSection}
            initialCartridgeTab={intelligenceInitialCartridgeTab}
          />
        )

      case "onboarding":
        return (
          <OnboardingHub
            onClientClick={(clientId) => {
              const client = clients.find((c) => c.id === clientId)
              if (client) setSelectedClient(client)
            }}
          />
        )

      case "tickets":
        return <SupportTickets />

      case "integrations":
        return <IntegrationsHub />

      case "knowledge":
        return <KnowledgeBase />

      case "automations":
        return <AutomationsHub />

      case "settings":
        return (
          <SettingsView
            onBrandClick={() => {
              setIntelligenceInitialSection("cartridges")
              setIntelligenceInitialCartridgeTab("brand")
              setActiveView("intelligence")
            }}
          />
        )

      default:
        return (
          <div className="p-6">
            <h1 className="text-lg font-semibold mb-4 capitalize">{activeView}</h1>
            <p className="text-muted-foreground">View coming soon...</p>
          </div>
        )
    }
  }

  return (
    <>
      <LinearShell
        activeView={activeView}
        onViewChange={(view) => {
          setActiveView(view)
          setSelectedClient(null)
          // Clear intelligence initial props when navigating normally
          setIntelligenceInitialSection(undefined)
          setIntelligenceInitialCartridgeTab(undefined)
        }}
        onQuickCreate={() => setCommandPaletteOpen(true)}
        user={sidebarUser}
        detailPanel={
          clientForPanel ? (
            <ClientDetailPanel
              client={clientForPanel}
              onClose={() => setSelectedClient(null)}
            />
          ) : undefined
        }
      >
        {renderContent()}
      </LinearShell>
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        context={selectedClient ? `${selectedClient.logo} - ${selectedClient.name}` : undefined}
      />
    </>
  )
}

// Loading fallback
function CommandCenterLoading() {
  return (
    <div className="flex h-screen bg-background items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  )
}

export default function CommandCenter() {
  return (
    <ToastProvider position="bottom-right">
      <Suspense fallback={<CommandCenterLoading />}>
        <CommandCenterContent />
      </Suspense>
    </ToastProvider>
  )
}
