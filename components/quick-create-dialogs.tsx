"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Copy, ExternalLink } from "lucide-react"
import type { Tier, TicketPriority } from "@/lib/mock-data"

interface QuickCreateDialogsProps {
  type: "client" | "ticket" | "project" | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function QuickCreateDialogs({ type, open, onOpenChange }: QuickCreateDialogsProps) {
  const { toast } = useToast()
  const [clientName, setClientName] = useState("")
  const [clientEmail, setClientEmail] = useState("")
  const [clientTier, setClientTier] = useState<Tier>("Core")
  const [ticketTitle, setTicketTitle] = useState("")
  const [ticketDescription, setTicketDescription] = useState("")
  const [ticketPriority, setTicketPriority] = useState<TicketPriority>("Medium")
  const [ticketClient, setTicketClient] = useState("")
  const [projectName, setProjectName] = useState("")
  const [projectClient, setProjectClient] = useState("")
  const [projectDeadline, setProjectDeadline] = useState("")

  const onboardingUrl = typeof window !== "undefined" ? `${window.location.origin}/onboarding/start` : ""

  const handleCopyLink = () => {
    navigator.clipboard.writeText(onboardingUrl)
    toast({
      title: "Link Copied",
      description: "Onboarding link copied to clipboard",
    })
  }

  const handleCreateClient = () => {
    if (!clientName || !clientEmail) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    // Store in localStorage to simulate backend
    const newClient = {
      id: `client-${Date.now()}`,
      name: clientName,
      email: clientEmail,
      tier: clientTier,
      createdAt: new Date().toISOString(),
      onboardingUrl,
    }

    const existingClients = JSON.parse(localStorage.getItem("pendingClients") || "[]")
    localStorage.setItem("pendingClients", JSON.stringify([...existingClients, newClient]))

    toast({
      title: "Client Created",
      description: `${clientName} has been added. Send them the onboarding link to get started.`,
    })

    // Reset form
    setClientName("")
    setClientEmail("")
    setClientTier("Core")
    onOpenChange(false)
  }

  const handleCreateTicket = () => {
    if (!ticketTitle || !ticketClient) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    const newTicket = {
      id: `T${Math.floor(1000 + Math.random() * 9000)}`,
      title: ticketTitle,
      description: ticketDescription,
      priority: ticketPriority,
      client: ticketClient,
      status: "New",
      createdAt: new Date().toISOString(),
    }

    const existingTickets = JSON.parse(localStorage.getItem("customTickets") || "[]")
    localStorage.setItem("customTickets", JSON.stringify([...existingTickets, newTicket]))

    toast({
      title: "Ticket Created",
      description: `Support ticket #${newTicket.id} has been created`,
    })

    // Reset form
    setTicketTitle("")
    setTicketDescription("")
    setTicketPriority("Medium")
    setTicketClient("")
    onOpenChange(false)
  }

  const handleCreateProject = () => {
    if (!projectName || !projectClient) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    const newProject = {
      id: `proj-${Date.now()}`,
      name: projectName,
      client: projectClient,
      deadline: projectDeadline,
      status: "Planning",
      createdAt: new Date().toISOString(),
    }

    const existingProjects = JSON.parse(localStorage.getItem("customProjects") || "[]")
    localStorage.setItem("customProjects", JSON.stringify([...existingProjects, newProject]))

    toast({
      title: "Project Created",
      description: `${projectName} has been added to the pipeline`,
    })

    // Reset form
    setProjectName("")
    setProjectClient("")
    setProjectDeadline("")
    onOpenChange(false)
  }

  if (type === "client") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[14px] font-semibold">Add New Client</DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a new client record and send them the onboarding link
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Client Name *</Label>
              <Input
                placeholder="Acme Corp"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="bg-slate-950 border-slate-700 text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Contact Email *</Label>
              <Input
                type="email"
                placeholder="contact@acmecorp.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="bg-slate-950 border-slate-700 text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Tier</Label>
              <Select value={clientTier} onValueChange={(value) => setClientTier(value as Tier)}>
                <SelectTrigger className="bg-slate-950 border-slate-700 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="Starter">Starter</SelectItem>
                  <SelectItem value="Core">Core</SelectItem>
                  <SelectItem value="Enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Onboarding Link</Label>
              <div className="flex gap-2">
                <Input
                  value={onboardingUrl}
                  readOnly
                  className="bg-slate-950 border-slate-700 text-slate-400 font-mono text-[10px] h-7"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 shrink-0 bg-transparent"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(onboardingUrl, "_blank")}
                  className="border-slate-700 text-slate-300 hover:bg-slate-800 shrink-0"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-[9px] text-slate-500">
                Share this link with your client to begin their onboarding journey
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button onClick={handleCreateClient} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                Create Client
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (type === "ticket") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[14px] font-semibold">Create Support Ticket</DialogTitle>
            <DialogDescription className="text-slate-400">
              Log a new support issue for client assistance
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Ticket Title *</Label>
              <Input
                placeholder="Brief description of the issue"
                value={ticketTitle}
                onChange={(e) => setTicketTitle(e.target.value)}
                className="bg-slate-950 border-slate-700 text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Client Name *</Label>
              <Input
                placeholder="Which client is this for?"
                value={ticketClient}
                onChange={(e) => setTicketClient(e.target.value)}
                className="bg-slate-950 border-slate-700 text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Priority</Label>
              <Select value={ticketPriority} onValueChange={(value) => setTicketPriority(value as TicketPriority)}>
                <SelectTrigger className="bg-slate-950 border-slate-700 text-slate-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800">
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Description</Label>
              <Textarea
                placeholder="Detailed description of the issue..."
                value={ticketDescription}
                onChange={(e) => setTicketDescription(e.target.value)}
                className="bg-slate-950 border-slate-700 text-slate-100 min-h-[100px]"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button onClick={handleCreateTicket} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                Create Ticket
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (type === "project") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-slate-900 border-slate-800 text-slate-100 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[14px] font-semibold">Create New Project</DialogTitle>
            <DialogDescription className="text-slate-400">Add a new project or campaign to track</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Project Name *</Label>
              <Input
                placeholder="Q1 Campaign Launch"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="bg-slate-950 border-slate-700 text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Client *</Label>
              <Input
                placeholder="Which client is this project for?"
                value={projectClient}
                onChange={(e) => setProjectClient(e.target.value)}
                className="bg-slate-950 border-slate-700 text-slate-100"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Deadline (Optional)</Label>
              <Input
                type="date"
                value={projectDeadline}
                onChange={(e) => setProjectDeadline(e.target.value)}
                className="bg-slate-950 border-slate-700 text-slate-100"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </Button>
              <Button onClick={handleCreateProject} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white">
                Create Project
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return null
}
