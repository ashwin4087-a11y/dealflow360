import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { quotationApi } from "../../api/quotationApi";
import { Activity, FileText, CheckCircle, Clock } from "lucide-react";

export default function DashboardPage() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await quotationApi.getQuotations();
        if (response.success) {
          setQuotations(response.data);
        }
      } catch (err) {
        setError("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return <div style={{ padding: "2rem" }}>Loading dashboard...</div>;
  if (error) return <div style={{ padding: "2rem", color: "red" }}>{error}</div>;

  const totalQuotes = quotations.length;
  const draftQuotes = quotations.filter(q => q.status === "DRAFT").length;
  const pendingQuotes = quotations.filter(q => q.status === "PENDING_APPROVAL").length;
  const acceptedQuotes = quotations.filter(q => q.status === "ACCEPTED").length;
  
  // Example of using the existing Metric components (similar to main.jsx)
  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Core Sales / Overview</div>
          <h1>Sales Dashboard</h1>
          <p>Real-time view of your active quotations and pipeline.</p>
        </div>
        <button className="primary-button" onClick={() => navigate("/sales/customers")}>
          New Quotation
        </button>
      </div>

      <div className="metrics">
        <article className="metric">
          <div className="metric-top">
            <span>Total Quotations</span>
            <em className="badge blue">All time</em>
          </div>
          <strong>{totalQuotes}</strong>
          <div className="meter"><i className="blue" style={{ width: "100%" }} /></div>
        </article>

        <article className="metric">
          <div className="metric-top">
            <span>Drafts</span>
            <em className="badge gray">In progress</em>
          </div>
          <strong>{draftQuotes}</strong>
          <div className="meter"><i className="gray" style={{ width: "50%" }} /></div>
        </article>

        <article className="metric">
          <div className="metric-top">
            <span>Pending Approval</span>
            <em className="badge amber">Needs review</em>
          </div>
          <strong>{pendingQuotes}</strong>
          <div className="meter"><i className="amber" style={{ width: "20%" }} /></div>
        </article>

        <article className="metric">
          <div className="metric-top">
            <span>Accepted</span>
            <em className="badge teal">Won</em>
          </div>
          <strong>{acceptedQuotes}</strong>
          <div className="meter"><i className="teal" style={{ width: "30%" }} /></div>
        </article>
      </div>

      <section className="panel">
        <div className="section-heading">
          <div>
            <Activity size={16} />
            <h2>Recent Quotations</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Quote #</th>
                <th>Status</th>
                <th>Total Value</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {quotations.slice(0, 10).map((q) => (
                <tr key={q.id}>
                  <td>
                    <strong>{q.quotationNumber}</strong>
                  </td>
                  <td>
                    <span className={`badge ${q.status === 'ACCEPTED' ? 'teal' : q.status === 'DRAFT' ? 'gray' : q.status.includes('PENDING') ? 'amber' : 'blue'}`}>
                      {q.status}
                    </span>
                  </td>
                  <td>₹{parseFloat(q.totalAmount).toLocaleString()}</td>
                  <td>{new Date(q.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button className="small-button" onClick={() => navigate(`/sales/quotations/${q.id}`)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {quotations.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "2rem" }}>
                    No quotations found. Start by selecting a customer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
