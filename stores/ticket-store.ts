import { create } from 'zustand'
import { createClient } from '@/lib/supabase'
import type { TicketStatus, TicketPriority, TicketCategory } from '@/types/database'

// Types matching DATA-MODEL.md
export type { TicketStatus, TicketPriority, TicketCategory }

export interface Ticket {
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
  // Joined data
  client?: {
    id: string
    name: string
    health_status: string
  }
  assignee?: {
    id: string
    first_name: string
    last_name: string
    avatar_url: string | null
  }
}

export interface TicketNote {
  id: string
  agency_id: string
  ticket_id: string
  content: string
  is_internal: boolean
  added_by: string
  created_at: string
  // Joined data
  author?: {
    id: string
    first_name: string
    last_name: string
    avatar_url: string | null
  }
}

export interface CreateTicketInput {
  client_id: string
  title: string
  description: string
  category: TicketCategory
  priority: TicketPriority
  assignee_id?: string | null
  due_date?: string | null
}

export interface ResolveTicketInput {
  resolution_notes: string
  time_spent_minutes?: number
  send_client_email?: boolean
}

// Status order for kanban columns
export const TICKET_STATUSES: TicketStatus[] = [
  'new',
  'in_progress',
  'waiting_client',
  'resolved'
]

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  new: 'New',
  in_progress: 'In Progress',
  waiting_client: 'Waiting on Client',
  resolved: 'Resolved'
}

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical'
}

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  technical: 'Technical',
  billing: 'Billing',
  campaign: 'Campaign',
  general: 'General',
  escalation: 'Escalation'
}

interface TicketFilters {
  status: TicketStatus | 'all'
  priority: TicketPriority | 'all'
  assignee: string | 'all'
  client: string | 'all'
  category: TicketCategory | 'all'
  search: string
}

interface TicketState {
  // Data
  tickets: Ticket[]
  selectedTicket: Ticket | null
  notes: TicketNote[]
  isLoading: boolean
  isLoadingNotes: boolean
  error: string | null

  // Filters
  filters: TicketFilters

  // View mode
  viewMode: 'kanban' | 'list'

  // Actions - Data fetching
  fetchTickets: () => Promise<void>
  fetchTicketById: (id: string) => Promise<Ticket | null>
  fetchNotes: (ticketId: string) => Promise<void>

  // Actions - CRUD
  createTicket: (input: CreateTicketInput) => Promise<Ticket | null>
  updateTicket: (id: string, updates: Partial<Ticket>) => Promise<boolean>
  deleteTicket: (id: string) => Promise<boolean>

  // Actions - Status workflow
  changeStatus: (ticketId: string, newStatus: TicketStatus) => Promise<boolean>
  resolveTicket: (ticketId: string, input: ResolveTicketInput) => Promise<boolean>
  reopenTicket: (ticketId: string) => Promise<boolean>

  // Actions - Notes
  addNote: (ticketId: string, content: string, isInternal: boolean) => Promise<TicketNote | null>

  // Optimistic updates
  optimisticStatusChange: (ticketId: string, newStatus: TicketStatus) => void
  rollbackStatusChange: (ticketId: string, previousStatus: TicketStatus) => void

  // Filters
  setFilter: <K extends keyof TicketFilters>(key: K, value: TicketFilters[K]) => void
  clearFilters: () => void

  // View
  setViewMode: (mode: 'kanban' | 'list') => void

  // Selection
  selectTicket: (ticket: Ticket | null) => void

  // Computed
  getTicketsByStatus: (status: TicketStatus) => Ticket[]
  getFilteredTickets: () => Ticket[]
  getNewTicketCount: () => number
}

export const useTicketStore = create<TicketState>((set, get) => ({
  // Initial state
  tickets: [],
  selectedTicket: null,
  notes: [],
  isLoading: false,
  isLoadingNotes: false,
  error: null,

  filters: {
    status: 'all',
    priority: 'all',
    assignee: 'all',
    client: 'all',
    category: 'all',
    search: ''
  },

  viewMode: 'kanban',

  // Data fetching
  fetchTickets: async () => {
    set({ isLoading: true, error: null })

    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('ticket')
        .select(`
          *,
          client:client_id (
            id,
            name,
            health_status
          ),
          assignee:assignee_id (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      set({ tickets: data as unknown as Ticket[], isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch tickets',
        isLoading: false
      })
    }
  },

  fetchTicketById: async (id) => {
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('ticket')
        .select(`
          *,
          client:client_id (
            id,
            name,
            health_status
          ),
          assignee:assignee_id (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error

      return data as unknown as Ticket
    } catch (error) {
      console.error('Failed to fetch ticket:', error)
      return null
    }
  },

  fetchNotes: async (ticketId) => {
    set({ isLoadingNotes: true })

    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('ticket_note')
        .select(`
          *,
          author:added_by (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true })

      if (error) throw error

      set({ notes: data as unknown as TicketNote[], isLoadingNotes: false })
    } catch (error) {
      console.error('Failed to fetch notes:', error)
      set({ isLoadingNotes: false })
    }
  },

  // CRUD operations
  createTicket: async (input) => {
    try {
      const supabase = createClient()

      // Get current user for created_by
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get agency_id from user profile
      const { data: profile } = await supabase
        .from('user')
        .select('agency_id')
        .eq('id', user.id)
        .single()

      if (!profile) throw new Error('User profile not found')

      const { data, error } = await supabase
        .from('ticket')
        .insert({
          ...input,
          agency_id: profile.agency_id,
          created_by: user.id
        })
        .select(`
          *,
          client:client_id (
            id,
            name,
            health_status
          ),
          assignee:assignee_id (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .single()

      if (error) throw error

      // Add to local state
      set((state) => ({
        tickets: [data as unknown as Ticket, ...state.tickets]
      }))

      return data as unknown as Ticket
    } catch (error) {
      console.error('Failed to create ticket:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to create ticket' })
      return null
    }
  },

  updateTicket: async (id, updates) => {
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('ticket')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      // Update local state
      set((state) => ({
        tickets: state.tickets.map((t) =>
          t.id === id ? { ...t, ...updates } : t
        ),
        selectedTicket: state.selectedTicket?.id === id
          ? { ...state.selectedTicket, ...updates }
          : state.selectedTicket
      }))

      return true
    } catch (error) {
      console.error('Failed to update ticket:', error)
      return false
    }
  },

  deleteTicket: async (id) => {
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('ticket')
        .delete()
        .eq('id', id)

      if (error) throw error

      // Remove from local state
      set((state) => ({
        tickets: state.tickets.filter((t) => t.id !== id),
        selectedTicket: state.selectedTicket?.id === id ? null : state.selectedTicket
      }))

      return true
    } catch (error) {
      console.error('Failed to delete ticket:', error)
      return false
    }
  },

  // Status workflow
  changeStatus: async (ticketId, newStatus) => {
    const ticket = get().tickets.find((t) => t.id === ticketId)
    if (!ticket) return false

    const previousStatus = ticket.status

    // Optimistic update
    get().optimisticStatusChange(ticketId, newStatus)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('ticket')
        .update({ status: newStatus })
        .eq('id', ticketId)

      if (error) throw error

      return true
    } catch (error) {
      console.error('Failed to change status:', error)
      // Rollback on error
      get().rollbackStatusChange(ticketId, previousStatus)
      return false
    }
  },

  resolveTicket: async (ticketId, input) => {
    try {
      const supabase = createClient()

      // Get current user for resolved_by
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase
        .from('ticket')
        .update({
          status: 'resolved' as TicketStatus,
          resolution_notes: input.resolution_notes,
          time_spent_minutes: input.time_spent_minutes,
          resolved_by: user.id,
          resolved_at: new Date().toISOString()
        })
        .eq('id', ticketId)

      if (error) throw error

      // Update local state
      set((state) => ({
        tickets: state.tickets.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                status: 'resolved' as TicketStatus,
                resolution_notes: input.resolution_notes,
                time_spent_minutes: input.time_spent_minutes ?? null,
                resolved_by: user.id,
                resolved_at: new Date().toISOString()
              }
            : t
        )
      }))

      return true
    } catch (error) {
      console.error('Failed to resolve ticket:', error)
      return false
    }
  },

  reopenTicket: async (ticketId) => {
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from('ticket')
        .update({
          status: 'in_progress' as TicketStatus,
          resolved_by: null,
          resolved_at: null
        })
        .eq('id', ticketId)

      if (error) throw error

      // Update local state
      set((state) => ({
        tickets: state.tickets.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                status: 'in_progress' as TicketStatus,
                resolved_by: null,
                resolved_at: null
              }
            : t
        )
      }))

      return true
    } catch (error) {
      console.error('Failed to reopen ticket:', error)
      return false
    }
  },

  // Notes
  addNote: async (ticketId, content, isInternal) => {
    try {
      const supabase = createClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get agency_id from user profile
      const { data: profile } = await supabase
        .from('user')
        .select('agency_id')
        .eq('id', user.id)
        .single()

      if (!profile) throw new Error('User profile not found')

      const { data, error } = await supabase
        .from('ticket_note')
        .insert({
          ticket_id: ticketId,
          agency_id: profile.agency_id,
          content,
          is_internal: isInternal,
          added_by: user.id
        })
        .select(`
          *,
          author:added_by (
            id,
            first_name,
            last_name,
            avatar_url
          )
        `)
        .single()

      if (error) throw error

      // Add to local state
      set((state) => ({
        notes: [...state.notes, data as unknown as TicketNote]
      }))

      return data as unknown as TicketNote
    } catch (error) {
      console.error('Failed to add note:', error)
      return null
    }
  },

  // Optimistic updates
  optimisticStatusChange: (ticketId, newStatus) => {
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId ? { ...t, status: newStatus } : t
      )
    }))
  },

  rollbackStatusChange: (ticketId, previousStatus) => {
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId ? { ...t, status: previousStatus } : t
      )
    }))
  },

  // Filters
  setFilter: (key, value) => {
    set((state) => ({
      filters: { ...state.filters, [key]: value }
    }))
  },

  clearFilters: () => {
    set({
      filters: {
        status: 'all',
        priority: 'all',
        assignee: 'all',
        client: 'all',
        category: 'all',
        search: ''
      }
    })
  },

  // View
  setViewMode: (mode) => set({ viewMode: mode }),

  // Selection
  selectTicket: (ticket) => set({ selectedTicket: ticket, notes: [] }),

  // Computed helpers
  getTicketsByStatus: (status) => {
    const { tickets } = get()
    return tickets.filter((t) => t.status === status)
  },

  getFilteredTickets: () => {
    const { tickets, filters } = get()

    return tickets.filter((ticket) => {
      // Status filter
      if (filters.status !== 'all' && ticket.status !== filters.status) {
        return false
      }

      // Priority filter
      if (filters.priority !== 'all' && ticket.priority !== filters.priority) {
        return false
      }

      // Assignee filter
      if (filters.assignee !== 'all' && ticket.assignee_id !== filters.assignee) {
        return false
      }

      // Client filter
      if (filters.client !== 'all' && ticket.client_id !== filters.client) {
        return false
      }

      // Category filter
      if (filters.category !== 'all' && ticket.category !== filters.category) {
        return false
      }

      // Search filter
      if (filters.search) {
        const search = filters.search.toLowerCase()
        const matchesTitle = ticket.title.toLowerCase().includes(search)
        const matchesDescription = ticket.description.toLowerCase().includes(search)
        const matchesClient = ticket.client?.name.toLowerCase().includes(search)
        if (!matchesTitle && !matchesDescription && !matchesClient) {
          return false
        }
      }

      return true
    })
  },

  getNewTicketCount: () => {
    const { tickets } = get()
    return tickets.filter((t) => t.status === 'new').length
  }
}))
