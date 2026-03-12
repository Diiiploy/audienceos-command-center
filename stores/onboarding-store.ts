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
    stage?: string | null
    health_status?: string | null
  } | null
  journey?: {
    id: string
    name: string
    stages: Json
    welcome_video_url?: string | null
    ai_analysis_prompt?: string | null
    access_delegation_config?: Json
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
  email_sent?: boolean
  email_message_id?: string
}

export interface Stage {
  id: string
  name: string
  order: number
  platforms?: string[]
}

export interface AccessDelegationItem {
  id: string
  name: string
  description: string
  email: string
  instructions_url?: string
  required: boolean
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
  savingFieldIds: Record<string, boolean>
  isReordering: boolean
  fieldSaveVersions: Record<string, number>
  lastSaveAt: number | null

  // Onboarding instances (active onboardings)
  instances: OnboardingInstanceWithRelations[]
  selectedInstanceId: string | null
  selectedInstance: OnboardingInstanceWithRelations | null
  isLoadingInstances: boolean
  isLoadingInstance: boolean // [1C] Separate flag for single instance detail
  isTriggeringOnboarding: boolean

  // Notification tracking [1F]
  lastViewedInstances: Record<string, string>

  // UI state
  activeTab: 'active' | 'journey' | 'form-builder'

  // Actions - Journeys
  fetchJourneys: () => Promise<void>
  saveJourney: (data: Partial<OnboardingJourney>) => Promise<void>
  createJourney: (name: string) => Promise<void> // [1D]
  setSelectedJourneyId: (id: string | null) => void

  // Actions - Fields
  fetchFields: (journeyId?: string) => Promise<void>
  createField: (data: Partial<IntakeFormField>) => Promise<void>
  updateField: (id: string, data: Partial<IntakeFormField>) => Promise<void>
  deleteField: (id: string) => Promise<void>
  reorderFields: (updates: Array<{ id: string; sort_order: number }>) => Promise<void>

  // Actions - Instances
  fetchInstances: (status?: string) => Promise<void>
  fetchInstance: (id: string) => Promise<void>
  triggerOnboarding: (data: {
    client_name: string
    client_email: string
    client_tier?: string
    journey_id?: string
    website_url?: string
    assigned_to_user_id?: string
    seo_data?: {
      summary: unknown
      competitors: unknown[]
      fetched_at: string
    }
  }) => Promise<OnboardingInstanceWithRelations | null>
  updateStageStatus: (instanceId: string, stageId: string, status: string, platformStatuses?: Record<string, string>) => Promise<void>
  setSelectedInstanceId: (id: string | null) => void
  resendEmail: (instanceId: string) => Promise<boolean> // [1E]

  // Actions - Notifications [1F]
  markInstanceViewed: (instanceId: string) => void
  hasUnseenUpdates: (instance: OnboardingInstanceWithRelations) => boolean

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
      savingFieldIds: {},
      isReordering: false,
      fieldSaveVersions: {},
      lastSaveAt: null,

      instances: [],
      selectedInstanceId: null,
      selectedInstance: null,
      isLoadingInstances: false,
      isLoadingInstance: false, // [1C]
      isTriggeringOnboarding: false,

      // [1F] Load last-viewed timestamps from localStorage
      lastViewedInstances: typeof window !== 'undefined'
        ? JSON.parse(localStorage.getItem('onboarding-last-viewed') || '{}')
        : {},

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

      // [1A] saveJourney now propagates errors instead of swallowing them
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

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
            throw new Error(errorData.error || 'Failed to save journey')
          }

          await get().fetchJourneys()
          set({ isSavingJourney: false })
        } catch (error) {
          console.error('Failed to save journey:', error)
          set({ isSavingJourney: false })
          throw error // Propagate so callers can show error toasts
        }
      },

      // [1D] Create a new journey with default stages
      createJourney: async (name) => {
        set({ isSavingJourney: true })
        try {
          const response = await fetchWithCsrf('/api/v1/onboarding/journeys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name,
              stages: [
                { id: crypto.randomUUID(), name: 'Intake Form', order: 1 },
                { id: crypto.randomUUID(), name: 'Access Verification', order: 2 },
                { id: crypto.randomUUID(), name: 'Platform Setup', order: 3 },
                { id: crypto.randomUUID(), name: 'Audit & Launch', order: 4 },
              ],
            }),
          })

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
            throw new Error(errorData.error || 'Failed to create journey')
          }

          const { data: journey } = await response.json()
          await get().fetchJourneys()
          set({ selectedJourneyId: journey.id, isSavingJourney: false })
        } catch (error) {
          console.error('Failed to create journey:', error)
          set({ isSavingJourney: false })
          throw error
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
        // Optimistic update - add field to UI immediately with temp ID
        const tempId = `temp-${Date.now()}`
        const tempField: IntakeFormField = {
          id: tempId,
          agency_id: '',
          journey_id: null,
          field_label: data.field_label || 'New Field',
          field_type: (data.field_type as IntakeFormField['field_type']) || 'text',
          placeholder: data.placeholder || null,
          is_required: data.is_required ?? false,
          is_active: true,
          options: null,
          sort_order: data.sort_order ?? 0,
          validation_regex: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        set({
          fields: [...get().fields, tempField],
          savingFieldIds: { ...get().savingFieldIds, [tempId]: true },
        })

        try {
          const response = await fetchWithCsrf('/api/v1/onboarding/fields', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })

          if (!response.ok) throw new Error('Failed to create field')

          const { data: newField } = await response.json()

          // Replace temp field with real field from server
          const { [tempId]: _, ...restSaving } = get().savingFieldIds
          set({
            fields: get().fields.map(f => f.id === tempId ? newField : f),
            savingFieldIds: restSaving,
            lastSaveAt: Date.now(),
          })
        } catch (error) {
          console.error('Failed to create field:', error)
          // Remove temp field on error
          const { [tempId]: _, ...restSaving } = get().savingFieldIds
          set({
            fields: get().fields.filter(f => f.id !== tempId),
            savingFieldIds: restSaving,
          })
        }
      },

      updateField: async (id, data) => {
        // Version guard — prevents stale PATCH responses from overwriting newer optimistic state
        const saveVersion = (get().fieldSaveVersions[id] ?? 0) + 1
        const previousFields = get().fields

        // 1. Optimistic update — merge immediately + bump version
        set({
          fields: previousFields.map(f => f.id === id ? { ...f, ...data } : f),
          savingFieldIds: { ...get().savingFieldIds, [id]: true },
          fieldSaveVersions: { ...get().fieldSaveVersions, [id]: saveVersion },
        })

        try {
          const response = await fetchWithCsrf(`/api/v1/onboarding/fields/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          })
          if (!response.ok) throw new Error('Failed to update field')

          const { data: serverField } = await response.json()

          // 2. Only apply server state if no newer optimistic write happened
          if (get().fieldSaveVersions[id] === saveVersion) {
            set({
              fields: get().fields.map(f => f.id === id ? serverField : f),
              lastSaveAt: Date.now(),
            })
          }
          // If version advanced, a newer optimistic write is already in the store — skip
        } catch (error) {
          console.error('Failed to update field:', error)
          // 3. Rollback only if no newer write superseded us
          if (get().fieldSaveVersions[id] === saveVersion) {
            set({ fields: previousFields })
          }
        } finally {
          const { [id]: _, ...rest } = get().savingFieldIds
          set({ savingFieldIds: rest })
        }
      },

      deleteField: async (id) => {
        const previousFields = get().fields

        // Optimistic — remove from array immediately
        set({
          fields: previousFields.filter(f => f.id !== id),
          savingFieldIds: { ...get().savingFieldIds, [id]: true },
        })

        try {
          const response = await fetchWithCsrf(`/api/v1/onboarding/fields/${id}`, {
            method: 'DELETE',
          })

          if (!response.ok) throw new Error('Failed to delete field')

          set({ lastSaveAt: Date.now() })
        } catch (error) {
          console.error('Failed to delete field:', error)
          // Rollback — restore the deleted field
          set({ fields: previousFields })
        } finally {
          const { [id]: _, ...rest } = get().savingFieldIds
          set({ savingFieldIds: rest })
        }
      },

      reorderFields: async (updates) => {
        // Optimistic update - reorder immediately in UI
        const currentFields = get().fields
        const updatedFields = currentFields.map(field => {
          const update = updates.find(u => u.id === field.id)
          return update ? { ...field, sort_order: update.sort_order } : field
        })

        set({ fields: updatedFields, isReordering: true })

        try {
          // Batch update all sort orders
          await Promise.all(
            updates.map(update =>
              fetchWithCsrf(`/api/v1/onboarding/fields/${update.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sort_order: update.sort_order }),
              })
            )
          )
          set({ isReordering: false, lastSaveAt: Date.now() })
        } catch (error) {
          console.error('Failed to reorder fields:', error)
          // Revert on error
          set({ fields: currentFields, isReordering: false })
        }
      },

      // =========================================================================
      // INSTANCE ACTIONS
      // =========================================================================

      fetchInstances: async (status) => {
        // [1C] Only show full spinner if no data loaded yet
        const hasExistingData = get().instances.length > 0
        if (!hasExistingData) set({ isLoadingInstances: true })

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

      // [1C] Uses isLoadingInstance (singular) instead of isLoadingInstances
      fetchInstance: async (id) => {
        set({ isLoadingInstance: true })
        try {
          const response = await fetch(`/api/v1/onboarding/instances/${id}`, {
            credentials: 'include',
          })
          if (!response.ok) throw new Error('Failed to fetch instance')
          const { data } = await response.json()
          set({ selectedInstance: data, isLoadingInstance: false })
        } catch (error) {
          console.error('Failed to fetch instance:', error)
          set({ isLoadingInstance: false })
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

      // [1B] Also updates instances array for accordion board sync
      updateStageStatus: async (instanceId, stageId, status, platformStatuses) => {
        // Optimistic update for selectedInstance
        const currentInstance = get().selectedInstance
        if (currentInstance && currentInstance.id === instanceId) {
          const updatedStageStatuses = currentInstance.stage_statuses?.map(s =>
            s.stage_id === stageId
              ? { ...s, status: status as 'pending' | 'in_progress' | 'completed' | 'blocked', updated_at: new Date().toISOString() }
              : s
          )
          set({
            selectedInstance: { ...currentInstance, stage_statuses: updatedStageStatuses }
          })
        }

        // [1B] Also update the instances array so accordion board stays in sync
        const updatedInstances = get().instances.map(inst => {
          if (inst.id !== instanceId) return inst
          return {
            ...inst,
            stage_statuses: inst.stage_statuses?.map(s =>
              s.stage_id === stageId
                ? { ...s, status: status as 'pending' | 'in_progress' | 'completed' | 'blocked', updated_at: new Date().toISOString() }
                : s
            )
          }
        })
        set({ instances: updatedInstances })

        try {
          const response = await fetchWithCsrf(`/api/v1/onboarding/instances/${instanceId}/stage`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stage_id: stageId, status, platform_statuses: platformStatuses }),
          })

          if (!response.ok) {
            // Revert on error - refetch to get correct state
            await get().fetchInstance(instanceId)
            throw new Error('Failed to update stage status')
          }

          // Background refresh - don't await, just fire
          get().fetchInstances()
        } catch (error) {
          console.error('Failed to update stage status:', error)
        }
      },

      setSelectedInstanceId: (id) => {
        set({ selectedInstanceId: id })
        if (id) {
          // [1F] Mark as viewed when selected
          get().markInstanceViewed(id)
          get().fetchInstance(id)
        } else {
          set({ selectedInstance: null })
        }
      },

      // [1E] Resend onboarding email
      resendEmail: async (instanceId) => {
        try {
          const response = await fetchWithCsrf(`/api/v1/onboarding/instances/${instanceId}/resend-email`, {
            method: 'POST',
          })
          if (!response.ok) {
            const err = await response.json().catch(() => ({}))
            throw new Error(err.error || 'Failed to resend email')
          }
          return true
        } catch (error) {
          console.error('Failed to resend email:', error)
          return false
        }
      },

      // =========================================================================
      // NOTIFICATION ACTIONS [1F]
      // =========================================================================

      markInstanceViewed: (instanceId) => {
        const updated = { ...get().lastViewedInstances, [instanceId]: new Date().toISOString() }
        set({ lastViewedInstances: updated })
        if (typeof window !== 'undefined') {
          localStorage.setItem('onboarding-last-viewed', JSON.stringify(updated))
        }
      },

      hasUnseenUpdates: (instance) => {
        const lastViewed = get().lastViewedInstances[instance.id]
        if (!lastViewed) return true // Never viewed = new
        return instance.stage_statuses?.some(
          s => s.updated_at && new Date(s.updated_at) > new Date(lastViewed)
        ) ?? false
      },

      // =========================================================================
      // UI ACTIONS
      // =========================================================================

      setActiveTab: (tab) => set({ activeTab: tab }),
    }),
    { name: 'onboarding-store' }
  )
)
