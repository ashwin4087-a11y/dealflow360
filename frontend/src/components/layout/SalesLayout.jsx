import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import SearchDropdown from "../common/SearchDropdown";
import {
  Menu, ChevronDown, ChevronRight, Bell, X,
  LayoutDashboard, FileText, ClipboardCheck, Boxes, Users, Gauge,
  Target, PackageCheck, Truck, AlertTriangle, CircleDollarSign,
  Zap, BarChart3, ShieldCheck, ScrollText, LogOut,
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

    const navGroups = [
      {
        label: "Sales",
        allowedRoles: ["ADMIN", "SALES", "SALESPERSON", "MANAGER", "FINANCE", "OPERATIONS"],
        items: [
          { label: "Sales Dashboard", path: "/sales/dashboard", icon: LayoutDashboard },
          { label: "Customers", path: "/sales/customers", icon: Users },
          { label: "Quotes & Pricing", path: "/sales/quotations", icon: FileText },
          { label: "Discount Approvals", path: "/sales/approvals", icon: ClipboardCheck, allowedRoles: ["ADMIN", "SALES", "SALESPERSON", "MANAGER", "FINANCE", "OPERATIONS"] },
        ],
      },
      {
        label: "Fulfillment",
        allowedRoles: ["ADMIN", "SALES", "SALESPERSON", "MANAGER", "FINANCE", "OPERATIONS"],
        items: [
          { label: "Fulfillment Dashboard", path: "/fulfillment", icon: PackageCheck },
          { label: "Orders & Allocation", path: "/sales/orders", icon: Truck },
          { label: "Warehouse & Inventory", path: "/fulfillment", icon: Boxes },
          { label: "Backorders", path: "/fulfillment/backorders", icon: AlertTriangle },
          { label: "Billing & Invoices", path: "/fulfillment/invoices", icon: CircleDollarSign },
        ],
      },
      {
        label: "Revenue Intelligence",
        allowedRoles: ["ADMIN", "SALES", "SALESPERSON", "MANAGER", "FINANCE", "OPERATIONS"],
        items: [
          { label: "Deal Health Radar", path: "/sales/intelligence/health", icon: Gauge },
          { label: "Deal Rescue", path: "/sales/intelligence/rescue", icon: Zap },
          { label: "Customer Insights", path: "/sales/intelligence/customer", icon: Users },
          { label: "Negotiation Intelligence", path: "/sales/negotiation", icon: Target, allowedRoles: ["ADMIN", "SALES", "SALESPERSON", "MANAGER", "FINANCE", "OPERATIONS"] },
        ],
      },
      {
        label: "Governance",
        allowedRoles: ["ADMIN", "SALES", "SALESPERSON", "MANAGER", "FINANCE", "OPERATIONS"],
        items: [
          { label: "Analytics & Forecast", path: "/sales/analytics", icon: BarChart3 },
          { label: "Approval Rules", path: "/sales/approvals", icon: ShieldCheck, allowedRoles: ["ADMIN", "SALES", "SALESPERSON", "MANAGER", "FINANCE", "OPERATIONS"] },
          { label: "Audit Logs", path: "/sales/audit-logs", icon: ScrollText },
        ],
      },
    ];

  const activePath = location.pathname;
  
  const isActive = (itemPath) => {
    if (itemPath === "/sales/quotations") {
      return activePath === "/sales/quotations" || activePath.startsWith("/sales/quotations/");
    }
    return activePath === itemPath;
  };

  const activeLabel = navGroups.flatMap((group) => group.items).find((item) => isActive(item.path))?.label || "Core Sales";
  const [expandedGroup, setExpandedGroup] = useState("Sales");

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'is-open' : ''}`}>
        <div className="brand">
          <img src="/logo.png" alt="DealFlow360" className="sidebar-brand-logo" />
          <div>
            <strong>DealFlow360</strong>
            <small>Core Sales</small>
          </div>
          <button className="icon-button close-nav" onClick={() => setMobileNav(false)}>
            <X size={17} />
          </button>
        </div>
        
        <div className="nav-scroll" style={{ paddingTop: '1rem' }}>
          {navGroups.map((group) => {
            if (group.allowedRoles && !group.allowedRoles.includes(user?.role)) return null;
            const filteredItems = group.items.filter(item => !item.allowedRoles || item.allowedRoles.includes(user?.role));
            if (filteredItems.length === 0) return null;

            const hasActive = filteredItems.some((item) => isActive(item.path));
            const isExpanded = expandedGroup === group.label;
            return (
              <section key={group.label} className={`nav-group ${hasActive ? "has-active" : ""}`}>
                <button className="nav-segment" onClick={() => setExpandedGroup(isExpanded ? "" : group.label)}>
                  <span>{group.label}</span>
                  {isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </button>
                {isExpanded && <div className="nav-items">
                  {filteredItems.map(({ label, path, icon: Icon }) => {
                    const active = isActive(path);
                    return (
                      <button key={`${label}-${path}`} className={`nav-item ${active ? "active" : ""}`} onClick={() => { navigate(path); setMobileNav(false); }}>
                        <Icon size={16} /><span>{label}</span>
                      </button>
                    );
                  })}
                </div>}
              </section>
            );
          })}
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
            <button className="icon-button notification" aria-label="Notifications" title="Notifications"><Bell size={16} /><b /></button>
            <span className="context-chip">Internal Mode</span>
            <button className="secondary-button compact" onClick={handleLogout} title="Sign out">
              <LogOut size={13} />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
