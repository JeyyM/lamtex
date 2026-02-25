import {
  ExecutiveKPI,
  ApprovalOrder,
  FinishedGoodsAlert,
  RawMaterialAlert,
  TopProduct,
  TopHardwareStore,
  AgentPerformance,
  BranchPerformance,
  NotificationItem,
  CalendarEvent
} from '../types/executive';

export const MOCK_KPIS: ExecutiveKPI[] = [
  { id: 'kpi-1', label: 'Total Sales (MTD)', value: '₱12.4M', trend: '+8.2%', trendUp: true },
  { id: 'kpi-2', label: 'Ongoing Orders', value: '142', subtitle: '12 pending approval', status: 'warning' },
  { id: 'kpi-3', label: 'Pending Approvals', value: '₱1.8M', subtitle: '12 orders', status: 'warning' },
  { id: 'kpi-4', label: 'Low Stock Products', value: '4', status: 'danger' },
  { id: 'kpi-5', label: 'Low Stock Raw Materials', value: '3', status: 'danger' },
  { id: 'kpi-6', label: 'Total Suppliers', value: '28', status: 'neutral' },
  { id: 'kpi-7', label: 'Overdue Payments', value: '₱850K', subtitle: '8 invoices', status: 'danger' },
  { id: 'kpi-8', label: 'Delivery Reliability', value: '94%', subtitle: '3 delays, 2.1d avg lead', status: 'good' },
];

export const MOCK_APPROVALS: ApprovalOrder[] = [
  {
    id: 'app-1',
    status: 'Pending',
    orderNumber: 'ORD-2026-1045',
    customer: 'Mega Hardware Center',
    agent: 'Juan Dela Cruz',
    branch: 'Branch A',
    productsSummary: '4 lines / 450 pcs',
    totalAmount: 450000,
    requestedDiscount: 12,
    marginImpact: 'Red',
    requestedDeliveryDate: '2026-02-26',
  },
  {
    id: 'app-2',
    status: 'Pending',
    orderNumber: 'ORD-2026-1048',
    customer: 'BuildRight Supplies',
    agent: 'Maria Santos',
    branch: 'Branch B',
    productsSummary: '2 lines / 120 pcs',
    totalAmount: 125000,
    requestedDiscount: 8,
    marginImpact: 'Yellow',
    requestedDeliveryDate: '2026-02-27',
  },
  {
    id: 'app-3',
    status: 'Pending',
    orderNumber: 'ORD-2026-1052',
    customer: 'City Builders',
    agent: 'Pedro Reyes',
    branch: 'Branch A',
    productsSummary: '10 lines / 1200 pcs',
    totalAmount: 1200000,
    requestedDiscount: 5,
    marginImpact: 'Green',
    requestedDeliveryDate: '2026-03-01',
  },
  {
    id: 'app-4',
    status: 'Pending',
    orderNumber: 'ORD-2026-1055',
    customer: 'Home Fix Depot',
    agent: 'Juan Dela Cruz',
    branch: 'Branch C',
    productsSummary: '1 line / 50 pcs',
    totalAmount: 45000,
    requestedDiscount: 15,
    marginImpact: 'Red',
    requestedDeliveryDate: '2026-02-25',
  },
  {
    id: 'app-5',
    status: 'Pending',
    orderNumber: 'ORD-2026-1060',
    customer: 'Northern Construction',
    agent: 'Maria Santos',
    branch: 'Branch B',
    productsSummary: '5 lines / 800 pcs',
    totalAmount: 850000,
    requestedDiscount: 10,
    marginImpact: 'Yellow',
    requestedDeliveryDate: '2026-03-05',
  },
  {
    id: 'app-6',
    status: 'Pending',
    orderNumber: 'ORD-2026-1062',
    customer: 'Hardware Store A',
    agent: 'Pedro Reyes',
    branch: 'Branch A',
    productsSummary: '3 lines / 300 pcs',
    totalAmount: 210000,
    requestedDiscount: 5,
    marginImpact: 'Green',
    requestedDeliveryDate: '2026-02-28',
  }
];

export const MOCK_FINISHED_GOODS_ALERTS: FinishedGoodsAlert[] = [
  { id: 'fg-1', productName: 'PVC Pipe 2" Class 150', avgWeeklySales: 1500, forecastNext30Days: 6500, stockoutInDays: 4, riskLevel: 'High' },
  { id: 'fg-2', productName: 'PVC Pipe 4" Class 150', avgWeeklySales: 800, forecastNext30Days: 3500, stockoutInDays: 7, riskLevel: 'High' },
  { id: 'fg-3', productName: 'Solvent Cement 100ml', avgWeeklySales: 2000, forecastNext30Days: 8500, stockoutInDays: 12, riskLevel: 'Medium' },
  { id: 'fg-4', productName: 'Garden Hose 1/2" 10m', avgWeeklySales: 500, forecastNext30Days: 2200, stockoutInDays: 15, riskLevel: 'Medium' },
];

export const MOCK_RAW_MATERIAL_ALERTS: RawMaterialAlert[] = [
  { id: 'rm-1', materialName: 'PVC Resin SG-5', currentQty: 2500, unit: 'kg', estimatedDaysRemaining: 5, suggestedReorderQty: 10000, suggestedReorderDate: '2026-02-25', linkedProductsAffected: ['All PVC Pipes'], riskLevel: 'High' },
  { id: 'rm-2', materialName: 'Calcium Carbonate', currentQty: 800, unit: 'kg', estimatedDaysRemaining: 8, suggestedReorderQty: 5000, suggestedReorderDate: '2026-02-28', linkedProductsAffected: ['All PVC Pipes'], riskLevel: 'Medium' },
  { id: 'rm-3', materialName: 'Titanium Dioxide', currentQty: 150, unit: 'kg', estimatedDaysRemaining: 12, suggestedReorderQty: 1000, suggestedReorderDate: '2026-03-05', linkedProductsAffected: ['White PVC Pipes'], riskLevel: 'Low' },
];

export const MOCK_TOP_PRODUCTS: TopProduct[] = [
  { id: 'tp-1', name: 'PVC Pipe 2" Class 150', unitsSold: 12500, revenue: 1500000, trendUp: true },
  { id: 'tp-2', name: 'PVC Pipe 4" Class 150', unitsSold: 8200, revenue: 2870000, trendUp: true },
  { id: 'tp-3', name: 'Solvent Cement 100ml', unitsSold: 15000, revenue: 675000, trendUp: false },
  { id: 'tp-4', name: 'Garden Hose 1/2" 10m', unitsSold: 4500, revenue: 1125000, trendUp: true },
];

export const MOCK_TOP_STORES: TopHardwareStore[] = [
  { id: 'ts-1', name: 'Mega Hardware Center', revenue: 3500000, paymentBehavior: 'Good' },
  { id: 'ts-2', name: 'City Builders', revenue: 2800000, paymentBehavior: 'Good' },
  { id: 'ts-3', name: 'BuildRight Supplies', revenue: 1950000, paymentBehavior: 'Watchlist' },
  { id: 'ts-4', name: 'Northern Construction', revenue: 1500000, paymentBehavior: 'Risk' },
];

export const MOCK_AGENT_PERFORMANCE: AgentPerformance[] = [
  { id: 'ap-1', name: 'Juan Dela Cruz', sales: 4500000, quota: 4000000, collections: 4200000 },
  { id: 'ap-2', name: 'Maria Santos', sales: 3800000, quota: 4000000, collections: 3500000 },
  { id: 'ap-3', name: 'Pedro Reyes', sales: 5200000, quota: 4500000, collections: 4800000 },
];

export const MOCK_BRANCH_PERFORMANCE: BranchPerformance[] = [
  { id: 'bp-1', branch: 'Branch A', sales: 6500000, quota: 6000000, stockouts: 2, onTimeDelivery: 96, overdueReceivables: 250000 },
  { id: 'bp-2', branch: 'Branch B', sales: 4200000, quota: 4500000, stockouts: 5, onTimeDelivery: 91, overdueReceivables: 450000 },
  { id: 'bp-3', branch: 'Branch C', sales: 2800000, quota: 2500000, stockouts: 1, onTimeDelivery: 98, overdueReceivables: 150000 },
];

export const MOCK_NOTIFICATIONS: NotificationItem[] = [
  { id: 'notif-1', category: 'Approvals', message: 'ORD-2026-1045 requires urgent approval (12% discount).', time: '10 mins ago', read: false, urgent: true },
  { id: 'notif-2', category: 'Inventory', message: 'PVC Resin SG-5 stock critically low (5 days remaining).', time: '1 hour ago', read: false, urgent: true },
  { id: 'notif-3', category: 'Delivery', message: 'Truck TRK-004 delayed by 2 hours due to traffic.', time: '2 hours ago', read: false, urgent: false },
  { id: 'notif-4', category: 'Payment', message: 'BuildRight Supplies invoice INV-2026-089 is 5 days overdue.', time: '3 hours ago', read: true, urgent: false },
  { id: 'notif-5', category: 'Approvals', message: 'ORD-2026-1055 requires approval (15% discount).', time: '4 hours ago', read: true, urgent: true },
  { id: 'notif-6', category: 'Inventory', message: 'PVC Pipe 2" Class 150 stockout risk in 4 days.', time: '5 hours ago', read: true, urgent: true },
  { id: 'notif-7', category: 'Delivery', message: 'Delivery to City Builders completed successfully.', time: '1 day ago', read: true, urgent: false },
  { id: 'notif-8', category: 'Payment', message: 'Payment received from Mega Hardware Center (₱1.2M).', time: '1 day ago', read: true, urgent: false },
  { id: 'notif-9', category: 'Inventory', message: 'New batch of Solvent Cement 100ml completed QC.', time: '2 days ago', read: true, urgent: false },
  { id: 'notif-10', category: 'Approvals', message: 'ORD-2026-1012 approved by System.', time: '2 days ago', read: true, urgent: false },
];

export const MOCK_CALENDAR_EVENTS: CalendarEvent[] = [
  { id: 'evt-1', title: 'Delivery: Mega Hardware', date: '2026-02-24', type: 'Outgoing', atRisk: false, details: 'ORD-2026-1040 - 2 Trucks' },
  { id: 'evt-2', title: 'Delivery: BuildRight', date: '2026-02-24', type: 'Outgoing', atRisk: true, details: 'ORD-2026-1042 - Truck TRK-004 Delayed' },
  { id: 'evt-3', title: 'Arrival: PVC Resin', date: '2026-02-25', type: 'Incoming', atRisk: false, details: 'PO-2026-055 - 10,000 kg' },
  { id: 'evt-4', title: 'Delivery: City Builders', date: '2026-02-25', type: 'Outgoing', atRisk: false, details: 'ORD-2026-1048 - 1 Truck' },
  { id: 'evt-5', title: 'Arrival: Calcium Carbonate', date: '2026-02-26', type: 'Incoming', atRisk: false, details: 'PO-2026-058 - 5,000 kg' },
  { id: 'evt-6', title: 'Delivery: Home Fix Depot', date: '2026-02-26', type: 'Outgoing', atRisk: true, details: 'ORD-2026-1050 - Pending Approval' },
  { id: 'evt-7', title: 'Delivery: Northern Const.', date: '2026-02-27', type: 'Outgoing', atRisk: false, details: 'ORD-2026-1052 - 3 Trucks' },
  { id: 'evt-8', title: 'Arrival: Titanium Dioxide', date: '2026-02-28', type: 'Incoming', atRisk: false, details: 'PO-2026-060 - 1,000 kg' },
  { id: 'evt-9', title: 'Delivery: Hardware Store A', date: '2026-02-28', type: 'Outgoing', atRisk: false, details: 'ORD-2026-1055 - 1 Truck' },
  { id: 'evt-10', title: 'Delivery: Mega Hardware', date: '2026-03-01', type: 'Outgoing', atRisk: false, details: 'ORD-2026-1060 - 2 Trucks' },
  { id: 'evt-11', title: 'Arrival: Packaging Materials', date: '2026-03-02', type: 'Incoming', atRisk: false, details: 'PO-2026-062 - 50 Rolls' },
  { id: 'evt-12', title: 'Delivery: City Builders', date: '2026-03-03', type: 'Outgoing', atRisk: false, details: 'ORD-2026-1065 - 1 Truck' },
];
