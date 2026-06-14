import { supabase } from '@/src/lib/supabase';
import type { UserRole } from '@/src/types';
import {
  mergeNotificationPrefs,
  serializeNotificationPrefs,
  type NotificationChannel,
  type NotificationChannelPrefs,
  type NotificationPrefKey,
} from './notificationCatalog';

export type NotificationPreferencesMap = Record<string, NotificationChannelPrefs>;

const prefCache = new Map<string, NotificationPreferencesMap>();

export function clearNotificationPreferencesCache(employeeId?: string): void {
  if (employeeId) prefCache.delete(employeeId.trim());
  else prefCache.clear();
}

export async function fetchEmployeeNotificationPreferences(
  employeeId: string,
  roles: UserRole[],
): Promise<NotificationPreferencesMap> {
  const id = employeeId.trim();
  if (!id) return mergeNotificationPrefs(roles, null);

  const { data, error } = await supabase
    .from('employee_notification_preferences')
    .select('preferences')
    .eq('employee_id', id)
    .maybeSingle();

  if (error) {
    console.warn('[notificationPreferences] fetch failed', error);
    return mergeNotificationPrefs(roles, null);
  }

  const raw = (data as { preferences?: Record<string, Partial<NotificationChannelPrefs>> } | null)
    ?.preferences;
  const merged = mergeNotificationPrefs(roles, raw ?? null);
  prefCache.set(id, merged);
  return merged;
}

export async function saveEmployeeNotificationPreferences(
  employeeId: string,
  preferences: NotificationPreferencesMap,
): Promise<void> {
  const id = employeeId.trim();
  if (!id) throw new Error('Employee id is required.');

  const payload = serializeNotificationPrefs(preferences);
  const { error } = await supabase.from('employee_notification_preferences').upsert(
    {
      employee_id: id,
      preferences: payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'employee_id' },
  );

  if (error) throw new Error(error.message);
  prefCache.set(id, payload);
}

async function fetchRawEmployeeNotificationPreferences(
  employeeId: string,
): Promise<Record<string, Partial<NotificationChannelPrefs>>> {
  const id = employeeId.trim();
  if (!id) return {};

  const { data, error } = await supabase
    .from('employee_notification_preferences')
    .select('preferences')
    .eq('employee_id', id)
    .maybeSingle();

  if (error) {
    console.warn('[notificationPreferences] raw fetch failed', error);
    return {};
  }

  return (
    (data as { preferences?: Record<string, Partial<NotificationChannelPrefs>> } | null)
      ?.preferences ?? {}
  );
}

function channelEnabledFromRaw(
  raw: Record<string, Partial<NotificationChannelPrefs>>,
  prefKey: NotificationPrefKey,
  channel: NotificationChannel,
): boolean {
  const row = raw[prefKey];
  if (!row) return true;
  if (typeof row[channel] === 'boolean') return row[channel];
  return true;
}

async function resolveEmployeeIdsByEmails(emails: string[]): Promise<Map<string, string>> {
  const normalized = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (!normalized.length) return new Map();

  const out = new Map<string, string>();

  const { data: byEmpEmail } = await supabase
    .from('employees')
    .select('id, email')
    .in('email', normalized);
  for (const row of byEmpEmail ?? []) {
    const r = row as { id?: string; email?: string | null };
    const email = r.email?.trim().toLowerCase();
    if (email && r.id) out.set(email, String(r.id));
  }

  const missing = normalized.filter((e) => !out.has(e));
  for (const email of missing) {
    const { data: byWork } = await supabase
      .from('employee_contact_info')
      .select('employee_id')
      .eq('work_email', email)
      .maybeSingle();
    if (byWork?.employee_id) {
      out.set(email, String(byWork.employee_id));
      continue;
    }
    const { data: byPersonal } = await supabase
      .from('employee_contact_info')
      .select('employee_id')
      .eq('personal_email', email)
      .maybeSingle();
    if (byPersonal?.employee_id) out.set(email, String(byPersonal.employee_id));
  }

  return out;
}

/** Filter staff recipient emails by saved notification preferences. Customer emails are never filtered here. */
export async function filterStaffEmailsByNotificationPref(
  prefKey: NotificationPrefKey,
  emails: (string | null | undefined)[],
): Promise<string[]> {
  const list = emails.map((e) => e?.trim()).filter((e): e is string => Boolean(e));
  if (!list.length) return [];

  const emailToEmployee = await resolveEmployeeIdsByEmails(list);
  const employeeIds = [...new Set(emailToEmployee.values())];

  const rawByEmployee = new Map<string, Record<string, Partial<NotificationChannelPrefs>>>();
  await Promise.all(
    employeeIds.map(async (empId) => {
      rawByEmployee.set(empId, await fetchRawEmployeeNotificationPreferences(empId));
    }),
  );

  return list.filter((email) => {
    const empId = emailToEmployee.get(email.toLowerCase());
    if (!empId) return true;
    const raw = rawByEmployee.get(empId) ?? {};
    return channelEnabledFromRaw(raw, prefKey, 'email');
  });
}

export async function isStaffEmailEnabledForNotification(
  email: string | null | undefined,
  prefKey: NotificationPrefKey,
): Promise<boolean> {
  const trimmed = email?.trim();
  if (!trimmed) return false;
  const filtered = await filterStaffEmailsByNotificationPref(prefKey, [trimmed]);
  return filtered.length > 0;
}

export function toggleNotificationPrefChannel(
  prefs: NotificationPreferencesMap,
  key: string,
  channel: NotificationChannel,
): NotificationPreferencesMap {
  const current = prefs[key] ?? { in_app: true, email: true };
  return {
    ...prefs,
    [key]: { ...current, [channel]: !current[channel] },
  };
}

export function setNotificationPrefChannel(
  prefs: NotificationPreferencesMap,
  key: string,
  channel: NotificationChannel,
  enabled: boolean,
): NotificationPreferencesMap {
  const current = prefs[key] ?? { in_app: true, email: true };
  return {
    ...prefs,
    [key]: { ...current, [channel]: enabled },
  };
}
