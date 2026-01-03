"use client"

import { useState } from "react"
import { TaskStatusCards } from "./task-status-cards"
import { TaskCharts } from "./task-charts"
import { TaskActivity } from "./task-activity"
import { NavigationTabs } from "./navigation-tabs"
import { ActionBar } from "./action-bar"
import { MetricCardSparkline } from "./metric-card-sparkline"
import { ProgressList } from "./progress-list"
import { TeamView } from "./team-view"
import { CalendarView } from "./calendar-view"
import { ListView } from "./list-view"
import { BoardView } from "./board-view"

interface ClickUpDashboardProps {
  onAddCard?: () => void
}

// Sample sparkline data
const clientsSparkline = [
  { value: 18 }, { value: 22 }, { value: 19 }, { value: 24 },
  { value: 21 }, { value: 26 }, { value: 28 }, { value: 32 }
]

const revenueSparkline = [
  { value: 42000 }, { value: 45000 }, { value: 44000 }, { value: 48000 },
  { value: 52000 }, { value: 51000 }, { value: 56000 }, { value: 58500 }
]

const ticketsSparkline = [
  { value: 12 }, { value: 8 }, { value: 15 }, { value: 11 },
  { value: 9 }, { value: 7 }, { value: 6 }, { value: 5 }
]

const healthSparkline = [
  { value: 78 }, { value: 82 }, { value: 79 }, { value: 85 },
  { value: 88 }, { value: 86 }, { value: 91 }, { value: 94 }
]

// Client progress data
const clientProgressData = [
  { id: "1", label: "RTA Outdoor Living", value: 8, maxValue: 12, color: "bg-blue-500", avatar: { initials: "RO", color: "bg-blue-500" }, sublabel: "Installation" },
  { id: "2", label: "Terren", value: 14, maxValue: 16, color: "bg-emerald-500", avatar: { initials: "TR", color: "bg-emerald-500" }, sublabel: "Live" },
  { id: "3", label: "Glow Recipe", value: 6, maxValue: 10, color: "bg-pink-500", avatar: { initials: "GR", color: "bg-pink-500" }, sublabel: "Onboarding" },
  { id: "4", label: "MVMT Watches", value: 18, maxValue: 20, color: "bg-purple-500", avatar: { initials: "MW", color: "bg-purple-500" }, sublabel: "Live" },
  { id: "5", label: "Beardbrand", value: 3, maxValue: 8, color: "bg-amber-500", avatar: { initials: "BB", color: "bg-amber-500" }, sublabel: "Needs Support" },
]

// Stage distribution data
const stageData = [
  { id: "1", label: "Live", value: 8, color: "bg-emerald-500" },
  { id: "2", label: "Installation", value: 4, color: "bg-blue-500" },
  { id: "3", label: "Onboarding", value: 3, color: "bg-purple-500" },
  { id: "4", label: "Audit", value: 2, color: "bg-amber-500" },
  { id: "5", label: "Needs Support", value: 1, color: "bg-red-500" },
]

// Overview/Dashboard content component
function OverviewContent() {
  return (
    <>
      {/* Sparkline Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCardSparkline
          title="Active Clients"
          value="32"
          subtitle="total clients"
          trend="up"
          trendValue="+12% from last month"
          sparklineData={clientsSparkline}
          sparklineColor="#10b981"
        />
        <MetricCardSparkline
          title="Monthly Revenue"
          value="$58.5K"
          subtitle="this month"
          trend="up"
          trendValue="+8.2% vs target"
          sparklineData={revenueSparkline}
          sparklineColor="#3b82f6"
        />
        <MetricCardSparkline
          title="Open Tickets"
          value="5"
          subtitle="pending resolution"
          trend="down"
          trendValue="-58% from last week"
          sparklineData={ticketsSparkline}
          sparklineColor="#f59e0b"
        />
        <MetricCardSparkline
          title="Client Health"
          value="94%"
          subtitle="average score"
          trend="up"
          trendValue="+6 pts this quarter"
          sparklineData={healthSparkline}
          sparklineColor="#8b5cf6"
        />
      </div>

      {/* Original Task Status Cards */}
      <TaskStatusCards />

      {/* Progress Lists + Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <ProgressList
          title="Client Progress"
          items={clientProgressData}
          showPercentage
          valueSuffix=" tasks"
        />
        <ProgressList
          title="Clients by Stage"
          items={stageData}
          showValue
          valueSuffix=" clients"
        />
        <div className="space-y-3">
          <TaskActivity
            statusCounts={[
              { status: "Open", current: 2, total: 5, color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400" },
              { status: "In Progress", current: 5, total: 5, color: "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-400" },
            ]}
            activities={[
              {
                id: "1",
                title: "RTA Outdoor Living",
                time: "2 hours ago",
                action: "moved to",
                fromStatus: "Audit",
                toStatus: "Installation",
              },
            ]}
          />
        </div>
      </div>

      {/* Charts Row */}
      <TaskCharts />
    </>
  )
}

export function ClickUpDashboard({ onAddCard }: ClickUpDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview")

  const renderContent = () => {
    switch (activeTab) {
      case "list":
        return <ListView />
      case "board":
        return <BoardView />
      case "team":
        return <TeamView />
      case "calendar":
        return <CalendarView />
      case "overview":
      default:
        return <OverviewContent />
    }
  }

  return (
    <div className="space-y-4">
      <NavigationTabs activeTab={activeTab} onTabChange={setActiveTab} onAddCard={onAddCard} />
      <ActionBar />
      {renderContent()}
    </div>
  )
}
