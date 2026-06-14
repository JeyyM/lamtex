export type OrderCustomerPortalRow = {
  id: string;
  orderId: string;
  token: string;
  expiresAt: string | null;
  viewCount: number;
  lastViewedAt: string | null;
  customerEmail: string | null;
  sentViaEmail: boolean;
  lastEmailSent: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export type PublicOrderDiscountLine = {
  name: string;
  percentage: number;
};

export type PublicOrderDiscountAmountLine = {
  name: string;
  amount: number;
  percentage?: number;
};

export type PublicOrderLineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  discountsBreakdown?: PublicOrderDiscountLine[];
  /** Pre-expanded per-discount amounts from RPC (preferred for display). */
  discountLines?: PublicOrderDiscountAmountLine[];
  total: number;
};

export type PublicOrderContact = {
  name: string;
  phone?: string | null;
  email?: string | null;
};

export type PublicOrderAssignedDriver = PublicOrderContact & {
  vehicleName?: string | null;
  tripNumber?: string | null;
  status?: string | null;
};

export type PublicOrderTrip = {
  tripNumber: string;
  driverName: string;
  driverPhone?: string | null;
  driverEmail?: string | null;
  vehicleName: string;
  status: string;
  scheduledDate: string | null;
  delayReason: string | null;
};

export type PublicOrderActivity = {
  at: string;
  action: string;
  description: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
};

export type PublicOrderSummary = {
  ok: boolean;
  error?: string;
  orderNumber: string;
  orderDate: string;
  requiredDate?: string | null;
  actualDelivery?: string | null;
  status: string;
  paymentStatus: string;
  paymentTerms?: string | null;
  deliveryType?: string | null;
  deliveryAddress?: string | null;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  invoiceNumber?: string | null;
  issueDate?: string | null;
  dueDate?: string | null;
  orderNotes?: string | null;
  invoiceNotes?: string | null;
  agentName?: string | null;
  agent: PublicOrderContact;
  assignedDriver: PublicOrderAssignedDriver | null;
  branchName?: string | null;
  customer: {
    name: string;
    email?: string | null;
    phone?: string | null;
    contactPerson?: string | null;
    address?: string | null;
  };
  company: {
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
  };
  items: PublicOrderLineItem[];
  trips: PublicOrderTrip[];
  activities: PublicOrderActivity[];
};
