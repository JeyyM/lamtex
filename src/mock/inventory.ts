import { Branch } from '../types';
import {
  FinishedGoodsAlert,
  RawMaterialAlert,
} from '../types/executive';

// ============================================
// FINISHED GOODS ALERTS BY BRANCH
// ============================================

const FINISHED_GOODS_BRANCH_A: FinishedGoodsAlert[] = [
  { 
    id: 'fg-a-1', 
    productName: 'PVC Pipe 2" Class 150', 
    avgWeeklySales: 800, 
    forecastNext30Days: 3500, 
    stockoutInDays: 4, 
    riskLevel: 'High',
    branch: 'Branch A',
    currentStock: 3200
  },
  { 
    id: 'fg-a-2', 
    productName: 'Solvent Cement 100ml', 
    avgWeeklySales: 1200, 
    forecastNext30Days: 5000, 
    stockoutInDays: 12, 
    riskLevel: 'Medium',
    branch: 'Branch A',
    currentStock: 14400
  },
];

const FINISHED_GOODS_BRANCH_B: FinishedGoodsAlert[] = [
  { 
    id: 'fg-b-1', 
    productName: 'PVC Pipe 4" Class 150', 
    avgWeeklySales: 600, 
    forecastNext30Days: 2600, 
    stockoutInDays: 5, 
    riskLevel: 'High',
    branch: 'Branch B',
    currentStock: 3000
  },
  { 
    id: 'fg-b-2', 
    productName: 'Garden Hose 1/2" 10m', 
    avgWeeklySales: 300, 
    forecastNext30Days: 1300, 
    stockoutInDays: 8, 
    riskLevel: 'High',
    branch: 'Branch B',
    currentStock: 2400
  },
  { 
    id: 'fg-b-3', 
    productName: 'PVC Pipe 2" Class 150', 
    avgWeeklySales: 500, 
    forecastNext30Days: 2200, 
    stockoutInDays: 10, 
    riskLevel: 'Medium',
    branch: 'Branch B',
    currentStock: 5000
  },
  { 
    id: 'fg-b-4', 
    productName: 'PVC Elbow 2" 90°', 
    avgWeeklySales: 800, 
    forecastNext30Days: 3500, 
    stockoutInDays: 6, 
    riskLevel: 'High',
    branch: 'Branch B',
    currentStock: 4800
  },
  { 
    id: 'fg-b-5', 
    productName: 'PVC Tee 4"', 
    avgWeeklySales: 400, 
    forecastNext30Days: 1700, 
    stockoutInDays: 14, 
    riskLevel: 'Medium',
    branch: 'Branch B',
    currentStock: 5600
  },
];

const FINISHED_GOODS_BRANCH_C: FinishedGoodsAlert[] = [
  { 
    id: 'fg-c-1', 
    productName: 'PVC Pipe 3" Class 150', 
    avgWeeklySales: 200, 
    forecastNext30Days: 900, 
    stockoutInDays: 15, 
    riskLevel: 'Medium',
    branch: 'Branch C',
    currentStock: 3000
  },
];

const FINISHED_GOODS_ALL: FinishedGoodsAlert[] = [
  ...FINISHED_GOODS_BRANCH_A,
  ...FINISHED_GOODS_BRANCH_B,
  ...FINISHED_GOODS_BRANCH_C,
];

export const getFinishedGoodsAlertsByBranch = (branch: Branch): FinishedGoodsAlert[] => {
  switch (branch) {
    case 'Branch A':
      return FINISHED_GOODS_BRANCH_A;
    case 'Branch B':
      return FINISHED_GOODS_BRANCH_B;
    case 'Branch C':
      return FINISHED_GOODS_BRANCH_C;
    case 'All':
    default:
      return FINISHED_GOODS_ALL;
  }
};

// ============================================
// RAW MATERIAL ALERTS BY BRANCH
// ============================================

const RAW_MATERIALS_BRANCH_A: RawMaterialAlert[] = [
  { 
    id: 'rm-a-1', 
    materialName: 'PVC Resin SG-5', 
    currentQty: 2500, 
    unit: 'kg', 
    estimatedDaysRemaining: 5, 
    suggestedReorderQty: 10000, 
    suggestedReorderDate: '2026-02-25', 
    linkedProductsAffected: ['All PVC Pipes'], 
    riskLevel: 'High',
    branch: 'Branch A'
  },
];

const RAW_MATERIALS_BRANCH_B: RawMaterialAlert[] = [
  { 
    id: 'rm-b-1', 
    materialName: 'Calcium Carbonate', 
    currentQty: 800, 
    unit: 'kg', 
    estimatedDaysRemaining: 8, 
    suggestedReorderQty: 5000, 
    suggestedReorderDate: '2026-02-28', 
    linkedProductsAffected: ['All PVC Pipes'], 
    riskLevel: 'Medium',
    branch: 'Branch B'
  },
  { 
    id: 'rm-b-2', 
    materialName: 'Titanium Dioxide', 
    currentQty: 150, 
    unit: 'kg', 
    estimatedDaysRemaining: 12, 
    suggestedReorderQty: 1000, 
    suggestedReorderDate: '2026-03-05', 
    linkedProductsAffected: ['White PVC Pipes'], 
    riskLevel: 'Low',
    branch: 'Branch B'
  },
];

const RAW_MATERIALS_BRANCH_C: RawMaterialAlert[] = [];

const RAW_MATERIALS_ALL: RawMaterialAlert[] = [
  ...RAW_MATERIALS_BRANCH_A,
  ...RAW_MATERIALS_BRANCH_B,
  ...RAW_MATERIALS_BRANCH_C,
];

export const getRawMaterialAlertsByBranch = (branch: Branch): RawMaterialAlert[] => {
  switch (branch) {
    case 'Branch A':
      return RAW_MATERIALS_BRANCH_A;
    case 'Branch B':
      return RAW_MATERIALS_BRANCH_B;
    case 'Branch C':
      return RAW_MATERIALS_BRANCH_C;
    case 'All':
    default:
      return RAW_MATERIALS_ALL;
  }
};
