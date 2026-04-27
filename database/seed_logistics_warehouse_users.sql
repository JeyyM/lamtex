-- =============================================================================
-- Seed: Logistics & Warehouse staff — 2 of each per branch (Manila, Cebu, Batangas)
-- Password for all accounts: Lamtex@2026
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================================================

DO $$
DECLARE
  u_log_mnl_001 UUID;
  u_log_mnl_002 UUID;
  u_log_ceb_001 UUID;
  u_log_ceb_002 UUID;
  u_log_btg_001 UUID;
  u_log_btg_002 UUID;
  u_wh_mnl_001  UUID;
  u_wh_mnl_002  UUID;
  u_wh_ceb_001  UUID;
  u_wh_ceb_002  UUID;
  u_wh_btg_001  UUID;
  u_wh_btg_002  UUID;

  b_manila    UUID;
  b_cebu      UUID;
  b_batangas  UUID;

  inst UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
  -- Resolve branch IDs
  SELECT id INTO b_manila   FROM branches WHERE code = 'MNL' LIMIT 1;
  SELECT id INTO b_cebu     FROM branches WHERE code = 'CEB' LIMIT 1;
  SELECT id INTO b_batangas FROM branches WHERE code = 'BTG' LIMIT 1;

  -- ── 1. Ensure auth.users (re-runnable: skip if email already exists) ─────
  SELECT id INTO u_log_mnl_001 FROM auth.users WHERE email = 'miguel.santos.manila@lamtex.com' LIMIT 1;
  IF u_log_mnl_001 IS NULL THEN
    u_log_mnl_001 := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (u_log_mnl_001, inst, 'authenticated', 'authenticated', 'miguel.santos.manila@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', '');
  END IF;

  SELECT id INTO u_log_mnl_002 FROM auth.users WHERE email = 'jasmine.cruz.manila@lamtex.com' LIMIT 1;
  IF u_log_mnl_002 IS NULL THEN
    u_log_mnl_002 := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (u_log_mnl_002, inst, 'authenticated', 'authenticated', 'jasmine.cruz.manila@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', '');
  END IF;

  SELECT id INTO u_log_ceb_001 FROM auth.users WHERE email = 'ramon.delacruz.cebu@lamtex.com' LIMIT 1;
  IF u_log_ceb_001 IS NULL THEN
    u_log_ceb_001 := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (u_log_ceb_001, inst, 'authenticated', 'authenticated', 'ramon.delacruz.cebu@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', '');
  END IF;

  SELECT id INTO u_log_ceb_002 FROM auth.users WHERE email = 'elena.reyes.cebu@lamtex.com' LIMIT 1;
  IF u_log_ceb_002 IS NULL THEN
    u_log_ceb_002 := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (u_log_ceb_002, inst, 'authenticated', 'authenticated', 'elena.reyes.cebu@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', '');
  END IF;

  SELECT id INTO u_log_btg_001 FROM auth.users WHERE email = 'bernard.ocampo.batangas@lamtex.com' LIMIT 1;
  IF u_log_btg_001 IS NULL THEN
    u_log_btg_001 := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (u_log_btg_001, inst, 'authenticated', 'authenticated', 'bernard.ocampo.batangas@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', '');
  END IF;

  SELECT id INTO u_log_btg_002 FROM auth.users WHERE email = 'cynthia.bautista.batangas@lamtex.com' LIMIT 1;
  IF u_log_btg_002 IS NULL THEN
    u_log_btg_002 := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (u_log_btg_002, inst, 'authenticated', 'authenticated', 'cynthia.bautista.batangas@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', '');
  END IF;

  SELECT id INTO u_wh_mnl_001 FROM auth.users WHERE email = 'jose.ramos.manila@lamtex.com' LIMIT 1;
  IF u_wh_mnl_001 IS NULL THEN
    u_wh_mnl_001 := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (u_wh_mnl_001, inst, 'authenticated', 'authenticated', 'jose.ramos.manila@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', '');
  END IF;

  SELECT id INTO u_wh_mnl_002 FROM auth.users WHERE email = 'patricia.navarro.manila@lamtex.com' LIMIT 1;
  IF u_wh_mnl_002 IS NULL THEN
    u_wh_mnl_002 := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (u_wh_mnl_002, inst, 'authenticated', 'authenticated', 'patricia.navarro.manila@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', '');
  END IF;

  SELECT id INTO u_wh_ceb_001 FROM auth.users WHERE email = 'antonio.garces.cebu@lamtex.com' LIMIT 1;
  IF u_wh_ceb_001 IS NULL THEN
    u_wh_ceb_001 := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (u_wh_ceb_001, inst, 'authenticated', 'authenticated', 'antonio.garces.cebu@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', '');
  END IF;

  SELECT id INTO u_wh_ceb_002 FROM auth.users WHERE email = 'maria.ledesma.cebu@lamtex.com' LIMIT 1;
  IF u_wh_ceb_002 IS NULL THEN
    u_wh_ceb_002 := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (u_wh_ceb_002, inst, 'authenticated', 'authenticated', 'maria.ledesma.cebu@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', '');
  END IF;

  SELECT id INTO u_wh_btg_001 FROM auth.users WHERE email = 'roberto.mendoza.batangas@lamtex.com' LIMIT 1;
  IF u_wh_btg_001 IS NULL THEN
    u_wh_btg_001 := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (u_wh_btg_001, inst, 'authenticated', 'authenticated', 'roberto.mendoza.batangas@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', '');
  END IF;

  SELECT id INTO u_wh_btg_002 FROM auth.users WHERE email = 'luz.aguilar.batangas@lamtex.com' LIMIT 1;
  IF u_wh_btg_002 IS NULL THEN
    u_wh_btg_002 := gen_random_uuid();
    INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, confirmation_token, recovery_token, email_change_token_new, email_change)
    VALUES (u_wh_btg_002, inst, 'authenticated', 'authenticated', 'luz.aguilar.batangas@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false, '', '', '', '');
  END IF;

  -- ── 2. employees: upsert on unique email (re-runnable) ────────────────────
  INSERT INTO employees (employee_id, employee_name, email, role, branch_id, status, user_role, auth_user_id, join_date)
  VALUES
    ('LOG-MNL-001','Miguel Santos',        'miguel.santos.manila@lamtex.com',   'Logistics Manager', b_manila,   'active','Logistics', u_log_mnl_001, CURRENT_DATE),
    ('LOG-MNL-002','Jasmine Cruz',         'jasmine.cruz.manila@lamtex.com',    'Logistics Manager', b_manila,   'active','Logistics', u_log_mnl_002, CURRENT_DATE),
    ('LOG-CEB-001','Ramon Dela Cruz',      'ramon.delacruz.cebu@lamtex.com',    'Logistics Manager', b_cebu,     'active','Logistics', u_log_ceb_001, CURRENT_DATE),
    ('LOG-CEB-002','Elena Reyes',          'elena.reyes.cebu@lamtex.com',       'Logistics Manager', b_cebu,     'active','Logistics', u_log_ceb_002, CURRENT_DATE),
    ('LOG-BTG-001','Bernard Ocampo',       'bernard.ocampo.batangas@lamtex.com','Logistics Manager', b_batangas, 'active','Logistics', u_log_btg_001, CURRENT_DATE),
    ('LOG-BTG-002','Cynthia Bautista',     'cynthia.bautista.batangas@lamtex.com','Logistics Manager',b_batangas,'active','Logistics', u_log_btg_002, CURRENT_DATE),
    ('WH-MNL-001', 'Jose Ramos',          'jose.ramos.manila@lamtex.com',      'Warehouse Manager', b_manila,   'active','Warehouse', u_wh_mnl_001,  CURRENT_DATE),
    ('WH-MNL-002', 'Patricia Navarro',    'patricia.navarro.manila@lamtex.com','Warehouse Manager', b_manila,   'active','Warehouse', u_wh_mnl_002,  CURRENT_DATE),
    ('WH-CEB-001', 'Antonio Garces',      'antonio.garces.cebu@lamtex.com',    'Warehouse Manager', b_cebu,     'active','Warehouse', u_wh_ceb_001,  CURRENT_DATE),
    ('WH-CEB-002', 'Maria Ledesma',       'maria.ledesma.cebu@lamtex.com',     'Warehouse Manager', b_cebu,     'active','Warehouse', u_wh_ceb_002,  CURRENT_DATE),
    ('WH-BTG-001', 'Roberto Mendoza',     'roberto.mendoza.batangas@lamtex.com','Warehouse Manager', b_batangas,'active','Warehouse', u_wh_btg_001,  CURRENT_DATE),
    ('WH-BTG-002', 'Luz Aguilar',         'luz.aguilar.batangas@lamtex.com',   'Warehouse Manager', b_batangas, 'active','Warehouse', u_wh_btg_002,  CURRENT_DATE)
  ON CONFLICT (email) DO UPDATE SET
    employee_id  = EXCLUDED.employee_id,
    employee_name = EXCLUDED.employee_name,
    role          = EXCLUDED.role,
    branch_id     = EXCLUDED.branch_id,
    status        = EXCLUDED.status,
    user_role     = EXCLUDED.user_role,
    auth_user_id  = EXCLUDED.auth_user_id;

END $$;
