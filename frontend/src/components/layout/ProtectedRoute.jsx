import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export default function ProtectedRoute({ allowedRoles, redirectTo }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading authentication...</div>;
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles?.length && !allowedRoles.includes(user?.role)) {
    // Use role-aware default redirect when no explicit redirectTo is given
    const fallback = redirectTo || (user?.role === "CUSTOMER" ? "/customer/negotiations" : "/sales/dashboard");
    return <Navigate to={fallback} replace />;
  }
  return <Outlet />;
}
