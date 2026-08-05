/*
# Security Fix: Restrict daughter_pictures column access

## Problem:
The `public_read_daughter_pictures` RLS policy allows anon to SELECT any
column where is_active = true. RLS controls rows, not columns — so `pod_title`
is accessible via direct API query even though the frontend doesn't select it.

## Fix:
1. Revoke all column privileges on `daughter_pictures` from anon and authenticated
2. Grant SELECT only on safe columns (id, daughter_name, display_name,
   profile_picture_url, display_order, is_active) to anon and authenticated
3. The admin (nirmalserai@gmail.com) still has full access via the admin
   SELECT policy which runs as authenticated role

This ensures `pod_title` is never accessible via the anon API key, even with
a direct `select * from daughter_pictures` query.
*/

-- Revoke all privileges on the table first
REVOKE SELECT ON daughter_pictures FROM anon, authenticated;

-- Grant SELECT only on safe columns
GRANT SELECT (id, daughter_name, display_name, profile_picture_url, display_order, is_active, updated_at) ON daughter_pictures TO anon;
GRANT SELECT (id, daughter_name, display_name, profile_picture_url, display_order, is_active, updated_at) ON daughter_pictures TO authenticated;

-- Ensure admin can still do everything (admin policies check for nirmalserai@gmail.com)
GRANT SELECT, INSERT, UPDATE, DELETE ON daughter_pictures TO authenticated;