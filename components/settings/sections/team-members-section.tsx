"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/hooks/use-auth"
import {
  UserPlus,
  Search,
  MoreHorizontal,
  Download,
  ChevronDown,
  ChevronLeft,
  Loader2,
  AlertCircle,
  Users,
  Mail,
  Clock,
  RefreshCw,
  X,
} from "lucide-react"
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
import { UserInvitationModal } from "@/components/settings/modals/user-invitation-modal"
import { ClientAssignmentModal } from "@/components/settings/modals/client-assignment-modal"
import { toast } from "sonner"
import type { TeamMember } from "@/types/settings"
import { RoleHierarchyLevel } from "@/types/rbac"
import { fetchWithCsrf } from "@/lib/csrf"

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

// Member colors based on name hash for consistent avatars
const MEMBER_COLORS = [
  "bg-blue-500",
  "bg-green-500",
  "bg-purple-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-amber-500",
  "bg-indigo-500",
]

function getMemberColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return MEMBER_COLORS[Math.abs(hash) % MEMBER_COLORS.length]
}

// ============================================================================
// Member Profile View Component
// ============================================================================

interface MemberProfileProps {
  member: TeamMember
  onBack: () => void
  onUpdate: (member: TeamMember) => void
}

function MemberProfile({ member, onBack, onUpdate }: MemberProfileProps) {
  const [firstName, setFirstName] = useState(member.first_name)
  const [lastName, setLastName] = useState(member.last_name)
  const [initialNickname] = useState(member.nickname ?? member.first_name.toLowerCase())
  const [nickname, setNickname] = useState(initialNickname)
  const [isSaving, setIsSaving] = useState(false)

  const fullName = member.full_name ?? `${member.first_name} ${member.last_name}`
  const avatarColor = getMemberColor(fullName)

  const hasChanges =
    firstName !== member.first_name ||
    lastName !== member.last_name ||
    nickname !== initialNickname

  const handleSave = async () => {
    setIsSaving(true)
    try {
      // Only send fields that actually changed
      const patch: Record<string, unknown> = {}
      if (firstName !== member.first_name) patch.first_name = firstName
      if (lastName !== member.last_name) patch.last_name = lastName
      if (nickname !== initialNickname) patch.nickname = nickname || null

      if (Object.keys(patch).length === 0) return

      const response = await fetchWithCsrf(`/api/v1/settings/users/${member.id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update user')
      }

      const { data: updated } = await response.json()
      toast.success('Profile updated successfully')
      onUpdate({ ...member, ...updated })
      onBack()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Back button and header */}
      <div>
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to members
        </button>
        <h2 className="text-lg font-medium text-foreground">Profile</h2>
        <p className="text-sm text-muted-foreground">
          Manage team member profile
        </p>
      </div>

      {/* Profile Picture Section */}
      <div className="border border-border rounded-lg p-6">
        <p className="text-sm text-muted-foreground mb-4">Profile picture</p>
        <div className="flex justify-center">
          <Avatar className={`h-32 w-32 ${avatarColor}`}>
            <AvatarFallback className="text-white text-4xl font-medium">
              {getInitials(member.first_name, member.last_name)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Profile Form */}
      <div className="border border-border rounded-lg divide-y divide-border">
        {/* Email - read only */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Email</Label>
          </div>
          <Input
            value={member.email}
            disabled
            className="max-w-[280px] bg-secondary/50"
          />
        </div>

        {/* Full Name */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Full name</Label>
          </div>
          <div className="flex gap-2 max-w-[280px]">
            <Input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name"
              className="flex-1"
            />
            <Input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last name"
              className="flex-1"
            />
          </div>
        </div>

        {/* Nickname */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Nickname</Label>
            <p className="text-sm text-muted-foreground">
              How they appear in mentions
            </p>
          </div>
          <Input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="max-w-[280px]"
          />
        </div>

        {/* Role - display only, changed via members list */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Role</Label>
            <p className="text-sm text-muted-foreground">
              Managed from the members list
            </p>
          </div>
          <Badge
            variant={member.role === "owner" || member.role === "admin" ? "default" : "secondary"}
            className="capitalize text-sm px-3 py-1"
          >
            {member.role}
          </Badge>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save changes
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Role Hierarchy Helpers
// ============================================================================

const ROLE_HIERARCHY: Record<string, number> = {
  owner: 1,
  admin: 2,
  manager: 3,
  member: 4,
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  member: "Member",
}

/** Check if currentUser can change targetMember's role */
function canChangeRole(currentRole: string, targetRole: string, targetId: string, currentId: string): boolean {
  if (targetId === currentId) return false // Can't change own role
  const currentLevel = ROLE_HIERARCHY[currentRole] ?? 99
  const targetLevel = ROLE_HIERARCHY[targetRole] ?? 99
  return currentLevel <= targetLevel && currentLevel <= 3 // Members (4) can't change anyone
}

/** Check if currentUser can delete targetMember */
function canDelete(currentRole: string, targetRole: string, targetId: string, currentId: string): boolean {
  if (targetId === currentId) return false      // Can't delete self
  if (targetRole === 'owner') return false       // Can't delete owners
  const currentLevel = ROLE_HIERARCHY[currentRole] ?? 99
  return currentLevel <= 2                        // Only owners (1) and admins (2) can delete
}

/** Get roles that currentUser is allowed to assign */
function getAssignableRoles(currentRole: string): string[] {
  const currentLevel = ROLE_HIERARCHY[currentRole] ?? 99
  return Object.entries(ROLE_HIERARCHY)
    .filter(([, level]) => level >= currentLevel)
    .map(([role]) => role)
}

// ============================================================================
// Change Role Dialog
// ============================================================================

interface ChangeRoleDialogProps {
  member: TeamMember
  currentUserRole: string
  onClose: () => void
  onSuccess: (updated: TeamMember) => void
}

function ChangeRoleDialog({ member, currentUserRole, onClose, onSuccess }: ChangeRoleDialogProps) {
  const [newRole, setNewRole] = useState<string>(member.role)
  const [isSaving, setIsSaving] = useState(false)

  const assignableRoles = getAssignableRoles(currentUserRole)

  const handleSave = async () => {
    if (newRole === member.role) return
    setIsSaving(true)
    try {
      const response = await fetchWithCsrf(`/api/v1/settings/users/${member.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole }),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update role')
      }
      const { data: updated } = await response.json()
      toast.success(`${member.first_name}'s role updated to ${ROLE_LABELS[newRole]}`)
      onSuccess({ ...member, ...updated })
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update role')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <AlertDialog open onOpenChange={() => onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Change role</AlertDialogTitle>
          <AlertDialogDescription>
            Select a new role for {member.first_name} {member.last_name}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Select value={newRole} onValueChange={setNewRole}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {assignableRoles.map((role) => (
                <SelectItem key={role} value={role}>
                  {ROLE_LABELS[role]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSave}
            disabled={isSaving || newRole === member.role}
          >
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Update Role
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ============================================================================
// Main Team Members Section
// ============================================================================

export function TeamMembersSection() {
  const { profile } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [roleFilter, setRoleFilter] = useState<"all" | "owner" | "admin" | "manager" | "member">("all")
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null)
  const [memberForClientAccess, setMemberForClientAccess] = useState<TeamMember | null>(null)
  const [memberToChangeRole, setMemberToChangeRole] = useState<TeamMember | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  // API state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Invitation state
  interface PendingInvitation {
    id: string
    email: string
    role: string
    expires_at: string
    created_at: string
    accepted_at: string | null
    is_expired: boolean
    is_accepted: boolean
  }
  const [invitations, setInvitations] = useState<PendingInvitation[]>([])
  const [isResending, setIsResending] = useState<string | null>(null)
  const [isRevoking, setIsRevoking] = useState<string | null>(null)

  // Derive current user's role from team members list
  const currentUserRole = teamMembers.find(m => m.id === profile?.id)?.role ?? "member"

  // Fetch team members from API
  const fetchMembers = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch('/api/v1/settings/users?is_active=true', {
        credentials: 'include',
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to fetch team members')
      }
      const data = await response.json()
      setTeamMembers(data.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team members')
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Fetch pending invitations from API
  const fetchInvitations = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/settings/invitations', {
        credentials: 'include',
      })
      if (!response.ok) return
      const data = await response.json()
      setInvitations(data.invitations || [])
    } catch {
      // Non-critical — don't block the page if invitations fail to load
    }
  }, [])

  useEffect(() => {
    fetchMembers()
    fetchInvitations()
  }, [fetchMembers, fetchInvitations])

  // Handle resend invitation
  const handleResendInvitation = async (invitationId: string) => {
    setIsResending(invitationId)
    try {
      const response = await fetchWithCsrf(`/api/v1/settings/invitations/${invitationId}/resend`, {
        method: 'POST',
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to resend invitation')
      }
      toast.success('Invitation resent successfully')
      fetchInvitations()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resend invitation')
    } finally {
      setIsResending(null)
    }
  }

  // Handle revoke invitation
  const handleRevokeInvitation = async (invitationId: string) => {
    setIsRevoking(invitationId)
    try {
      const response = await fetchWithCsrf(`/api/v1/settings/invitations/${invitationId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to revoke invitation')
      }
      toast.success('Invitation revoked')
      setInvitations(prev => prev.filter(i => i.id !== invitationId))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to revoke invitation')
    } finally {
      setIsRevoking(null)
    }
  }

  // Handle member update (from profile edit)
  const handleMemberUpdate = (updated: TeamMember) => {
    setTeamMembers(prev => prev.map(m => m.id === updated.id ? updated : m))
  }

  // Handle member removal
  const handleRemoveMember = async () => {
    if (!memberToRemove) return

    setIsRemoving(true)
    try {
      const response = await fetchWithCsrf(`/api/v1/settings/users/${memberToRemove.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove user')
      }

      toast.success(`${memberToRemove.first_name} has been removed from the workspace`)
      setTeamMembers(prev => prev.filter(m => m.id !== memberToRemove.id))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove user')
    } finally {
      setIsRemoving(false)
      setMemberToRemove(null)
    }
  }

  // Filter members by search and role
  const filteredMembers = teamMembers.filter((member) => {
    const search = searchQuery.toLowerCase()
    const matchesSearch =
      member.first_name.toLowerCase().includes(search) ||
      member.last_name.toLowerCase().includes(search) ||
      member.email.toLowerCase().includes(search)

    const matchesRole = roleFilter === "all" || member.role === roleFilter

    return matchesSearch && matchesRole
  })

  // Compute pending invitations for display
  const pendingInvitations = invitations.filter(i => !i.is_accepted && !i.is_expired)
  const expiredInvitations = invitations.filter(i => !i.is_accepted && i.is_expired)

  const handleExport = () => {
    // In production, this would generate and download a CSV
    console.log("Exporting members list...")
  }

  // Show profile view if a member is selected
  if (selectedMember) {
    return (
      <MemberProfile
        member={selectedMember}
        onBack={() => setSelectedMember(null)}
        onUpdate={handleMemberUpdate}
      />
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={fetchMembers}>
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Section Header - Linear style */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-foreground">Members</h2>
        <Button
          onClick={() => setIsInviteModalOpen(true)}
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Invite people
        </Button>
      </div>

      {/* Pending Invitations Section */}
      {(pendingInvitations.length > 0 || expiredInvitations.length > 0) && (
        <div className="border border-border rounded-lg divide-y divide-border">
          <div className="px-4 py-3 flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Pending Invitations</span>
            <Badge variant="secondary" className="ml-auto">
              {pendingInvitations.length} pending
            </Badge>
          </div>

          {pendingInvitations.map((inv) => {
            const expiresIn = Math.max(0, Math.ceil((new Date(inv.expires_at).getTime() - Date.now()) / (1000 * 60 * 60)))
            return (
              <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 bg-amber-500/20">
                    <AvatarFallback className="text-amber-600 text-sm font-medium">
                      {inv.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-foreground">{inv.email}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Expires in {expiresIn}h</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize text-amber-600 border-amber-300">
                    {inv.role}
                  </Badge>
                  <Badge variant="secondary" className="text-amber-600 bg-amber-50">
                    Pending
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={isResending === inv.id}
                    onClick={() => handleResendInvitation(inv.id)}
                    title="Resend invitation"
                  >
                    {isResending === inv.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    disabled={isRevoking === inv.id}
                    onClick={() => handleRevokeInvitation(inv.id)}
                    title="Revoke invitation"
                  >
                    {isRevoking === inv.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )
          })}

          {expiredInvitations.map((inv) => (
            <div key={inv.id} className="flex items-center justify-between px-4 py-3 opacity-50">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8 bg-muted">
                  <AvatarFallback className="text-muted-foreground text-sm font-medium">
                    {inv.email.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">Expired</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {inv.role}
                </Badge>
                <Badge variant="secondary" className="text-muted-foreground">
                  Expired
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  disabled={isResending === inv.id}
                  onClick={() => handleResendInvitation(inv.id)}
                  title="Resend invitation"
                >
                  {isResending === inv.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  disabled={isRevoking === inv.id}
                  onClick={() => handleRevokeInvitation(inv.id)}
                  title="Revoke invitation"
                >
                  {isRevoking === inv.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search and Filter Row - Linear style */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 min-w-[100px]">
              {roleFilter === "all" ? "All" : roleFilter.charAt(0).toUpperCase() + roleFilter.slice(1)}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setRoleFilter("all")}>
              All
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRoleFilter("owner")}>
              Owner
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRoleFilter("admin")}>
              Admin
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRoleFilter("manager")}>
              Manager
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRoleFilter("member")}>
              Member
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Members List - Linear style clean rows */}
      <div className="border border-border rounded-lg divide-y divide-border">
        {filteredMembers.map((member) => (
          <div
            key={member.id}
            onClick={() => setSelectedMember(member)}
            className="flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Avatar className={`h-8 w-8 ${getMemberColor(member.full_name ?? `${member.first_name} ${member.last_name}`)}`}>
                <AvatarFallback className="text-white text-sm font-medium">
                  {getInitials(member.first_name, member.last_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {member.first_name} {member.last_name}
                </p>
                <p className="text-sm text-muted-foreground">{member.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge
                variant={member.role === "admin" ? "default" : "secondary"}
                className="capitalize"
              >
                {member.role}
              </Badge>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSelectedMember(member)}>
                    Edit profile
                  </DropdownMenuItem>
                  {canChangeRole(currentUserRole, member.role, member.id, profile?.id ?? "") && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        setMemberToChangeRole(member)
                      }}
                    >
                      Change role
                    </DropdownMenuItem>
                  )}
                  {/* Show "Manage Client Access" only for Members (hierarchy_level=4) */}
                  {member.hierarchy_level === RoleHierarchyLevel.MEMBER && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation()
                        setMemberForClientAccess(member)
                      }}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Manage Client Access
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem>View activity</DropdownMenuItem>
                  {canDelete(currentUserRole, member.role, member.id, profile?.id ?? "") && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          setMemberToRemove(member)
                        }}
                      >
                        Remove from workspace
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}

        {filteredMembers.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No members found matching your search.
          </div>
        )}
      </div>

      {/* Export Section - Linear style */}
      <button
        onClick={handleExport}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Download className="h-4 w-4" />
        Export members list
      </button>

      {/* Invitation Modal */}
      <UserInvitationModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={() => {
          fetchMembers()
          fetchInvitations()
        }}
      />

      {/* Client Assignment Modal (for Members only) */}
      <ClientAssignmentModal
        isOpen={!!memberForClientAccess}
        onClose={() => setMemberForClientAccess(null)}
        member={memberForClientAccess}
        onSuccess={() => {
          // Could refresh member list if showing client count badges
        }}
      />

      {/* Change Role Dialog */}
      {memberToChangeRole && (
        <ChangeRoleDialog
          member={memberToChangeRole}
          currentUserRole={currentUserRole}
          onClose={() => setMemberToChangeRole(null)}
          onSuccess={handleMemberUpdate}
        />
      )}

      {/* Remove Member Confirmation Dialog */}
      {memberToRemove && (
        <AlertDialog open onOpenChange={() => setMemberToRemove(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove team member?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove {memberToRemove.first_name} {memberToRemove.last_name} from the workspace?
                This action will revoke their access immediately.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemoveMember}
                disabled={isRemoving}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isRemoving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
