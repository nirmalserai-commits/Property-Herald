/*
# Create videos table and live_events table

1. New Tables
- `videos`: stores video metadata for the public "Our Videos" gallery. Video files are stored in the `videos` Supabase Storage bucket; this table holds the public URL reference.
  - id (uuid PK), title (text, required), description (text, optional), video_url (text, required — Supabase Storage public URL), thumbnail_url (text, optional), category (text, optional, admin-defined), display_order (int, default 0), active (bool, default true), created_at (timestamptz default now()).
- `live_events`: stores LIVE event metadata for the admin Live Events section (was missing, causing "Failed to fetch events" error).
  - id (uuid PK), title (text, required), description (text, optional), event_date (timestamptz, required), duration_minutes (int, default 60), developer_slots_json (jsonb, default '[]'), buyer_registrations_json (jsonb, default '[]'), recording_url (text, optional), status (text, default 'upcoming', check: upcoming/live/completed/cancelled), tokens_per_slot (int, default 500), max_developer_slots (int, default 8), created_at (timestamptz default now()), updated_at (timestamptz default now()).

2. Security
- `videos`: public can SELECT only where active = true. Only authenticated (admin) can INSERT/UPDATE/DELETE (all rows).
- `live_events`: only authenticated (admin) can SELECT/INSERT/UPDATE/DELETE. Public (anon) has no access — live events are admin-managed only.
*/

CREATE TABLE IF NOT EXISTS videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  video_url text NOT NULL,
  thumbnail_url text,
  category text,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_active_videos" ON videos;
CREATE POLICY "public_select_active_videos"
ON videos FOR SELECT
TO anon, authenticated
USING (active = true);

DROP POLICY IF EXISTS "auth_insert_videos" ON videos;
CREATE POLICY "auth_insert_videos"
ON videos FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_videos" ON videos;
CREATE POLICY "auth_update_videos"
ON videos FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_videos" ON videos;
CREATE POLICY "auth_delete_videos"
ON videos FOR DELETE
TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS live_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_date timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  developer_slots_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  buyer_registrations_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  recording_url text,
  status text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'completed', 'cancelled')),
  tokens_per_slot integer NOT NULL DEFAULT 500,
  max_developer_slots integer NOT NULL DEFAULT 8,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE live_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select_live_events" ON live_events;
CREATE POLICY "auth_select_live_events"
ON live_events FOR SELECT
TO authenticated USING (true);

DROP POLICY IF EXISTS "auth_insert_live_events" ON live_events;
CREATE POLICY "auth_insert_live_events"
ON live_events FOR INSERT
TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "auth_update_live_events" ON live_events;
CREATE POLICY "auth_update_live_events"
ON live_events FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "auth_delete_live_events" ON live_events;
CREATE POLICY "auth_delete_live_events"
ON live_events FOR DELETE
TO authenticated USING (true);
