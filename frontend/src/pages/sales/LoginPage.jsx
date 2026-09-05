import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../api/authApi";
import { useAuth } from "../../contexts/AuthContext";
import { ShieldCheck, AlertTriangle } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      if (result.success) {
        login(result.token);
        navigate("/sales/dashboard");
      }
    } catch (err) {
      setError(err.message || "Failed to login. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f9fafb' }}>
      <div className="panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="brand-mark" style={{ margin: '0 auto 1rem', width: '48px', height: '48px', backgroundColor: '#2563eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>
            <ShieldCheck size={24} />
          </div>
          <h2>DealFlow360</h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Core Sales Login</p>
        </div>

        {error && (
          <div className="toast" style={{ position: 'relative', top: 0, right: 0, transform: 'none', marginBottom: '1rem', width: '100%', backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #f87171' }}>
            <AlertTriangle size={16} />
            <span style={{ fontSize: '0.875rem', flex: 1 }}>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Email</label>
            <input 
              type="email" 
              required
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="e.g. sales@dealflow360.com"
            />
          </div>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Password</label>
            <input 
              type="password" 
              required
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '4px' }}
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            className="primary-button" 
            disabled={loading}
            style={{ width: '100%', marginTop: '1rem', justifyContent: 'center' }}
          >
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
