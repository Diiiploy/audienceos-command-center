"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface CalendarEvent {
  id: string
  title: string
  date: string // YYYY-MM-DD
  type: "task" | "meeting" | "deadline" | "milestone"
  client?: string
  color?: string
}

interface CalendarViewProps {
  events?: CalendarEvent[]
  onEventClick?: (event: CalendarEvent) => void
  onDateClick?: (date: Date) => void
}

const defaultEvents: CalendarEvent[] = [
  { id: "1", title: "RTA Outdoor - DNS Setup", date: "2025-01-03", type: "task", client: "RTA Outdoor Living", color: "bg-blue-500" },
  { id: "2", title: "Terren - Quarterly Review", date: "2025-01-06", type: "meeting", client: "Terren", color: "bg-emerald-500" },
  { id: "3", title: "Glow Recipe - Launch", date: "2025-01-08", type: "milestone", client: "Glow Recipe", color: "bg-pink-500" },
  { id: "4", title: "MVMT - Report Due", date: "2025-01-10", type: "deadline", client: "MVMT Watches", color: "bg-purple-500" },
  { id: "5", title: "Beardbrand - Support Call", date: "2025-01-03", type: "meeting", client: "Beardbrand", color: "bg-amber-500" },
  { id: "6", title: "Team Standup", date: "2025-01-02", type: "meeting", color: "bg-gray-500" },
  { id: "7", title: "Alo Yoga - Pixel Install", date: "2025-01-07", type: "task", client: "Alo Yoga", color: "bg-blue-500" },
]

function getEventTypeBadge(type: CalendarEvent["type"]) {
  switch (type) {
    case "task":
      return { label: "Task", class: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400" }
    case "meeting":
      return { label: "Meeting", class: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" }
    case "deadline":
      return { label: "Deadline", class: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400" }
    case "milestone":
      return { label: "Milestone", class: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400" }
  }
}

export function CalendarView({ events = defaultEvents, onEventClick, onDateClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 0, 1)) // January 2025

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const daysInMonth = lastDayOfMonth.getDate()
  const startingDayOfWeek = firstDayOfMonth.getDay()

  // Create calendar grid
  const calendarDays: (number | null)[] = []

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null)
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  // Get events for a specific day
  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    return events.filter(e => e.date === dateStr)
  }

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const today = new Date()
  const isToday = (day: number) =>
    today.getFullYear() === year && today.getMonth() === month && today.getDate() === day

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <Card className="bg-card border border-border/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-sm font-semibold text-foreground min-w-[140px] text-center">
              {monthNames[month]} {year}
            </h2>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-px mb-1">
            {dayNames.map(day => (
              <div key={day} className="text-center text-[10px] font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-px bg-border rounded overflow-hidden">
            {calendarDays.map((day, index) => {
              const dayEvents = day ? getEventsForDay(day) : []
              return (
                <div
                  key={index}
                  className={cn(
                    "min-h-[80px] bg-card p-1 cursor-pointer hover:bg-muted/50 transition-colors",
                    day === null && "bg-muted/30"
                  )}
                  onClick={() => day && onDateClick?.(new Date(year, month, day))}
                >
                  {day && (
                    <>
                      <div
                        className={cn(
                          "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                          isToday(day) && "bg-primary text-primary-foreground"
                        )}
                      >
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 2).map(event => (
                          <div
                            key={event.id}
                            className={cn(
                              "text-[9px] px-1 py-0.5 rounded truncate text-white",
                              event.color || "bg-primary"
                            )}
                            onClick={(e) => {
                              e.stopPropagation()
                              onEventClick?.(event)
                            }}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-[9px] text-muted-foreground px-1">
                            +{dayEvents.length - 2} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Events List */}
      <Card className="bg-card border border-border/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2 pt-3 px-3">
          <h3 className="text-xs font-medium text-foreground">Upcoming Events</h3>
          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="space-y-2">
            {events.slice(0, 5).map(event => {
              const typeBadge = getEventTypeBadge(event.type)
              return (
                <div
                  key={event.id}
                  className="flex items-center justify-between p-2 rounded hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onEventClick?.(event)}
                >
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", event.color || "bg-primary")} />
                    <div>
                      <div className="text-xs font-medium text-foreground">{event.title}</div>
                      {event.client && (
                        <div className="text-[10px] text-muted-foreground">{event.client}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={cn("text-[9px] px-1.5 py-0", typeBadge.class)}>
                      {typeBadge.label}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
