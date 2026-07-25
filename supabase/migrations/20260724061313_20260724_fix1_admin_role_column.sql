/*
# Fix 1 — Add role column to profiles and set nirmalserai@gmail.com as admin

1. Changes to existing tables
- `profiles`: add `role` column (text, default 'user')
2. Data
- Set role = 'admin' for nirmalserai@gmail.com
3. Security
- No RLS changes (existing policies remain in place)
4. Important notes
- The admin email is ALSO hardcoded in the frontend (AdminLayout.tsx) per dossier Section 2.3
- This column provides a database-level record of admin status
- Idempotent: safe to re-run
*/

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

UPDATE profiles SET role = 'admin' WHERE email = 'nirmalserai@gmail.com';
