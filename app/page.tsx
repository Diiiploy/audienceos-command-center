"use client"

import { useState, useMemo, Suspense } from "react"
import {
  LinearShell,
  type LinearView,
  ListHeader,
  ClientRow,
  ClientDetailPanel,
  KanbanBoard,
  CommandPalette,
  useCommandPalette,
} from "@/components/linear"
import { mockClients, type Client, owners } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Toaster } from "@/components/ui/toaster"
import { IntelligenceCenter } from "@/components/views/intelligence-center"
import { OnboardingHub } from "@/components/views/onboarding-hub"
import { SupportTickets } from "@/components/views/support-tickets"
import { IntegrationsHub } from "@/components/views/integrations-hub"
import { KnowledgeBase } from "@/components/views/knowledge-base"

function CommandCenterContent() {
  const [activeView, setActiveView] = useState<LinearView>("pipeline")
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<"list" | "board">("list")
  const { open: commandPaletteOpen, setOpen: setCommandPaletteOpen } = useCommandPalette()

  // Use mock clients for now
  const clients = mockClients

  // Filter clients based on search
  const filteredClients = useMemo(() => {
    if (!searchQuery) return clients
    const query = searchQuery.toLowerCase()
    return clients.filter(
      (client) =>
        client.name.toLowerCase().includes(query) ||
        client.owner.toLowerCase().includes(query) ||
        client.stage.toLowerCase().includes(query)
    )
  }, [clients, searchQuery])

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
    switch (activeView) {
      case "pipeline":
      case "clients":
        return (
          <>
            <ListHeader
              title={activeView === "pipeline" ? "Pipeline" : "Clients"}
              count={filteredClients.length}
              onSearch={setSearchQuery}
              searchValue={searchQuery}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
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
          <div className="p-6">
            <h1 className="text-lg font-semibold mb-4">Dashboard</h1>
            <p className="text-muted-foreground">Dashboard view - wire up existing component...</p>
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
        return <KnowledgeBase />

      case "settings":
        return (
          <div className="p-6">
            <h1 className="text-lg font-semibold mb-4">Settings</h1>
            <p className="text-muted-foreground">Settings view - wire up existing component...</p>
          </div>
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
      <Toaster />
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
    <Suspense fallback={<CommandCenterLoading />}>
      <CommandCenterContent />
    </Suspense>
  )
}
