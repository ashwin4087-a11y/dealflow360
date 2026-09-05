import { Link } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import { invoiceCatalog } from '../data/mockData';

const invoiceRows = invoiceCatalog.map((invoice) => ({
  ...invoice,
  amount: `₹${invoice.amount.toLocaleString('en-IN')}`,
  action: <Link className="action-button" to={`/fulfillment/invoices/${invoice.id}`}>View</Link>,
}));

function InvoicesPage() {
  return (
    <>
      <PageHeader title="Invoices" />

      <section className="card section-card">
        <div className="properties-grid">
          <div className="property-block">
            <label>Total Invoiced</label>
            <div className="property-value">₹24.8L</div>
          </div>
          <div className="property-block">
            <label>Pending</label>
            <div className="property-value">₹4.2L</div>
          </div>
          <div className="property-block">
            <label>Paid</label>
            <div className="property-value">₹19.6L</div>
          </div>
        </div>
      </section>

      <section className="card section-card">
        <div className="table-wrapper">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer</th>
                <th>Order</th>
                <th>Amount</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {invoiceRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.id}</td>
                  <td>{row.customer}</td>
                  <td>{row.order}</td>
                  <td>{row.amount}</td>
                  <td>{row.issueDate}</td>
                  <td>{row.dueDate}</td>
                  <td><span className={`badge ${row.status === 'Paid' ? 'status-paid' : 'status-pending'}`}>{row.status}</span></td>
                  <td><Link className="action-button" to={`/fulfillment/invoices/${row.id}`}>View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default InvoicesPage;
