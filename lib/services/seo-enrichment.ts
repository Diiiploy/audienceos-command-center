/**
 * SEO Enrichment Service
 *
 * Routes through diiiploy-gateway for SEO data (DataForSEO).
 * Product infrastructure - does NOT use chi-gateway (personal PAI).
 *
 * Gateway handles credentials, rate limiting, and audit logging.
 * Cost: ~$0.03 per enrichment (domain metrics + rank overview + competitors)
 *
 * Note: Backlinks API requires a separate DataForSEO subscription.
 * When inactive, domain_rank and backlinks will be null.
 */

const DIIIPLOY_GATEWAY = process.env.DIIIPLOY_GATEWAY_URL || 'https://diiiploy-gateway.diiiploy.workers.dev'

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
 * Get gateway API key from environment
 */
function getGatewayApiKey(): string | null {
  return process.env.DIIIPLOY_GATEWAY_API_KEY || null
}

/**
 * Fetch from diiiploy-gateway with retry logic
 */
async function fetchFromGateway(
  endpoint: string,
  body: Record<string, unknown>,
  retries = 3
): Promise<Response> {
  const apiKey = getGatewayApiKey()

  const tenantId = process.env.DIIIPLOY_TENANT_ID || ''

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  if (tenantId) {
    headers['X-Tenant-ID'] = tenantId
  }

  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout

      const response = await fetch(`${DIIIPLOY_GATEWAY}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      })
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
 * Fetches domain SEO metrics via diiiploy-gateway
 */
export async function enrichDomainSEO(domain: string): Promise<SEOEnrichmentResult> {
  try {
    // Parallel fetch: domain metrics + rank overview + competitors via gateway
    const [domainRes, rankOverviewRes, competitorsRes] = await Promise.all([
      // Domain metrics (backlinks summary — requires Backlinks subscription)
      fetchFromGateway('/dataforseo/domain', { target: domain }),
      // Rank overview (keyword counts, traffic value)
      fetchFromGateway('/dataforseo/rank-overview', {
        target: domain,
        location: 2840, // USA
      }),
      // Competitors (request 6 to account for self-domain in results)
      fetchFromGateway('/dataforseo/competitors', {
        target: domain,
        limit: 6,
        location: 2840, // USA
      }),
    ])

    const [domainData, rankOverviewData, competitorsData] = await Promise.all([
      domainRes.json(),
      rankOverviewRes.json(),
      competitorsRes.json(),
    ])

    // Parse domain metrics (may be null if Backlinks subscription inactive)
    const domainTask = domainData.tasks?.[0]
    const domainMetrics = domainTask?.status_code === 20000
      ? domainTask?.result?.[0] || {}
      : {}

    // Parse rank overview (keyword and traffic metrics)
    const organicMetrics = rankOverviewData.tasks?.[0]?.result?.[0]?.items?.[0]?.metrics?.organic || {}

    // Parse competitors (filter out self-domain from results)
    const allCompetitorItems = competitorsData.tasks?.[0]?.result?.[0]?.items || []
    const competitorItems = allCompetitorItems.filter(
      (c: { domain: string }) => c.domain !== domain
    )

    const summary: SEOSummary = {
      total_keywords: organicMetrics.count || 0,
      traffic_value: Math.round((organicMetrics.etv || 0) * 100) / 100,
      top_10_keywords: (organicMetrics.pos_1 || 0) + (organicMetrics.pos_2_3 || 0) + (organicMetrics.pos_4_10 || 0),
      competitors_count: competitorItems.length,
      domain_rank: domainMetrics.rank || null,
      backlinks: domainMetrics.backlinks || null,
    }

    // Map competitors — DataForSEO uses "intersections" as the field name
    const competitors = competitorItems.slice(0, 5).map(
      (c: { domain: string; intersections?: number }) => ({
        domain: c.domain,
        intersecting_keywords: c.intersections || 0,
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
    console.error('SEO enrichment error via diiiploy-gateway:', error)
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
