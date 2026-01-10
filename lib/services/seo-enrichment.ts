/**
 * SEO Enrichment Service
 *
 * Calls DataForSEO API directly for client enrichment during onboarding.
 * Server-side only - credentials never exposed to client.
 *
 * Cost: ~$0.02 per enrichment (domain metrics + competitors call)
 */

const DATAFORSEO_API = 'https://api.dataforseo.com/v3'

export interface SEOSummary {
  total_keywords: number
  traffic_value: number
  top_10_keywords: number
  competitors_count: number
  domain_rank: number | null
  backlinks: number | null
}

export interface SEOEnrichmentResult {
  success: boolean
  domain: string
  summary: SEOSummary | null
  competitors: Array<{
    domain: string
    intersecting_keywords: number
  }>
  fetched_at: string
  error?: string
}

/**
 * Validates and normalizes a domain from user input
 */
export function validateDomain(url: string): { valid: boolean; domain: string | null; error?: string } {
  if (!url || url.trim() === '') {
    return { valid: true, domain: null } // Empty is OK, skip enrichment
  }

  try {
    // Add protocol if missing
    const normalized = url.startsWith('http') ? url : `https://${url}`
    const parsed = new URL(normalized)
    const domain = parsed.hostname.replace(/^www\./, '')

    // Must have TLD
    if (!domain.includes('.') || domain.endsWith('.')) {
      return { valid: false, domain: null, error: 'Please enter a valid domain (e.g., example.com)' }
    }

    return { valid: true, domain }
  } catch {
    return { valid: false, domain: null, error: 'Invalid URL format' }
  }
}

/**
 * Fetch from DataForSEO with retry logic
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout

      const response = await fetch(url, { ...options, signal: controller.signal })
      clearTimeout(timeoutId)

      if (response.status === 429 && i < retries - 1) {
        // Rate limited - exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
        continue
      }

      return response
    } catch (error) {
      if (i === retries - 1) throw error
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  throw new Error('Max retries exceeded')
}

/**
 * Get credentials from environment
 */
function getCredentials(): { auth: string } | null {
  const login = process.env.DATAFORSEO_LOGIN
  const password = process.env.DATAFORSEO_PASSWORD

  if (!login || !password) {
    return null
  }

  // DataForSEO uses HTTP Basic Auth
  const auth = Buffer.from(`${login}:${password}`).toString('base64')
  return { auth }
}

/**
 * Fetches domain SEO metrics from DataForSEO
 */
export async function enrichDomainSEO(domain: string): Promise<SEOEnrichmentResult> {
  const credentials = getCredentials()

  if (!credentials) {
    console.error('DataForSEO credentials not configured')
    return {
      success: false,
      domain,
      summary: null,
      competitors: [],
      fetched_at: new Date().toISOString(),
      error: 'SEO enrichment not configured',
    }
  }

  const headers = {
    'Authorization': `Basic ${credentials.auth}`,
    'Content-Type': 'application/json',
  }

  try {
    // Parallel fetch: domain metrics (backlinks summary) + competitors
    const [domainRes, competitorsRes] = await Promise.all([
      // Backlinks summary gives us domain rank and backlink count
      fetchWithRetry(`${DATAFORSEO_API}/backlinks/summary/live`, {
        method: 'POST',
        headers,
        body: JSON.stringify([{
          target: domain,
        }]),
      }),
      // Competitors domain gives us competitive landscape
      fetchWithRetry(`${DATAFORSEO_API}/dataforseo_labs/google/competitors_domain/live`, {
        method: 'POST',
        headers,
        body: JSON.stringify([{
          target: domain,
          location_code: 2840, // USA
          language_code: 'en',
          limit: 5,
        }]),
      }),
    ])

    const [domainData, competitorsData] = await Promise.all([
      domainRes.json(),
      competitorsRes.json(),
    ])

    // Parse domain metrics response
    const domainMetrics = domainData.tasks?.[0]?.result?.[0] || {}

    // Parse competitors response
    const competitorItems = competitorsData.tasks?.[0]?.result?.[0]?.items || []

    const summary: SEOSummary = {
      total_keywords: 0, // Would need ranked_keywords endpoint
      traffic_value: 0, // Would need traffic analytics endpoint
      top_10_keywords: 0, // Would need ranked_keywords endpoint
      competitors_count: competitorItems.length,
      domain_rank: domainMetrics.rank || null,
      backlinks: domainMetrics.backlinks || null,
    }

    // Map competitors
    const competitors = competitorItems.slice(0, 5).map(
      (c: { domain: string; intersecting_keywords?: number }) => ({
        domain: c.domain,
        intersecting_keywords: c.intersecting_keywords || 0,
      })
    )

    return {
      success: true,
      domain,
      summary,
      competitors,
      fetched_at: new Date().toISOString(),
    }
  } catch (error) {
    console.error('DataForSEO API error:', error)
    return {
      success: false,
      domain,
      summary: null,
      competitors: [],
      fetched_at: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'SEO enrichment failed',
    }
  }
}
