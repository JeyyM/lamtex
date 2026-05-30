import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { UserRole, Branch, AuditLog } from '../types';
import { supabase } from '@/src/lib/supabase';
import { fetchWarehouseAssignmentIds } from '@/src/lib/warehouseAssignments';
import { buildWarehouseAssignmentScope, type WarehouseAssignmentScope } from '@/src/lib/warehouseScope';
import { getSelectedBranch, setSelectedBranch, SELECTED_BRANCH_STORAGE_KEY } from '@/src/lib/selectedBranchStorage';
import { isExecutiveDashboardRole, resolveDashboardRole } from '@/src/lib/resolveDashboardRole';
import {
  fetchEmployeeOrderPermissions,
} from '@/src/lib/permissions/employeeOrderPermissions';
import {
  fetchEmployeeProductPermissions,
} from '@/src/lib/permissions/employeeProductPermissions';
import {
  fetchEmployeeMaterialPermissions,
} from '@/src/lib/permissions/employeeMaterialPermissions';
import {
  fetchEmployeeWarehousePermissions,
} from '@/src/lib/permissions/employeeWarehousePermissions';
import {
  fetchEmployeeProductionRequestPermissions,
} from '@/src/lib/permissions/employeeProductionRequestPermissions';
import {
  fetchEmployeePurchaseOrderPermissions,
} from '@/src/lib/permissions/employeePurchaseOrderPermissions';
import {
  fetchEmployeeInterBranchRequestPermissions,
} from '@/src/lib/permissions/employeeInterBranchRequestPermissions';
import {
  fetchEmployeeLogisticsPermissions,
} from '@/src/lib/permissions/employeeLogisticsPermissions';
import {
  fetchEmployeeSupplierPermissions,
} from '@/src/lib/permissions/employeeSupplierPermissions';
import {
  fetchEmployeeCustomerPermissions,
} from '@/src/lib/permissions/employeeCustomerPermissions';
import {
  fetchEmployeeFinancePermissions,
} from '@/src/lib/permissions/employeeFinancePermissions';
import {
  fetchEmployeeEmployeesPermissions,
} from '@/src/lib/permissions/employeeEmployeesPermissions';
import {
  fetchEmployeeAgentAnalyticsPermissions,
} from '@/src/lib/permissions/employeeAgentAnalyticsPermissions';
import {
  fetchEmployeeReportsPermissions,
} from '@/src/lib/permissions/employeeReportsPermissions';
import {
  fetchEmployeeSettingsPermissions,
} from '@/src/lib/permissions/employeeSettingsPermissions';
import { ALL_ORDER_PERMISSIONS_GRANTED, type OrderPermissionSet } from '@/src/lib/permissions/orderPermissions';
import { ALL_PRODUCT_PERMISSIONS_GRANTED, type ProductPermissionSet } from '@/src/lib/permissions/productPermissions';
import { ALL_MATERIAL_PERMISSIONS_GRANTED, type MaterialPermissionSet } from '@/src/lib/permissions/materialPermissions';
import { ALL_WAREHOUSE_PERMISSIONS_GRANTED, type WarehousePermissionSet } from '@/src/lib/permissions/warehousePermissions';
import {
  ALL_PRODUCTION_REQUEST_PERMISSIONS_GRANTED,
  type ProductionRequestPermissionSet,
} from '@/src/lib/permissions/productionRequestPermissions';
import {
  ALL_PURCHASE_ORDER_PERMISSIONS_GRANTED,
  type PurchaseOrderPermissionSet,
} from '@/src/lib/permissions/purchaseOrderPermissions';
import {
  ALL_INTER_BRANCH_REQUEST_PERMISSIONS_GRANTED,
  type InterBranchRequestPermissionSet,
} from '@/src/lib/permissions/interBranchRequestPermissions';
import { ALL_LOGISTICS_PERMISSIONS_GRANTED, type LogisticsPermissionSet } from '@/src/lib/permissions/logisticsPermissions';
import { ALL_SUPPLIER_PERMISSIONS_GRANTED, type SupplierPermissionSet } from '@/src/lib/permissions/supplierPermissions';
import {
  ALL_CUSTOMER_PERMISSIONS_DENIED,
  type CustomerPermissionSet,
} from '@/src/lib/permissions/customerPermissions';
import { ALL_FINANCE_PERMISSIONS_GRANTED, type FinancePermissionSet } from '@/src/lib/permissions/financePermissions';
import { ALL_EMPLOYEES_PERMISSIONS_GRANTED, type EmployeesPermissionSet } from '@/src/lib/permissions/employeesPermissions';
import {
  ALL_AGENT_ANALYTICS_PERMISSIONS_GRANTED,
  type AgentAnalyticsPermissionSet,
} from '@/src/lib/permissions/agentAnalyticsPermissions';
import { ALL_REPORTS_PERMISSIONS_GRANTED, type ReportsPermissionSet } from '@/src/lib/permissions/reportsPermissions';
import { ALL_SETTINGS_PERMISSIONS_GRANTED, type SettingsPermissionSet } from '@/src/lib/permissions/settingsPermissions';
import { resolveEmployeeDashboardRoles } from '@/src/lib/permissions/employeeUserRoles';
import {
  getStoredActiveDashboardRole,
  setStoredActiveDashboardRole,
} from '@/src/lib/selectedDashboardRoleStorage';
import type { Session } from '@supabase/supabase-js';

interface AppContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  branch: Branch;
  setBranch: (branch: Branch) => void;
  /** True when the logged-in employee has user_role Executive (can switch branch/role). */
  isExecutiveUser: boolean;
  /** False until employee profile (role/branch) is loaded for the current session. */
  profileLoaded: boolean;
  /** HR/dashboard role from the employee record (not affected by executive role simulation). */
  employeeDashboardRole: UserRole | null;
  /** Dashboard roles assigned to this employee (from employee_user_roles). */
  assignableDashboardRoles: UserRole[];
  auditLogs: AuditLog[];
  addAuditLog: (action: string, entity: string, details: string) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  hideBranchSelector: boolean;
  setHideBranchSelector: (hidden: boolean) => void;
  session: Session | null;
  sessionLoading: boolean;
  signOut: () => Promise<void>;
  employeeName: string;
  employeeId: string | null;
  assignedProductIds: string[] | null;
  assignedMaterialIds: string[] | null;
  warehouseScope: WarehouseAssignmentScope;
  warehouseScopeLoading: boolean;
  refreshWarehouseScope: () => Promise<void>;
  /** Loaded from employee_order_permissions for the signed-in user (null until fetched). */
  orderPermissions: OrderPermissionSet | null;
  refreshOrderPermissions: () => Promise<void>;
  /** Loaded from employee_product_permissions for the signed-in user (null until fetched). */
  productPermissions: ProductPermissionSet | null;
  refreshProductPermissions: () => Promise<void>;
  /** Loaded from employee_material_permissions for the signed-in user (null until fetched). */
  materialPermissions: MaterialPermissionSet | null;
  refreshMaterialPermissions: () => Promise<void>;
  warehousePermissions: WarehousePermissionSet | null;
  refreshWarehousePermissions: () => Promise<void>;
  productionRequestPermissions: ProductionRequestPermissionSet | null;
  refreshProductionRequestPermissions: () => Promise<void>;
  purchaseOrderPermissions: PurchaseOrderPermissionSet | null;
  refreshPurchaseOrderPermissions: () => Promise<void>;
  interBranchRequestPermissions: InterBranchRequestPermissionSet | null;
  refreshInterBranchRequestPermissions: () => Promise<void>;
  logisticsPermissions: LogisticsPermissionSet | null;
  refreshLogisticsPermissions: () => Promise<void>;
  supplierPermissions: SupplierPermissionSet | null;
  refreshSupplierPermissions: () => Promise<void>;
  customerPermissions: CustomerPermissionSet | null;
  refreshCustomerPermissions: () => Promise<void>;
  financePermissions: FinancePermissionSet | null;
  refreshFinancePermissions: () => Promise<void>;
  employeesPermissions: EmployeesPermissionSet | null;
  refreshEmployeesPermissions: () => Promise<void>;
  agentAnalyticsPermissions: AgentAnalyticsPermissionSet | null;
  refreshAgentAnalyticsPermissions: () => Promise<void>;
  reportsPermissions: ReportsPermissionSet | null;
  refreshReportsPermissions: () => Promise<void>;
  settingsPermissions: SettingsPermissionSet | null;
  refreshSettingsPermissions: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>('Executive');
  const [branch, setBranchState] = useState<Branch>(() => getSelectedBranch());
  const [isExecutiveUser, setIsExecutiveUser] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [employeeRole, setEmployeeRole] = useState<UserRole | null>(null);
  const [assignableDashboardRoles, setAssignableDashboardRoles] = useState<UserRole[]>([]);
  const [employeeBranch, setEmployeeBranch] = useState<Branch | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hideBranchSelector, setHideBranchSelector] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [employeeName, setEmployeeName] = useState<string>('');
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [assignedProductIds, setAssignedProductIds] = useState<string[] | null>(null);
  const [assignedMaterialIds, setAssignedMaterialIds] = useState<string[] | null>(null);
  const [warehouseScopeLoading, setWarehouseScopeLoading] = useState(false);
  const [orderPermissions, setOrderPermissions] = useState<OrderPermissionSet | null>(null);
  const [productPermissions, setProductPermissions] = useState<ProductPermissionSet | null>(null);
  const [materialPermissions, setMaterialPermissions] = useState<MaterialPermissionSet | null>(null);
  const [warehousePermissions, setWarehousePermissions] = useState<WarehousePermissionSet | null>(null);
  const [productionRequestPermissions, setProductionRequestPermissions] =
    useState<ProductionRequestPermissionSet | null>(null);
  const [purchaseOrderPermissions, setPurchaseOrderPermissions] = useState<PurchaseOrderPermissionSet | null>(null);
  const [interBranchRequestPermissions, setInterBranchRequestPermissions] =
    useState<InterBranchRequestPermissionSet | null>(null);
  const [logisticsPermissions, setLogisticsPermissions] = useState<LogisticsPermissionSet | null>(null);
  const [supplierPermissions, setSupplierPermissions] = useState<SupplierPermissionSet | null>(null);
  const [customerPermissions, setCustomerPermissions] = useState<CustomerPermissionSet | null>(null);
  const [financePermissions, setFinancePermissions] = useState<FinancePermissionSet | null>(null);
  const [employeesPermissions, setEmployeesPermissions] = useState<EmployeesPermissionSet | null>(null);
  const [agentAnalyticsPermissions, setAgentAnalyticsPermissions] =
    useState<AgentAnalyticsPermissionSet | null>(null);
  const [reportsPermissions, setReportsPermissions] = useState<ReportsPermissionSet | null>(null);
  const [settingsPermissions, setSettingsPermissions] = useState<SettingsPermissionSet | null>(null);
  /** True after the first successful profile+permissions hydration for this session. */
  const profileHydratedRef = useRef(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      id: '1',
      timestamp: new Date().toISOString(),
      user: 'System',
      role: 'Executive',
      action: 'System Initialized',
      entity: 'System',
      details: 'App started',
    }
  ]);

  const loadWarehouseScope = useCallback(async (empId: string | null, currentRole: UserRole) => {
    if (currentRole !== 'Warehouse' || !empId) {
      setAssignedProductIds(null);
      setAssignedMaterialIds(null);
      setWarehouseScopeLoading(false);
      return;
    }
    setWarehouseScopeLoading(true);
    try {
      const { productIds, materialIds } = await fetchWarehouseAssignmentIds(empId);
      setAssignedProductIds(productIds);
      setAssignedMaterialIds(materialIds);
    } catch (e) {
      if (import.meta.env.DEV) {
        console.warn('[warehouse scope]', e);
      }
      setAssignedProductIds([]);
      setAssignedMaterialIds([]);
    } finally {
      setWarehouseScopeLoading(false);
    }
  }, []);

  const refreshWarehouseScope = useCallback(async () => {
    await loadWarehouseScope(employeeId, role);
  }, [employeeId, loadWarehouseScope, role]);

  const refreshOrderPermissions = useCallback(async () => {
    if (!employeeId) {
      setOrderPermissions(null);
      return;
    }
    try {
      const perms = await fetchEmployeeOrderPermissions(employeeId);
      setOrderPermissions(perms);
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[order permissions]', e);
      setOrderPermissions({ ...ALL_ORDER_PERMISSIONS_GRANTED });
    }
  }, [employeeId]);

  const refreshProductPermissions = useCallback(async () => {
    if (!employeeId) {
      setProductPermissions(null);
      return;
    }
    try {
      const perms = await fetchEmployeeProductPermissions(employeeId);
      setProductPermissions(perms);
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[product permissions]', e);
      setProductPermissions({ ...ALL_PRODUCT_PERMISSIONS_GRANTED });
    }
  }, [employeeId]);

  const refreshMaterialPermissions = useCallback(async () => {
    if (!employeeId) {
      setMaterialPermissions(null);
      return;
    }
    try {
      const perms = await fetchEmployeeMaterialPermissions(employeeId);
      setMaterialPermissions(perms);
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[material permissions]', e);
      setMaterialPermissions({ ...ALL_MATERIAL_PERMISSIONS_GRANTED });
    }
  }, [employeeId]);

  const refreshWarehousePermissions = useCallback(async () => {
    if (!employeeId) {
      setWarehousePermissions(null);
      return;
    }
    try {
      const perms = await fetchEmployeeWarehousePermissions(employeeId);
      setWarehousePermissions(perms);
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[warehouse permissions]', e);
      setWarehousePermissions({ ...ALL_WAREHOUSE_PERMISSIONS_GRANTED });
    }
  }, [employeeId]);

  const refreshProductionRequestPermissions = useCallback(async () => {
    if (!employeeId) {
      setProductionRequestPermissions(null);
      return;
    }
    try {
      const perms = await fetchEmployeeProductionRequestPermissions(employeeId);
      setProductionRequestPermissions(perms);
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[production request permissions]', e);
      setProductionRequestPermissions({ ...ALL_PRODUCTION_REQUEST_PERMISSIONS_GRANTED });
    }
  }, [employeeId]);

  const refreshPurchaseOrderPermissions = useCallback(async () => {
    if (!employeeId) {
      setPurchaseOrderPermissions(null);
      return;
    }
    try {
      const perms = await fetchEmployeePurchaseOrderPermissions(employeeId);
      setPurchaseOrderPermissions(perms);
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[purchase order permissions]', e);
      setPurchaseOrderPermissions({ ...ALL_PURCHASE_ORDER_PERMISSIONS_GRANTED });
    }
  }, [employeeId]);

  const refreshInterBranchRequestPermissions = useCallback(async () => {
    if (!employeeId) {
      setInterBranchRequestPermissions(null);
      return;
    }
    try {
      const perms = await fetchEmployeeInterBranchRequestPermissions(employeeId);
      setInterBranchRequestPermissions(perms);
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[inter-branch request permissions]', e);
      setInterBranchRequestPermissions({ ...ALL_INTER_BRANCH_REQUEST_PERMISSIONS_GRANTED });
    }
  }, [employeeId]);

  const refreshLogisticsPermissions = useCallback(async () => {
    if (!employeeId) {
      setLogisticsPermissions(null);
      return;
    }
    try {
      const perms = await fetchEmployeeLogisticsPermissions(employeeId);
      setLogisticsPermissions(perms);
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[logistics permissions]', e);
      setLogisticsPermissions({ ...ALL_LOGISTICS_PERMISSIONS_GRANTED });
    }
  }, [employeeId]);

  const refreshSupplierPermissions = useCallback(async () => {
    if (!employeeId) {
      setSupplierPermissions(null);
      return;
    }
    try {
      const perms = await fetchEmployeeSupplierPermissions(employeeId);
      setSupplierPermissions(perms);
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[supplier permissions]', e);
      setSupplierPermissions({ ...ALL_SUPPLIER_PERMISSIONS_GRANTED });
    }
  }, [employeeId]);

  const refreshCustomerPermissions = useCallback(async () => {
    if (!employeeId) {
      setCustomerPermissions(null);
      return;
    }
    try {
      const perms = await fetchEmployeeCustomerPermissions(employeeId);
      setCustomerPermissions(perms);
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[customer permissions]', e);
      setCustomerPermissions({ ...ALL_CUSTOMER_PERMISSIONS_DENIED });
    }
  }, [employeeId]);

  const refreshFinancePermissions = useCallback(async () => {
    if (!employeeId) {
      setFinancePermissions(null);
      return;
    }
    try {
      const perms = await fetchEmployeeFinancePermissions(employeeId);
      setFinancePermissions(perms);
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[finance permissions]', e);
      setFinancePermissions({ ...ALL_FINANCE_PERMISSIONS_GRANTED });
    }
  }, [employeeId]);

  const refreshEmployeesPermissions = useCallback(async () => {
    if (!employeeId) {
      setEmployeesPermissions(null);
      return;
    }
    try {
      const perms = await fetchEmployeeEmployeesPermissions(employeeId);
      setEmployeesPermissions(perms);
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[employees permissions]', e);
      setEmployeesPermissions({ ...ALL_EMPLOYEES_PERMISSIONS_GRANTED });
    }
  }, [employeeId]);

  const refreshAgentAnalyticsPermissions = useCallback(async () => {
    if (!employeeId) {
      setAgentAnalyticsPermissions(null);
      return;
    }
    try {
      const perms = await fetchEmployeeAgentAnalyticsPermissions(employeeId);
      setAgentAnalyticsPermissions(perms);
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[agent analytics permissions]', e);
      setAgentAnalyticsPermissions({ ...ALL_AGENT_ANALYTICS_PERMISSIONS_GRANTED });
    }
  }, [employeeId]);

  const refreshReportsPermissions = useCallback(async () => {
    if (!employeeId) {
      setReportsPermissions(null);
      return;
    }
    try {
      const perms = await fetchEmployeeReportsPermissions(employeeId);
      setReportsPermissions(perms);
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[reports permissions]', e);
      setReportsPermissions({ ...ALL_REPORTS_PERMISSIONS_GRANTED });
    }
  }, [employeeId]);

  const refreshSettingsPermissions = useCallback(async () => {
    if (!employeeId) {
      setSettingsPermissions(null);
      return;
    }
    try {
      const perms = await fetchEmployeeSettingsPermissions(employeeId);
      setSettingsPermissions(perms);
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[settings permissions]', e);
      setSettingsPermissions({ ...ALL_SETTINGS_PERMISSIONS_GRANTED });
    }
  }, [employeeId]);

  const setBranch = useCallback(
    (next: Branch) => {
      if (!isExecutiveUser) return;
      setBranchState(next);
      setSelectedBranch(next);
    },
    [isExecutiveUser],
  );

  const setRole = useCallback(
    (next: UserRole) => {
      if (isExecutiveUser) {
        setRoleState(next);
        return;
      }
      if (assignableDashboardRoles.length > 1 && assignableDashboardRoles.includes(next)) {
        setRoleState(next);
        if (employeeId) setStoredActiveDashboardRole(employeeId, next);
      }
    },
    [isExecutiveUser, assignableDashboardRoles, employeeId],
  );

  useEffect(() => {
    if (isExecutiveUser) return;
    if (assignableDashboardRoles.length <= 1 && employeeRole) {
      setRoleState(employeeRole);
    }
    if (employeeBranch) {
      setBranchState(employeeBranch);
    }
  }, [isExecutiveUser, employeeRole, employeeBranch, assignableDashboardRoles]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SELECTED_BRANCH_STORAGE_KEY) return;
      if (!isExecutiveUser) return;
      setBranchState((event.newValue ?? '') as Branch);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [isExecutiveUser]);

  const fetchEmployeeSession = async (userId: string, email: string) => {
    const showBlockingLoad = !profileHydratedRef.current;
    if (showBlockingLoad) {
      setProfileLoaded(false);
    }
    const selectCols = 'id, employee_name, user_role, role, branches(name)';

    let row: {
      id: string;
      employee_name: string;
      user_role: UserRole | null;
      role: string | null;
      branches: { name: string } | { name: string }[] | null;
    } | null = null;

    const { data: byAuth } = await supabase
      .from('employees')
      .select(selectCols)
      .eq('auth_user_id', userId)
      .maybeSingle();

    if (byAuth) {
      row = byAuth as typeof row;
    } else {
      const { data: byEmail } = await supabase
        .from('employees')
        .select(selectCols)
        .eq('email', email)
        .maybeSingle();
      row = (byEmail as typeof row) ?? null;
    }

    if (!row) {
      setEmployeeName(email);
      setEmployeeId(null);
      setEmployeeRole(null);
      setAssignableDashboardRoles([]);
      setEmployeeBranch(null);
      setIsExecutiveUser(false);
      setOrderPermissions(null);
      setProductPermissions(null);
      setMaterialPermissions(null);
      setProfileLoaded(true);
      profileHydratedRef.current = true;
      return;
    }

    const branchJoin = row.branches;
    const branchName =
      branchJoin == null
        ? null
        : Array.isArray(branchJoin)
          ? branchJoin[0]?.name ?? null
          : branchJoin.name;

    const effectiveRole = resolveDashboardRole(row.user_role, row.role);
    const executive = isExecutiveDashboardRole(effectiveRole);

    const { roles: assignedRoles, primaryRole } = await resolveEmployeeDashboardRoles(
      row.id,
      row.user_role as UserRole | null,
    );
    const dashboardRoles =
      assignedRoles.length > 0 ? assignedRoles : effectiveRole ? [effectiveRole] : [];
    const primaryDashboardRole = primaryRole ?? effectiveRole;

    setEmployeeName(row.employee_name ?? email);
    setEmployeeId(row.id ?? null);
    setEmployeeRole(primaryDashboardRole);
    setAssignableDashboardRoles(dashboardRoles.filter((r) => r !== 'Executive'));
    setEmployeeBranch(branchName);
    setIsExecutiveUser(executive);

    if (row.id) {
      try {
        const [orderPerms, productPerms, materialPerms, whPerms, prPerms, poPerms, ibrPerms, logisticsPerms, supplierPerms, customerPerms, financePerms, employeesPerms, agentAnalyticsPerms, reportsPerms, settingsPerms] = await Promise.all([
          fetchEmployeeOrderPermissions(row.id),
          fetchEmployeeProductPermissions(row.id),
          fetchEmployeeMaterialPermissions(row.id),
          fetchEmployeeWarehousePermissions(row.id),
          fetchEmployeeProductionRequestPermissions(row.id),
          fetchEmployeePurchaseOrderPermissions(row.id),
          fetchEmployeeInterBranchRequestPermissions(row.id),
          fetchEmployeeLogisticsPermissions(row.id),
          fetchEmployeeSupplierPermissions(row.id),
          fetchEmployeeCustomerPermissions(row.id),
          fetchEmployeeFinancePermissions(row.id),
          fetchEmployeeEmployeesPermissions(row.id),
          fetchEmployeeAgentAnalyticsPermissions(row.id),
          fetchEmployeeReportsPermissions(row.id),
          fetchEmployeeSettingsPermissions(row.id),
        ]);
        setOrderPermissions(orderPerms);
        setProductPermissions(productPerms);
        setMaterialPermissions(materialPerms);
        setWarehousePermissions(whPerms);
        setProductionRequestPermissions(prPerms);
        setPurchaseOrderPermissions(poPerms);
        setInterBranchRequestPermissions(ibrPerms);
        setLogisticsPermissions(logisticsPerms);
        setSupplierPermissions(supplierPerms);
        setCustomerPermissions(customerPerms);
        setFinancePermissions(financePerms);
        setEmployeesPermissions(employeesPerms);
        setAgentAnalyticsPermissions(agentAnalyticsPerms);
        setReportsPermissions(reportsPerms);
        setSettingsPermissions(settingsPerms);
      } catch {
        setOrderPermissions({ ...ALL_ORDER_PERMISSIONS_GRANTED });
        setProductPermissions({ ...ALL_PRODUCT_PERMISSIONS_GRANTED });
        setMaterialPermissions({ ...ALL_MATERIAL_PERMISSIONS_GRANTED });
        setWarehousePermissions({ ...ALL_WAREHOUSE_PERMISSIONS_GRANTED });
        setProductionRequestPermissions({ ...ALL_PRODUCTION_REQUEST_PERMISSIONS_GRANTED });
        setPurchaseOrderPermissions({ ...ALL_PURCHASE_ORDER_PERMISSIONS_GRANTED });
        setInterBranchRequestPermissions({ ...ALL_INTER_BRANCH_REQUEST_PERMISSIONS_GRANTED });
        setLogisticsPermissions({ ...ALL_LOGISTICS_PERMISSIONS_GRANTED });
        setSupplierPermissions({ ...ALL_SUPPLIER_PERMISSIONS_GRANTED });
        setCustomerPermissions({ ...ALL_CUSTOMER_PERMISSIONS_DENIED });
        setFinancePermissions({ ...ALL_FINANCE_PERMISSIONS_GRANTED });
        setEmployeesPermissions({ ...ALL_EMPLOYEES_PERMISSIONS_GRANTED });
        setAgentAnalyticsPermissions({ ...ALL_AGENT_ANALYTICS_PERMISSIONS_GRANTED });
        setReportsPermissions({ ...ALL_REPORTS_PERMISSIONS_GRANTED });
        setSettingsPermissions({ ...ALL_SETTINGS_PERMISSIONS_GRANTED });
      }
    } else {
      setOrderPermissions(null);
      setProductPermissions(null);
      setMaterialPermissions(null);
      setWarehousePermissions(null);
      setProductionRequestPermissions(null);
      setPurchaseOrderPermissions(null);
      setInterBranchRequestPermissions(null);
      setLogisticsPermissions(null);
      setSupplierPermissions(null);
      setCustomerPermissions(null);
      setFinancePermissions(null);
      setEmployeesPermissions(null);
      setAgentAnalyticsPermissions(null);
      setReportsPermissions(null);
      setSettingsPermissions(null);
    }

    if (executive) {
      if (effectiveRole) setRoleState(effectiveRole);
      const stored = getSelectedBranch();
      if (stored) {
        setBranchState(stored);
      } else if (branchName) {
        setBranchState(branchName);
        setSelectedBranch(branchName);
      }
    } else {
      let activeRole = primaryDashboardRole ?? effectiveRole;
      if (dashboardRoles.length > 1 && row.id) {
        const stored = getStoredActiveDashboardRole(row.id);
        if (stored && dashboardRoles.includes(stored)) activeRole = stored;
      }
      if (activeRole) setRoleState(activeRole);
      if (branchName) {
        setBranchState(branchName);
        setSelectedBranch(branchName);
      }
    }

    setProfileLoaded(true);
    profileHydratedRef.current = true;
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setSessionLoading(false);
      if (s?.user?.email && s.user.id) void fetchEmployeeSession(s.user.id, s.user.email);
      else {
        profileHydratedRef.current = false;
        setEmployeeName('');
        setEmployeeId(null);
        setEmployeeRole(null);
        setAssignableDashboardRoles([]);
        setEmployeeBranch(null);
        setIsExecutiveUser(false);
        setOrderPermissions(null);
        setProductPermissions(null);
        setMaterialPermissions(null);
        setWarehousePermissions(null);
        setProductionRequestPermissions(null);
        setPurchaseOrderPermissions(null);
        setInterBranchRequestPermissions(null);
        setLogisticsPermissions(null);
        setSupplierPermissions(null);
        setCustomerPermissions(null);
        setFinancePermissions(null);
        setEmployeesPermissions(null);
        setAgentAnalyticsPermissions(null);
        setReportsPermissions(null);
        setSettingsPermissions(null);
        setProfileLoaded(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      // getSession() handles the first hydrate; token refresh does not change employee data.
      if (event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') return;
      if (s?.user?.email && s.user.id) void fetchEmployeeSession(s.user.id, s.user.email);
      else {
        profileHydratedRef.current = false;
        setEmployeeName('');
        setEmployeeId(null);
        setEmployeeRole(null);
        setAssignableDashboardRoles([]);
        setEmployeeBranch(null);
        setIsExecutiveUser(false);
        setOrderPermissions(null);
        setProductPermissions(null);
        setMaterialPermissions(null);
        setWarehousePermissions(null);
        setProductionRequestPermissions(null);
        setPurchaseOrderPermissions(null);
        setInterBranchRequestPermissions(null);
        setLogisticsPermissions(null);
        setSupplierPermissions(null);
        setCustomerPermissions(null);
        setFinancePermissions(null);
        setEmployeesPermissions(null);
        setAgentAnalyticsPermissions(null);
        setReportsPermissions(null);
        setSettingsPermissions(null);
        setProfileLoaded(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    void loadWarehouseScope(employeeId, role);
  }, [employeeId, role, loadWarehouseScope]);

  const signOut = async () => {
    await supabase.auth.signOut();
    profileHydratedRef.current = false;
    setSession(null);
    setEmployeeId(null);
    setEmployeeRole(null);
    setAssignableDashboardRoles([]);
    setEmployeeBranch(null);
    setIsExecutiveUser(false);
    setProfileLoaded(false);
    setAssignedProductIds(null);
    setAssignedMaterialIds(null);
    setOrderPermissions(null);
    setProductPermissions(null);
    setMaterialPermissions(null);
    setWarehousePermissions(null);
    setProductionRequestPermissions(null);
    setPurchaseOrderPermissions(null);
    setInterBranchRequestPermissions(null);
    setLogisticsPermissions(null);
    setSupplierPermissions(null);
    setCustomerPermissions(null);
    setFinancePermissions(null);
    setEmployeesPermissions(null);
    setAgentAnalyticsPermissions(null);
    setReportsPermissions(null);
    setSettingsPermissions(null);
  };

  const addAuditLog = (action: string, entity: string, details: string) => {
    const newLog: AuditLog = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      user: session?.user?.email ?? 'Unknown',
      role,
      action,
      entity,
      details,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const warehouseScope = useMemo(
    () => buildWarehouseAssignmentScope(isExecutiveUser, role, assignedProductIds, assignedMaterialIds),
    [isExecutiveUser, role, assignedProductIds, assignedMaterialIds],
  );

  return (
    <AppContext.Provider
      value={{
        role,
        setRole,
        branch,
        setBranch,
        isExecutiveUser,
        profileLoaded,
        employeeDashboardRole: employeeRole,
        assignableDashboardRoles,
        auditLogs,
        addAuditLog,
        isSidebarCollapsed,
        setIsSidebarCollapsed,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        hideBranchSelector,
        setHideBranchSelector,
        session,
        sessionLoading,
        signOut,
        employeeName,
        employeeId,
        assignedProductIds,
        assignedMaterialIds,
        warehouseScope,
        warehouseScopeLoading,
        refreshWarehouseScope,
        orderPermissions,
        refreshOrderPermissions,
        productPermissions,
        refreshProductPermissions,
        materialPermissions,
        refreshMaterialPermissions,
        warehousePermissions,
        refreshWarehousePermissions,
        productionRequestPermissions,
        refreshProductionRequestPermissions,
        purchaseOrderPermissions,
        refreshPurchaseOrderPermissions,
        interBranchRequestPermissions,
        refreshInterBranchRequestPermissions,
        logisticsPermissions,
        refreshLogisticsPermissions,
        supplierPermissions,
        refreshSupplierPermissions,
        customerPermissions,
        refreshCustomerPermissions,
        financePermissions,
        refreshFinancePermissions,
        employeesPermissions,
        refreshEmployeesPermissions,
        agentAnalyticsPermissions,
        refreshAgentAnalyticsPermissions,
        reportsPermissions,
        refreshReportsPermissions,
        settingsPermissions,
        refreshSettingsPermissions,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return { ...context, selectedBranch: context.branch };
};
