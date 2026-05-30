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
DO $$ BEGIN CREATE TYPE order_status AS ENUM ('Draft', 'Pending', 'Approved', 'Scheduled', 'Loading', 'Packed', 'Ready', 'In Transit', 'Delivered', 'Partially Fulfilled', 'Completed', 'Cancelled', 'Rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'Partially Fulfilled';
DO $$ BEGIN CREATE TYPE payment_status AS ENUM ('Unbilled', 'Invoiced', 'Partially Paid', 'Paid', 'Overdue', 'On Credit'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
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
  'proof_uploaded', 'proof_verified', 'proof_rejected', 'proof_updated', 'proof_removed'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE order_log_role AS ENUM ('Agent', 'Warehouse Staff', 'Manager', 'Admin', 'System', 'Logistics'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE proof_type AS ENUM ('delivery', 'payment', 'receipt', 'other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
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
DO $$ BEGIN CREATE TYPE vehicle_type AS ENUM ('Truck', 'Container Van', 'Motorcycle', 'Shipping Container'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
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
DO $$ BEGIN CREATE TYPE notification_category AS ENUM ('Approvals', 'Inventory', 'Delivery', 'Payment', 'System', 'Message'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE notification_category ADD VALUE IF NOT EXISTS 'Message'; EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE alert_severity AS ENUM ('Low', 'Medium', 'High', 'Critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE logistics_alert_type AS ENUM ('New Order Ready', 'Warehouse Not Ready', 'Truck Unavailable', 'Delivery Failed', 'Capacity Warning', 'Executive Request'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE warehouse_alert_type AS ENUM ('Low Stock', 'Shortage Impact', 'Material Delay', 'Material Arrival', 'QA Reject', 'Transfer Request', 'Trip Loading'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

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

-- 3a2: Multiple dashboard roles per employee
CREATE TABLE IF NOT EXISTS employee_user_roles (
  employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  user_role     user_role NOT NULL,
  is_primary    BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (employee_id, user_role)
);

CREATE INDEX IF NOT EXISTS idx_employee_user_roles_employee ON employee_user_roles(employee_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_user_roles_one_primary
  ON employee_user_roles(employee_id) WHERE is_primary;

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
  skill_description TEXT,
  date_started    DATE,
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
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id       UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  asset_type        asset_type NOT NULL,
  asset_name        VARCHAR(300) NOT NULL,
  serial_number     VARCHAR(200),
  model             VARCHAR(200),
  assigned_date     DATE,
  condition         asset_condition DEFAULT 'Good',
  value             NUMERIC(12,2) DEFAULT 0,
  asset_description TEXT,
  category_label    VARCHAR(200),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

-- 3s: Agent quota history (audit log for every change to agent_targets)
-- Source migration: database/agent_analytics_quotas.sql
CREATE TABLE IF NOT EXISTS agent_quota_history (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id        UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period             VARCHAR(20) NOT NULL,
  prev_monthly       NUMERIC(14,2),
  new_monthly        NUMERIC(14,2),
  prev_quarterly     NUMERIC(14,2),
  new_quarterly      NUMERIC(14,2),
  prev_stretch       VARCHAR(100),
  new_stretch        VARCHAR(100),
  note               TEXT,
  changed_by_email   VARCHAR(255),
  changed_by_name    VARCHAR(200),
  changed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3s-branch: Branch-wide sales quota (one target per branch per period; synced to all agents)
-- Source migration: database/branch_sales_targets.sql
CREATE TABLE IF NOT EXISTS branch_sales_targets (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id                UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  period                   VARCHAR(20) NOT NULL,
  monthly_sales_target     NUMERIC(14,2) NOT NULL DEFAULT 0,
  quarterly_sales_target   NUMERIC(14,2) NOT NULL DEFAULT 0,
  stretch_goal_status      VARCHAR(100),
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(branch_id, period)
);

CREATE TABLE IF NOT EXISTS branch_quota_history (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  branch_id          UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  period             VARCHAR(20) NOT NULL,
  prev_monthly       NUMERIC(14,2),
  new_monthly        NUMERIC(14,2),
  prev_quarterly     NUMERIC(14,2),
  new_quarterly      NUMERIC(14,2),
  prev_stretch       VARCHAR(100),
  new_stretch        VARCHAR(100),
  note               TEXT,
  changed_by_email   VARCHAR(255),
  changed_by_name    VARCHAR(200),
  changed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

  address                  TEXT,
  city                     TEXT,
  province                 TEXT,
  postal_code              VARCHAR(20),
  map_lat                  NUMERIC(10,7),
  map_lng                  NUMERIC(10,7),

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
  category_code VARCHAR(50),
  description TEXT,
  image_url   TEXT,
  sort_order  INT DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  branch      VARCHAR(50) DEFAULT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5a-i: Category code (CAT-{BRANCH}-{NNNNNN}) — Source: database/category_code.sql
ALTER TABLE product_categories ADD COLUMN IF NOT EXISTS category_code VARCHAR(50);

CREATE OR REPLACE FUNCTION public.product_category_branch_code(
  p_branch_name TEXT,
  p_slug        TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_code TEXT;
BEGIN
  IF p_branch_name IS NOT NULL AND TRIM(p_branch_name) <> '' THEN
    SELECT b.code INTO v_code FROM branches b WHERE b.name = TRIM(p_branch_name);
    IF v_code IS NOT NULL AND TRIM(v_code) <> '' THEN
      RETURN TRIM(v_code);
    END IF;
  END IF;

  IF p_slug IS NOT NULL THEN
    IF p_slug LIKE 'm-%' THEN RETURN 'MNL'; END IF;
    IF p_slug LIKE 'c-%' THEN RETURN 'CEB'; END IF;
    IF p_slug LIKE 'b-%' THEN RETURN 'BTG'; END IF;
  END IF;

  RETURN 'GEN';
END;
$$;

CREATE OR REPLACE FUNCTION public.next_category_code(p_branch_name TEXT, p_slug TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branch_code TEXT;
  v_prefix      TEXT;
  v_next        INT;
BEGIN
  v_branch_code := public.product_category_branch_code(p_branch_name, p_slug);
  v_prefix := 'CAT-' || v_branch_code || '-';

  SELECT COALESCE(
    MAX(
      NULLIF(
        regexp_replace(substring(pc.category_code FROM char_length(v_prefix) + 1), '[^0-9]', '', 'g'),
        ''
      )::INT
    ),
    0
  ) + 1
  INTO v_next
  FROM product_categories pc
  WHERE pc.category_code LIKE v_prefix || '%';

  RETURN v_prefix || lpad(v_next::TEXT, 6, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.next_category_code(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_category_code(TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.trg_product_categories_assign_category_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.category_code IS NULL OR TRIM(NEW.category_code) = '' THEN
    NEW.category_code := public.next_category_code(NEW.branch, NEW.slug);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS product_categories_assign_category_code ON product_categories;
CREATE TRIGGER product_categories_assign_category_code
  BEFORE INSERT ON product_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_product_categories_assign_category_code();

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
  is_hidden       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5b-i: Product catalog visibility — Source: database/product_catalog_visibility.sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

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
  -- Shipping volume per inventory unit (m³); compare to vehicles.max_volume_cbm when loading trips
  volume_cbm      NUMERIC(12,6),
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
  is_hidden       BOOLEAN NOT NULL DEFAULT FALSE,
  last_restocked  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5c-i: Variant catalog visibility — Source: database/variant_catalog_visibility.sql
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

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

-- 5h: Product activity log (mirrors purchase_order_logs — variants/BOM/images/stock, etc.)
CREATE TABLE IF NOT EXISTS product_logs (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          UUID        REFERENCES products(id) ON DELETE SET NULL,
  variant_id          UUID        REFERENCES product_variants(id) ON DELETE SET NULL,
  action              TEXT        NOT NULL,
  performed_by        TEXT,
  performed_by_role   TEXT,
  description         TEXT,
  old_value           JSONB,
  new_value           JSONB,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

-- 6b-i: Raw material activity log (catalog edits, stock adjustments, PO price sync, etc.)
CREATE TABLE IF NOT EXISTS raw_material_logs (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_material_id     UUID        REFERENCES raw_materials(id) ON DELETE SET NULL,
  action              TEXT        NOT NULL,
  performed_by        TEXT,
  performed_by_role   TEXT,
  description         TEXT,
  old_value           JSONB,
  new_value           JSONB,
  metadata            JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6b-i-b: Warehouse manager catalog scope (product families + raw materials)
CREATE TABLE IF NOT EXISTS employee_product_assignments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, product_id)
);

CREATE TABLE IF NOT EXISTS employee_material_assignments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  material_id     UUID NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, material_id)
);

-- Per-employee order module permissions (Employee profile → Access tab)
CREATE TABLE IF NOT EXISTS employee_order_permissions (
  employee_id   UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  permissions   JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_product_permissions (
  employee_id   UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  permissions   JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_material_permissions (
  employee_id   UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  permissions   JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_warehouse_permissions (
  employee_id   UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  permissions   JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_production_request_permissions (
  employee_id   UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  permissions   JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_purchase_order_permissions (
  employee_id   UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  permissions   JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_inter_branch_request_permissions (
  employee_id   UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  permissions   JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_logistics_permissions (
  employee_id   UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  permissions   JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_customer_permissions (
  employee_id   UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  permissions   JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_supplier_permissions (
  employee_id   UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  permissions   JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_finance_permissions (
  employee_id   UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  permissions   JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_employees_permissions (
  employee_id   UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  permissions   JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_agent_analytics_permissions (
  employee_id   UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  permissions   JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_reports_permissions (
  employee_id   UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  permissions   JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_settings_permissions (
  employee_id   UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  permissions   JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  customer_code         VARCHAR(50),
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

-- 7a: Customer code (CUS-{BRANCH}-{NNNNNN}) — Source: database/customer_code.sql
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_code VARCHAR(50);

CREATE OR REPLACE FUNCTION public.next_customer_code(p_branch_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_branch_code TEXT;
  v_prefix      TEXT;
  v_next        INT;
BEGIN
  IF p_branch_id IS NOT NULL THEN
    SELECT b.code INTO v_branch_code FROM branches b WHERE b.id = p_branch_id;
  END IF;
  v_prefix := 'CUS-' || COALESCE(NULLIF(TRIM(v_branch_code), ''), 'GEN') || '-';

  SELECT COALESCE(
    MAX(
      NULLIF(
        regexp_replace(substring(c.customer_code FROM char_length(v_prefix) + 1), '[^0-9]', '', 'g'),
        ''
      )::INT
    ),
    0
  ) + 1
  INTO v_next
  FROM customers c
  WHERE c.customer_code LIKE v_prefix || '%';

  RETURN v_prefix || lpad(v_next::TEXT, 6, '0');
END;
$$;

REVOKE ALL ON FUNCTION public.next_customer_code(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_customer_code(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.trg_customers_assign_customer_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.customer_code IS NULL OR TRIM(NEW.customer_code) = '' THEN
    NEW.customer_code := public.next_customer_code(NEW.branch_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customers_assign_customer_code ON customers;
CREATE TRIGGER customers_assign_customer_code
  BEFORE INSERT ON customers
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_customers_assign_customer_code();

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
  overdue_notified_at TIMESTAMPTZ,
  
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
  title           VARCHAR(500),
  payment_cash_amount   NUMERIC(14,2) DEFAULT 0,
  payment_credit_amount NUMERIC(14,2) DEFAULT 0,
  payment_adjustment    NUMERIC(14,2) DEFAULT 0,
  commission_paid_at    TIMESTAMPTZ,
  commission_paid_by    VARCHAR(200),
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8e: Customer-facing order summary portals (read-only by token, no auth)
-- Source migration: database/order_customer_portal.sql
CREATE TABLE IF NOT EXISTS order_customer_portals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  token           VARCHAR(64) NOT NULL UNIQUE,
  expires_at      TIMESTAMPTZ,
  view_count      INT NOT NULL DEFAULT 0,
  last_viewed_at  TIMESTAMPTZ,
  customer_email  VARCHAR(255),
  sent_via_email  BOOLEAN NOT NULL DEFAULT FALSE,
  last_email_sent TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT order_customer_portals_order_id_key UNIQUE (order_id)
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
                           CHECK (status IN ('Draft','Requested','Rejected','Accepted','Sent','Confirmed','Partially Received','Received','Completed','Cancelled')),
  order_date             DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery_date DATE,
  actual_delivery_date   DATE,
  total_amount           NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency               TEXT NOT NULL DEFAULT 'PHP',
  notes                  TEXT,
  created_by             TEXT,
  submitted_by           TEXT,
  submitted_at           TIMESTAMPTZ,
  submitted_by_auth_user_id UUID,
  submitted_by_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
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

-- Proof-of-receiving images attached to a PO receipt event (legacy; new uploads use purchase_order_proof_documents)
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

-- PO proof documents (delivery, payment, other) — mirrors order_proof_documents
CREATE TABLE IF NOT EXISTS purchase_order_proof_documents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id     UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  type                  proof_type NOT NULL,
  file_name             VARCHAR(500),
  file_url              TEXT NOT NULL DEFAULT '',
  file_size             BIGINT,
  uploaded_by           VARCHAR(200),
  uploaded_by_role      TEXT,
  status                proof_status DEFAULT 'verified',
  notes                 TEXT,
  title                 VARCHAR(500),
  payment_cash_amount   NUMERIC(14, 2) DEFAULT 0,
  payment_credit_amount NUMERIC(14, 2) DEFAULT 0,
  payment_adjustment    NUMERIC(14, 2) DEFAULT 0,
  uploaded_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  created_by_auth_user_id  UUID,
  created_by_employee_id   UUID REFERENCES employees(id) ON DELETE SET NULL,
  submitted_by             TEXT,
  submitted_at             TIMESTAMPTZ,
  submitted_by_auth_user_id UUID,
  submitted_by_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
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
  logistics_notes TEXT,

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

-- Inter-branch request ↔ trip linkage (see database/inter_branch_request_trip.sql).
-- Lets an IBR departure reserve a fleet vehicle on the logistics/truck schedule.
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS inter_branch_request_id UUID
  REFERENCES inter_branch_requests(id) ON DELETE SET NULL;
ALTER TABLE inter_branch_requests
  ADD COLUMN IF NOT EXISTS linked_trip_id UUID
  REFERENCES trips(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_trips_inter_branch_request
  ON trips(inter_branch_request_id);
CREATE INDEX IF NOT EXISTS idx_ibr_linked_trip
  ON inter_branch_requests(linked_trip_id);

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
  -- category is optional from the UI; defaults to 'Preventive' if not supplied
  category        maintenance_category NOT NULL DEFAULT 'Preventive',
  description     TEXT NOT NULL,
  scheduled_date  DATE,
  completed_date  DATE,
  cost            NUMERIC(12,2) DEFAULT 0,
  vendor          VARCHAR(300),
  -- Application-managed statuses: 'Scheduled' | 'In Progress' | 'Completed'
  -- 'Overdue' is computed on the application layer: scheduled_date < CURRENT_DATE AND status != 'Completed'
  status          VARCHAR(50) DEFAULT 'Scheduled',
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
  title       TEXT,
  message     TEXT NOT NULL,
  urgent      BOOLEAN DEFAULT FALSE,
  read        BOOLEAN DEFAULT FALSE,
  action_url  TEXT,
  action_label TEXT,
  branch_id   UUID REFERENCES branches(id) ON DELETE SET NULL,
  metadata    JSONB,
  event_type  TEXT,
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
  related_order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
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
  date_established DATE,
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
  latitude        NUMERIC(10,7),
  longitude       NUMERIC(10,7),
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
  is_active       BOOLEAN DEFAULT TRUE,
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
CREATE INDEX IF NOT EXISTS idx_products_is_hidden
  ON products(is_hidden)
  WHERE is_hidden = TRUE;
CREATE INDEX IF NOT EXISTS idx_product_variants_is_hidden
  ON product_variants(is_hidden)
  WHERE is_hidden = TRUE;
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
CREATE INDEX IF NOT EXISTS idx_material_consumption_branch_date ON material_consumption(branch, consumption_date DESC);

-- Customers
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_customer_code
  ON customers(customer_code)
  WHERE customer_code IS NOT NULL AND TRIM(customer_code) <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_categories_category_code
  ON product_categories(category_code)
  WHERE category_code IS NOT NULL AND TRIM(category_code) <> '';
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
CREATE INDEX IF NOT EXISTS idx_po_proof_docs_po ON purchase_order_proof_documents(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_po_proof_docs_type ON purchase_order_proof_documents(purchase_order_id, type);

-- RLS for purchase_order_proof_documents (table may be created after bootstrap bulk RLS loop)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_proof_documents TO authenticated;
ALTER TABLE public.purchase_order_proof_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS auth_select_purchase_order_proof_documents ON public.purchase_order_proof_documents;
DROP POLICY IF EXISTS auth_insert_purchase_order_proof_documents ON public.purchase_order_proof_documents;
DROP POLICY IF EXISTS auth_update_purchase_order_proof_documents ON public.purchase_order_proof_documents;
DROP POLICY IF EXISTS auth_delete_purchase_order_proof_documents ON public.purchase_order_proof_documents;
DROP POLICY IF EXISTS lamtex_authenticated_select_purchase_order_proof_documents ON public.purchase_order_proof_documents;
DROP POLICY IF EXISTS lamtex_authenticated_insert_purchase_order_proof_documents ON public.purchase_order_proof_documents;
DROP POLICY IF EXISTS lamtex_authenticated_update_purchase_order_proof_documents ON public.purchase_order_proof_documents;
DROP POLICY IF EXISTS lamtex_authenticated_delete_purchase_order_proof_documents ON public.purchase_order_proof_documents;

CREATE POLICY lamtex_authenticated_select_purchase_order_proof_documents
  ON public.purchase_order_proof_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY lamtex_authenticated_insert_purchase_order_proof_documents
  ON public.purchase_order_proof_documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY lamtex_authenticated_update_purchase_order_proof_documents
  ON public.purchase_order_proof_documents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY lamtex_authenticated_delete_purchase_order_proof_documents
  ON public.purchase_order_proof_documents FOR DELETE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_po_logs_order ON purchase_order_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_product_logs_product_order ON product_logs(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_material_logs_material_order ON raw_material_logs(raw_material_id, created_at DESC);
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
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Realtime: bell badge + live notification drawer (postgres_changes subscription)
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- ============================================================================
-- CHAT SYSTEM — Messenger-style internal team chat (participant-scoped)
-- Full migration: database/chat_system.sql. Attachments live in the public
-- `images` bucket under `chat-attachments/`. RLS is strict (NOT the blanket
-- authenticated policy) — chat_* tables are excluded from the Section 26 loop.
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type            TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  name            TEXT,
  created_by      UUID,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_preview TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_participants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL,
  role            TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  last_read_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL,
  content         TEXT,
  reply_to_id     UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  attachments     JSONB NOT NULL DEFAULT '[]'::jsonb,
  link_preview    JSONB,
  edited          BOOLEAN NOT NULL DEFAULT FALSE,
  edited_at       TIMESTAMPTZ,
  deleted         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_message_reactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id  UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL,
  emoji       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_chat_participants_conversation ON chat_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_message_reactions_message ON chat_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_message ON chat_conversations(last_message_at DESC);

CREATE OR REPLACE FUNCTION public.is_chat_participant(p_conversation_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chat_participants
    WHERE conversation_id = p_conversation_id AND user_id = p_user_id
  );
$$;

ALTER TABLE chat_conversations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants      ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_conv_select ON chat_conversations;
CREATE POLICY chat_conv_select ON chat_conversations
  FOR SELECT USING (
    public.is_chat_participant(id, auth.uid())
    OR created_by = auth.uid()
  );
DROP POLICY IF EXISTS chat_conv_insert ON chat_conversations;
CREATE POLICY chat_conv_insert ON chat_conversations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS chat_conv_update ON chat_conversations;
CREATE POLICY chat_conv_update ON chat_conversations
  FOR UPDATE USING (public.is_chat_participant(id, auth.uid()));

DROP POLICY IF EXISTS chat_part_select ON chat_participants;
CREATE POLICY chat_part_select ON chat_participants
  FOR SELECT USING (public.is_chat_participant(conversation_id, auth.uid()));
DROP POLICY IF EXISTS chat_part_insert ON chat_participants;
CREATE POLICY chat_part_insert ON chat_participants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS chat_part_update ON chat_participants;
CREATE POLICY chat_part_update ON chat_participants
  FOR UPDATE USING (user_id = auth.uid());
DROP POLICY IF EXISTS chat_part_delete ON chat_participants;
CREATE POLICY chat_part_delete ON chat_participants
  FOR DELETE USING (user_id = auth.uid() OR public.is_chat_participant(conversation_id, auth.uid()));

DROP POLICY IF EXISTS chat_msg_select ON chat_messages;
CREATE POLICY chat_msg_select ON chat_messages
  FOR SELECT USING (public.is_chat_participant(conversation_id, auth.uid()));
DROP POLICY IF EXISTS chat_msg_insert ON chat_messages;
CREATE POLICY chat_msg_insert ON chat_messages
  FOR INSERT WITH CHECK (sender_id = auth.uid() AND public.is_chat_participant(conversation_id, auth.uid()));
DROP POLICY IF EXISTS chat_msg_update ON chat_messages;
CREATE POLICY chat_msg_update ON chat_messages
  FOR UPDATE USING (sender_id = auth.uid());

DROP POLICY IF EXISTS chat_react_select ON chat_message_reactions;
CREATE POLICY chat_react_select ON chat_message_reactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM chat_messages m
            WHERE m.id = message_id AND public.is_chat_participant(m.conversation_id, auth.uid()))
  );
DROP POLICY IF EXISTS chat_react_insert ON chat_message_reactions;
CREATE POLICY chat_react_insert ON chat_message_reactions
  FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS chat_react_delete ON chat_message_reactions;
CREATE POLICY chat_react_delete ON chat_message_reactions
  FOR DELETE USING (user_id = auth.uid());

ALTER TABLE chat_messages          REPLICA IDENTITY FULL;
ALTER TABLE chat_message_reactions REPLICA IDENTITY FULL;
ALTER TABLE chat_participants      REPLICA IDENTITY FULL;
ALTER TABLE chat_conversations     REPLICA IDENTITY FULL;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['chat_messages','chat_message_reactions','chat_participants','chat_conversations']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.trg_chat_message_after_insert()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  conv        chat_conversations%ROWTYPE;
  sender_name TEXT;
  preview     TEXT;
  title_text  TEXT;
  part        RECORD;
BEGIN
  SELECT * INTO conv FROM chat_conversations WHERE id = NEW.conversation_id;

  SELECT employee_name INTO sender_name
  FROM employees WHERE auth_user_id = NEW.sender_id LIMIT 1;
  sender_name := COALESCE(NULLIF(TRIM(sender_name), ''), 'Someone');

  IF NEW.content IS NOT NULL AND TRIM(NEW.content) <> '' THEN
    preview := LEFT(NEW.content, 140);
  ELSIF jsonb_array_length(NEW.attachments) > 0 THEN
    preview := '📎 Attachment';
  ELSE
    preview := 'New message';
  END IF;

  UPDATE chat_conversations
  SET last_message_at = NEW.created_at, last_message_preview = preview, updated_at = NOW()
  WHERE id = NEW.conversation_id;

  IF conv.type = 'group' THEN
    title_text := COALESCE(NULLIF(TRIM(conv.name), ''), 'Group chat') || ' · ' || sender_name;
  ELSE
    title_text := sender_name;
  END IF;

  FOR part IN
    SELECT user_id FROM chat_participants
    WHERE conversation_id = NEW.conversation_id AND user_id <> NEW.sender_id
  LOOP
    INSERT INTO notifications (
      user_id, category, title, message, urgent,
      action_url, action_label, metadata, event_type
    ) VALUES (
      part.user_id, 'Message'::notification_category, title_text, preview, FALSE,
      '/chats/' || NEW.conversation_id::text, 'Open chat',
      jsonb_build_object('conversationId', NEW.conversation_id, 'messageId', NEW.id,
                         'senderId', NEW.sender_id, 'senderName', sender_name),
      'chat_message'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS chat_message_after_insert ON chat_messages;
CREATE TRIGGER chat_message_after_insert
  AFTER INSERT ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_chat_message_after_insert();

GRANT SELECT, INSERT, UPDATE, DELETE ON chat_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_message_reactions TO authenticated;

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
CREATE INDEX IF NOT EXISTS idx_employee_product_assignments_employee ON employee_product_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_product_assignments_product ON employee_product_assignments(product_id);
CREATE INDEX IF NOT EXISTS idx_employee_material_assignments_employee ON employee_material_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_material_assignments_material ON employee_material_assignments(material_id);
CREATE INDEX IF NOT EXISTS idx_employee_order_permissions_updated ON employee_order_permissions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_product_permissions_updated ON employee_product_permissions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_material_permissions_updated ON employee_material_permissions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_warehouse_permissions_updated ON employee_warehouse_permissions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_production_request_permissions_updated ON employee_production_request_permissions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_purchase_order_permissions_updated ON employee_purchase_order_permissions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_inter_branch_request_permissions_updated ON employee_inter_branch_request_permissions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_logistics_permissions_updated ON employee_logistics_permissions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_customer_permissions_updated ON employee_customer_permissions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_supplier_permissions_updated ON employee_supplier_permissions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_finance_permissions_updated ON employee_finance_permissions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_employees_permissions_updated ON employee_employees_permissions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_agent_analytics_permissions_updated ON employee_agent_analytics_permissions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_reports_permissions_updated ON employee_reports_permissions(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_employee_settings_permissions_updated ON employee_settings_permissions(updated_at DESC);

ALTER TABLE employee_product_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_material_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_order_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_product_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_material_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_warehouse_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_production_request_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_purchase_order_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_inter_branch_request_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_logistics_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_customer_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_supplier_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_finance_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_employees_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_agent_analytics_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_reports_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_settings_permissions ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'employee_product_assignments',
    'employee_material_assignments',
    'employee_order_permissions',
    'employee_product_permissions',
    'employee_material_permissions',
    'employee_warehouse_permissions',
    'employee_production_request_permissions',
    'employee_purchase_order_permissions',
    'employee_inter_branch_request_permissions',
    'employee_logistics_permissions',
    'employee_customer_permissions',
    'employee_supplier_permissions',
    'employee_finance_permissions',
    'employee_employees_permissions',
    'employee_agent_analytics_permissions',
    'employee_reports_permissions',
    'employee_settings_permissions'
  ]
  LOOP
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR SELECT USING (auth.uid() IS NOT NULL)',
        'auth_select_' || tbl, tbl
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR INSERT WITH CHECK (auth.uid() IS NOT NULL)',
        'auth_insert_' || tbl, tbl
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR UPDATE USING (auth.uid() IS NOT NULL)',
        'auth_update_' || tbl, tbl
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR DELETE USING (auth.uid() IS NOT NULL)',
        'auth_delete_' || tbl, tbl
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;
CREATE INDEX IF NOT EXISTS idx_agent_purchase_requests_agent ON agent_purchase_requests(agent_id);
CREATE INDEX IF NOT EXISTS idx_pod_collections_order ON pod_collections(order_id);
CREATE INDEX IF NOT EXISTS idx_pod_collections_agent ON pod_collections(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_quota_history_employee
  ON agent_quota_history(employee_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_quota_history_period
  ON agent_quota_history(period, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_branch_sales_targets_branch
  ON branch_sales_targets(branch_id, period);
CREATE INDEX IF NOT EXISTS idx_branch_quota_history_branch
  ON branch_quota_history(branch_id, changed_at DESC);

-- Order customer portal
CREATE INDEX IF NOT EXISTS idx_order_customer_portals_token ON order_customer_portals(token);
CREATE INDEX IF NOT EXISTS idx_order_customer_portals_order ON order_customer_portals(order_id);


-- ============================================================================
-- SECTION 24: VIEWS & RPC FUNCTIONS
-- All idempotent (CREATE OR REPLACE). Source migrations are listed inline so
-- folding individual migration files into schema.sql stays traceable.
-- ============================================================================

-- ── 24a: Agent revenue rollup view ─────────────────────────────────────────
-- Source: database/agent_analytics_quotas.sql
-- Aggregates revenue, orders, customers per agent per (year, month).
-- Excludes Cancelled / Rejected / Draft orders. Resolves the agent via
-- COALESCE(orders.agent_id, customers.assigned_agent_id) so orders missing an
-- explicit agent still attribute to the customer's assigned agent.
CREATE OR REPLACE VIEW public.agent_revenue_by_period AS
SELECT
  COALESCE(o.agent_id, cu.assigned_agent_id)             AS agent_id,
  COALESCE(o.agent_name, e.employee_name)               AS agent_name,
  o.branch_id                                           AS branch_id,
  EXTRACT(YEAR  FROM o.order_date)::INT                 AS year,
  EXTRACT(MONTH FROM o.order_date)::INT                 AS month,
  COUNT(*)                                              AS order_count,
  -- Revenue: recorded payments when present; otherwise order total.
  COALESCE(SUM(CASE
    WHEN COALESCE(o.amount_paid, 0) > 0 THEN o.amount_paid
    ELSE COALESCE(o.total_amount, 0)
  END), 0)                                             AS revenue,
  COALESCE(SUM(o.total_amount), 0)                      AS gross_sales,
  COALESCE(SUM(o.amount_paid), 0)                       AS amount_paid,
  COALESCE(SUM(o.balance_due), 0)                       AS balance_due,
  COALESCE(AVG(NULLIF(o.discount_percent, 0)), 0)       AS avg_discount_percent,
  COUNT(DISTINCT o.customer_id)                         AS distinct_customers,
  COUNT(*) FILTER (WHERE o.payment_status = 'Overdue')  AS overdue_orders,
  COALESCE(SUM(o.balance_due) FILTER
    (WHERE o.payment_status = 'Overdue'), 0)            AS overdue_balance
FROM orders o
LEFT JOIN customers cu ON cu.id = o.customer_id
LEFT JOIN employees e  ON e.id  = COALESCE(o.agent_id, cu.assigned_agent_id)
WHERE o.status NOT IN ('Cancelled', 'Rejected', 'Draft')
  AND COALESCE(o.agent_id, cu.assigned_agent_id) IS NOT NULL
GROUP BY
  COALESCE(o.agent_id, cu.assigned_agent_id),
  COALESCE(o.agent_name, e.employee_name),
  o.branch_id,
  EXTRACT(YEAR  FROM o.order_date),
  EXTRACT(MONTH FROM o.order_date);

GRANT SELECT ON public.agent_revenue_by_period TO authenticated;

-- ── 24b: Upsert single agent target (with audit trail) ────────────────────
-- Source: database/agent_analytics_quotas.sql
CREATE OR REPLACE FUNCTION public.upsert_agent_target(
  p_employee_id    UUID,
  p_period         TEXT,
  p_monthly        NUMERIC DEFAULT NULL,
  p_quarterly      NUMERIC DEFAULT NULL,
  p_stretch        TEXT    DEFAULT NULL,
  p_note           TEXT    DEFAULT NULL,
  p_changed_by     TEXT    DEFAULT NULL,
  p_changed_name   TEXT    DEFAULT NULL
)
RETURNS agent_targets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing agent_targets%ROWTYPE;
  v_result   agent_targets%ROWTYPE;
BEGIN
  IF p_employee_id IS NULL OR p_period IS NULL THEN
    RAISE EXCEPTION 'employee_id and period are required';
  END IF;

  SELECT * INTO v_existing
  FROM agent_targets
  WHERE employee_id = p_employee_id AND period = p_period
  LIMIT 1;

  IF FOUND THEN
    UPDATE agent_targets
    SET
      monthly_sales_target   = COALESCE(p_monthly,   v_existing.monthly_sales_target),
      quarterly_sales_target = COALESCE(p_quarterly, v_existing.quarterly_sales_target),
      stretch_goal_status    = COALESCE(p_stretch,   v_existing.stretch_goal_status),
      updated_at             = NOW()
    WHERE id = v_existing.id
    RETURNING * INTO v_result;
  ELSE
    INSERT INTO agent_targets (
      employee_id, period,
      monthly_sales_target,
      quarterly_sales_target,
      stretch_goal_status
    ) VALUES (
      p_employee_id, p_period,
      COALESCE(p_monthly, 0),
      COALESCE(p_quarterly, 0),
      p_stretch
    )
    RETURNING * INTO v_result;
  END IF;

  INSERT INTO agent_quota_history (
    employee_id, period,
    prev_monthly, new_monthly,
    prev_quarterly, new_quarterly,
    prev_stretch,  new_stretch,
    note, changed_by_email, changed_by_name
  ) VALUES (
    p_employee_id, p_period,
    v_existing.monthly_sales_target,   v_result.monthly_sales_target,
    v_existing.quarterly_sales_target, v_result.quarterly_sales_target,
    v_existing.stretch_goal_status,    v_result.stretch_goal_status,
    p_note, p_changed_by, p_changed_name
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_agent_target(UUID, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_agent_target(UUID, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ── 24c: Bulk upsert agent targets ─────────────────────────────────────────
-- Source: database/agent_analytics_quotas.sql
CREATE OR REPLACE FUNCTION public.bulk_upsert_agent_targets(
  p_period       TEXT,
  p_rows         JSONB,
  p_note         TEXT DEFAULT NULL,
  p_changed_by   TEXT DEFAULT NULL,
  p_changed_name TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r       JSONB;
  v_count INT := 0;
BEGIN
  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'p_rows must be a JSON array';
  END IF;

  FOR r IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    PERFORM public.upsert_agent_target(
      (r->>'employeeId')::UUID,
      p_period,
      NULLIF(r->>'monthly','')::NUMERIC,
      NULLIF(r->>'quarterly','')::NUMERIC,
      NULLIF(r->>'stretch',''),
      p_note,
      p_changed_by,
      p_changed_name
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.bulk_upsert_agent_targets(TEXT, JSONB, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bulk_upsert_agent_targets(TEXT, JSONB, TEXT, TEXT, TEXT) TO authenticated;

-- ── 24c-branch: Upsert branch quota + mirror to all Sales Agents in branch ──
-- Source: database/branch_sales_targets.sql
CREATE OR REPLACE FUNCTION public.upsert_branch_sales_target(
  p_branch_id    UUID,
  p_period       TEXT,
  p_monthly      NUMERIC DEFAULT NULL,
  p_quarterly    NUMERIC DEFAULT NULL,
  p_stretch      TEXT    DEFAULT NULL,
  p_note         TEXT    DEFAULT NULL,
  p_changed_by   TEXT    DEFAULT NULL,
  p_changed_name TEXT    DEFAULT NULL
)
RETURNS branch_sales_targets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing branch_sales_targets%ROWTYPE;
  v_result   branch_sales_targets%ROWTYPE;
  v_payload  JSONB;
BEGIN
  IF p_branch_id IS NULL OR p_period IS NULL THEN
    RAISE EXCEPTION 'branch_id and period are required';
  END IF;

  SELECT * INTO v_existing
  FROM branch_sales_targets
  WHERE branch_id = p_branch_id AND period = p_period
  LIMIT 1;

  IF FOUND THEN
    UPDATE branch_sales_targets
    SET
      monthly_sales_target   = COALESCE(p_monthly, monthly_sales_target),
      quarterly_sales_target = COALESCE(p_quarterly, quarterly_sales_target),
      stretch_goal_status    = COALESCE(p_stretch, stretch_goal_status),
      updated_at             = NOW()
    WHERE id = v_existing.id
    RETURNING * INTO v_result;
  ELSE
    INSERT INTO branch_sales_targets (
      branch_id, period,
      monthly_sales_target,
      quarterly_sales_target,
      stretch_goal_status
    ) VALUES (
      p_branch_id, p_period,
      COALESCE(p_monthly, 0),
      COALESCE(p_quarterly, 0),
      p_stretch
    )
    RETURNING * INTO v_result;
  END IF;

  INSERT INTO branch_quota_history (
    branch_id, period,
    prev_monthly, new_monthly,
    prev_quarterly, new_quarterly,
    prev_stretch, new_stretch,
    note, changed_by_email, changed_by_name
  ) VALUES (
    p_branch_id, p_period,
    v_existing.monthly_sales_target, v_result.monthly_sales_target,
    v_existing.quarterly_sales_target, v_result.quarterly_sales_target,
    v_existing.stretch_goal_status, v_result.stretch_goal_status,
    p_note, p_changed_by, p_changed_name
  );

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'employeeId', e.id::text,
        'monthly', v_result.monthly_sales_target,
        'quarterly', v_result.quarterly_sales_target,
        'stretch', v_result.stretch_goal_status
      )
    ),
    '[]'::jsonb
  )
  INTO v_payload
  FROM employees e
  WHERE e.branch_id = p_branch_id
    AND e.role = 'Sales Agent'::employee_role
    AND e.status = 'active'::employee_status;

  IF jsonb_array_length(v_payload) > 0 THEN
    PERFORM public.bulk_upsert_agent_targets(
      p_period,
      v_payload,
      COALESCE(p_note, 'Synced from branch quota'),
      p_changed_by,
      p_changed_name
    );
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_branch_sales_target(UUID, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_branch_sales_target(UUID, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ── 24e: Send agent coaching nudge (creates an alert) ─────────────────────
-- Source: database/agent_analytics_quotas.sql
CREATE OR REPLACE FUNCTION public.send_agent_coaching_nudge(
  p_employee_id UUID,
  p_severity    TEXT,
  p_title       TEXT,
  p_message     TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_employee_id IS NULL THEN
    RAISE EXCEPTION 'employee_id is required';
  END IF;

  INSERT INTO agent_alerts (agent_id, severity, type, title, message, action_required)
  VALUES (
    p_employee_id,
    COALESCE(p_severity, 'Medium')::alert_severity,
    'Target Alert'::agent_alert_type,
    'Coaching: ' || COALESCE(p_title, 'Performance review'),
    COALESCE(p_message, 'A manager has flagged you for review.'),
    TRUE
  )
  RETURNING id INTO v_id;

  RETURN v_id;
EXCEPTION WHEN undefined_table OR undefined_column THEN
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.send_agent_coaching_nudge(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_agent_coaching_nudge(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- ── 24e: Expand per-line discounts breakdown ──────────────────────────────
-- Source: database/order_customer_portal_contacts.sql
CREATE OR REPLACE FUNCTION public.expand_order_line_discounts(
  p_qty INT,
  p_unit_price NUMERIC,
  p_discount_amount NUMERIC,
  p_breakdown JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_gross NUMERIC;
  v_running NUMERIC;
  v_elem JSONB;
  v_pct NUMERIC;
  v_after NUMERIC;
  v_amt NUMERIC;
  v_name TEXT;
  v_lines JSONB := '[]'::jsonb;
  v_from_breakdown NUMERIC := 0;
  v_unallocated NUMERIC;
BEGIN
  v_gross := COALESCE(p_qty, 0) * COALESCE(p_unit_price, 0);
  v_running := v_gross;

  IF p_breakdown IS NOT NULL AND jsonb_typeof(p_breakdown) = 'array' THEN
    FOR v_elem IN SELECT value FROM jsonb_array_elements(p_breakdown) AS t(value)
    LOOP
      v_name := NULLIF(trim(COALESCE(v_elem->>'name', '')), '');
      BEGIN
        v_pct := COALESCE(
          NULLIF(trim(COALESCE(v_elem->>'percentage', v_elem->>'percent', '')), '')::numeric,
          0
        );
      EXCEPTION WHEN OTHERS THEN
        v_pct := 0;
      END;
      IF v_pct > 0 AND v_running > 0 THEN
        v_after := v_running * (1 - v_pct / 100);
        v_amt := round(v_running - v_after, 2);
        IF v_amt > 0 THEN
          v_lines := v_lines || jsonb_build_array(jsonb_build_object(
            'name', COALESCE(v_name, 'Discount'),
            'percentage', v_pct,
            'amount', v_amt
          ));
          v_from_breakdown := v_from_breakdown + v_amt;
          v_running := v_after;
        END IF;
      END IF;
    END LOOP;
  END IF;

  v_unallocated := round(COALESCE(p_discount_amount, 0) - v_from_breakdown, 2);
  IF v_unallocated > 0.005 THEN
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'name', 'Discount',
      'amount', v_unallocated
    ));
  END IF;

  IF jsonb_array_length(v_lines) = 0 AND COALESCE(p_discount_amount, 0) > 0 THEN
    v_lines := jsonb_build_array(jsonb_build_object(
      'name', 'Discount',
      'amount', round(COALESCE(p_discount_amount, 0), 2)
    ));
  END IF;

  RETURN v_lines;
END;
$$;

-- ── 24f: Get public order summary by portal token ─────────────────────────
-- Source: database/order_customer_portal_contacts.sql (latest version)
CREATE OR REPLACE FUNCTION public.get_public_order_summary(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_portal   order_customer_portals%ROWTYPE;
  v_order    RECORD;
  v_customer RECORD;
  v_invoice  RECORD;
  v_company  RECORD;
  v_addr     TEXT;
  v_items    JSONB;
  v_trips    JSONB;
  v_activities JSONB;
  v_agent    JSONB;
  v_agent_core TEXT;
  v_driver   JSONB;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 8 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_token');
  END IF;

  SELECT * INTO v_portal
  FROM order_customer_portals
  WHERE token = trim(p_token);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_found');
  END IF;

  IF v_portal.expires_at IS NOT NULL AND v_portal.expires_at < NOW() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'expired');
  END IF;

  SELECT
    o.id,
    o.order_number,
    o.order_date,
    o.required_date,
    o.actual_delivery,
    o.status,
    o.payment_status,
    o.payment_terms,
    o.delivery_type,
    o.delivery_address,
    o.subtotal,
    o.discount_percent,
    o.discount_amount,
    o.tax_amount,
    o.total_amount,
    o.amount_paid,
    o.balance_due,
    o.invoice_date,
    o.due_date,
    o.order_notes,
    o.agent_id,
    o.agent_name,
    o.customer_name,
    o.customer_id,
    o.branch_id,
    b.name AS branch_name
  INTO v_order
  FROM orders o
  LEFT JOIN branches b ON b.id = o.branch_id
  WHERE o.id = v_portal.order_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'order_missing');
  END IF;

  IF v_order.status = 'Cancelled' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'cancelled');
  END IF;

  UPDATE order_customer_portals
  SET view_count = view_count + 1,
      last_viewed_at = NOW(),
      updated_at = NOW()
  WHERE id = v_portal.id;

  SELECT c.name, c.email, c.phone, c.address, c.city, c.province, c.postal_code, c.contact_person
  INTO v_customer
  FROM customers c
  WHERE c.id = v_order.customer_id;

  SELECT i.invoice_number, i.issue_date, i.due_date, i.payment_terms, i.notes
  INTO v_invoice
  FROM invoices i
  WHERE i.order_id = v_order.id
  ORDER BY i.created_at DESC
  LIMIT 1;

  SELECT cs.company_name, cs.primary_phone, cs.primary_email
  INTO v_company
  FROM company_settings cs
  WHERE cs.branch_id = v_order.branch_id
  LIMIT 1;

  SELECT trim(concat_ws(', ',
    NULLIF(ca.street, ''),
    NULLIF(ca.city, ''),
    NULLIF(ca.province, ''),
    NULLIF(ca.postal_code, '')
  ))
  INTO v_addr
  FROM company_addresses ca
  JOIN company_settings cs ON cs.id = ca.settings_id
  WHERE cs.branch_id = v_order.branch_id AND ca.is_primary = true
  LIMIT 1;

  v_agent := jsonb_build_object(
    'name', COALESCE(v_order.agent_name, ''),
    'phone', NULL,
    'email', NULL
  );

  v_agent_core := NULLIF(trim(v_order.agent_name), '');
  IF v_agent_core IS NOT NULL THEN
    IF NULLIF(trim(COALESCE(v_order.branch_name, '')), '') IS NOT NULL THEN
      v_agent_core := NULLIF(trim(regexp_replace(
        v_agent_core,
        '^' || regexp_replace(trim(v_order.branch_name), '([\[\].^$|?*+(){}\\])', '\\\1', 'g') || '\s*[-–—]\s*',
        '',
        'i'
      )), '');
    END IF;
    IF v_agent_core IS NOT NULL AND v_agent_core = trim(v_order.agent_name) THEN
      v_agent_core := NULLIF(trim(regexp_replace(v_agent_core, '^[^-–—]+[-–—]\s*', '', 'i')), '');
    END IF;
  END IF;

  SELECT jsonb_build_object(
    'name', COALESCE(e.employee_name, v_order.agent_name, ''),
    'phone', NULLIF(trim(COALESCE(eci.primary_phone, eci.secondary_phone, e.phone)), ''),
    'email', NULLIF(trim(COALESCE(eci.work_email, eci.personal_email, e.email)), '')
  )
  INTO v_agent
  FROM employees e
  LEFT JOIN employee_contact_info eci ON eci.employee_id = e.id
  WHERE (
      v_order.agent_id IS NOT NULL AND e.id = v_order.agent_id
    )
    OR (
      e.role = 'Sales Agent'
      AND (
        NULLIF(trim(v_order.agent_name), '') IS NOT NULL
        OR v_agent_core IS NOT NULL
      )
      AND (
        lower(trim(e.employee_name)) = lower(trim(v_order.agent_name))
        OR (v_agent_core IS NOT NULL AND lower(trim(e.employee_name)) = lower(v_agent_core))
        OR lower(trim(v_order.agent_name)) LIKE '%' || lower(trim(e.employee_name)) || '%'
        OR (v_agent_core IS NOT NULL AND lower(v_agent_core) LIKE '%' || lower(trim(e.employee_name)) || '%')
      )
    )
  ORDER BY
    CASE WHEN v_order.agent_id IS NOT NULL AND e.id = v_order.agent_id THEN 0 ELSE 1 END,
    CASE WHEN e.branch_id IS NOT DISTINCT FROM v_order.branch_id THEN 0 ELSE 1 END,
    CASE
      WHEN v_agent_core IS NOT NULL AND lower(trim(e.employee_name)) = lower(v_agent_core) THEN 0
      WHEN lower(trim(e.employee_name)) = lower(trim(COALESCE(v_order.agent_name, ''))) THEN 1
      ELSE 2
    END,
    length(COALESCE(eci.primary_phone, eci.secondary_phone, e.phone, '')) DESC,
    length(COALESCE(eci.work_email, eci.personal_email, e.email, '')) DESC
  LIMIT 1;

  IF v_agent IS NULL THEN
    v_agent := jsonb_build_object(
      'name', COALESCE(v_order.agent_name, ''),
      'phone', NULL,
      'email', NULL
    );
  ELSIF
    NULLIF(trim(COALESCE(v_agent->>'phone', '')), '') IS NULL
    AND NULLIF(trim(COALESCE(v_agent->>'email', '')), '') IS NULL
  THEN
    v_agent := jsonb_build_object(
      'name', COALESCE(v_agent->>'name', v_order.agent_name, ''),
      'phone', NULL,
      'email', NULL
    );
  END IF;

  v_driver := NULL;
  SELECT jsonb_build_object(
    'name', COALESCE(drv.employee_name, NULLIF(trim(t.driver_name), ''), ''),
    'phone', NULLIF(trim(COALESCE(drv_ci.primary_phone, drv_ci.secondary_phone, drv.phone)), ''),
    'email', NULLIF(trim(COALESCE(drv_ci.work_email, drv_ci.personal_email, drv.email)), ''),
    'vehicleName', NULLIF(trim(t.vehicle_name), ''),
    'tripNumber', t.trip_number,
    'status', t.status::text
  )
  INTO v_driver
  FROM trips t
  LEFT JOIN LATERAL (
    SELECT e.id, e.employee_name, e.email, e.phone
    FROM employees e
    WHERE (t.driver_id IS NOT NULL AND e.id = t.driver_id)
       OR (
         NULLIF(trim(t.driver_name), '') IS NOT NULL
         AND lower(trim(COALESCE(e.employee_name, ''))) = lower(trim(t.driver_name))
         AND e.user_role = 'Driver'::user_role
       )
    ORDER BY
      CASE WHEN t.driver_id IS NOT NULL AND e.id = t.driver_id THEN 0 ELSE 1 END,
      CASE WHEN e.status = 'active'::employee_status THEN 0 ELSE 1 END
    LIMIT 1
  ) drv ON true
  LEFT JOIN employee_contact_info drv_ci ON drv_ci.employee_id = drv.id
  WHERE v_order.id = ANY(t.order_ids)
    AND (
      t.driver_id IS NOT NULL
      OR NULLIF(trim(t.driver_name), '') IS NOT NULL
    )
  ORDER BY
    CASE
      WHEN v_order.status IN ('Delivered', 'Partially Fulfilled', 'Completed')
        AND t.status::text = 'Completed' THEN 1
      WHEN t.status::text = 'In Transit' THEN 2
      WHEN t.status::text = 'Loading' THEN 3
      WHEN t.status::text = 'Planned' THEN 4
      WHEN t.status::text = 'Pending' THEN 5
      WHEN t.status::text = 'Completed' THEN 6
      WHEN t.status::text = 'Delayed' THEN 7
      ELSE 10
    END,
    t.scheduled_date DESC NULLS LAST,
    t.updated_at DESC NULLS LAST,
    t.created_at DESC
  LIMIT 1;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'description', trim(concat_ws(' — ', NULLIF(oli.product_name, ''), NULLIF(oli.variant_description, ''))),
      'quantity', oli.quantity,
      'unitPrice', oli.unit_price,
      'discountAmount', COALESCE(oli.discount_amount, 0),
      'discountsBreakdown', COALESCE(oli.discounts_breakdown, '[]'::jsonb),
      'discountLines', public.expand_order_line_discounts(
        oli.quantity,
        oli.unit_price,
        oli.discount_amount,
        oli.discounts_breakdown
      ),
      'total', oli.line_total
    ) ORDER BY oli.created_at
  ), '[]'::jsonb)
  INTO v_items
  FROM order_line_items oli
  WHERE oli.order_id = v_order.id;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'tripNumber', t.trip_number,
      'driverName', COALESCE(drv.employee_name, t.driver_name, ''),
      'driverPhone', NULLIF(trim(COALESCE(drv_ci.primary_phone, drv_ci.secondary_phone, drv.phone)), ''),
      'driverEmail', NULLIF(trim(COALESCE(drv_ci.work_email, drv_ci.personal_email, drv.email)), ''),
      'vehicleName', COALESCE(t.vehicle_name, ''),
      'status', t.status,
      'scheduledDate', t.scheduled_date,
      'delayReason', t.delay_reason
    )
    ORDER BY t.scheduled_date DESC NULLS LAST
  ), '[]'::jsonb)
  INTO v_trips
  FROM trips t
  LEFT JOIN LATERAL (
    SELECT e.id, e.employee_name, e.email, e.phone
    FROM employees e
    WHERE (t.driver_id IS NOT NULL AND e.id = t.driver_id)
       OR (
         NULLIF(trim(t.driver_name), '') IS NOT NULL
         AND lower(trim(COALESCE(e.employee_name, ''))) = lower(trim(t.driver_name))
         AND e.user_role = 'Driver'::user_role
       )
    ORDER BY
      CASE WHEN t.driver_id IS NOT NULL AND e.id = t.driver_id THEN 0 ELSE 1 END,
      CASE WHEN e.status = 'active'::employee_status THEN 0 ELSE 1 END
    LIMIT 1
  ) drv ON true
  LEFT JOIN employee_contact_info drv_ci ON drv_ci.employee_id = drv.id
  WHERE v_order.id = ANY(t.order_ids);

  IF v_driver IS NULL OR NULLIF(trim(COALESCE(v_driver->>'name', '')), '') IS NULL THEN
    SELECT jsonb_build_object(
      'name', NULLIF(trim(trip_row->>'driverName'), ''),
      'phone', NULLIF(trim(trip_row->>'driverPhone'), ''),
      'email', NULLIF(trim(trip_row->>'driverEmail'), ''),
      'vehicleName', NULLIF(trim(trip_row->>'vehicleName'), ''),
      'tripNumber', NULLIF(trim(trip_row->>'tripNumber'), ''),
      'status', NULLIF(trim(trip_row->>'status'), '')
    )
    INTO v_driver
    FROM jsonb_array_elements(v_trips) AS trip_row
    WHERE NULLIF(trim(trip_row->>'driverName'), '') IS NOT NULL
    LIMIT 1;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'at', l.timestamp,
      'action', l.action::text,
      'description', l.description,
      'oldValue', l.old_value,
      'newValue', l.new_value,
      'metadata', l.metadata
    ) ORDER BY l.timestamp DESC
  ), '[]'::jsonb)
  INTO v_activities
  FROM order_logs l
  WHERE l.order_id = v_order.id
    AND (
      l.action::text IN (
        'created',
        'item_added', 'item_removed', 'item_quantity_changed', 'item_price_changed',
        'discount_applied',
        'status_changed', 'payment_status_changed',
        'approved', 'rejected', 'cancelled',
        'shipped', 'delivered',
        'payment_received', 'invoice_generated'
      )
      OR (
        l.action = 'proof_uploaded'
        AND COALESCE(l.description, '') ILIKE 'proof of delivery%'
      )
    )
    AND NOT (
      l.action = 'proof_uploaded'
      AND COALESCE(l.description, '') ILIKE '%payment%'
    );

  RETURN jsonb_build_object(
    'ok', true,
    'orderNumber', v_order.order_number,
    'orderDate', v_order.order_date,
    'requiredDate', v_order.required_date,
    'actualDelivery', v_order.actual_delivery,
    'status', v_order.status,
    'paymentStatus', v_order.payment_status,
    'paymentTerms', COALESCE(v_invoice.payment_terms::text, v_order.payment_terms::text),
    'deliveryType', v_order.delivery_type,
    'deliveryAddress', COALESCE(v_order.delivery_address, v_customer.address),
    'subtotal', v_order.subtotal,
    'discountPercent', v_order.discount_percent,
    'discountAmount', v_order.discount_amount,
    'taxAmount', v_order.tax_amount,
    'totalAmount', v_order.total_amount,
    'amountPaid', v_order.amount_paid,
    'balanceDue', v_order.balance_due,
    'invoiceNumber', v_invoice.invoice_number,
    'issueDate', COALESCE(v_invoice.issue_date, v_order.invoice_date),
    'dueDate', COALESCE(v_invoice.due_date, v_order.due_date),
    'orderNotes', v_order.order_notes,
    'invoiceNotes', v_invoice.notes,
    'agentName', COALESCE(v_agent->>'name', v_order.agent_name),
    'agent', v_agent,
    'assignedDriver', v_driver,
    'branchName', v_order.branch_name,
    'customer', jsonb_build_object(
      'name', COALESCE(v_customer.name, v_order.customer_name),
      'email', v_customer.email,
      'phone', v_customer.phone,
      'contactPerson', v_customer.contact_person,
      'address', trim(concat_ws(', ',
        NULLIF(v_customer.address, ''),
        NULLIF(v_customer.city, ''),
        NULLIF(v_customer.province, ''),
        NULLIF(v_customer.postal_code, '')
      ))
    ),
    'company', jsonb_build_object(
      'name', COALESCE(v_company.company_name, 'LAMTEX'),
      'phone', v_company.primary_phone,
      'email', v_company.primary_email,
      'address', v_addr
    ),
    'items', v_items,
    'trips', v_trips,
    'activities', v_activities
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_order_summary(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_order_summary(TEXT) TO anon, authenticated;

-- ── 24g: Get public per-line discount lines by token ───────────────────────
-- Source: database/public_order_discount_lines.sql
CREATE OR REPLACE FUNCTION public.get_public_order_discount_lines(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_portal order_customer_portals%ROWTYPE;
  v_lines  JSONB;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 8 THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT * INTO v_portal
  FROM order_customer_portals
  WHERE token = trim(p_token);

  IF NOT FOUND THEN
    RETURN '[]'::jsonb;
  END IF;

  IF v_portal.expires_at IS NOT NULL AND v_portal.expires_at < NOW() THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'description', trim(concat_ws(' — ',
        NULLIF(oli.product_name, ''),
        NULLIF(oli.variant_description, '')
      )),
      'sku', oli.sku,
      'quantity', oli.quantity,
      'unitPrice', oli.unit_price,
      'lineTotal', oli.line_total,
      'discountAmount', COALESCE(oli.discount_amount, 0),
      'discountsBreakdown', COALESCE(oli.discounts_breakdown, '[]'::jsonb)
    ) ORDER BY oli.created_at
  ), '[]'::jsonb)
  INTO v_lines
  FROM order_line_items oli
  WHERE oli.order_id = v_portal.order_id;

  RETURN v_lines;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_order_discount_lines(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_order_discount_lines(TEXT) TO anon, authenticated;

-- ── 24h: Executive RPC: create employee auth account ──────────────────────
-- Source: database/rpc_create_employee_auth_account.sql
-- Requires the pgcrypto extension under the "extensions" schema (Supabase default).
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.create_employee_auth_account(
  p_employee_id UUID,
  p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_is_exec BOOLEAN;
  v_email TEXT;
  v_auth_uid UUID;
  v_existing_link UUID;
  inst UUID := '00000000-0000-0000-0000-000000000000';
BEGIN
  IF v_caller IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.employees e
    WHERE e.auth_user_id = v_caller
      AND e.user_role IS NOT DISTINCT FROM 'Executive'::public.user_role
      AND e.status = 'active'
  )
  INTO v_is_exec;

  IF NOT COALESCE(v_is_exec, false) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT lower(trim(e.email)), e.auth_user_id
  INTO v_email, v_existing_link
  FROM public.employees e
  WHERE e.id = p_employee_id;

  IF v_email IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'employee_not_found');
  END IF;

  IF v_existing_link IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_linked');
  END IF;

  IF length(trim(COALESCE(p_password, ''))) < 8 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'password_too_short');
  END IF;

  SELECT u.id INTO v_auth_uid FROM auth.users u WHERE lower(trim(u.email)) = v_email LIMIT 1;

  IF v_auth_uid IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.employees e2
      WHERE e2.auth_user_id = v_auth_uid
        AND e2.id <> p_employee_id
    ) THEN
      RETURN jsonb_build_object('ok', false, 'error', 'auth_email_claimed');
    END IF;

    UPDATE auth.users
    SET
      encrypted_password = extensions.crypt(trim(p_password), extensions.gen_salt('bf')),
      updated_at = now()
    WHERE id = v_auth_uid;
  ELSE
    v_auth_uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin,
      confirmation_token, recovery_token,
      email_change_token_current, email_change_token_new, email_change,
      phone_change_token, phone_change, reauthentication_token
    )
    VALUES (
      v_auth_uid, inst, 'authenticated', 'authenticated', v_email,
      extensions.crypt(trim(p_password), extensions.gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false,
      '', '', '', '', '', '', '', ''
    );
  END IF;

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
  WHERE id = v_auth_uid;

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  SELECT
    v_auth_uid, v_auth_uid,
    jsonb_build_object('sub', v_auth_uid::text, 'email', v_email),
    'email', v_auth_uid::text,
    now(), now(), now()
  WHERE NOT EXISTS (
    SELECT 1 FROM auth.identities i WHERE i.user_id = v_auth_uid AND i.provider = 'email'
  );

  UPDATE public.employees
  SET auth_user_id = v_auth_uid, updated_at = now()
  WHERE id = p_employee_id;

  RETURN jsonb_build_object('ok', true, 'auth_user_id', v_auth_uid);
END;
$$;

REVOKE ALL ON FUNCTION public.create_employee_auth_account(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_employee_auth_account(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.create_employee_auth_account(UUID, TEXT) IS
  'Executive-only: create or link Supabase Auth login for an employee; sets employees.auth_user_id.';


-- ── 24i: Notify executives when an order is created ───────────────────────
CREATE OR REPLACE FUNCTION notify_executives_order_created(p_order_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  exec RECORD;
  branch_name TEXT;
  line_count INT;
  msg TEXT;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO o
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = o.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM order_line_items WHERE order_id = o.id;

  msg := format(
    'Order %s created by %s for %s — %s item(s), total ₱%s',
    o.order_number,
    COALESCE(o.agent_name, 'Unknown agent'),
    COALESCE(o.customer_name, 'Unknown customer'),
    line_count,
    to_char(COALESCE(o.total_amount, 0), 'FM999,999,990.00')
  );

  FOR exec IN
    SELECT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Executive'::user_role
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      exec.auth_user_id,
      'Approvals'::notification_category,
      'New order created',
      msg,
      o.urgency IN ('High'::urgency_level, 'Critical'::urgency_level),
      '/orders/' || o.id::text,
      'View order',
      o.branch_id,
      jsonb_build_object(
        'orderId', o.id,
        'orderNumber', o.order_number,
        'customerName', o.customer_name,
        'agentName', o.agent_name,
        'branchName', branch_name,
        'totalAmount', o.total_amount,
        'subtotal', o.subtotal,
        'lineCount', line_count,
        'status', o.status,
        'requiredDate', o.required_date,
        'deliveryAddress', o.delivery_address,
        'urgency', o.urgency
      ),
      'order_created'
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_executives_order_created(UUID) TO authenticated;

COMMENT ON FUNCTION notify_executives_order_created(UUID) IS
  'Fan-out in-app notification to all active Executive users when an order is created.';


-- ── 24j: Notify executives when an order is submitted for approval ──────────
CREATE OR REPLACE FUNCTION notify_executives_order_submitted_for_approval(p_order_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  exec RECORD;
  branch_name TEXT;
  line_count INT;
  msg TEXT;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO o
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF o.status IS DISTINCT FROM 'Pending'::order_status THEN
    RAISE EXCEPTION 'Order % is not Pending (current: %)', o.order_number, o.status;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = o.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM order_line_items WHERE order_id = o.id;

  msg := format(
    'Order %s submitted for approval by %s — %s for %s item(s), total ₱%s',
    o.order_number,
    COALESCE(o.agent_name, 'Unknown agent'),
    COALESCE(o.customer_name, 'Unknown customer'),
    line_count,
    to_char(COALESCE(o.total_amount, 0), 'FM999,999,990.00')
  );

  FOR exec IN
    SELECT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Executive'::user_role
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      exec.auth_user_id,
      'Approvals'::notification_category,
      'Order awaiting approval',
      msg,
      o.urgency IN ('High'::urgency_level, 'Critical'::urgency_level),
      '/orders/' || o.id::text,
      'Review order',
      o.branch_id,
      jsonb_build_object(
        'orderId', o.id,
        'orderNumber', o.order_number,
        'customerName', o.customer_name,
        'agentName', o.agent_name,
        'branchName', branch_name,
        'totalAmount', o.total_amount,
        'subtotal', o.subtotal,
        'lineCount', line_count,
        'status', o.status,
        'requiredDate', o.required_date,
        'deliveryAddress', o.delivery_address,
        'urgency', o.urgency,
        'discountPercent', o.discount_percent
      ),
      'order_submitted_for_approval'
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_executives_order_submitted_for_approval(UUID) TO authenticated;

COMMENT ON FUNCTION notify_executives_order_submitted_for_approval(UUID) IS
  'Fan-out in-app notification to all active Executive users when an order is submitted for approval.';


-- ── 24k: Notify agent when order is approved or rejected ────────────────────
CREATE OR REPLACE FUNCTION notify_agent_order_approved(
  p_order_id UUID,
  p_decided_by TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  agent RECORD;
  branch_name TEXT;
  line_count INT;
  msg TEXT;
BEGIN
  SELECT *
  INTO o
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF o.status IS DISTINCT FROM 'Approved'::order_status THEN
    RAISE EXCEPTION 'Order % is not Approved (current: %)', o.order_number, o.status;
  END IF;

  IF o.agent_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT e.auth_user_id, e.employee_name
  INTO agent
  FROM employees e
  WHERE e.id = o.agent_id
    AND e.status = 'active'::employee_status
    AND e.auth_user_id IS NOT NULL;

  IF agent.auth_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = o.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM order_line_items WHERE order_id = o.id;

  msg := format(
    'Order %s for %s was approved%s — total ₱%s',
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    CASE WHEN p_decided_by IS NOT NULL AND trim(p_decided_by) <> '' THEN format(' by %s', p_decided_by) ELSE '' END,
    to_char(COALESCE(o.total_amount, 0), 'FM999,999,990.00')
  );

  INSERT INTO notifications (
    user_id,
    category,
    title,
    message,
    urgent,
    action_url,
    action_label,
    branch_id,
    metadata,
    event_type
  ) VALUES (
    agent.auth_user_id,
    'Approvals'::notification_category,
    'Order approved',
    msg,
    false,
    '/orders/' || o.id::text,
    'View order',
    o.branch_id,
    jsonb_build_object(
      'orderId', o.id,
      'orderNumber', o.order_number,
      'customerName', o.customer_name,
      'agentName', o.agent_name,
      'branchName', branch_name,
      'totalAmount', o.total_amount,
      'subtotal', o.subtotal,
      'lineCount', line_count,
      'status', o.status,
      'decidedBy', p_decided_by,
      'requiredDate', o.required_date,
      'urgency', o.urgency
    ),
    'order_approved'
  );

  RETURN 1;
END;
$$;

CREATE OR REPLACE FUNCTION notify_agent_order_rejected(
  p_order_id UUID,
  p_decided_by TEXT DEFAULT NULL,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  agent RECORD;
  branch_name TEXT;
  line_count INT;
  msg TEXT;
BEGIN
  SELECT *
  INTO o
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF o.status IS DISTINCT FROM 'Rejected'::order_status THEN
    RAISE EXCEPTION 'Order % is not Rejected (current: %)', o.order_number, o.status;
  END IF;

  IF o.agent_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT e.auth_user_id, e.employee_name
  INTO agent
  FROM employees e
  WHERE e.id = o.agent_id
    AND e.status = 'active'::employee_status
    AND e.auth_user_id IS NOT NULL;

  IF agent.auth_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = o.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM order_line_items WHERE order_id = o.id;

  msg := format(
    'Order %s for %s was rejected%s%s',
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    CASE WHEN p_decided_by IS NOT NULL AND trim(p_decided_by) <> '' THEN format(' by %s', p_decided_by) ELSE '' END,
    CASE
      WHEN p_rejection_reason IS NOT NULL AND trim(p_rejection_reason) <> ''
      THEN format('. Reason: %s', p_rejection_reason)
      ELSE ''
    END
  );

  INSERT INTO notifications (
    user_id,
    category,
    title,
    message,
    urgent,
    action_url,
    action_label,
    branch_id,
    metadata,
    event_type
  ) VALUES (
    agent.auth_user_id,
    'Approvals'::notification_category,
    'Order rejected',
    msg,
    true,
    '/orders/' || o.id::text,
    'View order',
    o.branch_id,
    jsonb_build_object(
      'orderId', o.id,
      'orderNumber', o.order_number,
      'customerName', o.customer_name,
      'agentName', o.agent_name,
      'branchName', branch_name,
      'totalAmount', o.total_amount,
      'subtotal', o.subtotal,
      'lineCount', line_count,
      'status', o.status,
      'decidedBy', p_decided_by,
      'rejectionReason', p_rejection_reason,
      'requiredDate', o.required_date,
      'urgency', o.urgency
    ),
    'order_rejected'
  );

  RETURN 1;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_agent_order_approved(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_agent_order_rejected(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION notify_agent_order_approved(UUID, TEXT) IS
  'In-app notification to the assigned agent when their order is approved.';
COMMENT ON FUNCTION notify_agent_order_rejected(UUID, TEXT, TEXT) IS
  'In-app notification to the assigned agent when their order is rejected.';


-- ── 24k2: Notify branch logistics when order is approved & ready to schedule ─
CREATE OR REPLACE FUNCTION notify_branch_logistics_order_ready_for_schedule(
  p_order_id UUID,
  p_approved_by TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  logist RECORD;
  branch_name TEXT;
  line_count INT;
  msg TEXT;
  action_path TEXT;
  action_lbl TEXT;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO o
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF o.status IS DISTINCT FROM 'Approved'::order_status THEN
    RAISE EXCEPTION 'Order % is not Approved (current: %)', o.order_number, o.status;
  END IF;

  IF o.branch_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = o.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM order_line_items WHERE order_id = o.id;

  IF o.delivery_type = 'Ship'::delivery_type THEN
    action_path := '/logistics?order=' || o.id::text || '&tab=dispatch&mode=interisland';
    action_lbl := 'Schedule shipment';
  ELSE
    action_path := '/logistics?order=' || o.id::text || '&tab=routes';
    action_lbl := 'Plan route';
  END IF;

  msg := format(
    'Order %s for %s was approved%s — ready to schedule (%s item(s), total ₱%s)',
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    CASE WHEN p_approved_by IS NOT NULL AND trim(p_approved_by) <> '' THEN format(' by %s', p_approved_by) ELSE '' END,
    line_count,
    to_char(COALESCE(o.total_amount, 0), 'FM999,999,990.00')
  );

  FOR logist IN
    SELECT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Logistics'::user_role
      AND e.branch_id = o.branch_id
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      logist.auth_user_id,
      'Delivery'::notification_category,
      'Order ready to schedule',
      msg,
      o.urgency IN ('High'::urgency_level, 'Critical'::urgency_level),
      action_path,
      action_lbl,
      o.branch_id,
      jsonb_build_object(
        'orderId', o.id,
        'orderNumber', o.order_number,
        'customerName', o.customer_name,
        'agentName', o.agent_name,
        'branchName', branch_name,
        'totalAmount', o.total_amount,
        'subtotal', o.subtotal,
        'lineCount', line_count,
        'status', o.status,
        'approvedBy', p_approved_by,
        'requiredDate', o.required_date,
        'deliveryAddress', o.delivery_address,
        'deliveryType', o.delivery_type,
        'urgency', o.urgency
      ),
      'order_ready_for_schedule'
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_branch_logistics_order_ready_for_schedule(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION notify_branch_logistics_order_ready_for_schedule(UUID, TEXT) IS
  'Fan-out in-app notification to active Logistics staff at the order branch when an order is approved and ready to schedule.';


-- ── 24k-b: Notify branch logistics when an order is marked Loading ───────────
CREATE OR REPLACE FUNCTION notify_branch_logistics_order_loading(
  p_order_id UUID,
  p_marked_by TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  logist RECORD;
  branch_name TEXT;
  line_count INT;
  msg TEXT;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO o
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF o.status IS DISTINCT FROM 'Loading'::order_status THEN
    RAISE EXCEPTION 'Order % is not Loading (current: %)', o.order_number, o.status;
  END IF;

  IF o.branch_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = o.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM order_line_items WHERE order_id = o.id;

  msg := format(
    'Order %s for %s is now loading at the warehouse%s (%s item(s), total ₱%s)',
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    CASE WHEN p_marked_by IS NOT NULL AND trim(p_marked_by) <> '' THEN format(' — started by %s', p_marked_by) ELSE '' END,
    line_count,
    to_char(COALESCE(o.total_amount, 0), 'FM999,999,990.00')
  );

  FOR logist IN
    SELECT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Logistics'::user_role
      AND e.branch_id = o.branch_id
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      logist.auth_user_id,
      'Delivery'::notification_category,
      'Order loading started',
      msg,
      o.urgency IN ('High'::urgency_level, 'Critical'::urgency_level),
      '/logistics?order=' || o.id::text || '&tab=routes',
      'View in logistics',
      o.branch_id,
      jsonb_build_object(
        'orderId', o.id,
        'orderNumber', o.order_number,
        'customerName', o.customer_name,
        'agentName', o.agent_name,
        'branchName', branch_name,
        'totalAmount', o.total_amount,
        'subtotal', o.subtotal,
        'lineCount', line_count,
        'status', o.status,
        'markedBy', p_marked_by,
        'requiredDate', o.required_date,
        'scheduledDepartureDate', o.scheduled_departure_date,
        'deliveryAddress', o.delivery_address,
        'deliveryType', o.delivery_type,
        'urgency', o.urgency
      ),
      'order_loading'
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_branch_logistics_order_loading(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION notify_branch_logistics_order_loading(UUID, TEXT) IS
  'Fan-out in-app notification to active Logistics staff at the order branch when an order is marked Loading.';


-- ── 24k-c: Notify logistics and agent when an order is marked Packed ───────────
CREATE OR REPLACE FUNCTION notify_order_packed(
  p_order_id UUID,
  p_marked_by TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  recipient RECORD;
  branch_name TEXT;
  line_count INT;
  msg_logistics TEXT;
  msg_agent TEXT;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO o
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF o.status IS DISTINCT FROM 'Packed'::order_status THEN
    RAISE EXCEPTION 'Order % is not Packed (current: %)', o.order_number, o.status;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = o.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM order_line_items WHERE order_id = o.id;

  msg_logistics := format(
    'Order %s for %s is packed and ready for dispatch%s (%s item(s), total ₱%s)',
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    CASE WHEN p_marked_by IS NOT NULL AND trim(p_marked_by) <> '' THEN format(' — packed by %s', p_marked_by) ELSE '' END,
    line_count,
    to_char(COALESCE(o.total_amount, 0), 'FM999,999,990.00')
  );

  msg_agent := format(
    'Order %s for %s has been packed%s — ready for dispatch',
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    CASE WHEN p_marked_by IS NOT NULL AND trim(p_marked_by) <> '' THEN format(' by %s', p_marked_by) ELSE '' END
  );

  IF o.branch_id IS NOT NULL THEN
    FOR recipient IN
      SELECT e.auth_user_id
      FROM employees e
      WHERE e.user_role = 'Logistics'::user_role
        AND e.branch_id = o.branch_id
        AND e.auth_user_id IS NOT NULL
        AND e.status = 'active'::employee_status
    LOOP
      INSERT INTO notifications (
        user_id,
        category,
        title,
        message,
        urgent,
        action_url,
        action_label,
        branch_id,
        metadata,
        event_type
      ) VALUES (
        recipient.auth_user_id,
        'Delivery'::notification_category,
        'Order packed',
        msg_logistics,
        o.urgency IN ('High'::urgency_level, 'Critical'::urgency_level),
        '/logistics?order=' || o.id::text || '&tab=routes',
        'View in logistics',
        o.branch_id,
        jsonb_build_object(
          'orderId', o.id,
          'orderNumber', o.order_number,
          'customerName', o.customer_name,
          'agentName', o.agent_name,
          'branchName', branch_name,
          'totalAmount', o.total_amount,
          'subtotal', o.subtotal,
          'lineCount', line_count,
          'status', o.status,
          'markedBy', p_marked_by,
          'requiredDate', o.required_date,
          'scheduledDepartureDate', o.scheduled_departure_date,
          'deliveryAddress', o.delivery_address,
          'deliveryType', o.delivery_type,
          'urgency', o.urgency
        ),
        'order_packed'
      );
      inserted := inserted + 1;
    END LOOP;
  END IF;

  IF o.agent_id IS NOT NULL THEN
    SELECT e.auth_user_id
    INTO recipient
    FROM employees e
    WHERE e.id = o.agent_id
      AND e.status = 'active'::employee_status
      AND e.auth_user_id IS NOT NULL;

    IF recipient.auth_user_id IS NOT NULL THEN
      INSERT INTO notifications (
        user_id,
        category,
        title,
        message,
        urgent,
        action_url,
        action_label,
        branch_id,
        metadata,
        event_type
      ) VALUES (
        recipient.auth_user_id,
        'Delivery'::notification_category,
        'Order packed',
        msg_agent,
        false,
        '/orders/' || o.id::text,
        'View order',
        o.branch_id,
        jsonb_build_object(
          'orderId', o.id,
          'orderNumber', o.order_number,
          'customerName', o.customer_name,
          'agentName', o.agent_name,
          'branchName', branch_name,
          'totalAmount', o.total_amount,
          'subtotal', o.subtotal,
          'lineCount', line_count,
          'status', o.status,
          'markedBy', p_marked_by,
          'requiredDate', o.required_date,
          'scheduledDepartureDate', o.scheduled_departure_date,
          'deliveryAddress', o.delivery_address,
          'deliveryType', o.delivery_type,
          'urgency', o.urgency
        ),
        'order_packed'
      );
      inserted := inserted + 1;
    END IF;
  END IF;

  RETURN inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_order_packed(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION notify_order_packed(UUID, TEXT) IS
  'Fan-out in-app notification to branch Logistics staff and the assigned agent when an order is marked Packed.';


-- ── 24k-d: Notify executives, warehouse, and agent when an order is In Transit ─
CREATE OR REPLACE FUNCTION notify_order_in_transit(
  p_order_id UUID,
  p_marked_by TEXT DEFAULT NULL,
  p_trip_number TEXT DEFAULT NULL,
  p_vehicle_name TEXT DEFAULT NULL,
  p_driver_name TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  recipient RECORD;
  branch_name TEXT;
  line_count INT;
  trip_suffix TEXT;
  dispatch_suffix TEXT;
  msg_exec TEXT;
  msg_wh TEXT;
  msg_agent TEXT;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO o
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF o.status IS DISTINCT FROM 'In Transit'::order_status THEN
    RAISE EXCEPTION 'Order % is not In Transit (current: %)', o.order_number, o.status;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = o.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM order_line_items WHERE order_id = o.id;

  trip_suffix := CASE
    WHEN p_trip_number IS NOT NULL AND trim(p_trip_number) <> '' THEN
      format(' (trip %s)', trim(p_trip_number))
    ELSE ''
  END;

  dispatch_suffix := CASE
    WHEN p_marked_by IS NOT NULL AND trim(p_marked_by) <> '' THEN format(' by %s', p_marked_by)
    ELSE ''
  END;

  msg_exec := format(
    'Order %s for %s is in transit%s%s — %s item(s), total ₱%s',
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    trip_suffix,
    dispatch_suffix,
    line_count,
    to_char(COALESCE(o.total_amount, 0), 'FM999,999,990.00')
  );

  msg_wh := format(
    'Order %s for %s has departed and is in transit%s%s',
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    trip_suffix,
    dispatch_suffix
  );

  msg_agent := format(
    'Order %s for %s is now in transit%s%s',
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    trip_suffix,
    dispatch_suffix
  );

  FOR recipient IN
    SELECT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Executive'::user_role
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      recipient.auth_user_id,
      'Delivery'::notification_category,
      'Order in transit',
      msg_exec,
      o.urgency IN ('High'::urgency_level, 'Critical'::urgency_level),
      '/orders/' || o.id::text,
      'View order',
      o.branch_id,
      jsonb_build_object(
        'orderId', o.id,
        'orderNumber', o.order_number,
        'customerName', o.customer_name,
        'agentName', o.agent_name,
        'branchName', branch_name,
        'totalAmount', o.total_amount,
        'subtotal', o.subtotal,
        'lineCount', line_count,
        'status', o.status,
        'markedBy', p_marked_by,
        'tripNumber', p_trip_number,
        'vehicleName', p_vehicle_name,
        'driverName', p_driver_name,
        'requiredDate', o.required_date,
        'scheduledDepartureDate', o.scheduled_departure_date,
        'deliveryAddress', o.delivery_address,
        'deliveryType', o.delivery_type,
        'urgency', o.urgency
      ),
      'order_in_transit'
    );
    inserted := inserted + 1;
  END LOOP;

  IF o.branch_id IS NOT NULL THEN
    FOR recipient IN
      SELECT e.auth_user_id
      FROM employees e
      WHERE e.user_role = 'Warehouse'::user_role
        AND e.branch_id = o.branch_id
        AND e.auth_user_id IS NOT NULL
        AND e.status = 'active'::employee_status
    LOOP
      INSERT INTO notifications (
        user_id,
        category,
        title,
        message,
        urgent,
        action_url,
        action_label,
        branch_id,
        metadata,
        event_type
      ) VALUES (
        recipient.auth_user_id,
        'Delivery'::notification_category,
        'Order departed — in transit',
        msg_wh,
        o.urgency IN ('High'::urgency_level, 'Critical'::urgency_level),
        '/orders/' || o.id::text,
        'View order',
        o.branch_id,
        jsonb_build_object(
          'orderId', o.id,
          'orderNumber', o.order_number,
          'customerName', o.customer_name,
          'agentName', o.agent_name,
          'branchName', branch_name,
          'totalAmount', o.total_amount,
          'subtotal', o.subtotal,
          'lineCount', line_count,
          'status', o.status,
          'markedBy', p_marked_by,
          'tripNumber', p_trip_number,
          'vehicleName', p_vehicle_name,
          'driverName', p_driver_name,
          'requiredDate', o.required_date,
          'scheduledDepartureDate', o.scheduled_departure_date,
          'deliveryAddress', o.delivery_address,
          'deliveryType', o.delivery_type,
          'urgency', o.urgency
        ),
        'order_in_transit'
      );
      inserted := inserted + 1;
    END LOOP;
  END IF;

  IF o.agent_id IS NOT NULL THEN
    SELECT e.auth_user_id
    INTO recipient
    FROM employees e
    WHERE e.id = o.agent_id
      AND e.status = 'active'::employee_status
      AND e.auth_user_id IS NOT NULL;

    IF recipient.auth_user_id IS NOT NULL THEN
      INSERT INTO notifications (
        user_id,
        category,
        title,
        message,
        urgent,
        action_url,
        action_label,
        branch_id,
        metadata,
        event_type
      ) VALUES (
        recipient.auth_user_id,
        'Delivery'::notification_category,
        'Customer order in transit',
        msg_agent,
        o.urgency IN ('High'::urgency_level, 'Critical'::urgency_level),
        '/orders/' || o.id::text,
        'View order',
        o.branch_id,
        jsonb_build_object(
          'orderId', o.id,
          'orderNumber', o.order_number,
          'customerName', o.customer_name,
          'agentName', o.agent_name,
          'branchName', branch_name,
          'totalAmount', o.total_amount,
          'subtotal', o.subtotal,
          'lineCount', line_count,
          'status', o.status,
          'markedBy', p_marked_by,
          'tripNumber', p_trip_number,
          'vehicleName', p_vehicle_name,
          'driverName', p_driver_name,
          'requiredDate', o.required_date,
          'scheduledDepartureDate', o.scheduled_departure_date,
          'deliveryAddress', o.delivery_address,
          'deliveryType', o.delivery_type,
          'urgency', o.urgency
        ),
        'order_in_transit'
      );
      inserted := inserted + 1;
    END IF;
  END IF;

  RETURN inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_order_in_transit(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION notify_order_in_transit(UUID, TEXT, TEXT, TEXT, TEXT) IS
  'Fan-out in-app notification to executives, branch warehouse staff, and the assigned agent when an order is In Transit.';


-- ── 24k-e: Notify executives and agent when delivery is recorded ─────────────
CREATE OR REPLACE FUNCTION notify_order_delivery_recorded(
  p_order_id UUID,
  p_recorded_by TEXT DEFAULT NULL,
  p_trip_number TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  recipient RECORD;
  branch_name TEXT;
  line_count INT;
  trip_suffix TEXT;
  recorded_suffix TEXT;
  msg_exec TEXT;
  msg_agent TEXT;
  title_exec TEXT;
  title_agent TEXT;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO o
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF o.status NOT IN ('Delivered'::order_status, 'Partially Fulfilled'::order_status) THEN
    RAISE EXCEPTION 'Order % delivery not recorded (current: %)', o.order_number, o.status;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = o.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM order_line_items WHERE order_id = o.id;

  trip_suffix := CASE
    WHEN p_trip_number IS NOT NULL AND trim(p_trip_number) <> '' THEN
      format(' (trip %s)', trim(p_trip_number))
    ELSE ''
  END;

  recorded_suffix := CASE
    WHEN p_recorded_by IS NOT NULL AND trim(p_recorded_by) <> '' THEN format(' by %s', p_recorded_by)
    ELSE ''
  END;

  IF o.status = 'Delivered'::order_status THEN
    title_exec := 'Order delivered';
    title_agent := 'Customer order delivered';
    msg_exec := format(
      'Order %s for %s was fully delivered%s%s — %s item(s), total ₱%s',
      o.order_number,
      COALESCE(o.customer_name, 'Unknown customer'),
      trip_suffix,
      recorded_suffix,
      line_count,
      to_char(COALESCE(o.total_amount, 0), 'FM999,999,990.00')
    );
    msg_agent := format(
      'Order %s for %s was fully delivered%s%s',
      o.order_number,
      COALESCE(o.customer_name, 'Unknown customer'),
      trip_suffix,
      recorded_suffix
    );
  ELSE
    title_exec := 'Partial delivery recorded';
    title_agent := 'Partial delivery recorded';
    msg_exec := format(
      'Partial delivery recorded for order %s (%s)%s%s — %s item(s), total ₱%s',
      o.order_number,
      COALESCE(o.customer_name, 'Unknown customer'),
      trip_suffix,
      recorded_suffix,
      line_count,
      to_char(COALESCE(o.total_amount, 0), 'FM999,999,990.00')
    );
    msg_agent := format(
      'Partial delivery recorded for order %s for %s%s%s',
      o.order_number,
      COALESCE(o.customer_name, 'Unknown customer'),
      trip_suffix,
      recorded_suffix
    );
  END IF;

  FOR recipient IN
    SELECT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Executive'::user_role
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      recipient.auth_user_id,
      'Delivery'::notification_category,
      title_exec,
      msg_exec,
      false,
      '/orders/' || o.id::text,
      'View order',
      o.branch_id,
      jsonb_build_object(
        'orderId', o.id,
        'orderNumber', o.order_number,
        'customerName', o.customer_name,
        'agentName', o.agent_name,
        'branchName', branch_name,
        'totalAmount', o.total_amount,
        'subtotal', o.subtotal,
        'lineCount', line_count,
        'status', o.status,
        'recordedBy', p_recorded_by,
        'tripNumber', p_trip_number,
        'actualDelivery', o.actual_delivery,
        'requiredDate', o.required_date,
        'deliveryAddress', o.delivery_address,
        'deliveryType', o.delivery_type,
        'urgency', o.urgency
      ),
      'order_delivery_recorded'
    );
    inserted := inserted + 1;
  END LOOP;

  IF o.agent_id IS NOT NULL THEN
    SELECT e.auth_user_id
    INTO recipient
    FROM employees e
    WHERE e.id = o.agent_id
      AND e.status = 'active'::employee_status
      AND e.auth_user_id IS NOT NULL;

    IF recipient.auth_user_id IS NOT NULL THEN
      INSERT INTO notifications (
        user_id,
        category,
        title,
        message,
        urgent,
        action_url,
        action_label,
        branch_id,
        metadata,
        event_type
      ) VALUES (
        recipient.auth_user_id,
        'Delivery'::notification_category,
        title_agent,
        msg_agent,
        false,
        '/orders/' || o.id::text,
        'View order',
        o.branch_id,
        jsonb_build_object(
          'orderId', o.id,
          'orderNumber', o.order_number,
          'customerName', o.customer_name,
          'agentName', o.agent_name,
          'branchName', branch_name,
          'totalAmount', o.total_amount,
          'subtotal', o.subtotal,
          'lineCount', line_count,
          'status', o.status,
          'recordedBy', p_recorded_by,
          'tripNumber', p_trip_number,
          'actualDelivery', o.actual_delivery,
          'requiredDate', o.required_date,
          'deliveryAddress', o.delivery_address,
          'deliveryType', o.delivery_type,
          'urgency', o.urgency
        ),
        'order_delivery_recorded'
      );
      inserted := inserted + 1;
    END IF;
  END IF;

  RETURN inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_order_delivery_recorded(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION notify_order_delivery_recorded(UUID, TEXT, TEXT) IS
  'Fan-out in-app notification to executives and the assigned agent when delivery is recorded (Delivered or Partially Fulfilled).';


-- ── 24k-f: Notify agent when delivery proof is uploaded (not by the agent) ───
CREATE OR REPLACE FUNCTION notify_agent_order_delivery_proof_uploaded(
  p_order_id UUID,
  p_uploaded_by TEXT DEFAULT NULL,
  p_uploader_employee_id UUID DEFAULT NULL,
  p_proof_count INT DEFAULT 1
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  agent RECORD;
  branch_name TEXT;
  line_count INT;
  proof_label TEXT;
  uploaded_suffix TEXT;
  msg TEXT;
BEGIN
  SELECT *
  INTO o
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF o.agent_id IS NULL THEN
    RETURN 0;
  END IF;

  IF p_uploader_employee_id IS NOT NULL AND p_uploader_employee_id = o.agent_id THEN
    RETURN 0;
  END IF;

  SELECT e.auth_user_id, e.employee_name
  INTO agent
  FROM employees e
  WHERE e.id = o.agent_id
    AND e.status = 'active'::employee_status
    AND e.auth_user_id IS NOT NULL;

  IF agent.auth_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = o.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM order_line_items WHERE order_id = o.id;

  proof_label := CASE
    WHEN COALESCE(p_proof_count, 1) <= 1 THEN '1 delivery proof'
    ELSE format('%s delivery proofs', COALESCE(p_proof_count, 1))
  END;

  uploaded_suffix := CASE
    WHEN p_uploaded_by IS NOT NULL AND trim(p_uploaded_by) <> '' THEN format(' by %s', p_uploaded_by)
    ELSE ''
  END;

  msg := format(
    '%s uploaded for order %s (%s)%s',
    proof_label,
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    uploaded_suffix
  );

  INSERT INTO notifications (
    user_id,
    category,
    title,
    message,
    urgent,
    action_url,
    action_label,
    branch_id,
    metadata,
    event_type
  ) VALUES (
    agent.auth_user_id,
    'Delivery'::notification_category,
    'Delivery proof uploaded',
    msg,
    false,
    '/orders/' || o.id::text,
    'View order',
    o.branch_id,
    jsonb_build_object(
      'orderId', o.id,
      'orderNumber', o.order_number,
      'customerName', o.customer_name,
      'agentName', o.agent_name,
      'branchName', branch_name,
      'totalAmount', o.total_amount,
      'subtotal', o.subtotal,
      'lineCount', line_count,
      'status', o.status,
      'uploadedBy', p_uploaded_by,
      'proofCount', COALESCE(p_proof_count, 1),
      'requiredDate', o.required_date,
      'deliveryAddress', o.delivery_address,
      'deliveryType', o.delivery_type,
      'urgency', o.urgency
    ),
    'order_delivery_proof_uploaded'
  );

  RETURN 1;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_agent_order_delivery_proof_uploaded(UUID, TEXT, UUID, INT) TO authenticated;

COMMENT ON FUNCTION notify_agent_order_delivery_proof_uploaded(UUID, TEXT, UUID, INT) IS
  'In-app notification to the assigned agent when delivery proof is uploaded, skipped when the uploader is that agent.';


-- ── 24k-g: Notify agent when other order proof is uploaded (not by the agent) ─
CREATE OR REPLACE FUNCTION notify_agent_order_other_proof_uploaded(
  p_order_id UUID,
  p_uploaded_by TEXT DEFAULT NULL,
  p_uploader_employee_id UUID DEFAULT NULL,
  p_proof_count INT DEFAULT 1
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  agent RECORD;
  branch_name TEXT;
  line_count INT;
  proof_label TEXT;
  uploaded_suffix TEXT;
  msg TEXT;
BEGIN
  SELECT *
  INTO o
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF o.agent_id IS NULL THEN
    RETURN 0;
  END IF;

  IF p_uploader_employee_id IS NOT NULL AND p_uploader_employee_id = o.agent_id THEN
    RETURN 0;
  END IF;

  SELECT e.auth_user_id, e.employee_name
  INTO agent
  FROM employees e
  WHERE e.id = o.agent_id
    AND e.status = 'active'::employee_status
    AND e.auth_user_id IS NOT NULL;

  IF agent.auth_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = o.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM order_line_items WHERE order_id = o.id;

  proof_label := CASE
    WHEN COALESCE(p_proof_count, 1) <= 1 THEN '1 other document'
    ELSE format('%s other documents', COALESCE(p_proof_count, 1))
  END;

  uploaded_suffix := CASE
    WHEN p_uploaded_by IS NOT NULL AND trim(p_uploaded_by) <> '' THEN format(' by %s', p_uploaded_by)
    ELSE ''
  END;

  msg := format(
    '%s uploaded for order %s (%s)%s',
    proof_label,
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    uploaded_suffix
  );

  INSERT INTO notifications (
    user_id,
    category,
    title,
    message,
    urgent,
    action_url,
    action_label,
    branch_id,
    metadata,
    event_type
  ) VALUES (
    agent.auth_user_id,
    'System'::notification_category,
    'Other document uploaded',
    msg,
    false,
    '/orders/' || o.id::text,
    'View order',
    o.branch_id,
    jsonb_build_object(
      'orderId', o.id,
      'orderNumber', o.order_number,
      'customerName', o.customer_name,
      'agentName', o.agent_name,
      'branchName', branch_name,
      'totalAmount', o.total_amount,
      'subtotal', o.subtotal,
      'lineCount', line_count,
      'status', o.status,
      'uploadedBy', p_uploaded_by,
      'proofCount', COALESCE(p_proof_count, 1),
      'proofType', 'other',
      'requiredDate', o.required_date,
      'deliveryAddress', o.delivery_address,
      'deliveryType', o.delivery_type,
      'urgency', o.urgency
    ),
    'order_other_proof_uploaded'
  );

  RETURN 1;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_agent_order_other_proof_uploaded(UUID, TEXT, UUID, INT) TO authenticated;

COMMENT ON FUNCTION notify_agent_order_other_proof_uploaded(UUID, TEXT, UUID, INT) IS
  'In-app notification to the assigned agent when an other order proof is uploaded, skipped when the uploader is that agent.';


-- ── 24k2: Notify agent / executives on payment proof & payment recorded ─────
CREATE OR REPLACE FUNCTION notify_agent_order_payment_proof_uploaded(
  p_order_id UUID,
  p_uploaded_by TEXT DEFAULT NULL,
  p_uploader_employee_id UUID DEFAULT NULL,
  p_proof_count INT DEFAULT 1,
  p_payment_cash NUMERIC DEFAULT 0,
  p_payment_credit NUMERIC DEFAULT 0
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  agent RECORD;
  branch_name TEXT;
  line_count INT;
  proof_label TEXT;
  uploaded_suffix TEXT;
  payment_total NUMERIC;
  is_paid_in_full BOOLEAN;
  notif_title TEXT;
  event_type_val TEXT;
  msg TEXT;
BEGIN
  SELECT *
  INTO o
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF o.agent_id IS NULL THEN
    RETURN 0;
  END IF;

  IF p_uploader_employee_id IS NOT NULL AND p_uploader_employee_id = o.agent_id THEN
    RETURN 0;
  END IF;

  SELECT e.auth_user_id, e.employee_name
  INTO agent
  FROM employees e
  WHERE e.id = o.agent_id
    AND e.status = 'active'::employee_status
    AND e.auth_user_id IS NOT NULL;

  IF agent.auth_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = o.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM order_line_items WHERE order_id = o.id;

  payment_total := COALESCE(p_payment_cash, 0) + COALESCE(p_payment_credit, 0);
  is_paid_in_full := COALESCE(o.balance_due, 0) <= 0
    OR o.payment_status = 'Paid'::payment_status;

  proof_label := CASE
    WHEN COALESCE(p_proof_count, 1) <= 1 THEN '1 payment proof'
    ELSE format('%s payment proofs', COALESCE(p_proof_count, 1))
  END;

  uploaded_suffix := CASE
    WHEN p_uploaded_by IS NOT NULL AND trim(p_uploaded_by) <> '' THEN format(' by %s', p_uploaded_by)
    ELSE ''
  END;

  IF is_paid_in_full AND payment_total > 0 THEN
    notif_title := 'Order paid in full';
    event_type_val := 'order_payment_completed';
    msg := format(
      'Order %s (%s) is now fully paid%s — final payment cash ₱%s, credit ₱%s (total paid ₱%s)',
      o.order_number,
      COALESCE(o.customer_name, 'Unknown customer'),
      uploaded_suffix,
      to_char(COALESCE(p_payment_cash, 0), 'FM999,999,990.00'),
      to_char(COALESCE(p_payment_credit, 0), 'FM999,999,990.00'),
      to_char(COALESCE(o.amount_paid, 0), 'FM999,999,990.00')
    );
  ELSIF payment_total > 0 THEN
    notif_title := 'Payment proof uploaded';
    event_type_val := 'order_payment_proof_uploaded';
    msg := format(
      'Payment proof recorded for order %s (%s): cash ₱%s, credit ₱%s%s — balance ₱%s',
      o.order_number,
      COALESCE(o.customer_name, 'Unknown customer'),
      to_char(COALESCE(p_payment_cash, 0), 'FM999,999,990.00'),
      to_char(COALESCE(p_payment_credit, 0), 'FM999,999,990.00'),
      uploaded_suffix,
      to_char(COALESCE(o.balance_due, 0), 'FM999,999,990.00')
    );
  ELSE
    notif_title := 'Payment proof uploaded';
    event_type_val := 'order_payment_proof_uploaded';
    msg := format(
      '%s uploaded for order %s (%s)%s',
      proof_label,
      o.order_number,
      COALESCE(o.customer_name, 'Unknown customer'),
      uploaded_suffix
    );
  END IF;

  INSERT INTO notifications (
    user_id,
    category,
    title,
    message,
    urgent,
    action_url,
    action_label,
    branch_id,
    metadata,
    event_type
  ) VALUES (
    agent.auth_user_id,
    'Payment'::notification_category,
    notif_title,
    msg,
    is_paid_in_full AND payment_total > 0,
    '/orders/' || o.id::text,
    'View order',
    o.branch_id,
    jsonb_build_object(
      'orderId', o.id,
      'orderNumber', o.order_number,
      'customerName', o.customer_name,
      'agentName', o.agent_name,
      'branchName', branch_name,
      'totalAmount', o.total_amount,
      'amountPaid', o.amount_paid,
      'balanceDue', o.balance_due,
      'paymentStatus', o.payment_status,
      'paidInFull', is_paid_in_full AND payment_total > 0,
      'subtotal', o.subtotal,
      'lineCount', line_count,
      'status', o.status,
      'uploadedBy', p_uploaded_by,
      'proofCount', COALESCE(p_proof_count, 1),
      'proofType', 'payment',
      'paymentCash', COALESCE(p_payment_cash, 0),
      'paymentCredit', COALESCE(p_payment_credit, 0),
      'requiredDate', o.required_date,
      'deliveryAddress', o.delivery_address,
      'deliveryType', o.delivery_type,
      'urgency', o.urgency
    ),
    event_type_val
  );

  RETURN 1;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_agent_order_payment_proof_uploaded(UUID, TEXT, UUID, INT, NUMERIC, NUMERIC) TO authenticated;

COMMENT ON FUNCTION notify_agent_order_payment_proof_uploaded(UUID, TEXT, UUID, INT, NUMERIC, NUMERIC) IS
  'In-app notification to the assigned agent when a payment proof is uploaded, skipped when the uploader is that agent.';

CREATE OR REPLACE FUNCTION notify_executives_order_payment_recorded(
  p_order_id UUID,
  p_recorded_by TEXT DEFAULT NULL,
  p_payment_cash NUMERIC DEFAULT 0,
  p_payment_credit NUMERIC DEFAULT 0
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  exec RECORD;
  branch_name TEXT;
  line_count INT;
  payment_total NUMERIC;
  is_paid_in_full BOOLEAN;
  notif_title TEXT;
  event_type_val TEXT;
  recorded_suffix TEXT;
  msg TEXT;
  inserted INT := 0;
BEGIN
  payment_total := COALESCE(p_payment_cash, 0) + COALESCE(p_payment_credit, 0);

  IF payment_total <= 0 THEN
    RETURN 0;
  END IF;

  SELECT *
  INTO o
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = o.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM order_line_items WHERE order_id = o.id;

  recorded_suffix := CASE
    WHEN p_recorded_by IS NOT NULL AND trim(p_recorded_by) <> '' THEN format(' by %s', p_recorded_by)
    ELSE ''
  END;

  is_paid_in_full := COALESCE(o.balance_due, 0) <= 0
    OR o.payment_status = 'Paid'::payment_status;

  IF is_paid_in_full THEN
    notif_title := 'Order paid in full';
    event_type_val := 'order_payment_completed';
    msg := format(
      'Order %s (%s) is now fully paid%s — final payment ₱%s, total ₱%s',
      o.order_number,
      COALESCE(o.customer_name, 'Unknown customer'),
      recorded_suffix,
      to_char(payment_total, 'FM999,999,990.00'),
      to_char(COALESCE(o.total_amount, 0), 'FM999,999,990.00')
    );
  ELSE
    notif_title := 'Payment received';
    event_type_val := 'order_payment_recorded';
    msg := format(
      'Payment of ₱%s recorded on order %s (%s)%s — paid ₱%s / total ₱%s, balance ₱%s',
      to_char(payment_total, 'FM999,999,990.00'),
      o.order_number,
      COALESCE(o.customer_name, 'Unknown customer'),
      recorded_suffix,
      to_char(COALESCE(o.amount_paid, 0), 'FM999,999,990.00'),
      to_char(COALESCE(o.total_amount, 0), 'FM999,999,990.00'),
      to_char(COALESCE(o.balance_due, 0), 'FM999,999,990.00')
    );
  END IF;

  FOR exec IN
    SELECT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Executive'::user_role
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      exec.auth_user_id,
      'Payment'::notification_category,
      notif_title,
      msg,
      is_paid_in_full,
      '/orders/' || o.id::text,
      'View order',
      o.branch_id,
      jsonb_build_object(
        'orderId', o.id,
        'orderNumber', o.order_number,
        'customerName', o.customer_name,
        'agentName', o.agent_name,
        'branchName', branch_name,
        'totalAmount', o.total_amount,
        'amountPaid', o.amount_paid,
        'balanceDue', o.balance_due,
        'paymentStatus', o.payment_status,
        'paidInFull', is_paid_in_full,
        'subtotal', o.subtotal,
        'lineCount', line_count,
        'status', o.status,
        'recordedBy', p_recorded_by,
        'paymentCash', COALESCE(p_payment_cash, 0),
        'paymentCredit', COALESCE(p_payment_credit, 0),
        'paymentAmount', payment_total,
        'requiredDate', o.required_date,
        'deliveryAddress', o.delivery_address,
        'deliveryType', o.delivery_type,
        'urgency', o.urgency
      ),
      event_type_val
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_executives_order_payment_recorded(UUID, TEXT, NUMERIC, NUMERIC) TO authenticated;

COMMENT ON FUNCTION notify_executives_order_payment_recorded(UUID, TEXT, NUMERIC, NUMERIC) IS
  'In-app notification to all active executives when a payment is recorded on an order (cash or credit > 0).';

ALTER TABLE orders ADD COLUMN IF NOT EXISTS overdue_notified_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION order_compute_due_date(
  p_actual_delivery DATE,
  p_payment_terms payment_terms
)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  terms TEXT;
  days INT;
BEGIN
  IF p_actual_delivery IS NULL THEN
    RETURN NULL;
  END IF;

  terms := upper(trim(COALESCE(p_payment_terms::text, '')));

  IF terms = 'COD' OR terms LIKE '%COD%' THEN
    RETURN p_actual_delivery + 1;
  END IF;

  days := NULLIF(substring(terms from '\d+')::INT, 0);
  IF days IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN p_actual_delivery + days;
END;
$$;

CREATE OR REPLACE FUNCTION notify_order_payment_overdue(
  p_order_id UUID,
  p_days_overdue INT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  recipient RECORD;
  branch_name TEXT;
  due_date DATE;
  days_overdue INT;
  msg_exec TEXT;
  msg_agent TEXT;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO o
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  due_date := COALESCE(o.due_date, order_compute_due_date(o.actual_delivery, o.payment_terms));
  days_overdue := COALESCE(
    p_days_overdue,
    CASE WHEN due_date IS NOT NULL THEN GREATEST(0, (CURRENT_DATE - due_date)::INT) ELSE 0 END
  );

  SELECT name INTO branch_name FROM branches WHERE id = o.branch_id;

  msg_exec := format(
    'Order %s payment overdue — %s, ₱%s balance due, %s day(s) past payment terms',
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    to_char(COALESCE(o.balance_due, 0), 'FM999,999,990.00'),
    days_overdue
  );

  msg_agent := format(
    'Order %s for %s is past payment terms — ₱%s due, %s day(s) overdue',
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    to_char(COALESCE(o.balance_due, 0), 'FM999,999,990.00'),
    days_overdue
  );

  FOR recipient IN
    SELECT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Executive'::user_role
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      recipient.auth_user_id,
      'Payment'::notification_category,
      'Order payment overdue',
      msg_exec,
      true,
      '/orders/' || o.id::text,
      'View order',
      o.branch_id,
      jsonb_build_object(
        'orderId', o.id,
        'orderNumber', o.order_number,
        'customerName', o.customer_name,
        'agentName', o.agent_name,
        'branchName', branch_name,
        'totalAmount', o.total_amount,
        'amountPaid', o.amount_paid,
        'balanceDue', o.balance_due,
        'paymentStatus', o.payment_status,
        'paymentTerms', o.payment_terms,
        'dueDate', due_date,
        'daysOverdue', days_overdue,
        'status', o.status
      ),
      'order_payment_overdue'
    );
    inserted := inserted + 1;
  END LOOP;

  IF o.agent_id IS NOT NULL THEN
    SELECT e.auth_user_id
    INTO recipient
    FROM employees e
    WHERE e.id = o.agent_id
      AND e.status = 'active'::employee_status
      AND e.auth_user_id IS NOT NULL;

    IF recipient.auth_user_id IS NOT NULL THEN
      INSERT INTO notifications (
        user_id,
        category,
        title,
        message,
        urgent,
        action_url,
        action_label,
        branch_id,
        metadata,
        event_type
      ) VALUES (
        recipient.auth_user_id,
        'Payment'::notification_category,
        'Customer payment overdue',
        msg_agent,
        true,
        '/orders/' || o.id::text,
        'View order',
        o.branch_id,
        jsonb_build_object(
          'orderId', o.id,
          'orderNumber', o.order_number,
          'customerName', o.customer_name,
          'agentName', o.agent_name,
          'branchName', branch_name,
          'totalAmount', o.total_amount,
          'amountPaid', o.amount_paid,
          'balanceDue', o.balance_due,
          'paymentStatus', o.payment_status,
          'paymentTerms', o.payment_terms,
          'dueDate', due_date,
          'daysOverdue', days_overdue,
          'status', o.status
        ),
        'order_payment_overdue'
      );
      inserted := inserted + 1;
    END IF;
  END IF;

  RETURN inserted;
END;
$$;

CREATE OR REPLACE FUNCTION process_newly_overdue_orders()
RETURNS TABLE (
  order_id UUID,
  days_overdue INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  v_due_date DATE;
  days INT;
BEGIN
  FOR o IN
    SELECT ord.*
    FROM orders ord
    WHERE ord.status IN ('Partially Fulfilled'::order_status, 'Delivered'::order_status, 'Completed'::order_status)
      AND ord.overdue_notified_at IS NULL
      AND ord.actual_delivery IS NOT NULL
      AND COALESCE(ord.balance_due, 0) > 0.01
      AND (
        ord.payment_status IN (
          'Unbilled'::payment_status,
          'Invoiced'::payment_status,
          'Partially Paid'::payment_status,
          'On Credit'::payment_status
        )
        OR ord.payment_status = 'Overdue'::payment_status
      )
  LOOP
    v_due_date := COALESCE(o.due_date, order_compute_due_date(o.actual_delivery, o.payment_terms));
    IF v_due_date IS NULL OR v_due_date >= CURRENT_DATE THEN
      CONTINUE;
    END IF;

    days := GREATEST(0, (CURRENT_DATE - v_due_date)::INT);

    UPDATE orders
    SET
      payment_status = 'Overdue'::payment_status,
      due_date = v_due_date,
      overdue_notified_at = NOW(),
      updated_at = NOW()
    WHERE id = o.id;

    PERFORM notify_order_payment_overdue(o.id, days);

    order_id := o.id;
    days_overdue := days;
    RETURN NEXT;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION order_compute_due_date(DATE, payment_terms) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_order_payment_overdue(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION process_newly_overdue_orders() TO authenticated;

COMMENT ON FUNCTION order_compute_due_date(DATE, payment_terms) IS
  'Payment due date from actual delivery date and payment terms (COD = next day; Net N = N days).';
COMMENT ON FUNCTION notify_order_payment_overdue(UUID, INT) IS
  'In-app notification to executives and the assigned agent when an order payment is overdue.';
COMMENT ON FUNCTION process_newly_overdue_orders() IS
  'Mark newly overdue delivered orders, notify executives and agent once per order, return processed rows.';

CREATE OR REPLACE FUNCTION notify_agent_order_commission_paid(
  p_order_id UUID,
  p_paid_by TEXT DEFAULT NULL,
  p_commission_amount NUMERIC DEFAULT 0,
  p_cash_amount NUMERIC DEFAULT 0,
  p_proof_count INT DEFAULT 1
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  agent RECORD;
  branch_name TEXT;
  line_count INT;
  paid_suffix TEXT;
  msg TEXT;
  title TEXT;
BEGIN
  SELECT *
  INTO o
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF o.agent_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT e.auth_user_id, e.employee_name
  INTO agent
  FROM employees e
  WHERE e.id = o.agent_id
    AND e.status = 'active'::employee_status
    AND e.auth_user_id IS NOT NULL;

  IF agent.auth_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = o.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM order_line_items WHERE order_id = o.id;

  paid_suffix := CASE
    WHEN p_paid_by IS NOT NULL AND trim(p_paid_by) <> '' THEN format(' by %s', p_paid_by)
    ELSE ''
  END;

  IF COALESCE(p_proof_count, 1) <= 1 THEN
    title := 'Commission paid out';
    msg := format(
      'Commission of ₱%s paid out on order %s (%s) for cash payment ₱%s%s',
      to_char(COALESCE(p_commission_amount, 0), 'FM999,999,990.00'),
      o.order_number,
      COALESCE(o.customer_name, 'Unknown customer'),
      to_char(COALESCE(p_cash_amount, 0), 'FM999,999,990.00'),
      paid_suffix
    );
  ELSE
    title := 'Commissions paid out';
    msg := format(
      'Commission of ₱%s paid out on order %s (%s) — %s payment proof(s), cash ₱%s%s',
      to_char(COALESCE(p_commission_amount, 0), 'FM999,999,990.00'),
      o.order_number,
      COALESCE(o.customer_name, 'Unknown customer'),
      COALESCE(p_proof_count, 1),
      to_char(COALESCE(p_cash_amount, 0), 'FM999,999,990.00'),
      paid_suffix
    );
  END IF;

  INSERT INTO notifications (
    user_id,
    category,
    title,
    message,
    urgent,
    action_url,
    action_label,
    branch_id,
    metadata,
    event_type
  ) VALUES (
    agent.auth_user_id,
    'Payment'::notification_category,
    title,
    msg,
    false,
    '/orders/' || o.id::text,
    'View order',
    o.branch_id,
    jsonb_build_object(
      'orderId', o.id,
      'orderNumber', o.order_number,
      'customerName', o.customer_name,
      'agentName', o.agent_name,
      'branchName', branch_name,
      'totalAmount', o.total_amount,
      'amountPaid', o.amount_paid,
      'balanceDue', o.balance_due,
      'paymentStatus', o.payment_status,
      'subtotal', o.subtotal,
      'lineCount', line_count,
      'status', o.status,
      'paidBy', p_paid_by,
      'commissionAmount', COALESCE(p_commission_amount, 0),
      'cashAmount', COALESCE(p_cash_amount, 0),
      'proofCount', COALESCE(p_proof_count, 1),
      'requiredDate', o.required_date,
      'deliveryAddress', o.delivery_address,
      'deliveryType', o.delivery_type,
      'urgency', o.urgency
    ),
    'order_commission_paid'
  );

  RETURN 1;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_agent_order_commission_paid(UUID, TEXT, NUMERIC, NUMERIC, INT) TO authenticated;

COMMENT ON FUNCTION notify_agent_order_commission_paid(UUID, TEXT, NUMERIC, NUMERIC, INT) IS
  'In-app notification to the assigned agent when commission is marked paid out on payment proof(s).';

CREATE OR REPLACE FUNCTION notify_product_stock_threshold_if_crossed(
  p_variant_id UUID,
  p_product_id UUID,
  p_sku TEXT,
  p_size TEXT,
  p_is_hidden BOOLEAN,
  p_status product_status,
  p_old_stock INT,
  p_new_stock INT,
  p_old_rp INT,
  p_new_rp INT,
  p_branch_id UUID DEFAULT NULL,
  p_branch_name TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  product_rec RECORD;
  product_action_url TEXT;
  alert_type TEXT;
  notif_title TEXT;
  msg TEXT;
  is_urgent BOOLEAN;
  branch_label TEXT;
  was_already_low BOOLEAN;
  is_now_low BOOLEAN;
  recipient RECORD;
BEGIN
  IF COALESCE(p_is_hidden, false) THEN
    RETURN;
  END IF;

  IF p_status = 'Discontinued'::product_status THEN
    RETURN;
  END IF;

  IF p_old_stock IS NOT DISTINCT FROM p_new_stock
     AND p_old_rp IS NOT DISTINCT FROM p_new_rp THEN
    RETURN;
  END IF;

  -- "Already low" = previous state was at/under previous reorder point with positive stock.
  was_already_low := COALESCE(p_old_rp, 0) > 0
    AND COALESCE(p_old_stock, 0) > 0
    AND COALESCE(p_old_stock, 0) <= COALESCE(p_old_rp, 0);

  -- "Now low" = current stock is positive and at/under the (current) reorder point.
  is_now_low := COALESCE(p_new_rp, 0) > 0
    AND COALESCE(p_new_stock, 0) > 0
    AND COALESCE(p_new_stock, 0) <= COALESCE(p_new_rp, 0);

  -- Out-of-stock takes priority: any transition into zero (or below) when there was stock before.
  IF COALESCE(p_old_stock, 0) > 0 AND COALESCE(p_new_stock, 0) <= 0 THEN
    alert_type := 'product_out_of_stock';
    notif_title := 'Product out of stock';
    is_urgent := true;
  -- Fresh crossing into low-stock: wasn't low before, is low now.
  ELSIF is_now_low AND NOT was_already_low THEN
    alert_type := 'product_below_reorder_point';
    notif_title := 'Product below reorder point';
    is_urgent := true;
  -- Stock dropped further while still low (e.g. 80 → 40 with rp 100): re-alert so the
  -- continued decline is visible. Skip identical no-op writes.
  ELSIF is_now_low AND was_already_low
        AND COALESCE(p_new_stock, 0) < COALESCE(p_old_stock, 0) THEN
    alert_type := 'product_below_reorder_point';
    notif_title := 'Product stock still below reorder point';
    is_urgent := true;
  ELSE
    RETURN;
  END IF;

  SELECT p.id, p.name, p.branch, pc.slug AS category_slug
  INTO product_rec
  FROM products p
  LEFT JOIN product_categories pc ON pc.id = p.category_id
  WHERE p.id = p_product_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  product_action_url := CASE
    WHEN product_rec.category_slug IS NOT NULL AND trim(product_rec.category_slug) <> '' THEN
      '/products/category/' || trim(product_rec.category_slug) || '/family/' || p_product_id::text
    ELSE
      '/products/' || p_product_id::text
  END;

  branch_label := CASE
    WHEN p_branch_name IS NOT NULL AND trim(p_branch_name) <> '' THEN format(' — %s', p_branch_name)
    ELSE ''
  END;

  IF alert_type = 'product_out_of_stock' THEN
    msg := format(
      '%s (%s%s) is out of stock%s',
      p_sku,
      COALESCE(product_rec.name, 'Unknown product'),
      CASE WHEN p_size IS NOT NULL AND trim(p_size) <> '' THEN format(', %s', p_size) ELSE '' END,
      branch_label
    );
  ELSE
    msg := format(
      '%s (%s%s) is below reorder point: %s units left (reorder at %s)%s',
      p_sku,
      COALESCE(product_rec.name, 'Unknown product'),
      CASE WHEN p_size IS NOT NULL AND trim(p_size) <> '' THEN format(', %s', p_size) ELSE '' END,
      COALESCE(p_new_stock, 0),
      COALESCE(p_new_rp, 0),
      branch_label
    );
  END IF;

  FOR recipient IN
    SELECT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Executive'::user_role
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      recipient.auth_user_id,
      'Inventory'::notification_category,
      notif_title,
      msg,
      is_urgent,
      product_action_url,
      'View product',
      p_branch_id,
      jsonb_build_object(
        'variantId', p_variant_id,
        'productId', p_product_id,
        'productName', product_rec.name,
        'sku', p_sku,
        'size', p_size,
        'branchName', p_branch_name,
        'totalStock', p_new_stock,
        'previousStock', p_old_stock,
        'reorderPoint', p_new_rp,
        'alertType', alert_type
      ),
      alert_type
    );
  END LOOP;

  FOR recipient IN
    SELECT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Warehouse'::user_role
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      recipient.auth_user_id,
      'Inventory'::notification_category,
      notif_title,
      msg,
      is_urgent,
      product_action_url,
      'View product',
      p_branch_id,
      jsonb_build_object(
        'variantId', p_variant_id,
        'productId', p_product_id,
        'productName', product_rec.name,
        'sku', p_sku,
        'size', p_size,
        'branchName', p_branch_name,
        'totalStock', p_new_stock,
        'previousStock', p_old_stock,
        'reorderPoint', p_new_rp,
        'alertType', alert_type
      ),
      alert_type
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION trg_product_variant_branch_stock_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v RECORD;
  branch_name TEXT;
  old_qty INT;
  new_qty INT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  old_qty := CASE WHEN TG_OP = 'INSERT' THEN 0 ELSE COALESCE(OLD.quantity, 0) END;
  new_qty := COALESCE(NEW.quantity, 0);

  IF old_qty IS NOT DISTINCT FROM new_qty THEN
    RETURN NEW;
  END IF;

  SELECT
    pv.id,
    pv.product_id,
    pv.sku,
    pv.size,
    pv.is_hidden,
    pv.status,
    pv.reorder_point
  INTO v
  FROM product_variants pv
  WHERE pv.id = NEW.variant_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  SELECT b.name INTO branch_name FROM branches b WHERE b.id = NEW.branch_id;

  PERFORM notify_product_stock_threshold_if_crossed(
    v.id,
    v.product_id,
    v.sku,
    v.size,
    v.is_hidden,
    v.status,
    old_qty,
    new_qty,
    COALESCE(v.reorder_point, 0),
    COALESCE(v.reorder_point, 0),
    NEW.branch_id,
    branch_name
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_product_variant_stock_alert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_branch_rows BOOLEAN;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM product_variant_stock pvs WHERE pvs.variant_id = NEW.id LIMIT 1
  ) INTO has_branch_rows;

  IF has_branch_rows
     AND NEW.total_stock IS DISTINCT FROM OLD.total_stock
     AND NEW.reorder_point IS NOT DISTINCT FROM OLD.reorder_point THEN
    RETURN NEW;
  END IF;

  IF NEW.total_stock IS NOT DISTINCT FROM OLD.total_stock
     AND NEW.reorder_point IS NOT DISTINCT FROM OLD.reorder_point THEN
    RETURN NEW;
  END IF;

  PERFORM notify_product_stock_threshold_if_crossed(
    NEW.id,
    NEW.product_id,
    NEW.sku,
    NEW.size,
    NEW.is_hidden,
    NEW.status,
    COALESCE(OLD.total_stock, 0),
    COALESCE(NEW.total_stock, 0),
    COALESCE(OLD.reorder_point, 0),
    COALESCE(NEW.reorder_point, 0),
    NULL,
    NULL
  );

  RETURN NEW;
END;
$$;

-- Triggers optional; app calls notify_product_stock_threshold_rpc after stock writes.
/*
DROP TRIGGER IF EXISTS product_variant_branch_stock_alert ON product_variant_stock;
CREATE TRIGGER product_variant_branch_stock_alert
  AFTER INSERT OR UPDATE OF quantity ON product_variant_stock
  FOR EACH ROW
  EXECUTE FUNCTION trg_product_variant_branch_stock_alert();

DROP TRIGGER IF EXISTS product_variant_stock_alert ON product_variants;
CREATE TRIGGER product_variant_stock_alert
  AFTER UPDATE OF total_stock, reorder_point ON product_variants
  FOR EACH ROW
  EXECUTE FUNCTION trg_product_variant_stock_alert();
*/

COMMENT ON FUNCTION notify_product_stock_threshold_if_crossed(UUID, UUID, TEXT, TEXT, BOOLEAN, product_status, INT, INT, INT, INT, UUID, TEXT) IS
  'Insert Inventory notifications for Executives and Warehouse when stock crosses out-of-stock or reorder thresholds.';

COMMENT ON FUNCTION trg_product_variant_branch_stock_alert() IS
  'Trigger: branch-level product stock alerts (matches per-branch stock in the UI).';

COMMENT ON FUNCTION trg_product_variant_stock_alert() IS
  'Trigger: variant-level alerts for reorder_point changes and legacy total_stock updates without branch rows.';

CREATE OR REPLACE FUNCTION notify_product_stock_threshold_rpc(
  p_variant_id UUID,
  p_old_stock INT,
  p_new_stock INT,
  p_old_rp INT DEFAULT NULL,
  p_new_rp INT DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v RECORD;
  branch_name TEXT;
BEGIN
  SELECT
    pv.id,
    pv.product_id,
    pv.sku,
    pv.size,
    pv.is_hidden,
    pv.status,
    pv.reorder_point
  INTO v
  FROM product_variants pv
  WHERE pv.id = p_variant_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  branch_name := NULL;
  IF p_branch_id IS NOT NULL THEN
    SELECT b.name INTO branch_name FROM branches b WHERE b.id = p_branch_id;
  END IF;

  PERFORM notify_product_stock_threshold_if_crossed(
    v.id,
    v.product_id,
    v.sku,
    v.size,
    v.is_hidden,
    v.status,
    COALESCE(p_old_stock, 0),
    COALESCE(p_new_stock, 0),
    COALESCE(p_old_rp, v.reorder_point, 0),
    COALESCE(p_new_rp, v.reorder_point, 0),
    p_branch_id,
    branch_name
  );

  RETURN 1;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_product_stock_threshold_rpc(UUID, INT, INT, INT, INT, UUID) TO authenticated;

COMMENT ON FUNCTION notify_product_stock_threshold_rpc(UUID, INT, INT, INT, INT, UUID) IS
  'Client-callable wrapper to emit product low-stock / out-of-stock in-app notifications.';


-- ── 24k.b: Raw material stock alert RPC (mirrors product variant flow) ──────
CREATE OR REPLACE FUNCTION notify_material_stock_threshold_if_crossed(
  p_material_id UUID,
  p_sku TEXT,
  p_name TEXT,
  p_unit TEXT,
  p_status material_status,
  p_old_stock NUMERIC,
  p_new_stock NUMERIC,
  p_old_rp NUMERIC,
  p_new_rp NUMERIC,
  p_branch_id UUID DEFAULT NULL,
  p_branch_name TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alert_type TEXT;
  notif_title TEXT;
  msg TEXT;
  is_urgent BOOLEAN;
  branch_label TEXT;
  unit_label TEXT;
  was_already_low BOOLEAN;
  is_now_low BOOLEAN;
  recipient RECORD;
BEGIN
  IF p_status = 'Discontinued'::material_status THEN
    RETURN;
  END IF;

  IF p_old_stock IS NOT DISTINCT FROM p_new_stock
     AND p_old_rp IS NOT DISTINCT FROM p_new_rp THEN
    RETURN;
  END IF;

  was_already_low := COALESCE(p_old_rp, 0) > 0
    AND COALESCE(p_old_stock, 0) > 0
    AND COALESCE(p_old_stock, 0) <= COALESCE(p_old_rp, 0);

  is_now_low := COALESCE(p_new_rp, 0) > 0
    AND COALESCE(p_new_stock, 0) > 0
    AND COALESCE(p_new_stock, 0) <= COALESCE(p_new_rp, 0);

  IF COALESCE(p_old_stock, 0) > 0 AND COALESCE(p_new_stock, 0) <= 0 THEN
    alert_type := 'material_out_of_stock';
    notif_title := 'Material out of stock';
    is_urgent := true;
  ELSIF is_now_low AND NOT was_already_low THEN
    alert_type := 'material_below_reorder_point';
    notif_title := 'Material below reorder point';
    is_urgent := true;
  ELSIF is_now_low AND was_already_low
        AND COALESCE(p_new_stock, 0) < COALESCE(p_old_stock, 0) THEN
    alert_type := 'material_below_reorder_point';
    notif_title := 'Material stock still below reorder point';
    is_urgent := true;
  ELSE
    RETURN;
  END IF;

  branch_label := CASE
    WHEN p_branch_name IS NOT NULL AND trim(p_branch_name) <> '' THEN format(' — %s', p_branch_name)
    ELSE ''
  END;
  unit_label := COALESCE(NULLIF(trim(p_unit), ''), 'units');

  IF alert_type = 'material_out_of_stock' THEN
    msg := format(
      '%s (%s) is out of stock%s',
      p_sku,
      COALESCE(p_name, 'Unknown material'),
      branch_label
    );
  ELSE
    msg := format(
      '%s (%s) is below reorder point: %s %s left (reorder at %s)%s',
      p_sku,
      COALESCE(p_name, 'Unknown material'),
      COALESCE(p_new_stock, 0),
      unit_label,
      COALESCE(p_new_rp, 0),
      branch_label
    );
  END IF;

  FOR recipient IN
    SELECT e.auth_user_id FROM employees e
    WHERE e.user_role = 'Executive'::user_role
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id, category, title, message, urgent,
      action_url, action_label, branch_id, metadata, event_type
    ) VALUES (
      recipient.auth_user_id,
      'Inventory'::notification_category,
      notif_title, msg, is_urgent,
      '/materials/' || p_material_id::text, 'View material',
      p_branch_id,
      jsonb_build_object(
        'materialId', p_material_id,
        'name', p_name,
        'sku', p_sku,
        'unit', p_unit,
        'branchName', p_branch_name,
        'totalStock', p_new_stock,
        'previousStock', p_old_stock,
        'reorderPoint', p_new_rp,
        'alertType', alert_type
      ),
      alert_type
    );
  END LOOP;

  FOR recipient IN
    SELECT e.auth_user_id FROM employees e
    WHERE e.user_role = 'Warehouse'::user_role
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id, category, title, message, urgent,
      action_url, action_label, branch_id, metadata, event_type
    ) VALUES (
      recipient.auth_user_id,
      'Inventory'::notification_category,
      notif_title, msg, is_urgent,
      '/materials/' || p_material_id::text, 'View material',
      p_branch_id,
      jsonb_build_object(
        'materialId', p_material_id,
        'name', p_name,
        'sku', p_sku,
        'unit', p_unit,
        'branchName', p_branch_name,
        'totalStock', p_new_stock,
        'previousStock', p_old_stock,
        'reorderPoint', p_new_rp,
        'alertType', alert_type
      ),
      alert_type
    );
  END LOOP;
END;
$$;

COMMENT ON FUNCTION notify_material_stock_threshold_if_crossed(UUID, TEXT, TEXT, TEXT, material_status, NUMERIC, NUMERIC, NUMERIC, NUMERIC, UUID, TEXT) IS
  'Insert Inventory notifications for Executives and Warehouse when raw material stock crosses out-of-stock or reorder thresholds.';

CREATE OR REPLACE FUNCTION notify_material_stock_threshold_rpc(
  p_material_id UUID,
  p_old_stock NUMERIC,
  p_new_stock NUMERIC,
  p_old_rp NUMERIC DEFAULT NULL,
  p_new_rp NUMERIC DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m RECORD;
  branch_name TEXT;
BEGIN
  SELECT rm.id, rm.sku, rm.name, rm.unit_of_measure, rm.status, rm.reorder_point
  INTO m FROM raw_materials rm WHERE rm.id = p_material_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  branch_name := NULL;
  IF p_branch_id IS NOT NULL THEN
    SELECT b.name INTO branch_name FROM branches b WHERE b.id = p_branch_id;
  END IF;

  PERFORM notify_material_stock_threshold_if_crossed(
    m.id, m.sku, m.name, m.unit_of_measure::text, m.status,
    COALESCE(p_old_stock, 0),
    COALESCE(p_new_stock, 0),
    COALESCE(p_old_rp, m.reorder_point, 0),
    COALESCE(p_new_rp, m.reorder_point, 0),
    p_branch_id, branch_name
  );

  RETURN 1;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_material_stock_threshold_rpc(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, UUID) TO authenticated;

COMMENT ON FUNCTION notify_material_stock_threshold_rpc(UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, UUID) IS
  'Client-callable wrapper to emit raw material low-stock / out-of-stock in-app notifications.';


-- ── 24l: Notify executives when a rejected order is revised & resubmitted ───
CREATE OR REPLACE FUNCTION notify_executives_order_revised(p_order_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  exec RECORD;
  branch_name TEXT;
  line_count INT;
  msg TEXT;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO o
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF o.status IS DISTINCT FROM 'Pending'::order_status THEN
    RAISE EXCEPTION 'Order % is not Pending (current: %)', o.order_number, o.status;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = o.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM order_line_items WHERE order_id = o.id;

  msg := format(
    'Order %s revised and resubmitted by %s — %s for %s item(s), total ₱%s',
    o.order_number,
    COALESCE(o.agent_name, 'Unknown agent'),
    COALESCE(o.customer_name, 'Unknown customer'),
    line_count,
    to_char(COALESCE(o.total_amount, 0), 'FM999,999,990.00')
  );

  FOR exec IN
    SELECT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Executive'::user_role
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      exec.auth_user_id,
      'Approvals'::notification_category,
      'Order revised & resubmitted',
      msg,
      o.urgency IN ('High'::urgency_level, 'Critical'::urgency_level),
      '/orders/' || o.id::text,
      'Review revised order',
      o.branch_id,
      jsonb_build_object(
        'orderId', o.id,
        'orderNumber', o.order_number,
        'customerName', o.customer_name,
        'agentName', o.agent_name,
        'branchName', branch_name,
        'totalAmount', o.total_amount,
        'subtotal', o.subtotal,
        'lineCount', line_count,
        'status', o.status,
        'requiredDate', o.required_date,
        'deliveryAddress', o.delivery_address,
        'urgency', o.urgency,
        'discountPercent', o.discount_percent,
        'revised', true
      ),
      'order_revised'
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_executives_order_revised(UUID) TO authenticated;

COMMENT ON FUNCTION notify_executives_order_revised(UUID) IS
  'Fan-out in-app notification to all active Executive users when a rejected order is revised and resubmitted.';


-- ── 24m: Notify on order cancellation (agent → executives, executive → agent) ─
CREATE OR REPLACE FUNCTION notify_executives_order_cancelled(
  p_order_id UUID,
  p_cancelled_by TEXT DEFAULT NULL,
  p_cancellation_reason TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  exec RECORD;
  branch_name TEXT;
  line_count INT;
  msg TEXT;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO o
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF o.status IS DISTINCT FROM 'Cancelled'::order_status THEN
    RAISE EXCEPTION 'Order % is not Cancelled (current: %)', o.order_number, o.status;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = o.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM order_line_items WHERE order_id = o.id;

  msg := format(
    'Order %s cancelled by agent %s — %s%s',
    o.order_number,
    COALESCE(p_cancelled_by, o.agent_name, 'Unknown'),
    COALESCE(o.customer_name, 'Unknown customer'),
    CASE
      WHEN p_cancellation_reason IS NOT NULL AND trim(p_cancellation_reason) <> ''
      THEN format('. Reason: %s', p_cancellation_reason)
      ELSE ''
    END
  );

  FOR exec IN
    SELECT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Executive'::user_role
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      exec.auth_user_id,
      'System'::notification_category,
      'Order cancelled by agent',
      msg,
      false,
      '/orders/' || o.id::text,
      'View order',
      o.branch_id,
      jsonb_build_object(
        'orderId', o.id,
        'orderNumber', o.order_number,
        'customerName', o.customer_name,
        'agentName', o.agent_name,
        'branchName', branch_name,
        'totalAmount', o.total_amount,
        'subtotal', o.subtotal,
        'lineCount', line_count,
        'status', o.status,
        'cancelledBy', p_cancelled_by,
        'cancellationReason', p_cancellation_reason,
        'requiredDate', o.required_date,
        'urgency', o.urgency
      ),
      'order_cancelled_by_agent'
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

CREATE OR REPLACE FUNCTION notify_agent_order_cancelled(
  p_order_id UUID,
  p_cancelled_by TEXT DEFAULT NULL,
  p_cancellation_reason TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  agent RECORD;
  branch_name TEXT;
  line_count INT;
  msg TEXT;
BEGIN
  SELECT *
  INTO o
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF o.status IS DISTINCT FROM 'Cancelled'::order_status THEN
    RAISE EXCEPTION 'Order % is not Cancelled (current: %)', o.order_number, o.status;
  END IF;

  IF o.agent_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT e.auth_user_id, e.employee_name
  INTO agent
  FROM employees e
  WHERE e.id = o.agent_id
    AND e.status = 'active'::employee_status
    AND e.auth_user_id IS NOT NULL;

  IF agent.auth_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = o.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM order_line_items WHERE order_id = o.id;

  msg := format(
    'Order %s for %s was cancelled%s%s',
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    CASE WHEN p_cancelled_by IS NOT NULL AND trim(p_cancelled_by) <> '' THEN format(' by %s', p_cancelled_by) ELSE '' END,
    CASE
      WHEN p_cancellation_reason IS NOT NULL AND trim(p_cancellation_reason) <> ''
      THEN format('. Reason: %s', p_cancellation_reason)
      ELSE ''
    END
  );

  INSERT INTO notifications (
    user_id,
    category,
    title,
    message,
    urgent,
    action_url,
    action_label,
    branch_id,
    metadata,
    event_type
  ) VALUES (
    agent.auth_user_id,
    'System'::notification_category,
    'Order cancelled',
    msg,
    true,
    '/orders/' || o.id::text,
    'View order',
    o.branch_id,
    jsonb_build_object(
      'orderId', o.id,
      'orderNumber', o.order_number,
      'customerName', o.customer_name,
      'agentName', o.agent_name,
      'branchName', branch_name,
      'totalAmount', o.total_amount,
      'subtotal', o.subtotal,
      'lineCount', line_count,
      'status', o.status,
      'cancelledBy', p_cancelled_by,
      'cancellationReason', p_cancellation_reason,
      'requiredDate', o.required_date,
      'urgency', o.urgency
    ),
    'order_cancelled_by_executive'
  );

  RETURN 1;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_executives_order_cancelled(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_agent_order_cancelled(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION notify_executives_order_cancelled(UUID, TEXT, TEXT) IS
  'Fan-out in-app notification to executives when an agent cancels an order.';
COMMENT ON FUNCTION notify_agent_order_cancelled(UUID, TEXT, TEXT) IS
  'In-app notification to the assigned agent when an executive cancels their order.';


-- Order scheduled — executives, branch warehouse, and assigned agent
CREATE OR REPLACE FUNCTION notify_order_scheduled(
  p_order_id UUID,
  p_scheduled_by TEXT DEFAULT NULL,
  p_trip_number TEXT DEFAULT NULL,
  p_scheduled_date DATE DEFAULT NULL,
  p_vehicle_name TEXT DEFAULT NULL,
  p_driver_name TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  o RECORD;
  recipient RECORD;
  branch_name TEXT;
  line_count INT;
  schedule_label TEXT;
  trip_suffix TEXT;
  msg_exec TEXT;
  msg_wh TEXT;
  msg_agent TEXT;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO o
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found: %', p_order_id;
  END IF;

  IF o.status IS DISTINCT FROM 'Scheduled'::order_status THEN
    RAISE EXCEPTION 'Order % is not Scheduled (current: %)', o.order_number, o.status;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = o.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM order_line_items WHERE order_id = o.id;

  schedule_label := COALESCE(
    to_char(p_scheduled_date, 'Mon DD, YYYY'),
    to_char(o.scheduled_departure_date, 'Mon DD, YYYY'),
    'the planned date'
  );

  trip_suffix := CASE
    WHEN p_trip_number IS NOT NULL AND trim(p_trip_number) <> '' THEN
      format(' (trip %s)', trim(p_trip_number))
    ELSE ''
  END;

  msg_exec := format(
    'Order %s for %s scheduled for %s%s%s — %s item(s), total ₱%s',
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    schedule_label,
    trip_suffix,
    CASE WHEN p_scheduled_by IS NOT NULL AND trim(p_scheduled_by) <> '' THEN format(' by %s', p_scheduled_by) ELSE '' END,
    line_count,
    to_char(COALESCE(o.total_amount, 0), 'FM999,999,990.00')
  );

  msg_wh := format(
    'Order %s for %s is scheduled for %s%s — prepare for loading (%s item(s))',
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    schedule_label,
    trip_suffix,
    line_count
  );

  msg_agent := format(
    'Order %s for %s was scheduled for %s%s',
    o.order_number,
    COALESCE(o.customer_name, 'Unknown customer'),
    schedule_label,
    trip_suffix
  );

  FOR recipient IN
    SELECT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Executive'::user_role
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      recipient.auth_user_id,
      'Delivery'::notification_category,
      'Order scheduled',
      msg_exec,
      o.urgency IN ('High'::urgency_level, 'Critical'::urgency_level),
      '/orders/' || o.id::text,
      'View order',
      o.branch_id,
      jsonb_build_object(
        'orderId', o.id,
        'orderNumber', o.order_number,
        'customerName', o.customer_name,
        'agentName', o.agent_name,
        'branchName', branch_name,
        'totalAmount', o.total_amount,
        'subtotal', o.subtotal,
        'lineCount', line_count,
        'status', o.status,
        'scheduledBy', p_scheduled_by,
        'tripNumber', p_trip_number,
        'scheduledDate', COALESCE(p_scheduled_date, o.scheduled_departure_date),
        'vehicleName', p_vehicle_name,
        'driverName', p_driver_name,
        'requiredDate', o.required_date,
        'deliveryAddress', o.delivery_address,
        'deliveryType', o.delivery_type,
        'urgency', o.urgency
      ),
      'order_scheduled'
    );
    inserted := inserted + 1;
  END LOOP;

  IF o.branch_id IS NOT NULL THEN
    FOR recipient IN
      SELECT e.auth_user_id
      FROM employees e
      WHERE e.user_role = 'Warehouse'::user_role
        AND e.branch_id = o.branch_id
        AND e.auth_user_id IS NOT NULL
        AND e.status = 'active'::employee_status
    LOOP
      INSERT INTO notifications (
        user_id,
        category,
        title,
        message,
        urgent,
        action_url,
        action_label,
        branch_id,
        metadata,
        event_type
      ) VALUES (
        recipient.auth_user_id,
        'Delivery'::notification_category,
        'Order scheduled for fulfillment',
        msg_wh,
        o.urgency IN ('High'::urgency_level, 'Critical'::urgency_level),
        '/orders/' || o.id::text,
        'View order',
        o.branch_id,
        jsonb_build_object(
          'orderId', o.id,
          'orderNumber', o.order_number,
          'customerName', o.customer_name,
          'agentName', o.agent_name,
          'branchName', branch_name,
          'totalAmount', o.total_amount,
          'subtotal', o.subtotal,
          'lineCount', line_count,
          'status', o.status,
          'scheduledBy', p_scheduled_by,
          'tripNumber', p_trip_number,
          'scheduledDate', COALESCE(p_scheduled_date, o.scheduled_departure_date),
          'vehicleName', p_vehicle_name,
          'driverName', p_driver_name,
          'requiredDate', o.required_date,
          'deliveryAddress', o.delivery_address,
          'deliveryType', o.delivery_type,
          'urgency', o.urgency
        ),
        'order_scheduled'
      );
      inserted := inserted + 1;
    END LOOP;
  END IF;

  IF o.agent_id IS NOT NULL THEN
    SELECT e.auth_user_id
    INTO recipient
    FROM employees e
    WHERE e.id = o.agent_id
      AND e.status = 'active'::employee_status
      AND e.auth_user_id IS NOT NULL;

    IF recipient.auth_user_id IS NOT NULL THEN
      INSERT INTO notifications (
        user_id,
        category,
        title,
        message,
        urgent,
        action_url,
        action_label,
        branch_id,
        metadata,
        event_type
      ) VALUES (
        recipient.auth_user_id,
        'Delivery'::notification_category,
        'Customer order scheduled',
        msg_agent,
        o.urgency IN ('High'::urgency_level, 'Critical'::urgency_level),
        '/orders/' || o.id::text,
        'View order',
        o.branch_id,
        jsonb_build_object(
          'orderId', o.id,
          'orderNumber', o.order_number,
          'customerName', o.customer_name,
          'agentName', o.agent_name,
          'branchName', branch_name,
          'totalAmount', o.total_amount,
          'subtotal', o.subtotal,
          'lineCount', line_count,
          'status', o.status,
          'scheduledBy', p_scheduled_by,
          'tripNumber', p_trip_number,
          'scheduledDate', COALESCE(p_scheduled_date, o.scheduled_departure_date),
          'vehicleName', p_vehicle_name,
          'driverName', p_driver_name,
          'requiredDate', o.required_date,
          'deliveryAddress', o.delivery_address,
          'deliveryType', o.delivery_type,
          'urgency', o.urgency
        ),
        'order_scheduled'
      );
      inserted := inserted + 1;
    END IF;
  END IF;

  RETURN inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_order_scheduled(UUID, TEXT, TEXT, DATE, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION notify_order_scheduled(UUID, TEXT, TEXT, DATE, TEXT, TEXT) IS
  'Fan-out in-app notification to executives, branch warehouse staff, and the assigned agent when an order is scheduled.';


-- Trip assigned to truck driver
CREATE OR REPLACE FUNCTION notify_driver_trip_assigned(
  p_trip_id UUID,
  p_assigned_by TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t RECORD;
  driver RECORD;
  branch_name TEXT;
  order_count INT;
  schedule_label TEXT;
  dest_label TEXT;
  ibr_number TEXT;
  msg TEXT;
BEGIN
  SELECT
    tr.id,
    tr.trip_number,
    tr.scheduled_date,
    tr.vehicle_name,
    tr.driver_id,
    tr.driver_name,
    tr.order_ids,
    tr.destinations,
    tr.branch_id,
    tr.inter_branch_request_id
  INTO t
  FROM trips tr
  WHERE tr.id = p_trip_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trip not found: %', p_trip_id;
  END IF;

  IF t.driver_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT e.auth_user_id, e.employee_name
  INTO driver
  FROM employees e
  WHERE e.id = t.driver_id
    AND e.status = 'active'::employee_status
    AND e.auth_user_id IS NOT NULL;

  IF driver.auth_user_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = t.branch_id;
  order_count := COALESCE(array_length(t.order_ids, 1), 0);
  dest_label := COALESCE(t.destinations[1], 'destination branch');

  IF t.inter_branch_request_id IS NOT NULL THEN
    SELECT ibr.ibr_number INTO ibr_number
    FROM inter_branch_requests ibr
    WHERE ibr.id = t.inter_branch_request_id;
  END IF;

  schedule_label := COALESCE(
    to_char(t.scheduled_date, 'Mon DD, YYYY'),
    'the planned date'
  );

  IF t.inter_branch_request_id IS NOT NULL THEN
    msg := format(
      'You were assigned to inter-branch shipment %s on %s — delivering to %s, truck %s, driver %s%s',
      COALESCE(ibr_number, t.trip_number),
      schedule_label,
      dest_label,
      COALESCE(t.vehicle_name, 'TBD'),
      COALESCE(NULLIF(trim(t.driver_name), ''), 'TBD'),
      CASE WHEN p_assigned_by IS NOT NULL AND trim(p_assigned_by) <> '' THEN format(' (by %s)', p_assigned_by) ELSE '' END
    );
  ELSE
    msg := format(
      'You were assigned to trip %s on %s — %s order(s), vehicle %s%s',
      t.trip_number,
      schedule_label,
      order_count,
      COALESCE(t.vehicle_name, 'TBD'),
      CASE WHEN p_assigned_by IS NOT NULL AND trim(p_assigned_by) <> '' THEN format(' (by %s)', p_assigned_by) ELSE '' END
    );
  END IF;

  INSERT INTO notifications (
    user_id,
    category,
    title,
    message,
    urgent,
    action_url,
    action_label,
    branch_id,
    metadata,
    event_type
  ) VALUES (
    driver.auth_user_id,
    'Delivery'::notification_category,
    CASE WHEN t.inter_branch_request_id IS NOT NULL THEN 'Inter-branch shipment assigned' ELSE 'Trip assigned to you' END,
    msg,
    false,
    '/',
    'Open driver dashboard',
    t.branch_id,
    jsonb_build_object(
      'tripId', t.id,
      'tripNumber', t.trip_number,
      'scheduledDate', t.scheduled_date,
      'vehicleName', t.vehicle_name,
      'driverId', t.driver_id,
      'driverName', t.driver_name,
      'orderCount', order_count,
      'orderIds', to_jsonb(COALESCE(t.order_ids, ARRAY[]::uuid[])),
      'branchName', branch_name,
      'assignedBy', p_assigned_by,
      'interBranchRequestId', t.inter_branch_request_id,
      'ibrNumber', ibr_number,
      'destinationLabel', dest_label
    ),
    'trip_assigned_to_driver'
  );

  RETURN 1;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_driver_trip_assigned(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION notify_driver_trip_assigned(UUID, TEXT) IS
  'In-app notification to the assigned truck driver when they are assigned to a trip or inter-branch shipment.';


-- ── 24?: Purchase order approval workflow notifications ───────────────────
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS submitted_by TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS submitted_by_auth_user_id UUID;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS submitted_by_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION resolve_po_submitter_auth_user_id(p_po_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  po RECORD;
  uid UUID;
  submitter TEXT;
BEGIN
  SELECT *
  INTO po
  FROM purchase_orders
  WHERE id = p_po_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF po.submitted_by_auth_user_id IS NOT NULL THEN
    RETURN po.submitted_by_auth_user_id;
  END IF;

  IF po.submitted_by_employee_id IS NOT NULL THEN
    SELECT e.auth_user_id
    INTO uid
    FROM employees e
    WHERE e.id = po.submitted_by_employee_id
      AND e.status = 'active'::employee_status
      AND e.auth_user_id IS NOT NULL;

    IF uid IS NOT NULL THEN
      RETURN uid;
    END IF;
  END IF;

  submitter := COALESCE(
    NULLIF(trim(po.submitted_by), ''),
    (
      SELECT l.performed_by
      FROM purchase_order_logs l
      WHERE l.order_id = po.id
        AND l.action = 'submitted'
      ORDER BY l.created_at DESC
      LIMIT 1
    ),
    NULLIF(trim(po.created_by), '')
  );

  IF submitter IS NULL THEN
    RETURN NULL;
  END IF;

  IF position('@' IN submitter) > 0 THEN
    SELECT u.id
    INTO uid
    FROM auth.users u
    WHERE lower(u.email) = lower(trim(submitter))
    LIMIT 1;

    IF uid IS NOT NULL THEN
      RETURN uid;
    END IF;
  END IF;

  SELECT e.auth_user_id
  INTO uid
  FROM employees e
  WHERE e.status = 'active'::employee_status
    AND e.auth_user_id IS NOT NULL
    AND (
      e.employee_name = submitter
      OR e.email = submitter
      OR lower(trim(e.employee_name)) = lower(trim(submitter))
      OR lower(split_part(e.email, '@', 1)) = lower(trim(submitter))
    )
  ORDER BY e.updated_at DESC NULLS LAST
  LIMIT 1;

  RETURN uid;
END;
$$;

GRANT EXECUTE ON FUNCTION resolve_po_submitter_auth_user_id(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION notify_executives_po_submitted_for_approval(p_po_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  po RECORD;
  exec RECORD;
  branch_name TEXT;
  supplier_name TEXT;
  line_count INT;
  msg TEXT;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO po
  FROM purchase_orders
  WHERE id = p_po_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found: %', p_po_id;
  END IF;

  IF po.status IS DISTINCT FROM 'Requested' THEN
    RAISE EXCEPTION 'PO % is not Requested (current: %)', po.po_number, po.status;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = po.branch_id;
  SELECT name INTO supplier_name FROM suppliers WHERE id = po.supplier_id;
  SELECT COUNT(*)::INT INTO line_count FROM purchase_order_items WHERE order_id = po.id;

  msg := format(
    'PO %s submitted for approval by %s — %s, %s item(s), total %s%s',
    po.po_number,
    COALESCE(po.submitted_by, po.created_by, 'Unknown'),
    COALESCE(supplier_name, 'No supplier'),
    line_count,
    CASE WHEN po.currency = 'USD' THEN '$' ELSE '₱' END,
    to_char(COALESCE(po.total_amount, 0), 'FM999,999,990.00')
  );

  FOR exec IN
    SELECT DISTINCT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Executive'::user_role
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      exec.auth_user_id,
      'Approvals'::notification_category,
      'Purchase order awaiting approval',
      msg,
      false,
      '/purchase-orders/' || po.id::text,
      'Review PO',
      po.branch_id,
      jsonb_build_object(
        'purchaseOrderId', po.id,
        'poNumber', po.po_number,
        'supplierName', supplier_name,
        'submittedBy', po.submitted_by,
        'branchName', branch_name,
        'totalAmount', po.total_amount,
        'currency', po.currency,
        'lineCount', line_count,
        'status', po.status
      ),
      'purchase_order_submitted_for_approval'
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

CREATE OR REPLACE FUNCTION notify_po_submitter_cancelled(
  p_po_id UUID,
  p_cancelled_by TEXT DEFAULT NULL,
  p_cancellation_reason TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  po RECORD;
  submitter_uid UUID;
  branch_name TEXT;
  supplier_name TEXT;
  line_count INT;
  msg TEXT;
BEGIN
  SELECT *
  INTO po
  FROM purchase_orders
  WHERE id = p_po_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found: %', p_po_id;
  END IF;

  IF po.status IS DISTINCT FROM 'Cancelled' THEN
    RAISE EXCEPTION 'PO % is not Cancelled (current: %)', po.po_number, po.status;
  END IF;

  submitter_uid := resolve_po_submitter_auth_user_id(p_po_id);

  IF submitter_uid IS NULL THEN
    RETURN 0;
  END IF;

  IF po.submitted_by IS NOT NULL
     AND p_cancelled_by IS NOT NULL
     AND lower(trim(p_cancelled_by)) = lower(trim(po.submitted_by)) THEN
    RETURN 0;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = po.branch_id;
  SELECT name INTO supplier_name FROM suppliers WHERE id = po.supplier_id;
  SELECT COUNT(*)::INT INTO line_count FROM purchase_order_items WHERE order_id = po.id;

  msg := format(
    'PO %s was cancelled by %s%s',
    po.po_number,
    COALESCE(NULLIF(trim(p_cancelled_by), ''), 'someone'),
    CASE
      WHEN p_cancellation_reason IS NOT NULL AND trim(p_cancellation_reason) <> ''
      THEN format('. Reason: %s', p_cancellation_reason)
      ELSE ''
    END
  );

  INSERT INTO notifications (
    user_id,
    category,
    title,
    message,
    urgent,
    action_url,
    action_label,
    branch_id,
    metadata,
    event_type
  ) VALUES (
    submitter_uid,
    'System'::notification_category,
    'Purchase order cancelled',
    msg,
    true,
    '/purchase-orders/' || po.id::text,
    'View PO',
    po.branch_id,
    jsonb_build_object(
      'purchaseOrderId', po.id,
      'poNumber', po.po_number,
      'supplierName', supplier_name,
      'submittedBy', po.submitted_by,
      'cancelledBy', p_cancelled_by,
      'cancellationReason', p_cancellation_reason,
      'branchName', branch_name,
      'totalAmount', po.total_amount,
      'currency', po.currency,
      'lineCount', line_count,
      'status', po.status
    ),
    'purchase_order_cancelled'
  );

  RETURN 1;
END;
$$;

CREATE OR REPLACE FUNCTION notify_po_submitter_rejected(
  p_po_id UUID,
  p_rejected_by TEXT DEFAULT NULL,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  po RECORD;
  submitter_uid UUID;
  branch_name TEXT;
  supplier_name TEXT;
  line_count INT;
  msg TEXT;
BEGIN
  SELECT *
  INTO po
  FROM purchase_orders
  WHERE id = p_po_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found: %', p_po_id;
  END IF;

  IF po.status IS DISTINCT FROM 'Rejected' THEN
    RAISE EXCEPTION 'PO % is not Rejected (current: %)', po.po_number, po.status;
  END IF;

  submitter_uid := resolve_po_submitter_auth_user_id(p_po_id);

  IF submitter_uid IS NULL THEN
    RETURN 0;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = po.branch_id;
  SELECT name INTO supplier_name FROM suppliers WHERE id = po.supplier_id;
  SELECT COUNT(*)::INT INTO line_count FROM purchase_order_items WHERE order_id = po.id;

  msg := format(
    'PO %s was rejected%s%s',
    po.po_number,
    CASE WHEN p_rejected_by IS NOT NULL AND trim(p_rejected_by) <> '' THEN format(' by %s', p_rejected_by) ELSE '' END,
    CASE
      WHEN p_rejection_reason IS NOT NULL AND trim(p_rejection_reason) <> ''
      THEN format('. Reason: %s', p_rejection_reason)
      ELSE ''
    END
  );

  INSERT INTO notifications (
    user_id,
    category,
    title,
    message,
    urgent,
    action_url,
    action_label,
    branch_id,
    metadata,
    event_type
  ) VALUES (
    submitter_uid,
    'Approvals'::notification_category,
    'Purchase order rejected',
    msg,
    true,
    '/purchase-orders/' || po.id::text,
    'View PO',
    po.branch_id,
    jsonb_build_object(
      'purchaseOrderId', po.id,
      'poNumber', po.po_number,
      'supplierName', supplier_name,
      'submittedBy', po.submitted_by,
      'rejectedBy', p_rejected_by,
      'rejectionReason', p_rejection_reason,
      'branchName', branch_name,
      'totalAmount', po.total_amount,
      'currency', po.currency,
      'lineCount', line_count,
      'status', po.status
    ),
    'purchase_order_rejected'
  );

  RETURN 1;
END;
$$;

CREATE OR REPLACE FUNCTION notify_po_submitter_accepted(
  p_po_id UUID,
  p_accepted_by TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  po RECORD;
  submitter_uid UUID;
  branch_name TEXT;
  supplier_name TEXT;
  line_count INT;
  msg TEXT;
BEGIN
  SELECT *
  INTO po
  FROM purchase_orders
  WHERE id = p_po_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found: %', p_po_id;
  END IF;

  IF po.status IS DISTINCT FROM 'Accepted' THEN
    RAISE EXCEPTION 'PO % is not Accepted (current: %)', po.po_number, po.status;
  END IF;

  submitter_uid := resolve_po_submitter_auth_user_id(p_po_id);

  IF submitter_uid IS NULL THEN
    RETURN 0;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = po.branch_id;
  SELECT name INTO supplier_name FROM suppliers WHERE id = po.supplier_id;
  SELECT COUNT(*)::INT INTO line_count FROM purchase_order_items WHERE order_id = po.id;

  msg := format(
    'PO %s was accepted%s — confirm with the supplier when ready',
    po.po_number,
    CASE WHEN p_accepted_by IS NOT NULL AND trim(p_accepted_by) <> '' THEN format(' by %s', p_accepted_by) ELSE '' END
  );

  INSERT INTO notifications (
    user_id,
    category,
    title,
    message,
    urgent,
    action_url,
    action_label,
    branch_id,
    metadata,
    event_type
  ) VALUES (
    submitter_uid,
    'Approvals'::notification_category,
    'Purchase order accepted',
    msg,
    false,
    '/purchase-orders/' || po.id::text,
    'View PO',
    po.branch_id,
    jsonb_build_object(
      'purchaseOrderId', po.id,
      'poNumber', po.po_number,
      'supplierName', supplier_name,
      'submittedBy', po.submitted_by,
      'acceptedBy', p_accepted_by,
      'branchName', branch_name,
      'totalAmount', po.total_amount,
      'currency', po.currency,
      'lineCount', line_count,
      'status', po.status
    ),
    'purchase_order_accepted'
  );

  RETURN 1;
END;
$$;

CREATE OR REPLACE FUNCTION notify_executives_and_warehouse_po_confirmed(
  p_po_id UUID,
  p_confirmed_by TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  po RECORD;
  recipient RECORD;
  branch_name TEXT;
  supplier_name TEXT;
  line_count INT;
  msg_exec TEXT;
  msg_wh TEXT;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO po
  FROM purchase_orders
  WHERE id = p_po_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found: %', p_po_id;
  END IF;

  IF po.status IS DISTINCT FROM 'Confirmed' THEN
    RAISE EXCEPTION 'PO % is not Confirmed (current: %)', po.po_number, po.status;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = po.branch_id;
  SELECT name INTO supplier_name FROM suppliers WHERE id = po.supplier_id;
  SELECT COUNT(*)::INT INTO line_count FROM purchase_order_items WHERE order_id = po.id;

  msg_exec := format(
    'PO %s confirmed with supplier%s — %s, %s item(s), total %s%s',
    po.po_number,
    CASE WHEN p_confirmed_by IS NOT NULL AND trim(p_confirmed_by) <> '' THEN format(' by %s', p_confirmed_by) ELSE '' END,
    COALESCE(supplier_name, 'No supplier'),
    line_count,
    CASE WHEN po.currency = 'USD' THEN '$' ELSE '₱' END,
    to_char(COALESCE(po.total_amount, 0), 'FM999,999,990.00')
  );

  msg_wh := format(
    'PO %s is confirmed with %s — %s item(s) incoming%s, ready to receive',
    po.po_number,
    COALESCE(supplier_name, 'the supplier'),
    line_count,
    CASE WHEN branch_name IS NOT NULL AND trim(branch_name) <> '' THEN format(' at %s', branch_name) ELSE '' END
  );

  FOR recipient IN
    SELECT DISTINCT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Executive'::user_role
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      recipient.auth_user_id,
      'Approvals'::notification_category,
      'Purchase order confirmed',
      msg_exec,
      false,
      '/purchase-orders/' || po.id::text,
      'View PO',
      po.branch_id,
      jsonb_build_object(
        'purchaseOrderId', po.id,
        'poNumber', po.po_number,
        'supplierName', supplier_name,
        'confirmedBy', p_confirmed_by,
        'branchName', branch_name,
        'totalAmount', po.total_amount,
        'currency', po.currency,
        'lineCount', line_count,
        'status', po.status,
        'audience', 'executive'
      ),
      'purchase_order_confirmed'
    );
    inserted := inserted + 1;
  END LOOP;

  FOR recipient IN
    SELECT DISTINCT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Warehouse'::user_role
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      recipient.auth_user_id,
      'Inventory'::notification_category,
      'Purchase order ready to receive',
      msg_wh,
      false,
      '/purchase-orders/' || po.id::text,
      'Receive PO',
      po.branch_id,
      jsonb_build_object(
        'purchaseOrderId', po.id,
        'poNumber', po.po_number,
        'supplierName', supplier_name,
        'confirmedBy', p_confirmed_by,
        'branchName', branch_name,
        'totalAmount', po.total_amount,
        'currency', po.currency,
        'lineCount', line_count,
        'status', po.status,
        'audience', 'warehouse'
      ),
      'purchase_order_confirmed'
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_executives_po_submitted_for_approval(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_po_submitter_cancelled(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_po_submitter_rejected(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_po_submitter_accepted(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_executives_and_warehouse_po_confirmed(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION resolve_po_submitter_auth_user_id(UUID) IS
  'Resolve auth.users.id for the employee who submitted a purchase order.';
COMMENT ON FUNCTION notify_executives_po_submitted_for_approval(UUID) IS
  'Fan-out in-app notification to all active Executive users when a PO is submitted for approval.';
COMMENT ON FUNCTION notify_po_submitter_cancelled(UUID, TEXT, TEXT) IS
  'In-app notification to the employee who submitted a PO when it is cancelled by someone else.';
COMMENT ON FUNCTION notify_po_submitter_rejected(UUID, TEXT, TEXT) IS
  'In-app notification to the employee who submitted a PO when it is rejected.';
COMMENT ON FUNCTION notify_po_submitter_accepted(UUID, TEXT) IS
  'In-app notification to the employee who submitted a PO when it is accepted.';
COMMENT ON FUNCTION notify_executives_and_warehouse_po_confirmed(UUID, TEXT) IS
  'Fan-out in-app notification to all active Executive and Warehouse users when a PO is confirmed with the supplier.';

CREATE OR REPLACE FUNCTION notify_executives_and_warehouse_po_received(
  p_po_id UUID,
  p_received_by TEXT DEFAULT NULL,
  p_quantity_received NUMERIC DEFAULT 0,
  p_is_full BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  po RECORD;
  recipient RECORD;
  branch_name TEXT;
  supplier_name TEXT;
  line_count INT;
  total_received NUMERIC;
  total_ordered NUMERIC;
  qty_ratio TEXT;
  recorded_suffix TEXT;
  msg_exec TEXT;
  msg_wh TEXT;
  title_val TEXT;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO po
  FROM purchase_orders
  WHERE id = p_po_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found: %', p_po_id;
  END IF;

  IF po.status NOT IN ('Partially Received', 'Completed') THEN
    RAISE EXCEPTION 'PO % receive not recorded (current: %)', po.po_number, po.status;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = po.branch_id;
  SELECT name INTO supplier_name FROM suppliers WHERE id = po.supplier_id;
  SELECT COUNT(*)::INT INTO line_count FROM purchase_order_items WHERE order_id = po.id;

  SELECT
    COALESCE(SUM(quantity_received), 0),
    COALESCE(SUM(quantity_ordered), 0)
  INTO total_received, total_ordered
  FROM purchase_order_items
  WHERE order_id = po.id;

  qty_ratio := format(
    '%s / %s',
    to_char(total_received, 'FM999,999,990.##'),
    to_char(total_ordered, 'FM999,999,990.##')
  );

  recorded_suffix := CASE
    WHEN p_received_by IS NOT NULL AND trim(p_received_by) <> '' THEN format(' by %s', p_received_by)
    ELSE ''
  END;

  IF p_is_full OR po.status = 'Completed' THEN
    title_val := 'Purchase order fully received';
    msg_exec := format(
      'PO %s from %s fully received%s — %s received, %s item(s), total %s%s',
      po.po_number,
      COALESCE(supplier_name, 'supplier'),
      recorded_suffix,
      qty_ratio,
      line_count,
      CASE WHEN po.currency = 'USD' THEN '$' ELSE '₱' END,
      to_char(COALESCE(po.total_amount, 0), 'FM999,999,990.00')
    );
    msg_wh := format(
      'PO %s from %s fully received%s — %s received%s',
      po.po_number,
      COALESCE(supplier_name, 'the supplier'),
      recorded_suffix,
      qty_ratio,
      CASE WHEN branch_name IS NOT NULL AND trim(branch_name) <> '' THEN format(' at %s', branch_name) ELSE '' END
    );
  ELSE
    title_val := 'Partial receipt recorded';
    msg_exec := format(
      'Partial receipt on PO %s (%s)%s — %s received, %s item(s)',
      po.po_number,
      COALESCE(supplier_name, 'supplier'),
      recorded_suffix,
      qty_ratio,
      line_count
    );
    msg_wh := format(
      'Partial receipt on PO %s from %s%s — %s received',
      po.po_number,
      COALESCE(supplier_name, 'the supplier'),
      recorded_suffix,
      qty_ratio
    );
  END IF;

  FOR recipient IN
    SELECT DISTINCT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Executive'::user_role
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      recipient.auth_user_id,
      'Inventory'::notification_category,
      title_val,
      msg_exec,
      false,
      '/purchase-orders/' || po.id::text,
      'View PO',
      po.branch_id,
      jsonb_build_object(
        'purchaseOrderId', po.id,
        'poNumber', po.po_number,
        'supplierName', supplier_name,
        'receivedBy', p_received_by,
        'branchName', branch_name,
        'totalAmount', po.total_amount,
        'currency', po.currency,
        'lineCount', line_count,
        'status', po.status,
        'quantityReceived', total_received,
        'quantityOrdered', total_ordered,
        'quantityReceivedOnEvent', COALESCE(p_quantity_received, 0),
        'isFullReceive', p_is_full OR po.status = 'Completed',
        'audience', 'executive'
      ),
      'purchase_order_received'
    );
    inserted := inserted + 1;
  END LOOP;

  FOR recipient IN
    SELECT DISTINCT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Warehouse'::user_role
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      recipient.auth_user_id,
      'Inventory'::notification_category,
      title_val,
      msg_wh,
      false,
      '/purchase-orders/' || po.id::text,
      'View PO',
      po.branch_id,
      jsonb_build_object(
        'purchaseOrderId', po.id,
        'poNumber', po.po_number,
        'supplierName', supplier_name,
        'receivedBy', p_received_by,
        'branchName', branch_name,
        'totalAmount', po.total_amount,
        'currency', po.currency,
        'lineCount', line_count,
        'status', po.status,
        'quantityReceived', total_received,
        'quantityOrdered', total_ordered,
        'quantityReceivedOnEvent', COALESCE(p_quantity_received, 0),
        'isFullReceive', p_is_full OR po.status = 'Completed',
        'audience', 'warehouse'
      ),
      'purchase_order_received'
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

CREATE OR REPLACE FUNCTION notify_executives_po_payment_recorded(
  p_po_id UUID,
  p_recorded_by TEXT DEFAULT NULL,
  p_payment_amount NUMERIC DEFAULT 0
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  po RECORD;
  exec RECORD;
  branch_name TEXT;
  supplier_name TEXT;
  line_count INT;
  payment_total NUMERIC;
  is_paid_in_full BOOLEAN;
  notif_title TEXT;
  event_type_val TEXT;
  recorded_suffix TEXT;
  msg TEXT;
  inserted INT := 0;
BEGIN
  payment_total := COALESCE(p_payment_amount, 0);

  IF payment_total <= 0 THEN
    RETURN 0;
  END IF;

  SELECT *
  INTO po
  FROM purchase_orders
  WHERE id = p_po_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found: %', p_po_id;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = po.branch_id;
  SELECT name INTO supplier_name FROM suppliers WHERE id = po.supplier_id;
  SELECT COUNT(*)::INT INTO line_count FROM purchase_order_items WHERE order_id = po.id;

  recorded_suffix := CASE
    WHEN p_recorded_by IS NOT NULL AND trim(p_recorded_by) <> '' THEN format(' by %s', p_recorded_by)
    ELSE ''
  END;

  is_paid_in_full := COALESCE(po.amount_paid, 0) >= COALESCE(po.total_amount, 0)
    AND COALESCE(po.total_amount, 0) > 0
    OR po.payment_status = 'Paid';

  IF is_paid_in_full THEN
    notif_title := 'Purchase order paid in full';
    event_type_val := 'purchase_order_payment_completed';
    msg := format(
      'PO %s (%s) is now fully paid%s — final payment %s%s, total %s%s',
      po.po_number,
      COALESCE(supplier_name, 'supplier'),
      recorded_suffix,
      CASE WHEN po.currency = 'USD' THEN '$' ELSE '₱' END,
      to_char(payment_total, 'FM999,999,990.00'),
      CASE WHEN po.currency = 'USD' THEN '$' ELSE '₱' END,
      to_char(COALESCE(po.total_amount, 0), 'FM999,999,990.00')
    );
  ELSE
    notif_title := 'PO payment recorded';
    event_type_val := 'purchase_order_payment_recorded';
    msg := format(
      'Payment of %s%s recorded on PO %s (%s)%s — paid %s%s / total %s%s',
      CASE WHEN po.currency = 'USD' THEN '$' ELSE '₱' END,
      to_char(payment_total, 'FM999,999,990.00'),
      po.po_number,
      COALESCE(supplier_name, 'supplier'),
      recorded_suffix,
      CASE WHEN po.currency = 'USD' THEN '$' ELSE '₱' END,
      to_char(COALESCE(po.amount_paid, 0), 'FM999,999,990.00'),
      CASE WHEN po.currency = 'USD' THEN '$' ELSE '₱' END,
      to_char(COALESCE(po.total_amount, 0), 'FM999,999,990.00')
    );
  END IF;

  FOR exec IN
    SELECT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Executive'::user_role
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      exec.auth_user_id,
      'Payment'::notification_category,
      notif_title,
      msg,
      is_paid_in_full,
      '/purchase-orders/' || po.id::text,
      'View PO',
      po.branch_id,
      jsonb_build_object(
        'purchaseOrderId', po.id,
        'poNumber', po.po_number,
        'supplierName', supplier_name,
        'branchName', branch_name,
        'totalAmount', po.total_amount,
        'amountPaid', po.amount_paid,
        'paymentStatus', po.payment_status,
        'paidInFull', is_paid_in_full,
        'currency', po.currency,
        'lineCount', line_count,
        'status', po.status,
        'recordedBy', p_recorded_by,
        'paymentAmount', payment_total
      ),
      event_type_val
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

CREATE OR REPLACE FUNCTION notify_executives_po_proof_uploaded(
  p_po_id UUID,
  p_proof_type TEXT DEFAULT 'delivery',
  p_uploaded_by TEXT DEFAULT NULL,
  p_proof_count INT DEFAULT 1,
  p_proof_title TEXT DEFAULT NULL,
  p_payment_amount NUMERIC DEFAULT 0
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  po RECORD;
  recipient RECORD;
  branch_name TEXT;
  supplier_name TEXT;
  line_count INT;
  proof_type_norm TEXT;
  proof_label TEXT;
  uploaded_suffix TEXT;
  notif_title TEXT;
  notif_category notification_category;
  event_type_val TEXT;
  msg TEXT;
  inserted INT := 0;
BEGIN
  proof_type_norm := lower(trim(COALESCE(p_proof_type, 'delivery')));
  IF proof_type_norm NOT IN ('delivery', 'payment', 'other') THEN
    RAISE EXCEPTION 'Invalid proof type: % (expected delivery, payment, or other)', p_proof_type;
  END IF;

  SELECT *
  INTO po
  FROM purchase_orders
  WHERE id = p_po_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order not found: %', p_po_id;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = po.branch_id;
  SELECT name INTO supplier_name FROM suppliers WHERE id = po.supplier_id;
  SELECT COUNT(*)::INT INTO line_count FROM purchase_order_items WHERE order_id = po.id;

  proof_label := CASE proof_type_norm
    WHEN 'delivery' THEN
      CASE WHEN COALESCE(p_proof_count, 1) <= 1 THEN '1 delivery proof' ELSE format('%s delivery proofs', COALESCE(p_proof_count, 1)) END
    WHEN 'payment' THEN
      CASE WHEN COALESCE(p_proof_count, 1) <= 1 THEN '1 payment proof' ELSE format('%s payment proofs', COALESCE(p_proof_count, 1)) END
    ELSE
      CASE WHEN COALESCE(p_proof_count, 1) <= 1 THEN '1 other document' ELSE format('%s other documents', COALESCE(p_proof_count, 1)) END
  END;

  uploaded_suffix := CASE
    WHEN p_uploaded_by IS NOT NULL AND trim(p_uploaded_by) <> '' THEN format(' by %s', p_uploaded_by)
    ELSE ''
  END;

  notif_title := CASE proof_type_norm
    WHEN 'delivery' THEN 'PO delivery proof uploaded'
    WHEN 'payment' THEN 'PO payment proof uploaded'
    ELSE 'PO other document uploaded'
  END;

  notif_category := CASE proof_type_norm
    WHEN 'delivery' THEN 'Delivery'::notification_category
    WHEN 'payment' THEN 'Payment'::notification_category
    ELSE 'System'::notification_category
  END;

  event_type_val := CASE proof_type_norm
    WHEN 'delivery' THEN 'purchase_order_delivery_proof_uploaded'
    WHEN 'payment' THEN 'purchase_order_payment_proof_uploaded'
    ELSE 'purchase_order_other_proof_uploaded'
  END;

  msg := format(
    '%s uploaded for PO %s (%s)%s',
    proof_label,
    po.po_number,
    COALESCE(supplier_name, 'supplier'),
    uploaded_suffix
  );

  IF p_proof_title IS NOT NULL AND trim(p_proof_title) <> '' THEN
    msg := msg || format(' — %s', trim(p_proof_title));
  END IF;

  IF proof_type_norm = 'payment' AND COALESCE(p_payment_amount, 0) > 0 THEN
    msg := msg || format(
      ' (%s%s)',
      CASE WHEN po.currency = 'USD' THEN '$' ELSE '₱' END,
      to_char(COALESCE(p_payment_amount, 0), 'FM999,999,990.00')
    );
  END IF;

  FOR recipient IN
    SELECT DISTINCT e.auth_user_id
    FROM employees e
    WHERE e.user_role IN ('Executive'::user_role, 'Warehouse'::user_role)
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      recipient.auth_user_id,
      notif_category,
      notif_title,
      msg,
      false,
      '/purchase-orders/' || po.id::text,
      'View PO',
      po.branch_id,
      jsonb_build_object(
        'purchaseOrderId', po.id,
        'poNumber', po.po_number,
        'supplierName', supplier_name,
        'branchName', branch_name,
        'totalAmount', po.total_amount,
        'amountPaid', po.amount_paid,
        'paymentStatus', po.payment_status,
        'currency', po.currency,
        'lineCount', line_count,
        'status', po.status,
        'uploadedBy', p_uploaded_by,
        'proofCount', COALESCE(p_proof_count, 1),
        'proofType', proof_type_norm,
        'proofTitle', p_proof_title,
        'paymentAmount', COALESCE(p_payment_amount, 0)
      ),
      event_type_val
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

-- PO proof uploads are notified via the client-side RPC call (same pattern as
-- notify_agent_order_*_proof_uploaded). Drop any legacy AFTER INSERT trigger to
-- avoid double notifications.
DROP TRIGGER IF EXISTS trg_po_proof_document_notify ON public.purchase_order_proof_documents;
DROP FUNCTION IF EXISTS trg_po_proof_document_notify();

GRANT EXECUTE ON FUNCTION notify_executives_and_warehouse_po_received(UUID, TEXT, NUMERIC, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_executives_po_payment_recorded(UUID, TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_executives_po_proof_uploaded(UUID, TEXT, TEXT, INT, TEXT, NUMERIC) TO authenticated;

COMMENT ON FUNCTION notify_executives_and_warehouse_po_received(UUID, TEXT, NUMERIC, BOOLEAN) IS
  'Fan-out in-app notification to all active Executive and Warehouse users when a PO receipt is recorded.';
COMMENT ON FUNCTION notify_executives_po_payment_recorded(UUID, TEXT, NUMERIC) IS
  'In-app notification to all active executives when a payment is recorded on a purchase order.';
COMMENT ON FUNCTION notify_executives_po_proof_uploaded(UUID, TEXT, TEXT, INT, TEXT, NUMERIC) IS
  'In-app notification to active Executive and Warehouse users when a PO proof document is uploaded.';


-- Production request workflow notifications (in-app)
ALTER TABLE production_requests ADD COLUMN IF NOT EXISTS created_by_auth_user_id UUID;
ALTER TABLE production_requests ADD COLUMN IF NOT EXISTS created_by_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;
ALTER TABLE production_requests ADD COLUMN IF NOT EXISTS submitted_by TEXT;
ALTER TABLE production_requests ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE production_requests ADD COLUMN IF NOT EXISTS submitted_by_auth_user_id UUID;
ALTER TABLE production_requests ADD COLUMN IF NOT EXISTS submitted_by_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION resolve_pr_submitter_auth_user_id(p_pr_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pr RECORD;
  uid UUID;
  submitter TEXT;
  submitter_base TEXT;
BEGIN
  SELECT *
  INTO pr
  FROM production_requests
  WHERE id = p_pr_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF pr.submitted_by_auth_user_id IS NOT NULL THEN
    RETURN pr.submitted_by_auth_user_id;
  END IF;

  IF pr.submitted_by_employee_id IS NOT NULL THEN
    SELECT e.auth_user_id
    INTO uid
    FROM employees e
    WHERE e.id = pr.submitted_by_employee_id
      AND e.status = 'active'::employee_status
      AND e.auth_user_id IS NOT NULL;

    IF uid IS NOT NULL THEN
      RETURN uid;
    END IF;
  END IF;

  IF pr.created_by_auth_user_id IS NOT NULL THEN
    RETURN pr.created_by_auth_user_id;
  END IF;

  IF pr.created_by_employee_id IS NOT NULL THEN
    SELECT e.auth_user_id
    INTO uid
    FROM employees e
    WHERE e.id = pr.created_by_employee_id
      AND e.status = 'active'::employee_status
      AND e.auth_user_id IS NOT NULL;

    IF uid IS NOT NULL THEN
      RETURN uid;
    END IF;
  END IF;

  submitter := COALESCE(
    NULLIF(trim(pr.submitted_by), ''),
    (
      SELECT l.performed_by
      FROM production_request_logs l
      WHERE l.request_id = pr.id
        AND l.action = 'submitted'
      ORDER BY l.created_at DESC
      LIMIT 1
    ),
    NULLIF(trim(pr.created_by), ''),
    (
      SELECT l.performed_by
      FROM production_request_logs l
      WHERE l.request_id = pr.id
        AND l.action = 'drafted'
      ORDER BY l.created_at ASC
      LIMIT 1
    )
  );

  IF submitter IS NULL THEN
    RETURN NULL;
  END IF;

  submitter_base := trim(split_part(submitter, ' (', 1));

  IF position('@' IN submitter) > 0 THEN
    SELECT u.id
    INTO uid
    FROM auth.users u
    WHERE lower(u.email) = lower(trim(submitter))
    LIMIT 1;

    IF uid IS NOT NULL THEN
      RETURN uid;
    END IF;
  END IF;

  SELECT e.auth_user_id
  INTO uid
  FROM employees e
  WHERE e.status = 'active'::employee_status
    AND e.auth_user_id IS NOT NULL
    AND (
      e.employee_name = submitter
      OR e.email = submitter
      OR lower(trim(e.employee_name)) = lower(trim(submitter))
      OR lower(trim(e.employee_name)) = lower(submitter_base)
      OR lower(split_part(e.email, '@', 1)) = lower(trim(submitter))
      OR lower(split_part(e.email, '@', 1)) = lower(submitter_base)
    )
  ORDER BY e.updated_at DESC NULLS LAST
  LIMIT 1;

  RETURN uid;
END;
$$;

CREATE OR REPLACE FUNCTION notify_executives_pr_submitted_for_approval(p_pr_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pr RECORD;
  branch_name TEXT;
  line_count INT;
  msg TEXT;
  submitter_uid UUID;
  recipient UUID;
  recipients UUID[] := ARRAY[]::UUID[];
  inserted INT := 0;
BEGIN
  SELECT *
  INTO pr
  FROM production_requests
  WHERE id = p_pr_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Production request not found: %', p_pr_id;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = pr.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM production_request_items WHERE request_id = pr.id;

  msg := format(
    'PR %s submitted for approval by %s — %s, %s product line(s)',
    pr.pr_number,
    COALESCE(pr.submitted_by, pr.created_by, 'Unknown'),
    COALESCE(branch_name, 'No branch'),
    line_count
  );

  SELECT COALESCE(array_agg(DISTINCT e.auth_user_id), ARRAY[]::UUID[])
  INTO recipients
  FROM employees e
  WHERE e.user_role = 'Executive'::user_role
    AND e.auth_user_id IS NOT NULL
    AND e.status = 'active'::employee_status;

  submitter_uid := resolve_pr_submitter_auth_user_id(p_pr_id);
  IF submitter_uid IS NOT NULL AND NOT (submitter_uid = ANY(recipients)) THEN
    recipients := array_append(recipients, submitter_uid);
  END IF;

  FOREACH recipient IN ARRAY recipients
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      recipient,
      'Approvals'::notification_category,
      'Production request awaiting approval',
      msg,
      false,
      '/production-requests/' || pr.id::text,
      'Review PR',
      pr.branch_id,
      jsonb_build_object(
        'productionRequestId', pr.id,
        'prNumber', pr.pr_number,
        'submittedBy', pr.submitted_by,
        'createdBy', pr.created_by,
        'branchName', branch_name,
        'lineCount', line_count,
        'status', pr.status
      ),
      'production_request_submitted_for_approval'
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

CREATE OR REPLACE FUNCTION notify_pr_submitter_cancelled(
  p_pr_id UUID,
  p_cancelled_by TEXT DEFAULT NULL,
  p_cancellation_reason TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pr RECORD;
  submitter_uid UUID;
  branch_name TEXT;
  line_count INT;
  msg TEXT;
  recipient UUID;
  recipients UUID[] := ARRAY[]::UUID[];
  inserted INT := 0;
BEGIN
  SELECT *
  INTO pr
  FROM production_requests
  WHERE id = p_pr_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Production request not found: %', p_pr_id;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = pr.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM production_request_items WHERE request_id = pr.id;

  msg := format(
    'PR %s was cancelled by %s%s',
    pr.pr_number,
    COALESCE(NULLIF(trim(p_cancelled_by), ''), 'someone'),
    CASE
      WHEN p_cancellation_reason IS NOT NULL AND trim(p_cancellation_reason) <> ''
      THEN format('. Reason: %s', p_cancellation_reason)
      ELSE ''
    END
  );

  submitter_uid := resolve_pr_submitter_auth_user_id(p_pr_id);
  IF submitter_uid IS NOT NULL THEN
    recipients := array_append(recipients, submitter_uid);
  END IF;

  SELECT COALESCE(array_agg(DISTINCT e.auth_user_id), ARRAY[]::UUID[])
  INTO recipients
  FROM (
    SELECT unnest(recipients) AS auth_user_id
    UNION
    SELECT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Executive'::user_role
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  ) e
  WHERE e.auth_user_id IS NOT NULL;

  FOREACH recipient IN ARRAY recipients
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      recipient,
      'System'::notification_category,
      'Production request cancelled',
      msg,
      true,
      '/production-requests/' || pr.id::text,
      'View PR',
      pr.branch_id,
      jsonb_build_object(
        'productionRequestId', pr.id,
        'prNumber', pr.pr_number,
        'submittedBy', pr.submitted_by,
        'createdBy', pr.created_by,
        'cancelledBy', p_cancelled_by,
        'cancellationReason', p_cancellation_reason,
        'branchName', branch_name,
        'lineCount', line_count,
        'status', pr.status
      ),
      'production_request_cancelled'
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

CREATE OR REPLACE FUNCTION notify_pr_submitter_accepted(
  p_pr_id UUID,
  p_accepted_by TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pr RECORD;
  submitter_uid UUID;
  branch_name TEXT;
  line_count INT;
  msg TEXT;
BEGIN
  SELECT *
  INTO pr
  FROM production_requests
  WHERE id = p_pr_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Production request not found: %', p_pr_id;
  END IF;

  submitter_uid := resolve_pr_submitter_auth_user_id(p_pr_id);

  IF submitter_uid IS NULL THEN
    RETURN 0;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = pr.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM production_request_items WHERE request_id = pr.id;

  msg := format(
    'PR %s was accepted%s — ready to schedule production',
    pr.pr_number,
    CASE WHEN p_accepted_by IS NOT NULL AND trim(p_accepted_by) <> '' THEN format(' by %s', p_accepted_by) ELSE '' END
  );

  INSERT INTO notifications (
    user_id,
    category,
    title,
    message,
    urgent,
    action_url,
    action_label,
    branch_id,
    metadata,
    event_type
  ) VALUES (
    submitter_uid,
    'Approvals'::notification_category,
    'Production request accepted',
    msg,
    false,
    '/production-requests/' || pr.id::text,
    'View PR',
    pr.branch_id,
    jsonb_build_object(
      'productionRequestId', pr.id,
      'prNumber', pr.pr_number,
      'submittedBy', pr.submitted_by,
      'createdBy', pr.created_by,
      'acceptedBy', p_accepted_by,
      'branchName', branch_name,
      'lineCount', line_count,
      'status', pr.status
    ),
    'production_request_accepted'
  );

  RETURN 1;
END;
$$;

CREATE OR REPLACE FUNCTION notify_pr_submitter_rejected(
  p_pr_id UUID,
  p_rejected_by TEXT DEFAULT NULL,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pr RECORD;
  submitter_uid UUID;
  branch_name TEXT;
  line_count INT;
  msg TEXT;
BEGIN
  SELECT *
  INTO pr
  FROM production_requests
  WHERE id = p_pr_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Production request not found: %', p_pr_id;
  END IF;

  submitter_uid := resolve_pr_submitter_auth_user_id(p_pr_id);

  IF submitter_uid IS NULL THEN
    RETURN 0;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = pr.branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM production_request_items WHERE request_id = pr.id;

  msg := format(
    'PR %s was rejected%s%s',
    pr.pr_number,
    CASE WHEN p_rejected_by IS NOT NULL AND trim(p_rejected_by) <> '' THEN format(' by %s', p_rejected_by) ELSE '' END,
    CASE
      WHEN p_rejection_reason IS NOT NULL AND trim(p_rejection_reason) <> ''
      THEN format('. Reason: %s', p_rejection_reason)
      ELSE ''
    END
  );

  INSERT INTO notifications (
    user_id,
    category,
    title,
    message,
    urgent,
    action_url,
    action_label,
    branch_id,
    metadata,
    event_type
  ) VALUES (
    submitter_uid,
    'Approvals'::notification_category,
    'Production request rejected',
    msg,
    true,
    '/production-requests/' || pr.id::text,
    'View PR',
    pr.branch_id,
    jsonb_build_object(
      'productionRequestId', pr.id,
      'prNumber', pr.pr_number,
      'submittedBy', pr.submitted_by,
      'createdBy', pr.created_by,
      'rejectedBy', p_rejected_by,
      'rejectionReason', p_rejection_reason,
      'branchName', branch_name,
      'lineCount', line_count,
      'status', pr.status
    ),
    'production_request_rejected'
  );

  RETURN 1;
END;
$$;

CREATE OR REPLACE FUNCTION notify_warehouse_and_executives_pr_started(
  p_pr_id UUID,
  p_started_by TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pr RECORD;
  branch_name TEXT;
  line_count INT;
  total_qty INT;
  msg TEXT;
  recipient UUID;
  recipients UUID[] := ARRAY[]::UUID[];
  inserted INT := 0;
BEGIN
  SELECT *
  INTO pr
  FROM production_requests
  WHERE id = p_pr_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Production request not found: %', p_pr_id;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = pr.branch_id;
  SELECT COUNT(*)::INT, COALESCE(SUM(quantity), 0)::INT
  INTO line_count, total_qty
  FROM production_request_items
  WHERE request_id = pr.id;

  msg := format(
    'PR %s production started%s — %s, %s product line(s), %s total unit(s)',
    pr.pr_number,
    CASE WHEN p_started_by IS NOT NULL AND trim(p_started_by) <> '' THEN format(' by %s', p_started_by) ELSE '' END,
    COALESCE(branch_name, 'No branch'),
    line_count,
    total_qty
  );

  SELECT COALESCE(array_agg(DISTINCT e.auth_user_id), ARRAY[]::UUID[])
  INTO recipients
  FROM employees e
  WHERE e.user_role IN ('Warehouse'::user_role, 'Executive'::user_role)
    AND e.auth_user_id IS NOT NULL
    AND e.status = 'active'::employee_status;

  FOREACH recipient IN ARRAY recipients
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      recipient,
      'System'::notification_category,
      'Production started',
      msg,
      false,
      '/production-requests/' || pr.id::text,
      'View PR',
      pr.branch_id,
      jsonb_build_object(
        'productionRequestId', pr.id,
        'prNumber', pr.pr_number,
        'startedBy', p_started_by,
        'branchName', branch_name,
        'lineCount', line_count,
        'totalQuantity', total_qty,
        'status', pr.status
      ),
      'production_request_started'
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

CREATE OR REPLACE FUNCTION notify_warehouse_pr_inventory_added(
  p_pr_id UUID,
  p_recorded_by TEXT DEFAULT NULL,
  p_added_units NUMERIC DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pr RECORD;
  branch_name TEXT;
  line_count INT;
  produced_qty INT;
  msg TEXT;
  recipient UUID;
  recipients UUID[] := ARRAY[]::UUID[];
  inserted INT := 0;
BEGIN
  SELECT *
  INTO pr
  FROM production_requests
  WHERE id = p_pr_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Production request not found: %', p_pr_id;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = pr.branch_id;
  SELECT COUNT(*)::INT, COALESCE(SUM(quantity_completed), 0)::INT
  INTO line_count, produced_qty
  FROM production_request_items
  WHERE request_id = pr.id;

  msg := format(
    'PR %s added %s new unit(s) to %s stock%s — %s total unit(s) produced',
    pr.pr_number,
    COALESCE(to_char(p_added_units, 'FM999,999,990.##'), '0'),
    COALESCE(branch_name, 'branch'),
    CASE WHEN p_recorded_by IS NOT NULL AND trim(p_recorded_by) <> '' THEN format(' by %s', p_recorded_by) ELSE '' END,
    produced_qty
  );

  SELECT COALESCE(array_agg(DISTINCT e.auth_user_id), ARRAY[]::UUID[])
  INTO recipients
  FROM employees e
  WHERE e.user_role = 'Warehouse'::user_role
    AND e.auth_user_id IS NOT NULL
    AND e.status = 'active'::employee_status;

  FOREACH recipient IN ARRAY recipients
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      recipient,
      'Inventory'::notification_category,
      'New inventory from production',
      msg,
      false,
      '/production-requests/' || pr.id::text,
      'View PR',
      pr.branch_id,
      jsonb_build_object(
        'productionRequestId', pr.id,
        'prNumber', pr.pr_number,
        'recordedBy', p_recorded_by,
        'addedUnits', p_added_units,
        'branchName', branch_name,
        'lineCount', line_count,
        'producedQuantity', produced_qty,
        'status', pr.status
      ),
      'production_request_inventory_added'
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

CREATE OR REPLACE FUNCTION notify_warehouse_and_executives_pr_completed(
  p_pr_id UUID,
  p_completed_by TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pr RECORD;
  branch_name TEXT;
  line_count INT;
  total_qty INT;
  produced_qty INT;
  msg TEXT;
  recipient UUID;
  recipients UUID[] := ARRAY[]::UUID[];
  inserted INT := 0;
BEGIN
  SELECT *
  INTO pr
  FROM production_requests
  WHERE id = p_pr_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Production request not found: %', p_pr_id;
  END IF;

  SELECT name INTO branch_name FROM branches WHERE id = pr.branch_id;
  SELECT COUNT(*)::INT, COALESCE(SUM(quantity), 0)::INT, COALESCE(SUM(quantity_completed), 0)::INT
  INTO line_count, total_qty, produced_qty
  FROM production_request_items
  WHERE request_id = pr.id;

  msg := format(
    'PR %s production completed%s — %s, %s product line(s), %s unit(s) produced',
    pr.pr_number,
    CASE WHEN p_completed_by IS NOT NULL AND trim(p_completed_by) <> '' THEN format(' by %s', p_completed_by) ELSE '' END,
    COALESCE(branch_name, 'No branch'),
    line_count,
    produced_qty
  );

  SELECT COALESCE(array_agg(DISTINCT e.auth_user_id), ARRAY[]::UUID[])
  INTO recipients
  FROM employees e
  WHERE e.user_role IN ('Warehouse'::user_role, 'Executive'::user_role)
    AND e.auth_user_id IS NOT NULL
    AND e.status = 'active'::employee_status;

  FOREACH recipient IN ARRAY recipients
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      recipient,
      'System'::notification_category,
      'Production completed',
      msg,
      false,
      '/production-requests/' || pr.id::text,
      'View PR',
      pr.branch_id,
      jsonb_build_object(
        'productionRequestId', pr.id,
        'prNumber', pr.pr_number,
        'completedBy', p_completed_by,
        'branchName', branch_name,
        'lineCount', line_count,
        'totalQuantity', total_qty,
        'producedQuantity', produced_qty,
        'status', pr.status
      ),
      'production_request_completed'
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

DROP FUNCTION IF EXISTS notify_pr_creator_cancelled(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS resolve_pr_creator_auth_user_id(UUID);
DROP FUNCTION IF EXISTS notify_executives_pr_completed(UUID, TEXT);

GRANT EXECUTE ON FUNCTION resolve_pr_submitter_auth_user_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_executives_pr_submitted_for_approval(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_pr_submitter_cancelled(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_pr_submitter_accepted(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_pr_submitter_rejected(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_warehouse_and_executives_pr_started(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_warehouse_pr_inventory_added(UUID, TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_warehouse_and_executives_pr_completed(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION resolve_pr_submitter_auth_user_id(UUID) IS
  'Resolve auth.users.id for the employee who submitted a production request.';
COMMENT ON FUNCTION notify_executives_pr_submitted_for_approval(UUID) IS
  'Fan-out in-app notification to all active Executive users when a PR is submitted for approval.';
COMMENT ON FUNCTION notify_pr_submitter_cancelled(UUID, TEXT, TEXT) IS
  'In-app notification to the employee who submitted a PR when it is cancelled by someone else.';
COMMENT ON FUNCTION notify_pr_submitter_accepted(UUID, TEXT) IS
  'In-app notification to the PR submitter when an executive accepts the request.';
COMMENT ON FUNCTION notify_pr_submitter_rejected(UUID, TEXT, TEXT) IS
  'In-app notification to the PR submitter when an executive rejects the request.';
COMMENT ON FUNCTION notify_warehouse_and_executives_pr_started(UUID, TEXT) IS
  'Fan-out in-app notification to all active Warehouse staff and Executives when PR production starts.';
COMMENT ON FUNCTION notify_warehouse_pr_inventory_added(UUID, TEXT, NUMERIC) IS
  'In-app notification to active Warehouse staff when recording production adds new finished stock.';
COMMENT ON FUNCTION notify_warehouse_and_executives_pr_completed(UUID, TEXT) IS
  'Fan-out in-app notification to all active Warehouse staff and Executives when PR production completes.';

-- Inter-branch request (IBR) workflow notifications
CREATE OR REPLACE FUNCTION ibr_notify_warehouse_branch(
  p_branch_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_ibr_id UUID,
  p_event_type TEXT,
  p_metadata JSONB,
  p_category notification_category DEFAULT 'Inventory'::notification_category,
  p_urgent BOOLEAN DEFAULT false
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient UUID;
  inserted INT := 0;
BEGIN
  IF p_branch_id IS NULL THEN
    RETURN 0;
  END IF;

  FOR recipient IN
    SELECT DISTINCT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Warehouse'::user_role
      AND e.branch_id = p_branch_id
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      recipient,
      p_category,
      p_title,
      p_message,
      p_urgent,
      '/inter-branch-requests/' || p_ibr_id::text,
      'View IBR',
      p_branch_id,
      p_metadata,
      p_event_type
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

CREATE OR REPLACE FUNCTION ibr_notify_logistics_branch(
  p_branch_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_ibr_id UUID,
  p_event_type TEXT,
  p_metadata JSONB,
  p_category notification_category DEFAULT 'Delivery'::notification_category,
  p_urgent BOOLEAN DEFAULT false
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient UUID;
  inserted INT := 0;
BEGIN
  IF p_branch_id IS NULL THEN
    RETURN 0;
  END IF;

  FOR recipient IN
    SELECT DISTINCT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Logistics'::user_role
      AND e.branch_id = p_branch_id
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      recipient,
      p_category,
      p_title,
      p_message,
      p_urgent,
      '/inter-branch-requests/' || p_ibr_id::text,
      'View IBR',
      p_branch_id,
      p_metadata,
      p_event_type
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

CREATE OR REPLACE FUNCTION notify_executives_ibr_submitted_for_approval(p_ibr_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ibr RECORD;
  req_name TEXT;
  ful_name TEXT;
  line_count INT;
  msg TEXT;
  recipient UUID;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO ibr
  FROM inter_branch_requests
  WHERE id = p_ibr_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inter-branch request not found: %', p_ibr_id;
  END IF;

  IF ibr.status IS DISTINCT FROM 'Pending' THEN
    RAISE EXCEPTION 'IBR % is not Pending (current: %)', ibr.ibr_number, ibr.status;
  END IF;

  SELECT name INTO req_name FROM branches WHERE id = ibr.requesting_branch_id;
  SELECT name INTO ful_name FROM branches WHERE id = ibr.fulfilling_branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM inter_branch_request_items WHERE request_id = ibr.id;

  msg := format(
    'IBR %s submitted for approval — %s → %s, %s line(s)',
    ibr.ibr_number,
    COALESCE(req_name, 'Requesting branch'),
    COALESCE(ful_name, 'Fulfilling branch'),
    line_count
  );

  FOR recipient IN
    SELECT DISTINCT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Executive'::user_role
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      recipient,
      'Approvals'::notification_category,
      'Inter-branch request awaiting approval',
      msg,
      false,
      '/inter-branch-requests/' || ibr.id::text,
      'Review IBR',
      ibr.requesting_branch_id,
      jsonb_build_object(
        'interBranchRequestId', ibr.id,
        'ibrNumber', ibr.ibr_number,
        'requestingBranchId', ibr.requesting_branch_id,
        'fulfillingBranchId', ibr.fulfilling_branch_id,
        'requestingBranchName', req_name,
        'fulfillingBranchName', ful_name,
        'submittedBy', ibr.created_by,
        'lineCount', line_count,
        'status', ibr.status
      ),
      'ibr_submitted_for_approval'
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

CREATE OR REPLACE FUNCTION notify_both_branches_ibr_approved(
  p_ibr_id UUID,
  p_approved_by TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ibr RECORD;
  req_name TEXT;
  ful_name TEXT;
  line_count INT;
  msg TEXT;
  meta JSONB;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO ibr
  FROM inter_branch_requests
  WHERE id = p_ibr_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inter-branch request not found: %', p_ibr_id;
  END IF;

  IF ibr.status IS DISTINCT FROM 'Approved' THEN
    RAISE EXCEPTION 'IBR % is not Approved (current: %)', ibr.ibr_number, ibr.status;
  END IF;

  SELECT name INTO req_name FROM branches WHERE id = ibr.requesting_branch_id;
  SELECT name INTO ful_name FROM branches WHERE id = ibr.fulfilling_branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM inter_branch_request_items WHERE request_id = ibr.id;

  msg := format(
    'IBR %s approved%s — %s → %s, %s line(s)',
    ibr.ibr_number,
    CASE WHEN p_approved_by IS NOT NULL AND trim(p_approved_by) <> '' THEN format(' by %s', p_approved_by) ELSE '' END,
    COALESCE(req_name, 'Requesting branch'),
    COALESCE(ful_name, 'Fulfilling branch'),
    line_count
  );

  meta := jsonb_build_object(
    'interBranchRequestId', ibr.id,
    'ibrNumber', ibr.ibr_number,
    'requestingBranchId', ibr.requesting_branch_id,
    'fulfillingBranchId', ibr.fulfilling_branch_id,
    'requestingBranchName', req_name,
    'fulfillingBranchName', ful_name,
    'approvedBy', p_approved_by,
    'lineCount', line_count,
    'status', ibr.status
  );

  inserted := inserted + ibr_notify_warehouse_branch(
    ibr.requesting_branch_id,
    'Inter-branch request approved',
    msg,
    ibr.id,
    'ibr_approved',
    meta,
    'Inventory'::notification_category,
    false
  );

  inserted := inserted + ibr_notify_warehouse_branch(
    ibr.fulfilling_branch_id,
    'Inter-branch request approved',
    msg,
    ibr.id,
    'ibr_approved',
    meta,
    'Inventory'::notification_category,
    false
  );

  inserted := inserted + ibr_notify_logistics_branch(
    ibr.fulfilling_branch_id,
    'Inter-branch request approved',
    msg,
    ibr.id,
    'ibr_approved',
    meta,
    'Delivery'::notification_category,
    false
  );

  RETURN inserted;
END;
$$;

CREATE OR REPLACE FUNCTION notify_requesting_branch_ibr_status(
  p_ibr_id UUID,
  p_status TEXT,
  p_actor TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ibr RECORD;
  req_name TEXT;
  ful_name TEXT;
  line_count INT;
  title TEXT;
  msg TEXT;
  meta JSONB;
  trip_vehicle TEXT;
  trip_driver TEXT;
  trip_number TEXT;
  depart_label TEXT;
  logistics_suffix TEXT;
  inserted INT := 0;
BEGIN
  IF p_status NOT IN ('Scheduled', 'Loading', 'Packed', 'Ready', 'In Transit') THEN
    RAISE EXCEPTION 'Unsupported IBR logistics status for requesting-branch notify: %', p_status;
  END IF;

  SELECT *
  INTO ibr
  FROM inter_branch_requests
  WHERE id = p_ibr_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inter-branch request not found: %', p_ibr_id;
  END IF;

  IF ibr.status IS DISTINCT FROM p_status THEN
    RAISE EXCEPTION 'IBR % status mismatch (expected %, current: %)', ibr.ibr_number, p_status, ibr.status;
  END IF;

  SELECT name INTO req_name FROM branches WHERE id = ibr.requesting_branch_id;
  SELECT name INTO ful_name FROM branches WHERE id = ibr.fulfilling_branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM inter_branch_request_items WHERE request_id = ibr.id;

  trip_vehicle := NULL;
  trip_driver := NULL;
  trip_number := NULL;
  IF ibr.linked_trip_id IS NOT NULL THEN
    SELECT tr.vehicle_name, tr.driver_name, tr.trip_number
    INTO trip_vehicle, trip_driver, trip_number
    FROM trips tr
    WHERE tr.id = ibr.linked_trip_id;
  END IF;

  depart_label := CASE
    WHEN ibr.scheduled_departure_date IS NOT NULL THEN to_char(ibr.scheduled_departure_date, 'Mon DD, YYYY')
    ELSE NULL
  END;

  title := CASE p_status
    WHEN 'Scheduled' THEN 'Inter-branch shipment scheduled'
    WHEN 'Loading' THEN 'Inter-branch shipment loading'
    WHEN 'Packed' THEN 'Inter-branch shipment packed'
    WHEN 'Ready' THEN 'Inter-branch shipment ready'
    WHEN 'In Transit' THEN 'Inter-branch shipment in transit'
    ELSE 'Inter-branch status update'
  END;

  msg := format(
    'IBR %s is now %s%s — from %s to %s',
    ibr.ibr_number,
    p_status,
    CASE WHEN p_actor IS NOT NULL AND trim(p_actor) <> '' THEN format(' (updated by %s)', p_actor) ELSE '' END,
    COALESCE(ful_name, 'Fulfilling branch'),
    COALESCE(req_name, 'Requesting branch')
  );

  logistics_suffix := NULL;
  IF trip_vehicle IS NOT NULL OR trip_driver IS NOT NULL OR depart_label IS NOT NULL THEN
    logistics_suffix := format(
      ' Truck: %s',
      COALESCE(NULLIF(trim(trip_vehicle), ''), 'TBD')
    );
    IF trip_driver IS NOT NULL AND trim(trip_driver) <> '' AND trim(trip_driver) <> '—' THEN
      logistics_suffix := logistics_suffix || format(', driver: %s', trim(trip_driver));
    END IF;
    IF depart_label IS NOT NULL THEN
      logistics_suffix := logistics_suffix || format(', departing %s', depart_label);
    END IF;
    msg := msg || '.' || logistics_suffix;
  END IF;

  meta := jsonb_build_object(
    'interBranchRequestId', ibr.id,
    'ibrNumber', ibr.ibr_number,
    'requestingBranchId', ibr.requesting_branch_id,
    'fulfillingBranchId', ibr.fulfilling_branch_id,
    'requestingBranchName', req_name,
    'fulfillingBranchName', ful_name,
    'status', ibr.status,
    'actor', p_actor,
    'lineCount', line_count,
    'scheduledDepartureDate', ibr.scheduled_departure_date,
    'linkedTripId', ibr.linked_trip_id,
    'tripNumber', trip_number,
    'vehicleName', trip_vehicle,
    'driverName', trip_driver
  );

  IF p_status = 'Scheduled' THEN
    inserted := inserted + ibr_notify_warehouse_branch(
      ibr.requesting_branch_id,
      title,
      msg,
      ibr.id,
      'ibr_' || lower(replace(p_status, ' ', '_')),
      meta,
      'Delivery'::notification_category,
      false
    );
  ELSIF p_status = 'Loading' THEN
    inserted := inserted + ibr_notify_logistics_branch(
      ibr.fulfilling_branch_id,
      title,
      msg,
      ibr.id,
      'ibr_loading',
      meta,
      'Delivery'::notification_category,
      false
    );
    inserted := inserted + ibr_notify_warehouse_branch(
      ibr.fulfilling_branch_id,
      title,
      msg,
      ibr.id,
      'ibr_loading',
      meta,
      'Delivery'::notification_category,
      false
    );
  ELSIF p_status IN ('Packed', 'Ready') THEN
    inserted := inserted + ibr_notify_logistics_branch(
      ibr.fulfilling_branch_id,
      title,
      msg,
      ibr.id,
      'ibr_' || lower(replace(p_status, ' ', '_')),
      meta,
      'Delivery'::notification_category,
      false
    );
  ELSIF p_status = 'In Transit' THEN
    inserted := inserted + ibr_notify_warehouse_branch(
      ibr.requesting_branch_id,
      title,
      msg,
      ibr.id,
      'ibr_in_transit',
      meta,
      'Delivery'::notification_category,
      false
    );
    inserted := inserted + ibr_notify_warehouse_branch(
      ibr.fulfilling_branch_id,
      title,
      msg,
      ibr.id,
      'ibr_in_transit',
      meta,
      'Delivery'::notification_category,
      false
    );
  END IF;

  RETURN inserted;
END;
$$;

CREATE OR REPLACE FUNCTION notify_both_branches_ibr_delivery_recorded(
  p_ibr_id UUID,
  p_actor TEXT DEFAULT NULL,
  p_new_status TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ibr RECORD;
  req_name TEXT;
  ful_name TEXT;
  line_count INT;
  effective_status TEXT;
  msg TEXT;
  meta JSONB;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO ibr
  FROM inter_branch_requests
  WHERE id = p_ibr_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inter-branch request not found: %', p_ibr_id;
  END IF;

  effective_status := COALESCE(NULLIF(trim(p_new_status), ''), ibr.status);

  IF effective_status NOT IN ('Delivered', 'Partially Fulfilled') THEN
    RAISE EXCEPTION 'IBR % delivery notify requires Delivered or Partially Fulfilled (current: %)', ibr.ibr_number, effective_status;
  END IF;

  SELECT name INTO req_name FROM branches WHERE id = ibr.requesting_branch_id;
  SELECT name INTO ful_name FROM branches WHERE id = ibr.fulfilling_branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM inter_branch_request_items WHERE request_id = ibr.id;

  msg := format(
    'IBR %s delivery recorded at %s → %s%s',
    ibr.ibr_number,
    COALESCE(req_name, 'Requesting branch'),
    effective_status,
    CASE WHEN p_actor IS NOT NULL AND trim(p_actor) <> '' THEN format(' by %s', p_actor) ELSE '' END
  );

  meta := jsonb_build_object(
    'interBranchRequestId', ibr.id,
    'ibrNumber', ibr.ibr_number,
    'requestingBranchId', ibr.requesting_branch_id,
    'fulfillingBranchId', ibr.fulfilling_branch_id,
    'requestingBranchName', req_name,
    'fulfillingBranchName', ful_name,
    'status', effective_status,
    'recordedBy', p_actor,
    'lineCount', line_count
  );

  inserted := inserted + ibr_notify_warehouse_branch(
    ibr.requesting_branch_id,
    'Inter-branch delivery recorded',
    msg,
    ibr.id,
    'ibr_delivery_recorded',
    meta,
    'Delivery'::notification_category,
    false
  );

  inserted := inserted + ibr_notify_warehouse_branch(
    ibr.fulfilling_branch_id,
    'Inter-branch delivery recorded',
    msg,
    ibr.id,
    'ibr_delivery_recorded',
    meta,
    'Delivery'::notification_category,
    false
  );

  RETURN inserted;
END;
$$;

CREATE OR REPLACE FUNCTION notify_both_branches_and_executives_ibr_fulfilled(
  p_ibr_id UUID,
  p_fulfilled_by TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ibr RECORD;
  req_name TEXT;
  ful_name TEXT;
  line_count INT;
  msg TEXT;
  meta JSONB;
  recipient UUID;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO ibr
  FROM inter_branch_requests
  WHERE id = p_ibr_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inter-branch request not found: %', p_ibr_id;
  END IF;

  IF ibr.status IS DISTINCT FROM 'Fulfilled' THEN
    RAISE EXCEPTION 'IBR % is not Fulfilled (current: %)', ibr.ibr_number, ibr.status;
  END IF;

  SELECT name INTO req_name FROM branches WHERE id = ibr.requesting_branch_id;
  SELECT name INTO ful_name FROM branches WHERE id = ibr.fulfilling_branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM inter_branch_request_items WHERE request_id = ibr.id;

  msg := format(
    'IBR %s marked fulfilled and closed%s — %s ↔ %s',
    ibr.ibr_number,
    CASE WHEN p_fulfilled_by IS NOT NULL AND trim(p_fulfilled_by) <> '' THEN format(' by %s', p_fulfilled_by) ELSE '' END,
    COALESCE(req_name, 'Requesting branch'),
    COALESCE(ful_name, 'Fulfilling branch')
  );

  meta := jsonb_build_object(
    'interBranchRequestId', ibr.id,
    'ibrNumber', ibr.ibr_number,
    'requestingBranchId', ibr.requesting_branch_id,
    'fulfillingBranchId', ibr.fulfilling_branch_id,
    'requestingBranchName', req_name,
    'fulfillingBranchName', ful_name,
    'fulfilledBy', p_fulfilled_by,
    'lineCount', line_count,
    'status', ibr.status
  );

  inserted := inserted + ibr_notify_warehouse_branch(
    ibr.requesting_branch_id,
    'Inter-branch request fulfilled',
    msg,
    ibr.id,
    'ibr_fulfilled',
    meta,
    'Inventory'::notification_category,
    false
  );

  inserted := inserted + ibr_notify_warehouse_branch(
    ibr.fulfilling_branch_id,
    'Inter-branch request fulfilled',
    msg,
    ibr.id,
    'ibr_fulfilled',
    meta,
    'Inventory'::notification_category,
    false
  );

  FOR recipient IN
    SELECT DISTINCT e.auth_user_id
    FROM employees e
    WHERE e.user_role = 'Executive'::user_role
      AND e.auth_user_id IS NOT NULL
      AND e.status = 'active'::employee_status
  LOOP
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      recipient,
      'Inventory'::notification_category,
      'Inter-branch request fulfilled',
      msg,
      false,
      '/inter-branch-requests/' || ibr.id::text,
      'View IBR',
      ibr.requesting_branch_id,
      meta,
      'ibr_fulfilled'
    );
    inserted := inserted + 1;
  END LOOP;

  RETURN inserted;
END;
$$;

CREATE OR REPLACE FUNCTION notify_both_branches_ibr_cancelled(
  p_ibr_id UUID,
  p_cancelled_by TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ibr RECORD;
  req_name TEXT;
  ful_name TEXT;
  line_count INT;
  msg TEXT;
  meta JSONB;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO ibr
  FROM inter_branch_requests
  WHERE id = p_ibr_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inter-branch request not found: %', p_ibr_id;
  END IF;

  IF ibr.status IS DISTINCT FROM 'Cancelled' THEN
    RAISE EXCEPTION 'IBR % is not Cancelled (current: %)', ibr.ibr_number, ibr.status;
  END IF;

  SELECT name INTO req_name FROM branches WHERE id = ibr.requesting_branch_id;
  SELECT name INTO ful_name FROM branches WHERE id = ibr.fulfilling_branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM inter_branch_request_items WHERE request_id = ibr.id;

  msg := format(
    'IBR %s cancelled%s%s — %s → %s',
    ibr.ibr_number,
    CASE WHEN p_cancelled_by IS NOT NULL AND trim(p_cancelled_by) <> '' THEN format(' by %s', p_cancelled_by) ELSE '' END,
    CASE WHEN p_note IS NOT NULL AND trim(p_note) <> '' THEN format(': %s', p_note) ELSE '' END,
    COALESCE(req_name, 'Requesting branch'),
    COALESCE(ful_name, 'Fulfilling branch')
  );

  meta := jsonb_build_object(
    'interBranchRequestId', ibr.id,
    'ibrNumber', ibr.ibr_number,
    'requestingBranchId', ibr.requesting_branch_id,
    'fulfillingBranchId', ibr.fulfilling_branch_id,
    'requestingBranchName', req_name,
    'fulfillingBranchName', ful_name,
    'cancelledBy', p_cancelled_by,
    'note', p_note,
    'lineCount', line_count,
    'status', ibr.status
  );

  inserted := inserted + ibr_notify_warehouse_branch(
    ibr.requesting_branch_id,
    'Inter-branch request cancelled',
    msg,
    ibr.id,
    'ibr_cancelled',
    meta,
    'System'::notification_category,
    false
  );

  inserted := inserted + ibr_notify_warehouse_branch(
    ibr.fulfilling_branch_id,
    'Inter-branch request cancelled',
    msg,
    ibr.id,
    'ibr_cancelled',
    meta,
    'System'::notification_category,
    false
  );

  RETURN inserted;
END;
$$;

CREATE OR REPLACE FUNCTION resolve_ibr_submitter_auth_user_id(p_ibr_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ibr RECORD;
  uid UUID;
  submitter TEXT;
  submitter_base TEXT;
BEGIN
  SELECT *
  INTO ibr
  FROM inter_branch_requests
  WHERE id = p_ibr_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  submitter := COALESCE(
    (
      SELECT l.performed_by
      FROM inter_branch_request_logs l
      WHERE l.inter_branch_request_id = ibr.id
        AND l.action = 'submitted'
      ORDER BY l.created_at DESC
      LIMIT 1
    ),
    NULLIF(trim(ibr.created_by), '')
  );

  IF submitter IS NULL THEN
    RETURN NULL;
  END IF;

  submitter_base := trim(split_part(submitter, ' (', 1));

  IF position('@' IN submitter) > 0 THEN
    SELECT u.id
    INTO uid
    FROM auth.users u
    WHERE lower(u.email) = lower(trim(submitter))
    LIMIT 1;

    IF uid IS NOT NULL THEN
      RETURN uid;
    END IF;
  END IF;

  SELECT e.auth_user_id
  INTO uid
  FROM employees e
  WHERE e.status = 'active'::employee_status
    AND e.auth_user_id IS NOT NULL
    AND (
      e.employee_name = submitter
      OR e.email = submitter
      OR lower(trim(e.employee_name)) = lower(trim(submitter))
      OR lower(trim(e.employee_name)) = lower(submitter_base)
      OR lower(split_part(e.email, '@', 1)) = lower(trim(submitter))
      OR lower(split_part(e.email, '@', 1)) = lower(submitter_base)
    )
  ORDER BY
    CASE WHEN e.branch_id = ibr.requesting_branch_id THEN 0 ELSE 1 END,
    e.updated_at DESC NULLS LAST
  LIMIT 1;

  RETURN uid;
END;
$$;

CREATE OR REPLACE FUNCTION notify_ibr_submitter_rejected(
  p_ibr_id UUID,
  p_rejected_by TEXT DEFAULT NULL,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ibr RECORD;
  submitter_uid UUID;
  req_name TEXT;
  ful_name TEXT;
  line_count INT;
  msg TEXT;
  meta JSONB;
  inserted INT := 0;
BEGIN
  SELECT *
  INTO ibr
  FROM inter_branch_requests
  WHERE id = p_ibr_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inter-branch request not found: %', p_ibr_id;
  END IF;

  IF ibr.status IS DISTINCT FROM 'Rejected' THEN
    RAISE EXCEPTION 'IBR % is not Rejected (current: %)', ibr.ibr_number, ibr.status;
  END IF;

  SELECT name INTO req_name FROM branches WHERE id = ibr.requesting_branch_id;
  SELECT name INTO ful_name FROM branches WHERE id = ibr.fulfilling_branch_id;
  SELECT COUNT(*)::INT INTO line_count FROM inter_branch_request_items WHERE request_id = ibr.id;

  msg := format(
    'IBR %s was rejected%s%s',
    ibr.ibr_number,
    CASE WHEN p_rejected_by IS NOT NULL AND trim(p_rejected_by) <> '' THEN format(' by %s', p_rejected_by) ELSE '' END,
    CASE
      WHEN p_rejection_reason IS NOT NULL AND trim(p_rejection_reason) <> ''
      THEN format('. Reason: %s', p_rejection_reason)
      ELSE ''
    END
  );

  meta := jsonb_build_object(
    'interBranchRequestId', ibr.id,
    'ibrNumber', ibr.ibr_number,
    'requestingBranchId', ibr.requesting_branch_id,
    'fulfillingBranchId', ibr.fulfilling_branch_id,
    'requestingBranchName', req_name,
    'fulfillingBranchName', ful_name,
    'createdBy', ibr.created_by,
    'rejectedBy', p_rejected_by,
    'rejectionReason', p_rejection_reason,
    'lineCount', line_count,
    'status', ibr.status
  );

  submitter_uid := resolve_ibr_submitter_auth_user_id(p_ibr_id);

  IF submitter_uid IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      category,
      title,
      message,
      urgent,
      action_url,
      action_label,
      branch_id,
      metadata,
      event_type
    ) VALUES (
      submitter_uid,
      'Approvals'::notification_category,
      'Inter-branch request rejected',
      msg,
      true,
      '/inter-branch-requests/' || ibr.id::text,
      'View IBR',
      ibr.requesting_branch_id,
      meta,
      'ibr_rejected'
    );
    inserted := 1;
  ELSE
    inserted := ibr_notify_warehouse_branch(
      ibr.requesting_branch_id,
      'Inter-branch request rejected',
      msg,
      ibr.id,
      'ibr_rejected',
      meta,
      'Approvals'::notification_category,
      true
    );
  END IF;

  RETURN inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION ibr_notify_warehouse_branch(UUID, TEXT, TEXT, UUID, TEXT, JSONB, notification_category, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION ibr_notify_logistics_branch(UUID, TEXT, TEXT, UUID, TEXT, JSONB, notification_category, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_ibr_submitter_auth_user_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_executives_ibr_submitted_for_approval(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_both_branches_ibr_approved(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_requesting_branch_ibr_status(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_both_branches_ibr_delivery_recorded(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_both_branches_and_executives_ibr_fulfilled(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_both_branches_ibr_cancelled(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION notify_ibr_submitter_rejected(UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION ibr_notify_warehouse_branch(UUID, TEXT, TEXT, UUID, TEXT, JSONB, notification_category, BOOLEAN) IS
  'Insert in-app notifications for active Warehouse staff at a branch for an IBR event.';
COMMENT ON FUNCTION ibr_notify_logistics_branch(UUID, TEXT, TEXT, UUID, TEXT, JSONB, notification_category, BOOLEAN) IS
  'Insert in-app notifications for active Logistics staff at a branch for an IBR event.';
COMMENT ON FUNCTION notify_executives_ibr_submitted_for_approval(UUID) IS
  'Fan-out in-app notification to all active Executive users when an IBR is submitted for approval.';
COMMENT ON FUNCTION notify_both_branches_ibr_approved(UUID, TEXT) IS
  'Fan-out in-app notification to Warehouse staff at both branches and Logistics at the fulfilling (sending) branch when an IBR is approved.';
COMMENT ON FUNCTION notify_requesting_branch_ibr_status(UUID, TEXT, TEXT) IS
  'IBR logistics milestones: Scheduled → requesting warehouse; Loading → fulfilling logistics+warehouse; Packed/Ready → fulfilling logistics; In Transit → warehouse at both branches.';
COMMENT ON FUNCTION notify_both_branches_ibr_delivery_recorded(UUID, TEXT, TEXT) IS
  'Notify Warehouse staff at both branches when delivery is recorded at the requesting branch.';
COMMENT ON FUNCTION notify_both_branches_and_executives_ibr_fulfilled(UUID, TEXT) IS
  'Notify both branches and all Executives when an IBR is marked fulfilled and closed.';
COMMENT ON FUNCTION notify_both_branches_ibr_cancelled(UUID, TEXT, TEXT) IS
  'Notify Warehouse staff at both branches when an IBR is cancelled.';
COMMENT ON FUNCTION resolve_ibr_submitter_auth_user_id(UUID) IS
  'Resolve auth.users.id for the employee who submitted an inter-branch request.';
COMMENT ON FUNCTION notify_ibr_submitter_rejected(UUID, TEXT, TEXT) IS
  'In-app notification to the IBR submitter (or requesting-branch warehouse fallback) when rejected.';


-- ============================================================================
-- SECTION 25: TRIGGER - Auto-update updated_at
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
-- SECTION 26: ROW LEVEL SECURITY (RLS)
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

  -- Create a full-access policy for any logged-in user on every public table.
  -- EXCEPTION: chat_* tables use strict participant-scoped policies (see CHAT
  -- SYSTEM section) and must NOT get a permissive blanket policy, or private
  -- conversations would be readable by every authenticated user.
  FOR tbl IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT LIKE 'chat\_%'
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

-- Inventory stock writes (branch upserts + aggregate roll-up).
-- Mirrors database/rls_inventory_stock_adjustment_writes.sql for bootstrap installs.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'product_variant_stock'
      AND policyname = 'lamtex_authenticated_insert_product_variant_stock'
  ) THEN
    CREATE POLICY lamtex_authenticated_insert_product_variant_stock
      ON public.product_variant_stock
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'product_variant_stock'
      AND policyname = 'lamtex_authenticated_update_product_variant_stock'
  ) THEN
    CREATE POLICY lamtex_authenticated_update_product_variant_stock
      ON public.product_variant_stock
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'material_stock'
      AND policyname = 'lamtex_authenticated_insert_material_stock'
  ) THEN
    CREATE POLICY lamtex_authenticated_insert_material_stock
      ON public.material_stock
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'material_stock'
      AND policyname = 'lamtex_authenticated_update_material_stock'
  ) THEN
    CREATE POLICY lamtex_authenticated_update_material_stock
      ON public.material_stock
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'raw_materials'
      AND policyname = 'lamtex_authenticated_update_raw_materials'
  ) THEN
    CREATE POLICY lamtex_authenticated_update_raw_materials
      ON public.raw_materials
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'product_variants'
      AND policyname = 'lamtex_authenticated_update_product_variants'
  ) THEN
    CREATE POLICY lamtex_authenticated_update_product_variants
      ON public.product_variants
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'products'
      AND policyname = 'lamtex_authenticated_update_products'
  ) THEN
    CREATE POLICY lamtex_authenticated_update_products
      ON public.products
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;


-- ============================================================================
-- SECTION 27: SEED DATA
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
-- Total: ~72 tables, ~120 enums, ~155 indexes, ~10 RPC functions, 1 view,
-- auto-trigger, RLS, seed data.
--
-- KEEP IN SYNC: any *.sql file added under database/ that creates/alters DB
-- objects (tables, columns, indexes, enums, functions, views, RLS, triggers)
-- MUST also be folded into this file in the same change. See
-- .cursor/rules/schema-sync.mdc for the rule the AI agent follows.
-- ============================================================================
