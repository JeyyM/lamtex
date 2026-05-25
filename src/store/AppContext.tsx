import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { UserRole, Branch, AuditLog } from '../types';
import { supabase } from '@/src/lib/supabase';
import { fetchWarehouseAssignmentIds } from '@/src/lib/warehouseAssignments';
import { buildWarehouseAssignmentScope, type WarehouseAssignmentScope } from '@/src/lib/warehouseScope';
import { getSelectedBranch, setSelectedBranch, SELECTED_BRANCH_STORAGE_KEY } from '@/src/lib/selectedBranchStorage';
import type { Session } from '@supabase/supabase-js';

interface AppContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  branch: Branch;
  setBranch: (branch: Branch) => void;
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
  const [role, setRole] = useState<UserRole>('Executive');
  const [branch, setBranchState] = useState<Branch>(() => getSelectedBranch());
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

  const setBranch = useCallback((next: Branch) => {
    setBranchState(next);
    setSelectedBranch(next);
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SELECTED_BRANCH_STORAGE_KEY) return;
      setBranchState((event.newValue ?? '') as Branch);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const fetchEmployeeSession = async (email: string) => {
    const { data } = await supabase
      .from('employees')
      .select('id, employee_name')
      .eq('email', email)
      .maybeSingle();
    setEmployeeName(data?.employee_name ?? email);
    setEmployeeId(data?.id ?? null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setSessionLoading(false);
      if (s?.user?.email) void fetchEmployeeSession(s.user.email);
      else {
        setEmployeeName('');
        setEmployeeId(null);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user?.email) void fetchEmployeeSession(s.user.email);
      else {
        setEmployeeName('');
        setEmployeeId(null);
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
