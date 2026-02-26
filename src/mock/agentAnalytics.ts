import { AgentAnalytics, BranchAnalytics } from '../types/agentAnalytics';

// Mock Agent Analytics Data
export const mockAgentAnalytics: AgentAnalytics[] = [
  {
    agentId: 'AGT-001',
    agentName: 'Maria Santos',
    branchId: 'BR-001',
    branchName: 'Quezon City',
    joinDate: '2023-03-15',
    tenure: 35,
    status: 'active',
    
    salesPerformance: {
      totalRevenue: 8450000,
      totalRevenueLifetime: 28500000,
      totalRevenueMonthly: 2800000,
      totalRevenueQuarterly: 8450000,
      totalRevenueYearly: 32000000,
      numberOfOrders: 156,
      averageOrderValue: 54167,
      sellRate: 68.5,
      salesGrowthRate: 15.2,
      revenuePerCustomer: 180000,
      upsellRate: 34.5,
      quoteToOrderRatio: 72.3,
    },
    
    customerMetrics: {
      activeCustomers: 47,
      newCustomersAcquired: 12,
      customerRetentionRate: 89.4,
      customerChurnRate: 10.6,
      averageCustomerLifetimeValue: 606000,
      customerSatisfactionScore: 4.7,
      numberOfVisitsCalls: 234,
    },
    
    financialMetrics: {
      commissionEarned: 285000,
      averageProfitMargin: 22.5,
      discountRateGiven: 8.2,
      paymentCollectionRate: 94.3,
      outstandingReceivables: 485000,
      badDebtRate: 1.2,
    },
    
    operationalMetrics: {
      orderFulfillmentTime: 3.2,
      orderAccuracyRate: 97.4,
      responseTime: 1.8,
      territoryCoverage: 'Quezon City North, Novaliches Area',
      visitFrequency: 2.3,
      quotationVolume: 216,
      orderCycleTime: 5.6,
    },
    
    productInsights: {
      bestSellingProduct: 'PVC Pipe 4" Schedule 40',
      highestMarginProduct: 'Specialized Conduit Tubes',
      productCategoryMix: [
        { category: 'PVC Pipes', percentage: 35 },
        { category: 'Plastic Tubes', percentage: 28 },
        { category: 'Conduit Pipes', percentage: 20 },
        { category: 'Fittings & Connectors', percentage: 12 },
        { category: 'Others', percentage: 5 },
      ],
      newProductAdoptionRate: 78.5,
      slowMovingProducts: ['Large Diameter Tubes', 'Premium PVC Variants'],
    },
    
    targets: {
      monthlySalesTarget: 2500000,
      quarterlySalesTarget: 7500000,
      targetAchievementRate: 112.7,
      daysAheadBehindTarget: 8,
      revenueGap: -317500,
      stretchGoalStatus: 'Gold Tier - 110% Achievement',
    },
    
    trends: {
      revenueTrend: [
        { month: 'Aug 2025', revenue: 2100000 },
        { month: 'Sep 2025', revenue: 2350000 },
        { month: 'Oct 2025', revenue: 2600000 },
        { month: 'Nov 2025', revenue: 2450000 },
        { month: 'Dec 2025', revenue: 2900000 },
        { month: 'Jan 2026', revenue: 2700000 },
        { month: 'Feb 2026', revenue: 2800000 },
      ],
      orderVolumeTrend: [
        { month: 'Aug 2025', orders: 42 },
        { month: 'Sep 2025', orders: 48 },
        { month: 'Oct 2025', orders: 51 },
        { month: 'Nov 2025', orders: 46 },
        { month: 'Dec 2025', orders: 58 },
        { month: 'Jan 2026', orders: 52 },
        { month: 'Feb 2026', orders: 56 },
      ],
      seasonalPerformance: [
        { month: 'Q1', performance: 95 },
        { month: 'Q2', performance: 110 },
        { month: 'Q3', performance: 88 },
        { month: 'Q4', performance: 125 },
      ],
      peakSalesPeriod: 'Q4 (October-December)',
      yearOverYearGrowth: 24.5,
      quarterOverQuarterGrowth: 18.2,
      monthOverMonthGrowth: 3.7,
    },
    
    incentives: {
      streakDays: 23,
      milestonesAchieved: ['100 Orders', '₱25M Lifetime Revenue', '50 Customers'],
      awardsWon: ['Agent of the Month - Jan 2026', 'Top Performer Q4 2025'],
      badges: ['Gold Seller', 'Customer Champion', 'Growth Leader'],
      bonusTier: 'Platinum - 15% Commission',
    },
    
    ranking: {
      rankByRevenue: 1,
      rankByOrders: 2,
      rankByCustomerAcquisition: 3,
      rankByConversionRate: 1,
      rankByRetention: 1,
      consistencyScore: 94,
    },
  },
  
  {
    agentId: 'AGT-002',
    agentName: 'Carlos Reyes',
    branchId: 'BR-001',
    branchName: 'Quezon City',
    joinDate: '2022-08-20',
    tenure: 42,
    status: 'active',
    
    salesPerformance: {
      totalRevenue: 6850000,
      totalRevenueLifetime: 35200000,
      totalRevenueMonthly: 2280000,
      totalRevenueQuarterly: 6850000,
      totalRevenueYearly: 27400000,
      numberOfOrders: 168,
      averageOrderValue: 40774,
      sellRate: 62.3,
      salesGrowthRate: 8.7,
      revenuePerCustomer: 145000,
      upsellRate: 28.4,
      quoteToOrderRatio: 65.8,
    },
    
    customerMetrics: {
      activeCustomers: 52,
      newCustomersAcquired: 8,
      customerRetentionRate: 92.1,
      customerChurnRate: 7.9,
      averageCustomerLifetimeValue: 677000,
      customerSatisfactionScore: 4.5,
      numberOfVisitsCalls: 287,
    },
    
    financialMetrics: {
      commissionEarned: 352000,
      averageProfitMargin: 19.8,
      discountRateGiven: 10.5,
      paymentCollectionRate: 91.7,
      outstandingReceivables: 620000,
      badDebtRate: 2.1,
    },
    
    operationalMetrics: {
      orderFulfillmentTime: 3.8,
      orderAccuracyRate: 95.8,
      responseTime: 2.4,
      territoryCoverage: 'Quezon City South, Commonwealth',
      visitFrequency: 2.8,
      quotationVolume: 255,
      orderCycleTime: 6.2,
    },
    
    productInsights: {
      bestSellingProduct: 'Electrical PVC Conduit 3/4"',
      highestMarginProduct: 'Heavy-Duty Plastic Tubes',
      productCategoryMix: [
        { category: 'Electrical Conduit', percentage: 42 },
        { category: 'PVC Pipes', percentage: 25 },
        { category: 'Plastic Tubes', percentage: 18 },
        { category: 'Flexible Hoses', percentage: 10 },
        { category: 'Others', percentage: 5 },
      ],
      newProductAdoptionRate: 65.2,
      slowMovingProducts: ['Specialty Tubes', 'Imported PVC Grades'],
    },
    
    targets: {
      monthlySalesTarget: 2200000,
      quarterlySalesTarget: 6600000,
      targetAchievementRate: 103.8,
      daysAheadBehindTarget: 3,
      revenueGap: -83600,
      stretchGoalStatus: 'Silver Tier - 100-110% Achievement',
    },
    
    trends: {
      revenueTrend: [
        { month: 'Aug 2025', revenue: 2050000 },
        { month: 'Sep 2025', revenue: 2100000 },
        { month: 'Oct 2025', revenue: 2200000 },
        { month: 'Nov 2025', revenue: 2150000 },
        { month: 'Dec 2025', revenue: 2500000 },
        { month: 'Jan 2026', revenue: 2200000 },
        { month: 'Feb 2026', revenue: 2280000 },
      ],
      orderVolumeTrend: [
        { month: 'Aug 2025', orders: 48 },
        { month: 'Sep 2025', orders: 52 },
        { month: 'Oct 2025', orders: 54 },
        { month: 'Nov 2025', orders: 51 },
        { month: 'Dec 2025', orders: 62 },
        { month: 'Jan 2026', orders: 55 },
        { month: 'Feb 2026', orders: 58 },
      ],
      seasonalPerformance: [
        { month: 'Q1', performance: 98 },
        { month: 'Q2', performance: 105 },
        { month: 'Q3', performance: 92 },
        { month: 'Q4', performance: 118 },
      ],
      peakSalesPeriod: 'Q4 (October-December)',
      yearOverYearGrowth: 18.3,
      quarterOverQuarterGrowth: 12.5,
      monthOverMonthGrowth: 3.6,
    },
    
    incentives: {
      streakDays: 31,
      milestonesAchieved: ['150 Orders', '₱35M Lifetime Revenue', '50 Customers', '3 Years Service'],
      awardsWon: ['Veteran Agent 2025', 'Customer Loyalty Award'],
      badges: ['Silver Seller', 'Loyalty Champion', 'Veteran', 'Steady Performer'],
      bonusTier: 'Gold - 12% Commission',
    },
    
    ranking: {
      rankByRevenue: 2,
      rankByOrders: 1,
      rankByCustomerAcquisition: 8,
      rankByConversionRate: 4,
      rankByRetention: 2,
      consistencyScore: 91,
    },
  },
  
  {
    agentId: 'AGT-003',
    agentName: 'Juan dela Cruz',
    branchId: 'BR-002',
    branchName: 'Makati',
    joinDate: '2024-01-10',
    tenure: 13,
    status: 'active',
    
    salesPerformance: {
      totalRevenue: 4250000,
      totalRevenueLifetime: 9800000,
      totalRevenueMonthly: 1420000,
      totalRevenueQuarterly: 4250000,
      totalRevenueYearly: 16800000,
      numberOfOrders: 89,
      averageOrderValue: 47753,
      sellRate: 58.9,
      salesGrowthRate: 22.4,
      revenuePerCustomer: 152000,
      upsellRate: 31.2,
      quoteToOrderRatio: 61.5,
    },
    
    customerMetrics: {
      activeCustomers: 28,
      newCustomersAcquired: 15,
      customerRetentionRate: 82.1,
      customerChurnRate: 17.9,
      averageCustomerLifetimeValue: 350000,
      customerSatisfactionScore: 4.6,
      numberOfVisitsCalls: 156,
    },
    
    financialMetrics: {
      commissionEarned: 98000,
      averageProfitMargin: 21.2,
      discountRateGiven: 9.8,
      paymentCollectionRate: 88.5,
      outstandingReceivables: 380000,
      badDebtRate: 1.8,
    },
    
    operationalMetrics: {
      orderFulfillmentTime: 4.1,
      orderAccuracyRate: 94.2,
      responseTime: 2.9,
      territoryCoverage: 'Makati CBD, BGC',
      visitFrequency: 2.1,
      quotationVolume: 145,
      orderCycleTime: 7.3,
    },
    
    productInsights: {
      bestSellingProduct: 'PVC Plumbing Pipes 2"',
      highestMarginProduct: 'Reinforced Plastic Tubes',
      productCategoryMix: [
        { category: 'Plumbing Pipes', percentage: 38 },
        { category: 'PVC Pipes', percentage: 22 },
        { category: 'Plastic Tubes', percentage: 20 },
        { category: 'Pipe Accessories', percentage: 15 },
        { category: 'Others', percentage: 5 },
      ],
      newProductAdoptionRate: 82.3,
      slowMovingProducts: ['Basic Tubing', 'Standard Grade PVC'],
    },
    
    targets: {
      monthlySalesTarget: 1500000,
      quarterlySalesTarget: 4500000,
      targetAchievementRate: 94.4,
      daysAheadBehindTarget: -4,
      revenueGap: 251667,
      stretchGoalStatus: 'Bronze Tier - 90-100% Achievement',
    },
    
    trends: {
      revenueTrend: [
        { month: 'Aug 2025', revenue: 980000 },
        { month: 'Sep 2025', revenue: 1100000 },
        { month: 'Oct 2025', revenue: 1280000 },
        { month: 'Nov 2025', revenue: 1350000 },
        { month: 'Dec 2025', revenue: 1620000 },
        { month: 'Jan 2026', revenue: 1380000 },
        { month: 'Feb 2026', revenue: 1420000 },
      ],
      orderVolumeTrend: [
        { month: 'Aug 2025', orders: 22 },
        { month: 'Sep 2025', orders: 25 },
        { month: 'Oct 2025', orders: 28 },
        { month: 'Nov 2025', orders: 30 },
        { month: 'Dec 2025', orders: 36 },
        { month: 'Jan 2026', orders: 31 },
        { month: 'Feb 2026', orders: 32 },
      ],
      seasonalPerformance: [
        { month: 'Q1', performance: 85 },
        { month: 'Q2', performance: 98 },
        { month: 'Q3', performance: 102 },
        { month: 'Q4', performance: 115 },
      ],
      peakSalesPeriod: 'Q4 (October-December)',
      yearOverYearGrowth: 45.8,
      quarterOverQuarterGrowth: 28.3,
      monthOverMonthGrowth: 2.9,
    },
    
    incentives: {
      streakDays: 12,
      milestonesAchieved: ['50 Orders', '₱10M Lifetime Revenue', '25 Customers'],
      awardsWon: ['Rising Star Q1 2026', 'Best Newcomer 2024'],
      badges: ['Bronze Seller', 'Rising Star', 'Fast Learner'],
      bonusTier: 'Silver - 10% Commission',
    },
    
    ranking: {
      rankByRevenue: 5,
      rankByOrders: 7,
      rankByCustomerAcquisition: 1,
      rankByConversionRate: 7,
      rankByRetention: 9,
      consistencyScore: 78,
    },
  },
  
  {
    agentId: 'AGT-004',
    agentName: 'Ana Gonzales',
    branchId: 'BR-002',
    branchName: 'Makati',
    joinDate: '2023-06-01',
    tenure: 32,
    status: 'active',
    
    salesPerformance: {
      totalRevenue: 5680000,
      totalRevenueLifetime: 19500000,
      totalRevenueMonthly: 1890000,
      totalRevenueQuarterly: 5680000,
      totalRevenueYearly: 22700000,
      numberOfOrders: 124,
      averageOrderValue: 45806,
      sellRate: 64.7,
      salesGrowthRate: 11.3,
      revenuePerCustomer: 162000,
      upsellRate: 29.8,
      quoteToOrderRatio: 68.2,
    },
    
    customerMetrics: {
      activeCustomers: 35,
      newCustomersAcquired: 9,
      customerRetentionRate: 85.7,
      customerChurnRate: 14.3,
      averageCustomerLifetimeValue: 557000,
      customerSatisfactionScore: 4.8,
      numberOfVisitsCalls: 198,
    },
    
    financialMetrics: {
      commissionEarned: 195000,
      averageProfitMargin: 23.1,
      discountRateGiven: 7.5,
      paymentCollectionRate: 96.2,
      outstandingReceivables: 290000,
      badDebtRate: 0.9,
    },
    
    operationalMetrics: {
      orderFulfillmentTime: 2.9,
      orderAccuracyRate: 98.1,
      responseTime: 1.5,
      territoryCoverage: 'Makati, Taguig, Pasay',
      visitFrequency: 2.6,
      quotationVolume: 182,
      orderCycleTime: 5.1,
    },
    
    productInsights: {
      bestSellingProduct: 'PVC Drainage Pipes 4"',
      highestMarginProduct: 'Premium Plastic Conduits',
      productCategoryMix: [
        { category: 'PVC Pipes', percentage: 32 },
        { category: 'Drainage Tubes', percentage: 28 },
        { category: 'Plastic Tubes', percentage: 20 },
        { category: 'Conduit Systems', percentage: 15 },
        { category: 'Others', percentage: 5 },
      ],
      newProductAdoptionRate: 88.7,
      slowMovingProducts: ['Economy Grade Tubes'],
    },
    
    targets: {
      monthlySalesTarget: 1800000,
      quarterlySalesTarget: 5400000,
      targetAchievementRate: 105.2,
      daysAheadBehindTarget: 4,
      revenueGap: -93333,
      stretchGoalStatus: 'Silver Tier - 100-110% Achievement',
    },
    
    trends: {
      revenueTrend: [
        { month: 'Aug 2025', revenue: 1650000 },
        { month: 'Sep 2025', revenue: 1720000 },
        { month: 'Oct 2025', revenue: 1850000 },
        { month: 'Nov 2025', revenue: 1780000 },
        { month: 'Dec 2025', revenue: 2050000 },
        { month: 'Jan 2026', revenue: 1850000 },
        { month: 'Feb 2026', revenue: 1890000 },
      ],
      orderVolumeTrend: [
        { month: 'Aug 2025', orders: 36 },
        { month: 'Sep 2025', orders: 38 },
        { month: 'Oct 2025', orders: 42 },
        { month: 'Nov 2025', orders: 39 },
        { month: 'Dec 2025', orders: 46 },
        { month: 'Jan 2026', orders: 41 },
        { month: 'Feb 2026', orders: 43 },
      ],
      seasonalPerformance: [
        { month: 'Q1', performance: 102 },
        { month: 'Q2', performance: 108 },
        { month: 'Q3', performance: 95 },
        { month: 'Q4', performance: 112 },
      ],
      peakSalesPeriod: 'Q2 & Q4',
      yearOverYearGrowth: 21.6,
      quarterOverQuarterGrowth: 14.8,
      monthOverMonthGrowth: 2.2,
    },
    
    incentives: {
      streakDays: 28,
      milestonesAchieved: ['100 Orders', '₱20M Lifetime Revenue', '35 Customers', 'Top Customer Satisfaction'],
      awardsWon: ['Customer Service Excellence 2025', 'Quality Champion Q3 2025'],
      badges: ['Gold Seller', 'Quality Leader', 'Customer Delight', 'Precision Pro'],
      bonusTier: 'Gold - 12% Commission',
    },
    
    ranking: {
      rankByRevenue: 3,
      rankByOrders: 4,
      rankByCustomerAcquisition: 6,
      rankByConversionRate: 3,
      rankByRetention: 5,
      consistencyScore: 88,
    },
  },
  
  {
    agentId: 'AGT-005',
    agentName: 'Roberto Cruz',
    branchId: 'BR-003',
    branchName: 'Cebu',
    joinDate: '2024-09-15',
    tenure: 5,
    status: 'active',
    
    salesPerformance: {
      totalRevenue: 2180000,
      totalRevenueLifetime: 3200000,
      totalRevenueMonthly: 1090000,
      totalRevenueQuarterly: 2180000,
      totalRevenueYearly: 8700000,
      numberOfOrders: 52,
      averageOrderValue: 41923,
      sellRate: 52.3,
      salesGrowthRate: 35.8,
      revenuePerCustomer: 145000,
      upsellRate: 24.1,
      quoteToOrderRatio: 54.7,
    },
    
    customerMetrics: {
      activeCustomers: 15,
      newCustomersAcquired: 12,
      customerRetentionRate: 73.3,
      customerChurnRate: 26.7,
      averageCustomerLifetimeValue: 213000,
      customerSatisfactionScore: 4.3,
      numberOfVisitsCalls: 98,
    },
    
    financialMetrics: {
      commissionEarned: 32000,
      averageProfitMargin: 18.5,
      discountRateGiven: 12.3,
      paymentCollectionRate: 85.2,
      outstandingReceivables: 420000,
      badDebtRate: 3.2,
    },
    
    operationalMetrics: {
      orderFulfillmentTime: 4.8,
      orderAccuracyRate: 92.3,
      responseTime: 3.5,
      territoryCoverage: 'Cebu City, Mandaue',
      visitFrequency: 1.8,
      quotationVolume: 95,
      orderCycleTime: 8.5,
    },
    
    productInsights: {
      bestSellingProduct: 'Standard PVC Pipe 3"',
      highestMarginProduct: 'Industrial Plastic Tubes',
      productCategoryMix: [
        { category: 'PVC Pipes', percentage: 45 },
        { category: 'Plastic Tubes', percentage: 25 },
        { category: 'Flexible Conduit', percentage: 15 },
        { category: 'Pipe Fittings', percentage: 10 },
        { category: 'Others', percentage: 5 },
      ],
      newProductAdoptionRate: 58.3,
      slowMovingProducts: ['Premium PVC Products', 'Specialty Tubes'],
    },
    
    targets: {
      monthlySalesTarget: 1200000,
      quarterlySalesTarget: 3600000,
      targetAchievementRate: 60.6,
      daysAheadBehindTarget: -15,
      revenueGap: 1418333,
      stretchGoalStatus: 'Development - Below 90%',
    },
    
    trends: {
      revenueTrend: [
        { month: 'Oct 2025', revenue: 450000 },
        { month: 'Nov 2025', revenue: 570000 },
        { month: 'Dec 2025', revenue: 680000 },
        { month: 'Jan 2026', revenue: 1000000 },
        { month: 'Feb 2026', revenue: 1090000 },
      ],
      orderVolumeTrend: [
        { month: 'Oct 2025', orders: 12 },
        { month: 'Nov 2025', orders: 15 },
        { month: 'Dec 2025', orders: 18 },
        { month: 'Jan 2026', orders: 24 },
        { month: 'Feb 2026', orders: 28 },
      ],
      seasonalPerformance: [
        { month: 'Q4 2025', performance: 65 },
        { month: 'Q1 2026', performance: 82 },
      ],
      peakSalesPeriod: 'Too early to determine',
      yearOverYearGrowth: 0,
      quarterOverQuarterGrowth: 26.2,
      monthOverMonthGrowth: 9.0,
    },
    
    incentives: {
      streakDays: 8,
      milestonesAchieved: ['First 50 Orders', 'First 10 Customers'],
      awardsWon: ['Rookie of the Month - Jan 2026'],
      badges: ['Newcomer', 'Fast Starter'],
      bonusTier: 'Bronze - 8% Commission',
    },
    
    ranking: {
      rankByRevenue: 10,
      rankByOrders: 11,
      rankByCustomerAcquisition: 2,
      rankByConversionRate: 11,
      rankByRetention: 12,
      consistencyScore: 65,
    },
  },
];

// Mock Branch Analytics Data
export const mockBranchAnalytics: BranchAnalytics[] = [
  {
    branchId: 'BR-001',
    branchName: 'Quezon City',
    location: 'Commonwealth Avenue, Quezon City',
    managerName: 'Patricia Valdez',
    
    salesPerformance: {
      totalRevenue: 18500000,
      totalOrders: 428,
      averageOrderValue: 43224,
      branchSellRate: 64.8,
      revenuePerAgent: 3083333,
      topProducts: [
        { product: 'PVC Pipe 4" Schedule 40', revenue: 4625000 },
        { product: 'Electrical PVC Conduit 3/4"', revenue: 3885000 },
        { product: 'Plastic Tubes (assorted)', revenue: 2960000 },
        { product: 'Specialized Conduit Tubes', revenue: 1850000 },
        { product: 'PVC Plumbing Pipes 2"', revenue: 1665000 },
      ],
      marketShare: 32.5,
    },
    
    efficiency: {
      inventoryTurnoverRate: 8.5,
      orderFulfillmentRate: 96.3,
      customerComplaints: 12,
      returnRate: 1.8,
      averageDeliveryTime: 3.4,
    },
    
    financials: {
      totalCommissionPaid: 740000,
      branchProfitMargin: 21.2,
      outstandingReceivables: 1295000,
      collectionEfficiency: 92.5,
      operatingCosts: 1850000,
    },
    
    teamDynamics: {
      agentCount: 6,
      agentTurnoverRate: 8.3,
      topPerformer: { id: 'AGT-001', name: 'Maria Santos', revenue: 8450000 },
      bottomPerformer: { id: 'AGT-006', name: 'Jose Garcia', revenue: 1850000 },
      averageTenure: 28,
    },
    
    targets: {
      revenueTarget: 18000000,
      targetAchievementRate: 102.8,
      newCustomerTarget: 25,
      collectionRateTarget: 95,
      retentionTarget: 85,
    },
    
    rankByRevenue: 1,
    rankByAOV: 2,
    rankByCustomerBase: 1,
    rankByProfitMargin: 2,
    rankByCollectionRate: 1,
  },
  
  {
    branchId: 'BR-002',
    branchName: 'Makati',
    location: 'Ayala Avenue, Makati City',
    managerName: 'Michael Tan',
    
    salesPerformance: {
      totalRevenue: 14200000,
      totalOrders: 312,
      averageOrderValue: 45513,
      branchSellRate: 61.2,
      revenuePerAgent: 2840000,
      topProducts: [
        { product: 'PVC Plumbing Pipes 2"', revenue: 3835000 },
        { product: 'PVC Drainage Pipes 4"', revenue: 3124000 },
        { product: 'Premium Plastic Conduits', revenue: 2556000 },
        { product: 'Reinforced Plastic Tubes', revenue: 2130000 },
        { product: 'Flexible PVC Hoses', revenue: 1278000 },
      ],
      marketShare: 28.3,
    },
    
    efficiency: {
      inventoryTurnoverRate: 7.8,
      orderFulfillmentRate: 94.8,
      customerComplaints: 18,
      returnRate: 2.3,
      averageDeliveryTime: 3.7,
    },
    
    financials: {
      totalCommissionPaid: 568000,
      branchProfitMargin: 22.8,
      outstandingReceivables: 1085000,
      collectionEfficiency: 90.8,
      operatingCosts: 1950000,
    },
    
    teamDynamics: {
      agentCount: 5,
      agentTurnoverRate: 12.5,
      topPerformer: { id: 'AGT-004', name: 'Ana Gonzales', revenue: 5680000 },
      bottomPerformer: { id: 'AGT-008', name: 'Luis Mercado', revenue: 1650000 },
      averageTenure: 22,
    },
    
    targets: {
      revenueTarget: 15000000,
      targetAchievementRate: 94.7,
      newCustomerTarget: 30,
      collectionRateTarget: 93,
      retentionTarget: 88,
    },
    
    rankByRevenue: 2,
    rankByAOV: 1,
    rankByCustomerBase: 2,
    rankByProfitMargin: 1,
    rankByCollectionRate: 2,
  },
  
  {
    branchId: 'BR-003',
    branchName: 'Cebu',
    location: 'Osmena Boulevard, Cebu City',
    managerName: 'Carmen Rodriguez',
    
    salesPerformance: {
      totalRevenue: 8900000,
      totalOrders: 215,
      averageOrderValue: 41395,
      branchSellRate: 56.7,
      revenuePerAgent: 2225000,
      topProducts: [
        { product: 'Standard PVC Pipe 3"', revenue: 2670000 },
        { product: 'Plastic Tubes (assorted)', revenue: 1869000 },
        { product: 'Electrical Conduit 3/4"', revenue: 1602000 },
        { product: 'Industrial Plastic Tubes', revenue: 1068000 },
        { product: 'PVC Pipe Fittings', revenue: 890000 },
      ],
      marketShare: 18.5,
    },
    
    efficiency: {
      inventoryTurnoverRate: 6.5,
      orderFulfillmentRate: 91.2,
      customerComplaints: 24,
      returnRate: 3.1,
      averageDeliveryTime: 4.5,
    },
    
    financials: {
      totalCommissionPaid: 356000,
      branchProfitMargin: 18.9,
      outstandingReceivables: 1520000,
      collectionEfficiency: 86.3,
      operatingCosts: 1450000,
    },
    
    teamDynamics: {
      agentCount: 4,
      agentTurnoverRate: 18.8,
      topPerformer: { id: 'AGT-009', name: 'Elena Santos', revenue: 3850000 },
      bottomPerformer: { id: 'AGT-005', name: 'Roberto Cruz', revenue: 2180000 },
      averageTenure: 15,
    },
    
    targets: {
      revenueTarget: 10000000,
      targetAchievementRate: 89.0,
      newCustomerTarget: 20,
      collectionRateTarget: 90,
      retentionTarget: 80,
    },
    
    rankByRevenue: 3,
    rankByAOV: 3,
    rankByCustomerBase: 3,
    rankByProfitMargin: 3,
    rankByCollectionRate: 3,
  },
];
