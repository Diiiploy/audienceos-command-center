# Technical Architecture (Trevor Original)

> Source: Trevor's Project Documents > Markdown Version > Technical Architecture Diagram
> Copied: 2026-01-01

## Technical Architecture

### Components
- **Frontend:** Next.js on Vercel
- **Backend:** Supabase (Postgres + Functions + Storage)
- **Vector Store:** Google File Search (RAG)
- **LLM:** Claude/GPT for embeddings and generation
- **Integrations:** OAuth to Slack, Gmail, Google Ads, Meta Ads

### Data Flow
1. Frontend communicates via REST + Realtime (WebSocket)
2. Supabase holds canonical data (clients, tickets, ads metrics)
3. Hourly cron jobs ingest Slack/Gmail/Ads data
4. Documents stored in Supabase Storage, indexed to Google File Search
5. LLM/embedding service handles RAG + generation
6. All state-changing actions require user confirmation

### Integration Flow
- OAuth tokens stored encrypted with KMS
- Hourly/on-demand sync workers pull external data
- Webhooks receive provider events with signature verification
