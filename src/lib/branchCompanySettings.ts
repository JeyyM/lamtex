import { supabase } from '@/src/lib/supabase';

export type CompanyInfoFields = {
  companyName: string;
  registrationNumber: string;
  taxId: string;
  industry: string;
  /** ISO `YYYY-MM-DD` for `<input type="date">` */
  dateEstablished: string;
  employeeCount: string;
  companyDescription: string;
};

export function emptyCompanyInfo(): CompanyInfoFields {
  return {
    companyName: '',
    registrationNumber: '',
    taxId: '',
    industry: '',
    dateEstablished: '',
    employeeCount: '',
    companyDescription: '',
  };
}

/** Resolve Supabase branch id from Topbar branch name (exact or first segment before " -"). */
let branchRowsCache: { loadedAt: number; rows: { id: string; name: string | null }[] } | null = null;
const BRANCH_ROWS_CACHE_MS = 60_000;

async function loadActiveBranchRows(): Promise<{ id: string; name: string | null }[]> {
  const now = Date.now();
  if (branchRowsCache && now - branchRowsCache.loadedAt < BRANCH_ROWS_CACHE_MS) {
    return branchRowsCache.rows;
  }
  const { data: rows, error } = await supabase.from('branches').select('id, name').eq('is_active', true);
  if (error || !rows?.length) return [];
  branchRowsCache = { loadedAt: now, rows };
  return rows;
}

export async function resolveBranchIdByName(branchName: string): Promise<string | null> {
  const raw = branchName.trim();
  if (!raw) return null;

  const rows = await loadActiveBranchRows();
  if (!rows.length) return null;

  const lower = raw.toLowerCase();

  const exact = rows.find((r) => (r.name ?? '').trim().toLowerCase() === lower);
  if (exact?.id) return exact.id;

  const firstSegment = (s: string) => s.split(/\s*-\s*/)[0]?.trim().toLowerCase() ?? '';
  const byFirst = rows.find((r) => firstSegment(r.name ?? '') === lower);
  if (byFirst?.id) return byFirst.id;

  return null;
}

export async function loadCompanyInfoForBranch(branchId: string): Promise<CompanyInfoFields> {
  const { data, error } = await supabase
    .from('company_settings')
    .select(
      'company_name, registration_number, tax_id, industry, founded_year, date_established, employee_count, company_description',
    )
    .eq('branch_id', branchId)
    .maybeSingle();
  if (error) return emptyCompanyInfo();
  if (!data) return emptyCompanyInfo();
  return {
    companyName: data.company_name ?? '',
    registrationNumber: data.registration_number ?? '',
    taxId: data.tax_id ?? '',
    industry: data.industry ?? '',
    dateEstablished: (() => {
      const rawDe = data.date_established;
      if (rawDe != null && String(rawDe).trim() !== '') {
        return String(rawDe).slice(0, 10);
      }
      if (data.founded_year != null && Number.isFinite(Number(data.founded_year))) {
        return `${data.founded_year}-01-01`;
      }
      return '';
    })(),
    employeeCount: data.employee_count ?? '',
    companyDescription: data.company_description ?? '',
  };
}

function yearFromIsoDate(iso: string): number | null {
  const t = iso.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const y = parseInt(t.slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

/** Save company profile fields for the branch (insert or update). */
export async function saveCompanyInfoForBranch(
  branchId: string,
  info: CompanyInfoFields,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const company_name = info.companyName.trim() || 'Branch';
    const dateEstablished = info.dateEstablished.trim();
    const foundedYear = dateEstablished ? yearFromIsoDate(dateEstablished) : null;
    const payload = {
      company_name,
      registration_number: info.registrationNumber.trim() || null,
      tax_id: info.taxId.trim() || null,
      industry: info.industry.trim() || null,
      date_established: dateEstablished || null,
      founded_year: foundedYear,
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
