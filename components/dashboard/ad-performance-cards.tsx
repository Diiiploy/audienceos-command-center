"use client"

import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, DollarSign, Eye, MousePointerClick, Target } from "lucide-react"
import type { AdPerformanceSummary } from "@/lib/services/dashboard-queries"

interface AdPerformanceCardsProps {
  data: AdPerformanceSummary
  className?: string
}

function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`
  }
  return `$${value.toFixed(2)}`
}

function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`
  }
  return value.toLocaleString()
}

function calculateChange(current: number, previous: number): { percent: number; direction: 'up' | 'down' | 'stable' } {
  if (previous === 0) {
    return { percent: current > 0 ? 100 : 0, direction: current > 0 ? 'up' : 'stable' }
  }
  const percent = Math.round(((current - previous) / previous) * 100)
  return {
    percent: Math.abs(percent),
    direction: percent > 0 ? 'up' : percent < 0 ? 'down' : 'stable',
  }
}

interface MetricCardProps {
  label: string
  value: string
  change: { percent: number; direction: 'up' | 'down' | 'stable' }
  icon: typeof DollarSign
  /** Whether "up" is good (true) or bad (false, e.g. for CPC where lower is better) */
  upIsGood?: boolean
}

function MetricCard({ label, value, change, icon: Icon, upIsGood = true }: MetricCardProps) {
  const isPositive = upIsGood ? change.direction === 'up' : change.direction === 'down'
  const isNeutral = change.direction === 'stable'
  const TrendIcon = change.direction === 'up' ? TrendingUp : TrendingDown

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground mt-1">{label}</p>
          {change.percent > 0 && !isNeutral && (
            <div className={cn(
              "flex items-center gap-1 mt-2 text-xs",
              isPositive ? "text-emerald-500" : "text-rose-500"
            )}>
              <TrendIcon className="w-3 h-3" />
              <span>{change.direction === 'up' ? '+' : '-'}{change.percent}% vs prev period</span>
            </div>
          )}
          {(change.percent === 0 || isNeutral) && (
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <span>No change</span>
            </div>
          )}
        </div>
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
    </div>
  )
}

export function AdPerformanceCards({ data, className }: AdPerformanceCardsProps) {
  const prev = data.previousPeriod

  const spendChange = calculateChange(data.totalSpend, prev.totalSpend)
  const impressionsChange = calculateChange(data.totalImpressions, prev.totalImpressions)
  const ctrChange = calculateChange(data.ctr, prev.totalImpressions > 0
    ? (prev.totalClicks / prev.totalImpressions) * 100
    : 0)
  const cpcChange = calculateChange(data.cpc, prev.totalClicks > 0
    ? prev.totalSpend / prev.totalClicks
    : 0)

  return (
    <div className={cn("grid grid-cols-4 gap-3", className)}>
      <MetricCard
        label="Total Ad Spend"
        value={formatCurrency(data.totalSpend)}
        change={spendChange}
        icon={DollarSign}
        upIsGood={false}
      />
      <MetricCard
        label="Impressions"
        value={formatNumber(data.totalImpressions)}
        change={impressionsChange}
        icon={Eye}
      />
      <MetricCard
        label="CTR"
        value={`${data.ctr.toFixed(2)}%`}
        change={ctrChange}
        icon={MousePointerClick}
      />
      <MetricCard
        label="CPC"
        value={formatCurrency(data.cpc)}
        change={cpcChange}
        icon={Target}
        upIsGood={false}
      />
    </div>
  )
}

export function AdPerformanceCardsSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-lg p-5 animate-pulse">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="h-8 w-20 bg-muted rounded" />
              <div className="h-4 w-24 bg-muted rounded mt-2" />
              <div className="h-3 w-28 bg-muted rounded mt-2" />
            </div>
            <div className="w-9 h-9 bg-muted rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}
