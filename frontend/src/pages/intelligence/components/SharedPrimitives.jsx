import React from 'react';
import { Activity, AlertTriangle } from 'lucide-react';

export function PageHeader({ eyebrow, title, description, action, onAction }) {
  return (
    <div className="page-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <button className="primary-button" onClick={onAction}>{action}</button>}
    </div>
  );
}

export function Metric({ label, value, detail, tone = 'blue', badge }) {
  return (
    <article className="metric">
      <div className="metric-top"><span>{label}</span>{badge && <em className={`badge ${tone}`}>{badge}</em>}</div>
      <strong className={tone === 'red' ? 'danger-text' : ''}>{value}</strong>
      <small>{detail}</small>
      <div className="meter"><i className={tone} /></div>
    </article>
  );
}

export function Section({ title, icon: Icon = Activity, children, action }) {
  return (
    <section className="panel">
      <div className="section-heading"><div><Icon size={16} /><h2>{title}</h2></div>{action}</div>
      {children}
    </section>
  );
}

export function Signal({ title, detail, tone }) {
  return (
    <div className="signal">
      <div className={`signal-icon ${tone || ''}`}><AlertTriangle size={14} /></div>
      <div><strong>{title}</strong><p>{detail}</p></div>
      <span className={`badge ${tone || ''}`}>{tone === 'red' ? 'Critical' : tone === 'amber' ? 'Warning' : 'Moderate'}</span>
    </div>
  );
}

export function ActionRow({ number, title, detail, button, onClick }) {
  return (
    <div className="action-row">
      <b>{number}</b>
      <div><strong>{title}</strong><p>{detail}</p></div>
      <button className="small-button" onClick={onClick}>{button}</button>
    </div>
  );
}
