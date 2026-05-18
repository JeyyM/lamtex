-- STEP 1 of 2 — Run this script alone in Supabase SQL editor, wait for success, then run:
--   database/order_proof_payment_extension_step2.sql
--
-- PostgreSQL requires new enum labels to be committed before use (55P04).

-- proof_type: add "other" (app label; legacy "receipt" rows migrated in step 2)
DO $$ BEGIN
  ALTER TYPE proof_type ADD VALUE 'other';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE order_log_action ADD VALUE 'proof_updated';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE order_log_action ADD VALUE 'proof_removed';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
