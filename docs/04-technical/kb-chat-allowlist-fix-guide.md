# Knowledge Base + AI Chat Allowlist Fix — Cross-Instance Playbook

> **Audience:** a fresh engineering / AI-pair session with no prior context. You have the codebase in front of you. You want to verify whether the bug applies to this instance and, if it does, apply the fix safely.
>
> **Scope:** command-center-style applications that use Supabase + a Google Gemini RAG layer for a "Knowledge Base" feature where users upload documents, toggle a per-document "AI Training" flag, and chat about them. Applies to any fork where the reported symptom reproduces.
>
> **Status of this guide:** *living document*. Update it in place whenever implementation surfaces a nuance, a workaround, or a corrected assumption. Treat it as the accumulated experience of shipping this fix at least once.

---

## 1. Symptom signature

Users report a specific contradictory sequence:

1. They upload a document to the Knowledge Base.
2. They toggle an "AI Training" switch to on for that document.
3. They click a button like "Send to AI Chat" (the exact label varies) that opens the in-app chat with the document attached.
4. The chat UI shows a banner or chip that reads something like **"Chat with your document — AI training on"**.
5. They ask the AI to summarize or answer questions about the document.
6. The AI replies with a canned message of the form:
   > *"No documents are currently enabled for AI training. Go to Knowledge Base and enable 'AI Training' on documents you want me to reference."*
   or a very close paraphrase.

The contradiction — banner says *on*, chat says *none enabled* — is the signature. If you see only one half (e.g., chat returns hallucinated or ungrounded answers without this canned string), you likely have an adjacent but different bug; do not apply this guide blindly.

---

## 2. Is my instance affected?

Run these greps and SQL checks before reading the rest of the guide. If all of (a–f) hold, you have the exact bug this guide fixes.

### 2.1 Code-level grep checks

```bash
# (a) The exact error string lives in ONE place — the RAG route handler's legacy fallback.
rg --line-number "No documents are currently enabled for AI training" -- app lib
# Expect: exactly one match in the chat / AI route handler.

# (b) The chat handler imports BOTH a new-style File Search Store service AND a legacy RAG service.
rg --line-number "getFileSearchStoreService|FileSearchStoreService|getGeminiRAG|GeminiRAGService" -- app/api lib
# Expect: both imports exist; both are used inside the chat route handler.

# (c) The legacy fallback query filters on a column that no upload code writes.
# Common zombie column names: gemini_file_id, gemini_file_name, legacy_file_id.
rg --line-number "gemini_file_id|legacy_file_id" -- app/api lib/chat lib/rag
# Expect: reads in the chat/search tool; zero writes in upload/process routes.

# (d) The upload handler writes a "new" column (gemini_document_name or similar) but never writes the zombie one.
rg --line-number "gemini_document_name|file_search_store_id" -- app/api/.*documents
# Expect: writes in the upload POST + processing route.
```

### 2.2 DB-level checks (read-only)

Replace table/column names with whatever your instance uses.

```sql
-- (e) Zombie column is empty across the fleet.
SELECT COUNT(*) FILTER (WHERE <zombie_col> IS NOT NULL) AS zombie_populated,
       COUNT(*) FILTER (WHERE <new_col>    IS NOT NULL) AS new_populated,
       COUNT(*)                                         AS total
FROM   <document_table>
WHERE  is_active = true;
-- Expect: zombie_populated = 0 (or near-zero for any legacy rows that never migrated).

-- (f) At least one agency has training-enabled docs but no active File Search Store row.
SELECT COUNT(DISTINCT d.<agency_fk>) AS stranded_agencies
FROM   <document_table>       d
LEFT JOIN <file_search_store_table> fss
       ON fss.<agency_fk> = d.<agency_fk> AND fss.is_active = true
WHERE  d.is_active = true AND d.<training_flag_col> = true AND fss.id IS NULL;
-- Expect: stranded_agencies >= 1 — those are the users seeing the bug.
```

### 2.3 Interpretation matrix

| (a) error string found | (b) both services imported | (c) zombie read with no writer | (e) zombie empty | (f) stranded agencies | Verdict |
|---|---|---|---|---|---|
| ✅ | ✅ | ✅ | ✅ | ≥1 | Apply this guide |
| ✅ | ✅ | ✅ | ✅ | 0 | Apply code fixes; no data backfill needed |
| ✅ | only legacy | ✅ | ✅ | ≥1 | Different bug — you're still on the old single-service path; needs a larger migration |
| ❌ | — | — | — | — | Different bug — canned string is somewhere else; read your chat route's error branches directly |

---

## 3. Root-cause mechanism

The chat route handler has **two parallel retrieval backends** coexisting in one function:

- **New path** — a persistent-store API (e.g., Gemini File Search Stores). Each tenant has a "store" row that ties documents to an external index; the chat route queries the store with a server-side metadata filter scoped to the tenant.
- **Legacy path** — a file-API RAG service (e.g., Gemini Files API). Documents are referenced by an ephemeral file ID stored in a column the upload pipeline no longer populates.

The chat handler selects between the two by reading the tenant's row from the new-path store table. If that row exists, it uses the new path. If not, it falls through to the legacy path.

**Three compounding failures produce the symptom:**

1. **Silent fire-and-forget upload failure.** The upload handler creates the DB row synchronously but provisions the external store asynchronously in an IIFE whose errors are only logged. When that IIFE fails (quota, network, transient service outage), the DB row exists with the new-path columns `NULL`, and the store row is never inserted. User's UI shows the document; backend sees a broken index.
2. **Legacy fallback filters on a dead column.** The fallback's WHERE clause requires the zombie column to be non-null, but the current upload pipeline only writes the new-path column. For any document uploaded after the migration to the new path, the fallback's query is structurally unsatisfiable — it returns zero rows every time.
3. **Client-side "training on" banner that never checks server truth.** The banner renders from a payload pushed through a DOM `CustomEvent` (or equivalent client-side mechanism) when the user clicks the "Send to AI Chat" button. It shows "training on" because client state says so. The server contradicts it because the server reads the DB + external store, where the real state is different.

The canned error message is emitted inside the legacy fallback's zero-row branch. In other words: **the user sees the error only when the chat has been routed to the legacy backend AND the legacy backend's query filter is structurally broken.** Both conditions hold for any instance that migrated upload to the new path without deleting the legacy fallback or rewriting its query.

---

## 4. Why the minimal / "obvious" fix does not work

The instinct is to swap the zombie column in the legacy fallback's query for the new-path column. Do **not** do this. The legacy RAG service and the new-path service are built on **different external APIs** (different ID formats, different hydration sources, different lifetimes). The legacy service typically:

- Calls something like `files.get({ name })` against a file API that only accepts the zombie column's ID format.
- Hydrates its in-memory document index from a `files.list()` call that cannot see documents stored under the new-path API.
- May also have SDK-type annotations marking fields as *"not supported in this API"*, which means parts of the expected response shape are silently absent.

Swapping the column would hand the legacy service IDs it cannot resolve — it would either throw on `files.get`, filter to zero on hydration, or silently return empty. You would replace "sometimes no chunks" with "always no chunks." The legacy path is not repairable in place; it must be **deleted** and the chat must go through the new path exclusively.

---

## 5. Fix architecture (recommended)

The council consensus after six rounds of debate was:

1. **Delete the legacy fallback.** The branch is dead inheritance from an unfinished migration; maintaining it multiplies bug surface.
2. **If the tenant has no store row, return an honest diagnostic.** Examples: *"Your knowledge base is still being set up — please re-upload or contact support."* Do not lazy-provision inside the chat request handler (this creates stampede + Gemini-rate-limit + circuit-breaker contamination risks).
3. **Enforce per-document scope with a DB-side allowlist.** Before calling the external search, load the set of document IDs (in the new-path format) that are eligible: `is_active = true AND <training_flag_col> = true AND <new_path_id_col> IS NOT NULL`. Pass the allowlist to the search. Post-filter returned citations against the allowlist client-side as belt-and-suspenders.
4. **Accept that the per-document "training" flag cannot be re-stamped into the external index today.** Many SDKs do not expose a per-document metadata patch method. Authoritative source of truth is your DB; the external index's metadata is stamped once at upload and is a search convenience, not a privacy boundary.
5. **Remove defensive "demo-agency" fallbacks from the authenticated code paths.** Hardcoded tenant defaults in multi-tenant routes are a cross-tenant data-leak fuse, not a fallback. Fail closed with a 401/403 if tenant scope is unresolved.
6. **Fix the parser on any environment-variable feature flags.** Typical `readBool` implementations accept only `"true"` / `"1"` and treat `"FALSE"`, `"0"`, `" false"`, `"no"` as falsy-but-unrecognized → defaults. In an incident this looks like "the flag doesn't turn off." Use a parser that accepts explicit-false variants and warns on unparseable values.

### 5.1 Decision: the post-filter is belt-and-suspenders only

The external search should already enforce tenant scope via its own metadata filter (e.g., a `metadata_filter` arg at the API level). That is the primary security boundary. The DB allowlist is a second layer that catches:

- Per-document toggle-off intent (the external metadata cannot be patched, so the allowlist is the only way your DB toggle affects retrieval).
- Soft-deleted documents whose external index entries were not deleted (`is_active = false` doesn't propagate either).
- SDK regressions that silently drop the external metadata filter.

Before shipping the post-filter, **verify the external search response actually exposes a field you can use as the allowlist key** (e.g., a `documentName` field on grounding citations). Some SDK types annotate these fields as unsupported on the public API tier. Run a one-off live probe against a non-prod tenant before depending on it.

---

## 6. Must-fix items before Phase 1 ships

These are blockers. If any are skipped, the fix introduces new regressions within 48 hours.

1. **Syntactic drift check.** Before applying any diff, confirm actual symbols in your codebase: table name, function name, Supabase client import, the import path of the external-search service. Forks drift — rename once before patching.
2. **`readBool` semantics**: treat `"false"`, `"FALSE"`, `"0"`, `" false"`, `"no"` as explicit false; warn on unparseable; never silently fall back to default on an unknown value.
3. **Feature-flag safety.** Whatever flags you introduce, the worst-case combination must not bypass tenant scope. Tenant `metadata_filter` is non-negotiable in every code path, not gated by any flag.
4. **Collapse "storeName + agencyId" pair to "agencyId" alone.** If you add a new retrieval method, resolve the external store name internally from the agency. A two-arg signature where both are independently passed invites cross-tenant misuse — someone eventually swaps them.
5. **Delete every hardcoded demo-tenant fallback** in server-side paths. Grep for `'demo-agency'`, `'demo-tenant'`, or similar sentinels. Each one is a fuse. Fail closed instead.
6. **Backfill must not create empty external stores.** If your fix provisions a missing store for a stranded tenant but does not re-upload that tenant's documents, the user experience is identical to the bug — the store has zero indexed documents. Either re-upload bytes (read from object storage, push to the external API) or don't create the store at all and surface an actionable error to the user.
7. **Probe the external-search response shape live.** If your post-filter relies on a field the SDK says is unsupported on your API tier, the filter is a no-op. Write a small probe script, run it against a dev/demo tenant, confirm the field populates before trusting it.

---

## 7. Phase 1 implementation (single PR, this week)

Target: kill the canned error for stranded tenants, plug the privacy leak, remove the demo-tenant land mine, add regression coverage. ~150–250 net lines across 4–6 files. No DB migrations. No new feature flags.

### 7.1 Changes

**Chat route handler (one file):**

- **Remove the legacy fallback block.** Delete the code that queries the zombie column, the early-return of the canned error, and the call to the legacy RAG service. Delete the legacy service's import from the chat route.
- **Change `.single()` to `.maybeSingle()`** on the store-lookup query. Destructure both `data` and `error`. If `error`, log it with agency context and return an honest diagnostic. If `!data`, skip to the "still being set up" diagnostic branch — do not fall through to a deleted backend.
- **Load the DB-side allowlist.** After the store is found, run a second query: select the new-path ID column from the documents table filtered by tenant + active + training-enabled. If empty, return a branch-appropriate diagnostic (the tenant genuinely has no trained docs). If populated, continue.
- **Call the external search.** Pass the store name, the user's query, and — if supported by the SDK — the allowlist as a parameter. Get back grounding citations.
- **Post-filter** citations against the allowlist, if the SDK exposes a field you can match against. If the probe from §6.7 confirmed no such field, skip the post-filter silently (do not emit misleading "citations removed" logs).
- **Remove the `'demo-agency'` (or equivalent) fallback literal.** If the tenant id is undefined at this point, return 401/403 — do not default into a sentinel tenant.

**Retrieval service (one file):**

- If needed, add an overload on the search method that accepts an allowlist. Do not introduce a two-arg `(storeName, agencyId)` shape; resolve the store internally from the agency.

**Function-calling tool reader (one file):**

- Find any adjacent code path (e.g., a search-knowledge-base tool exposed to the LLM) that reads the zombie column. Replace the select and any derived flags (e.g., `hasGeminiFile`) with the new-path column or drop the flag entirely.

**Env parser (one file):**

- Replace the `readBool` (or equivalent) implementation with a strict parser. Log a warn if the env var is set but unparseable.

**Regression test (one new file):**

- Mock the DB + external service. Three minimum test cases:
  - **Repro:** tenant has training-enabled docs, new-path ID populated, no store row → handler returns an honest "still being set up" message, **not** the canned error. Fails today, passes after fix.
  - **Privacy:** tenant has a doc with training-off in DB but present in the external index → handler does not include it in citations.
  - **Soft-delete:** tenant has a doc with `is_active = false` → handler does not retrieve it.

### 7.2 Observability additions (three log lines)

Each one answers a question operators currently cannot answer.

- `kb.retrieval_path_chosen { tenantId, path: 'store' | 'no-store' }` — at the branch point after store lookup. Answers: "how many tenants are hitting the no-store branch right now?" Alert when rate is non-zero post-backfill.
- `kb.training_allowlist_resolved { tenantId, allowlistSize, totalDocsForTenant, failOpen }` — after the DB-side allowlist query. Answers: "does this tenant have training docs, and is our filter finding them?"
- `kb.chunks_post_filtered { tenantId, returned, filteredOut, allowlistSize }` — at the end of the external search. Answers: "is the post-filter actually catching anything?" If `filteredOut` is always zero and toggles are happening, the post-filter is not wired. If it is non-zero, you have proof the privacy barrier engaged.

Do not include customer filenames or document titles in structured log fields. Use IDs only. Filenames leak into aggregated log platforms with longer retention than your PII policy may allow.

### 7.3 What to explicitly **not** do in Phase 1

- **No lazy provisioning inside the chat request.** It creates store-create stampedes under load, blocks chat responses on external-API latency, and contaminates shared circuit breakers. If a tenant has no store, say so and move on.
- **No column-drop migration.** The zombie column still has adjacent readers (greps will surface them). Drop it in Phase 2 after the readers are fixed and you have observability proving zero reads.
- **No per-tenant circuit breaker refactor.** The current singleton breaker is a known foot-gun but a separate ticket; do not bundle it into the hotfix.
- **No banner-reads-server-truth refactor.** The UI banner lying is a UX bug, not a correctness or privacy bug once the allowlist is enforced. Separate ticket.
- **No external-metadata patch attempts.** If the SDK doesn't expose a per-document metadata patch method, don't emulate it with delete + re-upload in the hot path. Let the DB be authoritative.

---

## 8. Phase 2 follow-up tickets (not this week)

Each of these is its own PR, its own test plan, its own deploy.

1. **Re-upload script for stranded tenants.** Reads document bytes from object storage, pushes to the external search API, stamps the new-path ID column. Runs per-tenant under a rate-limit. Without this, tenants whose upload IIFE failed historically will see "still being set up" forever until they manually re-upload.
2. **Per-tenant circuit breaker** on the retrieval service singleton. One noisy tenant currently trips a global breaker.
3. **Server-truth banner.** Replace the client-side event payload with a fetch from a documents endpoint that returns authoritative `{ isTrained, isIndexed, storeReady }`.
4. **External-metadata re-stamping** *if and when* the SDK exposes a per-document patch method. Until then, allowlist is the barrier.
5. **Drop the zombie column** via migration, after CI lint confirms zero reads anywhere in the codebase.
6. **Delete the legacy retrieval service** (`lib/rag/` directory or equivalent) and the SDK that backs it. Remove from `package.json`.
7. **Architectural Decision Record** documenting the provisioning contract. Specifically: when is the external store created? Is upload synchronous w.r.t. store creation or fire-and-forget? Who owns retry? A squash-commit history often loses this context; write it down before the next maintainer repeats the same mistake.
8. **CI lint rule** — ESLint `no-restricted-syntax` on `.select('<zombie_col>')`, `.eq('<zombie_col>', …)`, `.not('<zombie_col>', …)` outside migration scripts. Prevents re-introduction.

---

## 9. Verification queries — use before and after implementation

Run these against prod (read-only) before Phase 1 ships, and again after. Baseline the numbers.

```sql
-- Q1. Zombie column audit. Confirms the column is dead (expect all zero / near-zero).
SELECT
  COUNT(*)                                               AS total_active,
  COUNT(*) FILTER (WHERE <zombie_col> IS NOT NULL)       AS has_zombie,
  COUNT(*) FILTER (WHERE <new_col>    IS NOT NULL)       AS has_new,
  COUNT(*) FILTER (WHERE <training_flag> = true)         AS training_enabled,
  COUNT(*) FILTER (WHERE <training_flag> = true
                        AND <new_col> IS NOT NULL)       AS training_and_indexed
FROM <document_table>
WHERE is_active = true;

-- Q2. Stranded tenants — those whose users see the bug right now.
SELECT d.<agency_fk> AS tenant_id,
       COUNT(d.id)   AS active_docs,
       COUNT(d.id) FILTER (WHERE d.<training_flag>) AS trainable_docs
FROM <document_table> d
LEFT JOIN <file_search_store_table> fss
       ON fss.<agency_fk> = d.<agency_fk> AND fss.is_active = true
WHERE d.is_active = true
GROUP BY d.<agency_fk>
HAVING fss.id IS NULL  -- actually use: aggregated check
     AND COUNT(d.id) FILTER (WHERE d.<training_flag>) > 0;
-- (rewrite with a subquery if your dialect doesn't like LEFT JOIN + HAVING-on-joined)

-- Q3. Demo-tenant land mine — are there tenants whose id or name matches a hardcoded sentinel?
SELECT id, name
FROM <agency_table>
WHERE id::text IN ('demo-agency', 'demo', 'demo-tenant')
   OR name ILIKE '%demo%';
-- Expect: zero rows. Non-zero = review every sentinel fallback in code first.

-- Q4. Users without tenant — do any rows in the users table have null tenant fk?
SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE <agency_fk> IS NULL) AS no_tenant
FROM <users_table>;
-- Non-zero "no_tenant" = removing demo-tenant fallbacks without a secondary path will 403 these users.
-- Need to understand why and add a migration path before stripping fallbacks.

-- Q5. RLS policy verification — confirm the tenant-scoping policy uses a user-lookup
--    (not a JWT claim) on every tenant-scoped table.
SELECT n.nspname || '.' || c.relname AS table_name,
       p.polname, p.polcmd, pg_get_expr(p.polqual, c.oid) AS using_expr
FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
                JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relname IN ('<document_table>', '<file_search_store_table>', '<agency_table>', '<users_table>')
ORDER BY table_name, p.polname;
-- Expect: policies resolve tenant via a SELECT against the users table,
--         NOT via `auth.jwt() ->> '<tenant_claim>'`. JWT claims are often empty
--         and give false-negatives on every read from user-scoped clients.
```

---

## 10. Live probe for the external-search response shape

Before trusting a post-filter on `groundingCitation.<field>`, confirm the field populates. Write a small script under `scripts/` that uses the project's existing retrieval service, point it at a non-prod tenant, and dump the entire response as JSON.

```ts
// scripts/probe-search-response.ts
// Usage: bun run scripts/probe-search-response.ts --tenant <uuid> --query "<question>"

import { createClient } from '<your server-side Supabase factory>';
import { getYourRetrievalService } from '<lib path>';

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const supabase = await createServiceRoleClient();

  const { data: store } = await supabase
    .from('<file_search_store_table>')
    .select('store_name')
    .eq('<agency_fk>', args.tenant)
    .eq('is_active', true)
    .maybeSingle();

  if (!store) { console.error('No active store for tenant'); process.exit(2); }

  const service = getYourRetrievalService(process.env.GOOGLE_AI_API_KEY!);
  const raw = await service.searchRaw(store.store_name, args.query, { tenantId: args.tenant });

  console.log(JSON.stringify(raw, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
```

What to look for in the dump:

- Is there a `candidates[0].groundingMetadata.groundingChunks[].retrievedContext` array, and does each element have a `title`, `uri`, or `documentName` field?
- Is there a `candidates[0].content.parts[n]` entry with a file-search-result type containing a `file_search_store`, `text`, `title` triple?
- Is the response literally empty even when your store has indexed documents that match the query?

Confirmed answers determine which field your post-filter matches against, or whether a post-filter is possible at all on your API tier.

---

## 11. Deploy plan

1. **Baseline prod state.** Run §9 queries. Write down the numbers. They are your pre-deploy snapshot.
2. **Merge the doc-only PR** adding this playbook to your repo (you are reading it). No functional change.
3. **Merge Phase 1 PR** — code changes from §7. Single branch, single PR, reviewed.
4. **Verify in prod.** Send a chat request against a known-good tenant. Expect `kb.retrieval_path_chosen: store`, `kb.training_allowlist_resolved` with a non-zero size, `kb.chunks_post_filtered` firing. Re-run §9 Q2 — stranded tenant count should equal pre-deploy number (code fix doesn't heal data; Phase 2 re-upload does).
5. **Communicate with stranded-tenant customers.** Send a brief note that they need to re-upload the affected documents *or* wait for the re-upload script (Phase 2). Their user experience goes from "confusing contradictory error" to "honest 'still being set up' message" after Phase 1.

---

## 12. Rollback plan

Three tiers, ordered by severity.

1. **Revert the PR.** The fix is code-only, no DB migration. Reverting to the pre-fix commit restores previous behavior (the canned-error bug). No data loss, no reseed needed.
2. **If the revert still shows regressions** (e.g., another branch was merged on top that depends on the fix), roll back the whole release to the last known-good deploy via your platform (Vercel "Promote" on a previous deployment).
3. **If a DB migration landed with the fix** (shouldn't happen in Phase 1, but check), reverse the migration with its down-migration first, then revert code.

Detection signals:
- 5xx rate on the chat route > 0.5% for >5 min.
- New Sentry cluster referencing the retrieval service or the chat route handler.
- `kb.retrieval_path_chosen` log volume drops by >50% (retrieval short-circuiting silently).
- User reports of "chat lost my documents" on any tenant.

---

## 13. Residual risks (known and accepted)

After Phase 1 ships, these remain and should have tickets:

1. **Empty external stores for stranded tenants.** The code fix surfaces an honest error but does not repair historical data. Tenants get "still being set up" until the Phase 2 re-upload script runs or they manually re-upload.
2. **Banner still lies.** The UI banner continues to read client-side state; it can say "training on" while the DB says off. Server-side allowlist still correctly excludes the doc — but the user-perceived contradiction persists as a UX papercut until the banner refactor ships.
3. **Soft-deleted docs linger in the external index.** Allowlist filters them out at query time, so they are unreachable via chat. But they still occupy quota and can be retrieved by any caller that forgets the allowlist. Separate hygiene ticket.
4. **`metadata_filter` is load-bearing and unverified unless you ran the §10 probe.** If it silently no-ops on your API tier, cross-tenant data leakage is possible on any path that forgets the explicit `tenant_id` filter in the DB allowlist. Run the probe.
5. **Legacy retrieval service is dead but undeleted.** Its presence in the repo invites a future engineer to wire a new feature to it. File the Phase 2 deletion ticket now.

---

## 14. Implementation log

> *This section is appended to during implementation. Each entry records a deviation, a nuance, or a correction discovered while applying the guide. Format: date, instance, what was different, what I did.*

### Entry 1 — First apply: discovered an upstream upload-handler fire-and-forget lifecycle bug

**Context.** On the first instance where this guide was applied, a production database query showed every single upload attempt in the entire fleet had the same signature: `index_status='pending'` (never transitioned), `gemini_file_id=NULL`, `gemini_document_name=NULL`, `file_search_store_id=NULL`. Not a single `file_search_store` row existed for any agency. This meant the bug was not only in the chat-side fallback (as described in §3–§5) — the *upstream* upload pipeline had never successfully provisioned a store for any agency, ever.

**The additional root cause: the upload handler's post-response background work never runs on Vercel.**

The upload handler structured the store-provisioning + Gemini-upload work as an orphaned async IIFE fired *after* the handler returned the 201 response:

```ts
// UPLOAD HANDLER — BROKEN PATTERN
return NextResponse.json({ data: document }, { status: 201 })
// ...above this line, the IIFE was dispatched but not awaited:
;(async () => {
  try {
    const { storeName, storeId } = await getOrCreateAgencyStore(supabase, agencyId)
    // ... Gemini upload, DB update ...
  } catch (err) {
    // Mark document as failed — never fires because container dies first
  }
})()
```

On Vercel's serverless Node runtime (and any equivalent: AWS Lambda, Cloud Run with scale-to-zero, etc.), once the handler returns a Response the invocation is marked complete and the container may be frozen or terminated immediately. Any pending microtasks or in-flight promises inside the IIFE get killed. The `try` block never runs to completion, and the `catch` that would have set `index_status='failed'` never fires either — so the document row is stuck at `index_status='pending'` forever, with the silent side effect that *no* `file_search_store` row is ever created for the agency. Every subsequent chat falls to the legacy fallback → zombie-column filter → the canned error message.

**The correct pattern on Next.js 15+ / Vercel is `after()` from `next/server`:**

```ts
import { NextResponse, after } from 'next/server'

// ... handler body ...

after(async () => {
  try {
    const { storeName, storeId } = await getOrCreateAgencyStore(supabase, agencyId)
    // ... Gemini upload, DB update ...
  } catch (err) {
    // Now fires: Vercel keeps the container alive until after() callbacks complete.
  }
})

return NextResponse.json({ data: document }, { status: 201 })
```

On other platforms the equivalent is `waitUntil()` on the platform's request context (Cloudflare Workers' `ctx.waitUntil`, AWS Lambda's `context.callbackWaitsForEmptyEventLoop=true` + explicit awaits).

**How to detect this in an arbitrary instance:**

```bash
# Quick triage: does the upload handler import `after`?
rg --line-number "import .* from 'next/server'" -- app/api/.*documents
# If the import line lacks `after`, check the surrounding code for a bare
# `;(async () => { ... })()` pattern after `return NextResponse.json(...)`.
# That pattern on Vercel = silent provisioning failure every time.
```

```sql
-- Same-table correlated-state query: does any active training-enabled doc
-- have `index_status='pending'` older than a few minutes with no Gemini
-- columns populated? If yes, the upload IIFE is being killed.
SELECT COUNT(*) AS suspected_stuck_pending
FROM <document_table>
WHERE is_active = true
  AND <training_flag> = true
  AND index_status = 'pending'
  AND gemini_document_name IS NULL
  AND file_search_store_id IS NULL
  AND created_at < NOW() - INTERVAL '15 minutes';
-- Non-zero = the fire-and-forget lifecycle bug is biting this instance too.
```

**Scope change to Phase 1.** Add a fifth file to the diff set:

- **Upload handler:** import `after` from `next/server`; wrap the fire-and-forget IIFE in `after(async () => { ... })`; remove the bare IIFE invocation; keep the `try/catch` inside — `after` does not provide its own error handling.

Without this addition, Phase 1 converts a misleading error into an honest "KB still being set up" message, but every new upload continues to be stranded. Customers who re-upload after Phase 1 deploys will hit the exact same failure mode — the guide's "KB still being set up" message will be permanent for them.

**Verification after shipping the `after()` change.** Upload a single test document via the UI (or a probe script) and watch the `document` row transition: `index_status` should move from `pending` → `indexing` → `indexed` within ~30–120 seconds; `gemini_document_name` and `file_search_store_id` should populate; `file_search_store` should gain one row for the tenant on first upload. If any of these don't happen, the problem is inside the provisioner or Gemini SDK — not the lifecycle — and further investigation is needed.

**What about existing stranded documents?** The `after()` fix only helps new uploads. Existing `index_status='pending'` rows still need repair. Two options:

1. **Trigger via the `/process` endpoint** (or equivalent retry endpoint the codebase exposes) for each stranded doc. Look for an existing retry route in `app/api/.*documents/process` or similar.
2. **One-off script** that iterates stranded rows, re-downloads bytes from object storage, calls the provisioner + uploader synchronously, writes back. Dry-run first, commit per-tenant.

Either approach is Phase 2 territory — it does not block the hotfix deploy. But communicate clearly to affected customers that their pre-fix uploads need to be either re-uploaded or waited-on-for-repair before AI chat will work.

**Lesson for the guide's §6 (must-fix items).** Added a new mandatory check: *"Verify the upload handler uses `after()` (or the platform-specific equivalent) for post-response background work; never a bare IIFE after `return`."* This is now part of the §2 "is my instance affected" triage as well — if the upload handler uses a bare IIFE on a serverless platform, this bug is guaranteed to reproduce on every upload, regardless of whether the chat-side zombie-column bug is present.

---

### Entry 2 — Cross-instance comparison: the bug is latent in sibling forks too

**Context.** During first-apply investigation, we compared the broken instance against a sibling fork that was reportedly "working." Result:

```
diff -r broken/lib/gemini/                 working/lib/gemini/        → empty
diff -r broken/app/api/v1/chat/            working/app/api/v1/chat/   → empty
diff -r broken/app/api/v1/documents/       working/app/api/v1/documents/  → empty
diff -r broken/lib/rag/                    working/lib/rag/           → empty
diff     broken/package.json               working/package.json       → 2 unrelated markdown libs
diff     broken/next.config.mjs            working/next.config.mjs    → empty
diff     broken/vercel.json                working/vercel.json        → empty
```

**The code is byte-identical.** Same Next.js version, same external SDKs, same config. Yet one fork "works" and the other doesn't.

**Inspection of the working fork's git history revealed the architectural context:** an earlier commit on that fork explicitly fixed *exactly* this bug class — in the **chat route** — by migrating fire-and-forget background work to `next/server`'s `after()` API. The commit message is worth reading in full because it generalizes precisely to the upload route:

> *"Replace fire-and-forget promise patterns with Next.js `after()` API. On Vercel serverless, fire-and-forget promises can be killed when the function returns its response, silently preventing [background work]. `after()` guarantees the background work completes by keeping the function alive until all callbacks finish."*

The fix was applied to the chat route's memory-storage pathway. **It was not applied to the documents upload handler's store-provisioning IIFE.** Two months later, that unpatched IIFE is exactly what's biting this fork.

**Why the "working" fork isn't visibly broken (candidate explanations):**

1. **Historical window when the IIFE worked.** Vercel's serverless runtime has tightened over time. Older deploys may have given the IIFE enough post-response grace to finish. Newer deploys kill it aggressively.
2. **One historical successful upload seeds everything.** If a single upload ever completed in the past (under looser runtime behavior, or by luck of short execution time), that upload created the `file_search_store` row at the DB level. Every subsequent upload finds and reuses that row, so the chat route takes the *new* path instead of the legacy fallback — the user-visible "no documents enabled" message never fires, even if the underlying indexing still silently fails.
3. **User behavior.** The visible failure requires the specific sequence: fresh tenant with no store row → upload → toggle → open chat with the doc attached → ask about it. Installations whose users don't hit that exact sequence never reproduce.

**The takeaway for the guide.**

When a fork appears to "work" where a sibling doesn't, and the code is identical, do not assume the bug is absent in the working fork. In most cases it is *latent* — waiting for a fresh tenant or a cold-deploy or a slow Gemini call to reproduce. **Apply this fix to every fork, not just the one currently showing the symptom.** The same `after()` + allowlist changes land byte-for-byte in any sibling that shares the code tree.

**Added to §6 must-fix items (for next reader): detect "working" sibling instances as follows:**

```sql
-- Run against the "working" fork's DB. If it has 0 file_search_store rows
-- *and* any active documents, the bug is latent — users just haven't hit it.
SELECT
  (SELECT COUNT(*) FROM <file_search_store_table> WHERE is_active=true) AS stores,
  (SELECT COUNT(*) FROM <document_table> WHERE is_active=true)          AS docs;

-- If stores=0 AND docs>0 → latent; ship the fix anyway.
-- If stores>0 AND stores=distinct tenants with docs → historically healthy; still ship the fix to prevent regression on next fresh tenant.
```

---

### Entry 3 — Drive-imported documents are a separate, fully untreated bug class

**Context.** After Phase 1 shipped + Vercel prod deploy completed, we ran the repair script against the target client's stranded document to heal it via the same pipeline `/api/v1/documents/process` uses. The script found the row correctly in dry-run mode, but the commit run failed at the very first step: `Storage download failed: {}`. An opaque empty-object error from `supabase.storage.from('documents').download(...)`.

**Diagnosis.** Queries against the DB + storage revealed:

- `storage_path` = `<agency_id>/drive/<drive_file_id>.gdoc`
- `mime_type` = `application/vnd.google-apps.document`
- `file_size` = 0
- `storage.objects` for bucket `documents` = **0 rows** (entire bucket is empty, not just this one path missing)

The document was imported via `POST /api/v1/documents/drive`, a handler distinct from the one Phase 1 repaired. Reading that handler revealed a much more severe bug:

```ts
// Create document record with only a synthetic storage_path reference.
// No bytes are uploaded to Supabase Storage.
const storagePath = `${agencyId}/drive/${fileId}.${file_extension}`
await supabase.from('document').insert({ ..., storage_path: storagePath, index_status: 'pending', ... })
// ...returns 201 with message: "Processing will begin shortly."
```

**That message is a lie.** The handler creates a placeholder DB row referencing a Drive file by URL, but:

- There is no synchronous bytes-upload-to-Storage step
- There is no async Gemini indexing IIFE (not even a broken one)
- There is no background cron / queue that picks up Drive-imported docs
- The integration provider enum in this instance didn't even include `google_drive` — only `slack`, `gmail`, `google_ads`, `meta_ads`, so a Drive OAuth integration is not even reachable

Drive-imported documents are functional dead-ends: they appear in the Knowledge Base UI, users can toggle "AI Training" on them, but nothing is ever indexed and the AI chat cannot ground against them. It is not a regression — the feature was never wired end-to-end.

**Takeaways for the playbook:**

1. **Phase 1 does not fix Drive imports.** Phase 1 fixes the direct-upload pipeline (`POST /api/v1/documents`). A document with `mime_type` starting with `application/vnd.google-apps.` or a `storage_path` containing `/drive/` is a Drive import and requires a different repair path.
2. **Immediate unblock for affected users**: download the doc from Drive manually (File → Download → PDF / DOCX / TXT) and re-upload via the standard Upload button. The direct-upload path is the one Phase 1 fixed; a fresh upload now provisions the store + indexes correctly on first submission.
3. **The repair script now detects and skips Drive imports** with an operator-readable reason rather than failing opaquely. See the `isDriveImport` branch in `scripts/repair-stranded-documents.ts`.
4. **Phase 2+ ticket: implement real Drive ingestion.** At minimum this requires:
   - Adding `google_drive` (or `google_workspace` with `drive` scope) to the `integration_provider` enum
   - An OAuth flow that collects `drive.readonly` scope
   - A service that calls `drive.files.export` (for native Google Docs / Sheets / Slides, which cannot be raw-downloaded) or `drive.files.get?alt=media` (for binary files like PDFs already stored in Drive)
   - Wiring the export output through the same `getOrCreateAgencyStore` + `service.uploadDocument` pipeline Phase 1 made reliable
   - A retry endpoint that picks up Drive-imported pending docs (the existing `/process` endpoint cannot — it assumes Storage download)
5. **Stranded Drive rows should be soft-deleted** (`is_active=false`) after the user re-uploads via direct path. Leaving them visible in the Knowledge Base UI with training enabled but no Gemini linkage creates ongoing user confusion. The repair script could do this automatically; today it logs the recommendation and leaves the decision to the operator.

**Detection queries for future instances:**

```sql
-- How many stranded docs are direct-upload vs Drive-import?
SELECT
  CASE WHEN mime_type LIKE 'application/vnd.google-apps.%'
       OR storage_path LIKE '%/drive/%'
    THEN 'drive-import'
    ELSE 'direct-upload'
  END AS source,
  COUNT(*) AS stuck,
  COUNT(*) FILTER (WHERE index_status='pending') AS pending,
  COUNT(*) FILTER (WHERE index_status='failed')  AS failed
FROM <document_table>
WHERE is_active = true
  AND index_status IN ('pending','failed')
  AND (<new_col> IS NULL OR <store_fk_col> IS NULL)
GROUP BY 1;

-- Are there any files in the storage bucket at all?
SELECT COUNT(*) AS total_objects FROM storage.objects WHERE bucket_id='<documents_bucket>';
-- Zero objects with non-zero document rows = every doc was Drive-imported.
```

**Updated to §6 must-fix items for future readers:** add a pre-ship check — "grep the codebase for `.from('document').insert(` and audit each call site for its matching indexing pathway. If any handler creates a `document` row without either (a) an uploaded Storage object + `after()`-wrapped Gemini indexing, or (b) a documented OAuth-backed fetch + indexing pipeline, that handler is silently broken. Do not assume `/process` repairs it — `/process` only handles Storage-backed rows."

---

| Date | Instance / fork | Finding | Action |
|------|-----------------|---------|--------|
| 2026-04-23 | First apply (broken fork) | Upload IIFE silently killed by Vercel lifecycle — `index_status` stays `'pending'` forever, no `file_search_store` rows created fleet-wide | Added §14 Entry 1; expanded Phase 1 scope to include `after()` refactor of upload handler |
| 2026-04-23 | Cross-instance check (sibling fork reported "working") | Code is byte-identical; the sibling fork's git history showed an earlier `after()` fix applied to the chat route but not the documents upload route; sibling's apparent health is latency, not absence of bug | Added §14 Entry 2; Phase 1 fix applies unchanged to the sibling fork and should be ported there once verified locally |
| 2026-04-23 | Post-merge repair attempt | Target client's stranded doc was imported via `POST /api/v1/documents/drive`, not direct upload — placeholder row with no Storage bytes and no indexing pipeline; `/process` endpoint cannot repair; Phase 1 does not fix this class | Added §14 Entry 3; updated `scripts/repair-stranded-documents.ts` to skip Drive imports cleanly; recommended unblock: user re-uploads via direct path (which Phase 1 fixed); filed Phase 2 ticket to implement real Drive ingestion |

---

## 15. Credits

This guide is the distilled output of a six-round multi-model council (Claude, Gemini, Grok, GPT-5/O3 via Codex) spanning independent hypothesis generation, cross-critique, fix design, red-team, hardening, and vote-to-consensus. Fifteen agent invocations contributed; dissent was preserved where it identified real residual risk. The council's final vote unanimously endorsed "delete the legacy fallback, add a DB-side allowlist, ship a staged Phase 1 + Phase 2 plan" as the correct shape of the fix.
