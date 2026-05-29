-- Production request workflow notifications (in-app).
-- Run in Supabase SQL editor after notifications table exists.
-- Safe to re-run (idempotent CREATE OR REPLACE / ADD COLUMN IF NOT EXISTS).

ALTER TABLE production_requests ADD COLUMN IF NOT EXISTS created_by_auth_user_id UUID;
ALTER TABLE production_requests ADD COLUMN IF NOT EXISTS created_by_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE production_requests ADD COLUMN IF NOT EXISTS submitted_by TEXT;
ALTER TABLE production_requests ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE production_requests ADD COLUMN IF NOT EXISTS submitted_by_auth_user_id UUID;
ALTER TABLE production_requests ADD COLUMN IF NOT EXISTS submitted_by_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;

-- Resolve the auth user to notify for the employee who submitted this PR (same pattern as PO).
CREATE OR REPLACE FUNCTION resolve_pr_submitter_auth_user_id(p_pr_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pr RECORD;
  uid UUID;
  submitter TEXT;
  submitter_base TEXT;
BEGIN
  SELECT *
  INTO pr
  FROM production_requests
  WHERE id = p_pr_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF pr.submitted_by_auth_user_id IS NOT NULL THEN
    RETURN pr.submitted_by_auth_user_id;
  END IF;

  IF pr.submitted_by_employee_id IS NOT NULL THEN
    SELECT e.auth_user_id
    INTO uid
    FROM employees e
    WHERE e.id = pr.submitted_by_employee_id
      AND e.status = 'active'::employee_status
      AND e.auth_user_id IS NOT NULL;

    IF uid IS NOT NULL THEN
      RETURN uid;
    END IF;
  END IF;

  IF pr.created_by_auth_user_id IS NOT NULL THEN
    RETURN pr.created_by_auth_user_id;
  END IF;

  IF pr.created_by_employee_id IS NOT NULL THEN
    SELECT e.auth_user_id
    INTO uid
    FROM employees e
    WHERE e.id = pr.created_by_employee_id
      AND e.status = 'active'::employee_status
      AND e.auth_user_id IS NOT NULL;

    IF uid IS NOT NULL THEN
      RETURN uid;
    END IF;
  END IF;

  submitter := COALESCE(
    NULLIF(trim(pr.submitted_by), ''),
    (
      SELECT l.performed_by
      FROM production_request_logs l
      WHERE l.request_id = pr.id
        AND l.action = 'submitted'
      ORDER BY l.created_at DESC
      LIMIT 1
    ),
    NULLIF(trim(pr.created_by), ''),
    (
      SELECT l.performed_by
      FROM production_request_logs l
      WHERE l.request_id = pr.id
        AND l.action = 'drafted'
      ORDER BY l.created_at ASC
      LIMIT 1
    )
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
  ORDER BY e.updated_at DESC NULLS LAST
  LIMIT 1;

  RETURN uid;
END;
$$;

-- Submitted for approval: notify all active executives AND the submitter/creator.
-- Always notifies (fans out to everyone relevant) so a bell always appears regardless of who submits.
CREATE OR REPLACE FUNCTION notify_executives_pr_submitted_for_approval(p_pr_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pr RECORD;
  branch_name TEXT;
  line_count INT;
  msg TEXT;
  submitter_uid UUID;
  recipient UUID;
  recipients UUID[] := ARRAY[]::UUID[];
  inserted INT := 0;
BEGIN
  SELECT *
  INTO pr
  FROM production_requests
  WHERE id = p_pr_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Production request not found: %', p_pr_id;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = pr.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM production_request_items WHERE request_id = pr.id;

  msg := format(
    'PR %s submitted for approval by %s — %s, %s product line(s)',
    pr.pr_number,
    COALESCE(pr.submitted_by, pr.created_by, 'Unknown'),
    COALESCE(branch_name, 'No branch'),
    line_count
  );

  -- All active executives.
  SELECT COALESCE(array_agg(DISTINCT e.auth_user_id), ARRAY[]::UUID[])
  INTO recipients
  FROM employees e
  WHERE e.user_role = 'Executive'::user_role
    AND e.auth_user_id IS NOT NULL
    AND e.status = 'active'::employee_status;

  -- Plus the submitter/creator so they always get a confirmation in their bell.
  submitter_uid := resolve_pr_submitter_auth_user_id(p_pr_id);
  IF submitter_uid IS NOT NULL AND NOT (submitter_uid = ANY(recipients)) THEN
    recipients := array_append(recipients, submitter_uid);
  END IF;

  FOREACH recipient IN ARRAY recipients
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
      'Production request awaiting approval',
      msg,
      false,
      '/production-requests/' || pr.id::text,
      'Review PR',
      pr.branch_id,
      jsonb_build_object(
        'productionRequestId', pr.id,
        'prNumber', pr.pr_number,
        'submittedBy', pr.submitted_by,
        'createdBy', pr.created_by,
        'branchName', branch_name,
        'lineCount', line_count,
        'status', pr.status
      ),
      'production_request_submitted_for_approval'
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

-- Cancelled PR: always notify the submitter/creator AND all executives (deduped).
-- No self-cancel skip — a notification always fires regardless of who cancels.
CREATE OR REPLACE FUNCTION notify_pr_submitter_cancelled(
  p_pr_id UUID,
  p_cancelled_by TEXT DEFAULT NULL,
  p_cancellation_reason TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pr RECORD;
  submitter_uid UUID;
  branch_name TEXT;
  line_count INT;
  msg TEXT;
  recipient UUID;
  recipients UUID[] := ARRAY[]::UUID[];
  inserted INT := 0;
BEGIN
  SELECT *
  INTO pr
  FROM production_requests
  WHERE id = p_pr_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Production request not found: %', p_pr_id;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = pr.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM production_request_items WHERE request_id = pr.id;

  msg := format(
    'PR %s was cancelled by %s%s',
    pr.pr_number,
    COALESCE(NULLIF(trim(p_cancelled_by), ''), 'someone'),
    CASE
      WHEN p_cancellation_reason IS NOT NULL AND trim(p_cancellation_reason) <> ''
      THEN format('. Reason: %s', p_cancellation_reason)
      ELSE ''
    END
  );

  -- The submitter/creator of the PR.
  submitter_uid := resolve_pr_submitter_auth_user_id(p_pr_id);
  IF submitter_uid IS NOT NULL THEN
    recipients := array_append(recipients, submitter_uid);
  END IF;

  -- Plus all active executives so the change is always surfaced.
  SELECT COALESCE(array_agg(DISTINCT e.auth_user_id), ARRAY[]::UUID[])
  INTO recipients
  FROM (
    SELECT unnest(recipients) AS auth_user_id
    UNION
    SELECT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Executive'::user_role
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  ) e
  WHERE e.auth_user_id IS NOT NULL;

  FOREACH recipient IN ARRAY recipients
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
      'System'::notification_category,
      'Production request cancelled',
      msg,
      true,
      '/production-requests/' || pr.id::text,
      'View PR',
      pr.branch_id,
      jsonb_build_object(
        'productionRequestId', pr.id,
        'prNumber', pr.pr_number,
        'submittedBy', pr.submitted_by,
        'createdBy', pr.created_by,
        'cancelledBy', p_cancelled_by,
        'cancellationReason', p_cancellation_reason,
        'branchName', branch_name,
        'lineCount', line_count,
        'status', pr.status
      ),
      'production_request_cancelled'
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

-- Accepted PR: notify the employee who submitted it for approval.
CREATE OR REPLACE FUNCTION notify_pr_submitter_accepted(
  p_pr_id UUID,
  p_accepted_by TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pr RECORD;
  submitter_uid UUID;
  branch_name TEXT;
  line_count INT;
  msg TEXT;
BEGIN
  SELECT *
  INTO pr
  FROM production_requests
  WHERE id = p_pr_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Production request not found: %', p_pr_id;
  END IF;

  submitter_uid := resolve_pr_submitter_auth_user_id(p_pr_id);

  IF submitter_uid IS NULL THEN
    RETURN 0;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = pr.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM production_request_items WHERE request_id = pr.id;

  msg := format(
    'PR %s was accepted%s — ready to schedule production',
    pr.pr_number,
    CASE WHEN p_accepted_by IS NOT NULL AND trim(p_accepted_by) <> '' THEN format(' by %s', p_accepted_by) ELSE '' END
  );

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
    'Production request accepted',
    msg,
    false,
    '/production-requests/' || pr.id::text,
    'View PR',
    pr.branch_id,
    jsonb_build_object(
      'productionRequestId', pr.id,
      'prNumber', pr.pr_number,
      'submittedBy', pr.submitted_by,
      'createdBy', pr.created_by,
      'acceptedBy', p_accepted_by,
      'branchName', branch_name,
      'lineCount', line_count,
      'status', pr.status
    ),
    'production_request_accepted'
  );

  RETURN 1;
END;
$$;

-- Rejected PR: notify the employee who submitted it for approval.
CREATE OR REPLACE FUNCTION notify_pr_submitter_rejected(
  p_pr_id UUID,
  p_rejected_by TEXT DEFAULT NULL,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pr RECORD;
  submitter_uid UUID;
  branch_name TEXT;
  line_count INT;
  msg TEXT;
BEGIN
  SELECT *
  INTO pr
  FROM production_requests
  WHERE id = p_pr_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Production request not found: %', p_pr_id;
  END IF;

  submitter_uid := resolve_pr_submitter_auth_user_id(p_pr_id);

  IF submitter_uid IS NULL THEN
    RETURN 0;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = pr.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM production_request_items WHERE request_id = pr.id;

  msg := format(
    'PR %s was rejected%s%s',
    pr.pr_number,
    CASE WHEN p_rejected_by IS NOT NULL AND trim(p_rejected_by) <> '' THEN format(' by %s', p_rejected_by) ELSE '' END,
    CASE
      WHEN p_rejection_reason IS NOT NULL AND trim(p_rejection_reason) <> ''
      THEN format('. Reason: %s', p_rejection_reason)
      ELSE ''
    END
  );

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
    'Production request rejected',
    msg,
    true,
    '/production-requests/' || pr.id::text,
    'View PR',
    pr.branch_id,
    jsonb_build_object(
      'productionRequestId', pr.id,
      'prNumber', pr.pr_number,
      'submittedBy', pr.submitted_by,
      'createdBy', pr.created_by,
      'rejectedBy', p_rejected_by,
      'rejectionReason', p_rejection_reason,
      'branchName', branch_name,
      'lineCount', line_count,
      'status', pr.status
    ),
    'production_request_rejected'
  );

  RETURN 1;
END;
$$;

-- Production started: notify all active Warehouse staff AND Executives (deduped).
CREATE OR REPLACE FUNCTION notify_warehouse_and_executives_pr_started(
  p_pr_id UUID,
  p_started_by TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pr RECORD;
  branch_name TEXT;
  line_count INT;
  total_qty INT;
  msg TEXT;
  recipient UUID;
  recipients UUID[] := ARRAY[]::UUID[];
  inserted INT := 0;
BEGIN
  SELECT *
  INTO pr
  FROM production_requests
  WHERE id = p_pr_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Production request not found: %', p_pr_id;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = pr.branch_id;
  SELECT COUNT(*)::INT, COALESCE(SUM(quantity), 0)::INT
  INTO line_count, total_qty
  FROM production_request_items
  WHERE request_id = pr.id;

  msg := format(
    'PR %s production started%s — %s, %s product line(s), %s total unit(s)',
    pr.pr_number,
    CASE WHEN p_started_by IS NOT NULL AND trim(p_started_by) <> '' THEN format(' by %s', p_started_by) ELSE '' END,
    COALESCE(branch_name, 'No branch'),
    line_count,
    total_qty
  );

  SELECT COALESCE(array_agg(DISTINCT e.auth_user_id), ARRAY[]::UUID[])
  INTO recipients
  FROM employees e
  WHERE e.user_role IN ('Warehouse'::user_role, 'Executive'::user_role)
    AND e.auth_user_id IS NOT NULL
    AND e.status = 'active'::employee_status;

  FOREACH recipient IN ARRAY recipients
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
      'System'::notification_category,
      'Production started',
      msg,
      false,
      '/production-requests/' || pr.id::text,
      'View PR',
      pr.branch_id,
      jsonb_build_object(
        'productionRequestId', pr.id,
        'prNumber', pr.pr_number,
        'startedBy', p_started_by,
        'branchName', branch_name,
        'lineCount', line_count,
        'totalQuantity', total_qty,
        'status', pr.status
      ),
      'production_request_started'
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

-- Production recorded (new finished stock added): notify all active Warehouse staff.
CREATE OR REPLACE FUNCTION notify_warehouse_pr_inventory_added(
  p_pr_id UUID,
  p_recorded_by TEXT DEFAULT NULL,
  p_added_units NUMERIC DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pr RECORD;
  branch_name TEXT;
  line_count INT;
  produced_qty INT;
  msg TEXT;
  recipient UUID;
  recipients UUID[] := ARRAY[]::UUID[];
  inserted INT := 0;
BEGIN
  SELECT *
  INTO pr
  FROM production_requests
  WHERE id = p_pr_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Production request not found: %', p_pr_id;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = pr.branch_id;
  SELECT COUNT(*)::INT, COALESCE(SUM(quantity_completed), 0)::INT
  INTO line_count, produced_qty
  FROM production_request_items
  WHERE request_id = pr.id;

  msg := format(
    'PR %s added %s new unit(s) to %s stock%s — %s total unit(s) produced',
    pr.pr_number,
    COALESCE(to_char(p_added_units, 'FM999,999,990.##'), '0'),
    COALESCE(branch_name, 'branch'),
    CASE WHEN p_recorded_by IS NOT NULL AND trim(p_recorded_by) <> '' THEN format(' by %s', p_recorded_by) ELSE '' END,
    produced_qty
  );

  SELECT COALESCE(array_agg(DISTINCT e.auth_user_id), ARRAY[]::UUID[])
  INTO recipients
  FROM employees e
  WHERE e.user_role = 'Warehouse'::user_role
    AND e.auth_user_id IS NOT NULL
    AND e.status = 'active'::employee_status;

  FOREACH recipient IN ARRAY recipients
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
      'New inventory from production',
      msg,
      false,
      '/production-requests/' || pr.id::text,
      'View PR',
      pr.branch_id,
      jsonb_build_object(
        'productionRequestId', pr.id,
        'prNumber', pr.pr_number,
        'recordedBy', p_recorded_by,
        'addedUnits', p_added_units,
        'branchName', branch_name,
        'lineCount', line_count,
        'producedQuantity', produced_qty,
        'status', pr.status
      ),
      'production_request_inventory_added'
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

-- Production completed: notify all active Warehouse staff AND Executives (deduped).
CREATE OR REPLACE FUNCTION notify_warehouse_and_executives_pr_completed(
  p_pr_id UUID,
  p_completed_by TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pr RECORD;
  branch_name TEXT;
  line_count INT;
  total_qty INT;
  produced_qty INT;
  msg TEXT;
  recipient UUID;
  recipients UUID[] := ARRAY[]::UUID[];
  inserted INT := 0;
BEGIN
  SELECT *
  INTO pr
  FROM production_requests
  WHERE id = p_pr_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Production request not found: %', p_pr_id;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = pr.branch_id;
  SELECT COUNT(*)::INT, COALESCE(SUM(quantity), 0)::INT, COALESCE(SUM(quantity_completed), 0)::INT
  INTO line_count, total_qty, produced_qty
  FROM production_request_items
  WHERE request_id = pr.id;

  msg := format(
    'PR %s production completed%s — %s, %s product line(s), %s unit(s) produced',
    pr.pr_number,
    CASE WHEN p_completed_by IS NOT NULL AND trim(p_completed_by) <> '' THEN format(' by %s', p_completed_by) ELSE '' END,
    COALESCE(branch_name, 'No branch'),
    line_count,
    produced_qty
  );

  SELECT COALESCE(array_agg(DISTINCT e.auth_user_id), ARRAY[]::UUID[])
  INTO recipients
  FROM employees e
  WHERE e.user_role IN ('Warehouse'::user_role, 'Executive'::user_role)
    AND e.auth_user_id IS NOT NULL
    AND e.status = 'active'::employee_status;

  FOREACH recipient IN ARRAY recipients
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
      'System'::notification_category,
      'Production completed',
      msg,
      false,
      '/production-requests/' || pr.id::text,
      'View PR',
      pr.branch_id,
      jsonb_build_object(
        'productionRequestId', pr.id,
        'prNumber', pr.pr_number,
        'completedBy', p_completed_by,
        'branchName', branch_name,
        'lineCount', line_count,
        'totalQuantity', total_qty,
        'producedQuantity', produced_qty,
        'status', pr.status
      ),
      'production_request_completed'
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

-- Legacy alias (older migration names)
DROP FUNCTION IF EXISTS notify_pr_creator_cancelled(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS resolve_pr_creator_auth_user_id(UUID);
DROP FUNCTION IF EXISTS notify_executives_pr_completed(UUID, TEXT);

GRANT EXECUTE ON FUNCTION resolve_pr_submitter_auth_user_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_executives_pr_submitted_for_approval(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_pr_submitter_cancelled(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_pr_submitter_accepted(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_pr_submitter_rejected(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_warehouse_and_executives_pr_started(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_warehouse_pr_inventory_added(UUID, TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_warehouse_and_executives_pr_completed(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION resolve_pr_submitter_auth_user_id(UUID) IS
  'Resolve auth.users.id for the employee who submitted a production request.';
COMMENT ON FUNCTION notify_executives_pr_submitted_for_approval(UUID) IS
  'Fan-out in-app notification to all active Executive users when a PR is submitted for approval.';
COMMENT ON FUNCTION notify_pr_submitter_cancelled(UUID, TEXT, TEXT) IS
  'In-app notification to the employee who submitted a PR when it is cancelled by someone else.';
COMMENT ON FUNCTION notify_pr_submitter_accepted(UUID, TEXT) IS
  'In-app notification to the PR submitter when an executive accepts the request.';
COMMENT ON FUNCTION notify_pr_submitter_rejected(UUID, TEXT, TEXT) IS
  'In-app notification to the PR submitter when an executive rejects the request.';
COMMENT ON FUNCTION notify_warehouse_and_executives_pr_started(UUID, TEXT) IS
  'Fan-out in-app notification to all active Warehouse staff and Executives when PR production starts.';
COMMENT ON FUNCTION notify_warehouse_pr_inventory_added(UUID, TEXT, NUMERIC) IS
  'In-app notification to active Warehouse staff when recording production adds new finished stock.';
COMMENT ON FUNCTION notify_warehouse_and_executives_pr_completed(UUID, TEXT) IS
  'Fan-out in-app notification to all active Warehouse staff and Executives when PR production completes.';
