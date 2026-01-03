"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  BarChart3,
  Users,
  ClipboardList,
  Sparkles,
  Ticket,
  BookOpen,
  Zap,
  Plug,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

interface NavItemProps {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick?: () => void
  collapsed?: boolean
  indent?: boolean
}

function NavItem({ icon, label, active, onClick, collapsed, indent }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full px-3 py-2 text-sm rounded-md transition-colors cursor-pointer",
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50",
        collapsed && "justify-center px-2",
        indent && !collapsed && "pl-6"
      )}
    >
      <span className={cn("w-5 h-5 shrink-0", active && "text-primary")}>{icon}</span>
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            key="label"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1 text-left truncate overflow-hidden"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}

function NavGroup({ label, collapsed }: { label: string; collapsed: boolean }) {
  return (
    <AnimatePresence initial={false}>
      {!collapsed && (
        <motion.div
          key={label}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.15 }}
          className="px-3 pt-4 pb-1 overflow-hidden"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            {label}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export type LinearView =
  | "dashboard"
  | "pipeline"
  | "clients"
  | "onboarding"
  | "intelligence"
  | "tickets"
  | "knowledge"
  | "automations"
  | "integrations"
  | "settings"

interface LinearSidebarProps {
  activeView: LinearView
  onViewChange: (view: LinearView) => void
  onQuickCreate?: () => void
  user?: {
    name: string
    role: string
    initials: string
    color?: string
  }
}

export function LinearSidebar({
  activeView,
  onViewChange,
  onQuickCreate,
  user = {
    name: "Luke",
    role: "Head of Fulfillment",
    initials: "L",
    color: "bg-emerald-500",
  },
}: LinearSidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  // Main nav items (ungrouped at top)
  const mainItems = [
    { id: "dashboard" as const, icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboard" },
    { id: "pipeline" as const, icon: <BarChart3 className="w-5 h-5" />, label: "Pipeline" },
    { id: "clients" as const, icon: <Users className="w-5 h-5" />, label: "Clients" },
  ]

  // Operations group
  const operationsItems = [
    { id: "onboarding" as const, icon: <ClipboardList className="w-5 h-5" />, label: "Onboarding" },
    { id: "tickets" as const, icon: <Ticket className="w-5 h-5" />, label: "Support" },
    { id: "intelligence" as const, icon: <Sparkles className="w-5 h-5" />, label: "Intelligence" },
  ]

  // Resources group
  const resourcesItems = [
    { id: "knowledge" as const, icon: <BookOpen className="w-5 h-5" />, label: "Knowledge Base" },
    { id: "automations" as const, icon: <Zap className="w-5 h-5" />, label: "Automations" },
  ]

  // Configure group
  const configureItems = [
    { id: "integrations" as const, icon: <Plug className="w-5 h-5" />, label: "Integrations" },
    { id: "settings" as const, icon: <Settings className="w-5 h-5" />, label: "Settings" },
  ]

  return (
    <motion.div
      initial={false}
      animate={{ width: collapsed ? 64 : 224 }}
      transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
      className="bg-sidebar border-r border-sidebar-border flex flex-col h-screen"
    >
      {/* Header - matches Pipeline header height */}
      <div className="h-[52px] px-[15px] flex items-center justify-center">
        <div className="flex items-center justify-between w-full">
          <div className={cn("flex items-center", collapsed && "justify-center w-full")}>
            <AnimatePresence mode="wait" initial={false}>
              {!collapsed ? (
                <motion.span
                  key="full-logo"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="text-[17px] tracking-tight text-foreground"
                  style={{
                    fontFamily: 'var(--font-poppins), Poppins, sans-serif'
                  }}
                >
                  <span className="font-light text-muted-foreground">audience</span><span className="text-[15px] font-semibold text-foreground">OS</span>
                </motion.span>
              ) : (
                <motion.span
                  key="short-logo"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="text-[15px] font-normal text-foreground"
                  style={{
                    fontFamily: 'var(--font-poppins), Poppins, sans-serif'
                  }}
                >
                  aOS
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          {!collapsed && (
            <button
              onClick={() => setCollapsed(true)}
              className="p-1 hover:bg-secondary rounded transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Create */}
      <div className="p-3">
        <Button
          onClick={onQuickCreate}
          className={cn(
            "w-full bg-primary hover:bg-primary/90 text-primary-foreground",
            collapsed ? "px-2" : "justify-between"
          )}
          size={collapsed ? "icon" : "default"}
        >
          <span className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {!collapsed && "Quick"}
          </span>
          {!collapsed && (
            <span className="text-xs opacity-70">⌘K</span>
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto">
        {/* Main items (ungrouped) */}
        <div className="space-y-1">
          {mainItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeView === item.id}
              onClick={() => onViewChange(item.id)}
              collapsed={collapsed}
            />
          ))}
        </div>

        {/* Operations group */}
        <NavGroup label="Operations" collapsed={collapsed} />
        <div className="space-y-1">
          {operationsItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeView === item.id}
              onClick={() => onViewChange(item.id)}
              collapsed={collapsed}
            />
          ))}
        </div>

        {/* Resources group */}
        <NavGroup label="Resources" collapsed={collapsed} />
        <div className="space-y-1">
          {resourcesItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeView === item.id}
              onClick={() => onViewChange(item.id)}
              collapsed={collapsed}
            />
          ))}
        </div>

        {/* Configure group */}
        <NavGroup label="Configure" collapsed={collapsed} />
        <div className="space-y-1">
          {configureItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              active={activeView === item.id}
              onClick={() => onViewChange(item.id)}
              collapsed={collapsed}
            />
          ))}
        </div>
      </nav>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-sidebar-border">
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="w-full flex justify-center p-2 hover:bg-secondary rounded transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <Avatar className={cn("h-8 w-8", user.color)}>
              <AvatarFallback className={cn(user.color, "text-sm font-medium text-white")}>
                {user.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.role}</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
