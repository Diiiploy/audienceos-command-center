# Product Vision: Multi-Org Roles & Permissions System

**Last Updated:** 2026-01-08
**Status:** Approved ✅

---

## The Product

**Name:** Multi-Org Roles & Permissions System
**One-liner:** Fine-grained role-based access control for marketing agencies managing multiple clients and team members.

---

## The Problem

Marketing agencies struggle with team permission management as they scale:

### Pain Points

- **Data Exposure Risk**: Junior team members accidentally access sensitive client data they shouldn't see
- **Manual Access Control**: Owners spend time manually controlling who sees what, slowing down operations
- **Compliance Concerns**: Agencies need audit trails and controlled access for client data protection
- **Team Structure Mismatch**: Generic admin/user roles don't match agency hierarchies (Owner → Admin → Manager → Member)

### Current Workarounds (Broken)

Without granular permissions, agencies either:
1. **Give everyone too much access** (security risk) - Everyone sees all clients/data
2. **Give everyone too little access** (productivity loss) - Owners must approve every action
3. **Maintain separate spreadsheets** (manual overhead) - Track permissions outside the app

---

## Target Users

### Primary: Agency Owners & Admins (5-50 person agencies)

**Who:** Executive leadership responsible for data security and team management
**What They Need:**
- Control team access to client data, billing, and system settings
- Match digital permissions to real-world team hierarchies
- Audit trails for compliance and security

**Pain:** Currently spend 2+ hours/week managing ad-hoc permission requests

### Secondary: Agency Managers & Members (team members)

**Who:** Account managers, project leads, specialists, junior staff
**What They Need:**
- Appropriate access to do their job without seeing irrelevant/sensitive data
- Clear understanding of what they can/cannot access
- Efficient workflows without permission barriers for assigned clients

**Pain:** Waste time asking for access or working around restrictions

---

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| **Permission Denial Rate** | <5% false denials | API logs: 403 errors / total requests |
| **Role Setup Time** | <10 minutes per team member | Time from invite to productive access |
| **Data Exposure Incidents** | 0 unauthorized client data access | Audit log analysis + manual review |
| **Owner Time Savings** | 2+ hours/week saved | Before/after time tracking |
| **Team Member Satisfaction** | 8+/10 on access experience | Post-implementation survey |
| **Permission Enforcement Coverage** | 100% of API endpoints | Code coverage + endpoint audit |

---

## Core Value Proposition

### **"Security without friction"**

Agencies get enterprise-grade access controls that automatically match their team structure, eliminating manual permission management while preventing data exposure incidents.

### Competitive Advantages

| Aspect | Generic Solutions | Our System |
|--------|------------------|-----------|
| **Role System** | Admin/User only | Owner/Admin/Manager/Member hierarchy |
| **Permission Model** | All-or-nothing | Granular per resource × action |
| **Client Scoping** | Agency-wide only | Per-member client assignments |
| **Setup Effort** | Manual per user | Automatic based on role |
| **Audit Trail** | Limited/none | Complete access attempt logging |

---

## Feature Scope (What's Included)

### ✅ In Scope

- Hierarchical role system (4 built-in roles)
- Granular permissions per resource (8 resources × 3 actions)
- Custom role creation (up to 10 per agency)
- Client-level access restrictions for Members
- API middleware enforcement + RLS backup
- Permission UI matrix for editing
- Audit trail of all permission changes
- Owner role protection (cannot modify/delete)

### ❌ Out of Scope

- Cross-agency role sharing or templates
- Time-limited or expiring permissions
- Attribute-based access control (ABAC)
- Permission delegation (user granting permissions)
- Approval workflows for permission requests

---

## Role Hierarchy

```
┌─────────────────────────────────────┐
│         Owner (level 1)             │
│  Full control, cannot be deleted    │
└──────────────┬──────────────────────┘
               │
       ┌───────▼──────────┐
       │  Admin (level 2) │
       │  Full access     │
       │  (no billing)    │
       └───────┬──────────┘
               │
       ┌───────▼────────────┐
       │ Manager (level 3)  │
       │ Client mgmt only   │
       └───────┬────────────┘
               │
       ┌───────▼──────────────────┐
       │  Member (level 4)        │
       │  Assigned clients only   │
       │  (read + write access)   │
       └────────────────────────┘
```

---

## Key Design Principles

1. **Security by Default** - Deny first, only allow explicit permissions
2. **Hierarchy Matters** - Role level determines access scope (agency-wide vs client-scoped)
3. **Defense in Depth** - Middleware + RLS work together (can't bypass either)
4. **Audit Everything** - All access attempts (allowed/denied) logged for compliance
5. **Simplicity First** - 4 built-in roles cover 90% of use cases
6. **Data Ownership** - Members can't see clients they're not assigned to

---

## Success Looks Like

✅ Owners can set up a new team member in <10 minutes by:
  1. Creating invite
  2. Assigning role
  3. (Optional) Assigning specific clients if Member role
  4. Done - instant access with no manual permission adjustments

✅ Members see only:
  - Clients they're assigned to
  - Features their role permits
  - Clean UI with no "access denied" errors

✅ Zero data exposure incidents related to permission misconfiguration

✅ Owners report 2+ hours/week time savings on permission management

---

## Next Phase

Approved for: `/B-2-scope` - Define IN/OUT scope, requirements, and constraints
