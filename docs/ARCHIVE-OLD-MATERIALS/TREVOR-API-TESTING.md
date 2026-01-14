# API Setup and Testing (Trevor Original)

> Source: Trevor's Project Documents > Markdown Version > API Setup and Testing
> Copied: 2026-01-01

## API Setup & Testing

### OpenAPI 3.0 Spec
- Full OpenAPI YAML with all endpoints
- Schemas: Auth, Client, Ticket, Integration, Document, Assistant, Workflow, AdsMetric

### Jest Test Suite
- Auth tests: login success/fail
- Clients tests: list, create, validation
- Assistant tests: draft, query

### RAG Prompt Templates
- System prompt: AudienceOS Assistant rules
- Retrieval prompt: context combination
- Answer formatting: SOURCES, SUGGESTED ACTIONS, CONFIDENCE

### Few-Shot Examples
1. Draft email with sources
2. Summarize client health
3. Root cause analysis
4. Risk detection rules

### Indexing Rules
- Convert PDF/DOCX to text
- Chunk: 500 tokens, 50 overlap
- Store embeddings with metadata

### Retrieval Recipe
1. Extract entities from query
2. Vector search top-20
3. Rerank by client match, recency, doc type
4. Pass top-5 to LLM
