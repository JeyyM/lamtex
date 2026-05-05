/**
 * Upserts for employee profile tables (HR detail page edits).
 */
import { supabase } from '@/src/lib/supabase';

function ts() {
  return new Date().toISOString();
}

export function tenureMonthsFromJoinDate(isoDate: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate.trim());
  if (!m) return 0;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  const start = new Date(y, mo, day);
  const now = new Date();
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  return Math.max(0, months);
}

type EmployeeDirectoryRole =
  | 'Sales Agent'
  | 'Logistics Manager'
  | 'Warehouse Manager'
  | 'Truck Driver';

type UserRoleDashboard = 'Executive' | 'Warehouse' | 'Logistics' | 'Agent' | 'Driver';

/** Inserts a new row in `employees` (directory / HR). */
export async function insertEmployeeDirectoryRow(values: {
  employee_id: string;
  employee_name: string;
  email: string;
  role: EmployeeDirectoryRole;
  branch_id: string | null;
  join_date: string;
  phone?: string | null;
  department?: string | null;
  user_role?: UserRoleDashboard | null;
}): Promise<{ id: string }> {
  const code = values.employee_id.trim();
  const name = values.employee_name.trim();
  const em = values.email.trim().toLowerCase();
  const jd = values.join_date.trim();
  if (!code) throw new Error('Employee ID is required.');
  if (!name) throw new Error('Name is required.');
  if (!em) throw new Error('Email is required.');
  if (!jd) throw new Error('Join date is required.');

  const { data, error } = await supabase
    .from('employees')
    .insert({
      employee_id: code,
      employee_name: name,
      email: em,
      role: values.role,
      branch_id: values.branch_id,
      join_date: jd,
      status: 'active',
      tenure_months: tenureMonthsFromJoinDate(jd),
      phone: values.phone?.trim() || null,
      department: values.department?.trim() || null,
      user_role: values.user_role ?? null,
      updated_at: ts(),
    })
    .select('id')
    .single();

  if (error) throw error;
  return { id: String(data.id) };
}

/** Updates directory row: employee code, hire date, and derived tenure. */
export async function updateEmployeeDirectoryCore(
  employeeUuid: string,
  values: { employee_id: string; join_date: string },
): Promise<void> {
  const code = values.employee_id.trim();
  const jd = values.join_date.trim();
  if (!code) throw new Error('Employee ID is required.');
  if (!jd) throw new Error('Date hired is required.');

  const { error } = await supabase
    .from('employees')
    .update({
      employee_id: code,
      join_date: jd,
      tenure_months: tenureMonthsFromJoinDate(jd),
      updated_at: ts(),
    })
    .eq('id', employeeUuid);
  if (error) throw error;
}

export async function upsertEmployeePersonalInfo(
  employeeId: string,
  values: {
    date_of_birth: string | null;
    gender: string | null;
    nationality: string | null;
    civil_status: string | null;
    religion: string | null;
    blood_type: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from('employee_personal_info').upsert(
    {
      employee_id: employeeId,
      date_of_birth: values.date_of_birth?.trim() || null,
      gender: (values.gender?.trim() || null) as 'Male' | 'Female' | 'Other' | null,
      nationality: values.nationality?.trim() || null,
      civil_status: (values.civil_status?.trim() || null) as
        | 'Single'
        | 'Married'
        | 'Widowed'
        | 'Separated'
        | null,
      religion: values.religion?.trim() || null,
      blood_type: values.blood_type?.trim() || null,
      updated_at: ts(),
    },
    { onConflict: 'employee_id' },
  );
  if (error) throw error;
}

export async function upsertEmployeeContactInfo(
  employeeId: string,
  values: {
    primary_phone: string | null;
    secondary_phone: string | null;
    personal_email: string | null;
    work_email: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    emergency_contact_relationship: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from('employee_contact_info').upsert(
    {
      employee_id: employeeId,
      primary_phone: values.primary_phone?.trim() || null,
      secondary_phone: values.secondary_phone?.trim() || null,
      personal_email: values.personal_email?.trim() || null,
      work_email: values.work_email?.trim() || null,
      emergency_contact_name: values.emergency_contact_name?.trim() || null,
      emergency_contact_phone: values.emergency_contact_phone?.trim() || null,
      emergency_contact_relationship: values.emergency_contact_relationship?.trim() || null,
      updated_at: ts(),
    },
    { onConflict: 'employee_id' },
  );
  if (error) throw error;

  const { error: empErr } = await supabase
    .from('employees')
    .update({
      phone: values.primary_phone?.trim() || null,
      email: values.work_email?.trim() || null,
      updated_at: ts(),
    })
    .eq('id', employeeId);
  if (empErr) throw empErr;
}

export async function upsertPrimaryEmployeeAddress(
  employeeId: string,
  addressId: string | null,
  values: {
    address_label: string | null;
    street: string | null;
    barangay: string | null;
    city: string | null;
    province: string | null;
    postal_code: string | null;
    is_current: boolean;
  },
): Promise<void> {
  const payload = {
    employee_id: employeeId,
    address_label: values.address_label?.trim() || 'Permanent',
    street: values.street?.trim() || null,
    barangay: values.barangay?.trim() || null,
    city: values.city?.trim() || null,
    province: values.province?.trim() || null,
    postal_code: values.postal_code?.trim() || null,
    is_current: values.is_current,
    updated_at: ts(),
  };

  if (addressId) {
    const { error } = await supabase.from('employee_addresses').update(payload).eq('id', addressId);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('employee_addresses').insert(payload);
    if (error) throw error;
  }
}

export async function upsertEmployeeEmploymentInfo(
  employeeId: string,
  values: {
    employment_status: string | null;
    position: string | null;
    department: string | null;
    reporting_to: string | null;
    branch_manager_name: string | null;
    work_schedule_days: string[] | null;
    work_start_time: string | null;
    work_end_time: string | null;
    shift: string | null;
  },
): Promise<void> {
  const status = (values.employment_status?.trim() || 'Full-time') as
    | 'Full-time'
    | 'Part-time'
    | 'Contract'
    | 'Probationary';

  const { error } = await supabase.from('employee_employment_info').upsert(
    {
      employee_id: employeeId,
      employment_status: status,
      position: values.position?.trim() || null,
      department: values.department?.trim() || null,
      reporting_to: values.reporting_to?.trim() || null,
      branch_manager_name: values.branch_manager_name?.trim() || null,
      work_schedule_days: values.work_schedule_days?.length ? values.work_schedule_days : null,
      work_start_time: values.work_start_time?.trim() || null,
      work_end_time: values.work_end_time?.trim() || null,
      shift: values.shift?.trim() || null,
      updated_at: ts(),
    },
    { onConflict: 'employee_id' },
  );
  if (error) throw error;

  const { error: empErr } = await supabase
    .from('employees')
    .update({
      department: values.department?.trim() || null,
      updated_at: ts(),
    })
    .eq('id', employeeId);
  if (empErr) throw empErr;
}

export async function upsertEmployeeGovernmentIds(
  employeeId: string,
  values: {
    tin: string | null;
    sss: string | null;
    phil_health: string | null;
    pag_ibig: string | null;
    gov_id_type: string | null;
    gov_id_number: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from('employee_government_ids').upsert(
    {
      employee_id: employeeId,
      tin: values.tin?.trim() || null,
      sss: values.sss?.trim() || null,
      phil_health: values.phil_health?.trim() || null,
      pag_ibig: values.pag_ibig?.trim() || null,
      gov_id_type: values.gov_id_type?.trim() || null,
      gov_id_number: values.gov_id_number?.trim() || null,
      updated_at: ts(),
    },
    { onConflict: 'employee_id' },
  );
  if (error) throw error;
}

export async function upsertEmployeeCompensation(
  employeeId: string,
  role: string | null,
  values: {
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
  },
): Promise<void> {
  const isSales = role === 'Sales Agent';
  const tier = isSales
    ? null
    : (values.commission_tier?.trim() || null) as 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | null;
  const commissionRate = isSales ? 0 : (values.commission_rate ?? 0);

  const { error } = await supabase.from('employee_compensation').upsert(
    {
      employee_id: employeeId,
      base_salary: values.base_salary ?? 0,
      commission_rate: commissionRate,
      commission_tier: tier,
      bonus_eligibility: values.bonus_eligibility ?? false,
      monthly_quota: values.monthly_quota ?? 0,
      quarterly_quota: values.quarterly_quota ?? 0,
      yearly_quota: values.yearly_quota ?? 0,
      allowance_transport: values.allowance_transport ?? 0,
      allowance_meal: values.allowance_meal ?? 0,
      allowance_communication: values.allowance_communication ?? 0,
      allowance_other: values.allowance_other ?? 0,
      total_monthly_compensation: values.total_monthly_compensation ?? 0,
      updated_at: ts(),
    },
    { onConflict: 'employee_id' },
  );
  if (error) throw error;
}

export async function upsertEmployeeBankDetails(
  employeeId: string,
  values: {
    bank_name: string | null;
    account_number: string | null;
    account_name: string | null;
    account_type: string | null;
    payment_frequency: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from('employee_bank_details').upsert(
    {
      employee_id: employeeId,
      bank_name: values.bank_name?.trim() || null,
      account_number: values.account_number?.trim() || null,
      account_name: values.account_name?.trim() || null,
      account_type: (values.account_type?.trim() || null) as 'Savings' | 'Current' | null,
      payment_frequency: (values.payment_frequency?.trim() || null) as
        | 'Weekly'
        | 'Bi-weekly'
        | 'Monthly'
        | null,
      updated_at: ts(),
    },
    { onConflict: 'employee_id' },
  );
  if (error) throw error;
}

export async function updateEmployeeSkillRow(
  skillId: string,
  employeeId: string,
  values: {
    skill_name: string;
    skill_level: string;
    skill_description: string | null;
    date_started: string | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from('employee_skills')
    .update({
      skill_name: values.skill_name.trim(),
      skill_level: values.skill_level as 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert',
      skill_description: values.skill_description?.trim() || null,
      date_started: values.date_started?.trim() || null,
      updated_at: ts(),
    })
    .eq('id', skillId)
    .eq('employee_id', employeeId);
  if (error) throw error;
}

export async function updateEmployeeCertificationRow(
  certId: string,
  employeeId: string,
  values: {
    certification_name: string;
    issuing_organization: string | null;
    issue_date: string | null;
    expiry_date: string | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from('employee_certifications')
    .update({
      certification_name: values.certification_name.trim(),
      issuing_organization: values.issuing_organization?.trim() || null,
      issue_date: values.issue_date?.trim() || null,
      expiry_date: values.expiry_date?.trim() || null,
      updated_at: ts(),
    })
    .eq('id', certId)
    .eq('employee_id', employeeId);
  if (error) throw error;
}

export async function updateEmployeeTrainingRow(
  trainingId: string,
  employeeId: string,
  values: {
    training_name: string;
    duration: string | null;
    completion_date: string | null;
    instructor: string | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from('employee_trainings')
    .update({
      training_name: values.training_name.trim(),
      duration: values.duration?.trim() || null,
      completion_date: values.completion_date?.trim() || null,
      instructor: values.instructor?.trim() || null,
      updated_at: ts(),
    })
    .eq('id', trainingId)
    .eq('employee_id', employeeId);
  if (error) throw error;
}

/** Executive-only RPC: creates Auth user + sets employees.auth_user_id. Requires DB function. */
export async function createEmployeeAuthAccount(
  employeeId: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await supabase.rpc('create_employee_auth_account', {
    p_employee_id: employeeId,
    p_password: password,
  });
  if (error) {
    return { ok: false, error: error.message };
  }
  let payload: unknown = data;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload) as unknown;
    } catch {
      return { ok: false, error: 'invalid_response' };
    }
  }
  if (payload && typeof payload === 'object' && payload !== null && 'ok' in payload) {
    const d = payload as { ok?: boolean; error?: string };
    if (d.ok === true) return { ok: true };
    return { ok: false, error: d.error ?? 'unknown' };
  }
  return { ok: false, error: 'invalid_response' };
}
