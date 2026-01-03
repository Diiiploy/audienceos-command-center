"use client"

import { KPIGrid, TimeSeriesChart, LastUpdated } from "./dashboard"
import { DataHealthDashboard } from "./data-health-dashboard"
import { ClickUpDashboard } from "./dashboard/clickup"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useDashboard } from "@/hooks/use-dashboard"
import { type Client, owners } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

interface DashboardViewProps {
  clients: Client[]
  onClientClick: (client: Client) => void
}

function getHealthColor(health: string) {
  switch (health) {
    case "Green":
      return "text-status-green"
    case "Yellow":
      return "text-status-yellow"
    case "Red":
      return "text-status-red"
    case "Blocked":
      return "text-status-blocked"
    default:
      return "text-muted-foreground"
  }
}

export function DashboardView({ clients, onClientClick }: DashboardViewProps) {
  const {
    kpis,
    kpisLoading,
    trends,
    trendsLoading,
    selectedPeriod,
    refresh,
    realtimeConnected,
    setSelectedPeriod,
    refreshDashboard,
  } = useDashboard()

  const atRiskClients = clients.filter((c) => c.health === "Red" || c.health === "Blocked")

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Command Center</h1>
          <p className="text-[12px] text-muted-foreground">Real-time overview of client fulfillment operations</p>
        </div>
        <LastUpdated
          lastUpdated={refresh.lastRefreshed}
          isRefreshing={refresh.isRefreshing}
          onRefresh={refreshDashboard}
          realtimeConnected={realtimeConnected}
        />
      </div>

      {/* ClickUp-style Dashboard (from Codia export) */}
      <ClickUpDashboard />

      {/* KPI Grid - Uses new enhanced components */}
      <KPIGrid kpis={kpis} isLoading={kpisLoading} />

      {/* Data Health Dashboard with technical metrics */}
      <DataHealthDashboard />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart - Takes 2 columns */}
        <div className="lg:col-span-2">
          <TimeSeriesChart
            data={trends?.data ?? null}
            isLoading={trendsLoading}
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
          />
        </div>

        {/* At Risk Clients */}
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-[12px] font-medium flex items-center justify-between">
              <span className="text-foreground">Clients Needing Attention</span>
              <Badge variant="destructive" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30 text-[10px]">
                {atRiskClients.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {atRiskClients.length === 0 ? (
              <p className="text-[11px] text-muted-foreground text-center py-4">All clients are healthy!</p>
            ) : (
              atRiskClients.map((client) => {
                const owner = owners.find((o) => o.name === client.owner)
                return (
                  <button
                    key={client.id}
                    onClick={() => onClientClick(client)}
                    className="w-full flex items-center gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors text-left"
                  >
                    <div className="w-5 h-5 rounded bg-muted flex items-center justify-center shrink-0">
                      <span className="text-[9px] font-semibold text-muted-foreground">{client.logo}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-foreground truncate">{client.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{client.statusNote || client.stage}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Avatar className={cn("h-4 w-4", owner?.color)}>
                        <AvatarFallback className={cn(owner?.color, "text-[8px] text-white")}>
                          {owner?.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <span className={cn("text-[10px] font-medium", getHealthColor(client.health))}>{client.health}</span>
                    </div>
                  </button>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
