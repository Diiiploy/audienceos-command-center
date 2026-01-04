/**
 * AudienceOS Database Types
 * Generated from DATA-MODEL.md (19 tables)
 *
 * Note: In production, use `supabase gen types typescript` to generate these
 * This is a manual version for initial development
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Enums matching SQL schema
export type UserRole = 'admin' | 'user'
export type HealthStatus = 'green' | 'yellow' | 'red'
export type AssignmentRole = 'owner' | 'collaborator'
export type IntegrationProvider = 'slack' | 'gmail' | 'google_ads' | 'meta_ads'
export type CommunicationPlatform = 'slack' | 'gmail'
export type AlertType = 'risk_detected' | 'kpi_drop' | 'inactivity' | 'disconnect'
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'
export type AlertStatus = 'active' | 'snoozed' | 'dismissed' | 'resolved'
export type DocumentCategory = 'installation' | 'tech' | 'support' | 'process' | 'client_specific'
export type IndexStatus = 'pending' | 'indexing' | 'indexed' | 'failed'
export type ChatRole = 'user' | 'assistant'
export type ChatRoute = 'rag' | 'web' | 'memory' | 'casual' | 'dashboard'
export type TicketCategory = 'technical' | 'billing' | 'campaign' | 'general' | 'escalation'
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical'
export type TicketStatus = 'new' | 'in_progress' | 'waiting_client' | 'resolved'
export type WorkflowStatus = 'running' | 'completed' | 'failed'
export type PreferenceCategory = 'notifications' | 'ai' | 'display'
export type AdPlatform = 'google_ads' | 'meta_ads'

export interface Database {
  public: {
    Tables: {
      agency: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          domain: string | null
          timezone: string
          business_hours: Json | null
          pipeline_stages: string[]
          health_thresholds: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          domain?: string | null
          timezone?: string
          business_hours?: Json | null
          pipeline_stages?: string[]
          health_thresholds?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          domain?: string | null
          timezone?: string
          business_hours?: Json | null
          pipeline_stages?: string[]
          health_thresholds?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user: {
        Row: {
          id: string
          agency_id: string
          email: string
          first_name: string
          last_name: string
          role: UserRole
          avatar_url: string | null
          is_active: boolean
          last_active_at: string | null
          preferences: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          agency_id: string
          email: string
          first_name: string
          last_name: string
          role?: UserRole
          avatar_url?: string | null
          is_active?: boolean
          last_active_at?: string | null
          preferences?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agency_id?: string
          email?: string
          first_name?: string
          last_name?: string
          role?: UserRole
          avatar_url?: string | null
          is_active?: boolean
          last_active_at?: string | null
          preferences?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      client: {
        Row: {
          id: string
          agency_id: string
          name: string
          contact_email: string | null
          contact_name: string | null
          stage: string
          health_status: HealthStatus
          days_in_stage: number
          install_date: string | null
          total_spend: number | null
          lifetime_value: number | null
          notes: string | null
          tags: string[] | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          name: string
          contact_email?: string | null
          contact_name?: string | null
          stage?: string
          health_status?: HealthStatus
          days_in_stage?: number
          install_date?: string | null
          total_spend?: number | null
          lifetime_value?: number | null
          notes?: string | null
          tags?: string[] | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agency_id?: string
          name?: string
          contact_email?: string | null
          contact_name?: string | null
          stage?: string
          health_status?: HealthStatus
          days_in_stage?: number
          install_date?: string | null
          total_spend?: number | null
          lifetime_value?: number | null
          notes?: string | null
          tags?: string[] | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_assignment: {
        Row: {
          id: string
          agency_id: string
          client_id: string
          user_id: string
          role: AssignmentRole
          created_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          client_id: string
          user_id: string
          role?: AssignmentRole
          created_at?: string
        }
        Update: {
          id?: string
          agency_id?: string
          client_id?: string
          user_id?: string
          role?: AssignmentRole
          created_at?: string
        }
        Relationships: []
      }
      stage_event: {
        Row: {
          id: string
          agency_id: string
          client_id: string
          from_stage: string | null
          to_stage: string
          moved_by: string
          moved_at: string
          notes: string | null
        }
        Insert: {
          id?: string
          agency_id: string
          client_id: string
          from_stage?: string | null
          to_stage: string
          moved_by: string
          moved_at?: string
          notes?: string | null
        }
        Update: {
          id?: string
          agency_id?: string
          client_id?: string
          from_stage?: string | null
          to_stage?: string
          moved_by?: string
          moved_at?: string
          notes?: string | null
        }
        Relationships: []
      }
      task: {
        Row: {
          id: string
          agency_id: string
          client_id: string
          name: string
          description: string | null
          stage: string | null
          assigned_to: string | null
          due_date: string | null
          is_completed: boolean
          completed_at: string | null
          completed_by: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          client_id: string
          name: string
          description?: string | null
          stage?: string | null
          assigned_to?: string | null
          due_date?: string | null
          is_completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agency_id?: string
          client_id?: string
          name?: string
          description?: string | null
          stage?: string | null
          assigned_to?: string | null
          due_date?: string | null
          is_completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      integration: {
        Row: {
          id: string
          agency_id: string
          provider: IntegrationProvider
          is_connected: boolean
          access_token: string | null
          refresh_token: string | null
          token_expires_at: string | null
          last_sync_at: string | null
          config: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          provider: IntegrationProvider
          is_connected?: boolean
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          last_sync_at?: string | null
          config?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agency_id?: string
          provider?: IntegrationProvider
          is_connected?: boolean
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          last_sync_at?: string | null
          config?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      communication: {
        Row: {
          id: string
          agency_id: string
          client_id: string
          platform: CommunicationPlatform
          thread_id: string | null
          message_id: string
          sender_email: string | null
          sender_name: string | null
          subject: string | null
          content: string
          is_inbound: boolean
          needs_reply: boolean
          replied_at: string | null
          replied_by: string | null
          received_at: string
          created_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          client_id: string
          platform: CommunicationPlatform
          thread_id?: string | null
          message_id: string
          sender_email?: string | null
          sender_name?: string | null
          subject?: string | null
          content: string
          is_inbound: boolean
          needs_reply?: boolean
          replied_at?: string | null
          replied_by?: string | null
          received_at: string
          created_at?: string
        }
        Update: {
          id?: string
          agency_id?: string
          client_id?: string
          platform?: CommunicationPlatform
          thread_id?: string | null
          message_id?: string
          sender_email?: string | null
          sender_name?: string | null
          subject?: string | null
          content?: string
          is_inbound?: boolean
          needs_reply?: boolean
          replied_at?: string | null
          replied_by?: string | null
          received_at?: string
          created_at?: string
        }
        Relationships: []
      }
      alert: {
        Row: {
          id: string
          agency_id: string
          client_id: string | null
          type: AlertType
          severity: AlertSeverity
          title: string
          description: string
          suggested_action: string | null
          confidence: number
          status: AlertStatus
          snoozed_until: string | null
          resolved_by: string | null
          resolved_at: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          client_id?: string | null
          type: AlertType
          severity: AlertSeverity
          title: string
          description: string
          suggested_action?: string | null
          confidence: number
          status?: AlertStatus
          snoozed_until?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agency_id?: string
          client_id?: string | null
          type?: AlertType
          severity?: AlertSeverity
          title?: string
          description?: string
          suggested_action?: string | null
          confidence?: number
          status?: AlertStatus
          snoozed_until?: string | null
          resolved_by?: string | null
          resolved_at?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      document: {
        Row: {
          id: string
          agency_id: string
          title: string
          file_name: string
          file_size: number
          mime_type: string
          storage_path: string
          category: DocumentCategory
          client_id: string | null
          page_count: number | null
          word_count: number | null
          index_status: IndexStatus
          gemini_file_id: string | null
          uploaded_by: string
          is_active: boolean
          is_starred: boolean
          use_for_training: boolean
          drive_url: string | null
          drive_file_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          title: string
          file_name: string
          file_size: number
          mime_type: string
          storage_path: string
          category: DocumentCategory
          client_id?: string | null
          page_count?: number | null
          word_count?: number | null
          index_status?: IndexStatus
          gemini_file_id?: string | null
          uploaded_by: string
          is_active?: boolean
          is_starred?: boolean
          use_for_training?: boolean
          drive_url?: string | null
          drive_file_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agency_id?: string
          title?: string
          file_name?: string
          file_size?: number
          mime_type?: string
          storage_path?: string
          category?: DocumentCategory
          client_id?: string | null
          page_count?: number | null
          word_count?: number | null
          index_status?: IndexStatus
          gemini_file_id?: string | null
          uploaded_by?: string
          is_active?: boolean
          is_starred?: boolean
          use_for_training?: boolean
          drive_url?: string | null
          drive_file_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_session: {
        Row: {
          id: string
          agency_id: string
          user_id: string
          title: string | null
          context: Json | null
          is_active: boolean
          last_message_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          user_id: string
          title?: string | null
          context?: Json | null
          is_active?: boolean
          last_message_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          agency_id?: string
          user_id?: string
          title?: string | null
          context?: Json | null
          is_active?: boolean
          last_message_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      chat_message: {
        Row: {
          id: string
          session_id: string
          agency_id: string
          role: ChatRole
          content: string
          route_used: ChatRoute | null
          citations: Json | null
          tokens_used: number | null
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          agency_id: string
          role: ChatRole
          content: string
          route_used?: ChatRoute | null
          citations?: Json | null
          tokens_used?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          agency_id?: string
          role?: ChatRole
          content?: string
          route_used?: ChatRoute | null
          citations?: Json | null
          tokens_used?: number | null
          created_at?: string
        }
        Relationships: []
      }
      ticket: {
        Row: {
          id: string
          agency_id: string
          client_id: string
          number: number
          title: string
          description: string
          category: TicketCategory
          priority: TicketPriority
          status: TicketStatus
          assignee_id: string | null
          resolution_notes: string | null
          time_spent_minutes: number | null
          due_date: string | null
          created_by: string
          resolved_by: string | null
          resolved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          client_id: string
          number?: number
          title: string
          description: string
          category: TicketCategory
          priority?: TicketPriority
          status?: TicketStatus
          assignee_id?: string | null
          resolution_notes?: string | null
          time_spent_minutes?: number | null
          due_date?: string | null
          created_by: string
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agency_id?: string
          client_id?: string
          number?: number
          title?: string
          description?: string
          category?: TicketCategory
          priority?: TicketPriority
          status?: TicketStatus
          assignee_id?: string | null
          resolution_notes?: string | null
          time_spent_minutes?: number | null
          due_date?: string | null
          created_by?: string
          resolved_by?: string | null
          resolved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ticket_note: {
        Row: {
          id: string
          agency_id: string
          ticket_id: string
          content: string
          is_internal: boolean
          added_by: string
          created_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          ticket_id: string
          content: string
          is_internal?: boolean
          added_by: string
          created_at?: string
        }
        Update: {
          id?: string
          agency_id?: string
          ticket_id?: string
          content?: string
          is_internal?: boolean
          added_by?: string
          created_at?: string
        }
        Relationships: []
      }
      workflow: {
        Row: {
          id: string
          agency_id: string
          name: string
          description: string | null
          triggers: Json
          actions: Json
          is_active: boolean
          created_by: string
          last_run_at: string | null
          run_count: number
          success_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          name: string
          description?: string | null
          triggers: Json
          actions: Json
          is_active?: boolean
          created_by: string
          last_run_at?: string | null
          run_count?: number
          success_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          agency_id?: string
          name?: string
          description?: string | null
          triggers?: Json
          actions?: Json
          is_active?: boolean
          created_by?: string
          last_run_at?: string | null
          run_count?: number
          success_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      workflow_run: {
        Row: {
          id: string
          agency_id: string
          workflow_id: string
          trigger_data: Json
          status: WorkflowStatus
          executed_actions: Json | null
          error_message: string | null
          started_at: string
          completed_at: string | null
          created_at: string
          results: Json | null
        }
        Insert: {
          id?: string
          agency_id: string
          workflow_id: string
          trigger_data: Json
          status?: WorkflowStatus
          executed_actions?: Json | null
          error_message?: string | null
          started_at?: string
          completed_at?: string | null
          created_at?: string
          results?: Json | null
        }
        Update: {
          id?: string
          agency_id?: string
          workflow_id?: string
          trigger_data?: Json
          status?: WorkflowStatus
          executed_actions?: Json | null
          error_message?: string | null
          started_at?: string
          completed_at?: string | null
          created_at?: string
          results?: Json | null
        }
        Relationships: []
      }
      user_preference: {
        Row: {
          id: string
          user_id: string
          agency_id: string
          category: PreferenceCategory
          key: string
          value: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          agency_id: string
          category: PreferenceCategory
          key: string
          value: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          agency_id?: string
          category?: PreferenceCategory
          key?: string
          value?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      kpi_snapshot: {
        Row: {
          id: string
          agency_id: string
          metric_name: string
          value: number
          previous_value: number | null
          metadata: Json | null
          snapshot_date: string
          created_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          metric_name: string
          value: number
          previous_value?: number | null
          metadata?: Json | null
          snapshot_date: string
          created_at?: string
        }
        Update: {
          id?: string
          agency_id?: string
          metric_name?: string
          value?: number
          previous_value?: number | null
          metadata?: Json | null
          snapshot_date?: string
          created_at?: string
        }
        Relationships: []
      }
      ad_performance: {
        Row: {
          id: string
          agency_id: string
          client_id: string
          platform: AdPlatform
          account_id: string
          campaign_id: string | null
          date: string
          spend: number
          impressions: number
          clicks: number
          conversions: number
          revenue: number | null
          created_at: string
        }
        Insert: {
          id?: string
          agency_id: string
          client_id: string
          platform: AdPlatform
          account_id: string
          campaign_id?: string | null
          date: string
          spend: number
          impressions?: number
          clicks?: number
          conversions?: number
          revenue?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          agency_id?: string
          client_id?: string
          platform?: AdPlatform
          account_id?: string
          campaign_id?: string | null
          date?: string
          spend?: number
          impressions?: number
          clicks?: number
          conversions?: number
          revenue?: number | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_workflow_stats: {
        Args: {
          workflow_id: string
          increment_run: number
          increment_success: number
        }
        Returns: void
      }
    }
    Enums: {
      user_role: UserRole
      health_status: HealthStatus
      assignment_role: AssignmentRole
      integration_provider: IntegrationProvider
      communication_platform: CommunicationPlatform
      alert_type: AlertType
      alert_severity: AlertSeverity
      alert_status: AlertStatus
      document_category: DocumentCategory
      index_status: IndexStatus
      chat_role: ChatRole
      chat_route: ChatRoute
      ticket_category: TicketCategory
      ticket_priority: TicketPriority
      ticket_status: TicketStatus
      workflow_status: WorkflowStatus
      preference_category: PreferenceCategory
      ad_platform: AdPlatform
    }
  }
}
