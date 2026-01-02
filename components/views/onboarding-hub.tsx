"use client"

import React, { useState } from "react"
import { VerticalPageLayout, VerticalSection } from "@/components/linear/vertical-section"
import { StatusRow, StatusIcon, type StatusType } from "@/components/linear/status-row"
import { mockClients } from "@/lib/mock-data"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import {
  ClipboardList,
  Key,
  Wrench,
  FileCheck,
  Rocket,
  AlertTriangle,
} from "lucide-react"

// Onboarding stages for clients
type OnboardingStage = "intake" | "access" | "installation" | "audit" | "live" | "needs_support"

interface OnboardingStageConfig {
  id: OnboardingStage
  name: string
  icon: React.ReactNode
  status: StatusType
  description: string
}

const onboardingStages: OnboardingStageConfig[] = [
  {
    id: "intake",
    name: "Intake",
    icon: <ClipboardList className="w-4 h-4 text-orange-500" />,
    status: "backlog",
    description: "New clients pending initial setup",
  },
  {
    id: "access",
    name: "Access",
    icon: <Key className="w-4 h-4 text-yellow-500" />,
    status: "in_progress",
    description: "Waiting for client credentials and platform access",
  },
  {
    id: "installation",
    name: "Installation",
    icon: <Wrench className="w-4 h-4 text-blue-500" />,
    status: "in_progress",
    description: "Setting up tracking, pixels, and integrations",
  },
  {
    id: "audit",
    name: "Audit",
    icon: <FileCheck className="w-4 h-4 text-purple-500" />,
    status: "in_progress",
    description: "Reviewing account setup and configuration",
  },
  {
    id: "live",
    name: "Live",
    icon: <Rocket className="w-4 h-4 text-emerald-500" />,
    status: "completed",
    description: "Clients successfully onboarded and active",
  },
  {
    id: "needs_support",
    name: "Needs Support",
    icon: <AlertTriangle className="w-4 h-4 text-red-500" />,
    status: "blocked",
    description: "Clients with onboarding blockers",
  },
]

// Map pipeline stages to onboarding stages
function getOnboardingStage(pipelineStage: string): OnboardingStage {
  switch (pipelineStage) {
    case "Intake":
      return "intake"
    case "Access":
      return "access"
    case "Installation":
      return "installation"
    case "Audit":
      return "audit"
    case "Live":
      return "live"
    case "Needs Support":
    case "Off-boarding":
      return "needs_support"
    default:
      return "intake"
  }
}

interface OnboardingHubProps {
  onClientClick?: (clientId: string) => void
}

export function OnboardingHub({ onClientClick }: OnboardingHubProps) {
  const [expandedStages, setExpandedStages] = useState<Set<OnboardingStage>>(
    new Set(["intake", "access", "installation"])
  )

  // Group clients by onboarding stage
  const clientsByStage = mockClients.reduce((acc, client) => {
    const stage = getOnboardingStage(client.stage)
    if (!acc[stage]) acc[stage] = []
    acc[stage].push(client)
    return acc
  }, {} as Record<OnboardingStage, typeof mockClients>)

  const toggleStage = (stage: OnboardingStage) => {
    setExpandedStages((prev) => {
      const next = new Set(prev)
      if (next.has(stage)) {
        next.delete(stage)
      } else {
        next.add(stage)
      }
      return next
    })
  }

  return (
    <VerticalPageLayout
      title="Onboarding Hub"
      description="Track client onboarding progress through each stage"
    >
      <VerticalSection
        title="Onboarding Stages"
        description="Clients progress through these stages during onboarding"
        helpText="The onboarding process helps new clients get set up with your agency. Each stage represents a milestone in getting their accounts configured and campaigns running."
      >
        {onboardingStages.map((stage) => {
          const clients = clientsByStage[stage.id] || []
          const isExpanded = expandedStages.has(stage.id)

          return (
            <StatusRow
              key={stage.id}
              icon={stage.icon}
              name={stage.name}
              count={clients.length}
              status={stage.status}
              description={stage.description}
              expandable={clients.length > 0}
              expanded={isExpanded}
              onExpand={() => toggleStage(stage.id)}
              onAdd={() => console.log(`Add client to ${stage.name}`)}
            >
              {clients.length > 0 && (
                <div className="space-y-2">
                  {clients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => onClientClick?.(client.id)}
                      className="flex items-center justify-between w-full p-2 rounded hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-7 w-7 bg-primary">
                          <AvatarFallback className="bg-primary text-[10px] font-medium text-primary-foreground">
                            {client.logo}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-left">
                          <p className="text-sm font-medium text-foreground">{client.name}</p>
                          <p className="text-xs text-muted-foreground">{client.owner}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {client.blocker && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-status-red/10 text-status-red rounded">
                            {client.blocker}
                          </span>
                        )}
                        <span className={cn(
                          "text-xs",
                          client.daysInStage > 4 ? "text-status-red" : "text-muted-foreground"
                        )}>
                          {client.daysInStage}d
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </StatusRow>
          )
        })}
      </VerticalSection>

      <VerticalSection
        title="Recent Activity"
        description="Latest updates from onboarding clients"
        helpText="Activity shows recent progress and updates from clients currently being onboarded."
      >
        <div className="text-sm text-muted-foreground p-4 bg-secondary/30 rounded-lg text-center">
          No recent activity to show
        </div>
      </VerticalSection>
    </VerticalPageLayout>
  )
}
