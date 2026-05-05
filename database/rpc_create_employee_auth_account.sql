-- -----------------------------------------------------------------------------
-- RPC: create_employee_auth_account
--
-- Lets an Executive (employees.user_role = 'Executive') create a Supabase Auth
-- user for an employee row and set employees.auth_user_id.
--
-- Requires: pgcrypto (crypt / gen_salt). On Supabase it usually lives in schema
-- "extensions". This file enables the extension and calls crypt/gen_salt with that
-- schema so SET search_path = public still works.
--
-- Run once in: Supabase Dashboard → SQL Editor
-- -----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.create_employee_auth_account(
  p_employee_id UUID,
  p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_is_exec BOOLEAN;
  v_email TEXT;
  v_auth_uid UUID;
  v_existing_link UUID;
  inst UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.auth_user_id = v_caller
      AND e.user_role IS NOT DISTINCT FROM 'Executive'::public.user_role
      AND e.status = 'active'
  )
  INTO v_is_exec;

  IF NOT COALESCE(v_is_exec, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT lower(trim(e.email)), e.auth_user_id
  INTO v_email, v_existing_link
  FROM public.employees e
  WHERE e.id = p_employee_id;

  IF v_email IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'employee_not_found');
  END IF;

  IF v_existing_link IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_linked');
  END IF;

  IF length(trim(COALESCE(p_password, ''))) < 8 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'password_too_short');
  END IF;

  -- Existing auth user for this email?
  SELECT u.id INTO v_auth_uid FROM auth.users u WHERE lower(trim(u.email)) = v_email LIMIT 1;

  IF v_auth_uid IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.employees e2
      WHERE e2.auth_user_id = v_auth_uid
        AND e2.id <> p_employee_id
    ) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'auth_email_claimed');
    END IF;

    UPDATE auth.users
    SET
      encrypted_password = extensions.crypt(trim(p_password), extensions.gen_salt('bf')),
      updated_at = now()
    WHERE id = v_auth_uid;
  ELSE
    v_auth_uid := gen_random_uuid();
    INSERT INTO auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      confirmation_token,
      recovery_token,
      email_change_token_current,
      email_change_token_new,
      email_change,
      phone_change_token,
      phone_change,
      reauthentication_token
    )
    VALUES (
      v_auth_uid,
      inst,
      'authenticated',
      'authenticated',
      v_email,
      extensions.crypt(trim(p_password), extensions.gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      false,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    );
  END IF;

  -- GoTrue: avoid NULL string token columns (see seed_executive_and_agent_auth_users.sql)
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
  WHERE id = v_auth_uid;

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  SELECT
    v_auth_uid,
    v_auth_uid,
    jsonb_build_object('sub', v_auth_uid::text, 'email', v_email),
    'email',
    v_auth_uid::text,
    now(),
    now(),
    now()
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.identities i WHERE i.user_id = v_auth_uid AND i.provider = 'email'
  );

  UPDATE public.employees
  SET
    auth_user_id = v_auth_uid,
    updated_at = now()
  WHERE id = p_employee_id;

  RETURN jsonb_build_object('ok', true, 'auth_user_id', v_auth_uid);
END;
$$;

REVOKE ALL ON FUNCTION public.create_employee_auth_account(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_employee_auth_account(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.create_employee_auth_account(UUID, TEXT) IS
  'Executive-only: create or link Supabase Auth login for an employee; sets employees.auth_user_id.';

-- -----------------------------------------------------------------------------
-- After you run this file, confirm the function exists in *this* database:
--
--   SELECT n.nspname AS schema, p.proname, pg_get_function_identity_arguments(p.oid) AS args
--   FROM pg_proc p
--   JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE p.proname = 'create_employee_auth_account';
--
-- If the row shows schema = public and args = p_employee_id uuid, p_password text,
-- but the app still says "schema cache", try reloading PostgREST's cache:
--
--   NOTIFY pgrst, 'reload schema';
--
-- Also verify the frontend .env uses this same Supabase project's URL (Dashboard → Settings → API).
-- -----------------------------------------------------------------------------
