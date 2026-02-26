// Agent Analytics Types

export interface AgentSalesPerformance {
  totalRevenue: number;
  totalRevenueLifetime: number;
  totalRevenueMonthly: number;
  totalRevenueQuarterly: number;
  totalRevenueYearly: number;
  numberOfOrders: number;
  averageOrderValue: number;
  sellRate: number; // Conversion rate percentage
  salesGrowthRate: number; // Month-over-month percentage
  revenuePerCustomer: number;
  upsellRate: number; // Percentage
  quoteToOrderRatio: number; // Percentage
}

export interface AgentCustomerMetrics {
  activeCustomers: number;
  newCustomersAcquired: number;
  customerRetentionRate: number;
  customerChurnRate: number;
  averageCustomerLifetimeValue: number;
  customerSatisfactionScore: number;
  numberOfVisitsCalls: number;
}

export interface AgentFinancialMetrics {
  commissionEarned: number;
  averageProfitMargin: number;
  discountRateGiven: number;
  paymentCollectionRate: number;
  outstandingReceivables: number;
  badDebtRate: number;
}

export interface AgentOperationalMetrics {
  orderFulfillmentTime: number; // Average days
  orderAccuracyRate: number; // Percentage
  responseTime: number; // Average hours
  territoryCoverage: string; // Area description
  visitFrequency: number; // Visits per customer per month
  quotationVolume: number;
  orderCycleTime: number; // Average days
}

export interface AgentProductInsights {
  bestSellingProduct: string;
  highestMarginProduct: string;
  productCategoryMix: { category: string; percentage: number }[];
  newProductAdoptionRate: number;
  slowMovingProducts: string[];
}

export interface AgentTargets {
  monthlySalesTarget: number;
  quarterlySalesTarget: number;
  targetAchievementRate: number;
  daysAheadBehindTarget: number;
  revenueGap: number;
  stretchGoalStatus: string;
}

export interface AgentTrends {
  revenueTrend: { month: string; revenue: number }[];
  orderVolumeTrend: { month: string; orders: number }[];
  seasonalPerformance: { month: string; performance: number }[];
  peakSalesPeriod: string;
  yearOverYearGrowth: number;
  quarterOverQuarterGrowth: number;
  monthOverMonthGrowth: number;
}

export interface AgentIncentives {
  streakDays: number;
  milestonesAchieved: string[];
  awardsWon: string[];
  badges: string[];
  bonusTier: string;
}

export interface AgentRanking {
  rankByRevenue: number;
  rankByOrders: number;
  rankByCustomerAcquisition: number;
  rankByConversionRate: number;
  rankByRetention: number;
  consistencyScore: number;
}

export interface AgentAnalytics {
  agentId: string;
  agentName: string;
  branchId: string;
  branchName: string;
  profileImage?: string;
  joinDate: string;
  tenure: number; // Months
  status: 'active' | 'inactive' | 'on-leave';
  
  // Nested metrics
  salesPerformance: AgentSalesPerformance;
  customerMetrics: AgentCustomerMetrics;
  financialMetrics: AgentFinancialMetrics;
  operationalMetrics: AgentOperationalMetrics;
  productInsights: AgentProductInsights;
  targets: AgentTargets;
  trends: AgentTrends;
  incentives: AgentIncentives;
  ranking: AgentRanking;
}

// Branch Analytics Types
export interface BranchSalesPerformance {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  branchSellRate: number;
  revenuePerAgent: number;
  topProducts: { product: string; revenue: number }[];
  marketShare: number;
}

export interface BranchEfficiency {
  inventoryTurnoverRate: number;
  orderFulfillmentRate: number;
  customerComplaints: number;
  returnRate: number;
  averageDeliveryTime: number;
}

export interface BranchFinancials {
  totalCommissionPaid: number;
  branchProfitMargin: number;
  outstandingReceivables: number;
  collectionEfficiency: number;
  operatingCosts: number;
}

export interface BranchTeamDynamics {
  agentCount: number;
  agentTurnoverRate: number;
  topPerformer: { id: string; name: string; revenue: number };
  bottomPerformer: { id: string; name: string; revenue: number };
  averageTenure: number;
}

export interface BranchTargets {
  revenueTarget: number;
  targetAchievementRate: number;
  newCustomerTarget: number;
  collectionRateTarget: number;
  retentionTarget: number;
}

export interface BranchAnalytics {
  branchId: string;
  branchName: string;
  location: string;
  managerName: string;
  
  salesPerformance: BranchSalesPerformance;
  efficiency: BranchEfficiency;
  financials: BranchFinancials;
  teamDynamics: BranchTeamDynamics;
  targets: BranchTargets;
  
  // Rankings
  rankByRevenue: number;
  rankByAOV: number;
  rankByCustomerBase: number;
  rankByProfitMargin: number;
  rankByCollectionRate: number;
}

// Filter and view options
export type AgentMetricCategory = 
  | 'sales'
  | 'customers'
  | 'financial'
  | 'operational'
  | 'products'
  | 'targets'
  | 'trends'
  | 'incentives';

export type TimePeriod = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'lifetime';

export type SortField = 
  | 'revenue'
  | 'orders'
  | 'aov'
  | 'conversion'
  | 'retention'
  | 'customers'
  | 'commission';
