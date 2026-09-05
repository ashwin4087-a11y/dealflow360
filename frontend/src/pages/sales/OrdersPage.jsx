import React, { useEffect, useState } from "react";
import { Boxes } from "lucide-react";
import { orderApi } from "../../api/orderApi";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await orderApi.getOrders();
      if (res.success) {
        setOrders(res.data);
      }
    } catch (err) {
      // The backend order controller might not have a list method in stage 10
      // We will fallback gracefully if that's the case
      setError("Failed to load orders or endpoint not available.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: "2rem" }}>Loading orders...</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Core Sales / Fulfillment</div>
          <h1>Confirmed Orders</h1>
          <p>Orders that have been converted from accepted quotations.</p>
        </div>
      </div>

      <section className="panel">
        <div className="section-heading">
          <Boxes size={16} />
          <h2>All Orders</h2>
        </div>
        {error && <div style={{ padding: "1rem", color: "#b91c1c" }}>{error}</div>}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Quote Ref</th>
                <th>Total Value</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td><strong>{o.orderNumber}</strong></td>
                  <td>{o.quotationId}</td>
                  <td>₹{o.items.reduce((total, item) => total + Number(item.lineTotal || 0), 0).toLocaleString("en-IN")}</td>
                  <td><span className="badge teal">Confirmed</span></td>
                  <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {orders.length === 0 && !error && (
                <tr>
                  <td colSpan="5" style={{ textAlign: "center", padding: "2rem" }}>
                    No orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
