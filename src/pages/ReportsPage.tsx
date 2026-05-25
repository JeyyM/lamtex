import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { branchChartColorAt, employeeProfilePathFromAgent, agentChartColor, agentChartColorAt, type AgentLeaderboardRow, type BranchAnalyticsRow } from '@/src/lib/agentAnalytics';
import { AgentColorSwatch } from '@/src/components/agentAnalytics/AgentColorSwatch';
import { DashLink, DASH_LINK_CLASS } from '@/src/components/executive/executiveLinks';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { PortalModalOverlay } from '@/src/components/ui/PortalModalOverlay';
import { StatKpiCard } from '@/src/components/ui/StatKpiCard';
import { TablePagination, TABLE_PAGE_SIZE } from '@/src/components/ui/TablePagination';
import {
  BarChart3,
  TrendingUp,
  Users,
  Package,
  PackageCheck,
  Truck,
  Download,
  Loader2,
  RefreshCw,
  AlertTriangle,
  DollarSign,
  ShoppingCart,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Minus,
  Wallet,
  Activity,
  CheckCircle,
  Factory,
  CalendarRange,
  X,
  Building2,
  Award,
  Search,
  Filter,
  PieChart as PieChartIcon,
  Medal,
  Table2,
  ClipboardList,
  Plus,
} from 'lucide-react';
import RawMaterialPickerModal from '@/src/components/products/RawMaterialPickerModal';
import {
  ComposedChart,
  LineChart,
  Line,
  Bar,
  BarChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  fetchReportsBundle,
  exportReportsOutstanding,
  formatReportsPeso,
  formatReportsPesoFull,
  formatReportsPesoExact,
  type ReportsBundle,
  type ReportsBranchTrendCompare,
  type ReportsProductRow,
  type ReportsCategoryMarginRow,
  type ReportsProductVariantRow,
  type ReportsInventorySupplierRow,
  // type ReportsLogisticsTripRow,
  type ReportsRawMaterialConsumptionReport,
  type ReportsRawMaterialConsumptionByProductRow,
} from '@/src/lib/reportsData';
import { finishedGoodProductHref, productCategoryHref } from '@/src/lib/productRoutes';
import {
  DATE_PERIOD_OPTIONS,
  periodTriggerLabel,
  resolveDatePeriodQuery,
  todayIsoLocal,
  type DatePeriodKind,
} from '@/src/lib/datePeriodQuery';

type ViewMode = 'overview' | 'sales' | 'agents' | 'products' | 'inventory';
type RevenueTrendMode = 'scoped' | 'allBranches';
type AgentCompareMode = 'scoped' | 'allBranches';
type SortDir = 'asc' | 'desc';

function compareReportSort(av: string | number, bv: string | number, dir: SortDir): number {
  if (typeof av === 'number' && typeof bv === 'number') {
    return dir === 'asc' ? av - bv : bv - av;
  }
  const as = String(av).toLowerCase();
  const bs = String(bv).toLowerCase();
  if (as < bs) return dir === 'asc' ? -1 : 1;
  if (as > bs) return dir === 'asc' ? 1 : -1;
  return 0;
}

function sortAgentPerformanceRows(
  rows: AgentLeaderboardRow[],
  sortKey: string,
  sortDir: SortDir,
): AgentLeaderboardRow[] {
  return [...rows].sort((a, b) => {
    let av: string | number;
    let bv: string | number;
    switch (sortKey) {
      case 'agent':
        av = a.agentName.toLowerCase();
        bv = b.agentName.toLowerCase();
        break;
      case 'branch':
        av = (a.branchName ?? '').toLowerCase();
        bv = (b.branchName ?? '').toLowerCase();
        break;
      case 'revenue':
        av = a.revenue;
        bv = b.revenue;
        break;
      case 'effectiveTarget':
        av = a.effectiveTarget;
        bv = b.effectiveTarget;
        break;
      case 'attainmentPct':
        av = a.attainmentPct;
        bv = b.attainmentPct;
        break;
      case 'orderCount':
        av = a.orderCount;
        bv = b.orderCount;
        break;
      case 'distinctCustomers':
        av = a.distinctCustomers;
        bv = b.distinctCustomers;
        break;
      case 'avgDiscountPercent':
        av = a.avgDiscountPercent;
        bv = b.avgDiscountPercent;
        break;
      case 'commissionEarned':
        av = a.commissionEarned;
        bv = b.commissionEarned;
        break;
      default:
        av = a.revenue;
        bv = b.revenue;
    }
    return compareReportSort(av, bv, sortDir);
  });
}

function sortBranchAnalyticsRows(
  rows: BranchAnalyticsRow[],
  sortKey: string,
  sortDir: SortDir,
): BranchAnalyticsRow[] {
  return [...rows].sort((a, b) => {
    let av: string | number;
    let bv: string | number;
    switch (sortKey) {
      case 'branch':
        av = a.branchName.toLowerCase();
        bv = b.branchName.toLowerCase();
        break;
      case 'revenue':
        av = a.revenue;
        bv = b.revenue;
        break;
      case 'avgMarginPct':
        av = a.avgMarginPct;
        bv = b.avgMarginPct;
        break;
      case 'outstanding':
        av = a.outstanding;
        bv = b.outstanding;
        break;
      case 'rank':
        av = a.rank;
        bv = b.rank;
        break;
      default:
        av = a.revenue;
        bv = b.revenue;
    }
    return compareReportSort(av, bv, sortDir);
  });
}

function sortProductRows(rows: ReportsProductRow[], sortKey: string, sortDir: SortDir): ReportsProductRow[] {
  return [...rows].sort((a, b) => {
    let av: string | number;
    let bv: string | number;
    switch (sortKey) {
      case 'product':
        av = a.productName.toLowerCase();
        bv = b.productName.toLowerCase();
        break;
      case 'category':
        av = a.categoryName.toLowerCase();
        bv = b.categoryName.toLowerCase();
        break;
      case 'unitsSold':
        av = a.unitsSold;
        bv = b.unitsSold;
        break;
      case 'orderCount':
        av = a.orderCount;
        bv = b.orderCount;
        break;
      case 'revenue':
        av = a.revenue;
        bv = b.revenue;
        break;
      case 'profit':
        av = a.profit;
        bv = b.profit;
        break;
      case 'marginPct':
        av = a.marginPct;
        bv = b.marginPct;
        break;
      default:
        av = a.revenue;
        bv = b.revenue;
    }
    return compareReportSort(av, bv, sortDir);
  });
}

type ProductCustomerAggRow = {
  customerId: string;
  customerCode: string | null;
  customerName: string;
  agentId: string | null;
  agentName: string | null;
  unitsSold: number;
  revenue: number;
  orderCount: number;
};

function sortProductCustomerRows(
  rows: ProductCustomerAggRow[],
  sortKey: string,
  sortDir: SortDir,
): ProductCustomerAggRow[] {
  return [...rows].sort((a, b) => {
    let av: string | number;
    let bv: string | number;
    switch (sortKey) {
      case 'customer':
        av = a.customerName.toLowerCase();
        bv = b.customerName.toLowerCase();
        break;
      case 'agent':
        av = (a.agentName ?? '').toLowerCase();
        bv = (b.agentName ?? '').toLowerCase();
        break;
      case 'unitsSold':
        av = a.unitsSold;
        bv = b.unitsSold;
        break;
      case 'orderCount':
        av = a.orderCount;
        bv = b.orderCount;
        break;
      case 'revenue':
      default:
        av = a.revenue;
        bv = b.revenue;
    }
    return compareReportSort(av, bv, sortDir);
  });
}

type ProductVariantViewRow = ReportsProductVariantRow & { shareOfProductPct: number };

type ProductVariantBreakdownView = 'chart' | 'table';
type MaterialSpendChartMode = 'overall' | 'categories';

function variantBreakdownChartLabel(row: ProductVariantViewRow, multiProduct: boolean): string {
  if (multiProduct) {
    const shortProduct =
      row.productName.length > 16 ? `${row.productName.slice(0, 14).trim()}…` : row.productName;
    return `${shortProduct} · ${row.size}`;
  }
  return row.size !== '—' ? row.size : row.sku;
}

function sortProductVariantRows(
  rows: ProductVariantViewRow[],
  sortKey: string,
  sortDir: SortDir,
): ProductVariantViewRow[] {
  return [...rows].sort((a, b) => {
    let av: string | number;
    let bv: string | number;
    switch (sortKey) {
      case 'product':
        av = a.productName.toLowerCase();
        bv = b.productName.toLowerCase();
        break;
      case 'sku':
        av = a.sku.toLowerCase();
        bv = b.sku.toLowerCase();
        break;
      case 'size':
        av = a.size.toLowerCase();
        bv = b.size.toLowerCase();
        break;
      case 'unitsSold':
        av = a.unitsSold;
        bv = b.unitsSold;
        break;
      case 'orderCount':
        av = a.orderCount;
        bv = b.orderCount;
        break;
      case 'shareOfProductPct':
        av = a.shareOfProductPct;
        bv = b.shareOfProductPct;
        break;
      case 'profit':
        av = a.profit;
        bv = b.profit;
        break;
      case 'marginPct':
        av = a.marginPct;
        bv = b.marginPct;
        break;
      case 'revenue':
      default:
        av = a.revenue;
        bv = b.revenue;
    }
    return compareReportSort(av, bv, sortDir);
  });
}

function sortCategoryMarginRows(
  rows: ReportsCategoryMarginRow[],
  sortKey: string,
  sortDir: SortDir,
): ReportsCategoryMarginRow[] {
  return [...rows].sort((a, b) => {
    let av: string | number;
    let bv: string | number;
    switch (sortKey) {
      case 'category':
        av = a.categoryName.toLowerCase();
        bv = b.categoryName.toLowerCase();
        break;
      case 'unitsSold':
        av = a.unitsSold;
        bv = b.unitsSold;
        break;
      case 'revenue':
        av = a.revenue;
        bv = b.revenue;
        break;
      case 'profit':
        av = a.profit;
        bv = b.profit;
        break;
      case 'marginPct':
        av = a.marginPct;
        bv = b.marginPct;
        break;
      default:
        av = a.revenue;
        bv = b.revenue;
    }
    return compareReportSort(av, bv, sortDir);
  });
}

function sortInventorySupplierRows(
  rows: ReportsInventorySupplierRow[],
  sortKey: string,
  sortDir: SortDir,
): ReportsInventorySupplierRow[] {
  return [...rows].sort((a, b) => {
    let av: string | number;
    let bv: string | number;
    switch (sortKey) {
      case 'supplier':
        av = a.supplierName.toLowerCase();
        bv = b.supplierName.toLowerCase();
        break;
      case 'poCount':
        av = a.poCount;
        bv = b.poCount;
        break;
      case 'spend':
      default:
        av = a.spend;
        bv = b.spend;
    }
    return compareReportSort(av, bv, sortDir);
  });
}

/*
function sortLogisticsTripRows(
  rows: ReportsLogisticsTripRow[],
  sortKey: string,
  sortDir: SortDir,
): ReportsLogisticsTripRow[] {
  return [...rows].sort((a, b) => {
    let av: string | number;
    let bv: string | number;
    switch (sortKey) {
      case 'tripNumber':
        av = a.tripNumber.toLowerCase();
        bv = b.tripNumber.toLowerCase();
        break;
      case 'status':
        av = a.status.toLowerCase();
        bv = b.status.toLowerCase();
        break;
      case 'scheduledDate':
        av = a.scheduledDate;
        bv = b.scheduledDate;
        break;
      case 'vehicle':
        av = (a.vehicleName ?? '').toLowerCase();
        bv = (b.vehicleName ?? '').toLowerCase();
        break;
      case 'driver':
        av = (a.driverName ?? '').toLowerCase();
        bv = (b.driverName ?? '').toLowerCase();
        break;
      case 'orderCount':
      default:
        av = a.orderCount;
        bv = b.orderCount;
    }
    return compareReportSort(av, bv, sortDir);
  });
}
*/

function sortConsumptionByProductRows(
  rows: ReportsRawMaterialConsumptionByProductRow[],
  sortKey: string,
  sortDir: SortDir,
): ReportsRawMaterialConsumptionByProductRow[] {
  return [...rows].sort((a, b) => {
    let av: string | number;
    let bv: string | number;
    switch (sortKey) {
      case 'product':
        av = a.productName.toLowerCase();
        bv = b.productName.toLowerCase();
        break;
      case 'material':
        av = a.materialName.toLowerCase();
        bv = b.materialName.toLowerCase();
        break;
      case 'qty':
        av = a.qty;
        bv = b.qty;
        break;
      case 'events':
        av = a.eventCount;
        bv = b.eventCount;
        break;
      case 'cost':
      default:
        av = a.cost;
        bv = b.cost;
    }
    return compareReportSort(av, bv, sortDir);
  });
}

function reportsChartLegendProps(lineCount: number): { wrapperStyle: React.CSSProperties } {
  if (lineCount <= 4) return { wrapperStyle: { fontSize: 11 } };
  return {
    wrapperStyle: {
      fontSize: 11,
      maxHeight: 72,
      overflowY: 'auto',
      width: '100%',
    },
  };
}

/** Fixed-height charts without ResponsiveContainer — avoids runaway page height in scroll layouts. */
function ReportsChartFrame(props: {
  height: number;
  render: (size: { width: number; height: number }) => React.ReactElement;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [width, setWidth] = React.useState(0);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.max(0, Math.floor(el.getBoundingClientRect().width)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="w-full overflow-hidden" style={{ height: props.height }}>
      {width > 0 ? props.render({ width, height: props.height }) : null}
    </div>
  );
}

function reportsSortIcon(col: string, sortKey: string, sortDir: SortDir): React.ReactNode {
  if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
  return sortDir === 'asc'
    ? <ArrowUp className="w-3 h-3 ml-1 text-red-600" />
    : <ArrowDown className="w-3 h-3 ml-1 text-red-600" />;
}

function ReportsSortTh(props: {
  col: string;
  label: string;
  sortKey: string;
  sortDir: SortDir;
  onSort: (col: string) => void;
  align?: 'left' | 'right' | 'center';
  className?: string;
}) {
  const alignClass =
    props.align === 'right' ? 'text-right' : props.align === 'center' ? 'text-center' : 'text-left';
  const flexClass =
    props.align === 'right' ? 'justify-end' : props.align === 'center' ? 'justify-center' : '';
  return (
    <th
      onClick={() => props.onSort(props.col)}
      className={`py-2.5 px-3 font-semibold cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900 ${alignClass} ${props.className ?? ''}`}
    >
      <span className={`flex items-center ${flexClass}`}>
        {props.label}
        {reportsSortIcon(props.col, props.sortKey, props.sortDir)}
      </span>
    </th>
  );
}

function ReportsTableToolbar(props: {
  search: string;
  onSearchChange: (value: string) => void;
  placeholder: string;
  resultLabel: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center mb-4">
      <div className="relative flex-1 min-w-0">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
          placeholder={props.placeholder}
          value={props.search}
          onChange={(e) => props.onSearchChange(e.target.value)}
        />
      </div>
      {props.children ? <div className="flex flex-wrap items-center gap-2">{props.children}</div> : null}
      <p className="text-xs text-gray-500 shrink-0">{props.resultLabel}</p>
    </div>
  );
}

function ReportsFilterSelect(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex items-center gap-2">
      <Filter className="w-4 h-4 text-gray-400 shrink-0" aria-hidden />
      <label className="sr-only">{props.label}</label>
      <select
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className="h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
        aria-label={props.label}
      >
        {props.options.map((o) => (
          <option key={o.value || '__all'} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function useReportTableSort(defaultKey: string, defaultDir: SortDir = 'desc') {
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>(defaultDir);
  const onSort = useCallback((col: string) => {
    if (sortKey === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(col);
      setSortDir('asc');
    }
  }, [sortKey]);
  return { sortKey, sortDir, onSort };
}

const COLORS = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

interface MoverRow {
  key: string;
  name: string;
  value: number;
  sub?: string;
  badge?: { label: string; variant: 'success' | 'warning' | 'danger' | 'default' };
}

function getGrowthIcon(growth: number) {
  if (growth > 0) return <ArrowUpRight className="w-4 h-4 text-green-600" />;
  if (growth < 0) return <ArrowDownRight className="w-4 h-4 text-red-600" />;
  return <Minus className="w-4 h-4 text-gray-600" />;
}

function getGrowthColor(growth: number) {
  if (growth > 0) return 'text-green-600';
  if (growth < 0) return 'text-red-600';
  return 'text-gray-600';
}

function quotaBadgeVariant(pct: number): 'success' | 'warning' | 'danger' {
  if (pct >= 100) return 'success';
  if (pct >= 75) return 'warning';
  return 'danger';
}

function agentAttainmentBarColor(pct: number): string {
  if (pct >= 100) return 'bg-emerald-500';
  if (pct >= 85) return 'bg-amber-400';
  return 'bg-red-500';
}

function paymentBehaviorBadge(
  behavior: string | null | undefined,
): MoverRow['badge'] | undefined {
  if (!behavior) return undefined;
  const b = behavior.toLowerCase();
  if (b === 'good') return { label: 'Good', variant: 'success' };
  if (b === 'watchlist') return { label: 'Watch', variant: 'warning' };
  if (b === 'risk') return { label: 'Risk', variant: 'danger' };
  return { label: behavior, variant: 'default' };
}

export function ReportsPage(): React.ReactElement {
  const { branch } = useAppContext();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [periodKind, setPeriodKind] = useState<DatePeriodKind>('sixMonths');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [draftPeriodKind, setDraftPeriodKind] = useState<DatePeriodKind>('sixMonths');
  const [draftCustomStart, setDraftCustomStart] = useState('');
  const [draftCustomEnd, setDraftCustomEnd] = useState('');
  const [bundle, setBundle] = useState<ReportsBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revenueTrendMode, setRevenueTrendMode] = useState<RevenueTrendMode>('scoped');
  const [agentCompareMode, setAgentCompareMode] = useState<AgentCompareMode>('scoped');

  const [salesCustSearch, setSalesCustSearch] = useState('');
  const [salesCustAgentFilter, setSalesCustAgentFilter] = useState('');
  const [salesCustArFilter, setSalesCustArFilter] = useState('');
  const [salesCustPage, setSalesCustPage] = useState(1);
  const salesCustSort = useReportTableSort('revenue', 'desc');
  const agentsPerfSort = useReportTableSort('revenue', 'desc');
  const agentsBranchSort = useReportTableSort('revenue', 'desc');
  const productsSort = useReportTableSort('revenue', 'desc');
  const productCategorySort = useReportTableSort('revenue', 'desc');
  const productCustomersSort = useReportTableSort('revenue', 'desc');
  const productVariantsSort = useReportTableSort('revenue', 'desc');
  const [agentsPerfPage, setAgentsPerfPage] = useState(1);
  const [productsPage, setProductsPage] = useState(1);
  const [productCustomersPage, setProductCustomersPage] = useState(1);
  const [productVariantsPage, setProductVariantsPage] = useState(1);
  const [productVariantView, setProductVariantView] = useState<ProductVariantBreakdownView>('chart');
  const [productViewCategory, setProductViewCategory] = useState('');
  const [visibleCategoryNames, setVisibleCategoryNames] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const inventorySuppliersSort = useReportTableSort('spend', 'desc');
  // const logisticsTripsSort = useReportTableSort('scheduledDate', 'desc');
  const [materialSpendChartMode, setMaterialSpendChartMode] = useState<MaterialSpendChartMode>('overall');
  const [visibleMaterialCategoryNames, setVisibleMaterialCategoryNames] = useState<string[]>([]);

  const periodQuery = useMemo(
    () => resolveDatePeriodQuery(periodKind, customStart, customEnd),
    [periodKind, customStart, customEnd],
  );

  const maxCustomDate = useMemo(() => todayIsoLocal(), []);

  const draftCustomInvalid = Boolean(
    draftCustomStart && draftCustomEnd && draftCustomStart > draftCustomEnd,
  );

  const openPeriodModal = () => {
    setDraftPeriodKind(periodKind);
    setDraftCustomStart(customStart);
    setDraftCustomEnd(customEnd);
    setPeriodModalOpen(true);
  };

  const handlePeriodChange = (kind: DatePeriodKind) => {
    setPeriodKind(kind);
    if (kind === 'custom') {
      const t = new Date();
      const iso = todayIsoLocal();
      const start = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-01`;
      setCustomStart(start);
      setCustomEnd(iso);
    }
  };

  const handleModalPresetPick = (kind: DatePeriodKind) => {
    if (kind !== 'custom') {
      handlePeriodChange(kind);
      setPeriodModalOpen(false);
      return;
    }
    setDraftPeriodKind('custom');
    const t = new Date();
    const iso = todayIsoLocal();
    const start = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-01`;
    setDraftCustomStart((prev) => prev || customStart || start);
    setDraftCustomEnd((prev) => prev || customEnd || iso);
  };

  const applyModalCustomRange = () => {
    setPeriodKind('custom');
    setCustomStart(draftCustomStart);
    setCustomEnd(draftCustomEnd);
    setPeriodModalOpen(false);
  };

  useEffect(() => {
    if (!periodModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPeriodModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [periodModalOpen]);

  const load = useCallback(
    async (silent = false) => {
      if (periodQuery.invalid) {
        setError('Invalid date range selected.');
        setBundle(null);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (!silent) setLoading(true);
      setRefreshing(silent);
      setError(null);
      try {
        const data = await fetchReportsBundle({
          branchName: branch,
          periodKind,
          customStart,
          customEnd,
        });
        setBundle(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load reports');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [branch, periodKind, customStart, customEnd, periodQuery.invalid],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setRevenueTrendMode(branch?.trim() ? 'scoped' : 'allBranches');
    setAgentCompareMode(branch?.trim() ? 'scoped' : 'allBranches');
  }, [branch]);

  const branchLabel = useMemo(() => {
    if (bundle?.branchName) return bundle.branchName;
    if (branch && branch.trim() !== '') return branch;
    return 'All branches';
  }, [bundle?.branchName, branch]);

  const handleExport = useCallback(async () => {
    if (exporting || !bundle) return;
    setExporting(true);
    try {
      await exportReportsOutstanding({
        branchName: branch,
        periodLabel: bundle.period.displayLabel,
      });
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  }, [exporting, bundle, branch]);

  const reportTabs: Array<{ id: ViewMode; label: string; icon: React.ReactNode }> = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'sales', label: 'Sales', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'agents', label: 'Agents', icon: <Users className="w-4 h-4" /> },
    { id: 'products', label: 'Products', icon: <Package className="w-4 h-4" /> },
    { id: 'inventory', label: 'Inventory', icon: <PackageCheck className="w-4 h-4" /> },
    // { id: 'logistics', label: 'Logistics', icon: <Truck className="w-4 h-4" /> },
  ];

  const periodLabel = bundle?.period.displayLabel ?? periodQuery.displayLabel;

  const salesCustomersRaw = bundle?.enhancements.customersInPeriod ?? [];
  const salesSeriesRaw = bundle?.salesSeries ?? [];

  const branchRevenuePie = useMemo(() => {
    return (bundle?.branchRevenueShare ?? []).map((b) => ({
      name: b.branchName,
      value: b.revenue,
      branchId: b.branchId,
    }));
  }, [bundle?.branchRevenueShare]);

  const aovTrendData = useMemo(
    () =>
      salesSeriesRaw.map((s) => ({
        period: s.period,
        avgOrderValue: s.avgOrderValue,
      })),
    [salesSeriesRaw],
  );

  const salesAgentOptions = useMemo(
    () =>
      [...new Set(salesCustomersRaw.map((c) => c.agentName).filter((n): n is string => Boolean(n)))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [salesCustomersRaw],
  );

  const filteredSalesCustomers = useMemo(() => {
    const q = salesCustSearch.trim().toLowerCase();
    return salesCustomersRaw.filter((c) => {
      const matchesSearch =
        !q ||
        c.customerName.toLowerCase().includes(q) ||
        (c.customerCode ?? '').toLowerCase().includes(q) ||
        (c.agentName ?? '').toLowerCase().includes(q);
      const matchesAgent = !salesCustAgentFilter || c.agentName === salesCustAgentFilter;
      const matchesAr =
        !salesCustArFilter ||
        (salesCustArFilter === 'with_ar' && c.outstandingBalance > 0) ||
        (salesCustArFilter === 'no_ar' && c.outstandingBalance <= 0) ||
        (salesCustArFilter === 'overdue' && c.overdueBalance > 0) ||
        (salesCustArFilter === 'not_overdue' && c.overdueBalance <= 0) ||
        (salesCustArFilter === 'high_credit' &&
          c.creditUtilizationPct != null &&
          c.creditUtilizationPct >= 80);
      return matchesSearch && matchesAgent && matchesAr;
    });
  }, [salesCustomersRaw, salesCustSearch, salesCustAgentFilter, salesCustArFilter]);

  const sortedSalesCustomers = useMemo(() => {
    return [...filteredSalesCustomers].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (salesCustSort.sortKey) {
        case 'customer':
          av = a.customerName.toLowerCase();
          bv = b.customerName.toLowerCase();
          break;
        case 'agent':
          av = (a.agentName ?? '').toLowerCase();
          bv = (b.agentName ?? '').toLowerCase();
          break;
        case 'branch':
          av = (a.branchName ?? '').toLowerCase();
          bv = (b.branchName ?? '').toLowerCase();
          break;
        case 'orderCount':
          av = a.orderCount;
          bv = b.orderCount;
          break;
        case 'revenue':
          av = a.revenue;
          bv = b.revenue;
          break;
        case 'averageOrderValue':
          av = a.averageOrderValue;
          bv = b.averageOrderValue;
          break;
        case 'outstandingBalance':
          av = a.outstandingBalance;
          bv = b.outstandingBalance;
          break;
        case 'overdueBalance':
          av = a.overdueBalance;
          bv = b.overdueBalance;
          break;
        case 'maxDaysOverdue':
          av = a.maxDaysOverdue;
          bv = b.maxDaysOverdue;
          break;
        case 'overdueOrderCount':
          av = a.overdueOrderCount;
          bv = b.overdueOrderCount;
          break;
        case 'oldestDueDate':
          av = a.oldestDueDate ?? '';
          bv = b.oldestDueDate ?? '';
          break;
        case 'creditUtilizationPct':
          av = a.creditUtilizationPct ?? -1;
          bv = b.creditUtilizationPct ?? -1;
          break;
        default:
          av = a.revenue;
          bv = b.revenue;
      }
      return compareReportSort(av, bv, salesCustSort.sortDir);
    });
  }, [filteredSalesCustomers, salesCustSort.sortKey, salesCustSort.sortDir]);

  const salesCustTotalPages = Math.max(1, Math.ceil(sortedSalesCustomers.length / TABLE_PAGE_SIZE) || 1);
  const pagedSalesCustomers = useMemo(() => {
    const p = Math.min(salesCustPage, salesCustTotalPages);
    const start = (p - 1) * TABLE_PAGE_SIZE;
    return sortedSalesCustomers.slice(start, start + TABLE_PAGE_SIZE);
  }, [sortedSalesCustomers, salesCustPage, salesCustTotalPages]);

  useEffect(() => {
    setSalesCustPage(1);
  }, [salesCustSearch, salesCustAgentFilter, salesCustArFilter, salesCustSort.sortKey, salesCustSort.sortDir]);

  useEffect(() => {
    setAgentsPerfPage(1);
  }, [agentCompareMode, agentsPerfSort.sortKey, agentsPerfSort.sortDir]);

  useEffect(() => {
    setProductsPage(1);
  }, [productViewCategory, productSearch, productsSort.sortKey, productsSort.sortDir]);

  useEffect(() => {
    setSelectedProductIds([]);
  }, [productViewCategory, branch, periodKind, customStart, customEnd]);

  useEffect(() => {
    setProductVariantsPage(1);
  }, [selectedProductIds, productVariantsSort.sortKey, productVariantsSort.sortDir]);

  useEffect(() => {
    setProductCustomersPage(1);
  }, [
    selectedProductIds,
    productCustomersSort.sortKey,
    productCustomersSort.sortDir,
  ]);

  useEffect(() => {
    const margins = bundle?.enhancements?.categoryMargins;
    if (!margins?.length) {
      setVisibleCategoryNames([]);
      setProductViewCategory('');
      return;
    }
    const categoryNames = [...new Set(margins.map((c) => c.categoryName))].sort((a, b) =>
      a.localeCompare(b),
    );
    setVisibleCategoryNames((prev) => {
      const valid = prev.filter((n) => categoryNames.includes(n));
      return valid.length > 0 ? valid : categoryNames;
    });
    const productCats = [
      ...new Set((bundle?.productsInPeriod ?? []).map((p) => p.categoryName)),
    ].sort((a, b) => a.localeCompare(b));
    setProductViewCategory((prev) => {
      if (prev && productCats.includes(prev)) return prev;
      return productCats[0] ?? categoryNames[0] ?? '';
    });
  }, [bundle?.generatedAt, bundle?.enhancements?.categoryMargins, bundle?.productsInPeriod]);

  useEffect(() => {
    const lines = bundle?.inventoryReport?.materialCategoryMonthlySeries?.lines ?? [];
    if (lines.length === 0) {
      setVisibleMaterialCategoryNames([]);
      return;
    }
    const names = lines.map((l) => l.categoryName);
    setVisibleMaterialCategoryNames((prev) => {
      const valid = prev.filter((n) => names.includes(n));
      return valid.length > 0 ? valid : names;
    });
  }, [bundle?.generatedAt, bundle?.inventoryReport?.materialCategoryMonthlySeries]);

  useEffect(() => {
    if (salesCustPage > salesCustTotalPages) setSalesCustPage(salesCustTotalPages);
  }, [salesCustPage, salesCustTotalPages]);

  const periodModal = (
    <PortalModalOverlay
      open={periodModalOpen}
      onClose={() => setPeriodModalOpen(false)}
      zIndex={110}
      mobileBottomSheet
    >
      <div
        className="bg-white w-full sm:max-w-lg sm:rounded-xl shadow-xl max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reports-period-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h2 id="reports-period-modal-title" className="text-lg font-semibold text-gray-900">
            Date range
          </h2>
          <button
            type="button"
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Close"
            onClick={() => setPeriodModalOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-600">
            Choose a preset or set a custom date range. All report tabs and metrics use this period.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DATE_PERIOD_OPTIONS.map(({ kind, label }) => (
              <button
                key={kind}
                type="button"
                onClick={() => handleModalPresetPick(kind)}
                className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                  draftPeriodKind === kind
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {draftPeriodKind === 'custom' && (
            <div className="space-y-2 pt-1 border-t border-gray-100">
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs font-medium text-gray-600 w-full sm:w-auto">From</label>
                <input
                  type="date"
                  value={draftCustomStart}
                  max={maxCustomDate}
                  onChange={(e) => setDraftCustomStart(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
                <label className="text-xs font-medium text-gray-600">To</label>
                <input
                  type="date"
                  value={draftCustomEnd}
                  min={draftCustomStart || undefined}
                  max={maxCustomDate}
                  onChange={(e) => setDraftCustomEnd(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              {draftCustomInvalid && (
                <p className="text-xs text-red-600">Start must be on or before end.</p>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50">
          <Button
            type="button"
            variant="outline"
            className="border-gray-300 bg-white"
            onClick={() => setPeriodModalOpen(false)}
          >
            Cancel
          </Button>
          {draftPeriodKind === 'custom' && (
            <Button
              type="button"
              variant="primary"
              disabled={draftCustomInvalid}
              onClick={applyModalCustomRange}
            >
              Apply range
            </Button>
          )}
        </div>
      </div>
    </PortalModalOverlay>
  );

  if (loading) {
    return (
      <>
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reports &amp; Analytics</h1>
              <p className="text-sm text-gray-500 mt-1">
                {branchLabel} · {periodLabel}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="gap-2 border-gray-300 bg-white max-w-[18rem]"
                aria-haspopup="dialog"
                aria-expanded={periodModalOpen}
                aria-label="Choose date range"
                onClick={openPeriodModal}
              >
                <CalendarRange className="w-4 h-4 shrink-0 text-gray-600" aria-hidden />
                <span className="truncate text-left text-sm font-normal">
                  {periodTriggerLabel(periodKind, customStart, customEnd)}
                </span>
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-3 text-gray-500">
              <Loader2 className="w-7 h-7 animate-spin text-red-600" />
              <p className="text-sm">Loading reports…</p>
            </div>
          </div>
        </div>
        {periodModal}
      </>
    );
  }

  if (error || !bundle) {
    return (
      <>
        <div className="space-y-4 sm:space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reports &amp; Analytics</h1>
              <p className="text-sm text-gray-500 mt-1">
                {branchLabel} · {periodLabel}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="gap-2 border-gray-300 bg-white max-w-[18rem]"
                aria-haspopup="dialog"
                aria-expanded={periodModalOpen}
                aria-label="Choose date range"
                onClick={openPeriodModal}
              >
                <CalendarRange className="w-4 h-4 shrink-0 text-gray-600" aria-hidden />
                <span className="truncate text-left text-sm font-normal">
                  {periodTriggerLabel(periodKind, customStart, customEnd)}
                </span>
              </Button>
              <Button variant="primary" onClick={() => void load()} disabled={periodQuery.invalid}>
                Retry
              </Button>
            </div>
          </div>
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Could not load reports</h2>
              </div>
              <p className="text-sm text-gray-600">{error ?? 'No data available.'}</p>
            </CardContent>
          </Card>
        </div>
        {periodModal}
      </>
    );
  }

  const { executive, agents, agentsAllBranches, finance, salesSeries, enhancements: enh } = bundle;
  const summary = agents.summary;

  const agentsDisplay =
    agentCompareMode === 'allBranches' && agentsAllBranches ? agentsAllBranches : agents;
  const agentsTabSummary = agentsDisplay.summary;
  const canCompareAgents = Boolean(branch?.trim() && agentsAllBranches);
  const agentsScopeLabel =
    agentCompareMode === 'allBranches' && agentsAllBranches ? 'All branches' : branchLabel;
  const aov = summary.totalOrders > 0 ? summary.totalRevenue / summary.totalOrders : 0;

  const topProductMovers: MoverRow[] = bundle.productsInPeriod.slice(0, 5).map((p) => ({
    key: p.productId ?? p.productName,
    name: p.productName,
    value: p.revenue,
    sub: `${p.unitsSold.toLocaleString()} units · ${p.orderCount} orders`,
  }));

  const topCustomerMovers: MoverRow[] = executive.topCustomers.slice(0, 5).map((c) => ({
    key: c.customerId,
    name: c.customerName,
    value: c.totalPurchasesYTD,
    sub: `${c.orderCount} orders · ${formatReportsPeso(c.outstandingBalance)} AR`,
    badge: paymentBehaviorBadge(c.paymentBehavior),
  }));

  const topAgentMovers: MoverRow[] = agents.agents.slice(0, 5).map((a) => ({
    key: a.agentId,
    name: a.agentName,
    value: a.revenue,
    sub: `${a.orderCount} orders · ${a.attainmentPct.toFixed(0)}% quota`,
    badge: {
      label: `${a.attainmentPct.toFixed(0)}%`,
      variant: quotaBadgeVariant(a.attainmentPct),
    },
  }));

  const topAgentByRevenue =
    agentsDisplay.agents.length === 0
      ? null
      : ([...agentsDisplay.agents].sort((a, b) => b.revenue - a.revenue)[0] ?? null);

  const agentChartRows = [...agentsDisplay.agents]
    .sort((a, b) => b.attainmentPct - a.attainmentPct)
    .map((a) => ({
      agentId: a.agentId,
      name: a.agentName.length > 18 ? `${a.agentName.slice(0, 16)}…` : a.agentName,
      attainment: Math.round(a.attainmentPct),
      fill: agentChartColor(a.agentId),
    }));

  const agentSalesChartRows = [...agentsDisplay.agents]
    .sort((a, b) => b.revenue - a.revenue)
    .map((a) => ({
      agentId: a.agentId,
      name: a.agentName,
      revenue: a.revenue,
      fill: agentChartColor(a.agentId),
    }));

  const sortedAgentsForTable = sortAgentPerformanceRows(
    agentsDisplay.agents,
    agentsPerfSort.sortKey,
    agentsPerfSort.sortDir,
  );
  const agentsPerfTotalPages = Math.max(1, Math.ceil(sortedAgentsForTable.length / TABLE_PAGE_SIZE) || 1);
  const agentsPerfPageSafe = Math.min(agentsPerfPage, agentsPerfTotalPages);
  const pagedAgentsForTable = sortedAgentsForTable.slice(
    (agentsPerfPageSafe - 1) * TABLE_PAGE_SIZE,
    agentsPerfPageSafe * TABLE_PAGE_SIZE,
  );

  const sortedBranchesForTable = sortBranchAnalyticsRows(
    agentsDisplay.branches,
    agentsBranchSort.sortKey,
    agentsBranchSort.sortDir,
  );

  const showAgentBranchCol = agentCompareMode === 'allBranches' && Boolean(agentsAllBranches);

  const productCategoryOptions = [...new Set(bundle.productsInPeriod.map((p) => p.categoryName))].sort(
    (a, b) => a.localeCompare(b),
  );

  const filteredProducts = bundle.productsInPeriod.filter((p) => {
    const q = productSearch.trim().toLowerCase();
    if (productViewCategory && p.categoryName !== productViewCategory) return false;
    if (q && !p.productName.toLowerCase().includes(q)) return false;
    return true;
  });

  const sortedProducts = sortProductRows(filteredProducts, productsSort.sortKey, productsSort.sortDir);
  const productsTotalPages = Math.max(1, Math.ceil(sortedProducts.length / TABLE_PAGE_SIZE) || 1);
  const productsPageSafe = Math.min(productsPage, productsTotalPages);
  const pagedProducts = sortedProducts.slice(
    (productsPageSafe - 1) * TABLE_PAGE_SIZE,
    productsPageSafe * TABLE_PAGE_SIZE,
  );

  const categoryMarginSource = enh.categoryMargins;

  const categoryChartRows = categoryMarginSource.filter((c) =>
    visibleCategoryNames.includes(c.categoryName),
  );

  const categoryRowsForSection = sortCategoryMarginRows(
    categoryMarginSource,
    productCategorySort.sortKey,
    productCategorySort.sortDir,
  );

  const categoryPieData = (() => {
    const sorted = [...categoryChartRows].sort((a, b) => b.revenue - a.revenue);
    const top = sorted.slice(0, 8);
    const rest = sorted.slice(8);
    const rows = top.map((c) => ({ name: c.categoryName, value: c.revenue, key: c.categoryName }));
    if (rest.length > 0) {
      rows.push({
        name: 'Other',
        value: rest.reduce((s, c) => s + c.revenue, 0),
        key: 'other',
      });
    }
    return rows.filter((r) => r.value > 0);
  })();

  const categoryTrendLines = [...categoryChartRows].sort((a, b) => b.revenue - a.revenue);

  const categoryTrendChartData = bundle.categoryMonthlySeries.labels.map((label, i) => {
    const row: Record<string, string | number> = { label };
    for (const c of categoryTrendLines) {
      const line = bundle.categoryMonthlySeries.lines.find((l) => l.categoryName === c.categoryName);
      row[c.categoryName] = line?.revenueByMonth[i] ?? 0;
    }
    return row;
  });

  const toggleCategoryVisible = (categoryName: string) => {
    setVisibleCategoryNames((prev) => {
      if (prev.includes(categoryName)) {
        if (prev.length <= 1) return prev;
        return prev.filter((n) => n !== categoryName);
      }
      return [...prev, categoryName];
    });
  };

  const productsInViewCategory = bundle.productsInPeriod.filter(
    (p) => !productViewCategory || p.categoryName === productViewCategory,
  );

  const productChartRows =
    selectedProductIds.length > 0
      ? productsInViewCategory.filter((p) => p.productId && selectedProductIds.includes(p.productId))
      : productsInViewCategory;

  const productPieData = (() => {
    const sorted = [...productChartRows].sort((a, b) => b.revenue - a.revenue);
    const top = sorted.slice(0, 8);
    const rest = sorted.slice(8);
    const rows = top.map((p) => ({
      name: p.productName,
      value: p.revenue,
      key: p.productId ?? p.productName,
    }));
    if (rest.length > 0) {
      rows.push({
        name: 'Other',
        value: rest.reduce((s, p) => s + p.revenue, 0),
        key: 'other',
      });
    }
    return rows.filter((r) => r.value > 0);
  })();

  const productTrendLines =
    selectedProductIds.length > 0
      ? [...productChartRows].sort((a, b) => b.revenue - a.revenue)
      : [...productChartRows].sort((a, b) => b.revenue - a.revenue).slice(0, 6);

  const productTrendChartData = bundle.productMonthlySeries.labels.map((label, i) => {
    const row: Record<string, string | number> = { label };
    for (const p of productTrendLines) {
      if (!p.productId) continue;
      const line = bundle.productMonthlySeries.lines.find((l) => l.productId === p.productId);
      row[p.productName] = line?.revenueByMonth[i] ?? 0;
    }
    return row;
  });

  const topProductCustomersRaw = (() => {
    if (selectedProductIds.length === 0) return [] as ProductCustomerAggRow[];
    const selected = new Set(selectedProductIds);
    type AgentRev = { agentId: string | null; agentName: string | null; revenue: number };
    type Agg = Omit<ProductCustomerAggRow, 'agentId' | 'agentName' | 'orderCount'> & {
      orders: Set<string>;
      agentRevenue: Map<string, AgentRev>;
    };
    const map = new Map<string, Agg>();
    for (const line of bundle.productCustomerLines) {
      if (!selected.has(line.productId)) continue;
      const cur =
        map.get(line.customerId) ??
        ({
          customerId: line.customerId,
          customerCode: line.customerCode,
          customerName: line.customerName,
          unitsSold: 0,
          revenue: 0,
          orders: new Set<string>(),
          agentRevenue: new Map<string, AgentRev>(),
        } satisfies Agg);
      cur.unitsSold += line.unitsSold;
      cur.revenue += line.revenue;
      cur.orders.add(line.orderId);
      if (!cur.customerCode && line.customerCode) cur.customerCode = line.customerCode;
      const agentKey = line.agentId ?? line.agentName ?? 'unknown';
      const agentCur = cur.agentRevenue.get(agentKey) ?? {
        agentId: line.agentId,
        agentName: line.agentName,
        revenue: 0,
      };
      agentCur.revenue += line.revenue;
      if (!agentCur.agentName && line.agentName) agentCur.agentName = line.agentName;
      if (!agentCur.agentId && line.agentId) agentCur.agentId = line.agentId;
      cur.agentRevenue.set(agentKey, agentCur);
      map.set(line.customerId, cur);
    }
    return [...map.values()]
      .map(({ orders, agentRevenue, ...rest }) => {
        const topAgent = [...agentRevenue.values()].sort((a, b) => b.revenue - a.revenue)[0];
        return {
          ...rest,
          orderCount: orders.size,
          agentId: topAgent?.agentId ?? null,
          agentName: topAgent?.agentName ?? null,
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
  })();

  const selectedProductVariantRows = (() => {
    if (selectedProductIds.length === 0) return [] as ProductVariantViewRow[];
    const selected = new Set(selectedProductIds);
    const filtered = (bundle.productVariantSales ?? []).filter((v) => selected.has(v.productId));
    const revenueByProduct = new Map<string, number>();
    for (const row of filtered) {
      revenueByProduct.set(row.productId, (revenueByProduct.get(row.productId) ?? 0) + row.revenue);
    }
    return filtered.map((row) => ({
      ...row,
      shareOfProductPct:
        (revenueByProduct.get(row.productId) ?? 0) > 0
          ? (row.revenue / (revenueByProduct.get(row.productId) ?? 1)) * 100
          : 0,
    }));
  })();

  const sortedProductVariants = sortProductVariantRows(
    selectedProductVariantRows,
    productVariantsSort.sortKey,
    productVariantsSort.sortDir,
  );
  const productVariantsTotalPages = Math.max(
    1,
    Math.ceil(sortedProductVariants.length / TABLE_PAGE_SIZE) || 1,
  );
  const productVariantsPageSafe = Math.min(productVariantsPage, productVariantsTotalPages);
  const pagedProductVariants = sortedProductVariants.slice(
    (productVariantsPageSafe - 1) * TABLE_PAGE_SIZE,
    productVariantsPageSafe * TABLE_PAGE_SIZE,
  );

  const multiProductVariantSelection = selectedProductIds.length > 1;
  const variantSummary = {
    count: selectedProductVariantRows.length,
    units: selectedProductVariantRows.reduce((s, r) => s + r.unitsSold, 0),
    revenue: selectedProductVariantRows.reduce((s, r) => s + r.revenue, 0),
  };
  const variantBarChartData = [...sortedProductVariants]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 12)
    .map((v) => ({
      key: v.variantId,
      name: variantBreakdownChartLabel(v, multiProductVariantSelection),
      detail: `${v.productName} · ${v.size} (${v.sku})`,
      revenue: v.revenue,
      units: v.unitsSold,
      shareOfProductPct: v.shareOfProductPct,
      fill: agentChartColor(v.variantId),
    }));
  const variantPieData = (() => {
    const sorted = [...sortedProductVariants].sort((a, b) => b.revenue - a.revenue);
    const top = sorted.slice(0, 8);
    const rest = sorted.slice(8);
    const rows = top.map((v) => ({
      name: variantBreakdownChartLabel(v, multiProductVariantSelection),
      value: v.revenue,
      key: v.variantId,
    }));
    if (rest.length > 0) {
      rows.push({
        name: 'Other',
        value: rest.reduce((s, v) => s + v.revenue, 0),
        key: 'other',
      });
    }
    return rows.filter((r) => r.value > 0);
  })();

  const sortedTopProductCustomers = sortProductCustomerRows(
    topProductCustomersRaw,
    productCustomersSort.sortKey,
    productCustomersSort.sortDir,
  );
  const productCustomersTotalPages = Math.max(
    1,
    Math.ceil(sortedTopProductCustomers.length / TABLE_PAGE_SIZE) || 1,
  );
  const productCustomersPageSafe = Math.min(productCustomersPage, productCustomersTotalPages);
  const pagedTopProductCustomers = sortedTopProductCustomers.slice(
    (productCustomersPageSafe - 1) * TABLE_PAGE_SIZE,
    productCustomersPageSafe * TABLE_PAGE_SIZE,
  );

  const inv = bundle.inventoryReport;
  const invSummary = inv.summary;

  /*
  const log = bundle.logisticsReport;
  const logSummary = log.summary;

  const sortedLogisticsTrips = sortLogisticsTripRows(
    log.recentTrips,
    logisticsTripsSort.sortKey,
    logisticsTripsSort.sortDir,
  );

  const fulfillmentPipelineChart = log.fulfillmentPipeline.map((s) => ({
    status: s.status,
    orders: s.orderCount,
    value: s.totalValue,
  }));

  const tripStatusChart = log.tripStatusBreakdown.map((s) => ({
    name: s.status,
    value: s.tripCount,
  }));
  */

  const sortedInventorySuppliers = sortInventorySupplierRows(
    inv.suppliers,
    inventorySuppliersSort.sortKey,
    inventorySuppliersSort.sortDir,
  );

  const materialCategoryLines = inv.materialCategoryMonthlySeries.lines;
  const visibleMaterialCategoryLines = materialCategoryLines.filter((c) =>
    visibleMaterialCategoryNames.includes(c.categoryName),
  );
  const materialCategorySpendByName = new Map(
    inv.materialCategorySpend.map((c) => [c.categoryName, c]),
  );
  const materialSpendLineChartData = inv.materialSpendSeries.map((p, i) => {
    const row: Record<string, string | number> = { label: p.label };
    if (materialSpendChartMode === 'overall') {
      row.Overall = p.materialSpend;
    } else {
      for (const c of visibleMaterialCategoryLines) {
        row[c.categoryName] = c.spendByMonth[i] ?? 0;
      }
    }
    return row;
  });
  const hasMaterialSpend = inv.materialSpendSeries.some((p) => p.materialSpend > 0);

  const toggleMaterialCategoryVisible = (categoryName: string) => {
    setVisibleMaterialCategoryNames((prev) => {
      if (prev.includes(categoryName)) {
        if (prev.length <= 1) return prev;
        return prev.filter((n) => n !== categoryName);
      }
      return [...prev, categoryName];
    });
  };

  const toggleProductCompare = (productId: string | null) => {
    if (!productId) return;
    setSelectedProductIds((prev) => {
      if (prev.includes(productId)) return prev.filter((id) => id !== productId);
      if (prev.length >= 6) return prev;
      return [...prev, productId];
    });
  };

  const categoryChartData = (() => {
    const top = enh.categoryMargins.slice(0, 5);
    const rest = enh.categoryMargins.slice(5);
    const rows = top.map((c) => ({ name: c.categoryName, value: c.revenue, margin: c.marginPct }));
    if (rest.length > 0) {
      rows.push({
        name: 'Other',
        value: rest.reduce((s, c) => s + c.revenue, 0),
        margin: 0,
      });
    }
    return rows.filter((r) => r.value > 0);
  })();

  return (
    <>
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports &amp; Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            {branchLabel} · {periodLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2 border-gray-300 bg-white max-w-[18rem]"
            aria-haspopup="dialog"
            aria-expanded={periodModalOpen}
            aria-label="Choose date range"
            onClick={openPeriodModal}
          >
            <CalendarRange className="w-4 h-4 shrink-0 text-gray-600" aria-hidden />
            <span className="truncate text-left text-sm font-normal">
              {periodTriggerLabel(periodKind, customStart, customEnd)}
            </span>
          </Button>
          <Button variant="outline" onClick={() => void load(true)} disabled={refreshing || periodQuery.invalid} className="gap-2">
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
          <Button variant="primary" onClick={() => void handleExport()} disabled={exporting} className="gap-2">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export AR
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-1">
        <div className="sm:hidden">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white"
          >
            {reportTabs.map((tab) => (
              <option key={tab.id} value={tab.id}>{tab.label}</option>
            ))}
          </select>
        </div>
        <nav className="hidden sm:flex flex-wrap gap-1">
          {reportTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setViewMode(tab.id)}
              className={`flex items-center gap-2 py-2.5 px-4 rounded-lg font-medium text-sm whitespace-nowrap transition-all ${
                viewMode === tab.id
                  ? 'bg-white text-red-700 shadow-sm ring-1 ring-red-100'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* OVERVIEW */}
      {viewMode === 'overview' && (
        <div className="space-y-6">
          {/* Period KPIs — 2 rows × 4 */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatKpiCard
              label="Revenue"
              value={formatReportsPeso(summary.totalRevenue)}
              tone="blue"
              icon={<DollarSign />}
              sub={<TrendChip value={summary.revenueDeltaPct} suffix=" vs prior" />}
            />
            <StatKpiCard
              label="Gross profit"
              value={formatReportsPeso(summary.totalProfit)}
              tone="emerald"
              icon={<TrendingUp />}
              sub={
                <span className="text-gray-500">
                  {summary.profitMarginPct.toFixed(1)}% margin ·{' '}
                  <TrendChip value={summary.profitDeltaPct} inline />
                </span>
              }
            />
            <StatKpiCard
              label="Orders"
              value={summary.totalOrders.toLocaleString()}
              tone="violet"
              icon={<ShoppingCart />}
              sub={<TrendChip value={enh.periodCounts.ordersDeltaPct} suffix=" vs prior" />}
            />
            <StatKpiCard
              label="Avg order value"
              value={formatReportsPesoFull(aov)}
              tone="amber"
              icon={<Target />}
              sub={<span className="text-gray-500">Per order in period</span>}
            />
            <StatKpiCard
              label="On-time collection rate"
              value={`${enh.collectionCompare.collectionRateCurrent.toFixed(0)}%`}
              tone="teal"
              icon={<Wallet />}
              sub={
                <span className={getGrowthColor(enh.collectionCompare.collectionRateDeltaPts)}>
                  {formatReportsPeso(enh.collectionCompare.collectedCurrent)} on time ·{' '}
                  {formatReportsPeso(enh.collectionCompare.overdueBalanceCurrent)} overdue
                  {enh.collectionCompare.overdueOrderCountCurrent > 0
                    ? ` (${enh.collectionCompare.overdueOrderCountCurrent})`
                    : ''}
                </span>
              }
            />
            <StatKpiCard
              label="Outstanding AR"
              value={formatReportsPeso(finance.totalOutstanding)}
              tone="rose"
              icon={<Activity />}
              sub={
                <span className="text-gray-500">
                  Live snapshot · {finance.overdueCount} overdue
                </span>
              }
            />
            <StatKpiCard
              label="On-time delivery"
              value={`${enh.periodCounts.onTimeMtd.toFixed(0)}%`}
              tone="indigo"
              icon={<Truck />}
              sub={
                <span className={getGrowthColor(enh.periodCounts.onTimeDeltaPts)}>
                  {enh.periodCounts.onTimeDeltaPts >= 0 ? '+' : ''}
                  {enh.periodCounts.onTimeDeltaPts.toFixed(1)} pts vs last month ·{' '}
                  {executive.logistics.inTransitNow} in transit
                </span>
              }
            />
            <StatKpiCard
              label="Commissions paid out"
              value={formatReportsPeso(summary.commissionPaid)}
              tone="orange"
              icon={<Award />}
              sub={
                <span className="text-gray-500">
                  Earned {formatReportsPeso(summary.commissionEarned)} · liability{' '}
                  {formatReportsPeso(summary.commissionLiability)}
                </span>
              }
            />
          </div>

          {/* Revenue trend */}
          <ReportsRevenueTrendCard
            branchLabel={branchLabel}
            scopedTrend={executive.revenueTrend}
            branchCompare={bundle.branchTrendCompare}
            mode={revenueTrendMode}
            onModeChange={setRevenueTrendMode}
            canCompare={bundle.branchTrendCompare.branches.length > 1}
          />

          {/* Top movers + category mix — 2×2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MoverPanel
              title="Top products"
              subtitle={periodLabel}
              icon={<Package className="w-4 h-4 text-red-600" />}
              rows={topProductMovers}
              emptyMessage="No product sales in this period."
              onViewAll={() => setViewMode('products')}
            />
            <MoverPanel
              title="Top customers"
              subtitle="By purchase volume"
              icon={<Users className="w-4 h-4 text-blue-600" />}
              rows={topCustomerMovers}
              emptyMessage="No customer data."
              onViewAll={() => navigate('/customers')}
            />
            <MoverPanel
              title="Top agents"
              subtitle={periodLabel}
              icon={<Target className="w-4 h-4 text-emerald-600" />}
              rows={topAgentMovers}
              emptyMessage="No agent sales in this period."
              onViewAll={() => setViewMode('agents')}
            />
            <Card className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Revenue mix by category</CardTitle>
                <p className="text-xs text-gray-500 mt-1">{periodLabel}</p>
              </CardHeader>
              <CardContent className="pt-0 flex-1 flex items-center justify-center">
                {categoryChartData.length === 0 ? (
                  <p className="text-sm text-gray-500 py-8 text-center">No category sales in period.</p>
                ) : (
                  <div className="h-52 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryChartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={2}
                        >
                          {categoryChartData.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatReportsPesoFull(v)} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {enh.branchScorecard.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-slate-600" />
                  Branch scorecard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500 text-xs uppercase tracking-wide">
                        <th className="pb-3 pr-3">Branch</th>
                        <th className="pb-3 pr-3">Health</th>
                        <th className="pb-3 pr-3">Revenue</th>
                        <th className="pb-3 pr-3">Quota</th>
                        <th className="pb-3 pr-3">Margin</th>
                        <th className="pb-3 pr-3">On-time</th>
                        <th className="pb-3">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enh.branchScorecard.map((b) => (
                        <tr key={b.branchId} className="border-b border-gray-50 hover:bg-gray-50/80">
                          <td className="py-3 pr-3 font-medium">{b.branchName}</td>
                          <td className="py-3 pr-3">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2 w-12 rounded-full bg-gray-100 overflow-hidden"
                                title={`Health ${b.healthScore}`}
                              >
                                <div
                                  className={`h-full rounded-full ${
                                    b.healthScore >= 75
                                      ? 'bg-emerald-500'
                                      : b.healthScore >= 50
                                        ? 'bg-amber-500'
                                        : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(100, b.healthScore)}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500">{b.healthScore}</span>
                            </div>
                          </td>
                          <td className="py-3 pr-3">{formatReportsPesoFull(b.revenue)}</td>
                          <td className="py-3 pr-3">
                            <Badge variant={quotaBadgeVariant(b.quotaAttainmentPct)}>
                              {b.quotaAttainmentPct.toFixed(0)}%
                            </Badge>
                          </td>
                          <td className="py-3 pr-3">{b.profitMarginPct.toFixed(1)}%</td>
                          <td className="py-3 pr-3">{b.onTimePct.toFixed(0)}%</td>
                          <td className="py-3">{formatReportsPesoFull(b.outstanding)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* SALES */}
      {viewMode === 'sales' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatKpiCard
              label="Period revenue"
              value={formatReportsPeso(summary.totalRevenue)}
              tone="blue"
              icon={<DollarSign />}
              sub={<TrendChip value={summary.revenueDeltaPct} suffix=" vs prior" />}
            />
            <StatKpiCard
              label="Active customers"
              value={enh.customerSalesSnapshot.activeCustomers.toLocaleString()}
              tone="emerald"
              icon={<Users />}
              sub={<span className="text-gray-500">With orders in {periodLabel}</span>}
            />
            <StatKpiCard
              label="On-time collection"
              value={`${enh.collectionCompare.collectionRateCurrent.toFixed(0)}%`}
              tone="teal"
              icon={<Wallet />}
              sub={
                <span className={getGrowthColor(enh.collectionCompare.collectionRateDeltaPts)}>
                  {enh.collectionCompare.collectionRateDeltaPts >= 0 ? '+' : ''}
                  {enh.collectionCompare.collectionRateDeltaPts.toFixed(1)} pts vs prior
                </span>
              }
            />
            <StatKpiCard
              label="Overdue AR"
              value={formatReportsPeso(enh.customerSalesSnapshot.totalOverdueBalance)}
              tone="rose"
              icon={<AlertTriangle />}
              sub={
                <span className="text-gray-500">
                  {enh.customerSalesSnapshot.customersWithOverdue} customers ·{' '}
                  {formatReportsPeso(enh.customerSalesSnapshot.totalOutstanding)} total AR
                </span>
              }
            />
          </div>

          <Card>
            <CardHeader><CardTitle>Monthly sales ({bundle.period.displayLabel})</CardTitle></CardHeader>
            <CardContent>
              {salesSeries.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">No sales in selected period.</p>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={salesSeries}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" height={60} />
                      <YAxis yAxisId="left" tickFormatter={(v) => formatReportsPeso(v as number)} />
                      <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} />
                      <Tooltip formatter={(v: number, name: string) =>
                        name === 'Growth %' ? `${v.toFixed(1)}%` : name === 'Orders' ? v : formatReportsPesoFull(v)
                      } />
                      <Legend />
                      <Area yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" fill="#10B981" fillOpacity={0.2} stroke="#10B981" />
                      <Line yAxisId="left" type="monotone" dataKey="orders" name="Orders" stroke="#3B82F6" />
                      <Bar yAxisId="right" dataKey="growth" name="Growth %" fill="#F59E0B" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <PieChartIcon className="w-5 h-5 text-red-600" />
                  Revenue distribution by branch
                </CardTitle>
                <p className="text-xs text-gray-500 font-normal mt-1">
                  {periodLabel}
                  {bundle?.branchId ? ' · all branches' : ''}
                </p>
              </CardHeader>
              <CardContent>
                {branchRevenuePie.length === 0 ? (
                  <p className="text-sm text-gray-500 py-12 text-center">No branch revenue in this period.</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={branchRevenuePie}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={88}
                          label={({ name, percent }) =>
                            `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
                          }
                          labelLine
                        >
                          {branchRevenuePie.map((entry, i) => (
                            <Cell
                              key={entry.branchId}
                              fill={COLORS[i % COLORS.length]}
                              stroke={entry.branchId === bundle?.branchId ? '#111827' : undefined}
                              strokeWidth={entry.branchId === bundle?.branchId ? 2 : 0}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => formatReportsPesoFull(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Target className="w-5 h-5 text-red-600" />
                  Average order value trend
                </CardTitle>
                <p className="text-xs text-gray-500 font-normal mt-1">{periodLabel}</p>
              </CardHeader>
              <CardContent>
                {aovTrendData.length === 0 ? (
                  <p className="text-sm text-gray-500 py-12 text-center">No order data in this period.</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={aovTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                        <YAxis
                          tickFormatter={(v) => formatReportsPeso(v as number)}
                          tick={{ fontSize: 10 }}
                          width={56}
                        />
                        <Tooltip
                          formatter={(v: number) => formatReportsPesoFull(v)}
                          labelFormatter={(label) => String(label)}
                        />
                        <Area
                          type="monotone"
                          dataKey="avgOrderValue"
                          name="Avg order value"
                          stroke="#8B5CF6"
                          fill="#8B5CF6"
                          fillOpacity={0.12}
                          strokeWidth={2}
                          dot={{ r: 3, fill: '#8B5CF6' }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Detailed monthly sales data</CardTitle>
                <p className="text-xs text-gray-500 font-normal mt-1">{periodLabel}</p>
              </CardHeader>
              <CardContent className="p-0">
                {salesSeries.length === 0 ? (
                  <p className="text-sm text-gray-500 py-8 text-center px-6">No sales in selected period.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-y border-gray-200">
                        <tr>
                          <th className="py-2.5 px-3 text-left font-semibold">Period</th>
                          <th className="py-2.5 px-3 text-right font-semibold">Revenue</th>
                          <th className="py-2.5 px-3 text-right font-semibold">Orders</th>
                          <th className="py-2.5 px-3 text-right font-semibold">Avg order value</th>
                          <th className="py-2.5 px-3 text-right font-semibold">Growth</th>
                          <th className="py-2.5 px-3 text-center font-semibold w-14">Trend</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {[...salesSeries].reverse().map((row) => {
                          const isCurrentMonth =
                            row.monthKey ===
                            `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
                          const rowPeriodLabel =
                            isCurrentMonth && periodKind === 'ytd'
                              ? `${row.period} (YTD)`
                              : row.period;
                          return (
                            <tr key={row.monthKey} className="hover:bg-gray-50/80">
                              <td className="py-2.5 px-3 font-medium text-gray-900 whitespace-nowrap">
                                {rowPeriodLabel}
                              </td>
                              <td className="py-2.5 px-3 text-right tabular-nums text-blue-700 font-medium">
                                {formatReportsPeso(row.revenue)}
                              </td>
                              <td className="py-2.5 px-3 text-right tabular-nums text-gray-900">
                                {row.orders.toLocaleString()}
                              </td>
                              <td className="py-2.5 px-3 text-right tabular-nums text-gray-900">
                                {formatReportsPesoFull(row.avgOrderValue)}
                              </td>
                              <td
                                className={`py-2.5 px-3 text-right tabular-nums font-medium ${getGrowthColor(row.growth)}`}
                              >
                                {row.growth > 0 ? '+' : ''}
                                {row.growth.toFixed(1)}%
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                {getGrowthIcon(row.growth)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Collection performance</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <FinanceRow
                  label="Collected on time"
                  value={formatReportsPesoFull(enh.collectionCompare.collectedCurrent)}
                />
                <FinanceRow
                  label="On-time collection rate"
                  value={`${enh.collectionCompare.collectionRateCurrent.toFixed(1)}%`}
                />
                <FinanceRow
                  label="Overdue balance"
                  value={formatReportsPesoFull(enh.collectionCompare.overdueBalanceCurrent)}
                  danger={enh.collectionCompare.overdueBalanceCurrent > 0}
                />
                <FinanceRow
                  label="Matured order value"
                  value={formatReportsPesoFull(enh.collectionCompare.maturedGrossCurrent)}
                />
                <FinanceRow
                  label="Prior period on-time rate"
                  value={`${enh.collectionCompare.collectionRatePrev.toFixed(1)}%`}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Customers ({periodLabel})</CardTitle>
                  <p className="text-xs text-gray-500 mt-1">
                    Period sales with live receivables · sort by any column to find overdue or top AR
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/finance')}>
                  Open finance
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {salesCustomersRaw.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center px-6">No customer orders in this period.</p>
              ) : (
                <>
                  <div className="px-6 pt-2">
                    <ReportsTableToolbar
                      search={salesCustSearch}
                      onSearchChange={setSalesCustSearch}
                      placeholder="Search customer, code, or agent…"
                      resultLabel={`${sortedSalesCustomers.length} of ${salesCustomersRaw.length} customers`}
                    >
                      <ReportsFilterSelect
                        label="Filter by agent"
                        value={salesCustAgentFilter}
                        onChange={setSalesCustAgentFilter}
                        options={[
                          { value: '', label: 'All agents' },
                          ...salesAgentOptions.map((a) => ({ value: a, label: a })),
                        ]}
                      />
                      <ReportsFilterSelect
                        label="Filter by receivables"
                        value={salesCustArFilter}
                        onChange={setSalesCustArFilter}
                        options={[
                          { value: '', label: 'All customers' },
                          { value: 'with_ar', label: 'With outstanding' },
                          { value: 'no_ar', label: 'No outstanding' },
                          { value: 'overdue', label: 'Overdue only' },
                          { value: 'not_overdue', label: 'Not overdue' },
                          { value: 'high_credit', label: 'High credit use (80%+)' },
                        ]}
                      />
                    </ReportsTableToolbar>
                  </div>
                  {sortedSalesCustomers.length === 0 ? (
                    <p className="text-sm text-gray-500 py-6 text-center px-6">No customers match your search or filters.</p>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-y border-gray-200">
                            <tr>
                              <ReportsSortTh col="customer" label="Customer" sortKey={salesCustSort.sortKey} sortDir={salesCustSort.sortDir} onSort={salesCustSort.onSort} />
                              <ReportsSortTh col="agent" label="Agent" sortKey={salesCustSort.sortKey} sortDir={salesCustSort.sortDir} onSort={salesCustSort.onSort} className="hidden md:table-cell" />
                              <ReportsSortTh col="branch" label="Branch" sortKey={salesCustSort.sortKey} sortDir={salesCustSort.sortDir} onSort={salesCustSort.onSort} className="hidden lg:table-cell" />
                              <ReportsSortTh col="orderCount" label="Orders" sortKey={salesCustSort.sortKey} sortDir={salesCustSort.sortDir} onSort={salesCustSort.onSort} align="right" />
                              <ReportsSortTh col="revenue" label="Revenue" sortKey={salesCustSort.sortKey} sortDir={salesCustSort.sortDir} onSort={salesCustSort.onSort} align="right" />
                              <ReportsSortTh col="averageOrderValue" label="AOV" sortKey={salesCustSort.sortKey} sortDir={salesCustSort.sortDir} onSort={salesCustSort.onSort} align="right" className="hidden sm:table-cell" />
                              <ReportsSortTh col="outstandingBalance" label="Outstanding" sortKey={salesCustSort.sortKey} sortDir={salesCustSort.sortDir} onSort={salesCustSort.onSort} align="right" />
                              <ReportsSortTh col="creditUtilizationPct" label="Credit use" sortKey={salesCustSort.sortKey} sortDir={salesCustSort.sortDir} onSort={salesCustSort.onSort} align="right" className="hidden md:table-cell" />
                              <ReportsSortTh col="overdueBalance" label="Overdue" sortKey={salesCustSort.sortKey} sortDir={salesCustSort.sortDir} onSort={salesCustSort.onSort} align="right" />
                              <ReportsSortTh col="maxDaysOverdue" label="Days" sortKey={salesCustSort.sortKey} sortDir={salesCustSort.sortDir} onSort={salesCustSort.onSort} align="center" className="hidden sm:table-cell" />
                              <ReportsSortTh col="overdueOrderCount" label="Late orders" sortKey={salesCustSort.sortKey} sortDir={salesCustSort.sortDir} onSort={salesCustSort.onSort} align="right" className="hidden lg:table-cell" />
                              <ReportsSortTh col="oldestDueDate" label="Oldest due" sortKey={salesCustSort.sortKey} sortDir={salesCustSort.sortDir} onSort={salesCustSort.onSort} className="hidden xl:table-cell" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {pagedSalesCustomers.map((c) => (
                              <tr key={c.customerId} className="hover:bg-gray-50/80">
                                <td className="py-2.5 px-3">
                                  <DashLink
                                    to={`/customers/${c.customerId}`}
                                    title={`Open customer ${c.customerName}`}
                                  >
                                    {c.customerName}
                                  </DashLink>
                                  {c.customerCode ? (
                                    <DashLink
                                      to={`/customers/${c.customerId}`}
                                      className="block text-xs text-blue-600 hover:text-blue-800 hover:underline font-mono mt-0.5"
                                      title={`Open customer ${c.customerCode}`}
                                    >
                                      {c.customerCode}
                                    </DashLink>
                                  ) : null}
                                </td>
                                <td className="py-2.5 px-3 hidden md:table-cell">
                                  {c.agentName ? (
                                    c.agentId ? (
                                      <DashLink
                                        to={`/employees/${encodeURIComponent(c.agentId)}`}
                                        title={`Open agent ${c.agentName}`}
                                      >
                                        {c.agentName}
                                      </DashLink>
                                    ) : (
                                      <span className="text-gray-600">{c.agentName}</span>
                                    )
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-gray-600 hidden lg:table-cell">{c.branchName ?? '—'}</td>
                                <td className="py-2.5 px-3 text-right tabular-nums">{c.orderCount}</td>
                                <td className="py-2.5 px-3 text-right tabular-nums">{formatReportsPesoFull(c.revenue)}</td>
                                <td className="py-2.5 px-3 text-right tabular-nums hidden sm:table-cell">
                                  {formatReportsPesoFull(c.averageOrderValue)}
                                </td>
                                <td className="py-2.5 px-3 text-right tabular-nums">
                                  {c.outstandingBalance > 0 ? (
                                    <span className="font-medium">{formatReportsPesoFull(c.outstandingBalance)}</span>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right tabular-nums hidden md:table-cell">
                                  {c.creditUtilizationPct != null ? (
                                    <span
                                      className={
                                        c.creditUtilizationPct >= 90
                                          ? 'text-red-700 font-medium'
                                          : c.creditUtilizationPct >= 75
                                            ? 'text-amber-700 font-medium'
                                            : 'text-gray-900'
                                      }
                                      title={`${formatReportsPesoFull(c.creditUsed)} of ${formatReportsPesoFull(c.creditLimit)} limit`}
                                    >
                                      {c.creditUtilizationPct.toFixed(0)}%
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right tabular-nums">
                                  {c.overdueBalance > 0 ? (
                                    <span className="text-red-700 font-medium">{formatReportsPesoFull(c.overdueBalance)}</span>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-center hidden sm:table-cell">
                                  {c.maxDaysOverdue > 0 ? (
                                    <Badge variant={c.maxDaysOverdue > 60 ? 'danger' : c.maxDaysOverdue > 30 ? 'warning' : 'default'}>
                                      {c.maxDaysOverdue}d
                                    </Badge>
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right text-gray-600 hidden lg:table-cell tabular-nums">
                                  {c.overdueOrderCount > 0 ? c.overdueOrderCount : '—'}
                                </td>
                                <td className="py-2.5 px-3 text-gray-600 hidden xl:table-cell">{c.oldestDueDate ?? '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <TablePagination
                        page={salesCustPage}
                        total={sortedSalesCustomers.length}
                        onPageChange={setSalesCustPage}
                      />
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* AGENTS */}
      {viewMode === 'agents' && (
        <div className="space-y-6">
          {canCompareAgents && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Agent comparison scope</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {agentCompareMode === 'allBranches'
                    ? 'Ranking all agents org-wide for the selected period.'
                    : `Agents assigned to ${branchLabel} only.`}
                </p>
              </div>
              <div
                className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 shrink-0"
                role="tablist"
                aria-label="Agent comparison scope"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={agentCompareMode === 'scoped'}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    agentCompareMode === 'scoped'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  onClick={() => setAgentCompareMode('scoped')}
                >
                  This branch
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={agentCompareMode === 'allBranches'}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    agentCompareMode === 'allBranches'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  onClick={() => setAgentCompareMode('allBranches')}
                >
                  All branches
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatKpiCard
              label="Top performer"
              value={topAgentByRevenue?.agentName ?? '—'}
              tone="amber"
              icon={<Medal />}
              sub={
                topAgentByRevenue ? (
                  <span className="text-gray-500">
                    {formatReportsPesoExact(topAgentByRevenue.revenue)} sales · {agentsScopeLabel}
                  </span>
                ) : (
                  <span className="text-gray-500">No agent data</span>
                )
              }
            />
            <StatKpiCard
              label="Total agents"
              value={String(agentsTabSummary.totalAgents)}
              tone="blue"
              icon={<Users />}
              sub={<span className="text-gray-500">{agentsScopeLabel}</span>}
            />
            <StatKpiCard
              label="Avg achievement"
              value={`${agentsTabSummary.attainmentAvgPct.toFixed(0)}%`}
              tone="emerald"
              icon={<Target />}
              sub={
                <span className="text-gray-500">
                  {agentsTabSummary.attainmentAvgPct >= 100
                    ? 'Above target'
                    : `${agentsTabSummary.agentsAboveQuota} above quota`}
                </span>
              }
            />
            <StatKpiCard
              label="Total commission"
              value={formatReportsPesoExact(agentsTabSummary.commissionEarned)}
              tone="violet"
              icon={<Wallet />}
              sub={<span className="text-gray-500">Earned this period · {agentsScopeLabel}</span>}
            />
          </div>

          {agentsDisplay.agents.length > 0 && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Agent performance vs target</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={agentChartRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={56} />
                        <YAxis
                          domain={[0, 140]}
                          tickFormatter={(v) => `${v}%`}
                          tick={{ fontSize: 10 }}
                          width={40}
                        />
                        <Tooltip formatter={(v: number) => [`${v}%`, 'Achievement']} />
                        <ReferenceLine
                          y={100}
                          stroke="#ef4444"
                          strokeDasharray="4 4"
                          label={{ value: 'Target', position: 'insideTopRight', fill: '#ef4444', fontSize: 11 }}
                        />
                        <Bar dataKey="attainment" name="Achievement" radius={[4, 4, 0, 0]}>
                          {agentChartRows.map((row) => (
                            <Cell key={row.agentId} fill={row.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sales by agent</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={agentSalesChartRows}
                        layout="vertical"
                        margin={{ left: 4, right: 16, top: 4, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis
                          type="number"
                          tickFormatter={(v) => formatReportsPeso(v as number)}
                          tick={{ fontSize: 10 }}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={100}
                          tick={{ fontSize: 11 }}
                        />
                        <Tooltip formatter={(v: number) => formatReportsPesoFull(v)} />
                        <Bar dataKey="revenue" name="Sales" radius={[0, 4, 4, 0]}>
                          {agentSalesChartRows.map((row) => (
                            <Cell key={row.agentId} fill={row.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Detailed agent performance metrics</CardTitle>
                  <p className="text-xs text-gray-500 mt-1">{agentsScopeLabel} · {periodLabel}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/agents')}>
                  Full analytics
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {agentsDisplay.agents.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">No agent activity in this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-y border-gray-200">
                      <tr>
                        <ReportsSortTh col="agent" label="Agent" sortKey={agentsPerfSort.sortKey} sortDir={agentsPerfSort.sortDir} onSort={agentsPerfSort.onSort} />
                        {showAgentBranchCol ? (
                          <ReportsSortTh col="branch" label="Branch" sortKey={agentsPerfSort.sortKey} sortDir={agentsPerfSort.sortDir} onSort={agentsPerfSort.onSort} className="hidden sm:table-cell" />
                        ) : null}
                        <ReportsSortTh col="revenue" label="Sales" sortKey={agentsPerfSort.sortKey} sortDir={agentsPerfSort.sortDir} onSort={agentsPerfSort.onSort} align="right" />
                        <ReportsSortTh col="effectiveTarget" label="Target" sortKey={agentsPerfSort.sortKey} sortDir={agentsPerfSort.sortDir} onSort={agentsPerfSort.onSort} align="right" className="hidden sm:table-cell" />
                        <ReportsSortTh col="attainmentPct" label="Achievement" sortKey={agentsPerfSort.sortKey} sortDir={agentsPerfSort.sortDir} onSort={agentsPerfSort.onSort} align="left" className="min-w-[140px]" />
                        <ReportsSortTh col="orderCount" label="Orders" sortKey={agentsPerfSort.sortKey} sortDir={agentsPerfSort.sortDir} onSort={agentsPerfSort.onSort} align="right" />
                        <ReportsSortTh col="distinctCustomers" label="Customers" sortKey={agentsPerfSort.sortKey} sortDir={agentsPerfSort.sortDir} onSort={agentsPerfSort.onSort} align="right" className="hidden md:table-cell" />
                        <ReportsSortTh col="avgDiscountPercent" label="Avg discount" sortKey={agentsPerfSort.sortKey} sortDir={agentsPerfSort.sortDir} onSort={agentsPerfSort.onSort} align="right" className="hidden md:table-cell" />
                        <ReportsSortTh col="commissionEarned" label="Commission" sortKey={agentsPerfSort.sortKey} sortDir={agentsPerfSort.sortDir} onSort={agentsPerfSort.onSort} align="right" className="hidden lg:table-cell" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pagedAgentsForTable.map((a) => (
                            <tr key={a.agentId} className="hover:bg-gray-50/80">
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2 min-w-0">
                                  <AgentColorSwatch agentId={a.agentId} title={a.agentName} />
                                  <DashLink
                                    to={employeeProfilePathFromAgent(a.employeePublicId, a.agentId)}
                                    title={`Open agent ${a.agentName}`}
                                    className={`${DASH_LINK_CLASS} truncate block font-medium`}
                                  >
                                    {a.agentName}
                                  </DashLink>
                                </div>
                              </td>
                              {showAgentBranchCol ? (
                                <td className="py-2.5 px-3 text-gray-600 hidden sm:table-cell">
                                  {a.branchName ?? '—'}
                                </td>
                              ) : null}
                              <td className="py-2.5 px-3 text-right tabular-nums font-semibold" style={{ color: agentChartColor(a.agentId) }}>
                                {formatReportsPeso(a.revenue)}
                              </td>
                              <td className="py-2.5 px-3 text-right tabular-nums text-gray-700 hidden sm:table-cell">
                                {a.effectiveTarget > 0 ? formatReportsPeso(a.effectiveTarget) : '—'}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span
                                    className={`text-xs font-semibold tabular-nums ${
                                      a.attainmentPct >= 100
                                        ? 'text-emerald-700'
                                        : a.attainmentPct >= 85
                                          ? 'text-amber-700'
                                          : 'text-red-700'
                                    }`}
                                  >
                                    {a.attainmentPct.toFixed(0)}%
                                  </span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className={`h-1.5 rounded-full ${agentAttainmentBarColor(a.attainmentPct)}`}
                                    style={{ width: `${Math.min(100, Math.max(2, a.attainmentPct))}%` }}
                                  />
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right tabular-nums text-gray-900">
                                {a.orderCount}
                              </td>
                              <td className="py-2.5 px-3 text-right tabular-nums text-gray-900 hidden md:table-cell">
                                {a.distinctCustomers}
                              </td>
                              <td className="py-2.5 px-3 text-right tabular-nums hidden md:table-cell">
                                {a.avgDiscountPercent > 0 ? (
                                  <span
                                    className={
                                      a.avgDiscountPercent >= 15
                                        ? 'text-amber-700 font-medium'
                                        : 'text-gray-900'
                                    }
                                    title="Average line discount % on orders in period"
                                  >
                                    {a.avgDiscountPercent.toFixed(1)}%
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right tabular-nums font-medium text-emerald-600 hidden lg:table-cell">
                                {formatReportsPesoExact(a.commissionEarned)}
                              </td>
                            </tr>
                          ))}
                    </tbody>
                  </table>
                  <TablePagination
                    page={agentsPerfPageSafe}
                    total={sortedAgentsForTable.length}
                    onPageChange={setAgentsPerfPage}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {agentsDisplay.branches.length > 0 && agentCompareMode === 'allBranches' && agentsAllBranches && (
            <Card>
              <CardHeader><CardTitle>Branch comparison</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-y border-gray-200">
                      <tr>
                        <ReportsSortTh col="branch" label="Branch" sortKey={agentsBranchSort.sortKey} sortDir={agentsBranchSort.sortDir} onSort={agentsBranchSort.onSort} />
                        <ReportsSortTh col="revenue" label="Revenue" sortKey={agentsBranchSort.sortKey} sortDir={agentsBranchSort.sortDir} onSort={agentsBranchSort.onSort} align="right" />
                        <ReportsSortTh col="avgMarginPct" label="Margin" sortKey={agentsBranchSort.sortKey} sortDir={agentsBranchSort.sortDir} onSort={agentsBranchSort.onSort} align="right" />
                        <ReportsSortTh col="outstanding" label="Outstanding" sortKey={agentsBranchSort.sortKey} sortDir={agentsBranchSort.sortDir} onSort={agentsBranchSort.onSort} align="right" />
                        <ReportsSortTh col="rank" label="Rank" sortKey={agentsBranchSort.sortKey} sortDir={agentsBranchSort.sortDir} onSort={agentsBranchSort.onSort} align="right" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sortedBranchesForTable.map((b) => (
                        <tr key={b.branchId} className="hover:bg-gray-50/80">
                          <td className="py-2.5 px-3 font-medium text-gray-900">{b.branchName}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums">{formatReportsPesoFull(b.revenue)}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums">{b.avgMarginPct.toFixed(1)}%</td>
                          <td className="py-2.5 px-3 text-right tabular-nums">{formatReportsPesoFull(b.outstanding)}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums">#{b.rank}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* PRODUCTS */}
      {viewMode === 'products' && (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <ReportsTableToolbar
                search={productSearch}
                onSearchChange={setProductSearch}
                placeholder="Search products in selected category…"
                resultLabel={
                  productViewCategory
                    ? `${sortedProducts.length} product${sortedProducts.length === 1 ? '' : 's'} in ${productViewCategory}`
                    : `${sortedProducts.length} products`
                }
              >
                {selectedProductIds.length > 0 ? (
                  <Button variant="outline" size="sm" onClick={() => setSelectedProductIds([])}>
                    Clear chart selection ({selectedProductIds.length})
                  </Button>
                ) : null}
              </ReportsTableToolbar>
              <p className="text-xs text-gray-500 -mt-2">
                Select products in the table to see variant breakdown, top customers, and focused charts (up to 6).
              </p>
            </CardContent>
          </Card>

          {categoryMarginSource.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Category performance</CardTitle>
                <p className="text-xs text-gray-500 mt-1">
                  {visibleCategoryNames.length} of {categoryMarginSource.length} categories in charts · {periodLabel} · {branchLabel}
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <PieChartIcon className="w-4 h-4 text-violet-600" />
                      Revenue share
                    </h3>
                    {categoryPieData.length === 0 ? (
                      <p className="text-sm text-gray-500 py-8 text-center">No category revenue in this period.</p>
                    ) : (
                      <ReportsChartFrame
                        height={256}
                        render={({ width, height }) => (
                          <PieChart width={width} height={height}>
                            <Pie
                              data={categoryPieData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={48}
                              outerRadius={78}
                              paddingAngle={2}
                            >
                              {categoryPieData.map((entry) => (
                                <Cell
                                  key={entry.key}
                                  fill={entry.key === 'other' ? '#9CA3AF' : agentChartColor(entry.key)}
                                />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v: number) => formatReportsPesoFull(v)} />
                            <Legend {...reportsChartLegendProps(categoryPieData.length)} />
                          </PieChart>
                        )}
                      />
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      Monthly revenue trend
                      {categoryTrendLines.length < categoryMarginSource.length ? (
                        <span className="text-xs font-normal text-gray-500">
                          · {categoryTrendLines.length} selected
                        </span>
                      ) : null}
                    </h3>
                    {categoryTrendChartData.length === 0 ? (
                      <p className="text-sm text-gray-500 py-8 text-center">No monthly trend data.</p>
                    ) : (
                      <ReportsChartFrame
                        height={256}
                        render={({ width, height }) => (
                          <ComposedChart width={width} height={height} data={categoryTrendChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                            <YAxis tickFormatter={(v) => formatReportsPeso(v as number)} tick={{ fontSize: 10 }} width={52} />
                            <Tooltip formatter={(v: number) => formatReportsPesoFull(v)} />
                            <Legend {...reportsChartLegendProps(categoryTrendLines.length)} />
                            {categoryTrendLines.map((c) => (
                              <Line
                                key={c.categoryName}
                                type="monotone"
                                dataKey={c.categoryName}
                                name={c.categoryName}
                                stroke={agentChartColor(c.categoryName)}
                                strokeWidth={2}
                                dot={{ r: 3, fill: agentChartColor(c.categoryName) }}
                              />
                            ))}
                          </ComposedChart>
                        )}
                      />
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <h3 className="text-sm font-semibold text-gray-800">Detailed metrics</h3>
                    {visibleCategoryNames.length < categoryMarginSource.length ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setVisibleCategoryNames(
                            categoryMarginSource.map((c) => c.categoryName),
                          )
                        }
                      >
                        Show all in charts
                      </Button>
                    ) : null}
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-200">
                        <tr>
                          <th className="py-2.5 px-2 w-10 text-center" aria-label="Show in charts">
                            <span className="sr-only">Chart</span>
                          </th>
                          <ReportsSortTh col="category" label="Category" sortKey={productCategorySort.sortKey} sortDir={productCategorySort.sortDir} onSort={productCategorySort.onSort} />
                          <ReportsSortTh col="unitsSold" label="Units" sortKey={productCategorySort.sortKey} sortDir={productCategorySort.sortDir} onSort={productCategorySort.onSort} align="right" />
                          <ReportsSortTh col="revenue" label="Revenue" sortKey={productCategorySort.sortKey} sortDir={productCategorySort.sortDir} onSort={productCategorySort.onSort} align="right" />
                          <ReportsSortTh col="profit" label="Profit" sortKey={productCategorySort.sortKey} sortDir={productCategorySort.sortDir} onSort={productCategorySort.onSort} align="right" className="hidden sm:table-cell" />
                          <ReportsSortTh col="marginPct" label="Margin" sortKey={productCategorySort.sortKey} sortDir={productCategorySort.sortDir} onSort={productCategorySort.onSort} align="right" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {categoryRowsForSection.map((c) => {
                          const chartVisible = visibleCategoryNames.includes(c.categoryName);
                          const onlyOneVisible = visibleCategoryNames.length <= 1;
                          return (
                          <tr
                            key={c.categoryName}
                            className={chartVisible ? 'hover:bg-gray-50/80' : 'opacity-50 hover:bg-gray-50/60'}
                          >
                            <td className="py-2.5 px-2 text-center">
                              <input
                                type="checkbox"
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
                                checked={chartVisible}
                                disabled={chartVisible && onlyOneVisible}
                                title={
                                  chartVisible && onlyOneVisible
                                    ? 'At least one category must stay visible'
                                    : chartVisible
                                      ? 'Hide from charts'
                                      : 'Show in charts'
                                }
                                onChange={() => toggleCategoryVisible(c.categoryName)}
                                aria-label={`${chartVisible ? 'Hide' : 'Show'} ${c.categoryName} in charts`}
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: agentChartColor(c.categoryName) }}
                                  aria-hidden
                                />
                                <DashLink
                                  to={productCategoryHref(c.categorySlug, c.categoryName)}
                                  className={`${DASH_LINK_CLASS} font-medium truncate`}
                                >
                                  {c.categoryName}
                                </DashLink>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-right tabular-nums">{c.unitsSold.toLocaleString()}</td>
                            <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-blue-600">
                              {formatReportsPesoFull(c.revenue)}
                            </td>
                            <td className="py-2.5 px-3 text-right tabular-nums hidden sm:table-cell">
                              {formatReportsPesoFull(c.profit)}
                            </td>
                            <td className="py-2.5 px-3 text-right tabular-nums">{c.marginPct.toFixed(1)}%</td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {productsInViewCategory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Product revenue ({periodLabel})</CardTitle>
                <p className="text-xs text-gray-500 mt-1">
                  {branchLabel}
                  {selectedProductIds.length > 0 ? (
                    <span> · {selectedProductIds.length} product{selectedProductIds.length === 1 ? '' : 's'} selected</span>
                  ) : productViewCategory ? (
                    <span> · all products in {productViewCategory}</span>
                  ) : null}
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <PieChartIcon className="w-4 h-4 text-violet-600" />
                      Revenue share
                    </h3>
                    {productPieData.length === 0 ? (
                      <p className="text-sm text-gray-500 py-8 text-center">No product revenue in this view.</p>
                    ) : (
                      <ReportsChartFrame
                        height={256}
                        render={({ width, height }) => (
                          <PieChart width={width} height={height}>
                            <Pie
                              data={productPieData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={48}
                              outerRadius={78}
                              paddingAngle={2}
                            >
                              {productPieData.map((entry) => (
                                <Cell
                                  key={entry.key}
                                  fill={entry.key === 'other' ? '#9CA3AF' : agentChartColor(entry.key)}
                                />
                              ))}
                            </Pie>
                            <Tooltip formatter={(v: number) => formatReportsPesoFull(v)} />
                            <Legend {...reportsChartLegendProps(productPieData.length)} />
                          </PieChart>
                        )}
                      />
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      Monthly revenue trend
                      {selectedProductIds.length === 0 && productTrendLines.length < productChartRows.length ? (
                        <span className="text-xs font-normal text-gray-500">
                          · top {productTrendLines.length} products
                        </span>
                      ) : null}
                    </h3>
                    {productTrendChartData.length === 0 ? (
                      <p className="text-sm text-gray-500 py-8 text-center">No monthly trend data.</p>
                    ) : (
                      <ReportsChartFrame
                        height={256}
                        render={({ width, height }) => (
                          <ComposedChart width={width} height={height} data={productTrendChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                            <YAxis tickFormatter={(v) => formatReportsPeso(v as number)} tick={{ fontSize: 10 }} width={52} />
                            <Tooltip formatter={(v: number) => formatReportsPesoFull(v)} />
                            <Legend {...reportsChartLegendProps(productTrendLines.length)} />
                            {productTrendLines.map((p) => {
                              const colorKey = p.productId ?? p.productName;
                              return (
                                <Line
                                  key={colorKey}
                                  type="monotone"
                                  dataKey={p.productName}
                                  name={p.productName}
                                  stroke={agentChartColor(colorKey)}
                                  strokeWidth={2}
                                  dot={{ r: 3, fill: agentChartColor(colorKey) }}
                                />
                              );
                            })}
                          </ComposedChart>
                        )}
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Product sales ({periodLabel})</CardTitle>
                  <p className="text-xs text-gray-500 mt-1">{branchLabel}</p>
                </div>
                {productCategoryOptions.length > 0 ? (
                  <ReportsFilterSelect
                    label="Category"
                    value={productViewCategory}
                    onChange={setProductViewCategory}
                    options={productCategoryOptions.map((name) => ({ value: name, label: name }))}
                  />
                ) : null}
              </div>
            </CardHeader>
            <CardContent>
              {bundle.productsInPeriod.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">No product sales in this period.</p>
              ) : sortedProducts.length === 0 ? (
                <p className="text-sm text-gray-500 py-6 text-center">No products match your filters.</p>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-y border-gray-200">
                        <tr>
                          <th className="py-2.5 px-2 w-10 text-center" aria-label="Compare on chart">
                            <span className="sr-only">Compare</span>
                          </th>
                          <ReportsSortTh col="product" label="Product" sortKey={productsSort.sortKey} sortDir={productsSort.sortDir} onSort={productsSort.onSort} />
                          <ReportsSortTh col="category" label="Category" sortKey={productsSort.sortKey} sortDir={productsSort.sortDir} onSort={productsSort.onSort} className="hidden sm:table-cell" />
                          <ReportsSortTh col="unitsSold" label="Units" sortKey={productsSort.sortKey} sortDir={productsSort.sortDir} onSort={productsSort.onSort} align="right" />
                          <ReportsSortTh col="orderCount" label="Orders" sortKey={productsSort.sortKey} sortDir={productsSort.sortDir} onSort={productsSort.onSort} align="right" className="hidden md:table-cell" />
                          <ReportsSortTh col="revenue" label="Revenue" sortKey={productsSort.sortKey} sortDir={productsSort.sortDir} onSort={productsSort.onSort} align="right" />
                          <ReportsSortTh col="profit" label="Profit" sortKey={productsSort.sortKey} sortDir={productsSort.sortDir} onSort={productsSort.onSort} align="right" className="hidden lg:table-cell" />
                          <ReportsSortTh col="marginPct" label="Margin" sortKey={productsSort.sortKey} sortDir={productsSort.sortDir} onSort={productsSort.onSort} align="right" className="hidden lg:table-cell" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {pagedProducts.map((p) => {
                          const rowKey = p.productId ?? p.productName;
                          const selected = p.productId ? selectedProductIds.includes(p.productId) : false;
                          const atMax = selectedProductIds.length >= 6 && !selected;
                          return (
                            <tr key={rowKey} className={selected ? 'bg-blue-50/40 hover:bg-blue-50/60' : 'hover:bg-gray-50/80'}>
                              <td className="py-2.5 px-2 text-center">
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
                                  checked={selected}
                                  disabled={!p.productId || atMax}
                                  title={
                                    !p.productId
                                      ? 'No product link available'
                                      : atMax
                                        ? 'Maximum 6 products selected'
                                        : 'Select for charts and top customers'
                                  }
                                  onChange={() => toggleProductCompare(p.productId)}
                                  aria-label={`Select ${p.productName} for charts`}
                                />
                              </td>
                              <td className="py-2.5 px-3">
                                {p.productId ? (
                                  <DashLink
                                    to={finishedGoodProductHref(p.productId, p.categorySlug)}
                                    title={`Open ${p.productName}`}
                                    className={`${DASH_LINK_CLASS} font-medium`}
                                  >
                                    {p.productName}
                                  </DashLink>
                                ) : (
                                  <span className="font-medium text-gray-900">{p.productName}</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 hidden sm:table-cell">
                                <DashLink
                                  to={productCategoryHref(p.categorySlug, p.categoryName)}
                                  className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
                                >
                                  {p.categoryName}
                                </DashLink>
                              </td>
                              <td className="py-2.5 px-3 text-right tabular-nums">{p.unitsSold.toLocaleString()}</td>
                              <td className="py-2.5 px-3 text-right tabular-nums hidden md:table-cell">{p.orderCount}</td>
                              <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-blue-600">
                                {formatReportsPesoFull(p.revenue)}
                              </td>
                              <td className="py-2.5 px-3 text-right tabular-nums hidden lg:table-cell">
                                {formatReportsPesoFull(p.profit)}
                              </td>
                              <td className="py-2.5 px-3 text-right tabular-nums hidden lg:table-cell">
                                {p.marginPct.toFixed(1)}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <TablePagination
                    page={productsPageSafe}
                    total={sortedProducts.length}
                    onPageChange={setProductsPage}
                  />
                </>
              )}
            </CardContent>
          </Card>

          {selectedProductIds.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <CardTitle>Variant breakdown</CardTitle>
                    <p className="text-xs text-gray-500 mt-1">
                      SKU-level sales for selected products · {periodLabel}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <p className="text-xs text-gray-500 tabular-nums mr-1">
                      {sortedProductVariants.length} variant{sortedProductVariants.length === 1 ? '' : 's'}
                    </p>
                    <div
                      className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50"
                      role="tablist"
                      aria-label="Variant breakdown view"
                    >
                      {(['chart', 'table'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          role="tab"
                          aria-selected={productVariantView === mode}
                          onClick={() => setProductVariantView(mode)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                            productVariantView === mode
                              ? 'bg-white text-gray-900 shadow-sm'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          {mode === 'chart' ? (
                            <BarChart3 className="w-3.5 h-3.5" aria-hidden />
                          ) : (
                            <Table2 className="w-3.5 h-3.5" aria-hidden />
                          )}
                          {mode === 'chart' ? 'Chart' : 'Table'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                  {sortedProductVariants.length === 0 ? (
                    <p className="text-sm text-gray-500 py-6 text-center">
                      No variant-level sales for the selected products in this period.
                    </p>
                  ) : productVariantView === 'chart' ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2.5">
                          <p className="text-xs text-gray-500">Variants sold</p>
                          <p className="text-lg font-bold tabular-nums text-gray-900">{variantSummary.count}</p>
                        </div>
                        <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2.5">
                          <p className="text-xs text-gray-500">Total units</p>
                          <p className="text-lg font-bold tabular-nums text-gray-900">
                            {variantSummary.units.toLocaleString()}
                          </p>
                        </div>
                        <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2.5 col-span-2 sm:col-span-2">
                          <p className="text-xs text-gray-500">Total revenue</p>
                          <p className="text-lg font-bold tabular-nums text-blue-600">
                            {formatReportsPesoFull(variantSummary.revenue)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <PieChartIcon className="w-4 h-4 text-violet-600" />
                            Revenue share
                          </h4>
                          <ReportsChartFrame
                            height={256}
                            render={({ width, height }) => (
                              <PieChart width={width} height={height}>
                                <Pie
                                  data={variantPieData}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="45%"
                                  innerRadius={48}
                                  outerRadius={72}
                                  paddingAngle={2}
                                >
                                  {variantPieData.map((entry) => (
                                    <Cell
                                      key={entry.key}
                                      fill={entry.key === 'other' ? '#9CA3AF' : agentChartColor(entry.key)}
                                    />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(v: number) => formatReportsPesoFull(v)} />
                                <Legend {...reportsChartLegendProps(variantPieData.length)} />
                              </PieChart>
                            )}
                          />
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <BarChart3 className="w-4 h-4 text-blue-600" />
                            Revenue by variant
                            {sortedProductVariants.length > variantBarChartData.length ? (
                              <span className="text-xs font-normal text-gray-500">
                                · top {variantBarChartData.length}
                              </span>
                            ) : null}
                          </h4>
                          <ReportsChartFrame
                            height={288}
                            render={({ width, height }) => (
                              <BarChart
                                width={width}
                                height={height}
                                data={variantBarChartData}
                                margin={{ top: 8, right: 12, left: 4, bottom: 56 }}
                                barSize={18}
                              >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                  dataKey="name"
                                  tick={{ fontSize: 10 }}
                                  interval={0}
                                  angle={multiProductVariantSelection ? -32 : -20}
                                  textAnchor="end"
                                  height={56}
                                />
                                <YAxis
                                  tickFormatter={(v) => formatReportsPeso(v as number)}
                                  tick={{ fontSize: 10 }}
                                  width={52}
                                />
                                <Tooltip
                                  formatter={(v: number, _name: string, item: { payload?: { units?: number; shareOfProductPct?: number; detail?: string } }) => {
                                    const units = item.payload?.units;
                                    const share = item.payload?.shareOfProductPct;
                                    const parts = [formatReportsPesoFull(v)];
                                    if (units != null) parts.push(`${units.toLocaleString()} units`);
                                    if (share != null && multiProductVariantSelection) {
                                      parts.push(`${share.toFixed(1)}% of product`);
                                    }
                                    return [parts.join(' · '), 'Revenue'];
                                  }}
                                  labelFormatter={(_label, payload) => {
                                    const row = payload?.[0]?.payload as { detail?: string } | undefined;
                                    return row?.detail ?? _label;
                                  }}
                                />
                                <Bar dataKey="revenue" name="Revenue" radius={[4, 4, 0, 0]}>
                                  {variantBarChartData.map((entry) => (
                                    <Cell key={entry.key} fill={entry.fill} />
                                  ))}
                                </Bar>
                              </BarChart>
                            )}
                          />
                        </div>
                      </div>

                      <p className="text-xs text-gray-500">
                        Switch to <button type="button" className="text-blue-600 hover:underline font-medium" onClick={() => setProductVariantView('table')}>Table</button> for full SKU metrics, sorting, and pagination.
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-200">
                            <tr>
                              <ReportsSortTh
                                col="product"
                                label="Product"
                                sortKey={productVariantsSort.sortKey}
                                sortDir={productVariantsSort.sortDir}
                                onSort={productVariantsSort.onSort}
                                className={selectedProductIds.length <= 1 ? 'hidden lg:table-cell' : undefined}
                              />
                              <ReportsSortTh
                                col="sku"
                                label="SKU"
                                sortKey={productVariantsSort.sortKey}
                                sortDir={productVariantsSort.sortDir}
                                onSort={productVariantsSort.onSort}
                              />
                              <ReportsSortTh
                                col="size"
                                label="Size"
                                sortKey={productVariantsSort.sortKey}
                                sortDir={productVariantsSort.sortDir}
                                onSort={productVariantsSort.onSort}
                                className="hidden sm:table-cell"
                              />
                              <ReportsSortTh
                                col="unitsSold"
                                label="Units"
                                sortKey={productVariantsSort.sortKey}
                                sortDir={productVariantsSort.sortDir}
                                onSort={productVariantsSort.onSort}
                                align="right"
                              />
                              <ReportsSortTh
                                col="orderCount"
                                label="Orders"
                                sortKey={productVariantsSort.sortKey}
                                sortDir={productVariantsSort.sortDir}
                                onSort={productVariantsSort.onSort}
                                align="right"
                                className="hidden md:table-cell"
                              />
                              <ReportsSortTh
                                col="shareOfProductPct"
                                label="Share"
                                sortKey={productVariantsSort.sortKey}
                                sortDir={productVariantsSort.sortDir}
                                onSort={productVariantsSort.onSort}
                                align="right"
                                className="hidden lg:table-cell"
                              />
                              <ReportsSortTh
                                col="revenue"
                                label="Revenue"
                                sortKey={productVariantsSort.sortKey}
                                sortDir={productVariantsSort.sortDir}
                                onSort={productVariantsSort.onSort}
                                align="right"
                              />
                              <ReportsSortTh
                                col="profit"
                                label="Profit"
                                sortKey={productVariantsSort.sortKey}
                                sortDir={productVariantsSort.sortDir}
                                onSort={productVariantsSort.onSort}
                                align="right"
                                className="hidden xl:table-cell"
                              />
                              <ReportsSortTh
                                col="marginPct"
                                label="Margin"
                                sortKey={productVariantsSort.sortKey}
                                sortDir={productVariantsSort.sortDir}
                                onSort={productVariantsSort.onSort}
                                align="right"
                                className="hidden xl:table-cell"
                              />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {pagedProductVariants.map((v) => (
                              <tr key={v.variantId} className="hover:bg-gray-50/80">
                                <td
                                  className={`py-2.5 px-3 ${selectedProductIds.length <= 1 ? 'hidden lg:table-cell' : ''}`}
                                >
                                  <DashLink
                                    to={finishedGoodProductHref(v.productId, v.categorySlug)}
                                    className={`${DASH_LINK_CLASS} font-medium truncate block max-w-[12rem]`}
                                    title={v.productName}
                                  >
                                    {v.productName}
                                  </DashLink>
                                </td>
                                <td className="py-2.5 px-3 font-mono text-xs text-gray-800">{v.sku}</td>
                                <td className="py-2.5 px-3 text-gray-700 hidden sm:table-cell">{v.size}</td>
                                <td className="py-2.5 px-3 text-right tabular-nums">{v.unitsSold.toLocaleString()}</td>
                                <td className="py-2.5 px-3 text-right tabular-nums hidden md:table-cell">
                                  {v.orderCount}
                                </td>
                                <td className="py-2.5 px-3 text-right tabular-nums hidden lg:table-cell">
                                  {v.shareOfProductPct.toFixed(1)}%
                                </td>
                                <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-blue-600">
                                  {formatReportsPesoFull(v.revenue)}
                                </td>
                                <td className="py-2.5 px-3 text-right tabular-nums hidden xl:table-cell">
                                  {formatReportsPesoFull(v.profit)}
                                </td>
                                <td className="py-2.5 px-3 text-right tabular-nums hidden xl:table-cell">
                                  {v.marginPct.toFixed(1)}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <TablePagination
                        page={productVariantsPageSafe}
                        total={sortedProductVariants.length}
                        onPageChange={setProductVariantsPage}
                      />
                    </>
                  )}
              </CardContent>
            </Card>
          )}

          {selectedProductIds.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div>
                    <CardTitle>Top customers</CardTitle>
                    <p className="text-xs text-gray-500 mt-1">
                      Revenue from selected products · {periodLabel}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 tabular-nums">
                    {sortedTopProductCustomers.length} customer{sortedTopProductCustomers.length === 1 ? '' : 's'}
                  </p>
                </div>
              </CardHeader>
              <CardContent>
                  {sortedTopProductCustomers.length === 0 ? (
                    <p className="text-sm text-gray-500 py-6 text-center">
                      No customer purchases for the selected products in this period.
                    </p>
                  ) : (
                    <>
                      <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-200">
                            <tr>
                              <ReportsSortTh
                                col="customer"
                                label="Customer"
                                sortKey={productCustomersSort.sortKey}
                                sortDir={productCustomersSort.sortDir}
                                onSort={productCustomersSort.onSort}
                              />
                              <ReportsSortTh
                                col="agent"
                                label="Agent"
                                sortKey={productCustomersSort.sortKey}
                                sortDir={productCustomersSort.sortDir}
                                onSort={productCustomersSort.onSort}
                                className="hidden md:table-cell"
                              />
                              <ReportsSortTh
                                col="unitsSold"
                                label="Units"
                                sortKey={productCustomersSort.sortKey}
                                sortDir={productCustomersSort.sortDir}
                                onSort={productCustomersSort.onSort}
                                align="right"
                              />
                              <ReportsSortTh
                                col="orderCount"
                                label="Orders"
                                sortKey={productCustomersSort.sortKey}
                                sortDir={productCustomersSort.sortDir}
                                onSort={productCustomersSort.onSort}
                                align="right"
                                className="hidden sm:table-cell"
                              />
                              <ReportsSortTh
                                col="revenue"
                                label="Revenue"
                                sortKey={productCustomersSort.sortKey}
                                sortDir={productCustomersSort.sortDir}
                                onSort={productCustomersSort.onSort}
                                align="right"
                              />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {pagedTopProductCustomers.map((c) => (
                              <tr key={c.customerId} className="hover:bg-gray-50/80">
                                <td className="py-2.5 px-3">
                                  <DashLink
                                    to={`/customers/${c.customerId}`}
                                    className={`${DASH_LINK_CLASS} font-medium`}
                                  >
                                    {c.customerName}
                                  </DashLink>
                                  {c.customerCode ? (
                                    <span className="block text-xs text-gray-500 mt-0.5">{c.customerCode}</span>
                                  ) : null}
                                </td>
                                <td className="py-2.5 px-3 hidden md:table-cell">
                                  {c.agentName ? (
                                    c.agentId ? (
                                      <DashLink
                                        to={`/employees/${encodeURIComponent(c.agentId)}`}
                                        title={`Open agent ${c.agentName}`}
                                        className={`${DASH_LINK_CLASS} text-sm`}
                                      >
                                        {c.agentName}
                                      </DashLink>
                                    ) : (
                                      <span className="text-gray-600">{c.agentName}</span>
                                    )
                                  ) : (
                                    <span className="text-gray-400">—</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right tabular-nums">{c.unitsSold.toLocaleString()}</td>
                                <td className="py-2.5 px-3 text-right tabular-nums hidden sm:table-cell">
                                  {c.orderCount}
                                </td>
                                <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-blue-600">
                                  {formatReportsPesoFull(c.revenue)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <TablePagination
                        page={productCustomersPageSafe}
                        total={sortedTopProductCustomers.length}
                        onPageChange={setProductCustomersPage}
                      />
                    </>
                  )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* INVENTORY */}
      {viewMode === 'inventory' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatKpiCard
              label="PO spend"
              value={formatReportsPeso(invSummary.purchaseOrderSpend)}
              tone="blue"
              icon={<Wallet />}
              sub={`${invSummary.purchaseOrderCount} orders · ${formatReportsPeso(invSummary.purchaseOrderPaid)} paid`}
            />
            <StatKpiCard
              label="Production requests"
              value={String(invSummary.productionRequestCount)}
              tone="violet"
              icon={<Activity />}
              sub={`${invSummary.pendingProductionRequestCount} pending approval`}
            />
            <StatKpiCard
              label="Inventory value"
              value={formatReportsPeso(invSummary.inventoryValue)}
              tone="emerald"
              icon={<PackageCheck />}
              sub={`${invSummary.rawMaterialCount} raw materials`}
            />
            <StatKpiCard
              label="Low-stock materials"
              value={String(invSummary.lowStockMaterialCount)}
              tone="rose"
              icon={<Factory />}
            />
            <StatKpiCard
              label="Pending POs"
              value={String(invSummary.pendingPurchaseOrderCount)}
              tone="amber"
              icon={<ShoppingCart />}
              sub={formatReportsPeso(invSummary.pendingPurchaseOrderValue)}
            />
            <StatKpiCard
              label="Suppliers (period)"
              value={String(invSummary.activeSupplierCount)}
              tone="teal"
              icon={<Building2 />}
              sub="With PO activity"
            />
            <StatKpiCard
              label="PO outstanding"
              value={formatReportsPeso(invSummary.purchaseOrderSpend - invSummary.purchaseOrderPaid)}
              tone="indigo"
              icon={<DollarSign />}
              sub="Spend minus paid"
            />
            <StatKpiCard
              label="Pending PRs"
              value={String(invSummary.pendingProductionRequestCount)}
              tone="cyan"
              icon={<Target />}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Purchase expenditure trend</CardTitle>
              <p className="text-xs text-gray-500 mt-1">
                {branchLabel} · {periodLabel} · PO spend by month (excludes draft, cancelled, rejected)
              </p>
            </CardHeader>
            <CardContent>
              {inv.expenditureSeries.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">No purchase orders in this period.</p>
              ) : (
                <ReportsChartFrame
                  height={288}
                  render={({ width, height }) => (
                    <LineChart width={width} height={height} data={inv.expenditureSeries}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis
                        yAxisId="left"
                        tickFormatter={(v) => formatReportsPeso(v as number)}
                        tick={{ fontSize: 10 }}
                        width={52}
                      />
                      <YAxis yAxisId="right" orientation="right" allowDecimals={false} tick={{ fontSize: 10 }} width={32} />
                      <Tooltip
                        formatter={(v: number, name: string) =>
                          name === 'PO count' ? v : formatReportsPesoFull(v)
                        }
                      />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="poSpend"
                        name="PO spend"
                        stroke="#3B82F6"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#3B82F6' }}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="poCount"
                        name="PO count"
                        stroke="#10B981"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#10B981' }}
                      />
                    </LineChart>
                  )}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle>Material purchase spending</CardTitle>
                  <p className="text-xs text-gray-500 mt-1">
                    {branchLabel} · {periodLabel} · raw material PO line items (qty × unit price)
                  </p>
                </div>
                <div
                  className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 shrink-0"
                  role="tablist"
                  aria-label="Material spend chart mode"
                >
                  {(['overall', 'categories'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      role="tab"
                      aria-selected={materialSpendChartMode === mode}
                      onClick={() => setMaterialSpendChartMode(mode)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        materialSpendChartMode === mode
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {mode === 'overall' ? 'Overall' : 'By category'}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!hasMaterialSpend ? (
                <p className="text-sm text-gray-500 py-8 text-center">No material line-item spend in this period.</p>
              ) : (
                <div
                  className={
                    materialSpendChartMode === 'categories' && materialCategoryLines.length > 0
                      ? 'grid grid-cols-1 lg:grid-cols-3 gap-6'
                      : undefined
                  }
                >
                  <div className={materialSpendChartMode === 'categories' && materialCategoryLines.length > 0 ? 'lg:col-span-2' : undefined}>
                    <ReportsChartFrame
                      height={288}
                      render={({ width, height }) => (
                        <LineChart width={width} height={height} data={materialSpendLineChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                          <YAxis
                            tickFormatter={(v) => formatReportsPeso(v as number)}
                            tick={{ fontSize: 10 }}
                            width={52}
                          />
                          <Tooltip formatter={(v: number) => formatReportsPesoFull(v)} />
                          <Legend
                            {...reportsChartLegendProps(
                              materialSpendChartMode === 'overall' ? 1 : visibleMaterialCategoryLines.length,
                            )}
                          />
                          {materialSpendChartMode === 'overall' ? (
                            <Line
                              type="monotone"
                              dataKey="Overall"
                              name="Overall"
                              stroke="#8B5CF6"
                              strokeWidth={2}
                              dot={{ r: 3, fill: '#8B5CF6' }}
                            />
                          ) : (
                            visibleMaterialCategoryLines.map((c) => {
                              const colorIndex = materialCategoryLines.findIndex(
                                (line) => line.categoryName === c.categoryName,
                              );
                              const stroke = agentChartColorAt(Math.max(0, colorIndex));
                              return (
                              <Line
                                key={c.categoryName}
                                type="monotone"
                                dataKey={c.categoryName}
                                name={c.categoryName}
                                stroke={stroke}
                                strokeWidth={2}
                                dot={{ r: 3, fill: stroke }}
                              />
                              );
                            })
                          )}
                        </LineChart>
                      )}
                    />
                  </div>

                  {materialSpendChartMode === 'categories' && materialCategoryLines.length > 0 ? (
                    <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-3">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <h3 className="text-sm font-semibold text-gray-800">Categories</h3>
                        {visibleMaterialCategoryNames.length < materialCategoryLines.length ? (
                          <button
                            type="button"
                            className="text-xs text-blue-600 hover:underline font-medium shrink-0"
                            onClick={() =>
                              setVisibleMaterialCategoryNames(
                                materialCategoryLines.map((c) => c.categoryName),
                              )
                            }
                          >
                            Show all
                          </button>
                        ) : null}
                      </div>
                      <p className="text-xs text-gray-500 mb-3">
                        {visibleMaterialCategoryNames.length} of {materialCategoryLines.length} shown
                      </p>
                      <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {materialCategoryLines.map((c, i) => {
                          const checked = visibleMaterialCategoryNames.includes(c.categoryName);
                          const onlyOneVisible = visibleMaterialCategoryNames.length <= 1;
                          const periodSpend =
                            materialCategorySpendByName.get(c.categoryName)?.spend
                            ?? c.spendByMonth.reduce((s, v) => s + v, 0);
                          return (
                            <li
                              key={c.categoryName}
                              className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 text-sm ${
                                checked ? 'border-violet-200 bg-white' : 'border-transparent opacity-60'
                              }`}
                            >
                              <input
                                type="checkbox"
                                className="mt-0.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500 disabled:opacity-40"
                                checked={checked}
                                disabled={checked && onlyOneVisible}
                                title={
                                  checked && onlyOneVisible
                                    ? 'At least one category must stay visible'
                                    : checked
                                      ? 'Hide from chart'
                                      : 'Show in chart'
                                }
                                onChange={() => toggleMaterialCategoryVisible(c.categoryName)}
                                aria-label={`${checked ? 'Hide' : 'Show'} ${c.categoryName} in chart`}
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: agentChartColorAt(i) }}
                                    aria-hidden
                                  />
                                  <span className="font-medium text-gray-900 truncate">{c.categoryName}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5 tabular-nums">
                                  {formatReportsPesoFull(periodSpend)} in period
                                </p>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Spend by supplier type</CardTitle>
                <p className="text-xs text-gray-500 mt-1">
                  {branchLabel} · {periodLabel} · PO totals grouped by supplier type
                </p>
              </CardHeader>
              <CardContent>
                {inv.supplierTypeSpend.length === 0 ? (
                  <p className="text-sm text-gray-500 py-8 text-center">No supplier spend in this period.</p>
                ) : (
                  <ReportsChartFrame
                    height={288}
                    render={({ width, height }) => {
                      const pieRows = inv.supplierTypeSpend
                        .filter((r) => r.spend > 0)
                        .map((r) => ({
                          name: r.supplierType,
                          value: r.spend,
                          key: r.supplierType,
                        }));
                      return (
                        <PieChart width={width} height={height}>
                          <Pie
                            data={pieRows}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={88}
                            paddingAngle={2}
                            label={({ name, percent }) =>
                              `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                            labelLine={false}
                          >
                            {pieRows.map((entry, i) => (
                              <Cell key={entry.key} fill={agentChartColorAt(i)} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => formatReportsPesoFull(v)} />
                          <Legend {...reportsChartLegendProps(pieRows.length)} />
                        </PieChart>
                      );
                    }}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Suppliers by spend ({periodLabel})</CardTitle>
                <p className="text-xs text-gray-500 mt-1">{sortedInventorySuppliers.length} supplier{sortedInventorySuppliers.length === 1 ? '' : 's'} with PO activity</p>
              </CardHeader>
              <CardContent>
                {sortedInventorySuppliers.length === 0 ? (
                  <p className="text-sm text-gray-500 py-8 text-center">No supplier spend in this period.</p>
                ) : (
                  <div className="overflow-x-auto -mx-1">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 text-gray-600 text-left">
                          <ReportsSortTh
                            col="supplier"
                            label="Supplier"
                            sortKey={inventorySuppliersSort.sortKey}
                            sortDir={inventorySuppliersSort.sortDir}
                            onSort={inventorySuppliersSort.onSort}
                          />
                          <ReportsSortTh
                            col="poCount"
                            label="POs"
                            sortKey={inventorySuppliersSort.sortKey}
                            sortDir={inventorySuppliersSort.sortDir}
                            onSort={inventorySuppliersSort.onSort}
                            align="right"
                          />
                          <ReportsSortTh
                            col="spend"
                            label="Spend"
                            sortKey={inventorySuppliersSort.sortKey}
                            sortDir={inventorySuppliersSort.sortDir}
                            onSort={inventorySuppliersSort.onSort}
                            align="right"
                          />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {sortedInventorySuppliers.map((s) => (
                          <tr key={s.supplierId} className="hover:bg-gray-50/80">
                            <td className="py-2.5 px-3">
                              <DashLink
                                to={`/suppliers/${encodeURIComponent(s.supplierId)}`}
                                className={`${DASH_LINK_CLASS} font-medium`}
                              >
                                {s.supplierName}
                              </DashLink>
                            </td>
                            <td className="py-2.5 px-3 text-right tabular-nums">{s.poCount}</td>
                            <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-blue-600">
                              {formatReportsPesoFull(s.spend)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <RawMaterialConsumptionCard
            branchLabel={branchLabel}
            branchName={branch}
            periodLabel={periodLabel}
            consumption={inv.consumption}
          />

        </div>
      )}

      {/* LOGISTICS TAB — disabled; revisit later
      {viewMode === 'logistics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatKpiCard
              label="Trips scheduled"
              value={String(logSummary.totalTrips)}
              tone="blue"
              icon={<Truck />}
              sub={`${logSummary.completedTrips} completed · ${logSummary.delayedTrips} delayed · ${logSummary.failedTrips} failed`}
            />
            <StatKpiCard
              label="On-time delivery"
              value={`${logSummary.onTimeRate.toFixed(0)}%`}
              tone="emerald"
              icon={<CheckCircle />}
              sub="Completed ÷ closed trips in period"
            />
            <StatKpiCard
              label="Orders delivered"
              value={String(logSummary.ordersDelivered)}
              tone="violet"
              icon={<PackageCheck />}
              sub={`${logSummary.ordersOnTrips} orders on trips in period`}
            />
            <StatKpiCard
              label="Avg order cycle"
              value={logSummary.cycleSampleSize > 0 ? `${logSummary.avgCycleDays.toFixed(1)} days` : '—'}
              tone="amber"
              icon={<CalendarRange />}
              sub={
                logSummary.cycleSampleSize > 0
                  ? `Median ${logSummary.medianCycleDays.toFixed(1)} days · ${logSummary.cycleSampleSize} orders`
                  : 'No delivered orders in period'
              }
            />
            <StatKpiCard
              label="In transit now"
              value={String(logSummary.inTransitNow)}
              tone="indigo"
              icon={<Activity />}
              sub={`${logSummary.loadingNow} loading · live snapshot`}
            />
            <StatKpiCard
              label="Awaiting dispatch"
              value={String(logSummary.ordersAwaitingDispatch)}
              tone="orange"
              icon={<ShoppingCart />}
              sub="Approved orders not on an active trip"
            />
            <StatKpiCard
              label="Fleet available"
              value={logSummary.fleetTotal > 0 ? String(logSummary.fleetAvailable) : '—'}
              tone="teal"
              icon={<Truck />}
              sub={
                logSummary.fleetTotal > 0
                  ? `${logSummary.fleetTotal} total · ${logSummary.fleetOnTrip} on trip · ${logSummary.fleetMaintenance} in maintenance`
                  : 'No vehicles for this branch'
              }
            />
            <StatKpiCard
              label="Open delay cases"
              value={String(logSummary.openDelayExceptions)}
              tone="rose"
              icon={<AlertTriangle />}
              sub={`${log.delayBreakdown.reduce((s, d) => s + d.count, 0)} exceptions in ${periodLabel}`}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Trip volume & on-time performance</CardTitle>
              <p className="text-xs text-gray-500 mt-1">
                {branchLabel} · {periodLabel} · trips by scheduled date
              </p>
            </CardHeader>
            <CardContent>
              {log.tripVolumeSeries.every((p) => p.totalTrips === 0) ? (
                <p className="text-sm text-gray-500 py-8 text-center">No trips scheduled in this period.</p>
              ) : (
                <ReportsChartFrame
                  height={288}
                  render={({ width, height }) => (
                    <ComposedChart width={width} height={height} data={log.tripVolumeSeries}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 10 }} width={36} />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        domain={[0, 100]}
                        tickFormatter={(v) => `${v}%`}
                        tick={{ fontSize: 10 }}
                        width={40}
                      />
                      <Tooltip
                        formatter={(v: number, name: string) =>
                          name === 'On-time %' ? `${Number(v).toFixed(1)}%` : v
                        }
                      />
                      <Legend />
                      <Bar yAxisId="left" dataKey="totalTrips" name="Trips" fill="#3B82F6" barSize={18} />
                      <Bar yAxisId="left" dataKey="delayed" name="Delayed" fill="#F59E0B" barSize={18} />
                      <Bar yAxisId="left" dataKey="failed" name="Failed" fill="#EF4444" barSize={18} />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="onTimePct"
                        name="On-time %"
                        stroke="#10B981"
                        strokeWidth={2}
                        dot={{ r: 3, fill: '#10B981' }}
                      />
                    </ComposedChart>
                  )}
                />
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Order fulfillment pipeline</CardTitle>
                <p className="text-xs text-gray-500 mt-1">Current order backlog by fulfillment stage</p>
              </CardHeader>
              <CardContent>
                {fulfillmentPipelineChart.length === 0 ? (
                  <p className="text-sm text-gray-500 py-8 text-center">No orders in fulfillment stages.</p>
                ) : (
                  <ReportsChartFrame
                    height={Math.max(220, fulfillmentPipelineChart.length * 36)}
                    render={({ width, height }) => (
                      <BarChart
                        width={width}
                        height={height}
                        data={fulfillmentPipelineChart}
                        layout="vertical"
                        margin={{ left: 8, right: 16, top: 4, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                        <YAxis type="category" dataKey="status" width={96} tick={{ fontSize: 10 }} />
                        <Tooltip
                          formatter={(v: number, name: string) =>
                            name === 'Order value' ? formatReportsPesoFull(v) : v
                          }
                        />
                        <Bar dataKey="orders" name="Orders" fill="#6366F1" barSize={14} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Trip status mix</CardTitle>
                <p className="text-xs text-gray-500 mt-1">{periodLabel}</p>
              </CardHeader>
              <CardContent>
                {tripStatusChart.length === 0 ? (
                  <p className="text-sm text-gray-500 py-8 text-center">No trips in this period.</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={tripStatusChart}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                        >
                          {tripStatusChart.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Order-to-delivery cycle time</CardTitle>
                <p className="text-xs text-gray-500 mt-1">{branchLabel} · {periodLabel}</p>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {log.cycleTime.sampleSize === 0 ? (
                  <p className="text-gray-500 py-4 text-center">No delivered orders with delivery dates in this period.</p>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg bg-gray-50 p-3 text-center">
                        <p className="text-xs text-gray-500">Average</p>
                        <p className="text-lg font-bold text-gray-900">{log.cycleTime.avgDays.toFixed(1)}d</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3 text-center">
                        <p className="text-xs text-gray-500">Median</p>
                        <p className="text-lg font-bold text-gray-900">{log.cycleTime.medianDays.toFixed(1)}d</p>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-3 text-center">
                        <p className="text-xs text-gray-500">Sample</p>
                        <p className="text-lg font-bold text-gray-900">{log.cycleTime.sampleSize}</p>
                      </div>
                    </div>
                    <div className="space-y-2 pt-1">
                      {log.cycleTime.buckets.map((b) => (
                        <div key={b.label} className="flex items-center gap-3">
                          <span className="text-xs text-gray-600 w-20 shrink-0">{b.label}</span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-violet-500 rounded-full"
                              style={{
                                width: `${log.cycleTime.sampleSize > 0 ? (b.count / log.cycleTime.sampleSize) * 100 : 0}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs tabular-nums text-gray-700 w-8 text-right">{b.count}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Delay root causes</CardTitle>
                <p className="text-xs text-gray-500 mt-1">{periodLabel}</p>
              </CardHeader>
              <CardContent>
                {log.delayBreakdown.length === 0 ? (
                  <p className="text-sm text-gray-500 py-8 text-center">No delay exceptions recorded in this period.</p>
                ) : (
                  <div className="space-y-2">
                    {log.delayBreakdown.map((d) => (
                      <div
                        key={d.type}
                        className="flex items-center justify-between text-sm border-b border-gray-100 pb-2 last:border-0"
                      >
                        <span className="font-medium text-gray-800">{d.type}</span>
                        <span className="text-gray-600 tabular-nums">
                          {d.count} total{d.openCount > 0 ? ` · ${d.openCount} open` : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Trips in period</CardTitle>
                  <p className="text-xs text-gray-500 mt-1">
                    {branchLabel} · {periodLabel} · {sortedLogisticsTrips.length} trip
                    {sortedLogisticsTrips.length === 1 ? '' : 's'}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/logistics')}>
                  Open Logistics
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {sortedLogisticsTrips.length === 0 ? (
                <p className="text-sm text-gray-500 py-8 text-center">No trips scheduled in this period.</p>
              ) : (
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-600 text-left">
                        <ReportsSortTh
                          col="tripNumber"
                          label="Trip #"
                          sortKey={logisticsTripsSort.sortKey}
                          sortDir={logisticsTripsSort.sortDir}
                          onSort={logisticsTripsSort.onSort}
                        />
                        <ReportsSortTh
                          col="scheduledDate"
                          label="Scheduled"
                          sortKey={logisticsTripsSort.sortKey}
                          sortDir={logisticsTripsSort.sortDir}
                          onSort={logisticsTripsSort.onSort}
                        />
                        <ReportsSortTh
                          col="status"
                          label="Status"
                          sortKey={logisticsTripsSort.sortKey}
                          sortDir={logisticsTripsSort.sortDir}
                          onSort={logisticsTripsSort.onSort}
                        />
                        <ReportsSortTh
                          col="vehicle"
                          label="Vehicle"
                          sortKey={logisticsTripsSort.sortKey}
                          sortDir={logisticsTripsSort.sortDir}
                          onSort={logisticsTripsSort.onSort}
                          className="hidden md:table-cell"
                        />
                        <ReportsSortTh
                          col="driver"
                          label="Driver"
                          sortKey={logisticsTripsSort.sortKey}
                          sortDir={logisticsTripsSort.sortDir}
                          onSort={logisticsTripsSort.onSort}
                          className="hidden lg:table-cell"
                        />
                        <ReportsSortTh
                          col="orderCount"
                          label="Orders"
                          sortKey={logisticsTripsSort.sortKey}
                          sortDir={logisticsTripsSort.sortDir}
                          onSort={logisticsTripsSort.onSort}
                          align="right"
                        />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sortedLogisticsTrips.map((t) => (
                        <tr key={t.tripId} className="hover:bg-gray-50/80">
                          <td className="py-2.5 px-3 font-medium text-gray-900">{t.tripNumber}</td>
                          <td className="py-2.5 px-3 text-gray-700 tabular-nums">{t.scheduledDate}</td>
                          <td className="py-2.5 px-3">
                            <Badge variant={t.status === 'Completed' ? 'success' : t.status === 'Delayed' || t.status === 'Failed' ? 'warning' : 'default'}>
                              {t.status}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-gray-700 hidden md:table-cell">{t.vehicleName ?? '—'}</td>
                          <td className="py-2.5 px-3 text-gray-700 hidden lg:table-cell">{t.driverName ?? '—'}</td>
                          <td className="py-2.5 px-3 text-right tabular-nums">{t.orderCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      */}

      <p className="text-xs text-gray-400 text-right">
        Generated {new Date(bundle.generatedAt).toLocaleString()}
      </p>
    </div>
    {periodModal}
    </>
  );
}

// ---------------------------------------------------------------------------
// UI components
// ---------------------------------------------------------------------------

function ReportsRevenueTrendCard(props: {
  branchLabel: string;
  scopedTrend: ReportsBundle['executive']['revenueTrend'];
  branchCompare: ReportsBranchTrendCompare;
  mode: RevenueTrendMode;
  onModeChange: (mode: RevenueTrendMode) => void;
  canCompare: boolean;
}) {
  const compareChartData = useMemo(() => {
    return props.branchCompare.labels.map((label, i) => {
      const row: Record<string, string | number> = { label };
      for (const b of props.branchCompare.branches) {
        row[b.branchId] = b.revenueByMonth[i] ?? 0;
      }
      row.totalOrders = props.branchCompare.totalOrdersByMonth[i] ?? 0;
      return row;
    });
  }, [props.branchCompare]);

  const showCompare = props.mode === 'allBranches' && props.canCompare;
  const scopedEmpty = props.scopedTrend.length === 0;
  const compareEmpty = props.branchCompare.branches.length === 0;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-red-600" />
              Revenue &amp; order trend
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              {showCompare
                ? 'Revenue by branch — colors match Agent Analytics branch comparison.'
                : `Last 6 months · ${props.branchLabel}`}
            </p>
          </div>
          {props.canCompare && (
            <div
              className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 shrink-0"
              role="tablist"
              aria-label="Revenue trend view"
            >
              <button
                type="button"
                role="tab"
                aria-selected={props.mode === 'scoped'}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  props.mode === 'scoped'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => props.onModeChange('scoped')}
              >
                {props.branchLabel === 'All branches' ? 'Combined' : 'This branch'}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={props.mode === 'allBranches'}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  props.mode === 'allBranches'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                onClick={() => props.onModeChange('allBranches')}
              >
                All branches
              </button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!showCompare && scopedEmpty ? (
          <p className="text-sm text-gray-500 py-8 text-center">No revenue data for this period.</p>
        ) : showCompare && compareEmpty ? (
          <p className="text-sm text-gray-500 py-8 text-center">No branch revenue data for the last 6 months.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              {showCompare ? (
                <ComposedChart data={compareChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis
                    yAxisId="left"
                    tickFormatter={(v) => formatReportsPeso(v as number)}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(v: number, name: string) =>
                      name === 'Total orders' ? v : formatReportsPesoFull(v)
                    }
                    contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {props.branchCompare.branches.map((b) => (
                    <Line
                      key={b.branchId}
                      yAxisId="left"
                      type="monotone"
                      dataKey={b.branchId}
                      name={b.branchName}
                      stroke={branchChartColorAt(b.colorIndex)}
                      strokeWidth={2}
                      dot={{ r: 2, fill: branchChartColorAt(b.colorIndex) }}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="totalOrders"
                    name="Total orders"
                    stroke="#64748B"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </ComposedChart>
              ) : (
                <ComposedChart data={props.scopedTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis
                    yAxisId="left"
                    tickFormatter={(v) => formatReportsPeso(v as number)}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(v: number, name: string) =>
                      name === 'Orders' ? v : formatReportsPesoFull(v)
                    }
                  />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    fill="#3B82F6"
                    fillOpacity={0.15}
                    stroke="#3B82F6"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="orderCount"
                    name="Orders"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#10B981' }}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TrendChip(props: { value: number; suffix?: string; inline?: boolean }) {
  const Tag = props.inline ? 'span' : 'div';
  return (
    <Tag className={`flex items-center gap-0.5 ${getGrowthColor(props.value)} ${props.inline ? '' : 'text-xs'}`}>
      {getGrowthIcon(props.value)}
      {props.value >= 0 ? '+' : ''}
      {props.value.toFixed(1)}%{props.suffix ?? ''}
    </Tag>
  );
}

function MoverPanel(props: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  rows: MoverRow[];
  emptyMessage: string;
  onViewAll: () => void;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              {props.icon}
              {props.title}
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">{props.subtitle}</p>
          </div>
          <Button variant="ghost" size="sm" className="text-xs shrink-0" onClick={props.onViewAll}>
            View all
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex-1">
        {props.rows.length === 0 ? (
          <p className="text-sm text-gray-500 py-6 text-center">{props.emptyMessage}</p>
        ) : (
          <MoverBarList rows={props.rows} />
        )}
      </CardContent>
    </Card>
  );
}

function MoverBarList(props: { rows: MoverRow[]; valueLabel?: string }) {
  const max = Math.max(1, ...props.rows.map((r) => r.value));
  return (
    <div className="space-y-3">
      {props.rows.map((row, i) => (
        <div key={row.key} className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
              <span className="font-medium truncate">{row.name}</span>
              {row.badge && <Badge variant={row.badge.variant}>{row.badge.label}</Badge>}
            </div>
            <span className="font-semibold text-gray-900 shrink-0">{formatReportsPeso(row.value)}</span>
          </div>
          {row.sub && <p className="text-xs text-gray-500 pl-6">{row.sub}</p>}
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden ml-6">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-400"
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProcurementTile(props: {
  label: string;
  count: number;
  value?: string;
  href: string;
  onNavigate: (path: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => props.onNavigate(props.href)}
      className="rounded-xl border border-gray-200 p-4 text-left hover:border-red-200 hover:bg-red-50/30 transition-colors"
    >
      <p className="text-xs text-gray-500 uppercase tracking-wide">{props.label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{props.count}</p>
      {props.value && <p className="text-xs text-gray-600 mt-1">{props.value}</p>}
    </button>
  );
}

function FinanceRow(props: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-gray-600">{props.label}</span>
      <span className={`font-medium ${props.danger ? 'text-red-700' : 'text-gray-900'}`}>{props.value}</span>
    </div>
  );
}

function OpsRow(props: { label: string; count: number; value?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
      <span className="text-gray-600">{props.label}</span>
      <span className="font-medium">
        {props.count}
        {props.value ? ` · ${props.value}` : ''}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Raw Material Consumption (Inventory tab — bottom section)
// ---------------------------------------------------------------------------
//
// Picks one or more raw materials and shows their actual consumption pulled
// from the `material_consumption` ledger (the BOM-driven draws that production
// requests and finished-good stock increases write through bomConsumption.ts).
// No theoretical / BOM × units projections — only ledger facts.
//
// Branch + period scope is inherited from the parent Reports filters.

type RawMaterialConsumptionMetric = 'qty' | 'cost';
type RawMaterialConsumptionViewMode = 'chart' | 'table';

function formatMaterialQty(qty: number, unit: string): string {
  if (!Number.isFinite(qty)) return `0 ${unit}`;
  const abs = Math.abs(qty);
  const formatted =
    abs >= 1000
      ? qty.toLocaleString('en-PH', { maximumFractionDigits: 0 })
      : qty.toLocaleString('en-PH', { maximumFractionDigits: 2 });
  return `${formatted} ${unit}`;
}

function RawMaterialConsumptionCard(props: {
  branchLabel: string;
  branchName: string;
  periodLabel: string;
  consumption: ReportsRawMaterialConsumptionReport;
}) {
  const { branchLabel, branchName, periodLabel, consumption } = props;
  const { options, monthlyByMaterial, byProductByMaterial, labels, monthKeys } = consumption;

  const [metric, setMetric] = useState<RawMaterialConsumptionMetric>('cost');
  const [viewMode, setViewMode] = useState<RawMaterialConsumptionViewMode>('chart');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);
  const [byProductSearch, setByProductSearch] = useState('');
  const [byProductMaterialFilter, setByProductMaterialFilter] = useState('');
  const byProductSort = useReportTableSort('cost', 'desc');
  /** Name/unit for materials picked from the catalogue that have no ledger rows in this period. */
  const [extraMaterialMeta, setExtraMaterialMeta] = useState<
    Map<string, { materialName: string; unit: string }>
  >(() => new Map());

  // Auto-select #1 most-consumed when nothing is selected yet.
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.length > 0) return prev;
      if (options.length === 0) return [];
      return [options[0].materialId];
    });
  }, [options]);

  // Drop extra metadata once the material appears in fetched consumption options.
  useEffect(() => {
    setExtraMaterialMeta((prev) => {
      if (prev.size === 0) return prev;
      let changed = false;
      const next = new Map(prev);
      for (const o of options) {
        if (next.delete(o.materialId)) changed = true;
      }
      return changed ? next : prev;
    });
  }, [options]);

  useEffect(() => {
    if (!byProductMaterialFilter) return;
    const stillValid = byProductByMaterial.some(
      (r) => r.materialId === byProductMaterialFilter && selectedIds.includes(r.materialId),
    );
    if (!stillValid) setByProductMaterialFilter('');
  }, [byProductMaterialFilter, byProductByMaterial, selectedIds]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const colorByMaterial = useMemo(() => {
    const map = new Map<string, string>();
    selectedIds.forEach((id, i) => map.set(id, agentChartColorAt(i)));
    return map;
  }, [selectedIds]);

  const unitByMaterial = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of options) map.set(o.materialId, o.unit);
    for (const [id, meta] of extraMaterialMeta) map.set(id, meta.unit);
    return map;
  }, [options, extraMaterialMeta]);

  const nameByMaterial = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of options) map.set(o.materialId, o.materialName);
    for (const [id, meta] of extraMaterialMeta) map.set(id, meta.materialName);
    return map;
  }, [options, extraMaterialMeta]);

  const selectedMonthlyLines = useMemo(() => {
    const lineById = new Map(monthlyByMaterial.map((l) => [l.materialId, l]));
    const zeroMonth = () => Array(labels.length).fill(0) as number[];
    return selectedIds.map((id) => {
      const existing = lineById.get(id);
      if (existing) return existing;
      const fromOptions = options.find((o) => o.materialId === id);
      const extra = extraMaterialMeta.get(id);
      return {
        materialId: id,
        materialName: fromOptions?.materialName ?? extra?.materialName ?? 'Unknown material',
        unit: fromOptions?.unit ?? extra?.unit ?? 'kg',
        qtyByMonth: zeroMonth(),
        costByMonth: zeroMonth(),
      };
    });
  }, [selectedIds, monthlyByMaterial, labels.length, options, extraMaterialMeta]);

  // Chart data: row per month, column per selected material.
  const chartData = useMemo(() => {
    return labels.map((label, i) => {
      const row: Record<string, string | number> = { label };
      for (const line of selectedMonthlyLines) {
        const v = metric === 'qty' ? line.qtyByMonth[i] ?? 0 : line.costByMonth[i] ?? 0;
        row[line.materialId] = v;
      }
      return row;
    });
  }, [labels, selectedMonthlyLines, metric]);

  const baseByProductRows = useMemo(
    () => byProductByMaterial.filter((r) => selectedSet.has(r.materialId)),
    [byProductByMaterial, selectedSet],
  );

  const byProductMaterialOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of baseByProductRows) {
      if (!seen.has(r.materialId)) seen.set(r.materialId, r.materialName);
    }
    return [...seen.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [baseByProductRows]);

  const filteredByProductRows = useMemo(() => {
    const q = byProductSearch.trim().toLowerCase();
    return baseByProductRows.filter((r) => {
      if (byProductMaterialFilter && r.materialId !== byProductMaterialFilter) return false;
      if (!q) return true;
      return (
        r.productName.toLowerCase().includes(q) ||
        r.materialName.toLowerCase().includes(q)
      );
    });
  }, [baseByProductRows, byProductSearch, byProductMaterialFilter]);

  const sortedByProductRows = useMemo(
    () => sortConsumptionByProductRows(filteredByProductRows, byProductSort.sortKey, byProductSort.sortDir),
    [filteredByProductRows, byProductSort.sortKey, byProductSort.sortDir],
  );

  const selectedOptions = useMemo(
    () =>
      selectedIds.map((id) => {
        const fromOptions = options.find((o) => o.materialId === id);
        if (fromOptions) return fromOptions;
        const extra = extraMaterialMeta.get(id);
        return {
          materialId: id,
          materialName: extra?.materialName ?? 'Unknown material',
          unit: extra?.unit ?? 'kg',
          totalQty: 0,
          totalCost: 0,
          eventCount: 0,
        };
      }),
    [selectedIds, options, extraMaterialMeta],
  );

  const totalSelectedQtyByUnit = useMemo(() => {
    const totals = new Map<string, number>();
    for (const o of selectedOptions) {
      totals.set(o.unit, (totals.get(o.unit) ?? 0) + o.totalQty);
    }
    return [...totals.entries()].map(([unit, qty]) => ({ unit, qty }));
  }, [selectedOptions]);

  const totalSelectedCost = useMemo(
    () => selectedOptions.reduce((s, o) => s + o.totalCost, 0),
    [selectedOptions],
  );
  const totalSelectedEvents = useMemo(
    () => selectedOptions.reduce((s, o) => s + o.eventCount, 0),
    [selectedOptions],
  );
  const totalSelectedProducts = useMemo(() => {
    const productIds = new Set<string>();
    for (const r of baseByProductRows) {
      productIds.add(r.productId ?? `__none__:${r.materialId}`);
    }
    return productIds.size;
  }, [baseByProductRows]);

  const removeMaterial = (materialId: string) => {
    setSelectedIds((prev) => prev.filter((id) => id !== materialId));
    setExtraMaterialMeta((prev) => {
      if (!prev.has(materialId)) return prev;
      const next = new Map(prev);
      next.delete(materialId);
      return next;
    });
  };

  const addMaterialFromPicker = (mat: { materialId: string; name: string; unit: string }) => {
    setSelectedIds((prev) => (prev.includes(mat.materialId) ? prev : [...prev, mat.materialId]));
    if (!options.some((o) => o.materialId === mat.materialId)) {
      setExtraMaterialMeta((prev) => {
        const next = new Map(prev);
        next.set(mat.materialId, { materialName: mat.name, unit: mat.unit });
        return next;
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Raw material consumption</CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              {branchLabel} · {periodLabel} · actual draws from the material_consumption ledger (BOM-driven)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5"
              role="tablist"
              aria-label="Consumption metric"
            >
              {(['cost', 'qty'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  role="tab"
                  aria-selected={metric === m}
                  onClick={() => setMetric(m)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    metric === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {m === 'cost' ? 'Cost (₱)' : 'Quantity'}
                </button>
              ))}
            </div>
            <div
              className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5"
              role="tablist"
              aria-label="Consumption view mode"
            >
              {(['chart', 'table'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  role="tab"
                  aria-selected={viewMode === mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    viewMode === mode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {mode === 'chart' ? (
                    <span className="inline-flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" /> Chart
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <Table2 className="w-3.5 h-3.5" /> Table
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {options.length === 0 && selectedIds.length === 0 && (
          <p className="text-sm text-gray-500 py-2 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
            No raw material consumption recorded for this branch and period yet. You can still add
            materials below — they will show as zero on the chart.
          </p>
        )}
        <>
            {/* Selected materials KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatKpiCard
                label="Selected materials"
                value={String(selectedOptions.length)}
                tone="violet"
                icon={<PackageCheck />}
                sub={
                  options.length > 0
                    ? `${options.length} with activity in ${periodLabel}`
                    : undefined
                }
              />
              <StatKpiCard
                label="Total consumed cost"
                value={formatReportsPeso(totalSelectedCost)}
                tone="emerald"
                icon={<DollarSign />}
              />
              <StatKpiCard
                label="Total consumed qty"
                value={
                  totalSelectedQtyByUnit.length === 0
                    ? '—'
                    : totalSelectedQtyByUnit.length === 1
                      ? formatMaterialQty(totalSelectedQtyByUnit[0].qty, totalSelectedQtyByUnit[0].unit)
                      : `${totalSelectedQtyByUnit.length} units`
                }
                tone="blue"
                icon={<Activity />}
                sub={
                  totalSelectedQtyByUnit.length > 1
                    ? totalSelectedQtyByUnit
                        .map((t) => `${t.qty.toLocaleString('en-PH', { maximumFractionDigits: 1 })} ${t.unit}`)
                        .join(' · ')
                    : undefined
                }
              />
              <StatKpiCard
                label="Ledger events"
                value={String(totalSelectedEvents)}
                tone="indigo"
                icon={<ClipboardList />}
                sub={`${totalSelectedProducts} distinct products`}
              />
            </div>

            {/* Selected materials — PO-style add-to-list */}
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Raw materials
                  <span className="text-xs font-normal text-gray-400">
                    ({selectedOptions.length} item{selectedOptions.length === 1 ? '' : 's'})
                  </span>
                </h3>
                {options.length > 0 && (
                  <span className="text-xs text-gray-500">
                    {options.length} with consumption in {periodLabel}
                  </span>
                )}
              </div>

              {selectedOptions.length === 0 ? (
                <p className="text-sm text-gray-500 py-3 text-center">
                  No materials selected yet. Add raw materials below to compare consumption on the chart.
                </p>
              ) : (
                <div className="space-y-2 mb-3">
                  {selectedOptions.map((o) => {
                    const color = colorByMaterial.get(o.materialId);
                    return (
                      <div
                        key={o.materialId}
                        className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50/60"
                      >
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: color }}
                          aria-hidden
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{o.materialName}</p>
                          <p className="text-xs text-gray-500 mt-0.5 tabular-nums">
                            {formatReportsPesoFull(o.totalCost)} consumed ·{' '}
                            {formatMaterialQty(o.totalQty, o.unit)} · {o.eventCount} ledger events
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMaterial(o.materialId)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                          aria-label={`Remove ${o.materialName}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowMaterialPicker(true)}
                className="w-full flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-violet-400 hover:bg-violet-50 transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-violet-100 flex items-center justify-center flex-shrink-0 transition-colors">
                  <Plus className="w-5 h-5 text-gray-400 group-hover:text-violet-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 group-hover:text-violet-700">
                    Add a Raw Material
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Browse by category · Materials without consumption show as zero
                  </p>
                </div>
              </button>
            </div>

            {/* Chart or Table — full width */}
            <div className="min-w-0">
              {viewMode === 'chart' ? (
                selectedMonthlyLines.length === 0 ? (
                  <div className="flex items-center justify-center h-72 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 text-sm text-gray-500">
                    Add raw materials above to see consumption trends.
                  </div>
                ) : (
                  <ReportsChartFrame
                    height={320}
                    render={({ width, height }) => (
                      <LineChart width={width} height={height} data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                        <YAxis
                          tickFormatter={(v) =>
                            metric === 'cost'
                              ? formatReportsPeso(v as number)
                              : (v as number).toLocaleString('en-PH', { maximumFractionDigits: 1 })
                          }
                          tick={{ fontSize: 10 }}
                          width={metric === 'cost' ? 56 : 48}
                        />
                        <Tooltip
                          formatter={(v: number, dataKey: string) => {
                            const name = nameByMaterial.get(dataKey) ?? dataKey;
                            if (metric === 'cost') return [formatReportsPesoFull(v), name];
                            const unit = unitByMaterial.get(dataKey) ?? '';
                            return [formatMaterialQty(v, unit), name];
                          }}
                        />
                        <Legend
                          {...reportsChartLegendProps(selectedMonthlyLines.length)}
                          formatter={(value) => nameByMaterial.get(String(value)) ?? String(value)}
                        />
                        {selectedMonthlyLines.map((line) => {
                          const color = colorByMaterial.get(line.materialId) ?? '#8B5CF6';
                          return (
                            <Line
                              key={line.materialId}
                              type="monotone"
                              dataKey={line.materialId}
                              name={line.materialId}
                              stroke={color}
                              strokeWidth={2}
                              dot={{ r: 3, fill: color }}
                              activeDot={{ r: 5 }}
                            />
                          );
                        })}
                      </LineChart>
                    )}
                  />
                )
              ) : selectedMonthlyLines.length === 0 ? (
                <div className="flex items-center justify-center h-40 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 text-sm text-gray-500">
                  Add raw materials above to populate the table.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-gray-600 text-left">
                        <th className="py-2 px-3 font-medium">Month</th>
                        {selectedMonthlyLines.map((line) => (
                          <th
                            key={line.materialId}
                            className="py-2 px-3 font-medium text-right whitespace-nowrap"
                          >
                            <span className="inline-flex items-center gap-1.5 justify-end">
                              <span
                                className="inline-block w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: colorByMaterial.get(line.materialId) }}
                              />
                              <span>
                                {line.materialName}
                                {metric === 'qty' ? ` (${line.unit})` : ''}
                              </span>
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {labels.map((label, i) => (
                        <tr key={monthKeys[i] ?? label} className="hover:bg-gray-50/80">
                          <td className="py-2 px-3 text-gray-700">{label}</td>
                          {selectedMonthlyLines.map((line) => {
                            const v = metric === 'qty' ? line.qtyByMonth[i] ?? 0 : line.costByMonth[i] ?? 0;
                            return (
                              <td key={line.materialId} className="py-2 px-3 text-right tabular-nums">
                                {metric === 'cost'
                                  ? formatReportsPesoFull(v)
                                  : formatMaterialQty(v, line.unit)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      <tr className="bg-gray-50 font-semibold">
                        <td className="py-2 px-3 text-gray-800">Total ({periodLabel})</td>
                        {selectedMonthlyLines.map((line) => {
                          const total =
                            metric === 'qty'
                              ? line.qtyByMonth.reduce((s, v) => s + v, 0)
                              : line.costByMonth.reduce((s, v) => s + v, 0);
                          return (
                            <td
                              key={line.materialId}
                              className="py-2 px-3 text-right tabular-nums text-gray-900"
                            >
                              {metric === 'cost'
                                ? formatReportsPesoFull(total)
                                : formatMaterialQty(total, line.unit)}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <RawMaterialPickerModal
              isOpen={showMaterialPicker}
              onClose={() => setShowMaterialPicker(false)}
              onSelect={(mat) => addMaterialFromPicker(mat)}
              branch={branchName}
              alreadyAdded={selectedIds}
              contextNote={`${branchLabel} · ${periodLabel}`}
            />

            {/* By-product breakdown */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900">Which products consumed it</h3>
              </div>
              {baseByProductRows.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center bg-gray-50 rounded-lg">
                  No product attribution for the selected materials in this period.
                </p>
              ) : (
                <>
                  <ReportsTableToolbar
                    search={byProductSearch}
                    onSearchChange={setByProductSearch}
                    placeholder="Search product or raw material…"
                    resultLabel={`${sortedByProductRows.length} of ${baseByProductRows.length} rows`}
                  >
                    {byProductMaterialOptions.length > 1 ? (
                      <ReportsFilterSelect
                        label="Filter by raw material"
                        value={byProductMaterialFilter}
                        onChange={setByProductMaterialFilter}
                        options={[
                          { value: '', label: 'All raw materials' },
                          ...byProductMaterialOptions,
                        ]}
                      />
                    ) : null}
                  </ReportsTableToolbar>
                  {sortedByProductRows.length === 0 ? (
                    <p className="text-sm text-gray-500 py-4 text-center bg-gray-50 rounded-lg">
                      No rows match your search or filters.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-xs text-gray-500 uppercase border-y border-gray-200">
                          <tr>
                            <ReportsSortTh
                              col="product"
                              label="Product"
                              sortKey={byProductSort.sortKey}
                              sortDir={byProductSort.sortDir}
                              onSort={byProductSort.onSort}
                            />
                            <ReportsSortTh
                              col="material"
                              label="Raw material"
                              sortKey={byProductSort.sortKey}
                              sortDir={byProductSort.sortDir}
                              onSort={byProductSort.onSort}
                            />
                            <ReportsSortTh
                              col="qty"
                              label="Qty"
                              sortKey={byProductSort.sortKey}
                              sortDir={byProductSort.sortDir}
                              onSort={byProductSort.onSort}
                              align="right"
                            />
                            <ReportsSortTh
                              col="cost"
                              label="Cost"
                              sortKey={byProductSort.sortKey}
                              sortDir={byProductSort.sortDir}
                              onSort={byProductSort.onSort}
                              align="right"
                            />
                            <ReportsSortTh
                              col="events"
                              label="Events"
                              sortKey={byProductSort.sortKey}
                              sortDir={byProductSort.sortDir}
                              onSort={byProductSort.onSort}
                              align="right"
                            />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {sortedByProductRows.map((r) => (
                            <tr key={`${r.materialId}:${r.productId ?? '__none__'}`} className="hover:bg-gray-50/80">
                              <td className="py-2 px-3">
                                {r.productId ? (
                                  <DashLink
                                    to={finishedGoodProductHref(r.productId)}
                                    className={`${DASH_LINK_CLASS} font-medium`}
                                  >
                                    {r.productName}
                                  </DashLink>
                                ) : (
                                  <span className="text-gray-500 italic">{r.productName}</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                <span className="inline-flex items-center gap-1.5">
                                  <span
                                    className="inline-block w-2 h-2 rounded-full"
                                    style={{ backgroundColor: colorByMaterial.get(r.materialId) }}
                                    aria-hidden
                                  />
                                  <span className="text-gray-700">{r.materialName}</span>
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right tabular-nums">
                                {formatMaterialQty(r.qty, r.unit)}
                              </td>
                              <td className="py-2 px-3 text-right tabular-nums font-semibold text-blue-700">
                                {formatReportsPesoFull(r.cost)}
                              </td>
                              <td className="py-2 px-3 text-right tabular-nums text-gray-600">{r.eventCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
        </>
      </CardContent>
    </Card>
  );
}
