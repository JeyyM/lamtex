-- ============================================================================
-- backfill_payment_proofs_and_release_commissions.sql
--
-- After overhaul_reseed (payment proofs are not auto-seeded), Finance →
-- Invoices & Payments and Agent Analytics commission KPIs stay at ₱0 because
-- both read cash payment proofs + commission_paid_at — not orders.amount_paid alone.
--
-- This script:
--   1) Inserts one verified payment proof per order with amount_paid > 0
--      (cash = amount_paid; no file attachment).
--   2) Marks commission_paid_at / commission_paid_by on every cash-bearing
--      payment proof that is still unreleased (executive payout).
--
-- Commission rates match the app: Office 0.5%, Personal 1% on cash only.
-- Safe to re-run (skips orders that already have a cash payment proof).
--
-- Run in: Supabase SQL Editor (any time after overhaul_reseed).
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Step 1: Backfill payment proofs from order payments
-- ---------------------------------------------------------------------------
WITH candidates AS (
  SELECT
    o.id              AS order_id,
    o.order_number,
    o.agent_name,
    o.amount_paid,
    COALESCE(o.actual_delivery, o.order_date) AS paid_on
  FROM orders o
  WHERE o.amount_paid > 0.01
    AND o.status NOT IN ('Draft', 'Cancelled', 'Rejected')
    AND NOT EXISTS (
      SELECT 1
      FROM order_proof_documents pd
      WHERE pd.order_id = o.id
        AND pd.type = 'payment'
        AND COALESCE(pd.payment_cash_amount, 0) > 0.01
    )
)
INSERT INTO order_proof_documents (
  order_id,
  type,
  file_name,
  file_url,
  file_size,
  uploaded_by,
  uploaded_by_role,
  status,
  verified_by,
  verified_at,
  title,
  payment_cash_amount,
  payment_credit_amount,
  payment_adjustment,
  uploaded_at
)
SELECT
  c.order_id,
  'payment'::proof_type,
  'payment-' || c.order_number || '-backfill',
  '',
  0,
  COALESCE(c.agent_name, 'Agent'),
  'Agent'::proof_uploader_role,
  'verified'::proof_status,
  'Finance Lead',
  c.paid_on::TIMESTAMPTZ + INTERVAL '18 hours',
  'Payment backfill (seed)',
  ROUND(c.amount_paid::NUMERIC, 2),
  0,
  0,
  c.paid_on::TIMESTAMPTZ + INTERVAL '17 hours'
FROM candidates c;

-- ---------------------------------------------------------------------------
-- Step 2: Release commission on all unreleased cash payment proofs
-- Payout timestamp = proof uploaded_at (falls in same month as order for analytics)
-- ---------------------------------------------------------------------------
UPDATE order_proof_documents pd
SET
  commission_paid_at = COALESCE(pd.uploaded_at, NOW()),
  commission_paid_by = 'Finance Lead (bulk release)'
WHERE pd.type = 'payment'
  AND COALESCE(pd.payment_cash_amount, 0) > 0.01
  AND pd.commission_paid_at IS NULL;

COMMIT;

-- ---------------------------------------------------------------------------
-- Verification (read-only)
-- ---------------------------------------------------------------------------
SELECT
  COUNT(*) FILTER (WHERE type = 'payment' AND COALESCE(payment_cash_amount, 0) > 0.01) AS cash_payment_proofs,
  COUNT(*) FILTER (
    WHERE type = 'payment'
      AND COALESCE(payment_cash_amount, 0) > 0.01
      AND commission_paid_at IS NOT NULL
  ) AS released_proofs,
  COUNT(*) FILTER (
    WHERE type = 'payment'
      AND COALESCE(payment_cash_amount, 0) > 0.01
      AND commission_paid_at IS NULL
  ) AS pending_release_proofs
FROM order_proof_documents;

SELECT
  ROUND(SUM(
    COALESCE(pd.payment_cash_amount, 0)
    * CASE WHEN c.client_type = 'Personal' THEN 0.01 ELSE 0.005 END
  ), 2) AS commissions_paid_out_total,
  ROUND(SUM(
    CASE WHEN pd.commission_paid_at IS NULL THEN
      COALESCE(pd.payment_cash_amount, 0)
      * CASE WHEN c.client_type = 'Personal' THEN 0.01 ELSE 0.005 END
    ELSE 0 END
  ), 2) AS commissions_pending_total
FROM order_proof_documents pd
JOIN orders o ON o.id = pd.order_id
LEFT JOIN customers c ON c.id = o.customer_id
WHERE pd.type = 'payment'
  AND COALESCE(pd.payment_cash_amount, 0) > 0.01;

-- Agent Analytics "Commission" card (last 30 days by payout date)
SELECT
  ROUND(SUM(
    COALESCE(pd.payment_cash_amount, 0)
    * CASE WHEN c.client_type = 'Personal' THEN 0.01 ELSE 0.005 END
  ), 2) AS commission_paid_last_30d
FROM order_proof_documents pd
JOIN orders o ON o.id = pd.order_id
LEFT JOIN customers c ON c.id = o.customer_id
WHERE pd.type = 'payment'
  AND COALESCE(pd.payment_cash_amount, 0) > 0.01
  AND pd.commission_paid_at IS NOT NULL
  AND pd.commission_paid_at >= (CURRENT_DATE - INTERVAL '30 days');
