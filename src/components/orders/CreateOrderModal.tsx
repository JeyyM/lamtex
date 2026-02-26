import React, { useState } from 'react';
import { useAppContext } from '@/src/store/AppContext';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import {
  X,
  Plus,
  Trash2,
  ShoppingCart,
  Calendar,
  Package,
  AlertCircle,
  Search,
  Minus,
  ChevronDown,
  Check,
  ArrowUp,
} from 'lucide-react';

// Batch pricing tiers for bulk orders
interface PriceTier {
  minQty: number;
  pricePerUnit: number;
  discount: number; // percentage off from base price
}

// Mock PVC Pipes and Plastic Tubes Products
const MOCK_PIPE_PRODUCTS = [
  {
    id: 'prod-001',
    name: 'UPVC Sanitary Pipe',
    category: 'Sanitary',
    discount: 10, // 10% discount
    batchEnabled: true, // Supports batch pricing
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
      { 
        id: 'var-003', 
        size: '4" x 10ft', 
        description: 'Standard white, for sewage and main drains', 
        price: 950, 
        originalPrice: 1055, 
        stock: 78,
        priceTiers: [
          { minQty: 1, pricePerUnit: 950, discount: 0 },
          { minQty: 5, pricePerUnit: 903, discount: 5 },
          { minQty: 10, pricePerUnit: 855, discount: 10 },
          { minQty: 25, pricePerUnit: 808, discount: 15 },
        ]
      },
      { 
        id: 'var-004', 
        size: '6" x 10ft', 
        description: 'Heavy duty white, for commercial drainage', 
        price: 1850, 
        originalPrice: 2055, 
        stock: 45,
        priceTiers: [
          { minQty: 1, pricePerUnit: 1850, discount: 0 },
          { minQty: 5, pricePerUnit: 1758, discount: 5 },
          { minQty: 10, pricePerUnit: 1665, discount: 10 },
          { minQty: 25, pricePerUnit: 1573, discount: 15 },
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
      { 
        id: 'var-007', 
        size: '1" x 10ft', 
        description: 'Class C (160 PSI), main water distribution', 
        price: 580, 
        stock: 140,
        priceTiers: [
          { minQty: 1, pricePerUnit: 580, discount: 0 },
          { minQty: 5, pricePerUnit: 551, discount: 5 },
          { minQty: 10, pricePerUnit: 522, discount: 10 },
          { minQty: 25, pricePerUnit: 493, discount: 15 },
        ]
      },
      { 
        id: 'var-008', 
        size: '1-1/2" x 10ft', 
        description: 'Class C (160 PSI), commercial applications', 
        price: 920, 
        stock: 88,
        priceTiers: [
          { minQty: 1, pricePerUnit: 920, discount: 0 },
          { minQty: 5, pricePerUnit: 874, discount: 5 },
          { minQty: 10, pricePerUnit: 828, discount: 10 },
          { minQty: 25, pricePerUnit: 782, discount: 15 },
        ]
      },
      { 
        id: 'var-009', 
        size: '2" x 10ft', 
        description: 'Class C (160 PSI), high flow water supply', 
        price: 1350, 
        stock: 62,
        priceTiers: [
          { minQty: 1, pricePerUnit: 1350, discount: 0 },
          { minQty: 5, pricePerUnit: 1283, discount: 5 },
          { minQty: 10, pricePerUnit: 1215, discount: 10 },
          { minQty: 25, pricePerUnit: 1148, discount: 15 },
        ]
      },
    ],
  },
  {
    id: 'prod-003',
    name: 'UPVC Electrical Conduit',
    category: 'Electrical',
    discount: 15, // 15% discount
    variants: [
      { id: 'var-010', size: '1/2" x 10ft', description: 'Orange, for underground/concrete wiring', price: 285, originalPrice: 335, stock: 250 },
      { id: 'var-011', size: '3/4" x 10ft', description: 'Orange, standard residential conduit', price: 350, originalPrice: 412, stock: 220 },
      { id: 'var-012', size: '1" x 10ft', description: 'Orange, heavy duty electrical conduit', price: 485, originalPrice: 570, stock: 180 },
      { id: 'var-013', size: '1-1/2" x 10ft', description: 'Orange, commercial electrical installations', price: 750, originalPrice: 882, stock: 95 },
    ],
  },
  {
    id: 'prod-004',
    name: 'HDPE Garden Hose',
    category: 'Garden & Irrigation',
    discount: 20, // 20% discount - Summer sale!
    variants: [
      { id: 'var-014', size: '1/2" x 50ft', description: 'Green, flexible for home gardens', price: 680, originalPrice: 850, stock: 145 },
      { id: 'var-015', size: '1/2" x 100ft', description: 'Green, extended reach garden hose', price: 1250, originalPrice: 1562, stock: 92 },
      { id: 'var-016', size: '3/4" x 50ft', description: 'Green, heavy duty for large gardens', price: 950, originalPrice: 1187, stock: 78 },
      { id: 'var-017', size: '3/4" x 100ft', description: 'Green, professional grade garden hose', price: 1780, originalPrice: 2225, stock: 54 },
    ],
  },
  {
    id: 'prod-005',
    name: 'PPR Pipe',
    category: 'Hot & Cold Water',
    variants: [
      { id: 'var-018', size: '20mm x 4m', description: 'White, heat resistant for hot/cold water', price: 420, stock: 165 },
      { id: 'var-019', size: '25mm x 4m', description: 'White, standard residential plumbing', price: 580, stock: 142 },
      { id: 'var-020', size: '32mm x 4m', description: 'White, for main hot water lines', price: 820, stock: 98 },
      { id: 'var-021', size: '40mm x 4m', description: 'White, commercial hot water systems', price: 1150, stock: 67 },
    ],
  },
  {
    id: 'prod-006',
    name: 'Flexible PVC Hose',
    category: 'Industrial',
    discount: 5, // 5% discount
    variants: [
      { id: 'var-022', size: '1" x 50ft', description: 'Clear reinforced, for water transfer', price: 1450, originalPrice: 1526, stock: 85 },
      { id: 'var-023', size: '1-1/2" x 50ft', description: 'Clear reinforced, medium duty pumping', price: 2150, originalPrice: 2263, stock: 62 },
      { id: 'var-024', size: '2" x 50ft', description: 'Clear reinforced, heavy duty industrial', price: 3200, originalPrice: 3368, stock: 45 },
      { id: 'var-025', size: '3" x 50ft', description: 'Clear reinforced, high volume transfer', price: 5800, originalPrice: 6105, stock: 28 },
    ],
  },
  {
    id: 'prod-007',
    name: 'UPVC Fittings - Elbow 90°',
    category: 'Fittings',
    variants: [
      { id: 'var-026', size: '1/2"', description: 'White solvent weld, pressure rated', price: 35, stock: 450 },
      { id: 'var-027', size: '3/4"', description: 'White solvent weld, pressure rated', price: 45, stock: 380 },
      { id: 'var-028', size: '1"', description: 'White solvent weld, pressure rated', price: 65, stock: 320 },
      { id: 'var-029', size: '1-1/2"', description: 'White solvent weld, pressure rated', price: 125, stock: 185 },
      { id: 'var-030', size: '2"', description: 'White solvent weld, pressure rated', price: 185, stock: 145 },
    ],
  },
  {
    id: 'prod-008',
    name: 'UPVC Fittings - Tee Joint',
    category: 'Fittings',
    variants: [
      { id: 'var-031', size: '1/2"', description: 'White solvent weld, 3-way connection', price: 42, stock: 520 },
      { id: 'var-032', size: '3/4"', description: 'White solvent weld, 3-way connection', price: 58, stock: 445 },
      { id: 'var-033', size: '1"', description: 'White solvent weld, 3-way connection', price: 85, stock: 380 },
      { id: 'var-034', size: '1-1/2"', description: 'White solvent weld, 3-way connection', price: 165, stock: 215 },
    ],
  },
  {
    id: 'prod-009',
    name: 'PVC Drainage Pipe',
    category: 'Drainage',
    variants: [
      { id: 'var-035', size: '4" x 10ft', description: 'Gray, for underground drainage systems', price: 850, stock: 110 },
      { id: 'var-036', size: '6" x 10ft', description: 'Gray, for main drainage and sewer lines', price: 1650, stock: 72 },
      { id: 'var-037', size: '8" x 10ft', description: 'Gray, heavy duty for commercial drainage', price: 2850, stock: 48 },
      { id: 'var-038', size: '10" x 10ft', description: 'Gray, industrial drainage applications', price: 4200, stock: 32 },
    ],
  },
  {
    id: 'prod-010',
    name: 'Corrugated Drainage Pipe',
    category: 'Drainage',
    variants: [
      { id: 'var-039', size: '4" x 25ft', description: 'Black flexible, for yard drainage', price: 1250, stock: 88 },
      { id: 'var-040', size: '6" x 25ft', description: 'Black flexible, for driveway drainage', price: 2150, stock: 65 },
      { id: 'var-041', size: '8" x 25ft', description: 'Black flexible, for heavy duty drainage', price: 3650, stock: 42 },
    ],
  },
];

interface CreateOrderModalProps {
  customerId: string;
  customerName: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface OrderItem {
  productId: string;
  variantId: string;
  productName: string;
  variantSize: string;
  variantDescription: string;
  quantity: number;
  price: number;
  originalPrice: number; // List price before negotiation
  negotiatedPrice: number; // Price after customer haggling
  subtotal: number;
  stockAvailable: number;
}

export function CreateOrderModal({ customerId, customerName, onClose, onSuccess }: CreateOrderModalProps) {
  const { selectedBranch, addAuditLog } = useAppContext();
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<typeof MOCK_PIPE_PRODUCTS[0] | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<typeof MOCK_PIPE_PRODUCTS[0]['variants'][0] | null>(null);
  const [variantQuantity, setVariantQuantity] = useState(1);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate best price tier based on quantity
  const getBestPriceTier = (variant: typeof MOCK_PIPE_PRODUCTS[0]['variants'][0], quantity: number): PriceTier | null => {
    if (!('priceTiers' in variant) || !variant.priceTiers) return null;
    
    // Find the highest tier that the quantity qualifies for
    const qualifyingTiers = variant.priceTiers.filter(tier => quantity >= tier.minQty);
    if (qualifyingTiers.length === 0) return null;
    
    return qualifyingTiers[qualifyingTiers.length - 1];
  };

  // Get the next price tier to show savings opportunity
  const getNextPriceTier = (variant: typeof MOCK_PIPE_PRODUCTS[0]['variants'][0], currentQuantity: number): PriceTier | null => {
    if (!('priceTiers' in variant) || !variant.priceTiers) return null;
    
    const nextTier = variant.priceTiers.find(tier => tier.minQty > currentQuantity);
    return nextTier || null;
  };

  // Filter products based on search
  const filteredProducts = searchQuery.trim() === '' 
    ? MOCK_PIPE_PRODUCTS 
    : MOCK_PIPE_PRODUCTS.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const addItemFromVariant = (product: typeof MOCK_PIPE_PRODUCTS[0], variant: typeof MOCK_PIPE_PRODUCTS[0]['variants'][0], quantity: number = 1) => {
    // Check if item already exists
    const existingIndex = orderItems.findIndex(
      item => item.productId === product.id && item.variantId === variant.id
    );

    if (existingIndex >= 0) {
      // Increment quantity and recalculate price based on tier
      const newItems = [...orderItems];
      newItems[existingIndex].quantity += quantity;
      
      // Apply batch pricing if available
      const priceTier = getBestPriceTier(variant, newItems[existingIndex].quantity);
      if (priceTier) {
        newItems[existingIndex].negotiatedPrice = priceTier.pricePerUnit;
      }
      
      newItems[existingIndex].subtotal = newItems[existingIndex].quantity * newItems[existingIndex].negotiatedPrice;
      setOrderItems(newItems);
    } else {
      // Add new item
      // Calculate original price: if discount exists on product, calculate back; otherwise use variant's originalPrice or current price
      let originalPrice = variant.price;
      if ('originalPrice' in variant && variant.originalPrice) {
        originalPrice = variant.originalPrice;
      } else if (product.discount) {
        // Calculate back from discounted price
        originalPrice = variant.price / (1 - product.discount / 100);
      }
      
      // Apply batch pricing if available
      const priceTier = getBestPriceTier(variant, quantity);
      const effectivePrice = priceTier ? priceTier.pricePerUnit : variant.price;
      
      const newItem: OrderItem = {
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        variantSize: variant.size,
        variantDescription: variant.description,
        quantity: quantity,
        price: variant.price, // List price (possibly discounted)
        originalPrice: Math.round(originalPrice), // Original list price before any discount
        negotiatedPrice: effectivePrice, // Start with tier price or list price
        subtotal: effectivePrice * quantity,
        stockAvailable: variant.stock,
      };
      setOrderItems([...orderItems, newItem]);
    }

    // Close product detail modal and reset
    setSelectedProduct(null);
    setSelectedVariant(null);
    setVariantQuantity(1);
  };

  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(index);
      return;
    }

    const newItems = [...orderItems];
    const item = newItems[index];
    newItems[index].quantity = newQuantity;
    
    // Find the variant to check for batch pricing
    const product = MOCK_PIPE_PRODUCTS.find(p => p.id === item.productId);
    if (product) {
      const variant = product.variants.find(v => v.id === item.variantId);
      if (variant) {
        const priceTier = getBestPriceTier(variant, newQuantity);
        if (priceTier) {
          newItems[index].negotiatedPrice = priceTier.pricePerUnit;
        }
      }
    }
    
    newItems[index].subtotal = newQuantity * newItems[index].negotiatedPrice;
    setOrderItems(newItems);
  };

  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (orderItems.length === 0) {
      alert('Please add at least one item to the order');
      return;
    }

    if (!deliveryDate) {
      alert('Please select a delivery date');
      return;
    }

    setIsSubmitting(true);

    // Simulate order creation
    setTimeout(() => {
      const orderId = `ORD-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      addAuditLog(
        'Order Created',
        'Order',
        `Created order ${orderId} for ${customerName} with ${orderItems.length} items, total ₱${calculateTotal().toLocaleString()}`
      );

      alert(`Order ${orderId} created successfully!\n\nStatus: Pending\nCustomer: ${customerName}\nItems: ${orderItems.length}\nTotal: ₱${calculateTotal().toLocaleString()}\nScheduled Delivery: ${deliveryDate}\n\nThe order is now pending executive approval.`);
      
      setIsSubmitting(false);
      onSuccess();
      onClose();
    }, 1000);
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-red-600" />
              Create Order
            </h2>
            <p className="text-sm text-gray-500 mt-1">Customer: {customerName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Add Items Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Order Items
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search products by name or category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                {/* Product Grid */}
                <div className="grid grid-cols-5 gap-3 max-h-48 overflow-y-auto p-1">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        setSelectedProduct(product);
                        setSelectedVariant(product.variants[0]);
                        setVariantQuantity(1);
                      }}
                      className="flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all group relative"
                    >
                      {product.discount && (
                        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold shadow-sm z-10">
                          -{product.discount}%
                        </div>
                      )}
                      {product.batchEnabled && (
                        <div className="absolute -top-2 -left-2 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold shadow-sm z-10">
                          BULK
                        </div>
                      )}
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-2 group-hover:bg-red-100 transition-colors">
                        <Package className="w-6 h-6 text-gray-600 group-hover:text-red-600" />
                      </div>
                      <div className="text-xs font-medium text-gray-900 text-center line-clamp-2">{product.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{product.category}</div>
                    </button>
                  ))}
                </div>

                {/* Order Items List */}
                {orderItems.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No items added yet</p>
                    <p className="text-sm mt-1">Search and add products to start building the order</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orderItems.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{item.productName}</span>
                            <Badge variant="default" className="text-xs">{item.variantSize}</Badge>
                            {item.originalPrice > item.negotiatedPrice && (
                              <Badge variant="destructive" className="text-xs">
                                {Math.round(((item.originalPrice - item.negotiatedPrice) / item.originalPrice) * 100)}% OFF
                              </Badge>
                            )}
                            {(() => {
                              // Check if item qualifies for batch pricing
                              const product = MOCK_PIPE_PRODUCTS.find(p => p.id === item.productId);
                              if (product?.batchEnabled) {
                                const variant = product.variants.find(v => v.id === item.variantId);
                                if (variant && 'priceTiers' in variant && variant.priceTiers) {
                                  const tier = getBestPriceTier(variant, item.quantity);
                                  if (tier && tier.discount > 0) {
                                    return (
                                      <Badge className="text-xs bg-amber-500 hover:bg-amber-600">
                                        🎯 Bulk {tier.discount}%
                                      </Badge>
                                    );
                                  }
                                }
                              }
                              return null;
                            })()}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">{item.variantDescription}</div>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="text-xs text-gray-500">
                              List: ₱{item.price.toLocaleString()}/unit
                              {item.originalPrice > item.price && (
                                <span className="ml-1 line-through text-gray-400">₱{item.originalPrice.toLocaleString()}</span>
                              )}
                            </div>
                            <div className="text-xs text-gray-400">•</div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-600 font-medium">Negotiated:</span>
                              <span className="text-xs text-gray-500">₱</span>
                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={item.negotiatedPrice}
                                onChange={(e) => {
                                  const newPrice = parseFloat(e.target.value) || 0;
                                  const newItems = [...orderItems];
                                  newItems[idx].negotiatedPrice = newPrice;
                                  newItems[idx].subtotal = newPrice * newItems[idx].quantity;
                                  setOrderItems(newItems);
                                }}
                                className="w-24 px-2 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-500 font-semibold text-red-600"
                              />
                              <span className="text-xs text-gray-500">/unit</span>
                            </div>
                          </div>
                          <div className="text-xs mt-1">
                            {item.quantity > item.stockAvailable && (
                              <span className="text-red-600 font-medium">
                                ⚠️ Exceeds available stock ({item.stockAvailable})
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => updateQuantity(idx, item.quantity - 1)}
                            className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(idx, parseInt(e.target.value) || 1)}
                            className="w-20 text-center px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                          />
                          <button
                            type="button"
                            onClick={() => updateQuantity(idx, item.quantity + 1)}
                            className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Subtotal */}
                        <div className="w-32 text-right">
                          <div className="font-semibold text-gray-900">₱{item.subtotal.toLocaleString()}</div>
                        </div>

                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={() => removeItem(idx)}
                          className="text-red-600 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    ))}

                    {/* Total with Discount Summary */}
                    <div className="space-y-2">
                      {/* Calculate total discount */}
                      {(() => {
                        const totalOriginal = orderItems.reduce((sum, item) => sum + (item.originalPrice * item.quantity), 0);
                        const totalNegotiated = calculateTotal();
                        const totalSavings = totalOriginal - totalNegotiated;
                        
                        return totalSavings > 0 ? (
                          <>
                            <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                              <div className="text-sm text-gray-700">Original Total:</div>
                              <div className="text-sm text-gray-500 line-through">₱{totalOriginal.toLocaleString()}</div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">Total Savings:</span>
                                <Badge variant="destructive" className="text-xs">
                                  {Math.round((totalSavings / totalOriginal) * 100)}% OFF
                                </Badge>
                              </div>
                              <div className="text-lg font-bold text-green-600">-₱{totalSavings.toLocaleString()}</div>
                            </div>
                          </>
                        ) : null;
                      })()}
                      
                      <div className="flex items-center justify-between p-4 bg-red-600 text-white rounded-lg">
                        <div className="font-semibold text-lg">Final Amount:</div>
                        <div className="text-3xl font-bold">₱{calculateTotal().toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delivery Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Delivery Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Scheduled Delivery Date *
                  </label>
                  <input
                    type="date"
                    min={today}
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Select the expected delivery date for this order</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Order Notes (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Add any special instructions or notes for this order..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Info Alert */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium">Order Approval Required</p>
                <p className="text-blue-700 mt-1">
                  This order will be created with <strong>Pending</strong> status and must be reviewed and approved by an executive before processing.
                </p>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="text-sm text-gray-600">
            {orderItems.length} item{orderItems.length !== 1 ? 's' : ''} • Total: ₱{calculateTotal().toLocaleString()}
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              onClick={handleSubmit}
              disabled={orderItems.length === 0 || !deliveryDate || isSubmitting}
            >
              {isSubmitting ? (
                <>Creating Order...</>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Create Order
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Product Detail Modal - E-commerce Style */}
      {selectedProduct && selectedVariant && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-10 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            
            {/* Close Button */}
            <button
              onClick={() => {
                setSelectedProduct(null);
                setSelectedVariant(null);
                setVariantQuantity(1);
              }}
              className="absolute top-4 right-4 z-20 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>

            {/* Product Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-8 p-8">
                
                {/* Left: Product Image */}
                <div className="space-y-4">
                  <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center border-2 border-gray-200">
                    <Package className="w-32 h-32 text-gray-300" />
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-green-700">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium">In Stock - {selectedBranch}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Product Details */}
                <div className="space-y-6">
                  {/* Product Title */}
                  <div>
                    <Badge variant="default" className="mb-2">{selectedProduct.category}</Badge>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">{selectedProduct.name}</h2>
                    <p className="text-gray-600">{selectedVariant.description}</p>
                  </div>

                  {/* Stock Status */}
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Available Stock:</span>{' '}
                      <span className={`font-bold ${selectedVariant.stock > 50 ? 'text-green-600' : selectedVariant.stock > 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {selectedVariant.stock} Units
                      </span>
                    </div>
                  </div>

                  {/* Variant Selector */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Select Size</label>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedProduct.variants.map((variant) => (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => {
                            setSelectedVariant(variant);
                            setVariantQuantity(1);
                          }}
                          className={`px-4 py-3 border-2 rounded-lg font-medium transition-all text-left relative ${
                            selectedVariant.id === variant.id
                              ? 'border-red-600 bg-red-50 text-red-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          {selectedProduct.discount && (
                            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold shadow-sm">
                              -{selectedProduct.discount}%
                            </div>
                          )}
                          <div className="font-semibold">{variant.size}</div>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-sm font-bold">₱{variant.price.toLocaleString()}</span>
                            {selectedProduct.discount && 'originalPrice' in variant && variant.originalPrice && (
                              <span className="text-xs text-gray-400 line-through">₱{variant.originalPrice.toLocaleString()}</span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">Stock: {variant.stock}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-gray-600">Price per unit</div>
                      {selectedProduct.discount && (
                        <Badge variant="destructive" className="text-xs">
                          {selectedProduct.discount}% OFF
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-baseline gap-3">
                      <div className="text-4xl font-bold text-gray-900">₱{selectedVariant.price.toLocaleString()}</div>
                      {selectedProduct.discount && 'originalPrice' in selectedVariant && selectedVariant.originalPrice && (
                        <div className="text-xl text-gray-400 line-through">₱{selectedVariant.originalPrice.toLocaleString()}</div>
                      )}
                    </div>
                    {selectedProduct.discount && (
                      <div className="text-xs text-green-600 font-medium mt-1">
                        You save ₱{(('originalPrice' in selectedVariant && selectedVariant.originalPrice ? selectedVariant.originalPrice : selectedVariant.price) - selectedVariant.price).toLocaleString()} per unit
                      </div>
                    )}
                  </div>

                  {/* Quantity Selector */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-3">Quantity Request</label>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => setVariantQuantity(Math.max(1, variantQuantity - 1))}
                        className="w-12 h-12 flex items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={selectedVariant.stock}
                        value={variantQuantity}
                        onChange={(e) => setVariantQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-24 text-center text-2xl font-bold px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                      <button
                        type="button"
                        onClick={() => setVariantQuantity(Math.min(selectedVariant.stock, variantQuantity + 1))}
                        className="w-12 h-12 flex items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    {variantQuantity > selectedVariant.stock && (
                      <p className="text-sm text-red-600 mt-2">⚠️ Quantity exceeds available stock</p>
                    )}
                    
                    {/* Batch Pricing Tiers Display */}
                    {('priceTiers' in selectedVariant && selectedVariant.priceTiers) && (
                      <div className="mt-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-bold">%</span>
                          </div>
                          <span className="text-sm font-bold text-amber-900">Bulk Order Discounts</span>
                        </div>
                        <div className="space-y-2">
                          {selectedVariant.priceTiers.map((tier, idx) => {
                            const isActive = variantQuantity >= tier.minQty;
                            const isNext = !isActive && (idx === 0 || variantQuantity >= selectedVariant.priceTiers[idx - 1].minQty);
                            
                            return (
                              <div
                                key={idx}
                                className={`flex items-center justify-between px-3 py-2 rounded-lg transition-all ${
                                  isActive 
                                    ? 'bg-green-100 border-2 border-green-500 shadow-sm' 
                                    : isNext
                                    ? 'bg-blue-50 border border-blue-300'
                                    : 'bg-white border border-gray-200 opacity-60'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {isActive && (
                                    <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                                      <Check className="w-3 h-3 text-white" />
                                    </div>
                                  )}
                                  {isNext && !isActive && (
                                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                      <ArrowUp className="w-3 h-3 text-white" />
                                    </div>
                                  )}
                                  <span className={`text-sm font-semibold ${
                                    isActive ? 'text-green-900' : isNext ? 'text-blue-900' : 'text-gray-600'
                                  }`}>
                                    Buy {tier.minQty}+ units
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-bold ${
                                    isActive ? 'text-green-700' : isNext ? 'text-blue-700' : 'text-gray-600'
                                  }`}>
                                    ₱{tier.pricePerUnit.toLocaleString()}/unit
                                  </span>
                                  {tier.discount > 0 && (
                                    <Badge variant={isActive ? "default" : "outline"} className="text-xs">
                                      -{tier.discount}%
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {(() => {
                          const nextTier = getNextPriceTier(selectedVariant, variantQuantity);
                          if (nextTier) {
                            const unitsNeeded = nextTier.minQty - variantQuantity;
                            const additionalSavings = (selectedVariant.price - nextTier.pricePerUnit) * variantQuantity;
                            return (
                              <div className="mt-3 pt-3 border-t border-amber-300">
                                <p className="text-xs text-amber-800">
                                  💡 <strong>Add {unitsNeeded} more unit{unitsNeeded > 1 ? 's' : ''}</strong> to save an additional <strong>₱{additionalSavings.toLocaleString()}</strong>!
                                </p>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Subtotal */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-900">Subtotal</span>
                      <span className="text-2xl font-bold text-blue-900">
                        {(() => {
                          const priceTier = getBestPriceTier(selectedVariant, variantQuantity);
                          const effectivePrice = priceTier ? priceTier.pricePerUnit : selectedVariant.price;
                          return `₱${(effectivePrice * variantQuantity).toLocaleString()}`;
                        })()}
                      </span>
                    </div>
                    {(() => {
                      const priceTier = getBestPriceTier(selectedVariant, variantQuantity);
                      if (priceTier && priceTier.discount > 0) {
                        const regularTotal = selectedVariant.price * variantQuantity;
                        const discountedTotal = priceTier.pricePerUnit * variantQuantity;
                        const savings = regularTotal - discountedTotal;
                        return (
                          <div className="text-xs text-green-600 font-medium mt-1">
                            💰 Bulk discount saves you ₱{savings.toLocaleString()}!
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {/* Add to Order Button */}
                  <button
                    type="button"
                    onClick={() => addItemFromVariant(selectedProduct, selectedVariant, variantQuantity)}
                    className="w-full py-4 bg-red-600 text-white text-lg font-semibold rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Add to Order List
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
