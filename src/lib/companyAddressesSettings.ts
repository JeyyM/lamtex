import { supabase } from '@/src/lib/supabase';
import { getOrCreateCompanySettingsId, resolveBranchIdByName } from '@/src/lib/branchCompanySettings';

export type CompanyAddressType = 'Main Office' | 'Warehouse' | 'Factory' | 'Branch';

export type CompanyAddressRecord = {
  id: string;
  settings_id: string;
  address_type: string;
  label: string | null;
  street: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  country: string | null;
  is_primary: boolean;
  latitude: number | null;
  longitude: number | null;
};

export type CompanyAddressInput = {
  label: string;
  address_type: CompanyAddressType;
  street: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  is_primary: boolean;
  latitude: number | null;
  longitude: number | null;
};

function trimOrNull(s: string): string | null {
  const t = s.trim();
  return t || null;
}

export async function fetchActiveBranchesForSettings(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase
    .from('branches')
    .select('id, name')
    .eq('is_active', true)
    .order('name');
  if (error || !data) return [];
  return data.map((r) => ({ id: r.id as string, name: String(r.name ?? '') }));
}

export async function fetchAddressesForSettings(settingsId: string): Promise<CompanyAddressRecord[]> {
  const { data, error } = await supabase
    .from('company_addresses')
    .select(
      'id, settings_id, address_type, label, street, city, province, postal_code, country, is_primary, latitude, longitude, created_at',
    )
    .eq('settings_id', settingsId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data.map(rowToRecord);
}

function rowToRecord(r: Record<string, unknown>): CompanyAddressRecord {
  return {
    id: String(r.id),
    settings_id: String(r.settings_id),
    address_type: String(r.address_type ?? 'Main Office'),
    label: r.label != null ? String(r.label) : null,
    street: r.street != null ? String(r.street) : null,
    city: r.city != null ? String(r.city) : null,
    province: r.province != null ? String(r.province) : null,
    postal_code: r.postal_code != null ? String(r.postal_code) : null,
    country: r.country != null ? String(r.country) : null,
    is_primary: Boolean(r.is_primary),
    latitude: r.latitude != null && r.latitude !== '' ? Number(r.latitude) : null,
    longitude: r.longitude != null && r.longitude !== '' ? Number(r.longitude) : null,
  };
}

/** One-time: if branch has legacy HQ on company_settings but no rows, create a primary address. */
export async function seedAddressesFromLegacyHqIfEmpty(branchId: string): Promise<void> {
  const { data: cs, error: csErr } = await supabase
    .from('company_settings')
    .select(
      'id, hq_street, hq_city, hq_province, hq_postal_code, hq_country, hq_location_label, hq_latitude, hq_longitude',
    )
    .eq('branch_id', branchId)
    .maybeSingle();
  if (csErr || !cs?.id) return;

  const { count, error: cErr } = await supabase
    .from('company_addresses')
    .select('id', { count: 'exact', head: true })
    .eq('settings_id', cs.id);
  if (cErr || (count ?? 0) > 0) return;

  const hasAny =
    [cs.hq_street, cs.hq_city, cs.hq_province, cs.hq_postal_code, cs.hq_country, cs.hq_location_label].some(
      (x) => x != null && String(x).trim() !== '',
    ) ||
    (cs.hq_latitude != null && Number.isFinite(Number(cs.hq_latitude))) ||
    (cs.hq_longitude != null && Number.isFinite(Number(cs.hq_longitude)));
  if (!hasAny) return;

  await supabase.from('company_addresses').insert({
    settings_id: cs.id,
    label: trimOrNull(cs.hq_location_label ?? '') ?? 'Main office',
    address_type: 'Main Office' as CompanyAddressType,
    is_primary: true,
    street: trimOrNull(String(cs.hq_street ?? '')),
    city: trimOrNull(String(cs.hq_city ?? '')),
    province: trimOrNull(String(cs.hq_province ?? '')),
    postal_code: trimOrNull(String(cs.hq_postal_code ?? '')),
    country: trimOrNull(String(cs.hq_country ?? '')) ?? 'Philippines',
    latitude:
      cs.hq_latitude != null && Number.isFinite(Number(cs.hq_latitude)) ? Number(cs.hq_latitude) : null,
    longitude:
      cs.hq_longitude != null && Number.isFinite(Number(cs.hq_longitude)) ? Number(cs.hq_longitude) : null,
  });
}

async function clearOtherPrimary(settingsId: string, exceptId?: string): Promise<void> {
  let q = supabase.from('company_addresses').update({ is_primary: false }).eq('settings_id', settingsId);
  if (exceptId) q = q.neq('id', exceptId);
  await q;
}

/** Copy primary (or best) location to company_settings HQ columns for logistics / legacy readers. */
export async function syncCompanySettingsHqFromAddresses(branchId: string): Promise<void> {
  const { data: cs, error } = await supabase
    .from('company_settings')
    .select('id')
    .eq('branch_id', branchId)
    .maybeSingle();
  if (error || !cs?.id) return;

  const rows = await fetchAddressesForSettings(cs.id);
  const withCoord = rows.filter(
    (r) => r.latitude != null && r.longitude != null && Number.isFinite(r.latitude + r.longitude),
  );
  const primary = rows.find((r) => r.is_primary);
  const primaryCoord = withCoord.find((r) => r.is_primary);
  const pick = primaryCoord ?? withCoord[0] ?? primary ?? rows[0];

  if (!pick) {
    await supabase
      .from('company_settings')
      .update({
        hq_location_label: null,
        hq_street: null,
        hq_city: null,
        hq_province: null,
        hq_postal_code: null,
        hq_country: null,
        hq_latitude: null,
        hq_longitude: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cs.id);
    return;
  }

  const lat = pick.latitude;
  const lng = pick.longitude;

  await supabase
    .from('company_settings')
    .update({
      hq_location_label: trimOrNull(pick.label ?? '') ?? null,
      hq_street: trimOrNull(pick.street ?? '') ?? null,
      hq_city: trimOrNull(pick.city ?? '') ?? null,
      hq_province: trimOrNull(pick.province ?? '') ?? null,
      hq_postal_code: trimOrNull(pick.postal_code ?? '') ?? null,
      hq_country: trimOrNull(pick.country ?? '') ?? null,
      hq_latitude: lat != null && Number.isFinite(lat) ? lat : null,
      hq_longitude: lng != null && Number.isFinite(lng) ? lng : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cs.id);
}

export async function createCompanyAddress(
  settingsId: string,
  branchId: string,
  input: CompanyAddressInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (input.is_primary) await clearOtherPrimary(settingsId);
  const lat = input.latitude;
  const lng = input.longitude;
  const { data, error } = await supabase
    .from('company_addresses')
    .insert({
      settings_id: settingsId,
      label: trimOrNull(input.label) ?? 'Location',
      address_type: input.address_type,
      street: trimOrNull(input.street),
      city: trimOrNull(input.city),
      province: trimOrNull(input.province),
      postal_code: trimOrNull(input.postal_code),
      country: trimOrNull(input.country) ?? 'Philippines',
      is_primary: input.is_primary,
      latitude: lat != null && Number.isFinite(lat) ? lat : null,
      longitude: lng != null && Number.isFinite(lng) ? lng : null,
    })
    .select('id')
    .single();
  if (error || !data?.id) return { ok: false, error: error?.message ?? 'Insert failed' };
  await syncCompanySettingsHqFromAddresses(branchId);
  return { ok: true, id: String(data.id) };
}

export async function updateCompanyAddress(
  id: string,
  settingsId: string,
  branchId: string,
  input: CompanyAddressInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.is_primary) await clearOtherPrimary(settingsId, id);
  const lat = input.latitude;
  const lng = input.longitude;
  const { error } = await supabase
    .from('company_addresses')
    .update({
      label: trimOrNull(input.label) ?? 'Location',
      address_type: input.address_type,
      street: trimOrNull(input.street),
      city: trimOrNull(input.city),
      province: trimOrNull(input.province),
      postal_code: trimOrNull(input.postal_code),
      country: trimOrNull(input.country) ?? 'Philippines',
      is_primary: input.is_primary,
      latitude: lat != null && Number.isFinite(lat) ? lat : null,
      longitude: lng != null && Number.isFinite(lng) ? lng : null,
    })
    .eq('id', id)
    .eq('settings_id', settingsId);
  if (error) return { ok: false, error: error.message };
  await syncCompanySettingsHqFromAddresses(branchId);
  return { ok: true };
}

export async function deleteCompanyAddress(
  id: string,
  settingsId: string,
  branchId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabase.from('company_addresses').delete().eq('id', id).eq('settings_id', settingsId);
  if (error) return { ok: false, error: error.message };
  await syncCompanySettingsHqFromAddresses(branchId);
  return { ok: true };
}

/** Depot / store pin: primary address coords, else any coords, else legacy company_settings HQ. */
export async function fetchBranchDepotPinByBranchId(branchId: string): Promise<{ lat: number; lng: number } | null> {
  const { data: cs } = await supabase
    .from('company_settings')
    .select('id, hq_latitude, hq_longitude')
    .eq('branch_id', branchId)
    .maybeSingle();

  const hqFallback = (): { lat: number; lng: number } | null => {
    const la = cs?.hq_latitude != null ? Number(cs.hq_latitude) : NaN;
    const ln = cs?.hq_longitude != null ? Number(cs.hq_longitude) : NaN;
    if (Number.isFinite(la) && Number.isFinite(ln)) return { lat: la, lng: ln };
    return null;
  };

  if (!cs?.id) return hqFallback();

  const { data: rows } = await supabase
    .from('company_addresses')
    .select('latitude, longitude, is_primary')
    .eq('settings_id', cs.id);

  const withCoord = (rows ?? []).filter((r) => {
    const la = r.latitude != null ? Number(r.latitude) : NaN;
    const ln = r.longitude != null ? Number(r.longitude) : NaN;
    return Number.isFinite(la) && Number.isFinite(ln);
  });
  const primary = withCoord.find((r) => r.is_primary);
  const pick = primary ?? withCoord[0];
  if (pick) {
    return { lat: Number(pick.latitude), lng: Number(pick.longitude) };
  }
  return hqFallback();
}

export async function fetchBranchDepotPinByBranchName(
  branchName: string,
): Promise<{ lat: number; lng: number } | null> {
  const bid = await resolveBranchIdByName(branchName.trim());
  if (!bid) return null;
  return fetchBranchDepotPinByBranchId(bid);
}

export function buildAddressMapsQuery(input: {
  label: string;
  street: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
}): string | null {
  if (input.latitude != null && input.longitude != null && Number.isFinite(input.latitude + input.longitude)) {
    return `${input.latitude},${input.longitude}`;
  }
  const parts: string[] = [];
  const l = input.label.trim();
  if (l) parts.push(l);
  for (const x of [input.street, input.city, input.province, input.postal_code, input.country]) {
    const t = x.trim();
    if (t) parts.push(t);
  }
  return parts.length ? parts.join(', ') : null;
}
