import { Product, Variant, Order, OrderLine } from '../types';

export const MOCK_PRODUCTS: Product[] = [
  { id: 'PRD-001', name: 'PVC Pipe', type: 'Pipe', status: 'Active', lastUpdated: '2026-02-20' },
  { id: 'PRD-002', name: 'Solvent Cement', type: 'Adhesive', status: 'Active', lastUpdated: '2026-02-21' },
  { id: 'PRD-003', name: 'Garden Hose', type: 'Hose', status: 'Active', lastUpdated: '2026-02-15' },
];

export const MOCK_VARIANTS: Variant[] = [
  { id: 'VAR-101', productId: 'PRD-001', sku: 'PVC-2-150-3M', size: '2"', thickness: 'Class 150', price: 120, stockStatus: 'OK' },
  { id: 'VAR-102', productId: 'PRD-001', sku: 'PVC-4-150-3M', size: '4"', thickness: 'Class 150', price: 350, stockStatus: 'Low' },
  { id: 'VAR-103', productId: 'PRD-002', sku: 'SOL-100ML', size: '100ml', thickness: 'N/A', price: 45, stockStatus: 'OK' },
];

export const MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-2026-1001',
    customer: 'Hardware Store A',
    agent: 'Juan Dela Cruz',
    branch: 'Branch A',
    orderDate: '2026-02-24',
    requiredDate: '2026-02-26',
    totalAmount: 45000,
    status: 'Pending Approval',
    paymentStatus: 'Unbilled',
    paymentMethod: 'Offline'
  },
  {
    id: 'ORD-2026-1002',
    customer: 'Project Builder XYZ',
    agent: 'Maria Santos',
    branch: 'Branch B',
    orderDate: '2026-02-23',
    requiredDate: '2026-02-25',
    totalAmount: 125000,
    status: 'Ready',
    paymentStatus: 'Paid',
    paymentMethod: 'Online'
  }
];

export const MOCK_ORDER_LINES: OrderLine[] = [
  { id: 'OL-001', orderId: 'ORD-2026-1001', sku: 'PVC-4-150-3M', qty: 100, unitPrice: 350, lineTotal: 35000 },
  { id: 'OL-002', orderId: 'ORD-2026-1001', sku: 'SOL-100ML', qty: 50, unitPrice: 45, lineTotal: 2250 },
];
