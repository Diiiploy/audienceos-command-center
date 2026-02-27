/**
 * File Search Store Provisioner
 *
 * Lazily provisions a Gemini File Search Store per agency.
 * - Checks Supabase for existing store record
 * - If none, creates via Gemini API + inserts into DB
 * - Handles race conditions via UNIQUE constraint + retry
 *
 * This means the first document upload for an agency triggers store creation,
 * and all subsequent uploads reuse the same store.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getFileSearchStoreService } from './file-search-store-service'

export interface AgencyStore {
  storeName: string
  storeId: string
}

/**
 * Get or create a File Search Store for the given agency.
 * Thread-safe via database UNIQUE constraint + retry.
 */
export async function getOrCreateAgencyStore(
  supabase: SupabaseClient,
  agencyId: string
): Promise<AgencyStore> {
  // 1. Check for existing store
  const { data: existing } = await (supabase as any)
    .from('file_search_store')
    .select('id, store_name')
    .eq('agency_id', agencyId)
    .eq('is_active', true)
    .single()

  if (existing?.store_name) {
    return {
      storeName: existing.store_name,
      storeId: existing.id,
    }
  }

  // 2. No store exists — create one via Gemini API
  const service = getFileSearchStoreService()

  // Fetch agency name for a readable display name
  let agencyName = 'Agency'
  try {
    const { data: agency } = await supabase
      .from('agency')
      .select('name')
      .eq('id', agencyId)
      .single()
    if (agency?.name) agencyName = agency.name
  } catch {
    // Fall back to generic name
  }

  const displayName = `${agencyName} Knowledge Base`
  const storeName = await service.createStore(displayName)

  // 3. Insert into DB
  try {
    const { data: inserted, error: insertError } = await (supabase as any)
      .from('file_search_store')
      .insert({
        agency_id: agencyId,
        store_name: storeName,
        display_name: displayName,
      })
      .select('id, store_name')
      .single()

    if (insertError) {
      // Race condition: another request created the store first (UNIQUE violation)
      if (insertError.code === '23505') {
        console.log('[StoreProvisioner] Race condition detected, fetching existing store')
        const { data: raceWinner } = await (supabase as any)
          .from('file_search_store')
          .select('id, store_name')
          .eq('agency_id', agencyId)
          .eq('is_active', true)
          .single()

        if (raceWinner?.store_name) {
          // Clean up the duplicate store we just created
          try {
            await service.deleteStore(storeName)
          } catch {
            console.warn('[StoreProvisioner] Failed to cleanup duplicate store:', storeName)
          }

          return {
            storeName: raceWinner.store_name,
            storeId: raceWinner.id,
          }
        }
      }

      throw new Error(`Failed to insert store record: ${insertError.message}`)
    }

    console.log(`[StoreProvisioner] Created store for agency ${agencyId}: ${storeName}`)

    return {
      storeName: inserted.store_name,
      storeId: inserted.id,
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Failed to insert')) {
      throw error
    }
    // Unexpected error — re-throw
    throw new Error(`Store provisioning failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
