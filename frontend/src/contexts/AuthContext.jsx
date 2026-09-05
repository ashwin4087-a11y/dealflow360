import React, { createContext, useContext, useState, useEffect } from "react";
import { getAuthToken, removeAuthToken, setAuthToken } from "../api/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState(null);

  const readTokenUser = (token) => {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (typeof payload.sub !== "string" || typeof payload.role !== "string") {
      throw new Error("Invalid token claims");
    }
    return { id: payload.sub, role: payload.role };
  };

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      try {
        setUser(readTokenUser(token));
        setIsAuthenticated(true);
      } catch {
        removeAuthToken();
        setUser(null);
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

  const login = (token, authenticatedUser) => {
    try {
      setAuthToken(token);
      setUser(authenticatedUser || readTokenUser(token));
      setIsAuthenticated(true);
    } catch {
      removeAuthToken();
      setUser(null);
      setIsAuthenticated(false);
      throw new Error("Invalid authentication response");
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
