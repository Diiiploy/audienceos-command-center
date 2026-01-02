"use client"

import React from "react"
import { Search, Filter, LayoutGrid, List, SortAsc, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface ListHeaderProps {
  title: string
  count?: number
  onSearch?: (query: string) => void
  searchValue?: string
  searchPlaceholder?: string
  viewMode?: "list" | "board"
  onViewModeChange?: (mode: "list" | "board") => void
  actions?: React.ReactNode
}

export function ListHeader({
  title,
  count,
  onSearch,
  searchValue = "",
  searchPlaceholder = "Search...",
  viewMode = "list",
  onViewModeChange,
  actions,
}: ListHeaderProps) {
  return (
    <header className="flex items-center justify-between p-4 border-b border-border bg-background">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          {count !== undefined && (
            <span className="text-sm text-muted-foreground">({count})</span>
          )}
        </div>

        {/* Search */}
        {onSearch && (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearch(e.target.value)}
              className="pl-8 h-8 w-48 bg-secondary border-border text-sm"
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* View toggle */}
        {onViewModeChange && (
          <div className="flex items-center bg-secondary rounded p-0.5">
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-7 px-2", viewMode === "list" && "bg-background")}
              onClick={() => onViewModeChange("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-7 px-2", viewMode === "board" && "bg-background")}
              onClick={() => onViewModeChange("board")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Actions */}
        <Button variant="ghost" size="sm" className="h-8 px-2">
          <Filter className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 px-2">
          <SortAsc className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="h-8 px-2">
          <MoreHorizontal className="h-4 w-4" />
        </Button>

        {actions}
      </div>
    </header>
  )
}
