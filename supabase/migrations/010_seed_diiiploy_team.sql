-- Seed Diiiploy Team Members
-- Run this migration to replace generic users with real team

-- Delete existing generic users
DELETE FROM "user" WHERE agency_id = '11111111-1111-1111-1111-111111111111';

-- Insert Diiiploy team
INSERT INTO "user" (id, agency_id, email, first_name, last_name, role, is_active, created_at, updated_at) VALUES
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'brent@diiiploy.io', 'Brent', 'Owner', 'admin', true, now(), now()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'roderic@diiiploy.io', 'Roderic', 'Andrews', 'admin', true, now(), now()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'trevor@diiiploy.io', 'Trevor', 'Team', 'user', true, now(), now()),
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', 'chase@diiiploy.io', 'Chase', 'Client', 'user', true, now(), now());

-- Verify
SELECT id, first_name, last_name, email, role FROM "user" WHERE agency_id = '11111111-1111-1111-1111-111111111111';
