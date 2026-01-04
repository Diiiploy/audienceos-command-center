"use client"

import React, { useState } from "react"
import { motion, AnimatePresence, useReducedMotion } from "motion/react"
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
  X,
  ChevronRight,
  Calendar,
  User,
  CheckCircle2,
  Circle,
  Clock,
  MessageSquare,
} from "lucide-react"

// Onboarding stages for clients
type OnboardingStage = "intake" | "access" | "installation" | "audit" | "live" | "needs_support"

interface OnboardingStageConfig {
  id: OnboardingStage
  name: string
  icon: React.ReactNode
  color: string
  description: string
}

const onboardingStages: OnboardingStageConfig[] = [
  {
    id: "intake",
    name: "Intake",
    icon: <ClipboardList className="w-4 h-4" />,
    color: "text-orange-500",
    description: "New clients pending initial setup",
  },
  {
    id: "access",
    name: "Access",
    icon: <Key className="w-4 h-4" />,
    color: "text-yellow-500",
    description: "Waiting for client credentials and platform access",
  },
  {
    id: "installation",
    name: "Installation",
    icon: <Wrench className="w-4 h-4" />,
    color: "text-blue-500",
    description: "Setting up tracking, pixels, and integrations",
  },
  {
    id: "audit",
    name: "Audit",
    icon: <FileCheck className="w-4 h-4" />,
    color: "text-purple-500",
    description: "Reviewing account setup and configuration",
  },
  {
    id: "live",
    name: "Live",
    icon: <Rocket className="w-4 h-4" />,
    color: "text-emerald-500",
    description: "Clients successfully onboarded and active",
  },
  {
    id: "needs_support",
    name: "Needs Support",
    icon: <AlertTriangle className="w-4 h-4" />,
    color: "text-red-500",
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

// Mock onboarding checklist items per stage
const stageChecklists: Record<OnboardingStage, { id: string; task: string; completed: boolean }[]> = {
  intake: [
    { id: "1", task: "Send welcome email", completed: true },
    { id: "2", task: "Schedule kickoff call", completed: true },
    { id: "3", task: "Collect business information", completed: false },
    { id: "4", task: "Identify primary goals", completed: false },
  ],
  access: [
    { id: "1", task: "Request Google Ads access", completed: false },
    { id: "2", task: "Request Meta Ads access", completed: false },
    { id: "3", task: "Get GA4 access", completed: false },
    { id: "4", task: "Connect Slack channel", completed: false },
  ],
  installation: [
    { id: "1", task: "Install tracking pixels", completed: false },
    { id: "2", task: "Set up conversion tracking", completed: false },
    { id: "3", task: "Configure GTM", completed: false },
    { id: "4", task: "Verify data flow", completed: false },
  ],
  audit: [
    { id: "1", task: "Review account structure", completed: false },
    { id: "2", task: "Audit existing campaigns", completed: false },
    { id: "3", task: "Check tracking accuracy", completed: false },
    { id: "4", task: "Document recommendations", completed: false },
  ],
  live: [
    { id: "1", task: "Launch first campaign", completed: true },
    { id: "2", task: "Set up reporting", completed: true },
    { id: "3", task: "Schedule regular check-ins", completed: true },
  ],
  needs_support: [
    { id: "1", task: "Identify blocker", completed: false },
    { id: "2", task: "Create resolution plan", completed: false },
    { id: "3", task: "Follow up with client", completed: false },
  ],
}

interface OnboardingHubProps {
  onClientClick?: (clientId: string) => void
}

// Client type from mock data
type Client = typeof mockClients[0]

interface ClientDetailPanelProps {
  client: Client
  stage: OnboardingStageConfig
  onClose: () => void
  onClientClick?: (clientId: string) => void
}

function ClientDetailPanel({ client, stage, onClose, onClientClick }: ClientDetailPanelProps) {
  // Local state for interactive checklist
  const [checklistState, setChecklistState] = React.useState(() =>
    stageChecklists[stage.id].map(item => ({ ...item }))
  )
  const completedCount = checklistState.filter(item => item.completed).length

  const toggleChecklistItem = (itemId: string) => {
    setChecklistState(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Detail Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-background shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 bg-primary">
            <AvatarFallback className="bg-primary text-xs font-medium text-primary-foreground">
              {client.logo}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-sm font-semibold text-foreground">{client.name}</h2>
            <div className="flex items-center gap-2">
              <span className={cn("text-xs", stage.color)}>{stage.name}</span>
              <span className="text-xs text-muted-foreground">• {client.daysInStage}d in stage</span>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-secondary rounded transition-colors cursor-pointer"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Detail Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Client Info */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Client Info</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Owner:</span>
              <span className="text-foreground">{client.owner}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">Days in Stage:</span>
              <span className="text-foreground">{client.daysInStage} days</span>
            </div>
            {client.blocker && (
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-status-red" />
                <span className="text-muted-foreground">Blocker:</span>
                <span className="text-status-red">{client.blocker}</span>
              </div>
            )}
          </div>
        </div>

        {/* Stage Checklist */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {stage.name} Checklist
            </h3>
            <span className="text-xs text-muted-foreground">
              {completedCount}/{checklistState.length} complete
            </span>
          </div>
          <div className="space-y-1">
            {checklistState.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleChecklistItem(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer text-left",
                  item.completed ? "bg-emerald-500/5" : "bg-secondary/30 hover:bg-secondary/50"
                )}
              >
                {item.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <span className={cn(
                  "text-sm",
                  item.completed ? "text-muted-foreground line-through" : "text-foreground"
                )}>
                  {item.task}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-foreground">Kickoff call scheduled</p>
                <p className="text-xs text-muted-foreground">2 days ago</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-foreground">Welcome email sent</p>
                <p className="text-xs text-muted-foreground">3 days ago</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onClientClick?.(client.id)}
              className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors cursor-pointer"
            >
              View Full Profile
            </button>
            <button className="px-3 py-1.5 text-xs font-medium bg-secondary text-foreground rounded hover:bg-secondary/80 transition-colors cursor-pointer">
              Send Reminder
            </button>
            <button className="px-3 py-1.5 text-xs font-medium bg-secondary text-foreground rounded hover:bg-secondary/80 transition-colors cursor-pointer">
              Add Note
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface StageRowProps {
  stage: OnboardingStageConfig
  clients: Client[]
  isExpanded: boolean
  isCompact: boolean
  selectedClientId: string | null
  onToggle: () => void
  onClientSelect: (client: Client) => void
}

function StageRow({ stage, clients, isExpanded, isCompact, selectedClientId, onToggle, onClientSelect }: StageRowProps) {
  if (isCompact) {
    // Compact view when detail panel is open
    return (
      <div className="border-b border-border/30">
        {/* Stage Header - Compact */}
        <button
          onClick={onToggle}
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-secondary/30 transition-colors cursor-pointer"
        >
          <ChevronRight className={cn(
            "w-3 h-3 text-muted-foreground transition-transform",
            isExpanded && "rotate-90"
          )} />
          <span className={stage.color}>{stage.icon}</span>
          <span className="text-sm font-medium text-foreground flex-1 text-left">{stage.name}</span>
          <span className="text-xs text-muted-foreground">{clients.length}</span>
        </button>

        {/* Clients - Compact */}
        {isExpanded && clients.length > 0 && (
          <div className="pb-2">
            {clients.map((client) => (
              <button
                key={client.id}
                onClick={() => onClientSelect(client)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-1.5 pl-8 transition-colors cursor-pointer",
                  selectedClientId === client.id
                    ? "bg-primary/10 border-l-2 border-l-primary"
                    : "hover:bg-secondary/30"
                )}
              >
                <Avatar className="h-5 w-5 bg-primary">
                  <AvatarFallback className="bg-primary text-[8px] font-medium text-primary-foreground">
                    {client.logo}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-foreground truncate flex-1 text-left">{client.name}</span>
                {client.blocker && (
                  <AlertTriangle className="w-3 h-3 text-status-red shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Full card view when no detail panel
  return (
    <div className="bg-card rounded-lg border border-border/50 overflow-hidden">
      {/* Stage Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors cursor-pointer"
      >
        <ChevronRight className={cn(
          "w-4 h-4 text-muted-foreground transition-transform",
          isExpanded && "rotate-90"
        )} />
        <span className={stage.color}>{stage.icon}</span>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{stage.name}</span>
            <span className="text-xs text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">
              {clients.length}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{stage.description}</p>
        </div>
      </button>

      {/* Clients */}
      {isExpanded && clients.length > 0 && (
        <div className="border-t border-border/30 divide-y divide-border/30">
          {clients.map((client) => (
            <button
              key={client.id}
              onClick={() => onClientSelect(client)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/30 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 bg-primary">
                  <AvatarFallback className="bg-primary text-xs font-medium text-primary-foreground">
                    {client.logo}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{client.name}</p>
                  <p className="text-xs text-muted-foreground">{client.owner}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {client.blocker && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-status-red/10 text-status-red rounded">
                    {client.blocker}
                  </span>
                )}
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span className={cn(
                    "text-xs",
                    client.daysInStage > 4 ? "text-status-red" : ""
                  )}>
                    {client.daysInStage}d
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Empty State */}
      {isExpanded && clients.length === 0 && (
        <div className="border-t border-border/30 px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">No clients in this stage</p>
        </div>
      )}
    </div>
  )
}

export function OnboardingHub({ onClientClick }: OnboardingHubProps) {
  const [expandedStages, setExpandedStages] = useState<Set<OnboardingStage>>(
    new Set(["intake", "access", "installation"])
  )
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  // Reduced motion support
  const prefersReducedMotion = useReducedMotion()
  const slideTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const }

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

  const selectedStage = selectedClient
    ? onboardingStages.find(s => s.id === getOnboardingStage(selectedClient.stage))
    : null

  const isCompact = selectedClient !== null

  return (
    <div className="flex h-full overflow-hidden">
      {/* LEFT PANEL - Stages List (always visible) */}
      <motion.div
        initial={false}
        animate={{ width: isCompact ? 288 : "100%" }}
        transition={slideTransition}
        className="flex flex-col border-r border-border/50 bg-muted/30 overflow-hidden"
        style={{ minWidth: isCompact ? 288 : undefined, flexShrink: isCompact ? 0 : undefined }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/50 bg-background shrink-0">
          <h1 className="text-base font-semibold text-foreground">Onboarding Hub</h1>
          {!isCompact && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Track client onboarding progress through each stage
            </p>
          )}
        </div>

        {/* Stages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {onboardingStages.map((stage) => {
            const clients = clientsByStage[stage.id] || []
            const isExpanded = expandedStages.has(stage.id)

            return (
              <StageRow
                key={stage.id}
                stage={stage}
                clients={clients}
                isExpanded={isExpanded}
                isCompact={isCompact}
                selectedClientId={selectedClient?.id || null}
                onToggle={() => toggleStage(stage.id)}
                onClientSelect={setSelectedClient}
              />
            )
          })}
        </div>
      </motion.div>

      {/* RIGHT PANEL - Client Detail View */}
      <AnimatePresence mode="wait">
        {selectedClient && selectedStage && (
          <motion.div
            key="client-detail-panel"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={slideTransition}
            className="flex-1 flex flex-col bg-background overflow-hidden"
          >
            <ClientDetailPanel
              client={selectedClient}
              stage={selectedStage}
              onClose={() => setSelectedClient(null)}
              onClientClick={onClientClick}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
