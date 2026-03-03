-- Custom Prompts table for reusable AI prompt templates
-- Used by the Intelligence Center > Custom Prompts section

CREATE TABLE custom_prompt (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES agency(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES "user"(id),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    prompt_template TEXT NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'other',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_custom_prompt_agency ON custom_prompt(agency_id);

ALTER TABLE custom_prompt ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can manage prompts"
    ON custom_prompt FOR ALL
    USING (agency_id IN (SELECT agency_id FROM "user" WHERE id = auth.uid()));
