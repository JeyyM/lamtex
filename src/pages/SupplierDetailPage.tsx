import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { supabase } from '@/src/lib/supabase';
import { CompanyMapPicker } from '@/src/components/maps/CompanyMapPicker';
import { GoogleMapEmbed } from '@/src/components/maps/GoogleMapEmbed';
import { openGoogleMapsSearch } from '@/src/lib/maps';
import {
  Factory,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Clock,
  Package,
  Plus,
  Edit,
  GitBranch,
  Save,
  Trash2,
  ExternalLink,
  Loader2,
  ArrowLeft,
  Award,
  ShoppingCart,
  Search,
  Download,
  ChevronDown,
  ChevronUp,
  CalendarRange,
  X,
} from 'lucide-react';
import { TablePagination, TABLE_PAGE_SIZE } from '@/src/components/ui/TablePagination';
import {
  DATE_PERIOD_OPTIONS,
  inDatePeriodRange,
  periodTriggerLabel,
  resolveDatePeriodQuery,
  todayIsoLocal,
  type DatePeriodKind,
} from '@/src/lib/datePeriodQuery';
import {
  buildSupplierDetailExportBundle,
  downloadSupplierDetailWorkbook,
} from '@/src/lib/supplierDetailExport';
import {
  SUPPLIER_DETAIL_SELECT,
  type SupplierBranchRow,
  type SupplierRow,
  supplierAddressQuery,
  supplierCoord,
} from '@/src/pages/supplierModel';
import RawMaterialPickerModal from '@/src/components/products/RawMaterialPickerModal';
import { useAppContext } from '@/src/store/AppContext';

function formatCurrency(amount: number) {
  if (amount == null || Number.isNaN(amount)) return '—';
  const n = Number(amount);
  if (n === 0) return '₱0';
  if (Math.abs(n) < 1_000_000) {
    return `₱${n.toLocaleString('en-PH', { maximumFractionDigits: 0, minimumFractionDigits: 0 })}`;
  }
  return `₱${(n / 1_000_000).toFixed(2)}M`;
}

function getRiskColor(risk: string): 'success' | 'warning' | 'danger' {
  if (risk === 'Low') return 'success';
  if (risk === 'Medium') return 'warning';
  return 'danger';
}

function getStatusColor(status: string): 'success' | 'warning' | 'danger' | 'neutral' {
  if (status === 'Active') return 'success';
  if (status === 'Under Review') return 'warning';
  if (status === 'Inactive') return 'neutral';
  return 'danger';
}

function getTypeStyle(type: string) {
  switch (type) {
    case 'Raw Materials': return { bg: 'bg-blue-100', icon: 'text-blue-600' };
    case 'Chemicals': return { bg: 'bg-purple-100', icon: 'text-purple-600' };
    case 'Packaging': return { bg: 'bg-orange-100', icon: 'text-orange-600' };
    case 'Equipment': return { bg: 'bg-red-100', icon: 'text-red-600' };
    case 'Services': return { bg: 'bg-green-100', icon: 'text-green-600' };
    default: return { bg: 'bg-gray-100', icon: 'text-gray-600' };
  }
}

function SupplierMaterialThumb({
  imageUrl,
  label,
}: {
  imageUrl: string | null | undefined;
  label: string;
}) {
  return (
    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
      {imageUrl ? (
        <img src={imageUrl} alt={label} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
          <Package className="h-5 w-5 text-gray-400" />
        </div>
      )}
    </div>
  );
}

interface SupplierPOHistoryRow {
  id: string;
  po_number: string;
  status: string;
  order_date: string;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  total_amount: number;
  currency: string;
  inter_branch_request_id: string | null;
  is_transfer_request: boolean;
  branches: { name: string } | null;
  purchase_order_items: Array<{ id: string }>;
}

function hideSupplierPOFromHistory(po: Pick<SupplierPOHistoryRow, 'inter_branch_request_id' | 'is_transfer_request' | 'po_number'>): boolean {
  return (
    po.inter_branch_request_id != null ||
    po.po_number.startsWith('PO-IBR-') ||
    po.is_transfer_request === true
  );
}

function poHistoryStatusVariant(status: string): 'success' | 'warning' | 'danger' | 'neutral' | 'default' {
  if (status === 'Completed') return 'success';
  if (status === 'Partially Received') return 'warning';
  if (status === 'Cancelled' || status === 'Rejected') return 'danger';
  if (status === 'Requested') return 'warning';
  if (status === 'Accepted' || status === 'Confirmed' || status === 'Sent') return 'default';
  return 'neutral';
}

function formatPoDate(date: string | null): string {
  return date ? new Date(date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
}

export function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { branch: navbarBranch, addAuditLog } = useAppContext();

  const [supplier, setSupplier] = useState<SupplierRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<SupplierRow>>({});
  const [saving, setSaving] = useState(false);
  const [allBranches, setAllBranches] = useState<{ id: string; name: string; code: string }[]>([]);
  const [editBranches, setEditBranches] = useState<SupplierBranchRow[]>([]);
  const [showAddMaterialPicker, setShowAddMaterialPicker] = useState(false);
  const [addMatPreview, setAddMatPreview] = useState<{
    name: string;
    sku: string;
    unit: string;
    imageUrl: string | null;
  } | null>(null);
  const [addMatId, setAddMatId] = useState('');
  const [addMatPrice, setAddMatPrice] = useState('');
  const [addMatLeadTime, setAddMatLeadTime] = useState('');
  const [addMatMinQty, setAddMatMinQty] = useState('');
  const [addMatPreferred, setAddMatPreferred] = useState(false);

  const [poHistory, setPoHistory] = useState<SupplierPOHistoryRow[]>([]);
  const [poHistoryLoading, setPoHistoryLoading] = useState(false);
  const [poHistoryError, setPoHistoryError] = useState<string | null>(null);
  const [poTablePage, setPoTablePage] = useState(1);
  const [exportingSupplier, setExportingSupplier] = useState(false);
  const [exportPeriodKind, setExportPeriodKind] = useState<DatePeriodKind>('all');
  const [exportCustomStart, setExportCustomStart] = useState('');
  const [exportCustomEnd, setExportCustomEnd] = useState('');
  const [exportPeriodModalOpen, setExportPeriodModalOpen] = useState(false);
  const [draftExportPeriodKind, setDraftExportPeriodKind] = useState<DatePeriodKind>('all');
  const [draftExportCustomStart, setDraftExportCustomStart] = useState('');
  const [draftExportCustomEnd, setDraftExportCustomEnd] = useState('');
  const [materialsExpanded, setMaterialsExpanded] = useState(false);
  const [materialSearchQuery, setMaterialSearchQuery] = useState('');

  /** Same rules as Suppliers list: exclude non-commitment statuses; YTD = calendar year. */
  const spendFromPoHistory = useMemo(() => {
    const year = new Date().getFullYear();
    const yearStart = `${year}-01-01`;
    const ex = new Set<string>(['Draft', 'Requested', 'Rejected', 'Cancelled']);
    let ytd = 0;
    let ytdN = 0;
    let lifetime = 0;
    let n = 0;
    for (const po of poHistory) {
      if (ex.has(po.status)) continue;
      const amt = Number(po.total_amount) || 0;
      lifetime += amt;
      n += 1;
      const od = po.order_date?.slice(0, 10) ?? '';
      if (od >= yearStart) {
        ytd += amt;
        ytdN += 1;
      }
    }
    return { ytd, ytdN, lifetime, n };
  }, [poHistory]);

  const exportQueryDates = useMemo(
    () => resolveDatePeriodQuery(exportPeriodKind, exportCustomStart, exportCustomEnd),
    [exportPeriodKind, exportCustomStart, exportCustomEnd],
  );

  const maxExportCustomDate = useMemo(() => todayIsoLocal(), []);

  const draftExportCustomInvalid = Boolean(
    draftExportCustomStart && draftExportCustomEnd && draftExportCustomStart > draftExportCustomEnd,
  );

  const filteredPoHistory = useMemo(() => {
    if (exportQueryDates.invalid) return poHistory;
    return poHistory.filter(po =>
      inDatePeriodRange(po.order_date, exportQueryDates.from, exportQueryDates.to),
    );
  }, [poHistory, exportQueryDates]);

  const filteredMaterials = useMemo(() => {
    const q = materialSearchQuery.trim().toLowerCase();
    if (!q) return supplier?.supplier_materials ?? [];
    return (supplier?.supplier_materials ?? []).filter(sm => {
      const name = sm.raw_materials?.name?.toLowerCase() ?? '';
      const sku = sm.raw_materials?.sku?.toLowerCase() ?? '';
      return name.includes(q) || sku.includes(q);
    });
  }, [supplier?.supplier_materials, materialSearchQuery]);

  const poTableTotalPages = Math.max(1, Math.ceil(filteredPoHistory.length / TABLE_PAGE_SIZE) || 1);
  const safePoTablePage = Math.min(Math.max(1, poTablePage), poTableTotalPages);
  const paginatedPoHistory = useMemo(
    () => filteredPoHistory.slice((safePoTablePage - 1) * TABLE_PAGE_SIZE, safePoTablePage * TABLE_PAGE_SIZE),
    [filteredPoHistory, safePoTablePage],
  );

  useEffect(() => {
    setPoTablePage(1);
  }, [filteredPoHistory.length, id, exportQueryDates.from, exportQueryDates.to, exportQueryDates.invalid]);

  const openExportPeriodModal = () => {
    setDraftExportPeriodKind(exportPeriodKind);
    setDraftExportCustomStart(exportCustomStart);
    setDraftExportCustomEnd(exportCustomEnd);
    setExportPeriodModalOpen(true);
  };

  const handleExportPeriodChange = (kind: DatePeriodKind) => {
    setExportPeriodKind(kind);
    if (kind === 'custom') {
      const t = new Date();
      const iso = todayIsoLocal();
      const start = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-01`;
      setExportCustomStart(start);
      setExportCustomEnd(iso);
    }
  };

  const handleExportModalPresetPick = (kind: DatePeriodKind) => {
    if (kind !== 'custom') {
      handleExportPeriodChange(kind);
      setExportPeriodModalOpen(false);
      return;
    }
    setDraftExportPeriodKind('custom');
    const t = new Date();
    const iso = todayIsoLocal();
    const start = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-01`;
    setDraftExportCustomStart(prev => prev || exportCustomStart || start);
    setDraftExportCustomEnd(prev => prev || exportCustomEnd || iso);
  };

  const applyExportModalCustomRange = () => {
    setExportPeriodKind('custom');
    setExportCustomStart(draftExportCustomStart);
    setExportCustomEnd(draftExportCustomEnd);
    setExportPeriodModalOpen(false);
  };

  useEffect(() => {
    if (!exportPeriodModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExportPeriodModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [exportPeriodModalOpen]);

  const handleExportSupplier = async () => {
    if (!supplier || exportingSupplier || exportQueryDates.invalid) return;
    setExportingSupplier(true);
    try {
      const bundle = await buildSupplierDetailExportBundle(
        supplier.id,
        exportQueryDates.from,
        exportQueryDates.to,
      );
      await downloadSupplierDetailWorkbook({
        supplier: bundle.supplier,
        materials: bundle.materials,
        purchaseOrders: bundle.purchaseOrders,
        lines: bundle.lines,
        periodLabel: exportQueryDates.displayLabel,
      });
      addAuditLog(
        'Exported supplier workbook',
        'Supplier',
        `${supplier.name} · ${bundle.purchaseOrders.length} PO${bundle.purchaseOrders.length !== 1 ? 's' : ''} · ${exportQueryDates.displayLabel}`,
      );
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setExportingSupplier(false);
    }
  };

  const fetchSupplier = useCallback(async () => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      setSupplier(null);
      return;
    }
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const { data, error: qErr } = await supabase
        .from('suppliers')
        .select(SUPPLIER_DETAIL_SELECT)
        .eq('id', id)
        .single();
      if (qErr) {
        if ((qErr as { code?: string }).code === 'PGRST116') {
          setNotFound(true);
          setSupplier(null);
        } else {
          throw qErr;
        }
        return;
      }
      setSupplier(data as unknown as SupplierRow);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load supplier';
      setError(msg);
      setSupplier(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchPurchaseOrderHistory = useCallback(async () => {
    if (!id) {
      setPoHistory([]);
      return;
    }
    setPoHistoryLoading(true);
    setPoHistoryError(null);
    try {
      const { data, error: qErr } = await supabase
        .from('purchase_orders')
        .select(`
          id,
          po_number,
          status,
          order_date,
          expected_delivery_date,
          actual_delivery_date,
          total_amount,
          currency,
          inter_branch_request_id,
          is_transfer_request,
          branches:branches!branch_id(name),
          purchase_order_items ( id )
        `)
        .eq('supplier_id', id)
        .order('order_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(150);
      if (qErr) throw qErr;
      const rows = (data ?? []) as unknown as SupplierPOHistoryRow[];
      setPoHistory(rows.filter(po => !hideSupplierPOFromHistory(po)));
    } catch (e: unknown) {
      setPoHistoryError(e instanceof Error ? e.message : 'Failed to load purchase orders');
      setPoHistory([]);
    } finally {
      setPoHistoryLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchPurchaseOrderHistory();
  }, [fetchPurchaseOrderHistory]);

  useEffect(() => {
    void fetchSupplier();
  }, [fetchSupplier]);

  const fetchEditResources = useCallback(async () => {
    const { data } = await supabase.from('branches').select('id, name, code').eq('is_active', true).order('name');
    setAllBranches((data ?? []) as { id: string; name: string; code: string }[]);
  }, []);

  const clearAddMaterialDraft = useCallback(() => {
    setShowAddMaterialPicker(false);
    setAddMatId('');
    setAddMatPreview(null);
    setAddMatPrice('');
    setAddMatLeadTime('');
    setAddMatMinQty('');
    setAddMatPreferred(false);
  }, []);

  const handleStartEdit = () => {
    if (!supplier) return;
    clearAddMaterialDraft();
    setEditForm({ ...supplier });
    setEditBranches([...supplier.supplier_branches]);
    setIsEditing(true);
    void fetchEditResources();
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({});
    setEditBranches([]);
    clearAddMaterialDraft();
  };

  const handleSaveEdit = async () => {
    if (!supplier) return;
    setSaving(true);
    try {
      const { error: supplierError } = await supabase.from('suppliers').update({
        name: editForm.name,
        type: editForm.type,
        category: editForm.category,
        contact_person: editForm.contact_person,
        phone: editForm.phone,
        email: editForm.email,
        address: editForm.address?.trim() || null,
        city: editForm.city?.trim() || null,
        province: editForm.province?.trim() || null,
        postal_code: editForm.postal_code?.trim() || null,
        map_lat: supplierCoord(editForm.map_lat),
        map_lng: supplierCoord(editForm.map_lng),
        payment_terms: editForm.payment_terms,
        currency: 'PHP',
        status: editForm.status,
        risk_level: editForm.risk_level,
        preferred_supplier: editForm.preferred_supplier,
        notes: editForm.notes,
      }).eq('id', supplier.id);
      if (supplierError) throw supplierError;

      const originalIds = supplier.supplier_branches.map(sb => sb.branch_id);
      const newIds = editBranches.map(sb => sb.branch_id);
      const toRemove = originalIds.filter(bid => !newIds.includes(bid));
      const toAdd = editBranches.filter(sb => !originalIds.includes(sb.branch_id));

      if (toRemove.length > 0) {
        const { error } = await supabase.from('supplier_branches')
          .delete()
          .eq('supplier_id', supplier.id)
          .in('branch_id', toRemove);
        if (error) throw error;
      }
      for (const sb of toAdd) {
        const { error } = await supabase.from('supplier_branches').insert({
          supplier_id: supplier.id,
          branch_id: sb.branch_id,
          is_primary: sb.is_primary,
        });
        if (error) throw error;
      }

      await fetchSupplier();
      void fetchPurchaseOrderHistory();
      setIsEditing(false);
      setEditForm({});
      setEditBranches([]);
      clearAddMaterialDraft();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMaterial = async (smId: string) => {
    const { error } = await supabase.from('supplier_materials').delete().eq('id', smId);
    if (error) {
      alert(error.message);
      return;
    }
    await fetchSupplier();
  };

  const handleAddMaterial = async () => {
    if (!supplier || !addMatId) return;
    const alreadyLinked = supplier.supplier_materials.some(sm => sm.material_id === addMatId);
    if (alreadyLinked) {
      alert('This material is already linked to this supplier.');
      return;
    }
    const { error } = await supabase.from('supplier_materials').insert({
      supplier_id: supplier.id,
      material_id: addMatId,
      unit_price: parseFloat(addMatPrice) || 0,
      lead_time_days: parseInt(addMatLeadTime, 10) || 0,
      min_order_qty: parseInt(addMatMinQty, 10) || 1,
      is_preferred: addMatPreferred,
    });
    if (error) {
      alert(error.message);
      return;
    }
    clearAddMaterialDraft();
    await fetchSupplier();
  };

  const handleRemoveBranch = (branchId: string) => {
    setEditBranches(prev => prev.filter(sb => sb.branch_id !== branchId));
  };

  const handleAddBranch = (branchId: string) => {
    const branchInfo = allBranches.find(b => b.id === branchId);
    if (!branchInfo) return;
    setEditBranches(prev => [
      ...prev,
      {
        branch_id: branchId,
        is_primary: prev.length === 0,
        branches: { name: branchInfo.name, code: branchInfo.code },
      },
    ]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-red-500 mx-auto" />
          <p className="mt-4 text-gray-500">Loading supplier…</p>
        </div>
      </div>
    );
  }

  if (notFound || !supplier) {
    return (
      <div className="space-y-4 max-w-xl mx-auto">
        <Button variant="outline" onClick={() => navigate('/suppliers')} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to suppliers
        </Button>
        <Card>
          <CardContent className="p-8 text-center text-gray-600">
            {error ? (
              <p>{error}</p>
            ) : (
              <p>Supplier not found.</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0 w-full pb-8">
      <Button variant="outline" onClick={() => navigate('/suppliers')} className="gap-2">
        <ArrowLeft className="w-4 h-4" /> Back to suppliers
      </Button>

      <Card className="overflow-hidden">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2 rounded-lg flex-shrink-0 ${getTypeStyle(isEditing ? (editForm.type ?? supplier.type) : supplier.type).bg}`}>
              <Factory className={`w-5 h-5 ${getTypeStyle(isEditing ? (editForm.type ?? supplier.type) : supplier.type).icon}`} />
            </div>
            <div className="min-w-0">
              {isEditing ? (
                <input
                  value={editForm.name ?? ''}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="text-lg font-bold text-gray-900 border-b border-indigo-400 focus:outline-none bg-transparent w-full max-w-md"
                />
              ) : (
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{supplier.name}</h1>
              )}
              <p className="text-sm text-gray-500 truncate">
                {isEditing ? (editForm.type ?? supplier.type) : supplier.type}
                {' · '}
                {isEditing ? (editForm.category || '—') : (supplier.category ?? '—')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => void handleSaveEdit()}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={handleCancelEdit} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleStartEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Edit className="w-4 h-4" /> Edit
              </button>
            )}
          </div>
        </div>

        <CardContent className="p-4 sm:p-6 space-y-6">
          {!isEditing && (
            <>
              <div className="flex flex-wrap gap-2">
                {supplier.preferred_supplier && (
                  <Badge variant="success"><Award className="w-3 h-3 mr-1" />Preferred Supplier</Badge>
                )}
                <Badge variant={getStatusColor(supplier.status)}>{supplier.status}</Badge>
                <Badge variant={getRiskColor(supplier.risk_level)}>{supplier.risk_level} Risk</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { icon: <User className="w-4 h-4 text-gray-400" />, label: 'Contact Person', value: supplier.contact_person },
                  { icon: <Phone className="w-4 h-4 text-gray-400" />, label: 'Phone', value: supplier.phone },
                  { icon: <Mail className="w-4 h-4 text-gray-400" />, label: 'Email', value: supplier.email },
                  { icon: <Clock className="w-4 h-4 text-gray-400" />, label: 'Avg Delivery', value: supplier.payment_terms ? `${supplier.payment_terms.replace(/[^0-9]/g, '')} days` : '—' },
                  { icon: <Calendar className="w-4 h-4 text-gray-400" />, label: 'Member Since', value: supplier.account_since ?? '—' },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-2">
                    {item.icon}
                    <div>
                      <div className="text-xs text-gray-500">{item.label}</div>
                      <div className="text-sm text-gray-900">{item.value ?? '—'}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Address &amp; map
                </h2>
                {(() => {
                  const locLines = [
                    supplier.address,
                    [supplier.city, supplier.province].filter(Boolean).join(', ') || null,
                    supplier.postal_code,
                  ]
                    .map(x => (x != null ? String(x).trim() : ''))
                    .filter(Boolean);
                  const locText = locLines.length ? locLines.join('\n') : null;
                  const mLat = supplierCoord(supplier.map_lat);
                  const mLng = supplierCoord(supplier.map_lng);
                  const mapsQ =
                    mLat != null && mLng != null ? `${mLat},${mLng}` : supplierAddressQuery(supplier);
                  return (
                    <div className="space-y-3">
                      {locText ? (
                        <p className="text-sm text-gray-800 whitespace-pre-line">{locText}</p>
                      ) : (
                        <p className="text-sm text-gray-400 italic">No address on file. Click Edit to add.</p>
                      )}
                      {mLat != null && mLng != null ? (
                        <>
                          <p className="text-xs text-gray-500 font-mono">
                            {mLat.toFixed(5)}, {mLng.toFixed(5)}
                          </p>
                          <div className="rounded-lg border border-gray-200 overflow-hidden max-w-md">
                            <GoogleMapEmbed title={`${supplier.name} — map`} lat={mLat} lng={mLng} zoom={16} className="!h-48 w-full !border-0" />
                          </div>
                        </>
                      ) : null}
                      {mapsQ ? (
                        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => openGoogleMapsSearch(mapsQ)}>
                          <ExternalLink className="w-4 h-4" />
                          Open in Google Maps
                        </Button>
                      ) : null}
                    </div>
                  );
                })()}
              </div>

              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <GitBranch className="w-4 h-4" /> Assigned Branches
                </h2>
                {supplier.supplier_branches.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {supplier.supplier_branches.map(sb => (
                      <span
                        key={sb.branch_id}
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${sb.is_primary ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                      >
                        {sb.branches?.name ?? '?'}{sb.is_primary ? ' (Primary)' : ''}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No branches assigned. Click Edit to assign.</p>
                )}
              </div>

              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Financial Summary</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(() => {
                    const po = spendFromPoHistory;
                    const usePo = po.n > 0;
                    const ytdSpend = usePo ? po.ytd : supplier.total_purchases_ytd;
                    const lifetimeSpend = usePo ? po.lifetime : supplier.total_purchases_lifetime;
                    const orderCountVal = usePo ? po.n : supplier.order_count;
                    const avgOrder =
                      usePo && po.n > 0 ? po.lifetime / po.n : supplier.avg_order_value;
                    return [
                      { label: 'YTD Spending', value: formatCurrency(ytdSpend), color: 'text-blue-600' },
                      { label: 'Lifetime Spend', value: formatCurrency(lifetimeSpend), color: 'text-gray-900' },
                      { label: 'Order Count', value: String(orderCountVal), color: 'text-gray-900' },
                      { label: 'Avg Order Value', value: avgOrder > 0 ? formatCurrency(avgOrder) : '—', color: 'text-green-600' },
                      { label: 'Last Purchase', value: supplier.last_purchase_date ?? 'Never', color: 'text-gray-900' },
                      { label: 'Materials Linked', value: String(supplier.supplier_materials.length), color: 'text-purple-600' },
                    ].map(item => (
                      <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                        <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                        <div className={`text-sm font-bold ${item.color}`}>{item.value}</div>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              <div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
                  <button
                    type="button"
                    onClick={() => setMaterialsExpanded(v => !v)}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 text-left"
                    aria-expanded={materialsExpanded}
                  >
                    <Package className="w-4 h-4 shrink-0" />
                    Linked Raw Materials
                    <span className="text-xs font-normal text-gray-500 tabular-nums">
                      ({supplier.supplier_materials.length})
                    </span>
                    {materialsExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" aria-hidden />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" aria-hidden />
                    )}
                  </button>
                  {!isEditing && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMaterialsExpanded(true);
                        setShowAddMaterialPicker(true);
                      }}
                      className="gap-1.5 w-full sm:w-auto shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      Add material
                    </Button>
                  )}
                </div>

                {materialsExpanded && (
                  <>
                    {supplier.supplier_materials.length > 0 && (
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search by name or SKU…"
                          value={materialSearchQuery}
                          onChange={e => setMaterialSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                    )}

                {addMatId && !isEditing && (
                  <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-indigo-900 uppercase tracking-wide">Link to this supplier</p>
                      <button
                        type="button"
                        onClick={() => clearAddMaterialDraft()}
                        className="text-xs text-gray-600 hover:text-gray-900 font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white p-3 flex items-start gap-3">
                      <SupplierMaterialThumb imageUrl={addMatPreview?.imageUrl} label={addMatPreview?.name ?? 'Material'} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{addMatPreview?.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{addMatPreview?.sku}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{addMatPreview?.unit}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAddMatId('');
                          setAddMatPreview(null);
                          setShowAddMaterialPicker(true);
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex-shrink-0"
                      >
                        Change
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Unit Price (₱)</label>
                        <input
                          type="number"
                          min="0"
                          value={addMatPrice}
                          onChange={e => setAddMatPrice(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Lead Time (days)</label>
                        <input
                          type="number"
                          min="0"
                          value={addMatLeadTime}
                          onChange={e => setAddMatLeadTime(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Min Order Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={addMatMinQty}
                          onChange={e => setAddMatMinQty(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                          placeholder="1"
                        />
                      </div>
                      <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={addMatPreferred}
                            onChange={e => setAddMatPreferred(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 rounded"
                          />
                          Preferred source
                        </label>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => void handleAddMaterial()}
                      disabled={!addMatId}
                      className="w-full gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Link material
                    </Button>
                  </div>
                )}

                {supplier.supplier_materials.length === 0 && !addMatId ? (
                  <p className="text-sm text-gray-500">No materials linked yet. Use Add material to link one.</p>
                ) : filteredMaterials.length === 0 ? (
                  <p className="text-sm text-gray-500">No materials match your search.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filteredMaterials.map(sm => (
                      <Link
                        key={sm.id}
                        to={`/materials/${sm.material_id}`}
                        className="grid w-full min-w-0 grid-cols-1 gap-3 border border-gray-100 bg-gray-50 p-3 text-inherit no-underline transition-colors hover:bg-gray-100/90 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-4 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500"
                        aria-label={`Open raw material ${sm.raw_materials?.name ?? sm.material_id}`}
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <SupplierMaterialThumb
                            imageUrl={sm.raw_materials?.image_url}
                            label={sm.raw_materials?.name ?? 'Raw material'}
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900">{sm.raw_materials?.name ?? '—'}</div>
                            <div className="text-xs text-gray-500">
                              {sm.raw_materials?.sku} · Lead: {sm.lead_time_days}d · Min: {sm.min_order_qty.toLocaleString()} {sm.raw_materials?.unit_of_measure}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-stretch text-left sm:items-end sm:text-right">
                          <div className="text-sm font-bold text-gray-900">
                            ₱{sm.unit_price.toLocaleString()}/{sm.raw_materials?.unit_of_measure ?? 'unit'}
                          </div>
                          {sm.is_preferred && (
                            <Badge variant="success" className="mt-1 w-fit text-xs sm:ml-auto">
                              Preferred
                            </Badge>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
                  </>
                )}
              </div>

              {supplier.notes && (
                <div>
                  <h2 className="text-sm font-semibold text-gray-700 mb-2">Notes</h2>
                  <p className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-3">{supplier.notes}</p>
                </div>
              )}
            </>
          )}

          {isEditing && (
            <>
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3">Basic Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                    <select
                      value={editForm.type ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {['Raw Materials', 'Chemicals', 'Packaging', 'Equipment', 'Services'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                    <input
                      value={editForm.category ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g. PVC Resin"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Contact Person</label>
                    <input
                      value={editForm.contact_person ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, contact_person: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                    <input
                      value={editForm.phone ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                    <input
                      type="email"
                      value={editForm.email ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div className="sm:col-span-2 border-t border-gray-100 pt-3 mt-1">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Address &amp; map pin</p>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Street / building</label>
                    <input
                      value={editForm.address ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g. 123 Example St., Building A"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                    <input
                      value={editForm.city ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g. Makati"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Province / region</label>
                    <input
                      value={editForm.province ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, province: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g. Metro Manila"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Postal code</label>
                    <input
                      value={editForm.postal_code ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, postal_code: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g. 1200"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Pin on map</label>
                    <p className="text-xs text-gray-500 mb-2">Search or drag the marker. Coordinates save with the supplier.</p>
                    <CompanyMapPicker
                      searchInputId={`supplier-map-${supplier.id}`}
                      lat={supplierCoord(editForm.map_lat)}
                      lng={supplierCoord(editForm.map_lng)}
                      onPositionChange={(la, ln) => setEditForm(f => ({ ...f, map_lat: la, map_lng: ln }))}
                      markerTitle={editForm.name?.trim() || 'Supplier'}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Avg Delivery (days)</label>
                    <input
                      type="number"
                      min="0"
                      value={editForm.payment_terms ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, payment_terms: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="e.g. 14"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                    <select
                      value={editForm.status ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {['Active', 'Under Review', 'Inactive', 'Suspended'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Risk Level</label>
                    <select
                      value={editForm.risk_level ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, risk_level: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      {['Low', 'Medium', 'High'].map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-3 pt-5">
                    <input
                      type="checkbox"
                      id="preferred_edit"
                      checked={editForm.preferred_supplier ?? false}
                      onChange={e => setEditForm(f => ({ ...f, preferred_supplier: e.target.checked }))}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <label htmlFor="preferred_edit" className="text-sm text-gray-700 font-medium">Mark as Preferred Supplier</label>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                    <textarea
                      rows={3}
                      value={editForm.notes ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                      placeholder="Internal notes about this supplier…"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <GitBranch className="w-4 h-4" /> Branch Assignment
                  <span className="text-xs font-normal text-gray-400">(applied on save)</span>
                </h2>
                <div className="space-y-2">
                  {editBranches.length === 0 && <p className="text-sm text-gray-400">No branches assigned.</p>}
                  {editBranches.map(sb => (
                    <div key={sb.branch_id} className="flex items-center justify-between px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                      <span className="text-sm font-medium text-blue-800">
                        {sb.branches?.name ?? '?'}{sb.is_primary ? ' (Primary)' : ''}
                      </span>
                      <button type="button" onClick={() => handleRemoveBranch(sb.branch_id)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {allBranches.filter(b => !editBranches.some(sb => sb.branch_id === b.id)).length > 0 && (
                    <div className="flex gap-2 mt-2">
                      <select
                        id="add-branch-select"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                        defaultValue=""
                      >
                        <option value="" disabled>Add a branch…</option>
                        {allBranches
                          .filter(b => !editBranches.some(sb => sb.branch_id === b.id))
                          .map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const sel = document.getElementById('add-branch-select') as HTMLSelectElement | null;
                          if (sel?.value) {
                            handleAddBranch(sel.value);
                            sel.value = '';
                          }
                        }}
                        className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" /> Add
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" /> Raw Material Assignments
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {supplier.supplier_materials.length === 0 && <p className="text-sm text-gray-400 md:col-span-2">No materials linked yet.</p>}
                  {supplier.supplier_materials.map(sm => (
                    <div
                      key={sm.id}
                      className="flex min-h-[3rem] min-w-0 items-stretch overflow-hidden rounded-lg border border-gray-100 bg-gray-50"
                    >
                      <Link
                        to={`/materials/${sm.material_id}`}
                        className="flex flex-1 min-w-0 items-center gap-3 px-3 py-3 text-inherit no-underline transition-colors hover:bg-gray-100/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500"
                        aria-label={`Open raw material ${sm.raw_materials?.name ?? sm.material_id}`}
                      >
                        <SupplierMaterialThumb
                          imageUrl={sm.raw_materials?.image_url}
                          label={sm.raw_materials?.name ?? 'Raw material'}
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-900">{sm.raw_materials?.name ?? '—'}</div>
                          <div className="text-xs text-gray-500">
                            ₱{sm.unit_price.toLocaleString()}/{sm.raw_materials?.unit_of_measure ?? 'unit'}
                            {' · '}Lead: {sm.lead_time_days}d
                            {' · '}Min: {sm.min_order_qty.toLocaleString()}
                            {sm.is_preferred ? ' · Preferred' : ''}
                          </div>
                        </div>
                      </Link>
                      <button
                        type="button"
                        onClick={() => void handleRemoveMaterial(sm.id)}
                        className="flex-shrink-0 border-l border-gray-200 px-3 text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        aria-label={`Unlink ${sm.raw_materials?.name ?? 'material'}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="border border-dashed border-gray-300 rounded-lg p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Link a New Material</p>
                  <p className="text-xs text-gray-500">Search by category and name or SKU, same as Warehouse movements.</p>
                  {!addMatId ? (
                    <button
                      type="button"
                      onClick={() => setShowAddMaterialPicker(true)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                    >
                      <Search className="w-4 h-4" />
                      Search &amp; select raw material
                    </button>
                  ) : (
                    <div className="rounded-lg border border-gray-200 bg-white p-3 flex items-start gap-3">
                      <SupplierMaterialThumb imageUrl={addMatPreview?.imageUrl} label={addMatPreview?.name ?? 'Material'} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{addMatPreview?.name}</p>
                        <p className="text-xs text-gray-500 font-mono">{addMatPreview?.sku}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{addMatPreview?.unit}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAddMatId('');
                          setAddMatPreview(null);
                          setShowAddMaterialPicker(true);
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex-shrink-0"
                      >
                        Change
                      </button>
                    </div>
                  )}
                  {addMatId && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Unit Price (₱)</label>
                        <input
                          type="number"
                          min="0"
                          value={addMatPrice}
                          onChange={e => setAddMatPrice(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Lead Time (days)</label>
                        <input
                          type="number"
                          min="0"
                          value={addMatLeadTime}
                          onChange={e => setAddMatLeadTime(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Min Order Qty</label>
                        <input
                          type="number"
                          min="1"
                          value={addMatMinQty}
                          onChange={e => setAddMatMinQty(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                          placeholder="1"
                        />
                      </div>
                      <div className="flex items-end pb-2">
                        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={addMatPreferred}
                            onChange={e => setAddMatPreferred(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 rounded"
                          />
                          Preferred source
                        </label>
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleAddMaterial()}
                    disabled={!addMatId}
                    className="w-full py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Link Material
                  </button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <ShoppingCart className="w-5 h-5 text-red-600" />
                Raw material purchase orders
                {exportQueryDates.invalid ? '' : ` — ${filteredPoHistory.length} in ${exportQueryDates.displayLabel}`}
              </CardTitle>
              <p className="text-xs text-gray-500 font-normal mt-1">
                Newest first. Inter-branch transfer POs are tracked under Inter-branch requests, not here.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 border-gray-300 bg-white max-w-[18rem] justify-start"
                aria-haspopup="dialog"
                aria-expanded={exportPeriodModalOpen}
                aria-label="Choose purchase order period"
                onClick={openExportPeriodModal}
              >
                <CalendarRange className="w-4 h-4 shrink-0 text-gray-600" aria-hidden />
                <span className="truncate text-left text-sm font-normal">
                  {periodTriggerLabel(exportPeriodKind, exportCustomStart, exportCustomEnd)}
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 border-gray-300 bg-white"
                disabled={exportingSupplier || exportQueryDates.invalid}
                onClick={() => void handleExportSupplier()}
              >
                {exportingSupplier ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                ) : (
                  <Download className="w-4 h-4" aria-hidden />
                )}
                {exportingSupplier ? 'Exporting…' : 'Export'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {poHistoryLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            </div>
          ) : poHistoryError ? (
            <p className="text-sm text-red-600 py-4">{poHistoryError}</p>
          ) : poHistory.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">No purchase orders recorded for this supplier yet.</p>
          ) : filteredPoHistory.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">No purchase orders match the selected date range.</p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full min-w-[640px] text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    <th className="px-3 py-3">PO #</th>
                    <th className="px-3 py-3 whitespace-nowrap">Branch</th>
                    <th className="px-3 py-3 whitespace-nowrap">Order date</th>
                    <th className="px-3 py-3 whitespace-nowrap">Expected</th>
                    <th className="px-3 py-3 whitespace-nowrap">Delivered</th>
                    <th className="px-3 py-3 text-center whitespace-nowrap">Lines</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap">Total</th>
                    <th className="px-3 py-3 text-center whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPoHistory.map(po => {
                    const poTo = `/purchase-orders/${po.id}`;
                    return (
                      <tr
                        key={po.id}
                        className="border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500"
                        onClick={() => navigate(poTo)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            navigate(poTo);
                          }
                        }}
                        tabIndex={0}
                        role="link"
                        aria-label={`Open purchase order ${po.po_number}`}
                      >
                        <td className="px-3 py-3 min-w-0 font-medium text-red-700 truncate" title={po.po_number}>
                          {po.po_number}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-gray-700">{po.branches?.name ?? '—'}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-gray-700">{formatPoDate(po.order_date)}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-gray-700">{formatPoDate(po.expected_delivery_date)}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-gray-700">{formatPoDate(po.actual_delivery_date)}</td>
                        <td className="px-3 py-3 text-center tabular-nums text-gray-900">{po.purchase_order_items.length}</td>
                        <td className="px-3 py-3 text-right font-medium tabular-nums text-gray-900 whitespace-nowrap">
                          {formatCurrency(Number(po.total_amount) || 0)}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <Badge variant={poHistoryStatusVariant(po.status)} className="text-[10px] sm:text-xs whitespace-nowrap">
                            {po.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredPoHistory.length > TABLE_PAGE_SIZE && (
                <TablePagination
                  page={safePoTablePage}
                  total={filteredPoHistory.length}
                  onPageChange={setPoTablePage}
                  className="-mx-1 rounded-b-lg"
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {exportPeriodModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40"
          role="presentation"
          onClick={() => setExportPeriodModalOpen(false)}
        >
          <div
            className="bg-white w-full sm:max-w-lg sm:rounded-xl shadow-xl max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="supplier-export-period-modal-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 id="supplier-export-period-modal-title" className="text-lg font-semibold text-gray-900">
                Purchase order period
              </h2>
              <button
                type="button"
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                aria-label="Close"
                onClick={() => setExportPeriodModalOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">
                Choose a preset or custom range. The PO list and export both use this period.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {DATE_PERIOD_OPTIONS.map(({ kind, label }) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => handleExportModalPresetPick(kind)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                      draftExportPeriodKind === kind
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {draftExportPeriodKind === 'custom' && (
                <div className="space-y-2 pt-1 border-t border-gray-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs font-medium text-gray-600 w-full sm:w-auto">From</label>
                    <input
                      type="date"
                      value={draftExportCustomStart}
                      max={maxExportCustomDate}
                      onChange={e => setDraftExportCustomStart(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                    <label className="text-xs font-medium text-gray-600">To</label>
                    <input
                      type="date"
                      value={draftExportCustomEnd}
                      min={draftExportCustomStart || undefined}
                      max={maxExportCustomDate}
                      onChange={e => setDraftExportCustomEnd(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                  {draftExportCustomInvalid && (
                    <p className="text-xs text-red-600">Start must be on or before end.</p>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 p-4 border-t border-gray-200">
              <Button type="button" variant="outline" onClick={() => setExportPeriodModalOpen(false)}>
                Cancel
              </Button>
              {draftExportPeriodKind === 'custom' && (
                <Button
                  type="button"
                  variant="primary"
                  disabled={draftExportCustomInvalid || !draftExportCustomStart || !draftExportCustomEnd}
                  onClick={applyExportModalCustomRange}
                >
                  Apply range
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <RawMaterialPickerModal
        isOpen={showAddMaterialPicker}
        onClose={() => setShowAddMaterialPicker(false)}
        branch={navbarBranch ?? ''}
        alreadyAdded={supplier.supplier_materials.map(sm => sm.material_id)}
        onSelect={m => {
          setAddMatId(m.materialId);
          setAddMatPreview({
            name: m.name,
            sku: m.sku,
            unit: m.unit,
            imageUrl: m.imageUrl,
          });
          setAddMatPrice(m.cost > 0 ? String(m.cost) : '');
          setShowAddMaterialPicker(false);
        }}
      />
    </div>
  );
}
