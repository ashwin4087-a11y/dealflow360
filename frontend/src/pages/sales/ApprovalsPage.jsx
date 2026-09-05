import React, { useEffect, useState } from "react";
import { approvalApi } from "../../api/approvalApi";
import { CheckCircle, XCircle, Clock } from "lucide-react";

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const res = await approvalApi.getPendingApprovals();
      if (res.success) {
        setApprovals(res.data);
      }
    } catch (err) {
      setError("Failed to load approvals");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    const notes = prompt(`Enter ${action} notes (optional):`);
    try {
      if (action === "Approve") {
        await approvalApi.approveQuotation(id, notes);
      } else {
        await approvalApi.rejectQuotation(id, notes);
      }
      fetchApprovals(); // Refresh list
    } catch (err) {
      alert(err.message || `Failed to ${action.toLowerCase()} quotation`);
    }
  };

  if (loading) return <div style={{ padding: "2rem" }}>Loading approvals...</div>;
  if (error) return <div style={{ padding: "2rem", color: "red" }}>{error}</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Manager / Finance</div>
          <h1>Pending Approvals</h1>
          <p>Quotations that have breached discount thresholds and require your review.</p>
        </div>
      </div>

      <section className="panel">
        <div className="section-heading">
          <Clock size={16} />
          <h2>Requires Review ({approvals.length})</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Quote #</th>
                <th>Customer</th>
                <th>Total Value</th>
                <th>Blended Discount</th>
                <th>Margin</th>
                <th>Risk Level</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {approvals.map(q => (
                <tr key={q.id}>
                  <td><strong>{q.quotationNumber}</strong></td>
                  <td>{q.customer.name}</td>
                  <td>₹{parseFloat(q.totalAmount).toLocaleString()}</td>
                  <td>{parseFloat(q.blendedDiscountPercent).toFixed(2)}%</td>
                  <td>₹{parseFloat(q.marginAmount).toLocaleString()}</td>
                  <td>
                    <span className={`badge ${q.discountRiskLevel === 'HIGH' ? 'amber' : 'gray'}`}>
                      {q.discountRiskLevel}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="small-button" style={{ color: '#059669', borderColor: '#059669' }} onClick={() => handleAction(q.id, 'Approve')}>
                        <CheckCircle size={14} /> Approve
                      </button>
                      <button className="small-button" style={{ color: '#dc2626', borderColor: '#dc2626' }} onClick={() => handleAction(q.id, 'Reject')}>
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {approvals.length === 0 && (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", padding: "2rem" }}>
                    No pending approvals.
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
