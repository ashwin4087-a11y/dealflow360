import { NavLink } from 'react-router-dom';

const navItems = [
  { label: 'Overview', to: '/fulfillment' },
  { label: 'Fulfillment', to: '/fulfillment' },
  { label: 'Warehouses', to: '/fulfillment/warehouse-allocation/ORD-1001' },
  { label: 'Backorders', to: '/fulfillment/backorders' },
  { label: 'Invoices', to: '/fulfillment/invoices' },
  { label: 'Subscriptions', to: '/fulfillment/subscriptions' },
];

function Layout({ children }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo.png" alt="DealFlow360" className="sidebar-brand-logo" />
          <div className="brand-name">DealFlow360</div>
        </div>

        <nav className="nav-section" aria-label="Sidebar navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              end={item.label === 'Fulfillment' || item.label === 'Overview'}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div>
            <strong>Fulfillment &amp; Billing</strong>
          </div>
          <div className="status-pills">
            <span className="badge status-active">Active</span>
          </div>
        </header>

        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}

export default Layout;
