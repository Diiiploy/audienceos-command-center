'use client'

import { useQuery } from '@tanstack/react-query'
import type { AdPerformanceSummary } from '@/lib/services/dashboard-queries'

export const clientAdPerformanceKeys = {
  all: ['clientAdPerformance'] as const,
  summary: (clientId: string, days?: number, platform?: string) =>
    [...clientAdPerformanceKeys.all, clientId, days ?? 30, platform ?? 'all'] as const,
}

async function fetchClientAdPerformance(
  clientId: string,
  days: number = 30,
  platform: string = 'all'
): Promise<AdPerformanceSummary> {
  const params = new URLSearchParams({ days: String(days) })
  if (platform !== 'all') {
    params.set('platform', platform)
  }

  const response = await fetch(`/api/v1/clients/${clientId}/ad-performance?${params}`)

  if (!response.ok) {
    throw new Error(`Failed to fetch client ad performance: ${response.status}`)
  }

  const json = await response.json()
  return json.data
}

interface UseClientAdPerformanceOptions {
  clientId: string
  days?: number
  platform?: string
  enabled?: boolean
}

export function useClientAdPerformance({
  clientId,
  days = 30,
  platform = 'all',
  enabled = true,
}: UseClientAdPerformanceOptions) {
  return useQuery({
    queryKey: clientAdPerformanceKeys.summary(clientId, days, platform),
    queryFn: () => fetchClientAdPerformance(clientId, days, platform),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: enabled && !!clientId,
  })
}
