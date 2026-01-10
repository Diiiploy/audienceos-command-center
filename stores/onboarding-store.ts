import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { fetchWithCsrf } from '@/lib/csrf'
import type { Database, Json } from '@/types/database'

// =============================================================================
// ONBOARDING STORE TYPES
// =============================================================================

type OnboardingJourney = Database['public']['Tables']['onboarding_journey']['Row']
type IntakeFormField = Database['public']['Tables']['intake_form_field']['Row']
type OnboardingInstance = Database['public']['Tables']['onboarding_instance']['Row']
type OnboardingStageStatus = Database['public']['Tables']['onboarding_stage_status']['Row']

// Extended types with relations
export interface OnboardingInstanceWithRelations extends OnboardingInstance {
  client?: {
    id: string
    name: string
    contact_email: string | null
    contact_name: string | null
    tier?: string | null
    tags?: string[] | null
  } | null
  journey?: {
    id: string
    name: string
    stages: Json
    welcome_video_url?: string | null
    ai_analysis_prompt?: string | null
  } | null
  triggered_by_user?: {
    id: string
    first_name: string | null
    last_name: string | null
    avatar_url: string | null
  } | null
  stage_statuses?: OnboardingStageStatus[]
  responses?: Array<{
    id: string
    field_id: string
    value: string | null
    submitted_at: string
    field?: {
      id: string
      field_label: string
      field_type: string
    } | null
  }>
  portal_url?: string
}

export interface Stage {
  id: string
  name: string
  order: number
  platforms?: string[]
}

// =============================================================================
// ONBOARDING STORE STATE
// =============================================================================

interface OnboardingState {
  // Journeys (templates)
  journeys: OnboardingJourney[]
  selectedJourneyId: string | null
  isLoadingJourneys: boolean
  isSavingJourney: boolean

  // Form fields
  fields: IntakeFormField[]
  isLoadingFields: boolean
  isSavingField: boolean

  // Onboarding instances (active onboardings)
  instances: OnboardingInstanceWithRelations[]
  selectedInstanceId: string | null
  selectedInstance: OnboardingInstanceWithRelations | null
  isLoadingInstances: boolean
  isTriggeringOnboarding: boolean

  // UI state
  activeTab: 'active' | 'journey' | 'form-builder'

  // Actions - Journeys
  fetchJourneys: () => Promise<void>
  saveJourney: (data: Partial<OnboardingJourney>) => Promise<void>
  setSelectedJourneyId: (id: string | null) => void

  // Actions - Fields
  fetchFields: (journeyId?: string) => Promise<void>
  createField: (data: Partial<IntakeFormField>) => Promise<void>
  updateField: (id: string, data: Partial<IntakeFormField>) => Promise<void>
  deleteField: (id: string) => Promise<void>

  // Actions - Instances
  fetchInstances: (status?: string) => Promise<void>
  fetchInstance: (id: string) => Promise<void>
  triggerOnboarding: (data: { client_name: string; client_email: string; client_tier?: string }) => Promise<OnboardingInstanceWithRelations | null>
  updateStageStatus: (instanceId: string, stageId: string, status: string, platformStatuses?: Record<string, string>) => Promise<void>
  setSelectedInstanceId: (id: string | null) => void

  // Actions - UI
  setActiveTab: (tab: 'active' | 'journey' | 'form-builder') => void
}

// =============================================================================
// ONBOARDING STORE IMPLEMENTATION
// =============================================================================

export const useOnboardingStore = create<OnboardingState>()(
  devtools(
    (set, get) => ({
      // Initial state
      journeys: [],
      selectedJourneyId: null,
      isLoadingJourneys: false,
      isSavingJourney: false,

      fields: [],
      isLoadingFields: false,
      isSavingField: false,

      instances: [],
      selectedInstanceId: null,
      selectedInstance: null,
      isLoadingInstances: false,
      isTriggeringOnboarding: false,

      activeTab: 'active',

      // =========================================================================
      // JOURNEY ACTIONS
      // =========================================================================

      fetchJourneys: async () => {
        set({ isLoadingJourneys: true })
        try {
          const response = await fetch('/api/v1/onboarding/journeys', {
            credentials: 'include',
          })
          if (!response.ok) throw new Error('Failed to fetch journeys')
          const { data } = await response.json()
          set({ journeys: data || [], isLoadingJourneys: false })

          // Select default journey if none selected
          const defaultJourney = data?.find((j: OnboardingJourney) => j.is_default)
          if (defaultJourney && !get().selectedJourneyId) {
            set({ selectedJourneyId: defaultJourney.id })
          }
        } catch (error) {
          console.error('Failed to fetch journeys:', error)
          set({ isLoadingJourneys: false })
        }
      },

      saveJourney: async (data) => {
        set({ isSavingJourney: true })
        try {
          const journeyId = get().selectedJourneyId
          const method = journeyId ? 'PATCH' : 'POST'
          const url = journeyId
            ? `/api/v1/onboarding/journeys/${journeyId}`
            : '/api/v1/onboarding/journeys'

          const response = await fetchWithCsrf(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })

          if (!response.ok) throw new Error('Failed to save journey')

          await get().fetchJourneys()
          set({ isSavingJourney: false })
        } catch (error) {
          console.error('Failed to save journey:', error)
          set({ isSavingJourney: false })
        }
      },

      setSelectedJourneyId: (id) => set({ selectedJourneyId: id }),

      // =========================================================================
      // FIELD ACTIONS
      // =========================================================================

      fetchFields: async (journeyId) => {
        set({ isLoadingFields: true })
        try {
          const url = journeyId
            ? `/api/v1/onboarding/fields?journey_id=${journeyId}`
            : '/api/v1/onboarding/fields'

          const response = await fetch(url, {
            credentials: 'include',
          })
          if (!response.ok) throw new Error('Failed to fetch fields')
          const { data } = await response.json()
          set({ fields: data || [], isLoadingFields: false })
        } catch (error) {
          console.error('Failed to fetch fields:', error)
          set({ isLoadingFields: false })
        }
      },

      createField: async (data) => {
        set({ isSavingField: true })
        try {
          const response = await fetchWithCsrf('/api/v1/onboarding/fields', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })

          if (!response.ok) throw new Error('Failed to create field')

          await get().fetchFields()
          set({ isSavingField: false })
        } catch (error) {
          console.error('Failed to create field:', error)
          set({ isSavingField: false })
        }
      },

      updateField: async (id, data) => {
        set({ isSavingField: true })
        try {
          const response = await fetchWithCsrf(`/api/v1/onboarding/fields/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })

          if (!response.ok) throw new Error('Failed to update field')

          await get().fetchFields()
          set({ isSavingField: false })
        } catch (error) {
          console.error('Failed to update field:', error)
          set({ isSavingField: false })
        }
      },

      deleteField: async (id) => {
        set({ isSavingField: true })
        try {
          const response = await fetchWithCsrf(`/api/v1/onboarding/fields/${id}`, {
            method: 'DELETE',
          })

          if (!response.ok) throw new Error('Failed to delete field')

          await get().fetchFields()
          set({ isSavingField: false })
        } catch (error) {
          console.error('Failed to delete field:', error)
          set({ isSavingField: false })
        }
      },

      // =========================================================================
      // INSTANCE ACTIONS
      // =========================================================================

      fetchInstances: async (status) => {
        set({ isLoadingInstances: true })
        try {
          const url = status
            ? `/api/v1/onboarding/instances?status=${status}`
            : '/api/v1/onboarding/instances'

          const response = await fetch(url, {
            credentials: 'include',
          })
          if (!response.ok) throw new Error('Failed to fetch instances')
          const { data } = await response.json()
          set({ instances: data || [], isLoadingInstances: false })
        } catch (error) {
          console.error('Failed to fetch instances:', error)
          set({ isLoadingInstances: false })
        }
      },

      fetchInstance: async (id) => {
        set({ isLoadingInstances: true })
        try {
          const response = await fetch(`/api/v1/onboarding/instances/${id}`, {
            credentials: 'include',
          })
          if (!response.ok) throw new Error('Failed to fetch instance')
          const { data } = await response.json()
          set({ selectedInstance: data, isLoadingInstances: false })
        } catch (error) {
          console.error('Failed to fetch instance:', error)
          set({ isLoadingInstances: false })
        }
      },

      triggerOnboarding: async (data) => {
        set({ isTriggeringOnboarding: true })
        try {
          const response = await fetchWithCsrf('/api/v1/onboarding/instances', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })

          if (!response.ok) throw new Error('Failed to trigger onboarding')

          const { data: instance } = await response.json()
          await get().fetchInstances()
          set({ isTriggeringOnboarding: false })
          return instance
        } catch (error) {
          console.error('Failed to trigger onboarding:', error)
          set({ isTriggeringOnboarding: false })
          return null
        }
      },

      updateStageStatus: async (instanceId, stageId, status, platformStatuses) => {
        try {
          const response = await fetchWithCsrf(`/api/v1/onboarding/instances/${instanceId}/stage`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stage_id: stageId, status, platform_statuses: platformStatuses }),
          })

          if (!response.ok) throw new Error('Failed to update stage status')

          // Refresh the instances list and selected instance
          await get().fetchInstances()
          if (get().selectedInstanceId === instanceId) {
            await get().fetchInstance(instanceId)
          }
        } catch (error) {
          console.error('Failed to update stage status:', error)
        }
      },

      setSelectedInstanceId: (id) => {
        set({ selectedInstanceId: id })
        if (id) {
          get().fetchInstance(id)
        } else {
          set({ selectedInstance: null })
        }
      },

      // =========================================================================
      // UI ACTIONS
      // =========================================================================

      setActiveTab: (tab) => set({ activeTab: tab }),
    }),
    { name: 'onboarding-store' }
  )
)
