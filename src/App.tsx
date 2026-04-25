import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useAppContext } from './store/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { OrdersPage } from './pages/OrdersPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { ProductFormPage } from './pages/ProductFormPage';
import { RawMaterialsPage } from './pages/RawMaterialsPage';
import { MaterialDetailPage } from './pages/MaterialDetailPage';
import { MaterialFormPage } from './pages/MaterialFormPage';
import MaterialCategoryPage from './pages/MaterialCategoryPage';
import ProductCategoryPage from './pages/ProductCategoryPage';
import ProductFamilyPage from './pages/ProductFamilyPage';
import { LogisticsPage } from './pages/LogisticsPage';
import { CustomersPage } from './pages/CustomersPageNew';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
import { CustomerFormPage } from './pages/CustomerFormPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { FinancePageNew } from './pages/FinancePageNew';
import { ReportsPage } from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { PaymentPage } from './pages/PaymentPage';
import { PaymentSuccessPage } from './pages/PaymentSuccessPage';
import { ReceiptPage } from './pages/ReceiptPage';
import { InvoicePreviewPage } from './pages/InvoicePreviewPage';
import AgentAnalyticsPage from './pages/AgentAnalyticsPage';
import AgentProfilePage from './pages/AgentProfilePage';
import EmployeesPage from './pages/EmployeesPage';
import { PurchaseRequestsPage } from './pages/PurchaseRequestsPage';
import { PurchaseOrdersPage } from './pages/PurchaseOrdersPage';
import { PurchaseOrderDetailPage } from './pages/PurchaseOrderDetailPage';
import { ProductionRequestsPage } from './pages/ProductionRequestsPage';
import { ProductionRequestDetailPage } from './pages/ProductionRequestDetailPage';
import { TruckDetailPage } from './pages/TruckDetailPage';
import WarehousePage from './pages/WarehousePage';
import ChatsPage from './pages/ChatsPage';
import LoginPage from './pages/LoginPage';
import { Loader2 } from 'lucide-react';

/** Requires a valid Supabase session — otherwise redirects to /login */
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, sessionLoading } = useAppContext();

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

/** Redirect away from /login if already signed in */
function GuestOnly({ children }: { children: React.ReactNode }) {
  const { session, sessionLoading } = useAppContext();

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Login */}
      <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />

      {/* Public Routes - No Auth Required */}
      <Route path="/pay/:token" element={<PaymentPage />} />
      <Route path="/payment-success/:token" element={<PaymentSuccessPage />} />
      <Route path="/receipt/:id" element={<ReceiptPage />} />
      <Route path="/invoice/:orderId" element={<InvoicePreviewPage />} />
      
      {/* Protected Routes - Require Auth */}
      <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
            <Route index element={<Dashboard />} />
            <Route path="chats" element={<ChatsPage />} />
            <Route path="chats/:chatId" element={<ChatsPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="products/new" element={<ProductFormPage />} />
            <Route path="products/category/:categoryName" element={<ProductCategoryPage />} />
            <Route path="products/category/:categoryName/family/:familyId" element={<ProductFamilyPage />} />
            <Route path="products/:id" element={<ProductDetailPage />} />
            <Route path="products/:id/edit" element={<ProductFormPage />} />
            <Route path="materials" element={<RawMaterialsPage />} />
            <Route path="materials/new" element={<MaterialFormPage />} />
            <Route path="materials/category/:categoryName" element={<MaterialCategoryPage />} />
            <Route path="materials/category/:categoryName/details/:id" element={<MaterialDetailPage />} />
            <Route path="materials/:id" element={<MaterialDetailPage />} />
            <Route path="materials/:id/edit" element={<MaterialFormPage />} />
            <Route path="logistics" element={<LogisticsPage />} />
            <Route path="logistics/:vehicleId" element={<TruckDetailPage />} />
            <Route path="warehouse" element={<WarehousePage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/new" element={<CustomerFormPage />} />
            <Route path="customers/:id" element={<CustomerDetailPage />} />
            <Route path="customers/:id/edit" element={<CustomerFormPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="finance" element={<FinancePageNew />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="employees/:employeeId" element={<AgentProfilePage />} />
            <Route path="agents" element={<AgentAnalyticsPage />} />
            <Route path="agents/:agentId" element={<AgentProfilePage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="audit" element={<AuditLogsPage />} />
            <Route path="purchase-requests" element={<PurchaseRequestsPage />} />
            <Route path="purchase-requests/new/:materialId" element={<PurchaseRequestsPage />} />
            <Route path="purchase-orders" element={<PurchaseOrdersPage />} />
            <Route path="purchase-orders/:id" element={<PurchaseOrderDetailPage />} />
            <Route path="production-requests" element={<ProductionRequestsPage />} />
            <Route path="production-requests/:id" element={<ProductionRequestDetailPage />} />
            <Route path="*" element={<PlaceholderPage />} />
          </Route>
        </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProvider>
  );
}



