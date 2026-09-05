import React, { createContext, useContext, useState, useEffect } from "react";
import { getAuthToken, removeAuthToken } from "../api/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Parse JWT token to get basic user info (optional, for displaying name/role if needed)
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUser({ id: payload.sub, role: payload.role });
        setIsAuthenticated(true);
      } catch (err) {
        removeAuthToken();
      }
    }
    setLoading(false);

    const handleAuthExpired = () => {
      setIsAuthenticated(false);
      setUser(null);
    };

    window.addEventListener("auth-expired", handleAuthExpired);
    return () => window.removeEventListener("auth-expired", handleAuthExpired);
  }, []);

  const login = (token) => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setUser({ id: payload.sub, role: payload.role });
      setIsAuthenticated(true);
    } catch (e) {
      console.error("Invalid token format");
    }
  };

  const logout = () => {
    removeAuthToken();
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
