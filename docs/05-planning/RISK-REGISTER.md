# AudienceOS Command Center - Risk Register

> **Created:** 2025-12-31
> **Status:** Pre-Implementation
> **Review Cadence:** Weekly during active development

---

## Risk Assessment Matrix

| Probability → | Low | Medium | High |
|---------------|-----|--------|------|
| **Critical** | 🟡 Monitor | 🔴 Mitigate | 🔴 Block |
| **High** | 🟢 Accept | 🟡 Monitor | 🔴 Mitigate |
| **Medium** | 🟢 Accept | 🟢 Accept | 🟡 Monitor |
| **Low** | 🟢 Accept | 🟢 Accept | 🟢 Accept |

---

## Active Risks

### R-001: Multi-Tenant Data Leakage
| Attribute | Value |
|-----------|-------|
| **Category** | Security |
| **Probability** | Low |
| **Impact** | Critical |
| **Rating** | 🟡 Monitor |
| **Owner** | Engineering |

**Description:** RLS policies could have gaps allowing cross-tenant data access.

**Mitigation:**
- [ ] Follow proven War Room RLS patterns
- [ ] Add `agency_id` check to every query
- [ ] Create RLS test suite before Phase 1 complete
- [ ] Code review every data access path

**Contingency:** Immediate hotfix + security audit if discovered.

---

### R-002: OAuth Complexity Across 4 Platforms
| Attribute | Value |
|-----------|-------|
| **Category** | Technical |
| **Probability** | Medium |
| **Impact** | High |
| **Rating** | 🟡 Monitor |
| **Owner** | Engineering |

**Description:** Slack, Gmail, Google Ads, Meta Ads each have different OAuth flows, scopes, and refresh requirements.

**Mitigation:**
- [ ] Use chi-gateway MCP as fallback for ad platforms
- [ ] Research each OAuth flow before Phase 5
- [ ] Build generic OAuth flow component
- [ ] Add comprehensive error handling

**Contingency:** Ship with MCP-only for ads if OAuth proves too complex for v1.

---

### R-003: Gemini File Search Indexing Failures
| Attribute | Value |
|-----------|-------|
| **Category** | Integration |
| **Probability** | Low |
| **Impact** | Medium |
| **Rating** | 🟢 Accept |
| **Owner** | Engineering |

**Description:** Documents may fail to index to Gemini, breaking Knowledge Base RAG.

**Mitigation:**
- [ ] Implement retry mechanism with exponential backoff
- [ ] Add manual re-index button in UI
- [ ] Show clear status (pending/indexing/indexed/failed)
- [ ] Document supported formats and size limits

**Contingency:** Allow direct document viewing even if RAG fails.

---

### R-004: Real-Time Performance Under Load
| Attribute | Value |
|-----------|-------|
| **Category** | Performance |
| **Probability** | Low |
| **Impact** | Medium |
| **Rating** | 🟢 Accept |
| **Owner** | Engineering |

**Description:** Supabase Realtime may struggle with many concurrent dashboard viewers.

**Mitigation:**
- [ ] Use hourly batch refresh for non-critical metrics
- [ ] Realtime only for at-risk client alerts
- [ ] Add client-side caching layer
- [ ] Monitor Supabase connection limits

**Contingency:** Downgrade to polling if Realtime issues occur.

---

### R-005: AI Token Costs Escalation
| Attribute | Value |
|-----------|-------|
| **Category** | Financial |
| **Probability** | Medium |
| **Impact** | Medium |
| **Rating** | 🟡 Monitor |
| **Owner** | Product |

**Description:** Heavy Chi Chat usage could result in unexpected Claude API costs.

**Mitigation:**
- [ ] Implement Smart Router to use cheaper models for simple queries
- [ ] Add token usage tracking per tenant
- [ ] Set monthly usage caps per agency
- [ ] Use Mem0 to avoid redundant queries

**Contingency:** Rate limit heavy users, adjust pricing model.

---

### R-006: Chi Intelligent Chat Extraction Complexity
| Attribute | Value |
|-----------|-------|
| **Category** | Technical |
| **Probability** | Medium |
| **Impact** | High |
| **Rating** | 🟡 Monitor |
| **Owner** | Engineering |

**Description:** Extracting @chi/intelligent-chat from War Room may be more complex than expected.

**Mitigation:**
- [ ] Research War Room codebase before Phase 6
- [ ] Document all Chi dependencies
- [ ] Plan incremental extraction vs rebuild
- [ ] Allocate buffer time (120min task)

**Contingency:** Build simpler chat without Smart Routing for v1, add routing in v1.1.

---

### R-007: Client OAuth Token Expiry
| Attribute | Value |
|-----------|-------|
| **Category** | Operations |
| **Probability** | High |
| **Impact** | Medium |
| **Rating** | 🟡 Monitor |
| **Owner** | Engineering |

**Description:** OAuth tokens expire, causing sync failures if not refreshed proactively.

**Mitigation:**
- [ ] Background job to refresh tokens before expiry
- [ ] Alert users when tokens need manual re-auth
- [ ] Clear UI indication of connection health
- [ ] Encrypt tokens in Supabase Vault

**Contingency:** User-initiated reconnect flow.

---

### R-008: Slack/Gmail Webhook Delivery Failures
| Attribute | Value |
|-----------|-------|
| **Category** | Integration |
| **Probability** | Medium |
| **Impact** | Medium |
| **Rating** | 🟢 Accept |
| **Owner** | Engineering |

**Description:** Missed webhooks could result in messages not appearing in timeline.

**Mitigation:**
- [ ] Implement message deduplication (idempotent processing)
- [ ] Add periodic full sync as backup
- [ ] Log webhook failures to Sentry
- [ ] Signature verification for all webhooks

**Contingency:** Manual sync button for users to pull missing messages.

---

### R-009: dnd-kit Kanban Performance
| Attribute | Value |
|-----------|-------|
| **Category** | Performance |
| **Probability** | Low |
| **Impact** | Low |
| **Rating** | 🟢 Accept |
| **Owner** | Engineering |

**Description:** Large client lists may cause Kanban drag-drop to lag.

**Mitigation:**
- [ ] Implement column pagination (max 10 cards)
- [ ] Use virtualization for long lists
- [ ] Optimize card rendering

**Contingency:** Simpler list view fallback.

---

### R-010: Scope Creep
| Attribute | Value |
|-----------|-------|
| **Category** | Project |
| **Probability** | High |
| **Impact** | High |
| **Rating** | 🔴 Mitigate |
| **Owner** | Product |

**Description:** Chase may request additional features during development.

**Mitigation:**
- [ ] Clear scope document (SCOPE.md) signed off
- [ ] Change request process in SOW
- [ ] v2 backlog for future requests
- [ ] Weekly check-ins to surface requests early

**Contingency:** Price additional work separately, delay to v2.

---

### R-011: Permission Logic Bugs (Multi-Org Roles)
| Attribute | Value |
|-----------|-------|
| **Category** | Security |
| **Probability** | Medium |
| **Impact** | Critical |
| **Rating** | 🔴 Mitigate |
| **Owner** | Engineering |

**Description:** Permission checking logic bugs could accidentally grant access to unauthorized resources.

**Mitigation:**
- [ ] Comprehensive permission matrix test suite (8 resources × 3 actions × 4 roles)
- [ ] Unit tests for withPermission middleware edge cases
- [ ] Code review of permission service logic before Phase 1
- [ ] Permission denial logging + manual audit of access patterns

**Contingency:** Revert to simpler all-or-nothing permissions, extend RBAC in v1.1.

---

### R-012: Performance at Scale (Multi-Org Roles)
| Attribute | Value |
|-----------|-------|
| **Category** | Performance |
| **Probability** | Low |
| **Impact** | High |
| **Rating** | 🟡 Monitor |
| **Owner** | Engineering |

**Description:** Permission checks on 34 API endpoints could add latency if permission service is slow.

**Mitigation:**
- [ ] Cache user permissions for 5 minutes
- [ ] Use role hierarchy for early denials
- [ ] Measure P50/P95 latency on permission checks
- [ ] Load test with 1000+ concurrent requests

**Contingency:** Reduce permission check complexity, implement request batching.

---

### R-013: RLS Policy Gaps (Multi-Org Roles)
| Attribute | Value |
|-----------|-------|
| **Category** | Security |
| **Probability** | Low |
| **Impact** | Critical |
| **Rating** | 🟡 Monitor |
| **Owner** | Engineering |

**Description:** RLS policies may not correctly enforce client-scoped access for Members.

**Mitigation:**
- [ ] RLS test suite for each new permission tier
- [ ] Test Member accessing unassigned clients (should fail)
- [ ] Test Manager vs Admin access patterns
- [ ] Code review all RLS policy changes

**Contingency:** Rely on middleware checks as primary defense, RLS as backup.

---

### R-014: Owner Protection Logic
| Attribute | Value |
|-----------|-------|
| **Category** | Security |
| **Probability** | Low |
| **Impact** | High |
| **Rating** | 🟡 Monitor |
| **Owner** | Engineering |

**Description:** Owner role could be accidentally modified/deleted, breaking agency management.

**Mitigation:**
- [ ] Hard-code Owner role cannot be deleted
- [ ] withOwnerOnly middleware for all owner-only endpoints
- [ ] Test suite: verify non-owners cannot modify Owner role
- [ ] Audit log captures all Owner role change attempts

**Contingency:** Manual database recovery if Owner accidentally modified.

---

### R-015: Member Client Assignment Scope Creep
| Attribute | Value |
|-----------|-------|
| **Category** | Technical |
| **Probability** | Medium |
| **Impact** | Medium |
| **Rating** | 🟡 Monitor |
| **Owner** | Engineering |

**Description:** Client assignment UI may become complex with many clients (100+ per agency).

**Mitigation:**
- [ ] Pagination or search for client selection
- [ ] Batch assignment for multiple Members
- [ ] Clear UI indication of current assignments
- [ ] Performance tested with 100 clients

**Contingency:** Simple list view with search, no bulk operations in v1.

---

### R-016: Audit Trail Completeness
| Attribute | Value |
|-----------|-------|
| **Category** | Compliance |
| **Probability** | Low |
| **Impact** | Medium |
| **Rating** | 🟢 Accept |
| **Owner** | Engineering |

**Description:** Audit logging might miss some permission access attempts due to error handling.

**Mitigation:**
- [ ] Log permission checks before allowing/denying
- [ ] Test logging with intentional failures
- [ ] Separate audit table prevents data loss on main queries
- [ ] Periodic audit log consistency checks

**Contingency:** Admin can manually review API logs if audit trail incomplete.

---

### R-017: Integration with Existing Auth System
| Attribute | Value |
|-----------|-------|
| **Category** | Integration |
| **Probability** | Medium |
| **Impact** | Medium |
| **Rating** | 🟡 Monitor |
| **Owner** | Engineering |

**Description:** Multi-Org Roles must coordinate with existing Supabase auth, potential for conflicts.

**Mitigation:**
- [ ] Test all auth flows (login, logout, session) with new role system
- [ ] Verify JWT claims include role_id + agency_id
- [ ] Ensure existing users get default role assignment
- [ ] Database migration strategy for backward compatibility

**Contingency:** Ship with Owner role for all existing users, migrate gradually.

---

## Risk Summary

| Rating | Count | Action |
|--------|-------|--------|
| 🔴 Block/Mitigate | 2 | Active mitigation required |
| 🟡 Monitor | 10 | Track during development |
| 🟢 Accept | 5 | Acknowledged, contingency ready |

---

## Closed Risks

*No risks closed yet - project in planning phase.*

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-08 | Added Multi-Org Roles specific risks (R-011 to R-017): 7 new risks for RBAC system |
| 2025-12-31 | Initial risk register with 10 identified risks |

---

*Living Document - Located at docs/05-planning/RISK-REGISTER.md*
