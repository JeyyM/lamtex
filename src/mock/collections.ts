// Mock data for collections and receivables - Agent functionality

import { Receivable, CollectionNote, PaymentRecord, ReceivablesSummary, PaymentLink } from '../types/collections';

export const MOCK_RECEIVABLES: Receivable[] = [
  {
    id: 'REC-001',
    invoiceId: 'INV-2026-5201',
    orderId: 'ORD-2026-1003',
    customerId: 'CUS-003',
    customerName: 'City Builders Supply',
    invoiceDate: '2026-02-19',
    dueDate: '2026-02-21',
    invoiceAmount: 34200,
    amountPaid: 15000,
    balanceDue: 19200,
    status: 'Overdue',
    daysOverdue: 4,
    paymentTerms: '30 Days',
    
    assignedAgent: 'Pedro Reyes',
    assignedAgentId: 'AGT-001',
    branch: 'Branch A',
    
    lastContactDate: '2026-02-24',
    nextFollowUpDate: '2026-02-27',
    
    createdAt: '2026-02-19T10:00:00Z',
    updatedAt: '2026-02-24T16:00:00Z',
  },
  {
    id: 'REC-002',
    invoiceId: 'INV-2026-5198',
    orderId: 'ORD-2026-0994',
    customerId: 'CUS-002',
    customerName: 'BuildMaster Construction Corp',
    invoiceDate: '2026-01-15',
    dueDate: '2026-02-01',
    invoiceAmount: 850000,
    amountPaid: 0,
    balanceDue: 850000,
    status: 'Critical',
    daysOverdue: 24,
    paymentTerms: '45 Days',
    
    assignedAgent: 'Juan Dela Cruz',
    assignedAgentId: 'AGT-002',
    branch: 'Branch A',
    
    lastContactDate: '2026-02-24',
    nextFollowUpDate: '2026-02-26',
    
    createdAt: '2026-01-15T11:00:00Z',
    updatedAt: '2026-02-24T11:00:00Z',
  },
  {
    id: 'REC-003',
    invoiceId: 'INV-2026-5180',
    orderId: 'ORD-2026-0980',
    customerId: 'CUS-006',
    customerName: 'Golden Gate Hardware',
    invoiceDate: '2025-12-20',
    dueDate: '2026-01-19',
    invoiceAmount: 650000,
    amountPaid: 0,
    balanceDue: 650000,
    status: 'Critical',
    daysOverdue: 37,
    paymentTerms: '30 Days',
    
    assignedAgent: 'Pedro Reyes',
    assignedAgentId: 'AGT-001',
    branch: 'Branch A',
    
    lastContactDate: '2026-02-24',
    nextFollowUpDate: '2026-02-27',
    
    createdAt: '2025-12-20T09:00:00Z',
    updatedAt: '2026-02-24T15:45:00Z',
  },
  {
    id: 'REC-004',
    invoiceId: 'INV-2026-5225',
    orderId: 'ORD-2026-1012',
    customerId: 'CUS-001',
    customerName: 'Mega Hardware Center',
    invoiceDate: '2026-02-18',
    dueDate: '2026-03-20',
    invoiceAmount: 285000,
    amountPaid: 0,
    balanceDue: 285000,
    status: 'Current',
    daysOverdue: 0,
    paymentTerms: '30 Days',
    
    assignedAgent: 'Pedro Reyes',
    assignedAgentId: 'AGT-001',
    branch: 'Branch A',
    
    createdAt: '2026-02-18T14:00:00Z',
    updatedAt: '2026-02-18T14:00:00Z',
  },
  {
    id: 'REC-005',
    invoiceId: 'INV-2026-5228',
    orderId: 'ORD-2026-1015',
    customerId: 'CUS-004',
    customerName: 'Skyline Developers Inc',
    invoiceDate: '2026-02-22',
    dueDate: '2026-04-23',
    invoiceAmount: 1450000,
    amountPaid: 0,
    balanceDue: 1450000,
    status: 'Current',
    daysOverdue: 0,
    paymentTerms: '60 Days',
    
    assignedAgent: 'Maria Santos',
    assignedAgentId: 'AGT-003',
    branch: 'Branch B',
    
    createdAt: '2026-02-22T16:00:00Z',
    updatedAt: '2026-02-22T16:00:00Z',
  },
  {
    id: 'REC-006',
    invoiceId: 'INV-2026-5232',
    orderId: 'ORD-2026-1018',
    customerId: 'CUS-001',
    customerName: 'Mega Hardware Center',
    invoiceDate: '2026-02-23',
    dueDate: '2026-03-02',
    invoiceAmount: 125000,
    amountPaid: 0,
    balanceDue: 125000,
    status: 'Due Soon',
    daysOverdue: 0,
    paymentTerms: '30 Days',
    
    assignedAgent: 'Pedro Reyes',
    assignedAgentId: 'AGT-001',
    branch: 'Branch A',
    
    nextFollowUpDate: '2026-02-28',
    
    createdAt: '2026-02-23T10:00:00Z',
    updatedAt: '2026-02-23T10:00:00Z',
  },
];

export const MOCK_COLLECTION_NOTES: CollectionNote[] = [
  {
    id: 'CN-001',
    receivableId: 'REC-001',
    noteType: 'Phone Call',
    content: 'Spoke with accounting. They confirmed check for ₱15K was mailed last week. Promised to send remaining ₱19.2K by Friday.',
    nextAction: 'Verify check receipt and confirm Friday payment',
    followUpDate: '2026-02-27',
    createdBy: 'Pedro Reyes',
    createdAt: '2026-02-24T16:00:00Z',
  },
  {
    id: 'CN-002',
    receivableId: 'REC-002',
    noteType: 'Promise to Pay',
    content: 'Customer agreed to payment plan: ₱500K by end of week, balance of ₱350K within 2 weeks.',
    nextAction: 'Follow up on promised ₱500K payment',
    followUpDate: '2026-02-26',
    createdBy: 'Juan Dela Cruz',
    createdAt: '2026-02-24T11:00:00Z',
  },
  {
    id: 'CN-003',
    receivableId: 'REC-003',
    noteType: 'Phone Call',
    content: 'Owner acknowledged debt. Business has been slow. Promises payment of at least ₱500K by Friday.',
    nextAction: 'Call Thursday to confirm payment',
    followUpDate: '2026-02-27',
    createdBy: 'Pedro Reyes',
    createdAt: '2026-02-24T15:45:00Z',
  },
  {
    id: 'CN-004',
    receivableId: 'REC-002',
    noteType: 'Email',
    content: 'Sent formal demand letter with payment schedule options. Awaiting response.',
    nextAction: 'Follow up via phone if no response by tomorrow',
    followUpDate: '2026-02-25',
    createdBy: 'Juan Dela Cruz',
    createdAt: '2026-02-23T14:30:00Z',
  },
];

export const MOCK_PAYMENT_RECORDS: PaymentRecord[] = [
  {
    id: 'PAY-001',
    receivableId: 'REC-001',
    invoiceId: 'INV-2026-5201',
    paymentDate: '2026-02-20',
    amount: 15000,
    paymentMethod: 'Check',
    referenceNumber: 'CHK-789456',
    
    submittedBy: 'Pedro Reyes',
    submittedAt: '2026-02-21T09:30:00Z',
    proofOfPayment: ['check-789456.jpg'],
    verificationStatus: 'Verified',
    verifiedBy: 'Finance Team',
    verifiedAt: '2026-02-21T14:00:00Z',
    
    notes: 'Check received and deposited',
    createdAt: '2026-02-21T09:30:00Z',
  },
];

export const MOCK_PAYMENT_LINKS: PaymentLink[] = [
  {
    id: 'PL-001',
    orderId: 'ORD-2026-1002',
    invoiceId: 'INV-2026-5234',
    customerId: 'CUS-002',
    customerName: 'BuildMaster Construction Corp',
    amount: 216240,
    feePercent: 1.0,
    feeAmount: 2162.40,
    totalAmount: 218402.40,
    
    linkUrl: 'https://pay.lamtex.ph/inv/INV-2026-5234',
    status: 'Paid',
    expiresAt: '2026-03-25T23:59:59Z',
    
    generatedBy: 'Juan Dela Cruz',
    generatedAt: '2026-02-21T10:00:00Z',
    sentAt: '2026-02-21T10:05:00Z',
    viewedAt: '2026-02-21T14:30:00Z',
    paidAt: '2026-02-21T15:45:00Z',
    
    sentVia: ['Email', 'WhatsApp'],
    recipientEmail: 'maria@buildmaster.ph',
    recipientPhone: '+63 917 234 5678',
  },
  {
    id: 'PL-002',
    orderId: 'ORD-2026-1015',
    invoiceId: 'INV-2026-5228',
    customerId: 'CUS-004',
    customerName: 'Skyline Developers Inc',
    amount: 1450000,
    feePercent: 1.0,
    feeAmount: 3000, // Capped at ₱3,000
    totalAmount: 1453000,
    
    linkUrl: 'https://pay.lamtex.ph/inv/INV-2026-5228',
    status: 'Sent',
    expiresAt: '2026-03-24T23:59:59Z',
    
    generatedBy: 'Maria Santos',
    generatedAt: '2026-02-23T09:00:00Z',
    sentAt: '2026-02-23T09:15:00Z',
    viewedAt: '2026-02-23T16:20:00Z',
    
    sentVia: ['Email'],
    recipientEmail: 'jennifer@skylinedev.ph',
  },
];

export function getReceivablesByBranch(branch: string): Receivable[] {
  if (branch === 'All') return MOCK_RECEIVABLES;
  return MOCK_RECEIVABLES.filter(rec => rec.branch === branch);
}

export function getReceivablesByAgent(agentId: string): Receivable[] {
  return MOCK_RECEIVABLES.filter(rec => rec.assignedAgentId === agentId);
}

export function getReceivablesSummary(branch: string): ReceivablesSummary {
  const receivables = getReceivablesByBranch(branch);
  
  const totalOutstanding = receivables.reduce((sum, rec) => sum + rec.balanceDue, 0);
  const dueThisWeek = receivables
    .filter(rec => {
      const dueDate = new Date(rec.dueDate);
      const weekFromNow = new Date();
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      return dueDate <= weekFromNow && rec.daysOverdue === 0;
    })
    .reduce((sum, rec) => sum + rec.balanceDue, 0);
  
  const overdue = receivables
    .filter(rec => rec.daysOverdue > 0)
    .reduce((sum, rec) => sum + rec.balanceDue, 0);
  
  const critical = receivables
    .filter(rec => rec.status === 'Critical')
    .reduce((sum, rec) => sum + rec.balanceDue, 0);
  
  const customersWithOverdue = new Set(
    receivables.filter(rec => rec.daysOverdue > 0).map(rec => rec.customerId)
  ).size;
  
  const overdueReceivables = receivables.filter(rec => rec.daysOverdue > 0);
  const avgDaysOverdue = overdueReceivables.length > 0
    ? Math.round(overdueReceivables.reduce((sum, rec) => sum + rec.daysOverdue, 0) / overdueReceivables.length)
    : 0;
  
  return {
    totalOutstanding,
    dueThisWeek,
    overdue,
    critical,
    customersWithOverdue,
    avgDaysOverdue,
  };
}

export function getCollectionNotes(receivableId: string): CollectionNote[] {
  return MOCK_COLLECTION_NOTES.filter(note => note.receivableId === receivableId);
}

export function getPaymentRecords(receivableId: string): PaymentRecord[] {
  return MOCK_PAYMENT_RECORDS.filter(payment => payment.receivableId === receivableId);
}

export function getPaymentLinkByInvoice(invoiceId: string): PaymentLink | undefined {
  return MOCK_PAYMENT_LINKS.find(link => link.invoiceId === invoiceId);
}
