"use client"

import type { Campaign, CampaignPlatform, CampaignType } from "@/types/campaign"
import { CAMPAIGN_TYPES, CAMPAIGN_PLATFORMS } from "@/types/campaign"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Calendar, Target, Palette, BarChart3, Image as ImageIcon, FileText, Sparkles, Copy, DollarSign, Eye, MousePointerClick, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface CampaignDetailProps {
  campaign: Campaign | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

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

function getPlatformLabel(platform: CampaignPlatform): string {
  const found = CAMPAIGN_PLATFORMS.find((p) => p.value === platform)
  return found?.label ?? platform
}

function getCampaignTypeLabel(type: CampaignType): string {
  const found = CAMPAIGN_TYPES.find((t) => t.value === type)
  return found?.label ?? type
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

function getStatusClasses(status: string): string {
  switch (status) {
    case "concept":
      return "bg-slate-500/10 text-slate-600 border-slate-200"
    case "setup":
      return "bg-blue-500/10 text-blue-600 border-blue-200"
    case "in_review":
      return "bg-amber-500/10 text-amber-600 border-amber-200"
    case "live":
      return "bg-green-500/10 text-green-600 border-green-200"
    case "optimization":
      return "bg-orange-500/10 text-orange-600 border-orange-200"
    case "completed":
      return "bg-gray-500/10 text-gray-600 border-gray-200"
    case "paused":
      return "bg-red-500/10 text-red-600 border-red-200"
    default:
      return "bg-slate-500/10 text-slate-600 border-slate-200"
  }
}

function formatStatusLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatBudget(budget: number | null, budgetType: "daily" | "lifetime" | null): string {
  if (budget === null) return "Not set"
  const formatted = budget.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
  if (budgetType === "daily") return `${formatted}/day`
  if (budgetType === "lifetime") return `${formatted} lifetime`
  return formatted
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  )
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-xl font-semibold text-foreground">{value}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function CampaignDetail({ campaign, open, onOpenChange }: CampaignDetailProps) {
  if (!campaign) return null

  const assigneeInitial = campaign.assignee
    ? campaign.assignee.charAt(0).toUpperCase()
    : null

  const hasPerformanceData =
    campaign.status === "live" ||
    campaign.status === "optimization" ||
    campaign.status === "completed"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col gap-0 p-0">
        {/* ---------------------------------------------------------------- */}
        {/* Header                                                          */}
        {/* ---------------------------------------------------------------- */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 min-w-0">
              <DialogTitle className="text-xl leading-tight">
                {campaign.name}
              </DialogTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">
                  {campaign.client_name}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0 font-medium",
                    getPlatformClasses(campaign.platform)
                  )}
                >
                  {getPlatformLabel(campaign.platform)}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0 font-normal",
                    getCampaignTypeClasses(campaign.campaign_type)
                  )}
                >
                  {getCampaignTypeLabel(campaign.campaign_type)}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-1.5 py-0 font-medium",
                    getStatusClasses(campaign.status)
                  )}
                >
                  {formatStatusLabel(campaign.status)}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {campaign.start_date && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-xs whitespace-nowrap">
                    {formatDate(campaign.start_date)}
                    {campaign.end_date
                      ? ` - ${formatDate(campaign.end_date)}`
                      : " - Ongoing"}
                  </span>
                </div>
              )}
              {assigneeInitial && (
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-xs font-medium bg-muted">
                    {assigneeInitial}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* ---------------------------------------------------------------- */}
        {/* Tabs                                                            */}
        {/* ---------------------------------------------------------------- */}
        <Tabs defaultValue="strategy" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="mx-6 mt-4 mb-0 w-fit">
            <TabsTrigger value="strategy" className="gap-1.5 text-xs">
              <Target className="w-3.5 h-3.5" />
              Strategy
            </TabsTrigger>
            <TabsTrigger value="creative" className="gap-1.5 text-xs">
              <Palette className="w-3.5 h-3.5" />
              Creative & Copy
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-1.5 text-xs">
              <BarChart3 className="w-3.5 h-3.5" />
              Performance
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {/* -------------------------------------------------------------- */}
            {/* Strategy Tab                                                   */}
            {/* -------------------------------------------------------------- */}
            <TabsContent value="strategy" className="mt-4 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                <div className="sm:col-span-2">
                  <FieldRow label="Primary Hook">
                    <p className="text-base font-medium leading-snug">
                      {campaign.primary_hook ?? (
                        <span className="text-muted-foreground italic">Not set</span>
                      )}
                    </p>
                  </FieldRow>
                </div>

                <FieldRow label="Primary Angle">
                  {campaign.primary_angle ?? (
                    <span className="text-muted-foreground italic">Not set</span>
                  )}
                </FieldRow>

                <FieldRow label="Target Audience">
                  {campaign.target_audience ?? (
                    <span className="text-muted-foreground italic">Not set</span>
                  )}
                </FieldRow>

                <FieldRow label="Budget">
                  {formatBudget(campaign.budget, campaign.budget_type)}
                </FieldRow>

                <FieldRow label="Schedule">
                  {campaign.start_date ? (
                    <>
                      {formatDate(campaign.start_date)}
                      {campaign.end_date
                        ? ` to ${formatDate(campaign.end_date)}`
                        : " - Ongoing"}
                    </>
                  ) : (
                    <span className="text-muted-foreground italic">Not scheduled</span>
                  )}
                </FieldRow>
              </div>

              {campaign.notes && (
                <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Notes
                  </p>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {campaign.notes}
                  </p>
                </div>
              )}
            </TabsContent>

            {/* -------------------------------------------------------------- */}
            {/* Creative & Copy Tab                                            */}
            {/* -------------------------------------------------------------- */}
            <TabsContent value="creative" className="mt-4 space-y-8">
              {/* Visuals section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Visuals</h3>
                  <Button variant="outline" size="sm" disabled className="text-xs gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    Upload Visual
                  </Button>
                </div>

                {campaign.visuals.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {campaign.visuals.map((visual) => (
                      <div
                        key={visual.id}
                        className="rounded-lg border border-border p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-foreground truncate">
                            {visual.file_name}
                          </p>
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 font-normal shrink-0 capitalize"
                          >
                            {visual.file_type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 font-normal capitalize"
                          >
                            {visual.placement}
                          </Badge>
                          {visual.dimensions && (
                            <span className="text-[11px] text-muted-foreground">
                              {visual.dimensions}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No visuals uploaded yet
                    </p>
                  </div>
                )}
              </div>

              {/* Copy Variations section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    Copy Variations
                  </h3>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled className="text-xs gap-1.5">
                      <Copy className="w-3.5 h-3.5" />
                      Add Variation
                    </Button>
                    <Button size="sm" disabled className="text-xs gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Generate with AI
                    </Button>
                  </div>
                </div>

                {campaign.copy_variations.length > 0 ? (
                  <div className="space-y-3">
                    {campaign.copy_variations.map((variation) => (
                      <div
                        key={variation.id}
                        className="rounded-lg border border-border p-4 space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground leading-snug">
                            {variation.headline}
                          </p>
                          {variation.is_ai_generated && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 font-normal gap-1 shrink-0"
                            >
                              <Sparkles className="w-3 h-3" />
                              AI Generated
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">
                          {variation.primary_text}
                        </p>
                        {variation.description && (
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {variation.description}
                          </p>
                        )}
                        <div className="pt-1">
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 font-normal"
                          >
                            {variation.cta_text}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border p-8 text-center">
                    <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No copy variations yet
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* -------------------------------------------------------------- */}
            {/* Performance Tab                                                */}
            {/* -------------------------------------------------------------- */}
            <TabsContent value="performance" className="mt-4">
              {hasPerformanceData ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <MetricCard label="Spend" value="$0.00" icon={DollarSign} />
                  <MetricCard label="ROAS" value="0.0x" icon={TrendingUp} />
                  <MetricCard label="CPA" value="$0.00" icon={Target} />
                  <MetricCard label="Impressions" value="0" icon={Eye} />
                  <MetricCard label="Clicks" value="0" icon={MousePointerClick} />
                  <MetricCard label="Conversions" value="0" icon={BarChart3} />
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-12 text-center">
                  <BarChart3 className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Performance data available once campaign is live
                  </p>
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
