/**
 * Google OAuth Token Refresh
 *
 * Handles refreshing expired Google OAuth access tokens.
 * Google access tokens expire after 1 hour; this module uses the
 * stored refresh_token to obtain a new access_token and persists
 * the encrypted result back to Supabase.
 *
 * Used by: Gmail sync route, Gmail cron job
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { encryptToken, serializeEncryptedToken } from '@/lib/crypto'

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

/**
 * Refresh a Google OAuth access token using the stored refresh token.
 * On success, encrypts and persists the new access token to the database.
 *
 * @returns The new access token string, or null if refresh failed
 */
export async function refreshGoogleAccessToken(
  supabase: SupabaseClient,
  userId: string,
  refreshToken: string
): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error('[Token Refresh] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET')
    return null
  }

  try {
    // Call Google's token endpoint with refresh_token grant
    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[Token Refresh] Google returned ${response.status}: ${errorText}`)
      return null
    }

    const data = (await response.json()) as {
      access_token: string
      expires_in: number
      token_type: string
      scope?: string
    }

    if (!data.access_token) {
      console.error('[Token Refresh] No access_token in response')
      return null
    }

    // Encrypt the new access token for storage
    const encrypted = encryptToken(data.access_token)
    if (!encrypted) {
      console.error('[Token Refresh] Failed to encrypt new access token')
      return null
    }

    // Calculate expiry timestamp
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()

    // Persist encrypted token and new expiry to database
    const { error: updateError } = await supabase
      .from('user_oauth_credential')
      .update({
        access_token: serializeEncryptedToken(encrypted),
        expires_at: expiresAt,
        error_message: null, // Clear any previous error
      })
      .eq('user_id', userId)
      .eq('type', 'gmail')

    if (updateError) {
      console.error('[Token Refresh] DB update failed:', updateError.message)
      // Still return the token — it's valid even if we couldn't persist it
    }

    console.log('[Token Refresh] Successfully refreshed Gmail token')
    return data.access_token
  } catch (error) {
    console.error('[Token Refresh] Error:', error instanceof Error ? error.message : error)
    return null
  }
}
