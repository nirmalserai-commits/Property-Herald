/*
# Dossier 5 — Listing Approval Flow: Three-level approval

1. Modified Tables
- `listings` — add approval_level column to track the 3-stage process
2. Notes
- Level 1: Nora automated quality check (completeness)
- Level 2: Nancy content review
- Level 3: Nirmal final approval
*/

DO $$ BEGIN
  ALTER TABLE listings ADD COLUMN approval_level text DEFAULT 'pending';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Update existing approved listings to level 3
UPDATE listings SET approval_level = 'nirmal_approved' WHERE moderation_status = 'approved';
UPDATE listings SET approval_level = 'nora_check' WHERE moderation_status = 'pending';
