// Payment system types

export type PaymentMethodType = 'GCash' | 'Maya' | 'Bank Transfer' | 'Credit Card' | 'Debit Card' | 'Cash' | 'Check';

export interface PaymentMethodFee {
  method: PaymentMethodType;
  gatewayFeePercent: number; // What payment gateway charges (e.g., 2%)
  gatewayFeeFixed: number; // Fixed fee from gateway (e.g., ₱500)
  serviceFeePercent: number; // LAMTEX service fee (e.g., 0.75%)
  serviceFeeFixed: number; // Fixed LAMTEX fee (e.g., ₱200)
  enabled: boolean;
  description: string;
}

export interface PaymentFeeBreakdown {
  invoiceAmount: number;
  gatewayFee: number;
  serviceFee: number; // LAMTEX's revenue
  totalFees: number;
  totalAmount: number; // What customer pays
}

export interface PaymentLink {
  id: string;
  token: string; // Unique public token (PAY-2026-ABC123)
  invoiceId: string;
  orderId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  
  invoiceAmount: number;
  
  // Available payment methods with fees
  paymentMethods: PaymentMethodFee[];
  
  status: 'pending' | 'paid' | 'expired' | 'cancelled' | 'failed';
  
  link: string; // Full URL
  qrCodeData?: string; // QR code for the link
  
  createdAt: string;
  expiresAt: string;
  paidAt?: string;
  
  sentViaEmail: boolean;
  sentViaSMS: boolean;
  lastEmailSentAt?: string;
  lastSMSSentAt?: string;
  
  viewCount: number; // How many times customer opened link
  
  // Completed payment details
  selectedPaymentMethod?: PaymentMethodType;
  paymentTransactionId?: string;
  feeBreakdown?: PaymentFeeBreakdown;
}

export interface PaymentTransaction {
  id: string;
  paymentLinkId: string;
  invoiceId: string;
  orderId: string;
  
  paymentMethod: PaymentMethodType;
  
  // Amount breakdown
  invoiceAmount: number;
  gatewayFee: number; // What gateway charges
  serviceFee: number; // LAMTEX's revenue
  totalFees: number;
  totalPaid: number; // Total customer paid
  
  // Gateway details
  gatewayReferenceNumber: string;
  gatewayTransactionId?: string;
  gatewayResponse?: any;
  
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
  
  paidAt: string;
  processedAt?: string;
  
  // Customer info
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  
  // Receipt
  receiptId: string;
  receiptSentViaEmail: boolean;
  receiptSentViaSMS: boolean;
  
  // Audit
  ipAddress?: string;
  userAgent?: string;
  
  notes?: string;
}

export interface DigitalReceipt {
  id: string;
  receiptNumber: string; // REC-2026-001234
  
  paymentTransactionId: string;
  invoiceId: string;
  orderId: string;
  
  // Payment details
  paidAt: string;
  paymentMethod: PaymentMethodType;
  gatewayReferenceNumber: string;
  
  // Customer
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  
  // Amount breakdown
  invoiceAmount: number;
  gatewayFee: number;
  serviceFee: number; // LAMTEX service fee (shown as "Convenience Fee")
  totalFees: number;
  totalPaid: number;
  
  // Receipt files
  pdfUrl?: string;
  publicUrl: string; // /receipt/:id (no auth required)
  
  // Invoice items (for display on receipt)
  invoiceItems: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  
  // Status
  emailSent: boolean;
  smsSent: boolean;
  
  // Metadata
  generatedAt: string;
  viewCount: number;
}

// Default payment method configurations
export const PAYMENT_METHOD_CONFIGS: PaymentMethodFee[] = [
  {
    method: 'GCash',
    gatewayFeePercent: 1.5,
    gatewayFeeFixed: 0,
    serviceFeePercent: 0.75,
    serviceFeeFixed: 200,
    enabled: true,
    description: 'Pay via GCash wallet - instant confirmation',
  },
  {
    method: 'Maya',
    gatewayFeePercent: 1.5,
    gatewayFeeFixed: 0,
    serviceFeePercent: 0.75,
    serviceFeeFixed: 200,
    enabled: true,
    description: 'Pay via Maya (PayMaya) wallet - instant confirmation',
  },
  {
    method: 'Bank Transfer',
    gatewayFeePercent: 0,
    gatewayFeeFixed: 500,
    serviceFeePercent: 0.5,
    serviceFeeFixed: 300,
    enabled: true,
    description: 'Direct bank transfer - processed within 24 hours',
  },
  {
    method: 'Credit Card',
    gatewayFeePercent: 2.5,
    gatewayFeeFixed: 0,
    serviceFeePercent: 0.75,
    serviceFeeFixed: 200,
    enabled: true,
    description: 'Pay with Visa, Mastercard, JCB - instant confirmation',
  },
  {
    method: 'Debit Card',
    gatewayFeePercent: 2.0,
    gatewayFeeFixed: 0,
    serviceFeePercent: 0.75,
    serviceFeeFixed: 200,
    enabled: true,
    description: 'Pay with debit card - instant confirmation',
  },
];

// Helper function to calculate fees
export function calculatePaymentFees(
  invoiceAmount: number,
  paymentMethod: PaymentMethodFee
): PaymentFeeBreakdown {
  const gatewayFee = 
    (invoiceAmount * paymentMethod.gatewayFeePercent / 100) + 
    paymentMethod.gatewayFeeFixed;
  
  const serviceFee = 
    (invoiceAmount * paymentMethod.serviceFeePercent / 100) + 
    paymentMethod.serviceFeeFixed;
  
  const totalFees = gatewayFee + serviceFee;
  const totalAmount = invoiceAmount + totalFees;
  
  return {
    invoiceAmount,
    gatewayFee: Math.round(gatewayFee * 100) / 100,
    serviceFee: Math.round(serviceFee * 100) / 100,
    totalFees: Math.round(totalFees * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}
