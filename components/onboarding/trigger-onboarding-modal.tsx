"use client"

import { useState } from "react"
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
import { Mail, Info, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface TriggerOnboardingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TriggerOnboardingModal({ open, onOpenChange }: TriggerOnboardingModalProps) {
  const { triggerOnboarding, isTriggeringOnboarding } = useOnboardingStore()

  const [clientName, setClientName] = useState("")
  const [clientEmail, setClientEmail] = useState("")
  const [clientTier, setClientTier] = useState<"Core" | "Enterprise">("Core")

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
    })

    if (instance) {
      toast.success("Onboarding link sent!", {
        description: `An onboarding email has been sent to ${clientEmail}`,
      })
      // Reset form
      setClientName("")
      setClientEmail("")
      setClientTier("Core")
      onOpenChange(false)
    } else {
      toast.error("Failed to trigger onboarding")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
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
