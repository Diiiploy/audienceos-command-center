import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Public endpoint - no auth required, validated by link token
// POST /api/public/onboarding/[token]/submit - Submit intake form responses

export async function POST(
  request: NextRequest,
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

    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    const { responses } = body as { responses?: Array<{ field_id: string; value: string }> }

    if (!responses || !Array.isArray(responses)) {
      return NextResponse.json(
        { error: 'Responses array is required' },
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
      .select('id, agency_id, status, journey_id')
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
        { error: 'This onboarding has already been completed' },
        { status: 410 }
      )
    }

    // Insert all responses
    const responseInserts = responses.map((r) => ({
      agency_id: instance.agency_id,
      instance_id: instance.id,
      field_id: r.field_id,
      value: String(r.value || ''),
    }))

    const { error: insertError } = await supabase
      .from('intake_response')
      .upsert(responseInserts, {
        onConflict: 'instance_id,field_id',
      })

    if (insertError) {
      console.error('Failed to save responses:', insertError)
      return NextResponse.json(
        { error: 'Failed to save responses' },
        { status: 500 }
      )
    }

    // Update the first stage status to "completed" (intake stage)
    const { data: journey } = await supabase
      .from('onboarding_journey')
      .select('stages')
      .eq('id', instance.journey_id)
      .single()

    if (journey && Array.isArray(journey.stages) && journey.stages.length > 0) {
      const firstStage = journey.stages[0] as { id: string }
      await supabase
        .from('onboarding_stage_status')
        .upsert({
          agency_id: instance.agency_id,
          instance_id: instance.id,
          stage_id: firstStage.id,
          status: 'completed',
          completed_at: new Date().toISOString(),
        }, {
          onConflict: 'instance_id,stage_id',
        })
    }

    // Update instance status to in_progress
    await supabase
      .from('onboarding_instance')
      .update({ status: 'in_progress' })
      .eq('id', instance.id)

    return NextResponse.json({
      success: true,
      message: 'Intake form submitted successfully',
    })
  } catch (error) {
    console.error('Public onboarding submit error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
