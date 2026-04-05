-- ============================================================================
-- LAMTEX ERP - Apply / Execute Scripts
-- This file is for runnable operations against the database:
--   • Populating / seeding data
--   • SELECT queries & diagnostics
--   • One-time data migrations
--   • Bulk updates, fixes, and patches
--
-- Run statements here in the Supabase SQL Editor as needed.
-- Unlike schema.sql and modifications.sql, entries here are operational
-- and may not be idempotent — review before re-running.
-- ============================================================================


-- ============================================================================
-- [2026-04-05] Initial apply file created
-- ============================================================================


-- ============================================================================
-- [2026-04-05] FULL DATABASE RESET
-- WARNING: This will DROP everything in the public schema and recreate it clean.
-- After running this, re-run schema.sql then modifications.sql.
-- ============================================================================

-- Step 1: Drop ALL tables in public schema (cascading)
DO $$ 
DECLARE 
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', tbl);
  END LOOP;
END $$;

-- Step 2: Drop ALL custom enum types in public schema
DO $$ 
DECLARE 
  t TEXT;
BEGIN
  FOR t IN
    SELECT typname FROM pg_type 
    WHERE typnamespace = 'public'::regnamespace 
      AND typtype = 'e'
  LOOP
    EXECUTE format('DROP TYPE IF EXISTS %I CASCADE', t);
  END LOOP;
END $$;

-- Step 3: Drop ALL functions in public schema
DO $$ 
DECLARE 
  func TEXT;
BEGIN
  FOR func IN
    SELECT oid::regprocedure::TEXT FROM pg_proc 
    WHERE pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS %s CASCADE', func);
  END LOOP;
END $$;

-- Step 4: Drop ALL RLS policies in public schema
DO $$ 
DECLARE 
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Step 5: Verify clean slate
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
SELECT typname FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typtype = 'e';

-- ============================================================================
-- After running the above, apply in order:
--   1. schema.sql
--   2. modifications.sql
-- ============================================================================

