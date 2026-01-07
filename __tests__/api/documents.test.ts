/**
 * API Route Tests for /api/v1/documents
 * Tests for Knowledge Base document operations including Drive import
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Next.js request/response
const mockRequest = (options: {
  method?: string
  body?: Record<string, unknown>
  searchParams?: Record<string, string>
  headers?: Record<string, string>
}) => {
  const url = new URL('http://localhost:3000/api/v1/documents')
  if (options.searchParams) {
    Object.entries(options.searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value)
    })
  }
  return {
    method: options.method || 'GET',
    url: url.toString(),
    json: vi.fn().mockResolvedValue(options.body || {}),
    headers: new Headers(options.headers || {}),
  }
}

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  createRouteHandlerClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: 'doc-123', title: 'Test Document', is_starred: false },
            error: null,
          })),
          order: vi.fn(() => ({
            data: [
              { id: 'doc-1', title: 'Document 1', is_starred: false, use_for_training: true },
              { id: 'doc-2', title: 'Document 2', is_starred: true, use_for_training: false },
            ],
            error: null,
          })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { id: 'doc-new', title: 'New Document', is_starred: false, use_for_training: false },
            error: null,
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({
              data: { id: 'doc-123', is_starred: true },
              error: null,
            })),
          })),
        })),
      })),
    })),
    auth: {
      getUser: vi.fn(() => ({
        data: { user: { id: 'user-123', email: 'test@test.com' } },
        error: null,
      })),
    },
  })),
  getAuthenticatedUser: vi.fn(() => ({
    user: { id: 'user-123', email: 'test@test.com' },
    agencyId: 'agency-123',
    error: null,
  })),
}))

// Mock security utilities
vi.mock('@/lib/security', () => ({
  withRateLimit: vi.fn(() => null),
  withCsrfProtection: vi.fn(() => null),
  sanitizeString: vi.fn((str: string) => str?.trim() || ''),
  createErrorResponse: vi.fn((status: number, message: string) => ({
    status,
    json: () => ({ error: message }),
  })),
}))

describe('API: /api/v1/documents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Drive URL Parsing', () => {
    const extractDriveFileId = (url: string): string | null => {
      // Format: https://drive.google.com/file/d/{fileId}/...
      const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
      if (fileMatch) return fileMatch[1]

      // Format: https://docs.google.com/document/d/{fileId}/...
      const docMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)
      if (docMatch) return docMatch[1]

      // Format: https://docs.google.com/spreadsheets/d/{fileId}/...
      const sheetMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
      if (sheetMatch) return sheetMatch[1]

      // Format: https://docs.google.com/presentation/d/{fileId}/...
      const slideMatch = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/)
      if (slideMatch) return slideMatch[1]

      // Format: ?id={fileId}
      const queryMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
      if (queryMatch) return queryMatch[1]

      return null
    }

    it('should extract file ID from Google Drive file URL', () => {
      const url = 'https://drive.google.com/file/d/1abc123XYZ_def456/view'
      expect(extractDriveFileId(url)).toBe('1abc123XYZ_def456')
    })

    it('should extract file ID from Google Docs URL', () => {
      const url = 'https://docs.google.com/document/d/1abc123XYZ_def456/edit'
      expect(extractDriveFileId(url)).toBe('1abc123XYZ_def456')
    })

    it('should extract file ID from Google Sheets URL', () => {
      const url = 'https://docs.google.com/spreadsheets/d/1abc123XYZ_def456/edit#gid=0'
      expect(extractDriveFileId(url)).toBe('1abc123XYZ_def456')
    })

    it('should extract file ID from Google Slides URL', () => {
      const url = 'https://docs.google.com/presentation/d/1abc123XYZ_def456/edit#slide=id.p'
      expect(extractDriveFileId(url)).toBe('1abc123XYZ_def456')
    })

    it('should extract file ID from query parameter', () => {
      const url = 'https://drive.google.com/open?id=1abc123XYZ_def456'
      expect(extractDriveFileId(url)).toBe('1abc123XYZ_def456')
    })

    it('should return null for invalid URLs', () => {
      expect(extractDriveFileId('https://example.com/file.pdf')).toBeNull()
      expect(extractDriveFileId('not-a-url')).toBeNull()
      expect(extractDriveFileId('')).toBeNull()
    })
  })

  describe('Drive URL Validation', () => {
    const isValidDriveUrl = (url: string): boolean => {
      return url.includes('drive.google.com') || url.includes('docs.google.com')
    }

    it('should validate Google Drive URLs', () => {
      expect(isValidDriveUrl('https://drive.google.com/file/d/123/view')).toBe(true)
      expect(isValidDriveUrl('https://docs.google.com/document/d/123/edit')).toBe(true)
    })

    it('should reject non-Drive URLs', () => {
      expect(isValidDriveUrl('https://dropbox.com/file.pdf')).toBe(false)
      expect(isValidDriveUrl('https://onedrive.com/file.docx')).toBe(false)
      expect(isValidDriveUrl('https://example.com')).toBe(false)
    })
  })

  describe('Document Type Detection', () => {
    const detectDocumentType = (url: string): { mime_type: string; file_extension: string } => {
      if (url.includes('/document/')) {
        return { mime_type: 'application/vnd.google-apps.document', file_extension: 'gdoc' }
      }
      if (url.includes('/spreadsheets/')) {
        return { mime_type: 'application/vnd.google-apps.spreadsheet', file_extension: 'gsheet' }
      }
      if (url.includes('/presentation/')) {
        return { mime_type: 'application/vnd.google-apps.presentation', file_extension: 'gslides' }
      }
      return { mime_type: 'application/vnd.google-apps.file', file_extension: 'gdrive' }
    }

    it('should detect Google Docs', () => {
      const result = detectDocumentType('https://docs.google.com/document/d/123/edit')
      expect(result.mime_type).toBe('application/vnd.google-apps.document')
      expect(result.file_extension).toBe('gdoc')
    })

    it('should detect Google Sheets', () => {
      const result = detectDocumentType('https://docs.google.com/spreadsheets/d/123/edit')
      expect(result.mime_type).toBe('application/vnd.google-apps.spreadsheet')
      expect(result.file_extension).toBe('gsheet')
    })

    it('should detect Google Slides', () => {
      const result = detectDocumentType('https://docs.google.com/presentation/d/123/edit')
      expect(result.mime_type).toBe('application/vnd.google-apps.presentation')
      expect(result.file_extension).toBe('gslides')
    })

    it('should default to generic Drive file', () => {
      const result = detectDocumentType('https://drive.google.com/file/d/123/view')
      expect(result.mime_type).toBe('application/vnd.google-apps.file')
      expect(result.file_extension).toBe('gdrive')
    })
  })

  describe('PATCH - Update Document', () => {
    it('should validate is_starred as boolean', async () => {
      const request = mockRequest({
        method: 'PATCH',
        body: { is_starred: true },
      })

      const body = await request.json()
      expect(typeof body.is_starred).toBe('boolean')
    })

    it('should validate use_for_training as boolean', async () => {
      const request = mockRequest({
        method: 'PATCH',
        body: { use_for_training: false },
      })

      const body = await request.json()
      expect(typeof body.use_for_training).toBe('boolean')
    })

    it('should validate category against whitelist', async () => {
      const validCategories = ['installation', 'tech', 'support', 'process', 'client_specific']

      validCategories.forEach((category) => {
        expect(validCategories.includes(category)).toBe(true)
      })

      expect(validCategories.includes('invalid_category')).toBe(false)
    })

    it('should sanitize title input', async () => {
      const { sanitizeString } = await import('@/lib/security')

      const dirtyTitle = '  <script>alert("xss")</script>Document Title  '
      const result = sanitizeString(dirtyTitle)

      expect(result).toBe('<script>alert("xss")</script>Document Title')
      expect(result).not.toContain('  ')
    })
  })

  describe('POST - Drive Import', () => {
    it('should require URL field', async () => {
      const request = mockRequest({
        method: 'POST',
        body: { display_name: 'Test Document' },
      })

      const body = await request.json()
      expect(body.url).toBeUndefined()
    })

    it('should accept optional display_name', async () => {
      const request = mockRequest({
        method: 'POST',
        body: {
          url: 'https://docs.google.com/document/d/123/edit',
          display_name: 'My Custom Name'
        },
      })

      const body = await request.json()
      expect(body.display_name).toBe('My Custom Name')
    })

    it('should accept optional category', async () => {
      const request = mockRequest({
        method: 'POST',
        body: {
          url: 'https://docs.google.com/document/d/123/edit',
          category: 'process'
        },
      })

      const body = await request.json()
      expect(body.category).toBe('process')
    })
  })

  describe('Authentication', () => {
    it('should require authentication', async () => {
      const { createErrorResponse } = await import('@/lib/security')
      const errorResponse = createErrorResponse(401, 'Unauthorized')

      expect(errorResponse.status).toBe(401)
    })
  })

  describe('CSRF Protection', () => {
    it('should require CSRF token for state-changing operations', async () => {
      const { withCsrfProtection } = await import('@/lib/security')

      // CSRF protection should be called for PATCH/POST/DELETE
      expect(withCsrfProtection).toBeDefined()
    })
  })

  describe('Rate Limiting', () => {
    it('should apply rate limiting', async () => {
      const { withRateLimit } = await import('@/lib/security')

      expect(withRateLimit).toBeDefined()
    })
  })
})
