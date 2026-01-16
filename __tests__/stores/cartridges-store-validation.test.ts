import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useCartridgesStore } from '@/stores/cartridges-store'

// Mock fetch globally
global.fetch = vi.fn()

describe('Cartridges Store - Result Validation', () => {
  beforeEach(() => {
    // Reset store state
    useCartridgesStore.setState({
      cartridges: [],
      error: null,
      selectedCartridgeId: null,
    })
    // Clear all mocks
    vi.clearAllMocks()
  })

  describe('createCartridge validation', () => {
    it('should successfully create cartridge with valid response', async () => {
      const mockCartridge = {
        id: 'cart-123',
        name: 'Test Cartridge',
        type: 'voice',
        agency_id: 'agency-1',
        created_at: '2026-01-16T00:00:00Z',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockCartridge }),
      })

      const result = await useCartridgesStore.getState().createCartridge({ name: 'Test Cartridge', type: 'voice' })

      expect(result).toEqual(mockCartridge)
      expect(result.id).toBe('cart-123')
      expect(useCartridgesStore.getState().cartridges[0]).toEqual(mockCartridge)
    })

    it('should throw error when response has no data field', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }), // Missing 'data' field
      })

      const store = useCartridgesStore.getState()

      await expect(
        store.createCartridge({ name: 'Test Cartridge', type: 'voice' })
      ).rejects.toThrow('Server did not return cartridge data')
    })

    it('should throw error when response.data is null', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: null }),
      })

      const store = useCartridgesStore.getState()

      await expect(
        store.createCartridge({ name: 'Test Cartridge', type: 'voice' })
      ).rejects.toThrow('Server did not return cartridge data')
    })

    it('should throw error when response.data is undefined', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: undefined }),
      })

      const store = useCartridgesStore.getState()

      await expect(
        store.createCartridge({ name: 'Test Cartridge', type: 'voice' })
      ).rejects.toThrow('Server did not return cartridge data')
    })

    it('should throw error when response.data has no id field', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            name: 'Test Cartridge',
            type: 'voice',
            // Missing 'id' field
          },
        }),
      })

      const store = useCartridgesStore.getState()

      await expect(
        store.createCartridge({ name: 'Test Cartridge', type: 'voice' })
      ).rejects.toThrow('Server returned cartridge without id')
    })

    it('should throw error when response.data.id is null', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: null,
            name: 'Test Cartridge',
            type: 'voice',
          },
        }),
      })

      const store = useCartridgesStore.getState()

      await expect(
        store.createCartridge({ name: 'Test Cartridge', type: 'voice' })
      ).rejects.toThrow('Server returned cartridge without id')
    })

    it('should throw error when response.data.id is undefined', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: undefined,
            name: 'Test Cartridge',
            type: 'voice',
          },
        }),
      })

      const store = useCartridgesStore.getState()

      await expect(
        store.createCartridge({ name: 'Test Cartridge', type: 'voice' })
      ).rejects.toThrow('Server returned cartridge without id')
    })

    it('should throw error when response.data.id is empty string', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: '',
            name: 'Test Cartridge',
            type: 'voice',
          },
        }),
      })

      const store = useCartridgesStore.getState()

      await expect(
        store.createCartridge({ name: 'Test Cartridge', type: 'voice' })
      ).rejects.toThrow('Server returned cartridge without id')
    })

    it('should NOT add cartridge to state when validation fails', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: null }),
      })

      const store = useCartridgesStore.getState()
      const initialCartridges = [...store.cartridges]

      try {
        await store.createCartridge({ name: 'Test Cartridge', type: 'voice' })
      } catch {
        // Expected to throw
      }

      expect(store.cartridges).toEqual(initialCartridges)
    })

    it('should set error state when validation fails', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: null }),
      })

      try {
        await useCartridgesStore.getState().createCartridge({ name: 'Test Cartridge', type: 'voice' })
      } catch {
        // Expected to throw
      }

      expect(useCartridgesStore.getState().error).toBe('Server did not return cartridge data')
    })

    it('should throw error for network failure', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      })

      const store = useCartridgesStore.getState()

      await expect(
        store.createCartridge({ name: 'Test Cartridge', type: 'voice' })
      ).rejects.toThrow('Failed to create cartridge')
    })

    it('should add valid cartridge to beginning of list (optimistic update)', async () => {
      const existingCartridge = {
        id: 'cart-existing',
        name: 'Existing',
        type: 'brand',
        agency_id: 'agency-1',
      }

      useCartridgesStore.setState({ cartridges: [existingCartridge] })

      const newCartridge = {
        id: 'cart-new',
        name: 'New',
        type: 'voice',
        agency_id: 'agency-1',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: newCartridge }),
      })

      await useCartridgesStore.getState().createCartridge({ name: 'New', type: 'voice' })

      // New cartridge should be first
      const finalState = useCartridgesStore.getState()
      expect(finalState.cartridges[0]).toEqual(newCartridge)
      expect(finalState.cartridges[1]).toEqual(existingCartridge)
      expect(finalState.cartridges.length).toBe(2)
    })

    it('should handle JSON parse error gracefully', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON')
        },
      })

      const store = useCartridgesStore.getState()

      await expect(
        store.createCartridge({ name: 'Test Cartridge', type: 'voice' })
      ).rejects.toThrow('Invalid JSON')
    })
  })

  describe('edge cases', () => {
    it('should handle response.data with extra fields', async () => {
      const mockCartridge = {
        id: 'cart-123',
        name: 'Test',
        type: 'voice',
        agency_id: 'agency-1',
        created_at: '2026-01-16T00:00:00Z',
        extra_field: 'should not cause issue',
        nested: { data: 'ignored' },
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockCartridge }),
      })

      const store = useCartridgesStore.getState()
      const result = await store.createCartridge({ name: 'Test', type: 'voice' })

      expect(result.id).toBe('cart-123')
      expect(result.extra_field).toBe('should not cause issue')
    })

    it('should accept id as numeric value (coerced to truthy)', async () => {
      const mockCartridge = {
        id: 123, // Numeric ID
        name: 'Test',
        type: 'voice',
        agency_id: 'agency-1',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockCartridge }),
      })

      const store = useCartridgesStore.getState()
      const result = await store.createCartridge({ name: 'Test', type: 'voice' })

      expect(result.id).toBe(123)
    })

    it('should reject id as false (falsy value)', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: false,
            name: 'Test',
            type: 'voice',
          },
        }),
      })

      const store = useCartridgesStore.getState()

      await expect(
        store.createCartridge({ name: 'Test', type: 'voice' })
      ).rejects.toThrow('Server returned cartridge without id')
    })

    it('should reject id as 0 (falsy numeric value)', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            id: 0,
            name: 'Test',
            type: 'voice',
          },
        }),
      })

      const store = useCartridgesStore.getState()

      await expect(
        store.createCartridge({ name: 'Test', type: 'voice' })
      ).rejects.toThrow('Server returned cartridge without id')
    })
  })
})
