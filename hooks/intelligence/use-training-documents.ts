'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchWithCsrf } from '@/lib/csrf'
import { intelligenceKeys } from './use-chat-history'

// Extend the intelligence keys for documents
export const documentKeys = {
  all: [...intelligenceKeys.all, 'documents'] as const,
  list: () => [...documentKeys.all, 'list'] as const,
}

interface DocumentRow {
  id: string
  agency_id: string
  title: string
  file_name: string
  file_size: number
  mime_type: string
  storage_path: string | null
  category: string | null
  client_id: string | null
  index_status: 'pending' | 'indexing' | 'indexed' | 'failed'
  uploaded_by: string | null
  is_active: boolean
  is_starred: boolean | null
  use_for_training: boolean | null
  drive_url: string | null
  created_at: string
}

/**
 * Fetch documents from the existing /api/v1/documents endpoint
 */
async function fetchDocuments(): Promise<{ data: DocumentRow[] }> {
  const response = await fetch('/api/v1/documents', {
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch documents')
  }

  return response.json()
}

/**
 * Hook to fetch training documents (all documents from Knowledge Base)
 */
export function useTrainingDocuments() {
  return useQuery({
    queryKey: documentKeys.list(),
    queryFn: fetchDocuments,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

/**
 * Hook to upload a training document via the existing documents API
 */
export function useUploadTrainingDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('use_for_training', 'true')

      const response = await fetchWithCsrf('/api/v1/documents', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Upload failed' }))
        throw new Error(error.error || 'Failed to upload document')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.all })
    },
  })
}

/**
 * Hook to delete a training document
 */
export function useDeleteTrainingDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentId: string) => {
      const response = await fetchWithCsrf(`/api/v1/documents/${documentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Delete failed' }))
        throw new Error(error.error || 'Failed to delete document')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.all })
    },
  })
}
