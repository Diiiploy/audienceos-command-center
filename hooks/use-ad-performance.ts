'use client'

import { useQuery } from '@tanstack/react-query'
import type { AdPerformanceSummary } from '@/lib/services/dashboard-queries'

// Query keys factory
export const adPerformanceKeys = {
  all: ['adPerformance'] as const,
  summary: (days?: number, platform?: string, clientId?: string, startDate?: string, endDate?: string, compareStartDate?: string, compareEndDate?: string) =>
    [...adPerformanceKeys.all, 'summary', days ?? 30, platform ?? 'all', clientId ?? 'agency', startDate ?? '', endDate ?? '', compareStartDate ?? '', compareEndDate ?? ''] as const,
}

interface UseAdPerformanceOptions {
  days?: number
  platform?: string
  clientId?: string
  startDate?: string
  endDate?: string
  compareStartDate?: string
  compareEndDate?: string
  enabled?: boolean
}

async function fetchAdPerformance(options: UseAdPerformanceOptions): Promise<AdPerformanceSummary> {
  const { days = 30, platform = 'all', clientId, startDate, endDate, compareStartDate, compareEndDate } = options
  const params = new URLSearchParams({ days: String(days) })
  if (platform !== 'all') {
    params.set('platform', platform)
  }
  if (startDate) params.set('startDate', startDate)
  if (endDate) params.set('endDate', endDate)
  if (compareStartDate) params.set('compareStartDate', compareStartDate)
  if (compareEndDate) params.set('compareEndDate', compareEndDate)

  // Use per-client endpoint when a client is selected, otherwise agency-wide
  const url = clientId
    ? `/api/v1/clients/${clientId}/ad-performance?${params}`
    : `/api/v1/dashboard/ad-performance?${params}`

  const response = await fetch(url, { credentials: 'include' })

  if (!response.ok) {
    throw new Error(`Failed to fetch ad performance: ${response.status}`)
  }

  const json = await response.json()
  return json.data
}

export function useAdPerformance({ days = 30, platform = 'all', clientId, startDate, endDate, compareStartDate, compareEndDate, enabled = true }: UseAdPerformanceOptions = {}) {
  return useQuery({
    queryKey: adPerformanceKeys.summary(days, platform, clientId, startDate, endDate, compareStartDate, compareEndDate),
    queryFn: () => fetchAdPerformance({ days, platform, clientId, startDate, endDate, compareStartDate, compareEndDate }),
    staleTime: 5 * 60 * 1000, // 5 minutes — ad data doesn't change frequently
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled,
  })
}
