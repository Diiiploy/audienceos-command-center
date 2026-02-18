/**
 * Campaign Types
 *
 * Type definitions for the Ad Campaigns pipeline feature.
 * Tracks Meta and Google ad campaigns per client.
 */

export type CampaignPlatform = 'meta' | 'google' | 'both'

export type CampaignType =
  | 'conversion'
  | 'traffic'
  | 'brand_awareness'
  | 'lead_gen'
  | 'retargeting'
  | 'catalog_sales'

export type CampaignStatus =
  | 'concept'
  | 'setup'
  | 'in_review'
  | 'live'
  | 'optimization'
  | 'completed'
  | 'paused'

export interface CampaignVisual {
  id: string
  campaign_id: string
  file_url: string
  file_name: string
  file_type: 'image' | 'video'
  placement: 'feed' | 'story' | 'reel' | 'search' | 'display' | 'youtube'
  dimensions?: string
  sort_order: number
  created_at: string
}

export interface CopyVariation {
  id: string
  campaign_id: string
  headline: string
  primary_text: string
  description?: string
  cta_text: string
  is_ai_generated: boolean
  created_at: string
}

export interface Campaign {
  id: string
  client_id: string
  client_name: string
  name: string
  platform: CampaignPlatform
  campaign_type: CampaignType
  status: CampaignStatus
  primary_hook: string | null
  primary_angle: string | null
  target_audience: string | null
  budget: number | null
  budget_type: 'daily' | 'lifetime' | null
  start_date: string | null
  end_date: string | null
  notes: string | null
  assignee: string | null
  visuals: CampaignVisual[]
  copy_variations: CopyVariation[]
  created_at: string
  updated_at: string
}

export const CAMPAIGN_STATUSES: { value: CampaignStatus; label: string }[] = [
  { value: 'concept', label: 'Concepts' },
  { value: 'setup', label: 'Setup' },
  { value: 'in_review', label: 'In Review' },
  { value: 'live', label: 'Live' },
  { value: 'optimization', label: 'Optimization' },
  { value: 'completed', label: 'Completed' },
]

export const CAMPAIGN_TYPES: { value: CampaignType; label: string }[] = [
  { value: 'conversion', label: 'Conversion' },
  { value: 'traffic', label: 'Traffic' },
  { value: 'brand_awareness', label: 'Brand Awareness' },
  { value: 'lead_gen', label: 'Lead Gen' },
  { value: 'retargeting', label: 'Retargeting' },
  { value: 'catalog_sales', label: 'Catalog Sales' },
]

export const CAMPAIGN_PLATFORMS: { value: CampaignPlatform; label: string }[] = [
  { value: 'meta', label: 'Meta' },
  { value: 'google', label: 'Google' },
  { value: 'both', label: 'Both' },
]
