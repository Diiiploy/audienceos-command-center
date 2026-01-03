/**
 * Action Registry Tests
 */
import { describe, it, expect } from 'vitest'
import {
  ACTION_TYPES,
  getActionTypes,
  getActionTypesByCategory,
  getActionMetadata,
  validateActionConfig,
  substituteVariables,
  formatDelay,
  DELAY_PRESETS,
  AVAILABLE_VARIABLES,
} from '@/lib/workflows/action-registry'
import type { WorkflowAction } from '@/types/workflow'

describe('action-registry', () => {
  describe('ACTION_TYPES', () => {
    it('should define all expected action types', () => {
      expect(ACTION_TYPES.create_task).toBeDefined()
      expect(ACTION_TYPES.send_notification).toBeDefined()
      expect(ACTION_TYPES.draft_communication).toBeDefined()
      expect(ACTION_TYPES.create_ticket).toBeDefined()
      expect(ACTION_TYPES.update_client).toBeDefined()
      expect(ACTION_TYPES.create_alert).toBeDefined()
    })

    it('should have correct metadata structure', () => {
      const taskAction = ACTION_TYPES.create_task
      expect(taskAction.type).toBe('create_task')
      expect(taskAction.name).toBe('Create Task')
      expect(taskAction.description).toBeTruthy()
      expect(taskAction.icon).toBeTruthy()
      expect(taskAction.category).toBe('task')
      expect(taskAction.configSchema).toBeDefined()
    })

    it('should have correct categories for each type', () => {
      expect(ACTION_TYPES.create_task.category).toBe('task')
      expect(ACTION_TYPES.create_ticket.category).toBe('task')
      expect(ACTION_TYPES.send_notification.category).toBe('communication')
      expect(ACTION_TYPES.draft_communication.category).toBe('communication')
      expect(ACTION_TYPES.update_client.category).toBe('data')
      expect(ACTION_TYPES.create_alert.category).toBe('alert')
    })

    it('should have supportsApproval flag set correctly', () => {
      expect(ACTION_TYPES.create_task.supportsApproval).toBe(false)
      expect(ACTION_TYPES.draft_communication.supportsApproval).toBe(true)
      expect(ACTION_TYPES.update_client.supportsApproval).toBe(true)
    })
  })

  describe('getActionTypes', () => {
    it('should return all action types', () => {
      const types = getActionTypes()
      expect(types.length).toBe(6)
    })

    it('should return array of ActionTypeMetadata', () => {
      const types = getActionTypes()
      types.forEach((type) => {
        expect(type.type).toBeTruthy()
        expect(type.name).toBeTruthy()
        expect(type.category).toBeTruthy()
      })
    })
  })

  describe('getActionTypesByCategory', () => {
    it('should filter task actions', () => {
      const tasks = getActionTypesByCategory('task')
      expect(tasks.length).toBe(2)
      expect(tasks.every((t) => t.category === 'task')).toBe(true)
    })

    it('should filter communication actions', () => {
      const comms = getActionTypesByCategory('communication')
      expect(comms.length).toBe(2)
      expect(comms.every((t) => t.category === 'communication')).toBe(true)
    })

    it('should filter data actions', () => {
      const data = getActionTypesByCategory('data')
      expect(data.length).toBe(1)
      expect(data[0].type).toBe('update_client')
    })

    it('should filter alert actions', () => {
      const alerts = getActionTypesByCategory('alert')
      expect(alerts.length).toBe(1)
      expect(alerts[0].type).toBe('create_alert')
    })
  })

  describe('getActionMetadata', () => {
    it('should return metadata for valid type', () => {
      const metadata = getActionMetadata('create_task')
      expect(metadata).toBeDefined()
      expect(metadata?.type).toBe('create_task')
    })

    it('should return undefined for invalid type', () => {
      const metadata = getActionMetadata('invalid' as never)
      expect(metadata).toBeUndefined()
    })
  })

  describe('validateActionConfig', () => {
    it('should validate create_task action', () => {
      const action: WorkflowAction = {
        id: 'test-1',
        type: 'create_task',
        name: 'Test Action',
        config: { title: 'Test Task' },
      }
      const result = validateActionConfig(action)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject create_task without title', () => {
      // Intentionally invalid config to test validation
      const action = {
        id: 'test-1',
        type: 'create_task',
        name: 'Test Action',
        config: {},
      } as unknown as WorkflowAction
      const result = validateActionConfig(action)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Create task action requires a title')
    })

    it('should validate send_notification action', () => {
      const action: WorkflowAction = {
        id: 'test-1',
        type: 'send_notification',
        name: 'Test Action',
        config: {
          channel: 'slack',
          message: 'Test message',
          recipients: ['user-1'],
        },
      }
      const result = validateActionConfig(action)
      expect(result.valid).toBe(true)
    })

    it('should reject send_notification without required fields', () => {
      // Intentionally invalid config to test validation
      const action = {
        id: 'test-1',
        type: 'send_notification',
        name: 'Test Action',
        config: {},
      } as unknown as WorkflowAction
      const result = validateActionConfig(action)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Send notification action requires a message')
      expect(result.errors).toContain('Send notification action requires at least one recipient')
    })

    it('should validate draft_communication action', () => {
      const action: WorkflowAction = {
        id: 'test-1',
        type: 'draft_communication',
        name: 'Test Action',
        config: {
          platform: 'slack',
          template: 'Check-in message',
        },
      }
      const result = validateActionConfig(action)
      expect(result.valid).toBe(true)
    })

    it('should reject draft_communication without platform', () => {
      // Intentionally invalid config to test validation
      const action = {
        id: 'test-1',
        type: 'draft_communication',
        name: 'Test Action',
        config: { template: 'Test' },
      } as unknown as WorkflowAction
      const result = validateActionConfig(action)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Draft communication action requires a platform')
    })

    it('should validate create_ticket action', () => {
      const action: WorkflowAction = {
        id: 'test-1',
        type: 'create_ticket',
        name: 'Test Action',
        config: {
          title: 'Test Ticket',
          category: 'technical',
          priority: 'high',
        },
      }
      const result = validateActionConfig(action)
      expect(result.valid).toBe(true)
    })

    it('should reject create_ticket without required fields', () => {
      // Intentionally invalid config to test validation
      const action = {
        id: 'test-1',
        type: 'create_ticket',
        name: 'Test Action',
        config: { title: 'Test' },
      } as unknown as WorkflowAction
      const result = validateActionConfig(action)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Create ticket action requires a category')
      expect(result.errors).toContain('Create ticket action requires a priority')
    })

    it('should validate update_client action', () => {
      const action: WorkflowAction = {
        id: 'test-1',
        type: 'update_client',
        name: 'Test Action',
        config: {
          updates: { stage: 'onboarding' },
        },
      }
      const result = validateActionConfig(action)
      expect(result.valid).toBe(true)
    })

    it('should reject update_client without updates', () => {
      const action: WorkflowAction = {
        id: 'test-1',
        type: 'update_client',
        name: 'Test Action',
        config: { updates: {} },
      }
      const result = validateActionConfig(action)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Update client action requires at least one update')
    })

    it('should validate create_alert action', () => {
      const action: WorkflowAction = {
        id: 'test-1',
        type: 'create_alert',
        name: 'Test Action',
        config: {
          title: 'Test Alert',
          type: 'risk_detected',
          severity: 'high',
        },
      }
      const result = validateActionConfig(action)
      expect(result.valid).toBe(true)
    })

    it('should reject create_alert without required fields', () => {
      // Intentionally invalid config to test validation
      const action = {
        id: 'test-1',
        type: 'create_alert',
        name: 'Test Action',
        config: {},
      } as unknown as WorkflowAction
      const result = validateActionConfig(action)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Create alert action requires a title')
      expect(result.errors).toContain('Create alert action requires a type')
      expect(result.errors).toContain('Create alert action requires a severity')
    })

    it('should reject unknown action type', () => {
      // Intentionally invalid type to test validation
      const action = {
        id: 'test-1',
        type: 'unknown',
        name: 'Test Action',
        config: {},
      } as unknown as WorkflowAction
      const result = validateActionConfig(action)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Unknown action type: unknown')
    })

    it('should validate delay within bounds', () => {
      const action: WorkflowAction = {
        id: 'test-1',
        type: 'create_task',
        name: 'Test Action',
        config: { title: 'Test' },
        delayMinutes: 60,
      }
      const result = validateActionConfig(action)
      expect(result.valid).toBe(true)
    })

    it('should reject delay exceeding maximum', () => {
      const action: WorkflowAction = {
        id: 'test-1',
        type: 'create_task',
        name: 'Test Action',
        config: { title: 'Test' },
        delayMinutes: 2000,
      }
      const result = validateActionConfig(action)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Delay must be between 0 and 1440 minutes (24 hours)')
    })

    it('should reject negative delay', () => {
      const action: WorkflowAction = {
        id: 'test-1',
        type: 'create_task',
        name: 'Test Action',
        config: { title: 'Test' },
        delayMinutes: -5,
      }
      const result = validateActionConfig(action)
      expect(result.valid).toBe(false)
    })
  })

  describe('substituteVariables', () => {
    it('should substitute client name', () => {
      const result = substituteVariables('Hello {{client.name}}!', {
        client: { name: 'Acme Corp' },
      })
      expect(result).toBe('Hello Acme Corp!')
    })

    it('should substitute multiple variables', () => {
      const result = substituteVariables(
        '{{client.name}} is at {{client.stage}} stage',
        {
          client: { name: 'Test Co', stage: 'onboarding' },
        }
      )
      expect(result).toBe('Test Co is at onboarding stage')
    })

    it('should handle missing variables gracefully', () => {
      const result = substituteVariables('Hello {{client.name}}!', {
        client: {},
      })
      expect(result).toBe('Hello !')
    })

    it('should substitute health status', () => {
      const result = substituteVariables('Status: {{client.health}}', {
        client: { healthStatus: 'green' },
      })
      expect(result).toBe('Status: green')
    })

    it('should substitute contact info', () => {
      const result = substituteVariables(
        'Contact: {{client.contactName}} at {{client.contactEmail}}',
        {
          client: {
            contactName: 'John Doe',
            contactEmail: 'john@example.com',
          },
        }
      )
      expect(result).toBe('Contact: John Doe at john@example.com')
    })

    it('should substitute daysInStage', () => {
      const result = substituteVariables(
        'In stage for {{client.daysInStage}} days',
        {
          client: { daysInStage: 14 },
        }
      )
      expect(result).toBe('In stage for 14 days')
    })

    it('should substitute trigger date and time', () => {
      const result = substituteVariables('Triggered on {{trigger.date}}', {})
      expect(result).toMatch(/Triggered on \d{4}-\d{2}-\d{2}/)
    })

    it('should substitute custom trigger variables', () => {
      const result = substituteVariables('Inactivity: {{trigger.days}} days', {
        trigger: { days: 7 },
      })
      expect(result).toBe('Inactivity: 7 days')
    })

    it('should handle no context', () => {
      const result = substituteVariables('Static text', {})
      expect(result).toBe('Static text')
    })
  })

  describe('formatDelay', () => {
    it('should format 0 minutes as Immediately', () => {
      expect(formatDelay(0)).toBe('Immediately')
    })

    it('should format minutes', () => {
      expect(formatDelay(5)).toBe('5 minutes')
      expect(formatDelay(30)).toBe('30 minutes')
    })

    it('should format 1 hour', () => {
      expect(formatDelay(60)).toBe('1 hour')
    })

    it('should format multiple hours', () => {
      expect(formatDelay(120)).toBe('2 hours')
      expect(formatDelay(240)).toBe('4 hours')
    })

    it('should format 24 hours', () => {
      expect(formatDelay(1440)).toBe('24 hours')
    })
  })

  describe('DELAY_PRESETS', () => {
    it('should have predefined delay presets', () => {
      expect(DELAY_PRESETS.length).toBeGreaterThan(0)
      expect(DELAY_PRESETS[0].minutes).toBe(0)
    })

    it('should have valid structure', () => {
      DELAY_PRESETS.forEach((preset) => {
        expect(preset.label).toBeTruthy()
        expect(typeof preset.minutes).toBe('number')
      })
    })
  })

  describe('AVAILABLE_VARIABLES', () => {
    it('should include client variables', () => {
      const paths = AVAILABLE_VARIABLES.map((v) => v.path)
      expect(paths).toContain('{{client.name}}')
      expect(paths).toContain('{{client.stage}}')
      expect(paths).toContain('{{client.health}}')
    })

    it('should include trigger variables', () => {
      const paths = AVAILABLE_VARIABLES.map((v) => v.path)
      expect(paths).toContain('{{trigger.date}}')
      expect(paths).toContain('{{trigger.time}}')
    })

    it('should have descriptions for all variables', () => {
      AVAILABLE_VARIABLES.forEach((v) => {
        expect(v.description).toBeTruthy()
      })
    })
  })
})
