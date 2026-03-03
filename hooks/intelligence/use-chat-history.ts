'use client'

import { useQuery } from '@tanstack/react-query'
import type { ChatSession, ChatMessage } from '@/lib/chat/context/chat-history'

// Query key factory — same pattern as communicationsKeys
export const intelligenceKeys = {
  all: ['intelligence'] as const,
  sessions: () => [...intelligenceKeys.all, 'sessions'] as const,
  messages: (sessionId: string, role?: string) =>
    [...intelligenceKeys.all, 'messages', sessionId, role] as const,
}

interface SessionsResponse {
  data: ChatSession[]
  total: number
  limit: number
  offset: number
}

interface MessagesResponse {
  data: ChatMessage[]
}

/**
 * Fetch chat sessions for the current user
 */
async function fetchChatSessions(limit = 20, offset = 0): Promise<SessionsResponse> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
  const response = await fetch(`/api/v1/chat/sessions?${params}`, {
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch sessions' }))
    throw new Error(error.error || 'Failed to fetch sessions')
  }

  return response.json()
}

/**
 * Fetch messages for a specific session, optionally filtered by role
 */
async function fetchSessionMessages(
  sessionId: string,
  role?: 'user' | 'assistant'
): Promise<MessagesResponse> {
  const params = new URLSearchParams()
  if (role) params.set('role', role)

  const response = await fetch(`/api/v1/chat/sessions/${sessionId}/messages?${params}`, {
    credentials: 'include',
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch messages' }))
    throw new Error(error.error || 'Failed to fetch messages')
  }

  return response.json()
}

/**
 * Hook to fetch the user's chat sessions
 */
export function useChatSessions(limit = 20, offset = 0) {
  return useQuery({
    queryKey: intelligenceKeys.sessions(),
    queryFn: () => fetchChatSessions(limit, offset),
    staleTime: 30 * 1000, // 30 seconds — sessions update on new messages
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

/**
 * Hook to fetch messages for a specific session
 * Role filter maps directly to tab:
 *   - undefined = "All" tab
 *   - 'user' = "Your Messages" tab
 *   - 'assistant' = "AI Responses" tab
 */
export function useChatMessages(
  sessionId: string | null,
  role?: 'user' | 'assistant'
) {
  return useQuery({
    queryKey: intelligenceKeys.messages(sessionId || '', role),
    queryFn: () => fetchSessionMessages(sessionId!, role),
    enabled: !!sessionId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}
