# Onboarding & Intake Hub - Database Schema

> **Status:** PROPOSED (Blocker for feature)
> **Created:** 2026-01-09 (B-1 Vision validation)
> **Pattern:** Multi-tenant RLS (matches existing DATA-MODEL.md)

---

## Overview

5 new tables required to support the Onboarding & Intake Hub feature:

| Table | Purpose |
|-------|---------|
| `onboarding_journey` | Journey templates (name, stages, video URL, AI prompt) |
| `intake_form_field` | Field definitions for intake forms |
| `onboarding_instance` | Client-journey associations with portal link tokens |
| `intake_response` | Client's submitted form answers |
| `onboarding_stage_status` | Track client progress through journey stages |

---

## 1. ONBOARDING_JOURNEY (Journey Templates)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| agency_id | UUID | Yes | FK to agency (tenant isolation) |
| name | String(100) | Yes | Journey name (e.g., "DTC Shopify Paid Media") |
| description | Text | No | Journey description |
| welcome_video_url | String(500) | No | Vimeo/YouTube URL for client |
| ai_analysis_prompt | Text | No | AI prompt template for intake analysis |
| stages | JSONB | Yes | Ordered stage definitions |
| is_default | Boolean | Yes | Default: false. Only one per agency. |
| is_active | Boolean | Yes | Default: true |
| created_at | Timestamp | Yes | Record creation |
| updated_at | Timestamp | Yes | Last modification |

**Stages JSONB Structure:**
```json
[
  { "id": "intake", "name": "Intake Received", "order": 1 },
  { "id": "access", "name": "Access Verified", "order": 2, "badges": ["FB", "GA", "SH"] },
  { "id": "pixel", "name": "Pixel Install", "order": 3 },
  { "id": "audit", "name": "Audit Complete", "order": 4 },
  { "id": "live", "name": "Live Support", "order": 5 }
]
```

**SQL:**
```sql
CREATE TABLE onboarding_journey (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  welcome_video_url VARCHAR(500),
  ai_analysis_prompt TEXT,
  stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_onboarding_journey_agency ON onboarding_journey(agency_id);

-- RLS Policy
ALTER TABLE onboarding_journey ENABLE ROW LEVEL SECURITY;
CREATE POLICY onboarding_journey_rls ON onboarding_journey FOR ALL
USING (agency_id = (auth.jwt() ->> 'agency_id')::uuid);
```

---

## 2. INTAKE_FORM_FIELD (Form Schema)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| agency_id | UUID | Yes | FK to agency |
| journey_id | UUID | No | FK to journey (null = global agency form) |
| field_label | String(100) | Yes | Display label |
| field_type | Enum | Yes | text, email, url, number, textarea, select |
| placeholder | String(200) | No | Placeholder text |
| is_required | Boolean | Yes | Default: false |
| validation_regex | String(200) | No | Optional regex validation |
| options | JSONB | No | For select fields: ["Option A", "Option B"] |
| sort_order | Integer | Yes | Display order |
| is_active | Boolean | Yes | Default: true |
| created_at | Timestamp | Yes | Record creation |
| updated_at | Timestamp | Yes | Last modification |

**SQL:**
```sql
CREATE TYPE field_type AS ENUM ('text', 'email', 'url', 'number', 'textarea', 'select');

CREATE TABLE intake_form_field (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  journey_id UUID REFERENCES onboarding_journey(id) ON DELETE CASCADE,
  field_label VARCHAR(100) NOT NULL,
  field_type field_type NOT NULL DEFAULT 'text',
  placeholder VARCHAR(200),
  is_required BOOLEAN NOT NULL DEFAULT false,
  validation_regex VARCHAR(200),
  options JSONB,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_intake_form_field_agency ON intake_form_field(agency_id);
CREATE INDEX idx_intake_form_field_journey ON intake_form_field(journey_id);

-- RLS Policy
ALTER TABLE intake_form_field ENABLE ROW LEVEL SECURITY;
CREATE POLICY intake_form_field_rls ON intake_form_field FOR ALL
USING (agency_id = (auth.jwt() ->> 'agency_id')::uuid);
```

---

## 3. ONBOARDING_INSTANCE (Client-Journey Association)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| agency_id | UUID | Yes | FK to agency |
| client_id | UUID | Yes | FK to client |
| journey_id | UUID | Yes | FK to onboarding_journey |
| link_token | String(64) | Yes | Unique token for portal URL |
| status | Enum | Yes | pending, in_progress, completed, cancelled |
| current_stage_id | String(50) | No | Current stage from journey.stages |
| triggered_by | UUID | Yes | FK to user who triggered |
| triggered_at | Timestamp | Yes | When onboarding was triggered |
| completed_at | Timestamp | No | When onboarding completed |
| seo_data | JSONB | No | DataForSEO enrichment data |
| created_at | Timestamp | Yes | Record creation |
| updated_at | Timestamp | Yes | Last modification |

**SQL:**
```sql
CREATE TYPE onboarding_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

CREATE TABLE onboarding_instance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES client(id) ON DELETE CASCADE,
  journey_id UUID NOT NULL REFERENCES onboarding_journey(id),
  link_token VARCHAR(64) NOT NULL UNIQUE,
  status onboarding_status NOT NULL DEFAULT 'pending',
  current_stage_id VARCHAR(50),
  triggered_by UUID NOT NULL REFERENCES "user"(id),
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  seo_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_onboarding_instance_agency ON onboarding_instance(agency_id);
CREATE INDEX idx_onboarding_instance_client ON onboarding_instance(client_id);
CREATE INDEX idx_onboarding_instance_token ON onboarding_instance(link_token);
CREATE INDEX idx_onboarding_instance_status ON onboarding_instance(status);

-- RLS Policy
ALTER TABLE onboarding_instance ENABLE ROW LEVEL SECURITY;
CREATE POLICY onboarding_instance_rls ON onboarding_instance FOR ALL
USING (agency_id = (auth.jwt() ->> 'agency_id')::uuid);
```

---

## 4. INTAKE_RESPONSE (Client Submissions)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| agency_id | UUID | Yes | FK to agency |
| instance_id | UUID | Yes | FK to onboarding_instance |
| field_id | UUID | Yes | FK to intake_form_field |
| value | Text | No | Client's response value |
| submitted_at | Timestamp | Yes | When this field was submitted |

**SQL:**
```sql
CREATE TABLE intake_response (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES onboarding_instance(id) ON DELETE CASCADE,
  field_id UUID NOT NULL REFERENCES intake_form_field(id),
  value TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(instance_id, field_id)
);

CREATE INDEX idx_intake_response_agency ON intake_response(agency_id);
CREATE INDEX idx_intake_response_instance ON intake_response(instance_id);

-- RLS Policy
ALTER TABLE intake_response ENABLE ROW LEVEL SECURITY;
CREATE POLICY intake_response_rls ON intake_response FOR ALL
USING (agency_id = (auth.jwt() ->> 'agency_id')::uuid);
```

---

## 5. ONBOARDING_STAGE_STATUS (Progress Tracking)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | UUID | Yes | Primary key |
| agency_id | UUID | Yes | FK to agency |
| instance_id | UUID | Yes | FK to onboarding_instance |
| stage_id | String(50) | Yes | Stage ID from journey.stages |
| status | Enum | Yes | pending, in_progress, completed, blocked |
| blocked_reason | String(200) | No | Why stage is blocked |
| completed_at | Timestamp | No | When stage completed |
| completed_by | UUID | No | FK to user who marked complete |
| created_at | Timestamp | Yes | Record creation |
| updated_at | Timestamp | Yes | Last modification |

**SQL:**
```sql
CREATE TYPE stage_status AS ENUM ('pending', 'in_progress', 'completed', 'blocked');

CREATE TABLE onboarding_stage_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  instance_id UUID NOT NULL REFERENCES onboarding_instance(id) ON DELETE CASCADE,
  stage_id VARCHAR(50) NOT NULL,
  status stage_status NOT NULL DEFAULT 'pending',
  blocked_reason VARCHAR(200),
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES "user"(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(instance_id, stage_id)
);

CREATE INDEX idx_onboarding_stage_status_agency ON onboarding_stage_status(agency_id);
CREATE INDEX idx_onboarding_stage_status_instance ON onboarding_stage_status(instance_id);

-- RLS Policy
ALTER TABLE onboarding_stage_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY onboarding_stage_status_rls ON onboarding_stage_status FOR ALL
USING (agency_id = (auth.jwt() ->> 'agency_id')::uuid);
```

---

## Migration Script (Combined)

```sql
-- Onboarding & Intake Hub Migration
-- Run this in Supabase SQL Editor

-- 1. Create ENUM types
CREATE TYPE field_type AS ENUM ('text', 'email', 'url', 'number', 'textarea', 'select');
CREATE TYPE onboarding_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE stage_status AS ENUM ('pending', 'in_progress', 'completed', 'blocked');

-- 2. Create tables (in dependency order)
-- ... (see individual table SQL above)

-- 3. Seed default journey for existing agency
INSERT INTO onboarding_journey (agency_id, name, description, stages, is_default)
SELECT
  id,
  'Default Onboarding Journey',
  'Standard client onboarding flow',
  '[
    {"id": "intake", "name": "Intake Received", "order": 1},
    {"id": "access", "name": "Access Verified", "order": 2},
    {"id": "pixel", "name": "Pixel Install", "order": 3},
    {"id": "audit", "name": "Audit Complete", "order": 4},
    {"id": "live", "name": "Live Support", "order": 5}
  ]'::jsonb,
  true
FROM agency
LIMIT 1;

-- 4. Seed default form fields
INSERT INTO intake_form_field (agency_id, field_label, field_type, placeholder, is_required, sort_order)
SELECT
  a.id,
  f.field_label,
  f.field_type::field_type,
  f.placeholder,
  f.is_required,
  f.sort_order
FROM agency a
CROSS JOIN (VALUES
  ('Business Name', 'text', 'Your company or brand name', true, 1),
  ('Shopify Store URL', 'url', 'yourstore.myshopify.com', true, 2),
  ('Primary Contact Email', 'email', 'contact@yourbrand.com', true, 3),
  ('Monthly Ad Budget', 'text', 'e.g., $10,000 - $50,000', true, 4),
  ('Facebook Ad Account ID', 'text', 'act_123456789', true, 5),
  ('Google Ads Customer ID', 'text', '123-456-7890', false, 6),
  ('GTM Container ID', 'text', 'GTM-XXXXX', false, 7),
  ('Meta Pixel ID', 'text', '1234567890123456', false, 8),
  ('Klaviyo API Key', 'text', 'pk_xxxxxxxxxxxx', false, 9),
  ('Target Audience Description', 'textarea', 'Describe your ideal customer...', false, 10)
) AS f(field_label, field_type, placeholder, is_required, sort_order)
LIMIT 10;
```

---

## Verification Queries

After migration, run these to verify:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('onboarding_journey', 'intake_form_field', 'onboarding_instance', 'intake_response', 'onboarding_stage_status');

-- Check RLS enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'onboarding%' OR tablename LIKE 'intake%';

-- Check seed data
SELECT COUNT(*) FROM onboarding_journey;
SELECT COUNT(*) FROM intake_form_field;
```

---

*Created: 2026-01-09 | Status: PROPOSED - Requires approval before migration*
