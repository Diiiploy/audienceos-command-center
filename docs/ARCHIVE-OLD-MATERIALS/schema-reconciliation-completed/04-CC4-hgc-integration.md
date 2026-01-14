# CC4: HGC Real Integration (RUNTIME VERIFIED)

> **Time:** 3 hours
> **Dependencies:** CC2 and CC3 complete
> **Output:** Updated HGC functions with real Supabase queries
> **Confidence:** 8/10

---

## Context

You are replacing mock data with real Supabase queries in Holy Grail Chat functions.

**Runtime Verification Applied:**
1. Use `agency_id` from JWT claims (NOT tenant_id)
2. Query actual RevOS tables (clients, communications, etc.)
3. Use client-scoped queries for AudienceOS tables
4. RLS handles agency isolation automatically

---

## Environment Setup

Update HGC `.env` to point to RevOS Supabase:

```bash
# RevOS Supabase (unified backend)
NEXT_PUBLIC_SUPABASE_URL=https://trdoainmejxanrownbuz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from RevOS>
SUPABASE_SERVICE_ROLE_KEY=<from RevOS>
```

---

## Updated Function Implementations

### Supabase Client (Simplified)

```typescript
// src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// For server-side with user's JWT (passes agency context automatically)
export function createServerClient(accessToken: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  });
}
```

### get_clients (Agency-scoped via RLS)

```typescript
// src/lib/functions/clients.ts
import { createServerClient } from '../supabase/client';

interface ClientSummary {
  id: string;
  name: string;
  industry: string | null;
  healthStatus: 'green' | 'yellow' | 'red' | null;
  stage: string | null;
}

export async function get_clients(
  accessToken: string,
  filters?: { health_status?: string; industry?: string }
): Promise<ClientSummary[]> {
  const supabase = createServerClient(accessToken);

  // RLS automatically filters to user's agency via JWT agency_id
  let query = supabase
    .from('clients')
    .select('id, name, industry, health_status, stage');

  if (filters?.health_status) {
    query = query.eq('health_status', filters.health_status);
  }
  if (filters?.industry) {
    query = query.ilike('industry', `%${filters.industry}%`);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map(c => ({
    id: c.id,
    name: c.name,
    industry: c.industry,
    healthStatus: c.health_status,
    stage: c.stage
  }));
}
```

### get_alerts (Agency-scoped via agency_id column)

```typescript
// src/lib/functions/alerts.ts
import { createServerClient } from '../supabase/client';

export async function get_alerts(
  accessToken: string,
  filters?: { severity?: string; status?: string }
): Promise<Alert[]> {
  const supabase = createServerClient(accessToken);

  // RLS filters by agency_id from JWT automatically
  let query = supabase
    .from('alerts')
    .select(`
      id,
      severity,
      status,
      title,
      description,
      created_at,
      client:clients(id, name)
    `)
    .order('created_at', { ascending: false });

  if (filters?.severity) {
    query = query.eq('severity', filters.severity);
  }
  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}
```

### get_agency_stats (Aggregate from agency-scoped tables)

```typescript
// src/lib/functions/stats.ts
import { createServerClient } from '../supabase/client';

interface AgencyStats {
  totalClients: number;
  atRiskClients: number;
  openAlerts: number;
  recentCommunications: number;
}

export async function get_agency_stats(accessToken: string): Promise<AgencyStats> {
  const supabase = createServerClient(accessToken);

  // RLS filters all queries to user's agency automatically
  const [
    clientsResult,
    atRiskResult,
    alertsResult,
    commsResult
  ] = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('clients').select('*', { count: 'exact', head: true })
      .eq('health_status', 'red'),
    supabase.from('alerts').select('*', { count: 'exact', head: true })
      .eq('status', 'open'),
    supabase.from('communications').select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
  ]);

  return {
    totalClients: clientsResult.count || 0,
    atRiskClients: atRiskResult.count || 0,
    openAlerts: alertsResult.count || 0,
    recentCommunications: commsResult.count || 0
  };
}
```

### get_recent_communications (Client-scoped)

```typescript
// src/lib/functions/communications.ts
import { createServerClient } from '../supabase/client';

export async function get_recent_communications(
  accessToken: string,
  clientId?: string,
  limit: number = 10
): Promise<Communication[]> {
  const supabase = createServerClient(accessToken);

  // RLS filters by agency_id automatically
  let query = supabase
    .from('communications')
    .select(`
      id,
      type,
      direction,
      subject,
      body,
      timestamp,
      client:clients(id, name)
    `)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (clientId) {
    query = query.eq('client_id', clientId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}
```

### get_cartridges (Agency-scoped OR User-scoped)

```typescript
// src/lib/functions/cartridges.ts
import { createServerClient } from '../supabase/client';

type CartridgeType = 'style' | 'preference' | 'instruction' | 'brand';

// Get agency-level cartridge (default for team)
export async function get_agency_cartridge(
  accessToken: string,
  type: CartridgeType
): Promise<AgencyCartridge | null> {
  const supabase = createServerClient(accessToken);

  const { data, error } = await supabase
    .from('agency_cartridges')
    .select('*')
    .eq('type', type)
    .eq('is_default', true)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

  return data;
}

// Get user's personal cartridge (falls back to agency default)
export async function get_cartridge(
  accessToken: string,
  type: CartridgeType
): Promise<Cartridge | null> {
  const supabase = createServerClient(accessToken);

  // First try user's personal cartridge
  const tableMap: Record<CartridgeType, string> = {
    style: 'style_cartridges',
    preference: 'preference_cartridges',
    instruction: 'instruction_cartridges',
    brand: 'brand_cartridges'
  };

  const { data: userCartridge, error: userError } = await supabase
    .from(tableMap[type])
    .select('*')
    .single();

  if (userCartridge) return userCartridge;

  // Fall back to agency default
  return get_agency_cartridge(accessToken, type);
}

// Get all agency cartridges
export async function get_all_agency_cartridges(
  accessToken: string
): Promise<AgencyCartridge[]> {
  const supabase = createServerClient(accessToken);

  const { data, error } = await supabase
    .from('agency_cartridges')
    .select('*')
    .order('type');

  if (error) throw error;

  return data || [];
}
```

---

## API Route Update

```typescript
// app/api/chat/route.ts
import { createServerClient } from '@/lib/supabase/client';

export async function POST(req: Request) {
  const authHeader = req.headers.get('Authorization');
  const accessToken = authHeader?.replace('Bearer ', '');

  if (!accessToken) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // All function calls just pass the accessToken
  // RLS handles agency isolation automatically via JWT agency_id
  const clients = await get_clients(accessToken);
  const stats = await get_agency_stats(accessToken);

  // ... rest of chat logic
}
```

---

## Tasks

1. [ ] Verify CC2 and CC3 complete (tables exist, RLS works)
2. [ ] Update `.env` with RevOS Supabase credentials
3. [ ] Create simplified Supabase client
4. [ ] Update `get_clients` - query actual clients table
5. [ ] Update `get_alerts` - query new alerts table
6. [ ] Update `get_agency_stats` - aggregate from actual tables
7. [ ] Update `get_recent_communications` - query new communications table
8. [ ] Add `get_cartridges` function (agency + user fallback)
9. [ ] Update API route to pass accessToken
10. [ ] Test all functions end-to-end

---

## Testing

```typescript
// Quick test script
const accessToken = 'user-jwt-token-with-agency_id-in-app_metadata';

console.log('Testing get_clients...');
const clients = await get_clients(accessToken);
console.log(`Found ${clients.length} clients`);

console.log('Testing get_alerts...');
const alerts = await get_alerts(accessToken, { status: 'open' });
console.log(`Found ${alerts.length} open alerts`);

console.log('Testing get_agency_stats...');
const stats = await get_agency_stats(accessToken);
console.log(`Stats: ${JSON.stringify(stats)}`);

console.log('Testing get_cartridges...');
const brandCartridge = await get_cartridge(accessToken, 'brand');
console.log(`Brand cartridge: ${brandCartridge?.name || 'none'}`);
```

---

## Success Criteria

- [ ] No mock data in production code
- [ ] No `setTenantContext()` or SET calls
- [ ] All functions use `agency_id` from JWT
- [ ] All functions return real data from RevOS Supabase
- [ ] RLS automatically filters to user's agency
- [ ] Cartridge fallback works (user → agency)
- [ ] Error handling for empty states

---

## Output Location

```
/Users/rodericandrews/_PAI/projects/holy-grail-chat/src/lib/supabase/client.ts
/Users/rodericandrews/_PAI/projects/holy-grail-chat/src/lib/functions/*.ts
```

---

*Runtime Verified: 2026-01-03 | Uses agency_id pattern from actual RevOS*
