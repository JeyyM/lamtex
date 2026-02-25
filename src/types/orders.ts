// Order-related types for agent functionality

export type OrderStatus = 
  | 'Draft' 
  | 'Pending Approval' 
  | 'Approved' 
  | 'Picking' 
  | 'Packed' 
  | 'Ready' 
  | 'Scheduled' 
  | 'In Transit' 
  | 'Delivered' 
  | 'Completed' 
  | 'Cancelled' 
  | 'Rejected';

export type PaymentStatus = 
  | 'Unbilled' 
  | 'Invoiced' 
  | 'Partially Paid' 
  | 'Paid' 
  | 'Overdue';

export type DeliveryType = 'Truck' | 'Ship' | 'Pickup';

export type PaymentTerms = 'COD' | '15 Days' | '30 Days' | '45 Days' | '60 Days' | '90 Days' | 'Custom';

export type StockHint = 'Available' | 'Partial' | 'Not Available';

export interface OrderDetail {
  id: string;
  customer: string;
  customerId: string;
  agent: string;
  agentId: string;
  branch: string;
  orderDate: string;
  requiredDate: string;
  deliveryType: DeliveryType;
  paymentTerms: PaymentTerms;
  paymentMethod: 'Online' | 'Offline';
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  
  // Line items
  items: OrderLineItem[];
  
  // Pricing
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  totalAmount: number;
  
  // Approval workflow
  requiresApproval: boolean;
  approvalReason?: string[];
  approvedBy?: string;
  approvedDate?: string;
  rejectedBy?: string;
  rejectedDate?: string;
  rejectionReason?: string;
  
  // Delivery tracking
  estimatedDelivery?: string;
  actualDelivery?: string;
  deliveryStatus?: 'On Time' | 'Delayed' | 'Failed';
  delayReason?: string;
  
  // Invoice
  invoiceId?: string;
  invoiceDate?: string;
  dueDate?: string;
  amountPaid: number;
  balanceDue: number;
  
  // Notes and audit
  orderNotes?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

export interface OrderLineItem {
  id: string;
  sku: string;
  productName: string;
  variantDescription: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  lineTotal: number;
  stockHint: StockHint;
  availableStock?: number;
}

export interface OrderFilter {
  searchTerm?: string;
  status?: OrderStatus[];
  paymentStatus?: PaymentStatus[];
  customer?: string[];
  dateFrom?: string;
  dateTo?: string;
  requiredDateFrom?: string;
  requiredDateTo?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface ApprovalRule {
  type: 'discount' | 'minPrice' | 'paymentTerms' | 'creditLimit';
  threshold: number;
  description: string;
}
