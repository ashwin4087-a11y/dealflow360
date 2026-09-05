import React, { useCallback, useEffect, useState } from "react";
import { FileText, Plus, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { quotationApi } from "../../api/quotationApi";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export default function QuotationListPage() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await quotationApi.getQuotations();
      setQuotations(response.data || []);
    } catch (requestError) {
      setError(requestError.message || "Quotations are unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="empty-state">Loading quotations...</div>;
  if (error) return <section className="panel empty-state"><FileText size={24} /><h2>Quotations unavailable</h2><p>{error}</p><button className="primary-button" type="button" onClick={load}><RefreshCw size={15} /> Retry</button></section>;

  return (
    <>
      <div className="page-header">
        <div><div className="eyebrow">Core Sales / Commercial workspace</div><h1>Quotes &amp; Pricing</h1><p>Review backend-backed quotations, pricing, discount governance, and approval status.</p></div>
        <button className="primary-button" type="button" onClick={() => navigate("/sales/customers")}><Plus size={15} /> New Quotation</button>
      </div>
      <div className="metrics">
        <article className="metric"><div className="metric-top"><span>Active quotations</span><span className="badge blue">API</span></div><strong>{quotations.length}</strong></article>
        <article className="metric"><div className="metric-top"><span>Pending approval</span><span className="badge amber">Review</span></div><strong>{quotations.filter((quotation) => quotation.status === "PENDING_APPROVAL").length}</strong></article>
        <article className="metric"><div className="metric-top"><span>Approved</span><span className="badge teal">Status</span></div><strong>{quotations.filter((quotation) => quotation.status === "APPROVED").length}</strong></article>
        <article className="metric"><div className="metric-top"><span>Total pipeline</span><span className="badge blue">Live</span></div><strong>{money(quotations.reduce((sum, quotation) => sum + Number(quotation.total || 0), 0))}</strong></article>
      </div>
      <section className="panel">
        <div className="section-heading"><div><FileText size={16} /><h2>Quotation list</h2></div></div>
        <div className="table-wrap"><table><thead><tr><th>Quote #</th><th>Customer</th><th>Items</th><th>Total</th><th>Discount</th><th>Status</th><th>Updated</th><th>Action</th></tr></thead><tbody>
          {quotations.map((quotation) => <tr key={quotation.id}><td><strong>{quotation.quotationNumber}</strong></td><td>{quotation.customer?.name || quotation.customer?.company || "-"}</td><td>{quotation.items?.length || 0}</td><td>{money(quotation.total)}</td><td>{Number(quotation.risk?.blendedDiscountPercent || quotation.discountPercent || 0).toFixed(2)}%</td><td><span className="badge blue">{quotation.status}</span></td><td>{quotation.updatedAt ? new Date(quotation.updatedAt).toLocaleDateString() : "-"}</td><td><button className="small-button" type="button" onClick={() => navigate(`/sales/quotations/${quotation.id}`)}>Open</button></td></tr>)}
          {!quotations.length && <tr><td colSpan="8" className="empty-state">No quotations returned by the backend.</td></tr>}
        </tbody></table></div>
      </section>
    </>
  );
}
