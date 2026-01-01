import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/v1/integrations/[id] - Get single integration details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createRouteHandlerClient(cookies)

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: integration, error } = await supabase
      .from('integration')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    // Return without exposing tokens
    const { access_token, refresh_token, ...safeIntegration } = integration

    return NextResponse.json({ data: safeIntegration })
  } catch (error) {
    console.error('Integration GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/v1/integrations/[id] - Update integration config
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createRouteHandlerClient(cookies)

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Only allow updating specific fields
    const allowedFields = ['config', 'is_connected']
    const updates: Record<string, unknown> = {}

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const { data: integration, error } = await supabase
      .from('integration')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating integration:', error)
      return NextResponse.json(
        { error: 'Failed to update integration' },
        { status: 500 }
      )
    }

    if (!integration) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    // Return without exposing tokens
    const { access_token, refresh_token, ...safeIntegration } = integration

    return NextResponse.json({ data: safeIntegration })
  } catch (error) {
    console.error('Integration PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/v1/integrations/[id] - Disconnect and delete integration
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createRouteHandlerClient(cookies)

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First check if integration exists
    const { data: existing } = await supabase
      .from('integration')
      .select('id, provider')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Integration not found' }, { status: 404 })
    }

    // TODO: Revoke OAuth tokens with provider before deletion
    // This would be a call to the provider's revoke endpoint

    // Delete the integration
    const { error } = await supabase
      .from('integration')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting integration:', error)
      return NextResponse.json(
        { error: 'Failed to delete integration' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: `${existing.provider} integration disconnected and deleted`,
    })
  } catch (error) {
    console.error('Integration DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
