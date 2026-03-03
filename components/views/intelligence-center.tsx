"use client"

import React, { useState } from "react"
import {
  SettingsLayout,
  SettingsContentSection,
  FeatureCard,
  IntegrationCard,
  integrationIcons,
  intelligenceSettingsGroups,
} from "@/components/linear"
import { useChatSessions, useChatMessages } from "@/hooks/intelligence/use-chat-history"
import { useTrainingDocuments, useUploadTrainingDocument, useDeleteTrainingDocument } from "@/hooks/intelligence/use-training-documents"
import { useCustomPrompts, useCreatePrompt, useUpdatePrompt, useDeletePrompt, type CustomPromptRow } from "@/hooks/intelligence/use-custom-prompts"
import { useActivityFeed } from "@/hooks/intelligence/use-activity-feed"
import {
  FirehoseFeed,
} from "@/components/dashboard"
import { cn } from "@/lib/utils"
import { CartridgesPage } from "@/components/cartridges"
import { MemoryPanel } from "@/components/chat/memory-panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  MessageSquare,
  FileSearch,
  Zap,
  Target,
  TrendingUp,
  AlertTriangle,
  Plus,
  Upload,
  FileText,
  Trash2,
  Edit2,
  CheckCircle2,
  History,
  Bot,
  User,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react"

const PROMPT_CATEGORIES = [
  { value: "communication", label: "Communication" },
  { value: "analysis", label: "Analysis" },
  { value: "automation", label: "Automation" },
  { value: "other", label: "Other" },
]

// Chat filter types for conversation view (System tab removed — DB only has user/assistant roles)
type ChatFilterTab = "all" | "chat" | "ai"


interface IntelligenceCenterProps {
  onBack?: () => void
  initialSection?: string
  initialCartridgeTab?: "voice" | "style" | "preferences" | "instructions" | "brand"
}

export function IntelligenceCenter({ onBack, initialSection = "overview", initialCartridgeTab }: IntelligenceCenterProps) {
  const [activeSection, setActiveSection] = useState(initialSection)
  const [chatFilter, setChatFilter] = useState<ChatFilterTab>("all")
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null)

  // Chat History — real data from Supabase
  const roleFilter = chatFilter === "chat" ? "user" as const : chatFilter === "ai" ? "assistant" as const : undefined
  const { data: sessionsData, isLoading: isLoadingSessions } = useChatSessions()
  const { data: messagesData, isLoading: isLoadingMessages } = useChatMessages(expandedSessionId, roleFilter)

  // Training Documents — real data from /api/v1/documents
  const { data: docsData, isLoading: isLoadingDocs } = useTrainingDocuments()
  const uploadDoc = useUploadTrainingDocument()
  const deleteDoc = useDeleteTrainingDocument()
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)

  // Custom Prompts — real data from /api/v1/prompts
  const { data: promptsData, isLoading: isLoadingPrompts } = useCustomPrompts()
  const createPrompt = useCreatePrompt()
  const updatePrompt = useUpdatePrompt()
  const deletePromptMutation = useDeletePrompt()
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<CustomPromptRow | null>(null)
  const [promptForm, setPromptForm] = useState({
    name: "",
    description: "",
    prompt: "",
    category: "other",
  })

  // Custom Prompts handlers
  const handleOpenPromptModal = (prompt?: CustomPromptRow) => {
    if (prompt) {
      setEditingPrompt(prompt)
      setPromptForm({
        name: prompt.name,
        description: prompt.description || "",
        prompt: prompt.prompt_template,
        category: prompt.category,
      })
    } else {
      setEditingPrompt(null)
      setPromptForm({
        name: "",
        description: "",
        prompt: "",
        category: "other",
      })
    }
    setIsPromptModalOpen(true)
  }

  const handleClosePromptModal = () => {
    setIsPromptModalOpen(false)
    setEditingPrompt(null)
    setPromptForm({
      name: "",
      description: "",
      prompt: "",
      category: "other",
    })
  }

  const handleSavePrompt = () => {
    if (!promptForm.name.trim() || !promptForm.prompt.trim()) return

    const input = {
      name: promptForm.name,
      description: promptForm.description,
      prompt_template: promptForm.prompt,
      category: promptForm.category,
    }

    if (editingPrompt) {
      updatePrompt.mutate({ id: editingPrompt.id, ...input }, {
        onSuccess: () => handleClosePromptModal(),
      })
    } else {
      createPrompt.mutate(input, {
        onSuccess: () => handleClosePromptModal(),
      })
    }
  }

  const handleDeletePrompt = (id: string) => {
    deletePromptMutation.mutate(id)
  }

  // Activity Feed — real data from /api/v1/activity (polls every 30s)
  const { data: activityItems, isLoading: isLoadingActivity } = useActivityFeed()

  // Note: Filtered activities are computed inline in the JSX for each session

  const aiCapabilities = [
    {
      icon: <MessageSquare className="w-5 h-5" />,
      title: "Client Communication",
      description: "Draft professional responses to client messages across Slack and email",
      primaryAction: "Try now",
      onPrimaryClick: () => setActiveSection("history"),
      accentColor: "blue" as const,
    },
    {
      icon: <FileSearch className="w-5 h-5" />,
      title: "Knowledge Search",
      description: "Search across all client documents, conversations, and notes instantly",
      primaryAction: "Search",
      onPrimaryClick: () => setActiveSection("training-data"),
      accentColor: "purple" as const,
    },
    {
      icon: <AlertTriangle className="w-5 h-5" />,
      title: "At-Risk Detection",
      description: "Automatically identify clients showing signs of churn or dissatisfaction",
      primaryAction: "View alerts",
      onPrimaryClick: () => setActiveSection("history"),
      accentColor: "pink" as const,
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      title: "Performance Insights",
      description: "Get AI-powered summaries of ad performance and optimization suggestions",
      primaryAction: "View insights",
      onPrimaryClick: () => setActiveSection("history"),
      accentColor: "green" as const,
    },
    {
      icon: <Zap className="w-5 h-5" />,
      title: "Workflow Automation",
      description: "Create intelligent automations that adapt to client behavior patterns",
      primaryAction: "Create workflow",
      onPrimaryClick: () => setActiveSection("prompts"),
      accentColor: "orange" as const,
    },
    {
      icon: <Target className="w-5 h-5" />,
      title: "Goal Tracking",
      description: "Monitor client goals and get proactive alerts when targets are at risk",
      primaryAction: "Set up goals",
      onPrimaryClick: () => setActiveSection("preferences"),
      accentColor: "blue" as const,
    },
  ]

  const dataSources = [
    {
      name: "Slack",
      description: "Connect to sync client conversations",
      icon: integrationIcons.slack,
      iconBgColor: "bg-[#4A154B]",
      connected: true,
    },
    {
      name: "Gmail",
      description: "Import client email threads",
      icon: integrationIcons.gmail,
      iconBgColor: "bg-[#EA4335]",
      connected: true,
    },
    {
      name: "Google Ads",
      description: "Sync campaign performance data",
      icon: integrationIcons.googleAds,
      iconBgColor: "bg-[#4285F4]",
      connected: false,
    },
    {
      name: "Meta Ads",
      description: "Import Facebook & Instagram ad data",
      icon: integrationIcons.meta,
      iconBgColor: "bg-[#1877F2]",
      connected: false,
    },
  ]

  return (
    <SettingsLayout
      title="Intelligence Center"
      description="AI-powered insights and automation for your agency"
      groups={intelligenceSettingsGroups}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      onBack={onBack}
    >
      {activeSection === "overview" && (
        <>
          <SettingsContentSection title="AI Capabilities">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {aiCapabilities.map((capability, index) => (
                <FeatureCard key={index} {...capability} />
              ))}
            </div>
          </SettingsContentSection>

          <SettingsContentSection
            title="Connected Data Sources"
            action={
              <button className="text-sm text-primary hover:text-primary/80 transition-colors cursor-pointer">
                Browse all integrations
              </button>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {dataSources.map((source, index) => (
                <IntegrationCard key={index} {...source} />
              ))}
            </div>
          </SettingsContentSection>
        </>
      )}

      {activeSection === "history" && (
        <SettingsContentSection title="Chat History">
          {/* Chat Filter Tabs */}
          <div className="flex items-center gap-1 mb-4 p-1 bg-secondary/50 rounded-lg w-fit">
            {[
              { id: "all" as const, label: "All", icon: <History className="w-3.5 h-3.5" /> },
              { id: "chat" as const, label: "Your Messages", icon: <User className="w-3.5 h-3.5" /> },
              { id: "ai" as const, label: "AI Responses", icon: <Bot className="w-3.5 h-3.5" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setChatFilter(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  chatFilter === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Loading state */}
          {isLoadingSessions && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-card border border-border rounded-lg overflow-hidden animate-pulse">
                  <div className="px-4 py-3 bg-secondary/30 border-b border-border">
                    <div className="h-4 bg-muted rounded w-1/3" />
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sessions from real data */}
          {!isLoadingSessions && sessionsData?.data && sessionsData.data.length > 0 && (
            <div className="space-y-3">
              {sessionsData.data.map((session) => {
                const isExpanded = expandedSessionId === session.id
                const sessionDate = session.last_message_at
                  ? new Date(session.last_message_at)
                  : new Date(session.created_at)
                const isToday = new Date().toDateString() === sessionDate.toDateString()
                const timeStr = sessionDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
                const dateStr = isToday ? `Today, ${timeStr}` : sessionDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + `, ${timeStr}`

                return (
                  <div key={session.id} className="bg-card border border-border rounded-lg overflow-hidden">
                    {/* Session Header — clickable to expand */}
                    <button
                      onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                      className="w-full px-4 py-2.5 bg-secondary/30 border-b border-border flex items-center justify-between hover:bg-secondary/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium text-foreground">
                          {session.title || "Untitled Chat"}
                        </span>
                        {session.is_active && (
                          <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-600">
                            Active
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">{dateStr}</span>
                    </button>

                    {/* Expanded: Show messages */}
                    {isExpanded && (
                      <div className="p-4">
                        {isLoadingMessages ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                            <span className="ml-2 text-xs text-muted-foreground">Loading messages...</span>
                          </div>
                        ) : messagesData?.data && messagesData.data.length > 0 ? (
                          <div className="space-y-3">
                            {messagesData.data.map((message) => (
                              <div key={message.id} className="flex gap-3">
                                {/* Avatar */}
                                <div
                                  className={cn(
                                    "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium text-white shrink-0 mt-0.5",
                                    message.role === "user" ? "bg-blue-600" : "bg-primary"
                                  )}
                                >
                                  {message.role === "user" ? (
                                    <User className="w-3.5 h-3.5" />
                                  ) : (
                                    <Bot className="w-3.5 h-3.5" />
                                  )}
                                </div>
                                {/* Message content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-xs font-medium">
                                      {message.role === "user" ? "You" : "AI Assistant"}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {new Date(message.created_at).toLocaleTimeString("en-US", {
                                        hour: "numeric",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                    {message.route_used && (
                                      <Badge variant="outline" className="text-[9px] h-4 px-1">
                                        {message.route_used}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                                    {message.content}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            No messages match this filter.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Empty state — no sessions at all */}
          {!isLoadingSessions && (!sessionsData?.data || sessionsData.data.length === 0) && (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <History className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm font-medium mb-1">No chat sessions yet</p>
              <p className="text-xs text-muted-foreground">
                Start a conversation with the AI assistant to see your history here.
              </p>
            </div>
          )}
        </SettingsContentSection>
      )}

      {activeSection === "activity" && (
        <SettingsContentSection title="Activity">
          <div className="h-[500px]">
            {isLoadingActivity ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : activityItems && activityItems.length > 0 ? (
              <FirehoseFeed
                items={activityItems}
                onItemClick={(item) => {
                  if (item.targetTab === "alerts") {
                    setActiveSection("history")
                  }
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Zap className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            )}
          </div>
        </SettingsContentSection>
      )}

      {activeSection === "cartridges" && (
        <SettingsContentSection title="Training Cartridges">
          <CartridgesPage initialTab={initialCartridgeTab} />
        </SettingsContentSection>
      )}

      {activeSection === "prompts" && (
        <SettingsContentSection
          title="Custom Prompts"
          action={
            <Button size="sm" onClick={() => handleOpenPromptModal()} className="h-7 gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              New Prompt
            </Button>
          }
        >
          {/* Loading state */}
          {isLoadingPrompts && (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="bg-card border border-border rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3 mb-2" />
                  <div className="h-6 bg-muted rounded w-full" />
                </div>
              ))}
            </div>
          )}

          {!isLoadingPrompts && promptsData?.data && promptsData.data.length > 0 ? (
            <div className="space-y-3">
              {promptsData.data.map((prompt) => (
                <div
                  key={prompt.id}
                  onClick={() => handleOpenPromptModal(prompt)}
                  className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium">{prompt.name}</h4>
                        <Badge variant="secondary" className="text-[10px]">
                          {PROMPT_CATEGORIES.find((c) => c.value === prompt.category)?.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{prompt.description}</p>
                      <p className="text-xs text-muted-foreground/70 font-mono bg-secondary/50 px-2 py-1 rounded truncate">
                        {prompt.prompt_template}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenPromptModal(prompt)
                        }}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        disabled={deletePromptMutation.isPending}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeletePrompt(prompt.id)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : !isLoadingPrompts ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <FileSearch className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Custom Prompts</h3>
              <p className="text-muted-foreground mb-4">
                Create reusable AI prompts for your agency workflows.
              </p>
              <Button onClick={() => handleOpenPromptModal()} className="gap-1.5">
                <Plus className="h-4 w-4" />
                Create Your First Prompt
              </Button>
            </div>
          ) : null}

          {/* Prompt Modal */}
          <Dialog open={isPromptModalOpen} onOpenChange={handleClosePromptModal}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-[14px] font-semibold">
                  {editingPrompt ? "Edit Prompt" : "Create New Prompt"}
                </DialogTitle>
                <DialogDescription className="text-[11px]">
                  {editingPrompt
                    ? "Update your custom prompt template."
                    : "Create a reusable prompt template for AI interactions."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-medium">Name</label>
                  <Input
                    placeholder="e.g., Client Status Summary"
                    value={promptForm.name}
                    onChange={(e) => setPromptForm({ ...promptForm, name: e.target.value })}
                    className="h-8 text-[12px]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-medium">Description</label>
                  <Input
                    placeholder="Brief description of what this prompt does"
                    value={promptForm.description}
                    onChange={(e) => setPromptForm({ ...promptForm, description: e.target.value })}
                    className="h-8 text-[12px]"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-medium">Category</label>
                  <div className="flex flex-wrap gap-2">
                    {PROMPT_CATEGORIES.map((cat) => (
                      <button
                        key={cat.value}
                        onClick={() =>
                          setPromptForm({ ...promptForm, category: cat.value })
                        }
                        className={cn(
                          "px-3 py-1.5 text-[11px] rounded-md transition-colors cursor-pointer",
                          promptForm.category === cat.value
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-medium">Prompt Template</label>
                  <Textarea
                    placeholder="Enter your prompt template. Use {{variable_name}} for dynamic values."
                    value={promptForm.prompt}
                    onChange={(e) => setPromptForm({ ...promptForm, prompt: e.target.value })}
                    rows={4}
                    className="text-[12px] font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Tip: Use {"{{client_name}}"} or {"{{campaign_name}}"} as placeholders.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={handleClosePromptModal} className="h-8 text-[11px]">
                  Cancel
                </Button>
                <Button
                  onClick={handleSavePrompt}
                  disabled={!promptForm.name.trim() || !promptForm.prompt.trim() || createPrompt.isPending || updatePrompt.isPending}
                  className="h-8 text-[11px]"
                >
                  {(createPrompt.isPending || updatePrompt.isPending) ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : null}
                  {editingPrompt ? "Save Changes" : "Create Prompt"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </SettingsContentSection>
      )}

      {activeSection === "training-data" && (
        <SettingsContentSection
          title="AI Training Data"
          action={
            <Button size="sm" onClick={() => setIsUploadModalOpen(true)} className="h-7 gap-1.5" disabled={uploadDoc.isPending}>
              {uploadDoc.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Upload
            </Button>
          }
        >
          <p className="text-xs text-muted-foreground mb-4">
            Documents uploaded here are indexed by the AI for reference during conversations.
          </p>

          {/* Loading state */}
          {isLoadingDocs && (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg animate-pulse">
                  <div className="w-8 h-8 rounded-md bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoadingDocs && docsData?.data && docsData.data.length > 0 ? (
            <div className="space-y-2">
              {docsData.data.map((doc) => {
                const mimeType = doc.mime_type || ""
                const isDocx = mimeType.includes("document") || mimeType.includes("msword")
                const isPdf = mimeType.includes("pdf")
                const isMd = doc.file_name?.endsWith(".md")
                const fileSizeStr = doc.file_size
                  ? doc.file_size > 1024 * 1024
                    ? `${(doc.file_size / (1024 * 1024)).toFixed(1)} MB`
                    : `${(doc.file_size / 1024).toFixed(0)} KB`
                  : "Unknown"

                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors"
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-md flex items-center justify-center text-xs font-medium",
                        isPdf && "bg-red-500/10 text-red-500",
                        isDocx && "bg-blue-500/10 text-blue-500",
                        isMd && "bg-purple-500/10 text-purple-500",
                        !isPdf && !isDocx && !isMd && "bg-gray-500/10 text-gray-500"
                      )}
                    >
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.title || doc.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {fileSizeStr} • {new Date(doc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.index_status === "indexed" && (
                        <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-600 gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Indexed
                        </Badge>
                      )}
                      {doc.index_status === "indexing" && (
                        <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-600 gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Indexing
                        </Badge>
                      )}
                      {doc.index_status === "pending" && (
                        <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600">
                          Pending
                        </Badge>
                      )}
                      {doc.index_status === "failed" && (
                        <Badge variant="secondary" className="text-[10px] bg-red-500/10 text-red-600">
                          Failed
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        disabled={deleteDoc.isPending}
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteDoc.mutate(doc.id)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : !isLoadingDocs ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <FileSearch className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Training Data</h3>
              <p className="text-muted-foreground mb-4">
                Upload documents to train the AI on your agency-specific knowledge.
              </p>
              <Button onClick={() => setIsUploadModalOpen(true)} className="gap-1.5">
                <Upload className="h-4 w-4" />
                Upload First Document
              </Button>
            </div>
          ) : null}

          {/* Upload Modal — real file input */}
          <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-[14px] font-semibold">Upload Training Document</DialogTitle>
                <DialogDescription className="text-[11px]">
                  Upload documents for AI to reference during conversations.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                <label
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer block"
                >
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.md"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        uploadDoc.mutate(file, {
                          onSuccess: () => setIsUploadModalOpen(false),
                        })
                      }
                    }}
                  />
                  {uploadDoc.isPending ? (
                    <>
                      <Loader2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground animate-spin" />
                      <p className="text-sm text-muted-foreground">Uploading...</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mb-1">
                        Click to select a file
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PDF, DOCX, TXT, MD (max 50MB)
                      </p>
                    </>
                  )}
                </label>
                {uploadDoc.isError && (
                  <p className="text-xs text-destructive mt-2">{uploadDoc.error.message}</p>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsUploadModalOpen(false)} className="h-8 text-[11px]" disabled={uploadDoc.isPending}>
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </SettingsContentSection>
      )}

      {/* Memory Management */}
      {activeSection === "memory" && (
        <SettingsContentSection title="AI Memory">
          <p className="text-xs text-muted-foreground mb-4">
            View and manage what the AI remembers across conversations. Memories are automatically created from decisions, preferences, and important discussions.
          </p>
          <MemoryPanel />
        </SettingsContentSection>
      )}

      {!["overview", "chat", "activity", "cartridges", "prompts", "training-data", "history", "memory"].includes(activeSection) && (
        <SettingsContentSection title="Coming Soon">
          <div className="bg-card border border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">
              This section is under development.
            </p>
          </div>
        </SettingsContentSection>
      )}
    </SettingsLayout>
  )
}
