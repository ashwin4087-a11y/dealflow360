import { useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import { backorderCatalog } from '../data/mockData';

function BackordersPage() {
  const [selectedBackorder, setSelectedBackorder] = useState(backorderCatalog[0]);

  return (
    <>
      <PageHeader title="Backorders" />

      <div className="kpi-grid">
        <div className="card kpi-card"><div className="kpi-label">Open Backorders</div><div className="kpi-value">5</div></div>
        <div className="card kpi-card"><div className="kpi-label">Units Backordered</div><div className="kpi-value">48</div></div>
        <div className="card kpi-card"><div className="kpi-label">Awaiting Stock</div><div className="kpi-value">4</div></div>
        <div className="card kpi-card"><div className="kpi-label">Ready to Fulfill</div><div className="kpi-value">1</div></div>
      </div>

      <section className="card section-card">
        <div className="table-wrapper">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Backorder</th>
                <th>Original Order</th>
                <th>Product</th>
                <th>Quantity</th>
                <th>Status</th>
                <th>Expected Stock</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {backorderCatalog.map((item) => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td>{item.originalOrder}</td>
                  <td>{item.product}</td>
                  <td>{item.quantity}</td>
                  <td><span className={`badge ${item.status === 'Ready to Fulfill' ? 'status-ready' : 'status-waiting'}`}>{item.status}</span></td>
                  <td>{item.expectedStock}</td>
                  <td>
                    <button type="button" className="action-button" onClick={() => setSelectedBackorder(item)}>
                      {item.actionLabel}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card section-card">
        <div className="section-header">
          <h2 className="section-title">BACKORDER DETAIL</h2>
        </div>

        <div className="properties-grid">
          <div className="property-block">
            <label>Backorder</label>
            <div className="property-value">{selectedBackorder.id}</div>
          </div>
          <div className="property-block">
            <label>Original Order</label>
            <div className="property-value">{selectedBackorder.originalOrder}</div>
          </div>
          <div className="property-block">
            <label>Product</label>
            <div className="property-value">{selectedBackorder.product}</div>
          </div>
          <div className="property-block">
            <label>Backordered Quantity</label>
            <div className="property-value">{selectedBackorder.quantity}</div>
          </div>
          <div className="property-block">
            <label>New Available Stock</label>
            <div className="property-value">{selectedBackorder.availableStock}</div>
          </div>
          <div className="property-block">
            <label>Message</label>
            <div className="property-value">{selectedBackorder.message}</div>
          </div>
        </div>

        <div className="page-actions" style={{ marginTop: '18px', justifyContent: 'flex-start' }}>
          <button type="button" className="primary-button">Fulfill Backorder</button>
          <Link className="ghost-button" to="/fulfillment">Back to overview</Link>
        </div>
      </section>
    </>
  );
}

export default BackordersPage;
