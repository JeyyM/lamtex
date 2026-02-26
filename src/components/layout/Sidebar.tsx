import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Truck, 
  Users, 
  FileText, 
  Settings,
  Box,
  CreditCard,
  BarChart3,
  UserCheck,
  Warehouse
} from 'lucide-react';
import { cn } from '@/src/lib/utils';

export function Sidebar() {
  const { role } = useAppContext();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['Executive', 'Warehouse', 'Logistics', 'Agent'] },
    { name: 'Orders', path: '/orders', icon: ShoppingCart, roles: ['Executive', 'Agent', 'Warehouse', 'Logistics'] },
    { name: 'Products', path: '/products', icon: Package, roles: ['Executive', 'Warehouse', 'Agent'] },
    { name: 'Raw Materials', path: '/materials', icon: Box, roles: ['Executive', 'Warehouse', 'Agent'] },
    { name: 'Warehouse', path: '/warehouse', icon: Warehouse, roles: ['Executive', 'Warehouse'] },
    { name: 'Logistics', path: '/logistics', icon: Truck, roles: ['Executive', 'Logistics'] },
    { name: 'Customers', path: '/customers', icon: Users, roles: ['Executive', 'Agent'] },
    { name: 'Suppliers', path: '/suppliers', icon: Truck, roles: ['Executive', 'Procurement'] },
    { name: 'Invoices & Payments', path: '/finance', icon: CreditCard, roles: ['Executive', 'Finance', 'Agent'] },
    { name: 'Employees', path: '/employees', icon: Users, roles: ['Executive', 'Logistics', 'Warehouse'] },
    { name: 'Agent Analytics', path: '/agents', icon: UserCheck, roles: ['Executive'] },
    { name: 'Reports', path: '/reports', icon: BarChart3, roles: ['Executive', 'Finance'] },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['Executive'] },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(role));

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col fixed left-0 top-0">
      <div className="h-16 flex items-center px-6 border-b border-gray-200">
        <div className="flex items-center gap-2 text-red-600 font-bold text-xl tracking-tight">
          <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center text-white">
            L
          </div>
          LAMTEX
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3">
          {filteredNav.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive 
                  ? "bg-red-50 text-red-700" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-medium">
            {role.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{role} User</p>
            <p className="text-xs text-gray-500">View Profile</p>
          </div>
        </div>
      </div>
    </div>
  );
}
