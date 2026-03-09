/**
 * Email Test Endpoint
 *
 * Diagnostic endpoint for verifying Resend email delivery.
 * Protected by INTERNAL_API_KEY (not Supabase session).
 *
 * POST /api/test/email
 * Headers: Authorization: Bearer {INTERNAL_API_KEY}
 * Body: { "to": "trevor@diiiploy.io" }
 */

import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/client'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  // Validate INTERNAL_API_KEY
  const authHeader = request.headers.get('authorization')
  const expectedKey = process.env.INTERNAL_API_KEY

  if (!expectedKey || authHeader !== `Bearer ${expectedKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const to = body.to

  if (!to || typeof to !== 'string') {
    return NextResponse.json({ error: 'Missing "to" field' }, { status: 400 })
  }

  const result = await sendEmail({
    to,
    from: 'onboarding@resend.dev',
    subject: '[AudienceOS] Email Test — Delivery Confirmed',
    html: `
      <div style="font-family: sans-serif; padding: 20px; max-width: 500px;">
        <h2>Email Delivery Test</h2>
        <p>If you're reading this, Resend email delivery is working.</p>
        <p style="color: #6b7280; font-size: 12px;">
          Sent at: ${new Date().toISOString()}<br>
          From: onboarding@resend.dev<br>
          To: ${to}
        </p>
      </div>
    `,
    text: `Email delivery test — Resend is working. Sent at ${new Date().toISOString()}`,
  })

  return NextResponse.json({
    status: result.success ? 'sent' : 'failed',
    messageId: result.messageId,
    error: result.error,
    fromAddress: 'onboarding@resend.dev',
    timestamp: new Date().toISOString(),
  }, { status: result.success ? 200 : 500 })
}
