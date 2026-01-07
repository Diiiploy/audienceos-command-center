import { describe, it, expect } from 'vitest'
import {
  TRIGGER_TYPES,
  getTriggerTypes,
  getTriggerTypesByCategory,
  getTriggerMetadata,
  validateTriggerConfig,
  parseCronExpression,
  COMMON_SCHEDULES,
  AVAILABLE_TIMEZONES,
} from '@/lib/workflows/trigger-registry'
import type { WorkflowTrigger } from '@/types/workflow'

describe('trigger-registry', () => {
  describe('TRIGGER_TYPES', () => {
    it('should define all expected trigger types', () => {
      expect(TRIGGER_TYPES.stage_change).toBeDefined()
      expect(TRIGGER_TYPES.inactivity).toBeDefined()
      expect(TRIGGER_TYPES.kpi_threshold).toBeDefined()
      expect(TRIGGER_TYPES.new_message).toBeDefined()
      expect(TRIGGER_TYPES.ticket_created).toBeDefined()
      expect(TRIGGER_TYPES.scheduled).toBeDefined()
    })

    it('should have correct metadata structure', () => {
      const stageChange = TRIGGER_TYPES.stage_change
      expect(stageChange.type).toBe('stage_change')
      expect(stageChange.name).toBeDefined()
      expect(stageChange.description).toBeDefined()
      expect(stageChange.icon).toBeDefined()
      expect(stageChange.category).toBeDefined()
      expect(stageChange.configSchema).toBeDefined()
    })
  })

  describe('getTriggerTypes', () => {
    it('should return all trigger types', () => {
      const types = getTriggerTypes()
      expect(types).toHaveLength(6)
    })

    it('should return array of TriggerTypeMetadata', () => {
      const types = getTriggerTypes()
      types.forEach((type) => {
        expect(type.type).toBeDefined()
        expect(type.name).toBeDefined()
      })
    })
  })

  describe('getTriggerTypesByCategory', () => {
    it('should filter event triggers', () => {
      const eventTriggers = getTriggerTypesByCategory('event')
      expect(eventTriggers.length).toBeGreaterThan(0)
      expect(eventTriggers.every((t) => t.category === 'event')).toBe(true)
    })

    it('should filter condition triggers', () => {
      const conditionTriggers = getTriggerTypesByCategory('condition')
      expect(conditionTriggers.length).toBeGreaterThan(0)
      expect(conditionTriggers.every((t) => t.category === 'condition')).toBe(true)
    })

    it('should filter schedule triggers', () => {
      const scheduleTriggers = getTriggerTypesByCategory('schedule')
      expect(scheduleTriggers).toHaveLength(1)
      expect(scheduleTriggers[0].type).toBe('scheduled')
    })
  })

  describe('getTriggerMetadata', () => {
    it('should return metadata for valid type', () => {
      const metadata = getTriggerMetadata('stage_change')
      expect(metadata).toBeDefined()
      expect(metadata?.name).toBe('Stage Change')
    })

    it('should return undefined for invalid type', () => {
      const metadata = getTriggerMetadata('invalid_type' as any)
      expect(metadata).toBeUndefined()
    })
  })

  describe('validateTriggerConfig', () => {
    it('should validate stage_change trigger', () => {
      const validTrigger: WorkflowTrigger = {
        id: 't1',
        type: 'stage_change',
        name: 'Stage Change',
        config: { toStage: 'Live' },
      }
      const result = validateTriggerConfig(validTrigger)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject stage_change without toStage', () => {
      // Intentionally invalid config to test validation
      const invalidTrigger = {
        id: 't1',
        type: 'stage_change',
        name: 'Stage Change',
        config: {},
      } as unknown as WorkflowTrigger
      const result = validateTriggerConfig(invalidTrigger)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Stage change trigger requires a target stage')
    })

    it('should validate inactivity trigger', () => {
      const validTrigger: WorkflowTrigger = {
        id: 't1',
        type: 'inactivity',
        name: 'Inactivity',
        config: { days: 7 },
      }
      const result = validateTriggerConfig(validTrigger)
      expect(result.valid).toBe(true)
    })

    it('should reject inactivity with days < 1', () => {
      const invalidTrigger: WorkflowTrigger = {
        id: 't1',
        type: 'inactivity',
        name: 'Inactivity',
        config: { days: 0 },
      }
      const result = validateTriggerConfig(invalidTrigger)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Inactivity trigger requires days >= 1')
    })

    it('should validate kpi_threshold trigger', () => {
      const validTrigger: WorkflowTrigger = {
        id: 't1',
        type: 'kpi_threshold',
        name: 'KPI Threshold',
        config: { metric: 'roas', operator: 'below', value: 2 },
      }
      const result = validateTriggerConfig(validTrigger)
      expect(result.valid).toBe(true)
    })

    it('should reject kpi_threshold without required fields', () => {
      // Intentionally invalid config to test validation
      const invalidTrigger = {
        id: 't1',
        type: 'kpi_threshold',
        name: 'KPI Threshold',
        config: { metric: 'roas' },
      } as unknown as WorkflowTrigger
      const result = validateTriggerConfig(invalidTrigger)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('KPI threshold trigger requires an operator')
      expect(result.errors).toContain('KPI threshold trigger requires a value')
    })

    it('should validate scheduled trigger', () => {
      const validTrigger: WorkflowTrigger = {
        id: 't1',
        type: 'scheduled',
        name: 'Scheduled',
        config: { schedule: '0 9 * * 1-5', timezone: 'America/New_York' },
      }
      const result = validateTriggerConfig(validTrigger)
      expect(result.valid).toBe(true)
    })

    it('should reject unknown trigger type', () => {
      // Intentionally invalid type to test validation
      const invalidTrigger = {
        id: 't1',
        type: 'unknown_type',
        name: 'Unknown',
        config: {},
      } as unknown as WorkflowTrigger
      const result = validateTriggerConfig(invalidTrigger)
      expect(result.valid).toBe(false)
      expect(result.errors[0]).toContain('Unknown trigger type')
    })
  })

  describe('parseCronExpression', () => {
    it('should parse hourly cron', () => {
      expect(parseCronExpression('0 * * * *')).toBe('Every hour')
    })

    it('should parse daily cron', () => {
      expect(parseCronExpression('0 9 * * *')).toBe('Daily at 9:00')
    })

    it('should parse weekday cron', () => {
      expect(parseCronExpression('0 9 * * 1-5')).toBe('Weekdays at 9:00')
    })

    it('should parse Monday cron', () => {
      expect(parseCronExpression('0 9 * * 1')).toBe('Every Monday at 9:00')
    })

    it('should parse first of month cron', () => {
      expect(parseCronExpression('0 9 1 * *')).toBe('First day of month at 9:00')
    })

    it('should return original for complex cron', () => {
      const complex = '30 14 15 * 3'
      expect(parseCronExpression(complex)).toBe(complex)
    })

    it('should return original for invalid cron', () => {
      expect(parseCronExpression('invalid')).toBe('invalid')
    })
  })

  describe('COMMON_SCHEDULES', () => {
    it('should have predefined common schedules', () => {
      expect(COMMON_SCHEDULES.length).toBeGreaterThan(0)
    })

    it('should have valid schedule structure', () => {
      COMMON_SCHEDULES.forEach((schedule) => {
        expect(schedule.label).toBeDefined()
        expect(schedule.cron).toBeDefined()
        expect(schedule.description).toBeDefined()
        // Validate cron has 5 parts
        expect(schedule.cron.split(' ')).toHaveLength(5)
      })
    })
  })

  describe('AVAILABLE_TIMEZONES', () => {
    it('should include major timezones', () => {
      expect(AVAILABLE_TIMEZONES).toContain('America/New_York')
      expect(AVAILABLE_TIMEZONES).toContain('Europe/London')
      expect(AVAILABLE_TIMEZONES).toContain('Asia/Tokyo')
      expect(AVAILABLE_TIMEZONES).toContain('UTC')
    })
  })
})
