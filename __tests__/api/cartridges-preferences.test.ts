import { describe, it, expect } from 'vitest'

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

  describe('POST /api/v1/cartridges/preferences', () => {
    it('should save preferences cartridge with valid data', async () => {
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
      // Create first
      const response1 = await fetch('http://localhost:3000/api/v1/cartridges/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPreferencesData),
        credentials: 'include',
      })

      expect(response1.status).toBe(200)

      // Update
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

  describe('DELETE /api/v1/cartridges/preferences', () => {
    it('should delete preferences cartridge', async () => {
      // Create first
      await fetch('http://localhost:3000/api/v1/cartridges/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPreferencesData),
        credentials: 'include',
      })

      // Delete
      const deleteResponse = await fetch('http://localhost:3000/api/v1/cartridges/preferences', {
        method: 'DELETE',
        credentials: 'include',
      })

      expect(deleteResponse.status).toBe(200)
      const data = await deleteResponse.json()
      expect(data.success).toBe(true)
    })

    it('should handle delete on non-existent preferences gracefully', async () => {
      const response = await fetch('http://localhost:3000/api/v1/cartridges/preferences', {
        method: 'DELETE',
        credentials: 'include',
      })

      // Should still return 200 even if nothing to delete
      expect([200, 404]).toContain(response.status)
    })

    it('should require CSRF token for delete', async () => {
      const response = await fetch('http://localhost:3000/api/v1/cartridges/preferences', {
        method: 'DELETE',
        // No credentials, no CSRF token
      })

      expect(response.status).toBe(403)
    })
  })
})
