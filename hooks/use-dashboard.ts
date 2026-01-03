"use client"

import { useEffect, useCallback, useState, useRef } from "react"
import { useDashboardStore } from "@/stores/dashboard-store"
import {
  calculateAllKPIs,
  fetchTrends,
} from "@/lib/services/kpi-service"
import {
  fetchDashboardData,
  calculateActiveOnboardings,
  calculateAtRiskClients,
  calculateSupportHours,
  calculateAvgInstallTime,
} from "@/lib/services/dashboard-queries"
import { createClient, getAuthenticatedUser } from "@/lib/supabase"
import type { TimePeriod, DashboardKPIs, DashboardTrends, RefreshState } from "@/types/dashboard"

// Mock data fallback - converts mock data to database format
import { mockClients, mockTickets } from "@/lib/mock-data"
import type { Database } from "@/types/database"

type Client = Database['public']['Tables']['client']['Row']
type Ticket = Database['public']['Tables']['ticket']['Row']
type StageEvent = Database['public']['Tables']['stage_event']['Row']

// Convert mock clients to database format (fallback for demo mode)
function adaptMockClients(): Client[] {
  return mockClients.map((c) => ({
    id: c.id,
    agency_id: "mock-agency",
    name: c.name,
    contact_email: c.onboardingData?.contactEmail || null,
    contact_name: null,
    stage: c.stage,
    health_status: c.health.toLowerCase() as "green" | "yellow" | "red",
    days_in_stage: c.daysInStage,
    install_date: c.stage === "Live" ? new Date().toISOString() : null,
    total_spend: null,
    lifetime_value: null,
    notes: c.statusNote || null,
    tags: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))
}

// Convert mock tickets to database format (fallback for demo mode)
function adaptMockTickets(): Ticket[] {
  return mockTickets.map((t) => ({
    id: t.id,
    agency_id: "mock-agency",
    client_id: t.clientId,
    number: parseInt(t.id.replace("T", ""), 10),
    title: t.title,
    description: t.description,
    category: "technical" as const,
    priority: t.priority.toLowerCase() as "low" | "medium" | "high",
    status: t.status.toLowerCase().replace(/ /g, "_") as "new" | "in_progress" | "waiting_client" | "resolved",
    assignee_id: null,
    resolution_notes: null,
    time_spent_minutes: Math.floor(Math.random() * 120) + 30,
    due_date: null,
    created_by: "mock-user",
    resolved_by: null,
    resolved_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))
}

// Generate mock stage events for chart data (fallback for demo mode)
function generateMockStageEvents(): StageEvent[] {
  const events: StageEvent[] = []
  const now = new Date()

  for (let i = 0; i < 90; i++) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)

    const newClients = Math.floor(Math.random() * 4)
    for (let j = 0; j < newClients; j++) {
      events.push({
        id: `event-new-${i}-${j}`,
        agency_id: "mock-agency",
        client_id: `client-${i}-${j}`,
        from_stage: null,
        to_stage: "Onboarding",
        moved_by: "mock-user",
        moved_at: date.toISOString(),
        notes: null,
      })
    }

    const completedInstalls = Math.floor(Math.random() * 3)
    for (let j = 0; j < completedInstalls; j++) {
      events.push({
        id: `event-live-${i}-${j}`,
        agency_id: "mock-agency",
        client_id: `client-live-${i}-${j}`,
        from_stage: "Audit",
        to_stage: "Live",
        moved_by: "mock-user",
        moved_at: date.toISOString(),
        notes: null,
      })
    }
  }

  return events
}

interface UseDashboardReturn {
  // State
  kpis: DashboardKPIs | null
  kpisLoading: boolean
  kpisError: string | null
  trends: DashboardTrends | null
  trendsLoading: boolean
  trendsError: string | null
  selectedPeriod: TimePeriod
  refresh: RefreshState
  realtimeConnected: boolean
  isUsingRealData: boolean

  // Actions
  setSelectedPeriod: (period: TimePeriod) => void
  refreshDashboard: () => Promise<void>
}

export function useDashboard(): UseDashboardReturn {
  const [isUsingRealData, setIsUsingRealData] = useState(false)
  const supabase = createClient()

  const {
    kpis,
    kpisLoading,
    kpisError,
    trends,
    trendsLoading,
    trendsError,
    selectedPeriod,
    refresh,
    realtimeConnected,
    setKPIs,
    setKPIsLoading,
    setKPIsError,
    setTrends,
    setTrendsLoading,
    setTrendsError,
    setSelectedPeriod,
    setRefreshState,
    setRealtimeConnected,
  } = useDashboardStore()

  const loadKPIs = useCallback(async (forceRefresh = false) => {
    setKPIsLoading(true)
    try {
      // Try to get authenticated user with timeout (5s max)
      let user = null
      let agencyId: string | null = null

      try {
        const authPromise = getAuthenticatedUser(supabase)
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Auth timeout')), 5000)
        )
        const authResult = await Promise.race([authPromise, timeoutPromise])
        user = authResult.user
        agencyId = authResult.agencyId
      } catch {
        // Auth failed or timed out - silently fall back to mock data
      }

      let clients: Client[]
      let tickets: Ticket[]
      let stageEvents: StageEvent[]
      let usingReal = false

      if (user && agencyId) {
        // Fetch real data from Supabase
        const dashboardData = await fetchDashboardData(supabase, agencyId, 90)
        clients = dashboardData.clients
        tickets = dashboardData.tickets
        stageEvents = dashboardData.stageEvents

        // Only use real data if we have some
        if (clients.length > 0) {
          usingReal = true
          setIsUsingRealData(true)
        } else {
          // Fall back to mock if no real data
          clients = adaptMockClients()
          tickets = adaptMockTickets()
          stageEvents = generateMockStageEvents()
          setIsUsingRealData(false)
        }
      } else {
        // Not authenticated - use mock data
        clients = adaptMockClients()
        tickets = adaptMockTickets()
        stageEvents = generateMockStageEvents()
        setIsUsingRealData(false)
      }

      const kpisData = await calculateAllKPIs(
        agencyId || "mock-agency",
        clients,
        tickets,
        stageEvents,
        forceRefresh
      )

      // If using real data, override KPI values
      if (usingReal) {
        const activeOnboardings = calculateActiveOnboardings(clients)
        const atRiskClients = calculateAtRiskClients(clients)
        const supportHours = calculateSupportHours(tickets)
        const avgInstallTime = calculateAvgInstallTime(stageEvents, clients)

        kpisData.activeOnboardings = {
          ...kpisData.activeOnboardings,
          value: activeOnboardings,
          displayValue: String(activeOnboardings),
        }
        kpisData.atRiskClients = {
          ...kpisData.atRiskClients,
          value: atRiskClients,
          displayValue: String(atRiskClients),
        }
        kpisData.supportHoursWeek = {
          ...kpisData.supportHoursWeek,
          value: supportHours,
          displayValue: `${supportHours}h`,
        }
        kpisData.avgInstallTime = {
          ...kpisData.avgInstallTime,
          value: avgInstallTime,
          displayValue: avgInstallTime === 0 ? '0 Days' : `${avgInstallTime} Days`,
        }
      }

      setKPIs(kpisData)
      // Note: setKPIs already sets kpisLoading: false in the store
    } catch (error) {
      console.error('[use-dashboard] loadKPIs error:', error)
      setKPIsError(error instanceof Error ? error.message : "Failed to load KPIs")
      // Note: setKPIsError already sets kpisLoading: false in the store

      // Fallback to mock data on error
      try {
        const clients = adaptMockClients()
        const tickets = adaptMockTickets()
        const stageEvents = generateMockStageEvents()
        const kpisData = await calculateAllKPIs(
          "mock-agency",
          clients,
          tickets,
          stageEvents,
          false
        )
        setKPIs(kpisData)
        setIsUsingRealData(false)
      } catch {
        // Complete failure - don't try to recover
      }
    }
  }, [supabase, setKPIs, setKPIsLoading, setKPIsError])

  const loadTrends = useCallback(async (period: TimePeriod, forceRefresh = false) => {
    setTrendsLoading(true)
    try {
      // Try to get authenticated user with timeout (5s max)
      let agencyId: string | null = null
      try {
        const authPromise = getAuthenticatedUser(supabase)
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Auth timeout')), 5000)
        )
        const authResult = await Promise.race([authPromise, timeoutPromise])
        agencyId = authResult.agencyId
      } catch {
        // Auth failed or timed out - continue with mock data
      }

      let stageEvents: StageEvent[]

      if (agencyId) {
        const dashboardData = await fetchDashboardData(supabase, agencyId, 90)
        stageEvents = dashboardData.stageEvents.length > 0
          ? dashboardData.stageEvents
          : generateMockStageEvents()
      } else {
        stageEvents = generateMockStageEvents()
      }

      const trendsData = await fetchTrends(
        agencyId || "mock-agency",
        stageEvents,
        period,
        forceRefresh
      )
      setTrends(trendsData)
      // Note: setTrends already sets trendsLoading: false in the store
    } catch (error) {
      console.error('[use-dashboard] loadTrends error:', error)
      setTrendsError(error instanceof Error ? error.message : "Failed to load trends")
      // Note: setTrendsError already sets trendsLoading: false in the store

      // Fallback to mock data
      try {
        const stageEvents = generateMockStageEvents()
        const trendsData = await fetchTrends("mock-agency", stageEvents, period, false)
        setTrends(trendsData)
      } catch {
        // Complete failure
      }
    }
  }, [supabase, setTrends, setTrendsLoading, setTrendsError])

  const refreshDashboard = useCallback(async () => {
    setRefreshState({ isRefreshing: true, error: null })
    try {
      await Promise.all([
        loadKPIs(true),
        loadTrends(selectedPeriod, true),
      ])
      setRefreshState({
        isRefreshing: false,
        lastRefreshed: new Date().toISOString(),
        error: null,
      })
    } catch (error) {
      setRefreshState({
        isRefreshing: false,
        error: error instanceof Error ? error.message : "Failed to refresh",
      })
    }
  }, [loadKPIs, loadTrends, selectedPeriod, setRefreshState])

  const handlePeriodChange = useCallback((period: TimePeriod) => {
    setSelectedPeriod(period)
    loadTrends(period)
  }, [setSelectedPeriod, loadTrends])

  // Track if initial load has happened (true mount-only behavior)
  const hasInitializedRef = useRef(false)

  // Initial load - runs once on mount using ref guard
  useEffect(() => {
    if (hasInitializedRef.current) return
    hasInitializedRef.current = true

    loadKPIs()
    loadTrends(selectedPeriod)
    setRealtimeConnected(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentional: mount-only effect guarded by ref
  }, [])

  // Reload trends when period changes
  useEffect(() => {
    if (trends && trends.period !== selectedPeriod) {
      loadTrends(selectedPeriod)
    }
  }, [selectedPeriod, trends, loadTrends])

  return {
    kpis,
    kpisLoading,
    kpisError,
    trends,
    trendsLoading,
    trendsError,
    selectedPeriod,
    refresh,
    realtimeConnected,
    isUsingRealData,
    setSelectedPeriod: handlePeriodChange,
    refreshDashboard,
  }
}
