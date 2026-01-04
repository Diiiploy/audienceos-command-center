"use client"

import React, { useState, useMemo } from "react"
import { motion, AnimatePresence, useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"
import {
  InboxItem,
  TicketDetailPanel,
  ListHeader,
  type Ticket,
} from "@/components/linear"
import { mockClients } from "@/lib/mock-data"
import {
  Inbox,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react"

// Mock tickets data
const mockTickets: Ticket[] = [
  {
    id: "TKT-001",
    title: "Google Ads conversion tracking not working",
    description:
      "The conversion tracking pixel seems to be firing incorrectly. We're seeing duplicate conversions in the dashboard that don't match our CRM data.",
    client: {
      name: mockClients[0]?.name || "Acme Corp",
      initials: mockClients[0]?.logo || "AC",
      color: "bg-blue-600",
    },
    priority: "high",
    status: "in_progress",
    assignee: {
      name: "Sarah Chen",
      initials: "SC",
      color: "bg-purple-600",
    },
    createdAt: "Dec 28, 2024",
    updatedAt: "2 hours ago",
    dueDate: "Jan 3, 2025",
    tags: ["google-ads", "tracking", "urgent"],
    activities: [
      {
        id: "act-1",
        type: "created",
        actor: { name: "John Smith", initials: "JS", color: "bg-blue-600" },
        timestamp: "Dec 28, 2024 at 10:30 AM",
      },
      {
        id: "act-2",
        type: "assignment",
        actor: { name: "Mike Wilson", initials: "MW", color: "bg-green-600" },
        timestamp: "Dec 28, 2024 at 10:45 AM",
        metadata: { to: "Sarah Chen" },
      },
      {
        id: "act-3",
        type: "status_change",
        actor: { name: "Sarah Chen", initials: "SC", color: "bg-purple-600" },
        timestamp: "Dec 28, 2024 at 2:00 PM",
        metadata: { from: "Open", to: "In Progress" },
      },
      {
        id: "act-4",
        type: "comment",
        actor: { name: "Sarah Chen", initials: "SC", color: "bg-purple-600" },
        timestamp: "2 hours ago",
        content:
          "I've identified the issue - there's a duplicate GTM container on the checkout page. Working on removing it now.",
      },
    ],
  },
  {
    id: "TKT-002",
    title: "Need access to Meta Business Manager",
    description:
      "Client hasn't provided admin access to their Meta Business Manager yet. Blocking campaign setup.",
    client: {
      name: mockClients[1]?.name || "TechStart Inc",
      initials: mockClients[1]?.logo || "TS",
      color: "bg-emerald-600",
    },
    priority: "urgent",
    status: "waiting",
    createdAt: "Dec 29, 2024",
    updatedAt: "1 hour ago",
    tags: ["access", "meta", "blocking"],
    activities: [
      {
        id: "act-5",
        type: "created",
        actor: { name: "Emily Davis", initials: "ED", color: "bg-pink-600" },
        timestamp: "Dec 29, 2024 at 9:00 AM",
      },
      {
        id: "act-6",
        type: "priority_change",
        actor: { name: "Mike Wilson", initials: "MW", color: "bg-green-600" },
        timestamp: "1 hour ago",
        metadata: { from: "High", to: "Urgent" },
      },
    ],
  },
  {
    id: "TKT-003",
    title: "Monthly performance report request",
    description:
      "Client requested a detailed breakdown of Q4 performance with YoY comparison.",
    client: {
      name: mockClients[2]?.name || "Global Retail",
      initials: mockClients[2]?.logo || "GR",
      color: "bg-orange-600",
    },
    priority: "medium",
    status: "open",
    assignee: {
      name: "Alex Kim",
      initials: "AK",
      color: "bg-cyan-600",
    },
    createdAt: "Dec 30, 2024",
    updatedAt: "30 min ago",
    dueDate: "Jan 5, 2025",
    tags: ["reporting", "q4"],
    activities: [
      {
        id: "act-7",
        type: "created",
        actor: { name: "Client Portal", initials: "CP", color: "bg-slate-600" },
        timestamp: "Dec 30, 2024 at 11:00 AM",
      },
      {
        id: "act-8",
        type: "assignment",
        actor: { name: "Mike Wilson", initials: "MW", color: "bg-green-600" },
        timestamp: "30 min ago",
        metadata: { to: "Alex Kim" },
      },
    ],
  },
  {
    id: "TKT-004",
    title: "Landing page load time optimization",
    description:
      "The new landing page is loading slowly (5+ seconds). Need to optimize before campaign launch.",
    client: {
      name: mockClients[3]?.name || "Fashion Forward",
      initials: mockClients[3]?.logo || "FF",
      color: "bg-pink-600",
    },
    priority: "high",
    status: "in_progress",
    assignee: {
      name: "Sarah Chen",
      initials: "SC",
      color: "bg-purple-600",
    },
    createdAt: "Dec 27, 2024",
    updatedAt: "4 hours ago",
    dueDate: "Jan 2, 2025",
    tags: ["performance", "landing-page"],
    activities: [
      {
        id: "act-9",
        type: "created",
        actor: { name: "John Smith", initials: "JS", color: "bg-blue-600" },
        timestamp: "Dec 27, 2024 at 3:00 PM",
      },
      {
        id: "act-10",
        type: "comment",
        actor: { name: "Sarah Chen", initials: "SC", color: "bg-purple-600" },
        timestamp: "4 hours ago",
        content:
          "Compressed images and enabled lazy loading. Page now loads in 2.1 seconds. Testing on mobile next.",
      },
    ],
  },
  {
    id: "TKT-005",
    title: "Budget increase approval needed",
    description:
      "Client wants to increase monthly ad spend from $10k to $25k. Need internal approval.",
    client: {
      name: mockClients[0]?.name || "Acme Corp",
      initials: mockClients[0]?.logo || "AC",
      color: "bg-blue-600",
    },
    priority: "medium",
    status: "resolved",
    assignee: {
      name: "Mike Wilson",
      initials: "MW",
      color: "bg-green-600",
    },
    createdAt: "Dec 26, 2024",
    updatedAt: "Yesterday",
    tags: ["budget", "approval"],
    activities: [
      {
        id: "act-11",
        type: "created",
        actor: { name: "Emily Davis", initials: "ED", color: "bg-pink-600" },
        timestamp: "Dec 26, 2024 at 10:00 AM",
      },
      {
        id: "act-12",
        type: "resolved",
        actor: { name: "Mike Wilson", initials: "MW", color: "bg-green-600" },
        timestamp: "Yesterday",
      },
    ],
  },
]

type FilterTab = "all" | "open" | "in_progress" | "waiting" | "resolved"

interface FilterTabConfig {
  id: FilterTab
  label: string
  icon: React.ReactNode
  count: number
}

export function SupportTickets() {
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all")
  const [searchQuery, setSearchQuery] = useState("")

  // Reduced motion support
  const prefersReducedMotion = useReducedMotion()
  const slideTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }

  // Calculate counts
  const counts = useMemo(() => {
    return {
      all: mockTickets.length,
      open: mockTickets.filter((t) => t.status === "open").length,
      in_progress: mockTickets.filter((t) => t.status === "in_progress").length,
      waiting: mockTickets.filter((t) => t.status === "waiting").length,
      resolved: mockTickets.filter((t) => t.status === "resolved").length,
    }
  }, [])

  const filterTabs: FilterTabConfig[] = [
    { id: "all", label: "All", icon: <Inbox className="w-4 h-4" />, count: counts.all },
    { id: "open", label: "Open", icon: <AlertCircle className="w-4 h-4" />, count: counts.open },
    { id: "in_progress", label: "In Progress", icon: <Clock className="w-4 h-4" />, count: counts.in_progress },
    { id: "waiting", label: "Waiting", icon: <Clock className="w-4 h-4" />, count: counts.waiting },
    { id: "resolved", label: "Resolved", icon: <CheckCircle className="w-4 h-4" />, count: counts.resolved },
  ]

  // Filter tickets
  const filteredTickets = useMemo(() => {
    let tickets = mockTickets

    // Apply status filter
    if (activeFilter !== "all") {
      tickets = tickets.filter((t) => t.status === activeFilter)
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
  }, [activeFilter, searchQuery])

  const handleComment = (_content: string) => {
    // TODO: Implement comment creation API call
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Ticket list - shrinks when detail panel is open */}
      <motion.div
        initial={false}
        animate={{ width: selectedTicket ? 280 : "100%" }}
        transition={slideTransition}
        className="flex flex-col border-r border-border overflow-hidden"
        style={{ minWidth: selectedTicket ? 280 : undefined, flexShrink: selectedTicket ? 0 : undefined }}
      >
        <ListHeader
          title="Support Tickets"
          count={filteredTickets.length}
          onSearch={!selectedTicket ? setSearchQuery : undefined}
          searchValue={!selectedTicket ? searchQuery : undefined}
          searchPlaceholder="Search tickets..."
        />

        {/* Filter tabs - hide when compact */}
        {!selectedTicket && (
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
        )}

        {/* Ticket list */}
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
                selected={selectedTicket?.id === ticket.id}
                compact={!!selectedTicket}
                onClick={() => setSelectedTicket(ticket)}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Inbox className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">No tickets found</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Ticket detail panel */}
      <AnimatePresence mode="wait">
        {selectedTicket && (
          <motion.div
            key="ticket-detail-panel"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={slideTransition}
            className="flex-1 flex flex-col bg-background overflow-hidden"
          >
            <TicketDetailPanel
              ticket={selectedTicket}
              onClose={() => setSelectedTicket(null)}
              onComment={handleComment}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
