import React, { useEffect, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowLeft, ArrowRight, BarChart3, Bell, Boxes, Check,
  ChevronDown, ChevronRight, CircleDollarSign, ClipboardCheck, FileText, Filter, Gauge,
  LayoutDashboard, LogOut, MoreVertical, PackageCheck, PanelLeft, Search,
  ShieldCheck, Sparkles, Target, Truck, Users, X, Zap
} from 'lucide-react';
import '../../styles.css';
import { useAuth } from '../../contexts/AuthContext';
import { intelligenceApi } from '../../api/intelligenceApi';

// ─── Storage keys (as specified in requirements) ───────────────────────────────
const SK = {
  QUOTES: 'dealflow360_quotations',
  ROLE:   'dealflow360_user_role',
};

// ─── Seed quotations (shared across all roles) ─────────────────────────────────
const SEED_QUOTES = [
  { id: 'Q-1001', customer: 'Helios Health System',  product: 'Enterprise Diagnostics Cloud',  unitPrice: 1000000, cost: 700000, quantity: 10, discount: 12, stage: 'Final negotiation',      expectedClose: '2026-09-30', status: 'Pending Manager Approval' },
  { id: 'Q-1002', customer: 'Apex Logistics',         product: 'Warehouse Automation Suite',    unitPrice: 500000,  cost: 320000, quantity: 5,  discount: 8,  stage: 'Proposal / Price Quote', expectedClose: '2026-10-15', status: 'Approved'                   },
  { id: 'Q-1003', customer: 'Titan BioPharma',        product: 'Clinical Analytics Platform',  unitPrice: 1500000, cost: 950000, quantity: 4,  discount: 16, stage: 'Needs Analysis',         expectedClose: '2026-11-01', status: 'Pending Manager Approval' },
];

// ─── Risk deals (static demo data for existing intelligence pages) ─────────────
const RISK_DEALS = [
  { account: 'Helios Health System', title: 'Enterprise Diagnostics Cloud', value: '₹7,47,60,000', score: 48, state: 'Critical', reason: 'Warehouse shortage & discount pressure' },
  { account: 'Apex Logistics',        title: 'Warehouse Automation Suite',   value: '₹2,50,00,000', score: 64, state: 'Warning',  reason: 'Stakeholder inactivity'               },
  { account: 'Titan BioPharma',       title: 'Clinical Analytics Platform', value: '₹6,00,00,000', score: 58, state: 'Warning',  reason: 'Legal redline delays'                 },
];

// ─── Helpers — NaN-safe arithmetic ────────────────────────────────────────────
const safeNum = (v, fallback = 0) => { const n = Number(v); return Number.isFinite(n) ? n : fallback; };
const fmt     = (v) => `₹${Math.round(safeNum(v)).toLocaleString('en-IN')}`;
const pct     = (v, d = 2) => `${safeNum(v).toFixed(d)}%`;

/**
 * calcQuote — derives all financial fields from a raw quote record.
 * Accepts both unitPrice and productPrice field names for backward compat.
 * NEVER produces NaN; safeNum guarantees finite numbers throughout.
 */
const calcQuote = (q) => {
  const unitPrice  = safeNum(q.unitPrice  ?? q.productPrice);
  const cost       = safeNum(q.cost);
  const quantity   = safeNum(q.quantity, 1);
  const discount   = safeNum(q.discount);
  const finalPrice = unitPrice * quantity * (1 - discount / 100);
  const totalCost  = cost * quantity;
  const margin     = finalPrice > 0 ? ((finalPrice - totalCost) / finalPrice) * 100 : 0;
  const health     = margin >= 15 ? 'Healthy' : margin >= 10 ? 'Warning' : 'Critical';
  return { unitPrice, cost, quantity, discount, finalPrice, totalCost, margin, health, needsApproval: discount > 10 };
};

// ─── Navigation config ─────────────────────────────────────────────────────────
const NAV_GROUPS = [
  { label: 'Sales', items: [
    ['Sales Dashboard',        'sales',       LayoutDashboard],
    ['Quotes & Pricing',       'quotes',      FileText       ],
    ['Discount Approvals',     'approvals',   ClipboardCheck ],
    ['Contracts & Terms',      'contracts',   FileText       ],
  ]},
  { label: 'Fulfillment', items: [
    ['Fulfillment Dashboard',  'fulfillment', PackageCheck   ],
    ['Orders & Allocation',    'orders',      Truck          ],
    ['Warehouse & Inventory',  'warehouse',   Boxes          ],
    ['Backorders',             'backorders',  AlertTriangle  ],
    ['Billing & Invoices',     'billing',     CircleDollarSign],
  ]},
  { label: 'Revenue Intelligence', items: [
    ['Deal Health Radar',      'health',      Gauge          ],
    ['Deal Rescue',            'rescue',      Zap            ],
    ['Customer Insights',      'customer',    Users          ],
    ['Negotiation Intelligence','negotiation',Target         ],
  ]},
];

// Nav keys each role is allowed to see
const ROLE_NAV = {
  sales:    ['sales', 'quotes', 'approvals', 'contracts'],
  manager:  ['sales', 'quotes', 'approvals', 'contracts', 'fulfillment', 'orders', 'warehouse', 'backorders', 'billing', 'health', 'rescue', 'customer', 'negotiation'],
  customer: ['quotes'],
};

const ROLE_LABELS = {
  sales:    'Sales Representative',
  manager:  'Sales Manager',
  customer: 'Customer Portal',
};

// ─── LoginPage — compact sign-in form ─────────────────────────────────────────
const ROLE_OPTIONS = [
  { key: 'sales',    label: 'Sales Rep' },
  { key: 'manager',  label: 'Sales Manager' },
  { key: 'customer', label: 'Customer Portal' },
];

const ROLE_PERMS = {
  sales:    ['Create & edit quotations', 'What-If Simulator — apply scenarios', 'Submit for manager approval'],
  manager:  ['Review all quotations', 'Approve / Reject deals', 'What-If Simulator — read-only review'],
  customer: ['View your quotations', 'Accept or request a counteroffer', 'See final pricing & status'],
};

function LoginPage({ onLogin }) {
  const [selected, setSelected] = useState('sales');
  const perms = ROLE_PERMS[selected] || [];

  return (
    <div className="login-page">
      <div className="login-form-card">
        {/* Branding — logo preserved exactly as-is */}
        <div className="lf-brand">
          <img src="/logo.png" alt="DealFlow360" className="lf-logo" />
          <div>
            <strong>DealFlow360</strong>
            <small>Revenue Operating System</small>
          </div>
        </div>

        <h1 className="lf-title">Sign in to DealFlow360</h1>
        <p className="lf-sub">Select a demo role to enter the application.</p>

        <div className="lf-field">
          <label htmlFor="role-select">Role</label>
          <select
            id="role-select"
            value={selected}
            onChange={e => setSelected(e.target.value)}
          >
            {ROLE_OPTIONS.map(r => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </select>
        </div>

        {/* Live permission preview for selected role */}
        <ul className="lf-perms">
          {perms.map(p => (
            <li key={p}><Check size={11} /><span>{p}</span></li>
          ))}
        </ul>

        <button
          id="sign-in-btn"
          className="lf-submit"
          onClick={() => onLogin(selected)}
        >
          Sign In
        </button>

        <p className="lf-note">Demo mode · data stored in your browser · no server required</p>
      </div>
    </div>
  );
}

// ─── Sidebar (role-filtered nav) ───────────────────────────────────────────────
function Sidebar({ active, onNavigate, role }) {
  const allowed = ROLE_NAV[role] || [];
  const groups  = NAV_GROUPS
    .map(g => ({ ...g, items: g.items.filter(([, k]) => allowed.includes(k)) }))
    .filter(g => g.items.length > 0);
  const [exp, setExp] = useState(() => Object.fromEntries(groups.map(g => [g.label, true])));

  return (
    <aside className="sidebar">
      <div className="brand">
        <img src="/logo.png" alt="DealFlow360" className="sidebar-brand-logo" />
        <div><strong>DealFlow360</strong><small>Revenue OS</small></div>
      </div>
      <div className="nav-scroll">
        {groups.map((group) => {
          const isExp = exp[group.label];
          const hasActive = group.items.some(([, k]) => k === active);
          return (
            <section key={group.label} className={`nav-group ${hasActive ? 'has-active' : ''}`}>
              <button className="nav-segment" onClick={() => setExp(p => ({ ...p, [group.label]: !p[group.label] }))}>
                <span>{group.label}</span>
                {isExp ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>
              {isExp && (
                <div className="nav-items">
                  {group.items.map(([label, key, Icon]) => (
                    <button key={key} className={`nav-item ${active === key ? 'active' : ''}`} onClick={() => onNavigate(key)}>
                      <Icon size={16} /><span>{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
      <div className="profile">
        <div className="avatar">{role === 'manager' ? 'SM' : role === 'customer' ? 'CP' : 'SR'}</div>
        <div><strong>{ROLE_LABELS[role]}</strong><small>DealFlow360 · Demo</small></div>
        <MoreVertical size={16} />
      </div>
    </aside>
  );
}

// ─── Shared UI primitives ──────────────────────────────────────────────────────
function PageHeader({ eyebrow, title, description, action, onAction }) {
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

function Metric({ label, value, detail, tone = 'blue', badge }) {
  return (
    <article className="metric">
      <div className="metric-top"><span>{label}</span>{badge && <em className={`badge ${tone}`}>{badge}</em>}</div>
      <strong className={tone === 'red' ? 'danger-text' : ''}>{value}</strong>
      <small>{detail}</small>
      <div className="meter"><i className={tone} /></div>
    </article>
  );
}

function Section({ title, icon: Icon = Activity, children, action }) {
  return (
    <section className="panel">
      <div className="section-heading"><div><Icon size={16} /><h2>{title}</h2></div>{action}</div>
      {children}
    </section>
  );
}

function Signal({ title, detail, tone }) {
  return (
    <div className="signal">
      <div className={`signal-icon ${tone || ''}`}><AlertTriangle size={14} /></div>
      <div><strong>{title}</strong><p>{detail}</p></div>
      <span className={`badge ${tone || ''}`}>{tone === 'red' ? 'Critical' : tone === 'amber' ? 'Warning' : 'Moderate'}</span>
    </div>
  );
}

function ActionRow({ number, title, detail, button, onClick }) {
  return (
    <div className="action-row">
      <b>{number}</b>
      <div><strong>{title}</strong><p>{detail}</p></div>
      <button className="small-button" onClick={onClick}>{button}</button>
    </div>
  );
}

function RiskTable({ onNavigate }) {
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
            {RISK_DEALS.map((deal) => (
              <tr key={deal.account}>
                <td>
                  <button className="deal-link" onClick={() => onNavigate('deal-detail')}>
                    <strong>{deal.account}</strong><small>{deal.title}</small>
                  </button>
                </td>
                <td>{deal.value}</td>
                <td>
                  <span className={`score ${deal.state === 'Critical' ? 'critical' : 'warning'}`}>{deal.score} / 100</span>
                  <small>{deal.state}</small>
                </td>
                <td><span className="soft-tag">{deal.reason}</span></td>
                <td><small>{deal.state === 'Critical' ? 'Action within 24h' : 'Action within 48h'}</small></td>
                <td>
                  <button className="small-button" onClick={() => onNavigate('rescue')}>
                    {deal.state === 'Critical' ? 'Open rescue' : 'Apply remedy'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

// ─── Existing intelligence pages (unchanged layout) ────────────────────────────
function HealthPage({ onNavigate }) {
  const [health, setHealth] = useState([]);
  const [healthError, setHealthError] = useState("");

  useEffect(() => {
    intelligenceApi.dealHealth()
      .then((response) => setHealth(response.data || []))
      .catch((error) => setHealthError(error.message || "Deal health is unavailable."));
  }, []);

  const count = (status) => health.filter((deal) => deal.status === status).length;
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
      {healthError && <div className="empty-state">{healthError}</div>}
      {!healthError && <Section title="Live deal health" icon={Gauge}>
        <div className="table-wrap"><table><thead><tr><th>Quotation</th><th>Status</th><th>Risk score</th><th>Root causes</th><th>Evaluated</th></tr></thead><tbody>
          {health.map((deal) => <tr key={deal.quotationId}><td><strong>{deal.quotationNumber}</strong></td><td><span className={`status ${deal.status === 'CRITICAL' ? 'critical' : deal.status === 'HEALTHY' ? 'success' : 'warning'}`}>{deal.status}</span></td><td>{deal.riskScore ?? 'Customer-safe'}</td><td>{deal.rootCauses?.join(', ') || 'No active risk signals'}</td><td>{new Date(deal.lastEvaluatedAt).toLocaleString()}</td></tr>)}
          {!health.length && <tr><td colSpan="5" className="empty-state">No active quotations available.</td></tr>}
        </tbody></table></div>
      </Section>}
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
      <Section title="Active high-urgency case" icon={AlertTriangle} action={<span className="status critical">Critical alert · 48</span>}>
        <div className="case-layout">
          <div>
            <span className="case-label">Helios Health System · Enterprise Diagnostics Cloud</span>
            <p className="case-copy">Warehouse component OptiSensor Pro-4 has a 14-day backorder in WH-01, directly stalling the clinical pilot milestone.</p>
            <div className="signal-list">
              <Signal title="Warehouse shortage"          detail="Order component unavailable in Mumbai facility"              tone="red"   />
              <Signal title="Margin concession pressure"  detail="Procurement requested an additional ₹8,16,000 discount"     tone="amber" />
              <Signal title="Stakeholder stagnation"      detail="VP of IT inactive across the last two sprint check-ins"                  />
            </div>
          </div>
          <div className="playbook">
            <h3>Recommended rescue playbook</h3>
            <ActionRow number="1" title="Eliminate logistics backorder"  detail="Auto-reallocate 6 OptiSensor units from Dallas WH-02." button="Open rescue"     onClick={() => onNavigate('rescue')} />
            <ActionRow number="2" title="Defend contract gross margin"   detail="Counter-offer and extend 3-year warranty addendum."     button="Draft counter-offer" />
            <ActionRow number="3" title="Re-anchor executive alignment"  detail="Schedule sponsor intervention briefing with Helios CIO." button="Schedule call"  />
          </div>
        </div>
      </Section>
      <RiskTable onNavigate={onNavigate} />
    </>
  );
}

function HealthOverview({ onNavigate }) {
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

function DealDetailPage({ onNavigate }) {
  return (
    <>
      <div className="detail-backbar">
        <button className="back-button" onClick={() => onNavigate('health')}><ArrowLeft size={15} /> Back to dashboard</button>
        <span>Deal Intelligence / Helios Health System</span>
      </div>
      <PageHeader
        eyebrow="Revenue Intelligence / Deal detail"
        title="Deal Intelligence Detail"
        description="A focused view of the health signals, commercial exposure, and next actions for the selected enterprise deal."
        action="Open rescue"
        onAction={() => onNavigate('rescue')}
      />
      <Section
        title="Helios Health System · Enterprise Diagnostics Cloud"
        icon={Target}
        action={
          <div className="detail-actions">
            <button className="secondary-button compact" onClick={() => onNavigate('customer')}>Customer insights</button>
            <button className="secondary-button compact" onClick={() => onNavigate('negotiation')}>Negotiation brief</button>
          </div>
        }
      >
        <div className="detail-grid">
          <div>
            <span className="status critical">Critical · 48 / 100</span>
            <h2 className="detail-title">Clinical deployment is blocked by a warehouse shortage</h2>
            <p className="case-copy">OptiSensor Pro-4 is unavailable in Mumbai WH-01, putting the clinical pilot milestone at risk within 14 days.</p>
            <div className="detail-meta">
              <div><small>Customer</small><button className="inline-link" onClick={() => onNavigate('customer')}>Helios Health System</button></div>
              <div><small>Deal value</small><strong>₹7,47,60,000</strong></div>
              <div><small>Owner</small><strong>Marcus Vance</strong></div>
              <div><small>Stage</small><strong>Final negotiation</strong></div>
            </div>
          </div>
          <div className="detail-score"><span>Health score</span><strong>48</strong><small>Critical threshold: &lt;50</small></div>
        </div>
      </Section>
      <div className="detail-kpis">
        <Metric label="Risk level"       value="Critical"   detail="Action required within 24 hours"         badge="High urgency"    tone="red"   />
        <Metric label="Deal velocity"    value="-3.2 days"  detail="Slower than stage benchmark"             badge="Decelerating"    tone="amber" />
        <Metric label="Gross margin"     value="58.4%"      detail="4.8 points below target"                 badge="Under pressure"  tone="amber" />
        <Metric label="Customer signal"  value="Cooling"    detail="Executive touchpoint overdue by 12 days" badge="Needs attention" tone="red"   />
      </div>
      <div className="detail-columns">
        <Section title="Risk factors" icon={AlertTriangle}>
          <div className="signal-list">
            <Signal title="Warehouse shortage"         detail="14-day backorder on OptiSensor Pro-4 in Mumbai."              tone="red"   />
            <Signal title="Margin concession pressure" detail="Procurement requested an additional ₹8,16,000 discount."      tone="amber" />
            <Signal title="Stakeholder stagnation"     detail="VP of IT has missed the last two check-ins."                              />
          </div>
        </Section>
        <Section title="Discount and margin signals" icon={CircleDollarSign}>
          <div className="signal-list">
            <Signal title="Discount is above guardrail" detail="21.03% against a 16% approved threshold."                tone="amber" />
            <Signal title="Value remains defensible"    detail="Three-year term and deployment certainty support margin."              />
            <div className="margin-track">
              <div><span>Target margin</span><strong>63.2%</strong></div>
              <div className="track"><i /></div>
              <div><span>Resulting margin</span><strong className="danger-text">58.4%</strong></div>
            </div>
          </div>
        </Section>
      </div>
      <div className="detail-columns">
        <Section title="Customer signals" icon={Users}>
          <div className="customer-signal">
            <div className="company-mark">HH</div>
            <div><strong>Helios Health System</strong><small>Tier 1 strategic account · Healthcare Systems</small></div>
            <button className="small-button" onClick={() => onNavigate('customer')}>Open customer</button>
          </div>
          <div className="signal-list">
            <Signal title="CIO engagement cooling"     detail="No response across the last 2 executive check-ins" tone="amber" />
            <Signal title="Clinical sponsor active"    detail="Pilot team confirmed the next milestone review"                />
          </div>
        </Section>
        <Section title="Recommended actions" icon={Zap}>
          <ActionRow number="1" title="Reallocate inventory"         detail="Move 6 units from Dallas WH-02 to protect the pilot."    button="Open rescue"   onClick={() => onNavigate('rescue')}      />
          <ActionRow number="2" title="Defend gross margin"          detail="Counter with a three-year warranty addendum."             button="Draft offer"   onClick={() => onNavigate('negotiation')} />
          <ActionRow number="3" title="Re-anchor executive alignment" detail="Schedule a briefing with the Helios CIO."               button="Customer plan" onClick={() => onNavigate('customer')}    />
        </Section>
      </div>
    </>
  );
}

function RescuePage({ onNavigate }) {
  const [rescueStatus,   setRescueStatus]   = useState('Awaiting action');
  const [completedAction, setCompletedAction] = useState('');
  const [rescueActions, setRescueActions] = useState([]);
  const [rescueError, setRescueError] = useState("");
  useEffect(() => {
    intelligenceApi.dealRescue()
      .then((response) => setRescueActions(response.data || []))
      .catch((error) => setRescueError(error.message || "Rescue recommendations are unavailable."));
  }, []);
  const runAction = (label) => { setCompletedAction(label); setRescueStatus('Action in progress'); };
  return (
    <>
      <div className="detail-backbar">
        <button className="back-button" onClick={() => onNavigate('deal-detail')}><ArrowLeft size={15} /> Back to deal intelligence</button>
        <span>Rescue workspace / Helios Health System</span>
      </div>
      <PageHeader eyebrow="Revenue Intelligence / Intervention desk" title="Deal Rescue" description="Move from risk to a coordinated intervention plan, then track the outcome protecting the forecast." action="View deal intelligence" onAction={() => onNavigate('deal-detail')} />
      <div className="metrics">
        <Metric label="Open rescue actions"    value={`${rescueActions.length} Actions`} detail="Generated from live deal-health signals" badge="API" tone="red" />
        <Metric label="High priority"          value={`${rescueActions.filter((action) => action.priority === 'HIGH').length} Actions`} detail="Requires timely intervention" badge="Priority" tone="amber"/>
        <Metric label="Deals covered"          value={`${new Set(rescueActions.map((action) => action.quotationId)).size} Deals`} detail="Shared quotation data" badge="Live" tone="teal" />
        <Metric label="Rescue status"          value={rescueStatus} detail={completedAction || 'Select playbook action'} badge={rescueStatus === 'Action in progress' ? 'Live' : 'Needs action'} tone={rescueStatus === 'Action in progress' ? 'teal' : 'red'} />
      </div>
      {rescueError && <div className="empty-state">{rescueError}</div>}
      {!rescueError && <Section title="Live rescue recommendations" icon={Zap}><div className="table-wrap"><table><thead><tr><th>Quotation</th><th>Priority</th><th>Action</th><th>Reason</th><th>Expected impact</th><th>Approval</th></tr></thead><tbody>
        {rescueActions.map((action, index) => <tr key={`${action.quotationId}-${index}`}><td><strong>{action.quotationNumber}</strong></td><td><span className={`status ${action.priority === 'HIGH' ? 'critical' : 'warning'}`}>{action.priority}</span></td><td>{action.action}</td><td>{action.reason}</td><td>{action.expectedImpact}</td><td>{action.approvalRequired ? 'Required' : 'Not required'}</td></tr>)}
        {!rescueActions.length && <tr><td colSpan="6" className="empty-state">No active rescue actions.</td></tr>}
      </tbody></table></div></Section>}
      <Section title="Rescue workflow" icon={Zap}>
        <div className="rescue-flow">
          {[['Risk', 'Critical health · 48 / 100'], ['Cause', 'Warehouse shortage WH-01'], ['Impact', 'Pilot milestone at risk'], ['Recommendation', 'Reallocate & defend margin'], ['Action', rescueStatus], ['Outcome', completedAction ? 'Tracking result' : 'Pending execution']].map(([label, detail], i) => (
            <div className={`rescue-stage ${i === 4 && rescueStatus === 'Action in progress' ? 'current' : ''}`} key={label}>
              <b>{i + 1}</b><strong>{label}</strong><small>{detail}</small>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Active rescue case" icon={AlertTriangle} action={<span className="status critical">Critical alert · 48</span>}>
        <div className="rescue-case">
          <div className="rescue-hero">
            <button className="deal-summary-link" onClick={() => onNavigate('deal-detail')}>
              <span className="case-label">Helios Health System · Enterprise Diagnostics Cloud</span><ArrowRight size={15} />
            </button>
            <h2>Clinical deployment is blocked</h2>
            <p>OptiSensor Pro-4 has a 14-day backorder in WH-01, stalling the pilot milestone.</p>
            <div className="alert-box"><AlertTriangle size={16} /><span>Business impact: ₹7,47,60,000 deal value exposed, 4.8 margin pts below target.</span><strong>48 / 100</strong></div>
            <button className="secondary-button" onClick={() => onNavigate('deal-detail')}>Open deal detail</button>
          </div>
          <div className="rescue-evidence">
            <div>
              <h3>Root causes</h3>
              <div className="signal-list">
                <Signal title="Warehouse shortage"         detail="6 units unavailable in Mumbai facility"          tone="red"   />
                <Signal title="Margin concession pressure" detail="Procurement requested ₹8,16,000 discount"        tone="amber" />
                <Signal title="Stakeholder stagnation"     detail="VP of IT inactive across two check-ins"                      />
              </div>
            </div>
            <div className="impact-callout">
              <small>Recommended playbook</small>
              <strong>Protect timeline, preserve value</strong>
              <p>Reallocate from Dallas WH-02, add warranty addendum, re-anchor CIO sponsor.</p>
            </div>
          </div>
        </div>
      </Section>
      <Section title="Recommended playbook" icon={Sparkles} action={completedAction && <span className="status success">{completedAction} started</span>}>
        <div className="playbook rescue-playbook">
          <ActionRow number="1" title="Eliminate logistics backorder" detail="Reallocate 6 OptiSensor units from Dallas WH-02 within 24h." button={completedAction === 'Inventory reallocation' ? 'Started' : 'Execute'} onClick={() => runAction('Inventory reallocation')} />
          <ActionRow number="2" title="Defend contract gross margin"  detail="Draft counter-offer with 3-year warranty addendum."          button={completedAction === 'Margin defense'         ? 'Started' : 'Draft'}   onClick={() => runAction('Margin defense')}          />
          <ActionRow number="3" title="Re-anchor executive alignment" detail="Schedule a CIO briefing this week."                          button={completedAction === 'Executive alignment'    ? 'Started' : 'Schedule'} onClick={() => runAction('Executive alignment')}    />
        </div>
      </Section>
      <RiskTable onNavigate={onNavigate} />
    </>
  );
}

// Renamed from CustomerPage to avoid confusion with Customer Portal role view
function CustomerInsightsPage({ onNavigate }) {
  return (
    <>
      <div className="detail-backbar">
        <button className="back-button" onClick={() => onNavigate('deal-detail')}><ArrowLeft size={15} /> Back to deal intelligence</button>
        <span>Customer Insights / Helios Health System</span>
      </div>
      <PageHeader eyebrow="Revenue Intelligence / Account view" title="Customer Insights" description="Account health, stakeholder momentum, expansion signals, and next best actions for every strategic customer." action="Add account note" />
      <div className="insight-grid">
        <Section title="Helios Health System" icon={Users}>
          <div className="account-heading">
            <div className="company-mark">HH</div>
            <div><strong>Tier 1 strategic account</strong><small>Healthcare Systems · Mumbai</small></div>
            <span className="status critical">At risk</span>
          </div>
          <div className="account-stats">
            <div><small>Relationship health</small><strong>68%</strong></div>
            <div><small>Expansion potential</small><strong>₹4.2 Cr</strong></div>
            <div><small>Last executive touch</small><strong>12 days ago</strong></div>
          </div>
        </Section>
        <Section title="Account health" icon={Gauge}>
          <div className="customer-health"><strong>68 / 100</strong><div className="health-meter"><i /></div><small>At risk · cooling executive engagement</small></div>
          <div className="customer-health-stats">
            <div><small>Renewal confidence</small><strong>76%</strong></div>
            <div><small>Open risks</small><strong>3</strong></div>
            <div><small>Relationship age</small><strong>4.2 yrs</strong></div>
          </div>
        </Section>
      </div>
      <Section title="Active deals" icon={Target} action={<span className="status critical">1 requires attention</span>}>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Deal</th><th>Stage</th><th>Value</th><th>Health</th><th>Next milestone</th><th>Action</th></tr></thead>
            <tbody>
              <tr>
                <td><button className="deal-link" onClick={() => onNavigate('deal-detail')}><strong>Enterprise Diagnostics Cloud</strong><small>Q-9482 · Clinical deployment</small></button></td>
                <td>Final negotiation</td><td>₹7,47,60,000</td>
                <td><span className="score critical">48 / 100</span></td>
                <td><small>Clinical pilot · 14 days</small></td>
                <td><button className="small-button" onClick={() => onNavigate('deal-detail')}>Open deal</button></td>
              </tr>
              <tr>
                <td><strong>Care Analytics Expansion</strong><small>Q-9361 · Renewal expansion</small></td>
                <td>Solution review</td><td>₹1,84,00,000</td>
                <td><span className="score warning">72 / 100</span></td>
                <td><small>Security review · 32 days</small></td>
                <td><button className="small-button">View</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>
      <div className="insight-grid">
        <Section title="Customer signals" icon={Activity}>
          <div className="signal-list">
            <Signal title="CIO engagement cooling"      detail="No response across the last 2 executive check-ins"  tone="amber" />
            <Signal title="Procurement pressure rising"  detail="Discount request increased by 4.5 pts this week"   tone="red"   />
            <Signal title="Clinical sponsor active"      detail="Pilot team confirmed the next milestone review"                 />
          </div>
        </Section>
        <Section title="Deal history" icon={BarChart3}>
          <div className="history-list">
            <div><span>Q2 2025</span><strong>Platform renewal completed</strong><small>₹2.8 Cr · Closed won</small></div>
            <div><span>Q4 2024</span><strong>Clinical analytics deployment</strong><small>₹1.2 Cr · Closed won</small></div>
            <div><span>Q1 2024</span><strong>Initial enterprise agreement</strong><small>₹3.6 Cr · Closed won</small></div>
          </div>
        </Section>
      </div>
      <Section title="Recommended account actions" icon={Sparkles}>
        <div className="recommendations">
          <ActionRow number="1" title="Schedule CIO sponsor briefing"   detail="Re-anchor business case around clinical deployment risk."   button="Create task"   />
          <ActionRow number="2" title="Share fulfillment recovery plan" detail="Pair Dallas reallocation with firm delivery commitment."     button="Prepare note" onClick={() => onNavigate('deal-detail')} />
          <ActionRow number="3" title="Protect renewal path"            detail="Frame 3-year extension against the active pilot milestone." button="Open plan"     />
        </div>
      </Section>
    </>
  );
}

function NegotiationWorkspace({ onNavigate }) {
  const [feedback, setFeedback] = useState('');
  const show = (msg) => setFeedback(msg);
  return (
    <>
      <div className="detail-backbar">
        <button className="back-button" onClick={() => onNavigate('deal-detail')}><ArrowLeft size={15} /> Back to deal intelligence</button>
        <span>Negotiation Intelligence / Helios Health System</span>
      </div>
      <PageHeader eyebrow="Revenue Intelligence / Commercial strategy" title="Negotiation Intelligence" description="Understand the customer position, protect commercial value, and prepare the response with confidence." action="Open deal rescue" onAction={() => onNavigate('rescue')} />
      {feedback && <div className="negotiation-feedback" role="status"><Check size={15} /> {feedback}</div>}
      <div className="negotiation-overview">
        <Metric label="Deal value"       value="₹7,47,60,000" detail="Enterprise Diagnostics Cloud"     badge="Final negotiation" />
        <Metric label="Current discount" value="21.03%"        detail="₹52,275 below list price"        badge="Above guardrail"   tone="amber" />
        <Metric label="Current margin"   value="58.4%"         detail="Target margin is 63.2%"          badge="Under pressure"    tone="red"   />
        <Metric label="Deal health"      value="48 / 100"      detail="Critical · action within 24 hrs" badge="Critical"          tone="red"   />
      </div>
      <div className="negotiation-columns">
        <Section title="Negotiation overview" icon={Target} action={<span className="status warning">In active review</span>}>
          <div className="negotiation-account">
            <div className="company-mark">HH</div>
            <div><strong>Helios Health System</strong><small>Tier 1 strategic account · Marcus Vance</small></div>
          </div>
          <div className="negotiation-facts">
            <div><small>Payment terms</small><strong>Net 45 requested</strong></div>
            <div><small>Current status</small><strong>Counteroffer pending</strong></div>
            <div><small>Deal stage</small><strong>Final negotiation</strong></div>
          </div>
        </Section>
        <Section title="Customer position" icon={Users}>
          <div className="position-block">
            <span>Customer request</span>
            <strong>Reduce commercial price and preserve the clinical pilot date.</strong>
            <p>Procurement is asking for 4.5% additional concession and Net 60 terms.</p>
          </div>
          <div className="chips">
            <span className="soft-tag">Price sensitive</span>
            <span className="soft-tag">Timeline critical</span>
            <span className="soft-tag">Net 60 requested</span>
          </div>
        </Section>
      </div>
      <div className="negotiation-columns">
        <Section title="Commercial position" icon={CircleDollarSign}>
          <div className="commercial-grid">
            <div><small>Current quotation</small><strong>₹7,47,60,000</strong></div>
            <div><small>Target price</small><strong>₹7,85,00,000</strong></div>
            <div><small>Minimum margin</small><strong>58.0%</strong></div>
            <div><small>Max discount</small><strong>22.0%</strong></div>
            <div><small>Approval threshold</small><strong>Discount &gt; 18%</strong></div>
          </div>
        </Section>
        <Section title="Recommended response" icon={Sparkles}>
          <div className="recommendation-callout">
            <span>Protect value, trade certainty</span>
            <strong>Offer 20% discount with a three-year commitment.</strong>
            <p>Pair the concession with a firm reallocation date and the warranty addendum.</p>
          </div>
          <div className="recommendation-facts">
            <div><small>Expected margin impact</small><strong>58.4% → 59.1%</strong></div>
            <div><small>Approval required</small><strong>Tier 2 commercial</strong></div>
            <div><small>Deal-health impact</small><strong className="success-text">Stabilizes at-risk</strong></div>
          </div>
        </Section>
      </div>
      <Section title="Negotiation history" icon={Activity}>
        <div className="negotiation-timeline">
          <div><b>1</b><span>Customer request<small>Today · Procurement requested 4.5% additional discount and Net 60.</small></span></div>
          <div><b>2</b><span>Sales response<small>Yesterday · Seller anchored on deployment certainty and current margin.</small></span></div>
          <div><b>3</b><span>Counteroffer<small>Yesterday · Three-year term and warranty addendum proposed.</small></span></div>
          <div><b>4</b><span>Approval event<small>Yesterday · Tier 2 approval opened for commercial exception.</small></span></div>
          <div><b>5</b><span>Latest response<small>Today · Customer will review if pilot date is guaranteed.</small></span></div>
        </div>
      </Section>
      <Section title="Reason for recommendation" icon={ShieldCheck}>
        <p className="recommendation-reason">The customer's urgency is driven by the clinical pilot. The fulfillment recovery plan gives us a credible non-price concession. Protecting the three-year term keeps the margin above the approved floor.</p>
        <div className="negotiation-actions">
          <button className="primary-button"   onClick={() => show('Counteroffer draft saved locally')}>Draft counteroffer</button>
          <button className="secondary-button" onClick={() => show('Tier 2 approval request prepared')}>Request approval</button>
          <button className="secondary-button" onClick={() => show('Negotiation note saved locally')}>Save note</button>
          <button className="secondary-button" onClick={() => onNavigate('customer')}>Customer insights</button>
        </div>
      </Section>
    </>
  );
}

// ─── QuotesPage — ONE component, THREE role views, ONE shared dataset ──────────
// role is passed through so the What-If simulator can conditionally hide
// "Apply Scenario" for Manager (read-only review) vs Sales (can apply).
function QuotesPage({ role, quotes, setQuotes }) {
  // Simulator state
  const [simQuote,     setSimQuote]     = useState(null);
  const [scenario,     setScenario]     = useState({ discount: 0, quantity: 1 });
  const [confirmApply, setConfirmApply] = useState(false);

  // Create / edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [form,      setForm]      = useState(null);

  // Customer portal account selector
  const customerList   = [...new Set(quotes.map(q => q.customer))];
  const [custAccount, setCustAccount] = useState(() => customerList[0] || '');

  // Customer modal state
  const [viewQuote, setViewQuote] = useState(null);
  const [reviewAcceptQuote, setReviewAcceptQuote] = useState(null);
  const [acceptChecked, setAcceptChecked] = useState(false);
  const [negotiateQuote, setNegotiateQuote] = useState(null);
  const [negotiationForm, setNegotiationForm] = useState({ discount: '', quantity: '', terms: '', message: '' });

  // Keep custAccount in sync when quotes change (e.g. new customer added)
  useEffect(() => {
    if (customerList.length > 0 && !customerList.includes(custAccount)) {
      setCustAccount(customerList[0]);
    }
  }, [quotes]);

  // ── Simulator handlers ──
  const openSimulator = (q) => {
    setSimQuote(q);
    setScenario({ discount: safeNum(q.discount), quantity: safeNum(q.quantity, 1) });
    setConfirmApply(false);
  };

  const applyScenario = () => {
    if (role !== 'sales') return; // Strict permission
    if (!simQuote) return;
    const disc = safeNum(scenario.discount);
    const qty  = safeNum(scenario.quantity, 1);
    setQuotes(quotes.map(q => {
      if (q.id !== simQuote.id) return q;
      return { ...q, discount: disc, quantity: qty, status: 'Pending Manager Approval' };
    }));
    setSimQuote(null);
    setConfirmApply(false);
  };

  // ── Manager approval handlers ──
  const handleApprove = (id) => {
    if (role !== 'manager') return;
    setQuotes(quotes.map(q => q.id === id && q.status === 'Pending Manager Approval' ? { ...q, status: 'Approved' } : q));
  };
  const handleReject  = (id) => {
    if (role !== 'manager') return;
    setQuotes(quotes.map(q => q.id === id && (q.status === 'Pending Manager Approval' || q.status === 'Counteroffer Requested') ? { ...q, status: 'Rejected'  } : q));
  };

  // ── Customer action handlers ──
  const handleAccept = () => {
    if (role !== 'customer' || !reviewAcceptQuote || reviewAcceptQuote.status !== 'Approved' || !acceptChecked) return;
    setQuotes(quotes.map(q => q.id === reviewAcceptQuote.id ? { ...q, status: 'Accepted by Customer' } : q));
    setReviewAcceptQuote(null);
    setAcceptChecked(false);
  };
  
  const handleNegotiateSubmit = (e) => {
    e.preventDefault();
    if (role !== 'customer' || !negotiateQuote || negotiateQuote.status !== 'Approved') return;
    setQuotes(quotes.map(q => q.id === negotiateQuote.id ? { ...q, status: 'Counteroffer Requested', counteroffer: negotiationForm } : q));
    setNegotiateQuote(null);
    setNegotiationForm({ discount: '', quantity: '', terms: '', message: '' });
  };

  // ── Create / edit modal handlers ──
  const openCreate = () => {
    setForm({ id: '', customer: '', product: '', unitPrice: 500000, cost: 300000, quantity: 1, discount: 0, stage: 'Proposal / Price Quote', expectedClose: '', status: 'Approved' });
    setModalOpen(true);
  };
  const openEdit = (q) => {
    setForm({ ...q, unitPrice: safeNum(q.unitPrice ?? q.productPrice), cost: safeNum(q.cost) });
    setModalOpen(true);
  };

  const saveQuote = (e) => {
    e.preventDefault();
    if (role !== 'sales') return; // Strict permission
    const unitPrice = safeNum(form.unitPrice);
    const cost      = safeNum(form.cost);
    const quantity  = safeNum(form.quantity, 1);
    const discount  = safeNum(form.discount);
    const status    = 'Pending Manager Approval'; // Always requires manager approval
    const record    = { ...form, unitPrice, cost, quantity, discount, status };
    if (record.id) {
      setQuotes(quotes.map(q => q.id === record.id ? record : q));
    } else {
      record.id = 'Q-' + (1000 + Math.floor(Math.random() * 9000));
      setQuotes([...quotes, record]);
    }
    setModalOpen(false);
    setForm(null);
  };

  // ── Derived stats (NaN-safe) ──
  const pending   = quotes.filter(q => q.status === 'Pending Manager Approval' || q.status === 'Counteroffer Requested').length;
  const pipeline  = quotes.reduce((s, q) => s + calcQuote(q).finalPrice, 0);
  const avgMargin = quotes.length ? quotes.reduce((s, q) => s + calcQuote(q).margin, 0) / quotes.length : 0;

  // ── Simulator computed values ──
  const simCur  = simQuote ? calcQuote(simQuote) : null;
  const simPrev = simQuote ? calcQuote({ ...simQuote, discount: scenario.discount, quantity: scenario.quantity }) : null;

  // ── Health badge helper ──
  const hBadge = (h) => h === 'Healthy' ? 'teal' : h === 'Warning' ? 'amber' : 'red';

  return (
    <>
      <PageHeader
        eyebrow={`Revenue OS · ${ROLE_LABELS[role]}`}
        title="Quotes & Commercial Governance"
        description="Role-based quotation management with shared live data, discount governance, margin health, and customer transparency."
        action={role === 'sales' ? '+ New Quotation' : null}
        onAction={openCreate}
      />

      {/* ── Role banners ── */}
      {role === 'sales' && (
        <div className="role-header-banner sales">
          <span><strong>Sales Workspace:</strong> Create and edit quotations, set pricing and discounts. Discounts &gt; 10% automatically require Manager Approval.</span>
          <button className="primary-button" onClick={openCreate}>+ New Quotation</button>
        </div>
      )}
      {role === 'manager' && (
        <div className="role-header-banner manager">
          <span><strong>Manager Review Desk:</strong> Inspect margin health, run What-If simulations on any quotation, and issue Approve / Reject decisions.</span>
        </div>
      )}
      {role === 'customer' && (
        <div className="role-header-banner customer">
          <span><strong>Customer Portal:</strong> View your confirmed product details, pricing, discount applied, and current quotation status.</span>
        </div>
      )}

      {/* ── Metrics (hidden from customer) ── */}
      {role !== 'customer' && (
        <div className="metrics">
          <Metric label="Active Quotations" value={String(quotes.length)}  detail="Shared across all roles in real time"    badge="Live Data"                                                          />
          <Metric label="Pending Approvals" value={String(pending)}        detail="Require Manager review and decision"     badge={pending > 0 ? 'Action needed' : 'All clear'} tone={pending > 0 ? 'amber' : 'teal'} />
          <Metric label="Total Pipeline"    value={fmt(pipeline)}          detail="Net of all discounts applied"            badge="Revenue"                                       tone="teal"            />
          <Metric label="Avg Gross Margin"  value={pct(avgMargin, 1)}      detail="Across all active quotations"            badge="Governance"                                    tone={avgMargin < 15 ? 'red' : 'blue'} />
        </div>
      )}

      {/* ─────────── SALES VIEW ─────────── */}
      {role === 'sales' && (
        <Section title="Quotations Workspace" icon={FileText}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Quote ID</th><th>Customer</th><th>Product</th><th>Qty</th>
                  <th>Unit Price</th><th>Discount</th><th>Final Price</th><th>Margin</th>
                  <th>Stage</th><th>Status</th><th>Close Date</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map(q => {
                  const c = calcQuote(q);
                  return (
                    <tr key={q.id}>
                      <td><strong>{q.id}</strong></td>
                      <td>{q.customer}</td>
                      <td>{q.product}</td>
                      <td>{c.quantity}</td>
                      <td>{fmt(c.unitPrice)}</td>
                      <td>{c.discount}%</td>
                      <td><strong>{fmt(c.finalPrice)}</strong></td>
                      <td><span className={`badge ${hBadge(c.health)}`}>{pct(c.margin, 1)}</span></td>
                      <td><span className="soft-tag">{q.stage}</span></td>
                      <td><span className={`status ${q.status === 'Approved' ? 'success' : q.status === 'Rejected' ? 'critical' : 'warning'}`}>{q.status}</span></td>
                      <td>{q.expectedClose}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button className="small-button" onClick={() => openEdit(q)}>Edit</button>
                          <button className="small-button" onClick={() => openSimulator(q)}>What-If</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* ─────────── MANAGER VIEW ─────────── */}
      {role === 'manager' && (
        <Section title="Manager Review Desk · Discount & Margin Governance" icon={ClipboardCheck}>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Quote &amp; Account</th><th>Product</th><th>Qty</th>
                  <th>Unit Price</th><th>Discount</th><th>Final Price</th>
                  <th>Margin %</th><th>Deal Health</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotes.map(q => {
                  const c = calcQuote(q);
                  return (
                    <tr key={q.id}>
                      <td><strong>{q.id}</strong><small>{q.customer}</small></td>
                      <td>{q.product}</td>
                      <td>{c.quantity}</td>
                      <td>{fmt(c.unitPrice)}</td>
                      <td>
                        <strong className={c.discount > 10 ? 'danger-text' : ''}>{c.discount}%</strong>
                        <small>{c.discount > 10 ? 'Needs approval' : 'Within floor'}</small>
                      </td>
                      <td><strong>{fmt(c.finalPrice)}</strong></td>
                      <td><strong>{pct(c.margin, 1)}</strong></td>
                      <td><span className={`badge ${hBadge(c.health)}`}>{c.health}</span></td>
                      <td><span className={`status ${q.status === 'Approved' ? 'success' : q.status === 'Rejected' ? 'critical' : 'warning'}`}>{q.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                          <button className="small-button" onClick={() => openSimulator(q)}>What-If</button>
                          {(q.status === 'Pending Manager Approval' || q.status === 'Counteroffer Requested') && (
                            <>
                              <button
                                className="primary-button"
                                style={{ minHeight: 27, padding: '0 8px', fontSize: 10 }}
                                onClick={() => handleApprove(q.id)}
                              >Approve</button>
                              <button
                                className="secondary-button"
                                style={{ minHeight: 27, padding: '0 8px', fontSize: 10, color: '#c83a45', borderColor: '#f2c5ca' }}
                                onClick={() => handleReject(q.id)}
                              >Reject</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* ─────────── CUSTOMER PORTAL VIEW ─────────── */}
      {role === 'customer' && (
        <>
          <div className="customer-select-bar">
            <strong>Account:</strong>
            <select value={custAccount} onChange={e => setCustAccount(e.target.value)}>
              {customerList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <Section title={`My Quotations · ${custAccount}`} icon={Users}>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Ref</th><th>Product</th><th>Quantity</th><th>Unit Price</th>
                    <th>Discount</th><th>Total Price</th><th>Expected Delivery</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.filter(q => q.customer === custAccount).map(q => {
                    const c = calcQuote(q);
                    const statusLabel = q.status === 'Pending Manager Approval' ? 'In Review'
                                      : q.status === 'Counteroffer Requested'   ? 'Counteroffer Requested'
                                      : q.status === 'Accepted by Customer'     ? '✓ Accepted'
                                      : q.status === 'Approved'                 ? 'Confirmed'
                                      : q.status === 'Rejected'                 ? 'Not Accepted'
                                      : q.status;
                    const statusClass = q.status === 'Approved'                 ? 'success'
                                      : q.status === 'Accepted by Customer'     ? 'success'
                                      : q.status === 'Rejected'                 ? 'critical'
                                      : q.status === 'Counteroffer Requested'   ? 'counteroffer'
                                      : 'warning';
                    const canAct = q.status === 'Approved';
                    return (
                      <tr key={q.id}>
                        <td><strong>{q.id}</strong></td>
                        <td><strong>{q.product}</strong></td>
                        <td>{c.quantity}</td>
                        <td>{fmt(c.unitPrice)}</td>
                        <td>{c.discount}%</td>
                        <td><strong>{fmt(c.finalPrice)}</strong></td>
                        <td>{q.expectedClose}</td>
                        <td><span className={`status ${statusClass}`}>{statusLabel}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            {!canAct && <button className="small-button" onClick={() => setViewQuote(q)}>View</button>}
                            {canAct && (
                              <>
                                <button
                                  className="primary-button"
                                  style={{ minHeight: 27, padding: '0 8px', fontSize: 10 }}
                                  onClick={() => { setReviewAcceptQuote(q); setAcceptChecked(false); }}
                                >Review &amp; Accept</button>
                                <button
                                  className="secondary-button"
                                  style={{ minHeight: 27, padding: '0 8px', fontSize: 10 }}
                                  onClick={() => { setNegotiateQuote(q); setNegotiationForm({ discount: q.discount, quantity: q.quantity, terms: '', message: '' }); }}
                                >Negotiate</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {quotes.filter(q => q.customer === custAccount).length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--muted)' }}>
                        No quotations found for {custAccount}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}

      {/* ─────────── CREATE / EDIT MODAL (Sales) ─────────── */}
      {modalOpen && form && (
        <div className="quote-modal-overlay">
          <div className="quote-modal-panel">
            <div className="quote-modal-header">
              <h3>{form.id ? `Edit Quotation · ${form.id}` : 'Create New Quotation'}</h3>
              <button className="icon-button" onClick={() => { setModalOpen(false); setForm(null); }}><X size={16} /></button>
            </div>
            <form onSubmit={saveQuote}>
              <div className="quote-modal-body">
                <div className="quote-form-grid">
                  <div className="form-group">
                    <label>Customer Account *</label>
                    <input required placeholder="e.g. Helios Health System" value={form.customer} onChange={e => setForm({ ...form, customer: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Product *</label>
                    <input required placeholder="Product or service name" value={form.product} onChange={e => setForm({ ...form, product: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Unit Price (₹) *</label>
                    <input type="number" required min="0" value={form.unitPrice} onChange={e => setForm({ ...form, unitPrice: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Unit Cost (₹) *</label>
                    <input type="number" required min="0" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Quantity *</label>
                    <input type="number" required min="1" step="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Discount (%) *</label>
                    <input type="number" required min="0" max="100" step="0.5" value={form.discount} onChange={e => setForm({ ...form, discount: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Deal Stage</label>
                    <select value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })}>
                      <option>Prospecting</option>
                      <option>Needs Analysis</option>
                      <option>Proposal / Price Quote</option>
                      <option>Final negotiation</option>
                      <option>Closed Won</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Expected Close Date *</label>
                    <input type="date" required value={form.expectedClose} onChange={e => setForm({ ...form, expectedClose: e.target.value })} />
                  </div>
                </div>
                {/* Live financial preview — uses safeNum, never NaN */}
                {(() => {
                  const p = calcQuote({ ...form, unitPrice: safeNum(form.unitPrice), cost: safeNum(form.cost), quantity: safeNum(form.quantity, 1), discount: safeNum(form.discount) });
                  return (
                    <div className="impact-summary" style={{ marginTop: 16 }}>
                      <strong>Live Preview</strong>
                      <span>Final Price: {fmt(p.finalPrice)}</span>
                      <span>Gross Margin: {pct(p.margin)}</span>
                      <span>Deal Health: <span className={`health-${p.health.toLowerCase()}`}>{p.health}</span></span>
                      <small>All saved quotations require Manager Approval.</small>
                    </div>
                  );
                })()}
              </div>
              <div className="quote-modal-footer">
                <button type="button" className="secondary-button" onClick={() => { setModalOpen(false); setForm(null); }}>Cancel</button>
                <button type="submit" className="primary-button">Save &amp; Submit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────── CUSTOMER VIEW MODAL ─────────── */}
      {viewQuote && role === 'customer' && (() => {
        const c = calcQuote(viewQuote);
        return (
          <div className="quote-modal-overlay">
            <div className="quote-modal-panel" style={{ maxWidth: 500 }}>
              <div className="quote-modal-header">
                <h3>Quotation Details</h3>
                <button className="icon-button" onClick={() => setViewQuote(null)}><X size={16} /></button>
              </div>
              <div className="quote-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Reference</span>
                    <strong style={{ fontSize: '14px' }}>{viewQuote.id}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Product</span>
                    <strong style={{ fontSize: '14px' }}>{viewQuote.product}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Quantity</span>
                    <strong style={{ fontSize: '14px' }}>{c.quantity}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Unit Price</span>
                    <strong style={{ fontSize: '14px' }}>{fmt(c.unitPrice)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Discount Applied</span>
                    <strong style={{ fontSize: '14px', color: '#059669' }}>{c.discount}%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                    <span style={{ color: 'var(--ink)', fontWeight: 600 }}>Total Final Price</span>
                    <strong style={{ fontSize: '18px', color: 'var(--ink)' }}>{fmt(c.finalPrice)}</strong>
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                  <strong>Expected Delivery:</strong> {viewQuote.expectedClose}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                  <strong>Status:</strong> {viewQuote.status === 'Pending Manager Approval' ? 'In Review' : viewQuote.status === 'Approved' ? 'Confirmed' : viewQuote.status}
                </div>
              </div>
              <div className="quote-modal-footer">
                <button className="primary-button" onClick={() => setViewQuote(null)}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─────────── CUSTOMER ACCEPT MODAL (Review & Accept) ─────────── */}
      {reviewAcceptQuote && role === 'customer' && (() => {
        const c = calcQuote(reviewAcceptQuote);
        return (
          <div className="quote-modal-overlay">
            <div className="quote-modal-panel" style={{ maxWidth: 500 }}>
              <div className="quote-modal-header">
                <h3>Review &amp; Accept Quotation</h3>
                <button className="icon-button" onClick={() => setReviewAcceptQuote(null)}><X size={16} /></button>
              </div>
              <div className="quote-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Reference</span>
                    <strong style={{ fontSize: '14px' }}>{reviewAcceptQuote.id}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Product</span>
                    <strong style={{ fontSize: '14px' }}>{reviewAcceptQuote.product}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Quantity</span>
                    <strong style={{ fontSize: '14px' }}>{c.quantity}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Unit Price</span>
                    <strong style={{ fontSize: '14px' }}>{fmt(c.unitPrice)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ color: 'var(--muted)', fontSize: '13px' }}>Discount Applied</span>
                    <strong style={{ fontSize: '14px', color: '#059669' }}>{c.discount}%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                    <span style={{ color: 'var(--ink)', fontWeight: 600 }}>Total Final Price</span>
                    <strong style={{ fontSize: '18px', color: 'var(--ink)' }}>{fmt(c.finalPrice)}</strong>
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                  <strong>Expected Delivery:</strong> {reviewAcceptQuote.expectedClose}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', paddingBottom: '8px' }}>
                  <strong>Commercial Terms:</strong> Standard enterprise software license and support terms apply.
                </div>
                
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px' }}>
                  <input 
                    type="checkbox" 
                    id="accept-confirm-cb" 
                    checked={acceptChecked} 
                    onChange={(e) => setAcceptChecked(e.target.checked)} 
                    style={{ marginTop: '2px' }}
                  />
                  <label htmlFor="accept-confirm-cb" style={{ fontSize: '13px', color: '#166534', cursor: 'pointer', lineHeight: '1.4' }}>
                    I confirm that I accept this quotation and its stated terms.
                  </label>
                </div>
              </div>
              <div className="quote-modal-footer">
                <button className="secondary-button" onClick={() => setReviewAcceptQuote(null)}>Cancel</button>
                <button className="primary-button" onClick={handleAccept} disabled={!acceptChecked} style={{ opacity: acceptChecked ? 1 : 0.6, cursor: acceptChecked ? 'pointer' : 'not-allowed' }}>
                  Confirm Acceptance
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ─────────── CUSTOMER NEGOTIATE MODAL ─────────── */}
      {negotiateQuote && role === 'customer' && (() => {
        const curC = calcQuote(negotiateQuote);
        const reqDiscount = safeNum(negotiationForm.discount);
        const reqQuantity = safeNum(negotiationForm.quantity, 1);
        const reqFinalPrice = curC.unitPrice * reqQuantity * (1 - reqDiscount / 100);
        
        return (
          <div className="quote-modal-overlay">
            <div className="quote-modal-panel">
              <div className="quote-modal-header">
                <h3>Negotiate Quotation · {negotiateQuote.id}</h3>
                <button className="icon-button" onClick={() => setNegotiateQuote(null)}><X size={16} /></button>
              </div>
              <form onSubmit={handleNegotiateSubmit}>
                <div className="quote-modal-body">
                  <div className="comparison-table" style={{ marginBottom: 16 }}>
                    <div className="comparison-head">
                      <strong>Metric</strong><strong>Current</strong><strong>Requested</strong>
                    </div>
                    <div className="comparison-row">
                      <span>Discount</span>
                      <strong>{curC.discount}%</strong>
                      <strong style={{ color: '#059669' }}>{reqDiscount}%</strong>
                    </div>
                    <div className="comparison-row">
                      <span>Quantity</span>
                      <strong>{curC.quantity}</strong>
                      <strong style={{ color: '#059669' }}>{reqQuantity}</strong>
                    </div>
                    <div className="comparison-row">
                      <span>Total Price</span>
                      <strong>{fmt(curC.finalPrice)}</strong>
                      <strong style={{ color: '#059669' }}>{fmt(reqFinalPrice)}</strong>
                    </div>
                  </div>
                  <div className="quote-form-grid">
                    <div className="form-group">
                      <label>Requested Discount (%)</label>
                      <input type="number" min="0" max="100" step="0.5" required value={negotiationForm.discount} onChange={e => setNegotiationForm({...negotiationForm, discount: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Requested Quantity</label>
                      <input type="number" min="1" step="1" required value={negotiationForm.quantity} onChange={e => setNegotiationForm({...negotiationForm, quantity: e.target.value})} />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Payment Terms Request</label>
                      <input type="text" placeholder="e.g. Net 60 instead of Net 30" value={negotiationForm.terms} onChange={e => setNegotiationForm({...negotiationForm, terms: e.target.value})} />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label>Message / Reason</label>
                      <textarea rows={3} placeholder="Please provide business context for this counteroffer..." value={negotiationForm.message} onChange={e => setNegotiationForm({...negotiationForm, message: e.target.value})} style={{ width: '100%', padding: '8px', border: '1.5px solid var(--border)', borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit' }}></textarea>
                    </div>
                  </div>
                </div>
                <div className="quote-modal-footer">
                  <button type="button" className="secondary-button" onClick={() => setNegotiateQuote(null)}>Cancel</button>
                  <button type="submit" className="primary-button">Submit Counteroffer</button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* ─────────── WHAT-IF DEAL SIMULATOR (Sales + Manager) ─────────── */}
      {simQuote && simCur && simPrev && (
        <div className="simulator-overlay">
          <section className="simulator-panel" role="dialog" aria-modal="true" aria-labelledby="sim-title">
            <div className="simulator-header">
              <div>
                <span className="eyebrow">What-If Scenario · {simQuote.id} — {simQuote.customer}</span>
                <h2 id="sim-title">What-If Deal Simulator</h2>
              </div>
              <button className="icon-button" onClick={() => { setSimQuote(null); setConfirmApply(false); }} aria-label="Close simulator">
                <X size={17} />
              </button>
            </div>
            <div className="simulator-body">
              <p className="simulator-note">
                Adjust discount and quantity to preview commercial impact. The quotation record will not change until you confirm below.
              </p>
              <div className="simulator-controls">
                <label>
                  Discount <output>{safeNum(scenario.discount)}%</output>
                  <input
                    type="range" min="0" max="40" step="0.5"
                    value={scenario.discount}
                    onChange={e => setScenario(s => ({ ...s, discount: safeNum(e.target.value) }))}
                  />
                </label>
                <label>
                  Quantity <output>{safeNum(scenario.quantity, 1)}</output>
                  <input
                    type="range" min="1" max="100"
                    value={scenario.quantity}
                    onChange={e => setScenario(s => ({ ...s, quantity: safeNum(e.target.value, 1) }))}
                  />
                </label>
              </div>
              <div className="comparison-table">
                <div className="comparison-head">
                  <strong>Metric</strong><strong>Current Deal</strong><strong>What-If Scenario</strong>
                </div>
                {[
                  ['Quantity',     simCur.quantity,                         scenario.quantity                        ],
                  ['Discount',     pct(simCur.discount, 1),                 pct(scenario.discount, 1)                ],
                  ['Final Price',  fmt(simCur.finalPrice),                  fmt(simPrev.finalPrice)                  ],
                  ['Gross Margin', pct(simCur.margin),                      pct(simPrev.margin)                      ],
                  ['Approval',     simCur.needsApproval  ? 'Required' : 'Not required', simPrev.needsApproval ? 'Required' : 'Not required'],
                  ['Deal Health',  simCur.health,                           simPrev.health                           ],
                ].map(([label, before, after]) => (
                  <div className="comparison-row" key={label}>
                    <span>{label}</span>
                    <strong>{before}</strong>
                    <strong className={label === 'Deal Health' ? `health-${simPrev.health.toLowerCase()}` : ''}>{after}</strong>
                  </div>
                ))}
              </div>
              <div className="impact-summary">
                <strong>Impact Summary</strong>
                <span>Gross Margin {simPrev.margin >= simCur.margin ? 'increases' : 'decreases'} by {Math.abs(simPrev.margin - simCur.margin).toFixed(2)} pts</span>
                <span>{simPrev.needsApproval ? 'Concession above 10% floor — Manager Approval will be required' : 'Within standard discount floor — no approval needed'}</span>
                <span>Deal Health: {simCur.health} → {simPrev.health}</span>
              </div>
              <p className="rules-note">
                DEMO RULES: Discount &le; 10% = no approval &nbsp;·&nbsp; &gt; 10% = Manager Approval required.
                Margin &ge; 15% = Healthy &nbsp;·&nbsp; 10–14.99% = Warning &nbsp;·&nbsp; &lt; 10% = Critical.
              </p>
            </div>
            <div className="simulator-footer">
              {/* Manager sees read-only review note; only Sales can apply scenario changes */}
              {role === 'manager' && (
                <div className="manager-sim-note">
                  <ShieldCheck size={14} />
                  <span>Manager review mode — scenario impact is for analysis only. Sales must apply any changes.</span>
                </div>
              )}
              <div className="simulator-actions">
                <button className="secondary-button" onClick={() => { setScenario({ discount: safeNum(simQuote.discount), quantity: safeNum(simQuote.quantity, 1) }); setConfirmApply(false); }}>
                  Reset
                </button>
                <button className="secondary-button" onClick={() => { setSimQuote(null); setConfirmApply(false); }}>
                  {role === 'manager' ? 'Close' : 'Cancel'}
                </button>
                {role !== 'manager' && (
                  <button className="primary-button" onClick={() => setConfirmApply(true)}>
                    Apply Scenario
                  </button>
                )}
              </div>
              {role !== 'manager' && confirmApply && (
                <div className="apply-confirm">
                  <strong>Apply this scenario to {simQuote.id}?</strong>
                  <span>Updates discount &amp; quantity in the shared quotation data.</span>
                  <div>
                    <button className="secondary-button" onClick={() => setConfirmApply(false)}>Keep Editing</button>
                    <button className="primary-button"   onClick={applyScenario}>Confirm &amp; Apply</button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}

// ─── Operational placeholder (non-implemented nav items) ──────────────────────
function OperationalPage({ title }) {
  return (
    <>
      <PageHeader eyebrow="Operations / Workspace" title={title} description="Operational workspace connected to the DealFlow360 revenue operating system." action="Create new" />
      <Section title="Workspace overview" icon={PanelLeft}>
        <div className="empty-state">
          <Sparkles size={24} />
          <h2>Ready for connected data</h2>
          <p>This view is prepared for REST API responses and uses the shared DealFlow360 demo workspace.</p>
          <button className="primary-button">Create first record</button>
        </div>
      </Section>
    </>
  );
}

// ─── App — root, manages the shared intelligence shell ────────────────────────
function App({ initialTab = 'health' }) {
  const { user, logout: logoutAuth } = useAuth();
  const role = user?.role === 'MANAGER' ? 'manager' : user?.role === 'CUSTOMER' ? 'customer' : 'sales';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Shared quotation data — the single source of truth for all roles
  const [quotes, setQuotes] = useState(() => {
    try {
      const saved = localStorage.getItem(SK.QUOTES);
      if (saved) return JSON.parse(saved);
    } catch {}
    return SEED_QUOTES;
  });

  // Persist to localStorage whenever quotes change
  useEffect(() => {
    localStorage.setItem(SK.QUOTES, JSON.stringify(quotes));
  }, [quotes]);

  const logout = () => {
    logoutAuth();
  };

  if (!user) return null;

  return (
    <div className="app-shell">
      <Sidebar role={role} active={activeTab} onNavigate={setActiveTab} />
      <div className="main-shell">
        <header className="topbar">
          <div className="crumbs">
            <span>DealFlow360</span> / <strong>{ROLE_LABELS[role]}</strong>
          </div>
          <div className="top-actions">
            <div className="search-box">
              <Search size={14} />
              <input type="text" placeholder="Search accounts, quotes..." />
              <kbd>⌘K</kbd>
            </div>
            <button className="icon-button notification"><Bell size={16} /><b /></button>
            {/* Slim role badge — informational only */}
            <span className={`topbar-role-badge role-${role}`}>{ROLE_LABELS[role]}</span>
            <button
              className="secondary-button compact"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              onClick={logout}
            >
              <LogOut size={13} />Sign out
            </button>
          </div>
        </header>
        <main className="content">
          {activeTab === 'quotes'       && <QuotesPage role={role} quotes={quotes} setQuotes={setQuotes} />}
          {activeTab === 'health'       && <HealthPage onNavigate={setActiveTab} />}
          {activeTab === 'rescue'       && <RescuePage onNavigate={setActiveTab} />}
          {activeTab === 'customer'     && <CustomerInsightsPage onNavigate={setActiveTab} />}
          {activeTab === 'negotiation'  && <NegotiationWorkspace onNavigate={setActiveTab} />}
          {activeTab === 'deal-detail'  && <DealDetailPage onNavigate={setActiveTab} />}
          {!['quotes', 'health', 'rescue', 'customer', 'negotiation', 'deal-detail'].includes(activeTab) && (
            <OperationalPage title={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
