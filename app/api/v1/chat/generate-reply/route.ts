import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { GoogleGenAI } from '@google/genai';
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission';
import { createRouteHandlerClient } from '@/lib/supabase';
import { checkRateLimitDistributed } from '@/lib/security';
import {
  loadCartridgeContext,
  generateCartridgeContextPrompt,
} from '@/lib/chat/context';

const GEMINI_MODEL = 'gemini-3-flash-preview';
const DRAFT_RATE_LIMIT = { maxRequests: 10, windowMs: 60000 };

/**
 * Retry wrapper for Gemini API calls.
 * Preview models have restrictive rate limits — retry once after 1s on failure.
 */
async function callGeminiWithRetry<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  try {
    return await fn();
  } catch (firstError) {
    const errMsg = firstError instanceof Error ? firstError.message : String(firstError);
    console.warn(`[GenerateReply] ${label} first attempt failed: ${errMsg} — retrying in 1s`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return await fn();
  }
}

/**
 * POST /api/v1/chat/generate-reply
 *
 * Generates an AI-drafted reply to a client message using the user's voice settings.
 * Voice settings are loaded from user.preferences.ai.voice via the cartridge loader.
 *
 * RBAC: Requires ai-features:write permission
 */
export const POST = withPermission({ resource: 'ai-features', action: 'write' })(
  async (request: AuthenticatedRequest) => {
    try {
      const agencyId = request.user.agencyId;
      const userId = request.user.id;

      // Rate limiting
      const rateLimitResult = await checkRateLimitDistributed(
        `draft:${userId}`,
        DRAFT_RATE_LIMIT
      );
      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          { error: 'Too many requests. Please wait a moment.' },
          { status: 429 }
        );
      }

      // Parse request
      const body = await request.json();
      const { original_message, subject, tone } = body;

      if (!original_message) {
        return NextResponse.json(
          { error: 'original_message is required' },
          { status: 400 }
        );
      }

      // Get API key
      const apiKey = process.env.GOOGLE_AI_API_KEY;
      if (!apiKey) {
        console.error('[GenerateReply] GOOGLE_AI_API_KEY not configured');
        return NextResponse.json(
          { error: 'AI service not configured' },
          { status: 500 }
        );
      }

      // Load voice settings + cartridge context for this user
      const supabase = await createRouteHandlerClient(cookies);
      const cartridgeContext = await loadCartridgeContext(supabase, agencyId, userId);

      // Build voice-aware system prompt
      const voiceSection = generateCartridgeContextPrompt(cartridgeContext);
      const fallbackTone = tone || 'professional';

      const systemPrompt = `You are an AI assistant helping draft replies to client messages.
${voiceSection || `Respond in a ${fallbackTone} tone.`}

Generate a reply to the following message. The reply should be ready to send — no placeholders, no "[insert name]" style gaps. Write it as a complete, natural response appropriate for direct client communication.`;

      const userPrompt = subject
        ? `Subject: ${subject}\n\nMessage: ${original_message}`
        : `Message: ${original_message}`;

      // Call Gemini
      const genai = new GoogleGenAI({ apiKey });
      const response = await callGeminiWithRetry(
        () => genai.models.generateContent({
          model: GEMINI_MODEL,
          contents: `${systemPrompt}\n\nPlease draft a reply to:\n${userPrompt}`,
          config: { temperature: 0.7, maxOutputTokens: 1024 },
        }),
        'generate-reply'
      );

      const draft = response.text || '';

      return NextResponse.json({ data: { draft } });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[GenerateReply] Error:', errMsg);
      return NextResponse.json(
        { error: 'Failed to generate reply' },
        { status: 500 }
      );
    }
  }
);
