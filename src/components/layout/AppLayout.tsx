import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Outlet, useLocation } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';

import { PermissionsLoadingShell } from '@/src/components/permissions/PermissionsLoadingShell';

export function AppLayout() {
  const { isSidebarCollapsed } = useAppContext();
  const location = useLocation();
  const isChatRoute = location.pathname.startsWith('/chats');

  useEffect(() => {
    if (!isChatRoute) return;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, [isChatRoute]);

  return (
    <div
      className={
        isChatRoute
          ? 'h-dvh max-h-dvh bg-gray-50 flex overflow-hidden'
          : 'min-h-screen bg-gray-50'
      }
    >
      <Sidebar />
      <div
        className={`flex flex-col transition-all duration-300 min-w-0 ${
          isChatRoute ? 'flex-1 min-h-0 overflow-hidden' : 'min-h-screen'
        }`}
      >
        <div className={isChatRoute ? 'shrink-0' : 'sticky top-0 z-30 shrink-0'}>
          <Topbar />
        </div>
        <main
          className={`transition-all duration-300 min-w-0 ${
            isChatRoute
              ? 'flex flex-1 flex-col min-h-0 p-0 overflow-hidden'
              : 'p-4 md:p-6'
          } ${
            isSidebarCollapsed ? 'ml-0 lg:ml-16' : 'ml-0 lg:ml-64'
          }`}
        >
          {isChatRoute ? (
            <div className="flex flex-1 flex-col min-h-0 w-full overflow-hidden">
              <PermissionsLoadingShell>
                <Outlet />
              </PermissionsLoadingShell>
            </div>
          ) : (
            <div className="max-w-full lg:max-w-[1600px] mx-auto w-full">
              <PermissionsLoadingShell>
                <Outlet />
              </PermissionsLoadingShell>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
