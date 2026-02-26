import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import { getOrderById, getOrderLogs } from '@/src/mock/orders';
import { useAppContext } from '@/src/store/AppContext';
import { OrderDetail, OrderStatus, OrderLineItem, OrderLog } from '@/src/types/orders';
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
} from 'lucide-react';

// Batch pricing tiers for bulk orders
interface PriceTier {
  minQty: number;
  pricePerUnit: number;
  discount: number;
}

// Mock product data (same as CreateOrderModal)
const MOCK_PIPE_PRODUCTS = [
  {
    id: 'prod-001',
    name: 'UPVC Sanitary Pipe',
    category: 'Sanitary',
    discount: 10,
    batchEnabled: true,
    variants: [
      { 
        id: 'var-001', 
        size: '2" x 10ft', 
        description: 'Standard white, for waste drainage systems', 
        price: 450, 
        originalPrice: 500,
        stock: 120,
        priceTiers: [
          { minQty: 1, pricePerUnit: 450, discount: 0 },
          { minQty: 5, pricePerUnit: 428, discount: 5 },
          { minQty: 10, pricePerUnit: 405, discount: 10 },
          { minQty: 25, pricePerUnit: 383, discount: 15 },
        ]
      },
      { 
        id: 'var-002', 
        size: '3" x 10ft', 
        description: 'Standard white, for main drain lines', 
        price: 680, 
        originalPrice: 755,
        stock: 95,
        priceTiers: [
          { minQty: 1, pricePerUnit: 680, discount: 0 },
          { minQty: 5, pricePerUnit: 646, discount: 5 },
          { minQty: 10, pricePerUnit: 612, discount: 10 },
          { minQty: 25, pricePerUnit: 578, discount: 15 },
        ]
      },
    ],
  },
  {
    id: 'prod-002',
    name: 'UPVC Pressure Pipe',
    category: 'Water Supply',
    batchEnabled: true,
    variants: [
      { 
        id: 'var-005', 
        size: '1/2" x 10ft', 
        description: 'Class C (160 PSI), potable water certified', 
        price: 320, 
        stock: 200,
        priceTiers: [
          { minQty: 1, pricePerUnit: 320, discount: 0 },
          { minQty: 5, pricePerUnit: 304, discount: 5 },
          { minQty: 10, pricePerUnit: 288, discount: 10 },
          { minQty: 25, pricePerUnit: 272, discount: 15 },
        ]
      },
      { 
        id: 'var-006', 
        size: '3/4" x 10ft', 
        description: 'Class C (160 PSI), for residential water lines', 
        price: 425, 
        stock: 175,
        priceTiers: [
          { minQty: 1, pricePerUnit: 425, discount: 0 },
          { minQty: 5, pricePerUnit: 404, discount: 5 },
          { minQty: 10, pricePerUnit: 383, discount: 10 },
          { minQty: 25, pricePerUnit: 361, discount: 15 },
        ]
      },
    ],
  },
  {
    id: 'prod-003',
    name: 'UPVC Fittings - Tee Joint',
    category: 'Fittings',
    variants: [
      { id: 'var-031', size: '3/4"', description: 'White solvent weld, 3-way connection', price: 58, stock: 445 },
      { id: 'var-032', size: '1"', description: 'White solvent weld, 3-way connection', price: 85, stock: 380 },
    ],
  },
  {
    id: 'prod-004',
    name: 'UPVC Fittings - Coupling',
    category: 'Fittings',
    discount: 15,
    variants: [
      { id: 'var-040', size: '1/2"', description: 'White solvent weld connector', price: 25, originalPrice: 29, stock: 600 },
      { id: 'var-041', size: '1"', description: 'White solvent weld connector', price: 45, originalPrice: 53, stock: 420 },
    ],
  },
];

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { branch, addAuditLog } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editedOrder, setEditedOrder] = useState<OrderDetail | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<typeof MOCK_PIPE_PRODUCTS[0] | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<typeof MOCK_PIPE_PRODUCTS[0]['variants'][0] | null>(null);
  const [quantity, setQuantity] = useState(1);
  
  // Load the specific order and its audit logs
  const order = getOrderById(id || '');
  const orderLogs = order ? getOrderLogs(order.id) : [];

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
    if (confirm(`Are you sure you want to cancel order ${order.id}?`)) {
      const reason = prompt('Please provide a cancellation reason:');
      if (reason) {
        alert(`Order ${order.id} cancelled. Reason: ${reason}`);
        addAuditLog('Cancelled Order', 'Order', `Cancelled order ${order.id}: ${reason}`);
        navigate('/orders');
      }
    }
  };

  const handleResubmit = () => {
    if (order.status === 'Rejected') {
      alert(`Resubmitting order ${order.id} for approval`);
      addAuditLog('Resubmitted Order', 'Order', `Resubmitted order ${order.id} after revision`);
    }
  };

  const handleSave = () => {
    if (!editedOrder) return;
    
    // Recalculate totals
    const subtotal = editedOrder.items.reduce((sum, item) => sum + item.lineTotal, 0);
    const totalAmount = subtotal - editedOrder.discountAmount;
    
    alert('Order saved successfully');
    setIsEditing(false);
    setEditedOrder(null);
    addAuditLog('Updated Order', 'Order', `Updated order ${order.id}`);
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
    setShowProductModal(true);
  };

  const handleCloseProductModal = () => {
    setShowProductModal(false);
    setSelectedProduct(null);
    setSelectedVariant(null);
    setQuantity(1);
    setProductSearch('');
  };

  const handleSelectProduct = (product: typeof MOCK_PIPE_PRODUCTS[0]) => {
    setSelectedProduct(product);
    setSelectedVariant(null);
  };

  const handleSelectVariant = (variant: typeof MOCK_PIPE_PRODUCTS[0]['variants'][0]) => {
    setSelectedVariant(variant);
    setQuantity(1);
  };

  const getBestPriceTier = (variant: typeof MOCK_PIPE_PRODUCTS[0]['variants'][0], qty: number): PriceTier | null => {
    if (!('priceTiers' in variant) || !variant.priceTiers) return null;
    
    const applicableTiers = variant.priceTiers.filter(tier => qty >= tier.minQty);
    return applicableTiers.length > 0 ? applicableTiers[applicableTiers.length - 1] : null;
  };

  const getNextPriceTier = (variant: typeof MOCK_PIPE_PRODUCTS[0]['variants'][0], currentQty: number): PriceTier | null => {
    if (!('priceTiers' in variant) || !variant.priceTiers) return null;
    
    return variant.priceTiers.find(tier => tier.minQty > currentQty) || null;
  };

  const getEffectivePrice = () => {
    if (!selectedVariant) return 0;
    const tier = getBestPriceTier(selectedVariant, quantity);
    return tier ? tier.pricePerUnit : selectedVariant.price;
  };

  const handleAddToOrder = () => {
    if (!editedOrder || !selectedProduct || !selectedVariant) return;

    const tier = getBestPriceTier(selectedVariant, quantity);
    const effectivePrice = tier ? tier.pricePerUnit : selectedVariant.price;
    const discount = tier ? tier.discount : 0;

    const newItem: OrderLineItem = {
      id: `item-${Date.now()}`,
      sku: selectedVariant.id.toUpperCase(),
      productName: selectedProduct.name,
      variantDescription: `${selectedVariant.size} - ${selectedVariant.description}`,
      quantity: quantity,
      unitPrice: selectedVariant.price,
      discountPercent: discount,
      discountAmount: (selectedVariant.price - effectivePrice) * quantity,
      lineTotal: quantity * effectivePrice,
      stockHint: selectedVariant.stock > 50 ? 'Available' : 'Partial',
      availableStock: selectedVariant.stock,
    };

    setEditedOrder({
      ...editedOrder,
      items: [...editedOrder.items, newItem],
    });

    handleCloseProductModal();
  };

  const filteredProducts = productSearch
    ? MOCK_PIPE_PRODUCTS.filter(product =>
        product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        product.category.toLowerCase().includes(productSearch.toLowerCase())
      )
    : MOCK_PIPE_PRODUCTS;

  const handleStatusChange = (newStatus: OrderStatus) => {
    if (!editedOrder) return;
    setEditedOrder({ ...editedOrder, status: newStatus });
  };

  const handlePaymentStatusChange = (newPaymentStatus: string) => {
    if (!editedOrder) return;
    setEditedOrder({ ...editedOrder, paymentStatus: newPaymentStatus as any });
  };

  const displayOrder = isEditing && editedOrder ? editedOrder : order;

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
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/orders')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Orders
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{order.id}</h1>
            <p className="text-sm text-gray-500 mt-1">Order Details</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
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
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-gray-600">{item.sku}</td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{item.productName}</div>
                          <div className="text-xs text-gray-500">{item.variantDescription}</div>
                          {item.batchDiscount && (
                            <Badge variant="warning" className="mt-1">Bulk {item.batchDiscount}%</Badge>
                          )}
                          {item.negotiatedPrice && item.originalPrice && item.negotiatedPrice < item.originalPrice && (
                            <Badge variant="danger" className="mt-1">Negotiated</Badge>
                          )}
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
                          {item.batchDiscount ? `${item.batchDiscount}%` : '-'}
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
                              onClick={() => handleRemoveItem(item.id)}
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
                    default: return <Clock className="w-4 h-4" />;
                  }
                };

                const getActionColor = () => {
                  switch (log.action) {
                    case 'created': return 'text-blue-600 bg-blue-50';
                    case 'approved': return 'text-green-600 bg-green-50';
                    case 'rejected': 
                    case 'cancelled': return 'text-red-600 bg-red-50';
                    case 'item_removed': return 'text-orange-600 bg-orange-50';
                    case 'shipped':
                    case 'delivered': return 'text-green-600 bg-green-50';
                    case 'payment_received':
                    case 'invoice_generated': return 'text-purple-600 bg-purple-50';
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
                          <p className="text-sm font-medium text-gray-900">{log.description}</p>
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
                      {(log.oldValue || log.newValue) && (
                        <div className="mt-2 space-y-1">
                          {log.oldValue && log.newValue && (
                            <div className="text-xs flex items-center gap-2">
                              <span className="text-red-700 font-medium">
                                {typeof log.oldValue === 'object' && log.oldValue.unitPrice 
                                  ? `₱${log.oldValue.unitPrice.toLocaleString()}`
                                  : typeof log.oldValue === 'string' || typeof log.oldValue === 'number'
                                  ? log.oldValue
                                  : JSON.stringify(log.oldValue)
                                }
                              </span>
                              <span className="text-gray-400">→</span>
                              <span className="text-green-700 font-medium">
                                {typeof log.newValue === 'object' && log.newValue.unitPrice 
                                  ? `₱${log.newValue.unitPrice.toLocaleString()}`
                                  : typeof log.newValue === 'string' || typeof log.newValue === 'number'
                                  ? log.newValue
                                  : JSON.stringify(log.newValue)
                                }
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Show metadata if available */}
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="mt-2 text-xs bg-white rounded border border-gray-200 p-2 space-y-1">
                          {Object.entries(log.metadata).map(([key, value]) => {
                            const formatValue = (val: any): string => {
                              if (typeof val === 'boolean') return val ? 'Yes' : 'No';
                              if (typeof val === 'number') {
                                // Format monetary values
                                if (key === 'addedAmount' || key === 'savedAmount' || key === 'reducedAmount') {
                                  return `₱${val.toLocaleString()}`;
                                }
                                return val.toLocaleString();
                              }
                              if (key === 'dueDate') {
                                return new Date(val).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                });
                              }
                              if (key === 'estimatedArrival') {
                                return new Date(val).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                });
                              }
                              return String(val);
                            };

                            const formatKey = (k: string): string => {
                              const keyLabels: Record<string, string> = {
                                'addedAmount': 'Added to order',
                                'savedAmount': 'Saved',
                                'reducedAmount': 'Reduced by',
                                'dueDate': 'Due date',
                                'reason': 'Reason'
                              };
                              return keyLabels[k] || k.replace(/([A-Z])/g, ' $1')
                                .replace(/^./, str => str.toUpperCase())
                                .trim();
                            };

                            return (
                              <div key={key} className="flex gap-2">
                                <span className="text-gray-600">{formatKey(key)}:</span>
                                <span className="text-gray-900 font-medium">{formatValue(value)}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Product Selector Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-6 h-6 text-red-600" />
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Add Products to Order</h2>
                  <p className="text-sm text-gray-500 mt-1">Browse and select products to add</p>
                </div>
              </div>
              <button onClick={handleCloseProductModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {!selectedProduct ? (
                <>
                  {/* Search Bar */}
                  <div className="mb-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Product Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProducts.map((product) => (
                      <Card
                        key={product.id}
                        className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-red-500"
                        onClick={() => handleSelectProduct(product)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
                              <Badge variant="outline" className="text-xs">{product.category}</Badge>
                            </div>
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                          <p className="text-xs text-gray-500 mt-2">{product.variants.length} variants available</p>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                              From ₱{Math.min(...product.variants.map(v => v.price))}
                            </span>
                            <Button variant="outline" size="sm" className="gap-1">
                              Select <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {filteredProducts.length === 0 && (
                    <div className="text-center py-12">
                      <Package className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="font-medium text-gray-900">No products found</p>
                      <p className="text-sm text-gray-500 mt-1">Try adjusting your search</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {/* Product Detail View */}
                  <div className="mb-6">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedProduct(null)} className="gap-2 mb-4">
                      <ArrowLeft className="w-4 h-4" />
                      Back to Products
                    </Button>
                    
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{selectedProduct.name}</h3>
                          <Badge variant="outline" className="mt-2">{selectedProduct.category}</Badge>
                        </div>
                        <Package className="w-8 h-8 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  {/* Variant Selection */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Select Variant</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedProduct.variants.map((variant) => (
                        <Card
                          key={variant.id}
                          className={`cursor-pointer transition-all ${
                            selectedVariant?.id === variant.id
                              ? 'border-2 border-red-500 bg-red-50'
                              : 'border hover:border-red-300'
                          }`}
                          onClick={() => handleSelectVariant(variant)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h5 className="font-semibold text-gray-900">{variant.size}</h5>
                                <p className="text-xs text-gray-500 mt-1">{variant.description}</p>
                              </div>
                              {selectedVariant?.id === variant.id && (
                                <CheckCircle className="w-5 h-5 text-red-600" />
                              )}
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                              <span className="text-lg font-bold text-gray-900">₱{variant.price}</span>
                              <span className="text-xs text-gray-500">Stock: {variant.stock}</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Quantity Selection */}
                  {selectedVariant && (
                    <div className="mt-6 bg-gray-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-3">Quantity</h4>
                      <div className="flex items-center gap-4">
                        <input
                          type="number"
                          min="1"
                          max={selectedVariant.stock}
                          value={quantity}
                          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                          className="w-32 px-4 py-2 border border-gray-300 rounded-lg text-center font-medium focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                        />
                        <div className="flex-1">
                          <p className="text-sm text-gray-600">
                            Line Total: <span className="font-bold text-gray-900">₱{(quantity * getEffectivePrice()).toLocaleString()}</span>
                          </p>
                          <p className="text-xs text-gray-500 mt-1">Max available: {selectedVariant.stock} units</p>
                        </div>
                      </div>

                      {/* Batch Pricing Tiers */}
                      {('priceTiers' in selectedVariant) && selectedVariant.priceTiers && selectedVariant.priceTiers.length > 0 && (
                        <div className="mt-4">
                          <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-200">
                            <h5 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                              <Package className="w-4 h-4 text-amber-600" />
                              Bulk Buy Discounts
                            </h5>
                            <div className="space-y-2">
                              {selectedVariant.priceTiers.map((tier, idx) => {
                                const isActive = quantity >= tier.minQty;
                                const isNext = !isActive && (idx === 0 || quantity < tier.minQty) && (!selectedVariant.priceTiers![idx - 1] || quantity >= selectedVariant.priceTiers![idx - 1].minQty);
                                const isFuture = !isActive && !isNext;

                                return (
                                  <div
                                    key={idx}
                                    className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                                      isActive
                                        ? 'bg-green-50 border border-green-200'
                                        : isNext
                                        ? 'bg-blue-50 border border-blue-200'
                                        : 'bg-amber-50/30 border border-amber-100'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      {isActive && <Check className="w-5 h-5 text-green-600" />}
                                      {isNext && <ArrowUp className="w-5 h-5 text-blue-600" />}
                                      {isFuture && <Minus className="w-5 h-5 text-gray-400" />}
                                      <div>
                                        <p className={`text-sm font-semibold ${isActive ? 'text-green-900' : isNext ? 'text-blue-900' : 'text-gray-700'}`}>
                                          Buy {tier.minQty}+ units
                                        </p>
                                        <p className={`text-xs ${isActive ? 'text-green-700' : isNext ? 'text-blue-700' : 'text-gray-500'}`}>
                                          ₱{tier.pricePerUnit}/unit
                                          {tier.discount > 0 && ` • ${tier.discount}% off`}
                                        </p>
                                      </div>
                                    </div>
                                    {tier.discount > 0 && (
                                      <Badge className={isActive ? 'bg-blue-600 text-white' : isNext ? 'bg-blue-500 text-white' : 'bg-gray-400 text-white'}>
                                        Save {tier.discount}%
                                      </Badge>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            {(() => {
                              const currentTier = getBestPriceTier(selectedVariant, quantity);
                              const nextTier = getNextPriceTier(selectedVariant, quantity);
                              if (currentTier && nextTier) {
                                const additionalUnits = nextTier.minQty - quantity;
                                const currentTotal = quantity * currentTier.pricePerUnit;
                                const nextTotal = nextTier.minQty * nextTier.pricePerUnit;
                                const potentialSavings = (quantity * currentTier.pricePerUnit) - (quantity * nextTier.pricePerUnit);
                                
                                return (
                                  <div className="mt-3 p-3 bg-blue-100 border border-blue-300 rounded-lg">
                                    <p className="text-xs text-blue-900 font-medium">
                                      💡 Add {additionalUnits} more unit{additionalUnits > 1 ? 's' : ''} to unlock the next tier and save ₱{potentialSavings.toFixed(2)} per unit!
                                    </p>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between">
              <Button variant="outline" onClick={handleCloseProductModal}>
                Cancel
              </Button>
              {selectedProduct && selectedVariant && (
                <Button variant="primary" onClick={handleAddToOrder} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add to Order
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
