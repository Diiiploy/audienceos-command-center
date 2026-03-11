/**
 * Seed Workflow Templates
 *
 * Pre-built workflow configurations that can be created via the API.
 * These match the 5 production-ready templates from the sprint plan.
 */

import type { WorkflowTrigger, WorkflowAction } from '@/types/workflow'

export interface WorkflowTemplate {
  name: string
  description: string
  triggers: WorkflowTrigger[]
  actions: WorkflowAction[]
}

export const SEED_TEMPLATES: Record<string, WorkflowTemplate> = {
  'welcome-sequence': {
    name: 'New Client Welcome Sequence',
    description:
      'Automated welcome flow when a client moves to Onboarding. Creates setup tasks, sends a Slack notification, and tags the client.',
    triggers: [
      {
        id: 'trigger-welcome-1',
        type: 'stage_change',
        name: 'Client Moved to Onboarding',
        config: { toStage: 'Onboarding' },
      },
    ],
    actions: [
      {
        id: 'action-welcome-1',
        type: 'create_task',
        name: 'Create Welcome Task',
        config: {
          title: 'Welcome onboarding for {{client.name}}',
          description:
            'Complete the onboarding checklist for {{client.name}}. Review their account setup and schedule a kickoff call.',
          priority: 'high',
          dueInDays: 2,
          assignToTriggeredUser: true,
        },
      },
      {
        id: 'action-welcome-2',
        type: 'create_alert',
        name: 'New Client Alert',
        config: {
          title: '{{client.name}} started onboarding',
          description: '{{client.name}} has been moved to Onboarding. Welcome tasks have been created.',
          type: 'risk_detected' as const,
          severity: 'low' as const,
        },
      },
      {
        id: 'action-welcome-3',
        type: 'send_notification',
        name: 'Slack Welcome Notification',
        config: {
          channel: 'slack' as const,
          message:
            '🎉 New client onboarding: *{{client.name}}* has been moved to Onboarding. Welcome tasks created.',
          recipients: [] as string[], // Will be populated with Slack channel ID
        },
      },
      {
        id: 'action-welcome-4',
        type: 'update_client',
        name: 'Tag Client as Welcomed',
        config: {
          updates: {
            tags: { add: ['welcomed', 'onboarding-active'] },
          },
        },
      },
    ],
  },

  'urgent-triage': {
    name: 'Urgent Triage Bot',
    description:
      'When a critical or high-priority ticket is created, immediately creates an alert and notifies the team via Slack.',
    triggers: [
      {
        id: 'trigger-triage-1',
        type: 'ticket_created',
        name: 'Critical/High Ticket Created',
        config: { priorities: ['critical', 'high'] },
      },
    ],
    actions: [
      {
        id: 'action-triage-1',
        type: 'create_alert',
        name: 'Urgent Ticket Alert',
        config: {
          title: 'Urgent ticket: {{trigger.title}}',
          description:
            'A {{trigger.priority}} priority ticket was created for {{client.name}}: {{trigger.title}}',
          type: 'risk_detected' as const,
          severity: 'high' as const,
        },
      },
      {
        id: 'action-triage-2',
        type: 'send_notification',
        name: 'Slack Urgent Alert',
        config: {
          channel: 'slack' as const,
          message:
            '🚨 *URGENT TICKET* for {{client.name}}\n*{{trigger.title}}*\nPriority: {{trigger.priority}} | Category: {{trigger.category}}',
          recipients: [] as string[],
        },
      },
    ],
  },

  'stuck-pipeline': {
    name: 'Stuck Pipeline Alert',
    description:
      'Detects clients with no activity for 5+ days and creates alerts with Slack notifications.',
    triggers: [
      {
        id: 'trigger-stuck-1',
        type: 'inactivity',
        name: 'No Activity for 5 Days',
        config: {
          days: 5,
          activityTypes: ['communication', 'task', 'ticket'] as ('communication' | 'task' | 'ticket')[],
        },
      },
    ],
    actions: [
      {
        id: 'action-stuck-1',
        type: 'create_alert',
        name: 'Inactivity Alert',
        config: {
          title: '{{client.name}} — no activity for {{trigger.inactiveDays}} days',
          description:
            '{{client.name}} (Stage: {{client.stage}}) has had no communication, tasks, or tickets for {{trigger.inactiveDays}} days.',
          type: 'inactivity' as const,
          severity: 'medium' as const,
        },
      },
      {
        id: 'action-stuck-2',
        type: 'send_notification',
        name: 'Slack Pipeline Alert',
        config: {
          channel: 'slack' as const,
          message:
            '⚠️ *Stuck Pipeline*: {{client.name}} has had no activity for {{trigger.inactiveDays}} days (Stage: {{client.stage}})',
          recipients: [] as string[],
        },
      },
      {
        id: 'action-stuck-3',
        type: 'create_task',
        name: 'Follow-up Task',
        config: {
          title: 'Follow up with {{client.name}} — inactive {{trigger.inactiveDays}} days',
          description: 'This client has been inactive. Reach out to check on progress.',
          priority: 'medium' as const,
          dueInDays: 1,
          assignToTriggeredUser: true,
        },
      },
    ],
  },

  'offboarding-checklist': {
    name: 'Off-boarding Checklist',
    description:
      'When a client moves to Off-boarding, creates cleanup tasks and updates their status.',
    triggers: [
      {
        id: 'trigger-offboard-1',
        type: 'stage_change',
        name: 'Client Moved to Off-boarding',
        config: { toStage: 'Off-boarding' },
      },
    ],
    actions: [
      {
        id: 'action-offboard-1',
        type: 'create_task',
        name: 'Archive Client Data',
        config: {
          title: 'Archive data for {{client.name}}',
          description:
            'Export and archive all client data, reports, and assets for {{client.name}}.',
          priority: 'medium' as const,
          dueInDays: 5,
          assignToTriggeredUser: true,
        },
      },
      {
        id: 'action-offboard-2',
        type: 'create_task',
        name: 'Send Farewell Communication',
        config: {
          title: 'Send farewell email to {{client.name}}',
          description: 'Send a professional farewell email and request feedback survey.',
          priority: 'medium' as const,
          dueInDays: 2,
          assignToTriggeredUser: true,
        },
      },
      {
        id: 'action-offboard-3',
        type: 'update_client',
        name: 'Tag as Off-boarding',
        config: {
          updates: {
            healthStatus: 'red' as const,
            tags: { add: ['offboarding'], remove: ['onboarding-active'] },
            notes: 'Client off-boarding initiated via automation.',
          },
        },
      },
      {
        id: 'action-offboard-4',
        type: 'send_notification',
        name: 'Slack Off-boarding Notice',
        config: {
          channel: 'slack' as const,
          message:
            '📋 *Off-boarding started*: {{client.name}} has been moved to Off-boarding. Cleanup tasks created.',
          recipients: [] as string[],
        },
      },
    ],
  },

  'ai-client-analysis': {
    name: 'AI Client Analysis',
    description:
      'Uses a custom prompt to generate an AI analysis of the client and creates a ticket with the findings.',
    triggers: [
      {
        id: 'trigger-analysis-1',
        type: 'stage_change',
        name: 'Client Moved to Audit',
        config: { toStage: 'Audit' },
      },
    ],
    actions: [
      {
        id: 'action-analysis-1',
        type: 'run_prompt',
        name: 'Run Client Analysis Prompt',
        config: {
          promptId: '', // User must select their own prompt template
          promptName: 'Client Analysis',
          outputDestination: 'create_ticket' as const,
          ticketConfig: {
            category: 'campaign' as const,
            priority: 'medium' as const,
          },
          additionalContext: 'Focus on identifying quick wins and immediate opportunities for this client.',
        },
        requiresApproval: true,
      },
      {
        id: 'action-analysis-2',
        type: 'send_notification',
        name: 'Notify Team of Analysis',
        config: {
          channel: 'slack' as const,
          message:
            '🔍 AI analysis complete for {{client.name}}. A ticket has been created with findings and recommendations.',
          recipients: [] as string[],
        },
      },
    ],
  },

  'weekly-report': {
    name: 'Weekly Report Generator',
    description:
      'Every Monday at 9 AM, generates AI-drafted weekly performance reports for all active clients.',
    triggers: [
      {
        id: 'trigger-report-1',
        type: 'scheduled',
        name: 'Every Monday 9 AM',
        config: {
          schedule: '0 9 * * 1',
          timezone: 'America/Chicago',
        },
      },
    ],
    actions: [
      {
        id: 'action-report-1',
        type: 'draft_communication',
        name: 'Generate Weekly Report',
        config: {
          platform: 'gmail' as const,
          template:
            'Weekly performance report for {{client.name}}. Summarize key metrics, wins, and action items for the past week.',
          tone: 'professional' as const,
          instructions:
            'Generate a concise weekly report. Include sections: Executive Summary, Key Metrics, Wins This Week, Action Items for Next Week. Keep it under 500 words.',
        },
      },
      {
        id: 'action-report-2',
        type: 'create_alert',
        name: 'Report Generated Alert',
        config: {
          title: 'Weekly report draft generated',
          description: 'The weekly report has been AI-drafted and is ready for review.',
          type: 'risk_detected' as const,
          severity: 'low' as const,
        },
      },
    ],
  },
}

/**
 * Get all available seed template keys
 */
export function getTemplateKeys(): string[] {
  return Object.keys(SEED_TEMPLATES)
}

/**
 * Get a seed template by key
 */
export function getTemplate(key: string): WorkflowTemplate | undefined {
  return SEED_TEMPLATES[key]
}
