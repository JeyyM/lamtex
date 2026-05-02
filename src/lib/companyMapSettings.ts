import { supabase } from '@/src/lib/supabase';
import { getOrCreateCompanySettingsId } from '@/src/lib/branchCompanySettings';

/** Map pin only (WGS84). Optional; use null when there is no saved pin. */
export type CompanyHqMapPin = { lat: number; lng: number };

/** Optional manual HQ address lines (province, ZIP, etc.). All fields optional in the UI; empty strings save as null. */
export interface CompanyHqAddress {
  street: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
}

export function emptyCompanyHqAddress(): CompanyHqAddress {
  return { street: '', city: '', province: '', postal_code: '', country: '' };
}

export interface CompanyHqSettingsState {
  mapPin: CompanyHqMapPin | null;
  locationLabel: string;
  address: CompanyHqAddress;
}

const LS_PREFIX = 'lamtex_company_hq_settings:';
const LEGACY_LS_MAP_KEY = 'lamtex_company_hq_map';
/** Pre–branch-scoped single key */
const LEGACY_LS_SINGLE_KEY = 'lamtex_company_hq_settings';

type MetadataShape = { hq_map?: { lat?: number; lng?: number; label?: string } | null };

function storageKey(branchId: string): string {
  return `${LS_PREFIX}${branchId}`;
}

function parseHqMapPin(raw: unknown): CompanyHqMapPin | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const lat = Number(o.lat);
  const lng = Number(o.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function trimOrDbNull(s: string): string | null {
  const t = s.trim();
  return t || null;
}

function addressToDbRow(a: CompanyHqAddress) {
  return {
    hq_street: trimOrDbNull(a.street),
    hq_city: trimOrDbNull(a.city),
    hq_province: trimOrDbNull(a.province),
    hq_postal_code: trimOrDbNull(a.postal_code),
    hq_country: trimOrDbNull(a.country),
  };
}

function rowToAddress(row: {
  hq_street?: string | null;
  hq_city?: string | null;
  hq_province?: string | null;
  hq_postal_code?: string | null;
  hq_country?: string | null;
}): CompanyHqAddress {
  return {
    street: row.hq_street ?? '',
    city: row.hq_city ?? '',
    province: row.hq_province ?? '',
    postal_code: row.hq_postal_code ?? '',
    country: row.hq_country ?? '',
  };
}

function stripHqMapFromMetadata(prev: MetadataShape | null): Record<string, unknown> {
  const o = { ...(prev ?? {}) } as Record<string, unknown>;
  delete o.hq_map;
  return o;
}

function migrateLegacyToBranch(branchId: string): CompanyHqSettingsState | null {
  try {
    const legacyMap = localStorage.getItem(LEGACY_LS_MAP_KEY);
    if (legacyMap) {
      const o = JSON.parse(legacyMap) as Record<string, unknown>;
      const mapPin = parseHqMapPin(o);
      const state: CompanyHqSettingsState = {
        mapPin,
        locationLabel: typeof o.label === 'string' ? o.label : '',
        address: emptyCompanyHqAddress(),
      };
      saveCompanyHqSettingsToStorage(branchId, state);
      localStorage.removeItem(LEGACY_LS_MAP_KEY);
      return state;
    }
    const legacySingle = localStorage.getItem(LEGACY_LS_SINGLE_KEY);
    if (legacySingle) {
      const raw = JSON.parse(legacySingle) as Record<string, unknown>;
      const mapPin = raw.mapPin && typeof raw.mapPin === 'object' ? parseHqMapPin(raw.mapPin) : null;
      const locationLabel = typeof raw.locationLabel === 'string' ? raw.locationLabel : '';
      let address = emptyCompanyHqAddress();
      if (raw.address && typeof raw.address === 'object') {
        const a = raw.address as Record<string, unknown>;
        address = {
          street: typeof a.street === 'string' ? a.street : '',
          city: typeof a.city === 'string' ? a.city : '',
          province: typeof a.province === 'string' ? a.province : '',
          postal_code: typeof a.postal_code === 'string' ? a.postal_code : '',
          country: typeof a.country === 'string' ? a.country : '',
        };
      }
      const state: CompanyHqSettingsState = { mapPin, locationLabel, address };
      saveCompanyHqSettingsToStorage(branchId, state);
      localStorage.removeItem(LEGACY_LS_SINGLE_KEY);
      return state;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function loadCompanyHqSettingsFromStorage(branchId: string | null): CompanyHqSettingsState | null {
  if (!branchId) return null;
  try {
    const s = localStorage.getItem(storageKey(branchId));
    if (!s) return migrateLegacyToBranch(branchId);
    const raw = JSON.parse(s) as Record<string, unknown>;
    const mapPin = raw.mapPin && typeof raw.mapPin === 'object' ? parseHqMapPin(raw.mapPin) : null;
    const locationLabel = typeof raw.locationLabel === 'string' ? raw.locationLabel : '';
    let address = emptyCompanyHqAddress();
    if (raw.address && typeof raw.address === 'object') {
      const a = raw.address as Record<string, unknown>;
      address = {
        street: typeof a.street === 'string' ? a.street : '',
        city: typeof a.city === 'string' ? a.city : '',
        province: typeof a.province === 'string' ? a.province : '',
        postal_code: typeof a.postal_code === 'string' ? a.postal_code : '',
        country: typeof a.country === 'string' ? a.country : '',
      };
    }
    return { mapPin, locationLabel, address };
  } catch {
    return null;
  }
}

export function saveCompanyHqSettingsToStorage(branchId: string, state: CompanyHqSettingsState): void {
  localStorage.setItem(
    storageKey(branchId),
    JSON.stringify({
      mapPin: state.mapPin,
      locationLabel: state.locationLabel,
      address: state.address,
    }),
  );
}

/** Query string for Google Maps: coords if pinned, else mailing-style parts. */
export function buildCompanyHqMapsSearchQuery(state: CompanyHqSettingsState): string | null {
  if (state.mapPin && Number.isFinite(state.mapPin.lat) && Number.isFinite(state.mapPin.lng)) {
    return `${state.mapPin.lat},${state.mapPin.lng}`;
  }
  const parts: string[] = [];
  const l = state.locationLabel.trim();
  if (l) parts.push(l);
  const a = state.address;
  for (const x of [a.street, a.city, a.province, a.postal_code, a.country]) {
    const t = x.trim();
    if (t) parts.push(t);
  }
  return parts.length ? parts.join(', ') : null;
}

/** Prefer HQ columns; fallback metadata.hq_map for coords and label. Scoped to branch_id. */
export async function hydrateCompanyHqSettingsFromSupabase(
  branchId: string,
): Promise<CompanyHqSettingsState | null> {
  try {
    const { data, error } = await supabase
      .from('company_settings')
      .select(
        'hq_latitude, hq_longitude, hq_location_label, hq_street, hq_city, hq_province, hq_postal_code, hq_country, metadata',
      )
      .eq('branch_id', branchId)
      .maybeSingle();
    if (error || !data) return null;

    const address = rowToAddress(data);

    const latCol = data.hq_latitude != null ? Number(data.hq_latitude) : NaN;
    const lngCol = data.hq_longitude != null ? Number(data.hq_longitude) : NaN;
    let mapPin: CompanyHqMapPin | null =
      Number.isFinite(latCol) && Number.isFinite(lngCol) ? { lat: latCol, lng: lngCol } : null;

    let locationLabel =
      typeof data.hq_location_label === 'string' && data.hq_location_label.trim()
        ? data.hq_location_label.trim()
        : '';

    if (!mapPin) {
      const meta = data.metadata as MetadataShape | null;
      mapPin = parseHqMapPin(meta?.hq_map);
    }
    if (!locationLabel) {
      const meta = data.metadata as MetadataShape | null;
      const m = meta?.hq_map;
      if (m && typeof m === 'object' && 'label' in m && typeof (m as { label?: unknown }).label === 'string') {
        const l = (m as { label: string }).label.trim();
        if (l) locationLabel = l;
      }
    }

    const state: CompanyHqSettingsState = { mapPin, locationLabel, address };
    saveCompanyHqSettingsToStorage(branchId, state);
    return state;
  } catch {
    return null;
  }
}

/** Saves address, location label, and map pin in one write. */
export async function saveCompanyHqLocationToSupabase(
  branchId: string,
  state: CompanyHqSettingsState,
  fallbackCompanyName: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const rowIdResult = await getOrCreateCompanySettingsId(branchId, fallbackCompanyName);
    if ('error' in rowIdResult) return { ok: false, error: rowIdResult.error };
    const rowId = rowIdResult.id;

    const { data: row, error: selErr } = await supabase
      .from('company_settings')
      .select('metadata')
      .eq('id', rowId)
      .single();
    if (selErr) return { ok: false, error: selErr.message };

    const prev = (row?.metadata as MetadataShape | null) ?? {};
    const labelTrim = state.locationLabel.trim();
    const metaPin = state.mapPin;
    const metadata: Record<string, unknown> = metaPin
      ? {
          ...prev,
          hq_map: { lat: metaPin.lat, lng: metaPin.lng },
        }
      : { ...stripHqMapFromMetadata(prev) };

    const addrRow = addressToDbRow(state.address);

    const { error: upErr } = await supabase
      .from('company_settings')
      .update({
        hq_location_label: labelTrim || null,
        ...addrRow,
        hq_latitude: metaPin?.lat ?? null,
        hq_longitude: metaPin?.lng ?? null,
        metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rowId);
    if (upErr) return { ok: false, error: upErr.message };
    return { ok: true };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
  }
}
