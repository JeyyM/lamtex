import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './store/AppContext';
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
import { LogisticsPage } from './pages/LogisticsPage';
import { CustomersPage } from './pages/CustomersPageNew';
import { CustomerDetailPage } from './pages/CustomerDetailPage';
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
import { TruckDetailPage } from './pages/TruckDetailPage';
import WarehousePage from './pages/WarehousePage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes - No Auth Required */}
          <Route path="/pay/:token" element={<PaymentPage />} />
          <Route path="/payment-success/:token" element={<PaymentSuccessPage />} />
          <Route path="/receipt/:id" element={<ReceiptPage />} />
          <Route path="/invoice/:orderId" element={<InvoicePreviewPage />} />
          
          {/* Protected Routes - Require Auth */}
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="products/new" element={<ProductFormPage />} />
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
            <Route path="customers/:id" element={<CustomerDetailPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="finance" element={<FinancePageNew />} />
            <Route path="employees" element={<EmployeesPage />} />
            <Route path="employees/:employeeId" element={<AgentProfilePage />} />
            <Route path="agents" element={<AgentAnalyticsPage />} />
            <Route path="agents/:agentId" element={<AgentProfilePage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="audit" element={<AuditLogsPage />} />
            <Route path="*" element={<PlaceholderPage />} />
            <Route path="/purchase-requests" element={<PurchaseRequestsPage />} />
            <Route path="/purchase-requests/new/:materialId" element={<PurchaseRequestsPage />} />
            <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}



