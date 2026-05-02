-- ============================================================================
-- LAMTEX ERP - Comprehensive Supabase Database Schema
-- Version: 2.0
-- Database: PostgreSQL (Supabase)
-- Generated: 2026-03-15
-- 
-- Run this entire script in the Supabase SQL Editor.
-- All statements use IF NOT EXISTS / DO blocks for idempotent re-runs.
-- ============================================================================

-- ============================================================================
-- SECTION 0: EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";     -- gen_random_uuid(), crypt(), gen_salt()


-- ============================================================================
-- SECTION 1: ENUM TYPES
-- Safe creation using DO blocks to avoid errors on re-run
-- ============================================================================

-- ── Auth & Roles ────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('Executive', 'Warehouse', 'Logistics', 'Agent', 'Driver'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE employee_role AS ENUM ('Sales Agent', 'Logistics Manager', 'Warehouse Manager', 'Machine Worker', 'Truck Driver'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE employee_status AS ENUM ('active', 'on-leave', 'inactive'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE system_role AS ENUM ('Agent', 'Senior Agent', 'Team Lead', 'Branch Manager'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE employment_status AS ENUM ('Full-time', 'Part-time', 'Contract', 'Probationary'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE gender_enum AS ENUM ('Male', 'Female', 'Other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE civil_status_enum AS ENUM ('Single', 'Married', 'Widowed', 'Separated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE bank_account_type AS ENUM ('Savings', 'Current'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE pay_frequency AS ENUM ('Weekly', 'Bi-weekly', 'Monthly'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE commission_tier AS ENUM ('Bronze', 'Silver', 'Gold', 'Platinum'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE skill_level AS ENUM ('Beginner', 'Intermediate', 'Advanced', 'Expert'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE training_type AS ENUM ('Product Knowledge', 'Sales Skills', 'Technical', 'Soft Skills', 'Compliance'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE document_type AS ENUM ('Resume', 'ID', 'Certificate', 'Contract', 'Performance Review', 'Other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE asset_type AS ENUM ('Laptop', 'Mobile Phone', 'Vehicle', 'Tablet', 'Equipment', 'Other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE asset_condition AS ENUM ('New', 'Good', 'Fair', 'Needs Repair'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE employee_note_type AS ENUM ('General', 'Performance', 'Disciplinary', 'Commendation', 'HR'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE employee_activity_type AS ENUM ('Login', 'Order Created', 'Customer Visit', 'Quote Generated', 'Meeting', 'Other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE customer_assignment_status AS ENUM ('Active', 'Inactive', 'At Risk', 'VIP'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Product Enums ───────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE product_status AS ENUM ('Active', 'Discontinued', 'Out of Stock', 'Low Stock'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Material Enums ──────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE material_status AS ENUM ('Active', 'Discontinued', 'Low Stock', 'Out of Stock', 'Expired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE unit_of_measure AS ENUM ('kg', 'ton', 'liter', 'pieces', 'bags', 'drums'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE quality_status AS ENUM ('Pending', 'Passed', 'Failed', 'Conditionally Approved'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE material_movement_type AS ENUM ('Receipt', 'Issue', 'Transfer', 'Adjustment', 'Return'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE movement_reference_type AS ENUM ('PO', 'PR', 'Production', 'Transfer Request', 'Manual'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Order Enums ─────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE order_status AS ENUM ('Draft', 'Pending', 'Approved', 'Scheduled', 'Loading', 'Packed', 'Ready', 'In Transit', 'Delivered', 'Completed', 'Cancelled', 'Rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_status AS ENUM ('Unbilled', 'Invoiced', 'Partially Paid', 'Paid', 'Overdue'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE delivery_type AS ENUM ('Truck', 'Ship', 'Pickup'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_terms AS ENUM ('COD', '15 Days', '30 Days', '45 Days', '60 Days', '90 Days', 'Custom'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_method_enum AS ENUM ('Online', 'Offline'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE stock_hint AS ENUM ('Available', 'Partial', 'Not Available'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE delivery_status_enum AS ENUM ('On Time', 'Delayed', 'Failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE order_log_action AS ENUM (
  'created', 'status_changed', 'payment_status_changed',
  'item_added', 'item_removed', 'item_quantity_changed', 'item_price_changed',
  'discount_applied', 'approved', 'rejected', 'shipped', 'delivered', 'cancelled',
  'payment_received', 'invoice_generated', 'note_added',
  'proof_uploaded', 'proof_verified', 'proof_rejected'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE order_log_role AS ENUM ('Agent', 'Warehouse Staff', 'Manager', 'Admin', 'System', 'Logistics'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE proof_type AS ENUM ('delivery', 'payment', 'receipt'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE proof_status AS ENUM ('pending', 'verified', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE proof_uploader_role AS ENUM ('Agent', 'Customer', 'Logistics'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Customer Enums ──────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE customer_type AS ENUM ('Hardware Store', 'Construction Company', 'Contractor', 'Distributor'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE customer_status AS ENUM ('Active', 'Inactive', 'Suspended', 'Dormant', 'On Hold'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE client_type AS ENUM ('Office', 'Personal'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE risk_level AS ENUM ('Low', 'Medium', 'High'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_behavior AS ENUM ('Good', 'Watchlist', 'Risk'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE customer_note_type AS ENUM ('Call', 'Visit', 'Email', 'Meeting', 'Negotiation', 'Complaint', 'Other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE customer_task_type AS ENUM ('Follow-up', 'Visit', 'Call', 'Delivery Check', 'Collection', 'Quote', 'Other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE task_priority AS ENUM ('Low', 'Medium', 'High', 'Urgent'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE task_status AS ENUM ('Pending', 'In Progress', 'Completed', 'Cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE customer_activity_type AS ENUM ('Order Created', 'Payment Received', 'Note Added', 'Task Created', 'Call Made', 'Visit Completed', 'Status Changed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Supplier Enums ──────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE supplier_type AS ENUM ('Raw Materials', 'Packaging', 'Chemicals', 'Equipment', 'Services'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE supplier_category AS ENUM ('Resin Supplier', 'Additives Supplier', 'Packaging Supplier', 'General'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE supplier_status AS ENUM ('Active', 'Inactive', 'Blacklisted'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Purchase Enums ──────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE purchase_requisition_status AS ENUM ('Draft', 'Pending Approval', 'Approved', 'Rejected', 'Ordered', 'Completed', 'Cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE purchase_order_status AS ENUM ('Draft', 'Sent', 'Confirmed', 'Partially Received', 'Completed', 'Cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE grn_status AS ENUM ('Draft', 'Completed', 'Partially Accepted', 'Rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE urgency_level AS ENUM ('Low', 'Medium', 'High', 'Critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Logistics Enums ─────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE vehicle_type AS ENUM ('Truck', 'Container Van', 'Motorcycle'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE vehicle_status AS ENUM ('Available', 'On Trip', 'Loading', 'Maintenance', 'Out of Service'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE financing_status AS ENUM ('Owned', 'Financed', 'Leased'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE trip_status AS ENUM ('Pending', 'Planned', 'Loading', 'In Transit', 'Completed', 'Delayed', 'Failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE delivery_tracking_status AS ENUM ('Scheduled', 'Loading', 'In Transit', 'Delivered', 'Delayed', 'Failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE delay_exception_type AS ENUM ('Vehicle Breakdown', 'Traffic', 'Weather', 'Customer Unavailable', 'Wrong Address', 'Stock Shortage', 'Other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE delay_exception_status AS ENUM ('Open', 'In Progress', 'Resolved', 'Escalated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE shipment_type AS ENUM ('Sea Freight', 'Air Freight'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE shipment_status AS ENUM ('Preparing', 'In Transit', 'Arrived', 'Delayed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE maintenance_category AS ENUM ('Preventive', 'Corrective', 'Emergency'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Warehouse Enums ─────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE fulfillment_status AS ENUM ('To Pick', 'Loading', 'Packing', 'Ready', 'Blocked'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE warehouse_stock_status AS ENUM ('Fully Available', 'Partial', 'Not Available'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE loading_detail_status AS ENUM ('Pending', 'Loading', 'Partial', 'Full', 'Out of Stock', 'Ready'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE qa_status AS ENUM ('Pending', 'Testing', 'Passed', 'Failed', 'Rework'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE quality_issue_type AS ENUM ('Rejected Batch', 'Damaged Goods', 'Re-inspection', 'Customer Return'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE quality_issue_status AS ENUM ('Open', 'Investigating', 'Resolved', 'Escalated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE machine_status_enum AS ENUM ('Running', 'Idle', 'Maintenance', 'Error'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE product_stock_movement_type AS ENUM ('In', 'Out', 'Transfer', 'Adjustment'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE warehouse_movement_type AS ENUM ('In', 'Out', 'Transfer', 'Adjust', 'Production', 'Damage'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Payment System Enums ────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE payment_method_type AS ENUM ('GCash', 'Maya', 'Bank Transfer', 'Credit Card', 'Debit Card', 'Cash', 'Check'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_link_status AS ENUM ('pending', 'paid', 'expired', 'cancelled', 'failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_transaction_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Collections Enums ───────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE collection_status AS ENUM ('Current', 'Due Soon', 'Overdue', 'Critical', 'Collected', 'Partially Paid'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE collection_note_type AS ENUM ('Phone Call', 'Email', 'Visit', 'Promise to Pay', 'Dispute', 'Other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE collection_payment_method AS ENUM ('Cash', 'Check', 'Bank Transfer', 'Online Payment', 'Credit Card'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE verification_status AS ENUM ('Pending', 'Verified', 'Rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Chat Enums ──────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE chat_type AS ENUM ('direct', 'group'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE chat_user_status AS ENUM ('online', 'offline', 'away'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE chat_member_role AS ENUM ('admin', 'member'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Agent Enums ─────────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE agent_order_status AS ENUM ('Draft', 'Pending Approval', 'Approved', 'Rejected', 'In Fulfillment', 'Ready for Dispatch', 'Delivered', 'Cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE agent_account_type AS ENUM ('Retail', 'Construction', 'Distributor', 'Government'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE agent_health_score AS ENUM ('Excellent', 'Good', 'Fair', 'Poor'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE agent_alert_type AS ENUM ('Payment Overdue', 'Order Rejected', 'POD Pending', 'Credit Limit', 'Customer Issue', 'Target Alert', 'Commission Update'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE purchase_request_category AS ENUM ('Raw Material', 'Finished Good', 'Supplies', 'Equipment'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE purchase_request_status AS ENUM ('Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Ordered', 'Received'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE commission_status AS ENUM ('Pending', 'Approved', 'Paid'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Notification / Alert Enums ──────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE notification_category AS ENUM ('Approvals', 'Inventory', 'Delivery', 'Payment', 'System'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE alert_severity AS ENUM ('Low', 'Medium', 'High', 'Critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE logistics_alert_type AS ENUM ('New Order Ready', 'Warehouse Not Ready', 'Truck Unavailable', 'Delivery Failed', 'Capacity Warning', 'Executive Request'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE warehouse_alert_type AS ENUM ('Low Stock', 'Shortage Impact', 'Material Delay', 'Material Arrival', 'QA Reject', 'Transfer Request'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Calendar Enums ──────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE calendar_event_type AS ENUM ('Outgoing', 'Incoming', 'Transfer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Settings Enums ──────────────────────────────────────────────────────────
DO $$ BEGIN CREATE TYPE address_type AS ENUM ('Main Office', 'Warehouse', 'Factory', 'Branch'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- SECTION 2: CORE REFERENCE TABLES
-- ============================================================================

-- Branches
CREATE TABLE IF NOT EXISTS branches (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code       VARCHAR(10)  NOT NULL UNIQUE,  -- 'MNL', 'CEB', 'BTG'
  name       VARCHAR(100) NOT NULL,          -- 'Manila', 'Cebu', 'Batangas'
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 3: EMPLOYEES (Core + Extended Tables)
-- ============================================================================

-- 3a: Core employees table
CREATE TABLE IF NOT EXISTS employees (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     VARCHAR(50)     NOT NULL UNIQUE,  -- Human-readable ID (EMP-001)
  employee_name   VARCHAR(200)    NOT NULL,
  email           VARCHAR(255)    NOT NULL UNIQUE,
  phone           VARCHAR(50),
  role            employee_role   NOT NULL,
  department      VARCHAR(100),
  branch_id       UUID            REFERENCES branches(id) ON DELETE SET NULL,
  status          employee_status NOT NULL DEFAULT 'active',
  system_role     system_role,                        -- For agents only
  profile_photo   TEXT,
  join_date       DATE            NOT NULL,
  tenure_months   INT             DEFAULT 0,
  
  -- Auth link (Supabase auth.users)
  auth_user_id    UUID            UNIQUE,
  user_role       user_role,                          -- Dashboard role
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3b: Personal information
CREATE TABLE IF NOT EXISTS employee_personal_info (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     UUID NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
  date_of_birth   DATE,
  age             INT,
  gender          gender_enum,
  nationality     VARCHAR(100) DEFAULT 'Filipino',
  civil_status    civil_status_enum,
  religion        VARCHAR(100),
  blood_type      VARCHAR(10),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3c: Contact information
CREATE TABLE IF NOT EXISTS employee_contact_info (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     UUID NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
  primary_phone           VARCHAR(50),
  secondary_phone         VARCHAR(50),
  personal_email          VARCHAR(255),
  work_email              VARCHAR(255),
  emergency_contact_name  VARCHAR(200),
  emergency_contact_phone VARCHAR(50),
  emergency_contact_relationship VARCHAR(100),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3d: Addresses
CREATE TABLE IF NOT EXISTS employee_addresses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  address_label   VARCHAR(50) DEFAULT 'Permanent', -- 'Permanent', 'Current'
  street          TEXT,
  barangay        VARCHAR(200),
  city            VARCHAR(200),
  province        VARCHAR(200),
  postal_code     VARCHAR(20),
  is_current      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3e: Employment details
CREATE TABLE IF NOT EXISTS employee_employment_info (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id         UUID NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
  employment_status   employment_status NOT NULL DEFAULT 'Full-time',
  position            VARCHAR(200),
  department          VARCHAR(200),
  reporting_to        VARCHAR(200),
  branch_manager_name VARCHAR(200),
  work_schedule_days  TEXT[],         -- ['Monday','Tuesday',...]
  work_start_time     TIME,
  work_end_time       TIME,
  shift               VARCHAR(50),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3f: Compensation
CREATE TABLE IF NOT EXISTS employee_compensation (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id             UUID NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
  base_salary             NUMERIC(12,2) DEFAULT 0,
  commission_rate         NUMERIC(5,2)  DEFAULT 0,   -- Percentage
  commission_tier         commission_tier,
  bonus_eligibility       BOOLEAN DEFAULT FALSE,
  monthly_quota           NUMERIC(14,2) DEFAULT 0,
  quarterly_quota         NUMERIC(14,2) DEFAULT 0,
  yearly_quota            NUMERIC(14,2) DEFAULT 0,
  allowance_transport     NUMERIC(10,2) DEFAULT 0,
  allowance_meal          NUMERIC(10,2) DEFAULT 0,
  allowance_communication NUMERIC(10,2) DEFAULT 0,
  allowance_other         NUMERIC(10,2) DEFAULT 0,
  total_monthly_compensation NUMERIC(14,2) DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3g: Bank details
CREATE TABLE IF NOT EXISTS employee_bank_details (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id       UUID NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
  bank_name         VARCHAR(200),
  account_number    VARCHAR(100),
  account_name      VARCHAR(200),
  account_type      bank_account_type,
  payment_frequency pay_frequency,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3h: Government IDs
CREATE TABLE IF NOT EXISTS employee_government_ids (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     UUID NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
  tin             VARCHAR(50),
  sss             VARCHAR(50),
  phil_health     VARCHAR(50),
  pag_ibig        VARCHAR(50),
  gov_id_type     VARCHAR(100),
  gov_id_number   VARCHAR(100),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3i: Skills
CREATE TABLE IF NOT EXISTS employee_skills (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  skill_name      VARCHAR(200) NOT NULL,
  skill_level     skill_level NOT NULL,
  years_experience NUMERIC(4,1),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3j: Certifications
CREATE TABLE IF NOT EXISTS employee_certifications (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id           UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  certification_name    VARCHAR(300) NOT NULL,
  issuing_organization  VARCHAR(300),
  issue_date            DATE,
  expiry_date           DATE,
  credential_id         VARCHAR(200),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3k: Training history
CREATE TABLE IF NOT EXISTS employee_trainings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  training_name   VARCHAR(300) NOT NULL,
  training_type   training_type,
  completion_date DATE,
  duration        VARCHAR(100),  -- e.g. '3 days', '2 hours'
  instructor      VARCHAR(200),
  score           NUMERIC(5,2),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3l: Documents
CREATE TABLE IF NOT EXISTS employee_documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  document_type   document_type NOT NULL,
  document_name   VARCHAR(300) NOT NULL,
  file_url        TEXT NOT NULL,
  file_size       VARCHAR(50),
  uploaded_by     VARCHAR(200),
  upload_date     DATE DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3m: Assets assigned to employees
CREATE TABLE IF NOT EXISTS employee_assets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  asset_type      asset_type NOT NULL,
  asset_name      VARCHAR(300) NOT NULL,
  serial_number   VARCHAR(200),
  model           VARCHAR(200),
  assigned_date   DATE,
  condition       asset_condition DEFAULT 'Good',
  value           NUMERIC(12,2) DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3n: Employee notes (HR / supervisor notes)
CREATE TABLE IF NOT EXISTS employee_notes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  note_type       employee_note_type NOT NULL DEFAULT 'General',
  note            TEXT NOT NULL,
  created_by      VARCHAR(200),
  is_private      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3o: Employee activity log
CREATE TABLE IF NOT EXISTS employee_activities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  activity_type   employee_activity_type NOT NULL,
  description     TEXT NOT NULL,
  location        VARCHAR(300),
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3p: Agent targets & incentives
CREATE TABLE IF NOT EXISTS agent_targets (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id              UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period                   VARCHAR(20) NOT NULL,   -- '2026-Q1', '2026-03', 'yearly-2026'
  monthly_sales_target     NUMERIC(14,2) DEFAULT 0,
  quarterly_sales_target   NUMERIC(14,2) DEFAULT 0,
  target_achievement_rate  NUMERIC(5,2)  DEFAULT 0,
  days_ahead_behind        INT           DEFAULT 0,
  revenue_gap              NUMERIC(14,2) DEFAULT 0,
  stretch_goal_status      VARCHAR(100),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_incentives (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  streak_days     INT DEFAULT 0,
  bonus_tier      VARCHAR(50),
  milestones      JSONB DEFAULT '[]'::jsonb,  -- Array of milestone strings
  awards          JSONB DEFAULT '[]'::jsonb,
  badges          JSONB DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3q: Agent commissions
CREATE TABLE IF NOT EXISTS agent_commissions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id       UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period            VARCHAR(20) NOT NULL,        -- '2026-03'
  sales_amount      NUMERIC(14,2) DEFAULT 0,
  commission_rate   NUMERIC(5,2)  DEFAULT 0,
  commission_earned NUMERIC(14,2) DEFAULT 0,
  status            commission_status NOT NULL DEFAULT 'Pending',
  paid_date         DATE,
  breakdown         JSONB DEFAULT '[]'::jsonb,   -- Array of {orderNumber, customerName, saleAmount, commission}
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3r: Customer assignments (which agent owns which customers)
CREATE TABLE IF NOT EXISTS customer_assignments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  customer_id     UUID,              -- FK added after customers table
  customer_name   VARCHAR(300),
  company         VARCHAR(300),
  contact_number  VARCHAR(50),
  email           VARCHAR(255),
  total_orders    INT DEFAULT 0,
  lifetime_revenue NUMERIC(14,2) DEFAULT 0,
  last_order_date DATE,
  status          customer_assignment_status DEFAULT 'Active',
  assigned_date   DATE DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 4: SUPPLIERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                     TEXT        NOT NULL,
  type                     TEXT        NOT NULL
                             CHECK (type IN ('Raw Materials','Packaging','Chemicals','Equipment','Services')),
  category                 TEXT,
  contact_person           TEXT,
  phone                    TEXT,
  email                    TEXT,
  payment_terms            TEXT        NOT NULL DEFAULT '30 Days', -- repurposed: avg delivery time (e.g. "45 Days")
  currency                 TEXT        NOT NULL DEFAULT 'PHP',
  status                   TEXT        NOT NULL DEFAULT 'Active'
                             CHECK (status IN ('Active','Inactive','Suspended','Under Review')),

  -- Performance metrics
  performance_score        NUMERIC     NOT NULL DEFAULT 0,
  quality_rating           NUMERIC     NOT NULL DEFAULT 0,
  delivery_rating          NUMERIC     NOT NULL DEFAULT 0,
  avg_lead_time            INTEGER     NOT NULL DEFAULT 0,
  on_time_delivery_rate    NUMERIC     NOT NULL DEFAULT 0,
  defect_rate              NUMERIC     NOT NULL DEFAULT 0,

  -- Financials
  total_purchases_ytd      NUMERIC     NOT NULL DEFAULT 0,
  total_purchases_lifetime NUMERIC     NOT NULL DEFAULT 0,
  order_count              INTEGER     NOT NULL DEFAULT 0,
  avg_order_value          NUMERIC     NOT NULL DEFAULT 0,
  last_purchase_date       DATE,
  account_since            DATE,

  preferred_supplier       BOOLEAN     NOT NULL DEFAULT false,
  risk_level               TEXT        NOT NULL DEFAULT 'Low'
                             CHECK (risk_level IN ('Low','Medium','High')),
  notes                    TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Supplier ↔ Branch assignments (many-to-many)
CREATE TABLE IF NOT EXISTS supplier_branches (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID        NOT NULL REFERENCES suppliers(id)  ON DELETE CASCADE,
  branch_id   UUID        NOT NULL REFERENCES branches(id)   ON DELETE CASCADE,
  is_primary  BOOLEAN     NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(supplier_id, branch_id)
);

-- Supplier ↔ Raw Material pricing catalogue
CREATE TABLE IF NOT EXISTS supplier_materials (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id    UUID        NOT NULL REFERENCES suppliers(id)     ON DELETE CASCADE,
  material_id    UUID        NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  unit_price     NUMERIC     NOT NULL DEFAULT 0,
  lead_time_days INTEGER     NOT NULL DEFAULT 0,
  min_order_qty  NUMERIC     NOT NULL DEFAULT 0,
  is_preferred   BOOLEAN     NOT NULL DEFAULT false,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(supplier_id, material_id)
);


-- ============================================================================
-- SECTION 5: PRODUCTS
-- ============================================================================

-- 5a: Product categories
CREATE TABLE IF NOT EXISTS product_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(200) NOT NULL,
  slug        VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  image_url   TEXT,
  sort_order  INT DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  branch      VARCHAR(50) DEFAULT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5b: Products
CREATE TABLE IF NOT EXISTS products (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(300)   NOT NULL,
  category_id     UUID           REFERENCES product_categories(id) ON DELETE SET NULL,
  description     TEXT,
  specifications  JSONB DEFAULT '{}'::jsonb,  -- {material, pressureRating, temperature, standard, color, application}
  image_url       TEXT,
  images          TEXT[],                     -- Array of image URLs
  status          product_status NOT NULL DEFAULT 'Active',
  
  -- Aggregated stats (denormalized for performance)
  total_variants   INT DEFAULT 0,
  total_stock      INT DEFAULT 0,
  avg_price        NUMERIC(12,2) DEFAULT 0,
  total_revenue    NUMERIC(14,2) DEFAULT 0,  -- YTD
  total_units_sold INT DEFAULT 0,            -- YTD
  
  branch          VARCHAR(100),              -- optional branch filter (matches `branches.name` when set)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5c: Product variants (SKU level)
CREATE TABLE IF NOT EXISTS product_variants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku             VARCHAR(100) NOT NULL UNIQUE,
  size            VARCHAR(100) NOT NULL,        -- '20mm', '25x20mm', 'SDR 11'
  description     TEXT,
  
  -- Pricing
  unit_price      NUMERIC(12,2) NOT NULL DEFAULT 0,
  wholesale_price NUMERIC(12,2),
  retail_price    NUMERIC(12,2),
  cost_price      NUMERIC(12,2),
  
  -- Aggregate stock (sum of all branch quantities)
  total_stock     INT NOT NULL DEFAULT 0,
  reorder_point   INT NOT NULL DEFAULT 0,
  safety_stock    INT NOT NULL DEFAULT 0,
  
  -- Physical specifications
  weight_kg       NUMERIC(10,3),
  length_m        NUMERIC(10,3),
  outer_diameter_mm NUMERIC(10,3),
  inner_diameter_mm NUMERIC(10,3),
  wall_thickness_mm NUMERIC(10,3),
  specs           JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Status
  status          product_status NOT NULL DEFAULT 'Active',
  
  -- Sales performance
  units_sold_ytd  INT DEFAULT 0,
  revenue_ytd     NUMERIC(14,2) DEFAULT 0,
  units_sold_mtd  INT DEFAULT 0,
  revenue_mtd     NUMERIC(14,2) DEFAULT 0,
  
  -- Supplier
  supplier_id     UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  lead_time_days  INT NOT NULL DEFAULT 7,
  min_order_qty   INT NOT NULL DEFAULT 100,
  
  branch          VARCHAR(100),              -- denormalized; matches `branches.name` when set
  last_restocked  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5d: Bulk / batch pricing discounts
CREATE TABLE IF NOT EXISTS product_bulk_discounts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id  UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  min_qty     INT NOT NULL,
  max_qty     INT,
  discount_percent NUMERIC(5,2) NOT NULL,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5e: Bill of Materials (which raw materials make this variant)
CREATE TABLE IF NOT EXISTS product_variant_raw_materials (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id      UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  raw_material_id UUID,          -- FK added after raw_materials table
  quantity_needed NUMERIC(12,4) NOT NULL DEFAULT 0,
  unit_of_measure unit_of_measure DEFAULT 'kg',
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5f: Product performance tracking
CREATE TABLE IF NOT EXISTS product_performance (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id      UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  period          VARCHAR(20) NOT NULL,   -- '2026-02'
  units_sold      INT DEFAULT 0,
  revenue         NUMERIC(14,2) DEFAULT 0,
  avg_selling_price NUMERIC(12,2) DEFAULT 0,
  orders_count    INT DEFAULT 0,
  top_customers   JSONB DEFAULT '[]'::jsonb,  -- [{customerName, unitsPurchased, revenue}]
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5g: Product stock movements
CREATE TABLE IF NOT EXISTS product_stock_movements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id      UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  variant_sku     VARCHAR(100),
  product_name    VARCHAR(300),
  movement_type   product_stock_movement_type NOT NULL,
  quantity        INT NOT NULL,
  from_branch     VARCHAR(10),
  to_branch       VARCHAR(10),
  reason          TEXT,
  performed_by    VARCHAR(200),
  reference_number VARCHAR(100),  -- Order number, PO number, etc.
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 6: RAW MATERIALS
-- ============================================================================

-- 6a: Material categories
CREATE TABLE IF NOT EXISTS material_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(200) NOT NULL UNIQUE,
  slug        VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  image_url   TEXT,
  sort_order  INT DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  branch_id   UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6b: Raw materials
CREATE TABLE IF NOT EXISTS raw_materials (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                VARCHAR(300) NOT NULL,
  sku                 VARCHAR(100) NOT NULL UNIQUE,
  brand               VARCHAR(200),
  category_id         UUID REFERENCES material_categories(id) ON DELETE SET NULL,
  description         TEXT,
  image_url           TEXT,
  specifications      JSONB DEFAULT '[]'::jsonb,  -- Array of {label, value} objects e.g. [{"label":"Density","value":"1.35 g/cm³"}]
  unit_of_measure     unit_of_measure NOT NULL DEFAULT 'kg',
  
  -- Aggregate stock (sum of all branch quantities)
  total_stock         NUMERIC(14,4) DEFAULT 0,
  reorder_point       NUMERIC(14,4) DEFAULT 0,
  safety_stock        NUMERIC(14,4) DEFAULT 0,
  
  -- Pricing
  cost_per_unit          NUMERIC(12,4) DEFAULT 0,
  currency               VARCHAR(10) DEFAULT 'PHP',
  last_purchase_price    NUMERIC(12,4) DEFAULT 0,
  average_cost           NUMERIC(12,4) DEFAULT 0,
  total_value            NUMERIC(14,2) DEFAULT 0,
  -- PO price sync (FK to purchase_orders added below via ALTER TABLE)
  price_synced_at        TIMESTAMPTZ,
  price_synced_from_po   UUID,
  
  -- Supplier
  primary_supplier    VARCHAR(300),
  supplier_id         UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_code       VARCHAR(100),
  lead_time_days      INT DEFAULT 0,
  
  -- Quality & compliance
  requires_quality_check BOOLEAN DEFAULT FALSE,
  shelf_life_days     INT,
  expiry_date         DATE,
  batch_tracking      BOOLEAN DEFAULT TRUE,
  
  -- Usage tracking
  monthly_consumption NUMERIC(14,4) DEFAULT 0,
  yearly_consumption  NUMERIC(14,4) DEFAULT 0,
  linked_products     UUID[],       -- Product IDs
  
  -- Status
  status              material_status NOT NULL DEFAULT 'Active',
  last_restock_date   DATE,
  last_issued_date    DATE,
  
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from BOM table to raw_materials
DO $$ BEGIN
  ALTER TABLE product_variant_raw_materials
    ADD CONSTRAINT fk_bom_raw_material
    FOREIGN KEY (raw_material_id) REFERENCES raw_materials(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6b-ii: Per-branch stock for raw materials
CREATE TABLE IF NOT EXISTS material_stock (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  branch_id   UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  quantity    NUMERIC(14,4) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (material_id, branch_id)
);

-- 6b-iii: Per-branch stock for product variants
CREATE TABLE IF NOT EXISTS product_variant_stock (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  branch_id  UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  quantity   INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (variant_id, branch_id)
);

-- 6c: Material batches / lots
CREATE TABLE IF NOT EXISTS material_batches (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id         UUID NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  material_name       VARCHAR(300),
  batch_number        VARCHAR(100) NOT NULL,
  lot_number          VARCHAR(100),
  
  -- Quantities
  quantity_received   NUMERIC(14,4) DEFAULT 0,
  quantity_available  NUMERIC(14,4) DEFAULT 0,
  quantity_issued     NUMERIC(14,4) DEFAULT 0,
  unit_of_measure     unit_of_measure DEFAULT 'kg',
  
  -- Dates
  manufacturing_date  DATE,
  received_date       DATE,
  expiry_date         DATE,
  
  -- Quality
  quality_status      quality_status DEFAULT 'Pending',
  certificate_number  VARCHAR(200),
  test_results        JSONB DEFAULT '[]'::jsonb,  -- [{parameter, result, specification, status}]
  
  -- Source
  supplier            VARCHAR(300),
  purchase_order_ref  VARCHAR(100),
  grn_number          VARCHAR(100),
  
  -- Location
  branch              VARCHAR(10),
  warehouse_location  VARCHAR(200),
  
  remarks             TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6d: Material stock movements
CREATE TABLE IF NOT EXISTS material_stock_movements (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id       UUID NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  material_name     VARCHAR(300),
  material_sku      VARCHAR(100),
  
  movement_type     material_movement_type NOT NULL,
  quantity          NUMERIC(14,4) NOT NULL,
  unit_of_measure   unit_of_measure DEFAULT 'kg',
  
  -- Location
  from_branch       VARCHAR(10),
  to_branch         VARCHAR(10),
  from_location     VARCHAR(200),
  to_location       VARCHAR(200),
  
  -- References
  reference_type    movement_reference_type,
  reference_number  VARCHAR(100),
  batch_number      VARCHAR(100),
  
  -- Details
  reason            TEXT,
  remarks           TEXT,
  
  -- People
  requested_by      VARCHAR(200),
  approved_by       VARCHAR(200),
  processed_by      VARCHAR(200),
  
  -- Cost
  cost_per_unit     NUMERIC(12,4),
  total_cost        NUMERIC(14,2),
  
  movement_date     DATE DEFAULT CURRENT_DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6e: Material consumption (for production)
CREATE TABLE IF NOT EXISTS material_consumption (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id         UUID NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  material_name       VARCHAR(300),
  
  quantity_consumed   NUMERIC(14,4) NOT NULL,
  unit_of_measure     unit_of_measure DEFAULT 'kg',
  consumption_date    DATE NOT NULL,
  
  -- Production link
  production_batch_id UUID,
  product_id          UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name        VARCHAR(300),
  
  branch              VARCHAR(10),
  
  -- Cost
  cost_per_unit       NUMERIC(12,4) DEFAULT 0,
  total_cost          NUMERIC(14,2) DEFAULT 0,
  
  -- Batch tracking
  batch_numbers       TEXT[],
  
  -- People
  issued_by           VARCHAR(200),
  approved_by         VARCHAR(200),
  
  remarks             TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 7: CUSTOMERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS customers (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name                  VARCHAR(300) NOT NULL,
  type                  customer_type,
  client_type           client_type DEFAULT 'Office',  -- Office=0.5% comm, Personal=1%
  status                customer_status NOT NULL DEFAULT 'Active',
  risk_level            risk_level DEFAULT 'Low',
  payment_behavior      payment_behavior DEFAULT 'Good',
  
  -- Contact
  contact_person        VARCHAR(200),
  phone                 VARCHAR(50),
  email                 VARCHAR(255),
  alternate_phone       VARCHAR(50),
  alternate_email       VARCHAR(255),
  
  -- Address
  address               TEXT,
  city                  VARCHAR(200),
  province              VARCHAR(200),
  postal_code           VARCHAR(20),
  map_lat               NUMERIC(10,7),
  map_lng               NUMERIC(10,7),
  
  -- Business details
  business_registration VARCHAR(200),
  tax_id                VARCHAR(100),
  
  -- Credit & payment
  credit_limit          NUMERIC(14,2) DEFAULT 0,
  outstanding_balance   NUMERIC(14,2) DEFAULT 0,
  available_credit      NUMERIC(14,2) DEFAULT 0,
  payment_terms         VARCHAR(50),
  payment_score         INT DEFAULT 0,           -- 0-100
  avg_payment_days      INT DEFAULT 0,
  overdue_amount        NUMERIC(14,2) DEFAULT 0,
  
  -- Purchase history
  total_purchases_ytd      NUMERIC(14,2) DEFAULT 0,
  total_purchases_lifetime NUMERIC(14,2) DEFAULT 0,
  order_count              INT DEFAULT 0,
  last_order_date          DATE,
  account_since            DATE,
  
  -- Assignment
  assigned_agent_id     UUID REFERENCES employees(id) ON DELETE SET NULL,
  branch_id             UUID REFERENCES branches(id) ON DELETE SET NULL,
  
  -- Tags
  tags                  TEXT[],
  
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from customer_assignments
DO $$ BEGIN
  ALTER TABLE customer_assignments
    ADD CONSTRAINT fk_customer_assignments_customer
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7b: Customer notes
CREATE TABLE IF NOT EXISTS customer_notes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type            customer_note_type NOT NULL DEFAULT 'Other',
  content         TEXT NOT NULL,
  created_by      VARCHAR(200),
  is_important    BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7c: Customer tasks
CREATE TABLE IF NOT EXISTS customer_tasks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_name   VARCHAR(300),
  type            customer_task_type NOT NULL,
  title           VARCHAR(300) NOT NULL,
  description     TEXT,
  priority        task_priority NOT NULL DEFAULT 'Medium',
  status          task_status NOT NULL DEFAULT 'Pending',
  due_date        DATE NOT NULL,
  completed_date  DATE,
  assigned_to     VARCHAR(200),
  created_by      VARCHAR(200),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7d: Customer activity timeline
CREATE TABLE IF NOT EXISTS customer_activities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type            customer_activity_type NOT NULL,
  description     TEXT NOT NULL,
  performed_by    VARCHAR(200),
  metadata        JSONB,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7e: Customer buying patterns (denormalized analytics)
CREATE TABLE IF NOT EXISTS customer_buying_patterns (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_category VARCHAR(200),
  frequency       VARCHAR(50),      -- 'Weekly','Bi-weekly','Monthly','Quarterly','Irregular'
  avg_order_value NUMERIC(12,2) DEFAULT 0,
  last_purchase   DATE,
  trend           VARCHAR(50),      -- 'Increasing','Stable','Declining'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 8: ORDERS
-- ============================================================================

-- 8a: Orders
CREATE TABLE IF NOT EXISTS orders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number      VARCHAR(50) NOT NULL UNIQUE,
  
  -- Parties
  customer_id       UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name     VARCHAR(300),
  agent_id          UUID REFERENCES employees(id) ON DELETE SET NULL,
  agent_name        VARCHAR(200),
  branch_id         UUID REFERENCES branches(id) ON DELETE SET NULL,
  
  -- Dates
  order_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  required_date     DATE,
  -- Planned date the order leaves the branch (set when status becomes Scheduled)
  scheduled_departure_date DATE,
  
  -- Delivery
  delivery_type     delivery_type DEFAULT 'Truck',
  delivery_address  TEXT,
  
  -- Payment
  payment_terms     payment_terms DEFAULT 'COD',
  payment_method    payment_method_enum DEFAULT 'Offline',
  
  -- Status
  status            order_status NOT NULL DEFAULT 'Draft',
  payment_status    payment_status NOT NULL DEFAULT 'Unbilled',
  
  -- Pricing
  subtotal          NUMERIC(14,2) DEFAULT 0,
  discount_percent  NUMERIC(5,2)  DEFAULT 0,
  discount_amount   NUMERIC(14,2) DEFAULT 0,
  tax_amount        NUMERIC(14,2) DEFAULT 0,
  total_amount      NUMERIC(14,2) DEFAULT 0,
  
  -- Approval workflow
  requires_approval   BOOLEAN DEFAULT FALSE,
  approval_reasons    TEXT[],
  approved_by         VARCHAR(200),
  approved_date       TIMESTAMPTZ,
  rejected_by         VARCHAR(200),
  rejected_date       TIMESTAMPTZ,
  rejection_reason    TEXT,
  
  -- Delivery tracking
  estimated_delivery  DATE,
  actual_delivery     DATE,
  delivery_status     delivery_status_enum,
  delay_reason        TEXT,
  
  -- Invoice
  invoice_id          UUID,           -- FK added after invoices table
  invoice_date        DATE,
  due_date            DATE,
  amount_paid         NUMERIC(14,2) DEFAULT 0,
  balance_due         NUMERIC(14,2) DEFAULT 0,
  
  -- Notes
  order_notes         TEXT,
  internal_notes      TEXT,
  special_instructions TEXT,
  
  -- Urgency (for dispatch)
  urgency             urgency_level DEFAULT 'Medium',
  volume_cbm          NUMERIC(10,3),   -- cubic meters
  weight_kg           NUMERIC(10,3),
  
  -- Cancellation
  cancelled_at        TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8b: Order line items
CREATE TABLE IF NOT EXISTS order_line_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id      UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  sku             VARCHAR(100),
  product_name    VARCHAR(300),
  variant_description VARCHAR(300),
  
  quantity        INT NOT NULL DEFAULT 1,
  unit_price      NUMERIC(12,2) NOT NULL DEFAULT 0,
  original_price  NUMERIC(12,2),         -- Price before discounts
  negotiated_price NUMERIC(12,2),         -- After agent negotiation
  discount_percent NUMERIC(5,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  batch_discount  NUMERIC(5,2),           -- Bulk pricing discount %
  discounts_breakdown JSONB,             -- [{name, percentage}, …] per-item discounts
  line_total      NUMERIC(14,2) NOT NULL DEFAULT 0,
  
  stock_hint      stock_hint DEFAULT 'Available',
  available_stock INT,
  
  quantity_shipped  INT,            -- set when order goes In Transit; units deducted from stock
  quantity_delivered INT,           -- cumulative units marked delivered (partial/ full)
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8c: Order audit log
CREATE TABLE IF NOT EXISTS order_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  action          order_log_action NOT NULL,
  performed_by    VARCHAR(200),
  performed_by_role order_log_role,
  description     TEXT,
  old_value       JSONB,
  new_value       JSONB,
  metadata        JSONB,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8d: Proof documents (delivery receipts, payment proofs)
CREATE TABLE IF NOT EXISTS order_proof_documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  type            proof_type NOT NULL,
  file_name       VARCHAR(500),
  file_url        TEXT NOT NULL,
  file_size       BIGINT,
  uploaded_by     VARCHAR(200),
  uploaded_by_role proof_uploader_role,
  status          proof_status DEFAULT 'pending',
  verified_by     VARCHAR(200),
  verified_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  notes           TEXT,
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 9: INVOICES
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number  VARCHAR(50) NOT NULL UNIQUE,
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  
  issue_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date        DATE NOT NULL,
  
  -- Bill-to
  bill_to_name    VARCHAR(300),
  bill_to_address TEXT,
  bill_to_contact VARCHAR(200),
  bill_to_phone   VARCHAR(50),
  bill_to_email   VARCHAR(255),
  
  -- Amounts
  subtotal        NUMERIC(14,2) DEFAULT 0,
  discount_amount NUMERIC(14,2) DEFAULT 0,
  tax_amount      NUMERIC(14,2) DEFAULT 0,
  total_amount    NUMERIC(14,2) DEFAULT 0,
  amount_paid     NUMERIC(14,2) DEFAULT 0,
  balance_due     NUMERIC(14,2) DEFAULT 0,
  
  -- Payment info
  payment_terms   payment_terms,
  payment_method  payment_method_enum,
  payment_status  payment_status DEFAULT 'Invoiced',
  
  -- Metadata
  notes           TEXT,
  generated_by    VARCHAR(200),
  pdf_url         TEXT,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from orders.invoice_id to invoices
DO $$ BEGIN
  ALTER TABLE orders
    ADD CONSTRAINT fk_orders_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================================
-- SECTION 10: PAYMENT SYSTEM
-- ============================================================================

-- 10a: Payment method fee configuration
CREATE TABLE IF NOT EXISTS payment_method_fees (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  method              payment_method_type NOT NULL UNIQUE,
  gateway_fee_percent NUMERIC(5,2) DEFAULT 0,
  gateway_fee_fixed   NUMERIC(10,2) DEFAULT 0,
  service_fee_percent NUMERIC(5,2) DEFAULT 0,   -- LAMTEX revenue
  service_fee_fixed   NUMERIC(10,2) DEFAULT 0,
  enabled             BOOLEAN DEFAULT TRUE,
  description         TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10b: Payment links (customer-facing payment pages)
CREATE TABLE IF NOT EXISTS payment_links (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token           VARCHAR(100) NOT NULL UNIQUE,  -- PAY-2026-ABC123
  invoice_id      UUID REFERENCES invoices(id) ON DELETE SET NULL,
  order_id        UUID REFERENCES orders(id) ON DELETE SET NULL,
  
  customer_name   VARCHAR(300),
  customer_email  VARCHAR(255),
  customer_phone  VARCHAR(50),
  
  invoice_amount  NUMERIC(14,2) NOT NULL,
  
  -- Available methods (snapshot at creation)
  payment_methods JSONB DEFAULT '[]'::jsonb,
  
  status          payment_link_status DEFAULT 'pending',
  
  link            TEXT NOT NULL,
  qr_code_data    TEXT,
  
  -- Expiration
  expires_at      TIMESTAMPTZ NOT NULL,
  
  -- Communication tracking
  sent_via_email  BOOLEAN DEFAULT FALSE,
  sent_via_sms    BOOLEAN DEFAULT FALSE,
  last_email_sent TIMESTAMPTZ,
  last_sms_sent   TIMESTAMPTZ,
  view_count      INT DEFAULT 0,
  
  -- Completed payment info
  selected_payment_method payment_method_type,
  payment_transaction_id  UUID,
  fee_breakdown           JSONB,   -- {invoiceAmount, gatewayFee, serviceFee, totalFees, totalAmount}
  
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10c: Payment transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_link_id       UUID REFERENCES payment_links(id) ON DELETE SET NULL,
  invoice_id            UUID REFERENCES invoices(id) ON DELETE SET NULL,
  order_id              UUID REFERENCES orders(id) ON DELETE SET NULL,
  
  payment_method        payment_method_type NOT NULL,
  
  -- Amount breakdown
  invoice_amount        NUMERIC(14,2) NOT NULL,
  gateway_fee           NUMERIC(12,2) DEFAULT 0,
  service_fee           NUMERIC(12,2) DEFAULT 0,  -- LAMTEX revenue
  total_fees            NUMERIC(12,2) DEFAULT 0,
  total_paid            NUMERIC(14,2) NOT NULL,
  
  -- Gateway details
  gateway_reference_number VARCHAR(200),
  gateway_transaction_id   VARCHAR(200),
  gateway_response         JSONB,
  
  status                payment_transaction_status DEFAULT 'pending',
  
  paid_at               TIMESTAMPTZ,
  processed_at          TIMESTAMPTZ,
  
  -- Customer
  customer_name         VARCHAR(300),
  customer_email        VARCHAR(255),
  customer_phone        VARCHAR(50),
  
  -- Receipt
  receipt_id            UUID,
  receipt_sent_via_email BOOLEAN DEFAULT FALSE,
  receipt_sent_via_sms   BOOLEAN DEFAULT FALSE,
  
  -- Audit
  ip_address            INET,
  user_agent            TEXT,
  notes                 TEXT,
  
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10d: Digital receipts
CREATE TABLE IF NOT EXISTS digital_receipts (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_number        VARCHAR(50) NOT NULL UNIQUE,  -- REC-2026-001234
  
  payment_transaction_id UUID NOT NULL REFERENCES payment_transactions(id) ON DELETE CASCADE,
  invoice_id            UUID REFERENCES invoices(id) ON DELETE SET NULL,
  order_id              UUID REFERENCES orders(id) ON DELETE SET NULL,
  
  -- Payment details
  paid_at               TIMESTAMPTZ NOT NULL,
  payment_method        payment_method_type NOT NULL,
  gateway_reference_number VARCHAR(200),
  
  -- Customer
  customer_name         VARCHAR(300),
  customer_email        VARCHAR(255),
  customer_phone        VARCHAR(50),
  
  -- Amount breakdown
  invoice_amount        NUMERIC(14,2) DEFAULT 0,
  gateway_fee           NUMERIC(12,2) DEFAULT 0,
  service_fee           NUMERIC(12,2) DEFAULT 0,
  total_fees            NUMERIC(12,2) DEFAULT 0,
  total_paid            NUMERIC(14,2) DEFAULT 0,
  
  -- Receipt files
  pdf_url               TEXT,
  public_url            TEXT NOT NULL,    -- /receipt/:id (no auth required)
  
  -- Invoice items (for display on receipt)
  invoice_items         JSONB DEFAULT '[]'::jsonb,  -- [{description, quantity, unitPrice, total}]
  
  -- Communication
  email_sent            BOOLEAN DEFAULT FALSE,
  sms_sent              BOOLEAN DEFAULT FALSE,
  
  view_count            INT DEFAULT 0,
  
  generated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from payment_transactions.receipt_id
DO $$ BEGIN
  ALTER TABLE payment_transactions
    ADD CONSTRAINT fk_transactions_receipt
    FOREIGN KEY (receipt_id) REFERENCES digital_receipts(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================================
-- SECTION 11: COLLECTIONS & RECEIVABLES
-- ============================================================================

-- 11a: Receivables
CREATE TABLE IF NOT EXISTS receivables (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id        UUID REFERENCES invoices(id) ON DELETE SET NULL,
  order_id          UUID REFERENCES orders(id) ON DELETE SET NULL,
  customer_id       UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name     VARCHAR(300),
  
  invoice_date      DATE,
  due_date          DATE NOT NULL,
  invoice_amount    NUMERIC(14,2) NOT NULL,
  amount_paid       NUMERIC(14,2) DEFAULT 0,
  balance_due       NUMERIC(14,2) NOT NULL,
  
  status            collection_status DEFAULT 'Current',
  days_overdue      INT DEFAULT 0,
  payment_terms     VARCHAR(50),
  
  -- Agent
  assigned_agent_id   UUID REFERENCES employees(id) ON DELETE SET NULL,
  assigned_agent_name VARCHAR(200),
  branch_id           UUID REFERENCES branches(id) ON DELETE SET NULL,
  
  -- Collection tracking
  last_contact_date   DATE,
  next_follow_up_date DATE,
  
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11b: Collection notes
CREATE TABLE IF NOT EXISTS collection_notes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receivable_id   UUID NOT NULL REFERENCES receivables(id) ON DELETE CASCADE,
  note_type       collection_note_type NOT NULL,
  content         TEXT NOT NULL,
  next_action     TEXT,
  follow_up_date  DATE,
  created_by      VARCHAR(200),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11c: Collection payment records
CREATE TABLE IF NOT EXISTS collection_payment_records (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receivable_id       UUID NOT NULL REFERENCES receivables(id) ON DELETE CASCADE,
  invoice_id          UUID REFERENCES invoices(id) ON DELETE SET NULL,
  
  payment_date        DATE NOT NULL,
  amount              NUMERIC(14,2) NOT NULL,
  payment_method      collection_payment_method,
  reference_number    VARCHAR(200),
  
  -- Agent-submitted payments
  submitted_by        VARCHAR(200),
  submitted_at        TIMESTAMPTZ,
  proof_of_payment    TEXT[],
  verification_status verification_status DEFAULT 'Pending',
  verified_by         VARCHAR(200),
  verified_at         TIMESTAMPTZ,
  
  notes               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11d: Agent-generated payment links (for collections)
CREATE TABLE IF NOT EXISTS collection_payment_links (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID REFERENCES orders(id) ON DELETE SET NULL,
  invoice_id      UUID REFERENCES invoices(id) ON DELETE SET NULL,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name   VARCHAR(300),
  
  amount          NUMERIC(14,2) NOT NULL,
  fee_percent     NUMERIC(5,2) DEFAULT 0,
  fee_amount      NUMERIC(12,2) DEFAULT 0,
  total_amount    NUMERIC(14,2) NOT NULL,
  
  link_url        TEXT NOT NULL,
  status          VARCHAR(50) DEFAULT 'Generated',  -- Generated, Sent, Viewed, Paid, Expired, Voided
  expires_at      TIMESTAMPTZ,
  
  -- Communication
  sent_via        TEXT[],            -- ['Email','SMS','WhatsApp']
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(50),
  
  -- Tracking
  generated_by    VARCHAR(200),
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at         TIMESTAMPTZ,
  viewed_at       TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  voided_at       TIMESTAMPTZ,
  void_reason     TEXT,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 12: PURCHASE REQUISITIONS & ORDERS
-- ============================================================================

-- 12a: Purchase requisitions
CREATE TABLE IF NOT EXISTS purchase_requisitions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pr_number           VARCHAR(50) NOT NULL UNIQUE,
  
  material_id         UUID REFERENCES raw_materials(id) ON DELETE SET NULL,
  material_name       VARCHAR(300),
  material_sku        VARCHAR(100),
  category            VARCHAR(100),
  
  requested_quantity  NUMERIC(14,4) NOT NULL,
  unit_of_measure     unit_of_measure DEFAULT 'kg',
  estimated_cost      NUMERIC(14,2) DEFAULT 0,
  
  delivery_branch     VARCHAR(10),
  required_date       DATE,
  
  -- Justification
  reason              TEXT,
  urgency             urgency_level DEFAULT 'Medium',
  current_stock       NUMERIC(14,4),
  reorder_point       NUMERIC(14,4),
  
  -- Suggested supplier
  suggested_supplier  VARCHAR(300),
  supplier_quotation  NUMERIC(14,2),
  
  -- Workflow
  status              purchase_requisition_status DEFAULT 'Draft',
  requested_by        VARCHAR(200),
  requested_date      DATE DEFAULT CURRENT_DATE,
  approved_by         VARCHAR(200),
  approval_date       DATE,
  rejection_reason    TEXT,
  
  -- Linked PO
  purchase_order_id   UUID,
  purchase_order_number VARCHAR(50),
  
  remarks             TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12b: Purchase orders
CREATE TABLE IF NOT EXISTS purchase_orders (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number              TEXT NOT NULL UNIQUE,
  branch_id              UUID REFERENCES branches(id)   ON DELETE SET NULL,
  supplier_id            UUID REFERENCES suppliers(id)  ON DELETE SET NULL,
  status                 TEXT NOT NULL DEFAULT 'Draft'
                           CHECK (status IN ('Draft','Requested','Rejected','Accepted','Sent','Confirmed','Partially Received','Completed','Cancelled')),
  order_date             DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  actual_delivery_date   DATE,
  total_amount           NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency               TEXT NOT NULL DEFAULT 'PHP',
  notes                  TEXT,
  created_by             TEXT,
  accepted_by            TEXT,
  accepted_at            TIMESTAMPTZ,
  rejected_by            TEXT,
  rejection_reason       TEXT,
  -- Payment tracking
  payment_status         TEXT NOT NULL DEFAULT 'Unpaid'
                           CHECK (payment_status IN ('Unpaid','Partially Paid','Paid','Overdue')),
  amount_paid            NUMERIC(14,2) NOT NULL DEFAULT 0,
  payment_due_date       DATE,
  payment_method         TEXT,
  payment_notes          TEXT,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW(),
  -- Inter-branch: receiving materials from another site (PO still used for the workflow)
  is_transfer_request     BOOLEAN NOT NULL DEFAULT false,
  transfer_requesting_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  inter_branch_request_id UUID
);

-- Add FK from purchase_requisitions to purchase_orders
DO $$ BEGIN
  ALTER TABLE purchase_requisitions
    ADD CONSTRAINT fk_pr_po
    FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add FK from raw_materials.price_synced_from_po → purchase_orders (deferred because purchase_orders is defined later)
DO $$ BEGIN
  ALTER TABLE raw_materials
    ADD CONSTRAINT fk_raw_material_price_po
    FOREIGN KEY (price_synced_from_po) REFERENCES purchase_orders(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Purchase order line items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              UUID    NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  material_id           UUID    REFERENCES raw_materials(id) ON DELETE SET NULL,
  quantity_ordered      NUMERIC(14,2) NOT NULL DEFAULT 0,
  quantity_received     NUMERIC(14,2) NOT NULL DEFAULT 0,
  unit_price            NUMERIC(14,2) NOT NULL DEFAULT 0,
  unit_of_measure       TEXT,
  sync_price_on_receive BOOLEAN NOT NULL DEFAULT FALSE, -- if true, updates raw_material cost on receive
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Proof-of-receiving images attached to a PO receipt event
CREATE TABLE IF NOT EXISTS purchase_order_receipts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID        NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  file_url    TEXT        NOT NULL,
  file_name   TEXT        NOT NULL,
  file_size   INTEGER,
  note        TEXT,
  uploaded_by TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log for a purchase order (who requested, status changes, receive, payment, etc.)
CREATE TABLE IF NOT EXISTS purchase_order_logs (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id            UUID        NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  action              TEXT        NOT NULL,
  performed_by        TEXT,
  performed_by_role   TEXT,
  description         TEXT,
  old_value           JSONB,
  new_value           JSONB,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Worker-raised purchase requests (suggest materials/suppliers; executive converts to PO)
CREATE TABLE IF NOT EXISTS purchase_requests (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id             UUID REFERENCES branches(id)   ON DELETE SET NULL,
  material_id           UUID REFERENCES raw_materials(id) ON DELETE SET NULL,
  suggested_supplier_id UUID REFERENCES suppliers(id)  ON DELETE SET NULL,
  requested_qty         NUMERIC(14,2) NOT NULL DEFAULT 0,
  unit_of_measure       TEXT,
  reason                TEXT,
  raised_by             TEXT,
  status                TEXT NOT NULL DEFAULT 'Pending'
                          CHECK (status IN ('Pending','Approved','Rejected')),
  executive_notes       TEXT,
  linked_po_id          UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- 12c: Product production requests (finished goods; worker request → approval before production)
CREATE TABLE IF NOT EXISTS production_requests (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_number                TEXT NOT NULL UNIQUE,
  branch_id                UUID REFERENCES branches(id) ON DELETE SET NULL,
  status                   TEXT NOT NULL DEFAULT 'Draft'
    CHECK (status IN ('Draft', 'Requested', 'Rejected', 'Accepted', 'In Progress', 'Completed', 'Cancelled')),
  request_date             DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_completion_date DATE,
  notes                    TEXT,
  created_by               TEXT,
  accepted_by              TEXT,
  accepted_at              TIMESTAMPTZ,
  rejected_by              TEXT,
  rejection_reason         TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Inter-branch: transfer / fulfillment request (same PR table)
  is_transfer_request      BOOLEAN NOT NULL DEFAULT false,
  transfer_requesting_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  inter_branch_request_id UUID
);

CREATE TABLE IF NOT EXISTS production_request_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id           UUID NOT NULL REFERENCES production_requests(id) ON DELETE CASCADE,
  product_id           UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_variant_id   UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
  quantity             NUMERIC(14, 2) NOT NULL CHECK (quantity > 0),
  quantity_completed   NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_request_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id          UUID NOT NULL REFERENCES production_requests(id) ON DELETE CASCADE,
  action              TEXT NOT NULL,
  performed_by        TEXT,
  performed_by_role   TEXT,
  description         TEXT,
  old_value           JSONB,
  new_value           JSONB,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Links customer orders to a production request (context for the floor: who / what due dates)
CREATE TABLE IF NOT EXISTS production_request_orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL REFERENCES production_requests(id) ON DELETE CASCADE,
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id, order_id)
);

-- 12c2: Inter-branch requests (unified; approved → linked PO + PR)
CREATE TABLE IF NOT EXISTS inter_branch_requests (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ibr_number        TEXT NOT NULL UNIQUE,
  requesting_branch_id  UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  fulfilling_branch_id  UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  status            TEXT NOT NULL DEFAULT 'Draft'
    CHECK (status IN (
      'Draft','Pending','Approved','Rejected','Fulfilled','Cancelled',
      'Scheduled','Loading','Packed','Ready','In Transit','Delivered','Partially Fulfilled','Completed'
    )),
  notes             TEXT,
  created_by        TEXT,
  submitted_at      TIMESTAMPTZ,
  approved_by       TEXT,
  approved_at       TIMESTAMPTZ,
  rejected_by       TEXT,
  rejection_reason  TEXT,
  cancelled_by      TEXT,
  cancelled_at      TIMESTAMPTZ,
  fulfilled_by      TEXT,
  fulfilled_at      TIMESTAMPTZ,
  linked_purchase_order_id   UUID,
  linked_production_request_id UUID,
  scheduled_departure_date DATE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ibr_different_branches CHECK (requesting_branch_id IS DISTINCT FROM fulfilling_branch_id)
);

CREATE TABLE IF NOT EXISTS inter_branch_request_items (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id         UUID NOT NULL REFERENCES inter_branch_requests(id) ON DELETE CASCADE,
  line_kind          TEXT NOT NULL
    CHECK (line_kind IN ('raw_material', 'product')),
  raw_material_id    UUID REFERENCES raw_materials(id) ON DELETE RESTRICT,
  product_id         UUID REFERENCES products(id) ON DELETE RESTRICT,
  product_variant_id UUID REFERENCES product_variants(id) ON DELETE RESTRICT,
  quantity           NUMERIC(14,2) NOT NULL CHECK (quantity > 0),
  quantity_shipped   NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (quantity_shipped >= 0),
  quantity_delivered NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (quantity_delivered >= 0),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ibr_item_raw CHECK (
    line_kind <> 'raw_material' OR
    (raw_material_id IS NOT NULL AND product_id IS NULL AND product_variant_id IS NULL)
  ),
  CONSTRAINT ibr_item_product CHECK (
    line_kind <> 'product' OR
    (raw_material_id IS NULL AND product_id IS NOT NULL AND product_variant_id IS NOT NULL)
  ),
  CONSTRAINT ibr_item_shipped_lte_ordered CHECK (quantity_shipped <= quantity),
  CONSTRAINT ibr_item_delivered_lte_shipped CHECK (quantity_delivered <= quantity_shipped)
);

CREATE INDEX IF NOT EXISTS idx_ibr_status ON inter_branch_requests(status);
CREATE INDEX IF NOT EXISTS idx_ibr_requesting ON inter_branch_requests(requesting_branch_id);
CREATE INDEX IF NOT EXISTS idx_ibr_fulfilling ON inter_branch_requests(fulfilling_branch_id);
CREATE INDEX IF NOT EXISTS idx_ibr_items_request ON inter_branch_request_items(request_id);

-- IBR activity log (mirrors purchase_order_logs)
CREATE TABLE IF NOT EXISTS inter_branch_request_logs (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inter_branch_request_id  UUID NOT NULL REFERENCES inter_branch_requests(id) ON DELETE CASCADE,
  action                   TEXT NOT NULL,
  performed_by             TEXT,
  performed_by_role        TEXT,
  description              TEXT,
  old_value                JSONB,
  new_value                JSONB,
  metadata                 JSONB,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ibr_logs_request ON inter_branch_request_logs(inter_branch_request_id);

-- Proof-of-delivery images when the requesting branch records receipt
CREATE TABLE IF NOT EXISTS inter_branch_delivery_proofs (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inter_branch_request_id  UUID NOT NULL REFERENCES inter_branch_requests(id) ON DELETE CASCADE,
  file_url                 TEXT NOT NULL,
  file_name                TEXT NOT NULL,
  file_size                INTEGER,
  note                     TEXT,
  uploaded_by              TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ibr_delivery_proofs_request ON inter_branch_delivery_proofs(inter_branch_request_id);

-- FKs: IBR → PO/PR and back-references
DO $$ BEGIN
  ALTER TABLE inter_branch_requests
    ADD CONSTRAINT fk_ibr_linked_po
    FOREIGN KEY (linked_purchase_order_id) REFERENCES purchase_orders(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE inter_branch_requests
    ADD CONSTRAINT fk_ibr_linked_pr
    FOREIGN KEY (linked_production_request_id) REFERENCES production_requests(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE purchase_orders
    ADD CONSTRAINT fk_po_inter_branch_request
    FOREIGN KEY (inter_branch_request_id) REFERENCES inter_branch_requests(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE production_requests
    ADD CONSTRAINT fk_pr_inter_branch_request
    FOREIGN KEY (inter_branch_request_id) REFERENCES inter_branch_requests(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 12d: Goods Receipt Notes (GRN)
CREATE TABLE IF NOT EXISTS goods_receipt_notes (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grn_number            VARCHAR(50) NOT NULL UNIQUE,
  
  purchase_order_id     UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  purchase_order_number VARCHAR(50),
  supplier_id           UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name         VARCHAR(300),
  
  -- Delivery
  delivery_note         TEXT,
  invoice_number        VARCHAR(100),
  received_date         DATE NOT NULL DEFAULT CURRENT_DATE,
  received_by           VARCHAR(200),
  branch                VARCHAR(10),
  
  -- Quality
  quality_check_required BOOLEAN DEFAULT FALSE,
  quality_check_status  quality_status,
  quality_check_by      VARCHAR(200),
  quality_check_date    DATE,
  quality_remarks       TEXT,
  
  -- Status
  status                grn_status DEFAULT 'Draft',
  
  remarks               TEXT,
  attachments           TEXT[],
  
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12e: GRN line items
CREATE TABLE IF NOT EXISTS grn_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grn_id            UUID NOT NULL REFERENCES goods_receipt_notes(id) ON DELETE CASCADE,
  material_id       UUID REFERENCES raw_materials(id) ON DELETE SET NULL,
  material_name     VARCHAR(300),
  material_sku      VARCHAR(100),
  ordered_quantity  NUMERIC(14,4),
  received_quantity NUMERIC(14,4) NOT NULL,
  accepted_quantity NUMERIC(14,4) DEFAULT 0,
  rejected_quantity NUMERIC(14,4) DEFAULT 0,
  unit_of_measure   unit_of_measure DEFAULT 'kg',
  batch_number      VARCHAR(100),
  expiry_date       DATE,
  remarks           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 13: LOGISTICS & FLEET MANAGEMENT
-- ============================================================================

-- 13a: Vehicles / fleet
CREATE TABLE IF NOT EXISTS vehicles (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id        VARCHAR(50) NOT NULL UNIQUE,   -- Human-readable
  vehicle_name      VARCHAR(200) NOT NULL,
  plate_number      VARCHAR(50),
  type              vehicle_type NOT NULL,
  
  status            vehicle_status DEFAULT 'Available',
  financing_status  financing_status DEFAULT 'Owned',
  
  -- Current trip
  current_trip_id   UUID,  -- FK added after trips table
  trips_today       INT DEFAULT 0,
  next_available_time TIMESTAMPTZ,
  utilization_percent NUMERIC(5,2) DEFAULT 0,
  
  -- Capacity
  max_weight_kg     NUMERIC(10,2) DEFAULT 0,
  max_volume_cbm    NUMERIC(10,3) DEFAULT 0,
  
  -- Maintenance
  maintenance_due   DATE,
  alerts            TEXT[],

  -- Truck profile (see `database/fleet_trucks_extension.sql` for idempotent ALTERs on existing DBs)
  make              VARCHAR(100),
  model             VARCHAR(100),
  year_model        INT,
  color             VARCHAR(50),
  orcr_number       VARCHAR(80),
  registration_expiry DATE,
  current_odometer_km NUMERIC(12, 1) DEFAULT 0,
  engine_type         VARCHAR(120),
  vehicle_length_m    NUMERIC(10, 2),
  vehicle_width_m     NUMERIC(10, 2),
  vehicle_height_m    NUMERIC(10, 2),
  fleet_cards         TEXT,
  date_first_registered DATE,
  date_acquired       DATE,
  
  branch_id         UUID REFERENCES branches(id) ON DELETE SET NULL,
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13b: Trips
CREATE TABLE IF NOT EXISTS trips (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_number     VARCHAR(50) NOT NULL UNIQUE,
  
  vehicle_id      UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  vehicle_name    VARCHAR(200),
  driver_id       UUID REFERENCES employees(id) ON DELETE SET NULL,
  driver_name     VARCHAR(200),
  
  status          trip_status DEFAULT 'Pending',
  scheduled_date  DATE NOT NULL,
  departure_time  TIMESTAMPTZ,
  
  destinations    TEXT[],
  order_ids       UUID[],          -- References to orders
  
  -- Capacity usage
  capacity_used_percent NUMERIC(5,2) DEFAULT 0,
  weight_used_kg  NUMERIC(10,2) DEFAULT 0,
  volume_used_cbm NUMERIC(10,3) DEFAULT 0,
  max_weight_kg   NUMERIC(10,2) DEFAULT 0,
  max_volume_cbm  NUMERIC(10,3) DEFAULT 0,
  
  eta             TIMESTAMPTZ,
  actual_arrival  TIMESTAMPTZ,
  delay_reason    TEXT,
  
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from vehicles.current_trip_id to trips
DO $$ BEGIN
  ALTER TABLE vehicles
    ADD CONSTRAINT fk_vehicles_current_trip
    FOREIGN KEY (current_trip_id) REFERENCES trips(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 13c: Delivery tracking
CREATE TABLE IF NOT EXISTS delivery_tracking (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id         UUID REFERENCES trips(id) ON DELETE SET NULL,
  delivery_number VARCHAR(50) NOT NULL UNIQUE,
  
  vehicle         VARCHAR(200),
  driver          VARCHAR(200),
  route           VARCHAR(300),
  orders_count    INT DEFAULT 0,
  
  status          delivery_tracking_status DEFAULT 'Scheduled',
  eta             TIMESTAMPTZ,
  actual_arrival  TIMESTAMPTZ,
  delay_reason    TEXT,
  current_location VARCHAR(300),
  
  pod_collected   BOOLEAN DEFAULT FALSE,
  
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13d: Delay / exception records
CREATE TABLE IF NOT EXISTS delay_exceptions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type            delay_exception_type NOT NULL,
  affected_trip   VARCHAR(100),
  trip_id         UUID REFERENCES trips(id) ON DELETE SET NULL,
  affected_orders TEXT[],
  customers_affected TEXT[],
  days_late       INT DEFAULT 0,
  owner           VARCHAR(200),
  status          delay_exception_status DEFAULT 'Open',
  reported_date   DATE DEFAULT CURRENT_DATE,
  resolution      TEXT,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13e: Shipments (sea/air freight)
CREATE TABLE IF NOT EXISTS shipments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_number VARCHAR(50) NOT NULL UNIQUE,
  type            shipment_type NOT NULL,
  order_ids       UUID[],
  port            VARCHAR(200),
  destination     VARCHAR(300),
  departure_date  DATE,
  eta             DATE,
  status          shipment_status DEFAULT 'Preparing',
  carrier         VARCHAR(200),
  tracking_number VARCHAR(200),
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13f: Trip history / completed trips
CREATE TABLE IF NOT EXISTS trip_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id         UUID REFERENCES trips(id) ON DELETE SET NULL,
  trip_number     VARCHAR(50),
  vehicle_id      UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  vehicle_name    VARCHAR(200),
  driver_name     VARCHAR(200),
  scheduled_date  DATE,
  departure_time  TIMESTAMPTZ,
  arrival_time    TIMESTAMPTZ,
  destinations    TEXT[],
  orders_count    INT DEFAULT 0,
  delivery_success_rate NUMERIC(5,2) DEFAULT 0,
  status          trip_status,
  notes           TEXT,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13g: Maintenance records
CREATE TABLE IF NOT EXISTS maintenance_records (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id      UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  category        maintenance_category NOT NULL,
  description     TEXT NOT NULL,
  scheduled_date  DATE,
  completed_date  DATE,
  cost            NUMERIC(12,2) DEFAULT 0,
  vendor          VARCHAR(300),
  status          VARCHAR(50) DEFAULT 'Scheduled',  -- Scheduled, In Progress, Completed
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13h: Driver assignments
CREATE TABLE IF NOT EXISTS driver_assignments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id       UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  vehicle_id      UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  assigned_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date        DATE,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13i: Warehouse readiness (logistics view)
CREATE TABLE IF NOT EXISTS warehouse_readiness (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID REFERENCES orders(id) ON DELETE SET NULL,
  order_number    VARCHAR(50),
  trip_id         UUID REFERENCES trips(id) ON DELETE SET NULL,
  loading_status  VARCHAR(50) DEFAULT 'Not Started',  -- Ready, Partial, Blocked, Not Started
  blockers        JSONB DEFAULT '[]'::jsonb,  -- [{type, itemName, quantity}]
  last_updated    TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 14: WAREHOUSE OPERATIONS
-- ============================================================================

-- 14a: Production batches
CREATE TABLE IF NOT EXISTS production_batches (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_number    VARCHAR(100) NOT NULL UNIQUE,
  product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name    VARCHAR(300),
  planned_qty     INT NOT NULL DEFAULT 0,
  actual_qty      INT,
  qa_status       qa_status DEFAULT 'Pending',
  defect_rate     NUMERIC(5,2),
  scheduled_date  DATE NOT NULL,
  completed_date  DATE,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from material_consumption to production_batches
DO $$ BEGIN
  ALTER TABLE material_consumption
    ADD CONSTRAINT fk_consumption_production_batch
    FOREIGN KEY (production_batch_id) REFERENCES production_batches(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 14b: Order fulfillment tracking
CREATE TABLE IF NOT EXISTS order_fulfillment (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id          UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_number      VARCHAR(50),
  customer_name     VARCHAR(300),
  
  truck_assigned    VARCHAR(200),
  weight_utilization NUMERIC(5,2),
  required_date     DATE,
  products_summary  TEXT,
  
  stock_status      warehouse_stock_status DEFAULT 'Not Available',
  fulfillment_status fulfillment_status DEFAULT 'To Pick',
  
  urgency           urgency_level DEFAULT 'Medium',
  branch_id         UUID REFERENCES branches(id) ON DELETE SET NULL,
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14c: Loading details (per product per order)
CREATE TABLE IF NOT EXISTS loading_details (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fulfillment_id  UUID NOT NULL REFERENCES order_fulfillment(id) ON DELETE CASCADE,
  product_name    VARCHAR(300) NOT NULL,
  qty             INT NOT NULL DEFAULT 0,
  status          loading_detail_status DEFAULT 'Pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14d: Quality issues
CREATE TABLE IF NOT EXISTS quality_issues (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_name       VARCHAR(300) NOT NULL,
  batch_number    VARCHAR(100),
  issue_type      quality_issue_type NOT NULL,
  reason          TEXT NOT NULL,
  qty_affected    INT NOT NULL DEFAULT 0,
  status          quality_issue_status DEFAULT 'Open',
  reported_date   DATE DEFAULT CURRENT_DATE,
  assigned_to     VARCHAR(200),
  resolution      TEXT,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14e: Machines
CREATE TABLE IF NOT EXISTS machines (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_name            VARCHAR(200) NOT NULL,
  utilization_percent     NUMERIC(5,2) DEFAULT 0,
  quota_completion_percent NUMERIC(5,2) DEFAULT 0,
  next_maintenance        DATE,
  error_rate              NUMERIC(5,2) DEFAULT 0,
  status                  machine_status_enum DEFAULT 'Idle',
  branch_id               UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14f: Warehouse stock movements (finished goods movements)
CREATE TABLE IF NOT EXISTS warehouse_stock_movements (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_name       VARCHAR(300) NOT NULL,
  type            warehouse_movement_type NOT NULL,
  quantity        INT NOT NULL,
  reference       VARCHAR(200),
  from_location   VARCHAR(200),
  to_location     VARCHAR(200),
  user_name       VARCHAR(200),
  notes           TEXT,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14g: Finished goods stock (denormalized / warehouse view)
CREATE TABLE IF NOT EXISTS finished_goods_stock (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id        UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name      VARCHAR(300) NOT NULL,
  sku               VARCHAR(100),
  
  current_stock     INT DEFAULT 0,
  reserved_stock    INT DEFAULT 0,
  available_stock   INT DEFAULT 0,
  min_level         INT DEFAULT 0,
  avg_daily_outflow NUMERIC(10,2) DEFAULT 0,
  production_quota  INT,
  qa_success_rate   NUMERIC(5,2) DEFAULT 0,
  days_of_cover     INT DEFAULT 0,
  risk_level        risk_level DEFAULT 'Low',
  
  -- Inter-branch quantities
  inter_branch_qty  JSONB DEFAULT '{}'::jsonb,
  
  branch_id         UUID REFERENCES branches(id) ON DELETE SET NULL,
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 15: CHAT & MESSAGING
-- ============================================================================

-- 15a: Chat users
CREATE TABLE IF NOT EXISTS chat_users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  name        VARCHAR(200) NOT NULL,
  avatar      TEXT,
  branch      VARCHAR(100),
  role        VARCHAR(100),
  status      chat_user_status DEFAULT 'offline',
  last_seen   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15b: Chats (direct or group)
CREATE TABLE IF NOT EXISTS chats (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(300),
  type        chat_type NOT NULL DEFAULT 'direct',
  avatar      TEXT,
  created_by  UUID REFERENCES chat_users(id) ON DELETE SET NULL,
  unread_count INT DEFAULT 0,
  
  -- Last message (denormalized for listing)
  last_message_content  TEXT,
  last_message_time     TIMESTAMPTZ,
  last_message_sender   UUID,
  
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15c: Chat members
CREATE TABLE IF NOT EXISTS chat_members (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id     UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  role        chat_member_role DEFAULT 'member',
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(chat_id, user_id)
);

-- 15d: Chat messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id     UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id   UUID NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  sender_name VARCHAR(200),
  sender_avatar TEXT,
  content     TEXT NOT NULL,
  edited      BOOLEAN DEFAULT FALSE,
  edited_at   TIMESTAMPTZ,
  
  -- Reply threading
  reply_to_message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  reply_to_sender     VARCHAR(200),
  reply_to_content    TEXT,
  
  -- Read tracking
  read_by     UUID[] DEFAULT '{}',
  
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 15e: Message reactions
CREATE TABLE IF NOT EXISTS message_reactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id  UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  emoji       VARCHAR(10) NOT NULL,
  user_ids    UUID[] DEFAULT '{}',
  count       INT DEFAULT 0,
  UNIQUE(message_id, emoji)
);

-- 15f: Message read receipts
CREATE TABLE IF NOT EXISTS message_read_receipts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id  UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  read_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);


-- ============================================================================
-- SECTION 16: AUDIT LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID,
  user_name   VARCHAR(200),
  user_role   VARCHAR(100),
  action      VARCHAR(200) NOT NULL,
  module      VARCHAR(100),            -- 'Orders', 'Products', 'Warehouse', etc.
  entity_type VARCHAR(100),            -- 'order', 'product', 'customer', etc.
  entity_id   UUID,
  description TEXT,
  old_value   JSONB,
  new_value   JSONB,
  metadata    JSONB,
  ip_address  INET,
  user_agent  TEXT,
  branch_id   UUID REFERENCES branches(id) ON DELETE SET NULL,
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 17: NOTIFICATIONS & ALERTS
-- ============================================================================

-- 17a: General notifications
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID,                     -- Target user
  category    notification_category NOT NULL,
  message     TEXT NOT NULL,
  urgent      BOOLEAN DEFAULT FALSE,
  read        BOOLEAN DEFAULT FALSE,
  action_url  TEXT,
  action_label TEXT,
  branch_id   UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17b: Logistics alerts
CREATE TABLE IF NOT EXISTS logistics_alerts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type            logistics_alert_type NOT NULL,
  severity        alert_severity DEFAULT 'Medium',
  title           VARCHAR(300) NOT NULL,
  message         TEXT NOT NULL,
  action_required BOOLEAN DEFAULT FALSE,
  related_entity  VARCHAR(200),
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17c: Warehouse alerts
CREATE TABLE IF NOT EXISTS warehouse_alerts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type            warehouse_alert_type NOT NULL,
  severity        alert_severity DEFAULT 'Medium',
  title           VARCHAR(300) NOT NULL,
  message         TEXT NOT NULL,
  item_name       VARCHAR(300),
  action_required BOOLEAN DEFAULT FALSE,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 17d: Agent alerts
CREATE TABLE IF NOT EXISTS agent_alerts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id        UUID REFERENCES employees(id) ON DELETE CASCADE,
  type            agent_alert_type NOT NULL,
  severity        alert_severity DEFAULT 'Medium',
  title           VARCHAR(300) NOT NULL,
  message         TEXT NOT NULL,
  related_customer VARCHAR(300),
  related_order   VARCHAR(100),
  action_required BOOLEAN DEFAULT FALSE,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 18: COMPANY SETTINGS
-- ============================================================================

-- 18a: Company settings (one row per branch via branch_id)
CREATE TABLE IF NOT EXISTS company_settings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id       UUID REFERENCES branches(id) ON DELETE CASCADE,
  company_name    VARCHAR(300) NOT NULL,
  logo_url        TEXT,
  industry        VARCHAR(200),
  website         VARCHAR(255),
  tax_id          VARCHAR(100),
  registration_number VARCHAR(100),
  founded_year    INTEGER,
  employee_count  VARCHAR(80),
  company_description TEXT,
  
  -- Primary contact
  primary_email   VARCHAR(255),
  primary_phone   VARCHAR(50),
  
  -- Financial
  currency        VARCHAR(10) DEFAULT 'PHP',
  fiscal_year_start VARCHAR(10) DEFAULT '01-01',

  -- Optional HQ map pin (WGS84); see also metadata.hq_map for app-computed mirror
  hq_latitude           NUMERIC(10, 7),
  hq_longitude          NUMERIC(10, 7),
  hq_location_label     VARCHAR(300),

  hq_street             TEXT,
  hq_city               VARCHAR(200),
  hq_province           VARCHAR(200),
  hq_postal_code        VARCHAR(20),
  hq_country            VARCHAR(100),

  metadata        JSONB DEFAULT '{}'::jsonb,
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT company_settings_branch_id_key UNIQUE (branch_id)
);

-- 18b: Company contacts
CREATE TABLE IF NOT EXISTS company_contacts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  settings_id     UUID REFERENCES company_settings(id) ON DELETE CASCADE,
  contact_type    VARCHAR(100),  -- 'Primary', 'Accounting', 'Support', etc.
  name            VARCHAR(200),
  position        VARCHAR(200),
  email           VARCHAR(255),
  phone           VARCHAR(50),
  is_primary      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18c: Company addresses
CREATE TABLE IF NOT EXISTS company_addresses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  settings_id     UUID REFERENCES company_settings(id) ON DELETE CASCADE,
  address_type    address_type DEFAULT 'Main Office',
  label           VARCHAR(200),
  street          TEXT,
  city            VARCHAR(200),
  province        VARCHAR(200),
  postal_code     VARCHAR(20),
  country         VARCHAR(100) DEFAULT 'Philippines',
  is_primary      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18d: Payment profiles
CREATE TABLE IF NOT EXISTS company_payment_profiles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  settings_id     UUID REFERENCES company_settings(id) ON DELETE CASCADE,
  bank_name       VARCHAR(200),
  account_name    VARCHAR(200),
  account_number  VARCHAR(100),
  swift_code      VARCHAR(50),
  is_default      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 18e: Social media
CREATE TABLE IF NOT EXISTS company_social_media (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  settings_id     UUID REFERENCES company_settings(id) ON DELETE CASCADE,
  platform        VARCHAR(100) NOT NULL,
  url             TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 19: CALENDAR & SCHEDULING
-- ============================================================================

CREATE TABLE IF NOT EXISTS calendar_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       VARCHAR(300) NOT NULL,
  description TEXT,
  event_date  DATE NOT NULL,
  start_time  TIME,
  end_time    TIME,
  type        calendar_event_type DEFAULT 'Outgoing',
  at_risk     BOOLEAN DEFAULT FALSE,
  details     TEXT,
  
  -- Associations
  order_id    UUID REFERENCES orders(id) ON DELETE SET NULL,
  trip_id     UUID REFERENCES trips(id) ON DELETE SET NULL,
  branch_id   UUID REFERENCES branches(id) ON DELETE SET NULL,
  
  created_by  UUID REFERENCES employees(id) ON DELETE SET NULL,
  
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 20: REPORTS & ANALYTICS (Materialized Views / Snapshot Tables)
-- ============================================================================

-- 20a: Branch performance snapshots
CREATE TABLE IF NOT EXISTS branch_performance (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id           UUID REFERENCES branches(id) ON DELETE CASCADE,
  branch_name         VARCHAR(100),
  period              VARCHAR(20) NOT NULL,   -- '2026-03', '2026-Q1'
  
  total_sales         NUMERIC(14,2) DEFAULT 0,
  sales_quota         NUMERIC(14,2) DEFAULT 0,
  total_orders        INT DEFAULT 0,
  avg_order_value     NUMERIC(12,2) DEFAULT 0,
  
  stockout_count      INT DEFAULT 0,
  on_time_delivery    NUMERIC(5,2) DEFAULT 0,   -- percentage
  overdue_receivables NUMERIC(14,2) DEFAULT 0,
  
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20b: Agent performance snapshots
CREATE TABLE IF NOT EXISTS agent_performance_snapshots (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id            UUID REFERENCES employees(id) ON DELETE CASCADE,
  agent_name          VARCHAR(200),
  branch_id           UUID REFERENCES branches(id) ON DELETE SET NULL,
  period              VARCHAR(20) NOT NULL,
  
  -- Sales
  total_revenue       NUMERIC(14,2) DEFAULT 0,
  number_of_orders    INT DEFAULT 0,
  avg_order_value     NUMERIC(12,2) DEFAULT 0,
  sell_rate           NUMERIC(5,2) DEFAULT 0,
  
  -- Customer
  active_customers    INT DEFAULT 0,
  new_customers       INT DEFAULT 0,
  retention_rate      NUMERIC(5,2) DEFAULT 0,
  
  -- Financial
  commission_earned   NUMERIC(14,2) DEFAULT 0,
  avg_profit_margin   NUMERIC(5,2) DEFAULT 0,
  collection_rate     NUMERIC(5,2) DEFAULT 0,
  outstanding_receivables NUMERIC(14,2) DEFAULT 0,
  
  -- Rankings
  rank_by_revenue     INT,
  rank_by_orders      INT,
  rank_by_retention   INT,
  
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20c: Executive KPI snapshots
CREATE TABLE IF NOT EXISTS executive_kpi_snapshots (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period          VARCHAR(20) NOT NULL,
  kpi_name        VARCHAR(200) NOT NULL,
  kpi_value       NUMERIC(14,2),
  kpi_display     VARCHAR(100),
  trend           VARCHAR(50),
  trend_up        BOOLEAN,
  subtitle        TEXT,
  status          VARCHAR(50),     -- 'good','warning','danger','neutral'
  previous_value  VARCHAR(100),
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 21: AGENT PURCHASE REQUESTS (Agent Dashboard)
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_purchase_requests (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_number      VARCHAR(50) NOT NULL UNIQUE,
  agent_id            UUID REFERENCES employees(id) ON DELETE SET NULL,
  
  item_name           VARCHAR(300) NOT NULL,
  category            purchase_request_category NOT NULL,
  quantity            NUMERIC(14,4) NOT NULL,
  unit                VARCHAR(50),
  estimated_cost      NUMERIC(14,2) DEFAULT 0,
  supplier            VARCHAR(300),
  supplier_quote      NUMERIC(14,2),
  reason              TEXT,
  urgency             urgency_level DEFAULT 'Medium',
  
  status              purchase_request_status DEFAULT 'Draft',
  requested_by        VARCHAR(200),
  request_date        DATE DEFAULT CURRENT_DATE,
  approver            VARCHAR(200),
  approval_date       DATE,
  rejection_reason    TEXT,
  expected_delivery   DATE,
  
  branch_id           UUID REFERENCES branches(id) ON DELETE SET NULL,
  
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 22: POD (Proof of Delivery) COLLECTION (Agent)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pod_collections (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  delivery_number   VARCHAR(50) NOT NULL,
  order_number      VARCHAR(50),
  order_id          UUID REFERENCES orders(id) ON DELETE SET NULL,
  customer_name     VARCHAR(300),
  
  delivered_date    DATE,
  delivered_time    TIME,
  delivery_amount   NUMERIC(14,2) DEFAULT 0,
  received_by       VARCHAR(200),
  
  pod_collected     BOOLEAN DEFAULT FALSE,
  pod_image         TEXT,
  pod_notes         TEXT,
  signature_required BOOLEAN DEFAULT TRUE,
  issues            TEXT[],
  
  agent_id          UUID REFERENCES employees(id) ON DELETE SET NULL,
  branch_id         UUID REFERENCES branches(id) ON DELETE SET NULL,
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 23: INDEXES
-- ============================================================================

-- Employees
CREATE INDEX IF NOT EXISTS idx_employees_branch ON employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_auth_user ON employees(auth_user_id);

-- Products
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);
CREATE INDEX IF NOT EXISTS idx_product_variants_supplier ON product_variants(supplier_id);
CREATE INDEX IF NOT EXISTS idx_product_stock_movements_variant ON product_stock_movements(variant_id);
CREATE INDEX IF NOT EXISTS idx_product_stock_movements_timestamp ON product_stock_movements(timestamp);

-- Raw Materials
CREATE INDEX IF NOT EXISTS idx_raw_materials_category ON raw_materials(category_id);
CREATE INDEX IF NOT EXISTS idx_raw_materials_sku ON raw_materials(sku);
CREATE INDEX IF NOT EXISTS idx_raw_materials_status ON raw_materials(status);
CREATE INDEX IF NOT EXISTS idx_raw_materials_supplier ON raw_materials(supplier_id);
CREATE INDEX IF NOT EXISTS idx_material_batches_material ON material_batches(material_id);
CREATE INDEX IF NOT EXISTS idx_material_stock_movements_material ON material_stock_movements(material_id);
CREATE INDEX IF NOT EXISTS idx_material_stock_movements_date ON material_stock_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_material_consumption_material ON material_consumption(material_id);

-- Customers
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_agent ON customers(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_customers_branch ON customers(branch_id);
CREATE INDEX IF NOT EXISTS idx_customers_risk ON customers(risk_level);
CREATE INDEX IF NOT EXISTS idx_customer_tasks_customer ON customer_tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_tasks_status ON customer_tasks(status);
CREATE INDEX IF NOT EXISTS idx_customer_tasks_due ON customer_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_customer_activities_customer ON customer_activities(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_buying_patterns_customer ON customer_buying_patterns(customer_id);

-- Orders
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_agent ON orders(agent_id);
CREATE INDEX IF NOT EXISTS idx_orders_branch ON orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_required_date ON orders(required_date);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_order_line_items_order ON order_line_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_line_items_variant ON order_line_items(variant_id);
CREATE INDEX IF NOT EXISTS idx_order_logs_order ON order_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_order_logs_timestamp ON order_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_order_proofs_order ON order_proof_documents(order_id);

-- Invoices
CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status);

-- Payment System
CREATE INDEX IF NOT EXISTS idx_payment_links_invoice ON payment_links(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_order ON payment_links(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_links_token ON payment_links(token);
CREATE INDEX IF NOT EXISTS idx_payment_links_status ON payment_links(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_link ON payment_transactions(payment_link_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_invoice ON payment_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_digital_receipts_transaction ON digital_receipts(payment_transaction_id);
CREATE INDEX IF NOT EXISTS idx_digital_receipts_number ON digital_receipts(receipt_number);

-- Collections
CREATE INDEX IF NOT EXISTS idx_receivables_customer ON receivables(customer_id);
CREATE INDEX IF NOT EXISTS idx_receivables_agent ON receivables(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_receivables_status ON receivables(status);
CREATE INDEX IF NOT EXISTS idx_receivables_due_date ON receivables(due_date);
CREATE INDEX IF NOT EXISTS idx_collection_notes_receivable ON collection_notes(receivable_id);
CREATE INDEX IF NOT EXISTS idx_collection_payments_receivable ON collection_payment_records(receivable_id);

-- Purchase
CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_material ON purchase_requisitions(material_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_status ON purchase_requisitions(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_branch ON purchase_orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_transfer ON purchase_orders(is_transfer_request) WHERE is_transfer_request = true;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_transfer_req_branch ON purchase_orders(transfer_requesting_branch_id) WHERE transfer_requesting_branch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_orders_ibr
  ON purchase_orders(inter_branch_request_id) WHERE inter_branch_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_order ON purchase_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_material ON purchase_order_items(material_id);
CREATE INDEX IF NOT EXISTS idx_po_receipts_order ON purchase_order_receipts(order_id);
CREATE INDEX IF NOT EXISTS idx_po_logs_order ON purchase_order_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_branch ON purchase_requests(branch_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_status ON purchase_requests(status);
CREATE INDEX IF NOT EXISTS idx_production_requests_branch ON production_requests(branch_id);
CREATE INDEX IF NOT EXISTS idx_production_requests_status ON production_requests(status);
CREATE INDEX IF NOT EXISTS idx_production_requests_transfer ON production_requests(is_transfer_request) WHERE is_transfer_request = true;
CREATE INDEX IF NOT EXISTS idx_production_requests_transfer_req_branch ON production_requests(transfer_requesting_branch_id) WHERE transfer_requesting_branch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_production_requests_ibr
  ON production_requests(inter_branch_request_id) WHERE inter_branch_request_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_production_request_items_request ON production_request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_production_request_logs_req ON production_request_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_production_request_orders_request ON production_request_orders(request_id);
CREATE INDEX IF NOT EXISTS idx_production_request_orders_order ON production_request_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_grn_po ON goods_receipt_notes(purchase_order_id);

-- Suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_supplier_branches_supplier ON supplier_branches(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_branches_branch ON supplier_branches(branch_id);
CREATE INDEX IF NOT EXISTS idx_supplier_materials_supplier ON supplier_materials(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_materials_material ON supplier_materials(material_id);

-- Logistics
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_branch ON vehicles(branch_id);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle ON trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_date ON trips(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_trips_branch ON trips(branch_id);
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_trip ON delivery_tracking(trip_id);
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_status ON delivery_tracking(status);
CREATE INDEX IF NOT EXISTS idx_delay_exceptions_trip ON delay_exceptions(trip_id);
CREATE INDEX IF NOT EXISTS idx_delay_exceptions_status ON delay_exceptions(status);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON maintenance_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trip_history_vehicle_id ON trip_history(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_driver_assignments_driver ON driver_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_assignments_vehicle ON driver_assignments(vehicle_id);

-- Warehouse
CREATE INDEX IF NOT EXISTS idx_production_batches_product ON production_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_production_batches_qa ON production_batches(qa_status);
CREATE INDEX IF NOT EXISTS idx_order_fulfillment_order ON order_fulfillment(order_id);
CREATE INDEX IF NOT EXISTS idx_order_fulfillment_status ON order_fulfillment(fulfillment_status);
CREATE INDEX IF NOT EXISTS idx_quality_issues_status ON quality_issues(status);
CREATE INDEX IF NOT EXISTS idx_warehouse_movements_type ON warehouse_stock_movements(type);
CREATE INDEX IF NOT EXISTS idx_warehouse_movements_branch ON warehouse_stock_movements(branch_id);
CREATE INDEX IF NOT EXISTS idx_finished_goods_branch ON finished_goods_stock(branch_id);
CREATE INDEX IF NOT EXISTS idx_finished_goods_variant ON finished_goods_stock(variant_id);

-- Chat
CREATE INDEX IF NOT EXISTS idx_chat_users_employee ON chat_users(employee_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_chat ON chat_members(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp);

-- Audit
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_branch ON audit_logs(branch_id);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_logistics_alerts_type ON logistics_alerts(type);
CREATE INDEX IF NOT EXISTS idx_warehouse_alerts_type ON warehouse_alerts(type);
CREATE INDEX IF NOT EXISTS idx_agent_alerts_agent ON agent_alerts(agent_id);

-- Calendar
CREATE INDEX IF NOT EXISTS idx_calendar_events_date ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_branch ON calendar_events(branch_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON calendar_events(type);

-- Reports
CREATE INDEX IF NOT EXISTS idx_branch_performance_branch ON branch_performance(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_performance_period ON branch_performance(period);
CREATE INDEX IF NOT EXISTS idx_agent_perf_snapshot_agent ON agent_performance_snapshots(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_perf_snapshot_period ON agent_performance_snapshots(period);
CREATE INDEX IF NOT EXISTS idx_executive_kpi_period ON executive_kpi_snapshots(period);

-- Agent
CREATE INDEX IF NOT EXISTS idx_agent_targets_employee ON agent_targets(employee_id);
CREATE INDEX IF NOT EXISTS idx_agent_commissions_employee ON agent_commissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_customer_assignments_employee ON customer_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_customer_assignments_customer ON customer_assignments(customer_id);
CREATE INDEX IF NOT EXISTS idx_agent_purchase_requests_agent ON agent_purchase_requests(agent_id);
CREATE INDEX IF NOT EXISTS idx_pod_collections_order ON pod_collections(order_id);
CREATE INDEX IF NOT EXISTS idx_pod_collections_agent ON pod_collections(agent_id);


-- ============================================================================
-- SECTION 24: TRIGGER - Auto-update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables that have the column
DO $$ 
DECLARE 
  tbl TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name 
    FROM information_schema.columns 
    WHERE column_name = 'updated_at' 
      AND table_schema = 'public'
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trigger_updated_at ON %I; 
       CREATE TRIGGER trigger_updated_at 
       BEFORE UPDATE ON %I 
       FOR EACH ROW EXECUTE FUNCTION update_updated_at();',
      tbl, tbl
    );
  END LOOP;
END $$;


-- ============================================================================
-- SECTION 25: ROW LEVEL SECURITY (RLS)
-- Enable RLS on ALL tables and grant full CRUD to any logged-in user.
-- Supabase requires RLS to be enabled; without policies, no data is accessible.
-- Policy check: auth.uid() IS NOT NULL — true for any authenticated session.
-- Refine per-role policies as needed in modifications.sql.
-- ============================================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  -- Enable RLS on every public table
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
  END LOOP;

  -- Create a full-access policy for any logged-in user on every public table
  FOR tbl IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    -- SELECT
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR SELECT USING (auth.uid() IS NOT NULL)',
        'auth_select_' || tbl, tbl
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    -- INSERT
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)',
        'auth_insert_' || tbl, tbl
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    -- UPDATE
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR UPDATE USING (auth.uid() IS NOT NULL)',
        'auth_update_' || tbl, tbl
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    -- DELETE
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR DELETE USING (auth.uid() IS NOT NULL)',
        'auth_delete_' || tbl, tbl
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;


-- ============================================================================
-- SECTION 26: SEED DATA
-- ============================================================================

-- Branches (titles: region + LAMTEX role; keep in sync with `src/constants/lamtexBranches.ts`)
INSERT INTO branches (code, name, is_active) VALUES
  ('MNL', 'Manila (NCR) - LAMTEX HQ, warehouse & NCR market',    TRUE),
  ('CEB', 'Cebu (Visayas) - LAMTEX regional hub & warehouse',  TRUE),
  ('BTG', 'Batangas - LAMTEX plant & Calabarzon staging',       TRUE)
ON CONFLICT (code) DO NOTHING;

-- Product categories (branch-specific; slug is the unique key; `branch` = `branches.name`)
INSERT INTO product_categories (name, slug, description, sort_order, is_active, branch) VALUES
  -- Manila (NCR)
  ('M_HDPE Pipes',        'm-hdpe-pipes',        'Heavy-duty HDPE piping for industrial use',         1, true, 'Manila (NCR) - LAMTEX HQ, warehouse & NCR market'),
  ('M_HDPE Fittings',     'm-hdpe-fittings',     'Elbows, tees, couplings for HDPE systems',          2, true, 'Manila (NCR) - LAMTEX HQ, warehouse & NCR market'),
  ('M_UPVC Sanitary',     'm-upvc-sanitary',     'Sanitary drainage and sewage pipes',                3, true, 'Manila (NCR) - LAMTEX HQ, warehouse & NCR market'),
  ('M_UPVC Electrical',   'm-upvc-electrical',   'Conduit pipes for electrical wiring',               4, true, 'Manila (NCR) - LAMTEX HQ, warehouse & NCR market'),
  ('M_Pressure Line',     'm-pressure-line',     'High-pressure rated water supply pipes',            5, true, 'Manila (NCR) - LAMTEX HQ, warehouse & NCR market'),
  ('M_PPR Pipes',         'm-ppr-pipes',         'Polypropylene random copolymer hot/cold pipes',     6, true, 'Manila (NCR) - LAMTEX HQ, warehouse & NCR market'),
  -- Cebu (Visayas)
  ('C_HDPE Pipes',        'c-hdpe-pipes',        'HDPE distribution pipes for Cebu operations',       1, true, 'Cebu (Visayas) - LAMTEX regional hub & warehouse'),
  ('C_PVC Conduits',      'c-pvc-conduits',      'PVC electrical conduit pipes',                       2, true, 'Cebu (Visayas) - LAMTEX regional hub & warehouse'),
  ('C_Sanitary Fittings', 'c-sanitary-fittings', 'Drainage fittings and traps',                        3, true, 'Cebu (Visayas) - LAMTEX regional hub & warehouse'),
  ('C_Garden Hoses',      'c-garden-hoses',      'Flexible garden and irrigation hoses',               4, true, 'Cebu (Visayas) - LAMTEX regional hub & warehouse'),
  -- Batangas (Calabarzon)
  ('B_Industrial Pipes',  'b-industrial-pipes',  'Heavy industrial grade piping systems',             1, true, 'Batangas - LAMTEX plant & Calabarzon staging'),
  ('B_HDPE Fittings',     'b-hdpe-fittings',     'HDPE couplings and reducers',                        2, true, 'Batangas - LAMTEX plant & Calabarzon staging'),
  ('B_Chemical PVC',      'b-chemical-pvc',      'Chemical-resistant PVC pipe systems',                3, true, 'Batangas - LAMTEX plant & Calabarzon staging'),
  ('B_Drainage Systems',  'b-drainage-systems',  'Underground drainage and stormwater pipes',          4, true, 'Batangas - LAMTEX plant & Calabarzon staging'),
  ('B_Flexible Hoses',    'b-flexible-hoses',    'Industrial flexible hose assemblies',                5, true, 'Batangas - LAMTEX plant & Calabarzon staging')
ON CONFLICT (slug) DO NOTHING;

-- Material categories
INSERT INTO material_categories (name, slug, sort_order) VALUES
  ('PVC Resin', 'pvc-resin', 1),
  ('HDPE Resin', 'hdpe-resin', 2),
  ('PPR Resin', 'ppr-resin', 3),
  ('Stabilizers', 'stabilizers', 4),
  ('Plasticizers', 'plasticizers', 5),
  ('Lubricants', 'lubricants', 6),
  ('Colorants', 'colorants', 7),
  ('Additives', 'additives', 8),
  ('Packaging Materials', 'packaging-materials', 9),
  ('Other', 'other', 10)
ON CONFLICT (name) DO NOTHING;

-- Payment method fees (default configuration)
INSERT INTO payment_method_fees (method, gateway_fee_percent, gateway_fee_fixed, service_fee_percent, service_fee_fixed, enabled, description) VALUES
  ('GCash', 1.50, 0, 0.75, 200, TRUE, 'Pay via GCash wallet - instant confirmation'),
  ('Maya', 1.50, 0, 0.75, 200, TRUE, 'Pay via Maya (PayMaya) wallet - instant confirmation'),
  ('Bank Transfer', 0, 500, 0.50, 300, TRUE, 'Direct bank transfer - processed within 24 hours'),
  ('Credit Card', 2.50, 0, 0.75, 200, TRUE, 'Pay with Visa, Mastercard, JCB - instant confirmation'),
  ('Debit Card', 2.00, 0, 0.75, 200, TRUE, 'Pay with debit card - instant confirmation'),
  ('Cash', 0, 0, 0, 0, TRUE, 'Cash payment - no additional fees'),
  ('Check', 0, 0, 0, 0, TRUE, 'Check payment - cleared after processing')
ON CONFLICT (method) DO NOTHING;


-- ============================================================================
-- SCHEMA COMPLETE
-- Total: ~70 tables, ~120 enums, ~150 indexes, auto-trigger, RLS, seed data
-- ============================================================================
