import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { customerApi } from "../../api/customerApi";
import { Users, Search, ArrowRight } from "lucide-react";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const response = await customerApi.getCustomers();
        if (response.success) {
          setCustomers(response.data);
        }
      } catch (err) {
        setError("Failed to load customers.");
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.industry.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div style={{ padding: "2rem" }}>Loading customers...</div>;
  if (error) return <div style={{ padding: "2rem", color: "red" }}>{error}</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Core Sales / Directory</div>
          <h1>Customer Selection</h1>
          <p>Select a customer to begin a new quotation.</p>
        </div>
      </div>

      <section className="panel">
        <div className="section-heading" style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={16} />
            <h2>All Customers</h2>
          </div>
          <label className="search-box">
            <Search size={16} />
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Search accounts..." 
            />
          </label>
        </div>
        
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer Name</th>
                <th>Tier</th>
                <th>Industry</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                  </td>
                  <td>
                    <span className={`badge ${c.tier === 'GOLD' ? 'amber' : c.tier === 'SILVER' ? 'gray' : ''}`}>
                      {c.tier}
                    </span>
                  </td>
                  <td>{c.industry}</td>
                  <td>
                    <button 
                      className="primary-button compact" 
                      onClick={() => navigate(`/sales/quotations/new?customerId=${c.id}`)}
                    >
                      Start Quote <ArrowRight size={14} style={{ marginLeft: '4px' }}/>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: "center", padding: "2rem" }}>
                    No customers found.
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
