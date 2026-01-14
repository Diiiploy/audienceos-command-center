# CC1: Schema Design (RUNTIME VERIFIED)

> **Time:** 3 hours
> **Dependencies:** Manifest decisions verified
> **Output:** `docs/04-technical/UNIFIED-DATA-MODEL.md`
> **Confidence:** 8/10

---

## Context

You are documenting the ACTUAL RevOS schema and designing new AudienceOS tables.

**Runtime Verification Applied:**
1. RevOS uses `agencies` as root entity (NOT `tenants`)
2. `users.id` is standalone UUID (NOT FK to auth.users)
3. 4 cartridge tables exist with `user_id` FK (user-scoped)
4. Hierarchy: `agencies → clients → users`

---

## Actual RevOS Schema

### Existing Tables (DO NOT MODIFY)

```sql
-- 1. AGENCIES (Root entity)
CREATE TABLE agencies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. CLIENTS (Agency-scoped)
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- ... other fields
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. USERS (Client-scoped, manual auth sync)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),  -- Manual sync with auth.users
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role user_role DEFAULT 'team_member',
  permissions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. USER CARTRIDGES (4 tables, user-scoped)
CREATE TABLE style_cartridges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tone TEXT,
  vocabulary_level TEXT,
  use_emojis BOOLEAN DEFAULT false,
  call_to_action_style TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- preference_cartridges, instruction_cartridges, brand_cartridges (similar structure)
```

### New Tables for AudienceOS

```sql
-- 5. AGENCY CARTRIDGES (Agency-scoped defaults)
CREATE TABLE agency_cartridges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('style', 'preference', 'instruction', 'brand')),
  name TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Type-specific data structure:
-- style: { tone, vocabulary_level, use_emojis, call_to_action_style }
-- preference: { response_length, formality, languages }
-- instruction: { rules[], constraints[], examples[] }
-- brand: { company_name, industry, target_audience, core_values, blueprint_112 }

-- 6. COMMUNICATIONS (Client-scoped)
CREATE TABLE communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('email', 'call', 'meeting', 'note')),
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  subject TEXT,
  body TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. ALERTS (Client-scoped)
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'resolved')),
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- 8. TICKETS (Client-scoped)
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  assignee_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',
  priority TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. DOCUMENTS (Client-scoped)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Entity Relationship Diagram

```
auth.users (Supabase managed)
    │
    │ (manual sync - IDs must match)
    │
┌───────────────────────────────────────────────────────────┐
│                    RevOS Existing                          │
│                                                            │
│  ┌──────────┐                                              │
│  │ agencies │ (ROOT ENTITY)                                │
│  └────┬─────┘                                              │
│       │                                                    │
│       ├────────────────────┐                               │
│       │                    │                               │
│       ▼                    ▼                               │
│  ┌──────────┐      ┌────────────────┐                      │
│  │ clients  │      │ *_cartridges   │ (4 tables)           │
│  └────┬─────┘      │ (user-scoped)  │                      │
│       │            └────────────────┘                      │
│       ▼                                                    │
│  ┌──────────┐                                              │
│  │  users   │ (client-scoped)                              │
│  └──────────┘                                              │
│                                                            │
└───────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────┐
│                    AudienceOS NEW                          │
│                                                            │
│  agencies ──┬── agency_cartridges (agency-scoped)          │
│             │                                              │
│             └── clients ──┬── communications               │
│                           ├── alerts                       │
│                           ├── tickets                      │
│                           └── documents                    │
│                                                            │
└───────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. Dual Agency/Client Scoping

AudienceOS tables include BOTH `agency_id` and `client_id`:
- `agency_id` enables direct RLS filtering
- `client_id` enables grouping by client

### 2. Agency Cartridges vs User Cartridges

- **User cartridges** (existing): Personal AI preferences per user
- **Agency cartridges** (new): Team/agency default AI settings

### 3. Manual Auth Sync

Users table uses manual sync pattern:
```typescript
// Application code MUST ensure IDs match
const { data: authUser } = await supabase.auth.signUp({ email, password });
await supabase.from('users').insert({
  id: authUser.user.id,  // CRITICAL: Same ID
  email: authUser.user.email,
  client_id: clientId
});
```

---

## Tasks

1. [ ] Create `docs/04-technical/UNIFIED-DATA-MODEL.md`
2. [ ] Document existing RevOS tables (agencies, clients, users, cartridges)
3. [ ] Design new AudienceOS tables (5 tables)
4. [ ] Create ERD with both existing and new tables
5. [ ] Document JSONB structure for agency_cartridges
6. [ ] Document manual auth sync requirement

---

## Success Criteria

- [ ] Actual RevOS schema documented accurately
- [ ] New tables use `agency_id` + `client_id` pattern
- [ ] ERD shows hierarchy correctly
- [ ] Manual auth sync documented
- [ ] No changes to existing tables

---

## Output Location

```
/Users/rodericandrews/_PAI/projects/command_center_audience_OS/docs/04-technical/DATA-MODEL.md
```

---

*Runtime Verified: 2026-01-03 | Based on actual RevOS migrations*
