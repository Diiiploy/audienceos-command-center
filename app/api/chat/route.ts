/**
 * Chat API Route
 *
 * API endpoint for Holy Grail Chat integration.
 * Part of: 3-System Consolidation
 */

import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/supabase'
import { ChatService } from '@/lib/chat/service'
import { withRateLimit, sanitizeString, createErrorResponse } from '@/lib/security'

// Mock mode detection - allows chat to work without real Supabase
const MOCK_AGENCY_ID = 'demo-agency'
const MOCK_USER_ID = 'mock-user-id'
const isMockMode = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  return url.includes('placeholder') || url === ''
}

export async function POST(request: NextRequest) {
  // Rate limit: 60 chat messages per minute (stricter for AI endpoints)
  const rateLimitResponse = withRateLimit(request, { maxRequests: 60, windowMs: 60000 })
  if (rateLimitResponse) return rateLimitResponse

  try {
    let agencyId: string
    let userId: string

    // Mock mode - skip Supabase auth
    if (isMockMode()) {
      console.info('[Chat API] Mock mode enabled - using demo credentials')
      agencyId = MOCK_AGENCY_ID
      userId = MOCK_USER_ID
    } else {
      const supabase = await createRouteHandlerClient(cookies)

      // Get authenticated user with server verification (SEC-006)
      const { user, agencyId: authAgencyId, error: authError } = await getAuthenticatedUser(supabase)

      if (!user || !authAgencyId) {
        return createErrorResponse(401, authError || 'Unauthorized')
      }

      agencyId = authAgencyId
      userId = user.id
    }

    // Parse request body
    let body: {
      message: string
      history?: Array<{ id: string; role: string; content: string; timestamp: string }>
      agencyId?: string
    }

    try {
      body = await request.json()
    } catch {
      return createErrorResponse(400, 'Invalid JSON body')
    }

    const { message, history = [] } = body

    if (!message || typeof message !== 'string') {
      return createErrorResponse(400, 'Message is required')
    }

    // Sanitize message using security utility
    const sanitizedMessage = sanitizeString(message).slice(0, 4000)
    if (!sanitizedMessage) {
      return createErrorResponse(400, 'Message cannot be empty')
    }

    // Get Gemini API key
    const geminiApiKey = process.env.GOOGLE_AI_API_KEY
    if (!geminiApiKey) {
      return createErrorResponse(500, 'Chat service not configured')
    }

    // Create chat service
    const chatService = new ChatService({
      agencyId,
      userId,
      geminiApiKey,
    })

    // Convert history to ChatMessage format
    const chatHistory = history.map((msg) => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
      timestamp: new Date(msg.timestamp),
    }))

    // Process message
    const response = await chatService.processMessage(sanitizedMessage, chatHistory)

    return NextResponse.json({ message: response })
  } catch {
    return createErrorResponse(500, 'Failed to process message')
  }
}
