import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { supabase } from '@/src/lib/supabase';
import { useAppContext } from '@/src/store/AppContext';
import { OrderDetail, OrderStatus, OrderLineItem, OrderLog, ProofDocument } from '@/src/types/orders';
import { PaymentLink } from '@/src/types/payments';
import { PaymentLinkModal } from '@/src/components/payments/PaymentLinkModal';
import { CancelOrderModal, CancellationData } from '@/src/components/orders/CancelOrderModal';
import { FulfillOrderModal, FulfillmentData } from '@/src/components/orders/FulfillOrderModal';
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
  Check,
  ArrowUp,
  Download,
  Upload,
  Image,
  CheckCircle2,
  XCircle,
  Link as LinkIcon,
  Copy,
  Loader2,
} from 'lucide-react';

// ── DB Types (same as CreateOrderModal) ──────────────────────────────────────
interface DBVariantDet { id: string; size: string; description: string | null; unit_price: number; stock: number; }
interface DBProductDet { id: string; name: string; image_url: string | null; variants: DBVariantDet[]; }
interface DBCategoryDet { id: string; name: string; image_url: string | null; }

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
  const [variantQuantity, setVariantQuantity] = useState<string>('1');
  const [variantPrice, setVariantPrice] = useState(0);
  const [variantDiscounts, setVariantDiscounts] = useState<Array<{ name: string; percentage: number }>>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  
  // Cancel order state
  const [showCancelModal, setShowCancelModal] = useState(false);
  
  // Fulfill order state
  const [showFulfillModal, setShowFulfillModal] = useState(false);
  
  // Invoice and Proof states
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofType, setProofType] = useState<'delivery' | 'payment' | 'receipt'>('delivery');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

  // Supabase data state
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [orderLogs, setOrderLogs] = useState<OrderLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchOrder = async () => {
      setLoading(true);

      // Fetch order row + branch name via join
      const { data: row } = await supabase
        .from('orders')
        .select(`
          id, order_number, customer_id, customer_name, agent_id, agent_name,
          order_date, required_date, delivery_type, payment_terms, payment_method,
          status, payment_status, subtotal, discount_percent, discount_amount,
          tax_amount, total_amount, requires_approval, approval_reasons,
          approved_by, approved_date, rejected_by, rejection_reason,
          estimated_delivery, actual_delivery, order_notes, internal_notes,
          invoice_id, invoice_date, due_date, amount_paid, balance_due,
          created_at, updated_at, cancelled_at, cancellation_reason,
          branches(name)
        `)
        .eq('id', id)
        .single();

      if (!row) { setLoading(false); return; }

      // Fetch line items
      const { data: items } = await supabase
        .from('order_line_items')
        .select('id, sku, product_name, variant_description, quantity, unit_price, original_price, negotiated_price, discount_percent, discount_amount, batch_discount, discounts_breakdown, line_total, stock_hint, available_stock')
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
      }));

      const mappedOrder: OrderDetail = {
        id: (row as any).order_number,
        customer: (row as any).customer_name ?? '',
        customerId: (row as any).customer_id ?? '',
        agent: (row as any).agent_name ?? '',
        agentId: (row as any).agent_id ?? '',
        branch: branchName,
        orderDate: (row as any).order_date ?? '',
        requiredDate: (row as any).required_date ?? '',
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
    if (['Pending', 'Picking', 'Packed', 'Ready', 'Scheduled'].includes(status)) return 'warning';
    if (['Rejected', 'Cancelled'].includes(status)) return 'danger';
    if (status === 'In Transit') return 'info';
    return 'neutral';
  };

  const getPaymentBadgeVariant = (status: string): 'success' | 'warning' | 'danger' | 'neutral' => {
    if (status === 'Paid') return 'success';
    if (status === 'Overdue') return 'danger';
    if (['Partially Paid', 'Invoiced'].includes(status)) return 'warning';
    return 'neutral';
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

  const handleCancelOrder = () => {
    setShowCancelModal(true);
  };

  const handleConfirmCancellation = (cancellationData: CancellationData) => {
    // Log the cancellation with all details
    const logMessage = `Cancelled order ${order.id}. Reason: ${cancellationData.reason}. ` +
      `Refund: ${cancellationData.refundRequired ? `₱${cancellationData.refundAmount.toLocaleString()}` : 'No'}, ` +
      `Restock: ${cancellationData.restockItems ? 'Yes' : 'No'}, ` +
      `Notify Customer: ${cancellationData.notifyCustomer ? 'Yes' : 'No'}`;
    
    addAuditLog('Cancelled Order', 'Order', logMessage);
    
    // Show success message with details
    alert(
      `Order ${order.id} has been cancelled successfully.\n\n` +
      `Reason: ${cancellationData.reason}\n` +
      `Initiated by: ${cancellationData.initiatedBy}\n` +
      `Refund Amount: ${cancellationData.refundRequired ? `₱${cancellationData.refundAmount.toLocaleString()}` : 'None'}\n` +
      `Items returned to stock: ${cancellationData.restockItems ? 'Yes' : 'No'}\n` +
      `Customer notified: ${cancellationData.notifyCustomer ? 'Yes' : 'No'}`
    );
    
    setShowCancelModal(false);
    navigate('/orders');
  };

  const handleResubmit = () => {
    if (order.status === 'Rejected') {
      alert(`Resubmitting order ${order.id} for approval`);
      addAuditLog('Resubmitted Order', 'Order', `Resubmitted order ${order.id} after revision`);
    }
  };

  const handleFulfillOrder = (fulfillmentData: FulfillmentData[]) => {
    // Check if any item is partially fulfilled
    const hasPartialFulfillment = fulfillmentData.some(
      item => item.deliveredQuantity < item.orderedQuantity && item.deliveredQuantity > 0
    );
    
    const isFullyFulfilled = fulfillmentData.every(
      item => item.deliveredQuantity === item.orderedQuantity
    );

    const newStatus = isFullyFulfilled ? 'Delivered' : 'Partially Fulfilled';
    
    // Create detailed log message
    const fulfillmentDetails = fulfillmentData.map(item => {
      const orderItem = order.items.find(i => i.id === item.itemId);
      return `${orderItem?.productName}: ${item.deliveredQuantity}/${item.orderedQuantity}`;
    }).join(', ');

    addAuditLog(
      'Fulfilled Order',
      'Order',
      `Order ${order.id} marked as ${newStatus}. Items: ${fulfillmentDetails}`
    );

    alert(
      `Order ${order.id} has been ${hasPartialFulfillment ? 'partially fulfilled' : 'fulfilled'}.\n\n` +
      `Status: ${newStatus}\n\n` +
      `Fulfillment Details:\n${fulfillmentData.map(item => {
        const orderItem = order.items.find(i => i.id === item.itemId);
        return `• ${orderItem?.productName}: ${item.deliveredQuantity} of ${item.orderedQuantity} delivered`;
      }).join('\n')}`
    );

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
        delivery_type: editedOrder.deliveryType,
        payment_terms: editedOrder.paymentTerms,
        payment_method: editedOrder.paymentMethod,
      })
      .eq('id', id);

    if (orderErr) { alert('Failed to save order: ' + orderErr.message); return; }

    // Delete existing line items and re-insert
    await supabase.from('order_line_items').delete().eq('order_id', id);

    if (editedOrder.items.length > 0) {
      const rows = editedOrder.items.map(item => ({
        order_id: id,
        sku: item.sku,
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
      .select('id, name, image_url, product_variants(id, size, description, unit_price, total_stock)')
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
    setCategoryProducts(productsData.map((p: any) => ({
      id: p.id,
      name: p.name,
      image_url: p.image_url ?? null,
      variants: (p.product_variants ?? []).map((v: any) => ({
        id: v.id,
        size: v.size,
        description: v.description ?? null,
        unit_price: Number(v.unit_price ?? 0),
        stock: stockMap[v.id] ?? v.total_stock ?? 0,
      })),
    })));
    setProductsLoading(false);
  };

  const handleCloseProductModal = () => {
    setShowProductModal(false);
    setSelectedProduct(null);
    setSelectedVariant(null);
    setVariantQuantity('1');
    setVariantPrice(0);
    setVariantDiscounts([]);
    setProductSearch('');
    setSelectedCategory(null);
    setCategoryProducts([]);
    setEditingItemId(null);
  };

  // Open the product detail modal pre-filled from an existing line item (for editing)
  const handleEditItem = (item: OrderLineItem) => {
    if (!isEditing) return;

    // Reconstruct a synthetic DBProductDet / DBVariantDet from the saved item data
    const syntheticVariant: DBVariantDet = {
      id: item.sku.toLowerCase(),
      size: item.variantDescription,
      description: null,
      unit_price: item.originalPrice ?? item.unitPrice,
      stock: item.availableStock ?? 999,
    };
    const syntheticProduct: DBProductDet = {
      id: item.id,
      name: item.productName,
      image_url: null,
      variants: [syntheticVariant],
    };

    // Reconstruct discounts: prefer stored breakdown, fall back to single collapsed entry
    let reconstructedDiscounts: Array<{ name: string; percentage: number }> = [];
    if (item.discountsBreakdown && item.discountsBreakdown.length > 0) {
      reconstructedDiscounts = item.discountsBreakdown.map(d => ({ ...d }));
    } else {
      const effectivePct = item.discountPercent > 0
        ? item.discountPercent
        : (() => {
            const gross = item.unitPrice * item.quantity;
            return gross > 0 && item.lineTotal < gross ? ((gross - item.lineTotal) / gross) * 100 : 0;
          })();
      if (effectivePct > 0) {
        reconstructedDiscounts.push({ name: 'Discount', percentage: parseFloat(effectivePct.toFixed(4)) });
      }
    }

    setEditingItemId(item.id);
    setSelectedProduct(syntheticProduct);
    setSelectedVariant(syntheticVariant);
    setVariantQuantity(item.quantity.toString());
    setVariantPrice(item.unitPrice);
    setVariantDiscounts(reconstructedDiscounts);
    setShowProductModal(true);
  };

  const addDiscount = () => setVariantDiscounts([...variantDiscounts, { name: '', percentage: 0 }]);  const updateDiscount = (index: number, field: 'name' | 'percentage', value: string | number) => {
    const next = [...variantDiscounts];
    if (field === 'name') next[index].name = value as string;
    else next[index].percentage = Math.max(0, Math.min(100, Number(value) || 0));
    setVariantDiscounts(next);
  };
  const removeDiscount = (index: number) => setVariantDiscounts(variantDiscounts.filter((_, i) => i !== index));

  const calculateFinalPrice = () =>
    variantDiscounts.reduce((p, d) => p * (1 - d.percentage / 100), variantPrice * (parseInt(variantQuantity, 10) || 0));

  const calculateTotalDiscountPct = () => {
    const subtotal = variantPrice * (parseInt(variantQuantity, 10) || 0);
    if (subtotal === 0) return 0;
    return ((subtotal - calculateFinalPrice()) / subtotal) * 100;
  };

  const handleAddToOrder = () => {
    if (!editedOrder || !selectedProduct || !selectedVariant) return;
    const parsedQty = parseInt(variantQuantity, 10);
    if (!parsedQty || parsedQty < 1) {
      alert('Please enter a valid quantity (minimum 1).');
      return;
    }
    const finalTotal = calculateFinalPrice();
    const totalDiscount = calculateTotalDiscountPct();

    const updatedItem: OrderLineItem = {
      id: editingItemId ?? `item-${Date.now()}`,
      sku: selectedVariant.id.toUpperCase(),
      productName: selectedProduct.name,
      variantDescription: `${selectedVariant.size}${selectedVariant.description ? ' - ' + selectedVariant.description : ''}`,
      quantity: parsedQty,
      unitPrice: variantPrice,
      originalPrice: selectedVariant.unit_price,
      negotiatedPrice: variantPrice,
      discountPercent: totalDiscount,
      discountAmount: variantPrice * parsedQty - finalTotal,
      lineTotal: finalTotal,
      stockHint: selectedVariant.stock >= parsedQty ? 'Available' : selectedVariant.stock > 0 ? 'Partial' : 'Not Available',
      availableStock: selectedVariant.stock,
      discountsBreakdown: variantDiscounts.length > 0 ? [...variantDiscounts] : undefined,
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

  // Proof of Delivery/Payment Upload
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { alert('File size must be less than 10MB'); return; }
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(file.type)) { alert('Only JPG, PNG, and PDF files are allowed'); return; }
      setSelectedFile(file);
    }
  };

  const handleUploadProof = () => {
    if (!order || !selectedFile) return;
    const newProof: ProofDocument = {
      id: `proof-${Date.now()}`,
      orderId: order.id,
      type: proofType,
      fileName: selectedFile.name,
      fileUrl: URL.createObjectURL(selectedFile),
      fileSize: selectedFile.size,
      uploadedBy: order.agent,
      uploadedByRole: 'Agent',
      uploadedAt: new Date().toISOString(),
      status: 'pending',
      notes: proofNotes,
    };
    setProofs([...proofs, newProof]);
    alert(`${proofType === 'delivery' ? 'Proof of Delivery' : proofType === 'payment' ? 'Proof of Payment' : 'Receipt'} uploaded successfully!\n\nFile: ${selectedFile.name}\nStatus: Pending Verification`);
    setSelectedFile(null);
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

  // All available statuses
  const allStatuses: OrderStatus[] = [
    'Draft',
    'Pending',
    'Approved',
    'Picking',
    'Packed',
    'Ready',
    'Scheduled',
    'In Transit',
    'Delivered',
    'Completed',
    'Cancelled',
    'Rejected'
  ];

  const allPaymentStatuses = ['Unbilled', 'Invoiced', 'Partially Paid', 'Paid', 'Overdue'];

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
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
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">{order.id}</h1>
            <p className="text-sm text-gray-500 mt-1">Order Details</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3 flex-wrap">
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
              <Button variant="outline" onClick={handleEdit} className="gap-2">
                <Edit className="w-4 h-4" />
                Edit Order
              </Button>
              {['Approved', 'In Transit', 'Processing'].includes(order.status) && (
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
              {!['Delivered', 'Completed', 'Cancelled', 'Rejected'].includes(order.status) && (
                <Button variant="outline" onClick={handleCancelOrder} className="gap-2 text-red-600 hover:text-red-700">
                  <Trash2 className="w-4 h-4" />
                  Cancel Order
                </Button>
              )}
            </>
          )}
        </div>
      </div>

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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

      {/* Customer, Order Details, Agent & Branch in one row */}
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
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{order.customer}</p>
                <p className="text-xs text-gray-500 mt-1">Customer ID: {order.customerId}</p>
              </div>
            </div>
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
                <span className="font-medium text-gray-900">{order.orderDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Required Date:</span>
                <span className="font-medium text-gray-900">{order.requiredDate}</span>
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
        <CardContent className="p-0">
          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-gray-200">
            {displayOrder.items.map((item, index) => (
              <div key={index} className={`p-4 space-y-3 ${isEditing ? 'cursor-pointer hover:bg-blue-50 transition-colors' : ''}`}
                onClick={isEditing ? () => handleEditItem(item) : undefined}>
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
                      {isEditing && <Badge variant="outline" className="text-xs text-blue-600 border-blue-400">Click to edit</Badge>}
                    </div>
                  </div>
                  {isEditing && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); handleRemoveItem(item.id); }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">Quantity</div>
                    {isEditing ? (
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-center focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                      />
                    ) : (
                      <div className="font-medium text-gray-900">{item.quantity}</div>
                    )}
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
          <div className="hidden md:block">
              <div className="overflow-x-auto">
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
                      {isEditing && <th className="px-6 py-3 text-center font-medium">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {displayOrder.items.map((item, index) => (
                      <tr key={index}
                        className={`hover:bg-gray-50 ${isEditing ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                        onClick={isEditing ? () => handleEditItem(item) : undefined}>
                        <td className="px-6 py-4 text-gray-600">{item.sku}</td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{item.productName}</div>
                          <div className="text-xs text-gray-500">{item.variantDescription}</div>
                          {item.negotiatedPrice && item.originalPrice && item.negotiatedPrice < item.originalPrice && (
                            <Badge variant="danger" className="mt-1">Negotiated</Badge>
                          )}
                          {isEditing && <div className="text-xs text-blue-500 mt-1">Click to edit</div>}
                        </td>
                        <td className="px-6 py-4 text-center font-medium">
                          {isEditing ? (
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                              className="w-20 px-2 py-1 border border-gray-300 rounded text-center focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                            />
                          ) : (
                            item.quantity
                          )}
                        </td>
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
                        {isEditing && (
                          <td className="px-6 py-4 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); handleRemoveItem(item.id); }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colSpan={isEditing ? 7 : 6} className="px-6 py-4 text-right font-semibold text-gray-700">
                        Subtotal:
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-900">
                        ₱{displayOrder.totalAmount.toLocaleString()}
                      </td>
                      <td colSpan={isEditing ? 2 : 1}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
          </div>
        </CardContent>
          </Card>

          {/* Approve / Reject Action Bar */}
          {order.status !== 'Approved' && order.status !== 'Rejected' && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-900">Order Decision</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Current status: <span className="font-medium">{order.status}</span>
                  {order.requiresApproval && ' · Requires approval'}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg border-2 border-red-600 text-red-600 font-semibold hover:bg-red-50 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
                <button
                  onClick={() => setShowApproveModal(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve
                </button>
              </div>
            </div>
          )}

          {/* Already decided banner */}
          {(order.status === 'Approved' || order.status === 'Rejected') && (
            <div className={`flex items-center gap-3 p-4 rounded-xl border ${order.status === 'Approved' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              {order.status === 'Approved'
                ? <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                : <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${order.status === 'Approved' ? 'text-green-900' : 'text-red-900'}`}>
                  Order {order.status}
                  {order.status === 'Approved' && order.approvedBy && ` by ${order.approvedBy}`}
                  {order.status === 'Rejected' && order.rejectedBy && ` by ${order.rejectedBy}`}
                </p>
                {order.status === 'Rejected' && order.rejectionReason && (
                  <p className="text-xs text-red-700 mt-0.5">Reason: {order.rejectionReason}</p>
                )}
              </div>
              {/* Allow un-deciding (reset to Pending) */}
              <button
                onClick={async () => {
                  if (!id) return;
                  await supabase.from('orders').update({ status: 'Pending', approved_by: null, approved_date: null, rejected_by: null, rejection_reason: null }).eq('id', id);
                  setOrder({ ...order, status: 'Pending', approvedBy: undefined, approvedDate: undefined, rejectedBy: undefined, rejectionReason: undefined });
                }}
                className="text-xs underline text-gray-500 hover:text-gray-700 flex-shrink-0"
              >
                Undo
              </button>
            </div>
          )}

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
              <Button variant="outline" size="sm" onClick={() => setShowProofModal(true)} className="gap-2 flex-1 sm:flex-none">
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
                      {proof.fileName.toLowerCase().endsWith('.pdf') ? (
                        <FileText className={`w-5 h-5 ${
                          proof.type === 'delivery' ? 'text-blue-600' : proof.type === 'payment' ? 'text-green-600' : 'text-purple-600'
                        }`} />
                      ) : (
                        <Image className={`w-5 h-5 ${
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
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 justify-end sm:justify-start flex-shrink-0">
                    {proof.status === 'pending' && (
                      <Badge className="bg-yellow-100 text-yellow-700 text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                    {proof.status === 'verified' && (
                      <Badge className="bg-green-100 text-green-700 text-xs">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                    {proof.status === 'rejected' && (
                      <Badge className="bg-red-100 text-red-700 text-xs">
                        <XCircle className="w-3 h-3 mr-1" />
                        Rejected
                      </Badge>
                    )}
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

      {/* Order Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Order Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {orderLogs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No activity logs available</p>
            ) : (
              orderLogs.map((log, index) => {
                const isLast = index === orderLogs.length - 1;
                
                // Determine icon and color based on action
                const getActionIcon = () => {
                  switch (log.action) {
                    case 'created': return <FileText className="w-4 h-4" />;
                    case 'status_changed': return <Clock className="w-4 h-4" />;
                    case 'payment_status_changed': return <CreditCard className="w-4 h-4" />;
                    case 'item_added': return <Plus className="w-4 h-4" />;
                    case 'item_removed': return <Minus className="w-4 h-4" />;
                    case 'item_quantity_changed': return <Package className="w-4 h-4" />;
                    case 'item_price_changed': return <CreditCard className="w-4 h-4" />;
                    case 'discount_applied': return <Badge className="w-4 h-4" />;
                    case 'approved': return <CheckCircle className="w-4 h-4" />;
                    case 'rejected': return <X className="w-4 h-4" />;
                    case 'shipped': return <Truck className="w-4 h-4" />;
                    case 'delivered': return <CheckCircle className="w-4 h-4" />;
                    case 'cancelled': return <X className="w-4 h-4" />;
                    case 'payment_received': return <CreditCard className="w-4 h-4" />;
                    case 'invoice_generated': return <FileText className="w-4 h-4" />;
                    case 'note_added': return <FileText className="w-4 h-4" />;
                    case 'proof_uploaded': return <Upload className="w-4 h-4" />;
                    case 'proof_verified': return <CheckCircle2 className="w-4 h-4" />;
                    case 'proof_rejected': return <XCircle className="w-4 h-4" />;
                    default: return <Clock className="w-4 h-4" />;
                  }
                };

                const getActionColor = () => {
                  switch (log.action) {
                    case 'created': return 'text-blue-600 bg-blue-50';
                    case 'approved': return 'text-green-600 bg-green-50';
                    case 'rejected': 
                    case 'cancelled': 
                    case 'proof_rejected': return 'text-red-600 bg-red-50';
                    case 'item_removed': return 'text-orange-600 bg-orange-50';
                    case 'shipped':
                    case 'delivered':
                    case 'proof_verified': return 'text-green-600 bg-green-50';
                    case 'payment_received':
                    case 'invoice_generated': return 'text-purple-600 bg-purple-50';
                    case 'proof_uploaded': return 'text-blue-600 bg-blue-50';
                    default: return 'text-gray-600 bg-gray-50';
                  }
                };

                const getRoleBadgeColor = () => {
                  switch (log.performedByRole) {
                    case 'Agent': return 'bg-blue-100 text-blue-700';
                    case 'Manager': return 'bg-purple-100 text-purple-700';
                    case 'Warehouse Staff': return 'bg-orange-100 text-orange-700';
                    case 'Logistics': return 'bg-green-100 text-green-700';
                    case 'Admin': return 'bg-red-100 text-red-700';
                    case 'System': return 'bg-gray-100 text-gray-700';
                    default: return 'bg-gray-100 text-gray-700';
                  }
                };

                return (
                  <div key={log.id} className="relative pl-8 pb-3">
                    {/* Timeline line */}
                    {!isLast && (
                      <div className="absolute left-3 top-8 bottom-0 w-0.5 bg-gray-200"></div>
                    )}
                    
                    {/* Timeline dot with icon */}
                    <div className={`absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center ${getActionColor()}`}>
                      {getActionIcon()}
                    </div>

                    {/* Log content */}
                    <div className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div className="flex-1">
                          {(() => {
                            // Strip legacy "— Reason: ..." suffix from description if present
                            const reasonSepIdx = log.description.indexOf(' — Reason: ');
                            const cleanDesc = reasonSepIdx !== -1
                              ? log.description.slice(0, reasonSepIdx)
                              : log.description;
                            const legacyReason = reasonSepIdx !== -1
                              ? log.description.slice(reasonSepIdx + ' — Reason: '.length)
                              : null;
                            // Use metadata.reason if present, otherwise fall back to legacy
                            const displayReason = (log.metadata as any)?.reason ?? legacyReason;
                            return (
                              <>
                                <p className="text-sm font-medium text-gray-900">{cleanDesc}</p>
                                {displayReason && (
                                  <div className="mt-1.5 text-xs text-gray-500">
                                    <span className="font-semibold text-gray-700">Reason:</span>
                                    <p className="mt-0.5 text-gray-800 whitespace-pre-wrap">{displayReason}</p>
                                  </div>
                                )}
                              </>
                            );
                          })()}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-xs text-gray-500">
                              {new Date(log.timestamp).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-700 font-medium">{log.performedBy}</span>
                            <Badge className={`text-xs px-2 py-0.5 ${getRoleBadgeColor()}`}>
                              {log.performedByRole}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Show old vs new values if available */}
                      {(log.oldValue || log.newValue) && (() => {
                        // Render a single key's value in a human-friendly way
                        const fmt = (obj: any, key: string): string => {
                          const v = obj?.[key];
                          if (v === undefined || v === null) return '—';
                          if (key === 'unitPrice' || key === 'lineTotal' || key === 'discountAmount') return `₱${Number(v).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                          if (key === 'discountPercent') return `${Number(v).toFixed(2)}%`;
                          return String(v);
                        };

                        // Detect which field changed and produce a clean pill-style diff
                        const keys = Array.from(new Set([
                          ...Object.keys(log.oldValue ?? {}),
                          ...Object.keys(log.newValue ?? {}),
                        ])).filter(k => {
                          // Skip decorative/redundant keys
                          if (['approved_by', 'rejected_by', 'rejection_reason'].includes(k)) return false;
                          // Skip keys whose value is a nested object (not renderable as a pill)
                          const oldV = (log.oldValue as any)?.[k];
                          const newV = (log.newValue as any)?.[k];
                          if (oldV !== undefined && typeof oldV === 'object') return false;
                          if (newV !== undefined && typeof newV === 'object') return false;
                          return true;
                        });

                        if (keys.length === 0) return null;

                        return (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {keys.map(key => {
                              const oldDisplay = fmt(log.oldValue, key);
                              const newDisplay = fmt(log.newValue, key);
                              const hasOld = log.oldValue && log.oldValue[key] !== undefined;
                              const hasNew = log.newValue && log.newValue[key] !== undefined;
                              return (
                                <div key={key} className="flex items-center gap-1.5 text-xs">
                                  {hasOld && (
                                    <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium border border-red-200 line-through decoration-red-400">
                                      {oldDisplay}
                                    </span>
                                  )}
                                  {hasOld && hasNew && (
                                    <span className="text-gray-400 font-bold">→</span>
                                  )}
                                  {hasNew && (
                                    <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium border border-green-200">
                                      {newDisplay}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}

                      {/* Show metadata if available — only fields that add context beyond the description */}
                      {log.metadata && (() => {
                        const meta = log.metadata as Record<string, any>;
                        // Keys to suppress: productName/variantDescription are already in the description text
                        const SKIP_KEYS = new Set(['productName', 'variantDescription', 'reason']);
                        const entries = Object.entries(meta).filter(([k]) => !SKIP_KEYS.has(k));

                        const fmtMetaValue = (key: string, val: any): string => {
                          if (typeof val === 'boolean') return val ? 'Yes' : 'No';
                          if (typeof val === 'number') {
                            if (['addedAmount', 'savedAmount', 'reducedAmount', 'unitPrice', 'lineTotal'].includes(key))
                              return `₱${val.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                            if (key === 'discountPercent') return `${val.toFixed(2)}%`;
                            return val.toLocaleString();
                          }
                          if (key === 'dueDate') return new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                          return String(val);
                        };

                        const fmtMetaKey = (k: string): string => {
                          const labels: Record<string, string> = {
                            addedAmount: 'Added to order',
                            savedAmount: 'Saved',
                            reducedAmount: 'Reduced by',
                            dueDate: 'Due date',
                          };
                          return labels[k] ?? k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).trim();
                        };

                        return (
                          <>
                            {/* Reason — rendered as its own distinct block */}
                            {meta.reason && (
                              <div className="mt-2 text-xs text-gray-500">
                                <span className="font-semibold text-gray-700">Reason:</span>
                                <p className="mt-0.5 text-gray-800 whitespace-pre-wrap">{meta.reason}</p>
                              </div>
                            )}
                            {/* Remaining metadata fields */}
                            {entries.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                                {entries.map(([key, value]) => (
                                  <span key={key} className="text-xs text-gray-500">
                                    <span className="font-medium text-gray-700">{fmtMetaKey(key)}:</span>{' '}
                                    {fmtMetaValue(key, value)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </>
                        );
                      })()}
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
                          onClick={() => { if (!product.variants.length) return; setSelectedProduct(product); setSelectedVariant(product.variants[0]); setVariantQuantity('1'); setVariantPrice(product.variants[0].unit_price); setVariantDiscounts([]); }}
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
                        onClick={() => { setSelectedProduct(product); setSelectedVariant(product.variants[0]); setVariantQuantity('1'); setVariantPrice(product.variants[0].unit_price); setVariantDiscounts([]); }}
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
            <button onClick={() => { setSelectedProduct(null); setSelectedVariant(null); setVariantQuantity('1'); setVariantPrice(0); setVariantDiscounts([]); }}
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
                      <input type="number" min="0" step="0.01" value={variantPrice}
                        onChange={(e) => setVariantPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="min-w-0 w-full text-xl font-bold text-gray-900 bg-white px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
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
                          onClick={() => { setSelectedVariant(v); setVariantQuantity('1'); setVariantPrice(v.unit_price); }}
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
                    <div className="flex items-center gap-4">
                      <button type="button" onClick={() => setVariantQuantity(String(Math.max(1, (parseInt(variantQuantity, 10) || 1) - 1)))}
                        className="w-12 h-12 flex items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-gray-50">
                        <Minus className="w-5 h-5" />
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={variantQuantity}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === '' || /^\d+$/.test(raw)) {
                            setVariantQuantity(raw);
                          }
                        }}
                        className="w-24 text-center text-2xl font-bold px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
                      <button type="button" onClick={() => setVariantQuantity(String((parseInt(variantQuantity, 10) || 0) + 1))}
                        className="w-12 h-12 flex items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-gray-50">
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    {variantQuantity !== '' && parseInt(variantQuantity, 10) > selectedVariant.stock && (
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
                            <input type="number" min="0" max="100" step="0.1" placeholder="0" value={d.percentage || ''}
                              onChange={(e) => updateDiscount(i, 'percentage', e.target.value)}
                              onWheel={(e) => e.currentTarget.blur()}
                              className="w-20 px-3 py-2 text-sm text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500" />
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
                      <span className="text-lg font-bold text-blue-900">₱{(variantPrice * (parseInt(variantQuantity, 10) || 0)).toLocaleString()}</span>
                    </div>
                    {variantDiscounts.length > 0 && (() => {
                      let cur = variantPrice * (parseInt(variantQuantity, 10) || 0);
                      return (
                        <>
                          {variantDiscounts.map((d, i) => {
                            const amt = cur * (d.percentage / 100);
                            cur -= amt;
                            return (
                              <div key={i} className="flex items-center justify-between text-sm">
                                <span className="text-green-700">{d.name || `Discount ${i + 1}`} ({d.percentage}%)</span>
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

      {/* Proof Upload Modal */}
      {showProofModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Upload className="w-6 h-6 text-red-600" />
                Upload Proof Document
              </h2>
              <button onClick={() => setShowProofModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {/* Proof Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document Type
                  </label>
                  <div className="grid grid-cols-3 gap-2 md:gap-3">
                    <button
                      onClick={() => setProofType('delivery')}
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
                      onClick={() => setProofType('payment')}
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
                      onClick={() => setProofType('receipt')}
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

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload File (JPG, PNG, PDF - Max 10MB)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/jpg,application/pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="proof-file-input"
                    />
                    <label htmlFor="proof-file-input" className="cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      {selectedFile ? (
                        <div>
                          <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-gray-600">Click to select a file</p>
                          <p className="text-xs text-gray-500 mt-1">or drag and drop</p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
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
                <Button variant="outline" onClick={() => setShowProofModal(false)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleUploadProof} 
                  disabled={!selectedFile}
                  className="flex-1 gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload Proof
                </Button>
              </div>
            </div>
          </div>
        </div>
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

      {/* Cancel Order Modal */}
      {showCancelModal && (
        <CancelOrderModal
          orderId={order.id}
          orderNumber={order.id}
          customerName={order.customer}
          orderAmount={order.totalAmount}
          onClose={() => setShowCancelModal(false)}
          onConfirm={handleConfirmCancellation}
        />
      )}

      {/* Fulfill Order Modal */}
      {showFulfillModal && (
        <FulfillOrderModal
          isOpen={showFulfillModal}
          onClose={() => setShowFulfillModal(false)}
          orderNumber={order.id}
          items={order.items}
          onFulfill={handleFulfillOrder}
        />
      )}
    </div>
  );
}
