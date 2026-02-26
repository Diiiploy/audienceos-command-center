# FEATURE SPEC: Settings

**What:** Comprehensive agency configuration, user management, and platform customization system
**Who:** Agency Admins configuring their workspace and team members managing personal preferences
**Why:** Provide centralized control over agency operations, team access, and platform behavior
**Status:** 📝 Specced

---

## User Stories

**US-038: Configure Agency Profile**
As an Admin, I want to configure agency settings, so the platform matches our workflow.

Acceptance Criteria:
- [ ] Edit: agency name, logo, contact info
- [ ] Set default timezone
- [ ] Configure business hours
- [ ] Custom pipeline stages (extend default 6)
- [ ] Health thresholds (days before Yellow/Red)

**US-039: Manage Team Members**
As an Admin, I want to manage users, so I control access.

Acceptance Criteria:
- [ ] View all users: name, email, role, last active, status
- [ ] Invite new users by email
- [ ] Change user role (Admin/User)
- [ ] Deactivate user (preserves data, blocks login)
- [ ] Delete user (requires client reassignment)

**US-040: Configure AI Behavior**
As an Admin, I want to customize AI settings, so responses match our style.

Acceptance Criteria:
- [ ] Set AI assistant name (default: "Diii")
- [ ] Configure response tone: Professional/Casual/Technical
- [ ] Set default response length preference
- [ ] View AI token usage this month
- [ ] Toggle which features use AI

**US-041: Set Notification Preferences**
As a User, I want to configure my notifications, so I only get relevant alerts.

Acceptance Criteria:
- [ ] Email notifications: On/Off per type
- [ ] Slack channel for notifications
- [ ] Digest mode: Daily summary vs real-time
- [ ] Quiet hours: No notifications during times
- [ ] Mute specific clients

---

## Functional Requirements

What this feature DOES:
- [ ] Provide comprehensive agency-level configuration with role-based access control
- [ ] Enable secure user lifecycle management with invitation and deactivation workflows
- [ ] Support custom branding and workflow configuration for agency personalization
- [ ] Offer granular notification control with channel-specific preferences
- [ ] Enable AI behavior customization with tone and feature toggles
- [ ] Track and display resource usage with quota management
- [ ] Maintain audit trails for all administrative actions
- [ ] Support timezone-aware business hours and scheduling
- [ ] Enable bulk operations for efficient team management
- [ ] Provide real-time validation and feedback for configuration changes

What this feature does NOT do:
- ❌ Provide billing or subscription management (handled by external service)
- ❌ Support white-label branding beyond logo and name
- ❌ Enable SSO configuration (future enterprise feature)
- ❌ Allow API key management for external integrations
- ❌ Support complex approval workflows for settings changes

---

## Data Model

Entities involved:
- AGENCY - Core tenant configuration and branding settings
- USER - Team member profiles and role management
- USER_PREFERENCE - Individual notification and behavior preferences
- USER_INVITATION - Pending team member invitations

New fields needed:
| Entity | Field | Type | Description |
|--------|-------|------|-------------|
| AGENCY | ai_assistant_name | String | Custom AI assistant name |
| AGENCY | ai_response_tone | Enum | professional, casual, technical |
| AGENCY | ai_token_limit | Integer | Monthly token usage limit |
| USER_PREFERENCE | notification_digest | Boolean | Daily digest vs real-time alerts |

---

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|------------|
| `/api/v1/settings/agency` | GET | Get agency configuration and profile |
| `/api/v1/settings/agency` | PATCH | Update agency settings with validation |
| `/api/v1/settings/users` | GET | List agency users with pagination and filtering |
| `/api/v1/settings/users/{id}` | PATCH | Update user role, status, or profile |
| `/api/v1/settings/users/{id}` | DELETE | Delete user with client reassignment |
| `/api/v1/settings/invitations` | GET | List pending invitations with status |
| `/api/v1/settings/invitations` | POST | Send user invitation with role assignment |
| `/api/v1/settings/invitations/{id}` | DELETE | Cancel pending invitation |
| `/api/v1/settings/invitations/{token}/accept` | POST | Accept invitation and create account |
| `/api/v1/settings/preferences` | GET | Get current user preferences |
| `/api/v1/settings/preferences` | PATCH | Update user notification preferences |
| `/api/v1/settings/ai` | GET | Get AI configuration and usage stats |
| `/api/v1/settings/ai` | PATCH | Update AI behavior settings |
| `/api/v1/settings/audit` | GET | Get settings change audit trail |
| `/api/v1/settings/export` | GET | Export agency settings for backup |

---

## UI Components

| Component | Purpose |
|-----------|---------|
| SettingsLayout | Main settings interface with sidebar navigation |
| SettingsSidebar | Section navigation with access control |
| AgencyProfileForm | Agency configuration with live preview |
| TeamMembersTable | User management with bulk operations |
| UserInvitationModal | Email invitation with role selection |
| UserProfileDrawer | Individual user editing with validation |
| UserDeactivationModal | User deactivation with confirmation |
| NotificationPreferencesForm | Granular notification control |
| AIConfigurationPanel | AI behavior settings with usage display |
| BusinessHoursScheduler | Visual business hours configuration |
| PipelineStagesEditor | Custom stage management with validation |
| HealthThresholdSliders | Visual threshold configuration |
| InvitationStatusBadge | Visual invitation state indicators |
| UsageMetricsDisplay | Resource usage with quota visualization |
| SettingsAuditLog | Change history with filtering |

---

## Implementation Tasks

### Core Infrastructure
- [ ] TASK-001: Set up settings layout with responsive sidebar navigation
- [ ] TASK-002: Implement role-based access control for settings sections
- [ ] TASK-003: Create settings validation framework with real-time feedback
- [ ] TASK-004: Build audit logging system for all configuration changes
- [ ] TASK-005: Set up settings backup and restore functionality

### Agency Configuration
- [ ] TASK-006: Build AgencyProfileForm with logo upload and preview
- [ ] TASK-007: Create BusinessHoursScheduler with timezone support
- [ ] TASK-008: Implement PipelineStagesEditor with drag-drop reordering
- [ ] TASK-009: Build HealthThresholdSliders with visual indicators
- [ ] TASK-010: Add agency branding preview with live updates

### User Management System
- [ ] TASK-011: Create TeamMembersTable with sorting and bulk operations
- [ ] TASK-012: Build UserInvitationModal with email validation
- [ ] TASK-013: Implement invitation email service with templates
- [ ] TASK-014: Create UserProfileDrawer with role and status controls
- [ ] TASK-015: Build user deactivation workflow with data preservation

### Invitation Workflow
- [ ] TASK-016: Implement secure invitation token generation
- [ ] TASK-017: Create invitation acceptance flow with account creation
- [ ] TASK-018: Build invitation expiry and renewal system
- [ ] TASK-019: Add invitation tracking with status updates
- [ ] TASK-020: Implement bulk invitation with CSV upload

### AI Configuration
- [ ] TASK-021: Build AIConfigurationPanel with feature toggles
- [ ] TASK-022: Create AI usage tracking with quota enforcement
- [ ] TASK-023: Implement tone preview with sample responses
- [ ] TASK-024: Add AI feature impact analysis
- [ ] TASK-025: Build AI cost management with budget alerts

### Notification System
- [ ] TASK-026: Create NotificationPreferencesForm with channel selection
- [ ] TASK-027: Implement quiet hours with timezone handling
- [ ] TASK-028: Build client muting with selective unmuting
- [ ] TASK-029: Create notification testing with preview mode
- [ ] TASK-030: Implement digest delivery scheduling

### Advanced Features
- [ ] TASK-031: Build settings import/export with validation
- [ ] TASK-032: Create settings templates for common configurations
- [ ] TASK-033: Implement settings version control with rollback
- [ ] TASK-034: Add configuration compliance checking
- [ ] TASK-035: Build settings analytics with usage insights

### Mobile & Accessibility
- [ ] TASK-036: Optimize settings interface for mobile devices
- [ ] TASK-037: Implement keyboard navigation for all settings
- [ ] TASK-038: Add screen reader support with proper labeling
- [ ] TASK-039: Create high contrast mode for accessibility
- [ ] TASK-040: Implement settings search with keyboard shortcuts

---

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Last admin tries to change own role | Block with error "Must maintain at least one admin" |
| Delete user with active client assignments | Show reassignment dialog, require selection before deletion |
| Invitation email address already exists | Show friendly error, offer to resend invitation |
| AI token quota exceeded mid-month | Show warning, throttle requests, offer upgrade |
| Business hours span midnight | Handle correctly across date boundaries |
| Timezone change affects scheduled items | Prompt to update existing schedules, show preview |
| Bulk user upload with mixed formats | Process valid entries, report errors with line numbers |
| Settings page loaded by deactivated user | Show read-only view with reactivation request option |
| Concurrent settings modification | Use optimistic locking, show conflict resolution dialog |
| Large agency with 100+ users | Implement pagination, lazy loading, and search |

---

## Technical Implementation

### Settings Validation Framework
```typescript
interface SettingValidation {
  field: string;
  rules: ValidationRule[];
  message: string;
  severity: 'error' | 'warning' | 'info';
}

class SettingsValidator {
  async validateAgencySettings(settings: AgencySettings): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Validate pipeline stages
    if (settings.pipeline_stages.length < 3) {
      results.push({
        field: 'pipeline_stages',
        type: 'error',
        message: 'Minimum 3 pipeline stages required'
      });
    }

    // Validate business hours
    if (settings.business_hours) {
      const start = new Date(`2000-01-01T${settings.business_hours.start}`);
      const end = new Date(`2000-01-01T${settings.business_hours.end}`);

      if (start >= end) {
        results.push({
          field: 'business_hours',
          type: 'warning',
          message: 'Business hours end time should be after start time'
        });
      }
    }

    return results;
  }

  async validateUserSettings(user: UserSettings): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    // Validate notification preferences
    if (user.email_notifications && !user.email) {
      results.push({
        field: 'email_notifications',
        type: 'warning',
        message: 'Email notifications enabled but no email address configured'
      });
    }

    return results;
  }
}
```

### Role-Based Access Control
```typescript
interface SettingsPermission {
  section: string;
  action: 'read' | 'write' | 'admin';
  roles: UserRole[];
}

const SETTINGS_PERMISSIONS: SettingsPermission[] = [
  {
    section: 'agency_profile',
    action: 'write',
    roles: ['admin']
  },
  {
    section: 'team_members',
    action: 'write',
    roles: ['admin']
  },
  {
    section: 'ai_configuration',
    action: 'write',
    roles: ['admin']
  },
  {
    section: 'personal_preferences',
    action: 'write',
    roles: ['admin', 'user']
  }
];

function checkSettingsPermission(
  user: User,
  section: string,
  action: 'read' | 'write' | 'admin'
): boolean {
  const permission = SETTINGS_PERMISSIONS.find(p =>
    p.section === section && p.action === action
  );

  if (!permission) return false;

  return permission.roles.includes(user.role);
}

// Usage in components
function SettingsSection({ section, children }: SettingsSectionProps) {
  const { user } = useAuth();
  const canWrite = checkSettingsPermission(user, section, 'write');

  return (
    <div className={cn("settings-section", { "read-only": !canWrite })}>
      {children}
    </div>
  );
}
```

### User Invitation System
```typescript
interface InvitationService {
  sendInvitation(email: string, role: UserRole, agencyId: string): Promise<Invitation>;
  acceptInvitation(token: string, userDetails: NewUserDetails): Promise<User>;
  resendInvitation(invitationId: string): Promise<void>;
}

class UserInvitationService implements InvitationService {
  async sendInvitation(email: string, role: UserRole, agencyId: string): Promise<Invitation> {
    // Check if user already exists
    const existingUser = await this.findUserByEmail(email, agencyId);
    if (existingUser) {
      throw new Error('User with this email already exists in your agency');
    }

    // Generate secure invitation token
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create invitation record
    const invitation = await supabase
      .from('user_invitations')
      .insert({
        agency_id: agencyId,
        email,
        role,
        token,
        expires_at: expiresAt.toISOString(),
        created_by: this.getCurrentUserId()
      })
      .select()
      .single();

    // Send invitation email
    await this.emailService.sendInvitation({
      to: email,
      inviterName: this.getCurrentUser().name,
      agencyName: this.getAgency(agencyId).name,
      acceptUrl: `${APP_URL}/invite/${token}`,
      role
    });

    return invitation.data;
  }

  async acceptInvitation(token: string, userDetails: NewUserDetails): Promise<User> {
    // Validate invitation token
    const invitation = await supabase
      .from('user_invitations')
      .select('*, agency(*)')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .is('accepted_at', null)
      .single();

    if (!invitation.data) {
      throw new Error('Invalid or expired invitation');
    }

    // Create user account
    const user = await supabase.auth.signUp({
      email: invitation.data.email,
      password: userDetails.password,
      options: {
        data: {
          name: userDetails.name,
          agency_id: invitation.data.agency_id,
          role: invitation.data.role
        }
      }
    });

    if (user.error) {
      throw new Error(`Failed to create account: ${user.error.message}`);
    }

    // Mark invitation as accepted
    await supabase
      .from('user_invitations')
      .update({
        accepted_at: new Date().toISOString(),
        accepted_by: user.data.user.id
      })
      .eq('id', invitation.data.id);

    return user.data.user;
  }
}
```

### AI Configuration Management
```typescript
interface AIConfiguration {
  assistant_name: string;
  response_tone: 'professional' | 'casual' | 'technical';
  response_length: 'brief' | 'detailed' | 'comprehensive';
  enabled_features: AIFeature[];
  token_limit: number;
  current_usage: number;
}

class AIConfigurationService {
  async updateAIConfiguration(
    agencyId: string,
    config: Partial<AIConfiguration>
  ): Promise<AIConfiguration> {
    // Validate configuration
    const validation = await this.validateAIConfig(config);
    if (validation.errors.length > 0) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    // Update agency settings
    const { data, error } = await supabase
      .from('agencies')
      .update({
        ai_assistant_name: config.assistant_name,
        ai_response_tone: config.response_tone,
        ai_response_length: config.response_length,
        ai_enabled_features: config.enabled_features,
        ai_token_limit: config.token_limit,
        updated_at: new Date().toISOString()
      })
      .eq('id', agencyId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update AI configuration: ${error.message}`);
    }

    // Log configuration change
    await this.auditLog.log({
      action: 'ai_config_updated',
      agency_id: agencyId,
      user_id: this.getCurrentUserId(),
      changes: config,
      timestamp: new Date().toISOString()
    });

    return data;
  }

  async getTokenUsage(agencyId: string): Promise<TokenUsageStats> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const usage = await supabase
      .from('ai_usage_logs')
      .select('tokens_used, feature, created_at')
      .eq('agency_id', agencyId)
      .gte('created_at', startOfMonth.toISOString());

    const totalUsed = usage.data?.reduce((sum, log) => sum + log.tokens_used, 0) || 0;

    return {
      current_usage: totalUsed,
      limit: this.getTokenLimit(agencyId),
      usage_by_feature: this.groupUsageByFeature(usage.data || []),
      daily_usage: this.calculateDailyUsage(usage.data || [])
    };
  }

  private async validateAIConfig(config: Partial<AIConfiguration>): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (config.assistant_name && config.assistant_name.length > 50) {
      errors.push('Assistant name must be 50 characters or less');
    }

    if (config.token_limit && config.token_limit < 1000) {
      warnings.push('Token limit below 1000 may restrict AI functionality');
    }

    return { errors, warnings };
  }
}
```

### Notification Preference Engine
```typescript
interface NotificationPreferences {
  email_alerts: boolean;
  email_tickets: boolean;
  email_mentions: boolean;
  slack_channel_id?: string;
  digest_mode: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  muted_clients: string[];
}

class NotificationPreferenceService {
  async shouldSendNotification(
    userId: string,
    notificationType: NotificationType,
    clientId?: string
  ): Promise<boolean> {
    const preferences = await this.getPreferences(userId);

    // Check if notification type is enabled
    if (!this.isNotificationTypeEnabled(preferences, notificationType)) {
      return false;
    }

    // Check if client is muted
    if (clientId && preferences.muted_clients.includes(clientId)) {
      return false;
    }

    // Check quiet hours
    if (this.isInQuietHours(preferences)) {
      return false;
    }

    // Check digest mode
    if (preferences.digest_mode && !this.isUrgentNotification(notificationType)) {
      await this.addToDigestQueue(userId, notificationType, clientId);
      return false;
    }

    return true;
  }

  private isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quiet_hours_start || !preferences.quiet_hours_end) {
      return false;
    }

    const now = new Date();
    const quietStart = this.parseTime(preferences.quiet_hours_start);
    const quietEnd = this.parseTime(preferences.quiet_hours_end);

    const currentTime = now.getHours() * 60 + now.getMinutes();

    // Handle quiet hours that span midnight
    if (quietStart > quietEnd) {
      return currentTime >= quietStart || currentTime <= quietEnd;
    }

    return currentTime >= quietStart && currentTime <= quietEnd;
  }

  async sendDigestEmail(userId: string): Promise<void> {
    const pendingNotifications = await this.getDigestQueue(userId);

    if (pendingNotifications.length === 0) {
      return;
    }

    const digestContent = await this.buildDigestContent(pendingNotifications);

    await this.emailService.sendDigest({
      to: await this.getUserEmail(userId),
      subject: `Daily Digest - ${pendingNotifications.length} updates`,
      content: digestContent
    });

    // Clear digest queue
    await this.clearDigestQueue(userId);
  }
}
```

---

## Testing Checklist

- [ ] Happy path: Agency profile updates save and reflect across the platform
- [ ] User invitation: Email sent, link works, account created with correct role
- [ ] Permission validation: Non-admins cannot access admin-only settings
- [ ] User deactivation: Login blocked, data preserved, can be reactivated
- [ ] AI configuration: Settings affect response tone and feature availability
- [ ] Notification preferences: Quiet hours respected, digest mode works
- [ ] Pipeline customization: Custom stages appear in client management
- [ ] Business hours: Timezone handling works correctly across regions
- [ ] Bulk operations: Multiple users can be managed efficiently
- [ ] Settings validation: Invalid configurations prevent save with clear errors
- [ ] Audit trail: All changes logged with user attribution
- [ ] Mobile experience: All settings accessible and usable on mobile
- [ ] Performance: Settings load quickly for agencies with 100+ users
- [ ] Data integrity: User deletion properly reassigns clients
- [ ] Security: RLS prevents cross-agency settings access

---

## Performance Considerations

### Caching Strategy
- Cache agency settings with 15-minute TTL for frequent access
- User preferences cached per session with real-time invalidation
- Invitation status cached to reduce database queries
- AI usage statistics cached hourly with background updates

### Database Optimization
```sql
-- Essential indexes for settings performance
CREATE INDEX idx_users_agency_active ON users(agency_id, is_active, last_active DESC);
CREATE INDEX idx_user_preferences_user ON user_preferences(user_id, category, key);
CREATE INDEX idx_invitations_agency_status ON user_invitations(agency_id, accepted_at) WHERE accepted_at IS NULL;
CREATE INDEX idx_settings_audit_agency ON settings_audit(agency_id, created_at DESC);
```

### UI Performance
- Lazy load user list for large agencies
- Debounce validation during form editing
- Use virtual scrolling for team member lists
- Implement optimistic updates for immediate feedback

---

## Dependencies

### Required for Implementation
- React Hook Form (form validation)
- React Query (settings state management)
- Zod (schema validation)
- React DnD (pipeline stage reordering)

### Blocked By
- USER_PREFERENCE table implementation
- Email service for invitations
- Role-based permission system
- Audit logging infrastructure

### Enables
- All other features (agency configuration affects entire platform)
- User onboarding workflow
- Notification system functionality
- AI behavior customization

---

## Security & Privacy

### Access Control
- Admin-only settings protected by role validation
- User preferences isolated per user with RLS
- Invitation tokens cryptographically secure with expiration
- Settings changes require current password for sensitive operations

### Data Protection
```typescript
// Sensitive settings encryption
class SettingsEncryption {
  async encryptSensitiveSettings(settings: any): Promise<string> {
    const sensitive = this.extractSensitiveFields(settings);
    return await encrypt(JSON.stringify(sensitive), this.getEncryptionKey());
  }

  async decryptSensitiveSettings(encryptedData: string): Promise<any> {
    const decrypted = await decrypt(encryptedData, this.getEncryptionKey());
    return JSON.parse(decrypted);
  }

  private extractSensitiveFields(settings: any): any {
    // Extract fields that need encryption
    return {
      slack_webhook_url: settings.slack_webhook_url,
      api_keys: settings.api_keys
    };
  }
}
```

### Audit Trail
- All settings changes logged with before/after values
- User management actions tracked with IP addresses
- Invitation events logged for security monitoring
- Failed access attempts recorded for threat detection

---

## Success Metrics

- **Setup Completion:** 90% of new agencies complete profile setup within first week
- **Team Growth:** Average 4+ team members added per agency within first month
- **Customization Adoption:** 60% of agencies customize at least 3 settings categories
- **Notification Engagement:** Users who customize notifications have 30% higher retention
- **AI Configuration:** 70% of agencies modify default AI settings
- **Support Reduction:** 40% fewer support requests about platform behavior

---

## Monitoring & Alerts

### Key Metrics to Track
- Settings change frequency and types
- User invitation success and failure rates
- AI token usage and quota breaches
- Notification delivery success rates
- Settings page performance and error rates

### Alerting Rules
```yaml
invitation_failures:
  condition: failed_invitation_rate > 10%
  window: 1h
  alert: Slack

ai_quota_breach:
  condition: token_usage > 90% of limit
  window: 1d
  alert: Email

settings_errors:
  condition: settings_error_rate > 5%
  window: 15m
  alert: Dashboard

large_agency_performance:
  condition: settings_load_time > 3s
  window: 5m
  alert: Monitoring
```

---

## Changelog

| Date | Change |
|------|--------|
| 2025-12-31 | Enhanced spec with complete implementation details, corrected user story numbers |
| 2025-12-31 | Created initial spec from MVP-PRD |

---

*Living Document - Located at features/settings.md*