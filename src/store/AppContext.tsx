import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserRole, Branch, AuditLog } from '../types';

interface AppContextType {
  role: UserRole;
  setRole: (role: UserRole) => void;
  branch: Branch;
  setBranch: (branch: Branch) => void;
  auditLogs: AuditLog[];
  addAuditLog: (action: string, entity: string, details: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole>('Executive');
  const [branch, setBranch] = useState<Branch>('All');
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

  const addAuditLog = (action: string, entity: string, details: string) => {
    const newLog: AuditLog = {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date().toISOString(),
      user: 'Current User', // In a real app, this would be the logged-in user
      role,
      action,
      entity,
      details,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  return (
    <AppContext.Provider value={{ role, setRole, branch, setBranch, auditLogs, addAuditLog }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
