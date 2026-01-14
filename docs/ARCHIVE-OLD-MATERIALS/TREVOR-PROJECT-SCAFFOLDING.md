# Project Scaffolding (Trevor Original)

> Source: Trevor's Project Documents > Markdown Version > Project Scaffolding
> Copied: 2026-01-01

## Folder Structure (Next.js)

```
/app
  /clients, /dashboard, /pipeline
  /intelligence, /tickets, /integrations, /settings
  layout.tsx, globals.css

/src
  /lib - api.ts, supabase.ts, llm.ts, rag.ts
  /components - /ui, Kanban/, Charts/, Assistant/
  /services - clients, tickets, integrations, assistant
  /workers - syncWorker.ts
  /types, /hooks, /styles, /utils

/public - icons, images
```

## Conventions
- Domain logic in /services, minimal in pages
- React Server Components where possible
- Interactive components as Client Components
