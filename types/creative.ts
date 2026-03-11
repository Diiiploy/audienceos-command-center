/**
 * Creative Pipeline Types
 * Tracks ad creative concepts from ideation through production to launch
 */

export type CreativeStatus = 'concept' | 'in_production' | 'review' | 'approved' | 'live'
export type CreativeFormat = 'image' | 'video' | 'carousel' | 'collection'

export interface Creative {
  id: string
  agency_id: string
  client_id: string
  campaign_id: string | null
  title: string
  description: string | null
  format: CreativeFormat
  status: CreativeStatus
  hook: string | null
  body_copy: string | null
  cta_text: string | null
  target_audience: string | null
  platform: string | null
  placement: string | null
  asset_url: string | null
  thumbnail_url: string | null
  ai_generated: boolean
  ai_generation_data: Record<string, unknown> | null
  source_onboarding_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  client?: { id: string; name: string }
}

export const CREATIVE_STATUSES: { value: CreativeStatus; label: string; color: string }[] = [
  { value: 'concept', label: 'Concept', color: 'bg-slate-500/10 text-slate-600 border-slate-200' },
  { value: 'in_production', label: 'In Production', color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  { value: 'review', label: 'Review', color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  { value: 'approved', label: 'Approved', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
  { value: 'live', label: 'Live', color: 'bg-green-500/10 text-green-600 border-green-200' },
]

export const CREATIVE_FORMATS: { value: CreativeFormat; label: string }[] = [
  { value: 'image', label: 'Image' },
  { value: 'video', label: 'Video' },
  { value: 'carousel', label: 'Carousel' },
  { value: 'collection', label: 'Collection' },
]
