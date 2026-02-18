"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Campaign, CampaignPlatform, CampaignType } from "@/types/campaign"
import { CAMPAIGN_TYPES, CAMPAIGN_PLATFORMS } from "@/types/campaign"

interface CreateCampaignModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateCampaign: (campaign: Campaign) => void
  clients: { id: string; name: string }[]
}

export function CreateCampaignModal({
  open,
  onOpenChange,
  onCreateCampaign,
  clients,
}: CreateCampaignModalProps) {
  const [clientId, setClientId] = useState("")
  const [name, setName] = useState("")
  const [platform, setPlatform] = useState<CampaignPlatform | "">("")
  const [campaignType, setCampaignType] = useState<CampaignType | "">("")
  const [primaryHook, setPrimaryHook] = useState("")
  const [primaryAngle, setPrimaryAngle] = useState("")

  function resetForm() {
    setClientId("")
    setName("")
    setPlatform("")
    setCampaignType("")
    setPrimaryHook("")
    setPrimaryAngle("")
  }

  function handleCreate() {
    if (!clientId || !name || !platform || !campaignType) return

    const clientName = clients.find((c) => c.id === clientId)?.name ?? ""
    const now = new Date().toISOString()

    const campaign: Campaign = {
      id: "camp-" + Math.random().toString(36).substr(2, 9),
      client_id: clientId,
      client_name: clientName,
      name,
      platform: platform as CampaignPlatform,
      campaign_type: campaignType as CampaignType,
      status: "concept",
      primary_hook: primaryHook || null,
      primary_angle: primaryAngle || null,
      target_audience: null,
      budget: null,
      budget_type: null,
      start_date: null,
      end_date: null,
      notes: null,
      assignee: null,
      visuals: [],
      copy_variations: [],
      created_at: now,
      updated_at: now,
    }

    onCreateCampaign(campaign)
    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Create Campaign</DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 py-4">
          <div className="grid gap-2">
            <Label htmlFor="client">Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger id="client">
                <SelectValue placeholder="Select a client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="campaign-name">Campaign Name</Label>
            <Input
              id="campaign-name"
              placeholder="e.g. Summer Sale Q3"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="platform">Platform</Label>
            <Select value={platform} onValueChange={(v) => setPlatform(v as CampaignPlatform)}>
              <SelectTrigger id="platform">
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                {CAMPAIGN_PLATFORMS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="campaign-type">Campaign Type</Label>
            <Select value={campaignType} onValueChange={(v) => setCampaignType(v as CampaignType)}>
              <SelectTrigger id="campaign-type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {CAMPAIGN_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="primary-hook">Primary Hook</Label>
            <Input
              id="primary-hook"
              placeholder="Optional"
              value={primaryHook}
              onChange={(e) => setPrimaryHook(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="primary-angle">Primary Angle</Label>
            <Input
              id="primary-angle"
              placeholder="Optional"
              value={primaryAngle}
              onChange={(e) => setPrimaryAngle(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!clientId || !name || !platform || !campaignType}
          >
            Create Campaign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
