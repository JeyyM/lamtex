import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useMatch } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { Bell, Menu, Settings } from 'lucide-react';
import { UserRole, Branch } from '@/src/types';
import { NotificationsDrawer } from '../dashboard/NotificationsDrawer';
import lamtexLogo from '../../assets/Lamtex Logo.png';
import { supabase } from '@/src/lib/supabase';
import { LAMTEX_BRANCHES_CHANGED_EVENT } from '@/src/lib/branches';
import { getSelectedBranch } from '@/src/lib/selectedBranchStorage';
import type { AppNotification } from '@/src/lib/notifications/types';
import {
  fetchUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
  subscribeToUserNotifications,
} from '@/src/lib/notifications/notificationsData';
import {
  unlockNotificationAudio,
  playNotificationSound,
  playChatNotificationSound,
} from '@/src/lib/notificationSound';

function NotificationBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1 -right-1 min-w-[1.25rem] h-5 px-1 bg-red-600 rounded-full border-2 border-white text-[11px] leading-none text-white font-bold flex items-center justify-center shadow-md tabular-nums pointer-events-none">
      {count > 9 ? '9+' : count}
    </span>
  );
}

export function Topbar() {
  const {
    role,
    setRole,
    branch,
    setBranch,
    isExecutiveUser,
    assignableDashboardRoles,
    profileLoaded,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    hideBranchSelector,
    session,
  } = useAppContext();
  const agentAnalyticsRoute = useMatch({ path: '/agents', end: true });
  const hideBranchOnAgentAnalytics = Boolean(agentAnalyticsRoute);
  const employeesRoute = useMatch({ path: '/employees', end: false });
  const hideBranchOnEmployees = Boolean(employeesRoute);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const prevNotificationsRef = useRef<AppNotification[]>([]);

  const roles: UserRole[] = ['Executive', 'Warehouse', 'Logistics', 'Agent', 'Driver'];
  const hasMultiDashboardRole = !isExecutiveUser && assignableDashboardRoles.length > 1;
  const rolePickerOptions: UserRole[] = isExecutiveUser ? roles : assignableDashboardRoles;
  const showRolePicker = isExecutiveUser || hasMultiDashboardRole;
  const [branches, setBranches] = useState<Branch[]>([]);

  const userId = session?.user?.id ?? null;

  const loadNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      return;
    }
    setNotificationsLoading(true);
    try {
      const rows = await fetchUserNotifications(userId);
      setNotifications(rows);
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[Topbar] notifications', e);
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    const loadBranches = () => {
      supabase
        .from('branches')
        .select('name')
        .eq('is_active', true)
        .order('name')
        .then(({ data }) => {
          if (cancelled || !data?.length) return;
          const names = data.map((b) => b.name as Branch);
          setBranches(names);
        });
    };
    loadBranches();
    const onRefresh = () => loadBranches();
    window.addEventListener(LAMTEX_BRANCHES_CHANGED_EVENT, onRefresh);
    return () => {
      cancelled = true;
      window.removeEventListener(LAMTEX_BRANCHES_CHANGED_EVENT, onRefresh);
    };
  }, []);

  useEffect(() => {
    if (branches.length === 0) return;
    if (branch && branches.includes(branch)) return;
    if (!isExecutiveUser) return;

    const stored = getSelectedBranch();
    const fallback = stored && branches.includes(stored) ? stored : branches[0];
    setBranch(fallback);
  }, [branches, branch, setBranch, isExecutiveUser]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const unlock = () => {
      void unlockNotificationAudio();
    };
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    return subscribeToUserNotifications(userId, () => {
      void loadNotifications();
    });
  }, [userId, loadNotifications]);

  useEffect(() => {
    if (!userId) return;
    const poll = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadNotifications();
    }, 20_000);
    return () => clearInterval(poll);
  }, [userId, loadNotifications]);

  useEffect(() => {
    const onRefresh = () => {
      void loadNotifications();
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void loadNotifications();
    };
    window.addEventListener('lamtex:notifications-refresh', onRefresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('lamtex:notifications-refresh', onRefresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loadNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const prev = prevNotificationsRef.current;
    if (prev.length > 0) {
      const prevIds = new Set(prev.map((n) => n.id));
      const newlyUnread = notifications.filter((n) => !n.read && !prevIds.has(n.id));
      if (newlyUnread.length > 0) {
        const chatOnly = newlyUnread.every(
          (n) => n.category === 'Message' || n.eventType === 'chat_message',
        );
        void (chatOnly ? playChatNotificationSound() : playNotificationSound());
      }
    }
    prevNotificationsRef.current = notifications;
  }, [notifications]);

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await markNotificationRead(id);
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[Topbar] mark read', e);
      void loadNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    if (!userId) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await markAllNotificationsRead(userId);
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[Topbar] mark all read', e);
      void loadNotifications();
    }
  };

  const handleDelete = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await deleteNotification(id);
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[Topbar] delete notification', e);
      void loadNotifications();
    }
  };

  const handleClearAll = async () => {
    if (!userId) return;
    if (!window.confirm('Clear all notifications? This cannot be undone.')) return;
    setNotifications([]);
    try {
      await clearAllNotifications(userId);
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[Topbar] clear all', e);
      void loadNotifications();
    }
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-10 ml-0 lg:ml-64">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link to="/" title="Go to Dashboard" className="lg:hidden flex min-w-0 flex-1 items-center rounded-md hover:opacity-90 transition-opacity">
          <img
            src={lamtexLogo}
            alt="Lamtex Logo"
            className="max-h-8 w-auto max-w-full object-contain object-left"
          />
        </Link>

        <div className="flex-1"></div>

        <div className="hidden md:flex items-center gap-4 lg:gap-6">
          {profileLoaded && !hideBranchSelector && !hideBranchOnAgentAnalytics && !hideBranchOnEmployees && (
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Branch:</span>
              {isExecutiveUser ? (
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value as Branch)}
                  className="text-sm border-gray-300 rounded-md shadow-sm focus:border-red-500 focus:ring-red-500 py-1.5 pl-3 pr-8"
                >
                  {branches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm font-medium text-gray-900">{branch || '—'}</span>
              )}
            </div>
          )}

          {profileLoaded && (
            isExecutiveUser ? (
              <div className="hidden lg:flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                <span className="text-xs font-medium text-red-800 uppercase tracking-wider">Simulate Role:</span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="text-sm bg-transparent border-none text-red-900 font-semibold focus:ring-0 py-0 pl-1 pr-6 cursor-pointer"
                >
                  {rolePickerOptions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            ) : hasMultiDashboardRole ? (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-100 bg-blue-50">
                <span className="text-xs font-medium text-blue-800 uppercase tracking-wider">Role:</span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="text-sm bg-transparent border-none text-blue-900 font-semibold focus:ring-0 py-0 pl-1 pr-6 cursor-pointer"
                >
                  {rolePickerOptions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Role:</span>
                <span className="text-sm font-semibold text-gray-900">{role}</span>
              </div>
            )
          )}

          <button
            className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            onClick={() => setIsNotificationsOpen(true)}
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <NotificationBadge count={unreadCount} />
          </button>
        </div>

        <div className="md:hidden flex items-center gap-2">
          {showRolePicker && profileLoaded && (
            <button
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => setIsMobileSettingsOpen(!isMobileSettingsOpen)}
              aria-label="Toggle settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          )}

          <button
            className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
            onClick={() => setIsNotificationsOpen(true)}
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <NotificationBadge count={unreadCount} />
          </button>
        </div>
      </header>

      {isMobileSettingsOpen && showRolePicker && profileLoaded && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setIsMobileSettingsOpen(false)}>
          <div
            className="absolute top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg p-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {!hideBranchSelector && !hideBranchOnAgentAnalytics && !hideBranchOnEmployees && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Branch</label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value as Branch)}
                  className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-red-500 focus:ring-red-500 py-2 px-3"
                >
                  {branches.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {isExecutiveUser ? 'Simulate Role' : 'Dashboard Role'}
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full text-sm border-gray-300 rounded-lg shadow-sm focus:border-red-500 focus:ring-red-500 py-2 px-3"
              >
                {rolePickerOptions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        loading={notificationsLoading}
        onMarkRead={handleMarkRead}
        onMarkAllRead={handleMarkAllRead}
        onDelete={handleDelete}
        onClearAll={handleClearAll}
      />
    </>
  );
}
