# Product Vision: Onboarding & Intake Hub

> **Status:** APPROVED (Pre-Flight 9/10)
> **Created:** 2026-01-09
> **Phase:** B-1 Vision Complete

---

## The Product

**Name:** Onboarding & Intake Hub
**One-liner:** Transform chaotic client onboarding into a trackable, SEO-enriched workflow with self-service intake forms.

---

## The Problem

Marketing agencies face critical pain points during client onboarding:

1. **Manual Tracking Chaos**: CSMs track onboarding in spreadsheets, leading to missed steps and no visibility
2. **No Data Collection Automation**: Clients email credentials and info piecemeal, creating security risks
3. **Missing Competitive Context**: SEO/competitive research requires 2+ hours of manual work per client
4. **Zero Progress Visibility**: Neither clients nor leadership can see onboarding status

**Cost of Status Quo:**
- 4-6 hours per client onboarding (manual coordination)
- 15% of clients stall due to missing information
- $50+/hr analyst time for competitive research
- Leadership has no pipeline visibility

---

## Target Users

### Primary: Customer Success Managers (CSMs)
- Managing 10-20 client onboardings simultaneously
- Need visual pipeline to track all clients
- Need automated form collection
- Need instant competitive context

### Secondary: Agency Owners
- Need pipeline visibility across all CSMs
- Need to identify bottlenecks
- Need client health metrics

### Tertiary: Clients (Self-Service)
- Need clear intake form experience
- Need progress transparency
- Need secure credential submission

---

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Time-to-onboard | 50% reduction | Days from trigger to "Live Support" stage |
| SEO context available | 100% of clients | Clients with populated seo_data field |
| Form completion rate | >80% | intake_response submissions / onboarding_instances |
| CSM productivity | 2x clients/CSM | Active onboardings per CSM |
| Client visibility | 100% | Clients receiving progress emails |

---

## Core Value Proposition

Replace manual onboarding chaos with a visual, trackable workflow that:
- **Auto-enriches** every client with competitive SEO intelligence ($0.02 vs $50+/hr)
- **Self-service intake** eliminates back-and-forth email coordination
- **Visual pipeline** gives leadership instant visibility
- **Configurable journeys** adapt to different client tiers

---

## Solution Overview

### 1. Onboarding Dashboard (Staff-Facing)
- Kanban view of all active onboardings by stage
- Quick-action "Trigger Onboarding" modal
- Stage progression with badges (FB, GA, SH verified)
- Client health indicators

### 2. Client Journey Builder
- Configure onboarding stages per journey type
- Set required vs optional steps
- Configure welcome video and AI analysis prompts
- Default journey for standard clients

### 3. Intake Form Builder
- Drag-and-drop form field configuration
- Field types: text, email, URL, number, textarea, select
- Required field enforcement
- Preview before publish

### 4. Client Portal (Token-Based)
- Secure link sent to client email
- 4-step wizard: Handshake → Keys → Handoff → Success
- Progress saved automatically
- Mobile-responsive

### 5. SEO Enrichment
- Auto-fetch on onboarding trigger
- Keywords ranked, traffic value, competitors
- Displayed in onboarding modal preview
- Stored for client profile

---

## Technical Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| DataForSEO Keywords API | ✅ Working | Via chi-gateway |
| DataForSEO Competitors API | ✅ Working | Fixed 2026-01-09 |
| Supabase Database | ⚠️ Schema Ready | 5 tables documented |
| Client Portal | ✅ Exists | `app/onboarding/start/page.tsx` |
| V0 Prototype | ✅ Validated | Design reference confirmed |

---

## Pre-Flight Verification (2026-01-09)

### Blockers Resolved

1. **DataForSEO Competitors API** - Fixed missing `location_code` and `language_code` parameters in chi-gateway
2. **Database Schema** - Created `ONBOARDING-SCHEMA.md` with 5 tables, RLS policies, seed data
3. **Codebase Gap** - Analyzed existing `onboarding-hub.tsx`, recommended build-new approach

### Runtime Evidence

- Keywords API: 15,475 keywords returned for vshred.com
- Competitors API: 54,229 competitors returned for vshred.com
- V0 Prototype: All 3 tabs functional, no console errors
- Client Portal: Existing 4-step wizard reusable

### Confidence Score: 9/10

---

## Next Steps

1. **B-2 Scope** - Define MVP boundaries, what's in/out
2. **Database Migration** - Run SQL from ONBOARDING-SCHEMA.md
3. **Component Build** - New onboarding dashboard component
4. **Integration** - Wire DataForSEO enrichment to onboarding flow

---

## Related Documents

| Document | Path |
|----------|------|
| Database Schema | `docs/04-technical/ONBOARDING-SCHEMA.md` |
| SEO Enrichment Spec | `features/SEO-ENRICHED-ONBOARDING.md` |
| Feature Index | `features/INDEX.md` |
| V0 Prototype | https://v0-audience-os-command-center.vercel.app/onboarding |

---

*Living Document - Last Updated: 2026-01-09*
