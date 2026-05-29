-- Inter-branch request (IBR) workflow notifications (in-app bell).
-- Run in Supabase SQL editor after inter_branch_requests tables exist.
-- Safe to re-run (idempotent CREATE OR REPLACE).

-- Fan-out in-app notifications to active Warehouse staff at a branch.
CREATE OR REPLACE FUNCTION ibr_notify_warehouse_branch(
  p_branch_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_ibr_id UUID,
  p_event_type TEXT,
  p_metadata JSONB,
  p_category notification_category DEFAULT 'Inventory'::notification_category,
  p_urgent BOOLEAN DEFAULT false
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient UUID;
  inserted INT := 0;
BEGIN
  IF p_branch_id IS NULL THEN
    RETURN 0;
  END IF;

  FOR recipient IN
    SELECT DISTINCT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Warehouse'::user_role
      AND e.branch_id = p_branch_id
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
      recipient,
      p_category,
      p_title,
      p_message,
      p_urgent,
      '/inter-branch-requests/' || p_ibr_id::text,
      'View IBR',
      p_branch_id,
      p_metadata,
      p_event_type
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

-- Submitted for approval: notify all active executives.
CREATE OR REPLACE FUNCTION notify_executives_ibr_submitted_for_approval(p_ibr_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ibr RECORD;
  req_name TEXT;
  ful_name TEXT;
  line_count INT;
  msg TEXT;
  recipient UUID;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO ibr
  FROM inter_branch_requests
  WHERE id = p_ibr_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inter-branch request not found: %', p_ibr_id;
  END IF;

  IF ibr.status IS DISTINCT FROM 'Pending' THEN
    RAISE EXCEPTION 'IBR % is not Pending (current: %)', ibr.ibr_number, ibr.status;
  END IF;

  SELECT name INTO req_name FROM branches WHERE id = ibr.requesting_branch_id;
  SELECT name INTO ful_name FROM branches WHERE id = ibr.fulfilling_branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM inter_branch_request_items WHERE request_id = ibr.id;

  msg := format(
    'IBR %s submitted for approval — %s → %s, %s line(s)',
    ibr.ibr_number,
    COALESCE(req_name, 'Requesting branch'),
    COALESCE(ful_name, 'Fulfilling branch'),
    line_count
  );

  FOR recipient IN
    SELECT DISTINCT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Executive'::user_role
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
      recipient,
      'Approvals'::notification_category,
      'Inter-branch request awaiting approval',
      msg,
      false,
      '/inter-branch-requests/' || ibr.id::text,
      'Review IBR',
      ibr.requesting_branch_id,
      jsonb_build_object(
        'interBranchRequestId', ibr.id,
        'ibrNumber', ibr.ibr_number,
        'requestingBranchId', ibr.requesting_branch_id,
        'fulfillingBranchId', ibr.fulfilling_branch_id,
        'requestingBranchName', req_name,
        'fulfillingBranchName', ful_name,
        'submittedBy', ibr.created_by,
        'lineCount', line_count,
        'status', ibr.status
      ),
      'ibr_submitted_for_approval'
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

-- Approved: notify warehouse staff at both branches.
CREATE OR REPLACE FUNCTION notify_both_branches_ibr_approved(
  p_ibr_id UUID,
  p_approved_by TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ibr RECORD;
  req_name TEXT;
  ful_name TEXT;
  line_count INT;
  msg TEXT;
  meta JSONB;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO ibr
  FROM inter_branch_requests
  WHERE id = p_ibr_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inter-branch request not found: %', p_ibr_id;
  END IF;

  IF ibr.status IS DISTINCT FROM 'Approved' THEN
    RAISE EXCEPTION 'IBR % is not Approved (current: %)', ibr.ibr_number, ibr.status;
  END IF;

  SELECT name INTO req_name FROM branches WHERE id = ibr.requesting_branch_id;
  SELECT name INTO ful_name FROM branches WHERE id = ibr.fulfilling_branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM inter_branch_request_items WHERE request_id = ibr.id;

  msg := format(
    'IBR %s approved%s — %s → %s, %s line(s)',
    ibr.ibr_number,
    CASE WHEN p_approved_by IS NOT NULL AND trim(p_approved_by) <> '' THEN format(' by %s', p_approved_by) ELSE '' END,
    COALESCE(req_name, 'Requesting branch'),
    COALESCE(ful_name, 'Fulfilling branch'),
    line_count
  );

  meta := jsonb_build_object(
    'interBranchRequestId', ibr.id,
    'ibrNumber', ibr.ibr_number,
    'requestingBranchId', ibr.requesting_branch_id,
    'fulfillingBranchId', ibr.fulfilling_branch_id,
    'requestingBranchName', req_name,
    'fulfillingBranchName', ful_name,
    'approvedBy', p_approved_by,
    'lineCount', line_count,
    'status', ibr.status
  );

  inserted := inserted + ibr_notify_warehouse_branch(
    ibr.requesting_branch_id,
    'Inter-branch request approved',
    msg,
    ibr.id,
    'ibr_approved',
    meta,
    'Inventory'::notification_category,
    false
  );

  inserted := inserted + ibr_notify_warehouse_branch(
    ibr.fulfilling_branch_id,
    'Inter-branch request approved',
    msg,
    ibr.id,
    'ibr_approved',
    meta,
    'Inventory'::notification_category,
    false
  );

  RETURN inserted;
END;
$$;

-- Logistics status at fulfilling branch: notify requesting branch warehouse only.
CREATE OR REPLACE FUNCTION notify_requesting_branch_ibr_status(
  p_ibr_id UUID,
  p_status TEXT,
  p_actor TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ibr RECORD;
  req_name TEXT;
  ful_name TEXT;
  line_count INT;
  title TEXT;
  msg TEXT;
  meta JSONB;
BEGIN
  IF p_status NOT IN ('Scheduled', 'Loading', 'Packed', 'Ready', 'In Transit') THEN
    RAISE EXCEPTION 'Unsupported IBR logistics status for requesting-branch notify: %', p_status;
  END IF;

  SELECT *
  INTO ibr
  FROM inter_branch_requests
  WHERE id = p_ibr_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inter-branch request not found: %', p_ibr_id;
  END IF;

  IF ibr.status IS DISTINCT FROM p_status THEN
    RAISE EXCEPTION 'IBR % status mismatch (expected %, current: %)', ibr.ibr_number, p_status, ibr.status;
  END IF;

  SELECT name INTO req_name FROM branches WHERE id = ibr.requesting_branch_id;
  SELECT name INTO ful_name FROM branches WHERE id = ibr.fulfilling_branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM inter_branch_request_items WHERE request_id = ibr.id;

  title := CASE p_status
    WHEN 'Scheduled' THEN 'Inter-branch shipment scheduled'
    WHEN 'Loading' THEN 'Inter-branch shipment loading'
    WHEN 'Packed' THEN 'Inter-branch shipment packed'
    WHEN 'Ready' THEN 'Inter-branch shipment ready'
    WHEN 'In Transit' THEN 'Inter-branch shipment in transit'
    ELSE 'Inter-branch status update'
  END;

  msg := format(
    'IBR %s is now %s%s — from %s to %s',
    ibr.ibr_number,
    p_status,
    CASE WHEN p_actor IS NOT NULL AND trim(p_actor) <> '' THEN format(' (updated by %s)', p_actor) ELSE '' END,
    COALESCE(ful_name, 'Fulfilling branch'),
    COALESCE(req_name, 'Requesting branch')
  );

  meta := jsonb_build_object(
    'interBranchRequestId', ibr.id,
    'ibrNumber', ibr.ibr_number,
    'requestingBranchId', ibr.requesting_branch_id,
    'fulfillingBranchId', ibr.fulfilling_branch_id,
    'requestingBranchName', req_name,
    'fulfillingBranchName', ful_name,
    'status', ibr.status,
    'actor', p_actor,
    'lineCount', line_count,
    'scheduledDepartureDate', ibr.scheduled_departure_date
  );

  RETURN ibr_notify_warehouse_branch(
    ibr.requesting_branch_id,
    title,
    msg,
    ibr.id,
    'ibr_' || lower(replace(p_status, ' ', '_')),
    meta,
    'Delivery'::notification_category,
    false
  );
END;
$$;

-- Delivery recorded: notify warehouse staff at both branches.
CREATE OR REPLACE FUNCTION notify_both_branches_ibr_delivery_recorded(
  p_ibr_id UUID,
  p_actor TEXT DEFAULT NULL,
  p_new_status TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ibr RECORD;
  req_name TEXT;
  ful_name TEXT;
  line_count INT;
  effective_status TEXT;
  msg TEXT;
  meta JSONB;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO ibr
  FROM inter_branch_requests
  WHERE id = p_ibr_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inter-branch request not found: %', p_ibr_id;
  END IF;

  effective_status := COALESCE(NULLIF(trim(p_new_status), ''), ibr.status);

  IF effective_status NOT IN ('Delivered', 'Partially Fulfilled') THEN
    RAISE EXCEPTION 'IBR % delivery notify requires Delivered or Partially Fulfilled (current: %)', ibr.ibr_number, effective_status;
  END IF;

  SELECT name INTO req_name FROM branches WHERE id = ibr.requesting_branch_id;
  SELECT name INTO ful_name FROM branches WHERE id = ibr.fulfilling_branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM inter_branch_request_items WHERE request_id = ibr.id;

  msg := format(
    'IBR %s delivery recorded at %s → %s%s',
    ibr.ibr_number,
    COALESCE(req_name, 'Requesting branch'),
    effective_status,
    CASE WHEN p_actor IS NOT NULL AND trim(p_actor) <> '' THEN format(' by %s', p_actor) ELSE '' END
  );

  meta := jsonb_build_object(
    'interBranchRequestId', ibr.id,
    'ibrNumber', ibr.ibr_number,
    'requestingBranchId', ibr.requesting_branch_id,
    'fulfillingBranchId', ibr.fulfilling_branch_id,
    'requestingBranchName', req_name,
    'fulfillingBranchName', ful_name,
    'status', effective_status,
    'recordedBy', p_actor,
    'lineCount', line_count
  );

  inserted := inserted + ibr_notify_warehouse_branch(
    ibr.requesting_branch_id,
    'Inter-branch delivery recorded',
    msg,
    ibr.id,
    'ibr_delivery_recorded',
    meta,
    'Delivery'::notification_category,
    false
  );

  inserted := inserted + ibr_notify_warehouse_branch(
    ibr.fulfilling_branch_id,
    'Inter-branch delivery recorded',
    msg,
    ibr.id,
    'ibr_delivery_recorded',
    meta,
    'Delivery'::notification_category,
    false
  );

  RETURN inserted;
END;
$$;

-- Fulfilled (closed): notify both branches + executives.
CREATE OR REPLACE FUNCTION notify_both_branches_and_executives_ibr_fulfilled(
  p_ibr_id UUID,
  p_fulfilled_by TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ibr RECORD;
  req_name TEXT;
  ful_name TEXT;
  line_count INT;
  msg TEXT;
  meta JSONB;
  recipient UUID;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO ibr
  FROM inter_branch_requests
  WHERE id = p_ibr_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inter-branch request not found: %', p_ibr_id;
  END IF;

  IF ibr.status IS DISTINCT FROM 'Fulfilled' THEN
    RAISE EXCEPTION 'IBR % is not Fulfilled (current: %)', ibr.ibr_number, ibr.status;
  END IF;

  SELECT name INTO req_name FROM branches WHERE id = ibr.requesting_branch_id;
  SELECT name INTO ful_name FROM branches WHERE id = ibr.fulfilling_branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM inter_branch_request_items WHERE request_id = ibr.id;

  msg := format(
    'IBR %s marked fulfilled and closed%s — %s ↔ %s',
    ibr.ibr_number,
    CASE WHEN p_fulfilled_by IS NOT NULL AND trim(p_fulfilled_by) <> '' THEN format(' by %s', p_fulfilled_by) ELSE '' END,
    COALESCE(req_name, 'Requesting branch'),
    COALESCE(ful_name, 'Fulfilling branch')
  );

  meta := jsonb_build_object(
    'interBranchRequestId', ibr.id,
    'ibrNumber', ibr.ibr_number,
    'requestingBranchId', ibr.requesting_branch_id,
    'fulfillingBranchId', ibr.fulfilling_branch_id,
    'requestingBranchName', req_name,
    'fulfillingBranchName', ful_name,
    'fulfilledBy', p_fulfilled_by,
    'lineCount', line_count,
    'status', ibr.status
  );

  inserted := inserted + ibr_notify_warehouse_branch(
    ibr.requesting_branch_id,
    'Inter-branch request fulfilled',
    msg,
    ibr.id,
    'ibr_fulfilled',
    meta,
    'Inventory'::notification_category,
    false
  );

  inserted := inserted + ibr_notify_warehouse_branch(
    ibr.fulfilling_branch_id,
    'Inter-branch request fulfilled',
    msg,
    ibr.id,
    'ibr_fulfilled',
    meta,
    'Inventory'::notification_category,
    false
  );

  FOR recipient IN
    SELECT DISTINCT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Executive'::user_role
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
      recipient,
      'Inventory'::notification_category,
      'Inter-branch request fulfilled',
      msg,
      false,
      '/inter-branch-requests/' || ibr.id::text,
      'View IBR',
      ibr.requesting_branch_id,
      meta,
      'ibr_fulfilled'
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

-- Cancelled: notify warehouse staff at both branches.
CREATE OR REPLACE FUNCTION notify_both_branches_ibr_cancelled(
  p_ibr_id UUID,
  p_cancelled_by TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ibr RECORD;
  req_name TEXT;
  ful_name TEXT;
  line_count INT;
  msg TEXT;
  meta JSONB;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO ibr
  FROM inter_branch_requests
  WHERE id = p_ibr_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inter-branch request not found: %', p_ibr_id;
  END IF;

  IF ibr.status IS DISTINCT FROM 'Cancelled' THEN
    RAISE EXCEPTION 'IBR % is not Cancelled (current: %)', ibr.ibr_number, ibr.status;
  END IF;

  SELECT name INTO req_name FROM branches WHERE id = ibr.requesting_branch_id;
  SELECT name INTO ful_name FROM branches WHERE id = ibr.fulfilling_branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM inter_branch_request_items WHERE request_id = ibr.id;

  msg := format(
    'IBR %s cancelled%s%s — %s → %s',
    ibr.ibr_number,
    CASE WHEN p_cancelled_by IS NOT NULL AND trim(p_cancelled_by) <> '' THEN format(' by %s', p_cancelled_by) ELSE '' END,
    CASE WHEN p_note IS NOT NULL AND trim(p_note) <> '' THEN format(': %s', p_note) ELSE '' END,
    COALESCE(req_name, 'Requesting branch'),
    COALESCE(ful_name, 'Fulfilling branch')
  );

  meta := jsonb_build_object(
    'interBranchRequestId', ibr.id,
    'ibrNumber', ibr.ibr_number,
    'requestingBranchId', ibr.requesting_branch_id,
    'fulfillingBranchId', ibr.fulfilling_branch_id,
    'requestingBranchName', req_name,
    'fulfillingBranchName', ful_name,
    'cancelledBy', p_cancelled_by,
    'note', p_note,
    'lineCount', line_count,
    'status', ibr.status
  );

  inserted := inserted + ibr_notify_warehouse_branch(
    ibr.requesting_branch_id,
    'Inter-branch request cancelled',
    msg,
    ibr.id,
    'ibr_cancelled',
    meta,
    'System'::notification_category,
    false
  );

  inserted := inserted + ibr_notify_warehouse_branch(
    ibr.fulfilling_branch_id,
    'Inter-branch request cancelled',
    msg,
    ibr.id,
    'ibr_cancelled',
    meta,
    'System'::notification_category,
    false
  );

  RETURN inserted;
END;
$$;

-- Resolve auth.users.id for the employee who submitted an IBR (requesting branch).
CREATE OR REPLACE FUNCTION resolve_ibr_submitter_auth_user_id(p_ibr_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ibr RECORD;
  uid UUID;
  submitter TEXT;
  submitter_base TEXT;
BEGIN
  SELECT *
  INTO ibr
  FROM inter_branch_requests
  WHERE id = p_ibr_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  submitter := COALESCE(
    (
      SELECT l.performed_by
      FROM inter_branch_request_logs l
      WHERE l.inter_branch_request_id = ibr.id
        AND l.action = 'submitted'
      ORDER BY l.created_at DESC
      LIMIT 1
    ),
    NULLIF(trim(ibr.created_by), '')
  );

  IF submitter IS NULL THEN
    RETURN NULL;
  END IF;

  submitter_base := trim(split_part(submitter, ' (', 1));

  IF position('@' IN submitter) > 0 THEN
    SELECT u.id
    INTO uid
    FROM auth.users u
    WHERE lower(u.email) = lower(trim(submitter))
    LIMIT 1;

    IF uid IS NOT NULL THEN
      RETURN uid;
    END IF;
  END IF;

  SELECT e.auth_user_id
  INTO uid
  FROM employees e
  WHERE e.status = 'active'::employee_status
    AND e.auth_user_id IS NOT NULL
    AND (
      e.employee_name = submitter
      OR e.email = submitter
      OR lower(trim(e.employee_name)) = lower(trim(submitter))
      OR lower(trim(e.employee_name)) = lower(submitter_base)
      OR lower(split_part(e.email, '@', 1)) = lower(trim(submitter))
      OR lower(split_part(e.email, '@', 1)) = lower(submitter_base)
    )
  ORDER BY
    CASE WHEN e.branch_id = ibr.requesting_branch_id THEN 0 ELSE 1 END,
    e.updated_at DESC NULLS LAST
  LIMIT 1;

  RETURN uid;
END;
$$;

-- Rejected: notify the submitter, or requesting-branch warehouse staff as fallback.
CREATE OR REPLACE FUNCTION notify_ibr_submitter_rejected(
  p_ibr_id UUID,
  p_rejected_by TEXT DEFAULT NULL,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ibr RECORD;
  submitter_uid UUID;
  req_name TEXT;
  ful_name TEXT;
  line_count INT;
  msg TEXT;
  meta JSONB;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO ibr
  FROM inter_branch_requests
  WHERE id = p_ibr_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inter-branch request not found: %', p_ibr_id;
  END IF;

  IF ibr.status IS DISTINCT FROM 'Rejected' THEN
    RAISE EXCEPTION 'IBR % is not Rejected (current: %)', ibr.ibr_number, ibr.status;
  END IF;

  SELECT name INTO req_name FROM branches WHERE id = ibr.requesting_branch_id;
  SELECT name INTO ful_name FROM branches WHERE id = ibr.fulfilling_branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM inter_branch_request_items WHERE request_id = ibr.id;

  msg := format(
    'IBR %s was rejected%s%s',
    ibr.ibr_number,
    CASE WHEN p_rejected_by IS NOT NULL AND trim(p_rejected_by) <> '' THEN format(' by %s', p_rejected_by) ELSE '' END,
    CASE
      WHEN p_rejection_reason IS NOT NULL AND trim(p_rejection_reason) <> ''
      THEN format('. Reason: %s', p_rejection_reason)
      ELSE ''
    END
  );

  meta := jsonb_build_object(
    'interBranchRequestId', ibr.id,
    'ibrNumber', ibr.ibr_number,
    'requestingBranchId', ibr.requesting_branch_id,
    'fulfillingBranchId', ibr.fulfilling_branch_id,
    'requestingBranchName', req_name,
    'fulfillingBranchName', ful_name,
    'createdBy', ibr.created_by,
    'rejectedBy', p_rejected_by,
    'rejectionReason', p_rejection_reason,
    'lineCount', line_count,
    'status', ibr.status
  );

  submitter_uid := resolve_ibr_submitter_auth_user_id(p_ibr_id);

  IF submitter_uid IS NOT NULL THEN
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
      submitter_uid,
      'Approvals'::notification_category,
      'Inter-branch request rejected',
      msg,
      true,
      '/inter-branch-requests/' || ibr.id::text,
      'View IBR',
      ibr.requesting_branch_id,
      meta,
      'ibr_rejected'
    );
    inserted := 1;
  ELSE
    inserted := ibr_notify_warehouse_branch(
      ibr.requesting_branch_id,
      'Inter-branch request rejected',
      msg,
      ibr.id,
      'ibr_rejected',
      meta,
      'Approvals'::notification_category,
      true
    );
  END IF;

  RETURN inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION ibr_notify_warehouse_branch(UUID, TEXT, TEXT, UUID, TEXT, JSONB, notification_category, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_ibr_submitter_auth_user_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_executives_ibr_submitted_for_approval(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_both_branches_ibr_approved(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_requesting_branch_ibr_status(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_both_branches_ibr_delivery_recorded(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_both_branches_and_executives_ibr_fulfilled(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_both_branches_ibr_cancelled(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_ibr_submitter_rejected(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION ibr_notify_warehouse_branch(UUID, TEXT, TEXT, UUID, TEXT, JSONB, notification_category, BOOLEAN) IS
  'Insert in-app notifications for active Warehouse staff at a branch for an IBR event.';
COMMENT ON FUNCTION notify_executives_ibr_submitted_for_approval(UUID) IS
  'Fan-out in-app notification to all active Executive users when an IBR is submitted for approval.';
COMMENT ON FUNCTION notify_both_branches_ibr_approved(UUID, TEXT) IS
  'Fan-out in-app notification to Warehouse staff at requesting and fulfilling branches when an IBR is approved.';
COMMENT ON FUNCTION notify_requesting_branch_ibr_status(UUID, TEXT, TEXT) IS
  'Notify requesting-branch Warehouse staff on IBR logistics milestones (Scheduled, Loading, Packed, Ready, In Transit).';
COMMENT ON FUNCTION notify_both_branches_ibr_delivery_recorded(UUID, TEXT, TEXT) IS
  'Notify Warehouse staff at both branches when delivery is recorded at the requesting branch.';
COMMENT ON FUNCTION notify_both_branches_and_executives_ibr_fulfilled(UUID, TEXT) IS
  'Notify both branches and all Executives when an IBR is marked fulfilled and closed.';
COMMENT ON FUNCTION notify_both_branches_ibr_cancelled(UUID, TEXT, TEXT) IS
  'Notify Warehouse staff at both branches when an IBR is cancelled.';
COMMENT ON FUNCTION resolve_ibr_submitter_auth_user_id(UUID) IS
  'Resolve auth.users.id for the employee who submitted an inter-branch request.';
COMMENT ON FUNCTION notify_ibr_submitter_rejected(UUID, TEXT, TEXT) IS
  'In-app notification to the IBR submitter (or requesting-branch warehouse fallback) when rejected.';
