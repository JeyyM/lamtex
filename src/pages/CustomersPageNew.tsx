import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { TablePagination, TABLE_PAGE_SIZE } from '@/src/components/ui/TablePagination';
import { supabase } from '@/src/lib/supabase';
import { getOrdersByCustomer } from '@/src/mock/orders';
import {
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Package,
  FileText,
  Search,
  Filter,
  Plus,
  Eye,
  Star,
  ShoppingCart,
  CreditCard,
  Activity,
  MessageSquare,
  Clipboard,
  X,
  ExternalLink,
  Save,
  Send,
  Loader2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface CustomerRow {
  id: string;
  name: string;
  type: string;
  status: string;
  risk_level: string;
  payment_behavior: string;
  contact_person: string;
  phone: string;
  email: string;
  outstanding_balance: number;
  overdue_amount: number;
  total_purchases_ytd: number;
  order_count: number;
  last_order_date: string | null;
  assigned_agent_id: string | null;
  employees: { employee_name: string } | null;
}

type CustomerTab = 'all' | 'active' | 'atrisk' | 'dormant';

export function CustomersPage() {
  const { branch, addAuditLog } = useAppContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<CustomerTab>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRisk, setFilterRisk] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [tablePage, setTablePage] = useState(1);
  const [allCustomers, setAllCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch customers from Supabase whenever branch changes
  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('customers')
          .select(`
            id, name, type, status, risk_level, payment_behavior,
            contact_person, phone, email,
            outstanding_balance, overdue_amount,
            total_purchases_ytd, order_count, last_order_date,
            assigned_agent_id,
            employees!assigned_agent_id ( employee_name ),
            branches!branch_id ( name )
          `)
          .order('name');

        if (branch) {
          // Filter by branch name via the joined branches table
          query = query.eq('branches.name', branch);
        }

        const { data, error } = await query;
        if (error) throw error;

        // Secondary client-side filter — Supabase foreign-table filters only
        // exclude non-matching rows when the join is not null, so we filter explicitly
        const filtered = (data ?? []).filter(
          (c: any) => !branch || c.branches?.name === branch
        );

        setAllCustomers(
          filtered.map((c: any) => ({
            id: c.id,
            name: c.name,
            type: c.type ?? '',
            status: c.status ?? 'Active',
            risk_level: c.risk_level ?? 'Low',
            payment_behavior: c.payment_behavior ?? 'Good',
            contact_person: c.contact_person ?? '',
            phone: c.phone ?? '',
            email: c.email ?? '',
            outstanding_balance: Number(c.outstanding_balance ?? 0),
            overdue_amount: Number(c.overdue_amount ?? 0),
            total_purchases_ytd: Number(c.total_purchases_ytd ?? 0),
            order_count: c.order_count ?? 0,
            last_order_date: c.last_order_date ?? null,
            assigned_agent_id: c.assigned_agent_id ?? null,
            employees: c.employees ?? null,
          }))
        );
      } catch (err) {
        console.error('Failed to fetch customers:', err);
        setAllCustomers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [branch]);

  const filteredCustomers = allCustomers.filter(customer => {
    const matchesSearch =
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'active' && customer.status === 'Active' && customer.risk_level === 'Low') ||
      (activeTab === 'atrisk' && (customer.risk_level === 'High' || customer.overdue_amount > 0)) ||
      (activeTab === 'dormant' && customer.status === 'Dormant');

    const matchesType    = !filterType    || customer.type             === filterType;
    const matchesStatus  = !filterStatus  || customer.status           === filterStatus;
    const matchesRisk    = !filterRisk    || customer.risk_level        === filterRisk;
    const matchesPayment = !filterPayment || customer.payment_behavior  === filterPayment;

    return matchesSearch && matchesTab && matchesType && matchesStatus && matchesRisk && matchesPayment;
  });

  const activeFilterCount = [filterType, filterStatus, filterRisk, filterPayment].filter(Boolean).length;

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const getTypeStyle = (type: string): string => {
    switch (type) {
      case 'Hardware Store':       return 'bg-blue-100 text-blue-700 border border-blue-200';
      case 'Construction Company': return 'bg-purple-100 text-purple-700 border border-purple-200';
      case 'Contractor':           return 'bg-orange-100 text-orange-700 border border-orange-200';
      case 'Distributor':          return 'bg-green-100 text-green-700 border border-green-200';
      case 'Retailer':             return 'bg-teal-100 text-teal-700 border border-teal-200';
      case 'Wholesaler':           return 'bg-indigo-100 text-indigo-700 border border-indigo-200';
      default:                     return 'bg-gray-100 text-gray-700 border border-gray-200';
    }
  };

  const sortIcon = (col: string) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1 text-red-600" />
      : <ArrowDown className="w-3 h-3 ml-1 text-red-600" />;
  };

  const sortedCustomers = useMemo(
    () =>
      [...filteredCustomers].sort((a, b) => {
        let av: any, bv: any;
        switch (sortKey) {
          case 'name': av = a.name; bv = b.name; break;
          case 'type': av = a.type; bv = b.type; break;
          case 'contact': av = a.contact_person; bv = b.contact_person; break;
          case 'ytd': av = a.total_purchases_ytd; bv = b.total_purchases_ytd; break;
          case 'outstanding': av = a.outstanding_balance; bv = b.outstanding_balance; break;
          case 'risk': av = a.risk_level; bv = b.risk_level; break;
          case 'last_order': av = a.last_order_date ?? ''; bv = b.last_order_date ?? ''; break;
          default: av = a.name; bv = b.name;
        }
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      }),
    [filteredCustomers, sortKey, sortDir],
  );

  const totalListPages = Math.max(1, Math.ceil(sortedCustomers.length / TABLE_PAGE_SIZE) || 1);
  const pagedCustomers = useMemo(() => {
    const p = Math.min(tablePage, totalListPages);
    const start = (p - 1) * TABLE_PAGE_SIZE;
    return sortedCustomers.slice(start, start + TABLE_PAGE_SIZE);
  }, [sortedCustomers, tablePage, totalListPages]);

  useEffect(() => {
    if (tablePage > totalListPages) setTablePage(totalListPages);
  }, [tablePage, totalListPages]);

  useEffect(() => {
    setTablePage(1);
  }, [searchTerm, activeTab, filterType, filterStatus, filterRisk, filterPayment, branch]);

  const handleViewCustomer = (customer: CustomerRow) => {
    addAuditLog('Viewed Customer', 'Customer', `Viewed customer ${customer.name}`);
    navigate(`/customers/${customer.id}`);
  };

  const handleCreateOrder = (customer: CustomerRow) => {
    alert(`Creating order for ${customer.name} (Coming soon)`);
    addAuditLog('Initiated Order Creation', 'Order', `Started creating order for ${customer.name}`);
    navigate('/orders');
  };

  const getRiskBadgeVariant = (level: string) => {
    if (level === 'High') return 'danger';
    if (level === 'Medium') return 'warning';
    return 'success';
  };

  const getPaymentBehaviorBadge = (behavior: string) => {
    if (behavior === 'Good') return 'success';
    if (behavior === 'Watchlist') return 'warning';
    return 'danger';
  };

  const tabCounts = {
    all: allCustomers.length,
    active: allCustomers.filter(c => c.status === 'Active' && c.risk_level === 'Low').length,
    atrisk: allCustomers.filter(c => c.risk_level === 'High' || c.overdue_amount > 0).length,
    dormant: allCustomers.filter(c => c.status === 'Dormant').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-1">Manage customer relationships and track sales performance</p>
        </div>
        <Button variant="primary" className="gap-2 w-max flex-shrink-0 ml-4" onClick={() => navigate('/customers/new')}>
          <Plus className="w-4 h-4" />
          Add Customer
        </Button>
      </div>

      {/* Tabs - Desktop view (≥475px) */}
      <div className="border-b border-gray-200 hidden min-[475px]:block">
        <nav className="flex gap-6">
          {[
            { key: 'all', label: 'All Customers', icon: Building2 },
            { key: 'active', label: 'Active & Healthy', icon: CheckCircle },
            { key: 'atrisk', label: 'At Risk', icon: AlertTriangle },
            { key: 'dormant', label: 'Dormant', icon: Clock },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as CustomerTab)}
              className={`flex items-center gap-2 px-1 py-3 border-b-2 text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === key ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {tabCounts[key as keyof typeof tabCounts]}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tabs - Mobile dropdown (<475px) */}
      <div className="min-[475px]:hidden">
        <div className="relative">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as CustomerTab)}
            className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg text-sm font-medium focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none appearance-none bg-white"
          >
            {[
              { key: 'all', label: 'All Customers' },
              { key: 'active', label: 'Active & Healthy' },
              { key: 'atrisk', label: 'At Risk' },
              { key: 'dormant', label: 'Dormant' },
            ].map(({ key, label }) => (
              <option key={key} value={key}>
                {label} ({tabCounts[key as keyof typeof tabCounts]})
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Filter className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, contact person, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
              />
            </div>
            <Button
              variant={activeFilterCount > 0 ? 'primary' : 'outline'}
              size="sm"
              className="gap-2 w-full md:w-auto flex-shrink-0"
              onClick={() => setShowFilters(v => !v)}
            >
              <Filter className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-white text-red-600 rounded-full text-xs px-1.5 font-bold leading-none py-0.5">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </div>

          {/* Expanded filter row */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                >
                  <option value="">All Types</option>
                  <option value="Hardware Store">Hardware Store</option>
                  <option value="Construction Company">Construction Company</option>
                  <option value="Contractor">Contractor</option>
                  <option value="Distributor">Distributor</option>
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                >
                  <option value="">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                  <option value="Dormant">Dormant</option>
                </select>
              </div>

              {/* Risk Level */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Risk Level</label>
                <select
                  value={filterRisk}
                  onChange={(e) => setFilterRisk(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                >
                  <option value="">All Risk Levels</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>

              {/* Payment Behavior */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Payment Behavior</label>
                <select
                  value={filterPayment}
                  onChange={(e) => setFilterPayment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                >
                  <option value="">All Behaviors</option>
                  <option value="Good">Good</option>
                  <option value="Watchlist">Watchlist</option>
                  <option value="Bad">Bad</option>
                </select>
              </div>

              {/* Clear button */}
              {activeFilterCount > 0 && (
                <div className="col-span-2 md:col-span-4 flex justify-end">
                  <button
                    onClick={() => { setFilterType(''); setFilterStatus(''); setFilterRisk(''); setFilterPayment(''); }}
                    className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Clear all filters
                  </button>
                </div>
              )}
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">Loading customers…</span>
            </div>
          )}

          {/* Desktop Table View */}
          {!loading && (
          <>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th onClick={() => handleSort('name')} className="px-6 py-3 text-left font-medium max-[474px]:border-r max-[474px]:border-gray-200 cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                    <span className="flex items-center">Customer{sortIcon('name')}</span>
                  </th>
                  <th onClick={() => handleSort('type')} className="px-6 py-3 text-left font-medium hidden min-[1556px]:table-cell cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                    <span className="flex items-center">Type{sortIcon('type')}</span>
                  </th>
                  <th onClick={() => handleSort('contact')} className="px-6 py-3 text-left font-medium hidden min-[475px]:table-cell cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                    <span className="flex items-center">Contact{sortIcon('contact')}</span>
                  </th>
                  <th onClick={() => handleSort('ytd')} className="px-6 py-3 text-right font-medium hidden min-[1330px]:table-cell cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                    <span className="flex items-center justify-end">YTD Sales{sortIcon('ytd')}</span>
                  </th>
                  <th onClick={() => handleSort('outstanding')} className="px-6 py-3 text-right font-medium max-[474px]:border-r max-[474px]:border-gray-200 cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                    <span className="flex items-center justify-end">Outstanding{sortIcon('outstanding')}</span>
                  </th>
                  <th onClick={() => handleSort('risk')} className="px-6 py-3 text-center font-medium hidden min-[1211px]:table-cell cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                    <span className="flex items-center justify-center">Risk{sortIcon('risk')}</span>
                  </th>
                  <th onClick={() => handleSort('last_order')} className="px-6 py-3 text-left font-medium hidden min-[1100px]:table-cell cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900">
                    <span className="flex items-center">Last Order{sortIcon('last_order')}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pagedCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-gray-50"
                  >
                    <td
                      className="px-6 py-4 cursor-pointer max-[474px]:border-r max-[474px]:border-gray-200"
                      onClick={() => handleViewCustomer(customer)}
                    >
                      <div>
                        <div className="font-medium text-gray-900">{customer.name}</div>
                        <div className="text-xs text-gray-500">{customer.id.slice(0, 8)}…</div>
                        {customer.employees && (
                          <div className="text-xs text-gray-400 mt-0.5">{customer.employees.employee_name}</div>
                        )}
                        {/* Show type below name on screens ≤1555px */}
                        <div className="mt-1 min-[1556px]:hidden">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold text-center leading-tight ${getTypeStyle(customer.type)}`}>
                            {customer.type}
                          </span>
                        </div>
                        {/* Show contact below customer on screens ≤474px */}
                        <div className="max-[474px]:block hidden">
                          <hr className="my-2 border-gray-200" />
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{customer.contact_person}</div>
                            <div className="text-xs text-gray-500">{customer.phone}</div>
                            {/* Show last order below contact on screens <1100px */}
                            <div className="mt-2 min-[1100px]:hidden">
                              <div className="text-xs font-bold text-gray-700">Last Order</div>
                              <div className="text-xs text-gray-600">{customer.last_order_date || 'Never'}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td
                      className="px-6 py-4 cursor-pointer hidden min-[1556px]:table-cell"
                      onClick={() => handleViewCustomer(customer)}
                    >
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold text-center leading-tight max-w-[120px] break-words ${getTypeStyle(customer.type)}`}>
                        {customer.type}
                      </span>
                    </td>
                    <td
                      className="px-6 py-4 cursor-pointer hidden min-[475px]:table-cell"
                      onClick={() => handleViewCustomer(customer)}
                    >
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">{customer.contact_person}</div>
                        <div className="text-xs text-gray-500">{customer.phone}</div>
                        {/* Show last order below contact on screens <1100px */}
                        <div className="mt-2 min-[1100px]:hidden">
                          <div className="text-xs font-bold text-gray-700">Last Order</div>
                          <div className="text-xs text-gray-600">{customer.last_order_date || 'Never'}</div>
                        </div>
                      </div>
                    </td>
                    <td
                      className="px-6 py-4 text-right cursor-pointer hidden min-[1330px]:table-cell"
                      onClick={() => handleViewCustomer(customer)}
                    >
                      <div className="font-medium text-gray-900">₱{(customer.total_purchases_ytd / 1000000).toFixed(1)}M</div>
                      <div className="text-xs text-gray-500">{customer.order_count} orders</div>
                    </td>
                    <td
                      className="px-6 py-4 text-right cursor-pointer max-[474px]:border-r max-[474px]:border-gray-200"
                      onClick={() => handleViewCustomer(customer)}
                    >
                      <div className={`font-medium ${customer.overdue_amount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                        ₱{(customer.outstanding_balance / 1000).toFixed(0)}K
                      </div>
                      {customer.overdue_amount > 0 && (
                        <div className="text-xs text-red-600">₱{(customer.overdue_amount / 1000).toFixed(0)}K overdue</div>
                      )}
                      {/* Show risk below outstanding on screens ≤1210px */}
                      <div className="mt-1 min-[1211px]:hidden flex justify-end">
                        <Badge variant={getRiskBadgeVariant(customer.risk_level)}>
                          {customer.risk_level}
                        </Badge>
                      </div>
                    </td>
                    <td
                      className="px-6 py-4 text-center cursor-pointer hidden min-[1211px]:table-cell"
                      onClick={() => handleViewCustomer(customer)}
                    >
                      <Badge variant={getRiskBadgeVariant(customer.risk_level)}>
                        {customer.risk_level}
                      </Badge>
                    </td>
                    <td
                      className="px-6 py-4 text-gray-600 cursor-pointer hidden min-[1100px]:table-cell"
                      onClick={() => handleViewCustomer(customer)}
                    >
                      {customer.last_order_date || 'Never'}
                    </td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="font-medium">No customers found</p>
                      <p className="text-sm mt-1">Try adjusting your search or filters</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-200">
            {pagedCustomers.map((customer) => (
              <div key={customer.id} className="p-4 space-y-3 hover:bg-gray-50 cursor-pointer" onClick={() => handleViewCustomer(customer)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 break-words">{customer.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{customer.id.slice(0, 8)}…</p>
                    {customer.employees && (
                      <p className="text-xs text-gray-400 mt-0.5">{customer.employees.employee_name}</p>
                    )}
                  </div>
                  <Badge variant={getRiskBadgeVariant(customer.risk_level)} className="flex-shrink-0">
                    {customer.risk_level}
                  </Badge>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="default">{customer.type}</Badge>
                  {customer.overdue_amount > 0 && (
                    <Badge variant="danger">Overdue</Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Contact Person</p>
                    <p className="text-gray-900 font-medium">{customer.contact_person}</p>
                    <p className="text-xs text-gray-600">{customer.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Outstanding</p>
                    <p className={`font-semibold ${customer.overdue_amount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      ₱{(customer.outstanding_balance / 1000).toFixed(0)}K
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">YTD Sales</p>
                    <p className="text-gray-900 font-medium">₱{(customer.total_purchases_ytd / 1000000).toFixed(1)}M</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Last Order</p>
                    <p className="text-gray-900">{customer.last_order_date || 'Never'}</p>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewCustomer(customer);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {filteredCustomers.length === 0 && (
              <div className="px-4 py-12 text-center text-gray-500">
                <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="font-medium">No customers found</p>
                <p className="text-sm mt-1">Try adjusting your search or filters</p>
              </div>
            )}
          </div>

          <TablePagination
            page={tablePage}
            total={sortedCustomers.length}
            onPageChange={setTablePage}
          />
          </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
