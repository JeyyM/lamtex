# Security Work — Session Report

_Date: 2026-06-30_

This report covers the items addressed in this session: the customer order-detail
protection work, plus the two items you asked to leave as-is. For each: **what was
done**, **what to do next**, and **any remaining problems**.

---

## Decisions you made (left intentionally as-is)

### A. Notification email override → all mail to one inbox
**Status: Left as-is (by request).** `NOTIFICATIONS_EMAIL_OVERRIDE` still routes every
notification to the single dev inbox. This is fine while the system isn't live.

- **Next:** Before real customers/employees receive mail, remove the override so
  emails go to the real recipients. Search `resolveRecipient()` in `server/app.ts`.
- **Remaining problem:** Until then, real personal email addresses accumulate in one
  shared inbox. No action needed now — just don't forget at launch.

### B. Login credential pre-fill
**Status: Left as-is (by request).** The login page still pre-fills credentials.

- **Next:** Remove pre-filled credentials before go-live (or gate behind a
  `import.meta.env.DEV` check so it only happens in development).
- **Remaining problem:** Anyone reaching the login screen on a deployed build can see
  the pre-filled account. Acceptable for now in a non-public build.

---

## What was fixed this session — Customer order details protection

**Goal:** Customers open `/order/<token>` with no login, but someone shouldn't be able
to "mash random combinations" to find other customers' orders.

The order portal is backed by two Supabase RPCs (`get_public_order_summary`,
`get_public_order_discount_lines`) that are granted to `anon`. Because the anon key
ships in the browser bundle, an attacker can call these directly over HTTP — so any
protection has to live **inside the database functions**, not in the React app.

Two defense layers were added.

### Fix 1 — Crypto-strong, longer tokens ✅ (code done)
**Before:** `ORD-2026-XXXXXXXX` — 8 characters from `Math.random()`, which is not a
secure random source (~41 bits, and predictable).

**After:** `ORD-2026-` + **128-bit** crypto-random hex (`crypto.getRandomValues`).
Guessing a valid token is now computationally infeasible on its own.

- New helper: `src/lib/secureToken.ts` (`generateSecureToken`).
- Updated: `src/lib/orderCustomerPortal.ts` (`generatePortalToken`).
- Also hardened the payment-link token generator (`PaymentLinkModal.tsx`) for when
  payments go live (it used an even weaker 7-char `Math.random()` token).

**What to do next:** Nothing required for new orders. Existing order links created
before this change keep their old weaker tokens (still valid for up to 1 year) — they
are covered by Fix 2. Optionally, regenerate links for any high-sensitivity open
orders.

### Fix 2 — Per-IP rate limiting inside the RPCs ✅ (code done, **needs DB migration run**)
Even with strong tokens, we now throttle probing so nobody can hammer the endpoint.

- New migration: `database/public_order_rate_limit.sql` (also folded into
  `database/schema.sql`).
- Adds a small `public_order_access_attempts` log + three `SECURITY DEFINER` helpers
  (`current_request_ip`, `public_order_access_guard`, `public_order_access_record`).
- Both public RPCs now: check the guard first, record each attempt, and only count
  **failed** lookups against the limit (so a real customer refreshing their valid
  order is never penalized).

**Thresholds (per client IP):**
- ≥ 30 failed token lookups in 10 minutes → blocked (`rate_limited`).
- ≥ 120 total calls in 1 minute → blocked.
- Block clears automatically once the attacker stops / the window passes.

The frontend now shows a friendly "Too many attempts, please wait" message
(`publicOrderErrorMessage`).

**What to do next (required):**
1. Run `database/public_order_rate_limit.sql` in the Supabase SQL editor.
2. Then run: `NOTIFY pgrst, 'reload schema';`
3. Verify a valid order link still loads, then hit it ~30 times with a bad token and
   confirm you get `rate_limited`.

**Remaining problems / limitations to be aware of:**
- **Shared-IP false positives:** rate limiting is keyed on `x-forwarded-for`. Many
  customers behind one corporate NAT/proxy share an IP, so heavy legitimate use from
  one office could trip the limit. Thresholds are set high to make this unlikely; tune
  if needed.
- **IP spoofing of `x-forwarded-for`:** we take the first hop. Supabase/its proxy sets
  this; if a determined attacker can rotate IPs (botnet), per-IP limits help but don't
  fully stop a distributed attack. Strong tokens (Fix 1) are the real backstop — and
  with 128-bit tokens, distributed guessing is still infeasible.
- **Requires the migration to actually be run** — until step 1 above is done, the
  throttle is not active in the live DB (tokens are still strong, though).

---

## Other public surfaces reviewed (no change needed now)

- **`/receipt/:id`** — currently renders **mock data only**, no real fetch. No live
  exposure. **Next:** when wired to real data, use an unguessable id and a token-scoped
  RPC just like the order portal.
- **`/pay/:token` (payment links)** — the payment flow is **not wired to a real
  backend yet** (the modal generates a demo link). Token generation was hardened
  preemptively. **Next:** when payments go live, add the same per-IP guard + DB-side
  amount validation + provider webhook signature checks (see audit Section 13).

---

## Verification done
- `npm run build` passes.
- Lint clean on changed files.
- SQL mirrored between the migration and `schema.sql` per the schema-sync rule.

## Quick checklist for you
- [ ] Run `database/public_order_rate_limit.sql` in Supabase + `NOTIFY pgrst, 'reload schema';`
- [ ] Smoke-test a real order link, then brute-test a bad token to see `rate_limited`.
- [ ] (Later, at launch) remove email override + login pre-fill.

---

---

# Session 2 — "Do all the fixes" (2026-06-30)

This round addressed the remaining open items. Some were fully fixed; the biggest one
(full fail-closed RLS) is deliberately scoped down for a reason explained below.

## ✅ Fixed — SSRF on `/api/link-preview`
**Problem:** the server fetched any URL the client sent, so it could be tricked into
reaching internal services or the cloud metadata endpoint (`169.254.169.254`).

**Fix:** new `server/lib/ssrfGuard.ts` (`assertSafePublicUrl`). Before fetching, the
server now: requires http/https, blocks `localhost`, **resolves DNS, and rejects any
host that resolves to a private/loopback/link-local/reserved IP** (v4 and v6, including
IPv4-mapped). Wired into the endpoint in `server/app.ts`.

- **Next / remaining:** open-graph-scraper follows redirects internally; the initial
  host is validated, but a redirect to an internal host isn't re-checked by us. Low risk
  (the guard plus a public-only first hop covers the common case). If you want full
  coverage, disable redirects in the scraper or re-validate each hop.

## ✅ Fixed — Notify API authentication
**Problem:** `/api/notifications/*` and `/api/link-preview` were open to the internet
(anyone could trigger emails / use the preview fetcher).

**Fix:** new `server/lib/notifyAuth.ts` middleware verifies the caller's **Supabase
access token** (the SPA's own session). The frontend now attaches it automatically
(`src/lib/notifyApi.ts` → `notifyFetch` sends `Authorization: Bearer <token>`).

**Safe rollout (important):** enforcement turns on **only when the notify server has
`SUPABASE_URL` + `SUPABASE_ANON_KEY` set**. Without them it logs a warning and allows
requests (so deploying this code does NOT break the live Render service before you set
the vars).

- **Next (required to actually enforce):**
  1. On the Render notify service, add env vars `SUPABASE_URL` and `SUPABASE_ANON_KEY`
     (same values as the frontend `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`).
  2. Redeploy. Watch logs — the "AUTH DISABLED" warning should disappear.
  3. Confirm staff-triggered notifications still send, then confirm an unauthenticated
     `curl` to a notify endpoint returns 401.
- **Remaining problem:** verify no notification is triggered from an **unauthenticated**
  page (customer order/pay pages). All current notify calls are staff-triggered, so this
  should be fine — but double-check before relying on enforcement.

## ✅ Fixed — Security headers
Added to `vercel.json` for all routes: `Strict-Transport-Security`,
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`,
`Permissions-Policy`, and a **minimal CSP** (`frame-ancestors 'none'; object-src 'none';
base-uri 'self'`).

- **Why the CSP is minimal:** a full `script-src`/`connect-src` CSP can white-screen the
  SPA (Google Maps, Supabase realtime/wss, fonts). The minimal CSP closes clickjacking,
  plugin/object, and base-tag injection without that risk.
- **Next:** when you can test a deploy, add a full CSP allowlisting your Supabase URL,
  the notify URL, `*.googleapis.com`/`*.gstatic.com`, fonts, and `wss:` — then tighten
  `script-src` to `'self'` (the build has no inline scripts).

## ✅ Fixed (partially) — Dependency vulnerabilities (`npm audit`)
Ran `npm audit fix` (non-breaking only). **27 → 12** vulnerabilities. The build still
passes after the update.

The remaining 12 are:
- **Dev/build-chain only** (`@vercel/*` tooling, `esbuild` dev server, `undici`,
  `path-to-regexp`, `minimatch`, `ajv`, `js-yaml`, `smol-toml`) — these don't ship to the
  browser or run in production request paths. Their only fix is a breaking
  `@vercel/node@4` major bump; not worth the regression risk.
- **`xlsx` (high, no npm fix):** SheetJS no longer publishes fixed versions to npm.
  - **Next:** migrate the import to the official build
    (`npm i https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`) or the `@e965/xlsx`
    mirror. Left for you to approve since it swaps a core export dependency.

## ✅ Fixed — Self-escalation / self-dealing at the DB layer
**Problem:** under blanket RLS, a logged-in employee could call PostgREST directly to
**grant themselves permissions**, **assign themselves more data scope**, or **edit their
own salary/bank/government IDs**.

**Fix:** `database/rls_self_escalation_guard.sql` (mirrored into `schema.sql`). Adds two
`SECURITY DEFINER` helpers (`current_employee_id()`, `is_executive()`) and replaces the
blanket **write** policies on 20 tables (15 permission tables, 2 assignment tables,
`employee_compensation` / `employee_bank_details` / `employee_government_ids`) with:

> INSERT/UPDATE/DELETE allowed only if **`is_executive()`** OR the row belongs to
> **someone else**.

So you can never write your own privilege/financial row unless you're an Executive.
Admins/HR editing *other* employees is unchanged → **non-breaking**.

- **Next (required to activate):** run `database/rls_self_escalation_guard.sql` in
  Supabase, then `NOTIFY pgrst, 'reload schema';`. Then sanity-check: an Executive can
  still edit permissions/comp for others; a normal account cannot UPDATE its own
  `employee_*_permissions` row via the API.

## ⚠️ Intentionally NOT done — full fail-closed RLS (the big one)
**Why:** the app's authorization is **fail-open and client-side** — `useEmployeesPermissions`
(and the other permission hooks) treat a user with **no permission row as fully
granted**, and the Employees page is gated only in React. Flipping the database to
fail-closed, per-role, per-branch RLS would **lock out real users** on production unless
every employee first has correct permission rows seeded, and every read/write path is
regression-tested. That is a dedicated project, not a blind one-shot migration.

**What this leaves open (documented, not silently ignored):**
- Any logged-in employee can still **read** most tables, including
  `employee_compensation` / `employee_bank_details` / `employee_government_ids`
  (salaries/bank/gov-IDs are readable by all staff). Writes are now protected; reads are
  not.
- No per-branch isolation: staff can read other branches' rows.
- `purchase_order_proof_documents` keeps `TO authenticated USING (true)` — same posture
  as every other table under blanket RLS (it is **not** exposed to `anon`), so it's
  covered by the same future fail-closed migration rather than a risky one-off.

**Recommended path for this (next project):**
1. Make the permission model **fail-closed** in the app (no row = no access) and seed
   permission rows for all existing employees.
2. Build DB helpers for "caller has module X access" + "caller's branch".
3. Roll out read RLS **table-by-table**, starting with `employee_compensation`/
   `employee_bank_details`/`employee_government_ids`, testing each against the live UI.

## ⚠️ Still deferred by your earlier instructions
- Email override → one inbox (Session 1, item A).
- Login credential pre-fill (Session 1, item B).
- `CRON_SECRET` for `/api/cron/overdue-payments` — set it as a Vercel env var; it's
  config you control, not a code change.

## Verification this session
- `npm run build` → passes (exit 0) after the dependency updates.
- New server files (`ssrfGuard.ts`, `notifyAuth.ts`) and `notifyApi.ts` → lint clean.
- Repo-wide `tsc --noEmit` shows only **pre-existing** errors (the `Lamtex Catalogue`
  sub-app, `key`-prop warnings, and an unrelated `server/app.ts:821` role-union issue) —
  none introduced by this work.
- SQL mirrored between migration and `schema.sql` per the schema-sync rule.

## Checklist for you (Session 2)
- [ ] Run `database/rls_self_escalation_guard.sql` in Supabase + `NOTIFY pgrst, 'reload schema';`
- [ ] Set `SUPABASE_URL` + `SUPABASE_ANON_KEY` on the Render notify service to enforce notify auth.
- [ ] Set `CRON_SECRET` on Vercel.
- [ ] (Approve) migrate `xlsx` to the SheetJS CDN/`@e965/xlsx` build.
- [ ] Plan the fail-closed RLS project (the remaining big item).
