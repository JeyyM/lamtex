// Raw Materials Management Types for Lamtex ERP

export type MaterialCategory = 
  | 'PVC Resin'
  | 'HDPE Resin'
  | 'PPR Resin'
  | 'Stabilizers'
  | 'Plasticizers'
  | 'Lubricants'
  | 'Colorants'
  | 'Additives'
  | 'Packaging Materials'
  | 'Other';

export type MaterialStatus = 'Active' | 'Discontinued' | 'Low Stock' | 'Out of Stock' | 'Expired';

export type StockOutRisk = 'OK' | 'Risky' | 'Critical';

/**
 * Calculate stock-out risk based on days of cover (operationally-focused)
 * @param daysOfCover - Number of days until stock runs out
 * @returns StockOutRisk classification
 * 
 * Thresholds:
 * - 0-30 days: Critical (< 1 month = immediate procurement needed)
 * - 31-90 days: Risky (1-3 months = plan reorder soon)
 * - 91+ days: OK (> 3 months = operationally safe)
 */
export function getStockOutRisk(daysOfCover: number): StockOutRisk {
  if (daysOfCover <= 30) return 'Critical';
  if (daysOfCover <= 90) return 'Risky';
  return 'OK';
}

export type UnitOfMeasure = 'kg' | 'ton' | 'liter' | 'pieces' | 'bags' | 'drums';

export type MovementType = 'Receipt' | 'Issue' | 'Transfer' | 'Adjustment' | 'Return';

export type PurchaseRequisitionStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Rejected' | 'Ordered' | 'Completed' | 'Cancelled';

export type PurchaseOrderStatus = 'Draft' | 'Sent' | 'Confirmed' | 'Partially Received' | 'Completed' | 'Cancelled';

export type QualityStatus = 'Pending' | 'Passed' | 'Failed' | 'Conditionally Approved';

// Main Raw Material Interface
export interface RawMaterial {
  id: string;
  name: string;
  sku: string;
  category: MaterialCategory;
  description: string;
  specifications: {
    grade?: string;
    purity?: string;
    density?: string;
    meltFlowIndex?: string;
    color?: string;
    viscosity?: string;
    standard?: string;
    meltingPoint?: string;
    pigmentContent?: string;
    dimension?: string;
    width?: string;
    thickness?: string;
    material?: string;
    activeContent?: string;
    size?: string;
    printQuality?: string;
    burstStrength?: string;
    breakingStrength?: string;
    [key: string]: string | undefined; // Allow any additional specification properties
  };
  unitOfMeasure: UnitOfMeasure;
  
  // Stock Information
  stockBranchA: number;
  stockBranchB: number;
  stockBranchC: number;
  totalStock: number;
  reorderPoint: number;
  safetyStock: number;
  
  // Pricing
  costPerUnit: number;
  currency: string;
  lastPurchasePrice: number;
  averageCost: number;
  totalValue: number;
  
  // Supplier Info
  primarySupplier: string;
  supplierCode: string;
  leadTimeDays: number;
  
  // Quality & Compliance
  requiresQualityCheck: boolean;
  shelfLifeDays?: number;
  expiryDate?: string;
  batchTracking: boolean;
  
  // Usage Tracking
  monthlyConsumption: number;
  yearlyConsumption: number;
  linkedProducts: string[]; // Product IDs that use this material
  
  // Status
  status: MaterialStatus;
  lastRestockDate: string;
  lastIssuedDate: string;
  createdDate: string;
  lastModified: string;
}

// Material Batch/Lot Tracking
export interface MaterialBatch {
  id: string;
  materialId: string;
  materialName: string;
  batchNumber: string;
  lotNumber: string;
  
  // Quantity
  quantityReceived: number;
  quantityAvailable: number;
  quantityIssued: number;
  unitOfMeasure: UnitOfMeasure;
  
  // Dates
  manufacturingDate: string;
  receivedDate: string;
  expiryDate?: string;
  
  // Quality
  qualityStatus: QualityStatus;
  certificateNumber?: string;
  testResults?: {
    parameter: string;
    result: string;
    specification: string;
    status: 'Pass' | 'Fail';
  }[];
  
  // Source
  supplier: string;
  purchaseOrderRef: string;
  grnNumber: string;
  
  // Location
  branch: 'A' | 'B' | 'C';
  warehouseLocation?: string;
  
  remarks?: string;
}

// Stock Movement Record
export interface StockMovement {
  id: string;
  materialId: string;
  materialName: string;
  materialSku: string;
  
  movementType: MovementType;
  quantity: number;
  unitOfMeasure: UnitOfMeasure;
  
  // Location
  fromBranch?: 'A' | 'B' | 'C';
  toBranch?: 'A' | 'B' | 'C';
  fromLocation?: string;
  toLocation?: string;
  
  // References
  referenceType?: 'PO' | 'PR' | 'Production' | 'Transfer Request' | 'Manual';
  referenceNumber?: string;
  batchNumber?: string;
  
  // Details
  reason: string;
  remarks?: string;
  
  // People
  requestedBy?: string;
  approvedBy?: string;
  processedBy: string;
  
  // Dates
  movementDate: string;
  createdDate: string;
  
  // Cost
  costPerUnit?: number;
  totalCost?: number;
}

// Purchase Requisition
export interface PurchaseRequisition {
  id: string;
  prNumber: string;
  
  // Material Details
  materialId: string;
  materialName: string;
  materialSku: string;
  category: MaterialCategory;
  
  // Quantity
  requestedQuantity: number;
  unitOfMeasure: UnitOfMeasure;
  estimatedCost: number;
  
  // Delivery
  deliveryBranch: 'A' | 'B' | 'C';
  requiredDate: string;
  
  // Justification
  reason: string;
  urgency: 'Low' | 'Medium' | 'High' | 'Critical';
  currentStock: number;
  reorderPoint: number;
  
  // Suggested Supplier
  suggestedSupplier?: string;
  supplierQuotation?: number;
  
  // Workflow
  status: PurchaseRequisitionStatus;
  requestedBy: string;
  requestedDate: string;
  approvedBy?: string;
  approvalDate?: string;
  rejectionReason?: string;
  
  // Linked PO
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  
  remarks?: string;
}

// Purchase Order
export interface PurchaseOrder {
  id: string;
  poNumber: string;
  
  // Supplier
  supplierId: string;
  supplierName: string;
  supplierContact: string;
  supplierAddress: string;
  
  // Items
  items: {
    materialId: string;
    materialName: string;
    materialSku: string;
    description: string;
    quantity: number;
    unitOfMeasure: UnitOfMeasure;
    unitPrice: number;
    totalPrice: number;
    expectedDeliveryDate: string;
  }[];
  
  // Totals
  subtotal: number;
  tax: number;
  shippingCost: number;
  totalAmount: number;
  
  // Delivery
  deliveryBranch: 'A' | 'B' | 'C';
  deliveryAddress: string;
  requestedDeliveryDate: string;
  
  // Status
  status: PurchaseOrderStatus;
  
  // Workflow
  createdBy: string;
  createdDate: string;
  approvedBy?: string;
  approvalDate?: string;
  sentDate?: string;
  
  // References
  prReferences: string[]; // PR IDs that led to this PO
  
  // Tracking
  receivedQuantities?: {
    materialId: string;
    quantityReceived: number;
    grnNumbers: string[];
  }[];
  
  paymentTerms: string;
  notes?: string;
}

// Goods Receipt Note
export interface GoodsReceiptNote {
  id: string;
  grnNumber: string;
  
  // Source
  purchaseOrderId: string;
  purchaseOrderNumber: string;
  supplierId: string;
  supplierName: string;
  
  // Delivery
  deliveryNote?: string;
  invoiceNumber?: string;
  receivedDate: string;
  receivedBy: string;
  branch: 'A' | 'B' | 'C';
  
  // Items Received
  items: {
    materialId: string;
    materialName: string;
    materialSku: string;
    orderedQuantity: number;
    receivedQuantity: number;
    acceptedQuantity: number;
    rejectedQuantity: number;
    unitOfMeasure: UnitOfMeasure;
    batchNumber: string;
    expiryDate?: string;
    remarks?: string;
  }[];
  
  // Quality Check
  qualityCheckRequired: boolean;
  qualityCheckStatus?: QualityStatus;
  qualityCheckBy?: string;
  qualityCheckDate?: string;
  qualityRemarks?: string;
  
  // Status
  status: 'Draft' | 'Completed' | 'Partially Accepted' | 'Rejected';
  
  remarks?: string;
  attachments?: string[];
}

// Material Consumption (for production tracking)
export interface MaterialConsumption {
  id: string;
  materialId: string;
  materialName: string;
  
  // Consumption Details
  quantityConsumed: number;
  unitOfMeasure: UnitOfMeasure;
  consumptionDate: string;
  
  // Production Link
  productionBatchId?: string;
  productId?: string;
  productName?: string;
  
  // Location
  branch: 'A' | 'B' | 'C';
  
  // Cost
  costPerUnit: number;
  totalCost: number;
  
  // Batch Tracking
  batchNumbers: string[];
  
  // People
  issuedBy: string;
  approvedBy?: string;
  
  remarks?: string;
}

// Supplier Information
export interface Supplier {
  id: string;
  code: string;
  name: string;
  
  // Contact
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  
  // Business
  category: 'Resin Supplier' | 'Additives Supplier' | 'Packaging Supplier' | 'General';
  materialsSupplied: string[]; // Material IDs
  
  // Terms
  paymentTerms: string;
  creditLimit: number;
  deliveryLeadTime: number;
  
  // Performance
  rating: number; // 1-5
  onTimeDeliveryRate: number; // percentage
  qualityScore: number; // percentage
  
  // Status
  status: 'Active' | 'Inactive' | 'Blacklisted';
  
  // Dates
  registeredDate: string;
  lastOrderDate?: string;
}

// Analytics & Reports
export interface MaterialAnalytics {
  materialId: string;
  materialName: string;
  
  // Consumption
  monthlyConsumption: {
    month: string;
    quantity: number;
    cost: number;
  }[];
  
  // Stock Trends
  stockLevels: {
    date: string;
    branchA: number;
    branchB: number;
    branchC: number;
    total: number;
  }[];
  
  // Purchase History
  purchases: {
    date: string;
    quantity: number;
    costPerUnit: number;
    supplier: string;
  }[];
  
  // Usage by Product
  productUsage: {
    productId: string;
    productName: string;
    quantityUsed: number;
    percentage: number;
  }[];
  
  // Waste/Scrap
  wastage: {
    month: string;
    quantity: number;
    reason: string;
  }[];
}

// Form Data Types
export interface MaterialFormData {
  name: string;
  sku: string;
  category: MaterialCategory;
  description: string;
  specifications: Record<string, string>;
  unitOfMeasure: UnitOfMeasure;
  reorderPoint: number;
  safetyStock: number;
  primarySupplier: string;
  leadTimeDays: number;
  requiresQualityCheck: boolean;
  shelfLifeDays?: number;
  batchTracking: boolean;
}

export interface StockAdjustmentFormData {
  materialId: string;
  branch: 'A' | 'B' | 'C';
  adjustmentType: 'Add' | 'Subtract';
  quantity: number;
  reason: string;
  batchNumber?: string;
  remarks?: string;
}

export interface TransferRequestFormData {
  materialId: string;
  fromBranch: 'A' | 'B' | 'C';
  toBranch: 'A' | 'B' | 'C';
  quantity: number;
  reason: string;
  requestedBy: string;
  urgency: 'Low' | 'Medium' | 'High';
  remarks?: string;
}
