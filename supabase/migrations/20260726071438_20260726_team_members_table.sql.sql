/*
# Create team_members table

1. New Tables
- `team_members`
  - `id` (uuid, primary key)
  - `position` (int, not null) — display order
  - `name` (text, not null) — member's display name
  - `role` (text, nullable) — member's role/title
  - `image_url` (text, nullable) — URL to profile picture
  - `created_at` (timestamptz, default now())
2. Security
- Enable RLS on `team_members`.
- Public read access (anon + authenticated) so the homepage can fetch the list.
- No public write — only the service role / admin tooling writes.
3. Seed
- Inserts the 15 current team members ordered by position.
*/

CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position int NOT NULL,
  name text NOT NULL,
  role text,
  image_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_team_members" ON team_members;
CREATE POLICY "public_read_team_members"
ON team_members FOR SELECT
TO anon, authenticated USING (true);

INSERT INTO team_members (position, name, role, image_url) VALUES
  (1,  'Nora',        NULL, NULL),
  (2,  'Nita',        NULL, NULL),
  (3,  'Nazia',       NULL, NULL),
  (4,  'Nakshatra',   NULL, NULL),
  (5,  'Navya',       NULL, NULL),
  (6,  'Niranjana',   NULL, NULL),
  (7,  'Nivedita',    NULL, NULL),
  (8,  'Navika',      NULL, NULL),
  (9,  'Nimrat',      NULL, NULL),
  (10, 'Nandani',     NULL, NULL),
  (11, 'Navneet',     NULL, NULL),
  (12, 'Naina',       NULL, NULL),
  (13, 'Namrata',     NULL, NULL),
  (14, 'Nasreen',     NULL, NULL),
  (15, 'Noor Jahan',  NULL, NULL)
ON CONFLICT DO NOTHING;
