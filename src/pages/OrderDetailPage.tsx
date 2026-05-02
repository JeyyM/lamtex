import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { supabase } from '@/src/lib/supabase';
import { useAppContext } from '@/src/store/AppContext';
import { OrderDetail, OrderStatus, OrderLineItem, OrderLog, ProofDocument, OrderUrgency } from '@/src/types/orders';
import { PaymentLink } from '@/src/types/payments';
import { PaymentLinkModal } from '@/src/components/payments/PaymentLinkModal';
import {
  FulfillOrderModal,
  FulfillmentData,
  fulfillmentRemaining,
} from '@/src/components/orders/FulfillOrderModal';
import { MarkInTransitModal } from '@/src/components/orders/MarkInTransitModal';
import {
  orderLogCardHeadline,
  OrderActivityLogHumanDetails,
} from '@/src/components/orders/OrderActivityLogHuman';
import ImageGalleryModal from '@/src/components/ImageGalleryModal';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Send,
  Save,
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck,
  Package,
  CreditCard,
  Calendar,
  FileText,
  User,
  MapPin,
  Phone,
  Building,
  Plus,
  X,
  Search,
  ShoppingCart,
  Minus,
  ArrowUp,
  Download,
  Upload,
  Image,
  CheckCircle2,
  XCircle,
  Link as LinkIcon,
  Copy,
  Loader2,
  ThumbsUp,
  PackageCheck,
  Route,
} from 'lucide-react';

const ORDER_PROOF_GALLERY_FOLDER = 'order-proofs';

/** Local proof uploads: images + common business documents (allowlist). */
const ORDER_PROOF_UPLOAD_EXT =
  /\.(pdf|jpe?g|png|webp|gif|avif|bmp|jfif|doc|docx|xls|xlsx|ppt|pptx|txt|csv|rtf|odt|ods|odp)$/i;

const ORDER_URGENCY_OPTIONS: OrderUrgency[] = ['Low', 'Medium', 'High', 'Critical'];

function parseOrderUrgency(v: unknown): OrderUrgency {
  if (v === 'Low' || v === 'Medium' || v === 'High' || v === 'Critical') return v;
  return 'Medium';
}

function orderProofFileIsImageName(fileName: string): boolean {
  return /\.(jpe?g|png|webp|gif|avif|bmp|jfif)$/i.test(fileName);
}

// ── DB Types (same as CreateOrderModal) ──────────────────────────────────────
interface DBBulkDiscount { min_qty: number; max_qty: number | null; discount_percent: number; }
interface DBVariantDet { id: string; size: string; description: string | null; unit_price: number; stock: number; bulk_discounts: DBBulkDiscount[]; }
interface DBProductDet { id: string; name: string; image_url: string | null; variants: DBVariantDet[]; }
interface DBCategoryDet { id: string; name: string; image_url: string | null; }

/** `order_line_items.id` must be a DB UUID — unsaved rows may use temp ids like `item-…`. */
function isPersistedOrderLineId(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { branch, addAuditLog, role, session, employeeName } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editedOrder, setEditedOrder] = useState<OrderDetail | null>(null);

  // Product modal — Supabase-based, same e-commerce style as CreateOrderModal
  const [showProductModal, setShowProductModal] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [categories, setCategories] = useState<DBCategoryDet[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<DBCategoryDet | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<DBProductDet[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<DBProductDet | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<DBVariantDet | null>(null);
  /** String fields so quantity/price/% can be cleared while editing; validated on Add/Update. */
  const [variantQtyInput, setVariantQtyInput] = useState('1');
  const [variantPriceInput, setVariantPriceInput] = useState('0');
  const [variantDiscounts, setVariantDiscounts] = useState<Array<{ name: string; percentage: string }>>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  // Cache fetched products by id for instant lookup when re-editing items
  const [productCache, setProductCache] = useState<Record<string, DBProductDet>>({});
  
  // Fulfill order state
  const [showFulfillModal, setShowFulfillModal] = useState(false);
  
  // Invoice and Proof states
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [showProofImageGallery, setShowProofImageGallery] = useState(false);
  const [proofType, setProofType] = useState<'delivery' | 'payment' | 'receipt'>('delivery');
  /** Public URLs from Image Gallery (compressed upload); multi-select in gallery. */
  const [selectedProofGalleryUrls, setSelectedProofGalleryUrls] = useState<string[]>([]);
  /** Local PDFs and/or images (multi-select). */
  const [selectedProofLocalFiles, setSelectedProofLocalFiles] = useState<File[]>([]);
  const [proofNotes, setProofNotes] = useState('');
  const [proofs, setProofs] = useState<ProofDocument[]>([]);
  
  // Payment link state
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);

  // Approve / Reject modal state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalLoading, setApprovalLoading] = useState(false);

  const [showInTransitModal, setShowInTransitModal] = useState(false);
  const [inTransitSubmitting, setInTransitSubmitting] = useState(false);
  const [logisticsLoading, setLogisticsLoading] = useState(false);

  // Supabase data state
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [orderLogs, setOrderLogs] = useState<OrderLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerList, setCustomerList] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!id) return;
    const fetchOrder = async () => {
      setLoading(true);

      // Fetch order row + branch name via join
      const { data: row } = await supabase
        .from('orders')
        .select(`
          id, order_number, branch_id, customer_id, customer_name, agent_id, agent_name,
          order_date, required_date, urgency, delivery_type, payment_terms, payment_method,
          status, payment_status, subtotal, discount_percent, discount_amount,
          tax_amount, total_amount, requires_approval, approval_reasons,
          approved_by, approved_date, rejected_by, rejection_reason,
          estimated_delivery, scheduled_departure_date, actual_delivery, order_notes, internal_notes,
          invoice_id, invoice_date, due_date, amount_paid, balance_due,
          created_at, updated_at, cancelled_at, cancellation_reason,
          branches(name, code)
        `)
        .eq('id', id)
        .single();

      if (!row) { setLoading(false); return; }

      // Fetch line items
      const { data: items } = await supabase
        .from('order_line_items')
        .select('id, sku, variant_id, product_name, variant_description, quantity, unit_price, original_price, negotiated_price, discount_percent, discount_amount, batch_discount, discounts_breakdown, line_total, stock_hint, available_stock, quantity_shipped, quantity_delivered')
        .eq('order_id', id)
        .order('created_at');

      // Fetch order logs
      const { data: logs } = await supabase
        .from('order_logs')
        .select('id, order_id, action, performed_by, performed_by_role, description, old_value, new_value, metadata, timestamp')
        .eq('order_id', id)
        .order('timestamp', { ascending: false });

      const branchName = (row as any).branches?.name ?? '';

      const lineItems: OrderLineItem[] = (items ?? []).map((item: any) => ({
        id: item.id,
        sku: item.sku ?? '',
        variantId: item.variant_id ?? undefined,
        productName: item.product_name ?? '',
        variantDescription: item.variant_description ?? '',
        quantity: item.quantity,
        unitPrice: item.unit_price,
        originalPrice: item.original_price,
        negotiatedPrice: item.negotiated_price,
        discountPercent: item.discount_percent ?? 0,
        discountAmount: item.discount_amount ?? 0,
        batchDiscount: item.batch_discount,
        discountsBreakdown: Array.isArray((item as any).discounts_breakdown) ? (item as any).discounts_breakdown : undefined,
        lineTotal: item.line_total,
        stockHint: item.stock_hint ?? 'Available',
        availableStock: item.available_stock,
        quantityShipped: item.quantity_shipped != null ? Number(item.quantity_shipped) : undefined,
        quantityDelivered: item.quantity_delivered != null ? Number(item.quantity_delivered) : undefined,
      }));

      const mappedOrder: OrderDetail = {
        id: (row as any).order_number,
        branchId: (row as any).branch_id ?? undefined,
        customer: (row as any).customer_name ?? '',
        customerId: (row as any).customer_id ?? '',
        agent: (row as any).agent_name ?? '',
        agentId: (row as any).agent_id ?? '',
        branch: branchName,
        orderDate: (row as any).order_date ?? '',
        requiredDate: (row as any).required_date ?? '',
        urgency: parseOrderUrgency((row as any).urgency),
        deliveryType: (row as any).delivery_type ?? 'Truck',
        paymentTerms: (row as any).payment_terms ?? 'COD',
        paymentMethod: (row as any).payment_method ?? 'Offline',
        status: (row as any).status,
        paymentStatus: (row as any).payment_status,
        items: lineItems,
        subtotal: (row as any).subtotal ?? 0,
        discountPercent: (row as any).discount_percent ?? 0,
        discountAmount: (row as any).discount_amount ?? 0,
        totalAmount: (row as any).total_amount ?? 0,
        requiresApproval: (row as any).requires_approval ?? false,
        approvalReason: (row as any).approval_reasons,
        approvedBy: (row as any).approved_by,
        approvedDate: (row as any).approved_date,
        rejectedBy: (row as any).rejected_by,
        rejectionReason: (row as any).rejection_reason,
        estimatedDelivery: (row as any).estimated_delivery,
        scheduledDepartureDate: (row as any).scheduled_departure_date
          ? String((row as any).scheduled_departure_date).slice(0, 10)
          : undefined,
        actualDelivery: (row as any).actual_delivery,
        invoiceId: (row as any).invoice_id,
        invoiceDate: (row as any).invoice_date,
        dueDate: (row as any).due_date,
        amountPaid: (row as any).amount_paid ?? 0,
        balanceDue: (row as any).balance_due ?? 0,
        orderNotes: (row as any).order_notes,
        internalNotes: (row as any).internal_notes,
        createdAt: (row as any).created_at,
        updatedAt: (row as any).updated_at,
        cancelledAt: (row as any).cancelled_at,
        cancellationReason: (row as any).cancellation_reason,
      };

      const mappedLogs: OrderLog[] = (logs ?? []).map((log: any) => ({
        id: log.id,
        orderId: log.order_id,
        timestamp: log.timestamp,
        action: log.action,
        performedBy: log.performed_by ?? '',
        performedByRole: log.performed_by_role ?? 'System',
        description: log.description ?? '',
        oldValue: log.old_value,
        newValue: log.new_value,
        metadata: log.metadata,
      }));

      setOrder(mappedOrder);
      setOrderLogs(mappedLogs);
      setLoading(false);
    };

    fetchOrder();
  }, [id]);

  // ── Pre-fetch all products for existing order items when edit mode starts ──
  // Must be declared here (before any early returns) to satisfy Rules of Hooks.
  // This mirrors CreateOrderModal: products (with image_url, variants, stock) are
  // loaded into productCache BEFORE the user clicks an item, so handleEditItem
  // can be synchronous — no async lookup needed on click.
  useEffect(() => {
    if (!isEditing) return;
    void supabase
      .from('customers')
      .select('id, name')
      .eq('status', 'Active')
      .order('name')
      .limit(500)
      .then(({ data }) => setCustomerList(data ?? []));
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing || !order) return;

    const prefetchProducts = async () => {
      const items = order.items;
      if (items.length === 0) return;

      // Collect variant UUIDs from the items.
      // - Orders created via CreateOrderModal: item.variantId is the UUID
      // - Orders created via old edit flow: item.variantId is null, item.sku is the UUID
      const variantUuids = [
        ...items.map(i => i.variantId).filter(Boolean) as string[],
        ...items.filter(i => !i.variantId && i.sku).map(i => i.sku),
      ].filter(Boolean);

      if (variantUuids.length === 0) return;

      // 1. Batch-fetch product_id for every variant UUID
      const { data: variantRows } = await supabase
        .from('product_variants')
        .select('id, product_id')
        .in('id', variantUuids);

      const productIds = [
        ...new Set((variantRows ?? []).map((v: any) => v.product_id).filter(Boolean)),
      ] as string[];
      if (productIds.length === 0) return;

      // 2. Batch-fetch all products + variants + bulk discounts
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, image_url, product_variants(id, size, description, unit_price, total_stock, product_bulk_discounts(min_qty, max_qty, discount_percent, is_active))')
        .in('id', productIds);

      if (!productsData || productsData.length === 0) return;

      // 3. Batch-fetch branch-specific stock
      const allVariantIds = productsData.flatMap((p: any) => p.product_variants?.map((v: any) => v.id) ?? []);
      const stockMap: Record<string, number> = {};
      const { data: branchRow } = await supabase.from('branches').select('id').eq('name', branch).maybeSingle();
      if (branchRow?.id && allVariantIds.length > 0) {
        const { data: stockData } = await supabase
          .from('product_variant_stock').select('variant_id, quantity')
          .eq('branch_id', branchRow.id).in('variant_id', allVariantIds);
        (stockData ?? []).forEach((s: any) => { stockMap[s.variant_id] = s.quantity; });
      }

      // 4. Build DBProductDet objects and populate the cache
      const mapped: DBProductDet[] = productsData.map((p: any) => ({
        id: p.id,
        name: p.name,
        image_url: p.image_url ?? null,
        variants: (p.product_variants ?? []).map((v: any) => ({
          id: v.id,
          size: v.size,
          description: v.description ?? null,
          unit_price: Number(v.unit_price ?? 0),
          stock: stockMap[v.id] ?? v.total_stock ?? 0,
          bulk_discounts: (v.product_bulk_discounts ?? [])
            .filter((d: any) => d.is_active)
            .map((d: any) => ({ min_qty: d.min_qty, max_qty: d.max_qty, discount_percent: Number(d.discount_percent) })),
        })),
      }));

      setProductCache(prev => {
        const next = { ...prev };
        mapped.forEach(p => { next[p.id] = p; });
        return next;
      });

      // ── Fallback for legacy items with no variant_id AND no sku ──────────────
      // These items were saved by the old edit flow which lost the variant reference.
      // We can still find the product by its name, which is always stored.
      const itemsWithNoVariant = items.filter(i => !i.variantId && !i.sku);
      if (itemsWithNoVariant.length > 0) {
        const productNames = [...new Set(itemsWithNoVariant.map(i => i.productName).filter(Boolean))];
        if (productNames.length > 0) {
          const { data: productsByName } = await supabase
            .from('products')
            .select('id, name, image_url, product_variants(id, size, description, unit_price, total_stock, product_bulk_discounts(min_qty, max_qty, discount_percent, is_active))')
            .in('name', productNames);

          if (productsByName && productsByName.length > 0) {
            const allFallbackVariantIds = productsByName.flatMap((p: any) => p.product_variants?.map((v: any) => v.id) ?? []);
            const fallbackStockMap: Record<string, number> = {};
            if (branchRow?.id && allFallbackVariantIds.length > 0) {
              const { data: fallbackStock } = await supabase
                .from('product_variant_stock').select('variant_id, quantity')
                .eq('branch_id', branchRow.id).in('variant_id', allFallbackVariantIds);
              (fallbackStock ?? []).forEach((s: any) => { fallbackStockMap[s.variant_id] = s.quantity; });
            }

            const fallbackMapped: DBProductDet[] = productsByName.map((p: any) => ({
              id: p.id,
              name: p.name,
              image_url: p.image_url ?? null,
              variants: (p.product_variants ?? []).map((v: any) => ({
                id: v.id,
                size: v.size,
                description: v.description ?? null,
                unit_price: Number(v.unit_price ?? 0),
                stock: fallbackStockMap[v.id] ?? v.total_stock ?? 0,
                bulk_discounts: (v.product_bulk_discounts ?? [])
                  .filter((d: any) => d.is_active)
                  .map((d: any) => ({ min_qty: d.min_qty, max_qty: d.max_qty, discount_percent: Number(d.discount_percent) })),
              })),
            }));

            setProductCache(prev => {
              const next = { ...prev };
              fallbackMapped.forEach(p => { next[p.id] = p; });
              return next;
            });
          }
        }
      }

    };

    prefetchProducts();
  }, [isEditing, order, branch]);

  // ── Order log helper ──────────────────────────────────────────────────────
  // Maps UserRole → order_log_role enum
  const logRoleMap: Record<string, string> = {
    Executive:  'Admin',
    Agent:      'Agent',
    Warehouse:  'Warehouse Staff',
    Logistics:  'Logistics',
    Driver:     'Logistics',
  };

  const insertOrderLog = async (
    action: string,
    description: string,
    oldValue?: object | null,
    newValue?: object | null,
    metadata?: object | null,
  ) => {
    const actorName = employeeName || session?.user?.email || role;
    const { data, error } = await supabase
      .from('order_logs')
      .insert({
        order_id: id,
        action,
        performed_by:      actorName,
        performed_by_role: logRoleMap[role] ?? 'System',
        description,
        old_value:  oldValue  ?? null,
        new_value:  newValue  ?? null,
        metadata:   metadata  ?? null,
      })
      .select('id, order_id, action, performed_by, performed_by_role, description, old_value, new_value, metadata, timestamp')
      .single();

    if (!error && data) {
      const newLog: OrderLog = {
        id:              data.id,
        orderId:         data.order_id,
        timestamp:       data.timestamp,
        action:          data.action,
        performedBy:     data.performed_by ?? '',
        performedByRole: data.performed_by_role ?? 'System',
        description:     data.description ?? '',
        oldValue:        data.old_value,
        newValue:        data.new_value,
        metadata:        data.metadata,
      };
      setOrderLogs(prev => [newLog, ...prev]);
    }
  };

  const advanceLogisticsStatus = async (
    next: OrderStatus,
    extra?: { scheduled_departure_date?: string | null; actual_delivery?: string | null },
  ): Promise<boolean> => {
    if (!id || !order) return false;
    if (logisticsLoading) return false;
    setLogisticsLoading(true);
    const prev = order.status;
    const updatePayload: Record<string, unknown> = {
      status: next,
      updated_at: new Date().toISOString(),
    };
    if (extra?.scheduled_departure_date !== undefined) {
      updatePayload.scheduled_departure_date = extra.scheduled_departure_date;
    }
    if (extra?.actual_delivery !== undefined) {
      updatePayload.actual_delivery = extra.actual_delivery;
    }
    try {
      const { error } = await supabase.from('orders').update(updatePayload).eq('id', id);
      if (error) throw error;
      await insertOrderLog(
        'status_changed',
        `Logistics: ${prev} → ${next}`,
        { status: prev },
        { status: next, ...extra },
      );
      setOrder((o) => {
        if (!o) return o;
        const n: OrderDetail = { ...o, status: next };
        if (extra?.scheduled_departure_date !== undefined) {
          n.scheduledDepartureDate = extra.scheduled_departure_date || undefined;
        }
        if (extra?.actual_delivery !== undefined) {
          n.actualDelivery = extra.actual_delivery || undefined;
        }
        return n;
      });
      return true;
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Update failed');
      return false;
    } finally {
      setLogisticsLoading(false);
    }
  };

  const handleConfirmInTransit = async (rows: { itemId: string; shippedQuantity: number }[]) => {
    if (!id || !order) return;
    const byLine = new Map(rows.map((r) => [r.itemId, r.shippedQuantity]));
    for (const li of order.items) {
      const ship = byLine.get(li.id);
      if (ship === undefined) continue;
      if (ship < 0) {
        alert('Each sent quantity must be 0 or more.');
        return;
      }
      const prevCumulative = li.quantityShipped ?? 0;
      if (prevCumulative + ship > li.quantity) {
        alert(
          `“${li.productName}”: cannot send more than the remaining to fulfill this line (ordered ${li.quantity}, already ${prevCumulative} in transit to date, this shipment: ${ship}).`,
        );
        return;
      }
    }
    if (!order.branchId) {
      alert('This order has no branch assigned. Set a branch on the order before moving stock in transit.');
      return;
    }
    if (order.items.some((li) => !isPersistedOrderLineId(li.id))) {
      alert(
        'Some line items are not saved to the server yet. Use Edit order → Save changes, then mark in transit again.',
      );
      return;
    }
    setInTransitSubmitting(true);
    const branchId = order.branchId;
    const { data: br } = await supabase.from('branches').select('code').eq('id', branchId).maybeSingle();
    const branchCode = (br as { code?: string } | null)?.code ?? '';

    const lineWithShip = order.items.map((li) => ({ line: li, ship: byLine.get(li.id) ?? 0 }));

    for (const { line: l, ship } of lineWithShip) {
      if (!l.variantId || ship <= 0) continue;
      const { data: pvs, error: pErr } = await supabase
        .from('product_variant_stock')
        .select('id, quantity')
        .eq('variant_id', l.variantId)
        .eq('branch_id', branchId)
        .maybeSingle();
      if (pErr) {
        setInTransitSubmitting(false);
        alert(pErr.message);
        return;
      }
      const onHand = pvs ? Number(pvs.quantity) : 0;
      if (onHand < ship) {
        setInTransitSubmitting(false);
        alert(
          `Not enough stock for “${l.productName}” at this branch. On hand: ${onHand}, sending: ${ship}.`
        );
        return;
      }
    }

    try {
      for (const { line: l, ship } of lineWithShip) {
        if (l.variantId && ship > 0) {
          const { data: pvs } = await supabase
            .from('product_variant_stock')
            .select('id, quantity')
            .eq('variant_id', l.variantId)
            .eq('branch_id', branchId)
            .single();
          if (!pvs) {
            throw new Error(`No inventory row for “${l.productName}” at this branch.`);
          }
          const newBranch = Math.max(0, Number(pvs.quantity) - ship);
          const { error: u1 } = await supabase
            .from('product_variant_stock')
            .update({ quantity: newBranch, updated_at: new Date().toISOString() })
            .eq('id', pvs.id);
          if (u1) throw u1;

          const { data: vrow } = await supabase
            .from('product_variants')
            .select('total_stock, sku')
            .eq('id', l.variantId)
            .single();
          if (vrow) {
            const newTotal = Math.max(0, Number(vrow.total_stock ?? 0) - ship);
            const { error: u2 } = await supabase
              .from('product_variants')
              .update({ total_stock: newTotal, updated_at: new Date().toISOString() })
              .eq('id', l.variantId);
            if (u2) throw u2;
          }

          const { error: mErr } = await supabase.from('product_stock_movements').insert({
            variant_id: l.variantId,
            variant_sku: vrow?.sku ?? l.sku,
            product_name: l.productName,
            movement_type: 'Out',
            quantity: ship,
            from_branch: branchCode || null,
            reason: 'Order in transit (shipment)',
            performed_by: employeeName || session?.user?.email || role,
            reference_number: order.id,
            timestamp: new Date().toISOString(),
          });
          if (mErr) throw mErr;
        }

        const prevCum = l.quantityShipped ?? 0;
        const nextCumulative = prevCum + ship;
        const { error: lineErr } = await supabase
          .from('order_line_items')
          .update({
            quantity_shipped: nextCumulative,
            updated_at: new Date().toISOString(),
          })
          .eq('id', l.id);
        if (lineErr) throw lineErr;
      }

      const { error: ordErr } = await supabase
        .from('orders')
        .update({ status: 'In Transit', updated_at: new Date().toISOString() })
        .eq('id', id);
      if (ordErr) throw ordErr;

      const prev = order.status;
      const shipment_lines = rows
        .filter((r) => r.shippedQuantity > 0)
        .map((r) => {
          const li = order.items.find((i) => i.id === r.itemId);
          const label = li
            ? `${li.productName}${li.variantDescription ? ` (${li.variantDescription})` : ''}`
            : 'Line item';
          return { label, quantity: r.shippedQuantity, unit: 'units' as const };
        });

      await insertOrderLog(
        'shipped',
        `Logistics: ${prev} → In Transit (stock deducted)`,
        { status: prev },
        { status: 'In Transit' },
        { inTransit: rows, shipment_lines },
      );
      setOrder((o) => {
        if (!o) return o;
        return {
          ...o,
          status: 'In Transit',
          items: o.items.map((li) => {
            const ship = byLine.get(li.id) ?? 0;
            const nextC = (li.quantityShipped ?? 0) + ship;
            return { ...li, quantityShipped: nextC };
          }),
        };
      });
      setShowInTransitModal(false);
      addAuditLog('In transit (shipment)', 'Order', `Order ${order.id} marked in transit with stock move`);
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string'
          ? (e as { message: string }).message
          : e instanceof Error
            ? e.message
            : 'Failed to confirm in transit';
      alert(msg);
    } finally {
      setInTransitSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 gap-3 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Loading order...</span>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Not Found</h2>
            <p className="text-gray-500 mb-6">The order you're looking for doesn't exist.</p>
            <Button onClick={() => navigate('/orders')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadgeVariant = (status: OrderStatus): 'success' | 'warning' | 'danger' | 'info' | 'neutral' => {
    if (['Delivered', 'Completed', 'Approved'].includes(status)) return 'success';
    if (['Pending', 'Scheduled', 'Loading', 'Packed', 'Ready'].includes(status)) return 'warning';
    if (['Rejected', 'Cancelled'].includes(status)) return 'danger';
    if (['In Transit', 'Partially Fulfilled'].includes(status)) return 'info';
    return 'neutral';
  };

  const getPaymentBadgeVariant = (status: string): 'success' | 'warning' | 'danger' | 'neutral' => {
    if (status === 'Paid') return 'success';
    if (status === 'Overdue') return 'danger';
    if (['Partially Paid', 'Invoiced'].includes(status)) return 'warning';
    return 'neutral';
  };

  const getUrgencyBadgeVariant = (
    u: OrderUrgency | undefined,
  ): 'destructive' | 'warning' | 'info' | 'neutral' => {
    switch (u ?? 'Medium') {
      case 'Critical':
        return 'destructive';
      case 'High':
        return 'warning';
      case 'Medium':
        return 'info';
      case 'Low':
      default:
        return 'neutral';
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditedOrder({ ...order, items: [...order.items] });
    addAuditLog('Started Edit Order', 'Order', `Started editing order ${order.id}`);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedOrder(null);
  };

  const handleResubmit = () => {
    if (order.status === 'Rejected') {
      alert(`Resubmitting order ${order.id} for approval`);
      addAuditLog('Resubmitted Order', 'Order', `Resubmitted order ${order.id} after revision`);
    }
  };

  const handleFulfillOrder = async (fulfillmentData: FulfillmentData[], proofImageUrls: string[] = []) => {
    if (!order || !id) return;

    if (fulfillmentData.some((f) => !isPersistedOrderLineId(f.itemId))) {
      alert('Some line items are not saved to the server yet. Use Edit order → Save changes, then record delivery again.');
      return;
    }

    const lineCap = (l: OrderLineItem) =>
      l.quantityShipped != null ? l.quantityShipped : l.quantity;
    const newDeliveredFor = (l: OrderLineItem) => {
      const fd = fulfillmentData.find((f) => f.itemId === l.id);
      return (l.quantityDelivered ?? 0) + (fd ? fd.deliveredQuantity : 0);
    };
    // Delivered only when every line matches original ordered qty (not just vs shipped/in-transit cap).
    // Example: 100 ordered, 90 in transit, 90 received → still Partially Fulfilled until 100 delivered.
    const isOrderDeliveryComplete = order.items.every(
      (l) => newDeliveredFor(l) === l.quantity,
    );
    const newStatus: OrderStatus = isOrderDeliveryComplete ? 'Delivered' : 'Partially Fulfilled';
    const now = new Date().toISOString();
    const today = now.slice(0, 10);

    for (const fd of fulfillmentData) {
      const line = order.items.find((i) => i.id === fd.itemId);
      if (!line) continue;
      const acc = (line.quantityDelivered ?? 0) + fd.deliveredQuantity;
      const { error: lineErr } = await supabase
        .from('order_line_items')
        .update({ quantity_delivered: acc, updated_at: new Date().toISOString() })
        .eq('id', fd.itemId);
      if (lineErr) {
        alert('Failed to save line items: ' + lineErr.message);
        return;
      }
    }

    const updatePayload: Record<string, unknown> = { status: newStatus, updated_at: now };
    if (isOrderDeliveryComplete) updatePayload.actual_delivery = today;

    const { error } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      alert('Failed to fulfill order: ' + error.message);
      return;
    }

    const itemSummary = fulfillmentData
      .map((item) => {
        const orderItem = order.items.find((i) => i.id === item.itemId);
        return `${orderItem?.productName}: +${item.deliveredQuantity} (this time)`;
      })
      .join(', ');

    const actorLabel = employeeName || session?.user?.email || role;
    const received_lines = fulfillmentData
      .filter((f) => f.deliveredQuantity > 0)
      .map((fd) => {
        const line = order.items.find((i) => i.id === fd.itemId);
        return {
          label: line?.productName ?? 'Item',
          variant: line?.variantDescription || undefined,
          quantity: fd.deliveredQuantity,
          unit: 'units' as const,
        };
      });

    await insertOrderLog(
      'delivered',
      `Order marked as ${newStatus} by ${actorLabel}.`,
      { status: order.status },
      { status: newStatus },
      { fulfillmentData, received_lines, item_summary: itemSummary },
    );

    addAuditLog('Fulfilled Order', 'Order', `Order ${order.id} marked as ${newStatus}. Items: ${itemSummary}`);

    if (proofImageUrls.length > 0) {
      const uploaderRole: ProofDocument['uploadedByRole'] =
        role === 'Logistics' || role === 'Driver' ? 'Logistics' : 'Agent';
      const t = Date.now();
      const newProofs: ProofDocument[] = proofImageUrls.map((fileUrl, i) => {
        const raw = fileUrl.split('/').pop()?.split('?')[0] ?? 'image';
        let fileName = raw;
        try {
          fileName = decodeURIComponent(raw);
        } catch {
          fileName = raw;
        }
        return {
          id: `proof-${t}-${i}`,
          orderId: order.id,
          type: 'delivery' as const,
          fileName,
          fileUrl,
          fileSize: 0,
          uploadedBy: order.agent,
          uploadedByRole: uploaderRole,
          uploadedAt: new Date().toISOString(),
          status: 'verified' as const,
          notes: 'Recorded with delivery (gallery)',
        };
      });
      setProofs((prev) => [...prev, ...newProofs]);
      const names = newProofs.map((p) => p.fileName).join(', ');
      await insertOrderLog(
        'proof_uploaded',
        `Proof of delivery: ${proofImageUrls.length} image(s) — ${names}`,
        null,
        null,
        { count: proofImageUrls.length, fileNames: names, source: 'image_gallery' },
      );
      addAuditLog(
        'Proof of Delivery',
        'Order',
        `Attached ${proofImageUrls.length} image(s) with delivery for order ${order.id}`,
      );
    }

    setOrder({
      ...order,
      status: newStatus,
      items: order.items.map((l) => {
        const fd = fulfillmentData.find((f) => f.itemId === l.id);
        if (!fd) return l;
        return { ...l, quantityDelivered: (l.quantityDelivered ?? 0) + fd.deliveredQuantity };
      }),
      ...(isOrderDeliveryComplete ? { actualDelivery: now } : {}),
    });
    setShowFulfillModal(false);
  };

  const handleApprove = async () => {
    if (!order || !id) return;
    setApprovalLoading(true);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('orders')
      .update({ status: 'Approved', approved_by: role, approved_date: now, rejected_by: null, rejection_reason: null })
      .eq('id', id);
    if (error) { alert('Failed to approve: ' + error.message); setApprovalLoading(false); return; }
    setOrder({ ...order, status: 'Approved', approvedBy: role, approvedDate: now, rejectedBy: undefined, rejectionReason: undefined });
    await insertOrderLog(
      'approved',
      `Order approved by ${employeeName || session?.user?.email || role}`,
      { status: order.status },
      { status: 'Approved', approved_by: employeeName || session?.user?.email || role },
    );
    addAuditLog('Approved Order', 'Order', `Approved order ${order.id}`);
    setApprovalLoading(false);
    setShowApproveModal(false);
  };

  const handleReject = async () => {
    if (!order || !id) return;
    setApprovalLoading(true);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from('orders')
      .update({ status: 'Rejected', rejected_by: role, rejection_reason: rejectionReason || null, approved_by: null, approved_date: null })
      .eq('id', id);
    if (error) { alert('Failed to reject: ' + error.message); setApprovalLoading(false); return; }
    setOrder({ ...order, status: 'Rejected' as any, rejectedBy: role, rejectionReason: rejectionReason || undefined, approvedBy: undefined, approvedDate: undefined });
    await insertOrderLog(
      'rejected',
      `Order rejected by ${employeeName || session?.user?.email || role}`,
      { status: order.status },
      { status: 'Rejected', rejected_by: employeeName || session?.user?.email || role },
      rejectionReason ? { reason: rejectionReason } : null,
    );
    addAuditLog('Rejected Order', 'Order', `Rejected order ${order.id}${rejectionReason ? ': ' + rejectionReason : ''}`);
    setApprovalLoading(false);
    setShowRejectModal(false);
    setRejectionReason('');
  };

  const handleSave = async () => {
    if (!editedOrder || !id) return;

    // Snapshot old state before save for diffing
    const oldOrder = order!;

    // Recalculate totals from items
    const subtotal = editedOrder.items.reduce((sum, item) => sum + item.lineTotal, 0);
    const discountAmount = editedOrder.discountAmount ?? 0;
    const totalAmount = subtotal - discountAmount;

    // Update the order header
    const { error: orderErr } = await supabase
      .from('orders')
      .update({
        status: editedOrder.status,
        payment_status: editedOrder.paymentStatus,
        subtotal,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        required_date: editedOrder.requiredDate || null,
        estimated_delivery: editedOrder.estimatedDelivery || null,
        scheduled_departure_date: editedOrder.scheduledDepartureDate || null,
        delivery_type: editedOrder.deliveryType,
        payment_terms: editedOrder.paymentTerms,
        payment_method: editedOrder.paymentMethod,
        customer_id: editedOrder.customerId || null,
        customer_name: editedOrder.customer?.trim() ? editedOrder.customer : null,
        urgency: editedOrder.urgency ?? 'Medium',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (orderErr) { alert('Failed to save order: ' + orderErr.message); return; }

    // Delete existing line items and re-insert
    await supabase.from('order_line_items').delete().eq('order_id', id);

    if (editedOrder.items.length > 0) {
      const rows = editedOrder.items.map(item => ({
        order_id: id,
        sku: item.sku,
        variant_id: item.variantId ?? null,
        product_name: item.productName,
        variant_description: item.variantDescription,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        original_price: item.originalPrice ?? item.unitPrice,
        negotiated_price: item.negotiatedPrice ?? item.unitPrice,
        discount_percent: item.discountPercent ?? 0,
        discount_amount: item.discountAmount ?? 0,
        line_total: item.lineTotal,
        stock_hint: item.stockHint ?? 'Available',
        available_stock: item.availableStock ?? null,
        discounts_breakdown: item.discountsBreakdown ?? null,
        quantity_shipped: item.quantityShipped ?? null,
        quantity_delivered: item.quantityDelivered ?? null,
      }));
      const { error: itemsErr } = await supabase.from('order_line_items').insert(rows);
      if (itemsErr) { alert('Order header saved but items failed: ' + itemsErr.message); return; }
    }

    // ── Generate activity logs ──────────────────────────────────────────────

    // 1. Status change
    if (oldOrder.status !== editedOrder.status) {
      await insertOrderLog(
        'status_changed',
        `Status changed from "${oldOrder.status}" to "${editedOrder.status}"`,
        { status: oldOrder.status },
        { status: editedOrder.status },
      );
    }

    // 2. Payment status change
    if (oldOrder.paymentStatus !== editedOrder.paymentStatus) {
      await insertOrderLog(
        'payment_status_changed',
        `Payment status changed from "${oldOrder.paymentStatus}" to "${editedOrder.paymentStatus}"`,
        { paymentStatus: oldOrder.paymentStatus },
        { paymentStatus: editedOrder.paymentStatus },
      );
    }

    // 3. Item-level diffs
    const oldItemMap = new Map<string, OrderLineItem>(oldOrder.items.map(i => [i.id, i]));
    const newItemMap = new Map<string, OrderLineItem>(editedOrder.items.map(i => [i.id, i]));

    // Removed items
    for (const oldItem of oldOrder.items) {
      if (!newItemMap.has(oldItem.id)) {
        await insertOrderLog(
          'item_removed',
          `Removed item: ${oldItem.productName}${oldItem.variantDescription ? ` (${oldItem.variantDescription})` : ''} × ${oldItem.quantity}`,
          { quantity: oldItem.quantity, unitPrice: oldItem.unitPrice },
          null,
          { productName: oldItem.productName, variantDescription: oldItem.variantDescription || undefined },
        );
      }
    }

    // Added items (temp ids start with "item-") or truly new ids
    for (const newItem of editedOrder.items) {
      if (!oldItemMap.has(newItem.id) || newItem.id.startsWith('item-')) {
        await insertOrderLog(
          'item_added',
          `Added item: ${newItem.productName}${newItem.variantDescription ? ` (${newItem.variantDescription})` : ''} × ${newItem.quantity} @ ₱${newItem.unitPrice.toLocaleString()}`,
          null,
          { quantity: newItem.quantity, unitPrice: newItem.unitPrice, lineTotal: newItem.lineTotal },
          { productName: newItem.productName, variantDescription: newItem.variantDescription || undefined },
        );
      }
    }

    // Modified items (same real id, quantity or price changed)
    for (const newItem of editedOrder.items) {
      const oldItem = oldItemMap.get(newItem.id);
      if (!oldItem || newItem.id.startsWith('item-')) continue;

      if (oldItem.quantity !== newItem.quantity) {
        await insertOrderLog(
          'item_quantity_changed',
          `Quantity of ${newItem.productName} changed: ${oldItem.quantity} → ${newItem.quantity}`,
          { quantity: oldItem.quantity },
          { quantity: newItem.quantity },
          { productName: newItem.productName, variantDescription: newItem.variantDescription },
        );
      }

      if (Math.round(oldItem.unitPrice * 100) !== Math.round(newItem.unitPrice * 100)) {
        await insertOrderLog(
          'item_price_changed',
          `Price of ${newItem.productName} changed: ₱${oldItem.unitPrice.toLocaleString()} → ₱${newItem.unitPrice.toLocaleString()}`,
          { unitPrice: oldItem.unitPrice },
          { unitPrice: newItem.unitPrice },
          { productName: newItem.productName, variantDescription: newItem.variantDescription },
        );
      }

      if (
        Math.round((oldItem.discountPercent ?? 0) * 100) !== Math.round((newItem.discountPercent ?? 0) * 100) &&
        (newItem.discountPercent ?? 0) > 0
      ) {
        await insertOrderLog(
          'discount_applied',
          `Discount on ${newItem.productName} changed: ${(oldItem.discountPercent ?? 0).toFixed(2)}% → ${(newItem.discountPercent ?? 0).toFixed(2)}%`,
          { discountPercent: oldItem.discountPercent ?? 0 },
          { discountPercent: newItem.discountPercent ?? 0 },
          { productName: newItem.productName },
        );
      }
    }

    addAuditLog('Updated Order', 'Order', `Updated order ${editedOrder.id}`);
    // Refresh from DB
    setOrder({ ...editedOrder, subtotal, totalAmount });
    setIsEditing(false);
    setEditedOrder(null);
  };

  const handleSubmitForApproval = async () => {
    if (!id || !order) return;
    if (order.status !== 'Draft') return;
    const hasCustomer = (order.customerId && order.customerId.length > 0) || (order.customer && order.customer.trim().length > 0);
    if (!hasCustomer) {
      alert('Choose a customer: click Edit order, select a customer, save, then submit for approval.');
      return;
    }
    if (order.items.length === 0) {
      alert('Add at least one product line, save, then submit for approval (Edit order).');
      return;
    }
    setApprovalLoading(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'Pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
      await insertOrderLog(
        'status_changed',
        'Submitted for approval: Draft → Pending',
        { status: 'Draft' },
        { status: 'Pending' },
      );
      setOrder({ ...order, status: 'Pending' });
      addAuditLog('Order submitted for approval', 'Order', `${order.id}: Draft → Pending`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to submit');
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (!editedOrder) return;
    
    const updatedItems = editedOrder.items.map(item => {
      if (item.id === itemId) {
        const lineTotal = newQuantity * item.unitPrice;
        return { ...item, quantity: newQuantity, lineTotal };
      }
      return item;
    });
    
    setEditedOrder({ ...editedOrder, items: updatedItems });
  };

  const handleRemoveItem = (itemId: string) => {
    if (!editedOrder) return;
    
    const updatedItems = editedOrder.items.filter(item => item.id !== itemId);
    setEditedOrder({ ...editedOrder, items: updatedItems });
  };

  const handleAddProduct = () => {
    // Load categories when opening the modal
    if (categories.length === 0) {
      setCategoriesLoading(true);
      supabase
        .from('product_categories')
        .select('id, name, image_url')
        .or(`branch.eq.${branch},branch.is.null`)
        .eq('is_active', true)
        .order('sort_order')
        .then(({ data }) => {
          setCategories(data ?? []);
          setCategoriesLoading(false);
        });
    }
    setShowProductModal(true);
  };

  const handleSelectCategory = async (cat: DBCategoryDet) => {
    setSelectedCategory(cat);
    setProductsLoading(true);
    setCategoryProducts([]);
    const { data: branchRow } = await supabase.from('branches').select('id').eq('name', branch).single();
    const { data: productsData } = await supabase
      .from('products')
      .select('id, name, image_url, product_variants(id, size, description, unit_price, total_stock, product_bulk_discounts(min_qty, max_qty, discount_percent, is_active))')
      .eq('category_id', cat.id)
      .eq('status', 'Active')
      .order('name');
    if (!productsData) { setProductsLoading(false); return; }
    const allVariantIds = productsData.flatMap((p: any) => p.product_variants?.map((v: any) => v.id) ?? []);
    const stockMap: Record<string, number> = {};
    if (allVariantIds.length > 0 && branchRow) {
      const { data: stockData } = await supabase
        .from('product_variant_stock')
        .select('variant_id, quantity')
        .eq('branch_id', branchRow.id)
        .in('variant_id', allVariantIds);
      (stockData ?? []).forEach((s: any) => { stockMap[s.variant_id] = s.quantity; });
    }
    const mapped: DBProductDet[] = productsData.map((p: any) => ({
      id: p.id,
      name: p.name,
      image_url: p.image_url ?? null,
      variants: (p.product_variants ?? []).map((v: any) => ({
        id: v.id,
        size: v.size,
        description: v.description ?? null,
        unit_price: Number(v.unit_price ?? 0),
        stock: stockMap[v.id] ?? v.total_stock ?? 0,
        bulk_discounts: (v.product_bulk_discounts ?? [])
          .filter((d: any) => d.is_active)
          .map((d: any) => ({ min_qty: d.min_qty, max_qty: d.max_qty, discount_percent: Number(d.discount_percent) })),
      })),
    }));
    setCategoryProducts(mapped);
    setProductCache(prev => {
      const next = { ...prev };
      mapped.forEach(p => { next[p.id] = p; });
      return next;
    });
    setProductsLoading(false);
  };

  const qtyForPreview = () => {
    const t = variantQtyInput.trim();
    if (t === '') return 0;
    const n = parseInt(t, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  const priceForPreview = () => {
    const t = variantPriceInput.trim();
    if (t === '') return 0;
    const n = parseFloat(t);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  const parseStepQty = () => {
    const t = variantQtyInput.trim();
    if (t === '') return 1;
    const n = parseInt(t, 10);
    if (!Number.isFinite(n) || n < 1) return 1;
    return n;
  };

  const discountPctPreview = (raw: string) => {
    const t = raw.trim();
    if (t === '') return 0;
    const n = parseFloat(t);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
  };

  const handleCloseProductModal = () => {
    setShowProductModal(false);
    setSelectedProduct(null);
    setSelectedVariant(null);
    setVariantQtyInput('1');
    setVariantPriceInput('0');
    setVariantDiscounts([]);
    setProductSearch('');
    setSelectedCategory(null);
    setCategoryProducts([]);
    setEditingItemId(null);
  };

  // Open the product detail modal pre-filled from an existing line item (for editing).
  // Identical logic to CreateOrderModal's editOrderItem:
  //   1. Look up product in the cache (pre-populated by the useEffect above)
  //   2. Set state and open the modal — synchronous, no async needed
  // The cache uses product.id as key; we find the right product by matching variant UUID.
  const handleEditItem = (item: OrderLineItem) => {
    if (!isEditing) return;

    // The variant UUID is stored as item.variantId for new orders, or as item.sku for old ones.
    const variantUuid = item.variantId || item.sku;

    // Find the product in the cache.
    // Primary: match by variant UUID (new orders / orders with variant_id)
    // Fallback: match by product name (legacy orders where variant_id and sku were lost)
    let cachedProduct: DBProductDet | null = null;
    let cachedVariant: DBVariantDet | null = null;

    if (variantUuid) {
      cachedProduct = Object.values(productCache).find(p =>
        p.variants.some(v => v.id.toLowerCase() === variantUuid.toLowerCase())
      ) ?? null;
      cachedVariant = cachedProduct?.variants.find(
        v => v.id.toLowerCase() === variantUuid.toLowerCase()
      ) ?? null;
    }

    // Name-based fallback for legacy items with no variant identifier
    if (!cachedProduct && item.productName) {
      cachedProduct = Object.values(productCache).find(
        p => p.name === item.productName
      ) ?? null;
      // Match the right variant by its size label
      if (cachedProduct) {
        cachedVariant = cachedProduct.variants.find(
          v => v.size === item.variantDescription
        ) ?? cachedProduct.variants[0] ?? null;
      }
    }

    // If still no cache hit, open the modal with a synthetic object (editing still works, image is missing)
    const product: DBProductDet = cachedProduct ?? {
      id: item.id,
      name: item.productName,
      image_url: null,
      variants: [{
        id: variantUuid || item.id,
        size: item.variantDescription,
        description: null,
        unit_price: item.originalPrice ?? item.unitPrice,
        stock: item.availableStock ?? 999,
        bulk_discounts: [],
      }],
    };
    const variant: DBVariantDet = cachedVariant ?? product.variants[0];

    // Reconstruct discounts
    const discounts: Array<{ name: string; percentage: string }> = [];
    if (item.discountsBreakdown && item.discountsBreakdown.length > 0) {
      discounts.push(
        ...item.discountsBreakdown.map((d) => ({ name: d.name, percentage: String(d.percentage) })),
      );
    } else {
      const effectivePct = item.discountPercent > 0
        ? item.discountPercent
        : (() => {
            const gross = item.unitPrice * item.quantity;
            return gross > 0 && item.lineTotal < gross ? ((gross - item.lineTotal) / gross) * 100 : 0;
          })();
      if (effectivePct > 0) discounts.push({ name: 'Discount', percentage: String(parseFloat(effectivePct.toFixed(4))) });
    }

    setEditingItemId(item.id);
    setSelectedProduct(product);
    setSelectedVariant(variant);
    setVariantQtyInput(String(item.quantity));
    setVariantPriceInput(String(item.unitPrice));
    setVariantDiscounts(discounts);
    setShowProductModal(true);
  };

  const addDiscount = () => setVariantDiscounts([...variantDiscounts, { name: '', percentage: '' }]);

  const updateDiscount = (index: number, field: 'name' | 'percentage', value: string) => {
    const next = [...variantDiscounts];
    if (!next[index]) return;
    if (field === 'name') next[index] = { ...next[index]!, name: value };
    else {
      if (value === '') next[index] = { ...next[index]!, percentage: '' };
      else if (/^\d*\.?\d*$/.test(value)) next[index] = { ...next[index]!, percentage: value };
    }
    setVariantDiscounts(next);
  };

  const removeDiscount = (index: number) => setVariantDiscounts(variantDiscounts.filter((_, i) => i !== index));

  const calculateFinalPrice = () => {
    let cur = priceForPreview() * qtyForPreview();
    for (const d of variantDiscounts) {
      cur *= 1 - discountPctPreview(d.percentage) / 100;
    }
    return cur;
  };

  const handleAddToOrder = () => {
    if (!editedOrder || !selectedProduct || !selectedVariant) return;

    const rawQty = variantQtyInput.trim();
    if (rawQty === '') {
      alert('Enter a quantity.');
      return;
    }
    const parsedQty = parseInt(rawQty, 10);
    if (!Number.isFinite(parsedQty) || parsedQty < 1) {
      alert('Please enter a valid quantity (minimum 1).');
      return;
    }

    const priceRaw = variantPriceInput.trim();
    if (priceRaw === '') {
      alert('Enter a price per unit.');
      return;
    }
    const variantPrice = parseFloat(priceRaw);
    if (!Number.isFinite(variantPrice) || variantPrice < 0) {
      alert('Enter a valid price per unit.');
      return;
    }

    const parsedDiscounts: Array<{ name: string; percentage: number }> = [];
    for (let i = 0; i < variantDiscounts.length; i++) {
      const d = variantDiscounts[i]!;
      const praw = d.percentage.trim();
      if (praw === '') {
        parsedDiscounts.push({ name: d.name, percentage: 0 });
        continue;
      }
      const pct = parseFloat(praw);
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        alert(
          `Discount "${d.name.trim() || `#${i + 1}`}": enter a valid percentage between 0 and 100, or clear the field.`,
        );
        return;
      }
      parsedDiscounts.push({ name: d.name, percentage: pct });
    }
    const discountsForItem = parsedDiscounts.filter((d) => d.name.trim() !== '' || d.percentage > 0);

    const gross = variantPrice * parsedQty;
    const finalTotal = discountsForItem.reduce((p, d) => p * (1 - d.percentage / 100), gross);
    const totalDiscount = gross > 0 ? ((gross - finalTotal) / gross) * 100 : 0;

    const updatedItem: OrderLineItem = {
      id: editingItemId ?? `item-${Date.now()}`,
      sku: selectedVariant.id.toUpperCase(),
      variantId: selectedVariant.id,
      productName: selectedProduct.name,
      variantDescription: `${selectedVariant.size}${selectedVariant.description ? ' - ' + selectedVariant.description : ''}`,
      quantity: parsedQty,
      unitPrice: variantPrice,
      originalPrice: selectedVariant.unit_price,
      negotiatedPrice: variantPrice,
      discountPercent: totalDiscount,
      discountAmount: gross - finalTotal,
      lineTotal: finalTotal,
      stockHint: selectedVariant.stock >= parsedQty ? 'Available' : selectedVariant.stock > 0 ? 'Partial' : 'Not Available',
      availableStock: selectedVariant.stock,
      discountsBreakdown: discountsForItem.length > 0 ? discountsForItem : undefined,
    };

    if (editingItemId) {
      // Replace the existing item
      setEditedOrder({
        ...editedOrder,
        items: editedOrder.items.map(i => i.id === editingItemId ? updatedItem : i),
      });
    } else {
      setEditedOrder({ ...editedOrder, items: [...editedOrder.items, updatedItem] });
    }
    handleCloseProductModal();
  };

  const filteredProducts = productSearch.trim()
    ? categoryProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
    : categoryProducts;

  // Invoice Generation
  const handleGenerateInvoice = () => {
    if (!order) return;
    const invoiceNumber = `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + (order.paymentTerms === 'COD' ? 0 : parseInt(order.paymentTerms) || 30));
    alert(`Invoice ${invoiceNumber} generated successfully!\n\nInvoice Date: ${today.toLocaleDateString()}\nDue Date: ${dueDate.toLocaleDateString()}\nTotal Amount: ₱${order.totalAmount.toLocaleString()}\n\n(PDF generation would happen here)`);
    setShowInvoiceModal(false);
  };

  const handleDownloadInvoice = () => {
    if (!order || !order.invoiceId) return;
    alert(`Downloading invoice ${order.invoiceId}...\n\n(PDF download would happen here)`);
  };

  const MAX_PROOF_FILE_BYTES = 25 * 1024 * 1024;
  const MAX_PROOF_BATCH = 30;
  /** Browsers pick filters; validation below is the source of truth. */
  const PROOF_UPLOAD_ACCEPT = [
    'image/*',
    'application/pdf',
    '.pdf',
    '.doc',
    '.docx',
    '.xls',
    '.xlsx',
    '.ppt',
    '.pptx',
    '.txt',
    '.csv',
    '.rtf',
    '.odt',
    '.ods',
    '.odp',
  ].join(',');

  const isAllowedProofFile = (file: File): boolean => {
    const m = file.type.toLowerCase();
    if (m.startsWith('image/')) return true;
    const docMimes = new Set([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'text/rtf',
      'application/rtf',
      'application/csv',
      'text/comma-separated-values',
      'application/vnd.oasis.opendocument.text',
      'application/vnd.oasis.opendocument.spreadsheet',
      'application/vnd.oasis.opendocument.presentation',
    ]);
    if (docMimes.has(m)) return true;
    return ORDER_PROOF_UPLOAD_EXT.test(file.name);
  };

  const handleProofFilesSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const list = event.target.files;
    if (!list?.length) return;
    const next: File[] = [];
    for (let i = 0; i < list.length; i++) {
      const file = list.item(i);
      if (!file) continue;
      if (file.size > MAX_PROOF_FILE_BYTES) {
        alert(`${file.name} is larger than 25MB — skipped.`);
        continue;
      }
      if (!isAllowedProofFile(file)) {
        alert(
          `${file.name} is not a supported document type (e.g. PDF, Word, Excel, PowerPoint, text/CSV, OpenDocument, or images) — skipped.`,
        );
        continue;
      }
      next.push(file);
    }
    if (next.length) {
      setSelectedProofLocalFiles((prev) => {
        const merged = [...prev, ...next];
        if (merged.length > MAX_PROOF_BATCH) {
          alert(`You can add at most ${MAX_PROOF_BATCH} files per batch. Extra files were not added.`);
          return merged.slice(0, MAX_PROOF_BATCH);
        }
        return merged;
      });
    }
    event.target.value = '';
  };

  const removeProofGalleryUrl = (url: string) => {
    setSelectedProofGalleryUrls((prev) => prev.filter((u) => u !== url));
  };

  const removeProofLocalFile = (idx: number) => {
    setSelectedProofLocalFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const openProofDocumentModal = () => {
    setSelectedProofGalleryUrls([]);
    setSelectedProofLocalFiles([]);
    setProofNotes('');
    setShowProofModal(true);
  };

  const handleUploadProof = async () => {
    if (!order || !id) return;
    const nGallery = selectedProofGalleryUrls.length;
    const nFiles = selectedProofLocalFiles.length;
    if (nGallery === 0 && nFiles === 0) return;
    if (nGallery + nFiles > MAX_PROOF_BATCH) {
      alert(`You can add at most ${MAX_PROOF_BATCH} files per upload. Remove some attachments first.`);
      return;
    }

    const base = Date.now();
    const notesTrim = proofNotes.trim() || undefined;
    const uploaderRole: ProofDocument['uploadedByRole'] =
      role === 'Logistics' || role === 'Driver' ? 'Logistics' : 'Agent';
    const uploadedBy = employeeName || session?.user?.email || order.agent;

    const newProofs: ProofDocument[] = [];

    selectedProofGalleryUrls.forEach((url, i) => {
      const raw = url.split('/').pop()?.split('?')[0] ?? 'image';
      let fileName = raw;
      try {
        fileName = decodeURIComponent(raw);
      } catch {
        fileName = raw;
      }
      newProofs.push({
        id: `proof-${base}-g-${i}`,
        orderId: order.id,
        type: proofType,
        fileName,
        fileUrl: url,
        fileSize: 0,
        uploadedBy,
        uploadedByRole: uploaderRole,
        uploadedAt: new Date().toISOString(),
        status: 'verified',
        notes: notesTrim,
      });
    });

    selectedProofLocalFiles.forEach((file, i) => {
      newProofs.push({
        id: `proof-${base}-f-${i}`,
        orderId: order.id,
        type: proofType,
        fileName: file.name,
        fileUrl: URL.createObjectURL(file),
        fileSize: file.size,
        uploadedBy,
        uploadedByRole: uploaderRole,
        uploadedAt: new Date().toISOString(),
        status: 'verified',
        notes: notesTrim,
      });
    });

    setProofs((prev) => [...prev, ...newProofs]);
    const names = newProofs.map((p) => p.fileName).join(', ');
    const typeLabel =
      proofType === 'delivery' ? 'Proof of Delivery' : proofType === 'payment' ? 'Proof of Payment' : 'Receipt';
    await insertOrderLog(
      'proof_uploaded',
      `${typeLabel}: ${newProofs.length} file(s) — ${names}`,
      null,
      null,
      { count: newProofs.length, fileNames: names, source: 'order_proof_modal' },
    );
    addAuditLog(typeLabel, 'Order', `Attached ${newProofs.length} file(s) to order ${order.id}`);
    alert(`${typeLabel} added.\n\n${newProofs.length} file(s): ${names}`);

    setSelectedProofGalleryUrls([]);
    setSelectedProofLocalFiles([]);
    setProofNotes('');
    setShowProofModal(false);
  };

  const handleStatusChange = (newStatus: OrderStatus) => {
    if (!editedOrder) return;
    setEditedOrder({ ...editedOrder, status: newStatus });
  };

  const handlePaymentStatusChange = (newPaymentStatus: string) => {
    if (!editedOrder) return;
    setEditedOrder({ ...editedOrder, paymentStatus: newPaymentStatus as any });
  };

  const displayOrder = isEditing && editedOrder ? editedOrder : order;

  // Compute effective discount % for a line item (fall back to amount-based calculation)
  const effectiveDiscountPct = (item: OrderLineItem) => {
    if (item.discountPercent > 0) return item.discountPercent;
    const gross = item.unitPrice * item.quantity;
    if (gross > 0 && item.lineTotal < gross) return ((gross - item.lineTotal) / gross) * 100;
    return 0;
  };

  // All available statuses (workflow: Approved → Scheduled → Loading → … → In Transit → Delivered)
  const allStatuses: OrderStatus[] = [
    'Draft',
    'Pending',
    'Approved',
    'Scheduled',
    'Loading',
    'Packed',
    'Ready',
    'In Transit',
    'Partially Fulfilled',
    'Delivered',
    'Completed',
    'Cancelled',
    'Rejected',
  ];

  const allPaymentStatuses = ['Unbilled', 'Invoiced', 'Partially Paid', 'Paid', 'Overdue'];

  const canUseLogisticsUi = !['Agent', 'Driver', 'Customer'].includes(role ?? '');
  const LOGISTICS_FLOW_STEPS: OrderStatus[] = [
    'Approved',
    'Scheduled',
    'Loading',
    'Packed',
    'Ready',
    'In Transit',
    'Delivered',
  ];
  const showLogisticsBadges = !isEditing && LOGISTICS_FLOW_STEPS.includes(order.status);
  const logisticsReplacesFulfill =
    canUseLogisticsUi &&
    !isEditing &&
    ['Approved', 'Scheduled', 'Loading', 'Packed', 'Ready', 'In Transit'].includes(order.status);
  /** After partial delivery, same next step as Approved: schedule remaining shipment. */
  const showScheduleAction =
    canUseLogisticsUi && !isEditing && (order.status === 'Approved' || order.status === 'Partially Fulfilled');
  const logisticsStepIndex = LOGISTICS_FLOW_STEPS.indexOf(order.status);
  const logisticsStepState = (i: number): 'complete' | 'current' | 'upcoming' => {
    if (order.status === 'Delivered') return 'complete';
    if (i < logisticsStepIndex) return 'complete';
    if (i === logisticsStepIndex) return 'current';
    return 'upcoming';
  };
  const showLegacyFulfillButton =
    !logisticsReplacesFulfill &&
    (['Approved', 'In Transit', 'Processing'].includes(order.status) ||
      (order.status === 'Partially Fulfilled' && !canUseLogisticsUi));

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {showLogisticsBadges && (
        <div className="flex min-w-0 flex-wrap items-center justify-center gap-y-2 gap-x-0.5 sm:justify-start">
          {LOGISTICS_FLOW_STEPS.map((step, i) => {
            const st = logisticsStepState(i);
            return (
              <span key={step} className="inline-flex max-w-full items-center">
                {i > 0 && (
                  <span className="px-0.5 text-gray-300 sm:px-1" aria-hidden>
                    →
                  </span>
                )}
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-left text-[10px] font-medium leading-tight sm:text-xs ${
                    st === 'complete'
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                      : st === 'current'
                        ? 'border-amber-300 bg-amber-50 text-amber-900'
                        : 'border-gray-200 bg-gray-50 text-gray-400'
                  }`}
                >
                  {step}
                </span>
              </span>
            );
          })}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/orders')}
            className="gap-2 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Orders</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">{order.id}</h1>
              <Badge
                variant={getUrgencyBadgeVariant((isEditing && editedOrder ? editedOrder : order).urgency)}
                className="shrink-0 text-xs font-semibold md:text-sm"
              >
                {(isEditing && editedOrder ? editedOrder : order).urgency ?? 'Medium'}
              </Badge>
            </div>
            <p className="text-sm text-gray-500 mt-1">Order Details</p>
          </div>
        </div>
        <div className="flex min-h-[2.75rem] flex-wrap items-center justify-end gap-2 self-center md:gap-3">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSave} className="gap-2">
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </>
          ) : (
            <>
              {order.status === 'Pending' && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowApproveModal(true)}
                    className="inline-flex min-h-[2.5rem] shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 sm:px-5"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(true)}
                    className="inline-flex min-h-[2.5rem] shrink-0 items-center justify-center gap-2 rounded-lg border-2 border-red-600 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 sm:px-5"
                  >
                    <XCircle className="h-4 w-4 shrink-0" />
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={handleEdit}
                    className="inline-flex min-h-[2.5rem] shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50 sm:px-5"
                  >
                    <Edit className="h-4 w-4 shrink-0" />
                    Edit request
                  </button>
                </>
              )}
              {order.status !== 'Pending' && (
                <Button variant="outline" onClick={handleEdit} className="gap-2">
                  <Edit className="w-4 h-4" />
                  Edit Order
                </Button>
              )}
              {order.status === 'Draft' && (
                <Button
                  variant="primary"
                  onClick={() => void handleSubmitForApproval()}
                  disabled={approvalLoading}
                  className="gap-2"
                >
                  {approvalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Submit for approval
                </Button>
              )}
              {showScheduleAction && (
                <Button
                  variant="primary"
                  className="gap-2"
                  onClick={() => {
                    if (!id || !order) return;
                    const q = new URLSearchParams({ tab: 'routes', order: id });
                    if (order.requiredDate) {
                      const rd = String(order.requiredDate).slice(0, 10);
                      if (/^\d{4}-\d{2}-\d{2}$/.test(rd)) q.set('date', rd);
                    }
                    navigate(`/logistics?${q.toString()}`);
                  }}
                >
                  <Route className="h-4 w-4" />
                  Plan route
                </Button>
              )}
              {logisticsReplacesFulfill && order.status === 'Scheduled' && (
                <Button
                  variant="primary"
                  className="gap-2"
                  disabled={logisticsLoading}
                  onClick={() => void advanceLogisticsStatus('Loading')}
                >
                  {logisticsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="w-4 h-4" />}
                  Mark Loading
                </Button>
              )}
              {logisticsReplacesFulfill && order.status === 'Loading' && (
                <Button
                  variant="primary"
                  className="gap-2"
                  disabled={logisticsLoading}
                  onClick={() => void advanceLogisticsStatus('Packed')}
                >
                  {logisticsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="w-4 h-4" />}
                  Mark Packed
                </Button>
              )}
              {logisticsReplacesFulfill && order.status === 'Packed' && (
                <Button
                  variant="primary"
                  className="gap-2"
                  disabled={logisticsLoading}
                  onClick={() => void advanceLogisticsStatus('Ready')}
                >
                  {logisticsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Mark Ready
                </Button>
              )}
              {logisticsReplacesFulfill && order.status === 'Ready' && (
                <Button
                  variant="primary"
                  className="gap-2"
                  disabled={logisticsLoading}
                  onClick={() => setShowInTransitModal(true)}
                >
                  {logisticsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                  Mark in transit
                </Button>
              )}
              {logisticsReplacesFulfill && order.status === 'In Transit' && (
                <Button
                  variant="primary"
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                  disabled={logisticsLoading}
                  onClick={() => setShowFulfillModal(true)}
                >
                  {logisticsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Record delivery
                </Button>
              )}
              {showLegacyFulfillButton && (
                <Button variant="primary" onClick={() => setShowFulfillModal(true)} className="gap-2">
                  <Package className="w-4 h-4" />
                  Fulfill Order
                </Button>
              )}
              {order.status === 'Rejected' && (
                <Button variant="primary" onClick={handleResubmit} className="gap-2">
                  <Send className="w-4 h-4" />
                  Resubmit
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {!isEditing && (order.status === 'Approved' || order.status === 'Rejected') && (
        <div
          className={`flex items-center gap-3 rounded-xl border p-4 ${
            order.status === 'Approved' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
          }`}
        >
          {order.status === 'Approved' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
          ) : (
            <XCircle className="h-5 w-5 shrink-0 text-red-600" />
          )}
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold ${order.status === 'Approved' ? 'text-green-900' : 'text-red-900'}`}>
              Order {order.status}
              {order.status === 'Approved' && order.approvedBy && ` by ${order.approvedBy}`}
              {order.status === 'Rejected' && order.rejectedBy && ` by ${order.rejectedBy}`}
            </p>
            {order.status === 'Rejected' && order.rejectionReason && (
              <p className="mt-0.5 text-xs text-red-700">Reason: {order.rejectionReason}</p>
            )}
          </div>
          <button
            type="button"
            onClick={async () => {
              if (!id) return;
              await supabase
                .from('orders')
                .update({ status: 'Pending', approved_by: null, approved_date: null, rejected_by: null, rejection_reason: null })
                .eq('id', id);
              setOrder({
                ...order,
                status: 'Pending',
                approvedBy: undefined,
                approvedDate: undefined,
                rejectedBy: undefined,
                rejectionReason: undefined,
              });
            }}
            className="shrink-0 text-xs text-gray-500 underline hover:text-gray-700"
          >
            Undo
          </button>
        </div>
      )}

      {/* Edit Mode Banner */}
      {isEditing && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-900">Edit Mode Active</p>
              <p className="text-xs text-amber-700 mt-1">
                You can change order/payment status, modify quantities, add or remove products. Don't forget to save your changes.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Status and Payment Overview */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-2">Order Status</p>
              {isEditing ? (
                <select
                  value={displayOrder.status}
                  onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                >
                  {allStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              ) : (
                <Badge variant={getStatusBadgeVariant(displayOrder.status)} className="text-base px-4 py-2">
                  {displayOrder.status}
                </Badge>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">Urgency</p>
              {isEditing && editedOrder ? (
                <select
                  value={editedOrder.urgency ?? 'Medium'}
                  onChange={(e) =>
                    setEditedOrder({ ...editedOrder, urgency: e.target.value as OrderUrgency })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none bg-white"
                >
                  {ORDER_URGENCY_OPTIONS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              ) : (
                <Badge
                  variant={getUrgencyBadgeVariant(displayOrder.urgency)}
                  className="text-base px-4 py-2"
                >
                  {displayOrder.urgency ?? 'Medium'}
                </Badge>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">Payment Status</p>
              {isEditing ? (
                <select
                  value={displayOrder.paymentStatus}
                  onChange={(e) => handlePaymentStatusChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                >
                  {allPaymentStatuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              ) : (
                <Badge variant={getPaymentBadgeVariant(displayOrder.paymentStatus)} className="text-base px-4 py-2">
                  {displayOrder.paymentStatus}
                </Badge>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">Total Amount</p>
              <p className="text-2xl font-bold text-gray-900">₱{displayOrder.totalAmount.toLocaleString()}</p>
              {displayOrder.discountPercent > 0 && (
                <p className="text-sm text-gray-500">-{displayOrder.discountPercent.toFixed(1)}% discount</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">Balance Due</p>
              <p className="text-2xl font-bold text-gray-900">₱{displayOrder.balanceDue.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Customer
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing && editedOrder ? (
              <div className="space-y-2">
                <label className="text-xs text-gray-500">Customer</label>
                <select
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                  value={editedOrder.customerId || ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    const c = customerList.find((x) => x.id === v);
                    setEditedOrder({ ...editedOrder, customerId: v, customer: c?.name ?? '' });
                  }}
                >
                  <option value="">— Select customer —</option>
                  {customerList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <div className="pt-2">
                  <p className="text-xs text-gray-500">
                    Planned departure is set in{' '}
                    <span className="font-medium text-gray-700">Logistics → Route Planning</span> when this order is assigned
                    to a truck trip.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{order.customer || '—'}</p>
                </div>
                {order.scheduledDepartureDate ? (
                  <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Calendar className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">Planned departure</p>
                        <p className="text-sm font-semibold text-gray-900 tabular-nums">
                          {new Date(`${order.scheduledDepartureDate}T12:00:00`).toLocaleDateString(undefined, {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-gray-500">
                    No planned departure yet — assign this order to a trip in{' '}
                    <span className="font-medium text-gray-700">Logistics → Route Planning</span>
                    {order.status === 'Approved' || order.status === 'Partially Fulfilled' ? (
                      <>
                        {' '}
                        (use <span className="text-gray-600">Plan route</span> above).
                      </>
                    ) : (
                      '.'
                    )}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Order Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Order Date:</span>
                <span className="font-medium text-gray-900">{isEditing && editedOrder ? editedOrder.orderDate : order.orderDate}</span>
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center">
                <span className="text-gray-600">Required Date:</span>
                {isEditing && editedOrder ? (
                  <input
                    type="date"
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-900 w-full sm:w-auto max-w-[12rem]"
                    value={editedOrder.requiredDate ? editedOrder.requiredDate.slice(0, 10) : ''}
                    onChange={(e) => setEditedOrder({ ...editedOrder, requiredDate: e.target.value })}
                  />
                ) : (
                  <span className="font-medium text-gray-900">{order.requiredDate || '—'}</span>
                )}
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center">
                <span className="text-gray-600">Urgency:</span>
                {isEditing && editedOrder ? (
                  <select
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-900 w-full sm:w-auto max-w-[12rem] bg-white"
                    value={editedOrder.urgency ?? 'Medium'}
                    onChange={(e) =>
                      setEditedOrder({ ...editedOrder, urgency: e.target.value as OrderUrgency })
                    }
                  >
                    {ORDER_URGENCY_OPTIONS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="font-medium text-gray-900">{order.urgency ?? 'Medium'}</span>
                )}
              </div>
              {order.actualDelivery && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Actual Delivery:</span>
                  <span className="font-medium text-gray-900">{order.actualDelivery}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Type:</span>
                <span className="font-medium text-gray-900">{order.deliveryType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Terms:</span>
                <span className="font-medium text-gray-900">{order.paymentTerms}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agent Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Agent & Branch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Agent:</span>
                <span className="font-medium text-gray-900">{order.agent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Branch:</span>
                <span className="font-medium text-gray-900">{order.branch}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Items - Full Width */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Order Items</CardTitle>
          {isEditing && (
            <Button variant="outline" size="sm" onClick={handleAddProduct} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Product
            </Button>
          )}
        </CardHeader>
        <CardContent className={isEditing ? 'p-4 space-y-3' : 'p-0'}>

          {/* ── Edit mode: same card style as CreateOrderModal ── */}
          {isEditing && (
            <>
              {displayOrder.items.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">No items added yet</p>
                  <p className="text-sm mt-1">Click "Add Product" to start adding items</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
                      onClick={() => handleEditItem(item)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors">
                            {item.productName}
                          </span>
                          <Badge variant="default" className="text-xs">{item.variantDescription}</Badge>
                          {item.negotiatedPrice && item.originalPrice && item.negotiatedPrice < item.originalPrice && (
                            <Badge variant="danger" className="text-xs">Negotiated</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <div className="text-xs text-gray-500">
                            Base: ₱{(item.originalPrice ?? item.unitPrice).toLocaleString()}/unit
                          </div>
                          {item.negotiatedPrice && item.negotiatedPrice !== (item.originalPrice ?? item.unitPrice) && (
                            <>
                              <div className="text-xs text-gray-400">•</div>
                              <div className="text-xs text-red-600 font-medium">
                                Custom: ₱{item.negotiatedPrice.toLocaleString()}/unit
                              </div>
                            </>
                          )}
                        </div>
                        {item.discountsBreakdown && item.discountsBreakdown.length > 0 && (
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            <span className="text-xs text-gray-500">Discounts:</span>
                            {item.discountsBreakdown.map((d, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {d.name} ({d.percentage}%)
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          Qty: {item.quantity} × ₱{item.quantity > 0
                            ? (item.lineTotal / item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : '0.00'}/unit
                        </div>
                      </div>

                      <div className="w-32 text-right flex-shrink-0">
                        <div className="text-sm text-gray-600 font-medium mb-1">Total</div>
                        {effectiveDiscountPct(item) > 0 && (
                          <div className="text-xs text-gray-400 line-through mb-0.5">
                            ₱{(item.unitPrice * item.quantity).toLocaleString()}
                          </div>
                        )}
                        <div className="font-semibold text-gray-900 text-lg">
                          ₱{item.lineTotal.toLocaleString()}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveItem(item.id); }}
                        className="text-red-600 hover:text-red-700 transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}

                  {/* Savings + Total summary */}
                  {(() => {
                    const totalOriginal = displayOrder.items.reduce((s, i) => s + (i.unitPrice * i.quantity), 0);
                    const totalFinal = displayOrder.items.reduce((s, i) => s + i.lineTotal, 0);
                    const savings = totalOriginal - totalFinal;
                    return (
                      <div className="space-y-2 pt-2">
                        {savings > 0 && (
                          <>
                            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                              <div className="text-sm text-gray-700">Original Total:</div>
                              <div className="text-sm text-gray-500 line-through">₱{totalOriginal.toLocaleString()}</div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">Total Savings:</span>
                                <Badge variant="destructive" className="text-xs">
                                  {Math.round((savings / totalOriginal) * 100)}% OFF
                                </Badge>
                              </div>
                              <div className="text-lg font-bold text-green-600">-₱{savings.toLocaleString()}</div>
                            </div>
                          </>
                        )}
                        <div className="flex items-center justify-between p-4 bg-red-600 text-white rounded-lg">
                          <div className="font-semibold text-lg">Final Amount:</div>
                          <div className="text-3xl font-bold">₱{totalFinal.toLocaleString()}</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          )}

          {/* ── View mode: read-only table ── */}
          {!isEditing && (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-gray-200">
                {displayOrder.items.map((item, index) => (
                  <div key={index} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-900 break-words">{item.productName}</div>
                        <div className="text-xs text-gray-500 mt-1">{item.variantDescription}</div>
                        <div className="text-xs text-gray-600 mt-1">SKU: {item.sku}</div>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {item.negotiatedPrice && item.originalPrice && item.negotiatedPrice < item.originalPrice && (
                            <Badge variant="danger" className="text-xs">Negotiated</Badge>
                          )}
                          <Badge variant={item.stockHint === 'Available' ? 'success' : 'warning'} className="text-xs">
                            {item.stockHint}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-gray-500">Quantity</div>
                        <div className="font-medium text-gray-900">{item.quantity}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Unit Price</div>
                        <div className="font-medium text-gray-900">₱{item.unitPrice}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Discount</div>
                        <div className="font-medium text-gray-900">{effectiveDiscountPct(item) > 0 ? `${effectiveDiscountPct(item).toFixed(1)}%` : '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">Line Total</div>
                        <div className="font-semibold text-gray-900">₱{item.lineTotal.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="p-4 bg-gray-50 border-t-2 border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">Subtotal:</span>
                    <span className="font-bold text-gray-900 text-lg">₱{displayOrder.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium">SKU</th>
                      <th className="px-6 py-3 text-left font-medium">Product</th>
                      <th className="px-6 py-3 text-center font-medium">Qty</th>
                      <th className="px-6 py-3 text-right font-medium">List Price</th>
                      <th className="px-6 py-3 text-right font-medium">Final Price</th>
                      <th className="px-6 py-3 text-center font-medium">Discount</th>
                      <th className="px-6 py-3 text-right font-medium">Total</th>
                      <th className="px-6 py-3 text-center font-medium">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {displayOrder.items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-600">{item.sku}</td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{item.productName}</div>
                          <div className="text-xs text-gray-500">{item.variantDescription}</div>
                          {item.negotiatedPrice && item.originalPrice && item.negotiatedPrice < item.originalPrice && (
                            <Badge variant="danger" className="mt-1">Negotiated</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center font-medium">{item.quantity}</td>
                        <td className="px-6 py-4 text-right">
                          {item.originalPrice && item.negotiatedPrice && item.originalPrice !== item.negotiatedPrice ? (
                            <div>
                              <div className="line-through text-gray-400 text-xs">₱{item.originalPrice}</div>
                              <div className="text-gray-900">₱{item.unitPrice}</div>
                            </div>
                          ) : (
                            <div className="text-gray-900">₱{item.unitPrice}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-gray-900">₱{item.unitPrice}</td>
                        <td className="px-6 py-4 text-center">
                          {effectiveDiscountPct(item) > 0 ? `${effectiveDiscountPct(item).toFixed(1)}%` : '-'}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-gray-900">
                          ₱{item.lineTotal.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant={item.stockHint === 'Available' ? 'success' : 'warning'}>
                            {item.stockHint}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {displayOrder.items.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                          <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p className="font-medium">No items in this order</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-right font-semibold text-gray-700">Subtotal:</td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">₱{displayOrder.totalAmount.toLocaleString()}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

          {/* Approval Information */}
          {order.requiresApproval && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Approval Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Requires Approval:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {order.approvalReason || 'Exceeds standard limits'}
                    </span>
                  </div>
                  {order.approvedBy && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Approved By:</span>
                        <span className="text-sm font-medium text-gray-900">{order.approvedBy}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Approved On:</span>
                        <span className="text-sm font-medium text-gray-900">{order.approvedDate}</span>
                      </div>
                    </>
                  )}
                  {order.rejectedBy && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Rejected By:</span>
                        <span className="text-sm font-medium text-gray-900">{order.rejectedBy}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Rejection Reason:</span>
                        <span className="text-sm font-medium text-red-600">{order.rejectionReason}</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {order.orderNotes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700">{order.orderNotes}</p>
              </CardContent>
            </Card>
          )}

      {/* Payment Information */}
      {(order.invoiceId || order.invoiceDate) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm">
              {order.invoiceId && (
                <div>
                  <p className="text-gray-600 mb-1">Invoice #</p>
                  <p className="font-medium text-gray-900">{order.invoiceId}</p>
                </div>
              )}
              {order.invoiceDate && (
                <div>
                  <p className="text-gray-600 mb-1">Invoice Date</p>
                  <p className="font-medium text-gray-900">{order.invoiceDate}</p>
                </div>
              )}
              {order.dueDate && (
                <div>
                  <p className="text-gray-600 mb-1">Due Date</p>
                  <p className="font-medium text-gray-900">{order.dueDate}</p>
                </div>
              )}
              <div>
                <p className="text-gray-600 mb-1">Amount Paid</p>
                <p className="font-medium text-gray-900">₱{order.amountPaid.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Balance Due</p>
                <p className="font-bold text-gray-900">₱{order.balanceDue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice & Proof Management */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documents & Proofs
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              {/* Show all buttons for illustration */}
              {order.invoiceId ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.open(`/invoice/${order.id}`, '_blank')}
                  className="gap-2 flex-1 sm:flex-none"
                >
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">View Invoice</span>
                  <span className="sm:hidden">Invoice</span>
                </Button>
              ) : (
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={() => window.open(`/invoice/${order.id}`, '_blank')}
                  className="gap-2 flex-1 sm:flex-none"
                >
                  <FileText className="w-4 h-4" />
                  <span className="hidden sm:inline">Generate Invoice</span>
                  <span className="sm:hidden">Invoice</span>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={openProofDocumentModal} className="gap-2 flex-1 sm:flex-none">
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Upload Proof</span>
                <span className="sm:hidden">Upload</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Payment Links Status */}
          {paymentLinks.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Payment Links</h4>
              <div className="space-y-2">
                {paymentLinks.map((link) => (
                  <div key={link.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 flex-shrink-0 bg-blue-100 rounded-lg flex items-center justify-center">
                        <LinkIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">
                          Payment Link - ₱{link.invoiceAmount.toLocaleString()}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {link.status === 'pending' && (
                            <Badge variant="warning" className="text-xs">
                              <Clock className="w-3 h-3 mr-1" />
                              Awaiting Payment
                            </Badge>
                          )}
                          {link.status === 'paid' && (
                            <Badge variant="success" className="text-xs">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Paid
                            </Badge>
                          )}
                          <span className="text-xs text-gray-500">
                            Created {new Date(link.createdAt).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          <span className="text-xs text-gray-500">
                            • Expires {new Date(link.expiresAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {link.status === 'pending' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(link.link);
                            alert('Payment link copied!');
                          }}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(link.link, '_blank')}
                      >
                        <span className="hidden sm:inline">Open Link</span>
                        <span className="sm:hidden">Open</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Proofs List */}
          {proofs.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Uploaded Proofs</h4>
              {proofs.map((proof) => (
                <div key={proof.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center ${
                      proof.type === 'delivery' ? 'bg-blue-100' : proof.type === 'payment' ? 'bg-green-100' : 'bg-purple-100'
                    }`}>
                      {orderProofFileIsImageName(proof.fileName) ? (
                        <Image className={`w-5 h-5 ${
                          proof.type === 'delivery' ? 'text-blue-600' : proof.type === 'payment' ? 'text-green-600' : 'text-purple-600'
                        }`} />
                      ) : (
                        <FileText className={`w-5 h-5 ${
                          proof.type === 'delivery' ? 'text-blue-600' : proof.type === 'payment' ? 'text-green-600' : 'text-purple-600'
                        }`} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{proof.fileName}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className="text-xs flex-shrink-0">
                          {proof.type === 'delivery' ? 'Delivery' : proof.type === 'payment' ? 'Payment' : 'Receipt'}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(proof.uploadedAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      {proof.notes && (
                        <p className="text-xs text-gray-600 mt-2 pr-1 whitespace-pre-wrap border-t border-gray-200/80 pt-2">
                          {proof.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 justify-end sm:justify-start flex-shrink-0">
                    <Button variant="outline" size="sm" onClick={() => window.open(proof.fileUrl, '_blank')}>
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">No proofs uploaded yet</p>
          )}
        </CardContent>
      </Card>

      {/* Order Activity Log — IBR-style timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Activity log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {orderLogs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No activity recorded yet. Edits, approvals, logistics steps, delivery, proofs, and payments will appear
                here.
              </p>
            ) : (
              orderLogs.map((log, index) => {
                const isLast = index === orderLogs.length - 1;

                const getActionIcon = () => {
                  switch (log.action) {
                    case 'created':
                      return <Plus className="w-4 h-4" />;
                    case 'approved':
                      return <ThumbsUp className="w-4 h-4" />;
                    case 'rejected':
                    case 'cancelled':
                    case 'proof_rejected':
                      return <XCircle className="w-4 h-4" />;
                    case 'shipped':
                      return <Truck className="w-4 h-4" />;
                    case 'delivered':
                      return <PackageCheck className="w-4 h-4" />;
                    case 'proof_uploaded':
                      return <Upload className="w-4 h-4" />;
                    case 'proof_verified':
                      return <CheckCircle2 className="w-4 h-4" />;
                    case 'status_changed':
                      return <Truck className="w-4 h-4" />;
                    case 'payment_received':
                    case 'payment_status_changed':
                      return <CreditCard className="w-4 h-4" />;
                    case 'item_added':
                      return <Plus className="w-4 h-4" />;
                    case 'item_removed':
                      return <Minus className="w-4 h-4" />;
                    default:
                      return <Clock className="w-4 h-4" />;
                  }
                };

                const getActionColor = () => {
                  switch (log.action) {
                    case 'approved':
                    case 'proof_verified':
                      return 'text-green-600 bg-green-50';
                    case 'delivered':
                      return 'text-emerald-600 bg-emerald-50';
                    case 'rejected':
                    case 'cancelled':
                    case 'proof_rejected':
                      return 'text-red-600 bg-red-50';
                    case 'proof_uploaded':
                      return 'text-blue-600 bg-blue-50';
                    case 'shipped':
                      return 'text-amber-600 bg-amber-50';
                    case 'created':
                      return 'text-sky-600 bg-sky-50';
                    case 'payment_received':
                    case 'payment_status_changed':
                    case 'invoice_generated':
                      return 'text-purple-600 bg-purple-50';
                    default:
                      return 'text-gray-600 bg-gray-50';
                  }
                };

                const getRoleBadgeColor = () => {
                  switch (log.performedByRole) {
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
                    case 'Executive':
                      return 'bg-red-100 text-red-800';
                    case 'System':
                      return 'bg-gray-100 text-gray-800';
                    default:
                      return 'bg-gray-100 text-gray-800';
                  }
                };

                const timeStr = new Date(log.timestamp).toLocaleString('en-PH', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                });

                const roleLabel =
                  log.performedByRole === 'Admin' ? 'Executive' : log.performedByRole;

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
                        <p className="text-sm font-medium text-gray-900 flex-1">{orderLogCardHeadline(log)}</p>
                        {log.performedByRole && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${getRoleBadgeColor()}`}
                          >
                            {roleLabel}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 mb-1">
                        <User className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-medium text-gray-700">{log.performedBy}</span>
                        <span>· {timeStr}</span>
                      </div>
                      <OrderActivityLogHumanDetails log={log} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Product Selector Modal — same e-commerce style as CreateOrderModal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-0 lg:p-4">
          <div className="bg-white w-full h-full max-h-screen overflow-hidden flex flex-col lg:rounded-lg lg:h-auto lg:max-w-5xl lg:max-h-[90vh]">
            {/* Header */}
            <div className="px-4 md:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-6 h-6 text-red-600" />
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">Add Products to Order</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Browse categories and select a product</p>
                </div>
              </div>
              <button onClick={handleCloseProductModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products by name..."
                  value={productSearch}
                  onChange={(e) => { setProductSearch(e.target.value); if (e.target.value.trim()) setSelectedCategory(null); }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              {/* Category / Product Browser */}
              {productSearch.trim() === '' && !selectedCategory ? (
                <div>
                  <p className="text-xs text-gray-500 mb-2">Select a category</p>
                  {categoriesLoading ? (
                    <div className="flex items-center justify-center h-32 text-gray-400 text-sm gap-2"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-80 overflow-y-auto p-1">
                      {categories.map(cat => (
                        <button key={cat.id} type="button" onClick={() => handleSelectCategory(cat)}
                          className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all group">
                          {cat.image_url
                            ? <img src={cat.image_url} alt={cat.name} className="w-12 h-12 object-cover rounded-lg mb-2" />
                            : <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-2 group-hover:bg-red-100"><Package className="w-6 h-6 text-gray-600 group-hover:text-red-600" /></div>
                          }
                          <div className="text-xs font-semibold text-gray-900 text-center">{cat.name}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : selectedCategory && productSearch.trim() === '' ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <button type="button" onClick={() => { setSelectedCategory(null); setCategoryProducts([]); }}
                      className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-medium">
                      ← All Categories
                    </button>
                    <span className="text-xs text-gray-400">/</span>
                    <span className="text-xs font-semibold text-gray-700">{selectedCategory.name}</span>
                  </div>
                  {productsLoading ? (
                    <div className="flex items-center justify-center h-32 text-gray-400 text-sm gap-2"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto p-1">
                      {categoryProducts.map(product => (
                        <button key={product.id} type="button"
                          onClick={() => { if (!product.variants.length) return; setSelectedProduct(product); setSelectedVariant(product.variants[0]); setVariantQtyInput('1'); setVariantPriceInput(String(product.variants[0].unit_price)); setVariantDiscounts([]); }}
                          className="flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all group">
                          {product.image_url
                            ? <img src={product.image_url} alt={product.name} className="w-12 h-12 object-cover rounded-lg mb-2" />
                            : <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-2 group-hover:bg-red-100"><Package className="w-6 h-6 text-gray-600 group-hover:text-red-600" /></div>
                          }
                          <div className="text-xs font-medium text-gray-900 text-center line-clamp-2">{product.name}</div>
                          <div className="text-xs text-gray-400 mt-1">{product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-80 overflow-y-auto p-1">
                  {filteredProducts.length === 0
                    ? <div className="col-span-full flex items-center justify-center h-24 text-gray-400 text-sm">No matching products</div>
                    : filteredProducts.map(product => (
                      <button key={product.id} type="button"
                        onClick={() => { setSelectedProduct(product); setSelectedVariant(product.variants[0]); setVariantQtyInput('1'); setVariantPriceInput(String(product.variants[0].unit_price)); setVariantDiscounts([]); }}
                        className="flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all group">
                        {product.image_url
                          ? <img src={product.image_url} alt={product.name} className="w-12 h-12 object-cover rounded-lg mb-2" />
                          : <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-2"><Package className="w-6 h-6 text-gray-600" /></div>
                        }
                        <div className="text-xs font-medium text-gray-900 text-center line-clamp-2">{product.name}</div>
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div className="px-4 md:px-6 py-4 border-t border-gray-200 flex justify-end">
              <Button variant="outline" onClick={handleCloseProductModal}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Modal — e-commerce style, overlays the product browser */}
      {showProductModal && selectedProduct && selectedVariant && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-0 lg:p-4">
          <div className="bg-white rounded-none lg:rounded-lg shadow-2xl w-full h-full lg:h-auto lg:max-w-4xl lg:max-h-[85vh] overflow-hidden flex flex-col">
            <button onClick={() => { setSelectedProduct(null); setSelectedVariant(null); setVariantQtyInput('1'); setVariantPriceInput('0'); setVariantDiscounts([]); }}
              className="absolute top-4 right-4 z-20 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-600" />
            </button>

            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 p-4 md:p-8">
                {/* Left: Image + Price input */}
                <div className="space-y-4">
                  <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center border-2 border-gray-200 overflow-hidden">
                    {selectedProduct.image_url
                      ? <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-cover" />
                      : <Package className="w-32 h-32 text-gray-300" />
                    }
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-2">Price per unit</div>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-lg font-bold text-gray-900 flex-shrink-0">₱</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        value={variantPriceInput}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === '') {
                            setVariantPriceInput('');
                            return;
                          }
                          if (/^\d*\.?\d*$/.test(v)) setVariantPriceInput(v);
                        }}
                        onBlur={() => {
                          setVariantPriceInput((prev) => {
                            const t = prev.trim();
                            if (t === '') return '';
                            if (t.endsWith('.')) return t.slice(0, -1) || '';
                            return prev;
                          });
                        }}
                        onWheel={(e) => e.preventDefault()}
                        className="min-w-0 w-full text-xl font-bold text-gray-900 bg-white px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Base price: ₱{selectedVariant.unit_price.toLocaleString()}</p>
                  </div>
                </div>

                {/* Right: Details */}
                <div className="space-y-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">{selectedProduct.name}</h2>
                    <p className="text-gray-600">{selectedVariant.description}</p>
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Available Stock: </span>
                    <span className={`font-bold ${selectedVariant.stock > 50 ? 'text-green-600' : selectedVariant.stock > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {selectedVariant.stock} Units
                    </span>
                  </div>

                  {/* Variant selector */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Select Size</label>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedProduct.variants.map(v => (
                        <button key={v.id} type="button"
                          onClick={() => { setSelectedVariant(v); setVariantQtyInput('1'); setVariantPriceInput(String(v.unit_price)); }}
                          className={`px-4 py-3 border-2 rounded-lg font-medium transition-all text-left ${v.id === selectedVariant.id ? 'border-red-600 bg-red-50 text-red-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}>
                          <div className="font-semibold">{v.size}</div>
                          <div className="text-sm font-bold mt-1">₱{v.unit_price.toLocaleString()}</div>
                          <div className="text-xs text-gray-500 mt-1">Stock: {v.stock}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Quantity Request</label>
                    <div className="flex items-center gap-2 sm:gap-4">
                      <button
                        type="button"
                        onClick={() => setVariantQtyInput(String(Math.max(1, parseStepQty() - 1)))}
                        className="w-12 h-12 flex shrink-0 items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <div className="relative min-w-0 flex-1 max-w-[9rem]">
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="off"
                          value={variantQtyInput}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === '') {
                              setVariantQtyInput('');
                              return;
                            }
                            if (/^\d+$/.test(v)) setVariantQtyInput(v);
                          }}
                          onWheel={(e) => e.preventDefault()}
                          placeholder="1"
                          className="w-full text-center text-2xl font-bold pl-3 pr-10 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        {variantQtyInput !== '' && (
                          <button
                            type="button"
                            onClick={() => setVariantQtyInput('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            aria-label="Clear quantity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setVariantQtyInput(String(Math.min(selectedVariant.stock, parseStepQty() + 1)))
                        }
                        className="w-12 h-12 flex shrink-0 items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    {variantQtyInput.trim() !== '' &&
                      (parseInt(variantQtyInput, 10) || 0) > selectedVariant.stock && (
                        <p className="text-sm text-red-600 mt-2">⚠️ Quantity exceeds available stock</p>
                      )}
                  </div>

                  {/* Discounts */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-semibold text-gray-900">Discounts</label>
                      <button type="button" onClick={addDiscount}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-600 rounded-lg hover:bg-red-50">
                        <Plus className="w-4 h-4" />Add Discount
                      </button>
                    </div>
                    {variantDiscounts.length > 0 ? (
                      <div className="space-y-2">
                        {variantDiscounts.map((d, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input type="text" placeholder="Discount name" value={d.name}
                              onChange={(e) => updateDiscount(i, 'name', e.target.value)}
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
                            <input
                              type="text"
                              inputMode="decimal"
                              autoComplete="off"
                              placeholder="0"
                              value={d.percentage}
                              onChange={(e) => updateDiscount(i, 'percentage', e.target.value)}
                              onWheel={(e) => e.preventDefault()}
                              className="w-20 px-3 py-2 text-sm text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                            <span className="text-sm text-gray-600">%</span>
                            <button type="button" onClick={() => removeDiscount(i)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No discounts applied</p>
                    )}
                  </div>

                  {/* Subtotal */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-900">Subtotal</span>
                      <span className="text-lg font-bold text-blue-900">
                        ₱{(priceForPreview() * qtyForPreview()).toLocaleString()}
                      </span>
                    </div>
                    {variantDiscounts.length > 0 && (() => {
                      let cur = priceForPreview() * qtyForPreview();
                      return (
                        <>
                          {variantDiscounts.map((d, i) => {
                            const pct = discountPctPreview(d.percentage);
                            const amt = cur * (pct / 100);
                            cur -= amt;
                            return (
                              <div key={i} className="flex items-center justify-between text-sm">
                                <span className="text-green-700">
                                  {d.name || `Discount ${i + 1}`} ({pct}%)
                                </span>
                                <span className="text-green-700 font-semibold">-₱{amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              </div>
                            );
                          })}
                          <div className="pt-2 border-t border-blue-300 flex items-center justify-between">
                            <span className="text-sm font-bold text-blue-900">Final Cost</span>
                            <span className="text-2xl font-bold text-blue-900">₱{calculateFinalPrice().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <button type="button" onClick={handleAddToOrder}
                    className="w-full py-4 bg-red-600 text-white text-lg font-semibold rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    {editingItemId ? 'Update Item' : 'Add to Order'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Approve Confirmation Modal ─────────────────────────────── */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => !approvalLoading && setShowApproveModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Approve Order</h2>
                <p className="text-sm text-gray-500">Order {order.id}</p>
              </div>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-gray-700">
                Are you sure you want to <span className="font-semibold text-green-700">approve</span> this order?
                The status will be updated to <span className="font-semibold">Approved</span> and the agent will be notified.
              </p>
              {order.requiresApproval && order.approvalReason && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  <span className="font-medium">Approval reason: </span>{order.approvalReason}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowApproveModal(false)}
                disabled={approvalLoading}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={approvalLoading}
                className="px-5 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {approvalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirm Approval
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Confirmation Modal ──────────────────────────────── */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => { if (!approvalLoading) { setShowRejectModal(false); setRejectionReason(''); } }}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Reject Order</h2>
                <p className="text-sm text-gray-500">Order {order.id}</p>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-700">
                Are you sure you want to <span className="font-semibold text-red-700">reject</span> this order?
                The agent will be notified and the order will be marked as <span className="font-semibold">Rejected</span>.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Reason for rejection <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Pricing outside approved range, customer credit issue…"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => { setShowRejectModal(false); setRejectionReason(''); }}
                disabled={approvalLoading}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={approvalLoading}
                className="px-5 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {approvalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Generation Modal */}
      {showInvoiceModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="w-6 h-6 text-red-600" />
                Generate Invoice
              </h2>
              <button onClick={() => setShowInvoiceModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-900 font-medium">Order Summary</p>
                  <div className="mt-2 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Order ID:</span>
                      <span className="font-medium text-blue-900">{order?.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Customer:</span>
                      <span className="font-medium text-blue-900">{order?.customer}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Total Amount:</span>
                      <span className="font-bold text-blue-900">₱{order?.totalAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Payment Terms:</span>
                      <span className="font-medium text-blue-900">{order?.paymentTerms}</span>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600">
                  This will generate an invoice PDF for this order. The invoice will include all order details, line items, and payment information.
                </p>
              </div>
              
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowInvoiceModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleGenerateInvoice} className="flex-1 gap-2">
                  <FileText className="w-4 h-4" />
                  Generate Invoice
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Proof Upload Modal — image gallery (optimizer) + optional PDF */}
      {showProofModal && id && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Upload className="w-6 h-6 text-red-600" />
                Upload Proof Document
              </h2>
              <button
                onClick={() => {
                  setShowProofModal(false);
                  setShowProofImageGallery(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
                  <div className="grid grid-cols-3 gap-2 md:gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setProofType('delivery');
                        setSelectedProofGalleryUrls([]);
                        setSelectedProofLocalFiles([]);
                      }}
                      className={`p-2 md:p-3 border-2 rounded-lg text-center transition-colors ${
                        proofType === 'delivery'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Truck className="w-4 h-4 md:w-5 md:h-5 mx-auto mb-1" />
                      <span className="text-xs font-medium">Delivery</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProofType('payment');
                        setSelectedProofGalleryUrls([]);
                        setSelectedProofLocalFiles([]);
                      }}
                      className={`p-2 md:p-3 border-2 rounded-lg text-center transition-colors ${
                        proofType === 'payment'
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 md:w-5 md:h-5 mx-auto mb-1" />
                      <span className="text-xs font-medium">Payment</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProofType('receipt');
                        setSelectedProofGalleryUrls([]);
                        setSelectedProofLocalFiles([]);
                      }}
                      className={`p-2 md:p-3 border-2 rounded-lg text-center transition-colors ${
                        proofType === 'receipt'
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <FileText className="w-4 h-4 md:w-5 md:h-5 mx-auto mb-1" />
                      <span className="text-xs font-medium">Receipt</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Images (gallery)</label>
                  <p className="text-xs text-gray-500 mb-2">
                    Select one or many from the gallery (compressed uploads to storage). You can open the gallery again to
                    extend the selection (up to {MAX_PROOF_BATCH} files total with uploads below).
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowProofImageGallery(true)}
                    className="w-full rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/80 px-4 py-4 text-sm text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                  >
                    <span className="font-medium">
                      {selectedProofGalleryUrls.length > 0
                        ? `${selectedProofGalleryUrls.length} image(s) from gallery — click to change`
                        : 'Select from image gallery'}
                    </span>
                    <span className="mt-1 block text-xs text-gray-500">
                      Or upload new images inside the gallery
                    </span>
                  </button>
                  {selectedProofGalleryUrls.length > 0 && (
                    <ul className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                      {selectedProofGalleryUrls.map((url) => {
                        const raw = url.split('/').pop()?.split('?')[0] ?? 'image';
                        let label = raw;
                        try {
                          label = decodeURIComponent(raw);
                        } catch {
                          label = raw;
                        }
                        return (
                          <li
                            key={url}
                            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2 text-left"
                          >
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-gray-100">
                              <img src={url} alt="" className="h-full w-full object-cover" />
                            </div>
                            <p className="min-w-0 flex-1 truncate text-xs text-gray-800" title={label}>
                              {label}
                            </p>
                            <button
                              type="button"
                              onClick={() => removeProofGalleryUrl(url)}
                              className="shrink-0 text-xs text-red-600 hover:underline"
                            >
                              Remove
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Upload documents (optional)</label>
                  <p className="text-xs text-gray-500 mb-2">
                    PDF, Word, Excel, PowerPoint, plain text, CSV, RTF, OpenDocument (odt/ods/odp), and images. Max 25MB per
                    file. Hold Ctrl/Cmd to choose multiple.
                  </p>
                  <input
                    type="file"
                    multiple
                    accept={PROOF_UPLOAD_ACCEPT}
                    onChange={handleProofFilesSelect}
                    className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5"
                    id="proof-files-input"
                  />
                  {selectedProofLocalFiles.length > 0 && (
                    <ul className="mt-2 space-y-1.5 max-h-36 overflow-y-auto">
                      {selectedProofLocalFiles.map((file, idx) => (
                        <li
                          key={`${file.name}-${file.size}-${idx}`}
                          className="flex items-center justify-between gap-2 rounded-md border border-gray-100 bg-gray-50 px-2 py-1.5 text-xs"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            {file.type.startsWith('image/') || orderProofFileIsImageName(file.name) ? (
                              <Image className="h-4 w-4 shrink-0 text-indigo-600" />
                            ) : (
                              <FileText className="h-4 w-4 shrink-0 text-gray-700" />
                            )}
                            <span className="truncate font-medium text-gray-800" title={file.name}>
                              {file.name}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => removeProofLocalFile(idx)}
                            className="shrink-0 text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
                  <textarea
                    value={proofNotes}
                    onChange={(e) => setProofNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                    placeholder="Add any additional information..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowProofModal(false);
                    setShowProofImageGallery(false);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => void handleUploadProof()}
                  disabled={
                    selectedProofGalleryUrls.length === 0 && selectedProofLocalFiles.length === 0
                  }
                  className="flex-1 gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Add{' '}
                  {selectedProofGalleryUrls.length + selectedProofLocalFiles.length > 1
                    ? `${selectedProofGalleryUrls.length + selectedProofLocalFiles.length} proofs`
                    : 'proof'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showProofImageGallery && id && (
        <ImageGalleryModal
          isOpen={showProofImageGallery}
          onClose={() => setShowProofImageGallery(false)}
          folder={`${ORDER_PROOF_GALLERY_FOLDER}/${id}/${proofType}`}
          maxImages={MAX_PROOF_BATCH}
          currentImages={selectedProofGalleryUrls}
          onSelectImages={(urls) => {
            const room = MAX_PROOF_BATCH - selectedProofLocalFiles.length;
            const capped = urls.slice(0, Math.max(0, room));
            if (capped.length < urls.length) {
              alert(
                `Only ${room} more attachment(s) allowed in this batch (max ${MAX_PROOF_BATCH} including uploads).`,
              );
            }
            setSelectedProofGalleryUrls(capped);
            setShowProofImageGallery(false);
          }}
        />
      )}

      {/* Payment Link Modal */}
      {showPaymentLinkModal && order.invoiceId && (
        <PaymentLinkModal
          invoice={{
            id: order.invoiceId,
            invoiceNumber: order.invoiceId,
            orderId: order.id,
            issueDate: order.invoiceDate || order.createdAt,
            dueDate: order.dueDate,
            billTo: {
              name: order.customer,
              address: '123 Business Street, Manila',
              contactPerson: 'Contact Person',
              phone: '(02) 123-4567',
              email: `${order.customer.toLowerCase().replace(/\s/g, '')}@example.com`,
            },
            items: order.items,
            subtotal: order.subtotal,
            discountAmount: order.discountAmount,
            taxAmount: 0,
            totalAmount: order.totalAmount,
            amountPaid: order.amountPaid,
            balanceDue: order.balanceDue,
            paymentTerms: order.paymentTerms,
            paymentMethod: order.paymentMethod,
            paymentStatus: order.paymentStatus,
            notes: order.orderNotes,
            generatedBy: order.agent,
            generatedAt: order.invoiceDate || order.createdAt,
          }}
          onClose={() => setShowPaymentLinkModal(false)}
          onGenerate={(paymentLink) => {
            setPaymentLinks([...paymentLinks, paymentLink]);
            alert(`✅ Payment link generated!\n\nLink: ${paymentLink.link}\n\nCustomers can now pay online with various methods.`);
          }}
        />
      )}

      {/* Fulfill Order Modal */}
      {showFulfillModal && (
        <FulfillOrderModal
          isOpen={showFulfillModal}
          onClose={() => setShowFulfillModal(false)}
          orderId={id ?? ''}
          orderNumber={order.id}
          items={order.items.filter((i) => fulfillmentRemaining(i) > 0)}
          onFulfill={handleFulfillOrder}
        />
      )}

      {showInTransitModal && order && (
        <MarkInTransitModal
          isOpen={showInTransitModal}
          onClose={() => !inTransitSubmitting && setShowInTransitModal(false)}
          orderNumber={order.id}
          items={order.items}
          submitting={inTransitSubmitting}
          onConfirm={handleConfirmInTransit}
        />
      )}
    </div>
  );
}
