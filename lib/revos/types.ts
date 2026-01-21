/**
 * RevOS Types
 *
 * TypeScript types for RevOS tables added in migration 025_add_revos_tables.sql
 * These support LinkedIn campaigns, lead management, webhooks, and engagement pods.
 */

// ============================================================================
// ENUMS
// ============================================================================

export type LinkedInAccountStatus = 'active' | 'expired' | 'error' | 'disconnected';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';
export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed';
export type LeadSource = 'comment' | 'dm' | 'manual' | 'webhook';
export type LeadStatus =
  | 'comment_detected'
  | 'dm_sent'
  | 'email_captured'
  | 'webhook_sent'
  | 'completed'
  | 'unsubscribed';
export type WebhookDeliveryStatus = 'pending' | 'success' | 'failed';
export type PodStatus = 'active' | 'paused';
export type PodMemberRole = 'owner' | 'member';
export type EngagementType = 'like' | 'comment' | 'repost';
export type PodActivityStatus = 'pending' | 'completed' | 'failed' | 'skipped';

// ============================================================================
// LINKEDIN ACCOUNT
// ============================================================================

export interface LinkedInAccount {
  id: string;
  agency_id: string;
  user_id: string;
  account_name: string;
  unipile_account_id: string | null;
  unipile_session: Record<string, unknown> | null;
  session_expires_at: string | null;
  profile_data: LinkedInProfileData;
  profile_url: string | null;
  status: LinkedInAccountStatus;
  last_sync_at: string | null;
  error_message: string | null;
  rate_limit_reset_at: string | null;
  daily_dm_count: number;
  daily_post_count: number;
  daily_comment_count: number;
  created_at: string;
  updated_at: string;
}

export interface LinkedInProfileData {
  name?: string;
  headline?: string;
  avatar_url?: string;
  connections?: number;
  [key: string]: unknown;
}

export interface LinkedInAccountInsert
  extends Omit<
    LinkedInAccount,
    | 'id'
    | 'created_at'
    | 'updated_at'
    | 'profile_data'
    | 'daily_dm_count'
    | 'daily_post_count'
    | 'daily_comment_count'
    | 'status'
  > {
  id?: string;
  profile_data?: LinkedInProfileData;
  daily_dm_count?: number;
  daily_post_count?: number;
  daily_comment_count?: number;
  status?: LinkedInAccountStatus;
}

export interface LinkedInAccountUpdate extends Partial<LinkedInAccountInsert> {}

// ============================================================================
// LEAD MAGNET
// ============================================================================

export interface LeadMagnet {
  id: string;
  agency_id: string;
  client_id: string | null;
  name: string;
  description: string | null;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  thumbnail_url: string | null;
  download_count: number;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LeadMagnetInsert
  extends Omit<LeadMagnet, 'id' | 'created_at' | 'updated_at' | 'download_count' | 'is_active'> {
  id?: string;
  download_count?: number;
  is_active?: boolean;
}

export interface LeadMagnetUpdate extends Partial<LeadMagnetInsert> {}

// ============================================================================
// CAMPAIGN
// ============================================================================

export interface Campaign {
  id: string;
  agency_id: string;
  client_id: string | null;
  name: string;
  description: string | null;
  lead_magnet_id: string | null;
  trigger_word: string;
  post_template: string | null;
  dm_template_step1: string | null;
  dm_template_step2: string | null;
  dm_template_step3: string | null;
  settings: CampaignSettings;
  status: CampaignStatus;
  starts_at: string | null;
  ends_at: string | null;
  metrics: CampaignMetrics;
  created_at: string;
  updated_at: string;
}

export interface CampaignSettings {
  auto_dm?: boolean;
  dm_delay_minutes?: number;
  max_dms_per_day?: number;
  [key: string]: unknown;
}

export interface CampaignMetrics {
  posts: number;
  comments: number;
  leads: number;
  dms_sent: number;
  conversions: number;
}

export interface CampaignInsert {
  agency_id: string;
  name: string;
  trigger_word: string;
  // Optional fields (nullable in DB)
  id?: string;
  client_id?: string | null;
  description?: string | null;
  lead_magnet_id?: string | null;
  post_template?: string | null;
  dm_template_step1?: string | null;
  dm_template_step2?: string | null;
  dm_template_step3?: string | null;
  settings?: Partial<CampaignSettings>;
  status?: CampaignStatus;
  starts_at?: string | null;
  ends_at?: string | null;
  metrics?: Partial<CampaignMetrics>;
}

export interface CampaignUpdate extends Partial<CampaignInsert> {}

// ============================================================================
// POST
// ============================================================================

export interface Post {
  id: string;
  agency_id: string;
  campaign_id: string | null;
  linkedin_account_id: string | null;
  unipile_post_id: string | null;
  post_url: string | null;
  content: string;
  trigger_word: string | null;
  media_urls: string[];
  status: PostStatus;
  scheduled_for: string | null;
  published_at: string | null;
  metrics: PostMetrics;
  last_polled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostMetrics {
  likes: number;
  comments: number;
  reposts: number;
  impressions: number;
}

export interface PostInsert
  extends Omit<Post, 'id' | 'created_at' | 'updated_at' | 'metrics' | 'status' | 'media_urls'> {
  id?: string;
  metrics?: Partial<PostMetrics>;
  status?: PostStatus;
  media_urls?: string[];
}

export interface PostUpdate extends Partial<PostInsert> {}

// ============================================================================
// COMMENT
// ============================================================================

export interface Comment {
  id: string;
  agency_id: string;
  post_id: string;
  unipile_comment_id: string | null;
  author_name: string;
  author_linkedin_id: string;
  author_profile_url: string | null;
  author_headline: string | null;
  content: string;
  has_trigger_word: boolean;
  dm_sent: boolean;
  dm_sent_at: string | null;
  dm_step: number | null;
  created_at: string;
}

export interface CommentInsert
  extends Omit<Comment, 'id' | 'created_at' | 'has_trigger_word' | 'dm_sent'> {
  id?: string;
  has_trigger_word?: boolean;
  dm_sent?: boolean;
}

export interface CommentUpdate extends Partial<CommentInsert> {}

// ============================================================================
// LEAD
// ============================================================================

export interface Lead {
  id: string;
  agency_id: string;
  campaign_id: string | null;
  client_id: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  linkedin_id: string;
  linkedin_url: string | null;
  company: string | null;
  title: string | null;
  source: LeadSource;
  status: LeadStatus;
  comment_id: string | null;
  custom_fields: Record<string, unknown>;
  score: number;
  created_at: string;
  updated_at: string;
}

export interface LeadInsert
  extends Omit<Lead, 'id' | 'created_at' | 'updated_at' | 'source' | 'status' | 'custom_fields' | 'score'> {
  id?: string;
  source?: LeadSource;
  status?: LeadStatus;
  custom_fields?: Record<string, unknown>;
  score?: number;
}

export interface LeadUpdate extends Partial<LeadInsert> {}

// ============================================================================
// WEBHOOK CONFIG
// ============================================================================

export interface WebhookConfig {
  id: string;
  agency_id: string;
  client_id: string | null;
  name: string;
  url: string;
  headers: Record<string, string>;
  esp_type: string | null;
  retry_enabled: boolean;
  max_retries: number;
  timeout_ms: number;
  trigger_events: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookConfigInsert
  extends Omit<
    WebhookConfig,
    | 'id'
    | 'created_at'
    | 'updated_at'
    | 'retry_enabled'
    | 'max_retries'
    | 'timeout_ms'
    | 'is_active'
    | 'headers'
    | 'trigger_events'
  > {
  id?: string;
  retry_enabled?: boolean;
  max_retries?: number;
  timeout_ms?: number;
  is_active?: boolean;
  headers?: Record<string, string>;
  trigger_events?: string[];
}

export interface WebhookConfigUpdate extends Partial<WebhookConfigInsert> {}

// ============================================================================
// WEBHOOK DELIVERY
// ============================================================================

export interface WebhookDelivery {
  id: string;
  agency_id: string;
  webhook_config_id: string;
  lead_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  status: WebhookDeliveryStatus;
  status_code: number | null;
  response_body: Record<string, unknown> | null;
  error_message: string | null;
  attempt_count: number;
  next_retry_at: string | null;
  created_at: string;
  delivered_at: string | null;
}

export interface WebhookDeliveryInsert
  extends Omit<WebhookDelivery, 'id' | 'created_at' | 'status' | 'attempt_count'> {
  id?: string;
  status?: WebhookDeliveryStatus;
  attempt_count?: number;
}

export interface WebhookDeliveryUpdate extends Partial<WebhookDeliveryInsert> {}

// ============================================================================
// POD
// ============================================================================

export interface Pod {
  id: string;
  agency_id: string;
  client_id: string | null;
  name: string;
  description: string | null;
  min_members: number;
  auto_engage: boolean;
  settings: PodSettings;
  status: PodStatus;
  created_at: string;
  updated_at: string;
}

export interface PodSettings {
  engage_on_like: boolean;
  engage_on_comment: boolean;
  engage_on_repost: boolean;
  delay_minutes_min: number;
  delay_minutes_max: number;
  [key: string]: unknown;
}

export interface PodInsert
  extends Omit<Pod, 'id' | 'created_at' | 'updated_at' | 'min_members' | 'auto_engage' | 'settings' | 'status'> {
  id?: string;
  min_members?: number;
  auto_engage?: boolean;
  settings?: Partial<PodSettings>;
  status?: PodStatus;
}

export interface PodUpdate extends Partial<PodInsert> {}

// ============================================================================
// POD MEMBER
// ============================================================================

export interface PodMember {
  id: string;
  agency_id: string;
  pod_id: string;
  user_id: string;
  linkedin_account_id: string | null;
  role: PodMemberRole;
  participation_score: number;
  status: PodStatus;
  joined_at: string;
}

export interface PodMemberInsert
  extends Omit<PodMember, 'id' | 'joined_at' | 'role' | 'participation_score' | 'status'> {
  id?: string;
  role?: PodMemberRole;
  participation_score?: number;
  status?: PodStatus;
}

export interface PodMemberUpdate extends Partial<PodMemberInsert> {}

// ============================================================================
// POD ACTIVITY
// ============================================================================

export interface PodActivity {
  id: string;
  agency_id: string;
  pod_id: string;
  post_id: string | null;
  member_id: string;
  post_url: string;
  engagement_type: EngagementType;
  scheduled_for: string;
  executed_at: string | null;
  status: PodActivityStatus;
  error_message: string | null;
  created_at: string;
}

export interface PodActivityInsert
  extends Omit<PodActivity, 'id' | 'created_at' | 'status'> {
  id?: string;
  status?: PodActivityStatus;
}

export interface PodActivityUpdate extends Partial<PodActivityInsert> {}

// ============================================================================
// CARTRIDGE (Unified - from migration 026)
// ============================================================================

export type CartridgeTier = 'system' | 'workspace' | 'user' | 'skill';
export type CartridgeType = 'voice' | 'style' | 'preferences' | 'instruction' | 'brand' | 'combined';

export interface Cartridge {
  id: string;
  agency_id: string;
  client_id: string | null;
  user_id: string | null;
  tier: CartridgeTier;
  type: CartridgeType;
  name: string;
  description: string | null;
  parent_cartridge_id: string | null;
  voice_cartridge_id: string | null;
  style_cartridge_id: string | null;
  preferences_cartridge_id: string | null;
  instruction_cartridge_id: string | null;
  brand_cartridge_id: string | null;
  custom_data: Record<string, unknown>;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface CartridgeInsert
  extends Omit<Cartridge, 'id' | 'created_at' | 'updated_at' | 'is_active' | 'priority' | 'custom_data'> {
  id?: string;
  is_active?: boolean;
  priority?: number;
  custom_data?: Record<string, unknown>;
}

export interface CartridgeUpdate extends Partial<CartridgeInsert> {}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Database operation result with data and error
 */
export interface DbResult<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[];
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
