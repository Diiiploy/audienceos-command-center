# Phase 2 Implementation Plan: Cartridge Backend + Real Integrations

> **For Claude:** REQUIRED SUB-SKILL: Use `/ExecutingPlans` to implement this plan task-by-task.

**Goal:** Port cartridge backend from RevOS, implement Gmail/Slack sync, and replace all mock data with real integrations.

**Architecture:** Three parallel workstreams:
1. **Cartridge Backend** - Copy RevOS implementation with AudienceOS schema adjustments (database first, then API)
2. **Gmail Sync** - OAuth + thread-based ingestion with contact matching
3. **Slack Sync** - OAuth + channel message sync with user linking

**Tech Stack:** Next.js API routes, Supabase (RLS + Postgres), OAuth 2.0, Gemini 3 for content analysis

**Timeline:** 5 days (3 days cartridges, 2 days integrations + testing)

---

## Phase 2.1: Cartridge Backend Porting

### Task 1: Create Cartridges Database Schema

**Files:**
- Create: `supabase/migrations/016_cartridges_backend.sql`
- Modify: `types/database.ts` (add cartridge types)

**Why:** RevOS uses `cartridges` table with `agency_cartridges` junction table. AudienceOS needs same schema + RLS policies.

**Step 1: Create migration file**

```sql
-- Create cartridges table (main storage)
CREATE TABLE IF NOT EXISTS cartridges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- 'voice', 'brand', 'style', 'instructions'
  tier VARCHAR(20) NOT NULL DEFAULT 'agency', -- 'system', 'agency', 'client', 'user'
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,

  -- Ownership fields (one is set based on tier)
  client_id UUID REFERENCES client(id) ON DELETE CASCADE,
  user_id UUID REFERENCES "user"(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES cartridges(id) ON DELETE SET NULL,

  -- Voice cartridge fields
  voice_tone TEXT,
  voice_style TEXT,
  voice_personality TEXT,
  voice_vocabulary TEXT,

  -- Brand cartridge fields
  brand_name TEXT,
  brand_tagline TEXT,
  brand_values TEXT[],
  brand_logo_url TEXT,

  -- Style cartridge fields
  style_primary_color TEXT,
  style_secondary_color TEXT,
  style_fonts TEXT[],

  -- Instructions cartridge fields
  instructions_system_prompt TEXT,
  instructions_rules TEXT[],

  created_by UUID NOT NULL REFERENCES "user"(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_cartridges_agency ON cartridges(agency_id);
CREATE INDEX idx_cartridges_user ON cartridges(user_id);
CREATE INDEX idx_cartridges_client ON cartridges(client_id);
CREATE INDEX idx_cartridges_type ON cartridges(type);
CREATE INDEX idx_cartridges_tier ON cartridges(tier);
CREATE INDEX idx_cartridges_active ON cartridges(is_active) WHERE is_active = true;

-- Create unique constraint for default cartridges per type per agency
CREATE UNIQUE INDEX idx_cartridges_default
ON cartridges(agency_id, type)
WHERE is_default = true AND is_active = true;

-- Enable RLS
ALTER TABLE cartridges ENABLE ROW LEVEL SECURITY;

-- RLS Policy 1: Admins/Managers can see all cartridges in their agency
CREATE POLICY "agency_admins_see_all_cartridges"
  ON cartridges FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM "user"
      WHERE id = auth.uid()
        AND role IN ('admin')
    )
  );

-- RLS Policy 2: Members see only assigned client cartridges + user cartridges
CREATE POLICY "members_see_assigned_cartridges"
  ON cartridges FOR SELECT
  USING (
    (user_id = auth.uid()) OR
    (tier = 'agency' AND agency_id IN (
      SELECT agency_id FROM "user" WHERE id = auth.uid()
    )) OR
    (tier = 'client' AND client_id IN (
      SELECT id FROM client
      WHERE id IN (
        SELECT client_id FROM member_client_access
        WHERE user_id = auth.uid()
      )
    ))
  );

-- RLS Policy 3: Insert - only admins can create cartridges
CREATE POLICY "admins_create_cartridges"
  ON cartridges FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM "user"
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policy 4: Update - only admins can update
CREATE POLICY "admins_update_cartridges"
  ON cartridges FOR UPDATE
  USING (
    agency_id IN (
      SELECT agency_id FROM "user"
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policy 5: Delete - only admins can delete
CREATE POLICY "admins_delete_cartridges"
  ON cartridges FOR DELETE
  USING (
    agency_id IN (
      SELECT agency_id FROM "user"
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_cartridges_updated_at
  BEFORE UPDATE ON cartridges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

**Step 2: Add types to database.ts**

In `types/database.ts`, add after existing types:

```typescript
// Cartridges
export interface Cartridge {
  id: string
  agency_id: string
  name: string
  description?: string
  type: 'voice' | 'brand' | 'style' | 'instructions'
  tier: 'system' | 'agency' | 'client' | 'user'
  is_active: boolean
  is_default: boolean
  client_id?: string
  user_id?: string
  parent_id?: string

  // Voice
  voice_tone?: string
  voice_style?: string
  voice_personality?: string
  voice_vocabulary?: string

  // Brand
  brand_name?: string
  brand_tagline?: string
  brand_values?: string[]
  brand_logo_url?: string

  // Style
  style_primary_color?: string
  style_secondary_color?: string
  style_fonts?: string[]

  // Instructions
  instructions_system_prompt?: string
  instructions_rules?: string[]

  created_by: string
  created_at: string
  updated_at: string
}

export type CartridgeType = 'voice' | 'brand' | 'style' | 'instructions'
export type CartridgeTier = 'system' | 'agency' | 'client' | 'user'
```

**Step 3: Apply migration to Supabase**

Run: `npx supabase migration list` to verify no conflicts
Then: `npx supabase db push` (applies migration)

Expected output: Migration 016_cartridges_backend applied successfully

**Step 4: Verify schema in Supabase**

In Supabase Dashboard:
- Navigate to SQL Editor
- Run: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'cartridges' ORDER BY ordinal_position;`
- Expected: 30+ columns including all voice/brand/style/instructions fields

**Step 5: Commit**

```bash
git add supabase/migrations/016_cartridges_backend.sql types/database.ts
git commit -m "feat(db): add cartridges table with RLS policies"
```

---

### Task 2: Create Cartridges Store (Zustand)

**Files:**
- Create: `stores/cartridges-store.ts`
- Modify: `types/index.ts` (export store type)

**Why:** Frontend needs centralized state management for cartridge CRUD operations, filtering, and defaults selection.

**Step 1: Create store file**

```typescript
// stores/cartridges-store.ts
import { create } from 'zustand'
import { Cartridge, CartridgeType } from '@/types/database'

interface CartridgesStore {
  // State
  cartridges: Cartridge[]
  loading: boolean
  error: string | null
  selectedCartridgeId: string | null
  filterType: CartridgeType | 'all'

  // Actions
  fetchCartridges: (agencyId: string, filters?: { type?: CartridgeType }) => Promise<void>
  createCartridge: (data: Partial<Cartridge>) => Promise<Cartridge>
  updateCartridge: (id: string, data: Partial<Cartridge>) => Promise<void>
  deleteCartridge: (id: string) => Promise<void>
  setDefaultCartridge: (id: string, type: CartridgeType) => Promise<void>
  selectCartridge: (id: string | null) => void
  setFilterType: (type: CartridgeType | 'all') => void
  getSelectedCartridge: () => Cartridge | null
}

export const useCartridgesStore = create<CartridgesStore>((set, get) => ({
  cartridges: [],
  loading: false,
  error: null,
  selectedCartridgeId: null,
  filterType: 'all',

  fetchCartridges: async (agencyId: string, filters = {}) => {
    set({ loading: true, error: null })
    try {
      const params = new URLSearchParams({
        agency_id: agencyId,
        ...(filters.type && { type: filters.type }),
      })

      const response = await fetch(`/api/v1/cartridges?${params}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch cartridges')
      }

      const data = await response.json()
      set({ cartridges: data.data || [] })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      set({ error: message })
    } finally {
      set({ loading: false })
    }
  },

  createCartridge: async (data: Partial<Cartridge>) => {
    try {
      const response = await fetch('/api/v1/cartridges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to create cartridge')
      }

      const result = await response.json()
      const newCartridge = result.data

      set((state) => ({
        cartridges: [newCartridge, ...state.cartridges],
      }))

      return newCartridge
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      set({ error: message })
      throw error
    }
  },

  updateCartridge: async (id: string, data: Partial<Cartridge>) => {
    try {
      const response = await fetch(`/api/v1/cartridges/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error('Failed to update cartridge')
      }

      set((state) => ({
        cartridges: state.cartridges.map((c) =>
          c.id === id ? { ...c, ...data } : c
        ),
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      set({ error: message })
      throw error
    }
  },

  deleteCartridge: async (id: string) => {
    try {
      const response = await fetch(`/api/v1/cartridges/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to delete cartridge')
      }

      set((state) => ({
        cartridges: state.cartridges.filter((c) => c.id !== id),
        selectedCartridgeId:
          state.selectedCartridgeId === id ? null : state.selectedCartridgeId,
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      set({ error: message })
      throw error
    }
  },

  setDefaultCartridge: async (id: string, type: CartridgeType) => {
    try {
      const response = await fetch(`/api/v1/cartridges/${id}/set-default`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ type }),
      })

      if (!response.ok) {
        throw new Error('Failed to set default cartridge')
      }

      set((state) => ({
        cartridges: state.cartridges.map((c) => ({
          ...c,
          is_default: c.id === id && c.type === type ? true : false,
        })),
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      set({ error: message })
      throw error
    }
  },

  selectCartridge: (id: string | null) => {
    set({ selectedCartridgeId: id })
  },

  setFilterType: (type: CartridgeType | 'all') => {
    set({ filterType: type })
  },

  getSelectedCartridge: () => {
    const { cartridges, selectedCartridgeId } = get()
    if (!selectedCartridgeId) return null
    return cartridges.find((c) => c.id === selectedCartridgeId) || null
  },
}))
```

**Step 2: Add export to types/index.ts**

```typescript
export type { CartridgeType, CartridgeTier } from '@/types/database'
export type { Cartridge } from '@/types/database'
```

**Step 3: Write test file**

Create `__tests__/stores/cartridges-store.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react'
import { useCartridgesStore } from '@/stores/cartridges-store'

describe('cartridges-store', () => {
  beforeEach(() => {
    useCartridgesStore.setState({
      cartridges: [],
      loading: false,
      error: null,
      selectedCartridgeId: null,
    })
  })

  it('selects a cartridge', () => {
    const { result } = renderHook(() => useCartridgesStore())

    act(() => {
      result.current.selectCartridge('test-id')
    })

    expect(result.current.selectedCartridgeId).toBe('test-id')
  })

  it('filters cartridges by type', () => {
    const { result } = renderHook(() => useCartridgesStore())

    act(() => {
      result.current.setFilterType('voice')
    })

    expect(result.current.filterType).toBe('voice')
  })

  it('returns null when no cartridge selected', () => {
    const { result } = renderHook(() => useCartridgesStore())

    expect(result.current.getSelectedCartridge()).toBeNull()
  })
})
```

**Step 4: Run tests**

Run: `npm test -- cartridges-store.test.ts`
Expected: All 3 tests pass

**Step 5: Commit**

```bash
git add stores/cartridges-store.ts __tests__/stores/cartridges-store.test.ts types/index.ts
git commit -m "feat(stores): add cartridges store with CRUD operations"
```

---

### Task 3: Create Cartridges API Endpoints

**Files:**
- Create: `app/api/v1/cartridges/route.ts`
- Create: `app/api/v1/cartridges/[id]/route.ts`
- Create: `app/api/v1/cartridges/[id]/set-default/route.ts`

**Why:** Copy RevOS implementation with AudienceOS schema fields + RBAC middleware enforcement.

**Step 1: Create main cartridges endpoint**

```typescript
// app/api/v1/cartridges/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import withPermission from '@/lib/middleware/with-permission'

async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Build query
    let query = supabase
      .from('cartridges')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    // Apply filters
    const type = searchParams.get('type')
    const agencyId = searchParams.get('agency_id')
    const tier = searchParams.get('tier')

    if (type) query = query.eq('type', type)
    if (agencyId) query = query.eq('agency_id', agencyId)
    if (tier) query = query.eq('tier', tier)

    const { data: cartridges, error } = await query

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: cartridges || [],
      count: cartridges?.length || 0,
    })
  } catch (error) {
    console.error('Cartridges GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, type, tier, description, agency_id, client_id, voice_tone, voice_style, voice_personality, voice_vocabulary } = body

    // Validate required fields
    if (!name || !type) {
      return NextResponse.json(
        { error: 'name and type are required' },
        { status: 400 }
      )
    }

    // Validate type
    if (!['voice', 'brand', 'style', 'instructions'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type' },
        { status: 400 }
      )
    }

    const insertData: any = {
      name,
      description,
      type,
      tier: tier || 'agency',
      agency_id,
      created_by: user.id,
    }

    // Add tier-specific fields
    if (tier === 'client' && client_id) {
      insertData.client_id = client_id
    } else if (tier === 'user') {
      insertData.user_id = user.id
    }

    // Add voice fields
    if (voice_tone) insertData.voice_tone = voice_tone
    if (voice_style) insertData.voice_style = voice_style
    if (voice_personality) insertData.voice_personality = voice_personality
    if (voice_vocabulary) insertData.voice_vocabulary = voice_vocabulary

    const { error: createError } = await supabase
      .from('cartridges')
      .insert([insertData])

    if (createError) {
      console.error('Cartridge INSERT error:', createError)
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Cartridge created successfully',
    }, { status: 201 })
  } catch (error) {
    console.error('Cartridges POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export { GET, POST }
```

**Step 2: Create cartridge detail endpoint**

```typescript
// app/api/v1/cartridges/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { id } = params

    const { data: cartridge, error } = await supabase
      .from('cartridges')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !cartridge) {
      return NextResponse.json(
        { error: 'Cartridge not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: cartridge,
    })
  } catch (error) {
    console.error('Cartridge GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { id } = params
    const body = await request.json()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error: updateError } = await supabase
      .from('cartridges')
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Cartridge updated',
    })
  } catch (error) {
    console.error('Cartridge PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { id } = params

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error: deleteError } = await supabase
      .from('cartridges')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Cartridge deleted',
    })
  } catch (error) {
    console.error('Cartridge DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export { GET, PATCH, DELETE }
```

**Step 3: Create set-default endpoint**

```typescript
// app/api/v1/cartridges/[id]/set-default/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { id } = params
    const { type } = await request.json()

    if (!type) {
      return NextResponse.json(
        { error: 'type is required' },
        { status: 400 }
      )
    }

    // Get cartridge to find agency
    const { data: cartridge, error: getError } = await supabase
      .from('cartridges')
      .select('agency_id, type')
      .eq('id', id)
      .single()

    if (getError || !cartridge) {
      return NextResponse.json(
        { error: 'Cartridge not found' },
        { status: 404 }
      )
    }

    // Reset all defaults for this type in this agency
    await supabase
      .from('cartridges')
      .update({ is_default: false })
      .eq('agency_id', cartridge.agency_id)
      .eq('type', type)

    // Set this one as default
    const { error: updateError } = await supabase
      .from('cartridges')
      .update({ is_default: true })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Default cartridge set',
    })
  } catch (error) {
    console.error('Set default cartridge error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export { POST }
```

**Step 4: Write test file**

Create `__tests__/api/cartridges.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/v1/cartridges/route'
import { NextRequest } from 'next/server'

describe('Cartridges API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    const request = new NextRequest(new URL('http://localhost/api/v1/cartridges'))

    // Mock Supabase auth to return no user
    vi.mock('@/lib/supabase/server', () => ({
      createClient: vi.fn(() => ({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Unauthorized' },
          }),
        },
      })),
    }))

    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('validates required fields on POST', async () => {
    const request = new NextRequest(
      new URL('http://localhost/api/v1/cartridges'),
      {
        method: 'POST',
        body: JSON.stringify({}),
      }
    )

    const response = await POST(request)
    expect(response.status).toBe(400)
  })
})
```

**Step 5: Run tests**

Run: `npm test -- cartridges.test.ts`
Expected: Both tests pass

**Step 6: Commit**

```bash
git add app/api/v1/cartridges/ __tests__/api/cartridges.test.ts
git commit -m "feat(api): add cartridges endpoints (GET, POST, PATCH, DELETE, set-default)"
```

---

### Task 4: Create Voice Cartridge API

**Files:**
- Create: `app/api/v1/cartridges/voice/route.ts`
- Create: `app/api/v1/cartridges/voice/[id]/route.ts`

**Why:** RevOS has voice cartridge endpoints. Copy pattern for consistency and maintain feature parity.

**Step 1: Create voice cartridges list/create endpoint**

```typescript
// app/api/v1/cartridges/voice/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: cartridges, error } = await supabase
      .from('cartridges')
      .select('*')
      .eq('type', 'voice')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: cartridges || [],
    })
  } catch (error) {
    console.error('Voice cartridges GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, voice_tone, voice_style, voice_personality, voice_vocabulary, agency_id } = body

    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      )
    }

    const { error: insertError } = await supabase
      .from('cartridges')
      .insert([{
        name,
        type: 'voice',
        tier: 'agency',
        agency_id,
        voice_tone,
        voice_style,
        voice_personality,
        voice_vocabulary,
        created_by: user.id,
      }])

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Voice cartridge created',
    }, { status: 201 })
  } catch (error) {
    console.error('Voice cartridge POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export { GET, POST }
```

**Step 2: Create voice cartridge detail endpoint**

```typescript
// app/api/v1/cartridges/voice/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    const { data: cartridge, error } = await supabase
      .from('cartridges')
      .select('*')
      .eq('id', params.id)
      .eq('type', 'voice')
      .single()

    if (error || !cartridge) {
      return NextResponse.json(
        { error: 'Voice cartridge not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: cartridge,
    })
  } catch (error) {
    console.error('Voice cartridge GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { error: updateError } = await supabase
      .from('cartridges')
      .update(body)
      .eq('id', params.id)
      .eq('type', 'voice')

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Voice cartridge updated',
    })
  } catch (error) {
    console.error('Voice cartridge PATCH error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    const { error: deleteError } = await supabase
      .from('cartridges')
      .delete()
      .eq('id', params.id)
      .eq('type', 'voice')

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Voice cartridge deleted',
    })
  } catch (error) {
    console.error('Voice cartridge DELETE error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export { GET, PATCH, DELETE }
```

**Step 3: Write test file**

Create `__tests__/api/cartridges-voice.test.ts` with basic tests for create, read, update, delete.

**Step 4: Run tests**

Run: `npm test -- cartridges-voice.test.ts`
Expected: All tests pass

**Step 5: Commit**

```bash
git add app/api/v1/cartridges/voice/ __tests__/api/cartridges-voice.test.ts
git commit -m "feat(api): add voice cartridge endpoints"
```

---

### Task 5: Create Brand, Style, Instructions Cartridge Endpoints

**Files:**
- Create: `app/api/v1/cartridges/brand/route.ts`
- Create: `app/api/v1/cartridges/brand/[id]/route.ts`
- Create: `app/api/v1/cartridges/style/route.ts`
- Create: `app/api/v1/cartridges/style/[id]/route.ts`
- Create: `app/api/v1/cartridges/instructions/route.ts`
- Create: `app/api/v1/cartridges/instructions/[id]/route.ts`

**Why:** Complete the cartridge backend with all four types.

**Pattern:** Follow same structure as voice cartridges (GET list, POST create, GET [id], PATCH, DELETE).

**Implementation Approach:**
- Use code generation/templating to avoid repetition
- Each type has type-specific fields (brand_name, brand_logo_url, etc.)
- Validation for required fields per type

**Step 1-3: Create all 6 files following voice pattern**

Each file follows the voice cartridge pattern but with type-specific fields:
- `brand`: brand_name, brand_tagline, brand_values, brand_logo_url
- `style`: style_primary_color, style_secondary_color, style_fonts
- `instructions`: instructions_system_prompt, instructions_rules

**Step 4: Run all tests**

Run: `npm test -- cartridges`
Expected: All cartridge tests pass (50+ tests total)

**Step 5: Commit**

```bash
git add app/api/v1/cartridges/brand/ app/api/v1/cartridges/style/ app/api/v1/cartridges/instructions/ __tests__/api/cartridges-*.test.ts
git commit -m "feat(api): add brand, style, instructions cartridge endpoints"
```

---

## Phase 2.2: Gmail Sync Integration

### Task 6: Create Gmail OAuth Flow

**Files:**
- Create: `app/api/v1/integrations/gmail/authorize/route.ts`
- Create: `app/api/v1/integrations/gmail/callback/route.ts`
- Modify: `lib/integrations/gmail-service.ts` (new file)

**Why:** Enable agencies to connect Gmail accounts for email thread syncing.

**Step 1: Create Gmail authorization endpoint**

```typescript
// app/api/v1/integrations/gmail/authorize/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = process.env.GOOGLE_CLIENT_ID
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/integrations/gmail/callback`
    const scope = 'https://www.googleapis.com/auth/gmail.readonly'

    const state = Buffer.from(JSON.stringify({
      userId: user.id,
      timestamp: Date.now(),
    })).toString('base64')

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.append('client_id', clientId!)
    authUrl.searchParams.append('redirect_uri', redirectUri)
    authUrl.searchParams.append('response_type', 'code')
    authUrl.searchParams.append('scope', scope)
    authUrl.searchParams.append('state', state)
    authUrl.searchParams.append('access_type', 'offline')

    return NextResponse.redirect(authUrl.toString())
  } catch (error) {
    console.error('Gmail authorize error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

**Step 2: Create Gmail callback endpoint**

```typescript
// app/api/v1/integrations/gmail/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encrypt } from '@/lib/crypto'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/settings/integrations?error=invalid_params', request.url)
      )
    }

    // Decode state
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
    const userId = stateData.userId

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/integrations/gmail/callback`,
      }),
    })

    const tokens = await tokenResponse.json()

    if (!tokens.access_token) {
      return NextResponse.redirect(
        new URL('/settings/integrations?error=token_exchange_failed', request.url)
      )
    }

    // Encrypt and store tokens
    const encryptedAccessToken = encrypt(tokens.access_token)
    const encryptedRefreshToken = tokens.refresh_token ? encrypt(tokens.refresh_token) : null

    const { error: insertError } = await supabase
      .from('integration')
      .upsert({
        user_id: userId,
        type: 'gmail',
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        is_connected: true,
        last_sync_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,type',
      })

    if (insertError) {
      console.error('Integration INSERT error:', insertError)
      return NextResponse.redirect(
        new URL('/settings/integrations?error=storage_failed', request.url)
      )
    }

    // Trigger initial sync
    await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/v1/integrations/gmail/sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    })

    return NextResponse.redirect(
      new URL('/settings/integrations?success=gmail_connected', request.url)
    )
  } catch (error) {
    console.error('Gmail callback error:', error)
    return NextResponse.redirect(
      new URL('/settings/integrations?error=callback_failed', request.url)
    )
  }
}
```

**Step 3: Create Gmail service**

```typescript
// lib/integrations/gmail-service.ts
import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'
import { decrypt } from '@/lib/crypto'

const gmail = google.gmail('v1')

export class GmailService {
  static async syncEmails(userId: string, agencyId: string) {
    try {
      const supabase = await createClient()

      // Get user's Gmail tokens
      const { data: integration, error } = await supabase
        .from('integration')
        .select('access_token, refresh_token')
        .eq('user_id', userId)
        .eq('type', 'gmail')
        .single()

      if (error || !integration) {
        throw new Error('Gmail not connected')
      }

      const accessToken = decrypt(integration.access_token)
      const refreshToken = integration.refresh_token ? decrypt(integration.refresh_token) : null

      // Create authenticated client
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/integrations/gmail/callback`
      )

      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      // Get email threads
      const res = await gmail.users.threads.list({
        auth: oauth2Client,
        userId: 'me',
        maxResults: 50,
      })

      const threads = res.data.threads || []

      // For each thread, extract messages and match to clients
      for (const thread of threads) {
        if (!thread.id) continue

        const threadData = await gmail.users.threads.get({
          auth: oauth2Client,
          userId: 'me',
          id: thread.id,
        })

        const messages = threadData.data.messages || []

        // Extract participant emails
        for (const message of messages) {
          const headers = message.payload?.headers || []
          const fromHeader = headers.find((h) => h.name === 'From')
          const toHeader = headers.find((h) => h.name === 'To')

          if (!fromHeader) continue

          // Match email to client
          const fromEmail = fromHeader.value!.toLowerCase()

          // Find client by email
          const { data: client } = await supabase
            .from('client')
            .select('id')
            .eq('agency_id', agencyId)
            .ilike('contact_email', fromEmail)
            .single()

          if (client) {
            // Store communication
            await supabase
              .from('communication')
              .upsert({
                client_id: client.id,
                type: 'email',
                channel: 'gmail',
                external_id: message.id,
                subject: headers.find((h) => h.name === 'Subject')?.value,
                content: message.payload?.body?.data,
                from_email: fromEmail,
                to_email: toHeader?.value,
                created_at: new Date(parseInt(message.internalDate || 0)).toISOString(),
              }, {
                onConflict: 'external_id,channel',
              })
          }
        }
      }

      // Update last sync time
      await supabase
        .from('integration')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('type', 'gmail')

      return { success: true, synced: threads.length }
    } catch (error) {
      console.error('Gmail sync error:', error)
      throw error
    }
  }
}
```

**Step 4: Write test file**

Create `__tests__/api/integrations-gmail.test.ts` with basic tests.

**Step 5: Run tests**

Run: `npm test -- integrations-gmail`
Expected: All tests pass

**Step 6: Commit**

```bash
git add app/api/v1/integrations/gmail/ lib/integrations/gmail-service.ts __tests__/api/integrations-gmail.test.ts
git commit -m "feat(integrations): add Gmail OAuth flow and sync service"
```

---

### Task 7: Create Gmail Sync Endpoint

**Files:**
- Create: `app/api/v1/integrations/gmail/sync/route.ts`

**Why:** Trigger manual Gmail sync on demand.

**Step 1-2: Create sync endpoint and tests**

```typescript
// app/api/v1/integrations/gmail/sync/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { GmailService } from '@/lib/integrations/gmail-service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's agency
    const { data: userRecord } = await supabase
      .from('user')
      .select('agency_id')
      .eq('id', user.id)
      .single()

    if (!userRecord) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Sync emails
    const result = await GmailService.syncEmails(user.id, userRecord.agency_id)

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('Gmail sync error:', error)
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    )
  }
}
```

**Step 3-5: Test and commit**

Run tests, verify, commit.

---

## Phase 2.3: Slack Sync Integration

**Pattern:** Follow same approach as Gmail:
1. Create OAuth authorize endpoint
2. Create OAuth callback endpoint
3. Create Slack service for syncing
4. Create sync endpoint

**Files:**
- `app/api/v1/integrations/slack/authorize/route.ts`
- `app/api/v1/integrations/slack/callback/route.ts`
- `lib/integrations/slack-service.ts`
- `app/api/v1/integrations/slack/sync/route.ts`
- Tests in `__tests__/api/integrations-slack.test.ts`

**Scope:** List channels, sync messages, match to clients via email/name.

---

## Phase 2.4: Integration Testing & Cleanup

### Task 8: Replace Mock Data with Real Data

**Files:**
- Modify: `app/page.tsx` (remove mock client data)
- Modify: `stores/pipeline-store.ts` (use real API)
- Delete: All seed data generation in database seed scripts

**Why:** Transition from mock → real data flow.

---

## Execution Summary

**Total Tasks:** 8 major tasks
**Estimated Time:** 5 days
- **Day 1-2:** Cartridge backend (database + 4 endpoint types)
- **Day 3:** Gmail sync (OAuth + sync service)
- **Day 4:** Slack sync (OAuth + sync service)
- **Day 5:** Integration testing + cleanup

**Test Coverage:** 70+ new tests across all features
**Build Time:** ~5 seconds
**Production Deploy:** Vercel auto-deploy on main push

---

## Success Criteria

✅ All cartridge CRUD operations working
✅ Voice, Brand, Style, Instructions endpoints tested
✅ Gmail OAuth flow completes
✅ Gmail emails sync to communications table
✅ Slack OAuth flow completes
✅ Slack messages sync to communications table
✅ No mock data in production (all real)
✅ 90+ new tests all passing
✅ Build succeeds with 0 TypeScript errors
✅ Production deployment clean

---

**Plan saved to:** `docs/plans/2026-01-16-phase-2-implementation.md`

**Next:** Ready for execution via `/ExecutingPlans` or parallel session.
