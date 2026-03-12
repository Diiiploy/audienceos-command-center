-- Backfill role_id for existing users who accepted invitations without it
-- Joins on the role table by name to get the correct UUID
-- Only targets system roles (is_system = true) to avoid ambiguity

UPDATE "user" u
SET role_id = r.id
FROM role r
WHERE LOWER(r.name) = u.role::text
  AND r.is_system = true
  AND u.role_id IS NULL
  AND u.role IS NOT NULL;
