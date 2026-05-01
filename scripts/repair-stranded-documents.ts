/**
 * repair-stranded-documents.ts
 *
 * One-off repair for documents stranded by the pre-Phase-1 upload handler's
 * fire-and-forget lifecycle bug (see docs/04-technical/kb-chat-allowlist-fix-guide.md
 * §14 Entry 1). Those documents exist in `document` with:
 *   index_status = 'pending'
 *   gemini_document_name IS NULL
 *   file_search_store_id IS NULL
 *
 * This script mirrors what POST /api/v1/documents/process does, but runs from
 * a local shell using service-role credentials — no browser auth dance needed.
 * It is purely equivalent: downloads bytes from Supabase Storage, provisions
 * (or finds) the agency's File Search Store, uploads to Gemini, stamps the
 * DB columns.
 *
 * USAGE
 *   bun run scripts/repair-stranded-documents.ts                  # DRY RUN: show what would run
 *   bun run scripts/repair-stranded-documents.ts --commit         # actually repair
 *   bun run scripts/repair-stranded-documents.ts --document <id>  # repair one specific doc
 *   bun run scripts/repair-stranded-documents.ts --agency <uuid>  # scope to one agency
 *
 * Required env:
 *   SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   GOOGLE_AI_API_KEY
 *
 * Safe defaults: dry-run emits an audit plan to stdout. No writes without --commit.
 */

import { createClient } from '@supabase/supabase-js'
import { getOrCreateAgencyStore } from '../lib/gemini/store-provisioner'
import { getFileSearchStoreService } from '../lib/gemini/file-search-store-service'

interface Args {
  commit: boolean
  documentId: string | null
  agencyId: string | null
}

function parseArgs(argv: string[]): Args {
  const args: Args = { commit: false, documentId: null, agencyId: null }
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    const next = argv[i + 1]
    if (flag === '--commit') args.commit = true
    else if (flag === '--document' && next) {
      args.documentId = next
      i++
    } else if (flag === '--agency' && next) {
      args.agencyId = next
      i++
    }
  }
  return args
}

interface StrandedDoc {
  id: string
  agency_id: string
  title: string
  storage_path: string
  mime_type: string
  category: string | null
  client_id: string | null
  index_status: string
  gemini_document_name: string | null
  file_search_store_id: string | null
  drive_url?: string | null
  drive_file_id?: string | null
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(2)
  }
  if (!GOOGLE_AI_API_KEY) {
    console.error('Missing GOOGLE_AI_API_KEY')
    process.exit(2)
  }

  const mode = args.commit ? 'COMMIT' : 'DRY-RUN'
  console.log(
    JSON.stringify({
      event: 'repair.start',
      mode,
      documentId: args.documentId,
      agencyId: args.agencyId,
      ts: new Date().toISOString(),
    })
  )

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // 1. Find stranded documents.
  let query = (supabase as any)
    .from('document')
    .select(
      'id, agency_id, title, storage_path, mime_type, category, client_id, index_status, gemini_document_name, file_search_store_id, drive_url, drive_file_id'
    )
    .eq('is_active', true)
    .or(
      'index_status.eq.pending,index_status.eq.failed,and(gemini_document_name.is.null,file_search_store_id.is.null)'
    )

  if (args.documentId) query = query.eq('id', args.documentId)
  if (args.agencyId) query = query.eq('agency_id', args.agencyId)

  const { data: stranded, error } = await query
  if (error) {
    console.error(JSON.stringify({ event: 'repair.fatal', error: error.message }))
    process.exit(3)
  }

  const docs = (stranded ?? []) as StrandedDoc[]
  console.log(JSON.stringify({ event: 'repair.candidates', count: docs.length }))

  if (docs.length === 0) {
    console.log(JSON.stringify({ event: 'repair.nothing_to_do' }))
    return
  }

  let succeeded = 0
  let failed = 0
  const failures: Array<{ documentId: string; error: string }> = []

  for (const doc of docs) {
    // Drive-imported documents have no bytes in Supabase Storage — the upload
    // handler (`POST /api/v1/documents/drive`) creates a placeholder row with
    // a synthetic `storage_path` but never writes bytes anywhere. Repair via
    // this script requires a Drive API export pipeline that does not yet
    // exist in the app; skip with an explanation so operators can surface
    // the correct user-facing guidance.
    const isDriveImport =
      doc.mime_type?.startsWith('application/vnd.google-apps.') ||
      doc.storage_path?.includes('/drive/')

    const audit = {
      documentId: doc.id,
      agencyId: doc.agency_id,
      title: doc.title,
      currentStatus: doc.index_status,
      hasGeminiName: !!doc.gemini_document_name,
      hasStoreId: !!doc.file_search_store_id,
      isDriveImport,
    }

    if (isDriveImport) {
      console.log(
        JSON.stringify({
          event: 'repair.row.skip_drive_import',
          ...audit,
          reason:
            'Drive imports have no bytes in Supabase Storage. Ask the user to download the file from Drive (e.g., File → Download → PDF) and use the direct Upload button in the Knowledge Base; the Phase 1 fix now handles that flow correctly. Then soft-delete this row.',
          mimeType: doc.mime_type,
          storagePath: doc.storage_path,
        })
      )
      continue
    }

    if (!args.commit) {
      console.log(JSON.stringify({ event: 'repair.row.dry_run', ...audit }))
      continue
    }

    try {
      console.log(JSON.stringify({ event: 'repair.row.start', ...audit }))

      // Mark indexing
      await (supabase as any)
        .from('document')
        .update({ index_status: 'indexing', updated_at: new Date().toISOString() })
        .eq('id', doc.id)

      // Download bytes
      const { data: fileData, error: dlErr } = await supabase.storage
        .from('documents')
        .download(doc.storage_path)
      if (dlErr || !fileData) {
        throw new Error(`Storage download failed: ${dlErr?.message ?? 'no data in storage — if this is a Drive import, bytes were never uploaded'}`)
      }
      const buffer = Buffer.from(await fileData.arrayBuffer())
      console.log(
        JSON.stringify({
          event: 'repair.row.downloaded',
          documentId: doc.id,
          bytes: buffer.length,
        })
      )

      // Provision / fetch store
      const { storeName, storeId } = await getOrCreateAgencyStore(supabase, doc.agency_id)
      console.log(
        JSON.stringify({
          event: 'repair.row.store_resolved',
          documentId: doc.id,
          storeName,
          storeId,
        })
      )

      // Upload to Gemini File Search Store
      const service = getFileSearchStoreService(GOOGLE_AI_API_KEY)
      const scope: 'global' | 'client' = doc.client_id ? 'client' : 'global'
      const uploadResult = await service.uploadDocument(
        storeName,
        new Blob([buffer], { type: doc.mime_type }),
        {
          displayName: doc.title,
          mimeType: doc.mime_type,
          agencyId: doc.agency_id,
          scope,
          clientId: doc.client_id ?? undefined,
          category: doc.category ?? undefined,
          useForTraining: true,
        }
      )

      if (uploadResult.status === 'failed') {
        throw new Error(uploadResult.errorMessage ?? 'Gemini upload returned failed status')
      }

      const finalStatus =
        uploadResult.status === 'active' ? 'indexed' : 'indexing'

      // Stamp the row
      await (supabase as any)
        .from('document')
        .update({
          gemini_document_name: uploadResult.documentName ?? null,
          file_search_store_id: storeId,
          index_status: finalStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', doc.id)

      succeeded++
      console.log(
        JSON.stringify({
          event: 'repair.row.success',
          documentId: doc.id,
          finalStatus,
          geminiDocumentName: uploadResult.documentName ?? null,
          storeId,
          processingMs: uploadResult.processingTimeMs,
        })
      )
    } catch (err: any) {
      failed++
      const msg = err?.message ?? String(err)
      failures.push({ documentId: doc.id, error: msg })
      console.log(
        JSON.stringify({ event: 'repair.row.failure', documentId: doc.id, error: msg })
      )

      try {
        await (supabase as any)
          .from('document')
          .update({
            index_status: 'failed',
            updated_at: new Date().toISOString(),
          })
          .eq('id', doc.id)
      } catch (revertErr: any) {
        console.log(
          JSON.stringify({
            event: 'repair.row.status_revert_failed',
            documentId: doc.id,
            error: revertErr?.message ?? String(revertErr),
          })
        )
      }
    }
  }

  console.log(
    JSON.stringify({
      event: 'repair.summary',
      mode,
      total: docs.length,
      succeeded,
      failed,
      failures,
    })
  )

  if (failed > 0) process.exit(1)
}

main().catch((e) => {
  console.error(JSON.stringify({ event: 'repair.fatal', error: e?.message ?? String(e) }))
  process.exit(99)
})
