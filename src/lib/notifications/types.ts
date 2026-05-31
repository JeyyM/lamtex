export type NotificationCategory =
  | 'Approvals'
  | 'Inventory'
  | 'Delivery'
  | 'Payment'
  | 'System'
  | 'Message';

export interface AppNotification {
  id: string;
  userId: string | null;
  category: NotificationCategory;
  title: string | null;
  message: string;
  urgent: boolean;
  read: boolean;
  actionUrl: string | null;
  actionLabel: string | null;
  branchId: string | null;
  metadata: Record<string, unknown> | null;
  eventType: string | null;
  createdAt: string;
}

export interface OrderCreatedNotifyLineItem {
  productName: string;
  variantDescription?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  discountPercent?: number;
}

export interface OrderCreatedNotifyPayload {
  orderId: string;
  orderNumber: string;
  customerName: string | null;
  agentName: string | null;
  branchName: string | null;
  orderDate: string;
  requiredDate: string | null;
  deliveryAddress: string | null;
  urgency: string | null;
  status: string;
  subtotal: number;
  totalAmount: number;
  items: OrderCreatedNotifyLineItem[];
  deliveryType?: string | null;
  paymentTerms?: string | null;
  paymentMethod?: string | null;
  discountPercent?: number | null;
  discountAmount?: number | null;
  orderNotes?: string | null;
  lineCount?: number | null;
}

export interface OrderDecisionNotifyPayload extends OrderCreatedNotifyPayload {
  decision: 'approved' | 'rejected';
  decidedBy: string | null;
  rejectionReason?: string | null;
  agentEmail?: string | null;
}

export interface OrderRevisedNotifyPayload extends OrderCreatedNotifyPayload {
  previousRejectionReason?: string | null;
}

export interface OrderCancelledNotifyPayload extends OrderCreatedNotifyPayload {
  cancelledBy: string | null;
  cancelledByRole: 'agent' | 'executive';
  cancellationReason: string;
  additionalNotes?: string | null;
  notifyTarget: 'agent' | 'executive';
  agentEmail?: string | null;
}

export interface OrderLogisticsReadyNotifyPayload extends OrderCreatedNotifyPayload {
  approvedBy: string | null;
  branchId: string;
  logisticsEmails: string[];
}

export interface OrderLogisticsLoadingNotifyPayload extends OrderCreatedNotifyPayload {
  markedBy: string | null;
  branchId: string;
  logisticsEmails: string[];
}

export interface OrderPackedNotifyPayload extends OrderCreatedNotifyPayload {
  markedBy: string | null;
  branchId: string;
  logisticsEmails: string[];
  agentEmail?: string | null;
}

export interface OrderAgentContact {
  name: string;
  phone?: string | null;
  email?: string | null;
}

export interface OrderCustomerApprovedNotifyPayload extends OrderCreatedNotifyPayload {
  customerEmail: string;
  customerContactPerson?: string | null;
  approvedBy?: string | null;
  agent: OrderAgentContact;
  portalToken?: string | null;
  portalId?: string | null;
}

export interface OrderCustomerScheduledNotifyPayload extends OrderCustomerApprovedNotifyPayload {
  scheduledDate: string | null;
  tripNumber?: string | null;
}

export interface OrderCustomerInTransitNotifyPayload extends OrderCustomerApprovedNotifyPayload {
  tripNumber?: string | null;
  vehicleName?: string | null;
  driverName?: string | null;
}

export interface OrderCustomerDeliveryRecordedNotifyPayload extends OrderCustomerApprovedNotifyPayload {
  tripNumber?: string | null;
  actualDelivery?: string | null;
}

export interface OrderCustomerPaymentRecordedNotifyPayload extends OrderCustomerApprovedNotifyPayload {
  paymentCash: number;
  paymentCredit: number;
  paymentAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: string;
}

export interface OrderCustomerUnscheduledNotifyPayload extends OrderCustomerApprovedNotifyPayload {
  previousScheduledDate?: string | null;
}

export interface OrderCustomerPortalShareNotifyPayload extends OrderCreatedNotifyPayload {
  customerEmail: string;
  customerContactPerson?: string | null;
  agent: OrderAgentContact;
  portalToken?: string | null;
  portalId?: string | null;
}

export interface TripDriverAssignedNotifyPayload {
  tripId: string;
  tripNumber: string;
  scheduledDate: string | null;
  vehicleName: string | null;
  driverName: string | null;
  driverEmail?: string | null;
  branchName?: string | null;
  orderCount: number;
  orderNumbers: string[];
  assignedBy: string | null;
  /** Set when the trip reserves a truck for an inter-branch request shipment. */
  interBranchRequestId?: string | null;
  ibrNumber?: string | null;
  destinationLabel?: string | null;
}

export interface TripDelayedAffectedOrderNotify {
  orderId: string;
  orderNumber: string;
  customerName: string | null;
  status: string;
  requiredDate?: string | null;
  totalAmount?: number;
  agentEmail?: string | null;
  agentName?: string | null;
}

export interface TripDelayedNotifyPayload {
  tripId: string;
  tripNumber: string;
  delayReason: string;
  reportedBy: string | null;
  vehicleName?: string | null;
  driverName?: string | null;
  branchName?: string | null;
  logisticsEmails: string[];
  affectedOrders: TripDelayedAffectedOrderNotify[];
}

export interface OrderScheduledNotifyPayload extends OrderCreatedNotifyPayload {
  scheduledBy: string | null;
  tripNumber?: string | null;
  scheduledDate?: string | null;
  vehicleName?: string | null;
  driverName?: string | null;
  branchId?: string | null;
  warehouseEmails?: string[];
  agentEmail?: string | null;
}

export interface OrderInTransitNotifyPayload extends OrderCreatedNotifyPayload {
  markedBy: string | null;
  tripNumber?: string | null;
  vehicleName?: string | null;
  driverName?: string | null;
  branchId?: string | null;
  warehouseEmails?: string[];
  agentEmail?: string | null;
}

export interface OrderDeliveryRecordedNotifyPayload extends OrderCreatedNotifyPayload {
  recordedBy: string | null;
  tripNumber?: string | null;
  actualDelivery?: string | null;
  agentEmail?: string | null;
}

export interface OrderDeliveryProofUploadedNotifyPayload extends OrderCreatedNotifyPayload {
  proofType?: 'delivery' | 'other' | 'payment';
  uploadedBy: string | null;
  proofCount: number;
  agentEmail: string;
  proofTitle?: string | null;
  proofNotes?: string | null;
  paymentCash?: number;
  paymentCredit?: number;
  amountPaid?: number;
  balanceDue?: number;
  paymentStatus?: string;
}

export interface OrderPaymentRecordedNotifyPayload extends OrderCreatedNotifyPayload {
  recordedBy: string | null;
  paymentCash: number;
  paymentCredit: number;
  paymentAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: string;
}

export interface OrderPaymentOverdueNotifyPayload extends OrderCreatedNotifyPayload {
  dueDate: string | null;
  daysOverdue: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: string;
  notifyTarget: 'executive' | 'agent';
  agentEmail?: string | null;
}

export interface OrderCustomerPaymentOverdueNotifyPayload extends OrderCustomerApprovedNotifyPayload {
  dueDate: string | null;
  daysOverdue: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: string;
}

export interface OrderCommissionPaidNotifyPayload extends OrderCreatedNotifyPayload {
  paidBy: string | null;
  agentEmail: string;
  commissionAmount: number;
  cashAmount: number;
  proofCount: number;
}

export type ProductStockAlertSeverity = 'out_of_stock' | 'critical' | 'low_stock';
export type ProductStockAlertAudience = 'executive' | 'warehouse';

/** Per-recipient payload sent to /api/notifications/product-stock-alert. */
export interface ProductStockAlertEmailRequestPayload {
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  size: string | null;
  branchName: string | null;
  severity: ProductStockAlertSeverity;
  audience: ProductStockAlertAudience;
  newStock: number;
  previousStock: number;
  reorderPoint: number;
  categorySlug?: string | null;
  triggeredBy?: string | null;
  recipientEmails?: (string | null | undefined)[];
}

export type MaterialStockAlertSeverity = 'out_of_stock' | 'critical' | 'low_stock';
export type MaterialStockAlertAudience = 'executive' | 'warehouse';

/** Per-recipient payload sent to /api/notifications/material-stock-alert. */
export interface MaterialStockAlertEmailRequestPayload {
  materialId: string;
  name: string;
  sku: string;
  unit: string | null;
  branchName: string | null;
  severity: MaterialStockAlertSeverity;
  audience: MaterialStockAlertAudience;
  newStock: number;
  previousStock: number;
  reorderPoint: number;
  primarySupplier?: string | null;
  triggeredBy?: string | null;
  recipientEmails?: (string | null | undefined)[];
}

export interface PurchaseOrderSubmittedNotifyLineItem {
  materialName: string;
  sku?: string | null;
  brand?: string | null;
  quantity: number;
  unitOfMeasure?: string | null;
  unitPrice: number;
  lineTotal: number;
}

export interface PurchaseOrderSubmittedNotifyPayload {
  purchaseOrderId: string;
  poNumber: string;
  supplierName: string | null;
  branchName: string | null;
  submittedBy: string | null;
  orderDate: string;
  expectedDeliveryDate: string | null;
  status: string;
  currency: string;
  totalAmount: number;
  notes?: string | null;
  lineCount?: number | null;
  items: PurchaseOrderSubmittedNotifyLineItem[];
}

export interface PurchaseOrderRejectedNotifyPayload extends PurchaseOrderSubmittedNotifyPayload {
  rejectedBy: string | null;
  rejectionReason?: string | null;
  submitterEmail?: string | null;
}

export interface PurchaseOrderCancelledNotifyPayload extends PurchaseOrderSubmittedNotifyPayload {
  cancelledBy: string | null;
  cancellationReason?: string | null;
  submitterEmail?: string | null;
}

export interface PurchaseOrderAcceptedNotifyPayload extends PurchaseOrderSubmittedNotifyPayload {
  acceptedBy: string | null;
  submitterEmail?: string | null;
}

export type PurchaseOrderConfirmedAudience = 'executive' | 'warehouse';

export interface PurchaseOrderConfirmedNotifyPayload extends PurchaseOrderSubmittedNotifyPayload {
  confirmedBy: string | null;
  audience: PurchaseOrderConfirmedAudience;
  recipientEmails?: (string | null | undefined)[];
}

export type PurchaseOrderReceivedAudience = 'executive' | 'warehouse';

export interface PurchaseOrderReceivedNotifyPayload extends PurchaseOrderSubmittedNotifyPayload {
  receivedBy: string | null;
  /** Cumulative qty received across all lines (sum of quantity_received). */
  quantityReceived: number;
  /** Total qty ordered across all lines (sum of quantity_ordered). */
  quantityOrdered: number;
  isFullReceive: boolean;
  audience: PurchaseOrderReceivedAudience;
  recipientEmails?: (string | null | undefined)[];
}

export interface PurchaseOrderPaymentRecordedNotifyPayload extends PurchaseOrderSubmittedNotifyPayload {
  recordedBy: string | null;
  paymentAmount: number;
  amountPaid: number;
  paymentStatus: string;
  paidInFull: boolean;
  recipientEmails?: (string | null | undefined)[];
}

export interface ProductionRequestNotifyLineItem {
  productName: string;
  variantLabel?: string | null;
  sku?: string | null;
  quantity: number;
  quantityCompleted?: number | null;
}

export interface ProductionRequestSubmittedNotifyPayload {
  productionRequestId: string;
  prNumber: string;
  branchName: string | null;
  submittedBy: string | null;
  createdBy: string | null;
  requestDate: string | null;
  expectedCompletionDate: string | null;
  status: string;
  notes?: string | null;
  totalQuantity: number;
  lineCount: number;
  items: ProductionRequestNotifyLineItem[];
  recipientEmails?: (string | null | undefined)[];
}

export interface ProductionRequestCancelledNotifyPayload extends ProductionRequestSubmittedNotifyPayload {
  cancelledBy: string | null;
  cancellationReason?: string | null;
  submitterEmail?: string | null;
}

export interface ProductionRequestAcceptedNotifyPayload extends ProductionRequestSubmittedNotifyPayload {
  acceptedBy: string | null;
  submitterEmail?: string | null;
}

export interface ProductionRequestRejectedNotifyPayload extends ProductionRequestSubmittedNotifyPayload {
  rejectedBy: string | null;
  rejectionReason?: string | null;
  submitterEmail?: string | null;
}

export interface ProductionRequestStartedNotifyPayload extends ProductionRequestSubmittedNotifyPayload {
  startedBy: string | null;
  recipientEmails?: (string | null | undefined)[];
}

export interface ProductionRequestCompletedNotifyPayload extends ProductionRequestSubmittedNotifyPayload {
  completedBy: string | null;
  producedQuantity?: number | null;
  recipientEmails?: (string | null | undefined)[];
}

export interface ProductionRequestInventoryAddedNotifyPayload extends ProductionRequestSubmittedNotifyPayload {
  recordedBy: string | null;
  addedUnits?: number | null;
  producedQuantity?: number | null;
  recipientEmails?: (string | null | undefined)[];
}
