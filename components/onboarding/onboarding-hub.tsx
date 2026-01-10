"use client"

import { useState } from "react"
import { useOnboardingStore } from "@/stores/onboarding-store"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ActiveOnboardings } from "./active-onboardings"
import { ClientJourneyConfig } from "./client-journey-config"
import { FormBuilder } from "./form-builder"
import { TriggerOnboardingModal } from "./trigger-onboarding-modal"
import { Plus, Link, ExternalLink, Users, Settings, FileText } from "lucide-react"
import { toast } from "sonner"

interface OnboardingHubProps {
  onClientClick?: (clientId: string) => void
}

export function OnboardingHub({ onClientClick }: OnboardingHubProps) {
  const { activeTab, setActiveTab, selectedInstance } = useOnboardingStore()
  const [showTriggerModal, setShowTriggerModal] = useState(false)

  const handleCopyPortalLink = () => {
    if (selectedInstance?.portal_url) {
      navigator.clipboard.writeText(selectedInstance.portal_url)
      toast.success("Portal link copied to clipboard")
    } else {
      toast.error("Select an onboarding first")
    }
  }

  const handleViewAsClient = () => {
    if (selectedInstance?.portal_url) {
      window.open(selectedInstance.portal_url, "_blank")
    } else {
      toast.error("Select an onboarding first")
    }
  }

  return (
    <div className="h-full flex flex-col p-6 pb-[150px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Onboarding & Intake Hub</h1>
          <p className="text-muted-foreground mt-1">
            Manage client onboarding pipeline and intake forms
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopyPortalLink}>
            <Link className="mr-2 h-4 w-4" />
            Copy Portal Link
          </Button>
          <Button variant="outline" size="sm" onClick={handleViewAsClient}>
            <ExternalLink className="mr-2 h-4 w-4" />
            View as Client
          </Button>
          <Button size="sm" onClick={() => setShowTriggerModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Trigger Onboarding
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "active" | "journey" | "form-builder")}
        className="flex-1 flex flex-col min-h-0"
      >
        <TabsList className="w-fit">
          <TabsTrigger value="active" className="gap-2">
            <Users className="h-4 w-4" />
            Active Onboardings
          </TabsTrigger>
          <TabsTrigger value="journey" className="gap-2">
            <Settings className="h-4 w-4" />
            Client Journey
          </TabsTrigger>
          <TabsTrigger value="form-builder" className="gap-2">
            <FileText className="h-4 w-4" />
            Form Builder
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="flex-1 min-h-0 mt-6 overflow-y-auto pb-[150px]">
          <ActiveOnboardings />
        </TabsContent>

        <TabsContent value="journey" className="flex-1 min-h-0 mt-6 overflow-y-auto pb-[150px]">
          <ClientJourneyConfig />
        </TabsContent>

        <TabsContent value="form-builder" className="flex-1 min-h-0 mt-6 overflow-y-auto pb-[150px]">
          <FormBuilder />
        </TabsContent>
      </Tabs>

      {/* Trigger Onboarding Modal */}
      <TriggerOnboardingModal
        open={showTriggerModal}
        onOpenChange={setShowTriggerModal}
      />
    </div>
  )
}
