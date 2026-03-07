"use client"

import * as React from "react"
import { useState } from "react"
import type { DateRange } from "react-day-picker"
import { ArrowLeftRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { cn } from "@/lib/utils"

export interface TimeFilterValue {
  preset: string // "7" | "30" | "90" | "180" | "365" | "custom"
  startDate?: string // ISO YYYY-MM-DD
  endDate?: string
  compareEnabled: boolean
  comparePreset: string // "previous" | "lastYear" | "custom"
  compareStartDate?: string
  compareEndDate?: string
}

interface PerformanceTimeFilterProps {
  value: TimeFilterValue
  onChange: (value: TimeFilterValue) => void
  platform: string
  onPlatformChange: (platform: string) => void
  className?: string
}

const PRESETS = [
  { value: "7", label: "Past Week" },
  { value: "30", label: "Past 30 Days" },
  { value: "90", label: "Past 3 Months" },
  { value: "180", label: "Past 6 Months" },
  { value: "365", label: "Past 1 Year" },
  { value: "custom", label: "Custom Range" },
]

/**
 * Compute compareStartDate/compareEndDate from the filter state.
 * Returns undefined if compare is not enabled.
 */
export function computeCompareDates(value: TimeFilterValue): {
  compareStartDate?: string
  compareEndDate?: string
} {
  if (!value.compareEnabled) return {}

  // Custom compare range — user already provided dates
  if (value.comparePreset === "custom") {
    return {
      compareStartDate: value.compareStartDate,
      compareEndDate: value.compareEndDate,
    }
  }

  // Determine current period start/end
  let currentStart: Date
  let currentEnd: Date

  if (value.preset === "custom" && value.startDate && value.endDate) {
    currentStart = new Date(value.startDate)
    currentEnd = new Date(value.endDate)
  } else {
    const days = parseInt(value.preset) || 30
    currentEnd = new Date()
    currentStart = new Date()
    currentStart.setDate(currentEnd.getDate() - days)
  }

  if (value.comparePreset === "lastYear") {
    const compareStart = new Date(currentStart)
    compareStart.setFullYear(compareStart.getFullYear() - 1)
    const compareEnd = new Date(currentEnd)
    compareEnd.setFullYear(compareEnd.getFullYear() - 1)
    return {
      compareStartDate: compareStart.toISOString().split("T")[0],
      compareEndDate: compareEnd.toISOString().split("T")[0],
    }
  }

  // "previous" — let the backend compute it (default behavior)
  return {}
}

/**
 * Get a human-readable label for the comparison period.
 */
export function getCompareLabel(value: TimeFilterValue): string {
  if (!value.compareEnabled) return ""
  if (value.comparePreset === "lastYear") return "vs Same Period Last Year"
  if (value.comparePreset === "custom" && value.compareStartDate && value.compareEndDate) {
    return `vs ${value.compareStartDate} – ${value.compareEndDate}`
  }
  return "vs Previous Period"
}

export function PerformanceTimeFilter({
  value,
  onChange,
  platform,
  onPlatformChange,
  className,
}: PerformanceTimeFilterProps) {
  const [customRange, setCustomRange] = useState<DateRange | undefined>(
    value.startDate && value.endDate
      ? { from: new Date(value.startDate), to: new Date(value.endDate) }
      : undefined
  )
  const [compareRange, setCompareRange] = useState<DateRange | undefined>(
    value.compareStartDate && value.compareEndDate
      ? { from: new Date(value.compareStartDate), to: new Date(value.compareEndDate) }
      : undefined
  )

  const handlePresetChange = (preset: string) => {
    if (preset === "custom") {
      onChange({ ...value, preset })
    } else {
      onChange({
        ...value,
        preset,
        startDate: undefined,
        endDate: undefined,
      })
    }
  }

  const handleCustomRangeSelect = (range: DateRange | undefined) => {
    setCustomRange(range)
    if (range?.from && range?.to) {
      onChange({
        ...value,
        preset: "custom",
        startDate: range.from.toISOString().split("T")[0],
        endDate: range.to.toISOString().split("T")[0],
      })
    }
  }

  const toggleCompare = () => {
    onChange({
      ...value,
      compareEnabled: !value.compareEnabled,
      comparePreset: "previous",
      compareStartDate: undefined,
      compareEndDate: undefined,
    })
  }

  const handleComparePresetChange = (comparePreset: string) => {
    onChange({
      ...value,
      comparePreset,
      compareStartDate: comparePreset === "custom" ? value.compareStartDate : undefined,
      compareEndDate: comparePreset === "custom" ? value.compareEndDate : undefined,
    })
  }

  const handleCompareRangeSelect = (range: DateRange | undefined) => {
    setCompareRange(range)
    if (range?.from && range?.to) {
      onChange({
        ...value,
        comparePreset: "custom",
        compareStartDate: range.from.toISOString().split("T")[0],
        compareEndDate: range.to.toISOString().split("T")[0],
      })
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Time Period Select */}
        <Select value={value.preset} onValueChange={handlePresetChange}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            {PRESETS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Custom Date Range */}
        {value.preset === "custom" && (
          <DateRangePicker
            from={customRange?.from}
            to={customRange?.to}
            onSelect={handleCustomRangeSelect}
          />
        )}

        {/* Platform Filter */}
        <Select value={platform} onValueChange={onPlatformChange}>
          <SelectTrigger className="w-[140px] h-8 text-xs">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="google_ads">Google Ads</SelectItem>
            <SelectItem value="meta_ads">Meta Ads</SelectItem>
          </SelectContent>
        </Select>

        {/* Compare Toggle */}
        <Button
          variant={value.compareEnabled ? "default" : "outline"}
          size="sm"
          onClick={toggleCompare}
          className="text-xs h-8 gap-1.5"
        >
          <ArrowLeftRight className="h-3.5 w-3.5" />
          Compare
        </Button>
      </div>

      {/* Comparison Controls */}
      {value.compareEnabled && (
        <div className="flex items-center gap-2 flex-wrap pl-0.5">
          <span className="text-xs text-muted-foreground">vs</span>
          <Select value={value.comparePreset} onValueChange={handleComparePresetChange}>
            <SelectTrigger className="w-[180px] h-8 text-xs">
              <SelectValue placeholder="Compare to" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="previous">Previous Period</SelectItem>
              <SelectItem value="lastYear">Same Period Last Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {value.comparePreset === "custom" && (
            <DateRangePicker
              from={compareRange?.from}
              to={compareRange?.to}
              onSelect={handleCompareRangeSelect}
            />
          )}
        </div>
      )}
    </div>
  )
}
