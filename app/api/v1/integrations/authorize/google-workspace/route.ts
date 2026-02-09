/**
 * Google Workspace OAuth Authorization
 *
 * Redirects to diiiploy-gateway for the full OAuth lifecycle.
 * The gateway is the single source of truth for OAuth tokens.
 *
 * RBAC: Requires integrations:manage
 */

import { NextResponse } from 'next/server'
import { withPermission, type AuthenticatedRequest } from '@/lib/rbac/with-permission'
import { integrationLogger } from '@/lib/logger'

// GET - Redirect to gateway OAuth flow
export const GET = withPermission({ resource: 'integrations', action: 'manage' })(
  async (request: AuthenticatedRequest) => {
    try {
      const gatewayUrl = process.env.DIIIPLOY_GATEWAY_URL || 'https://diiiploy-gateway.diiiploy.workers.dev'
      const tenantId = process.env.DIIIPLOY_TENANT_ID

      if (!tenantId) {
        integrationLogger.error({}, 'DIIIPLOY_TENANT_ID not configured')
        return NextResponse.json(
          { error: 'Gateway not configured', message: 'DIIIPLOY_TENANT_ID is not set' },
          { status: 500 }
        )
      }

      const authorizeUrl = `${gatewayUrl}/oauth/google/authorize?tenant_id=${tenantId}`
      return NextResponse.redirect(authorizeUrl)
    } catch (error) {
      integrationLogger.error({ err: error }, 'OAuth initiation error')
      return NextResponse.json(
        { error: 'Authorization initiation failed' },
        { status: 500 }
      )
    }
  }
)
