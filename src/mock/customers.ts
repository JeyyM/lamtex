// Mock data for customers - Agent functionality

import { CustomerDetail, CustomerNote, CustomerTask, CustomerActivity, TopProduct, BuyingPattern } from '../types/customers';

export const MOCK_CUSTOMERS_DETAILED: CustomerDetail[] = [
  {
    id: 'CUS-001',
    name: 'Mega Hardware Center',
    type: 'Hardware Store',
    status: 'Active',
    riskLevel: 'Low',
    paymentBehavior: 'Good',
    
    contactPerson: 'Roberto Santos',
    phone: '+63 917 123 4567',
    email: 'roberto@megahardware.com',
    alternatePhone: '+63 2 8123 4567',
    
    address: '123 Rizal Avenue',
    city: 'Manila',
    province: 'Metro Manila',
    postalCode: '1000',
    mapLocation: { lat: 14.5995, lng: 120.9842 },
    
    businessRegistration: 'DTI-001234567',
    taxId: 'TIN-123-456-789',
    
    creditLimit: 5000000,
    outstandingBalance: 1200000,
    availableCredit: 3800000,
    paymentTerms: '30 Days',
    paymentScore: 92,
    avgPaymentDays: 28,
    overdueAmount: 0,
    
    totalPurchasesYTD: 18500000,
    totalPurchasesLifetime: 45200000,
    orderCount: 156,
    lastOrderDate: '2026-02-23',
    accountSince: '2022-03-15',
    
    assignedAgent: 'Pedro Reyes',
    assignedAgentId: 'AGT-001',
    branch: 'Branch A',
    
    tags: ['VIP', 'High Volume', 'Reliable'],
    
    createdAt: '2022-03-15T10:00:00Z',
    updatedAt: '2026-02-24T14:30:00Z',
  },
  {
    id: 'CUS-002',
    name: 'BuildMaster Construction Corp',
    type: 'Construction Company',
    status: 'Active',
    riskLevel: 'Medium',
    paymentBehavior: 'Watchlist',
    
    contactPerson: 'Maria Gonzales',
    phone: '+63 917 234 5678',
    email: 'maria@buildmaster.ph',
    alternateEmail: 'accounting@buildmaster.ph',
    
    address: '456 EDSA',
    city: 'Quezon City',
    province: 'Metro Manila',
    postalCode: '1100',
    mapLocation: { lat: 14.6760, lng: 121.0437 },
    
    businessRegistration: 'SEC-987654321',
    taxId: 'TIN-987-654-321',
    
    creditLimit: 10000000,
    outstandingBalance: 4500000,
    availableCredit: 5500000,
    paymentTerms: '45 Days',
    paymentScore: 78,
    avgPaymentDays: 52,
    overdueAmount: 850000,
    
    totalPurchasesYTD: 32000000,
    totalPurchasesLifetime: 78000000,
    orderCount: 89,
    lastOrderDate: '2026-02-20',
    accountSince: '2021-06-10',
    
    assignedAgent: 'Juan Dela Cruz',
    assignedAgentId: 'AGT-002',
    branch: 'Branch A',
    
    tags: ['Large Projects', 'Slow Payer', 'Government Contracts'],
    
    createdAt: '2021-06-10T09:00:00Z',
    updatedAt: '2026-02-24T11:20:00Z',
  },
  {
    id: 'CUS-003',
    name: 'City Builders Supply',
    type: 'Hardware Store',
    status: 'Active',
    riskLevel: 'Medium',
    paymentBehavior: 'Watchlist',
    
    contactPerson: 'Carlos Reyes',
    phone: '+63 917 345 6789',
    email: 'carlos@citybuilders.com',
    
    address: '789 Commonwealth Avenue',
    city: 'Quezon City',
    province: 'Metro Manila',
    postalCode: '1121',
    mapLocation: { lat: 14.6540, lng: 121.0544 },
    
    creditLimit: 3000000,
    outstandingBalance: 850000,
    availableCredit: 2150000,
    paymentTerms: '30 Days',
    paymentScore: 75,
    avgPaymentDays: 38,
    overdueAmount: 125000,
    
    totalPurchasesYTD: 8500000,
    totalPurchasesLifetime: 24000000,
    orderCount: 94,
    lastOrderDate: '2026-02-18',
    accountSince: '2020-09-22',
    
    assignedAgent: 'Pedro Reyes',
    assignedAgentId: 'AGT-001',
    branch: 'Branch A',
    
    tags: ['Retail', 'Frequent Orders'],
    
    createdAt: '2020-09-22T13:00:00Z',
    updatedAt: '2026-02-24T09:15:00Z',
  },
  {
    id: 'CUS-004',
    name: 'Skyline Developers Inc',
    type: 'Construction Company',
    status: 'Active',
    riskLevel: 'Low',
    paymentBehavior: 'Good',
    
    contactPerson: 'Jennifer Lim',
    phone: '+63 917 456 7890',
    email: 'jennifer@skylinedev.ph',
    alternatePhone: '+63 2 8234 5678',
    
    address: '321 Ayala Avenue',
    city: 'Makati',
    province: 'Metro Manila',
    postalCode: '1200',
    mapLocation: { lat: 14.5547, lng: 121.0244 },
    
    businessRegistration: 'SEC-555666777',
    taxId: 'TIN-555-666-777',
    
    creditLimit: 15000000,
    outstandingBalance: 3200000,
    availableCredit: 11800000,
    paymentTerms: '60 Days',
    paymentScore: 95,
    avgPaymentDays: 45,
    overdueAmount: 0,
    
    totalPurchasesYTD: 48000000,
    totalPurchasesLifetime: 125000000,
    orderCount: 67,
    lastOrderDate: '2026-02-22',
    accountSince: '2019-01-15',
    
    assignedAgent: 'Maria Santos',
    assignedAgentId: 'AGT-003',
    branch: 'Branch B',
    
    tags: ['Premium Client', 'High Value', 'Condominium Projects'],
    
    createdAt: '2019-01-15T10:00:00Z',
    updatedAt: '2026-02-24T16:00:00Z',
  },
  {
    id: 'CUS-005',
    name: 'ProBuild Contractors',
    type: 'Contractor',
    status: 'Active',
    riskLevel: 'Low',
    paymentBehavior: 'Good',
    
    contactPerson: 'Ramon Cruz',
    phone: '+63 917 567 8901',
    email: 'ramon@probuild.ph',
    
    address: '654 Ortigas Avenue',
    city: 'Pasig',
    province: 'Metro Manila',
    postalCode: '1600',
    mapLocation: { lat: 14.5832, lng: 121.0621 },
    
    creditLimit: 2000000,
    outstandingBalance: 450000,
    availableCredit: 1550000,
    paymentTerms: '30 Days',
    paymentScore: 88,
    avgPaymentDays: 25,
    overdueAmount: 0,
    
    totalPurchasesYTD: 5200000,
    totalPurchasesLifetime: 18500000,
    orderCount: 112,
    lastOrderDate: '2026-02-21',
    accountSince: '2021-11-08',
    
    assignedAgent: 'Maria Santos',
    assignedAgentId: 'AGT-003',
    branch: 'Branch B',
    
    tags: ['Residential', 'Prompt Payer'],
    
    createdAt: '2021-11-08T11:30:00Z',
    updatedAt: '2026-02-24T10:45:00Z',
  },
  {
    id: 'CUS-006',
    name: 'Golden Gate Hardware',
    type: 'Hardware Store',
    status: 'Dormant',
    riskLevel: 'High',
    paymentBehavior: 'Risk',
    
    contactPerson: 'Linda Tan',
    phone: '+63 917 678 9012',
    email: 'linda@goldengate.com',
    
    address: '987 Recto Avenue',
    city: 'Manila',
    province: 'Metro Manila',
    postalCode: '1002',
    
    creditLimit: 1500000,
    outstandingBalance: 1250000,
    availableCredit: 250000,
    paymentTerms: '30 Days',
    paymentScore: 45,
    avgPaymentDays: 72,
    overdueAmount: 980000,
    
    totalPurchasesYTD: 350000,
    totalPurchasesLifetime: 12000000,
    orderCount: 78,
    lastOrderDate: '2025-11-15',
    accountSince: '2020-05-20',
    
    assignedAgent: 'Pedro Reyes',
    assignedAgentId: 'AGT-001',
    branch: 'Branch A',
    
    tags: ['At Risk', 'Collection Priority', 'No Recent Orders'],
    
    createdAt: '2020-05-20T14:00:00Z',
    updatedAt: '2026-02-10T08:00:00Z',
  },
];

export const MOCK_CUSTOMER_NOTES: CustomerNote[] = [
  {
    id: 'NOTE-001',
    customerId: 'CUS-001',
    type: 'Call',
    content: 'Discussed upcoming Q2 orders. Customer planning major store expansion. Expects to increase monthly orders by 30%.',
    createdBy: 'Pedro Reyes',
    createdAt: '2026-02-23T14:30:00Z',
    isImportant: true,
  },
  {
    id: 'NOTE-002',
    customerId: 'CUS-001',
    type: 'Visit',
    content: 'Store visit completed. Inventory levels healthy. Recommended stocking up on 4" PVC pipes for upcoming construction season.',
    createdBy: 'Pedro Reyes',
    createdAt: '2026-02-20T10:15:00Z',
    isImportant: false,
  },
  {
    id: 'NOTE-003',
    customerId: 'CUS-002',
    type: 'Negotiation',
    content: 'Negotiated payment plan for overdue amount. Customer agreed to pay ₱500K by end of week, balance in 2 weeks.',
    createdBy: 'Juan Dela Cruz',
    createdAt: '2026-02-24T11:00:00Z',
    isImportant: true,
  },
  {
    id: 'NOTE-004',
    customerId: 'CUS-002',
    type: 'Email',
    content: 'Sent quotation for new project - 500 units rebar, 300 bags cement. Awaiting response.',
    createdBy: 'Juan Dela Cruz',
    createdAt: '2026-02-22T09:30:00Z',
    isImportant: false,
  },
  {
    id: 'NOTE-005',
    customerId: 'CUS-006',
    type: 'Call',
    content: 'Called regarding overdue payment of ₱980K. Owner promises payment by Friday. Will follow up on Thursday.',
    createdBy: 'Pedro Reyes',
    createdAt: '2026-02-24T15:45:00Z',
    isImportant: true,
  },
];

export const MOCK_CUSTOMER_TASKS: CustomerTask[] = [
  {
    id: 'TASK-001',
    customerId: 'CUS-001',
    customerName: 'Mega Hardware Center',
    type: 'Visit',
    title: 'Quarterly Business Review',
    description: 'Schedule and conduct QBR to discuss performance, upcoming needs, and new products.',
    priority: 'High',
    status: 'Pending',
    dueDate: '2026-02-28',
    assignedTo: 'Pedro Reyes',
    createdBy: 'Pedro Reyes',
    createdAt: '2026-02-24T09:00:00Z',
    updatedAt: '2026-02-24T09:00:00Z',
  },
  {
    id: 'TASK-002',
    customerId: 'CUS-002',
    customerName: 'BuildMaster Construction Corp',
    type: 'Collection',
    title: 'Follow up on overdue payment',
    description: 'Contact accounting dept regarding ₱850K overdue amount. Get commitment date.',
    priority: 'Urgent',
    status: 'In Progress',
    dueDate: '2026-02-26',
    assignedTo: 'Juan Dela Cruz',
    createdBy: 'Juan Dela Cruz',
    createdAt: '2026-02-23T10:30:00Z',
    updatedAt: '2026-02-24T11:00:00Z',
  },
  {
    id: 'TASK-003',
    customerId: 'CUS-003',
    customerName: 'City Builders Supply',
    type: 'Call',
    title: 'Check on partial payment status',
    description: 'Verify if check for ₱50K has been deposited. Follow up on remaining balance.',
    priority: 'Medium',
    status: 'Pending',
    dueDate: '2026-02-27',
    assignedTo: 'Pedro Reyes',
    createdBy: 'Pedro Reyes',
    createdAt: '2026-02-24T13:00:00Z',
    updatedAt: '2026-02-24T13:00:00Z',
  },
  {
    id: 'TASK-004',
    customerId: 'CUS-004',
    customerName: 'Skyline Developers Inc',
    type: 'Quote',
    title: 'Prepare quotation for new condo project',
    description: 'Customer requested quote for Phase 2 materials: HDPE pipes, fittings, and cement.',
    priority: 'High',
    status: 'Pending',
    dueDate: '2026-02-26',
    assignedTo: 'Maria Santos',
    createdBy: 'Maria Santos',
    createdAt: '2026-02-24T08:15:00Z',
    updatedAt: '2026-02-24T08:15:00Z',
  },
  {
    id: 'TASK-005',
    customerId: 'CUS-006',
    customerName: 'Golden Gate Hardware',
    type: 'Follow-up',
    title: 'Verify payment promise',
    description: 'Owner promised ₱500K payment by Friday. Call Thursday to confirm.',
    priority: 'Urgent',
    status: 'Pending',
    dueDate: '2026-02-27',
    assignedTo: 'Pedro Reyes',
    createdBy: 'Pedro Reyes',
    createdAt: '2026-02-24T15:45:00Z',
    updatedAt: '2026-02-24T15:45:00Z',
  },
];

export const MOCK_CUSTOMER_TOP_PRODUCTS: Record<string, TopProduct[]> = {
  'CUS-001': [
    {
      sku: 'PVC-4-150-3M',
      productName: 'PVC Pipe',
      variantDescription: '4" Class 150 - 3 meters',
      quantityOrdered: 2400,
      totalValue: 840000,
      orderCount: 24,
      lastOrderDate: '2026-02-23',
    },
    {
      sku: 'SOL-100ML',
      productName: 'Solvent Cement',
      variantDescription: '100ml Bottle',
      quantityOrdered: 1800,
      totalValue: 81000,
      orderCount: 18,
      lastOrderDate: '2026-02-20',
    },
    {
      sku: 'PVC-2-150-3M',
      productName: 'PVC Pipe',
      variantDescription: '2" Class 150 - 3 meters',
      quantityOrdered: 3600,
      totalValue: 432000,
      orderCount: 30,
      lastOrderDate: '2026-02-18',
    },
  ],
  'CUS-002': [
    {
      sku: 'RBR-16MM-12M',
      productName: 'Steel Rebar',
      variantDescription: '16mm x 12 meters',
      quantityOrdered: 8500,
      totalValue: 2380000,
      orderCount: 15,
      lastOrderDate: '2026-02-20',
    },
    {
      sku: 'CEM-50KG-PORTLAND',
      productName: 'Portland Cement',
      variantDescription: '50kg Bag',
      quantityOrdered: 4500,
      totalValue: 1440000,
      orderCount: 12,
      lastOrderDate: '2026-02-20',
    },
  ],
};

export const MOCK_BUYING_PATTERNS: Record<string, BuyingPattern[]> = {
  'CUS-001': [
    {
      productCategory: 'PVC Pipes',
      frequency: 'Bi-weekly',
      avgOrderValue: 65000,
      lastPurchase: '2026-02-23',
      trend: 'Increasing',
    },
    {
      productCategory: 'Adhesives',
      frequency: 'Monthly',
      avgOrderValue: 25000,
      lastPurchase: '2026-02-20',
      trend: 'Stable',
    },
  ],
  'CUS-002': [
    {
      productCategory: 'Rebar',
      frequency: 'Monthly',
      avgOrderValue: 180000,
      lastPurchase: '2026-02-20',
      trend: 'Stable',
    },
    {
      productCategory: 'Cement',
      frequency: 'Monthly',
      avgOrderValue: 120000,
      lastPurchase: '2026-02-20',
      trend: 'Stable',
    },
  ],
  'CUS-006': [
    {
      productCategory: 'General Hardware',
      frequency: 'Irregular',
      avgOrderValue: 15000,
      lastPurchase: '2025-11-15',
      trend: 'Declining',
    },
  ],
};

export function getCustomersByBranch(branch: string): CustomerDetail[] {
  if (branch === 'All') return MOCK_CUSTOMERS_DETAILED;
  return MOCK_CUSTOMERS_DETAILED.filter(customer => customer.branch === branch);
}

export function getCustomerById(customerId: string): CustomerDetail | undefined {
  return MOCK_CUSTOMERS_DETAILED.find(customer => customer.id === customerId);
}

export function getCustomerNotes(customerId: string): CustomerNote[] {
  return MOCK_CUSTOMER_NOTES.filter(note => note.customerId === customerId);
}

export function getCustomerTasks(customerId: string): CustomerTask[] {
  return MOCK_CUSTOMER_TASKS.filter(task => task.customerId === customerId);
}

export function getCustomerTopProducts(customerId: string): TopProduct[] {
  return MOCK_CUSTOMER_TOP_PRODUCTS[customerId] || [];
}

export function getBuyingPatterns(customerId: string): BuyingPattern[] {
  return MOCK_BUYING_PATTERNS[customerId] || [];
}

export function getAllTasksByAgent(): CustomerTask[] {
  return MOCK_CUSTOMER_TASKS;
}
