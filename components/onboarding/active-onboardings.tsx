"use client"

import { useEffect } from "react"
import { useOnboardingStore } from "@/stores/onboarding-store"
import { OnboardingCard } from "./onboarding-card"
import { ClientJourneyPanel } from "./client-journey-panel"
import { Loader2, Inbox } from "lucide-react"

export function ActiveOnboardings() {
  const {
    instances,
    isLoadingInstances,
    selectedInstanceId,
    setSelectedInstanceId,
    fetchInstances,
  } = useOnboardingStore()

  useEffect(() => {
    fetchInstances()
  }, [fetchInstances])

  if (isLoadingInstances && instances.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (instances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Inbox className="h-12 w-12 mb-4" />
        <p className="text-lg font-medium">No active onboardings</p>
        <p className="text-sm">Trigger a new onboarding to get started</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 h-full">
      {/* Left Panel - Pipeline Cards */}
      <div className="lg:col-span-2 space-y-3 overflow-auto max-h-[calc(100vh-280px)]">
        {instances.map((instance) => (
          <OnboardingCard
            key={instance.id}
            instance={instance}
            isSelected={selectedInstanceId === instance.id}
            onClick={() => setSelectedInstanceId(instance.id)}
          />
        ))}
      </div>

      {/* Right Panel - Client Journey Detail */}
      <div className="lg:col-span-3 border rounded-lg bg-card overflow-auto max-h-[calc(100vh-280px)]">
        <ClientJourneyPanel />
      </div>
    </div>
  )
}
