# Feature: SEO-Enriched Client Onboarding

**Status:** Draft | **Priority:** High | **Effort:** 3 DU
**Owner:** Chi | **Created:** 2026-01-09

---

## Executive Summary

Enhance AudienceOS client onboarding with automatic SEO intelligence from DataForSEO. When a CSM triggers onboarding for a new client, the system auto-fetches SEO data (keywords, traffic value, competitors) and displays it throughout the client lifecycle.

**Value Proposition:**
- Instant client context vs hours of manual research
- $0.02 per enrichment vs $50+/hr analyst time
- Competitive intelligence from day 1

---

## Current State Analysis

### Onboarding Modal (Trigger Onboarding)
**Current Fields:**
- Client Name (text input)
- Primary Contact Email (email input)
- Client Tier (dropdown: Core/Enterprise)

**Current Flow:**
```
CSM clicks "Trigger Onboarding"
  → Modal opens
  → Enter name, email, tier
  → Click "Send Onboarding Link"
  → Client receives welcome email
```

### Client Profile Tabs
- **Overview:** Health, Tickets, Last Contact, Install Progress, Timeline
- **Communications:** Slack, email threads
- **Tasks:** Onboarding checklist
- **Performance:** Meta Ads, Google Ads metrics + chart
- **Media & Files:** Assets
- **Tech Setup:** Pixel, tracking config

### Intelligence Center
Three columns:
- Critical Risks (red)
- Approvals & Actions (yellow)
- Performance Signals (green)

---

## Proposed Enhancement

### 1. Onboarding Modal - Website Field + SEO Preview

**New Field:** Website URL (required for enrichment)

**Enhanced Flow:**
```
CSM clicks "Trigger Onboarding"
  → Modal opens
  → Enter client name
  → Enter website URL
  → [AUTOMATIC] System fetches SEO data (loading spinner)
  → SEO Preview Card appears:
      ┌────────────────────────────────────┐
      │  SEO Intelligence Preview          │
      ├────────────────────────────────────┤
      │  Keywords Ranked:     15,475       │
      │  Traffic Value:       $125,898/mo  │
      │  Top 10 Positions:    966          │
      │  Est. Monthly Traffic: 450,000     │
      │                                    │
      │  Top Keywords:                     │
      │  • calculate macros (12,100/mo)    │
      │  • macro calculator (8,100/mo)     │
      │  • weight loss tips (6,600/mo)     │
      │                                    │
      │  Top Competitors:                  │
      │  • bodybuilding.com               │
      │  • myfitnesspal.com               │
      │  • healthline.com                 │
      └────────────────────────────────────┘
  → Enter email, tier
  → Click "Send Onboarding Link"
  → SEO data saved to client profile
```

**UI Specifications:**
- Field: `<input type="url" placeholder="https://clientdomain.com" />`
- Debounce: 500ms after typing stops
- Loading state: Spinner + "Fetching SEO data..."
- Error state: "Unable to fetch SEO data" (allow continue without)
- Preview card: Collapsible, dark card matching app theme

---

### 2. Client Profile - Overview Tab SEO Card

Add new card to Overview grid (4th card):

```
┌──────────────────────────────────────┐
│  SEO Intelligence                 ↗  │
├──────────────────────────────────────┤
│  Keywords Ranked                     │
│  15,475                              │
│  ▲ 234 this month                    │
│                                      │
│  Traffic Value                       │
│  $125,898/mo                         │
│  ▲ 12% vs last month                 │
│                                      │
│  [View Full Report →]                │
└──────────────────────────────────────┘
```

**Position:** After "Install Progress" card
**Refresh:** Manual button + monthly auto-refresh
**Link:** Opens Performance tab SEO section

---

### 3. Performance Tab - SEO Section

Add third metric card + chart integration:

**New Card (alongside Meta Ads, Google Ads):**
```
┌──────────────────────────────────────┐
│  Organic Search                   ↗  │
├──────────────────────────────────────┤
│  Keywords        Traffic Value       │
│  15,475          $125,898           │
│                                      │
│  Top 10          Competitors         │
│  966             54,229              │
└──────────────────────────────────────┘
```

**Chart Integration:**
- Add "Organic Traffic" line (blue) to Performance Over Time chart
- Toggle: Ad Spend | ROAS | Organic Traffic
- Data source: Monthly DataForSEO refresh

**New Sub-Section: Keyword Rankings**
```
┌─────────────────────────────────────────────────────────────┐
│  Top Keywords                              [Refresh] [Export]│
├─────────────────────────────────────────────────────────────┤
│  Keyword              Position   Volume    Traffic   Change │
│  calculate macros     #3         12,100    8,470     ▲ 2    │
│  macro calculator     #5         8,100     4,050     ▼ 1    │
│  weight loss tips     #8         6,600     2,640     -      │
│  protein calculator   #4         5,400     3,240     ▲ 4    │
│  ... (20 rows, paginated)                                   │
└─────────────────────────────────────────────────────────────┘
```

---

### 4. Intelligence Center - SEO Signals Column

Add 4th column to Intelligence Center:

```
┌──────────────────────────────────────┐
│  🔍 SEO Intelligence            (3)  │
│  Organic performance changes         │
├──────────────────────────────────────┤
│  ▼ Keywords Dropped 15%              │
│  Beardbrand lost 2,340 keywords in   │
│  past 30 days. Investigate content.  │
│  Beardbrand • 2d ago                 │
│  [Investigate →]                     │
├──────────────────────────────────────┤
│  ★ New #1 Ranking                    │
│  Gymshark now ranks #1 for "workout  │
│  clothes" (22,200/mo search vol)     │
│  Gymshark • 3d ago                   │
│  [View Details →]                    │
├──────────────────────────────────────┤
│  ⚠ Competitor Gained Position        │
│  myfitnesspal.com overtook V Shred   │
│  for 145 keywords this month.        │
│  V Shred • 1w ago                    │
│  [Compare →]                         │
└──────────────────────────────────────┘
```

**Signal Types:**
- Keywords Dropped >10% (Critical)
- New Page 1 Rankings (Positive)
- Lost Page 1 Rankings (Warning)
- Competitor Position Changes (Info)
- Traffic Value Change >15% (Alert)

---

## Data Model

### Client Table Extension

```sql
ALTER TABLE clients ADD COLUMN (
  website_url VARCHAR(255),
  seo_data JSONB,
  seo_last_refreshed TIMESTAMP,
  seo_refresh_enabled BOOLEAN DEFAULT true
);
```

### SEO Data JSON Structure

```json
{
  "fetched_at": "2026-01-09T10:00:00Z",
  "domain": "vshred.com",
  "summary": {
    "total_keywords": 15475,
    "traffic_value": 125898.36,
    "top_10_count": 966,
    "estimated_traffic": 450000
  },
  "keywords": [
    {
      "keyword": "calculate macros",
      "position": 3,
      "search_volume": 12100,
      "traffic": 8470,
      "change": 2
    }
  ],
  "competitors": [
    {
      "domain": "bodybuilding.com",
      "intersecting_keywords": 8234,
      "avg_position": 12.5
    }
  ],
  "history": [
    {
      "date": "2026-01-01",
      "keywords": 15200,
      "traffic_value": 118000
    }
  ]
}
```

---

## API Integration

### DataForSEO via chi-gateway

**Endpoint:** `POST https://chi-gateway.roderic-andrews.workers.dev/mcp`

**Request (Domain Keywords):**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "seo_domain_keywords",
    "arguments": {
      "target": "vshred.com",
      "limit": 20
    }
  },
  "id": 1
}
```

**Request (Competitors):**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "seo_competitors",
    "arguments": {
      "target": "vshred.com",
      "limit": 10
    }
  },
  "id": 1
}
```

### Backend Service

```typescript
// services/seoEnrichment.ts
import { CHI_GATEWAY_URL } from '@/config';

export async function enrichClientSEO(domain: string) {
  const [keywordsRes, competitorsRes] = await Promise.all([
    callChiGateway('seo_domain_keywords', { target: domain, limit: 20 }),
    callChiGateway('seo_competitors', { target: domain, limit: 10 })
  ]);

  return {
    summary: {
      total_keywords: keywordsRes.total_count,
      traffic_value: keywordsRes.metrics?.organic?.etv || 0,
      top_10_count: keywordsRes.metrics?.organic?.pos_1 +
                    keywordsRes.metrics?.organic?.pos_2_3 +
                    keywordsRes.metrics?.organic?.pos_4_10,
    },
    keywords: keywordsRes.items?.slice(0, 20) || [],
    competitors: competitorsRes.items?.filter(c => c.domain !== domain).slice(0, 10) || []
  };
}

async function callChiGateway(tool: string, args: object) {
  const res = await fetch(CHI_GATEWAY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: tool, arguments: args },
      id: 1
    })
  });
  const data = await res.json();
  return JSON.parse(data.result.content[0].text).tasks[0].result[0];
}
```

---

## UI Component Specifications

### Design System Alignment

**AudienceOS Theme:**
- Background: `#0a0a0a` (near black)
- Card background: `#171717` (dark gray)
- Border: `#262626` (subtle)
- Primary accent: `#22c55e` (green)
- Text primary: `#ffffff`
- Text secondary: `#a3a3a3`

### New Components Required

1. **SEOPreviewCard** - Onboarding modal preview
2. **SEOOverviewCard** - Client overview stat card
3. **SEOPerformanceSection** - Performance tab full section
4. **SEOKeywordsTable** - Paginated keyword rankings
5. **SEOSignalCard** - Intelligence Center alerts
6. **SEOCompetitorRow** - Competitor comparison item

### Responsive Breakpoints

- Desktop: Full 3-column Intelligence Center, side-by-side cards
- Tablet: 2-column Intelligence Center, stacked cards
- Mobile: Single column, collapsible sections

---

## Implementation Plan

### Phase 1: Data Layer (0.5 DU)
- [ ] Add `website_url`, `seo_data` columns to clients table
- [ ] Create `seoEnrichment.ts` service
- [ ] Add API route: `POST /api/clients/:id/seo/refresh`

### Phase 2: Onboarding Enhancement (1 DU)
- [ ] Add website URL field to onboarding modal
- [ ] Implement auto-fetch on URL blur
- [ ] Create SEOPreviewCard component
- [ ] Save SEO data on client creation

### Phase 3: Client Profile Integration (1 DU)
- [ ] Add SEOOverviewCard to Overview tab
- [ ] Create SEOPerformanceSection for Performance tab
- [ ] Add SEOKeywordsTable with pagination
- [ ] Implement manual refresh button

### Phase 4: Intelligence Center (0.5 DU)
- [ ] Create SEOSignalCard component
- [ ] Add 4th column to Intelligence Center grid
- [ ] Implement signal detection logic
- [ ] Add monthly comparison for alerts

---

## Cost Analysis

| Item | Cost |
|------|------|
| Per-client enrichment | $0.02 |
| Monthly refresh (14 clients) | $0.28 |
| Current DataForSEO balance | $45.33 |
| Enrichments possible | ~2,200 |

**ROI:** 5 minutes saved per client = $50+ value per enrichment

---

## Success Metrics

- [ ] 100% of new clients have SEO data within 24h
- [ ] CSM time-to-context reduced from 30min to 30sec
- [ ] SEO-based upsell conversations increase 25%
- [ ] Client reports include organic performance

---

## Open Questions

1. Should SEO refresh be automatic (monthly) or manual-only?
2. Include SEO section in client reports/exports?
3. Alert thresholds configurable per client tier?
4. Competitor tracking depth (5 vs 10 vs 20)?

---

## Appendix: Tested API Responses

### V Shred Domain Keywords (Actual Data)
```
Total Keywords: 15,475
Traffic Value: $125,898/mo
Top 10 Positions: 966
Cost: $0.011
```

### V Shred Competitors (Actual Data)
```
Total Competitors: 54,229
Top: youtube.com, reddit.com, quora.com, instagram.com
Cost: $0.0105
```

---

*Living Document - Last Updated: 2026-01-09*
