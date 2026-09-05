import React from 'react';
import { BarChart3, Gauge, Filter } from 'lucide-react';
import { Section } from './SharedPrimitives';

export function HealthOverview({ onNavigate }) {
  return (
    <div className="health-overview">
      <Section title="Deal health and risk overview" icon={Gauge}>
        <div className="health-overview-grid">
          <div className="health-distribution">
            <div className="health-donut"><strong>64</strong><small>active deals</small></div>
            <div className="health-legend">
              <div><i className="legend-dot healthy" /><span>Healthy</span><strong>42 · 66%</strong></div>
              <div><i className="legend-dot warning" /><span>At risk</span><strong>14 · 22%</strong></div>
              <div><i className="legend-dot critical" /><span>Critical</span><strong>8 · 12%</strong></div>
            </div>
          </div>
          <div className="impact-summary">
            <div><small>Revenue exposed</small><strong>₹21.65 Cr</strong><span className="status critical">8 critical deals</span></div>
            <div><small>Margin under pressure</small><strong>4.8 pts</strong><span className="status warning">Below target</span></div>
            <div><small>Rescue success rate</small><strong>78%</strong><span className="status success">+12% vs last month</span></div>
          </div>
        </div>
      </Section>
      <Section title="Risk and revenue impact" icon={BarChart3}>
        <div className="impact-bars">
          <div className="impact-row"><span>Warehouse / fulfillment</span><div><i style={{ width: '78%' }} /></div><strong>₹9.2 Cr</strong></div>
          <div className="impact-row"><span>Commercial concessions</span><div><i style={{ width: '56%' }} /></div><strong>₹6.6 Cr</strong></div>
          <div className="impact-row"><span>Legal and contracting</span><div><i style={{ width: '38%' }} /></div><strong>₹3.4 Cr</strong></div>
          <div className="impact-row"><span>Stakeholder momentum</span><div><i style={{ width: '27%' }} /></div><strong>₹2.4 Cr</strong></div>
        </div>
      </Section>
    </div>
  );
}

import { useNavigate } from 'react-router-dom';

export function RiskTable({ risks = [], onNavigate }) {
  const navigate = useNavigate();
  return (
    <Section title="At-risk deals & prescribed interventions" icon={Filter} action={<button className="secondary-button compact">Filter risks</button>}>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Deal &amp; account</th><th>Total size</th><th>Health score</th>
              <th>Root cause / risk vector</th><th>Urgency</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {risks.map((deal) => (
              <tr key={deal.quotationId}>
                <td>
                  <button className="deal-link" onClick={() => navigate(`/sales/quotations/${deal.quotationId}`)}>
                    <strong>{deal.quotationNumber}</strong>
                  </button>
                </td>
                <td>₹{deal.totalValue?.toLocaleString() || 0}</td>
                <td>
                  <span className={`score ${deal.status === 'CRITICAL' ? 'critical' : 'warning'}`}>{deal.riskScore ?? 0} / 100</span>
                  <small>{deal.status}</small>
                </td>
                <td><span className="soft-tag">{deal.rootCauses?.join(', ') || 'No specific risk'}</span></td>
                <td><small>{deal.status === 'CRITICAL' ? 'Action within 24h' : 'Action within 48h'}</small></td>
                <td>
                  <button className="small-button" onClick={() => onNavigate('rescue')}>
                    {deal.status === 'CRITICAL' ? 'Open rescue' : 'Apply remedy'}
                  </button>
                </td>
              </tr>
            ))}
            {!risks.length && (
              <tr>
                <td colSpan="6" className="empty-state">No critical or at-risk deals currently detected.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
