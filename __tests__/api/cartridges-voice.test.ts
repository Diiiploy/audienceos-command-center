import { describe, it, expect } from 'vitest'

describe('Voice Cartridge API Endpoints', () => {
  const testVoiceData = {
    name: 'professional-voice',
    displayName: 'Professional Voice',
    systemInstructions: 'Speak professionally and with confidence',
    voiceParams: {
      tone: 'professional',
      pace: 'moderate',
      energy: 'high',
    },
    isActive: true,
  }

  describe('POST /api/v1/cartridges/voice', () => {
    it('should create voice cartridge with valid data', async () => {
      const response = await fetch('http://localhost:3000/api/v1/cartridges/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testVoiceData),
        credentials: 'include',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.name).toBe(testVoiceData.name)
      expect(data.display_name).toBe(testVoiceData.displayName)
    })

    it('should reject missing voice name', async () => {
      const invalidData = { ...testVoiceData }
      delete invalidData.name

      const response = await fetch('http://localhost:3000/api/v1/cartridges/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
        credentials: 'include',
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('name')
    })

    it('should accept voice name as non-string', async () => {
      const invalidData = {
        ...testVoiceData,
        name: 12345, // Invalid: number instead of string
      }

      const response = await fetch('http://localhost:3000/api/v1/cartridges/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
        credentials: 'include',
      })

      expect(response.status).toBe(400)
    })

    it('should set is_active to true by default', async () => {
      const dataWithoutActive = {
        name: 'test-voice',
        displayName: 'Test Voice',
      }

      const response = await fetch('http://localhost:3000/api/v1/cartridges/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataWithoutActive),
        credentials: 'include',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.is_active).toBe(true)
    })

    it('should sanitize input strings', async () => {
      const dataWithHtml = {
        name: '<script>alert("xss")</script>',
        displayName: 'Test <img src=x onerror="alert(1)">',
        systemInstructions: 'Test <!-- comment -->',
      }

      const response = await fetch('http://localhost:3000/api/v1/cartridges/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataWithHtml),
        credentials: 'include',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.name).not.toContain('<script>')
      expect(data.display_name).not.toContain('onerror')
    })

    it('should upsert existing voice cartridge by name', async () => {
      // Create first
      const response1 = await fetch('http://localhost:3000/api/v1/cartridges/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testVoiceData),
        credentials: 'include',
      })

      expect(response1.status).toBe(200)

      // Update with same name
      const updatedData = {
        ...testVoiceData,
        displayName: 'Updated Professional Voice',
      }

      const response2 = await fetch('http://localhost:3000/api/v1/cartridges/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
        credentials: 'include',
      })

      expect(response2.status).toBe(200)
      const data = await response2.json()
      expect(data.display_name).toBe('Updated Professional Voice')
    })

    it('should handle voice_params as JSON object', async () => {
      const dataWithParams = {
        ...testVoiceData,
        voiceParams: {
          tone: 'casual',
          pace: 'fast',
          energy: 'low',
          customField: 'value',
        },
      }

      const response = await fetch('http://localhost:3000/api/v1/cartridges/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataWithParams),
        credentials: 'include',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.voice_params).toEqual(dataWithParams.voiceParams)
    })
  })
})
