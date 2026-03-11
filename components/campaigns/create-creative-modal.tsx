"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { CREATIVE_FORMATS } from "@/types/creative"
import type { CreativeFormat } from "@/types/creative"
import { fetchWithCsrf } from "@/lib/csrf"

interface CreateCreativeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  campaignId?: string
  onCreated?: () => void
}

export function CreateCreativeModal({
  open,
  onOpenChange,
  clientId,
  campaignId,
  onCreated,
}: CreateCreativeModalProps) {
  const [title, setTitle] = useState("")
  const [format, setFormat] = useState<CreativeFormat>("image")
  const [hook, setHook] = useState("")
  const [bodyCopy, setBodyCopy] = useState("")
  const [ctaText, setCtaText] = useState("")
  const [targetAudience, setTargetAudience] = useState("")
  const [platform, setPlatform] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  function resetForm() {
    setTitle("")
    setFormat("image")
    setHook("")
    setBodyCopy("")
    setCtaText("")
    setTargetAudience("")
    setPlatform("")
  }

  async function handleCreate() {
    if (!title.trim()) return
    setIsSubmitting(true)

    try {
      const response = await fetchWithCsrf("/api/v1/creatives", {
        method: "POST",
        body: JSON.stringify({
          client_id: clientId,
          campaign_id: campaignId || null,
          title: title.trim(),
          format,
          hook: hook.trim() || null,
          body_copy: bodyCopy.trim() || null,
          cta_text: ctaText.trim() || null,
          target_audience: targetAudience.trim() || null,
          platform: platform || null,
        }),
      })

      if (response.ok) {
        resetForm()
        onOpenChange(false)
        onCreated?.()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Create Creative</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="creative-title">Title *</Label>
            <Input
              id="creative-title"
              placeholder="e.g. Summer Sale Hero Image"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as CreativeFormat)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CREATIVE_FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meta">Meta</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="creative-hook">Hook</Label>
            <Textarea
              id="creative-hook"
              placeholder="The scroll-stopping hook or angle"
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="creative-body">Body Copy</Label>
            <Textarea
              id="creative-body"
              placeholder="Primary ad copy"
              value={bodyCopy}
              onChange={(e) => setBodyCopy(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="creative-cta">CTA Text</Label>
              <Input
                id="creative-cta"
                placeholder="e.g. Shop Now"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="creative-audience">Target Audience</Label>
              <Input
                id="creative-audience"
                placeholder="e.g. Women 25-44"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!title.trim() || isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Create Creative
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
