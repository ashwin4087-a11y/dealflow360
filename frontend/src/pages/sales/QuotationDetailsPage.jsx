import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { quotationApi } from "../../api/quotationApi";
import { Send, Edit3, Package } from "lucide-react";

export default function QuotationDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await quotationApi.getQuotationById(id);
      if (res.success) {
        setQuotation(res.data);
      }
    } catch (err) {
      setError("Failed to load quotation details");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    try {
      const res = await quotationApi.sendQuotation(id);
      if (res.success) {
        fetchDetails(); // reload to get new status
      }
    } catch (err) {
      alert(err.message || "Failed to send quotation");
    }
  };

  const handleConvert = async () => {
    try {
      // Assuming we have this in the api
      const response = await fetch(`http://localhost:5000/api/quotations/${id}/convert`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('dealflow_token')}`
        }
      });
      const data = await response.json();
      if (data.success) {
        alert(`Order created! Order Number: ${data.data.orderNumber}`);
        navigate('/sales/orders');
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Failed to convert to order");
    }
  };

  if (loading) return <div style={{ padding: "2rem" }}>Loading quotation...</div>;
  if (error || !quotation) return <div style={{ padding: "2rem", color: "red" }}>{error}</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Quotation Details</div>
          <h1>{quotation.quotationNumber}</h1>
          <p>Customer: {quotation.customer.name}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {quotation.status === 'DRAFT' && (
            <button className="secondary-button" onClick={() => navigate(`/sales/quotations/${quotation.id}/edit`)}>
              <Edit3 size={16} /> Edit Draft
            </button>
          )}
          {quotation.status === 'APPROVED' && (
            <button className="primary-button" onClick={handleSend}>
              <Send size={16} /> Send to Customer
            </button>
          )}
          {quotation.status === 'SENT' && (
            <span className="badge blue">Awaiting customer response</span>
          )}
          {quotation.status === 'ACCEPTED' && (
            <button className="primary-button" onClick={handleConvert} style={{ backgroundColor: '#059669', borderColor: '#059669' }}>
              <Package size={16} /> Convert to Order
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <section className="panel">
            <div className="section-heading">
              <h2>Line Items</h2>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Discount</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quotation.items.map(item => (
                    <tr key={item.id}>
                      <td>{item.product.name}</td>
                      <td>{item.quantity}</td>
                      <td>₹{parseFloat(item.unitPrice).toLocaleString()}</td>
                      <td>{item.discountPercent}%</td>
                      <td>₹{parseFloat(item.lineTotal).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <section className="panel">
            <div className="section-heading">
              <h2>Summary</h2>
            </div>
            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#4b5563' }}>Status</span>
                <span className="badge blue">{quotation.status}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#4b5563' }}>Subtotal</span>
                <strong>₹{parseFloat(quotation.subtotal).toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#4b5563' }}>Discount Amount</span>
                <strong style={{ color: '#059669' }}>- ₹{parseFloat(quotation.discountAmount).toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#4b5563' }}>Tax Amount</span>
                <strong>₹{parseFloat(quotation.taxAmount).toLocaleString()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', paddingTop: '0.5rem' }}>
                <strong>Final Total</strong>
                <strong>₹{parseFloat(quotation.total).toLocaleString()}</strong>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
