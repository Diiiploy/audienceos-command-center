/**
 * Analytics Function Executors
 *
 * Handles get_agency_stats function calls.
 * Uses Supabase when available, falls back to mock data for standalone mode.
 *
 * Ported from Holy Grail Chat (HGC).
 * Part of: 3-System Consolidation
 */

import type {
  ExecutorContext,
  GetAgencyStatsArgs,
  AgencyStats,
} from './types';
import { getAccessibleClientIds } from '@/lib/rbac/client-access';

/**
 * Get agency stats using Supabase aggregation
 * Falls back to mock data when Supabase unavailable
 */
export async function getAgencyStats(
  context: ExecutorContext,
  rawArgs: Record<string, unknown>
): Promise<AgencyStats> {
  const args = rawArgs as unknown as GetAgencyStatsArgs;
  const { agencyId, userId, supabase } = context;
  const period = args.period ?? 'week';

  // If Supabase is available, use real aggregation queries
  if (supabase) {
    try {
      // Member-scoped access: scope stats to only accessible clients
      const accessibleClientIds = await getAccessibleClientIds(userId, agencyId, supabase);

      // Get total and active clients (scoped for Members)
      let totalClientsQuery = supabase
        .from('client')
        .select('id', { count: 'exact', head: true })
        .eq('agency_id', agencyId);
      if (accessibleClientIds.length > 0) {
        totalClientsQuery = totalClientsQuery.in('id', accessibleClientIds);
      }
      const { count: totalClients } = await totalClientsQuery;

      // Get clients by health status (scoped for Members)
      let healthQuery = supabase
        .from('client')
        .select('health_status')
        .eq('agency_id', agencyId);
      if (accessibleClientIds.length > 0) {
        healthQuery = healthQuery.in('id', accessibleClientIds);
      }
      const { data: healthCounts } = await healthQuery;

      const atRiskClients = (healthCounts || []).filter(
        (c) => c.health_status === 'red' || c.health_status === 'yellow'
      ).length;

      const greenClients = (healthCounts || []).filter(
        (c) => c.health_status === 'green'
      ).length;

      // Calculate avg health score (green=100, yellow=50, red=0)
      const totalClientCount = healthCounts?.length || 1;
      const healthScore = Math.round(
        ((greenClients * 100) +
         ((healthCounts || []).filter((c) => c.health_status === 'yellow').length * 50)) /
        totalClientCount
      );

      // Get open alerts count (scoped for Members)
      let openAlertsQuery = supabase
        .from('alert')
        .select('id', { count: 'exact', head: true })
        .eq('agency_id', agencyId)
        .eq('status', 'active');
      if (accessibleClientIds.length > 0) {
        openAlertsQuery = openAlertsQuery.in('client_id', accessibleClientIds);
      }
      const { count: openAlerts } = await openAlertsQuery;

      // Get resolved alerts for period (scoped for Members)
      const periodDays = period === 'today' ? 1 : period === 'week' ? 7 : period === 'month' ? 30 : 90;
      const cutoffDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString();

      let resolvedQuery = supabase
        .from('alert')
        .select('id', { count: 'exact', head: true })
        .eq('agency_id', agencyId)
        .eq('status', 'resolved')
        .gte('created_at', cutoffDate);
      if (accessibleClientIds.length > 0) {
        resolvedQuery = resolvedQuery.in('client_id', accessibleClientIds);
      }
      const { count: resolvedAlertsThisPeriod } = await resolvedQuery;

      return {
        period,
        totalClients: totalClients || 0,
        activeClients: totalClientCount,
        atRiskClients,
        openAlerts: openAlerts || 0,
        resolvedAlertsThisPeriod: resolvedAlertsThisPeriod || 0,
        avgHealthScore: healthScore,
      };
    } catch (error) {
      console.error(`[ERROR] get_agency_stats failed:`, error);
      throw new Error(`Failed to fetch agency stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Only use mock data when Supabase client is NOT provided (true standalone/dev mode)
  // In production, this should NEVER happen - fail loud if it does
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[SECURITY] Supabase client is required in production. Mock data is disabled.');
  }
  // Fallback: Mock stats for standalone mode
  const stats: AgencyStats = {
    period,
    totalClients: 12,
    activeClients: 10,
    atRiskClients: 3,
    openAlerts: 5,
    resolvedAlertsThisPeriod: period === 'today' ? 2 : period === 'week' ? 8 : 24,
    avgHealthScore: 72,
  };

  return stats;
}
