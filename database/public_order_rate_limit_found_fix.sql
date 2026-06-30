-- Hotfix: PL/pgSQL treats bare "found" as the special FOUND variable, not the
-- public_order_access_attempts.found column → error 42702 (ambiguous column).
-- Qualify with table alias.

CREATE OR REPLACE FUNCTION public.public_order_access_guard()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ip       TEXT := public.current_request_ip();
  v_fail_10m INT;
  v_fail_1m  INT;
BEGIN
  SELECT count(*) INTO v_fail_10m
  FROM public.public_order_access_attempts a
  WHERE a.ip = v_ip
    AND a.found = FALSE
    AND a.created_at > NOW() - INTERVAL '10 minutes';

  IF v_fail_10m >= 30 THEN
    RETURN 'rate_limited';
  END IF;

  SELECT count(*) INTO v_fail_1m
  FROM public.public_order_access_attempts a
  WHERE a.ip = v_ip
    AND a.found = FALSE
    AND a.created_at > NOW() - INTERVAL '1 minute';

  IF v_fail_1m >= 60 THEN
    RETURN 'rate_limited';
  END IF;

  RETURN NULL;
END;
$$;

NOTIFY pgrst, 'reload schema';
