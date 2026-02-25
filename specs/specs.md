# Lamtex ERP / Management System — Frontend Spec (React Prototype, Placeholder Data Only)

> **Scope (IMPORTANT):** Build **frontend-only** in **regular React** (no Next.js).  
> Use **placeholder/mock data** and local state.  
> **No backend implementation** (no Supabase client, no API routes, no DB schema).  
> Structure code so it’s “Supabase-ready later” (clean types, services as mock adapters). :contentReference[oaicite:0]{index=0}

---

## 0) Landing / Login / Access

### A. Login Page
**Purpose:** Secure access.  
**Components:**
- Email/Username field
- Password field
- Role stored in session (used for RBAC gating)
- Forgot password link
- Login button
- Error messages
- Company logo :contentReference[oaicite:1]{index=1}

### B. Role-Based Dashboard (Home)
After login, route user to dashboard based on role. :contentReference[oaicite:2]{index=2}

---

## 1) Boss Dashboard (Executive Overview)

### 1.1 Top Bar (Always Visible)
- Branch switcher: All / Branch A / Branch B / Branch C
- Date range: Today / This week / This month / Custom
- Notifications bell (approvals, stock alerts, overdue, delays, shortages)
- Profile menu (Settings, Users, Logout)
- Search :contentReference[oaicite:3]{index=3}

### 1.2 KPI Strip (Top Row Cards)
Clickable KPI tiles (each opens its respective page):
1. Total Sales (₱) based on time + vs last interval (%)
2. Ongoing Orders (count; not yet delivered) + pending approval count
3. Pending Approvals (₱ and count)
4. Low Stock Products (count)
5. Low Stock Raw Materials (count)
6. Total Suppliers (count)
7. Overdue Payments (₱ and # invoices; list)
8. Delivery Reliability
   - On-time delivery % (week/month)
   - # of delays
   - Average delivery lead time :contentReference[oaicite:4]{index=4}

### 1.3 Priority Action Center — Approvals
Approval Orders List (click row to view order details; unapproved first).  
**Columns:**
- Status: Pending / Scheduled / Shipping / Delivered / Complete / Late
- Order/Quote #
- Customer (hardware store)
- Agent
- Branch
- Products (summary)
- Amount (₱)
- Totals
- Requested discount %
- Margin impact indicator (green/yellow/red)
- Requested delivery date
- Approve / Reject buttons
- Edit order including schedule (notify agent)
- Google Maps location
**Rules:**
- Sort by urgency: soonest delivery + biggest value first
- Bulk approve with confirmation
- Reject requires comment :contentReference[oaicite:5]{index=5}

### 1.4 Inventory Health (Products + Raw Materials) — Boss View
#### A) Finished Goods Stock Alerts
**Columns:**
- Product (each has low inventory thresholds)
- Avg weekly sales
- Forecast next 7/30 days
- Risk level (“stock-out likely in X days”)
**Actions:**
- Schedule new batch (notify warehouse manager)
- Transfer stock to another branch :contentReference[oaicite:6]{index=6}

#### B) Raw Material Stock Alerts
Top raw materials at risk:
- Material name
- Current qty
- Estimated days remaining
- Risk level (“stock-out likely in X days”)
- Suggested reorder qty/date
- Linked products affected
**Action:**
- Schedule Purchase Request (notify warehouse manager) :contentReference[oaicite:7]{index=7}

### 1.5 Sales Performance (Products, Agents, Branches)
A) Top Products This Month
- Units + ₱
- Trend arrow
- Gross margin (if available)

B) Top Hardware Stores
- Purchases this month
- Trend
- Payment behavior % (good / risky)

C) Agent Leaderboard
- Sales vs quota
- Collections performance
- Active accounts
- Alerts: underperforming streak

D) Branch Performance
- Sales vs quota
- Stock-out incidents count
- Delivery on-time %
- Receivables overdue (₱) :contentReference[oaicite:8]{index=8}

### 1.6 Notifications Panel (Right Drawer)
Grouped by:
- Approvals (urgent)
- Inventory alerts
- Delivery exceptions
- Payment reminders
- System issues :contentReference[oaicite:9]{index=9}

### 1.7 Overview Calendar
- Outgoing orders (click → details)
- Raw materials arrivals (click → details)
- Orders that could be delayed
- Product branch transfers
- Option to notify departments :contentReference[oaicite:10]{index=10}

---

## 2) Warehouse Manager Dashboard

### 2.1 Top Bar
- Branch selector (each branch has its own warehouse)
- Date (Today / This week / Custom)
- Global search (Product, SKU, Batch, Order #)
- Notifications (low stock, allocations, issues)
- Profile menu :contentReference[oaicite:11]{index=11}

### 2.2 “Today in the Warehouse” Snapshot (KPI Cards)
1. Finished Goods On Hand (total units + threshold warnings)
2. Raw Materials On Hand (Critical/OK + threshold warnings)
3. Low Stock Items (# SKUs below min)
4. Orders Waiting for Stock (#)
5. Production Batches to Do (#)
6. Incoming Materials Today/Soon
7. Requested Stock/Material Requests :contentReference[oaicite:12]{index=12}

### 2.3 Stock Health Panel (Core)
#### A) Finished Goods
Columns:
- Product
- Current Stock bar: Reserved %, Available, Min level
- Avg daily outflow
- Production quota
- QA success rate
- Days of cover
- Risk level (color)
- Inter-branch quantities + request transfer
Actions:
- Request Production
- Transfer from Other Branch
- Adjust Min Level :contentReference[oaicite:13]{index=13}

#### B) Raw Materials
Columns:
- Material name
- Current qty
- Safety level
- Avg daily use
- Days remaining
- Products affected
Actions:
- Create Purchase Request
- Notify Boss / Procurement :contentReference[oaicite:14]{index=14}

### 2.4 Order Fulfillment Queue
Table:
- Order #
- Customer
- Truck/Container assigned + weight utilization %
- Required date
- Products/Qty summary
- Stock status: Fully / Partial / Not available
- Loading status per product: Pending / Loading / Partial / Full / Out of Stock / Ready for dispatch
Actions:
- View Order
- Report Shortage (notify boss + agent) :contentReference[oaicite:15]{index=15}

### 2.5 Production Input & Output Watch
Incoming from Production Approval:
- Batch #
- Product
- Planned qty
- Actual qty
- QA status
Actions:
- Accept to Stock
- Reject :contentReference[oaicite:16]{index=16}

### 2.6 Stock Movements & Adjustments
Quick actions:
- Add Stock (Production/Purchase)
- Adjust Stock (damage/count correction)
- Transfer stock to another branch (set schedule)
- Report damaged/rejected items
Feed:
- Time, item, type (In/Out/Transfer/Adjust), qty, reference, user log :contentReference[oaicite:17]{index=17}

### 2.7 Storage & Quality Issues Panel
- Rejected batches, damaged goods, re-inspection needs
Fields: Item/batch, reason, qty affected, status (Open/Resolved) :contentReference[oaicite:18]{index=18}

### 2.8 Alerts & Notifications Panel
Low stock, shortage impacts, raw material delays/arrivals, QA rejects, transfer requests :contentReference[oaicite:19]{index=19}

### 2.9 Machine Uptime
- Utilization %
- Quota completion
- Next maintenance
- Error rate :contentReference[oaicite:20]{index=20}

---

## 3) Logistics Manager Dashboard

### 3.1 Top Bar
- Branch selector (All / A / B / C)
- Date range (Today / This week / Custom)
- Global search (Order #, Delivery #, Truck, Customer)
- Notifications (delays, capacity issues, warehouse not ready)
- Profile menu :contentReference[oaicite:21]{index=21}

### 3.2 “Today’s Operations” Snapshot (KPI Cards)
1. Deliveries scheduled
2. Trips in progress
3. Delivered in range
4. Delayed deliveries
5. Orders ready for dispatch (from warehouse)
6. Orders waiting for stock
7. Available trucks (#/6) + container vans
8. Overbooked routes/days :contentReference[oaicite:22]{index=22}

### 3.3 Dispatch Board (Main Work Area)
#### A) Orders Ready for Dispatch (Left)
Columns: Order #, customer, branch, destination, required date, volume/weight, notes  
Actions: Assign to Trip, View Order, Cancel Order  
Rules: sort earliest required date + priority; highlight urgent/late :contentReference[oaicite:23]{index=23}

#### B) Trip Builder / Schedule (Center)
- Timeline (Day/Week)
- Rows = trucks/container vans + drivers
- Trip blocks show: vehicle, destinations, orders, capacity usage, status (Pending/Planned/Loading/In Transit/Completed/Delayed/Failed)
- Warnings: overbooking, driver issues, capacity exceeded
- Drag orders into trips, set schedules, update capacity dynamically :contentReference[oaicite:24]{index=24}

#### C) Warehouse Readiness Panel (Right)
- Orders assigned to trips + loading status per product
- Blockers: missing items, QC hold, partial stock
Actions: Notify Warehouse, Remove Order, Delay Trip, Replace Order :contentReference[oaicite:25]{index=25}

### 3.4 Live Delivery Tracker
Columns: Delivery/Trip ID, vehicle, driver, route, orders count, status, ETA, delay reason  
Filters: Today / This week / Delayed only / by vehicle  
Click opens Delivery Detail :contentReference[oaicite:26]{index=26}

### 3.5 Delays & Exceptions Center (High Priority)
Rows: type, affected trip/orders, customers affected, days late, owner, actions  
Actions: Reschedule, Reassign truck, Split trip, Notify boss/sales :contentReference[oaicite:27]{index=27}

### 3.6 Fleet Status Panel
Truck cards:
- Truck ID
- Status (Available / On trip / Loading / Maintenance)
- Today’s trips count
- Next available time
- Utilization % (week)
- Alerts (maintenance due, overused) :contentReference[oaicite:28]{index=28}

### 3.7 Shipments (Visayas/Mindanao)
Shipment table: ID, type, orders, port/destination, departure, ETA, status, actions :contentReference[oaicite:29]{index=29}

### 3.8 Performance Summary
Clickable tiles/charts:
- On-time % (week/month)
- Avg lead time
- Trips per truck
- Top delay reasons
- Orders per route/area :contentReference[oaicite:30]{index=30}

### 3.9 Notifications Drawer
New orders ready, warehouse not ready, truck unavailable, delivery failed, capacity warnings, boss requests update :contentReference[oaicite:31]{index=31}

---

## 4) Agent Dashboard

### 4.1 Top Bar
- Agent name
- Branch
- Date range (This month / Quarter / Custom)
- Search (Customer, Order #, Invoice #)
- Notifications (overdue, approvals, delivery updates) :contentReference[oaicite:32]{index=32}

### 4.2 Personal Performance Snapshot (KPI Cards)
1. Sales this month (₱) vs quota
2. Quota progress %
3. Orders created (#)
4. Active customers (#)
5. Collections this month (₱)
6. Overdue accounts (₱ / # customers)
7. Commission earned (₱)
8. Customers at risk (#) :contentReference[oaicite:33]{index=33}

### 4.3 My Customers Performance Panel
Fields: store name, location, partner status, sales MTD, trend, orders count, payment behavior, overdue balance, last visit/order  
Actions: View Customer, Create Order, Record Visit/Call, View Payments :contentReference[oaicite:34]{index=34}

### 4.4 My Orders & POs
Orders list filters: date/status/customer/delivery/payment  
Columns: order #, customer, date, delivery date, total, status, payment status, actions  
Quick action: Create PO/Order modal:
- customer selector
- lines, qty
- price/discount (approval flow)
- payment terms/grace period (30/60/90/custom)
- notes
- submit for approval :contentReference[oaicite:35]{index=35}

### 4.5 Collections & Receivables (Agent View)
Receivables tiles + list by customer/invoice:
- due date, days overdue, status, method, actions (record payment, mark collected, add note, follow-up)
Activity feed examples included :contentReference[oaicite:36]{index=36}

### 4.6 Today’s Work / Task List
Create tasks + mark done:
- follow-ups, delivery checks, visits, calls
Each has priority + due date :contentReference[oaicite:37]{index=37}

### 4.7 Sales Insights
Mini charts:
- sales trend (6 months)
- top 5 customers
- top 5 products
- avg order size
- collection rate % :contentReference[oaicite:38]{index=38}

### 4.8 Alerts & Notifications
Order approved/rejected, delayed, customer overdue, quota warning, commission update, delivery completed :contentReference[oaicite:39]{index=39}

---

## 5) Product Module

### Pages Overview
1. Products List
2. Create Product
3. Edit Product
4. Product Detail (Hub)
5. Create Variant (SKU)
6. Variant Detail
7. Edit Variant :contentReference[oaicite:40]{index=40}

### 5.1 Products List Page
- Search (name/type)
- Filter status (Active/Inactive)
- Create Product button
Table: name, type, status, last updated, actions (View/Edit/Archive) :contentReference[oaicite:41]{index=41}

### 5.2 Create/Edit Product Page
Sections:
A) Basic info (name, status)  
B) Shared description (short/full, use cases, agent notes)  
C) Standards/compliance (DTI notes, QC requirements, batch tracking)  
D) Defaults (unit, discount policy, min stock template)  
Buttons: Save, Save & Add Variants :contentReference[oaicite:42]{index=42}

### 5.3 Product Detail (Hub)
Header + actions (Edit, Add variant, Hide, Archive)  
A) Overview cards (description, images, standards, QC/batch flags, pricing policy, branch dropdown)  
B) Variants table (SKU, specs, unit, cost, price, margin, stock status, raw material usage, actions)  
C) Variant performance rollup (revenue, units, top variants, stockout incidents, charts)  
D) Forecast rollup (demand, suggested prioritize) :contentReference[oaicite:43]{index=43}

### 5.4 Create/Edit Variant Page (Sellable SKU)
A) Identity (parent product, variant name, SKU, status)  
B) Measurements (diameter, class, length, unit)  
C) Pricing & cost (cost, base price, bulk rules, min price rule)  
D) Inventory rules (min stock, reorder point)  
E) Production (raw material usage + qty per unit, output rate)  
F) Logistics attributes (weight/volume, stackability, handling notes)  
Buttons: Save, Save & Create Another, Cancel :contentReference[oaicite:44]{index=44}

### 5.5 Variant Detail Page
A) Spec card  
B) Stock by branch table (on hand, reserved, available, in transit, min level, status)  
C) Sales & customers (units, revenue, top stores, frequency)  
D) Production & QC history (batches, QC, scrap, reject reasons)  
E) Forecast & reorder suggestions (30/60/90, risk date, suggested qty, purchase timing) :contentReference[oaicite:45]{index=45}

---

## 6) Raw Materials Module

### Pages Overview
1. Raw Materials List (Dashboard)
2. Create Raw Material
3. Raw Material Detail
4. Receiving / GRN
5. Purchase Requests list :contentReference[oaicite:46]{index=46}

### 6.1 Raw Materials List
Top controls:
- Branch selector, date range (movements), search (name/code/supplier)
- Filters (OK/Low/Critical, delayed delivery, supplier)
- Buttons: Add material, Create Purchase Request, Record Receiving, Export
KPI strip:
- critical count, low count, due this week, delayed deliveries, stockouts in X days, total value
Table columns:
- code, name, unit, branch stock, total on hand, reserved, avg use, days cover, reorder point, status
- next incoming (date/qty/supplier/status)
- impact indicator (affects batches / may delay orders)
- actions: view/receive/create request/adjust stock
Right alerts panel with suggested actions :contentReference[oaicite:47]{index=47}

### 6.2 Create Raw Material
Identity + inventory rules (reorder point/qty, safety stock, lead time, storage notes) :contentReference[oaicite:48]{index=48}

### 6.3 Raw Material Detail
- Stock by branch table
- Consumption/usage charts + “used most in these products”
- Forecast/risk + suggested reorder date/qty
- Incoming deliveries / purchase history
- Related production batches
- Activity/audit log :contentReference[oaicite:49]{index=49}

### 6.4 Receiving / GRN Page
Header:
- receiving ID, branch, supplier, linked PO optional, DR #, received date
Items table:
- material, ordered qty, received qty, unit, condition, notes
Actions:
- submit receiving, save draft, print receiving report :contentReference[oaicite:50]{index=50}

### 6.5 Purchase Requests
List columns:
- request #, branch, material, qty, reason, requested by, status, expected arrival, delay badge
Boss actions:
- approve/reject
- convert request to PO
- follow-up supplier :contentReference[oaicite:51]{index=51}

---

## 7) Orders Module (End-to-End)

### 7.1 Roles & who uses what
- Agent/Sales: create orders, view status, send payment link, see payment status
- Boss: approvals (pricing/discount/terms), reporting
- Warehouse: pick/pack/ready updates, shortage reporting
- Logistics/Branch: trip planning, dispatch, delivery confirmation + POD uploads
- Finance: invoices, payment recording (offline), payment links, reconciliation, receipts, exports
- Customer: optional checkout + receipt view :contentReference[oaicite:52]{index=52}

### 7.2 Pages Overview (Complete)
1. Orders List  
2. Create Order  
3. Order Detail (Truth Page)  
4. Approval Queue (Boss)  
5. Fulfillment Board (Warehouse)  
6. Dispatch Board (Logistics/Branch)  
7. Invoices & Payments (Finance)  
8. Checkout & Payment Link (Customer)  
9. Payments & Reconciliation Center (Finance)  
10. Receipts Center (Finance)  
11. Discounts & Pricing Rules (Boss/Finance Admin)  
12. Customer Accounts & Credit (Boss/Finance Admin)  
13. Reports & Dashboards  
14. System Audit Log  
15. Notifications :contentReference[oaicite:53]{index=53}

### 7.3 Core Data Objects (Frontend Types)
- Order (id/number, customer, agent, branch, dates, delivery type, notes, status, totals, pricing metadata, invoice links)
- OrderLine (product family, variant SKU, qty, unit price, discount, line total, allocation, line status)
- Stock/Allocation (available/reserved/production needed, fulfillment progress)
- Shipment/Delivery (trip assignment, schedule, status, POD attachments)
- Invoice (number, dates, due/terms, amount, status, method expectation, payment link status)
- Payment (method online/offline/cheque, refs, proof attachment, posting status)
- Platform Fee (fee = min(1% of amount, ₱3000); per payment recommended)
- Receipt (receipt #, invoice #, payment ids, issued date, amount+fee, pdf link, dispatch logs)
- Reconciliation Entry (daily batches, matched/unmatched, settlement summary, export flags)
- Audit Log (who/what/when/before-after) :contentReference[oaicite:54]{index=54}

### 7.4 Workflow Statuses
**Order:** Draft → Pending Approval → Approved → In Production (optional) → To Pick → Picking → Packed → Ready for Dispatch → Scheduled → In Transit → Delivered → Completed (+ Cancelled/Rejected)  
**Invoice:** Unbilled → Invoiced → Awaiting Payment → Partially Paid → Paid → Overdue → Voided  
**Payment Link:** Not generated → Generated → Sent → Viewed (optional) → Paid → Expired → Voided :contentReference[oaicite:55]{index=55}

### 7.5 Page Specs
#### Orders List
Search + filters (date, status, branch, agent, customer, payment status/method/link status, delivery, stock)  
Buttons: Create, Export  
Columns include badges (Delayed, Overdue, Partial fulfillment, Paid online) :contentReference[oaicite:56]{index=56}

#### Create Order (Agent)
Header info, line items with stock hints + min price warnings, pricing summary, payment terms/method expectation  
Rules: below min price/high discount → boss approval  
Submit → Pending Approval + notify boss :contentReference[oaicite:57]{index=57}

#### Order Detail (Truth Page)
Header with badges + role-based actions  
Panels:
- Status timeline
- Line items
- Stock & production allocation + blockers
- Delivery panel + POD
- Billing & payment panel (invoice, terms, amount paid, method, link status, fee summary)
- Activity & audit log :contentReference[oaicite:58]{index=58}

#### Approval Queue (Boss)
Approves pricing/discount exceptions, special terms, risk orders  
Columns: order, customer, agent, total, discount, terms, margin indicator, required date, stock risk flags, payment expectation  
Actions: view, approve, reject w/ reason :contentReference[oaicite:59]{index=59}

#### Fulfillment Board (Warehouse)
Kanban: To Pick → Picking → Packed → Ready → Blocked  
Card fields: order #, customer, required date, item summary, stock status, (optional) payment badge  
Actions: start picking, mark packed, mark ready, report shortage :contentReference[oaicite:60]{index=60}

#### Dispatch Board (Logistics/Branch)
Panels: Ready / Scheduled / In Transit / Delivered  
Actions: assign, reschedule, split, mark delayed, upload POD :contentReference[oaicite:61]{index=61}

#### Invoices & Payments (Finance)
Tabs:
- Invoices: create from order, edit terms (role-gated), list + status/overdue
- Payments: online auto-posted; offline form (method, amount, date, ref, upload proof); receipt issuance; fee summary per invoice with fee cap :contentReference[oaicite:62]{index=62}

#### Checkout & Payment Link (Customer)
Invoice details, fee transparency (1% capped ₱3000), total payable, pay method(s)  
After payment: confirmation, receipt view/download, “receipt emailed” :contentReference[oaicite:63]{index=63}

#### Reconciliation Center (Finance)
Table: date, invoice, customer, method, gross, fee, net, status, receipt #  
Tools: match offline, unmatched list, export CSV/Excel, daily/monthly summaries :contentReference[oaicite:64]{index=64}

#### Receipts Center
Search by invoice/customer/date/agent/branch; resend; batch download; templates/branding/T&Cs :contentReference[oaicite:65]{index=65}

#### Discounts & Pricing Rules (Admin)
Price lists, minimum price enforcement, discount thresholds per role, approval rules, logging overrides :contentReference[oaicite:66]{index=66}

#### Customer Accounts & Credit (Basic)
Customer profile, default terms (30/60/90), credit limit, overdue flags, optional “hold new orders if overdue” policy :contentReference[oaicite:67]{index=67}

#### Reports & Dashboards
Sales by agent/branch/customer, best accounts, discount utilization, stockouts→lost sales estimate, AR aging, online payment adoption (% paid online, fees collected, time to pay) :contentReference[oaicite:68]{index=68}

#### System Audit Log
Central audit viewer, filter by entity, export for compliance :contentReference[oaicite:69]{index=69}

#### Notifications (Cross-module)
Triggers: order submitted/approved/rejected, invoice created, link sent, payment received, offline recorded, overdue reminder, delivery scheduled/delivered  
Channels: in-app (+ optional email/SMS later) :contentReference[oaicite:70]{index=70}

---

## 8) Logistics Page (Full Spec Workspace)

Purpose: plan/schedule deliveries, assign orders, track in-transit/delivered, collect POD, manage delays/exceptions. Boss has oversight + high-impact approvals + policy controls. :contentReference[oaicite:71]{index=71}

Includes:
- Top summary KPIs (plus boss-only performance)
- Dispatch workspace tabs (Ready / Scheduled Trips / In Transit / Delivered)
- Trip builder drawer (constraints & warnings)
- POD requirements/status + boss KPI on compliance
- Exceptions & delay queue + boss approvals
- Boss oversight mode: branch comparison, high-impact approval queue, logistics policy controls
- Mandatory audit logging on all actions :contentReference[oaicite:72]{index=72}

---

## 9) Warehouse Page (Full Spec Workspace)

Purpose: pick/pack/stage, allocate stock, handle QC holds, track bottlenecks, hand off Ready orders to Logistics. Boss oversight adds cross-branch KPIs + policies + override approvals. :contentReference[oaicite:73]{index=73}

Includes:
- Top KPIs (plus boss-only productivity KPIs)
- Operations boards (To Allocate/To Pick, Picking, Packing, Staging/Ready, Blocked)
- Order prep detail panel
- Stock & location view (move/adjust, QC hold stock)
- QC panel (pass/fail, rework, time in QC)
- Shortage & exceptions management
- Boss oversight mode (bottleneck + policies + high-impact override approvals)
- Mandatory audit logging :contentReference[oaicite:74]{index=74}

---

## 10) Suppliers & Materials (Procurement)

Pages:
1) Suppliers List  
2) Supplier Profile  
3) Materials Supplied (cross-supplier)  
4) Purchase Orders to Suppliers  
5) Receiving & QC inbound  
6) Supplier Analytics (Boss)  
7) Contacts & Documents  
8) Pricing History & Contracts  
9) Alerts & Reorder Signals  
10) Audit & History :contentReference[oaicite:75]{index=75}

Key details:
- Supplier list filters (category/status/risk/lead time/spend) + badges (delays, quality issues, preferred, contract pricing)
- Supplier profile: contacts, materials supplied, commercial terms, performance summary
- PO flow: draft/sent/confirmed/received/closed; line items; actions (send/confirm/cancel)
- Receiving: delivered qty, damaged/rejected, uploads, QC status, affects stock + supplier scoring
- Analytics: spend, reliability, QC, single-source risks, negotiation insights
- Alerts: low stock, late suppliers, QC spikes, contract expiry, price spikes
- Audit log required :contentReference[oaicite:76]{index=76}

---

## 11) Customers Module (Hardware Stores / Dealers / Projects)

Pages:
1) Customers List (Health view)  
2) Customer Profile (truth page)  
3) Buying patterns & mix  
4) Order history & timeline  
5) Demand signals & forecast hints  
6) Credit/terms/payment behavior (basic)  
7) Opportunities & at-risk flags  
8) Portfolio analytics (Boss)  
9) Forecast inputs dashboard (Ops/Planning)  
10) Alerts & triggers  
11) Notes/tasks/audit :contentReference[oaicite:77]{index=77}

Key:
- Rich filtering by type, branch/territory, agent, last order recency, frequency, revenue tier, growth trend, risk flags
- Profile includes tags, contacts
- Buying patterns: top SKUs, category mix, repeatability score
- Demand signals: expected next order window + likely products + contribution to global forecast
- Risk: overdue, volatility, gaps; suggested next actions
- Boss portfolio: segmentation, concentration risk, churn
- Alerts: skipped order window, spike/drop vs normal, multiple customers trending up on same SKU → shortage risk :contentReference[oaicite:78]{index=78}

---

## 12) Online Payment Flow (High-Level)

High-level steps:
1) Agent creates order → boss approves if needed
2) Finance/boss generates invoice (or auto-invoice)
3) Agent “Close Deal → Send Payment Link”
4) Customer pays via checkout page
5) System posts payment + generates receipt
6) Finance sees reconciliation + exports :contentReference[oaicite:79]{index=79}

Minimal pages:
- Agent: Close Deal panel (inside Order Detail)
- Agent: Send Payment Link drawer/page
- Agent: Payment Link tracker widget/page
- Customer: Checkout page
- Customer: Payment result page (success/fail)
- Customer: Receipt view page
- Finance/Boss: Invoice & payment control center
- Finance: Reconciliation center
- Finance: Receipts center
- Boss/Finance: Fee & payout summary :contentReference[oaicite:80]{index=80}

Key guardrails:
- Cannot generate link if order not approved
- Cannot generate link if invoice not issued
- Disable if already paid
- Fee displayed transparently: **fee = 1% capped ₱3,000** :contentReference[oaicite:81]{index=81}

---

## 13) Cross-Cutting Requirements (Frontend Simulation)

### RBAC (UI-only)
- Role-based routing + hidden actions per role
- Provide a “Simulate role” switch in prototype for demo

### Multi-Branch
- Branch filter affects all lists/metrics and dashboards

### Audit Logging (UI-only)
- Every critical action appends an audit record:
  - approvals/rejections
  - stock adjustments/transfers
  - trip edits/status changes
  - POD uploads
  - pricing overrides
  - receiving/QC outcomes :contentReference[oaicite:82]{index=82}

### Notifications (UI-only)
- In-app notifications drawer; mark read/unread; grouped by category :contentReference[oaicite:83]{index=83}

---

## 14) Placeholder Data Requirements (for Copilot)
Create mock datasets (minimum):
- Branches (A/B/C), users per role
- Products + variants (10+ SKUs)
- Raw materials (8+)
- Customers (15+; include risk flags)
- Suppliers (8+)
- Orders (30+ across statuses)
- Trips/Deliveries (10+; include delayed/failed)
- Invoices/Payments/Receipts (15+; include partial, overdue)
- Notifications (20+)
- Audit logs (50+ seeded)

> Keep data in `/mock/*.ts` and define interfaces in `/types/*.ts`.