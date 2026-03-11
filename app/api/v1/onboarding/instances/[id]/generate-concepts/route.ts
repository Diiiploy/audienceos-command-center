import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { withRateLimit, withCsrfProtection, isValidUUID, createErrorResponse } from '@/lib/security'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'
import { extractWebsiteContent } from '@/lib/scraper/extract-website'
import { dispatchWorkflowEvent } from '@/lib/workflows/event-router'

// POST /api/v1/onboarding/instances/:id/generate-concepts
export const POST = withPermission({ resource: 'clients', action: 'write' })(
  async (request: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    // Rate limit: 5 concept generations per minute
    const rateLimitResponse = withRateLimit(request, { maxRequests: 5, windowMs: 60000 })
    if (rateLimitResponse) return rateLimitResponse

    const csrfError = withCsrfProtection(request)
    if (csrfError) return csrfError

    try {
      const { id } = await params
      if (!isValidUUID(id)) {
        return createErrorResponse(400, 'Invalid onboarding instance ID')
      }

      const supabase = await createRouteHandlerClient(cookies)
      const agencyId = request.user.agencyId
      const userId = request.user.id

      // 1. Fetch onboarding instance with relations
      const { data: instance, error: instanceError } = await supabase
        .from('onboarding_instance')
        .select(`
          *,
          client:client_id (
            id,
            name,
            contact_email,
            website,
            industry,
            seo_data
          ),
          journey:journey_id (
            id,
            name,
            stages
          )
        `)
        .eq('id', id)
        .single()

      if (instanceError || !instance) {
        return createErrorResponse(404, 'Onboarding instance not found')
      }

      const client = instance.client as any
      if (!client) {
        return createErrorResponse(400, 'No client linked to this onboarding instance')
      }

      // 2. Fetch intake responses
      const { data: intakeResponses } = await supabase
        .from('intake_response')
        .select('question_id, question_text, response_value')
        .eq('instance_id', id)

      // 3. Extract website content (graceful degradation)
      const websiteUrl = client.website || ''
      let websiteContent = { title: '', description: '', headings: [] as string[], keyText: [] as string[] }
      if (websiteUrl) {
        websiteContent = await extractWebsiteContent(websiteUrl)
      }

      // 4. Build Gemini prompt
      const apiKey = process.env.GOOGLE_AI_API_KEY
      if (!apiKey) {
        return createErrorResponse(500, 'AI service not configured')
      }

      const systemPrompt = `You are an elite advertising strategist trained in Russell Brunson's direct response methodology and optimized for Meta's Andromeda algorithm.

## Russell Brunson Framework
- Hook/Story/Offer: Every ad needs a scroll-stopping hook, a relatable story, and an irresistible offer
- Big Idea: One bold, singular idea that cuts through noise
- Attractive Character: Brand embodies an archetype (Leader, Adventurer, Reporter, or Reluctant Hero)
- Secret/Opportunity/Solution: Frame the product as a secret, new opportunity, or unique solution

## Meta Andromeda Optimization
- Creative Diversity: Each concept MUST be visually and tonally DISTINCT
- Quality Signals: Include engagement triggers (questions, bold claims, social proof hooks)
- Broad Targeting Compatible: Appeal to wide audiences, not narrow niches
- Format Variety: Suggest different formats (static, video, carousel) across concepts

Generate exactly 3 ad creative concepts. Each must include:
1. concept_name (catchy internal reference)
2. big_idea (core thesis in one sentence)
3. hook (opening line/visual that stops the scroll)
4. story_angle (narrative approach)
5. offer_frame (how the product/service is positioned)
6. character_archetype (Leader | Adventurer | Reporter | Reluctant Hero)
7. suggested_format (image | video | carousel | collection)
8. primary_copy (3-4 sentences of ad copy)
9. cta_text (call to action)
10. target_audience_signal (who this resonates with most)

Respond as a JSON array of 3 concept objects.`

      // Build user context from intake + website
      const intakeContext = intakeResponses?.length
        ? intakeResponses.map((r: any) => `Q: ${r.question_text}\nA: ${r.response_value}`).join('\n\n')
        : 'No intake responses available.'

      const websiteContext = websiteContent.title
        ? `Website Title: ${websiteContent.title}\nDescription: ${websiteContent.description}\nKey Headings: ${websiteContent.headings.join(', ')}\nKey Content: ${websiteContent.keyText.join(' | ')}`
        : 'No website data available.'

      const seoContext = client.seo_data
        ? `SEO Data: ${JSON.stringify(client.seo_data).slice(0, 1000)}`
        : ''

      const userPrompt = `## Client Information
Name: ${client.name}
Industry: ${client.industry || 'Not specified'}
Website: ${websiteUrl || 'Not provided'}

## Onboarding Intake Responses
${intakeContext}

## Website Analysis
${websiteContext}

${seoContext}

Generate 3 creative concepts for this client's advertising campaigns.`

      // 5. Call Gemini
      const { GoogleGenAI } = await import('@google/genai')
      const genai = new GoogleGenAI({ apiKey })

      const result = await genai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.8,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      })

      const responseText = result.text?.trim()
      if (!responseText) {
        return createErrorResponse(500, 'Empty response from AI')
      }

      // 6. Parse concepts
      let concepts: any[]
      try {
        concepts = JSON.parse(responseText)
        if (!Array.isArray(concepts) || concepts.length === 0) {
          throw new Error('Expected array of concepts')
        }
      } catch {
        return createErrorResponse(500, 'Failed to parse AI response')
      }

      // 7. Insert creatives into DB
      const formatMap: Record<string, string> = {
        image: 'image', video: 'video', carousel: 'carousel', collection: 'collection',
        static: 'image',
      }

      const creativeInserts = concepts.slice(0, 3).map((concept: any) => ({
        agency_id: agencyId,
        client_id: client.id,
        title: String(concept.concept_name || concept.big_idea || 'Untitled Concept').slice(0, 300),
        description: concept.big_idea ? String(concept.big_idea).slice(0, 5000) : null,
        format: formatMap[concept.suggested_format?.toLowerCase()] || 'image',
        status: 'concept',
        hook: concept.hook ? String(concept.hook).slice(0, 2000) : null,
        body_copy: concept.primary_copy ? String(concept.primary_copy).slice(0, 5000) : null,
        cta_text: concept.cta_text ? String(concept.cta_text).slice(0, 100) : null,
        target_audience: concept.target_audience_signal ? String(concept.target_audience_signal).slice(0, 2000) : null,
        platform: 'meta',
        ai_generated: true,
        ai_generation_data: {
          methodology: 'brunson_andromeda',
          concept,
          website_scraped: !!websiteContent.title,
          intake_responses_count: intakeResponses?.length || 0,
        },
        source_onboarding_id: id,
        created_by: userId,
      }))

      const { data: creatives, error: insertError } = await (supabase as any)
        .from('creative')
        .insert(creativeInserts)
        .select('id, title, status, format, hook')

      if (insertError) {
        return createErrorResponse(500, 'Failed to save creative concepts')
      }

      // 8. Auto-create ticket with concept summary
      const conceptSummary = concepts.slice(0, 3).map((c: any, i: number) =>
        `${i + 1}. ${c.concept_name}: ${c.big_idea} (${c.suggested_format})`
      ).join('\n')

      const { data: ticket } = await (supabase as any)
        .from('ticket')
        .insert({
          agency_id: agencyId,
          client_id: client.id,
          title: `AI Creative Concepts Generated — ${client.name}`,
          description: `3 creative concepts generated via Russell Brunson + Meta Andromeda methodology:\n\n${conceptSummary}\n\nSource: Onboarding intake for ${client.name}`,
          category: 'campaign',
          priority: 'medium',
          created_by: userId,
        })
        .select('id, number')
        .single()

      // 9. Fire-and-forget workflow event
      if (ticket) {
        dispatchWorkflowEvent(supabase, agencyId, userId, {
          type: 'ticket_created',
          data: {
            ticketId: ticket.id,
            title: `AI Creative Concepts Generated — ${client.name}`,
            category: 'campaign',
            priority: 'medium',
            clientId: client.id,
          },
          clientId: client.id,
        }).catch((err: Error) => {
          console.error('[generate-concepts] Workflow dispatch error:', err)
        })
      }

      return NextResponse.json({
        data: {
          concepts: creatives,
          ticketId: ticket?.id || null,
          ticketNumber: ticket?.number || null,
        },
      })
    } catch (error) {
      console.error('[generate-concepts] Error:', error)
      return createErrorResponse(500, 'Internal server error')
    }
  }
)
