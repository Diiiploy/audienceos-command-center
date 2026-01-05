import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getSmartRouter } from '@/lib/chat/router';
import { executeFunction, hgcFunctions } from '@/lib/chat/functions';

// CRITICAL: Gemini 3 ONLY per project requirements
const GEMINI_MODEL = 'gemini-3-flash-preview';

/**
 * Chat API v1 - AudienceOS Chat
 *
 * Ported from Holy Grail Chat (HGC) with adaptations for AudienceOS.
 * Uses SmartRouter for intent classification and Gemini for responses.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    const body = await request.json();
    const { message, sessionId, agencyId, userId } = body;

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

    if (route === 'dashboard') {
      // Use function calling for dashboard queries
      responseContent = await handleDashboardRoute(apiKey, message, agencyId, userId, functionCalls);
    } else {
      // Use basic Gemini response for other routes
      responseContent = await handleCasualRoute(apiKey, message, route);
    }

    // 5. Return response
    return NextResponse.json({
      message: {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: responseContent,
        timestamp: new Date().toISOString(),
        route,
        routeConfidence,
        functionCalls: functionCalls.length > 0 ? functionCalls : undefined,
        citations: [],
      },
      sessionId: sessionId || `session-${Date.now()}`,
    });

  } catch (error) {
    console.error('[Chat API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chat failed' },
      { status: 500 }
    );
  }
}

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
 */
async function handleCasualRoute(
  apiKey: string,
  message: string,
  route: string
): Promise<string> {
  const genai = new GoogleGenAI({ apiKey });

  const systemPrompt = `You are an AI assistant for AudienceOS Command Center.
You help agency teams manage their clients, view performance data, and navigate the app.
Be concise and helpful. This query was classified as: ${route}`;

  const response = await genai.models.generateContent({
    model: GEMINI_MODEL,
    contents: `${systemPrompt}\n\nUser: ${message}`,
    config: { temperature: 0.7 },
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.text ||
    "I'm here to help! You can ask me about clients, performance metrics, or app features.";
}

/**
 * Health check endpoint
 */
export async function GET() {
  const hasApiKey = !!process.env.GOOGLE_AI_API_KEY;

  return NextResponse.json({
    status: hasApiKey ? 'ready' : 'misconfigured',
    hasApiKey,
    timestamp: new Date().toISOString(),
  });
}
