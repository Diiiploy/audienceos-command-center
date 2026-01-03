-- Seed stage events for demo clients
-- This gives realistic timeline data for the demo

-- Sunset Realty (currently in Audit) - show full journey
INSERT INTO stage_event (client_id, agency_id, from_stage, to_stage, moved_by, moved_at, notes) VALUES
  ('e31041eb-dad4-4ef8-aead-fb2251997fd4', '11111111-1111-1111-1111-111111111111', NULL, 'Lead', '542ac730-1f87-4a69-8369-f208b014610b', '2024-11-15 10:00:00+00', 'Initial client intake'),
  ('e31041eb-dad4-4ef8-aead-fb2251997fd4', '11111111-1111-1111-1111-111111111111', 'Lead', 'Onboarding', '542ac730-1f87-4a69-8369-f208b014610b', '2024-11-20 14:30:00+00', 'Signed contract, starting onboarding'),
  ('e31041eb-dad4-4ef8-aead-fb2251997fd4', '11111111-1111-1111-1111-111111111111', 'Onboarding', 'Installation', '542ac730-1f87-4a69-8369-f208b014610b', '2024-12-01 09:15:00+00', 'Onboarding complete, setting up pixels'),
  ('e31041eb-dad4-4ef8-aead-fb2251997fd4', '11111111-1111-1111-1111-111111111111', 'Installation', 'Audit', '542ac730-1f87-4a69-8369-f208b014610b', '2024-12-28 11:00:00+00', 'Tech setup verified, starting account audit');

-- TechCorp Solutions (currently Live) - show journey to live
INSERT INTO stage_event (client_id, agency_id, from_stage, to_stage, moved_by, moved_at, notes) VALUES
  ('c87b5225-68c8-4623-86b4-4eae2de4f19b', '11111111-1111-1111-1111-111111111111', NULL, 'Lead', '542ac730-1f87-4a69-8369-f208b014610b', '2024-09-01 09:00:00+00', 'Referral from existing client'),
  ('c87b5225-68c8-4623-86b4-4eae2de4f19b', '11111111-1111-1111-1111-111111111111', 'Lead', 'Onboarding', '542ac730-1f87-4a69-8369-f208b014610b', '2024-09-10 11:00:00+00', 'Contract signed'),
  ('c87b5225-68c8-4623-86b4-4eae2de4f19b', '11111111-1111-1111-1111-111111111111', 'Onboarding', 'Installation', '542ac730-1f87-4a69-8369-f208b014610b', '2024-09-20 14:00:00+00', 'Kickoff complete'),
  ('c87b5225-68c8-4623-86b4-4eae2de4f19b', '11111111-1111-1111-1111-111111111111', 'Installation', 'Audit', '542ac730-1f87-4a69-8369-f208b014610b', '2024-10-01 10:00:00+00', 'All tracking verified'),
  ('c87b5225-68c8-4623-86b4-4eae2de4f19b', '11111111-1111-1111-1111-111111111111', 'Audit', 'Live', '542ac730-1f87-4a69-8369-f208b014610b', '2024-10-15 09:00:00+00', 'Campaigns launched');

-- Coastal Coffee (Needs Support) - show issue progression
INSERT INTO stage_event (client_id, agency_id, from_stage, to_stage, moved_by, moved_at, notes) VALUES
  ('896d2d4d-d547-41f7-b16e-c376380daeda', '11111111-1111-1111-1111-111111111111', NULL, 'Lead', '542ac730-1f87-4a69-8369-f208b014610b', '2024-10-01 09:00:00+00', 'Inbound lead'),
  ('896d2d4d-d547-41f7-b16e-c376380daeda', '11111111-1111-1111-1111-111111111111', 'Lead', 'Onboarding', '542ac730-1f87-4a69-8369-f208b014610b', '2024-10-10 11:00:00+00', 'Deal closed'),
  ('896d2d4d-d547-41f7-b16e-c376380daeda', '11111111-1111-1111-1111-111111111111', 'Onboarding', 'Live', '542ac730-1f87-4a69-8369-f208b014610b', '2024-11-01 14:00:00+00', 'Fast-tracked to live'),
  ('896d2d4d-d547-41f7-b16e-c376380daeda', '11111111-1111-1111-1111-111111111111', 'Live', 'Needs Support', '542ac730-1f87-4a69-8369-f208b014610b', '2024-12-20 16:00:00+00', 'ROAS dropped below target, investigating');
