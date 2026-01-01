"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import {
  ExternalLink,
  Plus,
  FileText,
  CheckCircle2,
  Circle,
  AlertCircle,
  Sparkles,
  Video,
  LinkIcon,
  Mail,
  Send,
  Copy,
  Play,
  Eye,
  EyeOff,
  TrendingUp,
} from "lucide-react"
import { mockClients, type Client } from "@/lib/mock-data"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"

interface OnboardingHubViewProps {
  onClientClick?: (client: Client, tab?: string) => void
}

export function OnboardingHubView({ onClientClick }: OnboardingHubViewProps) {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<"active" | "journey" | "builder">("active")
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [showTriggerDialog, setShowTriggerDialog] = useState(false)
  const [newClientName, setNewClientName] = useState("")
  const [newClientEmail, setNewClientEmail] = useState("")
  const [newClientTier, setNewClientTier] = useState<"Enterprise" | "Core" | "Starter">("Core")

  const [viewMode, setViewMode] = useState<"agency" | "client">("agency")

  const handleViewAsClient = () => {
    setViewMode(viewMode === "agency" ? "client" : "agency")
  }

  const onboardingClients = mockClients.filter((c) => c.onboardingData)

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client)
  }

  const handleTriggerOnboarding = () => {
    if (!newClientName || !newClientEmail) {
      toast({
        title: "Missing Information",
        description: "Please enter both client name and email",
        variant: "destructive",
      })
      return
    }

    toast({
      title: "Onboarding Triggered",
      description: `Welcome email sent to ${newClientEmail} with onboarding portal link`,
    })

    setShowTriggerDialog(false)
    setNewClientName("")
    setNewClientEmail("")
    setNewClientTier("Core")
  }

  const handleCopyLink = () => {
    const link = `${window.location.origin}/onboarding/start`
    navigator.clipboard.writeText(link)
    toast({
      title: "Link Copied",
      description: "Onboarding portal link copied to clipboard",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Onboarding & Intake Hub</h1>
          <p className="text-muted-foreground">Manage client onboarding pipeline and intake forms</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowTriggerDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Trigger Onboarding
          </Button>
          <Button onClick={handleCopyLink} variant="outline" className="gap-2 bg-transparent">
            <Copy className="h-4 w-4" />
            Copy Portal Link
          </Button>
          <Button onClick={handleViewAsClient} variant="outline" className="gap-2 bg-transparent">
            {viewMode === "agency" ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {viewMode === "agency" ? "View as Client" : "Back to Agency View"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab("active")}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            activeTab === "active" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Active Onboardings
          {activeTab === "active" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
        <button
          onClick={() => setActiveTab("journey")}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            activeTab === "journey" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Client Journey
          {activeTab === "journey" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
        <button
          onClick={() => setActiveTab("builder")}
          className={`px-4 py-2 text-sm font-medium transition-colors relative ${
            activeTab === "builder" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Form Builder
          {activeTab === "builder" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
        </button>
      </div>

      {/* Content */}
      {activeTab === "active" ? (
        <ActiveOnboardingsTab
          clients={onboardingClients}
          selectedClient={selectedClient}
          onClientSelect={handleClientSelect}
          onClientClick={onClientClick}
        />
      ) : activeTab === "journey" ? (
        <ClientJourneyTab viewMode={viewMode} />
      ) : (
        <FormBuilderTab />
      )}

      <Dialog open={showTriggerDialog} onOpenChange={setShowTriggerDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Trigger New Client Onboarding</DialogTitle>
            <DialogDescription>
              Send onboarding portal link to a new client to begin their intake process
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name</Label>
              <Input
                id="clientName"
                placeholder="Enter client or company name"
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientEmail">Primary Contact Email</Label>
              <Input
                id="clientEmail"
                type="email"
                placeholder="contact@clientcompany.com"
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientTier">Client Tier</Label>
              <Select value={newClientTier} onValueChange={(v) => setNewClientTier(v as "Enterprise" | "Core" | "Starter")}>
                <SelectTrigger id="clientTier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Starter">Starter</SelectItem>
                  <SelectItem value="Core">Core</SelectItem>
                  <SelectItem value="Enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Card className="p-4 bg-muted/30">
              <div className="flex gap-3">
                <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm space-y-1">
                  <p className="font-medium">What happens next?</p>
                  <p className="text-muted-foreground">
                    Client will receive a welcome email with a personalized onboarding portal link to complete their
                    intake form and grant access to their accounts.
                  </p>
                </div>
              </div>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTriggerDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleTriggerOnboarding} className="gap-2">
              <Send className="h-4 w-4" />
              Send Onboarding Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Active Onboardings Tab
function ActiveOnboardingsTab({
  clients,
  selectedClient,
  onClientSelect,
  onClientClick,
}: {
  clients: Client[]
  selectedClient: Client | null
  onClientSelect: (client: Client) => void
  onClientClick?: (client: Client, tab?: string) => void
}) {
  const stages = [
    { id: "intake", label: "Intake Received", icon: FileText },
    { id: "access", label: "Access Verified", icon: CheckCircle2 },
    { id: "pixel", label: "Pixel Install", icon: Sparkles },
    { id: "audit", label: "Audit Complete", icon: LinkIcon },
    { id: "live", label: "Live Support", icon: CheckCircle2 },
  ]

  const getStageStatus = (client: Client, stageId: string) => {
    if (stageId === "intake") {
      return "complete"
    }

    if (stageId === "access") {
      const { metaAccessVerified, gtmAccessVerified, shopifyAccessVerified } = client.onboardingData || {}
      if (metaAccessVerified && gtmAccessVerified && shopifyAccessVerified) return "complete"
      if (!metaAccessVerified || !gtmAccessVerified || !shopifyAccessVerified) return "error"
      return "pending"
    }

    if (stageId === "pixel") {
      if (client.stage === "Installation") return "active"
      if (client.stage === "Audit" || client.stage === "Live") return "complete"
      return "pending"
    }

    if (stageId === "audit") {
      if (client.stage === "Audit") return "active"
      if (client.stage === "Live") return "complete"
      return "pending"
    }

    if (stageId === "live") {
      if (client.stage === "Live") return "complete"
      return "pending"
    }

    return "pending"
  }

  const handleStageClick = (client: Client, stageId: string, e: React.MouseEvent) => {
    e.stopPropagation()

    // Navigate to appropriate tab based on stage
    if (stageId === "access") {
      onClientClick?.(client, "techsetup")
    } else {
      onClientSelect(client)
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Client Pipeline Cards */}
      <div className="xl:col-span-2 space-y-4">
        {clients.map((client) => {
          const isSelected = selectedClient?.id === client.id
          return (
            <Card
              key={client.id}
              className={`p-6 cursor-pointer transition-colors ${
                isSelected ? "border-primary ring-1 ring-primary" : "hover:border-muted-foreground/50"
              }`}
              onClick={() => onClientSelect(client)}
            >
              {/* Client Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 bg-muted">
                    <AvatarFallback className="bg-muted text-foreground font-semibold">{client.logo}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-foreground">{client.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {client.tier}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{client.daysInStage}d in stage</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6 bg-muted border border-border">
                    <AvatarFallback className="bg-muted text-foreground text-xs">{client.owner[0]}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">{client.owner}</span>
                </div>
              </div>

              {/* Workflow Stages */}
              <div className="flex items-center gap-2">
                {stages.map((stage, idx) => {
                  const status = getStageStatus(client, stage.id)
                  const StageIcon = stage.icon
                  return (
                    <div key={stage.id} className="flex items-center flex-1">
                      <div
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border flex-1 cursor-pointer hover:opacity-80 transition-opacity ${
                          status === "complete"
                            ? "bg-emerald-500/10 border-emerald-500/50"
                            : status === "error"
                              ? "bg-rose-500/10 border-rose-500/50"
                              : status === "active"
                                ? "bg-blue-500/10 border-blue-500/50"
                                : "bg-muted/50 border-border"
                        }`}
                        onClick={(e) => handleStageClick(client, stage.id, e)}
                      >
                        {status === "complete" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        ) : status === "error" ? (
                          <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="text-xs font-medium truncate">{stage.label}</span>
                        {stage.id === "access" && status === "error" && (
                          <div className="flex gap-1 ml-auto">
                            {!client.onboardingData?.metaAccessVerified && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 border-rose-500/50">
                                FB
                              </Badge>
                            )}
                            {!client.onboardingData?.gtmAccessVerified && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 border-rose-500/50">
                                GA
                              </Badge>
                            )}
                            {!client.onboardingData?.shopifyAccessVerified && (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 border-rose-500/50">
                                SH
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Connector */}
                      {idx < stages.length - 1 && <div className="h-px w-4 bg-border shrink-0" />}
                    </div>
                  )
                })}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Client Journey Panel */}
      {selectedClient ? (
        <div className="space-y-4">
          <ClientJourneyPanel client={selectedClient} onClientClick={onClientClick} />
        </div>
      ) : (
        <Card className="p-8 flex items-center justify-center h-64">
          <p className="text-muted-foreground text-center">Select a client to view their journey</p>
        </Card>
      )}
    </div>
  )
}

// Client Journey Panel
function ClientJourneyPanel({
  client,
  onClientClick,
}: {
  client: Client
  onClientClick?: (client: Client, tab?: string) => void
}) {
  return (
    <Card className="p-6 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="h-6 w-6 bg-muted border border-border">
            <AvatarFallback className="bg-muted text-foreground text-xs">{client.owner[0]}</AvatarFallback>
          </Avatar>
          <span className="text-sm text-muted-foreground">{client.owner}</span>
        </div>
        <h3 className="font-semibold text-lg">Client Journey</h3>
      </div>

      {/* Welcome Video */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Welcome Video</span>
          </div>
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/50">
            Completed
          </Badge>
        </div>
        <Card className="p-4 bg-muted/30">
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
                <Video className="h-6 w-6 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">Welcome Video Placeholder</p>
              <p className="text-xs text-muted-foreground">Watched by client on Dec 1</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Intake Form */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Intake Form</span>
          </div>
          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/50">
            Submitted
          </Badge>
        </div>
        <Card className="p-4 bg-muted/30 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Submitted:</span>
            <span className="text-foreground">{client.onboardingData?.submittedAt}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shopify URL:</span>
            <span className="text-foreground font-mono text-xs">{client.onboardingData?.shopifyUrl}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Contact:</span>
            <span className="text-foreground text-xs">{client.onboardingData?.contactEmail}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2 bg-transparent"
            onClick={() => onClientClick?.(client, "techsetup")}
          >
            <ExternalLink className="h-3 w-3 mr-2" />
            View Full Details
          </Button>
        </Card>
      </div>

      {/* Access Grant */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Access Grant</span>
          </div>
          <Badge
            variant="outline"
            className={
              client.onboardingData?.metaAccessVerified &&
              client.onboardingData?.gtmAccessVerified &&
              client.onboardingData?.shopifyAccessVerified
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/50"
                : "bg-amber-500/10 text-amber-600 border-amber-500/50"
            }
          >
            {client.onboardingData?.metaAccessVerified &&
            client.onboardingData?.gtmAccessVerified &&
            client.onboardingData?.shopifyAccessVerified
              ? "Connected"
              : "Pending"}
          </Badge>
        </div>
        <Card className="p-4 bg-muted/30 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Meta Ads Manager</span>
            {client.onboardingData?.metaAccessVerified ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Google Tag Manager</span>
            {client.onboardingData?.gtmAccessVerified ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Shopify Admin</span>
            {client.onboardingData?.shopifyAccessVerified ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </Card>
      </div>

      {/* AI Brand Guide Generation - Placeholder for future */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">AI Brand Guide Generation</span>
        </div>
        <Card className="p-4 bg-muted/30">
          <p className="text-xs text-muted-foreground text-center py-2">
            AI analysis will appear here once intake form is complete
          </p>
        </Card>
      </div>
    </Card>
  )
}

// Form Builder Tab
function FormBuilderTab() {
  const [formFields, setFormFields] = useState([
    {
      id: "1",
      label: "Business Name",
      placeholder: "Your company or brand name",
      required: true,
    },
    {
      id: "2",
      label: "Shopify Store URL",
      placeholder: "yourstore.myshopify.com",
      required: true,
    },
    {
      id: "3",
      label: "Primary Contact Email",
      placeholder: "contact@yourbrand.com",
      required: true,
    },
    {
      id: "4",
      label: "Monthly Ad Budget",
      placeholder: "e.g., $10,000 - $50,000",
      required: true,
    },
    {
      id: "5",
      label: "Facebook Ad Account ID",
      placeholder: "act_123456789",
      required: true,
    },
    {
      id: "6",
      label: "Google Ads Customer ID",
      placeholder: "123-456-7890",
      required: true,
    },
    {
      id: "7",
      label: "Google Tag Manager Container ID",
      placeholder: "GTM-XXXXXX",
      required: true,
    },
    {
      id: "8",
      label: "Meta Pixel ID",
      placeholder: "1234567890123456",
      required: true,
    },
    {
      id: "9",
      label: "Klaviyo API Key (if applicable)",
      placeholder: "pk_xxxxxxxxxxxx",
      required: false,
    },
    {
      id: "10",
      label: "Target Audience Description",
      placeholder: "Who are your ideal customers?",
      required: true,
    },
  ])

  const handleToggleRequired = (fieldId: string) => {
    setFormFields((prev) =>
      prev.map((field) => (field.id === fieldId ? { ...field, required: !field.required } : field)),
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-2">Intake Form Fields</h2>
        <p className="text-sm text-muted-foreground mb-4">Customize the questions clients answer during onboarding</p>

        {/* Form Fields List */}
        <div className="space-y-3">
          {formFields.map((field) => (
            <div key={field.id} className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border border-border">
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1">Field Label</Label>
                  <Input
                    value={field.label}
                    className="h-9 bg-background"
                    onChange={(e) =>
                      setFormFields((prev) =>
                        prev.map((f) => (f.id === field.id ? { ...f, label: e.target.value } : f)),
                      )
                    }
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1">Placeholder Text</Label>
                  <Input
                    value={field.placeholder}
                    className="h-9 bg-background"
                    onChange={(e) =>
                      setFormFields((prev) =>
                        prev.map((f) => (f.id === field.id ? { ...f, placeholder: e.target.value } : f)),
                      )
                    }
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={field.required} onCheckedChange={() => handleToggleRequired(field.id)} />
                <Label className="text-sm text-muted-foreground">Required</Label>
              </div>
            </div>
          ))}
        </div>

        <Button variant="outline" className="w-full mt-4 gap-2 bg-transparent">
          <Plus className="h-4 w-4" />
          Add Field
        </Button>
      </Card>

      {/* Preview Section */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-2">Form Preview</h2>
        <p className="text-sm text-muted-foreground mb-4">This is how the form will appear to clients</p>
        <div className="bg-muted/30 rounded-lg p-6 space-y-4">
          {formFields.slice(0, 3).map((field) => (
            <div key={field.id}>
              <Label className="text-sm mb-2 flex items-center gap-1">
                {field.label}
                {field.required && <span className="text-rose-500">*</span>}
              </Label>
              <Input placeholder={field.placeholder} className="bg-background" disabled />
            </div>
          ))}
          <p className="text-xs text-muted-foreground text-center pt-2">+ {formFields.length - 3} more fields...</p>
        </div>
      </Card>
    </div>
  )
}

function ClientJourneyTab({ viewMode }: { viewMode: "agency" | "client" }) {
  const [welcomeVideoUrl, setWelcomeVideoUrl] = useState("https://vimeo.com/123456789")
  const [aiPrompt, setAiPrompt] = useState(
    "Analyze this client's tracking data and provide insights on pixel installation quality, event match quality, and recommended optimizations for their e-commerce conversion tracking.",
  )
  const { toast } = useToast()

  const handleSaveConfiguration = () => {
    toast({
      title: "Configuration Saved",
      description: "Client journey settings have been updated successfully",
    })
  }

  if (viewMode === "agency") {
    return (
      <div className="space-y-6">
        <Card className="p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-lg mb-4">Welcome Video Configuration</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="videoUrl">Video URL (Vimeo or YouTube)</Label>
                <Input
                  id="videoUrl"
                  placeholder="https://vimeo.com/..."
                  value={welcomeVideoUrl}
                  onChange={(e) => setWelcomeVideoUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  This welcome video will be shown to clients at the start of their onboarding experience
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-4">AI Analysis Configuration</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="aiPrompt">Analysis Prompt Template</Label>
                <Textarea
                  id="aiPrompt"
                  rows={6}
                  placeholder="Enter AI prompt for analyzing client intake forms..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  This prompt will be used to analyze incoming client data and generate installation recommendations
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={() => {
              toast({
                title: "Configuration Saved",
                description: "Welcome video and AI prompt have been updated",
              })
            }}
            className="w-full"
          >
            Save Configuration
          </Button>
        </Card>

        <Card className="p-6 space-y-4">
          <div>
            <h3 className="font-semibold text-lg mb-2">AI Analysis Preview</h3>
            <p className="text-sm text-muted-foreground">Example output from analyzing client intake forms</p>
          </div>

          <Card className="p-4 bg-muted/30 space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-purple-500" />
                <span className="font-medium text-sm">Tracking Setup Analysis</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">Generated from intake form on Dec 4, 2024</p>

              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium mb-2 text-emerald-400">Current Setup</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>Shopify store active with standard theme</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>Meta Pixel present but not firing correctly</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>GTM container needs migration to GA4</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2 text-blue-400">Recommended Actions</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 shrink-0">1.</span>
                      <span>Reinstall Meta Pixel with server-side tracking</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 shrink-0">2.</span>
                      <span>Set up GA4 property and conversion tracking</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 shrink-0">3.</span>
                      <span>Implement enhanced e-commerce tracking</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-500 shrink-0">4.</span>
                      <span>Configure Klaviyo integration for email attribution</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2 text-amber-400">Potential Issues</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>Ad blocker detection may impact pixel accuracy</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                      <span>iOS 14+ privacy settings limiting attribution</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <Button variant="outline" className="w-full bg-transparent gap-2">
              <Sparkles className="h-4 w-4" />
              Generate Installation Plan
            </Button>
          </Card>
        </Card>
      </div>
    )
  } else {
    return (
      <div className="space-y-6">
        {/* Welcome Section */}
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Welcome to AudienceOS</h2>
          <p className="text-muted-foreground">Your marketing fulfillment command center</p>

          {/* Video Player */}
          <div className="relative aspect-video bg-slate-950 rounded-lg border border-border flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Play className="h-8 w-8 text-rose-500" />
              </div>
              <p className="text-sm text-slate-300">Welcome Video from Your Fulfillment Lead</p>
              <p className="text-xs text-slate-400 mt-1">Click to watch</p>
            </div>
          </div>
        </Card>

        {/* Current Tracking Status */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">Current Tracking Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Meta Pixel</span>
                <div className="w-3 h-3 bg-emerald-500 rounded-full" />
              </div>
              <p className="text-2xl font-bold text-foreground">98.2%</p>
              <p className="text-xs text-muted-foreground">Event Match Quality</p>
            </Card>

            <Card className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Google Enhanced</span>
                <div className="w-3 h-3 bg-emerald-500 rounded-full" />
              </div>
              <p className="text-2xl font-bold text-foreground">Active</p>
              <p className="text-xs text-muted-foreground">Server-side tracking</p>
            </Card>

            <Card className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ad Spend (30d)</span>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">$45.2k</p>
              <p className="text-xs text-emerald-400">+12% vs last month</p>
            </Card>
          </div>
        </div>

        {/* Next Steps */}
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Next Steps</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-secondary/30 border border-border rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Pixel Installation Complete</p>
                <p className="text-xs text-muted-foreground">Your Meta and Google tracking is live</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <Circle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Audit in Progress</p>
                <p className="text-xs text-muted-foreground">Luke is reviewing your conversion tracking setup</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-secondary/30 border border-border rounded-lg">
              <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Weekly Sync Call</p>
                <p className="text-xs text-muted-foreground">Scheduled for Friday at 2pm EST</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    )
  }
}
