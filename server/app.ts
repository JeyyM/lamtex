import 'dotenv/config';
import express from 'express';
import { Resend } from 'resend';
import { buildOrderCreatedEmailHtml, type OrderCreatedEmailPayload } from './email/orderCreatedEmail';
import { buildOrderApprovalEmailHtml } from './email/orderApprovalEmail';
import { buildOrderDecisionEmailHtml, type OrderDecisionEmailPayload } from './email/orderDecisionEmail';
import { buildOrderRevisedEmailHtml, type OrderRevisedEmailPayload } from './email/orderRevisedEmail';
import { buildOrderCancelledEmailHtml, type OrderCancelledEmailPayload } from './email/orderCancelledEmail';
import {
  buildOrderLogisticsReadyEmailHtml,
  type OrderLogisticsReadyEmailPayload,
} from './email/orderLogisticsReadyEmail';
import {
  buildOrderLogisticsLoadingEmailHtml,
  type OrderLogisticsLoadingEmailPayload,
} from './email/orderLogisticsLoadingEmail';
import {
  buildOrderPackedEmailHtml,
  type OrderPackedEmailPayload,
} from './email/orderPackedEmail';
import {
  buildOrderInTransitEmailHtml,
  type OrderInTransitEmailPayload,
} from './email/orderInTransitEmail';
import {
  buildOrderCustomerInTransitEmailHtml,
  type OrderCustomerInTransitEmailPayload,
} from './email/orderCustomerInTransitEmail';
import {
  buildOrderDeliveryRecordedEmailHtml,
  type OrderDeliveryRecordedEmailPayload,
} from './email/orderDeliveryRecordedEmail';
import {
  buildOrderCustomerDeliveryRecordedEmailHtml,
  type OrderCustomerDeliveryRecordedEmailPayload,
} from './email/orderCustomerDeliveryRecordedEmail';
import {
  buildOrderCustomerPaymentRecordedEmailHtml,
  type OrderCustomerPaymentRecordedEmailPayload,
} from './email/orderCustomerPaymentRecordedEmail';
import {
  buildOrderCustomerApprovedEmailHtml,
  type OrderCustomerApprovedEmailPayload,
} from './email/orderCustomerApprovedEmail';
import {
  buildOrderCustomerScheduledEmailHtml,
  type OrderCustomerScheduledEmailPayload,
} from './email/orderCustomerScheduledEmail';
import {
  buildOrderCustomerUnscheduledEmailHtml,
  type OrderCustomerUnscheduledEmailPayload,
} from './email/orderCustomerUnscheduledEmail';
import {
  buildOrderCustomerPortalShareEmailHtml,
  type OrderCustomerPortalShareEmailPayload,
} from './email/orderCustomerPortalShareEmail';
import {
  buildOrderDeliveryProofUploadedEmailHtml,
  type OrderDeliveryProofUploadedEmailPayload,
} from './email/orderDeliveryProofUploadedEmail';
import {
  buildOrderPaymentRecordedEmailHtml,
  type OrderPaymentRecordedEmailPayload,
} from './email/orderPaymentRecordedEmail';
import {
  buildOrderPaymentOverdueEmailHtml,
  type OrderPaymentOverdueEmailPayload,
} from './email/orderPaymentOverdueEmail';
import {
  buildOrderCustomerPaymentOverdueEmailHtml,
  type OrderCustomerPaymentOverdueEmailPayload,
} from './email/orderCustomerPaymentOverdueEmail';
import {
  buildOrderCommissionPaidAgentEmailHtml,
  type OrderCommissionPaidAgentEmailPayload,
} from './email/orderCommissionPaidAgentEmail';
import {
  buildOrderScheduledEmailHtml,
  type OrderScheduledEmailPayload,
} from './email/orderScheduledEmail';
import {
  buildTripDriverAssignedEmailHtml,
  type TripDriverAssignedEmailPayload,
} from './email/tripDriverAssignedEmail';
import {
  buildProductStockAlertEmailHtml,
  type ProductStockAlertEmailPayload,
} from './email/productStockAlertEmail';
import {
  buildMaterialStockAlertEmailHtml,
  type MaterialStockAlertEmailPayload,
} from './email/materialStockAlertEmail';
import {
  buildPurchaseOrderApprovalEmailHtml,
  type PurchaseOrderSubmittedEmailPayload,
} from './email/purchaseOrderApprovalEmail';
import {
  buildPurchaseOrderRejectedEmailHtml,
  type PurchaseOrderRejectedEmailPayload,
} from './email/purchaseOrderRejectedEmail';
import {
  buildPurchaseOrderCancelledEmailHtml,
  type PurchaseOrderCancelledEmailPayload,
} from './email/purchaseOrderCancelledEmail';
import {
  buildPurchaseOrderAcceptedEmailHtml,
  type PurchaseOrderAcceptedEmailPayload,
} from './email/purchaseOrderAcceptedEmail';
import {
  buildPurchaseOrderConfirmedEmailHtml,
  type PurchaseOrderConfirmedEmailPayload,
} from './email/purchaseOrderConfirmedEmail';
import {
  buildPurchaseOrderReceivedEmailHtml,
  type PurchaseOrderReceivedEmailPayload,
} from './email/purchaseOrderReceivedEmail';
import {
  buildPurchaseOrderPaymentRecordedEmailHtml,
  type PurchaseOrderPaymentRecordedEmailPayload,
} from './email/purchaseOrderPaymentRecordedEmail';
import {
  buildProductionRequestApprovalEmailHtml,
  type ProductionRequestSubmittedEmailPayload,
} from './email/productionRequestApprovalEmail';
import {
  buildProductionRequestCancelledEmailHtml,
  type ProductionRequestCancelledEmailPayload,
} from './email/productionRequestCancelledEmail';
import {
  buildProductionRequestAcceptedEmailHtml,
  type ProductionRequestAcceptedEmailPayload,
} from './email/productionRequestAcceptedEmail';
import {
  buildProductionRequestRejectedEmailHtml,
  type ProductionRequestRejectedEmailPayload,
} from './email/productionRequestRejectedEmail';
import {
  buildProductionRequestStartedEmailHtml,
  type ProductionRequestStartedEmailPayload,
} from './email/productionRequestStartedEmail';
import {
  buildProductionRequestCompletedEmailHtml,
  type ProductionRequestCompletedEmailPayload,
} from './email/productionRequestCompletedEmail';
import {
  buildProductionRequestInventoryAddedEmailHtml,
  type ProductionRequestInventoryAddedEmailPayload,
} from './email/productionRequestInventoryAddedEmail';
import {
  buildInterBranchRequestWorkflowEmailHtml,
  type InterBranchRequestWorkflowEmailPayload,
} from './email/interBranchRequestWorkflowEmail';
import { emailEntityRef } from './email/emailHtmlUtils';
import {
  orderApprovedSubject,
  orderCancelledSubject,
  orderCreatedSubject,
  orderCustomerApprovedSubject,
  orderCustomerScheduledSubject,
  orderCustomerUnscheduledSubject,
  orderCustomerPortalShareSubject,
  orderDeliveryProofUploadedAgentSubject,
  orderOtherProofUploadedAgentSubject,
  orderPaymentProofUploadedAgentSubject,
  orderPaymentRecordedExecutiveSubject,
  orderPaymentOverdueSubject,
  orderCustomerPaymentOverdueSubject,
  orderCommissionPaidAgentSubject,
  orderLogisticsReadySubject,
  orderLogisticsLoadingSubject,
  orderPackedSubject,
  orderInTransitSubject,
  orderCustomerInTransitSubject,
  orderDeliveryRecordedSubject,
  orderCustomerDeliveryRecordedSubject,
  orderCustomerPaymentRecordedSubject,
  orderRejectedSubject,
  orderRevisedSubject,
  orderScheduledSubject,
  orderSubmittedForApprovalSubject,
  purchaseOrderSubmittedForApprovalSubject,
  purchaseOrderRejectedSubject,
  purchaseOrderCancelledSubject,
  purchaseOrderAcceptedSubject,
  purchaseOrderConfirmedSubject,
  purchaseOrderReceivedSubject,
  purchaseOrderPaymentRecordedSubject,
  productionRequestSubmittedForApprovalSubject,
  productionRequestCancelledSubject,
  productionRequestAcceptedSubject,
  productionRequestRejectedSubject,
  productionRequestStartedSubject,
  productionRequestCompletedSubject,
  productionRequestInventoryAddedSubject,
  interBranchSubmittedForApprovalSubject,
  interBranchApprovedSubject,
  interBranchLogisticsSubject,
  logisticsBranchSubject,
  interBranchDeliveryRecordedSubject,
  interBranchFulfilledSubject,
  interBranchCancelledSubject,
  interBranchRejectedSubject,
  tripDriverAssignedSubject,
  productStockAlertSubject,
  materialStockAlertSubject,
} from './email/notificationSubjects';
import { readEnv } from './env';

const app = express();
app.use(express.json({ limit: '1mb' }));

/** Restore full /api/... path when Vercel rewrites to /api. */
app.use((req, _res, next) => {
  if (!process.env.VERCEL) {
    next();
    return;
  }
  const forwarded =
    req.headers['x-vercel-forwarded-url'] ??
    req.headers['x-forwarded-uri'] ??
    req.headers['x-invoke-path'];
  if (typeof forwarded === 'string' && forwarded.startsWith('/api')) {
    req.url = forwarded;
  }
  next();
});

const resendKey = readEnv('RESEND_API_KEY');
const fromEmail = readEnv('RESEND_FROM_EMAIL', 'onboarding@resend.dev')!;
/** Until launch: all notification emails go here instead of DB emails. */
const emailOverride = readEnv('NOTIFICATIONS_EMAIL_OVERRIDE', 'jeymson9000@gmail.com')!;

/** Until launch: when NOTIFICATIONS_EMAIL_OVERRIDE is set, all mail goes there. */
function resolveRecipient(to?: string | null): string {
  const override = readEnv('NOTIFICATIONS_EMAIL_OVERRIDE');
  if (override) return override;
  const direct = to?.trim();
  if (direct) return direct;
  return emailOverride;
}

async function sendViaResend(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  entityRef?: string;
}): Promise<{ id?: string }> {
  if (!resendKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  const resend = new Resend(resendKey);
  const { data, error } = await resend.emails.send({
    from: `Lamtex Notifications <${fromEmail}>`,
    to: [opts.to],
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    headers: opts.entityRef ? { 'X-Entity-Ref-ID': opts.entityRef } : undefined,
  });
  if (error) {
    throw new Error(error.message ?? 'Failed to send email');
  }
  return { id: data?.id };
}

async function sendOrderNotificationEmail(
  payload: OrderCreatedEmailPayload,
  subject: string,
  res: express.Response,
  to?: string | null,
  kind: 'created' | 'submitted_for_approval' = 'created',
): Promise<void> {
  try {
    const sentTo = resolveRecipient(to);
    const html =
      kind === 'submitted_for_approval'
        ? buildOrderApprovalEmailHtml(payload)
        : buildOrderCreatedEmailHtml(payload);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, kind),
    });
    res.json({ ok: true, id, sentTo });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] Resend error', err);
    res.status(502).json({ error: message });
  }
}

app.post('/api/notifications/order-created', async (req, res) => {
  try {
    const payload = req.body as OrderCreatedEmailPayload;
    if (!payload?.orderId || !payload?.orderNumber) {
      res.status(400).json({ error: 'Missing orderId or orderNumber' });
      return;
    }

    const subject = orderCreatedSubject(payload);
    await sendOrderNotificationEmail(payload, subject, res, undefined, 'created');
  } catch (err) {
    console.error('[notify-server]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
});

app.post('/api/notifications/order-submitted-for-approval', async (req, res) => {
  try {
    const payload = req.body as OrderCreatedEmailPayload;
    if (!payload?.orderId || !payload?.orderNumber) {
      res.status(400).json({ error: 'Missing orderId or orderNumber' });
      return;
    }

    const subject = orderSubmittedForApprovalSubject(payload);
    await sendOrderNotificationEmail(payload, subject, res, undefined, 'submitted_for_approval');
  } catch (err) {
    console.error('[notify-server]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
});

app.post('/api/notifications/purchase-order-submitted-for-approval', async (req, res) => {
  try {
    const payload = req.body as PurchaseOrderSubmittedEmailPayload;
    if (!payload?.purchaseOrderId || !payload?.poNumber) {
      res.status(400).json({ error: 'Missing purchaseOrderId or poNumber' });
      return;
    }

    const sentTo = resolveRecipient();
    const subject = purchaseOrderSubmittedForApprovalSubject(payload);
    const html = buildPurchaseOrderApprovalEmailHtml(payload);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.purchaseOrderId, 'po-submitted_for_approval'),
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] PO submitted-for-approval email', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/purchase-order-rejected', async (req, res) => {
  try {
    const payload = req.body as PurchaseOrderRejectedEmailPayload;
    if (!payload?.purchaseOrderId || !payload?.poNumber) {
      res.status(400).json({ error: 'Missing purchaseOrderId or poNumber' });
      return;
    }

    const intended = payload.submitterEmail?.trim();
    const sentTo = resolveRecipient(intended);
    if (intended && sentTo !== intended) {
      console.log(`[notify-server] email override active: ${intended} → ${sentTo}`);
    }
    const subject = purchaseOrderRejectedSubject(payload);
    const html = buildPurchaseOrderRejectedEmailHtml(payload);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.purchaseOrderId, 'po-rejected'),
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] PO rejected email', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/purchase-order-cancelled', async (req, res) => {
  try {
    const payload = req.body as PurchaseOrderCancelledEmailPayload;
    if (!payload?.purchaseOrderId || !payload?.poNumber) {
      res.status(400).json({ error: 'Missing purchaseOrderId or poNumber' });
      return;
    }

    const intended = payload.submitterEmail?.trim();
    const sentTo = resolveRecipient(intended);
    if (intended && sentTo !== intended) {
      console.log(`[notify-server] email override active: ${intended} → ${sentTo}`);
    }
    const subject = purchaseOrderCancelledSubject(payload);
    const html = buildPurchaseOrderCancelledEmailHtml(payload);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.purchaseOrderId, 'po-cancelled'),
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] PO cancelled email', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/production-request-submitted-for-approval', async (req, res) => {
  try {
    const payload = req.body as ProductionRequestSubmittedEmailPayload;
    if (!payload?.productionRequestId || !payload?.prNumber) {
      res.status(400).json({ error: 'Missing productionRequestId or prNumber' });
      return;
    }

    const sentTo = resolveRecipient();
    const subject = productionRequestSubmittedForApprovalSubject(payload);
    const html = buildProductionRequestApprovalEmailHtml(payload);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.productionRequestId, 'pr-submitted_for_approval'),
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] PR submitted-for-approval email', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/production-request-cancelled', async (req, res) => {
  try {
    const payload = req.body as ProductionRequestCancelledEmailPayload;
    if (!payload?.productionRequestId || !payload?.prNumber) {
      res.status(400).json({ error: 'Missing productionRequestId or prNumber' });
      return;
    }

    const intended = payload.submitterEmail?.trim();
    const sentTo = resolveRecipient(intended);
    if (intended && sentTo !== intended) {
      console.log(`[notify-server] email override active: ${intended} → ${sentTo}`);
    }
    const subject = productionRequestCancelledSubject(payload);
    const html = buildProductionRequestCancelledEmailHtml(payload);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.productionRequestId, 'pr-cancelled'),
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] PR cancelled email', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/production-request-accepted', async (req, res) => {
  try {
    const payload = req.body as ProductionRequestAcceptedEmailPayload;
    if (!payload?.productionRequestId || !payload?.prNumber) {
      res.status(400).json({ error: 'Missing productionRequestId or prNumber' });
      return;
    }

    const intended = payload.submitterEmail?.trim();
    const sentTo = resolveRecipient(intended);
    if (intended && sentTo !== intended) {
      console.log(`[notify-server] email override active: ${intended} → ${sentTo}`);
    }
    const subject = productionRequestAcceptedSubject(payload);
    const html = buildProductionRequestAcceptedEmailHtml(payload);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.productionRequestId, 'pr-accepted'),
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] PR accepted email', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/production-request-rejected', async (req, res) => {
  try {
    const payload = req.body as ProductionRequestRejectedEmailPayload;
    if (!payload?.productionRequestId || !payload?.prNumber) {
      res.status(400).json({ error: 'Missing productionRequestId or prNumber' });
      return;
    }

    const intended = payload.submitterEmail?.trim();
    const sentTo = resolveRecipient(intended);
    if (intended && sentTo !== intended) {
      console.log(`[notify-server] email override active: ${intended} → ${sentTo}`);
    }
    const subject = productionRequestRejectedSubject(payload);
    const html = buildProductionRequestRejectedEmailHtml(payload);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.productionRequestId, 'pr-rejected'),
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] PR rejected email', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/production-request-started', async (req, res) => {
  try {
    const payload = req.body as ProductionRequestStartedEmailPayload;
    if (!payload?.productionRequestId || !payload?.prNumber) {
      res.status(400).json({ error: 'Missing productionRequestId or prNumber' });
      return;
    }

    const subject = productionRequestStartedSubject(payload);
    const html = buildProductionRequestStartedEmailHtml(payload);

    const inputEmails = (payload.recipientEmails ?? [])
      .map((e) => (typeof e === 'string' ? e.trim() : ''))
      .filter(Boolean) as string[];
    const targets = inputEmails.length > 0 ? inputEmails : [null];
    const uniqueRecipients = [...new Set(targets.map((email) => resolveRecipient(email)))];

    const sent: Array<{ id?: string; sentTo: string }> = [];
    for (const sentTo of uniqueRecipients) {
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.productionRequestId, 'pr-started'),
      });
      sent.push({ id, sentTo });
    }

    res.json({ ok: true, subject, sentCount: sent.length, sent });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] PR started email', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/production-request-completed', async (req, res) => {
  try {
    const payload = req.body as ProductionRequestCompletedEmailPayload;
    if (!payload?.productionRequestId || !payload?.prNumber) {
      res.status(400).json({ error: 'Missing productionRequestId or prNumber' });
      return;
    }

    const subject = productionRequestCompletedSubject(payload);
    const html = buildProductionRequestCompletedEmailHtml(payload);

    const inputEmails = (payload.recipientEmails ?? [])
      .map((e) => (typeof e === 'string' ? e.trim() : ''))
      .filter(Boolean) as string[];
    const targets = inputEmails.length > 0 ? inputEmails : [null];
    const uniqueRecipients = [...new Set(targets.map((email) => resolveRecipient(email)))];

    const sent: Array<{ id?: string; sentTo: string }> = [];
    for (const sentTo of uniqueRecipients) {
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.productionRequestId, 'pr-completed'),
      });
      sent.push({ id, sentTo });
    }

    res.json({ ok: true, subject, sentCount: sent.length, sent });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] PR completed email', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/production-request-inventory-added', async (req, res) => {
  try {
    const payload = req.body as ProductionRequestInventoryAddedEmailPayload;
    if (!payload?.productionRequestId || !payload?.prNumber) {
      res.status(400).json({ error: 'Missing productionRequestId or prNumber' });
      return;
    }

    const subject = productionRequestInventoryAddedSubject(payload);
    const html = buildProductionRequestInventoryAddedEmailHtml(payload);

    const inputEmails = (payload.recipientEmails ?? [])
      .map((e) => (typeof e === 'string' ? e.trim() : ''))
      .filter(Boolean) as string[];
    const targets = inputEmails.length > 0 ? inputEmails : [null];
    const uniqueRecipients = [...new Set(targets.map((email) => resolveRecipient(email)))];

    const sent: Array<{ id?: string; sentTo: string }> = [];
    for (const sentTo of uniqueRecipients) {
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.productionRequestId, 'pr-inventory-added'),
      });
      sent.push({ id, sentTo });
    }

    res.json({ ok: true, subject, sentCount: sent.length, sent });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] PR inventory-added email', err);
    res.status(502).json({ error: message });
  }
});

function interBranchWorkflowEmailSubject(
  payload: InterBranchRequestWorkflowEmailPayload,
  audience: 'executive' | 'warehouse' | 'logistics',
  branchName?: string | null,
): string {
  const ref = {
    ibrNumber: payload.ibrNumber,
    requestingBranchName: payload.requestingBranchName,
    fulfillingBranchName: payload.fulfillingBranchName,
  };
  const logisticsBody = (status: string) =>
    interBranchLogisticsSubject(
      {
        ...ref,
        status,
        vehicleName: payload.vehicleName,
        driverName: payload.driverName,
      },
      branchName ?? payload.requestingBranchName,
    );
  switch (payload.eventType) {
    case 'submitted_for_approval':
      return interBranchSubmittedForApprovalSubject(ref);
    case 'approved':
      if (audience === 'logistics') {
        return logisticsBranchSubject(
          branchName ?? payload.fulfillingBranchName,
          `${payload.ibrNumber} approved — ${payload.requestingBranchName ?? 'Branch'} → ${payload.fulfillingBranchName ?? 'Branch'}`,
        );
      }
      return interBranchApprovedSubject(ref, branchName);
    case 'scheduled':
    case 'loading':
    case 'packed':
    case 'ready':
    case 'in_transit':
      if (audience === 'logistics') {
        const statusLabel = payload.status.trim() || 'updated';
        const truckBit = payload.vehicleName?.trim() ? ` · ${payload.vehicleName.trim()}` : '';
        const driverBit =
          payload.driverName?.trim() && payload.driverName.trim() !== '—'
            ? ` · ${payload.driverName.trim()}`
            : '';
        return logisticsBranchSubject(
          branchName ?? payload.fulfillingBranchName,
          `${payload.ibrNumber} ${statusLabel.toLowerCase()} — from ${payload.fulfillingBranchName ?? 'Branch'}${truckBit}${driverBit}`,
        );
      }
      return logisticsBody(payload.status);
    case 'delivery_recorded':
      return interBranchDeliveryRecordedSubject({ ...ref, status: payload.status }, branchName);
    case 'fulfilled':
      return interBranchFulfilledSubject(ref, audience, branchName);
    case 'cancelled':
      return interBranchCancelledSubject(ref, branchName);
    case 'rejected':
      return interBranchRejectedSubject(ref, branchName);
    default:
      return interBranchApprovedSubject(ref, branchName);
  }
}

app.post('/api/notifications/inter-branch-workflow', async (req, res) => {
  try {
    const payload = req.body as InterBranchRequestWorkflowEmailPayload;
    if (!payload?.interBranchRequestId || !payload?.ibrNumber || !payload?.eventType) {
      res.status(400).json({ error: 'Missing interBranchRequestId, ibrNumber, or eventType' });
      return;
    }

    const html = buildInterBranchRequestWorkflowEmailHtml(payload);
    const groups = payload.recipientGroups ?? [];
    const sent: Array<{ id?: string; sentTo: string; subject: string }> = [];

    if (groups.length === 0) {
      const subject = interBranchWorkflowEmailSubject(payload, 'executive');
      const sentTo = resolveRecipient();
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.interBranchRequestId, `ibr-${payload.eventType}`),
      });
      sent.push({ id, sentTo, subject });
    } else {
      for (const group of groups) {
        const emails = (group.emails ?? [])
          .map((e) => (typeof e === 'string' ? e.trim() : ''))
          .filter(Boolean);
        const targets = emails.length > 0 ? emails : [null];
        const subject = interBranchWorkflowEmailSubject(payload, group.audience, group.branchName);
        for (const email of targets) {
          const sentTo = resolveRecipient(email);
          const { id } = await sendViaResend({
            to: sentTo,
            subject,
            html,
            entityRef: emailEntityRef(
              payload.interBranchRequestId,
              `ibr-${payload.eventType}-${group.audience}-${group.branchName ?? 'na'}`,
            ),
          });
          if (!sent.some((s) => s.sentTo === sentTo && s.subject === subject)) {
            sent.push({ id, sentTo, subject });
          }
        }
      }
    }

    res.json({ ok: true, sentCount: sent.length, sent });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] IBR workflow email', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/purchase-order-accepted', async (req, res) => {
  try {
    const payload = req.body as PurchaseOrderAcceptedEmailPayload;
    if (!payload?.purchaseOrderId || !payload?.poNumber) {
      res.status(400).json({ error: 'Missing purchaseOrderId or poNumber' });
      return;
    }

    const intended = payload.submitterEmail?.trim();
    const sentTo = resolveRecipient(intended);
    if (intended && sentTo !== intended) {
      console.log(`[notify-server] email override active: ${intended} → ${sentTo}`);
    }
    const subject = purchaseOrderAcceptedSubject(payload);
    const html = buildPurchaseOrderAcceptedEmailHtml(payload);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.purchaseOrderId, 'po-accepted'),
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] PO accepted email', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/purchase-order-confirmed', async (req, res) => {
  try {
    const payload = req.body as PurchaseOrderConfirmedEmailPayload;
    if (!payload?.purchaseOrderId || !payload?.poNumber || !payload?.audience) {
      res.status(400).json({ error: 'Missing purchaseOrderId, poNumber, or audience' });
      return;
    }

    const subject = purchaseOrderConfirmedSubject(payload, payload.audience);
    const html = buildPurchaseOrderConfirmedEmailHtml(payload);

    const inputEmails = (payload.recipientEmails ?? [])
      .map((e) => (typeof e === 'string' ? e.trim() : ''))
      .filter(Boolean) as string[];
    const targets = inputEmails.length > 0 ? inputEmails : [null];
    const uniqueRecipients = [...new Set(targets.map((email) => resolveRecipient(email)))];

    const sent: Array<{ id?: string; sentTo: string }> = [];
    for (const sentTo of uniqueRecipients) {
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.purchaseOrderId, `po-confirmed-${payload.audience}`),
      });
      sent.push({ id, sentTo });
    }

    res.json({ ok: true, subject, audience: payload.audience, sentCount: sent.length, sent });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] PO confirmed email', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/purchase-order-received', async (req, res) => {
  try {
    const payload = req.body as PurchaseOrderReceivedEmailPayload;
    if (!payload?.purchaseOrderId || !payload?.poNumber || !payload?.audience) {
      res.status(400).json({ error: 'Missing purchaseOrderId, poNumber, or audience' });
      return;
    }

    const subject = purchaseOrderReceivedSubject(payload, payload.audience, payload.isFullReceive);
    const html = buildPurchaseOrderReceivedEmailHtml(payload);

    const inputEmails = (payload.recipientEmails ?? [])
      .map((e) => (typeof e === 'string' ? e.trim() : ''))
      .filter(Boolean) as string[];
    const targets = inputEmails.length > 0 ? inputEmails : [null];
    const uniqueRecipients = [...new Set(targets.map((email) => resolveRecipient(email)))];

    const sent: Array<{ id?: string; sentTo: string }> = [];
    for (const sentTo of uniqueRecipients) {
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.purchaseOrderId, `po-received-${payload.audience}`),
      });
      sent.push({ id, sentTo });
    }

    res.json({ ok: true, subject, audience: payload.audience, sentCount: sent.length, sent });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] PO received email', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/purchase-order-payment-recorded', async (req, res) => {
  try {
    const payload = req.body as PurchaseOrderPaymentRecordedEmailPayload;
    if (!payload?.purchaseOrderId || !payload?.poNumber) {
      res.status(400).json({ error: 'Missing purchaseOrderId or poNumber' });
      return;
    }

    const subject = purchaseOrderPaymentRecordedSubject(payload, payload.paidInFull);
    const html = buildPurchaseOrderPaymentRecordedEmailHtml(payload);

    const inputEmails = (payload.recipientEmails ?? [])
      .map((e) => (typeof e === 'string' ? e.trim() : ''))
      .filter(Boolean) as string[];
    const targets = inputEmails.length > 0 ? inputEmails : [null];
    const uniqueRecipients = [...new Set(targets.map((email) => resolveRecipient(email)))];

    const sent: Array<{ id?: string; sentTo: string }> = [];
    for (const sentTo of uniqueRecipients) {
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.purchaseOrderId, 'po-payment-recorded'),
      });
      sent.push({ id, sentTo });
    }

    res.json({ ok: true, subject, sentCount: sent.length, sent });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] PO payment recorded email', err);
    res.status(502).json({ error: message });
  }
});

async function sendOrderDecisionEmail(
  payload: OrderDecisionEmailPayload,
  res: express.Response,
): Promise<void> {
  try {
    const approved = payload.decision === 'approved';
    const subject = approved ? orderApprovedSubject(payload) : orderRejectedSubject(payload);
    const intended = payload.agentEmail?.trim();
    const sentTo = resolveRecipient(payload.agentEmail);
    if (intended && sentTo !== intended) {
      console.log(`[notify-server] email override active: ${intended} → ${sentTo}`);
    }
    const html = buildOrderDecisionEmailHtml(payload);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, payload.decision),
    });
    res.json({ ok: true, id, sentTo, decision: payload.decision, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] Resend error', err);
    res.status(502).json({ error: message });
  }
}

app.post('/api/notifications/order-approved', async (req, res) => {
  try {
    const payload = req.body as OrderDecisionEmailPayload;
    if (!payload?.orderId || !payload?.orderNumber || payload.decision !== 'approved') {
      res.status(400).json({ error: 'Missing orderId, orderNumber, or invalid decision' });
      return;
    }
    await sendOrderDecisionEmail(payload, res);
  } catch (err) {
    console.error('[notify-server]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
});

app.post('/api/notifications/order-rejected', async (req, res) => {
  try {
    const payload = req.body as OrderDecisionEmailPayload;
    if (!payload?.orderId || !payload?.orderNumber || payload.decision !== 'rejected') {
      res.status(400).json({ error: 'Missing orderId, orderNumber, or invalid decision' });
      return;
    }
    await sendOrderDecisionEmail(payload, res);
  } catch (err) {
    console.error('[notify-server]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal error' });
  }
});

app.post('/api/notifications/order-ready-for-scheduling', async (req, res) => {
  try {
    const payload = req.body as OrderLogisticsReadyEmailPayload;
    if (!payload?.orderId || !payload?.orderNumber) {
      res.status(400).json({ error: 'Missing orderId or orderNumber' });
      return;
    }

    const subject = orderLogisticsReadySubject(payload);
    const html = buildOrderLogisticsReadyEmailHtml(payload);
    const emails = (payload.logisticsEmails ?? []).map((e) => e?.trim()).filter(Boolean) as string[];
    const targets = emails.length > 0 ? emails : [null];
    const uniqueRecipients = [...new Set(targets.map((email) => resolveRecipient(email)))];

    const sent: Array<{ id?: string; sentTo: string }> = [];
    for (const sentTo of uniqueRecipients) {
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, 'logistics-ready'),
      });
      sent.push({ id, sentTo });
    }

    res.json({ ok: true, subject, sentCount: sent.length, sent });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] order-ready-for-scheduling', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/order-loading', async (req, res) => {
  try {
    const payload = req.body as OrderLogisticsLoadingEmailPayload;
    if (!payload?.orderId || !payload?.orderNumber) {
      res.status(400).json({ error: 'Missing orderId or orderNumber' });
      return;
    }

    const subject = orderLogisticsLoadingSubject(payload);
    const html = buildOrderLogisticsLoadingEmailHtml(payload);
    const emails = (payload.logisticsEmails ?? []).map((e) => e?.trim()).filter(Boolean) as string[];
    const targets = emails.length > 0 ? emails : [null];
    const uniqueRecipients = [...new Set(targets.map((email) => resolveRecipient(email)))];

    const sent: Array<{ id?: string; sentTo: string }> = [];
    for (const sentTo of uniqueRecipients) {
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, 'logistics-loading'),
      });
      sent.push({ id, sentTo });
    }

    res.json({ ok: true, subject, sentCount: sent.length, sent });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] order-loading', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/order-packed', async (req, res) => {
  try {
    const payload = req.body as OrderPackedEmailPayload;
    if (!payload?.orderId || !payload?.orderNumber) {
      res.status(400).json({ error: 'Missing orderId or orderNumber' });
      return;
    }

    const sent: Array<{ id?: string; sentTo: string; notifyTarget: 'logistics' | 'agent' }> = [];

    const logisticsEmails = (payload.logisticsEmails ?? []).map((e) => e?.trim()).filter(Boolean) as string[];
    const logisticsTargets = logisticsEmails.length > 0 ? logisticsEmails : [null];
    const uniqueLogistics = [...new Set(logisticsTargets.map((email) => resolveRecipient(email)))];
    for (const sentTo of uniqueLogistics) {
      const logisticsPayload: OrderPackedEmailPayload = { ...payload, notifyTarget: 'logistics' };
      const subject = orderPackedSubject(logisticsPayload, 'logistics');
      const html = buildOrderPackedEmailHtml(logisticsPayload);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, 'logistics-packed'),
      });
      sent.push({ id, sentTo, notifyTarget: 'logistics' });
    }

    if (payload.agentEmail?.trim()) {
      const sentTo = resolveRecipient(payload.agentEmail);
      const agentPayload: OrderPackedEmailPayload = { ...payload, notifyTarget: 'agent' };
      const subject = orderPackedSubject(agentPayload, 'agent');
      const html = buildOrderPackedEmailHtml(agentPayload);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, 'agent-packed'),
      });
      sent.push({ id, sentTo, notifyTarget: 'agent' });
    }

    res.json({ ok: true, sentCount: sent.length, sent });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] order-packed', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/order-in-transit', async (req, res) => {
  try {
    const payload = req.body as OrderInTransitEmailPayload;
    if (!payload?.orderId || !payload?.orderNumber || !payload.notifyTarget) {
      res.status(400).json({ error: 'Missing orderId, orderNumber, or notifyTarget' });
      return;
    }

    const target = payload.notifyTarget;
    const subject = orderInTransitSubject(payload, target);
    const html = buildOrderInTransitEmailHtml(payload);

    if (target === 'warehouse') {
      const emails = (payload.warehouseEmails ?? []).map((e) => e?.trim()).filter(Boolean) as string[];
      const targets = emails.length > 0 ? emails : [null];
      const uniqueRecipients = [...new Set(targets.map((email) => resolveRecipient(email)))];
      const sent: Array<{ id?: string; sentTo: string }> = [];
      for (const sentTo of uniqueRecipients) {
        const { id } = await sendViaResend({
          to: sentTo,
          subject,
          html,
          entityRef: emailEntityRef(payload.orderId, 'in-transit-warehouse'),
        });
        sent.push({ id, sentTo });
      }
      res.json({ ok: true, subject, sentCount: sent.length, sent, notifyTarget: target });
      return;
    }

    if (target === 'agent') {
      const sentTo = resolveRecipient(payload.agentEmail);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, 'in-transit-agent'),
      });
      res.json({ ok: true, id, sentTo, subject, notifyTarget: target });
      return;
    }

    const sentTo = resolveRecipient(null);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, 'in-transit-executive'),
    });
    res.json({ ok: true, id, sentTo, subject, notifyTarget: target });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] order-in-transit', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/order-in-transit-customer', async (req, res) => {
  try {
    const payload = req.body as OrderCustomerInTransitEmailPayload;
    if (!payload?.orderId || !payload?.orderNumber || !payload?.customerEmail?.trim()) {
      res.status(400).json({ error: 'Missing orderId, orderNumber, or customerEmail' });
      return;
    }

    const subject = orderCustomerInTransitSubject(payload);
    const html = buildOrderCustomerInTransitEmailHtml(payload);
    const sentTo = resolveRecipient(payload.customerEmail);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, 'customer-in-transit'),
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] order-in-transit-customer', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/order-delivery-recorded', async (req, res) => {
  try {
    const payload = req.body as OrderDeliveryRecordedEmailPayload;
    if (!payload?.orderId || !payload?.orderNumber || !payload.notifyTarget) {
      res.status(400).json({ error: 'Missing orderId, orderNumber, or notifyTarget' });
      return;
    }

    const target = payload.notifyTarget;
    const subject = orderDeliveryRecordedSubject(payload, target);
    const html = buildOrderDeliveryRecordedEmailHtml(payload);

    if (target === 'agent') {
      const sentTo = resolveRecipient(payload.agentEmail);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, 'delivery-agent'),
      });
      res.json({ ok: true, id, sentTo, subject, notifyTarget: target });
      return;
    }

    const sentTo = resolveRecipient(null);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, 'delivery-executive'),
    });
    res.json({ ok: true, id, sentTo, subject, notifyTarget: target });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] order-delivery-recorded', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/order-delivery-recorded-customer', async (req, res) => {
  try {
    const payload = req.body as OrderCustomerDeliveryRecordedEmailPayload;
    if (!payload?.orderId || !payload?.orderNumber || !payload?.customerEmail?.trim()) {
      res.status(400).json({ error: 'Missing orderId, orderNumber, or customerEmail' });
      return;
    }

    const subject = orderCustomerDeliveryRecordedSubject(payload);
    const html = buildOrderCustomerDeliveryRecordedEmailHtml(payload);
    const sentTo = resolveRecipient(payload.customerEmail);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, 'customer-delivery'),
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] order-delivery-recorded-customer', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/order-payment-recorded-customer', async (req, res) => {
  try {
    const payload = req.body as OrderCustomerPaymentRecordedEmailPayload;
    if (!payload?.orderId || !payload?.orderNumber || !payload?.customerEmail?.trim()) {
      res.status(400).json({ error: 'Missing orderId, orderNumber, or customerEmail' });
      return;
    }

    const subject = orderCustomerPaymentRecordedSubject(payload);
    const html = buildOrderCustomerPaymentRecordedEmailHtml(payload);
    const sentTo = resolveRecipient(payload.customerEmail);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, 'customer-payment'),
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] order-payment-recorded-customer', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/order-approved-customer', async (req, res) => {
  try {
    const payload = req.body as OrderCustomerApprovedEmailPayload;
    if (!payload?.orderId || !payload?.orderNumber || !payload?.customerEmail?.trim()) {
      res.status(400).json({ error: 'Missing orderId, orderNumber, or customerEmail' });
      return;
    }

    const subject = orderCustomerApprovedSubject(payload);
    const html = buildOrderCustomerApprovedEmailHtml(payload);
    const sentTo = resolveRecipient(payload.customerEmail);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, 'customer-approved'),
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] order-approved-customer', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/order-scheduled-customer', async (req, res) => {
  try {
    const payload = req.body as OrderCustomerScheduledEmailPayload;
    if (!payload?.orderId || !payload?.orderNumber || !payload?.customerEmail?.trim()) {
      res.status(400).json({ error: 'Missing orderId, orderNumber, or customerEmail' });
      return;
    }

    const subject = orderCustomerScheduledSubject(payload);
    const html = buildOrderCustomerScheduledEmailHtml(payload);
    const sentTo = resolveRecipient(payload.customerEmail);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, 'customer-scheduled'),
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] order-scheduled-customer', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/order-unscheduled-customer', async (req, res) => {
  try {
    const payload = req.body as OrderCustomerUnscheduledEmailPayload;
    if (!payload?.orderId || !payload?.orderNumber || !payload?.customerEmail?.trim()) {
      res.status(400).json({ error: 'Missing orderId, orderNumber, or customerEmail' });
      return;
    }

    const subject = orderCustomerUnscheduledSubject(payload);
    const html = buildOrderCustomerUnscheduledEmailHtml(payload);
    const sentTo = resolveRecipient(payload.customerEmail);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, 'customer-unscheduled'),
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] order-unscheduled-customer', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/order-portal-share', async (req, res) => {
  try {
    const payload = req.body as OrderCustomerPortalShareEmailPayload;
    if (!payload?.orderId || !payload?.orderNumber || !payload?.customerEmail?.trim()) {
      res.status(400).json({ error: 'Missing orderId, orderNumber, or customerEmail' });
      return;
    }
    if (!payload?.portalToken?.trim()) {
      res.status(400).json({ error: 'Missing portalToken' });
      return;
    }

    const subject = orderCustomerPortalShareSubject(payload);
    const html = buildOrderCustomerPortalShareEmailHtml(payload);
    const sentTo = resolveRecipient(payload.customerEmail);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, 'customer-portal-share'),
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] order-portal-share', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/order-delivery-proof-uploaded-agent', async (req, res) => {
  try {
    const payload = req.body as OrderDeliveryProofUploadedEmailPayload;
    if (!payload?.orderId || !payload?.orderNumber || !payload?.agentEmail?.trim()) {
      res.status(400).json({ error: 'Missing orderId, orderNumber, or agentEmail' });
      return;
    }

    const isOther = payload.proofType === 'other';
    const isPayment = payload.proofType === 'payment';
    const subject = isPayment
      ? orderPaymentProofUploadedAgentSubject(payload)
      : isOther
        ? orderOtherProofUploadedAgentSubject(payload)
        : orderDeliveryProofUploadedAgentSubject(payload);
    const html = buildOrderDeliveryProofUploadedEmailHtml(payload);
    const sentTo = resolveRecipient(payload.agentEmail);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(
        payload.orderId,
        isPayment ? 'payment-proof-agent' : isOther ? 'other-proof-agent' : 'delivery-proof-agent',
      ),
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] order-delivery-proof-uploaded-agent', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/order-payment-recorded', async (req, res) => {
  try {
    const payload = req.body as OrderPaymentRecordedEmailPayload;
    if (!payload?.orderId || !payload?.orderNumber) {
      res.status(400).json({ error: 'Missing orderId or orderNumber' });
      return;
    }

    const subject = orderPaymentRecordedExecutiveSubject(payload);
    const html = buildOrderPaymentRecordedEmailHtml(payload);
    const sentTo = resolveRecipient(null);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, 'payment-executive'),
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] order-payment-recorded', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/order-commission-paid-agent', async (req, res) => {
  try {
    const payload = req.body as OrderCommissionPaidAgentEmailPayload;
    if (!payload?.orderId || !payload?.orderNumber || !payload?.agentEmail?.trim()) {
      res.status(400).json({ error: 'Missing orderId, orderNumber, or agentEmail' });
      return;
    }

    const subject = orderCommissionPaidAgentSubject(payload);
    const html = buildOrderCommissionPaidAgentEmailHtml(payload);
    const sentTo = resolveRecipient(payload.agentEmail);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, 'commission-paid-agent'),
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] order-commission-paid-agent', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/trip-driver-assigned', async (req, res) => {
  try {
    const payload = req.body as TripDriverAssignedEmailPayload;
    if (!payload?.tripId || !payload?.tripNumber) {
      res.status(400).json({ error: 'Missing tripId or tripNumber' });
      return;
    }

    const subject = tripDriverAssignedSubject(payload);
    const html = buildTripDriverAssignedEmailHtml(payload);
    const sentTo = resolveRecipient(payload.driverEmail);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.tripId, 'driver-assigned'),
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] trip-driver-assigned', err);
    res.status(502).json({ error: message });
  }
});

interface ProductStockAlertNotificationRequest extends ProductStockAlertEmailPayload {
  /** Direct email overrides. If omitted, defaults to NOTIFICATIONS_EMAIL_OVERRIDE. */
  recipientEmails?: (string | null | undefined)[];
}

interface MaterialStockAlertNotificationRequest extends MaterialStockAlertEmailPayload {
  /** Direct email overrides. If omitted, defaults to NOTIFICATIONS_EMAIL_OVERRIDE. */
  recipientEmails?: (string | null | undefined)[];
}

app.post('/api/notifications/product-stock-alert', async (req, res) => {
  try {
    const payload = req.body as ProductStockAlertNotificationRequest;
    if (!payload?.variantId || !payload?.productId || !payload?.sku) {
      res.status(400).json({ error: 'Missing variantId, productId, or sku' });
      return;
    }
    if (!payload.severity || !payload.audience) {
      res.status(400).json({ error: 'Missing severity or audience' });
      return;
    }

    const subject = productStockAlertSubject({
      sku: payload.sku,
      productName: payload.productName,
      size: payload.size ?? null,
      branchName: payload.branchName ?? null,
      severity: payload.severity,
      audience: payload.audience,
    });
    const html = buildProductStockAlertEmailHtml(payload);

    const inputEmails = (payload.recipientEmails ?? [])
      .map((e) => (typeof e === 'string' ? e.trim() : ''))
      .filter(Boolean) as string[];
    const targets = inputEmails.length > 0 ? inputEmails : [null];
    const uniqueRecipients = [...new Set(targets.map((email) => resolveRecipient(email)))];

    const sent: Array<{ id?: string; sentTo: string }> = [];
    for (const sentTo of uniqueRecipients) {
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.variantId, `stock-${payload.severity}-${payload.audience}`),
      });
      sent.push({ id, sentTo });
    }

    res.json({ ok: true, subject, sentCount: sent.length, sent });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] product-stock-alert', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/material-stock-alert', async (req, res) => {
  try {
    const payload = req.body as MaterialStockAlertNotificationRequest;
    if (!payload?.materialId || !payload?.sku) {
      res.status(400).json({ error: 'Missing materialId or sku' });
      return;
    }
    if (!payload.severity || !payload.audience) {
      res.status(400).json({ error: 'Missing severity or audience' });
      return;
    }

    const subject = materialStockAlertSubject({
      sku: payload.sku,
      name: payload.name,
      branchName: payload.branchName ?? null,
      severity: payload.severity,
      audience: payload.audience,
    });
    const html = buildMaterialStockAlertEmailHtml(payload);

    const inputEmails = (payload.recipientEmails ?? [])
      .map((e) => (typeof e === 'string' ? e.trim() : ''))
      .filter(Boolean) as string[];
    const targets = inputEmails.length > 0 ? inputEmails : [null];
    const uniqueRecipients = [...new Set(targets.map((email) => resolveRecipient(email)))];

    const sent: Array<{ id?: string; sentTo: string }> = [];
    for (const sentTo of uniqueRecipients) {
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.materialId, `material-stock-${payload.severity}-${payload.audience}`),
      });
      sent.push({ id, sentTo });
    }

    res.json({ ok: true, subject, sentCount: sent.length, sent });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] material-stock-alert', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/order-revised', async (req, res) => {
  try {
    const payload = req.body as OrderRevisedEmailPayload;
    if (!payload?.orderId || !payload?.orderNumber) {
      res.status(400).json({ error: 'Missing orderId or orderNumber' });
      return;
    }

    const subject = orderRevisedSubject(payload);
    const sentTo = resolveRecipient(null);
    const html = buildOrderRevisedEmailHtml(payload);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, 'revised'),
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server]', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/order-cancelled', async (req, res) => {
  try {
    const payload = req.body as OrderCancelledEmailPayload;
    if (!payload?.orderId || !payload?.orderNumber || !payload.notifyTarget) {
      res.status(400).json({ error: 'Missing orderId, orderNumber, or notifyTarget' });
      return;
    }

    const forAgent = payload.notifyTarget === 'agent';
    const subject = orderCancelledSubject(payload, payload.notifyTarget);
    const sentTo = resolveRecipient(forAgent ? payload.agentEmail : null);
    const html = buildOrderCancelledEmailHtml(payload);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, `cancelled-${payload.notifyTarget}`),
    });
    res.json({ ok: true, id, sentTo, subject, notifyTarget: payload.notifyTarget });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server]', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/order-scheduled', async (req, res) => {
  try {
    const payload = req.body as OrderScheduledEmailPayload;
    if (!payload?.orderId || !payload?.orderNumber || !payload.notifyTarget) {
      res.status(400).json({ error: 'Missing orderId, orderNumber, or notifyTarget' });
      return;
    }

    const target = payload.notifyTarget;
    const subject = orderScheduledSubject(payload, target);

    const html = buildOrderScheduledEmailHtml(payload);

    if (target === 'warehouse') {
      const emails = (payload.warehouseEmails ?? []).map((e) => e?.trim()).filter(Boolean) as string[];
      const targets = emails.length > 0 ? emails : [null];
      const uniqueRecipients = [...new Set(targets.map((email) => resolveRecipient(email)))];
      const sent: Array<{ id?: string; sentTo: string }> = [];
      for (const sentTo of uniqueRecipients) {
        const { id } = await sendViaResend({
          to: sentTo,
          subject,
          html,
          entityRef: emailEntityRef(payload.orderId, 'scheduled-warehouse'),
        });
        sent.push({ id, sentTo });
      }
      res.json({ ok: true, subject, sentCount: sent.length, sent, notifyTarget: target });
      return;
    }

    if (target === 'agent') {
      const sentTo = resolveRecipient(payload.agentEmail);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, 'scheduled-agent'),
      });
      res.json({ ok: true, id, sentTo, subject, notifyTarget: target });
      return;
    }

    const sentTo = resolveRecipient(null);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, 'scheduled-executive'),
    });
    res.json({ ok: true, id, sentTo, subject, notifyTarget: target });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] order-scheduled', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/order-payment-overdue', async (req, res) => {
  try {
    const payload = req.body as OrderPaymentOverdueEmailPayload;
    if (!payload?.orderId || !payload?.orderNumber || !payload?.notifyTarget) {
      res.status(400).json({ error: 'Missing orderId, orderNumber, or notifyTarget' });
      return;
    }

    const target = payload.notifyTarget;
    const subject = orderPaymentOverdueSubject(payload, target);
    const html = buildOrderPaymentOverdueEmailHtml(payload);
    const sentTo = resolveRecipient(target === 'agent' ? payload.agentEmail : null);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, `payment-overdue-${target}`),
    });
    res.json({ ok: true, id, sentTo, subject, notifyTarget: target });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] order-payment-overdue', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/notifications/order-payment-overdue-customer', async (req, res) => {
  try {
    const payload = req.body as OrderCustomerPaymentOverdueEmailPayload;
    if (!payload?.orderId || !payload?.orderNumber || !payload?.customerEmail?.trim()) {
      res.status(400).json({ error: 'Missing orderId, orderNumber, or customerEmail' });
      return;
    }

    const subject = orderCustomerPaymentOverdueSubject(payload);
    const html = buildOrderCustomerPaymentOverdueEmailHtml(payload);
    const sentTo = resolveRecipient(payload.customerEmail);
    const { id } = await sendViaResend({
      to: sentTo,
      subject,
      html,
      entityRef: emailEntityRef(payload.orderId, 'customer-payment-overdue'),
    });
    res.json({ ok: true, id, sentTo, subject });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    if (message.includes('RESEND_API_KEY')) {
      res.status(503).json({ error: message });
      return;
    }
    console.error('[notify-server] order-payment-overdue-customer', err);
    res.status(502).json({ error: message });
  }
});

app.post('/api/link-preview', async (req, res) => {
  try {
    const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
    if (!/^https?:\/\//i.test(url)) {
      res.status(400).json({ ok: false, error: 'Invalid url' });
      return;
    }

    const ogs = (await import('open-graph-scraper')).default;
    const { result, error } = await ogs({
      url,
      timeout: 6000,
      fetchOptions: { headers: { 'user-agent': 'Mozilla/5.0 (compatible; LamtexBot/1.0)' } },
    });
    if (error || !result?.success) {
      res.json({ ok: false });
      return;
    }

    const r = result as Record<string, any>;
    const ogImage = r.ogImage;
    const imageRaw = Array.isArray(ogImage) ? ogImage[0]?.url : ogImage?.url;
    res.json({
      ok: true,
      url: r.ogUrl ?? r.requestUrl ?? url,
      title: r.ogTitle ?? r.twitterTitle ?? null,
      description: r.ogDescription ?? r.twitterDescription ?? null,
      image: imageRaw ?? null,
      siteName: r.ogSiteName ?? null,
    });
  } catch (err) {
    console.error('[notify-server] link-preview', err);
    res.json({ ok: false });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    resendConfigured: Boolean(resendKey),
    emailOverride: readEnv('NOTIFICATIONS_EMAIL_OVERRIDE') ?? null,
    fromEmail,
  });
});

app.use('/api', (_req, res) => {
  console.warn('[notify-server] unmatched route', _req.method, _req.url);
  res.status(404).json({ error: 'Not found', method: _req.method, path: _req.url });
});

export default app;
