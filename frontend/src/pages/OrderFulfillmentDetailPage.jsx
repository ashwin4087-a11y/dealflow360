import { Link, useParams } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import { orderCatalog } from '../data/mockData';

function OrderFulfillmentDetailPage() {
  const { orderId } = useParams();
  const order = orderCatalog.find((item) => item.id === orderId) ?? orderCatalog[0];

  return (
    <>
      <PageHeader title={`Order #${order.id}`} />

      <div className="detail-layout">
        <section className="card summary-box">
          <div className="section-header">
            <h2 className="section-title">Order Summary</h2>
          </div>

          <div className="summary-row">
            <span className="summary-label">Customer:</span>
            <span className="summary-value">{order.customer}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Order Status:</span>
            <span className="summary-value">
              <span className="badge status-partial">{order.status}</span>
            </span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Order Date:</span>
            <span className="summary-value">{order.orderDate}</span>
          </div>
        </section>

        <aside className="stack">
          <div className="card finance-box">
            <div className="section-header">
              <h2 className="section-title">Fulfillment Summary</h2>
            </div>
            <div className="summary-row">
              <span className="summary-label">Ordered:</span>
              <span className="summary-value">{order.totalOrdered}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Fulfilled:</span>
              <span className="summary-value">{order.fulfilled}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Backordered:</span>
              <span className="summary-value">{order.backorderedQty}</span>
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
                <th>Product</th>
                <th>Type</th>
                <th>Ordered</th>
                <th>Available</th>
                <th>Allocated</th>
                <th>Fulfilled</th>
                <th>Backordered</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.product}>
                  <td>{item.product}</td>
                  <td>{item.type}</td>
                  <td>{item.ordered}</td>
                  <td>{item.available}</td>
                  <td>{item.allocated}</td>
                  <td>{item.fulfilled}</td>
                  <td>{item.backordered}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card section-card">
        <div className="section-header">
          <h2 className="section-title">WAREHOUSE ALLOCATION</h2>
          <div className="inline-actions">
            <Link className="action-button" to={`/fulfillment/warehouse-allocation/${order.id}`}>
              Allocate Stock
            </Link>
            <button className="primary-button" type="button">Fulfill Order</button>
          </div>
        </div>
        <div className="table-wrapper">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Warehouse</th>
                <th>Location</th>
                <th>Available</th>
                <th>Allocated</th>
                <th>Expected Delivery</th>
              </tr>
            </thead>
            <tbody>
              {order.warehouseAllocations.map((row) => (
                <tr key={row.warehouse}>
                  <td>{row.warehouse}</td>
                  <td>{row.location}</td>
                  <td>{row.available}</td>
                  <td>{row.allocated}</td>
                  <td>{row.expectedDelivery}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default OrderFulfillmentDetailPage;
