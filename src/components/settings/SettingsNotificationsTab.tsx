import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Loader2, Mail, RotateCcw, Save, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { useAppContext } from '@/src/store/AppContext';
import type { UserRole } from '@/src/types';
import {
  catalogItemsForRoles,
  defaultNotificationPrefsForRoles,
  groupCatalogItems,
  mergeNotificationPrefs,
  notificationPrefsEqual,
  type NotificationCatalogItem,
  type NotificationChannel,
} from '@/src/lib/notifications/notificationCatalog';
import {
  fetchEmployeeNotificationPreferences,
  saveEmployeeNotificationPreferences,
  setNotificationPrefChannel,
  type NotificationPreferencesMap,
} from '@/src/lib/notifications/notificationPreferences';

function Toggle({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <label className="relative inline-flex items-center cursor-pointer shrink-0" title={label}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
        aria-label={label}
      />
      <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-600 peer-disabled:opacity-50" />
    </label>
  );
}

function GroupSectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-200 pb-2">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <div className="hidden sm:flex items-center gap-6 shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-500">
        <div className="flex items-center gap-2 w-[88px] justify-end">
          <Bell className="w-3.5 h-3.5" aria-hidden />
          In-app
        </div>
        <div className="flex items-center gap-2 w-[88px] justify-end">
          <Mail className="w-3.5 h-3.5" aria-hidden />
          Email
        </div>
      </div>
    </div>
  );
}

function NotificationRow({
  entry,
  prefs,
  disabled,
  onChange,
}: {
  entry: NotificationCatalogItem;
  prefs: NotificationPreferencesMap;
  disabled: boolean;
  onChange: (key: string, channel: NotificationChannel, enabled: boolean) => void;
}) {
  const row = prefs[entry.key] ?? { in_app: true, email: true };

  return (
    <div className="flex flex-col gap-3 p-4 bg-gray-50 rounded-lg sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900">{entry.label}</p>
        <p className="text-sm text-gray-500 mt-1">{entry.description}</p>
      </div>
      <div className="flex items-center gap-6 shrink-0 sm:w-[192px] sm:justify-end">
        {entry.supports.in_app ? (
          <div className="flex items-center gap-2 sm:w-[88px] sm:justify-end">
            <Bell className="w-4 h-4 text-gray-500 sm:hidden" aria-hidden />
            <span className="text-xs font-medium text-gray-600 w-12 sm:sr-only">In-app</span>
            <Toggle
              checked={row.in_app}
              disabled={disabled}
              label={`${entry.label} in-app`}
              onChange={(next) => onChange(entry.key, 'in_app', next)}
            />
          </div>
        ) : (
          <div className="hidden sm:block sm:w-[88px]" aria-hidden />
        )}
        {entry.supports.email ? (
          <div className="flex items-center gap-2 sm:w-[88px] sm:justify-end">
            <Mail className="w-4 h-4 text-gray-500 sm:hidden" aria-hidden />
            <span className="text-xs font-medium text-gray-600 w-12 sm:sr-only">Email</span>
            <Toggle
              checked={row.email}
              disabled={disabled}
              label={`${entry.label} email`}
              onChange={(next) => onChange(entry.key, 'email', next)}
            />
          </div>
        ) : (
          <div className="hidden sm:block sm:w-[88px]" aria-hidden />
        )}
      </div>
    </div>
  );
}

export function SettingsNotificationsTab({
  addAuditLog,
}: {
  addAuditLog: (action: string, entityType: string, details?: string) => void;
}) {
  const { employeeId, role, assignableDashboardRoles, isExecutiveUser } = useAppContext();

  const assignableRolesKey = (assignableDashboardRoles ?? []).filter(Boolean).join('|');

  const roles = useMemo<UserRole[]>(() => {
    const fromAssignable = (assignableDashboardRoles ?? []).filter(Boolean) as UserRole[];
    if (fromAssignable.length) return [...new Set(fromAssignable)];
    if (role) return [role as UserRole];
    return isExecutiveUser ? (['Executive'] as UserRole[]) : [];
  }, [assignableRolesKey, role, isExecutiveUser]);

  const rolesKey = useMemo(() => [...roles].sort().join('|'), [roles]);

  const catalogItems = useMemo(() => catalogItemsForRoles(roles), [roles]);
  const grouped = useMemo(() => groupCatalogItems(catalogItems), [catalogItems]);
  const defaultPrefs = useMemo(() => defaultNotificationPrefsForRoles(roles), [roles]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<NotificationPreferencesMap>(() =>
    mergeNotificationPrefs(roles, null),
  );
  const [savedPrefs, setSavedPrefs] = useState<NotificationPreferencesMap>(() =>
    mergeNotificationPrefs(roles, null),
  );
  const [error, setError] = useState<string | null>(null);
  const loadedForKeyRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!employeeId) {
      setLoading(false);
      return;
    }

    const fetchKey = `${employeeId}:${rolesKey}`;
    const isInitialLoad = loadedForKeyRef.current !== fetchKey;
    if (isInitialLoad) setLoading(true);
    setError(null);

    try {
      const merged = await fetchEmployeeNotificationPreferences(employeeId, roles);
      setPrefs(merged);
      setSavedPrefs(merged);
      loadedForKeyRef.current = fetchKey;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load notification preferences.');
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  }, [employeeId, roles, rolesKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = !notificationPrefsEqual(prefs, savedPrefs);
  const atDefaults = notificationPrefsEqual(prefs, defaultPrefs);

  const handleChange = (key: string, channel: NotificationChannel, enabled: boolean) => {
    setPrefs((prev) => setNotificationPrefChannel(prev, key, channel, enabled));
  };

  const handleResetToDefaults = () => {
    setPrefs(defaultPrefs);
    setError(null);
  };

  const handleCancel = () => {
    setPrefs(savedPrefs);
    setError(null);
  };

  const handleSave = async () => {
    if (!employeeId) return;
    setSaving(true);
    setError(null);
    try {
      await saveEmployeeNotificationPreferences(employeeId, prefs);
      setSavedPrefs(prefs);
      addAuditLog('Updated notification preferences', 'Settings');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save notification preferences.');
    } finally {
      setSaving(false);
    }
  };

  if (!employeeId) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-gray-500">
          Sign in with a linked employee account to manage notification preferences.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-red-600" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading preferences…
            </div>
          ) : catalogItems.length === 0 ? (
            <p className="text-sm text-gray-500 py-6">No configurable notifications for your role.</p>
          ) : (
            <div className="space-y-8">
              {[...grouped.entries()].map(([group, items]) => (
                <div key={group} className="space-y-3">
                  <GroupSectionHeader title={group} />
                  <div className="space-y-3">
                    {items.map((entry) => (
                      <NotificationRow
                        key={entry.key}
                        entry={entry}
                        prefs={prefs}
                        disabled={saving}
                        onChange={handleChange}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={saving || loading || atDefaults}
              onClick={handleResetToDefaults}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to defaults
            </Button>
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={saving || loading || !dirty}
                onClick={handleCancel}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
                disabled={saving || loading || !dirty}
                onClick={() => void handleSave()}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save preferences
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
