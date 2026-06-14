-- Per-employee notification delivery preferences (Settings → Notifications tab).
-- preferences JSONB shape: { "order_created": { "in_app": true, "email": false }, ... }
-- Missing key or missing channel = enabled (backward compatible until user saves prefs).

CREATE TABLE IF NOT EXISTS employee_notification_preferences (
  employee_id   UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  preferences   JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employee_notification_preferences_updated
  ON employee_notification_preferences(updated_at DESC);

ALTER TABLE employee_notification_preferences ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY auth_select_employee_notification_preferences ON employee_notification_preferences
    FOR SELECT USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY auth_insert_employee_notification_preferences ON employee_notification_preferences
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY auth_update_employee_notification_preferences ON employee_notification_preferences
    FOR UPDATE USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY auth_delete_employee_notification_preferences ON employee_notification_preferences
    FOR DELETE USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON employee_notification_preferences TO authenticated;

-- Returns false only when the employee explicitly disabled the channel for this event.
CREATE OR REPLACE FUNCTION employee_notification_in_app_enabled(
  p_employee_id UUID,
  p_event_type TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pref JSONB;
  val TEXT;
BEGIN
  IF p_employee_id IS NULL OR p_event_type IS NULL OR trim(p_event_type) = '' THEN
    RETURN TRUE;
  END IF;

  SELECT preferences INTO pref
  FROM employee_notification_preferences
  WHERE employee_id = p_employee_id;

  IF pref IS NULL OR NOT (pref ? p_event_type) THEN
    RETURN TRUE;
  END IF;

  val := pref -> p_event_type ->> 'in_app';
  IF val IS NULL THEN
    RETURN TRUE;
  END IF;

  RETURN val::boolean;
END;
$$;

GRANT EXECUTE ON FUNCTION employee_notification_in_app_enabled(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION trg_notifications_respect_in_app_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emp_id UUID;
BEGIN
  IF NEW.user_id IS NULL OR NEW.event_type IS NULL OR trim(NEW.event_type) = '' THEN
    RETURN NEW;
  END IF;

  SELECT e.id INTO emp_id
  FROM employees e
  WHERE e.auth_user_id = NEW.user_id
    AND e.status = 'active'::employee_status
  LIMIT 1;

  IF emp_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT employee_notification_in_app_enabled(emp_id, trim(NEW.event_type)) THEN
    RETURN NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_respect_in_app_preferences ON notifications;

CREATE TRIGGER notifications_respect_in_app_preferences
  BEFORE INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION trg_notifications_respect_in_app_preferences();

NOTIFY pgrst, 'reload schema';
