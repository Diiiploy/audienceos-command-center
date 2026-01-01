# ERD Schema (Trevor Original)

> Source: Trevor's Project Documents > Markdown Version > ERD Schema
> Copied: 2026-01-01

## ERD Schema - Core Tables

### AGENCY
- id (uuid PK), name, settings (json), created_at

### USER
- id (uuid PK), agency_id (FK), email, name, role, active, created_at

### CLIENT
- id (uuid PK), agency_id (FK), name, owner_user_id (FK)
- stage, days_in_stage, health (green/yellow/red), meta (json)

### STAGE_EVENT
- id (uuid PK), client_id (FK), from_stage, to_stage
- changed_by_user_id (FK), created_at

### TICKET
- id (uuid PK), agency_id (FK), client_id (FK)
- status, priority, assignee_user_id (FK)
- description, sentiment, created_at

### TASK
- id (uuid PK), client_id (FK), name, completed
- assigned_to (FK), due_date, stage

### ADS_METRIC
- id (uuid PK), client_id (FK), date
- impressions, clicks, spend, conversions, revenue, roas
- raw_payload (json)

### DOCUMENT
- id (uuid PK), agency_id (FK), client_id (FK nullable)
- filename, mimetype, size, category, uploaded_at, storage_path

### DOCUMENT_EMBEDDING
- id (uuid PK), document_id (FK), embedding (vector)
- chunk_text, chunk_index

### WORKFLOW / WORKFLOW_RUN
- Automation definitions and execution logs

### INTEGRATION / INTEGRATION_CRED
- OAuth tokens stored encrypted with KMS
