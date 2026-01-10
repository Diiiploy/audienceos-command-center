"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useOnboardingStore } from "@/stores/onboarding-store"
import { SEOPreviewCard } from "./seo-preview-card"
import { Mail, Info, Loader2, Globe } from "lucide-react"
import { toast } from "sonner"

interface TriggerOnboardingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SEOSummary {
  total_keywords: number
  traffic_value: number
  top_10_keywords: number
  competitors_count: number
  domain_rank: number | null
  backlinks: number | null
}

interface Competitor {
  domain: string
  intersecting_keywords: number
}

interface SEOEnrichmentResult {
  success: boolean
  domain: string
  summary: SEOSummary | null
  competitors: Competitor[]
  fetched_at: string
  error?: string
}

export function TriggerOnboardingModal({ open, onOpenChange }: TriggerOnboardingModalProps) {
  const { triggerOnboarding, isTriggeringOnboarding } = useOnboardingStore()

  const [clientName, setClientName] = useState("")
  const [clientEmail, setClientEmail] = useState("")
  const [clientWebsite, setClientWebsite] = useState("")
  const [clientTier, setClientTier] = useState<"Core" | "Enterprise">("Core")

  // SEO enrichment state
  const [seoLoading, setSeoLoading] = useState(false)
  const [seoData, setSeoData] = useState<SEOEnrichmentResult | null>(null)
  const [debouncedWebsite, setDebouncedWebsite] = useState("")

  // Debounce website input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedWebsite(clientWebsite)
    }, 500)
    return () => clearTimeout(timer)
  }, [clientWebsite])

  // Fetch SEO data when debounced website changes
  const fetchSeoData = useCallback(async (website: string) => {
    if (!website || website.trim().length < 4) {
      setSeoData(null)
      return
    }

    setSeoLoading(true)
    try {
      const response = await fetch("/api/v1/seo/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ domain: website }),
      })

      const data: SEOEnrichmentResult = await response.json()
      setSeoData(data)
    } catch (error) {
      console.error("SEO fetch error:", error)
      setSeoData({
        success: false,
        domain: website,
        summary: null,
        competitors: [],
        fetched_at: new Date().toISOString(),
        error: "Failed to fetch SEO data",
      })
    } finally {
      setSeoLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debouncedWebsite) {
      fetchSeoData(debouncedWebsite)
    } else {
      setSeoData(null)
    }
  }, [debouncedWebsite, fetchSeoData])

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setClientName("")
      setClientEmail("")
      setClientWebsite("")
      setClientTier("Core")
      setSeoData(null)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!clientName.trim() || !clientEmail.trim()) {
      toast.error("Please fill in all required fields")
      return
    }

    const instance = await triggerOnboarding({
      client_name: clientName,
      client_email: clientEmail,
      client_tier: clientTier,
      website_url: clientWebsite || undefined,
      seo_data: seoData?.success ? {
        summary: seoData.summary,
        competitors: seoData.competitors,
        fetched_at: seoData.fetched_at,
      } : undefined,
    })

    if (instance) {
      toast.success("Onboarding link sent!", {
        description: `An onboarding email has been sent to ${clientEmail}`,
      })
      onOpenChange(false)
    } else {
      toast.error("Failed to trigger onboarding")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Trigger Onboarding</DialogTitle>
          <DialogDescription>
            Start the onboarding process for a new client
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="clientName">Client Name</Label>
            <Input
              id="clientName"
              placeholder="Acme Corporation"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientEmail">Primary Contact Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="clientEmail"
                type="email"
                placeholder="contact@acme.com"
                className="pl-10"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="clientWebsite">
              Website URL <span className="text-muted-foreground">(optional)</span>
            </Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="clientWebsite"
                type="text"
                placeholder="acme.com"
                className="pl-10"
                value={clientWebsite}
                onChange={(e) => setClientWebsite(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              We'll automatically fetch SEO intelligence for this domain
            </p>
          </div>

          {/* SEO Preview Card */}
          {(seoLoading || seoData) && (
            <SEOPreviewCard
              loading={seoLoading}
              domain={seoData?.domain || clientWebsite}
              summary={seoData?.summary || null}
              competitors={seoData?.competitors || []}
              error={seoData?.success === false ? seoData.error : undefined}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="clientTier">Client Tier</Label>
            <Select value={clientTier} onValueChange={(v) => setClientTier(v as "Core" | "Enterprise")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Core">Core</SelectItem>
                <SelectItem value="Enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md bg-muted p-3 text-sm">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">What happens next?</p>
                <p className="text-muted-foreground mt-1">
                  The client will receive an email with a link to complete their onboarding form.
                  You can track their progress in the Active Onboardings tab.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isTriggeringOnboarding}>
              {isTriggeringOnboarding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Onboarding Link"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
