import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, AlertTriangle, ArrowLeft, ArrowRight, BarChart3, Bell, Boxes, Check,
  ChevronDown, ChevronRight, CircleDollarSign, ClipboardCheck, FileText, Filter, Gauge,
  LayoutDashboard, Menu, MoreVertical, PackageCheck, PanelLeft, Search,
  ShieldCheck, Sparkles, Target, Truck, Users, X, Zap
} from 'lucide-react';
import './styles.css';

const navGroups = [
  { label: 'Sales', items: [
    ['Sales Dashboard', 'sales', LayoutDashboard], ['Quotes & Pricing', 'quotes', FileText],
    ['Discount Approvals', 'approvals', ClipboardCheck], ['Contracts & Terms', 'contracts', FileText]
  ]},
  { label: 'Fulfillment', items: [
    ['Fulfillment Dashboard', 'fulfillment', PackageCheck], ['Orders & Allocation', 'orders', Truck],
    ['Warehouse & Inventory', 'warehouse', Boxes], ['Backorders', 'backorders', AlertTriangle], ['Billing & Invoices', 'billing', CircleDollarSign]
  ]},
  { label: 'Revenue Intelligence', items: [
    ['Deal Health Radar', 'health', Gauge], ['Deal Rescue', 'rescue', Zap],
    ['Customer Insights', 'customer', Users], ['Negotiation Intelligence', 'negotiation', Target]
  ]},
  { label: 'Governance', items: [
    ['Analytics & Forecast', 'analytics', BarChart3], ['Approval Rules', 'rules', ShieldCheck], ['Audit Logs', 'audit', Activity]
  ]}
];

const deals = [
  { account: 'Helios Health System', title: 'Enterprise Diagnostics Cloud', value: '₹7,47,60,000', score: 48, state: 'Critical', reason: 'Warehouse backorder', owner: 'Marcus Vance' },
  { account: 'Apex Logistics International', title: 'Fleet Telematics Platform', value: '₹1,76,40,000', score: 58, state: 'Warning', reason: 'Aggressive discount demand', owner: 'Priya Shah' },
  { account: 'OmniCloud Networks', title: 'Global Edge Infrastructure', value: '₹12,18,00,000', score: 44, state: 'Critical', reason: 'Contract redline impasse', owner: 'Dylan Reed' },
  { account: 'Novus Energy Group', title: 'Grid Automation Suite', value: '₹3,15,00,000', score: 62, state: 'Warning', reason: 'Champion departure', owner: 'Sofia Iyer' },
  { account: 'CyberTrust Federal', title: 'GovCloud Dedicated Cluster', value: '₹5,20,000', score: 68, state: 'Warning', reason: 'Billing term dispute', owner: 'Aarav Menon' }
];

function routeFromHash() {
  return window.location.hash.replace('#/', '') || 'health';
}

function App() {
  const [route, setRoute] = useState(routeFromHash);
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const onHashChange = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const go = (nextRoute) => { window.location.hash = `/${nextRoute}`; setMobileNav(false); };
  const active = navGroups.flatMap((group) => group.items).find((item) => item[1] === route);
  const page = route === 'rescue' ? 'rescue' : route === 'customer' ? 'customer' : route === 'negotiation' ? 'negotiation' : route;

  return <div className="app-shell">
    <Sidebar active={route} open={mobileNav} onNavigate={go} onClose={() => setMobileNav(false)} />
    <div className="main-shell">
      <header className="topbar">
        <button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={18} /></button>
        <div className="crumbs"><span>Revenue Intelligence</span><ChevronRight size={14} /><strong>{active?.[0] || 'Deal Health Radar'}</strong></div>
        <div className="top-actions">
          <label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search accounts, deals..." /><kbd>⌘K</kbd></label>
          <span className="context-chip">INR (₹) <i /> Global Enterprise</span>
          <button className="icon-button notification" aria-label="Notifications" onClick={() => setNotice('No new notifications')}><Bell size={17} /><b /></button>
          <button className="primary-button" onClick={() => { go('rescue'); setNotice('Rescue workspace opened'); }}><Zap size={15} /> Trigger Rescue</button>
          <div className="avatar">SJ</div>
        </div>
      </header>
      <main className="content">
        {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={14} /></button></div>}
        {page === 'health' && <HealthPage onNavigate={go} />}
        {page === 'deal-detail' && <DealDetailPage onNavigate={go} />}
        {page === 'rescue' && <RescuePage onNavigate={go} />}
        {page === 'customer' && <CustomerPage />}
        {page === 'negotiation' && <NegotiationPage />}
        {!['health', 'deal-detail', 'rescue', 'customer', 'negotiation'].includes(page) && <OperationalPage title={active?.[0] || 'Sales Dashboard'} />}
      </main>
    </div>
  </div>;
}

function Sidebar({ active, open, onNavigate, onClose }) {
  const [expandedGroup, setExpandedGroup] = useState(null);

  return <aside className={`sidebar ${open ? 'is-open' : ''}`}>
    <div className="brand"><div className="brand-mark"><Activity size={21} /></div><div><strong>DealFlow360</strong><small>Revenue Ops Core</small></div><button className="icon-button close-nav" onClick={onClose} aria-label="Close navigation"><X size={17} /></button></div>
    <div className="nav-scroll">{navGroups.map((group) => {
      const isExpanded = expandedGroup === group.label;
      const hasActivePage = group.items.some(([, key]) => key === active);
      return <section className={`nav-group ${hasActivePage ? 'has-active' : ''}`} key={group.label}>
        <button className="nav-segment" aria-expanded={isExpanded} onClick={() => setExpandedGroup(isExpanded ? null : group.label)}>
          <span>{group.label}</span>{isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </button>
        {isExpanded && <div className="nav-items">{group.items.map(([label, key, Icon]) => <button key={key} className={`nav-item ${active === key ? 'active' : ''}`} onClick={() => onNavigate(key)}><Icon size={16} /><span>{label}</span></button>)}</div>}
      </section>;
    })}</div>
    <div className="profile"><div className="avatar">SJ</div><div><strong>Sarah Jenkins</strong><small>RevOps Director</small></div><MoreVertical size={16} /></div>
  </aside>;
}

function PageHeader({ eyebrow, title, description, action, onAction }) { return <div className="page-header"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action && <button className="secondary-button" onClick={onAction}>{action}</button>}</div>; }
function Metric({ label, value, detail, tone = 'blue', badge }) { return <article className="metric"><div className="metric-top"><span>{label}</span>{badge && <em className={`badge ${tone}`}>{badge}</em>}</div><strong className={tone === 'red' ? 'danger-text' : ''}>{value}</strong><small>{detail}</small><div className="meter"><i className={tone} /></div></article>; }
function Section({ title, icon: Icon = Activity, children, action }) { return <section className="panel"><div className="section-heading"><div><Icon size={16} /><h2>{title}</h2></div>{action}</div>{children}</section>; }
function HealthPage({ onNavigate }) { return <>
  <PageHeader eyebrow="Revenue Intelligence / Live telemetry" title="Deal Health Intelligence" description="AI-driven risk detection, margin erosion alerts, velocity tracking, and automated rescue actions across active enterprise revenue pipelines." action="Configure trigger rules" onAction={() => onNavigate('rules')} />
  <div className="metrics"><Metric label="Healthy Deals" value="42 Deals" detail="On-track velocity · Stable margins >58%" badge="Score 75–100" /><Metric label="At-Risk Deals" value="14 Deals" detail="Warning flags on backorders or legal redlines" badge="Score 50–74" tone="amber" /><Metric label="Critical Deals" value="8 Deals" detail="Severe discount pressure or stalled stakeholder" badge="Score <50" tone="red" /><Metric label="Revenue Protected" value="₹12.40 Cr" detail="8 deals successfully rescued this quarter" badge="+28%" tone="teal" /></div>
  <HealthOverview onNavigate={onNavigate} />
  <Section title="Integrated deal health & automated rescue loop" icon={Sparkles}><div className="stepper">{['Identify risk', 'Explain risk', 'Recommend action', 'Take action', 'Track outcome'].map((step, index) => <div className={index === 0 ? 'step current' : 'step'} key={step}><b>{index + 1}</b><span>{step}<small>{['Signal telemetry', 'Root cause analysis', 'Prescriptive playbook', 'One-click execution', 'Telemetry & SLA guard'][index]}</small></span></div>)}</div></Section>
  <Section title="Active high-urgency case" icon={AlertTriangle} action={<span className="status critical">Critical alert · 48</span>}><div className="case-layout"><div><span className="case-label">Helios Health System · Enterprise Diagnostics Cloud</span><p className="case-copy">Warehouse component OptiSensor Pro-4 has a 14-day backorder in WH-01, directly stalling clinical pilot milestone.</p><div className="signal-list"><Signal title="Warehouse shortage" detail="Order component unavailable in Mumbai facility" tone="red" /><Signal title="Margin concession pressure" detail="Procurement requested an additional ₹8,16,000 discount" tone="amber" /><Signal title="Stakeholder stagnation" detail="VP of IT inactive across the last two sprint check-ins" /></div></div><div className="playbook"><h3>Recommended rescue playbook</h3><ActionRow number="1" title="Eliminate logistics backorder" detail="Auto-reallocate 6 OptiSensor units from Dallas WH-02 warehouse." button="Open rescue" onClick={() => onNavigate('rescue')} /><ActionRow number="2" title="Defend contract gross margin" detail="Counter-offer and extend 3-year warranty addendum." button="Draft counter-offer" /><ActionRow number="3" title="Re-anchor executive alignment" detail="Schedule sponsor intervention briefing with Helios CIO." button="Schedule call" /></div></div></Section>
  <RiskTable onNavigate={onNavigate} />
</>; }
function HealthOverview({ onNavigate }) { return <div className="health-overview">
  <Section title="Deal health and risk overview" icon={Gauge}><div className="health-overview-grid"><div className="health-distribution"><div className="health-donut"><strong>64</strong><small>active deals</small></div><div className="health-legend"><div><i className="legend-dot healthy" /><span>Healthy</span><strong>42 · 66%</strong></div><div><i className="legend-dot warning" /><span>At risk</span><strong>14 · 22%</strong></div><div><i className="legend-dot critical" /><span>Critical</span><strong>8 · 12%</strong></div></div></div><div className="impact-summary"><div><small>Revenue exposed</small><strong>₹21.65 Cr</strong><span className="status critical">8 critical deals</span></div><div><small>Margin under pressure</small><strong>4.8 pts</strong><span className="status warning">Below target</span></div><div><small>Rescue success rate</small><strong>78%</strong><span className="status success">+12% vs last month</span></div></div></div></Section>
  <Section title="Risk and revenue impact" icon={BarChart3}><div className="impact-bars"><div className="impact-row"><span>Warehouse / fulfillment</span><div><i style={{ width: '78%' }} /></div><strong>₹9.2 Cr</strong></div><div className="impact-row"><span>Commercial concessions</span><div><i style={{ width: '56%' }} /></div><strong>₹6.6 Cr</strong></div><div className="impact-row"><span>Legal and contracting</span><div><i style={{ width: '38%' }} /></div><strong>₹3.4 Cr</strong></div><div className="impact-row"><span>Stakeholder momentum</span><div><i style={{ width: '27%' }} /></div><strong>₹2.4 Cr</strong></div></div></Section>
</div>; }
function DealDetailPage({ onNavigate }) {
  const goBack = () => window.history.length > 1 ? window.history.back() : onNavigate('health');
  return <>
    <div className="detail-backbar"><button className="back-button" onClick={goBack}><ArrowLeft size={15} /> Back to dashboard</button><span>Deal Intelligence / Helios Health System</span></div>
    <PageHeader eyebrow="Revenue Intelligence / Deal detail" title="Deal Intelligence Detail" description="A focused view of the health signals, commercial exposure, and next actions for the selected enterprise deal." action="Open rescue" onAction={() => onNavigate('rescue')} />
    <Section title="Helios Health System · Enterprise Diagnostics Cloud" icon={Target} action={<div className="detail-actions"><button className="secondary-button compact" onClick={() => onNavigate('customer')}>Customer insights</button><button className="secondary-button compact" onClick={() => onNavigate('negotiation')}>Negotiation brief</button></div>}>
      <div className="detail-grid"><div><span className="status critical">Critical · 48 / 100</span><h2 className="detail-title">Clinical deployment is blocked by a warehouse shortage</h2><p className="case-copy">OptiSensor Pro-4 is unavailable in Mumbai WH-01, putting the clinical pilot milestone at risk within the next 14 days.</p><div className="detail-meta"><div><small>Customer</small><button className="inline-link" onClick={() => onNavigate('customer')}>Helios Health System</button></div><div><small>Deal value</small><strong>₹7,47,60,000</strong></div><div><small>Owner</small><strong>Marcus Vance</strong></div><div><small>Stage</small><strong>Final negotiation</strong></div></div></div><div className="detail-score"><span>Health score</span><strong>48</strong><small>Critical threshold: &lt;50</small></div></div>
    </Section>
    <div className="detail-kpis"><Metric label="Risk level" value="Critical" detail="Action required within 24 hours" badge="High urgency" tone="red" /><Metric label="Deal velocity" value="-3.2 days" detail="Slower than stage benchmark" badge="Decelerating" tone="amber" /><Metric label="Gross margin" value="58.4%" detail="4.8 points below target" badge="Under pressure" tone="amber" /><Metric label="Customer signal" value="Cooling" detail="Executive touchpoint overdue by 12 days" badge="Needs attention" tone="red" /></div>
    <div className="detail-columns"><Section title="Risk factors" icon={AlertTriangle}><div className="signal-list"><Signal title="Warehouse shortage" detail="14-day backorder on OptiSensor Pro-4 in Mumbai." tone="red" /><Signal title="Margin concession pressure" detail="Procurement requested an additional ₹8,16,000 discount." tone="amber" /><Signal title="Stakeholder stagnation" detail="VP of IT has missed the last two check-ins." /></div></Section><Section title="Discount and margin signals" icon={CircleDollarSign}><div className="signal-list"><Signal title="Discount is above guardrail" detail="Current concession is 21.03% against a 16% approved threshold." tone="amber" /><Signal title="Value remains defensible" detail="Three-year term and deployment certainty support the floor margin." /><div className="margin-track"><div><span>Target margin</span><strong>63.2%</strong></div><div className="track"><i /></div><div><span>Resulting margin</span><strong className="danger-text">58.4%</strong></div></div></div></Section></div>
    <div className="detail-columns"><Section title="Customer signals" icon={Users}><div className="customer-signal"><div className="company-mark">HH</div><div><strong>Helios Health System</strong><small>Tier 1 strategic account · Healthcare Systems</small></div><button className="small-button" onClick={() => onNavigate('customer')}>Open customer</button></div><div className="signal-list"><Signal title="CIO engagement cooling" detail="No response across the last 2 executive check-ins" tone="amber" /><Signal title="Clinical sponsor remains active" detail="Pilot team confirmed the next milestone review" /></div></Section><Section title="Recommended actions" icon={Zap}><ActionRow number="1" title="Reallocate inventory" detail="Move 6 units from Dallas WH-02 to protect the pilot." button="Open rescue" onClick={() => onNavigate('rescue')} /><ActionRow number="2" title="Defend gross margin" detail="Counter with a three-year warranty addendum." button="Draft offer" onClick={() => onNavigate('negotiation')} /><ActionRow number="3" title="Re-anchor executive alignment" detail="Schedule a sponsor briefing with the Helios CIO." button="Customer plan" onClick={() => onNavigate('customer')} /></Section></div>
  </>;
}
function Signal({ title, detail, tone }) { return <div className="signal"><div className={`signal-icon ${tone || ''}`}><AlertTriangle size={14} /></div><div><strong>{title}</strong><p>{detail}</p></div><span className={`badge ${tone || ''}`}>{tone === 'red' ? 'Critical' : tone === 'amber' ? 'Warning' : 'Moderate'}</span></div>; }
function ActionRow({ number, title, detail, button, onClick }) { return <div className="action-row"><b>{number}</b><div><strong>{title}</strong><p>{detail}</p></div><button className="small-button" onClick={onClick}>{button}</button></div>; }
function RiskTable({ onNavigate }) { return <Section title="At-risk deals & prescribed interventions" icon={Filter} action={<button className="secondary-button compact">Filter risks</button>}><div className="table-wrap"><table><thead><tr><th>Deal & account</th><th>Total size</th><th>Health score</th><th>Root cause / risk vector</th><th>Prescribed rescue</th><th>Actions</th></tr></thead><tbody>{deals.map((deal) => <tr key={deal.account}><td><button className="deal-link" onClick={() => onNavigate('deal-detail')}><strong>{deal.account}</strong><small>{deal.title}</small></button></td><td>{deal.value}</td><td><span className={`score ${deal.state === 'Critical' ? 'critical' : 'warning'}`}>{deal.score} / 100</span><small>{deal.state}</small></td><td><span className="soft-tag">{deal.reason}</span></td><td><small>{deal.state === 'Critical' ? 'Action within 24h' : 'Action within 48h'}</small></td><td><button className="small-button" onClick={() => onNavigate('rescue')}>{deal.state === 'Critical' ? 'Open rescue' : 'Apply remedy'}</button></td></tr>)}</tbody></table></div></Section>; }
function RescuePage({ onNavigate }) { return <><PageHeader eyebrow="Revenue Intelligence / Intervention desk" title="Deal Rescue" description="Prioritize revenue risks, coordinate cross-module interventions, and track the actions protecting your forecast." action="Export risk digest" /><div className="metrics"><Metric label="Open rescue cases" value="8 Deals" detail="3 critical cases require action today" badge="Immediate" tone="red" /><Metric label="Revenue at risk" value="₹21.65 Cr" detail="Across 14 active intervention plans" badge="-8.4% WoW" tone="amber" /><Metric label="Protected this quarter" value="₹12.40 Cr" detail="8 deals successfully rescued" badge="+28%" tone="teal" /><Metric label="Avg. time to action" value="6.4 hrs" detail="Within the 24 hour operating SLA" badge="On target" /></div><Section title="Rescue command center" icon={Zap}><div className="rescue-grid"><div className="rescue-hero"><span className="case-label">Active high-urgency case</span><h2>Helios Health System</h2><p>Enterprise Diagnostics Cloud · ₹7,47,60,000</p><div className="alert-box"><AlertTriangle size={16} /><span>Warehouse shortage is blocking a clinical pilot milestone.</span><strong>48 / 100</strong></div><button className="primary-button" onClick={() => onNavigate('health')}>Review full intelligence <ArrowRight size={15} /></button></div><div className="rescue-actions"><ActionRow number="1" title="Eliminate logistics backorder" detail="Reallocate 6 units from Dallas WH-02." button="Execute" /><ActionRow number="2" title="Defend contract gross margin" detail="Prepare a tier-two counter-offer." button="Draft" /><ActionRow number="3" title="Re-anchor executive alignment" detail="Brief the executive sponsor this week." button="Schedule" /></div></div></Section><RiskTable onNavigate={onNavigate} /></>; }
function CustomerPage() { return <><PageHeader eyebrow="Revenue Intelligence / Account view" title="Customer Insights" description="Understand account health, stakeholder momentum, expansion signals, and the next best action for every strategic customer." action="Add account note" /><div className="insight-grid"><Section title="Helios Health System" icon={Users}><div className="account-heading"><div className="company-mark">HH</div><div><strong>Tier 1 strategic account</strong><small>Healthcare Systems · Mumbai</small></div><span className="status critical">At risk</span></div><div className="account-stats"><div><small>Relationship health</small><strong>68%</strong></div><div><small>Expansion potential</small><strong>₹4.2 Cr</strong></div><div><small>Last executive touch</small><strong>12 days ago</strong></div></div></Section><Section title="Stakeholder signals" icon={Activity}><div className="signal-list"><Signal title="CIO engagement cooling" detail="No response across the last 2 executive check-ins" tone="amber" /><Signal title="Procurement pressure rising" detail="Discount request increased by 4.5 points this week" tone="red" /><Signal title="Clinical sponsor remains active" detail="Pilot team confirmed the next milestone review" /></div></Section></div><Section title="Recommended account actions" icon={Sparkles}><div className="recommendations"><ActionRow number="1" title="Schedule CIO sponsor briefing" detail="Re-anchor the business case around clinical deployment risk." button="Create task" /><ActionRow number="2" title="Share fulfillment recovery plan" detail="Pair the Dallas reallocation with a firm delivery commitment." button="Prepare note" /><ActionRow number="3" title="Protect renewal path" detail="Use the active pilot milestone to frame the three-year extension." button="Open plan" /></div></Section></>; }
function NegotiationPage() { return <><PageHeader eyebrow="Revenue Intelligence / Commercial strategy" title="Negotiation Intelligence" description="Give sellers the context, guardrails, and recommended language to protect value in every commercial conversation." action="New negotiation brief" /><div className="negotiation-layout"><Section title="Helios Health System" icon={Target}><div className="negotiation-score"><div><small>Negotiation posture</small><strong>Defend value</strong><p>Customer urgency is high, but the active fulfillment issue gives procurement leverage.</p></div><div className="score-ring">62<small>/100</small></div></div><div className="chips"><span className="soft-tag">Budget approved</span><span className="soft-tag">Timeline sensitive</span><span className="soft-tag">Executive sponsor active</span></div></Section><Section title="Recommended guardrails" icon={ShieldCheck}><div className="guardrails"><div><span>Floor margin</span><strong>58.4%</strong></div><div><span>Approved concession</span><strong>₹5,00,000</strong></div><div><span>Preferred term</span><strong>36 months</strong></div></div><div className="quote-box">“We can protect the deployment timeline through a warehouse reallocation. In return, we can structure the commercial concession against a three-year commitment.”</div><button className="primary-button full">Copy negotiation brief</button></Section></div><Section title="Conversation signals" icon={Activity}><div className="table-wrap"><table><thead><tr><th>Signal</th><th>Observed evidence</th><th>Recommended response</th><th>Confidence</th></tr></thead><tbody><tr><td><strong>Price anchoring</strong></td><td>Procurement opened 18% below list.</td><td>Reframe on deployment cost and risk.</td><td><span className="status success">High</span></td></tr><tr><td><strong>Timing leverage</strong></td><td>Pilot milestone is within 14 days.</td><td>Offer certainty, not a blanket discount.</td><td><span className="status success">High</span></td></tr><tr><td><strong>Decision friction</strong></td><td>Legal review has not started.</td><td>Bring counsel into the next working session.</td><td><span className="status warning">Medium</span></td></tr></tbody></table></div></Section></>; }
function OperationalPage({ title }) { return <><PageHeader eyebrow="Operations / Workspace" title={title} description="Operational workspace connected to the DealFlow360 revenue operating system." action="Create new" /><Section title="Workspace overview" icon={PanelLeft}><div className="empty-state"><Sparkles size={24} /><h2>Ready for connected data</h2><p>This view is prepared for REST API responses and currently uses the shared DealFlow360 mock workspace.</p><button className="primary-button">Create first record</button></div></Section></>; }

createRoot(document.getElementById('root')).render(<App />);
