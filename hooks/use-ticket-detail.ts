import { useState, useEffect, useCallback } from 'react'

export interface DetailedTicket {
  id: string
  agency_id: string
  number: number
  title: string
  description: string
  category: string
  priority: string
  status: string
  assignee_id: string | null
  client_id: string
  resolution_notes: string | null
  time_spent_minutes: number | null
  due_date: string | null
  created_by: string
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
  // Joined data
  client: {
    id: string
    name: string
    health_status: string
    contact_email: string | null
    contact_name: string | null
    days_in_stage: number
  } | null
  assignee: {
    id: string
    first_name: string
    last_name: string
    avatar_url: string | null
  } | null
  creator: {
    id: string
    first_name: string
    last_name: string
  } | null
  resolver: {
    id: string
    first_name: string
    last_name: string
  } | null
}

interface UseTicketDetailResult {
  ticket: DetailedTicket | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useTicketDetail(ticketId: string | null): UseTicketDetailResult {
  const [ticket, setTicket] = useState<DetailedTicket | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchTicket = useCallback(async () => {
    if (!ticketId) {
      setTicket(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/v1/tickets/${ticketId}`, { credentials: 'include' })

      if (!response.ok) {
        if (response.status === 401) {
          setError('Please sign in to view ticket details')
        } else if (response.status === 404) {
          setError('Ticket not found')
        } else {
          setError('Failed to load ticket details')
        }
        setTicket(null)
        return
      }

      const { data } = await response.json()
      setTicket(data)
    } catch (err) {
      console.error('Error fetching ticket:', err)
      setError('Failed to load ticket details')
      setTicket(null)
    } finally {
      setIsLoading(false)
    }
  }, [ticketId])

  useEffect(() => {
    fetchTicket()
  }, [fetchTicket])

  return {
    ticket,
    isLoading,
    error,
    refetch: fetchTicket,
  }
}
