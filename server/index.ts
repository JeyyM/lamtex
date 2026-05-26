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
  sampleOrderEmailPayload,
  sampleOrderDecisionPayload,
  sampleOrderRevisedPayload,
  sampleOrderCancelledPayload,
  sampleOrderLogisticsReadyPayload,
  sampleOrderLogisticsLoadingPayload,
  sampleOrderPackedPayload,
  sampleOrderInTransitPayload,
  sampleOrderCustomerInTransitPayload,
  sampleOrderDeliveryRecordedPayload,
  sampleOrderCustomerDeliveryRecordedPayload,
  sampleOrderCustomerApprovedPayload,
  sampleOrderCustomerScheduledPayload,
  sampleOrderCustomerUnscheduledPayload,
  sampleOrderCustomerPortalSharePayload,
  sampleOrderScheduledPayload,
  sampleOrderPaymentProofUploadedPayload,
  sampleOrderPaymentRecordedPayload,
  sampleOrderPaymentRecordedPaidInFullPayload,
  sampleOrderCustomerPaymentRecordedPayload,
  sampleOrderCustomerPaymentRecordedPaidInFullPayload,
  sampleOrderPaymentProofUploadedPaidInFullPayload,
  sampleOrderCommissionPaidAgentPayload,
  sampleTripDriverAssignedPayload,
  sampleProductStockAlertPayload,
  sampleMaterialStockAlertPayload,
} from './email/sampleOrderEmailPayload';
import {
  samplePurchaseOrderSubmittedPayload,
  samplePurchaseOrderRejectedPayload,
  samplePurchaseOrderCancelledPayload,
  samplePurchaseOrderAcceptedPayload,
  samplePurchaseOrderConfirmedPayload,
} from './email/samplePurchaseOrderEmailPayload';
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
  tripDriverAssignedSubject,
  productStockAlertSubject,
  materialStockAlertSubject,
} from './email/notificationSubjects';

const app = express();
app.use(express.json({ limit: '1mb' }));

const PORT = Number(process.env.NOTIFY_SERVER_PORT ?? 3001);
const resendKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
/** Until launch: all notification emails go here instead of DB emails. */
const emailOverride = process.env.NOTIFICATIONS_EMAIL_OVERRIDE ?? 'jeymson9000@gmail.com';

/** Until launch: when NOTIFICATIONS_EMAIL_OVERRIDE is set, all mail goes there. */
function resolveRecipient(to?: string | null): string {
  const override = process.env.NOTIFICATIONS_EMAIL_OVERRIDE?.trim();
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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/email-test/config', (_req, res) => {
  res.json({
    resendConfigured: Boolean(resendKey),
    fromEmail,
    defaultTo: emailOverride,
    appUrl: process.env.APP_URL ?? 'http://localhost:3000',
    notifyServerPort: PORT,
  });
});

app.post('/api/email-test/send', async (req, res) => {
  try {
    const { to, subject, html, text } = req.body as {
      to?: string;
      subject?: string;
      html?: string;
      text?: string;
    };
    if (!subject?.trim()) {
      res.status(400).json({ error: 'Subject is required' });
      return;
    }
    if (!html?.trim() && !text?.trim()) {
      res.status(400).json({ error: 'HTML or plain text body is required' });
      return;
    }
    const sentTo = resolveRecipient(to);
    const bodyHtml =
      html?.trim() ||
      `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap;padding:24px;">${String(text).replace(/</g, '&lt;')}</pre>`;
    const { id } = await sendViaResend({
      to: sentTo,
      subject: subject.trim(),
      html: bodyHtml,
      text: text?.trim() || undefined,
    });
    res.json({ ok: true, id, sentTo });
  } catch (err) {
    console.error('[notify-server] email-test/send', err);
    const message = err instanceof Error ? err.message : 'Internal error';
    res.status(message.includes('RESEND_API_KEY') ? 503 : 502).json({ error: message });
  }
});

app.post('/api/email-test/template', async (req, res) => {
  try {
    const { template, to } = req.body as {
      template?:
        | 'order_created'
        | 'order_submitted_for_approval'
        | 'order_approved'
        | 'order_rejected'
        | 'order_revised'
        | 'order_cancelled_agent'
        | 'order_cancelled_executive'
        | 'order_logistics_ready'
        | 'order_logistics_loading'
        | 'order_packed_logistics'
        | 'order_packed_agent'
        | 'order_in_transit_executive'
        | 'order_in_transit_warehouse'
        | 'order_in_transit_agent'
        | 'order_in_transit_customer'
        | 'order_delivery_executive'
        | 'order_delivery_agent'
        | 'order_delivery_customer'
        | 'order_customer_approved'
        | 'order_customer_scheduled'
        | 'order_customer_unscheduled'
        | 'order_customer_portal_share'
        | 'order_payment_proof_agent'
        | 'order_payment_recorded_executive'
        | 'order_payment_recorded_executive_paid'
        | 'order_payment_recorded_customer'
        | 'order_payment_recorded_customer_paid'
        | 'order_payment_proof_agent_paid'
        | 'order_commission_paid_agent'
        | 'order_scheduled_executive'
        | 'order_scheduled_warehouse'
        | 'order_scheduled_agent'
        | 'trip_driver_assigned'
        | 'product_low_stock_executive'
        | 'product_low_stock_warehouse'
        | 'product_critical_stock_executive'
        | 'product_critical_stock_warehouse'
        | 'product_out_of_stock_executive'
        | 'product_out_of_stock_warehouse'
        | 'material_low_stock_executive'
        | 'material_low_stock_warehouse'
        | 'material_critical_stock_executive'
        | 'material_critical_stock_warehouse'
        | 'material_out_of_stock_executive'
        | 'material_out_of_stock_warehouse'
        | 'purchase_order_submitted_for_approval'
        | 'purchase_order_rejected'
        | 'purchase_order_cancelled'
        | 'purchase_order_accepted'
        | 'purchase_order_confirmed_executive'
        | 'purchase_order_confirmed_warehouse'
        | 'plain_welcome';
      to?: string;
    };
    const sentTo = resolveRecipient(to);

    if (template === 'plain_welcome') {
      const { id } = await sendViaResend({
        to: sentTo,
        subject: 'Lamtex — Resend test email',
        html: `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;padding:32px;">
          <h1 style="color:#991b1b;">Lamtex email test</h1>
          <p>If you received this, Resend is configured correctly.</p>
          <p style="color:#6b7280;font-size:14px;">Sent at ${new Date().toISOString()}</p>
        </body></html>`,
        text: 'Lamtex email test — if you received this, Resend is configured correctly.',
      });
      res.json({ ok: true, id, sentTo, template });
      return;
    }

    if (template === 'order_created' || template === 'order_submitted_for_approval') {
      const isApproval = template === 'order_submitted_for_approval';
      const payload = sampleOrderEmailPayload(isApproval ? 'submitted_for_approval' : 'created');
      const subject = isApproval
        ? orderSubmittedForApprovalSubject(payload)
        : orderCreatedSubject(payload);
      const html = isApproval ? buildOrderApprovalEmailHtml(payload) : buildOrderCreatedEmailHtml(payload);
      const { id } = await sendViaResend({ to: sentTo, subject, html });
      res.json({ ok: true, id, sentTo, template, subject });
      return;
    }

    if (template === 'purchase_order_submitted_for_approval') {
      const payload = samplePurchaseOrderSubmittedPayload();
      const subject = purchaseOrderSubmittedForApprovalSubject(payload);
      const html = buildPurchaseOrderApprovalEmailHtml(payload);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.purchaseOrderId, 'po-submitted_for_approval'),
      });
      res.json({ ok: true, id, sentTo, template, subject });
      return;
    }

    if (template === 'purchase_order_rejected') {
      const payload = samplePurchaseOrderRejectedPayload();
      const subject = purchaseOrderRejectedSubject(payload);
      const html = buildPurchaseOrderRejectedEmailHtml(payload);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.purchaseOrderId, 'po-rejected'),
      });
      res.json({ ok: true, id, sentTo, template, subject });
      return;
    }

    if (template === 'purchase_order_cancelled') {
      const payload = samplePurchaseOrderCancelledPayload();
      const subject = purchaseOrderCancelledSubject(payload);
      const html = buildPurchaseOrderCancelledEmailHtml(payload);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.purchaseOrderId, 'po-cancelled'),
      });
      res.json({ ok: true, id, sentTo, template, subject });
      return;
    }

    if (template === 'purchase_order_accepted') {
      const payload = samplePurchaseOrderAcceptedPayload();
      const subject = purchaseOrderAcceptedSubject(payload);
      const html = buildPurchaseOrderAcceptedEmailHtml(payload);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.purchaseOrderId, 'po-accepted'),
      });
      res.json({ ok: true, id, sentTo, template, subject });
      return;
    }

    if (template === 'purchase_order_confirmed_executive' || template === 'purchase_order_confirmed_warehouse') {
      const audience = template === 'purchase_order_confirmed_warehouse' ? 'warehouse' : 'executive';
      const payload = samplePurchaseOrderConfirmedPayload(audience);
      const subject = purchaseOrderConfirmedSubject(payload, audience);
      const html = buildPurchaseOrderConfirmedEmailHtml(payload);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.purchaseOrderId, `po-confirmed-${audience}`),
      });
      res.json({ ok: true, id, sentTo, template, subject });
      return;
    }

    if (template === 'order_approved' || template === 'order_rejected') {
      const decision = template === 'order_approved' ? 'approved' : 'rejected';
      const payload = sampleOrderDecisionPayload(decision);
      const subject =
        decision === 'approved' ? orderApprovedSubject(payload) : orderRejectedSubject(payload);
      const html = buildOrderDecisionEmailHtml(payload);
      const { id } = await sendViaResend({ to: sentTo, subject, html });
      res.json({ ok: true, id, sentTo, template, subject });
      return;
    }

    if (template === 'order_revised') {
      const payload = sampleOrderRevisedPayload();
      const subject = orderRevisedSubject(payload);
      const html = buildOrderRevisedEmailHtml(payload);
      const { id } = await sendViaResend({ to: sentTo, subject, html });
      res.json({ ok: true, id, sentTo, template, subject });
      return;
    }

    if (template === 'order_cancelled_agent' || template === 'order_cancelled_executive') {
      const notifyTarget = template === 'order_cancelled_agent' ? 'agent' : 'executive';
      const payload = sampleOrderCancelledPayload(notifyTarget);
      const subject = orderCancelledSubject(payload, notifyTarget);
      const html = buildOrderCancelledEmailHtml(payload);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, `cancelled-${notifyTarget}`),
      });
      res.json({ ok: true, id, sentTo, template, subject });
      return;
    }

    if (template === 'order_logistics_ready') {
      const payload = sampleOrderLogisticsReadyPayload();
      const subject = orderLogisticsReadySubject(payload);
      const html = buildOrderLogisticsReadyEmailHtml(payload);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, 'logistics-ready'),
      });
      res.json({ ok: true, id, sentTo, template, subject });
      return;
    }

    if (template === 'order_logistics_loading') {
      const payload = sampleOrderLogisticsLoadingPayload();
      const subject = orderLogisticsLoadingSubject(payload);
      const html = buildOrderLogisticsLoadingEmailHtml(payload);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, 'logistics-loading'),
      });
      res.json({ ok: true, id, sentTo, template, subject });
      return;
    }

    if (template === 'order_packed_logistics' || template === 'order_packed_agent') {
      const notifyTarget = template === 'order_packed_logistics' ? 'logistics' : 'agent';
      const payload = sampleOrderPackedPayload(notifyTarget);
      const subject = orderPackedSubject(payload, notifyTarget);
      const html = buildOrderPackedEmailHtml(payload);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, `${notifyTarget}-packed`),
      });
      res.json({ ok: true, id, sentTo, template, subject });
      return;
    }

    if (
      template === 'order_in_transit_executive' ||
      template === 'order_in_transit_warehouse' ||
      template === 'order_in_transit_agent'
    ) {
      const notifyTarget =
        template === 'order_in_transit_warehouse'
          ? 'warehouse'
          : template === 'order_in_transit_agent'
            ? 'agent'
            : 'executive';
      const payload = sampleOrderInTransitPayload(notifyTarget);
      const subject = orderInTransitSubject(payload, notifyTarget);
      const html = buildOrderInTransitEmailHtml(payload);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, `in-transit-${notifyTarget}`),
      });
      res.json({ ok: true, id, sentTo, template, subject });
      return;
    }

    if (template === 'order_in_transit_customer') {
      const payload = sampleOrderCustomerInTransitPayload();
      const subject = orderCustomerInTransitSubject(payload);
      const html = buildOrderCustomerInTransitEmailHtml(payload);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, 'customer-in-transit'),
      });
      res.json({ ok: true, id, sentTo, template, subject });
      return;
    }

    if (template === 'order_delivery_executive' || template === 'order_delivery_agent') {
      const notifyTarget = template === 'order_delivery_agent' ? 'agent' : 'executive';
      const payload = sampleOrderDeliveryRecordedPayload(notifyTarget);
      const subject = orderDeliveryRecordedSubject(payload, notifyTarget);
      const html = buildOrderDeliveryRecordedEmailHtml(payload);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, `delivery-${notifyTarget}`),
      });
      res.json({ ok: true, id, sentTo, template, subject });
      return;
    }

    if (template === 'order_delivery_customer') {
      const payload = sampleOrderCustomerDeliveryRecordedPayload();
      const subject = orderCustomerDeliveryRecordedSubject(payload);
      const html = buildOrderCustomerDeliveryRecordedEmailHtml(payload);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, 'customer-delivery'),
      });
      res.json({ ok: true, id, sentTo, template, subject });
      return;
    }

    if (template === 'order_customer_approved') {
      const payload = sampleOrderCustomerApprovedPayload();
      const subject = orderCustomerApprovedSubject(payload);
      const html = buildOrderCustomerApprovedEmailHtml(payload);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, 'customer-approved'),
      });
      res.json({ ok: true, id, sentTo, template, subject });
      return;
    }

    if (template === 'order_customer_scheduled') {
      const payload = sampleOrderCustomerScheduledPayload();
      const subject = orderCustomerScheduledSubject(payload);
      const html = buildOrderCustomerScheduledEmailHtml(payload);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, 'customer-scheduled'),
      });
      res.json({ ok: true, id, sentTo, template, subject });
      return;
    }

    if (template === 'order_customer_unscheduled') {
      const payload = sampleOrderCustomerUnscheduledPayload();
      const subject = orderCustomerUnscheduledSubject(payload);
      const html = buildOrderCustomerUnscheduledEmailHtml(payload);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, 'customer-unscheduled'),
      });
      res.json({ ok: true, id, sentTo, template, subject });
      return;
    }

    if (template === 'order_customer_portal_share') {
      const payload = sampleOrderCustomerPortalSharePayload();
      const subject = orderCustomerPortalShareSubject(payload);
      const html = buildOrderCustomerPortalShareEmailHtml(payload);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, 'customer-portal-share'),
      });
      res.json({ ok: true, id, sentTo, template, subject });
      return;
    }

    if (template === 'order_payment_proof_agent') {
      const payload = sampleOrderPaymentProofUploadedPayload();
      const subject = orderPaymentProofUploadedAgentSubject(payload);
      const html = buildOrderDeliveryProofUploadedEmailHtml(payload);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, 'payment-proof-agent'),
      });
      res.json({ ok: true, id, sentTo, template, subject });
      return;
    }

    if (template === 'order_payment_recorded_executive') {
      const payload = sampleOrderPaymentRecordedPayload();
      const subject = orderPaymentRecordedExecutiveSubject(payload);
      const html = buildOrderPaymentRecordedEmailHtml(payload);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, 'payment-executive'),
      });
      res.json({ ok: true, id, sentTo, template, subject });
      return;
    }

    if (template === 'order_payment_recorded_executive_paid') {
      const payload = sampleOrderPaymentRecordedPaidInFullPayload();
      const subject = orderPaymentRecordedExecutiveSubject(payload);
      const html = buildOrderPaymentRecordedEmailHtml(payload);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, 'payment-executive-paid'),
      });
      res.json({ ok: true, id, sentTo, template, subject });
      return;
    }

    if (template === 'order_payment_recorded_customer') {
      const payload = sampleOrderCustomerPaymentRecordedPayload();
      const subject = orderCustomerPaymentRecordedSubject(payload);
      const html = buildOrderCustomerPaymentRecordedEmailHtml(payload);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, 'customer-payment'),
      });
      res.json({ ok: true, id, sentTo, template, subject });
      return;
    }

    if (template === 'order_payment_recorded_customer_paid') {
      const payload = sampleOrderCustomerPaymentRecordedPaidInFullPayload();
      const subject = orderCustomerPaymentRecordedSubject(payload);
      const html = buildOrderCustomerPaymentRecordedEmailHtml(payload);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, 'customer-payment-paid'),
      });
      res.json({ ok: true, id, sentTo, template, subject });
      return;
    }

    if (template === 'order_payment_proof_agent_paid') {
      const payload = sampleOrderPaymentProofUploadedPaidInFullPayload();
      const subject = orderPaymentProofUploadedAgentSubject(payload);
      const html = buildOrderDeliveryProofUploadedEmailHtml(payload);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, 'payment-proof-agent-paid'),
      });
      res.json({ ok: true, id, sentTo, template, subject });
      return;
    }

    if (template === 'order_commission_paid_agent') {
      const payload = sampleOrderCommissionPaidAgentPayload();
      const subject = orderCommissionPaidAgentSubject(payload);
      const html = buildOrderCommissionPaidAgentEmailHtml(payload);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, 'commission-paid-agent'),
      });
      res.json({ ok: true, id, sentTo, template, subject });
      return;
    }

    if (
      template === 'order_scheduled_executive' ||
      template === 'order_scheduled_warehouse' ||
      template === 'order_scheduled_agent'
    ) {
      const notifyTarget =
        template === 'order_scheduled_executive'
          ? 'executive'
          : template === 'order_scheduled_warehouse'
            ? 'warehouse'
            : 'agent';
      const payload = sampleOrderScheduledPayload(notifyTarget);
      const subject = orderScheduledSubject(payload, notifyTarget);
      const html = buildOrderScheduledEmailHtml(payload);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.orderId, `scheduled-${notifyTarget}`),
      });
      res.json({ ok: true, id, sentTo, template, subject });
      return;
    }

    if (template === 'trip_driver_assigned') {
      const payload = sampleTripDriverAssignedPayload();
      const subject = tripDriverAssignedSubject(payload);
      const html = buildTripDriverAssignedEmailHtml(payload);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.tripId, 'driver-assigned'),
      });
      res.json({ ok: true, id, sentTo, template, subject });
      return;
    }

    if (
      template === 'material_low_stock_executive' ||
      template === 'material_low_stock_warehouse' ||
      template === 'material_critical_stock_executive' ||
      template === 'material_critical_stock_warehouse' ||
      template === 'material_out_of_stock_executive' ||
      template === 'material_out_of_stock_warehouse'
    ) {
      const severity = template.includes('out_of_stock')
        ? 'out_of_stock'
        : template.includes('critical_stock')
          ? 'critical'
          : 'low_stock';
      const audience = template.endsWith('warehouse') ? 'warehouse' : 'executive';
      const payload = sampleMaterialStockAlertPayload(severity, audience);
      const subject = materialStockAlertSubject({
        sku: payload.sku,
        name: payload.name,
        branchName: payload.branchName,
        severity: payload.severity,
        audience: payload.audience,
      });
      const html = buildMaterialStockAlertEmailHtml(payload);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.materialId, `material-stock-${severity}-${audience}`),
      });
      res.json({ ok: true, id, sentTo, template, subject });
      return;
    }

    if (
      template === 'product_low_stock_executive' ||
      template === 'product_low_stock_warehouse' ||
      template === 'product_critical_stock_executive' ||
      template === 'product_critical_stock_warehouse' ||
      template === 'product_out_of_stock_executive' ||
      template === 'product_out_of_stock_warehouse'
    ) {
      const severity = template.includes('out_of_stock')
        ? 'out_of_stock'
        : template.includes('critical_stock')
          ? 'critical'
          : 'low_stock';
      const audience = template.endsWith('warehouse') ? 'warehouse' : 'executive';
      const payload = sampleProductStockAlertPayload(severity, audience);
      const subject = productStockAlertSubject({
        sku: payload.sku,
        productName: payload.productName,
        size: payload.size,
        branchName: payload.branchName,
        severity: payload.severity,
        audience: payload.audience,
      });
      const html = buildProductStockAlertEmailHtml(payload);
      const { id } = await sendViaResend({
        to: sentTo,
        subject,
        html,
        entityRef: emailEntityRef(payload.variantId, `stock-${severity}-${audience}`),
      });
      res.json({ ok: true, id, sentTo, template, subject });
      return;
    }

    res.status(400).json({ error: 'Unknown template' });
  } catch (err) {
    console.error('[notify-server] email-test/template', err);
    const message = err instanceof Error ? err.message : 'Internal error';
    res.status(message.includes('RESEND_API_KEY') ? 503 : 502).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`[notify-server] listening on http://localhost:${PORT}`);
  console.log(`[notify-server] emails → ${emailOverride}`);
});
