import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import { invoiceApi } from '../api/invoiceApi';

function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    invoiceApi.getInvoices()
      .then(res => {
        if (active && res.success) {
          setInvoices(res.data || []);
        }
      })
      .catch(err => {
        if (active) setError('Failed to load invoices.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const totalInvoiced = invoices.reduce((acc, inv) => acc + Number(inv.total), 0);
  const totalPaid = invoices.filter(inv => inv.status === 'PAID').reduce((acc, inv) => acc + Number(inv.total), 0);
  const totalPending = totalInvoiced - totalPaid;

  const fmt = (val) => `₹${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  return (
    <>
      <PageHeader title="Invoices" />

      <section className="card section-card">
        <div className="properties-grid">
          <div className="property-block">
            <label>Total Invoiced</label>
            <div className="property-value">{fmt(totalInvoiced)}</div>
          </div>
          <div className="property-block">
            <label>Pending</label>
            <div className="property-value">{fmt(totalPending)}</div>
          </div>
          <div className="property-block">
            <label>Paid</label>
            <div className="property-value">{fmt(totalPaid)}</div>
          </div>
        </div>
      </section>

      <section className="card section-card">
        <div className="table-wrapper">
          {loading && <div style={{ padding: '2rem', textAlign: 'center' }}>Loading invoices...</div>}
          {error && !loading && <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>{error}</div>}
          {!loading && !error && (
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Invoice No</th>
                  <th>Customer</th>
                  <th>Order ID</th>
                  <th>Total</th>
                  <th>Issue Date</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((row) => (
                  <tr key={row.id}>
                    <td>{row.invoiceNumber}</td>
                    <td>{row.customer?.name}</td>
                    <td>{row.order?.id || 'N/A'}</td>
                    <td>{fmt(row.total)}</td>
                    <td>{new Date(row.issueDate).toLocaleDateString()}</td>
                    <td>{new Date(row.dueDate).toLocaleDateString()}</td>
                    <td><span className={`badge ${row.status === 'PAID' ? 'status-paid' : 'status-pending'}`}>{row.status}</span></td>
                    <td><Link className="action-button" to={`/fulfillment/invoices/${row.id}`}>View</Link></td>
                  </tr>
                ))}
                {!invoices.length && (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>No invoices found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}

export default InvoicesPage;
