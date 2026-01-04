"use client"

import { useState } from "react"
import { MoreHorizontal, CheckCircle2, Circle, Clock, AlertCircle, Download, RefreshCw, Settings, Eye } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

interface Task {
  id: string
  title: string
  status: "todo" | "in_progress" | "done" | "blocked"
  priority: "low" | "medium" | "high" | "urgent"
  assignee?: {
    name: string
    initials: string
    color: string
  }
  client?: string
  dueDate?: string
  tags?: string[]
}

interface ListViewProps {
  tasks?: Task[]
  onTaskClick?: (task: Task) => void
  onTaskStatusChange?: (taskId: string, status: Task["status"]) => void
}

const defaultTasks: Task[] = [
  {
    id: "1",
    title: "Complete DNS setup for RTA Outdoor Living",
    status: "in_progress",
    priority: "high",
    assignee: { name: "Luke Thompson", initials: "LT", color: "bg-emerald-500" },
    client: "RTA Outdoor Living",
    dueDate: "2025-01-03",
    tags: ["Installation", "Technical"],
  },
  {
    id: "2",
    title: "Review quarterly metrics report",
    status: "todo",
    priority: "medium",
    assignee: { name: "Alex Smith", initials: "AS", color: "bg-blue-500" },
    client: "Terren",
    dueDate: "2025-01-06",
    tags: ["Review"],
  },
  {
    id: "3",
    title: "Pixel installation verification",
    status: "in_progress",
    priority: "high",
    assignee: { name: "Jordan Fields", initials: "JF", color: "bg-purple-500" },
    client: "Alo Yoga",
    dueDate: "2025-01-07",
    tags: ["Technical", "Verification"],
  },
  {
    id: "4",
    title: "Prepare launch checklist",
    status: "done",
    priority: "urgent",
    assignee: { name: "Luke Thompson", initials: "LT", color: "bg-emerald-500" },
    client: "Glow Recipe",
    dueDate: "2025-01-08",
    tags: ["Launch"],
  },
  {
    id: "5",
    title: "Resolve support ticket #4521",
    status: "blocked",
    priority: "high",
    assignee: { name: "Sam Lee", initials: "SL", color: "bg-amber-500" },
    client: "Beardbrand",
    dueDate: "2025-01-04",
    tags: ["Support", "Urgent"],
  },
  {
    id: "6",
    title: "Monthly performance report",
    status: "todo",
    priority: "medium",
    assignee: { name: "Alex Smith", initials: "AS", color: "bg-blue-500" },
    client: "MVMT Watches",
    dueDate: "2025-01-10",
    tags: ["Report"],
  },
  {
    id: "7",
    title: "Client onboarding call",
    status: "todo",
    priority: "medium",
    assignee: { name: "Jordan Fields", initials: "JF", color: "bg-purple-500" },
    client: "Ruggable",
    dueDate: "2025-01-05",
    tags: ["Onboarding", "Meeting"],
  },
  {
    id: "8",
    title: "Data layer audit",
    status: "in_progress",
    priority: "high",
    assignee: { name: "Luke Thompson", initials: "LT", color: "bg-emerald-500" },
    client: "V Shred",
    dueDate: "2025-01-04",
    tags: ["Audit", "Technical"],
  },
]

function getStatusIcon(status: Task["status"]) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
    case "in_progress":
      return <Clock className="h-4 w-4 text-blue-500" />
    case "blocked":
      return <AlertCircle className="h-4 w-4 text-red-500" />
    default:
      return <Circle className="h-4 w-4 text-muted-foreground" />
  }
}

function getPriorityBadge(priority: Task["priority"]) {
  switch (priority) {
    case "urgent":
      return { label: "Urgent", class: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" }
    case "high":
      return { label: "High", class: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" }
    case "medium":
      return { label: "Medium", class: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" }
    case "low":
      return { label: "Low", class: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400" }
  }
}

function getStatusBadge(status: Task["status"]) {
  switch (status) {
    case "done":
      return { label: "Done", class: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" }
    case "in_progress":
      return { label: "In Progress", class: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" }
    case "blocked":
      return { label: "Blocked", class: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" }
    default:
      return { label: "To Do", class: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400" }
  }
}

function TaskRow({ task, onClick }: { task: Task; onClick?: () => void }) {
  const priorityBadge = getPriorityBadge(task.priority)
  const statusBadge = getStatusBadge(task.status)

  return (
    <div
      className="flex items-center gap-3 px-3 py-2.5 border-b border-border last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      {/* Status Icon */}
      <div className="flex-shrink-0">
        {getStatusIcon(task.status)}
      </div>

      {/* Task Title & Client */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">{task.title}</div>
        {task.client && (
          <div className="text-xs text-muted-foreground">{task.client}</div>
        )}
      </div>

      {/* Tags */}
      <div className="hidden md:flex items-center gap-1 flex-shrink-0">
        {task.tags?.slice(0, 2).map((tag, i) => (
          <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0 font-normal">
            {tag}
          </Badge>
        ))}
      </div>

      {/* Status Badge */}
      <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 flex-shrink-0", statusBadge.class)}>
        {statusBadge.label}
      </Badge>

      {/* Priority Badge */}
      <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0 flex-shrink-0", priorityBadge.class)}>
        {priorityBadge.label}
      </Badge>

      {/* Assignee */}
      {task.assignee && (
        <Avatar className={cn("h-6 w-6 flex-shrink-0", task.assignee.color)}>
          <AvatarFallback className={cn(task.assignee.color, "text-[9px] font-medium text-white")}>
            {task.assignee.initials}
          </AvatarFallback>
        </Avatar>
      )}

      {/* Due Date */}
      {task.dueDate && (
        <span className="text-xs text-muted-foreground flex-shrink-0 w-16 text-right">
          {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </span>
      )}
    </div>
  )
}

export function ListView({ tasks = defaultTasks, onTaskClick }: ListViewProps) {
  const [filter, setFilter] = useState<Task["status"] | "all">("all")

  const filteredTasks = filter === "all" ? tasks : tasks.filter(t => t.status === filter)

  const statusCounts = {
    all: tasks.length,
    todo: tasks.filter(t => t.status === "todo").length,
    in_progress: tasks.filter(t => t.status === "in_progress").length,
    done: tasks.filter(t => t.status === "done").length,
    blocked: tasks.filter(t => t.status === "blocked").length,
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex items-center gap-1">
        {[
          { key: "all", label: "All" },
          { key: "todo", label: "To Do" },
          { key: "in_progress", label: "In Progress" },
          { key: "done", label: "Done" },
          { key: "blocked", label: "Blocked" },
        ].map(({ key, label }) => (
          <Button
            key={key}
            variant={filter === key ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs gap-1.5"
            onClick={() => setFilter(key as typeof filter)}
          >
            {label}
            <span className="text-muted-foreground">
              ({statusCounts[key as keyof typeof statusCounts]})
            </span>
          </Button>
        ))}
      </div>

      {/* Task List */}
      <Card className="bg-card border border-border/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-0 pt-3 px-3">
          <h3 className="text-xs font-medium text-foreground">
            {filteredTasks.length} Tasks
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-[11px]">
                <Eye className="w-3 h-3 mr-2" />
                View All
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
        <CardContent className="p-0 mt-2">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onClick={() => onTaskClick?.(task)}
              />
            ))
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">
              No tasks found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
