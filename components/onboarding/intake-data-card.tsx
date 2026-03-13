"use client"

import { ExternalLink } from "lucide-react"
import { Card } from "@/components/ui/card"

export interface IntakeDataCardProps {
  responses: Array<{ label: string; value: string; type: string }>
  isLoading?: boolean
}

export function IntakeDataCard({ responses, isLoading = false }: IntakeDataCardProps) {
  if (isLoading) {
    return (
      <Card className="p-6 space-y-4">
        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">
          Onboarding Submission
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-3 bg-secondary/20 border border-border rounded-lg animate-pulse">
              <div className="h-3 w-20 rounded bg-muted mb-2" />
              <div className="h-4 w-40 rounded bg-muted" />
            </div>
          ))}
        </div>
      </Card>
    )
  }

  if (responses.length === 0) {
    return (
      <Card className="p-6">
        <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
          Onboarding Submission
        </h4>
        <p className="text-sm text-muted-foreground">No intake data submitted yet.</p>
      </Card>
    )
  }

  return (
    <Card className="p-6 space-y-4">
      <h4 className="text-sm font-semibold text-foreground uppercase tracking-wide">
        Onboarding Submission
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {responses.map((r) => (
          <div key={r.label} className="p-3 bg-secondary/30 border border-border rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">{r.label}</p>
            {r.type === "url" ? (
              <a
                href={r.value.startsWith("http") ? r.value : `https://${r.value}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-mono text-primary hover:underline flex items-center gap-1 break-all"
              >
                {r.value}
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            ) : (
              <p className="text-sm font-mono text-foreground break-all">{r.value}</p>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
