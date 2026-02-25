// Customer-related types for agent functionality

export type CustomerType = 'Hardware Store' | 'Construction Company' | 'Contractor' | 'Distributor';
export type CustomerStatus = 'Active' | 'Inactive' | 'Suspended' | 'Dormant' | 'On Hold';
export type RiskLevel = 'Low' | 'Medium' | 'High';
export type PaymentBehavior = 'Good' | 'Watchlist' | 'Risk';

export interface CustomerDetail {
  id: string;
  name: string;
  type: CustomerType;
  status: CustomerStatus;
  riskLevel: RiskLevel;
  paymentBehavior: PaymentBehavior;
  
  // Contact information
  contactPerson: string;
  phone: string;
  email: string;
  alternatePhone?: string;
  alternateEmail?: string;
  
  // Address
  address: string;
  city: string;
  province: string;
  postalCode: string;
  mapLocation?: {
    lat: number;
    lng: number;
  };
  
  // Business details
  businessRegistration?: string;
  taxId?: string;
  
  // Credit and payment
  creditLimit: number;
  outstandingBalance: number;
  availableCredit: number;
  paymentTerms: string;
  paymentScore: number; // 0-100
  avgPaymentDays: number;
  overdueAmount: number;
  
  // Purchase history
  totalPurchasesYTD: number;
  totalPurchasesLifetime: number;
  orderCount: number;
  lastOrderDate?: string;
  accountSince: string;
  
  // Assignment
  assignedAgent: string;
  assignedAgentId: string;
  branch: string;
  
  // Metadata
  notes?: CustomerNote[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomerNote {
  id: string;
  customerId: string;
  type: 'Call' | 'Visit' | 'Email' | 'Meeting' | 'Negotiation' | 'Complaint' | 'Other';
  content: string;
  createdBy: string;
  createdAt: string;
  isImportant: boolean;
}

export interface CustomerTask {
  id: string;
  customerId: string;
  customerName: string;
  type: 'Follow-up' | 'Visit' | 'Call' | 'Delivery Check' | 'Collection' | 'Quote' | 'Other';
  title: string;
  description?: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
  dueDate: string;
  completedDate?: string;
  assignedTo: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface BuyingPattern {
  productCategory: string;
  frequency: 'Weekly' | 'Bi-weekly' | 'Monthly' | 'Quarterly' | 'Irregular';
  avgOrderValue: number;
  lastPurchase: string;
  trend: 'Increasing' | 'Stable' | 'Declining';
}

export interface CustomerActivity {
  id: string;
  customerId: string;
  type: 'Order Created' | 'Payment Received' | 'Note Added' | 'Task Created' | 'Call Made' | 'Visit Completed' | 'Status Changed';
  description: string;
  performedBy: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface TopProduct {
  sku: string;
  productName: string;
  variantDescription: string;
  quantityOrdered: number;
  totalValue: number;
  orderCount: number;
  lastOrderDate: string;
}
