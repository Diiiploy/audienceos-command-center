# PRD - Product Requirements (Trevor Original)

> Source: Trevor's Project Documents > Markdown Version > Product Requirements Doc
> Copied: 2026-01-01

## PRODUCT REQUIREMENTS DOCUMENT (PRD)
### Diiiploy Command Center - SaaS for Marketing Agencies

## 1. Product Overview
Single-tenant SaaS platform for marketing agencies to manage client lifecycle, communications, performance data, internal SOPs, and AI-assisted workflows.

**Differentiator:** AI-native operations powered by RAG search, generative drafting, KPI intelligence, and risk detection—while keeping human approval in the loop.

## 2. Target Users
- **Primary:** Agency Account Manager / CSM
- **Secondary:** Agency Owners / Directors
- **Tertiary:** Support / Technical Staff

## 3. Goals
- Unified dashboard for client lifecycle visibility
- Slack, Gmail, Google Ads, Meta Ads integrations
- AI-powered summarization, insights, risk detection, drafting
- Configurable automation system
- RAG search across documents and DB

## 4. Platform Architecture
- **Frontend:** Next.js + Tailwind on Vercel
- **Backend:** Supabase (PostgreSQL + Functions + Storage)
- **AI:** RAG via Google File Search API
- **Hosting:** Vercel + Supabase

## 5. Core Pages
- Dashboard, Pipeline (Kanban), Client List, Intelligence Center
- Support Tickets, Knowledge Base, Automations, Integrations, Settings

## 6. AI/LLM Requirements
- Query internal DB, Search documents (RAG), Draft emails/Slack
- Generate summaries, Identify risk patterns
- **NO autonomous execution** - all actions require human confirmation
