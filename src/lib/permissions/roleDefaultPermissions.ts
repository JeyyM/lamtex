/**
 * Default permission templates per dashboard role.
 * When an employee is assigned roles, defaults are merged (union) and saved explicitly.
 */

import type { UserRole } from '@/src/types';
import type { EmployeeRole } from '@/src/types/employee';
import {
  ALL_ORDER_PERMISSIONS_GRANTED,
  type OrderPermissionSet,
} from './orderPermissions';
import {
  ALL_PRODUCT_PERMISSIONS_GRANTED,
  type ProductPermissionSet,
} from './productPermissions';
import {
  ALL_MATERIAL_PERMISSIONS_GRANTED,
  type MaterialPermissionSet,
} from './materialPermissions';
import {
  ALL_WAREHOUSE_PERMISSIONS_GRANTED,
  type WarehousePermissionSet,
} from './warehousePermissions';
import {
  ALL_PRODUCTION_REQUEST_PERMISSIONS_GRANTED,
  type ProductionRequestPermissionSet,
} from './productionRequestPermissions';
import {
  ALL_PURCHASE_ORDER_PERMISSIONS_GRANTED,
  type PurchaseOrderPermissionSet,
} from './purchaseOrderPermissions';
import {
  ALL_INTER_BRANCH_REQUEST_PERMISSIONS_GRANTED,
  type InterBranchRequestPermissionSet,
} from './interBranchRequestPermissions';
import {
  ALL_LOGISTICS_PERMISSIONS_GRANTED,
  type LogisticsPermissionSet,
} from './logisticsPermissions';
import {
  ALL_SUPPLIER_PERMISSIONS_GRANTED,
  type SupplierPermissionSet,
} from './supplierPermissions';
import {
  ALL_CUSTOMER_PERMISSIONS_GRANTED,
  type CustomerPermissionSet,
} from './customerPermissions';
import {
  ALL_FINANCE_PERMISSIONS_GRANTED,
  type FinancePermissionSet,
} from './financePermissions';
import {
  ALL_EMPLOYEES_PERMISSIONS_GRANTED,
  type EmployeesPermissionSet,
} from './employeesPermissions';
import {
  ALL_AGENT_ANALYTICS_PERMISSIONS_GRANTED,
  type AgentAnalyticsPermissionSet,
} from './agentAnalyticsPermissions';
import {
  ALL_REPORTS_PERMISSIONS_GRANTED,
  type ReportsPermissionSet,
} from './reportsPermissions';
import {
  ALL_SETTINGS_PERMISSIONS_GRANTED,
  type SettingsPermissionSet,
} from './settingsPermissions';

export const ASSIGNABLE_DASHBOARD_ROLES = ['Agent', 'Logistics', 'Warehouse', 'Driver'] as const;
export type AssignableDashboardRole = (typeof ASSIGNABLE_DASHBOARD_ROLES)[number];

export function isAssignableDashboardRole(role: string): role is AssignableDashboardRole {
  return (ASSIGNABLE_DASHBOARD_ROLES as readonly string[]).includes(role);
}

function denyAll<T extends Record<string, boolean>>(granted: T): T {
  const out = { ...granted };
  for (const key of Object.keys(out) as (keyof T)[]) {
    out[key] = false as T[keyof T];
  }
  return out;
}

function mergePartial<T extends Record<string, boolean>>(base: T, partial: Partial<T>): T {
  const out = { ...base };
  for (const [key, value] of Object.entries(partial) as [keyof T, boolean][]) {
    if (value === true) out[key] = true as T[keyof T];
  }
  return out;
}

export type MergedRoleDefaultPermissions = {
  orders: OrderPermissionSet;
  products: ProductPermissionSet;
  materials: MaterialPermissionSet;
  warehouse: WarehousePermissionSet;
  productionRequest: ProductionRequestPermissionSet;
  purchaseOrder: PurchaseOrderPermissionSet;
  interBranchRequest: InterBranchRequestPermissionSet;
  logistics: LogisticsPermissionSet;
  suppliers: SupplierPermissionSet;
  customers: CustomerPermissionSet;
  finance: FinancePermissionSet;
  employees: EmployeesPermissionSet;
  agentAnalytics: AgentAnalyticsPermissionSet;
  reports: ReportsPermissionSet;
  settings: SettingsPermissionSet;
};

type RoleDefaultPartials = {
  orders?: Partial<OrderPermissionSet>;
  products?: Partial<ProductPermissionSet>;
  materials?: Partial<MaterialPermissionSet>;
  warehouse?: Partial<WarehousePermissionSet>;
  productionRequest?: Partial<ProductionRequestPermissionSet>;
  purchaseOrder?: Partial<PurchaseOrderPermissionSet>;
  interBranchRequest?: Partial<InterBranchRequestPermissionSet>;
  logistics?: Partial<LogisticsPermissionSet>;
  suppliers?: Partial<SupplierPermissionSet>;
  customers?: Partial<CustomerPermissionSet>;
  finance?: Partial<FinancePermissionSet>;
  employees?: Partial<EmployeesPermissionSet>;
  agentAnalytics?: Partial<AgentAnalyticsPermissionSet>;
  reports?: Partial<ReportsPermissionSet>;
  settings?: Partial<SettingsPermissionSet>;
};

/** Per-role default permission grants (only listed keys are true). */
export const ROLE_DEFAULTS: Partial<Record<UserRole, RoleDefaultPartials>> = {
  Warehouse: {
    orders: { pageAccess: true, deliveries: true, orderLoading: true },
    products: {
      pageAccess: true,
      stockAccess: true,
      categoryCreation: true,
      productCreation: true,
      productionRequestsHistory: true,
    },
    materials: {
      pageAccess: true,
      stockAccess: true,
      categoryCreation: true,
      materialCreation: true,
      purchaseOrdersHistory: true,
    },
    warehouse: { pageAccess: true },
    productionRequest: { pageAccess: true, creation: true, fulfillment: true },
    purchaseOrder: { pageAccess: true, creation: true, documents: true, receiveOrders: true },
    interBranchRequest: { pageAccess: true, creation: true, documents: true, loading: true },
    settings: { notifications: true },
  },
  Logistics: {
    orders: { pageAccess: true, scheduling: true },
    products: { pageAccess: true, stockAccess: true },
    materials: { pageAccess: true, stockAccess: true },
    interBranchRequest: {
      pageAccess: true,
      scheduling: true,
      documents: true,
      delivery: true,
    },
    logistics: { pageAccess: true },
    settings: { notifications: true },
  },
  Agent: {
    orders: {
      pageAccess: true,
      creation: true,
      customerSetup: true,
      payment: true,
      orderSummary: true,
      documents: true,
    },
    products: { pageAccess: true, paymentData: true },
    customers: { pageAccess: true },
    finance: { pageAccess: true },
    settings: { notifications: true },
  },
  Driver: {
    orders: { pageAccess: true, deliveries: true, documents: true },
    settings: { notifications: true },
  },
};

/** True when at least one assigned role has a default permission template. */
export function rolesHaveDefaultTemplates(roles: UserRole[]): boolean {
  return roles.some((role) => ROLE_DEFAULTS[role] != null);
}

function emptyMergedDefaults(): MergedRoleDefaultPermissions {
  return {
    orders: denyAll(ALL_ORDER_PERMISSIONS_GRANTED),
    products: denyAll(ALL_PRODUCT_PERMISSIONS_GRANTED),
    materials: denyAll(ALL_MATERIAL_PERMISSIONS_GRANTED),
    warehouse: denyAll(ALL_WAREHOUSE_PERMISSIONS_GRANTED),
    productionRequest: denyAll(ALL_PRODUCTION_REQUEST_PERMISSIONS_GRANTED),
    purchaseOrder: denyAll(ALL_PURCHASE_ORDER_PERMISSIONS_GRANTED),
    interBranchRequest: denyAll(ALL_INTER_BRANCH_REQUEST_PERMISSIONS_GRANTED),
    logistics: denyAll(ALL_LOGISTICS_PERMISSIONS_GRANTED),
    suppliers: denyAll(ALL_SUPPLIER_PERMISSIONS_GRANTED),
    customers: denyAll(ALL_CUSTOMER_PERMISSIONS_GRANTED),
    finance: denyAll(ALL_FINANCE_PERMISSIONS_GRANTED),
    employees: denyAll(ALL_EMPLOYEES_PERMISSIONS_GRANTED),
    agentAnalytics: denyAll(ALL_AGENT_ANALYTICS_PERMISSIONS_GRANTED),
    reports: denyAll(ALL_REPORTS_PERMISSIONS_GRANTED),
    settings: denyAll(ALL_SETTINGS_PERMISSIONS_GRANTED),
  };
}

/** Union-merge default permissions for all assigned dashboard roles. */
export function mergeDefaultPermissionsForRoles(roles: UserRole[]): MergedRoleDefaultPermissions {
  let merged = emptyMergedDefaults();
  for (const role of roles) {
    const partial = ROLE_DEFAULTS[role];
    if (!partial) continue;
    if (partial.orders) merged.orders = mergePartial(merged.orders, partial.orders);
    if (partial.products) merged.products = mergePartial(merged.products, partial.products);
    if (partial.materials) merged.materials = mergePartial(merged.materials, partial.materials);
    if (partial.warehouse) merged.warehouse = mergePartial(merged.warehouse, partial.warehouse);
    if (partial.productionRequest) {
      merged.productionRequest = mergePartial(merged.productionRequest, partial.productionRequest);
    }
    if (partial.purchaseOrder) {
      merged.purchaseOrder = mergePartial(merged.purchaseOrder, partial.purchaseOrder);
    }
    if (partial.interBranchRequest) {
      merged.interBranchRequest = mergePartial(merged.interBranchRequest, partial.interBranchRequest);
    }
    if (partial.logistics) merged.logistics = mergePartial(merged.logistics, partial.logistics);
    if (partial.suppliers) merged.suppliers = mergePartial(merged.suppliers, partial.suppliers);
    if (partial.customers) merged.customers = mergePartial(merged.customers, partial.customers);
    if (partial.finance) merged.finance = mergePartial(merged.finance, partial.finance);
    if (partial.employees) merged.employees = mergePartial(merged.employees, partial.employees);
    if (partial.agentAnalytics) {
      merged.agentAnalytics = mergePartial(merged.agentAnalytics, partial.agentAnalytics);
    }
    if (partial.reports) merged.reports = mergePartial(merged.reports, partial.reports);
    if (partial.settings) merged.settings = mergePartial(merged.settings, partial.settings);
  }
  return merged;
}

type EmployeeDirectoryRole = Extract<
  EmployeeRole,
  'Sales Agent' | 'Logistics Manager' | 'Warehouse Manager' | 'Truck Driver'
>;

export function directoryRoleFromDashboardRole(role: UserRole): EmployeeDirectoryRole {
  switch (role) {
    case 'Warehouse':
      return 'Warehouse Manager';
    case 'Logistics':
      return 'Logistics Manager';
    case 'Driver':
      return 'Truck Driver';
    case 'Agent':
    default:
      return 'Sales Agent';
  }
}
