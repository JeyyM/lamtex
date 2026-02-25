export type ProductCategory = 
  | 'HDPE Pipes'
  | 'HDPE Fittings'
  | 'UPVC Sanitary'
  | 'UPVC Electrical'
  | 'UPVC Potable Water'
  | 'UPVC Pressurized'
  | 'PPR Pipes'
  | 'PPR Fittings'
  | 'Telecom Pipes'
  | 'Garden Hoses'
  | 'Flexible Hoses'
  | 'Others';

export type ProductStatus = 'Active' | 'Discontinued' | 'Out of Stock' | 'Low Stock';

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  description: string;
  specifications?: {
    material?: string;
    pressureRating?: string;
    temperature?: string;
    standard?: string;
    color?: string;
    application?: string;
  };
  imageUrl?: string;
  images?: string[];
  status: ProductStatus;
  totalVariants: number;
  totalStock: number;
  avgPrice: number;
  totalRevenue: number; // YTD
  totalUnitsSold: number; // YTD
  createdDate: string;
  lastModified: string;
  branch?: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  size: string; // e.g., "20mm", "25x20mm", "1/2", "SDR 11"
  description?: string;
  
  // Pricing
  unitPrice: number;
  wholesalePrice?: number;
  retailPrice?: number;
  costPrice?: number;
  
  // Stock per branch
  stockBranchA: number;
  stockBranchB: number;
  stockBranchC: number;
  totalStock: number;
  reorderPoint: number;
  safetyStock: number;
  
  // Physical specs
  weight?: number; // kg
  length?: number; // meters or cm
  outerDiameter?: number; // mm
  innerDiameter?: number; // mm
  wallThickness?: number; // mm
  
  // Status
  status: ProductStatus;
  
  // Sales performance
  unitsSoldYTD: number;
  revenueYTD: number;
  unitsSoldMTD: number;
  revenueMTD: number;
  
  // Supplier
  supplierId?: string;
  supplierName?: string;
  leadTimeDays?: number;
  
  // Dates
  createdDate: string;
  lastRestocked?: string;
  branch?: string;
}

export interface ProductPerformance {
  productId: string;
  variantId?: string;
  period: string; // e.g., "2026-02", "2026-01"
  unitsSold: number;
  revenue: number;
  avgSellingPrice: number;
  ordersCount: number;
  topCustomers: Array<{
    customerName: string;
    unitsPurchased: number;
    revenue: number;
  }>;
}

export interface StockMovement {
  id: string;
  variantId: string;
  variantSKU: string;
  productName: string;
  movementType: 'In' | 'Out' | 'Transfer' | 'Adjustment';
  quantity: number;
  fromBranch?: string;
  toBranch?: string;
  reason: string;
  performedBy: string;
  timestamp: string;
  referenceNumber?: string; // Order number, PO number, etc.
}

export interface ProductFormData {
  name: string;
  category: ProductCategory;
  description: string;
  specifications?: {
    material?: string;
    pressureRating?: string;
    temperature?: string;
    standard?: string;
    color?: string;
    application?: string;
  };
  imageUrl?: string;
  images?: string[];
  status: ProductStatus;
}

export interface VariantFormData {
  productId: string;
  sku: string;
  size: string;
  description?: string;
  unitPrice: number;
  wholesalePrice?: number;
  retailPrice?: number;
  costPrice?: number;
  stockBranchA: number;
  stockBranchB: number;
  stockBranchC: number;
  reorderPoint: number;
  safetyStock: number;
  weight?: number;
  length?: number;
  outerDiameter?: number;
  innerDiameter?: number;
  wallThickness?: number;
  supplierId?: string;
  supplierName?: string;
  leadTimeDays?: number;
  status: ProductStatus;
}
