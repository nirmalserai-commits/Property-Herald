-- Fix: banner_type is NOT NULL but the frontend doesn't set it.
-- The old column is orphaned (no frontend code uses it). Set a safe default.
ALTER TABLE banners ALTER COLUMN banner_type SET DEFAULT 'promotional';
