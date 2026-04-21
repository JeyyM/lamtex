import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserRole, Branch, AuditLog } from '../types';
import { supabase } from '@/src/lib/supabase';
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
  // Auth
  session: Session | null;
  sessionLoading: boolean;
  signOut: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>('Executive');
  const [branch, setBranch] = useState<Branch>('');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
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

  // Listen for Supabase auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setSessionLoading(false);
    });

    // Subscribe to changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
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

  return (
    <AppContext.Provider value={{ role, setRole, branch, setBranch, auditLogs, addAuditLog, isSidebarCollapsed, setIsSidebarCollapsed, isMobileMenuOpen, setIsMobileMenuOpen, session, sessionLoading, signOut }}>
      {children}
    </AppContext.Provider>
  );  
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  // selectedBranch is an alias for branch (used by material pages)
  return { ...context, selectedBranch: context.branch };
};
