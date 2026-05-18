-- =============================================================================
-- Quezon branch + demo employees (matches LoginPage quick-select presets)
--
-- Inserts/upserts:
--   • branches row code QZN, name Quezon (must match src/constants/lamtexBranches.ts)
--   • auth.users + auth.identities (password Lamtex@2026), same pattern as other seeds
--   • employees: 3 Sales Agents, 2 Logistics Managers, 2 Warehouse Managers
--
-- Run in Supabase SQL Editor after schema exists. Re-runnable.
-- Then run database/seed_executive_and_agent_auth_users.sql if you refresh auth/identities.
-- =============================================================================

DO $$
DECLARE
  b_quezon uuid;
  inst uuid := '00000000-0000-0000-0000-000000000000';
  em text;
  uid uuid;
  quezon_login_emails text[] := ARRAY[
    'ina.morales.quezon@lamtex.com',
    'gabriel.ramos.quezon@lamtex.com',
    'michelle.dy.quezon@lamtex.com',
    'armand.vergara.quezon@lamtex.com',
    'denise.lopez.quezon@lamtex.com',
    'warren.castro.quezon@lamtex.com',
    'hannah.torres.quezon@lamtex.com'
  ];
BEGIN
  INSERT INTO branches (code, name, is_active)
  VALUES ('QZN', 'Quezon', TRUE)
  ON CONFLICT (code) DO UPDATE SET
    name      = EXCLUDED.name,
    is_active = EXCLUDED.is_active;

  SELECT id INTO b_quezon FROM branches WHERE code = 'QZN' LIMIT 1;
  IF b_quezon IS NULL THEN
    RAISE EXCEPTION 'seed_quezon_branch_employees: branch QZN missing';
  END IF;

  FOREACH em IN ARRAY quezon_login_emails
  LOOP
    SELECT id INTO uid FROM auth.users WHERE email = em LIMIT 1;
    IF uid IS NULL THEN
      uid := gen_random_uuid();
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        is_super_admin,
        confirmation_token, recovery_token,
        email_change_token_current, email_change_token_new, email_change,
        phone_change_token, phone_change,
        reauthentication_token
      )
      VALUES (
        uid, inst, 'authenticated', 'authenticated', em, crypt('Lamtex@2026', gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}', '{}',
        false,
        '', '', '', '', '', '', '', ''
      );
    END IF;
  END LOOP;

  UPDATE auth.users
  SET
    confirmation_token         = COALESCE(confirmation_token, ''),
    recovery_token             = COALESCE(recovery_token, ''),
    email_change_token_current = COALESCE(email_change_token_current, ''),
    email_change_token_new     = COALESCE(email_change_token_new, ''),
    email_change               = COALESCE(email_change, ''),
    phone_change_token         = COALESCE(phone_change_token, ''),
    phone_change               = COALESCE(phone_change, ''),
    reauthentication_token     = COALESCE(reauthentication_token, '')
  WHERE email = ANY (quezon_login_emails)
    AND (
      confirmation_token IS NULL
      OR recovery_token IS NULL
      OR email_change_token_current IS NULL
      OR email_change_token_new IS NULL
      OR email_change IS NULL
      OR phone_change_token IS NULL
      OR phone_change IS NULL
      OR reauthentication_token IS NULL
    );

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  SELECT
    u.id,
    u.id,
    jsonb_build_object('sub', u.id::text, 'email', u.email),
    'email',
    u.id::text,
    now(),
    now(),
    now()
  FROM auth.users u
  WHERE u.email = ANY (quezon_login_emails)
    AND NOT EXISTS (
      SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email'
    );

  INSERT INTO employees (
    employee_id, employee_name, email, role, branch_id, status, user_role, system_role, auth_user_id, join_date
  )
  VALUES
    (
      'AGT-QZN-001', 'Ina Morales', 'ina.morales.quezon@lamtex.com',
      'Sales Agent', b_quezon, 'active', 'Agent', 'Agent',
      (SELECT id FROM auth.users WHERE email = 'ina.morales.quezon@lamtex.com' LIMIT 1),
      CURRENT_DATE
    ),
    (
      'AGT-QZN-002', 'Gabriel Ramos', 'gabriel.ramos.quezon@lamtex.com',
      'Sales Agent', b_quezon, 'active', 'Agent', 'Agent',
      (SELECT id FROM auth.users WHERE email = 'gabriel.ramos.quezon@lamtex.com' LIMIT 1),
      CURRENT_DATE
    ),
    (
      'AGT-QZN-003', 'Michelle Dy', 'michelle.dy.quezon@lamtex.com',
      'Sales Agent', b_quezon, 'active', 'Agent', 'Agent',
      (SELECT id FROM auth.users WHERE email = 'michelle.dy.quezon@lamtex.com' LIMIT 1),
      CURRENT_DATE
    ),
    (
      'LOG-QZN-001', 'Armand Vergara', 'armand.vergara.quezon@lamtex.com',
      'Logistics Manager', b_quezon, 'active', 'Logistics', NULL,
      (SELECT id FROM auth.users WHERE email = 'armand.vergara.quezon@lamtex.com' LIMIT 1),
      CURRENT_DATE
    ),
    (
      'LOG-QZN-002', 'Denise Lopez', 'denise.lopez.quezon@lamtex.com',
      'Logistics Manager', b_quezon, 'active', 'Logistics', NULL,
      (SELECT id FROM auth.users WHERE email = 'denise.lopez.quezon@lamtex.com' LIMIT 1),
      CURRENT_DATE
    ),
    (
      'WH-QZN-001', 'Warren Castro', 'warren.castro.quezon@lamtex.com',
      'Warehouse Manager', b_quezon, 'active', 'Warehouse', NULL,
      (SELECT id FROM auth.users WHERE email = 'warren.castro.quezon@lamtex.com' LIMIT 1),
      CURRENT_DATE
    ),
    (
      'WH-QZN-002', 'Hannah Torres', 'hannah.torres.quezon@lamtex.com',
      'Warehouse Manager', b_quezon, 'active', 'Warehouse', NULL,
      (SELECT id FROM auth.users WHERE email = 'hannah.torres.quezon@lamtex.com' LIMIT 1),
      CURRENT_DATE
    )
  ON CONFLICT (email) DO UPDATE SET
    employee_id   = EXCLUDED.employee_id,
    employee_name = EXCLUDED.employee_name,
    role          = EXCLUDED.role,
    branch_id     = EXCLUDED.branch_id,
    status        = EXCLUDED.status,
    user_role     = EXCLUDED.user_role,
    system_role   = EXCLUDED.system_role,
    auth_user_id  = EXCLUDED.auth_user_id;

  UPDATE employees e
  SET auth_user_id = u.id
  FROM auth.users u
  WHERE e.email = u.email
    AND u.email = ANY (quezon_login_emails)
    AND (e.auth_user_id IS DISTINCT FROM u.id);
END $$;
