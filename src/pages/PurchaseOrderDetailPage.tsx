import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import RawMaterialPickerModal from '@/src/components/products/RawMaterialPickerModal';
import ImageGalleryModal from '@/src/components/ImageGalleryModal';
import { poLogCardHeadline, PoActivityLogHumanDetails } from '@/src/components/purchaseOrders/PoActivityLogHuman';
import { useAppContext } from '@/src/store/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { supabase } from '@/src/lib/supabase';
import {
  ArrowLeft,
  ShoppingCart,
  Package,
  Plus,
  ChevronRight,
  Trash2,
  Edit,
  Save,
  Loader2,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  Send,
  Truck,
  Ban,
  FileText,
  Calendar,
  DollarSign,
  StickyNote,
  X,
  PackageCheck,
  ImageIcon,
  Upload,
  ZoomIn,
  CreditCard,
  Banknote,
  ClipboardList,
  XCircle,
  ShieldCheck,
  ThumbsUp,
  Clock,
  User,
  CheckCircle2,
} from 'lucide-react';

const IMAGES_BUCKET = 'images';
const PO_RECEIPTS_FOLDER = 'po-receipts';

// ── Types ──────────────────────────────────────────────────
type POStatus = 'Draft' | 'Requested' | 'Rejected' | 'Accepted' | 'Sent' | 'Confirmed' | 'Partially Received' | 'Completed' | 'Cancelled';
type PaymentStatus   = 'Unpaid' | 'Partially Paid' | 'Paid' | 'Overdue';
const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Check', 'Online Transfer', 'Credit Card'] as const;

interface ReceiptRow {
  id: string;
  order_id: string;
  file_url: string;
  file_name: string;
  file_size: number | null;
  note: string | null;
  uploaded_by: string | null;
  created_at: string;
}

interface POLogRow {
  id: string;
  order_id: string;
  action: string;
  performed_by: string | null;
  performed_by_role: string | null;
  description: string | null;
  old_value: unknown;
  new_value: unknown;
  metadata: unknown;
  created_at: string;
}

interface POItemRow {
  id: string;
  order_id: string;
  material_id: string | null;
  quantity_ordered: number;
  quantity_received: number;
  unit_price: number;
  unit_of_measure: string | null;
  sync_price_on_receive: boolean;
  raw_materials: {
    id: string;
    name: string;
    sku: string;
    unit_of_measure: string;
    image_url: string | null;
    brand: string | null;
  } | null;
}

interface PORow {
  id: string;
  po_number: string;
  branch_id: string | null;
  supplier_id: string | null;
  status: POStatus;
  order_date: string;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  total_amount: number;
  currency: string;
  notes: string | null;
  created_by: string | null;
  accepted_by: string | null;
  accepted_at: string | null;
  rejected_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  // Payment
  payment_status: PaymentStatus;
  amount_paid: number;
  payment_due_date: string | null;
  payment_method: string | null;
  payment_notes: string | null;
  suppliers: { name: string } | null;
  branches:  { name: string } | null;
}

const STATUS_OPTIONS: POStatus[] = [
  'Draft', 'Requested', 'Rejected', 'Accepted', 'Sent', 'Confirmed', 'Partially Received', 'Completed', 'Cancelled',
];

// ── Helpers ────────────────────────────────────────────────
const fmt = (date: string | null) =>
  date ? new Date(date).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const fmtDateTime = (iso: string | null | undefined) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
};

/** Raw material title: "Name · Brand" when brand is set. */
const materialDisplayLine = (mat: { name: string; brand?: string | null } | null | undefined): string => {
  if (!mat?.name) return '—';
  const b = mat.brand?.trim();
  return b ? `${mat.name} · ${b}` : mat.name;
};

const getStatusVariant = (status: POStatus): 'success' | 'warning' | 'danger' | 'neutral' | 'default' => {
  if (status === 'Completed')          return 'success';
  if (status === 'Partially Received') return 'warning';
  if (status === 'Cancelled' || status === 'Rejected') return 'danger';
  if (status === 'Requested')         return 'warning';
  if (status === 'Draft')             return 'neutral';
  if (status === 'Accepted')           return 'default';
  if (status === 'Confirmed')          return 'default';
  if (status === 'Sent')               return 'default';
  return 'neutral';
};

const getStatusIcon = (status: POStatus) => {
  if (status === 'Completed')          return <CheckCircle className="w-4 h-4" />;
  if (status === 'Sent')               return <Send className="w-4 h-4" />;
  if (status === 'Confirmed')          return <Truck className="w-4 h-4" />;
  if (status === 'Partially Received') return <Package className="w-4 h-4" />;
  if (status === 'Cancelled')          return <Ban className="w-4 h-4" />;
  if (status === 'Draft')              return <FileText className="w-4 h-4" />;
  if (status === 'Requested')          return <ClipboardList className="w-4 h-4" />;
  if (status === 'Rejected')           return <XCircle className="w-4 h-4" />;
  if (status === 'Accepted')            return <ThumbsUp className="w-4 h-4" />;
  return <FileText className="w-4 h-4" />;
};

const logRoleMap: Record<string, string> = {
  Executive:  'Admin',
  Agent:      'Agent',
  Warehouse:  'Warehouse Staff',
  Logistics:  'Logistics',
  Driver:     'Logistics',
};

// ── Page ───────────────────────────────────────────────────
export function PurchaseOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { branch, role, session, employeeName } = useAppContext();

  const [po, setPO]               = useState<PORow | null>(null);
  const [items, setItems]         = useState<POItemRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const [isEditing, setIsEditing]       = useState(false);
  const [saving, setSaving]             = useState(false);
  const [editForm, setEditForm]         = useState<Partial<PORow>>({});
  // Supplier list for the dropdown
  const [supplierList, setSupplierList] = useState<{ id: string; name: string; payment_terms: string | null; preferred_supplier: boolean }[]>([]);
  const [eligibleSupplierIds, setEligibleSupplierIds]   = useState<Set<string> | null>(null);
  const [eligibleSuppliersLoading, setEligibleSuppliersLoading] = useState(false);
  // Staged items — all changes live here during editing; committed on Save
  const [stagedItems, setStagedItems]   = useState<POItemRow[]>([]);
  const [originalItems, setOriginalItems] = useState<POItemRow[]>([]);

  const [showPicker, setShowPicker]                   = useState(false);
  const poMaterialSelectLock = useRef(false);
  const [editingItemId, setEditingItemId]             = useState<string | null>(null);
  const [editItemQtyOrdered, setEditItemQtyOrdered]   = useState('');
  const [editItemQtyReceived, setEditItemQtyReceived] = useState('');
  const [editItemPrice, setEditItemPrice]             = useState('');
  const [editItemUOM, setEditItemUOM]                 = useState('');
  // IDs of items whose material price should be updated when quantity_received > 0
  const [priceUpdateItems, setPriceUpdateItems]       = useState<Set<string>>(new Set());

  // ── Receipts (proofs of receiving) ───────────────────────
  const [receipts, setReceipts]               = useState<ReceiptRow[]>([]);
  const [poLogs, setPoLogs]                    = useState<POLogRow[]>([]);
  const [lightboxUrl, setLightboxUrl]         = useState<string | null>(null);
  // Gallery modal for edit mode (add more images directly to PO)
  const [showReceiptGallery, setShowReceiptGallery] = useState(false);

  // ── Payment modal ────────────────────────────────────────
  const [showPayment, setShowPayment]         = useState(false);
  const [paymentSaving, setPaymentSaving]     = useState(false);
  const [paymentAmount, setPaymentAmount]     = useState('');
  const [paymentMethod, setPaymentMethod]     = useState('Bank Transfer');
  const [paymentDate, setPaymentDate]         = useState('');
  const [paymentNoteInput, setPaymentNoteInput] = useState('');

  // ── Receive mode ─────────────────────────────────────────
  const [isReceiving, setIsReceiving]                 = useState(false);
  const [receiveSaving, setReceiveSaving]             = useState(false);
  const [receiveQtys, setReceiveQtys]                 = useState<Record<string, string>>({});
  const [receivePriceUpdate, setReceivePriceUpdate]   = useState<Set<string>>(new Set());
  // URLs selected from gallery in receive modal (already uploaded/optimized; inserted on confirm)
  const [stagedReceiptUrls, setStagedReceiptUrls]     = useState<{ url: string; name: string }[]>([]);
  const [showReceiveGallery, setShowReceiveGallery]   = useState(false);
  const [workflowSaving, setWorkflowSaving]            = useState(false);
  const [showAcceptModal, setShowAcceptModal]          = useState(false);
  const [showRejectModal, setShowRejectModal]          = useState(false);
  const [showSubmitModal, setShowSubmitModal]          = useState(false);
  const [rejectionReason, setRejectionReason]         = useState('');
  const [approvalLoading, setApprovalLoading]          = useState(false);

  // ── Fetch activity logs (also called after logging an event) ──
  const fetchPoLogs = useCallback(async (orderId: string) => {
    const { data, error } = await supabase
      .from('purchase_order_logs')
      .select('id, order_id, action, performed_by, performed_by_role, description, old_value, new_value, metadata, created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });
    if (error) {
      if (import.meta.env.DEV) console.warn('[PO logs]', error.message);
      setPoLogs([]);
      return;
    }
    setPoLogs((data ?? []) as unknown as POLogRow[]);
  }, []);

  useEffect(() => {
    if (!showPicker) poMaterialSelectLock.current = false;
  }, [showPicker]);

  // ── Fetch ────────────────────────────────────────────────
  const fetchPO = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [poRes, itemsRes, logsRes] = await Promise.all([
        supabase
          .from('purchase_orders')
          .select('*, suppliers(name), branches:branches!branch_id(name)')
          .eq('id', id)
          .single(),
        supabase
          .from('purchase_order_items')
          .select('*, sync_price_on_receive, raw_materials(id, name, sku, unit_of_measure, image_url, brand)')
          .eq('order_id', id)
          .order('created_at'),
        supabase
          .from('purchase_order_logs')
          .select('id, order_id, action, performed_by, performed_by_role, description, old_value, new_value, metadata, created_at')
          .eq('order_id', id)
          .order('created_at', { ascending: false }),
      ]);
      if (poRes.error) throw poRes.error;
      setPO(poRes.data as unknown as PORow);
      setItems((itemsRes.data ?? []) as unknown as POItemRow[]);
      if (!logsRes.error) {
        setPoLogs((logsRes.data ?? []) as unknown as POLogRow[]);
      } else {
        if (import.meta.env.DEV) console.warn('[PO logs]', logsRes.error.message);
        setPoLogs([]);
      }
    } catch (e: any) {
      setError(e.message ?? 'Failed to load purchase order');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchReceipts = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase
      .from('purchase_order_receipts')
      .select('*')
      .eq('order_id', id)
      .order('created_at');
    setReceipts((data ?? []) as ReceiptRow[]);
  }, [id]);

  const insertPoLog = useCallback(
    async (
      action: string,
      description: string,
      oldValue?: object | null,
      newValue?: object | null,
      metadata?: object | null,
    ) => {
      if (!id) return;
      const actorName = employeeName || session?.user?.email || 'User';
      const { error } = await supabase.from('purchase_order_logs').insert({
        order_id: id,
        action,
        performed_by:        actorName,
        performed_by_role:   logRoleMap[role] ?? 'System',
        description,
        old_value:  oldValue  ?? null,
        new_value:  newValue  ?? null,
        metadata:   metadata  ?? null,
      });
      if (error) {
        if (import.meta.env.DEV) console.warn('[insertPoLog]', error.message);
        return;
      }
      await fetchPoLogs(id);
    },
    [id, role, session, employeeName, fetchPoLogs],
  );

  useEffect(() => { fetchPO(); fetchReceipts(); }, [fetchPO, fetchReceipts]);

  // Fetch all suppliers for the dropdown — preferred first, then alphabetical
  useEffect(() => {
    supabase
      .from('suppliers')
      .select('id, name, payment_terms, preferred_supplier')
      .eq('status', 'Active')
      .order('preferred_supplier', { ascending: false })
      .order('name')
      .then(({ data }) => setSupplierList(data ?? []));
  }, []);

  // Suppliers that list every material on this PO (e.g. BOM from product) — required materials ⊆ supplier’s catalogue
  const materialIdsOnPO = useMemo(() => {
    const rows = isEditing ? stagedItems : items;
    const u = new Set<string>();
    for (const it of rows) {
      if (it.material_id) u.add(it.material_id);
    }
    return Array.from(u);
  }, [isEditing, stagedItems, items]);
  const materialIdsKey = useMemo(() => [...materialIdsOnPO].sort().join(','), [materialIdsOnPO]);

  useEffect(() => {
    if (materialIdsOnPO.length === 0) {
      setEligibleSupplierIds(null);
      setEligibleSuppliersLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setEligibleSuppliersLoading(true);
      const { data, error } = await supabase
        .from('supplier_materials')
        .select('supplier_id, material_id')
        .in('material_id', materialIdsOnPO);
      if (cancelled) return;
      if (error) {
        if (import.meta.env.DEV) console.warn('[PO eligible suppliers]', error.message);
        setEligibleSupplierIds(null);
        setEligibleSuppliersLoading(false);
        return;
      }
      const need = new Set(materialIdsOnPO);
      const bySup = new Map<string, Set<string>>();
      for (const row of data ?? []) {
        const sid = (row as { supplier_id: string; material_id: string }).supplier_id;
        const mid = (row as { supplier_id: string; material_id: string }).material_id;
        if (!bySup.has(sid)) bySup.set(sid, new Set());
        bySup.get(sid)!.add(mid);
      }
      const ok = new Set<string>();
      for (const [sid, mids] of bySup) {
        if ([...need].every(m => mids.has(m))) ok.add(sid);
      }
      setEligibleSupplierIds(ok);
      setEligibleSuppliersLoading(false);
    })();
    return () => { cancelled = true; };
  }, [materialIdsKey]);

  const selectedSupplierIdForFilter = (editForm.supplier_id ?? po?.supplier_id) ?? null;
  const suppliersForSelect = useMemo(() => {
    if (eligibleSupplierIds === null) return supplierList;
    return supplierList.filter(
      s => eligibleSupplierIds.has(s.id) || s.id === selectedSupplierIdForFilter,
    );
  }, [supplierList, eligibleSupplierIds, selectedSupplierIdForFilter]);

  // ── Helpers for receipt file staging ─────────────────────
  // ── Handlers ─────────────────────────────────────────────
  const handleStartEdit = () => {
    if (!po) return;
    setEditForm({ ...po });
    setStagedItems([...items]);
    setOriginalItems([...items]);
    // Restore saved toggle states from DB
    setPriceUpdateItems(new Set(items.filter(i => i.sync_price_on_receive).map(i => i.id)));
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditForm({});
    setStagedItems([]);
    setOriginalItems([]);
    setEditingItemId(null);
    setPriceUpdateItems(new Set());
  };

  const handleSave = async () => {
    if (!po) return;
    setSaving(true);
    try {
      // 1. Save PO header
      const { error: poErr } = await supabase.from('purchase_orders').update({
        supplier_id:            editForm.supplier_id ?? po.supplier_id,
        status:                 editForm.status,
        expected_delivery_date: editForm.expected_delivery_date || null,
        actual_delivery_date:   editForm.actual_delivery_date   || null,
        notes:                  editForm.notes,
        payment_due_date:       (editForm.payment_due_date ?? '') || null,
        payment_method:         (editForm.payment_method  ?? '') || null,
        payment_notes:          (editForm.payment_notes   ?? '') || null,
      }).eq('id', po.id);
      if (poErr) throw poErr;

      // 2. Commit item diffs
      const isTemp = (id: string) => id.startsWith('temp_');

      // Deleted items: were in original, not in staged
      for (const orig of originalItems) {
        if (!stagedItems.some(s => s.id === orig.id)) {
          const { error } = await supabase.from('purchase_order_items').delete().eq('id', orig.id);
          if (error) throw error;
        }
      }

      // New items: temp IDs → insert
      for (const item of stagedItems.filter(s => isTemp(s.id))) {
        const { error } = await supabase.from('purchase_order_items').insert({
          order_id:             po.id,
          material_id:          item.material_id,
          quantity_ordered:     item.quantity_ordered,
          quantity_received:    item.quantity_received,
          unit_price:           item.unit_price,
          unit_of_measure:      item.unit_of_measure,
          sync_price_on_receive: priceUpdateItems.has(item.id),
        });
        if (error) throw error;
      }

      // Modified items: real IDs whose values changed
      for (const item of stagedItems.filter(s => !isTemp(s.id))) {
        const orig = originalItems.find(o => o.id === item.id);
        if (!orig) continue;
        const syncFlag = priceUpdateItems.has(item.id);
        if (
          orig.quantity_ordered  !== item.quantity_ordered  ||
          orig.quantity_received !== item.quantity_received ||
          orig.unit_price        !== item.unit_price        ||
          orig.unit_of_measure   !== item.unit_of_measure   ||
          (orig as any).sync_price_on_receive !== syncFlag
        ) {
          const { error } = await supabase.from('purchase_order_items').update({
            quantity_ordered:     item.quantity_ordered,
            quantity_received:    item.quantity_received,
            unit_price:           item.unit_price,
            unit_of_measure:      item.unit_of_measure,
            sync_price_on_receive: syncFlag,
          }).eq('id', item.id);
          if (error) throw error;
        }
      }

      // 3. Update raw_material prices for items that were received with the box ticked
      for (const item of stagedItems) {
        if (priceUpdateItems.has(item.id) && item.quantity_received > 0 && item.material_id) {
          const { error } = await supabase.from('raw_materials').update({
            cost_per_unit:       item.unit_price,
            last_purchase_price: item.unit_price,
          }).eq('id', item.material_id);
          if (error) throw error;
        }
      }

      await insertPoLog(
        'updated',
        'Saved changes to the purchase order (details, line items, or prices).',
        { status: po.status, total_amount: po.total_amount },
        {
          status:     editForm.status                  ?? po.status,
          total_amount: po.total_amount, // may be recalculated client-side; header total comes from line items in DB
        },
        { line_item_count: stagedItems.length, po_number: po.po_number },
      );
      await fetchPO();
      setIsEditing(false);
      setEditForm({});
      setStagedItems([]);
      setOriginalItems([]);
      setEditingItemId(null);
      setPriceUpdateItems(new Set());
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Item handlers (local-only until Save) ────────────────
  const handlePickerSelect = ({
    materialId,
    name,
    sku,
    unit,
    cost,
    imageUrl,
    brand,
  }: {
    materialId: string;
    name: string;
    sku: string;
    unit: string;
    cost: number;
    imageUrl: string | null;
    brand?: string | null;
  }) => {
    if (poMaterialSelectLock.current) return;
    poMaterialSelectLock.current = true;
    const tempId = `temp_${Date.now()}`;
    const newItem: POItemRow = {
      id: tempId, order_id: po?.id ?? '', material_id: materialId,
      quantity_ordered: 0, quantity_received: 0, unit_price: cost, unit_of_measure: unit,
      sync_price_on_receive: false,
      raw_materials: { id: materialId, name, sku, unit_of_measure: unit, image_url: imageUrl, brand: brand ?? null },
    };
    setStagedItems(prev => [...prev, newItem]);
    setEditingItemId(tempId);
    setEditItemQtyOrdered('');
    setEditItemQtyReceived('');
    setEditItemPrice(String(cost));
    setEditItemUOM(unit);
  };

  const handleOpenItemEdit = (item: POItemRow) => {
    setEditingItemId(item.id);
    setEditItemQtyOrdered(String(item.quantity_ordered));
    setEditItemQtyReceived(String(item.quantity_received));
    setEditItemPrice(String(item.unit_price));
    setEditItemUOM(item.unit_of_measure ?? '');
  };

  // Flush inline form into stagedItems (no DB call)
  const handleSaveItemEdit = () => {
    if (!editingItemId) return;
    const qtyOrdered  = parseFloat(editItemQtyOrdered)  || 0;
    const qtyReceived = parseFloat(editItemQtyReceived) || 0;
    const price       = parseFloat(editItemPrice)       || 0;
    setStagedItems(prev => prev.map(i => i.id === editingItemId
      ? { ...i, quantity_ordered: qtyOrdered, quantity_received: qtyReceived, unit_price: price, unit_of_measure: editItemUOM }
      : i
    ));
    setEditingItemId(null);
  };

  const handleRemoveItem = (itemId: string) => {
    setStagedItems(prev => prev.filter(i => i.id !== itemId));
    if (editingItemId === itemId) setEditingItemId(null);
  };

  // ── Receive handlers ─────────────────────────────────────
  const handleStartReceive = () => {
    // Pre-fill each item with its remaining qty (ordered − already received)
    const initial: Record<string, string> = {};
    items.forEach(item => {
      const remaining = Math.max(0, item.quantity_ordered - item.quantity_received);
      initial[item.id] = remaining > 0 ? String(remaining) : '';
    });
    setReceiveQtys(initial);
    setReceivePriceUpdate(new Set(items.filter(i => i.sync_price_on_receive).map(i => i.id)));
    setIsReceiving(true);
  };

  const handleCancelReceive = () => {
    setIsReceiving(false);
    setReceiveQtys({});
    setReceivePriceUpdate(new Set());
    setStagedReceiptUrls([]);
  };

  const handleSaveReceive = async () => {
    if (!po) return;
    setReceiveSaving(true);
    try {
      // 1. Update quantity_received for each item
      for (const item of items) {
        const addQty = parseFloat(receiveQtys[item.id] ?? '0') || 0;
        if (addQty <= 0) continue;
        const newReceived = item.quantity_received + addQty;
        const { error } = await supabase
          .from('purchase_order_items')
          .update({ quantity_received: newReceived })
          .eq('id', item.id);
        if (error) throw error;

        // Update catalog price if toggle is on
        if (receivePriceUpdate.has(item.id) && item.material_id) {
          const { error: priceErr } = await supabase
            .from('raw_materials')
            .update({
              cost_per_unit:        item.unit_price,
              last_purchase_price:  item.unit_price,
              price_synced_at:      new Date().toISOString(),
              price_synced_from_po: po.id,
            })
            .eq('id', item.material_id);
          if (priceErr) throw priceErr;
        }
      }

      // 2. Auto-update PO status
      const updatedItems = items.map(item => {
        const addQty = parseFloat(receiveQtys[item.id] ?? '0') || 0;
        return { ...item, quantity_received: item.quantity_received + addQty };
      });
      const allFulfilled = updatedItems.every(i => i.quantity_received >= i.quantity_ordered);
      const anyReceived  = updatedItems.some(i => i.quantity_received > 0);
      const newStatus = allFulfilled ? 'Completed' : anyReceived ? 'Partially Received' : po.status;

      if (newStatus !== po.status) {
        const { error: statusErr } = await supabase
          .from('purchase_orders')
          .update({
            status: newStatus,
            actual_delivery_date: allFulfilled ? new Date().toISOString().split('T')[0] : po.actual_delivery_date,
          })
          .eq('id', po.id);
        if (statusErr) throw statusErr;
      }

      // 3. Insert DB records for receipt images selected via gallery (already uploaded/optimized)
      for (const { url, name } of stagedReceiptUrls) {
        const { error: insertErr } = await supabase
          .from('purchase_order_receipts')
          .insert({ order_id: po.id, file_url: url, file_name: name });
        if (insertErr) throw insertErr;
      }

      const totalReceived = items.reduce(
        (s, it) => s + (parseFloat(receiveQtys[it.id] ?? '0') || 0),
        0,
      );
      const receipt_lines = items
        .map((it) => {
          const addQty = parseFloat(receiveQtys[it.id] ?? '0') || 0;
          if (addQty <= 0) return null;
          return {
            label: materialDisplayLine(it.raw_materials),
            quantity: addQty,
            unit: (it.unit_of_measure && String(it.unit_of_measure).trim()) || 'units',
          };
        })
        .filter((x): x is { label: string; quantity: number; unit: string } => x != null);
      await insertPoLog(
        'receipt_posted',
        'Recorded delivery receipt (partial or full) and updated quantities received.',
        { status: po.status },
        { status: allFulfilled ? 'Completed' : anyReceived ? 'Partially Received' : po.status, po_number: po.po_number },
        {
          quantity_received_on_event: totalReceived,
          receipt_image_count: stagedReceiptUrls.length,
          receipt_lines,
        },
      );

      await fetchPO();
      await fetchReceipts();
      setIsReceiving(false);
      setReceiveQtys({});
      setReceivePriceUpdate(new Set());
      setStagedReceiptUrls([]);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setReceiveSaving(false);
    }
  };

  // ── Receipt image management (edit mode) ─────────────────
  const handleAddReceiptImages = () => setShowReceiptGallery(true);

  const handleReceiptGallerySelect = async (urls: string[]) => {
    if (!po || !urls.length) return;
    try {
      for (const url of urls) {
        const name = url.split('/').pop() ?? 'receipt';
        const { error } = await supabase
          .from('purchase_order_receipts')
          .insert({ order_id: po.id, file_url: url, file_name: name });
        if (error) throw error;
      }
      await insertPoLog(
        'proof_uploaded',
        `Added ${urls.length} proof of receiving image${urls.length === 1 ? '' : 's'}.`,
        null,
        null,
        { count: urls.length, po_number: po.po_number },
      );
      await fetchReceipts();
    } catch (err: any) {
      alert(err.message);
    }
    setShowReceiptGallery(false);
  };

  const handleDeleteReceipt = async (receipt: ReceiptRow) => {
    if (!confirm(`Remove "${receipt.file_name}"?`)) return;
    // Extract storage path from public URL (everything after /images/)
    const match = receipt.file_url.match(/\/images\/(.+)$/);
    if (match) {
      await supabase.storage.from(IMAGES_BUCKET).remove([match[1]]);
    }
    await supabase.from('purchase_order_receipts').delete().eq('id', receipt.id);
    if (id) {
      await insertPoLog('proof_removed', `Removed proof of receiving image: ${receipt.file_name}.`, { file_name: receipt.file_name }, null, { po_number: po?.po_number });
    }
    setReceipts(prev => prev.filter(r => r.id !== receipt.id));
  };

  // ── Payment helpers ──────────────────────────────────────
  const getPaymentVariant = (s: PaymentStatus): 'success' | 'warning' | 'danger' | 'neutral' => {
    if (s === 'Paid')           return 'success';
    if (s === 'Partially Paid') return 'warning';
    if (s === 'Overdue')        return 'danger';
    return 'neutral';
  };

  const derivePaymentStatus = (paid: number, total: number, dueDate: string | null): PaymentStatus => {
    if (paid >= total && total > 0)  return 'Paid';
    if (paid > 0)                    return 'Partially Paid';
    if (dueDate && new Date(dueDate) < new Date()) return 'Overdue';
    return 'Unpaid';
  };

  const handleOpenPayment = () => {
    if (!po) return;
    const remaining = Math.max(0, po.total_amount - (po.amount_paid ?? 0));
    setPaymentAmount(remaining > 0 ? String(remaining) : '');
    setPaymentMethod(po.payment_method ?? 'Bank Transfer');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentNoteInput('');
    setShowPayment(true);
  };

  const handleRecordPayment = async () => {
    if (!po) return;
    setPaymentSaving(true);
    try {
      const adding     = parseFloat(paymentAmount) || 0;
      const newPaid    = Math.min(po.total_amount, (po.amount_paid ?? 0) + adding);
      const newStatus  = derivePaymentStatus(newPaid, po.total_amount, po.payment_due_date);
      const { error } = await supabase.from('purchase_orders').update({
        amount_paid:    newPaid,
        payment_status: newStatus,
        payment_method: paymentMethod,
        payment_notes:  paymentNoteInput || po.payment_notes,
      }).eq('id', po.id);
      if (error) throw error;
      await insertPoLog(
        'payment_recorded',
        `Recorded company payment: ₱${adding.toLocaleString()}. New payment status: ${newStatus}.`,
        { amount_paid: po.amount_paid, payment_status: po.payment_status },
        { amount_paid: newPaid, payment_status: newStatus, payment_method: paymentMethod },
        { po_number: po.po_number, notes: paymentNoteInput || null },
      );
      await fetchPO();
      setShowPayment(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setPaymentSaving(false);
    }
  };

  const isOverdue =
    po?.expected_delivery_date &&
    !po.actual_delivery_date &&
    new Date(po.expected_delivery_date) < new Date() &&
    !['Completed', 'Cancelled', 'Requested', 'Rejected', 'Accepted', 'Draft'].includes(po.status ?? '');

  // Receive / pay only when the order is in a fulfillment-capable state (not while awaiting approval or confirm)
  const canReceiveOrRecordPayment = po && !['Completed', 'Cancelled', 'Draft', 'Requested', 'Rejected', 'Accepted'].includes(po.status);

  // Payment summary card only after Confirm Order (Confirmed) or receiving / done
  const showPaymentSummary =
    po && ['Confirmed', 'Partially Received', 'Completed'].includes(po.status);

  const handleSubmitForApproval = async () => {
    if (!po || po.status !== 'Draft') return;
    if (items.length === 0) {
      alert('Add at least one line item before submitting for approval.');
      setShowSubmitModal(false);
      return;
    }
    setApprovalLoading(true);
    const actor = employeeName || session?.user?.email || role;
    const now = new Date().toISOString();
    try {
      const { error } = await supabase
        .from('purchase_orders')
        .update({
          status: 'Requested',
          updated_at: now,
        })
        .eq('id', po.id);
      if (error) throw error;
      await insertPoLog(
        'submitted',
        `Submitted for approval by ${actor}. Pending manager or executive review.`,
        { status: 'Draft' },
        { status: 'Requested' },
      );
      await fetchPO();
      setShowSubmitModal(false);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to submit for approval');
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!po) return;
    setApprovalLoading(true);
    const actor = employeeName || session?.user?.email || role;
    const now   = new Date().toISOString();
    try {
      const { error } = await supabase.from('purchase_orders').update({
        status: 'Accepted',
        accepted_by: actor,
        accepted_at: now,
        rejected_by: null,
        rejection_reason: null,
      }).eq('id', po.id);
      if (error) throw error;
      await insertPoLog(
        'approved',
        `Request accepted by ${actor}. Awaiting confirmation with the supplier (use Confirm Order).`,
        { status: po.status },
        { status: 'Accepted', accepted_by: actor, accepted_at: now },
      );
      await fetchPO();
      setShowAcceptModal(false);
    } catch (e: any) {
      alert(e.message ?? 'Failed to accept');
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    if (!po) return;
    setApprovalLoading(true);
    const actor = employeeName || session?.user?.email || role;
    const reason = rejectionReason.trim();
    try {
      const { error } = await supabase.from('purchase_orders').update({
        status: 'Rejected',
        rejected_by: actor,
        rejection_reason: reason || null,
        accepted_by: null,
        accepted_at: null,
      }).eq('id', po.id);
      if (error) throw error;
      const desc = reason
        ? `Purchase order request rejected by ${actor}. Reason: ${reason}`
        : `Purchase order request rejected by ${actor}.`;
      await insertPoLog(
        'rejected',
        desc,
        { status: po.status },
        { status: 'Rejected', rejected_by: actor, rejection_reason: reason || null },
        reason ? { reason } : null,
      );
      await fetchPO();
      setShowRejectModal(false);
      setRejectionReason('');
    } catch (e: any) {
      alert(e.message ?? 'Failed to reject');
    } finally {
      setApprovalLoading(false);
    }
  };

  /** Executive confirms the supplier order is placed / incoming — then warehouse can receive. */
  const handleConfirmOrder = async () => {
    if (!po) return;
    setWorkflowSaving(true);
    try {
      const { error } = await supabase.from('purchase_orders').update({ status: 'Confirmed' }).eq('id', po.id);
      if (error) throw error;
      await insertPoLog(
        'order_confirmed',
        'Order confirmed with supplier (incoming). Receiving and payment can proceed.',
        { status: 'Accepted' },
        { status: 'Confirmed' },
      );
      await fetchPO();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setWorkflowSaving(false);
    }
  };

  // View mode uses real items; edit mode uses the working copy
  const displayItems = isEditing ? stagedItems : items;
  const totalItemValue = displayItems.reduce((s, i) => s + i.unit_price * i.quantity_ordered, 0);

  // ── Loading / Error ───────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-red-500 mx-auto" />
          <p className="mt-4 text-gray-500">Loading purchase order…</p>
        </div>
      </div>
    );
  }

  if (error || !po) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-3" />
          <p className="text-gray-800 font-semibold mb-1">Failed to load purchase order</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <Button variant="outline" onClick={fetchPO} className="gap-2">
            <RefreshCw className="w-4 h-4" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="space-y-6 p-3 sm:p-4 md:p-6">

      {/* ── Back + Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/purchase-orders')}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{po.po_number}</h1>
              <p className="text-sm text-gray-500">{po.suppliers?.name ?? '—'} · {po.branches?.name ?? '—'}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={saving}
                className="gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={handleCancelEdit}>Cancel</Button>
            </>
          ) : (
            <>
              {po.status === 'Draft' && (
                <Button
                  variant="primary"
                  onClick={() => setShowSubmitModal(true)}
                  disabled={workflowSaving}
                  className="gap-2"
                >
                  <Send className="w-4 h-4" />
                  Submit for approval
                </Button>
              )}
              {po.status === 'Requested' && (
                <>
                  <Button
                    variant="primary"
                    onClick={() => setShowAcceptModal(true)}
                    disabled={workflowSaving}
                    className="gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Accept
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectModal(true)}
                    disabled={workflowSaving}
                    className="gap-2 border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </Button>
                </>
              )}
              {po.status === 'Accepted' && (
                <Button
                  variant="primary"
                  onClick={handleConfirmOrder}
                  disabled={workflowSaving}
                  className="gap-2 bg-violet-600 hover:bg-violet-700"
                >
                  {workflowSaving
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <ShieldCheck className="w-4 h-4" />}
                  Confirm Order
                </Button>
              )}
              {canReceiveOrRecordPayment && (
                <Button
                  variant="outline"
                  onClick={handleStartReceive}
                  className="gap-2 border-green-300 text-green-700 hover:bg-green-50"
                >
                  <PackageCheck className="w-4 h-4" /> Receive
                </Button>
              )}
              {canReceiveOrRecordPayment && showPaymentSummary && (po.payment_status ?? 'Unpaid') !== 'Paid' && (
                <Button
                  variant="outline"
                  onClick={handleOpenPayment}
                  className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <CreditCard className="w-4 h-4" /> Record Payment
                </Button>
              )}
              <Button variant="outline" onClick={handleStartEdit} className="gap-2">
                <Edit className="w-4 h-4" /> Edit
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-start">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">Status</p>
            <Badge variant={getStatusVariant(po.status)} className="inline-flex items-center gap-1 whitespace-nowrap">
              {getStatusIcon(po.status)} {po.status}
            </Badge>
            {isOverdue && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Overdue</p>}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">Total Amount</p>
            <p className="text-lg font-bold text-gray-900">
              {po.currency === 'USD' ? '$' : '₱'}{po.total_amount.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">Order Date</p>
            <p className="text-sm font-semibold text-gray-900">{fmt(po.order_date)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500 mb-1">
              {po.actual_delivery_date ? 'Delivered On' : 'Expected Delivery'}
            </p>
            <p className={`text-sm font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
              {fmt(po.actual_delivery_date ?? po.expected_delivery_date)}
            </p>
          </CardContent>
        </Card>

        {showPaymentSummary && (
          <Card className="col-span-2 sm:col-span-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Payment</p>
                    <Badge variant={getPaymentVariant(po.payment_status ?? 'Unpaid')}>
                      {po.payment_status ?? 'Unpaid'}
                    </Badge>
                  </div>
                  <div className="h-8 w-px bg-gray-200 hidden sm:block" />
                  <div className="hidden sm:block">
                    <p className="text-xs text-gray-500">Paid</p>
                    <p className="text-sm font-bold text-gray-900">
                      {po.currency === 'USD' ? '$' : '₱'}{(po.amount_paid ?? 0).toLocaleString()}
                      <span className="text-xs font-normal text-gray-400"> / {po.currency === 'USD' ? '$' : '₱'}{po.total_amount.toLocaleString()}</span>
                    </p>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs text-gray-500">Remaining</p>
                    <p className="text-sm font-bold text-blue-700">
                      {po.currency === 'USD' ? '$' : '₱'}{Math.max(0, po.total_amount - (po.amount_paid ?? 0)).toLocaleString()}
                    </p>
                  </div>
                  {po.payment_due_date && (
                    <div className="hidden sm:block">
                      <p className="text-xs text-gray-500">Due Date</p>
                      <p className={`text-sm font-semibold ${(po.payment_status ?? 'Unpaid') === 'Overdue' ? 'text-red-600' : 'text-gray-900'}`}>
                        {fmt(po.payment_due_date)}
                      </p>
                    </div>
                  )}
                  {po.payment_method && (
                    <div className="hidden md:block">
                      <p className="text-xs text-gray-500">Method</p>
                      <p className="text-sm font-semibold text-gray-700">{po.payment_method}</p>
                    </div>
                  )}
                </div>
                <div className="w-full sm:w-40">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{Math.round(((po.amount_paid ?? 0) / (po.total_amount || 1)) * 100)}% paid</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-2 rounded-full bg-blue-500 transition-all"
                      style={{ width: `${Math.min(100, ((po.amount_paid ?? 0) / (po.total_amount || 1)) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Request accepted / rejected (after approval or rejection) ── */}
      {po.status === 'Accepted' && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-green-200 bg-green-50/90">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
            <ThumbsUp className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <p className="text-sm font-semibold text-green-900">Request accepted</p>
            {(po.accepted_by || po.accepted_at) && (
              <p className="text-xs text-green-800 mt-0.5">
                {po.accepted_by && <span>By {po.accepted_by}</span>}
                {po.accepted_by && po.accepted_at && <span> · </span>}
                {po.accepted_at && <span>{fmtDateTime(po.accepted_at)}</span>}
              </p>
            )}
            <p className="text-xs text-green-700/90 mt-1">Use Confirm order when the supplier is finalized.</p>
          </div>
        </div>
      )}
      {po.status === 'Rejected' && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-red-200 bg-red-50/90">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <XCircle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-red-900">Request rejected</p>
            {po.rejected_by && (
              <p className="text-xs text-red-800 mt-0.5">By {po.rejected_by}</p>
            )}
            {po.rejection_reason && (
              <p className="text-xs text-red-800 mt-1.5"><span className="font-medium">Reason:</span> {po.rejection_reason}</p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: Details / Edit form ── */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardContent className="p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">Order Details</h2>

              {!isEditing ? (
                <div className="space-y-3">
                  {[
                    { icon: <Calendar className="w-4 h-4 text-gray-400" />,    label: 'Order Date',        value: fmt(po.order_date) },
                    { icon: <Truck className="w-4 h-4 text-gray-400" />,       label: 'Expected Delivery', value: fmt(po.expected_delivery_date) },
                    { icon: <CheckCircle className="w-4 h-4 text-gray-400" />, label: 'Actual Delivery',   value: fmt(po.actual_delivery_date) },
                    { icon: <DollarSign className="w-4 h-4 text-gray-400" />,  label: 'Currency',          value: po.currency },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-2">
                      {item.icon}
                      <div>
                        <div className="text-xs text-gray-500">{item.label}</div>
                        <div className="text-sm font-medium text-gray-900">{item.value}</div>
                      </div>
                    </div>
                  ))}
                  {po.notes && (
                    <div className="flex items-start gap-2">
                      <StickyNote className="w-4 h-4 text-gray-400 shrink-0 mt-3" />
                      <p className="text-sm text-gray-600 bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex-1">
                        {po.notes}
                      </p>
                    </div>
                  )}
                  {/* Payment row */}
                  {(po.payment_due_date || po.payment_notes) && (
                    <div className="border-t border-gray-100 pt-3 mt-1">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5" /> Payment
                      </p>
                      <div className="flex flex-col gap-1.5 text-sm">
                        {po.payment_due_date && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-500 text-xs">Due</span>
                            <span className={`font-medium ${(po.payment_status ?? 'Unpaid') === 'Overdue' ? 'text-red-600' : 'text-gray-700'}`}>
                              {fmt(po.payment_due_date)}
                            </span>
                          </div>
                        )}
                        {po.payment_notes && (
                          <div className="flex items-start gap-2">
                            <StickyNote className="w-4 h-4 text-gray-400 shrink-0 mt-3" />
                            <p className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3 flex-1">
                              {po.payment_notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <label className="block text-xs font-medium text-gray-600">Supplier</label>
                      {eligibleSuppliersLoading && materialIdsOnPO.length > 0 && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Matching catalogue…
                        </span>
                      )}
                    </div>
                    {eligibleSupplierIds !== null && materialIdsOnPO.length > 0 && !eligibleSuppliersLoading && (
                      <p className="text-xs text-amber-800/90 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 mb-2">
                        Only suppliers that stock <span className="font-semibold">all {materialIdsOnPO.length} material{materialIdsOnPO.length !== 1 ? 's' : ''}</span> on this order are shown.
                        {eligibleSupplierIds.size === 0 && (
                          <span className="block mt-1 text-red-700 font-medium">
                            None qualify yet — link these materials to a supplier (Suppliers page) or adjust line items.
                          </span>
                        )}
                      </p>
                    )}
                    <select
                      value={editForm.supplier_id ?? po.supplier_id ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, supplier_id: e.target.value || null }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">— No supplier —</option>
                      {suppliersForSelect.some(s => s.preferred_supplier) && (
                        <optgroup label="⭐ Preferred Suppliers">
                          {suppliersForSelect.filter(s => s.preferred_supplier).map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name}{s.payment_terms ? ` · Est. ${s.payment_terms}` : ''}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {suppliersForSelect.some(s => !s.preferred_supplier) && (
                        <optgroup label="All Suppliers">
                          {suppliersForSelect.filter(s => !s.preferred_supplier).map(s => (
                            <option key={s.id} value={s.id}>
                              {s.name}{s.payment_terms ? ` · Est. ${s.payment_terms}` : ''}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    {/* Selected supplier info pill */}
                    {(() => {
                      const sel = supplierList.find(s => s.id === (editForm.supplier_id ?? po.supplier_id));
                      if (!sel) return null;
                      return (
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          {sel.preferred_supplier && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                              ⭐ Preferred
                            </span>
                          )}
                          {sel.payment_terms && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                              <Truck className="w-3 h-3" /> Est. {sel.payment_terms}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                    <select
                      value={editForm.status ?? po.status}
                      onChange={e => setEditForm(f => ({ ...f, status: e.target.value as POStatus }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    >
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Expected Delivery</label>
                    <input type="date"
                      value={editForm.expected_delivery_date ?? po.expected_delivery_date ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, expected_delivery_date: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Actual Delivery</label>
                    <input type="date"
                      value={editForm.actual_delivery_date ?? po.actual_delivery_date ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, actual_delivery_date: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                    <textarea rows={4}
                      value={editForm.notes ?? po.notes ?? ''}
                      onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                  </div>

                  {/* Payment Details */}
                  <div className="col-span-2 pt-2 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" /> Payment Details
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Payment Due Date</label>
                        <input type="date"
                          value={editForm.payment_due_date ?? po.payment_due_date ?? ''}
                          onChange={e => setEditForm(f => ({ ...f, payment_due_date: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
                        <select
                          value={editForm.payment_method ?? po.payment_method ?? ''}
                          onChange={e => setEditForm(f => ({ ...f, payment_method: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">— Select —</option>
                          {PAYMENT_METHODS.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Payment Notes</label>
                        <textarea rows={2}
                          value={editForm.payment_notes ?? po.payment_notes ?? ''}
                          onChange={e => setEditForm(f => ({ ...f, payment_notes: e.target.value }))}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
                          placeholder="e.g. Net 30, partial deposit, invoice ref..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right: Materials ── */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Package className="w-4 h-4" /> Raw Materials
                  <span className="text-xs font-normal text-gray-400">({items.length} item{items.length !== 1 ? 's' : ''})</span>
                </h2>
                <span className="text-sm font-bold text-gray-900">
                  Subtotal: ₱{totalItemValue.toLocaleString()}
                </span>
              </div>

              {displayItems.length === 0 ? (
                <div className="text-center py-8 space-y-2 max-w-md mx-auto">
                  <p className="text-sm text-gray-500">No materials on this order yet.</p>
                  {(editForm.supplier_id ?? po.supplier_id) && (
                    <p className="text-xs text-indigo-600">{'✓ Picker shows only this supplier\'s items'}</p>
                  )}
                  {isEditing && !(editForm.supplier_id ?? po.supplier_id) && (
                    <p className="text-xs text-gray-500">
                      {'Select a supplier in Order Details to filter the material list to that supplier\'s catalogue.'}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {displayItems.map(item => {
                    const isEditingThis = editingItemId === item.id;
                    const mat = item.raw_materials;
                    return (
                      <div
                        key={item.id}
                        className={`border rounded-xl overflow-hidden transition-all ${isEditingThis ? 'border-indigo-300 shadow-sm' : 'border-gray-100'}`}
                      >
                        {/* Item summary row — always visible, clickable to edit */}
                        <div
                          className={`flex items-center gap-3 p-3 ${isEditing ? 'cursor-pointer' : ''} ${isEditingThis ? 'bg-indigo-50' : isEditing ? 'bg-gray-50 hover:bg-gray-100' : 'bg-gray-50'}`}
                          onClick={() => isEditing && (isEditingThis ? setEditingItemId(null) : handleOpenItemEdit(item))}
                        >
                          {/* Image */}
                          {mat?.image_url ? (
                            <img src={mat.image_url} alt={materialDisplayLine(mat)}
                              className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-gray-200"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                              <Package className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-gray-900 truncate">{materialDisplayLine(mat)}</div>
                            <div className="text-xs text-gray-400 font-mono">{mat?.sku}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              Ordered: <span className="font-medium text-gray-700">{item.quantity_ordered.toLocaleString()} {item.unit_of_measure}</span>
                              {item.quantity_received > 0 && (
                                <> · Received: <span className="font-medium text-green-700">{item.quantity_received.toLocaleString()}</span></>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold text-gray-900">₱{item.unit_price.toLocaleString()}/{item.unit_of_measure ?? 'unit'}</div>
                            <div className="text-xs text-gray-500">₱{(item.unit_price * item.quantity_ordered).toLocaleString()} total</div>
                          </div>
                          {isEditing && (
                            <button
                              onClick={e => { e.stopPropagation(); handleRemoveItem(item.id); }}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg ml-1 shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {/* Inline edit form */}
                        {isEditingThis && (
                          <div className="px-4 pb-4 pt-3 bg-white border-t border-indigo-100 space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Qty Ordered</label>
                                <input type="number" min="0" value={editItemQtyOrdered}
                                  onChange={e => setEditItemQtyOrdered(e.target.value)}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Unit of Measure</label>
                                <input value={editItemUOM}
                                  onChange={e => setEditItemUOM(e.target.value)}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Unit Price (₱)</label>
                                <input type="number" min="0" value={editItemPrice}
                                  onChange={e => setEditItemPrice(e.target.value)}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Qty Received</label>
                                <input type="number" min="0" value={editItemQtyReceived}
                                  onChange={e => setEditItemQtyReceived(e.target.value)}
                                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                            </div>

                            {/* Change material price toggle */}
                            <div className="flex items-center justify-between p-2.5 rounded-lg border border-amber-200 bg-amber-50">
                              <div>
                                <p className="text-xs font-semibold text-amber-800">Update material price on receive</p>
                                <p className="text-xs text-amber-600 mt-0.5">
                                  Sets <strong>{materialDisplayLine(item.raw_materials)}</strong>&apos;s catalog price to{' '}
                                  <strong>₱{parseFloat(editItemPrice) > 0 ? parseFloat(editItemPrice).toLocaleString() : '—'}</strong> on save.
                                </p>
                              </div>
                              <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
                                <input
                                  type="checkbox"
                                  className="sr-only peer"
                                  checked={priceUpdateItems.has(item.id)}
                                  onChange={e => setPriceUpdateItems(prev => {
                                    const next = new Set(prev);
                                    e.target.checked ? next.add(item.id) : next.delete(item.id);
                                    return next;
                                  })}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
                              </label>
                            </div>

                            <div className="flex gap-2">
                              <button onClick={handleSaveItemEdit}
                                className="flex-1 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-1">
                                {item.id.startsWith('temp_') ? (
                                  <><Plus className="w-3.5 h-3.5" /> Add to Order</>
                                ) : (
                                  <><Save className="w-3.5 h-3.5" /> Apply</>
                                )}
                              </button>
                              <button onClick={() => setEditingItemId(null)}
                                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add material — picker only in edit mode */}
              {isEditing && (
                <button
                  onClick={() => setShowPicker(true)}
                  className="mt-3 w-full flex items-center gap-3 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center flex-shrink-0 transition-colors">
                    <Plus className="w-5 h-5 text-gray-400 group-hover:text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600 group-hover:text-indigo-700">Add a Raw Material</p>
                    <p className="text-xs text-gray-400 mt-0.5">Browse by category · Click item to set qty &amp; price</p>
                  </div>
                </button>
              )}
            </CardContent>
          </Card>
        </div>

      </div>

      {/* ── Proofs of Receiving ─────────────────────────────── */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Proofs of Receiving
              {receipts.length > 0 && (
                <span className="text-xs font-normal text-gray-400">({receipts.length} image{receipts.length !== 1 ? 's' : ''})</span>
              )}
            </h2>
            {isEditing && (
              <button
                onClick={handleAddReceiptImages}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" /> Add Images
              </button>
            )}
          </div>

          {receipts.length === 0 ? (
            <div
              className={`flex flex-col items-center justify-center py-10 text-center rounded-xl border-2 border-dashed transition-colors ${isEditing ? 'border-gray-300 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50' : 'border-gray-100'}`}
              onClick={isEditing ? handleAddReceiptImages : undefined}
            >
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <ImageIcon className="w-6 h-6 text-gray-300" />
              </div>
              <p className="text-sm text-gray-400">{isEditing ? 'Click to upload images' : 'No proofs uploaded yet'}</p>
              <p className="text-xs text-gray-300 mt-1">{isEditing ? 'Or attach them when confirming a receipt' : 'Upload images when confirming a receipt'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {receipts.map(receipt => (
                <div key={receipt.id} className="group relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-square cursor-pointer"
                  onClick={() => !isEditing && setLightboxUrl(receipt.file_url)}
                >
                  <img
                    src={receipt.file_url}
                    alt={receipt.file_name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  {/* View overlay (view mode) */}
                  {!isEditing && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                  {/* Delete button (edit mode) */}
                  {isEditing && (
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteReceipt(receipt); }}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                    <p className="text-white text-[10px] truncate">{receipt.file_name}</p>
                    <p className="text-white/70 text-[9px]">
                      {new Date(receipt.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
              {/* Inline add tile (edit mode) */}
              {isEditing && (
                <div
                  onClick={handleAddReceiptImages}
                  className="group relative rounded-xl overflow-hidden border-2 border-dashed border-gray-300 bg-gray-50 aspect-square cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 flex flex-col items-center justify-center gap-1 transition-colors"
                >
                  <Upload className="w-5 h-5 text-gray-400 group-hover:text-indigo-500" />
                  <span className="text-xs text-gray-400 group-hover:text-indigo-500">Add more</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity log (same account / role pattern as customer orders) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="w-5 h-5" />
            Activity log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {poLogs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No activity recorded yet. Saves, approvals, supplier confirmation, receipts, proof photos, and payments will
                appear here.
              </p>
            ) : (
              poLogs.map((log, index) => {
                const isLast = index === poLogs.length - 1;
                const getActionIcon = () => {
                  switch (log.action) {
                    case 'requested':
                      return <ClipboardList className="w-4 h-4" />;
                    case 'submitted':
                      return <Send className="w-4 h-4" />;
                    case 'updated':
                      return <FileText className="w-4 h-4" />;
                    case 'approved':
                      return <ThumbsUp className="w-4 h-4" />;
                    case 'rejected':
                      return <XCircle className="w-4 h-4" />;
                    case 'order_confirmed':
                      return <ShieldCheck className="w-4 h-4" />;
                    case 'receipt_posted':
                      return <PackageCheck className="w-4 h-4" />;
                    case 'payment_recorded':
                      return <CreditCard className="w-4 h-4" />;
                    case 'proof_uploaded':
                      return <ImageIcon className="w-4 h-4" />;
                    case 'proof_removed':
                      return <Trash2 className="w-4 h-4" />;
                    case 'status_changed':
                      return <Truck className="w-4 h-4" />;
                    default:
                      return <Clock className="w-4 h-4" />;
                  }
                };
                const getActionColor = () => {
                  switch (log.action) {
                    case 'approved':
                    case 'order_confirmed':
                      return 'text-green-600 bg-green-50';
                    case 'rejected':
                      return 'text-red-600 bg-red-50';
                    case 'payment_recorded':
                      return 'text-violet-600 bg-violet-50';
                    case 'receipt_posted':
                      return 'text-emerald-600 bg-emerald-50';
                    case 'proof_uploaded':
                      return 'text-blue-600 bg-blue-50';
                    case 'proof_removed':
                      return 'text-orange-600 bg-orange-50';
                    case 'requested':
                    case 'submitted':
                      return 'text-amber-600 bg-amber-50';
                    default:
                      return 'text-gray-600 bg-gray-50';
                  }
                };
                const getRoleBadgeColor = () => {
                  switch (log.performed_by_role) {
                    case 'Agent':
                      return 'bg-blue-100 text-blue-800';
                    case 'Manager':
                      return 'bg-purple-100 text-purple-800';
                    case 'Warehouse Staff':
                      return 'bg-orange-100 text-orange-800';
                    case 'Logistics':
                      return 'bg-green-100 text-green-800';
                    case 'Admin':
                      return 'bg-red-100 text-red-800';
                    case 'System':
                      return 'bg-gray-100 text-gray-800';
                    default:
                      return 'bg-gray-100 text-gray-800';
                  }
                };
                const t = new Date(log.created_at);
                const timeStr = t.toLocaleString('en-PH', {
                  year:    'numeric',
                  month:   'short',
                  day:     'numeric',
                  hour:    'numeric',
                  minute:  '2-digit',
                });
                const roleLabel =
                  log.performed_by_role === 'Admin' ? 'Executive' : log.performed_by_role ?? '';
                return (
                  <div key={log.id} className="relative pl-8 pb-3">
                    {!isLast && <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-gray-200" aria-hidden />}
                    <div
                      className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center ${getActionColor()}`}
                    >
                      {getActionIcon()}
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-900 flex-1">{poLogCardHeadline(log)}</p>
                        {roleLabel && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${getRoleBadgeColor()}`}>
                            {roleLabel}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 mb-1">
                        <User className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-medium text-gray-700">{log.performed_by ?? '—'}</span>
                        <span>· {timeStr}</span>
                      </div>
                      <PoActivityLogHumanDetails log={log} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="w-7 h-7" />
          </button>
          <img
            src={lightboxUrl}
            alt="Receipt proof"
            className="max-h-[90vh] max-w-[90vw] rounded-xl shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {/* Material picker modal */}
      <RawMaterialPickerModal
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        branch={branch}
        alreadyAdded={stagedItems.map(i => i.material_id ?? '')}
        onSelect={handlePickerSelect}
        supplierId={editForm.supplier_id ?? po?.supplier_id ?? null}
        supplierName={
          editForm.supplier_id
            ? (supplierList.find(s => s.id === editForm.supplier_id)?.name ?? null)
            : (po?.suppliers?.name ?? null)
        }
      />

      {/* Receipt gallery — edit mode (inserts DB record immediately on select) */}
      <ImageGalleryModal
        isOpen={showReceiptGallery}
        onClose={() => setShowReceiptGallery(false)}
        folder={`${PO_RECEIPTS_FOLDER}/${po?.id ?? 'unknown'}`}
        maxImages={20}
        onSelectImages={handleReceiptGallerySelect}
      />

      {/* Receipt gallery — receive modal (stages URLs, inserted on confirm) */}
      <ImageGalleryModal
        isOpen={showReceiveGallery}
        onClose={() => setShowReceiveGallery(false)}
        folder={`${PO_RECEIPTS_FOLDER}/${po?.id ?? 'unknown'}`}
        maxImages={20}
        currentImages={stagedReceiptUrls.map(r => r.url)}
        onSelectImages={urls => {
          setStagedReceiptUrls(urls.map(url => ({
            url,
            name: url.split('/').pop() ?? 'receipt',
          })));
          setShowReceiveGallery(false);
        }}
        stackOnTopOfModal
      />

      {/* ── Receive Delivery Modal ── */}
      {isReceiving && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                  <PackageCheck className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Record Delivery Receipt</h2>
                  <p className="text-xs text-gray-500">{po.po_number} · {po.suppliers?.name ?? '—'}</p>
                </div>
              </div>
              <button onClick={handleCancelReceive} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              <p className="text-xs text-gray-500 pb-1">
                Enter the quantity received for each item. Leave blank or 0 for items not yet delivered.
                The PO status will update automatically based on fulfillment.
              </p>
              {items.map(item => {
                const mat = item.raw_materials;
                const remaining = Math.max(0, item.quantity_ordered - item.quantity_received);
                const receivingNow = parseFloat(receiveQtys[item.id] ?? '0') || 0;
                const isPartial = receivingNow > 0 && receivingNow < remaining;
                const isFull    = receivingNow >= remaining && remaining > 0;
                const isNone    = receivingNow === 0;
                return (
                  <div key={item.id} className={`border rounded-xl overflow-hidden transition-colors ${isFull ? 'border-green-300' : isPartial ? 'border-amber-300' : 'border-gray-200'}`}>
                    {/* Item row */}
                    <div className={`flex items-center gap-3 p-3 ${isFull ? 'bg-green-50' : isPartial ? 'bg-amber-50' : 'bg-gray-50'}`}>
                      {mat?.image_url ? (
                        <img src={mat.image_url} alt={materialDisplayLine(mat)}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-200"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <Package className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900 truncate">{materialDisplayLine(mat)}</span>
                          {isFull    && <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">Fully received</span>}
                          {isPartial && <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Partial</span>}
                          {isNone    && remaining > 0 && <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">Not receiving</span>}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Ordered <span className="font-medium text-gray-700">{item.quantity_ordered.toLocaleString()}</span>
                          {item.quantity_received > 0 && <> · Already received <span className="font-medium text-green-700">{item.quantity_received.toLocaleString()}</span></>}
                          {' · '}Remaining <span className="font-medium text-orange-600">{remaining.toLocaleString()}</span>
                          {' '}{item.unit_of_measure}
                        </div>
                      </div>
                    </div>

                    {/* Inputs */}
                    <div className="px-3 pb-3 pt-2 bg-white space-y-2.5">
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Receiving now <span className="text-gray-400 font-normal">({item.unit_of_measure})</span>
                          </label>
                          <input
                            type="number" min="0"
                            value={receiveQtys[item.id] ?? ''}
                            onChange={e => setReceiveQtys(prev => ({ ...prev, [item.id]: e.target.value }))}
                            className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 transition-colors ${
                              isFull    ? 'border-green-400 focus:ring-green-500 bg-green-50'
                            : isPartial ? 'border-amber-400 focus:ring-amber-500 bg-amber-50'
                            : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                            }`}
                          />
                          {isPartial && (
                            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              {remaining - receivingNow} {item.unit_of_measure} still outstanding after this receipt
                            </p>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 pb-2.5 shrink-0">
                          ₱{item.unit_price.toLocaleString()}/{item.unit_of_measure ?? 'unit'}
                        </div>
                      </div>

                      {/* Price update toggle — settings style */}
                      <div className="flex items-center justify-between p-2.5 rounded-lg border border-amber-200 bg-amber-50">
                        <div>
                          <p className="text-xs font-semibold text-amber-800">Update material price on receive</p>
                          <p className="text-xs text-amber-600 mt-0.5">
                            Sets <strong>{mat ? materialDisplayLine(mat) : 'material'}</strong>&apos;s catalog price to{' '}
                            <strong>₱{item.unit_price.toLocaleString()}</strong> on confirm.
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={receivePriceUpdate.has(item.id)}
                            onChange={e => setReceivePriceUpdate(prev => {
                              const next = new Set(prev);
                              e.target.checked ? next.add(item.id) : next.delete(item.id);
                              return next;
                            })}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* ── Proof of Receiving upload ── */}
              <div className="mt-2 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-gray-600 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" /> Attach Proof of Receiving
                    <span className="font-normal text-gray-400">(optional)</span>
                  </p>
                  <button
                    onClick={() => setShowReceiveGallery(true)}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" /> Browse / Upload
                  </button>
                </div>

                {/* Staged previews */}
                {stagedReceiptUrls.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {stagedReceiptUrls.map((r, i) => (
                      <div key={i} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                        <img src={r.url} alt={r.name} className="w-full h-full object-cover" />
                        <button
                          onClick={() => setStagedReceiptUrls(prev => prev.filter((_, j) => j !== i))}
                          className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-1 py-0.5">
                          <p className="text-white text-[10px] truncate">{r.name}</p>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => setShowReceiveGallery(true)}
                      className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 hover:border-green-400 hover:bg-green-50 flex flex-col items-center justify-center gap-1 transition-colors"
                    >
                      <Plus className="w-4 h-4 text-gray-400" />
                      <span className="text-[10px] text-gray-400">Add more</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowReceiveGallery(true)}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-green-400 hover:bg-green-50 transition-colors"
                  >
                    <Upload className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-400">Browse or upload images</span>
                  </button>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between gap-3 rounded-b-xl bg-gray-50">
              <p className="text-xs text-gray-400">
                {stagedReceiptUrls.length > 0 ? `${stagedReceiptUrls.length} image${stagedReceiptUrls.length > 1 ? 's' : ''} attached` : ''}
              </p>
              <div className="flex items-center gap-3">
              <button
                onClick={handleCancelReceive}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReceive}
                disabled={receiveSaving}
                className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {receiveSaving
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  : <><PackageCheck className="w-4 h-4" /> Confirm Receipt</>
                }
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Record Payment Modal ── */}
      {showPayment && po && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">Record Payment</h2>
                  <p className="text-xs text-gray-500">{po.po_number} · {po.suppliers?.name ?? '—'}</p>
                </div>
              </div>
              <button onClick={() => setShowPayment(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Summary row */}
              <div className="bg-gray-50 rounded-xl p-3 grid grid-cols-3 text-center divide-x divide-gray-200">
                <div>
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-sm font-bold text-gray-900">₱{po.total_amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Already Paid</p>
                  <p className="text-sm font-bold text-green-600">₱{(po.amount_paid ?? 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Remaining</p>
                  <p className="text-sm font-bold text-blue-700">₱{Math.max(0, po.total_amount - (po.amount_paid ?? 0)).toLocaleString()}</p>
                </div>
              </div>

              {/* Amount input */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Amount Paying Now <span className="text-red-400">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₱</span>
                  <input
                    type="number"
                    min="0"
                    max={Math.max(0, po.total_amount - (po.amount_paid ?? 0))}
                    step="0.01"
                    value={paymentAmount}
                    onChange={e => setPaymentAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                {parseFloat(paymentAmount) > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    New total paid: ₱{Math.min(po.total_amount, (po.amount_paid ?? 0) + (parseFloat(paymentAmount) || 0)).toLocaleString()}
                    {' '}·{' '}
                    <span className={
                      derivePaymentStatus(Math.min(po.total_amount, (po.amount_paid ?? 0) + (parseFloat(paymentAmount) || 0)), po.total_amount, po.payment_due_date) === 'Paid'
                        ? 'text-green-600 font-semibold'
                        : 'text-amber-600 font-semibold'
                    }>
                      {derivePaymentStatus(Math.min(po.total_amount, (po.amount_paid ?? 0) + (parseFloat(paymentAmount) || 0)), po.total_amount, po.payment_due_date)}
                    </span>
                  </p>
                )}
              </div>

              {/* Payment method */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                >
                  {PAYMENT_METHODS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Payment date */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Payment Date</label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={e => setPaymentDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea
                  rows={2}
                  value={paymentNoteInput}
                  onChange={e => setPaymentNoteInput(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="e.g. Invoice #1234, partial deposit..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowPayment(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={paymentSaving || !parseFloat(paymentAmount)}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                {paymentSaving
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                  : <><Banknote className="w-4 h-4" /> Confirm Payment</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Submit for approval (Draft → Requested) ── */}
      {showSubmitModal && po && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => !approvalLoading && setShowSubmitModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Send className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Submit for approval</h2>
                <p className="text-sm text-gray-500">{po.po_number}</p>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-gray-700">
                This will send the purchase order to <span className="font-semibold">Requested</span> so a manager or executive can accept or reject it.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                disabled={approvalLoading}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitForApproval}
                disabled={approvalLoading}
                className="px-5 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {approvalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Submit for approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Accept request modal ── */}
      {showAcceptModal && po && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => !approvalLoading && setShowAcceptModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Accept request</h2>
                <p className="text-sm text-gray-500">{po.po_number}</p>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-gray-700">
                Are you sure you want to <span className="font-semibold text-green-700">accept</span> this purchase order request?
                The status will be set to <span className="font-semibold">Accepted</span> so you can confirm the order with the supplier.
              </p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAcceptModal(false)}
                disabled={approvalLoading}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAcceptRequest}
                disabled={approvalLoading}
                className="px-5 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {approvalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirm acceptance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject request modal ── */}
      {showRejectModal && po && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => { if (!approvalLoading) { setShowRejectModal(false); setRejectionReason(''); } }}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Reject request</h2>
                <p className="text-sm text-gray-500">{po.po_number}</p>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-700">
                Are you sure you want to <span className="font-semibold text-red-700">reject</span> this purchase order request?
                It will be marked <span className="font-semibold">Rejected</span> and this action is recorded in the activity log.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Reason for rejection <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder="e.g. Budget not approved, wrong supplier, duplicate request…"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowRejectModal(false); setRejectionReason(''); }}
                disabled={approvalLoading}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectRequest}
                disabled={approvalLoading}
                className="px-5 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {approvalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Confirm rejection
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
