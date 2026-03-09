"use client"

import { useState } from "react"
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
  periodLabel?: string
}

export function AdSpendChart({ data, className, periodLabel }: AdSpendChartProps) {
  const [visibleMetrics, setVisibleMetrics] = useState<Set<string>>(new Set(["spend", "clicks"]))

  const chartData = data.dailyTrend.map((point) => ({
    ...point,
    formattedDate: format(new Date(point.date), "MMM dd"),
  }))

  if (chartData.length === 0) {
    return (
      <div className={cn("bg-card border border-border rounded-lg p-6", className)}>
        <h3 className="text-sm font-medium text-foreground mb-2">Ad Spend Trend ({periodLabel || "30 Days"})</h3>
        <p className="text-sm text-muted-foreground">No spend data available yet</p>
      </div>
    )
  }

  return (
    <div className={cn("bg-card border border-border rounded-lg p-4", className)}>
      <h3 className="text-sm font-medium text-foreground mb-4">Ad Spend Trend ({periodLabel || "30 Days"})</h3>
      <div className="flex gap-1 mb-3">
        {[
          { key: "spend", label: "Spend", color: "oklch(0.65 0.15 250)" },
          { key: "clicks", label: "Clicks", color: "oklch(0.72 0.17 162)" },
          { key: "conversions", label: "Conversions", color: "oklch(0.75 0.15 50)" },
          { key: "impressions", label: "Impressions", color: "oklch(0.65 0.12 300)" },
        ].map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setVisibleMetrics(prev => {
              const next = new Set(prev)
              if (next.has(key)) {
                if (next.size > 1) next.delete(key)
              } else {
                next.add(key)
              }
              return next
            })}
            className={cn(
              "px-2.5 py-1 rounded text-xs font-medium transition-colors border",
              visibleMetrics.has(key)
                ? "border-transparent text-white"
                : "border-border text-muted-foreground bg-transparent hover:bg-muted"
            )}
            style={visibleMetrics.has(key) ? { backgroundColor: color } : undefined}
          >
            {label}
          </button>
        ))}
      </div>
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
              <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.75 0.15 50)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="oklch(0.75 0.15 50)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(0.65 0.12 300)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="oklch(0.65 0.12 300)" stopOpacity={0} />
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
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  spend: "Spend",
                  clicks: "Clicks",
                  conversions: "Conversions",
                  impressions: "Impressions",
                }
                const formatted = name === "spend"
                  ? `$${value.toFixed(2)}`
                  : value.toLocaleString()
                return [formatted, labels[name] || name]
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: "12px" }}
              formatter={(value) => {
                const labels: Record<string, string> = {
                  spend: "Spend",
                  clicks: "Clicks",
                  conversions: "Conversions",
                  impressions: "Impressions",
                }
                return <span style={{ color: "#999" }}>{labels[value] || value}</span>
              }}
            />
            {visibleMetrics.has("spend") && (
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
            )}
            {visibleMetrics.has("clicks") && (
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
            )}
            {visibleMetrics.has("conversions") && (
              <Area
                type="monotone"
                dataKey="conversions"
                name="conversions"
                stroke="oklch(0.75 0.15 50)"
                fillOpacity={1}
                fill="url(#colorConversions)"
                strokeWidth={2}
                yAxisId="right"
              />
            )}
            {visibleMetrics.has("impressions") && (
              <Area
                type="monotone"
                dataKey="impressions"
                name="impressions"
                stroke="oklch(0.65 0.12 300)"
                fillOpacity={1}
                fill="url(#colorImpressions)"
                strokeWidth={2}
                yAxisId="right"
              />
            )}
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
