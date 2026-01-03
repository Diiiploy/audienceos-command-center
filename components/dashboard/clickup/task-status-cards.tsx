"use client"

import { MoreHorizontal } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface StatusCardProps {
  title: string
  value: number
  subtitle: string
}

function StatusCard({ title, value, subtitle }: StatusCardProps) {
  return (
    <Card className="bg-card border border-border/50 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3">
        <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
          <MoreHorizontal className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent className="text-center pb-3 px-3">
        <div className="text-2xl font-semibold text-foreground">{value}</div>
        <div className="text-[11px] text-muted-foreground">{subtitle}</div>
      </CardContent>
    </Card>
  )
}

interface TaskCompletedByUser {
  count: number
  name: string
  initials: string
  color: string
}

interface TaskStatusCardsProps {
  unassigned?: number
  inProgress?: number
  completed?: number
  completedByUser?: TaskCompletedByUser[]
}

export function TaskStatusCards({
  unassigned = 14,
  inProgress = 2,
  completed = 8,
  completedByUser = [
    { count: 5, name: "Unassigned", initials: "U", color: "bg-emerald-500" },
    { count: 3, name: "Alex Smith", initials: "AS", color: "bg-blue-500" },
    { count: 1, name: "John Doe", initials: "JD", color: "bg-purple-500" },
  ],
}: TaskStatusCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
      <StatusCard title="Unassigned" value={unassigned} subtitle="tasks" />
      <StatusCard title="In Progress" value={inProgress} subtitle="tasks in progress" />
      <StatusCard title="Completed" value={completed} subtitle="tasks completed" />

      {/* Tasks Completed By User Card */}
      <Card className="bg-card border border-border/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3">
          <h3 className="text-xs font-medium text-muted-foreground">Tasks Completed...</h3>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="text-[11px] font-medium text-foreground mb-2">Tasks</div>
          <div className="space-y-1.5">
            {completedByUser.map((user, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`w-5 h-5 ${user.color} rounded-full flex items-center justify-center text-white text-[10px] font-medium`}>
                  {user.count}
                </div>
                {user.name !== "Unassigned" && (
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="bg-blue-500 text-white text-[9px]">
                      {user.initials}
                    </AvatarFallback>
                  </Avatar>
                )}
                <span className="text-[11px] text-muted-foreground truncate">{user.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
