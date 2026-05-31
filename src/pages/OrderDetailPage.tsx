import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { supabase } from '@/src/lib/supabase';
import {
  buildOrderCancelledNotifyPayload,
  buildOrderCustomerApprovedNotifyPayload,
  buildOrderDecisionNotifyPayload,
  buildOrderLogisticsReadyNotifyPayload,
  buildOrderNotifyPayload,
  buildOrderRevisedNotifyPayload,
  notifyAgentOrderApproved,
  notifyAgentOrderRejected,
  notifyCustomerOrderApproved,
  notifyExecutivesOrderRevised,
  notifyExecutivesOrderSubmittedForApproval,
  notifyLogisticsOrderReadyForSchedule,
  notifyLogisticsOrderLoading,
  notifyOrderPacked,
  notifyOrderInTransit,
  notifyOrderDeliveryRecorded,
  notifyOrderCancelled,
  attachOrderDeliveryProofsAndNotify,
  notifyAgentOrderProofUploaded,
  notifyOrderPaymentProofRecorded,
} from '@/src/lib/notifications/notificationsData';
import { deductVariantBranchStock } from '@/src/lib/productVariantStock';
import { useAppContext } from '@/src/store/AppContext';
import { orderCatalogBranch } from '@/src/lib/inventoryAccess';
import { branchHasShippingContainers } from '@/src/lib/fleetContainers';
import {
  releaseOrderFromActiveTrips,
  shouldReleaseOrderFromTrips,
  tryCompleteTripsForDeliveredOrder,
} from '@/src/lib/logisticsScheduling';
import { OrderDetail, OrderStatus, OrderLineItem, OrderLog, ProofDocument, OrderUrgency, DeliveryType, PaymentTerms } from '@/src/types/orders';
import { PaymentLink } from '@/src/types/payments';
import { PaymentLinkModal } from '@/src/components/payments/PaymentLinkModal';
import { OrderCustomerPortalCard } from '@/src/components/orders/OrderCustomerPortalCard';
import {
  FulfillOrderModal,
  FulfillmentData,
  DeliveryProofDetails,
  fulfillmentRemaining,
} from '@/src/components/orders/FulfillOrderModal';
import { MarkInTransitModal } from '@/src/components/orders/MarkInTransitModal';
import { CancelOrderModal, CancellationData } from '@/src/components/orders/CancelOrderModal';
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
  Check,
  CheckCircle2,
  XCircle,
  Link as LinkIcon,
  Copy,
  Loader2,
  ThumbsUp,
  PackageCheck,
  Receipt,
  Route,
  Wallet,
} from 'lucide-react';
import { proofRequiresCommissionPayout } from '@/src/lib/orderCommissionCompletion';
import {
  markProofCommissionPaid,
  markAllProofCommissionsPaidForOrder,
} from '@/src/lib/financeMutations';
import { computeProofCommissionForClientType } from '@/src/lib/financeData';
import {
  ORDER_PROOF_GALLERY_FOLDER,
  proofRowToDocument,
  fetchPaymentProofAggregates,
  computeOrderAmountPaidAfterProofIncrement,
  deriveOrderPaymentFields,
  roundMoney,
  syncOrderPaymentsFromProofs,
  insertOrderProofDocuments,
  updateOrderProofDocument,
  encodeOrderProofPaymentNotes,
  isSchemaColumnError,
  uploadOrderProofBinary,
  tryExtractStoragePathFromPublicUrl,
} from '@/src/lib/orderProofPayments';
import { orderStatusBadgeVariant, paymentStatusBadgeVariant } from '@/src/lib/orderStatusBadges';
import { useOrderPermissions } from '@/src/lib/permissions/orderPermissions';
import { ModuleAccessDenied } from '@/src/components/permissions/ModuleAccessDenied';
import { deriveOrderDueDateForPersistence, parseProofNotes } from '@/src/lib/financeData';
import { cumulativeShippedForLine, remainingToShipForLine } from '@/src/lib/orderShipmentQuantities';
import { ACTIVITY_LOG_PAGE_SIZE, TablePagination } from '@/src/components/ui/TablePagination';

/** Local proof uploads: images + common business documents (allowlist). */
const ORDER_PROOF_UPLOAD_EXT =
  /\.(pdf|jpe?g|png|webp|gif|avif|bmp|jfif|doc|docx|xls|xlsx|ppt|pptx|txt|csv|rtf|odt|ods|odp)$/i;

const ORDER_URGENCY_OPTIONS: OrderUrgency[] = ['Low', 'Medium', 'High', 'Critical'];
const ORDER_DELIVERY_TYPE_OPTIONS: DeliveryType[] = ['Truck', 'Ship'];
const ORDER_PAYMENT_TERMS_OPTIONS: PaymentTerms[] = [
  'COD',
  '15 Days',
  '30 Days',
  '45 Days',
  '60 Days',
  '90 Days',
  'Custom',
];

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
  const { branch, addAuditLog, role, session, employeeName, employeeId, isExecutiveUser, setHideBranchSelector, setBranch } = useAppContext();
  const perms = useOrderPermissions();
  const [activityLogPage, setActivityLogPage] = useState(1);
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
  const [productsLoadError, setProductsLoadError] = useState<string | null>(null);
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
  const [proofType, setProofType] = useState<'delivery' | 'payment' | 'other'>('delivery');
  const [documentsProofTab, setDocumentsProofTab] = useState<'delivery' | 'payment' | 'other'>('delivery');
  /** Public URLs from Image Gallery (compressed upload); multi-select in gallery. */
  const [selectedProofGalleryUrls, setSelectedProofGalleryUrls] = useState<string[]>([]);
  /** Local PDFs and/or images (multi-select). */
  const [selectedProofLocalFiles, setSelectedProofLocalFiles] = useState<File[]>([]);
  const [proofNotes, setProofNotes] = useState('');
  const [proofDocTitle, setProofDocTitle] = useState('');
  const [proofMoneyPayment, setProofMoneyPayment] = useState('');
  const [proofPaymentCredit, setProofPaymentCredit] = useState('');
  const [customerCreditSummary, setCustomerCreditSummary] = useState<{
    creditLimit: number;
    outstandingBalance: number;
    availableCredit: number;
  } | null>(null);
  const [customerCreditLoading, setCustomerCreditLoading] = useState(false);
  const [proofs, setProofs] = useState<ProofDocument[]>([]);
  const [proofUploadBusy, setProofUploadBusy] = useState(false);
  const [showProofEditModal, setShowProofEditModal] = useState(false);
  const [editingProof, setEditingProof] = useState<ProofDocument | null>(null);
  const [editProofTitle, setEditProofTitle] = useState('');
  const [editProofNotes, setEditProofNotes] = useState('');
  const [editProofMoney, setEditProofMoney] = useState('');
  const [editProofCredit, setEditProofCredit] = useState('');
  const [proofEditBusy, setProofEditBusy] = useState(false);
  
  // Payment link state
  const [showPaymentLinkModal, setShowPaymentLinkModal] = useState(false);
  const [paymentLinks, setPaymentLinks] = useState<PaymentLink[]>([]);
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);
  const [customerClientType, setCustomerClientType] = useState<string>('Office');
  const [releasingCommissionProofId, setReleasingCommissionProofId] = useState<string | null>(null);
  const [markingAllCommissions, setMarkingAllCommissions] = useState(false);

  // Approve / Reject modal state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [saveSubmitting, setSaveSubmitting] = useState(false);
  const [saveSuccessVisible, setSaveSuccessVisible] = useState(false);
  const saveSuccessTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  /** Inline delivery input drafts keyed by line item id. */
  const [deliveredDrafts, setDeliveredDrafts] = useState<Record<string, string>>({});

  const patchLineItemDelivered = (itemId: string, quantityDelivered: number) => {
    const apply = (items: OrderLineItem[]) =>
      items.map((i) => (i.id === itemId ? { ...i, quantityDelivered } : i));
    setOrder((prev) => (prev ? { ...prev, items: apply(prev.items) } : prev));
    setEditedOrder((prev) => (prev ? { ...prev, items: apply(prev.items) } : prev));
    setDeliveredDrafts((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const saveDelivered = async (itemId: string, raw: string, max: number) => {
    const val = Math.max(0, Math.min(Math.round(Number(raw) || 0), max));
    const { error } = await supabase
      .from('order_line_items')
      .update({ quantity_delivered: val, updated_at: new Date().toISOString() })
      .eq('id', itemId);
    if (error) {
      console.error(error);
      alert('Could not save delivered quantity: ' + error.message);
      return;
    }
    patchLineItemDelivered(itemId, val);
  };

  const [showInTransitModal, setShowInTransitModal] = useState(false);
  const [inTransitSubmitting, setInTransitSubmitting] = useState(false);
  const shipQtyNextOrderStatusRef = useRef<'Packed' | 'In Transit'>('In Transit');
  const [logisticsLoading, setLogisticsLoading] = useState(false);

  // Supabase data state
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [orderLogs, setOrderLogs] = useState<OrderLog[]>([]);
  /** Trips that include this order (for trip delay banner). */
  const [orderTripsWithDelayInfo, setOrderTripsWithDelayInfo] = useState<
    Array<{ id: string; tripNumber: string; status: string; delayReason: string | null }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [customerList, setCustomerList] = useState<
    { id: string; name: string; contact_person: string | null }[]
  >([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const customerSearchRef = useRef<HTMLDivElement>(null);
  const [agentList, setAgentList] = useState<
    { id: string; employee_name: string; employee_id: string; branch_name?: string }[]
  >([]);
  const [branchList, setBranchList] = useState<{ id: string; name: string }[]>([]);
  /** Whether the order branch has shipping containers (Ship delivery only when true). */
  const [branchHasShips, setBranchHasShips] = useState<boolean | null>(null);

  const orderBranchName = useMemo(() => {
    if (isEditing && editedOrder) {
      if (editedOrder.branch?.trim()) return editedOrder.branch.trim();
      if (editedOrder.branchId) {
        const b = branchList.find((x) => x.id === editedOrder.branchId);
        if (b?.name?.trim()) return b.name.trim();
      }
    }
    if (order?.branch?.trim()) return order.branch.trim();
    return null;
  }, [isEditing, editedOrder, order?.branch, branchList]);

  const catalogBranch = orderCatalogBranch(branch, orderBranchName);

  useEffect(() => {
    if (!isEditing) return;
    if (showProductModal) return;
    setCategories([]);
    setSelectedCategory(null);
    setCategoryProducts([]);
    setProductsLoadError(null);
  }, [catalogBranch, isEditing, showProductModal]);

  const patchEditedOrder = (patch: Partial<OrderDetail> | ((prev: OrderDetail) => Partial<OrderDetail>)) => {
    setEditedOrder((prev) => {
      if (!prev) return prev;
      const next = typeof patch === 'function' ? patch(prev) : patch;
      return { ...prev, ...next };
    });
  };

  const activityLogTotalPages = Math.max(1, Math.ceil(orderLogs.length / ACTIVITY_LOG_PAGE_SIZE));
  const pagedOrderLogs = useMemo(() => {
    const start = (activityLogPage - 1) * ACTIVITY_LOG_PAGE_SIZE;
    return orderLogs.slice(start, start + ACTIVITY_LOG_PAGE_SIZE);
  }, [orderLogs, activityLogPage]);

  useEffect(() => {
    setActivityLogPage(1);
  }, [orderLogs.length, id]);

  useEffect(() => {
    if (activityLogPage > activityLogTotalPages) setActivityLogPage(activityLogTotalPages);
  }, [activityLogPage, activityLogTotalPages]);

  const shipCheckBranchName = useMemo(() => {
    if (!isEditing || !editedOrder) return '';
    if (editedOrder.branch?.trim()) return editedOrder.branch.trim();
    if (editedOrder.branchId) {
      const b = branchList.find((x) => x.id === editedOrder.branchId);
      if (b?.name?.trim()) return b.name.trim();
    }
    return order?.branch?.trim() ?? '';
  }, [isEditing, editedOrder, order?.branch, branchList]);

  useEffect(() => {
    if (!isEditing || !shipCheckBranchName) {
      setBranchHasShips(null);
      return;
    }
    let cancelled = false;
    setBranchHasShips(null);
    void branchHasShippingContainers(shipCheckBranchName).then((has) => {
      if (!cancelled) setBranchHasShips(has);
    });
    return () => {
      cancelled = true;
    };
  }, [isEditing, shipCheckBranchName]);

  useEffect(() => {
    if (!isEditing || !editedOrder || branchHasShips !== false) return;
    if (editedOrder.deliveryType === 'Ship') {
      patchEditedOrder({ deliveryType: 'Truck' });
    }
  }, [isEditing, editedOrder, branchHasShips]);

  const showSaveSuccessBanner = () => {
    setSaveSuccessVisible(true);
    if (saveSuccessTimerRef.current) clearTimeout(saveSuccessTimerRef.current);
    saveSuccessTimerRef.current = setTimeout(() => setSaveSuccessVisible(false), 6000);
  };

  useEffect(() => {
    return () => {
      if (saveSuccessTimerRef.current) clearTimeout(saveSuccessTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    const fetchOrder = async () => {
      setLoading(true);
      setOrderTripsWithDelayInfo([]);

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

      if (!row) {
        setLoading(false);
        setOrderTripsWithDelayInfo([]);
        setCustomerEmail(null);
        return;
      }

      const customerId = (row as { customer_id?: string | null }).customer_id;
      if (customerId) {
        const { data: custRow } = await supabase
          .from('customers')
          .select('email, client_type')
          .eq('id', customerId)
          .maybeSingle();
        setCustomerEmail((custRow as { email?: string | null } | null)?.email ?? null);
        setCustomerClientType(String((custRow as { client_type?: string | null } | null)?.client_type ?? 'Office'));
      } else {
        setCustomerEmail(null);
        setCustomerClientType('Office');
      }

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

      const { data: proofRows } = await supabase
        .from('order_proof_documents')
        .select('*')
        .eq('order_id', id)
        .order('uploaded_at', { ascending: false });
      setProofs(
        (proofRows ?? []).map((pr) => proofRowToDocument(pr as any, (row as any).order_number ?? '')),
      );

      const hasPaymentProofs = (proofRows ?? []).some((pr) => pr.type === 'payment');
      let resolvedOrder = mappedOrder;
      if (hasPaymentProofs) {
        await syncOrderPaymentsFromProofs(id);
        const { data: payRow } = await supabase
          .from('orders')
          .select('amount_paid, balance_due, payment_status')
          .eq('id', id)
          .maybeSingle();
        if (payRow) {
          resolvedOrder = {
            ...mappedOrder,
            amountPaid: Number(payRow.amount_paid ?? 0),
            balanceDue: Number(payRow.balance_due ?? 0),
            paymentStatus: payRow.payment_status as OrderDetail['paymentStatus'],
          };
        }
      } else {
        const derived = deriveOrderPaymentFields(
          mappedOrder.totalAmount,
          mappedOrder.amountPaid,
          mappedOrder.balanceDue,
        );
        if (
          Math.abs(derived.amountPaid - mappedOrder.amountPaid) > 0.01 ||
          Math.abs(derived.balanceDue - mappedOrder.balanceDue) > 0.01
        ) {
          await supabase
            .from('orders')
            .update({
              amount_paid: derived.amountPaid,
              balance_due: derived.balanceDue,
              updated_at: new Date().toISOString(),
            })
            .eq('id', id);
          resolvedOrder = { ...mappedOrder, amountPaid: derived.amountPaid, balanceDue: derived.balanceDue };
        }
      }

      setOrder(resolvedOrder);
      setOrderLogs(mappedLogs);

      const orderUuid = id as string;
      const { data: tripRows } = await supabase
        .from('trips')
        .select('id, trip_number, status, order_ids, delay_reason')
        .contains('order_ids', [orderUuid]);
      const tripsForOrder = (tripRows ?? []).filter((t: { order_ids?: string[] | null }) => {
        const oids = (t.order_ids ?? []) as string[];
        return oids.includes(orderUuid);
      });
      setOrderTripsWithDelayInfo(
        tripsForOrder.map((t: { id?: string; trip_number?: string; status?: string; delay_reason?: string | null }) => ({
          id: String(t.id ?? ''),
          tripNumber: String(t.trip_number ?? '—'),
          status: String(t.status ?? ''),
          delayReason: t.delay_reason != null && String(t.delay_reason).trim() !== '' ? String(t.delay_reason) : null,
        })),
      );

      setLoading(false);
    };

    fetchOrder();
  }, [id]);

  useEffect(() => {
    setHideBranchSelector(true);
    return () => setHideBranchSelector(false);
  }, [setHideBranchSelector]);

  // ── Pre-fetch all products for existing order items when edit mode starts ──
  // Must be declared here (before any early returns) to satisfy Rules of Hooks.
  // This mirrors CreateOrderModal: products (with image_url, variants, stock) are
  // loaded into productCache BEFORE the user clicks an item, so handleEditItem
  // can be synchronous — no async lookup needed on click.
  useEffect(() => {
    if (!isEditing) {
      setCustomerSearchQuery('');
      setShowCustomerDropdown(false);
      setCustomerList([]);
      setCustomersLoading(false);
      return;
    }

    let cancelled = false;
    setCustomersLoading(true);
    void (async () => {
      const agentUuid =
        typeof editedOrder?.agentId === 'string' && editedOrder.agentId.trim() !== ''
          ? editedOrder.agentId.trim()
          : null;
      if (!agentUuid) {
        if (!cancelled) {
          setCustomerList([]);
          setCustomersLoading(false);
        }
        return;
      }
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, contact_person')
        .eq('status', 'Active')
        .eq('assigned_agent_id', agentUuid)
        .order('name')
        .limit(500);
      if (!cancelled) {
        setCustomerList(
          !error && data
            ? (data as { id: string; name: string; contact_person?: string | null }[]).map(
                (r) => ({
                  id: r.id,
                  name: String(r.name ?? ''),
                  contact_person: r.contact_person ?? null,
                }),
              )
            : [],
        );
        setCustomersLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isEditing, editedOrder?.agentId]);

  useEffect(() => {
    if (!isEditing) return;
    void supabase
      .from('branches')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => setBranchList(data ?? []));
  }, [isEditing]);

  const branchIdForAgents =
    isEditing && editedOrder?.branchId ? editedOrder.branchId : order?.branchId;
  const agentIdForAgentList =
    isEditing && editedOrder ? editedOrder.agentId : order?.agentId;

  useEffect(() => {
    if (!isEditing || !branchIdForAgents) {
      setAgentList([]);
      return;
    }
    const branchId = branchIdForAgents;
    void (async () => {
      const { data } = await supabase
        .from('employees')
        .select('id, employee_name, employee_id, branches(name)')
        .eq('branch_id', branchId)
        .eq('role', 'Sales Agent')
        .eq('status', 'active')
        .order('employee_name');
      let agents = (data ?? []).map((row) => ({
        id: row.id,
        employee_name: row.employee_name,
        employee_id: row.employee_id,
        branch_name: (row as { branches?: { name?: string } | null }).branches?.name ?? undefined,
      }));
      if (agentIdForAgentList && !agents.some((a) => a.id === agentIdForAgentList)) {
        const { data: current } = await supabase
          .from('employees')
          .select('id, employee_name, employee_id, branches(name)')
          .eq('id', agentIdForAgentList)
          .maybeSingle();
        if (current) {
          agents = [
            {
              id: current.id,
              employee_name: current.employee_name,
              employee_id: current.employee_id,
              branch_name: (current as { branches?: { name?: string } | null }).branches?.name ?? undefined,
            },
            ...agents,
          ];
        }
      }
      setAgentList(agents);
    })();
  }, [isEditing, branchIdForAgents, agentIdForAgentList]);

  useEffect(() => {
    if (!isEditing || !editedOrder || !perms.agentBranchSelection || !employeeId) return;
    if (editedOrder.agentId?.trim()) return;
    patchEditedOrder({ agentId: employeeId, agent: employeeName || editedOrder.agent });
  }, [isEditing, editedOrder, perms.agentBranchSelection, employeeId, employeeName]);

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
      const stockBranchId = order.branchId;
      if (stockBranchId && allVariantIds.length > 0) {
        const { data: stockData } = await supabase
          .from('product_variant_stock').select('variant_id, quantity')
          .eq('branch_id', stockBranchId).in('variant_id', allVariantIds);
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
            if (stockBranchId && allFallbackVariantIds.length > 0) {
              const { data: fallbackStock } = await supabase
                .from('product_variant_stock').select('variant_id, quantity')
                .eq('branch_id', stockBranchId).in('variant_id', allFallbackVariantIds);
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
  }, [isEditing, order]);

  const filteredCustomersForSelect = useMemo(() => {
    const q = customerSearchQuery.trim().toLowerCase();
    const rows = !q
      ? customerList
      : customerList.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.contact_person ?? '').toLowerCase().includes(q),
        );
    return rows.slice(0, 50);
  }, [customerList, customerSearchQuery]);

  useEffect(() => {
    if (!showCustomerDropdown) return;
    const onDocClick = (e: MouseEvent) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(e.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showCustomerDropdown]);

  const handleSelectCustomerForOrder = (c: {
    id: string;
    name: string;
    contact_person: string | null;
  }) => {
    patchEditedOrder({ customerId: c.id, customer: c.name });
    setCustomerSearchQuery('');
    setShowCustomerDropdown(false);
  };

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

  const reloadProofsFromDb = async (orderNumberForDisplay: string) => {
    if (!id) return;
    const { data: proofRows } = await supabase
      .from('order_proof_documents')
      .select('*')
      .eq('order_id', id)
      .order('uploaded_at', { ascending: false });
    setProofs((proofRows ?? []).map((pr) => proofRowToDocument(pr as any, orderNumberForDisplay)));
  };

  const refreshOrderPaymentFieldsFromDb = async () => {
    if (!id) return;
    const { data: row, error } = await supabase
      .from('orders')
      .select('amount_paid, balance_due, payment_status')
      .eq('id', id)
      .maybeSingle();
    if (error || !row) return;
    setOrder((o) => {
      if (!o) return o;
      const derived = deriveOrderPaymentFields(
        o.totalAmount,
        Number(row.amount_paid ?? 0),
        Number(row.balance_due ?? 0),
      );
      return {
        ...o,
        amountPaid: derived.amountPaid,
        balanceDue: derived.balanceDue,
        paymentStatus: row.payment_status as OrderDetail['paymentStatus'],
      };
    });
  };

  const loadCustomerCreditSummary = async (customerId: string) => {
    setCustomerCreditLoading(true);
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('credit_limit, outstanding_balance, available_credit')
        .eq('id', customerId)
        .maybeSingle();
      if (error || !data) {
        setCustomerCreditSummary(null);
        return;
      }
      setCustomerCreditSummary({
        creditLimit: Number(data.credit_limit ?? 0),
        outstandingBalance: Number(data.outstanding_balance ?? 0),
        availableCredit: Number(data.available_credit ?? 0),
      });
    } finally {
      setCustomerCreditLoading(false);
    }
  };

  useEffect(() => {
    if (!showProofModal || proofType !== 'payment' || !order?.customerId) return;
    void loadCustomerCreditSummary(order.customerId);
  }, [showProofModal, proofType, order?.customerId]);

  useEffect(() => {
    if (!showProofEditModal || editingProof?.type !== 'payment' || !order?.customerId) return;
    void loadCustomerCreditSummary(order.customerId);
  }, [showProofEditModal, editingProof?.type, order?.customerId]);

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

    const mergedActualDelivery =
      extra?.actual_delivery !== undefined ? extra.actual_delivery || null : order.actualDelivery ?? null;
    let logisticsCustomerTerms: string | null = null;
    if (order.customerId) {
      const { data: lcust } = await supabase
        .from('customers')
        .select('payment_terms')
        .eq('id', order.customerId)
        .maybeSingle();
      logisticsCustomerTerms =
        typeof lcust?.payment_terms === 'string' ? lcust.payment_terms.trim() || null : null;
    }
    const logisticsDueDate = deriveOrderDueDateForPersistence({
      order_date: order.orderDate,
      actual_delivery: mergedActualDelivery,
      payment_terms: order.paymentTerms,
      customer_payment_terms: logisticsCustomerTerms,
    });
    if (logisticsDueDate) updatePayload.due_date = logisticsDueDate;

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
        if (logisticsDueDate) n.dueDate = logisticsDueDate;
        return n;
      });
      if (next === 'Loading') {
        void notifyLogisticsOrderLoading(id, { markedBy: employeeName?.trim() || null }).catch((notifyErr) => {
          console.warn('[OrderDetailPage] logistics loading notification failed', notifyErr);
        });
      }
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
    const nextOrderStatus = shipQtyNextOrderStatusRef.current;
    const byLine = new Map(rows.map((r) => [r.itemId, r.shippedQuantity]));
    for (const li of order.items) {
      const ship = byLine.get(li.id);
      if (ship === undefined) continue;
      if (ship < 0) {
        alert('Each sent quantity must be 0 or more.');
        return;
      }
      const prevCumulative = cumulativeShippedForLine(li, order.status);
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

          await deductVariantBranchStock({
            variantId: l.variantId,
            branchId,
            quantity: ship,
          });

          const { data: vrow } = await supabase
            .from('product_variants')
            .select('sku')
            .eq('id', l.variantId)
            .single();

          const { error: mErr } = await supabase.from('product_stock_movements').insert({
            variant_id: l.variantId,
            variant_sku: vrow?.sku ?? l.sku,
            product_name: l.productName,
            movement_type: 'Out',
            quantity: ship,
            from_branch: branchCode || null,
            reason:
              nextOrderStatus === 'Packed'
                ? 'Order packed / loaded (shipment)'
                : 'Order in transit (shipment)',
            performed_by: employeeName || session?.user?.email || role,
            reference_number: order.id,
            timestamp: new Date().toISOString(),
          });
          if (mErr) throw mErr;
        }

        const prevCum = cumulativeShippedForLine(l, order.status);
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
        .update({ status: nextOrderStatus, updated_at: new Date().toISOString() })
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

      const logSummary =
        nextOrderStatus === 'Packed'
          ? `Logistics: ${prev} → Packed (stock deducted, loaded)`
          : `Logistics: ${prev} → In Transit (stock deducted)`;

      await insertOrderLog(
        'shipped',
        logSummary,
        { status: prev },
        { status: nextOrderStatus },
        { inTransit: rows, shipment_lines },
      );
      setOrder((o) => {
        if (!o) return o;
        return {
          ...o,
          status: nextOrderStatus,
          items: o.items.map((li) => {
            const ship = byLine.get(li.id) ?? 0;
            const nextC = (li.quantityShipped ?? 0) + ship;
            return { ...li, quantityShipped: nextC };
          }),
        };
      });
      setShowInTransitModal(false);
      shipQtyNextOrderStatusRef.current = 'In Transit';
      addAuditLog(
        nextOrderStatus === 'Packed' ? 'Packed / loaded (shipment)' : 'In transit (shipment)',
        'Order',
        `Order ${order.id} — ${nextOrderStatus} with stock move`,
      );
      if (nextOrderStatus === 'Packed') {
        void notifyOrderPacked(id, { markedBy: employeeName?.trim() || null }).catch((notifyErr) => {
          console.warn('[OrderDetailPage] order packed notification failed', notifyErr);
        });
      } else if (nextOrderStatus === 'In Transit') {
        void notifyOrderInTransit(id, { markedBy: employeeName?.trim() || null }).catch((notifyErr) => {
          console.warn('[OrderDetailPage] order in transit notification failed', notifyErr);
        });
      }
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

  const getMaxProofCreditAmount = (): number => {
    if (!order?.customerId || !customerCreditSummary || customerCreditSummary.creditLimit <= 0) {
      return 0;
    }
    const balanceDue = deriveOrderPaymentFields(
      order.totalAmount,
      order.amountPaid,
      order.balanceDue,
    ).balanceDue;
    return roundMoney(Math.max(0, Math.min(customerCreditSummary.availableCredit, balanceDue)));
  };

  const maxProofCreditAmount = getMaxProofCreditAmount();
  const canApplyCustomerCredit =
    Boolean(order?.customerId) &&
    !customerCreditLoading &&
    customerCreditSummary != null &&
    customerCreditSummary.creditLimit > 0 &&
    maxProofCreditAmount > 0.01;

  const proofModalBalanceDue = order
    ? deriveOrderPaymentFields(order.totalAmount, order.amountPaid, order.balanceDue).balanceDue
    : 0;

  const capProofMoney = (raw: string) => {
    if (raw === '') {
      setProofMoneyPayment('');
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return;
    const credit = Number(proofPaymentCredit) || 0;
    const maxMoney = Math.max(0, proofModalBalanceDue - credit);
    setProofMoneyPayment(String(Math.min(n, maxMoney)));
  };

  const capProofCredit = (raw: string) => {
    if (raw === '') {
      setProofPaymentCredit('');
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return;
    const money = Number(proofMoneyPayment) || 0;
    const maxCredit = Math.min(getMaxProofCreditAmount(), Math.max(0, proofModalBalanceDue - money));
    setProofPaymentCredit(String(Math.min(n, maxCredit)));
  };

  const editingProofPaymentTotal = editingProof
    ? roundMoney(
        (editingProof.paymentCashAmount ?? 0) +
          (editingProof.paymentCreditAmount ?? 0) +
          (editingProof.paymentAdjustment ?? 0),
      )
    : 0;
  const editProofAmountPool = roundMoney(proofModalBalanceDue + editingProofPaymentTotal);

  const capEditProofMoney = (raw: string) => {
    if (raw === '') {
      setEditProofMoney('');
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return;
    const credit = Number(editProofCredit) || 0;
    setEditProofMoney(String(Math.min(n, Math.max(0, editProofAmountPool - credit))));
  };

  const capEditProofCredit = (raw: string) => {
    if (raw === '') {
      setEditProofCredit('');
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) return;
    const money = Number(editProofMoney) || 0;
    const maxCredit = Math.min(getMaxProofCreditAmount(), Math.max(0, editProofAmountPool - money));
    setEditProofCredit(String(Math.min(n, maxCredit)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 gap-3 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Loading order...</span>
      </div>
    );
  }

  if (!perms.pageAccess) {
    return <ModuleAccessDenied moduleName="Orders" />;
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

  const getStatusBadgeVariant = (status: OrderStatus) => orderStatusBadgeVariant(status);

  const getPaymentBadgeVariant = (status: string) => paymentStatusBadgeVariant(status);

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
    setSaveSuccessVisible(false);
    setIsEditing(true);
    let next: OrderDetail = {
      ...order,
      items: order.items.map((item) => ({ ...item })),
    };
    if (!perms.agentBranchSelection && employeeId) {
      if (!next.agentId?.trim()) {
        next = { ...next, agentId: employeeId, agent: employeeName || next.agent };
      }
    }
    setEditedOrder(next);
    setDeliveredDrafts({});
    addAuditLog('Started Edit Order', 'Order', `Started editing order ${order.id}`);
  };

  const handleCancelEdit = () => {
    if (saveSubmitting) return;
    setIsEditing(false);
    setEditedOrder(null);
    setDeliveredDrafts({});
  };

  const handleResubmit = async () => {
    if (!order || !id || order.status !== 'Rejected') return;
    const hasCustomer =
      (order.customerId && order.customerId.length > 0) ||
      (order.customer && order.customer.trim().length > 0);
    if (!hasCustomer) {
      alert('Choose a customer before resubmitting (Edit order → save, then Resubmit).');
      return;
    }
    if (order.items.length === 0) {
      alert('Add at least one product line before resubmitting.');
      return;
    }
    setApprovalLoading(true);
    const previousRejectionReason = order.rejectionReason ?? null;
    try {
      const { error } = await supabase
        .from('orders')
        .update({
          status: 'Pending',
          approved_by: null,
          approved_date: null,
          rejected_by: null,
          rejection_reason: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
      await insertOrderLog(
        'status_changed',
        'Revised and resubmitted: Rejected → Pending',
        { status: 'Rejected', rejection_reason: previousRejectionReason },
        { status: 'Pending' },
      );
      setOrder({
        ...order,
        status: 'Pending',
        approvedBy: undefined,
        approvedDate: undefined,
        rejectedBy: undefined,
        rejectionReason: undefined,
      });
      addAuditLog('Resubmitted Order', 'Order', `Revised and resubmitted order ${order.id} after rejection`);
      void notifyExecutivesOrderRevised(
        buildOrderRevisedNotifyPayload({ ...order, status: 'Pending' }, id, { previousRejectionReason }),
      ).catch((notifyErr) => {
        console.warn('[OrderDetailPage] revised order notification failed', notifyErr);
      });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to resubmit');
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleFulfillOrder = async (
    fulfillmentData: FulfillmentData[],
    proofImageUrls: string[] = [],
    proofDetails?: DeliveryProofDetails,
  ) => {
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
      const proofResult = await attachOrderDeliveryProofsAndNotify(id, proofImageUrls, {
        uploadedBy: actorLabel,
        uploadedByRole: uploaderRole,
        title: proofDetails?.title ?? null,
        notes: proofDetails?.notes ?? null,
        uploaderEmployeeId: employeeId,
      });
      if (!proofResult.ok) {
        throw new Error(`Delivery saved but proof files could not be stored: ${proofResult.error ?? 'Unknown error'}`);
      }
      const names = proofImageUrls.map((url) => url.split('/').pop()?.split('?')[0] ?? 'image').join(', ');
      await insertOrderLog(
        'proof_uploaded',
        `Proof of delivery: ${proofImageUrls.length} image(s) — ${names}`,
        null,
        null,
        { count: proofImageUrls.length, fileNames: names, source: 'delivery_record' },
      );
      addAuditLog(
        'Proof of Delivery',
        'Order',
        `Attached ${proofImageUrls.length} image(s) with delivery for order ${order.id}`,
      );
      await reloadProofsFromDb(order.id);
      setDocumentsProofTab('delivery');
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
    setEditedOrder((prev) =>
      prev
        ? {
            ...prev,
            status: newStatus,
            items: prev.items.map((l) => {
              const fd = fulfillmentData.find((f) => f.itemId === l.id);
              if (!fd) return l;
              return { ...l, quantityDelivered: (l.quantityDelivered ?? 0) + fd.deliveredQuantity };
            }),
            ...(isOrderDeliveryComplete ? { actualDelivery: now } : {}),
          }
        : prev,
    );
    setDeliveredDrafts({});
    setShowFulfillModal(false);

    void notifyOrderDeliveryRecorded(id, {
      recordedBy: actorLabel?.trim() || null,
    }).catch((notifyErr) => {
      console.warn('[OrderDetailPage] delivery recorded notification failed', notifyErr);
    });

    void tryCompleteTripsForDeliveredOrder(id).catch((err) => {
      if (import.meta.env.DEV) console.warn('[OrderDetailPage] trip auto-complete failed', err);
    });
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
    void buildOrderDecisionNotifyPayload(
      { ...order, status: 'Approved' },
      id,
      { decision: 'approved', decidedBy: employeeName || session?.user?.email || role || null },
    )
      .then(notifyAgentOrderApproved)
      .catch((notifyErr) => {
        console.warn('[OrderDetailPage] agent approval notification failed', notifyErr);
      });
    void buildOrderLogisticsReadyNotifyPayload(
      { ...order, status: 'Approved' },
      id,
      { approvedBy: employeeName || session?.user?.email || role || null },
    )
      .then((payload) => {
        if (payload) return notifyLogisticsOrderReadyForSchedule(payload);
      })
      .catch((notifyErr) => {
        console.warn('[OrderDetailPage] logistics approval notification failed', notifyErr);
      });
    void buildOrderCustomerApprovedNotifyPayload(
      { ...order, status: 'Approved' },
      id,
      { approvedBy: employeeName || session?.user?.email || role || null },
    )
      .then((payload) => {
        if (payload) return notifyCustomerOrderApproved(payload);
      })
      .catch((notifyErr) => {
        console.warn('[OrderDetailPage] customer approval notification failed', notifyErr);
      });
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
    if (shouldReleaseOrderFromTrips(order.status, 'Rejected')) {
      const release = await releaseOrderFromActiveTrips(id);
      if (!release.ok) {
        alert(`Order rejected but could not update linked trip(s): ${release.error ?? 'Unknown error'}`);
      }
    }
    setOrder({ ...order, status: 'Rejected' as any, rejectedBy: role, rejectionReason: rejectionReason || undefined, approvedBy: undefined, approvedDate: undefined });
    await insertOrderLog(
      'rejected',
      `Order rejected by ${employeeName || session?.user?.email || role}`,
      { status: order.status },
      { status: 'Rejected', rejected_by: employeeName || session?.user?.email || role },
      rejectionReason ? { reason: rejectionReason } : null,
    );
    addAuditLog('Rejected Order', 'Order', `Rejected order ${order.id}${rejectionReason ? ': ' + rejectionReason : ''}`);
    void buildOrderDecisionNotifyPayload(
      { ...order, status: 'Rejected' },
      id,
      {
        decision: 'rejected',
        decidedBy: employeeName || session?.user?.email || role || null,
        rejectionReason: rejectionReason || null,
      },
    )
      .then(notifyAgentOrderRejected)
      .catch((notifyErr) => {
        console.warn('[OrderDetailPage] agent rejection notification failed', notifyErr);
      });
    setApprovalLoading(false);
    setShowRejectModal(false);
    setRejectionReason('');
  };

  const handleCancelOrder = async (data: CancellationData) => {
    if (!order || !id) return;
    const now = new Date().toISOString();
    const actorName = employeeName || session?.user?.email || role;

    // 1. Mark order Cancelled in DB
    const { error: orderErr } = await supabase
      .from('orders')
      .update({
        status: 'Cancelled',
        cancelled_at: now,
        cancellation_reason: data.reason,
        updated_at: now,
      })
      .eq('id', id);
    if (orderErr) { alert('Failed to cancel order: ' + orderErr.message); return; }

    if (shouldReleaseOrderFromTrips(order.status, 'Cancelled')) {
      const release = await releaseOrderFromActiveTrips(id);
      if (!release.ok) {
        alert(`Order cancelled but could not update linked trip(s): ${release.error ?? 'Unknown error'}`);
      }
    }

    // 2. Return stock if requested and order had stock deducted (In Transit or later)
    if (data.restockItems && order.branchId) {
      const stockedStatuses: OrderStatus[] = ['In Transit', 'Delivered', 'Partially Fulfilled'];
      if (stockedStatuses.includes(order.status)) {
        const { data: br } = await supabase.from('branches').select('code').eq('id', order.branchId).maybeSingle();
        const branchCode = (br as { code?: string } | null)?.code ?? '';
        for (const li of order.items) {
          if (!li.variantId) continue;
          const shipped = li.quantityShipped ?? 0;
          if (shipped <= 0) continue;

          // Restore branch stock
          const { data: pvs } = await supabase
            .from('product_variant_stock')
            .select('id, quantity')
            .eq('variant_id', li.variantId)
            .eq('branch_id', order.branchId)
            .maybeSingle();
          if (pvs) {
            await supabase
              .from('product_variant_stock')
              .update({ quantity: Number(pvs.quantity) + shipped, updated_at: now })
              .eq('id', pvs.id);
          }

          // Restore total stock on variant
          const { data: vrow } = await supabase
            .from('product_variants')
            .select('total_stock, sku')
            .eq('id', li.variantId)
            .maybeSingle();
          if (vrow) {
            await supabase
              .from('product_variants')
              .update({ total_stock: Number(vrow.total_stock ?? 0) + shipped, updated_at: now })
              .eq('id', li.variantId);
          }

          // Stock movement record
          await supabase.from('product_stock_movements').insert({
            variant_id: li.variantId,
            variant_sku: vrow?.sku ?? li.sku,
            product_name: li.productName,
            movement_type: 'In',
            quantity: shipped,
            to_branch: branchCode || null,
            reason: `Order cancelled — stock returned (${data.reason})`,
            performed_by: actorName,
            reference_number: order.id,
            timestamp: now,
          });
        }
      }
    }

    // 3. Insert order log
    await insertOrderLog(
      'cancelled',
      `Order cancelled by ${actorName} — ${data.reason}`,
      { status: order.status },
      { status: 'Cancelled', reason: data.reason, restockItems: data.restockItems },
      data.additionalNotes ? { notes: data.additionalNotes } : null,
    );
    addAuditLog('Cancelled Order', 'Order', `Cancelled order ${order.id}: ${data.reason}`);

    const cancelledByRole: 'agent' | 'executive' = role === 'Agent' ? 'agent' : 'executive';
    void buildOrderCancelledNotifyPayload(
      { ...order, status: 'Cancelled', cancellationReason: data.reason },
      id,
      {
        cancelledBy: actorName || null,
        cancelledByRole,
        cancellationReason: data.reason,
        additionalNotes: data.additionalNotes ?? null,
      },
    )
      .then(notifyOrderCancelled)
      .catch((notifyErr) => {
        console.warn('[OrderDetailPage] cancellation notification failed', notifyErr);
      });

    setOrder({ ...order, status: 'Cancelled', cancelledAt: now, cancellationReason: data.reason });
    setShowCancelModal(false);
  };

  const handleSave = async () => {
    if (!editedOrder || !id || saveSubmitting) return;

    setSaveSubmitting(true);
    try {
    // Snapshot old state before save for diffing
    const oldOrder = order!;

    // Recalculate totals from items
    const subtotal = editedOrder.items.reduce((sum, item) => sum + item.lineTotal, 0);
    const discountAmount = editedOrder.discountAmount ?? 0;
    const totalAmount = subtotal - discountAmount;
    const derivedPay = deriveOrderPaymentFields(
      totalAmount,
      oldOrder.amountPaid,
      oldOrder.balanceDue,
    );

    const branchIdToSave = editedOrder.branchId?.trim();
    if (!branchIdToSave) {
      alert('Please select a branch for this order.');
      return;
    }

    const agentIdToSave = editedOrder.agentId?.trim() || null;
    const agentNameToSave = agentIdToSave
      ? (agentList.find((a) => a.id === agentIdToSave)?.employee_name ?? editedOrder.agent)?.trim() || null
      : null;

    let customerDefaultTerms: string | null = null;
    const cid = editedOrder.customerId?.trim();
    if (cid) {
      const { data: custTermsRow } = await supabase
        .from('customers')
        .select('payment_terms')
        .eq('id', cid)
        .maybeSingle();
      customerDefaultTerms =
        typeof custTermsRow?.payment_terms === 'string' ? custTermsRow.payment_terms.trim() || null : null;
    }

    const persistedDueDate = deriveOrderDueDateForPersistence({
      order_date: editedOrder.orderDate,
      actual_delivery: editedOrder.actualDelivery ?? null,
      payment_terms: editedOrder.paymentTerms,
      customer_payment_terms: customerDefaultTerms,
    });

    const releasingFromTrip =
      oldOrder.status !== editedOrder.status &&
      shouldReleaseOrderFromTrips(oldOrder.status, editedOrder.status);
    const clearScheduledDeparture =
      releasingFromTrip &&
      (editedOrder.status === 'Approved' || editedOrder.status === 'Partially Fulfilled');

    // Update the order header
    const { error: orderErr } = await supabase
      .from('orders')
      .update({
        status: editedOrder.status,
        payment_status: editedOrder.paymentStatus,
        subtotal,
        discount_amount: discountAmount,
        total_amount: totalAmount,
        amount_paid: derivedPay.amountPaid,
        balance_due: derivedPay.balanceDue,
        required_date: editedOrder.requiredDate || null,
        estimated_delivery: editedOrder.estimatedDelivery || null,
        scheduled_departure_date: clearScheduledDeparture
          ? null
          : editedOrder.scheduledDepartureDate || null,
        delivery_type: editedOrder.deliveryType,
        payment_terms: editedOrder.paymentTerms,
        payment_method: editedOrder.paymentMethod,
        customer_id: editedOrder.customerId || null,
        customer_name: editedOrder.customer?.trim() ? editedOrder.customer : null,
        branch_id: branchIdToSave,
        agent_id: agentIdToSave,
        agent_name: agentNameToSave,
        urgency: editedOrder.urgency ?? 'Medium',
        due_date: persistedDueDate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (orderErr) {
      alert('Failed to save order: ' + orderErr.message);
      return;
    }

    const { data: savedHeader, error: headerReadErr } = await supabase
      .from('orders')
      .select('agent_id, agent_name, customer_id, customer_name, status, payment_status')
      .eq('id', id)
      .maybeSingle();
    if (headerReadErr) {
      console.warn('Order saved but could not re-read header:', headerReadErr.message);
    }

    // Delete existing line items and re-insert
    await supabase.from('order_line_items').delete().eq('order_id', id);

    if (editedOrder.items.length > 0) {
      const rows = editedOrder.items.map(item => {
        // Apply any pending delivery draft for this item
        const draftVal = deliveredDrafts[item.id];
        const quantityDelivered = draftVal !== undefined
          ? Math.max(0, Math.min(Math.round(Number(draftVal) || 0), item.quantity))
          : (item.quantityDelivered ?? null);
        return {
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
          discounts_breakdown:
            item.discountsBreakdown && item.discountsBreakdown.length > 0
              ? item.discountsBreakdown.map((d) => ({
                  name: d.name,
                  percentage: Number(d.percentage),
                }))
              : null,
          quantity_shipped: item.quantityShipped ?? null,
          quantity_delivered: quantityDelivered,
        };
      });
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

      if (releasingFromTrip) {
        const release = await releaseOrderFromActiveTrips(id);
        if (!release.ok) {
          alert(`Order saved but could not update linked trip(s): ${release.error ?? 'Unknown error'}`);
        } else if (release.tripsDeleted > 0 || release.tripsUpdated > 0) {
          const parts: string[] = [];
          if (release.tripsDeleted > 0) {
            parts.push(`${release.tripsDeleted} trip${release.tripsDeleted === 1 ? '' : 's'} removed`);
          }
          if (release.tripsUpdated > 0) {
            parts.push(`${release.tripsUpdated} trip${release.tripsUpdated === 1 ? '' : 's'} updated`);
          }
          addAuditLog(
            'Released order from trip',
            'Order',
            `Order ${editedOrder.id} unscheduled — ${parts.join(', ')}`,
          );
        }
        const { data: tripRows } = await supabase
          .from('trips')
          .select('id, trip_number, status, order_ids, delay_reason')
          .contains('order_ids', [id]);
        const tripsForOrder = (tripRows ?? []).filter((t: { order_ids?: string[] | null }) => {
          const oids = (t.order_ids ?? []) as string[];
          return oids.includes(id);
        });
        setOrderTripsWithDelayInfo(
          tripsForOrder.map(
            (t: { id?: string; trip_number?: string; status?: string; delay_reason?: string | null }) => ({
              id: String(t.id ?? ''),
              tripNumber: String(t.trip_number ?? '—'),
              status: String(t.status ?? ''),
              delayReason:
                t.delay_reason != null && String(t.delay_reason).trim() !== ''
                  ? String(t.delay_reason)
                  : null,
            }),
          ),
        );
      }
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

    if ((oldOrder.branchId ?? '') !== (editedOrder.branchId ?? '')) {
      await insertOrderLog(
        'note_added',
        `Branch changed from "${oldOrder.branch || '—'}" to "${editedOrder.branch || '—'}"`,
        { branchId: oldOrder.branchId ?? null, branchName: oldOrder.branch || null },
        { branchId: editedOrder.branchId ?? null, branchName: editedOrder.branch || null },
      );
    }

    if (oldOrder.agentId !== editedOrder.agentId || oldOrder.agent !== editedOrder.agent) {
      await insertOrderLog(
        'note_added',
        `Agent changed from "${oldOrder.agent || '—'}" to "${editedOrder.agent || '—'}"`,
        { agentId: oldOrder.agentId || null, agentName: oldOrder.agent || null },
        { agentId: editedOrder.agentId || null, agentName: editedOrder.agent || null },
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
    // Refresh from DB — merge drafted delivered values into the refreshed items
    const savedItems = editedOrder.items.map((item) => {
      const draftVal = deliveredDrafts[item.id];
      const quantityDelivered = draftVal !== undefined
        ? Math.max(0, Math.min(Math.round(Number(draftVal) || 0), item.quantity))
        : (item.quantityDelivered ?? null);
      return { ...item, quantityDelivered };
    });
    const savedPay = deriveOrderPaymentFields(totalAmount, oldOrder.amountPaid, oldOrder.balanceDue);
    setOrder({
      ...editedOrder,
      agentId: savedHeader?.agent_id ? String(savedHeader.agent_id) : editedOrder.agentId,
      agent: savedHeader?.agent_name ? String(savedHeader.agent_name) : editedOrder.agent,
      customerId: savedHeader?.customer_id ? String(savedHeader.customer_id) : editedOrder.customerId,
      customer: savedHeader?.customer_name ? String(savedHeader.customer_name) : editedOrder.customer,
      status: (savedHeader?.status as OrderStatus) ?? editedOrder.status,
      paymentStatus:
        (savedHeader?.payment_status as OrderDetail['paymentStatus']) ?? editedOrder.paymentStatus,
      subtotal,
      totalAmount,
      amountPaid: savedPay.amountPaid,
      balanceDue: savedPay.balanceDue,
      dueDate: persistedDueDate ?? editedOrder.dueDate,
      scheduledDepartureDate: clearScheduledDeparture ? undefined : editedOrder.scheduledDepartureDate,
      items: savedItems,
    });
    const { data: payProofCheck } = await supabase
      .from('order_proof_documents')
      .select('id')
      .eq('order_id', id)
      .eq('type', 'payment')
      .limit(1);
    if ((payProofCheck ?? []).length > 0) {
      await syncOrderPaymentsFromProofs(id);
      await refreshOrderPaymentFieldsFromDb();
    }
    setDeliveredDrafts({});
    setIsEditing(false);
    setEditedOrder(null);
    showSaveSuccessBanner();
    } finally {
      setSaveSubmitting(false);
    }
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
      void notifyExecutivesOrderSubmittedForApproval(
        buildOrderNotifyPayload({ ...order, status: 'Pending' }, id),
      ).catch((notifyErr) => {
        console.warn('[OrderDetailPage] notification failed', notifyErr);
      });
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
    
    patchEditedOrder({ items: updatedItems });
  };

  const handleRemoveItem = (itemId: string) => {
    if (!editedOrder) return;
    
    const updatedItems = editedOrder.items.filter(item => item.id !== itemId);
    patchEditedOrder({ items: updatedItems });
  };

  const handleAddProduct = () => {
    setProductsLoadError(null);
    setShowProductModal(true);
    setCategoriesLoading(true);
    let cq = supabase
      .from('product_categories')
      .select('id, name, image_url')
      .eq('is_active', true);
    const b = catalogBranch ?? '';
    if (b) {
      cq = cq.or(`branch.eq.${b},branch.is.null`);
    }
    void cq.order('sort_order').then(({ data, error }) => {
      if (error) {
        console.error('[OrderDetailPage] categories load failed', error);
        setCategories([]);
      } else {
        setCategories(data ?? []);
      }
      setCategoriesLoading(false);
    });
  };

  const handleSelectCategory = async (cat: DBCategoryDet) => {
    setSelectedCategory(cat);
    setProductsLoading(true);
    setProductsLoadError(null);
    setCategoryProducts([]);

    try {
      const stockBranchId =
        (isEditing && editedOrder?.branchId?.trim()) ||
        order?.branchId?.trim() ||
        null;
      let branchRow: { id: string } | null = null;
      if (stockBranchId) {
        branchRow = { id: stockBranchId };
      } else {
        const branchNameForStock = catalogBranch ?? branch ?? '';
        if (branchNameForStock) {
          const { data: bd } = await supabase
            .from('branches')
            .select('id')
            .eq('name', branchNameForStock)
            .maybeSingle();
          branchRow = bd ?? null;
        }
      }

      let pQuery = supabase
        .from('products')
        .select(
          'id, name, image_url, is_hidden, product_variants(id, size, description, unit_price, total_stock, is_hidden, product_bulk_discounts(min_qty, max_qty, discount_percent, is_active))',
        )
        .eq('category_id', cat.id)
        .order('name');
      if (catalogBranch) {
        pQuery = pQuery.eq('branch', catalogBranch);
      }

      let { data: productsData, error } = await pQuery;

      // Fallback: some legacy rows use branch.is.null while category is branch-scoped
      if (!error && (!productsData || productsData.length === 0) && catalogBranch) {
        const fallback = await supabase
          .from('products')
          .select(
            'id, name, image_url, is_hidden, product_variants(id, size, description, unit_price, total_stock, is_hidden, product_bulk_discounts(min_qty, max_qty, discount_percent, is_active))',
          )
          .eq('category_id', cat.id)
          .or(`branch.eq.${catalogBranch},branch.is.null`)
          .order('name');
        productsData = fallback.data;
        error = fallback.error;
      }

      if (error) {
        console.error('[OrderDetailPage] products load failed', error);
        setProductsLoadError(error.message || 'Failed to load products');
        return;
      }

      if (!productsData?.length) {
        setCategoryProducts([]);
        return;
      }

      // If nested variants didn't embed, fetch them directly (RLS / embed edge cases)
      const needsVariants = productsData.filter(
        (p: { id: string; product_variants?: unknown[] | null }) =>
          !(p.product_variants?.length),
      );
      if (needsVariants.length > 0) {
        const { data: variantRows } = await supabase
          .from('product_variants')
          .select(
            'id, product_id, size, description, unit_price, total_stock, is_hidden, product_bulk_discounts(min_qty, max_qty, discount_percent, is_active)',
          )
          .in(
            'product_id',
            needsVariants.map((p: { id: string }) => p.id),
          );
        const byProduct = new Map<string, NonNullable<(typeof productsData)[0]['product_variants']>>();
        for (const v of variantRows ?? []) {
          const pid = (v as { product_id: string }).product_id;
          const list = byProduct.get(pid) ?? [];
          list.push(v as NonNullable<(typeof productsData)[0]['product_variants']>[0]);
          byProduct.set(pid, list);
        }
        productsData = productsData.map((p: { id: string; product_variants?: unknown[] | null }) =>
          p.product_variants?.length ? p : { ...p, product_variants: byProduct.get(p.id) ?? [] },
        );
      }

      const allVariantIds = productsData.flatMap(
        (p: { product_variants?: { id: string }[] | null }) =>
          p.product_variants?.map((v) => v.id) ?? [],
      );
      const stockMap: Record<string, number> = {};
      if (allVariantIds.length > 0 && branchRow) {
        const { data: stockData } = await supabase
          .from('product_variant_stock')
          .select('variant_id, quantity')
          .eq('branch_id', branchRow.id)
          .in('variant_id', allVariantIds);
        (stockData ?? []).forEach((s: { variant_id: string; quantity: number }) => {
          stockMap[s.variant_id] = s.quantity;
        });
      }

      const mapped: DBProductDet[] = productsData
        .filter((p: { is_hidden?: boolean | null }) => p.is_hidden !== true)
        .map((p: {
          id: string;
          name: string;
          image_url?: string | null;
          product_variants?: Array<{
            id: string;
            size: string;
            description?: string | null;
            unit_price?: number | null;
            total_stock?: number | null;
            is_hidden?: boolean | null;
            product_bulk_discounts?: Array<{
              min_qty: number;
              max_qty: number | null;
              discount_percent: number;
              is_active?: boolean | null;
            }> | null;
          }> | null;
        }) => ({
          id: p.id,
          name: p.name,
          image_url: p.image_url ?? null,
          variants: (p.product_variants ?? [])
            .filter((v) => v.is_hidden !== true)
            .map((v) => ({
              id: v.id,
              size: v.size,
              description: v.description ?? null,
              unit_price: Number(v.unit_price ?? 0),
              stock: stockMap[v.id] ?? v.total_stock ?? 0,
              bulk_discounts: (v.product_bulk_discounts ?? [])
                .filter((d) => d.is_active)
                .map((d) => ({
                  min_qty: d.min_qty,
                  max_qty: d.max_qty,
                  discount_percent: Number(d.discount_percent),
                })),
            })),
        }));

      setCategoryProducts(mapped);
      setProductCache((prev) => {
        const next = { ...prev };
        mapped.forEach((p) => {
          next[p.id] = p;
        });
        return next;
      });
    } catch (e: unknown) {
      console.error('[OrderDetailPage] products load failed', e);
      setProductsLoadError(e instanceof Error ? e.message : 'Failed to load products');
    } finally {
      setProductsLoading(false);
    }
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
    setProductsLoadError(null);
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
      cachedProduct = (Object.values(productCache) as DBProductDet[]).find(p =>
        p.variants.some(v => v.id.toLowerCase() === variantUuid.toLowerCase())
      ) ?? null;
      cachedVariant = cachedProduct?.variants.find(
        v => v.id.toLowerCase() === variantUuid.toLowerCase()
      ) ?? null;
    }

    // Name-based fallback for legacy items with no variant identifier
    if (!cachedProduct && item.productName) {
      cachedProduct = (Object.values(productCache) as DBProductDet[]).find(
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
      patchEditedOrder((prev) => ({
        items: prev.items.map((i) => (i.id === editingItemId ? updatedItem : i)),
      }));
    } else {
      patchEditedOrder((prev) => ({ items: [...prev.items, updatedItem] }));
    }

    // Persist discount names to DB immediately so the customer portal can list each discount
    if (id && editingItemId && isPersistedOrderLineId(editingItemId)) {
      const breakdownPayload =
        discountsForItem.length > 0
          ? discountsForItem.map((d) => ({ name: d.name, percentage: d.percentage }))
          : null;
      void supabase
        .from('order_line_items')
        .update({
          quantity: parsedQty,
          unit_price: variantPrice,
          discount_percent: totalDiscount,
          discount_amount: gross - finalTotal,
          line_total: finalTotal,
          discounts_breakdown: breakdownPayload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingItemId)
        .eq('order_id', id)
        .then(({ error: lineErr }) => {
          if (lineErr) {
            console.warn('Line item saved in editor but discount breakdown not synced:', lineErr.message);
          }
        });
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
    setProofType(documentsProofTab);
    setSelectedProofGalleryUrls([]);
    setSelectedProofLocalFiles([]);
    setProofNotes('');
    setProofDocTitle('');
    setProofMoneyPayment('');
    setProofPaymentCredit('');
    setCustomerCreditSummary(null);
    if (order?.customerId) {
      void loadCustomerCreditSummary(order.customerId);
    }
    setShowProofModal(true);
  };

  const proofUserNotesFromRaw = (raw: string | undefined): string => {
    if (!raw?.trim()) return '';
    const parsed = parseProofNotes(raw);
    return parsed.notes?.trim() || (parsed.amount != null ? '' : raw.trim());
  };

  const openProofEditModal = (proof: ProofDocument) => {
    setEditingProof(proof);
    setEditProofTitle(proof.title?.trim() || '');
    setEditProofNotes(proofUserNotesFromRaw(proof.notes));
    setEditProofMoney(String(proof.paymentCashAmount ?? 0));
    setEditProofCredit(String(proof.paymentCreditAmount ?? 0));
    setShowProofEditModal(true);
  };

  const closeProofEditModal = () => {
    setShowProofEditModal(false);
    setEditingProof(null);
    setEditProofTitle('');
    setEditProofNotes('');
    setEditProofMoney('');
    setEditProofCredit('');
  };

  const handleSaveProofEdit = async () => {
    if (!id || !order || !editingProof) return;

    const titleTrim = editProofTitle.trim();
    const notesTrim = editProofNotes.trim() || null;
    const paymentCash =
      editingProof.type === 'payment' ? Math.max(0, Number(editProofMoney) || 0) : 0;
    const paymentCredit =
      editingProof.type === 'payment' ? Math.max(0, Number(editProofCredit) || 0) : 0;
    const paymentAdj = roundMoney(editingProof.paymentAdjustment ?? 0);

    if (editingProof.type === 'payment') {
      const thisTotal = roundMoney(paymentCash + paymentCredit + paymentAdj);
      if (thisTotal > editProofAmountPool + 0.01) {
        alert(
          `Payment for this proof cannot exceed ₱${editProofAmountPool.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} (remaining balance plus what this proof already records).`,
        );
        return;
      }
      if (paymentCredit > 0) {
        if (!order.customerId) {
          alert('Link a customer to this order before applying credit.');
          return;
        }
        if (!customerCreditSummary || customerCreditSummary.creditLimit <= 0) {
          alert('This customer has no credit limit.');
          return;
        }
        const maxCr = getMaxProofCreditAmount();
        const creditHeadroom = roundMoney(maxCr + (editingProof.paymentCreditAmount ?? 0));
        if (paymentCredit > creditHeadroom + 0.01) {
          alert(`Credit cannot exceed ₱${creditHeadroom.toLocaleString()} for this order.`);
          return;
        }
      }
    }

    let creditBefore: number | undefined;
    if (editingProof.type === 'payment') {
      const agg = await fetchPaymentProofAggregates(id);
      creditBefore = agg.totalCredit;
    }

    const notesForDb =
      editingProof.type === 'payment'
        ? encodeOrderProofPaymentNotes({
            cash: paymentCash,
            credit: paymentCredit,
            adjustment: paymentAdj,
            userNotes: notesTrim,
          })
        : notesTrim;

    setProofEditBusy(true);
    try {
      const { error: upErr } = await updateOrderProofDocument(
        editingProof.id,
        {
          title: titleTrim || null,
          notes: notesForDb,
          payment_cash_amount: editingProof.type === 'payment' ? paymentCash : undefined,
          payment_credit_amount: editingProof.type === 'payment' ? paymentCredit : undefined,
          payment_adjustment: editingProof.type === 'payment' ? paymentAdj : undefined,
        },
        {
          proofType: editingProof.type,
          userNotes: notesTrim,
        },
      );
      if (upErr) {
        if (isSchemaColumnError(upErr)) {
          console.error('[OrderDetailPage] proof update schema', upErr);
        }
        alert(
          isSchemaColumnError(upErr)
            ? 'Unable to save this proof. Please contact your administrator.'
            : upErr,
        );
        return;
      }

      if (editingProof.type === 'payment') {
        const s = await syncOrderPaymentsFromProofs(id, { creditAppliedBefore: creditBefore });
        if (s.ok === false) {
          alert(s.error);
          return;
        }
        await refreshOrderPaymentFieldsFromDb();
        if (order.customerId) {
          await loadCustomerCreditSummary(order.customerId);
        }
      }

      await insertOrderLog(
        'proof_updated',
        `Updated ${editingProof.type} proof: ${editingProof.fileName}`,
        {
          title: editingProof.title ?? null,
          notes: editingProof.notes ?? null,
          paymentCashAmount: editingProof.paymentCashAmount ?? 0,
          paymentCreditAmount: editingProof.paymentCreditAmount ?? 0,
        },
        {
          title: titleTrim || null,
          notes: notesTrim,
          paymentCashAmount: paymentCash,
          paymentCreditAmount: paymentCredit,
        },
        { proofId: editingProof.id },
      );

      closeProofEditModal();
      await reloadProofsFromDb(order.id);
    } finally {
      setProofEditBusy(false);
    }
  };

  const handleRemoveProof = async (proof: ProofDocument) => {
    if (!id || !order) return;
    if (!window.confirm(`Remove "${proof.title || proof.fileName}" from this order?`)) return;
    let creditBefore: number | undefined;
    if (proof.type === 'payment') {
      const agg = await fetchPaymentProofAggregates(id);
      creditBefore = agg.totalCredit;
    }
    const storagePath = tryExtractStoragePathFromPublicUrl(proof.fileUrl);
    const { error: delErr } = await supabase.from('order_proof_documents').delete().eq('id', proof.id);
    if (delErr) {
      alert(delErr.message);
      return;
    }
    if (storagePath) {
      await supabase.storage.from('images').remove([storagePath]).catch(() => undefined);
    }
    await insertOrderLog(
      'proof_removed',
      `Removed ${proof.type} proof: ${proof.fileName}`,
      { proofId: proof.id, type: proof.type },
      null,
      { proofId: proof.id, fileName: proof.fileName },
    );
    if (proof.type === 'payment' && creditBefore !== undefined) {
      const s = await syncOrderPaymentsFromProofs(id, { creditAppliedBefore: creditBefore });
      if (s.ok === false) {
        alert(s.error);
      } else {
        await refreshOrderPaymentFieldsFromDb();
      }
      if (order.customerId) {
        await loadCustomerCreditSummary(order.customerId);
      }
    }
    await reloadProofsFromDb(order.id);
  };

  const proofNeedsCommissionRelease = (proof: ProofDocument) =>
    proof.type === 'payment' &&
    proofRequiresCommissionPayout({
      id: proof.id,
      type: proof.type,
      payment_cash_amount: proof.paymentCashAmount,
      payment_credit_amount: proof.paymentCreditAmount,
      payment_adjustment: proof.paymentAdjustment,
      notes: proof.notes ?? null,
      commission_paid_at: proof.commissionPaidAt,
    });

  const refreshOrderSnapshotAfterFinance = async () => {
    if (!id || !order) return;
    const { data } = await supabase
      .from('orders')
      .select('status, payment_status, amount_paid, balance_due')
      .eq('id', id)
      .maybeSingle();
    if (!data) return;
    setOrder((o) => {
      if (!o) return o;
      const derived = deriveOrderPaymentFields(
        o.totalAmount,
        Number(data.amount_paid ?? 0),
        Number(data.balance_due ?? 0),
      );
      return {
        ...o,
        status: data.status as OrderDetail['status'],
        paymentStatus: data.payment_status as OrderDetail['paymentStatus'],
        amountPaid: derived.amountPaid,
        balanceDue: derived.balanceDue,
      };
    });
  };

  const handleReleaseProofCommission = async (proof: ProofDocument) => {
    if (!perms.commissionRelease || !id || !order) return;
    const cash = proof.paymentCashAmount ?? 0;
    if (
      !window.confirm(
        `Mark commission as paid for this cash payment (₱${cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})?`,
      )
    ) {
      return;
    }
    const paidBy = employeeName || session?.user?.email || role || 'Executive';
    setReleasingCommissionProofId(proof.id);
    try {
      const { orderCompleted } = await markProofCommissionPaid(proof.id, { paidBy });
      await reloadProofsFromDb(order.id);
      await refreshOrderSnapshotAfterFinance();
      addAuditLog(
        'Commission released',
        'Order',
        `${order.id} · proof ${proof.title || proof.fileName} · ₱${cash.toLocaleString()} cash`,
      );
      if (orderCompleted) {
        window.alert('Commission released. Order is now marked Completed.');
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Failed to release commission');
    } finally {
      setReleasingCommissionProofId(null);
    }
  };

  const handleReleaseAllPendingCommissions = async () => {
    if (!perms.commissionRelease || !id || !order) return;
    const pending = proofs.filter((p) => proofNeedsCommissionRelease(p) && !p.commissionPaidAt);
    if (pending.length === 0) return;
    const pendingTotal = pending.reduce(
      (sum, p) => sum + computeProofCommissionForClientType(p.paymentCashAmount ?? 0, customerClientType),
      0,
    );
    if (
      !window.confirm(
        `Mark all ${pending.length} pending commission(s) as paid out (₱${pendingTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})?`,
      )
    ) {
      return;
    }
    const paidBy = employeeName || session?.user?.email || role || 'Executive';
    setMarkingAllCommissions(true);
    try {
      const { orderCompleted, releasedCount } = await markAllProofCommissionsPaidForOrder(id, { paidBy });
      await reloadProofsFromDb(order.id);
      await refreshOrderSnapshotAfterFinance();
      addAuditLog(
        'Bulk commission release',
        'Order',
        `${order.id} · ${releasedCount} proof(s) · ₱${pendingTotal.toLocaleString()} commission`,
      );
      if (orderCompleted) {
        window.alert(`Marked ${releasedCount} commission(s) as paid. Order is now Completed.`);
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Failed to mark all commissions as paid');
    } finally {
      setMarkingAllCommissions(false);
    }
  };

  const handleUploadProof = async () => {
    if (!order || !id) return;
    const nGallery = selectedProofGalleryUrls.length;
    const nFiles = selectedProofLocalFiles.length;
    const paymentCashEarly = proofType === 'payment' ? Math.max(0, Number(proofMoneyPayment) || 0) : 0;
    const paymentCreditEarly = proofType === 'payment' ? Math.max(0, Number(proofPaymentCredit) || 0) : 0;
    const paymentOnlyNoFiles =
      proofType === 'payment' && nGallery === 0 && nFiles === 0 && paymentCashEarly + paymentCreditEarly > 0;
    if (nGallery === 0 && nFiles === 0 && !paymentOnlyNoFiles) {
      alert(
        proofType === 'payment'
          ? 'Attach a file, or enter a cash/credit payment amount to record payment without an attachment.'
          : 'Attach at least one image or document to save a proof, or click Cancel to skip.',
      );
      return;
    }
    if (nGallery + nFiles > MAX_PROOF_BATCH) {
      alert(`You can add at most ${MAX_PROOF_BATCH} files per upload. Remove some attachments first.`);
      return;
    }

    const paymentCash = proofType === 'payment' ? Math.max(0, Number(proofMoneyPayment) || 0) : 0;
    const paymentCredit = proofType === 'payment' ? Math.max(0, Number(proofPaymentCredit) || 0) : 0;
    const paymentAdj = 0;

    let proofPaidBefore = 0;
    let creditBefore = 0;
    if (proofType === 'payment') {
      const agg = await fetchPaymentProofAggregates(id);
      proofPaidBefore = agg.totalPaid;
      creditBefore = agg.totalCredit;

      const balanceRemaining = deriveOrderPaymentFields(
        order.totalAmount,
        order.amountPaid,
        order.balanceDue,
      ).balanceDue;
      const thisPayment = roundMoney(paymentCash + paymentCredit);

      const n = nGallery + nFiles;
      if (n > 1 && thisPayment > 0) {
        alert(
          'Payment amounts: upload one file at a time so cash/credit apply to a single proof (or leave amounts at zero for multiple attachments).',
        );
        return;
      }
      if (thisPayment > balanceRemaining + 0.01) {
        alert(
          `This payment (₱${thisPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) exceeds the remaining balance of ₱${balanceRemaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
        );
        return;
      }
      if (paymentCredit > 0 && !order.customerId) {
        alert('This order has no linked customer — credit cannot be applied.');
        return;
      }
      if (paymentCredit > 0) {
        if (!customerCreditSummary || customerCreditSummary.creditLimit <= 0) {
          alert('This customer has no credit limit set.');
          return;
        }
        const maxCr = getMaxProofCreditAmount();
        if (maxCr <= 0) {
          alert('No available customer credit for this order.');
          return;
        }
        if (paymentCredit > maxCr + 0.01) {
          alert(`Credit cannot exceed ₱${maxCr.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (available for this order).`);
          return;
        }
      }
    }

    const dbType = proofType;
    const uploaderRole: ProofDocument['uploadedByRole'] =
      role === 'Logistics' || role === 'Driver' ? 'Logistics' : 'Agent';
    const uploadedBy = employeeName || session?.user?.email || order.agent;
    const notesTrim = proofNotes.trim() || null;
    const titleBase = proofDocTitle.trim();
    const nowIso = new Date().toISOString();

    setProofUploadBusy(true);
    try {
      const rows: Parameters<typeof insertOrderProofDocuments>[0] = [];

      for (let i = 0; i < selectedProofGalleryUrls.length; i++) {
        const url = selectedProofGalleryUrls[i]!;
        const raw = url.split('/').pop()?.split('?')[0] ?? 'image';
        let fileName = raw;
        try {
          fileName = decodeURIComponent(raw);
        } catch {
          fileName = raw;
        }
        const defaultTitle = titleBase || fileName;
        rows.push({
          order_id: id,
          type: dbType,
          file_name: fileName,
          file_url: url,
          file_size: 0,
          uploaded_by: uploadedBy,
          uploaded_by_role: uploaderRole,
          status: 'verified',
          title: defaultTitle,
          notes: notesTrim,
          payment_cash_amount: proofType === 'payment' ? paymentCash : 0,
          payment_credit_amount: proofType === 'payment' ? paymentCredit : 0,
          payment_adjustment: proofType === 'payment' ? paymentAdj : 0,
        });
      }

      for (const file of selectedProofLocalFiles) {
        const { publicUrl } = await uploadOrderProofBinary(id, dbType, file);
        const defaultTitle = titleBase || file.name;
        rows.push({
          order_id: id,
          type: dbType,
          file_name: file.name,
          file_url: publicUrl,
          file_size: file.size,
          uploaded_by: uploadedBy,
          uploaded_by_role: uploaderRole,
          status: 'verified',
          title: defaultTitle,
          notes: notesTrim,
          payment_cash_amount: proofType === 'payment' ? paymentCash : 0,
          payment_credit_amount: proofType === 'payment' ? paymentCredit : 0,
          payment_adjustment: proofType === 'payment' ? paymentAdj : 0,
        });
      }

      if (paymentOnlyNoFiles) {
        rows.push({
          order_id: id,
          type: dbType,
          file_name: 'Payment record (no attachment)',
          file_url: '',
          file_size: 0,
          uploaded_by: uploadedBy,
          uploaded_by_role: uploaderRole,
          status: 'verified',
          title: titleBase || 'Payment record',
          notes: notesTrim,
          payment_cash_amount: paymentCash,
          payment_credit_amount: paymentCredit,
          payment_adjustment: paymentAdj,
        });
      }

      const { data: inserted, error: insErr } = await insertOrderProofDocuments(rows);
      if (insErr) {
        if (isSchemaColumnError(insErr)) {
          console.error('[OrderDetailPage] proof insert schema', insErr);
        }
        alert(
          isSchemaColumnError(insErr)
            ? 'Unable to save this proof. Please contact your administrator.'
            : insErr,
        );
        return;
      }
      const insertedIds = (inserted ?? []).map((r) => r.id);

      if (proofType === 'payment') {
        const prevPaid = order.amountPaid;
        const prevBal = order.balanceDue;
        const prevSt = order.paymentStatus;
        const overrideTotalPaid = computeOrderAmountPaidAfterProofIncrement({
          proofPaidBefore,
          orderAmountPaid: order.amountPaid,
          cashIncrement: paymentCash,
          creditIncrement: paymentCredit,
        });
        const s = await syncOrderPaymentsFromProofs(id, {
          creditAppliedBefore: creditBefore,
          overrideTotalPaid,
        });
        if (s.ok === false) {
          if (insertedIds.length) {
            await supabase.from('order_proof_documents').delete().in('id', insertedIds);
          }
          alert(s.error);
          return;
        }
        await refreshOrderPaymentFieldsFromDb();
        if (order.customerId) {
          await loadCustomerCreditSummary(order.customerId);
        }
        const { data: fresh } = await supabase
          .from('orders')
          .select('amount_paid, balance_due, payment_status')
          .eq('id', id)
          .maybeSingle();
        await insertOrderLog(
          'payment_status_changed',
          `Payment totals updated from proof upload (cash ₱${paymentCash.toLocaleString()}, credit ₱${paymentCredit.toLocaleString()}).`,
          {
            amount_paid: prevPaid,
            balance_due: prevBal,
            paymentStatus: prevSt,
          },
          fresh
            ? {
                amount_paid: Number(fresh.amount_paid),
                balance_due: Number(fresh.balance_due),
                paymentStatus: fresh.payment_status,
              }
            : null,
          { fileNames: rows.map((r) => r.file_name) },
        );
      }

      const names = rows.map((r) => r.file_name).join(', ');
      const typeLabel =
        proofType === 'delivery' ? 'Proof of delivery' : proofType === 'payment' ? 'Proof of payment' : 'Other document';
      await insertOrderLog(
        'proof_uploaded',
        `${typeLabel}: ${rows.length} file(s) — ${names}`,
        null,
        null,
        { count: rows.length, fileNames: names, source: 'order_proof_modal', type: proofType },
      );
      addAuditLog(typeLabel, 'Order', `Attached ${rows.length} file(s) to order ${order.id}`);

      if (proofType === 'delivery' || proofType === 'other') {
        void notifyAgentOrderProofUploaded(id, {
          proofType,
          uploadedBy: uploadedBy,
          uploaderEmployeeId: employeeId,
          proofCount: rows.length,
          proofTitle: titleBase || null,
          proofNotes: notesTrim,
        }).catch((notifyErr) => {
          console.warn('[OrderDetailPage] agent proof notify failed', notifyErr);
        });
      }

      if (proofType === 'payment') {
        void notifyOrderPaymentProofRecorded(id, {
          uploadedBy,
          uploaderEmployeeId: employeeId,
          proofCount: rows.length,
          proofTitle: titleBase || null,
          proofNotes: notesTrim,
          paymentCash,
          paymentCredit,
        }).catch((notifyErr) => {
          console.warn('[OrderDetailPage] payment proof notify failed', notifyErr);
        });
      }

      alert(`${typeLabel} added.\n\n${rows.length} file(s): ${names}`);

      setSelectedProofGalleryUrls([]);
      setSelectedProofLocalFiles([]);
      setProofNotes('');
      setProofDocTitle('');
      setProofMoneyPayment('');
      setProofPaymentCredit('');
      setShowProofModal(false);
      await reloadProofsFromDb(order.id);
    } finally {
      setProofUploadBusy(false);
    }
  };

  const handleStatusChange = (newStatus: OrderStatus) => {
    patchEditedOrder({ status: newStatus });
  };

  const handlePaymentStatusChange = (newPaymentStatus: string) => {
    patchEditedOrder({ paymentStatus: newPaymentStatus as OrderDetail['paymentStatus'] });
  };

  const displayOrder = isEditing && editedOrder ? editedOrder : order;
  const paymentSummary = displayOrder
    ? deriveOrderPaymentFields(displayOrder.totalAmount, displayOrder.amountPaid, displayOrder.balanceDue)
    : null;
  const proofModalPayment = order
    ? deriveOrderPaymentFields(order.totalAmount, order.amountPaid, order.balanceDue)
    : null;

  const documentProofsFiltered = order ? proofs.filter((p) => p.type === documentsProofTab) : [];
  const pendingCommissionProofs = proofs.filter((p) => proofNeedsCommissionRelease(p) && !p.commissionPaidAt);

  // Compute effective discount % for a line item (fall back to amount-based calculation)
  const effectiveDiscountPct = (item: OrderLineItem) => {
    if (item.discountPercent > 0) return item.discountPercent;
    const gross = item.unitPrice * item.quantity;
    if (gross > 0 && item.lineTotal < gross) return ((gross - item.lineTotal) / gross) * 100;
    return 0;
  };

  const lineGrossSubtotal = (item: OrderLineItem) => item.unitPrice * item.quantity;

  const fmtMoney = (n: number) =>
    n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  /**
   * Sequential compound discount deductions (same logic as Update Item modal).
   * If there is no JSON breakdown but line_total reflects a discount, show one aggregate row.
   */
  const lineItemDiscountDeductions = (item: OrderLineItem): Array<{ label: string; amount: number }> => {
    const gross = lineGrossSubtotal(item);
    let cur = gross;
    const rows: Array<{ label: string; amount: number }> = [];

    if (item.discountsBreakdown && item.discountsBreakdown.length > 0) {
      item.discountsBreakdown.forEach((d, i) => {
        const pct = Number(d.percentage);
        if (!(pct > 0 && pct <= 100)) return;
        const amt = cur * (pct / 100);
        rows.push({
          label: `${d.name?.trim() || `Discount ${i + 1}`} (${pct}%)`,
          amount: amt,
        });
        cur -= amt;
      });
    }

    if (rows.length === 0 && gross > item.lineTotal + 1e-6) {
      const pct = effectiveDiscountPct(item);
      rows.push({
        label: pct > 0 ? `Discount (${pct.toFixed(1)}%)` : 'Discount',
        amount: gross - item.lineTotal,
      });
    }

    return rows;
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
    'Cancelled',
    'Rejected',
  ];

  const allPaymentStatuses = ['Unbilled', 'Invoiced', 'Partially Paid', 'Paid', 'Overdue', 'On Credit'];

  const canUseLogisticsUi = perms.scheduling || perms.deliveries;
  /** Request-phase orders: agents set required date / delivery type at creation; logistics edits them later. */
  const canEditOrderDeliveryFields =
    perms.deliveries ||
    (perms.creation && ['Draft', 'Pending', 'Rejected'].includes(order.status));
  const LOGISTICS_FLOW_STEPS: OrderStatus[] = [
    'Approved',
    'Scheduled',
    'Loading',
    'Packed',
    'In Transit',
    'Delivered',
  ];
  const showLogisticsBadges =
    !isEditing && (LOGISTICS_FLOW_STEPS.includes(order.status) || order.status === 'Ready');
  const logisticsReplacesFulfill =
    canUseLogisticsUi &&
    !isEditing &&
    ['Approved', 'Scheduled', 'Loading', 'Packed', 'Ready', 'In Transit'].includes(order.status);
  /** Ready orders (legacy) sit at the same step as Packed for the progress UI. */
  const logisticsStepIndex =
    order.status === 'Ready' ? LOGISTICS_FLOW_STEPS.indexOf('Packed') : LOGISTICS_FLOW_STEPS.indexOf(order.status);
  /** After partial delivery, same next step as Approved: schedule remaining shipment. */
  const showScheduleAction =
    canUseLogisticsUi && !isEditing && (order.status === 'Approved' || order.status === 'Partially Fulfilled');
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

  const delayedTripsForOrder = orderTripsWithDelayInfo.filter(
    (t) => t.status === 'Delayed' || (Boolean(t.delayReason?.trim()) && t.status !== 'Completed'),
  );
  const showTripDelayBanner = delayedTripsForOrder.length > 0;

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
              <Button variant="outline" onClick={handleCancelEdit} disabled={saveSubmitting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleSave()}
                disabled={saveSubmitting}
                className="gap-2 min-w-[9.5rem]"
              >
                {saveSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              {order.status === 'Pending' && (
                <>
                  {perms.approvals && (
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
                    </>
                  )}
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
              {order.status === 'Draft' && perms.creation && (
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
              {showScheduleAction && perms.scheduling && (
                <Button
                  variant="primary"
                  className="gap-2"
                  onClick={() => {
                    if (!id || !order) return;
                    const isShip = order.deliveryType === 'Ship';
                    if (order.branch?.trim()) setBranch(order.branch.trim());
                    const q = new URLSearchParams({ order: id });
                    if (isShip) {
                      q.set('tab', 'dispatch');
                      q.set('mode', 'interisland');
                    } else {
                      q.set('tab', 'routes');
                    }
                    const dateSource = order.scheduledDepartureDate || order.requiredDate;
                    if (dateSource) {
                      const rd = String(dateSource).slice(0, 10);
                      if (/^\d{4}-\d{2}-\d{2}$/.test(rd)) q.set('date', rd);
                    }
                    navigate(`/logistics?${q.toString()}`);
                  }}
                >
                  <Route className="h-4 w-4" />
                  {order.deliveryType === 'Ship' ? 'Schedule shipment' : 'Plan route'}
                </Button>
              )}
              {logisticsReplacesFulfill && order.status === 'Scheduled' && perms.scheduling && (
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
              {logisticsReplacesFulfill && order.status === 'Loading' && perms.scheduling && (
                <Button
                  variant="primary"
                  className="gap-2"
                  disabled={logisticsLoading}
                  onClick={() => {
                    shipQtyNextOrderStatusRef.current = 'Packed';
                    setShowInTransitModal(true);
                  }}
                >
                  {logisticsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="w-4 h-4" />}
                  Mark Packed
                </Button>
              )}
              {logisticsReplacesFulfill && (order.status === 'Packed' || order.status === 'Ready') && perms.scheduling && (
                <Button
                  variant="primary"
                  className="gap-2"
                  disabled={logisticsLoading || inTransitSubmitting}
                  onClick={() => {
                    shipQtyNextOrderStatusRef.current = 'In Transit';
                    const rows = order.items.map((li) => ({
                      itemId: li.id,
                      shippedQuantity: remainingToShipForLine(li, order.status),
                    }));
                    void handleConfirmInTransit(rows);
                  }}
                >
                  {inTransitSubmitting || logisticsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Truck className="w-4 h-4" />
                  )}
                  Mark in transit
                </Button>
              )}
              {logisticsReplacesFulfill && order.status === 'In Transit' && perms.deliveries && (
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
              {showLegacyFulfillButton && perms.deliveries && (
                <Button variant="primary" onClick={() => setShowFulfillModal(true)} className="gap-2">
                  <Package className="w-4 h-4" />
                  Fulfill Order
                </Button>
              )}
              {order.status === 'Rejected' && perms.creation && (
                <Button variant="primary" onClick={() => void handleResubmit()} className="gap-2" disabled={approvalLoading}>
                  {approvalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Resubmit
                </Button>
              )}
              {!['Cancelled', 'Rejected', 'Delivered'].includes(order.status) && perms.cancellation && (
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="inline-flex min-h-[2.5rem] shrink-0 items-center justify-center gap-2 rounded-lg border-2 border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 sm:px-5"
                >
                  <X className="h-4 w-4 shrink-0" />
                  Cancel Order
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {saveSuccessVisible && (
        <div
          className="flex items-center gap-3 rounded-xl border border-green-300 bg-green-50 p-4 shadow-sm"
          role="status"
          aria-live="polite"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-green-900">Changes saved successfully</p>
            <p className="mt-0.5 text-xs text-green-700">Order details and line items were updated.</p>
          </div>
          <button
            type="button"
            onClick={() => setSaveSuccessVisible(false)}
            className="shrink-0 rounded-md p-1 text-green-700 hover:bg-green-100"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

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
          {perms.approvals && (
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
          )}
        </div>
      )}

      {/* Edit Mode Banner */}
      {isEditing && (
        <div
          className={`rounded-lg border-l-4 p-4 ${
            saveSubmitting
              ? 'border-blue-500 bg-blue-50'
              : 'border-amber-400 bg-amber-50'
          }`}
        >
          <div className="flex items-center gap-3">
            {saveSubmitting ? (
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            )}
            <div>
              <p className={`text-sm font-medium ${saveSubmitting ? 'text-blue-900' : 'text-amber-900'}`}>
                {saveSubmitting ? 'Saving your changes…' : 'Edit mode active'}
              </p>
              <p className={`text-xs mt-1 ${saveSubmitting ? 'text-blue-700' : 'text-amber-700'}`}>
                {saveSubmitting
                  ? 'Please wait — do not leave this page until save completes.'
                  : "You can change order/payment status, modify quantities, add or remove products. Click Save Changes when you're done."}
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
                  {allStatuses
                    .filter(
                      (status) =>
                        perms.approvals ||
                        status === displayOrder.status ||
                        (status !== 'Approved' && status !== 'Rejected'),
                    )
                    .map(status => (
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
                    patchEditedOrder({ urgency: e.target.value as OrderUrgency })
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
            {perms.payment && (
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
            )}
            {perms.payment && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">₱{displayOrder.totalAmount.toLocaleString()}</p>
                {displayOrder.discountPercent > 0 && (
                  <p className="text-sm text-gray-500">-{displayOrder.discountPercent.toFixed(1)}% discount</p>
                )}
              </div>
            )}
            {perms.payment && (
              <div>
                <p className="text-sm text-gray-500 mb-2">Balance Due</p>
                <p className="text-2xl font-bold text-gray-900">
                  ₱{(paymentSummary?.balanceDue ?? displayOrder.balanceDue).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {showTripDelayBanner && (
        <Card className="border-red-200 bg-red-50/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-red-950">
              <Clock className="w-5 h-5 text-red-700" />
              Trip delay
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {delayedTripsForOrder.map((t) => (
              <div key={t.id} className="rounded-lg border border-red-200/80 bg-white p-3 text-sm">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Trip {t.tripNumber}</p>
                <p className="text-gray-900 mt-1 whitespace-pre-wrap">
                  {t.delayReason || 'This trip is marked delayed.'}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
            {isEditing && editedOrder && perms.customerSetup ? (
              <div className="space-y-3">
                <div className="relative" ref={customerSearchRef}>
                  <label className="text-xs text-gray-500" htmlFor="order-customer-search">
                    Search customers
                  </label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      id="order-customer-search"
                      type="search"
                      placeholder={
                        !editedOrder.agentId?.trim()
                          ? 'Select an agent first…'
                          : customersLoading
                            ? 'Loading customers…'
                            : 'Search by name or contact…'
                      }
                      value={customerSearchQuery}
                      onChange={(e) => {
                        setCustomerSearchQuery(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => {
                        if (editedOrder.agentId?.trim()) setShowCustomerDropdown(true);
                      }}
                      disabled={customersLoading || !editedOrder.agentId?.trim()}
                      className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none bg-white disabled:bg-gray-50 disabled:text-gray-500"
                      autoComplete="off"
                    />
                    {customersLoading && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                    )}
                  </div>

                  {showCustomerDropdown && (
                    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      {customersLoading ? (
                        <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-gray-500">
                          <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                          Loading customers…
                        </div>
                      ) : filteredCustomersForSelect.length > 0 ? (
                        filteredCustomersForSelect.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectCustomerForOrder(c)}
                            className="w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-sm text-gray-900 truncate">{c.name}</div>
                                {c.contact_person && (
                                  <div className="text-xs text-gray-500 mt-0.5 truncate">{c.contact_person}</div>
                                )}
                              </div>
                              {editedOrder.customerId === c.id && (
                                <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                              )}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-6 text-center text-sm text-gray-500">
                          {!editedOrder.agentId?.trim()
                            ? 'Select an agent to see their customers'
                            : customerList.length === 0
                              ? 'No active customers assigned to this agent'
                              : 'No customers match your search'}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {editedOrder.customerId && editedOrder.customer && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm text-gray-900 truncate">{editedOrder.customer}</div>
                        <div className="text-xs text-gray-600">Customer selected</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          patchEditedOrder({ customerId: '', customer: '' });
                          setCustomerSearchQuery('');
                          setShowCustomerDropdown(true);
                        }}
                        className="text-xs text-red-600 hover:text-red-700 font-medium shrink-0"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                )}

                {!customersLoading && !editedOrder.agentId?.trim() && (
                  <p className="text-xs text-amber-700">
                    Choose an agent in Agent &amp; Branch before selecting a customer.
                  </p>
                )}
                {!customersLoading && editedOrder.agentId?.trim() && customerList.length === 0 && (
                  <p className="text-xs text-amber-700">
                    No active customers are assigned to this agent. Assign customers on the Customers page or under this agent&apos;s profile.
                  </p>
                )}
                <div className="pt-1">
                  <p className="text-xs text-gray-500">
                    Planned departure is set in{' '}
                    <span className="font-medium text-gray-700">
                      Logistics → {order.deliveryType === 'Ship' ? 'Inter-Island Shipments' : 'Route Planning'}
                    </span>{' '}
                    when this order is assigned to a {order.deliveryType === 'Ship' ? 'container shipment' : 'truck trip'}.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  {order.customerId ? (
                    <Link
                      to={`/customers/${order.customerId}`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {order.customer || 'View customer'}
                    </Link>
                  ) : (
                    <p className="text-sm font-medium text-gray-900">{order.customer || '—'}</p>
                  )}
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
                    No planned departure yet — assign this order in{' '}
                    <span className="font-medium text-gray-700">
                      Logistics → {order.deliveryType === 'Ship' ? 'Inter-Island Shipments' : 'Route Planning'}
                    </span>
                    {order.status === 'Approved' || order.status === 'Partially Fulfilled' ? (
                      <>
                        {' '}
                        (use{' '}
                        <span className="text-gray-600">
                          {order.deliveryType === 'Ship' ? 'Schedule shipment' : 'Plan route'}
                        </span>{' '}
                        above).
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
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center">
                <span className="text-gray-600">Order Date:</span>
                {isEditing && editedOrder ? (
                  <input
                    type="date"
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-900 w-full sm:w-auto max-w-[12rem]"
                    value={editedOrder.orderDate ? editedOrder.orderDate.slice(0, 10) : ''}
                    onChange={(e) => patchEditedOrder({ orderDate: e.target.value })}
                  />
                ) : (
                  <span className="font-medium text-gray-900">{order.orderDate || '—'}</span>
                )}
              </div>
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center">
                <span className="text-gray-600">Required Date:</span>
                {isEditing && editedOrder && canEditOrderDeliveryFields ? (
                  <input
                    type="date"
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-900 w-full sm:w-auto max-w-[12rem]"
                    value={editedOrder.requiredDate ? editedOrder.requiredDate.slice(0, 10) : ''}
                    onChange={(e) => patchEditedOrder({ requiredDate: e.target.value })}
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
                      patchEditedOrder({ urgency: e.target.value as OrderUrgency })
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
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center">
                <span className="text-gray-600">Delivery Type:</span>
                {isEditing && editedOrder && canEditOrderDeliveryFields ? (
                  branchHasShips === false ? (
                    <span className="font-medium text-gray-900">Truck</span>
                  ) : (
                    <select
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-900 w-full sm:w-auto max-w-[12rem] bg-white disabled:bg-gray-50 disabled:text-gray-500"
                      value={editedOrder.deliveryType ?? 'Truck'}
                      disabled={branchHasShips === null}
                      onChange={(e) =>
                        patchEditedOrder({ deliveryType: e.target.value as DeliveryType })
                      }
                    >
                      {ORDER_DELIVERY_TYPE_OPTIONS.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  )
                ) : (
                  <span className="font-medium text-gray-900">{order.deliveryType ?? 'Truck'}</span>
                )}
              </div>
              {isEditing && branchHasShips === false && (
                <p className="text-xs text-gray-500">
                  Ship delivery is unavailable — this branch has no shipping containers in fleet.
                </p>
              )}
              <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center">
                <span className="text-gray-600">Payment Terms:</span>
                {isEditing && editedOrder && perms.payment ? (
                  <select
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-900 w-full sm:w-auto max-w-[12rem] bg-white"
                    value={editedOrder.paymentTerms ?? 'COD'}
                    onChange={(e) => patchEditedOrder({ paymentTerms: e.target.value as PaymentTerms })}
                  >
                    {ORDER_PAYMENT_TERMS_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="font-medium text-gray-900">{order.paymentTerms}</span>
                )}
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
            {isEditing && editedOrder ? (
              <div className="space-y-3 text-sm">
                {perms.agentBranchSelection ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">Branch</label>
                      <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none bg-white"
                        value={editedOrder.branchId || ''}
                        onChange={(e) => {
                          const bid = e.target.value;
                          const b = branchList.find((x) => x.id === bid);
                          patchEditedOrder({
                            branchId: bid || undefined,
                            branch: b?.name ?? '',
                            agentId: '',
                            agent: '',
                            customerId: '',
                            customer: '',
                          });
                        }}
                      >
                        <option value="">— Select branch —</option>
                        {branchList.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">Agent</label>
                      <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none bg-white"
                        value={editedOrder.agentId || ''}
                        onChange={(e) => {
                          const v = e.target.value;
                          const a = agentList.find((x) => x.id === v);
                          patchEditedOrder({
                            agentId: v,
                            agent: a?.employee_name ?? '',
                            customerId: '',
                            customer: '',
                          });
                          setCustomerSearchQuery('');
                          setShowCustomerDropdown(Boolean(v));
                        }}
                      >
                        <option value="">— No agent assigned —</option>
                        {agentList.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.branch_name ? `${a.branch_name} — ` : ''}
                            {a.employee_name} ({a.employee_id})
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">Branch</label>
                      <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm font-medium text-gray-900">
                        {editedOrder.branch || branch || '—'}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-500">Assigned agent</label>
                      <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm font-medium text-gray-900">
                        {editedOrder.agent || employeeName || '—'}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Branch:</span>
                  <span className="font-medium text-gray-900">{order.branch || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Agent:</span>
                  <span className="font-medium text-gray-900">{order.agent || '—'}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order Items - Full Width */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Order Items</CardTitle>
          {isEditing && perms.creation && (
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
                          {perms.payment && item.negotiatedPrice && item.originalPrice && item.negotiatedPrice < item.originalPrice && (
                            <Badge variant="danger" className="text-xs">Negotiated</Badge>
                          )}
                        </div>
                        {perms.payment && (
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
                        )}
                        {perms.payment && item.discountsBreakdown && item.discountsBreakdown.length > 0 && (
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
                          Qty: {item.quantity}
                          {perms.payment && (
                            <>
                              {' '}× ₱{item.quantity > 0
                                ? (item.lineTotal / item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                : '0.00'}/unit
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5" onClick={(e) => e.stopPropagation()}>
                          <span className="text-xs text-gray-500">Delivered:</span>
                          {perms.deliveries ? (
                            <input
                              type="number"
                              min={0}
                              max={item.quantity}
                              value={deliveredDrafts[item.id] ?? (item.quantityDelivered ?? 0)}
                              onChange={(e) => setDeliveredDrafts((p) => ({ ...p, [item.id]: e.target.value }))}
                              onBlur={(e) => saveDelivered(item.id, e.target.value, item.quantity)}
                              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                              className="w-16 text-xs border border-gray-300 rounded px-1.5 py-0.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            />
                          ) : (
                            <span className="text-xs font-medium text-gray-900">{item.quantityDelivered ?? 0}</span>
                          )}
                          <span className="text-xs text-gray-400">/ {item.quantity}</span>
                        </div>
                      </div>

                      {perms.payment && (
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
                      )}

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
                  {perms.payment && (() => {
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
                        <div className="text-xs text-gray-500">Delivered</div>
                        <div className="font-medium text-gray-900">
                          {item.quantityDelivered ?? 0}
                          <span className="text-xs font-normal text-gray-400"> / {item.quantity}</span>
                        </div>
                      </div>
                      {perms.payment && (
                        <>
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
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {perms.payment && (
                  <div className="p-4 bg-gray-50 border-t-2 border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-700">Subtotal:</span>
                      <span className="font-bold text-gray-900 text-lg">₱{displayOrder.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left font-medium">SKU</th>
                      <th className="px-6 py-3 text-left font-medium">Product</th>
                      <th className="px-6 py-3 text-center font-medium">Qty</th>
                      <th className="px-6 py-3 text-center font-medium">Delivered</th>
                      {perms.payment && (
                        <>
                          <th className="px-6 py-3 text-right font-medium">List Price</th>
                          <th className="px-6 py-3 text-right font-medium">Final Price</th>
                          <th className="px-6 py-3 text-center font-medium">Discount</th>
                          <th className="px-6 py-3 text-right font-medium">Total</th>
                        </>
                      )}
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
                        <td className="px-6 py-4 text-center">
                          <span className="font-medium text-gray-900">{item.quantityDelivered ?? 0}</span>
                          <span className="text-xs text-gray-400"> / {item.quantity}</span>
                        </td>
                        {perms.payment && (
                          <>
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
                          </>
                        )}
                        <td className="px-6 py-4 text-center">
                          <Badge variant={item.stockHint === 'Available' ? 'success' : 'warning'}>
                            {item.stockHint}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                    {displayOrder.items.length === 0 && (
                      <tr>
                        <td colSpan={perms.payment ? 9 : 5} className="px-6 py-12 text-center text-gray-500">
                          <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                          <p className="font-medium">No items in this order</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {perms.payment && (
                    <tfoot className="bg-gray-50 border-t border-gray-200">
                      <tr>
                        <td colSpan={7} className="px-6 py-4 text-right font-semibold text-gray-700">Subtotal:</td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900">₱{displayOrder.totalAmount.toLocaleString()}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
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
      {perms.payment && (order.invoiceId || order.invoiceDate) && (
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
                <p className="font-medium text-gray-900 tabular-nums">
                  ₱{(proofModalPayment?.amountPaid ?? order.amountPaid).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-gray-600 mb-1">Balance Due</p>
                <p className="font-bold text-gray-900 tabular-nums">
                  ₱{(proofModalPayment?.balanceDue ?? order.balanceDue).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice & Proof Management */}
      <Card>
        <CardContent className="pt-6">
          {id && perms.orderSummary && (
            <div className="mb-6">
              <OrderCustomerPortalCard orderUuid={id} customerEmail={customerEmail} />
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documents & Proofs
            </h3>
            <div className="flex gap-2 flex-wrap">
              {perms.documents && (
                <Button variant="outline" size="sm" onClick={openProofDocumentModal} className="gap-2 flex-1 sm:flex-none">
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Upload Proof</span>
                  <span className="sm:hidden">Upload</span>
                </Button>
              )}
            </div>
          </div>

          {/* Payment Links Status */}
          {perms.payment && paymentLinks.length > 0 && (
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
          
          {perms.documents && (
          <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200 pb-3">
            {(['delivery', 'payment', 'other'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setDocumentsProofTab(tab)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  documentsProofTab === tab
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab === 'delivery' ? 'Delivery' : tab === 'payment' ? 'Payment' : 'Other'}
                <span className="ml-1.5 text-xs opacity-90">
                  ({proofs.filter((p) => p.type === tab).length})
                </span>
              </button>
            ))}
          </div>
          )}

          {/* Proofs List */}
          {perms.documents && (documentProofsFiltered.length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                <h4 className="text-sm font-semibold text-gray-700">
                  Uploaded — {documentsProofTab === 'delivery' ? 'Delivery' : documentsProofTab === 'payment' ? 'Payment' : 'Other'}
                </h4>
                {documentsProofTab === 'payment' && perms.commissionRelease && pendingCommissionProofs.length > 0 ? (
                  <Button
                    size="sm"
                    variant="primary"
                    className="gap-1.5"
                    disabled={markingAllCommissions}
                    onClick={() => void handleReleaseAllPendingCommissions()}
                  >
                    {markingAllCommissions ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Wallet className="w-3.5 h-3.5" />
                    )}
                    Release all pending ({pendingCommissionProofs.length})
                  </Button>
                ) : null}
              </div>
              {documentProofsFiltered.map((proof) => (
                <div key={proof.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center ${
                      proof.type === 'delivery' ? 'bg-blue-100' : proof.type === 'payment' ? 'bg-green-100' : 'bg-amber-100'
                    }`}>
                      {orderProofFileIsImageName(proof.fileName) ? (
                        <Image className={`w-5 h-5 ${
                          proof.type === 'delivery' ? 'text-blue-600' : proof.type === 'payment' ? 'text-green-600' : 'text-amber-700'
                        }`} />
                      ) : (
                        <FileText className={`w-5 h-5 ${
                          proof.type === 'delivery' ? 'text-blue-600' : proof.type === 'payment' ? 'text-green-600' : 'text-amber-700'
                        }`} />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{proof.title || proof.fileName}</p>
                      <p className="text-xs text-gray-500 truncate">{proof.fileName}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className="text-xs flex-shrink-0">
                          {proof.type === 'delivery' ? 'Delivery' : proof.type === 'payment' ? 'Payment' : 'Other'}
                        </Badge>
                        {proof.type === 'payment' &&
                          perms.commissionRelease &&
                          proofRequiresCommissionPayout({
                            id: proof.id,
                            type: proof.type,
                            payment_cash_amount: proof.paymentCashAmount,
                            payment_credit_amount: proof.paymentCreditAmount,
                            payment_adjustment: proof.paymentAdjustment,
                            notes: proof.notes ?? null,
                            commission_paid_at: proof.commissionPaidAt,
                          }) &&
                          (proof.commissionPaidAt ? (
                            <Badge variant="success" className="text-xs flex-shrink-0 inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Commission paid
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="text-xs flex-shrink-0 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Commission pending
                            </Badge>
                          ))}
                        <span className="text-xs text-gray-500">
                          {new Date(proof.uploadedAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      {proof.type === 'payment' &&
                        (proof.paymentCashAmount || proof.paymentCreditAmount || proof.paymentAdjustment) ? (
                        <p className="text-xs text-gray-700 mt-2">
                          ₱
                          {(
                            (proof.paymentCashAmount ?? 0) +
                            (proof.paymentCreditAmount ?? 0) +
                            (proof.paymentAdjustment ?? 0)
                          ).toLocaleString()}
                          {(proof.paymentCreditAmount ?? 0) > 0
                            ? ` (includes ₱${(proof.paymentCreditAmount ?? 0).toLocaleString()} credit)`
                            : ''}
                        </p>
                      ) : null}
                      {proof.type === 'payment' && perms.commissionRelease && proofNeedsCommissionRelease(proof) ? (
                        <p className="text-xs text-blue-700 mt-1.5">
                          Cash ₱{(proof.paymentCashAmount ?? 0).toLocaleString()} · Commission ₱
                          {computeProofCommissionForClientType(
                            proof.paymentCashAmount ?? 0,
                            customerClientType,
                          ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      ) : null}
                      {proof.type === 'payment' && perms.commissionRelease && proof.commissionPaidAt ? (
                        <p className="text-xs text-green-700 mt-1.5 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                          Commission paid{' '}
                          {new Date(proof.commissionPaidAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {proof.commissionPaidBy ? ` · ${proof.commissionPaidBy}` : ''}
                        </p>
                      ) : null}
                      {proof.type === 'payment' &&
                      perms.commissionRelease &&
                      proofNeedsCommissionRelease(proof) &&
                      !proof.commissionPaidAt ? (
                        <p className="text-xs text-amber-700 mt-1.5">Commission pending release</p>
                      ) : null}
                      {proof.notes && (
                        <p className="text-xs text-gray-600 mt-2 pr-1 whitespace-pre-wrap border-t border-gray-200/80 pt-2">
                          {proof.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-end sm:justify-start flex-shrink-0">
                    {proof.type === 'payment' &&
                    perms.commissionRelease &&
                    proofNeedsCommissionRelease(proof) &&
                    !proof.commissionPaidAt ? (
                      <Button
                        size="sm"
                        variant="primary"
                        className="gap-1"
                        disabled={releasingCommissionProofId === proof.id || markingAllCommissions}
                        onClick={() => void handleReleaseProofCommission(proof)}
                      >
                        {releasingCommissionProofId === proof.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Wallet className="w-3.5 h-3.5" />
                        )}
                        Release commission
                      </Button>
                    ) : null}
                    <Button variant="outline" size="sm" onClick={() => openProofEditModal(proof)}>
                      <Edit className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => window.open(proof.fileUrl, '_blank')}>
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-700 border-red-200 hover:bg-red-50"
                      onClick={() => void handleRemoveProof(proof)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              No {documentsProofTab === 'delivery' ? 'delivery' : documentsProofTab === 'payment' ? 'payment' : 'other'}{' '}
              documents yet.
            </p>
          ))}
        </CardContent>
      </Card>

      {/* Order Activity Log — IBR-style timeline */}
      {perms.activityLog && (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Activity log
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-3 p-6 pb-3">
            {orderLogs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">
                No activity recorded yet. Edits, approvals, logistics steps, delivery, proofs, and payments will appear
                here.
              </p>
            ) : (
              pagedOrderLogs.map((log, index) => {
                const isLast = index === pagedOrderLogs.length - 1;

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
                    case 'proof_updated':
                      return <Edit className="w-4 h-4" />;
                    case 'proof_removed':
                      return <Trash2 className="w-4 h-4" />;
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
                    case 'proof_updated':
                      return 'text-indigo-600 bg-indigo-50';
                    case 'proof_removed':
                      return 'text-orange-700 bg-orange-50';
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
          {orderLogs.length > ACTIVITY_LOG_PAGE_SIZE && (
            <TablePagination
              page={activityLogPage}
              pageSize={ACTIVITY_LOG_PAGE_SIZE}
              total={orderLogs.length}
              onPageChange={setActivityLogPage}
            />
          )}
        </CardContent>
      </Card>
      )}

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
                  ) : productsLoadError ? (
                    <div className="flex flex-col items-center justify-center h-32 text-center px-4 gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                      <p className="text-sm text-red-700">{productsLoadError}</p>
                      <button
                        type="button"
                        onClick={() => void handleSelectCategory(selectedCategory)}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        Retry
                      </button>
                    </div>
                  ) : categoryProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-center px-4 text-sm text-gray-500 gap-1">
                      <Package className="w-8 h-8 text-gray-300" />
                      <p>No product families in this category{catalogBranch ? ` for ${catalogBranch}` : ''}.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto p-1">
                      {categoryProducts.map((product) => {
                        const hasVariants = product.variants.length > 0;
                        return (
                        <button
                          key={product.id}
                          type="button"
                          disabled={!hasVariants}
                          onClick={() => {
                            if (!hasVariants) return;
                            setSelectedProduct(product);
                            setSelectedVariant(product.variants[0]);
                            setVariantQtyInput('1');
                            setVariantPriceInput(String(product.variants[0].unit_price));
                            setVariantDiscounts([]);
                          }}
                          className={`flex flex-col items-center p-3 border rounded-lg transition-all group ${
                            hasVariants
                              ? 'border-gray-200 hover:border-red-500 hover:bg-red-50'
                              : 'border-gray-200 bg-gray-50 opacity-70 cursor-not-allowed'
                          }`}
                        >
                          {product.image_url
                            ? <img src={product.image_url} alt={product.name} className="w-12 h-12 object-cover rounded-lg mb-2" />
                            : <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-2 group-hover:bg-red-100"><Package className="w-6 h-6 text-gray-600 group-hover:text-red-600" /></div>
                          }
                          <div className="text-xs font-medium text-gray-900 text-center line-clamp-2">{product.name}</div>
                          <div className={`text-xs mt-1 ${hasVariants ? 'text-gray-400' : 'text-amber-700'}`}>
                            {hasVariants
                              ? `${product.variants.length} variant${product.variants.length !== 1 ? 's' : ''}`
                              : 'No variants — add in Products'}
                          </div>
                        </button>
                        );
                      })}
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
                  {perms.payment && (
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
                          className="min-w-0 w-full text-xl font-bold text-gray-900 bg-white px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Base price: ₱{selectedVariant.unit_price.toLocaleString()}</p>
                    </div>
                  )}
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
                          {perms.payment && (
                            <div className="text-sm font-bold mt-1">₱{v.unit_price.toLocaleString()}</div>
                          )}
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
                  {perms.payment && (
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
                  )}

                  {/* Subtotal */}
                  {perms.payment && (
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
                  )}

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
      {showApproveModal && perms.approvals && (
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
      {showRejectModal && perms.approvals && (
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

      {/* Cancel Order Modal */}
      {showCancelModal && order && (
        <CancelOrderModal
          orderNumber={order.id}
          customerName={order.customer}
          orderAmount={order.totalAmount}
          onClose={() => setShowCancelModal(false)}
          onConfirm={(data) => void handleCancelOrder(data)}
        />
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
                    {order && order.items.length > 0 && (
                      <>
                        <div className="flex justify-between pt-2 border-t border-blue-200">
                          <span className="text-blue-700">Items subtotal (before discounts)</span>
                          <span className="font-medium text-blue-900 tabular-nums">
                            ₱{fmtMoney(order.items.reduce((s, i) => s + lineGrossSubtotal(i), 0))}
                          </span>
                        </div>
                        {order.items.some(
                          (item) =>
                            lineItemDiscountDeductions(item).length > 0 ||
                            lineGrossSubtotal(item) > item.lineTotal + 1e-6,
                        ) && (
                          <div className="text-xs space-y-2 max-h-36 overflow-y-auto pr-1 pt-1">
                            {order.items.map((item) => {
                              const deds = lineItemDiscountDeductions(item);
                              if (deds.length === 0 && lineGrossSubtotal(item) <= item.lineTotal + 1e-6)
                                return null;
                              return (
                                <div key={item.id} className="rounded bg-white/80 border border-blue-100 px-2 py-1.5 space-y-0.5">
                                  <p className="font-medium text-blue-950 truncate">{item.productName}</p>
                                  {deds.map((row, i) => (
                                    <div key={i} className="flex justify-between text-green-700">
                                      <span className="truncate mr-2">{row.label}</span>
                                      <span className="tabular-nums shrink-0">-₱{fmtMoney(row.amount)}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <div className="flex justify-between border-t border-blue-200 pt-2">
                          <span className="text-blue-700">Subtotal (after line discounts)</span>
                          <span className="font-medium text-blue-900 tabular-nums">
                            ₱{fmtMoney(order.items.reduce((s, i) => s + i.lineTotal, 0))}
                          </span>
                        </div>
                        {order.discountAmount > 1e-6 && (
                          <div className="flex justify-between text-xs text-green-800">
                            <span>
                              Order discount
                              {order.discountPercent > 0 ? ` (${order.discountPercent.toFixed(1)}%)` : ''}
                            </span>
                            <span className="tabular-nums font-semibold">-₱{fmtMoney(order.discountAmount)}</span>
                          </div>
                        )}
                      </>
                    )}
                    <div className="flex justify-between pt-2 border-t border-blue-200">
                      <span className="text-blue-700 font-semibold">Total Amount:</span>
                      <span className="font-bold text-blue-900 tabular-nums">₱{fmtMoney(order?.totalAmount ?? 0)}</span>
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
                        setProofType('other');
                        setSelectedProofGalleryUrls([]);
                        setSelectedProofLocalFiles([]);
                      }}
                      className={`p-2 md:p-3 border-2 rounded-lg text-center transition-colors ${
                        proofType === 'other'
                          ? 'border-amber-500 bg-amber-50 text-amber-900'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <FileText className="w-4 h-4 md:w-5 md:h-5 mx-auto mb-1" />
                      <span className="text-xs font-medium">Other</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title / purpose (optional)</label>
                  <input
                    type="text"
                    value={proofDocTitle}
                    onChange={(e) => setProofDocTitle(e.target.value)}
                    placeholder="Proofs of delivery or payment"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                  />
                </div>

                {proofType === 'payment' && order && (
                  <div className="rounded-lg border border-green-200 bg-green-50/60 p-4 space-y-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-medium text-green-900">Payment amounts (applied when you save)</p>
                      <p className="text-sm font-semibold text-green-900 tabular-nums whitespace-nowrap">
                        ₱{(proofModalPayment?.amountPaid ?? order.amountPaid).toLocaleString()} / ₱
                        {order.totalAmount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Money payment (cash / transfer / cheque)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={proofMoneyPayment}
                        onChange={(e) => capProofMoney(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-1">
                        <label className="block text-xs font-medium text-gray-700">Credit payment</label>
                        {!order.customerId ? (
                          <span className="text-xs text-gray-500">No customer linked</span>
                        ) : customerCreditLoading ? (
                          <span className="text-xs text-gray-500">Loading credit…</span>
                        ) : customerCreditSummary && customerCreditSummary.creditLimit > 0 ? (
                          <span className="text-xs font-medium text-gray-600 tabular-nums">
                            Used ₱{customerCreditSummary.outstandingBalance.toLocaleString()} / ₱
                            {customerCreditSummary.creditLimit.toLocaleString()} limit
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">No credit limit set</span>
                        )}
                      </div>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={proofPaymentCredit}
                        onChange={(e) => capProofCredit(e.target.value)}
                        disabled={!canApplyCustomerCredit}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                        placeholder="0"
                      />
                      {canApplyCustomerCredit && (
                        <p className="text-xs text-gray-600 mt-1">
                          Up to ₱
                          {maxProofCreditAmount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          credit for this order.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {proofType === 'payment' ? 'Images (optional)' : 'Images'}
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {proofType === 'payment' ? 'Upload documents (optional, max 25MB)' : 'Upload documents (Max of 25MB)'}
                  </label>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-300 focus:border-gray-400 outline-none"
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
                    proofUploadBusy ||
                    (selectedProofGalleryUrls.length === 0 &&
                      selectedProofLocalFiles.length === 0 &&
                      !(
                        proofType === 'payment' &&
                        (Number(proofMoneyPayment) || 0) + (Number(proofPaymentCredit) || 0) > 0
                      ))
                  }
                  className="flex-1 gap-2"
                >
                  {proofUploadBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
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

      {showProofEditModal && editingProof && order && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Edit className="w-6 h-6 text-red-600" />
                Edit proof
              </h2>
              <button
                type="button"
                onClick={closeProofEditModal}
                className="text-gray-400 hover:text-gray-600"
                disabled={proofEditBusy}
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                <span className="font-medium text-gray-900">{editingProof.fileName}</span>
                <span className="mx-2 text-gray-400">·</span>
                <Badge className="text-xs align-middle">
                  {editingProof.type === 'delivery'
                    ? 'Delivery'
                    : editingProof.type === 'payment'
                      ? 'Payment'
                      : 'Other'}
                </Badge>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title / purpose</label>
                <input
                  type="text"
                  value={editProofTitle}
                  onChange={(e) => setEditProofTitle(e.target.value)}
                  placeholder="Proofs of delivery or payment"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                />
              </div>

              {editingProof.type === 'payment' && (
                <div className="rounded-lg border border-green-200 bg-green-50/60 p-4 space-y-3">
                  <p className="text-sm font-medium text-green-900">Payment amounts</p>
                  <p className="text-xs text-gray-600 -mt-2">
                    Changes apply to order totals when you save. Max for this proof: ₱
                    {editProofAmountPool.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Money payment (cash / transfer / cheque)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={editProofMoney}
                      onChange={(e) => capEditProofMoney(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-1">
                      <label className="block text-xs font-medium text-gray-700">Credit payment</label>
                      {!order.customerId ? (
                        <span className="text-xs text-gray-500">No customer linked</span>
                      ) : customerCreditLoading ? (
                        <span className="text-xs text-gray-500">Loading credit…</span>
                      ) : customerCreditSummary && customerCreditSummary.creditLimit > 0 ? (
                        <span className="text-xs font-medium text-gray-600 tabular-nums">
                          Used ₱{customerCreditSummary.outstandingBalance.toLocaleString()} / ₱
                          {customerCreditSummary.creditLimit.toLocaleString()} limit
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">No credit limit set</span>
                      )}
                    </div>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={editProofCredit}
                      onChange={(e) => capEditProofCredit(e.target.value)}
                      disabled={!canApplyCustomerCredit}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-100 disabled:text-gray-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={editProofNotes}
                  onChange={(e) => setEditProofNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-300 focus:border-gray-400 outline-none text-sm"
                  placeholder="Additional information…"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={closeProofEditModal} className="flex-1" disabled={proofEditBusy}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => void handleSaveProofEdit()}
                  disabled={proofEditBusy}
                  className="flex-1 gap-2"
                >
                  {proofEditBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Save changes
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
          onClose={() => {
            if (!inTransitSubmitting) {
              setShowInTransitModal(false);
              shipQtyNextOrderStatusRef.current = 'In Transit';
            }
          }}
          orderNumber={order.id}
          orderStatus={order.status}
          items={order.items}
          purpose="markPacked"
          submitting={inTransitSubmitting}
          onConfirm={handleConfirmInTransit}
        />
      )}
    </div>
  );
}
