"use client"

import { useState, useMemo } from "react"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core"
import { useDraggable, useDroppable } from "@dnd-kit/core"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Megaphone } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Campaign, CampaignStatus } from "@/types/campaign"
import { CAMPAIGN_STATUSES } from "@/types/campaign"
import { mockCampaigns } from "@/lib/mock/campaigns"
import { CampaignCard } from "./campaign-card"
import { CampaignDetail } from "./campaign-detail"
import { CreateCampaignModal } from "./create-campaign-modal"

// ---------------------------------------------------------------------------
// Inline sub-components: CampaignColumn and DraggableCampaignCard
// ---------------------------------------------------------------------------

function DraggableCampaignCard({
  campaign,
  onClick,
}: {
  campaign: Campaign
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: campaign.id })

  const style: React.CSSProperties = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : {}

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "opacity-50")}
      {...listeners}
      {...attributes}
    >
      <CampaignCard campaign={campaign} onClick={onClick} />
    </div>
  )
}

function CampaignColumn({
  status,
  label,
  campaigns,
  onCardClick,
}: {
  status: CampaignStatus
  label: string
  campaigns: Campaign[]
  onCardClick: (c: Campaign) => void
}) {
  const { isOver, setNodeRef } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-w-[280px] w-[280px] rounded-lg border bg-muted/30 flex flex-col",
        isOver && "border-primary ring-1 ring-primary/30"
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b">
        <span className="text-sm font-medium">{label}</span>
        <Badge variant="secondary" className="text-xs tabular-nums">
          {campaigns.length}
        </Badge>
      </div>

      {/* Scrollable card list */}
      <div className="flex flex-col gap-3 p-3 overflow-y-auto flex-1">
        {campaigns.map((campaign) => (
          <DraggableCampaignCard
            key={campaign.id}
            campaign={campaign}
            onClick={() => onCardClick(campaign)}
          />
        ))}
        {campaigns.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">
            No campaigns
          </p>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main CampaignsView component
// ---------------------------------------------------------------------------

export function CampaignsView() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(mockCampaigns)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null
  )
  const [detailOpen, setDetailOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [activeDragId, setActiveDragId] = useState<string | null>(null)
  const [platformFilter, setPlatformFilter] = useState<
    "all" | "meta" | "google" | "both"
  >("all")
  const [clientFilter, setClientFilter] = useState<"all" | string>("all")

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  // Derive unique clients from campaigns
  const clients = useMemo(
    () => [
      ...new Map(
        campaigns.map((c) => [
          c.client_id,
          { id: c.client_id, name: c.client_name },
        ])
      ).values(),
    ],
    [campaigns]
  )

  // Filter campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (platformFilter !== "all" && c.platform !== platformFilter) return false
      if (clientFilter !== "all" && c.client_id !== clientFilter) return false
      return true
    })
  }, [campaigns, platformFilter, clientFilter])

  // Group filtered campaigns by status
  const groupedCampaigns = useMemo(() => {
    const groups: Record<CampaignStatus, Campaign[]> = {
      concept: [],
      setup: [],
      in_review: [],
      live: [],
      optimization: [],
      completed: [],
      paused: [],
    }
    for (const campaign of filteredCampaigns) {
      if (groups[campaign.status]) {
        groups[campaign.status].push(campaign)
      }
    }
    return groups
  }, [filteredCampaigns])

  // Active drag campaign for overlay
  const activeDragCampaign = useMemo(
    () => campaigns.find((c) => c.id === activeDragId) ?? null,
    [campaigns, activeDragId]
  )

  // Handlers
  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null)

    const { active, over } = event
    if (!over) return

    const campaignId = active.id as string
    const newStatus = over.id as CampaignStatus

    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === campaignId
          ? { ...c, status: newStatus, updated_at: new Date().toISOString() }
          : c
      )
    )
  }

  function handleCardClick(campaign: Campaign) {
    setSelectedCampaign(campaign)
    setDetailOpen(true)
  }

  function handleCreateCampaign(campaign: Campaign) {
    setCampaigns((prev) => [...prev, campaign])
  }

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-2xl font-bold">Ad Campaigns</h1>
            <p className="text-sm text-muted-foreground">
              Plan, launch, and optimize Meta & Google ad campaigns
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Campaign
          </Button>
        </div>
        <div className="flex items-center gap-3 mt-4 mb-4">
          {/* Platform filter */}
          <Select
            value={platformFilter}
            onValueChange={(v) =>
              setPlatformFilter(v as "all" | "meta" | "google" | "both")
            }
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="All Platforms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="meta">Meta</SelectItem>
              <SelectItem value="google">Google</SelectItem>
              <SelectItem value="both">Both</SelectItem>
            </SelectContent>
          </Select>

          {/* Client filter */}
          <Select
            value={clientFilter}
            onValueChange={(v) => setClientFilter(v)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Kanban board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 p-6 pt-2 overflow-x-auto flex-1">
          {CAMPAIGN_STATUSES.map(({ value, label }) => (
            <CampaignColumn
              key={value}
              status={value}
              label={label}
              campaigns={groupedCampaigns[value] ?? []}
              onCardClick={handleCardClick}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDragCampaign ? (
            <div className="opacity-80 rotate-2 w-[280px]">
              <CampaignCard
                campaign={activeDragCampaign}
                onClick={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Campaign detail dialog */}
      {selectedCampaign && (
        <CampaignDetail
          campaign={selectedCampaign}
          open={detailOpen}
          onOpenChange={setDetailOpen}
        />
      )}

      {/* Create campaign modal */}
      <CreateCampaignModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreateCampaign={handleCreateCampaign}
        clients={clients}
      />
    </div>
  )
}
