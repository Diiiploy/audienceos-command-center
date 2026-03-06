'use client'

import { useQuery } from '@tanstack/react-query'
import type { AdPerformanceSummary } from '@/lib/services/dashboard-queries'

export const clientAdPerformanceKeys = {
  all: ['clientAdPerformance'] as const,
  summary: (clientId: string, days?: number, platform?: string, startDate?: string, endDate?: string, compareStartDate?: string, compareEndDate?: string, accountId?: string) =>
    [...clientAdPerformanceKeys.all, clientId, days ?? 30, platform ?? 'all', startDate ?? '', endDate ?? '', compareStartDate ?? '', compareEndDate ?? '', accountId ?? ''] as const,
}

interface UseClientAdPerformanceOptions {
  clientId: string
  days?: number
  platform?: string
  startDate?: string
  endDate?: string
  compareStartDate?: string
  compareEndDate?: string
  accountId?: string
  enabled?: boolean
}

async function fetchClientAdPerformance(options: UseClientAdPerformanceOptions): Promise<AdPerformanceSummary> {
  const { clientId, days = 30, platform = 'all', startDate, endDate, compareStartDate, compareEndDate, accountId } = options
  const params = new URLSearchParams({ days: String(days) })
  if (platform !== 'all') {
    params.set('platform', platform)
  }
  if (startDate) params.set('startDate', startDate)
  if (endDate) params.set('endDate', endDate)
  if (compareStartDate) params.set('compareStartDate', compareStartDate)
  if (compareEndDate) params.set('compareEndDate', compareEndDate)
  if (accountId) params.set('accountId', accountId)

  const response = await fetch(`/api/v1/clients/${clientId}/ad-performance?${params}`)

  if (!response.ok) {
    throw new Error(`Failed to fetch client ad performance: ${response.status}`)
  }

  const json = await response.json()
  return json.data
}

export function useClientAdPerformance({
  clientId,
  days = 30,
  platform = 'all',
  startDate,
  endDate,
  compareStartDate,
  compareEndDate,
  accountId,
  enabled = true,
}: UseClientAdPerformanceOptions) {
  return useQuery({
    queryKey: clientAdPerformanceKeys.summary(clientId, days, platform, startDate, endDate, compareStartDate, compareEndDate, accountId),
    queryFn: () => fetchClientAdPerformance({ clientId, days, platform, startDate, endDate, compareStartDate, compareEndDate, accountId }),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: enabled && !!clientId,
  })
}
