import { formatDistanceToNow } from 'date-fns';
import { computeProofCommissionForClientType, computeDueDateFromDelivery, formatDateOnlyLocal } from '@/src/lib/financeData';
import { notifyFetch } from '@/src/lib/notifyApi';
import { ensureOrderCustomerPortal, recordOrderPortalEmailSent } from '@/src/lib/orderCustomerPortal';
import { supabase } from '@/src/lib/supabase';
import type { OrderDetail } from '@/src/types/orders';
import type {
  AppNotification,
  NotificationCategory,
  OrderAgentContact,
  OrderCancelledNotifyPayload,
  OrderCancelledFromTripNotifyPayload,
  OrderCustomerCancelledNotifyPayload,
  OrderCreatedNotifyPayload,
  OrderCustomerApprovedNotifyPayload,
  OrderCustomerScheduledNotifyPayload,
  OrderCustomerInTransitNotifyPayload,
  OrderCustomerDeliveryRecordedNotifyPayload,
  OrderCustomerPaymentRecordedNotifyPayload,
  OrderCustomerUnscheduledNotifyPayload,
  OrderCustomerTripCancelledNotifyPayload,
  OrderCustomerPortalShareNotifyPayload,
  OrderDecisionNotifyPayload,
  OrderLogisticsReadyNotifyPayload,
  OrderLogisticsLoadingNotifyPayload,
  OrderPackedNotifyPayload,
  OrderInTransitNotifyPayload,
  OrderDeliveryRecordedNotifyPayload,
  OrderDeliveryProofUploadedNotifyPayload,
  OrderPaymentRecordedNotifyPayload,
  OrderPaymentOverdueNotifyPayload,
  OrderCustomerPaymentOverdueNotifyPayload,
  OrderCommissionPaidNotifyPayload,
  OrderRevisedNotifyPayload,
  OrderScheduledNotifyPayload,
  OrderUnscheduledFromTripNotifyPayload,
  TripCancelledNotifyPayload,
  TripDriverAssignedNotifyPayload,
  TripDriverUnassignedNotifyPayload,
  TripDelayedNotifyPayload,
  TripDelayedAffectedOrderNotify,
  ProductStockAlertEmailRequestPayload,
  ProductStockAlertSeverity,
  ProductStockAlertAudience,
  MaterialStockAlertEmailRequestPayload,
  MaterialStockAlertSeverity,
  MaterialStockAlertAudience,
  PurchaseOrderSubmittedNotifyPayload,
  PurchaseOrderRejectedNotifyPayload,
  PurchaseOrderCancelledNotifyPayload,
  PurchaseOrderAcceptedNotifyPayload,
  PurchaseOrderConfirmedNotifyPayload,
  PurchaseOrderConfirmedAudience,
  PurchaseOrderReceivedNotifyPayload,
  PurchaseOrderReceivedAudience,
  PurchaseOrderPaymentRecordedNotifyPayload,
  ProductionRequestSubmittedNotifyPayload,
  ProductionRequestCancelledNotifyPayload,
  ProductionRequestAcceptedNotifyPayload,
  ProductionRequestRejectedNotifyPayload,
  ProductionRequestStartedNotifyPayload,
  ProductionRequestCompletedNotifyPayload,
  ProductionRequestInventoryAddedNotifyPayload,
} from './types';

type NotificationRow = {
  id: string;
  user_id: string | null;
  category: NotificationCategory;
  title: string | null;
  message: string;
  urgent: boolean;
  read: boolean;
  action_url: string | null;
  action_label: string | null;
  branch_id: string | null;
  metadata: Record<string, unknown> | null;
  event_type: string | null;
  created_at: string;
};

function mapRow(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    userId: row.user_id,
    category: row.category,
    title: row.title,
    message: row.message,
    urgent: row.urgent,
    read: row.read,
    actionUrl: row.action_url,
    actionLabel: row.action_label,
    branchId: row.branch_id,
    metadata: row.metadata,
    eventType: row.event_type,
    createdAt: row.created_at,
  };
}

export function formatNotificationTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

export async function fetchUserNotifications(userId: string, limit = 50): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select(
      'id, user_id, category, title, message, urgent, read, action_url, action_label, branch_id, metadata, event_type, created_at',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((row) => mapRow(row as NotificationRow));
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);
  if (error) throw error;
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) throw error;
}

export async function clearAllNotifications(userId: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('user_id', userId);
  if (error) throw error;
}

export function buildOrderNotifyPayload(order: OrderDetail, orderUuid: string): OrderCreatedNotifyPayload {
  return {
    orderId: orderUuid,
    orderNumber: order.id,
    customerName: order.customer?.trim() ? order.customer : null,
    agentName: order.agent?.trim() ? order.agent : null,
    branchName: order.branch?.trim() ? order.branch : null,
    orderDate: order.orderDate,
    requiredDate: order.requiredDate || null,
    deliveryAddress: null,
    urgency: order.urgency,
    status: order.status,
    subtotal: order.subtotal,
    totalAmount: order.totalAmount,
    deliveryType: order.deliveryType ?? null,
    paymentTerms: order.paymentTerms ?? null,
    paymentMethod: order.paymentMethod ?? null,
    discountPercent: order.discountPercent ?? null,
    discountAmount: order.discountAmount ?? null,
    orderNotes: order.orderNotes?.trim() ? order.orderNotes : null,
    lineCount: order.items.length,
    items: order.items.map((item) => ({
      productName: item.productName,
      variantDescription: item.variantDescription,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.lineTotal,
      discountPercent: item.discountPercent,
    })),
  };
}

async function sendOrderNotificationEmail(
  endpoint: string,
  payload: OrderCreatedNotifyPayload,
): Promise<void> {
  try {
    const res = await notifyFetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[notifications] Email send failed', { endpoint, status: res.status, body });
    }
  } catch (e) {
    console.warn('[notifications] Email API unreachable — in-app notifications still created', { endpoint, error: e });
  }
}

export async function notifyExecutivesOrderCreated(payload: OrderCreatedNotifyPayload): Promise<void> {
  const { error: rpcError } = await supabase.rpc('notify_executives_order_created', {
    p_order_id: payload.orderId,
  });
  if (rpcError) {
    console.error('[notifications] RPC notify_executives_order_created failed', rpcError);
    throw rpcError;
  }

  await sendOrderNotificationEmail('/api/notifications/order-created', payload);
}

export async function notifyExecutivesOrderSubmittedForApproval(
  payload: OrderCreatedNotifyPayload,
): Promise<void> {
  console.log('[notifications] order submit-for-approval → RPC', {
    orderId: payload.orderId,
    orderNumber: payload.orderNumber,
  });
  const { data, error: rpcError } = await supabase.rpc('notify_executives_order_submitted_for_approval', {
    p_order_id: payload.orderId,
  });
  if (rpcError) {
    console.error('[notifications] RPC notify_executives_order_submitted_for_approval failed', rpcError);
    throw rpcError;
  }
  console.log('[notifications] order submit-for-approval RPC result', {
    rawData: data,
    insertedCount: parseNotificationRpcCount(data),
  });

  await sendOrderNotificationEmail('/api/notifications/order-submitted-for-approval', payload);
}

const PO_NOTIFY_LOG = '[PO notifications]';

type PoNotifyDebugContext = {
  currentAuthUserId?: string | null;
  trigger?: string;
};

function parseNotificationRpcCount(data: unknown): number {
  if (typeof data === 'number' && Number.isFinite(data)) return data;
  if (typeof data === 'string' && data.trim() !== '') {
    const parsed = Number(data);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

async function logPurchaseOrderNotificationDiagnostics(
  label: string,
  poId: string,
  debug?: PoNotifyDebugContext,
): Promise<void> {
  console.group(`${PO_NOTIFY_LOG} ${label}`);
  console.log('poId', poId);
  console.log('trigger', debug?.trigger ?? '(unknown)');
  console.log('currentAuthUserId (bell loads notifications for this user only)', debug?.currentAuthUserId ?? null);

  const { data: po, error: poErr } = await supabase
    .from('purchase_orders')
    .select(
      'id, po_number, status, submitted_by, submitted_at, submitted_by_auth_user_id, submitted_by_employee_id, branch_id',
    )
    .eq('id', poId)
    .maybeSingle();
  console.log('PO snapshot', { po, poErr });

  const { data: executives, error: execErr } = await supabase
    .from('employees')
    .select('id, employee_name, email, auth_user_id, user_role, status')
    .eq('user_role', 'Executive')
    .eq('status', 'active');
  const execWithAuth = (executives ?? []).filter((e) => e.auth_user_id);
  console.log('Active Executive employees (submit-for-approval recipients)', {
    total: executives?.length ?? 0,
    withLinkedLogin: execWithAuth.length,
    recipients: execWithAuth.map((e) => ({
      name: e.employee_name,
      email: e.email,
      auth_user_id: e.auth_user_id,
    })),
    execErr,
  });
  if (label.includes('submit')) {
    console.info(
      `${PO_NOTIFY_LOG} Submit notifies Executives only — the warehouse submitter will NOT see this in their bell unless they are also logged in as an Executive account.`,
    );
  }

  const { data: submitterUid, error: submitterErr } = await supabase.rpc(
    'resolve_po_submitter_auth_user_id',
    { p_po_id: poId },
  );
  console.log('resolve_po_submitter_auth_user_id', { submitterUid, submitterErr });

  const { data: recentPoNotifs, error: recentErr } = await supabase
    .from('notifications')
    .select('id, user_id, title, event_type, created_at')
    .in('event_type', [
      'purchase_order_submitted_for_approval',
      'purchase_order_accepted',
      'purchase_order_confirmed',
      'purchase_order_rejected',
      'purchase_order_cancelled',
    ])
    .order('created_at', { ascending: false })
    .limit(8);
  console.log('Recent PO notifications in DB (any user)', { recentPoNotifs, recentErr });

  if (debug?.currentAuthUserId) {
    const { data: mine, error: mineErr } = await supabase
      .from('notifications')
      .select('id, title, event_type, read, created_at')
      .eq('user_id', debug.currentAuthUserId)
      .order('created_at', { ascending: false })
      .limit(5);
    console.log('Notifications for current logged-in user', { mine, mineErr });
  }

  console.groupEnd();
}

async function fetchPurchaseOrderSnapshotForNotify(
  poId: string,
): Promise<PurchaseOrderSubmittedNotifyPayload | null> {
  const { data: row, error } = await supabase
    .from('purchase_orders')
    .select(`
      id, po_number, branch_id, supplier_id, status, order_date, expected_delivery_date,
      total_amount, currency, notes, submitted_by,
      suppliers(name),
      branches:branches!branch_id(name)
    `)
    .eq('id', poId)
    .maybeSingle();

  if (error || !row) {
    console.warn(`${PO_NOTIFY_LOG} Could not load PO for email`, error);
    return null;
  }

  const { data: items } = await supabase
    .from('purchase_order_items')
    .select('quantity_ordered, unit_price, unit_of_measure, raw_materials(name, sku, brand, unit_of_measure)')
    .eq('order_id', poId)
    .order('created_at');

  const r = row as Record<string, unknown>;
  const supplierName = (r.suppliers as { name?: string } | null)?.name ?? null;
  const branchName = (r.branches as { name?: string } | null)?.name ?? null;

  const lineItems = (items ?? []).map((item) => {
    const raw = item.raw_materials as {
      name?: string;
      sku?: string;
      brand?: string;
      unit_of_measure?: string;
    } | null;
    const qty = Number(item.quantity_ordered) || 0;
    const unitPrice = Number(item.unit_price) || 0;
    return {
      materialName: raw?.name?.trim() || raw?.sku?.trim() || 'Material',
      sku: raw?.sku ?? null,
      brand: raw?.brand ?? null,
      quantity: qty,
      unitOfMeasure: (item.unit_of_measure as string | null) ?? raw?.unit_of_measure ?? null,
      unitPrice,
      lineTotal: qty * unitPrice,
    };
  });

  const computedTotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const dbTotal = Number(r.total_amount) || 0;

  return {
    purchaseOrderId: poId,
    poNumber: String(r.po_number ?? ''),
    supplierName,
    branchName,
    submittedBy: (r.submitted_by as string | null) ?? null,
    orderDate: String(r.order_date ?? ''),
    expectedDeliveryDate: (r.expected_delivery_date as string | null) ?? null,
    status: String(r.status ?? 'Requested'),
    currency: String(r.currency ?? 'PHP'),
    totalAmount: dbTotal > 0 ? dbTotal : computedTotal,
    notes: (r.notes as string | null) ?? null,
    lineCount: lineItems.length,
    items: lineItems,
  };
}

async function sendPurchaseOrderNotificationEmail(
  endpoint: string,
  payload: PurchaseOrderSubmittedNotifyPayload,
): Promise<boolean> {
  try {
    console.log(`${PO_NOTIFY_LOG} sending email`, { endpoint, poNumber: payload.poNumber });
    const res = await notifyFetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn(`${PO_NOTIFY_LOG} Email send failed`, { status: res.status, body });
      return false;
    }
    console.log(`${PO_NOTIFY_LOG} Email sent`, body);
    return true;
  } catch (e) {
    console.warn(`${PO_NOTIFY_LOG} Email API unreachable — in-app notifications still created`, e);
    return false;
  }
}

async function fetchPurchaseOrderSubmitterEmail(poId: string): Promise<string | null> {
  const { data: po, error } = await supabase
    .from('purchase_orders')
    .select('submitted_by_employee_id, submitted_by_auth_user_id, submitted_by')
    .eq('id', poId)
    .maybeSingle();

  if (error || !po) {
    console.warn(`${PO_NOTIFY_LOG} Could not load PO submitter for email`, error);
    return null;
  }

  if (po.submitted_by_employee_id) {
    const { data: emp } = await supabase
      .from('employees')
      .select('email')
      .eq('id', po.submitted_by_employee_id)
      .maybeSingle();
    const email = emp?.email?.trim();
    if (email) return email;
  }

  if (po.submitted_by_auth_user_id) {
    const { data: emp } = await supabase
      .from('employees')
      .select('email')
      .eq('auth_user_id', po.submitted_by_auth_user_id)
      .maybeSingle();
    const email = emp?.email?.trim();
    if (email) return email;
  }

  const submittedBy = po.submitted_by?.trim();
  if (submittedBy?.includes('@')) return submittedBy;

  return null;
}

async function buildPurchaseOrderRejectedNotifyPayload(
  poId: string,
  rejectedBy: string,
  rejectionReason?: string | null,
): Promise<PurchaseOrderRejectedNotifyPayload | null> {
  const base = await fetchPurchaseOrderSnapshotForNotify(poId);
  if (!base) return null;

  const submitterEmail = await fetchPurchaseOrderSubmitterEmail(poId);
  return {
    ...base,
    status: 'Rejected',
    rejectedBy,
    rejectionReason: rejectionReason ?? null,
    submitterEmail,
  };
}

async function sendPurchaseOrderRejectedNotificationEmail(
  payload: PurchaseOrderRejectedNotifyPayload,
): Promise<boolean> {
  try {
    console.log(`${PO_NOTIFY_LOG} sending rejection email`, {
      poNumber: payload.poNumber,
      submitterEmail: payload.submitterEmail ?? null,
    });
    const res = await notifyFetch('/api/notifications/purchase-order-rejected', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn(`${PO_NOTIFY_LOG} Rejection email send failed`, { status: res.status, body });
      return false;
    }
    console.log(`${PO_NOTIFY_LOG} Rejection email sent`, body);
    return true;
  } catch (e) {
    console.warn(`${PO_NOTIFY_LOG} Rejection email API unreachable`, e);
    return false;
  }
}

/** PO submitted for approval (Draft → Requested): notify all executives in-app. */
export async function notifyExecutivesPurchaseOrderSubmittedForApproval(
  poId: string,
  debug?: PoNotifyDebugContext,
): Promise<number> {
  await logPurchaseOrderNotificationDiagnostics('pre-submit RPC', poId, debug);

  console.log(`${PO_NOTIFY_LOG} calling notify_executives_po_submitted_for_approval`, { poId });
  const { data, error: rpcError } = await supabase.rpc('notify_executives_po_submitted_for_approval', {
    p_po_id: poId,
  });
  console.log(`${PO_NOTIFY_LOG} RPC response`, { rawData: data, rpcError });

  if (rpcError) {
    console.error(`${PO_NOTIFY_LOG} RPC notify_executives_po_submitted_for_approval failed`, rpcError);
    throw rpcError;
  }

  const count = parseNotificationRpcCount(data);
  if (count === 0) {
    console.warn(
      `${PO_NOTIFY_LOG} inserted 0 notifications — PO status must be Requested and at least one active Executive needs auth_user_id set.`,
    );
  } else {
    console.log(`${PO_NOTIFY_LOG} inserted ${count} executive notification(s)`);
  }

  const emailPayload = await fetchPurchaseOrderSnapshotForNotify(poId);
  if (emailPayload) {
    await sendPurchaseOrderNotificationEmail(
      '/api/notifications/purchase-order-submitted-for-approval',
      emailPayload,
    );
  } else {
    console.warn(`${PO_NOTIFY_LOG} Skipped email — could not build PO payload`);
  }

  await logPurchaseOrderNotificationDiagnostics('post-submit RPC', poId, debug);
  window.dispatchEvent(new Event('lamtex:notifications-refresh'));
  return count;
}

/** PO rejected: notify the employee who submitted it. */
export async function notifyPurchaseOrderSubmitterRejected(
  poId: string,
  rejectedBy: string,
  rejectionReason?: string | null,
  debug?: PoNotifyDebugContext,
): Promise<number> {
  await logPurchaseOrderNotificationDiagnostics('pre-reject RPC', poId, debug);

  console.log(`${PO_NOTIFY_LOG} calling notify_po_submitter_rejected`, {
    poId,
    rejectedBy,
    rejectionReason: rejectionReason ?? null,
  });
  const { data, error: rpcError } = await supabase.rpc('notify_po_submitter_rejected', {
    p_po_id: poId,
    p_rejected_by: rejectedBy,
    p_rejection_reason: rejectionReason ?? null,
  });
  console.log(`${PO_NOTIFY_LOG} RPC response`, { rawData: data, rpcError });

  if (rpcError) {
    console.error(`${PO_NOTIFY_LOG} RPC notify_po_submitter_rejected failed`, rpcError);
    throw rpcError;
  }

  const count = parseNotificationRpcCount(data);
  if (count === 0) {
    console.warn(
      `${PO_NOTIFY_LOG} reject notification not delivered — submitter auth account could not be resolved or PO is not Rejected.`,
    );
  } else {
    console.log(`${PO_NOTIFY_LOG} reject notification delivered to submitter`);
  }

  const emailPayload = await buildPurchaseOrderRejectedNotifyPayload(poId, rejectedBy, rejectionReason);
  if (emailPayload) {
    await sendPurchaseOrderRejectedNotificationEmail(emailPayload);
  } else {
    console.warn(`${PO_NOTIFY_LOG} Skipped rejection email — could not build PO payload`);
  }

  await logPurchaseOrderNotificationDiagnostics('post-reject RPC', poId, debug);
  window.dispatchEvent(new Event('lamtex:notifications-refresh'));
  return count;
}

async function buildPurchaseOrderAcceptedNotifyPayload(
  poId: string,
  acceptedBy: string,
): Promise<PurchaseOrderAcceptedNotifyPayload | null> {
  const base = await fetchPurchaseOrderSnapshotForNotify(poId);
  if (!base) return null;

  const submitterEmail = await fetchPurchaseOrderSubmitterEmail(poId);
  return {
    ...base,
    status: 'Accepted',
    acceptedBy,
    submitterEmail,
  };
}

async function sendPurchaseOrderAcceptedNotificationEmail(
  payload: PurchaseOrderAcceptedNotifyPayload,
): Promise<boolean> {
  try {
    console.log(`${PO_NOTIFY_LOG} sending acceptance email`, {
      poNumber: payload.poNumber,
      submitterEmail: payload.submitterEmail ?? null,
    });
    const res = await notifyFetch('/api/notifications/purchase-order-accepted', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn(`${PO_NOTIFY_LOG} Acceptance email send failed`, { status: res.status, body });
      return false;
    }
    console.log(`${PO_NOTIFY_LOG} Acceptance email sent`, body);
    return true;
  } catch (e) {
    console.warn(`${PO_NOTIFY_LOG} Acceptance email API unreachable`, e);
    return false;
  }
}

/** PO accepted: notify the employee who submitted it. */
export async function notifyPurchaseOrderSubmitterAccepted(
  poId: string,
  acceptedBy: string,
  debug?: PoNotifyDebugContext,
): Promise<number> {
  await logPurchaseOrderNotificationDiagnostics('pre-accept RPC', poId, debug);

  console.log(`${PO_NOTIFY_LOG} calling notify_po_submitter_accepted`, { poId, acceptedBy });
  const { data, error: rpcError } = await supabase.rpc('notify_po_submitter_accepted', {
    p_po_id: poId,
    p_accepted_by: acceptedBy,
  });
  console.log(`${PO_NOTIFY_LOG} RPC response`, { rawData: data, rpcError });

  if (rpcError) {
    console.error(`${PO_NOTIFY_LOG} RPC notify_po_submitter_accepted failed`, rpcError);
    throw rpcError;
  }

  const count = parseNotificationRpcCount(data);
  if (count === 0) {
    console.warn(
      `${PO_NOTIFY_LOG} accept notification not delivered — submitter auth account could not be resolved or PO is not Accepted.`,
    );
  } else {
    console.log(`${PO_NOTIFY_LOG} accept notification delivered to submitter`);
  }

  const emailPayload = await buildPurchaseOrderAcceptedNotifyPayload(poId, acceptedBy);
  if (emailPayload) {
    await sendPurchaseOrderAcceptedNotificationEmail(emailPayload);
  } else {
    console.warn(`${PO_NOTIFY_LOG} Skipped acceptance email — could not build PO payload`);
  }

  await logPurchaseOrderNotificationDiagnostics('post-accept RPC', poId, debug);
  window.dispatchEvent(new Event('lamtex:notifications-refresh'));
  return count;
}

async function buildPurchaseOrderConfirmedNotifyPayload(
  poId: string,
  confirmedBy: string,
  audience: PurchaseOrderConfirmedAudience,
): Promise<PurchaseOrderConfirmedNotifyPayload | null> {
  const base = await fetchPurchaseOrderSnapshotForNotify(poId);
  if (!base) return null;

  const role = audience === 'warehouse' ? 'Warehouse' : 'Executive';
  const recipientEmails = await fetchActiveEmployeeEmails(role);
  return {
    ...base,
    status: 'Confirmed',
    confirmedBy,
    audience,
    recipientEmails,
  };
}

async function sendPurchaseOrderConfirmedNotificationEmail(
  payload: PurchaseOrderConfirmedNotifyPayload,
): Promise<boolean> {
  try {
    console.log(`${PO_NOTIFY_LOG} sending confirmed email`, {
      poNumber: payload.poNumber,
      audience: payload.audience,
      recipientCount: payload.recipientEmails?.length ?? 0,
    });
    const res = await notifyFetch('/api/notifications/purchase-order-confirmed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn(`${PO_NOTIFY_LOG} Confirmed email send failed`, {
        audience: payload.audience,
        status: res.status,
        body,
      });
      return false;
    }
    console.log(`${PO_NOTIFY_LOG} Confirmed email sent`, body);
    return true;
  } catch (e) {
    console.warn(`${PO_NOTIFY_LOG} Confirmed email API unreachable`, payload.audience, e);
    return false;
  }
}

/** PO confirmed with supplier: notify all executives and warehouse staff. */
export async function notifyExecutivesAndWarehousePurchaseOrderConfirmed(
  poId: string,
  confirmedBy: string,
  debug?: PoNotifyDebugContext,
): Promise<number> {
  await logPurchaseOrderNotificationDiagnostics('pre-confirm RPC', poId, debug);

  console.log(`${PO_NOTIFY_LOG} calling notify_executives_and_warehouse_po_confirmed`, {
    poId,
    confirmedBy,
  });
  const { data, error: rpcError } = await supabase.rpc('notify_executives_and_warehouse_po_confirmed', {
    p_po_id: poId,
    p_confirmed_by: confirmedBy,
  });
  console.log(`${PO_NOTIFY_LOG} RPC response`, { rawData: data, rpcError });

  if (rpcError) {
    console.error(`${PO_NOTIFY_LOG} RPC notify_executives_and_warehouse_po_confirmed failed`, rpcError);
    throw rpcError;
  }

  const count = parseNotificationRpcCount(data);
  if (count === 0) {
    console.warn(
      `${PO_NOTIFY_LOG} confirm notification sent to 0 users — PO must be Confirmed and executives/warehouse need auth_user_id.`,
    );
  } else {
    console.log(`${PO_NOTIFY_LOG} confirm notification sent to ${count} user(s)`);
  }

  const audiences: PurchaseOrderConfirmedAudience[] = ['executive', 'warehouse'];
  await Promise.all(
    audiences.map(async (audience) => {
      const emailPayload = await buildPurchaseOrderConfirmedNotifyPayload(poId, confirmedBy, audience);
      if (emailPayload) {
        await sendPurchaseOrderConfirmedNotificationEmail(emailPayload);
      } else {
        console.warn(`${PO_NOTIFY_LOG} Skipped confirmed email — could not build payload`, audience);
      }
    }),
  );

  await logPurchaseOrderNotificationDiagnostics('post-confirm RPC', poId, debug);
  window.dispatchEvent(new Event('lamtex:notifications-refresh'));
  return count;
}

async function buildPurchaseOrderCancelledNotifyPayload(
  poId: string,
  cancelledBy: string,
  cancellationReason?: string | null,
): Promise<PurchaseOrderCancelledNotifyPayload | null> {
  const base = await fetchPurchaseOrderSnapshotForNotify(poId);
  if (!base) return null;

  const submitterEmail = await fetchPurchaseOrderSubmitterEmail(poId);
  return {
    ...base,
    status: 'Cancelled',
    cancelledBy,
    cancellationReason: cancellationReason ?? null,
    submitterEmail,
  };
}

async function sendPurchaseOrderCancelledNotificationEmail(
  payload: PurchaseOrderCancelledNotifyPayload,
): Promise<boolean> {
  try {
    console.log(`${PO_NOTIFY_LOG} sending cancellation email`, {
      poNumber: payload.poNumber,
      submitterEmail: payload.submitterEmail ?? null,
    });
    const res = await notifyFetch('/api/notifications/purchase-order-cancelled', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn(`${PO_NOTIFY_LOG} Cancellation email send failed`, { status: res.status, body });
      return false;
    }
    console.log(`${PO_NOTIFY_LOG} Cancellation email sent`, body);
    return true;
  } catch (e) {
    console.warn(`${PO_NOTIFY_LOG} Cancellation email API unreachable`, e);
    return false;
  }
}

/** PO cancelled: notify the employee who submitted it (skips if they cancelled it themselves). */
export async function notifyPurchaseOrderSubmitterCancelled(
  poId: string,
  cancelledBy: string,
  cancellationReason?: string | null,
  debug?: PoNotifyDebugContext,
): Promise<number> {
  await logPurchaseOrderNotificationDiagnostics('pre-cancel RPC', poId, debug);

  console.log(`${PO_NOTIFY_LOG} calling notify_po_submitter_cancelled`, {
    poId,
    cancelledBy,
    cancellationReason: cancellationReason ?? null,
  });
  const { data, error: rpcError } = await supabase.rpc('notify_po_submitter_cancelled', {
    p_po_id: poId,
    p_cancelled_by: cancelledBy,
    p_cancellation_reason: cancellationReason ?? null,
  });
  console.log(`${PO_NOTIFY_LOG} RPC response`, { rawData: data, rpcError });

  if (rpcError) {
    console.error(`${PO_NOTIFY_LOG} RPC notify_po_submitter_cancelled failed`, rpcError);
    throw rpcError;
  }

  const count = parseNotificationRpcCount(data);
  if (count === 0) {
    console.warn(
      `${PO_NOTIFY_LOG} cancel notification not delivered — submitter auth account unresolved, PO not Cancelled, or canceller label matches submitter (self-cancel).`,
    );
  } else {
    console.log(`${PO_NOTIFY_LOG} cancel notification delivered to submitter`);
  }

  const emailPayload = await buildPurchaseOrderCancelledNotifyPayload(poId, cancelledBy, cancellationReason);
  if (emailPayload) {
    await sendPurchaseOrderCancelledNotificationEmail(emailPayload);
  } else {
    console.warn(`${PO_NOTIFY_LOG} Skipped cancellation email — could not build PO payload`);
  }

  await logPurchaseOrderNotificationDiagnostics('post-cancel RPC', poId, debug);
  window.dispatchEvent(new Event('lamtex:notifications-refresh'));
  return count;
}

const PR_NOTIFY_LOG = '[PR notifications]';

type PrNotifyDebugContext = {
  currentAuthUserId?: string | null;
  trigger?: string;
};

async function logProductionRequestNotificationDiagnostics(
  label: string,
  prId: string,
  debug?: PrNotifyDebugContext,
): Promise<void> {
  console.group(`${PR_NOTIFY_LOG} ${label}`);
  console.log('prId', prId);
  console.log('trigger', debug?.trigger ?? '(unknown)');
  console.log('currentAuthUserId (bell loads notifications for this user only)', debug?.currentAuthUserId ?? null);

  const { data: pr, error: prErr } = await supabase
    .from('production_requests')
    .select(
      'id, pr_number, status, created_by, submitted_by, submitted_at, submitted_by_auth_user_id, submitted_by_employee_id, created_by_auth_user_id, created_by_employee_id, branch_id',
    )
    .eq('id', prId)
    .maybeSingle();
  console.log('PR snapshot', { pr, prErr });

  const { data: executives, error: execErr } = await supabase
    .from('employees')
    .select('id, employee_name, email, auth_user_id, user_role, status')
    .eq('user_role', 'Executive')
    .eq('status', 'active');
  const execWithAuth = (executives ?? []).filter((e) => e.auth_user_id);
  console.log('Active Executive employees (submit-for-approval recipients)', {
    total: executives?.length ?? 0,
    withLinkedLogin: execWithAuth.length,
    recipients: execWithAuth.map((e) => ({
      name: e.employee_name,
      email: e.email,
      auth_user_id: e.auth_user_id,
    })),
    execErr,
  });
  if (label.includes('submit')) {
    console.info(
      `${PR_NOTIFY_LOG} Submit fans out to all active Executives AND the submitter/creator (deduped) — everyone relevant gets a bell regardless of who submitted.`,
    );
  }
  if (label.includes('cancel')) {
    console.info(
      `${PR_NOTIFY_LOG} Cancel fans out to the submitter/creator AND all active Executives (deduped) — everyone relevant gets a bell regardless of who cancelled.`,
    );
  }

  const { data: submitterUid, error: submitterErr } = await supabase.rpc(
    'resolve_pr_submitter_auth_user_id',
    { p_pr_id: prId },
  );
  console.log('resolve_pr_submitter_auth_user_id', { submitterUid, submitterErr });

  const { data: recentPrNotifs, error: recentErr } = await supabase
    .from('notifications')
    .select('id, user_id, title, event_type, created_at')
    .in('event_type', ['production_request_submitted_for_approval', 'production_request_cancelled'])
    .order('created_at', { ascending: false })
    .limit(8);
  console.log('Recent PR notifications in DB (any user)', { recentPrNotifs, recentErr });

  if (debug?.currentAuthUserId) {
    const { data: mine, error: mineErr } = await supabase
      .from('notifications')
      .select('id, title, event_type, read, created_at')
      .eq('user_id', debug.currentAuthUserId)
      .order('created_at', { ascending: false })
      .limit(5);
    console.log('Notifications for current logged-in user', { mine, mineErr });
  }

  console.groupEnd();
}

async function fetchProductionRequestSnapshotForNotify(
  prId: string,
): Promise<ProductionRequestSubmittedNotifyPayload | null> {
  const { data: row, error } = await supabase
    .from('production_requests')
    .select(`
      id, pr_number, branch_id, status, request_date, expected_completion_date, notes,
      submitted_by, created_by,
      branches:branches!branch_id(name),
      production_request_items(
        quantity, quantity_completed,
        product_variants(sku, size, products(name))
      )
    `)
    .eq('id', prId)
    .maybeSingle();

  if (error || !row) {
    console.warn(`${PR_NOTIFY_LOG} Could not load PR for email`, error);
    return null;
  }

  const r = row as Record<string, unknown>;
  const branchName = (r.branches as { name?: string } | null)?.name ?? null;

  const rawItems = (r.production_request_items as Array<Record<string, unknown>> | null) ?? [];
  const items = rawItems.map((item) => {
    const pv = item.product_variants as {
      sku?: string;
      size?: string;
      products?: { name?: string } | null;
    } | null;
    const productName = pv?.products?.name?.trim() || 'Product';
    const variantLabel = [pv?.sku, pv?.size].filter(Boolean).join(' · ') || null;
    return {
      productName,
      variantLabel,
      sku: pv?.sku ?? null,
      quantity: Number(item.quantity) || 0,
      quantityCompleted: Number(item.quantity_completed) || 0,
    };
  });

  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return {
    productionRequestId: prId,
    prNumber: String(r.pr_number ?? ''),
    branchName,
    submittedBy: (r.submitted_by as string | null) ?? null,
    createdBy: (r.created_by as string | null) ?? null,
    requestDate: (r.request_date as string | null) ?? null,
    expectedCompletionDate: (r.expected_completion_date as string | null) ?? null,
    status: String(r.status ?? 'Requested'),
    notes: (r.notes as string | null) ?? null,
    totalQuantity,
    lineCount: items.length,
    items,
  };
}

async function fetchProductionRequestSubmitterEmail(prId: string): Promise<string | null> {
  const { data: pr, error } = await supabase
    .from('production_requests')
    .select('submitted_by_employee_id, submitted_by_auth_user_id, created_by_employee_id, created_by_auth_user_id, submitted_by, created_by')
    .eq('id', prId)
    .maybeSingle();

  if (error || !pr) {
    console.warn(`${PR_NOTIFY_LOG} Could not load PR submitter for email`, error);
    return null;
  }

  const lookups: Array<{ column: 'id' | 'auth_user_id'; value: string | null | undefined }> = [
    { column: 'id', value: pr.submitted_by_employee_id },
    { column: 'auth_user_id', value: pr.submitted_by_auth_user_id },
    { column: 'id', value: pr.created_by_employee_id },
    { column: 'auth_user_id', value: pr.created_by_auth_user_id },
  ];
  for (const { column, value } of lookups) {
    if (!value) continue;
    const { data: emp } = await supabase
      .from('employees')
      .select('email')
      .eq(column, value)
      .maybeSingle();
    const email = emp?.email?.trim();
    if (email) return email;
  }

  const fallback = (pr.submitted_by ?? pr.created_by)?.trim();
  if (fallback?.includes('@')) return fallback;

  return null;
}

async function sendProductionRequestNotificationEmail(
  endpoint: string,
  payload: ProductionRequestSubmittedNotifyPayload | ProductionRequestCancelledNotifyPayload,
): Promise<boolean> {
  try {
    console.log(`${PR_NOTIFY_LOG} sending email`, { endpoint, prNumber: payload.prNumber });
    const res = await notifyFetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn(`${PR_NOTIFY_LOG} Email send failed`, { status: res.status, body });
      return false;
    }
    console.log(`${PR_NOTIFY_LOG} Email sent`, body);
    return true;
  } catch (e) {
    console.warn(`${PR_NOTIFY_LOG} Email API unreachable — in-app notifications still created`, e);
    return false;
  }
}

/** PR submitted for approval: notify all active executives + the submitter, and email them. */
export async function notifyExecutivesProductionRequestSubmittedForApproval(
  prId: string,
  debug?: PrNotifyDebugContext,
): Promise<number> {
  await logProductionRequestNotificationDiagnostics('pre-submit RPC', prId, debug);

  console.log(`${PR_NOTIFY_LOG} calling notify_executives_pr_submitted_for_approval`, { prId });
  const { data, error: rpcError } = await supabase.rpc('notify_executives_pr_submitted_for_approval', {
    p_pr_id: prId,
  });
  console.log(`${PR_NOTIFY_LOG} RPC response`, { rawData: data, rpcError });

  if (rpcError) {
    console.error(`${PR_NOTIFY_LOG} RPC notify_executives_pr_submitted_for_approval failed`, rpcError);
    throw rpcError;
  }
  const count = parseNotificationRpcCount(data);
  if (count === 0) {
    console.warn(
      `${PR_NOTIFY_LOG} inserted 0 notifications — at least one active Executive (or the submitter) needs auth_user_id set. Run database/notifications_production_request_workflow.sql.`,
    );
  } else {
    console.log(`${PR_NOTIFY_LOG} inserted ${count} notification(s)`);
  }

  const emailPayload = await fetchProductionRequestSnapshotForNotify(prId);
  if (emailPayload) {
    await sendProductionRequestNotificationEmail(
      '/api/notifications/production-request-submitted-for-approval',
      emailPayload,
    );
  } else {
    console.warn(`${PR_NOTIFY_LOG} Skipped email — could not build PR payload`);
  }

  await logProductionRequestNotificationDiagnostics('post-submit RPC', prId, debug);
  window.dispatchEvent(new Event('lamtex:notifications-refresh'));
  return count;
}

/** PR cancelled: notify the employee who submitted it (skips if they cancelled it themselves). */
export async function notifyProductionRequestSubmitterCancelled(
  prId: string,
  cancelledBy: string,
  cancellationReason?: string | null,
  debug?: PrNotifyDebugContext,
): Promise<number> {
  await logProductionRequestNotificationDiagnostics('pre-cancel RPC', prId, debug);

  console.log(`${PR_NOTIFY_LOG} calling notify_pr_submitter_cancelled`, {
    prId,
    cancelledBy,
    cancellationReason: cancellationReason ?? null,
  });
  const { data, error: rpcError } = await supabase.rpc('notify_pr_submitter_cancelled', {
    p_pr_id: prId,
    p_cancelled_by: cancelledBy,
    p_cancellation_reason: cancellationReason ?? null,
  });
  console.log(`${PR_NOTIFY_LOG} RPC response`, { rawData: data, rpcError });

  if (rpcError) {
    console.error(`${PR_NOTIFY_LOG} RPC notify_pr_submitter_cancelled failed`, rpcError);
    throw rpcError;
  }
  const count = parseNotificationRpcCount(data);
  if (count === 0) {
    console.warn(
      `${PR_NOTIFY_LOG} cancel notification not delivered — no recipient (submitter/executives) has auth_user_id set.`,
    );
  } else {
    console.log(`${PR_NOTIFY_LOG} cancel notification delivered to ${count} recipient(s)`);
  }

  const base = await fetchProductionRequestSnapshotForNotify(prId);
  if (base) {
    const submitterEmail = await fetchProductionRequestSubmitterEmail(prId);
    const emailPayload: ProductionRequestCancelledNotifyPayload = {
      ...base,
      status: 'Cancelled',
      cancelledBy,
      cancellationReason: cancellationReason ?? null,
      submitterEmail,
    };
    await sendProductionRequestNotificationEmail('/api/notifications/production-request-cancelled', emailPayload);
  } else {
    console.warn(`${PR_NOTIFY_LOG} Skipped cancellation email — could not build PR payload`);
  }

  await logProductionRequestNotificationDiagnostics('post-cancel RPC', prId, debug);
  window.dispatchEvent(new Event('lamtex:notifications-refresh'));
  return count;
}

/** @deprecated Use notifyProductionRequestSubmitterCancelled */
export const notifyProductionRequestCreatorCancelled = notifyProductionRequestSubmitterCancelled;

/** PR accepted by an executive: notify the submitter and email them. */
export async function notifyProductionRequestSubmitterAccepted(
  prId: string,
  acceptedBy: string,
  debug?: PrNotifyDebugContext,
): Promise<number> {
  await logProductionRequestNotificationDiagnostics('pre-accept RPC', prId, debug);

  console.log(`${PR_NOTIFY_LOG} calling notify_pr_submitter_accepted`, { prId, acceptedBy });
  const { data, error: rpcError } = await supabase.rpc('notify_pr_submitter_accepted', {
    p_pr_id: prId,
    p_accepted_by: acceptedBy,
  });
  console.log(`${PR_NOTIFY_LOG} RPC response`, { rawData: data, rpcError });

  if (rpcError) {
    console.error(`${PR_NOTIFY_LOG} RPC notify_pr_submitter_accepted failed`, rpcError);
    throw rpcError;
  }
  const count = parseNotificationRpcCount(data);
  if (count === 0) {
    console.warn(
      `${PR_NOTIFY_LOG} accept notification not delivered — submitter auth account unresolved. Run database/notifications_production_request_workflow.sql.`,
    );
  } else {
    console.log(`${PR_NOTIFY_LOG} accept notification delivered to submitter`);
  }

  const base = await fetchProductionRequestSnapshotForNotify(prId);
  if (base) {
    const submitterEmail = await fetchProductionRequestSubmitterEmail(prId);
    const emailPayload: ProductionRequestAcceptedNotifyPayload = {
      ...base,
      status: 'Accepted',
      acceptedBy,
      submitterEmail,
    };
    await sendProductionRequestNotificationEmail('/api/notifications/production-request-accepted', emailPayload);
  } else {
    console.warn(`${PR_NOTIFY_LOG} Skipped accept email — could not build PR payload`);
  }

  await logProductionRequestNotificationDiagnostics('post-accept RPC', prId, debug);
  window.dispatchEvent(new Event('lamtex:notifications-refresh'));
  return count;
}

/** PR rejected by an executive: notify the submitter and email them. */
export async function notifyProductionRequestSubmitterRejected(
  prId: string,
  rejectedBy: string,
  rejectionReason?: string | null,
  debug?: PrNotifyDebugContext,
): Promise<number> {
  await logProductionRequestNotificationDiagnostics('pre-reject RPC', prId, debug);

  console.log(`${PR_NOTIFY_LOG} calling notify_pr_submitter_rejected`, {
    prId,
    rejectedBy,
    rejectionReason: rejectionReason ?? null,
  });
  const { data, error: rpcError } = await supabase.rpc('notify_pr_submitter_rejected', {
    p_pr_id: prId,
    p_rejected_by: rejectedBy,
    p_rejection_reason: rejectionReason ?? null,
  });
  console.log(`${PR_NOTIFY_LOG} RPC response`, { rawData: data, rpcError });

  if (rpcError) {
    console.error(`${PR_NOTIFY_LOG} RPC notify_pr_submitter_rejected failed`, rpcError);
    throw rpcError;
  }
  const count = parseNotificationRpcCount(data);
  if (count === 0) {
    console.warn(
      `${PR_NOTIFY_LOG} reject notification not delivered — submitter auth account unresolved. Run database/notifications_production_request_workflow.sql.`,
    );
  } else {
    console.log(`${PR_NOTIFY_LOG} reject notification delivered to submitter`);
  }

  const base = await fetchProductionRequestSnapshotForNotify(prId);
  if (base) {
    const submitterEmail = await fetchProductionRequestSubmitterEmail(prId);
    const emailPayload: ProductionRequestRejectedNotifyPayload = {
      ...base,
      status: 'Rejected',
      rejectedBy,
      rejectionReason: rejectionReason ?? null,
      submitterEmail,
    };
    await sendProductionRequestNotificationEmail('/api/notifications/production-request-rejected', emailPayload);
  } else {
    console.warn(`${PR_NOTIFY_LOG} Skipped reject email — could not build PR payload`);
  }

  await logProductionRequestNotificationDiagnostics('post-reject RPC', prId, debug);
  window.dispatchEvent(new Event('lamtex:notifications-refresh'));
  return count;
}

async function fetchEmailsForRoles(roles: string[]): Promise<string[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('email, user_role, status')
    .in('user_role', roles)
    .eq('status', 'active');
  if (error) {
    console.warn(`${PR_NOTIFY_LOG} Could not load emails for roles ${roles.join(', ')}`, error);
    return [];
  }
  const emails = (data ?? [])
    .map((e) => e.email?.trim())
    .filter((e): e is string => !!e);
  return [...new Set(emails)];
}

function fetchWarehouseAndExecutiveEmails(): Promise<string[]> {
  return fetchEmailsForRoles(['Warehouse', 'Executive']);
}

/** Production started: notify all active warehouse staff + executives, and email them. */
export async function notifyWarehouseAndExecutivesProductionRequestStarted(
  prId: string,
  startedBy: string,
  debug?: PrNotifyDebugContext,
): Promise<number> {
  await logProductionRequestNotificationDiagnostics('pre-start RPC', prId, debug);

  console.log(`${PR_NOTIFY_LOG} calling notify_warehouse_and_executives_pr_started`, { prId, startedBy });
  const { data, error: rpcError } = await supabase.rpc('notify_warehouse_and_executives_pr_started', {
    p_pr_id: prId,
    p_started_by: startedBy,
  });
  console.log(`${PR_NOTIFY_LOG} RPC response`, { rawData: data, rpcError });

  if (rpcError) {
    console.error(`${PR_NOTIFY_LOG} RPC notify_warehouse_and_executives_pr_started failed`, rpcError);
    throw rpcError;
  }
  const count = parseNotificationRpcCount(data);
  if (count === 0) {
    console.warn(
      `${PR_NOTIFY_LOG} start notification inserted 0 — no active Warehouse/Executive has auth_user_id set. Run database/notifications_production_request_workflow.sql.`,
    );
  } else {
    console.log(`${PR_NOTIFY_LOG} start notification delivered to ${count} recipient(s)`);
  }

  const base = await fetchProductionRequestSnapshotForNotify(prId);
  if (base) {
    const recipientEmails = await fetchWarehouseAndExecutiveEmails();
    const emailPayload: ProductionRequestStartedNotifyPayload = {
      ...base,
      status: 'In Progress',
      startedBy,
      recipientEmails,
    };
    await sendProductionRequestNotificationEmail('/api/notifications/production-request-started', emailPayload);
  } else {
    console.warn(`${PR_NOTIFY_LOG} Skipped start email — could not build PR payload`);
  }

  await logProductionRequestNotificationDiagnostics('post-start RPC', prId, debug);
  window.dispatchEvent(new Event('lamtex:notifications-refresh'));
  return count;
}

/** Inventory added: notify active warehouse staff (and email them) whenever recording production adds new finished stock. */
export async function notifyWarehouseProductionRequestInventoryAdded(
  prId: string,
  recordedBy: string,
  addedUnits: number,
  debug?: PrNotifyDebugContext,
): Promise<number> {
  await logProductionRequestNotificationDiagnostics('pre-inventory-added RPC', prId, debug);

  console.log(`${PR_NOTIFY_LOG} calling notify_warehouse_pr_inventory_added`, { prId, recordedBy, addedUnits });
  const { data, error: rpcError } = await supabase.rpc('notify_warehouse_pr_inventory_added', {
    p_pr_id: prId,
    p_recorded_by: recordedBy,
    p_added_units: addedUnits,
  });
  console.log(`${PR_NOTIFY_LOG} RPC response`, { rawData: data, rpcError });

  if (rpcError) {
    console.error(`${PR_NOTIFY_LOG} RPC notify_warehouse_pr_inventory_added failed`, rpcError);
    throw rpcError;
  }
  const count = parseNotificationRpcCount(data);
  if (count === 0) {
    console.warn(
      `${PR_NOTIFY_LOG} inventory-added notification inserted 0 — no active Warehouse has auth_user_id set. Run database/notifications_production_request_workflow.sql.`,
    );
  } else {
    console.log(`${PR_NOTIFY_LOG} inventory-added notification delivered to ${count} recipient(s)`);
  }

  const base = await fetchProductionRequestSnapshotForNotify(prId);
  if (base) {
    const recipientEmails = await fetchEmailsForRoles(['Warehouse']);
    const producedQuantity = base.items.reduce((sum, item) => sum + (Number(item.quantityCompleted) || 0), 0);
    const emailPayload: ProductionRequestInventoryAddedNotifyPayload = {
      ...base,
      recordedBy,
      addedUnits,
      producedQuantity,
      recipientEmails,
    };
    await sendProductionRequestNotificationEmail('/api/notifications/production-request-inventory-added', emailPayload);
  } else {
    console.warn(`${PR_NOTIFY_LOG} Skipped inventory-added email — could not build PR payload`);
  }

  await logProductionRequestNotificationDiagnostics('post-inventory-added RPC', prId, debug);
  window.dispatchEvent(new Event('lamtex:notifications-refresh'));
  return count;
}

/** Production completed: notify active warehouse staff + executives, and email them. */
export async function notifyWarehouseAndExecutivesProductionRequestCompleted(
  prId: string,
  completedBy: string,
  debug?: PrNotifyDebugContext,
): Promise<number> {
  await logProductionRequestNotificationDiagnostics('pre-complete RPC', prId, debug);

  console.log(`${PR_NOTIFY_LOG} calling notify_warehouse_and_executives_pr_completed`, { prId, completedBy });
  const { data, error: rpcError } = await supabase.rpc('notify_warehouse_and_executives_pr_completed', {
    p_pr_id: prId,
    p_completed_by: completedBy,
  });
  console.log(`${PR_NOTIFY_LOG} RPC response`, { rawData: data, rpcError });

  if (rpcError) {
    console.error(`${PR_NOTIFY_LOG} RPC notify_warehouse_and_executives_pr_completed failed`, rpcError);
    throw rpcError;
  }
  const count = parseNotificationRpcCount(data);
  if (count === 0) {
    console.warn(
      `${PR_NOTIFY_LOG} complete notification inserted 0 — no active Warehouse/Executive has auth_user_id set. Run database/notifications_production_request_workflow.sql.`,
    );
  } else {
    console.log(`${PR_NOTIFY_LOG} complete notification delivered to ${count} recipient(s)`);
  }

  const base = await fetchProductionRequestSnapshotForNotify(prId);
  if (base) {
    const recipientEmails = await fetchWarehouseAndExecutiveEmails();
    const producedQuantity = base.items.reduce((sum, item) => sum + (Number(item.quantityCompleted) || 0), 0);
    const emailPayload: ProductionRequestCompletedNotifyPayload = {
      ...base,
      status: 'Completed',
      completedBy,
      producedQuantity,
      recipientEmails,
    };
    await sendProductionRequestNotificationEmail('/api/notifications/production-request-completed', emailPayload);
  } else {
    console.warn(`${PR_NOTIFY_LOG} Skipped complete email — could not build PR payload`);
  }

  await logProductionRequestNotificationDiagnostics('post-complete RPC', prId, debug);
  window.dispatchEvent(new Event('lamtex:notifications-refresh'));
  return count;
}

async function fetchPoReceiveTotals(
  poId: string,
): Promise<{ quantityReceived: number; quantityOrdered: number }> {
  const { data, error } = await supabase
    .from('purchase_order_items')
    .select('quantity_ordered, quantity_received')
    .eq('order_id', poId);
  if (error) {
    console.warn(`${PO_NOTIFY_LOG} Could not load PO receive totals`, error);
    return { quantityReceived: 0, quantityOrdered: 0 };
  }
  let quantityReceived = 0;
  let quantityOrdered = 0;
  for (const row of data ?? []) {
    quantityReceived += Number(row.quantity_received) || 0;
    quantityOrdered += Number(row.quantity_ordered) || 0;
  }
  return { quantityReceived, quantityOrdered };
}

async function buildPurchaseOrderReceivedNotifyPayload(
  poId: string,
  receivedBy: string,
  isFullReceive: boolean,
  audience: PurchaseOrderReceivedAudience,
): Promise<PurchaseOrderReceivedNotifyPayload | null> {
  const base = await fetchPurchaseOrderSnapshotForNotify(poId);
  if (!base) return null;
  const { quantityReceived, quantityOrdered } = await fetchPoReceiveTotals(poId);
  const role = audience === 'warehouse' ? 'Warehouse' : 'Executive';
  const recipientEmails = await fetchActiveEmployeeEmails(role);
  return {
    ...base,
    receivedBy,
    quantityReceived,
    quantityOrdered,
    isFullReceive,
    audience,
    recipientEmails,
  };
}

async function sendPurchaseOrderReceivedNotificationEmail(
  payload: PurchaseOrderReceivedNotifyPayload,
): Promise<boolean> {
  try {
    const res = await notifyFetch('/api/notifications/purchase-order-received', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn(`${PO_NOTIFY_LOG} Received email send failed`, payload.audience, await res.json().catch(() => ({})));
      return false;
    }
    return true;
  } catch (e) {
    console.warn(`${PO_NOTIFY_LOG} Received email API unreachable`, payload.audience, e);
    return false;
  }
}

/** Notify executives and warehouse when a PO receipt is recorded. */
export async function notifyExecutivesAndWarehousePurchaseOrderReceived(
  poId: string,
  opts: {
    receivedBy?: string | null;
    quantityReceived?: number;
    isFullReceive?: boolean;
  } = {},
): Promise<number> {
  const receivedBy = opts.receivedBy ?? null;
  const quantityReceived = opts.quantityReceived ?? 0;
  const isFullReceive = opts.isFullReceive ?? false;

  const { data, error } = await supabase.rpc('notify_executives_and_warehouse_po_received', {
    p_po_id: poId,
    p_received_by: receivedBy,
    p_quantity_received: quantityReceived,
    p_is_full: isFullReceive,
  });
  if (error) {
    console.error(`${PO_NOTIFY_LOG} RPC notify_executives_and_warehouse_po_received failed`, error);
    throw error;
  }
  const count = parseNotificationRpcCount(data);

  const audiences: PurchaseOrderReceivedAudience[] = ['executive', 'warehouse'];
  for (const audience of audiences) {
    const emailPayload = await buildPurchaseOrderReceivedNotifyPayload(
      poId,
      receivedBy ?? '',
      isFullReceive,
      audience,
    );
    if (emailPayload) {
      await sendPurchaseOrderReceivedNotificationEmail(emailPayload);
    }
  }

  window.dispatchEvent(new Event('lamtex:notifications-refresh'));
  return count;
}

async function buildPurchaseOrderPaymentRecordedNotifyPayload(
  poId: string,
  recordedBy: string,
  paymentAmount: number,
): Promise<PurchaseOrderPaymentRecordedNotifyPayload | null> {
  const base = await fetchPurchaseOrderSnapshotForNotify(poId);
  if (!base) return null;

  const { data: poRow } = await supabase
    .from('purchase_orders')
    .select('amount_paid, payment_status, total_amount')
    .eq('id', poId)
    .maybeSingle();
  const amountPaid = Number(poRow?.amount_paid ?? 0);
  const totalAmount = Number(poRow?.total_amount ?? base.totalAmount);
  const paymentStatus = String(poRow?.payment_status ?? 'Unpaid');
  const paidInFull = amountPaid >= totalAmount && totalAmount > 0;

  const recipientEmails = await fetchActiveEmployeeEmails('Executive');
  return {
    ...base,
    recordedBy,
    paymentAmount,
    amountPaid,
    paymentStatus,
    paidInFull,
    recipientEmails,
  };
}

async function sendPurchaseOrderPaymentRecordedNotificationEmail(
  payload: PurchaseOrderPaymentRecordedNotifyPayload,
): Promise<boolean> {
  try {
    const res = await notifyFetch('/api/notifications/purchase-order-payment-recorded', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn(`${PO_NOTIFY_LOG} Payment recorded email failed`, await res.json().catch(() => ({})));
      return false;
    }
    return true;
  } catch (e) {
    console.warn(`${PO_NOTIFY_LOG} Payment recorded email API unreachable`, e);
    return false;
  }
}

/** Notify executives when a PO payment is recorded (executives only). */
export async function notifyExecutivesPurchaseOrderPaymentRecorded(
  poId: string,
  opts: {
    recordedBy?: string | null;
    paymentAmount: number;
  },
): Promise<number> {
  const paymentAmount = Math.max(0, opts.paymentAmount);
  if (paymentAmount <= 0) return 0;

  const { data, error } = await supabase.rpc('notify_executives_po_payment_recorded', {
    p_po_id: poId,
    p_recorded_by: opts.recordedBy ?? null,
    p_payment_amount: paymentAmount,
  });
  if (error) {
    console.error(`${PO_NOTIFY_LOG} RPC notify_executives_po_payment_recorded failed`, error);
    throw error;
  }
  const count = parseNotificationRpcCount(data);

  const emailPayload = await buildPurchaseOrderPaymentRecordedNotifyPayload(
    poId,
    opts.recordedBy ?? '',
    paymentAmount,
  );
  if (emailPayload) {
    await sendPurchaseOrderPaymentRecordedNotificationEmail(emailPayload);
  }

  window.dispatchEvent(new Event('lamtex:notifications-refresh'));
  return count;
}

/** Notify executives when a PO proof document is uploaded (delivery / other / payment attachment). */
export async function notifyExecutivesPurchaseOrderProofUploaded(
  poId: string,
  opts: {
    proofType: 'delivery' | 'payment' | 'other';
    uploadedBy?: string | null;
    proofCount?: number;
    proofTitle?: string | null;
    paymentAmount?: number;
  },
): Promise<number> {
  const { data, error } = await supabase.rpc('notify_executives_po_proof_uploaded', {
    p_po_id: poId,
    p_proof_type: opts.proofType,
    p_uploaded_by: opts.uploadedBy ?? null,
    p_proof_count: Math.max(1, opts.proofCount ?? 1),
    p_proof_title: opts.proofTitle ?? null,
    p_payment_amount: Math.max(0, opts.paymentAmount ?? 0),
  });
  if (error) {
    console.error(`${PO_NOTIFY_LOG} RPC notify_executives_po_proof_uploaded failed`, error);
    return 0;
  }
  const count = parseNotificationRpcCount(data);
  if (count <= 0) {
    console.warn(
      `${PO_NOTIFY_LOG} notify_executives_po_proof_uploaded returned 0 — run database/notifications_purchase_order_proof_uploaded.sql and ensure active Executive/Warehouse employees have auth_user_id set.`,
    );
  }
  window.dispatchEvent(new Event('lamtex:notifications-refresh'));
  return count;
}

export function buildOrderRevisedNotifyPayload(
  order: OrderDetail,
  orderUuid: string,
  opts: { previousRejectionReason?: string | null },
): OrderRevisedNotifyPayload {
  return {
    ...buildOrderNotifyPayload({ ...order, status: 'Pending' }, orderUuid),
    previousRejectionReason: opts.previousRejectionReason ?? null,
  };
}

export async function notifyExecutivesOrderRevised(payload: OrderRevisedNotifyPayload): Promise<void> {
  const { error: rpcError } = await supabase.rpc('notify_executives_order_revised', {
    p_order_id: payload.orderId,
  });
  if (rpcError) {
    console.error('[notifications] RPC notify_executives_order_revised failed', rpcError);
    throw rpcError;
  }

  await sendOrderNotificationEmail('/api/notifications/order-revised', payload);
}

async function fetchAgentEmail(agentId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('employees')
    .select('email')
    .eq('id', agentId)
    .maybeSingle();
  if (error) {
    console.warn('[notifications] Could not load agent email', error);
    return null;
  }
  return data?.email?.trim() || null;
}

async function fetchBranchLogisticsEmails(branchId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('email')
    .eq('branch_id', branchId)
    .eq('user_role', 'Logistics')
    .eq('status', 'active');
  if (error) {
    console.warn('[notifications] Could not load logistics emails', error);
    return [];
  }
  return (data ?? [])
    .map((row) => (row as { email?: string | null }).email?.trim())
    .filter((email): email is string => Boolean(email));
}

async function fetchBranchWarehouseEmails(branchId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('email')
    .eq('branch_id', branchId)
    .eq('user_role', 'Warehouse')
    .eq('status', 'active');
  if (error) {
    console.warn('[notifications] Could not load warehouse emails', error);
    return [];
  }
  return (data ?? [])
    .map((row) => (row as { email?: string | null }).email?.trim())
    .filter((email): email is string => Boolean(email));
}

async function fetchOrderDetailSnapshotForNotify(orderUuid: string): Promise<OrderDetail | null> {
  const { data: row, error } = await supabase
    .from('orders')
    .select(`
      id, order_number, branch_id, customer_id, customer_name, agent_id, agent_name,
      order_date, required_date, urgency, delivery_type, payment_terms, payment_method,
      status, payment_status, subtotal, discount_percent, discount_amount, total_amount,
      amount_paid, balance_due,
      order_notes, delivery_address, scheduled_departure_date, actual_delivery,
      branches(name)
    `)
    .eq('id', orderUuid)
    .maybeSingle();

  if (error || !row) {
    console.warn('[notifications] Could not load order for notify', error);
    return null;
  }

  const { data: items } = await supabase
    .from('order_line_items')
    .select('id, sku, product_name, variant_description, quantity, unit_price, discount_percent, line_total')
    .eq('order_id', orderUuid)
    .order('created_at');

  const r = row as Record<string, unknown>;
  const branchName = (r.branches as { name?: string } | null)?.name ?? '';

  return {
    id: String(r.order_number ?? ''),
    branchId: (r.branch_id as string | null) ?? undefined,
    customer: String(r.customer_name ?? ''),
    customerId: String(r.customer_id ?? ''),
    agent: String(r.agent_name ?? ''),
    agentId: String(r.agent_id ?? ''),
    branch: branchName,
    orderDate: String(r.order_date ?? ''),
    requiredDate: String(r.required_date ?? ''),
    urgency: (r.urgency as OrderDetail['urgency']) ?? 'Medium',
    deliveryType: (r.delivery_type as OrderDetail['deliveryType']) ?? 'Truck',
    paymentTerms: (r.payment_terms as OrderDetail['paymentTerms']) ?? 'COD',
    paymentMethod: (r.payment_method as OrderDetail['paymentMethod']) ?? 'Offline',
    status: (r.status as OrderDetail['status']) ?? 'Scheduled',
    paymentStatus: (r.payment_status as OrderDetail['paymentStatus']) ?? 'Unpaid',
    items: (items ?? []).map((item) => {
      const li = item as Record<string, unknown>;
      return {
        id: String(li.id ?? ''),
        sku: String(li.sku ?? ''),
        productName: String(li.product_name ?? ''),
        variantDescription: String(li.variant_description ?? ''),
        quantity: Number(li.quantity ?? 0),
        unitPrice: Number(li.unit_price ?? 0),
        discountPercent: Number(li.discount_percent ?? 0),
        lineTotal: Number(li.line_total ?? 0),
      };
    }),
    subtotal: Number(r.subtotal ?? 0),
    discountPercent: Number(r.discount_percent ?? 0),
    discountAmount: Number(r.discount_amount ?? 0),
    totalAmount: Number(r.total_amount ?? 0),
    amountPaid: Number(r.amount_paid ?? 0),
    balanceDue: Number(r.balance_due ?? 0),
    requiresApproval: false,
    orderNotes: (r.order_notes as string | null) ?? undefined,
    scheduledDepartureDate: r.scheduled_departure_date
      ? String(r.scheduled_departure_date).slice(0, 10)
      : undefined,
    actualDelivery: r.actual_delivery ? String(r.actual_delivery).slice(0, 10) : undefined,
  };
}

export async function buildOrderDecisionNotifyPayload(
  order: OrderDetail,
  orderUuid: string,
  opts: {
    decision: 'approved' | 'rejected';
    decidedBy: string | null;
    rejectionReason?: string | null;
  },
): Promise<OrderDecisionNotifyPayload> {
  const base = buildOrderNotifyPayload(
    {
      ...order,
      status: opts.decision === 'approved' ? 'Approved' : 'Rejected',
    },
    orderUuid,
  );
  const agentEmail = order.agentId?.trim() ? await fetchAgentEmail(order.agentId) : null;
  return {
    ...base,
    decision: opts.decision,
    decidedBy: opts.decidedBy,
    rejectionReason: opts.rejectionReason ?? null,
    agentEmail,
  };
}

async function sendOrderDecisionNotificationEmail(payload: OrderDecisionNotifyPayload): Promise<void> {
  const endpoint =
    payload.decision === 'approved'
      ? '/api/notifications/order-approved'
      : '/api/notifications/order-rejected';
  try {
    const res = await notifyFetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[notifications] Agent decision email failed', body);
    }
  } catch (e) {
    console.warn('[notifications] Agent decision email API unreachable', e);
  }
}

export async function notifyAgentOrderApproved(
  payload: OrderDecisionNotifyPayload,
): Promise<void> {
  const { error: rpcError } = await supabase.rpc('notify_agent_order_approved', {
    p_order_id: payload.orderId,
    p_decided_by: payload.decidedBy,
  });
  if (rpcError) {
    console.error('[notifications] RPC notify_agent_order_approved failed', rpcError);
  }
  await sendOrderDecisionNotificationEmail(payload);
}

export async function notifyAgentOrderRejected(
  payload: OrderDecisionNotifyPayload,
): Promise<void> {
  const { error: rpcError } = await supabase.rpc('notify_agent_order_rejected', {
    p_order_id: payload.orderId,
    p_decided_by: payload.decidedBy,
    p_rejection_reason: payload.rejectionReason ?? null,
  });
  if (rpcError) {
    console.error('[notifications] RPC notify_agent_order_rejected failed', rpcError);
  }
  await sendOrderDecisionNotificationEmail(payload);
}

export async function buildOrderLogisticsReadyNotifyPayload(
  order: OrderDetail,
  orderUuid: string,
  opts: { approvedBy: string | null },
): Promise<OrderLogisticsReadyNotifyPayload | null> {
  const branchId = order.branchId?.trim();
  if (!branchId) {
    console.warn('[notifications] Cannot notify logistics — order has no branchId');
    return null;
  }
  const base = buildOrderNotifyPayload({ ...order, status: 'Approved' }, orderUuid);
  const logisticsEmails = await fetchBranchLogisticsEmails(branchId);
  return {
    ...base,
    approvedBy: opts.approvedBy,
    branchId,
    logisticsEmails,
  };
}

async function sendOrderLogisticsReadyNotificationEmail(
  payload: OrderLogisticsReadyNotifyPayload,
): Promise<void> {
  try {
    const res = await notifyFetch('/api/notifications/order-ready-for-scheduling', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[notifications] Logistics ready email failed', body);
    }
  } catch (e) {
    console.warn('[notifications] Logistics ready email API unreachable', e);
  }
}

export async function notifyLogisticsOrderReadyForSchedule(
  payload: OrderLogisticsReadyNotifyPayload,
): Promise<void> {
  const { error: rpcError } = await supabase.rpc('notify_branch_logistics_order_ready_for_schedule', {
    p_order_id: payload.orderId,
    p_approved_by: payload.approvedBy,
  });
  if (rpcError) {
    console.error('[notifications] RPC notify_branch_logistics_order_ready_for_schedule failed', rpcError);
  }
  await sendOrderLogisticsReadyNotificationEmail(payload);
}

export async function buildOrderLogisticsLoadingNotifyPayload(
  orderUuid: string,
  opts: { markedBy: string | null },
): Promise<OrderLogisticsLoadingNotifyPayload | null> {
  const order = await fetchOrderDetailSnapshotForNotify(orderUuid);
  if (!order) return null;

  const branchId = order.branchId?.trim();
  if (!branchId) {
    console.warn('[notifications] Cannot notify logistics — order has no branchId');
    return null;
  }

  const base = buildOrderNotifyPayload({ ...order, status: 'Loading' }, orderUuid);
  const logisticsEmails = await fetchBranchLogisticsEmails(branchId);
  return {
    ...base,
    markedBy: opts.markedBy,
    branchId,
    logisticsEmails,
  };
}

async function sendOrderLogisticsLoadingNotificationEmail(
  payload: OrderLogisticsLoadingNotifyPayload,
): Promise<void> {
  try {
    const res = await notifyFetch('/api/notifications/order-loading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[notifications] Logistics loading email failed', body);
    }
  } catch (e) {
    console.warn('[notifications] Logistics loading email API unreachable', e);
  }
}

export async function notifyLogisticsOrderLoading(
  orderUuid: string,
  opts: { markedBy: string | null },
): Promise<void> {
  const payload = await buildOrderLogisticsLoadingNotifyPayload(orderUuid, opts);
  if (!payload) return;

  const { error: rpcError } = await supabase.rpc('notify_branch_logistics_order_loading', {
    p_order_id: payload.orderId,
    p_marked_by: payload.markedBy,
  });
  if (rpcError) {
    console.error('[notifications] RPC notify_branch_logistics_order_loading failed', rpcError);
  }
  await sendOrderLogisticsLoadingNotificationEmail(payload);
}

export async function buildOrderPackedNotifyPayload(
  orderUuid: string,
  opts: { markedBy: string | null },
): Promise<OrderPackedNotifyPayload | null> {
  const order = await fetchOrderDetailSnapshotForNotify(orderUuid);
  if (!order) return null;

  const branchId = order.branchId?.trim();
  if (!branchId) {
    console.warn('[notifications] Cannot notify packed — order has no branchId');
    return null;
  }

  const base = buildOrderNotifyPayload({ ...order, status: 'Packed' }, orderUuid);
  const logisticsEmails = await fetchBranchLogisticsEmails(branchId);
  const agentEmail = order.agentId?.trim() ? await fetchAgentEmail(order.agentId) : null;
  return {
    ...base,
    markedBy: opts.markedBy,
    branchId,
    logisticsEmails,
    agentEmail,
  };
}

async function sendOrderPackedNotificationEmail(payload: OrderPackedNotifyPayload): Promise<void> {
  try {
    const res = await notifyFetch('/api/notifications/order-packed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[notifications] Order packed email failed', body);
    }
  } catch (e) {
    console.warn('[notifications] Order packed email API unreachable', e);
  }
}

export async function notifyOrderPacked(
  orderUuid: string,
  opts: { markedBy: string | null },
): Promise<void> {
  const payload = await buildOrderPackedNotifyPayload(orderUuid, opts);
  if (!payload) return;

  const { error: rpcError } = await supabase.rpc('notify_order_packed', {
    p_order_id: payload.orderId,
    p_marked_by: payload.markedBy,
  });
  if (rpcError) {
    console.error('[notifications] RPC notify_order_packed failed', rpcError);
  }

  await sendOrderPackedNotificationEmail(payload);
}

async function fetchTripContextForOrder(orderUuid: string): Promise<{
  tripNumber: string | null;
  vehicleName: string | null;
  driverName: string | null;
} | null> {
  const { data, error } = await supabase
    .from('trips')
    .select('trip_number, vehicle_name, driver_name')
    .contains('order_ids', [orderUuid])
    .in('status', ['Pending', 'Planned', 'Loading', 'In Transit', 'Delayed'])
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as {
    trip_number?: string | null;
    vehicle_name?: string | null;
    driver_name?: string | null;
  };
  return {
    tripNumber: row.trip_number?.trim() || null,
    vehicleName: row.vehicle_name?.trim() || null,
    driverName: row.driver_name?.trim() || null,
  };
}

export async function buildOrderInTransitNotifyPayload(
  orderUuid: string,
  opts: {
    markedBy?: string | null;
    tripNumber?: string | null;
    vehicleName?: string | null;
    driverName?: string | null;
  },
): Promise<OrderInTransitNotifyPayload | null> {
  const order = await fetchOrderDetailSnapshotForNotify(orderUuid);
  if (!order) return null;

  const branchId = order.branchId?.trim();
  const warehouseEmails = branchId ? await fetchBranchWarehouseEmails(branchId) : [];
  const agentEmail = order.agentId?.trim() ? await fetchAgentEmail(order.agentId) : null;

  let tripNumber = opts.tripNumber ?? null;
  let vehicleName = opts.vehicleName ?? null;
  let driverName = opts.driverName ?? null;
  if (!tripNumber && !vehicleName && !driverName) {
    const ctx = await fetchTripContextForOrder(orderUuid);
    if (ctx) {
      tripNumber = ctx.tripNumber;
      vehicleName = ctx.vehicleName;
      driverName = ctx.driverName;
    }
  }

  const base = buildOrderNotifyPayload({ ...order, status: 'In Transit' }, orderUuid);
  return {
    ...base,
    markedBy: opts.markedBy ?? null,
    tripNumber,
    vehicleName,
    driverName,
    branchId: branchId ?? null,
    warehouseEmails,
    agentEmail,
  };
}

async function sendOrderInTransitNotificationEmail(
  payload: OrderInTransitNotifyPayload,
  notifyTarget: 'executive' | 'warehouse' | 'agent',
): Promise<void> {
  try {
    const res = await notifyFetch('/api/notifications/order-in-transit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, notifyTarget }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[notifications] Order in transit email failed', notifyTarget, body);
    }
  } catch (e) {
    console.warn('[notifications] Order in transit email API unreachable', notifyTarget, e);
  }
}

export async function buildOrderCustomerInTransitNotifyPayload(
  orderUuid: string,
  opts: {
    tripNumber?: string | null;
    vehicleName?: string | null;
    driverName?: string | null;
  },
): Promise<OrderCustomerInTransitNotifyPayload | null> {
  const order = await fetchOrderDetailSnapshotForNotify(orderUuid);
  if (!order) return null;

  const base = await buildOrderCustomerNotifyPayload(order, orderUuid, { status: 'In Transit' });
  if (!base) return null;

  let tripNumber = opts.tripNumber ?? null;
  let vehicleName = opts.vehicleName ?? null;
  let driverName = opts.driverName ?? null;
  if (!tripNumber && !vehicleName && !driverName) {
    const ctx = await fetchTripContextForOrder(orderUuid);
    if (ctx) {
      tripNumber = ctx.tripNumber;
      vehicleName = ctx.vehicleName;
      driverName = ctx.driverName;
    }
  }

  return {
    ...base,
    tripNumber,
    vehicleName,
    driverName,
  };
}

async function sendOrderCustomerInTransitNotificationEmail(
  payload: OrderCustomerInTransitNotifyPayload,
): Promise<boolean> {
  try {
    const res = await notifyFetch('/api/notifications/order-in-transit-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[notifications] Customer in transit email failed', body);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[notifications] Customer in transit email API unreachable', e);
    return false;
  }
}

export async function notifyCustomerOrderInTransit(
  orderUuid: string,
  opts: {
    tripNumber?: string | null;
    vehicleName?: string | null;
    driverName?: string | null;
  } = {},
): Promise<void> {
  const payload = await buildOrderCustomerInTransitNotifyPayload(orderUuid, opts);
  if (!payload?.customerEmail?.trim()) return;

  const sent = await sendOrderCustomerInTransitNotificationEmail(payload);
  if (sent && payload.portalId) {
    await recordOrderPortalEmailSent(payload.portalId, payload.customerEmail);
  }
}

export async function notifyOrderInTransit(
  orderUuid: string,
  opts: {
    markedBy?: string | null;
    tripNumber?: string | null;
    vehicleName?: string | null;
    driverName?: string | null;
  } = {},
): Promise<void> {
  const payload = await buildOrderInTransitNotifyPayload(orderUuid, opts);
  if (!payload) return;

  const { error: rpcError } = await supabase.rpc('notify_order_in_transit', {
    p_order_id: payload.orderId,
    p_marked_by: payload.markedBy,
    p_trip_number: payload.tripNumber,
    p_vehicle_name: payload.vehicleName,
    p_driver_name: payload.driverName,
  });
  if (rpcError) {
    console.error('[notifications] RPC notify_order_in_transit failed', rpcError);
  }

  await sendOrderInTransitNotificationEmail(payload, 'executive');
  if (payload.warehouseEmails?.length) {
    await sendOrderInTransitNotificationEmail(payload, 'warehouse');
  }
  if (payload.agentEmail?.trim()) {
    await sendOrderInTransitNotificationEmail(payload, 'agent');
  }

  await notifyCustomerOrderInTransit(orderUuid, {
    tripNumber: payload.tripNumber,
    vehicleName: payload.vehicleName,
    driverName: payload.driverName,
  });
}

export async function buildOrderDeliveryRecordedNotifyPayload(
  orderUuid: string,
  opts: {
    recordedBy?: string | null;
    tripNumber?: string | null;
  },
): Promise<OrderDeliveryRecordedNotifyPayload | null> {
  const order = await fetchOrderDetailSnapshotForNotify(orderUuid);
  if (!order) return null;

  if (order.status !== 'Delivered' && order.status !== 'Partially Fulfilled') {
    console.warn('[notifications] Cannot notify delivery — order status is', order.status);
    return null;
  }

  let tripNumber = opts.tripNumber ?? null;
  if (!tripNumber) {
    const ctx = await fetchTripContextForOrder(orderUuid);
    tripNumber = ctx?.tripNumber ?? null;
  }

  const agentEmail = order.agentId?.trim() ? await fetchAgentEmail(order.agentId) : null;
  const base = buildOrderNotifyPayload(order, orderUuid);
  return {
    ...base,
    recordedBy: opts.recordedBy ?? null,
    tripNumber,
    actualDelivery: order.actualDelivery ?? null,
    agentEmail,
  };
}

async function sendOrderDeliveryRecordedNotificationEmail(
  payload: OrderDeliveryRecordedNotifyPayload,
  notifyTarget: 'executive' | 'agent',
): Promise<void> {
  try {
    const res = await notifyFetch('/api/notifications/order-delivery-recorded', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, notifyTarget }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[notifications] Order delivery recorded email failed', notifyTarget, body);
    }
  } catch (e) {
    console.warn('[notifications] Order delivery recorded email API unreachable', notifyTarget, e);
  }
}

export async function buildOrderCustomerDeliveryRecordedNotifyPayload(
  orderUuid: string,
  opts: {
    tripNumber?: string | null;
  } = {},
): Promise<OrderCustomerDeliveryRecordedNotifyPayload | null> {
  const order = await fetchOrderDetailSnapshotForNotify(orderUuid);
  if (!order) return null;

  if (order.status !== 'Delivered' && order.status !== 'Partially Fulfilled') {
    return null;
  }

  const base = await buildOrderCustomerNotifyPayload(order, orderUuid, { status: order.status });
  if (!base) return null;

  let tripNumber = opts.tripNumber ?? null;
  if (!tripNumber) {
    const ctx = await fetchTripContextForOrder(orderUuid);
    tripNumber = ctx?.tripNumber ?? null;
  }

  return {
    ...base,
    tripNumber,
    actualDelivery: order.actualDelivery ?? null,
  };
}

async function sendOrderCustomerDeliveryRecordedNotificationEmail(
  payload: OrderCustomerDeliveryRecordedNotifyPayload,
): Promise<boolean> {
  try {
    const res = await notifyFetch('/api/notifications/order-delivery-recorded-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[notifications] Customer delivery recorded email failed', body);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[notifications] Customer delivery recorded email API unreachable', e);
    return false;
  }
}

export async function notifyCustomerOrderDeliveryRecorded(
  orderUuid: string,
  opts: { tripNumber?: string | null } = {},
): Promise<void> {
  const payload = await buildOrderCustomerDeliveryRecordedNotifyPayload(orderUuid, opts);
  if (!payload?.customerEmail?.trim()) return;

  const sent = await sendOrderCustomerDeliveryRecordedNotificationEmail(payload);
  if (sent && payload.portalId) {
    await recordOrderPortalEmailSent(payload.portalId, payload.customerEmail);
  }
}

export async function buildOrderCustomerPaymentRecordedNotifyPayload(
  orderUuid: string,
  opts: {
    paymentCash: number;
    paymentCredit: number;
  },
): Promise<OrderCustomerPaymentRecordedNotifyPayload | null> {
  const order = await fetchOrderDetailSnapshotForNotify(orderUuid);
  if (!order) return null;

  const paymentAmount = Math.max(0, opts.paymentCash) + Math.max(0, opts.paymentCredit);
  if (paymentAmount <= 0) return null;

  const base = await buildOrderCustomerNotifyPayload(order, orderUuid, { status: order.status });
  if (!base) return null;

  return {
    ...base,
    paymentCash: Math.max(0, opts.paymentCash),
    paymentCredit: Math.max(0, opts.paymentCredit),
    paymentAmount,
    amountPaid: order.amountPaid,
    balanceDue: order.balanceDue,
    paymentStatus: order.paymentStatus,
  };
}

async function sendOrderCustomerPaymentRecordedNotificationEmail(
  payload: OrderCustomerPaymentRecordedNotifyPayload,
): Promise<boolean> {
  try {
    const res = await notifyFetch('/api/notifications/order-payment-recorded-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[notifications] Customer payment recorded email failed', body);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[notifications] Customer payment recorded email API unreachable', e);
    return false;
  }
}

export async function notifyCustomerOrderPaymentRecorded(
  orderUuid: string,
  opts: {
    paymentCash: number;
    paymentCredit: number;
  },
): Promise<void> {
  const payload = await buildOrderCustomerPaymentRecordedNotifyPayload(orderUuid, opts);
  if (!payload?.customerEmail?.trim()) return;

  const sent = await sendOrderCustomerPaymentRecordedNotificationEmail(payload);
  if (sent && payload.portalId) {
    await recordOrderPortalEmailSent(payload.portalId, payload.customerEmail);
  }
}

export async function notifyOrderDeliveryRecorded(
  orderUuid: string,
  opts: {
    recordedBy?: string | null;
    tripNumber?: string | null;
  } = {},
): Promise<void> {
  const payload = await buildOrderDeliveryRecordedNotifyPayload(orderUuid, opts);
  if (!payload) return;

  const { error: rpcError } = await supabase.rpc('notify_order_delivery_recorded', {
    p_order_id: payload.orderId,
    p_recorded_by: payload.recordedBy,
    p_trip_number: payload.tripNumber,
  });
  if (rpcError) {
    console.error('[notifications] RPC notify_order_delivery_recorded failed', rpcError);
  }

  await sendOrderDeliveryRecordedNotificationEmail(payload, 'executive');
  if (payload.agentEmail?.trim()) {
    await sendOrderDeliveryRecordedNotificationEmail(payload, 'agent');
  }

  await notifyCustomerOrderDeliveryRecorded(orderUuid, {
    tripNumber: payload.tripNumber,
  });
}

function isUploaderAssignedAgent(order: OrderDetail, uploaderEmployeeId?: string | null): boolean {
  const agentId = order.agentId?.trim();
  const uploaderId = uploaderEmployeeId?.trim();
  return Boolean(agentId && uploaderId && agentId === uploaderId);
}

export async function buildOrderDeliveryProofUploadedNotifyPayload(
  orderUuid: string,
  opts: {
    proofType?: 'delivery' | 'other' | 'payment';
    uploadedBy?: string | null;
    proofCount?: number;
    proofTitle?: string | null;
    proofNotes?: string | null;
    paymentCash?: number;
    paymentCredit?: number;
  } = {},
): Promise<OrderDeliveryProofUploadedNotifyPayload | null> {
  const order = await fetchOrderDetailSnapshotForNotify(orderUuid);
  if (!order) return null;

  const agentEmail = order.agentId?.trim() ? await fetchAgentEmail(order.agentId) : null;
  if (!agentEmail?.trim()) return null;

  const base = buildOrderNotifyPayload(order, orderUuid);
  return {
    ...base,
    proofType: opts.proofType ?? 'delivery',
    uploadedBy: opts.uploadedBy ?? null,
    proofCount: Math.max(1, opts.proofCount ?? 1),
    agentEmail,
    proofTitle: opts.proofTitle?.trim() || null,
    proofNotes: opts.proofNotes?.trim() || null,
    paymentCash: opts.paymentCash ?? 0,
    paymentCredit: opts.paymentCredit ?? 0,
    amountPaid: opts.proofType === 'payment' ? order.amountPaid : undefined,
    balanceDue: opts.proofType === 'payment' ? order.balanceDue : undefined,
    paymentStatus: opts.proofType === 'payment' ? order.paymentStatus : undefined,
  };
}

async function sendOrderDeliveryProofUploadedAgentEmail(
  payload: OrderDeliveryProofUploadedNotifyPayload,
): Promise<void> {
  try {
    const res = await notifyFetch('/api/notifications/order-delivery-proof-uploaded-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[notifications] Agent delivery proof uploaded email failed', body);
    }
  } catch (e) {
    console.warn('[notifications] Agent delivery proof uploaded email API unreachable', e);
  }
}

/** Notify assigned agent when delivery, other, or payment proof is uploaded (skipped if the agent uploaded it). */
export async function notifyAgentOrderProofUploaded(
  orderUuid: string,
  opts: {
    proofType: 'delivery' | 'other' | 'payment';
    uploadedBy?: string | null;
    uploaderEmployeeId?: string | null;
    proofCount?: number;
    proofTitle?: string | null;
    proofNotes?: string | null;
    paymentCash?: number;
    paymentCredit?: number;
  },
): Promise<void> {
  const order = await fetchOrderDetailSnapshotForNotify(orderUuid);
  if (!order) return;

  if (isUploaderAssignedAgent(order, opts.uploaderEmployeeId)) {
    return;
  }

  const proofCount = Math.max(1, opts.proofCount ?? 1);
  const rpcName =
    opts.proofType === 'other'
      ? 'notify_agent_order_other_proof_uploaded'
      : opts.proofType === 'payment'
        ? 'notify_agent_order_payment_proof_uploaded'
        : 'notify_agent_order_delivery_proof_uploaded';

  const rpcParams: Record<string, unknown> = {
    p_order_id: orderUuid,
    p_uploaded_by: opts.uploadedBy ?? null,
    p_uploader_employee_id: opts.uploaderEmployeeId ?? null,
    p_proof_count: proofCount,
  };
  if (opts.proofType === 'payment') {
    rpcParams.p_payment_cash = opts.paymentCash ?? 0;
    rpcParams.p_payment_credit = opts.paymentCredit ?? 0;
  }

  const { error: rpcError } = await supabase.rpc(rpcName, rpcParams);
  if (rpcError) {
    console.error(`[notifications] RPC ${rpcName} failed`, rpcError);
  }

  const payload = await buildOrderDeliveryProofUploadedNotifyPayload(orderUuid, {
    proofType: opts.proofType,
    uploadedBy: opts.uploadedBy,
    proofCount,
    proofTitle: opts.proofTitle,
    proofNotes: opts.proofNotes,
    paymentCash: opts.paymentCash,
    paymentCredit: opts.paymentCredit,
  });
  if (payload?.agentEmail?.trim()) {
    await sendOrderDeliveryProofUploadedAgentEmail(payload);
  }
}

/** Notify assigned agent when delivery proof is uploaded (skipped if the agent uploaded it). */
export async function notifyAgentOrderDeliveryProofUploaded(
  orderUuid: string,
  opts: {
    uploadedBy?: string | null;
    uploaderEmployeeId?: string | null;
    proofCount?: number;
    proofTitle?: string | null;
    proofNotes?: string | null;
  } = {},
): Promise<void> {
  return notifyAgentOrderProofUploaded(orderUuid, { ...opts, proofType: 'delivery' });
}

export async function buildOrderPaymentRecordedNotifyPayload(
  orderUuid: string,
  opts: {
    recordedBy?: string | null;
    paymentCash: number;
    paymentCredit: number;
  },
): Promise<OrderPaymentRecordedNotifyPayload | null> {
  const order = await fetchOrderDetailSnapshotForNotify(orderUuid);
  if (!order) return null;

  const paymentAmount = Math.max(0, opts.paymentCash) + Math.max(0, opts.paymentCredit);
  if (paymentAmount <= 0) return null;

  const base = buildOrderNotifyPayload(order, orderUuid);
  return {
    ...base,
    recordedBy: opts.recordedBy ?? null,
    paymentCash: Math.max(0, opts.paymentCash),
    paymentCredit: Math.max(0, opts.paymentCredit),
    paymentAmount,
    amountPaid: order.amountPaid,
    balanceDue: order.balanceDue,
    paymentStatus: order.paymentStatus,
  };
}

async function sendOrderPaymentRecordedExecutiveEmail(
  payload: OrderPaymentRecordedNotifyPayload,
): Promise<void> {
  try {
    const res = await notifyFetch('/api/notifications/order-payment-recorded', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[notifications] Executive payment recorded email failed', body);
    }
  } catch (e) {
    console.warn('[notifications] Executive payment recorded email API unreachable', e);
  }
}

/** Notify agent on payment proof upload and executives when cash/credit > 0. */
export async function notifyOrderPaymentProofRecorded(
  orderUuid: string,
  opts: {
    uploadedBy?: string | null;
    uploaderEmployeeId?: string | null;
    proofCount?: number;
    proofTitle?: string | null;
    proofNotes?: string | null;
    paymentCash: number;
    paymentCredit: number;
  },
): Promise<void> {
  await notifyAgentOrderProofUploaded(orderUuid, {
    proofType: 'payment',
    uploadedBy: opts.uploadedBy,
    uploaderEmployeeId: opts.uploaderEmployeeId,
    proofCount: opts.proofCount,
    proofTitle: opts.proofTitle,
    proofNotes: opts.proofNotes,
    paymentCash: opts.paymentCash,
    paymentCredit: opts.paymentCredit,
  });

  const paymentAmount = Math.max(0, opts.paymentCash) + Math.max(0, opts.paymentCredit);
  if (paymentAmount <= 0) return;

  const { error: rpcError } = await supabase.rpc('notify_executives_order_payment_recorded', {
    p_order_id: orderUuid,
    p_recorded_by: opts.uploadedBy ?? null,
    p_payment_cash: Math.max(0, opts.paymentCash),
    p_payment_credit: Math.max(0, opts.paymentCredit),
  });
  if (rpcError) {
    console.error('[notifications] RPC notify_executives_order_payment_recorded failed', rpcError);
  }

  const payload = await buildOrderPaymentRecordedNotifyPayload(orderUuid, {
    recordedBy: opts.uploadedBy,
    paymentCash: opts.paymentCash,
    paymentCredit: opts.paymentCredit,
  });
  if (payload) {
    await sendOrderPaymentRecordedExecutiveEmail(payload);
  }

  await notifyCustomerOrderPaymentRecorded(orderUuid, {
    paymentCash: opts.paymentCash,
    paymentCredit: opts.paymentCredit,
  });
}

export async function buildOrderPaymentOverdueNotifyPayload(
  orderUuid: string,
  daysOverdue: number,
  notifyTarget: 'executive' | 'agent',
): Promise<OrderPaymentOverdueNotifyPayload | null> {
  const order = await fetchOrderDetailSnapshotForNotify(orderUuid);
  if (!order) return null;

  const dueDt = computeDueDateFromDelivery(order.actualDelivery ?? null, order.paymentTerms ?? null);
  const dueDate = dueDt ? formatDateOnlyLocal(dueDt) : null;
  const agentEmail = order.agentId?.trim() ? await fetchAgentEmail(order.agentId) : null;
  const base = buildOrderNotifyPayload({ ...order, paymentStatus: 'Overdue' }, orderUuid);

  return {
    ...base,
    dueDate,
    daysOverdue,
    amountPaid: order.amountPaid,
    balanceDue: order.balanceDue,
    paymentStatus: 'Overdue',
    notifyTarget,
    agentEmail,
  };
}

export async function buildOrderCustomerPaymentOverdueNotifyPayload(
  orderUuid: string,
  daysOverdue: number,
): Promise<OrderCustomerPaymentOverdueNotifyPayload | null> {
  const order = await fetchOrderDetailSnapshotForNotify(orderUuid);
  if (!order) return null;

  const base = await buildOrderCustomerNotifyPayload(order, orderUuid, { status: order.status });
  if (!base) return null;

  const dueDt = computeDueDateFromDelivery(order.actualDelivery ?? null, order.paymentTerms ?? null);
  const dueDate = dueDt ? formatDateOnlyLocal(dueDt) : null;

  return {
    ...base,
    dueDate,
    daysOverdue,
    amountPaid: order.amountPaid,
    balanceDue: order.balanceDue,
    paymentStatus: 'Overdue',
  };
}

async function sendOrderPaymentOverdueEmail(
  payload: OrderPaymentOverdueNotifyPayload,
  notifyTarget: 'executive' | 'agent',
): Promise<void> {
  try {
    const res = await notifyFetch('/api/notifications/order-payment-overdue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, notifyTarget }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[notifications] Order payment overdue email failed', notifyTarget, body);
    }
  } catch (e) {
    console.warn('[notifications] Order payment overdue email API unreachable', notifyTarget, e);
  }
}

async function sendOrderCustomerPaymentOverdueEmail(
  payload: OrderCustomerPaymentOverdueNotifyPayload,
): Promise<void> {
  try {
    const res = await notifyFetch('/api/notifications/order-payment-overdue-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[notifications] Customer payment overdue email failed', body);
    }
  } catch (e) {
    console.warn('[notifications] Customer payment overdue email API unreachable', e);
  }
}

/** Send overdue emails to executive, agent, and customer for one order. In-app is handled by RPC. */
export async function notifyOrderPaymentOverdueEmails(
  orderUuid: string,
  daysOverdue: number,
): Promise<void> {
  const execPayload = await buildOrderPaymentOverdueNotifyPayload(orderUuid, daysOverdue, 'executive');
  if (execPayload) {
    await sendOrderPaymentOverdueEmail(execPayload, 'executive');
  }

  const agentPayload = await buildOrderPaymentOverdueNotifyPayload(orderUuid, daysOverdue, 'agent');
  if (agentPayload?.agentEmail?.trim()) {
    await sendOrderPaymentOverdueEmail(agentPayload, 'agent');
  }

  const customerPayload = await buildOrderCustomerPaymentOverdueNotifyPayload(orderUuid, daysOverdue);
  if (customerPayload) {
    await sendOrderCustomerPaymentOverdueEmail(customerPayload);
  }
}

/**
 * Mark newly overdue orders (DB RPC), notify executives + agent in-app, then email executive, agent, and customer.
 * Returns map of order UUID → days overdue for orders processed this run.
 */
export async function processNewlyOverdueOrders(): Promise<Map<string, number>> {
  const { data, error } = await supabase.rpc('process_newly_overdue_orders');
  if (error) {
    console.warn('[notifications] RPC process_newly_overdue_orders failed', error);
    return new Map();
  }

  const rows = (data ?? []) as Array<{ order_id: string; days_overdue: number }>;
  const result = new Map<string, number>();

  for (const row of rows) {
    const orderId = String(row.order_id);
    const daysOverdue = Number(row.days_overdue) || 0;
    result.set(orderId, daysOverdue);
    try {
      await notifyOrderPaymentOverdueEmails(orderId, daysOverdue);
    } catch (e) {
      console.warn('[notifications] order payment overdue notify failed', orderId, e);
    }
  }

  if (rows.length > 0) {
    window.dispatchEvent(new Event('lamtex:notifications-refresh'));
  }

  return result;
}

async function fetchCustomerClientTypeForNotify(customerId: string): Promise<string> {
  const { data, error } = await supabase
    .from('customers')
    .select('client_type')
    .eq('id', customerId)
    .maybeSingle();
  if (error) {
    console.warn('[notifications] Could not load customer client type', error);
    return 'Office';
  }
  return String(data?.client_type ?? 'Office');
}

export async function buildOrderCommissionPaidNotifyPayload(
  orderUuid: string,
  opts: {
    paidBy?: string | null;
    cashAmount: number;
    proofCount?: number;
  },
): Promise<OrderCommissionPaidNotifyPayload | null> {
  const order = await fetchOrderDetailSnapshotForNotify(orderUuid);
  if (!order?.agentId?.trim()) return null;

  const agentEmail = await fetchAgentEmail(order.agentId);
  if (!agentEmail?.trim()) return null;

  const clientType = order.customerId?.trim()
    ? await fetchCustomerClientTypeForNotify(order.customerId)
    : 'Office';
  const cashAmount = Math.max(0, opts.cashAmount);
  const proofCount = Math.max(1, opts.proofCount ?? 1);
  const commissionAmount = computeProofCommissionForClientType(cashAmount, clientType);
  const base = buildOrderNotifyPayload(order, orderUuid);

  return {
    ...base,
    paidBy: opts.paidBy ?? null,
    agentEmail,
    commissionAmount,
    cashAmount,
    proofCount,
    amountPaid: order.amountPaid,
    balanceDue: order.balanceDue,
    paymentStatus: order.paymentStatus,
  };
}

async function sendOrderCommissionPaidAgentEmail(payload: OrderCommissionPaidNotifyPayload): Promise<void> {
  try {
    const res = await notifyFetch('/api/notifications/order-commission-paid-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[notifications] Agent commission paid email failed', body);
    }
  } catch (e) {
    console.warn('[notifications] Agent commission paid email API unreachable', e);
  }
}

/** Notify assigned agent when commission is marked paid out on payment proof(s). */
export async function notifyAgentOrderCommissionPaidOut(
  orderUuid: string,
  opts: {
    paidBy?: string | null;
    cashAmount: number;
    proofCount?: number;
  },
): Promise<void> {
  const payload = await buildOrderCommissionPaidNotifyPayload(orderUuid, opts);
  if (!payload) return;

  const { error: rpcError } = await supabase.rpc('notify_agent_order_commission_paid', {
    p_order_id: orderUuid,
    p_paid_by: opts.paidBy ?? null,
    p_commission_amount: payload.commissionAmount,
    p_cash_amount: payload.cashAmount,
    p_proof_count: payload.proofCount,
  });
  if (rpcError) {
    console.error('[notifications] RPC notify_agent_order_commission_paid failed', rpcError);
  }

  await sendOrderCommissionPaidAgentEmail(payload);
}

export async function attachOrderDeliveryProofsAndNotify(
  orderUuid: string,
  proofImageUrls: string[],
  opts: {
    uploadedBy: string;
    uploadedByRole: string;
    title?: string | null;
    notes?: string | null;
    uploaderEmployeeId?: string | null;
  },
): Promise<{ ok: boolean; error?: string; count: number }> {
  const { attachDeliveryProofDocuments } = await import('@/src/lib/orderProofPayments');
  const result = await attachDeliveryProofDocuments(orderUuid, proofImageUrls, opts);
  if (result.ok && result.count > 0) {
    void notifyAgentOrderProofUploaded(orderUuid, {
      proofType: 'delivery',
      uploadedBy: opts.uploadedBy,
      uploaderEmployeeId: opts.uploaderEmployeeId ?? null,
      proofCount: result.count,
      proofTitle: opts.title ?? null,
      proofNotes: opts.notes ?? null,
    }).catch((err) => {
      console.warn('[notifications] agent delivery proof notify failed', err);
    });
  }
  return result;
}

async function fetchAgentContactForNotify(agentId: string): Promise<OrderAgentContact | null> {
  const [empRes, contactRes] = await Promise.all([
    supabase.from('employees').select('employee_name, email, phone').eq('id', agentId).maybeSingle(),
    supabase
      .from('employee_contact_info')
      .select('primary_phone, secondary_phone, work_email, personal_email')
      .eq('employee_id', agentId)
      .maybeSingle(),
  ]);
  if (empRes.error) {
    console.warn('[notifications] Could not load agent profile', empRes.error);
    return null;
  }
  if (!empRes.data) return null;

  const emp = empRes.data as { employee_name?: string; email?: string | null; phone?: string | null };
  const contact = contactRes.data as {
    primary_phone?: string | null;
    secondary_phone?: string | null;
    work_email?: string | null;
    personal_email?: string | null;
  } | null;

  const phone =
    contact?.primary_phone?.trim() ||
    contact?.secondary_phone?.trim() ||
    emp.phone?.trim() ||
    null;
  const email =
    contact?.work_email?.trim() ||
    contact?.personal_email?.trim() ||
    emp.email?.trim() ||
    null;

  return {
    name: emp.employee_name?.trim() || 'Sales agent',
    phone,
    email,
  };
}

async function fetchCustomerContactForNotify(customerId: string): Promise<{
  email: string | null;
  contactPerson: string | null;
  name: string | null;
} | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('email, contact_person, name')
    .eq('id', customerId)
    .maybeSingle();
  if (error) {
    console.warn('[notifications] Could not load customer contact', error);
    return null;
  }
  if (!data) return null;
  const row = data as { email?: string | null; contact_person?: string | null; name?: string | null };
  return {
    email: row.email?.trim() || null,
    contactPerson: row.contact_person?.trim() || null,
    name: row.name?.trim() || null,
  };
}

export async function buildOrderCustomerApprovedNotifyPayload(
  order: OrderDetail,
  orderUuid: string,
  opts: { approvedBy: string | null },
): Promise<OrderCustomerApprovedNotifyPayload | null> {
  return buildOrderCustomerNotifyPayload(order, orderUuid, {
    status: 'Approved',
    approvedBy: opts.approvedBy,
  });
}

async function buildOrderCustomerNotifyPayload(
  order: OrderDetail,
  orderUuid: string,
  opts: {
    status: OrderDetail['status'];
    approvedBy?: string | null;
  },
): Promise<OrderCustomerApprovedNotifyPayload | null> {
  const customerId = order.customerId?.trim();
  if (!customerId) {
    console.warn('[notifications] Cannot email customer — order has no customerId');
    return null;
  }

  const customer = await fetchCustomerContactForNotify(customerId);
  const customerEmail = customer?.email;
  if (!customerEmail) {
    console.warn('[notifications] Skipping customer email — no customer email on file');
    return null;
  }

  const agentId = order.agentId?.trim();
  const agent = agentId ? await fetchAgentContactForNotify(agentId) : null;

  const agentContact: OrderAgentContact = agent ?? {
    name: order.agent?.trim() || 'Your sales agent',
    phone: null,
    email: null,
  };

  const { portal } = await ensureOrderCustomerPortal(orderUuid, customerEmail);

  const base = buildOrderNotifyPayload({ ...order, status: opts.status }, orderUuid);
  return {
    ...base,
    customerEmail,
    customerContactPerson: customer?.contactPerson ?? null,
    approvedBy: opts.approvedBy ?? null,
    agent: agentContact,
    portalToken: portal?.token ?? null,
    portalId: portal?.id ?? null,
  };
}

export async function buildOrderCustomerScheduledNotifyPayload(
  orderUuid: string,
  opts: {
    scheduledDate?: string | null;
    tripNumber?: string | null;
  },
): Promise<OrderCustomerScheduledNotifyPayload | null> {
  const order = await fetchOrderDetailSnapshotForNotify(orderUuid);
  if (!order) return null;

  const base = await buildOrderCustomerNotifyPayload(order, orderUuid, { status: 'Scheduled' });
  if (!base) return null;

  return {
    ...base,
    scheduledDate: opts.scheduledDate ?? order.scheduledDepartureDate ?? null,
    tripNumber: opts.tripNumber ?? null,
  };
}

export async function buildOrderCustomerUnscheduledNotifyPayload(
  orderUuid: string,
  opts: {
    previousScheduledDate?: string | null;
  },
): Promise<OrderCustomerUnscheduledNotifyPayload | null> {
  const order = await fetchOrderDetailSnapshotForNotify(orderUuid);
  if (!order) return null;

  const base = await buildOrderCustomerNotifyPayload(order, orderUuid, { status: 'Approved' });
  if (!base) return null;

  return {
    ...base,
    previousScheduledDate: opts.previousScheduledDate ?? null,
  };
}

async function sendOrderCustomerScheduledNotificationEmail(
  payload: OrderCustomerScheduledNotifyPayload,
): Promise<boolean> {
  try {
    const res = await notifyFetch('/api/notifications/order-scheduled-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[notifications] Customer scheduled email failed', body);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[notifications] Customer scheduled email API unreachable', e);
    return false;
  }
}

async function sendOrderCustomerUnscheduledNotificationEmail(
  payload: OrderCustomerUnscheduledNotifyPayload,
): Promise<boolean> {
  try {
    const res = await notifyFetch('/api/notifications/order-unscheduled-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[notifications] Customer unscheduled email failed', body);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[notifications] Customer unscheduled email API unreachable', e);
    return false;
  }
}

export async function notifyCustomerOrderScheduled(
  orderUuid: string,
  opts: {
    scheduledDate?: string | null;
    tripNumber?: string | null;
  },
): Promise<void> {
  const payload = await buildOrderCustomerScheduledNotifyPayload(orderUuid, opts);
  if (!payload?.customerEmail?.trim()) return;

  const sent = await sendOrderCustomerScheduledNotificationEmail(payload);
  if (sent && payload.portalId) {
    await recordOrderPortalEmailSent(payload.portalId, payload.customerEmail);
  }
}

export async function notifyCustomerOrdersScheduled(
  orderUuids: string[],
  opts: {
    scheduledDate?: string | null;
    tripNumber?: string | null;
  },
): Promise<void> {
  for (const orderUuid of orderUuids) {
    try {
      await notifyCustomerOrderScheduled(orderUuid, opts);
    } catch (e) {
      console.warn('[notifications] customer scheduled notify failed', orderUuid, e);
    }
  }
}

export async function notifyCustomerOrderUnscheduled(
  orderUuid: string,
  opts: {
    previousScheduledDate?: string | null;
  },
): Promise<void> {
  const payload = await buildOrderCustomerUnscheduledNotifyPayload(orderUuid, opts);
  if (!payload?.customerEmail?.trim()) return;

  const sent = await sendOrderCustomerUnscheduledNotificationEmail(payload);
  if (sent && payload.portalId) {
    await recordOrderPortalEmailSent(payload.portalId, payload.customerEmail);
  }
}

export async function notifyCustomerOrdersUnscheduledFromTrip(
  orderUuids: string[],
  previousDatesByOrderId: Record<string, string | null | undefined>,
): Promise<void> {
  for (const orderUuid of orderUuids) {
    try {
      await notifyCustomerOrderUnscheduled(orderUuid, {
        previousScheduledDate: previousDatesByOrderId[orderUuid] ?? null,
      });
    } catch (e) {
      console.warn('[notifications] customer unscheduled notify failed', orderUuid, e);
    }
  }
}

async function sendOrderCustomerApprovedNotificationEmail(
  payload: OrderCustomerApprovedNotifyPayload,
): Promise<boolean> {
  try {
    const res = await notifyFetch('/api/notifications/order-approved-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[notifications] Customer approval email failed', body);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[notifications] Customer approval email API unreachable', e);
    return false;
  }
}

export async function notifyCustomerOrderApproved(
  payload: OrderCustomerApprovedNotifyPayload,
): Promise<void> {
  if (!payload.customerEmail?.trim()) return;

  const sent = await sendOrderCustomerApprovedNotificationEmail(payload);
  if (sent && payload.portalId) {
    await recordOrderPortalEmailSent(payload.portalId, payload.customerEmail);
  }
}

async function sendOrderCustomerPortalShareNotificationEmail(
  payload: OrderCustomerPortalShareNotifyPayload,
): Promise<boolean> {
  try {
    const res = await notifyFetch('/api/notifications/order-portal-share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[notifications] Customer portal share email failed', body);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[notifications] Customer portal share email API unreachable', e);
    return false;
  }
}

/** Sends the customer order portal link to the given email (manual share from order detail). */
export async function sendOrderCustomerPortalShareEmail(
  orderUuid: string,
  email: string,
  portal: { id: string; token: string },
): Promise<{ ok: boolean; error?: string }> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    return { ok: false, error: 'Email is required' };
  }

  const order = await fetchOrderDetailSnapshotForNotify(orderUuid);
  if (!order) {
    return { ok: false, error: 'Could not load order details' };
  }

  const customerId = order.customerId?.trim();
  let customerContactPerson: string | null = null;
  if (customerId) {
    const customer = await fetchCustomerContactForNotify(customerId);
    customerContactPerson = customer?.contactPerson ?? null;
  }

  const agentId = order.agentId?.trim();
  const agent = agentId ? await fetchAgentContactForNotify(agentId) : null;
  const agentContact: OrderAgentContact = agent ?? {
    name: order.agent?.trim() || 'Your sales agent',
    phone: null,
    email: null,
  };

  const base = buildOrderNotifyPayload(order, orderUuid);
  const payload: OrderCustomerPortalShareNotifyPayload = {
    ...base,
    customerEmail: trimmedEmail,
    customerContactPerson,
    agent: agentContact,
    portalToken: portal.token,
    portalId: portal.id,
  };

  const sent = await sendOrderCustomerPortalShareNotificationEmail(payload);
  if (!sent) {
    return { ok: false, error: 'Email could not be sent. Check that the notification server is running.' };
  }

  await recordOrderPortalEmailSent(portal.id, trimmedEmail);
  return { ok: true };
}

export async function buildOrderCancelledNotifyPayload(
  order: OrderDetail,
  orderUuid: string,
  opts: {
    cancelledBy: string | null;
    cancelledByRole: 'agent' | 'executive';
    cancellationReason: string;
    additionalNotes?: string | null;
  },
): Promise<OrderCancelledNotifyPayload> {
  const notifyTarget: 'agent' | 'executive' = opts.cancelledByRole === 'agent' ? 'executive' : 'agent';
  const base = buildOrderNotifyPayload({ ...order, status: 'Cancelled' }, orderUuid);
  const agentEmail =
    notifyTarget === 'agent' && order.agentId?.trim()
      ? await fetchAgentEmail(order.agentId)
      : null;
  return {
    ...base,
    cancelledBy: opts.cancelledBy,
    cancelledByRole: opts.cancelledByRole,
    cancellationReason: opts.cancellationReason,
    additionalNotes: opts.additionalNotes ?? null,
    notifyTarget,
    agentEmail,
  };
}

async function sendOrderCancelledNotificationEmail(payload: OrderCancelledNotifyPayload): Promise<void> {
  try {
    const res = await notifyFetch('/api/notifications/order-cancelled', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[notifications] Order cancelled email failed', body);
    }
  } catch (e) {
    console.warn('[notifications] Order cancelled email API unreachable', e);
  }
}

export async function notifyOrderCancelled(payload: OrderCancelledNotifyPayload): Promise<void> {
  if (payload.cancelledByRole === 'agent') {
    const { error: rpcError } = await supabase.rpc('notify_executives_order_cancelled', {
      p_order_id: payload.orderId,
      p_cancelled_by: payload.cancelledBy,
      p_cancellation_reason: payload.cancellationReason,
    });
    if (rpcError) {
      console.error('[notifications] RPC notify_executives_order_cancelled failed', rpcError);
    }
  } else {
    const { error: rpcError } = await supabase.rpc('notify_agent_order_cancelled', {
      p_order_id: payload.orderId,
      p_cancelled_by: payload.cancelledBy,
      p_cancellation_reason: payload.cancellationReason,
    });
    if (rpcError) {
      console.error('[notifications] RPC notify_agent_order_cancelled failed', rpcError);
    }
  }
  await sendOrderCancelledNotificationEmail(payload);
}

export async function buildOrderCancelledFromTripNotifyPayload(
  orderUuid: string,
  opts: {
    cancelledBy: string | null;
    cancellationReason: string;
    additionalNotes?: string | null;
    tripNumber: string;
  },
): Promise<OrderCancelledFromTripNotifyPayload | null> {
  const order = await fetchOrderDetailSnapshotForNotify(orderUuid);
  if (!order) return null;

  const branchId = order.branchId?.trim();
  const logisticsEmails = branchId ? await fetchBranchLogisticsEmails(branchId) : [];
  const executiveEmails = await fetchEmailsForRoles(['Executive']);
  const agentEmail = order.agentId?.trim() ? await fetchAgentEmail(order.agentId) : null;
  const base = buildOrderNotifyPayload({ ...order, status: 'Cancelled' }, orderUuid);

  return {
    ...base,
    cancelledBy: opts.cancelledBy,
    cancellationReason: opts.cancellationReason,
    additionalNotes: opts.additionalNotes ?? null,
    tripNumber: opts.tripNumber,
    agentEmail,
    logisticsEmails,
    executiveEmails,
  };
}

async function sendOrderCancelledFromTripStaffEmail(
  payload: OrderCancelledFromTripNotifyPayload,
  notifyTarget: 'agent' | 'executive' | 'logistics',
): Promise<void> {
  try {
    const res = await notifyFetch('/api/notifications/order-cancelled', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        cancelledByRole: 'logistics',
        notifyTarget,
        tripNumber: payload.tripNumber,
        logisticsEmails: payload.logisticsEmails,
        executiveEmails: payload.executiveEmails,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[notifications] Order cancelled from trip email failed', notifyTarget, body);
    }
  } catch (e) {
    console.warn('[notifications] Order cancelled from trip email API unreachable', notifyTarget, e);
  }
}

async function sendOrderCustomerCancelledNotificationEmail(
  payload: OrderCustomerCancelledNotifyPayload,
): Promise<boolean> {
  try {
    const res = await notifyFetch('/api/notifications/order-cancelled-customer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[notifications] Customer cancellation email failed', body);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[notifications] Customer cancellation email API unreachable', e);
    return false;
  }
}

export async function buildOrderCustomerCancelledNotifyPayload(
  orderUuid: string,
  opts: {
    cancellationReason: string;
    cancelledBy?: string | null;
    tripNumber?: string | null;
  },
): Promise<OrderCustomerCancelledNotifyPayload | null> {
  const order = await fetchOrderDetailSnapshotForNotify(orderUuid);
  if (!order) return null;

  const base = await buildOrderCustomerNotifyPayload(order, orderUuid, { status: 'Cancelled' });
  if (!base) return null;

  return {
    ...base,
    cancellationReason: opts.cancellationReason,
    cancelledBy: opts.cancelledBy ?? null,
    tripNumber: opts.tripNumber ?? null,
  };
}

/** Cancel from trip: notify agent, logistics, executives in-app; email all staff + optional customer. */
export async function notifyOrderCancelledFromTrip(
  orderUuid: string,
  opts: {
    cancelledBy: string | null;
    cancellationReason: string;
    additionalNotes?: string | null;
    tripNumber: string;
    notifyCustomer: boolean;
  },
): Promise<void> {
  const { error: rpcError } = await supabase.rpc('notify_order_cancelled_from_trip', {
    p_order_id: orderUuid,
    p_cancelled_by: opts.cancelledBy,
    p_cancellation_reason: opts.cancellationReason,
    p_trip_number: opts.tripNumber,
  });
  if (rpcError) {
    console.error('[notifications] RPC notify_order_cancelled_from_trip failed', rpcError);
  }

  const payload = await buildOrderCancelledFromTripNotifyPayload(orderUuid, opts);
  if (payload) {
    if (payload.agentEmail?.trim()) {
      await sendOrderCancelledFromTripStaffEmail(payload, 'agent');
    }
    if (payload.logisticsEmails.length) {
      await sendOrderCancelledFromTripStaffEmail(payload, 'logistics');
    }
    if (payload.executiveEmails.length) {
      await sendOrderCancelledFromTripStaffEmail(payload, 'executive');
    }
  }

  if (opts.notifyCustomer) {
    const customerPayload = await buildOrderCustomerCancelledNotifyPayload(orderUuid, {
      cancellationReason: opts.cancellationReason,
      cancelledBy: opts.cancelledBy,
      tripNumber: opts.tripNumber,
    });
    if (customerPayload?.customerEmail?.trim()) {
      const sent = await sendOrderCustomerCancelledNotificationEmail(customerPayload);
      if (sent && customerPayload.portalId) {
        await recordOrderPortalEmailSent(customerPayload.portalId, customerPayload.customerEmail);
      }
    }
  }

  window.dispatchEvent(new Event('lamtex:notifications-refresh'));
}

export async function buildOrderScheduledNotifyPayload(
  orderUuid: string,
  opts: {
    scheduledBy?: string | null;
    tripNumber?: string | null;
    scheduledDate?: string | null;
    vehicleName?: string | null;
    driverName?: string | null;
  },
): Promise<OrderScheduledNotifyPayload | null> {
  const order = await fetchOrderDetailSnapshotForNotify(orderUuid);
  if (!order) return null;

  const branchId = order.branchId?.trim();
  const warehouseEmails = branchId ? await fetchBranchWarehouseEmails(branchId) : [];
  const agentEmail = order.agentId?.trim() ? await fetchAgentEmail(order.agentId) : null;

  const base = buildOrderNotifyPayload({ ...order, status: 'Scheduled' }, orderUuid);
  return {
    ...base,
    deliveryAddress: null,
    scheduledBy: opts.scheduledBy ?? null,
    tripNumber: opts.tripNumber ?? null,
    scheduledDate: opts.scheduledDate ?? order.scheduledDepartureDate ?? null,
    vehicleName: opts.vehicleName ?? null,
    driverName: opts.driverName ?? null,
    branchId: branchId ?? null,
    warehouseEmails,
    agentEmail,
  };
}

async function sendOrderScheduledNotificationEmail(
  payload: OrderScheduledNotifyPayload,
  notifyTarget: 'executive' | 'warehouse' | 'agent',
): Promise<void> {
  try {
    const res = await notifyFetch('/api/notifications/order-scheduled', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, notifyTarget }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[notifications] Order scheduled email failed', notifyTarget, body);
    }
  } catch (e) {
    console.warn('[notifications] Order scheduled email API unreachable', notifyTarget, e);
  }
}

export async function notifyOrderScheduled(
  orderUuid: string,
  opts: {
    scheduledBy?: string | null;
    tripNumber?: string | null;
    scheduledDate?: string | null;
    vehicleName?: string | null;
    driverName?: string | null;
  },
): Promise<void> {
  const payload = await buildOrderScheduledNotifyPayload(orderUuid, opts);
  if (!payload) return;

  const { error: rpcError } = await supabase.rpc('notify_order_scheduled', {
    p_order_id: payload.orderId,
    p_scheduled_by: payload.scheduledBy,
    p_trip_number: payload.tripNumber,
    p_scheduled_date: payload.scheduledDate,
    p_vehicle_name: payload.vehicleName,
    p_driver_name: payload.driverName,
  });
  if (rpcError) {
    console.error('[notifications] RPC notify_order_scheduled failed', rpcError);
  }

  await sendOrderScheduledNotificationEmail(payload, 'executive');
  if (payload.warehouseEmails?.length) {
    await sendOrderScheduledNotificationEmail(payload, 'warehouse');
  }
  if (payload.agentEmail?.trim()) {
    await sendOrderScheduledNotificationEmail(payload, 'agent');
  }

  await notifyCustomerOrderScheduled(orderUuid, {
    scheduledDate: payload.scheduledDate,
    tripNumber: payload.tripNumber,
  });
}

export async function notifyOrdersScheduled(
  orderUuids: string[],
  opts: {
    scheduledBy?: string | null;
    tripNumber?: string | null;
    scheduledDate?: string | null;
    vehicleName?: string | null;
    driverName?: string | null;
  },
): Promise<void> {
  for (const orderUuid of orderUuids) {
    try {
      await notifyOrderScheduled(orderUuid, opts);
    } catch (e) {
      console.warn('[notifications] order scheduled notify failed', orderUuid, e);
    }
  }
}

export async function buildOrderUnscheduledFromTripNotifyPayload(
  orderUuid: string,
  opts: {
    unscheduledBy?: string | null;
    tripNumber?: string | null;
    previousScheduledDate?: string | null;
    cancellationReason?: string | null;
  },
): Promise<OrderUnscheduledFromTripNotifyPayload | null> {
  const order = await fetchOrderDetailSnapshotForNotify(orderUuid);
  if (!order) return null;

  const branchId = order.branchId?.trim();
  const warehouseEmails = branchId ? await fetchBranchWarehouseEmails(branchId) : [];
  const agentEmail = order.agentId?.trim() ? await fetchAgentEmail(order.agentId) : null;

  const base = buildOrderNotifyPayload({ ...order, status: 'Approved' }, orderUuid);
  return {
    ...base,
    unscheduledBy: opts.unscheduledBy ?? null,
    tripNumber: opts.tripNumber ?? null,
    previousScheduledDate: opts.previousScheduledDate ?? order.scheduledDepartureDate ?? null,
    cancellationReason: opts.cancellationReason ?? null,
    branchId: branchId ?? null,
    warehouseEmails,
    agentEmail,
  };
}

async function sendOrderUnscheduledFromTripNotificationEmail(
  payload: OrderUnscheduledFromTripNotifyPayload,
  notifyTarget: 'executive' | 'warehouse' | 'agent',
): Promise<void> {
  try {
    const res = await notifyFetch('/api/notifications/order-unscheduled-from-trip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, notifyTarget }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[notifications] Order unscheduled from trip email failed', notifyTarget, body);
    }
  } catch (e) {
    console.warn('[notifications] Order unscheduled from trip email API unreachable', notifyTarget, e);
  }
}

export async function notifyOrderUnscheduledFromTrip(
  orderUuid: string,
  opts: {
    unscheduledBy?: string | null;
    tripNumber?: string | null;
    previousScheduledDate?: string | null;
    cancellationReason?: string | null;
  },
): Promise<void> {
  const payload = await buildOrderUnscheduledFromTripNotifyPayload(orderUuid, opts);
  if (!payload) return;

  const { error: rpcError } = await supabase.rpc('notify_order_unscheduled_from_trip', {
    p_order_id: payload.orderId,
    p_trip_number: payload.tripNumber,
    p_previous_scheduled_date: payload.previousScheduledDate,
    p_unscheduled_by: payload.unscheduledBy,
    p_cancellation_reason: payload.cancellationReason,
  });
  if (rpcError) {
    console.error('[notifications] RPC notify_order_unscheduled_from_trip failed', rpcError);
  }

  await sendOrderUnscheduledFromTripNotificationEmail(payload, 'executive');
  if (payload.warehouseEmails?.length) {
    await sendOrderUnscheduledFromTripNotificationEmail(payload, 'warehouse');
  }
  if (payload.agentEmail?.trim()) {
    await sendOrderUnscheduledFromTripNotificationEmail(payload, 'agent');
  }
}

export async function buildOrderCustomerTripCancelledNotifyPayload(
  orderUuid: string,
  opts: {
    tripNumber?: string | null;
    tripScheduledDate?: string | null;
    cancellationReason?: string | null;
  },
): Promise<OrderCustomerTripCancelledNotifyPayload | null> {
  const order = await fetchOrderDetailSnapshotForNotify(orderUuid);
  if (!order) return null;

  const base = await buildOrderCustomerNotifyPayload(order, orderUuid, { status: order.status });
  if (!base) return null;

  return {
    ...base,
    tripNumber: opts.tripNumber ?? null,
    tripScheduledDate: opts.tripScheduledDate ?? null,
    cancellationReason: opts.cancellationReason ?? null,
  };
}

async function sendOrderCustomerTripCancelledNotificationEmail(
  payload: OrderCustomerTripCancelledNotifyPayload,
): Promise<boolean> {
  try {
    const res = await notifyFetch('/api/notifications/order-customer-trip-cancelled', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[notifications] Customer trip cancelled email failed', body);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[notifications] Customer trip cancelled email API unreachable', e);
    return false;
  }
}

export async function notifyCustomerOrderTripCancelled(
  orderUuid: string,
  opts: {
    tripNumber?: string | null;
    tripScheduledDate?: string | null;
    cancellationReason?: string | null;
  },
): Promise<void> {
  const payload = await buildOrderCustomerTripCancelledNotifyPayload(orderUuid, opts);
  if (!payload?.customerEmail?.trim()) return;

  const sent = await sendOrderCustomerTripCancelledNotificationEmail(payload);
  if (sent && payload.portalId) {
    await recordOrderPortalEmailSent(payload.portalId, payload.customerEmail);
  }
}

export async function notifyCustomerOrdersTripCancelled(
  orderUuids: string[],
  opts: {
    tripNumber?: string | null;
    tripScheduledDate?: string | null;
    cancellationReason?: string | null;
  },
): Promise<void> {
  for (const orderUuid of orderUuids) {
    try {
      await notifyCustomerOrderTripCancelled(orderUuid, opts);
    } catch (e) {
      console.warn('[notifications] customer trip cancelled notify failed', orderUuid, e);
    }
  }
}

export async function notifyOrdersUnscheduledFromTripCancel(
  orderUuids: string[],
  opts: {
    unscheduledBy?: string | null;
    tripNumber?: string | null;
    previousDatesByOrderId?: Record<string, string | null | undefined>;
    cancellationReason?: string | null;
  },
): Promise<void> {
  for (const orderUuid of orderUuids) {
    try {
      await notifyOrderUnscheduledFromTrip(orderUuid, {
        unscheduledBy: opts.unscheduledBy ?? null,
        tripNumber: opts.tripNumber ?? null,
        previousScheduledDate: opts.previousDatesByOrderId?.[orderUuid] ?? null,
        cancellationReason: opts.cancellationReason ?? null,
      });
    } catch (e) {
      console.warn('[notifications] order unscheduled from trip cancel failed', orderUuid, e);
    }
  }
}

export async function buildTripCancelledNotifyPayload(
  tripId: string,
  opts: { cancelledBy?: string | null; cancellationReason?: string | null },
): Promise<TripCancelledNotifyPayload | null> {
  const { data, error } = await supabase
    .from('trips')
    .select(`
      id, trip_number, scheduled_date, vehicle_name, driver_id, driver_name, order_ids, branch_id,
      branches(name)
    `)
    .eq('id', tripId)
    .maybeSingle();

  if (error || !data) {
    console.warn('[notifications] Could not load trip for cancel notify', error);
    return null;
  }

  const trip = data as Record<string, unknown>;
  const orderIds = Array.isArray(trip.order_ids) ? (trip.order_ids as string[]) : [];
  let orderNumbers: string[] = [];
  if (orderIds.length > 0) {
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_number')
      .in('id', orderIds);
    const byId = new Map(
      (orders ?? []).map((row) => {
        const r = row as { id?: string; order_number?: string | null };
        return [String(r.id ?? ''), String(r.order_number ?? '')] as const;
      }),
    );
    orderNumbers = orderIds.map((id) => byId.get(id) || id).filter(Boolean);
  }

  const branchId = (trip.branch_id as string | null)?.trim() || null;
  const logisticsEmails = branchId ? await fetchBranchLogisticsEmails(branchId) : [];
  const driverId = (trip.driver_id as string | null)?.trim() || null;
  const driverContact = driverId ? await fetchEmployeeNotifyContact(driverId) : { name: null, email: null };

  return {
    tripId,
    tripNumber: String(trip.trip_number ?? ''),
    scheduledDate: trip.scheduled_date ? String(trip.scheduled_date).slice(0, 10) : null,
    vehicleName: (trip.vehicle_name as string | null) ?? null,
    driverName: (trip.driver_name as string | null)?.trim() || driverContact.name,
    driverEmail: driverContact.email,
    branchName: (trip.branches as { name?: string } | null)?.name ?? null,
    branchId,
    logisticsEmails,
    orderCount: orderIds.length,
    orderNumbers,
    cancelledBy: opts.cancelledBy ?? null,
    cancellationReason: opts.cancellationReason ?? null,
  };
}

async function sendTripCancelledNotificationEmail(
  payload: TripCancelledNotifyPayload,
  notifyTarget: 'logistics' | 'driver',
): Promise<void> {
  try {
    const res = await notifyFetch('/api/notifications/trip-cancelled', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, notifyTarget }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[notifications] Trip cancelled email failed', notifyTarget, body);
    }
  } catch (e) {
    console.warn('[notifications] Trip cancelled email API unreachable', notifyTarget, e);
  }
}

export async function notifyTripCancelled(
  tripId: string,
  opts: { cancelledBy?: string | null; cancellationReason?: string | null },
): Promise<void> {
  const { error: rpcError } = await supabase.rpc('notify_trip_cancelled', {
    p_trip_id: tripId,
    p_cancelled_by: opts.cancelledBy ?? null,
    p_cancellation_reason: opts.cancellationReason ?? null,
  });
  if (rpcError) {
    console.error('[notifications] RPC notify_trip_cancelled failed', rpcError);
  }

  const payload = await buildTripCancelledNotifyPayload(tripId, opts);
  if (!payload) return;

  if (payload.logisticsEmails.length) {
    await sendTripCancelledNotificationEmail(payload, 'logistics');
  }
  if (payload.driverEmail?.trim() || payload.driverName?.trim()) {
    await sendTripCancelledNotificationEmail(payload, 'driver');
  }
}

async function fetchEmployeeNotifyContact(employeeId: string): Promise<{
  name: string | null;
  email: string | null;
}> {
  const [empRes, contactRes] = await Promise.all([
    supabase.from('employees').select('employee_name, email').eq('id', employeeId).maybeSingle(),
    supabase
      .from('employee_contact_info')
      .select('work_email, personal_email')
      .eq('employee_id', employeeId)
      .maybeSingle(),
  ]);

  if (empRes.error) {
    console.warn('[notifications] Could not load employee profile for notify', empRes.error);
    return { name: null, email: null };
  }

  const emp = empRes.data as { employee_name?: string | null; email?: string | null } | null;
  const contact = contactRes.data as {
    work_email?: string | null;
    personal_email?: string | null;
  } | null;

  const email =
    contact?.work_email?.trim() ||
    contact?.personal_email?.trim() ||
    emp?.email?.trim() ||
    null;

  return {
    name: emp?.employee_name?.trim() || null,
    email,
  };
}

export async function buildTripDriverAssignedNotifyPayload(
  tripId: string,
  opts: { assignedBy?: string | null },
): Promise<TripDriverAssignedNotifyPayload | null> {
  const tripSelectFull = `
      id, trip_number, scheduled_date, vehicle_name, driver_id, driver_name, order_ids, destinations,
      inter_branch_request_id, branch_id,
      branches(name)
    `;
  const tripSelectBase = `
      id, trip_number, scheduled_date, vehicle_name, driver_id, driver_name, order_ids, destinations,
      branch_id,
      branches(name)
    `;

  let trip: Record<string, unknown> | null = null;
  let { data, error } = await supabase
    .from('trips')
    .select(tripSelectFull)
    .eq('id', tripId)
    .maybeSingle();

  if (error) {
    ({ data, error } = await supabase
      .from('trips')
      .select(tripSelectBase)
      .eq('id', tripId)
      .maybeSingle());
  }

  if (error || !data) {
    console.warn('[notifications] Could not load trip for driver notify', error);
    return null;
  }
  trip = data as Record<string, unknown>;

  const driverId = (trip.driver_id as string | null)?.trim();
  if (!driverId) return null;

  const orderIds = Array.isArray(trip.order_ids) ? (trip.order_ids as string[]) : [];
  let orderNumbers: string[] = [];
  if (orderIds.length > 0) {
    const { data: orders } = await supabase
      .from('orders')
      .select('id, order_number')
      .in('id', orderIds);
    const byId = new Map(
      (orders ?? []).map((row) => {
        const r = row as { id?: string; order_number?: string | null };
        return [String(r.id ?? ''), String(r.order_number ?? '')] as const;
      }),
    );
    orderNumbers = orderIds.map((id) => byId.get(id) || id).filter(Boolean);
  }

  const interBranchRequestId = (trip.inter_branch_request_id as string | null)?.trim() || null;
  const destArr = Array.isArray(trip.destinations) ? (trip.destinations as string[]) : [];
  const destinationLabel = destArr[0]?.trim() || null;
  let ibrNumber: string | null = null;
  if (interBranchRequestId) {
    const { data: ibrRow } = await supabase
      .from('inter_branch_requests')
      .select('ibr_number')
      .eq('id', interBranchRequestId)
      .maybeSingle();
    ibrNumber = (ibrRow as { ibr_number?: string } | null)?.ibr_number?.trim() || null;
  }

  const driverContact = await fetchEmployeeNotifyContact(driverId);
  const branchName = (trip.branches as { name?: string } | null)?.name ?? null;

  return {
    tripId,
    tripNumber: String(trip.trip_number ?? ''),
    scheduledDate: trip.scheduled_date ? String(trip.scheduled_date).slice(0, 10) : null,
    vehicleName: (trip.vehicle_name as string | null) ?? null,
    driverName: (trip.driver_name as string | null)?.trim() || driverContact.name,
    driverEmail: driverContact.email,
    branchName,
    orderCount: orderIds.length,
    orderNumbers,
    assignedBy: opts.assignedBy ?? null,
    interBranchRequestId,
    ibrNumber,
    destinationLabel,
  };
}

async function sendTripDriverAssignedNotificationEmail(
  payload: TripDriverAssignedNotifyPayload,
): Promise<void> {
  try {
    const res = await notifyFetch('/api/notifications/trip-driver-assigned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[notifications] Driver trip assigned email failed', body);
    }
  } catch (e) {
    console.warn('[notifications] Driver trip assigned email API unreachable', e);
  }
}

export async function notifyDriverTripAssigned(
  tripId: string,
  opts: { assignedBy?: string | null },
): Promise<void> {
  const { error: rpcError } = await supabase.rpc('notify_driver_trip_assigned', {
    p_trip_id: tripId,
    p_assigned_by: opts.assignedBy ?? null,
  });
  if (rpcError) {
    console.error('[notifications] RPC notify_driver_trip_assigned failed', rpcError);
  }

  const payload = await buildTripDriverAssignedNotifyPayload(tripId, opts);
  if (payload) {
    await sendTripDriverAssignedNotificationEmail(payload);
  }
}

export async function notifyDriverTripUnassigned(
  tripId: string,
  previousDriverId: string,
  opts: { assignedBy?: string | null; newDriverName?: string | null },
): Promise<void> {
  const { error: rpcError } = await supabase.rpc('notify_driver_trip_unassigned', {
    p_trip_id: tripId,
    p_previous_driver_id: previousDriverId,
    p_assigned_by: opts.assignedBy ?? null,
    p_new_driver_name: opts.newDriverName ?? null,
  });
  if (rpcError) {
    console.error('[notifications] RPC notify_driver_trip_unassigned failed', rpcError);
  }

  const payload = await buildTripDriverUnassignedNotifyPayload(tripId, previousDriverId, opts);
  if (payload) {
    await sendTripDriverUnassignedNotificationEmail(payload);
  }
}

async function buildTripDriverUnassignedNotifyPayload(
  tripId: string,
  previousDriverId: string,
  opts: { assignedBy?: string | null; newDriverName?: string | null },
): Promise<TripDriverUnassignedNotifyPayload | null> {
  const tripSelectFull = `
      id, trip_number, scheduled_date, vehicle_name, branch_id,
      inter_branch_request_id,
      branches(name)
    `;
  const tripSelectBase = `
      id, trip_number, scheduled_date, vehicle_name, branch_id,
      branches(name)
    `;

  let { data, error } = await supabase
    .from('trips')
    .select(tripSelectFull)
    .eq('id', tripId)
    .maybeSingle();

  if (error) {
    ({ data, error } = await supabase
      .from('trips')
      .select(tripSelectBase)
      .eq('id', tripId)
      .maybeSingle());
  }

  if (error || !data) {
    console.warn('[notifications] Could not load trip for driver unassigned email', error);
    return null;
  }

  const trip = data as Record<string, unknown>;
  const driverContact = await fetchEmployeeNotifyContact(previousDriverId);
  const interBranchRequestId = (trip.inter_branch_request_id as string | null)?.trim() || null;
  let ibrNumber: string | null = null;
  if (interBranchRequestId) {
    const { data: ibrRow } = await supabase
      .from('inter_branch_requests')
      .select('ibr_number')
      .eq('id', interBranchRequestId)
      .maybeSingle();
    ibrNumber = (ibrRow as { ibr_number?: string } | null)?.ibr_number?.trim() || null;
  }

  return {
    tripId,
    tripNumber: String(trip.trip_number ?? ''),
    scheduledDate: trip.scheduled_date ? String(trip.scheduled_date).slice(0, 10) : null,
    vehicleName: (trip.vehicle_name as string | null) ?? null,
    driverName: driverContact.name,
    driverEmail: driverContact.email,
    branchName: (trip.branches as { name?: string } | null)?.name ?? null,
    assignedBy: opts.assignedBy ?? null,
    newDriverName: opts.newDriverName ?? null,
    interBranchRequestId,
    ibrNumber,
  };
}

async function sendTripDriverUnassignedNotificationEmail(
  payload: TripDriverUnassignedNotifyPayload,
): Promise<void> {
  try {
    const res = await notifyFetch('/api/notifications/trip-driver-unassigned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[notifications] Driver trip unassigned email failed', body);
    }
  } catch (e) {
    console.warn('[notifications] Driver trip unassigned email API unreachable', e);
  }
}

const TRIP_DELAY_SKIP_ORDER_STATUSES = new Set([
  'Delivered',
  'Partially Fulfilled',
  'Completed',
  'Cancelled',
]);

export async function buildTripDelayedNotifyPayload(
  tripId: string,
  opts: { delayReason: string; reportedBy?: string | null },
): Promise<TripDelayedNotifyPayload | null> {
  const { data: trip, error } = await supabase
    .from('trips')
    .select(`
      id, trip_number, vehicle_name, driver_name, branch_id, order_ids,
      branches(name)
    `)
    .eq('id', tripId)
    .maybeSingle();

  if (error || !trip) {
    console.warn('[notifications] Could not load trip for delay notify', error);
    return null;
  }

  const t = trip as Record<string, unknown>;
  const orderIds = Array.isArray(t.order_ids) ? (t.order_ids as string[]) : [];
  if (!orderIds.length) return null;

  const { data: orders, error: ordersErr } = await supabase
    .from('orders')
    .select('id, order_number, customer_name, status, required_date, total_amount, agent_id')
    .in('id', orderIds);

  if (ordersErr) {
    console.warn('[notifications] Could not load trip orders for delay notify', ordersErr);
    return null;
  }

  const pendingRows = (orders ?? []).filter(
    (row) => !TRIP_DELAY_SKIP_ORDER_STATUSES.has(String((row as { status?: string }).status ?? '').trim()),
  );

  const agentIds = [
    ...new Set(
      pendingRows
        .map((row) => String((row as { agent_id?: string | null }).agent_id ?? '').trim())
        .filter(Boolean),
    ),
  ];
  const agentById = new Map<string, { name: string | null; email: string | null }>();
  if (agentIds.length) {
    const { data: agents } = await supabase
      .from('employees')
      .select('id, name, email')
      .in('id', agentIds);
    for (const agent of agents ?? []) {
      const a = agent as { id?: string; name?: string | null; email?: string | null };
      if (a.id) {
        agentById.set(String(a.id), {
          name: a.name?.trim() || null,
          email: a.email?.trim() || null,
        });
      }
    }
  }

  const affectedOrders: TripDelayedAffectedOrderNotify[] = pendingRows
    .map((row) => {
      const r = row as {
        id?: string;
        order_number?: string | null;
        customer_name?: string | null;
        status?: string | null;
        required_date?: string | null;
        total_amount?: number | null;
        agent_id?: string | null;
      };
      const agent = r.agent_id ? agentById.get(String(r.agent_id)) : undefined;
      return {
        orderId: String(r.id ?? ''),
        orderNumber: String(r.order_number ?? ''),
        customerName: r.customer_name?.trim() || null,
        status: String(r.status ?? '').trim() || 'Scheduled',
        requiredDate: r.required_date ? String(r.required_date).slice(0, 10) : null,
        totalAmount: r.total_amount != null ? Number(r.total_amount) : undefined,
        agentEmail: agent?.email ?? null,
        agentName: agent?.name ?? null,
      };
    })
    .filter((o) => o.orderId && o.orderNumber);

  if (!affectedOrders.length) return null;

  const branchId = (t.branch_id as string | null)?.trim() || null;
  const logisticsEmails = branchId ? await fetchBranchLogisticsEmails(branchId) : [];
  const branchName = (t.branches as { name?: string } | null)?.name ?? null;

  return {
    tripId,
    tripNumber: String(t.trip_number ?? ''),
    delayReason: opts.delayReason.trim(),
    reportedBy: opts.reportedBy ?? null,
    vehicleName: (t.vehicle_name as string | null) ?? null,
    driverName: (t.driver_name as string | null) ?? null,
    branchName,
    logisticsEmails,
    affectedOrders,
  };
}

async function sendTripDelayedNotificationEmail(
  payload: TripDelayedNotifyPayload & {
    notifyTarget: 'logistics' | 'agent';
    orderId?: string;
    orderNumber?: string;
    customerName?: string | null;
    status?: string;
    requiredDate?: string | null;
    totalAmount?: number;
    agentEmail?: string | null;
    agentName?: string | null;
  },
): Promise<void> {
  try {
    const res = await notifyFetch('/api/notifications/trip-delayed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tripId: payload.tripId,
        tripNumber: payload.tripNumber,
        delayReason: payload.delayReason,
        reportedBy: payload.reportedBy,
        vehicleName: payload.vehicleName,
        driverName: payload.driverName,
        branchName: payload.branchName,
        affectedOrders: payload.affectedOrders.map((o) => ({
          orderId: o.orderId,
          orderNumber: o.orderNumber,
          customerName: o.customerName,
          status: o.status,
          requiredDate: o.requiredDate,
          totalAmount: o.totalAmount,
        })),
        notifyTarget: payload.notifyTarget,
        logisticsEmails: payload.logisticsEmails,
        orderId: payload.orderId,
        orderNumber: payload.orderNumber,
        customerName: payload.customerName,
        status: payload.status,
        requiredDate: payload.requiredDate,
        totalAmount: payload.totalAmount,
        agentEmail: payload.agentEmail,
        agentName: payload.agentName,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[notifications] Trip delayed email failed', body);
    }
  } catch (e) {
    console.warn('[notifications] Trip delayed email API unreachable', e);
  }
}

export async function notifyTripDelayed(
  tripId: string,
  opts: { delayReason: string; reportedBy?: string | null },
): Promise<void> {
  const { error: rpcError } = await supabase.rpc('notify_trip_delayed', {
    p_trip_id: tripId,
    p_delay_reason: opts.delayReason,
    p_reported_by: opts.reportedBy ?? null,
  });
  if (rpcError) {
    console.error('[notifications] RPC notify_trip_delayed failed', rpcError);
  }

  const payload = await buildTripDelayedNotifyPayload(tripId, opts);
  if (payload) {
    await sendTripDelayedNotificationEmail({ ...payload, notifyTarget: 'logistics' });
    for (const order of payload.affectedOrders) {
      if (!order.agentEmail?.trim()) continue;
      await sendTripDelayedNotificationEmail({
        ...payload,
        notifyTarget: 'agent',
        orderId: order.orderId,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        status: order.status,
        requiredDate: order.requiredDate,
        totalAmount: order.totalAmount,
        agentEmail: order.agentEmail,
        agentName: order.agentName,
      });
    }
  }

  window.dispatchEvent(new Event('lamtex:notifications-refresh'));
}

// ───────────────────────────────────────────────────────────────────────────
// Product stock alert emails
// ───────────────────────────────────────────────────────────────────────────

/**
 * Derive the severity for an inventory alert. Mirrors the SQL function
 * `notify_product_stock_threshold_if_crossed` so emails fire on exactly the
 * same transitions the in-app notification system uses.
 */
export function deriveProductStockAlertSeverity(args: {
  oldStock: number;
  newStock: number;
  oldReorderPoint: number;
  newReorderPoint: number;
}): ProductStockAlertSeverity | null {
  const oldStock = Math.max(0, Math.round(args.oldStock));
  const newStock = Math.max(0, Math.round(args.newStock));
  const oldRp = Math.max(0, Math.round(args.oldReorderPoint));
  const newRp = Math.max(0, Math.round(args.newReorderPoint));

  if (oldStock === newStock && oldRp === newRp) return null;

  const wasLow = oldRp > 0 && oldStock > 0 && oldStock <= oldRp;
  const isLow = newRp > 0 && newStock > 0 && newStock <= newRp;

  // Out-of-stock takes priority.
  if (oldStock > 0 && newStock <= 0) return 'out_of_stock';

  // Fresh crossing into low-stock or further decline while still low.
  if (isLow && (!wasLow || newStock < oldStock)) {
    return newStock <= newRp / 2 ? 'critical' : 'low_stock';
  }

  return null;
}

async function fetchVariantAlertContext(variantId: string): Promise<{
  productId: string;
  productName: string;
  sku: string;
  size: string | null;
  categorySlug: string | null;
} | null> {
  const { data, error } = await supabase
    .from('product_variants')
    .select('id, sku, size, product_id, products(name, product_categories(slug))')
    .eq('id', variantId)
    .maybeSingle();
  if (error || !data) {
    console.warn('[notifications] stock alert: variant lookup failed', error);
    return null;
  }
  const product = Array.isArray(data.products) ? data.products[0] : data.products;
  const category = product
    ? (Array.isArray((product as { product_categories?: unknown }).product_categories)
        ? (product as { product_categories?: { slug?: string }[] }).product_categories?.[0]
        : (product as { product_categories?: { slug?: string } | null }).product_categories)
    : null;
  return {
    productId: String((data as { product_id: string }).product_id),
    productName: String((product as { name?: unknown } | null)?.name ?? 'Product'),
    sku: String((data as { sku?: string }).sku ?? ''),
    size: typeof (data as { size?: string }).size === 'string' ? (data as { size?: string }).size ?? null : null,
    categorySlug: typeof category?.slug === 'string' && category.slug.trim() ? category.slug.trim() : null,
  };
}

async function fetchBranchNameById(branchId: string | null): Promise<string | null> {
  if (!branchId) return null;
  const { data, error } = await supabase
    .from('branches')
    .select('name')
    .eq('id', branchId)
    .maybeSingle();
  if (error || !data) return null;
  return typeof (data as { name?: string }).name === 'string' ? (data as { name?: string }).name ?? null : null;
}

async function fetchActiveEmployeeEmails(role: 'Executive' | 'Warehouse'): Promise<string[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('email')
    .eq('user_role', role)
    .eq('status', 'active');
  if (error) {
    console.warn('[notifications] stock alert: employee email lookup failed', error);
    return [];
  }
  const emails = (data ?? [])
    .map((row) => (typeof (row as { email?: string }).email === 'string' ? (row as { email?: string }).email!.trim() : ''))
    .filter((e) => e.length > 0);
  return [...new Set(emails)];
}

async function sendProductStockAlertEmailRequest(
  payload: ProductStockAlertEmailRequestPayload,
): Promise<void> {
  try {
    const res = await notifyFetch('/api/notifications/product-stock-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[notifications] product stock alert email failed', body);
    }
  } catch (e) {
    console.warn('[notifications] product stock alert email API unreachable', e);
  }
}

/**
 * Fire stock-alert emails to Executives and Warehouse staff for both freshly
 * crossed thresholds (low / critical) and out-of-stock transitions.
 *
 * Safe to call from any client path that mutated stock — bails out without
 * sending when the change does not represent a meaningful threshold crossing.
 */
export async function notifyProductStockAlertEmails(args: {
  variantId: string;
  branchId?: string | null;
  oldStock: number;
  newStock: number;
  oldReorderPoint?: number;
  newReorderPoint?: number;
  triggeredBy?: string | null;
}): Promise<void> {
  const severity = deriveProductStockAlertSeverity({
    oldStock: args.oldStock,
    newStock: args.newStock,
    oldReorderPoint: args.oldReorderPoint ?? args.newReorderPoint ?? 0,
    newReorderPoint: args.newReorderPoint ?? args.oldReorderPoint ?? 0,
  });
  if (!severity) return;

  const ctx = await fetchVariantAlertContext(args.variantId);
  if (!ctx || !ctx.sku) return;

  const branchName = await fetchBranchNameById(args.branchId ?? null);
  const newRp = Math.max(0, Math.round(args.newReorderPoint ?? args.oldReorderPoint ?? 0));

  const audiences: ProductStockAlertAudience[] = ['executive', 'warehouse'];
  await Promise.all(
    audiences.map(async (audience) => {
      const role = audience === 'warehouse' ? 'Warehouse' : 'Executive';
      const recipients = await fetchActiveEmployeeEmails(role);
      const payload: ProductStockAlertEmailRequestPayload = {
        variantId: args.variantId,
        productId: ctx.productId,
        productName: ctx.productName,
        sku: ctx.sku,
        size: ctx.size,
        categorySlug: ctx.categorySlug,
        branchName,
        severity,
        audience,
        newStock: Math.max(0, Math.round(args.newStock)),
        previousStock: Math.max(0, Math.round(args.oldStock)),
        reorderPoint: newRp,
        triggeredBy: args.triggeredBy ?? null,
        recipientEmails: recipients,
      };
      await sendProductStockAlertEmailRequest(payload);
    }),
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Raw material stock alert emails
// ───────────────────────────────────────────────────────────────────────────

/**
 * Mirrors `notify_material_stock_threshold_if_crossed` so emails only fire on
 * the same transitions the SQL function would alert on (no double-fire on
 * no-op writes; continued declines below the reorder point re-alert).
 */
export function deriveMaterialStockAlertSeverity(args: {
  oldStock: number;
  newStock: number;
  oldReorderPoint: number;
  newReorderPoint: number;
}): MaterialStockAlertSeverity | null {
  const oldStock = Math.max(0, args.oldStock);
  const newStock = Math.max(0, args.newStock);
  const oldRp = Math.max(0, args.oldReorderPoint);
  const newRp = Math.max(0, args.newReorderPoint);

  if (oldStock === newStock && oldRp === newRp) return null;

  const wasLow = oldRp > 0 && oldStock > 0 && oldStock <= oldRp;
  const isLow = newRp > 0 && newStock > 0 && newStock <= newRp;

  if (oldStock > 0 && newStock <= 0) return 'out_of_stock';
  if (isLow && (!wasLow || newStock < oldStock)) {
    return newStock <= newRp / 2 ? 'critical' : 'low_stock';
  }
  return null;
}

async function fetchMaterialAlertContext(materialId: string): Promise<{
  name: string;
  sku: string;
  unit: string | null;
  primarySupplier: string | null;
} | null> {
  const { data, error } = await supabase
    .from('raw_materials')
    .select('id, name, sku, unit_of_measure, primary_supplier')
    .eq('id', materialId)
    .maybeSingle();
  if (error || !data) {
    console.warn('[notifications] material alert: lookup failed', error);
    return null;
  }
  const row = data as {
    name?: string;
    sku?: string;
    unit_of_measure?: string | null;
    primary_supplier?: string | null;
  };
  return {
    name: String(row.name ?? 'Raw material'),
    sku: String(row.sku ?? ''),
    unit: typeof row.unit_of_measure === 'string' ? row.unit_of_measure : null,
    primarySupplier: typeof row.primary_supplier === 'string' ? row.primary_supplier : null,
  };
}

async function sendMaterialStockAlertEmailRequest(
  payload: MaterialStockAlertEmailRequestPayload,
): Promise<void> {
  try {
    const res = await notifyFetch('/api/notifications/material-stock-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[notifications] material stock alert email failed', body);
    }
  } catch (e) {
    console.warn('[notifications] material stock alert email API unreachable', e);
  }
}

/**
 * Fire raw material stock-alert emails to Executives and Warehouse staff for
 * both freshly crossed thresholds (low / critical) and out-of-stock
 * transitions. Safe to call from any path that mutated material stock.
 */
export async function notifyMaterialStockAlertEmails(args: {
  materialId: string;
  branchId?: string | null;
  oldStock: number;
  newStock: number;
  oldReorderPoint?: number;
  newReorderPoint?: number;
  triggeredBy?: string | null;
}): Promise<void> {
  const severity = deriveMaterialStockAlertSeverity({
    oldStock: args.oldStock,
    newStock: args.newStock,
    oldReorderPoint: args.oldReorderPoint ?? args.newReorderPoint ?? 0,
    newReorderPoint: args.newReorderPoint ?? args.oldReorderPoint ?? 0,
  });
  if (!severity) return;

  const ctx = await fetchMaterialAlertContext(args.materialId);
  if (!ctx || !ctx.sku) return;

  const branchName = await fetchBranchNameById(args.branchId ?? null);
  const newRp = Math.max(0, args.newReorderPoint ?? args.oldReorderPoint ?? 0);

  const audiences: MaterialStockAlertAudience[] = ['executive', 'warehouse'];
  await Promise.all(
    audiences.map(async (audience) => {
      const role = audience === 'warehouse' ? 'Warehouse' : 'Executive';
      const recipients = await fetchActiveEmployeeEmails(role);
      const payload: MaterialStockAlertEmailRequestPayload = {
        materialId: args.materialId,
        name: ctx.name,
        sku: ctx.sku,
        unit: ctx.unit,
        branchName,
        severity,
        audience,
        newStock: Math.max(0, args.newStock),
        previousStock: Math.max(0, args.oldStock),
        reorderPoint: newRp,
        primarySupplier: ctx.primarySupplier,
        triggeredBy: args.triggeredBy ?? null,
        recipientEmails: recipients,
      };
      await sendMaterialStockAlertEmailRequest(payload);
    }),
  );
}

export function subscribeToUserNotifications(
  userId: string,
  onChange: () => void,
  onInsert?: () => void,
): () => void {
  const notify = (eventType: string) => {
    if (eventType === 'INSERT') onInsert?.();
    onChange();
  };

  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      () => notify('INSERT'),
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      () => notify('UPDATE'),
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      () => notify('DELETE'),
    )
    .subscribe((status, err) => {
      if (import.meta.env.DEV) {
        console.log('[notifications] realtime subscription', { userId, status, err: err?.message ?? null });
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}

const IBR_NOTIFY_LOG = '[notifications][ibr]';

type InterBranchWorkflowEventType =
  | 'submitted_for_approval'
  | 'approved'
  | 'scheduled'
  | 'loading'
  | 'packed'
  | 'ready'
  | 'in_transit'
  | 'delivery_recorded'
  | 'fulfilled'
  | 'cancelled'
  | 'rejected';

type InterBranchNotifyEmailPayload = {
  interBranchRequestId: string;
  ibrNumber: string;
  eventType: InterBranchWorkflowEventType;
  status: string;
  requestingBranchName: string | null;
  fulfillingBranchName: string | null;
  createdBy?: string | null;
  submittedBy?: string | null;
  approvedBy?: string | null;
  fulfilledBy?: string | null;
  cancelledBy?: string | null;
  rejectedBy?: string | null;
  rejectionReason?: string | null;
  actor?: string | null;
  note?: string | null;
  scheduledDepartureDate?: string | null;
  tripNumber?: string | null;
  vehicleName?: string | null;
  driverName?: string | null;
  notes?: string | null;
  lineCount?: number | null;
  items: Array<{
    lineKind: 'raw_material' | 'product';
    label: string;
    sku?: string | null;
    unitOfMeasure?: string | null;
    quantity: number;
  }>;
  recipientGroups?: Array<{
    audience: 'executive' | 'warehouse' | 'logistics';
    branchName?: string | null;
    emails: string[];
  }>;
};

type InterBranchNotifyBase = Omit<
  InterBranchNotifyEmailPayload,
  'eventType' | 'status' | 'approvedBy' | 'fulfilledBy' | 'cancelledBy' | 'rejectedBy' | 'rejectionReason' | 'actor' | 'note' | 'recipientGroups'
> & {
  requestingBranchId: string;
  fulfillingBranchId: string;
};

function ibrLogisticsEventType(status: string): InterBranchWorkflowEventType | null {
  const map: Record<string, InterBranchWorkflowEventType> = {
    Scheduled: 'scheduled',
    Loading: 'loading',
    Packed: 'packed',
    Ready: 'ready',
    'In Transit': 'in_transit',
  };
  return map[status] ?? null;
}

async function fetchInterBranchRequestSnapshotForNotify(ibrId: string): Promise<InterBranchNotifyBase | null> {
  const { data: row, error } = await supabase
    .from('inter_branch_requests')
    .select(`
      id, ibr_number, status, notes, created_by, submitted_at, approved_by, scheduled_departure_date,
      requesting_branch_id, fulfilling_branch_id, linked_trip_id,
      req_br:branches!requesting_branch_id(name),
      ful_br:branches!fulfilling_branch_id(name),
      inter_branch_request_items(
        line_kind, quantity, quantity_shipped, quantity_delivered,
        raw_materials(name, sku, unit_of_measure),
        product_variants(sku, size, products(name))
      )
    `)
    .eq('id', ibrId)
    .maybeSingle();

  if (error || !row) {
    console.warn(`${IBR_NOTIFY_LOG} Could not load IBR for email`, error);
    return null;
  }

  const r = row as Record<string, unknown>;
  const requestingBranchName = (r.req_br as { name?: string } | null)?.name ?? null;
  const fulfillingBranchName = (r.ful_br as { name?: string } | null)?.name ?? null;

  const rawItems = (r.inter_branch_request_items as Array<Record<string, unknown>> | null) ?? [];
  const items = rawItems.map((item) => {
    const lineKind = item.line_kind as 'raw_material' | 'product';
    if (lineKind === 'raw_material') {
      const mat = item.raw_materials as { name?: string; sku?: string; unit_of_measure?: string } | null;
      return {
        lineKind,
        label: mat?.name?.trim() || 'Material',
        sku: mat?.sku ?? null,
        unitOfMeasure: mat?.unit_of_measure ?? null,
        quantity: Number(item.quantity) || 0,
      };
    }
    const pv = item.product_variants as {
      sku?: string;
      size?: string;
      products?: { name?: string } | null;
    } | null;
    const productName = pv?.products?.name?.trim() || 'Product';
    const variant = [pv?.sku, pv?.size].filter(Boolean).join(' · ');
    return {
      lineKind,
      label: variant ? `${productName} — ${variant}` : productName,
      sku: pv?.sku ?? null,
      unitOfMeasure: 'units',
      quantity: Number(item.quantity) || 0,
    };
  });

  let tripNumber: string | null = null;
  let vehicleName: string | null = null;
  let driverName: string | null = null;
  const linkedTripId = (r.linked_trip_id as string | null)?.trim() || null;
  if (linkedTripId) {
    const { data: tripRow } = await supabase
      .from('trips')
      .select('trip_number, vehicle_name, driver_name')
      .eq('id', linkedTripId)
      .maybeSingle();
    if (tripRow) {
      const t = tripRow as { trip_number?: string | null; vehicle_name?: string | null; driver_name?: string | null };
      tripNumber = t.trip_number?.trim() || null;
      vehicleName = t.vehicle_name?.trim() || null;
      driverName = t.driver_name?.trim() || null;
    }
  }

  return {
    interBranchRequestId: ibrId,
    ibrNumber: String(r.ibr_number ?? ''),
    requestingBranchId: String(r.requesting_branch_id ?? ''),
    fulfillingBranchId: String(r.fulfilling_branch_id ?? ''),
    requestingBranchName,
    fulfillingBranchName,
    createdBy: (r.created_by as string | null) ?? null,
    submittedBy: (r.created_by as string | null) ?? null,
    scheduledDepartureDate: (r.scheduled_departure_date as string | null) ?? null,
    tripNumber,
    vehicleName,
    driverName,
    notes: (r.notes as string | null) ?? null,
    lineCount: items.length,
    items,
  };
}

async function fetchBothBranchWarehouseRecipientGroups(
  requestingBranchId: string,
  fulfillingBranchId: string,
  requestingBranchName: string | null,
  fulfillingBranchName: string | null,
): Promise<NonNullable<InterBranchNotifyEmailPayload['recipientGroups']>> {
  const [reqEmails, fulEmails] = await Promise.all([
    fetchBranchWarehouseEmails(requestingBranchId),
    fetchBranchWarehouseEmails(fulfillingBranchId),
  ]);
  const groups: NonNullable<InterBranchNotifyEmailPayload['recipientGroups']> = [];
  if (reqEmails.length) {
    groups.push({ audience: 'warehouse', branchName: requestingBranchName, emails: reqEmails });
  }
  if (fulEmails.length) {
    groups.push({ audience: 'warehouse', branchName: fulfillingBranchName, emails: fulEmails });
  }
  return groups;
}

async function fetchFulfillingBranchLogisticsEmailGroup(
  fulfillingBranchId: string,
  fulfillingBranchName: string | null,
): Promise<NonNullable<InterBranchNotifyEmailPayload['recipientGroups']>[number] | null> {
  const emails = await fetchBranchLogisticsEmails(fulfillingBranchId);
  if (!emails.length) return null;
  return { audience: 'logistics', branchName: fulfillingBranchName, emails };
}

async function buildIbrMilestoneEmailRecipientGroups(
  status: string,
  base: InterBranchNotifyBase,
): Promise<NonNullable<InterBranchNotifyEmailPayload['recipientGroups']>> {
  if (status === 'In Transit') {
    return fetchBothBranchWarehouseRecipientGroups(
      base.requestingBranchId,
      base.fulfillingBranchId,
      base.requestingBranchName,
      base.fulfillingBranchName,
    );
  }

  const groups: NonNullable<InterBranchNotifyEmailPayload['recipientGroups']> = [];

  if (status === 'Scheduled') {
    const emails = await fetchBranchWarehouseEmails(base.requestingBranchId);
    if (emails.length) {
      groups.push({ audience: 'warehouse', branchName: base.requestingBranchName, emails });
    }
    return groups;
  }

  if (status === 'Loading') {
    const logisticsGroup = await fetchFulfillingBranchLogisticsEmailGroup(
      base.fulfillingBranchId,
      base.fulfillingBranchName,
    );
    if (logisticsGroup) groups.push(logisticsGroup);
    const warehouseEmails = await fetchBranchWarehouseEmails(base.fulfillingBranchId);
    if (warehouseEmails.length) {
      groups.push({ audience: 'warehouse', branchName: base.fulfillingBranchName, emails: warehouseEmails });
    }
    return groups;
  }

  if (status === 'Packed' || status === 'Ready') {
    const logisticsGroup = await fetchFulfillingBranchLogisticsEmailGroup(
      base.fulfillingBranchId,
      base.fulfillingBranchName,
    );
    if (logisticsGroup) groups.push(logisticsGroup);
  }

  return groups;
}

async function fetchIbrSubmitterEmail(ibrId: string): Promise<string | null> {
  const { data: row, error } = await supabase
    .from('inter_branch_requests')
    .select('created_by, requesting_branch_id')
    .eq('id', ibrId)
    .maybeSingle();

  if (error || !row) {
    console.warn(`${IBR_NOTIFY_LOG} Could not load IBR submitter for email`, error);
    return null;
  }

  const { data: logRow } = await supabase
    .from('inter_branch_request_logs')
    .select('performed_by')
    .eq('inter_branch_request_id', ibrId)
    .eq('action', 'submitted')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const submitter = (logRow?.performed_by as string | null)?.trim() || (row.created_by as string | null)?.trim();
  if (!submitter) return null;
  if (submitter.includes('@')) return submitter;

  const submitterBase = submitter.split(' (')[0]?.trim() || submitter;

  const { data: emps } = await supabase
    .from('employees')
    .select('email, employee_name, branch_id')
    .eq('status', 'active');

  const requestingBranchId = row.requesting_branch_id as string;
  const matches = (emps ?? []).filter((e) => {
    const name = e.employee_name?.trim();
    const email = e.email?.trim();
    if (!name && !email) return false;
    return (
      name === submitter ||
      email === submitter ||
      name?.toLowerCase() === submitter.toLowerCase() ||
      name?.toLowerCase() === submitterBase.toLowerCase() ||
      email?.split('@')[0]?.toLowerCase() === submitter.toLowerCase() ||
      email?.split('@')[0]?.toLowerCase() === submitterBase.toLowerCase()
    );
  });

  matches.sort((a, b) => {
    if (a.branch_id === requestingBranchId && b.branch_id !== requestingBranchId) return -1;
    if (b.branch_id === requestingBranchId && a.branch_id !== requestingBranchId) return 1;
    return 0;
  });

  return matches[0]?.email?.trim() ?? null;
}

async function fetchIbrRejectedRecipientEmails(ibrId: string, requestingBranchId: string): Promise<string[]> {
  const submitterEmail = await fetchIbrSubmitterEmail(ibrId);
  if (submitterEmail) return [submitterEmail];
  return fetchBranchWarehouseEmails(requestingBranchId);
}

async function sendInterBranchWorkflowEmail(payload: InterBranchNotifyEmailPayload): Promise<boolean> {
  try {
    console.log(`${IBR_NOTIFY_LOG} sending email`, {
      eventType: payload.eventType,
      ibrNumber: payload.ibrNumber,
      groupCount: payload.recipientGroups?.length ?? 0,
    });
    const res = await notifyFetch('/api/notifications/inter-branch-workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.warn(`${IBR_NOTIFY_LOG} Email send failed`, { status: res.status, body });
      return false;
    }
    console.log(`${IBR_NOTIFY_LOG} Email sent`, body);
    return true;
  } catch (e) {
    console.warn(`${IBR_NOTIFY_LOG} Email API unreachable — in-app notifications still created`, e);
    return false;
  }
}

async function notifyInterBranchWithEmail(
  rpcName: string,
  rpcParams: Record<string, unknown>,
  buildEmail: (base: InterBranchNotifyBase) => Promise<InterBranchNotifyEmailPayload | null>,
): Promise<number> {
  console.log(`${IBR_NOTIFY_LOG} calling ${rpcName}`, rpcParams);
  const { data, error: rpcError } = await supabase.rpc(rpcName, rpcParams);
  if (rpcError) {
    console.error(`${IBR_NOTIFY_LOG} RPC ${rpcName} failed`, rpcError);
    throw rpcError;
  }
  const count = parseNotificationRpcCount(data);
  console.log(`${IBR_NOTIFY_LOG} RPC ${rpcName} inserted ${count} notification(s)`);

  const base = await fetchInterBranchRequestSnapshotForNotify(String(rpcParams.p_ibr_id ?? ''));
  if (base) {
    const emailPayload = await buildEmail(base);
    if (emailPayload) {
      await sendInterBranchWorkflowEmail(emailPayload);
    }
  } else {
    console.warn(`${IBR_NOTIFY_LOG} Skipped email — could not build IBR payload`);
  }

  window.dispatchEvent(new Event('lamtex:notifications-refresh'));
  return count;
}

/** IBR submitted for approval: notify executives + email them. */
export async function notifyExecutivesInterBranchSubmittedForApproval(ibrId: string): Promise<number> {
  return notifyInterBranchWithEmail(
    'notify_executives_ibr_submitted_for_approval',
    { p_ibr_id: ibrId },
    async (base) => ({
      ...base,
      eventType: 'submitted_for_approval',
      status: 'Pending',
      recipientGroups: [{ audience: 'executive', emails: await fetchEmailsForRoles(['Executive']) }],
    }),
  );
}

/** IBR approved: notify both branches + logistics at sending branch + matching emails. */
export async function notifyBothBranchesInterBranchApproved(ibrId: string, approvedBy: string): Promise<number> {
  return notifyInterBranchWithEmail(
    'notify_both_branches_ibr_approved',
    { p_ibr_id: ibrId, p_approved_by: approvedBy },
    async (base) => {
      const warehouseGroups = await fetchBothBranchWarehouseRecipientGroups(
        base.requestingBranchId,
        base.fulfillingBranchId,
        base.requestingBranchName,
        base.fulfillingBranchName,
      );
      const logisticsGroup = await fetchFulfillingBranchLogisticsEmailGroup(
        base.fulfillingBranchId,
        base.fulfillingBranchName,
      );
      return {
        ...base,
        eventType: 'approved',
        status: 'Approved',
        approvedBy,
        recipientGroups: [...warehouseGroups, ...(logisticsGroup ? [logisticsGroup] : [])],
      };
    },
  );
}

/** IBR logistics milestone: in-app + email per status routing rules. */
export async function notifyRequestingBranchInterBranchStatus(
  ibrId: string,
  status: string,
  actor?: string | null,
): Promise<number> {
  const eventType = ibrLogisticsEventType(status);
  if (!eventType) {
    console.warn(`${IBR_NOTIFY_LOG} Skipped notify — unsupported logistics status ${status}`);
    return 0;
  }
  return notifyInterBranchWithEmail(
    'notify_requesting_branch_ibr_status',
    { p_ibr_id: ibrId, p_status: status, p_actor: actor ?? null },
    async (base) => ({
      ...base,
      eventType,
      status,
      actor: actor ?? null,
      recipientGroups: await buildIbrMilestoneEmailRecipientGroups(status, base),
    }),
  );
}

/** IBR delivery recorded: notify both branches + email warehouse staff at each branch. */
export async function notifyBothBranchesInterBranchDeliveryRecorded(
  ibrId: string,
  actor: string,
  newStatus: string,
): Promise<number> {
  return notifyInterBranchWithEmail(
    'notify_both_branches_ibr_delivery_recorded',
    { p_ibr_id: ibrId, p_actor: actor, p_new_status: newStatus },
    async (base) => ({
      ...base,
      eventType: 'delivery_recorded',
      status: newStatus,
      actor,
      recipientGroups: await fetchBothBranchWarehouseRecipientGroups(
        base.requestingBranchId,
        base.fulfillingBranchId,
        base.requestingBranchName,
        base.fulfillingBranchName,
      ),
    }),
  );
}

/** IBR fulfilled: notify both branches + executives + email all. */
export async function notifyBothBranchesAndExecutivesInterBranchFulfilled(
  ibrId: string,
  fulfilledBy: string,
): Promise<number> {
  return notifyInterBranchWithEmail(
    'notify_both_branches_and_executives_ibr_fulfilled',
    { p_ibr_id: ibrId, p_fulfilled_by: fulfilledBy },
    async (base) => {
      const branchGroups = await fetchBothBranchWarehouseRecipientGroups(
        base.requestingBranchId,
        base.fulfillingBranchId,
        base.requestingBranchName,
        base.fulfillingBranchName,
      );
      const executiveEmails = await fetchEmailsForRoles(['Executive']);
      return {
        ...base,
        eventType: 'fulfilled',
        status: 'Fulfilled',
        fulfilledBy,
        recipientGroups: [
          ...branchGroups,
          ...(executiveEmails.length
            ? [{ audience: 'executive' as const, emails: executiveEmails }]
            : [{ audience: 'executive' as const, emails: [] }]),
        ],
      };
    },
  );
}

/** IBR cancelled: notify both branches + email warehouse staff at each branch. */
export async function notifyBothBranchesInterBranchCancelled(
  ibrId: string,
  cancelledBy: string,
  note?: string | null,
): Promise<number> {
  return notifyInterBranchWithEmail(
    'notify_both_branches_ibr_cancelled',
    { p_ibr_id: ibrId, p_cancelled_by: cancelledBy, p_note: note ?? null },
    async (base) => ({
      ...base,
      eventType: 'cancelled',
      status: 'Cancelled',
      cancelledBy,
      note: note ?? null,
      recipientGroups: await fetchBothBranchWarehouseRecipientGroups(
        base.requestingBranchId,
        base.fulfillingBranchId,
        base.requestingBranchName,
        base.fulfillingBranchName,
      ),
    }),
  );
}

/** IBR rejected: notify the submitter (or requesting-branch warehouse fallback) + email them. */
export async function notifyInterBranchSubmitterRejected(
  ibrId: string,
  rejectedBy: string,
  rejectionReason?: string | null,
): Promise<number> {
  return notifyInterBranchWithEmail(
    'notify_ibr_submitter_rejected',
    { p_ibr_id: ibrId, p_rejected_by: rejectedBy, p_rejection_reason: rejectionReason ?? null },
    async (base) => {
      const emails = await fetchIbrRejectedRecipientEmails(ibrId, base.requestingBranchId);
      return {
        ...base,
        eventType: 'rejected',
        status: 'Rejected',
        rejectedBy,
        rejectionReason: rejectionReason ?? null,
        recipientGroups: [
          {
            audience: 'warehouse',
            branchName: base.requestingBranchName,
            emails,
          },
        ],
      };
    },
  );
}
