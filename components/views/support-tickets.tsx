"use client"

import React, { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "motion/react"
import { useSlideTransition } from "@/hooks/use-slide-transition"
import { useToast } from "@/hooks/use-toast"
import { fetchWithCsrf } from "@/lib/csrf"
import { cn } from "@/lib/utils"
import {
  InboxItem,
  TicketDetailPanel,
  ListHeader,
  AddTicketModal,
  EditTicketModal,
  type Ticket,
} from "@/components/linear"
import { useTicketStore, type Ticket as StoreTicket } from "@/stores/ticket-store"
import { useSettingsStore } from "@/stores/settings-store"
import { Button } from "@/components/ui/button"
import {
  Inbox,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
} from "lucide-react"

// Map store status to UI status
function mapStatus(storeStatus: string): "open" | "in_progress" | "waiting" | "resolved" {
  switch (storeStatus) {
    case "new": return "open"
    case "in_progress": return "in_progress"
    case "waiting_client": return "waiting"
    case "resolved": return "resolved"
    default: return "open"
  }
}

// Map store priority to UI priority (DB uses "critical", UI uses "urgent")
function mapPriority(storePriority: string): "low" | "medium" | "high" | "urgent" {
  switch (storePriority) {
    case "low": return "low"
    case "medium": return "medium"
    case "high": return "high"
    case "critical": return "urgent"
    default: return "medium"
  }
}

// Transform store tickets to component format
function transformStoreTicket(storeTicket: StoreTicket): Ticket {
  return {
    id: storeTicket.id,
    title: storeTicket.title,
    description: storeTicket.description || "",
    client: {
      name: storeTicket.client?.name || "Unknown Client",
      initials: storeTicket.client?.name?.substring(0, 2).toUpperCase() || "UC",
      color: "bg-blue-600",
    },
    priority: mapPriority(storeTicket.priority),
    status: mapStatus(storeTicket.status),
    category: storeTicket.category,
    assignee: storeTicket.assignee ? {
      name: `${storeTicket.assignee.first_name || ""} ${storeTicket.assignee.last_name || ""}`.trim() || "Unassigned",
      initials: `${storeTicket.assignee.first_name?.[0] || ""}${storeTicket.assignee.last_name?.[0] || ""}`.toUpperCase() || "U",
      color: "bg-emerald-500",
    } : undefined,
    createdAt: new Date(storeTicket.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    updatedAt: new Date(storeTicket.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    dueDate: storeTicket.due_date ? new Date(storeTicket.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : undefined,
    tags: [],
    activities: [],
  }
}

type FilterTab = "all" | "open" | "in_progress" | "waiting" | "resolved"

interface FilterTabConfig {
  id: FilterTab
  label: string
  icon: React.ReactNode
  count: number
}

export function SupportTickets() {
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [ticketActivities, setTicketActivities] = useState<Ticket["activities"]>([])
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isLoadingNotes, setIsLoadingNotes] = useState(false)
  const [addTicketModalOpen, setAddTicketModalOpen] = useState(false)
  const [editTicketModalOpen, setEditTicketModalOpen] = useState(false)
  const [editTicketId, setEditTicketId] = useState<string | null>(null)

  const router = useRouter()
  const slideTransition = useSlideTransition()
  const { toast } = useToast()

  // Get tickets from store
  const { tickets: storeTickets, fetchTickets, isLoading: _isLoading } = useTicketStore()

  // Get team members from settings store
  const { teamMembers: rawTeamMembers, fetchTeamMembers } = useSettingsStore()

  // Transform team members to the format TicketDetailPanel expects
  const teamMembers = useMemo(() => {
    return rawTeamMembers.map((m) => ({
      id: m.id,
      name: `${m.first_name || ""} ${m.last_name || ""}`.trim() || m.email,
      initials: `${m.first_name?.[0] || ""}${m.last_name?.[0] || ""}`.toUpperCase() || "U",
      color: "bg-emerald-500",
    }))
  }, [rawTeamMembers])

  // Fetch tickets and team members on mount
  useEffect(() => {
    fetchTickets()
    fetchTeamMembers()
  }, [fetchTickets, fetchTeamMembers])

  // Transform store tickets to display format
  const displayTickets = useMemo(() => {
    return storeTickets.map(transformStoreTicket)
  }, [storeTickets])

  // Derive selectedTicket from the live store data + separately-loaded activities
  const selectedTicket = useMemo(() => {
    const ticket = displayTickets.find(t => t.id === selectedTicketId) ?? null
    if (!ticket) return null
    return { ...ticket, activities: ticketActivities }
  }, [displayTickets, selectedTicketId, ticketActivities])

  // Load ticket notes when a different ticket is selected
  useEffect(() => {
    if (!selectedTicketId) {
      setTicketActivities([])
      return
    }

    const loadTicketNotes = async () => {
      setIsLoadingNotes(true)
      try {
        const response = await fetch(
          `/api/v1/tickets/${selectedTicketId}/notes`,
          { credentials: 'include' }
        )

        if (response.ok) {
          const { data: notes } = await response.json()

          // Transform notes to activity items
          const activities = notes.map((note: any) => ({
            id: note.id,
            type: 'comment' as const,
            actor: {
              name: `${note.author?.first_name || ''} ${note.author?.last_name || ''}`.trim() || 'Unknown',
              initials: `${note.author?.first_name?.[0] || ''}${note.author?.last_name?.[0] || ''}`.toUpperCase() || 'U',
              color: 'bg-blue-600',
            },
            timestamp: new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            content: note.content,
          }))

          setTicketActivities(activities)
        }
      } catch (error) {
        console.error('Failed to load ticket notes:', error)
      } finally {
        setIsLoadingNotes(false)
      }
    }

    loadTicketNotes()
  }, [selectedTicketId])

  // Calculate counts
  const counts = useMemo(() => {
    return {
      all: displayTickets.length,
      open: displayTickets.filter((t) => t.status === "open").length,
      in_progress: displayTickets.filter((t) => t.status === "in_progress").length,
      waiting: displayTickets.filter((t) => t.status === "waiting").length,
      resolved: displayTickets.filter((t) => t.status === "resolved").length,
    }
  }, [displayTickets])

  const filterTabs: FilterTabConfig[] = [
    { id: "all", label: "All", icon: <Inbox className="w-4 h-4" />, count: counts.all },
    { id: "open", label: "Open", icon: <AlertCircle className="w-4 h-4" />, count: counts.open },
    { id: "in_progress", label: "In Progress", icon: <Clock className="w-4 h-4" />, count: counts.in_progress },
    { id: "waiting", label: "Waiting", icon: <Clock className="w-4 h-4" />, count: counts.waiting },
    { id: "resolved", label: "Resolved", icon: <CheckCircle className="w-4 h-4" />, count: counts.resolved },
  ]

  // Filter tickets
  const filteredTickets = useMemo(() => {
    let tickets = displayTickets

    // Apply status filter
    if (activeFilter !== "all") {
      tickets = tickets.filter((t) => {
        const status = t.status.replace(" ", "_")
        return status === activeFilter
      })
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      tickets = tickets.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.client.name.toLowerCase().includes(query) ||
          t.id.toLowerCase().includes(query)
      )
    }

    return tickets
  }, [activeFilter, searchQuery, displayTickets])

  const handleComment = async (content: string) => {
    if (!selectedTicketId || !content.trim()) return

    setIsSubmittingComment(true)
    try {
      const response = await fetchWithCsrf(
        `/api/v1/tickets/${selectedTicketId}/notes`,
        {
          method: 'POST',
          body: JSON.stringify({
            content: content.trim(),
            is_internal: false,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to post comment')
      }

      toast({
        title: 'Comment posted',
        description: 'Your comment has been added to the ticket.',
        variant: 'default',
      })

      // Reload notes for the selected ticket to show the new comment
      const notesResponse = await fetch(
        `/api/v1/tickets/${selectedTicketId}/notes`,
        { credentials: 'include' }
      )

      if (notesResponse.ok) {
        const { data: notes } = await notesResponse.json()
        const activities = notes.map((note: any) => ({
          id: note.id,
          type: 'comment' as const,
          actor: {
            name: `${note.author?.first_name || ''} ${note.author?.last_name || ''}`.trim() || 'Unknown',
            initials: `${note.author?.first_name?.[0] || ''}${note.author?.last_name?.[0] || ''}`.toUpperCase() || 'U',
            color: 'bg-blue-600',
          },
          timestamp: new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          content: note.content,
        }))

        setTicketActivities(activities)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to post comment'
      toast({
        title: 'Error posting comment',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleStatusChange = async (newStatus: "open" | "in_progress" | "waiting" | "resolved" | "closed") => {
    if (!selectedTicketId) return

    // Map UI status to API status
    const statusMap: Record<string, string> = {
      'open': 'new',
      'in_progress': 'in_progress',
      'waiting': 'waiting_client',
      'resolved': 'resolved',
      'closed': 'resolved',
    }

    try {
      const response = await fetchWithCsrf(`/api/v1/tickets/${selectedTicketId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: statusMap[newStatus] }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to update status')
      }

      toast({
        title: 'Status updated',
        description: `Ticket status changed to ${newStatus}`,
        variant: 'default',
      })

      // Refresh store so panel and list both reflect the new status
      await fetchTickets()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update status'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  const handlePriorityChange = async (newPriority: "low" | "medium" | "high" | "urgent") => {
    if (!selectedTicketId) return

    // Map UI priority to DB enum (UI uses "urgent", DB uses "critical")
    const priorityMap: Record<string, string> = {
      'urgent': 'critical',
      'high': 'high',
      'medium': 'medium',
      'low': 'low',
    }

    try {
      const response = await fetchWithCsrf(`/api/v1/tickets/${selectedTicketId}`, {
        method: 'PATCH',
        body: JSON.stringify({ priority: priorityMap[newPriority] }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to update priority')
      }

      toast({
        title: 'Priority updated',
        description: `Ticket priority changed to ${newPriority}`,
        variant: 'default',
      })

      // Refresh store so panel and list both reflect the new priority
      await fetchTickets()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update priority'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  const handleOpenTicket = () => {
    if (!selectedTicketId) return
    router.push(`/tickets/${selectedTicketId}`)
  }

  const handleEditTicket = () => {
    if (!selectedTicketId) return
    setEditTicketId(selectedTicketId)
    setEditTicketModalOpen(true)
  }

  const handleAssignTicket = async (userId: string, userName: string) => {
    if (!selectedTicketId) return

    try {
      const response = await fetchWithCsrf(`/api/v1/tickets/${selectedTicketId}`, {
        method: 'PATCH',
        body: JSON.stringify({ assignee_id: userId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to assign ticket')
      }

      toast({
        title: 'Ticket assigned',
        description: `Assigned to ${userName}`,
        variant: 'default',
      })

      await fetchTickets()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to assign ticket'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    }
  }

  return (
    <>
    <div className="flex h-full overflow-hidden">
      {/* Ticket list - flex-1 keeps it filling available space */}
      <div
        className="flex-1 flex flex-col border-r border-border overflow-hidden"
      >
        <ListHeader
          title="Support Tickets"
          count={filteredTickets.length}
          onSearch={setSearchQuery}
          searchValue={searchQuery}
          searchPlaceholder="Search tickets..."
          actions={
            <Button
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setAddTicketModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Add Ticket
            </Button>
          }
        />

        {/* Filter tabs */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-border overflow-x-auto">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap cursor-pointer",
                activeFilter === tab.id
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span className="text-xs text-muted-foreground">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Ticket list - scrollable */}
        <div className="flex-1 overflow-y-auto">
          {filteredTickets.length > 0 ? (
            filteredTickets.map((ticket) => (
              <InboxItem
                key={ticket.id}
                id={ticket.id}
                title={ticket.title}
                preview={ticket.description}
                client={ticket.client}
                priority={ticket.priority}
                status={ticket.status}
                timestamp={ticket.updatedAt}
                unread={ticket.status === "open"}
                selected={selectedTicketId === ticket.id}
                compact={false}
                onClick={() => setSelectedTicketId(ticket.id)}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Inbox className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No tickets found</p>
            </div>
          )}
        </div>
      </div>

      {/* Ticket detail panel - fixed width, slides in from right */}
      <AnimatePresence mode="wait">
        {selectedTicket && (
          <motion.div
            key="ticket-detail-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 480, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={slideTransition}
            className="flex flex-col bg-background overflow-hidden shrink-0"
          >
            <TicketDetailPanel
              ticket={selectedTicket}
              onClose={() => setSelectedTicketId(null)}
              onComment={handleComment}
              onStatusChange={handleStatusChange}
              onPriorityChange={handlePriorityChange}
              onOpen={handleOpenTicket}
              onEdit={handleEditTicket}
              onAssign={handleAssignTicket}
              teamMembers={teamMembers}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    <AddTicketModal
      isOpen={addTicketModalOpen}
      onClose={() => setAddTicketModalOpen(false)}
    />
    <EditTicketModal
      isOpen={editTicketModalOpen}
      onClose={() => {
        setEditTicketModalOpen(false)
        setEditTicketId(null)
      }}
      ticketId={editTicketId}
    />
    </>
  )
}
