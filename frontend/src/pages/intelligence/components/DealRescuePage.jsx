import React, { useEffect, useState } from 'react';
import { ArrowLeft, Zap, AlertTriangle, ArrowRight } from 'lucide-react';
import { intelligenceApi } from '../../../api/intelligenceApi';
import { PageHeader, Metric, Section, Signal, ActionRow } from './SharedPrimitives';
import { RiskTable } from './HealthComponents';

export default function DealRescuePage({ onNavigate }) {
  const [rescueStatus, setRescueStatus] = useState('Awaiting action');
  const [completedAction, setCompletedAction] = useState('');
  const [rescueActions, setRescueActions] = useState([]);
  const [rescueError, setRescueError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    intelligenceApi.dealRescue()
      .then((response) => {
        if (active) {
          setRescueActions(response.data || []);
          setRescueError("");
        }
      })
      .catch((error) => {
        if (active) setRescueError(error.message || "Rescue recommendations are unavailable.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const runAction = (label) => { 
    setCompletedAction(label); 
    setRescueStatus('Action in progress'); 
  };

  const highPriorityCount = rescueActions.filter((action) => action.priority === 'HIGH').length;
  const dealsCovered = new Set(rescueActions.map((action) => action.quotationId)).size;

  return (
    <>
      <div className="detail-backbar">
        <button className="back-button" onClick={() => onNavigate('health')}><ArrowLeft size={15} /> Back to dashboard</button>
        <span>Rescue workspace</span>
      </div>
      
      <PageHeader 
        eyebrow="Revenue Intelligence / Intervention desk" 
        title="Deal Rescue" 
        description="Move from risk to a coordinated intervention plan, then track the outcome protecting the forecast." 
      />
      
      <div className="metrics">
        <Metric label="Open rescue actions"    value={`${rescueActions.length} Actions`} detail="Generated from live deal-health signals" badge="API" tone="red" />
        <Metric label="High priority"          value={`${highPriorityCount} Actions`} detail="Requires timely intervention" badge="Priority" tone="amber"/>
        <Metric label="Deals covered"          value={`${dealsCovered} Deals`} detail="Shared quotation data" badge="Live" tone="teal" />
        <Metric label="Rescue status"          value={rescueStatus} detail={completedAction || 'Select playbook action'} badge={rescueStatus === 'Action in progress' ? 'Live' : 'Needs action'} tone={rescueStatus === 'Action in progress' ? 'teal' : 'red'} />
      </div>

      {loading && <div className="empty-state">Loading rescue actions...</div>}
      {rescueError && !loading && <div className="empty-state" style={{color: '#ef4444'}}>{rescueError}</div>}
      
      {!rescueError && !loading && (
        <Section title="Live rescue recommendations" icon={Zap}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Quotation</th><th>Priority</th><th>Action</th><th>Reason</th><th>Expected impact</th><th>Approval</th></tr>
              </thead>
              <tbody>
                {rescueActions.map((action, index) => (
                  <tr key={`${action.quotationId}-${index}`}>
                    <td><strong>{action.quotationNumber}</strong></td>
                    <td><span className={`status ${action.priority === 'HIGH' ? 'critical' : 'warning'}`}>{action.priority}</span></td>
                    <td>{action.action}</td>
                    <td>{action.reason}</td>
                    <td>{action.expectedImpact}</td>
                    <td>{action.approvalRequired ? 'Required' : 'Not required'}</td>
                  </tr>
                ))}
                {!rescueActions.length && <tr><td colSpan="6" className="empty-state">No active rescue actions.</td></tr>}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <Section title="Rescue workflow" icon={Zap}>
        <div className="rescue-flow">
          {[
            ['Risk', 'Health signals detected'], 
            ['Cause', 'Root causes identified'], 
            ['Impact', 'Revenue/Margin exposed'], 
            ['Recommendation', 'Playbook generated'], 
            ['Action', rescueStatus], 
            ['Outcome', completedAction ? 'Tracking result' : 'Pending execution']
          ].map(([label, detail], i) => (
            <div className={`rescue-stage ${i === 4 && rescueStatus === 'Action in progress' ? 'current' : ''}`} key={label}>
              <b>{i + 1}</b><strong>{label}</strong><small>{detail}</small>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
