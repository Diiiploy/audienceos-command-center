-- Add AI Configuration to Agency Table
-- Stores AI model settings, personality, and token limits per agency

ALTER TABLE agency
ADD COLUMN ai_config JSONB DEFAULT '{
  "assistant_name": "Diii",
  "response_tone": "professional",
  "response_length": "detailed",
  "enabled_features": ["chat_assistant", "draft_replies", "alert_analysis", "document_rag"],
  "token_limit": 50000
}'::jsonb;

-- Add index for ai_config searches (if needed in future)
CREATE INDEX idx_agency_ai_config ON agency USING GIN (ai_config);
