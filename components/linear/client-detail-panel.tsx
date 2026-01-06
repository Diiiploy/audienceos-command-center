"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  X,
  Copy,
  Pencil,
  Calendar,
  Tag,
  FolderKanban,
  Send,
  Paperclip,
  MoreVertical,
  ExternalLink,
  FolderOpen,
  ArrowRight,
  UserPlus,
  Trash2,
} from "lucide-react"

interface ClientDetailPanelProps {
  client: {
    id: string
    name: string
    stage: string
    health: "Green" | "Yellow" | "Red" | "Blocked"
    owner: {
      name: string
      initials: string
      color: string
    }
    tier: string
    daysInStage: number
    blocker?: string | null
    statusNote?: string | null
  }
  onClose: () => void
}

function getHealthBadgeStyle(health: string) {
  switch (health) {
    case "Green":
      return "bg-status-green/20 text-status-green border-status-green/30"
    case "Yellow":
      return "bg-status-yellow/20 text-status-yellow border-status-yellow/30"
    case "Red":
      return "bg-status-red/20 text-status-red border-status-red/30"
    case "Blocked":
      return "bg-status-blocked/20 text-status-blocked border-status-blocked/30"
    default:
      return ""
  }
}

function getTierBadgeStyle(tier: string) {
  switch (tier) {
    case "Enterprise":
      return "bg-status-green/20 text-status-green border-status-green/30"
    case "Core":
      return "bg-primary/20 text-primary border-primary/30"
    case "Starter":
      return "bg-muted text-muted-foreground border-border"
    default:
      return ""
  }
}

export function ClientDetailPanel({ client, onClose }: ClientDetailPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [noteText, setNoteText] = useState("")

  // Handler functions
  const handleEdit = () => {
    setIsEditing(!isEditing)
    // TODO: Toggle edit mode for inline editing
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(client.id)
    // TODO: Show toast notification
  }

  const handleOpen = () => {
    // TODO: Open client in new tab/view
    console.log("Open client:", client.id)
  }

  const handleMove = () => {
    // TODO: Open stage picker modal
    console.log("Move client:", client.id)
  }

  const handleAssign = () => {
    // TODO: Open owner picker modal
    console.log("Assign client:", client.id)
  }

  const handleDelete = () => {
    // TODO: Open delete confirmation modal
    console.log("Delete client:", client.id)
  }

  const handleSendNote = () => {
    if (!noteText.trim()) return
    // TODO: Save note via API
    console.log("Send note:", noteText)
    setNoteText("")
  }

  const handleAttachment = () => {
    // TODO: Open file picker
    console.log("Attach file")
  }

  const handleAddLabel = () => {
    // TODO: Open label picker
    console.log("Add label")
  }

  const handleSetDueDate = () => {
    // TODO: Open date picker
    console.log("Set due date")
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn("w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white", client.owner.color)}>
            {client.owner.initials}
          </div>
          <span className="text-sm text-foreground truncate">{client.name}</span>
          <span className="text-xs text-muted-foreground">{client.id}</span>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleEdit}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleCopy}>
            <Copy className="w-4 h-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleOpen}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleEdit}>
                <FolderOpen className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleMove}>
                <ArrowRight className="w-4 h-4 mr-2" />
                Move
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleAssign}>
                <UserPlus className="w-4 h-4 mr-2" />
                Assign
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Properties - using fixed-width label pattern */}
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-medium mb-3">Properties</h3>

        <div className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-2.5 items-center">
          {/* Stage */}
          <span className="text-xs text-muted-foreground">Stage</span>
          <span className="text-sm text-foreground">{client.stage}</span>

          {/* Health */}
          <span className="text-xs text-muted-foreground">Health</span>
          <span>
            <Badge variant="outline" className={cn("text-xs", getHealthBadgeStyle(client.health))}>
              {client.health}
            </Badge>
          </span>

          {/* Owner */}
          <span className="text-xs text-muted-foreground">Owner</span>
          <div className="flex items-center gap-2">
            <Avatar className={cn("h-6 w-6", client.owner.color)}>
              <AvatarFallback className={cn(client.owner.color, "text-xs font-medium text-white")}>
                {client.owner.initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{client.owner.name}</span>
          </div>

          {/* Days in stage */}
          <span className="text-xs text-muted-foreground">Days in Stage</span>
          <span className={cn(
            "text-sm tabular-nums",
            client.daysInStage > 4 ? "text-status-red font-medium" : ""
          )}>
            {client.daysInStage}
          </span>
        </div>
      </div>

      {/* Labels */}
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-medium mb-3">Labels</h3>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-xs", getTierBadgeStyle(client.tier))}>
              {client.tier}
            </Badge>
          </div>

          {client.blocker && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-status-red/20 text-status-red border-status-red/30">
                {client.blocker}
              </Badge>
            </div>
          )}

          <button
            onClick={handleAddLabel}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Tag className="w-4 h-4" />
            <span className="text-xs">Add label</span>
          </button>
        </div>
      </div>

      {/* Project */}
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-medium mb-3">Project</h3>

        <div className="flex items-center gap-2">
          <FolderKanban className="w-4 h-4 text-primary" />
          <span className="text-sm">Client Pipeline</span>
        </div>
      </div>

      {/* Due Date */}
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-medium mb-3">Due Date</h3>

        <button
          onClick={handleSetDueDate}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <Calendar className="w-4 h-4" />
          <span className="text-sm">Set due date</span>
        </button>
      </div>

      {/* Notes */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 flex-1 overflow-y-auto">
          <h3 className="text-sm font-medium mb-3">Notes</h3>

          {client.statusNote ? (
            <div className="p-3 rounded bg-secondary/50 border border-border">
              <p className="text-sm text-foreground">{client.statusNote}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Added by {client.owner.name}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No notes yet</p>
          )}
        </div>

        {/* Comment Input */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-2">
            <Avatar className={cn("h-6 w-6", client.owner.color)}>
              <AvatarFallback className={cn(client.owner.color, "text-xs font-medium text-white")}>
                {client.owner.initials}
              </AvatarFallback>
            </Avatar>
            <Input
              placeholder="Add a note..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSendNote()
                }
              }}
              className="flex-1 bg-transparent border-none h-8 text-sm focus-visible:ring-0"
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
              onClick={handleAttachment}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground disabled:opacity-50"
              onClick={handleSendNote}
              disabled={!noteText.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
