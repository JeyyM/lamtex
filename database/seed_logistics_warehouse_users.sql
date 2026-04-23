-- =============================================================================
-- Seed: Logistics & Warehouse staff — 2 of each per branch (Manila, Cebu, Batangas)
-- Password for all accounts: Lamtex@2026
-- Run this in: Supabase Dashboard → SQL Editor
-- =============================================================================

DO $$
DECLARE
  -- Auth user UUIDs (generated once, referenced below)
  u_log_mnl_001 UUID := gen_random_uuid();
  u_log_mnl_002 UUID := gen_random_uuid();
  u_log_ceb_001 UUID := gen_random_uuid();
  u_log_ceb_002 UUID := gen_random_uuid();
  u_log_btg_001 UUID := gen_random_uuid();
  u_log_btg_002 UUID := gen_random_uuid();

  u_wh_mnl_001  UUID := gen_random_uuid();
  u_wh_mnl_002  UUID := gen_random_uuid();
  u_wh_ceb_001  UUID := gen_random_uuid();
  u_wh_ceb_002  UUID := gen_random_uuid();
  u_wh_btg_001  UUID := gen_random_uuid();
  u_wh_btg_002  UUID := gen_random_uuid();

  -- Branch UUIDs (looked up by name)
  b_manila    UUID;
  b_cebu      UUID;
  b_batangas  UUID;

BEGIN
  -- Resolve branch IDs
  SELECT id INTO b_manila   FROM branches WHERE name = 'Manila'   LIMIT 1;
  SELECT id INTO b_cebu     FROM branches WHERE name = 'Cebu'     LIMIT 1;
  SELECT id INTO b_batangas FROM branches WHERE name = 'Batangas' LIMIT 1;

  -- ── 1. Create Supabase auth.users ────────────────────────────────────────
  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES
    -- LOGISTICS — Manila
    (u_log_mnl_001,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
     'miguel.santos.manila@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')),
     now(), now(), now(),
     '{"provider":"email","providers":["email"]}','{}',false,'','','',''),

    (u_log_mnl_002,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
     'jasmine.cruz.manila@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')),
     now(), now(), now(),
     '{"provider":"email","providers":["email"]}','{}',false,'','','',''),

    -- LOGISTICS — Cebu
    (u_log_ceb_001,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
     'ramon.delacruz.cebu@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')),
     now(), now(), now(),
     '{"provider":"email","providers":["email"]}','{}',false,'','','',''),

    (u_log_ceb_002,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
     'elena.reyes.cebu@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')),
     now(), now(), now(),
     '{"provider":"email","providers":["email"]}','{}',false,'','','',''),

    -- LOGISTICS — Batangas
    (u_log_btg_001,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
     'bernard.ocampo.batangas@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')),
     now(), now(), now(),
     '{"provider":"email","providers":["email"]}','{}',false,'','','',''),

    (u_log_btg_002,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
     'cynthia.bautista.batangas@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')),
     now(), now(), now(),
     '{"provider":"email","providers":["email"]}','{}',false,'','','',''),

    -- WAREHOUSE — Manila
    (u_wh_mnl_001,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
     'jose.ramos.manila@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')),
     now(), now(), now(),
     '{"provider":"email","providers":["email"]}','{}',false,'','','',''),

    (u_wh_mnl_002,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
     'patricia.navarro.manila@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')),
     now(), now(), now(),
     '{"provider":"email","providers":["email"]}','{}',false,'','','',''),

    -- WAREHOUSE — Cebu
    (u_wh_ceb_001,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
     'antonio.garces.cebu@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')),
     now(), now(), now(),
     '{"provider":"email","providers":["email"]}','{}',false,'','','',''),

    (u_wh_ceb_002,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
     'maria.ledesma.cebu@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')),
     now(), now(), now(),
     '{"provider":"email","providers":["email"]}','{}',false,'','','',''),

    -- WAREHOUSE — Batangas
    (u_wh_btg_001,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
     'roberto.mendoza.batangas@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')),
     now(), now(), now(),
     '{"provider":"email","providers":["email"]}','{}',false,'','','',''),

    (u_wh_btg_002,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
     'luz.aguilar.batangas@lamtex.com', crypt('Lamtex@2026', gen_salt('bf')),
     now(), now(), now(),
     '{"provider":"email","providers":["email"]}','{}',false,'','','','');

  -- ── 2. Insert into employees table ───────────────────────────────────────
  INSERT INTO employees
    (employee_id, employee_name, email, role, branch_id, status, user_role, auth_user_id, join_date)
  VALUES
    -- LOGISTICS — Manila
    ('LOG-MNL-001','Miguel Santos',        'miguel.santos.manila@lamtex.com',   'Logistics Manager', b_manila,   'active','Logistics', u_log_mnl_001, CURRENT_DATE),
    ('LOG-MNL-002','Jasmine Cruz',         'jasmine.cruz.manila@lamtex.com',    'Logistics Manager', b_manila,   'active','Logistics', u_log_mnl_002, CURRENT_DATE),
    -- LOGISTICS — Cebu
    ('LOG-CEB-001','Ramon Dela Cruz',      'ramon.delacruz.cebu@lamtex.com',    'Logistics Manager', b_cebu,     'active','Logistics', u_log_ceb_001, CURRENT_DATE),
    ('LOG-CEB-002','Elena Reyes',          'elena.reyes.cebu@lamtex.com',       'Logistics Manager', b_cebu,     'active','Logistics', u_log_ceb_002, CURRENT_DATE),
    -- LOGISTICS — Batangas
    ('LOG-BTG-001','Bernard Ocampo',       'bernard.ocampo.batangas@lamtex.com','Logistics Manager', b_batangas, 'active','Logistics', u_log_btg_001, CURRENT_DATE),
    ('LOG-BTG-002','Cynthia Bautista',     'cynthia.bautista.batangas@lamtex.com','Logistics Manager',b_batangas,'active','Logistics', u_log_btg_002, CURRENT_DATE),
    -- WAREHOUSE — Manila
    ('WH-MNL-001', 'Jose Ramos',          'jose.ramos.manila@lamtex.com',      'Warehouse Manager', b_manila,   'active','Warehouse', u_wh_mnl_001,  CURRENT_DATE),
    ('WH-MNL-002', 'Patricia Navarro',    'patricia.navarro.manila@lamtex.com','Warehouse Manager', b_manila,   'active','Warehouse', u_wh_mnl_002,  CURRENT_DATE),
    -- WAREHOUSE — Cebu
    ('WH-CEB-001', 'Antonio Garces',      'antonio.garces.cebu@lamtex.com',    'Warehouse Manager', b_cebu,     'active','Warehouse', u_wh_ceb_001,  CURRENT_DATE),
    ('WH-CEB-002', 'Maria Ledesma',       'maria.ledesma.cebu@lamtex.com',     'Warehouse Manager', b_cebu,     'active','Warehouse', u_wh_ceb_002,  CURRENT_DATE),
    -- WAREHOUSE — Batangas
    ('WH-BTG-001', 'Roberto Mendoza',     'roberto.mendoza.batangas@lamtex.com','Warehouse Manager', b_batangas,'active','Warehouse', u_wh_btg_001,  CURRENT_DATE),
    ('WH-BTG-002', 'Luz Aguilar',         'luz.aguilar.batangas@lamtex.com',   'Warehouse Manager', b_batangas, 'active','Warehouse', u_wh_btg_002,  CURRENT_DATE);

END $$;
