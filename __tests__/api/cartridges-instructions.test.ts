import { describe, it, expect } from 'vitest'

describe('Instructions Cartridge API Endpoints', () => {
  let instructionId: string

  const testInstructionData = {
    name: 'Marketing Best Practices',
    description: 'Core marketing instruction set for agencies',
  }

  describe('POST /api/v1/cartridges/instructions', () => {
    it('should create new instruction set', async () => {
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
      instructionId = data.id
    })

    it('should reject missing instruction name', async () => {
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

  describe('POST /api/v1/cartridges/instructions/[id]/upload', () => {
    it('should upload training documents to instruction set', async () => {
      const formData = new FormData()
      formData.append('files', new File(['Training content'], 'training.pdf', { type: 'application/pdf' }))

      const response = await fetch(`http://localhost:3000/api/v1/cartridges/instructions/${instructionId}/upload`, {
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
      // Upload first batch
      const formData1 = new FormData()
      formData1.append('files', new File(['Doc 1'], 'doc1.pdf', { type: 'application/pdf' }))

      const response1 = await fetch(`http://localhost:3000/api/v1/cartridges/instructions/${instructionId}/upload`, {
        method: 'POST',
        body: formData1,
        credentials: 'include',
      })

      expect(response1.status).toBe(200)

      // Upload second batch
      const formData2 = new FormData()
      formData2.append('files', new File(['Doc 2'], 'doc2.txt', { type: 'text/plain' }))

      const response2 = await fetch(`http://localhost:3000/api/v1/cartridges/instructions/${instructionId}/upload`, {
        method: 'POST',
        body: formData2,
        credentials: 'include',
      })

      expect(response2.status).toBe(200)
      const data = await response2.json()
      expect(data.training_docs.length).toBeGreaterThanOrEqual(2)
    })

    it('should reject files over 10MB', async () => {
      const formData = new FormData()
      formData.append('files', new File([new ArrayBuffer(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' }))

      const response = await fetch(`http://localhost:3000/api/v1/cartridges/instructions/${instructionId}/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('10MB')
    })

    it('should set process_status to pending after upload', async () => {
      const formData = new FormData()
      formData.append('files', new File(['content'], 'test.pdf', { type: 'application/pdf' }))

      const response = await fetch(`http://localhost:3000/api/v1/cartridges/instructions/${instructionId}/upload`, {
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
      const response = await fetch(`http://localhost:3000/api/v1/cartridges/instructions/${instructionId}/process`, {
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
      const response = await fetch('http://localhost:3000/api/v1/cartridges/instructions/invalid-uuid/process', {
        method: 'POST',
        credentials: 'include',
      })

      expect(response.status).toBe(400)
    })

    it('should enforce rate limiting on process', async () => {
      const requests = Array(6).fill(null).map(() =>
        fetch(`http://localhost:3000/api/v1/cartridges/instructions/${instructionId}/process`, {
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
      // Create one to delete
      const createResponse = await fetch('http://localhost:3000/api/v1/cartridges/instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'temp-instruction' }),
        credentials: 'include',
      })

      const createdData = await createResponse.json()
      const tempId = createdData.id

      // Delete it
      const deleteResponse = await fetch(`http://localhost:3000/api/v1/cartridges/instructions/${tempId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      expect(deleteResponse.status).toBe(200)
      const data = await deleteResponse.json()
      expect(data.success).toBe(true)
    })

    it('should reject invalid ID format', async () => {
      const response = await fetch('http://localhost:3000/api/v1/cartridges/instructions/not-a-uuid', {
        method: 'DELETE',
        credentials: 'include',
      })

      expect(response.status).toBe(400)
    })

    it('should prevent deletion of instruction from another agency', async () => {
      // This tests multi-tenant isolation - should fail with 404 if instruction
      // doesn't belong to requesting agency
      const response = await fetch('http://localhost:3000/api/v1/cartridges/instructions/00000000-0000-0000-0000-000000000000/delete', {
        method: 'DELETE',
        credentials: 'include',
      })

      expect([404, 400]).toContain(response.status)
    })
  })
})
