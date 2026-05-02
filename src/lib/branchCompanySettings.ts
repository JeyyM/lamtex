import { supabase } from '@/src/lib/supabase';

export type CompanyInfoFields = {
  companyName: string;
  registrationNumber: string;
  taxId: string;
  industry: string;
  foundedYear: string;
  employeeCount: string;
  companyDescription: string;
};

export function emptyCompanyInfo(): CompanyInfoFields {
  return {
    companyName: '',
    registrationNumber: '',
    taxId: '',
    industry: '',
    foundedYear: '',
    employeeCount: '',
    companyDescription: '',
  };
}

/** Resolve Supabase branch id from Topbar branch name. */
export async function resolveBranchIdByName(branchName: string): Promise<string | null> {
  const name = branchName.trim();
  if (!name) return null;
  const { data, error } = await supabase.from('branches').select('id').eq('name', name).maybeSingle();
  if (error || !data?.id) return null;
  return data.id;
}

export async function loadCompanyInfoForBranch(branchId: string): Promise<CompanyInfoFields | null> {
  const { data, error } = await supabase
    .from('company_settings')
    .select(
      'company_name, registration_number, tax_id, industry, founded_year, employee_count, company_description',
    )
    .eq('branch_id', branchId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    companyName: data.company_name ?? '',
    registrationNumber: data.registration_number ?? '',
    taxId: data.tax_id ?? '',
    industry: data.industry ?? '',
    foundedYear: data.founded_year != null ? String(data.founded_year) : '',
    employeeCount: data.employee_count ?? '',
    companyDescription: data.company_description ?? '',
  };
}

function parseFoundedYear(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = parseInt(t, 10);
  if (!Number.isFinite(n)) return null;
  return n;
}

/** Save company profile fields for the branch (insert or update). */
export async function saveCompanyInfoForBranch(
  branchId: string,
  info: CompanyInfoFields,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const company_name = info.companyName.trim() || 'Branch';
    const payload = {
      company_name,
      registration_number: info.registrationNumber.trim() || null,
      tax_id: info.taxId.trim() || null,
      industry: info.industry.trim() || null,
      founded_year: parseFoundedYear(info.foundedYear),
      employee_count: info.employeeCount.trim() || null,
      company_description: info.companyDescription.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const existing = await supabase.from('company_settings').select('id').eq('branch_id', branchId).maybeSingle();
    if (existing.error) return { ok: false, error: existing.error.message };

    if (existing.data?.id) {
      const { error: upErr } = await supabase.from('company_settings').update(payload).eq('id', existing.data.id);
      if (upErr) return { ok: false, error: upErr.message };
      return { ok: true };
    }

    const { error: insErr } = await supabase
      .from('company_settings')
      .insert({ branch_id: branchId, ...payload });
    if (insErr) return { ok: false, error: insErr.message };
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}

/** Ensures a company_settings row exists for this branch (for HQ updates when profile row missing). */
export async function getOrCreateCompanySettingsId(
  branchId: string,
  fallbackCompanyName: string,
): Promise<{ id: string } | { error: string }> {
  const { data: ex, error: selErr } = await supabase
    .from('company_settings')
    .select('id')
    .eq('branch_id', branchId)
    .maybeSingle();
  if (selErr) return { error: selErr.message };
  if (ex?.id) return { id: ex.id };

  const name = fallbackCompanyName.trim() || 'Branch';
  const { data: ins, error: insErr } = await supabase
    .from('company_settings')
    .insert({ branch_id: branchId, company_name: name })
    .select('id')
    .single();
  if (insErr || !ins?.id) return { error: insErr?.message ?? 'Could not create company_settings row' };
  return { id: ins.id };
}
