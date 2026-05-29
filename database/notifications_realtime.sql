-- Enable Supabase Realtime for in-app notifications (bell badge + live updates).
-- Run once in the Supabase SQL editor (or via migration tooling).

ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    RAISE NOTICE 'supabase_realtime publication not found — skip (non-Supabase Postgres?)';
END $$;
