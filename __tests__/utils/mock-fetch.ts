// __tests__/utils/mock-fetch.ts
// Mock fetch utility for API tests
import { vi } from 'vitest'

export interface MockResponse {
  status: number
  data: unknown
  headers?: Record<string, string>
}

/**
 * Creates a mock Response object
 */
export function createMockResponse(status: number, data: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
    headers: new Headers({ 'content-type': 'application/json' }),
    redirected: false,
    statusText: status === 200 ? 'OK' : status === 201 ? 'Created' : status === 400 ? 'Bad Request' : 'Error',
    type: 'basic',
    url: '',
    clone: vi.fn(),
    body: null,
    bodyUsed: false,
    arrayBuffer: vi.fn(),
    blob: vi.fn(),
    formData: vi.fn(),
    bytes: vi.fn(),
  } as unknown as Response
}

/**
 * Setup mock fetch for a single response
 */
export function mockFetchOnce(status: number, data: unknown): void {
  vi.mocked(fetch).mockResolvedValueOnce(createMockResponse(status, data))
}

/**
 * Setup mock fetch for multiple responses in sequence
 */
export function mockFetchSequence(responses: MockResponse[]): void {
  responses.forEach(({ status, data }) => {
    vi.mocked(fetch).mockResolvedValueOnce(createMockResponse(status, data))
  })
}

/**
 * Setup mock fetch to always return the same response
 */
export function mockFetchAlways(status: number, data: unknown): void {
  vi.mocked(fetch).mockResolvedValue(createMockResponse(status, data))
}

/**
 * Reset mock fetch to default (returns undefined)
 */
export function resetMockFetch(): void {
  vi.mocked(fetch).mockReset()
}

// Common mock data factories
export const mockData = {
  brand: {
    success: (overrides = {}) => ({
      id: 'brand-123',
      name: 'Test Brand',
      company_name: 'Test Company Inc.',
      company_description: 'A test brand description',
      company_tagline: 'Test tagline here',
      industry: 'Technology',
      target_audience: 'B2B SaaS companies',
      agency_id: 'agency-123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    }),
    blueprint: (overrides = {}) => ({
      blueprint: {
        bio: 'A compelling 2-3 sentence bio',
        positioning: 'Clear market positioning statement',
        offer: 'Main value proposition / offer',
        targetAudience: 'Who this brand serves',
        uniqueValue: 'What makes this brand unique',
        voiceTone: 'Professional yet approachable',
        keyMessages: ['message1', 'message2', 'message3'],
        contentPillars: ['pillar1', 'pillar2', 'pillar3'],
        brandPromise: 'The promise made to customers',
        ...overrides,
      },
    }),
    logo: (overrides = {}) => ({
      logoUrl: 'https://storage.example.com/agency-123/logo-123456.png',
      fileName: 'agency-123/logo-123456.png',
      message: 'Logo uploaded successfully',
      ...overrides,
    }),
    deleted: () => ({
      success: true,
      message: 'Brand deleted successfully',
    }),
  },

  style: {
    success: (overrides = {}) => ({
      id: 'style-123',
      agency_id: 'agency-123',
      analysis_status: 'pending',
      source_files: [],
      learned_style: null,
      mem0_namespace: 'style::agency-123::123456',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides,
    }),
    withFiles: (files: Array<{ fileName: string }>) => ({
      id: 'style-123',
      agency_id: 'agency-123',
      analysis_status: 'pending',
      source_files: files.map((f, i) => ({
        fileName: f.fileName,
        file_path: `agency-123/style-123/${Date.now()}-${f.fileName}`,
        storageUrl: `https://storage.example.com/agency-123/style-123/${f.fileName}`,
        type: 'application/pdf',
        size: 1024,
        uploaded_at: new Date().toISOString(),
      })),
      learned_style: null,
      mem0_namespace: 'style::agency-123::123456',
    }),
    analyzed: (overrides = {}) => ({
      analysis_status: 'completed',
      learned_style: {
        writingPatterns: {
          sentenceStructure: 'Clear and concise',
          paragraphStyle: 'Short paragraphs',
          transitionWords: ['however', 'therefore', 'additionally'],
          vocabularyLevel: 'professional',
          toneDescriptors: ['authoritative', 'friendly'],
        },
        voiceCharacteristics: {
          pointOfView: 'first person plural',
          activeVsPassive: 'mostly active',
          formalityLevel: '7/10',
        },
        commonPhrases: ['key insight', 'best practice', 'proven results'],
        stylisticDevices: ['metaphors', 'analogies'],
        contentPatterns: {
          typicalOpenings: 'Start with a question or bold statement',
          conclusionStyle: 'Call to action',
          argumentStructure: 'Problem-solution format',
        },
        recommendations: ['Use more data', 'Add case studies'],
      },
      style: {
        id: 'style-123',
        agency_id: 'agency-123',
        ...overrides,
      },
    }),
    deleted: () => ({
      success: true,
      message: 'Style cartridge deleted successfully',
    }),
  },

  instructions: {
    created: (overrides = {}) => ({
      id: 'instr-123',
      name: 'Marketing Best Practices',
      description: 'Core marketing instruction set',
      process_status: 'pending',
      training_docs: [],
      ...overrides,
    }),
    withDocs: (docs: Array<{ fileName: string }>) => ({
      id: 'instr-123',
      name: 'Marketing Best Practices',
      description: 'Core marketing instruction set',
      process_status: 'pending',
      training_docs: docs.map((d) => ({
        fileName: d.fileName,
        file_path: `agency-123/instr-123/${Date.now()}-${d.fileName}`,
        storageUrl: `https://storage.example.com/agency-123/instr-123/${d.fileName}`,
        type: 'application/pdf',
        size: 1024,
        uploaded_at: new Date().toISOString(),
      })),
    }),
    processed: (overrides = {}) => ({
      id: 'instr-123',
      process_status: 'completed',
      extracted_knowledge: {
        frameworks: [
          { name: 'AIDA', description: 'Attention, Interest, Desire, Action', steps: ['Grab attention', 'Build interest', 'Create desire', 'Call to action'] },
        ],
        methodologies: [
          { name: 'Content Marketing', description: 'Strategic content creation', keyPrinciples: ['Value first', 'Consistency'] },
        ],
        bestPractices: ['Know your audience', 'Test everything', 'Measure results'],
        keyTerms: [
          { term: 'CTR', definition: 'Click-through rate' },
          { term: 'ROI', definition: 'Return on investment' },
        ],
        commonPatterns: ['Hook opening', 'Social proof'],
        actionItems: ['Create content calendar', 'Set up analytics'],
        summary: 'Core marketing principles and frameworks',
      },
      ...overrides,
    }),
    deleted: () => ({
      success: true,
      message: 'Instruction cartridge deleted successfully',
    }),
  },

  errors: {
    validation: (message: string) => ({ error: message }),
    notFound: (resource = 'Resource') => ({ error: `${resource} not found` }),
    rateLimit: () => ({ error: 'Too many requests. Please try again later.' }),
    unauthorized: () => ({ error: 'Unauthorized' }),
    forbidden: () => ({ error: 'Forbidden' }),
    serverError: () => ({ error: 'Internal server error' }),
  },
}
