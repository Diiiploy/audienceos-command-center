# DevOps and MCP Plan (Trevor Original)

> Source: Trevor's Project Documents > Markdown Version > DevOps and MCP Plan
> Copied: 2026-01-01

## DevOps & Claude MCP Plan

### Purpose
Use MCPs as dev assistants (not in production)
Keep production integration logic standard server-side

### Development Workflow
1. Feature branch: feat/<issue>
2. Local prototyping with MCPs (Docker, Supabase emulator)
3. Run unit & integration tests
4. Push PR → CI: lint, test, typecheck, build
5. Staging validation with Playwright
6. Merge to main → production deploy

### Infrastructure & Secrets
- KMS for secrets management
- 90-day key rotation
- Tokens encrypted at rest

### Observability
- Structured JSON logs
- Metrics: sync durations, API latencies
- Alerts: worker failures, OAuth refresh fails, 5xx rates

### Backup & DR
- Daily DB backups, PITR enabled
- Quarterly restore drills

### Workers
- Serverless functions / Cloud Run
- Managed cron for hourly ingestion
- Job queue for rate-limited pulls
