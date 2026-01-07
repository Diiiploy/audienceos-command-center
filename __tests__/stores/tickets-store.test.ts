import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTicketStore, TICKET_STATUSES, TICKET_STATUS_LABELS, TICKET_PRIORITY_LABELS } from '@/stores/ticket-store'
import type { TicketStatus, TicketPriority } from '@/types/database'

describe('ticket-store', () => {
  beforeEach(() => {
    // Reset store state
    useTicketStore.setState({
      tickets: [],
      isLoading: false,
      error: null,
      selectedTicket: null,
      notes: [],
      isLoadingNotes: false,
      filters: {
        status: 'all',
        priority: 'all',
        assignee: 'all',
        client: 'all',
        category: 'all',
        search: '',
      },
      viewMode: 'kanban',
    })
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have empty tickets array', () => {
      const { tickets } = useTicketStore.getState()
      expect(tickets).toEqual([])
    })

    it('should have default filters', () => {
      const { filters } = useTicketStore.getState()
      expect(filters.status).toBe('all')
      expect(filters.priority).toBe('all')
      expect(filters.search).toBe('')
    })

    it('should have kanban as default view mode', () => {
      const { viewMode } = useTicketStore.getState()
      expect(viewMode).toBe('kanban')
    })

    it('should have no selected ticket', () => {
      const { selectedTicket } = useTicketStore.getState()
      expect(selectedTicket).toBeNull()
    })
  })

  describe('ticket selection', () => {
    it('should select a ticket', () => {
      const mockTicket = {
        id: 't1',
        title: 'Test Ticket',
        status: 'new' as TicketStatus,
        priority: 'high' as TicketPriority,
      }

      const { selectTicket } = useTicketStore.getState()
      selectTicket(mockTicket as any)

      const { selectedTicket } = useTicketStore.getState()
      expect(selectedTicket?.id).toBe('t1')
    })

    it('should clear selected ticket', () => {
      useTicketStore.setState({
        selectedTicket: { id: 't1', title: 'Test' } as any,
      })

      const { selectTicket } = useTicketStore.getState()
      selectTicket(null)

      const { selectedTicket } = useTicketStore.getState()
      expect(selectedTicket).toBeNull()
    })
  })

  describe('filter management', () => {
    it('should update status filter', () => {
      const { setFilter } = useTicketStore.getState()
      setFilter('status', 'new')

      const { filters } = useTicketStore.getState()
      expect(filters.status).toBe('new')
    })

    it('should update priority filter', () => {
      const { setFilter } = useTicketStore.getState()
      setFilter('priority', 'high')

      const { filters } = useTicketStore.getState()
      expect(filters.priority).toBe('high')
    })

    it('should update search filter', () => {
      const { setFilter } = useTicketStore.getState()
      setFilter('search', 'login issue')

      const { filters } = useTicketStore.getState()
      expect(filters.search).toBe('login issue')
    })

    it('should clear all filters', () => {
      useTicketStore.setState({
        filters: {
          status: 'new',
          priority: 'high',
          assignee: 'user-1',
          client: 'client-1',
          category: 'technical',
          search: 'test',
        },
      })

      const { clearFilters } = useTicketStore.getState()
      clearFilters()

      const { filters } = useTicketStore.getState()
      expect(filters.status).toBe('all')
      expect(filters.priority).toBe('all')
      expect(filters.search).toBe('')
    })
  })

  describe('view mode', () => {
    it('should change view mode to list', () => {
      const { setViewMode } = useTicketStore.getState()
      setViewMode('list')

      const { viewMode } = useTicketStore.getState()
      expect(viewMode).toBe('list')
    })

    it('should change view mode to kanban', () => {
      useTicketStore.setState({ viewMode: 'list' })

      const { setViewMode } = useTicketStore.getState()
      setViewMode('kanban')

      const { viewMode } = useTicketStore.getState()
      expect(viewMode).toBe('kanban')
    })
  })

  describe('getTicketsByStatus', () => {
    const mockTickets = [
      { id: 't1', title: 'Ticket 1', status: 'new' },
      { id: 't2', title: 'Ticket 2', status: 'in_progress' },
      { id: 't3', title: 'Ticket 3', status: 'new' },
      { id: 't4', title: 'Ticket 4', status: 'resolved' },
    ]

    beforeEach(() => {
      useTicketStore.setState({ tickets: mockTickets as any })
    })

    it('should return tickets by status', () => {
      const { getTicketsByStatus } = useTicketStore.getState()
      const newTickets = getTicketsByStatus('new')

      expect(newTickets).toHaveLength(2)
      expect(newTickets.every((t) => t.status === 'new')).toBe(true)
    })

    it('should return empty array for status with no tickets', () => {
      const { getTicketsByStatus } = useTicketStore.getState()
      const waitingTickets = getTicketsByStatus('waiting_client')

      expect(waitingTickets).toHaveLength(0)
    })
  })

  describe('optimistic updates', () => {
    it('should optimistically change status', () => {
      const mockTickets = [
        { id: 't1', status: 'new' },
        { id: 't2', status: 'in_progress' },
      ]
      useTicketStore.setState({ tickets: mockTickets as any })

      const { optimisticStatusChange } = useTicketStore.getState()
      optimisticStatusChange('t1', 'in_progress')

      const { tickets } = useTicketStore.getState()
      const updatedTicket = tickets.find((t) => t.id === 't1')
      expect(updatedTicket?.status).toBe('in_progress')
    })

    it('should rollback status change', () => {
      const mockTickets = [{ id: 't1', status: 'in_progress' }]
      useTicketStore.setState({ tickets: mockTickets as any })

      const { rollbackStatusChange } = useTicketStore.getState()
      rollbackStatusChange('t1', 'new')

      const { tickets } = useTicketStore.getState()
      const ticket = tickets.find((t) => t.id === 't1')
      expect(ticket?.status).toBe('new')
    })
  })

  describe('constants', () => {
    it('should have all ticket statuses', () => {
      expect(TICKET_STATUSES).toContain('new')
      expect(TICKET_STATUSES).toContain('in_progress')
      expect(TICKET_STATUSES).toContain('waiting_client')
      expect(TICKET_STATUSES).toContain('resolved')
    })

    it('should have status labels', () => {
      expect(TICKET_STATUS_LABELS.new).toBe('New')
      expect(TICKET_STATUS_LABELS.in_progress).toBe('In Progress')
      expect(TICKET_STATUS_LABELS.resolved).toBe('Resolved')
    })

    it('should have priority labels', () => {
      expect(TICKET_PRIORITY_LABELS.low).toBe('Low')
      expect(TICKET_PRIORITY_LABELS.high).toBe('High')
      expect(TICKET_PRIORITY_LABELS.critical).toBe('Critical')
    })
  })
})
