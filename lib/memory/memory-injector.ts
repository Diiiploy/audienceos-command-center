/**
 * Memory Injector
 *
 * Injects relevant memories into system prompts.
 * Detects memory recall queries ("Do you remember...").
 */

import type {
  Memory,
  MemoryInjection,
  RecallDetection,
  MemorySearchRequest,
} from './types';
import { getMem0Service, initializeMem0Service } from './mem0-service';

/**
 * Memory recall patterns
 */
const RECALL_PATTERNS = [
  { pattern: /do you remember/i, confidence: 0.95 },
  { pattern: /we (discussed|talked about|decided)/i, confidence: 0.9 },
  { pattern: /you (told|said|mentioned)/i, confidence: 0.85 },
  { pattern: /remind me (of|about)/i, confidence: 0.9 },
  { pattern: /last (time|session|conversation)/i, confidence: 0.8 },
  { pattern: /what did (i|we|you) (say|discuss|decide)/i, confidence: 0.9 },
  { pattern: /previously/i, confidence: 0.7 },
  { pattern: /before,? you/i, confidence: 0.75 },
  { pattern: /our earlier (conversation|discussion)/i, confidence: 0.85 },
  { pattern: /you mentioned/i, confidence: 0.85 },
];

/**
 * Time reference patterns
 */
const TIME_PATTERNS = [
  { pattern: /yesterday/i, value: 'yesterday' },
  { pattern: /last week/i, value: 'last week' },
  { pattern: /last month/i, value: 'last month' },
  { pattern: /earlier today/i, value: 'earlier today' },
  { pattern: /a few days ago/i, value: 'a few days ago' },
  { pattern: /recently/i, value: 'recently' },
];

/**
 * MemoryInjector - Inject memories into system prompts
 */
export class MemoryInjector {
  private maxMemories: number = 5;
  private minRelevanceScore: number = 0.5;
  private maxTokenBudget: number = 500; // ~500 tokens to avoid prompt bloat
  private deduplicationThreshold: number = 0.85; // Jaccard similarity threshold

  /**
   * Detect if query is asking about memories
   */
  detectRecall(query: string): RecallDetection {
    let maxConfidence = 0;
    let isRecallQuery = false;

    // Check recall patterns
    for (const { pattern, confidence } of RECALL_PATTERNS) {
      if (pattern.test(query)) {
        isRecallQuery = true;
        maxConfidence = Math.max(maxConfidence, confidence);
      }
    }

    // Extract time reference if any
    let timeReference: string | undefined;
    for (const { pattern, value } of TIME_PATTERNS) {
      if (pattern.test(query)) {
        timeReference = value;
        break;
      }
    }

    // Extract topic (simplified - could use NLP)
    const extractedTopic = this.extractTopic(query);

    // Build suggested search query
    const suggestedSearchQuery = this.buildSearchQuery(
      query,
      extractedTopic,
      timeReference
    );

    return {
      isRecallQuery,
      confidence: maxConfidence,
      extractedTopic,
      timeReference,
      suggestedSearchQuery,
    };
  }

  /**
   * Extract topic from recall query
   */
  private extractTopic(query: string): string | undefined {
    // Remove recall phrases to get the topic
    let topic = query
      .replace(/do you remember/gi, '')
      .replace(/we (discussed|talked about|decided)/gi, '')
      .replace(/you (told|said|mentioned)/gi, '')
      .replace(/remind me (of|about)/gi, '')
      .replace(/last (time|session|conversation)/gi, '')
      .replace(/what did (i|we|you) (say|discuss|decide)/gi, '')
      .replace(/\?/g, '')
      .trim();

    // Clean up common words
    topic = topic
      .replace(/^(the|a|an|about|regarding)\s+/i, '')
      .replace(/\s+(earlier|before|previously)$/i, '')
      .trim();

    return topic.length > 2 ? topic : undefined;
  }

  /**
   * Build search query from recall components
   */
  private buildSearchQuery(
    originalQuery: string,
    topic?: string,
    timeReference?: string
  ): string {
    if (topic) {
      return topic;
    }
    // Fall back to cleaned original query
    return originalQuery
      .replace(/do you remember/gi, '')
      .replace(/remind me/gi, '')
      .trim();
  }

  /**
   * Inject relevant memories into system prompt
   *
   * Applies 3 layers of filtering:
   *   1. Relevance score (from Mem0 vector search)
   *   2. Deduplication (removes near-duplicate memories)
   *   3. Token budgeting (caps total injected text at ~500 tokens)
   */
  async injectMemories(
    query: string,
    agencyId: string,
    userId: string,
    clientId?: string
  ): Promise<MemoryInjection> {
    // Auto-initialize if not already done
    let mem0 = getMem0Service();
    if (!mem0) {
      try {
        mem0 = initializeMem0Service();
      } catch (error) {
        console.warn('[Memory] Failed to initialize Mem0:', error);
        return {
          contextBlock: '',
          memories: [],
          relevanceExplanation: 'Memory service not available',
        };
      }
    }

    // Fetch user-level memories
    const searchResult = await mem0.searchMemories({
      query,
      agencyId,
      userId,
      limit: this.maxMemories * 2,
      minScore: this.minRelevanceScore,
    });

    // If client context is provided, also fetch client-scoped memories and merge
    if (clientId) {
      try {
        const clientResult = await mem0.searchMemories({
          query,
          agencyId,
          userId,
          clientId,
          limit: this.maxMemories,
          minScore: this.minRelevanceScore,
        });
        // Merge client memories (higher priority — prepend so they rank first)
        searchResult.memories = [...clientResult.memories, ...searchResult.memories];
        searchResult.totalFound += clientResult.totalFound;
      } catch {
        // Client memory search failed — continue with user-level results
      }
    }

    if (searchResult.memories.length === 0) {
      return {
        contextBlock: '',
        memories: [],
        relevanceExplanation: 'No relevant memories found',
      };
    }

    // 1. Deduplicate near-identical memories
    let memories = this.deduplicateMemories(searchResult.memories);

    // 2. Weight by importance (high > medium > low) + relevance score
    memories = this.rankMemories(memories);

    // 3. Apply token budget — stop adding once budget is reached
    memories = this.applyTokenBudget(memories);

    // Build context block
    const contextBlock = this.buildContextBlock(memories);
    const relevanceExplanation = this.buildRelevanceExplanation(memories);

    return {
      contextBlock,
      memories,
      relevanceExplanation,
    };
  }

  /**
   * Remove near-duplicate memories using word-level Jaccard similarity
   */
  private deduplicateMemories(memories: Memory[]): Memory[] {
    const deduplicated: Memory[] = [];

    for (const memory of memories) {
      const isDuplicate = deduplicated.some(
        (existing) => this.jaccardSimilarity(existing.content, memory.content) >= this.deduplicationThreshold
      );
      if (!isDuplicate) {
        deduplicated.push(memory);
      }
    }

    return deduplicated;
  }

  /**
   * Word-level Jaccard similarity: |A ∩ B| / |A ∪ B|
   */
  private jaccardSimilarity(a: string, b: string): number {
    const wordsA = new Set(a.toLowerCase().split(/\s+/));
    const wordsB = new Set(b.toLowerCase().split(/\s+/));
    let intersection = 0;
    for (const word of wordsA) {
      if (wordsB.has(word)) intersection++;
    }
    const union = wordsA.size + wordsB.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  /**
   * Rank memories by combined importance + relevance score
   */
  private rankMemories(memories: Memory[]): Memory[] {
    const importanceWeight: Record<string, number> = {
      high: 0.3,
      medium: 0.1,
      low: 0,
    };

    return [...memories].sort((a, b) => {
      const scoreA = (a.score || 0) + (importanceWeight[a.metadata.importance || 'medium'] || 0);
      const scoreB = (b.score || 0) + (importanceWeight[b.metadata.importance || 'medium'] || 0);
      return scoreB - scoreA;
    });
  }

  /**
   * Limit memories to fit within token budget (~4 chars per token estimate)
   */
  private applyTokenBudget(memories: Memory[]): Memory[] {
    const charsPerToken = 4;
    const maxChars = this.maxTokenBudget * charsPerToken;
    let totalChars = 0;
    const budgeted: Memory[] = [];

    for (const memory of memories) {
      const memoryChars = memory.content.length + (memory.metadata.topic?.length || 0) + 30; // overhead
      if (totalChars + memoryChars > maxChars && budgeted.length > 0) break;
      totalChars += memoryChars;
      budgeted.push(memory);
      if (budgeted.length >= this.maxMemories) break;
    }

    return budgeted;
  }

  /**
   * Build memory context block for system prompt
   */
  private buildContextBlock(memories: Memory[]): string {
    if (memories.length === 0) {
      return '';
    }

    const lines = [
      '<user_memory_context>',
      'The following is relevant context from previous conversations:',
      '',
    ];

    for (let i = 0; i < memories.length; i++) {
      const memory = memories[i];
      const typeLabel = this.getTypeLabel(memory.metadata.type);
      lines.push(`[${i + 1}] ${typeLabel}: ${memory.content}`);

      if (memory.metadata.topic) {
        lines.push(`    Topic: ${memory.metadata.topic}`);
      }
    }

    lines.push('');
    lines.push(
      'Use this context to provide more personalized and relevant responses.'
    );
    lines.push('</user_memory_context>');

    return lines.join('\n');
  }

  /**
   * Get human-readable type label
   */
  private getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      conversation: 'Previous conversation',
      decision: 'Decision made',
      preference: 'User preference',
      project: 'Ongoing project',
      insight: 'Learned insight',
      task: 'Task/Action item',
    };
    return labels[type] || 'Memory';
  }

  /**
   * Build relevance explanation
   */
  private buildRelevanceExplanation(memories: Memory[]): string {
    const types = [...new Set(memories.map((m) => m.metadata.type))];
    const avgScore =
      memories.reduce((sum, m) => sum + (m.score || 0), 0) / memories.length;

    return `Found ${memories.length} relevant memories (${types.join(', ')}). Average relevance: ${(avgScore * 100).toFixed(0)}%`;
  }

  /**
   * Process query with memory injection
   */
  async processWithMemory(
    query: string,
    agencyId: string,
    userId: string,
    baseSystemPrompt: string,
    clientId?: string
  ): Promise<{ systemPrompt: string; usedMemories: Memory[] }> {
    // Check if this is a recall query
    const recall = this.detectRecall(query);

    // Get relevant memories (user-level + client-scoped if applicable)
    const injection = await this.injectMemories(
      recall.isRecallQuery ? recall.suggestedSearchQuery : query,
      agencyId,
      userId,
      clientId
    );

    // Build enhanced system prompt
    let systemPrompt = baseSystemPrompt;

    if (injection.contextBlock) {
      systemPrompt = `${baseSystemPrompt}\n\n${injection.contextBlock}`;
    }

    // Add recall-specific instructions if needed
    if (recall.isRecallQuery && injection.memories.length > 0) {
      systemPrompt += `\n\nThe user is asking about a previous conversation. Reference the memory context above to answer their question.`;
    }

    return {
      systemPrompt,
      usedMemories: injection.memories,
    };
  }

  /**
   * Should memories be stored for this interaction?
   *
   * Detection order matters: specific types (decision, task, project, insight)
   * are checked BEFORE the generic "remember/note" catch-all so that
   * "remember that we decided X" becomes a decision, not a preference.
   */
  shouldStoreMemory(
    userMessage: string,
    assistantResponse: string
  ): { should: boolean; type: string; importance: string } {
    const lowerUser = userMessage.toLowerCase();
    const lowerResponse = assistantResponse.toLowerCase();

    // 1. DECISIONS — check first because "remember that we decided X" should be a decision
    if (
      lowerUser.includes('decide') ||
      lowerUser.includes('decided') ||
      lowerUser.includes('let\'s go with') ||
      lowerUser.includes('we chose') ||
      lowerUser.includes('we\'re going with') ||
      lowerUser.includes('final answer') ||
      lowerUser.includes('approved') ||
      lowerUser.includes('signed off') ||
      lowerUser.includes('confirmed that') ||
      lowerUser.includes('agreed to') ||
      lowerUser.includes('committed to') ||
      lowerResponse.includes('you decided') ||
      lowerResponse.includes('your decision')
    ) {
      return { should: true, type: 'decision', importance: 'high' };
    }

    // 2. TASKS — check before preferences so "remind me" goes to task, not preference
    if (
      lowerUser.includes('remind me') ||
      lowerUser.includes('todo') ||
      lowerUser.includes('to-do') ||
      lowerUser.includes('action item') ||
      lowerUser.includes('follow up with') ||
      lowerUser.includes('follow up on') ||
      lowerUser.includes('need to do') ||
      lowerUser.includes('don\'t forget to') ||
      lowerUser.includes('make sure to') ||
      lowerUser.includes('schedule a') ||
      lowerUser.includes('schedule the') ||
      lowerUser.includes('deadline is') ||
      lowerUser.includes('deadline for') ||
      lowerUser.includes('due date')
    ) {
      return { should: true, type: 'task', importance: 'medium' };
    }

    // 3. PROJECT context — ongoing work, campaigns, builds
    if (
      lowerUser.includes('working on') ||
      lowerUser.includes('the project') ||
      lowerUser.includes('our project') ||
      lowerUser.includes('project update') ||
      lowerUser.includes('project status') ||
      lowerUser.includes('campaign for') ||
      lowerUser.includes('we\'re building') ||
      lowerUser.includes('we\'re launching') ||
      lowerUser.includes('sprint') ||
      lowerUser.includes('milestone') ||
      lowerUser.includes('roadmap')
    ) {
      return { should: true, type: 'project', importance: 'high' };
    }

    // 4. INSIGHTS / learnings — things discovered or realized
    if (
      lowerUser.includes('i learned') ||
      lowerUser.includes('i realized') ||
      lowerUser.includes('i noticed') ||
      lowerUser.includes('i discovered') ||
      lowerUser.includes('turns out') ||
      lowerUser.includes('key takeaway') ||
      lowerUser.includes('important insight') ||
      lowerUser.includes('lesson learned') ||
      lowerUser.includes('good to know') ||
      lowerUser.includes('interesting that') ||
      lowerUser.includes('the data shows') ||
      lowerUser.includes('we found that')
    ) {
      return { should: true, type: 'insight', importance: 'high' };
    }

    // 5. EXPLICIT store requests ("remember that...", "note that...", "keep in mind...")
    // Now checked AFTER specific types so "remember that we decided" → decision, not preference
    if (
      lowerUser.includes('remember that') ||
      lowerUser.includes('please remember') ||
      lowerUser.includes('can you remember') ||
      lowerUser.includes('note that') ||
      lowerUser.includes('keep in mind') ||
      lowerUser.includes('keep track of') ||
      lowerUser.includes('for future reference')
    ) {
      return { should: true, type: 'preference', importance: 'high' };
    }

    // 6. THIRD-PERSON preferences ("[name] prefers...", "their preference...")
    if (
      /\bprefers?\b/i.test(lowerUser) ||
      lowerUser.includes('their preference') ||
      lowerUser.includes('communication preference') ||
      /\b(always|never)\b.*(use|send|contact|communicate|reach out)/i.test(lowerUser)
    ) {
      return { should: true, type: 'preference', importance: 'high' };
    }

    // 7. FIRST-PERSON preferences ("I prefer...", "I like...", "I want...")
    if (
      lowerUser.includes('i prefer') ||
      lowerUser.includes('i like') ||
      lowerUser.includes('i want')
    ) {
      return { should: true, type: 'preference', importance: 'high' };
    }

    // 8. Significant conversations — long exchanges that didn't match any specific type
    if (userMessage.length > 100 && assistantResponse.length > 200) {
      return { should: true, type: 'conversation', importance: 'low' };
    }

    return { should: false, type: '', importance: '' };
  }

  /**
   * Update configuration
   */
  configure(options: {
    maxMemories?: number;
    minRelevanceScore?: number;
    maxTokenBudget?: number;
    deduplicationThreshold?: number;
  }): void {
    if (options.maxMemories !== undefined) {
      this.maxMemories = options.maxMemories;
    }
    if (options.minRelevanceScore !== undefined) {
      this.minRelevanceScore = options.minRelevanceScore;
    }
    if (options.maxTokenBudget !== undefined) {
      this.maxTokenBudget = options.maxTokenBudget;
    }
    if (options.deduplicationThreshold !== undefined) {
      this.deduplicationThreshold = options.deduplicationThreshold;
    }
  }
}

// Singleton instance
let memoryInjectorInstance: MemoryInjector | null = null;

/**
 * Get or create MemoryInjector instance
 */
export function getMemoryInjector(): MemoryInjector {
  if (!memoryInjectorInstance) {
    memoryInjectorInstance = new MemoryInjector();
  }
  return memoryInjectorInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetMemoryInjector(): void {
  memoryInjectorInstance = null;
}
