"use client"

import { MoreHorizontal, MoreVertical, Plus, Calendar, ExternalLink, Edit, Trash2, UserPlus, ArrowRight, SortAsc, Filter, EyeOff, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
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
  daysOpen?: number
  blocker?: string | null
}

interface BoardViewProps {
  tasks?: Task[]
  onTaskClick?: (task: Task) => void
  onAddTask?: (status: Task["status"]) => void
}

const defaultTasks: Task[] = [
  {
    id: "TSK-001",
    title: "Complete DNS setup for RTA Outdoor Living",
    status: "in_progress",
    priority: "high",
    assignee: { name: "Brent", initials: "B", color: "bg-emerald-500" },
    client: "RTA Outdoor Living",
    dueDate: "2025-01-03",
    daysOpen: 3,
  },
  {
    id: "TSK-002",
    title: "Review quarterly metrics report",
    status: "todo",
    priority: "medium",
    assignee: { name: "Roderic Andrews", initials: "R", color: "bg-blue-500" },
    client: "Terren",
    dueDate: "2025-01-06",
    daysOpen: 1,
  },
  {
    id: "TSK-003",
    title: "Pixel installation verification",
    status: "in_progress",
    priority: "high",
    assignee: { name: "Trevor", initials: "T", color: "bg-amber-500" },
    client: "Alo Yoga",
    dueDate: "2025-01-07",
    daysOpen: 2,
  },
  {
    id: "TSK-004",
    title: "Prepare launch checklist",
    status: "done",
    priority: "urgent",
    assignee: { name: "Brent", initials: "B", color: "bg-emerald-500" },
    client: "Glow Recipe",
    dueDate: "2025-01-08",
    daysOpen: 0,
  },
  {
    id: "TSK-005",
    title: "Resolve support ticket #4521",
    status: "blocked",
    priority: "high",
    assignee: { name: "Chase", initials: "C", color: "bg-purple-500" },
    client: "Beardbrand",
    dueDate: "2025-01-04",
    daysOpen: 6,
    blocker: "WAITING ON CLIENT",
  },
  {
    id: "TSK-006",
    title: "Monthly performance report",
    status: "todo",
    priority: "medium",
    assignee: { name: "Roderic Andrews", initials: "R", color: "bg-blue-500" },
    client: "MVMT Watches",
    dueDate: "2025-01-10",
    daysOpen: 0,
  },
  {
    id: "TSK-007",
    title: "Client onboarding call",
    status: "todo",
    priority: "medium",
    assignee: { name: "Trevor", initials: "T", color: "bg-amber-500" },
    client: "Ruggable",
    dueDate: "2025-01-05",
    daysOpen: 1,
  },
  {
    id: "TSK-008",
    title: "Data layer audit",
    status: "in_progress",
    priority: "high",
    assignee: { name: "Brent", initials: "B", color: "bg-emerald-500" },
    client: "RTA Outdoor Living",
    dueDate: "2025-01-04",
    daysOpen: 4,
  },
]

const columns: { id: Task["status"]; label: string; color: string }[] = [
  { id: "todo", label: "To Do", color: "bg-gray-500" },
  { id: "in_progress", label: "In Progress", color: "bg-blue-500" },
  { id: "done", label: "Done", color: "bg-emerald-500" },
  { id: "blocked", label: "Blocked", color: "bg-red-500" },
]

// Health/status checkbox matching Pipeline style
function getStatusCheckbox(status: Task["status"]) {
  if (status === "done") {
    return (
      <div className="w-4 h-4 bg-status-green rounded-full flex items-center justify-center">
        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      </div>
    )
  }
  return (
    <div className={cn("w-4 h-4 rounded-full border-2",
      status === "blocked" ? "border-status-red" :
      status === "in_progress" ? "border-primary" :
      "border-border"
    )} />
  )
}

// Status dot color matching Pipeline style
function getStatusDotColor(status: Task["status"]) {
  switch (status) {
    case "done":
      return "bg-status-green"
    case "in_progress":
      return "bg-primary"
    case "blocked":
      return "bg-status-red"
    default:
      return "bg-muted-foreground"
  }
}

function TaskCard({ task, onClick }: { task: Task; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-lg p-3 hover:border-primary/50 transition-colors cursor-pointer group"
    >
      {/* Header row: checkbox, ID, avatar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {getStatusCheckbox(task.status)}
          <span className="text-xs text-muted-foreground font-mono">{task.id}</span>
        </div>
        <div className="flex items-center gap-1">
          {task.assignee && (
            <Avatar className={cn("h-5 w-5", task.assignee.color)}>
              <AvatarFallback className={cn(task.assignee.color, "text-[9px] font-medium text-white")}>
                {task.assignee.initials}
              </AvatarFallback>
            </Avatar>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="w-3 h-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem>
                <ExternalLink className="w-3 h-3 mr-2" />
                Open
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="w-3 h-3 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ArrowRight className="w-3 h-3 mr-2" />
                  Move to
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem>To Do</DropdownMenuItem>
                  <DropdownMenuItem>In Progress</DropdownMenuItem>
                  <DropdownMenuItem>Done</DropdownMenuItem>
                  <DropdownMenuItem>Blocked</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <UserPlus className="w-3 h-3 mr-2" />
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
                <Trash2 className="w-3 h-3 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Title */}
      <h4 className="text-sm text-foreground leading-relaxed mb-3">{task.title}</h4>

      {/* Footer: status dot, days, client */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", getStatusDotColor(task.status))} />
          {task.daysOpen !== undefined && task.daysOpen > 0 && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span className={cn(
                "text-xs",
                task.daysOpen > 4 ? "text-status-red font-medium" : "text-muted-foreground"
              )}>
                {task.daysOpen}d
              </span>
            </div>
          )}
        </div>
        {task.client && (
          <span className="text-[10px] text-muted-foreground">{task.client}</span>
        )}
      </div>

      {/* Blocker tag */}
      {task.blocker && (
        <div className="mt-2">
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] bg-status-red/10 border border-status-red/30 rounded text-status-red">
            {task.blocker}
          </span>
        </div>
      )}
    </div>
  )
}

function BoardColumn({
  column,
  tasks,
  onTaskClick,
  onAddTask,
}: {
  column: typeof columns[0]
  tasks: Task[]
  onTaskClick?: (task: Task) => void
  onAddTask?: () => void
}) {
  return (
    <div className="flex-1 min-w-[280px] max-w-[320px]">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn("w-2 h-2 rounded-full", column.color)} />
          <h3 className="text-sm font-medium text-foreground">{column.label}</h3>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {tasks.length}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <SortAsc className="w-3 h-3 mr-2" />
              Sort by Priority
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Filter className="w-3 h-3 mr-2" />
              Filter
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <EyeOff className="w-3 h-3 mr-2" />
              Hide Column
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="w-3 h-3 mr-2" />
              Column Settings
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} onClick={() => onTaskClick?.(task)} />
        ))}

        {/* Add Card Button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-8 text-xs text-muted-foreground hover:text-foreground justify-start gap-1.5"
          onClick={onAddTask}
        >
          <Plus className="h-3 w-3" />
          Add task
        </Button>
      </div>
    </div>
  )
}

export function BoardView({ tasks = defaultTasks, onTaskClick, onAddTask }: BoardViewProps) {
  const getTasksByStatus = (status: Task["status"]) => tasks.filter(t => t.status === status)

  return (
    <div className="space-y-4">
      {/* Board Container */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <BoardColumn
            key={column.id}
            column={column}
            tasks={getTasksByStatus(column.id)}
            onTaskClick={onTaskClick}
            onAddTask={() => onAddTask?.(column.id)}
          />
        ))}
      </div>
    </div>
  )
}
