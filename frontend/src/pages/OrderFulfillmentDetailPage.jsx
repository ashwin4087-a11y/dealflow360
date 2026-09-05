import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import { orderApi } from '../api/orderApi';
import { fulfillmentApi, allocationApi } from '../api/fulfillmentApi';

function OrderFulfillmentDetailPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [fulfillment, setFulfillment] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [fulfilling, setFulfilling] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      orderApi.getOrders(),
      fulfillmentApi.getOrderFulfillment(orderId).catch(() => ({ success: true, data: [] })),
      allocationApi.getOrderAllocations(orderId).catch(() => ({ success: true, data: [] })),
    ]).then(([ordersRes, fulRes, allocRes]) => {
      if (!active) return;
      const found = (ordersRes.data || []).find(o => o.id === orderId);
      setOrder(found || null);
      setFulfillment(Array.isArray(fulRes.data) ? fulRes.data : []);
      setAllocations(Array.isArray(allocRes.data) ? allocRes.data : []);
    }).catch(() => {
      if (active) setError('Failed to load order details.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [orderId]);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading order details...</div>;
  if (error) return <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>{error}</div>;
  if (!order) return <div style={{ padding: '2rem', textAlign: 'center' }}>Order not found.</div>;

  const items = order.items || [];
  const totalOrdered = items.reduce((sum, item) => sum + Number(item.quantity), 0);
  const fulfilledQty = fulfillment.reduce((sum, f) => sum + Number(f.fulfilledQuantity || 0), 0);

  const handleFulfill = async () => {
    if (!allocations.length) {
      alert("No allocations to fulfill.");
      return;
    }
    setFulfilling(true);
    try {
      for (const alloc of allocations) {
        await fulfillmentApi.confirmFulfillment(alloc.id, { quantity: alloc.allocatedQuantity });
      }
      alert("Order fulfilled successfully.");
      // Reload the page data
      const [fulRes, allocRes] = await Promise.all([
        fulfillmentApi.getOrderFulfillment(orderId).catch(() => ({ success: true, data: [] })),
        allocationApi.getOrderAllocations(orderId).catch(() => ({ success: true, data: [] })),
      ]);
      setFulfillment(Array.isArray(fulRes.data) ? fulRes.data : []);
      setAllocations(Array.isArray(allocRes.data) ? allocRes.data : []);
    } catch (err) {
      alert(err.message || "Failed to fulfill order.");
    } finally {
      setFulfilling(false);
    }
  };

  return (
    <>
      <PageHeader title={`Order #${order.orderNumber}`} />

      <div className="detail-layout">
        <section className="card summary-box">
          <div className="section-header">
            <h2 className="section-title">Order Summary</h2>
          </div>

          <div className="summary-row">
            <span className="summary-label">Order Number:</span>
            <span className="summary-value">{order.orderNumber}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Order Date:</span>
            <span className="summary-value">
              {new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
          </div>
        </section>

        <aside className="stack">
          <div className="card finance-box">
            <div className="section-header">
              <h2 className="section-title">Fulfillment Summary</h2>
            </div>
            <div className="summary-row">
              <span className="summary-label">Ordered:</span>
              <span className="summary-value">{totalOrdered}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Fulfilled:</span>
              <span className="summary-value">{fulfilledQty}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Allocations:</span>
              <span className="summary-value">{allocations.length}</span>
            </div>
          </div>
        </aside>
      </div>

      <section className="card section-card">
        <div className="section-header">
          <h2 className="section-title">ORDER ITEMS</h2>
        </div>
        <div className="table-wrapper">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Product ID</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.productId}</td>
                  <td>{item.quantity}</td>
                  <td>₹{Number(item.unitPrice).toLocaleString('en-IN')}</td>
                  <td>₹{Number(item.lineTotal).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card section-card">
        <div className="section-header">
          <h2 className="section-title">ALLOCATIONS</h2>
          <div className="inline-actions">
            <Link className="action-button" to={`/fulfillment/warehouse-allocation/${order.id}`}>
              Allocate Stock
            </Link>
            <button className="primary-button" type="button" onClick={handleFulfill} disabled={fulfilling || !allocations.length}>
              {fulfilling ? "Fulfilling..." : "Fulfill Order"}
            </button>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Order Item</th>
                <th>Warehouse</th>
                <th>Allocated Qty</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {allocations.map((row) => (
                <tr key={row.id}>
                  <td>{row.orderItemId}</td>
                  <td>{row.warehouseId}</td>
                  <td>{row.allocatedQuantity}</td>
                  <td>{new Date(row.createdAt).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
              {!allocations.length && (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '1rem' }}>No allocations yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default OrderFulfillmentDetailPage;
