"use client"

import { format } from "date-fns"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { AdPerformanceSummary } from "@/lib/services/dashboard-queries"

interface AdSpendChartProps {
  data: AdPerformanceSummary
  className?: string
}

export function AdSpendChart({ data, className }: AdSpendChartProps) {
  const chartData = data.dailyTrend.map((point) => ({
    ...point,
    formattedDate: format(new Date(point.date), "MMM dd"),
  }))

  if (chartData.length === 0) {
    return (
      <div className={cn("bg-card border border-border rounded-lg p-6", className)}>
        <h3 className="text-sm font-medium text-foreground mb-2">Ad Spend Trend</h3>
        <p className="text-sm text-muted-foreground">No spend data available yet</p>
      </div>
    )
  }

  return (
    <div className={cn("bg-card border border-border rounded-lg p-4", className)}>
      <h3 className="text-sm font-medium text-foreground mb-4">Ad Spend Trend (30 Days)</h3>
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.65 0.15 250)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="oklch(0.65 0.15 250)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.72 0.17 162)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="oklch(0.72 0.17 162)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#666"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
            />
            <XAxis
              dataKey="formattedDate"
              stroke="#666"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="left"
              stroke="#666"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "oklch(0.16 0.005 260)",
                border: "1px solid oklch(0.28 0.005 260)",
                borderRadius: "8px",
                color: "#fff",
              }}
              labelStyle={{ color: "#999" }}
              formatter={(value: number, name: string) => [
                name === "spend" ? `$${value.toFixed(2)}` : value.toLocaleString(),
                name === "spend" ? "Spend" : "Clicks",
              ]}
            />
            <Legend
              wrapperStyle={{ paddingTop: "12px" }}
              formatter={(value) => (
                <span style={{ color: "#999" }}>
                  {value === "spend" ? "Spend" : "Clicks"}
                </span>
              )}
            />
            <Area
              type="monotone"
              dataKey="spend"
              name="spend"
              stroke="oklch(0.65 0.15 250)"
              fillOpacity={1}
              fill="url(#colorSpend)"
              strokeWidth={2}
              yAxisId="left"
            />
            <Area
              type="monotone"
              dataKey="clicks"
              name="clicks"
              stroke="oklch(0.72 0.17 162)"
              fillOpacity={1}
              fill="url(#colorClicks)"
              strokeWidth={2}
              yAxisId="right"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function AdSpendChartSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <Skeleton className="h-4 w-40 mb-4" />
      <Skeleton className="h-[240px] w-full" />
    </div>
  )
}
