"use client"

import React from "react"
import { LinearSidebar, type LinearView } from "./sidebar"

interface LinearShellProps {
  activeView: LinearView
  onViewChange: (view: LinearView) => void
  onQuickCreate?: () => void
  children: React.ReactNode
  detailPanel?: React.ReactNode
}

export function LinearShell({
  activeView,
  onViewChange,
  onQuickCreate,
  children,
  detailPanel,
}: LinearShellProps) {
  // Only show detail panel for views that use it (pipeline, clients)
  const showDetailPanel = activeView === "pipeline" || activeView === "clients"

  return (
    <div className="flex h-screen bg-background text-foreground">
      <LinearSidebar activeView={activeView} onViewChange={onViewChange} onQuickCreate={onQuickCreate} />
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
      {showDetailPanel && (
        <aside className="w-96 bg-card border-l border-border flex flex-col overflow-hidden">
          {detailPanel}
        </aside>
      )}
    </div>
  )
}
