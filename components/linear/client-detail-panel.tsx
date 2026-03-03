"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { fetchWithCsrf } from "@/lib/csrf"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PIPELINE_STAGES, type Stage } from "@/types/client"
import {
  X,
  Copy,
  Pencil,
  Calendar,
  Tag,
  FolderKanban,
  Send,
  Paperclip,
  MoreVertical,
  ExternalLink,
  Edit,
  ArrowRight,
  UserPlus,
  Trash2,
  Loader2,
  Check,
} from "lucide-react"
import { DatePickerModal } from "./date-picker-modal"

interface ClientDetailPanelProps {
  client: {
    id: string
    name: string
    stage: string
    health: "Green" | "Yellow" | "Red" | "Blocked"
    owner: {
      name: string
      initials: string
      color: string
    }
    tier: string
    daysInStage: number
    blocker?: string | null
    statusNote?: string | null
  }
  onClose: () => void
  onOpenDetail?: () => void
  clientId?: string // Real UUID for API calls (client.id in the panel is the logo)
  onEdit?: (clientId: string) => void
  onMoveToStage?: (clientId: string, clientName: string, currentStage: string, toStage: Stage) => void
  onAssignTo?: (clientId: string, userId: string, userName: string) => void
  onDeleteClient?: (clientId: string, clientName: string) => void
  teamMembers?: Array<{ id: string; name: string; initials: string; color: string }>
}

function getHealthBadgeStyle(health: string) {
  switch (health) {
    case "Green":
      return "bg-status-green/20 text-status-green border-status-green/30"
    case "Yellow":
      return "bg-status-yellow/20 text-status-yellow border-status-yellow/30"
    case "Red":
      return "bg-status-red/20 text-status-red border-status-red/30"
    case "Blocked":
      return "bg-status-blocked/20 text-status-blocked border-status-blocked/30"
    default:
      return ""
  }
}

function getTierBadgeStyle(tier: string) {
  switch (tier) {
    case "Enterprise":
      return "bg-status-green/20 text-status-green border-status-green/30"
    case "Core":
      return "bg-primary/20 text-primary border-primary/30"
    case "Starter":
      return "bg-muted text-muted-foreground border-border"
    default:
      return ""
  }
}

interface Note {
  id: string
  content: string
  created_at: string
  author: {
    id: string
    first_name: string
    last_name: string
  } | null
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function ClientDetailPanel({ client, onClose, onOpenDetail, clientId, onEdit, onMoveToStage, onAssignTo, onDeleteClient, teamMembers }: ClientDetailPanelProps) {
  const router = useRouter()
  const { toast } = useToast()

  // Use clientId (real UUID) for API calls, fall back to client.id
  const apiClientId = clientId || client.id

  const [noteText, setNoteText] = useState("")
  const [notes, setNotes] = useState<Note[]>([])
  const [isLoadingNotes, setIsLoadingNotes] = useState(false)

  // Fetch notes from API on mount / when client changes
  const fetchNotes = useCallback(async () => {
    if (!clientId) return // Don't fetch if no real UUID
    setIsLoadingNotes(true)
    try {
      const response = await fetch(`/api/v1/clients/${clientId}/notes`)
      if (response.ok) {
        const { data } = await response.json()
        setNotes(data || [])
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error)
    } finally {
      setIsLoadingNotes(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])

  // Due date picker state
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [isSendingNote, setIsSendingNote] = useState(false)

  // Handler functions
  const handleEdit = () => {
    if (onEdit) {
      onEdit(apiClientId)
    }
  }

  const handleCopy = () => {
    const copyText = `${client.name} - ${client.stage} (${client.health})`
    navigator.clipboard.writeText(copyText)
    toast({
      title: "Copied",
      description: "Client info copied to clipboard",
      variant: "default",
    })
  }

  const handleOpen = () => {
    if (onOpenDetail) {
      onOpenDetail()
    } else {
      router.push(`/clients/${client.id}`)
    }
  }

  const handleSendNote = async () => {
    if (!noteText.trim()) return

    setIsSendingNote(true)
    const tempId = `temp_${Date.now()}`
    const optimisticNote: Note = {
      id: tempId,
      content: noteText.trim(),
      created_at: new Date().toISOString(),
      author: null,
    }

    try {
      // Optimistic update
      setNotes(prev => [optimisticNote, ...prev])
      setNoteText("")

      const response = await fetchWithCsrf(`/api/v1/clients/${apiClientId}/notes`, {
        method: 'POST',
        body: JSON.stringify({ text: optimisticNote.content })
      })

      if (!response.ok) {
        throw new Error('Failed to save note')
      }

      const { data: savedNote } = await response.json()
      // Replace optimistic note with server response
      setNotes(prev => prev.map(n => n.id === tempId ? savedNote : n))
    } catch (error) {
      // Revert optimistic update
      setNotes(prev => prev.filter(n => n.id !== tempId))
      setNoteText(optimisticNote.content)

      const errorMessage = error instanceof Error ? error.message : 'Failed to save note'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSendingNote(false)
    }
  }

  const handleAttachment = () => {
    // TODO: Open file picker
    console.log("Attach file")
  }

  const handleAddLabel = () => {
    // TODO: Open label picker
    console.log("Add label")
  }

  const handleSetDueDate = () => {
    setShowDatePicker(true)
  }

  const handleDateSelect = (date: Date) => {
    toast({
      title: "Due date set",
      description: `Due date set to ${date.toLocaleDateString()}`,
      variant: "default",
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn("w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white", client.owner.color)}>
            {client.owner.initials}
          </div>
          <span className="text-sm text-foreground truncate">{client.name}</span>
          <span className="text-xs text-muted-foreground">{client.id}</span>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleEdit}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleCopy}>
            <Copy className="w-4 h-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleOpen}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Move to Stage
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {PIPELINE_STAGES.filter((s) => s !== client.stage).map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onClick={() => onMoveToStage?.(apiClientId, client.name, client.stage, s)}
                    >
                      {s}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Assign to
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {teamMembers && teamMembers.length > 0 ? (
                    teamMembers.map((member) => (
                      <DropdownMenuItem
                        key={member.id}
                        onClick={() => onAssignTo?.(apiClientId, member.id, member.name)}
                      >
                        <Avatar className={cn("h-4 w-4 mr-2", member.color)}>
                          <AvatarFallback className={cn(member.color, "text-[8px] font-medium text-white")}>
                            {member.initials}
                          </AvatarFallback>
                        </Avatar>
                        {member.name}
                        {member.name === client.owner.name && (
                          <Check className="w-3 h-3 ml-auto text-muted-foreground" />
                        )}
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem disabled>
                      No team members
                    </DropdownMenuItem>
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDeleteClient?.(apiClientId, client.name)}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* View Full Details */}
      {onOpenDetail && (
        <div className="px-4 py-3 border-b border-border">
          <Button
            variant="outline"
            className="w-full gap-2"
            size="sm"
            onClick={onOpenDetail}
          >
            <ExternalLink className="w-4 h-4" />
            View Full Details
          </Button>
        </div>
      )}

      {/* Properties - using fixed-width label pattern */}
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-medium mb-3">Properties</h3>

        <div className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-2.5 items-center">
          {/* Stage */}
          <span className="text-xs text-muted-foreground">Stage</span>
          <span className="text-sm text-foreground">{client.stage}</span>

          {/* Health */}
          <span className="text-xs text-muted-foreground">Health</span>
          <span>
            <Badge variant="outline" className={cn("text-xs", getHealthBadgeStyle(client.health))}>
              {client.health}
            </Badge>
          </span>

          {/* Owner */}
          <span className="text-xs text-muted-foreground">Owner</span>
          <div className="flex items-center gap-2">
            <Avatar className={cn("h-6 w-6", client.owner.color)}>
              <AvatarFallback className={cn(client.owner.color, "text-xs font-medium text-white")}>
                {client.owner.initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{client.owner.name}</span>
          </div>

          {/* Days in stage */}
          <span className="text-xs text-muted-foreground">Days in Stage</span>
          <span className={cn(
            "text-sm tabular-nums",
            client.daysInStage > 4 ? "text-status-red font-medium" : ""
          )}>
            {client.daysInStage}
          </span>
        </div>
      </div>

      {/* Labels */}
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-medium mb-3">Labels</h3>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-xs", getTierBadgeStyle(client.tier))}>
              {client.tier}
            </Badge>
          </div>

          {client.blocker && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-status-red/20 text-status-red border-status-red/30">
                {client.blocker}
              </Badge>
            </div>
          )}

          <button
            onClick={handleAddLabel}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <Tag className="w-4 h-4" />
            <span className="text-xs">Add label</span>
          </button>
        </div>
      </div>

      {/* Project */}
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-medium mb-3">Project</h3>

        <div className="flex items-center gap-2">
          <FolderKanban className="w-4 h-4 text-primary" />
          <span className="text-sm">Client Pipeline</span>
        </div>
      </div>

      {/* Due Date */}
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-medium mb-3">Due Date</h3>

        <button
          onClick={handleSetDueDate}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <Calendar className="w-4 h-4" />
          <span className="text-sm">Set due date</span>
        </button>
      </div>

      {/* Notes */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 flex-1 overflow-y-auto">
          <h3 className="text-sm font-medium mb-3">Notes</h3>

          {isLoadingNotes ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading notes...</span>
            </div>
          ) : notes.length > 0 ? (
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="p-3 rounded bg-secondary/50 border border-border">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {note.author ? `${note.author.first_name} ${note.author.last_name}` : "You"} • {formatTimeAgo(note.created_at)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No notes yet</p>
          )}
        </div>

        {/* Comment Input */}
        <div className="p-4 border-t border-border">
          <div className="flex items-start gap-2">
            <Avatar className={cn("h-6 w-6 mt-1", client.owner.color)}>
              <AvatarFallback className={cn(client.owner.color, "text-xs font-medium text-white")}>
                {client.owner.initials}
              </AvatarFallback>
            </Avatar>
            <Textarea
              placeholder="Add a note... (Shift+Enter for new line)"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSendNote()
                }
              }}
              className="flex-1 min-h-[80px] max-h-[200px] resize-none text-sm"
              rows={3}
            />
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                onClick={handleAttachment}
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground disabled:opacity-50"
                onClick={handleSendNote}
                disabled={!noteText.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Due Date Picker */}
      <DatePickerModal
        open={showDatePicker}
        onOpenChange={setShowDatePicker}
        onSelect={handleDateSelect}
      />
    </div>
  )
}
