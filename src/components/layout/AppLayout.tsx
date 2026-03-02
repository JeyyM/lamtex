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
        <main className={`flex-1 p-6 overflow-auto transition-all duration-300 ${
          isSidebarCollapsed ? 'ml-16' : 'ml-64'
        }`}>
          <div className="max-w-[1600px] mx-auto w-full px-4 2xl:px-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
