-- Admin DELETE policy for daughter_pictures (was missing)
DROP POLICY IF EXISTS "admin_delete_daughter_pictures" ON daughter_pictures;
CREATE POLICY "admin_delete_daughter_pictures"
ON daughter_pictures FOR DELETE
TO authenticated
USING ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');

-- Admin SELECT policy for daughter_pictures (existing public_read only shows active rows)
DROP POLICY IF EXISTS "admin_select_daughter_pictures" ON daughter_pictures;
CREATE POLICY "admin_select_daughter_pictures"
ON daughter_pictures FOR SELECT
TO authenticated
USING ((auth.jwt() ->> 'email') = 'nirmalserai@gmail.com');
