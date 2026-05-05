import React, { useCallback, useEffect, useState } from 'react';
import { MapPin, Plus, Edit2, Trash2, Save, ExternalLink, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { CompanyMapPicker } from '@/src/components/maps/CompanyMapPicker';
import { openGoogleMapsSearch } from '@/src/lib/maps';
import { getOrCreateCompanySettingsId } from '@/src/lib/branchCompanySettings';
import {
  buildAddressMapsQuery,
  createCompanyAddress,
  deleteCompanyAddress,
  fetchActiveBranchesForSettings,
  fetchAddressesForSettings,
  seedAddressesFromLegacyHqIfEmpty,
  updateCompanyAddress,
  type CompanyAddressRecord,
  type CompanyAddressType,
} from '@/src/lib/companyAddressesSettings';

const ADDRESS_TYPES: CompanyAddressType[] = ['Main Office', 'Branch', 'Warehouse', 'Factory'];

type BranchGroup = {
  branchId: string;
  branchName: string;
  settingsId: string | null;
  loadError: string | null;
  addresses: CompanyAddressRecord[];
};

type LocationDraft = {
  label: string;
  address_type: CompanyAddressType;
  street: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  is_primary: boolean;
  mapPin: { lat: number; lng: number } | null;
};

function emptyDraft(): LocationDraft {
  return {
    label: '',
    address_type: 'Main Office',
    street: '',
    city: '',
    province: '',
    postal_code: '',
    country: 'Philippines',
    is_primary: false,
    mapPin: null,
  };
}

function recordToDraft(r: CompanyAddressRecord): LocationDraft {
  const la = r.latitude != null ? Number(r.latitude) : NaN;
  const ln = r.longitude != null ? Number(r.longitude) : NaN;
  return {
    label: r.label ?? '',
    address_type: (ADDRESS_TYPES.includes(r.address_type as CompanyAddressType)
      ? r.address_type
      : 'Main Office') as CompanyAddressType,
    street: r.street ?? '',
    city: r.city ?? '',
    province: r.province ?? '',
    postal_code: r.postal_code ?? '',
    country: r.country ?? 'Philippines',
    is_primary: r.is_primary,
    mapPin: Number.isFinite(la) && Number.isFinite(ln) ? { lat: la, lng: ln } : null,
  };
}

function draftToInput(d: LocationDraft) {
  return {
    label: d.label,
    address_type: d.address_type,
    street: d.street,
    city: d.city,
    province: d.province,
    postal_code: d.postal_code,
    country: d.country,
    is_primary: d.is_primary,
    latitude: d.mapPin?.lat ?? null,
    longitude: d.mapPin?.lng ?? null,
  };
}

function typeBadgeClass(t: string): { wrap: string; icon: string } {
  switch (t) {
    case 'Main Office':
      return { wrap: 'bg-red-100', icon: 'text-red-600' };
    case 'Branch':
      return { wrap: 'bg-blue-100', icon: 'text-blue-600' };
    case 'Factory':
      return { wrap: 'bg-orange-100', icon: 'text-orange-600' };
    case 'Warehouse':
    default:
      return { wrap: 'bg-green-100', icon: 'text-green-600' };
  }
}

export type SettingsCompanyLocationsTabProps = {
  addAuditLog: (action: string, entity: string, details: string) => void;
};

export function SettingsCompanyLocationsTab({ addAuditLog }: SettingsCompanyLocationsTabProps) {
  const [groups, setGroups] = useState<BranchGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    branchId: string;
    settingsId: string;
    addressId?: string;
    draft: LocationDraft;
  } | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const branches = await fetchActiveBranchesForSettings();
    const next: BranchGroup[] = [];

    for (const b of branches) {
      const rowIdResult = await getOrCreateCompanySettingsId(b.id, b.name);
      if ('error' in rowIdResult) {
        next.push({
          branchId: b.id,
          branchName: b.name,
          settingsId: null,
          loadError: rowIdResult.error,
          addresses: [],
        });
        continue;
      }
      const settingsId = rowIdResult.id;
      await seedAddressesFromLegacyHqIfEmpty(b.id);
      const addresses = await fetchAddressesForSettings(settingsId);
      next.push({
        branchId: b.id,
        branchName: b.name,
        settingsId,
        loadError: null,
        addresses,
      });
    }

    setGroups(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const startAdd = (branchId: string, settingsId: string) => {
    setEditing({ branchId, settingsId, draft: emptyDraft() });
  };

  const startEdit = (branchId: string, settingsId: string, row: CompanyAddressRecord) => {
    setEditing({ branchId, settingsId, addressId: row.id, draft: recordToDraft(row) });
  };

  const cancelEdit = () => setEditing(null);

  const saveDraft = async () => {
    if (!editing) return;
    const { branchId, settingsId, addressId, draft } = editing;
    const key = `${branchId}:${addressId ?? 'new'}`;
    setSavingKey(key);
    try {
      const input = draftToInput(draft);
      if (!input.label.trim()) {
        window.alert('Location name is required.');
        return;
      }
      if (addressId) {
        const res = await updateCompanyAddress(addressId, settingsId, branchId, input);
        if (!res.ok) {
          window.alert(res.error ?? 'Could not update location.');
          return;
        }
        addAuditLog('Settings', 'Company address', `Updated location "${input.label.trim()}" (${branchId})`);
      } else {
        const res = await createCompanyAddress(settingsId, branchId, input);
        if (!res.ok) {
          window.alert(res.error ?? 'Could not add location.');
          return;
        }
        addAuditLog('Settings', 'Company address', `Added location "${input.label.trim()}" (${branchId})`);
      }
      setEditing(null);
      await loadAll();
    } finally {
      setSavingKey(null);
    }
  };

  const removeAddress = async (branchId: string, settingsId: string, id: string, label: string) => {
    if (!window.confirm(`Remove location "${label}"?`)) return;
    setSavingKey(`${branchId}:del:${id}`);
    try {
      const res = await deleteCompanyAddress(id, settingsId, branchId);
      if (!res.ok) {
        window.alert(res.error ?? 'Could not delete.');
        return;
      }
      addAuditLog('Settings', 'Company address', `Removed location "${label}" (${branchId})`);
      if (editing?.addressId === id) setEditing(null);
      await loadAll();
    } finally {
      setSavingKey(null);
    }
  };

  const openMapsExternal = () => {
    if (!editing) return;
    const q = buildAddressMapsQuery(draftToInput(editing.draft));
    if (q) openGoogleMapsSearch(q);
  };

  const previewOk =
    editing?.draft.mapPin != null &&
    Number.isFinite(editing.draft.mapPin.lat) &&
    Number.isFinite(editing.draft.mapPin.lng);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm">Loading locations for all branches…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Company locations</h2>
        <p className="text-sm text-gray-600 mt-1">
          One or more locations per branch. Set a map pin and mailing lines; the primary location syncs to logistics
          depot coordinates. Run <code className="text-xs bg-gray-100 px-1 rounded">database/alter_company_addresses_lat_lng.sql</code>{' '}
          in Supabase if saves fail.
        </p>
      </div>

      {groups.map((g) => (
        <Card key={g.branchId}>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0 pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-600" />
              {g.branchName}
            </CardTitle>
            {g.settingsId && !g.loadError ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 shrink-0"
                disabled={!!savingKey || !!editing}
                onClick={() => startAdd(g.branchId, g.settingsId!)}
              >
                <Plus className="w-4 h-4" />
                Add location
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            {g.loadError ? (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">{g.loadError}</p>
            ) : null}

            {editing && editing.branchId === g.branchId ? (
              <div className="rounded-xl border border-red-100 bg-red-50/30 p-4 space-y-4">
                <h3 className="font-semibold text-gray-900">{editing.addressId ? 'Edit location' : 'New location'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location name</label>
                    <input
                      value={editing.draft.label}
                      onChange={(e) =>
                        setEditing((x) => (x ? { ...x, draft: { ...x.draft, label: e.target.value } } : x))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="e.g. Batangas plant gate"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={editing.draft.address_type}
                      onChange={(e) =>
                        setEditing((x) =>
                          x
                            ? { ...x, draft: { ...x.draft, address_type: e.target.value as CompanyAddressType } }
                            : x,
                        )
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                    >
                      {ADDRESS_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editing.draft.is_primary}
                        onChange={(e) =>
                          setEditing((x) =>
                            x ? { ...x, draft: { ...x.draft, is_primary: e.target.checked } } : x,
                          )
                        }
                        className="rounded border-gray-300"
                      />
                      Primary location (depot pin for this branch)
                    </label>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
                    <input
                      value={editing.draft.street}
                      onChange={(e) =>
                        setEditing((x) => (x ? { ...x, draft: { ...x.draft, street: e.target.value } } : x))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      value={editing.draft.city}
                      onChange={(e) =>
                        setEditing((x) => (x ? { ...x, draft: { ...x.draft, city: e.target.value } } : x))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                    <input
                      value={editing.draft.province}
                      onChange={(e) =>
                        setEditing((x) => (x ? { ...x, draft: { ...x.draft, province: e.target.value } } : x))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                    <input
                      value={editing.draft.postal_code}
                      onChange={(e) =>
                        setEditing((x) => (x ? { ...x, draft: { ...x.draft, postal_code: e.target.value } } : x))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <input
                      value={editing.draft.country}
                      onChange={(e) =>
                        setEditing((x) => (x ? { ...x, draft: { ...x.draft, country: e.target.value } } : x))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Map pin</p>
                  <CompanyMapPicker
                    lat={previewOk ? editing.draft.mapPin!.lat : null}
                    lng={previewOk ? editing.draft.mapPin!.lng : null}
                    onPositionChange={(la, ln) =>
                      setEditing((x) => (x ? { ...x, draft: { ...x.draft, mapPin: { lat: la, lng: ln } } } : x))
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!editing.draft.mapPin}
                      onClick={() =>
                        setEditing((x) => (x ? { ...x, draft: { ...x.draft, mapPin: null } } : x))
                      }
                    >
                      Clear pin
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={openMapsExternal}>
                      <ExternalLink className="w-4 h-4 mr-1" />
                      Google Maps
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!!savingKey}
                    onClick={cancelEdit}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    className="gap-2"
                    disabled={!!savingKey}
                    onClick={() => void saveDraft()}
                  >
                    {savingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save location
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3">
              {g.addresses.length === 0 && !editing ? (
                <p className="text-sm text-gray-500">No saved locations yet. Add one to set the depot map pin.</p>
              ) : null}
              {g.addresses.map((a) => {
                if (editing?.addressId === a.id) return null;
                const tc = typeBadgeClass(a.address_type);
                return (
                  <div
                    key={a.id}
                    className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 rounded-lg border border-gray-200 bg-white p-4"
                  >
                    <div className="flex gap-3 min-w-0">
                      <div className={`p-2 rounded-lg shrink-0 ${tc.wrap}`}>
                        <MapPin className={`w-5 h-5 ${tc.icon}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{a.label || '—'}</h3>
                          <Badge variant="outline" className="text-xs">
                            {a.address_type}
                          </Badge>
                          {a.is_primary ? (
                            <Badge className="bg-red-100 text-red-700 text-xs">Primary</Badge>
                          ) : null}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {[a.street, [a.city, a.province].filter(Boolean).join(', '), a.postal_code, a.country]
                            .filter((x) => x && String(x).trim())
                            .join(' · ') || '—'}
                        </p>
                        {a.latitude != null && a.longitude != null && Number.isFinite(a.latitude + a.longitude) ? (
                          <p className="text-xs text-gray-500 mt-1 font-mono">
                            {Number(a.latitude).toFixed(5)}, {Number(a.longitude).toFixed(5)}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-400 mt-1">No map pin</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!!savingKey || !!editing}
                        onClick={() => g.settingsId && startEdit(g.branchId, g.settingsId, a)}
                      >
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-red-600"
                        disabled={!!savingKey || !!editing}
                        onClick={() => g.settingsId && removeAddress(g.branchId, g.settingsId, a.id, a.label ?? '')}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
