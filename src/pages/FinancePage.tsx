import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import {
  DollarSign,
  FileText,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Download,
  Send,
  Eye,
  Edit,
  Plus,
  Search,
  Filter,
  CreditCard,
  Building2,
  User,
  Phone,
  Mail,
  Receipt,
  Wallet,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Banknote,
  CircleDollarSign,
  Timer,
  Ban,
  CheckCheck,
  History,
  Package,
} from 'lucide-react';
import {
  ComposedChart,
  Line,
  Bar,
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
  BarChart,
} from 'recharts';

// Invoice data structure
interface Invoice {
  id: string;
  invoiceNumber: string;
  type: 'Sales' | 'Purchase';
  customer?: string;
  supplier?: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  paidAmount: number;
  balanceAmount: number;
  status: 'Paid' | 'Partial' | 'Pending' | 'Overdue' | 'Cancelled';
  paymentTerms: 'COD' | '15 Days' | '30 Days' | '45 Days' | '60 Days';
  currency: 'PHP' | 'USD';
  items: InvoiceItem[];
  paymentHistory: Payment[];
  daysOverdue?: number;
  notes?: string;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Payment {
  id: string;
  date: string;
  amount: number;
  method: 'Cash' | 'Check' | 'Bank Transfer' | 'Credit Card' | 'GCash' | 'PayMaya';
  referenceNumber?: string;
  notes?: string;
}

interface PaymentSummary {
  month: string;
  received: number;
  paid: number;
  net: number;
}

interface AgeingSummary {
  range: string;
  count: number;
  amount: number;
}

const MOCK_INVOICES: Invoice[] = [
  {
    id: 'INV-001',
    invoiceNumber: 'SI-2026-0234',
    type: 'Sales',
    customer: 'Mega Hardware Center',
    issueDate: '2026-02-15',
    dueDate: '2026-03-17',
    amount: 1250000,
    paidAmount: 1250000,
    balanceAmount: 0,
    status: 'Paid',
    paymentTerms: '30 Days',
    currency: 'PHP',
    items: [
      { description: 'PVC Pipe 2" Class 150 - 500 pcs', quantity: 500, unitPrice: 500, total: 250000 },
      { description: 'PVC Pipe 4" Class 150 - 400 pcs', quantity: 400, unitPrice: 1500, total: 600000 },
      { description: 'Solvent Cement 100ml - 800 pcs', quantity: 800, unitPrice: 45, total: 36000 },
      { description: 'PVC Elbow 2" 90° - 600 pcs', quantity: 600, unitPrice: 70, total: 42000 },
      { description: 'Freight & Handling', quantity: 1, unitPrice: 322000, total: 322000 },
    ],
    paymentHistory: [
      { id: 'PAY-001', date: '2026-03-10', amount: 1250000, method: 'Bank Transfer', referenceNumber: 'BT-20260310-001' },
    ],
  },
  {
    id: 'INV-002',
    invoiceNumber: 'SI-2026-0235',
    type: 'Sales',
    customer: 'BuildMaster Construction Corp',
    issueDate: '2026-02-10',
    dueDate: '2026-03-27',
    amount: 3200000,
    paidAmount: 1600000,
    balanceAmount: 1600000,
    status: 'Partial',
    paymentTerms: '45 Days',
    currency: 'PHP',
    items: [
      { description: 'PVC Pipe 6" Class 150 - 1000 pcs', quantity: 1000, unitPrice: 2500, total: 2500000 },
      { description: 'PVC Fittings Assorted - 500 sets', quantity: 500, unitPrice: 1200, total: 600000 },
      { description: 'Installation Services', quantity: 1, unitPrice: 100000, total: 100000 },
    ],
    paymentHistory: [
      { id: 'PAY-002', date: '2026-02-20', amount: 1600000, method: 'Check', referenceNumber: 'CHK-456789' },
    ],
  },
  {
    id: 'INV-003',
    invoiceNumber: 'SI-2026-0236',
    type: 'Sales',
    customer: 'City Builders Supply',
    issueDate: '2026-02-20',
    dueDate: '2026-03-22',
    amount: 850000,
    paidAmount: 0,
    balanceAmount: 850000,
    status: 'Pending',
    paymentTerms: '30 Days',
    currency: 'PHP',
    items: [
      { description: 'PVC Pipe 3" Class 150 - 600 pcs', quantity: 600, unitPrice: 1200, total: 720000 },
      { description: 'Solvent Cement 250ml - 500 pcs', quantity: 500, unitPrice: 85, total: 42500 },
      { description: 'Delivery Fee', quantity: 1, unitPrice: 87500, total: 87500 },
    ],
    paymentHistory: [],
  },
  {
    id: 'INV-004',
    invoiceNumber: 'SI-2026-0220',
    type: 'Sales',
    customer: 'ProBuild Contractors Inc',
    issueDate: '2026-01-15',
    dueDate: '2026-02-14',
    amount: 2100000,
    paidAmount: 0,
    balanceAmount: 2100000,
    status: 'Overdue',
    paymentTerms: '30 Days',
    currency: 'PHP',
    daysOverdue: 11,
    items: [
      { description: 'PVC Pipe 4" Class 200 - 800 pcs', quantity: 800, unitPrice: 2000, total: 1600000 },
      { description: 'PVC Pipe 2" Class 200 - 1000 pcs', quantity: 1000, unitPrice: 500, total: 500000 },
    ],
    paymentHistory: [],
  },
  {
    id: 'INV-005',
    invoiceNumber: 'SI-2026-0215',
    type: 'Sales',
    customer: 'Northern Hardware Depot',
    issueDate: '2026-01-05',
    dueDate: '2026-01-25',
    amount: 1500000,
    paidAmount: 650000,
    balanceAmount: 850000,
    status: 'Overdue',
    paymentTerms: '15 Days',
    currency: 'PHP',
    daysOverdue: 31,
    items: [
      { description: 'Garden Hose 1/2" 10m - 500 rolls', quantity: 500, unitPrice: 250, total: 125000 },
      { description: 'PVC Pipe Assorted - Bulk Order', quantity: 1, unitPrice: 1375000, total: 1375000 },
    ],
    paymentHistory: [
      { id: 'PAY-003', date: '2026-01-20', amount: 650000, method: 'Cash', referenceNumber: 'CASH-001' },
    ],
  },
  {
    id: 'INV-006',
    invoiceNumber: 'PI-2026-0145',
    type: 'Purchase',
    supplier: 'Pacific Resin Industries',
    issueDate: '2026-02-01',
    dueDate: '2026-03-18',
    amount: 4500000,
    paidAmount: 4500000,
    balanceAmount: 0,
    status: 'Paid',
    paymentTerms: '45 Days',
    currency: 'PHP',
    items: [
      { description: 'PVC Resin SG-5 - 90,000 kg', quantity: 90000, unitPrice: 50, total: 4500000 },
    ],
    paymentHistory: [
      { id: 'PAY-004', date: '2026-03-15', amount: 4500000, method: 'Bank Transfer', referenceNumber: 'BT-20260315-002' },
    ],
  },
  {
    id: 'INV-007',
    invoiceNumber: 'PI-2026-0146',
    type: 'Purchase',
    supplier: 'Global Chemicals Corp',
    issueDate: '2026-02-05',
    dueDate: '2026-04-06',
    amount: 1250000,
    paidAmount: 0,
    balanceAmount: 1250000,
    status: 'Pending',
    paymentTerms: '60 Days',
    currency: 'USD',
    items: [
      { description: 'Heat Stabilizer - 4,000 kg', quantity: 4000, unitPrice: 300, total: 1200000 },
      { description: 'Freight Charges', quantity: 1, unitPrice: 50000, total: 50000 },
    ],
    paymentHistory: [],
  },
  {
    id: 'INV-008',
    invoiceNumber: 'PI-2026-0130',
    type: 'Purchase',
    supplier: 'FlexiPack Solutions',
    issueDate: '2026-01-20',
    dueDate: '2026-02-19',
    amount: 350000,
    paidAmount: 0,
    balanceAmount: 350000,
    status: 'Overdue',
    paymentTerms: '30 Days',
    currency: 'PHP',
    daysOverdue: 6,
    items: [
      { description: 'Cardboard Boxes - 10,000 pcs', quantity: 10000, unitPrice: 30, total: 300000 },
      { description: 'Label Printing - 50,000 pcs', quantity: 50000, unitPrice: 1, total: 50000 },
    ],
    paymentHistory: [],
  },
];

type ViewMode = 'invoices' | 'payments' | 'ageing' | 'analytics';
type InvoiceFilter = 'All' | 'Sales' | 'Purchase';
type StatusFilter = 'All' | 'Paid' | 'Partial' | 'Pending' | 'Overdue';

export function FinancePage() {
  const { branch } = useAppContext();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('invoices');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceFilter>('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');

  // Filter invoices
  const filteredInvoices = MOCK_INVOICES.filter(invoice => {
    const matchesSearch = invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (invoice.customer && invoice.customer.toLowerCase().includes(searchQuery.toLowerCase())) ||
                         (invoice.supplier && invoice.supplier.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = invoiceFilter === 'All' || invoice.type === invoiceFilter;
    const matchesStatus = statusFilter === 'All' || invoice.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Payment summary data
  const paymentSummary: PaymentSummary[] = [
    { month: 'Aug', received: 15200000, paid: 12500000, net: 2700000 },
    { month: 'Sep', received: 18500000, paid: 14200000, net: 4300000 },
    { month: 'Oct', received: 16800000, paid: 13800000, net: 3000000 },
    { month: 'Nov', received: 21000000, paid: 15600000, net: 5400000 },
    { month: 'Dec', received: 19200000, paid: 14100000, net: 5100000 },
    { month: 'Jan', received: 17500000, paid: 13900000, net: 3600000 },
    { month: 'Feb', received: 16200000, paid: 12800000, net: 3400000 },
  ];

  // Ageing analysis
  const salesAgeing: AgeingSummary[] = [
    { range: 'Current (0-30 days)', count: 5, amount: 6850000 },
    { range: '31-60 days', count: 2, amount: 2950000 },
    { range: '61-90 days', count: 1, amount: 850000 },
    { range: 'Over 90 days', count: 0, amount: 0 },
  ];

  const purchaseAgeing: AgeingSummary[] = [
    { range: 'Current (0-30 days)', count: 4, amount: 7100000 },
    { range: '31-60 days', count: 1, amount: 350000 },
    { range: '61-90 days', count: 0, amount: 0 },
    { range: 'Over 90 days', count: 0, amount: 0 },
  ];

  // Calculate totals
  const totalReceivables = MOCK_INVOICES
    .filter(inv => inv.type === 'Sales')
    .reduce((sum, inv) => sum + inv.balanceAmount, 0);

  const totalPayables = MOCK_INVOICES
    .filter(inv => inv.type === 'Purchase')
    .reduce((sum, inv) => sum + inv.balanceAmount, 0);

  const overdueReceivables = MOCK_INVOICES
    .filter(inv => inv.type === 'Sales' && inv.status === 'Overdue')
    .reduce((sum, inv) => sum + inv.balanceAmount, 0);

  const overduePayables = MOCK_INVOICES
    .filter(inv => inv.type === 'Purchase' && inv.status === 'Overdue')
    .reduce((sum, inv) => sum + inv.balanceAmount, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'success';
      case 'Partial': return 'warning';
      case 'Pending': return 'default';
      case 'Overdue': return 'danger';
      case 'Cancelled': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Paid': return <CheckCircle className="w-4 h-4" />;
      case 'Partial': return <Clock className="w-4 h-4" />;
      case 'Pending': return <Timer className="w-4 h-4" />;
      case 'Overdue': return <AlertTriangle className="w-4 h-4" />;
      case 'Cancelled': return <Ban className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'Cash': return <Banknote className="w-4 h-4" />;
      case 'Check': return <Receipt className="w-4 h-4" />;
      case 'Bank Transfer': return <Building2 className="w-4 h-4" />;
      case 'Credit Card': return <CreditCard className="w-4 h-4" />;
      case 'GCash':
      case 'PayMaya': return <Wallet className="w-4 h-4" />;
      default: return <CircleDollarSign className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: number, currency: string = 'PHP') => {
    if (currency === 'USD') {
      return `$${(amount / 1000000).toFixed(2)}M`;
    }
    return `₱${(amount / 1000000).toFixed(2)}M`;
  };

  const formatAmount = (amount: number, currency: string = 'PHP') => {
    if (currency === 'USD') {
      return `$${amount.toLocaleString()}`;
    }
    return `₱${amount.toLocaleString()}`;
  };

  const calculateDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date('2026-02-25');
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance & Invoicing</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track invoices, payments, receivables & payables for <span className="font-medium text-gray-700">{branch}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate('/reports')}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Financial Reports
          </Button>
          <Button variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            Create Invoice
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Receivables</p>
                <p className="text-xl font-bold text-blue-600 mt-1">{formatCurrency(totalReceivables)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <ArrowDownRight className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Payables</p>
                <p className="text-xl font-bold text-orange-600 mt-1">{formatCurrency(totalPayables)}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <ArrowUpRight className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Overdue (Receivable)</p>
                <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(overdueReceivables)}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Overdue (Payable)</p>
                <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(overduePayables)}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Paid This Month</p>
                <p className="text-xl font-bold text-green-600 mt-1">
                  {formatCurrency(MOCK_INVOICES.filter(inv => inv.status === 'Paid').reduce((sum, inv) => sum + inv.paidAmount, 0) / 2)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Invoices</p>
                <p className="text-xl font-bold text-gray-900 mt-1">{MOCK_INVOICES.length}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <FileText className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Mode Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {[
            { id: 'invoices', label: 'Invoices', icon: <FileText className="w-4 h-4" /> },
            { id: 'payments', label: 'Payment History', icon: <Receipt className="w-4 h-4" /> },
            { id: 'ageing', label: 'Ageing Report', icon: <Clock className="w-4 h-4" /> },
            { id: 'analytics', label: 'Financial Analytics', icon: <BarChart3 className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id as ViewMode)}
              className={`
                flex items-center gap-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors
                ${viewMode === tab.id
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* INVOICES VIEW */}
      {viewMode === 'invoices' && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by invoice number, customer, or supplier..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <select
                  value={invoiceFilter}
                  onChange={(e) => setInvoiceFilter(e.target.value as InvoiceFilter)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="All">All Invoices</option>
                  <option value="Sales">Sales Invoices</option>
                  <option value="Purchase">Purchase Invoices</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="All">All Status</option>
                  <option value="Paid">Paid</option>
                  <option value="Partial">Partial</option>
                  <option value="Pending">Pending</option>
                  <option value="Overdue">Overdue</option>
                </select>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  More Filters
                </Button>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Invoices Table */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice List</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer/Supplier</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredInvoices.map((invoice) => {
                      const daysUntilDue = calculateDaysUntilDue(invoice.dueDate);
                      return (
                        <tr key={invoice.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-400" />
                              <div>
                                <div className="font-medium text-gray-900">{invoice.invoiceNumber}</div>
                                <div className="text-xs text-gray-500">{invoice.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant={invoice.type === 'Sales' ? 'success' : 'default'}>
                              {invoice.type === 'Sales' ? <ArrowDownRight className="w-3 h-3 mr-1" /> : <ArrowUpRight className="w-3 h-3 mr-1" />}
                              {invoice.type}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-900">{invoice.customer || invoice.supplier}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                            {invoice.issueDate}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-gray-900">{invoice.dueDate}</div>
                              {invoice.status !== 'Paid' && invoice.status !== 'Cancelled' && (
                                <div className={`text-xs ${
                                  daysUntilDue < 0 ? 'text-red-600' :
                                  daysUntilDue <= 7 ? 'text-orange-600' :
                                  'text-gray-500'
                                }`}>
                                  {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)}d overdue` : `${daysUntilDue}d remaining`}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">
                            {formatAmount(invoice.amount, invoice.currency)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-green-600">
                            {formatAmount(invoice.paidAmount, invoice.currency)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`font-bold ${
                              invoice.balanceAmount === 0 ? 'text-gray-400' :
                              invoice.status === 'Overdue' ? 'text-red-600' :
                              'text-orange-600'
                            }`}>
                              {formatAmount(invoice.balanceAmount, invoice.currency)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant={getStatusColor(invoice.status)}>
                              {getStatusIcon(invoice.status)}
                              <span className="ml-1">{invoice.status}</span>
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedInvoice(invoice)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {invoice.balanceAmount > 0 && (
                                <Button variant="outline" size="sm">
                                  <DollarSign className="w-4 h-4" />
                                </Button>
                              )}
                              <Button variant="outline" size="sm">
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* PAYMENT HISTORY VIEW */}
      {viewMode === 'payments' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {MOCK_INVOICES.filter(inv => inv.paymentHistory.length > 0).map((invoice) => (
              <Card key={invoice.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4 pb-4 border-b border-gray-200">
                    <div className="flex items-start gap-3">
                      <div className={`p-3 rounded-lg ${invoice.type === 'Sales' ? 'bg-green-100' : 'bg-orange-100'}`}>
                        <FileText className={`w-5 h-5 ${invoice.type === 'Sales' ? 'text-green-600' : 'text-orange-600'}`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">{invoice.invoiceNumber}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {invoice.customer || invoice.supplier} • {invoice.issueDate}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={invoice.type === 'Sales' ? 'success' : 'default'}>{invoice.type}</Badge>
                          <Badge variant={getStatusColor(invoice.status)}>{invoice.status}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Total Amount</div>
                      <div className="text-xl font-bold text-gray-900">{formatAmount(invoice.amount, invoice.currency)}</div>
                      <div className="text-sm text-green-600 mt-1">
                        Paid: {formatAmount(invoice.paidAmount, invoice.currency)}
                      </div>
                      {invoice.balanceAmount > 0 && (
                        <div className="text-sm text-orange-600">
                          Balance: {formatAmount(invoice.balanceAmount, invoice.currency)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <History className="w-4 h-4" />
                      Payment History
                    </h4>
                    {invoice.paymentHistory.map((payment) => (
                      <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-lg">
                            {getPaymentMethodIcon(payment.method)}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{payment.method}</div>
                            <div className="text-sm text-gray-500">{payment.date}</div>
                            {payment.referenceNumber && (
                              <div className="text-xs text-gray-400 mt-1">Ref: {payment.referenceNumber}</div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-green-600">
                            {formatAmount(payment.amount, invoice.currency)}
                          </div>
                          <Badge variant="success" className="mt-1">
                            <CheckCheck className="w-3 h-3 mr-1" />
                            Received
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* AGEING REPORT VIEW */}
      {viewMode === 'ageing' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Accounts Receivable Ageing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowDownRight className="w-5 h-5 text-blue-600" />
                  Accounts Receivable Ageing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {salesAgeing.map((range, index) => {
                    const total = salesAgeing.reduce((sum, r) => sum + r.amount, 0);
                    const percentage = total > 0 ? (range.amount / total) * 100 : 0;
                    return (
                      <div key={index}>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-700 font-medium">{range.range}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-500">{range.count} invoices</span>
                            <span className="text-gray-900 font-bold">{formatCurrency(range.amount)}</span>
                          </div>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              index === 0 ? 'bg-green-600' :
                              index === 1 ? 'bg-blue-600' :
                              index === 2 ? 'bg-orange-600' :
                              'bg-red-600'
                            }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Total Receivables</span>
                    <span className="text-xl font-bold text-blue-600">
                      {formatCurrency(salesAgeing.reduce((sum, r) => sum + r.amount, 0))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Accounts Payable Ageing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowUpRight className="w-5 h-5 text-orange-600" />
                  Accounts Payable Ageing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {purchaseAgeing.map((range, index) => {
                    const total = purchaseAgeing.reduce((sum, r) => sum + r.amount, 0);
                    const percentage = total > 0 ? (range.amount / total) * 100 : 0;
                    return (
                      <div key={index}>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-700 font-medium">{range.range}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-500">{range.count} invoices</span>
                            <span className="text-gray-900 font-bold">{formatCurrency(range.amount)}</span>
                          </div>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              index === 0 ? 'bg-green-600' :
                              index === 1 ? 'bg-blue-600' :
                              index === 2 ? 'bg-orange-600' :
                              'bg-red-600'
                            }`}
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Total Payables</span>
                    <span className="text-xl font-bold text-orange-600">
                      {formatCurrency(purchaseAgeing.reduce((sum, r) => sum + r.amount, 0))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Overdue Invoices Alert */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                Overdue Invoices Requiring Immediate Attention
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {MOCK_INVOICES.filter(inv => inv.status === 'Overdue').map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <div>
                        <div className="font-medium text-gray-900">{invoice.invoiceNumber}</div>
                        <div className="text-sm text-gray-600">{invoice.customer || invoice.supplier}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-red-600">
                        {formatAmount(invoice.balanceAmount, invoice.currency)}
                      </div>
                      <div className="text-sm text-red-600">
                        {invoice.daysOverdue} days overdue
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Send className="w-4 h-4 mr-2" />
                      Send Reminder
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* FINANCIAL ANALYTICS VIEW */}
      {viewMode === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cash Flow Trend */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-red-600" />
                  Cash Flow Analysis (7 Months)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={paymentSummary}>
                    <defs>
                      <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.05}/>
                      </linearGradient>
                      <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="month" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="received"
                      stroke="#10B981"
                      strokeWidth={3}
                      fill="url(#colorReceived)"
                      name="Received"
                    />
                    <Area
                      type="monotone"
                      dataKey="paid"
                      stroke="#EF4444"
                      strokeWidth={3}
                      fill="url(#colorPaid)"
                      name="Paid"
                    />
                    <Line
                      type="monotone"
                      dataKey="net"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      name="Net"
                      dot={{ r: 4 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Invoice Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-red-600" />
                  Invoice Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Paid', value: MOCK_INVOICES.filter(inv => inv.status === 'Paid').length },
                        { name: 'Pending', value: MOCK_INVOICES.filter(inv => inv.status === 'Pending').length },
                        { name: 'Partial', value: MOCK_INVOICES.filter(inv => inv.status === 'Partial').length },
                        { name: 'Overdue', value: MOCK_INVOICES.filter(inv => inv.status === 'Overdue').length },
                      ].filter(item => item.value > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {COLORS.map((color, index) => (
                        <Cell key={`cell-${index}`} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue vs Expenses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-red-600" />
                  Revenue vs Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={paymentSummary}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="month" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #E5E7EB' }}
                    />
                    <Legend />
                    <Bar dataKey="received" fill="#10B981" name="Revenue" />
                    <Bar dataKey="paid" fill="#EF4444" name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
