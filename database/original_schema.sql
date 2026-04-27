-- ============================================================================
-- LAMTEX ERP - Comprehensive Supabase Database Schema
-- Generated: 2026-03-07
-- Run this entire script in the Supabase SQL Editor
-- All statements use IF NOT EXISTS for idempotent re-runs
-- ============================================================================

-- ============================================================================
-- SECTION 0: Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- SECTION 1: ENUM TYPES
-- Safe creation using DO blocks to avoid errors on re-run
-- ============================================================================

-- User / Auth enums
DO $$ BEGIN CREATE TYPE user_role AS ENUM ('Executive', 'Warehouse', 'Logistics', 'Agent'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE employee_role AS ENUM ('Sales Agent', 'Logistics Manager', 'Warehouse Manager', 'Machine Worker', 'Truck Driver'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE employee_status AS ENUM ('active', 'on-leave', 'inactive'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE system_role AS ENUM ('Agent', 'Senior Agent', 'Team Lead', 'Branch Manager'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Product enums
DO $$ BEGIN CREATE TYPE product_status AS ENUM ('Active', 'Discontinued', 'Out of Stock', 'Low Stock'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Material enums
DO $$ BEGIN CREATE TYPE material_status AS ENUM ('Active', 'Discontinued', 'Low Stock', 'Out of Stock', 'Expired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE unit_of_measure AS ENUM ('kg', 'ton', 'liter', 'pieces', 'bags', 'drums'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE quality_status AS ENUM ('Pending', 'Passed', 'Failed', 'Conditionally Approved'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE material_movement_type AS ENUM ('Receipt', 'Issue', 'Transfer', 'Adjustment', 'Return'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE movement_reference_type AS ENUM ('PO', 'PR', 'Production', 'Transfer Request', 'Manual'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Order enums
DO $$ BEGIN CREATE TYPE order_status AS ENUM ('Draft', 'Pending', 'Approved', 'Scheduled', 'Loading', 'Packed', 'Ready', 'In Transit', 'Delivered', 'Completed', 'Cancelled', 'Rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_status AS ENUM ('Unbilled', 'Invoiced', 'Partially Paid', 'Paid', 'Overdue'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE delivery_type AS ENUM ('Truck', 'Ship', 'Pickup'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_terms AS ENUM ('COD', '15 Days', '30 Days', '45 Days', '60 Days', '90 Days', 'Custom'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_method_enum AS ENUM ('Online', 'Offline'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE stock_hint AS ENUM ('Available', 'Partial', 'Not Available'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE delivery_status_enum AS ENUM ('On Time', 'Delayed', 'Failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE order_log_action AS ENUM ('created', 'status_changed', 'payment_status_changed', 'item_added', 'item_removed', 'item_quantity_changed', 'item_price_changed', 'discount_applied', 'approved', 'rejected', 'shipped', 'delivered', 'cancelled', 'payment_received', 'invoice_generated', 'note_added', 'proof_uploaded', 'proof_verified', 'proof_rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE order_log_role AS ENUM ('Agent', 'Warehouse Staff', 'Manager', 'Admin', 'System', 'Logistics'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE proof_type AS ENUM ('delivery', 'payment', 'receipt'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE proof_status AS ENUM ('pending', 'verified', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE proof_uploader_role AS ENUM ('Agent', 'Customer', 'Logistics'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Customer enums
DO $$ BEGIN CREATE TYPE customer_type AS ENUM ('Hardware Store', 'Construction Company', 'Contractor', 'Distributor'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE customer_status AS ENUM ('Active', 'Inactive', 'Suspended', 'Dormant', 'On Hold'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE risk_level AS ENUM ('Low', 'Medium', 'High'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_behavior AS ENUM ('Good', 'Watchlist', 'Risk'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE customer_note_type AS ENUM ('Call', 'Visit', 'Email', 'Meeting', 'Negotiation', 'Complaint', 'Other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE customer_task_type AS ENUM ('Follow-up', 'Visit', 'Call', 'Delivery Check', 'Collection', 'Quote', 'Other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE task_priority AS ENUM ('Low', 'Medium', 'High', 'Urgent'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE task_status AS ENUM ('Pending', 'In Progress', 'Completed', 'Cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE customer_activity_type AS ENUM ('Order Created', 'Payment Received', 'Note Added', 'Task Created', 'Call Made', 'Visit Completed', 'Status Changed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Supplier enums
DO $$ BEGIN CREATE TYPE supplier_type AS ENUM ('Raw Materials', 'Packaging', 'Chemicals', 'Equipment', 'Services'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE supplier_category AS ENUM ('Resin Supplier', 'Additives Supplier', 'Packaging Supplier', 'General'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE supplier_status AS ENUM ('Active', 'Inactive', 'Blacklisted'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Purchase enums
DO $$ BEGIN CREATE TYPE purchase_requisition_status AS ENUM ('Draft', 'Pending Approval', 'Approved', 'Rejected', 'Ordered', 'Completed', 'Cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE purchase_order_status AS ENUM ('Draft', 'Sent', 'Confirmed', 'Partially Received', 'Completed', 'Cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE grn_status AS ENUM ('Draft', 'Completed', 'Partially Accepted', 'Rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE urgency_level AS ENUM ('Low', 'Medium', 'High', 'Critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Logistics enums
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

-- Warehouse enums
DO $$ BEGIN CREATE TYPE fulfillment_status AS ENUM ('To Pick', 'Loading', 'Packing', 'Ready', 'Blocked'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE warehouse_stock_status AS ENUM ('Fully Available', 'Partial', 'Not Available'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE loading_detail_status AS ENUM ('Pending', 'Loading', 'Partial', 'Full', 'Out of Stock', 'Ready'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE qa_status AS ENUM ('Pending', 'Testing', 'Passed', 'Failed', 'Rework'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE quality_issue_type AS ENUM ('Rejected Batch', 'Damaged Goods', 'Re-inspection', 'Customer Return'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE quality_issue_status AS ENUM ('Open', 'Investigating', 'Resolved', 'Escalated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE machine_status_enum AS ENUM ('Running', 'Idle', 'Maintenance', 'Error'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE product_stock_movement_type AS ENUM ('In', 'Out', 'Transfer', 'Adjustment'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE warehouse_movement_type AS ENUM ('In', 'Out', 'Transfer', 'Adjust', 'Production', 'Damage'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Payment system enums
DO $$ BEGIN CREATE TYPE payment_method_type AS ENUM ('GCash', 'Maya', 'Bank Transfer', 'Credit Card', 'Debit Card', 'Cash', 'Check'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_link_status AS ENUM ('pending', 'paid', 'expired', 'cancelled', 'failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_transaction_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Collections enums
DO $$ BEGIN CREATE TYPE collection_status AS ENUM ('Current', 'Due Soon', 'Overdue', 'Critical', 'Collected', 'Partially Paid'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE collection_note_type AS ENUM ('Phone Call', 'Email', 'Visit', 'Promise to Pay', 'Dispute', 'Other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE collection_payment_method AS ENUM ('Cash', 'Check', 'Bank Transfer', 'Online Payment', 'Credit Card'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE verification_status AS ENUM ('Pending', 'Verified', 'Rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Chat enums
DO $$ BEGIN CREATE TYPE chat_type AS ENUM ('direct', 'group'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE chat_user_status AS ENUM ('online', 'offline', 'away'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Agent profile enums
DO $$ BEGIN CREATE TYPE gender_type AS ENUM ('Male', 'Female', 'Other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE civil_status AS ENUM ('Single', 'Married', 'Widowed', 'Separated'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE employment_status AS ENUM ('Full-time', 'Part-time', 'Contract', 'Probationary'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE commission_tier AS ENUM ('Bronze', 'Silver', 'Gold', 'Platinum'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE bank_account_type AS ENUM ('Savings', 'Current'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE pay_frequency AS ENUM ('Weekly', 'Bi-weekly', 'Monthly'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE skill_level AS ENUM ('Beginner', 'Intermediate', 'Advanced', 'Expert'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE training_type AS ENUM ('Product Knowledge', 'Sales Skills', 'Technical', 'Soft Skills', 'Compliance'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE document_type AS ENUM ('Resume', 'ID', 'Certificate', 'Contract', 'Performance Review', 'Other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE asset_type AS ENUM ('Laptop', 'Mobile Phone', 'Vehicle', 'Tablet', 'Equipment', 'Other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE asset_condition AS ENUM ('New', 'Good', 'Fair', 'Needs Repair'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE agent_note_type AS ENUM ('General', 'Performance', 'Disciplinary', 'Commendation', 'HR'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE agent_activity_type AS ENUM ('Login', 'Order Created', 'Customer Visit', 'Quote Generated', 'Meeting', 'Other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE customer_assignment_status AS ENUM ('Active', 'Inactive', 'At Risk', 'VIP'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Settings enums
DO $$ BEGIN CREATE TYPE address_type AS ENUM ('Head Office', 'Branch', 'Warehouse', 'Factory'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE payment_profile_type AS ENUM ('Bank Account', 'Credit Card', 'E-Wallet', 'Check'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE social_platform AS ENUM ('Facebook', 'Twitter', 'Instagram', 'LinkedIn', 'YouTube', 'Website'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE notification_category AS ENUM ('Approvals', 'Inventory', 'Delivery', 'Payment', 'System'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE alert_severity AS ENUM ('Low', 'Medium', 'High', 'Critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Commission enums
DO $$ BEGIN CREATE TYPE commission_status AS ENUM ('Pending', 'Approved', 'Paid'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Finance payment recording method (superset of collection + online)
DO $$ BEGIN CREATE TYPE finance_payment_method AS ENUM ('Cash', 'Check', 'Bank Transfer', 'Credit Card', 'GCash', 'PayMaya', 'Online'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================================
-- SECTION 2: CORE REFERENCE TABLES
-- ============================================================================

-- Branches
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  location TEXT,
  manager_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- SECTION 3: EMPLOYEES
-- ============================================================================

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id TEXT NOT NULL UNIQUE,
  employee_name TEXT NOT NULL,
  role employee_role NOT NULL,
  department TEXT,
  branch_id TEXT,
  branch_name TEXT,
  status employee_status NOT NULL DEFAULT 'active',
  join_date DATE,
  tenure_months INTEGER DEFAULT 0,
  profile_photo TEXT,
  email TEXT,
  phone TEXT,
  -- Role-specific fields (Sales Agent)
  active_customers INTEGER,
  total_revenue NUMERIC(15,2),
  commission NUMERIC(15,2),
  commission_tier_text TEXT,
  territory_coverage TEXT,
  -- Role-specific fields (Logistics Manager)
  deliveries_managed INTEGER,
  on_time_delivery_rate NUMERIC(5,2),
  trucks_managed INTEGER,
  routes_optimized INTEGER,
  -- Role-specific fields (Warehouse Manager)
  inventory_accuracy NUMERIC(5,2),
  warehouse_size TEXT,
  staff_managed INTEGER,
  orders_processed INTEGER,
  -- Role-specific fields (Machine Worker)
  machine_type TEXT,
  shifts_completed INTEGER,
  production_output NUMERIC(15,2),
  efficiency_rate NUMERIC(5,2),
  -- Role-specific fields (Truck Driver)
  truck_number TEXT,
  deliveries_completed INTEGER,
  distance_covered NUMERIC(12,2),
  safety_rating NUMERIC(3,1),
  license_plate TEXT,
  -- Auth / Permissions
  system_role system_role,
  permissions TEXT[],
  last_password_change TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Employee extended: personal info
CREATE TABLE IF NOT EXISTS employee_personal_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date_of_birth DATE,
  gender gender_type,
  nationality TEXT,
  civil_status civil_status,
  religion TEXT,
  blood_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id)
);

-- Employee extended: contact info
CREATE TABLE IF NOT EXISTS employee_contact_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  primary_phone TEXT,
  secondary_phone TEXT,
  personal_email TEXT,
  work_email TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id)
);

-- Employee extended: address
CREATE TABLE IF NOT EXISTS employee_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  street TEXT,
  barangay TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  current_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id)
);

-- Employee extended: employment info
CREATE TABLE IF NOT EXISTS employee_employment_info (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date_hired DATE,
  employment_status employment_status,
  position TEXT,
  department TEXT,
  reporting_to TEXT,
  branch_manager_name TEXT,
  work_schedule_days TEXT[],
  work_schedule_start TIME,
  work_schedule_end TIME,
  shift TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id)
);

-- Employee extended: compensation
CREATE TABLE IF NOT EXISTS employee_compensation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  base_salary NUMERIC(12,2),
  commission_rate NUMERIC(5,2),
  commission_tier commission_tier,
  bonus_eligibility BOOLEAN DEFAULT FALSE,
  monthly_quota NUMERIC(15,2),
  quarterly_quota NUMERIC(15,2),
  yearly_quota NUMERIC(15,2),
  allowance_transportation NUMERIC(10,2) DEFAULT 0,
  allowance_meal NUMERIC(10,2) DEFAULT 0,
  allowance_communication NUMERIC(10,2) DEFAULT 0,
  allowance_other NUMERIC(10,2) DEFAULT 0,
  total_monthly_compensation NUMERIC(15,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id)
);

-- Employee extended: bank details
CREATE TABLE IF NOT EXISTS employee_bank_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  bank_name TEXT,
  account_number TEXT,  -- encrypt at application level
  account_name TEXT,
  account_type bank_account_type,
  payment_frequency pay_frequency,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id)
);

-- Employee extended: government IDs
CREATE TABLE IF NOT EXISTS employee_government_ids (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  tin TEXT,              -- encrypt at application level
  sss TEXT,
  phil_health TEXT,
  pag_ibig TEXT,
  gov_id_type TEXT,
  gov_id_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id)
);

-- Employee: skills
CREATE TABLE IF NOT EXISTS employee_skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  level skill_level,
  years_of_experience NUMERIC(4,1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Employee: certifications
CREATE TABLE IF NOT EXISTS employee_certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  certification_name TEXT NOT NULL,
  issuing_organization TEXT,
  issue_date DATE,
  expiry_date DATE,
  credential_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Employee: training history
CREATE TABLE IF NOT EXISTS employee_trainings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  training_name TEXT NOT NULL,
  training_type training_type,
  completion_date DATE,
  duration TEXT,
  instructor TEXT,
  score NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Employee: documents
CREATE TABLE IF NOT EXISTS employee_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  document_type document_type NOT NULL,
  document_name TEXT NOT NULL,
  upload_date DATE,
  uploaded_by TEXT,
  file_size TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Employee: company assets assigned
CREATE TABLE IF NOT EXISTS employee_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  asset_type asset_type NOT NULL,
  asset_name TEXT NOT NULL,
  serial_number TEXT,
  model TEXT,
  assigned_date DATE,
  condition asset_condition,
  value NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Employee: HR notes
CREATE TABLE IF NOT EXISTS employee_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  note_type agent_note_type NOT NULL,
  note TEXT NOT NULL,
  created_by TEXT,
  is_private BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Employee: activity log
CREATE TABLE IF NOT EXISTS employee_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  activity_type agent_activity_type NOT NULL,
  description TEXT,
  location TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agent targets (per-period targets)
CREATE TABLE IF NOT EXISTS agent_targets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period TEXT NOT NULL,                     -- e.g. '2026-Q1', '2026-03'
  monthly_sales_target NUMERIC(15,2),
  quarterly_sales_target NUMERIC(15,2),
  target_achievement_rate NUMERIC(5,2),
  days_ahead_behind_target INTEGER,
  revenue_gap NUMERIC(15,2),
  stretch_goal_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agent incentives / gamification
CREATE TABLE IF NOT EXISTS agent_incentives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  streak_days INTEGER DEFAULT 0,
  milestones_achieved TEXT[],
  awards_won TEXT[],
  badges TEXT[],
  bonus_tier TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id)
);

-- Agent commissions
CREATE TABLE IF NOT EXISTS commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period TEXT NOT NULL,
  sales_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  commission_earned NUMERIC(15,2) NOT NULL DEFAULT 0,
  status commission_status NOT NULL DEFAULT 'Pending',
  paid_date DATE,
  branch TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS commission_breakdown (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  commission_id UUID NOT NULL REFERENCES commissions(id) ON DELETE CASCADE,
  order_number TEXT,
  customer_name TEXT,
  sale_amount NUMERIC(15,2),
  commission_amount NUMERIC(15,2)
);


-- ============================================================================
-- SECTION 4: SUPPLIERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  type supplier_type,
  category supplier_category,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'Philippines',
  payment_terms TEXT,
  currency TEXT DEFAULT 'PHP',
  credit_limit NUMERIC(15,2) DEFAULT 0,
  delivery_lead_time INTEGER,          -- days
  total_purchases_ytd NUMERIC(15,2) DEFAULT 0,
  total_purchases_lifetime NUMERIC(15,2) DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  last_purchase_date DATE,
  account_since DATE,
  status supplier_status NOT NULL DEFAULT 'Active',
  performance_score INTEGER DEFAULT 0,  -- 0-100
  quality_rating NUMERIC(2,1),          -- 1.0-5.0
  delivery_rating NUMERIC(2,1),
  on_time_delivery_rate NUMERIC(5,2),
  defect_rate NUMERIC(5,2),
  avg_lead_time INTEGER,
  avg_order_value NUMERIC(15,2),
  preferred_supplier BOOLEAN DEFAULT FALSE,
  risk_level risk_level DEFAULT 'Low',
  materials_supplied UUID[],            -- material IDs
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 5: PRODUCTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
  category_name TEXT,                     -- denormalized for convenience
  family_code TEXT,
  description TEXT,
  image_url TEXT,
  images TEXT[],
  status product_status NOT NULL DEFAULT 'Active',
  specifications JSONB DEFAULT '{}',      -- {material, pressureRating, temperature, standard, color, application}
  total_variants INTEGER DEFAULT 0,
  total_stock INTEGER DEFAULT 0,
  avg_price NUMERIC(12,2) DEFAULT 0,
  total_revenue NUMERIC(15,2) DEFAULT 0,
  total_units_sold INTEGER DEFAULT 0,
  branch TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name TEXT,
  sku TEXT NOT NULL UNIQUE,
  size TEXT,
  description TEXT,
  -- Pricing
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  wholesale_price NUMERIC(12,2),
  retail_price NUMERIC(12,2),
  cost_price NUMERIC(12,2),
  -- Stock per branch
  stock_branch_a INTEGER NOT NULL DEFAULT 0,
  stock_branch_b INTEGER NOT NULL DEFAULT 0,
  stock_branch_c INTEGER NOT NULL DEFAULT 0,
  total_stock INTEGER NOT NULL DEFAULT 0,
  reorder_point INTEGER NOT NULL DEFAULT 0,
  safety_stock INTEGER NOT NULL DEFAULT 0,
  -- Physical specs
  weight NUMERIC(10,3),         -- kg
  length NUMERIC(10,3),         -- meters
  outer_diameter NUMERIC(10,3), -- mm
  inner_diameter NUMERIC(10,3), -- mm
  wall_thickness NUMERIC(10,3), -- mm
  -- Status
  status product_status NOT NULL DEFAULT 'Active',
  -- Sales performance
  units_sold_ytd INTEGER DEFAULT 0,
  revenue_ytd NUMERIC(15,2) DEFAULT 0,
  units_sold_mtd INTEGER DEFAULT 0,
  revenue_mtd NUMERIC(15,2) DEFAULT 0,
  -- Supplier
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT,
  lead_time_days INTEGER,
  -- Dates
  branch TEXT,
  last_restocked TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bulk / batch discount tiers per variant
CREATE TABLE IF NOT EXISTS product_variant_bulk_discounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  min_qty INTEGER NOT NULL,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  price_per_unit NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Raw material recipe per variant (BOM)
CREATE TABLE IF NOT EXISTS product_variant_raw_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  material_id UUID,                     -- FK added after raw_materials table
  material_name TEXT,
  quantity NUMERIC(12,4) NOT NULL,
  unit TEXT,
  cost NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Product performance snapshots (monthly)
CREATE TABLE IF NOT EXISTS product_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
  period TEXT NOT NULL,                 -- e.g. '2026-02'
  units_sold INTEGER DEFAULT 0,
  revenue NUMERIC(15,2) DEFAULT 0,
  avg_selling_price NUMERIC(12,2) DEFAULT 0,
  orders_count INTEGER DEFAULT 0,
  top_customers JSONB DEFAULT '[]',     -- [{customerName, unitsPurchased, revenue}]
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Product stock movements
CREATE TABLE IF NOT EXISTS product_stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  variant_sku TEXT,
  product_name TEXT,
  movement_type product_stock_movement_type NOT NULL,
  quantity INTEGER NOT NULL,
  from_branch TEXT,
  to_branch TEXT,
  reason TEXT,
  performed_by TEXT,
  reference_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 6: RAW MATERIALS
-- ============================================================================

CREATE TABLE IF NOT EXISTS material_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS raw_materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  category_id UUID REFERENCES material_categories(id) ON DELETE SET NULL,
  category_name TEXT,
  description TEXT,
  image_url TEXT,
  specifications JSONB DEFAULT '{}',     -- {grade, purity, density, meltFlowIndex, color, viscosity, standard, ...}
  unit_of_measure unit_of_measure NOT NULL DEFAULT 'kg',
  -- Stock
  stock_branch_a NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_branch_b NUMERIC(12,2) NOT NULL DEFAULT 0,
  stock_branch_c NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_stock NUMERIC(12,2) NOT NULL DEFAULT 0,
  reorder_point NUMERIC(12,2) NOT NULL DEFAULT 0,
  safety_stock NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Pricing
  cost_per_unit NUMERIC(12,4) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'PHP',
  last_purchase_price NUMERIC(12,4) DEFAULT 0,
  average_cost NUMERIC(12,4) DEFAULT 0,
  total_value NUMERIC(15,2) DEFAULT 0,
  -- Supplier
  primary_supplier TEXT,
  supplier_code TEXT,
  lead_time_days INTEGER DEFAULT 0,
  -- Quality
  requires_quality_check BOOLEAN DEFAULT FALSE,
  shelf_life_days INTEGER,
  expiry_date DATE,
  batch_tracking BOOLEAN DEFAULT FALSE,
  -- Usage
  monthly_consumption NUMERIC(12,2) DEFAULT 0,
  yearly_consumption NUMERIC(12,2) DEFAULT 0,
  linked_products UUID[],                -- product IDs that use this material
  -- Status
  status material_status NOT NULL DEFAULT 'Active',
  last_restock_date DATE,
  last_issued_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Now add FK to product_variant_raw_materials
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_pvr_material_id' AND table_name = 'product_variant_raw_materials'
  ) THEN
    ALTER TABLE product_variant_raw_materials
      ADD CONSTRAINT fk_pvr_material_id FOREIGN KEY (material_id) REFERENCES raw_materials(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Material batches / lots
CREATE TABLE IF NOT EXISTS material_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  material_name TEXT,
  batch_number TEXT NOT NULL,
  lot_number TEXT,
  -- Quantity
  quantity_received NUMERIC(12,2) DEFAULT 0,
  quantity_available NUMERIC(12,2) DEFAULT 0,
  quantity_issued NUMERIC(12,2) DEFAULT 0,
  unit_of_measure unit_of_measure,
  -- Dates
  manufacturing_date DATE,
  received_date DATE,
  expiry_date DATE,
  -- Quality
  quality_status quality_status DEFAULT 'Pending',
  certificate_number TEXT,
  test_results JSONB DEFAULT '[]',       -- [{parameter, result, specification, status}]
  -- Source
  supplier TEXT,
  purchase_order_ref TEXT,
  grn_number TEXT,
  -- Location
  branch TEXT,                           -- 'A', 'B', 'C'
  warehouse_location TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Material stock movements
CREATE TABLE IF NOT EXISTS material_stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  material_name TEXT,
  material_sku TEXT,
  movement_type material_movement_type NOT NULL,
  quantity NUMERIC(12,2) NOT NULL,
  unit_of_measure unit_of_measure,
  -- Location
  from_branch TEXT,
  to_branch TEXT,
  from_location TEXT,
  to_location TEXT,
  -- References
  reference_type movement_reference_type,
  reference_number TEXT,
  batch_number TEXT,
  -- Details
  reason TEXT,
  remarks TEXT,
  -- People
  requested_by TEXT,
  approved_by TEXT,
  processed_by TEXT,
  -- Cost
  cost_per_unit NUMERIC(12,4),
  total_cost NUMERIC(15,2),
  movement_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Material consumption (production usage)
CREATE TABLE IF NOT EXISTS material_consumption (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID NOT NULL REFERENCES raw_materials(id) ON DELETE CASCADE,
  material_name TEXT,
  quantity_consumed NUMERIC(12,2) NOT NULL,
  unit_of_measure unit_of_measure,
  consumption_date DATE,
  production_batch_id TEXT,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT,
  branch TEXT,
  cost_per_unit NUMERIC(12,4),
  total_cost NUMERIC(15,2),
  batch_numbers TEXT[],
  issued_by TEXT,
  approved_by TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 7: CUSTOMERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type customer_type NOT NULL,
  status customer_status NOT NULL DEFAULT 'Active',
  risk_level risk_level DEFAULT 'Low',
  payment_behavior payment_behavior DEFAULT 'Good',
  -- Contact
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  alternate_phone TEXT,
  alternate_email TEXT,
  -- Address
  address TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  map_lat NUMERIC(10,7),
  map_lng NUMERIC(10,7),
  -- Business
  business_registration TEXT,
  tax_id TEXT,
  -- Credit
  credit_limit NUMERIC(15,2) DEFAULT 0,
  outstanding_balance NUMERIC(15,2) DEFAULT 0,
  available_credit NUMERIC(15,2) DEFAULT 0,
  payment_terms TEXT,
  payment_score INTEGER DEFAULT 100,     -- 0-100
  avg_payment_days INTEGER DEFAULT 0,
  overdue_amount NUMERIC(15,2) DEFAULT 0,
  -- Purchases
  total_purchases_ytd NUMERIC(15,2) DEFAULT 0,
  total_purchases_lifetime NUMERIC(15,2) DEFAULT 0,
  order_count INTEGER DEFAULT 0,
  last_order_date DATE,
  account_since DATE,
  -- Assignment
  assigned_agent_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  assigned_agent TEXT,
  branch TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Customer-Agent assignment (many-to-many with metadata)
CREATE TABLE IF NOT EXISTS customer_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  assigned_date DATE,
  status customer_assignment_status DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(employee_id, customer_id)
);

CREATE TABLE IF NOT EXISTS customer_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type customer_note_type NOT NULL,
  content TEXT NOT NULL,
  created_by TEXT,
  is_important BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_name TEXT,
  type customer_task_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority task_priority NOT NULL DEFAULT 'Medium',
  status task_status NOT NULL DEFAULT 'Pending',
  due_date DATE,
  completed_date DATE,
  assigned_to TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type customer_activity_type NOT NULL,
  description TEXT,
  performed_by TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 8: ORDERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  agent_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  agent_name TEXT,
  branch TEXT,
  order_date DATE,
  required_date DATE,
  delivery_type delivery_type,
  payment_terms payment_terms,
  payment_method payment_method_enum DEFAULT 'Offline',
  status order_status NOT NULL DEFAULT 'Draft',
  payment_status payment_status NOT NULL DEFAULT 'Unbilled',
  -- Pricing
  subtotal NUMERIC(15,2) DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  discount_amount NUMERIC(15,2) DEFAULT 0,
  total_amount NUMERIC(15,2) DEFAULT 0,
  -- Approval
  requires_approval BOOLEAN DEFAULT FALSE,
  approval_reason TEXT[],
  approved_by TEXT,
  approved_date TIMESTAMPTZ,
  rejected_by TEXT,
  rejected_date TIMESTAMPTZ,
  rejection_reason TEXT,
  -- Delivery
  estimated_delivery DATE,
  actual_delivery DATE,
  delivery_status delivery_status_enum,
  delay_reason TEXT,
  -- Invoice
  invoice_id TEXT,
  invoice_date DATE,
  due_date DATE,
  amount_paid NUMERIC(15,2) DEFAULT 0,
  balance_due NUMERIC(15,2) DEFAULT 0,
  -- Notes
  order_notes TEXT,
  internal_notes TEXT,
  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sku TEXT,
  product_name TEXT,
  variant_description TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  original_price NUMERIC(12,2),
  negotiated_price NUMERIC(12,2),
  discount_percent NUMERIC(5,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  line_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  stock_hint stock_hint DEFAULT 'Available',
  available_stock INTEGER,
  batch_discount NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  action order_log_action NOT NULL,
  performed_by TEXT,
  performed_by_role order_log_role,
  description TEXT,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS proof_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  type proof_type NOT NULL,
  file_name TEXT,
  file_url TEXT,
  file_size INTEGER,
  uploaded_by TEXT,
  uploaded_by_role proof_uploader_role,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  status proof_status DEFAULT 'pending',
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 9: INVOICES
-- ============================================================================

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  invoice_number TEXT UNIQUE,
  issue_date DATE,
  due_date DATE,
  -- Bill to
  bill_to_name TEXT,
  bill_to_address TEXT,
  bill_to_contact_person TEXT,
  bill_to_phone TEXT,
  bill_to_email TEXT,
  -- Amounts
  subtotal NUMERIC(15,2) DEFAULT 0,
  discount_amount NUMERIC(15,2) DEFAULT 0,
  tax_amount NUMERIC(15,2) DEFAULT 0,
  total_amount NUMERIC(15,2) DEFAULT 0,
  amount_paid NUMERIC(15,2) DEFAULT 0,
  balance_due NUMERIC(15,2) DEFAULT 0,
  -- Payment
  payment_terms payment_terms,
  payment_method payment_method_enum,
  payment_status payment_status DEFAULT 'Unbilled',
  -- Meta
  notes TEXT,
  generated_by TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 10: PAYMENT SYSTEM (Online)
-- ============================================================================

-- Configurable payment method fees
CREATE TABLE IF NOT EXISTS payment_method_fees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  method payment_method_type NOT NULL UNIQUE,
  gateway_fee_percent NUMERIC(5,2) DEFAULT 0,
  gateway_fee_fixed NUMERIC(10,2) DEFAULT 0,
  service_fee_percent NUMERIC(5,2) DEFAULT 0,
  service_fee_fixed NUMERIC(10,2) DEFAULT 0,
  enabled BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payment links (public-facing)
CREATE TABLE IF NOT EXISTS payment_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT NOT NULL UNIQUE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  invoice_amount NUMERIC(15,2) NOT NULL,
  status payment_link_status NOT NULL DEFAULT 'pending',
  link TEXT,
  qr_code_data TEXT,
  expires_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  sent_via_email BOOLEAN DEFAULT FALSE,
  sent_via_sms BOOLEAN DEFAULT FALSE,
  last_email_sent_at TIMESTAMPTZ,
  last_sms_sent_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  selected_payment_method payment_method_type,
  payment_transaction_id UUID,
  fee_breakdown JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payment transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_link_id UUID REFERENCES payment_links(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  payment_method payment_method_type,
  -- Amounts
  invoice_amount NUMERIC(15,2),
  gateway_fee NUMERIC(10,2) DEFAULT 0,
  service_fee NUMERIC(10,2) DEFAULT 0,
  total_fees NUMERIC(10,2) DEFAULT 0,
  total_paid NUMERIC(15,2),
  -- Gateway
  gateway_reference_number TEXT,
  gateway_transaction_id TEXT,
  gateway_response JSONB,
  -- Status
  status payment_transaction_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  -- Customer
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  -- Receipt link
  receipt_id UUID,
  receipt_sent_via_email BOOLEAN DEFAULT FALSE,
  receipt_sent_via_sms BOOLEAN DEFAULT FALSE,
  -- Audit
  ip_address TEXT,
  user_agent TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Digital receipts
CREATE TABLE IF NOT EXISTS digital_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_number TEXT NOT NULL UNIQUE,
  payment_transaction_id UUID REFERENCES payment_transactions(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  -- Payment
  paid_at TIMESTAMPTZ,
  payment_method payment_method_type,
  gateway_reference_number TEXT,
  -- Customer
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  -- Amounts
  invoice_amount NUMERIC(15,2),
  gateway_fee NUMERIC(10,2) DEFAULT 0,
  service_fee NUMERIC(10,2) DEFAULT 0,
  total_fees NUMERIC(10,2) DEFAULT 0,
  total_paid NUMERIC(15,2),
  -- Files
  pdf_url TEXT,
  public_url TEXT,
  -- Items snapshot
  invoice_items JSONB DEFAULT '[]',      -- [{description, quantity, unitPrice, total}]
  -- Status
  email_sent BOOLEAN DEFAULT FALSE,
  sms_sent BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 11: COLLECTIONS / RECEIVABLES (Agent-side)
-- ============================================================================

CREATE TABLE IF NOT EXISTS receivables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  invoice_date DATE,
  due_date DATE,
  invoice_amount NUMERIC(15,2) DEFAULT 0,
  amount_paid NUMERIC(15,2) DEFAULT 0,
  balance_due NUMERIC(15,2) DEFAULT 0,
  status collection_status DEFAULT 'Current',
  days_overdue INTEGER DEFAULT 0,
  payment_terms TEXT,
  assigned_agent_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  assigned_agent TEXT,
  branch TEXT,
  last_contact_date DATE,
  next_follow_up_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collection_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receivable_id UUID NOT NULL REFERENCES receivables(id) ON DELETE CASCADE,
  note_type collection_note_type NOT NULL,
  content TEXT NOT NULL,
  next_action TEXT,
  follow_up_date DATE,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Payment records (finance / agent-submitted)
CREATE TABLE IF NOT EXISTS payment_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receivable_id UUID REFERENCES receivables(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  customer_name TEXT,
  payment_date DATE,
  amount NUMERIC(15,2) NOT NULL,
  payment_method finance_payment_method,
  reference_number TEXT,
  -- Agent submission
  submitted_by TEXT,
  submitted_at TIMESTAMPTZ,
  proof_of_payment TEXT[],
  verification_status verification_status DEFAULT 'Pending',
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  recorded_by TEXT,
  -- Linked proof
  proof_document_id UUID REFERENCES proof_documents(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 12: PURCHASE REQUISITIONS & PURCHASE ORDERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS purchase_requisitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pr_number TEXT NOT NULL UNIQUE,
  material_id UUID REFERENCES raw_materials(id) ON DELETE SET NULL,
  material_name TEXT,
  material_sku TEXT,
  category_name TEXT,
  requested_quantity NUMERIC(12,2) NOT NULL,
  unit_of_measure unit_of_measure,
  estimated_cost NUMERIC(15,2) DEFAULT 0,
  delivery_branch TEXT,
  required_date DATE,
  reason TEXT,
  urgency urgency_level DEFAULT 'Medium',
  current_stock NUMERIC(12,2) DEFAULT 0,
  reorder_point NUMERIC(12,2) DEFAULT 0,
  suggested_supplier TEXT,
  supplier_quotation NUMERIC(15,2),
  status purchase_requisition_status NOT NULL DEFAULT 'Draft',
  requested_by TEXT,
  requested_date DATE,
  approved_by TEXT,
  approval_date DATE,
  rejection_reason TEXT,
  purchase_order_id UUID,                -- FK added after PO table
  purchase_order_number TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  po_number TEXT NOT NULL UNIQUE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT,
  supplier_contact TEXT,
  supplier_address TEXT,
  -- Totals
  subtotal NUMERIC(15,2) DEFAULT 0,
  tax NUMERIC(15,2) DEFAULT 0,
  shipping_cost NUMERIC(15,2) DEFAULT 0,
  total_amount NUMERIC(15,2) DEFAULT 0,
  -- Delivery
  delivery_branch TEXT,
  delivery_address TEXT,
  requested_delivery_date DATE,
  -- Status
  status purchase_order_status NOT NULL DEFAULT 'Draft',
  -- Workflow
  created_by TEXT,
  approved_by TEXT,
  approval_date DATE,
  sent_date DATE,
  -- References
  pr_references UUID[],                  -- PR IDs
  -- Tracking
  received_quantities JSONB DEFAULT '[]', -- [{materialId, quantityReceived, grnNumbers}]
  payment_terms TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FK back from PR to PO
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_pr_purchase_order' AND table_name = 'purchase_requisitions'
  ) THEN
    ALTER TABLE purchase_requisitions
      ADD CONSTRAINT fk_pr_purchase_order FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE SET NULL;
  END IF;
END $$;

-- PO line items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  material_id UUID REFERENCES raw_materials(id) ON DELETE SET NULL,
  material_name TEXT,
  material_sku TEXT,
  description TEXT,
  quantity NUMERIC(12,2) NOT NULL,
  unit_of_measure unit_of_measure,
  unit_price NUMERIC(12,4) NOT NULL,
  total_price NUMERIC(15,2) NOT NULL,
  expected_delivery_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Goods Receipt Notes
CREATE TABLE IF NOT EXISTS goods_receipt_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grn_number TEXT NOT NULL UNIQUE,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name TEXT,
  delivery_note TEXT,
  invoice_number TEXT,
  received_date DATE,
  received_by TEXT,
  branch TEXT,
  quality_check_required BOOLEAN DEFAULT FALSE,
  quality_check_status quality_status,
  quality_check_by TEXT,
  quality_check_date DATE,
  quality_remarks TEXT,
  status grn_status NOT NULL DEFAULT 'Draft',
  remarks TEXT,
  attachments TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- GRN line items
CREATE TABLE IF NOT EXISTS grn_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  grn_id UUID NOT NULL REFERENCES goods_receipt_notes(id) ON DELETE CASCADE,
  material_id UUID REFERENCES raw_materials(id) ON DELETE SET NULL,
  material_name TEXT,
  material_sku TEXT,
  ordered_quantity NUMERIC(12,2),
  received_quantity NUMERIC(12,2),
  accepted_quantity NUMERIC(12,2),
  rejected_quantity NUMERIC(12,2),
  unit_of_measure unit_of_measure,
  batch_number TEXT,
  expiry_date DATE,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 13: LOGISTICS / FLEET
-- ============================================================================

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id TEXT NOT NULL UNIQUE,
  vehicle_name TEXT,
  plate_number TEXT,
  type vehicle_type NOT NULL,
  status vehicle_status NOT NULL DEFAULT 'Available',
  -- Specs
  make TEXT,
  model TEXT,
  year_model INTEGER,
  color TEXT,
  engine_type TEXT,
  max_weight NUMERIC(10,2),             -- kg
  max_volume NUMERIC(10,2),             -- cubic meters
  dimensions_length NUMERIC(8,2),
  dimensions_width NUMERIC(8,2),
  dimensions_height NUMERIC(8,2),
  -- Registration
  registration_date DATE,
  registration_expiry DATE,
  orcr_number TEXT,
  -- Acquisition
  acquisition_date DATE,
  purchase_price NUMERIC(15,2),
  current_book_value NUMERIC(15,2),
  financing_status financing_status DEFAULT 'Owned',
  branch TEXT,
  -- Maintenance
  last_maintenance_date DATE,
  next_maintenance_due DATE,
  current_mileage NUMERIC(12,1) DEFAULT 0,
  mileage_at_last_maintenance NUMERIC(12,1),
  -- Stats
  total_trips INTEGER DEFAULT 0,
  total_distance NUMERIC(12,1) DEFAULT 0,
  utilization_percent NUMERIC(5,2) DEFAULT 0,
  current_trip TEXT,
  next_available_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_number TEXT NOT NULL UNIQUE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  vehicle_name TEXT,
  driver_name TEXT,
  driver_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  status trip_status NOT NULL DEFAULT 'Pending',
  scheduled_date DATE,
  departure_time TIMESTAMPTZ,
  destinations TEXT[],
  order_ids UUID[],
  capacity_used NUMERIC(5,2) DEFAULT 0,
  weight_used NUMERIC(10,2) DEFAULT 0,
  volume_used NUMERIC(10,2) DEFAULT 0,
  max_weight NUMERIC(10,2),
  max_volume NUMERIC(10,2),
  eta TIMESTAMPTZ,
  actual_arrival TIMESTAMPTZ,
  delay_reason TEXT,
  branch TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  delivery_number TEXT,
  vehicle TEXT,
  driver TEXT,
  route TEXT,
  orders_count INTEGER DEFAULT 0,
  status delivery_tracking_status NOT NULL DEFAULT 'Scheduled',
  eta TIMESTAMPTZ,
  actual_arrival TIMESTAMPTZ,
  delay_reason TEXT,
  current_location TEXT,
  pod_collected BOOLEAN DEFAULT FALSE,
  branch TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delay_exceptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type delay_exception_type NOT NULL,
  affected_trip TEXT,
  affected_orders TEXT[],
  customers_affected TEXT[],
  days_late INTEGER DEFAULT 0,
  owner TEXT,
  status delay_exception_status NOT NULL DEFAULT 'Open',
  reported_date DATE,
  resolution TEXT,
  branch TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_number TEXT NOT NULL UNIQUE,
  type shipment_type NOT NULL,
  order_ids UUID[],
  port TEXT,
  destination TEXT,
  departure_date DATE,
  eta DATE,
  status shipment_status NOT NULL DEFAULT 'Preparing',
  carrier TEXT,
  tracking_number TEXT,
  branch TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trip_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trip_number TEXT,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  date DATE,
  driver_name TEXT,
  driver_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  route TEXT[],
  orders_count INTEGER DEFAULT 0,
  distance NUMERIC(10,1),
  duration TEXT,
  status TEXT,                           -- 'Completed', 'Delayed', 'Failed'
  fuel_used NUMERIC(8,2),
  fuel_cost NUMERIC(10,2),
  revenue NUMERIC(15,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  date DATE,
  type TEXT,
  category maintenance_category,
  cost NUMERIC(10,2) DEFAULT 0,
  service_provider TEXT,
  mileage NUMERIC(12,1),
  notes TEXT,
  next_due DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS driver_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  driver_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  driver_name TEXT,
  total_trips INTEGER DEFAULT 0,
  on_time_rate NUMERIC(5,2) DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 14: WAREHOUSE OPERATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS production_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_number TEXT,
  product_name TEXT,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  planned_qty INTEGER NOT NULL DEFAULT 0,
  actual_qty INTEGER,
  qa_status qa_status DEFAULT 'Pending',
  scheduled_date DATE,
  completed_date DATE,
  branch TEXT,
  defect_rate NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warehouse_order_fulfillment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  order_number TEXT,
  customer TEXT,
  truck_assigned TEXT,
  weight_utilization NUMERIC(5,2),
  required_date DATE,
  products_summary TEXT,
  stock_status warehouse_stock_status DEFAULT 'Fully Available',
  fulfillment_status fulfillment_status DEFAULT 'To Pick',
  urgency urgency_level,
  branch TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS warehouse_loading_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fulfillment_id UUID NOT NULL REFERENCES warehouse_order_fulfillment(id) ON DELETE CASCADE,
  product_name TEXT,
  qty INTEGER DEFAULT 0,
  status loading_detail_status DEFAULT 'Pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quality_issues (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_name TEXT,
  batch_number TEXT,
  issue_type quality_issue_type NOT NULL,
  reason TEXT,
  qty_affected INTEGER DEFAULT 0,
  status quality_issue_status NOT NULL DEFAULT 'Open',
  reported_date DATE,
  assigned_to TEXT,
  resolution TEXT,
  branch TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS machines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  machine_name TEXT NOT NULL,
  utilization_percent NUMERIC(5,2) DEFAULT 0,
  quota_completion_percent NUMERIC(5,2) DEFAULT 0,
  next_maintenance DATE,
  error_rate NUMERIC(5,2) DEFAULT 0,
  status machine_status_enum NOT NULL DEFAULT 'Idle',
  branch TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Warehouse-level stock movements (unified In/Out/Transfer/Adjust/Production/Damage)
CREATE TABLE IF NOT EXISTS warehouse_stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_name TEXT,
  type warehouse_movement_type NOT NULL,
  quantity INTEGER NOT NULL,
  reference TEXT,
  from_location TEXT,
  to_location TEXT,
  performed_by TEXT,
  notes TEXT,
  branch TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 15: CHAT / MESSAGING
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  branch TEXT,
  role TEXT,
  status chat_user_status DEFAULT 'offline',
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  type chat_type NOT NULL DEFAULT 'direct',
  avatar TEXT,
  created_by UUID REFERENCES chat_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_members (
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  sender_name TEXT,
  sender_avatar TEXT,
  content TEXT NOT NULL,
  edited BOOLEAN DEFAULT FALSE,
  edited_at TIMESTAMPTZ,
  reply_to_message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  reply_to_sender_name TEXT,
  reply_to_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS message_read_receipts (
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES chat_users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);


-- ============================================================================
-- SECTION 16: AUDIT LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_name TEXT,
  user_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  role user_role,
  action TEXT NOT NULL,
  entity TEXT,
  details TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 17: NOTIFICATIONS & ALERTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  category notification_category NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  urgent BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  action_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Generic alerts (warehouse, logistics, agent)
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_source TEXT,                     -- 'warehouse', 'logistics', 'agent', 'executive'
  type TEXT NOT NULL,
  severity alert_severity NOT NULL DEFAULT 'Low',
  title TEXT NOT NULL,
  message TEXT,
  item_name TEXT,
  action_required BOOLEAN DEFAULT FALSE,
  related_entity TEXT,
  branch TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 18: COMPANY SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT,
  trade_name TEXT,
  registration_number TEXT,
  tax_id TEXT,
  industry TEXT,
  founded_year INTEGER,
  website TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  role TEXT,
  department TEXT,
  phone TEXT,
  email TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type address_type NOT NULL,
  label TEXT,
  street TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Philippines',
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_payment_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type payment_profile_type NOT NULL,
  name TEXT,
  account_number TEXT,                   -- encrypt at app level
  bank_name TEXT,
  expiry_date TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_social_media (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform social_platform NOT NULL,
  url TEXT,
  followers INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 19: CALENDAR EVENTS (Executive / Logistics scheduling)
-- ============================================================================

CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  date DATE NOT NULL,
  type TEXT,                             -- 'Outgoing', 'Incoming', 'Transfer'
  at_risk BOOLEAN DEFAULT FALSE,
  details TEXT,
  branch TEXT,
  related_entity_id UUID,
  related_entity_type TEXT,              -- 'order', 'trip', 'shipment'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================================
-- SECTION 20: INDEXES
-- Performance indexes on frequently queried columns
-- ============================================================================

-- Orders
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_agent_id ON orders(agent_id);
CREATE INDEX IF NOT EXISTS idx_orders_branch ON orders(branch);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_line_items_order ON order_line_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_logs_order ON order_logs(order_id);

-- Products
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(sku);

-- Materials
CREATE INDEX IF NOT EXISTS idx_raw_materials_category ON raw_materials(category_id);
CREATE INDEX IF NOT EXISTS idx_raw_materials_status ON raw_materials(status);
CREATE INDEX IF NOT EXISTS idx_material_batches_material ON material_batches(material_id);
CREATE INDEX IF NOT EXISTS idx_material_stock_movements_material ON material_stock_movements(material_id);

-- Customers
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_agent ON customers(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_customers_branch ON customers(branch);
CREATE INDEX IF NOT EXISTS idx_customer_notes_customer ON customer_notes(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_tasks_customer ON customer_tasks(customer_id);

-- Employees
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_branch ON employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);

-- Logistics
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle ON trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_trip ON delivery_tracking(trip_id);

-- Finance
CREATE INDEX IF NOT EXISTS idx_invoices_order ON invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_payment_links_token ON payment_links(token);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_receivables_customer ON receivables(customer_id);
CREATE INDEX IF NOT EXISTS idx_receivables_status ON receivables(status);

-- Purchasing
CREATE INDEX IF NOT EXISTS idx_purchase_requisitions_status ON purchase_requisitions(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);

-- Chat
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);

-- Audit
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity);

-- Alerts / Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_alerts_branch ON alerts(branch);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved);

-- Warehouse
CREATE INDEX IF NOT EXISTS idx_production_batches_status ON production_batches(qa_status);
CREATE INDEX IF NOT EXISTS idx_quality_issues_status ON quality_issues(status);
CREATE INDEX IF NOT EXISTS idx_warehouse_fulfillment_order ON warehouse_order_fulfillment(order_id);


-- ============================================================================
-- SECTION 21: UPDATED_AT TRIGGER FUNCTION
-- Auto-update updated_at on any row modification
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
DO $$
DECLARE
  tbl TEXT;
  trg_name TEXT;
BEGIN
  FOR tbl IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at'
      AND table_schema = 'public'
    GROUP BY table_name
  LOOP
    trg_name := 'trg_' || tbl || '_updated_at';
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.triggers
      WHERE trigger_name = trg_name AND event_object_table = tbl
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
        trg_name, tbl
      );
    END IF;
  END LOOP;
END $$;


-- ============================================================================
-- SECTION 22: ROW LEVEL SECURITY (RLS) - Scaffolding
-- Enable RLS on sensitive tables. Policies to be defined per app auth logic.
-- ============================================================================

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_personal_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_bank_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_government_ids ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Permissive policy for service_role (server-side) - allows full access
-- Individual user policies should be added when auth is implemented
DO $$
DECLARE
  tbl TEXT;
  pol_name TEXT;
BEGIN
  FOR tbl IN
    VALUES ('employees'), ('employee_personal_info'), ('employee_bank_details'),
           ('employee_government_ids'), ('orders'), ('invoices'), ('customers'),
           ('payment_transactions'), ('payment_records'), ('chat_messages'), ('audit_logs')
  LOOP
    pol_name := 'allow_service_role_' || tbl;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE policyname = pol_name AND tablename = tbl
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)',
        pol_name, tbl
      );
    END IF;
  END LOOP;
END $$;


-- ============================================================================
-- SECTION 23: SEED DEFAULT DATA
-- ============================================================================

-- Default branches
INSERT INTO branches (name, location)
VALUES
  ('Branch A', 'Metro Manila'),
  ('Branch B', 'Cebu'),
  ('Branch C', 'Davao')
ON CONFLICT (name) DO NOTHING;

-- Default product categories
INSERT INTO product_categories (name, description) VALUES
  ('HDPE Pipes', 'High-Density Polyethylene pipes'),
  ('HDPE Fittings', 'HDPE pipe fittings and connectors'),
  ('UPVC Sanitary', 'UPVC sanitary drainage pipes'),
  ('UPVC Electrical', 'UPVC electrical conduit pipes'),
  ('UPVC Potable Water', 'UPVC potable water supply pipes'),
  ('UPVC Pressurized', 'UPVC pressurized line pipes'),
  ('PPR Pipes', 'Polypropylene Random Copolymer pipes'),
  ('PPR Fittings', 'PPR pipe fittings'),
  ('Telecom Pipes', 'Telecommunications conduit pipes'),
  ('Garden Hoses', 'Flexible garden hoses'),
  ('Flexible Hoses', 'Flexible connection hoses'),
  ('Others', 'Miscellaneous products')
ON CONFLICT (name) DO NOTHING;

-- Default material categories
INSERT INTO material_categories (name, description) VALUES
  ('PVC Resin', 'Polyvinyl chloride resin for pipe manufacturing'),
  ('HDPE Resin', 'High-density polyethylene for durable products'),
  ('PPR Resin', 'Polypropylene random copolymer resin'),
  ('Stabilizers', 'Heat and UV stabilizers for material protection'),
  ('Plasticizers', 'Additives for flexibility and workability'),
  ('Lubricants', 'Processing aids and lubricants'),
  ('Colorants', 'Pigments and color masterbatches'),
  ('Additives', 'Performance-enhancing additives'),
  ('Packaging Materials', 'Packaging supplies and materials'),
  ('Other', 'Miscellaneous raw materials')
ON CONFLICT (name) DO NOTHING;

-- Default payment method fee configurations
INSERT INTO payment_method_fees (method, gateway_fee_percent, gateway_fee_fixed, service_fee_percent, service_fee_fixed, enabled, description) VALUES
  ('GCash',         1.50, 0,   0.75, 200, TRUE,  'Pay via GCash wallet - instant confirmation'),
  ('Maya',          1.50, 0,   0.75, 200, TRUE,  'Pay via Maya wallet - instant confirmation'),
  ('Bank Transfer', 0.00, 500, 0.50, 300, TRUE,  'Direct bank transfer - processed within 24 hours'),
  ('Credit Card',   2.50, 0,   0.75, 200, TRUE,  'Pay with Visa, Mastercard, JCB - instant confirmation'),
  ('Debit Card',    2.00, 0,   0.75, 200, TRUE,  'Pay with debit card - instant confirmation'),
  ('Cash',          0.00, 0,   0.00, 0,   TRUE,  'Cash payment'),
  ('Check',         0.00, 0,   0.00, 0,   TRUE,  'Check payment')
ON CONFLICT (method) DO NOTHING;


-- ============================================================================
-- DONE! Schema creation complete.
-- Total: ~60 tables, ~100 enums, indexes, triggers, RLS scaffolding, seed data
-- ============================================================================
