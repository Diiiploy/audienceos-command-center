"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  X,
  Copy,
  Pencil,
  Calendar,
  Tag,
  FolderKanban,
  Send,
  Paperclip,
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
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <Copy className="w-4 h-4" />
          </Button>
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

          <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
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

        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span className="text-sm">Set due date</span>
        </div>
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
              className="flex-1 bg-transparent border-none h-8 text-sm focus-visible:ring-0"
            />
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground">
              <Paperclip className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
