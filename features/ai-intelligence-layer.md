# FEATURE SPEC: Holy Grail Chat (HGC) Integration

**What:** Complete AI platform with intelligent routing, function calling, cross-session memory, RAG, risk detection, and Google Workspace integration
**Who:** Agency Account Managers seeking proactive client management and intelligent assistance
**Why:** Replace reactive firefighting with AI-driven early warning system and intelligent response assistance
**Status:** 🚧 Building (Standalone)

---

## ⚠️ STANDALONE PROJECT - HGC (Holy Grail Chat)

**This feature is being built in a standalone project for focused development.**

| Attribute | Value |
|-----------|-------|
| Standalone Project | `/Users/rodericandrews/_PAI/projects/chi-intelligent-chat/` |
| Architecture | Gemini-First (File Search, Google Search Grounding, Flash 3) |
| Feature Spec | `chi-intelligent-chat/features/holy-grail-chat.md` |
| User Stories | `chi-intelligent-chat/docs/02-specs/USER-STORIES.md` |
| Roadmap | `chi-intelligent-chat/docs/05-planning/ROADMAP.md` |
| Stress Test | `chi-intelligent-chat/docs/06-reference/STRESS-TEST-REPORT.md` |
| Re-integration | Phase 3 in roadmap |

---

## Current Status (2026-01-03)

### What Works Today

| Capability | Route | Status |
|------------|-------|--------|
| Document Search | RAG | ✅ Working (Gemini File Search) |
| Web Search | Web | ✅ Working (Google Search Grounding) |
| Memory Recall | Memory | ✅ Working (Mem0) |
| Casual Chat | Casual | ✅ Working (Gemini Flash 3) |
| Smart Routing | - | ✅ Working (5 routes classified) |
| Streaming | - | ✅ Working (SSE) |
| Citations | - | ✅ Working (from grounding metadata) |

### What Does NOT Work Today

| Capability | Blocker | Required Effort |
|------------|---------|-----------------|
| Client Queries | No function calling | Phase 1 (4-8 hrs) |
| Alert Queries | No function calling | Phase 1 (4-8 hrs) |
| Navigation | No function calling | Phase 1 (4-8 hrs) |
| Gmail Access | No Diiiploy-Gateway | Phase 2 (8-12 hrs) |
| Calendar Access | No Diiiploy-Gateway | Phase 2 (8-12 hrs) |

---

## Critical Gaps

| Gap | Spec | Priority | Effort |
|-----|------|----------|--------|
| **Function Calling** | [FUNCTION-CALLING.md](../chi-intelligent-chat/docs/04-technical/FUNCTION-CALLING.md) | P0 | 4-8 hrs |
| **Diiiploy-Gateway** | [DIIIPLOY-GATEWAY.md](../chi-intelligent-chat/docs/04-technical/DIIIPLOY-GATEWAY.md) | P0 | 8-12 hrs |

### Function Calling Gap

Dashboard route is **classified** but **not handled**:
- SmartRouter returns `route: 'dashboard'` ✅
- No handler exists after classification ❌
- Falls through to casual chat ❌

**Fix:** Add function declarations + executors (see FUNCTION-CALLING.md)

### Diiiploy-Gateway Gap

Chi-Gateway is personal. Production apps need **Diiiploy-Gateway**:
- Per-tenant OAuth tokens in Cloudflare KV
- Routes: `/gmail/*`, `/calendar/*`, `/drive/*`
- Service-to-service auth with `X-API-Key` + `X-Tenant-ID`

**Fix:** Fork Chi-Gateway, add multi-tenant layer (see DIIIPLOY-GATEWAY.md)

---

## Integration Roadmap

### Phase 1: Function Calling Core (P0)
**Effort:** 4-8 hours
**Blocks:** All data queries

| Task | Status |
|------|--------|
| FC-001: Create function declarations | Not started |
| FC-002: Create function executors | Not started |
| FC-003: Wire dashboard route handler | Not started |
| FC-004: Add stream event types | Not started |

**Success:** "Show me at-risk clients" returns actual data

### Phase 2: Diiiploy-Gateway Multi-tenant (P0)
**Effort:** 8-12 hours
**Blocks:** Gmail, Calendar, Drive access

| Task | Status |
|------|--------|
| DG-001: Fork Chi-Gateway codebase | Not started |
| DG-002: Add OAuth routes | Not started |
| DG-003: Add tenant context to routes | Not started |
| DG-004: Add token refresh | Not started |
| DG-005: Build connection UI | Not started |

**Success:** Agency can connect Google Workspace, HGC reads their emails

### Phase 3: AudienceOS Integration (P1)
**Effort:** 8-12 hours
**Blocks:** Production deployment

| Task | Status |
|------|--------|
| INT-001: Create database migration | Not started |
| INT-002: Copy lib/ai/ to AudienceOS | Not started |
| INT-003: Create secure API route | Not started |
| INT-004: Copy components | Not started |
| INT-005: Integration testing | Not started |

**Success:** HGC running inside AudienceOS with proper auth

### Phase 4: UI Polish (P2)
**Effort:** 4-6 hours

**Success:** All acceptance criteria pass

---

## Confidence Score

| Factor | Score |
|--------|-------|
| Architecture | 9/10 |
| Existing Infrastructure | 8/10 |
| Gap Clarity | 10/10 |
| Path to Fix | 9/10 |
| **Overall** | **8.5/10** |

**Recommendation:** PROCEED WITH IMPLEMENTATION

---

## Why "Holy Grail Chat"?

- **Confusion:** "Chi" conflicts with Chi PAI system
- **Reusability:** HGC is designed for AudienceOS, RevOS, War Room
- **Branding:** "Holy Grail" = the complete AI chat solution
- **Independence:** Standalone development enables faster iteration

---

## Re-integration Checklist

When HGC is ready:

- [ ] Phase 1 (Function Calling) complete
- [ ] Phase 2 (Diiiploy-Gateway) complete
- [ ] All user stories validated
- [ ] Copy `lib/ai/` to AudienceOS
- [ ] Copy `components/ai/` to AudienceOS
- [ ] Create database migration
- [ ] Create API routes with proper auth
- [ ] Update this spec with final implementation
- [ ] Update features/INDEX.md

**The spec below is preserved for reference but the ACTIVE spec is in the standalone project.**

---

---

## User Stories

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

**US-024: AI Context-Aware Drafts**
As an Account Manager, I want AI to draft communications based on context, so I respond quickly.

Acceptance Criteria:
- [ ] "Draft Response" button in alerts and comms
- [ ] AI analyzes: conversation history, alerts, Knowledge Base
- [ ] Generated draft includes context and next steps
- [ ] Multiple variations: formal, casual, urgent
- [ ] User can edit before sending

---

## Functional Requirements

What this feature DOES:
- [ ] Monitor client health continuously and generate proactive risk alerts
- [ ] Provide conversational AI interface with progressive reveal and streaming
- [ ] Route queries intelligently to optimal data sources (RAG, web, memory, local)
- [ ] Index documents for RAG-based question answering with citations
- [ ] Draft contextual responses for communications and alerts
- [ ] Maintain cross-session memory and conversation context
- [ ] Explain app features, metrics, and capabilities (self-awareness)
- [ ] Generate suggested actions with human approval workflows
- [ ] Track AI usage, performance, and provide feedback loops

What this feature does NOT do:
- ❌ Auto-execute actions without human approval
- ❌ Modify client data based on AI recommendations
- ❌ Send communications without human review
- ❌ Replace human judgment with AI decisions
- ❌ Store sensitive client data in AI training sets

---

## Data Model

Entities involved:
- ALERT - Core risk alerts with suggested actions and metadata
- CHAT_SESSION - Conversation sessions with context persistence
- CHAT_MESSAGE - Individual messages with routing and citations
- DOCUMENT - Knowledge Base documents for RAG
- CLIENT - Source data for risk analysis and context
- COMMUNICATION - Context for draft generation

New fields needed:
| Entity | Field | Type | Description |
|--------|-------|------|-------------|
| ALERT | suggested_actions | JSONB | AI-generated action options |
| ALERT | confidence | Decimal(3,2) | AI confidence score (0.00-1.00) |
| CHAT_MESSAGE | route_used | Enum | rag, web, memory, casual, dashboard |
| CHAT_MESSAGE | citations | JSONB | Source document references |

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/alerts` | GET | List alerts with filtering by type/severity |
| `/api/v1/alerts/{id}` | GET | Get alert details with context and actions |
| `/api/v1/alerts/{id}/action` | POST | Execute approved AI action |
| `/api/v1/alerts/{id}/snooze` | POST | Snooze alert until specified time |
| `/api/v1/assistant/query` | POST | Chat query with smart routing |
| `/api/v1/assistant/draft` | POST | Generate contextual draft |
| `/api/v1/assistant/jobs/{id}` | GET | Poll async AI job status |
| `/api/v1/documents/{id}/index` | POST | Index document in Gemini File Search |

---

## UI Components

| Component | Purpose |
|-----------|---------|
| IntelligenceCenter | Main alerts dashboard with Critical/Approvals/Signals sections |
| AlertCard | Individual risk alert with actions and confidence indicators |
| AlertDrawer | Expanded alert view with full context and action approval |
| AIAssistant | Floating chat widget with progressive reveal |
| ChatBubble | Message bubble with typing animation and citations |
| SourceCitation | Clickable document references with preview |
| DraftComposer | AI draft generator with tone selection and editing |
| DocumentViewer | Modal for viewing cited documents with highlighting |
| MemoryIndicator | Visual indicator when AI recalls previous conversation |
| RoutingIndicator | Shows which AI route was used (RAG/Web/Memory) |
| ConfidenceScore | Visual confidence indicator for AI suggestions |
| TokenUsage | Real-time token consumption display |

---

## Implementation Tasks

### Infrastructure & Setup
- [ ] TASK-001: Set up Claude API integration with rate limiting and queuing
- [ ] TASK-002: Configure Gemini File Search API with multi-tenant stores
- [ ] TASK-003: Integrate Mem0 for cross-session memory storage
- [ ] TASK-004: Set up Exa API for web search capabilities
- [ ] TASK-005: Create AI usage tracking and token management system

### Risk Detection Engine
- [ ] TASK-006: Implement background job for client health monitoring
- [ ] TASK-007: Build configurable risk rules engine with thresholds
- [ ] TASK-008: Create alert generation with confidence scoring
- [ ] TASK-009: Add suggested actions generation per alert type
- [ ] TASK-010: Build false positive feedback loop for model improvement

### Intelligence Center UI
- [ ] TASK-011: Create IntelligenceCenter dashboard with 3-section layout
- [ ] TASK-012: Build AlertCard components with severity styling
- [ ] TASK-013: Implement alert filtering, sorting, and real-time updates
- [ ] TASK-014: Create AlertDrawer with action approval workflow
- [ ] TASK-015: Add badge count notifications for new alerts

### Chat System Core
- [ ] TASK-016: Build ChatService with SSE streaming responses
- [ ] TASK-017: Implement progressive reveal typing animation (~40 chars/sec)
- [ ] TASK-018: Create floating chat widget with context persistence
- [ ] TASK-019: Build ChatContext manager for session state
- [ ] TASK-020: Add conversation history and localStorage integration

### Smart Query Routing
- [ ] TASK-021: Build SmartRouter with 5 route types (RAG/Web/Memory/Casual/Dashboard)
- [ ] TASK-022: Implement route detection using intent analysis
- [ ] TASK-023: Create route confidence scoring and fallback logic
- [ ] TASK-024: Add routing analytics and performance monitoring
- [ ] TASK-025: Build route indicator UI to show which source was used

### RAG & Knowledge Base
- [ ] TASK-026: Implement Gemini File Search integration with chunking
- [ ] TASK-027: Build document indexing pipeline with progress tracking
- [ ] TASK-028: Create citation extraction and fuzzy matching system
- [ ] TASK-029: Build DocumentViewer modal with section highlighting
- [ ] TASK-030: Add document organization (client-specific vs global)

### Self-Awareness System
- [ ] TASK-031: Create AppKnowledgeService with metrics/features catalog
- [ ] TASK-032: Build system-identity knowledge base for AudienceOS
- [ ] TASK-033: Implement capability introspection endpoints
- [ ] TASK-034: Add "What can you do?" query handling with personalization
- [ ] TASK-035: Build metric explanation system with formulas and examples

### Cross-Session Memory
- [ ] TASK-036: Integrate Mem0 with tenant + user scoping
- [ ] TASK-037: Build memory injection into system prompts (top 5 relevant)
- [ ] TASK-038: Implement "Do you remember..." query detection
- [ ] TASK-039: Add semantic memory search with relevance scoring
- [ ] TASK-040: Create memory management UI (view/delete memories)

### Draft Generation
- [ ] TASK-041: Implement context-aware draft generation with conversation history
- [ ] TASK-042: Add multiple draft variations (formal, casual, urgent tones)
- [ ] TASK-043: Build draft composer with real-time editing capabilities
- [ ] TASK-044: Connect draft system to communications and alert workflows
- [ ] TASK-045: Add draft templates and personalization

### Performance & Monitoring
- [ ] TASK-046: Add comprehensive AI usage analytics and cost tracking
- [ ] TASK-047: Implement performance metrics for all AI features
- [ ] TASK-048: Build error handling, retry logic, and graceful degradation
- [ ] TASK-049: Create admin dashboard for AI system monitoring
- [ ] TASK-050: Add A/B testing framework for AI prompt optimization

---

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Claude API rate limit exceeded | Queue requests, show "AI temporarily busy", provide ETA |
| Gemini File Search unavailable | Fall back to database search, show degraded RAG warning |
| Document indexing fails | Retry with exponential backoff, alert admin, show user status |
| Alert confidence below 0.7 threshold | Don't create alert, log for model improvement |
| User dismisses high-confidence alert | Log feedback for false positive analysis |
| Large document (>10MB) upload | Chunk processing, show progress indicator, warn user |
| AI generates inappropriate content | Content filtering, escalation workflow, user reporting |
| Mem0 service unavailable | Fall back to session-only memory, warn user of limitation |
| Multiple routes match query with equal confidence | Use predefined priority order, log for analysis |
| Citation document deleted/moved | Show "Document no longer available" with cached preview |
| Long streaming response interrupted | Save partial response, allow "Continue" option |
| Self-awareness query about unknown feature | Honest "I don't have information about that" response |
| Token budget exhausted mid-response | Graceful truncation, offer to continue when budget resets |
| Concurrent chat sessions | Merge context intelligently, avoid confusion |
| Mobile device with poor connection | Adaptive streaming, offline mode with sync later |

---

## Technical Implementation

### Smart Query Routing System
```typescript
interface QueryRoute {
  name: 'rag' | 'web' | 'memory' | 'casual' | 'dashboard';
  confidence: number;
  estimated_time: number;
}

class SmartRouter {
  async routeQuery(query: string, context: ChatContext): Promise<QueryRoute> {
    const routes = await Promise.all([
      this.analyzeRAGPotential(query, context),
      this.analyzeWebSearchNeed(query),
      this.analyzeMemoryQuery(query),
      this.analyzeCasualQuery(query),
      this.analyzeDashboardAction(query)
    ]);

    // Sort by confidence, return highest
    const bestRoute = routes.sort((a, b) => b.confidence - a.confidence)[0];

    // Confidence threshold check
    if (bestRoute.confidence < 0.6) {
      return { name: 'casual', confidence: 1.0, estimated_time: 1000 };
    }

    return bestRoute;
  }

  private async analyzeRAGPotential(query: string, context: ChatContext): Promise<QueryRoute> {
    const documentKeywords = /sop|process|guide|documentation|procedure|policy/i;
    const hasRelevantDocs = context.hasDocuments || documentKeywords.test(query);

    return {
      name: 'rag',
      confidence: hasRelevantDocs ? 0.9 : 0.1,
      estimated_time: 4000
    };
  }
}
```

### Progressive Reveal System
```typescript
class ProgressiveReveal {
  private controller = new AbortController();

  async revealText(
    fullText: string,
    onUpdate: (text: string) => void,
    options: {
      charsPerSecond?: number;
      chunkSize?: number;
      pauseOnPunctuation?: boolean;
    } = {}
  ): Promise<void> {
    const { charsPerSecond = 40, chunkSize = 3, pauseOnPunctuation = true } = options;
    const delayMs = (chunkSize / charsPerSecond) * 1000;

    for (let i = 0; i < fullText.length; i += chunkSize) {
      if (this.controller.signal.aborted) break;

      const chunk = fullText.slice(0, i + chunkSize);
      onUpdate(chunk);

      // Pause longer at sentence endings
      const isPunctuation = /[.!?]$/.test(chunk.trim());
      const currentDelay = isPunctuation && pauseOnPunctuation ? delayMs * 2 : delayMs;

      await this.delay(currentDelay);
    }
  }

  abort(): void {
    this.controller.abort();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, ms);
      this.controller.signal.addEventListener('abort', () => {
        clearTimeout(timeout);
        reject(new Error('Aborted'));
      });
    });
  }
}
```

### Citation Fuzzy Matching
```typescript
interface Citation {
  documentId: string;
  title: string;
  chunkIndex: number;
  relevanceScore: number;
  previewText: string;
}

class CitationMatcher {
  private strategies: Array<(ref: string, docs: Document[]) => Citation | null> = [
    this.exactMatch,
    this.titleSimilarity,
    this.contentHash,
    this.timestampStrip,
    this.partialMatch
  ];

  findCitation(reference: string, documents: Document[]): Citation | null {
    for (const strategy of this.strategies) {
      const result = strategy(reference, documents);
      if (result && result.relevanceScore > 0.7) {
        return result;
      }
    }
    return null;
  }

  private exactMatch(reference: string, documents: Document[]): Citation | null {
    const doc = documents.find(d => d.id === reference || d.title === reference);
    return doc ? {
      documentId: doc.id,
      title: doc.title,
      chunkIndex: 0,
      relevanceScore: 1.0,
      previewText: doc.content.slice(0, 100)
    } : null;
  }

  private titleSimilarity(reference: string, documents: Document[]): Citation | null {
    for (const doc of documents) {
      const distance = this.levenshteinDistance(reference.toLowerCase(), doc.title.toLowerCase());
      if (distance <= 3) {
        return {
          documentId: doc.id,
          title: doc.title,
          chunkIndex: 0,
          relevanceScore: Math.max(0, 1 - (distance / Math.max(reference.length, doc.title.length))),
          previewText: doc.content.slice(0, 100)
        };
      }
    }
    return null;
  }
}
```

### Risk Detection Engine
```typescript
interface RiskRule {
  name: string;
  condition: (client: Client, metrics: any[]) => boolean;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestedActions: string[];
}

class RiskDetectionEngine {
  private rules: RiskRule[] = [
    {
      name: 'ad_account_disconnect',
      condition: (client, metrics) => {
        const lastAdSync = client.integrations.find(i => i.provider === 'google_ads')?.last_sync_at;
        return !lastAdSync || Date.now() - new Date(lastAdSync).getTime() > 24 * 60 * 60 * 1000;
      },
      confidence: 0.95,
      severity: 'critical',
      suggestedActions: ['reconnect_ads', 'notify_client', 'check_permissions']
    },
    {
      name: 'kpi_drop',
      condition: (client, metrics) => {
        const recent = metrics.slice(-7);
        const previous = metrics.slice(-14, -7);
        const recentAvg = recent.reduce((sum, m) => sum + m.conversions, 0) / recent.length;
        const previousAvg = previous.reduce((sum, m) => sum + m.conversions, 0) / previous.length;
        return previousAvg > 0 && (previousAvg - recentAvg) / previousAvg > 0.2;
      },
      confidence: 0.8,
      severity: 'medium',
      suggestedActions: ['analyze_performance', 'draft_explanation', 'schedule_review']
    }
  ];

  async analyzeClient(client: Client): Promise<Alert[]> {
    const metrics = await this.getClientMetrics(client.id);
    const alerts: Alert[] = [];

    for (const rule of this.rules) {
      if (rule.condition(client, metrics)) {
        alerts.push({
          id: crypto.randomUUID(),
          agency_id: client.agency_id,
          client_id: client.id,
          type: rule.name,
          severity: rule.severity,
          title: this.generateAlertTitle(rule.name, client),
          description: this.generateAlertDescription(rule.name, client, metrics),
          suggested_actions: rule.suggestedActions,
          confidence: rule.confidence,
          status: 'active',
          metadata: { rule: rule.name, metrics_count: metrics.length },
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }

    return alerts;
  }
}
```

### Memory Integration with Mem0
```typescript
class CrossSessionMemory {
  private mem0: Mem0Client;

  async injectMemoryContext(query: string, userId: string, agencyId: string): Promise<string[]> {
    if (!this.shouldUseMemory(query)) return [];

    try {
      const memories = await this.mem0.search({
        query,
        user_id: `${agencyId}:${userId}`,
        limit: 5
      });

      return memories
        .filter(m => m.score > 0.7)
        .map(m => m.memory);
    } catch (error) {
      console.warn('Memory service unavailable, falling back to session-only');
      return [];
    }
  }

  async storeMemory(content: string, userId: string, agencyId: string): Promise<void> {
    try {
      await this.mem0.add({
        messages: [{ role: 'user', content }],
        user_id: `${agencyId}:${userId}`
      });
    } catch (error) {
      console.warn('Could not store memory:', error);
    }
  }

  private shouldUseMemory(query: string): boolean {
    return /remember|last time|previously|earlier|we discussed|you mentioned/i.test(query);
  }
}
```

### Self-Awareness Knowledge Base
```typescript
interface AppKnowledge {
  metrics: Record<string, MetricDefinition>;
  features: Record<string, FeatureDefinition>;
  capabilities: string[];
  integrations: IntegrationInfo[];
}

class AppKnowledgeService {
  private knowledge: AppKnowledge = {
    metrics: {
      roas: {
        name: 'Return on Ad Spend (ROAS)',
        description: 'Revenue generated per dollar spent on advertising',
        formula: 'Revenue ÷ Ad Spend',
        example: '$5 revenue ÷ $1 ad spend = 5.0 ROAS',
        goodValue: '> 4.0 for most industries'
      },
      cpa: {
        name: 'Cost Per Acquisition (CPA)',
        description: 'Average cost to acquire one customer',
        formula: 'Total Ad Spend ÷ Number of Conversions',
        example: '$100 spend ÷ 20 conversions = $5 CPA',
        goodValue: '< $50 for most e-commerce'
      }
    },
    features: {
      'client-pipeline': {
        name: 'Client Pipeline Management',
        description: 'Kanban board for tracking client lifecycle stages',
        howToUse: 'Drag clients between stages: Onboarding → Installation → Live',
        location: '/pipeline'
      }
    },
    capabilities: [
      'Answer questions about your clients and metrics',
      'Search through uploaded documents (SOPs, guides)',
      'Draft professional responses to client communications',
      'Detect risks and suggest proactive actions',
      'Remember our previous conversations',
      'Search the web for current information',
      'Explain app features and how to use them'
    ]
  };

  generateSystemPrompt(userContext?: { clientId?: string; agencyName?: string }): string {
    return `You are Chi, an AI assistant for AudienceOS Command Center.

CORE CAPABILITIES:
${this.knowledge.capabilities.map(c => `• ${c}`).join('\n')}

KEY METRICS YOU CAN EXPLAIN:
${Object.entries(this.knowledge.metrics).map(([key, metric]) =>
  `• ${metric.name}: ${metric.description}\n  Formula: ${metric.formula}\n  Good value: ${metric.goodValue}`
).join('\n')}

PLATFORM FEATURES:
${Object.entries(this.knowledge.features).map(([key, feature]) =>
  `• ${feature.name}: ${feature.description}`
).join('\n')}

CURRENT CONTEXT:
${userContext?.agencyName ? `Agency: ${userContext.agencyName}` : ''}
${userContext?.clientId ? `Active Client: ${userContext.clientId}` : ''}

Remember: Always be helpful, accurate, and honest about your limitations.`;
  }
}
```

---

## Testing Checklist

- [ ] Happy path: Risk alert generated and resolved successfully
- [ ] AI chat: Query routing works for all 5 route types (RAG/Web/Memory/Casual/Dashboard)
- [ ] Progressive reveal: Typing animation smooth at 40 chars/sec
- [ ] Document upload: PDF indexing completes with citations working
- [ ] Draft generation: Context-aware drafts include conversation history
- [ ] Memory system: Previous conversations recalled accurately
- [ ] Self-awareness: "What can you do?" returns complete capabilities list
- [ ] Citation system: Document references clickable and accurate
- [ ] Alert workflow: Approve/snooze/dismiss actions work correctly
- [ ] Token management: Rate limiting and queuing work properly
- [ ] Multi-tenant: Agency data isolation maintained in all AI features
- [ ] Error handling: Graceful degradation when AI services unavailable
- [ ] Mobile responsive: Chat widget usable on mobile devices
- [ ] Performance: RAG queries respond within 5 seconds
- [ ] Security: No sensitive data leaked in AI responses or logs

---

## Performance Considerations

### Token Budget Management
```typescript
class TokenBudgetManager {
  private readonly DAILY_LIMIT = 50000;

  async checkBudget(agencyId: string): Promise<{ allowed: boolean; remaining: number }> {
    const usage = await this.getTodayUsage(agencyId);
    return {
      allowed: usage < this.DAILY_LIMIT,
      remaining: Math.max(0, this.DAILY_LIMIT - usage)
    };
  }

  async recordUsage(agencyId: string, tokens: number, feature: string): Promise<void> {
    await supabase
      .from('ai_usage')
      .insert({
        agency_id: agencyId,
        tokens_used: tokens,
        feature,
        timestamp: new Date()
      });
  }
}
```

### Caching Strategy
- RAG responses cached for 1 hour per query
- Self-awareness responses cached indefinitely (until app updates)
- Memory searches cached for 5 minutes per user
- Document indexing cached until document updated
- Alert rules cached for 30 minutes

### Response Optimization
- Use Claude 3.5 Haiku for simple queries (<1s response)
- Use Claude 3.5 Sonnet for complex analysis (2-4s response)
- Stream responses for better perceived performance
- Implement request queuing during high load
- Use parallel processing for multiple AI services

---

## Dependencies

### Required for Implementation
- Claude API (chat, risk detection, draft generation)
- Gemini File Search (RAG and document indexing)
- Mem0 (cross-session memory storage)
- Exa API (web search capabilities)
- Supabase Realtime (alert notifications)

### Blocked By
- ALERT table with proper indexes and RLS policies
- CHAT_SESSION and CHAT_MESSAGE tables
- DOCUMENT table with Gemini integration
- AI usage tracking infrastructure
- Token budget management system

### Enables
- Proactive client management (early risk detection)
- Faster response times (AI drafts and suggestions)
- Knowledge management (document-based answers)
- Reduced support load (self-service AI help)
- Data-driven insights (pattern recognition)

---

## Success Metrics

- **Proactive Detection:** 80% of client risks flagged by AI before manual escalation
- **Response Speed:** 50% reduction in average response time with AI drafts
- **Alert Accuracy:** <15% false positive rate on critical alerts
- **User Adoption:** 70% of Account Managers use AI assistant weekly
- **Knowledge Utilization:** 60% of AI responses include document citations
- **Memory Effectiveness:** 40% of queries benefit from cross-session context
- **Self-Awareness Usage:** 30% of queries are about app features/capabilities
- **Token Efficiency:** <80% of daily budget used during peak usage

---

## Security & Privacy

### Data Protection
- All AI interactions logged for audit trails
- No sensitive client data in AI training sets
- Document encryption at rest in Supabase Storage
- Memory data scoped strictly by tenant + user

### API Security
```typescript
class AISecurityGuard {
  async validateQuery(query: string, context: ChatContext): Promise<boolean> {
    // Check for potential data exfiltration attempts
    if (this.containsSensitivePatterns(query)) {
      await this.logSecurityEvent(query, context.userId);
      return false;
    }

    // Validate user permissions for requested data
    if (!await this.checkDataAccess(context.userId, context.agencyId)) {
      return false;
    }

    return true;
  }

  private containsSensitivePatterns(query: string): boolean {
    const sensitivePatterns = [
      /password|secret|token|key/i,
      /sql|database|export.*all/i,
      /delete|drop|truncate/i
    ];

    return sensitivePatterns.some(pattern => pattern.test(query));
  }
}
```

### Content Filtering
- Real-time content moderation for AI responses
- Blocklist for inappropriate content generation
- User reporting system for AI misbehavior
- Regular audit of AI conversation logs

---

## Monitoring & Alerts

### Key Metrics Dashboard
- AI service uptime and response times
- Token consumption by feature and agency
- Alert accuracy (precision/recall metrics)
- User engagement with AI features
- Error rates by AI service (Claude, Gemini, Mem0)

### Critical Alerts
```yaml
ai_service_down:
  condition: error_rate > 10%
  window: 5m
  alert: PagerDuty

token_budget_exhausted:
  condition: usage > 90%
  window: 1h
  alert: Slack

alert_accuracy_drop:
  condition: false_positive_rate > 25%
  window: 24h
  alert: Email

response_time_degradation:
  condition: avg_response_time > 10s
  window: 15m
  alert: Slack
```

---

## Changelog

| Date | Change |
|------|--------|
| 2025-12-31 | Enhanced spec with complete implementation details, corrected user story numbers (US-017 to US-024), added comprehensive technical architecture |
| 2025-12-31 | Created initial spec from MVP-PRD and War Room migration plan |

---

*Living Document - Located at features/ai-intelligence-layer.md*