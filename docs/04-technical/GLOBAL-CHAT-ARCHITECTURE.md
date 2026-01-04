# Global Floating Chat Architecture

**Status:** Phase 5.6 - Integration with AudienceOS
**Pattern Source:** War Room IntelligentChat (verified 2026-01-04)
**API:** `/api/v1/chat` (POST for messages, GET for history)
**Last Updated:** 2026-01-04

---

## Overview

Holy Grail Chat (HGC) is a **global, ever-present floating chat widget** that:
- **Always visible** across all pages (position: fixed)
- **Never interferes** with navigation or page focus
- **Glassmorphic design** - subtle backdrop blur, transparent background
- **Page-contextual** - prompts adapt to current page ("Ask about [page] or anything")
- **Globally functional** - answers questions about ANY topic, regardless of current page
- **Persistent session** - maintains message history as user navigates

---

## Architecture Pattern (from War Room)

### 1. Portal Rendering (Root Layout Level)

The chat is rendered at the application root using React's `createPortal`:

```tsx
// In root layout (app.tsx or layout.tsx)
import { createPortal } from 'react-dom'
import { ChatInterface } from '@/components/chat/chat-interface'

export default function RootLayout() {
  const [chatPortalHost, setChatPortalHost] = useState<HTMLElement | null>(null)
  const [showChat, setShowChat] = useState(false)
  const [chatContext, setChatContext] = useState(null)

  useEffect(() => {
    // Set portal host after DOM is ready
    setChatPortalHost(document.body)
  }, [])

  return (
    <html>
      <body>
        {/* Main page content */}
        <div>{/* routes */}</div>

        {/* Global floating chat - rendered to document.body, not affected by page scrolling */}
        {chatPortalHost && createPortal(
          <ChatInterface
            showPanel={showChat}
            setShowPanel={setShowChat}
            initialContext={chatContext}
            agencyId={agencyId}
            userId={userId}
          />,
          chatPortalHost
        )}
      </body>
    </html>
  )
}
```

### 2. Positioning & Styling (Glassmorphic)

**Chat Input Bar (Always Visible):**
```css
position: fixed
bottom: 0
right: 0
width: 100%
height: 60px
backdrop-filter: blur(16px)
background: rgba(140, 140, 140, 0.12)
z-index: 999999
```

**Message Panel (Slides Up on Interaction):**
```css
position: fixed
bottom: 60px  /* Sits above input bar */
z-index: 999998
backdrop-filter: blur(16px)
background: rgba(140, 140, 140, 0.12)
border: 1px solid rgba(140, 140, 140, 0.3)
border-radius: 16px 16px 0 0
box-shadow: 0 -4px 32px rgba(0, 0, 0, 0.6)
```

**Backdrop Overlay (When Panel Open):**
```css
position: fixed
inset: 0
background: rgba(0, 0, 0, 0.4)
backdrop-filter: blur(4px)
z-index: 999997
/* Click to close */
```

### 3. Page Context Management

Each page sets the chat context to provide page-specific prompts:

```tsx
// On Dashboard page
useEffect(() => {
  window.setChatContext?.({
    page: 'dashboard',
    context: 'user is viewing KPI dashboard',
    prompt: 'Ask about your dashboard metrics or anything else'
  })
}, [])

// On Client Pipeline page
useEffect(() => {
  window.setChatContext?.({
    page: 'pipeline',
    context: 'user is viewing client pipeline',
    prompt: 'Ask questions about the pipeline or anything'
  })
}, [])

// On Client List page
useEffect(() => {
  window.setChatContext?.({
    page: 'clients',
    context: 'user is viewing client list',
    prompt: 'Ask about specific clients or anything'
  })
}, [])
```

### 4. Message Flow

```
User Types Message in Input Bar
         ↓
Message Sent to /api/v1/chat (POST)
         ↓
Server:
  - Validates message (non-empty, trimmed)
  - Fetches session history from Supabase
  - Routes intent via SmartRouter (5 categories)
  - Executes appropriate handler:
    - Dashboard: Function calling (get_clients, get_alerts, etc)
    - RAG: Document search
    - Web: Google Search Grounding
    - Memory: Mem0 recall
    - Casual: General Gemini response
  - Persists both user and assistant messages
  - Returns ChatMessage with route, citations, content
         ↓
Client:
  - Displays assistant message in panel
  - Shows route badge (dashboard, rag, web, memory, casual)
  - Shows citations (if any)
  - Message persists in sessionStorage
  - Session persists across page navigation
```

---

## Key Design Decisions

### 1. Portal Rendering (Why position:fixed works)

**Problem:** position: fixed is relative to viewport, but if parent has transform, it breaks
**Solution:** Render via createPortal to document.body (not inside app container)
**Benefit:** Position:fixed works correctly, no z-index fighting with page content

### 2. Page Context via Window Object

**Pattern:** `window.setChatContext({})`
**Benefit:**
- Any page can set context without prop drilling
- No dependency on router or context providers
- Simple global hook pattern

### 3. Glassmorphic Design

**Why not opaque?**
- Floating widget should feel "light" and non-intrusive
- Backdrop blur shows page underneath (context visible while chatting)
- Aesthetic aligns with modern SaaS (Apple, Vercel, Linear)

### 4. Session Persistence Across Navigation

**Pattern:** sessionId generated once per app load
**Storage:** Supabase chat_message table (RLS scoped by agency_id)
**Behavior:**
- Navigation doesn't reset chat
- User can switch pages while conversation continues
- History loaded from Supabase, not localStorage (survives browser close)

---

## Component Requirements

### ChatInterface Props

```typescript
interface ChatInterfaceProps {
  showPanel: boolean
  setShowPanel: (show: boolean) => void
  initialContext?: {
    page?: string
    context?: string
    prompt?: string
    elementData?: any
  }
  agencyId: string
  userId?: string
}
```

### API Contract

**POST /api/v1/chat**
```typescript
Request:
{
  message: string          // User message (validated: non-empty after trim)
  sessionId?: string       // Optional: for persistence
}

Response:
{
  id: string              // Message ID
  role: 'assistant'       // Always assistant
  content: string         // Response text
  route: 'dashboard' | 'rag' | 'web' | 'memory' | 'casual'
  citations: Citation[]   // Source references
  timestamp: string       // ISO timestamp
}
```

**GET /api/v1/chat**
```typescript
Query:
  sessionId: string       // Required: fetch history for session
  limit?: number          // Default: 50
  offset?: number         // Default: 0

Response:
{
  messages: ChatMessage[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}
```

---

## Multi-Tenant Security

### RLS Enforcement

All chat messages filtered by `agency_id`:

```sql
-- chat_message RLS policy
WHERE agency_id = (
  SELECT agency_id FROM user WHERE id = auth.uid()
)
```

### Auth Pattern

```typescript
// SEC-006: getAuthenticatedUser() - server-side verification
const { user, agencyId } = await getAuthenticatedUser(supabase)
// agencyId from DATABASE (via RLS lookup), not request body
// Cannot be spoofed from client
```

---

## Rate Limiting & Protection

| Limit | Applies To | Window |
|-------|-----------|--------|
| 30 req/min | POST /api/v1/chat | Per IP/user |
| 60 req/min | GET /api/v1/chat | Per IP/user |
| CSRF token | All POST requests | Per session |

---

## Error Handling & Resilience

### Graceful Degradation

| Scenario | Behavior |
|----------|----------|
| Supabase history fetch fails | Chat still works, returns response without context |
| Message persistence fails | Response sent to user, message not persisted (logged as error) |
| Gemini API rate limit | Cached response or fallback message returned |
| Invalid JSON | 400 error with clear message |
| Empty message | 400 error with validation message |
| Whitespace-only message | 400 error: "cannot be empty or whitespace-only" |

### Error Logging (Structured)

```typescript
// Failed history fetch (warning - doesn't block chat)
console.warn('[Supabase] Error fetching chat history:', {
  code: error.code,
  message: error.message,
  sessionId: sessionId,
})

// Failed message persistence (error - may need alerting)
console.error('[Supabase] Error storing chat message:', {
  code: error.code,
  message: error.message,
  sessionId: sessionId,
})
```

---

## Performance Considerations

| Metric | Target | Notes |
|--------|--------|-------|
| Input bar render | Always visible | No delay |
| Panel slide-up | <300ms | CSS animation |
| Message latency | ~800ms | Gemini generation ~600ms |
| Session persistence | < 100ms | Supabase insert |
| Token efficiency | ~630 tokens/msg | Costs ~$0.006/msg |

---

## Testing Strategy

**Unit Tests:**
- Message validation (whitespace, empty, JSON parsing)
- Error logging structure
- Session persistence data model
- RLS isolation (agency_id scoping)

**Integration Tests:**
- ChatInterface → API → ChatService flow
- Multi-turn conversations
- Session history retrieval
- Page context updates

**E2E Tests:**
- Navigate between pages → chat persists
- Send message → persisted in Supabase
- Close/reopen panel → history restored
- Multi-tab session handling

---

## Migration from Intelligence Center Section

### Old Pattern (NOT USED)
```tsx
{activeSection === "chat" && <ChatSection />}  // Page-level section
```

### New Pattern (GLOBAL)
```tsx
// At root layout
createPortal(
  <ChatInterface {...props} />,
  document.body
)  // Always visible, persists across navigation
```

### Impact
- ✅ Chat available from ALL pages
- ✅ Better UX (doesn't require Intelligence Center nav)
- ✅ Matches War Room UX pattern
- ✅ Supports page context without Intelligence Center coupling

---

## Documentation & Implementation Checklist

### Phase 1: Documentation Update ✅
- [x] Update feature spec: `features/ai-intelligence-layer.md`
- [x] Create architecture doc: `docs/04-technical/GLOBAL-CHAT-ARCHITECTURE.md`
- [x] Update CLAUDE.md with new chat pattern

### Phase 2: Implementation (TODO)
- [ ] Update root layout (app.tsx) to render ChatInterface via createPortal
- [ ] Add page context setters to main pages (dashboard, pipeline, clients, etc)
- [ ] Update ChatInterface to accept page context
- [ ] Add guard logic (don't render on login/auth pages)
- [ ] Test across all pages

### Phase 3: Testing (TODO)
- [ ] Navigation persistence test
- [ ] Session history test
- [ ] Multi-page context test
- [ ] E2E: page navigation → chat stays open

---

**Last Updated:** 2026-01-04
**Pattern Verified Against:** War Room IntelligentChat (3627 line implementation)
**API Status:** ✅ Live at /api/v1/chat
**Component Status:** ✅ Ready (components/chat/chat-interface.tsx)
**Confidence:** 9.5/10
