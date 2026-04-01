import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Outlet, useLocation } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';

export function AppLayout() {
  const { isSidebarCollapsed } = useAppContext();
  const location = useLocation();
  const isChatRoute = location.pathname.startsWith('/chats');

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="shrink-0">
          <Topbar />
        </div>
        <main className={`flex-1 min-h-0 transition-all duration-300 ${
          isChatRoute ? 'p-0 overflow-hidden' : 'p-4 md:p-6 overflow-auto'
        } ${
          isSidebarCollapsed ? 'ml-0 lg:ml-16' : 'ml-0 lg:ml-64'
        }`}>
          <div className={isChatRoute ? 'w-full h-full min-h-0 overflow-hidden' : 'max-w-full lg:max-w-[1600px] mx-auto w-full'}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
