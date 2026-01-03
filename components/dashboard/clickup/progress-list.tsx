"use client"

import { MoreHorizontal, Download, RefreshCw, Settings, Eye } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface ProgressItem {
  id: string
  label: string
  value: number
  maxValue?: number
  color?: string
  avatar?: {
    initials: string
    color: string
  }
  sublabel?: string
}

interface ProgressListProps {
  title: string
  items: ProgressItem[]
  showPercentage?: boolean
  showValue?: boolean
  valuePrefix?: string
  valueSuffix?: string
  maxItems?: number
  className?: string
}

export function ProgressList({
  title,
  items,
  showPercentage = false,
  showValue = true,
  valuePrefix = "",
  valueSuffix = "",
  maxItems = 5,
  className,
}: ProgressListProps) {
  const maxValue = Math.max(...items.map(i => i.maxValue || i.value))
  const displayItems = items.slice(0, maxItems)

  return (
    <Card className={cn("bg-card border border-border/50 shadow-sm", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-3">
        <h3 className="text-xs font-medium text-foreground">{title}</h3>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-[11px]">
              <Eye className="w-3 h-3 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem className="text-[11px]">
              <RefreshCw className="w-3 h-3 mr-2" />
              Refresh
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-[11px]">
              <Download className="w-3 h-3 mr-2" />
              Export
            </DropdownMenuItem>
            <DropdownMenuItem className="text-[11px]">
              <Settings className="w-3 h-3 mr-2" />
              Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="space-y-3">
          {displayItems.map((item) => {
            const percentage = (item.value / maxValue) * 100
            const itemMax = item.maxValue || maxValue
            const itemPercentage = showPercentage ? (item.value / itemMax) * 100 : null

            return (
              <div key={item.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {item.avatar && (
                      <Avatar className="h-5 w-5 flex-shrink-0">
                        <AvatarFallback className={cn("text-[9px] font-medium text-white", item.avatar.color)}>
                          {item.avatar.initials}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="min-w-0">
                      <span className="text-[12px] text-foreground truncate block">{item.label}</span>
                      {item.sublabel && (
                        <span className="text-[10px] text-muted-foreground">{item.sublabel}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {showValue && (
                      <span className="text-[12px] font-medium text-foreground">
                        {valuePrefix}{item.value.toLocaleString()}{valueSuffix}
                      </span>
                    )}
                    {itemPercentage !== null && (
                      <span className="text-[11px] text-muted-foreground w-10 text-right">
                        {itemPercentage.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", item.color || "bg-primary")}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        {items.length > maxItems && (
          <button className="mt-3 text-[11px] text-primary hover:underline cursor-pointer">
            View all {items.length} items →
          </button>
        )}
      </CardContent>
    </Card>
  )
}

// Pre-configured variants
export function TopClientsList({
  clients
}: {
  clients: {
    id: string
    name: string
    initials: string
    color: string
    tasksCompleted: number
    totalTasks: number
  }[]
}) {
  const items: ProgressItem[] = clients.map(c => ({
    id: c.id,
    label: c.name,
    value: c.tasksCompleted,
    maxValue: c.totalTasks,
    color: c.color.replace("bg-", "bg-"),
    avatar: {
      initials: c.initials,
      color: c.color,
    },
    sublabel: `${c.totalTasks} total tasks`,
  }))

  return (
    <ProgressList
      title="Client Progress"
      items={items}
      showPercentage
      valueSuffix=" done"
    />
  )
}

export function TopAssigneesList({
  assignees
}: {
  assignees: {
    id: string
    name: string
    initials: string
    color: string
    openTasks: number
  }[]
}) {
  const items: ProgressItem[] = assignees.map(a => ({
    id: a.id,
    label: a.name,
    value: a.openTasks,
    avatar: {
      initials: a.initials,
      color: a.color,
    },
  }))

  return (
    <ProgressList
      title="Open Tasks by Assignee"
      items={items}
      showValue
      valueSuffix=" tasks"
    />
  )
}

export function StageDistributionList({
  stages
}: {
  stages: {
    id: string
    name: string
    count: number
    color: string
  }[]
}) {
  const items: ProgressItem[] = stages.map(s => ({
    id: s.id,
    label: s.name,
    value: s.count,
    color: s.color,
  }))

  return (
    <ProgressList
      title="Clients by Stage"
      items={items}
      showValue
      valueSuffix=" clients"
    />
  )
}
