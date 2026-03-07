/**
 * Tests for lib/email/onboarding.ts
 * Tests sendOnboardingEmail and sendOnboardingConfirmationEmail
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Save original env
const originalEnv = { ...process.env }

describe('Onboarding Email Service', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch = vi.fn()
    global.fetch = mockFetch
    process.env.RESEND_API_KEY = 'test-resend-key'
    process.env.RESEND_FROM_EMAIL = 'test@audienceos.io'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  describe('sendOnboardingEmail', () => {
    // Import dynamically to pick up env changes
    async function getSendFn() {
      // Clear module cache to re-evaluate with new env
      const mod = await import('@/lib/email/onboarding')
      return mod.sendOnboardingEmail
    }

    it('returns error when RESEND_API_KEY is missing', async () => {
      delete process.env.RESEND_API_KEY
      const send = await getSendFn()

      const result = await send({
        to: 'client@example.com',
        clientName: 'Test Client',
        agencyName: 'Test Agency',
        portalUrl: 'https://example.com/onboarding/start?token=abc',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('not configured')
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('sends email with correct payload', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'msg-123' }),
      })

      const send = await getSendFn()
      const result = await send({
        to: 'client@example.com',
        clientName: 'Acme Corp',
        agencyName: 'Growth Agency',
        portalUrl: 'https://app.test.com/onboarding/start?token=xyz',
      })

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('msg-123')

      // Verify fetch was called with correct Resend API
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.resend.com/emails',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-resend-key',
          }),
        }),
      )

      // Verify payload content
      const call = mockFetch.mock.calls[0]
      const body = JSON.parse(call[1].body)
      expect(body.to).toBe('client@example.com')
      expect(body.from).toBe('test@audienceos.io')
      expect(body.reply_to).toBe('support@audienceos.io')
      expect(body.subject).toContain('Growth Agency')
      expect(body.html).toContain('Acme Corp')
      expect(body.html).toContain('token=xyz')
    })

    it('includes SEO section when seoSummary provided', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'msg-456' }),
      })

      const send = await getSendFn()
      await send({
        to: 'client@example.com',
        clientName: 'Test',
        agencyName: 'Agency',
        portalUrl: 'https://test.com',
        seoSummary: {
          total_keywords: 1500,
          traffic_value: 25000,
          competitors_count: 8,
        },
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.html).toContain('1,500')
      expect(body.html).toContain('$25,000')
      expect(body.html).toContain('8')
      expect(body.html).toContain('SEO Intelligence')
    })

    it('handles Resend API error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        json: () => Promise.resolve({ message: 'Invalid email address' }),
      })

      const send = await getSendFn()
      const result = await send({
        to: 'bad-email',
        clientName: 'Test',
        agencyName: 'Agency',
        portalUrl: 'https://test.com',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid email')
    })

    it('handles network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network timeout'))

      const send = await getSendFn()
      const result = await send({
        to: 'client@example.com',
        clientName: 'Test',
        agencyName: 'Agency',
        portalUrl: 'https://test.com',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Network timeout')
    })

    it('uses fallback from email when env not set', async () => {
      delete process.env.RESEND_FROM_EMAIL
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'msg-789' }),
      })

      const send = await getSendFn()
      await send({
        to: 'client@example.com',
        clientName: 'Test',
        agencyName: 'Agency',
        portalUrl: 'https://test.com',
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.from).toContain('audienceos.io')
    })
  })

  describe('sendOnboardingConfirmationEmail', () => {
    async function getConfirmFn() {
      const mod = await import('@/lib/email/onboarding')
      return mod.sendOnboardingConfirmationEmail
    }

    it('sends confirmation email with Slack channel mention', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'confirm-123' }),
      })

      const send = await getConfirmFn()
      const result = await send({
        to: 'client@example.com',
        clientName: 'Acme Corp',
        agencyName: 'Growth Agency',
        slackChannelName: 'acme-corp',
      })

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('confirm-123')

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.subject).toContain('Onboarding Complete')
      expect(body.html).toContain('#acme-corp')
      expect(body.html).toContain('Slack channel')
      expect(body.reply_to).toBe('support@audienceos.io')
    })

    it('sends without Slack section when no channel', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'confirm-456' }),
      })

      const send = await getConfirmFn()
      await send({
        to: 'client@example.com',
        clientName: 'Test',
        agencyName: 'Agency',
      })

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body.html).not.toContain('Slack channel')
    })
  })
})
