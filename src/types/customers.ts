// Customer-related types for agent functionality

export type CustomerType = 'Hardware Store' | 'Construction Company' | 'Contractor' | 'Distributor';
export type CustomerStatus = 'Active' | 'Inactive' | 'Suspended' | 'Dormant' | 'On Hold';
export type RiskLevel = 'Low' | 'Medium' | 'High';
export type PaymentBehavior = 'Good' | 'Watchlist' | 'Risk';
export type ClientType = 'Office' | 'Personal'; // Office = 0.5% commission, Personal = 1% commission

/** Decimal fraction for commission on YTD (e.g. 0.005 = 0.5%). */
export function clientCommissionFraction(clientType: string): number {
  return clientType === 'Personal' ? 0.01 : 0.005;
}

export function clientCommissionPercentLabel(clientType: string): string {
  return clientType === 'Personal' ? '1%' : '0.5%';
}

export interface CustomerDetail {
  id: string;
  name: string;
  type: CustomerType;
  clientType: ClientType; // Office or Personal client
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
  tags?: string[];
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
  type: 'Order Created' | 'Payment Received' | 'Call Made' | 'Visit Completed' | 'Status Changed';
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
