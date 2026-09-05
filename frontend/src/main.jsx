import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, AlertTriangle, ArrowLeft, ArrowRight, BarChart3, Bell, Boxes, Check,
  ChevronDown, ChevronRight, CircleDollarSign, ClipboardCheck, FileText, Filter, Gauge,
  LayoutDashboard, Menu, MoreVertical, PackageCheck, PanelLeft, Search,
  ShieldCheck, Sparkles, Target, Truck, Users, X, Zap,
  Plus, Minus, Trash2, ShoppingCart, Save, LogIn, LogOut, Loader, Package,
  User, DollarSign, Percent, Hash, CheckCircle, XCircle, AlertCircle, Eye
} from 'lucide-react';
import './styles.css';

/* ─── API Layer ─── */
const API_BASE = 'http://localhost:3000';

const apiFetch = async (path, options = {}) => {
  const token = localStorage.getItem('df360_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const body = await res.json().catch(() => ({ success: false, error: 'Invalid response' }));
  if (!res.ok) {
    const err = new Error(body.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
};

/* ─── Auth Context ─── */
const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('df360_user')); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('df360_token'));

  const login = useCallback(async (email, password) => {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('df360_token', res.token);
    localStorage.setItem('df360_user', JSON.stringify(res.user));
    setToken(res.token);
    setUser(res.user);
    return res;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('df360_token');
    localStorage.removeItem('df360_user');
    setToken(null);
    setUser(null);
    window.location.hash = '#/login';
  }, []);

  const value = useMemo(() => ({ user, token, login, logout, isAuthenticated: !!token }), [user, token, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

const useAuth = () => useContext(AuthContext);

/* ─── Login Page ─── */
function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) { setError('Email and password are required'); return; }
    setLoading(true);
    try {
      await login(email.trim(), password);
      window.location.hash = '#/sales';
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return <div className="login-page">
    <div className="login-card">
      <div className="login-brand"><div className="brand-mark"><Activity size={21} /></div><div><strong>DealFlow360</strong><small>Revenue Ops Core</small></div></div>
      <h1>Sign in</h1>
      <p>Enter your credentials to access the platform</p>
      {error && <div className="login-error"><AlertCircle size={14} />{error}</div>}
      <form onSubmit={handleSubmit}>
        <label className="form-field"><span>Email</span><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" autoComplete="email" /></label>
        <label className="form-field"><span>Password</span><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" /></label>
        <button type="submit" className="primary-button full login-submit" disabled={loading}>{loading ? <><Loader size={14} className="spin" /> Signing in...</> : <><LogIn size={14} /> Sign in</>}</button>
      </form>
    </div>
  </div>;
}

/* ─── Quotation Builder Page ─── */
let lineIdCounter = 0;
const nextLineId = () => `line-${++lineIdCounter}-${Date.now()}`;

function QuotationBuilderPage() {
  const { user } = useAuth();

  // Get customerId from URL query params
  const customerId = useMemo(() => {
    const hash = window.location.hash;
    const queryStart = hash.indexOf('?');
    if (queryStart === -1) return null;
    const params = new URLSearchParams(hash.slice(queryStart));
    return params.get('customerId');
  }, []);

  // State
  const [customer, setCustomer] = useState(null);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerError, setCustomerError] = useState('');
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState('');
  const [lines, setLines] = useState([]);
  const [taxPercent, setTaxPercent] = useState('18');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createdQuotation, setCreatedQuotation] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);

  // Fetch customer
  useEffect(() => {
    if (!customerId) { setCustomerError('No customer selected. Please go back and select a customer.'); return; }
    setCustomerLoading(true);
    setCustomerError('');
    apiFetch(`/api/customers/${customerId}`)
      .then(res => setCustomer(res.data))
      .catch(err => setCustomerError(err.message || 'Failed to load customer'))
      .finally(() => setCustomerLoading(false));
  }, [customerId]);

  // Fetch products
  useEffect(() => {
    setProductsLoading(true);
    setProductsError('');
    apiFetch('/api/products')
      .then(res => {
        setProducts(res.data || []);
        const activeProducts = (res.data || []).filter(p => p.active);
        if (activeProducts.length > 0) setSelectedProductId(activeProducts[0].id);
      })
      .catch(err => setProductsError(err.message || 'Failed to load products'))
      .finally(() => setProductsLoading(false));
  }, []);

  const activeProducts = useMemo(() => products.filter(p => p.active), [products]);

  // Line management
  const addLine = () => {
    if (!selectedProductId) return;
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;
    setLines(prev => [...prev, {
      lineId: nextLineId(),
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      productCategory: product.category,
      quantity: 1,
      discountPercent: 0,
    }]);
  };

  const updateLine = (lineId, field, value) => {
    setLines(prev => prev.map(l => l.lineId === lineId ? { ...l, [field]: value } : l));
  };

  const removeLine = (lineId) => {
    setLines(prev => prev.filter(l => l.lineId !== lineId));
  };

  // Validation
  const validate = () => {
    const errors = [];
    if (!customerId) errors.push('Customer is required');
    if (lines.length === 0) errors.push('At least one quotation line is required');
    lines.forEach((line, i) => {
      const qty = Number(line.quantity);
      if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
        errors.push(`Line ${i + 1}: Quantity must be a positive integer`);
      }
      const disc = Number(line.discountPercent);
      if (!Number.isFinite(disc) || disc < 0 || disc > 100) {
        errors.push(`Line ${i + 1}: Discount must be between 0 and 100`);
      }
    });
    const tax = Number(taxPercent);
    if (!Number.isFinite(tax) || tax < 0 || tax > 100) {
      errors.push('Tax percentage must be between 0 and 100');
    }
    return errors;
  };

  // Create quotation
  const handleCreate = async () => {
    setCreateError('');
    setValidationErrors([]);
    const errors = validate();
    if (errors.length > 0) { setValidationErrors(errors); return; }

    setCreating(true);
    try {
      const requestBody = {
        customerId,
        taxPercent: Number(taxPercent) || 0,
        items: lines.map(l => ({
          productId: l.productId,
          quantity: Number(l.quantity),
          discountPercent: Number(l.discountPercent) || 0,
        })),
      };
      const res = await apiFetch('/api/quotations', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
      setCreatedQuotation(res.data);
    } catch (err) {
      setCreateError(err.body?.error || err.message || 'Failed to create quotation');
    } finally {
      setCreating(false);
    }
  };

  // If quotation was created, show the result
  if (createdQuotation) {
    const q = createdQuotation;
    const compliance = q.discountCompliance;
    return <>
      <div className="detail-backbar"><button className="back-button" onClick={() => { setCreatedQuotation(null); setLines([]); }}><ArrowLeft size={15} /> Create another</button><span>Quotation Created</span></div>
      <PageHeader eyebrow="Sales / Quotation Created" title="Quotation Created Successfully" description={`Quotation ${q.quotationNumber} has been saved as a draft.`} />
      <div className="qb-success-grid">
        <Section title="Quotation Summary" icon={FileText}>
          <div className="qb-summary-grid">
            <div className="qb-summary-item"><small>Quotation Number</small><strong>{q.quotationNumber}</strong></div>
            <div className="qb-summary-item"><small>Status</small><span className="badge">{q.status}</span></div>
            <div className="qb-summary-item"><small>Customer</small><strong>{q.customer?.name || q.customerId}</strong></div>
            <div className="qb-summary-item"><small>Company</small><strong>{q.customer?.company || '—'}</strong></div>
          </div>
        </Section>
        <Section title="Financial Summary" icon={CircleDollarSign}>
          <div className="qb-summary-grid">
            <div className="qb-summary-item"><small>Subtotal</small><strong>₹{Number(q.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
            <div className="qb-summary-item"><small>Discount</small><strong>{Number(q.discountPercent).toFixed(2)}% (₹{Number(q.discountAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })})</strong></div>
            <div className="qb-summary-item"><small>Tax ({Number(q.taxPercent).toFixed(2)}%)</small><strong>₹{Number(q.taxAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
            <div className="qb-summary-item qb-total"><small>Total</small><strong>₹{Number(q.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
          </div>
        </Section>
      </div>
      {compliance && <Section title="Discount Compliance" icon={ShieldCheck} action={<span className={`badge ${compliance.riskLevel === 'HIGH' ? 'red' : compliance.riskLevel === 'MEDIUM' ? 'amber' : ''}`}>{compliance.riskLevel} Risk</span>}>
        <div className="qb-compliance">
          <div className="qb-summary-grid">
            <div className="qb-summary-item"><small>Blended Discount</small><strong>{compliance.blendedDiscountPercent}%</strong></div>
            <div className="qb-summary-item"><small>Risk Level</small><strong>{compliance.riskLevel}</strong></div>
            <div className="qb-summary-item"><small>Requires Approval</small><strong>{compliance.requiresApproval ? 'Yes' : 'No'}</strong></div>
          </div>
          {compliance.lineViolations?.some(v => !v.compliant) && <div className="qb-violations">
            <strong><AlertTriangle size={13} /> Discount Violations</strong>
            {compliance.lineViolations.filter(v => !v.compliant).map((v, i) => <div key={i} className="qb-violation-item"><XCircle size={12} /><span>{v.violation}</span></div>)}
          </div>}
        </div>
      </Section>}
      <Section title="Quotation Lines" icon={Package}>
        <div className="table-wrap"><table>
          <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Qty</th><th>Unit Price</th><th>Discount %</th><th>Discount Amt</th><th>Line Total</th></tr></thead>
          <tbody>{(q.items || []).map((item, i) => <tr key={item.id || i}>
            <td><strong>{item.product?.name || item.productId}</strong></td>
            <td>{item.product?.sku || '—'}</td>
            <td><span className="soft-tag">{item.product?.category || '—'}</span></td>
            <td>{Number(item.quantity)}</td>
            <td>₹{Number(item.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td>{Number(item.discountPercent).toFixed(2)}%</td>
            <td>₹{Number(item.discountAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td><strong>₹{Number(item.lineTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
          </tr>)}</tbody>
        </table></div>
      </Section>
    </>;
  }

  // Build form
  return <>
    <PageHeader eyebrow="Sales / New Quotation" title="Quotation Builder" description="Select products, set quantities and discounts, then create a draft quotation. All pricing is calculated by the server." />

    {/* Customer Card */}
    <Section title="Selected Customer" icon={Users}>
      {customerLoading && <div className="qb-loading"><Loader size={18} className="spin" /> Loading customer...</div>}
      {customerError && <div className="qb-error"><AlertCircle size={16} />{customerError}</div>}
      {customer && <div className="qb-customer-card">
        <div className="company-mark">{(customer.name || '').slice(0, 2).toUpperCase()}</div>
        <div className="qb-customer-info">
          <strong>{customer.name}</strong>
          {customer.company && <small>{customer.company}</small>}
          {customer.email && <small>{customer.email}</small>}
          <span className="soft-tag">{customer.customerTier || 'STANDARD'}</span>
        </div>
      </div>}
    </Section>

    {/* Product Selector */}
    <Section title="Add Product" icon={Package}>
      {productsLoading && <div className="qb-loading"><Loader size={18} className="spin" /> Loading products...</div>}
      {productsError && <div className="qb-error"><AlertCircle size={16} />{productsError}</div>}
      {!productsLoading && !productsError && activeProducts.length === 0 && <div className="qb-empty"><Package size={20} /><span>No active products available</span></div>}
      {!productsLoading && activeProducts.length > 0 && <div className="qb-product-selector">
        <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="qb-select">
          {activeProducts.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku}) — {p.category}</option>)}
        </select>
        <button className="primary-button" onClick={addLine}><Plus size={14} /> Add to Quote</button>
      </div>}
    </Section>

    {/* Quotation Lines */}
    <Section title={`Quotation Lines (${lines.length})`} icon={FileText}>
      {lines.length === 0 && <div className="qb-empty"><ShoppingCart size={20} /><span>No items added yet. Select a product above to begin.</span></div>}
      {lines.length > 0 && <div className="table-wrap"><table>
        <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Quantity</th><th>Discount %</th><th>Actions</th></tr></thead>
        <tbody>{lines.map((line, i) => <tr key={line.lineId}>
          <td><strong>{line.productName}</strong></td>
          <td>{line.productSku}</td>
          <td><span className="soft-tag">{line.productCategory}</span></td>
          <td><div className="qb-qty-control">
            <button className="qb-qty-btn" onClick={() => updateLine(line.lineId, 'quantity', Math.max(1, Number(line.quantity) - 1))} aria-label="Decrease quantity"><Minus size={12} /></button>
            <input type="number" className="qb-qty-input" value={line.quantity} min="1" step="1" onChange={e => updateLine(line.lineId, 'quantity', e.target.value)} />
            <button className="qb-qty-btn" onClick={() => updateLine(line.lineId, 'quantity', Number(line.quantity) + 1)} aria-label="Increase quantity"><Plus size={12} /></button>
          </div></td>
          <td><div className="qb-discount-input"><input type="number" value={line.discountPercent} min="0" max="100" step="0.5" onChange={e => updateLine(line.lineId, 'discountPercent', e.target.value)} /><span>%</span></div></td>
          <td><button className="qb-remove-btn" onClick={() => removeLine(line.lineId)} aria-label="Remove line"><Trash2 size={14} /></button></td>
        </tr>)}</tbody>
      </table></div>}
    </Section>

    {/* Tax & Create */}
    {lines.length > 0 && <Section title="Finalize Quotation" icon={Save}>
      <div className="qb-finalize">
        <label className="form-field qb-tax-field"><span>Tax Percentage</span><div className="qb-discount-input"><input type="number" value={taxPercent} min="0" max="100" step="0.5" onChange={e => setTaxPercent(e.target.value)} /><span>%</span></div></label>
        <p className="qb-note"><AlertCircle size={12} /> All pricing, discounts, taxes, and totals are calculated by the server. The values shown after creation reflect the authoritative backend calculations.</p>

        {validationErrors.length > 0 && <div className="qb-validation-errors">{validationErrors.map((err, i) => <div key={i} className="qb-error-item"><XCircle size={12} />{err}</div>)}</div>}
        {createError && <div className="qb-error"><AlertCircle size={16} />{createError}</div>}

        <button className="primary-button qb-create-btn" onClick={handleCreate} disabled={creating}>{creating ? <><Loader size={14} className="spin" /> Creating quotation...</> : <><Save size={14} /> Create Draft Quotation</>}</button>
      </div>
    </Section>}
  </>;
}

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
  return window.location.hash.replace(/^#\/?/, '') || 'health';
}

function App() {
  const { isAuthenticated, user, logout } = useAuth();
  const [route, setRoute] = useState(routeFromHash);
  const [mobileNav, setMobileNav] = useState(false);
  const [search, setSearch] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const onHashChange = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  if (!isAuthenticated && route !== 'login') {
    window.location.hash = '#/login';
    return null;
  }

  if (route === 'login') {
    return <LoginPage />;
  }

  const go = (nextRoute) => { window.location.hash = `/${nextRoute}`; setMobileNav(false); };
  const active = navGroups.flatMap((group) => group.items).find((item) => item[1] === route);
  const page = route === 'rescue' ? 'rescue' : route === 'customer' ? 'customer' : route === 'negotiation' ? 'negotiation' : route.startsWith('sales/quotations/new') ? 'quotation-builder' : route;
  
  const userInitials = user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

  return <div className="app-shell">
    <Sidebar active={route} open={mobileNav} onNavigate={go} onClose={() => setMobileNav(false)} user={user} onLogout={logout} />
    <div className="main-shell">
      <header className="topbar">
        <button className="icon-button mobile-menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu size={18} /></button>
        <div className="crumbs"><span>Revenue Intelligence</span><ChevronRight size={14} /><strong>{active?.[0] || (page === 'quotation-builder' ? 'Quotation Builder' : 'Deal Health Radar')}</strong></div>
        <div className="top-actions">
          <label className="search-box"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search accounts, deals..." /><kbd>⌘K</kbd></label>
          <span className="context-chip">INR (₹) <i /> Global Enterprise</span>
          <button className="icon-button notification" aria-label="Notifications" onClick={() => setNotice('No new notifications')}><Bell size={17} /><b /></button>
          <button className="primary-button" onClick={() => { go('rescue'); setNotice('Rescue workspace opened'); }}><Zap size={15} /> Trigger Rescue</button>
          <div className="avatar">{userInitials}</div>
        </div>
      </header>
      <main className="content">
        {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={14} /></button></div>}
        {page === 'health' && <HealthPage onNavigate={go} />}
        {page === 'deal-detail' && <DealDetailPage onNavigate={go} />}
        {page === 'rescue' && <RescuePage onNavigate={go} />}
        {page === 'customer' && <CustomerPage />}
        {page === 'negotiation' && <NegotiationPage />}
        {page === 'quotation-builder' && <QuotationBuilderPage />}
        {!['health', 'deal-detail', 'rescue', 'customer', 'negotiation', 'quotation-builder'].includes(page) && <OperationalPage title={active?.[0] || 'Sales Dashboard'} />}
      </main>
    </div>
  </div>;
}

function Sidebar({ active, open, onNavigate, onClose, user, onLogout }) {
  const [expandedGroup, setExpandedGroup] = useState(null);

  const userInitials = user?.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

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
    <div className="profile">
      <div className="avatar">{userInitials}</div>
      <div><strong>{user?.name || 'User'}</strong><small>{user?.role || 'Role'}</small></div>
      <button className="icon-button" onClick={onLogout} aria-label="Log out"><LogOut size={14} /></button>
    </div>
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

createRoot(document.getElementById('root')).render(<AuthProvider><App /></AuthProvider>);
