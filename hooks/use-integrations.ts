import { useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useIntegrationsStore } from '@/lib/store'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type Integration = Database['public']['Tables']['integration']['Row']

/**
 * Hook for fetching and subscribing to integration updates
 * Uses Supabase Realtime for live updates
 */
export function useIntegrations() {
  const {
    integrations,
    isLoading,
    setIntegrations,
    updateIntegration,
    addIntegration,
    removeIntegration,
    setLoading,
  } = useIntegrationsStore()

  // Fetch integrations
  const fetchIntegrations = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/v1/integrations')
      if (!response.ok) {
        throw new Error('Failed to fetch integrations')
      }
      const { data } = await response.json()
      setIntegrations(data || [])
    } catch (error) {
      console.error('Error fetching integrations:', error)
    } finally {
      setLoading(false)
    }
  }, [setIntegrations, setLoading])

  // Set up Realtime subscription
  useEffect(() => {
    const supabase = createClient()

    // Subscribe to integration changes
    const channel = supabase
      .channel('integrations-changes')
      .on<Integration>(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'integration',
        },
        (payload: RealtimePostgresChangesPayload<Integration>) => {
          const { eventType, new: newRecord, old: oldRecord } = payload

          switch (eventType) {
            case 'INSERT':
              if (newRecord) {
                addIntegration(newRecord as Integration)
              }
              break
            case 'UPDATE':
              if (newRecord && 'id' in newRecord) {
                // Only update if we have the integration in state
                const exists = integrations.find(i => i.id === newRecord.id)
                if (exists) {
                  updateIntegration(newRecord.id, newRecord as Partial<Integration>)
                }
              }
              break
            case 'DELETE':
              if (oldRecord && 'id' in oldRecord && typeof oldRecord.id === 'string') {
                removeIntegration(oldRecord.id)
              }
              break
          }
        }
      )
      .subscribe()

    // Initial fetch
    fetchIntegrations()

    // Cleanup
    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchIntegrations, addIntegration, updateIntegration, removeIntegration, integrations])

  return {
    integrations,
    isLoading,
    refetch: fetchIntegrations,
  }
}

/**
 * Hook for subscribing to a single integration's status
 */
export function useIntegrationStatus(integrationId: string) {
  const { integrations, updateIntegration } = useIntegrationsStore()
  const integration = integrations.find((i) => i.id === integrationId)

  useEffect(() => {
    if (!integrationId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`integration-${integrationId}`)
      .on<Integration>(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'integration',
          filter: `id=eq.${integrationId}`,
        },
        (payload: RealtimePostgresChangesPayload<Integration>) => {
          if (payload.new && 'id' in payload.new) {
            updateIntegration(payload.new.id, payload.new as Partial<Integration>)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [integrationId, updateIntegration])

  return integration
}
