'use client'

import { useQuery } from '@tanstack/react-query'
import type { AdPerformanceSummary } from '@/lib/services/dashboard-queries'

// Query keys factory
export const adPerformanceKeys = {
  all: ['adPerformance'] as const,
  summary: (days?: number, platform?: string, clientId?: string) =>
    [...adPerformanceKeys.all, 'summary', days ?? 30, platform ?? 'all', clientId ?? 'agency'] as const,
}

async function fetchAdPerformance(days: number = 30, platform: string = 'all', clientId?: string): Promise<AdPerformanceSummary> {
  const params = new URLSearchParams({ days: String(days) })
  if (platform !== 'all') {
    params.set('platform', platform)
  }

  // Use per-client endpoint when a client is selected, otherwise agency-wide
  const url = clientId
    ? `/api/v1/clients/${clientId}/ad-performance?${params}`
    : `/api/v1/dashboard/ad-performance?${params}`

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to fetch ad performance: ${response.status}`)
  }

  const json = await response.json()
  return json.data
}

interface UseAdPerformanceOptions {
  days?: number
  platform?: string
  clientId?: string
  enabled?: boolean
}

export function useAdPerformance({ days = 30, platform = 'all', clientId, enabled = true }: UseAdPerformanceOptions = {}) {
  return useQuery({
    queryKey: adPerformanceKeys.summary(days, platform, clientId),
    queryFn: () => fetchAdPerformance(days, platform, clientId),
    staleTime: 5 * 60 * 1000, // 5 minutes — ad data doesn't change frequently
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled,
  })
}
