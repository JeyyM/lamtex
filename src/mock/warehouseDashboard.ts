// Warehouse Manager Dashboard Mock Data

import { 
  WarehouseKPI, 
  FinishedGoodStock, 
  RawMaterialStock, 
  OrderFulfillment, 
  ProductionBatch,
  StockMovement,
  QualityIssue,
  MachineStatus,
  WarehouseAlert
} from '@/src/types/warehouse';
import { Branch } from '@/src/types';

// ===== KPIs =====
const ALL_KPIS: WarehouseKPI[] = [
  { id: 'k1', label: 'Finished Goods On Hand', value: '12,450', subtitle: '5 below threshold', status: 'warning', branch: 'Branch A' },
  { id: 'k2', label: 'Raw Materials On Hand', value: '8 Critical', subtitle: '15 items OK', status: 'danger', branch: 'Branch A' },
  { id: 'k3', label: 'Low Stock Items', value: 12, subtitle: 'SKUs below minimum', status: 'warning', branch: 'Branch A' },
  { id: 'k4', label: 'Orders Waiting Stock', value: 8, status: 'danger', branch: 'Branch A' },
  { id: 'k5', label: 'Production Batches To Do', value: 6, branch: 'Branch A' },
  { id: 'k6', label: 'Incoming Materials', value: 4, subtitle: 'Today/Soon', status: 'good', branch: 'Branch A' },
  { id: 'k7', label: 'Stock Requests', value: 3, subtitle: 'Transfer requests', branch: 'Branch A' },

  { id: 'k8', label: 'Finished Goods On Hand', value: '9,820', subtitle: '3 below threshold', status: 'warning', branch: 'Branch B' },
  { id: 'k9', label: 'Raw Materials On Hand', value: '5 Critical', subtitle: '18 items OK', status: 'warning', branch: 'Branch B' },
  { id: 'k10', label: 'Low Stock Items', value: 8, subtitle: 'SKUs below minimum', status: 'warning', branch: 'Branch B' },
  { id: 'k11', label: 'Orders Waiting Stock', value: 5, status: 'warning', branch: 'Branch B' },
  { id: 'k12', label: 'Production Batches To Do', value: 4, branch: 'Branch B' },
  { id: 'k13', label: 'Incoming Materials', value: 3, subtitle: 'Today/Soon', status: 'good', branch: 'Branch B' },
  { id: 'k14', label: 'Stock Requests', value: 2, subtitle: 'Transfer requests', branch: 'Branch B' },

  { id: 'k15', label: 'Finished Goods On Hand', value: '7,650', subtitle: '2 below threshold', status: 'good', branch: 'Branch C' },
  { id: 'k16', label: 'Raw Materials On Hand', value: '3 Critical', subtitle: '20 items OK', status: 'warning', branch: 'Branch C' },
  { id: 'k17', label: 'Low Stock Items', value: 5, subtitle: 'SKUs below minimum', status: 'good', branch: 'Branch C' },
  { id: 'k18', label: 'Orders Waiting Stock', value: 3, status: 'good', branch: 'Branch C' },
  { id: 'k19', label: 'Production Batches To Do', value: 3, branch: 'Branch C' },
  { id: 'k20', label: 'Incoming Materials', value: 2, subtitle: 'Today/Soon', status: 'good', branch: 'Branch C' },
  { id: 'k21', label: 'Stock Requests', value: 1, subtitle: 'Transfer requests', branch: 'Branch C' },
];

export function getWarehouseKPIsByBranch(branch: Branch): WarehouseKPI[] {
  if (branch === 'All') {
    // Aggregate KPIs for "All" view
    return [
      { id: 'k-all-1', label: 'Total Finished Goods', value: '29,920', subtitle: '10 below threshold', status: 'warning' },
      { id: 'k-all-2', label: 'Critical Raw Materials', value: 16, subtitle: 'Across all branches', status: 'danger' },
      { id: 'k-all-3', label: 'Low Stock Items', value: 25, subtitle: 'SKUs below minimum', status: 'warning' },
      { id: 'k-all-4', label: 'Orders Waiting Stock', value: 16, status: 'warning' },
      { id: 'k-all-5', label: 'Production Batches', value: 13, subtitle: 'Pending across branches' },
      { id: 'k-all-6', label: 'Incoming Materials', value: 9, subtitle: 'All branches', status: 'good' },
      { id: 'k-all-7', label: 'Inter-Branch Requests', value: 6, subtitle: 'Transfer requests' },
    ];
  }
  return ALL_KPIS.filter(kpi => kpi.branch === branch);
}

// ===== Finished Goods Stock =====
const FINISHED_GOODS: FinishedGoodStock[] = [
  { id: 'fg1', productName: 'PVC Pipe 2" Class 150', sku: 'PVC-2-150', currentStock: 850, reservedStock: 320, availableStock: 530, minLevel: 600, avgDailyOutflow: 45, productionQuota: 200, qaSuccessRate: 98, daysOfCover: 11, riskLevel: 'Medium', branch: 'Branch A', interBranchQty: { 'Branch B': 420, 'Branch C': 280 } },
  { id: 'fg2', productName: 'Cement 40kg Portland', sku: 'CEM-40-PRT', currentStock: 1200, reservedStock: 450, availableStock: 750, minLevel: 800, avgDailyOutflow: 80, qaSuccessRate: 99, daysOfCover: 9, riskLevel: 'High', branch: 'Branch A', interBranchQty: { 'Branch B': 900, 'Branch C': 650 } },
  { id: 'fg3', productName: 'Rebar 10mm x 6m', sku: 'REB-10-6M', currentStock: 2400, reservedStock: 800, availableStock: 1600, minLevel: 1000, avgDailyOutflow: 120, qaSuccessRate: 97, daysOfCover: 13, riskLevel: 'Low', branch: 'Branch A', interBranchQty: { 'Branch B': 1800, 'Branch C': 1200 } },
  { id: 'fg4', productName: 'Plywood 4x8 Marine', sku: 'PLY-4X8-MAR', currentStock: 340, reservedStock: 180, availableStock: 160, minLevel: 200, avgDailyOutflow: 25, qaSuccessRate: 96, daysOfCover: 6, riskLevel: 'High', branch: 'Branch A', interBranchQty: { 'Branch B': 210, 'Branch C': 150 } },
  { id: 'fg5', productName: 'Paint White 4L', sku: 'PNT-WHT-4L', currentStock: 580, reservedStock: 120, availableStock: 460, minLevel: 300, avgDailyOutflow: 35, qaSuccessRate: 99, daysOfCover: 13, riskLevel: 'Low', branch: 'Branch A' },

  { id: 'fg6', productName: 'PVC Pipe 2" Class 150', sku: 'PVC-2-150', currentStock: 420, reservedStock: 180, availableStock: 240, minLevel: 400, avgDailyOutflow: 30, productionQuota: 150, qaSuccessRate: 97, daysOfCover: 8, riskLevel: 'High', branch: 'Branch B', interBranchQty: { 'Branch A': 850, 'Branch C': 280 } },
  { id: 'fg7', productName: 'Cement 40kg Portland', sku: 'CEM-40-PRT', currentStock: 900, reservedStock: 300, availableStock: 600, minLevel: 700, avgDailyOutflow: 65, qaSuccessRate: 98, daysOfCover: 9, riskLevel: 'Medium', branch: 'Branch B', interBranchQty: { 'Branch A': 1200, 'Branch C': 650 } },
  { id: 'fg8', productName: 'Rebar 10mm x 6m', sku: 'REB-10-6M', currentStock: 1800, reservedStock: 600, availableStock: 1200, minLevel: 800, avgDailyOutflow: 95, qaSuccessRate: 96, daysOfCover: 12, riskLevel: 'Low', branch: 'Branch B' },

  { id: 'fg9', productName: 'PVC Pipe 2" Class 150', sku: 'PVC-2-150', currentStock: 280, reservedStock: 100, availableStock: 180, minLevel: 300, avgDailyOutflow: 20, productionQuota: 100, qaSuccessRate: 98, daysOfCover: 9, riskLevel: 'Medium', branch: 'Branch C', interBranchQty: { 'Branch A': 850, 'Branch B': 420 } },
  { id: 'fg10', productName: 'Cement 40kg Portland', sku: 'CEM-40-PRT', currentStock: 650, reservedStock: 200, availableStock: 450, minLevel: 600, avgDailyOutflow: 50, qaSuccessRate: 99, daysOfCover: 9, riskLevel: 'Medium', branch: 'Branch C', interBranchQty: { 'Branch A': 1200, 'Branch B': 900 } },
];

export function getFinishedGoodsByBranch(branch: Branch): FinishedGoodStock[] {
  if (branch === 'All') return FINISHED_GOODS;
  return FINISHED_GOODS.filter(fg => fg.branch === branch);
}

// ===== Raw Materials Stock =====
const RAW_MATERIALS: RawMaterialStock[] = [
  { id: 'rm1', materialName: 'PVC Resin', sku: 'RM-PVC-001', currentQty: 850, safetyLevel: 1000, unit: 'kg', avgDailyUse: 120, daysRemaining: 7, productsAffected: ['PVC Pipe 2"', 'PVC Pipe 3"', 'PVC Fittings'], riskLevel: 'High', branch: 'Branch A' },
  { id: 'rm2', materialName: 'Clinker', sku: 'RM-CLK-002', currentQty: 15000, safetyLevel: 12000, unit: 'kg', avgDailyUse: 850, daysRemaining: 17, productsAffected: ['Cement Portland 40kg', 'Cement Masonry 40kg'], riskLevel: 'Low', branch: 'Branch A' },
  { id: 'rm3', materialName: 'Steel Billets', sku: 'RM-STL-003', currentQty: 3200, safetyLevel: 4000, unit: 'kg', avgDailyUse: 280, daysRemaining: 11, productsAffected: ['Rebar 10mm', 'Rebar 12mm', 'Wire Rod'], riskLevel: 'Medium', branch: 'Branch A' },
  { id: 'rm4', materialName: 'Plywood Veneer', sku: 'RM-PLY-004', currentQty: 120, safetyLevel: 200, unit: 'sheets', avgDailyUse: 18, daysRemaining: 6, productsAffected: ['Plywood 4x8 Marine', 'Plywood 4x8 Ordinary'], riskLevel: 'High', branch: 'Branch A' },

  { id: 'rm5', materialName: 'PVC Resin', sku: 'RM-PVC-001', currentQty: 1200, safetyLevel: 800, unit: 'kg', avgDailyUse: 95, daysRemaining: 12, productsAffected: ['PVC Pipe 2"', 'PVC Pipe 3"'], riskLevel: 'Low', branch: 'Branch B' },
  { id: 'rm6', materialName: 'Clinker', sku: 'RM-CLK-002', currentQty: 9500, safetyLevel: 10000, unit: 'kg', avgDailyUse: 680, daysRemaining: 13, productsAffected: ['Cement Portland 40kg'], riskLevel: 'Medium', branch: 'Branch B' },
  { id: 'rm7', materialName: 'Steel Billets', sku: 'RM-STL-003', currentQty: 5600, safetyLevel: 3500, unit: 'kg', avgDailyUse: 220, daysRemaining: 25, productsAffected: ['Rebar 10mm', 'Wire Rod'], riskLevel: 'Low', branch: 'Branch B' },

  { id: 'rm8', materialName: 'PVC Resin', sku: 'RM-PVC-001', currentQty: 650, safetyLevel: 700, unit: 'kg', avgDailyUse: 65, daysRemaining: 10, productsAffected: ['PVC Pipe 2"'], riskLevel: 'Medium', branch: 'Branch C' },
  { id: 'rm9', materialName: 'Clinker', sku: 'RM-CLK-002', currentQty: 8200, safetyLevel: 8000, unit: 'kg', avgDailyUse: 520, daysRemaining: 15, productsAffected: ['Cement Portland 40kg'], riskLevel: 'Low', branch: 'Branch C' },
];

export function getRawMaterialsByBranch(branch: Branch): RawMaterialStock[] {
  if (branch === 'All') return RAW_MATERIALS;
  return RAW_MATERIALS.filter(rm => rm.branch === branch);
}

// ===== Order Fulfillment Queue =====
const ORDER_FULFILLMENT: OrderFulfillment[] = [
  { id: 'of1', orderNumber: 'ORD-2026-1234', customer: 'ABC Hardware', truckAssigned: 'TRK-001', weightUtilization: 85, requiredDate: '2026-02-26', productsSummary: '3 items, 2450 kg', stockStatus: 'Fully Available', fulfillmentStatus: 'Ready', loadingDetails: [{ productName: 'Cement 40kg', qty: 50, status: 'Ready' }, { productName: 'Rebar 10mm', qty: 100, status: 'Ready' }], urgency: 'High', branch: 'Branch A' },
  { id: 'of2', orderNumber: 'ORD-2026-1235', customer: 'BuildMart Cebu', requiredDate: '2026-02-27', productsSummary: '5 items, 1850 kg', stockStatus: 'Partial', fulfillmentStatus: 'Picking', loadingDetails: [{ productName: 'PVC Pipe 2"', qty: 200, status: 'Loading' }, { productName: 'Paint White', qty: 50, status: 'Pending' }], urgency: 'Medium', branch: 'Branch A' },
  { id: 'of3', orderNumber: 'ORD-2026-1236', customer: 'Construction Plus', requiredDate: '2026-02-28', productsSummary: '2 items, 980 kg', stockStatus: 'Not Available', fulfillmentStatus: 'Blocked', loadingDetails: [{ productName: 'Plywood Marine', qty: 80, status: 'Out of Stock' }], urgency: 'High', branch: 'Branch A' },
  { id: 'of4', orderNumber: 'ORD-2026-1237', customer: 'HomeDepot Makati', truckAssigned: 'TRK-003', weightUtilization: 60, requiredDate: '2026-03-01', productsSummary: '4 items, 1520 kg', stockStatus: 'Fully Available', fulfillmentStatus: 'Packing', loadingDetails: [{ productName: 'Cement 40kg', qty: 30, status: 'Full' }, { productName: 'Paint White', qty: 20, status: 'Loading' }], urgency: 'Low', branch: 'Branch A' },
  { id: 'of5', orderNumber: 'ORD-2026-1238', customer: 'QuickBuild Supply', requiredDate: '2026-02-27', productsSummary: '6 items, 3200 kg', stockStatus: 'Fully Available', fulfillmentStatus: 'To Pick', loadingDetails: [{ productName: 'Rebar 10mm', qty: 150, status: 'Pending' }], urgency: 'Medium', branch: 'Branch A' },

  { id: 'of6', orderNumber: 'ORD-2026-1240', customer: 'Visayas Builders', truckAssigned: 'TRK-005', weightUtilization: 75, requiredDate: '2026-02-26', productsSummary: '3 items, 1980 kg', stockStatus: 'Fully Available', fulfillmentStatus: 'Ready', loadingDetails: [{ productName: 'Cement 40kg', qty: 40, status: 'Ready' }], urgency: 'High', branch: 'Branch B' },
  { id: 'of7', orderNumber: 'ORD-2026-1241', customer: 'Island Hardware', requiredDate: '2026-02-28', productsSummary: '4 items, 1650 kg', stockStatus: 'Partial', fulfillmentStatus: 'Picking', loadingDetails: [{ productName: 'PVC Pipe 2"', qty: 120, status: 'Loading' }], urgency: 'Medium', branch: 'Branch B' },

  { id: 'of8', orderNumber: 'ORD-2026-1245', customer: 'Mindanao Supply Co', requiredDate: '2026-02-27', productsSummary: '2 items, 850 kg', stockStatus: 'Fully Available', fulfillmentStatus: 'Packing', loadingDetails: [{ productName: 'Cement 40kg', qty: 20, status: 'Full' }], urgency: 'Low', branch: 'Branch C' },
];

export function getOrderFulfillmentByBranch(branch: Branch): OrderFulfillment[] {
  if (branch === 'All') return ORDER_FULFILLMENT;
  return ORDER_FULFILLMENT.filter(of => of.branch === branch);
}

// ===== Production Batches =====
const PRODUCTION_BATCHES: ProductionBatch[] = [
  { id: 'pb1', batchNumber: 'BATCH-2026-001', productName: 'PVC Pipe 2" Class 150', plannedQty: 500, actualQty: 490, qaStatus: 'Passed', scheduledDate: '2026-02-24', completedDate: '2026-02-25', branch: 'Branch A', defectRate: 2 },
  { id: 'pb2', batchNumber: 'BATCH-2026-002', productName: 'Cement 40kg Portland', plannedQty: 800, qaStatus: 'Testing', scheduledDate: '2026-02-25', branch: 'Branch A' },
  { id: 'pb3', batchNumber: 'BATCH-2026-003', productName: 'Plywood 4x8 Marine', plannedQty: 200, qaStatus: 'Pending', scheduledDate: '2026-02-26', branch: 'Branch A' },
  { id: 'pb4', batchNumber: 'BATCH-2026-004', productName: 'Rebar 10mm x 6m', plannedQty: 1000, actualQty: 950, qaStatus: 'Rework', scheduledDate: '2026-02-23', completedDate: '2026-02-24', branch: 'Branch A', defectRate: 5 },

  { id: 'pb5', batchNumber: 'BATCH-2026-005', productName: 'PVC Pipe 2" Class 150', plannedQty: 350, actualQty: 345, qaStatus: 'Passed', scheduledDate: '2026-02-24', completedDate: '2026-02-25', branch: 'Branch B', defectRate: 1.4 },
  { id: 'pb6', batchNumber: 'BATCH-2026-006', productName: 'Cement 40kg Portland', plannedQty: 600, qaStatus: 'Testing', scheduledDate: '2026-02-25', branch: 'Branch B' },

  { id: 'pb7', batchNumber: 'BATCH-2026-007', productName: 'PVC Pipe 2" Class 150', plannedQty: 250, qaStatus: 'Pending', scheduledDate: '2026-02-26', branch: 'Branch C' },
];

export function getProductionBatchesByBranch(branch: Branch): ProductionBatch[] {
  if (branch === 'All') return PRODUCTION_BATCHES;
  return PRODUCTION_BATCHES.filter(pb => pb.branch === branch);
}

// ===== Stock Movements =====
const STOCK_MOVEMENTS: StockMovement[] = [
  { id: 'sm1', timestamp: '2026-02-25 14:30', itemName: 'Cement 40kg Portland', type: 'Out', quantity: 50, reference: 'ORD-2026-1234', toLocation: 'Dispatch Area', user: 'Juan Dela Cruz', branch: 'Branch A' },
  { id: 'sm2', timestamp: '2026-02-25 13:15', itemName: 'PVC Pipe 2" Class 150', type: 'Production', quantity: 490, reference: 'BATCH-2026-001', fromLocation: 'Production Line', toLocation: 'FG Warehouse', user: 'System', branch: 'Branch A' },
  { id: 'sm3', timestamp: '2026-02-25 11:45', itemName: 'Rebar 10mm x 6m', type: 'Adjust', quantity: -20, reference: 'ADJ-2026-042', notes: 'Damaged during handling', user: 'Carlos Mendoza', branch: 'Branch A' },
  { id: 'sm4', timestamp: '2026-02-25 10:20', itemName: 'PVC Resin', type: 'In', quantity: 500, reference: 'PO-2026-0089', fromLocation: 'Supplier Truck', toLocation: 'RM Storage', user: 'Maria Santos', branch: 'Branch A' },
  { id: 'sm5', timestamp: '2026-02-25 09:00', itemName: 'Paint White 4L', type: 'Transfer', quantity: 100, reference: 'TRF-2026-018', fromLocation: 'Branch B', toLocation: 'Branch A', user: 'Logistics Team', branch: 'Branch A' },

  { id: 'sm6', timestamp: '2026-02-25 15:00', itemName: 'Cement 40kg Portland', type: 'Production', quantity: 345, reference: 'BATCH-2026-005', fromLocation: 'Production Line', toLocation: 'FG Warehouse', user: 'System', branch: 'Branch B' },
  { id: 'sm7', timestamp: '2026-02-25 12:30', itemName: 'Paint White 4L', type: 'Out', quantity: 100, reference: 'TRF-2026-018', fromLocation: 'Branch B', toLocation: 'Branch A', user: 'Roberto Santos', branch: 'Branch B' },
];

export function getStockMovementsByBranch(branch: Branch): StockMovement[] {
  if (branch === 'All') return STOCK_MOVEMENTS;
  return STOCK_MOVEMENTS.filter(sm => sm.branch === branch);
}

// ===== Quality Issues =====
const QUALITY_ISSUES: QualityIssue[] = [
  { id: 'qi1', itemName: 'Rebar 10mm x 6m', batchNumber: 'BATCH-2026-004', issueType: 'Rejected Batch', reason: 'Dimensional variance outside tolerance', qtyAffected: 50, status: 'Investigating', reportedDate: '2026-02-24', assignedTo: 'QA Team', branch: 'Branch A' },
  { id: 'qi2', itemName: 'Plywood 4x8 Marine', issueType: 'Damaged Goods', reason: 'Water damage during storage', qtyAffected: 15, status: 'Open', reportedDate: '2026-02-25', branch: 'Branch A' },
  { id: 'qi3', itemName: 'PVC Pipe 2" Class 150', batchNumber: 'BATCH-2026-001', issueType: 'Re-inspection', reason: 'Customer complaint on wall thickness', qtyAffected: 10, status: 'Resolved', reportedDate: '2026-02-23', resolution: 'Re-tested, met specs', branch: 'Branch A' },

  { id: 'qi4', itemName: 'Cement 40kg Portland', issueType: 'Damaged Goods', reason: 'Bags torn during handling', qtyAffected: 8, status: 'Open', reportedDate: '2026-02-25', branch: 'Branch B' },
];

export function getQualityIssuesByBranch(branch: Branch): QualityIssue[] {
  if (branch === 'All') return QUALITY_ISSUES;
  return QUALITY_ISSUES.filter(qi => qi.branch === branch);
}

// ===== Machine Status =====
const MACHINES: MachineStatus[] = [
  { id: 'm1', machineName: 'PVC Extrusion Line 1', utilizationPercent: 87, quotaCompletionPercent: 95, nextMaintenance: '2026-03-05', errorRate: 2.1, status: 'Running', branch: 'Branch A' },
  { id: 'm2', machineName: 'Cement Mixer A', utilizationPercent: 92, quotaCompletionPercent: 88, nextMaintenance: '2026-03-12', errorRate: 1.5, status: 'Running', branch: 'Branch A' },
  { id: 'm3', machineName: 'Rebar Bending Machine', utilizationPercent: 45, quotaCompletionPercent: 60, nextMaintenance: '2026-02-28', errorRate: 0.8, status: 'Idle', branch: 'Branch A' },

  { id: 'm4', machineName: 'PVC Extrusion Line 2', utilizationPercent: 78, quotaCompletionPercent: 82, nextMaintenance: '2026-03-08', errorRate: 3.2, status: 'Running', branch: 'Branch B' },
  { id: 'm5', machineName: 'Cement Mixer B', utilizationPercent: 85, quotaCompletionPercent: 90, nextMaintenance: '2026-03-15', errorRate: 1.8, status: 'Running', branch: 'Branch B' },

  { id: 'm6', machineName: 'PVC Extrusion Line 3', utilizationPercent: 65, quotaCompletionPercent: 70, nextMaintenance: '2026-03-10', errorRate: 2.5, status: 'Running', branch: 'Branch C' },
];

export function getMachineStatusByBranch(branch: Branch): MachineStatus[] {
  if (branch === 'All') return MACHINES;
  return MACHINES.filter(m => m.branch === branch);
}

// ===== Warehouse Alerts =====
const WAREHOUSE_ALERTS: WarehouseAlert[] = [
  { id: 'wa1', type: 'Low Stock', severity: 'Critical', title: 'PVC Resin critically low', message: 'Only 7 days remaining. Purchase request recommended.', itemName: 'PVC Resin', actionRequired: true, timestamp: '2026-02-25 14:00', branch: 'Branch A' },
  { id: 'wa2', type: 'Shortage Impact', severity: 'High', title: 'Plywood shortage blocking 3 orders', message: 'Orders ORD-2026-1236, ORD-2026-1239, ORD-2026-1242 cannot be fulfilled.', itemName: 'Plywood 4x8 Marine', actionRequired: true, timestamp: '2026-02-25 13:30', branch: 'Branch A' },
  { id: 'wa3', type: 'QA Reject', severity: 'Medium', title: 'Batch rework required', message: '50 units of Rebar 10mm rejected. Dimensional issues detected.', itemName: 'Rebar 10mm x 6m', actionRequired: true, timestamp: '2026-02-25 11:00', branch: 'Branch A' },
  { id: 'wa4', type: 'Material Arrival', severity: 'Low', title: 'PVC Resin delivery arriving', message: 'Expected delivery of 500kg PVC Resin today at 16:00.', itemName: 'PVC Resin', actionRequired: false, timestamp: '2026-02-25 09:00', branch: 'Branch A' },
  { id: 'wa5', type: 'Transfer Request', severity: 'Medium', title: 'Transfer request from Branch C', message: 'Branch C requesting 100 units of Paint White 4L.', itemName: 'Paint White 4L', actionRequired: true, timestamp: '2026-02-25 08:30', branch: 'Branch A' },

  { id: 'wa6', type: 'Low Stock', severity: 'High', title: 'Clinker below safety level', message: '13 days remaining. Monitor closely.', itemName: 'Clinker', actionRequired: true, timestamp: '2026-02-25 12:00', branch: 'Branch B' },
  { id: 'wa7', type: 'Material Arrival', severity: 'Low', title: 'Steel Billets arriving tomorrow', message: 'Expected delivery of 2000kg Steel Billets on 2026-02-26.', itemName: 'Steel Billets', actionRequired: false, timestamp: '2026-02-25 10:00', branch: 'Branch B' },

  { id: 'wa8', type: 'Low Stock', severity: 'Medium', title: 'PVC Resin approaching minimum', message: '10 days remaining. Consider purchase request.', itemName: 'PVC Resin', actionRequired: false, timestamp: '2026-02-25 11:30', branch: 'Branch C' },
];

export function getWarehouseAlertsByBranch(branch: Branch): WarehouseAlert[] {
  if (branch === 'All') return WAREHOUSE_ALERTS;
  return WAREHOUSE_ALERTS.filter(wa => wa.branch === branch);
}
