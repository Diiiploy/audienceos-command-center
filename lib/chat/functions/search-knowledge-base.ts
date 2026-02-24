/**
 * Search Knowledge Base Function Executor
 *
 * Explicitly searches the agency's uploaded documents from the dashboard route.
 * Returns document titles, categories, and snippets matching the query.
 * This is complementary to the RAG route — it gives the AI direct
 * function-calling access to document metadata when in dashboard mode.
 */

import type { ExecutorContext } from './types';

interface SearchKnowledgeBaseArgs {
  query: string;
  category?: string;
  client_id?: string;
  limit?: number;
}

interface DocumentResult {
  id: string;
  title: string;
  fileName: string;
  category: string;
  clientId: string | null;
  pageCount: number | null;
  indexStatus: string;
  uploadedAt: string;
  hasGeminiFile: boolean;
}

export async function searchKnowledgeBase(
  context: ExecutorContext,
  rawArgs: Record<string, unknown>
): Promise<{ documents: DocumentResult[]; message: string }> {
  const args = rawArgs as unknown as SearchKnowledgeBaseArgs;
  const { agencyId, supabase } = context;
  const limit = args.limit ?? 10;

  if (!supabase) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[SECURITY] Supabase client is required in production.');
    }
    return { documents: [], message: 'No documents available in standalone mode' };
  }

  try {
    let query = supabase
      .from('document')
      .select('id, title, file_name, category, client_id, page_count, index_status, gemini_file_id, created_at')
      .eq('agency_id', agencyId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Text search on title and file_name
    if (args.query) {
      query = query.or(`title.ilike.%${args.query}%,file_name.ilike.%${args.query}%`);
    }

    // Filter by category
    if (args.category) {
      query = query.eq('category', args.category);
    }

    // Filter by client
    if (args.client_id) {
      query = query.eq('client_id', args.client_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[ERROR] search_knowledge_base failed:', error);
      throw new Error(`Failed to search documents: ${error.message}`);
    }

    const documents: DocumentResult[] = (data || []).map((doc) => ({
      id: doc.id,
      title: doc.title,
      fileName: doc.file_name,
      category: doc.category,
      clientId: doc.client_id,
      pageCount: doc.page_count,
      indexStatus: doc.index_status,
      uploadedAt: doc.created_at,
      hasGeminiFile: !!doc.gemini_file_id,
    }));

    const message = documents.length > 0
      ? `Found ${documents.length} document(s) matching "${args.query || 'all'}"`
      : `No documents found matching "${args.query || 'all'}"`;

    return { documents, message };
  } catch (error) {
    console.error('[ERROR] search_knowledge_base failed:', error);
    throw new Error(`Failed to search knowledge base: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
