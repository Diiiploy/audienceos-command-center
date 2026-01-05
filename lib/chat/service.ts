/**
 * Chat Service
 *
 * Handles chat interactions with Gemini, including:
 * - Streaming responses via SSE
 * - Session management
 * - Context injection
 */

import { GoogleGenAI } from '@google/genai';
import type {
  ChatMessage,
  ChatRequest,
  ChatSession,
  StreamChunk,
  StreamOptions,
  RouteType,
  Citation,
  SessionContext,
} from './types';
import { ChatError, SessionPersistenceError } from './types';
import { getSessionRepository, SessionRepository, getSupabaseClient } from '../supabase';
import { generateId } from '../utils';
import { getSmartRouter } from './router';
import { getGeminiRAG } from '../rag';
import {
  getAppKnowledge,
  getCapabilityHandler,
  getMetricExplainer,
} from '../knowledge';
import { getMemoryInjector } from '../memory';
import { hgcFunctions, executeFunction } from '../functions';
import { withTimeout, TIMEOUTS } from '../security/timeout';

const DEFAULT_MODEL = 'gemini-3-flash-preview';
const getSystemPrompt = () => `You are Chi, an intelligent AI assistant.

CURRENT DATE: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

Your capabilities:
- Answer questions using your knowledge base
- Search the web for current information (use Google Search for real-time data)
- Remember context from previous conversations
- Help draft messages and documents
- Navigate and explain the application

Guidelines:
- Be concise and helpful
- When using information from web search, include inline citation markers like [1], [2], [3] in the text
- Each citation number should reference a source you found
- Example: "SoftBank invested $500M in OpenAI [1] during their latest funding round [2]."
- Proactively suggest relevant actions
- Maintain context throughout the conversation

Current context will be provided with each message.

IMPORTANT: At the end of EVERY response, you MUST include a suggestions block in this exact format:
---SUGGESTIONS---
["Suggestion 1", "Suggestion 2", "Suggestion 3"]

Rules for suggestions:
- Each suggestion must be 9 words or fewer
- Include 2-4 context-aware suggestions
- Mix of follow-up questions and action phrases
- Make them specific to what the user just asked about
- Examples: "Show me client performance", "Explain this further", "Search for recent news"`;

export class ChatService {
  private genai: GoogleGenAI;
  private model: string;
  private sessionRepo: SessionRepository;
  // In-memory fallback when Supabase is unavailable
  private inMemorySessions: Map<string, ChatSession> = new Map();
  private useInMemoryFallback: boolean = false;

  constructor(apiKey: string, model?: string) {
    if (!apiKey) {
      throw new ChatError('API key is required', 'CONFIG_ERROR', false);
    }
    this.genai = new GoogleGenAI({ apiKey });
    this.model = model || DEFAULT_MODEL;

    // Initialize session repository
    try {
      this.sessionRepo = getSessionRepository();
    } catch (error) {
      console.warn('Supabase unavailable, using in-memory sessions:', error);
      this.useInMemoryFallback = true;
      this.sessionRepo = null as unknown as SessionRepository;
    }
  }

  /**
   * Send a message and stream the response
   */
  async streamMessage(
    request: ChatRequest,
    options: StreamOptions
  ): Promise<void> {
    const { message, sessionId, agencyId, userId, context, history } = request;
    const { onChunk, onComplete, onError, signal } = options;

    try {
      // Get or create session (now async for Supabase)
      const session = await this.getOrCreateSession(sessionId, agencyId, userId, context);

      // Add user message to session
      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: message,
        createdAt: new Date(),
      };
      await this.saveMessage(session, userMessage);

      // Build conversation history for context
      // Prefer frontend history if provided (has full context including upload messages)
      const conversationHistory = history && history.length > 0
        ? this.buildConversationHistoryFromRequest(history)
        : this.buildConversationHistory(session);

      // Build system prompt with context
      const systemPrompt = this.buildSystemPrompt(context);

      // Start streaming response
      const startTime = Date.now();
      let fullContent = '';
      const citations: Citation[] = [];
      let route: RouteType = 'casual';

      // Use SmartRouter for AI-powered classification
      const router = getSmartRouter();
      const routeResult = await router.route(message, {
        sessionContext: context,
      });
      route = routeResult.route;

      // Send route with confidence
      onChunk({
        type: 'route',
        route,
        routeConfidence: routeResult.confidence,
        routeReasoning: routeResult.reasoning,
      });

      // Handle self-awareness queries (capability/metric questions)
      const selfAwarenessResult = this.handleSelfAwarenessQuery(message);
      if (selfAwarenessResult) {
        fullContent = selfAwarenessResult.content;
        const suggestions = selfAwarenessResult.suggestions;

        // Stream the content in chunks for progressive display
        const chunkSize = 50;
        for (let i = 0; i < fullContent.length; i += chunkSize) {
          if (signal?.aborted) {
            throw new ChatError('Request aborted', 'ABORTED', false);
          }
          const textChunk = fullContent.slice(i, i + chunkSize);
          onChunk({ type: 'content', content: textChunk });
          await new Promise(r => setTimeout(r, 15));
        }

        // Send suggestions
        if (suggestions.length > 0) {
          onChunk({ type: 'suggestions', suggestions });
        }

        // Create and store assistant message
        const assistantMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: fullContent,
          createdAt: new Date(),
          route: 'casual', // Self-awareness is a type of casual response
          suggestions: suggestions.length > 0 ? suggestions : undefined,
          metadata: {
            latencyMs: Date.now() - startTime,
            model: 'self-knowledge',
            isSelfAwareness: true,
          },
        };
        await this.saveMessage(session, assistantMessage);

        onChunk({ type: 'done' });
        onComplete(assistantMessage);
        return;
      }

      // Handle memory route (recall queries)
      if (route === 'memory') {
        const memoryInjector = getMemoryInjector();
        const recallDetection = memoryInjector.detectRecall(message);
        const memoryInjection = await memoryInjector.injectMemories(
          recallDetection.suggestedSearchQuery,
          agencyId,
          userId
        );

        if (memoryInjection.memories.length > 0) {
          // Build response with memory context
          const memoryContext = memoryInjection.memories
            .map((m, i) => `[${i + 1}] ${m.content}`)
            .join('\n');

          // Ask Gemini to synthesize a response from memories
          const memoryPrompt = `The user is asking about a previous conversation. Based on these memories from our past conversations:

${memoryContext}

User question: "${message}"

Provide a helpful response that references our previous discussions. Be conversational and helpful.`;

          const memoryResult = await this.genai.models.generateContent({
            model: this.model,
            contents: [{ role: 'user', parts: [{ text: memoryPrompt }] }],
          });

          fullContent = memoryResult.text || 'I couldn\'t recall that specific conversation.';
        } else {
          fullContent = 'I don\'t have any memories of us discussing that topic. Would you like to tell me about it so I can remember for next time?';
        }

        // Stream the content
        const chunkSize = 50;
        for (let i = 0; i < fullContent.length; i += chunkSize) {
          if (signal?.aborted) {
            throw new ChatError('Request aborted', 'ABORTED', false);
          }
          const textChunk = fullContent.slice(i, i + chunkSize);
          onChunk({ type: 'content', content: textChunk });
          await new Promise(r => setTimeout(r, 15));
        }

        // Generate suggestions for memory responses
        const suggestions = [
          'Tell me more about that',
          'What else do you remember?',
          'Let me update you on this',
        ];
        onChunk({ type: 'suggestions', suggestions });

        // Create and store assistant message
        const assistantMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: fullContent,
          createdAt: new Date(),
          route: 'memory',
          suggestions,
          metadata: {
            latencyMs: Date.now() - startTime,
            model: this.model,
            memoriesUsed: memoryInjection.memories.length,
          },
        };
        await this.saveMessage(session, assistantMessage);

        onChunk({ type: 'done' });
        onComplete(assistantMessage);
        return;
      }

      // Handle RAG route with document search
      if (route === 'rag') {
        // Get the RAG response content from knowledge base
        const ragResult = await this.performRAGSearch(message, agencyId, context?.clientId);
        fullContent = ragResult.content;

        // Add RAG citations
        for (const ragCitation of ragResult.citations) {
          const citation: Citation = {
            index: citations.length + 1,
            title: ragCitation.documentName,
            url: ragCitation.documentId,
            source: 'rag',
            snippet: ragCitation.text,
          };
          if (!citations.find(c => c.url === citation.url)) {
            citations.push(citation);
            onChunk({ type: 'citation', citation });
          }
        }

        // Stream the content in chunks for progressive display
        const chunkSize = 50;
        for (let i = 0; i < fullContent.length; i += chunkSize) {
          if (signal?.aborted) {
            throw new ChatError('Request aborted', 'ABORTED', false);
          }
          const textChunk = fullContent.slice(i, i + chunkSize);
          onChunk({ type: 'content', content: textChunk });
          // Small delay for progressive reveal
          await new Promise(r => setTimeout(r, 20));
        }

        // Generate suggestions for RAG responses
        const suggestionsPrompt = `Based on this answer about documents: "${fullContent.slice(0, 200)}..."

Generate 3 short follow-up suggestions (max 9 words each). Format as JSON array.`;

        try {
          const suggestionsResult = await this.genai.models.generateContent({
            model: this.model,
            contents: [{ role: 'user', parts: [{ text: suggestionsPrompt }] }],
          });
          const suggestionsText = suggestionsResult.text || '';
          const suggestionsMatch = suggestionsText.match(/\[[\s\S]*?\]/);
          if (suggestionsMatch) {
            const suggestions = JSON.parse(suggestionsMatch[0]);
            if (Array.isArray(suggestions) && suggestions.length > 0) {
              onChunk({ type: 'suggestions', suggestions });
            }
          }
        } catch {
          // Suggestions are optional, continue without
        }

        // Create and store assistant message
        const assistantMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: fullContent,
          createdAt: new Date(),
          route,
          citations: citations.length > 0 ? citations : undefined,
          metadata: {
            latencyMs: Date.now() - startTime,
            model: this.model,
            isRAG: true,
          },
        };
        await this.saveMessage(session, assistantMessage);

        onChunk({ type: 'done' });
        onComplete(assistantMessage);
        return;
      }

      // Handle dashboard route with function calling
      if (route === 'dashboard') {
        const dashboardResult = await this.handleDashboardRoute(
          message,
          agencyId,
          userId,
          context,
          onChunk,
          signal
        );

        // Stream the content in chunks for progressive display
        const chunkSize = 50;
        for (let i = 0; i < dashboardResult.content.length; i += chunkSize) {
          if (signal?.aborted) {
            throw new ChatError('Request aborted', 'ABORTED', false);
          }
          const textChunk = dashboardResult.content.slice(i, i + chunkSize);
          onChunk({ type: 'content', content: textChunk });
          await new Promise(r => setTimeout(r, 15));
        }

        // Send suggestions
        if (dashboardResult.suggestions.length > 0) {
          onChunk({ type: 'suggestions', suggestions: dashboardResult.suggestions });
        }

        // Create and store assistant message
        const assistantMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: dashboardResult.content,
          createdAt: new Date(),
          route: 'dashboard',
          suggestions: dashboardResult.suggestions.length > 0 ? dashboardResult.suggestions : undefined,
          metadata: {
            latencyMs: Date.now() - startTime,
            model: this.model,
          },
        };
        await this.saveMessage(session, assistantMessage);

        onChunk({ type: 'done' });
        onComplete(assistantMessage);
        return;
      }

      // Build request config - enable Google Search for web route
      const requestConfig: {
        model: string;
        contents: Array<{ role: string; parts: Array<{ text: string }> }>;
        config?: {
          tools?: Array<{ googleSearch: Record<string, unknown> }>;
          abortSignal?: AbortSignal;
        };
      } = {
        model: this.model,
        contents: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          ...conversationHistory,
          { role: 'user', parts: [{ text: message }] },
        ],
      };

      // Enable Google Search grounding for web queries
      if (route === 'web') {
        requestConfig.config = {
          tools: [{
            googleSearch: {},
          }],
        };
      }

      // Add abort signal for request cancellation
      if (!requestConfig.config) {
        requestConfig.config = {};
      }
      if (signal) {
        requestConfig.config.abortSignal = signal;
      }

      // Stream from Gemini with timeout (2 minutes for streaming operations)
      const stream = await withTimeout(
        this.genai.models.generateContentStream(requestConfig),
        TIMEOUTS.chat,
        'Gemini streaming API'
      );

      for await (const chunk of stream) {
        // Check for abort
        if (signal?.aborted) {
          throw new ChatError('Request aborted', 'ABORTED', false);
        }

        const text = chunk.text || '';
        if (text) {
          fullContent += text;
          onChunk({ type: 'content', content: text });
        }

        // Extract citations from grounding metadata if available
        const candidates = chunk.candidates;
        if (candidates?.[0]?.groundingMetadata?.groundingChunks) {
          for (const groundingChunk of candidates[0].groundingMetadata.groundingChunks) {
            const web = groundingChunk.web;
            if (web?.uri && web?.title) {
              const citation: Citation = {
                index: citations.length + 1,
                title: web.title,
                url: web.uri,
                source: 'web',
              };
              if (!citations.find(c => c.url === citation.url)) {
                citations.push(citation);
                onChunk({ type: 'citation', citation });
              }
            }
          }
        }
      }

      // Parse and extract suggestions from response
      let suggestions: string[] = [];
      const suggestionsMatch = fullContent.match(/---SUGGESTIONS---\s*\n?\s*(\[[\s\S]*?\])/);
      if (suggestionsMatch) {
        try {
          suggestions = JSON.parse(suggestionsMatch[1]);
          // Remove suggestions block from content
          fullContent = fullContent.replace(/---SUGGESTIONS---[\s\S]*$/, '').trim();
          // Send suggestions chunk
          if (suggestions.length > 0) {
            onChunk({ type: 'suggestions', suggestions });
          }
        } catch {
          // If parsing fails, just continue without suggestions
        }
      }

      // Create assistant message
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: fullContent,
        createdAt: new Date(),
        route,
        citations: citations.length > 0 ? citations : undefined,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
        metadata: {
          latencyMs: Date.now() - startTime,
          model: this.model,
        },
      };

      // Add to session (persists to Supabase)
      await this.saveMessage(session, assistantMessage);

      // Signal completion
      onChunk({ type: 'done' });
      onComplete(assistantMessage);
    } catch (error) {
      const chatError =
        error instanceof ChatError
          ? error
          : new ChatError(
              error instanceof Error ? error.message : 'Unknown error',
              'STREAM_ERROR',
              true
            );
      onChunk({ type: 'error', error: chatError.message });
      onError(chatError);
    }
  }

  /**
   * Send a message and get a complete response (non-streaming)
   */
  async sendMessage(request: ChatRequest): Promise<ChatMessage> {
    return new Promise((resolve, reject) => {
      let result: ChatMessage | null = null;

      this.streamMessage(request, {
        onChunk: () => {},
        onComplete: (message) => {
          result = message;
        },
        onError: reject,
      }).then(() => {
        if (result) resolve(result);
        else reject(new ChatError('No response received', 'NO_RESPONSE', true));
      });
    });
  }

  /**
   * Get or create a session (async for Supabase)
   */
  async getOrCreateSession(
    sessionId: string | undefined,
    agencyId: string,
    userId: string,
    context?: SessionContext
  ): Promise<ChatSession> {
    // Try Supabase first
    if (!this.useInMemoryFallback && this.sessionRepo) {
      try {
        return await this.sessionRepo.getOrCreateSession(
          sessionId,
          agencyId,
          userId,
          context
        );
      } catch (error) {
        console.warn('Supabase session failed, falling back to memory:', error);
        // Fall through to in-memory
      }
    }

    // In-memory fallback
    if (sessionId && this.inMemorySessions.has(sessionId)) {
      const session = this.inMemorySessions.get(sessionId)!;
      if (context) {
        session.context = { ...session.context, ...context };
      }
      return session;
    }

    const newSession: ChatSession = {
      id: sessionId || generateId(),
      agencyId,
      userId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      context,
    };

    this.inMemorySessions.set(newSession.id, newSession);
    return newSession;
  }

  /**
   * Save message to session (async for Supabase)
   */
  private async saveMessage(session: ChatSession, message: ChatMessage): Promise<void> {
    // Add to in-memory session first (for streaming)
    session.messages.push(message);
    session.updatedAt = new Date();

    // Also persist to Supabase if available
    if (!this.useInMemoryFallback && this.sessionRepo) {
      try {
        await this.sessionRepo.addMessage(session, message);
      } catch (error) {
        console.warn('Failed to persist message to Supabase:', error);
        // Non-blocking - message is already in memory
      }
    }
  }

  /**
   * Get a session by ID
   */
  async getSession(sessionId: string, agencyId: string): Promise<ChatSession | undefined> {
    // Try Supabase first
    if (!this.useInMemoryFallback && this.sessionRepo) {
      try {
        const session = await this.sessionRepo.getSession(sessionId, agencyId);
        return session || undefined;
      } catch (error) {
        console.warn('Supabase getSession failed:', error);
      }
    }

    // Fallback to in-memory
    return this.inMemorySessions.get(sessionId);
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(agencyId: string, userId: string): Promise<ChatSession[]> {
    // Try Supabase first
    if (!this.useInMemoryFallback && this.sessionRepo) {
      try {
        return await this.sessionRepo.getUserSessions(agencyId, userId);
      } catch (error) {
        console.warn('Supabase getUserSessions failed:', error);
      }
    }

    // Fallback to in-memory
    return Array.from(this.inMemorySessions.values()).filter(
      (s) => s.agencyId === agencyId && s.userId === userId
    );
  }

  /**
   * Clear a session (soft delete)
   */
  async clearSession(sessionId: string, agencyId: string): Promise<boolean> {
    // Try Supabase first
    if (!this.useInMemoryFallback && this.sessionRepo) {
      try {
        return await this.sessionRepo.deleteSession(sessionId, agencyId);
      } catch (error) {
        console.warn('Supabase deleteSession failed:', error);
      }
    }

    // Fallback to in-memory
    return this.inMemorySessions.delete(sessionId);
  }

  /**
   * Build conversation history for context
   */
  private buildConversationHistory(
    session: ChatSession
  ): Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> {
    // Take last 10 messages for context window management
    const recentMessages = session.messages.slice(-10);

    return recentMessages.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));
  }

  /**
   * Build conversation history from frontend request history
   * This is preferred when available as it includes upload confirmation messages
   */
  private buildConversationHistoryFromRequest(
    history: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> {
    return history.map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));
  }

  /**
   * Build system prompt with context
   */
  private buildSystemPrompt(context?: SessionContext): string {
    let prompt = getSystemPrompt();

    if (context) {
      prompt += '\n\n--- Current Context ---';
      if (context.clientId) {
        prompt += `\nViewing client: ${context.clientName || context.clientId}`;
      }
      if (context.currentPage) {
        prompt += `\nCurrent page: ${context.currentPage}`;
      }
      if (context.recentAlerts?.length) {
        prompt += `\nRecent alerts: ${context.recentAlerts.join(', ')}`;
      }
      if (context.memories?.length) {
        prompt += `\nRelevant memories:\n${context.memories.map((m) => `- ${m}`).join('\n')}`;
      }
    }

    return prompt;
  }

  /**
   * Perform RAG search using Gemini File Search
   */
  private async performRAGSearch(
    query: string,
    agencyId: string,
    clientId?: string
  ): Promise<{
    content: string;
    citations: Array<{
      documentId: string;
      documentName: string;
      text: string;
      confidence: number;
    }>;
    isGrounded: boolean;
  }> {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new ChatError('GEMINI_API_KEY is not set', 'CONFIG_ERROR', false);
      }

      const ragService = getGeminiRAG(apiKey);

      const result = await ragService.search({
        query,
        agencyId,
        clientId,
        includeGlobal: true,
        maxDocuments: 5,
        minConfidence: 0.5,
      });

      return {
        content: result.content,
        citations: result.citations,
        isGrounded: result.isGrounded,
      };
    } catch (error) {
      // If RAG search fails, return a fallback message
      console.error('RAG search failed:', error);
      return {
        content: 'I couldn\'t search the knowledge base right now. Please try again or ask a different question.',
        citations: [],
        isGrounded: false,
      };
    }
  }

  /**
   * Handle self-awareness queries (capability and metric questions)
   * Returns null if not a self-awareness query
   */
  private handleSelfAwarenessQuery(
    query: string
  ): { content: string; suggestions: string[] } | null {
    const capabilityHandler = getCapabilityHandler();
    const metricExplainer = getMetricExplainer();
    const appKnowledge = getAppKnowledge();

    // Check for capability queries ("What can you do?", "Help me", etc.)
    if (capabilityHandler.isCapabilityQuery(query)) {
      const response = capabilityHandler.generateResponse();

      let content = `${response.greeting}\n\n`;

      // Format capabilities
      for (const category of response.categories) {
        content += `**${category.icon} ${category.name}**\n`;
        for (const cap of category.capabilities) {
          content += `- ${cap}\n`;
        }
        content += '\n';
      }

      content += '**Try asking me:**\n';
      for (const example of response.examples) {
        content += `- "${example}"\n`;
      }

      const suggestions = response.examples.slice(0, 3);

      return { content, suggestions };
    }

    // Check for metric explanation queries
    const metricPatterns = [
      /what\s+(?:is|does)\s+(\w+)\s*(?:mean|stand\s+for)?/i,
      /explain\s+(\w+)/i,
      /how\s+(?:is|do\s+you)\s+calculate\s+(\w+)/i,
      /tell\s+me\s+about\s+(\w+)/i,
      /what'?s\s+(?:a\s+good\s+)?(\w+)/i,
    ];

    for (const pattern of metricPatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        const metricName = match[1].toUpperCase();
        const explanation = metricExplainer.explain(metricName);

        if (explanation) {
          const suggestions = [
            `How can I improve ${metricName}?`,
            `What's a good ${metricName}?`,
            ...explanation.relatedMetrics.slice(0, 1).map(m => `Explain ${m}`),
          ];

          return { content: explanation.markdown, suggestions };
        }
      }
    }

    // Check for feature queries
    const featurePatterns = [
      /how\s+(?:do\s+I|does|can\s+I)\s+use\s+(?:the\s+)?(\w+)/i,
      /what\s+can\s+I\s+do\s+(?:with|in)\s+(?:the\s+)?(\w+)/i,
      /show\s+me\s+(?:the\s+)?(\w+)\s+feature/i,
    ];

    for (const pattern of featurePatterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        const featureName = match[1].toLowerCase();
        const features = appKnowledge.searchFeatures(featureName);

        if (features.length > 0) {
          const feature = features[0];
          let content = `## ${feature.name}\n\n`;
          content += `${feature.description}\n\n`;
          content += `**What you can do:**\n`;
          for (const cap of feature.capabilities) {
            content += `- ${cap}\n`;
          }
          content += `\n**Try saying:**\n`;
          for (const example of feature.examples.slice(0, 3)) {
            content += `- "${example}"\n`;
          }

          const suggestions = feature.examples.slice(0, 3);

          return { content, suggestions };
        }
      }
    }

    return null;
  }

  /**
   * Handle dashboard route with Gemini function calling
   * This enables queries like "Show me at-risk clients" to return actual data
   */
  private async handleDashboardRoute(
    message: string,
    agencyId: string,
    userId: string,
    context: SessionContext | undefined,
    onChunk: (chunk: StreamChunk) => void,
    signal?: AbortSignal
  ): Promise<{ content: string; suggestions: string[] }> {
    const dashboardSystemPrompt = `You are Chi, an AI assistant for a marketing agency management platform.

You have access to the following functions to query and interact with the platform:
- get_clients: List clients with optional filters (stage, health_status)
- get_client_details: Get detailed info about a specific client
- get_alerts: List alerts with optional filters (severity, status, type)
- get_recent_communications: Get recent communications for a client
- get_agency_stats: Get agency-wide statistics
- navigate_to: Navigate to a page in the application

When the user asks about clients, alerts, statistics, or wants to navigate:
1. Call the appropriate function(s) to get the data
2. Analyze the results
3. Provide a clear, helpful summary

Always be concise and actionable. If something requires attention, highlight it.

IMPORTANT: At the end of EVERY response, you MUST include a suggestions block:
---SUGGESTIONS---
["Suggestion 1", "Suggestion 2", "Suggestion 3"]

Make suggestions specific to the data you just showed.`;

    // Retry helper with exponential backoff
    const callWithRetry = async <T>(
      fn: () => Promise<T>,
      maxRetries = 3,
      baseDelayMs = 1000
    ): Promise<T> => {
      let lastError: Error | null = null;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          return await fn();
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          if (attempt < maxRetries - 1) {
            const delay = baseDelayMs * Math.pow(2, attempt);
            console.warn(`[Dashboard] Retry ${attempt + 1}/${maxRetries} after ${delay}ms:`, lastError.message);
            await new Promise(r => setTimeout(r, delay));
          }
        }
      }
      throw lastError;
    };

    try {
      // Build the request with function declarations (with retry)
      const response = await callWithRetry(() => this.genai.models.generateContent({
        model: this.model,
        contents: [
          { role: 'user', parts: [{ text: dashboardSystemPrompt }] },
          { role: 'user', parts: [{ text: message }] },
        ],
        config: {
          tools: [{
            functionDeclarations: hgcFunctions,
          }],
        },
      }));

      // Check for function calls
      const candidate = response.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      // Process function calls
      const functionResults: Array<{ name: string; result: unknown }> = [];

      for (const part of parts) {
        if (part.functionCall) {
          const functionName = part.functionCall.name;
          const functionArgs = part.functionCall.args;

          // Skip if no function name
          if (!functionName) {
            continue;
          }

          // Emit function_call event
          onChunk({
            type: 'function_call',
            functionName,
            functionArgs: functionArgs as Record<string, unknown>,
          });

          // Check for abort
          if (signal?.aborted) {
            throw new ChatError('Request aborted', 'ABORTED', false);
          }

          try {
            // Execute the function with Supabase client for real data
            let supabase;
            try {
              supabase = getSupabaseClient();
            } catch {
              // Supabase not configured - will use mock data fallback
            }

            const result = await executeFunction(
              functionName,
              { agencyId, userId, supabase },
              (functionArgs || {}) as Record<string, unknown>
            );

            functionResults.push({ name: functionName, result });

            // Emit function_result event
            onChunk({
              type: 'function_result',
              functionName,
              functionSuccess: true,
              functionSummary: this.summarizeFunctionResult(functionName, result),
            });
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Function ${functionName} failed:`, error);

            // Push error result so Gemini knows this function failed
            // This prevents Gemini from hallucinating data from failed functions
            functionResults.push({
              name: functionName,
              result: {
                error: true,
                message: errorMessage,
                functionName,
              },
            });

            onChunk({
              type: 'function_result',
              functionName,
              functionSuccess: false,
              functionSummary: `Error: ${errorMessage}`,
            });
          }
        }
      }

      // If we got function calls, send results back to Gemini for final response
      if (functionResults.length > 0) {
        const functionResponseContent = functionResults
          .map(fr => `Function ${fr.name} returned:\n${JSON.stringify(fr.result, null, 2)}`)
          .join('\n\n');

        const finalResponse = await this.genai.models.generateContent({
          model: this.model,
          contents: [
            { role: 'user', parts: [{ text: dashboardSystemPrompt }] },
            { role: 'user', parts: [{ text: message }] },
            { role: 'model', parts: [{ text: `I called the necessary functions. Here are the results:\n\n${functionResponseContent}` }] },
            { role: 'user', parts: [{ text: 'Please provide a clear, helpful summary of this data for the user. Include the suggestions block at the end.' }] },
          ],
        });

        const finalText = finalResponse.text || '';
        return this.parseDashboardResponse(finalText);
      }

      // If no function calls, return the direct response
      const directText = response.text || '';
      if (directText) {
        return this.parseDashboardResponse(directText);
      }

      // Fallback
      return {
        content: 'I understand you want to see dashboard information. Could you be more specific about what data you\'d like to see? For example:\n\n- "Show me at-risk clients"\n- "What are my open alerts?"\n- "Give me agency statistics for this week"',
        suggestions: [
          'Show at-risk clients',
          'List open alerts',
          'Agency statistics this week',
        ],
      };
    } catch (error) {
      console.error('Dashboard route error:', error);
      throw new ChatError(
        error instanceof Error ? error.message : 'Dashboard query failed',
        'DASHBOARD_ERROR',
        true
      );
    }
  }

  /**
   * Parse dashboard response and extract suggestions
   */
  private parseDashboardResponse(text: string): { content: string; suggestions: string[] } {
    let content = text;
    let suggestions: string[] = [];

    const suggestionsMatch = text.match(/---SUGGESTIONS---\s*\n?\s*(\[[\s\S]*?\])/);
    if (suggestionsMatch) {
      try {
        suggestions = JSON.parse(suggestionsMatch[1]);
        content = text.replace(/---SUGGESTIONS---[\s\S]*$/, '').trim();
      } catch {
        // If parsing fails, continue without suggestions
      }
    }

    // Default suggestions if none parsed
    if (suggestions.length === 0) {
      suggestions = [
        'Show more details',
        'View related alerts',
        'Navigate to dashboard',
      ];
    }

    return { content, suggestions };
  }

  /**
   * Summarize function result for streaming feedback
   */
  private summarizeFunctionResult(name: string, result: unknown): string {
    if (Array.isArray(result)) {
      return `Found ${result.length} ${name.replace('get_', '').replace(/_/g, ' ')}`;
    }
    if (typeof result === 'object' && result !== null) {
      if ('url' in result) {
        return `Navigation ready: ${(result as { url: string }).url}`;
      }
      return `Retrieved ${name.replace('get_', '').replace(/_/g, ' ')} data`;
    }
    return `Completed ${name}`;
  }

}

/**
 * Singleton instance
 */
let serviceInstance: ChatService | null = null;

export function getChatService(): ChatService {
  if (!serviceInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ChatError('GEMINI_API_KEY is not set', 'CONFIG_ERROR', false);
    }
    serviceInstance = new ChatService(apiKey);
  }
  return serviceInstance;
}

export function resetChatService(): void {
  serviceInstance = null;
}
