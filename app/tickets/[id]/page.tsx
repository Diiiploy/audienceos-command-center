"use client"

import { useState, useEffect, useMemo, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useAuth } from "@/hooks/use-auth"
import { useTicketDetail } from "@/hooks/use-ticket-detail"
import { useToast } from "@/hooks/use-toast"
import { useSettingsStore } from "@/stores/settings-store"
import { usePipelineStore } from "@/stores/pipeline-store"
import { fetchWithCsrf } from "@/lib/csrf"
import { ActivityFeed, CommentInput } from "@/components/linear"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ArrowLeft,
  MoreHorizontal,
  Clock,
  User,
  Tag,
  Building2,
  Calendar,
  AlertCircle,
  Pencil,
  Copy,
  Trash2,
  UserPlus,
  Flag,
  CircleDot,
  Loader2,
  Check,
  X,
  History,
} from "lucide-react"

// Decode HTML entities like &#x2F; → /
function decodeHtmlEntities(text: string): string {
  if (typeof document === "undefined") return text
  const textarea = document.createElement("textarea")
  textarea.innerHTML = text
  return textarea.value
}

// Priority display config
const priorityColors: Record<string, string> = {
  critical: "bg-red-500/10 text-red-500 border-red-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  low: "bg-slate-500/10 text-slate-400 border-slate-500/20",
}

const priorityLabels: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
}

// Status display config
const statusColors: Record<string, string> = {
  new: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  in_progress: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  waiting_client: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  resolved: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
}

const statusLabels: Record<string, string> = {
  new: "New",
  in_progress: "In Progress",
  waiting_client: "Waiting on Client",
  resolved: "Resolved",
}

const categoryLabels: Record<string, string> = {
  technical: "Technical",
  billing: "Billing",
  campaign: "Campaign",
  general: "General",
  escalation: "Escalation",
}

export default function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const resolvedParams = use(params)
  const ticketId = resolvedParams.id
  const { toast } = useToast()

  useAuth()
  const { ticket, isLoading, error, refetch } = useTicketDetail(ticketId)
  const { teamMembers: rawTeamMembers, fetchTeamMembers } = useSettingsStore()
  const { clients, fetchClients } = usePipelineStore()

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editTitle, setEditTitle] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editCategory, setEditCategory] = useState("")
  const [editPriority, setEditPriority] = useState("")
  const [editStatus, setEditStatus] = useState("")
  const [editAssigneeId, setEditAssigneeId] = useState("")
  const [editDueDate, setEditDueDate] = useState("")

  // Notes/activity state
  const [activities, setActivities] = useState<Array<{
    id: string
    type: "comment"
    actor: { name: string; initials: string; color: string }
    timestamp: string
    content: string
  }>>([])
  const [isLoadingNotes, setIsLoadingNotes] = useState(false)

  // Transform team members
  const teamMembers = useMemo(() => {
    return rawTeamMembers.map((m) => ({
      id: m.id,
      name: `${m.first_name || ""} ${m.last_name || ""}`.trim() || m.email,
      initials: `${m.first_name?.[0] || ""}${m.last_name?.[0] || ""}`.toUpperCase() || "U",
      color: "bg-emerald-500",
    }))
  }, [rawTeamMembers])

  // Fetch team members and clients on mount
  useEffect(() => {
    fetchTeamMembers()
    fetchClients()
  }, [fetchTeamMembers, fetchClients])

  // Load notes when ticket loads
  useEffect(() => {
    if (!ticket) return

    const loadNotes = async () => {
      setIsLoadingNotes(true)
      try {
        const response = await fetch(`/api/v1/tickets/${ticket.id}/notes`, {
          credentials: "include",
        })
        if (response.ok) {
          const { data: notes } = await response.json()
          setActivities(
            notes.map((note: any) => ({
              id: note.id,
              type: "comment" as const,
              actor: {
                name: `${note.author?.first_name || ""} ${note.author?.last_name || ""}`.trim() || "Unknown",
                initials: `${note.author?.first_name?.[0] || ""}${note.author?.last_name?.[0] || ""}`.toUpperCase() || "U",
                color: "bg-blue-600",
              },
              timestamp: new Date(note.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              }),
              content: note.content,
            }))
          )
        }
      } catch {
        console.error("Failed to load notes")
      } finally {
        setIsLoadingNotes(false)
      }
    }

    loadNotes()
  }, [ticket])

  // Populate edit form when entering edit mode
  const enterEditMode = () => {
    if (!ticket) return
    setEditTitle(decodeHtmlEntities(ticket.title))
    setEditDescription(decodeHtmlEntities(ticket.description || ""))
    setEditCategory(ticket.category)
    setEditPriority(ticket.priority)
    setEditStatus(ticket.status)
    setEditAssigneeId(ticket.assignee_id || "")
    setEditDueDate(ticket.due_date ? ticket.due_date.split("T")[0] : "")
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!ticket || !editTitle.trim()) return
    setIsSaving(true)

    try {
      // PATCH the main fields
      const patchResponse = await fetchWithCsrf(`/api/v1/tickets/${ticket.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          category: editCategory,
          priority: editPriority,
          assignee_id: editAssigneeId && editAssigneeId !== "unassigned" ? editAssigneeId : null,
          due_date: editDueDate || null,
        }),
      })

      if (!patchResponse.ok) {
        const errorData = await patchResponse.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to update ticket")
      }

      // If status changed, update via the status endpoint
      if (editStatus !== ticket.status) {
        const statusResponse = await fetchWithCsrf(`/api/v1/tickets/${ticket.id}/status`, {
          method: "PATCH",
          body: JSON.stringify({ status: editStatus }),
        })
        if (!statusResponse.ok) {
          const errorData = await statusResponse.json().catch(() => ({}))
          throw new Error(errorData.error || "Failed to update status")
        }
      }

      toast({ title: "Ticket updated", description: "Changes saved successfully" })
      setIsEditing(false)
      await refetch()
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to save changes",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Quick action handlers (for Actions dropdown when not in edit mode)
  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return
    try {
      const response = await fetchWithCsrf(`/api/v1/tickets/${ticket.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to update status")
      }
      toast({ title: "Status updated", description: `Changed to ${statusLabels[newStatus] || newStatus}` })
      await refetch()
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to update status", variant: "destructive" })
    }
  }

  const handlePriorityChange = async (newPriority: string) => {
    if (!ticket) return
    try {
      const response = await fetchWithCsrf(`/api/v1/tickets/${ticket.id}`, {
        method: "PATCH",
        body: JSON.stringify({ priority: newPriority }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to update priority")
      }
      toast({ title: "Priority updated", description: `Changed to ${priorityLabels[newPriority] || newPriority}` })
      await refetch()
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to update priority", variant: "destructive" })
    }
  }

  const handleAssign = async (userId: string, userName: string) => {
    if (!ticket) return
    try {
      const response = await fetchWithCsrf(`/api/v1/tickets/${ticket.id}`, {
        method: "PATCH",
        body: JSON.stringify({ assignee_id: userId }),
      })
      if (!response.ok) throw new Error("Failed to assign ticket")
      toast({ title: "Ticket assigned", description: `Assigned to ${userName}` })
      await refetch()
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to assign", variant: "destructive" })
    }
  }

  const reloadNotes = async () => {
    if (!ticket) return
    const notesResponse = await fetch(`/api/v1/tickets/${ticket.id}/notes`, { credentials: "include" })
    if (notesResponse.ok) {
      const { data: notes } = await notesResponse.json()
      setActivities(
        notes.map((note: any) => ({
          id: note.id,
          type: "comment" as const,
          actor: {
            name: `${note.author?.first_name || ""} ${note.author?.last_name || ""}`.trim() || "Unknown",
            initials: `${note.author?.first_name?.[0] || ""}${note.author?.last_name?.[0] || ""}`.toUpperCase() || "U",
            color: "bg-blue-600",
          },
          timestamp: new Date(note.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
          content: note.content,
        }))
      )
    }
  }

  const handleComment = async (content: string) => {
    if (!ticket || !content.trim()) return
    try {
      const response = await fetchWithCsrf(`/api/v1/tickets/${ticket.id}/notes`, {
        method: "POST",
        body: JSON.stringify({ content: content.trim(), is_internal: false }),
      })
      if (!response.ok) throw new Error("Failed to post comment")
      toast({ title: "Comment posted" })
      await reloadNotes()
      // Also touch the ticket updated_at by doing a no-op patch
      await fetchWithCsrf(`/api/v1/tickets/${ticket.id}`, {
        method: "PATCH",
        body: JSON.stringify({ title: ticket.title }),
      }).catch(() => {})
      await refetch()
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to post comment", variant: "destructive" })
    }
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}/tickets/${ticketId}`
    navigator.clipboard.writeText(url)
    toast({ title: "Copied", description: "Ticket link copied to clipboard" })
  }

  const handleDelete = async () => {
    if (!ticket) return
    setIsDeleting(true)
    try {
      const response = await fetchWithCsrf(`/api/v1/tickets/${ticket.id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Failed to delete ticket")
      toast({ title: "Ticket deleted", description: "The ticket has been removed" })
      setShowDeleteModal(false)
      router.push("/")
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to delete", variant: "destructive" })
    } finally {
      setIsDeleting(false)
    }
  }

  // Compute "last edited" as max of ticket.updated_at and latest note
  const lastEdited = useMemo(() => {
    if (!ticket) return null
    let latest = new Date(ticket.updated_at).getTime()
    for (const activity of activities) {
      const activityTime = new Date(activity.timestamp).getTime()
      if (!isNaN(activityTime) && activityTime > latest) {
        latest = activityTime
      }
    }
    return new Date(latest)
  }, [ticket, activities])

  const formatLastEdited = (date: Date): string => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading ticket...</div>
      </div>
    )
  }

  // Error / not found
  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <h1 className="text-lg font-semibold text-foreground mb-4">
            {error?.includes("sign in") ? "Authentication Required" : "Ticket Not Found"}
          </h1>
          <p className="text-sm text-muted-foreground mb-4">
            {error || "This ticket doesn't exist or you don't have access."}
          </p>
          <Button onClick={() => router.push("/")}>Return to Dashboard</Button>
        </Card>
      </div>
    )
  }

  const assigneeName = ticket.assignee
    ? `${ticket.assignee.first_name || ""} ${ticket.assignee.last_name || ""}`.trim()
    : null
  const assigneeInitials = ticket.assignee
    ? `${ticket.assignee.first_name?.[0] || ""}${ticket.assignee.last_name?.[0] || ""}`.toUpperCase()
    : null
  const creatorName = ticket.creator
    ? `${ticket.creator.first_name || ""} ${ticket.creator.last_name || ""}`.trim()
    : "Unknown"

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.back()} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>

              <div>
                {isEditing ? (
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-lg font-semibold h-8 w-[400px]"
                    autoFocus
                  />
                ) : (
                  <h1 className="text-lg font-semibold text-foreground">{decodeHtmlEntities(ticket.title)}</h1>
                )}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-muted-foreground">#{ticket.number}</span>
                  <Badge
                    variant="outline"
                    className={cn("text-[9px] px-1 py-0", statusColors[isEditing ? editStatus : ticket.status])}
                  >
                    {statusLabels[isEditing ? editStatus : ticket.status] || (isEditing ? editStatus : ticket.status)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn("text-[9px] px-1 py-0", priorityColors[isEditing ? editPriority : ticket.priority])}
                  >
                    {priorityLabels[isEditing ? editPriority : ticket.priority] || (isEditing ? editPriority : ticket.priority)}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelEdit}
                    disabled={isSaving}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving || !editTitle.trim()}
                    className="gap-2"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={enterEditMode}
                    className="gap-2 bg-transparent"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </Button>

                  {/* Actions dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                        <MoreHorizontal className="h-4 w-4" />
                        Actions
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleCopyLink}>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Link
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <CircleDot className="w-4 h-4 mr-2" />
                          Change Status
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuItem onClick={() => handleStatusChange("new")}>New</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange("in_progress")}>In Progress</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange("waiting_client")}>Waiting on Client</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleStatusChange("resolved")}>Resolved</DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <Flag className="w-4 h-4 mr-2" />
                          Change Priority
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          <DropdownMenuItem onClick={() => handlePriorityChange("critical")}>Critical</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePriorityChange("high")}>High</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePriorityChange("medium")}>Medium</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handlePriorityChange("low")}>Low</DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Assign to
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent>
                          {teamMembers.length > 0 ? (
                            teamMembers.map((member) => (
                              <DropdownMenuItem
                                key={member.id}
                                onClick={() => handleAssign(member.id, member.name)}
                              >
                                {member.name}
                              </DropdownMenuItem>
                            ))
                          ) : (
                            <DropdownMenuItem disabled>No team members</DropdownMenuItem>
                          )}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => setTimeout(() => setShowDeleteModal(true), 0)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="grid grid-cols-[1fr_300px] gap-8">
          {/* Main content */}
          <div className="space-y-6">
            {/* Description */}
            <Card className="p-6">
              <h3 className="text-sm font-medium text-foreground mb-3">Description</h3>
              {isEditing ? (
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Detailed description of the issue..."
                  className="min-h-[120px] resize-none"
                />
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {decodeHtmlEntities(ticket.description || "No description provided.")}
                </p>
              )}
            </Card>

            {/* Activity */}
            <Card className="p-6">
              <h3 className="text-sm font-medium text-foreground mb-4">Activity</h3>
              {isLoadingNotes ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <ActivityFeed activities={activities} />
              )}
              <div className="mt-4 pt-4 border-t border-border">
                <CommentInput onSubmit={handleComment} placeholder="Add a comment..." />
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="p-4">
              <h3 className="text-sm font-medium text-foreground mb-3">Details</h3>
              <div className="space-y-3">
                {/* Client */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                    <span>Client</span>
                  </div>
                  <span className="text-sm text-foreground">{ticket.client?.name || "Unknown"}</span>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CircleDot className="w-4 h-4" />
                    <span>Status</span>
                  </div>
                  {isEditing ? (
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger className="h-7 w-[140px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className={cn("text-xs px-2 py-0.5 rounded border font-medium", statusColors[ticket.status])}>
                      {statusLabels[ticket.status] || ticket.status}
                    </span>
                  )}
                </div>

                {/* Priority */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="w-4 h-4" />
                    <span>Priority</span>
                  </div>
                  {isEditing ? (
                    <Select value={editPriority} onValueChange={setEditPriority}>
                      <SelectTrigger className="h-7 w-[140px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(priorityLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className={cn("text-xs px-2 py-0.5 rounded border font-medium", priorityColors[ticket.priority])}>
                      {priorityLabels[ticket.priority] || ticket.priority}
                    </span>
                  )}
                </div>

                {/* Category */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Tag className="w-4 h-4" />
                    <span>Category</span>
                  </div>
                  {isEditing ? (
                    <Select value={editCategory} onValueChange={setEditCategory}>
                      <SelectTrigger className="h-7 w-[140px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(categoryLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded border border-border font-medium text-foreground capitalize">
                      {categoryLabels[ticket.category] || ticket.category}
                    </span>
                  )}
                </div>

                {/* Assignee */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span>Assignee</span>
                  </div>
                  {isEditing ? (
                    <Select value={editAssigneeId} onValueChange={setEditAssigneeId}>
                      <SelectTrigger className="h-7 w-[140px] text-xs">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {teamMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : assigneeName ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar className="h-5 w-5 bg-emerald-500">
                        <AvatarFallback className="bg-emerald-500 text-[10px] font-medium text-white">
                          {assigneeInitials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-foreground">{assigneeName}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">Unassigned</span>
                  )}
                </div>

                {/* Due date */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Due date</span>
                  </div>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="h-7 w-[140px] text-xs"
                    />
                  ) : ticket.due_date ? (
                    <span className="text-sm text-foreground">
                      {new Date(ticket.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">No due date</span>
                  )}
                </div>

                {/* Last edited */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <History className="w-4 h-4" />
                    <span>Last edited</span>
                  </div>
                  <span className="text-sm text-foreground" title={lastEdited?.toLocaleString()}>
                    {lastEdited ? formatLastEdited(lastEdited) : "Unknown"}
                  </span>
                </div>

                {/* Created */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>Created</span>
                  </div>
                  <span className="text-sm text-foreground">
                    {new Date(ticket.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>

                {/* Created by */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Pencil className="w-4 h-4" />
                    <span>Created by</span>
                  </div>
                  <span className="text-sm text-foreground">{creatorName}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <AlertDialogContent onCloseAutoFocus={(e) => e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete ticket</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this ticket? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
