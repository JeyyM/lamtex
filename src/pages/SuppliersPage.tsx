import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { supabase } from '@/src/lib/supabase';
import {
  Factory,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Clock,
  AlertTriangle,
  Package,
  FileText,
  BarChart3,
  PieChart as PieChartIcon,
  Search,
  Filter,
  Download,
  Plus,
  Edit,
  Eye,
  ShoppingCart,
  Truck,
  Award,
  Shield,
  ChevronDown,
  Loader2,
  RefreshCw,
  X,
  GitBranch,
  Save,
  Trash2,
} from 'lucide-react';
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// ── DB row shapes ──────────────────────────────────────────

interface SupplierMaterialRow {
  id: string;
  material_id: string;
  unit_price: number;
  lead_time_days: number;
  min_order_qty: number;
  is_preferred: boolean;
  notes: string | null;
  raw_materials: { name: string; sku: string; unit_of_measure: string; status: string } | null;
}

interface SupplierBranchRow {
  branch_id: string;
  is_primary: boolean;
  branches: { name: string; code: string } | null;
}

interface SupplierRow {
  id: string;
  name: string;
  type: string;
  category: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  payment_terms: string;
  currency: string;
  status: string;
  performance_score: number;
  quality_rating: number;
  delivery_rating: number;
  avg_lead_time: number;
  on_time_delivery_rate: number;
  defect_rate: number;
  total_purchases_ytd: number;
  total_purchases_lifetime: number;
  order_count: number;
  avg_order_value: number;
  last_purchase_date: string | null;
  account_since: string | null;
  preferred_supplier: boolean;
  risk_level: string;
  notes: string | null;
  created_at: string;
  supplier_branches: SupplierBranchRow[];
  supplier_materials: SupplierMaterialRow[];
}

type ViewMode = 'overview' | 'spending';

export function SuppliersPage() {
  const { branch } = useAppContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const openSupplierId = searchParams.get('supplier');

  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierRow | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterRisk, setFilterRisk] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [resolvedBranchId, setResolvedBranchId] = useState<string | null>(null);

  // ── Edit state ─────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<SupplierRow>>({});
  const [saving, setSaving] = useState(false);
  const [allMaterials, setAllMaterials] = useState<{ id: string; name: string; sku: string; unit_of_measure: string }[]>([]);
  const [allBranches, setAllBranches] = useState<{ id: string; name: string; code: string }[]>([]);
  const [editBranches, setEditBranches] = useState<SupplierBranchRow[]>([]);
  const [addMatId, setAddMatId] = useState('');
  const [addMatPrice, setAddMatPrice] = useState('');
  const [addMatLeadTime, setAddMatLeadTime] = useState('');
  const [addMatMinQty, setAddMatMinQty] = useState('');
  const [addMatPreferred, setAddMatPreferred] = useState(false);

  /** Live aggregates from `purchase_orders` (authoritative for Spending Analysis) */
  const [poSpendBySupplier, setPoSpendBySupplier] = useState<
    Record<string, { ytd: number; ytdN: number; lifetime: number; n: number }>
  >({});

  // ── Fetch ──────────────────────────────────────────────
  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Resolve branch name → id and fetch suppliers in parallel
      const [branchResult, suppliersResult] = await Promise.all([
        branch
          ? supabase.from('branches').select('id').eq('name', branch).single()
          : Promise.resolve({ data: null }),
        supabase
          .from('suppliers')
          .select(`
            *,
            supplier_branches ( branch_id, is_primary, branches ( name, code ) ),
            supplier_materials (
              id, material_id, unit_price, lead_time_days, min_order_qty, is_preferred, notes,
              raw_materials ( name, sku, unit_of_measure, status )
            )
          `)
          .order('preferred_supplier', { ascending: false })
          .order('name', { ascending: true }),
      ]);

      if (suppliersResult.error) throw suppliersResult.error;

      const resolvedId = branchResult.data?.id ?? null;
      const rows = (suppliersResult.data ?? []) as unknown as SupplierRow[];

      console.log('[Suppliers] branch:', branch);
      console.log('[Suppliers] resolvedBranchId:', resolvedId);
      console.log('[Suppliers] total rows fetched:', rows.length);
      console.log('[Suppliers] first row supplier_branches:', rows[0]?.supplier_branches);
      console.log('[Suppliers] branch match test:', rows.map(s => ({
        name: s.name,
        branchIds: s.supplier_branches.map(sb => sb.branch_id),
        matches: s.supplier_branches.some(sb => sb.branch_id === resolvedId),
      })));

      setResolvedBranchId(resolvedId);
      setSuppliers(rows);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, [branch]);

  useEffect(() => { fetchSuppliers(); }, [fetchSuppliers]);

  // Deep link: /suppliers?supplier=<uuid> (e.g. from raw material analytics)
  useEffect(() => {
    if (!openSupplierId || loading) return;
    const s = suppliers.find(x => x.id === openSupplierId);
    if (s) {
      setSelectedSupplier(s);
      setViewMode('overview');
    }
  }, [openSupplierId, loading, suppliers]);

  // Keep detail panel in sync after every fetch
  useEffect(() => {
    if (selectedSupplier) {
      const updated = suppliers.find(s => s.id === selectedSupplier.id);
      if (updated) setSelectedSupplier(updated);
    }
  }, [suppliers]);

  const EXCLUDED_PO_FOR_SPEND = ['Draft', 'Requested', 'Rejected', 'Cancelled'] as const;

  const fetchPOSpendBySupplier = useCallback(async (branchId: string | null) => {
    try {
      let q = supabase
        .from('purchase_orders')
        .select('supplier_id, total_amount, order_date, status, branch_id')
        .not('supplier_id', 'is', null);
      if (branchId) {
        q = q.eq('branch_id', branchId);
      }
      const { data, error } = await q;
      if (error) throw error;
      const year      = new Date().getFullYear();
      const yearStart = `${year}-01-01`;
      const ex        = new Set<string>(EXCLUDED_PO_FOR_SPEND);
      const map: Record<string, { ytd: number; ytdN: number; lifetime: number; n: number }> = {};
      for (const row of (data ?? []) as Array<{
        supplier_id: string;
        total_amount: number;
        order_date: string;
        status: string;
      }>) {
        if (ex.has(row.status)) continue;
        const sid = row.supplier_id;
        if (!map[sid]) map[sid] = { ytd: 0, ytdN: 0, lifetime: 0, n: 0 };
        const amt = Number(row.total_amount) || 0;
        map[sid].lifetime += amt;
        map[sid].n += 1;
        const od = row.order_date?.slice(0, 10) ?? '';
        if (od >= yearStart) {
          map[sid].ytd += amt;
          map[sid].ytdN += 1;
        }
      }
      setPoSpendBySupplier(map);
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[Suppliers] PO spend aggregate', e);
      setPoSpendBySupplier({});
    }
  }, []);

  // Load PO-based spend for Spending Analysis (and keep in sync with branch filter)
  useEffect(() => {
    if (loading) return;
    void fetchPOSpendBySupplier(resolvedBranchId);
  }, [loading, resolvedBranchId, fetchPOSpendBySupplier]);

  // ── Edit handlers ──────────────────────────────────────
  const fetchEditResources = useCallback(async () => {
    const [mats, branches] = await Promise.all([
      supabase.from('raw_materials').select('id, name, sku, unit_of_measure').order('name'),
      supabase.from('branches').select('id, name, code').eq('is_active', true).order('name'),
    ]);
    setAllMaterials((mats.data ?? []) as any);
    setAllBranches((branches.data ?? []) as any);
  }, []);

  const handleStartEdit = () => {
    if (!selectedSupplier) return;
    setEditForm({ ...selectedSupplier });
    setEditBranches([...selectedSupplier.supplier_branches]);
    setIsEditing(true);
    fetchEditResources();
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({});
    setEditBranches([]);
    setAddMatId('');
    setAddMatPrice('');
    setAddMatLeadTime('');
    setAddMatMinQty('');
    setAddMatPreferred(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedSupplier) return;
    setSaving(true);
    try {
      // Save core supplier fields
      const { error: supplierError } = await supabase.from('suppliers').update({
        name:               editForm.name,
        type:               editForm.type,
        category:           editForm.category,
        contact_person:     editForm.contact_person,
        phone:              editForm.phone,
        email:              editForm.email,
        payment_terms:      editForm.payment_terms,
        currency:           'PHP',
        status:             editForm.status,
        risk_level:         editForm.risk_level,
        preferred_supplier: editForm.preferred_supplier,
        notes:              editForm.notes,
      }).eq('id', selectedSupplier.id);
      if (supplierError) throw supplierError;

      // Commit staged branch changes
      const originalIds = selectedSupplier.supplier_branches.map(sb => sb.branch_id);
      const newIds      = editBranches.map(sb => sb.branch_id);
      const toRemove    = originalIds.filter(id => !newIds.includes(id));
      const toAdd       = editBranches.filter(sb => !originalIds.includes(sb.branch_id));

      if (toRemove.length > 0) {
        const { error } = await supabase.from('supplier_branches')
          .delete()
          .eq('supplier_id', selectedSupplier.id)
          .in('branch_id', toRemove);
        if (error) throw error;
      }
      for (const sb of toAdd) {
        const { error } = await supabase.from('supplier_branches').insert({
          supplier_id: selectedSupplier.id,
          branch_id:   sb.branch_id,
          is_primary:  sb.is_primary,
        });
        if (error) throw error;
      }

      await fetchSuppliers();
      setIsEditing(false);
      setEditForm({});
      setEditBranches([]);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMaterial = async (smId: string) => {
    const { error } = await supabase.from('supplier_materials').delete().eq('id', smId);
    if (error) { alert(error.message); return; }
    await fetchSuppliers();
  };

  const handleAddMaterial = async () => {
    if (!selectedSupplier || !addMatId) return;
    const alreadyLinked = selectedSupplier.supplier_materials.some(sm => sm.material_id === addMatId);
    if (alreadyLinked) { alert('This material is already linked to this supplier.'); return; }
    const { error } = await supabase.from('supplier_materials').insert({
      supplier_id:    selectedSupplier.id,
      material_id:    addMatId,
      unit_price:     parseFloat(addMatPrice) || 0,
      lead_time_days: parseInt(addMatLeadTime) || 0,
      min_order_qty:  parseInt(addMatMinQty) || 1,
      is_preferred:   addMatPreferred,
    });
    if (error) { alert(error.message); return; }
    setAddMatId('');
    setAddMatPrice('');
    setAddMatLeadTime('');
    setAddMatMinQty('');
    setAddMatPreferred(false);
    await fetchSuppliers();
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
        branch_id:  branchId,
        is_primary: prev.length === 0,
        branches:   { name: branchInfo.name, code: branchInfo.code },
      },
    ]);
  };

  // ── Derived / filtered data ────────────────────────────
  const branchFilteredSuppliers = suppliers.filter(s => {
    if (!branch) return true;
    if (s.supplier_branches.length === 0) return true;
    if (resolvedBranchId) {
      return s.supplier_branches.some(sb => sb.branch_id === resolvedBranchId);
    }
    // Fallback: nested join name match (if PostgREST resolves it)
    return s.supplier_branches.some(sb => sb.branches?.name === branch);
  });

  const filteredSuppliers = branchFilteredSuppliers.filter(s => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(q) ||
      (s.contact_person ?? '').toLowerCase().includes(q) ||
      (s.category ?? '').toLowerCase().includes(q);
    const matchesType   = filterType   === 'All' || s.type      === filterType;
    const matchesRisk   = filterRisk   === 'All' || s.risk_level === filterRisk;
    const matchesStatus = filterStatus === 'All' || s.status     === filterStatus;
    return matchesSearch && matchesType && matchesRisk && matchesStatus;
  });

  /** YTD = calendar year; uses purchase_orders when available, else `suppliers.total_purchases_ytd`. */
  const totalYTD = useMemo(() => {
    return filteredSuppliers.reduce((sum, s) => {
      const a = poSpendBySupplier[s.id];
      if (a && a.n > 0) return sum + a.ytd;
      return sum + s.total_purchases_ytd;
    }, 0);
  }, [filteredSuppliers, poSpendBySupplier]);

  const getSpend = (s: SupplierRow) => {
    const a = poSpendBySupplier[s.id];
    if (a && a.n > 0) {
      return {
        ytd: a.ytd,
        lifetime: a.lifetime,
        orderCount: a.n,
        ytdOrderCount: a.ytdN,
        avgOrder: a.n > 0 ? a.lifetime / a.n : 0,
        fromPO: true as const,
      };
    }
    return {
      ytd: s.total_purchases_ytd,
      lifetime: s.total_purchases_lifetime,
      orderCount: s.order_count,
      ytdOrderCount: 0,
      avgOrder: s.avg_order_value,
      fromPO: false as const,
    };
  };

  // ── Helpers ────────────────────────────────────────────
  /*
   * [REVISIT — performance metrics]
   * Previously: `supplierPerformance` (chart data from performance_score, on_time_delivery_rate,
   * quality_rating, defect_rate, avg_lead_time), `avgPerf` (quick stat "Avg Performance"),
   * `getPerformanceColor`, and the `renderStars` helper (see git history) powered the
   * "Performance Metrics" tab, overview card rows, and the detail "Performance" section.
   * Restore when you want to surface scores / star ratings in the UI again; DB fields remain on `suppliers`.
   */

  const getRiskColor = (risk: string): 'success' | 'warning' | 'danger' => {
    if (risk === 'Low')    return 'success';
    if (risk === 'Medium') return 'warning';
    return 'danger';
  };

  const getStatusColor = (status: string): 'success' | 'warning' | 'danger' | 'neutral' => {
    if (status === 'Active')       return 'success';
    if (status === 'Under Review') return 'warning';
    if (status === 'Inactive')     return 'neutral';
    return 'danger'; // Suspended
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'Raw Materials': return { bg: 'bg-blue-100',   icon: 'text-blue-600'   };
      case 'Chemicals':     return { bg: 'bg-purple-100', icon: 'text-purple-600' };
      case 'Packaging':     return { bg: 'bg-orange-100', icon: 'text-orange-600' };
      case 'Equipment':     return { bg: 'bg-red-100',    icon: 'text-red-600'    };
      case 'Services':      return { bg: 'bg-green-100',  icon: 'text-green-600'  };
      default:              return { bg: 'bg-gray-100',   icon: 'text-gray-600'   };
    }
  };

  /** Formats money in Philippine peso (₱); uses millions only when |amount| ≥ 1M. */
  const formatCurrency = (amount: number) => {
    if (amount == null || Number.isNaN(amount)) return '—';
    const n = Number(amount);
    if (n === 0) return '₱0';
    if (Math.abs(n) < 1_000_000) {
      return `₱${n.toLocaleString('en-PH', { maximumFractionDigits: 0, minimumFractionDigits: 0 })}`;
    }
    return `₱${(n / 1_000_000).toFixed(2)}M`;
  };

  const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6'];

  // ── Loading / Error ────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-red-500 mx-auto" />
          <p className="mt-4 text-gray-500">Loading suppliers…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
          <p className="text-gray-800 font-semibold mb-1">Failed to load suppliers</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <Button variant="outline" onClick={fetchSuppliers} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 min-w-0 max-w-full">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Supplier Management</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Procurement partners for{' '}
            <span className="font-medium text-gray-700">{branch || 'all branches'}</span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/reports')} className="gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Procurement Reports</span>
            <span className="sm:hidden">Reports</span>
          </Button>
          <Button variant="primary" className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add New Supplier</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* ── Quick Stats ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 2xl:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Total Suppliers</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">{branchFilteredSuppliers.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg"><Factory className="w-6 h-6 text-blue-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Preferred</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                  {branchFilteredSuppliers.filter(s => s.preferred_supplier).length}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg"><Award className="w-6 h-6 text-green-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">YTD Spending</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(branchFilteredSuppliers.reduce((s, x) => s + x.total_purchases_ytd, 0))}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg"><DollarSign className="w-6 h-6 text-orange-600" /></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm text-gray-500">Total Orders YTD</p>
                <p className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
                  {branchFilteredSuppliers.reduce((s, x) => s + x.order_count, 0)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg"><ShoppingCart className="w-6 h-6 text-purple-600" /></div>
            </div>
          </CardContent>
        </Card>
        {/*
         * [REVISIT — Avg Performance quick stat] Was the 5th card (avg of supplier.performance_score). Restore with performance metrics tab.
         */}
      </div>

      {/* ── Tabs — Desktop ───────────────────────────────── */}
      <div className="hidden md:block border-b border-gray-200">
        <nav className="flex gap-8">
          {[
            { id: 'overview',  label: 'Supplier Overview',  icon: <Factory className="w-4 h-4" /> },
            { id: 'spending',  label: 'Spending Analysis',  icon: <DollarSign className="w-4 h-4" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id as ViewMode)}
              className={`flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                viewMode === tab.id
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tabs — Mobile ────────────────────────────────── */}
      <div className="md:hidden relative">
          <select
            value={viewMode}
          onChange={e => setViewMode(e.target.value as ViewMode)}
            className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg text-sm font-medium focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none appearance-none bg-white"
          >
            <option value="overview">Supplier Overview</option>
            <option value="spending">Spending Analysis</option>
          </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>

      {/* ══════════════════════════════════════════════════ */}
      {/* SUPPLIER OVERVIEW                                 */}
      {/* ══════════════════════════════════════════════════ */}
      {viewMode === 'overview' && (
        <div className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by name, contact, or category…"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <select
                    value={filterType}
                    onChange={e => setFilterType(e.target.value)}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                  >
                    <option value="All">All Types</option>
                    <option value="Raw Materials">Raw Materials</option>
                    <option value="Chemicals">Chemicals</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Equipment">Equipment</option>
                    <option value="Services">Services</option>
                  </select>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    value={filterRisk}
                    onChange={e => setFilterRisk(e.target.value)}
                    className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                  >
                    <option value="All">All Risk Levels</option>
                    <option value="Low">Low Risk</option>
                    <option value="Medium">Medium Risk</option>
                    <option value="High">High Risk</option>
                  </select>
                  <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Under Review">Under Review</option>
                  </select>
                  <Button variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Supplier Cards */}
          {filteredSuppliers.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Factory className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No suppliers match your filters.</p>
              </CardContent>
            </Card>
          ) : (
          <div className="grid grid-cols-1 gap-4">
              {filteredSuppliers.map(supplier => {
                const ts = getTypeStyle(supplier.type);
                const branchNames = supplier.supplier_branches
                  .map(sb => sb.branches?.name ?? '?')
                  .join(', ');
                const materialCount = supplier.supplier_materials.length;

                return (
              <Card key={supplier.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4 sm:p-6">
                      {/* Top row */}
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg flex-shrink-0 ${ts.bg}`}>
                          <Factory className={`w-6 h-6 ${ts.icon}`} />
                      </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h3 className="text-base sm:text-lg font-bold text-gray-900">{supplier.name}</h3>
                            {supplier.preferred_supplier && (
                                  <Badge variant="success">
                                <Award className="w-3 h-3 mr-1" />Preferred
                                  </Badge>
                                )}
                                <Badge variant={getStatusColor(supplier.status)}>{supplier.status}</Badge>
                            <Badge variant={getRiskColor(supplier.risk_level)}>{supplier.risk_level} Risk</Badge>
                              </div>
                          <p className="text-sm text-gray-500">
                            {supplier.type} · {supplier.category ?? '—'}
                          </p>
                          {branchNames && (
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                              <GitBranch className="w-3 h-3" /> {branchNames}
                            </p>
                          )}
                            </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button variant="outline" size="sm" onClick={() => setSelectedSupplier(supplier)}>
                            <Eye className="w-4 h-4 sm:mr-1" />
                            <span className="hidden sm:inline">View</span>
                        </Button>
                      </div>
                    </div>

                      {/* Info grid */}
                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div>
                            <div className="text-gray-500 text-xs">Contact</div>
                            <div className="text-gray-900 truncate">{supplier.contact_person ?? '—'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div>
                            <div className="text-gray-500 text-xs">Phone</div>
                            <div className="text-gray-900 truncate">{supplier.phone ?? '—'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div>
                            <div className="text-gray-500 text-xs">Avg Delivery</div>
                            <div className="text-gray-900">{supplier.payment_terms ? `${supplier.payment_terms.replace(/[^0-9]/g, '')} days` : '—'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <div>
                            <div className="text-gray-500 text-xs">Materials Linked</div>
                            <div className="text-gray-900">{materialCount}</div>
                        </div>
                      </div>
                    </div>

                      {/* Financial summary (performance score / quality / on-time / defect UI removed — [REVISIT] with Performance Metrics tab) */}
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">YTD Spending</div>
                        <div className="text-sm font-bold text-blue-600">
                              {formatCurrency(supplier.total_purchases_ytd)}
                        </div>
                      </div>
                      <div>
                            <div className="text-xs text-gray-500 mb-1">Orders YTD</div>
                            <div className="text-sm font-bold text-gray-900">{supplier.order_count}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Avg Order Value</div>
                        <div className="text-sm font-bold text-green-600">
                              {supplier.avg_order_value > 0 ? formatCurrency(supplier.avg_order_value) : '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Last Purchase</div>
                            <div className="text-sm font-medium text-gray-900">
                              {supplier.last_purchase_date ?? 'Never'}
                      </div>
                    </div>
                        </div>

                        {supplier.notes && (
                          <p className="mt-3 text-xs text-gray-500 italic border-l-2 border-gray-200 pl-2">{supplier.notes}</p>
                        )}
              </div>
            </CardContent>
          </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/*
       * [REVISIT] Full "Performance Metrics" tab was here: BarCharts (comparison, lead time, defect rate),
       * `supplierPerformance` data, and the detailed performance table. See git history to restore. DB columns unchanged.
       */}

      {/* ══════════════════════════════════════════════════ */}
      {/* SPENDING ANALYSIS                                 */}
      {/* ══════════════════════════════════════════════════ */}
      {viewMode === 'spending' && (() => {
        const ytdLabelYear = new Date().getFullYear();
        const pieTypeData   = ['Raw Materials', 'Chemicals', 'Packaging', 'Equipment', 'Services'].map(t => ({
          name: t,
          value: filteredSuppliers.filter(s => s.type === t).reduce((sum, s) => sum + getSpend(s).ytd, 0),
        })).filter(d => d.value > 0);
        const sortedByYtd   = [...filteredSuppliers].sort((a, b) => getSpend(b).ytd - getSpend(a).ytd);
        const tableRows     = sortedByYtd;
        const sumYtd        = tableRows.reduce((s, r) => s + getSpend(r).ytd, 0);
        const sumLifetime   = tableRows.reduce((s, r) => s + getSpend(r).lifetime, 0);
        const sumOrders     = tableRows.reduce((s, r) => s + getSpend(r).orderCount, 0);
        return (
        <div className="space-y-6 min-w-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
            <Card className="min-w-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-red-600" />
                  Spending by supplier type (YTD {ytdLabelYear})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pieTypeData.length === 0 ? (
                  <div className="h-[300px] flex flex-col items-center justify-center text-gray-400 text-sm">
                    <PieChartIcon className="w-10 h-10 mb-2 opacity-40" />
                    No YTD spend in the current filters — add or receive purchase orders to see a breakdown.
                  </div>
                ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                        data={pieTypeData}
                        cx="50%" cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={90} dataKey="value"
                    >
                        {pieTypeData.map((_, i) => (
                          <Cell key={pieTypeData[i].name} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card className="min-w-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-red-600" />
                  Top suppliers by YTD spending ({ytdLabelYear})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sortedByYtd.length === 0 || totalYTD === 0 ? (
                  <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">No YTD spend to rank yet.</div>
                ) : (
                <div className="space-y-4">
                    {sortedByYtd
                      .filter(s => getSpend(s).ytd > 0)
                      .slice(0, 6)
                      .map((s, i) => {
                        const y = getSpend(s).ytd;
                        const pct = totalYTD > 0 ? (y / totalYTD) * 100 : 0;
                      return (
                          <div key={s.id}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold text-xs flex-shrink-0">{i + 1}</div>
                                <span className="font-medium text-gray-900 truncate">{s.name}</span>
                                {getSpend(s).fromPO && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 flex-shrink-0">PO</span>
                                )}
                              </div>
                              <span className="font-bold text-gray-900 flex-shrink-0 ml-2">{formatCurrency(y)}</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full bg-red-600" style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="min-w-0">
            <CardHeader>
              <CardTitle>Supplier spending summary</CardTitle>
              <p className="text-xs text-gray-500 font-normal mt-1">
                Sorted by YTD ({ytdLabelYear}). Avg order = lifetime spend ÷ PO count when sourced from purchase orders.
              </p>
            </CardHeader>
            <CardContent className="min-w-0">
              <div className="w-full min-w-0 max-w-full">
                <table className="w-full max-w-full table-auto border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-3 align-middle min-w-0 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                      <th className="w-0 px-3 py-3 align-middle text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Type</th>
                      <th className="w-0 px-3 py-3 align-middle text-center text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Status</th>
                      <th className="w-0 px-1.5 sm:px-2 py-3 align-middle text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">YTD</th>
                      <th className="w-0 px-1.5 sm:px-2 py-3 align-middle text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Lifetime</th>
                      <th className="w-0 px-1.5 sm:px-2 py-3 align-middle text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">POs</th>
                      <th className="w-0 px-2 sm:px-3 py-3 align-middle text-right text-xs font-medium text-gray-500 uppercase whitespace-nowrap">Avg order</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tableRows.map(s => {
                      const sp = getSpend(s);
                      return (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3 align-middle min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <Factory className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-gray-900 truncate" title={s.name}>{s.name}</div>
                                {s.preferred_supplier && <Badge variant="success" className="text-xs mt-1">Preferred</Badge>}
                              </div>
                            </div>
                          </td>
                          <td className="w-0 px-3 py-3 align-middle text-sm text-gray-600 whitespace-nowrap" title={s.type}>
                            {s.type}
                          </td>
                          <td className="w-0 px-3 py-3 align-middle text-center whitespace-nowrap">
                            <Badge variant={getStatusColor(s.status)}>{s.status}</Badge>
                          </td>
                          <td className="w-0 px-1.5 sm:px-2 py-3 align-middle whitespace-nowrap text-right text-sm font-bold text-blue-600 tabular-nums">
                            {formatCurrency(sp.ytd)}
                          </td>
                          <td className="w-0 px-1.5 sm:px-2 py-3 align-middle whitespace-nowrap text-right text-sm font-medium text-gray-900 tabular-nums">
                            {formatCurrency(sp.lifetime)}
                          </td>
                          <td className="w-0 px-1.5 sm:px-2 py-3 align-middle text-right text-sm text-gray-900 tabular-nums">
                            {sp.orderCount}
                            {sp.fromPO && sp.ytdOrderCount > 0 && sp.ytdOrderCount !== sp.orderCount && (
                              <span className="block text-[10px] text-gray-400 leading-tight">{sp.ytdOrderCount} in {ytdLabelYear}</span>
                            )}
                          </td>
                          <td className="w-0 px-2 sm:px-3 py-3 align-middle whitespace-nowrap text-right text-sm font-medium text-green-600 tabular-nums">
                            {sp.avgOrder > 0 ? formatCurrency(sp.avgOrder) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 border-t-2 border-gray-200 font-semibold text-sm">
                      <td className="px-3 py-3 align-middle text-gray-800" colSpan={3}>
                        Total ({tableRows.length} suppliers in view)
                      </td>
                      <td className="w-0 px-1.5 sm:px-2 py-3 align-middle text-right text-sm text-blue-700 tabular-nums whitespace-nowrap">
                        {formatCurrency(sumYtd)}
                      </td>
                      <td className="w-0 px-1.5 sm:px-2 py-3 align-middle text-right text-sm text-gray-900 tabular-nums whitespace-nowrap">
                        {formatCurrency(sumLifetime)}
                      </td>
                      <td className="w-0 px-1.5 sm:px-2 py-3 align-middle text-right text-sm text-gray-900 tabular-nums whitespace-nowrap">
                        {sumOrders}
                      </td>
                      <td className="w-0 px-2 sm:px-3 py-3 align-middle min-w-0 text-right text-[11px] sm:text-xs text-gray-500 font-normal leading-snug break-words max-w-[12rem] sm:max-w-[14rem]">
                        {sumOrders > 0 ? (
                          <>
                            <span className="block font-medium text-gray-600">Blended avg</span>
                            <span className="text-gray-500">≈ {formatCurrency(sumLifetime / sumOrders)} · all rows</span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════ */}
      {/* SUPPLIER DETAIL PANEL                             */}
      {/* ══════════════════════════════════════════════════ */}
      {selectedSupplier && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

            {/* ── Panel Header ── */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${getTypeStyle(isEditing ? (editForm.type ?? selectedSupplier.type) : selectedSupplier.type).bg}`}>
                  <Factory className={`w-5 h-5 ${getTypeStyle(isEditing ? (editForm.type ?? selectedSupplier.type) : selectedSupplier.type).icon}`} />
                </div>
                <div>
                  {isEditing
                    ? <input
                        value={editForm.name ?? ''}
                        onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                        className="text-lg font-bold text-gray-900 border-b border-indigo-400 focus:outline-none bg-transparent w-64"
                      />
                    : <h2 className="text-lg font-bold text-gray-900">{selectedSupplier.name}</h2>
                  }
                  <p className="text-sm text-gray-500">
                    {isEditing ? (editForm.type ?? selectedSupplier.type) : selectedSupplier.type}
                    {' · '}
                    {isEditing ? (editForm.category || '—') : (selectedSupplier.category ?? '—')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSaveEdit}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={handleCancelEdit} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleStartEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                )}
                <button
                  onClick={() => { setSelectedSupplier(null); setIsEditing(false); setEditForm({}); }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">

              {/* ── VIEW MODE ── */}
              {!isEditing && (
                <>
                  {/* Status badges */}
                  <div className="flex flex-wrap gap-2">
                    {selectedSupplier.preferred_supplier && <Badge variant="success"><Award className="w-3 h-3 mr-1" />Preferred Supplier</Badge>}
                    <Badge variant={getStatusColor(selectedSupplier.status)}>{selectedSupplier.status}</Badge>
                    <Badge variant={getRiskColor(selectedSupplier.risk_level)}>{selectedSupplier.risk_level} Risk</Badge>
                          </div>

                  {/* Contact info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { icon: <User className="w-4 h-4 text-gray-400" />,     label: 'Contact Person', value: selectedSupplier.contact_person },
                      { icon: <Phone className="w-4 h-4 text-gray-400" />,    label: 'Phone',          value: selectedSupplier.phone },
                      { icon: <Mail className="w-4 h-4 text-gray-400" />,     label: 'Email',          value: selectedSupplier.email },
                      { icon: <MapPin className="w-4 h-4 text-gray-400" />,   label: 'Location',       value: 'To be set via Google Maps' },
                      { icon: <Clock className="w-4 h-4 text-gray-400" />,    label: 'Avg Delivery',   value: selectedSupplier.payment_terms ? `${selectedSupplier.payment_terms.replace(/[^0-9]/g, '')} days` : '—' },
                      { icon: <Calendar className="w-4 h-4 text-gray-400" />, label: 'Member Since',   value: selectedSupplier.account_since ?? '—' },
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

                  {/* Branches */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <GitBranch className="w-4 h-4" /> Assigned Branches
                    </h3>
                    {selectedSupplier.supplier_branches.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedSupplier.supplier_branches.map(sb => (
                          <span key={sb.branch_id} className={`px-3 py-1 rounded-full text-xs font-medium border ${sb.is_primary ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                            {sb.branches?.name ?? '?'}{sb.is_primary ? ' (Primary)' : ''}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No branches assigned. Click Edit to assign.</p>
                    )}
                  </div>

                  {/* Financials */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Financial Summary</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        { label: 'YTD Spending',    value: formatCurrency(selectedSupplier.total_purchases_ytd), color: 'text-blue-600' },
                        { label: 'Lifetime Spend',  value: formatCurrency(selectedSupplier.total_purchases_lifetime), color: 'text-gray-900' },
                        { label: 'Order Count',     value: String(selectedSupplier.order_count), color: 'text-gray-900' },
                        { label: 'Avg Order Value', value: selectedSupplier.avg_order_value > 0 ? formatCurrency(selectedSupplier.avg_order_value) : '—', color: 'text-green-600' },
                        { label: 'Last Purchase',   value: selectedSupplier.last_purchase_date ?? 'Never', color: 'text-gray-900' },
                        { label: 'Materials Linked', value: String(selectedSupplier.supplier_materials.length), color: 'text-purple-600' },
                      ].map(item => (
                        <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                          <div className={`text-sm font-bold ${item.color}`}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* [REVISIT] Detail "Performance" block (score, on-time bars, quality/delivery stars, defect %) — see git history */}

                  {/* Linked Materials */}
                  {selectedSupplier.supplier_materials.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Linked Raw Materials</h3>
                      <div className="space-y-2">
                        {selectedSupplier.supplier_materials.map(sm => (
                          <div key={sm.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-gray-400" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{sm.raw_materials?.name ?? '—'}</div>
                                <div className="text-xs text-gray-500">{sm.raw_materials?.sku} · Lead: {sm.lead_time_days}d · Min: {sm.min_order_qty.toLocaleString()} {sm.raw_materials?.unit_of_measure}</div>
                          </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-gray-900">₱{sm.unit_price.toLocaleString()}/{sm.raw_materials?.unit_of_measure ?? 'unit'}</div>
                              {sm.is_preferred && <Badge variant="success" className="text-xs">Preferred</Badge>}
                            </div>
                          </div>
                        ))}
              </div>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedSupplier.notes && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-2">Notes</h3>
                      <p className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-3">{selectedSupplier.notes}</p>
              </div>
                  )}
                </>
              )}

              {/* ── EDIT MODE ── */}
              {isEditing && (
                <>
                  {/* Basic Details */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Basic Details</h3>
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

                  {/* Branch Assignment */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <GitBranch className="w-4 h-4" /> Branch Assignment
                      <span className="text-xs font-normal text-gray-400">(applied on save)</span>
                    </h3>
                    <div className="space-y-2">
                      {editBranches.length === 0 && (
                        <p className="text-sm text-gray-400">No branches assigned.</p>
                      )}
                      {editBranches.map(sb => (
                        <div key={sb.branch_id} className="flex items-center justify-between px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                          <span className="text-sm font-medium text-blue-800">
                            {sb.branches?.name ?? '?'}{sb.is_primary ? ' (Primary)' : ''}
                          </span>
                          <button
                            onClick={() => handleRemoveBranch(sb.branch_id)}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {/* Add branch */}
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
                              .map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                          </select>
                          <button
                            onClick={() => {
                              const sel = document.getElementById('add-branch-select') as HTMLSelectElement;
                              if (sel.value) { handleAddBranch(sel.value); sel.value = ''; }
                            }}
                            className="px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 flex items-center gap-1"
                          >
                            <Plus className="w-4 h-4" /> Add
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Material Assignment */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4" /> Raw Material Assignments
                    </h3>
                    <div className="space-y-2 mb-4">
                      {selectedSupplier.supplier_materials.length === 0 && (
                        <p className="text-sm text-gray-400">No materials linked yet.</p>
                      )}
                      {selectedSupplier.supplier_materials.map(sm => (
                        <div key={sm.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{sm.raw_materials?.name ?? '—'}</div>
                            <div className="text-xs text-gray-500">
                              ₱{sm.unit_price.toLocaleString()}/{sm.raw_materials?.unit_of_measure ?? 'unit'}
                              {' · '}Lead: {sm.lead_time_days}d
                              {' · '}Min: {sm.min_order_qty.toLocaleString()}
                              {sm.is_preferred ? ' · Preferred' : ''}
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveMaterial(sm.id)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add new material form */}
                    <div className="border border-dashed border-gray-300 rounded-lg p-4 space-y-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Link a New Material</p>
                      <select
                        value={addMatId}
                        onChange={e => setAddMatId(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Select raw material…</option>
                        {allMaterials
                          .filter(m => !selectedSupplier.supplier_materials.some(sm => sm.material_id === m.id))
                          .map(m => <option key={m.id} value={m.id}>{m.name} ({m.sku})</option>)}
                      </select>
                      {addMatId && (
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Unit Price (₱)</label>
                            <input
                              type="number" min="0" value={addMatPrice}
                              onChange={e => setAddMatPrice(e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Lead Time (days)</label>
                            <input
                              type="number" min="0" value={addMatLeadTime}
                              onChange={e => setAddMatLeadTime(e.target.value)}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Min Order Qty</label>
                            <input
                              type="number" min="1" value={addMatMinQty}
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
                        onClick={handleAddMaterial}
                        disabled={!addMatId}
                        className="w-full py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Link Material
                      </button>
                    </div>
                  </div>
                </>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
