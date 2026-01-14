# FRD - Functional Requirements (Trevor Original)

> Source: Trevor's Project Documents > Markdown Version > Functional Requirements Doc
> Copied: 2026-01-01

## Functional Specifications Document (FSD)
### Diiiploy Command Center

## Roles & Permissions
- **Owner:** Full permissions (hidden system role)
- **Admin:** Manage clients, integrations, automations, users
- **User:** Manage assigned clients, use AI assistant
- **Agent:** AI system role (no autonomous actions)

## UI/UX Global Behaviors
- Skeleton screens for loading
- Soft Fail Model with banner warnings
- Confirmations for destructive actions

## Core Screens

### 1. Dashboard
KPIs, refresh hourly

### 2. Pipeline Kanban
6 stages, drag-drop with validation

### 3. Client Detail Drawer
Comms, Tasks, Performance, Media tabs

### 4. Client List
Search, sort, filter, bulk actions

### 5. Intelligence Center
Risks, Approvals, Performance Signals

### 6. Support Tickets
Kanban with sentiment analysis

### 7. Knowledge Base
Full-text + RAG search

### 8. Automations
IF/THEN builder (2 triggers max)

### 9. Integrations
Slack, Gmail, Google Ads, Meta Ads

## AI Assistant Rules
- Summaries include KPI deltas, risk factors, next steps
- Draft emails use professional tone, require confirmation
- Never autonomous execution
