import { Branch } from '../types';
import {
  ExecutiveKPI,
  ApprovalOrder,
  FinishedGoodsAlert,
  RawMaterialAlert,
  TopProduct,
  TopHardwareStore,
  AgentPerformance,
  BranchPerformance,
} from '../types/executive';

// ============================================
// KPI DATA BY BRANCH
// ============================================

const KPI_DATA_BRANCH_A: ExecutiveKPI[] = [
  { id: 'kpi-a-1', label: 'Total Sales (MTD)', value: '₱6.5M', trend: '+12.5%', trendUp: true, previousValue: '₱5.8M' },
  { id: 'kpi-a-2', label: 'Ongoing Orders', value: '68', subtitle: '8 pending approval', status: 'warning' },
  { id: 'kpi-a-3', label: 'Pending Approvals', value: '₱1.1M', subtitle: '8 orders', status: 'warning' },
  { id: 'kpi-a-4', label: 'Low Stock Products', value: '2', status: 'warning' },
  { id: 'kpi-a-5', label: 'Low Stock Raw Materials', value: '1', status: 'warning' },
  { id: 'kpi-a-6', label: 'Total Suppliers', value: '15', status: 'neutral' },
  { id: 'kpi-a-7', label: 'Overdue Payments', value: '₱250K', subtitle: '3 invoices', status: 'warning' },
  { id: 'kpi-a-8', label: 'Delivery Reliability', value: '96%', subtitle: '1 delay, 1.8d avg lead', status: 'good' },
];

const KPI_DATA_BRANCH_B: ExecutiveKPI[] = [
  { id: 'kpi-b-1', label: 'Total Sales (MTD)', value: '₱4.2M', trend: '+5.8%', trendUp: true, previousValue: '₱4.0M' },
  { id: 'kpi-b-2', label: 'Ongoing Orders', value: '48', subtitle: '6 pending approval', status: 'warning' },
  { id: 'kpi-b-3', label: 'Pending Approvals', value: '₱975K', subtitle: '6 orders', status: 'warning' },
  { id: 'kpi-b-4', label: 'Low Stock Products', value: '5', status: 'danger' },
  { id: 'kpi-b-5', label: 'Low Stock Raw Materials', value: '2', status: 'warning' },
  { id: 'kpi-b-6', label: 'Total Suppliers', value: '12', status: 'neutral' },
  { id: 'kpi-b-7', label: 'Overdue Payments', value: '₱450K', subtitle: '6 invoices', status: 'danger' },
  { id: 'kpi-b-8', label: 'Delivery Reliability', value: '91%', subtitle: '4 delays, 2.5d avg lead', status: 'warning' },
];

const KPI_DATA_BRANCH_C: ExecutiveKPI[] = [
  { id: 'kpi-c-1', label: 'Total Sales (MTD)', value: '₱2.8M', trend: '+15.2%', trendUp: true, previousValue: '₱2.4M' },
  { id: 'kpi-c-2', label: 'Ongoing Orders', value: '26', subtitle: '3 pending approval', status: 'good' },
  { id: 'kpi-c-3', label: 'Pending Approvals', value: '₱255K', subtitle: '3 orders', status: 'good' },
  { id: 'kpi-c-4', label: 'Low Stock Products', value: '1', status: 'good' },
  { id: 'kpi-c-5', label: 'Low Stock Raw Materials', value: '0', status: 'good' },
  { id: 'kpi-c-6', label: 'Total Suppliers', value: '8', status: 'neutral' },
  { id: 'kpi-c-7', label: 'Overdue Payments', value: '₱150K', subtitle: '2 invoices', status: 'warning' },
  { id: 'kpi-c-8', label: 'Delivery Reliability', value: '98%', subtitle: '0 delays, 1.5d avg lead', status: 'good' },
];

const KPI_DATA_ALL: ExecutiveKPI[] = [
  { id: 'kpi-all-1', label: 'Total Sales (MTD)', value: '₱13.5M', trend: '+10.2%', trendUp: true, previousValue: '₱12.2M' },
  { id: 'kpi-all-2', label: 'Ongoing Orders', value: '142', subtitle: '17 pending approval', status: 'warning' },
  { id: 'kpi-all-3', label: 'Pending Approvals', value: '₱2.3M', subtitle: '17 orders', status: 'warning' },
  { id: 'kpi-all-4', label: 'Low Stock Products', value: '8', status: 'danger' },
  { id: 'kpi-all-5', label: 'Low Stock Raw Materials', value: '3', status: 'warning' },
  { id: 'kpi-all-6', label: 'Total Suppliers', value: '28', status: 'neutral' },
  { id: 'kpi-all-7', label: 'Overdue Payments', value: '₱850K', subtitle: '11 invoices', status: 'danger' },
  { id: 'kpi-all-8', label: 'Delivery Reliability', value: '94%', subtitle: '5 delays, 2.1d avg lead', status: 'good' },
];

export const getKPIsByBranch = (branch: Branch): ExecutiveKPI[] => {
  switch (branch) {
    case 'Branch A':
      return KPI_DATA_BRANCH_A;
    case 'Branch B':
      return KPI_DATA_BRANCH_B;
    case 'Branch C':
      return KPI_DATA_BRANCH_C;
    case 'All':
    default:
      return KPI_DATA_ALL;
  }
};

// ============================================
// APPROVAL ORDERS BY BRANCH
// ============================================

export const APPROVAL_ORDERS: ApprovalOrder[] = [
  // Branch A Orders
  {
    id: 'app-a-1',
    status: 'Pending',
    orderNumber: 'ORD-2026-1045',
    customer: 'Mega Hardware Center',
    customerLocation: '14.6760° N, 121.0437° E', // QC coordinates
    agent: 'Juan Dela Cruz',
    branch: 'Branch A',
    productsSummary: '4 lines / 450 pcs',
    totalAmount: 450000,
    requestedDiscount: 12,
    marginImpact: 'Red',
    requestedDeliveryDate: '2026-02-26',
    urgencyScore: 95, // High urgency: tomorrow + high value
  },
  {
    id: 'app-a-2',
    status: 'Pending',
    orderNumber: 'ORD-2026-1052',
    customer: 'City Builders',
    customerLocation: '14.5995° N, 120.9842° E',
    agent: 'Pedro Reyes',
    branch: 'Branch A',
    productsSummary: '10 lines / 1200 pcs',
    totalAmount: 1200000,
    requestedDiscount: 5,
    marginImpact: 'Green',
    requestedDeliveryDate: '2026-03-01',
    urgencyScore: 85,
  },
  {
    id: 'app-a-3',
    status: 'Pending',
    orderNumber: 'ORD-2026-1062',
    customer: 'Hardware Store A',
    customerLocation: '14.6091° N, 121.0223° E',
    agent: 'Pedro Reyes',
    branch: 'Branch A',
    productsSummary: '3 lines / 300 pcs',
    totalAmount: 210000,
    requestedDiscount: 5,
    marginImpact: 'Green',
    requestedDeliveryDate: '2026-02-28',
    urgencyScore: 70,
  },
  {
    id: 'app-a-4',
    status: 'Pending',
    orderNumber: 'ORD-2026-1068',
    customer: 'Pro Construction Supply',
    customerLocation: '14.6507° N, 121.0494° E',
    agent: 'Juan Dela Cruz',
    branch: 'Branch A',
    productsSummary: '6 lines / 680 pcs',
    totalAmount: 580000,
    requestedDiscount: 8,
    marginImpact: 'Yellow',
    requestedDeliveryDate: '2026-03-03',
    urgencyScore: 75,
  },
  {
    id: 'app-a-5',
    status: 'Pending',
    orderNumber: 'ORD-2026-1072',
    customer: 'Quality Building Materials',
    customerLocation: '14.5794° N, 121.0359° E',
    agent: 'Juan Dela Cruz',
    branch: 'Branch A',
    productsSummary: '2 lines / 150 pcs',
    totalAmount: 125000,
    requestedDiscount: 6,
    marginImpact: 'Green',
    requestedDeliveryDate: '2026-03-05',
    urgencyScore: 60,
  },
  {
    id: 'app-a-6',
    status: 'Pending',
    orderNumber: 'ORD-2026-1075',
    customer: 'Metro Hardware Hub',
    customerLocation: '14.6042° N, 121.0195° E',
    agent: 'Pedro Reyes',
    branch: 'Branch A',
    productsSummary: '5 lines / 520 pcs',
    totalAmount: 475000,
    requestedDiscount: 10,
    marginImpact: 'Yellow',
    requestedDeliveryDate: '2026-03-02',
    urgencyScore: 80,
  },
  {
    id: 'app-a-7',
    status: 'Pending',
    orderNumber: 'ORD-2026-1078',
    customer: 'Supreme Builders Depot',
    customerLocation: '14.6289° N, 121.0531° E',
    agent: 'Juan Dela Cruz',
    branch: 'Branch A',
    productsSummary: '8 lines / 950 pcs',
    totalAmount: 850000,
    requestedDiscount: 7,
    marginImpact: 'Yellow',
    requestedDeliveryDate: '2026-03-04',
    urgencyScore: 78,
  },
  {
    id: 'app-a-8',
    status: 'Pending',
    orderNumber: 'ORD-2026-1081',
    customer: 'Premier Construction Supplies',
    customerLocation: '14.6512° N, 121.0328° E',
    agent: 'Pedro Reyes',
    branch: 'Branch A',
    productsSummary: '3 lines / 280 pcs',
    totalAmount: 195000,
    requestedDiscount: 4,
    marginImpact: 'Green',
    requestedDeliveryDate: '2026-03-06',
    urgencyScore: 55,
  },

  // Branch B Orders
  {
    id: 'app-b-1',
    status: 'Pending',
    orderNumber: 'ORD-2026-1048',
    customer: 'BuildRight Supplies',
    customerLocation: '10.3157° N, 123.8854° E', // Cebu coordinates
    agent: 'Maria Santos',
    branch: 'Branch B',
    productsSummary: '2 lines / 120 pcs',
    totalAmount: 125000,
    requestedDiscount: 8,
    marginImpact: 'Yellow',
    requestedDeliveryDate: '2026-02-27',
    urgencyScore: 82,
  },
  {
    id: 'app-b-2',
    status: 'Pending',
    orderNumber: 'ORD-2026-1060',
    customer: 'Northern Construction',
    customerLocation: '10.2968° N, 123.9019° E',
    agent: 'Maria Santos',
    branch: 'Branch B',
    productsSummary: '5 lines / 800 pcs',
    totalAmount: 850000,
    requestedDiscount: 10,
    marginImpact: 'Yellow',
    requestedDeliveryDate: '2026-03-05',
    urgencyScore: 88,
  },
  {
    id: 'app-b-3',
    status: 'Pending',
    orderNumber: 'ORD-2026-1065',
    customer: 'Visayas Hardware Central',
    customerLocation: '10.3321° N, 123.9143° E',
    agent: 'Lisa Garcia',
    branch: 'Branch B',
    productsSummary: '7 lines / 650 pcs',
    totalAmount: 625000,
    requestedDiscount: 9,
    marginImpact: 'Yellow',
    requestedDeliveryDate: '2026-03-02',
    urgencyScore: 76,
  },
  {
    id: 'app-b-4',
    status: 'Pending',
    orderNumber: 'ORD-2026-1070',
    customer: 'Island Builders Supply',
    customerLocation: '10.3088° N, 123.8931° E',
    agent: 'Maria Santos',
    branch: 'Branch B',
    productsSummary: '4 lines / 420 pcs',
    totalAmount: 380000,
    requestedDiscount: 11,
    marginImpact: 'Red',
    requestedDeliveryDate: '2026-02-28',
    urgencyScore: 84,
  },
  {
    id: 'app-b-5',
    status: 'Pending',
    orderNumber: 'ORD-2026-1074',
    customer: 'Coastal Construction Materials',
    customerLocation: '10.2935° N, 123.9067° E',
    agent: 'Lisa Garcia',
    branch: 'Branch B',
    productsSummary: '3 lines / 250 pcs',
    totalAmount: 215000,
    requestedDiscount: 6,
    marginImpact: 'Green',
    requestedDeliveryDate: '2026-03-07',
    urgencyScore: 58,
  },
  {
    id: 'app-b-6',
    status: 'Pending',
    orderNumber: 'ORD-2026-1079',
    customer: 'Central Visayas Hardware',
    customerLocation: '10.3205° N, 123.8972° E',
    agent: 'Maria Santos',
    branch: 'Branch B',
    productsSummary: '6 lines / 580 pcs',
    totalAmount: 495000,
    requestedDiscount: 7,
    marginImpact: 'Yellow',
    requestedDeliveryDate: '2026-03-03',
    urgencyScore: 72,
  },

  // Branch C Orders
  {
    id: 'app-c-1',
    status: 'Pending',
    orderNumber: 'ORD-2026-1055',
    customer: 'Home Fix Depot',
    customerLocation: '7.0731° N, 125.6128° E', // Davao coordinates
    agent: 'Ramon Cruz',
    branch: 'Branch C',
    productsSummary: '1 line / 50 pcs',
    totalAmount: 45000,
    requestedDiscount: 15,
    marginImpact: 'Red',
    requestedDeliveryDate: '2026-02-25',
    urgencyScore: 98, // Today! Very urgent
  },
  {
    id: 'app-c-2',
    status: 'Pending',
    orderNumber: 'ORD-2026-1067',
    customer: 'Mindanao Builders Hub',
    customerLocation: '7.0644° N, 125.6078° E',
    agent: 'Ramon Cruz',
    branch: 'Branch C',
    productsSummary: '4 lines / 380 pcs',
    totalAmount: 320000,
    requestedDiscount: 6,
    marginImpact: 'Green',
    requestedDeliveryDate: '2026-03-01',
    urgencyScore: 68,
  },
  {
    id: 'app-c-3',
    status: 'Pending',
    orderNumber: 'ORD-2026-1076',
    customer: 'Southern Construction Supply',
    customerLocation: '7.0909° N, 125.6197° E',
    agent: 'Teresa Lopez',
    branch: 'Branch C',
    productsSummary: '2 lines / 180 pcs',
    totalAmount: 155000,
    requestedDiscount: 5,
    marginImpact: 'Green',
    requestedDeliveryDate: '2026-03-04',
    urgencyScore: 62,
  },
];

export const getApprovalsByBranch = (branch: Branch): ApprovalOrder[] => {
  if (branch === 'All') return APPROVAL_ORDERS;
  return APPROVAL_ORDERS.filter(order => order.branch === branch);
};

// Sort approvals by urgency (soonest delivery + biggest value)
export const getSortedApprovals = (orders: ApprovalOrder[]): ApprovalOrder[] => {
  return [...orders].sort((a, b) => (b.urgencyScore || 0) - (a.urgencyScore || 0));
};
