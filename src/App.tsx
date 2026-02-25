import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './store/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { OrdersPage } from './pages/OrdersPage';
import { ProductsPage } from './pages/ProductsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { PlaceholderPage } from './pages/PlaceholderPage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="materials" element={<PlaceholderPage />} />
            <Route path="logistics" element={<PlaceholderPage />} />
            <Route path="customers" element={<PlaceholderPage />} />
            <Route path="suppliers" element={<PlaceholderPage />} />
            <Route path="finance" element={<PlaceholderPage />} />
            <Route path="reports" element={<PlaceholderPage />} />
            <Route path="audit" element={<AuditLogsPage />} />
            <Route path="settings" element={<PlaceholderPage />} />
            <Route path="*" element={<PlaceholderPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}



