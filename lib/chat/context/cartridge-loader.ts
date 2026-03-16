/**
 * Cartridge Context Loader
 *
 * Loads and formats training cartridges (brand, style, instructions)
 * for injection into the chat system prompt.
 *
 * This enables the chat to:
 * - Know agency's brand identity
 * - Match writing style
 * - Follow custom instructions
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Brand cartridge data structure
 */
export interface BrandCartridge {
  id: string;
  agency_id: string;
  name: string;
  company_name?: string;
  company_description?: string;
  company_tagline?: string;
  industry?: string;
  target_audience?: string;
  core_values?: string[];
  brand_voice?: string;
  brand_personality?: string[];
  brand_colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  core_messaging?: string;
}

/**
 * Style cartridge data structure
 */
export interface StyleCartridge {
  id: string;
  agency_id: string;
  learned_style?: string;
  analysis_status?: string;
  source_files?: Array<{
    name?: string;
    file_path?: string;
  }>;
}

/**
 * Instruction cartridge data structure
 */
export interface InstructionCartridge {
  id: string;
  agency_id: string;
  name: string;
  description?: string;
  instructions?: string;
  is_active?: boolean;
}

/**
 * Voice settings from user preferences
 * Stored in user.preferences.ai.voice JSONB
 */
export interface VoiceSettings {
  tone: { formality: string; enthusiasm: number; empathy: number }
  style: { sentenceLength: string; paragraphStructure: string; useEmojis: boolean }
  personality: { voiceDescription: string; traits: string[] }
  vocabulary: { complexity: string; industryTerms?: string[]; bannedWords?: string[]; preferredPhrases?: string[] }
}

/**
 * All cartridges combined for context injection
 */
export interface CartridgeContext {
  brand?: BrandCartridge;
  style?: StyleCartridge;
  instructions?: InstructionCartridge[];
  voice?: VoiceSettings;
}

/**
 * Simple in-memory cache for cartridge context
 * TTL: 5 minutes to balance freshness with performance
 */
const cartridgeCache = new Map<string, { context: CartridgeContext; expires: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Load cartridges for an agency from Supabase
 */
export async function loadCartridgeContext(
  supabase: SupabaseClient,
  agencyId: string,
  userId?: string
): Promise<CartridgeContext> {
  // Check cache first
  const cacheKey = userId ? `${agencyId}:${userId}` : agencyId;
  const cached = cartridgeCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.context;
  }

  const context: CartridgeContext = {};

  try {
    // Fetch all cartridges in parallel
    const [brandResult, styleResult, instructionsResult, userResult] = await Promise.all([
      supabase
        .from('brand_cartridge')
        .select('*')
        .eq('agency_id', agencyId)
        .single(),
      supabase
        .from('style_cartridge')
        .select('*')
        .eq('agency_id', agencyId)
        .single(),
      supabase
        .from('instruction_cartridge')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('is_active', true),
      userId ? supabase
        .from('user')
        .select('preferences')
        .eq('id', userId)
        .single()
      : Promise.resolve({ data: null, error: null }),
    ]);

    // Handle brand cartridge
    if (brandResult.data && !brandResult.error) {
      context.brand = brandResult.data as BrandCartridge;
    }

    // Handle style cartridge
    if (styleResult.data && !styleResult.error) {
      context.style = styleResult.data as StyleCartridge;
    }

    // Handle instruction cartridges
    if (instructionsResult.data && !instructionsResult.error) {
      context.instructions = instructionsResult.data as InstructionCartridge[];
    }

    // Handle user voice settings
    if (userResult.data && !userResult.error) {
      const prefs = (userResult.data as any)?.preferences;
      if (prefs?.ai?.voice) {
        context.voice = prefs.ai.voice as VoiceSettings;
      }
    }

    // Cache the result
    cartridgeCache.set(cacheKey, {
      context,
      expires: Date.now() + CACHE_TTL_MS,
    });
  } catch (error) {
    console.warn('[CartridgeLoader] Failed to load cartridges:', error);
    // Return empty context on error
  }

  return context;
}

/**
 * Convert voice settings to natural language prompt instructions
 */
function generateVoicePrompt(voice: VoiceSettings): string {
  const parts: string[] = [];

  // Tone
  const { formality, enthusiasm, empathy } = voice.tone;
  const enthusiasmLabel = enthusiasm <= 2 ? 'minimal' : enthusiasm <= 4 ? 'low' : enthusiasm <= 6 ? 'moderate' : enthusiasm <= 8 ? 'high' : 'very high';
  const empathyLabel = empathy <= 2 ? 'minimal' : empathy <= 4 ? 'low' : empathy <= 6 ? 'moderate' : empathy <= 8 ? 'high' : 'very high';
  parts.push(`Communicate in a ${formality} tone with ${enthusiasmLabel} enthusiasm and ${empathyLabel} empathy.`);

  // Style
  const { sentenceLength, paragraphStructure, useEmojis } = voice.style;
  const lengthDesc = sentenceLength === 'short' ? 'short, punchy' : sentenceLength === 'long' ? 'longer, more detailed' : 'medium-length';
  parts.push(`Use ${lengthDesc} sentences in ${paragraphStructure === 'single' ? 'single-sentence' : 'multi-sentence'} paragraphs.`);
  if (useEmojis) parts.push('Use emojis where appropriate.');
  else parts.push('Do not use emojis.');

  // Personality
  if (voice.personality.voiceDescription) {
    parts.push(`Personality: ${voice.personality.voiceDescription}`);
  }
  if (voice.personality.traits.length > 0) {
    parts.push(`Key traits: ${voice.personality.traits.join(', ')}.`);
  }

  // Vocabulary
  const complexityDesc = voice.vocabulary.complexity === 'simple' ? 'everyday, accessible' : voice.vocabulary.complexity === 'advanced' ? 'specialized, technical' : 'professional';
  parts.push(`Use ${complexityDesc} vocabulary.`);
  if (voice.vocabulary.bannedWords?.length) {
    parts.push(`Never use these words: ${voice.vocabulary.bannedWords.join(', ')}.`);
  }
  if (voice.vocabulary.preferredPhrases?.length) {
    parts.push(`Prefer these phrases when relevant: ${voice.vocabulary.preferredPhrases.join(', ')}.`);
  }
  if (voice.vocabulary.industryTerms?.length) {
    parts.push(`Industry terms to incorporate naturally: ${voice.vocabulary.industryTerms.join(', ')}.`);
  }

  return `## Voice & Communication Style\n\n${parts.join('\n')}\n\nAdapt all responses and drafted replies to match this voice profile.`;
}

/**
 * Generate system prompt injection for cartridge context
 */
export function generateCartridgeContextPrompt(context: CartridgeContext): string {
  const parts: string[] = [];

  // Voice context (from user preferences)
  if (context.voice) {
    parts.push(generateVoicePrompt(context.voice));
  }

  // Brand context
  if (context.brand) {
    const brand = context.brand;
    parts.push(`## Brand Identity

${brand.company_name ? `Company: ${brand.company_name}` : ''}
${brand.company_description ? `Description: ${brand.company_description}` : ''}
${brand.company_tagline ? `Tagline: "${brand.company_tagline}"` : ''}
${brand.industry ? `Industry: ${brand.industry}` : ''}
${brand.target_audience ? `Target Audience: ${brand.target_audience}` : ''}
${brand.brand_voice ? `Voice: ${brand.brand_voice}` : ''}
${brand.core_values?.length ? `Core Values: ${brand.core_values.join(', ')}` : ''}
${brand.brand_personality?.length ? `Personality: ${brand.brand_personality.join(', ')}` : ''}
${brand.core_messaging ? `\nKey Messaging:\n${brand.core_messaging}` : ''}

Use this brand context to match the agency's voice and values in your responses.`);
  }

  // Style context
  if (context.style?.learned_style && context.style.analysis_status === 'complete') {
    parts.push(`## Writing Style

The agency has the following learned writing style:
${context.style.learned_style}

Match this style in your responses to maintain consistency with the agency's communications.`);
  }

  // Instructions context
  if (context.instructions && context.instructions.length > 0) {
    const activeInstructions = context.instructions.filter(i => i.is_active !== false);
    if (activeInstructions.length > 0) {
      const instructionsList = activeInstructions
        .map(i => `### ${i.name}${i.description ? ` - ${i.description}` : ''}\n${i.instructions || 'No specific instructions.'}`)
        .join('\n\n');

      parts.push(`## Custom Instructions

The agency has configured the following custom instructions:

${instructionsList}

Follow these instructions when generating responses.`);
    }
  }

  return parts.join('\n\n');
}

/**
 * Check if cartridges are configured for an agency
 */
export function hasCartridgeContext(context: CartridgeContext): boolean {
  return !!(
    context.voice ||
    context.brand?.company_name ||
    context.style?.learned_style ||
    (context.instructions && context.instructions.length > 0)
  );
}

/**
 * Invalidate cartridge cache for an agency
 * Call this when cartridges are updated
 */
export function invalidateCartridgeCache(agencyId: string): void {
  // Clear all cache entries for this agency (any user)
  Array.from(cartridgeCache.keys()).forEach((key) => {
    if (key === agencyId || key.startsWith(`${agencyId}:`)) {
      cartridgeCache.delete(key);
    }
  });
}

/**
 * Clear entire cartridge cache (for testing)
 */
export function clearCartridgeCache(): void {
  cartridgeCache.clear();
}
