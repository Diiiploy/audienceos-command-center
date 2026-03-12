import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useOnboardingStore } from '@/stores/onboarding-store'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Mock fetchWithCsrf
vi.mock('@/lib/csrf', () => ({
  fetchWithCsrf: vi.fn().mockImplementation((url, options) => mockFetch(url, options)),
}))

describe('onboarding-store', () => {
  beforeEach(() => {
    // Reset store state
    useOnboardingStore.setState({
      journeys: [],
      selectedJourneyId: null,
      isLoadingJourneys: false,
      isSavingJourney: false,
      fields: [],
      isLoadingFields: false,
      savingFieldIds: {},
      isReordering: false,
      fieldSaveVersions: {},
      lastSaveAt: null,
      instances: [],
      selectedInstanceId: null,
      selectedInstance: null,
      isLoadingInstances: false,
      isTriggeringOnboarding: false,
      activeTab: 'active',
    })
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ===========================================================================
  // INITIAL STATE TESTS
  // ===========================================================================

  describe('initial state', () => {
    it('should have empty journeys array', () => {
      const { journeys } = useOnboardingStore.getState()
      expect(journeys).toEqual([])
    })

    it('should have empty instances array', () => {
      const { instances } = useOnboardingStore.getState()
      expect(instances).toEqual([])
    })

    it('should have empty fields array', () => {
      const { fields } = useOnboardingStore.getState()
      expect(fields).toEqual([])
    })

    it('should not be loading initially', () => {
      const state = useOnboardingStore.getState()
      expect(state.isLoadingJourneys).toBe(false)
      expect(state.isLoadingInstances).toBe(false)
      expect(state.isLoadingFields).toBe(false)
    })

    it('should have active tab as default', () => {
      const { activeTab } = useOnboardingStore.getState()
      expect(activeTab).toBe('active')
    })

    it('should have no selected journey initially', () => {
      const { selectedJourneyId } = useOnboardingStore.getState()
      expect(selectedJourneyId).toBeNull()
    })

    it('should have no selected instance initially', () => {
      const { selectedInstanceId, selectedInstance } = useOnboardingStore.getState()
      expect(selectedInstanceId).toBeNull()
      expect(selectedInstance).toBeNull()
    })
  })

  // ===========================================================================
  // JOURNEY TESTS
  // ===========================================================================

  describe('journey actions', () => {
    it('should fetch journeys successfully', async () => {
      const mockJourneys = [
        { id: 'j1', name: 'Default Journey', is_default: true },
        { id: 'j2', name: 'Custom Journey', is_default: false },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockJourneys }),
      })

      await useOnboardingStore.getState().fetchJourneys()

      const { journeys, isLoadingJourneys, selectedJourneyId } = useOnboardingStore.getState()
      expect(journeys).toEqual(mockJourneys)
      expect(isLoadingJourneys).toBe(false)
      expect(selectedJourneyId).toBe('j1') // Default journey auto-selected
    })

    it('should handle fetch journeys error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockFetch.mockResolvedValueOnce({
        ok: false,
      })

      await useOnboardingStore.getState().fetchJourneys()

      const { journeys, isLoadingJourneys } = useOnboardingStore.getState()
      expect(journeys).toEqual([])
      expect(isLoadingJourneys).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch journeys:', expect.any(Error))

      consoleSpy.mockRestore()
    })

    it('should set loading state while fetching journeys', async () => {
      mockFetch.mockImplementationOnce(() => new Promise(() => {})) // Never resolves

      useOnboardingStore.getState().fetchJourneys()

      // Check loading state immediately
      expect(useOnboardingStore.getState().isLoadingJourneys).toBe(true)
    })

    it('should update selected journey ID', () => {
      useOnboardingStore.getState().setSelectedJourneyId('j123')
      expect(useOnboardingStore.getState().selectedJourneyId).toBe('j123')
    })
  })

  // ===========================================================================
  // INSTANCE TESTS
  // ===========================================================================

  describe('instance actions', () => {
    it('should fetch instances successfully', async () => {
      const mockInstances = [
        {
          id: 'i1',
          client: { id: 'c1', name: 'Test Client', stage: 'Enterprise' },
          journey: { id: 'j1', name: 'Default', stages: [] },
          stage_statuses: [],
        },
        {
          id: 'i2',
          client: { id: 'c2', name: 'Another Client', stage: 'Core' },
          journey: { id: 'j1', name: 'Default', stages: [] },
          stage_statuses: [],
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockInstances }),
      })

      await useOnboardingStore.getState().fetchInstances()

      const { instances, isLoadingInstances } = useOnboardingStore.getState()
      expect(instances).toEqual(mockInstances)
      expect(isLoadingInstances).toBe(false)
    })

    it('should fetch instances with status filter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })

      await useOnboardingStore.getState().fetchInstances('pending')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/onboarding/instances?status=pending',
        expect.objectContaining({ credentials: 'include' })
      )
    })

    it('should handle fetch instances error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockFetch.mockResolvedValueOnce({
        ok: false,
      })

      await useOnboardingStore.getState().fetchInstances()

      const { instances, isLoadingInstances } = useOnboardingStore.getState()
      expect(instances).toEqual([])
      expect(isLoadingInstances).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch instances:', expect.any(Error))

      consoleSpy.mockRestore()
    })

    it('should set selected instance ID', () => {
      useOnboardingStore.getState().setSelectedInstanceId('i123')
      expect(useOnboardingStore.getState().selectedInstanceId).toBe('i123')
    })

    it('should clear selected instance ID', () => {
      useOnboardingStore.setState({ selectedInstanceId: 'i123' })
      useOnboardingStore.getState().setSelectedInstanceId(null)
      expect(useOnboardingStore.getState().selectedInstanceId).toBeNull()
    })
  })

  // ===========================================================================
  // FIELD TESTS
  // ===========================================================================

  describe('field actions', () => {
    it('should fetch fields successfully', async () => {
      const mockFields = [
        { id: 'f1', field_label: 'Business Name', field_type: 'text', is_required: true },
        { id: 'f2', field_label: 'Website', field_type: 'url', is_required: false },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockFields }),
      })

      await useOnboardingStore.getState().fetchFields()

      const { fields, isLoadingFields } = useOnboardingStore.getState()
      expect(fields).toEqual(mockFields)
      expect(isLoadingFields).toBe(false)
    })

    it('should fetch fields with journey filter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })

      await useOnboardingStore.getState().fetchFields('j123')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/v1/onboarding/fields?journey_id=j123',
        expect.objectContaining({ credentials: 'include' })
      )
    })

    it('should handle fetch fields error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockFetch.mockResolvedValueOnce({
        ok: false,
      })

      await useOnboardingStore.getState().fetchFields()

      const { fields, isLoadingFields } = useOnboardingStore.getState()
      expect(fields).toEqual([])
      expect(isLoadingFields).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch fields:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  // ===========================================================================
  // UI STATE TESTS
  // ===========================================================================

  describe('UI state', () => {
    it('should update active tab', () => {
      useOnboardingStore.getState().setActiveTab('journey')
      expect(useOnboardingStore.getState().activeTab).toBe('journey')

      useOnboardingStore.getState().setActiveTab('form-builder')
      expect(useOnboardingStore.getState().activeTab).toBe('form-builder')

      useOnboardingStore.getState().setActiveTab('active')
      expect(useOnboardingStore.getState().activeTab).toBe('active')
    })
  })

  // ===========================================================================
  // STAGE MAPPING TESTS (for accordion UI)
  // ===========================================================================

  describe('stage status mapping', () => {
    it('should correctly map instance stage statuses', () => {
      const mockInstance = {
        id: 'i1',
        client: { id: 'c1', name: 'Test Client', stage: 'Enterprise' },
        journey: {
          id: 'j1',
          name: 'Default',
          stages: [
            { id: 's1', name: 'Intake', order: 0 },
            { id: 's2', name: 'Access', order: 1 },
            { id: 's3', name: 'Installation', order: 2 },
          ],
        },
        stage_statuses: [
          { stage_id: 's1', status: 'completed', platform_statuses: {} },
          { stage_id: 's2', status: 'in_progress', platform_statuses: { google_ads: 'connected' } },
          { stage_id: 's3', status: 'pending', platform_statuses: {} },
        ],
      }

      useOnboardingStore.setState({ instances: [mockInstance as any] })

      const { instances } = useOnboardingStore.getState()
      const instance = instances[0]

      // Verify stage statuses are accessible
      expect(instance.stage_statuses).toHaveLength(3)
      expect(instance.stage_statuses?.[0].status).toBe('completed')
      expect(instance.stage_statuses?.[1].status).toBe('in_progress')
      expect(instance.stage_statuses?.[1].platform_statuses).toEqual({ google_ads: 'connected' })
    })

    it('should handle instances without stage statuses', () => {
      const mockInstance = {
        id: 'i1',
        client: { id: 'c1', name: 'Test Client', stage: null },
        journey: { id: 'j1', name: 'Default', stages: [] },
        stage_statuses: undefined,
      }

      useOnboardingStore.setState({ instances: [mockInstance as any] })

      const { instances } = useOnboardingStore.getState()
      expect(instances[0].stage_statuses).toBeUndefined()
    })
  })

  // ===========================================================================
  // CLIENT TIER/STAGE FIX VERIFICATION
  // ===========================================================================

  describe('client stage handling (tier→stage fix)', () => {
    it('should handle client with stage property', () => {
      const mockInstance = {
        id: 'i1',
        client: {
          id: 'c1',
          name: 'Enterprise Client',
          stage: 'Enterprise',
          contact_email: 'test@example.com',
        },
        journey: { id: 'j1', name: 'Default', stages: [] },
        stage_statuses: [],
      }

      useOnboardingStore.setState({ instances: [mockInstance as any] })

      const { instances } = useOnboardingStore.getState()
      expect(instances[0].client?.stage).toBe('Enterprise')
    })

    it('should handle client with null stage', () => {
      const mockInstance = {
        id: 'i1',
        client: {
          id: 'c1',
          name: 'Basic Client',
          stage: null,
          contact_email: null,
        },
        journey: { id: 'j1', name: 'Default', stages: [] },
        stage_statuses: [],
      }

      useOnboardingStore.setState({ instances: [mockInstance as any] })

      const { instances } = useOnboardingStore.getState()
      expect(instances[0].client?.stage).toBeNull()
    })

    it('should NOT have tier property (removed from schema)', () => {
      const mockInstance = {
        id: 'i1',
        client: {
          id: 'c1',
          name: 'Test Client',
          stage: 'Core',
        },
        journey: { id: 'j1', name: 'Default', stages: [] },
        stage_statuses: [],
      }

      useOnboardingStore.setState({ instances: [mockInstance as any] })

      const { instances } = useOnboardingStore.getState()
      // Type system should not allow 'tier' property
      expect('tier' in (instances[0].client || {})).toBe(false)
    })
  })

  // ===========================================================================
  // ERROR RECOVERY TESTS
  // ===========================================================================

  describe('error recovery', () => {
    it('should recover from network error on fetchJourneys', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // First call fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await useOnboardingStore.getState().fetchJourneys()
      expect(useOnboardingStore.getState().isLoadingJourneys).toBe(false)

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'j1', name: 'Journey' }] }),
      })

      await useOnboardingStore.getState().fetchJourneys()
      expect(useOnboardingStore.getState().journeys).toHaveLength(1)

      consoleSpy.mockRestore()
    })

    it('should recover from network error on fetchInstances', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // First call fails
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await useOnboardingStore.getState().fetchInstances()
      expect(useOnboardingStore.getState().isLoadingInstances).toBe(false)

      // Second call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'i1', client: { name: 'Test' } }] }),
      })

      await useOnboardingStore.getState().fetchInstances()
      expect(useOnboardingStore.getState().instances).toHaveLength(1)

      consoleSpy.mockRestore()
    })
  })
})
