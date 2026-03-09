"use client"

import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, DollarSign, Eye, MousePointerClick, Target, MousePointer2, Zap, Percent, CircleDollarSign } from "lucide-react"
import type { AdPerformanceSummary } from "@/lib/services/dashboard-queries"

interface AdPerformanceCardsProps {
  data: AdPerformanceSummary
  compareEnabled?: boolean
  compareLabel?: string
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
  previousValue?: string
  change: { percent: number; direction: 'up' | 'down' | 'stable' }
  icon: typeof DollarSign
  /** Whether "up" is good (true) or bad (false, e.g. for CPC where lower is better) */
  upIsGood?: boolean
  compareEnabled?: boolean
  compareLabel?: string
}

function MetricCard({ label, value, previousValue, change, icon: Icon, upIsGood = true, compareEnabled, compareLabel }: MetricCardProps) {
  const isPositive = upIsGood ? change.direction === 'up' : change.direction === 'down'
  const isNeutral = change.direction === 'stable'
  const TrendIcon = change.direction === 'up' ? TrendingUp : TrendingDown
  const shortLabel = compareLabel || "vs prev period"

  return (
    <div className="bg-card border border-border rounded-lg p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground mt-1">{label}</p>
          {change.percent > 0 && !isNeutral ? (
            <div className={cn(
              "flex items-center gap-1 mt-2 text-xs",
              isPositive ? "text-emerald-500" : "text-rose-500"
            )}>
              <TrendIcon className="w-3 h-3" />
              <span>{change.direction === 'up' ? '+' : '-'}{change.percent}%</span>
              {compareEnabled && previousValue && (
                <span className="text-muted-foreground ml-0.5">from {previousValue}</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              <span>No change</span>
            </div>
          )}
          {compareEnabled && (
            <p className="text-[10px] text-muted-foreground mt-1">{shortLabel}</p>
          )}
        </div>
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
    </div>
  )
}

export function AdPerformanceCards({ data, compareEnabled, compareLabel, className }: AdPerformanceCardsProps) {
  const prev = data.previousPeriod

  const spendChange = calculateChange(data.totalSpend, prev.totalSpend)
  const impressionsChange = calculateChange(data.totalImpressions, prev.totalImpressions)
  const ctrChange = calculateChange(data.ctr, prev.totalImpressions > 0
    ? (prev.totalClicks / prev.totalImpressions) * 100
    : 0)
  const cpcChange = calculateChange(data.cpc, prev.totalClicks > 0
    ? prev.totalSpend / prev.totalClicks
    : 0)
  const clicksChange = calculateChange(data.totalClicks, prev.totalClicks)
  const conversionsChange = calculateChange(data.totalConversions, prev.totalConversions)
  const cvrChange = calculateChange(data.conversionRate, prev.conversionRate ?? 0)
  const cpaChange = calculateChange(data.cpa, prev.cpa ?? 0)

  const shared = { compareEnabled, compareLabel }

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-3", className)}>
      <MetricCard
        label="Total Ad Spend"
        value={formatCurrency(data.totalSpend)}
        previousValue={formatCurrency(prev.totalSpend)}
        change={spendChange}
        icon={DollarSign}
        upIsGood={false}
        {...shared}
      />
      <MetricCard
        label="Impressions"
        value={formatNumber(data.totalImpressions)}
        previousValue={formatNumber(prev.totalImpressions)}
        change={impressionsChange}
        icon={Eye}
        {...shared}
      />
      <MetricCard
        label="CTR"
        value={`${data.ctr.toFixed(2)}%`}
        previousValue={`${(prev.totalImpressions > 0 ? (prev.totalClicks / prev.totalImpressions) * 100 : 0).toFixed(2)}%`}
        change={ctrChange}
        icon={MousePointerClick}
        {...shared}
      />
      <MetricCard
        label="CPC"
        value={formatCurrency(data.cpc)}
        previousValue={formatCurrency(prev.totalClicks > 0 ? prev.totalSpend / prev.totalClicks : 0)}
        change={cpcChange}
        icon={Target}
        upIsGood={false}
        {...shared}
      />
      {/* Row 2 */}
      <MetricCard
        label="Clicks"
        value={formatNumber(data.totalClicks)}
        previousValue={formatNumber(prev.totalClicks)}
        change={clicksChange}
        icon={MousePointer2}
        {...shared}
      />
      <MetricCard
        label="Conversions"
        value={formatNumber(data.totalConversions)}
        previousValue={formatNumber(prev.totalConversions)}
        change={conversionsChange}
        icon={Zap}
        {...shared}
      />
      <MetricCard
        label="CVR"
        value={`${data.conversionRate.toFixed(2)}%`}
        previousValue={`${(prev.conversionRate ?? 0).toFixed(2)}%`}
        change={cvrChange}
        icon={Percent}
        {...shared}
      />
      <MetricCard
        label="CPA"
        value={formatCurrency(data.cpa)}
        previousValue={formatCurrency(prev.cpa ?? 0)}
        change={cpaChange}
        icon={CircleDollarSign}
        upIsGood={false}
        {...shared}
      />
    </div>
  )
}

export function AdPerformanceCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
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
