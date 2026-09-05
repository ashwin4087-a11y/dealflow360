import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import StatCard from '../components/common/StatCard';
import { orderApi } from '../api/orderApi';
import { fulfillmentApi } from '../api/fulfillmentApi';
import { backorderApi } from '../api/fulfillmentApi';

function DashboardPage() {
  const [orders, setOrders] = useState([]);
  const [fulfillmentRecords, setFulfillmentRecords] = useState([]);
  const [backorders, setBackorders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      orderApi.getOrders().catch(() => ({ success: false, data: [] })),
      fulfillmentApi.getRecords().catch(() => ({ success: false, data: [] })),
      backorderApi.getEligible().catch(() => ({ success: false, data: [] })),
    ]).then(([ordersRes, fulfillmentRes, backordersRes]) => {
      if (!active) return;
      setOrders(ordersRes.data || []);
      setFulfillmentRecords(fulfillmentRes.data || []);
      setBackorders(backordersRes.data || []);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  // Compute KPI stats from live data
  const ordersToFulfill = orders.length;
  const fulfilledCount = fulfillmentRecords.filter(r => r.status === 'FULFILLED').length;
  const partiallyFulfilled = fulfillmentRecords.filter(r => r.status === 'PARTIALLY_FULFILLED').length;
  const backorderCount = backorders.length;
  const readyToShip = fulfillmentRecords.filter(r => r.status === 'ALLOCATED').length;

  const tableColumns = [
    { key: 'orderNumber', label: 'Order' },
    { key: 'quotationId', label: 'Quotation' },
    { key: 'itemCount', label: 'Items' },
    { key: 'createdAt', label: 'Order Date' },
    { key: 'action', label: 'Action' },
  ];

  const rows = orders.map((order) => ({
    ...order,
    itemCount: order.items ? order.items.length : 0,
    createdAt: new Date(order.createdAt).toLocaleDateString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric',
    }),
  }));

  if (loading) {
    return (
      <>
        <PageHeader
          title="Fulfillment & Billing"
          subtitle="Monitor orders, warehouse allocation, fulfillment progress and billing operations."
        />
        <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Fulfillment & Billing"
        subtitle="Monitor orders, warehouse allocation, fulfillment progress and billing operations."
      />

      <div className="kpi-grid">
        <StatCard label="Orders to Fulfill" value={ordersToFulfill} />
        <StatCard label="Partially Fulfilled" value={partiallyFulfilled} />
        <StatCard label="Backorders" value={backorderCount} />
        <StatCard label="Ready to Ship" value={readyToShip} />
      </div>

      <section className="card section-card">
        <div className="section-header">
          <h2 className="section-title">FULFILLMENT ORDERS</h2>
        </div>

        <div className="table-wrapper">
          <table className="enterprise-table">
            <thead>
              <tr>
                {tableColumns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.orderNumber}</td>
                  <td>{row.quotationId}</td>
                  <td>{row.itemCount}</td>
                  <td>{row.createdAt}</td>
                  <td>
                    <Link className="action-button" to={`/fulfillment/orders/${row.id}`}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={tableColumns.length} style={{ textAlign: 'center', padding: '2rem' }}>No orders found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default DashboardPage;
