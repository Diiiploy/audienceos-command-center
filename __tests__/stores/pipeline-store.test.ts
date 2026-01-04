import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { usePipelineStore } from '@/stores/pipeline-store'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('pipeline-store', () => {
  beforeEach(() => {
    // Reset store state
    usePipelineStore.setState({
      clients: [],
      isLoading: false,
      error: null,
    })
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('should have empty clients array', () => {
      const { clients } = usePipelineStore.getState()
      expect(clients).toEqual([])
    })

    it('should not be loading initially', () => {
      const { isLoading } = usePipelineStore.getState()
      expect(isLoading).toBe(false)
    })

    it('should have no error initially', () => {
      const { error } = usePipelineStore.getState()
      expect(error).toBeNull()
    })
  })

  describe('client stage updates', () => {
    it('should update client stage optimistically', () => {
      const mockClients = [
        { id: 'c1', name: 'Client 1', stage: 'Onboarding', health_status: 'Green', days_in_stage: 3 },
        { id: 'c2', name: 'Client 2', stage: 'Live', health_status: 'Green', days_in_stage: 10 },
      ]

      usePipelineStore.setState({ clients: mockClients as any })

      // Simulate optimistic update
      usePipelineStore.setState((state) => ({
        clients: state.clients.map((c) =>
          c.id === 'c1' ? { ...c, stage: 'Installation', days_in_stage: 0 } : c
        ),
      }))

      const { clients } = usePipelineStore.getState()
      const updatedClient = clients.find((c) => c.id === 'c1')
      expect(updatedClient?.stage).toBe('Installation')
      expect(updatedClient?.days_in_stage).toBe(0)
    })
  })

  describe('loading states', () => {
    it('should set loading state', () => {
      usePipelineStore.setState({ isLoading: true })
      expect(usePipelineStore.getState().isLoading).toBe(true)
    })

    it('should set error state', () => {
      usePipelineStore.setState({ error: 'Failed to fetch clients' })
      expect(usePipelineStore.getState().error).toBe('Failed to fetch clients')
    })
  })

  describe('client filtering', () => {
    it('should filter clients by stage', () => {
      const mockClients = [
        { id: 'c1', stage: 'Onboarding' },
        { id: 'c2', stage: 'Live' },
        { id: 'c3', stage: 'Onboarding' },
      ]

      usePipelineStore.setState({ clients: mockClients as any })

      const { clients } = usePipelineStore.getState()
      const onboardingClients = clients.filter((c) => c.stage === 'Onboarding')
      expect(onboardingClients).toHaveLength(2)
    })

    it('should filter clients by health status', () => {
      const mockClients = [
        { id: 'c1', health_status: 'Green' },
        { id: 'c2', health_status: 'Yellow' },
        { id: 'c3', health_status: 'Red' },
      ]

      usePipelineStore.setState({ clients: mockClients as any })

      const { clients } = usePipelineStore.getState()
      const atRiskClients = clients.filter(
        (c) => c.health_status === 'Yellow' || c.health_status === 'Red'
      )
      expect(atRiskClients).toHaveLength(2)
    })
  })

  /**
   * ERROR HANDLING TESTS
   *
   * These tests ensure that API failures are properly captured and propagated
   * to the UI layer. This is critical for user experience - silent failures
   * showing empty states are confusing; explicit error messages with retry
   * options are actionable.
   *
   * Related: app/page.tsx error display (commit a12dea2)
   */
  describe('fetchClients error handling', () => {
    it('should set isLoading=true when fetch starts', async () => {
      // Setup: mock a delayed response
      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

      // Act: call fetchClients (don't await - we want to check intermediate state)
      const fetchPromise = usePipelineStore.getState().fetchClients()

      // Wait a tick for the state to update
      await new Promise(resolve => setTimeout(resolve, 0))

      // Assert: loading should be true while fetch is in progress
      expect(usePipelineStore.getState().isLoading).toBe(true)
      expect(usePipelineStore.getState().error).toBeNull()
    })

    it('should set error when API returns non-200 status', async () => {
      // Setup: mock 401 Unauthorized response
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'No session' }),
      })

      // Act
      await usePipelineStore.getState().fetchClients()

      // Assert
      const state = usePipelineStore.getState()
      expect(state.isLoading).toBe(false)
      expect(state.error).toBe('Failed to fetch clients')
      expect(state.clients).toEqual([])
    })

    it('should set error when API returns 500 server error', async () => {
      // Setup: mock 500 Internal Server Error
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      })

      // Act
      await usePipelineStore.getState().fetchClients()

      // Assert
      const state = usePipelineStore.getState()
      expect(state.isLoading).toBe(false)
      expect(state.error).toBe('Failed to fetch clients')
    })

    it('should set error when network request fails', async () => {
      // Setup: mock network failure
      mockFetch.mockRejectedValue(new Error('Network error'))

      // Act
      await usePipelineStore.getState().fetchClients()

      // Assert
      const state = usePipelineStore.getState()
      expect(state.isLoading).toBe(false)
      expect(state.error).toBe('Network error')
      expect(state.clients).toEqual([])
    })

    it('should set error when fetch throws TypeError (CORS, etc)', async () => {
      // Setup: mock CORS/network failure
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))

      // Act
      await usePipelineStore.getState().fetchClients()

      // Assert
      const state = usePipelineStore.getState()
      expect(state.isLoading).toBe(false)
      expect(state.error).toBe('Failed to fetch')
    })

    it('should clear previous error when retrying fetch', async () => {
      // Setup: first call fails, second succeeds
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 401 })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: [{ id: 'c1', name: 'Client 1', stage: 'Live', health_status: 'green' }] }),
        })

      // Act: first fetch fails
      await usePipelineStore.getState().fetchClients()
      expect(usePipelineStore.getState().error).toBe('Failed to fetch clients')

      // Act: retry succeeds
      await usePipelineStore.getState().fetchClients()

      // Assert: error is cleared, clients are loaded
      const state = usePipelineStore.getState()
      expect(state.error).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.clients).toHaveLength(1)
    })

    it('should populate clients on successful fetch', async () => {
      // Setup: mock successful API response
      const mockClientData = [
        { id: 'c1', name: 'TechCorp', stage: 'Live', health_status: 'green', days_in_stage: 30, agency_id: 'a1' },
        { id: 'c2', name: 'StartupXYZ', stage: 'Onboarding', health_status: 'yellow', days_in_stage: 5, agency_id: 'a1' },
      ]
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockClientData }),
      })

      // Act
      await usePipelineStore.getState().fetchClients()

      // Assert
      const state = usePipelineStore.getState()
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
      expect(state.clients).toHaveLength(2)
      expect(state.clients[0].name).toBe('TechCorp')
      expect(state.clients[0].health_status).toBe('Green') // Capitalized by mapHealthStatus
    })

    it('should handle empty data array from API', async () => {
      // Setup: mock empty response
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: [] }),
      })

      // Act
      await usePipelineStore.getState().fetchClients()

      // Assert: no error, just empty clients
      const state = usePipelineStore.getState()
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
      expect(state.clients).toEqual([])
    })

    it('should handle null data from API', async () => {
      // Setup: mock null data response
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ data: null }),
      })

      // Act
      await usePipelineStore.getState().fetchClients()

      // Assert: no error, empty clients (null coalesced to [])
      const state = usePipelineStore.getState()
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
      expect(state.clients).toEqual([])
    })
  })

  describe('error state management', () => {
    it('should allow manual error clearing via setError', () => {
      // Setup: set error state
      usePipelineStore.getState().setError('Test error')
      expect(usePipelineStore.getState().error).toBe('Test error')

      // Act: clear error
      usePipelineStore.getState().setError(null)

      // Assert
      expect(usePipelineStore.getState().error).toBeNull()
    })

    it('should preserve error state across multiple reads', () => {
      // Setup: set error
      usePipelineStore.setState({ error: 'Persistent error' })

      // Assert: multiple reads return same error
      expect(usePipelineStore.getState().error).toBe('Persistent error')
      expect(usePipelineStore.getState().error).toBe('Persistent error')
      expect(usePipelineStore.getState().error).toBe('Persistent error')
    })

    it('should not affect clients when error is set', () => {
      // Setup: have existing clients
      usePipelineStore.setState({
        clients: [{ id: 'c1', name: 'Existing' }] as any,
        error: null,
      })

      // Act: set error (simulating failed refresh)
      usePipelineStore.setState({ error: 'Refresh failed' })

      // Assert: clients preserved
      expect(usePipelineStore.getState().clients).toHaveLength(1)
      expect(usePipelineStore.getState().error).toBe('Refresh failed')
    })
  })
})
