-- ============================================================================
-- LAMTEX ERP - Schema Modifications Log
-- All incremental changes to the database schema go here.
-- Run these AFTER the base schema.sql has been applied.
-- Each modification is dated and described.
-- All statements are idempotent (safe to re-run).
-- ============================================================================


-- ============================================================================
-- [2026-04-05] Initial modifications file created
-- Going forward, all schema changes are recorded here instead of editing
-- schema.sql directly. This keeps the base schema stable and provides
-- a clear audit trail of every database change.
-- ============================================================================


-- ============================================================================
-- [2026-04-05] RLS: REPLACE auth.role() POLICIES WITH auth.uid() IS NOT NULL
-- The original policies used auth.role() = 'authenticated'.
-- We now simplify to auth.uid() IS NOT NULL — any logged-in user gets full
-- CRUD on all public tables. This also removes the anon_select_ workaround.
-- Safe to re-run — drops old policies if they exist, skips if already applied.
-- ============================================================================
DO $$
DECLARE
  tbl TEXT;
  ops TEXT[] := ARRAY['select','insert','update','delete'];
  op TEXT;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    FOREACH op IN ARRAY ops LOOP
      -- Drop the old auth.role()-based policy
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'auth_' || op || '_' || tbl, tbl);
      -- Drop any anon_select_ workaround policy
      IF op = 'select' THEN
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'anon_select_' || tbl, tbl);
      END IF;
    END LOOP;

    -- Recreate with auth.uid() IS NOT NULL
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR SELECT USING (auth.uid() IS NOT NULL)',
        'auth_select_' || tbl, tbl
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)',
        'auth_insert_' || tbl, tbl
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR UPDATE USING (auth.uid() IS NOT NULL)',
        'auth_update_' || tbl, tbl
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;

    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR DELETE USING (auth.uid() IS NOT NULL)',
        'auth_delete_' || tbl, tbl
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

