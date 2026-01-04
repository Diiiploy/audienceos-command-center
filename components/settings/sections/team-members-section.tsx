"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, UserPlus, Search, MoreHorizontal, Mail, Shield, Clock } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { UserInvitationModal } from "@/components/settings/modals/user-invitation-modal"
import type { TeamMember, UserInvitation } from "@/types/settings"

// Mock data for demo
const MOCK_TEAM_MEMBERS: TeamMember[] = [
  {
    id: "1",
    agency_id: "demo",
    email: "brent@diiiploy.io",
    first_name: "Brent",
    last_name: "CEO",
    role: "admin",
    avatar_url: null,
    is_active: true,
    last_active_at: new Date().toISOString(),
    created_at: "2024-01-01T00:00:00Z",
    full_name: "Brent CEO",
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
    last_name: "Team",
    role: "user",
    avatar_url: null,
    is_active: true,
    last_active_at: new Date(Date.now() - 86400000).toISOString(),
    created_at: "2024-06-20T00:00:00Z",
    full_name: "Trevor Team",
    client_count: 5,
  },
  {
    id: "4",
    agency_id: "demo",
    email: "chase@diiiploy.io",
    first_name: "Chase",
    last_name: "Client",
    role: "user",
    avatar_url: null,
    is_active: true,
    last_active_at: new Date(Date.now() - 172800000).toISOString(),
    created_at: "2024-08-01T00:00:00Z",
    full_name: "Chase Client",
    client_count: 3,
  },
]

const MOCK_INVITATIONS: UserInvitation[] = [
  {
    id: "inv-1",
    agency_id: "demo",
    email: "newuser@example.com",
    role: "user",
    token: "abc123",
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    accepted_at: null,
    created_by: "1",
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    is_expired: false,
    inviter_name: "Brent CEO",
  },
]

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

function formatLastActive(dateString: string | null): string {
  if (!dateString) return "Never"
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  if (diff < 60000) return "Just now"
  if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`
  return `${Math.floor(diff / 86400000)} days ago`
}

export function TeamMembersSection() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)

  // In production, this would come from the store
  const teamMembers = MOCK_TEAM_MEMBERS
  const invitations = MOCK_INVITATIONS

  // Filter members by search
  const filteredMembers = teamMembers.filter((member) => {
    const search = searchQuery.toLowerCase()
    return (
      member.first_name.toLowerCase().includes(search) ||
      member.last_name.toLowerCase().includes(search) ||
      member.email.toLowerCase().includes(search)
    )
  })

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[12px] font-medium text-foreground flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Team Members
          </h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Manage your agency's team and access permissions
          </p>
        </div>
        <Button
          className="gap-1.5 h-7 text-[10px]"
          onClick={() => setIsInviteModalOpen(true)}
        >
          <UserPlus className="h-3 w-3" />
          Invite User
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <Input
          placeholder="Search team members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-7 bg-secondary border-border h-7 text-[11px]"
        />
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card className="bg-card border-border shadow-sm">
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-[11px] font-medium flex items-center gap-1.5">
              <Mail className="h-3 w-3 text-amber-600 dark:text-amber-500" />
              Pending Invitations ({invitations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-3 pb-3">
            <div className="space-y-2">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-2.5 rounded-md bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center">
                      <Mail className="h-3 w-3 text-amber-600 dark:text-amber-500" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium">{invitation.email}</p>
                      <p className="text-[9px] text-muted-foreground">
                        Invited by {invitation.inviter_name} • Expires in 6 days
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                      {invitation.role}
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px]">
                      Resend
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive hover:text-destructive">
                      Cancel
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Team Members List */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-[11px] font-medium">
            Active Members ({filteredMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-3 pb-3">
          <div className="divide-y divide-border">
            {filteredMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between py-2 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7 bg-primary/20">
                    <AvatarFallback className="bg-primary/20 text-primary font-medium text-[10px]">
                      {getInitials(member.first_name, member.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-[11px] font-medium">
                        {member.first_name} {member.last_name}
                      </p>
                      {member.role === "admin" && (
                        <Badge variant="secondary" className="text-[9px] gap-0.5 px-1 py-0">
                          <Shield className="h-2.5 w-2.5" />
                          Admin
                        </Badge>
                      )}
                    </div>
                    <p className="text-[9px] text-muted-foreground">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">
                      {member.client_count} clients
                    </p>
                    <p className="text-[9px] text-muted-foreground flex items-center gap-0.5 justify-end">
                      <Clock className="h-2.5 w-2.5" />
                      {formatLastActive(member.last_active_at)}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="text-[11px]">Edit User</DropdownMenuItem>
                      <DropdownMenuItem className="text-[11px]">Change Role</DropdownMenuItem>
                      <DropdownMenuItem className="text-[11px]">View Activity</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-[11px] text-destructive">
                        Deactivate User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invitation Modal */}
      <UserInvitationModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={() => {
          // In production, refresh the invitations list here
          // refetchInvitations()
        }}
      />
    </div>
  )
}
