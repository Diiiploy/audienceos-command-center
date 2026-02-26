-- Rename default AI assistant from "Chi" to "Diii"
-- Only updates agencies that still have the old default name
UPDATE agency
SET ai_config = jsonb_set(ai_config, '{assistant_name}', '"Diii"')
WHERE ai_config->>'assistant_name' = 'Chi';
