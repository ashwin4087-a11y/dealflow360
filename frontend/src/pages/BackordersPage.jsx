import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import { backorderApi } from '../api/fulfillmentApi';

function BackordersPage() {
  const [backorders, setBackorders] = useState([]);
  const [selectedBackorder, setSelectedBackorder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    backorderApi.getEligible()
      .then(res => {
        if (active && res.success) {
          const data = res.data || [];
          setBackorders(data);
          if (data.length > 0) setSelectedBackorder(data[0]);
        }
      })
      .catch(() => {
        if (active) setError('Failed to load backorders.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const openBackorders = backorders.filter(b => b.status === 'BACKORDERED' || b.status === 'READY_TO_FULFILL');
  const totalUnits = backorders.reduce((sum, b) => sum + Number(b.remainingQuantity || b.requiredQuantity || 0), 0);
  const awaitingStock = backorders.filter(b => b.status === 'BACKORDERED').length;
  const readyToFulfill = backorders.filter(b => b.status === 'READY_TO_FULFILL').length;

  const handleFulfill = (backorderId) => {
    backorderApi.fulfill(backorderId, {})
      .then(() => {
        setBackorders(prev => prev.map(b =>
          b.id === backorderId ? { ...b, status: 'FULFILLED' } : b
        ));
        window.alert('Backorder fulfilled successfully.');
      })
      .catch(err => window.alert('Failed to fulfill: ' + err.message));
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Backorders" />
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading backorders...</div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Backorders" />

      <div className="kpi-grid">
        <div className="card kpi-card"><div className="kpi-label">Open Backorders</div><div className="kpi-value">{openBackorders.length}</div></div>
        <div className="card kpi-card"><div className="kpi-label">Units Backordered</div><div className="kpi-value">{totalUnits}</div></div>
        <div className="card kpi-card"><div className="kpi-label">Awaiting Stock</div><div className="kpi-value">{awaitingStock}</div></div>
        <div className="card kpi-card"><div className="kpi-label">Ready to Fulfill</div><div className="kpi-value">{readyToFulfill}</div></div>
      </div>

      {error && <div style={{ padding: '1rem', color: '#ef4444', textAlign: 'center' }}>{error}</div>}

      <section className="card section-card">
        <div className="table-wrapper">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Backorder</th>
                <th>Order</th>
                <th>Product</th>
                <th>Required Qty</th>
                <th>Remaining</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {backorders.map((item) => (
                <tr key={item.id}>
                  <td>{item.id.slice(0, 12)}…</td>
                  <td>{item.orderId?.slice(0, 12) || '—'}</td>
                  <td>{item.productId?.slice(0, 12) || '—'}</td>
                  <td>{item.requiredQuantity}</td>
                  <td>{item.remainingQuantity}</td>
                  <td><span className={`badge ${item.status === 'READY_TO_FULFILL' ? 'status-ready' : 'status-waiting'}`}>{item.status}</span></td>
                  <td>
                    <button type="button" className="action-button" onClick={() => setSelectedBackorder(item)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {!backorders.length && (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>No backorders found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedBackorder && (
        <section className="card section-card">
          <div className="section-header">
            <h2 className="section-title">BACKORDER DETAIL</h2>
          </div>

          <div className="properties-grid">
            <div className="property-block">
              <label>Backorder ID</label>
              <div className="property-value">{selectedBackorder.id}</div>
            </div>
            <div className="property-block">
              <label>Order</label>
              <div className="property-value">{selectedBackorder.orderId}</div>
            </div>
            <div className="property-block">
              <label>Product</label>
              <div className="property-value">{selectedBackorder.productId}</div>
            </div>
            <div className="property-block">
              <label>Required Quantity</label>
              <div className="property-value">{selectedBackorder.requiredQuantity}</div>
            </div>
            <div className="property-block">
              <label>Remaining Quantity</label>
              <div className="property-value">{selectedBackorder.remainingQuantity}</div>
            </div>
            <div className="property-block">
              <label>Status</label>
              <div className="property-value">{selectedBackorder.status}</div>
            </div>
          </div>

          <div className="page-actions" style={{ marginTop: '18px', justifyContent: 'flex-start' }}>
            {selectedBackorder.status === 'READY_TO_FULFILL' && (
              <button type="button" className="primary-button" onClick={() => handleFulfill(selectedBackorder.id)}>
                Fulfill Backorder
              </button>
            )}
            <Link className="ghost-button" to="/fulfillment">Back to overview</Link>
          </div>
        </section>
      )}
    </>
  );
}

export default BackordersPage;
