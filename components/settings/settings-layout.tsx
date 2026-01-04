"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { useSettingsStore } from "@/stores/settings-store"
import { useAuthStore } from "@/lib/store"
import type { SettingsSection } from "@/types/settings"
import { SETTINGS_PERMISSIONS } from "@/types/settings"
import { ChevronLeft, Building2, User, Users } from "lucide-react"

// Workspace settings items (admin/agency-level)
const workspaceItems: Array<{
  id: SettingsSection
  label: string
  adminOnly?: boolean
}> = [
  { id: "agency_profile", label: "General" },
  { id: "team_members", label: "Members", adminOnly: true },
  { id: "pipeline", label: "Pipeline Stages", adminOnly: true },
  { id: "ai_configuration", label: "AI Configuration", adminOnly: true },
  { id: "audit_log", label: "Audit Log", adminOnly: true },
]

// My Account settings items (user-level)
const accountItems: Array<{
  id: SettingsSection
  label: string
}> = [
  { id: "notifications", label: "Notifications" },
]

interface SettingsLayoutProps {
  children: React.ReactNode
  onBack?: () => void
  onBrandClick?: () => void
}

export function SettingsLayout({ children, onBack, onBrandClick }: SettingsLayoutProps) {
  const { activeSection, setActiveSection, hasUnsavedChanges } = useSettingsStore()
  const { user } = useAuthStore()

  const isAdmin = user?.role === "admin"

  // Check if user can access a section
  const canAccessSection = (section: SettingsSection): boolean => {
    const permission = SETTINGS_PERMISSIONS.find(
      (p) => p.section === section && p.action === "read"
    )
    if (!permission) return false
    return permission.roles.includes(user?.role || "user")
  }

  // Filter workspace items based on permissions
  const visibleWorkspaceItems = workspaceItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false
    return canAccessSection(item.id)
  })

  // Filter account items based on permissions
  const visibleAccountItems = accountItems.filter((item) => canAccessSection(item.id))

  const handleSectionChange = (section: SettingsSection) => {
    if (hasUnsavedChanges) {
      // TODO: Show confirmation dialog
    }
    setActiveSection(section)
  }

  return (
    <div className="flex h-full">
      {/* Settings Sidebar - Linear Style */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Header with back button */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 text-sm hover:text-gray-900 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Settings
          </button>
        </div>

        {/* Scrollable navigation */}
        <div className="flex-1 overflow-y-auto">
          {/* Workspace Section */}
          <div className="p-4">
            <div className="flex items-center mb-4">
              <Building2 className="w-4 h-4 mr-2 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Workspace</span>
            </div>

            <nav className="space-y-1">
              {visibleWorkspaceItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSectionChange(item.id)}
                  className={cn(
                    "block w-full text-left px-3 py-2 text-sm rounded-md transition-colors cursor-pointer",
                      activeSection === item.id
                        ? "bg-gray-100 text-gray-900 font-medium"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  {item.label}
                </button>
              ))}
              {onBrandClick && (
                <button
                  onClick={onBrandClick}
                  className="block w-full text-left px-3 py-2 text-sm rounded-md transition-colors cursor-pointer text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                >
                  Brand
                </button>
              )}
            </nav>
          </div>

          {/* My Account Section */}
          {visibleAccountItems.length > 0 && (
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center mb-4">
                <User className="w-4 h-4 mr-2 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">My Account</span>
              </div>

              <nav className="space-y-1">
                {visibleAccountItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSectionChange(item.id)}
                    className={cn(
                      "block w-full text-left px-3 py-2 text-sm rounded-md transition-colors cursor-pointer",
                      activeSection === item.id
                        ? "bg-gray-100 text-gray-900 font-medium"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          )}

          {/* Teams Section (placeholder for future) */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center mb-4">
              <Users className="w-4 h-4 mr-2 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Teams</span>
            </div>

            <div className="flex items-center px-3 py-2 text-sm text-gray-600">
              <div className="w-6 h-6 bg-blue-500 rounded mr-3 flex items-center justify-center">
                <span className="text-white text-xs font-medium">A</span>
              </div>
              {user?.agency_id ? "Agency Team" : "Default Team"}
            </div>
          </div>
        </div>

        {/* Unsaved changes indicator */}
        {hasUnsavedChanges && (
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center text-xs text-amber-600">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse mr-2" />
              Unsaved changes
            </div>
          </div>
        )}
      </aside>

      {/* Settings Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
