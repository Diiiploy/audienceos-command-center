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
import { mockClients, type Client, owners } from "@/lib/mock-data"
import { sortClients, type SortMode } from "@/lib/client-priority"

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
      { label: "Luke", value: "Luke" },
      { label: "Garrett", value: "Garrett" },
      { label: "Josh", value: "Josh" },
      { label: "Jeff", value: "Jeff" },
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
import { Plus } from "lucide-react"
import { ToastProvider } from "@/components/linear"
import { IntelligenceCenter } from "@/components/views/intelligence-center"
import { OnboardingHub } from "@/components/views/onboarding-hub"
import { SupportTickets } from "@/components/views/support-tickets"
import { IntegrationsHub } from "@/components/views/integrations-hub"
import { KnowledgeBaseDashboard } from "@/components/knowledge-base"
import { AutomationsHub } from "@/components/views/automations-hub"
import { DashboardView } from "@/components/dashboard-view"
import { SettingsView } from "@/components/settings-view"

// Valid filter keys for URL params
const FILTER_KEYS = ["stage", "health", "owner", "tier"] as const

function CommandCenterContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [activeView, setActiveView] = useState<LinearView>("pipeline")
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
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

  // Use mock clients for now
  const clients = mockClients

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
    const ownerData = owners.find((o) => o.name === selectedClient.owner) || {
      name: selectedClient.owner,
      avatar: selectedClient.owner[0],
      color: "bg-primary",
    }
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
      tier: selectedClient.tier,
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
            {viewMode === "board" ? (
              <KanbanBoard
                clients={filteredClients}
                onClientClick={(client) => setSelectedClient(client)}
              />
            ) : (
              <div className="flex-1 overflow-y-auto">
                {filteredClients.map((client) => {
                  const ownerData = owners.find((o) => o.name === client.owner) || {
                    name: client.owner,
                    avatar: client.owner[0],
                    color: "bg-primary",
                  }
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
        )

      case "dashboard":
        return (
          <div className="flex-1 overflow-y-auto p-4">
            <DashboardView
              clients={filteredClients}
              onClientClick={(client) => setSelectedClient(client)}
              onNavigateToChat={() => setActiveView("intelligence")}
            />
          </div>
        )

      case "intelligence":
        return <IntelligenceCenter />

      case "onboarding":
        return (
          <OnboardingHub
            onClientClick={(clientId) => {
              const client = mockClients.find((c) => c.id === clientId)
              if (client) setSelectedClient(client)
            }}
          />
        )

      case "tickets":
        return <SupportTickets />

      case "integrations":
        return <IntegrationsHub />

      case "knowledge":
        return (
          <div className="flex-1 overflow-y-auto p-4">
            <KnowledgeBaseDashboard />
          </div>
        )

      case "automations":
        return <AutomationsHub />

      case "settings":
        return <SettingsView />

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
        }}
        onQuickCreate={() => setCommandPaletteOpen(true)}
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
