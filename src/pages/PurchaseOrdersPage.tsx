import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { supabase } from '@/src/lib/supabase';
import {
  ShoppingCart,
  Search,
  Filter,
  Plus,
  FileText,
  Download,
  Send,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Package,
  Truck,
  Ban,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────
type POStatus = 'Draft' | 'Sent' | 'Confirmed' | 'Partially Received' | 'Completed' | 'Cancelled';

interface PORow {
  id: string;
  po_number: string;
  branch_id: string | null;
  supplier_id: string | null;
  status: POStatus;
  order_date: string;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  total_amount: number;
  currency: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  suppliers: { name: string } | null;
  branches:  { name: string } | null;
  purchase_order_items: { id: string }[];
}

const STATUS_OPTIONS: POStatus[] = ['Draft', 'Sent', 'Confirmed', 'Partially Received', 'Completed', 'Cancelled'];

const fmt = (date: string | null) =>
  date ? new Date(date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const getStatusVariant = (status: POStatus): 'success' | 'warning' | 'danger' | 'neutral' | 'default' => {
  if (status === 'Completed')          return 'success';
  if (status === 'Partially Received') return 'warning';
  if (status === 'Cancelled')          return 'danger';
  if (status === 'Confirmed')          return 'default';
  if (status === 'Sent')               return 'default';
  return 'neutral';
};

const getStatusIcon = (status: POStatus) => {
  if (status === 'Completed')          return <CheckCircle className="w-3.5 h-3.5" />;
  if (status === 'Sent')               return <Send className="w-3.5 h-3.5" />;
  if (status === 'Confirmed')          return <Truck className="w-3.5 h-3.5" />;
  if (status === 'Partially Received') return <Package className="w-3.5 h-3.5" />;
  if (status === 'Cancelled')          return <Ban className="w-3.5 h-3.5" />;
  return <FileText className="w-3.5 h-3.5" />;
};

export function PurchaseOrdersPage() {
  const { branch } = useAppContext();
  const navigate = useNavigate();

  const [orders, setOrders]                     = useState<PORow[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState<string | null>(null);
  const [resolvedBranchId, setResolvedBranchId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery]           = useState('');
  const [statusFilter, setStatusFilter]         = useState<string>('All');

  // ── Fetch ──────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [branchResult, ordersResult] = await Promise.all([
        branch
          ? supabase.from('branches').select('id').eq('name', branch).single()
          : Promise.resolve({ data: null }),
        supabase
          .from('purchase_orders')
          .select('*, suppliers(name), branches(name), purchase_order_items(id)')
          .order('created_at', { ascending: false }),
      ]);
      if (ordersResult.error) throw ordersResult.error;
      const resolvedId = (branchResult as any).data?.id ?? null;
      setResolvedBranchId(resolvedId);
      setOrders((ordersResult.data ?? []) as unknown as PORow[]);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  }, [branch]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // ── Filter ─────────────────────────────────────────────
  const branchFiltered = orders.filter(po =>
    !resolvedBranchId || po.branch_id === resolvedBranchId
  );

  const filtered = branchFiltered.filter(po => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      po.po_number.toLowerCase().includes(q) ||
      (po.suppliers?.name ?? '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'All' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // ── KPIs ───────────────────────────────────────────────
  const totalPOs     = branchFiltered.length;
  const pendingPOs   = branchFiltered.filter(po => ['Sent', 'Confirmed', 'Partially Received'].includes(po.status)).length;
  const completedPOs = branchFiltered.filter(po => po.status === 'Completed').length;
  const totalValue   = branchFiltered.reduce((s, po) => s + (po.total_amount ?? 0), 0);

  const isOverdue = (po: PORow) =>
    po.expected_delivery_date &&
    !po.actual_delivery_date &&
    new Date(po.expected_delivery_date) < new Date() &&
    !['Completed', 'Cancelled'].includes(po.status);

  // ── Loading / Error ────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-red-500 mx-auto" />
          <p className="mt-4 text-gray-500">Loading purchase orders…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
          <p className="text-gray-800 font-semibold mb-1">Failed to load purchase orders</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <Button variant="outline" onClick={fetchOrders} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500 mt-1">
            Raw material procurement for{' '}
            <span className="font-medium text-gray-700">{branch || 'all branches'}</span>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto gap-2">
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button variant="primary" className="w-full sm:w-auto gap-2">
            <Plus className="w-4 h-4" /> New Purchase Order
          </Button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg"><ShoppingCart className="w-6 h-6 text-blue-600" /></div>
            <div><p className="text-sm text-gray-500">Total POs</p><p className="text-2xl font-bold text-gray-900">{totalPOs}</p></div>
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-lg"><Clock className="w-6 h-6 text-orange-600" /></div>
            <div><p className="text-sm text-gray-500">In Progress</p><p className="text-2xl font-bold text-gray-900">{pendingPOs}</p></div>
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg"><CheckCircle className="w-6 h-6 text-green-600" /></div>
            <div><p className="text-sm text-gray-500">Completed</p><p className="text-2xl font-bold text-gray-900">{completedPOs}</p></div>
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg"><FileText className="w-6 h-6 text-purple-600" /></div>
            <div><p className="text-sm text-gray-500">Total Value</p><p className="text-2xl font-bold text-gray-900">₱{(totalValue / 1_000_000).toFixed(1)}M</p></div>
          </div>
        </CardContent></Card>
      </div>

      {/* ── Filters ── */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by PO number or supplier…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-none bg-white"
              >
                <option value="All">All Statuses</option>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Table ── */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders — {filtered.length} result{filtered.length !== 1 ? 's' : ''}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <ShoppingCart className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-gray-500 text-sm">No purchase orders found</p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden divide-y divide-gray-200">
                {filtered.map(po => (
                  <div
                    key={po.id}
                    className="p-4 space-y-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/purchase-orders/${po.id}`)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-blue-600">{po.po_number}</div>
                        <div className="text-sm text-gray-900 mt-0.5">{po.suppliers?.name ?? '—'}</div>
                      </div>
                      <Badge variant={getStatusVariant(po.status)} className="inline-flex items-center gap-1 whitespace-nowrap shrink-0">
                        {getStatusIcon(po.status)} {po.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><p className="text-gray-500">Order Date</p><p className="font-medium">{fmt(po.order_date)}</p></div>
                      <div>
                        <p className="text-gray-500">Exp. Delivery</p>
                        <p className={`font-medium ${isOverdue(po) ? 'text-red-600' : ''}`}>
                          {fmt(po.expected_delivery_date)}{isOverdue(po) ? ' ⚠' : ''}
                        </p>
                      </div>
                      <div><p className="text-gray-500">Items</p><p className="font-medium">{po.purchase_order_items.length}</p></div>
                      <div><p className="text-gray-500">Amount</p><p className="font-medium">₱{po.total_amount.toLocaleString()}</p></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium">PO Number</th>
                      <th className="px-6 py-3 text-left font-medium">Order Date</th>
                      <th className="px-6 py-3 text-left font-medium">Supplier</th>
                      <th className="px-6 py-3 text-left font-medium">Items</th>
                      <th className="px-6 py-3 text-left font-medium">Amount</th>
                      <th className="px-6 py-3 text-left font-medium">Exp. Delivery</th>
                      <th className="px-6 py-3 text-center font-medium w-44">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filtered.map(po => (
                      <tr
                        key={po.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/purchase-orders/${po.id}`)}
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium text-blue-600 hover:underline">{po.po_number}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{fmt(po.order_date)}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{po.suppliers?.name ?? '—'}</td>
                        <td className="px-6 py-4 text-gray-600">
                          {po.purchase_order_items.length} {po.purchase_order_items.length === 1 ? 'item' : 'items'}
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {po.currency === 'USD' ? '$' : '₱'}{po.total_amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={isOverdue(po) ? 'text-red-600 font-medium flex items-center gap-1' : 'text-gray-600'}>
                            {isOverdue(po) && <AlertTriangle className="w-3.5 h-3.5" />}
                            {fmt(po.expected_delivery_date)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant={getStatusVariant(po.status)} className="inline-flex items-center gap-1 whitespace-nowrap">
                            {getStatusIcon(po.status)} {po.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
