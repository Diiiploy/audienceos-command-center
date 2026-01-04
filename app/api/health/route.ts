import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

interface HealthCheck {
  status: 'up' | 'down'
  latency?: number
}

interface HealthResponse {
  status: 'healthy' | 'degraded'
  timestamp: string
  checks: {
    database: HealthCheck
    auth: HealthCheck
  }
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const checks: HealthResponse['checks'] = {
    database: { status: 'down', latency: 0 },
    auth: { status: 'down' },
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const start = Date.now()
    const { error } = await supabase.from('agency').select('id').limit(1)

    if (!error) {
      checks.database = { status: 'up', latency: Date.now() - start }
      checks.auth = { status: 'up' }
    }
  } catch {
    // Checks remain in 'down' state
  }

  const healthy = checks.database.status === 'up'

  return NextResponse.json(
    {
      status: healthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: healthy ? 200 : 503 }
  )
}
