import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import SalesLayout from './components/layout/SalesLayout';

// Sales Pages
import LoginPage from './pages/sales/LoginPage';
import DashboardPage from './pages/sales/DashboardPage';
import CustomersPage from './pages/sales/CustomersPage';
import QuotationBuilderPage from './pages/sales/QuotationBuilderPage';
import QuotationDetailsPage from './pages/sales/QuotationDetailsPage';
import ApprovalsPage from './pages/sales/ApprovalsPage';
import OrdersPage from './pages/sales/OrdersPage';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Core Sales (Member 1) Routes */}
        <Route path="/sales" element={<ProtectedRoute />}>
          <Route element={<SalesLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            
            {/* Placeholders for next phases */}
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="quotations/new" element={<QuotationBuilderPage />} />
            <Route path="quotations/:id/edit" element={<QuotationBuilderPage />} />
            <Route path="quotations/:id" element={<QuotationDetailsPage />} />
            <Route path="approvals" element={<ApprovalsPage />} />
            <Route path="orders" element={<OrdersPage />} />
          </Route>
        </Route>

        {/* Fallback routing */}
        <Route path="/" element={<Navigate to="/sales/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/sales/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
