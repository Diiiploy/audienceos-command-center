// __tests__/api/cartridges-instructions.test.ts
// Unit tests for Instructions Cartridge API endpoints using mocked fetch
import { describe, it, expect, beforeEach } from 'vitest'
import { mockFetchOnce, mockFetchSequence, mockData, resetMockFetch } from '../utils/mock-fetch'

describe('Instructions Cartridge API Endpoints', () => {
  const testInstructionId = 'instr-test-uuid-1234-5678-abcdefghijkl'

  const testInstructionData = {
    name: 'Marketing Best Practices',
    description: 'Core marketing instruction set for agencies',
  }

  beforeEach(() => {
    resetMockFetch()
  })

  describe('POST /api/v1/cartridges/instructions', () => {
    it('should create new instruction set', async () => {
      const createdInstruction = mockData.instructions.created({
        name: testInstructionData.name,
        description: testInstructionData.description,
      })
      mockFetchOnce(201, createdInstruction)

      const response = await fetch('http://localhost:3000/api/v1/cartridges/instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testInstructionData),
        credentials: 'include',
      })

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data).toHaveProperty('id')
      expect(data.name).toBe(testInstructionData.name)
      expect(data.process_status).toBe('pending')
    })

    it('should reject missing instruction name', async () => {
      mockFetchOnce(400, mockData.errors.validation('Instruction name is required'))

      const invalidData = { description: 'Missing name' }

      const response = await fetch('http://localhost:3000/api/v1/cartridges/instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
        credentials: 'include',
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('name')
    })

    it('should reject non-string name', async () => {
      mockFetchOnce(400, mockData.errors.validation('Name must be a string'))

      const invalidData = {
        name: 12345,
        description: 'Invalid name type',
      }

      const response = await fetch('http://localhost:3000/api/v1/cartridges/instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
        credentials: 'include',
      })

      expect(response.status).toBe(400)
    })

    it('should sanitize instruction name and description', async () => {
      // Mock returns sanitized data (no script tags)
      mockFetchOnce(201, mockData.instructions.created({
        name: 'alertxss',
        description: 'Test',
      }))

      const dataWithHtml = {
        name: '<script>alert("xss")</script>',
        description: 'Test <img src=x onerror="alert(1)">',
      }

      const response = await fetch('http://localhost:3000/api/v1/cartridges/instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataWithHtml),
        credentials: 'include',
      })

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.name).not.toContain('<script>')
      expect(data.description).not.toContain('onerror')
    })

    it('should initialize training_docs as empty array', async () => {
      mockFetchOnce(201, mockData.instructions.created({ training_docs: [] }))

      const response = await fetch('http://localhost:3000/api/v1/cartridges/instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testInstructionData),
        credentials: 'include',
      })

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.training_docs).toEqual([])
    })
  })

  describe('GET /api/v1/cartridges/instructions', () => {
    it('should list all instruction cartridges', async () => {
      mockFetchOnce(200, {
        instructions: [
          mockData.instructions.created({ id: 'instr-1', name: 'Marketing' }),
          mockData.instructions.created({ id: 'instr-2', name: 'Sales' }),
        ]
      })

      const response = await fetch('http://localhost:3000/api/v1/cartridges/instructions', {
        method: 'GET',
        credentials: 'include',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.instructions).toHaveLength(2)
    })

    it('should return empty array if no instruction cartridges', async () => {
      mockFetchOnce(200, { instructions: [] })

      const response = await fetch('http://localhost:3000/api/v1/cartridges/instructions', {
        method: 'GET',
        credentials: 'include',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.instructions).toEqual([])
    })
  })

  describe('GET /api/v1/cartridges/instructions/[id]', () => {
    it('should fetch single instruction cartridge', async () => {
      mockFetchOnce(200, mockData.instructions.created({ id: testInstructionId }))

      const response = await fetch(`http://localhost:3000/api/v1/cartridges/instructions/${testInstructionId}`, {
        method: 'GET',
        credentials: 'include',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.id).toBe(testInstructionId)
    })

    it('should return 404 for non-existent instruction', async () => {
      mockFetchOnce(404, mockData.errors.notFound('Cartridge'))

      const response = await fetch(`http://localhost:3000/api/v1/cartridges/instructions/${testInstructionId}`, {
        method: 'GET',
        credentials: 'include',
      })

      expect(response.status).toBe(404)
    })

    it('should reject invalid ID format', async () => {
      mockFetchOnce(400, mockData.errors.validation('Invalid ID format'))

      const response = await fetch('http://localhost:3000/api/v1/cartridges/instructions/invalid-id-123', {
        method: 'GET',
        credentials: 'include',
      })

      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/v1/cartridges/instructions/[id]/upload', () => {
    it('should upload training documents to instruction set', async () => {
      const instructionWithDocs = mockData.instructions.withDocs([{ fileName: 'training.pdf' }])
      mockFetchOnce(200, instructionWithDocs)

      const formData = new FormData()
      formData.append('files', new File(['Training content'], 'training.pdf', { type: 'application/pdf' }))

      const response = await fetch(`http://localhost:3000/api/v1/cartridges/instructions/${testInstructionId}/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.training_docs.length).toBeGreaterThan(0)
      expect(data.training_docs[0]).toHaveProperty('fileName')
      expect(data.training_docs[0]).toHaveProperty('storageUrl')
    })

    it('should reject invalid instruction ID format', async () => {
      mockFetchOnce(400, mockData.errors.validation('Invalid instruction ID format'))

      const formData = new FormData()
      formData.append('files', new File(['content'], 'test.pdf', { type: 'application/pdf' }))

      const response = await fetch('http://localhost:3000/api/v1/cartridges/instructions/invalid-id-123/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid')
    })

    it('should append new documents to existing training_docs', async () => {
      // First upload
      mockFetchOnce(200, mockData.instructions.withDocs([{ fileName: 'doc1.pdf' }]))

      const formData1 = new FormData()
      formData1.append('files', new File(['Doc 1'], 'doc1.pdf', { type: 'application/pdf' }))

      const response1 = await fetch(`http://localhost:3000/api/v1/cartridges/instructions/${testInstructionId}/upload`, {
        method: 'POST',
        body: formData1,
        credentials: 'include',
      })

      expect(response1.status).toBe(200)

      // Second upload - returns combined docs
      const instructionWithAllDocs = {
        ...mockData.instructions.withDocs([{ fileName: 'doc1.pdf' }]),
        training_docs: [
          ...mockData.instructions.withDocs([{ fileName: 'doc1.pdf' }]).training_docs,
          ...mockData.instructions.withDocs([{ fileName: 'doc2.txt' }]).training_docs,
        ]
      }
      mockFetchOnce(200, instructionWithAllDocs)

      const formData2 = new FormData()
      formData2.append('files', new File(['Doc 2'], 'doc2.txt', { type: 'text/plain' }))

      const response2 = await fetch(`http://localhost:3000/api/v1/cartridges/instructions/${testInstructionId}/upload`, {
        method: 'POST',
        body: formData2,
        credentials: 'include',
      })

      expect(response2.status).toBe(200)
      const data = await response2.json()
      expect(data.training_docs.length).toBeGreaterThanOrEqual(2)
    })

    it('should reject files over 10MB', async () => {
      mockFetchOnce(400, mockData.errors.validation('File large.pdf exceeds 10MB limit'))

      const formData = new FormData()
      formData.append('files', new File([new ArrayBuffer(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' }))

      const response = await fetch(`http://localhost:3000/api/v1/cartridges/instructions/${testInstructionId}/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('10MB')
    })

    it('should set process_status to pending after upload', async () => {
      mockFetchOnce(200, {
        ...mockData.instructions.withDocs([{ fileName: 'test.pdf' }]),
        process_status: 'pending'
      })

      const formData = new FormData()
      formData.append('files', new File(['content'], 'test.pdf', { type: 'application/pdf' }))

      const response = await fetch(`http://localhost:3000/api/v1/cartridges/instructions/${testInstructionId}/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.process_status).toBe('pending')
    })
  })

  describe('POST /api/v1/cartridges/instructions/[id]/process', () => {
    it('should process instruction documents', async () => {
      mockFetchOnce(200, mockData.instructions.processed())

      const response = await fetch(`http://localhost:3000/api/v1/cartridges/instructions/${testInstructionId}/process`, {
        method: 'POST',
        credentials: 'include',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.process_status).toBe('completed')
      expect(data).toHaveProperty('extracted_knowledge')
      expect(data.extracted_knowledge).toHaveProperty('frameworks')
      expect(data.extracted_knowledge).toHaveProperty('methodologies')
    })

    it('should reject invalid instruction ID', async () => {
      mockFetchOnce(400, mockData.errors.validation('Invalid instruction ID format'))

      const response = await fetch('http://localhost:3000/api/v1/cartridges/instructions/invalid-uuid/process', {
        method: 'POST',
        credentials: 'include',
      })

      expect(response.status).toBe(400)
    })

    it('should return 400 if no documents to process', async () => {
      mockFetchOnce(400, mockData.errors.validation('No training documents to process. Upload documents first.'))

      const response = await fetch(`http://localhost:3000/api/v1/cartridges/instructions/${testInstructionId}/process`, {
        method: 'POST',
        credentials: 'include',
      })

      expect(response.status).toBe(400)
    })

    it('should enforce rate limiting on process', async () => {
      mockFetchSequence([
        { status: 200, data: mockData.instructions.processed() },
        { status: 200, data: mockData.instructions.processed() },
        { status: 200, data: mockData.instructions.processed() },
        { status: 200, data: mockData.instructions.processed() },
        { status: 200, data: mockData.instructions.processed() },
        { status: 429, data: mockData.errors.rateLimit() },
      ])

      const requests = Array(6).fill(null).map(() =>
        fetch(`http://localhost:3000/api/v1/cartridges/instructions/${testInstructionId}/process`, {
          method: 'POST',
          credentials: 'include',
        })
      )

      const responses = await Promise.all(requests)
      const lastResponse = responses[responses.length - 1]

      expect(lastResponse.status).toBe(429)
    })
  })

  describe('DELETE /api/v1/cartridges/instructions/[id]', () => {
    it('should delete instruction set', async () => {
      mockFetchOnce(200, mockData.instructions.deleted())

      const response = await fetch(`http://localhost:3000/api/v1/cartridges/instructions/${testInstructionId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it('should reject invalid ID format', async () => {
      mockFetchOnce(400, mockData.errors.validation('Invalid ID format'))

      const response = await fetch('http://localhost:3000/api/v1/cartridges/instructions/not-a-uuid', {
        method: 'DELETE',
        credentials: 'include',
      })

      expect(response.status).toBe(400)
    })

    it('should return 404 if instruction does not exist', async () => {
      mockFetchOnce(404, mockData.errors.notFound('Cartridge'))

      const response = await fetch(`http://localhost:3000/api/v1/cartridges/instructions/${testInstructionId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      expect(response.status).toBe(404)
    })

    it('should prevent deletion of instruction from another agency (multi-tenant isolation)', async () => {
      mockFetchOnce(404, mockData.errors.notFound('Cartridge'))

      const response = await fetch('http://localhost:3000/api/v1/cartridges/instructions/00000000-0000-0000-0000-000000000000', {
        method: 'DELETE',
        credentials: 'include',
      })

      expect(response.status).toBe(404)
    })
  })
})
