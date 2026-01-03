"use client"

import { BarChart3, List, Calendar, LayoutGrid, Users, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Tab {
  id: string
  label: string
  icon?: React.ReactNode
}

interface NavigationTabsProps {
  activeTab?: string
  onTabChange?: (tab: string) => void
  onAddCard?: () => void
}

const defaultTabs: Tab[] = [
  { id: "overview", label: "Overview", icon: <BarChart3 className="w-4 h-4" /> },
  { id: "list", label: "List", icon: <List className="w-4 h-4" /> },
  { id: "board", label: "Board", icon: <LayoutGrid className="w-4 h-4" /> },
  { id: "team", label: "Team", icon: <Users className="w-4 h-4" /> },
  { id: "calendar", label: "Calendar", icon: <Calendar className="w-4 h-4" /> },
]

export function NavigationTabs({
  activeTab = "overview",
  onTabChange,
  onAddCard,
}: NavigationTabsProps) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2">
      <div className="flex items-center gap-1 overflow-x-auto">
        {defaultTabs.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            size="sm"
            onClick={() => onTabChange?.(tab.id)}
            className={cn(
              "gap-2 text-muted-foreground hover:text-foreground",
              activeTab === tab.id && "text-primary border-b-2 border-primary rounded-none"
            )}
          >
            {tab.icon}
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onAddCard}>
          <Plus className="w-4 h-4 mr-1" />
          Add card
        </Button>
      </div>
    </div>
  )
}
