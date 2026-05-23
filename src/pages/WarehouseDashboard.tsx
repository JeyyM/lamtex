import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { WarehouseKpiStrip } from '@/src/components/warehouse/WarehouseKpiStrip';
import {
  DashTableRowLink,
  DashHeaderLink,
} from '@/src/components/executive/executiveLinks';
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
  WAREHOUSE_DASHBOARD_SHOW_STOCK_MOVEMENTS,
  type WarehouseManagerDashboardBundle,
  type IncomingPORow,
  type OrderToFulfillRow,
  type IBRToFulfillRow,
  type MyPRRow,
  type MyPORow,
  type RecentMovementRow,
} from '@/src/lib/warehouseDashboard';
import { buildWarehouseAssignmentScope } from '@/src/lib/warehouseScope';
import { finishedGoodProductHref } from '@/src/lib/productRoutes';

function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' });
}

function productHref(productId: string | null | undefined, categorySlug?: string | null): string {
  if (!productId) return '/warehouse';
  return finishedGoodProductHref(productId, categorySlug);
}

function materialHref(materialId: string): string {
  return `/materials/${materialId}`;
}

function movementHref(row: RecentMovementRow): string {
  if (row.kind === 'product' && row.entityId) return productHref(row.entityId);
  if (row.kind === 'material' && row.entityId) return materialHref(row.entityId);
  return '/warehouse';
}

function statusBadgeVariant(status: string): 'success' | 'warning' | 'danger' | 'default' | 'info' | 'neutral' {
  switch (status) {
    case 'Draft':
      return 'neutral';
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
  const {
    branch,
    employeeName,
    role,
    assignedProductIds,
    assignedMaterialIds,
    warehouseScopeLoading,
  } = useAppContext();

  const scopeProductKey = assignedProductIds?.join('|') ?? '';
  const scopeMaterialKey = assignedMaterialIds?.join('|') ?? '';

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
        const scope = buildWarehouseAssignmentScope(role, assignedProductIds, assignedMaterialIds);
        const data = await fetchWarehouseManagerDashboard({
          branchName: branch,
          employeeName,
          scope,
        });
        setBundle(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load warehouse dashboard');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      branch,
      employeeName,
      role,
      scopeProductKey,
      scopeMaterialKey,
      warehouseScopeLoading,
    ],
  );

  useEffect(() => {
    if (warehouseScopeLoading) return;
    void load();
  }, [load, warehouseScopeLoading]);

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
          <DashHeaderLink to="/warehouse">
            <Package className="w-4 h-4" /> Open Warehouse
          </DashHeaderLink>
        </div>
      </div>

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

      <WarehouseKpiStrip kpis={bundle.kpis} />

      {(bundle.criticalInventory.stockoutCount > 0 ||
        bundle.criticalInventory.lowStockProductCount > 0 ||
        bundle.criticalInventory.lowStockMaterialCount > 0) && (
        <CriticalInventoryCard inventory={bundle.criticalInventory} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <IncomingPOsCard
          rows={bundle.incomingPurchaseOrders}
          count={bundle.incomingPurchaseOrderCount}
          totalValue={bundle.incomingPurchaseOrderValue}
        />
        <OrdersToFulfillCard
          rows={bundle.ordersAwaitingFulfillment}
          count={bundle.ordersAwaitingFulfillmentCount}
        />
        <IBRsCard rows={bundle.ibrsToFulfill} count={bundle.ibrsToFulfillCount} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MyPRsCard
          recent={bundle.myProductionRequests.recent}
          statusCounts={bundle.myProductionRequests.statusCounts}
          activeCount={bundle.myProductionRequests.activeCount}
        />
        <MyPOsCard
          recent={bundle.myPurchaseOrders.recent}
          statusCounts={bundle.myPurchaseOrders.statusCounts}
          activeCount={bundle.myPurchaseOrders.activeCount}
        />
      </div>

      {WAREHOUSE_DASHBOARD_SHOW_STOCK_MOVEMENTS && (
        <MovementsCard
          trend={bundle.movementsTrend}
          recent={bundle.recentMovements}
          inventoryValue={bundle.inventoryValue}
        />
      )}

      <p className="text-xs text-gray-400 text-right">
        Generated {new Date(bundle.generatedAt).toLocaleString()}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function QueueTableCard(props: {
  icon: React.ReactNode;
  title: string;
  count: number;
  emptyText: string;
  viewAllHref: string;
  footer?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            {props.icon}
            {props.title}
            {props.count > 0 && <Badge variant="warning">{props.count}</Badge>}
          </CardTitle>
          <DashHeaderLink
            to={props.viewAllHref}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm"
          >
            <ArrowRight className="w-4 h-4" />
          </DashHeaderLink>
        </div>
      </CardHeader>
      <CardContent>
        {props.count === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">{props.emptyText}</p>
        ) : (
          props.children
        )}
        {props.footer && props.count > 0 && (
          <p className="text-xs text-gray-500 mt-3 border-t border-gray-100 pt-2">{props.footer}</p>
        )}
      </CardContent>
    </Card>
  );
}

function CriticalInventoryCard(props: {
  inventory: WarehouseManagerDashboardBundle['criticalInventory'];
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
            <DashHeaderLink to="/warehouse">
              <Package className="w-4 h-4" /> Products
            </DashHeaderLink>
            <DashHeaderLink to="/materials">
              <Box className="w-4 h-4" /> Materials
            </DashHeaderLink>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {inventory.stockouts.length > 0 && (
          <InventoryAlertTable
            title="Stockouts"
            count={inventory.stockoutCount}
            badgeVariant="danger"
            headers={['Product', 'SKU', 'Stock / reorder', 'Last restock', '']}
            rows={inventory.stockouts.map((s) => ({
              key: s.variantId,
              href: productHref(s.productId, s.categorySlug),
              ariaLabel: `Open product ${s.productName}`,
              cells: [
                s.productName,
                `${s.size} · ${s.sku}`,
                `${s.totalStock} / ${s.reorderPoint}`,
                formatDateShort(s.lastRestocked),
                <Badge key="b" variant="danger" className="text-[10px]">Stockout</Badge>,
              ],
            }))}
          />
        )}
        {inventory.lowStockProducts.length > 0 && (
          <InventoryAlertTable
            title="Low-stock products"
            count={inventory.lowStockProductCount}
            badgeVariant="warning"
            icon={<Package className="w-4 h-4 text-amber-600" />}
            headers={['Product', 'SKU', 'Stock / reorder', 'Safety', '']}
            rows={inventory.lowStockProducts.map((p) => ({
              key: p.variantId,
              href: productHref(p.productId, p.categorySlug),
              ariaLabel: `Open product ${p.productName}`,
              cells: [
                p.productName,
                `${p.size} · ${p.sku}`,
                `${p.totalStock} / ${p.reorderPoint}`,
                p.safetyStock > 0 ? String(p.safetyStock) : '—',
                <Badge key="b" variant="warning" className="text-[10px]">Low</Badge>,
              ],
            }))}
          />
        )}
        {inventory.lowStockMaterials.length > 0 && (
          <InventoryAlertTable
            title="Low-stock raw materials"
            count={inventory.lowStockMaterialCount}
            badgeVariant="warning"
            icon={<Box className="w-4 h-4 text-amber-600" />}
            headers={['Material', 'SKU', 'Stock / reorder', 'Cover', '']}
            rows={inventory.lowStockMaterials.map((m) => ({
              key: m.materialId,
              href: materialHref(m.materialId),
              ariaLabel: `Open material ${m.name}`,
              cells: [
                m.name,
                m.sku + (m.primarySupplier ? ` · ${m.primarySupplier}` : ''),
                `${m.totalStock.toLocaleString()}${m.unit ? ` ${m.unit}` : ''} / ${m.reorderPoint.toLocaleString()}`,
                m.daysOfCover != null ? `${m.daysOfCover}d` : '—',
                <Badge key="b" variant={m.totalStock === 0 ? 'danger' : 'warning'} className="text-[10px]">
                  {m.totalStock === 0 ? 'Out' : 'Low'}
                </Badge>,
              ],
            }))}
          />
        )}
      </CardContent>
    </Card>
  );
}

function InventoryAlertTable(props: {
  title: string;
  count: number;
  badgeVariant: 'danger' | 'warning';
  icon?: React.ReactNode;
  headers: string[];
  rows: Array<{
    key: string;
    href: string;
    ariaLabel: string;
    cells: React.ReactNode[];
  }>;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
        {props.icon}
        <span>{props.title}</span>
        <Badge variant={props.badgeVariant}>{props.count}</Badge>
      </h3>
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-200">
              {props.headers.map((h) => (
                <th key={h || 'status'} className={`py-2 px-2 text-left font-semibold ${h === '' ? 'w-8' : ''}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {props.rows.map((row) => (
              <DashTableRowLink key={row.key} to={row.href} title={row.ariaLabel}>
                {row.cells.map((cell, i) => (
                  <td
                    key={i}
                    className={`table-cell py-2 px-2 align-middle text-gray-800 ${i === props.headers.length - 1 ? 'text-right' : ''}`}
                  >
                    {typeof cell === 'string' ? (
                      <span className={i === 0 ? 'font-medium truncate block max-w-[220px]' : 'truncate block max-w-[180px]'} title={cell}>
                        {cell}
                      </span>
                    ) : (
                      cell
                    )}
                  </td>
                ))}
              </DashTableRowLink>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IncomingPOsCard(props: {
  rows: IncomingPORow[];
  count: number;
  totalValue: number;
}) {
  return (
    <QueueTableCard
      icon={<PackageCheck className="w-4 h-4 text-blue-600" />}
      title="Incoming POs to receive"
      count={props.count}
      emptyText="Nothing inbound."
      viewAllHref="/purchase-orders"
      footer={`Total inbound value: ${formatWarehousePeso(props.totalValue)}`}
    >
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-200">
              <th className="py-2 px-2 text-left font-semibold">PO</th>
              <th className="py-2 px-2 text-left font-semibold">Supplier</th>
              <th className="py-2 px-2 text-left font-semibold">Expect</th>
              <th className="py-2 px-2 text-right font-semibold">Amount</th>
              <th className="py-2 px-2 text-right font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {props.rows.map((r) => (
              <DashTableRowLink
                key={r.id}
                to={`/purchase-orders/${r.id}`}
                title={`${r.poNumber} — right-click or Ctrl+click to open in new tab`}
              >
                <td className="table-cell py-2 px-2 align-middle font-mono text-xs text-gray-900 whitespace-nowrap">
                  {r.poNumber}
                </td>
                <td className="table-cell py-2 px-2 align-middle text-gray-700">
                  <span className="block truncate max-w-[140px]" title={r.supplierName ?? undefined}>
                    {r.supplierName ?? '—'}
                  </span>
                </td>
                <td className="table-cell py-2 px-2 align-middle text-gray-600 whitespace-nowrap">
                  {formatDateShort(r.expectedDeliveryDate)}
                  {r.daysUntilExpected != null && (
                    <span className={`block text-[11px] ${r.daysUntilExpected < 0 ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                      {r.daysUntilExpected < 0
                        ? `${Math.abs(r.daysUntilExpected)}d overdue`
                        : r.daysUntilExpected === 0
                          ? 'Today'
                          : `${r.daysUntilExpected}d`}
                    </span>
                  )}
                </td>
                <td className="table-cell py-2 px-2 align-middle text-right font-medium text-gray-900 whitespace-nowrap">
                  {formatWarehousePeso(r.totalAmount)}
                </td>
                <td className="table-cell py-2 px-2 align-middle text-right">
                  <Badge variant={statusBadgeVariant(r.status)} className="text-[10px]">{r.status}</Badge>
                </td>
              </DashTableRowLink>
            ))}
          </tbody>
        </table>
      </div>
    </QueueTableCard>
  );
}

function OrdersToFulfillCard(props: { rows: OrderToFulfillRow[]; count: number }) {
  return (
    <QueueTableCard
      icon={<Truck className="w-4 h-4 text-emerald-600" />}
      title="Orders awaiting fulfilment"
      count={props.count}
      emptyText="No orders in the warehouse pipeline."
      viewAllHref="/warehouse"
    >
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-200">
              <th className="py-2 px-2 text-left font-semibold">Order</th>
              <th className="py-2 px-2 text-left font-semibold">Customer</th>
              <th className="py-2 px-2 text-left font-semibold">Required</th>
              <th className="py-2 px-2 text-right font-semibold">Amount</th>
              <th className="py-2 px-2 text-right font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {props.rows.map((r) => {
              const urgencyClass =
                r.urgency === 'overdue'
                  ? 'text-red-600 font-semibold'
                  : r.urgency === 'today' || r.urgency === 'soon'
                    ? 'text-amber-600 font-medium'
                    : 'text-gray-600';
              return (
                <DashTableRowLink
                  key={r.id}
                  to={`/orders/${r.id}`}
                  title={`${r.orderNumber} — right-click or Ctrl+click to open in new tab`}
                >
                  <td className="table-cell py-2 px-2 align-middle font-mono text-xs text-gray-900 whitespace-nowrap">
                    {r.orderNumber}
                  </td>
                  <td className="table-cell py-2 px-2 align-middle text-gray-700">
                    <span className="block truncate max-w-[140px]" title={r.customerName}>
                      {r.customerName}
                    </span>
                    <span className="block text-[11px] text-gray-400 truncate">
                      {r.lineCount} line{r.lineCount === 1 ? '' : 's'} · {r.agentName ?? '—'}
                    </span>
                  </td>
                  <td className={`table-cell py-2 px-2 align-middle whitespace-nowrap ${urgencyClass}`}>
                    {formatDateShort(r.requiredDate)}
                    {r.daysUntilRequired != null && (
                      <span className="block text-[11px]">
                        {r.daysUntilRequired < 0
                          ? `${Math.abs(r.daysUntilRequired)}d overdue`
                          : r.daysUntilRequired === 0
                            ? 'today'
                            : `${r.daysUntilRequired}d`}
                      </span>
                    )}
                  </td>
                  <td className="table-cell py-2 px-2 align-middle text-right font-medium text-gray-900 whitespace-nowrap">
                    {formatWarehousePeso(r.totalAmount)}
                  </td>
                  <td className="table-cell py-2 px-2 align-middle text-right">
                    <Badge variant={statusBadgeVariant(r.status)} className="text-[10px]">{r.status}</Badge>
                  </td>
                </DashTableRowLink>
              );
            })}
          </tbody>
        </table>
      </div>
    </QueueTableCard>
  );
}

function IBRsCard(props: { rows: IBRToFulfillRow[]; count: number }) {
  return (
    <QueueTableCard
      icon={<Repeat className="w-4 h-4 text-violet-600" />}
      title="IBRs to fulfil"
      count={props.count}
      emptyText="Nothing inbound from sister branches."
      viewAllHref="/inter-branch-requests"
    >
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-200">
              <th className="py-2 px-2 text-left font-semibold">IBR</th>
              <th className="py-2 px-2 text-left font-semibold">From</th>
              <th className="py-2 px-2 text-left font-semibold">Depart</th>
              <th className="py-2 px-2 text-left font-semibold">Lines</th>
              <th className="py-2 px-2 text-right font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {props.rows.map((r) => (
              <DashTableRowLink
                key={r.id}
                to={`/inter-branch-requests/${r.id}`}
                title={`${r.ibrNumber} — right-click or Ctrl+click to open in new tab`}
              >
                <td className="table-cell py-2 px-2 align-middle font-mono text-xs text-gray-900 whitespace-nowrap">
                  {r.ibrNumber}
                </td>
                <td className="table-cell py-2 px-2 align-middle text-gray-700">
                  <span className="block truncate max-w-[120px]" title={r.requestingBranchName ?? undefined}>
                    {r.requestingBranchName ?? '—'}
                  </span>
                </td>
                <td className="table-cell py-2 px-2 align-middle text-gray-600 whitespace-nowrap">
                  {formatDateShort(r.scheduledDepartureDate)}
                  {r.daysUntilDeparture != null && (
                    <span className={`block text-[11px] ${r.daysUntilDeparture < 0 ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                      {r.daysUntilDeparture < 0
                        ? `${Math.abs(r.daysUntilDeparture)}d overdue`
                        : r.daysUntilDeparture === 0
                          ? 'today'
                          : `${r.daysUntilDeparture}d`}
                    </span>
                  )}
                </td>
                <td className="table-cell py-2 px-2 align-middle text-gray-600">
                  <span className="block truncate max-w-[120px]" title={r.lineKindSummary}>
                    {r.lineKindSummary}
                  </span>
                </td>
                <td className="table-cell py-2 px-2 align-middle text-right">
                  <Badge variant={statusBadgeVariant(r.status)} className="text-[10px]">{r.status}</Badge>
                </td>
              </DashTableRowLink>
            ))}
          </tbody>
        </table>
      </div>
    </QueueTableCard>
  );
}

function MyPRsCard(props: {
  recent: MyPRRow[];
  statusCounts: Record<string, number>;
  activeCount: number;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Factory className="w-4 h-4 text-orange-600" /> My production requests
            {props.activeCount > 0 && <Badge variant="warning">{props.activeCount} active</Badge>}
          </CardTitle>
          <DashHeaderLink to="/production-requests">
            All <ArrowRight className="w-4 h-4" />
          </DashHeaderLink>
        </div>
      </CardHeader>
      <CardContent>
        <StatusCountStrip counts={props.statusCounts} />
        {props.recent.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center mt-2">You haven't raised any PRs yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto -mx-1 px-1">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <th className="py-2 px-2 text-left font-semibold">PR</th>
                  <th className="py-2 px-2 text-left font-semibold">Items</th>
                  <th className="py-2 px-2 text-left font-semibold">Need by</th>
                  <th className="py-2 px-2 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {props.recent.map((r) => (
                  <DashTableRowLink
                    key={r.id}
                    to={`/production-requests/${r.id}`}
                    title={`${r.prNumber} — right-click or Ctrl+click to open in new tab`}
                  >
                    <td className="table-cell py-2 px-2 align-middle font-mono text-xs text-gray-900 whitespace-nowrap">
                      {r.prNumber}
                    </td>
                    <td className="table-cell py-2 px-2 align-middle text-gray-600 tabular-nums">
                      {r.itemCount}
                    </td>
                    <td className="table-cell py-2 px-2 align-middle text-gray-600 whitespace-nowrap">
                      {formatDateShort(r.expectedCompletionDate)}
                    </td>
                    <td className="table-cell py-2 px-2 align-middle text-right">
                      <Badge variant={statusBadgeVariant(r.status)} className="text-[10px]">{r.status}</Badge>
                    </td>
                  </DashTableRowLink>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MyPOsCard(props: {
  recent: MyPORow[];
  statusCounts: Record<string, number>;
  activeCount: number;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="w-4 h-4 text-blue-600" /> My purchase orders
            {props.activeCount > 0 && <Badge variant="warning">{props.activeCount} active</Badge>}
          </CardTitle>
          <DashHeaderLink to="/purchase-orders">
            All <ArrowRight className="w-4 h-4" />
          </DashHeaderLink>
        </div>
      </CardHeader>
      <CardContent>
        <StatusCountStrip counts={props.statusCounts} />
        {props.recent.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center mt-2">You haven't raised any POs yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto -mx-1 px-1">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <th className="py-2 px-2 text-left font-semibold">PO</th>
                  <th className="py-2 px-2 text-left font-semibold">Supplier</th>
                  <th className="py-2 px-2 text-left font-semibold">Expect</th>
                  <th className="py-2 px-2 text-right font-semibold">Amount</th>
                  <th className="py-2 px-2 text-right font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {props.recent.map((r) => (
                  <DashTableRowLink
                    key={r.id}
                    to={`/purchase-orders/${r.id}`}
                    title={`${r.poNumber} — right-click or Ctrl+click to open in new tab`}
                  >
                    <td className="table-cell py-2 px-2 align-middle font-mono text-xs text-gray-900 whitespace-nowrap">
                      {r.poNumber}
                    </td>
                    <td className="table-cell py-2 px-2 align-middle text-gray-700">
                      <span className="block truncate max-w-[120px]" title={r.supplierName ?? undefined}>
                        {r.supplierName ?? '—'}
                      </span>
                    </td>
                    <td className="table-cell py-2 px-2 align-middle text-gray-600 whitespace-nowrap">
                      {formatDateShort(r.expectedDeliveryDate)}
                    </td>
                    <td className="table-cell py-2 px-2 align-middle text-right font-medium text-gray-900 whitespace-nowrap">
                      {formatWarehousePeso(r.totalAmount)}
                    </td>
                    <td className="table-cell py-2 px-2 align-middle text-right">
                      <Badge variant={statusBadgeVariant(r.status)} className="text-[10px]">{r.status}</Badge>
                    </td>
                  </DashTableRowLink>
                ))}
              </tbody>
            </table>
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
                    <DashTableRowLink
                      key={`${m.kind}-${m.id}`}
                      to={movementHref(m)}
                      title={`${m.itemName} — right-click or Ctrl+click to open in new tab`}
                    >
                      <td className="table-cell py-2 pr-3 align-middle">
                        <Badge variant={movementBadgeVariant(m.type)} className="text-[10px]">
                          {m.type}
                        </Badge>
                      </td>
                      <td className="table-cell py-2 pr-3 align-middle text-gray-800">
                        <div className="flex flex-col leading-tight">
                          <span className="truncate max-w-[260px]">{m.itemName}</span>
                          <span className="text-xs text-gray-400">{m.sku ?? '—'} · {m.kind === 'product' ? 'Product' : 'Material'}</span>
                        </div>
                      </td>
                      <td className="table-cell py-2 pr-3 align-middle text-right font-medium text-gray-900">
                        {m.quantity.toLocaleString()}{m.unit ? ` ${m.unit}` : ''}
                      </td>
                      <td className="table-cell py-2 pr-3 align-middle text-gray-600">{m.performedBy ?? '—'}</td>
                      <td className="table-cell py-2 pr-3 align-middle text-gray-500">
                        <span className="block max-w-[260px] truncate" title={m.reason ?? m.reference ?? ''}>
                          {m.reference ?? m.reason ?? '—'}
                        </span>
                      </td>
                      <td className="table-cell py-2 align-middle text-gray-500 whitespace-nowrap">
                        {formatDateShort(m.timestamp)}
                      </td>
                    </DashTableRowLink>
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
