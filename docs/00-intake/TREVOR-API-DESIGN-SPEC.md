# API Design Spec (Trevor Original)

> Source: Trevor's Project Documents > Markdown Version > API Design Spec
> Copied: 2026-01-01

## API Design Spec (REST) - v1

**Base URL:** `https://api.yourdomain.com/v1`
**Auth:** JWT with `Authorization: Bearer <token>`

## Endpoints

### Auth
- `POST /v1/auth/login` → JWT
- `POST /v1/auth/refresh` → refresh token

### Clients
- `GET /v1/clients?stage=&owner=&health=&q=`
- `POST /v1/clients`
- `GET /v1/clients/{id}`
- `PATCH /v1/clients/{id}`
- `POST /v1/clients/{id}/move`

### Tasks
- `GET /v1/clients/{id}/tasks`
- `POST /v1/clients/{id}/tasks`
- `PATCH /v1/tasks/{task_id}`

### Tickets
- `GET /v1/tickets?status=&assignee=`
- `POST /v1/tickets`
- `POST /v1/tickets/{id}/notes`

### Integrations
- `GET /v1/integrations`
- `POST /v1/integrations` (OAuth start)
- `POST /v1/integrations/{id}/test`
- `POST /v1/integrations/{id}/sync`

### Documents (RAG)
- `POST /v1/documents` (multipart upload)
- `GET /v1/documents`
- `POST /v1/documents/{id}/index`

### Assistant
- `POST /v1/assistant/query`
- `POST /v1/assistant/draft`

### Ads Metrics
- `GET /v1/clients/{id}/ads_metrics?start=&end=`

### Workflows
- `GET /v1/workflows`
- `POST /v1/workflows`
- `POST /v1/workflows/{id}/run`
