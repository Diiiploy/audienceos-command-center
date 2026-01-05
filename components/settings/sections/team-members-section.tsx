"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  UserPlus,
  Search,
  MoreHorizontal,
  Link2,
  Copy,
  Check,
  Download,
  ChevronDown,
  ChevronLeft,
  Calendar,
  Github,
  Slack,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserInvitationModal } from "@/components/settings/modals/user-invitation-modal"
import type { TeamMember } from "@/types/settings"

// Mock data for demo
const MOCK_TEAM_MEMBERS: TeamMember[] = [
  {
    id: "1",
    agency_id: "demo",
    email: "brent@diiiploy.io",
    first_name: "Brent",
    last_name: "Walker",
    role: "admin",
    avatar_url: null,
    is_active: true,
    last_active_at: new Date().toISOString(),
    created_at: "2024-01-01T00:00:00Z",
    full_name: "Brent Walker",
    client_count: 12,
  },
  {
    id: "2",
    agency_id: "demo",
    email: "roderic@diiiploy.io",
    first_name: "Roderic",
    last_name: "Andrews",
    role: "admin",
    avatar_url: null,
    is_active: true,
    last_active_at: new Date(Date.now() - 3600000).toISOString(),
    created_at: "2024-03-15T00:00:00Z",
    full_name: "Roderic Andrews",
    client_count: 8,
  },
  {
    id: "3",
    agency_id: "demo",
    email: "trevor@diiiploy.io",
    first_name: "Trevor",
    last_name: "Mills",
    role: "user",
    avatar_url: null,
    is_active: true,
    last_active_at: new Date(Date.now() - 86400000).toISOString(),
    created_at: "2024-06-20T00:00:00Z",
    full_name: "Trevor Mills",
    client_count: 5,
  },
  {
    id: "4",
    agency_id: "demo",
    email: "chase@diiiploy.io",
    first_name: "Chase",
    last_name: "Digital",
    role: "user",
    avatar_url: null,
    is_active: true,
    last_active_at: new Date(Date.now() - 172800000).toISOString(),
    created_at: "2024-08-01T00:00:00Z",
    full_name: "Chase Digital",
    client_count: 3,
  },
]

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
}

function MemberProfile({ member, onBack }: MemberProfileProps) {
  const [firstName, setFirstName] = useState(member.first_name)
  const [lastName, setLastName] = useState(member.last_name)
  const [nickname, setNickname] = useState(member.first_name.toLowerCase())
  const [role, setRole] = useState(member.role)

  const fullName = member.full_name ?? `${member.first_name} ${member.last_name}`
  const avatarColor = getMemberColor(fullName)

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

        {/* Role */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Role</Label>
            <p className="text-sm text-muted-foreground">
              Permissions level in workspace
            </p>
          </div>
          <Select value={role} onValueChange={(v) => setRole(v as "admin" | "user")}>
            <SelectTrigger className="w-[280px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Connected Integrations */}
      <div className="border border-border rounded-lg">
        <div className="p-4 border-b border-border">
          <p className="text-sm text-muted-foreground">Personal integrations</p>
        </div>

        <div className="divide-y divide-border">
          {/* Google Calendar */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-secondary">
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Google Calendar</p>
                <p className="text-sm text-muted-foreground">
                  Display out of office status
                </p>
              </div>
            </div>
            <Button variant="ghost" className="text-primary">
              Connect →
            </Button>
          </div>

          {/* Slack */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-secondary">
                <Slack className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Slack</p>
                <p className="text-sm text-muted-foreground">
                  Receive notifications in Slack
                </p>
              </div>
            </div>
            <Button variant="ghost" className="text-primary">
              Connect →
            </Button>
          </div>

          {/* GitHub */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-secondary">
                <Github className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">GitHub</p>
                <p className="text-sm text-muted-foreground">
                  Link activity with account
                </p>
              </div>
            </div>
            <Button variant="ghost" className="text-primary">
              Connect →
            </Button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button>Save changes</Button>
      </div>
    </div>
  )
}

// ============================================================================
// Main Team Members Section
// ============================================================================

export function TeamMembersSection() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteLinkEnabled, setInviteLinkEnabled] = useState(false)
  const [copied, setCopied] = useState(false)
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all")
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)

  // In production, this would come from the store
  const teamMembers = MOCK_TEAM_MEMBERS

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

  const inviteLink = "https://app.audienceos.com/join/abc123xyz"

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
      />
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

      {/* Invite Link Section - Linear style */}
      <div className="border border-border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-secondary">
              <Link2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Invite link</p>
              <p className="text-sm text-muted-foreground">
                {inviteLinkEnabled
                  ? "Anyone with this link can join your workspace"
                  : "Enable to allow anyone with the link to join"
                }
              </p>
            </div>
          </div>
          <Switch
            checked={inviteLinkEnabled}
            onCheckedChange={setInviteLinkEnabled}
          />
        </div>

        {inviteLinkEnabled && (
          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 px-3 py-2 bg-secondary rounded-md text-sm text-muted-foreground truncate">
              {inviteLink}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="gap-2 shrink-0"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy link
                </>
              )}
            </Button>
          </div>
        )}
      </div>

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 min-w-[100px]">
              {roleFilter === "all" ? "All" : roleFilter === "admin" ? "Admin" : "User"}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setRoleFilter("all")}>
              All
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRoleFilter("admin")}>
              Admin
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRoleFilter("user")}>
              User
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
              <DropdownMenu>
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
                  <DropdownMenuItem>Change role</DropdownMenuItem>
                  <DropdownMenuItem>View activity</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">
                    Remove from workspace
                  </DropdownMenuItem>
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
          // In production, refresh the invitations list here
        }}
      />
    </div>
  )
}
