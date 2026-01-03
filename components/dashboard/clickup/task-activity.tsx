"use client"

import { MoreHorizontal, Calculator, BarChart3, CheckCircle } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface StatusCount {
  status: string
  current: number
  total: number
  color: string
}

interface ActivityItem {
  id: string
  title: string
  time: string
  action: string
  fromStatus?: string
  toStatus?: string
}

interface TaskActivityProps {
  statusCounts?: StatusCount[]
  activities?: ActivityItem[]
}

export function TaskActivity({
  statusCounts = [
    { status: "Open", current: 2, total: 5, color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400" },
    { status: "In Progress", current: 5, total: 5, color: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400" },
  ],
  activities = [
    {
      id: "1",
      title: "Task 1",
      time: "1 hour ago",
      action: "changed status",
      fromStatus: "Open",
      toStatus: "Closed",
    },
  ],
}: TaskActivityProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
      {/* Load by Status */}
      <Card className="bg-card border border-border/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3">
          <h3 className="text-xs font-medium text-foreground">Load by Status</h3>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
              <BarChart3 className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {statusCounts.map((item, i) => (
              <Badge key={i} variant="secondary" className={item.color}>
                {item.current}/{item.total}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Latest Activity */}
      <Card className="bg-card border border-border/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3">
          <h3 className="text-xs font-medium text-foreground">Latest Activity</h3>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
              <Calculator className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="text-sm font-medium text-foreground mb-3">Today</div>
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white mt-0.5">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-primary font-medium">{activity.title}</span>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    You {activity.action} from{" "}
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400">
                      {activity.fromStatus}
                    </Badge>{" "}
                    to{" "}
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400">
                      {activity.toStatus}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
