import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { useCustomerPermissions } from '@/src/lib/permissions/customerPermissions';
import { ModuleAccessDenied } from '@/src/components/permissions/ModuleAccessDenied';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { PortalModalOverlay } from '@/src/components/ui/PortalModalOverlay';
import { supabase } from '@/src/lib/supabase';
import {
  User,
  Users,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  CreditCard,
  Package,
  ShoppingCart,
  ArrowLeft,
  Edit,
  FileText,
  ChevronDown,
  Loader2,
  Download,
  CalendarRange,
  X,
} from 'lucide-react';
import { CreateOrderModal } from '@/src/components/orders/CreateOrderModal';
import { CustomerLocationMapPreview } from '@/src/components/maps/CustomerLocationMapPreview';
import { clientCommissionFraction, clientCommissionPercentLabel } from '@/src/types/customers';
import { recalculateCustomerPaymentScore } from '@/src/lib/customerPaymentScore';
import {
  DATE_PERIOD_OPTIONS,
  inDatePeriodRange,
  periodTriggerLabel,
  resolveDatePeriodQuery,
  todayIsoLocal,
  type DatePeriodKind,
} from '@/src/lib/datePeriodQuery';
import {
  downloadCustomerDetailWorkbook,
  fetchCustomerExportProfile,
  fetchCustomerOrderLinesForExport,
  fetchCustomerOrdersForExport,
} from '@/src/lib/customerDetailExport';
import { employeeProfilePathFromAgent } from '@/src/lib/agentAnalytics';
import { EntityNotFound, NOT_FOUND_COPY } from '@/src/components/ui/NotFound';
import { fetchTripNumbersByOrderIds } from '@/src/lib/orderTripLookup';
import { OrderTripIdCell } from '@/src/components/orders/OrderTripIdCell';

function formatPeso(amount: number): string {
  return amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Types ───────────────────────────────────────────────────────────────────

interface CustomerDetail {
  id: string;
  customer_code: string | null;
  name: string; type: string; client_type: string; status: string;
  risk_level: string; payment_behavior: string; contact_person: string;
  phone: string; email: string; alternate_phone: string | null;
  alternate_email: string | null; address: string; city: string; province: string;
  postal_code: string | null; business_registration: string | null; tax_id: string | null;
  credit_limit: number; outstanding_balance: number; available_credit: number;
  payment_terms: string; payment_score: number; avg_payment_days: number;
  overdue_amount: number; total_purchases_ytd: number; total_purchases_lifetime: number;
  order_count: number; last_order_date: string | null; account_since: string | null;
  payment_score_order_count?: number;
  assigned_agent_id: string | null;
  employees: { employee_name: string; employee_id: string } | null;
  branch_id: string | null;
  map_lat: number | null;
  map_lng: number | null;
}
interface OrderRow {
  id: string;
  order_number: string;
  order_date: string | null;
  required_date: string | null;
  status: string;
  payment_status: string;
  subtotal: number;
  discount_percent: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  agent_id: string | null;
  agent_name: string | null;
  agent_employee_id: string | null;
  trip_id: string | null;
  trip_number: string | null;
}

function formatPhp(amount: number) {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function embedOne<T extends Record<string, unknown>>(v: unknown): T | null {
  if (v == null) return null;
  if (Array.isArray(v)) return (v[0] as T | undefined) ?? null;
  if (typeof v === 'object') return v as T;
  return null;
}

function formatAddressLine(address: string, city: string, province: string): string {
  const parts = [address, city, province].map((p) => (p ?? '').trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '—';
}

function orderHistoryStatusBadgeVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'neutral' {
  const s = status.toLowerCase();
  if (s === 'delivered' || s === 'completed') return 'success';
  if (s === 'cancelled' || s === 'rejected') return 'danger';
  if (
    s === 'pending' ||
    s === 'scheduled' ||
    s === 'loading' ||
    s === 'packed' ||
    s === 'ready' ||
    s === 'in transit' ||
    s === 'partially fulfilled'
  )
    return 'warning';
  return 'default';
}

function orderHistoryPaymentBadgeVariant(payment: string): 'default' | 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  const p = payment.toLowerCase();
  if (p === 'paid') return 'success';
  if (p === 'overdue') return 'danger';
  if (p === 'partially paid') return 'warning';
  if (p === 'invoiced') return 'info';
  return 'neutral';
}

// ── Component ────────────────────────────────────────────────────────────────

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addAuditLog, isExecutiveUser, employeeId } = useAppContext();
  const customerPerms = useCustomerPermissions();

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [activeTab, setActiveTab] = useState<'overview' | 'orders'>('overview');
  const [showCreateOrder, setShowCreateOrder] = useState(false);

  const [exportPeriodKind, setExportPeriodKind] = useState<DatePeriodKind>('all');
  const [exportCustomStart, setExportCustomStart] = useState('');
  const [exportCustomEnd, setExportCustomEnd] = useState('');
  const [exportPeriodModalOpen, setExportPeriodModalOpen] = useState(false);
  const [draftExportPeriodKind, setDraftExportPeriodKind] = useState<DatePeriodKind>('all');
  const [draftExportCustomStart, setDraftExportCustomStart] = useState('');
  const [draftExportCustomEnd, setDraftExportCustomEnd] = useState('');
  const [exportingCustomer, setExportingCustomer] = useState(false);

  const [branchHqPin, setBranchHqPin] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      setLoading(true);
      setBranchHqPin(null);
      try {
        const [custRes, ordersRes] = await Promise.all([
          supabase.from('customers').select('*, employees!assigned_agent_id(employee_name, employee_id)').eq('id', id).single(),
          supabase
            .from('orders')
            .select(
              'id, order_number, order_date, required_date, status, payment_status, subtotal, discount_percent, discount_amount, total_amount, amount_paid, balance_due, agent_id, agent_name, employees!agent_id(employee_id)',
            )
            .eq('customer_id', id)
            .order('order_date', { ascending: false }),
        ]);
        if (custRes.error || !custRes.data) { setNotFound(true); return; }
        const c = custRes.data as any;
        if (!isExecutiveUser && employeeId && c.assigned_agent_id !== employeeId) {
          setNotFound(true);
          return;
        }
        const empRow = embedOne<Record<string, unknown>>(c.employees);
        const employeesNormalized =
          empRow && typeof empRow.employee_name === 'string'
            ? {
                employee_name: empRow.employee_name,
                employee_id: String(empRow.employee_id ?? ''),
              }
            : null;
        const creditLimit = Number(c.credit_limit ?? 0);
        const outstandingBalance = Number(c.outstanding_balance ?? 0);
        let availableCredit = Number(c.available_credit ?? 0);
        const expectedAvailable = Math.max(0, creditLimit - outstandingBalance);
        if (Math.abs(availableCredit - expectedAvailable) > 0.01) {
          availableCredit = expectedAvailable;
          await supabase
            .from('customers')
            .update({ available_credit: expectedAvailable, updated_at: new Date().toISOString() })
            .eq('id', id);
        }
        let paymentScore = c.payment_score ?? 0;
        let avgPaymentDays = c.avg_payment_days ?? 0;
        let paymentBehavior = c.payment_behavior ?? 'Good';
        let overdueAmount = Number(c.overdue_amount ?? 0);
        let paymentScoreOrderCount: number | undefined;

        const scoreRes = await recalculateCustomerPaymentScore(id);
        if (scoreRes.ok) {
          paymentScore = scoreRes.result.paymentScore;
          avgPaymentDays = scoreRes.result.avgPaymentDays;
          paymentBehavior = scoreRes.result.paymentBehavior;
          overdueAmount = scoreRes.result.overdueAmount;
          paymentScoreOrderCount = scoreRes.result.settledOrderCount;
        }

        setCustomer({
          id: c.id,
          customer_code: c.customer_code ? String(c.customer_code) : null,
          name: c.name, type: c.type ?? '', client_type: c.client_type ?? 'Office',
          status: c.status ?? 'Active', risk_level: c.risk_level ?? 'Low', payment_behavior: paymentBehavior,
          contact_person: c.contact_person ?? '', phone: c.phone ?? '', email: c.email ?? '',
          alternate_phone: c.alternate_phone ?? null, alternate_email: c.alternate_email ?? null,
          address: c.address ?? '', city: c.city ?? '', province: c.province ?? '',
          postal_code: c.postal_code ?? null, business_registration: c.business_registration ?? null, tax_id: c.tax_id ?? null,
          credit_limit: creditLimit, outstanding_balance: outstandingBalance,
          available_credit: availableCredit, payment_terms: c.payment_terms ?? '',
          payment_score: paymentScore, avg_payment_days: avgPaymentDays,
          overdue_amount: overdueAmount, total_purchases_ytd: Number(c.total_purchases_ytd ?? 0),
          total_purchases_lifetime: Number(c.total_purchases_lifetime ?? 0), order_count: c.order_count ?? 0,
          last_order_date: c.last_order_date ?? null, account_since: c.account_since ?? null,
          payment_score_order_count: paymentScoreOrderCount,
          assigned_agent_id: c.assigned_agent_id ?? null, employees: employeesNormalized,
          branch_id: c.branch_id ?? null,
          map_lat: c.map_lat != null ? Number(c.map_lat) : null,
          map_lng: c.map_lng != null ? Number(c.map_lng) : null,
        });
        const bid = c.branch_id ?? null;
        if (bid) {
          const { data: cs } = await supabase
            .from('company_settings')
            .select('hq_latitude, hq_longitude')
            .eq('branch_id', bid)
            .maybeSingle();
          const hLa = cs?.hq_latitude != null ? Number(cs.hq_latitude) : NaN;
          const hLn = cs?.hq_longitude != null ? Number(cs.hq_longitude) : NaN;
          if (Number.isFinite(hLa) && Number.isFinite(hLn)) {
            setBranchHqPin({ lat: hLa, lng: hLn });
          }
        }
        const mappedOrders = (ordersRes.data ?? []).map((o: any) => {
            const empRow = embedOne<{ employee_id?: string }>(o.employees);
            const agentId = o.agent_id ?? null;
            const agentName = typeof o.agent_name === 'string' ? o.agent_name.trim() : '';
            return {
              id: o.id,
              order_number: o.order_number,
              order_date: o.order_date ?? null,
              required_date: o.required_date ?? null,
              status: o.status ?? '',
              payment_status: o.payment_status ?? 'Unbilled',
              subtotal: Number(o.subtotal ?? 0),
              discount_percent: Number(o.discount_percent ?? 0),
              discount_amount: Number(o.discount_amount ?? 0),
              total_amount: Number(o.total_amount ?? 0),
              amount_paid: Number(o.amount_paid ?? 0),
              balance_due: Number(o.balance_due ?? 0),
              agent_id: agentId,
              agent_name: agentName || null,
              agent_employee_id: agentId && agentName ? (empRow?.employee_id ?? null) : null,
              trip_id: null,
              trip_number: null,
            };
          });
        const tripByOrder = await fetchTripNumbersByOrderIds(mappedOrders.map((o) => o.id));
        setOrders(
          mappedOrders.map((order) => {
            const trip = tripByOrder.get(order.id);
            return {
              ...order,
              trip_id: trip?.tripId ?? null,
              trip_number: trip?.tripNumber ?? null,
            };
          }),
        );
      } catch (err) {
        console.error('Error loading customer:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id, isExecutiveUser, employeeId]);

  const exportQueryDates = useMemo(
    () => resolveDatePeriodQuery(exportPeriodKind, exportCustomStart, exportCustomEnd),
    [exportPeriodKind, exportCustomStart, exportCustomEnd],
  );

  const maxExportCustomDate = useMemo(() => todayIsoLocal(), []);

  const draftExportCustomInvalid = Boolean(
    draftExportCustomStart && draftExportCustomEnd && draftExportCustomStart > draftExportCustomEnd,
  );

  const filteredOrders = useMemo(() => {
    if (exportQueryDates.invalid) return orders;
    return orders.filter((order) =>
      inDatePeriodRange(order.order_date, exportQueryDates.from, exportQueryDates.to),
    );
  }, [orders, exportQueryDates]);

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
    setDraftExportCustomStart((prev) => prev || exportCustomStart || start);
    setDraftExportCustomEnd((prev) => prev || exportCustomEnd || iso);
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

  const handleExportCustomer = async () => {
    if (!customer || exportingCustomer || exportQueryDates.invalid) return;
    if (filteredOrders.length === 0) {
      window.alert('No orders match the selected date range.');
      return;
    }
    setExportingCustomer(true);
    try {
      const profile = await fetchCustomerExportProfile(customer.id);
      if (!profile) throw new Error('Could not load customer profile for export.');
      const orderRows = await fetchCustomerOrdersForExport(
        customer.id,
        exportQueryDates.from,
        exportQueryDates.to,
      );
      const lines = await fetchCustomerOrderLinesForExport(orderRows);
      await downloadCustomerDetailWorkbook({
        customer: profile,
        orders: orderRows,
        lines,
        periodLabel: exportQueryDates.displayLabel,
      });
      addAuditLog(
        'Exported customer workbook',
        'Customer',
        `${customer.name} · ${orderRows.length} order${orderRows.length !== 1 ? 's' : ''} · ${exportQueryDates.displayLabel}`,
      );
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setExportingCustomer(false);
    }
  };

  const handleCreateOrder = () => {
    setShowCreateOrder(true);
    addAuditLog('Initiated Order Creation', 'Order', `Started creating order for ${customer?.name}`);
  };

  // ── Loading / Not Found guards ────────────────────────────────────────────

  if (!customerPerms.pageAccess) {
    return <ModuleAccessDenied moduleName="Customers" />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (notFound || !customer) {
    return <EntityNotFound {...NOT_FOUND_COPY.customer} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/customers')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{customer.name}</h1>
              {/* Badges visible on screens >600px */}
              <Badge variant={customer.status === 'Active' ? 'success' : 'default'} className="hidden min-[601px]:inline-flex">
                {customer.status}
              </Badge>
              <Badge variant={customer.risk_level === 'High' ? 'danger' : customer.risk_level === 'Medium' ? 'warning' : 'success'} className="hidden min-[601px]:inline-flex">
                {customer.risk_level} Risk
              </Badge>
              <Badge 
                variant={customer.client_type === 'Personal' ? 'primary' : 'secondary'} 
                className="hidden min-[601px]:inline-flex"
                title={`${clientCommissionPercentLabel(customer.client_type)} commission`}
              >
                {customer.client_type} Client • {clientCommissionPercentLabel(customer.client_type)} Commission
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {customer.customer_code ?? customer.id} • {customer.type}
            </p>
            {/* Badges below ID and type on screens ≤600px */}
            <div className="flex items-center gap-2 mt-2 min-[601px]:hidden flex-wrap">
              <Badge variant={customer.status === 'Active' ? 'success' : 'default'}>
                {customer.status}
              </Badge>
              <Badge variant={customer.risk_level === 'High' ? 'danger' : customer.risk_level === 'Medium' ? 'warning' : 'success'}>
                {customer.risk_level} Risk
              </Badge>
              <Badge 
                variant={customer.client_type === 'Personal' ? 'primary' : 'secondary'}
                title={`${clientCommissionPercentLabel(customer.client_type)} commission`}
              >
                {customer.client_type} • {clientCommissionPercentLabel(customer.client_type)}
              </Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Button variant="primary" size="sm" onClick={handleCreateOrder} className="w-full sm:w-auto">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Create Order
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/customers/${customer.id}/edit`)} className="w-full sm:w-auto">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </div>

      {/* Tabs - Desktop (>420px) */}
      <div className="border-b border-gray-200 max-[420px]:hidden">
        <nav className="flex gap-6">
          {[
            { key: 'overview', label: 'Overview', icon: FileText },
            { key: 'orders', label: `Orders (${filteredOrders.length})`, icon: ShoppingCart },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex items-center gap-2 px-1 py-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tabs - Mobile dropdown (≤420px) */}
      <div className="min-[421px]:hidden">
        <div className="relative">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as any)}
            className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg text-sm font-medium focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none appearance-none bg-white"
          >
            <option value="overview">Overview</option>
            <option value="orders">Orders ({filteredOrders.length})</option>
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <>
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow icon={User} label="Contact Person" value={customer.contact_person} />
                <InfoRow icon={Phone} label="Phone" value={customer.phone} />
                <InfoRow icon={Mail} label="Email" value={customer.email || '—'} />
                {customer.assigned_agent_id ? (
                  <InfoRow
                    icon={Users}
                    label="Assigned Agent"
                    value={
                      <Link
                        to={`/employees/${customer.assigned_agent_id}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {customer.employees?.employee_name ?? 'View agent'}
                        {customer.employees?.employee_id ? ` (${customer.employees.employee_id})` : ''}
                      </Link>
                    }
                  />
                ) : (
                  <InfoRow icon={Users} label="Assigned Agent" value="—" />
                )}
                {customer.alternate_phone && (
                  <InfoRow icon={Phone} label="Alternate Phone" value={customer.alternate_phone} />
                )}
                <InfoRow
                  icon={MapPin}
                  label="Address"
                  value={formatAddressLine(customer.address, customer.city, customer.province)}
                  className="md:col-span-2"
                />
                {customer.map_lat != null &&
                  customer.map_lng != null &&
                  Number.isFinite(customer.map_lat) &&
                  Number.isFinite(customer.map_lng) && (
                    <div className="md:col-span-2">
                      <CustomerLocationMapPreview
                        customerLat={customer.map_lat}
                        customerLng={customer.map_lng}
                        storeLat={branchHqPin?.lat ?? null}
                        storeLng={branchHqPin?.lng ?? null}
                        customerTitle={`${customer.name} — location`}
                        storeTitle="Store / HQ"
                      />
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Credit Limit</div>
                  <div className="text-lg font-semibold text-gray-900">₱{formatPeso(customer.credit_limit)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Outstanding Balance</div>
                  <div className={`text-lg font-semibold ${customer.outstanding_balance > customer.credit_limit * 0.8 ? 'text-red-600' : 'text-gray-900'}`}>
                    ₱{formatPeso(customer.outstanding_balance)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Available Credit</div>
                  <div className="text-lg font-semibold text-green-600">₱{formatPeso(customer.available_credit)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">YTD Purchases</div>
                  <div className="text-lg font-semibold text-gray-900">₱{formatPeso(customer.total_purchases_ytd)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Lifetime Purchases</div>
                  <div className="text-lg font-semibold text-gray-900">₱{formatPeso(customer.total_purchases_lifetime)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Overdue Amount</div>
                  <div className={`text-lg font-semibold ${customer.overdue_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₱{formatPeso(customer.overdue_amount)}
                  </div>
                </div>
                <div className="col-span-2 md:col-span-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                      Commission Rate ({customer.client_type} Client)
                    </div>
                    <Badge variant={customer.client_type === 'Personal' ? 'primary' : 'secondary'}>
                      {clientCommissionPercentLabel(customer.client_type)}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-xs text-gray-500">Estimated YTD Commission</div>
                    <div className="text-lg font-semibold text-blue-600">
                      ₱{formatPeso(customer.total_purchases_ytd * clientCommissionFraction(customer.client_type))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Behavior */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Payment Behavior
                  </CardTitle>
                  {/* Behavior Status Badge on mobile (≤600px) */}
                  <div className="min-[601px]:hidden">
                    <Badge variant={customer.payment_behavior === 'Good' ? 'success' : customer.payment_behavior === 'Watchlist' ? 'warning' : 'danger'} className="text-base px-3 py-1">
                      {customer.payment_behavior}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="grid max-[600px]:grid-cols-2 grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-gray-500 mb-1">Payment Score</div>
                  <div className="flex items-center gap-2">
                    <div className="text-2xl font-bold text-gray-900">{customer.payment_score}</div>
                    <div className="text-sm text-gray-500">/100</div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${
                        customer.payment_score >= 80 ? 'bg-green-500' : customer.payment_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${customer.payment_score}%` }}
                    />
                  </div>
                  {customer.payment_score_order_count != null && customer.payment_score_order_count > 0 ? (
                    <p className="text-xs text-gray-500 mt-1">
                      Based on {customer.payment_score_order_count} paid order
                      {customer.payment_score_order_count === 1 ? '' : 's'} (last 18 months). On-time and early pay raise
                      score; overdue and credit pay lower it.
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-1">No paid orders yet in the scoring window.</p>
                  )}
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Avg Payment Days</div>
                  <div className="text-2xl font-bold text-gray-900">{customer.avg_payment_days}</div>
                  <div className="text-xs text-gray-500 mt-1">Terms: {customer.payment_terms}</div>
                </div>
                {/* Behavior Status on desktop (>600px) */}
                <div className="max-[600px]:hidden">
                  <div className="text-xs text-gray-500 mb-1">Behavior Status</div>
                  <Badge variant={customer.payment_behavior === 'Good' ? 'success' : customer.payment_behavior === 'Watchlist' ? 'warning' : 'danger'} className="text-base px-3 py-1">
                    {customer.payment_behavior}
                  </Badge>
                </div>
              </CardContent>
            </Card>


          </>
        )}

        {activeTab === 'orders' && (
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>
                  Order History
                  {exportQueryDates.invalid ? '' : ` — ${filteredOrders.length} in ${exportQueryDates.displayLabel}`}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 border-gray-300 bg-white max-w-[18rem] justify-start"
                    aria-haspopup="dialog"
                    aria-expanded={exportPeriodModalOpen}
                    aria-label="Choose order period"
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
                    disabled={exportingCustomer || exportQueryDates.invalid || filteredOrders.length === 0}
                    onClick={() => void handleExportCustomer()}
                  >
                    {exportingCustomer ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                    ) : (
                      <Download className="w-4 h-4" aria-hidden />
                    )}
                    {exportingCustomer ? 'Exporting…' : 'Export'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredOrders.map((order) => {
                  const orderDateLabel = order.order_date
                    ? String(order.order_date).slice(0, 10)
                    : '—';
                  const requiredLabel = order.required_date
                    ? String(order.required_date).slice(0, 10)
                    : '—';
                  const agentLabel = order.agent_name?.trim() || 'No agent';
                  let discountDisplay: string;
                  if (order.discount_amount > 0) {
                    discountDisplay = `−${formatPhp(order.discount_amount)}`;
                    if (order.discount_percent > 0) {
                      discountDisplay += ` (${order.discount_percent.toFixed(1)}%)`;
                    }
                  } else if (order.discount_percent > 0) {
                    discountDisplay = `${order.discount_percent.toFixed(1)}%`;
                  } else {
                    discountDisplay = '—';
                  }
                  const discountIsRed = order.discount_amount > 0 || order.discount_percent > 0;
                  return (
                    <div
                      key={order.id}
                      className="relative rounded-lg border border-gray-100 bg-gray-50 p-4 transition-colors hover:border-gray-200 hover:bg-gray-100"
                    >
                      <Link
                        to={`/orders/${order.id}`}
                        className="absolute inset-0 z-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-inset"
                        aria-label={`View order ${order.order_number}`}
                      />
                      <div className="relative z-[1] pointer-events-none">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="font-semibold text-blue-700 hover:underline">{order.order_number}</div>
                          <div className="mt-1 text-sm text-gray-600">
                            Order date:{' '}
                            <span className="text-gray-900">{orderDateLabel}</span>
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <div className="text-base font-semibold text-gray-900">{formatPhp(order.total_amount)}</div>
                          <div className="text-xs text-gray-500">Total</div>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 border-t border-gray-200/80 pt-3 text-sm">
                        <div>
                          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Subtotal</div>
                          <div className="font-medium text-gray-900">{formatPhp(order.subtotal)}</div>
                        </div>
                        <div>
                          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Net discount</div>
                          <div
                            className={`font-medium ${discountIsRed ? 'text-red-700' : 'text-gray-900'}`}
                          >
                            {discountDisplay}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Required</div>
                          <div className="font-medium text-gray-900">{requiredLabel}</div>
                        </div>
                        <div>
                          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Trip ID</div>
                          <div className="font-medium">
                            <OrderTripIdCell tripNumber={order.trip_number} tripId={order.trip_id} />
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Agent</div>
                          <div className="font-medium">
                            {order.agent_id && order.agent_name ? (
                              <Link
                                to={employeeProfilePathFromAgent(
                                  order.agent_employee_id ?? '',
                                  order.agent_id,
                                )}
                                className="relative z-[2] pointer-events-auto text-blue-600 hover:underline"
                              >
                                {agentLabel}
                              </Link>
                            ) : (
                              <span className="text-gray-500 italic">{agentLabel}</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Amount paid</div>
                          <div className="font-medium text-green-700">{formatPhp(order.amount_paid)}</div>
                        </div>
                        <div>
                          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">Balance due</div>
                          <div className={`font-medium ${order.balance_due > 0 ? 'text-red-700' : 'text-gray-900'}`}>
                            {formatPhp(order.balance_due)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant={orderHistoryStatusBadgeVariant(order.status)}>{order.status}</Badge>
                        <Badge variant={orderHistoryPaymentBadgeVariant(order.payment_status)}>{order.payment_status}</Badge>
                      </div>
                      </div>
                    </div>
                  );
                })}
                {filteredOrders.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p className="font-medium">
                      {orders.length === 0 ? 'No orders yet' : 'No orders in this period'}
                    </p>
                    {orders.length === 0 ? (
                      <Button variant="primary" size="sm" className="mt-4" onClick={handleCreateOrder}>
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Create First Order
                      </Button>
                    ) : (
                      <p className="text-sm mt-1">Try widening the date range above.</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

      </div>

      {/* Create Order Modal */}
      {showCreateOrder && (
        <CreateOrderModal
          customerId={customer.id}
          customerName={customer.name}
          onClose={() => setShowCreateOrder(false)}
          onSuccess={() => {
            // Refresh page or show success message
            alert('Order created successfully and is now pending approval!');
          }}
        />
      )}

      <PortalModalOverlay
        open={exportPeriodModalOpen}
        onClose={() => setExportPeriodModalOpen(false)}
        mobileBottomSheet
      >
          <div
            className="bg-white w-full sm:max-w-lg sm:rounded-xl shadow-xl max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-export-period-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <h2 id="customer-export-period-modal-title" className="text-lg font-semibold text-gray-900">
                Order period
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
                Choose a preset or custom range. The order list and export both use this period.
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
                      onChange={(e) => setDraftExportCustomStart(e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                    <label className="text-xs font-medium text-gray-600">To</label>
                    <input
                      type="date"
                      value={draftExportCustomEnd}
                      min={draftExportCustomStart || undefined}
                      max={maxExportCustomDate}
                      onChange={(e) => setDraftExportCustomEnd(e.target.value)}
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
      </PortalModalOverlay>
    </div>
  );
}

// Helper component for info rows
function InfoRow({
  icon: Icon,
  label,
  value,
  className = '',
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <div className="text-sm font-medium text-gray-900">{value}</div>
    </div>
  );
}
