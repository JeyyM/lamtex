-- Shipping containers for Manila inter-island logistics (stored in `vehicles` with type Shipping Container).

DO $$ BEGIN
  ALTER TYPE vehicle_type ADD VALUE IF NOT EXISTS 'Shipping Container';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
