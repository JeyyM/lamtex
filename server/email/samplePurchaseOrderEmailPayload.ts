import type { PurchaseOrderSubmittedEmailPayload } from './purchaseOrderApprovalEmail';
import type { PurchaseOrderRejectedEmailPayload } from './purchaseOrderRejectedEmail';
import type { PurchaseOrderCancelledEmailPayload } from './purchaseOrderCancelledEmail';
import type { PurchaseOrderAcceptedEmailPayload } from './purchaseOrderAcceptedEmail';
import type { PurchaseOrderConfirmedEmailPayload } from './purchaseOrderConfirmedEmail';

export function samplePurchaseOrderSubmittedPayload(): PurchaseOrderSubmittedEmailPayload {
  return {
    purchaseOrderId: '00000000-0000-4000-8000-000000000001',
    poNumber: 'PO-1779793621011',
    supplierName: 'Calabarzon Specialty Chemicals',
    branchName: 'Manila',
    submittedBy: 'Jose Ramos',
    orderDate: '2026-05-26',
    expectedDeliveryDate: '2026-05-28',
    status: 'Requested',
    currency: 'PHP',
    totalAmount: 18500,
    notes: 'Rush delivery requested for production run.',
    lineCount: 1,
    items: [
      {
        materialName: 'Baerlocher',
        sku: 'Z-210',
        brand: 'Baerlocher',
        quantity: 100,
        unitOfMeasure: 'kg',
        unitPrice: 185,
        lineTotal: 18500,
      },
    ],
  };
}

export function samplePurchaseOrderRejectedPayload(): PurchaseOrderRejectedEmailPayload {
  return {
    ...samplePurchaseOrderSubmittedPayload(),
    status: 'Rejected',
    rejectedBy: 'Executive User',
    rejectionReason: 'Budget cap exceeded for this quarter.',
    submitterEmail: 'warehouse@example.com',
  };
}

export function samplePurchaseOrderCancelledPayload(): PurchaseOrderCancelledEmailPayload {
  return {
    ...samplePurchaseOrderSubmittedPayload(),
    status: 'Cancelled',
    cancelledBy: 'Executive User',
    cancellationReason: 'Supplier no longer available for this branch.',
    submitterEmail: 'warehouse@example.com',
  };
}

export function samplePurchaseOrderAcceptedPayload(): PurchaseOrderAcceptedEmailPayload {
  return {
    ...samplePurchaseOrderSubmittedPayload(),
    status: 'Accepted',
    acceptedBy: 'Executive User',
    submitterEmail: 'warehouse@example.com',
  };
}

export function samplePurchaseOrderConfirmedPayload(
  audience: 'executive' | 'warehouse',
): PurchaseOrderConfirmedEmailPayload {
  return {
    ...samplePurchaseOrderSubmittedPayload(),
    status: 'Confirmed',
    confirmedBy: 'Executive Admin (Executive)',
    audience,
    recipientEmails: audience === 'warehouse' ? ['warehouse@example.com'] : ['executive@example.com'],
  };
}
