-- ============================================================================
-- Fix Airbyte Transform: Column Name Bugs + Account Mappings
-- ============================================================================
-- Fixes 3 bugs preventing data from flowing staging → ad_performance:
--   Bug 1: _airbyte_emitted_at → _airbyte_extracted_at (Destinations V2 rename)
--   Bug 2: date → segments_date (Google Ads column naming)
--   Bug 3: Empty airbyte_account_mapping table (manual Airbyte setup)
-- Also creates "Kaaba Luum" client for Google Ads account mapping.
-- ============================================================================

-- 1. Create "Kaaba Luum Hotel & Retreat Center" client
INSERT INTO public.client (agency_id, name, stage)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Kaaba Luum Hotel & Retreat Center',
  'Active'
)
ON CONFLICT DO NOTHING;

-- 2. Fix transform function (Bug 1 + Bug 2)
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
    -- FIX: segments_date (not date), _airbyte_extracted_at (not _airbyte_emitted_at)
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
          COALESCE(segments_date::date, CURRENT_DATE),
          COALESCE((metrics_impressions)::integer, 0),
          COALESCE((metrics_clicks)::integer, 0),
          COALESCE((metrics_cost_micros)::numeric / 1000000.0, 0),
          COALESCE((metrics_conversions)::numeric, 0),
          NULL
        FROM (
          SELECT DISTINCT ON (campaign_id, segments_date)
            campaign_id, segments_date, metrics_impressions, metrics_clicks,
            metrics_cost_micros, metrics_conversions, _airbyte_extracted_at
          FROM airbyte_staging.%I
          WHERE _airbyte_extracted_at > (now() - interval ''2 days'')
          ORDER BY campaign_id, segments_date, _airbyte_extracted_at DESC
        ) deduped
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
    -- FIX: _airbyte_extracted_at (not _airbyte_emitted_at)
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
        FROM (
          SELECT DISTINCT ON (campaign_id, date_start)
            campaign_id, date_start, impressions, clicks, spend, actions,
            _airbyte_extracted_at
          FROM airbyte_staging.%I
          WHERE _airbyte_extracted_at > (now() - interval ''2 days'')
          ORDER BY campaign_id, date_start, _airbyte_extracted_at DESC
        ) deduped
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

-- 3. Insert account mappings (Bug 3)
-- Google Ads: Kaaba Luum → maps to newly created client
INSERT INTO public.airbyte_account_mapping (
  agency_id, client_id, platform, external_account_id,
  airbyte_connection_id, table_prefix, is_active
)
SELECT
  '11111111-1111-1111-1111-111111111111',
  c.id,
  'google_ads',
  '7085645296',
  'b13b1c76-494f-4c9c-aef2-10402a04acd6',
  'campaign',
  true
FROM public.client c
WHERE c.agency_id = '11111111-1111-1111-1111-111111111111'
  AND c.name = 'Kaaba Luum Hotel & Retreat Center'
LIMIT 1
ON CONFLICT (agency_id, platform, external_account_id) DO NOTHING;

-- Meta Ads: Diiiploy AI - AC → maps to Diiiploy client
INSERT INTO public.airbyte_account_mapping (
  agency_id, client_id, platform, external_account_id,
  airbyte_connection_id, table_prefix, is_active
) VALUES (
  '11111111-1111-1111-1111-111111111111',
  'f000aa65-f29d-4d8d-9196-71343cfcdf8b',
  'meta_ads',
  '763923942896969',
  'b45323b7-023c-4b29-a7a3-81d492104d02',
  'airbyte_staging_3q8hjx_insights5a48c0aab1686faab13909dad22ede5b',
  true
)
ON CONFLICT (agency_id, platform, external_account_id) DO NOTHING;
