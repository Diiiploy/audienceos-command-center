"use client"

import { Filter, Shield, RotateCcw, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ActionBarProps {
  lastRefreshed?: string
  autoRefresh?: boolean
  onRefresh?: () => void
  onToggleAutoRefresh?: () => void
}

export function ActionBar({
  lastRefreshed = "just now",
  autoRefresh = true,
  onRefresh,
  onToggleAutoRefresh,
}: ActionBarProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
          <Filter className="w-4 h-4" />
          Filters
        </Button>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          Hide
        </Button>

        <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground">
          <Shield className="w-4 h-4" />
          Protect view
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-muted-foreground"
          onClick={onRefresh}
        >
          <RotateCcw className="w-4 h-4" />
          Refreshed: {lastRefreshed}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-muted-foreground"
          onClick={onToggleAutoRefresh}
        >
          <Clock className="w-4 h-4" />
          Auto refresh: {autoRefresh ? "On" : "Off"}
        </Button>
      </div>
    </div>
  )
}
