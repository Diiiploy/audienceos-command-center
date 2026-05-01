/**
 * probe-gemini-grounding.ts
 *
 * Council Round 6 / Phase 0 verification — Q1.
 *
 * Question: does Gemini's File Search tool populate
 *   `response.candidates[0].groundingMetadata.groundingChunks[].retrievedContext`
 * with usable `title` / `uri` / `text` values on the PUBLIC Gemini API tier?
 *
 * The `@google/genai` SDK type definitions mark `GroundingChunkRetrievedContext`
 * as "not supported in Gemini API" (genai.d.ts around line 5085). If that
 * comment reflects reality, `extractCitations()` in
 * `lib/gemini/file-search-store-service.ts` is reading fields that are always
 * undefined — meaning citation count is always zero, `isGrounded` is always
 * false, and any post-filter we add against the allowlist is a no-op.
 *
 * This probe calls the exact same API shape the prod code uses, then dumps
 * the raw response as JSON so we can inspect what fields actually populate.
 *
 * USAGE:
 *   bun run scripts/probe-gemini-grounding.ts --agency <uuid> --query "<text>"
 *
 * Required env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   (to read file_search_store row regardless of RLS)
 *   GOOGLE_AI_API_KEY
 *
 * Side effects: none — read-only SELECT on Supabase, one generateContent call
 * against Gemini (costs a trivial amount of tokens). Does NOT write anywhere.
 *
 * Interpretation:
 *   If response.candidates[0].groundingMetadata.groundingChunks exists and
 *   each chunk has a populated `retrievedContext.title` or `.uri`, the
 *   post-filter is viable — use those fields as the allowlist key.
 *
 *   If groundingChunks is absent but citations are instead delivered as
 *   content parts of type "file_search_result" (a `FileSearchResultContent`
 *   shape), the allowlist key is on those parts — rewrite extractCitations.
 *
 *   If nothing grounding-related populates and the text response is
 *   ungrounded natural language, the post-filter is not viable on this API
 *   tier; rely entirely on Gemini's server-side `metadataFilter` + the
 *   DB-level allowlist (do NOT add a client-side post-filter).
 */

import { createClient } from '@supabase/supabase-js'
import { GoogleGenAI } from '@google/genai'

interface Args {
  agency: string
  query: string
  topK?: number
  useForTrainingOnly?: boolean
}

function parseArgs(argv: string[]): Args {
  const args: Partial<Args> = { useForTrainingOnly: true }
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    const next = argv[i + 1]
    if (flag === '--agency' && next) {
      args.agency = next
      i++
    } else if (flag === '--query' && next) {
      args.query = next
      i++
    } else if (flag === '--topK' && next) {
      args.topK = Number(next)
      i++
    } else if (flag === '--all-docs') {
      args.useForTrainingOnly = false
    }
  }
  if (!args.agency || !args.query) {
    console.error(
      'Usage: bun run scripts/probe-gemini-grounding.ts --agency <uuid> --query "<question>" [--topK 10] [--all-docs]'
    )
    process.exit(1)
  }
  return args as Args
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

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Look up the agency's active File Search Store.
  const { data: store, error: storeErr } = await (supabase as any)
    .from('file_search_store')
    .select('id, store_name, is_active')
    .eq('agency_id', args.agency)
    .eq('is_active', true)
    .maybeSingle()

  if (storeErr) {
    console.error('Supabase error looking up file_search_store:', storeErr)
    process.exit(3)
  }
  if (!store?.store_name) {
    console.error(
      `No active file_search_store row for agency ${args.agency}. ` +
        `Pick a different agency that has one, or provision one via the normal upload flow first.`
    )
    process.exit(4)
  }

  console.error(`[probe] Using store: ${store.store_name} (row ${store.id})`)

  // Count the agency's training-enabled, indexed documents so we know what to expect.
  const { data: docs } = await (supabase as any)
    .from('document')
    .select('id, title, use_for_training, gemini_document_name, index_status, is_active')
    .eq('agency_id', args.agency)
    .eq('is_active', true)

  const trainingDocs = (docs ?? []).filter((d: { use_for_training: boolean }) => d.use_for_training)
  const indexedTrainingDocs = trainingDocs.filter(
    (d: { gemini_document_name: string | null }) => d.gemini_document_name
  )
  console.error(
    `[probe] Agency has ${trainingDocs.length} training-enabled docs, ${indexedTrainingDocs.length} with a gemini_document_name populated.`
  )

  // Build the same metadata filter the prod service uses.
  const filterParts: string[] = [`agency_id="${args.agency}"`]
  if (args.useForTrainingOnly !== false) {
    filterParts.push('use_for_training="true"')
  }
  const metadataFilter = filterParts.join(' AND ')

  console.error(`[probe] metadataFilter: ${metadataFilter}`)
  console.error(`[probe] Calling Gemini generateContent with fileSearch tool…`)

  const genai = new GoogleGenAI({ apiKey: GOOGLE_AI_API_KEY })
  const GEMINI_MODEL = 'gemini-3-flash-preview' // Match prod model choice.

  const started = Date.now()
  let response: unknown
  try {
    response = await genai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `Based on the documents in the knowledge base, answer this question: ${args.query}

If the answer is not found in the documents, say so clearly.
When citing information, reference the specific document by name.`,
      config: {
        temperature: 0.2,
        maxOutputTokens: 2048,
        tools: [
          {
            fileSearch: {
              fileSearchStoreNames: [store.store_name],
              topK: args.topK ?? 10,
              metadataFilter,
            },
          },
        ],
      },
    })
  } catch (err) {
    console.error('[probe] Gemini call failed:', err)
    process.exit(5)
  }
  const elapsedMs = Date.now() - started
  console.error(`[probe] Gemini returned in ${elapsedMs}ms\n`)

  // Full raw dump — stdout, JSON, no redaction.
  console.log(JSON.stringify(response, null, 2))

  // Summary to stderr (doesn't pollute the JSON on stdout).
  const r = response as {
    candidates?: Array<{
      groundingMetadata?: {
        groundingChunks?: Array<{
          retrievedContext?: { uri?: string; title?: string; text?: string }
        }>
      }
      content?: { parts?: unknown[] }
    }>
    text?: string
  }

  const candidate = r.candidates?.[0]
  const grounding = candidate?.groundingMetadata?.groundingChunks ?? []
  const firstChunkKeys = grounding[0]?.retrievedContext
    ? Object.keys(grounding[0].retrievedContext)
    : []

  console.error('\n[probe] === SUMMARY ===')
  console.error(`[probe] groundingChunks count: ${grounding.length}`)
  console.error(
    `[probe] first chunk retrievedContext keys: ${JSON.stringify(firstChunkKeys)}`
  )
  if (grounding[0]?.retrievedContext) {
    const rc = grounding[0].retrievedContext
    console.error(`[probe] first chunk title: ${rc.title ?? '<undefined>'}`)
    console.error(`[probe] first chunk uri  : ${rc.uri ?? '<undefined>'}`)
    console.error(
      `[probe] first chunk text (${(rc.text ?? '').length} chars): ${(rc.text ?? '').slice(0, 120)}…`
    )
  }
  console.error(`[probe] response.text (${(r.text ?? '').length} chars):`)
  console.error((r.text ?? '').slice(0, 400))
  console.error(
    '\n[probe] Interpretation:\n' +
      '  - If groundingChunks.length > 0 and title/uri populate → post-filter is VIABLE.\n' +
      '  - If groundingChunks.length === 0 but response.text is grounded prose → grounding is coming in a different shape; inspect content.parts.\n' +
      "  - If both are empty or ungrounded → post-filter is NOT viable on this API tier;\n" +
      '    rely on Gemini server-side metadataFilter + DB allowlist only.'
  )
}

main().catch((e) => {
  console.error('[probe] fatal:', e)
  process.exit(99)
})
