# FEATURE SPEC: Support Tickets

**What:** Kanban-based support ticket management with AI-assisted resolution workflow
**Who:** Agency Account Managers tracking and resolving client support issues
**Why:** Centralize support tracking, prevent missed issues, accelerate resolution with AI assistance
**Status:** 📝 Specced

---

## User Stories

**US-029: View Support Tickets Kanban**
As an Account Manager, I want to see tickets in a Kanban board, so that I can track status.

Acceptance Criteria:
- [ ] Columns: New, In Progress, Waiting on Client, Resolved
- [ ] Ticket cards: client, summary, priority, age, assignee
- [ ] Drag-drop to change status
- [ ] Filter by: client, priority, assignee, date range
- [ ] Badge count on "New" column

**US-030: Create Support Ticket**
As an Account Manager, I want to create tickets from multiple entry points, so that I log issues quickly.

Acceptance Criteria:
- [ ] Create from: Support page, Client drawer, Communications
- [ ] Required: client, summary, priority
- [ ] Optional: description, category, due date
- [ ] Auto-populate client when created from client context
- [ ] Categories: Technical, Billing, Campaign, General, Escalation

**US-031: Manage Ticket Workflow**
As an Account Manager, I want to track and resolve tickets with notes, so that I have a complete history.

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

## Functional Requirements

What this feature DOES:
- [ ] Display tickets in draggable Kanban board with real-time updates
- [ ] Support multi-entry ticket creation with context preservation
- [ ] Track complete ticket lifecycle with audit trail and status events
- [ ] Enable internal note-taking with timestamp and user attribution
- [ ] Generate AI-powered solution suggestions from Knowledge Base
- [ ] Draft client-facing communications with contextual awareness
- [ ] Calculate support metrics (resolution time, volume per client)
- [ ] Send automated client summary emails on ticket resolution
- [ ] Filter and search tickets by multiple criteria with URL state
- [ ] Support time tracking for billing and performance analysis

What this feature does NOT do:
- ❌ Provide public-facing client portal (internal agency use only)
- ❌ Enforce SLA with automatic escalation (manual escalation only)
- ❌ Integrate with external systems (Zendesk, ServiceNow)
- ❌ Allow client self-service ticket creation
- ❌ Auto-close tickets without human approval

---

## Data Model

Entities involved:
- TICKET - Core support ticket with lifecycle and assignment tracking
- TICKET_NOTE - Internal and client-facing notes with threading
- CLIENT - Ticket association and context for AI suggestions
- USER - Assignment, note authorship, and audit trail tracking

New fields needed:
| Entity | Field | Type | Description |
|--------|-------|------|-------------|
| TICKET | time_spent_minutes | Integer | Optional time tracking for billing |
| TICKET | resolution_note | Text | Mandatory final note on ticket closure |
| TICKET | client_email_sent | Boolean | Tracks if summary was emailed to client |

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|------------|
| `/api/v1/tickets` | GET | List tickets with filtering and pagination |
| `/api/v1/tickets` | POST | Create new ticket with validation |
| `/api/v1/tickets/{id}` | GET | Single ticket with notes and audit trail |
| `/api/v1/tickets/{id}` | PATCH | Update ticket fields (title, priority, assignee) |
| `/api/v1/tickets/{id}/status` | PATCH | Change status (creates audit event) |
| `/api/v1/tickets/{id}/notes` | GET | List notes with filtering (internal/client) |
| `/api/v1/tickets/{id}/notes` | POST | Add note to ticket |
| `/api/v1/tickets/{id}/resolve` | POST | Resolve with mandatory final note |
| `/api/v1/tickets/{id}/reopen` | POST | Reopen resolved ticket |
| `/api/v1/tickets/{id}/suggest` | POST | AI solution suggestions from Knowledge Base |
| `/api/v1/tickets/{id}/draft` | POST | Generate AI client response draft |
| `/api/v1/tickets/metrics` | GET | Support dashboard metrics |

---

## UI Components

| Component | Purpose |
|-----------|---------|
| TicketKanbanBoard | Main 4-column Kanban with drag-drop functionality |
| TicketCard | Condensed ticket display with priority indicators |
| TicketDetailDrawer | Full ticket view with tabbed interface |
| TicketCreateModal | Multi-step ticket creation form with validation |
| TicketNoteEditor | Rich text editor for internal and client notes |
| TicketResolutionModal | Resolution workflow with final note requirement |
| TicketMetricsDashboard | Support KPI widgets with drill-down |
| AISuggestionPanel | Collapsible AI suggestions with confidence scores |
| TicketFilters | Advanced filtering with saved filter presets |
| TicketSearchInput | Full-text search across tickets and notes |
| PriorityBadge | Color-coded priority indicator with tooltips |
| StatusIndicator | Animated status changes with transition effects |

---

## Implementation Tasks

### Kanban Foundation
- [ ] TASK-001: Set up dnd-kit for drag-and-drop ticket movement
- [ ] TASK-002: Create TicketKanbanBoard with 4 responsive columns
- [ ] TASK-003: Build TicketCard with priority styling and hover states
- [ ] TASK-004: Implement real-time ticket updates via Supabase Realtime
- [ ] TASK-005: Add optimistic UI updates for drag operations

### Ticket CRUD Operations
- [ ] TASK-006: Build TicketCreateModal with multi-step form validation
- [ ] TASK-007: Create TicketDetailDrawer with tabs (Details/Notes/History)
- [ ] TASK-008: Implement ticket editing with field-level permissions
- [ ] TASK-009: Add ticket deletion with soft-delete and restoration
- [ ] TASK-010: Build ticket assignment with user selection dropdown

### Note Management System
- [ ] TASK-011: Create TicketNoteEditor with rich text support
- [ ] TASK-012: Implement note threading for conversation flow
- [ ] TASK-013: Add note visibility toggle (internal/client-facing)
- [ ] TASK-014: Build note history with edit tracking and timestamps
- [ ] TASK-015: Connect notes to communication timeline

### Status Workflow Engine
- [ ] TASK-016: Build status transition validation rules
- [ ] TASK-017: Create audit trail for all status changes
- [ ] TASK-018: Implement TicketResolutionModal with final note requirement
- [ ] TASK-019: Add ticket reopening workflow with justification
- [ ] TASK-020: Build status change notifications for assignees

### AI Integration Layer
- [ ] TASK-021: Connect "Suggest Solution" to Knowledge Base RAG
- [ ] TASK-022: Build AISuggestionPanel with confidence indicators
- [ ] TASK-023: Implement "Draft Response" with client context injection
- [ ] TASK-024: Add similar ticket detection using semantic search
- [ ] TASK-025: Create AI suggestion approval workflow

### Filtering & Search
- [ ] TASK-026: Build TicketFilters with multi-select dropdowns
- [ ] TASK-027: Implement full-text search across tickets and notes
- [ ] TASK-028: Add saved filter presets for common workflows
- [ ] TASK-029: Create advanced date range filtering with presets
- [ ] TASK-030: Persist filter state in URL for bookmarking

### Metrics & Analytics
- [ ] TASK-031: Build support metrics calculation engine
- [ ] TASK-032: Create TicketMetricsDashboard with KPI widgets
- [ ] TASK-033: Implement resolution time tracking and trending
- [ ] TASK-034: Add client-specific support volume analysis
- [ ] TASK-035: Generate automated weekly support reports

### Email Integration
- [ ] TASK-036: Build client summary email template system
- [ ] TASK-037: Implement "Send Client Summary" on resolution
- [ ] TASK-038: Add email preview before sending
- [ ] TASK-039: Track email delivery status and opens
- [ ] TASK-040: Create email template customization interface

---

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Drag ticket to invalid column | Reject drop, show validation message, return to original |
| Create ticket without client | Show client selection modal, prevent submission until selected |
| Resolve ticket without final note | Block resolution, highlight required field |
| Assign to deactivated user | Show warning, suggest alternative assignees |
| Reopen ticket after 30 days | Require manager approval, create audit event |
| AI suggestion service down | Show graceful error, hide suggestion panel |
| Bulk ticket operations | Confirm with summary modal, track progress |
| Client deleted with open tickets | Block deletion, show list of open tickets |
| Concurrent status changes | Last write wins, notify other users of conflict |
| Large note attachments | Upload to storage, link in note, show progress |

---

## Technical Implementation

### Kanban Drag-and-Drop
```typescript
import { DndContext, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

function TicketKanbanBoard({ tickets, onStatusChange }: KanbanProps) {
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const ticket = tickets.find(t => t.id === event.active.id);
    setActiveTicket(ticket || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const ticket = tickets.find(t => t.id === active.id);
    const newStatus = over.id as TicketStatus;

    if (ticket && ticket.status !== newStatus) {
      // Optimistic update
      optimisticUpdateTicket(ticket.id, { status: newStatus });

      try {
        await updateTicketStatus(ticket.id, newStatus);
      } catch (error) {
        // Rollback optimistic update
        optimisticUpdateTicket(ticket.id, { status: ticket.status });
        toast.error('Failed to update ticket status');
      }
    }

    setActiveTicket(null);
  };

  const columns = [
    { id: 'new', title: 'New', tickets: tickets.filter(t => t.status === 'new') },
    { id: 'in_progress', title: 'In Progress', tickets: tickets.filter(t => t.status === 'in_progress') },
    { id: 'waiting_client', title: 'Waiting on Client', tickets: tickets.filter(t => t.status === 'waiting_client') },
    { id: 'resolved', title: 'Resolved', tickets: tickets.filter(t => t.status === 'resolved') }
  ];

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-4 gap-4 h-full">
        {columns.map(column => (
          <KanbanColumn
            key={column.id}
            column={column}
            activeTicket={activeTicket}
          />
        ))}
      </div>
    </DndContext>
  );
}
```

### AI Solution Suggestions
```typescript
async function generateSolutionSuggestions(ticketId: string): Promise<AISuggestion[]> {
  const ticket = await getTicketWithContext(ticketId);

  // Search Knowledge Base for similar issues
  const similarDocs = await searchKnowledgeBase({
    query: `${ticket.category} ${ticket.title} ${ticket.description}`,
    client_id: ticket.client_id,
    limit: 5
  });

  // Find similar resolved tickets
  const similarTickets = await supabase
    .from('tickets')
    .select('title, resolution_note, category')
    .eq('agency_id', ticket.agency_id)
    .eq('status', 'resolved')
    .eq('category', ticket.category)
    .neq('id', ticket.id)
    .limit(3);

  const prompt = `
    Current Ticket:
    Title: ${ticket.title}
    Description: ${ticket.description}
    Category: ${ticket.category}
    Client: ${ticket.client.name}

    Knowledge Base Context:
    ${similarDocs.map(doc => doc.excerpt).join('\n')}

    Similar Resolved Tickets:
    ${similarTickets.data?.map(t => `${t.title}: ${t.resolution_note}`).join('\n')}

    Provide 3 solution suggestions with confidence scores.
  `;

  const response = await ai.generateText(prompt);

  return response.suggestions.map((suggestion, index) => ({
    id: `suggestion_${index}`,
    content: suggestion.content,
    confidence: suggestion.confidence,
    sources: suggestion.sources || [],
    estimated_time: suggestion.estimated_time || '15-30 min'
  }));
}
```

### Ticket Resolution Workflow
```typescript
interface ResolutionData {
  resolution_note: string;
  time_spent_minutes?: number;
  send_client_email: boolean;
  client_email_template?: string;
}

async function resolveTicket(ticketId: string, resolution: ResolutionData) {
  const ticket = await supabase
    .from('tickets')
    .select('*, client(*)')
    .eq('id', ticketId)
    .single();

  if (!ticket.data) throw new Error('Ticket not found');

  // Update ticket status and resolution
  const { error: updateError } = await supabase
    .from('tickets')
    .update({
      status: 'resolved',
      resolved_at: new Date().toISOString(),
      resolution_note: resolution.resolution_note,
      time_spent_minutes: resolution.time_spent_minutes,
      client_email_sent: resolution.send_client_email
    })
    .eq('id', ticketId);

  if (updateError) throw updateError;

  // Create status change audit event
  await supabase
    .from('ticket_status_events')
    .insert({
      ticket_id: ticketId,
      user_id: getCurrentUserId(),
      from_status: ticket.data.status,
      to_status: 'resolved',
      agency_id: ticket.data.agency_id
    });

  // Send client email if requested
  if (resolution.send_client_email && ticket.data.client.email) {
    const emailContent = resolution.client_email_template ||
      await generateClientSummaryEmail(ticket.data, resolution);

    await sendEmail({
      to: ticket.data.client.email,
      subject: `Support Ticket #${ticket.data.number} Resolved`,
      html: emailContent,
      metadata: {
        ticket_id: ticketId,
        type: 'ticket_resolution'
      }
    });
  }

  return { success: true };
}
```

### Real-time Updates
```typescript
useEffect(() => {
  const subscription = supabase
    .channel('ticket-updates')
    .on('postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'tickets',
        filter: `agency_id=eq.${agencyId}`
      },
      handleTicketUpdate
    )
    .on('postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'ticket_notes',
        filter: `agency_id=eq.${agencyId}`
      },
      handleNewNote
    )
    .subscribe();

  return () => subscription.unsubscribe();
}, [agencyId]);

function handleTicketUpdate(payload: any) {
  const updatedTicket = payload.new;

  setTickets(prev => prev.map(ticket =>
    ticket.id === updatedTicket.id
      ? { ...ticket, ...updatedTicket }
      : ticket
  ));

  // Show notification for status changes
  if (payload.old.status !== updatedTicket.status) {
    toast.info(`Ticket #${updatedTicket.number} moved to ${updatedTicket.status}`);
  }
}
```

### Advanced Filtering System
```typescript
interface TicketFilters {
  status?: TicketStatus[];
  priority?: Priority[];
  assignee?: string[];
  client_id?: string[];
  category?: Category[];
  date_range?: { from: Date; to: Date };
  search_query?: string;
}

function useTicketFilters() {
  const [filters, setFilters] = useState<TicketFilters>({});
  const [searchParams, setSearchParams] = useSearchParams();

  // Sync filters with URL
  useEffect(() => {
    const urlFilters: TicketFilters = {};

    if (searchParams.get('status')) {
      urlFilters.status = searchParams.get('status')!.split(',') as TicketStatus[];
    }
    if (searchParams.get('priority')) {
      urlFilters.priority = searchParams.get('priority')!.split(',') as Priority[];
    }
    if (searchParams.get('assignee')) {
      urlFilters.assignee = searchParams.get('assignee')!.split(',');
    }
    if (searchParams.get('search')) {
      urlFilters.search_query = searchParams.get('search')!;
    }

    setFilters(urlFilters);
  }, [searchParams]);

  const updateFilters = (newFilters: Partial<TicketFilters>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);

    // Update URL
    const params = new URLSearchParams();
    if (updated.status?.length) params.set('status', updated.status.join(','));
    if (updated.priority?.length) params.set('priority', updated.priority.join(','));
    if (updated.assignee?.length) params.set('assignee', updated.assignee.join(','));
    if (updated.search_query) params.set('search', updated.search_query);

    setSearchParams(params);
  };

  return { filters, updateFilters };
}
```

---

## Testing Checklist

- [ ] Happy path: Create ticket, add notes, resolve with final note
- [ ] Drag-drop: Move ticket between columns updates status correctly
- [ ] Validation: Cannot resolve without final note, shows error
- [ ] AI suggestions: "Suggest Solution" queries Knowledge Base successfully
- [ ] AI drafts: "Draft Response" generates contextual client message
- [ ] Real-time: New tickets appear immediately for all users
- [ ] Filtering: All filter combinations work correctly
- [ ] Search: Full-text search finds tickets by title, description, notes
- [ ] Email: Client summary sends on resolution when checkbox checked
- [ ] Permissions: Users can only see tickets for their agency
- [ ] Metrics: Resolution time calculates accurately
- [ ] Reopen: Reopened tickets return to "In Progress" status
- [ ] Mobile: Kanban board works on mobile with touch drag-drop
- [ ] Performance: Board renders smoothly with 500+ tickets
- [ ] Error handling: Network failures, API errors show proper states

---

## Performance Considerations

### Kanban Optimization
- Use react-window for virtualized ticket cards when >100 tickets
- Implement column-level pagination for large ticket volumes
- Debounce drag events to prevent excessive API calls
- Cache ticket data with React Query for smooth interactions

### Real-time Efficiency
- Subscribe only to agency-specific ticket changes
- Batch multiple status updates within 1-second window
- Use optimistic updates for immediate UI feedback
- Implement connection status indicators for WebSocket health

### Database Optimization
```sql
-- Essential indexes for ticket performance
CREATE INDEX idx_tickets_agency_status ON tickets(agency_id, status, updated_at DESC);
CREATE INDEX idx_tickets_assignee ON tickets(agency_id, assigned_to, status);
CREATE INDEX idx_tickets_client ON tickets(agency_id, client_id, status);
CREATE INDEX idx_ticket_notes_ticket ON ticket_notes(ticket_id, created_at DESC);
CREATE INDEX idx_tickets_search ON tickets USING gin(to_tsvector('english', title || ' ' || description));
```

---

## Dependencies

### Required for Implementation
- @dnd-kit/core, @dnd-kit/sortable (drag-and-drop)
- React Query (ticket state management)
- Supabase Realtime (live updates)
- React Hook Form (form validation)

### Blocked By
- TICKET, TICKET_NOTE tables with proper indexes
- Knowledge Base integration for AI suggestions
- Email service for client summaries
- User authentication and RLS policies

### Enables
- Dashboard overview (support metrics)
- Automations (ticket creation triggers)
- Communications hub (ticket linking)
- Knowledge Base (solution suggestions)

---

## Security & Privacy

### Data Protection
- All ticket data isolated by agency_id with RLS
- Sensitive client information logged in audit trail
- Note visibility controls prevent data leaks
- Email templates sanitized to prevent XSS

### Access Controls
- Ticket assignment restricted to agency team members
- Admin-only access to ticket deletion and metrics
- Note editing limited to original authors within 24 hours
- Client email addresses validated before summary sending

### Audit Trail
```typescript
interface TicketAuditEvent {
  id: string;
  ticket_id: string;
  user_id: string;
  event_type: 'created' | 'status_changed' | 'assigned' | 'resolved' | 'reopened';
  old_value?: any;
  new_value?: any;
  created_at: string;
}

// Track all significant ticket changes
async function createAuditEvent(event: Omit<TicketAuditEvent, 'id' | 'created_at'>) {
  await supabase
    .from('ticket_audit_events')
    .insert({
      ...event,
      created_at: new Date().toISOString()
    });
}
```

---

## Success Metrics

- **Resolution Time:** 30% reduction in average ticket resolution time
- **First Response:** 95% of tickets receive response within 2 hours
- **AI Utilization:** 60% of tickets use AI suggestions
- **Client Satisfaction:** 90% positive feedback on resolution emails
- **Ticket Volume:** Track trends to identify systemic issues
- **Team Efficiency:** 20% increase in tickets resolved per team member

---

## Monitoring & Alerts

### Key Metrics to Track
- Average resolution time by category and priority
- Ticket backlog size and aging
- AI suggestion acceptance rate
- Email delivery and open rates
- User engagement with different ticket actions

### Alerting Rules
```yaml
ticket_backlog:
  condition: count(status='new') > 20
  window: 1h
  alert: Slack

sla_breach:
  condition: age(critical_tickets) > 4h
  window: 15m
  alert: PagerDuty

ai_failures:
  condition: ai_error_rate > 10%
  window: 5m
  alert: Email
```

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-02 | Added accessibility and master-detail UI implementation |
| 2025-12-31 | Enhanced spec with complete implementation details, corrected user story numbers |
| 2025-12-31 | Created initial spec from MVP-PRD |

---

## 2026-01-02 Update

**What was done:**
- Added keyboard navigation to InboxItem component (Tab, Enter, Space keys)
- Added ARIA attributes: `role="button"`, `tabIndex={0}`, `aria-selected`
- Implemented compact mode for master-detail pattern (ticket list shrinks to 280px)
- Added compact skeleton variant for loading states
- Verified master-detail pattern works with Support Tickets view

**Files changed:**
- components/linear/inbox-item.tsx - Added accessibility + compact mode + skeleton

**Testing:**
- Full browser verification with keyboard navigation
- Master-detail pattern tested (list shrinks when ticket selected)
- No console errors
- Accessibility attributes verified working

**Status:** ✅ Complete - Deployed to linear-rebuild branch

**Next:**
- Await PR approval for merge to main
- Available for kanban view implementation

---

*Living Document - Located at features/support-tickets.md*