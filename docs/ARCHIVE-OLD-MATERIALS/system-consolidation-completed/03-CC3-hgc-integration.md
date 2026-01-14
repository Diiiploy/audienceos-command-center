# CC3: Holy Grail Chat Integration

**Manifest:** [00-MANIFEST.md](./00-MANIFEST.md)
**Status:** ⬜ Pending
**Dependencies:** CC1 complete
**Branch:** `feat/hgc-integration`
**Effort:** 4 hours

---

## Context

Integrate Holy Grail Chat (HGC) backend into AudienceOS:
- Smart Router (5 categories)
- Gemini-based chat service
- Function calling (6 functions)
- RAG integration

HGC is already built and tested at 9.5/10 confidence. This is about wiring it into AudienceOS UI, not rebuilding.

**Source:** `/holy-grail-chat/src/lib/`
**Target:** `/Users/rodericandrews/_PAI/projects/command_center_audience_OS/lib/chat/`

---

## Prerequisites

Before starting:
- [ ] CC1 complete (nav restructure done)
- [ ] HGC project accessible at `/Users/rodericandrews/_PAI/projects/holy-grail-chat/`
- [ ] Run: `git checkout feat/nav-restructure && git checkout -b feat/hgc-integration`

---

## Tasks

### Task 1: Create Chat Directory Structure

**Goal:** Set up lib/chat folder

```bash
mkdir -p lib/chat/functions
mkdir -p lib/chat/routes
mkdir -p components/chat
```

**Structure:**
```
lib/chat/
├── index.ts              # Main exports
├── service.ts            # Chat service
├── router.ts             # Smart router
├── types.ts              # Chat types
├── functions/            # Function executors
│   ├── index.ts
│   ├── get-clients.ts
│   ├── get-alerts.ts
│   ├── get-stats.ts
│   ├── get-communications.ts
│   └── navigate-to.ts
└── routes/               # Route handlers
    ├── rag.ts
    ├── web.ts
    ├── memory.ts
    ├── dashboard.ts
    └── casual.ts
```

---

### Task 2: Port Chat Types

**Goal:** Extract TypeScript types from HGC

**Source:** `holy-grail-chat/src/lib/chat/types.ts` (or inline in service.ts)

**File:** `lib/chat/types.ts`

```typescript
// lib/chat/types.ts

export type RouteCategory = 'rag' | 'web' | 'memory' | 'dashboard' | 'casual';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    route?: RouteCategory;
    citations?: Citation[];
    functionCalls?: FunctionCall[];
  };
}

export interface Citation {
  source: string;
  title: string;
  excerpt: string;
  url?: string;
}

export interface FunctionCall {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
}

export interface ChatSession {
  id: string;
  agencyId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RouterDecision {
  category: RouteCategory;
  confidence: number;
  reasoning?: string;
}

export interface ChatServiceConfig {
  agencyId: string;
  userId: string;
  geminiApiKey: string;
  mem0ApiKey?: string;
}
```

---

### Task 3: Port Smart Router

**Goal:** Port the 5-category smart router

**Source:** `holy-grail-chat/src/lib/chat/router.ts` (or equivalent)

**File:** `lib/chat/router.ts`

```typescript
// lib/chat/router.ts

import { RouteCategory, RouterDecision } from './types';

const ROUTER_PROMPT = `You are a query classifier. Classify the user's message into one of these categories:

1. RAG - Questions about client data, documents, knowledge base
2. WEB - Questions needing current web information
3. MEMORY - Questions about past conversations or preferences
4. DASHBOARD - Requests to view/navigate to specific data (clients, alerts, stats)
5. CASUAL - General conversation, greetings, or unclear intent

Respond with ONLY the category name in uppercase.`;

export async function routeQuery(
  query: string,
  geminiApiKey: string
): Promise<RouterDecision> {
  // Call Gemini for classification
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${ROUTER_PROMPT}\n\nQuery: ${query}` }] }
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 10,
        },
      }),
    }
  );

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase();

  const categoryMap: Record<string, RouteCategory> = {
    rag: 'rag',
    web: 'web',
    memory: 'memory',
    dashboard: 'dashboard',
    casual: 'casual',
  };

  const category = categoryMap[text] || 'casual';

  return {
    category,
    confidence: category === 'casual' ? 0.5 : 0.9,
  };
}
```

---

### Task 4: Port Function Executors

**Goal:** Port the 6 dashboard functions from HGC

**Source:** `holy-grail-chat/src/lib/functions/`

**Files to create:**

```typescript
// lib/chat/functions/get-clients.ts
export async function getClients(args: {
  healthStatus?: 'red' | 'yellow' | 'green';
  industry?: string;
  limit?: number;
}, agencyId: string) {
  // Query Supabase with RLS
  // Return client list
}

// lib/chat/functions/get-alerts.ts
export async function getAlerts(args: {
  severity?: 'high' | 'medium' | 'low';
  status?: 'open' | 'resolved';
}, agencyId: string) {
  // Query alerts table
}

// lib/chat/functions/get-stats.ts
export async function getAgencyStats(agencyId: string) {
  // Return dashboard summary
}

// lib/chat/functions/get-communications.ts
export async function getRecentCommunications(args: {
  clientId?: string;
  channel?: 'email' | 'slack';
  limit?: number;
}, agencyId: string) {
  // Query communications
}

// lib/chat/functions/navigate-to.ts
export function navigateTo(args: {
  page: string;
  params?: Record<string, string>;
}) {
  // Return URL for navigation
}
```

---

### Task 5: Create Chat Service

**Goal:** Main chat service that orchestrates routing and responses

**File:** `lib/chat/service.ts`

```typescript
// lib/chat/service.ts

import { routeQuery } from './router';
import { ChatMessage, ChatServiceConfig, RouterDecision } from './types';
import { handleDashboardRoute } from './routes/dashboard';
import { handleRagRoute } from './routes/rag';
import { handleCasualRoute } from './routes/casual';

export class ChatService {
  private config: ChatServiceConfig;

  constructor(config: ChatServiceConfig) {
    this.config = config;
  }

  async processMessage(userMessage: string, history: ChatMessage[]): Promise<ChatMessage> {
    // 1. Route the query
    const decision = await routeQuery(userMessage, this.config.geminiApiKey);

    // 2. Handle based on route
    let response: string;
    let metadata: ChatMessage['metadata'] = { route: decision.category };

    switch (decision.category) {
      case 'dashboard':
        const dashResult = await handleDashboardRoute(userMessage, this.config);
        response = dashResult.response;
        metadata.functionCalls = dashResult.functionCalls;
        break;

      case 'rag':
        const ragResult = await handleRagRoute(userMessage, this.config);
        response = ragResult.response;
        metadata.citations = ragResult.citations;
        break;

      case 'casual':
      default:
        response = await handleCasualRoute(userMessage, history, this.config);
        break;
    }

    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: response,
      timestamp: new Date(),
      metadata,
    };
  }
}
```

---

### Task 6: Create Chat UI Component

**Goal:** Chat interface for Intelligence Center

**File:** `components/chat/chat-interface.tsx`

```typescript
"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Loader2 } from "lucide-react"
import { ChatMessage } from "@/lib/chat/types"

interface ChatInterfaceProps {
  agencyId: string;
}

export function ChatInterface({ agencyId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          history: messages,
          agencyId,
        }),
      });

      const data = await response.json();
      setMessages(prev => [...prev, data.message]);
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-[600px] border border-border rounded-lg">
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about clients, data, or anything..."
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
```

---

### Task 7: Create API Route

**Goal:** API endpoint for chat

**File:** `app/api/chat/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { ChatService } from '@/lib/chat/service';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { message, history, agencyId } = body;

  const chatService = new ChatService({
    agencyId,
    userId: user.id,
    geminiApiKey: process.env.GOOGLE_AI_API_KEY!,
    mem0ApiKey: process.env.MEM0_API_KEY,
  });

  try {
    const response = await chatService.processMessage(message, history);
    return NextResponse.json({ message: response });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}
```

---

### Task 8: Wire Into Intelligence Center

**Goal:** Add chat to Intelligence Center

**File:** `components/views/intelligence-center.tsx`

```typescript
import { ChatInterface } from "@/components/chat/chat-interface"

// In the component:
{activeSection === "chat" && (
  <SettingsContentSection title="Chat">
    <ChatInterface agencyId={agencyId} />
  </SettingsContentSection>
)}
```

---

### Task 9: Commit and Push

```bash
git add lib/chat/
git add components/chat/
git add app/api/chat/
git add components/views/intelligence-center.tsx
git commit -m "feat(chat): integrate Holy Grail Chat backend

- Smart Router (5 categories: rag, web, memory, dashboard, casual)
- Function executors (6 functions)
- Chat service with Gemini integration
- Chat UI component
- API route for chat

Ported from HGC with 9.5/10 confidence rating.

Part of: 3-System Consolidation"

git push origin feat/hgc-integration
```

---

## Output When Complete

```
CC3 COMPLETE
- Task 1: ✓ Created chat directory structure
- Task 2: ✓ Ported chat types
- Task 3: ✓ Ported smart router
- Task 4: ✓ Ported 6 function executors
- Task 5: ✓ Created chat service
- Task 6: ✓ Created chat UI component
- Task 7: ✓ Created API route
- Task 8: ✓ Wired into Intelligence Center
- Task 9: ✓ Committed and pushed
- Branch: feat/hgc-integration
- Ready for: Merge with CC2, then CC4
```

---

## Recovery

If resuming:
1. Check branch: `git branch | grep hgc`
2. Check which files exist in `lib/chat/`
3. Resume from first missing file
4. Test chat in browser after wiring

---

*Part of 3-System Consolidation - See 00-MANIFEST.md*
