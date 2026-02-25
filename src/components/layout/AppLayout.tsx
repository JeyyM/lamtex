import React from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Outlet } from 'react-router-dom';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Topbar />
        <main className="flex-1 p-6 ml-64 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
