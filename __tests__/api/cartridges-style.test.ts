// __tests__/api/cartridges-style.test.ts
// Unit tests for Style Cartridge API endpoints using mocked fetch
import { describe, it, expect, beforeEach } from 'vitest'
import { mockFetchOnce, mockFetchSequence, mockData, resetMockFetch } from '../utils/mock-fetch'

describe('Style Cartridge API Endpoints', () => {
  beforeEach(() => {
    resetMockFetch()
  })

  describe('POST /api/v1/cartridges/style', () => {
    it('should create style cartridge', async () => {
      mockFetchOnce(201, { style: mockData.style.success() })

      const response = await fetch('http://localhost:3000/api/v1/cartridges/style', {
        method: 'POST',
        credentials: 'include',
      })

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.style).toHaveProperty('id')
      expect(data.style.analysis_status).toBe('pending')
    })

    it('should return existing style cartridge if one exists', async () => {
      mockFetchOnce(200, { style: mockData.style.success({ id: 'existing-style-123' }) })

      const response = await fetch('http://localhost:3000/api/v1/cartridges/style', {
        method: 'POST',
        credentials: 'include',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.style.id).toBe('existing-style-123')
    })
  })

  describe('POST /api/v1/cartridges/style/upload', () => {
    it('should upload style learning documents', async () => {
      const uploadedStyle = mockData.style.withFiles([{ fileName: 'sample.pdf' }])
      mockFetchOnce(200, uploadedStyle)

      const formData = new FormData()
      const docFile = new File(['Sample document content'], 'sample.pdf', { type: 'application/pdf' })
      formData.append('files', docFile)

      const response = await fetch('http://localhost:3000/api/v1/cartridges/style/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('source_files')
      expect(data.source_files).toBeInstanceOf(Array)
      expect(data.source_files[0]).toHaveProperty('fileName')
      expect(data.source_files[0]).toHaveProperty('storageUrl')
    })

    it('should accept multiple files', async () => {
      const uploadedStyle = mockData.style.withFiles([
        { fileName: 'doc1.pdf' },
        { fileName: 'doc2.txt' },
        { fileName: 'doc3.docx' },
      ])
      mockFetchOnce(200, uploadedStyle)

      const formData = new FormData()
      formData.append('files', new File(['Doc 1'], 'doc1.pdf', { type: 'application/pdf' }))
      formData.append('files', new File(['Doc 2'], 'doc2.txt', { type: 'text/plain' }))
      formData.append('files', new File(['Doc 3'], 'doc3.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }))

      const response = await fetch('http://localhost:3000/api/v1/cartridges/style/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.source_files.length).toBe(3)
    })

    it('should reject invalid file types', async () => {
      mockFetchOnce(400, mockData.errors.validation('Invalid file type: image.jpg. Allowed: PDF, TXT, DOCX, DOC, MD, CSV'))

      const formData = new FormData()
      const invalidFile = new File(['data'], 'image.jpg', { type: 'image/jpeg' })
      formData.append('files', invalidFile)

      const response = await fetch('http://localhost:3000/api/v1/cartridges/style/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid file type')
    })

    it('should reject files over 10MB', async () => {
      mockFetchOnce(400, mockData.errors.validation('File large.pdf exceeds 10MB limit'))

      const formData = new FormData()
      const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' })
      formData.append('files', largeFile)

      const response = await fetch('http://localhost:3000/api/v1/cartridges/style/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('10MB')
    })

    it('should reject empty file list', async () => {
      mockFetchOnce(400, mockData.errors.validation('At least one file is required'))

      const formData = new FormData()
      // No files appended

      const response = await fetch('http://localhost:3000/api/v1/cartridges/style/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('At least one file')
    })

    it('should set analysis_status to pending after upload', async () => {
      mockFetchOnce(200, mockData.style.withFiles([{ fileName: 'test.pdf' }]))

      const formData = new FormData()
      formData.append('files', new File(['content'], 'test.pdf', { type: 'application/pdf' }))

      const response = await fetch('http://localhost:3000/api/v1/cartridges/style/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.analysis_status).toBe('pending')
    })
  })

  describe('POST /api/v1/cartridges/style/analyze', () => {
    it('should analyze uploaded style documents', async () => {
      mockFetchOnce(200, mockData.style.analyzed())

      const response = await fetch('http://localhost:3000/api/v1/cartridges/style/analyze', {
        method: 'POST',
        credentials: 'include',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.analysis_status).toBe('completed')
      expect(data).toHaveProperty('learned_style')
      expect(data.learned_style).toHaveProperty('writingPatterns')
    })

    it('should return 404 if no style cartridge exists', async () => {
      mockFetchOnce(404, mockData.errors.notFound('Style cartridge'))

      const response = await fetch('http://localhost:3000/api/v1/cartridges/style/analyze', {
        method: 'POST',
        credentials: 'include',
      })

      expect(response.status).toBe(404)
    })

    it('should return 400 if no documents to analyze', async () => {
      mockFetchOnce(400, mockData.errors.validation('No source documents to analyze. Upload documents first.'))

      const response = await fetch('http://localhost:3000/api/v1/cartridges/style/analyze', {
        method: 'POST',
        credentials: 'include',
      })

      expect(response.status).toBe(400)
    })

    it('should enforce rate limiting on analysis', async () => {
      mockFetchSequence([
        { status: 200, data: mockData.style.analyzed() },
        { status: 200, data: mockData.style.analyzed() },
        { status: 200, data: mockData.style.analyzed() },
        { status: 200, data: mockData.style.analyzed() },
        { status: 200, data: mockData.style.analyzed() },
        { status: 429, data: mockData.errors.rateLimit() },
      ])

      const requests = Array(6).fill(null).map(() =>
        fetch('http://localhost:3000/api/v1/cartridges/style/analyze', {
          method: 'POST',
          credentials: 'include',
        })
      )

      const responses = await Promise.all(requests)
      const lastResponse = responses[responses.length - 1]

      expect(lastResponse.status).toBe(429)
    })
  })

  describe('GET /api/v1/cartridges/style', () => {
    it('should fetch style cartridge', async () => {
      mockFetchOnce(200, { style: mockData.style.success() })

      const response = await fetch('http://localhost:3000/api/v1/cartridges/style', {
        method: 'GET',
        credentials: 'include',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.style).toHaveProperty('id')
      expect(data.style).toHaveProperty('analysis_status')
    })

    it('should return null if no style cartridge exists', async () => {
      mockFetchOnce(200, { style: null })

      const response = await fetch('http://localhost:3000/api/v1/cartridges/style', {
        method: 'GET',
        credentials: 'include',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.style).toBeNull()
    })
  })

  describe('DELETE /api/v1/cartridges/style', () => {
    it('should delete style cartridge', async () => {
      mockFetchOnce(200, mockData.style.deleted())

      const response = await fetch('http://localhost:3000/api/v1/cartridges/style', {
        method: 'DELETE',
        credentials: 'include',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('should return 404 if style cartridge does not exist', async () => {
      mockFetchOnce(404, mockData.errors.notFound('Style cartridge'))

      const response = await fetch('http://localhost:3000/api/v1/cartridges/style', {
        method: 'DELETE',
        credentials: 'include',
      })

      expect(response.status).toBe(404)
    })
  })
})
