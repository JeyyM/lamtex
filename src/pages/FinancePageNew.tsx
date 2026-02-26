import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { getOrderById, MOCK_ORDERS_DETAILED } from '@/src/mock/orders';
import { Invoice, ProofDocument } from '@/src/types/orders';
import {
  DollarSign,
  FileText,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Download,
  Send,
  Eye,
  Plus,
  Search,
  Filter,
  CreditCard,
  Building2,
  User,
  Receipt,
  Wallet,
  ArrowUpRight,
  Banknote,
  CircleDollarSign,
  Timer,
  CheckCheck,
  History,
  X,
  Upload,
  Image,
  XCircle,
  CheckCircle2,
} from 'lucide-react';

// Customer Credit Info
interface CustomerCredit {
  customerId: string;
  customerName: string;
  creditLimit: number;
  currentBalance: number;
  availableCredit: number;
  utilizationPercent: number;
  paymentTerms: string;
  status: 'Good' | 'Warning' | 'Exceeded';
}

// Payment Record
interface PaymentRecord {
  id: string;
  invoiceId: string;
  orderNumber: string;
  customer: string;
  paymentDate: string;
  amount: number;
  paymentMethod: 'Cash' | 'Check' | 'Bank Transfer' | 'Credit Card' | 'GCash' | 'Online';
  referenceNumber?: string;
  recordedBy: string;
  notes?: string;
  proofDocument?: ProofDocument;
}

// Mock data - Generate invoices from orders
const generateInvoicesFromOrders = (): Invoice[] => {
  return MOCK_ORDERS_DETAILED
    .filter(order => order.status !== 'Draft' && order.status !== 'Cancelled')
    .map(order => ({
      id: order.invoiceId || `INV-${order.id}`,
      orderId: order.id,
      invoiceNumber: order.invoiceId || `INV-2026-${Math.floor(Math.random() * 9000 + 1000)}`,
      issueDate: order.invoiceDate || order.createdAt,
      dueDate: order.dueDate || new Date(new Date(order.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      
      billTo: {
        name: order.customer,
        address: '123 Business Street, Manila',
        contactPerson: 'Contact Person',
        phone: '(02) 123-4567',
        email: `${order.customer.toLowerCase().replace(/\s/g, '')}@example.com`,
      },
      
      items: order.items,
      
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      taxAmount: 0,
      totalAmount: order.totalAmount,
      amountPaid: order.amountPaid,
      balanceDue: order.balanceDue,
      
      paymentTerms: order.paymentTerms,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      
      notes: order.orderNotes,
      generatedBy: order.agent,
      generatedAt: order.invoiceDate || order.createdAt,
      pdfUrl: undefined,
    }));
};

export function FinancePageNew() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments' | 'aging' | 'credits'>('invoices');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Check' | 'Bank Transfer' | 'Credit Card' | 'GCash' | 'Online'>('Cash');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>([]);

  // Generate invoices from orders
  const invoices = useMemo(() => generateInvoicesFromOrders(), []);

  // Calculate financial metrics
  const metrics = useMemo(() => {
    const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.balanceDue, 0);
    const totalOverdue = invoices
      .filter(inv => {
        const dueDate = new Date(inv.dueDate);
        const today = new Date();
        return inv.balanceDue > 0 && dueDate < today;
      })
      .reduce((sum, inv) => sum + inv.balanceDue, 0);
    
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const collectedThisMonth = paymentRecords
      .filter(payment => {
        const paymentDate = new Date(payment.paymentDate);
        return paymentDate.getMonth() === thisMonth && paymentDate.getFullYear() === thisYear;
      })
      .reduce((sum, payment) => sum + payment.amount, 0);
    
    const invoicesPending = invoices.filter(inv => inv.paymentStatus === 'Invoiced').length;

    return {
      totalOutstanding,
      totalOverdue,
      collectedThisMonth,
      invoicesPending,
    };
  }, [invoices, paymentRecords]);

  // Customer credit data
  const customerCredits: CustomerCredit[] = useMemo(() => {
    const customers = Array.from(new Set(invoices.map(inv => inv.billTo.name)));
    return customers.map(customerName => {
      const customerInvoices = invoices.filter(inv => inv.billTo.name === customerName);
      const currentBalance = customerInvoices.reduce((sum, inv) => sum + inv.balanceDue, 0);
      const creditLimit = 5000000; // Mock credit limit
      const availableCredit = creditLimit - currentBalance;
      const utilizationPercent = (currentBalance / creditLimit) * 100;
      
      let status: 'Good' | 'Warning' | 'Exceeded' = 'Good';
      if (utilizationPercent > 100) status = 'Exceeded';
      else if (utilizationPercent > 80) status = 'Warning';

      return {
        customerId: `CUS-${Math.floor(Math.random() * 1000)}`,
        customerName,
        creditLimit,
        currentBalance,
        availableCredit,
        utilizationPercent: Math.min(utilizationPercent, 100),
        paymentTerms: customerInvoices[0]?.paymentTerms || '30 Days',
        status,
      };
    });
  }, [invoices]);

  // Aging report
  const agingReport = useMemo(() => {
    const today = new Date();
    const aging = {
      current: { count: 0, amount: 0 }, // 0-30 days
      days30: { count: 0, amount: 0 },  // 31-60 days
      days60: { count: 0, amount: 0 },  // 61-90 days
      days90: { count: 0, amount: 0 },  // 90+ days
    };

    invoices.forEach(inv => {
      if (inv.balanceDue === 0) return;
      
      const dueDate = new Date(inv.dueDate);
      const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysOverdue <= 0) {
        aging.current.count++;
        aging.current.amount += inv.balanceDue;
      } else if (daysOverdue <= 30) {
        aging.days30.count++;
        aging.days30.amount += inv.balanceDue;
      } else if (daysOverdue <= 60) {
        aging.days60.count++;
        aging.days60.amount += inv.balanceDue;
      } else {
        aging.days90.count++;
        aging.days90.amount += inv.balanceDue;
      }
    });

    return aging;
  }, [invoices]);

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = searchTerm === '' || 
        inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.billTo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.orderId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || inv.paymentStatus === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, statusFilter]);

  // Handle payment recording
  const handleRecordPayment = () => {
    if (!selectedInvoice || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0 || amount > selectedInvoice.balanceDue) {
      alert('Invalid payment amount');
      return;
    }

    const newPayment: PaymentRecord = {
      id: `PAY-${Date.now()}`,
      invoiceId: selectedInvoice.invoiceNumber,
      orderNumber: selectedInvoice.orderId,
      customer: selectedInvoice.billTo.name,
      paymentDate: new Date().toISOString().split('T')[0],
      amount,
      paymentMethod,
      referenceNumber: paymentReference || undefined,
      recordedBy: 'Current User',
      notes: paymentNotes || undefined,
    };

    setPaymentRecords([...paymentRecords, newPayment]);

    // Update invoice
    selectedInvoice.amountPaid += amount;
    selectedInvoice.balanceDue -= amount;
    if (selectedInvoice.balanceDue === 0) {
      selectedInvoice.paymentStatus = 'Paid';
    } else if (selectedInvoice.amountPaid > 0) {
      selectedInvoice.paymentStatus = 'Partially Paid';
    }

    alert(`Payment of ₱${amount.toLocaleString()} recorded successfully!`);
    
    // Reset form
    setShowPaymentModal(false);
    setSelectedInvoice(null);
    setPaymentAmount('');
    setPaymentReference('');
    setPaymentNotes('');
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral', label: string }> = {
      'Paid': { variant: 'success', label: 'Paid' },
      'Partially Paid': { variant: 'warning', label: 'Partially Paid' },
      'Invoiced': { variant: 'info', label: 'Invoiced' },
      'Unbilled': { variant: 'neutral', label: 'Unbilled' },
      'Overdue': { variant: 'danger', label: 'Overdue' },
    };
    const config = variants[status] || variants['Unbilled'];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Finance & Invoices</h1>
          <p className="text-gray-500 mt-1">Manage invoices, payments, and accounts receivable</p>
        </div>
        <Button variant="primary" className="gap-2">
          <Plus className="w-4 h-4" />
          Generate Bulk Invoices
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Outstanding</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  ₱{metrics.totalOutstanding.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">Across all customers</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <CircleDollarSign className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue Amount</p>
                <p className="text-2xl font-bold text-red-600 mt-2">
                  ₱{metrics.totalOverdue.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">Requires attention</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Collected This Month</p>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  ₱{metrics.collectedThisMonth.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">Cash flow this month</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Invoices</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {metrics.invoicesPending}
                </p>
                <p className="text-xs text-gray-500 mt-1">Awaiting payment</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('invoices')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'invoices'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Invoices
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'payments'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Wallet className="w-4 h-4 inline mr-2" />
            Payments
          </button>
          <button
            onClick={() => setActiveTab('aging')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'aging'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Timer className="w-4 h-4 inline mr-2" />
            Aging Report
          </button>
          <button
            onClick={() => setActiveTab('credits')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'credits'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <CreditCard className="w-4 h-4 inline mr-2" />
            Customer Credits
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'invoices' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Invoices</CardTitle>
              <div className="flex gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search invoices..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="Unbilled">Unbilled</option>
                  <option value="Invoiced">Invoiced</option>
                  <option value="Partially Paid">Partially Paid</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Invoice #</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Customer</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Issue Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Due Date</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700">Total</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700">Paid</th>
                    <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700">Balance</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">Status</th>
                    <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Receipt className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{invoice.invoiceNumber}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{invoice.billTo.name}</p>
                          <p className="text-xs text-gray-500">Order: {invoice.orderId}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(invoice.issueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(invoice.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">
                        ₱{invoice.totalAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-green-600 font-medium">
                        ₱{invoice.amountPaid.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-gray-900">
                        ₱{invoice.balanceDue.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getStatusBadge(invoice.paymentStatus)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/orders/${invoice.orderId}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => alert(`Download invoice ${invoice.invoiceNumber}`)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          {invoice.balanceDue > 0 && (
                            <Button 
                              variant="primary" 
                              size="sm"
                              onClick={() => {
                                setSelectedInvoice(invoice);
                                setShowPaymentModal(true);
                              }}
                            >
                              <DollarSign className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'payments' && (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            {paymentRecords.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No payments recorded yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Invoice</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Customer</th>
                      <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700">Amount</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Method</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Reference</th>
                      <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentRecords.map((payment) => (
                      <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(payment.paymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-900">{payment.invoiceId}</td>
                        <td className="py-3 px-4 text-gray-700">{payment.customer}</td>
                        <td className="py-3 px-4 text-right font-bold text-green-600">
                          ₱{payment.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="neutral">{payment.paymentMethod}</Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">{payment.referenceNumber || '-'}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{payment.recordedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'aging' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Accounts Receivable Aging</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-green-900">Current (0-30 days)</p>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold text-green-900">₱{agingReport.current.amount.toLocaleString()}</p>
                  <p className="text-xs text-green-700 mt-1">{agingReport.current.count} invoices</p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-yellow-900">1-30 days overdue</p>
                    <Clock className="w-5 h-5 text-yellow-600" />
                  </div>
                  <p className="text-2xl font-bold text-yellow-900">₱{agingReport.days30.amount.toLocaleString()}</p>
                  <p className="text-xs text-yellow-700 mt-1">{agingReport.days30.count} invoices</p>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-orange-900">31-60 days overdue</p>
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                  </div>
                  <p className="text-2xl font-bold text-orange-900">₱{agingReport.days60.amount.toLocaleString()}</p>
                  <p className="text-xs text-orange-700 mt-1">{agingReport.days60.count} invoices</p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-red-900">90+ days overdue</p>
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <p className="text-2xl font-bold text-red-900">₱{agingReport.days90.amount.toLocaleString()}</p>
                  <p className="text-xs text-red-700 mt-1">{agingReport.days90.count} invoices</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Overdue Invoices Detail */}
          <Card>
            <CardHeader>
              <CardTitle>Overdue Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invoices
                  .filter(inv => {
                    const dueDate = new Date(inv.dueDate);
                    const today = new Date();
                    return inv.balanceDue > 0 && dueDate < today;
                  })
                  .map((invoice) => {
                    const dueDate = new Date(invoice.dueDate);
                    const today = new Date();
                    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

                    return (
                      <div key={invoice.id} className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{invoice.billTo.name}</p>
                            <p className="text-sm text-gray-600">Invoice: {invoice.invoiceNumber}</p>
                            <p className="text-xs text-red-600 font-medium mt-1">{daysOverdue} days overdue</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-red-900">₱{invoice.balanceDue.toLocaleString()}</p>
                          <p className="text-xs text-gray-600">Due: {new Date(invoice.dueDate).toLocaleDateString()}</p>
                          <Button 
                            variant="danger" 
                            size="sm" 
                            className="mt-2"
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowPaymentModal(true);
                            }}
                          >
                            Record Payment
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'credits' && (
        <Card>
          <CardHeader>
            <CardTitle>Customer Credit Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {customerCredits.map((credit) => (
                <div key={credit.customerId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{credit.customerName}</p>
                        <p className="text-xs text-gray-500">Payment Terms: {credit.paymentTerms}</p>
                      </div>
                    </div>
                    <Badge variant={
                      credit.status === 'Good' ? 'success' : 
                      credit.status === 'Warning' ? 'warning' : 'danger'
                    }>
                      {credit.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-gray-600">Credit Limit</p>
                      <p className="font-semibold text-gray-900">₱{credit.creditLimit.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Current Balance</p>
                      <p className="font-semibold text-red-600">₱{credit.currentBalance.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Available Credit</p>
                      <p className="font-semibold text-green-600">₱{credit.availableCredit.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Utilization</p>
                      <p className="font-semibold text-gray-900">{credit.utilizationPercent.toFixed(1)}%</p>
                    </div>
                  </div>

                  {/* Credit Utilization Bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        credit.utilizationPercent > 100 ? 'bg-red-600' :
                        credit.utilizationPercent > 80 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(credit.utilizationPercent, 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Recording Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <DollarSign className="w-6 h-6 text-green-600" />
                Record Payment
              </h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900 font-medium">Invoice Details</p>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Invoice:</span>
                    <span className="font-medium text-blue-900">{selectedInvoice.invoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Customer:</span>
                    <span className="font-medium text-blue-900">{selectedInvoice.billTo.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Total Amount:</span>
                    <span className="font-medium text-blue-900">₱{selectedInvoice.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Already Paid:</span>
                    <span className="font-medium text-green-700">₱{selectedInvoice.amountPaid.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t border-blue-200 pt-1 mt-1">
                    <span className="text-blue-700 font-semibold">Balance Due:</span>
                    <span className="font-bold text-blue-900">₱{selectedInvoice.balanceDue.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Amount
                  </label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    max={selectedInvoice.balanceDue}
                    placeholder="0.00"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Check">Check</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="GCash">GCash</option>
                    <option value="Online">Online Payment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reference Number (Optional)
                  </label>
                  <input
                    type="text"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="e.g., Check #, Transaction ID"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    rows={3}
                    placeholder="Additional notes about this payment..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
              </div>
            </div>
              
            <div className="flex gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0">
              <Button variant="outline" onClick={() => setShowPaymentModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                variant="primary" 
                onClick={handleRecordPayment}
                disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
              >
                <CheckCheck className="w-4 h-4" />
                Record Payment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
