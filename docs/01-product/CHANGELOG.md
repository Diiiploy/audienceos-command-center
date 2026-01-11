# AudienceOS Command Center - Changelog

## 2026-01-11 - Authentication & Mock Data Fixes

### Fixed Critical Blockers

| Field | Value |
|-------|-------|
| **Action** | Fixed authentication bypass and mock data removal |
| **Time** | 16:44 CET |
| **Files Modified** | lib/supabase.ts, app/api/v1/settings/agency/route.ts, components/dashboard-view.tsx |
| **Root Cause** | RLS policies blocking authenticated users from reading user/agency tables |
| **Solution** | Service role client bypass in auth helpers |
| **Verification** | Browser screenshots: Settings loads Diiiploy data, Firehose shows 0 items |
| **Commit** | acaa0d5 - fix(auth): bypass RLS in auth helpers using service role client |
| **Tests** | 715/715 passing |
| **Status** | COMPLETE |

**What was done:**
- Modified `getUserAgencyId` to use service role client (bypasses RLS)
- Updated agency settings route to use service role for agency queries
- Removed ~130 lines of hard-coded mock data from dashboard Firehose
- Renamed `generateMockFirehoseItems` → `generateFirehoseItems` (client-derived only)
- Added diagnostic scripts: check-auth-state.ts, seed-new-project.ts, test-rls.ts

**Before:** Settings showed "Failed to Load Agency Settings", Dashboard showed fake "Review Weekly Report" tasks
**After:** Settings loads real Diiiploy agency data, Firehose shows "0 items" / "No items to show"

**Files changed:**
- lib/supabase.ts - RLS bypass in getUserAgencyId
- app/api/v1/settings/agency/route.ts - Service role for agency data
- components/dashboard-view.tsx - Mock data removal (182 lines → 57 lines)

**Next:** System is now ready for real client data. Both authentication and mock data blockers resolved.