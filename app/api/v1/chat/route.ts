import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getSmartRouter } from '@/lib/chat/router';
import { executeFunction, hgcFunctions } from '@/lib/chat/functions';
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission';
import type { Citation } from '@/lib/chat/types';

// CRITICAL: Gemini 3 ONLY per project requirements
const GEMINI_MODEL = 'gemini-3-flash-preview';

/**
 * Chat API v1 - AudienceOS Chat
 *
 * Ported from Holy Grail Chat (HGC) with adaptations for AudienceOS.
 * Uses SmartRouter for intent classification and Gemini for responses.
 *
 * RBAC: Requires ai-features:write permission
 */
export const POST = withPermission({ resource: 'ai-features', action: 'write' })(
  async (request: AuthenticatedRequest) => {
  try {
    // 1. Parse request body
    const body = await request.json();
    const { message, sessionId, agencyId, userId, stream = false } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // 2. Get API key
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      console.error('[Chat API] GOOGLE_AI_API_KEY not configured');
      return NextResponse.json(
        { error: 'Chat service not configured' },
        { status: 500 }
      );
    }

    // 3. Classify query with SmartRouter
    let route = 'casual';
    let routeConfidence = 1.0;
    try {
      const router = getSmartRouter();
      const classification = await router.classifyQuery(message);
      route = classification.route;
      routeConfidence = classification.confidence;
      console.log(`[Chat API] Route: ${route} (confidence: ${routeConfidence})`);
    } catch (routerError) {
      console.warn('[Chat API] Router failed, using casual route:', routerError);
    }

    // 4. Handle based on route
    let responseContent: string;
    let functionCalls: Array<{ name: string; result: unknown }> = [];
    let citations: Citation[] = [];

    if (route === 'dashboard') {
      // Use function calling for dashboard queries
      responseContent = await handleDashboardRoute(apiKey, message, agencyId, userId, functionCalls);
    } else {
      // Use basic Gemini response for other routes (may include web grounding citations)
      responseContent = await handleCasualRoute(apiKey, message, route, citations);
    }

    // 5. Return response (streaming or JSON)
    if (stream === true) {
      // PHASE 1: SSE Streaming Support (backwards compatible)
      const encoder = new TextEncoder();

      const readable = new ReadableStream({
        async start(controller) {
          try {
            // Send initial metadata
            const metadata = JSON.stringify({
              type: 'metadata',
              route,
              routeConfidence,
              sessionId: sessionId || `session-${Date.now()}`,
            });
            controller.enqueue(encoder.encode(`data: ${metadata}\n\n`));

            // Stream content in chunks (simulate streaming for now - Phase 2 will add real streaming)
            const chunkSize = 50;
            for (let i = 0; i < responseContent.length; i += chunkSize) {
              const chunk = responseContent.slice(i, i + chunkSize);
              const chunkData = JSON.stringify({
                type: 'content',
                content: chunk,
              });
              controller.enqueue(encoder.encode(`data: ${chunkData}\n\n`));

              // Small delay to simulate streaming
              await new Promise(resolve => setTimeout(resolve, 20));
            }

            // Send completion
            const completeData = JSON.stringify({
              type: 'complete',
              message: {
                id: `msg-${Date.now()}`,
                role: 'assistant',
                content: responseContent,
                timestamp: new Date().toISOString(),
                route,
                routeConfidence,
                functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
                citations: citations.length > 0 ? citations : [],
              },
            });
            controller.enqueue(encoder.encode(`data: ${completeData}\n\n`));
            controller.close();
          } catch (error) {
            const errorData = JSON.stringify({
              type: 'error',
              error: error instanceof Error ? error.message : 'Streaming failed',
            });
            controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
            controller.close();
          }
        },
      });

      return new NextResponse(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    } else {
      // Existing JSON response (unchanged - Phase 1 backwards compatibility)
      return NextResponse.json({
        message: {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: responseContent,
          timestamp: new Date().toISOString(),
          route,
          routeConfidence,
          functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
          citations: citations.length > 0 ? citations : [],
        },
        sessionId: sessionId || `session-${Date.now()}`,
      });
    }

  } catch (error) {
    console.error('[Chat API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chat failed' },
      { status: 500 }
    );
  }
  }
);

/**
 * Handle dashboard route with function calling
 */
async function handleDashboardRoute(
  apiKey: string,
  message: string,
  agencyId: string | undefined,
  userId: string | undefined,
  functionCallsLog: Array<{ name: string; result: unknown }>
): Promise<string> {
  const genai = new GoogleGenAI({ apiKey });

  // Create function declarations for Gemini
  // Using type assertion because HGC function schemas are compatible but TypeScript is strict
  const functionDeclarations = hgcFunctions.map(fn => ({
    name: fn.name,
    description: fn.description,
    parameters: fn.parameters,
  })) as unknown as Array<{name: string; description: string; parameters?: object}>;

  // First call: Let Gemini decide which function to call
  const response = await genai.models.generateContent({
    model: GEMINI_MODEL,
    contents: message,
    config: {
      temperature: 0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: [{ functionDeclarations }] as any,
    },
  });

  // Check if Gemini wants to call a function
  const candidate = response.candidates?.[0];
  const parts = candidate?.content?.parts || [];

  for (const part of parts) {
    if (part.functionCall) {
      const functionName = part.functionCall.name;
      const args = part.functionCall.args;

      if (!functionName) {
        console.warn('[Chat API] Function call without name, skipping');
        continue;
      }

      console.log(`[Chat API] Function call: ${functionName}`, args);

      // Execute the function
      try {
        const result = await executeFunction(functionName, {
          agencyId: agencyId || 'demo-agency',
          userId: userId || 'demo-user',
        }, args || {});

        functionCallsLog.push({ name: functionName, result });

        // Second call: Let Gemini interpret the result
        const interpretResponse = await genai.models.generateContent({
          model: GEMINI_MODEL,
          contents: `User asked: "${message}"

Function ${functionName} was called and returned:
${JSON.stringify(result, null, 2)}

Please provide a helpful, natural language summary of this data for the user.`,
          config: { temperature: 0.7 },
        });

        return interpretResponse.candidates?.[0]?.content?.parts?.[0]?.text ||
          `I found the data you requested. ${JSON.stringify(result).substring(0, 200)}...`;
      } catch (execError) {
        console.error(`[Chat API] Function execution failed:`, execError);
        return `I tried to get that information but encountered an error. Please try again.`;
      }
    }
  }

  // No function call, return text response
  return parts[0]?.text || "I can help you with client information, alerts, and navigation. What would you like to know?";
}

/**
 * Handle casual/rag/web/memory routes with basic Gemini response
 * Extracts citations from grounding metadata when available
 */
async function handleCasualRoute(
  apiKey: string,
  message: string,
  route: string,
  citations: Citation[]
): Promise<string> {
  const genai = new GoogleGenAI({ apiKey });

  const systemPrompt = `You are an AI assistant for AudienceOS Command Center.
You help agency teams manage their clients, view performance data, and navigate the app.

When using information from web search, include inline citation markers like [1], [2], [3] in the text.
Each citation number should reference a source you found.
Example: "Google Ads typically has higher CTR [1] than Meta Ads in search campaigns [2]."

Be concise and helpful. This query was classified as: ${route}`;

  // Build request config
  const requestConfig: any = {
    model: GEMINI_MODEL,
    contents: `${systemPrompt}\n\nUser: ${message}`,
    config: { temperature: 0.7 },
  };

  // Enable Google Search grounding for web queries (provides citations)
  if (route === 'web') {
    requestConfig.config.tools = [{
      googleSearch: {},
    }];
  }

  const response = await genai.models.generateContent(requestConfig);

  // Extract citations from grounding metadata if available
  const candidate = response.candidates?.[0];
  if (candidate?.groundingMetadata?.groundingChunks) {
    for (const groundingChunk of candidate.groundingMetadata.groundingChunks) {
      const web = groundingChunk.web;
      if (web?.uri && web?.title) {
        const citation: Citation = {
          index: citations.length + 1,
          title: web.title,
          url: web.uri,
          source: 'web',
        };
        // Avoid duplicates
        if (!citations.find(c => c.url === citation.url)) {
          citations.push(citation);
        }
      }
    }
  }

  // Get response text
  let responseText = candidate?.content?.parts?.[0]?.text ||
    "I'm here to help! You can ask me about clients, performance metrics, or app features.";

  // Debug: Log what we received from Gemini
  console.log('[Citation Debug] Raw response:', {
    hasGroundingMetadata: !!candidate?.groundingMetadata,
    hasGroundingSupports: !!candidate?.groundingMetadata?.groundingSupports,
    supportsLength: candidate?.groundingMetadata?.groundingSupports?.length || 0,
    citationsLength: citations.length,
    textSample: responseText.substring(0, 200),
    textHasDecimalMarkers: /\[\d+\.\d+(?:,\s*\d+\.\d+)*\]/.test(responseText),
    decimalMarkersSample: responseText.match(/\[\d+\.\d+(?:,\s*\d+\.\d+)*\]/g)?.slice(0, 3),
  });

  // DEPLOYMENT VERIFICATION: Log at start of processing
  console.log('[=== CITATION PROCESSING START ===]', {
    timestamp: new Date().toISOString(),
    route: route,
    textLengthBefore: responseText.length,
  });

  // Strip Gemini's decimal notation markers if present
  // Gemini uses formats like [1.1], [1.7] or comma-separated [1.1, 1.7]
  // These interfere with our clean [1][2][3] format
  const hasDecimalMarkers = /\[\d+\.\d+(?:,\s*\d+\.\d+)*\]/.test(responseText);
  console.log('[DEPLOY CHECK] Regex test for decimal markers:', {
    pattern: '/[\\d+\\.\\d+(?:,\\s*\\d+\\.\\d+)*]/',
    hasMatch: hasDecimalMarkers,
    decimalMarkersFound: responseText.match(/\[\d+\.\d+(?:,\s*\d+\.\d+)*\]/g) || [],
    textSample: responseText.substring(0, 150),
  });

  if (hasDecimalMarkers) {
    const textBefore = responseText;
    console.log('[CITATION STRIPPING] BEFORE - Contains decimal markers:', {
      count: (textBefore.match(/\[\d+\.\d+(?:,\s*\d+\.\d+)*\]/g) || []).length,
      examples: textBefore.match(/\[\d+\.\d+(?:,\s*\d+\.\d+)*\]/g)?.slice(0, 5),
    });
    // Strip both single [1.1] and comma-separated [1.1, 1.7] formats
    responseText = responseText.replace(/\[\d+\.\d+(?:,\s*\d+\.\d+)*\]/g, '');
    console.log('[CITATION STRIPPING] AFTER - Decimal markers removed:', {
      textLengthDifference: textBefore.length - responseText.length,
      hasDecimalMarkersAfter: /\[\d+\.\d+(?:,\s*\d+\.\d+)*\]/.test(responseText),
      textSample: responseText.substring(0, 150),
    });
  } else {
    console.log('[CITATION STRIPPING] SKIPPED - No decimal markers found in response');
  }

  // Insert inline citation markers based on groundingSupports
  // This is what HGC does - Gemini doesn't add [1][2] markers automatically
  console.log('[CITATION INSERTION] Condition check:', {
    hasGroundingSupports: !!candidate?.groundingMetadata?.groundingSupports,
    groundingSupportsCount: candidate?.groundingMetadata?.groundingSupports?.length || 0,
    citationsCount: citations.length,
    willInsert: !!(candidate?.groundingMetadata?.groundingSupports && citations.length > 0),
  });

  if (candidate?.groundingMetadata?.groundingSupports && citations.length > 0) {
    const supports = candidate.groundingMetadata.groundingSupports;
    const textBeforeInsertion = responseText;

    console.log('[CITATION INSERTION] BEFORE:', {
      citationsCount: citations.length,
      citations: citations.map(c => ({index: c.index, title: c.title, url: c.url})),
      supportsCount: supports.length,
      textLength: textBeforeInsertion.length,
      hasDecimalMarkers: /\[\d+\.\d+(?:,\s*\d+\.\d+)*\]/.test(textBeforeInsertion),
      hasIntegerMarkers: /\[\d+\]/.test(textBeforeInsertion),
      textSample: textBeforeInsertion.substring(0, 200),
    });

    responseText = insertInlineCitations(
      responseText,
      supports,
      citations
    );

    console.log('[CITATION INSERTION] AFTER:', {
      textLengthAfter: responseText.length,
      insertionsDone: responseText.length !== textBeforeInsertion.length,
      hasIntegerMarkers: /\[\d+\]/.test(responseText),
      integerMarkersCount: (responseText.match(/\[\d+\]/g) || []).length,
      hasDecimalMarkers: /\[\d+\.\d+(?:,\s*\d+\.\d+)*\]/.test(responseText),
      textSample: responseText.substring(0, 200),
    });
  } else {
    console.log('[CITATION INSERTION] SKIPPED:', {
      reason: !candidate?.groundingMetadata?.groundingSupports
        ? 'no groundingSupports in metadata'
        : 'no citations array',
      groundingSupportsPresent: !!candidate?.groundingMetadata?.groundingSupports,
      citationsPresent: citations.length > 0,
    });
  }

  // DEPLOYMENT VERIFICATION: Final check before returning
  console.log('[=== CITATION PROCESSING COMPLETE ===]', {
    textLengthAfter: responseText.length,
    hasIntegerMarkers: /\[\d+\]/.test(responseText),
    hasDecimalMarkers: /\[\d+\.\d+(?:,\s*\d+\.\d+)*\]/.test(responseText),
    citationsInResponse: citations.length,
    textSample: responseText.substring(0, 150),
  });

  return responseText;
}

/**
 * Insert [1][2][3] citation markers into text based on groundingSupports
 * FIXED: Insert after word boundaries to avoid breaking words mid-sentence
 * Ported from HGC citation-extractor.ts
 */
function insertInlineCitations(
  text: string,
  supports: Array<{
    segment?: { startIndex?: number; endIndex?: number; text?: string };
    groundingChunkIndices?: number[];
    confidenceScores?: number[];
  }>,
  citations: Citation[]
): string {
  // Sort supports by end index (descending) to insert from end to beginning
  // This prevents index shifts as we insert markers
  const sortedSupports = [...supports]
    .filter((s) => s.segment?.endIndex !== undefined)
    .sort((a, b) => (b.segment?.endIndex || 0) - (a.segment?.endIndex || 0));

  let result = text;

  for (const support of sortedSupports) {
    let endIndex = support.segment?.endIndex;
    const chunkIndices = support.groundingChunkIndices || [];

    if (endIndex !== undefined && chunkIndices.length > 0) {
      // Get citation markers for this segment (e.g., "[1][2]")
      const markers = chunkIndices
        .map((idx) => citations[idx] ? `[${citations[idx].index}]` : '')
        .filter(Boolean)
        .join('');

      if (markers && endIndex <= result.length) {
        // Adjust insertion point to after the next word boundary
        // This prevents breaking words mid-word (e.g., "Ads[1] not" instead of "Ads [1]not")
        let adjustedIndex = endIndex;

        // If we're in the middle of a word, move to the next space or punctuation
        while (adjustedIndex < result.length && /[a-zA-Z0-9]/.test(result[adjustedIndex])) {
          adjustedIndex++;
        }

        // If we couldn't find a word boundary (e.g., at end of text), add a space before marker
        if (adjustedIndex !== endIndex && adjustedIndex < result.length) {
          // Found next word boundary, insert after it
          result = result.substring(0, adjustedIndex) + markers + result.substring(adjustedIndex);
        } else if (adjustedIndex === result.length) {
          // At end of text, just append
          result = result + ' ' + markers;
        } else {
          // In middle of word, use original index
          result = result.substring(0, endIndex) + markers + result.substring(endIndex);
        }
      }
    }
  }

  return result;
}

/**
 * Health check endpoint
 * RBAC: Requires analytics:read permission
 */
export const GET = withPermission({ resource: 'analytics', action: 'read' })(
  async () => {
  const hasApiKey = !!process.env.GOOGLE_AI_API_KEY;

  return NextResponse.json({
    status: hasApiKey ? 'ready' : 'misconfigured',
    hasApiKey,
    timestamp: new Date().toISOString(),
  });
  }
);
