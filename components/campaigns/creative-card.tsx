"use client"

import type { Creative } from "@/types/creative"
import { CREATIVE_STATUSES, CREATIVE_FORMATS } from "@/types/creative"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface CreativeCardProps {
  creative: Creative
  onClick?: () => void
}

export function CreativeCard({ creative, onClick }: CreativeCardProps) {
  const statusInfo = CREATIVE_STATUSES.find((s) => s.value === creative.status)
  const formatInfo = CREATIVE_FORMATS.find((f) => f.value === creative.format)

  return (
    <Card
      className={cn("transition-colors", onClick && "cursor-pointer hover:border-primary/50")}
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        {/* Top row: title + status badge */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium text-foreground truncate leading-snug">
            {creative.title}
          </h4>
          {statusInfo && (
            <Badge
              variant="outline"
              className={cn("shrink-0 text-[10px] px-1.5 py-0 font-medium", statusInfo.color)}
            >
              {statusInfo.label}
            </Badge>
          )}
        </div>

        {/* Hook preview */}
        {creative.hook && (
          <p className="text-xs text-muted-foreground truncate leading-snug">
            {creative.hook}
          </p>
        )}

        {/* Client name */}
        {creative.client && (
          <p className="text-xs text-muted-foreground/70">{creative.client.name}</p>
        )}

        {/* Format badge + AI badge */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {formatInfo && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
              {formatInfo.label}
            </Badge>
          )}
          {creative.platform && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal capitalize">
              {creative.platform}
            </Badge>
          )}
          {creative.ai_generated && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal gap-1">
              <Sparkles className="w-3 h-3" />
              AI
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
