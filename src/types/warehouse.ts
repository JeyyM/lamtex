// Warehouse Manager Dashboard Types

export interface WarehouseKPI {
  id: string;
  label: string;
  value: string | number;
  subtitle?: string;
  status?: 'good' | 'warning' | 'danger';
  trend?: string;
  trendUp?: boolean;
  icon?: string;
  branch?: string;
}

export interface FinishedGoodStock {
  id: string;
  productName: string;
  sku: string;
  currentStock: number;
  reservedStock: number;
  availableStock: number;
  minLevel: number;
  avgDailyOutflow: number;
  productionQuota?: number;
  qaSuccessRate: number;
  daysOfCover: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  branch?: string;
  interBranchQty?: { [key: string]: number };
}

export interface RawMaterialStock {
  id: string;
  materialName: string;
  sku: string;
  currentQty: number;
  safetyLevel: number;
  unit: string;
  avgDailyUse: number;
  daysRemaining: number;
  productsAffected: string[];
  riskLevel: 'Low' | 'Medium' | 'High';
  branch?: string;
}

export interface OrderFulfillment {
  id: string;
  orderNumber: string;
  customer: string;
  truckAssigned?: string;
  weightUtilization?: number;
  requiredDate: string;
  productsSummary: string;
  stockStatus: 'Fully Available' | 'Partial' | 'Not Available';
  fulfillmentStatus: 'To Pick' | 'Picking' | 'Packing' | 'Ready' | 'Blocked';
  loadingDetails: {
    productName: string;
    qty: number;
    status: 'Pending' | 'Loading' | 'Partial' | 'Full' | 'Out of Stock' | 'Ready';
  }[];
  urgency?: 'High' | 'Medium' | 'Low';
  branch?: string;
}

export interface ProductionBatch {
  id: string;
  batchNumber: string;
  productName: string;
  plannedQty: number;
  actualQty?: number;
  qaStatus: 'Pending' | 'Testing' | 'Passed' | 'Failed' | 'Rework';
  scheduledDate: string;
  completedDate?: string;
  branch?: string;
  defectRate?: number;
}

export interface StockMovement {
  id: string;
  timestamp: string;
  itemName: string;
  type: 'In' | 'Out' | 'Transfer' | 'Adjust' | 'Production' | 'Damage';
  quantity: number;
  reference: string;
  fromLocation?: string;
  toLocation?: string;
  user: string;
  notes?: string;
  branch?: string;
}

export interface QualityIssue {
  id: string;
  itemName: string;
  batchNumber?: string;
  issueType: 'Rejected Batch' | 'Damaged Goods' | 'Re-inspection' | 'Customer Return';
  reason: string;
  qtyAffected: number;
  status: 'Open' | 'Investigating' | 'Resolved' | 'Escalated';
  reportedDate: string;
  assignedTo?: string;
  resolution?: string;
  branch?: string;
}

export interface MachineStatus {
  id: string;
  machineName: string;
  utilizationPercent: number;
  quotaCompletionPercent: number;
  nextMaintenance: string;
  errorRate: number;
  status: 'Running' | 'Idle' | 'Maintenance' | 'Error';
  branch?: string;
}

export interface WarehouseAlert {
  id: string;
  type: 'Low Stock' | 'Shortage Impact' | 'Material Delay' | 'Material Arrival' | 'QA Reject' | 'Transfer Request';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  title: string;
  message: string;
  itemName?: string;
  actionRequired?: boolean;
  timestamp: string;
  branch?: string;
}
