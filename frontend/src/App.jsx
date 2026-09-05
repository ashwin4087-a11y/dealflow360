import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/layout/Layout';
import DashboardPage from './pages/DashboardPage';
import OrderFulfillmentDetailPage from './pages/OrderFulfillmentDetailPage';
import WarehouseAllocationPage from './pages/WarehouseAllocationPage';
import BackordersPage from './pages/BackordersPage';
import InvoicesPage from './pages/InvoicesPage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import SubscriptionDetailPage from './pages/SubscriptionDetailPage';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/fulfillment" replace />} />
        <Route path="/fulfillment" element={<DashboardPage />} />
        <Route path="/fulfillment/orders/:orderId" element={<OrderFulfillmentDetailPage />} />
        <Route path="/fulfillment/warehouse-allocation/:orderId" element={<WarehouseAllocationPage />} />
        <Route path="/fulfillment/backorders" element={<BackordersPage />} />
        <Route path="/fulfillment/invoices" element={<InvoicesPage />} />
        <Route path="/fulfillment/invoices/:invoiceId" element={<InvoiceDetailPage />} />
        <Route path="/fulfillment/subscriptions" element={<SubscriptionsPage />} />
        <Route path="/fulfillment/subscriptions/:subscriptionId" element={<SubscriptionDetailPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
