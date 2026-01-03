"use client"

import { MoreHorizontal, TrendingUp, TrendingDown } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SparklinePoint {
  value: number
}

interface MetricCardSparklineProps {
  title: string
  value: string | number
  subtitle?: string
  trend?: "up" | "down" | "stable"
  trendValue?: string
  sparklineData?: SparklinePoint[]
  sparklineColor?: string
  className?: string
}

function Sparkline({
  data,
  color = "#3b82f6",
  width = 80,
  height = 32
}: {
  data: SparklinePoint[]
  color?: string
  width?: number
  height?: number
}) {
  if (!data || data.length < 2) return null

  const values = data.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const points = data.map((point, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((point.value - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(" ")

  // Create area fill path
  const areaPath = `M0,${height} L${points.split(" ").map((p, i) => {
    const [x, y] = p.split(",")
    return `${x},${y}`
  }).join(" L")} L${width},${height} Z`

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Gradient fill */}
      <defs>
        <linearGradient id={`sparkline-gradient-${color.replace("#", "")}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <path
        d={areaPath}
        fill={`url(#sparkline-gradient-${color.replace("#", "")})`}
      />
      {/* Line */}
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      {/* End dot */}
      <circle
        cx={width}
        cy={height - ((values[values.length - 1] - min) / range) * (height - 4) - 2}
        r="2.5"
        fill={color}
      />
    </svg>
  )
}

export function MetricCardSparkline({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  sparklineData,
  sparklineColor = "#3b82f6",
  className,
}: MetricCardSparklineProps) {
  const getTrendColor = () => {
    if (trend === "up") return "text-emerald-600 dark:text-emerald-400"
    if (trend === "down") return "text-red-600 dark:text-red-400"
    return "text-muted-foreground"
  }

  return (
    <Card className={cn("bg-card border border-border/50 shadow-sm", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3">
        <h3 className="text-xs font-medium text-muted-foreground">{title}</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
          <MoreHorizontal className="h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <div className="text-2xl font-semibold text-foreground">{value}</div>
            {subtitle && (
              <div className="text-[11px] text-muted-foreground">{subtitle}</div>
            )}
            {trend && trendValue && (
              <div className={cn("flex items-center gap-1 text-[11px]", getTrendColor())}>
                {trend === "up" ? (
                  <TrendingUp className="h-3 w-3" />
                ) : trend === "down" ? (
                  <TrendingDown className="h-3 w-3" />
                ) : null}
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          {sparklineData && sparklineData.length > 1 && (
            <div className="flex-shrink-0">
              <Sparkline data={sparklineData} color={sparklineColor} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Pre-configured variants for common metrics
export function ClientsMetricCard({
  value,
  trend,
  trendValue,
  sparklineData
}: {
  value: number
  trend?: "up" | "down" | "stable"
  trendValue?: string
  sparklineData?: SparklinePoint[]
}) {
  return (
    <MetricCardSparkline
      title="Active Clients"
      value={value}
      subtitle="total clients"
      trend={trend}
      trendValue={trendValue}
      sparklineData={sparklineData}
      sparklineColor="#10b981"
    />
  )
}

export function RevenueMetricCard({
  value,
  trend,
  trendValue,
  sparklineData
}: {
  value: string
  trend?: "up" | "down" | "stable"
  trendValue?: string
  sparklineData?: SparklinePoint[]
}) {
  return (
    <MetricCardSparkline
      title="Monthly Revenue"
      value={value}
      subtitle="this month"
      trend={trend}
      trendValue={trendValue}
      sparklineData={sparklineData}
      sparklineColor="#3b82f6"
    />
  )
}

export function TicketsMetricCard({
  value,
  trend,
  trendValue,
  sparklineData
}: {
  value: number
  trend?: "up" | "down" | "stable"
  trendValue?: string
  sparklineData?: SparklinePoint[]
}) {
  return (
    <MetricCardSparkline
      title="Open Tickets"
      value={value}
      subtitle="pending resolution"
      trend={trend}
      trendValue={trendValue}
      sparklineData={sparklineData}
      sparklineColor="#f59e0b"
    />
  )
}
