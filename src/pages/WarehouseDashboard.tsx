import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import {
  Package,
  AlertTriangle,
  ArrowRight,
  Truck,
  Factory,
  Box,
  Loader2,
  RefreshCw,
  PackageCheck,
  Repeat,
  ClipboardList,
  Activity,
  TrendingUp,
  TrendingDown,
  Wrench,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  fetchWarehouseManagerDashboard,
  formatWarehousePeso,
  type WarehouseKPI,
  type WarehouseManagerDashboardBundle,
  type ProductStockoutRow,
  type ProductLowStockRow,
  type MaterialLowStockRow,
  type IncomingPORow,
  type OrderToFulfillRow,
  type IBRToFulfillRow,
  type MyPRRow,
  type MyPORow,
  type RecentMovementRow,
} from '@/src/lib/warehouseDashboard';

const STATUS_TILE_STYLES: Record<WarehouseKPI['status'], string> = {
  good: 'border-emerald-200 bg-emerald-50/40',
  warning: 'border-amber-200 bg-amber-50/40',
  danger: 'border-red-200 bg-red-50/40',
  neutral: 'border-gray-200 bg-white',
};

const STATUS_TEXT_COLORS: Record<WarehouseKPI['status'], string> = {
  good: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-red-700',
  neutral: 'text-gray-700',
};

function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
}

function statusBadgeVariant(status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' {
  switch (status) {
    case 'Draft':
      return 'default';
    case 'Requested':
    case 'Pending':
    case 'Loading':
    case 'Packed':
    case 'Approved':
    case 'Accepted':
    case 'Sent':
    case 'Scheduled':
      return 'warning';
    case 'In Progress':
    case 'Confirmed':
    case 'In Transit':
    case 'Ready':
      return 'info';
    case 'Completed':
    case 'Delivered':
    case 'Partially Received':
    case 'Fulfilled':
      return 'success';
    case 'Cancelled':
    case 'Rejected':
      return 'danger';
    default:
      return 'default';
  }
}

export function WarehouseDashboard(): React.ReactElement {
  const { branch, employeeName, warehouseScope, warehouseScopeLoading } = useAppContext();
  const navigate = useNavigate();

  const [bundle, setBundle] = useState<WarehouseManagerDashboardBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (warehouseScopeLoading) return;
      if (!silent) setLoading(true);
      setRefreshing(silent);
      setError(null);
      try {
        const data = await fetchWarehouseManagerDashboard({
          branchName: branch,
          employeeName,
          scope: warehouseScope,
        });
        setBundle(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load warehouse dashboard');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [branch, employeeName, warehouseScope, warehouseScopeLoading],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const branchLabel = useMemo(() => {
    if (bundle?.branchName) return bundle.branchName;
    if (branch && branch.trim() !== '') return branch;
    return 'All branches';
  }, [bundle?.branchName, branch]);

  if (loading || warehouseScopeLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="w-7 h-7 animate-spin text-red-600" />
          <p className="text-sm">Loading warehouse overview…</p>
        </div>
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Could not load dashboard</h2>
          </div>
          <p className="text-sm text-gray-600">{error ?? 'No data available.'}</p>
          <Button variant="primary" onClick={() => void load()}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouse Overview</h1>
          <p className="text-sm text-gray-500 mt-1">
            {branchLabel} · Inventory, receiving &amp; dispatch for your scope
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="gap-2"
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </Button>
          <Button variant="outline" onClick={() => navigate('/warehouse')} className="gap-2">
            <Package className="w-4 h-4" /> Open Warehouse
          </Button>
        </div>
      </div>

      {/* Catalog scope banner */}
      {bundle.scopeActive && (
        <Card className="border-blue-100 bg-blue-50/40">
          <CardContent className="p-3 flex items-center gap-3">
            <Wrench className="w-4 h-4 text-blue-600 shrink-0" />
            <div className="text-sm text-blue-900">
              You're viewing a scoped catalog:{' '}
              <span className="font-semibold">{bundle.scopeSummary.productCount} product variants</span> and{' '}
              <span className="font-semibold">{bundle.scopeSummary.materialCount} raw materials</span> assigned to you.
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI STRIP */}
      <KpiStrip kpis={bundle.kpis} onNavigate={(href) => navigate(href)} />

      {/* CRITICAL INVENTORY */}
      {(bundle.criticalInventory.stockoutCount > 0 ||
        bundle.criticalInventory.lowStockProductCount > 0 ||
        bundle.criticalInventory.lowStockMaterialCount > 0) && (
        <CriticalInventoryCard
          inventory={bundle.criticalInventory}
          onOpenProduct={(productId) => productId && navigate(`/products/${productId}`)}
          onOpenMaterial={(materialId) => navigate(`/materials/${materialId}`)}
          onViewProducts={() => navigate('/warehouse')}
          onViewMaterials={() => navigate('/materials')}
        />
      )}

      {/* ACTION QUEUES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <IncomingPOsCard
          rows={bundle.incomingPurchaseOrders}
          count={bundle.incomingPurchaseOrderCount}
          totalValue={bundle.incomingPurchaseOrderValue}
          onOpen={(id) => navigate(`/purchase-orders/${id}`)}
          onViewAll={() => navigate('/purchase-orders')}
        />
        <OrdersToFulfillCard
          rows={bundle.ordersAwaitingFulfillment}
          count={bundle.ordersAwaitingFulfillmentCount}
          onOpen={(id) => navigate(`/orders/${id}`)}
          onViewAll={() => navigate('/warehouse')}
        />
        <IBRsCard
          rows={bundle.ibrsToFulfill}
          count={bundle.ibrsToFulfillCount}
          onOpen={(id) => navigate(`/inter-branch-requests/${id}`)}
          onViewAll={() => navigate('/inter-branch-requests')}
        />
      </div>

      {/* MY REQUESTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MyPRsCard
          recent={bundle.myProductionRequests.recent}
          statusCounts={bundle.myProductionRequests.statusCounts}
          activeCount={bundle.myProductionRequests.activeCount}
          onOpen={(id) => navigate(`/production-requests/${id}`)}
          onViewAll={() => navigate('/production-requests')}
        />
        <MyPOsCard
          recent={bundle.myPurchaseOrders.recent}
          statusCounts={bundle.myPurchaseOrders.statusCounts}
          activeCount={bundle.myPurchaseOrders.activeCount}
          onOpen={(id) => navigate(`/purchase-orders/${id}`)}
          onViewAll={() => navigate('/purchase-orders')}
        />
      </div>

      {/* MOVEMENTS */}
      <MovementsCard
        trend={bundle.movementsTrend}
        recent={bundle.recentMovements}
        inventoryValue={bundle.inventoryValue}
      />

      <p className="text-xs text-gray-400 text-right">
        Generated {new Date(bundle.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function KpiStrip(props: { kpis: WarehouseKPI[]; onNavigate: (href: string) => void }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-8 gap-3">
      {props.kpis.map((kpi) => (
        <button
          key={kpi.id}
          type="button"
          onClick={() => kpi.href && props.onNavigate(kpi.href)}
          disabled={!kpi.href}
          className={`text-left rounded-lg border ${STATUS_TILE_STYLES[kpi.status]} p-4 transition-all ${
            kpi.href ? 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : 'cursor-default'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{kpi.label}</p>
            <KpiIcon id={kpi.id} status={kpi.status} />
          </div>
          <p className={`text-2xl font-bold mt-2 ${STATUS_TEXT_COLORS[kpi.status]}`}>{kpi.value}</p>
          {kpi.subtitle && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{kpi.subtitle}</p>}
        </button>
      ))}
    </div>
  );
}

function KpiIcon(props: { id: string; status: WarehouseKPI['status'] }) {
  const color = STATUS_TEXT_COLORS[props.status];
  switch (props.id) {
    case 'kpi-catalog':
      return <Box className={`w-4 h-4 ${color}`} />;
    case 'kpi-stockouts':
      return <AlertTriangle className={`w-4 h-4 ${color}`} />;
    case 'kpi-low-stock':
      return <AlertTriangle className={`w-4 h-4 ${color}`} />;
    case 'kpi-incoming-po':
      return <PackageCheck className={`w-4 h-4 ${color}`} />;
    case 'kpi-orders-pipeline':
      return <Truck className={`w-4 h-4 ${color}`} />;
    case 'kpi-ibrs':
      return <Repeat className={`w-4 h-4 ${color}`} />;
    case 'kpi-my-prs':
      return <Factory className={`w-4 h-4 ${color}`} />;
    case 'kpi-my-pos':
      return <ClipboardList className={`w-4 h-4 ${color}`} />;
    default:
      return <Package className={`w-4 h-4 ${color}`} />;
  }
}

// ----- Critical inventory card -----

function CriticalInventoryCard(props: {
  inventory: WarehouseManagerDashboardBundle['criticalInventory'];
  onOpenProduct: (productId: string) => void;
  onOpenMaterial: (materialId: string) => void;
  onViewProducts: () => void;
  onViewMaterials: () => void;
}) {
  const { inventory } = props;
  return (
    <Card className="border-2 border-red-200 bg-gradient-to-r from-red-50 to-orange-50">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-red-900">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Critical inventory alerts
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={props.onViewProducts} className="gap-1">
              <Package className="w-4 h-4" /> Products
            </Button>
            <Button variant="outline" size="sm" onClick={props.onViewMaterials} className="gap-1">
              <Box className="w-4 h-4" /> Materials
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {inventory.stockouts.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-red-900 mb-2 flex items-center gap-2">
              <span>Stockouts</span>
              <Badge variant="danger">{inventory.stockoutCount}</Badge>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {inventory.stockouts.map((s) => (
                <StockoutItem key={s.variantId} row={s} onOpen={props.onOpenProduct} />
              ))}
            </div>
          </div>
        )}
        {inventory.lowStockProducts.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-600" />
              <span>Low-stock products</span>
              <Badge variant="warning">{inventory.lowStockProductCount}</Badge>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {inventory.lowStockProducts.map((p) => (
                <LowProductItem key={p.variantId} row={p} onOpen={props.onOpenProduct} />
              ))}
            </div>
          </div>
        )}
        {inventory.lowStockMaterials.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
              <Box className="w-4 h-4 text-amber-600" />
              <span>Low-stock raw materials</span>
              <Badge variant="warning">{inventory.lowStockMaterialCount}</Badge>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {inventory.lowStockMaterials.map((m) => (
                <LowMaterialItem key={m.materialId} row={m} onOpen={props.onOpenMaterial} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StockoutItem(props: { row: ProductStockoutRow; onOpen: (productId: string) => void }) {
  const { row } = props;
  return (
    <button
      type="button"
      onClick={() => row.productId && props.onOpen(row.productId)}
      disabled={!row.productId}
      className="text-left bg-white rounded-md border border-red-200 p-3 hover:border-red-400 transition-colors disabled:cursor-default"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 truncate">{row.productName}</p>
          <p className="text-xs text-gray-500 truncate">{row.size} · SKU {row.sku}</p>
        </div>
        <Badge variant="danger" className="shrink-0">Stockout</Badge>
      </div>
      <div className="mt-2 text-xs text-gray-600 flex items-center justify-between">
        <span>Reorder at <span className="font-medium">{row.reorderPoint}</span></span>
        <span className="text-gray-400">Last restock {formatDateShort(row.lastRestocked)}</span>
      </div>
    </button>
  );
}

function LowProductItem(props: { row: ProductLowStockRow; onOpen: (productId: string) => void }) {
  const { row } = props;
  return (
    <button
      type="button"
      onClick={() => row.productId && props.onOpen(row.productId)}
      disabled={!row.productId}
      className="text-left bg-white rounded-md border border-amber-200 p-3 hover:border-amber-400 transition-colors disabled:cursor-default"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 truncate">{row.productName}</p>
          <p className="text-xs text-gray-500 truncate">{row.size} · SKU {row.sku}</p>
        </div>
        <Badge variant="warning" className="shrink-0">Low</Badge>
      </div>
      <div className="mt-2 text-xs text-gray-600 flex items-center justify-between">
        <span>Stock <span className="font-medium text-gray-900">{row.totalStock}</span> / reorder {row.reorderPoint}</span>
        {row.safetyStock > 0 && <span className="text-gray-400">Safety {row.safetyStock}</span>}
      </div>
    </button>
  );
}

function LowMaterialItem(props: { row: MaterialLowStockRow; onOpen: (materialId: string) => void }) {
  const { row } = props;
  return (
    <button
      type="button"
      onClick={() => props.onOpen(row.materialId)}
      className="text-left bg-white rounded-md border border-amber-200 p-3 hover:border-amber-400 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900 truncate">{row.name}</p>
          <p className="text-xs text-gray-500 truncate">SKU {row.sku}{row.primarySupplier ? ` · ${row.primarySupplier}` : ''}</p>
        </div>
        <Badge variant={row.totalStock === 0 ? 'danger' : 'warning'} className="shrink-0">
          {row.totalStock === 0 ? 'Out' : 'Low'}
        </Badge>
      </div>
      <div className="mt-2 text-xs text-gray-600 flex items-center justify-between">
        <span>
          Stock <span className="font-medium text-gray-900">{row.totalStock.toLocaleString()}{row.unit && ` ${row.unit}`}</span>
          {' '}/ reorder {row.reorderPoint.toLocaleString()}{row.unit && ` ${row.unit}`}
        </span>
        {row.daysOfCover != null && <span className="text-gray-400">{row.daysOfCover}d cover</span>}
      </div>
    </button>
  );
}

// ----- Incoming POs -----

function IncomingPOsCard(props: {
  rows: IncomingPORow[];
  count: number;
  totalValue: number;
  onOpen: (id: string) => void;
  onViewAll: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <PackageCheck className="w-4 h-4 text-blue-600" /> Incoming POs to receive
            {props.count > 0 && <Badge variant="warning">{props.count}</Badge>}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={props.onViewAll} className="gap-1">
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {props.rows.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">Nothing inbound.</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">
              Total inbound value: <span className="font-semibold">{formatWarehousePeso(props.totalValue)}</span>
            </p>
            {props.rows.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => props.onOpen(r.id)}
                className="w-full text-left rounded-md border border-gray-200 p-2 hover:border-blue-300 hover:bg-blue-50/30 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-gray-900">{r.poNumber}</span>
                    <Badge variant={statusBadgeVariant(r.status)} className="text-[10px]">{r.status}</Badge>
                  </div>
                  <span className="text-xs font-medium text-gray-900 shrink-0">{formatWarehousePeso(r.totalAmount)}</span>
                </div>
                <div className="text-xs text-gray-600 mt-1 truncate">{r.supplierName ?? '—'}</div>
                <div className="text-[11px] text-gray-400 mt-0.5 flex items-center justify-between gap-2">
                  <span>Expect {formatDateShort(r.expectedDeliveryDate)}</span>
                  {r.daysUntilExpected != null && (
                    <span className={r.daysUntilExpected < 0 ? 'text-red-600 font-medium' : 'text-gray-500'}>
                      {r.daysUntilExpected < 0
                        ? `${Math.abs(r.daysUntilExpected)}d overdue`
                        : r.daysUntilExpected === 0
                          ? 'Today'
                          : `${r.daysUntilExpected}d`}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ----- Orders to fulfill -----

function OrdersToFulfillCard(props: {
  rows: OrderToFulfillRow[];
  count: number;
  onOpen: (id: string) => void;
  onViewAll: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="w-4 h-4 text-emerald-600" /> Orders awaiting fulfilment
            {props.count > 0 && <Badge variant="warning">{props.count}</Badge>}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={props.onViewAll} className="gap-1">
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {props.rows.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No orders in the warehouse pipeline.</p>
        ) : (
          <div className="space-y-2">
            {props.rows.map((r) => {
              const urgencyClass =
                r.urgency === 'overdue'
                  ? 'text-red-600 font-semibold'
                  : r.urgency === 'today'
                    ? 'text-amber-600 font-medium'
                    : r.urgency === 'soon'
                      ? 'text-amber-600'
                      : 'text-gray-500';
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => props.onOpen(r.id)}
                  className="w-full text-left rounded-md border border-gray-200 p-2 hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs text-gray-900">{r.orderNumber}</span>
                      <Badge variant={statusBadgeVariant(r.status)} className="text-[10px]">{r.status}</Badge>
                    </div>
                    <span className="text-xs font-medium text-gray-900 shrink-0">{formatWarehousePeso(r.totalAmount)}</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1 truncate">{r.customerName}</div>
                  <div className="text-[11px] mt-0.5 flex items-center justify-between gap-2">
                    <span className="text-gray-400">{r.lineCount} line{r.lineCount === 1 ? '' : 's'} · {r.agentName ?? '—'}</span>
                    <span className={urgencyClass}>
                      {formatDateShort(r.requiredDate)}
                      {r.daysUntilRequired != null && (
                        <span className="ml-1">
                          ({r.daysUntilRequired < 0
                            ? `${Math.abs(r.daysUntilRequired)}d overdue`
                            : r.daysUntilRequired === 0
                              ? 'today'
                              : `${r.daysUntilRequired}d`})
                        </span>
                      )}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ----- IBRs to fulfil -----

function IBRsCard(props: {
  rows: IBRToFulfillRow[];
  count: number;
  onOpen: (id: string) => void;
  onViewAll: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Repeat className="w-4 h-4 text-violet-600" /> IBRs to fulfil
            {props.count > 0 && <Badge variant="warning">{props.count}</Badge>}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={props.onViewAll} className="gap-1">
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {props.rows.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">Nothing inbound from sister branches.</p>
        ) : (
          <div className="space-y-2">
            {props.rows.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => props.onOpen(r.id)}
                className="w-full text-left rounded-md border border-gray-200 p-2 hover:border-violet-300 hover:bg-violet-50/30 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-gray-900">{r.ibrNumber}</span>
                  <Badge variant={statusBadgeVariant(r.status)} className="text-[10px]">{r.status}</Badge>
                </div>
                <div className="text-xs text-gray-600 mt-1 truncate">From {r.requestingBranchName ?? '—'}</div>
                <div className="text-[11px] text-gray-400 mt-0.5 flex items-center justify-between gap-2">
                  <span>{r.lineKindSummary}</span>
                  <span>
                    Depart {formatDateShort(r.scheduledDepartureDate)}
                    {r.daysUntilDeparture != null && (
                      <span className={r.daysUntilDeparture < 0 ? ' text-red-600 font-medium ml-1' : ' ml-1'}>
                        ({r.daysUntilDeparture < 0
                          ? `${Math.abs(r.daysUntilDeparture)}d overdue`
                          : r.daysUntilDeparture === 0
                            ? 'today'
                            : `${r.daysUntilDeparture}d`})
                      </span>
                    )}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ----- My PRs -----

function MyPRsCard(props: {
  recent: MyPRRow[];
  statusCounts: Record<string, number>;
  activeCount: number;
  onOpen: (id: string) => void;
  onViewAll: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Factory className="w-4 h-4 text-orange-600" /> My production requests
            {props.activeCount > 0 && <Badge variant="warning">{props.activeCount} active</Badge>}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={props.onViewAll} className="gap-1">
            All <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <StatusCountStrip counts={props.statusCounts} />
        {props.recent.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center mt-2">You haven't raised any PRs yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {props.recent.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => props.onOpen(r.id)}
                className="w-full text-left rounded-md border border-gray-200 p-2 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs text-gray-900">{r.prNumber}</span>
                  <Badge variant={statusBadgeVariant(r.status)} className="text-[10px]">{r.status}</Badge>
                </div>
                <div className="text-xs text-gray-500 mt-1 flex items-center justify-between gap-2">
                  <span>{r.itemCount} item{r.itemCount === 1 ? '' : 's'}</span>
                  <span>Need by {formatDateShort(r.expectedCompletionDate)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ----- My POs -----

function MyPOsCard(props: {
  recent: MyPORow[];
  statusCounts: Record<string, number>;
  activeCount: number;
  onOpen: (id: string) => void;
  onViewAll: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="w-4 h-4 text-blue-600" /> My purchase orders
            {props.activeCount > 0 && <Badge variant="warning">{props.activeCount} active</Badge>}
          </CardTitle>
          <Button variant="outline" size="sm" onClick={props.onViewAll} className="gap-1">
            All <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <StatusCountStrip counts={props.statusCounts} />
        {props.recent.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center mt-2">You haven't raised any POs yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {props.recent.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => props.onOpen(r.id)}
                className="w-full text-left rounded-md border border-gray-200 p-2 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-xs text-gray-900">{r.poNumber}</span>
                    <Badge variant={statusBadgeVariant(r.status)} className="text-[10px]">{r.status}</Badge>
                  </div>
                  <span className="text-xs font-medium text-gray-900 shrink-0">{formatWarehousePeso(r.totalAmount)}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1 flex items-center justify-between gap-2">
                  <span className="truncate">{r.supplierName ?? '—'}</span>
                  <span className="shrink-0">Expect {formatDateShort(r.expectedDeliveryDate)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusCountStrip(props: { counts: Record<string, number> }) {
  const entries = Object.entries(props.counts);
  if (entries.length === 0) {
    return <p className="text-xs text-gray-400">No history yet.</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {entries.map(([status, count]) => (
        <Badge key={status} variant={statusBadgeVariant(status)} className="text-[10px]">
          {status} · {count}
        </Badge>
      ))}
    </div>
  );
}

// ----- Movements card -----

function MovementsCard(props: {
  trend: WarehouseManagerDashboardBundle['movementsTrend'];
  recent: RecentMovementRow[];
  inventoryValue: WarehouseManagerDashboardBundle['inventoryValue'];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-600" /> Stock movements (last 7 days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={props.trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="label" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 8, border: '1px solid #E5E7EB' }}
                />
                <Legend />
                <Bar dataKey="inbound" name="Inbound" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="outbound" name="Outbound" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3">
            <InventoryValueTile
              label="Inventory value"
              total={props.inventoryValue.total}
              productsValue={props.inventoryValue.productsValue}
              materialsValue={props.inventoryValue.materialsValue}
            />
            <div className="rounded-md border border-gray-200 p-3">
              <p className="text-[11px] uppercase tracking-wider text-gray-500">Net movement (7d)</p>
              <p className="text-lg font-bold mt-1 text-gray-900">
                {props.trend.reduce((s, p) => s + p.inbound, 0)} in / {props.trend.reduce((s, p) => s + p.outbound, 0)} out
              </p>
              <p className="text-[11px] text-gray-500 mt-1">
                {props.trend.reduce((s, p) => s + p.net, 0) >= 0 ? (
                  <span className="text-emerald-600 inline-flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Net inbound
                  </span>
                ) : (
                  <span className="text-amber-600 inline-flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" /> Net outbound
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Recent movements</h4>
          {props.recent.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No recent movements in your scope.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-200">
                    <th className="py-2 pr-3">Type</th>
                    <th className="py-2 pr-3">Item</th>
                    <th className="py-2 pr-3 text-right">Qty</th>
                    <th className="py-2 pr-3">By</th>
                    <th className="py-2 pr-3">Reason / ref</th>
                    <th className="py-2">When</th>
                  </tr>
                </thead>
                <tbody>
                  {props.recent.map((m) => (
                    <tr key={`${m.kind}-${m.id}`} className="border-b border-gray-100">
                      <td className="py-2 pr-3">
                        <Badge variant={movementBadgeVariant(m.type)} className="text-[10px]">
                          {m.type}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 text-gray-800">
                        <div className="flex flex-col leading-tight">
                          <span className="truncate max-w-[260px]">{m.itemName}</span>
                          <span className="text-xs text-gray-400">{m.sku ?? '—'} · {m.kind === 'product' ? 'Product' : 'Material'}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-right font-medium text-gray-900">
                        {m.quantity.toLocaleString()}{m.unit ? ` ${m.unit}` : ''}
                      </td>
                      <td className="py-2 pr-3 text-gray-600">{m.performedBy ?? '—'}</td>
                      <td className="py-2 pr-3 text-gray-500">
                        <span className="block max-w-[260px] truncate" title={m.reason ?? m.reference ?? ''}>
                          {m.reference ?? m.reason ?? '—'}
                        </span>
                      </td>
                      <td className="py-2 text-gray-500 whitespace-nowrap">{formatDateShort(m.timestamp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function movementBadgeVariant(type: string): 'success' | 'warning' | 'danger' | 'default' | 'info' {
  switch (type) {
    case 'In':
    case 'Receipt':
    case 'Return':
      return 'success';
    case 'Out':
    case 'Issue':
      return 'warning';
    case 'Transfer':
      return 'info';
    case 'Adjustment':
    case 'Adjust':
      return 'default';
    default:
      return 'default';
  }
}

function InventoryValueTile(props: {
  label: string;
  total: number;
  productsValue: number;
  materialsValue: number;
}) {
  return (
    <div className="rounded-md border border-gray-200 p-3 bg-gray-50/40">
      <p className="text-[11px] uppercase tracking-wider text-gray-500">{props.label}</p>
      <p className="text-lg font-bold mt-1 text-gray-900">{formatWarehousePeso(props.total)}</p>
      <div className="text-[11px] text-gray-500 mt-1 space-y-0.5">
        <div className="flex items-center justify-between gap-2">
          <span>Products</span>
          <span className="font-medium text-gray-700">{formatWarehousePeso(props.productsValue)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>Raw materials</span>
          <span className="font-medium text-gray-700">{formatWarehousePeso(props.materialsValue)}</span>
        </div>
      </div>
    </div>
  );
}
