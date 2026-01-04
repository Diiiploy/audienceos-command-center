"use client"

import { Mail, Calendar as CalendarIcon } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface TeamMember {
  id: string
  name: string
  initials: string
  color: string
  role: string
  email?: string
  phone?: string
  assignedClients: number
  openTasks: number
  completedTasks: number
  availability: "available" | "busy" | "away"
}

interface TeamViewProps {
  members?: TeamMember[]
  onMemberClick?: (member: TeamMember) => void
}

const defaultMembers: TeamMember[] = [
  {
    id: "1",
    name: "Luke Thompson",
    initials: "LT",
    color: "bg-emerald-500",
    role: "Head of Fulfillment",
    email: "luke@audienceos.com",
    assignedClients: 8,
    openTasks: 12,
    completedTasks: 45,
    availability: "available",
  },
  {
    id: "2",
    name: "Alex Smith",
    initials: "AS",
    color: "bg-blue-500",
    role: "Account Manager",
    email: "alex@audienceos.com",
    assignedClients: 6,
    openTasks: 8,
    completedTasks: 32,
    availability: "busy",
  },
  {
    id: "3",
    name: "Jordan Fields",
    initials: "JF",
    color: "bg-purple-500",
    role: "Technical Specialist",
    email: "jordan@audienceos.com",
    assignedClients: 5,
    openTasks: 15,
    completedTasks: 28,
    availability: "available",
  },
  {
    id: "4",
    name: "Sam Lee",
    initials: "SL",
    color: "bg-amber-500",
    role: "Support Lead",
    email: "sam@audienceos.com",
    assignedClients: 4,
    openTasks: 6,
    completedTasks: 52,
    availability: "away",
  },
]

function getAvailabilityBadge(availability: TeamMember["availability"]) {
  switch (availability) {
    case "available":
      return { label: "Available", class: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" }
    case "busy":
      return { label: "Busy", class: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400" }
    case "away":
      return { label: "Away", class: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400" }
  }
}

function TeamMemberCard({ member, onClick }: { member: TeamMember; onClick?: () => void }) {
  const availability = getAvailabilityBadge(member.availability)
  const completionRate = Math.round((member.completedTasks / (member.completedTasks + member.openTasks)) * 100)

  return (
    <Card
      className="bg-card border border-border/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-start justify-between pb-2 pt-3 px-3">
        <div className="flex items-center gap-3">
          <Avatar className={cn("h-10 w-10", member.color)}>
            <AvatarFallback className={cn(member.color, "text-sm font-medium text-white")}>
              {member.initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-sm font-medium text-foreground">{member.name}</h3>
            <p className="text-xs text-muted-foreground">{member.role}</p>
          </div>
        </div>
        <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", availability.class)}>
          {availability.label}
        </Badge>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="text-lg font-semibold text-foreground">{member.assignedClients}</div>
            <div className="text-[10px] text-muted-foreground">Clients</div>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="text-lg font-semibold text-foreground">{member.openTasks}</div>
            <div className="text-[10px] text-muted-foreground">Open Tasks</div>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded">
            <div className="text-lg font-semibold text-foreground">{completionRate}%</div>
            <div className="text-[10px] text-muted-foreground">Complete</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>Task Progress</span>
            <span>{member.completedTasks}/{member.completedTasks + member.openTasks}</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {/* Contact Actions */}
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="h-7 flex-1 text-xs gap-1.5">
            <Mail className="h-3 w-3" />
            Email
          </Button>
          <Button variant="ghost" size="sm" className="h-7 flex-1 text-xs gap-1.5">
            <CalendarIcon className="h-3 w-3" />
            Schedule
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function TeamView({ members = defaultMembers, onMemberClick }: TeamViewProps) {
  const totalClients = members.reduce((sum, m) => sum + m.assignedClients, 0)
  const totalOpenTasks = members.reduce((sum, m) => sum + m.openTasks, 0)
  const availableCount = members.filter(m => m.availability === "available").length

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="bg-card border border-border/50 shadow-sm">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-semibold text-foreground">{members.length}</div>
            <div className="text-xs text-muted-foreground">Team Members</div>
          </CardContent>
        </Card>
        <Card className="bg-card border border-border/50 shadow-sm">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-semibold text-foreground">{totalClients}</div>
            <div className="text-xs text-muted-foreground">Assigned Clients</div>
          </CardContent>
        </Card>
        <Card className="bg-card border border-border/50 shadow-sm">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-semibold text-foreground">{totalOpenTasks}</div>
            <div className="text-xs text-muted-foreground">Open Tasks</div>
          </CardContent>
        </Card>
        <Card className="bg-card border border-border/50 shadow-sm">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-semibold text-emerald-600">{availableCount}</div>
            <div className="text-xs text-muted-foreground">Available Now</div>
          </CardContent>
        </Card>
      </div>

      {/* Team Member Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {members.map((member) => (
          <TeamMemberCard
            key={member.id}
            member={member}
            onClick={() => onMemberClick?.(member)}
          />
        ))}
      </div>
    </div>
  )
}
