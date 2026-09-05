import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function ProtectedRoute({ allowedRoles }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading authentication...</div>;
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles?.length && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/sales/dashboard" replace />;
  }
  return <Outlet />;
}
