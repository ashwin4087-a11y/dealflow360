import React, { useEffect, useState } from 'react';
import { Users, Target, Activity, ArrowLeft, Sparkles, CircleDollarSign } from 'lucide-react';
import { intelligenceApi } from '../../../api/intelligenceApi';
import { customerApi } from '../../../api/customerApi';
import { PageHeader, Section, Signal, ActionRow } from './SharedPrimitives';

export default function CustomerInsightsPage({ onNavigate }) {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customer, setCustomer] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    customerApi.getCustomers()
      .then((res) => {
        if (active && res.success) {
          setCustomers(res.data || []);
          if (res.data?.length > 0) {
            setSelectedCustomerId(res.data[0].id);
          }
        }
      })
      .catch((err) => {
        if (active) setError("Failed to load customers.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedCustomerId) return;
    let active = true;
    setLoading(true);
    
    Promise.all([
      customerApi.getCustomerById(selectedCustomerId),
      intelligenceApi.customerRecommendations(selectedCustomerId)
    ])
    .then(([custRes, recRes]) => {
      if (active) {
        setCustomer(custRes.data);
        setRecommendations(recRes.data || []);
        setError("");
      }
    })
    .catch((err) => {
      if (active) setError("Failed to load customer insights.");
    })
    .finally(() => {
      if (active) setLoading(false);
    });
    
    return () => { active = false; };
  }, [selectedCustomerId]);

  return (
    <>
      <div className="detail-backbar">
        <button className="back-button" onClick={() => onNavigate('health')}><ArrowLeft size={15} /> Back to dashboard</button>
        <span>Customer Insights</span>
      </div>
      
      <PageHeader 
        eyebrow="Revenue Intelligence / Account view" 
        title="Customer Insights" 
        description="Account health, stakeholder momentum, expansion signals, and next best actions for every strategic customer." 
      />

      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <label style={{ fontWeight: 600 }}>Select Customer:</label>
        <select 
          value={selectedCustomerId} 
          onChange={(e) => setSelectedCustomerId(e.target.value)}
          style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', minWidth: '250px' }}
        >
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {loading && <div className="empty-state">Loading insights...</div>}
      {error && !loading && <div className="empty-state" style={{color: '#ef4444'}}>{error}</div>}

      {!loading && !error && customer && (
        <>
          <div className="insight-grid">
            <Section title={customer.name} icon={Users}>
              <div className="account-heading">
                <div className="company-mark">{customer.name.substring(0, 2).toUpperCase()}</div>
                <div><strong>{customer.tier} account</strong><small>{customer.industry} · {customer.region}</small></div>
              </div>
              <div className="account-stats">
                <div><small>Account ID</small><strong>{customer.id}</strong></div>
                <div><small>Status</small><strong>Active</strong></div>
                <div><small>Intelligence</small><strong className="success-text">Enabled</strong></div>
              </div>
            </Section>
            
            <Section title="Account health" icon={Activity}>
              <div className="customer-health"><strong>Optimized</strong><div className="health-meter"><i style={{width: '80%', backgroundColor: '#059669'}} /></div><small>Strong engagement signals</small></div>
              <div className="customer-health-stats">
                <div><small>Renewal confidence</small><strong>High</strong></div>
                <div><small>Open risks</small><strong>0</strong></div>
                <div><small>Active opportunities</small><strong>{recommendations.length}</strong></div>
              </div>
            </Section>
          </div>

          <Section title="AI-Driven Product Recommendations" icon={Sparkles}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Type</th>
                    <th>Reason / Rationale</th>
                    <th>Potential Value</th>
                  </tr>
                </thead>
                <tbody>
                  {recommendations.map((rec) => (
                    <tr key={rec.product.id}>
                      <td><strong>{rec.product.name}</strong><small>{rec.product.sku}</small></td>
                      <td>
                        <span className={`badge ${rec.type === 'UPSELL' ? 'teal' : 'blue'}`}>
                          {rec.type}
                        </span>
                      </td>
                      <td>{rec.reason}</td>
                      <td>{rec.potentialValue ? `₹${Number(rec.potentialValue).toLocaleString("en-IN")}` : "Pricing available"}</td>
                    </tr>
                  ))}
                  {!recommendations.length && (
                    <tr><td colSpan="4" className="empty-state">No active recommendations for this account.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}
    </>
  );
}
