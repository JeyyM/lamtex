-- =============================================================================
-- Fix: "Database error querying schema" / 500 on signInWithPassword
--
-- Cause (see supabase/auth#1940): GoTrue maps several auth.users columns to
-- non-nullable Go strings. NULL in those columns → sql: Scan error → 500.
--
-- Run in Supabase SQL Editor. Safe to re-run; only touches rows with NULLs.
-- Does NOT alter table structure (only data).
-- =============================================================================

UPDATE auth.users
SET
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  phone_change = COALESCE(phone_change, ''),
  reauthentication_token = COALESCE(reauthentication_token, '')
WHERE confirmation_token IS NULL
   OR recovery_token IS NULL
   OR email_change_token_current IS NULL
   OR email_change_token_new IS NULL
   OR email_change IS NULL
   OR phone_change_token IS NULL
   OR phone_change IS NULL
   OR reauthentication_token IS NULL;
