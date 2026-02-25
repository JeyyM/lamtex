import type {
  AgentKPI,
  AgentCustomer,
  AgentOrder,
  PODCollection,
  PaymentCollection,
  PurchaseRequest,
  AgentPerformance,
  Commission,
  AgentActivity,
  AgentAlert,
} from '@/src/types/agent';

// ============================================
// AGENT KPIs
// ============================================
const agentKPIs: AgentKPI[] = [
  // Branch A
  { id: 'a1', label: 'Sales This Month', value: '₱485,000', subtitle: '68% of target', status: 'warning', branch: 'Branch A' },
  { id: 'a2', label: 'Orders Created', value: '18', subtitle: '+3 this week', status: 'success', branch: 'Branch A' },
  { id: 'a3', label: 'Commission Earned', value: '₱24,250', subtitle: 'This month', status: 'success', branch: 'Branch A' },
  { id: 'a4', label: 'PODs Pending', value: '4', subtitle: 'Collect ASAP', status: 'warning', branch: 'Branch A' },
  { id: 'a5', label: 'Collections Due', value: '₱125,000', subtitle: '6 invoices', status: 'danger', branch: 'Branch A' },
  { id: 'a6', label: 'My Customers', value: '32', subtitle: '5 overdue', status: 'default', branch: 'Branch A' },
  { id: 'a7', label: 'Pending Approvals', value: '3', subtitle: 'Awaiting boss', status: 'default', branch: 'Branch A' },
  { id: 'a8', label: 'Purchase Requests', value: '2', subtitle: '1 approved', status: 'default', branch: 'Branch A' },
  
  // Branch B
  { id: 'b1', label: 'Sales This Month', value: '₱620,000', subtitle: '87% of target', status: 'success', branch: 'Branch B' },
  { id: 'b2', label: 'Orders Created', value: '22', subtitle: '+5 this week', status: 'success', branch: 'Branch B' },
  { id: 'b3', label: 'Commission Earned', value: '₱31,000', subtitle: 'This month', status: 'success', branch: 'Branch B' },
  { id: 'b4', label: 'PODs Pending', value: '2', subtitle: 'Collect ASAP', status: 'success', branch: 'Branch B' },
  { id: 'b5', label: 'Collections Due', value: '₱88,000', subtitle: '4 invoices', status: 'warning', branch: 'Branch B' },
  { id: 'b6', label: 'My Customers', value: '28', subtitle: '2 overdue', status: 'default', branch: 'Branch B' },
  { id: 'b7', label: 'Pending Approvals', value: '1', subtitle: 'Awaiting boss', status: 'default', branch: 'Branch B' },
  { id: 'b8', label: 'Purchase Requests', value: '1', subtitle: '1 pending', status: 'default', branch: 'Branch B' },
  
  // Branch C
  { id: 'c1', label: 'Sales This Month', value: '₱390,000', subtitle: '55% of target', status: 'danger', branch: 'Branch C' },
  { id: 'c2', label: 'Orders Created', value: '14', subtitle: '+2 this week', status: 'warning', branch: 'Branch C' },
  { id: 'c3', label: 'Commission Earned', value: '₱19,500', subtitle: 'This month', status: 'warning', branch: 'Branch C' },
  { id: 'c4', label: 'PODs Pending', value: '5', subtitle: 'Collect ASAP', status: 'danger', branch: 'Branch C' },
  { id: 'c5', label: 'Collections Due', value: '₱210,000', subtitle: '9 invoices', status: 'danger', branch: 'Branch C' },
  { id: 'c6', label: 'My Customers', value: '25', subtitle: '8 overdue', status: 'default', branch: 'Branch C' },
  { id: 'c7', label: 'Pending Approvals', value: '4', subtitle: 'Awaiting boss', status: 'default', branch: 'Branch C' },
  { id: 'c8', label: 'Purchase Requests', value: '3', subtitle: '2 approved', status: 'default', branch: 'Branch C' },
  
  // All Branches
  { id: 'all1', label: 'Sales This Month', value: '₱1,495,000', subtitle: '70% of target', status: 'warning', branch: 'All' },
  { id: 'all2', label: 'Orders Created', value: '54', subtitle: '+10 this week', status: 'success', branch: 'All' },
  { id: 'all3', label: 'Commission Earned', value: '₱74,750', subtitle: 'This month', status: 'success', branch: 'All' },
  { id: 'all4', label: 'PODs Pending', value: '11', subtitle: 'Collect ASAP', status: 'warning', branch: 'All' },
  { id: 'all5', label: 'Collections Due', value: '₱423,000', subtitle: '19 invoices', status: 'danger', branch: 'All' },
  { id: 'all6', label: 'My Customers', value: '85', subtitle: '15 overdue', status: 'default', branch: 'All' },
  { id: 'all7', label: 'Pending Approvals', value: '8', subtitle: 'Awaiting boss', status: 'default', branch: 'All' },
  { id: 'all8', label: 'Purchase Requests', value: '6', subtitle: '4 approved', status: 'default', branch: 'All' },
];

// ============================================
// AGENT CUSTOMERS
// ============================================
const agentCustomers: AgentCustomer[] = [
  {
    id: 'c1',
    customerName: 'ABC Construction Corp',
    contactPerson: 'John Reyes',
    phone: '0917-123-4567',
    email: 'john.reyes@abcconstruction.ph',
    location: 'Quezon City',
    accountType: 'Construction',
    creditLimit: 500000,
    outstandingBalance: 125000,
    paymentStatus: 'Overdue',
    daysOverdue: 12,
    lastOrderDate: '2026-02-10',
    lastVisitDate: '2026-02-20',
    nextVisitScheduled: '2026-02-27',
    totalOrdersYTD: 8,
    totalRevenueYTD: 1250000,
    healthScore: 'Fair',
    notes: 'Major project delayed, payment expected next week',
    branch: 'Branch A',
  },
  {
    id: 'c2',
    customerName: 'BuildMart Retail',
    contactPerson: 'Maria Santos',
    phone: '0918-234-5678',
    location: 'Makati City',
    accountType: 'Retail',
    creditLimit: 200000,
    outstandingBalance: 0,
    paymentStatus: 'Current',
    lastOrderDate: '2026-02-23',
    lastVisitDate: '2026-02-23',
    nextVisitScheduled: '2026-03-02',
    totalOrdersYTD: 15,
    totalRevenueYTD: 650000,
    healthScore: 'Excellent',
    branch: 'Branch A',
  },
  {
    id: 'c3',
    customerName: 'XYZ Developers Inc',
    contactPerson: 'Robert Tan',
    phone: '0919-345-6789',
    email: 'rtan@xyzdev.ph',
    location: 'Pasig City',
    accountType: 'Construction',
    creditLimit: 750000,
    outstandingBalance: 380000,
    paymentStatus: 'Critical',
    daysOverdue: 45,
    lastOrderDate: '2026-01-05',
    lastVisitDate: '2026-02-18',
    totalOrdersYTD: 3,
    totalRevenueYTD: 890000,
    healthScore: 'Poor',
    notes: 'Credit limit reached. No new orders until payment received.',
    branch: 'Branch A',
  },
  {
    id: 'c4',
    customerName: 'HomeDepot Manila',
    contactPerson: 'Lisa Garcia',
    phone: '0920-456-7890',
    location: 'Manila',
    accountType: 'Retail',
    creditLimit: 300000,
    outstandingBalance: 45000,
    paymentStatus: 'Current',
    lastOrderDate: '2026-02-22',
    lastVisitDate: '2026-02-22',
    nextVisitScheduled: '2026-03-01',
    totalOrdersYTD: 20,
    totalRevenueYTD: 980000,
    healthScore: 'Excellent',
    branch: 'Branch B',
  },
  {
    id: 'c5',
    customerName: 'Government Project - DPWH',
    contactPerson: 'Engr. Carlos Mendoza',
    phone: '0921-567-8901',
    location: 'Taguig City',
    accountType: 'Government',
    creditLimit: 1000000,
    outstandingBalance: 250000,
    paymentStatus: 'Current',
    lastOrderDate: '2026-02-15',
    lastVisitDate: '2026-02-15',
    nextVisitScheduled: '2026-03-05',
    totalOrdersYTD: 5,
    totalRevenueYTD: 2100000,
    healthScore: 'Good',
    notes: 'Slow payment process but reliable',
    branch: 'Branch B',
  },
  {
    id: 'c6',
    customerName: 'Premier Hardware Supply',
    contactPerson: 'Anna Cruz',
    phone: '0922-678-9012',
    location: 'Caloocan City',
    accountType: 'Distributor',
    creditLimit: 400000,
    outstandingBalance: 85000,
    paymentStatus: 'Overdue',
    daysOverdue: 8,
    lastOrderDate: '2026-02-12',
    lastVisitDate: '2026-02-19',
    nextVisitScheduled: '2026-02-26',
    totalOrdersYTD: 12,
    totalRevenueYTD: 720000,
    healthScore: 'Good',
    branch: 'Branch C',
  },
  {
    id: 'c7',
    customerName: 'Summit Construction',
    contactPerson: 'James Lim',
    phone: '0923-789-0123',
    location: 'Paranaque City',
    accountType: 'Construction',
    creditLimit: 600000,
    outstandingBalance: 0,
    paymentStatus: 'Current',
    lastOrderDate: '2026-02-24',
    lastVisitDate: '2026-02-24',
    totalOrdersYTD: 10,
    totalRevenueYTD: 1450000,
    healthScore: 'Excellent',
    branch: 'Branch C',
  },
];

// ============================================
// AGENT ORDERS
// ============================================
const agentOrders: AgentOrder[] = [
  {
    id: 'o1',
    orderNumber: 'ORD-2026-00234',
    customerName: 'ABC Construction Corp',
    customerId: 'c1',
    orderDate: '2026-02-24',
    requestedDeliveryDate: '2026-02-28',
    totalAmount: 85000,
    discountApplied: 5,
    status: 'Pending Approval',
    items: [
      { productName: 'Portland Cement Type I', quantity: 100, unit: 'bag', unitPrice: 350, subtotal: 35000 },
      { productName: 'Reinforcing Steel Bar 10mm', quantity: 50, unit: 'pc', unitPrice: 450, subtotal: 22500 },
      { productName: 'Gravel 3/4"', quantity: 5, unit: 'm³', unitPrice: 5500, subtotal: 27500 },
    ],
    deliveryAddress: 'Project Site: Commonwealth Ave, QC',
    specialInstructions: 'Deliver before 2PM, contact foreman first',
    createdBy: 'Agent Juan',
    branch: 'Branch A',
  },
  {
    id: 'o2',
    orderNumber: 'ORD-2026-00235',
    customerName: 'BuildMart Retail',
    customerId: 'c2',
    orderDate: '2026-02-23',
    requestedDeliveryDate: '2026-02-26',
    totalAmount: 42000,
    discountApplied: 3,
    status: 'Approved',
    approver: 'Executive Maria',
    items: [
      { productName: 'Paint - White Interior', quantity: 20, unit: 'gal', unitPrice: 850, subtotal: 17000 },
      { productName: 'Plywood 4x8 Marine', quantity: 10, unit: 'sheet', unitPrice: 1200, subtotal: 12000 },
      { productName: 'PVC Pipes 4"', quantity: 30, unit: 'pc', unitPrice: 430, subtotal: 12900 },
    ],
    deliveryAddress: 'BuildMart Warehouse, Makati',
    createdBy: 'Agent Juan',
    branch: 'Branch A',
  },
  {
    id: 'o3',
    orderNumber: 'ORD-2026-00220',
    customerName: 'XYZ Developers Inc',
    customerId: 'c3',
    orderDate: '2026-02-20',
    requestedDeliveryDate: '2026-02-25',
    totalAmount: 125000,
    discountApplied: 10,
    status: 'Rejected',
    approver: 'Executive Maria',
    rejectionReason: 'Customer credit limit exceeded. Payment required first.',
    items: [
      { productName: 'Ready-Mix Concrete', quantity: 10, unit: 'm³', unitPrice: 12500, subtotal: 125000 },
    ],
    deliveryAddress: 'Construction Site, Pasig',
    createdBy: 'Agent Juan',
    branch: 'Branch A',
  },
  {
    id: 'o4',
    orderNumber: 'ORD-2026-00236',
    customerName: 'HomeDepot Manila',
    customerId: 'c4',
    orderDate: '2026-02-24',
    requestedDeliveryDate: '2026-02-27',
    totalAmount: 68000,
    discountApplied: 2,
    status: 'In Fulfillment',
    approver: 'Executive Maria',
    items: [
      { productName: 'Tiles - Ceramic 12x12', quantity: 200, unit: 'box', unitPrice: 280, subtotal: 56000 },
      { productName: 'Tile Adhesive', quantity: 40, unit: 'bag', unitPrice: 300, subtotal: 12000 },
    ],
    deliveryAddress: 'HomeDepot Warehouse, Manila',
    createdBy: 'Agent Pedro',
    branch: 'Branch B',
  },
  {
    id: 'o5',
    orderNumber: 'ORD-2026-00237',
    customerName: 'Summit Construction',
    customerId: 'c7',
    orderDate: '2026-02-25',
    requestedDeliveryDate: '2026-03-01',
    totalAmount: 195000,
    discountApplied: 8,
    status: 'Draft',
    items: [
      { productName: 'Reinforcing Steel Bar 16mm', quantity: 100, unit: 'pc', unitPrice: 720, subtotal: 72000 },
      { productName: 'Portland Cement Type I', quantity: 200, unit: 'bag', unitPrice: 350, subtotal: 70000 },
      { productName: 'Sand - Washed', quantity: 10, unit: 'm³', unitPrice: 5300, subtotal: 53000 },
    ],
    deliveryAddress: 'Summit Tower Project, Paranaque',
    specialInstructions: 'Split delivery: 50% on March 1, 50% on March 5',
    createdBy: 'Agent Rosa',
    branch: 'Branch C',
  },
];

// ============================================
// POD COLLECTIONS
// ============================================
const podCollections: PODCollection[] = [
  {
    id: 'pod1',
    deliveryNumber: 'DEL-2026-00145',
    orderNumber: 'ORD-2026-00210',
    customerName: 'ABC Construction Corp',
    deliveredDate: '2026-02-22',
    deliveredTime: '2:30 PM',
    deliveryAmount: 65000,
    podCollected: false,
    signatureRequired: true,
    issues: ['Customer not available', 'Foreman on leave'],
    branch: 'Branch A',
  },
  {
    id: 'pod2',
    deliveryNumber: 'DEL-2026-00148',
    orderNumber: 'ORD-2026-00215',
    customerName: 'BuildMart Retail',
    deliveredDate: '2026-02-23',
    deliveredTime: '10:15 AM',
    deliveryAmount: 38000,
    podCollected: true,
    receivedBy: 'Maria Santos - Store Manager',
    podNotes: 'All items received in good condition',
    signatureRequired: true,
    branch: 'Branch A',
  },
  {
    id: 'pod3',
    deliveryNumber: 'DEL-2026-00150',
    orderNumber: 'ORD-2026-00218',
    customerName: 'HomeDepot Manila',
    deliveredDate: '2026-02-24',
    deliveryAmount: 52000,
    podCollected: false,
    signatureRequired: true,
    issues: ['POD form not available at delivery'],
    branch: 'Branch B',
  },
  {
    id: 'pod4',
    deliveryNumber: 'DEL-2026-00152',
    orderNumber: 'ORD-2026-00222',
    customerName: 'Premier Hardware Supply',
    deliveredDate: '2026-02-23',
    deliveredTime: '3:45 PM',
    deliveryAmount: 78000,
    podCollected: false,
    signatureRequired: true,
    branch: 'Branch C',
  },
];

// ============================================
// PAYMENT COLLECTIONS
// ============================================
const paymentCollections: PaymentCollection[] = [
  {
    id: 'pay1',
    invoiceNumber: 'INV-2026-00189',
    orderNumber: 'ORD-2026-00185',
    customerName: 'ABC Construction Corp',
    customerId: 'c1',
    invoiceDate: '2026-02-05',
    dueDate: '2026-02-13',
    amount: 125000,
    amountPaid: 0,
    amountDue: 125000,
    paymentStatus: 'Overdue',
    daysOverdue: 12,
    branch: 'Branch A',
  },
  {
    id: 'pay2',
    invoiceNumber: 'INV-2026-00195',
    orderNumber: 'ORD-2026-00192',
    customerName: 'BuildMart Retail',
    customerId: 'c2',
    invoiceDate: '2026-02-18',
    dueDate: '2026-02-26',
    amount: 42000,
    amountPaid: 42000,
    amountDue: 0,
    paymentStatus: 'Paid',
    paymentMethod: 'Bank Transfer',
    lastPaymentDate: '2026-02-24',
    collectionNotes: 'Paid in full via online transfer',
    branch: 'Branch A',
  },
  {
    id: 'pay3',
    invoiceNumber: 'INV-2026-00178',
    orderNumber: 'ORD-2026-00175',
    customerName: 'XYZ Developers Inc',
    customerId: 'c3',
    invoiceDate: '2026-01-10',
    dueDate: '2026-01-25',
    amount: 380000,
    amountPaid: 0,
    amountDue: 380000,
    paymentStatus: 'Critical',
    daysOverdue: 45,
    collectionNotes: 'Multiple follow-ups. Customer promises payment by end of month.',
    branch: 'Branch A',
  },
  {
    id: 'pay4',
    invoiceNumber: 'INV-2026-00202',
    orderNumber: 'ORD-2026-00200',
    customerName: 'HomeDepot Manila',
    customerId: 'c4',
    invoiceDate: '2026-02-20',
    dueDate: '2026-02-28',
    amount: 52000,
    amountPaid: 0,
    amountDue: 52000,
    paymentStatus: 'Pending',
    branch: 'Branch B',
  },
  {
    id: 'pay5',
    invoiceNumber: 'INV-2026-00198',
    orderNumber: 'ORD-2026-00196',
    customerName: 'Premier Hardware Supply',
    customerId: 'c6',
    invoiceDate: '2026-02-12',
    dueDate: '2026-02-17',
    amount: 85000,
    amountPaid: 40000,
    amountDue: 45000,
    paymentStatus: 'Partial',
    paymentMethod: 'Cash',
    lastPaymentDate: '2026-02-17',
    daysOverdue: 8,
    collectionNotes: 'Partial payment received. Balance to be collected this week.',
    branch: 'Branch C',
  },
  {
    id: 'pay6',
    invoiceNumber: 'INV-2026-00205',
    orderNumber: 'ORD-2026-00203',
    customerName: 'Summit Construction',
    customerId: 'c7',
    invoiceDate: '2026-02-22',
    dueDate: '2026-03-01',
    amount: 145000,
    amountPaid: 0,
    amountDue: 145000,
    paymentStatus: 'Pending',
    branch: 'Branch C',
  },
];

// ============================================
// PURCHASE REQUESTS
// ============================================
const purchaseRequests: PurchaseRequest[] = [
  {
    id: 'pr1',
    requestNumber: 'PR-2026-00042',
    itemName: 'Imported Marble Tiles',
    category: 'Finished Good',
    quantity: 500,
    unit: 'box',
    estimatedCost: 450000,
    supplier: 'Italian Stone Imports',
    supplierQuote: 440000,
    reason: 'Customer special order for luxury condo project',
    urgency: 'High',
    status: 'Approved',
    requestedBy: 'Agent Juan',
    requestDate: '2026-02-18',
    approver: 'Executive Maria',
    approvalDate: '2026-02-19',
    expectedDelivery: '2026-03-10',
    branch: 'Branch A',
  },
  {
    id: 'pr2',
    requestNumber: 'PR-2026-00045',
    itemName: 'High-Grade Steel Bars 20mm',
    category: 'Raw Material',
    quantity: 500,
    unit: 'pc',
    estimatedCost: 650000,
    reason: 'Government project requirement - high tensile strength needed',
    urgency: 'Critical',
    status: 'Submitted',
    requestedBy: 'Agent Pedro',
    requestDate: '2026-02-24',
    branch: 'Branch B',
  },
  {
    id: 'pr3',
    requestNumber: 'PR-2026-00043',
    itemName: 'Epoxy Floor Coating',
    category: 'Finished Good',
    quantity: 200,
    unit: 'gal',
    estimatedCost: 180000,
    supplier: 'ChemTech Philippines',
    supplierQuote: 175000,
    reason: 'Multiple customer inquiries, stock depleted',
    urgency: 'Medium',
    status: 'Approved',
    requestedBy: 'Agent Rosa',
    requestDate: '2026-02-20',
    approver: 'Executive Maria',
    approvalDate: '2026-02-21',
    expectedDelivery: '2026-03-05',
    branch: 'Branch C',
  },
  {
    id: 'pr4',
    requestNumber: 'PR-2026-00046',
    itemName: 'Premium Wood Varnish',
    category: 'Finished Good',
    quantity: 100,
    unit: 'gal',
    estimatedCost: 65000,
    reason: 'High-end residential project special request',
    urgency: 'Low',
    status: 'Draft',
    requestedBy: 'Agent Juan',
    requestDate: '2026-02-25',
    branch: 'Branch A',
  },
];

// ============================================
// AGENT PERFORMANCE
// ============================================
const agentPerformance: AgentPerformance[] = [
  {
    id: 'perf1',
    metric: 'Monthly Sales Target',
    current: 485000,
    target: 750000,
    unit: '₱',
    percentage: 65,
    trend: 'up',
    period: 'this-month',
    rank: 3,
    totalAgents: 5,
    branch: 'Branch A',
  },
  {
    id: 'perf2',
    metric: 'Orders Closed',
    current: 18,
    target: 25,
    unit: '',
    percentage: 72,
    trend: 'up',
    period: 'this-month',
    branch: 'Branch A',
  },
  {
    id: 'perf3',
    metric: 'Collection Rate',
    current: 78,
    target: 95,
    unit: '%',
    percentage: 82,
    trend: 'down',
    period: 'this-month',
    branch: 'Branch A',
  },
  {
    id: 'perf4',
    metric: 'Customer Visits',
    current: 24,
    target: 30,
    unit: '',
    percentage: 80,
    trend: 'stable',
    period: 'this-month',
    branch: 'Branch A',
  },
];

// ============================================
// COMMISSIONS
// ============================================
const commissions: Commission[] = [
  {
    id: 'comm1',
    period: 'February 2026',
    salesAmount: 485000,
    commissionRate: 5,
    commissionEarned: 24250,
    status: 'Pending',
    breakdown: [
      { orderNumber: 'ORD-2026-00210', customerName: 'ABC Construction', saleAmount: 65000, commission: 3250 },
      { orderNumber: 'ORD-2026-00215', customerName: 'BuildMart Retail', saleAmount: 38000, commission: 1900 },
      { orderNumber: 'ORD-2026-00218', customerName: 'Various Customers', saleAmount: 382000, commission: 19100 },
    ],
    branch: 'Branch A',
  },
  {
    id: 'comm2',
    period: 'January 2026',
    salesAmount: 620000,
    commissionRate: 5,
    commissionEarned: 31000,
    status: 'Paid',
    paidDate: '2026-02-05',
    breakdown: [
      { orderNumber: 'Various', customerName: 'Multiple Customers', saleAmount: 620000, commission: 31000 },
    ],
    branch: 'Branch A',
  },
];

// ============================================
// AGENT ACTIVITIES
// ============================================
const agentActivities: AgentActivity[] = [
  {
    id: 'act1',
    type: 'Order Created',
    title: 'New order from ABC Construction',
    description: 'Created ORD-2026-00234 worth ₱85,000',
    relatedTo: 'ORD-2026-00234',
    timestamp: '2026-02-24 3:45 PM',
    status: 'Pending',
    branch: 'Branch A',
  },
  {
    id: 'act2',
    type: 'Customer Visit',
    title: 'Visited BuildMart Retail',
    description: 'Discussed new product lines and upcoming promotions',
    relatedTo: 'BuildMart Retail',
    timestamp: '2026-02-23 10:30 AM',
    status: 'Success',
    branch: 'Branch A',
  },
  {
    id: 'act3',
    type: 'Payment Collected',
    title: 'Payment from BuildMart',
    description: 'Collected ₱42,000 via bank transfer',
    relatedTo: 'INV-2026-00195',
    timestamp: '2026-02-24 2:15 PM',
    status: 'Success',
    branch: 'Branch A',
  },
  {
    id: 'act4',
    type: 'POD Collected',
    title: 'POD from BuildMart delivery',
    description: 'Received signed POD for DEL-2026-00148',
    relatedTo: 'DEL-2026-00148',
    timestamp: '2026-02-23 11:00 AM',
    status: 'Success',
    branch: 'Branch A',
  },
  {
    id: 'act5',
    type: 'Purchase Request',
    title: 'Submitted PR for Marble Tiles',
    description: 'PR-2026-00042 - Special customer order',
    relatedTo: 'PR-2026-00042',
    timestamp: '2026-02-18 4:20 PM',
    status: 'Success',
    branch: 'Branch A',
  },
];

// ============================================
// AGENT ALERTS
// ============================================
const agentAlerts: AgentAlert[] = [
  {
    id: 'alert1',
    type: 'Payment Overdue',
    severity: 'Critical',
    title: 'XYZ Developers - 45 days overdue',
    message: 'Outstanding balance of ₱380,000 critically overdue. Immediate action required.',
    relatedCustomer: 'XYZ Developers Inc',
    actionRequired: true,
    timestamp: '2026-02-25 8:00 AM',
    branch: 'Branch A',
  },
  {
    id: 'alert2',
    type: 'Order Rejected',
    severity: 'High',
    title: 'Order ORD-2026-00220 rejected',
    message: 'Order rejected due to customer credit limit exceeded. Contact customer for payment.',
    relatedCustomer: 'XYZ Developers Inc',
    relatedOrder: 'ORD-2026-00220',
    actionRequired: true,
    timestamp: '2026-02-21 11:30 AM',
    branch: 'Branch A',
  },
  {
    id: 'alert3',
    type: 'POD Pending',
    severity: 'Medium',
    title: '4 PODs pending collection',
    message: 'Multiple deliveries awaiting POD collection. Visit customers ASAP.',
    actionRequired: true,
    timestamp: '2026-02-25 9:00 AM',
    branch: 'Branch A',
  },
  {
    id: 'alert4',
    type: 'Target Alert',
    severity: 'Medium',
    title: 'Sales target at 68%',
    message: 'You are at 68% of monthly target with 3 days remaining. Push for more orders!',
    actionRequired: false,
    timestamp: '2026-02-25 7:00 AM',
    branch: 'Branch A',
  },
  {
    id: 'alert5',
    type: 'Commission Update',
    severity: 'Low',
    title: 'Commission earned: ₱24,250',
    message: 'Your February commission is ₱24,250. Keep up the great work!',
    actionRequired: false,
    timestamp: '2026-02-24 6:00 PM',
    branch: 'Branch A',
  },
];

// ============================================
// GETTER FUNCTIONS WITH BRANCH FILTERING
// ============================================

export function getAgentKPIsByBranch(branch: string): AgentKPI[] {
  if (branch === 'All') {
    return agentKPIs.filter((kpi) => kpi.branch === 'All');
  }
  return agentKPIs.filter((kpi) => kpi.branch === branch);
}

export function getAgentCustomersByBranch(branch: string): AgentCustomer[] {
  if (branch === 'All') return agentCustomers;
  return agentCustomers.filter((customer) => customer.branch === branch);
}

export function getAgentOrdersByBranch(branch: string): AgentOrder[] {
  if (branch === 'All') return agentOrders;
  return agentOrders.filter((order) => order.branch === branch);
}

export function getPODCollectionsByBranch(branch: string): PODCollection[] {
  if (branch === 'All') return podCollections;
  return podCollections.filter((pod) => pod.branch === branch);
}

export function getPaymentCollectionsByBranch(branch: string): PaymentCollection[] {
  if (branch === 'All') return paymentCollections;
  return paymentCollections.filter((payment) => payment.branch === branch);
}

export function getPurchaseRequestsByBranch(branch: string): PurchaseRequest[] {
  if (branch === 'All') return purchaseRequests;
  return purchaseRequests.filter((pr) => pr.branch === branch);
}

export function getAgentPerformanceByBranch(branch: string): AgentPerformance[] {
  if (branch === 'All') return agentPerformance;
  return agentPerformance.filter((perf) => perf.branch === branch);
}

export function getCommissionsByBranch(branch: string): Commission[] {
  if (branch === 'All') return commissions;
  return commissions.filter((comm) => comm.branch === branch);
}

export function getAgentActivitiesByBranch(branch: string): AgentActivity[] {
  if (branch === 'All') return agentActivities;
  return agentActivities.filter((activity) => activity.branch === branch);
}

export function getAgentAlertsByBranch(branch: string): AgentAlert[] {
  if (branch === 'All') return agentAlerts;
  return agentAlerts.filter((alert) => alert.branch === branch);
}
