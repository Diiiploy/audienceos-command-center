# User Story Backlog

> **Project:** AudienceOS Command Center
> **Updated:** 2025-12-31
> **Total Stories:** 56
> **Source:** Consolidated from feature specs

---

## Epic A: Core Platform (MVP)

### A1: Dashboard Overview

**US-001: View Executive KPI Dashboard**
As an Account Manager, I want to see key metrics at a glance, so that I can quickly assess agency performance and identify issues.

Acceptance Criteria:
- [ ] Dashboard displays: Active Onboardings, At-Risk Clients, Support Hours This Week, Avg Install Time
- [ ] Each KPI card shows current value and trend indicator (↑↓)
- [ ] Real-time updates via Supabase Realtime for critical metrics
- [ ] Hourly background refresh with manual "Refresh" button
- [ ] Click any KPI to drill down to filtered list

**US-002: View Client Trend Charts**
As an Account Manager, I want to see visualizations of client trends, so that I can spot patterns over time.

Acceptance Criteria:
- [ ] "New vs Completed Installs" chart (Recharts area chart)
- [ ] Time period toggles: 7, 30, 90 days
- [ ] Hover tooltips show exact values
- [ ] Responsive design for mobile

**US-003: Dashboard Drill-Down Navigation**
As an Account Manager, I want to click metrics to see details, so that I can investigate issues without searching.

Acceptance Criteria:
- [ ] "At-Risk Clients" → Pipeline filtered to red health
- [ ] "Active Onboardings" → Pipeline filtered to Onboarding stage
- [ ] Filter state preserved in URL query params
- [ ] Back button returns to dashboard

---

### A2: Pipeline Management

**US-004: View Client Pipeline Kanban**
As an Account Manager, I want to see all clients in a visual Kanban board, so that I can track progress at a glance.

Acceptance Criteria:
- [ ] 6 columns: Onboarding, Installation, Audit, Live, Needs Support, Off-Boarding
- [ ] Client cards show: name, health indicator, days in stage, owner, recent note
- [ ] Cards are draggable between columns
- [ ] Column pagination: max 10 cards per page
- [ ] Real-time updates when others move cards

**US-005: Move Clients Between Stages**
As an Account Manager, I want to drag clients between pipeline stages, so that I can update status without opening forms.

Acceptance Criteria:
- [ ] Drag-drop works smoothly (dnd-kit)
- [ ] Confirmation modal for sensitive stages (Needs Support, Off-Boarding)
- [ ] StageEvent record created for audit trail
- [ ] Optimistic UI update with rollback on error
- [ ] Toast notification confirms move

**US-006: View Client Details in Drawer**
As an Account Manager, I want to see comprehensive client details without leaving the pipeline, so that I can work efficiently.

Acceptance Criteria:
- [ ] Slide-out drawer from right side
- [ ] Tabs: Overview, Communications, Tasks, Performance, Media
- [ ] Deep linking: URL updates with client ID
- [ ] Stage history timeline in Overview
- [ ] Close via X button, click outside, or Escape

**US-007: Filter Pipeline by Criteria**
As an Account Manager, I want to filter the pipeline by various criteria, so that I can focus on specific clients.

Acceptance Criteria:
- [ ] Filter chips above board: All, My Clients, At Risk, Blocked
- [ ] "My clients" uses CLIENT_ASSIGNMENT table
- [ ] Multiple filters can be combined
- [ ] Filter state persisted in URL
- [ ] Clear all filters button

---

### A3: Authentication

**US-008: Secure Multi-Tenant Login**
As a User, I want to authenticate and be scoped to my agency, so that I only see my organization's data.

Acceptance Criteria:
- [ ] Supabase Auth with email/password
- [ ] JWT includes agency_id claim
- [ ] RLS policies enforce tenant isolation
- [ ] Session persists across tabs
- [ ] Logout clears all local state

---

## Epic B: Integrations & Sync (v1)

### B1: Integration Management

**US-009: View Integration Status**
As an Admin, I want to see all integrations and their connection status, so that I know what's working.

Acceptance Criteria:
- [ ] Integration cards for: Slack, Gmail, Google Ads, Meta Ads
- [ ] Each card shows: connected/disconnected, last sync time, health
- [ ] "Settings" button opens configuration modal
- [ ] "Test Connection" validates current tokens

**US-010: Connect Slack Integration**
As an Admin, I want to connect Slack via OAuth, so that client messages sync to the platform.

Acceptance Criteria:
- [ ] OAuth 2.0 flow with workspace selection
- [ ] Tokens encrypted via Supabase Vault
- [ ] Configure default channel for notifications
- [ ] Option to sync past 30 days on connect
- [ ] Success confirmation with initial sync trigger

**US-011: Connect Gmail Integration**
As a User, I want to connect Gmail via OAuth, so that email threads appear in client timelines.

Acceptance Criteria:
- [ ] Google OAuth with read/send scope selection
- [ ] Thread-based ingestion (not individual messages)
- [ ] Link emails to clients via contact matching
- [ ] Re-authenticate button for expired tokens

**US-012: Connect Ad Platform Integrations**
As an Admin, I want to connect Google Ads and Meta Ads, so that performance data syncs automatically.

Acceptance Criteria:
- [ ] OAuth for both platforms with account selection
- [ ] Business Manager access for Meta
- [ ] Choose which ad accounts to sync
- [ ] Hourly sync frequency (configurable)
- [ ] MCP fallback for quick setup (chi-gateway)

---

## Epic C: Unified Communications (v1)

### C1: Communications Hub

**US-013: View Unified Communications Timeline**
As an Account Manager, I want to see all Slack and Gmail messages for a client in one timeline, so that I don't miss anything.

Acceptance Criteria:
- [ ] Chronological timeline in client drawer Comms tab
- [ ] Messages from Slack show with Slack icon
- [ ] Emails from Gmail show with Gmail icon
- [ ] Thread grouping with expand/collapse
- [ ] Virtualized list for performance (100+ messages)

**US-014: Filter Communications by Source**
As an Account Manager, I want to filter by Slack or Gmail, so that I can focus on one channel.

Acceptance Criteria:
- [ ] Toggle filter: All, Slack Only, Gmail Only
- [ ] "Needs Reply" filter for unresponded messages
- [ ] Search within timeline
- [ ] Filter state in URL params

**US-015: Reply to Messages**
As an Account Manager, I want to reply to messages directly from the timeline, so that I don't switch apps.

Acceptance Criteria:
- [ ] Reply composer appears below selected message
- [ ] Send via Slack API or Gmail API based on source
- [ ] Optimistic update with rollback on failure
- [ ] Sent confirmation toast

**US-016: AI-Drafted Replies**
As an Account Manager, I want AI to draft replies based on context, so that I respond faster.

Acceptance Criteria:
- [ ] "Draft Reply" button in composer
- [ ] AI uses: conversation history, client data, Knowledge Base
- [ ] Draft appears editable in composer
- [ ] User must confirm before sending
- [ ] Multiple tone options (Professional, Casual)

---

## Epic D: AI Intelligence Layer (v1)

### D1: Risk Detection

**US-017: View AI Risk Alerts**
As an Account Manager, I want to see AI-generated risk alerts, so that I can address issues proactively.

Acceptance Criteria:
- [ ] Intelligence Center with 3 sections: Critical, Approvals, Signals
- [ ] Alert cards show: client, risk type, confidence, suggested action
- [ ] Risk types: ad disconnect, KPI drop >20%, no activity >7d, missed deadline
- [ ] Alerts can be snoozed, dismissed, or escalated
- [ ] Badge count in navigation for new alerts

**US-018: Resolve Risk Alerts**
As an Account Manager, I want to take action on alerts with AI assistance, so that I resolve issues efficiently.

Acceptance Criteria:
- [ ] Expand alert to see full context
- [ ] "Approve Action" executes suggested fix
- [ ] "Draft Response" generates client message
- [ ] "Snooze" hides until specified time
- [ ] "Dismiss" with reason for learning

### D2: Diii Intelligent Chat

**US-019: Chat with AI Assistant**
As an Account Manager, I want an AI assistant that understands my clients, so that I can get quick answers.

Acceptance Criteria:
- [ ] Floating chat widget on all pages
- [ ] Natural language queries about clients, metrics, SOPs
- [ ] Progressive reveal typing effect (~40 chars/sec)
- [ ] Cross-session memory via Mem0
- [ ] Context persistence to localStorage

**US-020: Smart Query Routing**
As a User, I want the AI to automatically route my queries to the right source, so that I get accurate answers.

Acceptance Criteria:
- [ ] RAG route for document questions (Gemini File Search)
- [ ] Web search route for current events (Exa)
- [ ] Memory route for "do you remember" queries (Mem0)
- [ ] Casual route for simple questions (fast model)
- [ ] Dashboard route for navigation commands

**US-021: AI Self-Awareness**
As a User, I want to ask the AI about the app itself, so that I can learn features without reading docs.

Acceptance Criteria:
- [ ] "What can you do?" lists capabilities
- [ ] "What is ROAS?" explains metrics with formulas
- [ ] "How does health score work?" explains calculation
- [ ] AppKnowledgeService provides structured metadata

**US-022: Cross-Session Memory**
As a User, I want the AI to remember previous conversations, so that I don't repeat context.

Acceptance Criteria:
- [ ] "Do you remember...?" queries search Mem0
- [ ] Top 5 relevant memories injected into prompts
- [ ] Memory scoped to tenant + user
- [ ] Semantic search (not keyword matching)

**US-023: Citation Display**
As a User, I want to see sources for AI answers, so that I can verify information.

Acceptance Criteria:
- [ ] Citations appear as [1], [2] links in responses
- [ ] Clicking citation opens DocumentViewerModal
- [ ] Jump to relevant section in document
- [ ] Fuzzy matching for approximate references

### D3: Draft Generation

**US-024: AI Context-Aware Drafts**
As an Account Manager, I want AI to draft communications based on context, so I respond quickly.

Acceptance Criteria:
- [ ] "Draft Response" button in alerts and comms
- [ ] AI analyzes: conversation history, alerts, Knowledge Base
- [ ] Generated draft includes context and next steps
- [ ] Multiple variations: formal, casual, urgent
- [ ] User can edit before sending

---

## Epic E: Knowledge Base (v1)

**US-025: Browse Knowledge Base**
As an Account Manager, I want to browse and search documents, so I can find relevant SOPs.

Acceptance Criteria:
- [ ] Category navigation: Installation, Tech, Support, Process, Client-Specific
- [ ] Full-text search with highlighting
- [ ] Filter by: category, client/global, date, file type
- [ ] Document cards show: title, category, upload date, word count

**US-026: Upload Documents**
As an Admin, I want to upload documents for AI reference, so the team has centralized knowledge.

Acceptance Criteria:
- [ ] Supported formats: PDF, DOCX, TXT, MD
- [ ] Drag-and-drop upload with progress
- [ ] Set category and client association (or global)
- [ ] Maximum file size: 10MB
- [ ] Auto-extract metadata (pages, words)

**US-027: RAG Document Indexing**
As a System, I want documents indexed for semantic search, so AI can find relevant content.

Acceptance Criteria:
- [ ] Documents indexed to Gemini File Search on upload
- [ ] Multi-tenant isolation: `audienceos-${agencyId}` per agency
- [ ] Chunking for large documents
- [ ] Index status visible: pending, indexing, indexed, failed
- [ ] Re-index button for failed documents

**US-028: View Documents Inline**
As an Account Manager, I want to view documents without downloading, so I stay in the app.

Acceptance Criteria:
- [ ] Modal viewer for PDF, DOCX preview
- [ ] Markdown/TXT rendered with syntax highlighting
- [ ] Jump to specific section from AI citations
- [ ] Download original file button

---

## Epic F: Support Tickets (v1)

**US-029: View Support Tickets Kanban**
As an Account Manager, I want to see tickets in a Kanban board, so I can track status.

Acceptance Criteria:
- [ ] Columns: New, In Progress, Waiting on Client, Resolved
- [ ] Ticket cards: client, summary, priority, age, assignee
- [ ] Drag-drop to change status
- [ ] Filter by: client, priority, assignee, date range
- [ ] Badge count on "New" column

**US-030: Create Support Ticket**
As an Account Manager, I want to create tickets from multiple entry points, so I log issues quickly.

Acceptance Criteria:
- [ ] Create from: Support page, Client drawer, Communications
- [ ] Required: client, summary, priority
- [ ] Optional: description, category, due date
- [ ] Auto-populate client when created from client context
- [ ] Categories: Technical, Billing, Campaign, General, Escalation

**US-031: Manage Ticket Workflow**
As an Account Manager, I want to track and resolve tickets with notes, so I have a complete history.

Acceptance Criteria:
- [ ] Add internal notes (not visible to client)
- [ ] Track time spent (optional)
- [ ] Resolution requires mandatory "Final Note"
- [ ] "Send Client Summary Email" checkbox on resolution
- [ ] "Reopen ticket" returns to In Progress

**US-032: AI-Assisted Ticket Resolution**
As an Account Manager, I want AI suggestions for tickets, so I resolve faster.

Acceptance Criteria:
- [ ] "Suggest Solution" queries Knowledge Base
- [ ] "Draft Response" generates client-facing message
- [ ] AI considers: ticket history, client context, similar tickets
- [ ] Suggestions in collapsible panel
- [ ] Human approval required before action

---

## Epic G: Automations (v1)

**US-033: View Automations Dashboard**
As an Admin, I want to see all automations and their status, so I can manage workflows.

Acceptance Criteria:
- [ ] List with: name, status (active/paused), last run, success rate
- [ ] Quick toggle to enable/disable
- [ ] View run history with success/failure
- [ ] Badge for failed runs requiring attention

**US-034: Create IF/THEN Automation**
As an Admin, I want to create automations with triggers and actions, so I automate tasks.

Acceptance Criteria:
- [ ] Maximum 2 triggers (AND logic)
- [ ] Unlimited chained actions
- [ ] Conditional branching: IF/THEN/ELSE
- [ ] Delayed actions: 0 min to 24 hours
- [ ] Preview mode: test without executing

**US-035: Configure Triggers**
As an Admin, I want various trigger types, so automations respond to different events.

Acceptance Criteria:
- [ ] Stage change: Client moves to specific stage
- [ ] Inactivity: No activity for X days
- [ ] KPI threshold: Metric crosses value
- [ ] New message: Slack/Gmail received
- [ ] Ticket created: New support ticket
- [ ] Scheduled: Run at specific time/day

**US-036: Configure Actions**
As an Admin, I want various action types, so automations perform useful tasks.

Acceptance Criteria:
- [ ] Create task: Add task to client
- [ ] Send notification: Internal Slack/email
- [ ] Draft communication: Queue AI-drafted message
- [ ] Create ticket: Open support ticket
- [ ] Update client: Change stage, health, assignee
- [ ] Add alert: Create Intelligence Center alert

**US-037: Monitor Automation Runs**
As an Admin, I want to see automation history, so I can troubleshoot issues.

Acceptance Criteria:
- [ ] Run history table with filtering
- [ ] Details: trigger event, actions executed, errors
- [ ] Retry button for failed runs
- [ ] Approval queue for actions requiring review

---

## Epic H: Settings (v1)

**US-038: Configure Agency Profile**
As an Admin, I want to configure agency settings, so the platform matches our workflow.

Acceptance Criteria:
- [ ] Edit: agency name, logo, contact info
- [ ] Set default timezone
- [ ] Configure business hours
- [ ] Custom pipeline stages (extend default 6)
- [ ] Health thresholds (days before Yellow/Red)

**US-039: Manage Team Members**
As an Admin, I want to manage users, so I control access.

Acceptance Criteria:
- [ ] View all users: name, email, role, last active, status
- [ ] Invite new users by email
- [ ] Change user role (Admin/User)
- [ ] Deactivate user (preserves data, blocks login)
- [ ] Delete user (requires client reassignment)

**US-040: Configure AI Behavior**
As an Admin, I want to customize AI settings, so responses match our style.

Acceptance Criteria:
- [ ] Set AI assistant name (default: "Diii")
- [ ] Configure response tone: Professional/Casual/Technical
- [ ] Set default response length preference
- [ ] View AI token usage this month
- [ ] Toggle which features use AI

**US-041: Set Notification Preferences**
As a User, I want to configure my notifications, so I only get relevant alerts.

Acceptance Criteria:
- [ ] Email notifications: On/Off per type
- [ ] Slack channel for notifications
- [ ] Digest mode: Daily summary vs real-time
- [ ] Quiet hours: No notifications during times
- [ ] Mute specific clients

---

## Priority Summary

| Priority | Stories | Features |
|----------|---------|----------|
| **P0 (MVP)** | US-001 to US-008 | Dashboard, Pipeline, Auth |
| **P1 (v1 Core)** | US-009 to US-024 | Integrations, Comms, AI |
| **P2 (v1 Complete)** | US-025 to US-041 | KB, Tickets, Automations, Settings |

---

## Changelog

| Date | Change |
|------|--------|
| 2025-12-31 | Consolidated 56 user stories from 9 feature specs |
| 2025-12-31 | Original (13 brief stories from Chase's backlog) |

---

*Living Document - Located at docs/02-specs/USER-STORIES.md*
