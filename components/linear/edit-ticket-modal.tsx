"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Edit, AlertCircle, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { fetchWithCsrf } from "@/lib/csrf"
import {
  useTicketStore,
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  type TicketCategory,
  type TicketPriority,
} from "@/stores/ticket-store"
import { usePipelineStore } from "@/stores/pipeline-store"
import { useSettingsStore } from "@/stores/settings-store"

interface EditTicketModalProps {
  isOpen: boolean
  onClose: () => void
  ticketId: string | null
  onSuccess?: () => void
}

export function EditTicketModal({
  isOpen,
  onClose,
  ticketId,
  onSuccess,
}: EditTicketModalProps) {
  const { toast } = useToast()
  const { fetchTickets } = useTicketStore()
  const { clients } = usePipelineStore()
  const { teamMembers, fetchTeamMembers } = useSettingsStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [title, setTitle] = useState("")
  const [clientId, setClientId] = useState("")
  const [category, setCategory] = useState<TicketCategory>("general")
  const [priority, setPriority] = useState<TicketPriority>("medium")
  const [description, setDescription] = useState("")
  const [assigneeId, setAssigneeId] = useState("")
  const [dueDate, setDueDate] = useState("")

  // Load team members when modal opens
  useEffect(() => {
    if (isOpen && teamMembers.length === 0) {
      fetchTeamMembers()
    }
  }, [isOpen, teamMembers.length, fetchTeamMembers])

  // Load ticket data when modal opens with a ticketId
  useEffect(() => {
    if (!isOpen || !ticketId) return

    const loadTicket = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/v1/tickets/${ticketId}`, {
          credentials: "include",
        })
        if (!response.ok) throw new Error("Failed to load ticket")

        const { data } = await response.json()
        setTitle(data.title || "")
        setClientId(data.client_id || "")
        setCategory(data.category || "general")
        setPriority(data.priority || "medium")
        setDescription(data.description || "")
        setAssigneeId(data.assignee_id || "")
        setDueDate(data.due_date ? data.due_date.split("T")[0] : "")
      } catch {
        setError("Failed to load ticket data")
      } finally {
        setIsLoading(false)
      }
    }

    loadTicket()
  }, [isOpen, ticketId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticketId) return
    setError(null)

    if (!title.trim()) {
      setError("Title is required")
      return
    }

    setIsSubmitting(true)

    // Map UI priority to DB enum
    const priorityMap: Record<string, string> = {
      critical: "critical",
      high: "high",
      medium: "medium",
      low: "low",
    }

    try {
      const response = await fetchWithCsrf(`/api/v1/tickets/${ticketId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          priority: priorityMap[priority] || priority,
          assignee_id: assigneeId || null,
          due_date: dueDate || null,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to update ticket")
      }

      toast({
        title: "Ticket updated",
        description: `"${title}" has been updated.`,
        variant: "default",
      })

      await fetchTickets()
      onClose()
      onSuccess?.()
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to update ticket. Please try again."
      setError(errorMessage)
      toast({
        title: "Error updating ticket",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Edit Ticket
          </DialogTitle>
          <DialogDescription>
            Update ticket details. Changes will be saved immediately.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="edit-ticket-title" className="text-sm">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-ticket-title"
                type="text"
                placeholder="Brief description of the issue"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
                className="h-9"
                autoFocus
              />
            </div>

            {/* Client and Category - two column */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-ticket-client" className="text-sm">
                  Client
                </Label>
                <Select
                  value={clientId}
                  onValueChange={setClientId}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="edit-ticket-client" className="h-9">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-ticket-category" className="text-sm">
                  Category
                </Label>
                <Select
                  value={category}
                  onValueChange={(value) =>
                    setCategory(value as TicketCategory)
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="edit-ticket-category" className="h-9">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.entries(TICKET_CATEGORY_LABELS) as [
                        TicketCategory,
                        string,
                      ][]
                    ).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Priority and Assignee - two column */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-ticket-priority" className="text-sm">
                  Priority
                </Label>
                <Select
                  value={priority}
                  onValueChange={(value) =>
                    setPriority(value as TicketPriority)
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="edit-ticket-priority" className="h-9">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.entries(TICKET_PRIORITY_LABELS) as [
                        TicketPriority,
                        string,
                      ][]
                    ).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-ticket-assignee" className="text-sm">
                  Assignee
                </Label>
                <Select
                  value={assigneeId}
                  onValueChange={setAssigneeId}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="edit-ticket-assignee" className="h-9">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.first_name} {member.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label htmlFor="edit-ticket-due-date" className="text-sm">
                Due Date
              </Label>
              <Input
                id="edit-ticket-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={isSubmitting}
                className="h-9"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-ticket-description" className="text-sm">
                Description
              </Label>
              <Textarea
                id="edit-ticket-description"
                placeholder="Detailed description of the issue..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                className="min-h-[80px] resize-none"
              />
            </div>

            {/* Error Alert */}
            {error && (
              <div className="flex items-start gap-2 py-2 px-3 bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-md">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-600 dark:text-red-500">
                  {error}
                </p>
              </div>
            )}

            {/* Actions */}
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="h-9 gap-1.5"
              >
                {isSubmitting && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
