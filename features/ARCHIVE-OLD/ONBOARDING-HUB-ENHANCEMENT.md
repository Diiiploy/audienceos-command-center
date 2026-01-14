# Feature: Onboarding Hub Enhancement

**Status:** Spec Complete | **Priority:** HIGH | **Effort:** 8-10 DU
**Owner:** Chi | **Created:** 2026-01-10
**Reference:** v0 Prototype at `https://v0-audience-os-command-center.vercel.app/onboarding`

---

## 2026-01-10 19:40 Update - UI Bug Fixes

**What was done:**
- Fixed Journey Progress checkboxes not clickable - added onClick handlers
- Fixed Copy Portal Link and View as Client buttons - resolved state sync issue
- Implemented optimistic updates for super slow clicking performance
- Updated Form Builder layout from 50/50 to 2/3-1/3 split as requested
- Made all input text 1pt smaller and more compact throughout
- Added proper bottom padding to prevent chat overlay blocking content

**Root causes identified:**
- Missing onClick handlers in journey progress items
- State sync mismatch between local component state and global store
- Sequential API calls causing performance bottleneck
- CSS grid layout not matching UX requirements

**Files changed:**
- stores/onboarding-store.ts - Optimistic updates implementation
- components/onboarding/active-onboardings.tsx - Clickable checkboxes + button sync
- components/onboarding/form-builder.tsx - 2/3-1/3 layout + chat padding
- components/onboarding/field-row.tsx - Compact field sizing
- components/onboarding/form-preview.tsx - Smaller preview inputs
- components/onboarding/onboarding-hub.tsx - Chat overlay padding
- RUNBOOK.md - Added UI-002 Chat Overlay requirement

**Status:** ✅ All UI Issues Resolved - Deployed to Production

**Performance Impact:** Click feedback now instant (optimistic updates), Form Builder properly sized

**Next:** Continue onboarding flow enhancements and user experience improvements

---

## Executive Summary

Enhance the Onboarding Hub to match the v0 prototype, adding 3-tab navigation, Trigger Onboarding modal, Form Builder, Client Journey configuration, and DataForSEO integration for automatic SEO enrichment during client onboarding.

**Value Proposition:**
- Complete onboarding workflow from a single screen
- AI-powered client analysis during intake
- Automatic SEO intelligence enrichment ($0.02 vs $50+ manual research)
- Customizable intake forms per agency needs

---

## Gap Analysis: Current vs v0 Prototype

### What We Have (Current Production)

**File:** `components/views/onboarding-hub.tsx` (541 lines)

| Feature | Status |
|---------|--------|
| Stage-based client grouping | ✅ Have |
| Collapsible stage sections | ✅ Have |
| Client detail panel with checklist | ✅ Have |
| Activity timeline | ✅ Have |
| Actions (View Profile, Send Reminder) | ✅ Have |

### What's Missing (v0 Prototype Features)

| Feature | Priority | Effort |
|---------|----------|--------|
| **3-Tab Navigation** | HIGH | 1 DU |
| **Trigger Onboarding Modal** | HIGH | 1.5 DU |
| **Form Builder Tab** | HIGH | 2 DU |
| **Client Journey Tab** (AI Config) | HIGH | 2 DU |
| **Progress Pills with Status Colors** | MEDIUM | 1 DU |
| **Platform Integration Badges** (FB, GA, SH) | MEDIUM | 0.5 DU |
| **Copy Portal Link Button** | LOW | 0.25 DU |
| **View as Client Button** | LOW | 0.5 DU |
| **DataForSEO Integration** | HIGH | 1.5 DU |

**Total Estimated Effort:** 10.25 DU

---

## 2026-01-10 Implementation Readiness Update

**Red Team Stress Test:** PASSED ✅

**Blockers Cleared:**
- Database migration 015 applied - 5 tables now live in Supabase (verified with SQL query)
- DataForSEO credentials configured - API tested with `status_code: 20000` response
- Resend API key configured - API tested + user confirmed email received

**Infrastructure Status:**
- ✅ Global secrets vault: `/Users/rodericandrews/.claude/secrets/globalsecrets.env`
- ✅ Project environment: `.env.local` updated with real credentials
- ✅ Vercel deployment: All environments (prod/preview/dev) configured
- ✅ mem0 operational knowledge: Resend org details stored

**Files Ready:**
- Database schema: `supabase/migrations/015_onboarding_hub.sql` (executed)
- Feature spec: This document (implementation ready)

**Confidence Score: 10/10** - All systems verified, ready for implementation.

**Next Steps:** Begin implementation following the feature breakdown below.

---

## Feature Specifications

### 1. Three-Tab Navigation

**Tabs:**
```
┌────────────────────┬───────────────┬──────────────┐
│ Active Onboardings │ Client Journey │ Form Builder │
└────────────────────┴───────────────┴──────────────┘
```

**Implementation:**
```typescript
// components/views/onboarding-hub.tsx
type OnboardingTab = "active" | "journey" | "builder"

const [activeTab, setActiveTab] = useState<OnboardingTab>("active")
```

**UI Spec:**
- Tab underline indicator (green accent)
- Smooth transitions between tabs
- Preserve state when switching tabs

---

### 2. Trigger Onboarding Modal

**Header Actions:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Onboarding & Intake Hub                                         │
│ Manage client onboarding pipeline and intake forms              │
│                                                                 │
│         [+ Trigger Onboarding] [Copy Portal Link] [View as Client] │
└─────────────────────────────────────────────────────────────────┘
```

**Modal Content:**
```
┌────────────────────────────────────────────┐
│  Trigger New Client Onboarding        [X]  │
│                                            │
│  Send onboarding portal link to a new      │
│  client to begin their intake process      │
├────────────────────────────────────────────┤
│  Client Name *                             │
│  ┌────────────────────────────────────┐   │
│  │ Enter client or company name       │   │
│  └────────────────────────────────────┘   │
│                                            │
│  Website URL (for SEO enrichment)          │
│  ┌────────────────────────────────────┐   │
│  │ https://clientdomain.com           │   │
│  └────────────────────────────────────┘   │
│                                            │
│  [SEO Preview Card - Auto-fetched]         │
│  ┌────────────────────────────────────┐   │
│  │ Keywords: 15,475 | Traffic: $125K  │   │
│  │ Top 10: 966 | Competitors: 54,229  │   │
│  └────────────────────────────────────┘   │
│                                            │
│  Primary Contact Email *                   │
│  ┌────────────────────────────────────┐   │
│  │ contact@clientcompany.com          │   │
│  └────────────────────────────────────┘   │
│                                            │
│  Client Tier *                             │
│  ┌─────────────────────────────────┬──┐   │
│  │ Core                            │ ▼│   │
│  └─────────────────────────────────┴──┘   │
│                                            │
│  ┌────────────────────────────────────┐   │
│  │ ✉️ What happens next?              │   │
│  │ Client receives welcome email with │   │
│  │ personalized onboarding portal     │   │
│  │ link to complete intake form.      │   │
│  └────────────────────────────────────┘   │
│                                            │
│  [Cancel]          [✈️ Send Onboarding Link] │
└────────────────────────────────────────────┘
```

**Key Enhancement:** Website URL field triggers DataForSEO enrichment

---

### 3. Form Builder Tab

**Purpose:** Customize intake form fields clients see during onboarding

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Intake Form Fields                                          │
│  Customize the questions clients answer during onboarding    │
├─────────────────────────────────────────────────────────────┤
│  Field Label           Placeholder Text           Required   │
│  ┌─────────────────┐   ┌─────────────────────┐   ┌──────┐  │
│  │ Business Name   │   │ Your company name   │   │ ✓ ON │  │
│  └─────────────────┘   └─────────────────────┘   └──────┘  │
│                                                             │
│  ┌─────────────────┐   ┌─────────────────────┐   ┌──────┐  │
│  │ Shopify Store   │   │ yourstore.myshopify │   │ ✓ ON │  │
│  └─────────────────┘   └─────────────────────┘   └──────┘  │
│                                                             │
│  ┌─────────────────┐   ┌─────────────────────┐   ┌──────┐  │
│  │ Contact Email   │   │ contact@brand.com   │   │ ✓ ON │  │
│  └─────────────────┘   └─────────────────────┘   └──────┘  │
│                                                             │
│  ┌─────────────────┐   ┌─────────────────────┐   ┌──────┐  │
│  │ Monthly Budget  │   │ e.g., $10K - $50K   │   │ ✓ ON │  │
│  └─────────────────┘   └─────────────────────┘   └──────┘  │
│                                                             │
│  ┌─────────────────┐   ┌─────────────────────┐   ┌──────┐  │
│  │ FB Ad Account   │   │ act_123456789       │   │ ✓ ON │  │
│  └─────────────────┘   └─────────────────────┘   └──────┘  │
│                                                             │
│           [+ Add Field]            [Save Form]              │
└─────────────────────────────────────────────────────────────┘
```

**Data Model:**
```typescript
interface FormField {
  id: string
  label: string
  placeholder: string
  type: "text" | "email" | "url" | "select" | "number"
  required: boolean
  order: number
}

// Stored in: agency.onboarding_form_config (JSONB)
```

---

### 4. Client Journey Tab (AI Analysis Configuration)

**Purpose:** Configure welcome video and AI analysis prompts

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Welcome Video Configuration                                 │
├─────────────────────────────────────────────────────────────┤
│  Video URL (Vimeo or YouTube)                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ https://vimeo.com/123456789                         │   │
│  └─────────────────────────────────────────────────────┘   │
│  This welcome video will be shown at the start of          │
│  their onboarding experience.                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  AI Analysis Configuration                                   │
├─────────────────────────────────────────────────────────────┤
│  Analysis Prompt Template                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Analyze this client's tracking data and provide     │   │
│  │ insights on pixel installation quality, event       │   │
│  │ match quality, and recommended optimizations for    │   │
│  │ their e-commerce conversion tracking.               │   │
│  └─────────────────────────────────────────────────────┘   │
│  This prompt will be used to analyze incoming client        │
│  data and generate installation recommendations.            │
│                                                             │
│                    [Save Configuration]                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  AI Analysis Preview                                         │
│  Example output from analyzing client intake forms           │
├─────────────────────────────────────────────────────────────┤
│  ✨ Tracking Setup Analysis                                  │
│  Generated from intake form on Dec 4, 2024                  │
│                                                             │
│  • GTM container detected with 12 tags                      │
│  • Meta Pixel installed but missing CAPI events             │
│  • Recommendation: Implement server-side tracking           │
└─────────────────────────────────────────────────────────────┘
```

**Integration Points:**
- Gemini 3 Flash for analysis
- DataForSEO for SEO enrichment
- Chi-Gateway for orchestration

---

### 5. Progress Pills with Status Colors

**Current (What We Have):**
- Stage-based grouping (Intake, Access, Installation, Audit, Live)
- No inline progress visualization

**v0 Prototype (What We Need):**
```
┌──────────────────────────────────────────────────────────────┐
│ RTA Outdoor Living                              L  Luke      │
│ Enterprise · 20d in stage                                    │
│                                                              │
│ ✅ Intake Received  ❌ Access Verified [FB][GA][SH]         │
│ ⚪ Pixel Install    ⚪ Audit Complete                        │
└──────────────────────────────────────────────────────────────┘
```

**Status Colors:**
- ✅ Green = Complete
- ❌ Red = Blocked/Failed
- ⚪ White/Gray = Pending

**Platform Badges:**
- FB = Facebook/Meta
- GA = Google Ads/Analytics
- SH = Shopify

---

### 6. DataForSEO + CAA Integration

**Trigger:** When CSM enters website URL in Trigger Onboarding modal

**Flow:**
```
1. CSM clicks "Trigger Onboarding"
2. Enters client name
3. Enters website URL (e.g., vshred.com)
4. [AUTO] System calls chi-gateway → DataForSEO
5. [AUTO] SEO Preview Card appears (500ms debounce)
6. CSM reviews SEO data
7. Enters email, selects tier
8. Clicks "Send Onboarding Link"
9. [AUTO] SEO data saved to client.seo_data
10. [AUTO] Welcome email sent
11. [AUTO] AI Analysis triggered with SEO context
```

**API Integration:**
```typescript
// services/seoEnrichment.ts
export async function enrichClientSEO(domain: string) {
  const [keywords, competitors] = await Promise.all([
    callChiGateway('seo_domain_keywords', { target: domain, limit: 20 }),
    callChiGateway('seo_competitors', { target: domain, limit: 10 })
  ])

  return {
    summary: {
      total_keywords: keywords.total_count,
      traffic_value: keywords.metrics?.organic?.etv || 0,
      top_10_count: calculateTop10(keywords),
    },
    keywords: keywords.items?.slice(0, 20) || [],
    competitors: competitors.items?.slice(0, 10) || []
  }
}
```

**Cost:** $0.02 per enrichment (tested with V Shred)

---

## Data Model Changes

### Client Table Extension
```sql
ALTER TABLE client ADD COLUMN IF NOT EXISTS (
  website_url VARCHAR(255),
  seo_data JSONB,
  seo_last_refreshed TIMESTAMP,
  onboarding_status JSONB -- Step completion tracking
);
```

### Agency Table Extension
```sql
ALTER TABLE agency ADD COLUMN IF NOT EXISTS (
  onboarding_form_config JSONB,
  welcome_video_url VARCHAR(255),
  ai_analysis_prompt TEXT
);
```

---

## Implementation Plan

### Phase 1: UI Structure (2 DU)
- [ ] Add tab navigation to OnboardingHub
- [ ] Create OnboardingHubHeader with action buttons
- [ ] Implement TriggerOnboardingModal component
- [ ] Add website URL field with debounce

### Phase 2: Form Builder (2 DU)
- [ ] Create FormBuilderTab component
- [ ] Add form field CRUD operations
- [ ] Connect to agency.onboarding_form_config
- [ ] Add drag-and-drop reordering

### Phase 3: Client Journey (2 DU)
- [ ] Create ClientJourneyTab component
- [ ] Welcome video configuration
- [ ] AI Analysis prompt editor
- [ ] Preview/test functionality

### Phase 4: DataForSEO Integration (1.5 DU)
- [ ] Create seoEnrichment service
- [ ] Add SEOPreviewCard component
- [ ] Integrate with TriggerOnboardingModal
- [ ] Save SEO data on client creation

### Phase 5: Progress Pills (1.5 DU)
- [ ] Create OnboardingProgressPills component
- [ ] Add platform integration badges
- [ ] Status color logic (green/red/gray)
- [ ] Connect to client.onboarding_status

### Phase 6: Polish & Testing (1 DU)
- [ ] E2E testing
- [ ] Error handling
- [ ] Loading states
- [ ] Mobile responsive

---

## Integration Architecture (SaaS Considerations)

### Why NOT chi-gateway Directly

**chi-gateway** is Roderic's personal MCP gateway - it runs via Claude Code and has direct API credentials. **AudienceOS is a SaaS product** - clients access it via web browser, not MCP.

**The Pattern:**
```
❌ Browser → chi-gateway (MCP) → DataForSEO
✅ Browser → Next.js API Route → DataForSEO (server-side)
```

### Server-Side DataForSEO Integration

**Implementation:** Call DataForSEO from Next.js API routes with credentials stored in environment variables.

```typescript
// app/api/v1/seo/enrich/route.ts
import { NextRequest, NextResponse } from 'next/server'

const DATAFORSEO_API = 'https://api.dataforseo.com/v3'

export async function POST(request: NextRequest) {
  const { domain } = await request.json()

  // Validate session (agency context)
  const session = await getServerSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // DataForSEO credentials from env (not exposed to client)
  const credentials = btoa(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`)

  // Parallel fetch: keywords + competitors
  const [keywordsRes, competitorsRes] = await Promise.all([
    fetch(`${DATAFORSEO_API}/dataforseo_labs/google/domain_metrics_by_categories/live`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ target: domain, location_code: 2840, language_code: 'en' }])
    }),
    fetch(`${DATAFORSEO_API}/dataforseo_labs/google/competitors_domain/live`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ target: domain, location_code: 2840, language_code: 'en', limit: 10 }])
    })
  ])

  const [keywords, competitors] = await Promise.all([
    keywordsRes.json(),
    competitorsRes.json()
  ])

  return NextResponse.json({
    keywords: keywords.tasks?.[0]?.result || [],
    competitors: competitors.tasks?.[0]?.result || [],
    fetched_at: new Date().toISOString()
  })
}
```

### Data Flow: Trigger to Enrichment

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     ONBOARDING ENRICHMENT FLOW                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. CSM enters website URL in modal                                     │
│     ↓                                                                   │
│  2. Frontend debounces (500ms) then calls:                              │
│     POST /api/v1/seo/enrich { domain: "vshred.com" }                   │
│     ↓                                                                   │
│  3. API route validates session, calls DataForSEO                       │
│     ↓                                                                   │
│  4. Returns SEO summary to frontend                                     │
│     { keywords_count: 15475, traffic_value: 125000, competitors: 10 }  │
│     ↓                                                                   │
│  5. Frontend displays SEO Preview Card                                  │
│     ↓                                                                   │
│  6. CSM clicks "Send Onboarding Link"                                   │
│     ↓                                                                   │
│  7. POST /api/v1/onboarding/trigger                                     │
│     - Creates client record                                             │
│     - Stores seo_data JSONB                                             │
│     - Creates onboarding_instance                                       │
│     - Generates link_token                                              │
│     - Sends welcome email (Resend/SendGrid)                             │
│     ↓                                                                   │
│  8. [ASYNC] AI Brand Guide Generation triggered                         │
│     - Gemini 3 Flash analyzes SEO data + intake form                   │
│     - Generates brand positioning insights                              │
│     - Stores in onboarding_instance.ai_analysis                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### AI Brand Guide Generation (CIA-Lite)

The "AI Analysis Preview" section in Client Journey is a simplified version of the Customer Intelligence Arsenal (CIA). It runs when intake is complete.

**Trigger:** `onboarding_instance.status` changes to `'in_progress'` after intake form submitted

**Implementation:**
```typescript
// lib/services/ai-brand-analysis.ts
export async function generateBrandGuide(clientId: string) {
  const client = await getClientWithSEO(clientId)
  const intakeResponses = await getIntakeResponses(client.onboarding_instance_id)

  const prompt = `
    Analyze this client for a marketing agency:

    Business: ${client.name}
    Website: ${client.website_url}
    Monthly Budget: ${intakeResponses.monthly_budget}
    Target Audience: ${intakeResponses.target_audience}

    SEO Intelligence:
    - Keywords Ranked: ${client.seo_data.keywords_count}
    - Organic Traffic Value: $${client.seo_data.traffic_value}
    - Top Competitors: ${client.seo_data.competitors.map(c => c.domain).join(', ')}

    Provide:
    1. Brand positioning summary (2-3 sentences)
    2. Competitive advantages
    3. Tracking setup recommendations
    4. Initial campaign opportunities
  `

  const analysis = await generateWithGemini(prompt, 'gemini-3-flash-preview')

  await updateOnboardingInstance(client.onboarding_instance_id, {
    ai_analysis: analysis,
    ai_analysis_generated_at: new Date()
  })

  return analysis
}
```

### Environment Variables Required

```env
# DataForSEO (for SEO enrichment)
DATAFORSEO_LOGIN=your-login
DATAFORSEO_PASSWORD=your-password

# Gemini (for AI analysis)
GOOGLE_AI_API_KEY=your-gemini-key

# Email (for welcome emails)
RESEND_API_KEY=your-resend-key
```

### Multi-Tenant Considerations

All API routes must:
1. Validate user session
2. Extract `agency_id` from session
3. Scope all queries by `agency_id`
4. Use RLS as defense-in-depth

```typescript
// Pattern for all onboarding API routes
const session = await getServerSession()
const agencyId = session?.user?.agency_id
if (!agencyId) return unauthorized()

// All Supabase queries auto-filtered by RLS
const { data } = await supabase
  .from('onboarding_instance')
  .select('*')
  .eq('agency_id', agencyId) // Explicit filter + RLS backup
```

---

## CAA (Claude Augmented Automation) Opportunities

### Automatic Actions During Onboarding:

1. **SEO Enrichment** (DataForSEO)
   - Auto-fetch when website URL entered
   - Store for client profile display

2. **Competitor Analysis**
   - Identify top 5 organic competitors
   - Flag if client ranks poorly vs competitors

3. **Welcome Email Generation** (Gemini)
   - Personalized based on client tier + SEO data
   - Include relevant industry insights

4. **Tracking Analysis** (AI Analysis Configuration)
   - Analyze GTM container when access granted
   - Generate installation recommendations
   - Flag common issues automatically

5. **Slack Channel Setup** (chi-gateway + Slack API)
   - Auto-create #client-{name} channel
   - Post welcome message with SEO snapshot
   - Add relevant team members

---

## Success Metrics

- [ ] 100% of new clients get SEO data within onboarding
- [ ] Time-to-first-insight reduced from 30min to 30sec
- [ ] Form Builder allows 5+ custom fields per agency
- [ ] AI Analysis generates recommendations for 90%+ clients

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `components/views/onboarding-hub.tsx` | MODIFY | Add 3-tab structure |
| `components/onboarding/header.tsx` | CREATE | Header with action buttons |
| `components/onboarding/trigger-modal.tsx` | CREATE | Trigger Onboarding modal |
| `components/onboarding/form-builder-tab.tsx` | CREATE | Form Builder tab |
| `components/onboarding/client-journey-tab.tsx` | CREATE | Client Journey tab |
| `components/onboarding/seo-preview-card.tsx` | CREATE | SEO Preview in modal |
| `components/onboarding/progress-pills.tsx` | CREATE | Status pills with badges |
| `lib/services/seo-enrichment.ts` | CREATE | DataForSEO integration |
| `app/api/v1/onboarding/trigger/route.ts` | CREATE | Trigger onboarding API |
| `app/api/v1/onboarding/form-config/route.ts` | CREATE | Form config CRUD |
| `supabase/migrations/xxx_onboarding_hub.sql` | CREATE | Schema changes |

---

---

## V0 Prototype Analysis (Browser Exploration 2026-01-09)

### Screenshots Captured

Browser exploration of `https://v0-audience-os-command-center.vercel.app/onboarding` revealed:

#### Active Onboardings Tab
- **Master-detail layout** - Client cards on left, journey panel on right
- **Client cards show:**
  - Company initials avatar + name
  - Tier badge (Enterprise/Core)
  - Days in current stage
  - Assigned CSM with avatar
  - **Progress pills** with status colors (green/red/gray)
  - **Platform badges** on Access Verified pill (FB, GA, SH)

#### Client Journey Detail Panel
When client selected, right panel shows:
1. **Welcome Video** - Status badge (Completed), video placeholder with "Watched by client" timestamp
2. **Intake Form** - Status badge (Submitted), displays submitted data (Shopify URL, Contact email), "View Full Details" link
3. **Access Grant** - Status badge (Pending), checklist of platforms (Meta Ads Manager, Google Tag Manager, Shopify Admin)
4. **AI Brand Guide Generation** - Placeholder: "AI analysis will appear here once intake form is complete"

#### Form Builder Tab
- **10 default fields** with editable label, placeholder, and required toggle:
  1. Business Name ✅
  2. Shopify Store URL ✅
  3. Primary Contact Email ✅
  4. Monthly Ad Budget ✅
  5. Facebook Ad Account ID ✅
  6. Google Ads Customer ID ✅
  7. Google Tag Manager Container ID ✅
  8. Meta Pixel ID ✅
  9. Klaviyo API Key (if applicable) ❌
  10. Target Audience Description ✅
- **+ Add Field** button at bottom
- **Form Preview** section

#### Client Journey Tab (Configuration)
- **Welcome Video Configuration** - Vimeo/YouTube URL input
- **AI Analysis Configuration** - Analysis Prompt Template textarea
- **AI Analysis Preview** - Example output showing "Tracking Setup Analysis"
- **Save Configuration** button

#### Trigger Onboarding Modal
- Client Name (required)
- Primary Contact Email (required)
- Client Tier dropdown (Core/Enterprise)
- "What happens next?" info box
- Cancel / Send Onboarding Link buttons
- **Missing from v0:** Website URL field (we'll add for SEO enrichment)

#### Header Actions
- **+ Trigger Onboarding** (green button)
- **Copy Portal Link** (icon button)
- **View as Client** (icon button)

#### AudienceOS Intelligence Widget
Floating chat widget at bottom with quick actions:
- "Show stuck clients"
- "Draft email to RTA Outdoor"
- "How do I troubleshoot pixel?"
- "Summarize at-risk clients"

---

## Edge Cases & Error Handling

### 1. Website URL Validation

**Scenario:** CSM enters invalid or empty website URL

| Input | Handling | UX |
|-------|----------|-----|
| Empty | Skip SEO enrichment, allow onboarding | ⚠️ Warning: "No SEO data will be collected" |
| Invalid format (no TLD) | Block enrichment call | ❌ "Please enter a valid URL" |
| Non-existent domain | DataForSEO returns empty | ⚪ "No SEO data available for this domain" |
| Typo in domain | Continue with typed domain | ℹ️ No auto-correction (user responsibility) |

**Implementation:**
```typescript
// lib/validation/url-validation.ts
export function validateDomain(url: string): { valid: boolean; domain: string | null; error?: string } {
  if (!url || url.trim() === '') {
    return { valid: true, domain: null } // Empty is OK, skip enrichment
  }

  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
    const domain = parsed.hostname.replace(/^www\./, '')

    // Must have TLD
    if (!domain.includes('.') || domain.endsWith('.')) {
      return { valid: false, domain: null, error: 'Please enter a valid domain (e.g., example.com)' }
    }

    return { valid: true, domain }
  } catch {
    return { valid: false, domain: null, error: 'Invalid URL format' }
  }
}
```

### 2. DataForSEO API Errors

| Error Code | Meaning | Handling | UX |
|------------|---------|----------|-----|
| 429 | Rate limited | Exponential backoff (max 3 retries) | ⏳ "Fetching SEO data..." (show spinner longer) |
| 401 | Invalid credentials | Log error, fail gracefully | ⚠️ "SEO enrichment unavailable" |
| 500 | Server error | Single retry after 2s | ⚠️ "SEO enrichment unavailable" |
| Timeout (>10s) | Network issue | Fail gracefully | ⚠️ "SEO enrichment timed out" |

**Implementation:**
```typescript
// lib/services/seo-enrichment.ts
async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout

      const response = await fetch(url, { ...options, signal: controller.signal })
      clearTimeout(timeoutId)

      if (response.status === 429 && i < retries - 1) {
        await delay(Math.pow(2, i) * 1000) // 1s, 2s, 4s backoff
        continue
      }

      return response
    } catch (error) {
      if (i === retries - 1) throw error
    }
  }
  throw new Error('Max retries exceeded')
}
```

**Critical:** Onboarding must NOT fail if SEO enrichment fails. SEO data is enhancement, not requirement.

### 3. Duplicate Client Detection

**Scenario:** CSM triggers onboarding for a client that already exists

| Condition | Detection | Handling |
|-----------|-----------|----------|
| Same email | Query `client` table | ❌ Block: "Client with this email already exists" |
| Same website | Query `client` table | ⚠️ Warning: "Similar client found: {name}. Continue anyway?" |
| Same name | Fuzzy match | ℹ️ Info only (names can be similar) |

**Implementation:**
```typescript
// app/api/v1/onboarding/trigger/route.ts
async function checkForDuplicates(agencyId: string, email: string, websiteUrl?: string) {
  const { data: existingByEmail } = await supabase
    .from('client')
    .select('id, name, email')
    .eq('agency_id', agencyId)
    .eq('email', email)
    .single()

  if (existingByEmail) {
    return { blocked: true, reason: 'email_exists', existing: existingByEmail }
  }

  if (websiteUrl) {
    const domain = extractDomain(websiteUrl)
    const { data: existingByWebsite } = await supabase
      .from('client')
      .select('id, name, website_url')
      .eq('agency_id', agencyId)
      .ilike('website_url', `%${domain}%`)
      .limit(1)
      .single()

    if (existingByWebsite) {
      return { blocked: false, warning: 'website_similar', existing: existingByWebsite }
    }
  }

  return { blocked: false }
}
```

### 4. Email Sending Failures

**Scenario:** Welcome email fails to send after client is created

| Failure Mode | Handling | UX |
|--------------|----------|-----|
| Resend API down | Queue for retry (5 min) | ✅ Client created, ⚠️ "Email will be sent shortly" |
| Invalid email format | Validate before submission | ❌ Block: "Invalid email address" |
| Email bounced (async) | Webhook → flag client | 🔔 Notification to CSM |
| Rate limited | Queue for later | ⚠️ "Email queued" |

**Implementation:**
```typescript
// lib/services/email-service.ts
export async function sendWelcomeEmail(clientId: string, email: string, portalToken: string) {
  try {
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: email,
      subject: 'Welcome to Your Onboarding Portal',
      html: generateWelcomeEmailHTML(portalToken)
    })

    await updateOnboardingInstance(clientId, { email_sent: true, email_sent_at: new Date() })
    return { success: true, messageId: result.id }
  } catch (error) {
    // Log error but don't fail onboarding
    console.error('Email send failed:', error)

    // Queue for retry
    await queueEmailRetry(clientId, email, portalToken)

    return { success: false, queued: true }
  }
}
```

**Critical Rule:** Never fail client creation because email failed. The client record is the source of truth.

### 5. Gemini AI Analysis Failures

**Scenario:** AI brand guide generation fails

| Failure Mode | Handling | UX |
|--------------|----------|-----|
| API timeout (>30s) | Retry once, then queue | ⚪ "AI analysis pending..." |
| Rate limited | Queue for background job | ⚪ "AI analysis will be available soon" |
| Model error | Log, show partial data | ⚠️ "AI analysis unavailable" |
| Empty response | Retry with simpler prompt | ⚪ "Generating analysis..." |

**Implementation:**
```typescript
// lib/services/ai-brand-analysis.ts
export async function generateBrandGuideWithFallback(clientId: string) {
  try {
    const analysis = await generateBrandGuide(clientId)
    return { success: true, analysis }
  } catch (error) {
    console.error('AI analysis failed:', error)

    // Don't block - queue for retry
    await queueAIAnalysisRetry(clientId)

    // Return placeholder
    return {
      success: false,
      analysis: null,
      message: 'AI analysis will be available once processing completes'
    }
  }
}
```

### 6. Race Conditions

**Scenario:** Multiple CSMs trigger onboarding for same client simultaneously

**Prevention:**
```typescript
// Use database constraint
await supabase.from('onboarding_instance').insert({
  agency_id,
  client_id,
  // ... other fields
}).single()

// UNIQUE constraint on (agency_id, client_id, status != 'cancelled')
// will prevent duplicates at DB level
```

### 7. Token Security

**Scenario:** Portal link token could be guessed/brute-forced

**Mitigation:**
```typescript
// Generate cryptographically secure token
import { randomBytes } from 'crypto'

function generatePortalToken(): string {
  return randomBytes(32).toString('hex') // 64 char hex = 256 bits entropy
}

// Rate limit token lookups in portal
// 10 requests per minute per IP
```

### Error Response Standard

All API routes return consistent error format:
```typescript
interface APIError {
  error: string          // Machine-readable code
  message: string        // Human-readable message
  field?: string         // Which field caused error (for validation)
  retry_after?: number   // Seconds until retry (for rate limits)
}

// Examples:
{ error: 'duplicate_email', message: 'A client with this email already exists', field: 'email' }
{ error: 'seo_unavailable', message: 'SEO enrichment is temporarily unavailable' }
{ error: 'rate_limited', message: 'Too many requests', retry_after: 60 }
```

---

## Pre-Implementation Checklist

Before starting implementation, verify:

- [ ] **Database:** Run `npx supabase db push` to apply migration 015
- [ ] **Environment:** Add DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD to Vercel
- [ ] **Environment:** Verify RESEND_API_KEY on Vercel is real (not test key)
- [ ] **Environment:** Verify GOOGLE_AI_API_KEY on Vercel for Gemini 3
- [ ] **V0 Reference:** Keep prototype tab open during development

---

*Living Document - Last Updated: 2026-01-09 (stress test blockers fixed, edge cases added)*
