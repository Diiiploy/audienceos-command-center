/**
 * Chat Service
 *
 * Main orchestrator for chat interactions with Gemini.
 * Handles routing and responses.
 *
 * Ported from Holy Grail Chat (HGC) with 9.5/10 confidence.
 * Part of: 3-System Consolidation
 */

import { routeQuery } from './router';
import { hgcFunctions, executeFunction } from './functions';
import { withTimeout } from '@/lib/security';
import { getGeminiRAG } from '@/lib/rag';
import { getMemoryInjector } from '@/lib/memory';
import type {
  ChatMessage,
  ChatServiceConfig,
  FunctionCall,
} from './types';

const DEFAULT_MODEL = 'gemini-2.0-flash-001';
const GEMINI_TIMEOUT_MS = 30000; // 30 second timeout for AI requests

/**
 * Generate unique ID
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Dashboard system prompt for function calling
 */
const DASHBOARD_SYSTEM_PROMPT = `You are Chi, an AI assistant for a marketing agency management platform.

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

Always be concise and actionable. If something requires attention, highlight it.`;

/**
 * Chat Service class
 */
export class ChatService {
  private config: ChatServiceConfig;

  constructor(config: ChatServiceConfig) {
    this.config = config;
  }

  /**
   * Process a chat message and return a response
   */
  async processMessage(
    userMessage: string,
    history: ChatMessage[]
  ): Promise<ChatMessage> {
    const startTime = Date.now();

    // 1. Route the query
    const decision = await routeQuery(userMessage, this.config.geminiApiKey);

    // 2. Handle based on route
    let response: string;
    let functionCalls: FunctionCall[] | undefined;

    switch (decision.route) {
      case 'dashboard': {
        const dashResult = await this.handleDashboardRoute(userMessage);
        response = dashResult.response;
        functionCalls = dashResult.functionCalls;
        break;
      }

      case 'rag': {
        // RAG route - search knowledge base documents
        const ragResult = await this.handleRAGRoute(userMessage);
        response = ragResult;
        break;
      }

      case 'web': {
        // Web search route - uses Google Search Grounding
        const webResult = await this.handleWebRoute(userMessage, history);
        response = webResult;
        break;
      }

      case 'memory': {
        // Memory route - recall from cross-session memory
        const memoryResult = await this.handleMemoryRoute(userMessage);
        response = memoryResult;
        break;
      }

      case 'casual':
      default:
        response = await this.handleCasualRoute(userMessage, history);
        break;
    }

    return {
      id: generateId(),
      role: 'assistant',
      content: response,
      timestamp: new Date(),
      route: decision.route,
      metadata: {
        latencyMs: Date.now() - startTime,
        model: DEFAULT_MODEL,
        functionCalls,
      },
    };
  }

  /**
   * Handle dashboard route with function calling
   */
  private async handleDashboardRoute(
    message: string
  ): Promise<{ response: string; functionCalls?: FunctionCall[] }> {
    try {
      // Call Gemini with function declarations (with timeout)
      const response = await withTimeout(
        fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${this.config.geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                { role: 'user', parts: [{ text: DASHBOARD_SYSTEM_PROMPT }] },
                { role: 'user', parts: [{ text: message }] },
              ],
              tools: [{ functionDeclarations: hgcFunctions }],
            }),
          }
        ),
        GEMINI_TIMEOUT_MS,
        'AI request timed out'
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      // Process function calls
      const functionResults: Array<{ name: string; result: unknown }> = [];
      const functionCalls: FunctionCall[] = [];

      for (const part of parts) {
        if (part.functionCall) {
          const functionName = part.functionCall.name;
          const functionArgs = part.functionCall.args || {};

          try {
            const result = await executeFunction(
              functionName,
              { agencyId: this.config.agencyId, userId: this.config.userId },
              functionArgs
            );

            functionResults.push({ name: functionName, result });
            functionCalls.push({
              name: functionName,
              args: functionArgs,
              result,
              success: true,
            });
          } catch {
            functionCalls.push({
              name: functionName,
              args: functionArgs,
              success: false,
            });
          }
        }
      }

      // If we got function calls, get a final summary from Gemini
      if (functionResults.length > 0) {
        const functionResponseContent = functionResults
          .map((fr) => `Function ${fr.name} returned:\n${JSON.stringify(fr.result, null, 2)}`)
          .join('\n\n');

        const finalResponse = await withTimeout(
          fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${this.config.geminiApiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  { role: 'user', parts: [{ text: DASHBOARD_SYSTEM_PROMPT }] },
                  { role: 'user', parts: [{ text: message }] },
                  {
                    role: 'model',
                    parts: [{ text: `I called the necessary functions. Here are the results:\n\n${functionResponseContent}` }],
                  },
                  {
                    role: 'user',
                    parts: [{ text: 'Please provide a clear, helpful summary of this data for the user.' }],
                  },
                ],
              }),
            }
          ),
          GEMINI_TIMEOUT_MS,
          'AI request timed out'
        );

        if (!finalResponse.ok) {
          const errorData = await finalResponse.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `Gemini API error: ${finalResponse.status}`);
        }

        const finalData = await finalResponse.json();
        const finalText = finalData.candidates?.[0]?.content?.parts?.[0]?.text || '';

        return { response: finalText, functionCalls };
      }

      // If no function calls, return direct response
      const directText = parts.find((p: { text?: string }) => p.text)?.text || '';
      if (directText) {
        return { response: directText };
      }

      return {
        response:
          'I understand you want to see dashboard information. Could you be more specific? Try:\n\n- "Show me at-risk clients"\n- "What are my open alerts?"\n- "Give me agency statistics"',
      };
    } catch {
      return {
        response: 'Sorry, I had trouble processing that request. Please try again.',
      };
    }
  }

  /**
   * Handle casual/general conversation
   */
  private async handleCasualRoute(
    message: string,
    history: ChatMessage[]
  ): Promise<string> {
    const systemPrompt = `You are Chi, a helpful AI assistant for a marketing agency management platform.
Be concise, friendly, and helpful. If the user asks about clients, alerts, or data, suggest they ask more specifically.`;

    // Build conversation history
    const conversationHistory = history.slice(-10).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    try {
      const response = await withTimeout(
        fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${this.config.geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                { role: 'user', parts: [{ text: systemPrompt }] },
                ...conversationHistory,
                { role: 'user', parts: [{ text: message }] },
              ],
            }),
          }
        ),
        GEMINI_TIMEOUT_MS,
        'AI request timed out'
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm not sure how to respond to that.";
    } catch {
      return 'Sorry, I had trouble processing that. Please try again.';
    }
  }

  /**
   * Handle RAG route - search knowledge base documents
   */
  private async handleRAGRoute(message: string): Promise<string> {
    try {
      const ragService = getGeminiRAG(this.config.geminiApiKey);
      const result = await ragService.search({
        query: message,
        agencyId: this.config.agencyId,
      });

      if (result.error) {
        return `I couldn't search the knowledge base: ${result.error}. Please try again.`;
      }

      if (!result.content || result.content.trim() === '') {
        return "I searched the knowledge base but couldn't find relevant information. Try rephrasing your question or check if documents have been uploaded.";
      }

      // Format response with citations if available
      let response = result.content;
      if (result.citations && result.citations.length > 0) {
        response += '\n\n**Sources:**\n';
        result.citations.forEach((citation, index) => {
          response += `[${index + 1}] ${citation.documentName}`;
          if (citation.pageNumber) {
            response += ` (page ${citation.pageNumber})`;
          }
          response += '\n';
        });
      }

      return response;
    } catch {
      return "Sorry, I had trouble searching the knowledge base. Please try again.";
    }
  }

  /**
   * Handle Web search route - uses Google Search Grounding
   */
  private async handleWebRoute(message: string, history: ChatMessage[]): Promise<string> {
    const systemPrompt = `You are Chi, a helpful AI assistant. The user is asking about current events, news, or information that may require web search.
Provide accurate, up-to-date information based on search results. Include relevant citations when available.`;

    // Build conversation history
    const conversationHistory = history.slice(-5).map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    try {
      const response = await withTimeout(
        fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${this.config.geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                { role: 'user', parts: [{ text: systemPrompt }] },
                ...conversationHistory,
                { role: 'user', parts: [{ text: message }] },
              ],
              tools: [{ googleSearch: {} }],
            }),
          }
        ),
        GEMINI_TIMEOUT_MS,
        'Web search timed out'
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      // Extract grounding citations if available
      const groundingMetadata = data.candidates?.[0]?.groundingMetadata;
      if (groundingMetadata?.groundingChunks && groundingMetadata.groundingChunks.length > 0) {
        let citationsText = '\n\n**Sources:**\n';
        const seen = new Set<string>();
        groundingMetadata.groundingChunks.forEach((chunk: { web?: { uri?: string; title?: string } }, index: number) => {
          if (chunk.web?.uri && chunk.web?.title && !seen.has(chunk.web.uri)) {
            seen.add(chunk.web.uri);
            citationsText += `[${index + 1}] [${chunk.web.title}](${chunk.web.uri})\n`;
          }
        });
        return text + citationsText;
      }

      return text || "I searched the web but couldn't find specific information. Try asking a more specific question.";
    } catch {
      return "Sorry, I had trouble searching the web. Please try again.";
    }
  }

  /**
   * Handle Memory route - recall from cross-session memory (Mem0)
   */
  private async handleMemoryRoute(message: string): Promise<string> {
    try {
      const memoryInjector = getMemoryInjector();
      const recallDetection = memoryInjector.detectRecall(message);
      const memoryInjection = await memoryInjector.injectMemories(
        recallDetection.suggestedSearchQuery || message,
        this.config.agencyId,
        this.config.userId
      );

      if (memoryInjection.memories.length === 0) {
        return "I don't have any memories of us discussing that topic. Would you like to tell me about it so I can remember for next time?";
      }

      // Build response with memory context
      const memoryContext = memoryInjection.memories
        .map((m, i) => `[${i + 1}] ${m.content}`)
        .join('\n');

      // Ask Gemini to synthesize a response from memories
      const memoryPrompt = `The user is asking about a previous conversation. Based on these memories from our past conversations:

${memoryContext}

User question: "${message}"

Provide a helpful response that references our previous discussions. Be conversational and helpful.`;

      const response = await withTimeout(
        fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_MODEL}:generateContent?key=${this.config.geminiApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: memoryPrompt }] }],
            }),
          }
        ),
        GEMINI_TIMEOUT_MS,
        'Memory recall timed out'
      );

      if (!response.ok) {
        throw new Error('Failed to process memories');
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "I found some memories but had trouble summarizing them.";
    } catch {
      return "Sorry, I had trouble recalling our previous conversations. Please try again.";
    }
  }
}
