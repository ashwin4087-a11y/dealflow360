import React, { useState, useEffect } from 'react';
import { quotationApi } from '../../api/quotationApi';
import { BarChart3, TrendingUp, Target, DollarSign } from 'lucide-react';

export default function AnalyticsPage() {
  const [stats, setStats] = useState({ pipeline: 0, won: 0, activeDeals: 0, winRate: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await quotationApi.getQuotations();
        if (res.success) {
          const quotes = res.data;
          
          let pipeline = 0;
          let won = 0;
          let active = 0;
          let wonCount = 0;
          let totalClosed = 0;

          quotes.forEach(q => {
            const val = parseFloat(q.total || 0);
            if (q.status === 'ACCEPTED') {
              won += val;
              wonCount++;
              totalClosed++;
            } else if (q.status === 'REJECTED') {
              totalClosed++;
            } else {
              pipeline += val;
              active++;
            }
          });

          setStats({
            pipeline,
            won,
            activeDeals: active,
            winRate: totalClosed > 0 ? (wonCount / totalClosed) * 100 : 0
          });
        }
      } catch (err) {
        console.error("Failed to load analytics", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  if (loading) return <div style={{ padding: '2rem' }}>Loading analytics...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <BarChart3 size={28} color="#2563eb" />
        <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#1a1f36', margin: 0 }}>Analytics & Forecast</h1>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500 }}>
            <TrendingUp size={16} /> Total Pipeline
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#0f172a' }}>{formatCurrency(stats.pipeline)}</div>
          <div style={{ fontSize: '0.75rem', color: '#10b981', marginTop: '8px' }}>Active and pending deals</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500 }}>
            <DollarSign size={16} /> Closed Won
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981' }}>{formatCurrency(stats.won)}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>Accepted revenue</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500 }}>
            <Target size={16} /> Win Rate
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#3b82f6' }}>{stats.winRate.toFixed(1)}%</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>Based on closed deals</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', marginBottom: '8px', fontSize: '0.875rem', fontWeight: 500 }}>
            <BarChart3 size={16} /> Active Deals
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b' }}>{stats.activeDeals}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>In negotiation or draft</div>
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '2rem' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '16px' }}>Forecast Breakdown</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
            <span style={{ color: '#475569', fontWeight: 500 }}>Best Case (100% Pipeline)</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatCurrency(stats.pipeline + stats.won)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
            <span style={{ color: '#475569', fontWeight: 500 }}>Most Likely (Pipeline × Win Rate)</span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{formatCurrency(stats.won + (stats.pipeline * (stats.winRate / 100)))}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#475569', fontWeight: 500 }}>Commit (Closed Won)</span>
            <span style={{ fontWeight: 600, color: '#10b981' }}>{formatCurrency(stats.won)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
