"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ActivityFeed, CommentInput, type ActivityType } from "./activity-feed"
import { type TicketPriority, type TicketStatus } from "./inbox-item"
import {
  X,
  MoreHorizontal,
  ExternalLink,
  Clock,
  User,
  Tag,
  Building2,
  Calendar,
  AlertCircle,
  Edit,
  Copy,
  Trash2,
  UserPlus,
  Flag,
  CircleDot,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"

interface TicketActivity {
  id: string
  type: ActivityType
  actor: {
    name: string
    initials: string
    color?: string
  }
  timestamp: string
  content?: string
  metadata?: {
    from?: string
    to?: string
    fileName?: string
    mentioned?: string
  }
}

interface Ticket {
  id: string
  title: string
  description: string
  client: {
    name: string
    initials: string
    color?: string
  }
  priority: TicketPriority
  status: TicketStatus
  assignee?: {
    name: string
    initials: string
    color?: string
  }
  createdAt: string
  updatedAt: string
  dueDate?: string
  tags?: string[]
  activities: TicketActivity[]
}

interface TicketDetailPanelProps {
  ticket: Ticket
  onClose: () => void
  onStatusChange?: (status: TicketStatus) => void
  onPriorityChange?: (priority: TicketPriority) => void
  onComment?: (content: string) => void
  className?: string
}

const priorityColors: Record<TicketPriority, string> = {
  urgent: "bg-red-500/10 text-red-500 border-red-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  low: "bg-slate-500/10 text-slate-400 border-slate-500/20",
}

const statusColors: Record<TicketStatus, string> = {
  open: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  in_progress: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  waiting: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  resolved: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  closed: "bg-slate-500/10 text-slate-400 border-slate-500/20",
}

const statusLabels: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  waiting: "Waiting",
  resolved: "Resolved",
  closed: "Closed",
}

const priorityLabels: Record<TicketPriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
}

export function TicketDetailPanel({
  ticket,
  onClose,
  onStatusChange,
  onPriorityChange,
  onComment,
  className,
}: TicketDetailPanelProps) {
  return (
    <div
      className={cn(
        "flex flex-col h-full bg-background border-l border-border",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">#{ticket.id}</span>
          <span
            className={cn(
              "text-xs px-2 py-0.5 rounded border font-medium",
              statusColors[ticket.status]
            )}
          >
            {statusLabels[ticket.status]}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors cursor-pointer">
            <ExternalLink className="w-4 h-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <CircleDot className="w-4 h-4 mr-2" />
                  Change Status
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => onStatusChange?.("open")}>Open</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange?.("in_progress")}>In Progress</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange?.("waiting")}>Waiting</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange?.("resolved")}>Resolved</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange?.("closed")}>Closed</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Flag className="w-4 h-4 mr-2" />
                  Change Priority
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => onPriorityChange?.("urgent")}>Urgent</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onPriorityChange?.("high")}>High</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onPriorityChange?.("medium")}>Medium</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onPriorityChange?.("low")}>Low</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Assign to
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem>Brent</DropdownMenuItem>
                  <DropdownMenuItem>Roderic</DropdownMenuItem>
                  <DropdownMenuItem>Trevor</DropdownMenuItem>
                  <DropdownMenuItem>Chase</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Title and description */}
        <div className="px-4 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground mb-2">
            {ticket.title}
          </h2>
          <p className="text-sm text-muted-foreground">{ticket.description}</p>
        </div>

        {/* Properties - using fixed-width label pattern */}
        <div className="px-4 py-4 border-b border-border">
          <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-2.5 items-center">
            {/* Client */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="w-4 h-4" />
              <span>Client</span>
            </div>
            <div className="flex items-center gap-2">
              <Avatar className={cn("h-5 w-5", ticket.client.color || "bg-primary")}>
                <AvatarFallback
                  className={cn(
                    "text-[10px] font-medium text-primary-foreground",
                    ticket.client.color || "bg-primary"
                  )}
                >
                  {ticket.client.initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-foreground">{ticket.client.name}</span>
            </div>

            {/* Assignee */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span>Assignee</span>
            </div>
            {ticket.assignee ? (
              <div className="flex items-center gap-2">
                <Avatar
                  className={cn("h-5 w-5", ticket.assignee.color || "bg-primary")}
                >
                  <AvatarFallback
                    className={cn(
                      "text-[10px] font-medium text-primary-foreground",
                      ticket.assignee.color || "bg-primary"
                    )}
                  >
                    {ticket.assignee.initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-foreground">
                  {ticket.assignee.name}
                </span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Unassigned</span>
            )}

            {/* Priority */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="w-4 h-4" />
              <span>Priority</span>
            </div>
            <span
              className={cn(
                "text-xs px-2 py-0.5 rounded border font-medium w-fit",
                priorityColors[ticket.priority]
              )}
            >
              {priorityLabels[ticket.priority]}
            </span>

            {/* Due date */}
            {ticket.dueDate && (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Due date</span>
                </div>
                <span className="text-sm text-foreground">{ticket.dueDate}</span>
              </>
            )}

            {/* Created */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Created</span>
            </div>
            <span className="text-sm text-foreground">{ticket.createdAt}</span>

            {/* Tags */}
            {ticket.tags && ticket.tags.length > 0 && (
              <>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Tag className="w-4 h-4" />
                  <span>Tags</span>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {ticket.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-1.5 py-0.5 rounded bg-secondary text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Activity feed */}
        <div className="px-4 py-4">
          <h3 className="text-sm font-medium text-foreground mb-4">Activity</h3>
          <ActivityFeed activities={ticket.activities} />
        </div>
      </div>

      {/* Comment input */}
      <div className="px-4 py-3 border-t border-border">
        <CommentInput onSubmit={onComment} placeholder="Add a comment..." />
      </div>
    </div>
  )
}

export type { Ticket, TicketActivity }
