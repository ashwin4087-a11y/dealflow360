import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import { invoiceApi } from '../api/invoiceApi';

function InvoiceDetailPage() {
  const { invoiceId } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    invoiceApi.getInvoice(invoiceId)
      .then(res => {
        if (active && res.success) {
          setInvoice(res.data);
        } else if (active) {
          setError('Invoice not found');
        }
      })
      .catch(err => {
        if (active) setError('Failed to load invoice details.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [invoiceId]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading invoice...</div>;
  if (error || !invoice) return <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>{error || 'Invoice not found'}</div>;

  const fmt = (val) => `₹${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  return (
    <>
      <PageHeader title={`INVOICE #${invoice.invoiceNumber || invoice.id}`} />

      <div className="detail-layout">
        <section className="card summary-box">
          <div className="properties-grid">
            <div className="property-block">
              <label>Customer</label>
              <div className="property-value">{invoice.customer?.name}</div>
            </div>
            <div className="property-block">
              <label>Order</label>
              <div className="property-value">{invoice.orderId || 'N/A'}</div>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <div className="section-header">
              <h2 className="section-title">Items</h2>
            </div>
            <div className="table-wrapper">
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items?.map((item) => (
                    <tr key={item.id || item.name}>
                      <td>{item.name}</td>
                      <td>{fmt(item.amount)}</td>
                    </tr>
                  ))}
                  {(!invoice.items || invoice.items.length === 0) && (
                    <tr><td colSpan="2" style={{ textAlign: 'center', padding: '1rem' }}>No items found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <aside className="stack">
          <div className="card finance-box">
            <div className="section-header">
              <h2 className="section-title">Invoice Summary</h2>
            </div>
            <div className="summary-row">
              <span className="summary-label">Tax</span>
              <span className="summary-value">{fmt(invoice.tax)}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Total</span>
              <span className="summary-value">{fmt(invoice.total)}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Payment Status</span>
              <span className="summary-value"><span className={`badge ${invoice.status === 'PAID' ? 'status-paid' : 'status-pending'}`}>{invoice.status}</span></span>
            </div>
          </div>

          <div className="card finance-box">
            <div className="section-header">
              <h2 className="section-title">Payment History</h2>
            </div>
            <div className="table-wrapper">
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.payments?.map((item) => (
                    <tr key={item.id}>
                      <td>{new Date(item.date).toLocaleDateString()}</td>
                      <td>{item.method}</td>
                      <td><span className={`badge ${item.status === 'Paid' ? 'status-paid' : 'status-pending'}`}>{item.status}</span></td>
                      <td>{fmt(item.amount)}</td>
                    </tr>
                  ))}
                  {(!invoice.payments || invoice.payments.length === 0) && (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '1rem' }}>No payments recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

export default InvoiceDetailPage;
