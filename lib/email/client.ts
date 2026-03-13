/**
 * Shared Resend Email Client
 *
 * Single source of truth for sending emails via the Resend API.
 * Replaces duplicated fetch() calls across invitation, onboarding, and workflow files.
 *
 * Reads process.env directly (not serverEnv) so tests can override env vars per-case.
 */

export interface SendEmailResult {
  success: boolean
  messageId?: string
  error?: string
}

const MAX_ATTEMPTS = 3
const BACKOFF_MS = [1000, 2000, 4000]

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason)
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(signal.reason)
    }, { once: true })
  })
}

export async function sendEmail(params: {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
  signal?: AbortSignal
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = params.from ?? process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'

  if (!apiKey) {
    console.error('[email] RESEND_API_KEY not configured — email not sent')
    return { success: false, error: 'Email service not configured' }
  }

  console.log('[email] Sending:', {
    to: params.to,
    from: fromEmail,
    subject: params.subject,
  })

  const body = JSON.stringify({
    from: fromEmail,
    to: params.to,
    subject: params.subject,
    html: params.html,
    ...(params.text && { text: params.text }),
    ...(params.replyTo && { reply_to: params.replyTo }),
  })

  let lastError: string = 'Email delivery failed'

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      console.log(`[email] Retry ${attempt}/${MAX_ATTEMPTS - 1} after ${BACKOFF_MS[attempt - 1]}ms`)
      try {
        await sleep(BACKOFF_MS[attempt - 1], params.signal)
      } catch {
        return { success: false, error: 'Email send aborted' }
      }
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body,
        ...(params.signal && { signal: params.signal }),
      })

      const data = await response.json() as { id?: string; message?: string }

      if (response.ok) {
        console.log('[email] Sent successfully:', { messageId: data.id })
        return { success: true, messageId: data.id }
      }

      lastError = data.message || `HTTP ${response.status}`
      console.error('[email] Resend API error:', { status: response.status, error: data })

      if (!isRetryable(response.status)) {
        return { success: false, error: lastError }
      }
    } catch (error) {
      if (params.signal?.aborted) {
        return { success: false, error: 'Email send aborted' }
      }
      lastError = error instanceof Error ? error.message : 'Email service error'
      console.error('[email] Send failed:', lastError)
    }
  }

  console.error('[email] All attempts exhausted:', {
    to: params.to,
    subject: params.subject,
    lastError,
  })
  return { success: false, error: lastError }
}
