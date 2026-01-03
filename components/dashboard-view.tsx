"use client"

import { useState, useMemo } from "react"
import {
  LinearKPICard,
  LinearKPICardSkeleton,
  FirehoseFeed,
  DashboardTabs,
  type LinearKPIData,
  type FirehoseItemData,
  type DashboardTab,
  type FirehoseTab,
} from "./dashboard"
import { type Client, owners } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { MessageSquare, Send } from "lucide-react"

interface DashboardViewProps {
  clients: Client[]
  onClientClick: (client: Client) => void
}

// Mock firehose data - will be replaced with real data
function generateMockFirehoseItems(clients: Client[]): FirehoseItemData[] {
  const items: FirehoseItemData[] = []
  const now = new Date()

  // Add some critical items
  clients.filter(c => c.health === "Red").forEach(client => {
    items.push({
      id: `alert-${client.id}`,
      severity: "critical",
      title: client.blocker || "Client at Risk",
      description: `${client.name} needs immediate attention - ${client.statusNote || "health is red"}`,
      timestamp: new Date(now.getTime() - Math.random() * 4 * 60 * 60 * 1000),
      clientName: client.name,
      clientId: client.id,
      targetTab: "alerts",
    })
  })

  // Add stage move events
  clients.slice(0, 3).forEach(client => {
    items.push({
      id: `stage-${client.id}`,
      severity: "info",
      title: "Stage Move",
      description: `${client.name} moved to ${client.stage}`,
      timestamp: new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000),
      clientName: client.name,
      clientId: client.id,
      targetTab: "clients",
    })
  })

  // Add some warnings
  clients.filter(c => c.health === "Yellow").forEach(client => {
    items.push({
      id: `warn-${client.id}`,
      severity: "warning",
      title: "Needs Attention",
      description: `${client.name} - ${client.statusNote || "review recommended"}`,
      timestamp: new Date(now.getTime() - Math.random() * 8 * 60 * 60 * 1000),
      clientName: client.name,
      clientId: client.id,
      targetTab: "clients",
    })
  })

  // Add task items
  items.push({
    id: "task-1",
    severity: "warning",
    title: "Review Weekly Report",
    description: "V Shred weekly performance report ready for review",
    timestamp: new Date(now.getTime() - 30 * 60 * 1000),
    clientName: "V Shred",
    assignee: "Sarah",
    targetTab: "tasks",
  })

  items.push({
    id: "task-2",
    severity: "info",
    title: "Approve Draft Reply",
    description: "AI drafted response to Allbirds iOS tracking question",
    timestamp: new Date(now.getTime() - 60 * 60 * 1000),
    clientName: "Allbirds",
    assignee: "Luke",
    targetTab: "tasks",
  })

  // Add performance items
  items.push({
    id: "perf-1",
    severity: "critical",
    title: "Budget Cap Hit",
    description: "Beardbrand hit daily budget cap at 2PM. Campaigns paused.",
    timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000),
    clientName: "Beardbrand",
    targetTab: "performance",
  })

  items.push({
    id: "perf-2",
    severity: "warning",
    title: "ROAS Dropped 10%",
    description: "Brooklinen ROAS decreased from 3.2 to 2.9 this week",
    timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000),
    clientName: "Brooklinen",
    targetTab: "performance",
  })

  // Sort by timestamp (most recent first)
  return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
}

// Client Progress Widget
function ClientProgressWidget({ clients }: { clients: Client[] }) {
  const topClients = clients.slice(0, 5)

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h3 className="text-sm font-medium text-foreground mb-4">Client Progress</h3>
      <div className="space-y-3">
        {topClients.map(client => {
          const progress = Math.floor(Math.random() * 40 + 60) // Mock progress
          const owner = owners.find(o => o.name === client.owner)
          return (
            <div key={client.id} className="flex items-center gap-3">
              <div className="flex items-center gap-2 w-32 shrink-0">
                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs text-white", owner?.color || "bg-gray-500")}>
                  {client.logo}
                </div>
                <span className="text-sm text-foreground truncate">{client.name}</span>
              </div>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-16 text-right">
                {client.tasks?.length || 0} tasks
              </span>
              <span className="text-xs text-muted-foreground w-10 text-right">
                {progress}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Clients by Stage Widget
function ClientsByStageWidget({ clients }: { clients: Client[] }) {
  const stageCount = clients.reduce((acc, client) => {
    acc[client.stage] = (acc[client.stage] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const stages = [
    { name: "Live", count: stageCount["Live"] || 0, color: "bg-emerald-500" },
    { name: "Installation", count: stageCount["Installation"] || 0, color: "bg-blue-500" },
    { name: "Onboarding", count: stageCount["Onboarding"] || 0, color: "bg-purple-500" },
    { name: "Audit", count: stageCount["Audit"] || 0, color: "bg-amber-500" },
    { name: "Needs Support", count: stageCount["Needs Support"] || 0, color: "bg-rose-500" },
  ]

  const total = clients.length

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h3 className="text-sm font-medium text-foreground mb-4">Clients by Stage</h3>
      <div className="space-y-2.5">
        {stages.map(stage => (
          <div key={stage.name} className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-24 shrink-0">{stage.name}</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full", stage.color)}
                style={{ width: `${(stage.count / total) * 100}%` }}
              />
            </div>
            <span className="text-sm text-foreground w-8 text-right">{stage.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Tasks by Assignee Widget
function TasksByAssigneeWidget({ clients }: { clients: Client[] }) {
  const tasksByOwner = clients.reduce((acc, client) => {
    acc[client.owner] = (acc[client.owner] || 0) + (client.tasks?.length || 0)
    return acc
  }, {} as Record<string, number>)

  const totalTasks = Object.values(tasksByOwner).reduce((a, b) => a + b, 0)

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <h3 className="text-sm font-medium text-foreground mb-4">Tasks by Assignee</h3>
      <div className="flex items-center gap-4">
        {/* Simple bar representation */}
        <div className="flex-1 space-y-2">
          {Object.entries(tasksByOwner).slice(0, 4).map(([owner, count]) => {
            const ownerData = owners.find(o => o.name === owner)
            return (
              <div key={owner} className="flex items-center gap-2">
                <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white", ownerData?.color || "bg-gray-500")}>
                  {ownerData?.avatar || owner[0]}
                </div>
                <span className="text-xs text-muted-foreground w-16 truncate">{owner.split(" ")[0]}</span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", ownerData?.color || "bg-gray-500")}
                    style={{ width: `${(count / totalTasks) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-foreground w-6 text-right">{count}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// HGC Input Bar
function HGCInputBar() {
  return (
    <div className="border-t border-border bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <MessageSquare className="w-5 h-5 text-muted-foreground shrink-0" />
        <input
          type="text"
          placeholder="Ask about your clients..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
        />
        <button className="p-2 hover:bg-muted rounded-lg transition-colors">
          <Send className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}

export function DashboardView({ clients, onClientClick }: DashboardViewProps) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview")

  const firehoseItems = useMemo(() => generateMockFirehoseItems(clients), [clients])

  // KPI data
  const kpis: LinearKPIData[] = [
    {
      label: "total clients",
      value: clients.length,
      change: 12,
      changeLabel: "from last month",
      sparklineData: [28, 29, 30, 29, 31, 30, 32],
    },
    {
      label: "this month",
      value: "$58.5K",
      change: 8.2,
      changeLabel: "vs target",
      sparklineData: [45, 48, 52, 50, 55, 54, 58.5],
    },
    {
      label: "pending resolution",
      value: clients.filter(c => c.supportTickets > 0).length,
      change: -58,
      changeLabel: "from last week",
      sparklineData: [12, 10, 8, 7, 6, 5, 5],
    },
    {
      label: "average score",
      value: "94%",
      change: 6,
      changeLabel: "this quarter",
      sparklineData: [88, 89, 90, 91, 92, 93, 94],
    },
  ]

  const handleFirehoseItemClick = (item: FirehoseItemData) => {
    // Navigate to the correct tab
    const tabMap: Record<FirehoseTab, DashboardTab> = {
      tasks: "tasks",
      clients: "clients",
      alerts: "alerts",
      performance: "performance",
    }
    setActiveTab(tabMap[item.targetTab])
    // TODO: Also open detail drawer for the item
  }

  return (
    <div className="flex flex-col h-full">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        {kpis.map((kpi, i) => (
          <LinearKPICard key={i} data={kpi} />
        ))}
      </div>

      {/* Tabs */}
      <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden mt-4">
        {activeTab === "overview" ? (
          <div className="grid grid-cols-5 gap-4 h-full">
            {/* Left: Firehose Feed (40%) */}
            <div className="col-span-2 h-full">
              <FirehoseFeed
                items={firehoseItems}
                onItemClick={handleFirehoseItemClick}
                className="h-full"
              />
            </div>

            {/* Right: Widgets (60%) */}
            <div className="col-span-3 space-y-4 overflow-y-auto pr-1">
              <ClientProgressWidget clients={clients} />
              <ClientsByStageWidget clients={clients} />
              <TasksByAssigneeWidget clients={clients} />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} tab content coming soon...
          </div>
        )}
      </div>

      {/* HGC Input Bar */}
      <HGCInputBar />
    </div>
  )
}
