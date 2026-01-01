import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useTicketStore, type Ticket } from '@/stores/ticket-store'
import type { RealtimeChannel } from '@supabase/supabase-js'

/**
 * Hook to subscribe to real-time ticket updates
 * Sets up Supabase Realtime subscription for ticket INSERT, UPDATE, DELETE events
 *
 * Usage:
 *   function TicketsPage() {
 *     useTicketSubscription()
 *     const { tickets } = useTicketStore()
 *     return <SupportTicketsView />
 *   }
 */
export function useTicketSubscription() {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const { tickets, fetchTickets } = useTicketStore()

  useEffect(() => {
    const supabase = createClient()

    // Only subscribe if we have tickets loaded
    if (tickets.length === 0) {
      return
    }

    // Clean up existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // Subscribe to ticket changes
    const channel = supabase
      .channel('ticket-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket',
        },
        (payload) => {
          console.log('[Realtime] Ticket inserted:', payload.new)
          // Refetch to get joined data (client, assignee)
          fetchTickets()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ticket',
        },
        (payload) => {
          console.log('[Realtime] Ticket updated:', payload.new)
          // Update in store
          const updatedTicket = payload.new as Partial<Ticket>
          useTicketStore.setState((state) => ({
            tickets: state.tickets.map((t) =>
              t.id === updatedTicket.id ? { ...t, ...updatedTicket } : t
            ),
            // Also update selectedTicket if it's the one being updated
            selectedTicket:
              state.selectedTicket?.id === updatedTicket.id
                ? ({ ...state.selectedTicket, ...updatedTicket } as Ticket)
                : state.selectedTicket,
          }))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'ticket',
        },
        (payload) => {
          console.log('[Realtime] Ticket deleted:', payload.old)
          const deletedId = (payload.old as { id: string }).id
          useTicketStore.setState((state) => ({
            tickets: state.tickets.filter((t) => t.id !== deletedId),
            selectedTicket:
              state.selectedTicket?.id === deletedId ? null : state.selectedTicket,
          }))
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status)
      })

    channelRef.current = channel

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [tickets.length > 0, fetchTickets])

  return null
}

/**
 * Hook to subscribe to real-time note updates for a specific ticket
 */
export function useTicketNotesSubscription(ticketId: string | null) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const { fetchNotes } = useTicketStore()

  useEffect(() => {
    if (!ticketId) return

    const supabase = createClient()

    // Clean up existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    // Subscribe to note changes for this ticket
    const channel = supabase
      .channel(`ticket-notes-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_note',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          console.log('[Realtime] Note added:', payload.new)
          // Refetch to get author data
          fetchNotes(ticketId)
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [ticketId, fetchNotes])

  return null
}
