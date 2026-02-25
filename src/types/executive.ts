export interface ExecutiveKPI {
  id: string;
  label: string;
  value: string | number;
  trend?: string;
  trendUp?: boolean;
  subtitle?: string;
  status?: 'good' | 'warning' | 'danger' | 'neutral';
  previousValue?: string; // For comparison with previous period
}

export interface ApprovalOrder {
  id: string;
  status: 'Pending' | 'Scheduled' | 'Shipping' | 'Delivered' | 'Complete' | 'Late';
  orderNumber: string;
  customer: string;
  customerLocation?: string; // Coordinates for Google Maps
  agent: string;
  branch: string;
  productsSummary: string;
  totalAmount: number;
  requestedDiscount: number;
  marginImpact: 'Green' | 'Yellow' | 'Red';
  requestedDeliveryDate: string;
  urgencyScore?: number; // For sorting priority (0-100)
}

export interface FinishedGoodsAlert {
  id: string;
  productName: string;
  avgWeeklySales: number;
  forecastNext30Days: number;
  stockoutInDays: number;
  riskLevel: 'High' | 'Medium' | 'Low';
  branch?: string; // Which branch this alert is for
  currentStock?: number; // Current stock level
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
  branch?: string; // Which branch this alert is for
}

export interface TopProduct {
  id: string;
  name: string;
  unitsSold: number;
  revenue: number;
  trendUp: boolean;
  grossMargin?: number; // Margin percentage
}

export interface TopHardwareStore {
  id: string;
  name: string;
  revenue: number;
  paymentBehavior: 'Good' | 'Watchlist' | 'Risk';
  trendUp?: boolean; // Trend indicator
  previousRevenue?: number; // For trend calculation
}

export interface AgentPerformance {
  id: string;
  name: string;
  sales: number;
  quota: number;
  collections: number;
  activeAccounts?: number; // Number of active customer accounts
  underperformingStreak?: number; // Number of consecutive months below quota
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

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'Outgoing' | 'Incoming' | 'Transfer'; // Added Transfer for branch transfers
  atRisk: boolean;
  details: string;
  branch?: string; // Which branch this event belongs to
}

export interface NotificationItem {
  id: string;
  category: 'Approvals' | 'Inventory' | 'Delivery' | 'Payment' | 'System';
  message: string;
  time: string;
  read: boolean;
  urgent: boolean;
  actionUrl?: string; // URL to navigate when clicked
  actionLabel?: string; // Label for action button
}
