import React, { useEffect, useState } from 'react';
import { Gauge, Sparkles, AlertTriangle } from 'lucide-react';
import { intelligenceApi } from '../../../api/intelligenceApi';
import { PageHeader, Metric, Section, Signal, ActionRow } from './SharedPrimitives';
import { HealthOverview, RiskTable } from './HealthComponents';

export default function DealHealthPage({ onNavigate }) {
  const [health, setHealth] = useState([]);
  const [healthError, setHealthError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    intelligenceApi.dealHealth()
      .then((response) => {
        if (active) {
          setHealth(response.data || []);
          setHealthError("");
        }
      })
      .catch((error) => {
        if (active) setHealthError(error.message || "Deal health is unavailable.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const count = (status) => health.filter((deal) => deal.status === status).length;
  const atRiskDeals = health.filter((deal) => deal.status === 'CRITICAL' || deal.status === 'AT_RISK');

  return (
    <>
      <PageHeader
        eyebrow="Revenue Intelligence / Live telemetry"
        title="Deal Health Intelligence"
        description="AI-driven risk detection, margin erosion alerts, velocity tracking, and automated rescue actions across active enterprise revenue pipelines."
        action="Configure trigger rules"
        onAction={() => onNavigate('rules')}
      />
      
      <div className="metrics">
        <Metric label="Healthy Deals"      value={`${count('HEALTHY')} Deals`}   detail="Backend-evaluated active quotations"                  badge="Live" />
        <Metric label="At-Risk Deals"      value={`${count('AT_RISK')} Deals`}   detail="Discount, inactivity, approval, or negotiation signals" badge="Live" tone="amber" />
        <Metric label="Critical Deals"     value={`${count('CRITICAL')} Deals`}  detail="Multiple active risk signals"                       badge="Live" tone="red" />
        <Metric label="Deals Evaluated"    value={`${health.length} Deals`}       detail="Shared quotation data"                              badge="API" tone="teal" />
      </div>

      {loading && <div className="empty-state">Loading deal health...</div>}
      {healthError && !loading && <div className="empty-state" style={{color: '#ef4444'}}>{healthError}</div>}
      
      {!healthError && !loading && (
        <Section title="Live deal health" icon={Gauge}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Quotation</th><th>Status</th><th>Risk score</th><th>Root causes</th><th>Evaluated</th></tr>
              </thead>
              <tbody>
                {health.map((deal) => (
                  <tr key={deal.quotationId}>
                    <td><strong>{deal.quotationNumber}</strong></td>
                    <td>
                      <span className={`status ${deal.status === 'CRITICAL' ? 'critical' : deal.status === 'HEALTHY' ? 'success' : 'warning'}`}>
                        {deal.status}
                      </span>
                    </td>
                    <td>{deal.riskScore ?? 'Customer-safe'}</td>
                    <td>{deal.rootCauses?.join(', ') || 'No active risk signals'}</td>
                    <td>{new Date(deal.lastEvaluatedAt).toLocaleString()}</td>
                  </tr>
                ))}
                {!health.length && <tr><td colSpan="5" className="empty-state">No active quotations available.</td></tr>}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <HealthOverview onNavigate={onNavigate} />

      <Section title="Integrated deal health & automated rescue loop" icon={Sparkles}>
        <div className="stepper">
          {['Identify risk', 'Explain risk', 'Recommend action', 'Take action', 'Track outcome'].map((step, i) => (
            <div className={i === 0 ? 'step current' : 'step'} key={step}>
              <b>{i + 1}</b>
              <span>{step}<small>{['Signal telemetry', 'Root cause analysis', 'Prescriptive playbook', 'One-click execution', 'Telemetry & SLA guard'][i]}</small></span>
            </div>
          ))}
        </div>
      </Section>

      <RiskTable risks={atRiskDeals} onNavigate={onNavigate} />
    </>
  );
}
