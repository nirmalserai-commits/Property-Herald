-- Create admin_log table for audit trail
CREATE TABLE IF NOT EXISTS admin_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE admin_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_log_select_auth" ON admin_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_log_insert_auth" ON admin_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "admin_log_update_auth" ON admin_log FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_log_delete_auth" ON admin_log FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_admin_log_created_at ON admin_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_log_admin_email ON admin_log(admin_email);
