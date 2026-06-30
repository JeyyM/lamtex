# Lamtex Security Audit — Master Checklist

> Comprehensive, repo-specific security to-do list. Work top-to-bottom; the
> sections are ordered by **risk impact**, not by effort. Check items off as you
> verify them. Anything you can't verify, mark `⚠️ NEEDS REVIEW` and link the
> file/table.

**Stack under audit**
- Frontend: React + Vite SPA (Vercel). Talks to Supabase **directly** with the
  anon key (`VITE_SUPABASE_*`).
- Database/auth: Supabase Postgres with RLS + `SECURITY DEFINER` RPCs.
- Server: Express notify service (`server/app.ts`, Render) + Vercel cron
  (`api/cron/overdue-payments.ts`) using the **service role key**.
- Email: Resend (server-side only).
- Public surfaces: customer order portal, payment links, digital receipts.

**Threat model in one line:** assume an authenticated employee (any role/branch)
is hostile and talks to Supabase directly, bypassing the React UI. The database
must defend itself. Also assume an anonymous attacker probes every public token
route and every `anon`-granted RPC.

---

## 🔴 SECTION 0 — KNOWN CRITICAL ISSUE (fix/scope first)

`database/schema.sql` Section 26 enables RLS on every table, then attaches a
**blanket policy** to all non-`chat_*` tables:

```
FOR SELECT/INSERT/UPDATE/DELETE USING (auth.uid() IS NOT NULL)
```

**Implication:** every logged-in employee can read, modify, and delete *every
row in nearly every table*, regardless of role or branch. The only thing
stopping that today is the React permission layer (`AppContext`), which is fully
bypassable via the browser console or any HTTP client using the anon key + a
valid session token.

- [ ] **Confirm scope** of the blanket policy against the live DB
      (`SELECT * FROM pg_policies WHERE schemaname='public';`).
- [ ] **Classify every table** by sensitivity (see Section 3 table inventory).
      Highly sensitive: `employee_compensation`, `employee_bank_details`,
      `employee_government_ids`, `employee_personal_info`, `payment_transactions`,
      `payment_links`, `collection_payment_*`, `invoices`, `receivables`,
      `agent_commissions`.
- [ ] **Decide enforcement model**: per-role + per-branch RLS in the DB, OR a
      vetted set of `SECURITY DEFINER` RPCs as the only write path, OR both.
- [ ] **Replace blanket policies** on sensitive tables with real predicates
      (ownership / branch scope / role check) — do this incrementally, table by
      table, behind tests.
- [ ] Decide whether this is a **launch blocker** (recommended: yes for HR &
      finance tables).

> Everything below assumes you will either tighten RLS or consciously accept the
> "trusted authenticated user" model. Document whichever you choose.

---

## SECTION 1 — Secrets, config & environment

- [ ] No secret with real value is committed to git (scan history, not just HEAD).
- [ ] Only `VITE_`-prefixed vars are exposed to the browser bundle; confirm the
      built `dist/assets/*.js` contains **no** `SUPABASE_SERVICE_ROLE_KEY`,
      `RESEND_API_KEY`, or `CRON_SECRET`.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` exists only on the server (Vercel cron / Render),
      never in `VITE_*`.
- [ ] `RESEND_API_KEY` is server-only (Render), never shipped to Vercel frontend.
- [ ] `CRON_SECRET` rotated away from the dev default (`lamtex-cron-dev-change-me`).
- [ ] `NOTIFICATIONS_EMAIL_OVERRIDE` is intentional — currently **all** mail is
      redirected to a single Gmail. Remove/guard before real customer emails go out.
- [ ] `.env*` is in `.gitignore`; `.env.example` contains only placeholders.
- [ ] Supabase keys rotated if they were ever shared in chat/screens/commits.
- [ ] Vercel/Render env vars scoped to the right environment (prod vs preview).
- [ ] `GEMINI_API_KEY` / `VITE_GOOGLE_MAPS_API_KEY` usage reviewed — Maps key
      should be HTTP-referrer + API restricted in Google Cloud console.

---

## SECTION 2 — Authentication & session

- [ ] `RequireAuth` / `GuestOnly` (`src/App.tsx`) gate all non-public routes.
- [ ] Session loading state can't briefly leak protected content before redirect.
- [ ] Supabase Auth settings reviewed: email confirmation, password min length,
      leaked-password protection, OTP/magic-link expiry.
- [ ] JWT expiry + refresh token rotation enabled; reasonable session lifetime.
- [ ] Logout fully clears the Supabase session (no stale token in localStorage).
- [ ] Password reset / invite flows can't be used for account enumeration.
- [ ] `create_employee_auth_account` RPC (`SECURITY DEFINER`, granted to
      `authenticated`) — verify who can call it and that it can't be used to mint
      arbitrary auth accounts or escalate.
- [ ] Auth user ↔ employee linkage is trustworthy (a user can't claim another
      employee's `employee_id`).
- [ ] Disabled/terminated employees lose access immediately (auth user disabled,
      not just a UI flag).

---

## SECTION 3 — Database RLS (the core of the audit)

Build a table inventory and verify each one. There are ~100 tables; do not skip.

### 3.1 Inventory & enablement
- [ ] List every table: `SELECT tablename FROM pg_tables WHERE schemaname='public';`
- [ ] Confirm RLS is **enabled** on all of them (Section 26 loop does this, but
      verify live, including tables created after the loop runs).
- [ ] Tables created *after* Section 26 in bootstrap order may have RLS enabled
      but **no policy** (= deny all) or be missed entirely — verify none are
      silently world-open or silently broken.
- [ ] `FORCE ROW LEVEL SECURITY` considered for tables where the owner role might
      otherwise bypass RLS.

### 3.2 Per-domain policy review (replace blanket `auth.uid() IS NOT NULL`)
For each group: does the policy enforce **branch scope** and **role** where it should?

- [ ] **Employees / HR** (`employees`, `employee_personal_info`,
      `employee_contact_info`, `employee_addresses`, `employee_compensation`,
      `employee_bank_details`, `employee_government_ids`, `employee_documents`,
      `employee_notes`, `employee_activities`) — currently every employee can read
      everyone's salary, bank details, and gov IDs. **High priority.**
- [ ] **Permission tables** (`employee_*_permissions`, `employee_user_roles`) —
      can a user grant themselves permissions by writing their own permission row?
      This is a direct privilege-escalation path. **Critical.**
- [ ] **Finance** (`invoices`, `receivables`, `payment_transactions`,
      `payment_links`, `collection_payment_records`, `collection_payment_links`,
      `payment_method_fees`, `digital_receipts`).
- [ ] **Agent comp** (`agent_targets`, `agent_incentives`, `agent_commissions`,
      `agent_quota_history`, `branch_sales_targets`, `branch_quota_history`).
- [ ] **Orders** (`orders`, `order_line_items`, `order_logs`,
      `order_proof_documents`, `order_customer_portals`).
- [ ] **Customers/Suppliers** (`customers`, `customer_*`, `suppliers`,
      `supplier_*`).
- [ ] **Products/Materials & stock** (`products`, `product_variants`,
      `product_variant_stock`, `material_stock`, `*_stock_movements`,
      `material_batches`, `*_logs`).
- [ ] **Procurement/Production** (`purchase_requisitions`, `purchase_orders`,
      `purchase_order_*`, `production_requests`, `production_request_*`,
      `purchase_requests`).
- [ ] **Logistics** (trucks/trips/inter-branch tables).
- [ ] **Notifications** (`notifications`) — a user must only read their own.

### 3.3 Known permissive policies to revisit
- [ ] `purchase_order_proof_documents` — explicit `USING (true)` /
      `WITH CHECK (true)` for `authenticated` (schema.sql ~3252). Any user can
      read/replace/delete any PO proof doc.
- [ ] `product_variant_stock` / `material_stock` — `WITH CHECK (true)` /
      `USING (true)` inserts/updates for `authenticated`. Confirm this is
      intentional (stock roll-ups) and can't be abused to falsify inventory.
- [ ] Grep the live DB for **all** `USING (true)` / `WITH CHECK (true)` policies
      and justify each.

### 3.4 Cross-tenant / branch isolation tests (do this empirically)
- [ ] Create two test users in **different branches** with **minimal** roles.
- [ ] As user A, attempt to `select/insert/update/delete` user B's branch rows in
      each sensitive table **directly via the Supabase JS client** (not the UI).
- [ ] Record which reads/writes succeed that shouldn't → findings.
- [ ] Repeat for a "warehouse worker" role vs a "manager" role.

---

## SECTION 4 — `SECURITY DEFINER` functions & RPCs

These run with the definer's privileges and **bypass RLS** — each is a potential
backdoor. There are many `notify_*`, `upsert_*`, code-generation, and public
RPCs.

- [ ] Enumerate all functions: `SELECT proname, prosecdef FROM pg_proc ...`
      where `prosecdef = true`.
- [ ] For each `SECURITY DEFINER` function, confirm it **validates the caller**
      (auth.uid present, correct role/branch) before performing privileged work.
- [ ] Confirm every such function has an explicit, safe `search_path`
      (`SET search_path = public, pg_temp`) to prevent search-path hijacking.
- [ ] Review write-capable RPCs granted to `authenticated`:
      `upsert_agent_target`, `bulk_upsert_agent_targets`,
      `upsert_branch_sales_target`, `send_agent_coaching_nudge`,
      `create_employee_auth_account`, `process_newly_overdue_orders`, and all
      `notify_*` functions — can a low-privilege user call them to act as someone
      else, spam notifications, or mutate data they shouldn't?
- [ ] Confirm `notify_*` RPCs can't be abused to **enumerate** emails/PII or send
      arbitrary email content.
- [ ] Verify functions don't build dynamic SQL from unsanitized text args
      (SQL injection inside `EXECUTE format(...)`).

---

## SECTION 5 — Public / unauthenticated surfaces

Routes with **no auth** (`src/App.tsx`): `/pay/:token`, `/payment-success/:token`,
`/receipt/:id`, `/order/:token`. RPCs granted to `anon`:
`get_public_order_summary`, `get_public_order_discount_lines`.

- [ ] **Token entropy**: portal/payment tokens are UUIDv4+ or equivalently
      unguessable (check `generatePortalToken` and payment-link token creation).
      No sequential IDs, no short tokens.
- [ ] **Expiry**: `order_customer_portals.expires_at` and payment-link expiry are
      enforced **server/DB-side**, not just hidden in the UI.
- [ ] **Data minimization**: public RPCs/views return only what the customer needs
      — no internal cost, margin, commission, other customers' data, employee PII.
- [ ] `/receipt/:id` uses an **unguessable** id, not an enumerable serial.
- [ ] `anon` RPCs (`get_public_order_*`) leak nothing beyond the single order tied
      to the token; verify they take the token (not an order id) and validate it.
- [ ] Public pages can't be pivoted into authenticated data (no shared client that
      accidentally carries elevated privileges).
- [ ] Rate limiting / abuse protection on token endpoints (guessing, scraping).
- [ ] Revked/expired/cancelled orders stop exposing data through the portal.

---

## SECTION 6 — Server: notify API (`server/app.ts`)

The Express notify service has **no authentication** on its `/api/notifications/*`
endpoints and is called from the browser.

- [ ] Decide intended trust model: are these endpoints meant to be public? If not,
      add auth (verify Supabase JWT, or a shared secret, or move behind RLS-checked
      RPCs).
- [ ] **Abuse risk**: any internet client can POST to `/api/notifications/*` and
      cause Lamtex to send emails (Resend) to arbitrary-ish recipients. Assess
      spam/phishing/cost risk. Mitigate (auth, rate limit, recipient allowlist).
- [ ] CORS allowlist (`NOTIFY_CORS_ORIGINS` + `APP_URL`) is correct for prod and
      not reflecting arbitrary origins. Note: CORS does **not** stop non-browser
      clients — don't rely on it as auth.
- [ ] Input validation on every endpoint beyond presence checks (lengths, types,
      email format) to prevent injection into email HTML.
- [ ] Email HTML builders escape user-controlled fields (order notes, names,
      addresses) — check `emailHtmlUtils.ts` and a few `build*EmailHtml` funcs for
      HTML/template injection.
- [ ] `/api/link-preview` is an **SSRF vector**: it fetches arbitrary user-supplied
      URLs server-side. Verify it blocks internal/metadata IPs
      (`localhost`, `127.0.0.0/8`, `169.254.169.254`, `10/8`, `192.168/16`,
      `172.16/12`), limits redirects, enforces timeout/size, and only allows
      http(s). **Likely finding.**
- [ ] Request body size limit (`1mb`) is appropriate; no unbounded loops over
      `recipientEmails`/`affectedOrders` enabling amplification.
- [ ] Error responses don't leak stack traces / internal config to clients.
- [ ] `/api/health` doesn't expose sensitive config (it currently returns the
      override email + from address — confirm acceptable).

---

## SECTION 7 — Server: Vercel cron (`api/cron/overdue-payments.ts`)

- [ ] `CRON_SECRET` bearer check is enforced in prod (it is — verify it can't be
      bypassed when `VERCEL` is set but secret missing → currently 503, good).
- [ ] Service-role Supabase client is used **only** here and never returned to a
      client.
- [ ] The endpoint is **GET/POST only** and does nothing destructive beyond the
      intended RPC.
- [ ] `process_newly_overdue_orders` RPC is safe to run with service role and is
      idempotent.
- [ ] Confirm no other route accidentally instantiates a service-role client.

---

## SECTION 8 — Supabase Storage

Attachments live in a public `images` bucket (`chat-attachments/`, order/PO proof
docs, employee documents, catalog images).

- [ ] Bucket public/private setting matches sensitivity. Order/PO/employee proof
      documents and chat attachments should likely be **private** with signed URLs,
      not a public bucket.
- [ ] Storage RLS policies: who can `INSERT`/`SELECT`/`DELETE` objects per path
      prefix? Verify a user can't read another conversation's attachments or
      another order's proofs by guessing paths.
- [ ] File-type and size validation on upload (client *and* server/policy side).
- [ ] Uploaded file names/paths can't be traversed or collide to overwrite others'
      files.
- [ ] Signed URL expiry is short where used.
- [ ] No PII-laden documents sitting in a fully public bucket.

---

## SECTION 9 — Application authorization (defense in depth)

The React permission system (`src/store/AppContext.tsx`, `employee_*_permissions`)
is **UX**, not security — but it should still be correct.

- [ ] UI permission checks match the intended access matrix (role × module ×
      branch).
- [ ] No client-side-only "admin" flags that, if flipped in devtools, unlock
      privileged API calls that the DB doesn't independently enforce.
- [ ] Permission changes take effect on next request (no stale cached grants).
- [ ] Warehouse/branch scoping (`warehouseScope`) is also enforced in the DB, not
      only in queries built by the client.

---

## SECTION 10 — Client-side web security (XSS / injection)

- [ ] No `dangerouslySetInnerHTML` with unsanitized user content (grep confirmed
      none today — keep it that way; re-check on each PR).
- [ ] Chat messages, link previews, names, notes are rendered as **text**, not HTML.
- [ ] Link-preview images/URLs are sanitized before render; `target="_blank"` links
      use `rel="noopener noreferrer"`.
- [ ] Markdown/rich content (if any) uses a sanitizer/allowlist.
- [ ] File downloads set safe content-disposition; user-supplied filenames are
      sanitized.
- [ ] No `eval`, `new Function`, or dynamic script injection (grep confirmed none).
- [ ] CSP header configured on Vercel (script-src, connect-src to Supabase/Resend
      only, frame-ancestors, etc.).
- [ ] Security headers: HSTS, X-Content-Type-Options, Referrer-Policy,
      X-Frame-Options/`frame-ancestors`, Permissions-Policy.

---

## SECTION 11 — Data exposure & logging

- [ ] `console.log` statements don't ship PII/secrets to the browser console in
      prod (there are debug logs in PR/PO flows — review).
- [ ] Server logs don't persist full PII or tokens.
- [ ] Error messages surfaced to users don't reveal table/column names or SQL.
- [ ] Realtime subscriptions (chat + notifications) only deliver rows the user is
      authorized to see (RLS applies to realtime — verify for `notifications` and
      `chat_*`).
- [ ] `REPLICA IDENTITY FULL` on chat tables doesn't broadcast extra columns to
      unauthorized subscribers.

---

## SECTION 12 — Dependencies & supply chain

- [ ] `npm audit` — triage High/Critical; fix or document.
- [ ] No unmaintained/abandoned critical deps; lockfile committed.
- [ ] `open-graph-scraper`, `xlsx`, `resend`, `@supabase/*` on supported versions
      (note: `xlsx` has had prototype-pollution/ReDoS advisories — check).
- [ ] Dependabot / Renovate or a periodic manual review scheduled.
- [ ] Build doesn't pull scripts from untrusted CDNs at runtime.

---

## SECTION 13 — Payments & financial integrity

- [ ] Payment amounts/status can't be tampered client-side then trusted by the DB
      (amounts validated against the order server/DB-side).
- [ ] Payment link tokens are single-purpose, expiring, and tied to one order.
- [ ] Webhook/callback endpoints (if any payment provider) verify signatures.
- [ ] `delete_policy_immutability.sql` rules (immutable financial/audit records)
      can't be bypassed via a `SECURITY DEFINER` RPC or direct update — test it.
- [ ] Commission/incentive computations can't be self-edited by agents
      (`agent_commissions`, `agent_incentives` write policies).

---

## SECTION 14 — Operational / infrastructure

- [ ] Supabase project: network restrictions, DB password strength, PITR/backups
      enabled, point-in-time recovery tested.
- [ ] Backups are encrypted and access-controlled; restore tested.
- [ ] Vercel/Render: no preview deployments exposing prod data with prod keys.
- [ ] Admin access to Supabase/Vercel/Render uses MFA and least privilege.
- [ ] Audit logging exists for sensitive admin actions (role changes, deletions).
- [ ] Incident response: who is paged, how keys are rotated, breach comms plan.

---

## SECTION 15 — Privacy / compliance (as applicable)

- [ ] PII inventory (employee gov IDs, bank details, customer contacts) documented.
- [ ] Data retention & deletion policy for ex-employees / closed customers.
- [ ] Access to HR & finance data restricted to need-to-know (ties back to RLS).
- [ ] Email override removed so notifications don't send personal data to a single
      shared inbox in prod.

---

## How to run this audit

1. **Automated sweep** (fast, repeatable):
   - `npm audit`
   - Secret scan over git history (e.g. `gitleaks`/GitHub secret scanning).
   - Dump live policies: `SELECT * FROM pg_policies WHERE schemaname='public';`
   - Dump `SECURITY DEFINER` functions: `SELECT proname FROM pg_proc WHERE prosecdef;`
2. **Empirical RLS tests** (Section 3.4) with two least-privileged users hitting
   Supabase directly.
3. **Manual deep dives** one section per session; log findings below.
4. **Per-PR**: run the in-repo security review on the diff; re-check Sections 10 &
   3 for anything touching auth, RLS, or rendering user content.

## Severity legend
- 🔴 **Critical** — direct data breach / privilege escalation / financial integrity.
- 🟠 **High** — significant exposure under realistic conditions.
- 🟡 **Medium** — requires chaining or limited impact.
- 🟢 **Low / hardening** — defense-in-depth.

## Findings log
| # | Severity | Location (file:line / table) | Finding | Status |
|---|----------|------------------------------|---------|--------|
| 1 | 🔴→🟡 | `database/schema.sql` §26 (blanket RLS) | Every authenticated user can CRUD nearly all rows incl. HR/finance PII | **Writes partly fixed** — self-escalation/self-dealing guard on 20 privilege/finance tables (`rls_self_escalation_guard.sql`). **Reads + per-branch still open** (needs fail-closed permission migration — app is fail-open/client-side) |
| 2 | 🟠 | `database/schema.sql` ~3252 `purchase_order_proof_documents` | `TO authenticated USING(true)` — any logged-in user reads/edits any PO proof (not anon) | Open — subsumed by the fail-closed RLS project (same posture as all blanket tables) |
| 3 | 🟠→✅ | `server/app.ts` `/api/link-preview` | Unauthenticated server-side fetch of arbitrary URLs (SSRF) | **Fixed** — DNS-resolving private/reserved-IP block (`server/lib/ssrfGuard.ts`) + now behind notify auth |
| 4 | 🟠→✅ | `server/app.ts` `/api/notifications/*` | No auth on email-sending endpoints (spam/cost/phishing) | **Fixed (opt-in)** — Supabase-JWT middleware (`notifyAuth.ts`); enforce by setting `SUPABASE_URL`+`SUPABASE_ANON_KEY` on Render |
| 5 | 🟡 | `.env` / `server/app.ts` / `vercel.json` | `CRON_SECRET` dev default + global email override active | Email override: **deferred by decision**; `CRON_SECRET`: set as Vercel env var (config, not code) |
| 11 | 🟠→✅ | `vercel.json` (missing security headers) | No HSTS/nosniff/frame/referrer/permissions headers | **Fixed** — added; minimal CSP (frame/object/base) to avoid breaking Maps/Supabase |
| 12 | 🟠→🟡 | `npm audit` (27 vulns) | Vulnerable deps | **Reduced 27→12** via non-breaking `npm audit fix`; remainder are dev/build-only except `xlsx` (no npm fix — migrate to SheetJS CDN) |
| 13 | 🔴→✅ | Permission tables (self-grant) | User could grant self module permissions via API | **Fixed** — `is_executive() OR row≠self` write guard (`rls_self_escalation_guard.sql`) |
| 6 | 🟠→✅ | `src/lib/orderCustomerPortal.ts` `generatePortalToken` | Weak `Math.random` 8-char order portal token | **Fixed** — 128-bit crypto token (`secureToken.ts`) |
| 7 | 🟠→✅ | `get_public_order_summary` / `_discount_lines` (anon RPCs) | No rate limiting; brute-forceable token probing | **Fixed in code** — per-IP guard (`public_order_rate_limit.sql`); **run migration** |
| 8 | 🟡→✅ | `components/payments/PaymentLinkModal.tsx` | Weak `Math.random` payment-link token | **Fixed** — 128-bit crypto token (payments still not live) |
| 9 | 🟢 | `src/pages/ReceiptPage.tsx` | `/receipt/:id` renders mock data only — no live exposure yet | Noted (harden when wired to real data) |
| 10 | ⚪ | Login page credential pre-fill | Pre-filled login credentials | **Deferred by decision** (remove at launch) |

See `security_fixes_report.md` for the full write-up of this session's work.
