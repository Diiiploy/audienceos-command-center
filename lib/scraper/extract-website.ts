/**
 * Website content extractor for AI context enrichment
 * Server-side only — used by the generate-concepts endpoint
 */

export interface WebsiteContent {
  title: string
  description: string
  headings: string[]
  keyText: string[]
}

/**
 * Extract key content from a website URL for AI prompt context.
 * Gracefully degrades on failure — returns empty fields so AI proceeds with intake data only.
 */
export async function extractWebsiteContent(url: string): Promise<WebsiteContent> {
  const empty: WebsiteContent = { title: '', description: '', headings: [], keyText: [] }

  try {
    // Normalize URL
    let normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = `https://${normalizedUrl}`
    }

    const response = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AudienceOS/1.0; +https://audienceos.com)',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(10000),
      redirect: 'follow',
    })

    if (!response.ok) return empty

    const html = await response.text()

    // Extract <title>
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch?.[1]?.trim() || ''

    // Extract <meta name="description">
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)
      || html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i)
    const description = descMatch?.[1]?.trim() || ''

    // Extract h1-h3 headings
    const headingRegex = /<h[1-3][^>]*>([^<]+)<\/h[1-3]>/gi
    const headings: string[] = []
    let match
    while ((match = headingRegex.exec(html)) !== null && headings.length < 10) {
      const text = match[1].replace(/\s+/g, ' ').trim()
      if (text.length > 3) headings.push(text)
    }

    // Extract first 5 substantial <p> tags
    const pRegex = /<p[^>]*>([^<]{20,})<\/p>/gi
    const keyText: string[] = []
    while ((match = pRegex.exec(html)) !== null && keyText.length < 5) {
      const text = match[1].replace(/\s+/g, ' ').trim()
      if (text.length > 20) keyText.push(text.slice(0, 500))
    }

    // Truncate total output to 4000 chars for Gemini context window
    const result: WebsiteContent = { title, description, headings, keyText }
    const totalLength = JSON.stringify(result).length
    if (totalLength > 4000) {
      // Trim keyText entries until under limit
      while (JSON.stringify(result).length > 4000 && result.keyText.length > 0) {
        result.keyText.pop()
      }
    }

    return result
  } catch {
    // Network errors, timeouts, CORS, SPAs — all gracefully degraded
    return empty
  }
}
