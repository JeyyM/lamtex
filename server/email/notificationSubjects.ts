/** Recipient committee label prepended to notification email subjects. */
export type NotificationAudience = 'Executive' | 'Agent' | 'Warehouse' | 'Logistics' | 'Customer' | 'Driver';

export function notificationSubject(audience: NotificationAudience, body: string): string {
  return `[${audience}] ${body}`;
}

/** Warehouse email subject with branch name, e.g. [Warehouse - Manila] … */
export function warehouseBranchSubject(branchName: string | null | undefined, body: string): string {
  const name = branchName?.trim() || 'Branch';
  return `[Warehouse - ${name}] ${body}`;
}

/** Logistics email subject with branch name, e.g. [Logistics - Batangas] … */
export function logisticsBranchSubject(branchName: string | null | undefined, body: string): string {
  const name = branchName?.trim() || 'Branch';
  return `[Logistics - ${name}] ${body}`;
}

type OrderRef = { orderNumber: string; customerName?: string | null };

export function orderCreatedSubject(p: OrderRef): string {
  return notificationSubject('Executive', `New order ${p.orderNumber} — ${p.customerName ?? 'Customer'}`);
}

export function orderSubmittedForApprovalSubject(p: OrderRef): string {
  return notificationSubject(
    'Executive',
    `Order ${p.orderNumber} submitted for approval — ${p.customerName ?? 'Customer'}`,
  );
}

type PurchaseOrderRef = { poNumber: string; supplierName?: string | null };

export function purchaseOrderSubmittedForApprovalSubject(p: PurchaseOrderRef): string {
  return notificationSubject(
    'Executive',
    `${p.poNumber} submitted for approval — ${p.supplierName ?? 'Supplier'}`,
  );
}

export function purchaseOrderRejectedSubject(p: PurchaseOrderRef): string {
  return notificationSubject(
    'Warehouse',
    `${p.poNumber} rejected — ${p.supplierName ?? 'Supplier'}`,
  );
}

export function purchaseOrderCancelledSubject(p: PurchaseOrderRef): string {
  return notificationSubject(
    'Warehouse',
    `${p.poNumber} cancelled — ${p.supplierName ?? 'Supplier'}`,
  );
}

type ProductionRequestRef = { prNumber: string; branchName?: string | null };

export function productionRequestSubmittedForApprovalSubject(p: ProductionRequestRef): string {
  return notificationSubject(
    'Executive',
    `${p.prNumber} submitted for approval — ${p.branchName ?? 'Branch'}`,
  );
}

export function productionRequestCancelledSubject(p: ProductionRequestRef): string {
  return notificationSubject(
    'Warehouse',
    `${p.prNumber} cancelled — ${p.branchName ?? 'Branch'}`,
  );
}

export function productionRequestAcceptedSubject(p: ProductionRequestRef): string {
  return notificationSubject(
    'Warehouse',
    `${p.prNumber} accepted — ${p.branchName ?? 'Branch'}`,
  );
}

export function productionRequestRejectedSubject(p: ProductionRequestRef): string {
  return notificationSubject(
    'Warehouse',
    `${p.prNumber} rejected — ${p.branchName ?? 'Branch'}`,
  );
}

export function productionRequestStartedSubject(p: ProductionRequestRef): string {
  return notificationSubject(
    'Warehouse',
    `${p.prNumber} production started — ${p.branchName ?? 'Branch'}`,
  );
}

export function productionRequestCompletedSubject(p: ProductionRequestRef): string {
  return notificationSubject(
    'Warehouse',
    `${p.prNumber} production completed — ${p.branchName ?? 'Branch'}`,
  );
}

export function productionRequestInventoryAddedSubject(p: ProductionRequestRef): string {
  return notificationSubject(
    'Warehouse',
    `${p.prNumber} new inventory recorded — ${p.branchName ?? 'Branch'}`,
  );
}

export function purchaseOrderAcceptedSubject(p: PurchaseOrderRef): string {
  return notificationSubject(
    'Warehouse',
    `${p.poNumber} accepted — ${p.supplierName ?? 'Supplier'}`,
  );
}

export function purchaseOrderConfirmedSubject(
  p: PurchaseOrderRef,
  audience: 'executive' | 'warehouse',
): string {
  if (audience === 'warehouse') {
    return notificationSubject(
      'Warehouse',
      `${p.poNumber} confirmed — ready to receive`,
    );
  }
  return notificationSubject(
    'Executive',
    `${p.poNumber} confirmed — ${p.supplierName ?? 'Supplier'}`,
  );
}

export function purchaseOrderReceivedSubject(
  p: PurchaseOrderRef,
  audience: 'executive' | 'warehouse',
  isFull: boolean,
): string {
  const body = isFull
    ? `${p.poNumber} fully received — ${p.supplierName ?? 'Supplier'}`
    : `${p.poNumber} partial receipt — ${p.supplierName ?? 'Supplier'}`;
  return notificationSubject(audience === 'warehouse' ? 'Warehouse' : 'Executive', body);
}

export function purchaseOrderPaymentRecordedSubject(
  p: PurchaseOrderRef,
  paidInFull: boolean,
): string {
  const body = paidInFull
    ? `${p.poNumber} paid in full — ${p.supplierName ?? 'Supplier'}`
    : `Payment on ${p.poNumber} — ${p.supplierName ?? 'Supplier'}`;
  return notificationSubject('Executive', body);
}

export function orderApprovedSubject(p: OrderRef): string {
  return notificationSubject('Agent', `Order ${p.orderNumber} approved — ${p.customerName ?? 'Customer'}`);
}

export function orderRejectedSubject(p: OrderRef): string {
  return notificationSubject('Agent', `Order ${p.orderNumber} rejected — ${p.customerName ?? 'Customer'}`);
}

export function orderRevisedSubject(p: OrderRef): string {
  return notificationSubject('Executive', `Order ${p.orderNumber} revised — ${p.customerName ?? 'Customer'}`);
}

export function orderCancelledSubject(
  p: OrderRef & { tripNumber?: string | null },
  notifyTarget: 'agent' | 'executive' | 'logistics',
): string {
  const tripSuffix = p.tripNumber?.trim() ? ` (trip ${p.tripNumber.trim()})` : '';
  if (notifyTarget === 'agent') {
    return notificationSubject('Agent', `Order ${p.orderNumber} cancelled${tripSuffix} — ${p.customerName ?? 'Customer'}`);
  }
  if (notifyTarget === 'logistics') {
    return notificationSubject('Logistics', `Order ${p.orderNumber} cancelled from trip${tripSuffix}`);
  }
  return notificationSubject(
    'Executive',
    `Order ${p.orderNumber} cancelled${tripSuffix} — ${p.customerName ?? 'Customer'}`,
  );
}

export function orderLogisticsReadySubject(p: Pick<OrderRef, 'orderNumber'>): string {
  return notificationSubject('Logistics', `Order ${p.orderNumber} approved — ready to schedule`);
}

export function orderLogisticsLoadingSubject(p: Pick<OrderRef, 'orderNumber'>): string {
  return notificationSubject('Logistics', `Order ${p.orderNumber} — loading started`);
}

export function orderPackedSubject(
  p: Pick<OrderRef, 'orderNumber' | 'customerName'>,
  notifyTarget: 'logistics' | 'agent',
): string {
  if (notifyTarget === 'agent') {
    return notificationSubject(
      'Agent',
      `Order ${p.orderNumber} packed — ${p.customerName ?? 'your customer'}`,
    );
  }
  return notificationSubject('Logistics', `Order ${p.orderNumber} — packed and ready`);
}

export function orderCustomerApprovedSubject(p: Pick<OrderRef, 'orderNumber'>): string {
  return notificationSubject('Customer', `Your order ${p.orderNumber} has been approved`);
}

export function orderCustomerScheduledSubject(p: Pick<OrderRef, 'orderNumber'>): string {
  return notificationSubject('Customer', `Your order ${p.orderNumber} is scheduled for delivery`);
}

export function orderCustomerInTransitSubject(p: Pick<OrderRef, 'orderNumber'>): string {
  return notificationSubject('Customer', `Your order ${p.orderNumber} is on the way`);
}

export function orderInTransitSubject(
  p: Pick<OrderRef, 'orderNumber' | 'customerName'>,
  notifyTarget: 'executive' | 'warehouse' | 'agent',
): string {
  if (notifyTarget === 'warehouse') {
    return notificationSubject('Warehouse', `Order ${p.orderNumber} departed — in transit`);
  }
  if (notifyTarget === 'agent') {
    return notificationSubject(
      'Agent',
      `Order ${p.orderNumber} in transit — ${p.customerName ?? 'your customer'}`,
    );
  }
  return notificationSubject('Executive', `Order ${p.orderNumber} in transit — ${p.customerName ?? 'Customer'}`);
}

export function orderDeliveryRecordedSubject(
  p: Pick<OrderRef, 'orderNumber' | 'customerName'> & { status?: string | null },
  notifyTarget: 'executive' | 'agent',
): string {
  const isComplete = p.status === 'Delivered';
  if (notifyTarget === 'agent') {
    return notificationSubject(
      'Agent',
      isComplete
        ? `Order ${p.orderNumber} delivered — ${p.customerName ?? 'your customer'}`
        : `Partial delivery — order ${p.orderNumber}`,
    );
  }
  return notificationSubject(
    'Executive',
    isComplete
      ? `Order ${p.orderNumber} delivered — ${p.customerName ?? 'Customer'}`
      : `Partial delivery — order ${p.orderNumber}`,
  );
}

export function orderCustomerDeliveryRecordedSubject(
  p: Pick<OrderRef, 'orderNumber'> & { status?: string | null },
): string {
  if (p.status === 'Delivered') {
    return notificationSubject('Customer', `Your order ${p.orderNumber} has been delivered`);
  }
  return notificationSubject('Customer', `Update on your order ${p.orderNumber} delivery`);
}

export function orderCustomerPaymentRecordedSubject(
  p: Pick<OrderRef, 'orderNumber'> & { paymentAmount?: number; balanceDue?: number; paymentStatus?: string | null },
): string {
  const isPaid = (p.balanceDue ?? 1) <= 0.01 || p.paymentStatus === 'Paid';
  if (isPaid) {
    return notificationSubject('Customer', `Payment received — order ${p.orderNumber} paid in full`);
  }
  const amt =
    p.paymentAmount != null && p.paymentAmount > 0
      ? ` — ₱${p.paymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : '';
  return notificationSubject('Customer', `Payment received on order ${p.orderNumber}${amt}`);
}

export function orderCustomerUnscheduledSubject(p: Pick<OrderRef, 'orderNumber'>): string {
  return notificationSubject('Customer', `Update on your order ${p.orderNumber} delivery schedule`);
}

export function orderCustomerPortalShareSubject(p: Pick<OrderRef, 'orderNumber'>): string {
  return notificationSubject('Customer', `View your order ${p.orderNumber} online`);
}

export function orderDeliveryProofUploadedAgentSubject(p: Pick<OrderRef, 'orderNumber' | 'customerName'>): string {
  return notificationSubject(
    'Agent',
    `Delivery proof uploaded — order ${p.orderNumber} (${p.customerName ?? 'Customer'})`,
  );
}

export function orderOtherProofUploadedAgentSubject(p: Pick<OrderRef, 'orderNumber' | 'customerName'>): string {
  return notificationSubject(
    'Agent',
    `Other document uploaded — order ${p.orderNumber} (${p.customerName ?? 'Customer'})`,
  );
}

export function orderPaymentProofUploadedAgentSubject(
  p: Pick<OrderRef, 'orderNumber' | 'customerName'> & {
    balanceDue?: number;
    paymentStatus?: string | null;
    paymentCash?: number;
    paymentCredit?: number;
  },
): string {
  const paymentTotal = (p.paymentCash ?? 0) + (p.paymentCredit ?? 0);
  const paidInFull =
    paymentTotal > 0 &&
    p.balanceDue != null &&
    (p.balanceDue <= 0.01 || p.paymentStatus === 'Paid');
  if (paidInFull) {
    return notificationSubject(
      'Agent',
      `Order paid in full — ${p.orderNumber} (${p.customerName ?? 'Customer'})`,
    );
  }
  return notificationSubject(
    'Agent',
    `Payment proof uploaded — order ${p.orderNumber} (${p.customerName ?? 'Customer'})`,
  );
}

export function orderPaymentRecordedExecutiveSubject(
  p: Pick<OrderRef, 'orderNumber' | 'customerName'> & {
    paymentAmount?: number;
    balanceDue?: number;
    paymentStatus?: string | null;
  },
): string {
  const paidInFull =
    p.balanceDue != null && (p.balanceDue <= 0.01 || p.paymentStatus === 'Paid');
  if (paidInFull) {
    return notificationSubject(
      'Executive',
      `Order paid in full — ${p.orderNumber} (${p.customerName ?? 'Customer'})`,
    );
  }
  const amt =
    p.paymentAmount != null && p.paymentAmount > 0
      ? ` — ₱${p.paymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : '';
  return notificationSubject(
    'Executive',
    `Payment received on order ${p.orderNumber} (${p.customerName ?? 'Customer'})${amt}`,
  );
}

export function orderPaymentOverdueSubject(
  p: Pick<OrderRef, 'orderNumber' | 'customerName'> & { daysOverdue?: number; balanceDue?: number },
  target: 'executive' | 'agent',
): string {
  const days = p.daysOverdue != null && p.daysOverdue > 0 ? ` — ${p.daysOverdue}d overdue` : '';
  const role = target === 'agent' ? 'Agent' : 'Executive';
  return notificationSubject(
    role,
    `Payment overdue — order ${p.orderNumber} (${p.customerName ?? 'Customer'})${days}`,
  );
}

export function orderCustomerPaymentOverdueSubject(
  p: Pick<OrderRef, 'orderNumber'> & { daysOverdue?: number },
): string {
  const days = p.daysOverdue != null && p.daysOverdue > 0 ? ` — ${p.daysOverdue} day(s) past due` : '';
  return notificationSubject('Customer', `Payment reminder — order ${p.orderNumber}${days}`);
}

export function orderCommissionPaidAgentSubject(
  p: Pick<OrderRef, 'orderNumber' | 'customerName'> & { commissionAmount?: number; proofCount?: number },
): string {
  const isBulk = (p.proofCount ?? 1) > 1;
  const amt =
    p.commissionAmount != null && p.commissionAmount > 0
      ? ` — ₱${p.commissionAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : '';
  return notificationSubject(
    'Agent',
    isBulk
      ? `Commissions paid out — order ${p.orderNumber}${amt}`
      : `Commission paid out — order ${p.orderNumber} (${p.customerName ?? 'Customer'})${amt}`,
  );
}

export function tripDriverAssignedSubject(p: {
  tripNumber: string;
  scheduledDate?: string | null;
  ibrNumber?: string | null;
  interBranchRequestId?: string | null;
}): string {
  const datePart = p.scheduledDate?.trim() ? ` — ${p.scheduledDate.trim()}` : '';
  if (p.ibrNumber?.trim() || p.interBranchRequestId) {
    const ref = p.ibrNumber?.trim() || p.tripNumber;
    return notificationSubject('Driver', `Inter-branch ${ref} assigned to you${datePart}`);
  }
  return notificationSubject('Driver', `Trip ${p.tripNumber} assigned to you${datePart}`);
}

export function tripDriverUnassignedSubject(p: {
  tripNumber: string;
  scheduledDate?: string | null;
  newDriverName?: string | null;
}): string {
  const datePart = p.scheduledDate?.trim() ? ` — ${p.scheduledDate.trim()}` : '';
  if (p.newDriverName?.trim()) {
    return notificationSubject('Driver', `Trip ${p.tripNumber} reassigned${datePart}`);
  }
  return notificationSubject('Driver', `Trip ${p.tripNumber} assignment removed${datePart}`);
}

export function productStockAlertSubject(p: {
  sku: string;
  productName: string;
  size?: string | null;
  branchName?: string | null;
  severity: 'out_of_stock' | 'critical' | 'low_stock';
  audience: 'executive' | 'warehouse';
}): string {
  const audience: NotificationAudience = p.audience === 'warehouse' ? 'Warehouse' : 'Executive';
  const variant = p.size?.trim() ? `${p.productName}, ${p.size.trim()}` : p.productName;
  const branchSuffix = p.branchName?.trim() ? ` — ${p.branchName.trim()}` : '';
  if (p.severity === 'out_of_stock') {
    return notificationSubject(audience, `Out of stock — ${p.sku} (${variant})${branchSuffix}`);
  }
  if (p.severity === 'critical') {
    return notificationSubject(audience, `Critical stock — ${p.sku} (${variant})${branchSuffix}`);
  }
  return notificationSubject(audience, `Low stock — ${p.sku} (${variant})${branchSuffix}`);
}

export function materialStockAlertSubject(p: {
  sku: string;
  name: string;
  branchName?: string | null;
  severity: 'out_of_stock' | 'critical' | 'low_stock';
  audience: 'executive' | 'warehouse';
}): string {
  const audience: NotificationAudience = p.audience === 'warehouse' ? 'Warehouse' : 'Executive';
  const branchSuffix = p.branchName?.trim() ? ` — ${p.branchName.trim()}` : '';
  if (p.severity === 'out_of_stock') {
    return notificationSubject(audience, `Material out of stock — ${p.sku} (${p.name})${branchSuffix}`);
  }
  if (p.severity === 'critical') {
    return notificationSubject(audience, `Material critical stock — ${p.sku} (${p.name})${branchSuffix}`);
  }
  return notificationSubject(audience, `Material low stock — ${p.sku} (${p.name})${branchSuffix}`);
}

type InterBranchRef = {
  ibrNumber: string;
  requestingBranchName?: string | null;
  fulfillingBranchName?: string | null;
};

export function interBranchSubmittedForApprovalSubject(p: InterBranchRef): string {
  return notificationSubject(
    'Executive',
    `${p.ibrNumber} submitted for approval — ${p.requestingBranchName ?? 'Branch'} → ${p.fulfillingBranchName ?? 'Branch'}`,
  );
}

export function interBranchApprovedSubject(p: InterBranchRef, branchName?: string | null): string {
  return warehouseBranchSubject(
    branchName ?? p.requestingBranchName,
    `${p.ibrNumber} approved — ${p.requestingBranchName ?? 'Branch'} → ${p.fulfillingBranchName ?? 'Branch'}`,
  );
}

export function interBranchLogisticsSubject(
  p: InterBranchRef & { status: string; vehicleName?: string | null; driverName?: string | null },
  branchName?: string | null,
): string {
  const statusLabel = p.status.trim() || 'updated';
  const truckBit = p.vehicleName?.trim() ? ` · ${p.vehicleName.trim()}` : '';
  const driverBit =
    p.driverName?.trim() && p.driverName.trim() !== '—' ? ` · ${p.driverName.trim()}` : '';
  return warehouseBranchSubject(
    branchName ?? p.requestingBranchName,
    `${p.ibrNumber} ${statusLabel.toLowerCase()} — from ${p.fulfillingBranchName ?? 'Branch'}${truckBit}${driverBit}`,
  );
}

export function interBranchDeliveryRecordedSubject(p: InterBranchRef & { status: string }, branchName?: string | null): string {
  return warehouseBranchSubject(
    branchName,
    `${p.ibrNumber} delivery recorded — ${p.status}`,
  );
}

export function interBranchFulfilledSubject(p: InterBranchRef, audience: 'executive' | 'warehouse', branchName?: string | null): string {
  const body = `${p.ibrNumber} fulfilled and closed — ${p.requestingBranchName ?? 'Branch'} ↔ ${p.fulfillingBranchName ?? 'Branch'}`;
  if (audience === 'executive') {
    return notificationSubject('Executive', body);
  }
  return warehouseBranchSubject(branchName, body);
}

export function interBranchCancelledSubject(p: InterBranchRef, branchName?: string | null): string {
  return warehouseBranchSubject(
    branchName,
    `${p.ibrNumber} cancelled — ${p.requestingBranchName ?? 'Branch'} → ${p.fulfillingBranchName ?? 'Branch'}`,
  );
}

export function interBranchRejectedSubject(p: InterBranchRef, branchName?: string | null): string {
  return warehouseBranchSubject(
    branchName ?? p.requestingBranchName,
    `${p.ibrNumber} rejected — ${p.requestingBranchName ?? 'Branch'} → ${p.fulfillingBranchName ?? 'Branch'}`,
  );
}

export function orderScheduledSubject(
  p: OrderRef,
  notifyTarget: 'executive' | 'warehouse' | 'agent',
): string {
  if (notifyTarget === 'warehouse') {
    return notificationSubject('Warehouse', `Order ${p.orderNumber} scheduled — prepare for loading`);
  }
  if (notifyTarget === 'agent') {
    return notificationSubject(
      'Agent',
      `Order ${p.orderNumber} scheduled for ${p.customerName ?? 'your customer'}`,
    );
  }
  return notificationSubject('Executive', `Order ${p.orderNumber} scheduled — ${p.customerName ?? 'Customer'}`);
}

export function orderUnscheduledFromTripSubject(
  p: OrderRef & { tripNumber?: string | null },
  notifyTarget: 'executive' | 'warehouse' | 'agent',
): string {
  const tripSuffix = p.tripNumber?.trim() ? ` — trip ${p.tripNumber.trim()} cancelled` : ' — trip cancelled';
  if (notifyTarget === 'warehouse') {
    return notificationSubject('Warehouse', `Order ${p.orderNumber} unscheduled${tripSuffix}`);
  }
  if (notifyTarget === 'agent') {
    return notificationSubject('Agent', `Order ${p.orderNumber} unscheduled for ${p.customerName ?? 'your customer'}`);
  }
  return notificationSubject('Executive', `Order ${p.orderNumber} unscheduled${tripSuffix}`);
}

export function tripCancelledSubject(p: {
  tripNumber: string;
  scheduledDate?: string | null;
  notifyTarget?: 'logistics' | 'driver';
}): string {
  const datePart = p.scheduledDate?.trim() ? ` — ${p.scheduledDate.trim()}` : '';
  if (p.notifyTarget === 'driver') {
    return notificationSubject('Driver', `Trip ${p.tripNumber} cancelled${datePart}`);
  }
  return notificationSubject('Logistics', `Trip ${p.tripNumber} cancelled${datePart}`);
}
