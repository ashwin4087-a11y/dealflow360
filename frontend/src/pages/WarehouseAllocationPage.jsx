import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import { allocationApi, inventoryApi } from '../api/fulfillmentApi';
import { orderApi } from '../api/orderApi';

function WarehouseAllocationPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      orderApi.getOrders(),
      inventoryApi.getWarehouses(),
      allocationApi.getOrderAllocations(orderId).catch(() => ({ success: true, data: [] })),
    ]).then(([ordersRes, whRes, allocRes]) => {
      if (!active) return;
      const found = (ordersRes.data || []).find(o => o.id === orderId);
      setOrder(found || null);
      setWarehouses(whRes.data || []);
      setAllocations(Array.isArray(allocRes.data) ? allocRes.data : []);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [orderId]);

  // Build manual allocation state from warehouses
  const initialState = useMemo(() => {
    const state = {};
    warehouses.forEach(wh => {
      const existing = allocations.find(a => a.warehouseId === wh.id);
      state[wh.id] = existing ? Number(existing.allocatedQuantity) : 0;
    });
    return state;
  }, [warehouses, allocations]);

  const [manualAllocation, setManualAllocation] = useState({});

  useEffect(() => {
    setManualAllocation(initialState);
  }, [initialState]);

  const total = Object.values(manualAllocation).reduce((sum, v) => sum + (Number(v) || 0), 0);

  const updateAllocation = (warehouseId, value) => {
    const numeric = Number(value) || 0;
    setManualAllocation(current => ({ ...current, [warehouseId]: numeric }));
  };

  const saveAllocation = () => {
    if (!order || !order.items || !order.items.length) {
      window.alert('No order items to allocate.');
      return;
    }
    // For each warehouse with allocation > 0, call the replace API
    const allocationData = Object.entries(manualAllocation)
      .filter(([, qty]) => qty > 0)
      .map(([warehouseId, allocatedQuantity]) => ({ warehouseId, allocatedQuantity: String(allocatedQuantity) }));

    if (!allocationData.length) {
      window.alert('No allocations specified.');
      return;
    }

    // Use the first order item for now
    allocationApi.replace(order.items[0].id, { allocations: allocationData })
      .then(() => window.alert('Allocation saved successfully.'))
      .catch(err => window.alert('Failed to save: ' + err.message));
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Warehouse Allocation" />
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
      </>
    );
  }

  const firstItem = order?.items?.[0];
  const requiredQty = firstItem ? Number(firstItem.quantity) : 0;
  const invalid = requiredQty > 0 && total > requiredQty;

  return (
    <>
      <PageHeader title="Warehouse Allocation" />

      <section className="card section-card">
        <div className="form-grid">
          <div className="form-group">
            <label>Order</label>
            <div className="property-value">{order?.orderNumber || orderId}</div>
          </div>
          <div className="form-group">
            <label>Product</label>
            <div className="property-value">{firstItem?.productId || '—'}</div>
          </div>
          <div className="form-group">
            <label>Required</label>
            <div className="property-value">{requiredQty} units</div>
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
                <th>Location</th>
                <th>Code</th>
                <th>Manual Allocation</th>
              </tr>
            </thead>
            <tbody>
              {warehouses.map((wh) => (
                <tr key={wh.id}>
                  <td>{wh.name}</td>
                  <td>{wh.location || '—'}</td>
                  <td>{wh.code}</td>
                  <td>
                    <input
                      className="text-input"
                      type="number"
                      min="0"
                      value={manualAllocation[wh.id] || 0}
                      onChange={(event) => updateAllocation(wh.id, event.target.value)}
                    />
                  </td>
                </tr>
              ))}
              {!warehouses.length && (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '1rem' }}>No warehouses found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="page-actions" style={{ marginTop: '18px' }}>
          <button type="button" className="primary-button" onClick={saveAllocation}>Save Allocation</button>
        </div>

        {invalid && (
          <div style={{ marginTop: '14px', color: '#b93d42', fontWeight: 600 }}>
            Total allocation exceeds required quantity and cannot be saved.
          </div>
        )}
      </section>
    </>
  );
}

export default WarehouseAllocationPage;
