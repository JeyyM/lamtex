import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { supabase } from '@/src/lib/supabase';
import {
  User,
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
} from 'lucide-react';
import { CreateOrderModal } from '@/src/components/orders/CreateOrderModal';
import { CustomerLocationMapPreview } from '@/src/components/maps/CustomerLocationMapPreview';
import { clientCommissionFraction, clientCommissionPercentLabel } from '@/src/types/customers';

// ── Types ───────────────────────────────────────────────────────────────────

interface CustomerDetail {
  id: string; name: string; type: string; client_type: string; status: string;
  risk_level: string; payment_behavior: string; contact_person: string;
  phone: string; email: string; alternate_phone: string | null;
  alternate_email: string | null; address: string; city: string; province: string;
  postal_code: string | null; business_registration: string | null; tax_id: string | null;
  credit_limit: number; outstanding_balance: number; available_credit: number;
  payment_terms: string; payment_score: number; avg_payment_days: number;
  overdue_amount: number; total_purchases_ytd: number; total_purchases_lifetime: number;
  order_count: number; last_order_date: string | null; account_since: string | null;
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
}

function formatPhp(amount: number) {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
  const { addAuditLog } = useAppContext();

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [activeTab, setActiveTab] = useState<'overview' | 'orders'>('overview');
  const [showCreateOrder, setShowCreateOrder] = useState(false);

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
              'id, order_number, order_date, required_date, status, payment_status, subtotal, discount_percent, discount_amount, total_amount',
            )
            .eq('customer_id', id)
            .order('order_date', { ascending: false }),
        ]);
        if (custRes.error || !custRes.data) { setNotFound(true); return; }
        const c = custRes.data as any;
        setCustomer({
          id: c.id, name: c.name, type: c.type ?? '', client_type: c.client_type ?? 'Office',
          status: c.status ?? 'Active', risk_level: c.risk_level ?? 'Low', payment_behavior: c.payment_behavior ?? 'Good',
          contact_person: c.contact_person ?? '', phone: c.phone ?? '', email: c.email ?? '',
          alternate_phone: c.alternate_phone ?? null, alternate_email: c.alternate_email ?? null,
          address: c.address ?? '', city: c.city ?? '', province: c.province ?? '',
          postal_code: c.postal_code ?? null, business_registration: c.business_registration ?? null, tax_id: c.tax_id ?? null,
          credit_limit: Number(c.credit_limit ?? 0), outstanding_balance: Number(c.outstanding_balance ?? 0),
          available_credit: Number(c.available_credit ?? 0), payment_terms: c.payment_terms ?? '',
          payment_score: c.payment_score ?? 0, avg_payment_days: c.avg_payment_days ?? 0,
          overdue_amount: Number(c.overdue_amount ?? 0), total_purchases_ytd: Number(c.total_purchases_ytd ?? 0),
          total_purchases_lifetime: Number(c.total_purchases_lifetime ?? 0), order_count: c.order_count ?? 0,
          last_order_date: c.last_order_date ?? null, account_since: c.account_since ?? null,
          assigned_agent_id: c.assigned_agent_id ?? null, employees: c.employees ?? null,
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
        setOrders(
          (ordersRes.data ?? []).map((o: any) => ({
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
          })),
        );
      } catch (err) {
        console.error('Error loading customer:', err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  const handleCreateOrder = () => {
    setShowCreateOrder(true);
    addAuditLog('Initiated Order Creation', 'Order', `Started creating order for ${customer?.name}`);
  };

  // ── Loading / Not Found guards ────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (notFound || !customer) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-xl font-semibold text-gray-900">Customer not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/customers')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Customers
          </Button>
        </div>
      </div>
    );
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
            <p className="text-sm text-gray-500 mt-1">{customer.id} • {customer.type}</p>
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
            { key: 'orders', label: `Orders (${orders.length})`, icon: ShoppingCart },
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
            <option value="orders">Orders ({orders.length})</option>
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
                <InfoRow icon={Mail} label="Email" value={customer.email} />
                {customer.alternate_phone && (
                  <InfoRow icon={Phone} label="Alternate Phone" value={customer.alternate_phone} />
                )}
                <InfoRow icon={MapPin} label="Address" value={`${customer.address}, ${customer.city}, ${customer.province}`} className="md:col-span-2" />
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
                  <div className="text-lg font-semibold text-gray-900">₱{(customer.credit_limit / 1000000).toFixed(1)}M</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Outstanding Balance</div>
                  <div className={`text-lg font-semibold ${customer.outstanding_balance > customer.credit_limit * 0.8 ? 'text-red-600' : 'text-gray-900'}`}>
                    ₱{(customer.outstanding_balance / 1000000).toFixed(2)}M
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Available Credit</div>
                  <div className="text-lg font-semibold text-green-600">₱{(customer.available_credit / 1000000).toFixed(2)}M</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">YTD Purchases</div>
                  <div className="text-lg font-semibold text-gray-900">₱{(customer.total_purchases_ytd / 1000000).toFixed(2)}M</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Lifetime Purchases</div>
                  <div className="text-lg font-semibold text-gray-900">₱{(customer.total_purchases_lifetime / 1000000).toFixed(1)}M</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Overdue Amount</div>
                  <div className={`text-lg font-semibold ${customer.overdue_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₱{(customer.overdue_amount / 1000).toFixed(0)}K
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
                      ₱{((customer.total_purchases_ytd * clientCommissionFraction(customer.client_type)) / 1000).toFixed(0)}K
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
              <CardTitle>Order History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {orders.map((order) => {
                  const orderDateLabel = order.order_date
                    ? String(order.order_date).slice(0, 10)
                    : '—';
                  const requiredLabel = order.required_date
                    ? String(order.required_date).slice(0, 10)
                    : null;
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
                    <Link
                      key={order.id}
                      to={`/orders/${order.id}`}
                      className="block rounded-lg border border-gray-100 bg-gray-50 p-4 transition-colors hover:border-gray-200 hover:bg-gray-100"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="font-semibold text-blue-700 hover:underline">{order.order_number}</div>
                          <div className="mt-1 text-sm text-gray-600">
                            Order date:{' '}
                            <span className="text-gray-900">{orderDateLabel}</span>
                            {requiredLabel && (
                              <>
                                {' '}
                                · Required: <span className="text-gray-900">{requiredLabel}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <div className="text-base font-semibold text-gray-900">{formatPhp(order.total_amount)}</div>
                          <div className="text-xs text-gray-500">Total</div>
                        </div>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-gray-200/80 pt-3 text-sm">
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
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant={orderHistoryStatusBadgeVariant(order.status)}>{order.status}</Badge>
                        <Badge variant={orderHistoryPaymentBadgeVariant(order.payment_status)}>{order.payment_status}</Badge>
                      </div>
                    </Link>
                  );
                })}
                {orders.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p className="font-medium">No orders yet</p>
                    <Button variant="primary" size="sm" className="mt-4" onClick={handleCreateOrder}>
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Create First Order
                    </Button>
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
    </div>
  );
}

// Helper component for info rows
function InfoRow({ icon: Icon, label, value, className = '' }: { icon: any; label: string; value: string; className?: string }) {
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
