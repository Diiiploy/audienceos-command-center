/**
 * Shared prompt variable definitions
 * Used by both the Prompt Library UI (F3) and the run_prompt executor (F4)
 */

export const PROMPT_VARIABLES = [
  { path: '{{client.name}}', description: 'Client company name' },
  { path: '{{client.industry}}', description: 'Client industry' },
  { path: '{{client.stage}}', description: 'Current pipeline stage' },
  { path: '{{client.health_status}}', description: 'Health score' },
  { path: '{{client.website}}', description: 'Client website URL' },
  { path: '{{trigger.type}}', description: 'What triggered this' },
  { path: '{{trigger.days}}', description: 'Days since trigger' },
  { path: '{{time.date}}', description: 'Current date' },
  { path: '{{time.dayOfWeek}}', description: 'Day of week' },
] as const
