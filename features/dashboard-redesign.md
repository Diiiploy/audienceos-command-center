# Dashboard Redesign

**Status:** 📝 Specced
**Created:** 2026-01-03
**Priority:** High

---

## Overview

Redesign the Dashboard to be a unified command center with a Firehose feed, tabbed content views, and Linear-aligned styling.

---

## Layout

### Top Row: KPI Cards (4)

```
┌────────────────┬────────────────┬────────────────┬────────────────┐
│ Active Clients │ Monthly Revenue│ Open Tickets   │ Client Health  │
│      32        │    $58.5K      │      5         │     94%        │
│  +12% ~~~      │  +8.2% ~~~     │  -58% ~~~      │  +6 pts ~~~    │
└────────────────┴────────────────┴────────────────┴────────────────┘
```

**Styling:**
- `bg-card border border-border rounded-lg p-5`
- `hover:border-primary/30 transition-colors`
- `gap-4` between cards
- Sparkline in each card

### Tab Bar

```
[ Overview ]  [ Tasks ]  [ Clients ]  [ Alerts ]  [ Performance ]
```

- Linear tab styling (text buttons, active underline)
- Sits below KPIs, above main content

### Main Area (Overview Tab)

**Two columns:**
- **Left (40%):** Firehose Feed - full height scrolling
- **Right (60%):** Widgets stacked with `space-y-4`

**Widgets (right column):**
1. Client Progress (progress bars per client)
2. Clients by Stage (horizontal bars)
3. Tasks by Assignee (compact donut/bar)

### Bottom: Holy Grail Chat

- Fixed input bar at bottom
- "Ask about your clients..."
- Persistent across all dashboard tabs

---

## Tabs

| Tab | Content | Firehose items that land here |
|-----|---------|-------------------------------|
| **Overview** | Firehose + Widgets (default) | n/a |
| **Tasks** | Assigned work | "Review draft", "Approve report" |
| **Clients** | Client events, stage changes | "Moved to Installation", "Health → Red" |
| **Alerts** | AI-generated risks | "Pixel errors", "Stuck 20+ days" |
| **Performance** | Ad/revenue signals | "ROAS dropped", "Budget cap hit" |

**Within each tab:**
- View switcher: list / kanban / calendar (small toggle)
- Team filter: dropdown to filter by assignee
- Detail drawer: slides from right when item clicked

---

## Firehose Feed

**Location:** Left column of Overview tab

**Item structure:**
```
┌─────────────────────────────────────────────────┐
│ 🔴 Budget Cap Hit                        4h ago │
│ Beardbrand hit daily cap. Campaigns paused.    │
│ [Beardbrand]                      → Performance │
└─────────────────────────────────────────────────┘
```

**Each item has:**
- Severity indicator (🔴 critical / 🟡 warning / ⚪ info)
- Title + timestamp
- Description (one line)
- Tags: Client name, assignee
- Target tab (click → navigates + opens drawer)

**Filters:**
- All | Critical | Needs Action | FYI

---

## Interaction: Click Firehose Item

1. Switch to correct tab (Tasks, Clients, Alerts, Performance)
2. Open detail drawer for that specific item

---

## Sidebar Navigation Update

**New grouped structure:**

```
+ New

Dashboard
Pipeline
Clients

OPERATIONS
  Onboarding
  Support
  Intelligence

RESOURCES
  Knowledge Base
  Automations

CONFIGURE
  Integrations
  Settings
```

---

## Styling Requirements (Linear UI)

**Cards:**
- `bg-card border border-border rounded-lg p-5`
- NO shadows
- `hover:border-primary/30 transition-colors`

**Typography:**
- Title: `font-medium text-foreground`
- Description: `text-sm text-muted-foreground`

**Spacing:**
- `gap-4` between all cards/sections
- `space-y-4` for stacked content
- Uniform spacing everywhere (fix current inconsistencies)

---

## Components to Create/Modify

### New Components
- `components/dashboard/firehose-feed.tsx`
- `components/dashboard/firehose-item.tsx`
- `components/dashboard/dashboard-tabs.tsx`
- `components/dashboard/kpi-card.tsx` (Linear-styled)

### Modify
- `components/dashboard-view.tsx` - complete rewrite
- `components/linear/sidebar.tsx` - add grouping

### Remove/Deprecate
- `components/dashboard/clickup/*` - remove ClickUp-style components
- Current oversized KPI cards
- "Load by Status", "Latest Activity" widgets

---

## Future Ideas (Open Loop)

- **Ticker Tape:** Scrolling Firehose at bottom (War Room style) - saved to mem0

---

*Spec created: 2026-01-03*
