'use client'

import { useQuery } from '@tanstack/react-query'
import { intelligenceKeys } from './use-chat-history'
import type { FirehoseItemData } from '@/components/dashboard'

// Extend intelligence keys for activity
export const activityKeys = {
  all: [...intelligenceKeys.all, 'activity'] as const,
  feed: () => [...activityKeys.all, 'feed'] as const,
}

interface ActivityApiItem {
  id: string
  severity: 'critical' | 'warning' | 'info'
  title: string
  description: string
  timestamp: string
  clientName?: string
  clientId?: string
  assignee?: string
  targetTab: 'tasks' | 'clients' | 'alerts' | 'performance'
}

/**
 * Fetch activity feed from the aggregation API
 */
async function fetchActivityFeed(limit = 20): Promise<{ data: ActivityApiItem[] }> {
  const response = await fetch(`/api/v1/activity?limit=${limit}`, {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch activity feed')
  }

  return response.json()
}

/**
 * Hook to fetch the unified activity feed with 30-second polling
 */
export function useActivityFeed(limit = 20) {
  return useQuery({
    queryKey: activityKeys.feed(),
    queryFn: () => fetchActivityFeed(limit),
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 5 * 60 * 1000,
    refetchInterval: 30 * 1000, // Poll every 30 seconds
    refetchOnWindowFocus: true,
    select: (data): FirehoseItemData[] =>
      (data.data || []).map((item) => ({
        id: item.id,
        severity: item.severity,
        title: item.title,
        description: item.description,
        timestamp: new Date(item.timestamp),
        clientName: item.clientName,
        clientId: item.clientId,
        assignee: item.assignee,
        targetTab: item.targetTab,
      })),
  })
}
