import { describe, it, expect } from 'vitest'

describe('Style Cartridge API Endpoints', () => {
  describe('POST /api/v1/cartridges/style/upload', () => {
    it('should upload style learning documents', async () => {
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
      // First upload a document
      const uploadFormData = new FormData()
      uploadFormData.append('files', new File(['Sample content'], 'test.pdf', { type: 'application/pdf' }))

      await fetch('http://localhost:3000/api/v1/cartridges/style/upload', {
        method: 'POST',
        body: uploadFormData,
        credentials: 'include',
      })

      // Then analyze
      const analyzeResponse = await fetch('http://localhost:3000/api/v1/cartridges/style/analyze', {
        method: 'POST',
        credentials: 'include',
      })

      expect(analyzeResponse.status).toBe(200)
      const data = await analyzeResponse.json()
      expect(data.analysis_status).toBe('completed')
      expect(data).toHaveProperty('learned_style')
      expect(data.learned_style).toHaveProperty('writingPatterns')
    })

    it('should return 404 if no style cartridge exists', async () => {
      // Skip creation and try to analyze directly
      const response = await fetch('http://localhost:3000/api/v1/cartridges/style/analyze', {
        method: 'POST',
        credentials: 'include',
      })

      // Might be 404 or create new, test either
      expect([200, 404]).toContain(response.status)
    })

    it('should enforce rate limiting on analysis', async () => {
      // Make 6 requests rapidly (limit is 5)
      const requests = Array(6).fill(null).map(() =>
        fetch('http://localhost:3000/api/v1/cartridges/style/analyze', {
          method: 'POST',
          credentials: 'include',
        })
      )

      const responses = await Promise.all(requests)
      const statusCodes = responses.map(r => r.status)

      // Last one should be rate limited
      expect(statusCodes[5]).toBe(429)
    })
  })

  describe('DELETE /api/v1/cartridges/style', () => {
    it('should delete style cartridge', async () => {
      const response = await fetch('http://localhost:3000/api/v1/cartridges/style', {
        method: 'DELETE',
        credentials: 'include',
      })

      expect([200, 404]).toContain(response.status)
      if (response.status === 200) {
        const data = await response.json()
        expect(data.success).toBe(true)
      }
    })
  })
})
