-- File Search Store Migration
-- Adds persistent Gemini File Search Store tracking (one per agency)
-- and links documents to their store entries.

-- File Search Store tracking (one per agency)
CREATE TABLE IF NOT EXISTS file_search_store (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
    store_name VARCHAR(200) NOT NULL,      -- Gemini resource name: "fileSearchStores/abc-123"
    display_name VARCHAR(200) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(agency_id)                      -- Enforces one store per agency
);

CREATE INDEX IF NOT EXISTS idx_file_search_store_agency ON file_search_store(agency_id);

ALTER TABLE file_search_store ENABLE ROW LEVEL SECURITY;

CREATE POLICY file_search_store_rls ON file_search_store FOR ALL
    USING (agency_id = (SELECT agency_id FROM "user" WHERE id = auth.uid()));

-- Add new columns to document table for File Search Store linkage
ALTER TABLE document ADD COLUMN IF NOT EXISTS gemini_document_name VARCHAR(300);
ALTER TABLE document ADD COLUMN IF NOT EXISTS file_search_store_id UUID
    REFERENCES file_search_store(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_document_file_search_store
    ON document(file_search_store_id) WHERE file_search_store_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_document_gemini_document_name
    ON document(gemini_document_name) WHERE gemini_document_name IS NOT NULL;
