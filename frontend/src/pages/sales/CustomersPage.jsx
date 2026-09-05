import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, Mail, Phone, Search, Users } from "lucide-react";
import { customerApi } from "../../api/customerApi";

const customerSearchText = (customer) => [
  customer.name,
  customer.company,
  customer.email,
  customer.phone,
  customer.customerTier,
].filter(Boolean).join(" ").toLowerCase();

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await customerApi.getCustomers();
      setCustomers(response.data || []);
    } catch (requestError) {
      setError(requestError.message || "Unable to load customers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;
    return customers.filter((customer) => customerSearchText(customer).includes(query));
  }, [customers, search]);

  const selectCustomer = (customer) => {
    navigate(`/sales/quotations/new?customerId=${encodeURIComponent(customer.id)}`, {
      state: { selectedCustomer: customer },
    });
  };

  if (loading) return <div className="empty-state">Loading customers...</div>;

  if (error) {
    return (
      <section className="panel empty-state">
        <AlertTriangle size={24} />
        <h2>Customers unavailable</h2>
        <p>{error}</p>
        <button className="primary-button" type="button" onClick={loadCustomers}>Retry</button>
      </section>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Core Sales / Customer selection</div>
          <h1>Select a customer</h1>
          <p>Choose an existing customer before starting the next quotation stage.</p>
        </div>
      </div>

      <section className="panel">
        <div className="section-heading customer-selection-heading">
          <div><Users size={16} /><h2>Customers</h2></div>
          <label className="search-box" htmlFor="customer-search">
            <Search size={16} />
            <input id="customer-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customers..." />
          </label>
        </div>

        <div className="table-wrap">
          <table>
            <thead><tr><th>Customer</th><th>Contact</th><th>Tier</th><th>Addresses</th><th>Action</th></tr></thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td><strong>{customer.name}</strong><small>{customer.company || "Company not provided"}</small></td>
                  <td><div className="customer-contact">{customer.email && <span><Mail size={13} />{customer.email}</span>}{customer.phone && <span><Phone size={13} />{customer.phone}</span>}{!customer.email && !customer.phone && <span>Contact not provided</span>}</div></td>
                  <td><span className="badge blue">{customer.customerTier}</span></td>
                  <td><small>{customer.billingAddress || customer.shippingAddress || "Address not provided"}</small></td>
                  <td><button className="primary-button compact" type="button" onClick={() => selectCustomer(customer)}>Select <ArrowRight size={14} /></button></td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && <tr><td colSpan="5" className="empty-state">{customers.length ? "No customers match your search." : "No customers returned by the backend."}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
