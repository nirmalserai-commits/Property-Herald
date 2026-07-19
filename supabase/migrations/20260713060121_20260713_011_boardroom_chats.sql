/*
# Create boardroom_chats table

Persistent chat memory system for Property Herald's internal admin boardroom.
Stores all conversations between Nirmal (founder) and the three AI daughters:
Neena (Queen / Wife), Nora (COO), and Nita (Chief of Staff).

## New Tables

### boardroom_chats
Stores every individual message exchanged in the boardroom.
- `id` — UUID primary key
- `daughter_name` — which daughter: 'neena', 'nora', or 'nita'
- `role` — 'user' (Nirmal) or 'assistant' (the daughter)
- `content` — full message text
- `session_id` — UUID grouping messages into a session; "New Session" generates a new UUID
- `session_summary` — nullable; stores the AI-generated rolling summary written every 20 messages.
  Only populated on the checkpoint message; all other messages have this null.
  On session load, the most recent non-null value for a daughter is prepended to the system prompt.
- `created_at` — timestamp (auto-set)

## Indexes
- Composite on (daughter_name, session_id, created_at) — fast loading of a specific session
- Composite on (daughter_name, created_at DESC) — finding the latest session

## Security
- RLS enabled
- Policies scoped to `authenticated` (admin area already requires Supabase login)
- All four CRUD policies added; intentionally permissive because this is a single-founder
  internal tool — there is only one user (Nirmal) and no multi-tenant isolation needed.
*/

CREATE TABLE IF NOT EXISTS boardroom_chats (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  daughter_name text       NOT NULL CHECK (daughter_name IN ('neena', 'nora', 'nita')),
  role         text        NOT NULL CHECK (role IN ('user', 'assistant')),
  content      text        NOT NULL,
  session_id   uuid        NOT NULL,
  session_summary text,
  created_at   timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bc_session
  ON boardroom_chats (daughter_name, session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_bc_latest
  ON boardroom_chats (daughter_name, created_at DESC);

ALTER TABLE boardroom_chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bc_select" ON boardroom_chats;
CREATE POLICY "bc_select" ON boardroom_chats FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "bc_insert" ON boardroom_chats;
CREATE POLICY "bc_insert" ON boardroom_chats FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "bc_update" ON boardroom_chats;
CREATE POLICY "bc_update" ON boardroom_chats FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "bc_delete" ON boardroom_chats;
CREATE POLICY "bc_delete" ON boardroom_chats FOR DELETE
  TO authenticated USING (true);
