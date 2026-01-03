"use client"

import { MoreHorizontal, BarChart3, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface ChartDataItem {
  label: string
  value: number
  percentage: number
  color: string
}

interface BarDataItem {
  label: string
  value: number
  color: string
}

interface TaskChartsProps {
  pieData?: ChartDataItem[]
  barData?: BarDataItem[]
}

export function TaskCharts({
  pieData = [
    { label: "Alex Smith", value: 5, percentage: 19.23, color: "#ef4444" },
    { label: "Sam Lee", value: 2, percentage: 7.69, color: "#3b82f6" },
    { label: "Unassigned", value: 19, percentage: 73.07, color: "#6b7280" },
  ],
  barData = [
    { label: "Alex Smith", value: 4, color: "#ef4444" },
    { label: "Sam Lee", value: 5, color: "#f87171" },
    { label: "Unassigned", value: 14, color: "#6b7280" },
  ],
}: TaskChartsProps) {
  // Calculate pie chart segments
  const total = pieData.reduce((sum, item) => sum + item.value, 0)
  let cumulativePercentage = 0

  // Find max value for bar chart scaling
  const maxBarValue = Math.max(...barData.map((d) => d.value))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
      {/* Donut Chart - Total Tasks by Assignee */}
      <Card className="bg-card border border-border/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3">
          <h3 className="text-xs font-medium text-foreground">Total Tasks by Assignee</h3>
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
          <div className="flex items-center justify-center h-48">
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="currentColor"
                  className="text-muted"
                  strokeWidth="8"
                />
                {pieData.map((item, i) => {
                  const circumference = 2 * Math.PI * 40
                  const strokeLength = (item.value / total) * circumference
                  const strokeOffset = (cumulativePercentage / 100) * circumference
                  cumulativePercentage += (item.value / total) * 100

                  return (
                    <circle
                      key={i}
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke={item.color}
                      strokeWidth="8"
                      strokeDasharray={`${strokeLength} ${circumference}`}
                      strokeDashoffset={-strokeOffset}
                    />
                  )
                })}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{total}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 mt-4">
            {pieData.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-muted-foreground truncate">{item.label}</span>
                </div>
                <span className="text-foreground font-medium">{item.percentage.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bar Chart - Open Tasks by Assignee */}
      <Card className="relative bg-card border border-border/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3">
          <h3 className="text-xs font-medium text-foreground">Open Tasks by Assignee</h3>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="text-xs text-muted-foreground mb-2">Tasks</div>
          <div className="h-48 flex items-end justify-around gap-4">
            {barData.map((item, i) => (
              <div key={i} className="flex flex-col items-center flex-1">
                <div
                  className="w-full max-w-[48px] rounded-t transition-all"
                  style={{
                    backgroundColor: item.color,
                    height: `${(item.value / maxBarValue) * 160}px`,
                  }}
                />
                <span className="text-xs text-muted-foreground mt-2 text-center truncate w-full">
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          {/* Y-axis labels */}
          <div className="absolute left-4 top-16 h-48 flex flex-col justify-between text-xs text-muted-foreground pointer-events-none">
            {[16, 12, 8, 4, 0].map((v) => (
              <span key={v}>{v}</span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
