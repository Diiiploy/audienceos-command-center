/**
 * Cartridge Loader Tests
 *
 * Verifies cartridge context loading for the chat system.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadCartridgeContext,
  generateCartridgeContextPrompt,
  hasCartridgeContext,
  invalidateCartridgeCache,
  clearCartridgeCache,
  type CartridgeContext,
  type BrandCartridge,
} from '@/lib/chat/context/cartridge-loader';

// Create mock Supabase client
function createMockSupabase(mockData: {
  brand?: Partial<BrandCartridge> | null;
  style?: Record<string, unknown> | null;
  instructions?: Array<Record<string, unknown>> | null;
}) {
  return {
    from: (table: string) => ({
      select: () => ({
        eq: (_col: string, _val: unknown) => {
          if (table === 'brand_cartridge') {
            return {
              single: async () => ({
                data: mockData.brand,
                error: mockData.brand === null ? { code: 'PGRST116' } : null,
              }),
              eq: () => ({
                single: async () => ({
                  data: mockData.brand,
                  error: mockData.brand === null ? { code: 'PGRST116' } : null,
                }),
              }),
            };
          }
          if (table === 'style_cartridge') {
            return {
              single: async () => ({
                data: mockData.style,
                error: mockData.style === null ? { code: 'PGRST116' } : null,
              }),
              eq: () => ({
                single: async () => ({
                  data: mockData.style,
                  error: mockData.style === null ? { code: 'PGRST116' } : null,
                }),
              }),
            };
          }
          if (table === 'instruction_cartridge') {
            return {
              eq: () => ({
                data: mockData.instructions || [],
                error: null,
              }),
            };
          }
          return { single: async () => ({ data: null, error: null }) };
        },
      }),
    }),
  } as any;
}

describe('Cartridge Loader', () => {
  beforeEach(() => {
    clearCartridgeCache();
  });

  describe('loadCartridgeContext', () => {
    it('should load brand cartridge', async () => {
      const mockSupabase = createMockSupabase({
        brand: {
          id: 'brand-1',
          agency_id: 'agency-123',
          name: 'Test Brand',
          company_name: 'Acme Corp',
          company_description: 'We make great products',
          core_values: ['Quality', 'Innovation'],
        },
        style: null,
        instructions: [],
      });

      const context = await loadCartridgeContext(mockSupabase, 'agency-123');

      expect(context.brand).toBeDefined();
      expect(context.brand?.company_name).toBe('Acme Corp');
      expect(context.brand?.core_values).toContain('Quality');
    });

    it('should load style cartridge when complete', async () => {
      const mockSupabase = createMockSupabase({
        brand: null,
        style: {
          id: 'style-1',
          agency_id: 'agency-123',
          learned_style: 'Professional and concise',
          analysis_status: 'complete',
        },
        instructions: [],
      });

      const context = await loadCartridgeContext(mockSupabase, 'agency-123');

      expect(context.style).toBeDefined();
      expect(context.style?.learned_style).toBe('Professional and concise');
    });

    it('should load active instruction cartridges', async () => {
      const mockSupabase = createMockSupabase({
        brand: null,
        style: null,
        instructions: [
          {
            id: 'inst-1',
            agency_id: 'agency-123',
            name: 'Response Format',
            instructions: 'Always use bullet points',
            is_active: true,
          },
          {
            id: 'inst-2',
            agency_id: 'agency-123',
            name: 'Tone Guidelines',
            instructions: 'Keep it friendly',
            is_active: true,
          },
        ],
      });

      const context = await loadCartridgeContext(mockSupabase, 'agency-123');

      expect(context.instructions).toHaveLength(2);
      expect(context.instructions?.[0].name).toBe('Response Format');
    });

    it('should use cache on subsequent calls', async () => {
      const mockSupabase = createMockSupabase({
        brand: {
          id: 'brand-1',
          agency_id: 'agency-456',
          company_name: 'Cached Corp',
        },
        style: null,
        instructions: [],
      });

      // First call
      const context1 = await loadCartridgeContext(mockSupabase, 'agency-456');
      expect(context1.brand?.company_name).toBe('Cached Corp');

      // Second call (should use cache)
      const context2 = await loadCartridgeContext(mockSupabase, 'agency-456');
      expect(context2.brand?.company_name).toBe('Cached Corp');
    });
  });

  describe('generateCartridgeContextPrompt', () => {
    it('should generate prompt with brand context', () => {
      const context: CartridgeContext = {
        brand: {
          id: 'brand-1',
          agency_id: 'agency-123',
          name: 'Test',
          company_name: 'Acme Corp',
          company_description: 'Premium products',
          brand_voice: 'Professional',
          core_values: ['Quality', 'Innovation'],
        },
      };

      const prompt = generateCartridgeContextPrompt(context);

      expect(prompt).toContain('Brand Identity');
      expect(prompt).toContain('Acme Corp');
      expect(prompt).toContain('Premium products');
      expect(prompt).toContain('Professional');
      expect(prompt).toContain('Quality, Innovation');
    });

    it('should generate prompt with style context', () => {
      const context: CartridgeContext = {
        style: {
          id: 'style-1',
          agency_id: 'agency-123',
          learned_style: 'Conversational but professional',
          analysis_status: 'complete',
        },
      };

      const prompt = generateCartridgeContextPrompt(context);

      expect(prompt).toContain('Writing Style');
      expect(prompt).toContain('Conversational but professional');
    });

    it('should not include style if analysis incomplete', () => {
      const context: CartridgeContext = {
        style: {
          id: 'style-1',
          agency_id: 'agency-123',
          learned_style: 'Some style',
          analysis_status: 'pending',
        },
      };

      const prompt = generateCartridgeContextPrompt(context);

      expect(prompt).not.toContain('Writing Style');
    });

    it('should generate prompt with instructions', () => {
      const context: CartridgeContext = {
        instructions: [
          {
            id: 'inst-1',
            agency_id: 'agency-123',
            name: 'Response Guidelines',
            description: 'How to respond',
            instructions: 'Always be helpful',
            is_active: true,
          },
        ],
      };

      const prompt = generateCartridgeContextPrompt(context);

      expect(prompt).toContain('Custom Instructions');
      expect(prompt).toContain('Response Guidelines');
      expect(prompt).toContain('Always be helpful');
    });

    it('should return empty string for empty context', () => {
      const context: CartridgeContext = {};

      const prompt = generateCartridgeContextPrompt(context);

      expect(prompt).toBe('');
    });
  });

  describe('hasCartridgeContext', () => {
    it('should return true when brand is configured', () => {
      const context: CartridgeContext = {
        brand: {
          id: 'brand-1',
          agency_id: 'agency-123',
          name: 'Test',
          company_name: 'Acme Corp',
        },
      };

      expect(hasCartridgeContext(context)).toBe(true);
    });

    it('should return true when style is configured', () => {
      const context: CartridgeContext = {
        style: {
          id: 'style-1',
          agency_id: 'agency-123',
          learned_style: 'Some style',
        },
      };

      expect(hasCartridgeContext(context)).toBe(true);
    });

    it('should return true when instructions are configured', () => {
      const context: CartridgeContext = {
        instructions: [
          {
            id: 'inst-1',
            agency_id: 'agency-123',
            name: 'Test',
          },
        ],
      };

      expect(hasCartridgeContext(context)).toBe(true);
    });

    it('should return false for empty context', () => {
      const context: CartridgeContext = {};

      expect(hasCartridgeContext(context)).toBe(false);
    });
  });

  describe('cache invalidation', () => {
    it('should invalidate specific agency cache', async () => {
      const mockSupabase = createMockSupabase({
        brand: { id: 'brand-1', agency_id: 'agency-123', name: 'Test', company_name: 'Corp' },
        style: null,
        instructions: [],
      });

      // First call
      await loadCartridgeContext(mockSupabase, 'agency-123');

      // Invalidate
      invalidateCartridgeCache('agency-123');

      // Should fetch again
      const context = await loadCartridgeContext(mockSupabase, 'agency-123');
      expect(context.brand?.company_name).toBe('Corp');
    });
  });
});
