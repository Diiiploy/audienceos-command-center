"use client"

import type { Campaign, CampaignPlatform, CampaignType } from "@/types/campaign"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Calendar, Image as ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface CampaignCardProps {
  campaign: Campaign
  onClick: () => void
}

function getPlatformClasses(platform: CampaignPlatform): string {
  switch (platform) {
    case "meta":
      return "bg-blue-500/10 text-blue-600 border-blue-200"
    case "google":
      return "bg-green-500/10 text-green-600 border-green-200"
    case "both":
      return "bg-purple-500/10 text-purple-600 border-purple-200"
  }
}

function getCampaignTypeClasses(type: CampaignType): string {
  switch (type) {
    case "conversion":
      return "border-orange-200 text-orange-600"
    case "traffic":
      return "border-sky-200 text-sky-600"
    case "brand_awareness":
      return "border-violet-200 text-violet-600"
    case "lead_gen":
      return "border-emerald-200 text-emerald-600"
    case "retargeting":
      return "border-amber-200 text-amber-600"
    case "catalog_sales":
      return "border-rose-200 text-rose-600"
  }
}

function formatCampaignType(type: CampaignType): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export function CampaignCard({ campaign, onClick }: CampaignCardProps) {
  const assigneeInitial = campaign.assignee
    ? campaign.assignee.charAt(0).toUpperCase()
    : "?"

  const visualCount = campaign.visuals?.length ?? 0

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-colors group"
      onClick={onClick}
    >
      <CardContent className="p-3 space-y-2">
        {/* Top row: campaign name + platform badge */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium text-foreground truncate leading-snug">
            {campaign.name}
          </h4>
          <Badge
            variant="outline"
            className={cn(
              "shrink-0 text-[10px] px-1.5 py-0 font-medium capitalize",
              getPlatformClasses(campaign.platform)
            )}
          >
            {campaign.platform === "both" ? "Both" : campaign.platform === "meta" ? "Meta" : "Google"}
          </Badge>
        </div>

        {/* Primary hook */}
        {campaign.primary_hook && (
          <p className="text-xs text-muted-foreground truncate leading-snug">
            {campaign.primary_hook}
          </p>
        )}

        {/* Client name */}
        <p className="text-xs text-muted-foreground/70">
          {campaign.client_name}
        </p>

        {/* Campaign type + visuals badge */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-1.5 py-0 font-normal",
              getCampaignTypeClasses(campaign.campaign_type)
            )}
          >
            {formatCampaignType(campaign.campaign_type)}
          </Badge>
          {visualCount > 0 && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 font-normal gap-1"
            >
              <ImageIcon className="w-3 h-3" />
              {visualCount} visual{visualCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* Bottom row: date + assignee */}
        <div className="flex items-center justify-between pt-1">
          {campaign.start_date ? (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span className="text-[11px]">{formatDate(campaign.start_date)}</span>
            </div>
          ) : (
            <span />
          )}
          {campaign.assignee && (
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[10px] font-medium bg-muted">
                {assigneeInitial}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
