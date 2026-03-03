'use client'

import { useQuery } from '@tanstack/react-query'
import type { AdPerformanceSummary } from '@/lib/services/dashboard-queries'

// Query keys factory
export const adPerformanceKeys = {
  all: ['adPerformance'] as const,
  summary: (days?: number, platform?: string) =>
    [...adPerformanceKeys.all, 'summary', days ?? 30, platform ?? 'all'] as const,
}

async function fetchAdPerformance(days: number = 30, platform: string = 'all'): Promise<AdPerformanceSummary> {
  const params = new URLSearchParams({ days: String(days) })
  if (platform !== 'all') {
    params.set('platform', platform)
  }

  const response = await fetch(`/api/v1/dashboard/ad-performance?${params}`)

  if (!response.ok) {
    throw new Error(`Failed to fetch ad performance: ${response.status}`)
  }

  const json = await response.json()
  return json.data
}

interface UseAdPerformanceOptions {
  days?: number
  platform?: string
  enabled?: boolean
}

export function useAdPerformance({ days = 30, platform = 'all', enabled = true }: UseAdPerformanceOptions = {}) {
  return useQuery({
    queryKey: adPerformanceKeys.summary(days, platform),
    queryFn: () => fetchAdPerformance(days, platform),
    staleTime: 5 * 60 * 1000, // 5 minutes — ad data doesn't change frequently
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled,
  })
}
