-- PO proof upload notifications (Executive + Warehouse) + automatic trigger on insert.
-- Run in Supabase SQL editor (required for proof notifications to work).

CREATE OR REPLACE FUNCTION notify_executives_po_proof_uploaded(
  p_po_id UUID,
  p_proof_type TEXT DEFAULT 'delivery',
  p_uploaded_by TEXT DEFAULT NULL,
  p_proof_count INT DEFAULT 1,
  p_proof_title TEXT DEFAULT NULL,
  p_payment_amount NUMERIC DEFAULT 0
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  po RECORD;
  recipient RECORD;
  branch_name TEXT;
  supplier_name TEXT;
  line_count INT;
  proof_type_norm TEXT;
  proof_label TEXT;
  uploaded_suffix TEXT;
  notif_title TEXT;
  notif_category notification_category;
  event_type_val TEXT;
  msg TEXT;
  inserted INT := 0;
BEGIN
  proof_type_norm := lower(trim(COALESCE(p_proof_type, 'delivery')));
  IF proof_type_norm NOT IN ('delivery', 'payment', 'other') THEN
    RAISE EXCEPTION 'Invalid proof type: % (expected delivery, payment, or other)', p_proof_type;
  END IF;

  SELECT *
  INTO po
  FROM purchase_orders
  WHERE id = p_po_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found: %', p_po_id;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = po.branch_id;
  SELECT name INTO supplier_name FROM suppliers WHERE id = po.supplier_id;
  SELECT COUNT(*)::INT INTO line_count FROM purchase_order_items WHERE order_id = po.id;

  proof_label := CASE proof_type_norm
    WHEN 'delivery' THEN
      CASE WHEN COALESCE(p_proof_count, 1) <= 1 THEN '1 delivery proof' ELSE format('%s delivery proofs', COALESCE(p_proof_count, 1)) END
    WHEN 'payment' THEN
      CASE WHEN COALESCE(p_proof_count, 1) <= 1 THEN '1 payment proof' ELSE format('%s payment proofs', COALESCE(p_proof_count, 1)) END
    ELSE
      CASE WHEN COALESCE(p_proof_count, 1) <= 1 THEN '1 other document' ELSE format('%s other documents', COALESCE(p_proof_count, 1)) END
  END;

  uploaded_suffix := CASE
    WHEN p_uploaded_by IS NOT NULL AND trim(p_uploaded_by) <> '' THEN format(' by %s', p_uploaded_by)
    ELSE ''
  END;

  notif_title := CASE proof_type_norm
    WHEN 'delivery' THEN 'PO delivery proof uploaded'
    WHEN 'payment' THEN 'PO payment proof uploaded'
    ELSE 'PO other document uploaded'
  END;

  notif_category := CASE proof_type_norm
    WHEN 'delivery' THEN 'Delivery'::notification_category
    WHEN 'payment' THEN 'Payment'::notification_category
    ELSE 'System'::notification_category
  END;

  event_type_val := CASE proof_type_norm
    WHEN 'delivery' THEN 'purchase_order_delivery_proof_uploaded'
    WHEN 'payment' THEN 'purchase_order_payment_proof_uploaded'
    ELSE 'purchase_order_other_proof_uploaded'
  END;

  msg := format(
    '%s uploaded for PO %s (%s)%s',
    proof_label,
    po.po_number,
    COALESCE(supplier_name, 'supplier'),
    uploaded_suffix
  );

  IF p_proof_title IS NOT NULL AND trim(p_proof_title) <> '' THEN
    msg := msg || format(' — %s', trim(p_proof_title));
  END IF;

  IF proof_type_norm = 'payment' AND COALESCE(p_payment_amount, 0) > 0 THEN
    msg := msg || format(
      ' (%s%s)',
      CASE WHEN po.currency = 'USD' THEN '$' ELSE '₱' END,
      to_char(COALESCE(p_payment_amount, 0), 'FM999,999,990.00')
    );
  END IF;

  -- Executive + Warehouse (same audience pattern as PO receive notifications).
  FOR recipient IN
    SELECT DISTINCT e.auth_user_id
    FROM employees e
    WHERE e.user_role IN ('Executive'::user_role, 'Warehouse'::user_role)
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      recipient.auth_user_id,
      notif_category,
      notif_title,
      msg,
      false,
      '/purchase-orders/' || po.id::text,
      'View PO',
      po.branch_id,
      jsonb_build_object(
        'purchaseOrderId', po.id,
        'poNumber', po.po_number,
        'supplierName', supplier_name,
        'branchName', branch_name,
        'totalAmount', po.total_amount,
        'amountPaid', po.amount_paid,
        'paymentStatus', po.payment_status,
        'currency', po.currency,
        'lineCount', line_count,
        'status', po.status,
        'uploadedBy', p_uploaded_by,
        'proofCount', COALESCE(p_proof_count, 1),
        'proofType', proof_type_norm,
        'proofTitle', p_proof_title,
        'paymentAmount', COALESCE(p_payment_amount, 0)
      ),
      event_type_val
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

-- The app calls this RPC directly from the client after inserting proof rows
-- (same pattern as notify_agent_order_*_proof_uploaded on the order detail page).
-- Any legacy AFTER INSERT trigger is dropped here to avoid double notifications.
DROP TRIGGER IF EXISTS trg_po_proof_document_notify ON public.purchase_order_proof_documents;
DROP FUNCTION IF EXISTS trg_po_proof_document_notify();

GRANT EXECUTE ON FUNCTION notify_executives_po_proof_uploaded(UUID, TEXT, TEXT, INT, TEXT, NUMERIC) TO authenticated;

COMMENT ON FUNCTION notify_executives_po_proof_uploaded(UUID, TEXT, TEXT, INT, TEXT, NUMERIC) IS
  'In-app notification to active Executive and Warehouse users when a PO proof document is uploaded.';
