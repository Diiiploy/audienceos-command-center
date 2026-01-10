import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Public endpoint - no auth required, validated by link token
// GET /api/public/onboarding/[token] - Get onboarding instance + form fields

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params

    if (!token || token.length < 32) {
      return NextResponse.json(
        { error: 'Invalid onboarding token' },
        { status: 400 }
      )
    }

    // Create Supabase client with service role for public access
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
        },
      }
    )

    // Find onboarding instance by token
    const { data: instance, error: instanceError } = await supabase
      .from('onboarding_instance')
      .select(`
        id,
        status,
        journey_id,
        client:client_id (
          id,
          name
        ),
        journey:journey_id (
          id,
          name,
          welcome_video_url,
          stages
        )
      `)
      .eq('link_token', token)
      .single()

    if (instanceError || !instance) {
      return NextResponse.json(
        { error: 'Onboarding not found or expired' },
        { status: 404 }
      )
    }

    // Check if already completed
    if (instance.status === 'completed') {
      return NextResponse.json(
        { error: 'This onboarding has already been completed', completed: true },
        { status: 410 }
      )
    }

    // Fetch form fields for this journey or agency-default fields
    const { data: fields } = await supabase
      .from('intake_form_field')
      .select('*')
      .or(`journey_id.eq.${instance.journey_id},journey_id.is.null`)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    // Filter to journey-specific fields first, then fall back to null journey_id
    const journeyFields = fields?.filter(f => f.journey_id === instance.journey_id) || []
    const defaultFields = fields?.filter(f => f.journey_id === null) || []
    const finalFields = journeyFields.length > 0 ? journeyFields : defaultFields

    return NextResponse.json({
      data: {
        instance: {
          id: instance.id,
          status: instance.status,
          client_name: (instance.client as unknown as { name: string } | null)?.name || 'Client',
        },
        journey: instance.journey,
        fields: finalFields,
      }
    })
  } catch (error) {
    console.error('Public onboarding fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
