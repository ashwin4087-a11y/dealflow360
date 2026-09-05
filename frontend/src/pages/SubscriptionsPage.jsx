import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import { subscriptionApi } from '../api/subscriptionApi';

function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    subscriptionApi.getSubscriptions()
      .then(res => {
        if (active && res.success) {
          setSubscriptions(res.data || []);
        }
      })
      .catch(err => {
        if (active) setError('Failed to load subscriptions.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const fmt = (val) => `₹${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  return (
    <>
      <PageHeader title="Subscriptions" />

      <section className="card section-card">
        <div className="table-wrapper">
          {loading && <div style={{ padding: '2rem', textAlign: 'center' }}>Loading subscriptions...</div>}
          {error && !loading && <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>{error}</div>}
          {!loading && !error && (
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Subscription No</th>
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
                {subscriptions.map((subscription) => (
                  <tr key={subscription.id}>
                    <td>{subscription.subscriptionNumber || subscription.id}</td>
                    <td>{subscription.customer?.name}</td>
                    <td>{subscription.product?.name}</td>
                    <td>{subscription.billingCycle}</td>
                    <td>{fmt(subscription.amount)}</td>
                    <td>{new Date(subscription.nextBillingDate).toLocaleDateString()}</td>
                    <td><span className={`badge ${subscription.status === 'ACTIVE' ? 'status-active' : 'status-pending'}`}>{subscription.status}</span></td>
                    <td><Link className="action-button" to={`/fulfillment/subscriptions/${subscription.id}`}>View</Link></td>
                  </tr>
                ))}
                {!subscriptions.length && (
                  <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>No subscriptions found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}

export default SubscriptionsPage;
