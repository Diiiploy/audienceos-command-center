/**
 * Conversation Summarizer
 *
 * Uses Gemini to extract key insights from chat sessions.
 * Insights are stored as high-quality memories (type: 'insight', importance: 'high').
 *
 * Triggered after a session accumulates enough messages (threshold-based).
 * Runs fire-and-forget so it never blocks the chat response.
 */

import { GoogleGenAI } from '@google/genai';
import { initializeMem0Service } from './mem0-service';
import type { MemoryType } from './types';

// Gemini 3 per project requirements
const GEMINI_MODEL = 'gemini-3-flash-preview';

// Only summarize sessions with meaningful depth
const MIN_MESSAGES_FOR_SUMMARY = 6;

// Summarize every N messages (avoid re-summarizing on every single message)
const SUMMARY_INTERVAL = 6;

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ExtractedInsight {
  content: string;
  type: MemoryType;
  importance: 'high' | 'medium';
  topic?: string;
}

const EXTRACTION_PROMPT = `You are analyzing a conversation between a user and an AI assistant at a digital marketing agency.

Extract 2-4 key takeaways from this conversation. Focus on:
- Decisions made (type: "decision")
- User preferences expressed (type: "preference")
- Action items or tasks mentioned (type: "task")
- Important insights or learnings (type: "insight")

For each takeaway, respond with a JSON array of objects:
[
  {
    "content": "One sentence summary of the takeaway",
    "type": "decision" | "preference" | "task" | "insight",
    "importance": "high" | "medium",
    "topic": "brief topic label"
  }
]

Rules:
- Each content should be a clear, standalone statement (not referencing "the conversation")
- Prefer "high" importance for decisions and preferences, "medium" for general insights
- Skip trivial exchanges (greetings, confirmations) — only extract substantive takeaways
- If the conversation has no substantive takeaways, return an empty array: []
- Respond with ONLY the JSON array, no other text`;

/**
 * Summarize a conversation and store insights as memories
 */
export async function summarizeConversation(
  messages: ConversationMessage[],
  agencyId: string,
  userId: string,
  sessionId: string,
  clientId?: string
): Promise<{ insightsStored: number }> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.warn('[Summarizer] No GOOGLE_AI_API_KEY — skipping');
    return { insightsStored: 0 };
  }

  if (messages.length < MIN_MESSAGES_FOR_SUMMARY) {
    return { insightsStored: 0 };
  }

  try {
    // Format conversation for Gemini
    const conversationText = messages
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.substring(0, 300)}`)
      .join('\n');

    const genai = new GoogleGenAI({ apiKey });
    const result = await genai.models.generateContent({
      model: GEMINI_MODEL,
      contents: `${EXTRACTION_PROMPT}\n\n--- CONVERSATION ---\n${conversationText}`,
      config: { temperature: 0.3 },
    });

    const text = result.text?.trim();
    if (!text) return { insightsStored: 0 };

    // Parse JSON response (strip markdown code fences if present)
    const jsonStr = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    const insights: ExtractedInsight[] = JSON.parse(jsonStr);

    if (!Array.isArray(insights) || insights.length === 0) {
      return { insightsStored: 0 };
    }

    // Store each insight as a high-quality memory
    const mem0 = initializeMem0Service();
    let stored = 0;

    for (const insight of insights.slice(0, 4)) {
      try {
        await mem0.addMemory({
          content: insight.content,
          agencyId,
          userId,
          clientId,
          sessionId,
          type: insight.type || 'insight',
          importance: insight.importance || 'high',
          topic: insight.topic,
        });
        stored++;
      } catch (err) {
        console.warn('[Summarizer] Failed to store insight:', err);
      }
    }

    return { insightsStored: stored };
  } catch (error) {
    console.warn('[Summarizer] Summarization failed:', error);
    return { insightsStored: 0 };
  }
}

/**
 * Check if a session should be summarized based on message count
 * Returns true at every SUMMARY_INTERVAL threshold
 */
export function shouldSummarize(messageCount: number): boolean {
  return messageCount >= MIN_MESSAGES_FOR_SUMMARY &&
    messageCount % SUMMARY_INTERVAL === 0;
}
