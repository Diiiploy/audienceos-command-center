"use client"

import { useState, useEffect, useCallback } from "react"
import { Mail, Plus, Loader2, Trash2, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { fetchWithCsrf } from "@/lib/csrf"
import { toastSuccess, toastError } from "@/lib/toast-helpers"

interface EmailContact {
  id: string
  email: string
  name: string | null
  role: string
  is_primary: boolean
  source: string
  created_at: string
}

interface ClientEmailContactsProps {
  clientId: string
}

const ROLE_LABELS: Record<string, string> = {
  primary: "Primary",
  billing: "Billing",
  technical: "Technical",
  assistant: "Assistant",
  other: "Other",
}

export function ClientEmailContacts({ clientId }: ClientEmailContactsProps) {
  const [contacts, setContacts] = useState<EmailContact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<EmailContact | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [newEmail, setNewEmail] = useState("")
  const [newName, setNewName] = useState("")
  const [newRole, setNewRole] = useState("primary")

  const fetchContacts = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/clients/${clientId}/contacts`, {
        credentials: "include",
      })
      if (!res.ok) throw new Error("Failed to load contacts")
      const { data } = await res.json()
      setContacts(data || [])
    } catch {
      console.error("[client-email-contacts] Failed to fetch contacts")
    } finally {
      setIsLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  const handleAdd = async () => {
    const email = newEmail.trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toastError("Please enter a valid email address")
      return
    }

    setAdding(true)
    try {
      const res = await fetchWithCsrf(`/api/v1/clients/${clientId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: newName.trim() || null,
          role: newRole,
        }),
      })

      if (res.status === 409) {
        toastError("This email is already linked to this client")
        setAdding(false)
        return
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || "Failed to add contact")
      }

      const { data } = await res.json()
      setContacts((prev) => [...prev, data])
      toastSuccess(`Added ${email}`)

      // Reset form
      setNewEmail("")
      setNewName("")
      setNewRole("primary")
      setPopoverOpen(false)
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Failed to add contact")
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)

    try {
      const res = await fetchWithCsrf(
        `/api/v1/clients/${clientId}/contacts?contactId=${deleteTarget.id}`,
        { method: "DELETE" }
      )

      if (!res.ok) throw new Error("Failed to remove contact")

      setContacts((prev) => prev.filter((c) => c.id !== deleteTarget.id))
      toastSuccess("Contact removed")
    } catch {
      toastError("Failed to remove contact")
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading email contacts...
        </div>
      </Card>
    )
  }

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm font-medium text-foreground">
              Email Contacts{contacts.length > 0 && ` (${contacts.length})`}
            </p>
          </div>

          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" disabled={adding}>
                {adding ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                ) : (
                  <Plus className="h-3.5 w-3.5 mr-1" />
                )}
                Add Contact
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-4" align="end">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Email *
                  </label>
                  <Input
                    placeholder="contact@company.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Name
                  </label>
                  <Input
                    placeholder="John Smith"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">
                    Role
                  </label>
                  <Select value={newRole} onValueChange={setNewRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  className="w-full"
                  size="sm"
                  onClick={handleAdd}
                  disabled={adding || !newEmail.trim()}
                >
                  {adding ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <Plus className="h-3.5 w-3.5 mr-1" />
                  )}
                  Add Email Contact
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {contacts.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No email contacts yet. Add contacts to match inbound emails to this client.
          </p>
        ) : (
          <div className="space-y-2">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between py-1.5 px-2 rounded-md bg-muted/30"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-foreground truncate block">
                      {contact.email}
                    </span>
                    {contact.name && (
                      <span className="text-xs text-muted-foreground truncate block">
                        {contact.name}
                      </span>
                    )}
                  </div>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0">
                    {ROLE_LABELS[contact.role] || contact.role}
                  </Badge>
                  {contact.is_primary && (
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 shrink-0">
                      Primary
                    </Badge>
                  )}
                  {contact.source !== "manual" && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 shrink-0 text-muted-foreground">
                      {contact.source === "gmail_sync" ? "Gmail" : contact.source}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive shrink-0 h-7 px-2"
                  onClick={() => setDeleteTarget(contact)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Email Contact</DialogTitle>
            <DialogDescription>
              Remove <span className="font-medium text-foreground">{deleteTarget?.email}</span> from
              this client? Existing matched communications will not be affected.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
