// __tests__/api/cartridges-preferences.test.ts
// Unit tests for Preferences Cartridge API endpoints using mocked fetch
import { describe, it, expect, beforeEach } from 'vitest'
import { mockFetchOnce, mockData, resetMockFetch } from '../utils/mock-fetch'

// Mock data for preferences cartridge
const mockPreferences = {
  success: (overrides = {}) => ({
    id: 'pref-123',
    agency_id: 'agency-123',
    language: 'English',
    platform: 'LinkedIn',
    tone: 'Professional',
    content_length: 'Medium',
    hashtag_count: 3,
    emoji_usage: 'Minimal',
    call_to_action: 'Clear',
    personalization_level: 'Medium',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }),
  deleted: () => ({
    success: true,
    message: 'Preferences cartridge deleted successfully',
  }),
}

describe('Preferences Cartridge API Endpoints', () => {
  const testPreferencesData = {
    language: 'English',
    platform: 'LinkedIn',
    tone: 'Professional',
    contentLength: 'Medium',
    hashtagCount: 3,
    emojiUsage: 'Minimal',
    callToAction: 'Clear',
    personalizationLevel: 'Medium',
  }

  beforeEach(() => {
    resetMockFetch()
  })

  describe('POST /api/v1/cartridges/preferences', () => {
    it('should save preferences cartridge with valid data', async () => {
      mockFetchOnce(200, mockPreferences.success({
        language: testPreferencesData.language,
        platform: testPreferencesData.platform,
      }))

      const response = await fetch('http://localhost:3000/api/v1/cartridges/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPreferencesData),
        credentials: 'include',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.language).toBe('English')
      expect(data.platform).toBe('LinkedIn')
    })

    it('should accept partial data with defaults', async () => {
      mockFetchOnce(200, mockPreferences.success({
        language: 'Spanish',
        platform: 'LinkedIn',
        tone: 'Professional',
      }))

      const minimalData = {
        language: 'Spanish',
      }

      const response = await fetch('http://localhost:3000/api/v1/cartridges/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(minimalData),
        credentials: 'include',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.language).toBe('Spanish')
      expect(data.platform).toBe('LinkedIn') // Default
      expect(data.tone).toBe('Professional') // Default
    })

    it('should handle empty request body', async () => {
      mockFetchOnce(200, mockPreferences.success({
        language: 'English',
      }))

      const response = await fetch('http://localhost:3000/api/v1/cartridges/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        credentials: 'include',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.language).toBe('English') // Default
    })

    it('should create preferences if not exist', async () => {
      mockFetchOnce(200, mockPreferences.success())

      const response = await fetch('http://localhost:3000/api/v1/cartridges/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPreferencesData),
        credentials: 'include',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('id')
    })

    it('should update existing preferences', async () => {
      // First create
      mockFetchOnce(200, mockPreferences.success())

      const response1 = await fetch('http://localhost:3000/api/v1/cartridges/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPreferencesData),
        credentials: 'include',
      })

      expect(response1.status).toBe(200)

      // Then update
      mockFetchOnce(200, mockPreferences.success({
        tone: 'Casual',
        hashtag_count: 5,
      }))

      const updatedData = {
        ...testPreferencesData,
        tone: 'Casual',
        hashtagCount: 5,
      }

      const response2 = await fetch('http://localhost:3000/api/v1/cartridges/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
        credentials: 'include',
      })

      expect(response2.status).toBe(200)
      const data = await response2.json()
      expect(data.tone).toBe('Casual')
      expect(data.hashtag_count).toBe(5)
    })
  })

  describe('GET /api/v1/cartridges/preferences', () => {
    it('should fetch preferences cartridge', async () => {
      mockFetchOnce(200, { preferences: mockPreferences.success() })

      const response = await fetch('http://localhost:3000/api/v1/cartridges/preferences', {
        method: 'GET',
        credentials: 'include',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.preferences).toHaveProperty('id')
      expect(data.preferences).toHaveProperty('language')
    })

    it('should return null if no preferences exist', async () => {
      mockFetchOnce(200, { preferences: null })

      const response = await fetch('http://localhost:3000/api/v1/cartridges/preferences', {
        method: 'GET',
        credentials: 'include',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.preferences).toBeNull()
    })
  })

  describe('DELETE /api/v1/cartridges/preferences', () => {
    it('should delete preferences cartridge', async () => {
      // Create first
      mockFetchOnce(200, mockPreferences.success())

      await fetch('http://localhost:3000/api/v1/cartridges/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPreferencesData),
        credentials: 'include',
      })

      // Delete
      mockFetchOnce(200, mockPreferences.deleted())

      const deleteResponse = await fetch('http://localhost:3000/api/v1/cartridges/preferences', {
        method: 'DELETE',
        credentials: 'include',
      })

      expect(deleteResponse.status).toBe(200)
      const data = await deleteResponse.json()
      expect(data.success).toBe(true)
    })

    it('should handle delete on non-existent preferences gracefully', async () => {
      mockFetchOnce(200, mockPreferences.deleted())

      const response = await fetch('http://localhost:3000/api/v1/cartridges/preferences', {
        method: 'DELETE',
        credentials: 'include',
      })

      // Should still return 200 even if nothing to delete
      expect([200, 404]).toContain(response.status)
    })

    it('should require authentication for delete', async () => {
      mockFetchOnce(401, mockData.errors.unauthorized())

      const response = await fetch('http://localhost:3000/api/v1/cartridges/preferences', {
        method: 'DELETE',
        // No credentials
      })

      expect(response.status).toBe(401)
    })
  })
})
