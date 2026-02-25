import { Branch } from '../types';
import {
  TopProduct,
  TopHardwareStore,
  AgentPerformance,
  BranchPerformance,
} from '../types/executive';

// ============================================
// TOP PRODUCTS BY BRANCH
// ============================================

const TOP_PRODUCTS_BRANCH_A: TopProduct[] = [
  { id: 'tp-a-1', name: 'PVC Pipe 2" Class 150', unitsSold: 6500, revenue: 780000, trendUp: true, grossMargin: 28 },
  { id: 'tp-a-2', name: 'PVC Pipe 4" Class 150', unitsSold: 4200, revenue: 1470000, trendUp: true, grossMargin: 32 },
  { id: 'tp-a-3', name: 'Solvent Cement 100ml', unitsSold: 8000, revenue: 360000, trendUp: false, grossMargin: 45 },
  { id: 'tp-a-4', name: 'Garden Hose 1/2" 10m', unitsSold: 2200, revenue: 550000, trendUp: true, grossMargin: 38 },
  { id: 'tp-a-5', name: 'PVC Elbow 2" 90°', unitsSold: 5500, revenue: 385000, trendUp: true, grossMargin: 35 },
];

const TOP_PRODUCTS_BRANCH_B: TopProduct[] = [
  { id: 'tp-b-1', name: 'PVC Pipe 4" Class 150', unitsSold: 3200, revenue: 1120000, trendUp: true, grossMargin: 30 },
  { id: 'tp-b-2', name: 'PVC Pipe 2" Class 150', unitsSold: 4500, revenue: 540000, trendUp: false, grossMargin: 27 },
  { id: 'tp-b-3', name: 'PVC Tee 4"', unitsSold: 3800, revenue: 665000, trendUp: true, grossMargin: 33 },
  { id: 'tp-b-4', name: 'Garden Hose 1/2" 10m', unitsSold: 1800, revenue: 450000, trendUp: true, grossMargin: 37 },
  { id: 'tp-b-5', name: 'Solvent Cement 100ml', unitsSold: 5500, revenue: 247500, trendUp: true, grossMargin: 44 },
];

const TOP_PRODUCTS_BRANCH_C: TopProduct[] = [
  { id: 'tp-c-1', name: 'PVC Pipe 3" Class 150', unitsSold: 2800, revenue: 840000, trendUp: true, grossMargin: 31 },
  { id: 'tp-c-2', name: 'PVC Pipe 2" Class 150', unitsSold: 1800, revenue: 216000, trendUp: true, grossMargin: 29 },
  { id: 'tp-c-3', name: 'Solvent Cement 100ml', unitsSold: 1500, revenue: 67500, trendUp: false, grossMargin: 43 },
  { id: 'tp-c-4', name: 'PVC Elbow 3" 90°', unitsSold: 2100, revenue: 189000, trendUp: true, grossMargin: 34 },
  { id: 'tp-c-5', name: 'Garden Hose 1/2" 10m', unitsSold: 500, revenue: 125000, trendUp: false, grossMargin: 36 },
];

const TOP_PRODUCTS_ALL: TopProduct[] = [
  { id: 'tp-all-1', name: 'PVC Pipe 2" Class 150', unitsSold: 12800, revenue: 1536000, trendUp: true, grossMargin: 28 },
  { id: 'tp-all-2', name: 'PVC Pipe 4" Class 150', unitsSold: 7400, revenue: 2590000, trendUp: true, grossMargin: 31 },
  { id: 'tp-all-3', name: 'Solvent Cement 100ml', unitsSold: 15000, revenue: 675000, trendUp: false, grossMargin: 44 },
  { id: 'tp-all-4', name: 'Garden Hose 1/2" 10m', unitsSold: 4500, revenue: 1125000, trendUp: true, grossMargin: 37 },
  { id: 'tp-all-5', name: 'PVC Tee 4"', unitsSold: 3800, revenue: 665000, trendUp: true, grossMargin: 33 },
];

export const getTopProductsByBranch = (branch: Branch): TopProduct[] => {
  switch (branch) {
    case 'Branch A':
      return TOP_PRODUCTS_BRANCH_A;
    case 'Branch B':
      return TOP_PRODUCTS_BRANCH_B;
    case 'Branch C':
      return TOP_PRODUCTS_BRANCH_C;
    case 'All':
    default:
      return TOP_PRODUCTS_ALL;
  }
};

// ============================================
// TOP HARDWARE STORES BY BRANCH
// ============================================

const TOP_STORES_BRANCH_A: TopHardwareStore[] = [
  { id: 'ts-a-1', name: 'Mega Hardware Center', revenue: 2200000, paymentBehavior: 'Good', trendUp: true, previousRevenue: 1950000 },
  { id: 'ts-a-2', name: 'City Builders', revenue: 1850000, paymentBehavior: 'Good', trendUp: true, previousRevenue: 1650000 },
  { id: 'ts-a-3', name: 'Pro Construction Supply', revenue: 1200000, paymentBehavior: 'Watchlist', trendUp: false, previousRevenue: 1350000 },
  { id: 'ts-a-4', name: 'Quality Building Materials', revenue: 980000, paymentBehavior: 'Good', trendUp: true, previousRevenue: 850000 },
  { id: 'ts-a-5', name: 'Metro Hardware Hub', revenue: 750000, paymentBehavior: 'Risk', trendUp: false, previousRevenue: 920000 },
];

const TOP_STORES_BRANCH_B: TopHardwareStore[] = [
  { id: 'ts-b-1', name: 'BuildRight Supplies', revenue: 1450000, paymentBehavior: 'Watchlist', trendUp: false, previousRevenue: 1620000 },
  { id: 'ts-b-2', name: 'Northern Construction', revenue: 1280000, paymentBehavior: 'Risk', trendUp: true, previousRevenue: 1100000 },
  { id: 'ts-b-3', name: 'Visayas Hardware Central', revenue: 880000, paymentBehavior: 'Good', trendUp: true, previousRevenue: 760000 },
  { id: 'ts-b-4', name: 'Island Builders Supply', revenue: 650000, paymentBehavior: 'Good', trendUp: false, previousRevenue: 720000 },
  { id: 'ts-b-5', name: 'Coastal Construction Materials', revenue: 520000, paymentBehavior: 'Watchlist', trendUp: true, previousRevenue: 450000 },
];

const TOP_STORES_BRANCH_C: TopHardwareStore[] = [
  { id: 'ts-c-1', name: 'Mindanao Builders Hub', revenue: 950000, paymentBehavior: 'Good', trendUp: true, previousRevenue: 820000 },
  { id: 'ts-c-2', name: 'Southern Construction Supply', revenue: 720000, paymentBehavior: 'Good', trendUp: true, previousRevenue: 650000 },
  { id: 'ts-c-3', name: 'Home Fix Depot', revenue: 580000, paymentBehavior: 'Risk', trendUp: false, previousRevenue: 680000 },
  { id: 'ts-c-4', name: 'Davao Hardware Store', revenue: 420000, paymentBehavior: 'Good', trendUp: false, previousRevenue: 450000 },
  { id: 'ts-c-5', name: 'Southern Builders Depot', revenue: 330000, paymentBehavior: 'Watchlist', trendUp: true, previousRevenue: 280000 },
];

const TOP_STORES_ALL: TopHardwareStore[] = [
  { id: 'ts-all-1', name: 'Mega Hardware Center', revenue: 2200000, paymentBehavior: 'Good', trendUp: true, previousRevenue: 1950000 },
  { id: 'ts-all-2', name: 'City Builders', revenue: 1850000, paymentBehavior: 'Good', trendUp: true, previousRevenue: 1650000 },
  { id: 'ts-all-3', name: 'BuildRight Supplies', revenue: 1450000, paymentBehavior: 'Watchlist', trendUp: false, previousRevenue: 1620000 },
  { id: 'ts-all-4', name: 'Northern Construction', revenue: 1280000, paymentBehavior: 'Risk', trendUp: true, previousRevenue: 1100000 },
  { id: 'ts-all-5', name: 'Pro Construction Supply', revenue: 1200000, paymentBehavior: 'Watchlist', trendUp: false, previousRevenue: 1350000 },
];

export const getTopStoresByBranch = (branch: Branch): TopHardwareStore[] => {
  switch (branch) {
    case 'Branch A':
      return TOP_STORES_BRANCH_A;
    case 'Branch B':
      return TOP_STORES_BRANCH_B;
    case 'Branch C':
      return TOP_STORES_BRANCH_C;
    case 'All':
    default:
      return TOP_STORES_ALL;
  }
};

// ============================================
// AGENT PERFORMANCE BY BRANCH
// ============================================

const AGENT_PERFORMANCE_BRANCH_A: AgentPerformance[] = [
  { id: 'ap-a-1', name: 'Juan Dela Cruz', sales: 2800000, quota: 2500000, collections: 2600000, activeAccounts: 18, underperformingStreak: 0 },
  { id: 'ap-a-2', name: 'Pedro Reyes', sales: 3200000, quota: 3000000, collections: 2950000, activeAccounts: 22, underperformingStreak: 0 },
  { id: 'ap-a-3', name: 'Rosa Martinez', sales: 1850000, quota: 2000000, collections: 1720000, activeAccounts: 14, underperformingStreak: 2 },
];

const AGENT_PERFORMANCE_BRANCH_B: AgentPerformance[] = [
  { id: 'ap-b-1', name: 'Maria Santos', sales: 2300000, quota: 2500000, collections: 2100000, activeAccounts: 16, underperformingStreak: 1 },
  { id: 'ap-b-2', name: 'Lisa Garcia', sales: 1900000, quota: 2000000, collections: 1800000, activeAccounts: 12, underperformingStreak: 0 },
];

const AGENT_PERFORMANCE_BRANCH_C: AgentPerformance[] = [
  { id: 'ap-c-1', name: 'Ramon Cruz', sales: 1650000, quota: 1500000, collections: 1580000, activeAccounts: 10, underperformingStreak: 0 },
  { id: 'ap-c-2', name: 'Teresa Lopez', sales: 1150000, quota: 1000000, collections: 1080000, activeAccounts: 8, underperformingStreak: 0 },
];

const AGENT_PERFORMANCE_ALL: AgentPerformance[] = [
  ...AGENT_PERFORMANCE_BRANCH_A,
  ...AGENT_PERFORMANCE_BRANCH_B,
  ...AGENT_PERFORMANCE_BRANCH_C,
];

export const getAgentPerformanceByBranch = (branch: Branch): AgentPerformance[] => {
  switch (branch) {
    case 'Branch A':
      return AGENT_PERFORMANCE_BRANCH_A;
    case 'Branch B':
      return AGENT_PERFORMANCE_BRANCH_B;
    case 'Branch C':
      return AGENT_PERFORMANCE_BRANCH_C;
    case 'All':
    default:
      return AGENT_PERFORMANCE_ALL;
  }
};

// ============================================
// BRANCH PERFORMANCE (Always show all branches)
// ============================================

export const BRANCH_PERFORMANCE: BranchPerformance[] = [
  { id: 'bp-1', branch: 'Branch A', sales: 6500000, quota: 6000000, stockouts: 2, onTimeDelivery: 96, overdueReceivables: 250000 },
  { id: 'bp-2', branch: 'Branch B', sales: 4200000, quota: 4500000, stockouts: 5, onTimeDelivery: 91, overdueReceivables: 450000 },
  { id: 'bp-3', branch: 'Branch C', sales: 2800000, quota: 2500000, stockouts: 1, onTimeDelivery: 98, overdueReceivables: 150000 },
];
