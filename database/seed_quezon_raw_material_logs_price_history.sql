-- =============================================================================
-- Seed: Quezon demo raw_material_logs — catalog unit cost changes over time
--
-- Inserts material_updated rows with old_value/new_value.cost_per_unit so the
-- material detail Analytics "Unit price history" chart can plot months without POs
-- (see MaterialDetailPage priceHistoryData merge with materialLogRows).
--
-- Requires: QZN raw materials (seed_quezon_raw_materials_and_supplier_links.sql).
-- Re-runnable: deletes prior rows tagged metadata.demo_seed = quezon_price_history.
-- =============================================================================

DELETE FROM raw_material_logs
WHERE metadata @> '{"demo_seed": "quezon_price_history"}'::jsonb;

INSERT INTO raw_material_logs (
  raw_material_id,
  action,
  performed_by,
  performed_by_role,
  description,
  old_value,
  new_value,
  metadata,
  created_at
)
SELECT
  rm.id,
  'material_updated',
  'Quezon Demo',
  'Admin',
  'Catalog unit cost updated (demo price trail).',
  jsonb_build_object('cost_per_unit', step.old_p),
  jsonb_build_object('cost_per_unit', step.new_p),
  jsonb_build_object('demo_seed', 'quezon_price_history'),
  step.ts
FROM raw_materials rm
JOIN (
  SELECT *
  FROM (VALUES
    -- QZN-RM-PVC-001 — ends at 92 (matches seed cost_per_unit)
    ('QZN-RM-PVC-001'::text, 110::numeric, 106::numeric, (date_trunc('month', NOW()) - interval '14 months' + interval '2 days 10 hours')::timestamptz),
    ('QZN-RM-PVC-001', 106, 102, (date_trunc('month', NOW()) - interval '12 months' + interval '2 days 10 hours')::timestamptz),
    ('QZN-RM-PVC-001', 102,  99, (date_trunc('month', NOW()) - interval '10 months' + interval '2 days 10 hours')::timestamptz),
    ('QZN-RM-PVC-001',  99,  96, (date_trunc('month', NOW()) - interval '8 months' + interval '2 days 10 hours')::timestamptz),
    ('QZN-RM-PVC-001',  96,  94, (date_trunc('month', NOW()) - interval '6 months' + interval '2 days 10 hours')::timestamptz),
    ('QZN-RM-PVC-001',  94,  93, (date_trunc('month', NOW()) - interval '4 months' + interval '2 days 10 hours')::timestamptz),
    ('QZN-RM-PVC-001',  93,  92, (date_trunc('month', NOW()) - interval '2 months' + interval '2 days 10 hours')::timestamptz),
    -- QZN-RM-HDPE-001 — ends at 78
    ('QZN-RM-HDPE-001',  88::numeric, 85::numeric, (date_trunc('month', NOW()) - interval '11 months' + interval '3 days 11 hours')::timestamptz),
    ('QZN-RM-HDPE-001',  85,  82, (date_trunc('month', NOW()) - interval '7 months' + interval '3 days 11 hours')::timestamptz),
    ('QZN-RM-HDPE-001',  82,  80, (date_trunc('month', NOW()) - interval '4 months' + interval '3 days 11 hours')::timestamptz),
    ('QZN-RM-HDPE-001',  80,  78, (date_trunc('month', NOW()) - interval '1 month' + interval '3 days 11 hours')::timestamptz)
  ) AS t(sku, old_p, new_p, ts)
) step ON rm.sku = step.sku;
