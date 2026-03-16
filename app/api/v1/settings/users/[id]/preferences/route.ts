/**
 * User Preferences API
 * GET /api/v1/settings/users/[id]/preferences - Get user notification preferences
 * PATCH /api/v1/settings/users/[id]/preferences - Update user notification preferences
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withRateLimit, createErrorResponse } from '@/lib/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'

// ============================================================================
// GET /api/v1/settings/users/[id]/preferences
// ============================================================================

export const GET = withPermission({ resource: 'users', action: 'read' })(
  async (
    request: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    try {
      const { id: userId } = await params

      // Validate userId format (issue #9)
      if (!userId || typeof userId !== 'string' || userId.length === 0) {
        return createErrorResponse(400, 'Invalid user ID format')
      }

      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId
      const user = request.user

      // Permission check: user can only access own preferences unless admin
      if (user.id !== userId && !user.isOwner) {
        return createErrorResponse(403, 'You can only access your own preferences')
      }

      // Fetch user preferences
      const { data: userPrefs, error: prefsError } = await supabase
        .from('user')
        .select('preferences')
        .eq('id', userId)
        .eq('agency_id', agencyId)
        .single()

      if (prefsError) {
        return createErrorResponse(500, 'Failed to fetch preferences')
      }

      // Return preferences or defaults if not set
      const preferences = userPrefs?.preferences || {
        notifications: {
          email_alerts: true,
          email_tickets: true,
          email_mentions: true,
          slack_channel_id: undefined,
          digest_mode: false,
          digest_time: '08:00',
          quiet_hours_start: undefined,
          quiet_hours_end: undefined,
          muted_clients: [],
        },
      }

      return NextResponse.json({ preferences })
    } catch (error) {
      console.error('Preferences GET error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)

// ============================================================================
// PATCH /api/v1/settings/users/[id]/preferences
// ============================================================================

export const PATCH = withPermission({ resource: 'users', action: 'read' })(
  async (
    request: AuthenticatedRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const rateLimitResponse = withRateLimit(request)
    if (rateLimitResponse) return rateLimitResponse

    try {
      const { id: userId } = await params

      // Validate userId format (issue #9)
      if (!userId || typeof userId !== 'string' || userId.length === 0) {
        return createErrorResponse(400, 'Invalid user ID format')
      }

      const supabase = await createRouteHandlerClient(cookies)

      // User already authenticated and authorized by middleware
      const agencyId = request.user.agencyId
      const user = request.user

      // Permission check: user can only update own preferences unless admin
      if (user.id !== userId && !user.isOwner) {
        return createErrorResponse(403, 'You can only update your own preferences')
      }

      // Parse and validate request body
      let body: unknown
      try {
        body = await request.json()
      } catch (parseError) {
        console.error('[PreferencePATCH] JSON parse error:', parseError)
        return createErrorResponse(400, 'Request body must be valid JSON')
      }

      if (typeof body !== 'object' || body === null) {
        return createErrorResponse(400, 'Request body must be an object')
      }

      const { notifications, ai } = body as { notifications?: unknown; ai?: unknown }

      if (!notifications && !ai) {
        return createErrorResponse(400, 'Must provide notifications or ai preferences')
      }

      if (notifications && typeof notifications !== 'object') {
        return createErrorResponse(400, 'Invalid notification preferences format')
      }

      // Validate AI preferences if provided
      if (ai) {
        if (typeof ai !== 'object') {
          return createErrorResponse(400, 'Invalid AI preferences format')
        }
        const { assistant_name, voice } = ai as { assistant_name?: unknown; voice?: unknown }
        if (assistant_name !== undefined) {
          if (typeof assistant_name !== 'string') {
            return createErrorResponse(400, 'Assistant name must be a string')
          }
          if (assistant_name.length < 1 || assistant_name.length > 50) {
            return createErrorResponse(400, 'Assistant name must be 1-50 characters')
          }
        }

        // Validate voice settings if provided
        if (voice !== undefined) {
          if (voice !== null && typeof voice !== 'object') {
            return createErrorResponse(400, 'Voice must be an object or null')
          }

          if (voice !== null) {
            const { tone, style, personality, vocabulary } = voice as {
              tone?: unknown; style?: unknown; personality?: unknown; vocabulary?: unknown
            }

            // Validate tone
            if (tone !== undefined) {
              if (typeof tone !== 'object' || tone === null) {
                return createErrorResponse(400, 'Voice tone must be an object')
              }
              const { formality, enthusiasm, empathy } = tone as {
                formality?: unknown; enthusiasm?: unknown; empathy?: unknown
              }
              if (formality !== undefined && !['professional', 'casual', 'friendly'].includes(formality as string)) {
                return createErrorResponse(400, 'Voice tone formality must be "professional", "casual", or "friendly"')
              }
              if (enthusiasm !== undefined) {
                if (typeof enthusiasm !== 'number' || enthusiasm < 0 || enthusiasm > 10) {
                  return createErrorResponse(400, 'Voice tone enthusiasm must be a number between 0 and 10')
                }
              }
              if (empathy !== undefined) {
                if (typeof empathy !== 'number' || empathy < 0 || empathy > 10) {
                  return createErrorResponse(400, 'Voice tone empathy must be a number between 0 and 10')
                }
              }
            }

            // Validate style
            if (style !== undefined) {
              if (typeof style !== 'object' || style === null) {
                return createErrorResponse(400, 'Voice style must be an object')
              }
              const { sentenceLength, paragraphStructure, useEmojis } = style as {
                sentenceLength?: unknown; paragraphStructure?: unknown; useEmojis?: unknown
              }
              if (sentenceLength !== undefined && !['short', 'medium', 'long'].includes(sentenceLength as string)) {
                return createErrorResponse(400, 'Voice style sentenceLength must be "short", "medium", or "long"')
              }
              if (paragraphStructure !== undefined && !['single', 'multi'].includes(paragraphStructure as string)) {
                return createErrorResponse(400, 'Voice style paragraphStructure must be "single" or "multi"')
              }
              if (useEmojis !== undefined && typeof useEmojis !== 'boolean') {
                return createErrorResponse(400, 'Voice style useEmojis must be a boolean')
              }
            }

            // Validate personality
            if (personality !== undefined) {
              if (typeof personality !== 'object' || personality === null) {
                return createErrorResponse(400, 'Voice personality must be an object')
              }
              const { voiceDescription, traits } = personality as {
                voiceDescription?: unknown; traits?: unknown
              }
              if (voiceDescription !== undefined && typeof voiceDescription !== 'string') {
                return createErrorResponse(400, 'Voice personality voiceDescription must be a string')
              }
              if (traits !== undefined) {
                if (!Array.isArray(traits) || !traits.every((t: unknown) => typeof t === 'string')) {
                  return createErrorResponse(400, 'Voice personality traits must be an array of strings')
                }
              }
            }

            // Validate vocabulary
            if (vocabulary !== undefined) {
              if (typeof vocabulary !== 'object' || vocabulary === null) {
                return createErrorResponse(400, 'Voice vocabulary must be an object')
              }
              const { complexity, industryTerms, bannedWords, preferredPhrases } = vocabulary as {
                complexity?: unknown; industryTerms?: unknown; bannedWords?: unknown; preferredPhrases?: unknown
              }
              if (complexity !== undefined && !['simple', 'moderate', 'advanced'].includes(complexity as string)) {
                return createErrorResponse(400, 'Voice vocabulary complexity must be "simple", "moderate", or "advanced"')
              }
              if (industryTerms !== undefined && !Array.isArray(industryTerms)) {
                return createErrorResponse(400, 'Voice vocabulary industryTerms must be an array')
              }
              if (bannedWords !== undefined && !Array.isArray(bannedWords)) {
                return createErrorResponse(400, 'Voice vocabulary bannedWords must be an array')
              }
              if (preferredPhrases !== undefined && !Array.isArray(preferredPhrases)) {
                return createErrorResponse(400, 'Voice vocabulary preferredPhrases must be an array')
              }
            }
          }
        }
      }

      // Validate quiet hours if provided
      const { quiet_hours_start, quiet_hours_end } = (notifications || {}) as any
      const quietHoursProvided = quiet_hours_start !== undefined || quiet_hours_end !== undefined

      if (quietHoursProvided) {
        // CRITICAL: If one is provided, both must be provided (issue #7)
        if ((quiet_hours_start !== undefined && quiet_hours_end === undefined) ||
            (quiet_hours_start === undefined && quiet_hours_end !== undefined)) {
          return createErrorResponse(
            400,
            'Both quiet_hours_start and quiet_hours_end must be provided together'
          )
        }

        // Validate time format (HH:mm)
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
        if (!timeRegex.test(quiet_hours_start) || !timeRegex.test(quiet_hours_end)) {
          return createErrorResponse(400, 'Invalid time format. Use HH:mm format.')
        }

        // FIXED: Handle overnight quiet hours (e.g., 22:00 to 08:00)
        // String comparison fails for overnight spans, so we handle both cases
        const isOvernightSpan = quiet_hours_start > quiet_hours_end

        if (!isOvernightSpan && quiet_hours_start >= quiet_hours_end) {
          return createErrorResponse(
            400,
            'Invalid quiet hours range. Start time must be before end time (or use overnight span like 22:00-08:00).'
          )
        }
      }

      // Fetch current preferences
      const { data: currentUser, error: fetchError } = await supabase
        .from('user')
        .select('preferences')
        .eq('id', userId)
        .eq('agency_id', agencyId)
        .single()

      if (fetchError) {
        return createErrorResponse(500, 'Failed to fetch current preferences')
      }

      // Merge preferences (don't overwrite entire preferences object)
      const currentPrefs = (currentUser?.preferences as any) || {}
      const updatedPreferences: Record<string, any> = { ...currentPrefs }

      if (notifications) {
        updatedPreferences.notifications = {
          ...(currentPrefs.notifications || {}),
          ...notifications,
        }
      }

      if (ai) {
        updatedPreferences.ai = {
          ...(currentPrefs.ai || {}),
          ...(ai as object),
        }
      }

      // Update preferences
      const { error: updateError } = await supabase
        .from('user')
        .update({ preferences: updatedPreferences, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .eq('agency_id', agencyId)

      if (updateError) {
        console.error('Preferences update error:', updateError)
        return createErrorResponse(500, 'Failed to update preferences')
      }

      return NextResponse.json(
        { preferences: updatedPreferences },
        { status: 200 }
      )
    } catch (error) {
      console.error('Preferences PATCH error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
