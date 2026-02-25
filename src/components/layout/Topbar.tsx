import React, { useState } from 'react';
import { useAppContext } from '@/src/store/AppContext';
import { Bell, Search, Menu, Calendar } from 'lucide-react';
import { UserRole, Branch } from '@/src/types';
import { NotificationsDrawer } from '../dashboard/NotificationsDrawer';
import { MOCK_NOTIFICATIONS } from '@/src/mock/executiveDashboard';

export function Topbar() {
  const { role, setRole, branch, setBranch } = useAppContext();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const roles: UserRole[] = ['Executive', 'Warehouse', 'Logistics', 'Agent', 'Finance', 'Procurement'];
  const branches: Branch[] = ['All', 'Branch A', 'Branch B', 'Branch C'];

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10 ml-64">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search orders, products, customers..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-transparent rounded-lg text-sm focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Date Range Selector */}
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select className="bg-transparent border-none focus:ring-0 py-0 pl-1 pr-6 cursor-pointer text-sm font-medium">
              <option>Today</option>
              <option>This Week</option>
              <option>This Month</option>
              <option>Custom</option>
            </select>
          </div>

          {/* Branch Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Branch:</span>
            <select 
              value={branch}
              onChange={(e) => setBranch(e.target.value as Branch)}
              className="text-sm border-gray-300 rounded-md shadow-sm focus:border-red-500 focus:ring-red-500 py-1.5 pl-3 pr-8"
            >
              {branches.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Role Switcher (For Prototype) */}
          <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
            <span className="text-xs font-medium text-red-800 uppercase tracking-wider">Simulate Role:</span>
            <select 
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="text-sm bg-transparent border-none text-red-900 font-semibold focus:ring-0 py-0 pl-1 pr-6 cursor-pointer"
            >
              {roles.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <button 
            className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            onClick={() => setIsNotificationsOpen(true)}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>
        </div>
      </header>

      {isNotificationsOpen && (
        <NotificationsDrawer 
          isOpen={isNotificationsOpen} 
          onClose={() => setIsNotificationsOpen(false)} 
          notifications={notifications}
          onMarkRead={handleMarkRead}
        />
      )}
    </>
  );
}
