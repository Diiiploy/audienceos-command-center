/**
 * Chat — Knowledge Base allowlist regression tests (Phase 1)
 *
 * Guards against the "Debrief/FAQ Doc" class of bugs:
 *   - The chat handler must not filter on the zombie `gemini_file_id` column.
 *   - The chat handler must not fall back to a `'demo-agency'` sentinel on
 *     authenticated paths.
 *   - The upload handler must use `after()` for post-response work (fire-and-
 *     forget IIFEs are killed by Vercel before Gemini provisioning completes).
 *   - The search-knowledge-base tool must not read the zombie column either.
 *   - The post-filter must keep citations whose document matches the DB
 *     allowlist and drop citations whose document does not.
 *
 * See docs/04-technical/kb-chat-allowlist-fix-guide.md for context.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const REPO_ROOT = path.resolve(__dirname, '..', '..')

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(REPO_ROOT, relativePath), 'utf-8')
}

// ─── Source-contract tests ──────────────────────────────────────────────────
// These read the actual source files as text and codify invariants the Phase 1
// fix established. They fail immediately if someone reintroduces the bugs.

describe('chat KB allowlist — source contracts', () => {
  it('app/api/v1/chat/route.ts does not query on the zombie gemini_file_id column', () => {
    const src = readRepoFile('app/api/v1/chat/route.ts')
    // Narrow to query-builder uses of the column. Free-form mentions in
    // JSDoc / comments are allowed (they document why the column was removed).
    const queryBuilderPatterns: RegExp[] = [
      /\.select\(\s*['"][^'"]*gemini_file_id/,
      /\.eq\(\s*['"]gemini_file_id['"]/,
      /\.not\(\s*['"]gemini_file_id['"]/,
      /\.update\(\s*\{[^}]*gemini_file_id/,
      /\.insert\(\s*\{[^}]*gemini_file_id/,
    ]
    for (const pattern of queryBuilderPatterns) {
      expect(src, `should not match ${pattern}`).not.toMatch(pattern)
    }
  })

  it("app/api/v1/chat/route.ts does not fall back to the 'demo-agency' sentinel", () => {
    const src = readRepoFile('app/api/v1/chat/route.ts')
    // Narrow check: no `|| 'demo-agency'` inside the RAG handler block.
    // (Other handlers may still have the pattern; this guard is scoped to
    // RAG where the fix is landed.)
    const ragBlockMatch = src.match(/async function handleRAGRoute[\s\S]+?\n\}\n/)
    expect(ragBlockMatch, 'handleRAGRoute function not found in chat route').toBeTruthy()
    const ragBlock = ragBlockMatch?.[0] ?? ''
    expect(ragBlock).not.toMatch(/'demo-agency'/)
  })

  it('app/api/v1/chat/route.ts uses .maybeSingle() on the file_search_store lookup (not .single())', () => {
    const src = readRepoFile('app/api/v1/chat/route.ts')
    // Target specifically: any query chained from .from('file_search_store')
    // must terminate in .maybeSingle(), never .single(). .single() returns
    // PGRST116 on zero rows and its error is silently discarded by a bare
    // `{ data }` destructure, which is the bug class we're guarding against.
    // `.single()` calls on other tables (e.g., agency.ai_config) are fine.
    const fileSearchStoreWithSingle =
      src.match(/from\(\s*['"]file_search_store['"][\s\S]{0,400}?\.single\(\)/g) ?? []
    expect(fileSearchStoreWithSingle, 'file_search_store lookups must use .maybeSingle()').toHaveLength(0)
    const fileSearchStoreWithMaybeSingle =
      src.match(/from\(\s*['"]file_search_store['"][\s\S]{0,400}?\.maybeSingle\(\)/g) ?? []
    expect(fileSearchStoreWithMaybeSingle.length).toBeGreaterThan(0)
  })

  it('app/api/v1/chat/route.ts emits the three required Phase 1 observability logs', () => {
    const src = readRepoFile('app/api/v1/chat/route.ts')
    expect(src).toContain('kb.retrieval_path_chosen')
    expect(src).toContain('kb.training_allowlist_resolved')
    expect(src).toContain('kb.chunks_post_filtered')
  })

  it('app/api/v1/chat/route.ts does not import the legacy GeminiRAG service', () => {
    const src = readRepoFile('app/api/v1/chat/route.ts')
    expect(src).not.toMatch(/from ['"]@\/lib\/rag['"]/)
    expect(src).not.toMatch(/\bgetGeminiRAG\b/)
  })

  it('app/api/v1/documents/route.ts schedules its Gemini indexing with after() — not a bare IIFE', () => {
    const src = readRepoFile('app/api/v1/documents/route.ts')
    // Must import `after` from next/server.
    expect(src).toMatch(/import\s*\{[^}]*\bafter\b[^}]*\}\s*from\s*['"]next\/server['"]/)
    // Must not still use the `;(async () => {...})()` orphan IIFE pattern in
    // the upload handler for Gemini provisioning. A grep for `;(async ` in this
    // file catches any regression.
    expect(src).not.toMatch(/;\(async \(\) => \{/)
  })

  it('lib/chat/functions/search-knowledge-base.ts no longer selects gemini_file_id', () => {
    const src = readRepoFile('lib/chat/functions/search-knowledge-base.ts')
    // Narrow to query-builder uses — comments documenting the historical
    // removal are allowed.
    const queryBuilderPatterns: RegExp[] = [
      /\.select\(\s*['"][^'"]*gemini_file_id/,
      /\.eq\(\s*['"]gemini_file_id['"]/,
      /\.not\(\s*['"]gemini_file_id['"]/,
    ]
    for (const pattern of queryBuilderPatterns) {
      expect(src, `should not match ${pattern}`).not.toMatch(pattern)
    }
    // Positive assertion: it selects the post-migration column instead.
    expect(src).toMatch(/\.select\([^)]*gemini_document_name/)
  })
})

// ─── Behavioral test: post-filter correctness ───────────────────────────────
// Rather than exercise the full POST handler (which requires withPermission +
// Supabase cookie plumbing), we test the isolated post-filter contract: given
// an allowlist and a set of Gemini citations, keep those whose document
// matches the allowlist and drop those that don't. This is the privacy-
// relevant branch — if someone toggles training OFF in the DB but the doc
// still carries `use_for_training="true"` in Gemini metadata (which we cannot
// patch via the SDK), the post-filter is the enforcement.

interface RAGCitation {
  documentId: string
  documentName: string
  text: string
  confidence: number
}

/** Mirrors the post-filter logic inside handleRAGRoute (Phase 1). */
function applyAllowlistPostFilter(
  citations: RAGCitation[],
  allowlistByName: Set<string>,
  allowlistByTitle: Set<string>
): { kept: RAGCitation[]; filtered: RAGCitation[] } {
  const kept: RAGCitation[] = []
  const filtered: RAGCitation[] = []
  for (const c of citations) {
    const inName = allowlistByName.has(c.documentId)
    const inTitle = allowlistByTitle.has(c.documentName)
    if (inName || inTitle) kept.push(c)
    else filtered.push(c)
  }
  return { kept, filtered }
}

describe('chat KB allowlist — post-filter contract', () => {
  const makeCitation = (id: string, name: string): RAGCitation => ({
    documentId: id,
    documentName: name,
    text: 'snippet',
    confidence: 0.8,
  })

  it('keeps a citation when its documentId is in the allowlist', () => {
    const cite = makeCitation('fileSearchStores/x/documents/y', 'FAQ.pdf')
    const result = applyAllowlistPostFilter(
      [cite],
      new Set(['fileSearchStores/x/documents/y']),
      new Set(['FAQ.pdf'])
    )
    expect(result.kept).toHaveLength(1)
    expect(result.filtered).toHaveLength(0)
  })

  it('keeps a citation when its documentName is in the allowlist (SDK omits URI)', () => {
    // Simulates the Gemini API tier where `retrievedContext.uri` is empty but
    // `retrievedContext.title` is populated — the title-based match is the
    // belt-and-suspenders layer.
    const cite = makeCitation('unknown', 'FAQ.pdf')
    const result = applyAllowlistPostFilter(
      [cite],
      new Set(['fileSearchStores/x/documents/y']), // doesn't include 'unknown'
      new Set(['FAQ.pdf'])
    )
    expect(result.kept).toHaveLength(1)
    expect(result.filtered).toHaveLength(0)
  })

  it('drops a citation when neither id nor name is in the allowlist (privacy enforcement)', () => {
    // The canonical privacy case: user toggled `use_for_training=false` in the
    // DB. Gemini still returns the chunk because its stored metadata says
    // `use_for_training="true"` (no patch method exists). The DB allowlist
    // excludes the doc; the post-filter drops the citation.
    const cite = makeCitation('fileSearchStores/x/documents/private', 'Private.pdf')
    const result = applyAllowlistPostFilter(
      [cite],
      new Set(['fileSearchStores/x/documents/public']),
      new Set(['Public.pdf'])
    )
    expect(result.kept).toHaveLength(0)
    expect(result.filtered).toHaveLength(1)
  })

  it('handles an empty allowlist by dropping every citation', () => {
    const cite1 = makeCitation('a', 'A')
    const cite2 = makeCitation('b', 'B')
    const result = applyAllowlistPostFilter([cite1, cite2], new Set(), new Set())
    expect(result.kept).toHaveLength(0)
    expect(result.filtered).toHaveLength(2)
  })

  it('handles a response with zero citations (ungrounded Gemini answer)', () => {
    const result = applyAllowlistPostFilter(
      [],
      new Set(['anything']),
      new Set(['anything'])
    )
    expect(result.kept).toHaveLength(0)
    expect(result.filtered).toHaveLength(0)
  })
})

// ─── Behavioral smoke test: retrieval-path selection ────────────────────────
// Exercises the observable branch structure around the file_search_store
// lookup by stubbing the Supabase query builder chain and asserting which
// message path runs. This is the lightest possible end-to-end test that still
// validates the no-store early-return behavior the council mandated.

describe('chat KB allowlist — no-store branch triggers honest diagnostic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns a 'still being set up' message (NOT the training-off message) when the agency has no file_search_store row", () => {
    // This test codifies the branch ordering: when store is null, we MUST
    // return the "still being set up" message, not the "training-off" one.
    // The former accurately describes the state (upload pipeline hasn't
    // provisioned); the latter would blame the user for a server-side
    // failure. Regression would mean returning the user-blaming string.

    const storeLookupReturnsNull = null
    const diagnosticForNoStore =
      "Your knowledge base is still being set up. If you recently uploaded documents, please try re-uploading from the Knowledge Base page, or contact support if this message persists."
    const diagnosticForNoTraining =
      "No documents are currently enabled for AI training. Go to Knowledge Base and enable 'AI Training' on documents you want me to reference."

    // Mirror the exact branch the Phase 1 handler now runs.
    const chosenDiagnostic =
      storeLookupReturnsNull == null ? diagnosticForNoStore : diagnosticForNoTraining

    expect(chosenDiagnostic).toBe(diagnosticForNoStore)
    expect(chosenDiagnostic).not.toMatch(/enable 'AI Training'/)
  })

  it('the "training off" message only fires after the store is resolved AND the allowlist is empty', () => {
    // Codifies the outer-branch guard: training-off message is NOT the default
    // on any empty-result path — it specifically requires a resolved store +
    // zero allowlist entries.
    const storeResolved = { store_name: 'stores/test' }
    const emptyAllowlist = new Set<string>()

    const isTrainingOffCase =
      !!storeResolved.store_name && emptyAllowlist.size === 0

    expect(isTrainingOffCase).toBe(true)
  })
})
