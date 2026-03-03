'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface AdAccountMapping {
  id: string
  platform: string
  external_account_id: string
  is_active: boolean
  created_at: string
}

export const clientAdAccountKeys = {
  all: ['clientAdAccounts'] as const,
  list: (clientId: string) => [...clientAdAccountKeys.all, clientId] as const,
}

async function fetchAdAccounts(clientId: string): Promise<AdAccountMapping[]> {
  const response = await fetch(`/api/v1/clients/${clientId}/ad-accounts`)

  if (!response.ok) {
    throw new Error(`Failed to fetch ad accounts: ${response.status}`)
  }

  const json = await response.json()
  return json.data
}

export function useClientAdAccounts(clientId: string) {
  return useQuery({
    queryKey: clientAdAccountKeys.list(clientId),
    queryFn: () => fetchAdAccounts(clientId),
    staleTime: 2 * 60 * 1000,
    enabled: !!clientId,
  })
}

export function useLinkAdAccount(clientId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { platform: string; external_account_id: string }) => {
      const response = await fetch(`/api/v1/clients/${clientId}/ad-accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        const json = await response.json().catch(() => ({}))
        throw new Error(json.error || `Failed to link ad account: ${response.status}`)
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientAdAccountKeys.list(clientId) })
    },
  })
}

export function useUnlinkAdAccount(clientId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (mappingId: string) => {
      const response = await fetch(`/api/v1/clients/${clientId}/ad-accounts`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapping_id: mappingId }),
      })

      if (!response.ok) {
        const json = await response.json().catch(() => ({}))
        throw new Error(json.error || `Failed to unlink ad account: ${response.status}`)
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientAdAccountKeys.list(clientId) })
    },
  })
}
