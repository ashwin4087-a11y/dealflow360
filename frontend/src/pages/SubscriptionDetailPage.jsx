import { useParams } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import { subscriptionCatalog } from '../data/mockData';

function SubscriptionDetailPage() {
  const { subscriptionId } = useParams();
  const subscription = subscriptionCatalog.find((item) => item.id === subscriptionId) ?? subscriptionCatalog[0];

  return (
    <>
      <PageHeader title={`SUBSCRIPTION #${subscription.id}`} />

      <div className="detail-layout">
        <section className="card summary-box">
          <div className="properties-grid">
            <div className="property-block">
              <label>Customer</label>
              <div className="property-value">{subscription.customer}</div>
            </div>
            <div className="property-block">
              <label>Product</label>
              <div className="property-value">{subscription.product}</div>
            </div>
            <div className="property-block">
              <label>Amount</label>
              <div className="property-value">₹{subscription.amount.toLocaleString('en-IN')} / {subscription.billing.toLowerCase()}</div>
            </div>
            <div className="property-block">
              <label>Start Date</label>
              <div className="property-value">{subscription.startDate}</div>
            </div>
            <div className="property-block">
              <label>Next Billing</label>
              <div className="property-value">{subscription.nextBilling}</div>
            </div>
            <div className="property-block">
              <label>Status</label>
              <div className="property-value"><span className="badge status-active">ACTIVE</span></div>
            </div>
          </div>

          <div className="page-actions" style={{ marginTop: '20px', justifyContent: 'flex-start' }}>
            <button type="button" className="secondary-button">Modify Subscription</button>
            <button type="button" className="ghost-button" onClick={() => window.confirm('Cancel subscription?') && (window.alert('Subscription cancelled.'))}>Cancel Subscription</button>
          </div>
        </section>

        <aside className="card finance-box">
          <div className="section-header">
            <h2 className="section-title">Billing History</h2>
          </div>
          <div className="table-wrapper">
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {subscription.paymentHistory.map((entry) => (
                  <tr key={`${entry.invoice}-${entry.date}`}>
                    <td>{entry.invoice}</td>
                    <td>{entry.date}</td>
                    <td>{entry.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </aside>
      </div>
    </>
  );
}

export default SubscriptionDetailPage;
