import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import DealHealthPage from './components/DealHealthPage';
import DealRescuePage from './components/DealRescuePage';
import CustomerInsightsPage from './components/CustomerInsightsPage';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles.css';

export default function IntelligenceDashboard({ initialTab = 'health' }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect customers to their portal if they somehow navigate here
  if (user?.role === 'CUSTOMER') {
    return <Navigate to="/customer/portal" replace />;
  }

  // Handle local navigation mapped to routes
  const handleNavigate = (tab) => {
    if (tab === 'health') navigate('/intelligence/health');
    else if (tab === 'rescue') navigate('/intelligence/rescue');
    else if (tab === 'customer') navigate('/intelligence/customer');
    else if (tab === 'negotiation') navigate('/sales/negotiation');
  };

  return (
    <>
      {initialTab === 'health'       && <DealHealthPage onNavigate={handleNavigate} />}
      {initialTab === 'rescue'       && <DealRescuePage onNavigate={handleNavigate} />}
      {initialTab === 'customer'     && <CustomerInsightsPage onNavigate={handleNavigate} />}
      {initialTab === 'negotiation'  && <Navigate to="/sales/negotiation" replace />}
    </>
  );
}
