import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { UserRole, Branch, AuditLog } from '../types';
import { supabase } from '@/src/lib/supabase';
import { fetchWarehouseAssignmentIds } from '@/src/lib/warehouseAssignments';
import { buildWarehouseAssignmentScope, type WarehouseAssignmentScope } from '@/src/lib/warehouseScope';
import { getSelectedBranch, setSelectedBranch, SELECTED_BRANCH_STORAGE_KEY } from '@/src/lib/selectedBranchStorage';
import { isExecutiveDashboardRole, resolveDashboardRole } from '@/src/lib/resolveDashboardRole';
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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [role, setRoleState] = useState<UserRole>('Executive');
  const [branch, setBranchState] = useState<Branch>(() => getSelectedBranch());
  const [isExecutiveUser, setIsExecutiveUser] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [employeeRole, setEmployeeRole] = useState<UserRole | null>(null);
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
      if (!isExecutiveUser) return;
      setRoleState(next);
    },
    [isExecutiveUser],
  );

  useEffect(() => {
    if (isExecutiveUser) return;
    if (employeeRole) setRoleState(employeeRole);
    if (employeeBranch) {
      setBranchState(employeeBranch);
    }
  }, [isExecutiveUser, employeeRole, employeeBranch]);

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
    setProfileLoaded(false);
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
      setEmployeeBranch(null);
      setIsExecutiveUser(false);
      setProfileLoaded(true);
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

    setEmployeeName(row.employee_name ?? email);
    setEmployeeId(row.id ?? null);
    setEmployeeRole(effectiveRole);
    setEmployeeBranch(branchName);
    setIsExecutiveUser(executive);

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
      if (effectiveRole) setRoleState(effectiveRole);
      if (branchName) {
        setBranchState(branchName);
        setSelectedBranch(branchName);
      }
    }

    setProfileLoaded(true);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setSessionLoading(false);
      if (s?.user?.email && s.user.id) void fetchEmployeeSession(s.user.id, s.user.email);
      else {
        setEmployeeName('');
        setEmployeeId(null);
        setEmployeeRole(null);
        setEmployeeBranch(null);
        setIsExecutiveUser(false);
        setProfileLoaded(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user?.email && s.user.id) void fetchEmployeeSession(s.user.id, s.user.email);
      else {
        setEmployeeName('');
        setEmployeeId(null);
        setEmployeeRole(null);
        setEmployeeBranch(null);
        setIsExecutiveUser(false);
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
    setSession(null);
    setEmployeeId(null);
    setEmployeeRole(null);
    setEmployeeBranch(null);
    setIsExecutiveUser(false);
    setProfileLoaded(false);
    setAssignedProductIds(null);
    setAssignedMaterialIds(null);
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
    () => buildWarehouseAssignmentScope(role, assignedProductIds, assignedMaterialIds),
    [role, assignedProductIds, assignedMaterialIds],
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
