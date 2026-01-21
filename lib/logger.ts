/**
 * Structured Logging Service
 *
 * Provides consistent, structured logging across the application.
 * Uses Pino for high-performance JSON logging in production.
 *
 * Usage:
 *   import { logger } from '@/lib/logger'
 *   logger.info('User logged in', { userId: '123', action: 'login' })
 *   logger.error('Failed to process', { error: err.message, requestId })
 *
 * IMPORTANT: Never log PII (emails, names) or secrets (tokens, keys).
 * Use sanitized identifiers only.
 */

import pino from 'pino'

// =============================================================================
// CONFIGURATION
// =============================================================================

const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const IS_TEST = process.env.NODE_ENV === 'test'
const LOG_LEVEL = process.env.LOG_LEVEL || (IS_PRODUCTION ? 'info' : 'debug')

// =============================================================================
// LOGGER INSTANCE
// =============================================================================

/**
 * Main application logger
 * - Production: JSON format for log aggregators (Vercel, Datadog, etc.)
 * - Development: Pretty printed for readability
 * - Test: Silent unless LOG_LEVEL explicitly set
 */
export const logger = pino({
  level: IS_TEST ? 'silent' : LOG_LEVEL,
  // Base fields included in every log entry
  base: {
    env: process.env.NODE_ENV || 'development',
    service: 'audienceos',
  },
  // Timestamp format
  timestamp: pino.stdTimeFunctions.isoTime,
  // Production: JSON, Development: formatted
  transport: IS_PRODUCTION
    ? undefined // JSON output for production
    : {
        target: 'pino/file',
        options: { destination: 1 }, // stdout
      },
  // Redact sensitive fields automatically
  redact: {
    paths: [
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'apiKey',
      'secret',
      'authorization',
      'cookie',
      '*.password',
      '*.token',
      '*.accessToken',
      '*.refreshToken',
      '*.apiKey',
      '*.secret',
    ],
    censor: '[REDACTED]',
  },
})

// =============================================================================
// CHILD LOGGERS FOR SPECIFIC CONTEXTS
// =============================================================================

/**
 * Create a child logger with additional context
 * Useful for request-scoped logging or module-specific logs
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context)
}

/**
 * Pre-configured child loggers for common modules
 */
export const apiLogger = logger.child({ module: 'api' })
export const authLogger = logger.child({ module: 'auth' })
export const dbLogger = logger.child({ module: 'database' })
export const integrationLogger = logger.child({ module: 'integration' })
export const chatLogger = logger.child({ module: 'chat' })

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Sanitize an object for logging by removing PII
 * Use this when logging user-related data
 */
export function sanitizeForLog<T extends Record<string, unknown>>(
  obj: T,
  allowedFields: (keyof T)[]
): Partial<T> {
  const sanitized: Partial<T> = {}
  for (const field of allowedFields) {
    if (field in obj) {
      sanitized[field] = obj[field]
    }
  }
  return sanitized
}

/**
 * Log an error with consistent formatting
 * Extracts error details safely
 */
export function logError(
  log: pino.Logger,
  message: string,
  error: unknown,
  context?: Record<string, unknown>
) {
  const errorInfo = error instanceof Error
    ? {
        errorName: error.name,
        errorMessage: error.message,
        errorStack: IS_PRODUCTION ? undefined : error.stack,
      }
    : { errorValue: String(error) }

  log.error({ ...errorInfo, ...context }, message)
}

/**
 * Create a request-scoped logger with request ID
 * Use in API routes for tracing
 */
export function createRequestLogger(requestId: string, route: string) {
  return logger.child({ requestId, route })
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type Logger = pino.Logger
