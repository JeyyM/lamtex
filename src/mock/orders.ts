// Mock data for orders - Agent functionality

import { OrderDetail, OrderLineItem, ApprovalRule } from '../types/orders';

export const APPROVAL_RULES: ApprovalRule[] = [
  { type: 'discount', threshold: 10, description: 'Discount exceeds 10%' },
  { type: 'minPrice', threshold: 0, description: 'Price below minimum allowed' },
  { type: 'paymentTerms', threshold: 60, description: 'Payment terms exceed 60 days' },
  { type: 'creditLimit', threshold: 0, description: 'Order exceeds customer credit limit' },
];

export const MOCK_ORDERS_DETAILED: OrderDetail[] = [
  {
    id: 'ORD-2026-1001',
    customer: 'Mega Hardware Center',
    customerId: 'CUS-001',
    agent: 'Pedro Reyes',
    agentId: 'AGT-001',
    branch: 'Branch A',
    orderDate: '2026-02-24',
    requiredDate: '2026-02-28',
    deliveryType: 'Truck',
    paymentTerms: '30 Days',
    paymentMethod: 'Offline',
    status: 'Pending',
    paymentStatus: 'Unbilled',
    
    items: [
      {
        id: 'OL-1001-1',
        sku: 'PVC-4-150-3M',
        productName: 'UPVC Sanitary Pipe',
        variantDescription: '4" x 10ft - Standard white',
        quantity: 25,
        unitPrice: 950,
        originalPrice: 1055,
        negotiatedPrice: 808,
        discountPercent: 15,
        discountAmount: 3550,
        lineTotal: 20200,
        stockHint: 'Available',
        availableStock: 78,
        batchDiscount: 15, // Qualified for 25+ bulk discount
      },
      {
        id: 'OL-1001-2',
        sku: 'SOL-100ML',
        productName: 'Solvent Cement',
        variantDescription: '100ml Bottle',
        quantity: 100,
        unitPrice: 45,
        negotiatedPrice: 42,
        discountPercent: 7,
        discountAmount: 300,
        lineTotal: 4200,
        stockHint: 'Available',
        availableStock: 800,
      },
      {
        id: 'OL-1001-3',
        sku: 'HDPE-6-100-6M',
        productName: 'UPVC Pressure Pipe',
        variantDescription: '2" x 10ft - Class C (160 PSI)',
        quantity: 10,
        unitPrice: 1350,
        negotiatedPrice: 1215,
        discountPercent: 10,
        discountAmount: 1350,
        lineTotal: 12150,
        stockHint: 'Available',
        availableStock: 62,
        batchDiscount: 10, // Qualified for 10+ bulk discount
      },
    ],
    
    subtotal: 36550,
    discountPercent: 14.0,
    discountAmount: 5200,
    totalAmount: 36550,
    
    requiresApproval: true,
    approvalReason: ['Discount exceeds 10%', 'Bulk pricing applied'],
    
    orderNotes: 'Customer negotiated bulk pricing. Qualified for tier discounts on UPVC pipes.',
    createdAt: '2026-02-24T09:15:00Z',
    updatedAt: '2026-02-24T09:15:00Z',
    
    amountPaid: 0,
    balanceDue: 36550,
  },
  
  // Draft Order
  {
    id: 'ORD-2026-1002',
    customer: 'BuildMaster Construction Corp',
    customerId: 'CUS-002',
    agent: 'Juan Dela Cruz',
    agentId: 'AGT-002',
    branch: 'Branch A',
    orderDate: '2026-02-26',
    requiredDate: '2026-03-05',
    deliveryType: 'Truck',
    paymentTerms: '30 Days',
    paymentMethod: 'Offline',
    status: 'Draft',
    paymentStatus: 'Unbilled',
    
    items: [
      {
        id: 'OL-1002-1',
        sku: 'UPVC-PRESS-1',
        productName: 'UPVC Pressure Pipe',
        variantDescription: '1" x 10ft - Class C (160 PSI)',
        quantity: 15,
        unitPrice: 580,
        negotiatedPrice: 522,
        discountPercent: 10,
        discountAmount: 870,
        lineTotal: 7830,
        stockHint: 'Available',
        availableStock: 140,
        batchDiscount: 10,
      },
      {
        id: 'OL-1002-2',
        sku: 'PVC-ELBOW-1',
        productName: 'UPVC Elbow Fittings',
        variantDescription: '1" - White solvent weld',
        quantity: 20,
        unitPrice: 85,
        discountPercent: 0,
        discountAmount: 0,
        lineTotal: 1700,
        stockHint: 'Available',
        availableStock: 380,
      },
    ],
    
    subtotal: 9530,
    discountPercent: 9.1,
    discountAmount: 870,
    totalAmount: 9530,
    
    requiresApproval: false,
    
    orderNotes: 'Draft order - still adding items. Customer will confirm quantities tomorrow.',
    createdAt: '2026-02-26T10:30:00Z',
    updatedAt: '2026-02-26T10:45:00Z',
    
    amountPaid: 0,
    balanceDue: 9530,
  },
  
  // Approved Order
  {
    id: 'ORD-2026-1003',
    customer: 'Pacific Hardware Solutions',
    customerId: 'CUS-003',
    agent: 'Maria Santos',
    agentId: 'AGT-003',
    branch: 'Branch A',
    orderDate: '2026-02-25',
    requiredDate: '2026-02-28',
    deliveryType: 'Truck',
    paymentTerms: '45 Days',
    paymentMethod: 'Online',
    status: 'Approved',
    paymentStatus: 'Unbilled',
    
    items: [
      {
        id: 'OL-1003-1',
        sku: 'UPVC-SAN-2',
        productName: 'UPVC Sanitary Pipe',
        variantDescription: '2" x 10ft - Standard white',
        quantity: 50,
        unitPrice: 450,
        originalPrice: 500,
        negotiatedPrice: 428,
        discountPercent: 5,
        discountAmount: 1100,
        lineTotal: 21400,
        stockHint: 'Available',
        availableStock: 120,
        batchDiscount: 5,
      },
      {
        id: 'OL-1003-2',
        sku: 'PVC-TEE-075',
        productName: 'UPVC Fittings - Tee Joint',
        variantDescription: '3/4" - White solvent weld',
        quantity: 30,
        unitPrice: 58,
        discountPercent: 0,
        discountAmount: 0,
        lineTotal: 1740,
        stockHint: 'Available',
        availableStock: 445,
      },
      {
        id: 'OL-1003-3',
        sku: 'PVC-COUP-1',
        productName: 'UPVC Fittings - Coupling',
        variantDescription: '1" - White solvent weld',
        quantity: 40,
        unitPrice: 65,
        negotiatedPrice: 60,
        discountPercent: 8,
        discountAmount: 200,
        lineTotal: 2400,
        stockHint: 'Available',
        availableStock: 320,
      },
    ],
    
    subtotal: 25540,
    discountPercent: 5.1,
    discountAmount: 1300,
    totalAmount: 25540,
    
    requiresApproval: false,
    approvedBy: 'Manager A',
    approvedDate: '2026-02-25T15:20:00Z',
    
    orderNotes: 'Approved for fulfillment. Priority order for ongoing project.',
    createdAt: '2026-02-25T11:00:00Z',
    updatedAt: '2026-02-25T15:20:00Z',
    
    amountPaid: 0,
    balanceDue: 25540,
  },
  
  // In Transit Order
  {
    id: 'ORD-2026-1004',
    customer: 'Metro Plumbing Supplies',
    customerId: 'CUS-004',
    agent: 'Pedro Reyes',
    agentId: 'AGT-001',
    branch: 'Branch A',
    orderDate: '2026-02-22',
    requiredDate: '2026-02-26',
    deliveryType: 'Truck',
    paymentTerms: '30 Days',
    paymentMethod: 'Online',
    status: 'In Transit',
    paymentStatus: 'Invoiced',
    
    items: [
      {
        id: 'OL-1002-1',
        sku: 'RBR-16MM-12M',
        productName: 'Steel Rebar',
        variantDescription: '16mm x 12 meters',
        quantity: 500,
        unitPrice: 280,
        discountPercent: 5,
        discountAmount: 7000,
        lineTotal: 133000,
        stockHint: 'Available',
        availableStock: 1200,
      },
      {
        id: 'OL-1002-2',
        sku: 'CEM-50KG-PORTLAND',
        productName: 'Portland Cement',
        variantDescription: '50kg Bag',
        quantity: 300,
        unitPrice: 320,
        discountPercent: 3,
        discountAmount: 2880,
        lineTotal: 93120,
        stockHint: 'Available',
        availableStock: 5000,
      },
    ],
    
    subtotal: 226120,
    discountPercent: 4.4,
    discountAmount: 9880,
    totalAmount: 216240,
    
    requiresApproval: false,
    
    invoiceId: 'INV-2026-5234',
    invoiceDate: '2026-02-21',
    dueDate: '2026-04-07',
    amountPaid: 216240,
    balanceDue: 0,
    
    approvedBy: 'Manager A',
    approvedDate: '2026-02-20T14:30:00Z',
    
    estimatedDelivery: '2026-02-25T10:00:00Z',
    deliveryStatus: 'On Time',
    
    orderNotes: 'Large construction project in Quezon City. Priority delivery.',
    createdAt: '2026-02-20T10:30:00Z',
    updatedAt: '2026-02-24T16:45:00Z',
  },
  {
    id: 'ORD-2026-1003',
    customer: 'City Builders Supply',
    customerId: 'CUS-003',
    agent: 'Pedro Reyes',
    agentId: 'AGT-001',
    branch: 'Branch A',
    orderDate: '2026-02-18',
    requiredDate: '2026-02-22',
    deliveryType: 'Truck',
    paymentTerms: '30 Days',
    paymentMethod: 'Offline',
    status: 'Delivered',
    paymentStatus: 'Overdue',
    
    items: [
      {
        id: 'OL-1003-1',
        sku: 'PVC-2-150-3M',
        productName: 'PVC Pipe',
        variantDescription: '2" Class 150 - 3 meters',
        quantity: 300,
        unitPrice: 120,
        discountPercent: 5,
        discountAmount: 1800,
        lineTotal: 34200,
        stockHint: 'Available',
        availableStock: 1000,
      },
    ],
    
    subtotal: 36000,
    discountPercent: 5,
    discountAmount: 1800,
    totalAmount: 34200,
    
    requiresApproval: false,
    
    invoiceId: 'INV-2026-5201',
    invoiceDate: '2026-02-19',
    dueDate: '2026-02-21',
    amountPaid: 15000,
    balanceDue: 19200,
    
    approvedBy: 'Manager A',
    approvedDate: '2026-02-18T11:00:00Z',
    
    estimatedDelivery: '2026-02-22T14:00:00Z',
    actualDelivery: '2026-02-22T15:30:00Z',
    deliveryStatus: 'On Time',
    
    createdAt: '2026-02-18T08:45:00Z',
    updatedAt: '2026-02-22T15:30:00Z',
  },
  {
    id: 'ORD-2026-0998',
    customer: 'Mega Hardware Center',
    customerId: 'CUS-001',
    agent: 'Pedro Reyes',
    agentId: 'AGT-001',
    branch: 'Branch A',
    orderDate: '2026-02-15',
    requiredDate: '2026-02-18',
    deliveryType: 'Truck',
    paymentTerms: '30 Days',
    paymentMethod: 'Offline',
    status: 'Rejected',
    paymentStatus: 'Unbilled',
    
    items: [
      {
        id: 'OL-0998-1',
        sku: 'HDPE-8-100-6M',
        productName: 'HDPE Pipe',
        variantDescription: '8" PN100 - 6 meters',
        quantity: 100,
        unitPrice: 1800,
        discountPercent: 25,
        discountAmount: 45000,
        lineTotal: 135000,
        stockHint: 'Available',
        availableStock: 150,
      },
    ],
    
    subtotal: 180000,
    discountPercent: 25,
    discountAmount: 45000,
    totalAmount: 135000,
    
    requiresApproval: true,
    approvalReason: ['Discount exceeds 10%', 'Price below minimum allowed'],
    
    rejectedBy: 'Manager A',
    rejectedDate: '2026-02-15T16:00:00Z',
    rejectionReason: 'Discount too high. Maximum allowed is 15% for this product category. Please revise.',
    
    orderNotes: 'Customer negotiating for bulk discount.',
    internalNotes: 'Rejected - discount policy violation.',
    createdAt: '2026-02-15T14:00:00Z',
    updatedAt: '2026-02-15T16:00:00Z',
    
    amountPaid: 0,
    balanceDue: 0,
  },
  {
    id: 'ORD-2026-0995',
    customer: 'ProBuild Contractors',
    customerId: 'CUS-005',
    agent: 'Maria Santos',
    agentId: 'AGT-003',
    branch: 'Branch B',
    orderDate: '2026-02-23',
    requiredDate: '2026-02-27',
    deliveryType: 'Truck',
    paymentTerms: '60 Days',
    paymentMethod: 'Offline',
    status: 'Draft',
    paymentStatus: 'Unbilled',
    
    items: [
      {
        id: 'OL-0995-1',
        sku: 'CEM-50KG-PORTLAND',
        productName: 'Portland Cement',
        variantDescription: '50kg Bag',
        quantity: 200,
        unitPrice: 320,
        discountPercent: 0,
        discountAmount: 0,
        lineTotal: 64000,
        stockHint: 'Available',
        availableStock: 5000,
      },
    ],
    
    subtotal: 64000,
    discountPercent: 0,
    discountAmount: 0,
    totalAmount: 64000,
    
    requiresApproval: false,
    
    orderNotes: 'Draft - awaiting customer confirmation on delivery date.',
    createdAt: '2026-02-23T16:30:00Z',
    updatedAt: '2026-02-23T16:30:00Z',
    
    amountPaid: 0,
    balanceDue: 64000,
  },
  
  // Rejected Order - Excessive Discount
  {
    id: 'ORD-2026-1101',
    customer: 'Northern Trade Hardware',
    customerId: 'CUS-011',
    agent: 'Juan Dela Cruz',
    agentId: 'AGT-002',
    branch: 'Branch A',
    orderDate: '2026-02-23',
    requiredDate: '2026-02-28',
    deliveryType: 'Truck',
    paymentTerms: '90 Days',
    paymentMethod: 'Offline',
    status: 'Rejected',
    paymentStatus: 'Unbilled',
    
    items: [
      {
        id: 'OL-1101-1',
        sku: 'UPVC-PRESS-2-BULK',
        productName: 'UPVC Pressure Pipe',
        variantDescription: '2" x 10ft - Bulk order',
        quantity: 200,
        unitPrice: 1350,
        negotiatedPrice: 945,
        discountPercent: 30,
        discountAmount: 81000,
        lineTotal: 189000,
        stockHint: 'Partial',
        availableStock: 62,
      },
    ],
    
    subtotal: 270000,
    discountPercent: 30,
    discountAmount: 81000,
    totalAmount: 189000,
    
    requiresApproval: true,
    approvalReason: ['Discount exceeds 10%', 'Payment terms exceed 60 days', 'Price below minimum threshold'],
    rejectedBy: 'Manager A',
    rejectedDate: '2026-02-24T10:15:00Z',
    rejectionReason: 'Discount of 30% is too high. Maximum approved discount is 15%. Payment terms of 90 days exceed policy. Customer credit limit also insufficient for this order size.',
    
    orderNotes: 'Customer requested aggressive bulk pricing. Terms not acceptable per company policy.',
    createdAt: '2026-02-23T14:00:00Z',
    updatedAt: '2026-02-24T10:15:00Z',
    
    amountPaid: 0,
    balanceDue: 189000,
  },
  
  // Picking Status - Being Fulfilled
  {
    id: 'ORD-2026-1102',
    customer: 'Southern Islands Supply',
    customerId: 'CUS-012',
    agent: 'Maria Santos',
    agentId: 'AGT-003',
    branch: 'Branch A',
    orderDate: '2026-02-25',
    requiredDate: '2026-02-27',
    deliveryType: 'Truck',
    paymentTerms: '30 Days',
    paymentMethod: 'Online',
    status: 'Picking',
    paymentStatus: 'Unbilled',
    
    items: [
      {
        id: 'OL-1102-1',
        sku: 'UPVC-ELBOW-1',
        productName: 'UPVC Elbow Fittings',
        variantDescription: '1" - White solvent weld',
        quantity: 100,
        unitPrice: 85,
        originalPrice: 100,
        negotiatedPrice: 68,
        discountPercent: 20,
        discountAmount: 1700,
        lineTotal: 6800,
        stockHint: 'Available',
        availableStock: 380,
      },
      {
        id: 'OL-1102-2',
        sku: 'UPVC-TEE-075',
        productName: 'UPVC Fittings - Tee Joint',
        variantDescription: '3/4" - 3-way connection',
        quantity: 80,
        unitPrice: 58,
        negotiatedPrice: 55,
        discountPercent: 5,
        discountAmount: 240,
        lineTotal: 4400,
        stockHint: 'Available',
        availableStock: 445,
      },
    ],
    
    subtotal: 11200,
    discountPercent: 17.3,
    discountAmount: 1940,
    totalAmount: 11200,
    
    requiresApproval: false,
    approvedBy: 'Manager B',
    approvedDate: '2026-02-25T14:00:00Z',
    
    orderNotes: 'Warehouse picking order now. Expected ready for dispatch within 2 hours.',
    createdAt: '2026-02-25T12:00:00Z',
    updatedAt: '2026-02-26T09:00:00Z',
    
    amountPaid: 0,
    balanceDue: 11200,
  },
  
  // Packed Status - Ready to Ship
  {
    id: 'ORD-2026-1103',
    customer: 'Eastside Construction Supply',
    customerId: 'CUS-013',
    agent: 'Pedro Reyes',
    agentId: 'AGT-001',
    branch: 'Branch A',
    orderDate: '2026-02-25',
    requiredDate: '2026-02-27',
    deliveryType: 'Truck',
    paymentTerms: '45 Days',
    paymentMethod: 'Online',
    status: 'Packed',
    paymentStatus: 'Unbilled',
    
    items: [
      {
        id: 'OL-1103-1',
        sku: 'FLEX-HOSE-15',
        productName: 'Flexible PVC Hose',
        variantDescription: '1-1/2" x 100ft roll',
        quantity: 12,
        unitPrice: 2850,
        originalPrice: 3350,
        negotiatedPrice: 2850,
        discountPercent: 15,
        discountAmount: 6000,
        lineTotal: 34200,
        stockHint: 'Available',
        availableStock: 35,
      },
    ],
    
    subtotal: 40200,
    discountPercent: 14.9,
    discountAmount: 6000,
    totalAmount: 34200,
    
    requiresApproval: false,
    approvedBy: 'Manager A',
    approvedDate: '2026-02-25T15:00:00Z',
    
    orderNotes: 'Order packed and ready for dispatch. Awaiting truck assignment.',
    createdAt: '2026-02-25T13:30:00Z',
    updatedAt: '2026-02-26T10:30:00Z',
    
    amountPaid: 0,
    balanceDue: 34200,
  },
  
  // Scheduled Status - Delivery Scheduled
  {
    id: 'ORD-2026-1104',
    customer: 'Westgate Building Materials',
    customerId: 'CUS-014',
    agent: 'Juan Dela Cruz',
    agentId: 'AGT-002',
    branch: 'Branch A',
    orderDate: '2026-02-24',
    requiredDate: '2026-02-27',
    deliveryType: 'Truck',
    paymentTerms: '30 Days',
    paymentMethod: 'Offline',
    status: 'Scheduled',
    paymentStatus: 'Invoiced',
    
    items: [
      {
        id: 'OL-1104-1',
        sku: 'DRAIN-PIPE-6',
        productName: 'PVC Drainage Pipe',
        variantDescription: '6" x 10ft - Main drainage',
        quantity: 40,
        unitPrice: 1650,
        negotiatedPrice: 1485,
        discountPercent: 10,
        discountAmount: 6600,
        lineTotal: 59400,
        stockHint: 'Available',
        availableStock: 72,
        batchDiscount: 10,
      },
      {
        id: 'OL-1104-2',
        sku: 'CORR-DRAIN-6',
        productName: 'Corrugated Drainage Pipe',
        variantDescription: '6" x 20ft - Perforated',
        quantity: 15,
        unitPrice: 1450,
        negotiatedPrice: 1378,
        discountPercent: 5,
        discountAmount: 1080,
        lineTotal: 20670,
        stockHint: 'Available',
        availableStock: 85,
        batchDiscount: 5,
      },
    ],
    
    subtotal: 80070,
    discountPercent: 9.6,
    discountAmount: 7680,
    totalAmount: 80070,
    
    requiresApproval: false,
    approvedBy: 'Manager C',
    approvedDate: '2026-02-24T16:00:00Z',
    
    invoiceId: 'INV-2026-5245',
    invoiceDate: '2026-02-25',
    dueDate: '2026-03-27',
    estimatedDelivery: '2026-02-27',
    
    orderNotes: 'Delivery scheduled for Feb 27, 9:00 AM. Truck #TRK-045 assigned.',
    createdAt: '2026-02-24T14:00:00Z',
    updatedAt: '2026-02-26T08:00:00Z',
    
    amountPaid: 0,
    balanceDue: 80070,
  },
  
  // Completed Order - Fully Paid
  {
    id: 'ORD-2026-1105',
    customer: 'Prime Construction Hub',
    customerId: 'CUS-015',
    agent: 'Maria Santos',
    agentId: 'AGT-003',
    branch: 'Branch A',
    orderDate: '2026-02-15',
    requiredDate: '2026-02-20',
    deliveryType: 'Truck',
    paymentTerms: '30 Days',
    paymentMethod: 'Online',
    status: 'Completed',
    paymentStatus: 'Paid',
    
    items: [
      {
        id: 'OL-1105-1',
        sku: 'UPVC-SAN-4',
        productName: 'UPVC Sanitary Pipe',
        variantDescription: '4" x 10ft - Sewage and main drains',
        quantity: 80,
        unitPrice: 950,
        originalPrice: 1055,
        negotiatedPrice: 855,
        discountPercent: 10,
        discountAmount: 7600,
        lineTotal: 68400,
        stockHint: 'Available',
        availableStock: 78,
        batchDiscount: 10,
      },
      {
        id: 'OL-1105-2',
        sku: 'GARDEN-HOSE-1',
        productName: 'Garden Hose with Fittings',
        variantDescription: '1" x 100ft - Standard duty',
        quantity: 25,
        unitPrice: 1980,
        originalPrice: 2200,
        negotiatedPrice: 1980,
        discountPercent: 10,
        discountAmount: 5500,
        lineTotal: 49500,
        stockHint: 'Available',
        availableStock: 54,
      },
    ],
    
    subtotal: 117900,
    discountPercent: 11.1,
    discountAmount: 13100,
    totalAmount: 117900,
    
    requiresApproval: false,
    approvedBy: 'Manager B',
    approvedDate: '2026-02-15T15:00:00Z',
    
    invoiceId: 'INV-2026-5180',
    invoiceDate: '2026-02-16',
    dueDate: '2026-03-18',
    amountPaid: 117900,
    balanceDue: 0,
    
    estimatedDelivery: '2026-02-20',
    actualDelivery: '2026-02-20',
    deliveryStatus: 'On Time',
    
    orderNotes: 'Order completed successfully. Payment received in full. Customer very satisfied.',
    createdAt: '2026-02-15T11:00:00Z',
    updatedAt: '2026-02-21T14:00:00Z',
  },
  
  // Another Draft Order
  {
    id: 'ORD-2026-1106',
    customer: 'Mindanao Hardware Exchange',
    customerId: 'CUS-016',
    agent: 'Pedro Reyes',
    agentId: 'AGT-001',
    branch: 'Branch A',
    orderDate: '2026-02-26',
    requiredDate: '2026-03-05',
    deliveryType: 'Ship',
    paymentTerms: '45 Days',
    paymentMethod: 'Online',
    status: 'Draft',
    paymentStatus: 'Unbilled',
    
    items: [
      {
        id: 'OL-1106-1',
        sku: 'UPVC-COUP-15',
        productName: 'UPVC Fittings - Coupling',
        variantDescription: '1-1/2" - Pressure rated',
        quantity: 50,
        unitPrice: 125,
        discountPercent: 0,
        discountAmount: 0,
        lineTotal: 6250,
        stockHint: 'Available',
        availableStock: 185,
      },
    ],
    
    subtotal: 6250,
    discountPercent: 0,
    discountAmount: 0,
    totalAmount: 6250,
    
    requiresApproval: false,
    
    orderNotes: 'Draft order. Customer still deciding on quantities and additional items.',
    createdAt: '2026-02-26T11:00:00Z',
    updatedAt: '2026-02-26T11:15:00Z',
    
    amountPaid: 0,
    balanceDue: 6250,
  },
  
  // Cancelled Order
  {
    id: 'ORD-2026-1107',
    customer: 'Cebu Trade Center',
    customerId: 'CUS-017',
    agent: 'Juan Dela Cruz',
    agentId: 'AGT-002',
    branch: 'Branch A',
    orderDate: '2026-02-21',
    requiredDate: '2026-02-26',
    deliveryType: 'Ship',
    paymentTerms: '30 Days',
    paymentMethod: 'Offline',
    status: 'Cancelled',
    paymentStatus: 'Unbilled',
    
    items: [
      {
        id: 'OL-1107-1',
        sku: 'UPVC-PRESS-05',
        productName: 'UPVC Pressure Pipe',
        variantDescription: '1/2" x 10ft - Potable water',
        quantity: 150,
        unitPrice: 320,
        negotiatedPrice: 288,
        discountPercent: 10,
        discountAmount: 4800,
        lineTotal: 43200,
        stockHint: 'Available',
        availableStock: 200,
        batchDiscount: 10,
      },
    ],
    
    subtotal: 48000,
    discountPercent: 10,
    discountAmount: 4800,
    totalAmount: 43200,
    
    requiresApproval: false,
    approvedBy: 'Manager A',
    approvedDate: '2026-02-21T16:00:00Z',
    
    cancelledAt: '2026-02-23T10:00:00Z',
    cancellationReason: 'Customer project postponed indefinitely. Requested cancellation.',
    
    orderNotes: 'Order was approved but customer cancelled before fulfillment due to project delay.',
    createdAt: '2026-02-21T14:00:00Z',
    updatedAt: '2026-02-23T10:00:00Z',
    
    amountPaid: 0,
    balanceDue: 0,
  },
];

export function getOrdersByBranch(branch: string): OrderDetail[] {
  if (branch === 'All') return MOCK_ORDERS_DETAILED;
  return MOCK_ORDERS_DETAILED.filter(order => order.branch === branch);
}

// Mock Order Audit Logs
import { OrderLog } from '../types/orders';

export const MOCK_ORDER_LOGS: Record<string, OrderLog[]> = {
  'ORD-2026-1001': [
    {
      id: 'LOG-1001-001',
      orderId: 'ORD-2026-1001',
      timestamp: '2026-02-24T09:15:00',
      action: 'created',
      performedBy: 'Pedro Reyes',
      performedByRole: 'Agent',
      description: 'Order created for Mega Hardware Center'
    },
    {
      id: 'LOG-1001-002',
      orderId: 'ORD-2026-1001',
      timestamp: '2026-02-24T09:20:00',
      action: 'item_added',
      performedBy: 'Pedro Reyes',
      performedByRole: 'Agent',
      description: 'Added UPVC Sanitary Pipe 4" x 10ft - 25 units',
      metadata: {
        addedAmount: 23750
      }
    },
    {
      id: 'LOG-1001-003',
      orderId: 'ORD-2026-1001',
      timestamp: '2026-02-24T09:22:00',
      action: 'item_added',
      performedBy: 'Pedro Reyes',
      performedByRole: 'Agent',
      description: 'Added Solvent Cement 100ml Bottle - 100 units',
      metadata: {
        addedAmount: 8500
      }
    },
    {
      id: 'LOG-1001-004',
      orderId: 'ORD-2026-1001',
      timestamp: '2026-02-24T09:25:00',
      action: 'discount_applied',
      performedBy: 'Pedro Reyes',
      performedByRole: 'Agent',
      description: 'Applied 15% bulk discount to UPVC Sanitary Pipe',
      metadata: {
        savedAmount: 3562.50
      }
    },
    {
      id: 'LOG-1001-005',
      orderId: 'ORD-2026-1001',
      timestamp: '2026-02-24T09:30:00',
      action: 'item_price_changed',
      performedBy: 'Pedro Reyes',
      performedByRole: 'Agent',
      description: 'Negotiated price for UPVC Sanitary Pipe',
      oldValue: { unitPrice: 950 },
      newValue: { unitPrice: 808 },
      metadata: {
        reason: 'Customer negotiation - long-term relationship'
      }
    },
    {
      id: 'LOG-1001-006',
      orderId: 'ORD-2026-1001',
      timestamp: '2026-02-24T09:35:00',
      action: 'status_changed',
      performedBy: 'Pedro Reyes',
      performedByRole: 'Agent',
      description: 'Status changed from Draft to Pending',
      oldValue: 'Draft',
      newValue: 'Pending'
    },
    {
      id: 'LOG-1001-007',
      orderId: 'ORD-2026-1001',
      timestamp: '2026-02-24T14:20:00',
      action: 'approved',
      performedBy: 'Maria Santos',
      performedByRole: 'Manager',
      description: 'Order approved - price negotiation within acceptable range',
      metadata: {
        comments: 'Good customer relationship, approved special pricing'
      }
    },
    {
      id: 'LOG-1001-008',
      orderId: 'ORD-2026-1001',
      timestamp: '2026-02-24T14:20:00',
      action: 'status_changed',
      performedBy: 'System',
      performedByRole: 'System',
      description: 'Status automatically changed from Pending to Approved',
      oldValue: 'Pending',
      newValue: 'Approved'
    },
    {
      id: 'LOG-1001-009',
      orderId: 'ORD-2026-1001',
      timestamp: '2026-02-24T16:45:00',
      action: 'status_changed',
      performedBy: 'Juan Cruz',
      performedByRole: 'Warehouse Staff',
      description: 'Order moved to Picking status',
      oldValue: 'Approved',
      newValue: 'Picking',
      metadata: {
        assignedTo: 'Juan Cruz',
        warehouse: 'Main Warehouse'
      }
    },
    {
      id: 'LOG-1001-010',
      orderId: 'ORD-2026-1001',
      timestamp: '2026-02-24T17:30:00',
      action: 'item_quantity_changed',
      performedBy: 'Juan Cruz',
      performedByRole: 'Warehouse Staff',
      description: 'Adjusted Solvent Cement quantity from 100 to 95 units due to stock shortage',
      metadata: {
        reason: 'Insufficient stock - 5 units backordered',
        reducedAmount: 425
      }
    },
    {
      id: 'LOG-1001-011',
      orderId: 'ORD-2026-1001',
      timestamp: '2026-02-24T18:15:00',
      action: 'status_changed',
      performedBy: 'Juan Cruz',
      performedByRole: 'Warehouse Staff',
      description: 'Order packed and ready for shipment',
      oldValue: 'Picking',
      newValue: 'Packed'
    },
    {
      id: 'LOG-1001-012',
      orderId: 'ORD-2026-1001',
      timestamp: '2026-02-25T08:00:00',
      action: 'invoice_generated',
      performedBy: 'System',
      performedByRole: 'System',
      description: 'Invoice INV-2026-0847 generated',
      metadata: {
        dueDate: '2026-03-27'
      }
    },
    {
      id: 'LOG-1001-013',
      orderId: 'ORD-2026-1001',
      timestamp: '2026-02-25T08:00:00',
      action: 'payment_status_changed',
      performedBy: 'System',
      performedByRole: 'System',
      description: 'Payment status updated to Invoiced',
      oldValue: 'Unbilled',
      newValue: 'Invoiced'
    },
    {
      id: 'LOG-1001-014',
      orderId: 'ORD-2026-1001',
      timestamp: '2026-02-25T10:30:00',
      action: 'shipped',
      performedBy: 'Roberto Tan',
      performedByRole: 'Logistics',
      description: 'Order dispatched via Truck #TRK-042',
      metadata: {
        driver: 'Roberto Tan',
        vehicleNo: 'TRK-042',
        estimatedArrival: '2026-02-26T14:00:00'
      }
    },
    {
      id: 'LOG-1001-015',
      orderId: 'ORD-2026-1001',
      timestamp: '2026-02-25T10:30:00',
      action: 'status_changed',
      performedBy: 'Roberto Tan',
      performedByRole: 'Logistics',
      description: 'Status updated to In Transit',
      oldValue: 'Packed',
      newValue: 'In Transit'
    },
    {
      id: 'LOG-1001-016',
      orderId: 'ORD-2026-1001',
      timestamp: '2026-02-25T15:45:00',
      action: 'note_added',
      performedBy: 'Pedro Reyes',
      performedByRole: 'Agent',
      description: 'Added note: Customer requested morning delivery',
      newValue: {
        note: 'Customer prefers delivery before 11 AM. Contact person: Mr. Lim (0917-XXX-XXXX)'
      }
    }
  ]
};

export function getOrderLogs(orderId: string): OrderLog[] {
  return MOCK_ORDER_LOGS[orderId] || [];
}

export function getOrderById(orderId: string): OrderDetail | undefined {
  return MOCK_ORDERS_DETAILED.find(order => order.id === orderId);
}

export function getOrdersByAgent(agentId: string): OrderDetail[] {
  return MOCK_ORDERS_DETAILED.filter(order => order.agentId === agentId);
}

export function getOrdersByCustomer(customerId: string): OrderDetail[] {
  return MOCK_ORDERS_DETAILED.filter(order => order.customerId === customerId);
}

export function getOrdersByStatus(status: string): OrderDetail[] {
  return MOCK_ORDERS_DETAILED.filter(order => order.status === status);
}
