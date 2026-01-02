"use client"

import { useState, useEffect, useCallback, Suspense, useRef, useMemo } from "react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { DashboardView } from "@/components/dashboard-view"
import { KanbanBoard } from "@/components/kanban-board"
import { ClientListView } from "@/components/client-list-view"
import { ClientDetailSheet } from "@/components/client-detail-sheet"
import { AIBar } from "@/components/ai-bar"
import { SettingsView } from "@/components/settings-view"
import { IntelligenceView } from "@/components/intelligence-view"
import { SupportTicketsView } from "@/components/support-tickets-view"
import { KnowledgeBaseView } from "@/components/knowledge-base-view"
import { IntegrationsView } from "@/components/integrations-view"
import { AutomationsDashboard } from "@/components/automations/automations-dashboard"
import { OnboardingHubView } from "@/components/onboarding-hub-view"
import { QuickCreateDialogs } from "@/components/quick-create-dialogs"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"
import { type Client, type Stage, type HealthStatus, type Owner } from "@/lib/mock-data"
import { useAuth } from "@/hooks/use-auth"
import { usePipelineStore } from "@/stores/pipeline-store"
import { FilterChips, type PipelineFilters, defaultFilters, countActiveFilters } from "@/components/filter-chips"

function CommandCenterContent() {
  const [activeView, setActiveView] = useState("dashboard")
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [defaultTab, setDefaultTab] = useState<string>("overview")
  const [quickCreateType, setQuickCreateType] = useState<"client" | "ticket" | "project" | null>(null)
  const [quickCreateOpen, setQuickCreateOpen] = useState(false)

  // Auth state
  const { isLoading: _authLoading, isAuthenticated, displayName: _displayName, profile } = useAuth()

  // Pipeline store for clients
  const {
    clients: pipelineClients,
    isLoading: _clientsLoading,
    fetchClients,
    updateClientStage,
  } = usePipelineStore()

  const { toast } = useToast()

  // Fetch clients from API when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchClients()
    }
  }, [isAuthenticated, fetchClients])

  // Transform pipeline clients to Client type using useMemo (TD-001, TD-002 fix)
  // Returns empty array when no data - NO mock fallback (fixed: Issue 1)
  const baseClients = useMemo(() => {
    if (pipelineClients.length === 0) return []
    return pipelineClients.map((pc) => ({
      id: pc.id,
      name: pc.name,
      logo: "",
      stage: pc.stage as Stage,
      health: pc.health_status as HealthStatus,
      owner: (pc.owner || 'Luke') as Owner,
      daysInStage: pc.days_in_stage,
      supportTickets: 0,
      installTime: 0,
      tasks: [],
      comms: [],
      tier: "Core" as const,
    })) as Client[]
  }, [pipelineClients])

  // Local overrides for optimistic updates (only tracks changes, not full state)
  const [clientOverrides, setClientOverrides] = useState<Map<string, Partial<Client>>>(new Map())

  // Merge base clients with any optimistic overrides
  const clients = useMemo(() => {
    if (clientOverrides.size === 0) return baseClients
    return baseClients.map((client) => {
      const override = clientOverrides.get(client.id)
      return override ? { ...client, ...override } : client
    })
  }, [baseClients, clientOverrides])

  // Pipeline filters state
  const [filters, setFilters] = useState<PipelineFilters>(defaultFilters)
  const currentUser: Owner = (profile?.first_name as Owner) || "Luke"

  // Filter clients based on current filters (TD-009 fix: memoized)
  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      // Stage filter
      if (filters.stage !== "all" && client.stage !== filters.stage) return false

      // Health filter
      if (filters.health !== "all" && client.health !== filters.health) return false

      // Owner filter
      if (filters.owner !== "all" && client.owner !== filters.owner) return false

      // Search filter
      if (filters.search) {
        const search = filters.search.toLowerCase()
        if (!client.name.toLowerCase().includes(search)) return false
      }

      // My Clients filter
      if (filters.showMyClients && client.owner !== currentUser) return false

      // At Risk filter (Yellow or Red health, or high days in stage)
      if (filters.showAtRisk) {
        const isAtRisk = client.health === "Yellow" || client.health === "Red" || client.daysInStage > 4
        if (!isAtRisk) return false
      }

      // Blocked filter
      if (filters.showBlocked) {
        if (client.health !== "Blocked" && !client.blocker) return false
      }

      return true
    })
  }, [clients, filters, currentUser])

  // Handle filter changes
  const handleFilterChange = <K extends keyof PipelineFilters>(key: K, value: PipelineFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  // Clear all filters
  const handleClearFilters = () => {
    setFilters(defaultFilters)
  }

  // URL syncing
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Update URL with current state (without full page reload)
  const updateURL = useCallback((params: Record<string, string | null>) => {
    const current = new URLSearchParams(searchParams.toString())

    Object.entries(params).forEach(([key, value]) => {
      if (value === null || value === "" || value === "all" || value === "false") {
        current.delete(key)
      } else {
        current.set(key, value)
      }
    })

    const newUrl = current.toString() ? `${pathname}?${current.toString()}` : pathname
    router.replace(newUrl, { scroll: false })
  }, [searchParams, router, pathname])

  // Track URL state restoration
  const urlRestoredRef = useRef(false)

  // Restore state from URL on mount (TD-001 fix: removed setTimeout antipattern)
  // React 18+ automatically batches state updates, no setTimeout needed
  useEffect(() => {
    if (urlRestoredRef.current) return
    urlRestoredRef.current = true

    // Restore client drawer state
    const clientId = searchParams.get("client")
    const tab = searchParams.get("tab") || "overview"

    if (clientId) {
      const client = clients.find((c) => c.id === clientId)
      if (client) {
        setSelectedClient(client)
        setDefaultTab(tab)
        setIsSheetOpen(true)
      }
    }

    // Restore filter state
    const stage = searchParams.get("stage") as Stage | "all" | null
    const health = searchParams.get("health") as HealthStatus | "all" | null
    const owner = searchParams.get("owner") as Owner | "all" | null
    const search = searchParams.get("search")
    const myClients = searchParams.get("myClients") === "true"
    const atRisk = searchParams.get("atRisk") === "true"
    const blocked = searchParams.get("blocked") === "true"

    if (stage || health || owner || search || myClients || atRisk || blocked) {
      setFilters({
        stage: stage || "all",
        health: health || "all",
        owner: owner || "all",
        search: search || "",
        showMyClients: myClients,
        showAtRisk: atRisk,
        showBlocked: blocked,
      })
    }

    // Restore active view
    const view = searchParams.get("view")
    if (view && ["dashboard", "pipeline", "clients", "onboarding", "intelligence", "tickets", "knowledge", "automations", "integrations", "settings"].includes(view)) {
      setActiveView(view)
    }
  }, [clients, searchParams]) // Include deps but guard with ref

  // Sync drawer state to URL
  useEffect(() => {
    if (isSheetOpen && selectedClient) {
      updateURL({
        client: selectedClient.id,
        tab: defaultTab !== "overview" ? defaultTab : null,
      })
    } else {
      updateURL({ client: null, tab: null })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- updateURL is stable, including it causes infinite loop
  }, [isSheetOpen, selectedClient, defaultTab])

  // Sync filters to URL
  useEffect(() => {
    updateURL({
      stage: filters.stage,
      health: filters.health,
      owner: filters.owner,
      search: filters.search || null,
      myClients: filters.showMyClients ? "true" : null,
      atRisk: filters.showAtRisk ? "true" : null,
      blocked: filters.showBlocked ? "true" : null,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- updateURL is stable, including it causes infinite loop
  }, [filters])

  // Optimistic update handler for drag-drop (TD-002 fix: uses override pattern)
  const handleClientMove = useCallback(async (clientId: string, toStage: Stage, notes?: string) => {
    const client = clients.find((c) => c.id === clientId)
    if (!client) return

    const fromStage = client.stage

    // Optimistic update - apply override immediately
    setClientOverrides((prev) => {
      const next = new Map(prev)
      next.set(clientId, { stage: toStage, daysInStage: 0, statusNote: notes || client.statusNote })
      return next
    })

    // Show toast notification with notes if provided
    toast({
      title: "Client moved",
      description: notes
        ? `${client.name} moved to ${toStage}. Note: ${notes}`
        : `${client.name} moved from ${fromStage} to ${toStage}`,
    })

    // Call API if authenticated
    if (isAuthenticated) {
      const success = await updateClientStage(clientId, toStage as Stage)
      if (!success) {
        // Rollback on error - remove the override
        setClientOverrides((prev) => {
          const next = new Map(prev)
          next.delete(clientId)
          return next
        })
        toast({
          title: "Error",
          description: "Failed to move client. Changes reverted.",
          variant: "destructive",
        })
      } else {
        // Success - clear override (store will have the updated value)
        setClientOverrides((prev) => {
          const next = new Map(prev)
          next.delete(clientId)
          return next
        })
      }
    }
  }, [clients, isAuthenticated, updateClientStage, toast])

  // Event handlers wrapped in useCallback for stable references (TD-012 partial fix)
  const handleClientClick = useCallback((client: Client, tab?: string) => {
    setSelectedClient(client)
    setDefaultTab(tab || "overview")
    setIsSheetOpen(true)
  }, [])

  const handleOnboardingClientClick = useCallback((client: Client) => {
    handleClientClick(client, "techsetup")
  }, [handleClientClick])

  const handleQuickCreate = useCallback((type: "client" | "ticket" | "project") => {
    setQuickCreateType(type)
    setQuickCreateOpen(true)
  }, [])

  const renderView = () => {
    switch (activeView) {
      case "dashboard":
        return <DashboardView clients={clients} onClientClick={handleClientClick} />
      case "pipeline":
        return (
          <div className="space-y-4">
            {/* Linear-style: minimal filter bar, no big title */}
            <FilterChips
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
              currentUser={currentUser}
              activeFilterCount={countActiveFilters(filters)}
            />
            <KanbanBoard
              clients={filteredClients}
              onClientClick={handleClientClick}
              onClientMove={handleClientMove}
            />
          </div>
        )
      case "clients":
        return <ClientListView clients={clients} onClientClick={handleClientClick} />
      case "onboarding":
        return <OnboardingHubView onClientClick={handleOnboardingClientClick} />
      case "intelligence":
        return <IntelligenceView />
      case "tickets":
        return <SupportTicketsView />
      case "knowledge":
        return <KnowledgeBaseView />
      case "automations":
        return <AutomationsDashboard />
      case "integrations":
        return <IntegrationsView />
      case "settings":
        return <SettingsView />
      default:
        return <DashboardView clients={clients} onClientClick={handleClientClick} />
    }
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
        onQuickCreate={handleQuickCreate}
      />
      <main className="flex-1 overflow-auto p-6 pb-32">{renderView()}</main>
      <ClientDetailSheet
        client={selectedClient}
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        defaultTab={defaultTab}
      />
      <QuickCreateDialogs type={quickCreateType} open={quickCreateOpen} onOpenChange={setQuickCreateOpen} />
      <AIBar />
      <Toaster />
    </div>
  )
}

// Loading fallback for Suspense
function CommandCenterLoading() {
  return (
    <div className="flex h-screen bg-background items-center justify-center">
      <div className="animate-pulse text-muted-foreground">Loading...</div>
    </div>
  )
}

// Wrap with Suspense for useSearchParams
export default function CommandCenter() {
  return (
    <Suspense fallback={<CommandCenterLoading />}>
      <CommandCenterContent />
    </Suspense>
  )
}
