import { useParams } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import { invoiceCatalog } from '../data/mockData';

function InvoiceDetailPage() {
  const { invoiceId } = useParams();
  const invoice = invoiceCatalog.find((item) => item.id === invoiceId) ?? invoiceCatalog[0];
  const subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0);
  const taxable = subtotal + invoice.tax;

  return (
    <>
      <PageHeader title={`INVOICE #${invoice.id}`} />

      <div className="detail-layout">
        <section className="card summary-box">
          <div className="properties-grid">
            <div className="property-block">
              <label>Customer</label>
              <div className="property-value">{invoice.customer}</div>
            </div>
            <div className="property-block">
              <label>Order</label>
              <div className="property-value">{invoice.order}</div>
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
                  {invoice.items.map((item) => (
                    <tr key={item.name}>
                      <td>{item.name}</td>
                      <td>₹{item.amount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
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
              <span className="summary-value">₹{invoice.tax.toLocaleString('en-IN')}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Total</span>
              <span className="summary-value">₹{invoice.total.toLocaleString('en-IN')}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Payment Status</span>
              <span className="summary-value"><span className="badge status-paid">{invoice.paymentStatus}</span></span>
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
                  {invoice.paymentHistory.map((item) => (
                    <tr key={`${item.date}-${item.method}`}>
                      <td>{item.date}</td>
                      <td>{item.method}</td>
                      <td><span className={`badge ${item.status === 'Paid' ? 'status-paid' : 'status-pending'}`}>{item.status}</span></td>
                      <td>{item.amount}</td>
                    </tr>
                  ))}
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
