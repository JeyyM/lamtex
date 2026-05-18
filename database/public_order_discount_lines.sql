-- Supplementary RPC for the customer order portal.
-- Returns the per-line discount breakdown JSON for a given portal token.
-- Safe to run repeatedly (CREATE OR REPLACE).
--
-- Why it exists:
--   The main get_public_order_summary RPC may be deployed without the
--   discounts_breakdown / discountLines fields. This focused function lets
--   the customer page fetch the named per-discount entries
--   (e.g. "Disc 1 (10%)") without touching the larger function.

CREATE OR REPLACE FUNCTION public.get_public_order_discount_lines(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_portal order_customer_portals%ROWTYPE;
  v_lines  JSONB;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 8 THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT * INTO v_portal
  FROM order_customer_portals
  WHERE token = trim(p_token);

  IF NOT FOUND THEN
    RETURN '[]'::jsonb;
  END IF;

  IF v_portal.expires_at IS NOT NULL AND v_portal.expires_at < NOW() THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Same ORDER BY oli.created_at as get_public_order_summary's items array,
  -- so the frontend can merge by array index.
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'description', trim(concat_ws(' — ',
        NULLIF(oli.product_name, ''),
        NULLIF(oli.variant_description, '')
      )),
      'sku', oli.sku,
      'quantity', oli.quantity,
      'unitPrice', oli.unit_price,
      'lineTotal', oli.line_total,
      'discountAmount', COALESCE(oli.discount_amount, 0),
      'discountsBreakdown', COALESCE(oli.discounts_breakdown, '[]'::jsonb)
    ) ORDER BY oli.created_at
  ), '[]'::jsonb)
  INTO v_lines
  FROM order_line_items oli
  WHERE oli.order_id = v_portal.order_id;

  RETURN v_lines;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_order_discount_lines(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_order_discount_lines(TEXT) TO anon, authenticated;
