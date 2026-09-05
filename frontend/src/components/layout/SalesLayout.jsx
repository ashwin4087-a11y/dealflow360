import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import SearchDropdown from "../common/SearchDropdown";
import { 
  Menu, ChevronRight, Search, Bell, X, 
  LayoutDashboard, FileText, ClipboardCheck, Boxes, Users, Gauge, Target
} from "lucide-react";

export default function SalesLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNav, setMobileNav] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { label: "Dashboard", path: "/sales/dashboard", icon: LayoutDashboard },
    { label: "Customers", path: "/sales/customers", icon: Users },
    { label: "Quotations", path: "/sales/quotations", icon: FileText },
    { label: "Approvals", path: "/sales/approvals", icon: ClipboardCheck },
    { label: "Orders", path: "/sales/orders", icon: Boxes },
    { label: "Intelligence", path: "/intelligence", icon: Gauge },
    { label: "Negotiation Intelligence", path: "/sales/negotiation", icon: Target }
  ];

  const activePath = location.pathname;
  const activeLabel = navItems.find(n => activePath.startsWith(n.path))?.label || "Core Sales";

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'is-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">
            <span style={{color: 'white', fontWeight: 'bold'}}>DF</span>
          </div>
          <div>
            <strong>DealFlow360</strong>
            <small>Core Sales</small>
          </div>
          <button className="icon-button close-nav" onClick={() => setMobileNav(false)}>
            <X size={17} />
          </button>
        </div>
        
        <div className="nav-scroll" style={{ paddingTop: '1rem' }}>
          <section className="nav-group has-active">
            <div className="nav-items">
              {navItems.map(({ label, path, icon: Icon }) => (
                <button 
                  key={path}
                  className={`nav-item ${activePath.startsWith(path) ? 'active' : ''}`}
                  onClick={() => {
                    navigate(path);
                    setMobileNav(false);
                  }}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
        
        <div className="profile">
          <div className="avatar">{user?.role?.charAt(0) || "U"}</div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <strong>{user?.id || "User"}</strong>
            <small>{user?.role || "SALESPERSON"}</small>
          </div>
          <button onClick={handleLogout} className="small-button" style={{ marginLeft: 'auto' }}>
            Logout
          </button>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setMobileNav(true)}>
            <Menu size={18} />
          </button>
          
          <div className="crumbs">
            <span>DealFlow360 Sales</span>
            <ChevronRight size={14} />
            <strong>{activeLabel}</strong>
          </div>
          
          <div className="top-actions">
            <SearchDropdown />
            <span className="context-chip">Internal Mode</span>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
