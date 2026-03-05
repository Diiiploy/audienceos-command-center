import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createSlackChannelForClient } from '@/lib/integrations/slack-channel-service'

// Public endpoint - no auth required, validated by link token
// POST /api/public/onboarding/[token]/provision - Provision resources (Slack channel, Drive folder)

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export async function POST(
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
        agency_id,
        status,
        client:client_id (
          id,
          name
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

    // Idempotency check: if already provisioned, return cached results
    const { data: existingInstance } = await (supabase as any)
      .from('onboarding_instance')
      .select('provisioning_data')
      .eq('id', instance.id)
      .single()

    if (existingInstance?.provisioning_data?.provisioned_at) {
      return NextResponse.json({
        data: existingInstance.provisioning_data,
      })
    }

    const client = instance.client as unknown as { id: string; name: string } | null
    const clientId = client?.id
    const clientName = client?.name || 'Client'
    const agencyId = instance.agency_id

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client not found for this onboarding instance' },
        { status: 404 }
      )
    }

    // --- Provision resources independently ---

    // 1. Slack channel
    let slackResult: { ok?: boolean; skipped?: boolean; reason?: string; channel_id?: string; channel_name?: string; error?: string }

    if (!process.env.DIIIPLOY_GATEWAY_API_KEY) {
      slackResult = { skipped: true, reason: 'Slack not configured' }
    } else {
      const slackResponse = await createSlackChannelForClient({
        agencyId,
        clientId,
        clientName,
        channelNameOverride: slugify(clientName),
        label: 'onboarding',
        supabase,
      })

      if (slackResponse.ok && slackResponse.data) {
        slackResult = {
          ok: true,
          channel_id: slackResponse.data.slack_channel_id,
          channel_name: slackResponse.data.slack_channel_name,
        }
      } else {
        slackResult = {
          ok: false,
          error: slackResponse.error || 'Failed to create Slack channel',
        }
      }
    }

    // 2. Google Drive folder
    let driveResult: { ok?: boolean; skipped?: boolean; reason?: string; folder_id?: string; folder_url?: string; error?: string }

    if (!process.env.DIIIPLOY_GATEWAY_URL) {
      driveResult = { skipped: true, reason: 'Drive not configured' }
    } else {
      try {
        const driveResponse = await fetch(`${process.env.DIIIPLOY_GATEWAY_URL}/drive/folder`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.DIIIPLOY_GATEWAY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: `${clientName} - Onboarding`,
          }),
          signal: AbortSignal.timeout(15000),
        })

        if (!driveResponse.ok) {
          const errorText = await driveResponse.text().catch(() => 'Unknown error')
          driveResult = {
            ok: false,
            error: `Drive API returned ${driveResponse.status}: ${errorText}`,
          }
        } else {
          const driveData = await driveResponse.json() as {
            id?: string
            folder_id?: string
            url?: string
            folder_url?: string
            webViewLink?: string
          }

          driveResult = {
            ok: true,
            folder_id: driveData.id || driveData.folder_id || '',
            folder_url: driveData.url || driveData.folder_url || driveData.webViewLink || '',
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        driveResult = { ok: false, error: message }
      }
    }

    // --- Build provisioning data and update instance ---

    const provisioningData = {
      client_id: clientId,
      client_name: clientName,
      slack: slackResult,
      drive: driveResult,
      provisioned_at: new Date().toISOString(),
    }

    // Update onboarding_instance with results
    // Using (supabase as any) because these columns haven't been added to generated types yet
    const updatePayload: Record<string, unknown> = {
      provisioning_data: provisioningData,
    }

    // Store structured column data when available
    if (slackResult.ok && slackResult.channel_id) {
      updatePayload.slack_channel_id = slackResult.channel_id
      updatePayload.slack_channel_name = slackResult.channel_name
    }
    if (driveResult.ok && driveResult.folder_id) {
      updatePayload.drive_folder_id = driveResult.folder_id
      updatePayload.drive_folder_url = driveResult.folder_url
    }

    const { error: updateError } = await (supabase as any)
      .from('onboarding_instance')
      .update(updatePayload)
      .eq('id', instance.id)

    if (updateError) {
      console.error('[provision] Failed to update onboarding instance:', updateError)
      // Still return results even if DB update fails -- the resources were created
    }

    return NextResponse.json({
      data: provisioningData,
    })
  } catch (error) {
    console.error('Provisioning error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
