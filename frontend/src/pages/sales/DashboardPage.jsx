import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, AlertTriangle, Boxes, FileText, Users } from "lucide-react";
import { approvalApi } from "../../api/approvalApi";
import { customerApi } from "../../api/customerApi";
import { productApi } from "../../api/productApi";
import { quotationApi } from "../../api/quotationApi";

const QUOTATION_STATUSES = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "SENT", "ACCEPTED", "REJECTED", "CONVERTED"];

const statusTone = (status) => {
  if (["ACCEPTED", "APPROVED", "CONVERTED"].includes(status)) return "teal";
  if (status === "PENDING_APPROVAL") return "amber";
  if (status === "REJECTED") return "red";
  return "blue";
};

const displayCustomer = (quotation) => quotation.customer?.name || quotation.customer?.company || "Customer unavailable";
const formatDate = (value) => (value ? new Date(value).toLocaleDateString() : "-");

function Metric({ label, value, tone }) {
  return (
    <article className="metric">
      <div className="metric-top"><span>{label}</span><em className={`badge ${tone}`}>API</em></div>
      <strong>{value}</strong>
    </article>
  );
}

export default function DashboardPage() {
  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [quotationResponse, customerResponse, productResponse, approvalResponse] = await Promise.all([
        quotationApi.getQuotations(),
        customerApi.getCustomers(),
        productApi.getProducts(),
        approvalApi.getPendingApprovals(),
      ]);
      setQuotations(quotationResponse.data || []);
      setCustomers(customerResponse.data || []);
      setProducts(productResponse.data || []);
      setApprovals(approvalResponse.data || []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  if (loading) return <div className="empty-state">Loading sales dashboard...</div>;
  if (error) {
    return (
      <section className="panel empty-state">
        <AlertTriangle size={24} />
        <h2>Dashboard unavailable</h2>
        <p>{error}</p>
        <button className="primary-button" type="button" onClick={loadDashboard}>Retry</button>
      </section>
    );
  }

  const recentQuotations = quotations.slice(0, 10);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Core Sales / Overview</div>
          <h1>Sales Dashboard</h1>
          <p>Backend-backed view of quotation activity, customers, products, and approvals.</p>
        </div>
        <button className="primary-button" type="button" onClick={() => navigate("/sales/customers")}>View customers</button>
      </div>

      <div className="metrics">
        <Metric label="Total quotations" value={quotations.length} tone="blue" />
        <Metric label="Customers" value={customers.length} tone="teal" />
        <Metric label="Products" value={products.length} tone="blue" />
        <Metric label="Pending approvals" value={approvals.length} tone="amber" />
      </div>

      <section className="dashboard-status-grid">
        {QUOTATION_STATUSES.map((status) => (
          <article className="metric" key={status}>
            <div className="metric-top"><span>{status.replaceAll("_", " ")}</span></div>
            <strong>{quotations.filter((quotation) => quotation.status === status).length}</strong>
          </article>
        ))}
      </section>

      <section className="panel">
        <div className="section-heading"><div><Activity size={16} /><h2>Recent Quotations</h2></div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Quote #</th><th>Customer</th><th>Status</th><th>Total</th><th>Created</th><th>Updated</th></tr></thead>
            <tbody>
              {recentQuotations.map((quotation) => (
                <tr key={quotation.id}>
                  <td><button className="deal-link" type="button" onClick={() => navigate(`/sales/quotations/${quotation.id}`)}><strong>{quotation.quotationNumber || quotation.id}</strong></button></td>
                  <td>{displayCustomer(quotation)}</td>
                  <td><span className={`badge ${statusTone(quotation.status)}`}>{quotation.status}</span></td>
                  <td>{quotation.total ?? "-"}</td>
                  <td>{formatDate(quotation.createdAt)}</td>
                  <td>{formatDate(quotation.updatedAt)}</td>
                </tr>
              ))}
              {recentQuotations.length === 0 && <tr><td colSpan="6" className="empty-state">No quotations returned by the backend.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <div className="detail-columns">
        <section className="panel"><div className="section-heading"><div><Users size={16} /><h2>Customer summary</h2></div></div><p>{customers.length ? `${customers.length} customers available in the customer workspace.` : "No customers returned by the backend."}</p><button className="secondary-button" type="button" onClick={() => navigate("/sales/customers")}>Open customers</button></section>
        <section className="panel"><div className="section-heading"><div><Boxes size={16} /><h2>Product catalog</h2></div></div><p>{products.length ? `${products.length} products available from the product API.` : "No products returned by the backend."}</p><button className="secondary-button" type="button" onClick={() => navigate("/sales/quotations/new")}>Open quotation workspace</button></section>
      </div>

      <section className="panel">
        <div className="section-heading"><div><FileText size={16} /><h2>Approval activity</h2></div></div>
        {approvals.length === 0 ? <p>No approval activity returned for the current role.</p> : <div className="table-wrap"><table><thead><tr><th>Quotation</th><th>Role</th><th>Status</th><th>Created</th></tr></thead><tbody>{approvals.slice(0, 5).map((approval) => <tr key={approval.id}><td>{approval.quotation?.quotationNumber || approval.quotationId}</td><td>{approval.approvalRole}</td><td>{approval.status}</td><td>{formatDate(approval.createdAt)}</td></tr>)}</tbody></table></div>}
      </section>
    </>
  );
}
