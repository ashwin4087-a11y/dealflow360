import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../api/authApi";
import { useAuth } from "../../contexts/AuthContext";
import { AlertTriangle, Users } from "lucide-react";

const DEMO_ACCOUNTS = [
  { role: 'Sales Rep', email: 'sales@dealflow360.com', color: '#3b82f6' },
  { role: 'Manager', email: 'manager@dealflow360.com', color: '#8b5cf6' },
  { role: 'Finance', email: 'finance@dealflow360.com', color: '#10b981' },
  { role: 'Operations', email: 'ops@dealflow360.com', color: '#f59e0b' },
  { role: 'Customer', email: 'customer@dealflow360.com', color: '#ec4899' },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const result = await authApi.login(email, password);
      if (!result.success || !result.token) {
        throw new Error("Invalid authentication response");
      }
      login(result.token, result.user);
      navigate(
        result.user?.role === "CUSTOMER"
          ? "/customer/negotiations"
          : "/sales/dashboard",
        { replace: true },
      );
    } catch (err) {
      setError(err.message || "Failed to login. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f3f4f6' }}>
      <div className="panel" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/logo.png" alt="DealFlow360" className="login-brand-logo" style={{ display: 'block', margin: '0 auto 1rem', width: '48px', height: '48px', objectFit: 'contain' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}>DealFlow360</h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>Hackathon Demo Login</p>
        </div>

        {error && (
          <div className="toast" style={{ position: 'relative', top: 0, right: 0, transform: 'none', marginBottom: '1.5rem', width: '100%', backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #f87171' }}>
            <AlertTriangle size={16} />
            <span style={{ fontSize: '0.875rem', flex: 1 }}>{error}</span>
          </div>
        )}

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: '#4b5563', fontSize: '0.875rem', fontWeight: 600 }}>
            <Users size={16} /> Quick Select Persona
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {DEMO_ACCOUNTS.map(account => (
              <button
                key={account.role}
                type="button"
                onClick={() => setEmail(account.email)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '999px',
                  border: `1px solid ${email === account.email ? account.color : '#e5e7eb'}`,
                  backgroundColor: email === account.email ? `${account.color}15` : '#fff',
                  color: email === account.email ? account.color : '#4b5563',
                  fontSize: '0.75rem',
                  fontWeight: email === account.email ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {account.role}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#374151' }}>Email Address</label>
            <input 
              type="email" 
              required
              style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.95rem' }}
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Select a persona above"
            />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: '#374151' }}>Password</label>
            <input 
              type="password" 
              required
              style={{ width: '100%', padding: '0.625rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '0.95rem', backgroundColor: '#f9fafb' }}
              value={password}
              readOnly
            />
            <small style={{ display: 'block', marginTop: '4px', color: '#9ca3af', fontSize: '0.75rem' }}>* Password is pre-filled for demo</small>
          </div>

          <button 
            type="submit" 
            className="primary-button" 
            disabled={loading || !email}
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem', justifyContent: 'center', fontSize: '1rem', fontWeight: 600 }}
          >
            {loading ? "Authenticating..." : "Sign In to DealFlow360"}
          </button>
        </form>
      </div>
    </div>
  );
}
