import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import { orderCatalog } from '../data/mockData';

const warehouseRows = [
  { name: 'Warehouse A', available: 60, recommendation: 60, delivery: '2 days', shipping: '₹5,000' },
  { name: 'Warehouse B', available: 40, recommendation: 40, delivery: '3 days', shipping: '₹3,500' },
  { name: 'Warehouse C', available: 10, recommendation: 0, delivery: '5 days', shipping: '₹6,000' },
];

function WarehouseAllocationPage() {
  const { orderId } = useParams();
  const order = orderCatalog.find((item) => item.id === orderId) ?? orderCatalog[0];
  const initialState = useMemo(
    () => ({
      A: order.manualAllocation?.A ?? 60,
      B: order.manualAllocation?.B ?? 40,
      C: order.manualAllocation?.C ?? 0,
    }),
    [order],
  );
  const [allocation, setAllocation] = useState(initialState);
  const total = allocation.A + allocation.B + allocation.C;

  const updateAllocation = (warehouse, value) => {
    const numeric = Number(value) || 0;
    setAllocation((current) => ({ ...current, [warehouse]: numeric }));
  };

  const applyRecommendation = () => {
    setAllocation({ A: 60, B: 40, C: 0 });
  };

  const saveAllocation = () => {
    if (total > 100) {
      window.alert('Allocation total exceeds the required quantity for this order.');
      return;
    }

    window.alert('Allocation saved successfully.');
  };

  const invalid = total > 100;

  return (
    <>
      <PageHeader title="Warehouse Allocation" />

      <section className="card section-card">
        <div className="form-grid">
          <div className="form-group">
            <label>Order</label>
            <div className="property-value">{order.id}</div>
          </div>
          <div className="form-group">
            <label>Product</label>
            <div className="property-value">Laptop Pro</div>
          </div>
          <div className="form-group">
            <label>Required</label>
            <div className="property-value">100 units</div>
          </div>
          <div className="form-group">
            <label>Total Allocation</label>
            <div className={`property-value ${invalid ? 'muted-text' : ''}`}>{total} units</div>
          </div>
        </div>
      </section>

      <section className="card section-card">
        <div className="section-header">
          <h2 className="section-title">Warehouse Allocation</h2>
        </div>

        <div className="table-wrapper">
          <table className="enterprise-table">
            <thead>
              <tr>
                <th>Warehouse</th>
                <th>Available Stock</th>
                <th>Recommended Allocation</th>
                <th>Manual Allocation</th>
                <th>Delivery</th>
                <th>Shipping</th>
              </tr>
            </thead>
            <tbody>
              {warehouseRows.map((row) => (
                <tr key={row.name}>
                  <td>{row.name}</td>
                  <td>{row.available}</td>
                  <td>{row.recommendation}</td>
                  <td>
                    <input
                      className="text-input"
                      type="number"
                      min="0"
                      value={allocation[row.name.split(' ')[1]]}
                      onChange={(event) => updateAllocation(row.name.split(' ')[1], event.target.value)}
                    />
                  </td>
                  <td>{row.delivery}</td>
                  <td>{row.shipping}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="section-header" style={{ marginTop: '20px' }}>
          <h3 className="section-title">SYSTEM RECOMMENDATION</h3>
        </div>

        <div className="summary-row">
          <span className="summary-label">Warehouse A → 60</span>
          <span className="summary-label">Warehouse B → 40</span>
          <span className="summary-label">Total → 100</span>
        </div>

        <div className="page-actions" style={{ marginTop: '18px' }}>
          <button type="button" className="secondary-button" onClick={applyRecommendation}>Apply Recommendation</button>
          <button type="button" className="primary-button" onClick={saveAllocation}>Save Allocation</button>
        </div>

        {invalid && (
          <div style={{ marginTop: '14px', color: '#b93d42', fontWeight: 600 }}>
            Total allocation exceeds available stock and cannot be saved.
          </div>
        )}
      </section>
    </>
  );
}

export default WarehouseAllocationPage;
