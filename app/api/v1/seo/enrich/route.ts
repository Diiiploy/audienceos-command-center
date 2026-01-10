/**
 * SEO Enrichment API Route
 *
 * Fetches SEO intelligence from DataForSEO via chi-gateway for client onboarding.
 * Returns domain metrics and competitors for display in the onboarding modal.
 *
 * Cost: ~$0.02 per enrichment (domain metrics + competitors call)
 */

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase'

const CHI_GATEWAY_URL = 'https://chi-gateway.roderic-andrews.workers.dev'

interface SEOEnrichmentRequest {
  domain: string
}

interface SEOSummary {
  total_keywords: number
  traffic_value: number
  top_10_keywords: number
  competitors_count: number
  domain_rank: number | null
  backlinks: number | null
}

interface SEOEnrichmentResult {
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
function validateDomain(url: string): { valid: boolean; domain: string | null; error?: string } {
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
 * Call chi-gateway MCP endpoint
 */
async function callChiGateway(toolName: string, args: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(`${CHI_GATEWAY_URL}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args,
      },
      id: 1,
    }),
  })

  if (!response.ok) {
    throw new Error(`Chi-gateway error: ${response.status}`)
  }

  const result = await response.json()

  // Parse the MCP response - content is in result.content[0].text as JSON string
  if (result.result?.content?.[0]?.text) {
    return JSON.parse(result.result.content[0].text)
  }

  return result.result
}

export async function POST(request: Request) {
  // Verify authentication
  const supabase = await createRouteHandlerClient(cookies)
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body: SEOEnrichmentRequest = await request.json()
    const { domain: rawDomain } = body

    // Validate domain
    const validation = validateDomain(rawDomain)
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    if (!validation.domain) {
      // Empty domain - return empty result
      return NextResponse.json({
        success: true,
        domain: '',
        summary: null,
        competitors: [],
        fetched_at: new Date().toISOString(),
      })
    }

    const domain = validation.domain

    // Fetch domain metrics and competitors in parallel via chi-gateway
    const [domainResult, competitorsResult] = await Promise.all([
      callChiGateway('dataforseo_domain', { target: domain }),
      callChiGateway('dataforseo_competitors', { target: domain, limit: 5 }),
    ])

    // Parse domain metrics response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const domainData = domainResult as any
    const domainMetrics = domainData?.tasks?.[0]?.result?.[0] || {}

    // Parse competitors response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const competitorsData = competitorsResult as any
    const competitorItems = competitorsData?.tasks?.[0]?.result?.[0]?.items || []

    const summary: SEOSummary = {
      total_keywords: domainMetrics.referring_domains_nofollow || 0, // Approximation from backlinks data
      traffic_value: domainMetrics.rank || 0,
      top_10_keywords: 0, // Would need ranked_keywords endpoint
      competitors_count: competitorItems.length,
      domain_rank: domainMetrics.rank || null,
      backlinks: domainMetrics.backlinks || null,
    }

    const competitors = competitorItems.slice(0, 5).map(
      (c: { domain: string; intersecting_keywords?: number }) => ({
        domain: c.domain,
        intersecting_keywords: c.intersecting_keywords || 0,
      })
    )

    const result: SEOEnrichmentResult = {
      success: true,
      domain,
      summary,
      competitors,
      fetched_at: new Date().toISOString(),
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('SEO enrichment error:', error)
    return NextResponse.json(
      {
        success: false,
        domain: '',
        summary: null,
        competitors: [],
        fetched_at: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'SEO enrichment failed',
      },
      { status: 500 }
    )
  }
}
