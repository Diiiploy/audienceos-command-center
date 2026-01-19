# RBAC Route Mapping - TASK-012

**Purpose:** Systematic mapping of all API routes to required permissions
**Date:** 2026-01-07
**Status:** Planning Phase

---

## Permission Application Strategy

### Phase 1: High-Security Routes (Owner/Admin Only)
- Settings routes → `settings:manage`
- User management → `users:manage`
- Role management → `roles:manage`
- Billing → `billing:manage`

### Phase 2: Resource Management Routes
- Clients → `clients:read/write/manage`
- Tickets → `tickets:read/write/manage`
- Communications → `communications:read/write/manage`

### Phase 3: Feature Routes
- Automations → `automations:read/manage`
- Integrations → `integrations:read/manage`
- Knowledge Base → `knowledge-base:read/write/manage`
- AI Features → `ai-features:read/write/manage`

---

## Route → Permission Mapping

### 🔒 Settings Routes (Owner/Admin Only)

| Route | Methods | Permission | Notes |
|-------|---------|------------|-------|
| `/api/v1/settings/agency` | GET, PUT | `settings:manage` | Agency profile, pipeline config |
| `/api/v1/settings/preferences` | GET, PUT | `settings:read` | User preferences (own only) |
| `/api/v1/settings/users` | GET, POST | `users:manage` | List/create users |
| `/api/v1/settings/users/[id]` | GET, PUT, DELETE | `users:manage` | Modify specific user |
| `/api/v1/settings/users/[id]/preferences` | GET, PUT | `users:manage` OR own user | User-specific prefs |
| `/api/v1/settings/invitations` | GET, POST | `users:manage` | Create invitations |
| `/api/v1/settings/invitations/[token]/accept` | POST | PUBLIC | No auth (onboarding) |

### 👥 Client Routes

| Route | Methods | Permission | Client-Scoped |
|-------|---------|------------|---------------|
| `/api/v1/clients` | GET | `clients:read` | ✅ Members filter |
| `/api/v1/clients` | POST | `clients:write` | ❌ |
| `/api/v1/clients/[id]` | GET | `clients:read` | ✅ Check access |
| `/api/v1/clients/[id]` | PUT | `clients:write` | ✅ Check access |
| `/api/v1/clients/[id]` | DELETE | `clients:manage` | ✅ Check access |
| `/api/v1/clients/[id]/stage` | PUT | `clients:write` | ✅ Check access |
| `/api/v1/clients/[id]/communications` | GET | `communications:read` | ✅ Check access |

### 💬 Communication Routes

| Route | Methods | Permission | Client-Scoped |
|-------|---------|------------|---------------|
| `/api/v1/communications` | GET | `communications:read` | ✅ Filter by client access |
| `/api/v1/communications` | POST | `communications:write` | ✅ Check client access |
| `/api/v1/communications/[id]` | GET | `communications:read` | ✅ Via client check |
| `/api/v1/communications/[id]` | PUT | `communications:write` | ✅ Via client check |
| `/api/v1/communications/[id]` | DELETE | `communications:manage` | ✅ Via client check |
| `/api/v1/communications/[id]/reply` | POST | `communications:write` | ✅ Via client check |
| `/api/v1/communications/[id]/thread` | GET | `communications:read` | ✅ Via client check |

### 🎫 Ticket Routes

| Route | Methods | Permission | Client-Scoped |
|-------|---------|------------|---------------|
| `/api/v1/tickets` | GET | `tickets:read` | ✅ Filter by client access |
| `/api/v1/tickets` | POST | `tickets:write` | ✅ Check client access |
| `/api/v1/tickets/[id]` | GET | `tickets:read` | ✅ Via client check |
| `/api/v1/tickets/[id]` | PUT | `tickets:write` | ✅ Via client check |
| `/api/v1/tickets/[id]` | DELETE | `tickets:manage` | ✅ Via client check |
| `/api/v1/tickets/[id]/status` | PUT | `tickets:write` | ✅ Via client check |
| `/api/v1/tickets/[id]/resolve` | POST | `tickets:write` | ✅ Via client check |
| `/api/v1/tickets/[id]/reopen` | POST | `tickets:write` | ✅ Via client check |
| `/api/v1/tickets/[id]/notes` | GET, POST | `tickets:write` | ✅ Via client check |

### 📚 Knowledge Base Routes

| Route | Methods | Permission | Notes |
|-------|---------|------------|-------|
| `/api/v1/documents` | GET | `knowledge-base:read` | List documents |
| `/api/v1/documents` | POST | `knowledge-base:write` | Create document |
| `/api/v1/documents/[id]` | GET | `knowledge-base:read` | View document |
| `/api/v1/documents/[id]` | PUT | `knowledge-base:write` | Update document |
| `/api/v1/documents/[id]` | DELETE | `knowledge-base:manage` | Delete document |
| `/api/v1/documents/search` | GET | `knowledge-base:read` | Search |
| `/api/v1/documents/drive` | POST | `knowledge-base:write` | Import from Drive |
| `/api/v1/documents/process` | POST | `knowledge-base:write` | Process document |

### ⚙️ Automation Routes

| Route | Methods | Permission | Notes |
|-------|---------|------------|-------|
| `/api/v1/workflows` | GET | `automations:read` | List workflows |
| `/api/v1/workflows` | POST | `automations:manage` | Create workflow |
| `/api/v1/workflows/[id]` | GET | `automations:read` | View workflow |
| `/api/v1/workflows/[id]` | PUT | `automations:manage` | Update workflow |
| `/api/v1/workflows/[id]` | DELETE | `automations:manage` | Delete workflow |
| `/api/v1/workflows/[id]/toggle` | POST | `automations:manage` | Enable/disable |
| `/api/v1/workflows/[id]/runs` | GET | `automations:read` | View execution history |
| `/api/v1/workflows/actions/types` | GET | `automations:read` | Public metadata |
| `/api/v1/workflows/triggers/types` | GET | `automations:read` | Public metadata |

### 🔌 Integration Routes

| Route | Methods | Permission | Notes |
|-------|---------|------------|-------|
| `/api/v1/integrations` | GET | `integrations:read` | List integrations |
| `/api/v1/integrations` | POST | `integrations:manage` | Add integration |
| `/api/v1/integrations/[id]` | GET | `integrations:read` | View config |
| `/api/v1/integrations/[id]` | PUT | `integrations:manage` | Update config |
| `/api/v1/integrations/[id]` | DELETE | `integrations:manage` | Remove integration |
| `/api/v1/integrations/[id]/test` | POST | `integrations:manage` | Test connection |
| `/api/v1/integrations/[id]/sync` | POST | `integrations:manage` | Trigger sync |

### 🤖 AI Feature Routes

| Route | Methods | Permission | Notes |
|-------|---------|------------|-------|
| `/api/v1/chat` | POST | `ai-features:read` | Chat with AI |
| `/api/v1/ai/config` | GET | `ai-features:read` | View config |
| `/api/v1/ai/config` | PUT | `ai-features:manage` | Update config |

### 📊 Dashboard Routes

| Route | Methods | Permission | Notes |
|-------|---------|------------|-------|
| `/api/v1/dashboard/kpis` | GET | `analytics:read` | Dashboard metrics |
| `/api/v1/dashboard/trends` | GET | `analytics:read` | Trend data |

### 🔐 OAuth Routes

| Route | Methods | Permission | Notes |
|-------|---------|------------|-------|
| `/api/v1/oauth/callback` | GET | AUTHENTICATED | OAuth callback (no specific permission) |

### ❤️ Health Check

| Route | Methods | Permission | Notes |
|-------|---------|------------|-------|
| `/api/health` | GET | PUBLIC | No auth required |

---

## Implementation Order

### Priority 1: Settings & User Management (Security Critical)
1. ✅ Settings routes → `withPermission({ resource: 'settings', action: 'manage' })`
2. ✅ User routes → `withPermission({ resource: 'users', action: 'manage' })`
3. ✅ Invitation routes → `withPermission({ resource: 'users', action: 'manage' })`

### Priority 2: Core Resources (Business Critical)
4. ✅ Client routes → with client-scoped checks
5. ✅ Ticket routes → with client-scoped checks
6. ✅ Communication routes → with client-scoped checks

### Priority 3: Features
7. ✅ Automation routes
8. ✅ Integration routes
9. ✅ Knowledge base routes
10. ✅ AI feature routes
11. ✅ Dashboard routes

---

## Testing Strategy

After each route modification:
1. ✅ Run `npm run build` to verify TypeScript
2. ✅ Create edge case test for that route
3. ✅ Test with different roles (Owner, Admin, Manager, Member)
4. ✅ Test client-scoped routes with assigned/unassigned clients

---

## Notes

**Client-Scoped Routes:**
- Members must have client assignment to access
- Middleware extracts `clientId` from URL or request body
- Permission check includes: `checkPermission(permissions, resource, action, clientId)`

**Public Routes:**
- `/api/health` - No auth
- `/api/v1/settings/invitations/[token]/accept` - Pre-auth onboarding

**Mixed Permission Routes:**
- User preferences: User can edit own, Admin can edit any
- OAuth callback: Authenticated but no specific permission
