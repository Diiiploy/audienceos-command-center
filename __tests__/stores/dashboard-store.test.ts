/**
 * Dashboard Store Tests
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { useDashboardStore } from '@/stores/dashboard-store'
import type { DashboardKPIs, DashboardTrends, KPI } from '@/types/dashboard'

const mockKPI: KPI = {
  id: 'active_onboardings',
  label: 'Active Onboardings',
  value: 10,
  displayValue: '10',
  trend: 'up',
  changePercent: 5,
  previousValue: 8,
  drillDownUrl: null,
  lastUpdated: new Date().toISOString(),
}

const mockKPIs: DashboardKPIs = {
  activeOnboardings: { ...mockKPI, id: 'active_onboardings', label: 'Active Onboardings', value: 5, displayValue: '5' },
  atRiskClients: { ...mockKPI, id: 'at_risk_clients', label: 'At Risk Clients', value: 2, displayValue: '2', trend: 'down' },
  supportHoursWeek: { ...mockKPI, id: 'support_hours', label: 'Support Hours', value: 40, displayValue: '40h' },
  avgInstallTime: { ...mockKPI, id: 'avg_install_time', label: 'Avg Install Time', value: 7, displayValue: '7 days' },
  clientsNeedingAttention: { ...mockKPI, id: 'clients_needing_attention', label: 'Needs Attention', value: 3, displayValue: '3' },
}

const mockTrends: DashboardTrends = {
  data: [
    { date: '2024-01-01', newClients: 5, completedInstalls: 3 },
    { date: '2024-01-02', newClients: 7, completedInstalls: 4 },
  ],
  period: 30,
  lastUpdated: new Date().toISOString(),
}

describe('dashboard-store', () => {
  beforeEach(() => {
    useDashboardStore.getState().reset()
  })

  describe('initial state', () => {
    it('should have null kpis initially', () => {
      const state = useDashboardStore.getState()
      expect(state.kpis).toBeNull()
    })

    it('should not be loading initially', () => {
      const state = useDashboardStore.getState()
      expect(state.kpisLoading).toBe(false)
      expect(state.trendsLoading).toBe(false)
    })

    it('should have default period of 30', () => {
      const state = useDashboardStore.getState()
      expect(state.selectedPeriod).toBe(30)
    })

    it('should have null errors initially', () => {
      const state = useDashboardStore.getState()
      expect(state.kpisError).toBeNull()
      expect(state.trendsError).toBeNull()
    })

    it('should have realtime disconnected initially', () => {
      const state = useDashboardStore.getState()
      expect(state.realtimeConnected).toBe(false)
    })

    it('should have initial refresh state', () => {
      const state = useDashboardStore.getState()
      expect(state.refresh.isRefreshing).toBe(false)
      expect(state.refresh.lastRefreshed).toBeNull()
      expect(state.refresh.error).toBeNull()
    })
  })

  describe('setKPIs', () => {
    it('should set KPIs and clear loading', () => {
      useDashboardStore.getState().setKPIsLoading(true)
      useDashboardStore.getState().setKPIs(mockKPIs)

      const state = useDashboardStore.getState()
      expect(state.kpis).toEqual(mockKPIs)
      expect(state.kpisLoading).toBe(false)
      expect(state.kpisError).toBeNull()
    })

    it('should update lastRefreshed timestamp', () => {
      useDashboardStore.getState().setKPIs(mockKPIs)

      const state = useDashboardStore.getState()
      expect(state.refresh.lastRefreshed).toBeTruthy()
    })
  })

  describe('setKPIsLoading', () => {
    it('should set loading state', () => {
      useDashboardStore.getState().setKPIsLoading(true)
      expect(useDashboardStore.getState().kpisLoading).toBe(true)

      useDashboardStore.getState().setKPIsLoading(false)
      expect(useDashboardStore.getState().kpisLoading).toBe(false)
    })
  })

  describe('setKPIsError', () => {
    it('should set error and clear loading', () => {
      useDashboardStore.getState().setKPIsLoading(true)
      useDashboardStore.getState().setKPIsError('Network error')

      const state = useDashboardStore.getState()
      expect(state.kpisError).toBe('Network error')
      expect(state.kpisLoading).toBe(false)
    })

    it('should update refresh state with error', () => {
      useDashboardStore.getState().setKPIsError('Failed to load')

      const state = useDashboardStore.getState()
      expect(state.refresh.error).toBe('Failed to load')
      expect(state.refresh.isRefreshing).toBe(false)
    })

    it('should clear error when set to null', () => {
      useDashboardStore.getState().setKPIsError('Error')
      useDashboardStore.getState().setKPIsError(null)

      expect(useDashboardStore.getState().kpisError).toBeNull()
    })
  })

  describe('setTrends', () => {
    it('should set trends and clear loading', () => {
      useDashboardStore.getState().setTrendsLoading(true)
      useDashboardStore.getState().setTrends(mockTrends)

      const state = useDashboardStore.getState()
      expect(state.trends).toEqual(mockTrends)
      expect(state.trendsLoading).toBe(false)
      expect(state.trendsError).toBeNull()
    })
  })

  describe('setTrendsLoading', () => {
    it('should set trends loading state', () => {
      useDashboardStore.getState().setTrendsLoading(true)
      expect(useDashboardStore.getState().trendsLoading).toBe(true)
    })
  })

  describe('setTrendsError', () => {
    it('should set trends error and clear loading', () => {
      useDashboardStore.getState().setTrendsLoading(true)
      useDashboardStore.getState().setTrendsError('Trends failed')

      const state = useDashboardStore.getState()
      expect(state.trendsError).toBe('Trends failed')
      expect(state.trendsLoading).toBe(false)
    })
  })

  describe('setSelectedPeriod', () => {
    it('should update selected period', () => {
      useDashboardStore.getState().setSelectedPeriod(7)
      expect(useDashboardStore.getState().selectedPeriod).toBe(7)

      useDashboardStore.getState().setSelectedPeriod(90)
      expect(useDashboardStore.getState().selectedPeriod).toBe(90)
    })
  })

  describe('setRefreshState', () => {
    it('should merge refresh state', () => {
      useDashboardStore.getState().setRefreshState({ isRefreshing: true })
      expect(useDashboardStore.getState().refresh.isRefreshing).toBe(true)

      useDashboardStore.getState().setRefreshState({
        isRefreshing: false,
        lastRefreshed: '2024-01-01T00:00:00Z',
      })

      const state = useDashboardStore.getState()
      expect(state.refresh.isRefreshing).toBe(false)
      expect(state.refresh.lastRefreshed).toBe('2024-01-01T00:00:00Z')
    })
  })

  describe('setRealtimeConnected', () => {
    it('should update realtime connection status', () => {
      useDashboardStore.getState().setRealtimeConnected(true)
      expect(useDashboardStore.getState().realtimeConnected).toBe(true)

      useDashboardStore.getState().setRealtimeConnected(false)
      expect(useDashboardStore.getState().realtimeConnected).toBe(false)
    })
  })

  describe('updateSingleKPI', () => {
    it('should update single KPI value', () => {
      useDashboardStore.getState().setKPIs(mockKPIs)
      useDashboardStore.getState().updateSingleKPI('active_onboardings', { value: 10 })

      const state = useDashboardStore.getState()
      expect(state.kpis?.activeOnboardings.value).toBe(10)
    })

    it('should update single KPI trend', () => {
      useDashboardStore.getState().setKPIs(mockKPIs)
      useDashboardStore.getState().updateSingleKPI('at_risk_clients', { trend: 'down' })

      const state = useDashboardStore.getState()
      expect(state.kpis?.atRiskClients.trend).toBe('down')
    })

    it('should not update if kpis is null', () => {
      useDashboardStore.getState().updateSingleKPI('active_onboardings', { value: 10 })
      expect(useDashboardStore.getState().kpis).toBeNull()
    })

    it('should not update for invalid kpi type', () => {
      useDashboardStore.getState().setKPIs(mockKPIs)
      const originalKPIs = { ...mockKPIs }
      useDashboardStore.getState().updateSingleKPI('invalid' as never, { value: 999 })

      // KPIs should remain unchanged
      expect(useDashboardStore.getState().kpis?.activeOnboardings.value).toBe(
        originalKPIs.activeOnboardings.value
      )
    })

    it('should update support_hours KPI', () => {
      useDashboardStore.getState().setKPIs(mockKPIs)
      useDashboardStore.getState().updateSingleKPI('support_hours', { value: 50 })

      expect(useDashboardStore.getState().kpis?.supportHoursWeek.value).toBe(50)
    })

    it('should update avg_install_time KPI', () => {
      useDashboardStore.getState().setKPIs(mockKPIs)
      useDashboardStore.getState().updateSingleKPI('avg_install_time', { value: 5 })

      expect(useDashboardStore.getState().kpis?.avgInstallTime.value).toBe(5)
    })

    it('should update clients_needing_attention KPI', () => {
      useDashboardStore.getState().setKPIs(mockKPIs)
      useDashboardStore.getState().updateSingleKPI('clients_needing_attention', { value: 0 })

      expect(useDashboardStore.getState().kpis?.clientsNeedingAttention.value).toBe(0)
    })
  })

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      // Set various state values
      useDashboardStore.getState().setKPIs(mockKPIs)
      useDashboardStore.getState().setTrends(mockTrends)
      useDashboardStore.getState().setSelectedPeriod(7)
      useDashboardStore.getState().setRealtimeConnected(true)

      // Reset
      useDashboardStore.getState().reset()

      const state = useDashboardStore.getState()
      expect(state.kpis).toBeNull()
      expect(state.trends).toBeNull()
      expect(state.selectedPeriod).toBe(30)
      expect(state.realtimeConnected).toBe(false)
      expect(state.kpisLoading).toBe(false)
      expect(state.trendsLoading).toBe(false)
    })
  })
})
