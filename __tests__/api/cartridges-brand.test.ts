import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createRouteHandlerClient } from '@/lib/supabase'
import { cookies } from 'next/headers'

describe('Brand Cartridge API Endpoints', () => {
  const testAgencyId = 'test-agency-123'
  const testBrandData = {
    name: 'Test Brand',
    companyName: 'Test Company Inc.',
    description: 'A test brand description',
    tagline: 'Test tagline here',
    industry: 'Technology',
    targetAudience: 'B2B SaaS companies',
  }

  describe('POST /api/v1/cartridges/brand', () => {
    it('should save brand cartridge with valid data', async () => {
      const response = await fetch('http://localhost:3000/api/v1/cartridges/brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testBrandData),
        credentials: 'include',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('id')
      expect(data.name).toBe(testBrandData.name)
    })

    it('should reject missing required fields', async () => {
      const response = await fetch('http://localhost:3000/api/v1/cartridges/brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'Missing name' }),
        credentials: 'include',
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBeDefined()
    })

    it('should enforce rate limiting', async () => {
      // Make 6 requests rapidly (limit is 5)
      const requests = Array(6).fill(null).map(() =>
        fetch('http://localhost:3000/api/v1/cartridges/brand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testBrandData),
          credentials: 'include',
        })
      )

      const responses = await Promise.all(requests)
      const lastResponse = responses[responses.length - 1]

      expect(lastResponse.status).toBe(429) // Too Many Requests
    })

    it('should require CSRF token', async () => {
      const response = await fetch('http://localhost:3000/api/v1/cartridges/brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testBrandData),
        // No credentials, no CSRF token
      })

      expect(response.status).toBe(403)
    })
  })

  describe('POST /api/v1/cartridges/brand/blueprint', () => {
    it('should generate blueprint from core messaging', async () => {
      const response = await fetch('http://localhost:3000/api/v1/cartridges/brand/blueprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coreMessaging: 'We help agencies manage clients better with AI-powered tools and insights.',
        }),
        credentials: 'include',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('blueprint')
      expect(data.blueprint).toHaveProperty('bio')
      expect(data.blueprint).toHaveProperty('positioning')
      expect(data.blueprint).toHaveProperty('offer')
    })

    it('should reject empty core messaging', async () => {
      const response = await fetch('http://localhost:3000/api/v1/cartridges/brand/blueprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coreMessaging: '' }),
        credentials: 'include',
      })

      expect(response.status).toBe(400)
    })

    it('should reject non-string core messaging', async () => {
      const response = await fetch('http://localhost:3000/api/v1/cartridges/brand/blueprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coreMessaging: 123 }),
        credentials: 'include',
      })

      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/v1/cartridges/brand/logo', () => {
    it('should upload brand logo', async () => {
      const formData = new FormData()
      const logoFile = new File(['fake image data'], 'logo.png', { type: 'image/png' })
      formData.append('logo', logoFile)

      const response = await fetch('http://localhost:3000/api/v1/cartridges/brand/logo', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('logoUrl')
      expect(data.logoUrl).toContain('.png')
    })

    it('should reject invalid file types', async () => {
      const formData = new FormData()
      const invalidFile = new File(['data'], 'document.pdf', { type: 'application/pdf' })
      formData.append('logo', invalidFile)

      const response = await fetch('http://localhost:3000/api/v1/cartridges/brand/logo', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid file type')
    })

    it('should reject files over 5MB', async () => {
      const formData = new FormData()
      const largeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], 'large.png', { type: 'image/png' })
      formData.append('logo', largeFile)

      const response = await fetch('http://localhost:3000/api/v1/cartridges/brand/logo', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('5MB')
    })

    it('should reject missing file', async () => {
      const formData = new FormData()
      // No file appended

      const response = await fetch('http://localhost:3000/api/v1/cartridges/brand/logo', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Logo file is required')
    })
  })

  describe('DELETE /api/v1/cartridges/brand', () => {
    it('should delete brand cartridge', async () => {
      const response = await fetch('http://localhost:3000/api/v1/cartridges/brand', {
        method: 'DELETE',
        credentials: 'include',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })
  })
})
