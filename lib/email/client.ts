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

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromEmail,
        to: params.to,
        subject: params.subject,
        html: params.html,
        ...(params.text && { text: params.text }),
        ...(params.replyTo && { reply_to: params.replyTo }),
      }),
      ...(params.signal && { signal: params.signal }),
    })

    const data = await response.json() as { id?: string; message?: string }

    if (!response.ok) {
      console.error('[email] Resend API error:', {
        status: response.status,
        error: data,
      })
      return { success: false, error: data.message || 'Email delivery failed' }
    }

    console.log('[email] Sent successfully:', { messageId: data.id })
    return { success: true, messageId: data.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Email service error'
    console.error('[email] Send failed:', message)
    return { success: false, error: message }
  }
}
