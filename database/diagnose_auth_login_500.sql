-- =============================================================================
-- Diagnose: HTTP 500 on POST /auth/v1/token?grant_type=password
-- Run sections in Supabase SQL Editor. Auth service logs (Dashboard → Logs)
-- showGoTrue’s real Postgres error (e.g. trigger on auth.users).
-- =============================================================================

-- 1) Preset accounts: confirmation + identity linkage
SELECT
  u.id,
  u.email,
  u.email_confirmed_at,
  u.confirmed_at,
  u.last_sign_in_at,
  (SELECT COUNT(*) FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email') AS email_identities
FROM auth.users u
WHERE u.email LIKE '%@lamtex.com'
ORDER BY u.email;

-- 2) Triggers on auth.users (bad triggers often cause 500 during login / last_sign_in update)
SELECT tgname AS trigger_name, pg_get_triggerdef(t.oid, true) AS definition
FROM pg_trigger t
WHERE t.tgrelid = 'auth.users'::regclass
  AND NOT t.tgisinternal
ORDER BY tgname;

-- 3) Duplicate email identities (should be at most one email row per user_id)
SELECT user_id, provider, COUNT(*) AS n
FROM auth.identities
WHERE provider = 'email'
GROUP BY user_id, provider
HAVING COUNT(*) > 1;

-- 4) NULL token columns break GoTrue Scan → 500 / "Database error querying schema" (auth#1940)
SELECT COUNT(*) FILTER (WHERE confirmation_token IS NULL) AS null_confirmation_token,
       COUNT(*) FILTER (WHERE recovery_token IS NULL) AS null_recovery_token,
       COUNT(*) FILTER (WHERE email_change_token_current IS NULL) AS null_email_change_token_current,
       COUNT(*) FILTER (WHERE email_change_token_new IS NULL) AS null_email_change_token_new,
       COUNT(*) FILTER (WHERE email_change IS NULL) AS null_email_change,
       COUNT(*) FILTER (WHERE phone_change_token IS NULL) AS null_phone_change_token,
       COUNT(*) FILTER (WHERE phone_change IS NULL) AS null_phone_change,
       COUNT(*) FILTER (WHERE reauthentication_token IS NULL) AS null_reauthentication_token
FROM auth.users;
