import { Link } from 'react-router-dom';
import PageHeader from '../components/common/PageHeader';
import StatCard from '../components/common/StatCard';
import { fulfillmentOverview, orderCatalog } from '../data/mockData';

const tableColumns = [
  { key: 'id', label: 'Order' },
  { key: 'customer', label: 'Customer' },
  { key: 'totalOrdered', label: 'Items' },
  { key: 'fulfillment', label: 'Fulfillment' },
  { key: 'backordered', label: 'Backordered' },
  { key: 'expectedDelivery', label: 'Expected Delivery' },
  { key: 'action', label: 'Action' },
];

function DashboardPage() {
  const rows = orderCatalog.map((order) => ({
    ...order,
    id: order.id,
    totalOrdered: order.totalOrdered,
    backordered: order.backordered,
    fulfillment: <span className={`badge ${order.fulfillment === 'Backordered' ? 'status-backordered' : order.fulfillment === 'Allocated' ? 'status-allocated' : 'status-partial'}`}>{order.fulfillment}</span>,
    action: <Link className="action-button" to={`/fulfillment/orders/${order.id}`}>View</Link>,
  }));

  return (
    <>
      <PageHeader
        title="Fulfillment & Billing"
        subtitle="Monitor orders, warehouse allocation, fulfillment progress and billing operations."
      />

      <div className="kpi-grid">
        <StatCard label="Orders to Fulfill" value={fulfillmentOverview.ordersToFulfill} />
        <StatCard label="Partially Fulfilled" value={fulfillmentOverview.partiallyFulfilled} />
        <StatCard label="Backorders" value={fulfillmentOverview.backorders} />
        <StatCard label="Ready to Ship" value={fulfillmentOverview.readyToShip} />
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
                  <td>{row.id}</td>
                  <td>{row.customer}</td>
                  <td>{row.totalOrdered}</td>
                  <td>{row.fulfillment}</td>
                  <td>{row.backordered}</td>
                  <td>{row.expectedDelivery}</td>
                  <td>
                    <Link className="action-button" to={`/fulfillment/orders/${row.id}`}>
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export default DashboardPage;
