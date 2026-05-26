import type { OrderCreatedEmailPayload } from './orderCreatedEmail';
import type { OrderDecisionEmailPayload } from './orderDecisionEmail';
import type { OrderRevisedEmailPayload } from './orderRevisedEmail';
import type { OrderCancelledEmailPayload } from './orderCancelledEmail';
import type { OrderLogisticsReadyEmailPayload } from './orderLogisticsReadyEmail';
import type { OrderLogisticsLoadingEmailPayload } from './orderLogisticsLoadingEmail';
import type { OrderPackedEmailPayload } from './orderPackedEmail';
import type { OrderInTransitEmailPayload } from './orderInTransitEmail';
import type { OrderCustomerInTransitEmailPayload } from './orderCustomerInTransitEmail';
import type { OrderDeliveryRecordedEmailPayload } from './orderDeliveryRecordedEmail';
import type { OrderCustomerDeliveryRecordedEmailPayload } from './orderCustomerDeliveryRecordedEmail';
import type { OrderCustomerApprovedEmailPayload } from './orderCustomerApprovedEmail';
import type { OrderCustomerScheduledEmailPayload } from './orderCustomerScheduledEmail';
import type { OrderCustomerUnscheduledEmailPayload } from './orderCustomerUnscheduledEmail';
import type { OrderCustomerPortalShareEmailPayload } from './orderCustomerPortalShareEmail';
import type { OrderScheduledEmailPayload } from './orderScheduledEmail';
import type { TripDriverAssignedEmailPayload } from './tripDriverAssignedEmail';
import type { OrderDeliveryProofUploadedEmailPayload } from './orderDeliveryProofUploadedEmail';
import type { OrderPaymentRecordedEmailPayload } from './orderPaymentRecordedEmail';
import type { OrderCustomerPaymentRecordedEmailPayload } from './orderCustomerPaymentRecordedEmail';
import type { OrderCommissionPaidAgentEmailPayload } from './orderCommissionPaidAgentEmail';
import type {
  ProductStockAlertEmailPayload,
  ProductStockAlertSeverity,
  ProductStockAlertAudience,
} from './productStockAlertEmail';
import type {
  MaterialStockAlertEmailPayload,
  MaterialStockAlertSeverity,
  MaterialStockAlertAudience,
} from './materialStockAlertEmail';

/** Rich mock order used by the Email Testing page and template previews. */
export function sampleOrderEmailPayload(
  kind: 'created' | 'submitted_for_approval',
): OrderCreatedEmailPayload {
  const subtotal = 12300;
  const discountAmount = 625;
  const totalAmount = subtotal - discountAmount;

  return {
    orderId: '00000000-0000-4000-8000-000000000001',
    orderNumber: '2026-05-25-000042',
    customerName: 'EDSA Plumbing Supply Hardware 5098',
    agentName: 'Ana Reyes',
    branchName: 'Manila',
    orderDate: new Date().toISOString().split('T')[0],
    requiredDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    deliveryAddress: 'Unit 4B, EDSA Corner Shaw Blvd, Mandaluyong, Metro Manila',
    urgency: 'High',
    status: kind === 'submitted_for_approval' ? 'Pending' : 'Draft',
    deliveryType: 'Truck',
    paymentTerms: '30 days',
    paymentMethod: 'Offline',
    discountPercent: 5,
    discountAmount,
    subtotal,
    totalAmount,
    lineCount: 2,
    orderNotes: 'Customer requested morning delivery. Call before dispatch.',
    kind,
    items: [
      {
        productName: 'M_HDPE Fittings Premium',
        variantDescription: 'Elbow 90° · 2"',
        quantity: 10,
        unitPrice: 850,
        lineTotal: 8500,
        discountPercent: 0,
      },
      {
        productName: 'M_HDPE Fittings Standard',
        variantDescription: 'Coupling · 2"',
        quantity: 20,
        unitPrice: 200,
        lineTotal: 3800,
        discountPercent: 5,
      },
    ],
  };
}

/** Mock payload for agent approved/rejected response emails. */
export function sampleOrderDecisionPayload(
  decision: 'approved' | 'rejected',
): OrderDecisionEmailPayload {
  const base = sampleOrderEmailPayload('submitted_for_approval');
  return {
    ...base,
    status: decision === 'approved' ? 'Approved' : 'Rejected',
    decision,
    decidedBy: 'Maria Santos (Executive)',
    rejectionReason: decision === 'rejected' ? 'Discount exceeds branch policy — please revise pricing and resubmit.' : null,
    agentEmail: null,
  };
}

/** Mock payload for revised order resubmission email (executives). */
export function sampleOrderRevisedPayload(): OrderRevisedEmailPayload {
  const base = sampleOrderEmailPayload('submitted_for_approval');
  return {
    ...base,
    status: 'Pending',
    previousRejectionReason: 'Discount exceeds branch policy — please revise pricing and resubmit.',
  };
}

/** Mock payload for logistics ready-to-schedule email. */
export function sampleOrderLogisticsReadyPayload(): OrderLogisticsReadyEmailPayload {
  const base = sampleOrderEmailPayload('submitted_for_approval');
  return {
    ...base,
    status: 'Approved',
    approvedBy: 'Maria Santos (Executive)',
    logisticsEmails: ['miguel.santos.manila@lamtex.com'],
  };
}

/** Mock payload for logistics order-loading email. */
export function sampleOrderLogisticsLoadingPayload(): OrderLogisticsLoadingEmailPayload {
  const base = sampleOrderEmailPayload('submitted_for_approval');
  return {
    ...base,
    status: 'Loading',
    markedBy: 'Jose Ramos (Warehouse)',
    logisticsEmails: ['miguel.santos.manila@lamtex.com'],
  };
}

/** Mock payload for order-packed email (logistics or agent audience). */
export function sampleOrderPackedPayload(
  notifyTarget: 'logistics' | 'agent',
): OrderPackedEmailPayload {
  const base = sampleOrderEmailPayload('submitted_for_approval');
  return {
    ...base,
    status: 'Packed',
    markedBy: 'Jose Ramos (Warehouse)',
    notifyTarget,
    logisticsEmails: ['miguel.santos.manila@lamtex.com'],
    agentEmail: 'ana.reyes@lamtex.com',
  };
}

/** Mock payload for order in-transit email (executive, warehouse, or agent audience). */
export function sampleOrderInTransitPayload(
  notifyTarget: 'executive' | 'warehouse' | 'agent',
): OrderInTransitEmailPayload {
  const base = sampleOrderEmailPayload('submitted_for_approval');
  return {
    ...base,
    status: 'In Transit',
    markedBy: 'Miguel Santos (Logistics)',
    tripNumber: 'TRIP-20260525-A1B2',
    vehicleName: 'Truck 12 — Hino 500',
    driverName: 'Pedro Cruz',
    notifyTarget,
    warehouseEmails: ['jose.ramos@lamtex.com'],
    agentEmail: 'ana.reyes@lamtex.com',
  };
}

/** Mock payload for customer order in-transit email. */
export function sampleOrderCustomerInTransitPayload(): OrderCustomerInTransitEmailPayload {
  const base = sampleOrderCustomerApprovedPayload();
  return {
    ...base,
    status: 'In Transit',
    tripNumber: 'TRIP-20260525-A1B2',
    vehicleName: 'Truck 12 — Hino 500',
    driverName: 'Pedro Cruz',
  };
}

/** Mock payload for delivery-recorded email (executive or agent audience). */
export function sampleOrderDeliveryRecordedPayload(
  notifyTarget: 'executive' | 'agent',
): OrderDeliveryRecordedEmailPayload {
  const base = sampleOrderEmailPayload('submitted_for_approval');
  return {
    ...base,
    status: 'Delivered',
    recordedBy: 'Pedro Cruz (Driver)',
    tripNumber: 'TRIP-20260525-A1B2',
    actualDelivery: new Date().toISOString().split('T')[0],
    notifyTarget,
    agentEmail: 'ana.reyes@lamtex.com',
  };
}

/** Mock payload for customer delivery-recorded email. */
export function sampleOrderCustomerDeliveryRecordedPayload(): OrderCustomerDeliveryRecordedEmailPayload {
  const base = sampleOrderCustomerApprovedPayload();
  return {
    ...base,
    status: 'Delivered',
    tripNumber: 'TRIP-20260525-A1B2',
    actualDelivery: new Date().toISOString().split('T')[0],
  };
}

/** Mock payload for customer order-approved email. */
export function sampleOrderCustomerApprovedPayload(): OrderCustomerApprovedEmailPayload {
  const base = sampleOrderEmailPayload('submitted_for_approval');
  return {
    ...base,
    status: 'Approved',
    customerEmail: 'customer@example.com',
    customerContactPerson: 'Juan Dela Cruz',
    approvedBy: 'Maria Santos (Executive)',
    agent: {
      name: 'Ana Reyes',
      phone: '+63 917 123 4567',
      email: 'ana.reyes@lamtex.com',
    },
    portalToken: 'ORD-2026-TESTPORT',
  };
}

/** Mock payload for customer order-scheduled email. */
export function sampleOrderCustomerScheduledPayload(): OrderCustomerScheduledEmailPayload {
  const base = sampleOrderCustomerApprovedPayload();
  return {
    ...base,
    status: 'Scheduled',
    scheduledDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    tripNumber: 'TRIP-20260525-A1B2',
  };
}

/** Mock payload for customer order-unscheduled email. */
export function sampleOrderCustomerUnscheduledPayload(): OrderCustomerUnscheduledEmailPayload {
  const base = sampleOrderCustomerApprovedPayload();
  return {
    ...base,
    status: 'Approved',
    previousScheduledDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
  };
}

/** Mock payload for manually shared customer order portal link. */
export function sampleOrderCustomerPortalSharePayload(): OrderCustomerPortalShareEmailPayload {
  const base = sampleOrderCustomerApprovedPayload();
  return {
    orderId: base.orderId,
    orderNumber: base.orderNumber,
    customerName: base.customerName,
    agentName: base.agentName,
    branchName: base.branchName,
    orderDate: base.orderDate,
    requiredDate: base.requiredDate,
    deliveryAddress: base.deliveryAddress,
    urgency: base.urgency,
    status: base.status,
    subtotal: base.subtotal,
    totalAmount: base.totalAmount,
    items: base.items,
    deliveryType: base.deliveryType,
    paymentTerms: base.paymentTerms,
    paymentMethod: base.paymentMethod,
    discountPercent: base.discountPercent,
    discountAmount: base.discountAmount,
    orderNotes: base.orderNotes,
    lineCount: base.lineCount,
    customerEmail: base.customerEmail,
    customerContactPerson: base.customerContactPerson,
    agent: base.agent,
    portalToken: base.portalToken,
  };
}

/** Mock payload for order scheduled emails. */
export function sampleOrderScheduledPayload(
  notifyTarget: 'executive' | 'warehouse' | 'agent',
): OrderScheduledEmailPayload {
  const base = sampleOrderEmailPayload('submitted_for_approval');
  return {
    ...base,
    status: 'Scheduled',
    scheduledBy: 'Miguel Santos (Logistics)',
    tripNumber: 'TRIP-20260525-A1B2',
    scheduledDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    vehicleName: 'Truck 12 — MNL-4521',
    driverName: 'Ricardo Cruz',
    notifyTarget,
    warehouseEmails: notifyTarget === 'warehouse' ? ['jose.ramos.manila@lamtex.com'] : undefined,
    agentEmail: notifyTarget === 'agent' ? 'ana.reyes@lamtex.com' : null,
  };
}

/** Mock payload for driver trip-assigned email. */
export function sampleTripDriverAssignedPayload(): TripDriverAssignedEmailPayload {
  return {
    tripId: '00000000-0000-4000-8000-000000000010',
    tripNumber: 'TRIP-20260525-A1B2',
    scheduledDate: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    vehicleName: 'Truck 12 — MNL-4521',
    driverName: 'Ricardo Cruz',
    driverEmail: 'danilo.ramos.drv.manila@lamtex.com',
    branchName: 'Manila',
    orderCount: 3,
    orderNumbers: ['2026-05-25-000042', '2026-05-25-000043', '2026-05-25-000044'],
    assignedBy: 'Miguel Santos (Logistics)',
  };
}

/** Mock payload for order cancellation emails. */
export function sampleOrderCancelledPayload(
  notifyTarget: 'agent' | 'executive',
): OrderCancelledEmailPayload {
  const base = sampleOrderEmailPayload('submitted_for_approval');
  return {
    ...base,
    status: 'Cancelled',
    cancelledBy: notifyTarget === 'agent' ? 'Maria Santos (Executive)' : 'Ana Reyes',
    cancelledByRole: notifyTarget === 'agent' ? 'executive' : 'agent',
    cancellationReason: 'Customer requested to hold the order indefinitely.',
    additionalNotes: 'Agent confirmed via phone call.',
    notifyTarget,
    agentEmail: null,
  };
}

/** Mock payload for agent payment proof uploaded email. */
export function sampleOrderPaymentProofUploadedPayload(): OrderDeliveryProofUploadedEmailPayload {
  const base = sampleOrderEmailPayload('submitted_for_approval');
  return {
    ...base,
    proofType: 'payment',
    uploadedBy: 'Miguel Santos (Logistics)',
    proofCount: 1,
    agentEmail: 'ana.reyes@lamtex.com',
    proofTitle: 'Bank transfer receipt',
    proofNotes: 'BDO online transfer ref #88291034',
    paymentCash: 25000,
    paymentCredit: 0,
  };
}

/** Mock payload for executive payment recorded email (partial). */
export function sampleOrderPaymentRecordedPayload(): OrderPaymentRecordedEmailPayload {
  const base = sampleOrderEmailPayload('submitted_for_approval');
  return {
    ...base,
    recordedBy: 'Miguel Santos (Logistics)',
    paymentCash: 25000,
    paymentCredit: 0,
    paymentAmount: 25000,
    amountPaid: 25000,
    balanceDue: base.totalAmount - 25000,
    paymentStatus: 'Partially Paid',
  };
}

/** Mock payload for executive payment recorded email (paid in full). */
export function sampleOrderPaymentRecordedPaidInFullPayload(): OrderPaymentRecordedEmailPayload {
  const base = sampleOrderEmailPayload('submitted_for_approval');
  return {
    ...base,
    recordedBy: 'Miguel Santos (Logistics)',
    paymentCash: base.totalAmount - 25000,
    paymentCredit: 0,
    paymentAmount: base.totalAmount - 25000,
    amountPaid: base.totalAmount,
    balanceDue: 0,
    paymentStatus: 'Paid',
  };
}

/** Mock payload for customer payment recorded email (partial). */
export function sampleOrderCustomerPaymentRecordedPayload(): OrderCustomerPaymentRecordedEmailPayload {
  const base = sampleOrderEmailPayload('submitted_for_approval');
  return {
    ...base,
    customerEmail: 'customer@example.com',
    customerContactPerson: 'Juan Dela Cruz',
    agent: {
      name: 'Ana Reyes',
      phone: '+63 917 123 4567',
      email: 'ana.reyes@lamtex.com',
    },
    portalToken: 'sample-portal-token-for-email-preview',
    paymentCash: 25000,
    paymentCredit: 0,
    paymentAmount: 25000,
    amountPaid: 25000,
    balanceDue: base.totalAmount - 25000,
    paymentStatus: 'Partially Paid',
  };
}

/** Mock payload for customer payment recorded email (paid in full). */
export function sampleOrderCustomerPaymentRecordedPaidInFullPayload(): OrderCustomerPaymentRecordedEmailPayload {
  const base = sampleOrderEmailPayload('submitted_for_approval');
  return {
    ...base,
    customerEmail: 'customer@example.com',
    customerContactPerson: 'Juan Dela Cruz',
    agent: {
      name: 'Ana Reyes',
      phone: '+63 917 123 4567',
      email: 'ana.reyes@lamtex.com',
    },
    portalToken: 'sample-portal-token-for-email-preview',
    paymentCash: base.totalAmount,
    paymentCredit: 0,
    paymentAmount: base.totalAmount,
    amountPaid: base.totalAmount,
    balanceDue: 0,
    paymentStatus: 'Paid',
  };
}

/** Mock payload for agent payment proof email (paid in full). */
export function sampleOrderPaymentProofUploadedPaidInFullPayload(): OrderDeliveryProofUploadedEmailPayload {
  const base = sampleOrderEmailPayload('submitted_for_approval');
  return {
    ...base,
    proofType: 'payment',
    uploadedBy: 'Miguel Santos (Logistics)',
    proofCount: 1,
    agentEmail: 'ana.reyes@lamtex.com',
    proofTitle: 'Final bank transfer receipt',
    proofNotes: 'Closing payment — BDO ref #88291099',
    paymentCash: base.totalAmount,
    paymentCredit: 0,
    amountPaid: base.totalAmount,
    balanceDue: 0,
    paymentStatus: 'Paid',
  };
}

/** Mock payload for agent commission paid out email. */
export function sampleOrderCommissionPaidAgentPayload(): OrderCommissionPaidAgentEmailPayload {
  const base = sampleOrderEmailPayload('submitted_for_approval');
  return {
    ...base,
    paidBy: 'Miguel Santos (Executive)',
    agentEmail: 'ana.reyes@lamtex.com',
    commissionAmount: 687,
    cashAmount: 137400,
    proofCount: 1,
    paymentStatus: 'Partially Paid',
  };
}

/** Mock payload for the raw material stock alert email preview. */
export function sampleMaterialStockAlertPayload(
  severity: MaterialStockAlertSeverity,
  audience: MaterialStockAlertAudience,
): MaterialStockAlertEmailPayload {
  const stockBySeverity: Record<MaterialStockAlertSeverity, number> = {
    out_of_stock: 0,
    critical: 35,
    low_stock: 180,
  };
  const previousStockBySeverity: Record<MaterialStockAlertSeverity, number> = {
    out_of_stock: 60,
    critical: 120,
    low_stock: 320,
  };
  return {
    materialId: '00000000-0000-4000-8000-0000000000ba',
    name: 'HDPE Resin Black',
    sku: 'RM-HDPE-B-PE100',
    unit: 'kg',
    branchName: 'Manila',
    severity,
    audience,
    newStock: stockBySeverity[severity],
    previousStock: previousStockBySeverity[severity],
    reorderPoint: 250,
    primarySupplier: 'Pacific Plastics Inc.',
    triggeredBy: 'BOM consumption — production request PR-2026-000041',
  };
}

/** Mock payload for the product stock alert email preview. */
export function sampleProductStockAlertPayload(
  severity: ProductStockAlertSeverity,
  audience: ProductStockAlertAudience,
): ProductStockAlertEmailPayload {
  const stockBySeverity: Record<ProductStockAlertSeverity, number> = {
    out_of_stock: 0,
    critical: 40,
    low_stock: 110,
  };
  const previousStockBySeverity: Record<ProductStockAlertSeverity, number> = {
    out_of_stock: 120,
    critical: 230,
    low_stock: 230,
  };
  return {
    variantId: '00000000-0000-4000-8000-0000000000aa',
    productId: '00000000-0000-4000-8000-0000000000ab',
    categorySlug: 'm-hdpe-pipes',
    productName: 'M_HDPE Pipes Premium',
    sku: 'MANMHD204',
    size: '75mm',
    branchName: 'Manila',
    severity,
    audience,
    newStock: stockBySeverity[severity],
    previousStock: previousStockBySeverity[severity],
    reorderPoint: 180,
    triggeredBy: 'Stock adjustment by ana.reyes@lamtex.com',
  };
}
