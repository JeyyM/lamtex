/**
 * Employees + role-aware performance from Supabase.
 */
import { supabase } from '@/src/lib/supabase';
import type { EmployeeRole, EmployeeStatus } from '@/src/types/employee';

export type EmployeeBase = {
  id: string;
  employeeId: string;
  employeeName: string;
  role: EmployeeRole | null;
  department: string | null;
  branchId: string | null;
  branchName: string | null;
  status: EmployeeStatus;
  joinDate: string | null;
  tenure: number;
  email: string;
  phone: string | null;
  profilePhoto: string | null;
};

export type SalesAgentPerf = EmployeeBase & {
  role: 'Sales Agent';
  activeCustomers: number;
  totalRevenue: number;
  commission: number;
  territoryCoverage: string | null;
};

export type LogisticsManagerPerf = EmployeeBase & {
  role: 'Logistics Manager';
  deliveriesManaged: number;
  onTimeDeliveryRate: number | null;
  trucksManaged: number;
  routesOptimized: number;
};

export type WarehouseManagerPerf = EmployeeBase & {
  role: 'Warehouse Manager';
  ordersProcessed: number;
  staffManaged: number;
  inventoryAccuracy: number | null;
  warehouseSize: string | null;
};

export type TruckDriverPerf = EmployeeBase & {
  role: 'Truck Driver';
  deliveriesCompleted: number;
  truckNumber: string | null;
  licensePlate: string | null;
  distanceCovered: number | null;
  safetyRating: number | null;
};

export type EmployeePerfRow =
  | SalesAgentPerf
  | LogisticsManagerPerf
  | WarehouseManagerPerf
  | TruckDriverPerf
  | (EmployeeBase & { role: null });

export type BranchOption = { id: string; name: string };

type BranchTripStats = { completed: number; totalLast90: number; onTimePct: number | null };

type AggregateMaps = {
  customersByAgent: Map<string, number>;
  revenueByAgent: Map<string, number>;
  commissionByAgent: Map<string, number>;
  tripsByBranchAll: Map<string, BranchTripStats>;
  vehiclesByBranch: Map<string, number>;
  ordersProcessedByBranch: Map<string, number>;
  staffByBranch: Map<string, number>;
  tripsByDriver: Map<string, number>;
  activeAssignmentsByDriver: Map<string, { vehicleName: string | null; plate: string | null }>;
};

export type EmployeeSupplements = {
  compensation: {
    base_salary: number | null;
    commission_rate: number | null;
    commission_tier: string | null;
    monthly_quota: number | null;
    quarterly_quota: number | null;
    yearly_quota: number | null;
    total_monthly_compensation: number | null;
  } | null;
  personal: {
    date_of_birth: string | null;
    gender: string | null;
    nationality: string | null;
    civil_status: string | null;
  } | null;
  contact: {
    primary_phone: string | null;
    secondary_phone: string | null;
    personal_email: string | null;
    work_email: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
  } | null;
};

export type EmployeePersonalFull = {
  date_of_birth: string | null;
  age: number | null;
  gender: string | null;
  nationality: string | null;
  civil_status: string | null;
  religion: string | null;
  blood_type: string | null;
};

export type EmployeeContactFull = {
  primary_phone: string | null;
  secondary_phone: string | null;
  personal_email: string | null;
  work_email: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
};

export type EmployeeAddressRow = {
  id: string;
  address_label: string | null;
  street: string | null;
  barangay: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  is_current: boolean | null;
};

export type EmployeeEmploymentFull = {
  employment_status: string | null;
  position: string | null;
  department: string | null;
  reporting_to: string | null;
  branch_manager_name: string | null;
  work_schedule_days: string[] | null;
  work_start_time: string | null;
  work_end_time: string | null;
  shift: string | null;
};

export type EmployeeCompensationFull = {
  base_salary: number | null;
  commission_rate: number | null;
  commission_tier: string | null;
  bonus_eligibility: boolean | null;
  monthly_quota: number | null;
  quarterly_quota: number | null;
  yearly_quota: number | null;
  allowance_transport: number | null;
  allowance_meal: number | null;
  allowance_communication: number | null;
  allowance_other: number | null;
  total_monthly_compensation: number | null;
};

export type EmployeeBankFull = {
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  account_type: string | null;
  payment_frequency: string | null;
};

export type EmployeeGovernmentFull = {
  tin: string | null;
  sss: string | null;
  phil_health: string | null;
  pag_ibig: string | null;
  gov_id_type: string | null;
  gov_id_number: string | null;
};

export type EmployeeSkillRow = {
  id: string;
  skill_name: string;
  skill_level: string;
  skill_description: string | null;
  date_started: string | null;
};

export type EmployeeCertificationRow = {
  id: string;
  certification_name: string;
  issuing_organization: string | null;
  issue_date: string | null;
  expiry_date: string | null;
};

export type EmployeeTrainingRow = {
  id: string;
  training_name: string;
  completion_date: string | null;
  duration: string | null;
  instructor: string | null;
};

export type EmployeeDocumentRow = {
  id: string;
  document_type: string;
  document_name: string;
  file_url: string;
  file_size: string | null;
  uploaded_by: string | null;
  upload_date: string | null;
};

export type EmployeeAssetRow = {
  id: string;
  asset_name: string;
  asset_description: string | null;
  category_label: string | null;
  /** Legacy enum; UI prefers `category_label` when set */
  asset_type: string;
  assigned_date: string | null;
};

/** Unified timeline: HR activities + cross-module logs where `performed_by` matches the employee. */
export type EmployeeActivityFeedItem = {
  id: string;
  source: 'hr' | 'order' | 'purchase_order' | 'inter_branch' | 'production' | 'product' | 'raw_material';
  headline: string;
  timestamp: string;
  location: string | null;
  category: string;
  variant: 'success' | 'info' | 'accent' | 'neutral';
};

export type EmployeeNoteRow = {
  id: string;
  note_type: string;
  note: string;
  created_by: string | null;
  is_private: boolean | null;
  created_at: string;
};

export type CustomerPortfolioRow = {
  rowKey: string;
  customerId: string | null;
  displayName: string;
  company: string | null;
  city: string | null;
  province: string | null;
  phone: string | null;
  email: string | null;
  status: string | null;
  /** From `customers.client_type`: Office or Personal */
  clientType: string | null;
  orderCount: number;
  revenue: number;
  lastOrderDate: string | null;
};

export type EmployeeFullProfile = {
  personal: EmployeePersonalFull | null;
  contact: EmployeeContactFull | null;
  addresses: EmployeeAddressRow[];
  employment: EmployeeEmploymentFull | null;
  compensation: EmployeeCompensationFull | null;
  bank: EmployeeBankFull | null;
  government: EmployeeGovernmentFull | null;
  skills: EmployeeSkillRow[];
  certifications: EmployeeCertificationRow[];
  trainings: EmployeeTrainingRow[];
  documents: EmployeeDocumentRow[];
  assets: EmployeeAssetRow[];
  activityFeed: EmployeeActivityFeedItem[];
  notes: EmployeeNoteRow[];
  customerPortfolio: CustomerPortfolioRow[];
};

const ORDER_FULFILLED_STATUSES = ['Packed', 'In Transit', 'Delivered', 'Completed'];
const ORDER_REVENUE_EXCLUDED_STATUSES = ['Draft', 'Cancelled', 'Rejected', 'Pending'];

type EmployeeRow = {
  id: string;
  employee_id: string;
  employee_name: string;
  role: EmployeeRole | null;
  department: string | null;
  branch_id: string | null;
  status: EmployeeStatus | null;
  profile_photo: string | null;
  join_date: string | null;
  tenure_months: number | null;
  email: string | null;
  phone: string | null;
  branches: { id: string; name: string } | { id: string; name: string }[] | null;
  employee_compensation:
    | { commission_rate: number | null; commission_tier: string | null }
    | { commission_rate: number | null; commission_tier: string | null }[]
    | null;
};

function asOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** All branches — used for directory filter. */
export async function fetchBranchOptions(): Promise<BranchOption[]> {
  const { data, error } = await supabase.from('branches').select('id, name').order('name');
  if (error) {
    if (import.meta.env.DEV) console.warn('[fetchBranchOptions]', error.message);
    return [];
  }
  return ((data ?? []) as BranchOption[]).filter((b) => !!b.name);
}

const EMPLOYEE_LIST_SELECT = `id, employee_id, employee_name, role, department, branch_id, status,
       profile_photo, join_date, tenure_months, email, phone,
       branches(id, name),
       employee_compensation(commission_rate, commission_tier)`;

function isEmployeeRecordUuid(param: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    param.trim(),
  );
}

function mapEmployeeRowToPerf(row: EmployeeRow, maps: AggregateMaps): EmployeePerfRow {
  const branch = asOne(row.branches);
  const comp = asOne(row.employee_compensation);
  const statusNorm = (row.status ?? 'active') as EmployeeStatus;
  const base: EmployeeBase = {
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee_name,
    role: row.role,
    department: row.department,
    branchId: row.branch_id,
    branchName: branch?.name ?? null,
    status: statusNorm,
    joinDate: row.join_date,
    tenure: row.tenure_months ?? 0,
    email: row.email ?? '',
    phone: row.phone ?? null,
    profilePhoto: row.profile_photo,
  };

  if (row.role === 'Sales Agent') {
    return {
      ...base,
      role: 'Sales Agent',
      activeCustomers: maps.customersByAgent.get(row.id) ?? 0,
      totalRevenue: maps.revenueByAgent.get(row.id) ?? 0,
      commission: maps.commissionByAgent.get(row.id) ?? 0,
      territoryCoverage: branch?.name ?? null,
    };
  }
  if (row.role === 'Logistics Manager' && row.branch_id) {
    const t = maps.tripsByBranchAll.get(row.branch_id);
    return {
      ...base,
      role: 'Logistics Manager',
      deliveriesManaged: t?.completed ?? 0,
      onTimeDeliveryRate: t?.onTimePct ?? null,
      trucksManaged: maps.vehiclesByBranch.get(row.branch_id) ?? 0,
      routesOptimized: t?.totalLast90 ?? 0,
    };
  }
  if (row.role === 'Logistics Manager') {
    return {
      ...base,
      role: 'Logistics Manager',
      deliveriesManaged: 0,
      onTimeDeliveryRate: null,
      trucksManaged: 0,
      routesOptimized: 0,
    };
  }
  if (row.role === 'Warehouse Manager' && row.branch_id) {
    return {
      ...base,
      role: 'Warehouse Manager',
      ordersProcessed: maps.ordersProcessedByBranch.get(row.branch_id) ?? 0,
      staffManaged: maps.staffByBranch.get(row.branch_id) ?? 0,
      inventoryAccuracy: null,
      warehouseSize: null,
    };
  }
  if (row.role === 'Warehouse Manager') {
    return {
      ...base,
      role: 'Warehouse Manager',
      ordersProcessed: 0,
      staffManaged: 0,
      inventoryAccuracy: null,
      warehouseSize: null,
    };
  }
  if (row.role === 'Truck Driver') {
    const a = maps.activeAssignmentsByDriver.get(row.id);
    return {
      ...base,
      role: 'Truck Driver',
      deliveriesCompleted: maps.tripsByDriver.get(row.id) ?? 0,
      truckNumber: a?.vehicleName ?? null,
      licensePlate: a?.plate ?? null,
      distanceCovered: null,
      safetyRating: null,
    };
  }
  return { ...base, role: null };
}

async function loadAggregateMapsForEmployeeRows(rows: EmployeeRow[]): Promise<AggregateMaps> {
  const agentIds = rows.filter((r) => r.role === 'Sales Agent').map((r) => r.id);
  const branchIds = [...new Set(rows.map((r) => r.branch_id).filter((b): b is string => !!b))];
  const driverIds = rows.filter((r) => r.role === 'Truck Driver').map((r) => r.id);

  const [
    customersByAgent,
    revenueByAgent,
    commissionByAgent,
    tripsByBranchAll,
    vehiclesByBranch,
    ordersProcessedByBranch,
    staffByBranch,
    tripsByDriver,
    activeAssignmentsByDriver,
  ] = await Promise.all([
    fetchCustomersByAgent(agentIds),
    fetchRevenueByAgent(agentIds),
    fetchCommissionByAgent(agentIds),
    fetchTripsByBranch(branchIds),
    fetchVehiclesByBranch(branchIds),
    fetchOrdersProcessedByBranch(branchIds),
    fetchStaffByBranch(branchIds),
    fetchTripsByDriver(driverIds),
    fetchActiveAssignmentsByDriver(driverIds),
  ]);

  return {
    customersByAgent,
    revenueByAgent,
    commissionByAgent,
    tripsByBranchAll,
    vehiclesByBranch,
    ordersProcessedByBranch,
    staffByBranch,
    tripsByDriver,
    activeAssignmentsByDriver,
  };
}

export async function fetchEmployeesWithPerformance(): Promise<EmployeePerfRow[]> {
  const { data, error } = await supabase
    .from('employees')
    .select(EMPLOYEE_LIST_SELECT)
    .order('employee_name');
  if (error) throw error;
  const rows = (data ?? []) as EmployeeRow[];
  const kept = rows.filter((r) => r.role !== ('Machine Worker' as EmployeeRole));
  const maps = await loadAggregateMapsForEmployeeRows(kept);
  return kept.map((row) => mapEmployeeRowToPerf(row, maps));
}

export async function fetchEmployeeWithPerformanceByIdentifier(
  employeeIdOrUuid: string,
): Promise<EmployeePerfRow | null> {
  const param = employeeIdOrUuid.trim();
  if (!param) return null;
  const column = isEmployeeRecordUuid(param) ? 'id' : 'employee_id';
  const { data, error } = await supabase
    .from('employees')
    .select(EMPLOYEE_LIST_SELECT)
    .eq(column, param)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as EmployeeRow;
  if (row.role === ('Machine Worker' as EmployeeRole)) return null;
  const maps = await loadAggregateMapsForEmployeeRows([row]);
  return mapEmployeeRowToPerf(row, maps);
}

export async function fetchEmployeeSupplements(employeeUuid: string): Promise<EmployeeSupplements> {
  const id = employeeUuid.trim();
  const empty: EmployeeSupplements = { compensation: null, personal: null, contact: null };
  if (!id) return empty;

  const [compRes, personalRes, contactRes] = await Promise.all([
    supabase
      .from('employee_compensation')
      .select(
        'base_salary, commission_rate, commission_tier, monthly_quota, quarterly_quota, yearly_quota, total_monthly_compensation',
      )
      .eq('employee_id', id)
      .maybeSingle(),
    supabase
      .from('employee_personal_info')
      .select('date_of_birth, gender, nationality, civil_status')
      .eq('employee_id', id)
      .maybeSingle(),
    supabase
      .from('employee_contact_info')
      .select(
        'primary_phone, secondary_phone, personal_email, work_email, emergency_contact_name, emergency_contact_phone',
      )
      .eq('employee_id', id)
      .maybeSingle(),
  ]);

  if (compRes.error && import.meta.env.DEV) console.warn('[employee compensation]', compRes.error.message);
  if (personalRes.error && import.meta.env.DEV)
    console.warn('[employee personal]', personalRes.error.message);
  if (contactRes.error && import.meta.env.DEV) console.warn('[employee contact]', contactRes.error.message);

  const c = compRes.data as Record<string, unknown> | null;
  const p = personalRes.data as Record<string, unknown> | null;
  const ct = contactRes.data as Record<string, unknown> | null;

  return {
    compensation: c
      ? {
          base_salary: c.base_salary != null ? Number(c.base_salary) : null,
          commission_rate: c.commission_rate != null ? Number(c.commission_rate) : null,
          commission_tier: (c.commission_tier as string | null) ?? null,
          monthly_quota: c.monthly_quota != null ? Number(c.monthly_quota) : null,
          quarterly_quota: c.quarterly_quota != null ? Number(c.quarterly_quota) : null,
          yearly_quota: c.yearly_quota != null ? Number(c.yearly_quota) : null,
          total_monthly_compensation:
            c.total_monthly_compensation != null ? Number(c.total_monthly_compensation) : null,
        }
      : null,
    personal: p
      ? {
          date_of_birth: (p.date_of_birth as string | null) ?? null,
          gender: p.gender != null ? String(p.gender) : null,
          nationality: (p.nationality as string | null) ?? null,
          civil_status: p.civil_status != null ? String(p.civil_status) : null,
        }
      : null,
    contact: ct
      ? {
          primary_phone: (ct.primary_phone as string | null) ?? null,
          secondary_phone: (ct.secondary_phone as string | null) ?? null,
          personal_email: (ct.personal_email as string | null) ?? null,
          work_email: (ct.work_email as string | null) ?? null,
          emergency_contact_name: (ct.emergency_contact_name as string | null) ?? null,
          emergency_contact_phone: (ct.emergency_contact_phone as string | null) ?? null,
        }
      : null,
  };
}

type OrderAggRow = { count: number; revenue: number; lastOrder: string | null };

function emptyEmployeeFullProfile(): EmployeeFullProfile {
  return {
    personal: null,
    contact: null,
    addresses: [],
    employment: null,
    compensation: null,
    bank: null,
    government: null,
    skills: [],
    certifications: [],
    trainings: [],
    documents: [],
    assets: [],
    activityFeed: [],
    notes: [],
    customerPortfolio: [],
  };
}

const ACTIVITY_FEED_LIMIT = 250;

function performedByMatchList(name: string | null | undefined, email: string | null | undefined): string[] {
  const raw = [name?.trim(), email?.trim()].filter((x): x is string => !!x);
  return [...new Set(raw)];
}

function nestedBranchName(parent: unknown): string | null {
  if (!parent || typeof parent !== 'object') return null;
  const p = parent as Record<string, unknown>;
  const br = p.branches;
  if (Array.isArray(br)) {
    const x = br[0];
    if (x && typeof x === 'object' && 'name' in x) return String((x as { name: unknown }).name);
    return null;
  }
  if (br && typeof br === 'object' && 'name' in br) return String((br as { name: unknown }).name);
  return null;
}

function hrActivityVariant(activityType: string): EmployeeActivityFeedItem['variant'] {
  switch (activityType) {
    case 'Order Created':
      return 'success';
    case 'Customer Visit':
      return 'info';
    case 'Quote Generated':
      return 'accent';
    case 'Meeting':
      return 'info';
    case 'Login':
      return 'neutral';
    default:
      return 'neutral';
  }
}

function orderLogVariant(action: string): EmployeeActivityFeedItem['variant'] {
  const a = action.toLowerCase();
  if (a === 'created') return 'success';
  if (a.includes('proof') || a.includes('packed') || a.includes('transit') || a.includes('deliver')) return 'info';
  if (a.includes('invoice') || a.includes('payment') || a.includes('discount') || a.includes('billed')) return 'accent';
  return 'neutral';
}

function genericLogVariant(action: string): EmployeeActivityFeedItem['variant'] {
  const a = action.toLowerCase();
  if (a.includes('creat') || a.includes('submit') || a.includes('approv')) return 'success';
  if (a.includes('reject') || a.includes('cancel')) return 'neutral';
  if (a.includes('receiv') || a.includes('ship') || a.includes('load')) return 'info';
  return 'info';
}

async function fetchCrossModuleLogsPerformedBy(performedBy: string[]): Promise<{
  orderLogs: Record<string, unknown>[];
  poLogs: Record<string, unknown>[];
  ibrLogs: Record<string, unknown>[];
  prLogs: Record<string, unknown>[];
  productLogs: Record<string, unknown>[];
  materialLogs: Record<string, unknown>[];
}> {
  if (performedBy.length === 0) {
    return { orderLogs: [], poLogs: [], ibrLogs: [], prLogs: [], productLogs: [], materialLogs: [] };
  }
  const selOrder = `id, order_id, action, description, timestamp, orders(order_number, branches(name))`;
  const selPo = `id, order_id, action, description, created_at, purchase_orders(po_number, branches(name))`;
  const selIbr = `id, action, description, created_at, inter_branch_requests(ibr_number)`;
  const selPr = `id, action, description, created_at`;
  const selProd = `id, action, description, created_at, products(name)`;
  const selMat = `id, action, description, created_at, raw_materials(name, sku)`;

  const [oRes, poRes, ibrRes, prRes, prodRes, matRes] = await Promise.all([
    supabase
      .from('order_logs')
      .select(selOrder)
      .in('performed_by', performedBy)
      .order('timestamp', { ascending: false })
      .limit(200),
    supabase
      .from('purchase_order_logs')
      .select(selPo)
      .in('performed_by', performedBy)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('inter_branch_request_logs')
      .select(selIbr)
      .in('performed_by', performedBy)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('production_request_logs')
      .select(selPr)
      .in('performed_by', performedBy)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('product_logs')
      .select(selProd)
      .in('performed_by', performedBy)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('raw_material_logs')
      .select(selMat)
      .in('performed_by', performedBy)
      .order('created_at', { ascending: false })
      .limit(200),
  ]);
  if (import.meta.env.DEV) {
    if (oRes.error) console.warn('[activityFeed order_logs]', oRes.error.message);
    if (poRes.error) console.warn('[activityFeed purchase_order_logs]', poRes.error.message);
    if (ibrRes.error) console.warn('[activityFeed inter_branch_request_logs]', ibrRes.error.message);
    if (prRes.error) console.warn('[activityFeed production_request_logs]', prRes.error.message);
    if (prodRes.error) console.warn('[activityFeed product_logs]', prodRes.error.message);
    if (matRes.error) console.warn('[activityFeed raw_material_logs]', matRes.error.message);
  }
  return {
    orderLogs: (oRes.data ?? []) as Record<string, unknown>[],
    poLogs: (poRes.data ?? []) as Record<string, unknown>[],
    ibrLogs: (ibrRes.data ?? []) as Record<string, unknown>[],
    prLogs: (prRes.data ?? []) as Record<string, unknown>[],
    productLogs: (prodRes.data ?? []) as Record<string, unknown>[],
    materialLogs: (matRes.data ?? []) as Record<string, unknown>[],
  };
}

function buildUnifiedActivityFeed(
  hrRows: Record<string, unknown>[],
  orderLogs: Record<string, unknown>[],
  poLogs: Record<string, unknown>[],
  ibrLogs: Record<string, unknown>[],
  prLogs: Record<string, unknown>[],
  productLogs: Record<string, unknown>[],
  materialLogs: Record<string, unknown>[],
): EmployeeActivityFeedItem[] {
  const out: EmployeeActivityFeedItem[] = [];

  for (const r of hrRows) {
    const rid = String(r.id ?? '');
    const activityType = r.activity_type != null ? String(r.activity_type) : '';
    const description = String(r.description ?? '');
    const ts = String(r.timestamp ?? '');
    out.push({
      id: `hr-${rid}`,
      source: 'hr',
      headline: description.trim() || activityType || 'Activity',
      timestamp: ts,
      location: (r.location as string | null) ?? null,
      category: activityType || 'Recorded activity',
      variant: hrActivityVariant(activityType),
    });
  }

  for (const r of orderLogs) {
    const rid = String(r.id ?? '');
    const action = r.action != null ? String(r.action) : '';
    const description = (r.description as string | null) ?? '';
    const ts = String(r.timestamp ?? '');
    const ord = asOne(r.orders as Record<string, unknown> | Record<string, unknown>[] | null | undefined);
    const orderNumber = ord && 'order_number' in ord ? String(ord.order_number ?? '') : '';
    const loc = nestedBranchName(ord);
    const headline =
      description.trim() ||
      [action, orderNumber].filter(Boolean).join(' · ') ||
      action ||
      'Order update';
    out.push({
      id: `ord-${rid}`,
      source: 'order',
      headline,
      timestamp: ts,
      location: loc,
      category: 'Sales order',
      variant: orderLogVariant(action),
    });
  }

  for (const r of poLogs) {
    const rid = String(r.id ?? '');
    const action = r.action != null ? String(r.action) : '';
    const description = (r.description as string | null) ?? '';
    const ts = String(r.created_at ?? '');
    const po = asOne(r.purchase_orders as Record<string, unknown> | Record<string, unknown>[] | null | undefined);
    const poNum = po && 'po_number' in po ? String(po.po_number ?? '') : '';
    const loc = nestedBranchName(po);
    const headline =
      description.trim() || [action, poNum].filter(Boolean).join(' · ') || action || 'Purchase order';
    out.push({
      id: `po-${rid}`,
      source: 'purchase_order',
      headline,
      timestamp: ts,
      location: loc,
      category: 'Purchase order',
      variant: genericLogVariant(action),
    });
  }

  for (const r of ibrLogs) {
    const rid = String(r.id ?? '');
    const action = r.action != null ? String(r.action) : '';
    const description = (r.description as string | null) ?? '';
    const ts = String(r.created_at ?? '');
    const ibr = asOne(r.inter_branch_requests as Record<string, unknown> | Record<string, unknown>[] | null | undefined);
    const ibrNum = ibr && 'ibr_number' in ibr ? String(ibr.ibr_number ?? '') : '';
    const headline =
      description.trim() || [action, ibrNum].filter(Boolean).join(' · ') || action || 'Inter-branch';
    out.push({
      id: `ibr-${rid}`,
      source: 'inter_branch',
      headline,
      timestamp: ts,
      location: null,
      category: 'Inter-branch',
      variant: genericLogVariant(action),
    });
  }

  for (const r of prLogs) {
    const rid = String(r.id ?? '');
    const action = r.action != null ? String(r.action) : '';
    const description = (r.description as string | null) ?? '';
    const ts = String(r.created_at ?? '');
    const headline = description.trim() || action || 'Production';
    out.push({
      id: `prd-${rid}`,
      source: 'production',
      headline,
      timestamp: ts,
      location: null,
      category: 'Production',
      variant: genericLogVariant(action),
    });
  }

  for (const r of productLogs) {
    const rid = String(r.id ?? '');
    const action = r.action != null ? String(r.action) : '';
    const description = (r.description as string | null) ?? '';
    const ts = String(r.created_at ?? '');
    const prod = asOne(r.products as Record<string, unknown> | Record<string, unknown>[] | null | undefined);
    const productName = prod && 'name' in prod ? String(prod.name ?? '') : '';
    const headline =
      description.trim() ||
      [action, productName].filter(Boolean).join(' · ') ||
      action ||
      'Product';
    out.push({
      id: `pdl-${rid}`,
      source: 'product',
      headline,
      timestamp: ts,
      location: null,
      category: 'Product',
      variant: genericLogVariant(action),
    });
  }

  for (const r of materialLogs) {
    const rid = String(r.id ?? '');
    const action = r.action != null ? String(r.action) : '';
    const description = (r.description as string | null) ?? '';
    const ts = String(r.created_at ?? '');
    const rm = asOne(
      r.raw_materials as Record<string, unknown> | Record<string, unknown>[] | null | undefined,
    );
    const matName = rm && 'name' in rm ? String(rm.name ?? '') : '';
    const sku = rm && 'sku' in rm ? String(rm.sku ?? '') : '';
    const headline =
      description.trim() ||
      [action, matName, sku].filter(Boolean).join(' · ') ||
      action ||
      'Raw material';
    out.push({
      id: `rml-${rid}`,
      source: 'raw_material',
      headline,
      timestamp: ts,
      location: null,
      category: 'Raw material',
      variant: genericLogVariant(action),
    });
  }

  out.sort((a, b) => {
    const ta = new Date(a.timestamp).getTime();
    const tb = new Date(b.timestamp).getTime();
    if (Number.isNaN(ta) && Number.isNaN(tb)) return a.id.localeCompare(b.id);
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    if (tb !== ta) return tb - ta;
    return a.id.localeCompare(b.id);
  });

  return out.slice(0, ACTIVITY_FEED_LIMIT);
}

function aggregateOrdersByCustomer(
  orders: Array<{
    customer_id: string | null;
    total_amount: unknown;
    order_date: string | null;
    status: string | null;
  }>,
): Map<string, OrderAggRow> {
  const map = new Map<string, OrderAggRow>();
  for (const o of orders) {
    if (!o.customer_id) continue;
    if (o.status && ORDER_REVENUE_EXCLUDED_STATUSES.includes(o.status)) continue;
    const cur = map.get(o.customer_id) ?? { count: 0, revenue: 0, lastOrder: null as string | null };
    cur.count += 1;
    cur.revenue += Number(o.total_amount) || 0;
    const od = o.order_date;
    if (od && (!cur.lastOrder || od > cur.lastOrder)) cur.lastOrder = od;
    map.set(o.customer_id, cur);
  }
  return map;
}

function clientTypeFromCustomersRelation(rel: unknown): string | null {
  if (rel == null) return null;
  const obj = Array.isArray(rel) ? rel[0] : rel;
  if (!obj || typeof obj !== 'object' || !('client_type' in obj)) return null;
  const v = (obj as { client_type?: unknown }).client_type;
  return v != null ? String(v) : null;
}

function buildCustomerPortfolio(
  linkedCustomers: Array<{
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    contact_person: string | null;
    city: string | null;
    province: string | null;
    status: string | null;
    client_type: string | null;
  }>,
  assignments: Array<Record<string, unknown>>,
  fullOrderAgg: Map<string, OrderAggRow>,
): CustomerPortfolioRow[] {
  const linkedIds = new Set(linkedCustomers.map((c) => c.id));
  const rows: CustomerPortfolioRow[] = [];

  for (const c of linkedCustomers) {
    const agg = fullOrderAgg.get(c.id) ?? { count: 0, revenue: 0, lastOrder: null };
    rows.push({
      rowKey: c.id,
      customerId: c.id,
      displayName: c.name,
      company: c.contact_person ?? null,
      city: c.city ?? null,
      province: c.province ?? null,
      phone: c.phone ?? null,
      email: c.email ?? null,
      status: c.status ?? null,
      clientType: c.client_type != null ? String(c.client_type) : null,
      orderCount: agg.count,
      revenue: agg.revenue,
      lastOrderDate: agg.lastOrder,
    });
  }

  for (const a of assignments) {
    const cid = (a.customer_id as string | null) ?? null;
    if (cid && linkedIds.has(cid)) continue;
    const asgId = String(a.id ?? '');
    const fromAgg = cid ? fullOrderAgg.get(cid) : undefined;
    rows.push({
      rowKey: `asg-${asgId}`,
      customerId: cid,
      displayName:
        (a.customer_name as string | null) ?? (a.company as string | null) ?? 'Customer',
      company: (a.company as string | null) ?? null,
      city: null,
      province: null,
      phone: (a.contact_number as string | null) ?? null,
      email: (a.email as string | null) ?? null,
      status: (a.status as string | null) ?? null,
      clientType: clientTypeFromCustomersRelation(a.customers),
      orderCount: fromAgg != null ? fromAgg.count : Number(a.total_orders) || 0,
      revenue: fromAgg != null ? fromAgg.revenue : Number(a.lifetime_revenue) || 0,
      lastOrderDate: fromAgg?.lastOrder ?? (a.last_order_date as string | null) ?? null,
    });
  }

  return rows;
}

export async function fetchEmployeeFullProfile(employeeUuid: string): Promise<EmployeeFullProfile> {
  const id = employeeUuid.trim();
  if (!id) return emptyEmployeeFullProfile();

  const warn = (scope: string, err: { message: string } | null) => {
    if (err && import.meta.env.DEV) console.warn(`[employee profile ${scope}]`, err.message);
  };

  const [
    empCoreRes,
    personalRes,
    contactRes,
    addressesRes,
    employmentRes,
    compensationRes,
    bankRes,
    govRes,
    skillsRes,
    certsRes,
    trainingsRes,
    documentsRes,
    assetsRes,
    activitiesRes,
    notesRes,
    customersRes,
    assignmentsRes,
  ] = await Promise.all([
    supabase.from('employees').select('employee_name, email').eq('id', id).maybeSingle(),
    supabase.from('employee_personal_info').select('*').eq('employee_id', id).maybeSingle(),
    supabase.from('employee_contact_info').select('*').eq('employee_id', id).maybeSingle(),
    supabase.from('employee_addresses').select('*').eq('employee_id', id).order('is_current', { ascending: false }),
    supabase.from('employee_employment_info').select('*').eq('employee_id', id).maybeSingle(),
    supabase.from('employee_compensation').select('*').eq('employee_id', id).maybeSingle(),
    supabase.from('employee_bank_details').select('*').eq('employee_id', id).maybeSingle(),
    supabase.from('employee_government_ids').select('*').eq('employee_id', id).maybeSingle(),
    supabase.from('employee_skills').select('*').eq('employee_id', id).order('skill_name'),
    supabase.from('employee_certifications').select('*').eq('employee_id', id).order('issue_date', { ascending: false }),
    supabase.from('employee_trainings').select('*').eq('employee_id', id).order('completion_date', { ascending: false }),
    supabase.from('employee_documents').select('*').eq('employee_id', id).order('upload_date', { ascending: false }),
    supabase.from('employee_assets').select('*').eq('employee_id', id).order('assigned_date', { ascending: false }),
    supabase.from('employee_activities').select('*').eq('employee_id', id).order('timestamp', { ascending: false }).limit(200),
    supabase.from('employee_notes').select('*').eq('employee_id', id).order('created_at', { ascending: false }).limit(50),
    supabase
      .from('customers')
      .select('id, name, phone, email, contact_person, city, province, status, client_type')
      .eq('assigned_agent_id', id),
    supabase
      .from('customer_assignments')
      .select('*, customers(client_type)')
      .eq('employee_id', id)
      .order('assigned_date', { ascending: false }),
  ]);

  warn('employee_core', empCoreRes.error);
  warn('personal', personalRes.error);
  warn('contact', contactRes.error);
  warn('addresses', addressesRes.error);
  warn('employment', employmentRes.error);
  warn('compensation', compensationRes.error);
  warn('bank', bankRes.error);
  warn('government', govRes.error);
  warn('skills', skillsRes.error);
  warn('certifications', certsRes.error);
  warn('trainings', trainingsRes.error);
  warn('documents', documentsRes.error);
  warn('assets', assetsRes.error);
  warn('activities', activitiesRes.error);
  warn('notes', notesRes.error);
  warn('customers', customersRes.error);
  warn('assignments', assignmentsRes.error);

  const customers = (customersRes.data ?? []) as Array<{
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    contact_person: string | null;
    city: string | null;
    province: string | null;
    status: string | null;
    client_type: string | null;
  }>;
  const assignments = (assignmentsRes.data ?? []) as Array<Record<string, unknown>>;

  const linkedIds = new Set(customers.map((c) => c.id));
  const custIds = customers.map((c) => c.id);
  let orderAgg = new Map<string, OrderAggRow>();
  if (custIds.length > 0) {
    const { data: orders, error: ordErr } = await supabase
      .from('orders')
      .select('customer_id, total_amount, order_date, status')
      .in('customer_id', custIds);
    warn('orders', ordErr);
    orderAgg = aggregateOrdersByCustomer((orders ?? []) as Parameters<typeof aggregateOrdersByCustomer>[0]);
  }

  const fullOrderAgg = new Map(orderAgg);
  const orphanCustIds = [
    ...new Set(
      assignments
        .map((a) => a.customer_id as string | null)
        .filter((x): x is string => !!x && !linkedIds.has(x)),
    ),
  ];
  if (orphanCustIds.length > 0) {
    const { data: orders2, error: ordErr2 } = await supabase
      .from('orders')
      .select('customer_id, total_amount, order_date, status')
      .in('customer_id', orphanCustIds);
    warn('orders (assignment customers)', ordErr2);
    for (const [k, v] of aggregateOrdersByCustomer(
      (orders2 ?? []) as Parameters<typeof aggregateOrdersByCustomer>[0],
    )) {
      fullOrderAgg.set(k, v);
    }
  }

  const customerPortfolio = buildCustomerPortfolio(customers, assignments, fullOrderAgg);

  const empCore = empCoreRes.data as { employee_name?: string; email?: string } | null;
  const performedBy = performedByMatchList(empCore?.employee_name, empCore?.email);
  const hrRaw = (activitiesRes.data ?? []) as Record<string, unknown>[];
  const crossLogs = await fetchCrossModuleLogsPerformedBy(performedBy);
  const activityFeed = buildUnifiedActivityFeed(
    hrRaw,
    crossLogs.orderLogs,
    crossLogs.poLogs,
    crossLogs.ibrLogs,
    crossLogs.prLogs,
    crossLogs.productLogs,
    crossLogs.materialLogs,
  );

  const pr = personalRes.data as Record<string, unknown> | null;
  const ct = contactRes.data as Record<string, unknown> | null;
  const em = employmentRes.data as Record<string, unknown> | null;
  const comp = compensationRes.data as Record<string, unknown> | null;
  const bn = bankRes.data as Record<string, unknown> | null;
  const gv = govRes.data as Record<string, unknown> | null;

  const personal: EmployeePersonalFull | null = pr
    ? {
        date_of_birth: (pr.date_of_birth as string | null) ?? null,
        age: pr.age != null ? Number(pr.age) : null,
        gender: pr.gender != null ? String(pr.gender) : null,
        nationality: (pr.nationality as string | null) ?? null,
        civil_status: pr.civil_status != null ? String(pr.civil_status) : null,
        religion: (pr.religion as string | null) ?? null,
        blood_type: (pr.blood_type as string | null) ?? null,
      }
    : null;

  const contact: EmployeeContactFull | null = ct
    ? {
        primary_phone: (ct.primary_phone as string | null) ?? null,
        secondary_phone: (ct.secondary_phone as string | null) ?? null,
        personal_email: (ct.personal_email as string | null) ?? null,
        work_email: (ct.work_email as string | null) ?? null,
        emergency_contact_name: (ct.emergency_contact_name as string | null) ?? null,
        emergency_contact_phone: (ct.emergency_contact_phone as string | null) ?? null,
        emergency_contact_relationship: (ct.emergency_contact_relationship as string | null) ?? null,
      }
    : null;

  const addresses: EmployeeAddressRow[] = ((addressesRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    address_label: (r.address_label as string | null) ?? null,
    street: (r.street as string | null) ?? null,
    barangay: (r.barangay as string | null) ?? null,
    city: (r.city as string | null) ?? null,
    province: (r.province as string | null) ?? null,
    postal_code: (r.postal_code as string | null) ?? null,
    is_current: (r.is_current as boolean | null) ?? null,
  }));

  const employment: EmployeeEmploymentFull | null = em
    ? {
        employment_status: em.employment_status != null ? String(em.employment_status) : null,
        position: (em.position as string | null) ?? null,
        department: (em.department as string | null) ?? null,
        reporting_to: (em.reporting_to as string | null) ?? null,
        branch_manager_name: (em.branch_manager_name as string | null) ?? null,
        work_schedule_days: Array.isArray(em.work_schedule_days)
          ? (em.work_schedule_days as string[])
          : null,
        work_start_time: (em.work_start_time as string | null) ?? null,
        work_end_time: (em.work_end_time as string | null) ?? null,
        shift: (em.shift as string | null) ?? null,
      }
    : null;

  const compensation: EmployeeCompensationFull | null = comp
    ? {
        base_salary: comp.base_salary != null ? Number(comp.base_salary) : null,
        commission_rate: comp.commission_rate != null ? Number(comp.commission_rate) : null,
        commission_tier: comp.commission_tier != null ? String(comp.commission_tier) : null,
        bonus_eligibility: typeof comp.bonus_eligibility === 'boolean' ? comp.bonus_eligibility : null,
        monthly_quota: comp.monthly_quota != null ? Number(comp.monthly_quota) : null,
        quarterly_quota: comp.quarterly_quota != null ? Number(comp.quarterly_quota) : null,
        yearly_quota: comp.yearly_quota != null ? Number(comp.yearly_quota) : null,
        allowance_transport: comp.allowance_transport != null ? Number(comp.allowance_transport) : null,
        allowance_meal: comp.allowance_meal != null ? Number(comp.allowance_meal) : null,
        allowance_communication:
          comp.allowance_communication != null ? Number(comp.allowance_communication) : null,
        allowance_other: comp.allowance_other != null ? Number(comp.allowance_other) : null,
        total_monthly_compensation:
          comp.total_monthly_compensation != null ? Number(comp.total_monthly_compensation) : null,
      }
    : null;

  const bank: EmployeeBankFull | null = bn
    ? {
        bank_name: (bn.bank_name as string | null) ?? null,
        account_number: (bn.account_number as string | null) ?? null,
        account_name: (bn.account_name as string | null) ?? null,
        account_type: bn.account_type != null ? String(bn.account_type) : null,
        payment_frequency: bn.payment_frequency != null ? String(bn.payment_frequency) : null,
      }
    : null;

  const government: EmployeeGovernmentFull | null = gv
    ? {
        tin: (gv.tin as string | null) ?? null,
        sss: (gv.sss as string | null) ?? null,
        phil_health: (gv.phil_health as string | null) ?? null,
        pag_ibig: (gv.pag_ibig as string | null) ?? null,
        gov_id_type: (gv.gov_id_type as string | null) ?? null,
        gov_id_number: (gv.gov_id_number as string | null) ?? null,
      }
    : null;

  const skills: EmployeeSkillRow[] = ((skillsRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    skill_name: String(r.skill_name ?? ''),
    skill_level: r.skill_level != null ? String(r.skill_level) : '',
    skill_description: (r.skill_description as string | null) ?? null,
    date_started: (r.date_started as string | null) ?? null,
  }));

  const certifications: EmployeeCertificationRow[] = ((certsRes.data ?? []) as Record<string, unknown>[]).map(
    (r) => ({
      id: String(r.id),
      certification_name: String(r.certification_name ?? ''),
      issuing_organization: (r.issuing_organization as string | null) ?? null,
      issue_date: (r.issue_date as string | null) ?? null,
      expiry_date: (r.expiry_date as string | null) ?? null,
    }),
  );

  const trainings: EmployeeTrainingRow[] = ((trainingsRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    training_name: String(r.training_name ?? ''),
    completion_date: (r.completion_date as string | null) ?? null,
    duration: (r.duration as string | null) ?? null,
    instructor: (r.instructor as string | null) ?? null,
  }));

  const documents: EmployeeDocumentRow[] = ((documentsRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    document_type: r.document_type != null ? String(r.document_type) : '',
    document_name: String(r.document_name ?? ''),
    file_url: String(r.file_url ?? ''),
    file_size: (r.file_size as string | null) ?? null,
    uploaded_by: (r.uploaded_by as string | null) ?? null,
    upload_date: (r.upload_date as string | null) ?? null,
  }));

  const assets: EmployeeAssetRow[] = ((assetsRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    asset_name: String(r.asset_name ?? ''),
    asset_description: (r.asset_description as string | null) ?? null,
    category_label: (r.category_label as string | null) ?? null,
    asset_type: r.asset_type != null ? String(r.asset_type) : '',
    assigned_date: (r.assigned_date as string | null) ?? null,
  }));

  const notes: EmployeeNoteRow[] = ((notesRes.data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    note_type: r.note_type != null ? String(r.note_type) : '',
    note: String(r.note ?? ''),
    created_by: (r.created_by as string | null) ?? null,
    is_private: typeof r.is_private === 'boolean' ? r.is_private : null,
    created_at: String(r.created_at ?? ''),
  }));

  return {
    personal,
    contact,
    addresses,
    employment,
    compensation,
    bank,
    government,
    skills,
    certifications,
    trainings,
    documents,
    assets,
    activityFeed,
    notes,
    customerPortfolio,
  };
}

/* ---------------- aggregators ---------------- */

async function fetchCustomersByAgent(agentIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (agentIds.length === 0) return out;
  const { data, error } = await supabase
    .from('customers')
    .select('assigned_agent_id, status')
    .in('assigned_agent_id', agentIds);
  if (error) {
    if (import.meta.env.DEV) console.warn('[customersByAgent]', error.message);
    return out;
  }
  for (const r of (data ?? []) as Array<{ assigned_agent_id: string | null; status: string | null }>) {
    if (!r.assigned_agent_id) continue;
    if (r.status && r.status !== 'Active') continue;
    out.set(r.assigned_agent_id, (out.get(r.assigned_agent_id) ?? 0) + 1);
  }
  return out;
}

async function fetchRevenueByAgent(agentIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (agentIds.length === 0) return out;
  const { data, error } = await supabase
    .from('orders')
    .select('agent_id, status, total_amount')
    .in('agent_id', agentIds);
  if (error) {
    if (import.meta.env.DEV) console.warn('[revenueByAgent]', error.message);
    return out;
  }
  for (const r of (data ?? []) as Array<{
    agent_id: string | null;
    status: string | null;
    total_amount: number | string | null;
  }>) {
    if (!r.agent_id) continue;
    if (r.status && ORDER_REVENUE_EXCLUDED_STATUSES.includes(r.status)) continue;
    const v = Number(r.total_amount) || 0;
    if (v <= 0) continue;
    out.set(r.agent_id, (out.get(r.agent_id) ?? 0) + v);
  }
  return out;
}

async function fetchCommissionByAgent(agentIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (agentIds.length === 0) return out;
  const { data, error } = await supabase
    .from('agent_commissions')
    .select('employee_id, commission_earned')
    .in('employee_id', agentIds);
  if (error) {
    if (import.meta.env.DEV) console.warn('[commissionByAgent]', error.message);
    return out;
  }
  for (const r of (data ?? []) as Array<{
    employee_id: string;
    commission_earned: number | string | null;
  }>) {
    out.set(r.employee_id, (out.get(r.employee_id) ?? 0) + (Number(r.commission_earned) || 0));
  }
  return out;
}

async function fetchTripsByBranch(branchIds: string[]): Promise<Map<string, BranchTripStats>> {
  const out = new Map<string, BranchTripStats>();
  if (branchIds.length === 0) return out;
  const { data, error } = await supabase
    .from('trips')
    .select('branch_id, status, eta, actual_arrival, scheduled_date')
    .in('branch_id', branchIds);
  if (error) {
    if (import.meta.env.DEV) console.warn('[tripsByBranch]', error.message);
    return out;
  }
  const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
  type Acc = { completed: number; totalLast90: number; onTimeNum: number; onTimeDen: number };
  const acc = new Map<string, Acc>();

  for (const r of (data ?? []) as Array<{
    branch_id: string | null;
    status: string | null;
    eta: string | null;
    actual_arrival: string | null;
    scheduled_date: string | null;
  }>) {
    if (!r.branch_id) continue;
    const a = acc.get(r.branch_id) ?? { completed: 0, totalLast90: 0, onTimeNum: 0, onTimeDen: 0 };

    if (r.status === 'Completed') a.completed += 1;
    if (r.scheduled_date && new Date(r.scheduled_date).getTime() >= ninetyDaysAgo) a.totalLast90 += 1;
    if (r.eta && r.actual_arrival) {
      a.onTimeDen += 1;
      if (new Date(r.actual_arrival).getTime() <= new Date(r.eta).getTime()) a.onTimeNum += 1;
    }
    acc.set(r.branch_id, a);
  }

  for (const [bId, a] of acc) {
    out.set(bId, {
      completed: a.completed,
      totalLast90: a.totalLast90,
      onTimePct: a.onTimeDen > 0 ? Math.round((a.onTimeNum * 1000) / a.onTimeDen) / 10 : null,
    });
  }
  return out;
}

async function fetchVehiclesByBranch(branchIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (branchIds.length === 0) return out;
  const { data, error } = await supabase
    .from('vehicles')
    .select('branch_id')
    .in('branch_id', branchIds);
  if (error) {
    if (import.meta.env.DEV) console.warn('[vehiclesByBranch]', error.message);
    return out;
  }
  for (const r of (data ?? []) as Array<{ branch_id: string | null }>) {
    if (!r.branch_id) continue;
    out.set(r.branch_id, (out.get(r.branch_id) ?? 0) + 1);
  }
  return out;
}

async function fetchOrdersProcessedByBranch(branchIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (branchIds.length === 0) return out;
  const { data, error } = await supabase
    .from('orders')
    .select('branch_id, status')
    .in('branch_id', branchIds)
    .in('status', ORDER_FULFILLED_STATUSES);
  if (error) {
    if (import.meta.env.DEV) console.warn('[ordersProcessedByBranch]', error.message);
    return out;
  }
  for (const r of (data ?? []) as Array<{ branch_id: string | null }>) {
    if (!r.branch_id) continue;
    out.set(r.branch_id, (out.get(r.branch_id) ?? 0) + 1);
  }
  return out;
}

async function fetchStaffByBranch(branchIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (branchIds.length === 0) return out;
  const { data, error } = await supabase
    .from('employees')
    .select('branch_id, role, status')
    .in('branch_id', branchIds);
  if (error) {
    if (import.meta.env.DEV) console.warn('[staffByBranch]', error.message);
    return out;
  }
  for (const r of (data ?? []) as Array<{
    branch_id: string | null;
    role: string | null;
    status: string | null;
  }>) {
    if (!r.branch_id) continue;
    if (r.role === 'Machine Worker') continue;
    if (r.status && r.status !== 'active') continue;
    out.set(r.branch_id, (out.get(r.branch_id) ?? 0) + 1);
  }
  return out;
}

async function fetchTripsByDriver(driverIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (driverIds.length === 0) return out;
  const { data, error } = await supabase
    .from('trips')
    .select('driver_id, status')
    .in('driver_id', driverIds);
  if (error) {
    if (import.meta.env.DEV) console.warn('[tripsByDriver]', error.message);
    return out;
  }
  for (const r of (data ?? []) as Array<{ driver_id: string | null; status: string | null }>) {
    if (!r.driver_id) continue;
    if (r.status !== 'Completed') continue;
    out.set(r.driver_id, (out.get(r.driver_id) ?? 0) + 1);
  }
  return out;
}

async function fetchActiveAssignmentsByDriver(
  driverIds: string[],
): Promise<Map<string, { vehicleName: string | null; plate: string | null }>> {
  const out = new Map<string, { vehicleName: string | null; plate: string | null }>();
  if (driverIds.length === 0) return out;
  const { data, error } = await supabase
    .from('driver_assignments')
    .select('driver_id, is_active, vehicles(vehicle_name, plate_number)')
    .in('driver_id', driverIds)
    .eq('is_active', true);
  if (error) {
    if (import.meta.env.DEV) console.warn('[activeAssignmentsByDriver]', error.message);
    return out;
  }
  for (const r of (data ?? []) as Array<{
    driver_id: string;
    vehicles:
      | { vehicle_name: string | null; plate_number: string | null }
      | { vehicle_name: string | null; plate_number: string | null }[]
      | null;
  }>) {
    const v = asOne(r.vehicles);
    if (!out.has(r.driver_id)) {
      out.set(r.driver_id, { vehicleName: v?.vehicle_name ?? null, plate: v?.plate_number ?? null });
    }
  }
  return out;
}
