export interface ExecutiveKPI {
  id: string;
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  subtitle?: string;
  status?: 'good' | 'warning' | 'danger' | 'neutral';
}

export interface ApprovalOrder {
  id: string;
  status: 'Pending' | 'Scheduled' | 'Shipping' | 'Delivered' | 'Complete' | 'Late';
  orderNumber: string;
  customer: string;
  agent: string;
  branch: string;
  productsSummary: string;
  totalAmount: number;
  requestedDiscount: number;
  marginImpact: 'Green' | 'Yellow' | 'Red';
  requestedDeliveryDate: string;
}

export interface FinishedGoodsAlert {
  id: string;
  productName: string;
  avgWeeklySales: number;
  forecastNext30Days: number;
  stockoutInDays: number;
  riskLevel: 'High' | 'Medium' | 'Low';
}

export interface RawMaterialAlert {
  id: string;
  materialName: string;
  currentQty: number;
  unit: string;
  estimatedDaysRemaining: number;
  suggestedReorderQty: number;
  suggestedReorderDate: string;
  linkedProductsAffected: string[];
  riskLevel: 'High' | 'Medium' | 'Low';
}

export interface TopProduct {
  id: string;
  name: string;
  unitsSold: number;
  revenue: number;
  trendUp: boolean;
}

export interface TopHardwareStore {
  id: string;
  name: string;
  revenue: number;
  paymentBehavior: 'Good' | 'Watchlist' | 'Risk';
}

export interface AgentPerformance {
  id: string;
  name: string;
  sales: number;
  quota: number;
  collections: number;
}

export interface BranchPerformance {
  id: string;
  branch: string;
  sales: number;
  quota: number;
  stockouts: number;
  onTimeDelivery: number;
  overdueReceivables: number;
}

export interface NotificationItem {
  id: string;
  category: 'Approvals' | 'Inventory' | 'Delivery' | 'Payment';
  message: string;
  time: string;
  read: boolean;
  urgent: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'Outgoing' | 'Incoming';
  atRisk: boolean;
  details: string;
}
