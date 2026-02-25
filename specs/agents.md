# Agent Capabilities — ERP Management System (Bullet List)

## Access & Visibility
- Log in and only see agent-allowed pages/actions (RBAC).
- View only assigned branch/territory and customers (with branch switcher if allowed).
- Global search across customers, orders, and invoices (agent scope).

## Agent Dashboard
- View KPI cards: sales vs quota, quota progress, orders created, active customers, collections, overdue accounts, commission earned, customers at risk.
- Drill down from KPIs into filtered lists (e.g., overdue invoices, at-risk customers).
- See alerts (approvals, delivery updates, overdue reminders, quota warnings).

## Customer Management (Hardware Stores / Dealers)
- View customer profiles: contact persons, addresses, notes, assigned agent, status (active/dormant/on hold).
- See customer buying history, top SKUs, order frequency, and trends.
- See payment behavior tags (good / watchlist / risk) and overdue balance.
- Create and manage customer notes (calls, visits, negotiation notes).
- Create and manage tasks tied to a customer (follow-up dates, reminders, priorities).

## Order Creation (Sales Order / PO Creation)
- Create new orders for a selected customer.
- Add line items by product variant/SKU with quantities.
- Set required delivery date, delivery type (truck/ship), and order notes.
- See stock hints per line (available / partial / not available) and warnings.
- Apply discounts (₱ or %) within allowed limits.
- Set payment terms / grace period (30/60/90/custom if permitted).
- Save as draft and continue later.
- Submit order for approval when rules are triggered (high discount, below min price, special terms).

## Order Management
- View list of own orders with filters: date, status, customer, delivery date, payment status.
- Open a single order “truth page” (read-only for most fields after submit).
- Edit orders only when allowed (typically Draft or Rejected).
- Cancel an order (if policy allows) with required reason.
- Track order status progression: pending approval → approved → picking/packed → scheduled → in transit → delivered.

## Approval Interaction
- See which orders are pending approval and why (discount threshold, min price breach, special terms).
- Receive approve/reject results and rejection reasons from boss.
- Revise rejected orders and resubmit.

## Delivery Tracking (Agent View)
- View delivery status for own orders (scheduled, in transit, delivered, delayed/failed).
- See ETA and delay reasons (if present).
- Receive delivery completion alerts to start collections follow-up.

## Invoices & Billing (Agent-Limited)
- View invoice status tied to own orders: unbilled/invoiced/partial/paid/overdue.
- View due dates, terms, amount paid vs balance.
- Request invoice issuance (if finance-only in your rules).

## Collections & Receivables (Agent Responsibilities)
- View receivables summary: total outstanding, due this week, overdue, customers overdue.
- View receivables list by customer/invoice with days overdue and status.
- Record collection activity notes (e.g., “called accounting,” “check promised Friday”).
- Schedule follow-ups per invoice/customer (task creation).
- Mark a collection as “collected/paid” only if policy allows agents (otherwise “reported collected” pending finance confirmation).

## Payment Link Workflow (If Enabled for Agents)
- From an approved order + issued invoice, generate a payment link (or request finance to generate).
- Copy link and send via email/SMS/WhatsApp using templates.
- Resend/void link (if allowed).
- Track link status: generated/sent/viewed/paid/expired.
- Show fee transparency for customers (1% capped ₱3,000) as informational.

## Sales Performance & Insights
- View personal sales trends (monthly/quarterly), top customers, top products sold.
- See average order size and collection rate metrics.
- View customer risk flags and “customers at risk” list (declining, dormant, overdue).
- Get prompts for upsell/cross-sell opportunities based on buying patterns.

## Task & Activity Management
- Maintain a “Today’s work” list (calls, visits, follow-ups, delivery checks).
- Create tasks from customer, order, or invoice pages.
- Set due dates, priorities, and mark tasks done.
- View an activity feed of own actions (orders created, follow-ups scheduled, collections recorded).

## Notifications
- In-app notifications for:
  - Order approval/rejection
  - Order delays and delivery exceptions
  - Invoice created
  - Payment received (online) / recorded (offline)
  - Overdue reminders for assigned customers
  - Quota/progress warnings
  - Commission updates (if tracked)

## Exports (Optional, If Allowed)
- Export own orders/receivables lists (CSV/PDF) for reporting and follow-ups.

## Auditability (Agent-Side)
- Any agent action that changes a record should produce a log entry:
  - submission, edits, cancellations
  - notes and follow-ups
  - payment link sends/resends/voids
  - collection updates