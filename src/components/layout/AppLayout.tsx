import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Outlet, useLocation } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';

import { PermissionsLoadingShell } from '@/src/components/permissions/PermissionsLoadingShell';

export function AppLayout() {
  const { isSidebarCollapsed } = useAppContext();
  const location = useLocation();
  const isChatRoute = location.pathname.startsWith('/chats');

  return (
    <div
      className={
        isChatRoute
          ? 'h-screen bg-gray-50 flex overflow-hidden'
          : 'min-h-screen bg-gray-50'
      }
    >
      <Sidebar />
      <div
        className={`flex flex-col transition-all duration-300 ${
          isChatRoute ? 'flex-1 min-h-0' : 'min-h-screen'
        }`}
      >
        <div className={isChatRoute ? 'shrink-0' : 'sticky top-0 z-30 shrink-0'}>
          <Topbar />
        </div>
        <main
          className={`transition-all duration-300 ${
            isChatRoute ? 'flex-1 min-h-0 p-0 overflow-hidden' : 'p-4 md:p-6'
          } ${
            isSidebarCollapsed ? 'ml-0 lg:ml-16' : 'ml-0 lg:ml-64'
          }`}
        >
          <div
            className={
              isChatRoute
                ? 'w-full h-full min-h-0 overflow-hidden'
                : 'max-w-full lg:max-w-[1600px] mx-auto w-full'
            }
          >
            <PermissionsLoadingShell>
              <Outlet />
            </PermissionsLoadingShell>
          </div>
        </main>
      </div>
    </div>
  );
}
