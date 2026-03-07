-- Fix broken RLS policies on chat_session and chat_message tables
-- Original migration (007_hgc_chat_tables.sql) referenced non-existent "admin_users" table
-- This silently blocked ALL SELECT queries while INSERTs still worked
-- Correct table is "user" (defined in 009_rbac_schema.sql)

-- Drop broken policies
DROP POLICY IF EXISTS chat_session_agency_via_user ON chat_session;
DROP POLICY IF EXISTS chat_message_via_session ON chat_message;

-- Recreate using actual "user" table (matches RLS pattern used across all other tables)
CREATE POLICY chat_session_agency_via_user ON chat_session
    FOR ALL
    USING (agency_id IN (SELECT agency_id FROM "user" WHERE id = auth.uid()));

CREATE POLICY chat_message_via_session ON chat_message
    FOR ALL
    USING (session_id IN (
        SELECT id FROM chat_session
        WHERE agency_id IN (SELECT agency_id FROM "user" WHERE id = auth.uid())
    ));
