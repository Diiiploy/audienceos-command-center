'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchWithCsrf } from '@/lib/csrf'
import { intelligenceKeys } from './use-chat-history'

// Extend intelligence keys for prompts
export const promptKeys = {
  all: [...intelligenceKeys.all, 'prompts'] as const,
  list: () => [...promptKeys.all, 'list'] as const,
}

export interface CustomPromptRow {
  id: string
  agency_id: string
  created_by: string
  name: string
  description: string | null
  prompt_template: string
  category: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface CreatePromptInput {
  name: string
  description?: string
  prompt_template: string
  category: string
}

interface UpdatePromptInput extends CreatePromptInput {
  id: string
}

/**
 * Fetch custom prompts for the agency
 */
async function fetchPrompts(): Promise<{ data: CustomPromptRow[] }> {
  const response = await fetch('/api/v1/prompts', {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch prompts')
  }

  return response.json()
}

/**
 * Hook to list custom prompts
 */
export function useCustomPrompts() {
  return useQuery({
    queryKey: promptKeys.list(),
    queryFn: fetchPrompts,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

/**
 * Hook to create a custom prompt
 */
export function useCreatePrompt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreatePromptInput) => {
      const response = await fetchWithCsrf('/api/v1/prompts', {
        method: 'POST',
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Create failed' }))
        throw new Error(error.error || 'Failed to create prompt')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promptKeys.all })
    },
  })
}

/**
 * Hook to update a custom prompt
 */
export function useUpdatePrompt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdatePromptInput) => {
      const response = await fetchWithCsrf(`/api/v1/prompts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Update failed' }))
        throw new Error(error.error || 'Failed to update prompt')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promptKeys.all })
    },
  })
}

/**
 * Hook to delete a custom prompt
 */
export function useDeletePrompt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (promptId: string) => {
      const response = await fetchWithCsrf(`/api/v1/prompts/${promptId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Delete failed' }))
        throw new Error(error.error || 'Failed to delete prompt')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: promptKeys.all })
    },
  })
}
