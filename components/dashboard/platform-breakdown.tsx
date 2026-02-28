"use client"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import type { AdPerformanceSummary } from "@/lib/services/dashboard-queries"

interface PlatformBreakdownProps {
  data: AdPerformanceSummary
  className?: string
}

const platformLabels: Record<string, string> = {
  google_ads: "Google Ads",
  meta_ads: "Meta Ads",
}

const platformColors: Record<string, string> = {
  google_ads: "bg-blue-500",
  meta_ads: "bg-indigo-500",
}

function formatCurrency(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`
  }
  return `$${value.toFixed(2)}`
}

export function PlatformBreakdown({ data, className }: PlatformBreakdownProps) {
  const platforms = Object.entries(data.platforms)

  if (platforms.length === 0) {
    return (
      <div className={cn("bg-card border border-border rounded-lg p-4", className)}>
        <h3 className="text-sm font-medium text-foreground mb-2">Platform Breakdown</h3>
        <p className="text-sm text-muted-foreground">No platform data available</p>
      </div>
    )
  }

  const totalSpend = data.totalSpend || 1 // Prevent division by zero

  return (
    <div className={cn("bg-card border border-border rounded-lg p-4", className)}>
      <h3 className="text-sm font-medium text-foreground mb-4">Platform Breakdown</h3>
      <div className="space-y-4">
        {platforms.map(([platform, metrics]) => {
          const share = (metrics.spend / totalSpend) * 100
          const ctr = metrics.impressions > 0
            ? ((metrics.clicks / metrics.impressions) * 100).toFixed(2)
            : '0.00'

          return (
            <div key={platform}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "w-2.5 h-2.5 rounded-full",
                    platformColors[platform] || "bg-zinc-500"
                  )} />
                  <span className="text-sm font-medium text-foreground">
                    {platformLabels[platform] || platform}
                  </span>
                </div>
                <span className="text-sm font-medium text-foreground">
                  {formatCurrency(metrics.spend)}
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-2 bg-muted rounded-full overflow-hidden mb-1.5">
                <div
                  className={cn(
                    "h-full rounded-full transition-all",
                    platformColors[platform] || "bg-zinc-500"
                  )}
                  style={{ width: `${Math.max(share, 2)}%` }}
                />
              </div>
              {/* Metrics row */}
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>{metrics.impressions.toLocaleString()} impressions</span>
                <span>{metrics.clicks.toLocaleString()} clicks</span>
                <span>{ctr}% CTR</span>
                <span>{metrics.conversions.toLocaleString()} conversions</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function PlatformBreakdownSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <Skeleton className="h-4 w-36 mb-4" />
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i}>
            <div className="flex items-center justify-between mb-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-2 w-full rounded-full mb-1.5" />
            <Skeleton className="h-3 w-48" />
          </div>
        ))}
      </div>
    </div>
  )
}
