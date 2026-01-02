/**
 * Next.js Instrumentation
 * Runs at application startup to validate configuration
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

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
  const isDevelopment = process.env.NODE_ENV === 'development'

  const errors: string[] = []
  const warnings: string[] = []

  // SEC-001: OAuth state signing
  if (!process.env.OAUTH_STATE_SECRET) {
    const msg = 'OAUTH_STATE_SECRET is not set - OAuth CSRF protection disabled'
    if (isProduction) {
      errors.push(msg)
    } else {
      warnings.push(msg)
    }
  }

  // SEC-002: Token encryption
  if (!process.env.TOKEN_ENCRYPTION_KEY) {
    const msg = 'TOKEN_ENCRYPTION_KEY is not set - OAuth tokens will not be encrypted at rest'
    if (isProduction) {
      errors.push(msg)
    } else {
      warnings.push(msg)
    }
  }

  // Supabase configuration (required always)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    errors.push('NEXT_PUBLIC_SUPABASE_URL is required')
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    errors.push('NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
  }

  // Log warnings in development
  if (isDevelopment && warnings.length > 0) {
    console.warn('\n[Security Warnings]')
    warnings.forEach(w => console.warn(`  - ${w}`))
    console.warn('')
  }

  // Fail startup in production if security is not configured
  if (errors.length > 0) {
    console.error('\n[Security Configuration Error]')
    errors.forEach(e => console.error(`  - ${e}`))
    console.error('')

    if (isProduction) {
      throw new Error(
        `Security configuration invalid. ${errors.length} error(s) must be fixed before deployment.`
      )
    }
  }

  // Log success in development
  if (isDevelopment && errors.length === 0) {
    console.log('[Security] Configuration validated successfully')
  }
}
