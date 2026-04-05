import React, { useState } from 'react';
import { useAppContext } from '@/src/store/AppContext';
import { Button } from '@/src/components/ui/Button';
import { Badge } from '@/src/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { getCustomersByBranch } from '@/src/mock/customers';
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
  User,
  MapPin,
  Phone,
} from 'lucide-react';

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
  customerId?: string;
  customerName?: string;
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
  originalPrice: number; // Base price of variant
  negotiatedPrice: number; // Price set by agent (can be custom)
  discounts: Array<{ name: string; percentage: number }>; // Applied discounts
  subtotal: number;
  stockAvailable: number;
}

export function CreateOrderModal({ customerId: initialCustomerId, customerName: initialCustomerName, onClose, onSuccess }: CreateOrderModalProps) {
  const { branch, addAuditLog } = useAppContext();
  const allCustomers = getCustomersByBranch(branch);
  
  // Customer selection state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomerId || '');
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>(initialCustomerName || '');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  
  // Order state
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<typeof MOCK_PIPE_PRODUCTS[0] | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<typeof MOCK_PIPE_PRODUCTS[0]['variants'][0] | null>(null);
  const [variantQuantity, setVariantQuantity] = useState(1);
  const [variantPrice, setVariantPrice] = useState(0);
  const [variantDiscounts, setVariantDiscounts] = useState<Array<{ name: string; percentage: number }>>([]);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null); // Track if editing existing item
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState<'Normal' | 'High' | 'Urgent'>('Normal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filter customers based on search
  const filteredCustomers = customerSearchQuery.trim() === ''
    ? allCustomers.slice(0, 10) // Show first 10 if no search
    : allCustomers.filter(customer =>
        customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        customer.email?.toLowerCase().includes(customerSearchQuery.toLowerCase())
      ).slice(0, 10);
  
  // Select customer handler
  const handleSelectCustomer = (customer: typeof allCustomers[0]) => {
    setSelectedCustomerId(customer.id);
    setSelectedCustomerName(customer.name);
    setDeliveryAddress(customer.address || '');
    setContactPerson(customer.name);
    setContactPhone(customer.phone || '');
    setShowCustomerDropdown(false);
    setCustomerSearchQuery('');
  };

  // Filter products based on search
  const filteredProducts = searchQuery.trim() === '' 
    ? MOCK_PIPE_PRODUCTS 
    : MOCK_PIPE_PRODUCTS.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const addItemFromVariant = (product: typeof MOCK_PIPE_PRODUCTS[0], variant: typeof MOCK_PIPE_PRODUCTS[0]['variants'][0], quantity: number = 1) => {
    // Apply discounts multiplicatively to get final price
    const finalPrice = variantDiscounts.reduce((currentPrice, discount) => {
      return currentPrice * (1 - discount.percentage / 100);
    }, variantPrice);
    
    const itemData: OrderItem = {
      productId: product.id,
      variantId: variant.id,
      productName: product.name,
      variantSize: variant.size,
      variantDescription: variant.description,
      quantity: quantity,
      price: variant.price, // Base price of variant
      originalPrice: variant.price, // Base price
      negotiatedPrice: variantPrice, // Agent-set price
      discounts: [...variantDiscounts], // Copy of applied discounts
      subtotal: finalPrice * quantity,
      stockAvailable: variant.stock,
    };
    
    if (editingItemIndex !== null) {
      // Update existing item
      const newItems = [...orderItems];
      newItems[editingItemIndex] = itemData;
      setOrderItems(newItems);
      setEditingItemIndex(null);
    } else {
      // Check if item already exists
      const existingIndex = orderItems.findIndex(
        item => item.productId === product.id && item.variantId === variant.id
      );

      if (existingIndex >= 0) {
        // Increment quantity
        const newItems = [...orderItems];
        newItems[existingIndex].quantity += quantity;
        newItems[existingIndex].subtotal = newItems[existingIndex].quantity * newItems[existingIndex].negotiatedPrice;
        setOrderItems(newItems);
      } else {
        // Add new item
        setOrderItems([...orderItems, itemData]);
      }
    }

    // Close product detail modal and reset
    setSelectedProduct(null);
    setSelectedVariant(null);
    setVariantQuantity(1);
    setVariantPrice(0);
    setVariantDiscounts([]);
  };

  const addDiscount = () => {
    setVariantDiscounts([...variantDiscounts, { name: '', percentage: 0 }]);
  };

  const updateDiscount = (index: number, field: 'name' | 'percentage', value: string | number) => {
    const newDiscounts = [...variantDiscounts];
    if (field === 'name') {
      newDiscounts[index].name = value as string;
    } else {
      newDiscounts[index].percentage = Math.max(0, Math.min(100, Number(value) || 0));
    }
    setVariantDiscounts(newDiscounts);
  };

  const removeDiscount = (index: number) => {
    setVariantDiscounts(variantDiscounts.filter((_, i) => i !== index));
  };

  const calculateTotalDiscount = () => {
    // Calculate effective discount percentage from cascading discounts
    const subtotal = variantPrice * variantQuantity;
    if (subtotal === 0) return 0;
    
    const finalPrice = variantDiscounts.reduce((currentPrice, discount) => {
      return currentPrice * (1 - discount.percentage / 100);
    }, subtotal);
    
    const totalDiscountAmount = subtotal - finalPrice;
    return (totalDiscountAmount / subtotal) * 100;
  };

  const calculateFinalPrice = () => {
    const subtotal = variantPrice * variantQuantity;
    // Apply discounts multiplicatively (cascading)
    return variantDiscounts.reduce((currentPrice, discount) => {
      return currentPrice * (1 - discount.percentage / 100);
    }, subtotal);
  };

  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(index);
      return;
    }

    const newItems = [...orderItems];
    newItems[index].quantity = newQuantity;
    newItems[index].subtotal = newQuantity * newItems[index].negotiatedPrice;
    setOrderItems(newItems);
  };

  const removeItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const editOrderItem = (index: number) => {
    const item = orderItems[index];
    
    // Find the product and variant
    const product = filteredProducts.find(p => p.id === item.productId);
    if (!product) return;
    
    const variant = product.variants?.find(v => v.id === item.variantId);
    if (!variant) return;
    
    // Set the product and variant to open the modal
    setSelectedProduct(product);
    setSelectedVariant(variant);
    
    // Preset all values from the existing order item
    setVariantQuantity(item.quantity);
    setVariantPrice(item.negotiatedPrice);
    setVariantDiscounts([...item.discounts]);
    
    // Track that we're editing this item (don't remove it yet)
    setEditingItemIndex(index);
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCustomerId || !selectedCustomerName) {
      alert('Please select a customer for this order');
      return;
    }
    
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
        `Created order ${orderId} for ${selectedCustomerName} with ${orderItems.length} items, total ₱${calculateTotal().toLocaleString()}`
      );

      alert(`Order ${orderId} created successfully!\n\nStatus: Pending\nCustomer: ${selectedCustomerName}\nItems: ${orderItems.length}\nTotal: ₱${calculateTotal().toLocaleString()}\nScheduled Delivery: ${deliveryDate}\n\nThe order is now pending executive approval.`);
      
      setIsSubmitting(false);
      onSuccess();
      onClose();
    }, 1000);
  };

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-0 lg:p-4"
    >
      <div 
        className="bg-white w-full h-full max-h-screen overflow-hidden flex flex-col lg:rounded-lg lg:h-auto lg:max-w-5xl lg:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 md:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-red-600" />
              Create Order
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {selectedCustomerName ? `Customer: ${selectedCustomerName}` : 'Select a customer to begin'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Selection - Only show if no customer pre-selected */}
            {!initialCustomerId && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Select Customer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="customer-search-field-lamtex"
                      placeholder="Search customers by name or email..."
                      value={customerSearchQuery}
                      onChange={(e) => {
                        setCustomerSearchQuery(e.target.value);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      autoComplete="new-password"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      data-form-type="other"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 text-base"
                    />
                    
                    {/* Customer Dropdown */}
                    {showCustomerDropdown && (
                      <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map((customer) => (
                            <button
                              key={customer.id}
                              type="button"
                              onClick={() => handleSelectCustomer(customer)}
                              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">{customer.name}</div>
                                  {customer.email && (
                                    <div className="text-sm text-gray-500 mt-1">{customer.email}</div>
                                  )}
                                  {customer.phone && (
                                    <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                      <Phone className="w-3 h-3" />
                                      {customer.phone}
                                    </div>
                                  )}
                                </div>
                                {customer.id === selectedCustomerId && (
                                  <Check className="w-5 h-5 text-green-600" />
                                )}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-8 text-center text-gray-500">
                            <User className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                            <p className="text-sm">No customers found</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Selected Customer Display */}
                  {selectedCustomerId && selectedCustomerName && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{selectedCustomerName}</div>
                          <div className="text-sm text-gray-600">Customer selected</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomerId('');
                            setSelectedCustomerName('');
                            setDeliveryAddress('');
                            setContactPerson('');
                            setContactPhone('');
                          }}
                          className="text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-48 overflow-y-auto p-1">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        setSelectedProduct(product);
                        setSelectedVariant(product.variants[0]);
                        setVariantQuantity(1);
                        setVariantPrice(product.variants[0].price);
                      }}
                      className="flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:border-red-500 hover:bg-red-50 transition-all group relative"
                    >
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
                      <div 
                        key={idx} 
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
                        onClick={() => editOrderItem(idx)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900 group-hover:text-red-600 transition-colors">{item.productName}</span>
                            <Badge variant="default" className="text-xs">{item.variantSize}</Badge>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">{item.variantDescription}</div>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="text-xs text-gray-500">
                              Base: ₱{item.price.toLocaleString()}/unit
                            </div>
                            {item.negotiatedPrice !== item.price && (
                              <>
                                <div className="text-xs text-gray-400">•</div>
                                <div className="text-xs text-red-600 font-medium">
                                  Custom: ₱{item.negotiatedPrice.toLocaleString()}/unit
                                </div>
                              </>
                            )}
                          </div>
                          {item.discounts && item.discounts.length > 0 && (
                            <div className="flex items-center gap-1 mt-1 flex-wrap">
                              <span className="text-xs text-gray-500">Discounts:</span>
                              {item.discounts.map((discount, dIdx) => (
                                <Badge key={dIdx} variant="secondary" className="text-xs">
                                  {discount.name} ({discount.percentage}%)
                                </Badge>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <div className="text-xs text-gray-500">
                              Qty: {item.quantity} × ₱{(item.subtotal / item.quantity).toLocaleString()}/unit
                            </div>
                            {item.quantity > item.stockAvailable && (
                              <>
                                <div className="text-xs text-gray-400">•</div>
                                <span className="text-xs text-red-600 font-medium">
                                  ⚠️ Exceeds stock ({item.stockAvailable})
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Subtotal */}
                        <div className="w-32 text-right">
                          <div className="text-sm text-gray-600 font-medium mb-1">Total</div>
                          {item.discounts && item.discounts.length > 0 && (
                            <div className="text-xs text-gray-400 line-through mb-0.5">
                              ₱{(item.negotiatedPrice * item.quantity).toLocaleString()}
                            </div>
                          )}
                          <div className="font-semibold text-gray-900 text-lg">₱{item.subtotal.toLocaleString()}</div>
                        </div>

                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent triggering edit
                            removeItem(idx);
                          }}
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
        <div className="sticky bottom-0 px-4 md:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-50">
          <div className="text-sm text-gray-600 text-center sm:text-left">
            {orderItems.length} item{orderItems.length !== 1 ? 's' : ''} • Total: ₱{calculateTotal().toLocaleString()}
          </div>
          <div className="flex flex-col-reverse sm:flex-row gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              onClick={handleSubmit}
              disabled={orderItems.length === 0 || !deliveryDate || isSubmitting}
              className="w-full sm:w-auto"
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
          <div className="bg-white rounded-none lg:rounded-lg shadow-2xl w-full h-full lg:h-auto lg:max-w-4xl lg:max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            
            {/* Close Button */}
            <button
              onClick={() => {
                setSelectedProduct(null);
                setSelectedVariant(null);
                setVariantQuantity(1);
                setVariantPrice(0);
                setVariantDiscounts([]);
                setEditingItemIndex(null); // Cancel editing
              }}
              className="absolute top-4 right-4 z-20 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>

            {/* Product Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 p-4 md:p-8">
                
                {/* Left: Product Image */}
                <div className="space-y-4">
                  <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center border-2 border-gray-200">
                    <Package className="w-32 h-32 text-gray-300" />
                  </div>
                  
                  {/* Price */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-gray-600">Price per unit</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-gray-900">₱</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={variantPrice}
                        onChange={(e) => setVariantPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="flex-1 min-w-0 text-4xl font-bold text-gray-900 bg-white px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Base price: ₱{selectedVariant.price.toLocaleString()}</p>
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
                            setVariantPrice(variant.price);
                          }}
                          className={`px-4 py-3 border-2 rounded-lg font-medium transition-all text-left relative ${
                            selectedVariant.id === variant.id
                              ? 'border-red-600 bg-red-50 text-red-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          <div className="font-semibold">{variant.size}</div>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-sm font-bold">₱{variant.price.toLocaleString()}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">Stock: {variant.stock}</div>
                        </button>
                      ))}
                    </div>
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
                  </div>

                  {/* Discounts Section */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-semibold text-gray-900">Discounts</label>
                      <button
                        type="button"
                        onClick={addDiscount}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add Discount
                      </button>
                    </div>
                    
                    {variantDiscounts.length > 0 ? (
                      <div className="space-y-2">
                        {variantDiscounts.map((discount, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Discount name"
                              value={discount.name}
                              onChange={(e) => updateDiscount(index, 'name', e.target.value)}
                              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            />
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                placeholder="0"
                                value={discount.percentage || ''}
                                onChange={(e) => updateDiscount(index, 'percentage', e.target.value)}
                                onWheel={(e) => e.currentTarget.blur()}
                                className="w-20 px-3 py-2 text-sm text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                              />
                              <span className="text-sm text-gray-600">%</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeDiscount(index)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        {calculateTotalDiscount() > 0 && (
                          <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-sm text-green-700 font-medium">
                              Total Discount: {calculateTotalDiscount().toFixed(1)}%
                            </p>
                          </div>
                        )}
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
                        ₱{(variantPrice * variantQuantity).toLocaleString()}
                      </span>
                    </div>
                    {variantDiscounts.length > 0 && (
                      <>
                        {(() => {
                          let currentPrice = variantPrice * variantQuantity;
                          return variantDiscounts.map((discount, index) => {
                            const priceBeforeDiscount = currentPrice;
                            const discountAmount = currentPrice * (discount.percentage / 100);
                            currentPrice = currentPrice - discountAmount;
                            
                            return (
                              <div key={index} className="flex items-center justify-between text-sm">
                                <span className="text-green-700">
                                  {discount.name || `Discount ${index + 1}`} ({discount.percentage}%)
                                </span>
                                <span className="text-green-700 font-semibold">
                                  -₱{discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            );
                          });
                        })()}
                        <div className="pt-2 border-t border-blue-300">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-blue-900">Final Cost</span>
                            <span className="text-2xl font-bold text-blue-900">
                              ₱{calculateFinalPrice().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
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
