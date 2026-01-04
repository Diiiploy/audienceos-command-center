"use client"

import React from "react"
import { Search, LayoutGrid, List, SortAsc, MoreHorizontal, X, ChevronDown, Download, RefreshCw, Settings, Columns } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export interface FilterOption {
  label: string
  value: string
}

export interface FilterConfig {
  id: string
  label: string
  options: FilterOption[]
}

export interface ActiveFilters {
  [key: string]: string | null
}

export interface SortOption {
  id: string
  label: string
  description?: string
}

interface ListHeaderProps {
  title: string
  count?: number
  onSearch?: (query: string) => void
  searchValue?: string
  searchPlaceholder?: string
  viewMode?: "list" | "board"
  onViewModeChange?: (mode: "list" | "board") => void
  actions?: React.ReactNode
  filters?: FilterConfig[]
  activeFilters?: ActiveFilters
  onFilterChange?: (filterId: string, value: string | null) => void
  // Sorting
  sortOptions?: SortOption[]
  activeSort?: string
  onSortChange?: (sortId: string) => void
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
  filters,
  activeFilters = {},
  onFilterChange,
  sortOptions,
  activeSort,
  onSortChange,
}: ListHeaderProps) {
  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length
  const activeSortOption = sortOptions?.find(s => s.id === activeSort)

  return (
    <header className="flex flex-col gap-2 p-4 border-b border-border bg-background">
      <div className="flex items-center justify-between">
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

          {/* Sort dropdown */}
          {sortOptions && sortOptions.length > 0 && onSortChange && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 gap-1.5 text-xs"
                  aria-label={`Sort by ${activeSortOption?.label || "priority"}`}
                >
                  <SortAsc className="h-4 w-4" />
                  <span className="hidden sm:inline">{activeSortOption?.label || "Sort"}</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {sortOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.id}
                    onClick={() => onSortChange(option.id)}
                    className={cn(
                      "text-sm cursor-pointer flex flex-col items-start gap-0.5",
                      activeSort === option.id && "bg-primary/10 text-primary"
                    )}
                  >
                    <span>{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="w-4 h-4 mr-2" />
                Export
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Columns className="w-4 h-4 mr-2" />
                Manage Columns
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                View Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {actions}
        </div>
      </div>

      {/* Filter dropdowns row - accessible with keyboard navigation */}
      {filters && filters.length > 0 && onFilterChange && (
        <div
          className="flex items-center gap-2"
          role="toolbar"
          aria-label="Filter options"
        >
          {filters.map((filter, _index) => {
            const activeValue = activeFilters[filter.id]
            const activeOption = filter.options.find(o => o.value === activeValue)
            const _filterLabel = activeOption ? `${filter.label}: ${activeOption.label}` : filter.label

            return (
              <DropdownMenu key={filter.id}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={activeValue ? "secondary" : "ghost"}
                    size="sm"
                    className={cn(
                      "h-7 px-2 text-xs gap-1 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                      activeValue && "bg-primary/10 text-primary border border-primary/30"
                    )}
                    aria-label={`Filter by ${filter.label}${activeValue ? `, currently ${activeOption?.label}` : ""}`}
                    aria-haspopup="listbox"
                    aria-expanded="false"
                  >
                    {activeOption ? activeOption.label : filter.label}
                    <ChevronDown className="h-3 w-3" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="w-40"
                  role="listbox"
                  aria-label={`${filter.label} options`}
                >
                  {filter.options.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => onFilterChange(filter.id, option.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          onFilterChange(filter.id, option.value)
                        }
                      }}
                      className={cn(
                        "text-sm cursor-pointer focus:bg-accent focus:text-accent-foreground",
                        activeValue === option.value && "bg-primary/10 text-primary"
                      )}
                      role="option"
                      aria-selected={activeValue === option.value}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                  {activeValue && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onFilterChange(filter.id, null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            onFilterChange(filter.id, null)
                          }
                        }}
                        className="text-sm cursor-pointer text-muted-foreground focus:bg-accent focus:text-accent-foreground"
                        role="option"
                        aria-selected={false}
                      >
                        <X className="h-3 w-3 mr-1" aria-hidden="true" />
                        Clear filter
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )
          })}

          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              onClick={() => {
                filters.forEach(f => onFilterChange(f.id, null))
              }}
              aria-label={`Clear all ${activeFilterCount} active filters`}
            >
              <X className="h-3 w-3 mr-1" aria-hidden="true" />
              Clear all ({activeFilterCount})
            </Button>
          )}
        </div>
      )}
    </header>
  )
}
