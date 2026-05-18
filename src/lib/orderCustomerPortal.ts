import { supabase } from '@/src/lib/supabase';
import { mapPublicActivities } from '@/src/lib/publicOrderActivity';
import { getItemDiscountLines } from '@/src/lib/publicOrderTotals';
import type {
  OrderCustomerPortalRow,
  PublicOrderAssignedDriver,
  PublicOrderContact,
  PublicOrderDiscountAmountLine,
  PublicOrderDiscountLine,
  PublicOrderSummary,
} from '@/src/types/orderCustomerPortal';

function generatePortalToken(): string {
  const year = new Date().getFullYear();
  const suffix = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `ORD-${year}-${suffix}`;
}

export function buildOrderCustomerPortalUrl(token: string): string {
  const base =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : '';
  return `${base}/order/${token}`;
}

function mapPortalRow(row: Record<string, unknown>): OrderCustomerPortalRow {
  return {
    id: String(row.id),
    orderId: String(row.order_id),
    token: String(row.token),
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    viewCount: Number(row.view_count ?? 0),
    lastViewedAt: row.last_viewed_at ? String(row.last_viewed_at) : null,
    customerEmail: row.customer_email ? String(row.customer_email) : null,
    sentViaEmail: Boolean(row.sent_via_email),
    lastEmailSent: row.last_email_sent ? String(row.last_email_sent) : null,
    createdAt: String(row.created_at),
  };
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function parseJsonArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapDiscountsBreakdown(raw: unknown): PublicOrderDiscountLine[] {
  return parseJsonArray(raw)
    .map((row) => {
      if (row == null || typeof row !== 'object') return null;
      const r = row as Record<string, unknown>;
      const name = String(r.name ?? '').trim();
      const percentage = num(r.percentage ?? r.percent);
      if (!name && percentage <= 0) return null;
      return { name: name || 'Discount', percentage };
    })
    .filter((d): d is PublicOrderDiscountLine => d != null);
}

function getItemDiscountLinesFromBreakdown(item: {
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  discountsBreakdown?: PublicOrderDiscountLine[];
  total: number;
}): PublicOrderDiscountAmountLine[] {
  return getItemDiscountLines({
    description: '',
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    discountAmount: item.discountAmount,
    discountsBreakdown: item.discountsBreakdown,
    total: item.total,
  });
}

function mapDiscountLines(raw: unknown): PublicOrderDiscountAmountLine[] {
  return parseJsonArray(raw)
    .map((row) => {
      if (row == null || typeof row !== 'object') return null;
      const r = row as Record<string, unknown>;
      const amount = num(r.amount);
      if (amount <= 0) return null;
      const name = String(r.name ?? '').trim() || 'Discount';
      const pctRaw = r.percentage ?? r.percent;
      const percentage = pctRaw != null && String(pctRaw).trim() !== '' ? num(pctRaw) : undefined;
      return { name, amount, percentage };
    })
    .filter((d): d is PublicOrderDiscountAmountLine => d != null);
}

function mapContact(raw: Record<string, unknown> | null | undefined, fallbackName = ''): PublicOrderContact {
  return {
    name: String(raw?.name ?? fallbackName ?? ''),
    phone: raw?.phone != null && String(raw.phone).trim() !== '' ? String(raw.phone) : null,
    email: raw?.email != null && String(raw.email).trim() !== '' ? String(raw.email) : null,
  };
}

function mapAssignedDriver(raw: unknown): PublicOrderAssignedDriver | null {
  if (raw == null || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const name = String(r.name ?? '').trim();
  if (!name) return null;
  return {
    ...mapContact(r, name),
    vehicleName: r.vehicleName != null && String(r.vehicleName).trim() !== '' ? String(r.vehicleName) : null,
    tripNumber: r.tripNumber != null ? String(r.tripNumber) : null,
    status: r.status != null ? String(r.status) : null,
  };
}

function mapPublicSummary(raw: Record<string, unknown>): PublicOrderSummary {
  const customer = (raw.customer as Record<string, unknown>) ?? {};
  const company = (raw.company as Record<string, unknown>) ?? {};
  const agent = mapContact(
    (raw.agent as Record<string, unknown>) ?? undefined,
    raw.agentName != null ? String(raw.agentName) : '',
  );
  return {
    ok: Boolean(raw.ok),
    error: raw.error ? String(raw.error) : undefined,
    orderNumber: String(raw.orderNumber ?? ''),
    orderDate: String(raw.orderDate ?? ''),
    requiredDate: raw.requiredDate != null ? String(raw.requiredDate) : null,
    status: String(raw.status ?? ''),
    paymentStatus: String(raw.paymentStatus ?? ''),
    paymentTerms: raw.paymentTerms != null ? String(raw.paymentTerms) : null,
    deliveryType: raw.deliveryType != null ? String(raw.deliveryType) : null,
    deliveryAddress: raw.deliveryAddress != null ? String(raw.deliveryAddress) : null,
    subtotal: num(raw.subtotal),
    discountPercent: num(raw.discountPercent),
    discountAmount: num(raw.discountAmount),
    taxAmount: num(raw.taxAmount),
    totalAmount: num(raw.totalAmount),
    amountPaid: num(raw.amountPaid),
    balanceDue: num(raw.balanceDue),
    invoiceNumber: raw.invoiceNumber != null ? String(raw.invoiceNumber) : null,
    issueDate: raw.issueDate != null ? String(raw.issueDate) : null,
    dueDate: raw.dueDate != null ? String(raw.dueDate) : null,
    orderNotes: raw.orderNotes != null ? String(raw.orderNotes) : null,
    invoiceNotes: raw.invoiceNotes != null ? String(raw.invoiceNotes) : null,
    agentName: agent.name || (raw.agentName != null ? String(raw.agentName) : null),
    agent,
    assignedDriver: mapAssignedDriver(raw.assignedDriver),
    branchName: raw.branchName != null ? String(raw.branchName) : null,
    customer: {
      name: String(customer.name ?? ''),
      email: customer.email != null ? String(customer.email) : null,
      phone: customer.phone != null ? String(customer.phone) : null,
      contactPerson: customer.contactPerson != null ? String(customer.contactPerson) : null,
      address: customer.address != null ? String(customer.address) : null,
    },
    company: {
      name: String(company.name ?? 'LAMTEX'),
      phone: company.phone != null ? String(company.phone) : null,
      email: company.email != null ? String(company.email) : null,
      address: company.address != null ? String(company.address) : null,
    },
    items: Array.isArray(raw.items)
      ? (raw.items as Record<string, unknown>[]).map((item) => {
          const quantity = num(item.quantity);
          const unitPrice = num(item.unitPrice);
          const discountAmount = num(item.discountAmount);
          const total = num(item.total);
          const discountsBreakdown = mapDiscountsBreakdown(
            item.discountsBreakdown ?? item.discounts_breakdown,
          );
          const fromRpc = mapDiscountLines(item.discountLines ?? item.discount_lines);
          const lineItem = {
            description: String(item.description ?? ''),
            quantity,
            unitPrice,
            discountAmount,
            discountsBreakdown,
            total,
          };
          return {
            ...lineItem,
            discountLines:
              fromRpc.length > 0
                ? fromRpc
                : getItemDiscountLinesFromBreakdown(lineItem),
          };
        })
      : [],
    trips: Array.isArray(raw.trips)
      ? (raw.trips as Record<string, unknown>[]).map((t) => ({
          tripNumber: String(t.tripNumber ?? ''),
          driverName: String(t.driverName ?? ''),
          driverPhone: t.driverPhone != null && String(t.driverPhone).trim() !== '' ? String(t.driverPhone) : null,
          driverEmail: t.driverEmail != null && String(t.driverEmail).trim() !== '' ? String(t.driverEmail) : null,
          vehicleName: String(t.vehicleName ?? ''),
          status: String(t.status ?? ''),
          scheduledDate: t.scheduledDate != null ? String(t.scheduledDate) : null,
          delayReason: t.delayReason != null ? String(t.delayReason) : null,
        }))
      : [],
    activities: mapPublicActivities(raw.activities ?? raw.payments),
  };
}

export async function fetchPortalForOrder(orderId: string): Promise<OrderCustomerPortalRow | null> {
  const { data, error } = await supabase
    .from('order_customer_portals')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle();
  if (error) {
    console.error('fetchPortalForOrder', error);
    return null;
  }
  return data ? mapPortalRow(data as Record<string, unknown>) : null;
}

/** Creates or returns the stable customer link for an order (staff, authenticated). */
export async function ensureOrderCustomerPortal(
  orderId: string,
  customerEmail?: string | null,
): Promise<{ portal: OrderCustomerPortalRow | null; error?: string }> {
  const existing = await fetchPortalForOrder(orderId);
  if (existing) {
    if (customerEmail && customerEmail !== existing.customerEmail) {
      await supabase
        .from('order_customer_portals')
        .update({ customer_email: customerEmail, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      return { portal: { ...existing, customerEmail } };
    }
    return { portal: existing };
  }

  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const { data, error } = await supabase
    .from('order_customer_portals')
    .insert({
      order_id: orderId,
      token: generatePortalToken(),
      expires_at: expiresAt.toISOString(),
      customer_email: customerEmail ?? null,
    })
    .select('*')
    .single();

  if (error) {
    return { portal: null, error: error.message };
  }
  return { portal: mapPortalRow(data as Record<string, unknown>) };
}

export async function fetchPublicOrderSummary(token: string): Promise<PublicOrderSummary> {
  const { data, error } = await supabase.rpc('get_public_order_summary', { p_token: token });
  if (error) {
    console.error('fetchPublicOrderSummary', error);
    return {
      ok: false,
      error: 'load_failed',
      orderNumber: '',
      orderDate: '',
      status: '',
      paymentStatus: '',
      subtotal: 0,
      discountPercent: 0,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 0,
      amountPaid: 0,
      balanceDue: 0,
      customer: { name: '' },
      company: { name: 'LAMTEX' },
      agent: { name: '' },
      assignedDriver: null,
      items: [],
      trips: [],
      activities: [],
    };
  }
  return mapPublicSummary((data ?? { ok: false, error: 'empty' }) as Record<string, unknown>);
}

/** Marks email as sent. Wire Resend/SendGrid in an Edge Function when ready. */
export async function recordOrderPortalEmailSent(portalId: string, email: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('order_customer_portals')
    .update({
      customer_email: email,
      sent_via_email: true,
      last_email_sent: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', portalId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export function publicOrderErrorMessage(code?: string): string {
  switch (code) {
    case 'not_found':
      return 'This order link is invalid or has been removed.';
    case 'expired':
      return 'This order link has expired. Please contact your sales agent for a new link.';
    case 'cancelled':
      return 'This order was cancelled.';
    case 'invalid_token':
      return 'Invalid link.';
    default:
      return 'We could not load this order. Please try again later or contact LAMTEX.';
  }
}
