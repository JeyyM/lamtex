import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { StatKpiCard } from '@/src/components/ui/StatKpiCard';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { supabase } from '@/src/lib/supabase';
import {
  downloadSuppliersWorkbook,
  fetchSuppliersExportBundle,
} from '@/src/lib/suppliersExport';
import { SUPPLIER_DETAIL_SELECT, type SupplierRow } from '@/src/pages/supplierModel';
import {
  Factory,
  User,
  Phone,
  DollarSign,
  Clock,
  AlertTriangle,
  Package,
  PieChart as PieChartIcon,
  Search,
  Download,
  Plus,
  ShoppingCart,
  Award,
  ChevronDown,
  Loader2,
  RefreshCw,
  GitBranch,
} from 'lucide-react';
import {
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

type ViewMode = 'overview' | 'spending';

export function SuppliersPage() {
  const { branch, addAuditLog } = useAppContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const legacyOpenSupplierId = searchParams.get('supplier');

  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterRisk, setFilterRisk] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [resolvedBranchId, setResolvedBranchId] = useState<string | null>(null);

  /** Live aggregates from `purchase_orders` (authoritative for Spending Analysis) */
  const [poSpendBySupplier, setPoSpendBySupplier] = useState<
    Record<string, { ytd: number; ytdN: number; lifetime: number; n: number }>
  >({});

  const [exportingSuppliers, setExportingSuppliers] = useState(false);

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
          .select(SUPPLIER_DETAIL_SELECT)
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

  /** Old deep links: /suppliers?supplier=<uuid> */
  useEffect(() => {
    if (!legacyOpenSupplierId) return;
    navigate(`/suppliers/${legacyOpenSupplierId}`, { replace: true });
  }, [legacyOpenSupplierId, navigate]);

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

  const handleExportSuppliers = async () => {
    if (exportingSuppliers || filteredSuppliers.length === 0) return;
    setExportingSuppliers(true);
    try {
      const bundle = await fetchSuppliersExportBundle(filteredSuppliers.map((s) => s.id));
      await downloadSuppliersWorkbook({
        branchLabel: branch ?? 'All branches',
        suppliers: bundle.suppliers,
        materials: bundle.materials,
      });
      addAuditLog(
        'Exported suppliers workbook',
        'Supplier',
        `${bundle.suppliers.length} supplier${bundle.suppliers.length !== 1 ? 's' : ''}`,
      );
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setExportingSuppliers(false);
    }
  };

  /** YTD = calendar year; uses purchase_orders when available, else `suppliers.total_purchases_ytd`. */
  const totalYTD = useMemo(() => {
    return filteredSuppliers.reduce((sum, s) => {
      const a = poSpendBySupplier[s.id];
      if (a && a.n > 0) return sum + a.ytd;
      return sum + s.total_purchases_ytd;
    }, 0);
  }, [filteredSuppliers, poSpendBySupplier]);

  /** Same as `totalYTD` / PO order counts, but for the branch-filtered supplier list (dashboard cards). */
  const branchYtdDashboard = useMemo(() => {
    return branchFilteredSuppliers.reduce(
      (acc, s) => {
        const a = poSpendBySupplier[s.id];
        if (a && a.n > 0) {
          acc.spend += a.ytd;
          acc.ordersYtd += a.ytdN;
        } else {
          acc.spend += s.total_purchases_ytd;
          acc.ordersYtd += s.order_count;
        }
        return acc;
      },
      { spend: 0, ordersYtd: 0 },
    );
  }, [branchFilteredSuppliers, poSpendBySupplier]);

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
      ytdOrderCount: s.order_count,
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
          <Button variant="primary" className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add New Supplier</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* ── Quick Stats ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-2 2xl:grid-cols-4 gap-3 sm:gap-4">
        <StatKpiCard label="Total Suppliers" value={String(branchFilteredSuppliers.length)} tone="blue" icon={<Factory />} />
        <StatKpiCard
          label="Preferred"
          value={String(branchFilteredSuppliers.filter((s) => s.preferred_supplier).length)}
          tone="emerald"
          icon={<Award />}
        />
        <StatKpiCard label="YTD Spending" value={formatCurrency(branchYtdDashboard.spend)} tone="orange" icon={<DollarSign />} />
        <StatKpiCard label="Total Orders YTD" value={String(branchYtdDashboard.ordersYtd)} tone="violet" icon={<ShoppingCart />} />
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
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
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
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2 shrink-0 sm:ml-auto"
                    disabled={exportingSuppliers || filteredSuppliers.length === 0}
                    onClick={() => void handleExportSuppliers()}
                  >
                    {exportingSuppliers ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {exportingSuppliers ? 'Exporting…' : 'Export'}
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
                const spend = getSpend(supplier);

                return (
              <Link
                key={supplier.id}
                to={`/suppliers/${supplier.id}`}
                className="block rounded-xl text-inherit no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
              >
              <Card className="hover:shadow-lg transition-shadow h-full">
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
                              {formatCurrency(spend.ytd)}
                        </div>
                      </div>
                      <div>
                            <div className="text-xs text-gray-500 mb-1">Orders YTD</div>
                            <div className="text-sm font-bold text-gray-900">{spend.ytdOrderCount}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Avg Order Value</div>
                        <div className="text-sm font-bold text-green-600">
                              {spend.avgOrder > 0 ? formatCurrency(spend.avgOrder) : '—'}
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
              </Link>
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
                                <Link
                                  to={`/suppliers/${s.id}`}
                                  className="font-medium text-gray-900 truncate min-w-0 hover:text-red-700 hover:underline underline-offset-2"
                                >
                                  {s.name}
                                </Link>
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
                              <Link
                                to={`/suppliers/${s.id}`}
                                className="flex items-center gap-2 min-w-0 flex-1 text-inherit no-underline rounded-md -m-1 p-1 hover:bg-gray-100/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                              >
                                <Factory className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <span className="font-medium text-gray-900 truncate" title={s.name}>{s.name}</span>
                              </Link>
                              {s.preferred_supplier && <Badge variant="success" className="text-xs flex-shrink-0">Preferred</Badge>}
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

    </div>
  );
}
