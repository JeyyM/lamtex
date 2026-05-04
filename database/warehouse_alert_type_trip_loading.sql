-- Trip loading / stock notes from warehouse modal: accurate category (not "Shortage Impact")
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'warehouse_alert_type' AND e.enumlabel = 'Trip Loading'
  ) THEN
    ALTER TYPE warehouse_alert_type ADD VALUE 'Trip Loading';
  END IF;
END $$;
