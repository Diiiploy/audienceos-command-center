-- ============================================================================
-- Ticket Number Reformat: 6-digit IDs + Race Condition Fix
-- ============================================================================
-- 1. Re-numbers existing tickets to 6-digit format (100001+) per agency
-- 2. Replaces the trigger function with a race-condition-safe version
--    using pg_advisory_xact_lock to serialize per agency
-- ============================================================================

-- Step 1: Re-number existing tickets starting at 100001, preserving chronological order
WITH renumbered AS (
  SELECT id, agency_id,
         100000 + ROW_NUMBER() OVER (PARTITION BY agency_id ORDER BY created_at) AS new_number
  FROM ticket
)
UPDATE ticket SET number = renumbered.new_number
FROM renumbered WHERE ticket.id = renumbered.id;

-- Step 2: Replace trigger function with race-condition-safe version
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
    -- Advisory lock scoped to transaction, keyed on agency_id hash.
    -- This serializes concurrent inserts for the SAME agency while allowing
    -- different agencies to insert in parallel.
    PERFORM pg_advisory_xact_lock(hashtext(NEW.agency_id::text));

    NEW.number := COALESCE(
        (SELECT MAX(number) + 1 FROM ticket WHERE agency_id = NEW.agency_id),
        100001
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The existing trigger (ticket_number_trigger) already calls generate_ticket_number()
-- so it will automatically use the new function definition. No trigger recreation needed.
