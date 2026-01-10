# Onboarding Hub - Implementation Plan

> **Status:** READY FOR IMPLEMENTATION
> **Created:** 2026-01-10
> **Prototype:** https://v0-audience-os-command-center.vercel.app/onboarding
> **DU Estimate:** 8-10 DU

---

## Executive Summary

Replace the placeholder onboarding page (`app/onboarding/start/page.tsx`) with a full **staff-facing Onboarding Hub** featuring 3 tabs, matching the V0 prototype exactly.

---

## Prototype Analysis (V0)

### Header
- Title: "Onboarding & Intake Hub"
- Subtitle: "Manage client onboarding pipeline and intake forms"
- Actions:
  - `+ Trigger Onboarding` (green button) → Opens modal
  - `Copy Portal Link` → Copies current journey's portal URL
  - `View as Client` → Opens client portal in new tab

### Tab 1: Active Onboardings
**Left Panel - Pipeline Cards:**
- Client card showing: Name, Tier badge (Enterprise/Core), Days in stage, Owner avatar
- Stage progress badges with verification status:
  - Intake Received (green when done)
  - Access Verified (with FB/GA/SH sub-badges)
  - Pixel Install
  - Audit Complete
  - Live Support
- Selected card highlighted with green border

**Right Panel - Client Journey Detail:**
- Owner name and "Client Journey" header
- Welcome Video section (status: Completed/Pending, thumbnail)
- Intake Form section (status: Submitted/Pending, submitted date, quick data preview)
- "View Full Details" link

### Tab 2: Client Journey
- Welcome Video Configuration (URL input for Vimeo/YouTube)
- AI Analysis Configuration (textarea for prompt template)
- AI Analysis Preview (example output card)
- "Save Configuration" button

### Tab 3: Form Builder
- Intake Form Fields section
- Each field row: Field Label, Placeholder Text, Required toggle
- Default fields (10 total):
  1. Business Name
  2. Shopify Store URL
  3. Primary Contact Email
  4. Monthly Ad Budget
  5. Facebook Ad Account ID
  6. Google Ads Customer ID
  7. Google Tag Manager Container ID
  8. Meta Pixel ID
  9. Klaviyo API Key (optional)
  10. Target Audience Description
- "+ Add Field" button
- Form Preview section at bottom

### Trigger Onboarding Modal
- Client Name (text input)
- Primary Contact Email (email input)
- Client Tier (dropdown: Core/Enterprise)
- Info box: "What happens next?" explanation
- Actions: Cancel, "Send Onboarding Link"

---

## Database Schema

5 tables required (already documented in `docs/04-technical/ONBOARDING-SCHEMA.md`):

| Table | Purpose |
|-------|---------|
| `onboarding_journey` | Journey templates (stages, video, AI prompt) |
| `intake_form_field` | Form field definitions |
| `onboarding_instance` | Client-journey associations |
| `intake_response` | Client form submissions |
| `onboarding_stage_status` | Stage progress tracking |

**Migration Status:** SQL ready, needs to be run in Supabase

---

## Implementation Phases

### Phase 1: Database (0.5 DU)
- [ ] Run migration SQL from ONBOARDING-SCHEMA.md
- [ ] Verify tables created with RLS policies
- [ ] Seed default journey and form fields
- [ ] Regenerate Supabase types (`types/database.ts`)

### Phase 2: API Endpoints (1.5 DU)
Create in `app/api/onboarding/`:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/onboarding/journeys` | GET | List journeys |
| `/api/onboarding/journeys` | POST | Create journey |
| `/api/onboarding/journeys/[id]` | PATCH | Update journey |
| `/api/onboarding/fields` | GET | List form fields |
| `/api/onboarding/fields` | POST | Create field |
| `/api/onboarding/fields/[id]` | PATCH | Update field |
| `/api/onboarding/fields/[id]` | DELETE | Delete field |
| `/api/onboarding/instances` | GET | List active onboardings |
| `/api/onboarding/instances` | POST | Trigger onboarding |
| `/api/onboarding/instances/[id]` | GET | Get instance detail |
| `/api/onboarding/instances/[id]/stage` | PATCH | Update stage status |

### Phase 3: Zustand Store (0.5 DU)
Create `stores/onboarding-store.ts`:
- `journeys` - List of journey templates
- `fields` - Form field definitions
- `instances` - Active onboarding instances
- `selectedInstance` - Currently selected for detail view
- Actions: fetchAll, createInstance, updateStage, saveJourney, CRUD fields

### Phase 4: Components (4 DU)

**Tab Container:**
- `components/onboarding/onboarding-hub.tsx` - Main 3-tab container

**Tab 1 Components:**
- `components/onboarding/active-onboardings.tsx` - Main tab view
- `components/onboarding/onboarding-card.tsx` - Pipeline card
- `components/onboarding/stage-badge.tsx` - Stage progress badge
- `components/onboarding/client-journey-panel.tsx` - Right detail panel

**Tab 2 Components:**
- `components/onboarding/client-journey-config.tsx` - Video + AI config

**Tab 3 Components:**
- `components/onboarding/form-builder.tsx` - Field list + add
- `components/onboarding/field-row.tsx` - Individual field row
- `components/onboarding/form-preview.tsx` - Preview section

**Modal:**
- `components/onboarding/trigger-onboarding-modal.tsx` - Trigger modal

### Phase 5: Wire to Sidebar (0.5 DU)
- Update `components/views/onboarding-hub.tsx` (or create new)
- Ensure sidebar "Onboarding" nav item renders the new hub
- Remove/replace any placeholder onboarding components

### Phase 6: Client Portal Update (1 DU)
- Update `app/onboarding/start/page.tsx` to read from new schema
- Fetch form fields from `intake_form_field` table
- Submit responses to `intake_response` table
- Update `onboarding_instance` status on completion

### Phase 7: Testing & Polish (0.5 DU)
- Test trigger flow end-to-end
- Test client portal form submission
- Verify stage progression
- Test "View as Client" and "Copy Portal Link"

---

## File Structure (New)

```
app/api/onboarding/
├── journeys/
│   ├── route.ts              # GET, POST
│   └── [id]/route.ts         # PATCH
├── fields/
│   ├── route.ts              # GET, POST
│   └── [id]/route.ts         # PATCH, DELETE
└── instances/
    ├── route.ts              # GET, POST
    └── [id]/
        ├── route.ts          # GET
        └── stage/route.ts    # PATCH

components/onboarding/
├── onboarding-hub.tsx        # Main container with tabs
├── active-onboardings.tsx    # Tab 1
├── onboarding-card.tsx       # Pipeline card
├── stage-badge.tsx           # Stage indicator
├── client-journey-panel.tsx  # Right detail panel
├── client-journey-config.tsx # Tab 2
├── form-builder.tsx          # Tab 3
├── field-row.tsx             # Field row
├── form-preview.tsx          # Form preview
└── trigger-onboarding-modal.tsx

stores/
└── onboarding-store.ts       # Zustand store
```

---

## Dependencies

- Existing: Tabs component (shadcn/ui), Modal (Dialog), Form components
- DataForSEO: Already integrated via chi-gateway (optional enrichment)
- Email: Use existing email service for onboarding link delivery

---

## Success Criteria

- [ ] Staff can trigger new client onboarding from modal
- [ ] Active onboardings visible in pipeline view with stage badges
- [ ] Journey configuration (video URL, AI prompt) saves correctly
- [ ] Form fields are customizable (add/remove/reorder)
- [ ] Client portal reads dynamic form fields
- [ ] Form submissions update instance status
- [ ] "View as Client" opens portal with correct link token

---

## Related Documents

| Document | Path |
|----------|------|
| Database Schema | `docs/04-technical/ONBOARDING-SCHEMA.md` |
| Vision | `docs/01-product/VISION-ONBOARDING-HUB.md` |
| SEO Enrichment | `features/SEO-ENRICHED-ONBOARDING.md` |
| V0 Prototype | https://v0-audience-os-command-center.vercel.app/onboarding |

---

*Living Document - Last Updated: 2026-01-10*
