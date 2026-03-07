"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useSlideTransition } from "@/hooks/use-slide-transition"
import { useToast } from "@/hooks/use-toast"
import { fetchWithCsrf } from "@/lib/csrf"
import { useAutomationsStore } from "@/stores/automations-store"
import type { Workflow, WorkflowTrigger, WorkflowAction } from "@/types/workflow"
import { cn } from "@/lib/utils"
import { ListHeader } from "@/components/linear"
import {
  Zap,
  Users,
  Mail,
  Bell,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  MessageSquare,
  FileText,
  Database,
  Plus,
  Play,
  Pause,
  MoreHorizontal,
  Trash2,
  Copy,
  X,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Icons for integrations
function SlackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
    </svg>
  )
}

interface AutomationTemplate {
  id: string
  name: string
  description: string
  category: "onboarding" | "monitoring" | "communication" | "triage"
  icon: React.ReactNode
  status: "active" | "inactive" | "draft"
  runs: number
  lastRun: string | null
  steps: AutomationStep[]
}

// Step configuration types for automation workflows
interface StepConfig {
  // Trigger configs
  stage?: string
  schedule?: string
  channels?: string
  // Delay configs
  duration?: number
  unit?: 'minutes' | 'hours' | 'days'
  // Action configs
  template?: string
  pattern?: string
  channel?: string
  endpoint?: string
  priority?: string
  recipient?: string
  source?: string
  model?: string
  delay?: string
  // Condition configs
  condition?: string
  threshold?: number
}

interface AutomationStep {
  id: string
  order: number
  name: string
  type: "trigger" | "delay" | "action" | "condition"
  config: StepConfig
  icon: React.ReactNode
}

// Mock automation templates
const automationTemplates: AutomationTemplate[] = [
  {
    id: "1",
    name: "New Client Welcome Sequence",
    description: "Automated welcome flow when a client is added",
    category: "onboarding",
    icon: <Users className="h-4 w-4" />,
    status: "active",
    runs: 24,
    lastRun: "2h ago",
    steps: [
      { id: "s1", order: 1, name: "Client Added to Pipeline", type: "trigger", config: { stage: "Onboarding" }, icon: <Zap className="h-3.5 w-3.5" /> },
      { id: "s2", order: 2, name: "Wait 1 hour", type: "delay", config: { duration: 1, unit: "hours" }, icon: <Clock className="h-3.5 w-3.5" /> },
      { id: "s3", order: 3, name: "Send Welcome Email", type: "action", config: { template: "welcome" }, icon: <Mail className="h-3.5 w-3.5" /> },
      { id: "s4", order: 4, name: "Create Slack Channel", type: "action", config: { pattern: "#client-{name}" }, icon: <SlackIcon className="h-3.5 w-3.5" /> },
      { id: "s5", order: 5, name: "Schedule Kickoff Call", type: "action", config: { delay: "2 days" }, icon: <Calendar className="h-3.5 w-3.5" /> },
    ],
  },
  {
    id: "2",
    name: "Stuck Pipeline Alert",
    description: "Alert team when client is stuck > 5 days",
    category: "monitoring",
    icon: <AlertTriangle className="h-4 w-4" />,
    status: "active",
    runs: 156,
    lastRun: "1h ago",
    steps: [
      { id: "s1", order: 1, name: "Daily Pipeline Scan", type: "trigger", config: { schedule: "daily_9am" }, icon: <Clock className="h-3.5 w-3.5" /> },
      { id: "s2", order: 2, name: "Check Days in Stage", type: "condition", config: { condition: "days > 5" }, icon: <AlertTriangle className="h-3.5 w-3.5" /> },
      { id: "s3", order: 3, name: "Send Slack Alert", type: "action", config: { channel: "#fulfillment" }, icon: <SlackIcon className="h-3.5 w-3.5" /> },
    ],
  },
  {
    id: "3",
    name: "Pixel Health Monitor",
    description: "Daily check for zero-event pixels",
    category: "monitoring",
    icon: <Sparkles className="h-4 w-4" />,
    status: "active",
    runs: 89,
    lastRun: "3h ago",
    steps: [
      { id: "s1", order: 1, name: "Daily at 8 AM", type: "trigger", config: { schedule: "daily_8am" }, icon: <Clock className="h-3.5 w-3.5" /> },
      { id: "s2", order: 2, name: "Check Meta API", type: "action", config: { endpoint: "/events" }, icon: <Database className="h-3.5 w-3.5" /> },
      { id: "s3", order: 3, name: "If Events = 0", type: "condition", config: { condition: "events == 0" }, icon: <AlertTriangle className="h-3.5 w-3.5" /> },
      { id: "s4", order: 4, name: "Create Support Ticket", type: "action", config: { priority: "high" }, icon: <FileText className="h-3.5 w-3.5" /> },
    ],
  },
  {
    id: "4",
    name: "Urgent Triage Bot",
    description: "AI-powered urgent message detection",
    category: "triage",
    icon: <MessageSquare className="h-4 w-4" />,
    status: "active",
    runs: 12,
    lastRun: "1d ago",
    steps: [
      { id: "s1", order: 1, name: "New Slack Message", type: "trigger", config: { channels: "all" }, icon: <SlackIcon className="h-3.5 w-3.5" /> },
      { id: "s2", order: 2, name: "AI Analyze Urgency", type: "action", config: { model: "claude" }, icon: <Sparkles className="h-3.5 w-3.5" /> },
      { id: "s3", order: 3, name: "If Urgency > 7", type: "condition", config: { threshold: 7 }, icon: <AlertTriangle className="h-3.5 w-3.5" /> },
      { id: "s4", order: 4, name: "Create High Priority Ticket", type: "action", config: { priority: "high" }, icon: <FileText className="h-3.5 w-3.5" /> },
      { id: "s5", order: 5, name: "Send SMS Alert", type: "action", config: { recipient: "Brent" }, icon: <Bell className="h-3.5 w-3.5" /> },
    ],
  },
  {
    id: "5",
    name: "Weekly Report Generator",
    description: "Auto-generate client performance reports",
    category: "communication",
    icon: <FileText className="h-4 w-4" />,
    status: "inactive",
    runs: 8,
    lastRun: "7d ago",
    steps: [
      { id: "s1", order: 1, name: "Every Monday 9 AM", type: "trigger", config: { schedule: "weekly_monday" }, icon: <Clock className="h-3.5 w-3.5" /> },
      { id: "s2", order: 2, name: "Pull Ad Performance Data", type: "action", config: { source: "meta+google" }, icon: <Database className="h-3.5 w-3.5" /> },
      { id: "s3", order: 3, name: "Generate Report", type: "action", config: { template: "weekly" }, icon: <FileText className="h-3.5 w-3.5" /> },
      { id: "s4", order: 4, name: "Send to Client", type: "action", config: { channel: "email" }, icon: <Mail className="h-3.5 w-3.5" /> },
    ],
  },
  {
    id: "6",
    name: "Off-boarding Checklist",
    description: "Automated cleanup when client leaves",
    category: "onboarding",
    icon: <CheckCircle2 className="h-4 w-4" />,
    status: "draft",
    runs: 0,
    lastRun: null,
    steps: [
      { id: "s1", order: 1, name: "Client Moved to Off-boarding", type: "trigger", config: { stage: "Off-boarding" }, icon: <Zap className="h-3.5 w-3.5" /> },
      { id: "s2", order: 2, name: "Archive Slack Channel", type: "action", config: {}, icon: <SlackIcon className="h-3.5 w-3.5" /> },
      { id: "s3", order: 3, name: "Export Client Data", type: "action", config: {}, icon: <Database className="h-3.5 w-3.5" /> },
      { id: "s4", order: 4, name: "Send Farewell Email", type: "action", config: { template: "farewell" }, icon: <Mail className="h-3.5 w-3.5" /> },
    ],
  },
]

type FilterTab = "all" | "active" | "inactive" | "draft"

interface FilterTabConfig {
  id: FilterTab
  label: string
  icon: React.ReactNode
  count: number
}

const categoryLabels: Record<string, string> = {
  onboarding: "Onboarding",
  monitoring: "Monitoring",
  communication: "Communication",
  triage: "Triage",
}

const stepTypeColors: Record<string, string> = {
  trigger: "bg-blue-500 text-white",
  delay: "bg-slate-500 text-white",
  action: "bg-emerald-500 text-white",
  condition: "bg-amber-500 text-white",
}

// Convert a real Workflow from API into the UI's AutomationTemplate format
function workflowToTemplate(workflow: Workflow): AutomationTemplate {
  const triggers = (workflow.triggers as unknown as WorkflowTrigger[]) || []
  const actions = (workflow.actions as unknown as WorkflowAction[]) || []

  // Determine category from triggers
  let category: AutomationTemplate["category"] = "monitoring"
  if (triggers.some((t) => t.type === "stage_change")) category = "onboarding"
  else if (triggers.some((t) => t.type === "ticket_created")) category = "triage"
  else if (triggers.some((t) => t.type === "scheduled")) category = "communication"

  // Build steps from triggers + actions
  const steps: AutomationStep[] = []
  triggers.forEach((trigger, i) => {
    steps.push({
      id: trigger.id || `t-${i}`,
      order: i + 1,
      name: trigger.name || trigger.type,
      type: "trigger",
      config: trigger.config as unknown as StepConfig,
      icon: <Zap className="h-3.5 w-3.5" />,
    })
  })
  actions.forEach((action, i) => {
    const iconMap: Record<string, React.ReactNode> = {
      create_task: <CheckCircle2 className="h-3.5 w-3.5" />,
      send_notification: (action.config as { channel?: string })?.channel === "email"
        ? <Mail className="h-3.5 w-3.5" />
        : <SlackIcon className="h-3.5 w-3.5" />,
      draft_communication: <Sparkles className="h-3.5 w-3.5" />,
      create_ticket: <FileText className="h-3.5 w-3.5" />,
      update_client: <Users className="h-3.5 w-3.5" />,
      create_alert: <Bell className="h-3.5 w-3.5" />,
    }
    steps.push({
      id: action.id || `a-${i}`,
      order: triggers.length + i + 1,
      name: action.name || action.type,
      type: "action",
      config: action.config as unknown as StepConfig,
      icon: iconMap[action.type] || <Zap className="h-3.5 w-3.5" />,
    })
  })

  // Format last run time
  let lastRun: string | null = null
  if (workflow.last_run_at) {
    const diff = Date.now() - new Date(workflow.last_run_at).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) lastRun = `${mins}m ago`
    else if (mins < 1440) lastRun = `${Math.floor(mins / 60)}h ago`
    else lastRun = `${Math.floor(mins / 1440)}d ago`
  }

  // Determine icon based on category
  const iconMap: Record<string, React.ReactNode> = {
    onboarding: <Users className="h-4 w-4" />,
    monitoring: <AlertTriangle className="h-4 w-4" />,
    communication: <FileText className="h-4 w-4" />,
    triage: <MessageSquare className="h-4 w-4" />,
  }

  return {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description || "",
    category,
    icon: iconMap[category],
    status: workflow.is_active ? "active" : "inactive",
    runs: workflow.run_count || 0,
    lastRun,
    steps,
  }
}

export function AutomationsHub() {
  const { toast } = useToast()
  const { workflows, isLoading, fetchWorkflows, toggleWorkflow, deleteWorkflow } = useAutomationsStore()
  const [isRunning, setIsRunning] = useState<string | null>(null)
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [editedStepName, setEditedStepName] = useState("")
  const [editedStepConfig, setEditedStepConfig] = useState<StepConfig>({})

  // Fetch real workflows on mount
  useEffect(() => {
    fetchWorkflows()
  }, [fetchWorkflows])

  const [selectedAutomation, setSelectedAutomation] = useState<AutomationTemplate | null>(null)
  const [selectedStep, setSelectedStep] = useState<AutomationStep | null>(null)
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [isSavingStep, setIsSavingStep] = useState(false)

  const slideTransition = useSlideTransition()

  // Handler functions
  const handleToggleStatus = async (automation: AutomationTemplate) => {
    const newStatus = automation.status === "active" ? "inactive" : "active"
    const isActive = newStatus === "active"

    try {
      const success = await toggleWorkflow(automation.id, isActive)
      if (success) {
        toast({
          title: "Automation updated",
          description: `Automation is now ${newStatus}`,
          variant: "default",
        })
        // Update local state
        if (selectedAutomation) {
          setSelectedAutomation({ ...selectedAutomation, status: newStatus as "active" | "inactive" | "draft" })
        }
      } else {
        throw new Error("Failed to toggle automation")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to toggle automation"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleDuplicate = async () => {
    if (!selectedAutomation) return
    setIsDuplicating(true)

    try {
      const response = await fetchWithCsrf(`/api/v1/workflows/${selectedAutomation.id}/duplicate`, {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to duplicate automation")
      }

      toast({
        title: "Automation duplicated",
        description: `${selectedAutomation.name} has been duplicated`,
        variant: "default",
      })

      // Close detail panel
      setSelectedAutomation(null)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to duplicate automation"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsDuplicating(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!selectedAutomation) return
    setIsDeleting(true)

    try {
      const success = await deleteWorkflow(selectedAutomation.id)
      if (success) {
        toast({
          title: "Automation deleted",
          description: "The automation has been removed",
          variant: "default",
        })
        setShowDeleteModal(false)
        setSelectedAutomation(null)
      } else {
        throw new Error("Failed to delete automation")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete automation"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDelete = () => {
    setShowDeleteModal(true)
  }

  const handleTestStep = async () => {
    if (!selectedAutomation) return
    // Test by executing the full workflow (there's no per-step test API)
    await handleRunNow(selectedAutomation)
  }

  const handleSaveStep = async () => {
    if (!selectedStep || !selectedAutomation) return
    setIsSavingStep(true)

    try {
      // Find the real workflow to get current triggers/actions
      const workflow = workflows.find(w => w.id === selectedAutomation.id)
      if (!workflow) throw new Error("Workflow not found — it may have been deleted")

      // Deep clone the triggers and actions
      const triggers = JSON.parse(JSON.stringify(workflow.triggers)) as Record<string, unknown>[]
      const actions = JSON.parse(JSON.stringify(workflow.actions)) as Record<string, unknown>[]

      // Strip UI-only keys from the edited config before saving
      const cleanConfig = { ...editedStepConfig } as Record<string, unknown>
      delete cleanConfig._triggerType  // UI-only trigger type selector
      delete cleanConfig.stage         // UI alias — real field is toStage

      // Find and update the matching trigger or action
      if (selectedStep.type === "trigger") {
        const idx = triggers.findIndex((t) => t.id === selectedStep.id)
        if (idx >= 0) {
          triggers[idx].name = editedStepName
          // Merge edited values into existing config (preserves fields not shown in UI)
          const existingConfig = (triggers[idx].config || {}) as Record<string, unknown>
          triggers[idx].config = { ...existingConfig, ...cleanConfig }
        }
      } else {
        const idx = actions.findIndex((a) => a.id === selectedStep.id)
        if (idx >= 0) {
          actions[idx].name = editedStepName
          const existingConfig = (actions[idx].config || {}) as Record<string, unknown>
          actions[idx].config = { ...existingConfig, ...cleanConfig }
        }
      }

      // PATCH the whole workflow with updated triggers/actions
      const response = await fetchWithCsrf(`/api/v1/workflows/${selectedAutomation.id}`, {
        method: "PATCH",
        body: JSON.stringify({ triggers, actions }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || "Failed to save step")
      }

      toast({
        title: "Step saved",
        description: `${editedStepName} configuration has been updated`,
      })

      // Refresh workflow data and update local state
      await fetchWorkflows()
      setSelectedStep({ ...selectedStep, name: editedStepName, config: editedStepConfig })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save step"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSavingStep(false)
    }
  }

  // Convert real workflows to UI templates (no mock fallback)
  const liveTemplates = useMemo(() => {
    return workflows.map(workflowToTemplate)
  }, [workflows])

  // Run Now handler
  const handleRunNow = useCallback(async (automation: AutomationTemplate) => {
    setIsRunning(automation.id)
    try {
      const response = await fetchWithCsrf(`/api/v1/workflows/${automation.id}/execute`, {
        method: "POST",
        body: JSON.stringify({ triggerData: { manual: true } }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || "Failed to execute")
      }
      toast({
        title: "Workflow executed",
        description: `${automation.name} ran successfully`,
      })
      // Refresh data to get updated run counts
      fetchWorkflows()
    } catch (error) {
      toast({
        title: "Execution failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsRunning(null)
    }
  }, [fetchWorkflows, toast])

  // Create from template handler
  const handleCreateFromTemplate = useCallback(async (templateKey: string) => {
    setIsCreatingTemplate(true)
    try {
      const response = await fetchWithCsrf("/api/v1/workflows/templates", {
        method: "POST",
        body: JSON.stringify({ templateKey }),
      })
      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error || "Failed to create workflow")
      }
      toast({
        title: "Workflow created",
        description: "Template workflow has been activated",
      })
      fetchWorkflows()
    } catch (error) {
      toast({
        title: "Creation failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsCreatingTemplate(false)
    }
  }, [fetchWorkflows, toast])

  // Calculate counts
  const counts = useMemo(() => {
    return {
      all: liveTemplates.length,
      active: liveTemplates.filter((a) => a.status === "active").length,
      inactive: liveTemplates.filter((a) => a.status === "inactive").length,
      draft: liveTemplates.filter((a) => a.status === "draft").length,
    }
  }, [liveTemplates])

  const filterTabs: FilterTabConfig[] = [
    { id: "all", label: "All", icon: <Zap className="w-4 h-4" />, count: counts.all },
    { id: "active", label: "Active", icon: <Play className="w-4 h-4" />, count: counts.active },
    { id: "inactive", label: "Inactive", icon: <Pause className="w-4 h-4" />, count: counts.inactive },
    { id: "draft", label: "Draft", icon: <FileText className="w-4 h-4" />, count: counts.draft },
  ]

  // Filter automations
  const filteredAutomations = useMemo(() => {
    let automations = liveTemplates

    // Apply status filter
    if (activeFilter !== "all") {
      automations = automations.filter((a) => a.status === activeFilter)
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      automations = automations.filter(
        (a) =>
          a.name.toLowerCase().includes(query) ||
          a.description.toLowerCase().includes(query) ||
          a.category.toLowerCase().includes(query)
      )
    }

    return automations
  }, [liveTemplates, activeFilter, searchQuery])

  // When automation is selected, select first step
  const handleSelectAutomation = (automation: AutomationTemplate) => {
    setSelectedAutomation(automation)
    const firstStep = automation.steps[0] || null
    setSelectedStep(firstStep)
    if (firstStep) {
      setEditedStepName(firstStep.name)
      setEditedStepConfig({ ...firstStep.config })
    }
  }

  // When a step is clicked, initialize edit state
  const handleStepSelect = (step: AutomationStep) => {
    setSelectedStep(step)
    setEditedStepName(step.name)
    setEditedStepConfig({ ...step.config })
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* LEFT PANEL - Automations list (shrinks when detail is open) */}
      <motion.div
        initial={false}
        animate={{ width: selectedAutomation ? 280 : "100%" }}
        transition={slideTransition}
        className="flex flex-col border-r border-border overflow-hidden"
        style={{ minWidth: selectedAutomation ? 280 : undefined, flexShrink: selectedAutomation ? 0 : undefined }}
      >
        <ListHeader
          title="Automations"
          count={filteredAutomations.length}
          onSearch={!selectedAutomation ? setSearchQuery : undefined}
          searchValue={!selectedAutomation ? searchQuery : undefined}
          searchPlaceholder="Search automations..."
          actions={
            !selectedAutomation && (
              <Button size="sm" className="h-8 gap-1.5" onClick={() => setShowTemplateDialog(true)}>
                <Plus className="h-4 w-4" />
                New Automation
              </Button>
            )
          }
        />

        {/* Filter tabs - hide when compact */}
        {!selectedAutomation && (
          <div className="flex items-center gap-1 px-4 py-2 border-b border-border overflow-x-auto">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap cursor-pointer",
                  activeFilter === tab.id
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
                <span className="text-xs text-muted-foreground">({tab.count})</span>
              </button>
            ))}
          </div>
        )}

        {/* Automations list - natural flow */}
        <div className="flex-1">
          {filteredAutomations.length > 0 ? (
            filteredAutomations.map((automation) => (
              <AutomationItem
                key={automation.id}
                automation={automation}
                selected={selectedAutomation?.id === automation.id}
                compact={!!selectedAutomation}
                onClick={() => handleSelectAutomation(automation)}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground px-4">
              <Zap className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm mb-1">No automations found</p>
              <p className="text-xs text-center mb-3">Create your first automation from a template to get started.</p>
              <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setShowTemplateDialog(true)}>
                <Plus className="h-4 w-4" />
                Create from Template
              </Button>
            </div>
          )}
        </div>
      </motion.div>

      {/* MIDDLE PANEL - Steps list (when automation selected) */}
      <AnimatePresence mode="wait">
        {selectedAutomation && (
          <motion.div
            key="steps-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={slideTransition}
            className="border-r border-border flex flex-col bg-background overflow-hidden"
            style={{ minWidth: 0 }}>
          {/* Header */}
          <div className="h-[52px] px-4 flex items-center justify-between border-b border-border shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 rounded-md bg-secondary flex items-center justify-center shrink-0">
                {selectedAutomation.icon}
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-medium text-foreground truncate">{selectedAutomation.name}</h2>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Switch
                checked={selectedAutomation.status === "active"}
                onCheckedChange={() => handleToggleStatus(selectedAutomation)}
                className="scale-90"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDuplicate} disabled={isDuplicating || isDeleting}>
                    {isDuplicating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    {isDuplicating ? "Duplicating..." : "Duplicate"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDelete} className="text-destructive" disabled={isDeleting || isDuplicating}>
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-2" />
                    )}
                    {isDeleting ? "Deleting..." : "Delete"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedAutomation(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Status bar */}
          <div className="px-4 py-2 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0",
                  selectedAutomation.status === "active" && "border-emerald-500/50 text-emerald-600 bg-emerald-500/10",
                  selectedAutomation.status === "inactive" && "border-slate-500/50 text-slate-600",
                  selectedAutomation.status === "draft" && "border-amber-500/50 text-amber-600 bg-amber-500/10"
                )}
              >
                {selectedAutomation.status === "active" && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />}
                {selectedAutomation.status.charAt(0).toUpperCase() + selectedAutomation.status.slice(1)}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {selectedAutomation.runs} runs
              </span>
              <span className="text-[10px] text-muted-foreground">
                Last: {selectedAutomation.lastRun || "Never"}
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] px-2"
              onClick={() => handleRunNow(selectedAutomation)}
              disabled={isRunning === selectedAutomation.id}
            >
              {isRunning === selectedAutomation.id ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Play className="h-3 w-3 mr-1" />
              )}
              {isRunning === selectedAutomation.id ? "Running..." : "Run Now"}
            </Button>
          </div>

          {/* Workflow Steps header */}
          <div className="px-4 py-2 border-b border-border">
            <h3 className="text-xs font-medium text-foreground">Workflow Steps</h3>
          </div>

          {/* Steps list */}
          <div className="flex-1 overflow-y-auto p-3">
            <div className="space-y-1">
              {selectedAutomation.steps.map((step, idx) => (
                <div key={step.id}>
                  {/* Step item */}
                  <button
                    onClick={() => handleStepSelect(step)}
                    className={cn(
                      "w-full text-left p-2.5 rounded-lg border transition-colors cursor-pointer",
                      selectedStep?.id === step.id
                        ? "bg-primary/5 border-primary/30"
                        : "bg-card border-border hover:border-primary/30"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0",
                        stepTypeColors[step.type]
                      )}>
                        {step.order}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium text-foreground block truncate">
                          {step.name}
                        </span>
                        <span className="text-[10px] text-muted-foreground capitalize">
                          {step.type}
                        </span>
                      </div>
                      {step.icon}
                    </div>
                  </button>

                  {/* Connector line */}
                  {idx < selectedAutomation.steps.length - 1 && (
                    <div className="flex justify-center py-0.5">
                      <div className="w-0.5 h-3 bg-border" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add step button */}
            <button className="w-full mt-3 p-2 border-2 border-dashed border-muted-foreground/20 rounded-lg flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors cursor-pointer">
              <Plus className="h-3 w-3" />
              Add Step
            </button>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* RIGHT PANEL - Step configuration (when step selected) */}
      <AnimatePresence mode="wait">
        {selectedAutomation && selectedStep && (
          <motion.div
            key="config-panel"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={slideTransition}
            className="flex-1 flex flex-col bg-background">
          {/* Panel Header */}
          <div className="h-[52px] px-4 flex items-center justify-between border-b border-border shrink-0">
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-1.5 rounded-md",
                selectedStep.type === "trigger" && "bg-blue-500/10",
                selectedStep.type === "delay" && "bg-slate-500/10",
                selectedStep.type === "action" && "bg-emerald-500/10",
                selectedStep.type === "condition" && "bg-amber-500/10"
              )}>
                {selectedStep.icon}
              </div>
              <div>
                <h3 className="text-sm font-medium text-foreground">
                  {selectedStep.name}
                </h3>
                <span className="text-xs text-muted-foreground capitalize">
                  {selectedStep.type} configuration
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={handleTestStep}
                disabled={isRunning === selectedAutomation?.id}
              >
                {isRunning === selectedAutomation?.id ? (
                  <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                ) : (
                  <Play className="h-3 w-3 mr-1.5" />
                )}
                {isRunning === selectedAutomation?.id ? "Running..." : "Test"}
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={handleSaveStep}
                disabled={isSavingStep}
              >
                {isSavingStep && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
                {isSavingStep ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>

          {/* Configuration Content - natural flow */}
          <div className="flex-1 p-4">
            <StepConfiguration
              step={selectedStep}
              name={editedStepName}
              config={editedStepConfig}
              onNameChange={setEditedStepName}
              onConfigChange={(key, value) => setEditedStepConfig(prev => ({ ...prev, [key]: value }))}
            />
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Delete confirmation modal */}
      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete automation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{selectedAutomation?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Template picker dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Automation from Template</DialogTitle>
            <DialogDescription>
              Choose a pre-built workflow template to get started quickly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {[
              { key: "welcome-sequence", name: "New Client Welcome Sequence", desc: "Automated welcome flow when a client moves to Onboarding", icon: <Users className="h-4 w-4" /> },
              { key: "urgent-triage", name: "Urgent Triage Bot", desc: "Auto-alert on critical/high priority tickets", icon: <MessageSquare className="h-4 w-4" /> },
              { key: "stuck-pipeline", name: "Stuck Pipeline Alert", desc: "Detect clients with no activity for 5+ days", icon: <AlertTriangle className="h-4 w-4" /> },
              { key: "offboarding-checklist", name: "Off-boarding Checklist", desc: "Cleanup tasks when a client leaves", icon: <CheckCircle2 className="h-4 w-4" /> },
              { key: "weekly-report", name: "Weekly Report Generator", desc: "AI-drafted weekly performance reports", icon: <FileText className="h-4 w-4" /> },
            ].map((tmpl) => (
              <button
                key={tmpl.key}
                onClick={async () => {
                  setShowTemplateDialog(false)
                  await handleCreateFromTemplate(tmpl.key)
                }}
                disabled={isCreatingTemplate}
                className="w-full flex items-start gap-3 p-3 rounded-lg border border-border hover:border-primary/40 hover:bg-secondary/50 transition-colors text-left cursor-pointer disabled:opacity-50"
              >
                <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                  {tmpl.icon}
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-medium text-foreground block">{tmpl.name}</span>
                  <span className="text-xs text-muted-foreground">{tmpl.desc}</span>
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface AutomationItemProps {
  automation: AutomationTemplate
  selected: boolean
  compact: boolean
  onClick: () => void
}

function AutomationItem({ automation, selected, compact, onClick }: AutomationItemProps) {
  if (compact) {
    // Compact view when detail panel is open
    return (
      <div
        className={cn(
          "px-3 py-2.5 transition-colors border-b border-border/30 cursor-pointer",
          selected
            ? "bg-primary/10 border-l-2 border-l-primary"
            : "hover:bg-secondary/50 border-l-2 border-l-transparent"
        )}
        onClick={onClick}
      >
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full shrink-0",
            automation.status === "active" && "bg-emerald-500",
            automation.status === "inactive" && "bg-slate-400",
            automation.status === "draft" && "bg-amber-500"
          )} />
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-medium text-foreground truncate">
              {automation.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-muted-foreground">
                {automation.steps.length} steps
              </span>
              <span className="text-[10px] text-muted-foreground">
                {automation.runs} runs
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Full view when no detail panel
  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 transition-colors border-l-2 border-b border-border/30 cursor-pointer",
        selected
          ? "bg-secondary border-l-primary"
          : "border-l-transparent hover:bg-secondary/50"
      )}
      onClick={onClick}
    >
      {/* Status indicator */}
      <div className="pt-1.5">
        <div
          className={cn(
            "w-2 h-2 rounded-full",
            automation.status === "active" && "bg-emerald-500",
            automation.status === "inactive" && "bg-slate-400",
            automation.status === "draft" && "bg-amber-500"
          )}
        />
      </div>

      {/* Icon */}
      <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center shrink-0">
        {automation.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-sm font-medium text-foreground truncate">
            {automation.name}
          </span>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {automation.lastRun || "Never"}
          </span>
        </div>
        <p className="text-sm text-foreground truncate mb-1">
          {automation.description}
        </p>

        {/* Tags row */}
        <div className="flex items-center gap-2 mt-2">
          {/* Category badge */}
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
            {categoryLabels[automation.category]}
          </span>

          {/* Steps count */}
          <span className="text-[10px] text-muted-foreground">
            {automation.steps.length} steps
          </span>

          {/* Runs count */}
          <span className="text-[10px] text-muted-foreground">
            {automation.runs} runs
          </span>
        </div>
      </div>
    </div>
  )
}

interface StepConfigurationProps {
  step: AutomationStep
  name: string
  config: StepConfig
  onNameChange: (name: string) => void
  onConfigChange: (key: string, value: unknown) => void
}

function StepConfiguration({ step, name, config, onNameChange, onConfigChange }: StepConfigurationProps) {
  return (
    <div className="max-w-lg space-y-4">
      {/* Step Type Badge */}
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={cn(
            "text-xs px-2 py-0.5 capitalize",
            step.type === "trigger" && "border-blue-500/50 text-blue-600",
            step.type === "delay" && "border-slate-500/50 text-slate-600",
            step.type === "action" && "border-emerald-500/50 text-emerald-600",
            step.type === "condition" && "border-amber-500/50 text-amber-600"
          )}
        >
          {step.type}
        </Badge>
      </div>

      {/* Name Field */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground">Step Name</label>
        <Input value={name} onChange={(e) => onNameChange(e.target.value)} className="h-9" />
      </div>

      {/* Type-specific configuration */}
      {step.type === "trigger" && <TriggerConfig config={config} onChange={onConfigChange} />}
      {step.type === "delay" && <DelayConfig config={config} onChange={onConfigChange} />}
      {step.type === "action" && <ActionConfig config={config} onChange={onConfigChange} />}
      {step.type === "condition" && <ConditionConfig config={config} onChange={onConfigChange} />}
    </div>
  )
}

function TriggerConfig({ config, onChange }: { config: StepConfig; onChange: (key: string, value: unknown) => void }) {
  // Support both mock format (config.stage) and real format (config.toStage)
  const realConfig = config as Record<string, unknown>
  const stageValue = config.stage || (realConfig.toStage as string) || ""
  const scheduleValue = config.schedule || ""

  // Derive the trigger type from the config, but also allow it to be overridden
  // once the user has explicitly selected a different type
  const triggerType = (realConfig._triggerType as string) ||
    (scheduleValue ? "scheduled" : config.channels ? "slack_message" : stageValue ? "stage_change" : "client_added")

  const handleTriggerTypeChange = (newType: string) => {
    // Store the explicit selection
    onChange("_triggerType", newType)
    // Reset sub-fields based on the new type
    if (newType === "stage_change") {
      onChange("toStage", stageValue || "Onboarding")
      onChange("stage", stageValue || "Onboarding")
    }
  }

  const showStageFields = triggerType === "stage_change"
  const showScheduleFields = triggerType === "scheduled"

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5">
        <h4 className="text-xs font-medium text-blue-600 mb-3">TRIGGER SETTINGS</h4>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">When this happens:</label>
            <select
              value={triggerType}
              onChange={(e) => handleTriggerTypeChange(e.target.value)}
              className="w-full h-9 text-sm rounded-md border border-border bg-background px-3"
            >
              <option value="client_added">Client added to pipeline</option>
              <option value="stage_change">Client stage changes</option>
              <option value="slack_message">New Slack message</option>
              <option value="scheduled">Scheduled time</option>
            </select>
          </div>
          {showStageFields && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Stage:</label>
              <select
                value={stageValue || "Onboarding"}
                onChange={(e) => {
                  onChange("stage", e.target.value)
                  onChange("toStage", e.target.value)
                }}
                className="w-full h-9 text-sm rounded-md border border-border bg-background px-3"
              >
                <option value="Onboarding">Onboarding</option>
                <option value="Installation">Installation</option>
                <option value="Live">Live</option>
                <option value="Off-boarding">Off-boarding</option>
              </select>
            </div>
          )}
          {showScheduleFields && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Schedule (cron):</label>
              <Input
                value={scheduleValue || "0 9 * * 1"}
                onChange={(e) => onChange("schedule", e.target.value)}
                className="h-9 font-mono"
                placeholder="0 9 * * 1"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DelayConfig({ config, onChange }: { config: StepConfig; onChange: (key: string, value: unknown) => void }) {
  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg border border-slate-500/20 bg-slate-500/5">
        <h4 className="text-xs font-medium text-slate-600 mb-3">DELAY SETTINGS</h4>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={config.duration || 1}
            onChange={(e) => onChange("duration", Number(e.target.value))}
            className="w-20 h-9"
          />
          <select
            value={config.unit || "hours"}
            onChange={(e) => onChange("unit", e.target.value)}
            className="h-9 text-sm rounded-md border border-border bg-background px-3"
          >
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
          </select>
        </div>
      </div>
    </div>
  )
}

function ActionConfig({ config, onChange }: { config: StepConfig; onChange: (key: string, value: unknown) => void }) {
  // Support both mock and real config formats
  const realConfig = config as Record<string, unknown>
  const channelValue = config.channel || (realConfig.channel as string) || ""
  const titleValue = (realConfig.title as string) || ""
  const messageValue = (realConfig.message as string) || ""
  const priorityValue = config.priority || (realConfig.priority as string) || ""

  // Show relevant fields based on what's in the config
  const hasTitle = "title" in realConfig
  const hasMessage = "message" in realConfig
  const hasPriority = !!priorityValue
  const hasChannel = !!channelValue
  const hasTemplate = !!config.template
  const hasPattern = !!config.pattern

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
        <h4 className="text-xs font-medium text-emerald-600 mb-3">ACTION SETTINGS</h4>
        <div className="space-y-3">
          {hasTitle && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Title:</label>
              <Input value={titleValue} onChange={(e) => onChange("title", e.target.value)} className="h-9" />
            </div>
          )}
          {hasMessage && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Message:</label>
              <Input value={messageValue} onChange={(e) => onChange("message", e.target.value)} className="h-9" />
            </div>
          )}
          {hasPriority && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Priority:</label>
              <select
                value={priorityValue}
                onChange={(e) => onChange("priority", e.target.value)}
                className="w-full h-9 text-sm rounded-md border border-border bg-background px-3"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          )}
          {hasChannel && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Channel:</label>
              <Input value={channelValue} onChange={(e) => onChange("channel", e.target.value)} className="h-9" placeholder="#channel-name" />
            </div>
          )}
          {hasTemplate && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Template:</label>
              <Input value={config.template || ""} onChange={(e) => onChange("template", e.target.value)} className="h-9" />
            </div>
          )}
          {hasPattern && (
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Channel pattern:</label>
              <Input value={config.pattern || ""} onChange={(e) => onChange("pattern", e.target.value)} className="h-9 font-mono" placeholder="#client-{name}" />
            </div>
          )}
          {!hasTitle && !hasMessage && !hasPriority && !hasChannel && !hasTemplate && !hasPattern && (
            <p className="text-xs text-muted-foreground">No configurable settings for this action.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function ConditionConfig({ config, onChange }: { config: StepConfig; onChange: (key: string, value: unknown) => void }) {
  const conditionValue = config.condition || (config.threshold ? `urgency > ${config.threshold}` : "")

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
        <h4 className="text-xs font-medium text-amber-600 mb-3">CONDITION SETTINGS</h4>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">If:</label>
            <Input
              value={conditionValue}
              onChange={(e) => onChange("condition", e.target.value)}
              className="h-9 font-mono"
              placeholder="days > 5"
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <div className="flex-1 border-t border-border" />
            <span className="text-[10px] text-muted-foreground">Then continue to next step</span>
            <div className="flex-1 border-t border-border" />
          </div>
        </div>
      </div>
    </div>
  )
}
