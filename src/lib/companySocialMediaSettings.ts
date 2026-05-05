import { supabase } from '@/src/lib/supabase';

export type CompanySocialRecord = {
  id: string;
  settings_id: string;
  platform: string;
  url: string;
  is_active: boolean;
};

export type CompanySocialInput = {
  platform: string;
  url: string;
  is_active: boolean;
};

function rowToRecord(r: Record<string, unknown>): CompanySocialRecord {
  return {
    id: String(r.id),
    settings_id: String(r.settings_id),
    platform: String(r.platform ?? ''),
    url: String(r.url ?? ''),
    is_active: r.is_active !== false,
  };
}

export async function fetchSocialForSettings(settingsId: string): Promise<CompanySocialRecord[]> {
  const { data, error } = await supabase
    .from('company_social_media')
    .select('id, settings_id, platform, url, is_active, created_at')
    .eq('settings_id', settingsId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data.map((r) => rowToRecord(r as Record<string, unknown>));
}

function normalizeUrl(url: string): string {
  const t = url.trim();
  if (!t) return '';
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

export async function createCompanySocialMedia(
  settingsId: string,
  input: CompanySocialInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const url = normalizeUrl(input.url);
  if (!url) return { ok: false, error: 'URL is required.' };
  const platform = input.platform.trim();
  if (!platform) return { ok: false, error: 'Platform is required.' };

  const { data, error } = await supabase
    .from('company_social_media')
    .insert({
      settings_id: settingsId,
      platform,
      url,
      is_active: input.is_active,
    })
    .select('id')
    .single();
  if (error || !data?.id) return { ok: false, error: error?.message ?? 'Insert failed.' };
  return { ok: true, id: String(data.id) };
}

export async function updateCompanySocialMedia(
  id: string,
  settingsId: string,
  input: CompanySocialInput,
): Promise<{ ok: boolean; error?: string }> {
  const url = normalizeUrl(input.url);
  if (!url) return { ok: false, error: 'URL is required.' };
  const platform = input.platform.trim();
  if (!platform) return { ok: false, error: 'Platform is required.' };

  const { error } = await supabase
    .from('company_social_media')
    .update({
      platform,
      url,
      is_active: input.is_active,
    })
    .eq('id', id)
    .eq('settings_id', settingsId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteCompanySocialMedia(
  id: string,
  settingsId: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from('company_social_media').delete().eq('id', id).eq('settings_id', settingsId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
