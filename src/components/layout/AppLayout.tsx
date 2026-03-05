import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Outlet } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';

export function AppLayout() {
  const { isSidebarCollapsed } = useAppContext();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />
        <main className={`flex-1 p-4 md:p-6 overflow-auto transition-all duration-300 ${
          isSidebarCollapsed ? 'ml-0 lg:ml-16' : 'ml-0 lg:ml-64'
        }`}>
          <div className="max-w-full lg:max-w-[1600px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
