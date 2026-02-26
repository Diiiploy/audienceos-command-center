/**
 * Settings Store Tests
 * Tests for stores/settings-store.ts - Zustand store for settings management
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from '@testing-library/react'

// Mock fetchWithCsrf
vi.mock('@/lib/csrf', () => ({
  fetchWithCsrf: vi.fn(),
}))

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('Settings Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct default active section', async () => {
      const { useSettingsStore } = await import('@/stores/settings-store')

      // Get initial state
      const state = useSettingsStore.getState()
      expect(state.activeSection).toBe('agency_profile')
    })

    it('should start with null agency settings', async () => {
      const { useSettingsStore } = await import('@/stores/settings-store')

      const state = useSettingsStore.getState()
      expect(state.agencySettings).toBeNull()
    })

    it('should start with empty team members array', async () => {
      const { useSettingsStore } = await import('@/stores/settings-store')

      const state = useSettingsStore.getState()
      expect(state.teamMembers).toEqual([])
    })

    it('should start with loading states as false', async () => {
      const { useSettingsStore } = await import('@/stores/settings-store')

      const state = useSettingsStore.getState()
      expect(state.isLoadingAgency).toBe(false)
      expect(state.isLoadingPreferences).toBe(false)
      expect(state.isLoadingMembers).toBe(false)
    })

    it('should start with no unsaved changes', async () => {
      const { useSettingsStore } = await import('@/stores/settings-store')

      const state = useSettingsStore.getState()
      expect(state.hasUnsavedChanges).toBe(false)
    })
  })

  describe('Section Navigation', () => {
    it('should update active section', async () => {
      const { useSettingsStore } = await import('@/stores/settings-store')

      act(() => {
        useSettingsStore.getState().setActiveSection('team_members')
      })

      expect(useSettingsStore.getState().activeSection).toBe('team_members')
    })

    it('should handle agency_profile section', async () => {
      const { useSettingsStore } = await import('@/stores/settings-store')

      act(() => {
        useSettingsStore.getState().setActiveSection('agency_profile')
      })

      expect(useSettingsStore.getState().activeSection).toBe('agency_profile')
    })

    it('should handle team_members section', async () => {
      const { useSettingsStore } = await import('@/stores/settings-store')

      act(() => {
        useSettingsStore.getState().setActiveSection('team_members')
      })

      expect(useSettingsStore.getState().activeSection).toBe('team_members')
    })

    it('should handle security section', async () => {
      const { useSettingsStore } = await import('@/stores/settings-store')

      act(() => {
        useSettingsStore.getState().setActiveSection('security')
      })

      expect(useSettingsStore.getState().activeSection).toBe('security')
    })

    it('should handle integrations section', async () => {
      const { useSettingsStore } = await import('@/stores/settings-store')

      act(() => {
        useSettingsStore.getState().setActiveSection('integrations')
      })

      expect(useSettingsStore.getState().activeSection).toBe('integrations')
    })
  })

  describe('Agency Settings Actions', () => {
    it('should set agency settings', async () => {
      const { useSettingsStore } = await import('@/stores/settings-store')

      const mockAgency = {
        id: 'agency-123',
        name: 'Test Agency',
        slug: 'test-agency',
        logo_url: null,
        domain: null,
        timezone: 'America/Los_Angeles',
        business_hours: { start: '09:00', end: '17:00' },
        pipeline_stages: ['Lead', 'Live'],
        health_thresholds: { yellow_days: 7, red_days: 14 },
      }

      act(() => {
        useSettingsStore.getState().setAgencySettings(mockAgency)
      })

      expect(useSettingsStore.getState().agencySettings).toEqual(mockAgency)
    })

    it('should update agency settings partially', async () => {
      const { useSettingsStore } = await import('@/stores/settings-store')

      // First set initial settings
      act(() => {
        useSettingsStore.getState().setAgencySettings({
          id: 'agency-123',
          name: 'Original Name',
          slug: 'original-name',
          logo_url: null,
          domain: null,
          timezone: 'UTC',
          business_hours: null,
          pipeline_stages: [],
          health_thresholds: { yellow_days: 7, red_days: 14 },
        })
      })

      // Then update partially
      act(() => {
        useSettingsStore.getState().updateAgencySettings({ name: 'Updated Name' })
      })

      expect(useSettingsStore.getState().agencySettings?.name).toBe('Updated Name')
      expect(useSettingsStore.getState().agencySettings?.id).toBe('agency-123')
      expect(useSettingsStore.getState().hasUnsavedChanges).toBe(true)
    })

    it('should set loading state for agency', async () => {
      const { useSettingsStore } = await import('@/stores/settings-store')

      act(() => {
        useSettingsStore.getState().setLoadingAgency(true)
      })

      expect(useSettingsStore.getState().isLoadingAgency).toBe(true)

      act(() => {
        useSettingsStore.getState().setLoadingAgency(false)
      })

      expect(useSettingsStore.getState().isLoadingAgency).toBe(false)
    })

    it('should set saving state for agency', async () => {
      const { useSettingsStore } = await import('@/stores/settings-store')

      act(() => {
        useSettingsStore.getState().setSavingAgency(true)
      })

      expect(useSettingsStore.getState().isSavingAgency).toBe(true)
    })
  })

  describe('Team Member Actions', () => {
    it('should set team members', async () => {
      const { useSettingsStore } = await import('@/stores/settings-store')

      const mockMembers = [
        {
          id: 'user-1',
          agency_id: 'agency-123',
          email: 'test1@test.com',
          first_name: 'Test',
          last_name: 'User',
          role: 'admin' as const,
          avatar_url: null,
          is_active: true,
          last_active_at: null,
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      act(() => {
        useSettingsStore.getState().setTeamMembers(mockMembers)
      })

      expect(useSettingsStore.getState().teamMembers).toEqual(mockMembers)
    })

    it('should add team member', async () => {
      const { useSettingsStore } = await import('@/stores/settings-store')

      // Reset
      act(() => {
        useSettingsStore.getState().setTeamMembers([])
      })

      const newMember = {
        id: 'user-2',
        agency_id: 'agency-123',
        email: 'new@test.com',
        first_name: 'New',
        last_name: 'Member',
        role: 'member' as const,
        avatar_url: null,
        is_active: true,
        last_active_at: null,
        created_at: '2024-01-01T00:00:00Z',
      }

      act(() => {
        useSettingsStore.getState().addTeamMember(newMember)
      })

      expect(useSettingsStore.getState().teamMembers).toContainEqual(newMember)
    })

    it('should update team member', async () => {
      const { useSettingsStore } = await import('@/stores/settings-store')

      // Set initial member
      act(() => {
        useSettingsStore.getState().setTeamMembers([
          {
            id: 'user-1',
            agency_id: 'agency-123',
            email: 'test@test.com',
            first_name: 'Original',
            last_name: 'Name',
            role: 'member' as const,
            avatar_url: null,
            is_active: true,
            last_active_at: null,
            created_at: '2024-01-01T00:00:00Z',
          },
        ])
      })

      act(() => {
        useSettingsStore.getState().updateTeamMember('user-1', { role: 'admin' })
      })

      const member = useSettingsStore.getState().teamMembers.find((m) => m.id === 'user-1')
      expect(member?.role).toBe('admin')
    })

    it('should remove team member', async () => {
      const { useSettingsStore } = await import('@/stores/settings-store')

      // Set members
      act(() => {
        useSettingsStore.getState().setTeamMembers([
          {
            id: 'user-1',
            agency_id: 'agency-123',
            email: 'test1@test.com',
            first_name: 'Test1',
            last_name: 'User',
            role: 'member' as const,
            avatar_url: null,
            is_active: true,
            last_active_at: null,
            created_at: '2024-01-01T00:00:00Z',
          },
          {
            id: 'user-2',
            agency_id: 'agency-123',
            email: 'test2@test.com',
            first_name: 'Test2',
            last_name: 'User',
            role: 'member' as const,
            avatar_url: null,
            is_active: true,
            last_active_at: null,
            created_at: '2024-01-01T00:00:00Z',
          },
        ])
      })

      act(() => {
        useSettingsStore.getState().removeTeamMember('user-1')
      })

      expect(useSettingsStore.getState().teamMembers).toHaveLength(1)
      expect(useSettingsStore.getState().teamMembers[0].id).toBe('user-2')
    })

    it('should clear selected member when removing selected member', async () => {
      const { useSettingsStore } = await import('@/stores/settings-store')

      act(() => {
        useSettingsStore.getState().setTeamMembers([
          {
            id: 'user-1',
            agency_id: 'agency-123',
            email: 'test@test.com',
            first_name: 'Test',
            last_name: 'User',
            role: 'member' as const,
            avatar_url: null,
            is_active: true,
            last_active_at: null,
            created_at: '2024-01-01T00:00:00Z',
          },
        ])
        useSettingsStore.getState().setSelectedMember('user-1')
      })

      expect(useSettingsStore.getState().selectedMemberId).toBe('user-1')

      act(() => {
        useSettingsStore.getState().removeTeamMember('user-1')
      })

      expect(useSettingsStore.getState().selectedMemberId).toBeNull()
    })
  })

  describe('Invitation Actions', () => {
    it('should set invitations', async () => {
      const { useSettingsStore } = await import('@/stores/settings-store')

      const mockInvitations = [
        {
          id: 'inv-1',
          agency_id: 'agency-1',
          email: 'invite@test.com',
          role: 'member' as const,
          token: 'token123',
          expires_at: '2024-12-31T00:00:00Z',
          accepted_at: null,
          created_by: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      act(() => {
        useSettingsStore.getState().setInvitations(mockInvitations)
      })

      expect(useSettingsStore.getState().invitations).toEqual(mockInvitations)
    })

    it('should add invitation', async () => {
      const { useSettingsStore } = await import('@/stores/settings-store')

      act(() => {
        useSettingsStore.getState().setInvitations([])
      })

      const newInvitation = {
        id: 'inv-2',
        agency_id: 'agency-1',
        email: 'new@test.com',
        role: 'admin' as const,
        token: 'newtoken',
        expires_at: '2024-12-31T00:00:00Z',
        accepted_at: null,
        created_by: 'user-1',
        created_at: '2024-01-01T00:00:00Z',
      }

      act(() => {
        useSettingsStore.getState().addInvitation(newInvitation)
      })

      expect(useSettingsStore.getState().invitations).toContainEqual(newInvitation)
    })

    it('should remove invitation', async () => {
      const { useSettingsStore } = await import('@/stores/settings-store')

      act(() => {
        useSettingsStore.getState().setInvitations([
          {
            id: 'inv-1',
            agency_id: 'agency-1',
            email: 'test@test.com',
            role: 'member' as const,
            token: 'token',
            expires_at: '2024-12-31T00:00:00Z',
            accepted_at: null,
            created_by: 'user-1',
            created_at: '2024-01-01T00:00:00Z',
          },
        ])
      })

      act(() => {
        useSettingsStore.getState().removeInvitation('inv-1')
      })

      expect(useSettingsStore.getState().invitations).toHaveLength(0)
    })
  })

  describe('Reset Action', () => {
    it('should reset all state to initial values', async () => {
      const { useSettingsStore } = await import('@/stores/settings-store')

      // Set various state
      act(() => {
        useSettingsStore.getState().setActiveSection('team_members')
        useSettingsStore.getState().setLoadingAgency(true)
        useSettingsStore.getState().setHasUnsavedChanges(true)
        useSettingsStore.getState().setTeamMembers([
          {
            id: 'user-1',
            agency_id: 'agency-123',
            email: 'test@test.com',
            first_name: 'Test',
            last_name: 'User',
            role: 'member' as const,
            avatar_url: null,
            is_active: true,
            last_active_at: null,
            created_at: '2024-01-01T00:00:00Z',
          },
        ])
      })

      // Reset
      act(() => {
        useSettingsStore.getState().reset()
      })

      const state = useSettingsStore.getState()
      expect(state.activeSection).toBe('agency_profile')
      expect(state.isLoadingAgency).toBe(false)
      expect(state.hasUnsavedChanges).toBe(false)
      expect(state.teamMembers).toEqual([])
      expect(state.agencySettings).toBeNull()
    })
  })

  describe('Unsaved Changes Tracking', () => {
    it('should track unsaved changes', async () => {
      const { useSettingsStore } = await import('@/stores/settings-store')

      act(() => {
        useSettingsStore.getState().setHasUnsavedChanges(true)
      })

      expect(useSettingsStore.getState().hasUnsavedChanges).toBe(true)

      act(() => {
        useSettingsStore.getState().setHasUnsavedChanges(false)
      })

      expect(useSettingsStore.getState().hasUnsavedChanges).toBe(false)
    })

    it('should set unsaved changes on agency settings update', async () => {
      const { useSettingsStore } = await import('@/stores/settings-store')

      // Reset and set initial settings
      act(() => {
        useSettingsStore.getState().reset()
        useSettingsStore.getState().setAgencySettings({
          id: 'agency-1',
          name: 'Test',
          slug: 'test',
          logo_url: null,
          domain: null,
          timezone: 'UTC',
          business_hours: null,
          pipeline_stages: [],
          health_thresholds: { yellow_days: 7, red_days: 14 },
        })
      })

      expect(useSettingsStore.getState().hasUnsavedChanges).toBe(false)

      act(() => {
        useSettingsStore.getState().updateAgencySettings({ name: 'New Name' })
      })

      expect(useSettingsStore.getState().hasUnsavedChanges).toBe(true)
    })
  })

  describe('User Preferences', () => {
    it('should set user preferences', async () => {
      const { useSettingsStore } = await import('@/stores/settings-store')

      const mockPreferences = {
        notifications: {
          email_alerts: true,
          email_tickets: false,
          email_mentions: true,
          digest_mode: false,
          muted_clients: [],
        },
        ai: {
          assistant_name: 'Diii',
          response_tone: 'professional' as const,
          response_length: 'detailed' as const,
        },
        display: {
          theme: 'dark' as const,
          sidebar_collapsed: false,
          default_view: 'dashboard' as const,
        },
      }

      act(() => {
        useSettingsStore.getState().setUserPreferences(mockPreferences)
      })

      expect(useSettingsStore.getState().userPreferences).toEqual(mockPreferences)
    })

    it('should update user preferences partially', async () => {
      const { useSettingsStore } = await import('@/stores/settings-store')

      // First set preferences
      act(() => {
        useSettingsStore.getState().setUserPreferences({
          notifications: {
            email_alerts: true,
            email_tickets: true,
            email_mentions: true,
            digest_mode: false,
            muted_clients: [],
          },
          ai: {
            assistant_name: 'Original',
            response_tone: 'professional',
            response_length: 'detailed',
          },
          display: {
            theme: 'dark',
            sidebar_collapsed: false,
            default_view: 'dashboard',
          },
        })
      })

      // Update
      act(() => {
        useSettingsStore.getState().updateUserPreferences({
          ai: {
            assistant_name: 'Updated',
            response_tone: 'casual',
            response_length: 'brief',
          },
        })
      })

      expect(useSettingsStore.getState().userPreferences?.ai.assistant_name).toBe('Updated')
      expect(useSettingsStore.getState().hasUnsavedChanges).toBe(true)
    })
  })
})
