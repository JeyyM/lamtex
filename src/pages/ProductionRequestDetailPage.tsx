import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { supabase } from '@/src/lib/supabase';
import { consumeBomForProductionLines } from '@/src/lib/bomConsumption';
import { isPrExpectedOverdue } from '@/src/lib/prOverdue';
import { addFinishedVariantUnitsAtBranch } from '@/src/lib/finishedGoodsInbound';
import type { PRStatus } from '@/src/pages/ProductionRequestsPage';
import {
  OrderProductSelectionModal,
  type OrderProductSelectionConfirm,
  type OrderProductInitialEdit,
} from '@/src/components/orders/OrderProductSelectionModal';
import {
  RecordProductionModal,
  type ProductionLineResult,
  type ProductionLineRow,
} from '@/src/components/production/RecordProductionModal';
import {
  ArrowLeft,
  Factory,
  Loader2,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  PlayCircle,
  ClipboardList,
  StickyNote,
  Calendar,
  Truck,
  User,
  Clock,
  ThumbsUp,
  Package,
  Ban,
  FileText,
  AlertTriangle,
  RefreshCw,
  Send,
  ShoppingCart,
  Search,
  ArrowUpDown,
  Edit,
  Save,
  ArrowRightLeft,
} from 'lucide-react';

interface PRItemRow {
  id: string;
  request_id: string;
  product_id: string;
  product_variant_id: string;
  quantity: number;
  quantity_completed: number;
  product_variants: {
    sku: string;
    size: string;
    reorder_point?: number;
    products: { name: string } | { name: string }[] | null;
  } | null;
}

interface PRHeader {
  id: string;
  pr_number: string;
  branch_id: string | null;
  status: PRStatus;
  request_date: string;
  expected_completion_date: string | null;
  notes: string | null;
  created_by: string | null;
  accepted_by: string | null;
  accepted_at: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  is_transfer_request: boolean;
  transfer_requesting_branch_id: string | null;
  branches: { name: string } | null;
  tr_branch: { name: string } | null;
  inter_branch_request_id: string | null;
  inter_branch: { id: string; ibr_number: string; status: string } | null;
}

function asOne<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

const fmt = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const fmtDT = (iso: string | null) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
};

const getStatusVariant = (s: PRStatus): 'success' | 'warning' | 'danger' | 'neutral' | 'default' | 'info' => {
  if (s === 'Completed') return 'success';
  if (s === 'Cancelled' || s === 'Rejected') return 'danger';
  if (s === 'Requested') return 'warning';
  if (s === 'In Progress') return 'info';
  if (s === 'Accepted') return 'default';
  if (s === 'Draft') return 'neutral';
  return 'neutral';
};

const getPRStatusIcon = (s: PRStatus) => {
  if (s === 'Completed') return <CheckCircle className="w-4 h-4" />;
  if (s === 'In Progress') return <PlayCircle className="w-4 h-4" />;
  if (s === 'Cancelled') return <Ban className="w-4 h-4" />;
  if (s === 'Draft') return <FileText className="w-4 h-4" />;
  if (s === 'Requested') return <ClipboardList className="w-4 h-4" />;
  if (s === 'Rejected') return <XCircle className="w-4 h-4" />;
  if (s === 'Accepted') return <ThumbsUp className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
};

function prLogActionIcon(action: string) {
  switch (action) {
    case 'drafted': return <FileText className="w-4 h-4" />;
    case 'submitted': return <Send className="w-4 h-4" />;
    case 'requested':
    case 'line_added': return <ClipboardList className="w-4 h-4" />;
    case 'approved': return <CheckCircle className="w-4 h-4" />;
    case 'rejected': return <XCircle className="w-4 h-4" />;
    case 'in_progress': return <PlayCircle className="w-4 h-4" />;
    case 'completed': return <CheckCircle className="w-4 h-4" />;
    case 'cancelled': return <Ban className="w-4 h-4" />;
    case 'line_removed': return <Trash2 className="w-4 h-4" />;
    case 'order_linked': return <ShoppingCart className="w-4 h-4" />;
    case 'order_unlinked': return <XCircle className="w-4 h-4" />;
    case 'updated': return <FileText className="w-4 h-4" />;
    default: return <Clock className="w-4 h-4" />;
  }
}

function prLogActionColor(action: string) {
  switch (action) {
    case 'drafted': return 'text-slate-600 bg-slate-100';
    case 'submitted': return 'text-amber-600 bg-amber-50';
    case 'approved':
    case 'completed': return 'text-green-600 bg-green-50';
    case 'rejected': return 'text-red-600 bg-red-50';
    case 'in_progress': return 'text-violet-600 bg-violet-50';
    case 'requested': return 'text-amber-600 bg-amber-50';
    case 'line_added': return 'text-blue-600 bg-blue-50';
    case 'line_removed': return 'text-orange-600 bg-orange-50';
    case 'order_linked': return 'text-cyan-600 bg-cyan-50';
    case 'order_unlinked': return 'text-orange-600 bg-orange-50';
    case 'cancelled': return 'text-gray-600 bg-gray-50';
    default: return 'text-gray-600 bg-gray-50';
  }
}

const prLogRoleMap: Record<string, string> = {
  Executive: 'Admin',
  Agent: 'Agent',
  Warehouse: 'Warehouse Staff',
  Logistics: 'Logistics',
  Driver: 'Logistics',
  Production: 'Production',
  Manager: 'Manager',
  Procurement: 'Procurement',
  Finance: 'Finance',
};

function prLogRoleBadgeColor(role: string) {
  switch (role) {
    case 'Agent':
      return 'bg-blue-100 text-blue-800';
    case 'Manager':
      return 'bg-purple-100 text-purple-800';
    case 'Warehouse':
    case 'Warehouse Staff':
      return 'bg-orange-100 text-orange-800';
    case 'Logistics':
    case 'Driver':
      return 'bg-green-100 text-green-800';
    case 'Executive':
    case 'Admin':
      return 'bg-red-100 text-red-800';
    case 'Production':
      return 'bg-amber-100 text-amber-800';
    case 'System':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

type LogRow = {
  id: string;
  action: string;
  performed_by: string | null;
  description: string | null;
  created_at: string;
  performed_by_role: string | null;
};

type InvolvedOrderLine = {
  id: string;
  product_name: string | null;
  variant_description: string | null;
  sku: string | null;
  quantity: number;
};

type InvolvedOrderRow = {
  linkId: string;
  orderId: string;
  orderNumber: string;
  status: string;
  customerName: string | null;
  lineItems: InvolvedOrderLine[];
  requiredDate: string | null;
  estimatedDelivery: string | null;
};

function orderStatusBadgeVariant(
  status: string,
): 'success' | 'warning' | 'danger' | 'info' | 'default' | 'neutral' {
  if (['Delivered', 'Completed', 'Approved'].includes(status)) return 'success';
  if (['Pending', 'Scheduled', 'Loading', 'Packed', 'Ready'].includes(status)) return 'warning';
  if (['Rejected', 'Cancelled'].includes(status)) return 'danger';
  if (status === 'In Transit') return 'info';
  if (status === 'Draft') return 'neutral';
  return 'default';
}

/** Linked customer record for search (name + business / tax ids as “code”). */
type OrderPickerCustomerRef = {
  name: string;
  tax_id: string | null;
  business_registration: string | null;
};

type OrderPickerRow = {
  id: string;
  order_number: string;
  customer_name: string | null;
  required_date: string | null;
  estimated_delivery: string | null;
  status: string;
  created_at: string | null;
  order_line_items: InvolvedOrderLine[] | null;
  customerRef: OrderPickerCustomerRef | null;
};

function orderPickerRowMatchesSearch(o: OrderPickerRow, q: string): boolean {
  if (!q) return true;
  if (o.order_number.toLowerCase().includes(q)) return true;
  if ((o.customer_name ?? '').toLowerCase().includes(q)) return true;
  const c = o.customerRef;
  if (c) {
    if (c.name.toLowerCase().includes(q)) return true;
    if ((c.tax_id ?? '').toLowerCase().includes(q)) return true;
    if ((c.business_registration ?? '').toLowerCase().includes(q)) return true;
  }
  return false;
}

type OrderPickerSort =
  | 'newest'
  | 'oldest'
  | 'order_asc'
  | 'order_desc'
  | 'req_asc'
  | 'req_desc'
  | 'customer_asc'
  | 'customer_desc'
  | 'lines_desc'
  | 'lines_asc';

function sortOrderPickerList(rows: OrderPickerRow[], sort: OrderPickerSort): OrderPickerRow[] {
  const out = [...rows];
  out.sort((a, b) => {
    switch (sort) {
      case 'newest':
        return (b.created_at ?? '').localeCompare(a.created_at ?? '');
      case 'oldest':
        return (a.created_at ?? '').localeCompare(b.created_at ?? '');
      case 'order_asc':
        return a.order_number.localeCompare(b.order_number, undefined, { numeric: true, sensitivity: 'base' });
      case 'order_desc':
        return b.order_number.localeCompare(a.order_number, undefined, { numeric: true, sensitivity: 'base' });
      case 'req_asc': {
        if (!a.required_date && !b.required_date) return 0;
        if (!a.required_date) return 1;
        if (!b.required_date) return -1;
        return a.required_date.localeCompare(b.required_date);
      }
      case 'req_desc': {
        if (!a.required_date && !b.required_date) return 0;
        if (!a.required_date) return 1;
        if (!b.required_date) return -1;
        return b.required_date.localeCompare(a.required_date);
      }
      case 'customer_asc':
        return (a.customer_name ?? '').localeCompare(b.customer_name ?? '', undefined, { sensitivity: 'base' });
      case 'customer_desc':
        return (b.customer_name ?? '').localeCompare(a.customer_name ?? '', undefined, { sensitivity: 'base' });
      case 'lines_desc': {
        const la = a.order_line_items?.length ?? 0;
        const lb = b.order_line_items?.length ?? 0;
        return lb - la || a.order_number.localeCompare(b.order_number, undefined, { numeric: true });
      }
      case 'lines_asc': {
        const la = a.order_line_items?.length ?? 0;
        const lb = b.order_line_items?.length ?? 0;
        return la - lb || a.order_number.localeCompare(b.order_number, undefined, { numeric: true });
      }
      default:
        return 0;
    }
  });
  return out;
}

const ALL_PR_STATUSES: PRStatus[] = [
  'Draft',
  'Requested',
  'Rejected',
  'Accepted',
  'In Progress',
  'Completed',
  'Cancelled',
];

/** Full workflow column set for a target status (used when status changes in edit mode). */
function workflowFieldsForPrStatus(
  s: PRStatus,
  pr: PRHeader,
  actor: string,
): {
  status: PRStatus;
  accepted_by: string | null;
  accepted_at: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
} {
  if (s === 'Accepted') {
    return {
      status: s,
      accepted_by: pr.accepted_by ?? actor,
      accepted_at: pr.accepted_at ?? new Date().toISOString(),
      rejected_by: null,
      rejection_reason: null,
    };
  }
  if (s === 'Rejected') {
    return {
      status: s,
      accepted_by: null,
      accepted_at: null,
      rejected_by: pr.rejected_by ?? actor,
      rejection_reason: pr.rejection_reason,
    };
  }
  return {
    status: s,
    accepted_by: null,
    accepted_at: null,
    rejected_by: null,
    rejection_reason: null,
  };
}

export function ProductionRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { role, session, employeeName, addAuditLog, branch: branchName } = useAppContext();

  const [pr, setPr] = useState<PRHeader | null>(null);
  const [items, setItems] = useState<PRItemRow[]>([]);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAccept, setShowAccept] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showAddLine, setShowAddLine] = useState(false);
  /** `production_request_items.id` when opening the picker to edit that line; `null` = add. */
  const [editingPrLineId, setEditingPrLineId] = useState<string | null>(null);
  const [expDate, setExpDate] = useState('');
  const [notes, setNotes] = useState('');
  const [involvedOrders, setInvolvedOrders] = useState<InvolvedOrderRow[]>([]);
  const [showOrderPicker, setShowOrderPicker] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderPickerSort, setOrderPickerSort] = useState<OrderPickerSort>('newest');
  const [orderPickerList, setOrderPickerList] = useState<OrderPickerRow[]>([]);
  const [orderPickerLoading, setOrderPickerLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedStatus, setEditedStatus] = useState<PRStatus | null>(null);
  const [showRecordProduction, setShowRecordProduction] = useState(false);

  const prProductPickLock = useRef(false);

  const actor = employeeName || session?.user?.email || 'User';
  const canApprove = ['Executive', 'Manager'].includes(role);
  const canRunProduction = ['Executive', 'Manager', 'Production', 'Warehouse'].includes(role);

  const fetchLogs = useCallback(async (requestId: string) => {
    const { data, error: e } = await supabase
      .from('production_request_logs')
      .select('id, action, performed_by, description, created_at, performed_by_role')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });
    if (e) {
      if (import.meta.env.DEV) console.warn('[PR logs]', e.message);
      setLogs([]);
      return;
    }
    setLogs((data ?? []) as LogRow[]);
  }, []);

  const fetchLinkedOrders = useCallback(async (requestId: string) => {
    const { data, error: e } = await supabase
      .from('production_request_orders')
      .select(
        `id, order_id, orders (
          id, order_number, status, customer_name, required_date, estimated_delivery,
          order_line_items ( id, product_name, variant_description, sku, quantity )
        )`,
      )
      .eq('request_id', requestId);
    if (e) {
      if (import.meta.env.DEV) console.warn('[PR involved orders]', e.message);
      setInvolvedOrders([]);
      return;
    }
    const rows: InvolvedOrderRow[] = [];
    for (const row of data ?? []) {
      const r = row as {
        id: string;
        order_id: string;
        orders: {
          id: string;
          order_number: string;
          status: string;
          customer_name: string | null;
          required_date: string | null;
          estimated_delivery: string | null;
          order_line_items: InvolvedOrderLine[] | null;
        } | null;
      };
      const order = asOne(r.orders);
      if (!order) continue;
      const raw = order.order_line_items;
      const lineItems: InvolvedOrderLine[] = (Array.isArray(raw) ? raw : [])
        .map((li) => ({
          id: li.id,
          product_name: li.product_name,
          variant_description: li.variant_description,
          sku: li.sku,
          quantity: Number(li.quantity) || 0,
        }))
        .filter((li) => li.id);
      rows.push({
        linkId: r.id,
        orderId: r.order_id,
        orderNumber: order.order_number,
        status: order.status ?? '—',
        customerName: order.customer_name,
        lineItems,
        requiredDate: order.required_date,
        estimatedDelivery: order.estimated_delivery,
      });
    }
    setInvolvedOrders(rows);
  }, []);

  const fetchPR = useCallback(async (options?: { silent?: boolean }) => {
    if (!id) return;
    const silent = options?.silent === true;
    if (!silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const { data, error: qErr } = await supabase
        .from('production_requests')
        .select(
          'id, pr_number, branch_id, status, request_date, expected_completion_date, notes, created_by, accepted_by, accepted_at, rejected_by, rejection_reason, created_at, is_transfer_request, transfer_requesting_branch_id, inter_branch_request_id, branches:branches!branch_id(name), tr_branch:branches!transfer_requesting_branch_id(name), inter_branch:inter_branch_requests!inter_branch_request_id(id, ibr_number, status), production_request_items(id, product_id, product_variant_id, quantity, quantity_completed, product_variants(sku, size, reorder_point, products(name)))',
        )
        .eq('id', id)
        .single();
      if (qErr) throw qErr;
      if (!data) {
        setError('Request not found');
        setPr(null);
        setItems([]);
        setInvolvedOrders([]);
        return;
      }
      const raw = data as unknown as {
        id: string;
        pr_number: string;
        branch_id: string | null;
        status: PRStatus;
        request_date: string;
        expected_completion_date: string | null;
        notes: string | null;
        created_by: string | null;
        accepted_by: string | null;
        accepted_at: string | null;
        rejected_by: string | null;
        rejection_reason: string | null;
        created_at: string;
        is_transfer_request: boolean;
        transfer_requesting_branch_id: string | null;
        branches: { name: string } | { name: string }[] | null;
        tr_branch: { name: string } | null;
        inter_branch_request_id: string | null;
        inter_branch: { id: string; ibr_number: string; status: string } | null;
        production_request_items: PRItemRow[] | null;
      };
      const br = raw.branches;
      const branchOne: { name: string } | null = br == null ? null : Array.isArray(br) ? (br[0] ?? null) : br;
      setPr({
        id: raw.id,
        pr_number: raw.pr_number,
        branch_id: raw.branch_id,
        status: raw.status,
        request_date: raw.request_date,
        expected_completion_date: raw.expected_completion_date,
        notes: raw.notes,
        created_by: raw.created_by,
        accepted_by: raw.accepted_by,
        accepted_at: raw.accepted_at,
        rejected_by: raw.rejected_by,
        rejection_reason: raw.rejection_reason,
        created_at: raw.created_at,
        is_transfer_request: raw.is_transfer_request === true,
        transfer_requesting_branch_id: raw.transfer_requesting_branch_id,
        branches: branchOne,
        tr_branch: raw.tr_branch ?? null,
        inter_branch_request_id: raw.inter_branch_request_id,
        inter_branch: raw.inter_branch ?? null,
      });
      const itemRows = (raw.production_request_items ?? []) as PRItemRow[];
      setItems(itemRows);
      setExpDate(raw.expected_completion_date ? raw.expected_completion_date.slice(0, 10) : '');
      setNotes(raw.notes ?? '');
      await Promise.all([fetchLogs(id), fetchLinkedOrders(id)]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load request');
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [id, fetchLogs, fetchLinkedOrders]);

  useEffect(() => {
    void fetchPR();
  }, [fetchPR]);

  const insertLog = async (action: string, description: string, metadata?: Record<string, unknown>) => {
    if (!id) return;
    const logRole = prLogRoleMap[role] ?? 'System';
    await supabase.from('production_request_logs').insert({
      request_id: id,
      action,
      performed_by: actor,
      performed_by_role: logRole,
      description,
      metadata: metadata ?? null,
    });
  };

  const handleSubmitForApproval = async () => {
    if (!id || !pr) return;
    if (pr.status !== 'Draft') return;
    if (items.length === 0) {
      alert('Add at least one product line before submitting for approval.');
      return;
    }
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { error: u } = await supabase
        .from('production_requests')
        .update({
          status: 'Requested',
          request_date: today,
          expected_completion_date: expDate || null,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (u) throw u;
      await insertLog('submitted', 'Submitted for approval. Pending manager or executive review.');
      addAuditLog('PR submitted for approval', 'Production', pr.pr_number);
      void fetchPR({ silent: true });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to submit');
    } finally {
      setSaving(false);
    }
  };

  const handleAccept = async () => {
    if (!id || !pr) return;
    if (items.length === 0) {
      alert('Add at least one product line before approval.');
      setShowAccept(false);
      return;
    }
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const { error: u } = await supabase
        .from('production_requests')
        .update({
          status: 'Accepted',
          accepted_by: actor,
          accepted_at: now,
          rejected_by: null,
          rejection_reason: null,
          expected_completion_date: expDate || null,
          notes: notes || null,
          updated_at: now,
        })
        .eq('id', id);
      if (u) throw u;
      await insertLog('approved', `Accepted by ${actor}. Ready to schedule production.`, { status: 'Accepted', accepted_by: actor });
      addAuditLog('Accepted production request', 'Production', pr.pr_number);
      setShowAccept(false);
      void fetchPR({ silent: true });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to accept');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!id || !pr) return;
    setSaving(true);
    try {
      const { error: u } = await supabase
        .from('production_requests')
        .update({
          status: 'Rejected',
          rejected_by: actor,
          rejection_reason: rejectReason || null,
          accepted_by: null,
          accepted_at: null,
          expected_completion_date: expDate || null,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (u) throw u;
      await insertLog('rejected', `Rejected by ${actor}. ${rejectReason || ''}`.trim(), { status: 'Rejected' });
      addAuditLog('Rejected PR', 'Production', pr.pr_number);
      setShowReject(false);
      setRejectReason('');
      void fetchPR({ silent: true });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to reject');
    } finally {
      setSaving(false);
    }
  };

  const handleStartProduction = async () => {
    if (!id || !pr) return;
    if (!pr.branch_id) {
      alert('This production request has no branch. Assign a branch before starting production.');
      return;
    }
    const bomLines = items
      .map((it) => ({
        variantId: it.product_variant_id,
        units: Math.max(0, (Number(it.quantity) || 0) - (Number(it.quantity_completed) || 0)),
      }))
      .filter((l) => l.units > 0);

    setSaving(true);
    try {
      if (bomLines.length > 0) {
        await consumeBomForProductionLines(pr.branch_id, bomLines);
      }

      const { error: u } = await supabase
        .from('production_requests')
        .update({
          status: 'In Progress',
          expected_completion_date: expDate || null,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (u) throw u;
      await insertLog(
        'in_progress',
        bomLines.length > 0 ? 'Production started; raw materials consumed per BOM (remaining planned units).' : 'Production started',
      );
      addAuditLog('PR In progress', 'Production', pr.pr_number);
      void fetchPR({ silent: true });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const recordProductionLines = useMemo((): ProductionLineRow[] => {
    return items.map((row) => {
      const pv = asOne(row.product_variants);
      const prod = pv ? asOne(pv.products) : null;
      const name = prod?.name ?? '—';
      const variantLabel = pv ? [pv.sku, pv.size].filter(Boolean).join(' · ') : '—';
      return {
        id: row.id,
        productName: name,
        variantLabel,
        targetQuantity: Number(row.quantity) || 0,
        currentCompleted: Number(row.quantity_completed) || 0,
      };
    });
  }, [items]);

  const handleRecordProductionConfirm = async (data: ProductionLineResult[]) => {
    if (!id || !pr) return;
    if (data.length === 0) {
      setShowRecordProduction(false);
      return;
    }
    setSaving(true);
    try {
      for (const row of data) {
        const { error: iu } = await supabase
          .from('production_request_items')
          .update({ quantity_completed: row.producedQuantity })
          .eq('id', row.itemId);
        if (iu) throw iu;
      }

      const branchId = pr.branch_id;
      if (branchId) {
        for (const row of data) {
          const line = items.find((i) => i.id === row.itemId);
          if (!line?.product_variant_id) continue;
          const prev = Number(line.quantity_completed) || 0;
          const delta = row.producedQuantity - prev;
          if (delta <= 0) continue;
          const pv = asOne(line.product_variants);
          const reorderPoint = Number(pv?.reorder_point) || 0;
          await addFinishedVariantUnitsAtBranch(supabase, {
            variantId: line.product_variant_id,
            productId: line.product_id,
            branchId,
            units: delta,
            reorderPoint,
          });
        }
      }

      const allComplete = data.every(
        (r) => r.producedQuantity + 1e-9 >= r.targetQuantity,
      );
      const now = new Date().toISOString();
      const { error: u } = await supabase
        .from('production_requests')
        .update({
          status: allComplete ? 'Completed' : 'In Progress',
          expected_completion_date: expDate || null,
          notes: notes || null,
          updated_at: now,
        })
        .eq('id', id);
      if (u) throw u;
      if (allComplete) {
        await insertLog('completed', 'Marked complete: all target quantities produced.', {
          lines: data.map((d) => ({ id: d.itemId, produced: d.producedQuantity })),
        });
        addAuditLog('PR Completed', 'Production', pr.pr_number);
      } else {
        await insertLog(
          'updated',
          `Recorded production (partial). ${data.filter((d) => d.producedQuantity + 1e-9 < d.targetQuantity).length} line(s) still under target.`,
          { lines: data },
        );
        addAuditLog('PR production recorded', 'Production', `${pr.pr_number} (partial)`);
      }
      setShowRecordProduction(false);
      void fetchPR({ silent: true });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to save production');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    if (!pr) return;
    setIsEditing(true);
    setEditedStatus(pr.status);
  };

  const handleCancelEdit = () => {
    if (!pr) {
      setIsEditing(false);
      setEditedStatus(null);
      return;
    }
    setIsEditing(false);
    setEditedStatus(null);
    setExpDate(pr.expected_completion_date ? pr.expected_completion_date.slice(0, 10) : '');
    setNotes(pr.notes ?? '');
  };

  const handleSaveEdit = async () => {
    if (!id || !pr || editedStatus === null) return;
    setSaving(true);
    try {
      const newStatus = editedStatus;
      const oldStatus = pr.status;
      const exp = expDate || null;
      const n = notes || null;
      const base = {
        expected_completion_date: exp,
        notes: n,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === oldStatus) {
        const { error: u } = await supabase.from('production_requests').update(base).eq('id', id);
        if (u) throw u;
        const oldExp = pr.expected_completion_date?.slice(0, 10) ?? '';
        const oldNotes = pr.notes ?? '';
        if (exp !== oldExp || (n ?? '') !== oldNotes) {
          await insertLog('updated', 'Request details updated (expected date or notes).', {
            expected_completion_date: exp,
            notes: n,
          });
          addAuditLog('PR updated', 'Production', pr.pr_number);
        }
      } else {
        const wf = workflowFieldsForPrStatus(newStatus, pr, actor);
        const { error: u } = await supabase.from('production_requests').update({ ...base, ...wf }).eq('id', id);
        if (u) throw u;
        await insertLog('updated', `Status changed from "${oldStatus}" to "${newStatus}"`, {
          from: oldStatus,
          to: newStatus,
        });
        addAuditLog('PR status changed', 'Production', `${pr.pr_number}: ${oldStatus} → ${newStatus}`);
      }
      setIsEditing(false);
      setEditedStatus(null);
      void fetchPR({ silent: true });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const openAddLine = () => {
    setEditingPrLineId(null);
    setShowAddLine(true);
  };

  const handleProductLinePicked = async (p: OrderProductSelectionConfirm) => {
    if (!id || !pr) return;
    if (prProductPickLock.current) return;
    prProductPickLock.current = true;
    setSaving(true);
    try {
      const duplicateOther = items.some(
        (i) => i.product_variant_id === p.variantId && i.id !== editingPrLineId,
      );
      if (duplicateOther) {
        alert('This variant is already on the request. Remove the existing line first if you need to change it.');
        return;
      }
      const label = `${p.productName} — ${p.variantSizeLabel} (${p.sku || '—'})`;
      if (editingPrLineId) {
        const { error: u } = await supabase
          .from('production_request_items')
          .update({
            product_id: p.productId,
            product_variant_id: p.variantId,
            quantity: p.quantity,
          })
          .eq('id', editingPrLineId);
        if (u) throw u;
        await insertLog('line_updated', `Updated line: ${label} × ${p.quantity}`);
        addAuditLog('PR line updated', 'Production', `${pr.pr_number} ${p.sku} ×${p.quantity}`);
      } else {
        const { error: ins } = await supabase.from('production_request_items').insert({
          request_id: id,
          product_id: p.productId,
          product_variant_id: p.variantId,
          quantity: p.quantity,
          quantity_completed: 0,
        });
        if (ins) throw ins;
        await insertLog('line_added', `Added line: ${label} × ${p.quantity}`);
        addAuditLog('PR line added', 'Production', `${pr.pr_number} ${p.sku} ×${p.quantity}`);
      }
      setShowAddLine(false);
      setEditingPrLineId(null);
      void fetchPR({ silent: true });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to save line');
    } finally {
      prProductPickLock.current = false;
      setSaving(false);
    }
  };

  const removeLine = async (itemId: string) => {
    if (!pr || !['Requested', 'Draft'].includes(pr.status)) return;
    if (!window.confirm('Remove this line?')) return;
    setSaving(true);
    try {
      const { error: d } = await supabase.from('production_request_items').delete().eq('id', itemId);
      if (d) throw d;
      await insertLog('line_removed', 'Removed a line item');
      void fetchPR({ silent: true });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to remove');
    } finally {
      setSaving(false);
    }
  };

  const loadOrderPicker = useCallback(async () => {
    if (!pr) return;
    setOrderPickerLoading(true);
    try {
      let bid = pr.branch_id;
      if (!bid) {
        const { data: b } = await supabase.from('branches').select('id').eq('name', branchName).single();
        bid = b?.id ?? null;
      }
      if (!bid) {
        setOrderPickerList([]);
        return;
      }
      const { data } = await supabase
        .from('orders')
        .select(
          'id, order_number, customer_name, required_date, estimated_delivery, status, created_at, customers ( name, tax_id, business_registration ), order_line_items ( id, product_name, variant_description, sku, quantity )',
        )
        .eq('branch_id', bid)
        .not('status', 'eq', 'Cancelled')
        .order('created_at', { ascending: false })
        .limit(200);
      const rows: OrderPickerRow[] = (data ?? []).map((row) => {
        const o = row as {
          id: string;
          order_number: string;
          customer_name: string | null;
          required_date: string | null;
          estimated_delivery: string | null;
          status: string;
          created_at: string | null;
          customers:
            | { name: string; tax_id: string | null; business_registration: string | null }
            | { name: string; tax_id: string | null; business_registration: string | null }[]
            | null;
          order_line_items: Array<{
            id: string;
            product_name: string | null;
            variant_description: string | null;
            sku: string | null;
            quantity: number | string | null;
          }> | null;
        };
        const { customers: nestedCustomer, order_line_items: rawLines, ...rest } = o;
        const order_line_items: InvolvedOrderLine[] = (Array.isArray(rawLines) ? rawLines : [])
          .filter((li) => li?.id)
          .map((li) => ({
            id: li.id,
            product_name: li.product_name,
            variant_description: li.variant_description,
            sku: li.sku,
            quantity: Number(li.quantity) || 0,
          }));
        const cust = asOne(nestedCustomer);
        const customerRef: OrderPickerCustomerRef | null = cust
          ? {
              name: cust.name,
              tax_id: cust.tax_id,
              business_registration: cust.business_registration,
            }
          : null;
        return { ...rest, order_line_items, customerRef };
      });
      setOrderPickerList(rows);
    } finally {
      setOrderPickerLoading(false);
    }
  }, [pr, branchName]);

  useEffect(() => {
    if (showOrderPicker && pr) void loadOrderPicker();
  }, [showOrderPicker, pr, loadOrderPicker]);

  const linkInvolvedOrder = async (orderId: string) => {
    if (!id || !pr) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('production_request_orders')
        .insert({ request_id: id, order_id: orderId });
      if (error) throw error;
      const ord = orderPickerList.find((o) => o.id === orderId);
      await insertLog('order_linked', `Linked order ${ord?.order_number ?? orderId}`);
      addAuditLog('PR linked order', 'Production', `${pr.pr_number} → ${ord?.order_number ?? orderId}`);
      setShowOrderPicker(false);
      setOrderSearch('');
      void fetchPR({ silent: true });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Could not link order');
    } finally {
      setSaving(false);
    }
  };

  const unlinkInvolvedOrder = async (linkId: string, orderNumber: string) => {
    if (!pr) return;
    if (!window.confirm(`Remove ${orderNumber} from this production request?`)) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('production_request_orders').delete().eq('id', linkId);
      if (error) throw error;
      await insertLog('order_unlinked', `Unlinked order ${orderNumber}`);
      addAuditLog('PR unlinked order', 'Production', `${pr.pr_number} ${orderNumber}`);
      void fetchPR({ silent: true });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Could not remove link');
    } finally {
      setSaving(false);
    }
  };

  const openOrderPicker = () => {
    setOrderSearch('');
    setOrderPickerSort('newest');
    setShowOrderPicker(true);
  };

  const existingVariantIds = useMemo(() => {
    const s = new Set(items.map((i) => i.product_variant_id));
    if (editingPrLineId) {
      const row = items.find((i) => i.id === editingPrLineId);
      if (row?.product_variant_id) s.delete(row.product_variant_id);
    }
    return s;
  }, [items, editingPrLineId]);

  const prProductModalInitial = useMemo((): OrderProductInitialEdit | null => {
    if (!editingPrLineId) return null;
    const row = items.find((i) => i.id === editingPrLineId);
    if (!row) return null;
    return {
      productId: row.product_id,
      variantId: row.product_variant_id,
      quantity: Math.max(1, Math.floor(Number(row.quantity) || 1)),
    };
  }, [editingPrLineId, items]);
  const involvedOrderIdSet = useMemo(() => new Set(involvedOrders.map((o) => o.orderId)), [involvedOrders]);
  const filteredOrderPicker = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    const filtered = orderPickerList.filter((o) => {
      if (involvedOrderIdSet.has(o.id)) return false;
      return orderPickerRowMatchesSearch(o, q);
    });
    return sortOrderPickerList(filtered, orderPickerSort);
  }, [orderPickerList, orderSearch, involvedOrderIdSet, orderPickerSort]);

  const totalLineQty = useMemo(
    () => items.reduce((s, it) => s + (Number(it.quantity) || 0), 0),
    [items],
  );

  const prOverdue = useMemo(
    () => (pr ? isPrExpectedOverdue(pr.expected_completion_date, pr.status) : false),
    [pr],
  );

  const expForDue =
    (expDate && expDate.length > 0 ? expDate : pr?.expected_completion_date) ?? null;
  const expDateFieldShowsOverdue = pr ? isPrExpectedOverdue(expForDue, pr.status) : false;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-red-500 mx-auto" />
          <p className="mt-4 text-gray-500">Loading production request…</p>
        </div>
      </div>
    );
  }

  if (error || !pr) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center max-w-md px-4">
          <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
          <p className="text-gray-800 font-semibold mb-1">Failed to load request</p>
          <p className="text-sm text-gray-500 mb-4">{error ?? 'Not found'}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
            <Button variant="outline" onClick={() => void fetchPR()} className="gap-2 w-full sm:w-auto">
              <RefreshCw className="w-4 h-4" />
              Retry
            </Button>
            <Button variant="outline" onClick={() => navigate('/production-requests')} className="gap-2 w-full sm:w-auto">
              <ArrowLeft className="w-4 h-4" />
              Back to list
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-3 sm:p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/production-requests')}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
            aria-label="Back to production requests"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-blue-100 rounded-lg shrink-0">
              <Factory className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{pr.pr_number}</h1>
                {(pr.inter_branch_request_id || pr.is_transfer_request) && (
                  pr.inter_branch?.id ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="text-[10px] sm:text-xs h-7 px-2 border-violet-200 bg-violet-50 text-violet-800 gap-1 shrink-0"
                      onClick={() => navigate(`/inter-branch-requests/${pr.inter_branch!.id}`)}
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      Inter-branch · {pr.inter_branch.ibr_number}
                    </Button>
                  ) : (
                    <Badge
                      variant="default"
                      className="text-[10px] sm:text-xs border-violet-200 bg-violet-50 text-violet-800 gap-0.5 shrink-0"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      Transfer{pr.tr_branch?.name ? ` · ${pr.tr_branch.name}` : ''}
                    </Badge>
                  )
                )}
              </div>
              <p className="text-sm text-gray-500">— · {pr.branches?.name ?? '—'}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancelEdit} disabled={saving} className="gap-1">
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleSaveEdit()}
                disabled={saving}
                className="gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </Button>
            </>
          ) : (
            <>
              {pr.status === 'Draft' && (
                <Button
                  variant="primary"
                  className="gap-2"
                  onClick={() => void handleSubmitForApproval()}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit for approval
                </Button>
              )}
              {pr.status === 'Requested' && canApprove && (
                <>
                  <Button variant="primary" className="gap-2" onClick={() => setShowAccept(true)} disabled={saving}>
                    <CheckCircle className="w-4 h-4" />
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 border-red-300 text-red-700 hover:bg-red-50"
                    onClick={() => setShowReject(true)}
                    disabled={saving}
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </Button>
                </>
              )}
              {pr.status === 'Accepted' && canRunProduction && (
                <Button
                  variant="primary"
                  className="gap-2 bg-violet-600 hover:bg-violet-700"
                  onClick={() => void handleStartProduction()}
                  disabled={saving}
                >
                  <PlayCircle className="w-4 h-4" />
                  Start production
                </Button>
              )}
              {pr.status === 'In Progress' && canRunProduction && (
                <Button
                  variant="primary"
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => {
                    if (items.length === 0) {
                      alert('Add at least one product line before recording production.');
                      return;
                    }
                    setShowRecordProduction(true);
                  }}
                  disabled={saving}
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark complete
                </Button>
              )}
              <Button variant="outline" onClick={handleEdit} className="gap-2" disabled={saving}>
                <Edit className="w-4 h-4" />
                Edit request
              </Button>
            </>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-900">Edit mode</p>
              <p className="text-xs text-amber-800 mt-1">
                Change status, expected completion, notes, product lines, and linked orders, then save. Use workflow
                buttons (e.g. Accept) when not editing.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-start">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">Status</p>
            {isEditing && editedStatus !== null ? (
              <select
                value={editedStatus}
                onChange={(e) => setEditedStatus(e.target.value as PRStatus)}
                className="w-full max-w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm font-medium focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
              >
                {ALL_PR_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <Badge variant={getStatusVariant(pr.status)} className="inline-flex items-center gap-1 whitespace-nowrap">
                {getPRStatusIcon(pr.status)} {pr.status}
              </Badge>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">Total quantity</p>
            <p className="text-lg font-bold text-gray-900 tabular-nums">{totalLineQty.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">Request date</p>
            <p className="text-sm font-semibold text-gray-900">{fmt(pr.request_date)}</p>
          </CardContent>
        </Card>
        <Card
          className={
            prOverdue
              ? 'ring-2 ring-red-200 border-red-200 bg-red-50/40 shadow-[0_0_0_1px_rgba(254,202,202,0.6)]'
              : undefined
          }
        >
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1 flex items-center justify-between gap-2">
              <span>Expected completion</span>
              {prOverdue && (
                <Badge variant="danger" className="text-[10px] gap-0.5">
                  <AlertTriangle className="w-3 h-3" />
                  Overdue
                </Badge>
              )}
            </p>
            <p
              className={`text-sm font-semibold tabular-nums ${
                prOverdue ? 'text-red-800' : 'text-gray-900'
              }`}
            >
              {fmt(pr.expected_completion_date)}
            </p>
          </CardContent>
        </Card>
      </div>

      {prOverdue && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50/90">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-900">Target date has passed</p>
            <p className="text-xs text-red-800 mt-1">
              Expected completion was <span className="font-medium">{fmt(pr.expected_completion_date)}</span>. Update
              the date in request details or adjust status if the run is still active.
            </p>
          </div>
        </div>
      )}

      {pr.status === 'Accepted' && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-green-200 bg-green-50/90">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <ThumbsUp className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-green-900">Request accepted</p>
            {(pr.accepted_by || pr.accepted_at) && (
              <p className="text-xs text-green-800 mt-0.5">
                {pr.accepted_by && <span>By {pr.accepted_by}</span>}
                {pr.accepted_by && pr.accepted_at && <span> · </span>}
                {pr.accepted_at && <span>{fmtDT(pr.accepted_at)}</span>}
              </p>
            )}
          </div>
        </div>
      )}
      {pr.status === 'Rejected' && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50/90">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-900">Request rejected</p>
            {pr.rejected_by && <p className="text-xs text-red-800 mt-0.5">By {pr.rejected_by}</p>}
            {pr.rejection_reason && (
              <p className="text-xs text-red-800 mt-1.5">
                <span className="font-medium">Reason:</span> {pr.rejection_reason}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">Request details</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500">Request date</div>
                    <div className="text-sm font-medium text-gray-900">{fmt(pr.request_date)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500">Created by</div>
                    <div className="text-sm font-medium text-gray-900">{pr.created_by ?? '—'}</div>
                  </div>
                </div>
                {pr.accepted_by && pr.status !== 'Requested' && pr.status !== 'Draft' && (
                  <div className="flex items-center gap-2">
                    <ThumbsUp className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="text-xs text-gray-500">Accepted by</div>
                      <div className="text-sm font-medium text-gray-900">
                        {pr.accepted_by}
                        {pr.accepted_at && <span className="text-gray-500 font-normal"> · {fmtDT(pr.accepted_at)}</span>}
                      </div>
                    </div>
                  </div>
                )}
                {pr.rejected_by && (
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="text-xs text-gray-500">Rejected by</div>
                      <div className="text-sm font-medium text-gray-900">{pr.rejected_by}</div>
                    </div>
                  </div>
                )}
                {isEditing || ['Draft', 'Requested', 'Accepted', 'In Progress'].includes(pr.status) ? (
                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    <div>
                      <label className="block text-xs font-medium text-gray-600">Expected completion</label>
                      <input
                        type="date"
                        className={`mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                          expDateFieldShowsOverdue ? 'border-red-300 bg-red-50/50' : 'border-gray-300'
                        }`}
                        value={expDate}
                        onChange={(e) => setExpDate(e.target.value)}
                        disabled={
                          (!isEditing && !['Requested', 'Accepted', 'Draft'].includes(pr.status)) || saving
                        }
                      />
                      {expDateFieldShowsOverdue && (
                        <p className="text-xs text-red-700 mt-1.5 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          Target is before today — request shows as overdue until you set a new date or close the
                          request.
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 flex items-center gap-1">
                        <StickyNote className="w-3.5 h-3.5" />
                        Notes
                      </label>
                      <textarea
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[88px] focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        disabled={
                          (!isEditing && !['Requested', 'Accepted', 'In Progress', 'Draft'].includes(pr.status)) ||
                          saving
                        }
                        placeholder="Production notes, special instructions…"
                        rows={4}
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-xs text-gray-500">Expected completion</div>
                        <div className="text-sm font-medium text-gray-900">{fmt(pr.expected_completion_date)}</div>
                      </div>
                    </div>
                    {pr.notes && (
                      <div className="flex items-start gap-2">
                        <StickyNote className="w-4 h-4 text-gray-400 shrink-0 mt-3" />
                        <p className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex-1">
                          {pr.notes}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Products to produce
                  <span className="text-xs font-normal text-gray-400">
                    ({items.length} line{items.length !== 1 ? 's' : ''})
                  </span>
                </h2>
                <div className="flex items-center gap-3">
                  {items.length > 0 && (
                    <span className="text-sm font-bold text-gray-900">
                      Total Qty: <span className="tabular-nums">{totalLineQty.toLocaleString()}</span>
                    </span>
                  )}
                  {isEditing && ['Draft', 'Requested'].includes(pr.status) && (
                    <Button variant="primary" size="sm" className="gap-1" onClick={openAddLine} disabled={saving}>
                      <Plus className="w-4 h-4" />
                      Add line
                    </Button>
                  )}
                </div>
              </div>
              {items.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500 max-w-md mx-auto">
                  <p>No lines yet.</p>
                  {['Draft', 'Requested'].includes(pr.status) && !isEditing && (
                    <p className="mt-2 text-xs">Click Edit request to add product lines.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((row) => {
                    const pv = asOne(row.product_variants);
                    const prod = pv ? asOne(pv.products) : null;
                    const name = prod?.name ?? '—';
                    const canEditLine = ['Draft', 'Requested'].includes(pr.status) && !saving && isEditing;
                    return (
                      <div
                        key={row.id}
                        className={`border rounded-xl overflow-hidden ${
                          canEditLine ? 'border-gray-100 cursor-pointer hover:border-indigo-200 hover:bg-indigo-50/30' : 'border-gray-100'
                        }`}
                      >
                        <div
                          role={canEditLine ? 'button' : undefined}
                          tabIndex={canEditLine ? 0 : undefined}
                          className="flex flex-col sm:flex-row sm:items-center gap-3 p-4"
                          onClick={
                            canEditLine
                              ? () => {
                                  setEditingPrLineId(row.id);
                                  setShowAddLine(true);
                                }
                              : undefined
                          }
                          onKeyDown={
                            canEditLine
                              ? (e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setEditingPrLineId(row.id);
                                    setShowAddLine(true);
                                  }
                                }
                              : undefined
                          }
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{name}</p>
                            <p className="text-xs text-gray-500 font-mono mt-0.5">
                              {pv?.sku} · {pv?.size}
                              {canEditLine ? ' · click to edit' : ''}
                            </p>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-8 text-sm">
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Qty to produce</p>
                              <p className="font-medium text-gray-900 tabular-nums">{Number(row.quantity).toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Done</p>
                              <p className="font-medium text-gray-700 tabular-nums">
                                {Number(row.quantity_completed).toLocaleString()}
                              </p>
                            </div>
                            {isEditing && ['Draft', 'Requested'].includes(pr.status) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void removeLine(row.id);
                                }}
                                disabled={saving}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-40"
                                title="Remove line"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Orders involved
                  <span className="text-xs font-normal text-gray-400">
                    ({involvedOrders.length} order{involvedOrders.length !== 1 ? 's' : ''})
                  </span>
                </h2>
                {isEditing &&
                  pr &&
                  ['Draft', 'Requested', 'Accepted', 'In Progress'].includes(pr.status) && (
                    <Button variant="primary" size="sm" className="gap-1" onClick={openOrderPicker} disabled={saving}>
                      <Plus className="w-4 h-4" />
                      Add order
                    </Button>
                  )}
              </div>
              {involvedOrders.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">
                  Link customer orders to show status, line items, and due dates.
                  {['Draft', 'Requested', 'Accepted', 'In Progress'].includes(pr.status) && !isEditing && (
                    <span className="block mt-2 text-xs">Click Edit request to add orders.</span>
                  )}
                </p>
              ) : (
                <div className="space-y-3">
                  {involvedOrders.map((row) => (
                    <div
                      key={row.linkId}
                      className="border border-gray-100 rounded-xl overflow-hidden bg-white"
                    >
                      <div className="p-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => navigate(`/orders/${row.orderId}`)}
                              className="text-sm font-semibold text-red-600 hover:underline"
                            >
                              {row.orderNumber}
                            </button>
                            <Badge variant={orderStatusBadgeVariant(row.status)} className="text-xs">
                              {row.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 mt-1 truncate">{row.customerName ?? '—'}</p>
                        </div>
                        <div className="text-xs sm:text-right text-gray-600 space-y-0.5 shrink-0">
                          {row.requiredDate && (
                            <div>
                              <span className="text-gray-500">Required: </span>
                              {fmt(row.requiredDate)}
                            </div>
                          )}
                          {row.estimatedDelivery && (
                            <div>
                              <span className="text-gray-500">Est. delivery: </span>
                              {fmt(row.estimatedDelivery)}
                            </div>
                          )}
                          {!row.requiredDate && !row.estimatedDelivery && <span className="text-gray-400">—</span>}
                        </div>
                        {isEditing &&
                          pr &&
                          ['Draft', 'Requested', 'Accepted', 'In Progress'].includes(pr.status) && (
                            <button
                              type="button"
                              onClick={() => void unlinkInvolvedOrder(row.linkId, row.orderNumber)}
                              disabled={saving}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg self-start sm:self-center disabled:opacity-40"
                              title="Remove link"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                      </div>
                      <div className="border-t border-gray-100 bg-gray-50/90">
                        <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                          Line items
                        </p>
                        {row.lineItems.length === 0 ? (
                          <p className="px-3 pb-3 text-xs text-gray-500">No lines on this order.</p>
                        ) : (
                          <ul className="divide-y divide-gray-200/80">
                            {row.lineItems.map((li) => {
                              const title = [li.product_name, li.variant_description].filter(Boolean).join(' · ') || '—';
                              return (
                                <li key={li.id} className="px-3 py-2 flex items-start justify-between gap-3 text-sm">
                                  <div className="min-w-0">
                                    <p className="text-gray-900 font-medium leading-snug">{title}</p>
                                    {li.sku && <p className="text-xs text-gray-500 font-mono mt-0.5">{li.sku}</p>}
                                  </div>
                                  <p className="shrink-0 font-semibold tabular-nums text-gray-900">
                                    ×{li.quantity.toLocaleString()}
                                  </p>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {showOrderPicker &&
        pr &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex min-h-[100dvh] w-full items-center justify-center bg-black/50 p-4"
            role="presentation"
            onClick={() => !saving && setShowOrderPicker(false)}
          >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-5 space-y-4 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-lg">Add sales order</h3>
              <button
                type="button"
                onClick={() => !saving && setShowOrderPicker(false)}
                className="p-1 text-gray-500 hover:text-gray-800"
                aria-label="Close"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600">
              Same branch as this request. Search by order #, customer name, or customer tax / business ID;
              already-linked orders are hidden.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="search"
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Search…"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1 sm:min-w-[16rem]">
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                  <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" aria-hidden />
                  Sort
                </label>
                <select
                  className="w-full pl-2 pr-8 py-2 border border-gray-300 rounded-lg text-sm bg-white"
                  value={orderPickerSort}
                  onChange={(e) => setOrderPickerSort(e.target.value as OrderPickerSort)}
                  disabled={saving}
                >
                  <option value="newest">Newest first (created)</option>
                  <option value="oldest">Oldest first (created)</option>
                  <option value="order_asc">Order # (A → Z)</option>
                  <option value="order_desc">Order # (Z → A)</option>
                  <option value="req_asc">Required date (soonest)</option>
                  <option value="req_desc">Required date (latest)</option>
                  <option value="customer_asc">Customer (A → Z)</option>
                  <option value="customer_desc">Customer (Z → A)</option>
                  <option value="lines_desc">Most line items</option>
                  <option value="lines_asc">Fewest line items</option>
                </select>
              </div>
            </div>
            {orderPickerLoading ? (
              <div className="flex justify-center py-8 text-gray-500 gap-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            ) : filteredOrderPicker.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No orders to show. Try another search.</p>
            ) : (
              <ul className="overflow-y-auto min-h-0 max-h-[min(60vh,22rem)] space-y-2 pr-1">
                {filteredOrderPicker.map((o) => {
                  const lines = o.order_line_items ?? [];
                  return (
                    <li
                      key={o.id}
                      className="rounded-lg border border-gray-100 bg-white overflow-hidden hover:border-gray-200"
                    >
                      <div className="p-2 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-sm font-semibold text-gray-900">{o.order_number}</p>
                            <Badge variant={orderStatusBadgeVariant(o.status)} className="text-[10px]">
                              {o.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 truncate mt-0.5">{o.customer_name ?? '—'}</p>
                          {o.required_date && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              Required {fmt(o.required_date)}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => void linkInvolvedOrder(o.id)}
                          disabled={saving}
                          className="shrink-0"
                        >
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
                        </Button>
                      </div>
                      <div className="border-t border-gray-100 bg-gray-50/90">
                        <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                          Line items
                        </p>
                        {lines.length === 0 ? (
                          <p className="px-2 pb-2 text-xs text-gray-500">No lines on this order.</p>
                        ) : (
                          <ul className="divide-y divide-gray-200/80 max-h-40 overflow-y-auto">
                            {lines.map((li) => {
                              const title =
                                [li.product_name, li.variant_description].filter(Boolean).join(' · ') || '—';
                              return (
                                <li
                                  key={li.id}
                                  className="px-2 py-1.5 flex items-start justify-between gap-2 text-xs"
                                >
                                  <div className="min-w-0">
                                    <p className="text-gray-900 font-medium leading-snug">{title}</p>
                                    {li.sku && <p className="text-[10px] text-gray-500 font-mono mt-0.5">{li.sku}</p>}
                                  </div>
                                  <p className="shrink-0 font-semibold tabular-nums text-gray-900">
                                    ×{li.quantity.toLocaleString()}
                                  </p>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>,
        document.body,
        )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="w-5 h-5" />
            Production request activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {logs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No activity yet.</p>
            ) : (
              logs.map((log, index) => {
                const isLast = index === logs.length - 1;
                const t = new Date(log.created_at);
                const timeStr = t.toLocaleString('en-PH', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                });
                return (
                  <div key={log.id} className="relative pl-8 pb-3 last:pb-0">
                    {!isLast && <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-gray-200" aria-hidden />}
                    <div
                      className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center ${prLogActionColor(
                        log.action,
                      )}`}
                    >
                      {prLogActionIcon(log.action)}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-900 flex-1">{log.description || log.action}</p>
                        {log.performed_by_role && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${prLogRoleBadgeColor(
                              log.performed_by_role,
                            )}`}
                          >
                            {log.performed_by_role}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <User className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="font-medium text-gray-700">{log.performed_by ?? '—'}</span>
                        <span>· {timeStr}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {showAccept &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex min-h-[100dvh] w-full items-center justify-center bg-black/50 p-4"
            role="presentation"
            onClick={() => !saving && setShowAccept(false)}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-semibold text-lg">Accept this request?</h3>
              <p className="text-sm text-gray-600">
                The request will be marked accepted so the floor can start production when ready.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAccept(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => void handleAccept()} disabled={saving} className="gap-1">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Accept
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {showReject &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex min-h-[100dvh] w-full items-center justify-center bg-black/50 p-4"
            role="presentation"
            onClick={() => !saving && setShowReject(false)}
          >
            <div
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-semibold text-lg">Reject this request?</h3>
              <textarea
                className="w-full border rounded-lg p-2 text-sm"
                rows={3}
                placeholder="Reason (optional but recommended)…"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowReject(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => void handleReject()}
                  disabled={saving}
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                  Reject
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      <RecordProductionModal
        isOpen={showRecordProduction && pr.status === 'In Progress'}
        onClose={() => !saving && setShowRecordProduction(false)}
        prNumber={pr?.pr_number ?? '—'}
        lines={recordProductionLines}
        saving={saving}
        onConfirm={(data) => void handleRecordProductionConfirm(data)}
      />

      <OrderProductSelectionModal
        open={showAddLine}
        onClose={() => {
          if (saving) return;
          setShowAddLine(false);
          setEditingPrLineId(null);
          void fetchPR({ silent: true });
        }}
        purpose="production"
        excludeVariantIds={existingVariantIds}
        initialEdit={editingPrLineId ? prProductModalInitial : null}
        onConfirm={(p) => void handleProductLinePicked(p)}
        confirmBusy={saving}
      />
    </div>
  );
}
