-- ============================================================================
-- Airbyte Cloud Integration: Staging Schema + Transform Function
-- ============================================================================
-- This migration sets up the infrastructure for Airbyte Cloud managed ETL:
-- 1. airbyte_staging schema (Airbyte writes raw data here, no RLS)
-- 2. airbyte_account_mapping table (maps Airbyte connections to agency/client)
-- 3. airbyte_sync_log table (tracks sync history)
-- 4. Unique constraint on ad_performance for upserts
-- 5. transform_airbyte_ads_data() function (transforms staging -> ad_performance)
-- ============================================================================

-- 1. Create staging schema for Airbyte raw data
-- Airbyte writes directly here; no RLS needed on staging tables
CREATE SCHEMA IF NOT EXISTS airbyte_staging;

-- Grant usage to the service role (Airbyte connects as this user)
GRANT USAGE ON SCHEMA airbyte_staging TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA airbyte_staging TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA airbyte_staging GRANT ALL ON TABLES TO service_role;

-- 2. Airbyte Account Mapping
-- Maps Airbyte source/connection IDs to agency_id + client_id
CREATE TABLE IF NOT EXISTS public.airbyte_account_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agency(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.client(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('google_ads', 'meta_ads')),
  external_account_id TEXT NOT NULL,
  airbyte_source_id TEXT,
  airbyte_connection_id TEXT,
  table_prefix TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for mapping lookups
CREATE INDEX IF NOT EXISTS idx_airbyte_mapping_agency ON public.airbyte_account_mapping(agency_id);
CREATE INDEX IF NOT EXISTS idx_airbyte_mapping_connection ON public.airbyte_account_mapping(airbyte_connection_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_airbyte_mapping_unique
  ON public.airbyte_account_mapping(agency_id, platform, external_account_id);

-- RLS on airbyte_account_mapping (agency-scoped)
ALTER TABLE public.airbyte_account_mapping ENABLE ROW LEVEL SECURITY;

-- Bug 2 fix: Use RBAC-compatible role check (role_id + hierarchy_level)
-- instead of direct user.role enum which doesn't have 'owner' value
CREATE POLICY "Agency members can view their mappings"
  ON public.airbyte_account_mapping FOR SELECT
  USING (agency_id IN (
    SELECT agency_id FROM public."user" WHERE id = auth.uid()
  ));

CREATE POLICY "Agency admins can manage their mappings"
  ON public.airbyte_account_mapping FOR ALL
  USING (agency_id IN (
    SELECT u.agency_id FROM public."user" u
    JOIN public.role r ON u.role_id = r.id
    WHERE u.id = auth.uid()
    AND r.hierarchy_level <= 2
  ));

-- 3. Airbyte Sync Log
-- Tracks sync history for observability
CREATE TABLE IF NOT EXISTS public.airbyte_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agency(id) ON DELETE CASCADE,
  connection_id TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('google_ads', 'meta_ads')),
  status TEXT NOT NULL CHECK (status IN ('started', 'succeeded', 'failed', 'transformed')),
  records_extracted INTEGER DEFAULT 0,
  records_transformed INTEGER DEFAULT 0,
  error_message TEXT,
  airbyte_job_id TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_airbyte_sync_log_agency ON public.airbyte_sync_log(agency_id);
CREATE INDEX IF NOT EXISTS idx_airbyte_sync_log_connection ON public.airbyte_sync_log(connection_id);

-- RLS on sync log (agency-scoped, read-only for members)
ALTER TABLE public.airbyte_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view their sync logs"
  ON public.airbyte_sync_log FOR SELECT
  USING (agency_id IN (
    SELECT agency_id FROM public."user" WHERE id = auth.uid()
  ));

-- Bug 4 fix: Add TO service_role so only service role gets USING(true)
-- Without this, all authenticated users could read ALL sync logs
CREATE POLICY "Service role can manage sync logs"
  ON public.airbyte_sync_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Add unique constraint on ad_performance for upserts
-- Uses COALESCE to handle NULL campaign_id
-- Bug 5 fix: Added schemaname and tablename to pg_indexes guard
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'ad_performance'
      AND indexname = 'idx_ad_performance_upsert'
  ) THEN
    CREATE UNIQUE INDEX idx_ad_performance_upsert
      ON public.ad_performance(agency_id, client_id, platform, COALESCE(campaign_id, 'account_level'), date);
  END IF;
END $$;

-- 5. Transform function: staging -> ad_performance
-- Called by webhook after Airbyte sync completes
CREATE OR REPLACE FUNCTION public.transform_airbyte_ads_data(
  p_connection_id TEXT,
  p_agency_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, airbyte_staging
AS $$
DECLARE
  v_mapping RECORD;
  v_table_name TEXT;
  v_records_transformed INTEGER := 0;
  v_result JSONB;
BEGIN
  -- Look up the mapping for this connection
  SELECT * INTO v_mapping
  FROM public.airbyte_account_mapping
  WHERE airbyte_connection_id = p_connection_id
    AND is_active = true
  LIMIT 1;

  IF v_mapping IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No active mapping found for connection: ' || p_connection_id,
      'records_transformed', 0
    );
  END IF;

  -- Determine the staging table name based on platform
  v_table_name := v_mapping.table_prefix;

  -- Transform based on platform
  IF v_mapping.platform = 'google_ads' THEN
    -- Google Ads: cost_micros -> spend (divide by 1M)
    BEGIN
      EXECUTE format(
        'INSERT INTO public.ad_performance (
          agency_id, client_id, account_id, platform, campaign_id, date,
          impressions, clicks, spend, conversions, revenue
        )
        SELECT
          $1,
          $2,
          $3,
          ''google_ads''::ad_platform,
          COALESCE(campaign_id::text, ''account_level''),
          COALESCE(date::date, CURRENT_DATE),
          COALESCE((metrics_impressions)::integer, 0),
          COALESCE((metrics_clicks)::integer, 0),
          COALESCE((metrics_cost_micros)::numeric / 1000000.0, 0),
          COALESCE((metrics_conversions)::numeric, 0),
          NULL
        FROM airbyte_staging.%I
        WHERE _airbyte_emitted_at > (now() - interval ''2 days'')
        ON CONFLICT (agency_id, client_id, platform, COALESCE(campaign_id, ''account_level''), date)
        DO UPDATE SET
          impressions = EXCLUDED.impressions,
          clicks = EXCLUDED.clicks,
          spend = EXCLUDED.spend,
          conversions = EXCLUDED.conversions,
          created_at = now()',
        v_table_name
      ) USING v_mapping.agency_id, v_mapping.client_id, v_mapping.external_account_id;

      GET DIAGNOSTICS v_records_transformed = ROW_COUNT;
    EXCEPTION
      WHEN undefined_table THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Staging table not found: airbyte_staging.' || v_table_name,
          'records_transformed', 0
        );
      WHEN undefined_column THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Column mismatch in staging table: airbyte_staging.' || v_table_name || '. Check Airbyte stream schema.',
          'records_transformed', 0
        );
    END;

  ELSIF v_mapping.platform = 'meta_ads' THEN
    -- Meta Ads: spend is already in currency units
    BEGIN
      EXECUTE format(
        'INSERT INTO public.ad_performance (
          agency_id, client_id, account_id, platform, campaign_id, date,
          impressions, clicks, spend, conversions, revenue
        )
        SELECT
          $1,
          $2,
          $3,
          ''meta_ads''::ad_platform,
          COALESCE(campaign_id::text, ''account_level''),
          COALESCE(date_start::date, CURRENT_DATE),
          COALESCE((impressions)::integer, 0),
          COALESCE((clicks)::integer, 0),
          COALESCE((spend)::numeric, 0),
          COALESCE(
            (SELECT SUM((action_value->>''value'')::numeric)
             FROM jsonb_array_elements(actions::jsonb) AS action_value
             WHERE action_value->>''action_type'' IN (''offsite_conversion'', ''lead'', ''purchase'')),
            0
          ),
          NULL
        FROM airbyte_staging.%I
        WHERE _airbyte_emitted_at > (now() - interval ''2 days'')
        ON CONFLICT (agency_id, client_id, platform, COALESCE(campaign_id, ''account_level''), date)
        DO UPDATE SET
          impressions = EXCLUDED.impressions,
          clicks = EXCLUDED.clicks,
          spend = EXCLUDED.spend,
          conversions = EXCLUDED.conversions,
          created_at = now()',
        v_table_name
      ) USING v_mapping.agency_id, v_mapping.client_id, v_mapping.external_account_id;

      GET DIAGNOSTICS v_records_transformed = ROW_COUNT;
    EXCEPTION
      WHEN undefined_table THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Staging table not found: airbyte_staging.' || v_table_name,
          'records_transformed', 0
        );
      WHEN undefined_column THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Column mismatch in staging table: airbyte_staging.' || v_table_name || '. Check Airbyte stream schema.',
          'records_transformed', 0
        );
    END;
  END IF;

  -- Return result
  v_result := jsonb_build_object(
    'success', true,
    'platform', v_mapping.platform,
    'agency_id', v_mapping.agency_id,
    'records_transformed', v_records_transformed
  );

  RETURN v_result;
END;
$$;
