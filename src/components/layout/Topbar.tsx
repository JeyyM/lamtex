import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/src/store/AppContext';
import { Bell, Search, Menu, Calendar, X } from 'lucide-react';
import { UserRole, Branch } from '@/src/types';
import { NotificationsDrawer } from '../dashboard/NotificationsDrawer';
import { getNotificationsByBranch } from '@/src/mock/executiveDashboard';

export function Topbar() {
  const { role, setRole, branch, setBranch } = useAppContext();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(getNotificationsByBranch(branch));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [dateError, setDateError] = useState('');

  const roles: UserRole[] = ['Executive', 'Warehouse', 'Logistics', 'Agent'];
  const branches: Branch[] = ['All', 'Branch A', 'Branch B', 'Branch C'];

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Update notifications when branch changes
  useEffect(() => {
    setNotifications(getNotificationsByBranch(branch));
  }, [branch]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const validateDateRange = (from: string, to: string) => {
    const today = getTodayDate();
    
    if (!from || !to) {
      setDateError('Both dates are required');
      return false;
    }

    if (from > today) {
      setDateError('From date cannot be in the future');
      return false;
    }

    if (to > today) {
      setDateError('To date cannot be in the future');
      return false;
    }

    if (from > to) {
      setDateError('From date must be before To date');
      return false;
    }

    setDateError('');
    return true;
  };

  const handleDateFromChange = (value: string) => {
    setDateFrom(value);
    if (dateTo) {
      validateDateRange(value, dateTo);
    }
  };

  const handleDateToChange = (value: string) => {
    setDateTo(value);
    if (dateFrom) {
      validateDateRange(dateFrom, value);
    }
  };

  const applyDateRange = () => {
    if (validateDateRange(dateFrom, dateTo)) {
      setShowDatePicker(false);
      // Here you would typically dispatch this to your app context or state management
      console.log('Date range applied:', { from: dateFrom, to: dateTo });
    }
  };

  const clearDateRange = () => {
    setDateFrom('');
    setDateTo('');
    setDateError('');
  };

  const formatDateRange = () => {
    if (dateFrom && dateTo) {
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      return `${from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return 'Select Date Range';
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
          <div className="relative">
            <button
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="font-medium">{formatDateRange()}</span>
            </button>

            {showDatePicker && (
              <div className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 min-w-[320px]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Select Date Range</h3>
                  <button
                    onClick={() => setShowDatePicker(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => handleDateFromChange(e.target.value)}
                      max={getTodayDate()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => handleDateToChange(e.target.value)}
                      min={dateFrom || undefined}
                      max={getTodayDate()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>

                  {dateError && (
                    <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                      {dateError}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={applyDateRange}
                      disabled={!dateFrom || !dateTo || !!dateError}
                      className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Apply
                    </button>
                    <button
                      onClick={clearDateRange}
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}
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
