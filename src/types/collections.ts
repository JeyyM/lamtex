// Collections and receivables types for agent functionality

export type CollectionStatus = 'Current' | 'Due Soon' | 'Overdue' | 'Critical' | 'Collected' | 'Partially Paid';

export interface Receivable {
  id: string;
  invoiceId: string;
  orderId: string;
  customerId: string;
  customerName: string;
  invoiceDate: string;
  dueDate: string;
  invoiceAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: CollectionStatus;
  daysOverdue: number;
  paymentTerms: string;
  
  // Agent details
  assignedAgent: string;
  assignedAgentId: string;
  branch: string;
  
  // Collection tracking
  lastContactDate?: string;
  nextFollowUpDate?: string;
  collectionNotes?: CollectionNote[];
  
  // Payment history
  payments?: PaymentRecord[];
  
  createdAt: string;
  updatedAt: string;
}

export interface CollectionNote {
  id: string;
  receivableId: string;
  noteType: 'Phone Call' | 'Email' | 'Visit' | 'Promise to Pay' | 'Dispute' | 'Other';
  content: string;
  nextAction?: string;
  followUpDate?: string;
  createdBy: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  receivableId: string;
  invoiceId: string;
  paymentDate: string;
  amount: number;
  paymentMethod: 'Cash' | 'Check' | 'Bank Transfer' | 'Online Payment' | 'Credit Card';
  referenceNumber?: string;
  
  // For agent-submitted payments
  submittedBy?: string;
  submittedAt?: string;
  proofOfPayment?: string[];
  verificationStatus?: 'Pending' | 'Verified' | 'Rejected';
  verifiedBy?: string;
  verifiedAt?: string;
  
  notes?: string;
  createdAt: string;
}

export interface ReceivablesSummary {
  totalOutstanding: number;
  dueThisWeek: number;
  overdue: number;
  critical: number;
  customersWithOverdue: number;
  avgDaysOverdue: number;
}

export interface PaymentLink {
  id: string;
  orderId: string;
  invoiceId: string;
  customerId: string;
  customerName: string;
  amount: number;
  feePercent: number;
  feeAmount: number;
  totalAmount: number;
  
  // Link details
  linkUrl: string;
  status: 'Generated' | 'Sent' | 'Viewed' | 'Paid' | 'Expired' | 'Voided';
  expiresAt: string;
  
  // Tracking
  generatedBy: string;
  generatedAt: string;
  sentAt?: string;
  viewedAt?: string;
  paidAt?: string;
  voidedAt?: string;
  voidReason?: string;
  
  // Communication
  sentVia?: ('Email' | 'SMS' | 'WhatsApp')[];
  recipientEmail?: string;
  recipientPhone?: string;
}
