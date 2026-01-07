import { describe, it, expect, beforeEach } from 'vitest'
import { useAutomationsStore } from '@/stores/automations-store'
import type { WorkflowTrigger, WorkflowAction } from '@/types/workflow'

describe('automations-store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAutomationsStore.setState({
      workflows: [],
      isLoading: false,
      error: null,
      runs: [],
      runsLoading: false,
      showBuilder: false,
      editingWorkflow: null,
      builderName: '',
      builderDescription: '',
      builderTriggers: [],
      builderActions: [],
      isSaving: false,
    })
  })

  describe('initial state', () => {
    it('should have empty workflows array', () => {
      const { workflows } = useAutomationsStore.getState()
      expect(workflows).toEqual([])
    })

    it('should not be loading initially', () => {
      const { isLoading } = useAutomationsStore.getState()
      expect(isLoading).toBe(false)
    })

    it('should have builder closed', () => {
      const { showBuilder } = useAutomationsStore.getState()
      expect(showBuilder).toBe(false)
    })
  })

  describe('builder state management', () => {
    it('should open builder for new workflow', () => {
      const { openBuilder } = useAutomationsStore.getState()
      openBuilder()

      const state = useAutomationsStore.getState()
      expect(state.showBuilder).toBe(true)
      expect(state.editingWorkflow).toBeNull()
      expect(state.builderName).toBe('')
    })

    it('should open builder for editing workflow', () => {
      const mockWorkflow = {
        id: 'wf-1',
        name: 'Test Workflow',
        description: 'Test description',
        triggers: [{ id: 't1', type: 'stage_change', name: 'Stage Changed', config: { toStage: 'Live' } }],
        actions: [{ id: 'a1', type: 'send_notification', name: 'Send Notification', config: { channel: 'slack', message: 'Test', recipients: ['user1'] } }],
        is_active: true,
        run_count: 5,
        success_count: 4,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      }

      const { openBuilder } = useAutomationsStore.getState()
      openBuilder(mockWorkflow as any)

      const state = useAutomationsStore.getState()
      expect(state.showBuilder).toBe(true)
      expect(state.editingWorkflow).toEqual(mockWorkflow)
      expect(state.builderName).toBe('Test Workflow')
      expect(state.builderDescription).toBe('Test description')
    })

    it('should close builder and reset state', () => {
      const { openBuilder, closeBuilder } = useAutomationsStore.getState()
      openBuilder()
      useAutomationsStore.setState({ builderName: 'Test' })

      closeBuilder()

      const state = useAutomationsStore.getState()
      expect(state.showBuilder).toBe(false)
      expect(state.builderName).toBe('')
    })
  })

  describe('trigger management', () => {
    it('should add trigger', () => {
      const trigger: WorkflowTrigger = {
        id: 'trigger-1',
        type: 'stage_change',
        name: 'Stage Changed',
        config: { fromStage: 'Onboarding', toStage: 'Live' },
      }

      const { addTrigger } = useAutomationsStore.getState()
      addTrigger(trigger)

      const { builderTriggers } = useAutomationsStore.getState()
      expect(builderTriggers).toHaveLength(1)
      expect(builderTriggers[0]).toEqual(trigger)
    })

    it('should remove trigger', () => {
      const trigger: WorkflowTrigger = {
        id: 'trigger-1',
        type: 'stage_change',
        name: 'Stage Changed',
        config: { toStage: 'Live' },
      }

      useAutomationsStore.setState({ builderTriggers: [trigger] })

      const { removeTrigger } = useAutomationsStore.getState()
      removeTrigger('trigger-1')

      const { builderTriggers } = useAutomationsStore.getState()
      expect(builderTriggers).toHaveLength(0)
    })

    it('should update trigger config', () => {
      const trigger: WorkflowTrigger = {
        id: 'trigger-1',
        type: 'stage_change',
        name: 'Stage Changed',
        config: { toStage: 'Onboarding' },
      }

      useAutomationsStore.setState({ builderTriggers: [trigger] })

      const { updateTrigger } = useAutomationsStore.getState()
      updateTrigger('trigger-1', { fromStage: 'Onboarding', toStage: 'Live' })

      const { builderTriggers } = useAutomationsStore.getState()
      expect(builderTriggers[0].config).toEqual({ fromStage: 'Onboarding', toStage: 'Live' })
    })
  })

  describe('action management', () => {
    it('should add action', () => {
      const action: WorkflowAction = {
        id: 'action-1',
        type: 'draft_communication',
        name: 'Draft Email',
        config: { platform: 'gmail', template: 'welcome' },
        delayMinutes: 0,
        continueOnFailure: false,
      }

      const { addAction } = useAutomationsStore.getState()
      addAction(action)

      const { builderActions } = useAutomationsStore.getState()
      expect(builderActions).toHaveLength(1)
      expect(builderActions[0]).toEqual(action)
    })

    it('should remove action', () => {
      const action: WorkflowAction = {
        id: 'action-1',
        type: 'send_notification',
        name: 'Send Notification',
        config: { channel: 'slack', message: 'Test', recipients: ['user1'] },
        delayMinutes: 0,
        continueOnFailure: false,
      }

      useAutomationsStore.setState({ builderActions: [action] })

      const { removeAction } = useAutomationsStore.getState()
      removeAction('action-1')

      const { builderActions } = useAutomationsStore.getState()
      expect(builderActions).toHaveLength(0)
    })

    it('should reorder actions', () => {
      const actions: WorkflowAction[] = [
        { id: 'a1', type: 'send_notification', name: 'Notification 1', config: { channel: 'email', message: 'Test 1', recipients: ['user1'] }, delayMinutes: 0, continueOnFailure: false },
        { id: 'a2', type: 'send_notification', name: 'Slack Notification', config: { channel: 'slack', message: 'Test 2', recipients: ['user2'] }, delayMinutes: 0, continueOnFailure: false },
        { id: 'a3', type: 'send_notification', name: 'Notification 2', config: { channel: 'email', message: 'Test 3', recipients: ['user3'] }, delayMinutes: 0, continueOnFailure: false },
      ]

      useAutomationsStore.setState({ builderActions: actions })

      const { reorderActions } = useAutomationsStore.getState()
      const reordered = [actions[2], actions[0], actions[1]]
      reorderActions(reordered)

      const { builderActions } = useAutomationsStore.getState()
      expect(builderActions[0].id).toBe('a3')
      expect(builderActions[1].id).toBe('a1')
      expect(builderActions[2].id).toBe('a2')
    })
  })

  describe('computed getters', () => {
    it('should count active workflows', () => {
      useAutomationsStore.setState({
        workflows: [
          { id: '1', is_active: true, run_count: 0, success_count: 0 } as any,
          { id: '2', is_active: false, run_count: 0, success_count: 0 } as any,
          { id: '3', is_active: true, run_count: 0, success_count: 0 } as any,
        ],
      })

      const { getActiveCount } = useAutomationsStore.getState()
      expect(getActiveCount()).toBe(2)
    })

    it('should calculate total runs', () => {
      useAutomationsStore.setState({
        workflows: [
          { id: '1', run_count: 10, success_count: 8 } as any,
          { id: '2', run_count: 5, success_count: 5 } as any,
        ],
      })

      const { getTotalRuns } = useAutomationsStore.getState()
      expect(getTotalRuns()).toBe(15)
    })

    it('should calculate success rate', () => {
      useAutomationsStore.setState({
        workflows: [
          { id: '1', run_count: 10, success_count: 8 } as any,
          { id: '2', run_count: 10, success_count: 10 } as any,
        ],
      })

      const { getSuccessRate } = useAutomationsStore.getState()
      expect(getSuccessRate()).toBe(90) // 18/20 = 90%
    })

    it('should return 0 success rate when no runs', () => {
      useAutomationsStore.setState({ workflows: [] })

      const { getSuccessRate } = useAutomationsStore.getState()
      expect(getSuccessRate()).toBe(0)
    })
  })
})
