# Active Tasks - Linear Rebuild

## ✅ Quality Checks
_Last check: 2026-01-02_

### Preflight (Gate 1)
- [x] ESLint: Clean ✓
- [x] TypeScript: Clean ✓
- [x] Security: Clean ✓

## ✅ Completed This Session
- [x] Refactored `automations-hub.tsx` to master-detail layout
- [x] Refactored `onboarding-hub.tsx` to master-detail layout
- [x] Fixed TypeScript errors in test files:
  - `__tests__/edge-cases.test.ts` - trigger validation type assertions
  - `__tests__/lib/action-registry.test.ts` - removed invalid `order` property, fixed configs
  - `__tests__/lib/trigger-registry.test.ts` - trigger validation type assertions
  - `__tests__/stores/automations-store.test.ts` - fixed trigger/action types
  - `__tests__/stores/dashboard-store.test.ts` - fixed KPI and Trends mock data
- [x] Fixed `onboarding-hub.tsx` - replaced non-existent `lastActivity` with `daysInStage`

## 📋 Ready for PR
All preflight checks pass - ready for commit and PR creation