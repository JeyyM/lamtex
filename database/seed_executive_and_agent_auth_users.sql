-- =============================================================================
-- Seed: Auth users for LoginPage Executive + Sales Agent presets
-- Password (matches src/pages/LoginPage.tsx): Lamtex@2026
--
-- Why: Logistics/Warehouse are created in seed_logistics_warehouse_users.sql;
--      Executive and Agent rows were never in auth.users, so sign-in fails
--      (often surfaced as "Database error querying schema" when identities
--      are missing on current Supabase Auth).
--
-- If login still returns 500 / "Database error querying schema", run
-- fix_auth_users_token_nulls_for_login.sql (NULL token columns vs GoTrue).
--
-- Also ensures auth.identities (email) for ALL LoginPage preset emails so
-- logistics/warehouse accounts created before the identities step was added
-- still work.
--
-- Run in: Supabase Dashboard → SQL Editor (requires pgcrypto for crypt()).
-- Re-runnable: skips existing users; only adds missing identity rows.
-- =============================================================================

DO $$
DECLARE
  inst UUID := '00000000-0000-0000-0000-000000000000';
  -- Only these need auth.users rows created here (others: logistics/warehouse seed).
  need_auth_user TEXT[] := ARRAY[
    'executive@lamtex.com',
    'ana.reyes.manila@lamtex.com',
    'carlos.buenaventura.manila@lamtex.com',
    'rica.lim.manila@lamtex.com',
    'marco.villanueva.cebu@lamtex.com',
    'sofia.tan.cebu@lamtex.com',
    'diego.flores.cebu@lamtex.com',
    'leo.marasigan.batangas@lamtex.com',
    'nina.ilagan.batangas@lamtex.com',
    'roy.castillo.batangas@lamtex.com'
  ];
  -- Every email shown on LoginPage quick-select (identity backfill).
  all_login_presets TEXT[] := ARRAY[
    'executive@lamtex.com',
    'ana.reyes.manila@lamtex.com',
    'carlos.buenaventura.manila@lamtex.com',
    'rica.lim.manila@lamtex.com',
    'miguel.santos.manila@lamtex.com',
    'jasmine.cruz.manila@lamtex.com',
    'jose.ramos.manila@lamtex.com',
    'patricia.navarro.manila@lamtex.com',
    'marco.villanueva.cebu@lamtex.com',
    'sofia.tan.cebu@lamtex.com',
    'diego.flores.cebu@lamtex.com',
    'ramon.delacruz.cebu@lamtex.com',
    'elena.reyes.cebu@lamtex.com',
    'antonio.garces.cebu@lamtex.com',
    'maria.ledesma.cebu@lamtex.com',
    'leo.marasigan.batangas@lamtex.com',
    'nina.ilagan.batangas@lamtex.com',
    'roy.castillo.batangas@lamtex.com',
    'bernard.ocampo.batangas@lamtex.com',
    'cynthia.bautista.batangas@lamtex.com',
    'roberto.mendoza.batangas@lamtex.com',
    'luz.aguilar.batangas@lamtex.com'
  ];
  em TEXT;
  uid UUID;
BEGIN
  FOREACH em IN ARRAY need_auth_user
  LOOP
    SELECT id INTO uid FROM auth.users WHERE email = em LIMIT 1;
    IF uid IS NULL THEN
      uid := gen_random_uuid();
      -- confirmed_at is a generated column on hosted Supabase; set email_confirmed_at only.
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
        '', '',
        '', '', '',
        '', '',
        ''
      );
    END IF;
  END LOOP;

  -- GoTrue cannot scan NULL into string fields on these columns (auth#1940).
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
  WHERE confirmation_token IS NULL
     OR recovery_token IS NULL
     OR email_change_token_current IS NULL
     OR email_change_token_new IS NULL
     OR email_change IS NULL
     OR phone_change_token IS NULL
     OR phone_change IS NULL
     OR reauthentication_token IS NULL;

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
  WHERE u.email = ANY (all_login_presets)
    AND NOT EXISTS (
      SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email'
    );

  UPDATE employees e
  SET auth_user_id = u.id
  FROM auth.users u
  WHERE e.email = u.email
    AND u.email = ANY (all_login_presets)
    AND (e.auth_user_id IS DISTINCT FROM u.id);
END $$;
