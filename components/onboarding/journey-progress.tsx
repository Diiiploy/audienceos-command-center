"use client"

import { useState } from "react"
import { CheckCircle2, Play, AlertTriangle, Circle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Stage } from "@/stores/onboarding-store"

export interface JourneyProgressProps {
  stages: Stage[]
  stageStatusMap: Map<string, string>
  onToggleStatus: (stageId: string) => Promise<void>
  isLoading?: boolean
  readOnly?: boolean
  className?: string
}

export function JourneyProgress({
  stages,
  stageStatusMap,
  onToggleStatus,
  isLoading = false,
  readOnly = false,
  className,
}: JourneyProgressProps) {
  const [togglingStageId, setTogglingStageId] = useState<string | null>(null)

  const handleToggle = async (stageId: string) => {
    if (readOnly || togglingStageId) return
    setTogglingStageId(stageId)
    try {
      await onToggleStatus(stageId)
    } finally {
      setTogglingStageId(null)
    }
  }

  if (isLoading) {
    return (
      <div className={cn("space-y-3", className)}>
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Journey Progress
        </h4>
        <div className="space-y-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary/20 animate-pulse"
            >
              <div className="w-4 h-4 rounded-full bg-muted" />
              <div className="h-4 w-32 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (stages.length === 0) {
    return (
      <div className={cn("space-y-3", className)}>
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Journey Progress
        </h4>
        <p className="text-sm text-muted-foreground">
          No onboarding journey started for this client.
        </p>
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Journey Progress
        </h4>
        {!readOnly && (
          <p className="text-xs text-muted-foreground">Click to toggle completion status</p>
        )}
      </div>
      <div className="space-y-1">
        {stages.map((s) => {
          const status = stageStatusMap.get(s.id) || "pending"
          const isCompleted = status === "completed"
          const isInProgress = status === "in_progress"
          const isBlocked = status === "blocked"
          const isToggling = togglingStageId === s.id

          return (
            <button
              key={s.id}
              onClick={() => handleToggle(s.id)}
              disabled={readOnly || isToggling}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                !readOnly && "cursor-pointer hover:ring-2 hover:ring-primary/30",
                readOnly && "cursor-default",
                isCompleted && "bg-emerald-500/5",
                isInProgress && "bg-blue-500/5",
                isBlocked && "bg-red-500/5",
                !isCompleted && !isInProgress && !isBlocked && "bg-secondary/30",
                isToggling && "opacity-60"
              )}
            >
              {isToggling ? (
                <Loader2 className="w-4 h-4 text-muted-foreground shrink-0 animate-spin" />
              ) : isCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : isInProgress ? (
                <Play className="w-4 h-4 text-blue-500 shrink-0" />
              ) : isBlocked ? (
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <span
                className={cn(
                  "text-sm text-left flex-1",
                  isCompleted && "line-through text-muted-foreground"
                )}
              >
                {s.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
