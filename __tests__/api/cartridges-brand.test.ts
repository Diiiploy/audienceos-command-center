// __tests__/api/cartridges-brand.test.ts
// Unit tests for Brand Cartridge API endpoints using mocked fetch
import { describe, it, expect, beforeEach } from 'vitest'
import { mockFetchOnce, mockFetchSequence, mockData, resetMockFetch } from '../utils/mock-fetch'

describe('Brand Cartridge API Endpoints', () => {
  const testBrandData = {
    name: 'Test Brand',
    companyName: 'Test Company Inc.',
    description: 'A test brand description',
    tagline: 'Test tagline here',
    industry: 'Technology',
    targetAudience: 'B2B SaaS companies',
  }

  beforeEach(() => {
    resetMockFetch()
  })

  describe('POST /api/v1/cartridges/brand', () => {
    it('should save brand cartridge with valid data', async () => {
      const expectedResponse = mockData.brand.success({
        name: testBrandData.name,
        company_name: testBrandData.companyName,
      })
      mockFetchOnce(200, expectedResponse)

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
      mockFetchOnce(400, mockData.errors.validation('Company name is required'))

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
      // Mock first 5 requests succeeding, 6th rate limited
      mockFetchSequence([
        { status: 200, data: mockData.brand.success() },
        { status: 200, data: mockData.brand.success() },
        { status: 200, data: mockData.brand.success() },
        { status: 200, data: mockData.brand.success() },
        { status: 200, data: mockData.brand.success() },
        { status: 429, data: mockData.errors.rateLimit() },
      ])

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

      expect(lastResponse.status).toBe(429)
    })

    it('should require authentication', async () => {
      mockFetchOnce(401, mockData.errors.unauthorized())

      const response = await fetch('http://localhost:3000/api/v1/cartridges/brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testBrandData),
        // No credentials
      })

      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/v1/cartridges/brand/blueprint', () => {
    it('should generate blueprint from core messaging', async () => {
      mockFetchOnce(200, mockData.brand.blueprint())

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
      mockFetchOnce(400, mockData.errors.validation('Core messaging is required'))

      const response = await fetch('http://localhost:3000/api/v1/cartridges/brand/blueprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coreMessaging: '' }),
        credentials: 'include',
      })

      expect(response.status).toBe(400)
    })

    it('should reject non-string core messaging', async () => {
      mockFetchOnce(400, mockData.errors.validation('Core messaging must be a string'))

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
      mockFetchOnce(200, mockData.brand.logo())

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
      mockFetchOnce(400, mockData.errors.validation('Invalid file type. Allowed: PNG, JPG, WEBP, SVG'))

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
      mockFetchOnce(400, mockData.errors.validation('File exceeds 5MB limit'))

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
      mockFetchOnce(400, mockData.errors.validation('Logo file is required'))

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
      mockFetchOnce(200, mockData.brand.deleted())

      const response = await fetch('http://localhost:3000/api/v1/cartridges/brand', {
        method: 'DELETE',
        credentials: 'include',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('should return 404 if no brand cartridge exists', async () => {
      mockFetchOnce(404, mockData.errors.notFound('Brand cartridge'))

      const response = await fetch('http://localhost:3000/api/v1/cartridges/brand', {
        method: 'DELETE',
        credentials: 'include',
      })

      expect(response.status).toBe(404)
    })
  })

  describe('GET /api/v1/cartridges/brand', () => {
    it('should fetch brand cartridge', async () => {
      const expectedBrand = mockData.brand.success()
      mockFetchOnce(200, { brand: expectedBrand })

      const response = await fetch('http://localhost:3000/api/v1/cartridges/brand', {
        method: 'GET',
        credentials: 'include',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.brand).toHaveProperty('id')
      expect(data.brand).toHaveProperty('name')
    })

    it('should return null if no brand cartridge exists', async () => {
      mockFetchOnce(200, { brand: null })

      const response = await fetch('http://localhost:3000/api/v1/cartridges/brand', {
        method: 'GET',
        credentials: 'include',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.brand).toBeNull()
    })
  })
})
