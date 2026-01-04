/**
 * Next.js Instrumentation
 * Runs at application startup to validate configuration
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

import './sentry.server.config'

export async function register() {
  // Only run validation in Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await validateSecurityConfiguration()
  }
}

/**
 * Validate security configuration at startup
 * In production: throws error if critical security keys are missing
 * In development: logs warnings but allows startup
 */
async function validateSecurityConfiguration() {
  const isProduction = process.env.NODE_ENV === 'production'
  const _isDevelopment = process.env.NODE_ENV === 'development'
  // Vercel preview deployments have NODE_ENV=production but VERCEL_ENV=preview
  // Only enforce strict security in actual production, not preview deployments
  const isVercelPreview = process.env.VERCEL_ENV === 'preview'
  const isStrictProduction = isProduction && !isVercelPreview

  const errors: string[] = []
  const warnings: string[] = []

  // SEC-001: OAuth state signing
  if (!process.env.OAUTH_STATE_SECRET) {
    const msg = 'OAUTH_STATE_SECRET is not set - OAuth CSRF protection disabled'
    if (isStrictProduction) {
      errors.push(msg)
    } else {
      warnings.push(msg)
    }
  }

  // SEC-002: Token encryption
  if (!process.env.TOKEN_ENCRYPTION_KEY) {
    const msg = 'TOKEN_ENCRYPTION_KEY is not set - OAuth tokens will not be encrypted at rest'
    if (isStrictProduction) {
      errors.push(msg)
    } else {
      warnings.push(msg)
    }
  }

  // Supabase configuration (required in strict production only)
  // In CI/preview environments, these may not be set - that's okay
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    if (isStrictProduction) {
      errors.push('NEXT_PUBLIC_SUPABASE_URL is required')
    } else {
      warnings.push('NEXT_PUBLIC_SUPABASE_URL is not set - using placeholder for build')
    }
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (isStrictProduction) {
      errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
    } else {
      warnings.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is not set - using placeholder for build')
    }
  }

  // Log warnings in development or preview
  if (!isStrictProduction && warnings.length > 0) {
    console.warn('\n[Security Warnings]')
    warnings.forEach(w => console.warn(`  - ${w}`))
    console.warn('')
  }

  // Fail startup only in strict production if security is not configured
  if (errors.length > 0) {
    console.error('\n[Security Configuration Error]')
    errors.forEach(e => console.error(`  - ${e}`))
    console.error('')

    if (isStrictProduction) {
      throw new Error(
        `Security configuration invalid. ${errors.length} error(s) must be fixed before deployment.`
      )
    }
  }

  // Log success in non-strict-production environments
  if (!isStrictProduction && errors.length === 0 && warnings.length === 0) {
    console.log('[Security] Configuration validated successfully')
  }
}
