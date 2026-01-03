"use client"

import React, { useState, useMemo } from "react"
import {
  SettingsLayout,
  SettingsContentSection,
  FeatureCard,
  IntegrationCard,
  integrationIcons,
  intelligenceSettingsGroups,
} from "@/components/linear"
import {
  FirehoseFeed,
  type FirehoseItemData,
} from "@/components/dashboard"
import { cn } from "@/lib/utils"
import { CartridgesPage } from "@/components/cartridges"
import { ChatInterface } from "@/components/chat/chat-interface"
import { useAuth } from "@/hooks/use-auth"
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
} from "lucide-react"

// Types for Training Data
interface TrainingDocument {
  id: string
  name: string
  type: "pdf" | "docx" | "txt" | "md"
  size: string
  uploadedAt: string
  status: "indexed" | "pending" | "failed"
}

// Types for Custom Prompts
interface CustomPrompt {
  id: string
  name: string
  description: string
  prompt: string
  category: "communication" | "analysis" | "automation" | "other"
  createdAt: string
  updatedAt: string
}

// Mock training documents
const mockTrainingDocs: TrainingDocument[] = [
  {
    id: "td-1",
    name: "Agency SOPs.pdf",
    type: "pdf",
    size: "2.4 MB",
    uploadedAt: "2024-01-10",
    status: "indexed",
  },
  {
    id: "td-2",
    name: "Client Communication Guidelines.docx",
    type: "docx",
    size: "456 KB",
    uploadedAt: "2024-01-08",
    status: "indexed",
  },
  {
    id: "td-3",
    name: "Ad Platform Best Practices.md",
    type: "md",
    size: "128 KB",
    uploadedAt: "2024-01-05",
    status: "pending",
  },
]

// Mock custom prompts
const mockPrompts: CustomPrompt[] = [
  {
    id: "p-1",
    name: "Client Status Summary",
    description: "Generate a weekly status summary for a client",
    prompt: "Summarize the past week's performance for {{client_name}}, including key metrics, wins, and areas for improvement. Keep it concise and actionable.",
    category: "communication",
    createdAt: "2024-01-10",
    updatedAt: "2024-01-10",
  },
  {
    id: "p-2",
    name: "Ad Performance Analysis",
    description: "Analyze ad campaign performance and suggest optimizations",
    prompt: "Analyze the performance of {{campaign_name}} campaign. Identify top performing ads, underperformers, and provide 3-5 specific optimization recommendations.",
    category: "analysis",
    createdAt: "2024-01-08",
    updatedAt: "2024-01-09",
  },
]

const PROMPT_CATEGORIES = [
  { value: "communication", label: "Communication" },
  { value: "analysis", label: "Analysis" },
  { value: "automation", label: "Automation" },
  { value: "other", label: "Other" },
]

// Generate mock firehose items for Intelligence Center Activity
function generateMockActivityFirehose(): FirehoseItemData[] {
  const now = new Date()
  const items: FirehoseItemData[] = [
    {
      id: "task-1",
      severity: "warning" as const,
      title: "Review Weekly Report",
      description: "V Shred weekly performance report ready for review",
      timestamp: new Date(now.getTime() - 30 * 60 * 1000),
      clientName: "V Shred",
      assignee: "Sarah",
      targetTab: "tasks" as const,
    },
    {
      id: "task-2",
      severity: "info" as const,
      title: "Approve Draft Reply",
      description: "AI drafted response to Allbirds iOS tracking question",
      timestamp: new Date(now.getTime() - 60 * 60 * 1000),
      clientName: "Allbirds",
      assignee: "Luke",
      targetTab: "tasks" as const,
    },
    {
      id: "alert-1",
      severity: "critical" as const,
      title: "Client at Risk",
      description: "Beardbrand needs immediate attention - Conversion tracking broken",
      timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      clientName: "Beardbrand",
      targetTab: "alerts" as const,
    },
    {
      id: "alert-2",
      severity: "critical" as const,
      title: "Client at Risk",
      description: "Brooklinen needs immediate attention - Theme compatibility issues",
      timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      clientName: "Brooklinen",
      targetTab: "alerts" as const,
    },
    {
      id: "client-1",
      severity: "warning" as const,
      title: "Needs Attention",
      description: "V Shred - review recommended",
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      clientName: "V Shred",
      targetTab: "clients" as const,
    },
    {
      id: "client-2",
      severity: "info" as const,
      title: "Stage Move",
      description: "Beardbrand moved to Needs Support",
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      clientName: "Beardbrand",
      targetTab: "clients" as const,
    },
    {
      id: "perf-1",
      severity: "critical" as const,
      title: "Budget Cap Hit",
      description: "Beardbrand hit daily budget cap at 2PM. Campaigns paused.",
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000),
      clientName: "Beardbrand",
      targetTab: "performance" as const,
    },
    {
      id: "perf-2",
      severity: "warning" as const,
      title: "ROAS Dropped 10%",
      description: "Brooklinen ROAS decreased from 3.2 to 2.9 this week",
      timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000),
      clientName: "Brooklinen",
      targetTab: "performance" as const,
    },
    {
      id: "client-3",
      severity: "info" as const,
      title: "Installation Complete",
      description: "RTA Outdoor Living installation finished, awaiting DNS",
      timestamp: new Date(now.getTime() - 20 * 60 * 60 * 1000),
      clientName: "RTA Outdoor Living",
      targetTab: "clients" as const,
    },
    {
      id: "task-3",
      severity: "info" as const,
      title: "Monthly Report Due",
      description: "MVMT Watches monthly performance report due tomorrow",
      timestamp: new Date(now.getTime() - 22 * 60 * 60 * 1000),
      clientName: "MVMT Watches",
      assignee: "Josh",
      targetTab: "tasks" as const,
    },
  ]
  return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
}

interface IntelligenceCenterProps {
  onBack?: () => void
}

export function IntelligenceCenter({ onBack }: IntelligenceCenterProps) {
  const [activeSection, setActiveSection] = useState("overview")
  const { agencyId, isLoading: authLoading } = useAuth()

  // Training Data state
  const [trainingDocs, setTrainingDocs] = useState<TrainingDocument[]>(mockTrainingDocs)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)

  // Custom Prompts state
  const [prompts, setPrompts] = useState<CustomPrompt[]>(mockPrompts)
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false)
  const [editingPrompt, setEditingPrompt] = useState<CustomPrompt | null>(null)
  const [promptForm, setPromptForm] = useState({
    name: "",
    description: "",
    prompt: "",
    category: "other" as CustomPrompt["category"],
  })

  // Training Data handlers
  const handleDeleteTrainingDoc = (id: string) => {
    setTrainingDocs((prev) => prev.filter((doc) => doc.id !== id))
  }

  const handleUploadComplete = () => {
    // Simulate adding a new document
    const newDoc: TrainingDocument = {
      id: `td-${Date.now()}`,
      name: "New Document.pdf",
      type: "pdf",
      size: "1.2 MB",
      uploadedAt: new Date().toISOString().split("T")[0],
      status: "pending",
    }
    setTrainingDocs((prev) => [newDoc, ...prev])
    setIsUploadModalOpen(false)
  }

  // Custom Prompts handlers
  const handleOpenPromptModal = (prompt?: CustomPrompt) => {
    if (prompt) {
      setEditingPrompt(prompt)
      setPromptForm({
        name: prompt.name,
        description: prompt.description,
        prompt: prompt.prompt,
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

    if (editingPrompt) {
      // Update existing prompt
      setPrompts((prev) =>
        prev.map((p) =>
          p.id === editingPrompt.id
            ? {
                ...p,
                ...promptForm,
                updatedAt: new Date().toISOString().split("T")[0],
              }
            : p
        )
      )
    } else {
      // Create new prompt
      const newPrompt: CustomPrompt = {
        id: `p-${Date.now()}`,
        ...promptForm,
        createdAt: new Date().toISOString().split("T")[0],
        updatedAt: new Date().toISOString().split("T")[0],
      }
      setPrompts((prev) => [newPrompt, ...prev])
    }
    handleClosePromptModal()
  }

  const handleDeletePrompt = (id: string) => {
    setPrompts((prev) => prev.filter((p) => p.id !== id))
  }

  // Generate firehose items for Activity feed
  const firehoseItems = useMemo(() => generateMockActivityFirehose(), [])

  const aiCapabilities = [
    {
      icon: <MessageSquare className="w-5 h-5" />,
      title: "Client Communication",
      description: "Draft professional responses to client messages across Slack and email",
      primaryAction: "Try now",
      onPrimaryClick: () => setActiveSection("chat"),
      accentColor: "blue" as const,
    },
    {
      icon: <FileSearch className="w-5 h-5" />,
      title: "Knowledge Search",
      description: "Search across all client documents, conversations, and notes instantly",
      primaryAction: "Search",
      onPrimaryClick: () => setActiveSection("knowledge"),
      accentColor: "purple" as const,
    },
    {
      icon: <AlertTriangle className="w-5 h-5" />,
      title: "At-Risk Detection",
      description: "Automatically identify clients showing signs of churn or dissatisfaction",
      primaryAction: "View alerts",
      onPrimaryClick: () => setActiveSection("chat"),
      accentColor: "pink" as const,
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      title: "Performance Insights",
      description: "Get AI-powered summaries of ad performance and optimization suggestions",
      primaryAction: "View insights",
      onPrimaryClick: () => setActiveSection("chat"),
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

      {activeSection === "chat" && (
        <SettingsContentSection title="Chat">
          {authLoading ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : agencyId ? (
            <ChatInterface agencyId={agencyId} />
          ) : (
            <div className="bg-card border border-border rounded-lg p-8 text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Authentication Required</h3>
              <p className="text-muted-foreground mb-4">
                Please sign in to use the chat interface.
              </p>
              <button
                onClick={() => window.location.href = "/login"}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Sign In
              </button>
            </div>
          )}
        </SettingsContentSection>
      )}

      {activeSection === "activity" && (
        <SettingsContentSection title="Activity">
          <div className="h-[500px]">
            <FirehoseFeed
              items={firehoseItems}
              onItemClick={(item) => {
                // Navigate to appropriate section based on target tab
                if (item.targetTab === "alerts") {
                  setActiveSection("chat")
                }
              }}
            />
          </div>
        </SettingsContentSection>
      )}

      {activeSection === "cartridges" && (
        <SettingsContentSection title="Cartridges">
          <CartridgesPage />
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
          {prompts.length > 0 ? (
            <div className="space-y-3">
              {prompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-colors"
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
                        {prompt.prompt}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleOpenPromptModal(prompt)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDeletePrompt(prompt.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
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
          )}

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
                          setPromptForm({ ...promptForm, category: cat.value as CustomPrompt["category"] })
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
                  disabled={!promptForm.name.trim() || !promptForm.prompt.trim()}
                  className="h-8 text-[11px]"
                >
                  {editingPrompt ? "Save Changes" : "Create Prompt"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </SettingsContentSection>
      )}

      {activeSection === "knowledge" && (
        <SettingsContentSection
          title="AI Training Data"
          action={
            <Button size="sm" onClick={() => setIsUploadModalOpen(true)} className="h-7 gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              Upload
            </Button>
          }
        >
          <p className="text-xs text-muted-foreground mb-4">
            Upload documents for AI to reference. This is separate from the main Knowledge Base.
          </p>

          {trainingDocs.length > 0 ? (
            <div className="space-y-2">
              {trainingDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors"
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-md flex items-center justify-center text-xs font-medium",
                      doc.type === "pdf" && "bg-red-500/10 text-red-500",
                      doc.type === "docx" && "bg-blue-500/10 text-blue-500",
                      doc.type === "txt" && "bg-gray-500/10 text-gray-500",
                      doc.type === "md" && "bg-purple-500/10 text-purple-500"
                    )}
                  >
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.size} • Uploaded {doc.uploadedAt}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.status === "indexed" && (
                      <Badge variant="secondary" className="text-[10px] bg-green-500/10 text-green-600 gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Indexed
                      </Badge>
                    )}
                    {doc.status === "pending" && (
                      <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600">
                        Pending
                      </Badge>
                    )}
                    {doc.status === "failed" && (
                      <Badge variant="secondary" className="text-[10px] bg-red-500/10 text-red-600">
                        Failed
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteTrainingDoc(doc.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
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
          )}

          {/* Upload Modal */}
          <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-[14px] font-semibold">Upload Training Document</DialogTitle>
                <DialogDescription className="text-[11px]">
                  Upload documents for AI to reference during conversations.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                <div
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer"
                  onClick={() => {
                    // Trigger file input (simulated)
                    handleUploadComplete()
                  }}
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF, DOCX, TXT, MD (max 10MB)
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsUploadModalOpen(false)} className="h-8 text-[11px]">
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </SettingsContentSection>
      )}

      {!["overview", "chat", "activity", "cartridges", "prompts", "knowledge"].includes(activeSection) && (
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
