-- =============================================================================
-- Seed: Truck drivers — 3 per branch (Manila, Cebu, Batangas) with login
-- Dashboard role: Driver (user_role). Job title enum: Truck Driver (role).
-- Password for all accounts: Lamtex@2026
-- Requires: branches MNL / CEB / BTG, user_role enum includes 'Driver',
--           employee_role enum includes 'Truck Driver' (see schema.sql).
-- Run in: Supabase Dashboard → SQL Editor (same as seed_logistics_warehouse_users.sql)
-- =============================================================================

DO $$
DECLARE
  u_drv_mnl_1 UUID;
  u_drv_mnl_2 UUID;
  u_drv_mnl_3 UUID;
  u_drv_ceb_1 UUID;
  u_drv_ceb_2 UUID;
  u_drv_ceb_3 UUID;
  u_drv_btg_1 UUID;
  u_drv_btg_2 UUID;
  u_drv_btg_3 UUID;

  b_manila   UUID;
  b_cebu     UUID;
  b_batangas UUID;

  inst UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
  SELECT id INTO b_manila    FROM branches WHERE code = 'MNL' LIMIT 1;
  SELECT id INTO b_cebu      FROM branches WHERE code = 'CEB' LIMIT 1;
  SELECT id INTO b_batangas  FROM branches WHERE code = 'BTG' LIMIT 1;

  IF b_manila IS NULL OR b_cebu IS NULL OR b_batangas IS NULL THEN
    RAISE EXCEPTION 'Branches MNL, CEB, BTG must exist before seeding drivers.';
  END IF;

  -- Manila
  SELECT id INTO u_drv_mnl_1 FROM auth.users WHERE email = 'danilo.ramos.drv.manila@lamtex.com' LIMIT 1;
  IF u_drv_mnl_1 IS NULL THEN
    u_drv_mnl_1 := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (u_drv_mnl_1, inst, 'authenticated', 'authenticated', 'danilo.ramos.drv.manila@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', '');
  END IF;

  SELECT id INTO u_drv_mnl_2 FROM auth.users WHERE email = 'ernesto.cruz.drv.manila@lamtex.com' LIMIT 1;
  IF u_drv_mnl_2 IS NULL THEN
    u_drv_mnl_2 := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (u_drv_mnl_2, inst, 'authenticated', 'authenticated', 'ernesto.cruz.drv.manila@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', '');
  END IF;

  SELECT id INTO u_drv_mnl_3 FROM auth.users WHERE email = 'ferdinand.reyes.drv.manila@lamtex.com' LIMIT 1;
  IF u_drv_mnl_3 IS NULL THEN
    u_drv_mnl_3 := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (u_drv_mnl_3, inst, 'authenticated', 'authenticated', 'ferdinand.reyes.drv.manila@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', '');
  END IF;

  -- Cebu
  SELECT id INTO u_drv_ceb_1 FROM auth.users WHERE email = 'gregorio.salazar.drv.cebu@lamtex.com' LIMIT 1;
  IF u_drv_ceb_1 IS NULL THEN
    u_drv_ceb_1 := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (u_drv_ceb_1, inst, 'authenticated', 'authenticated', 'gregorio.salazar.drv.cebu@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', '');
  END IF;

  SELECT id INTO u_drv_ceb_2 FROM auth.users WHERE email = 'hernando.tolentino.drv.cebu@lamtex.com' LIMIT 1;
  IF u_drv_ceb_2 IS NULL THEN
    u_drv_ceb_2 := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (u_drv_ceb_2, inst, 'authenticated', 'authenticated', 'hernando.tolentino.drv.cebu@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', '');
  END IF;

  SELECT id INTO u_drv_ceb_3 FROM auth.users WHERE email = 'isidro.ramos.drv.cebu@lamtex.com' LIMIT 1;
  IF u_drv_ceb_3 IS NULL THEN
    u_drv_ceb_3 := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (u_drv_ceb_3, inst, 'authenticated', 'authenticated', 'isidro.ramos.drv.cebu@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', '');
  END IF;

  -- Batangas
  SELECT id INTO u_drv_btg_1 FROM auth.users WHERE email = 'jaime.navarro.drv.batangas@lamtex.com' LIMIT 1;
  IF u_drv_btg_1 IS NULL THEN
    u_drv_btg_1 := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (u_drv_btg_1, inst, 'authenticated', 'authenticated', 'jaime.navarro.drv.batangas@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', '');
  END IF;

  SELECT id INTO u_drv_btg_2 FROM auth.users WHERE email = 'karlo.paredes.drv.batangas@lamtex.com' LIMIT 1;
  IF u_drv_btg_2 IS NULL THEN
    u_drv_btg_2 := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (u_drv_btg_2, inst, 'authenticated', 'authenticated', 'karlo.paredes.drv.batangas@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', '');
  END IF;

  SELECT id INTO u_drv_btg_3 FROM auth.users WHERE email = 'lorenzo.dizon.drv.batangas@lamtex.com' LIMIT 1;
  IF u_drv_btg_3 IS NULL THEN
    u_drv_btg_3 := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (u_drv_btg_3, inst, 'authenticated', 'authenticated', 'lorenzo.dizon.drv.batangas@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', '');
  END IF;

  INSERT INTO employees (employee_id, employee_name, email, phone, role, department, branch_id, status, user_role, auth_user_id, join_date)
  VALUES
    ('DRV-MNL-001', 'Danilo Ramos',       'danilo.ramos.drv.manila@lamtex.com',       '+63 917 000 1001', 'Truck Driver', 'Logistics', b_manila,   'active', 'Driver', u_drv_mnl_1, CURRENT_DATE),
    ('DRV-MNL-002', 'Ernesto Cruz',       'ernesto.cruz.drv.manila@lamtex.com',       '+63 917 000 1002', 'Truck Driver', 'Logistics', b_manila,   'active', 'Driver', u_drv_mnl_2, CURRENT_DATE),
    ('DRV-MNL-003', 'Ferdinand Reyes',    'ferdinand.reyes.drv.manila@lamtex.com',    '+63 917 000 1003', 'Truck Driver', 'Logistics', b_manila,   'active', 'Driver', u_drv_mnl_3, CURRENT_DATE),
    ('DRV-CEB-001', 'Gregorio Salazar',   'gregorio.salazar.drv.cebu@lamtex.com',     '+63 917 000 2001', 'Truck Driver', 'Logistics', b_cebu,     'active', 'Driver', u_drv_ceb_1, CURRENT_DATE),
    ('DRV-CEB-002', 'Hernando Tolentino', 'hernando.tolentino.drv.cebu@lamtex.com',    '+63 917 000 2002', 'Truck Driver', 'Logistics', b_cebu,     'active', 'Driver', u_drv_ceb_2, CURRENT_DATE),
    ('DRV-CEB-003', 'Isidro Ramos',       'isidro.ramos.drv.cebu@lamtex.com',         '+63 917 000 2003', 'Truck Driver', 'Logistics', b_cebu,     'active', 'Driver', u_drv_ceb_3, CURRENT_DATE),
    ('DRV-BTG-001', 'Jaime Navarro',      'jaime.navarro.drv.batangas@lamtex.com',    '+63 917 000 3001', 'Truck Driver', 'Logistics', b_batangas, 'active', 'Driver', u_drv_btg_1, CURRENT_DATE),
    ('DRV-BTG-002', 'Karlo Paredes',      'karlo.paredes.drv.batangas@lamtex.com',    '+63 917 000 3002', 'Truck Driver', 'Logistics', b_batangas, 'active', 'Driver', u_drv_btg_2, CURRENT_DATE),
    ('DRV-BTG-003', 'Lorenzo Dizon',      'lorenzo.dizon.drv.batangas@lamtex.com',    '+63 917 000 3003', 'Truck Driver', 'Logistics', b_batangas, 'active', 'Driver', u_drv_btg_3, CURRENT_DATE)
  ON CONFLICT (email) DO UPDATE SET
    employee_id   = EXCLUDED.employee_id,
    employee_name = EXCLUDED.employee_name,
    phone         = EXCLUDED.phone,
    role          = EXCLUDED.role,
    department    = EXCLUDED.department,
    branch_id     = EXCLUDED.branch_id,
    status        = EXCLUDED.status,
    user_role     = EXCLUDED.user_role,
    auth_user_id  = EXCLUDED.auth_user_id;

  -- Email provider identity (required for password sign-in on current Supabase Auth).
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
  WHERE u.email IN (
    'danilo.ramos.drv.manila@lamtex.com',
    'ernesto.cruz.drv.manila@lamtex.com',
    'ferdinand.reyes.drv.manila@lamtex.com',
    'gregorio.salazar.drv.cebu@lamtex.com',
    'hernando.tolentino.drv.cebu@lamtex.com',
    'isidro.ramos.drv.cebu@lamtex.com',
    'jaime.navarro.drv.batangas@lamtex.com',
    'karlo.paredes.drv.batangas@lamtex.com',
    'lorenzo.dizon.drv.batangas@lamtex.com'
  )
  AND NOT EXISTS (
    SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email'
  );

END $$;
