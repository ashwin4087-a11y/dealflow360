import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import PageHeader from '../components/common/PageHeader';
import { subscriptionApi } from '../api/subscriptionApi';

function SubscriptionDetailPage() {
  const { subscriptionId } = useParams();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    subscriptionApi.getSubscription(subscriptionId)
      .then(res => {
        if (active && res.success) {
          setSubscription(res.data);
        } else if (active) {
          setError('Subscription not found');
        }
      })
      .catch(err => {
        if (active) setError('Failed to load subscription details.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [subscriptionId]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading subscription...</div>;
  if (error || !subscription) return <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>{error || 'Subscription not found'}</div>;

  const fmt = (val) => `₹${Number(val).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  return (
    <>
      <PageHeader title={`SUBSCRIPTION #${subscription.subscriptionNumber || subscription.id}`} />

      <div className="detail-layout">
        <section className="card summary-box">
          <div className="properties-grid">
            <div className="property-block">
              <label>Customer</label>
              <div className="property-value">{subscription.customer?.name}</div>
            </div>
            <div className="property-block">
              <label>Product</label>
              <div className="property-value">{subscription.product?.name}</div>
            </div>
            <div className="property-block">
              <label>Amount</label>
              <div className="property-value">{fmt(subscription.amount)} / {subscription.billingCycle?.toLowerCase()}</div>
            </div>
            <div className="property-block">
              <label>Start Date</label>
              <div className="property-value">{new Date(subscription.startDate).toLocaleDateString()}</div>
            </div>
            <div className="property-block">
              <label>Next Billing</label>
              <div className="property-value">{new Date(subscription.nextBillingDate).toLocaleDateString()}</div>
            </div>
            <div className="property-block">
              <label>Status</label>
              <div className="property-value"><span className={`badge ${subscription.status === 'ACTIVE' ? 'status-active' : 'status-pending'}`}>{subscription.status}</span></div>
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
                {subscription.payments?.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.invoice?.invoiceNumber || entry.invoiceId || 'N/A'}</td>
                    <td>{new Date(entry.date).toLocaleDateString()}</td>
                    <td>{fmt(entry.amount)}</td>
                  </tr>
                ))}
                {(!subscription.payments || subscription.payments.length === 0) && (
                  <tr><td colSpan="3" style={{ textAlign: 'center', padding: '1rem' }}>No billing history found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </aside>
      </div>
    </>
  );
}

export default SubscriptionDetailPage;
