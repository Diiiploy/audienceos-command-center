"use client"

import React from "react"
import { KanbanCard } from "./kanban-card"
import { MoreHorizontal, Plus, SortAsc, Filter, EyeOff, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { MinimalClient } from "@/types/client"

interface KanbanColumnProps {
  title: string
  clients: MinimalClient[]
  color?: string
  onClientClick?: (client: MinimalClient) => void
  onAddClick?: () => void
}

function getColumnIndicator(title: string) {
  switch (title) {
    case "Live":
      return <div className="w-2 h-2 bg-status-green rounded-full" />
    case "Installation":
    case "Audit":
      return <div className="w-2 h-2 bg-primary rounded-full" />
    case "Intake":
    case "Access":
      return <div className="w-2 h-2 bg-status-yellow rounded-full" />
    case "Needs Support":
    case "Off-boarding":
      return <div className="w-2 h-2 bg-status-red rounded-full" />
    default:
      return <div className="w-2 h-2 bg-muted-foreground rounded-full" />
  }
}

// Owner data lookup
const ownerColors: Record<string, { initials: string; color: string }> = {
  Brent: { initials: "B", color: "bg-emerald-500" },
  Roderic: { initials: "R", color: "bg-blue-500" },
  Trevor: { initials: "T", color: "bg-amber-500" },
  Chase: { initials: "C", color: "bg-purple-500" },
  default: { initials: "??", color: "bg-primary" },
}

export function KanbanColumn({
  title,
  clients,
  onClientClick,
  onAddClick,
}: KanbanColumnProps) {
  return (
    <div className="flex-shrink-0 w-72 border-r border-border last:border-r-0">
      {/* Column header */}
      <div className="flex items-center justify-between p-3 border-b border-border sticky top-0 bg-background">
        <div className="flex items-center gap-2">
          {getColumnIndicator(title)}
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <span className="text-xs text-muted-foreground">{clients.length}</span>
        </div>
        <div className="flex items-center gap-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <SortAsc className="w-4 h-4 mr-2" />
                Sort by Health
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <EyeOff className="w-4 h-4 mr-2" />
                Hide Column
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                Column Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onAddClick}>
            <Plus className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Cards container */}
      <div className="p-2 space-y-2 min-h-[400px]">
        {clients.map((client) => {
          const ownerData = ownerColors[client.owner] || ownerColors.default
          return (
            <KanbanCard
              key={client.id}
              id={client.logo}
              name={client.name}
              health={client.health}
              owner={{
                name: client.owner,
                initials: ownerData.initials,
                color: ownerData.color,
              }}
              daysInStage={client.daysInStage}
              blocker={client.blocker}
              tier={client.tier}
              onClick={() => onClientClick?.(client)}
            />
          )
        })}

        {clients.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground">
            No clients
          </div>
        )}
      </div>
    </div>
  )
}
