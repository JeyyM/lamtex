export interface AgentKPI {
  id: string;
  label: string;
  value: string;
  subtitle?: string;
  status?: 'success' | 'warning' | 'danger' | 'default';
  branch?: string;
}

export interface AgentCustomer {
  id: string;
  customerName: string;
  contactPerson: string;
  phone: string;
  email?: string;
  location: string;
  accountType: 'Retail' | 'Construction' | 'Distributor' | 'Government';
  creditLimit: number;
  outstandingBalance: number;
  paymentStatus: 'Current' | 'Overdue' | 'Critical';
  daysOverdue?: number;
  lastOrderDate: string;
  lastVisitDate?: string;
  nextVisitScheduled?: string;
  totalOrdersYTD: number;
  totalRevenueYTD: number;
  healthScore: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  notes?: string;
  branch?: string;
}

export interface AgentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerId: string;
  orderDate: string;
  requestedDeliveryDate: string;
  totalAmount: number;
  discountApplied: number;
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'In Fulfillment' | 'Ready for Dispatch' | 'Delivered' | 'Cancelled';
  approver?: string;
  rejectionReason?: string;
  items: Array<{
    productName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    subtotal: number;
  }>;
  deliveryAddress: string;
  specialInstructions?: string;
  createdBy: string;
  branch?: string;
}

export interface PODCollection {
  id: string;
  deliveryNumber: string;
  orderNumber: string;
  customerName: string;
  deliveredDate: string;
  deliveredTime?: string;
  deliveryAmount: number;
  receivedBy?: string;
  podCollected: boolean;
  podImage?: string;
  podNotes?: string;
  signatureRequired: boolean;
  issues?: string[];
  branch?: string;
}

export interface PaymentCollection {
  id: string;
  invoiceNumber: string;
  orderNumber: string;
  customerName: string;
  customerId: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  amountPaid: number;
  amountDue: number;
  paymentStatus: 'Paid' | 'Partial' | 'Pending' | 'Overdue' | 'Critical';
  daysOverdue?: number;
  paymentMethod?: 'Cash' | 'Check' | 'Bank Transfer' | 'Credit Card';
  collectionNotes?: string;
  lastPaymentDate?: string;
  branch?: string;
}

export interface PurchaseRequest {
  id: string;
  requestNumber: string;
  itemName: string;
  category: 'Raw Material' | 'Finished Good' | 'Supplies' | 'Equipment';
  quantity: number;
  unit: string;
  estimatedCost: number;
  supplier?: string;
  supplierQuote?: number;
  reason: string;
  urgency: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Ordered' | 'Received';
  requestedBy: string;
  requestDate: string;
  approver?: string;
  approvalDate?: string;
  rejectionReason?: string;
  expectedDelivery?: string;
  branch?: string;
}

export interface AgentPerformance {
  id: string;
  metric: string;
  current: number;
  target: number;
  unit: string;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  period: 'today' | 'this-week' | 'this-month' | 'ytd';
  rank?: number;
  totalAgents?: number;
  branch?: string;
}

export interface Commission {
  id: string;
  period: string;
  salesAmount: number;
  commissionRate: number;
  commissionEarned: number;
  status: 'Pending' | 'Approved' | 'Paid';
  paidDate?: string;
  breakdown: Array<{
    orderNumber: string;
    customerName: string;
    saleAmount: number;
    commission: number;
  }>;
  branch?: string;
}

export interface AgentActivity {
  id: string;
  type: 'Order Created' | 'Customer Visit' | 'POD Collected' | 'Payment Collected' | 'Purchase Request' | 'Call Made' | 'Email Sent';
  title: string;
  description: string;
  relatedTo?: string;
  timestamp: string;
  status?: 'Success' | 'Pending' | 'Failed';
  branch?: string;
}

export interface AgentAlert {
  id: string;
  type: 'Payment Overdue' | 'Order Rejected' | 'POD Pending' | 'Credit Limit' | 'Customer Issue' | 'Target Alert' | 'Commission Update';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  title: string;
  message: string;
  relatedCustomer?: string;
  relatedOrder?: string;
  actionRequired: boolean;
  timestamp: string;
  branch?: string;
}
