export type UserRole = 
  | 'Executive' 
  | 'Warehouse' 
  | 'Logistics' 
  | 'Agent';

export type Branch = 'All' | 'Branch A' | 'Branch B' | 'Branch C';

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: UserRole;
  action: string;
  entity: string;
  details: string;
}

export interface Product {
  id: string;
  name: string;
  type: string;
  status: 'Active' | 'Inactive';
  lastUpdated: string;
}

export interface Variant {
  id: string;
  productId: string;
  sku: string;
  size: string;
  thickness: string;
  price: number;
  stockStatus: 'OK' | 'Low' | 'Out';
}

export interface Order {
  id: string;
  customer: string;
  agent: string;
  branch: Branch;
  orderDate: string;
  requiredDate: string;
  totalAmount: number;
  status: 'Draft' | 'Pending' | 'Approved' | 'Picking' | 'Packed' | 'Ready' | 'Scheduled' | 'In Transit' | 'Delivered' | 'Completed' | 'Cancelled' | 'Rejected';
  paymentStatus: 'Unbilled' | 'Invoiced' | 'Partially Paid' | 'Paid' | 'Overdue';
  paymentMethod: 'Online' | 'Offline';
}

export interface OrderLine {
  id: string;
  orderId: string;
  sku: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface KPI {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  status?: 'good' | 'warning' | 'critical';
}
