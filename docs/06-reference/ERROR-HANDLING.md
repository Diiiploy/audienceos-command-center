# Error Handling Architecture

**Last Updated:** 2026-01-04
**Related Commit:** `a12dea2 - fix: add error state display for Pipeline API failures`
**Status:** ✅ Implemented & Tested

---

## Overview

The application implements a three-layer error handling strategy:
1. **API Layer** - Capture errors from Supabase/RLS failures
2. **Store Layer** - Propagate errors through Zustand state
3. **UI Layer** - Display errors to users with retry options

**Critical Principle:** Never show empty states for API failures. Always show explicit error messages.

---

## The Problem We Fixed

### Before (Silent Failure)
```
API fails (401) → Store sets error=null → Component shows empty kanban "No clients"
User is confused: Are there no clients? Is data loading? Is something broken?
```

### After (Explicit Error)
```
API fails (401) → Store sets error="Failed to fetch clients" → UI shows:
  ⚠️ Failed to load clients
  Failed to fetch clients. Please check your connection and try again.
  [Retry]
```

---

## Architecture Layers

### 1. Store Layer (`stores/pipeline-store.ts`)

The pipeline store handles API errors and propagates them to the UI:

```typescript
interface PipelineState {
  clients: Client[]
  isLoading: boolean
  error: string | null  // ← Error message (null = no error)
}

// fetchClients method:
fetchClients: async () => {
  set({ isLoading: true, error: null })  // Clear old error

  try {
    const response = await fetch('/api/v1/clients')

    if (!response.ok) {
      throw new Error('Failed to fetch clients')  // ← Non-200 status
    }

    const { data } = await response.json()
    set({ clients, isLoading: false })
  } catch (error) {
    set({
      error: error instanceof Error ? error.message : 'Failed to fetch clients',
      isLoading: false
    })
  }
}
```

**Error Types Handled:**
| Error | Source | Message |
|-------|--------|---------|
| 401 Unauthorized | Supabase RLS | "Failed to fetch clients" |
| 403 Forbidden | Supabase RLS | "Failed to fetch clients" |
| 500 Server Error | Backend | "Failed to fetch clients" |
| Network Error | Fetch | "Network error" / "Failed to fetch" |
| CORS Error | Browser | "Failed to fetch" |

### 2. Component Layer (`app/page.tsx`)

The page component uses the store and conditionally renders three states:

```typescript
const { clients: storeClients, fetchClients, isLoading, error: apiError } = usePipelineStore()

// Three mutually-exclusive renders:

{/* STATE 1: Loading */}
{isLoading && (
  <div className="flex-1 flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
  </div>
)}

{/* STATE 2: Error */}
{apiError && !isLoading && (
  <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
    <div className="flex items-center gap-2 text-destructive">
      <AlertCircle className="h-5 w-5" />
      <span className="font-medium">Failed to load clients</span>
    </div>
    <p className="text-sm text-muted-foreground text-center max-w-md">
      {apiError}. Please check your connection and try again.
    </p>
    <Button variant="outline" size="sm" onClick={() => fetchClients()}>
      Retry
    </Button>
  </div>
)}

{/* STATE 3: Content */}
{!isLoading && !apiError && (
  <>
    {viewMode === "board" ? (
      <KanbanBoard clients={filteredClients} ... />
    ) : (
      <div className="flex-1 overflow-y-auto">
        {filteredClients.map((client) => (
          <ClientRow ... />
        ))}
      </div>
    )}
  </>
)}
```

**Key Design:**
- Three states are mutually exclusive (only one renders)
- Error condition: `apiError && !isLoading`
- User can retry by clicking button → calls `fetchClients()` again
- Retry clears error and sets `isLoading=true`

---

## State Machine

```
┌──────────────────────────────────────┐
│   Initial State                      │
│ isLoading=false, error=null          │
│ clients=[]                           │
└──────────────┬───────────────────────┘
               │
               ├─→ User navigates to Pipeline / useEffect runs
               │
┌──────────────▼───────────────────────┐
│   Fetching State                     │
│ isLoading=true, error=null           │
│ clients=[] (preserved from before)   │
└──────────────┬───────────────────────┘
               │
         ┌─────┴─────┐
         │           │
    (Success)    (Failure)
         │           │
         ▼           ▼
    ┌─────────┐  ┌──────────────┐
    │ Content │  │ Error State  │
    │ state=3 │  │ state=2      │
    └─────────┘  │ error="..." │
                 └──────┬───────┘
                        │
                   User clicks "Retry"
                        │
                 (loop back to Fetching)
```

---

## Error Messages

### API Error → Error Message Mapping

| Scenario | Error Source | Message to User |
|----------|--------------|-----------------|
| No session / Not authenticated | 401 from RLS | "Failed to fetch clients. Please check your connection and try again." |
| Access denied | 403 from RLS | "Failed to fetch clients. Please check your connection and try again." |
| Internal server error | 500 from API | "Failed to fetch clients. Please check your connection and try again." |
| Network unreachable | fetch() throws | "Network error. Please check your connection and try again." |
| CORS blocked | Browser | "Failed to fetch. Please check your connection and try again." |
| Timeout | fetch timeout | "[Specific message]. Please check your connection and try again." |

**Message Format:**
```
{error}. Please check your connection and try again.
```

The generic message helps users understand what to do:
1. Check if they're connected
2. If connected, try again (server might be recovering)
3. If still broken, contact support

---

## Testing Coverage

### Unit Tests (`__tests__/stores/pipeline-store.test.ts`)

Tests verify that the store correctly:

1. **Sets loading state** when fetch starts
   ```typescript
   it('should set isLoading=true when fetch starts', async () => {
     mockFetch.mockImplementation(() => new Promise(() => {}))
     await usePipelineStore.getState().fetchClients()
     expect(usePipelineStore.getState().isLoading).toBe(true)
   })
   ```

2. **Captures 401/5xx errors**
   ```typescript
   it('should set error when API returns non-200 status', async () => {
     mockFetch.mockResolvedValue({ ok: false, status: 401 })
     await usePipelineStore.getState().fetchClients()
     expect(usePipelineStore.getState().error).toBe('Failed to fetch clients')
   })
   ```

3. **Handles network failures**
   ```typescript
   it('should set error when network request fails', async () => {
     mockFetch.mockRejectedValue(new Error('Network error'))
     await usePipelineStore.getState().fetchClients()
     expect(usePipelineStore.getState().error).toBe('Network error')
   })
   ```

4. **Clears errors on successful retry**
   ```typescript
   it('should clear error when retrying successfully', async () => {
     mockFetch
       .mockResolvedValueOnce({ ok: false })
       .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [...] }) })

     await usePipelineStore.getState().fetchClients()
     expect(usePipelineStore.getState().error).toBe('Failed to fetch clients')

     await usePipelineStore.getState().fetchClients()
     expect(usePipelineStore.getState().error).toBeNull()
   })
   ```

### Integration Tests (`__tests__/pages/page-error-display.test.tsx`)

Tests verify that the component:

1. **Renders error UI when error state is set**
2. **Shows loading spinner during fetch**
3. **Clears error and displays data after successful retry**
4. **Prioritizes loading state over error state**

### Coverage Goals

- **Store error handling:** 10 test cases ✅
- **Component conditional rendering:** 4 test cases ✅
- **Retry flow:** Covered in both layers ✅
- **All error types:** Covered in store tests ✅

**Run tests:**
```bash
npm test
# or
npm test -- __tests__/stores/pipeline-store.test.ts
npm test -- __tests__/pages/page-error-display.test.tsx
```

---

## Common Pitfalls & How We Avoided Them

### ❌ Pitfall 1: Silent Failures
**What:** API fails, no error shown, empty kanban board
**Why:** Error state wasn't propagated to UI
**Fix:** Added explicit error UI with retry button ✅

### ❌ Pitfall 2: Loading State Mixed with Error
**What:** Show both spinner and error message simultaneously
**Why:** Confusing UX, unclear which state user is in
**Fix:** Used mutually-exclusive rendering with `&&` conditions ✅

### ❌ Pitfall 3: Error Persists After Success
**What:** User retries, API succeeds, but old error still shows
**Why:** Error state wasn't cleared on new fetch
**Fix:** Clear error when fetch starts: `set({ isLoading: true, error: null })` ✅

### ❌ Pitfall 4: No Way to Recover
**What:** Error shows but no retry option
**Why:** User stuck, can't fix situation
**Fix:** Added retry button that calls `fetchClients()` again ✅

### ❌ Pitfall 5: HMR Resets State
**What:** During development, hot reload clears store state
**Why:** Zustand state doesn't persist across reloads
**Fix:** Full page refresh confirms fix works; HMR is dev-only issue ✅

---

## Future Improvements

| Item | Why | How |
|------|-----|-----|
| Retry exponential backoff | Prevent hammering server on outages | Add delay multiplier on retry attempts |
| Error telemetry | Track which errors are most common | Send to Sentry |
| User-friendly messages | Generic messages aren't always helpful | Map error types to specific guidance |
| Offline detection | Distinguish network from API errors | Use navigator.onLine API |
| Auto-retry for transients | User shouldn't need to click "Retry" for temp failures | Auto-retry with exponential backoff |

---

## Related Files

| File | Purpose |
|------|---------|
| `stores/pipeline-store.ts` | Store with error state & fetchClients |
| `app/page.tsx` | Component with error UI rendering |
| `__tests__/stores/pipeline-store.test.ts` | Error handling unit tests (10 cases) |
| `__tests__/pages/page-error-display.test.tsx` | Error display integration tests |

---

## Verification Checklist

Use this checklist when reviewing error handling changes:

- [ ] Error state is captured in store
- [ ] Error is propagated to component via hook
- [ ] Three states (loading/error/content) are mutually exclusive
- [ ] Error UI is visible and readable
- [ ] Retry button calls fetchClients()
- [ ] Error clears when fetch succeeds
- [ ] Empty data doesn't show as error
- [ ] Tests cover all error types
- [ ] No console errors on retry
- [ ] UI is responsive during error state

---

*Document Version: 1.0*
*Last Updated: 2026-01-04 by Claude Code*
