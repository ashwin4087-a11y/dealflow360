import React from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
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
import FulfillmentLayout from './components/layout/Layout';
import FulfillmentDashboardPage from './pages/DashboardPage';
import OrderFulfillmentDetailPage from './pages/OrderFulfillmentDetailPage';
import WarehouseAllocationPage from './pages/WarehouseAllocationPage';
import BackordersPage from './pages/BackordersPage';
import InvoicesPage from './pages/InvoicesPage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import SubscriptionDetailPage from './pages/SubscriptionDetailPage';
import IntelligencePage from './pages/intelligence/MockApp';

function FulfillmentRouteLayout() {
  return (
    <FulfillmentLayout>
      <Outlet />
    </FulfillmentLayout>
  );
}

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

        <Route path="/fulfillment" element={<ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "FINANCE", "OPERATIONS"]} />}>
          <Route element={<FulfillmentRouteLayout />}>
            <Route index element={<FulfillmentDashboardPage />} />
            <Route path="orders/:orderId" element={<OrderFulfillmentDetailPage />} />
            <Route path="warehouse-allocation/:orderId" element={<WarehouseAllocationPage />} />
            <Route path="backorders" element={<BackordersPage />} />
            <Route path="invoices" element={<InvoicesPage />} />
            <Route path="invoices/:invoiceId" element={<InvoiceDetailPage />} />
            <Route path="subscriptions" element={<SubscriptionsPage />} />
            <Route path="subscriptions/:subscriptionId" element={<SubscriptionDetailPage />} />
          </Route>
        </Route>

        <Route path="/intelligence" element={<ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "FINANCE", "OPERATIONS"]} />}>
          <Route element={<SalesLayout />}>
            <Route index element={<IntelligencePage />} />
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
