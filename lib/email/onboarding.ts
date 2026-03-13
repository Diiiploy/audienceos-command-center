/**
 * Onboarding Email Service
 *
 * Sends welcome and confirmation emails for client onboarding.
 * Uses shared Resend client for delivery.
 */

import { sendEmail, type SendEmailResult } from '@/lib/email/client'

interface OnboardingEmailParams {
  to: string
  clientName: string
  agencyName: string
  portalUrl: string
  seoSummary?: {
    total_keywords?: number
    traffic_value?: number
    competitors_count?: number
  } | null
}

/**
 * Send onboarding welcome email
 *
 * Graceful failure - returns success: false instead of throwing
 */
export async function sendOnboardingEmail({
  to,
  clientName,
  agencyName,
  portalUrl,
  seoSummary,
}: OnboardingEmailParams): Promise<SendEmailResult> {

  // Build SEO insight section if data available
  const seoSection = seoSummary && (seoSummary.total_keywords || seoSummary.traffic_value)
    ? `
      <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 12px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0 0 8px 0; font-weight: 600; color: #064e3b;">SEO Intelligence Preview</p>
        <p style="margin: 0; font-size: 14px; color: #065f46;">
          We've already analyzed your website and found some interesting insights:
          ${seoSummary.total_keywords ? `<br>- <strong>${seoSummary.total_keywords.toLocaleString()}</strong> ranking keywords` : ''}
          ${seoSummary.traffic_value ? `<br>- Estimated traffic value: <strong>$${seoSummary.traffic_value.toLocaleString()}</strong>` : ''}
          ${seoSummary.competitors_count ? `<br>- <strong>${seoSummary.competitors_count}</strong> identified competitors` : ''}
        </p>
      </div>
    `
    : ''

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: #f9fafb; padding: 30px 20px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #059669; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        .button:hover { background: #047857; }
        .footer { font-size: 12px; color: #6b7280; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        .step { display: flex; margin-bottom: 16px; }
        .step-number { background: #d1fae5; color: #059669; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; margin-right: 12px; flex-shrink: 0; }
        .step-content { flex: 1; }
        .step-title { font-weight: 600; margin-bottom: 2px; }
        .step-desc { font-size: 14px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">Welcome to ${agencyName}!</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">Let's get your marketing set up for success</p>
        </div>

        <div class="content">
          <p>Hi ${clientName} team,</p>

          <p>We're excited to start working with you! To ensure we deliver the best results, we need to gather some information about your business and set up the necessary tracking.</p>

          ${seoSection}

          <div style="text-align: center; margin: 24px 0;">
            <a href="${portalUrl}" class="button">Start Onboarding</a>
          </div>

          <p style="font-size: 12px; color: #6b7280; text-align: center;">Or copy this link: ${portalUrl}</p>

          <h3 style="margin: 24px 0 16px 0; font-size: 16px;">What to expect:</h3>

          <div class="step">
            <div class="step-number">1</div>
            <div class="step-content">
              <div class="step-title">Watch Welcome Video</div>
              <div class="step-desc">A quick overview of our process and what to expect</div>
            </div>
          </div>

          <div class="step">
            <div class="step-number">2</div>
            <div class="step-content">
              <div class="step-title">Complete Intake Form</div>
              <div class="step-desc">Share your business details, goals, and ad account information</div>
            </div>
          </div>

          <div class="step">
            <div class="step-number">3</div>
            <div class="step-content">
              <div class="step-title">Grant Platform Access</div>
              <div class="step-desc">Connect your Meta, Google, and Shopify accounts</div>
            </div>
          </div>

          <div class="step">
            <div class="step-number">4</div>
            <div class="step-content">
              <div class="step-title">Review & Launch</div>
              <div class="step-desc">We'll audit your setup and get your campaigns live</div>
            </div>
          </div>

          <p style="margin-top: 24px; font-size: 14px; color: #4b5563;">
            This link is unique to you and will remain active. If you have any questions, don't hesitate to reach out!
          </p>
        </div>

        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${agencyName} powered by AudienceOS</p>
          <p>This is an automated message from your marketing team.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const textContent = `
Welcome to ${agencyName}!

Hi ${clientName} team,

We're excited to start working with you! To ensure we deliver the best results, we need to gather some information about your business.

Start your onboarding here:
${portalUrl}

What to expect:
1. Watch Welcome Video - A quick overview of our process
2. Complete Intake Form - Share your business details and ad accounts
3. Grant Platform Access - Connect Meta, Google, and Shopify
4. Review & Launch - We'll audit your setup and get campaigns live

This link is unique to you and will remain active.

Questions? Just reply to this email!

(c) ${new Date().getFullYear()} ${agencyName} powered by AudienceOS
  `

  return sendEmail({
    to,
    subject: `Welcome to ${agencyName} - Let's Get Started!`,
    html: htmlContent,
    text: textContent,
    replyTo: 'cs@audienceos.io',
  })
}

/**
 * Send onboarding confirmation email after client completes submission
 *
 * Graceful failure - returns success: false instead of throwing
 */
export async function sendOnboardingConfirmationEmail({
  to,
  clientName,
  agencyName,
  slackChannelName,
}: {
  to: string
  clientName: string
  agencyName: string
  slackChannelName?: string | null
}): Promise<SendEmailResult> {

  const slackSection = slackChannelName
    ? `
      <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0 0 4px 0; font-weight: 600; color: #1e40af;">Slack Channel</p>
        <p style="margin: 0; font-size: 14px; color: #1e3a5f;">
          A dedicated Slack channel <strong>#${slackChannelName}</strong> has been set up for your account.
          This is where you can communicate directly with our team for quick updates and questions.
        </p>
      </div>
    `
    : ''

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 30px 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: #f9fafb; padding: 30px 20px; border-radius: 0 0 8px 8px; }
        .footer { font-size: 12px; color: #6b7280; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
        .step { display: flex; margin-bottom: 16px; }
        .step-number { background: #d1fae5; color: #059669; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; margin-right: 12px; flex-shrink: 0; }
        .step-content { flex: 1; }
        .step-title { font-weight: 600; margin-bottom: 2px; }
        .step-desc { font-size: 14px; color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">Onboarding Complete!</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9;">Welcome to ${agencyName}</p>
        </div>

        <div class="content">
          <p>Hi ${clientName} team,</p>

          <p>Thank you for completing your onboarding submission! We've received all of your information and our team is now reviewing everything.</p>

          ${slackSection}

          <h3 style="margin: 24px 0 16px 0; font-size: 16px;">What happens next:</h3>

          <div class="step">
            <div class="step-number">1</div>
            <div class="step-content">
              <div class="step-title">Review & Audit</div>
              <div class="step-desc">Our team will review your submission and audit your current setup</div>
            </div>
          </div>

          <div class="step">
            <div class="step-number">2</div>
            <div class="step-content">
              <div class="step-title">Account Setup</div>
              <div class="step-desc">We'll configure your accounts and connect any necessary platforms</div>
            </div>
          </div>

          <div class="step">
            <div class="step-number">3</div>
            <div class="step-content">
              <div class="step-title">Strategy Call</div>
              <div class="step-desc">We'll schedule a kickoff call to align on goals and next steps</div>
            </div>
          </div>

          <p style="margin-top: 24px; font-size: 14px; color: #4b5563;">
            Expect to hear from us within <strong>3-5 business days</strong>. If you have any urgent questions in the meantime, feel free to reply to this email.
          </p>
        </div>

        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} ${agencyName} powered by AudienceOS</p>
          <p>This is an automated message from your marketing team.</p>
        </div>
      </div>
    </body>
    </html>
  `

  const textContent = `
Onboarding Complete - Welcome to ${agencyName}!

Hi ${clientName} team,

Thank you for completing your onboarding submission! We've received all of your information and our team is now reviewing everything.
${slackChannelName ? `\nA dedicated Slack channel #${slackChannelName} has been set up for your account.\n` : ''}
What happens next:
1. Review & Audit - Our team will review your submission and audit your current setup
2. Account Setup - We'll configure your accounts and connect any necessary platforms
3. Strategy Call - We'll schedule a kickoff call to align on goals and next steps

Expect to hear from us within 3-5 business days. If you have any urgent questions, feel free to reply to this email.

(c) ${new Date().getFullYear()} ${agencyName} powered by AudienceOS
  `

  return sendEmail({
    to,
    subject: `Onboarding Complete - Welcome to ${agencyName}!`,
    html: htmlContent,
    text: textContent,
    replyTo: 'cs@audienceos.io',
  })
}
