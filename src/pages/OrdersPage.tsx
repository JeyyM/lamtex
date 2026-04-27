import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { TablePagination, TABLE_PAGE_SIZE } from '@/src/components/ui/TablePagination';
import { ProofOfDeliveryModal } from '@/src/components/orders/ProofOfDeliveryModal';
import { useAppContext } from '@/src/store/AppContext';
import { supabase } from '@/src/lib/supabase';

const orderLogRoleMap: Record<string, 'Agent' | 'Warehouse Staff' | 'Manager' | 'Admin' | 'System' | 'Logistics'> = {
  Executive: 'Admin',
  Manager: 'Manager',
  Agent: 'Agent',
  'Warehouse Staff': 'Warehouse Staff',
  Warehouse: 'Warehouse Staff',
  Logistics: 'Logistics',
  Driver: 'Logistics',
};
import {
  Search,
  Filter,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck,
  Package,
  FileText,
  XCircle,
  Edit2,
  Camera,
  MapPin,
  Calendar,
  Loader2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';

type OrderTab = 'all' | 'draft' | 'pending' | 'approved' | 'intransit' | 'delivered' | 'rejected';

interface OrderRow {
  id: string;
  order_number: string;
  customer_name: string | null;
  agent_name: string | null;
  order_date: string | null;
  required_date: string | null;
  total_amount: number;
  discount_percent: number;
  status: string;
  payment_status: string;
  requires_approval: boolean;
  delivery_address: string | null;
}

export function OrdersPage() {
  const navigate = useNavigate();
  const { branch, addAuditLog, role, employeeName, session } = useAppContext();
  const [activeTab, setActiveTab] = useState<OrderTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [creating, setCreating] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedOrderForProof, setSelectedOrderForProof] = useState<{ id: string; customer: string } | null>(null);
  const [allOrders, setAllOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<string>('order_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [tablePage, setTablePage] = useState(1);
  /** '' = all values (column filter on orders table) */
  const [headerStatusFilter, setHeaderStatusFilter] = useState('');
  const [headerPaymentFilter, setHeaderPaymentFilter] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    const { data: branchData } = await supabase
      .from('branches')
      .select('id')
      .eq('name', branch)
      .single();

    if (!branchData) { setLoading(false); return; }

    const { data } = await supabase
      .from('orders')
      .select('id, order_number, customer_name, agent_name, order_date, required_date, total_amount, discount_percent, status, payment_status, requires_approval, delivery_address')
      .eq('branch_id', branchData.id)
      .order('created_at', { ascending: false });

    setAllOrders((data ?? []) as OrderRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, [branch]);

  useEffect(() => {
    setHeaderStatusFilter('');
    setHeaderPaymentFilter('');
  }, [branch]);

  /** Consistent list order: Approved → … → logistics pipeline (not alphabetical). */
  const orderStatusListOrder: string[] = useMemo(
    () => [
      'Draft',
      'Pending',
      'Approved',
      'Scheduled',
      'Loading',
      'Packed',
      'Ready',
      'In Transit',
      'Partially Fulfilled',
      'Delivered',
      'Completed',
      'Cancelled',
      'Rejected',
    ],
    [],
  );

  const distinctOrderStatuses = useMemo(() => {
    const s = new Set<string>(allOrders.map((o) => o.status).filter((v): v is string => Boolean(v)));
    return Array.from(s).sort((a, b) => {
      const ia = orderStatusListOrder.indexOf(a);
      const ib = orderStatusListOrder.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
  }, [allOrders, orderStatusListOrder]);

  const distinctPaymentStatuses = useMemo(() => {
    const s = new Set<string>(allOrders.map((o) => o.payment_status).filter((v): v is string => Boolean(v)));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [allOrders]);

  const filteredOrders = allOrders.filter(order => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customer_name ?? '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'draft'     && order.status === 'Draft') ||
      (activeTab === 'pending'   && order.status === 'Pending') ||
      (activeTab === 'approved'  && ['Approved', 'Scheduled', 'Loading', 'Packed', 'Ready'].includes(order.status)) ||
      (activeTab === 'intransit' && order.status === 'In Transit') ||
      (activeTab === 'delivered' && ['Delivered', 'Completed'].includes(order.status)) ||
      (activeTab === 'rejected'  && ['Rejected', 'Cancelled'].includes(order.status));

    const matchesHeaderStatus = headerStatusFilter === '' || order.status === headerStatusFilter;
    const matchesHeaderPayment = headerPaymentFilter === '' || order.payment_status === headerPaymentFilter;

    return matchesSearch && matchesTab && matchesHeaderStatus && matchesHeaderPayment;
  });

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortIcon = (col: string) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 text-red-600" />
      : <ArrowDown className="w-3 h-3 ml-1 text-red-600" />;
  };

  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      let av: string | number;
      let bv: string | number;
      switch (sortKey) {
        case 'order_number': av = a.order_number; bv = b.order_number; break;
        case 'customer': av = (a.customer_name ?? '').toLowerCase(); bv = (b.customer_name ?? '').toLowerCase(); break;
        case 'agent': av = (a.agent_name ?? '').toLowerCase(); bv = (b.agent_name ?? '').toLowerCase(); break;
        case 'order_date': av = a.order_date ?? ''; bv = b.order_date ?? ''; break;
        case 'required_date': av = a.required_date ?? ''; bv = b.required_date ?? ''; break;
        case 'amount': av = a.total_amount; bv = b.total_amount; break;
        case 'status': av = a.status; bv = b.status; break;
        case 'payment': av = a.payment_status; bv = b.payment_status; break;
        default: av = a.order_date ?? ''; bv = b.order_date ?? '';
      }
      if (typeof av === 'number' && typeof bv === 'number') {
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      }
      const as = String(av);
      const bs = String(bv);
      if (as < bs) return sortDir === 'asc' ? -1 : 1;
      if (as > bs) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredOrders, sortKey, sortDir]);

  const totalListPages = Math.max(1, Math.ceil(sortedOrders.length / TABLE_PAGE_SIZE) || 1);
  const pagedOrders = useMemo(() => {
    const p = Math.min(tablePage, totalListPages);
    const start = (p - 1) * TABLE_PAGE_SIZE;
    return sortedOrders.slice(start, start + TABLE_PAGE_SIZE);
  }, [sortedOrders, tablePage, totalListPages]);

  useEffect(() => {
    if (tablePage > totalListPages) setTablePage(totalListPages);
  }, [tablePage, totalListPages]);

  useEffect(() => {
    setTablePage(1);
  }, [searchTerm, activeTab, branch, headerStatusFilter, headerPaymentFilter]);

  const getStatusBadgeVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' | 'default' | 'neutral' | 'outline' | 'destructive' => {
    if (['Delivered', 'Completed', 'Approved'].includes(status)) return 'success';
    if (['Pending', 'Scheduled', 'Loading', 'Packed', 'Ready'].includes(status)) return 'warning';
    if (['Rejected', 'Cancelled'].includes(status)) return 'danger';
    if (status === 'In Transit') return 'info';
    if (status === 'Draft') return 'neutral';
    return 'default';
  };

  const getPaymentBadgeVariant = (status: string): 'success' | 'warning' | 'danger' | 'info' | 'default' | 'neutral' | 'outline' | 'destructive' => {
    if (status === 'Paid') return 'success';
    if (status === 'Overdue') return 'danger';
    if (['Partially Paid', 'Invoiced'].includes(status)) return 'warning';
    if (status === 'Unbilled') return 'neutral';
    return 'default';
  };

  const handleViewOrder = (orderId: string) => {
    navigate(`/orders/${orderId}`);
    addAuditLog('Viewed Order', 'Order', `Viewed order ${orderId}`);
  };

  /** Same pattern as production requests: create an empty shell as Draft, then edit on the detail page. */
  const handleNewOrder = async () => {
    setCreating(true);
    try {
      let branchId: string | null = null;
      if (branch) {
        const { data: bd } = await supabase.from('branches').select('id').eq('name', branch).single();
        branchId = bd?.id ?? null;
      }
      if (!branchId) {
        alert('Select a branch in the header first.');
        return;
      }
      const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
      const actor = employeeName || session?.user?.email || 'User';
      const { data, error: insErr } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          branch_id: branchId,
          status: 'Draft',
          order_date: new Date().toISOString().split('T')[0],
          subtotal: 0,
          total_amount: 0,
          payment_status: 'Unbilled',
        })
        .select('id')
        .single();
      if (insErr) throw insErr;
      const logRole = orderLogRoleMap[role] ?? 'System';
      const { error: logErr } = await supabase.from('order_logs').insert({
        order_id: data.id,
        action: 'created',
        performed_by: actor,
        performed_by_role: logRole,
        description: 'Created as draft — add customer and lines, then submit for approval',
        metadata: { order_number: orderNumber },
      });
      if (logErr && import.meta.env.DEV) console.warn('[order log]', logErr.message);
      addAuditLog('Created Order (draft)', 'Order', orderNumber);
      navigate(`/orders/${data.id}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to create order');
    } finally {
      setCreating(false);
    }
  };

  const handleSendProof = (orderId: string, customer: string) => {
    setSelectedOrderForProof({ id: orderId, customer });
    setShowProofModal(true);
  };

  const handleProofSubmit = (orderId: string, imageFile: File) => {
    console.log('Proof of delivery uploaded for order:', orderId, imageFile.name);
    addAuditLog('Uploaded Proof of Delivery', 'Order', `Uploaded delivery proof for order ${orderId}`);
  };

  const tabCounts = {
    all:       allOrders.length,
    draft:     allOrders.filter(o => o.status === 'Draft').length,
    pending:   allOrders.filter(o => o.status === 'Pending').length,
    approved:  allOrders.filter(o => ['Approved', 'Scheduled', 'Loading', 'Packed', 'Ready'].includes(o.status)).length,
    intransit: allOrders.filter(o => o.status === 'In Transit').length,
    delivered: allOrders.filter(o => ['Delivered', 'Completed'].includes(o.status)).length,
    rejected:  allOrders.filter(o => ['Rejected', 'Cancelled'].includes(o.status)).length,
  };

  // Driver Simplified View
  if (role === 'Driver') {
    const driverOrders = allOrders.filter(order =>
      order.status === 'In Transit' || ['Delivered', 'Completed'].includes(order.status)
    ).filter(order =>
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customer_name ?? '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Deliveries</h1>
          <p className="text-sm text-gray-500 mt-1">Track and complete your assigned deliveries</p>
        </div>
        <Card>
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search by order # or customer..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none" />
            </div>
          </CardHeader>
        </Card>
        <div className="grid gap-4">
          {driverOrders.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900">{order.order_number}</h3>
                        <Badge variant={getStatusBadgeVariant(order.status)} className="text-xs">{order.status}</Badge>
                      </div>
                      <p className="text-sm text-gray-500">Customer: {order.customer_name}</p>
                    </div>
                    {order.status === 'In Transit' && (
                      <Button variant="primary" size="sm" className="gap-2 flex-shrink-0"
                        onClick={() => handleSendProof(order.id, order.customer_name ?? '')}>
                        <Camera className="w-4 h-4" />Send Proof
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div><p className="text-xs text-gray-500 mb-0.5">Delivery Address</p>
                        <p className="text-sm font-medium text-gray-900">{order.delivery_address || '—'}</p></div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div><p className="text-xs text-gray-500 mb-0.5">Required Date</p>
                        <p className="text-sm font-medium text-gray-900">{order.required_date ?? '—'}</p></div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Package className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div><p className="text-xs text-gray-500 mb-0.5">Total</p>
                        <p className="text-sm font-medium text-gray-900">₱{order.total_amount.toLocaleString()}</p></div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-gray-200">
                    <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-initial" onClick={() => handleViewOrder(order.id)}>
                      <FileText className="w-4 h-4" />View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {driverOrders.length === 0 && (
            <Card><CardContent className="py-12 text-center text-gray-500">
              <Truck className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="font-medium">No deliveries found</p>
            </CardContent></Card>
          )}
        </div>
        {showProofModal && selectedOrderForProof && (
          <ProofOfDeliveryModal orderId={selectedOrderForProof.id} customerName={selectedOrderForProof.customer}
            onClose={() => { setShowProofModal(false); setSelectedOrderForProof(null); }}
            onSubmit={handleProofSubmit} />
        )}
      </div>
    );
  }

  // Regular view
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
          <p className="text-sm text-gray-500 mt-1">Create, track, and manage customer orders</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            variant="primary"
            className="gap-2 w-full sm:w-auto"
            onClick={() => void handleNewOrder()}
            disabled={creating}
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            New order
          </Button>
        </div>
      </div>

      {/* Tabs - Mobile Dropdown */}
      <div className="md:hidden">
        <select value={activeTab} onChange={(e) => setActiveTab(e.target.value as OrderTab)}
          className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg text-sm font-medium focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none appearance-none bg-white">
          <option value="all">All Orders ({tabCounts.all})</option>
          <option value="draft">Drafts ({tabCounts.draft})</option>
          <option value="pending">Pending ({tabCounts.pending})</option>
          <option value="approved">Approved ({tabCounts.approved})</option>
          <option value="intransit">In Transit ({tabCounts.intransit})</option>
          <option value="delivered">Delivered ({tabCounts.delivered})</option>
          <option value="rejected">Rejected ({tabCounts.rejected})</option>
        </select>
      </div>

      {/* Tabs - Desktop */}
      <div className="hidden md:block border-b border-gray-200">
        <nav className="flex gap-6">
          {([
            { key: 'all', label: 'All Orders', icon: FileText },
            { key: 'draft', label: 'Drafts', icon: Edit2 },
            { key: 'pending', label: 'Pending', icon: Clock },
            { key: 'approved', label: 'Approved', icon: CheckCircle },
            { key: 'intransit', label: 'In Transit', icon: Truck },
            { key: 'delivered', label: 'Delivered', icon: Package },
            { key: 'rejected', label: 'Rejected', icon: XCircle },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key as OrderTab)}
              className={`flex items-center gap-2 px-1 py-3 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === key ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
              <Icon className="w-4 h-4" />{label}
              <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === key ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                {tabCounts[key as keyof typeof tabCounts]}
              </span>
            </button>
          ))}
        </nav>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1 sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="Search by order # or customer name..." value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none" />
              </div>
              <Button variant="outline" size="sm" className="gap-2"><Filter className="w-4 h-4" />More Filters</Button>
            </div>
            <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                aria-label="Filter by status"
                value={headerStatusFilter}
                onChange={(e) => setHeaderStatusFilter(e.target.value)}
                className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
              >
                <option value="">Status</option>
                {distinctOrderStatuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                aria-label="Filter by payment"
                value={headerPaymentFilter}
                onChange={(e) => setHeaderPaymentFilter(e.target.value)}
                className="w-full text-sm text-gray-900 border border-gray-300 rounded-lg px-3 py-2 bg-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
              >
                <option value="">Payment</option>
                {distinctPaymentStatuses.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" /><span>Loading orders...</span>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-200">
                {pagedOrders.map((order) => (
                  <div key={order.id} className="p-4 hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleViewOrder(order.id)}>
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="font-semibold text-gray-900 truncate">{order.order_number}</span>
                          {order.requires_approval && <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                        </div>
                        <Badge variant={getStatusBadgeVariant(order.status)} className="text-xs flex-shrink-0">{order.status}</Badge>
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 break-words">{order.customer_name}</div>
                        <div className="text-xs text-gray-500 truncate">{order.agent_name}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><div className="text-xs text-gray-500">Order Date</div><div className="text-gray-900 truncate">{order.order_date ?? '—'}</div></div>
                        <div><div className="text-xs text-gray-500">Required Date</div><div className="text-gray-900 truncate">{order.required_date ?? '—'}</div></div>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                        <div>
                          <div className="font-semibold text-gray-900">₱{order.total_amount.toLocaleString()}</div>
                          {order.discount_percent > 0 && <div className="text-xs text-gray-500">-{order.discount_percent.toFixed(1)}% discount</div>}
                        </div>
                        <Badge variant={getPaymentBadgeVariant(order.payment_status)} className="text-xs flex-shrink-0">{order.payment_status}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
                {sortedOrders.length === 0 && (
                  <div className="px-4 py-12 text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="font-medium">No orders found</p>
                    <p className="text-sm mt-1">Try adjusting your filters or create a new order</p>
                  </div>
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th onClick={() => handleSort('order_number')} className="px-6 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                        <span className="flex items-center">Order #{sortIcon('order_number')}</span>
                      </th>
                      <th onClick={() => handleSort('customer')} className="px-6 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                        <span className="flex items-center">Customer{sortIcon('customer')}</span>
                      </th>
                      <th onClick={() => handleSort('order_date')} className="px-6 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                        <span className="flex items-center">Order Date{sortIcon('order_date')}</span>
                      </th>
                      <th onClick={() => handleSort('required_date')} className="px-6 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                        <span className="flex items-center">Required Date{sortIcon('required_date')}</span>
                      </th>
                      <th onClick={() => handleSort('amount')} className="px-6 py-3 text-left font-medium cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                        <span className="flex items-center">Amount{sortIcon('amount')}</span>
                      </th>
                      <th className="px-3 py-3 text-left font-medium align-top min-w-[10.5rem] max-w-[14rem]">
                        <div className="normal-case">
                          <select
                            aria-label="Filter by status"
                            value={headerStatusFilter}
                            onChange={(e) => setHeaderStatusFilter(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full text-sm font-medium text-gray-800 border border-gray-200 rounded-md px-2 py-1.5 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                          >
                            <option value="">Status</option>
                            {distinctOrderStatuses.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </th>
                      <th className="px-3 py-3 text-left font-medium align-top min-w-[9.5rem] max-w-[13rem]">
                        <div className="normal-case">
                          <select
                            aria-label="Filter by payment"
                            value={headerPaymentFilter}
                            onChange={(e) => setHeaderPaymentFilter(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full text-sm font-medium text-gray-800 border border-gray-200 rounded-md px-2 py-1.5 bg-white hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                          >
                            <option value="">Payment</option>
                            {distinctPaymentStatuses.map((p) => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {pagedOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleViewOrder(order.id)}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{order.order_number}</span>
                            {order.requires_approval && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{order.customer_name}</div>
                          <div className="text-xs text-gray-500">{order.agent_name}</div>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{order.order_date ?? '—'}</td>
                        <td className="px-6 py-4 text-gray-600">{order.required_date ?? '—'}</td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">₱{order.total_amount.toLocaleString()}</div>
                          {order.discount_percent > 0 && <div className="text-xs text-gray-500">-{order.discount_percent.toFixed(1)}% discount</div>}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={getStatusBadgeVariant(order.status)} className="min-w-[120px] justify-center">{order.status}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={getPaymentBadgeVariant(order.payment_status)} className="min-w-[100px] justify-center">{order.payment_status}</Badge>
                        </td>
                      </tr>
                    ))}
                    {sortedOrders.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                          <p className="font-medium">No orders found</p>
                          <p className="text-sm mt-1">Try adjusting your filters or create a new order</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {sortedOrders.length > 0 && (
                <TablePagination page={tablePage} total={sortedOrders.length} onPageChange={setTablePage} />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {showProofModal && selectedOrderForProof && (
        <ProofOfDeliveryModal orderId={selectedOrderForProof.id} customerName={selectedOrderForProof.customer}
          onClose={() => { setShowProofModal(false); setSelectedOrderForProof(null); }}
          onSubmit={handleProofSubmit} />
      )}
    </div>
  );
}
