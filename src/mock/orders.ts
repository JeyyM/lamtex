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
    status: 'Pending Approval',
    paymentStatus: 'Unbilled',
    
    items: [
      {
        id: 'OL-1001-1',
        sku: 'PVC-4-150-3M',
        productName: 'PVC Pipe',
        variantDescription: '4" Class 150 - 3 meters',
        quantity: 200,
        unitPrice: 350,
        discountPercent: 12,
        discountAmount: 8400,
        lineTotal: 61600,
        stockHint: 'Available',
        availableStock: 450,
      },
      {
        id: 'OL-1001-2',
        sku: 'SOL-100ML',
        productName: 'Solvent Cement',
        variantDescription: '100ml Bottle',
        quantity: 100,
        unitPrice: 45,
        discountPercent: 5,
        discountAmount: 225,
        lineTotal: 4275,
        stockHint: 'Available',
        availableStock: 800,
      },
      {
        id: 'OL-1001-3',
        sku: 'HDPE-6-100-6M',
        productName: 'HDPE Pipe',
        variantDescription: '6" PN100 - 6 meters',
        quantity: 50,
        unitPrice: 1200,
        discountPercent: 8,
        discountAmount: 4800,
        lineTotal: 55200,
        stockHint: 'Partial',
        availableStock: 30,
      },
    ],
    
    subtotal: 121075,
    discountPercent: 10.8,
    discountAmount: 13425,
    totalAmount: 107650,
    
    requiresApproval: true,
    approvalReason: ['Discount exceeds 10%'],
    
    orderNotes: 'Customer requested expedited delivery. Will need to coordinate with logistics.',
    createdAt: '2026-02-24T09:15:00Z',
    updatedAt: '2026-02-24T09:15:00Z',
    
    amountPaid: 0,
    balanceDue: 107650,
  },
  {
    id: 'ORD-2026-1002',
    customer: 'BuildMaster Construction Corp',
    customerId: 'CUS-002',
    agent: 'Juan Dela Cruz',
    agentId: 'AGT-002',
    branch: 'Branch A',
    orderDate: '2026-02-20',
    requiredDate: '2026-02-25',
    deliveryType: 'Truck',
    paymentTerms: '45 Days',
    paymentMethod: 'Online',
    status: 'In Transit',
    paymentStatus: 'Paid',
    
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
];

export function getOrdersByBranch(branch: string): OrderDetail[] {
  if (branch === 'All') return MOCK_ORDERS_DETAILED;
  return MOCK_ORDERS_DETAILED.filter(order => order.branch === branch);
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
