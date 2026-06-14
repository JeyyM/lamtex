import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Factory, GitBranch, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { CompanyMapPicker } from '@/src/components/maps/CompanyMapPicker';
import { ModuleAccessDenied } from '@/src/components/permissions/ModuleAccessDenied';
import { useSupplierPermissions } from '@/src/lib/permissions/supplierPermissions';
import { supabase } from '@/src/lib/supabase';
import { useAppContext } from '@/src/store/AppContext';
import { supplierCoord, type SupplierBranchRow } from '@/src/pages/supplierModel';

const SUPPLIER_TYPES = ['Raw Materials', 'Chemicals', 'Packaging', 'Equipment', 'Services'] as const;
const SUPPLIER_STATUSES = ['Active', 'Under Review', 'Inactive', 'Suspended'] as const;
const RISK_LEVELS = ['Low', 'Medium', 'High'] as const;

type SupplierFormState = {
  name: string;
  type: (typeof SUPPLIER_TYPES)[number];
  category: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  province: string;
  postal_code: string;
  map_lat: number | null;
  map_lng: number | null;
  payment_terms: string;
  status: (typeof SUPPLIER_STATUSES)[number];
  risk_level: (typeof RISK_LEVELS)[number];
  preferred_supplier: boolean;
  notes: string;
};

const DEFAULT_FORM: SupplierFormState = {
  name: '',
  type: 'Raw Materials',
  category: '',
  contact_person: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  province: '',
  postal_code: '',
  map_lat: null,
  map_lng: null,
  payment_terms: '30',
  status: 'Active',
  risk_level: 'Low',
  preferred_supplier: false,
  notes: '',
};

export function SupplierFormPage() {
  const navigate = useNavigate();
  const { branch, addAuditLog } = useAppContext();
  const perms = useSupplierPermissions();

  const [form, setForm] = useState<SupplierFormState>(DEFAULT_FORM);
  const [branchRows, setBranchRows] = useState<SupplierBranchRow[]>([]);
  const [allBranches, setAllBranches] = useState<{ id: string; name: string; code: string }[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [addBranchId, setAddBranchId] = useState('');

  const loadBranches = useCallback(async () => {
    setLoadingBranches(true);
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, code')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      const rows = (data ?? []) as { id: string; name: string; code: string }[];
      setAllBranches(rows);

      if (branch) {
        const match = rows.find((b) => b.name === branch);
        if (match) {
          setBranchRows([
            {
              branch_id: match.id,
              is_primary: true,
              branches: { name: match.name, code: match.code },
            },
          ]);
        }
      }
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[SupplierForm] branches', e);
    } finally {
      setLoadingBranches(false);
    }
  }, [branch]);

  useEffect(() => {
    void loadBranches();
  }, [loadBranches]);

  const handleAddBranch = (branchId: string) => {
    const branchInfo = allBranches.find((b) => b.id === branchId);
    if (!branchInfo || branchRows.some((sb) => sb.branch_id === branchId)) return;
    setBranchRows((prev) => [
      ...prev,
      {
        branch_id: branchId,
        is_primary: prev.length === 0,
        branches: { name: branchInfo.name, code: branchInfo.code },
      },
    ]);
    setAddBranchId('');
  };

  const handleRemoveBranch = (branchId: string) => {
    setBranchRows((prev) => prev.filter((sb) => sb.branch_id !== branchId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setNameError('Supplier name is required.');
      return;
    }
    setNameError(null);
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('suppliers')
        .insert({
          name: trimmedName,
          type: form.type,
          category: form.category.trim() || null,
          contact_person: form.contact_person.trim() || null,
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          city: form.city.trim() || null,
          province: form.province.trim() || null,
          postal_code: form.postal_code.trim() || null,
          map_lat: supplierCoord(form.map_lat),
          map_lng: supplierCoord(form.map_lng),
          payment_terms: form.payment_terms.trim() || '30',
          currency: 'PHP',
          status: form.status,
          risk_level: form.risk_level,
          preferred_supplier: form.preferred_supplier,
          notes: form.notes.trim() || null,
          account_since: new Date().toISOString().slice(0, 10),
        })
        .select('id')
        .single();
      if (error) throw error;

      const supplierId = String(data.id);
      if (branchRows.length > 0) {
        const { error: branchError } = await supabase.from('supplier_branches').insert(
          branchRows.map((sb, i) => ({
            supplier_id: supplierId,
            branch_id: sb.branch_id,
            is_primary: sb.is_primary || i === 0,
          })),
        );
        if (branchError) throw branchError;
      }

      addAuditLog('Created supplier', 'Supplier', trimmedName);
      navigate(`/suppliers/${supplierId}`, { replace: true });
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to create supplier.');
    } finally {
      setSaving(false);
    }
  };

  if (!perms.pageAccess) {
    return <ModuleAccessDenied moduleName="Suppliers" />;
  }

  const availableBranches = allBranches.filter((b) => !branchRows.some((sb) => sb.branch_id === b.id));

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0 max-w-4xl pb-8">
      <Button variant="outline" onClick={() => navigate('/suppliers')} className="gap-2">
        <ArrowLeft className="w-4 h-4" /> Back to suppliers
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Factory className="w-5 h-5 text-red-600" />
            Add New Supplier
          </CardTitle>
          <p className="text-sm text-gray-500 font-normal mt-1">
            Create a supplier profile. You can link raw materials on the detail page after saving.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
            <div>
              <label htmlFor="supplier-name" className="block text-xs font-medium text-gray-600 mb-1">
                Supplier name <span className="text-red-600">*</span>
              </label>
              <input
                id="supplier-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  nameError ? 'border-red-400' : 'border-gray-300'
                }`}
                placeholder="e.g. Bondoc Peninsula Packaging Corp."
                autoFocus
              />
              {nameError ? <p className="text-xs text-red-600 mt-1">{nameError}</p> : null}
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Basic details</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as SupplierFormState['type'] }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    {SUPPLIER_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                  <input
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="e.g. Packaging - Bags & woven sacks"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Contact person</label>
                  <input
                    value={form.contact_person}
                    onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Address &amp; map pin</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Street / building</label>
                  <input
                    value={form.address}
                    onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                  <input
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Province / region</label>
                  <input
                    value={form.province}
                    onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Postal code</label>
                  <input
                    value={form.postal_code}
                    onChange={(e) => setForm((f) => ({ ...f, postal_code: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Pin on map</label>
                  <CompanyMapPicker
                    searchInputId="supplier-create-map"
                    lat={form.map_lat}
                    lng={form.map_lng}
                    onPositionChange={(lat, lng) => setForm((f) => ({ ...f, map_lat: lat, map_lng: lng }))}
                    markerTitle={form.name.trim() || 'Supplier'}
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Terms &amp; status</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Avg delivery (days)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.payment_terms}
                    onChange={(e) => setForm((f) => ({ ...f, payment_terms: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as SupplierFormState['status'] }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    {SUPPLIER_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Risk level</label>
                  <select
                    value={form.risk_level}
                    onChange={(e) => setForm((f) => ({ ...f, risk_level: e.target.value as SupplierFormState['risk_level'] }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    {RISK_LEVELS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3 pt-5">
                  <input
                    type="checkbox"
                    id="preferred_create"
                    checked={form.preferred_supplier}
                    onChange={(e) => setForm((f) => ({ ...f, preferred_supplier: e.target.checked }))}
                    className="w-4 h-4 text-red-600 rounded"
                  />
                  <label htmlFor="preferred_create" className="text-sm text-gray-700 font-medium">
                    Mark as preferred supplier
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <GitBranch className="w-4 h-4" /> Branch assignment
              </h2>
              {loadingBranches ? (
                <p className="text-sm text-gray-500 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading branches…
                </p>
              ) : (
                <div className="space-y-2">
                  {branchRows.length === 0 && (
                    <p className="text-sm text-gray-400">No branches assigned yet. Add at least one branch this supplier serves.</p>
                  )}
                  {branchRows.map((sb) => (
                    <div
                      key={sb.branch_id}
                      className="flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg"
                    >
                      <span className="text-sm font-medium text-gray-800">{sb.branches?.name ?? '?'}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveBranch(sb.branch_id)}
                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                        aria-label={`Remove ${sb.branches?.name ?? 'branch'}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {availableBranches.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      <select
                        value={addBranchId}
                        onChange={(e) => setAddBranchId(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500"
                      >
                        <option value="">Add a branch…</option>
                        {availableBranches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        className="gap-1"
                        disabled={!addBranchId}
                        onClick={() => handleAddBranch(addBranchId)}
                      >
                        <Plus className="w-4 h-4" /> Add
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={() => navigate('/suppliers')} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="gap-2" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Creating…' : 'Create supplier'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
