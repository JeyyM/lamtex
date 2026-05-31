import React, { useMemo } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '@/src/store/AppContext';
import { useOrderPermissions } from '@/src/lib/permissions/orderPermissions';
import { useProductPermissions } from '@/src/lib/permissions/productPermissions';
import { useMaterialPermissions } from '@/src/lib/permissions/materialPermissions';
import { useWarehousePermissions } from '@/src/lib/permissions/warehousePermissions';
import { useProductionRequestPermissions } from '@/src/lib/permissions/productionRequestPermissions';
import { usePurchaseOrderPermissions } from '@/src/lib/permissions/purchaseOrderPermissions';
import { useInterBranchRequestPermissions } from '@/src/lib/permissions/interBranchRequestPermissions';
import { useLogisticsPermissions } from '@/src/lib/permissions/logisticsPermissions';
import { useSupplierPermissions } from '@/src/lib/permissions/supplierPermissions';
import { useCustomerPermissions } from '@/src/lib/permissions/customerPermissions';
import { useFinancePermissions } from '@/src/lib/permissions/financePermissions';
import { useEmployeesPermissions } from '@/src/lib/permissions/employeesPermissions';
import { useAgentAnalyticsPermissions } from '@/src/lib/permissions/agentAnalyticsPermissions';
import { useReportsPermissions } from '@/src/lib/permissions/reportsPermissions';
import { useSettingsPermissions, hasAnySettingsTabAccess } from '@/src/lib/permissions/settingsPermissions';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Truck, 
  Users, 
  Settings,
  Box,
  CreditCard,
  BarChart3,
  UserCheck,
  Warehouse,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  X,
  LogOut,
  Factory,
  ClipboardList,
  GitBranch,
  Route,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import lamtexLogo from '../../assets/Lamtex Logo.png';

export function Sidebar() {
  const { role, profileLoaded, isSidebarCollapsed, setIsSidebarCollapsed, isMobileMenuOpen, setIsMobileMenuOpen, session, signOut } = useAppContext();
  const orderPerms = useOrderPermissions();
  const productPerms = useProductPermissions();
  const materialPerms = useMaterialPermissions();
  const warehousePerms = useWarehousePermissions();
  const productionRequestPerms = useProductionRequestPermissions();
  const purchaseOrderPerms = usePurchaseOrderPermissions();
  const interBranchRequestPerms = useInterBranchRequestPermissions();
  const logisticsPerms = useLogisticsPermissions();
  const supplierPerms = useSupplierPermissions();
  const customerPerms = useCustomerPermissions();
  const financePerms = useFinancePermissions();
  const employeesPerms = useEmployeesPermissions();
  const agentAnalyticsPerms = useAgentAnalyticsPermissions();
  const reportsPerms = useReportsPermissions();
  const settingsPerms = useSettingsPermissions();
  const navigate = useNavigate();
  const location = useLocation();

  type NavItem = {
    name: string;
    path: string;
    icon: LucideIcon;
    alsoActiveOn?: string[];
  };

  const filteredNav = useMemo(() => {
    const isVisible = (path: string): boolean => {
      switch (path) {
        case '/':
          return true;
        case '/orders':
          return orderPerms.pageAccess;
        case '/products':
          return productPerms.pageAccess;
        case '/materials':
          return materialPerms.pageAccess;
        case '/warehouse':
          return warehousePerms.pageAccess;
        case '/production-requests':
          return productionRequestPerms.pageAccess;
        case '/purchase-orders':
          return purchaseOrderPerms.pageAccess;
        case '/inter-branch-requests':
          return interBranchRequestPerms.pageAccess;
        case '/logistics':
          return logisticsPerms.pageAccess;
        case '/trips':
          return orderPerms.orderLoading && !logisticsPerms.pageAccess;
        case '/chats':
          return true;
        case '/customers':
          return customerPerms.pageAccess;
        case '/suppliers':
          return supplierPerms.pageAccess;
        case '/finance':
          return financePerms.pageAccess;
        case '/employees':
          return employeesPerms.pageAccess;
        case '/agents':
          return agentAnalyticsPerms.pageAccess;
        case '/reports':
          return reportsPerms.pageAccess;
        case '/settings':
          return hasAnySettingsTabAccess(settingsPerms);
        default:
          return true;
      }
    };

    const core: NavItem[] = [
      { name: 'Dashboard', path: '/', icon: LayoutDashboard },
      { name: 'Orders', path: '/orders', icon: ShoppingCart },
      { name: 'Products', path: '/products', icon: Package },
      { name: 'Raw Materials', path: '/materials', icon: Box },
    ].filter((item) => isVisible(item.path));

    const warehouseBlock: NavItem[] = warehousePerms.pageAccess
      ? [
          {
            name: 'Warehouse',
            path: '/warehouse',
            icon: Warehouse,
            alsoActiveOn: ['/production-requests', '/purchase-orders', '/inter-branch-requests'],
          },
        ]
      : [
          { name: 'Production Requests', path: '/production-requests', icon: Factory },
          { name: 'Purchase Orders', path: '/purchase-orders', icon: ClipboardList },
          { name: 'Inter-branch Requests', path: '/inter-branch-requests', icon: GitBranch },
        ].filter((item) => isVisible(item.path));

    const tail: NavItem[] = [
      ...(logisticsPerms.pageAccess
        ? [{ name: 'Logistics', path: '/logistics', icon: Truck }]
        : orderPerms.orderLoading
          ? [{ name: 'Trips', path: '/trips', icon: Route }]
          : []),
      { name: 'Chats', path: '/chats', icon: MessageCircle },
      { name: 'Customers', path: '/customers', icon: Users },
      { name: 'Suppliers', path: '/suppliers', icon: Truck, alsoActiveOn: ['/suppliers'] },
      { name: 'Finance', path: '/finance', icon: CreditCard },
      { name: 'Employees', path: '/employees', icon: Users, alsoActiveOn: ['/employees'] },
      { name: 'Agent Analytics', path: '/agents', icon: UserCheck, alsoActiveOn: ['/agents'] },
      { name: 'Reports', path: '/reports', icon: BarChart3, alsoActiveOn: ['/reports'] },
      { name: 'Settings', path: '/settings', icon: Settings, alsoActiveOn: ['/settings'] },
    ].filter((item) => isVisible(item.path));

    return [...core, ...warehouseBlock, ...tail];
  }, [
    orderPerms.pageAccess,
    orderPerms.orderLoading,
    productPerms.pageAccess,
    materialPerms.pageAccess,
    warehousePerms.pageAccess,
    productionRequestPerms.pageAccess,
    purchaseOrderPerms.pageAccess,
    interBranchRequestPerms.pageAccess,
    logisticsPerms.pageAccess,
    customerPerms.pageAccess,
    supplierPerms.pageAccess,
    financePerms.pageAccess,
    employeesPerms.pageAccess,
    agentAnalyticsPerms.pageAccess,
    reportsPerms.pageAccess,
    settingsPerms,
  ]);

  return (
    <>
      {/* Backdrop overlay for mobile drawer */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar / Mobile Drawer */}
      <div className={cn(
        "bg-white border-r border-gray-200 h-screen flex flex-col fixed left-0 top-0 z-40 transition-all duration-300",
        // Mobile: slide-out drawer with transform
        "w-64 max-w-[80vw] transform",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        // Desktop: fixed sidebar (always visible, no transform)
        "lg:translate-x-0",
        isSidebarCollapsed ? "lg:w-16" : "lg:w-64"
      )}>
        <div className="h-16 flex items-center gap-2 px-4 border-b border-gray-200">
          {/* Logo - hidden when collapsed on desktop */}
          <Link
            to="/"
            title="Go to Dashboard"
            onClick={() => setIsMobileMenuOpen(false)}
            className={cn(
              'flex-1 min-w-0 flex items-center rounded-md hover:opacity-90 transition-opacity',
              isSidebarCollapsed && 'lg:hidden',
            )}
          >
            <img
              src={lamtexLogo}
              alt="Lamtex Logo"
              className="max-h-10 w-auto max-w-full object-contain object-left"
            />
          </Link>

          {/* Collapse / close controls */}
          <div className={cn(
            'flex shrink-0 items-center',
            isSidebarCollapsed && 'lg:mx-auto',
          )}>
            {/* Close button (mobile only) - closes the drawer */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close menu"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>

            {/* Collapse toggle (desktop only) - toggles sidebar width */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="hidden lg:block p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? (
                <ChevronRight className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>
        </div>
      
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="space-y-1 px-3" aria-busy={!profileLoaded}>
          {!profileLoaded ? (
            <div className="space-y-2 px-1 py-2" aria-hidden="true">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : (
            filteredNav.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === '/'}
              title={isSidebarCollapsed ? item.name : ''}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => {
                const alsoActive =
                  'alsoActiveOn' in item &&
                  item.alsoActiveOn?.some(
                    (p) => location.pathname === p || location.pathname.startsWith(`${p}/`),
                  );
                const active = isActive || Boolean(alsoActive);
                return cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active ? 'bg-red-50 text-red-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  isSidebarCollapsed && 'lg:justify-center',
                );
              }}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span className={cn(
                isSidebarCollapsed && "lg:hidden"
              )}>{item.name}</span>
            </NavLink>
            ))
          )}
        </nav>
      </div>

      <div className="p-4 border-t border-gray-200">
        <div className={`flex items-center gap-3 ${isSidebarCollapsed && 'lg:justify-center'}`}>
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-medium flex-shrink-0">
            {session?.user?.email?.charAt(0).toUpperCase() ?? role.charAt(0)}
          </div>
          <div className={cn(
            "flex-1 min-w-0",
            isSidebarCollapsed && "lg:hidden"
          )}>
            <p className="text-sm font-medium text-gray-900 truncate">{session?.user?.email ?? `${role} User`}</p>
            <p className="text-xs text-gray-500">{role}</p>
          </div>
          {session && (
            <button
              onClick={async () => {
                await signOut();
                navigate('/login', { replace: true });
              }}
              title="Sign out"
              className={cn(
                "p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0",
                isSidebarCollapsed && "lg:hidden"
              )}
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
