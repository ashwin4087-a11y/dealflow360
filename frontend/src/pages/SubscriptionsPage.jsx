import { Link } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import { subscriptionCatalog } from '../data/mockData';

function SubscriptionsPage() {
  return (
    <>
      <PageHeader title="Subscriptions" />

      <section className="card section-card">
        <div className="table-wrapper">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Subscription</th>
                <th>Customer</th>
                <th>Product</th>
                <th>Billing</th>
                <th>Amount</th>
                <th>Next Billing</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {subscriptionCatalog.map((subscription) => (
                <tr key={subscription.id}>
                  <td>{subscription.id}</td>
                  <td>{subscription.customer}</td>
                  <td>{subscription.product}</td>
                  <td>{subscription.billing}</td>
                  <td>₹{subscription.amount.toLocaleString('en-IN')}</td>
                  <td>{subscription.nextBilling}</td>
                  <td><span className="badge status-active">{subscription.status}</span></td>
                  <td><Link className="action-button" to={`/fulfillment/subscriptions/${subscription.id}`}>View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default SubscriptionsPage;
