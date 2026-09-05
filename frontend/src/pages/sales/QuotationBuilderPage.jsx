import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { customerApi } from "../../api/customerApi";
import { productApi } from "../../api/productApi";
import { quotationApi } from "../../api/quotationApi";
import { Plus, Trash2, Save, Send, AlertTriangle, SlidersHorizontal } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import WhatIfSimulator from "../../components/quotation/WhatIfSimulator";
import { intelligenceApi } from "../../api/intelligenceApi";

export default function QuotationBuilderPage() {
  const [searchParams] = useSearchParams();
  const customerIdParam = searchParams.get("customerId");
  const { id } = useParams(); // If editing an existing quotation
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [catalog, setCatalog] = useState([]);
  
  // Builder state
  const [items, setItems] = useState([]);
  const [quotation, setQuotation] = useState(null); // The backend response
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    const initBuilder = async () => {
      try {
        const [custRes, prodRes] = await Promise.all([
          customerIdParam ? customerApi.getCustomerById(customerIdParam) : Promise.resolve({ data: null }),
          productApi.getProducts()
        ]);

        if (prodRes.success) setCatalog(prodRes.data.filter(p => p.active));
        
        if (id) {
          // Edit mode
          const qRes = await quotationApi.getQuotationById(id);
          if (qRes.success) {
            setQuotation(qRes.data);
            setCustomer(qRes.data.customer);
            // Map items for editing
            setItems(qRes.data.items.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              discountPercent: item.discountPercent || 0
            })));
            intelligenceApi.quotationRecommendations(qRes.data.id)
              .then((response) => setRecommendations(response.data || []))
              .catch(() => setRecommendations([]));
          }
        } else if (custRes.success && custRes.data) {
          setCustomer(custRes.data);
        } else {
          setError("Customer not found. Please start from the Customers page.");
        }
      } catch (err) {
        setError(err.message || "Failed to load builder data");
      } finally {
        setLoading(false);
      }
    };

    initBuilder();
  }, [customerIdParam, id]);

  const addItem = () => {
    if (catalog.length > 0) {
      setItems([...items, { productId: catalog[0].id, quantity: 1, discountPercent: 0 }]);
    }
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const saveToBackend = async (submitForApproval = false) => {
    setSaving(true);
    setError("");
    try {
      let res;
      if (id) {
        res = await quotationApi.updateQuotation(id, items, customer.id);
      } else {
        res = await quotationApi.createQuotation(customer.id, items);
      }
      
      if (res.success) {
        setQuotation(res.data);
        if (!id) {
          // Replace URL to reflect editing the newly created draft
          navigate(`/sales/quotations/${res.data.id}/edit`, { replace: true });
        }
      }
    } catch (err) {
      setError(err.message || "Failed to save quotation");
    } finally {
      setSaving(false);
    }
  };

  const applyScenario = async (scenarioItems) => {
    setSaving(true);
    setError("");
    try {
      const response = await quotationApi.updateQuotation(id, scenarioItems, customer.id);
      setQuotation(response.data);
      setItems(response.data.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        discountPercent: item.discountPercent || 0,
      })));
      setSimulatorOpen(false);
    } catch (requestError) {
      setError(requestError.message || "Failed to apply scenario");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: "2rem" }}>Loading quotation builder...</div>;
  if (!customer) return <div style={{ padding: "2rem", color: "red" }}>{error}</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="eyebrow">Core Sales / Quotation Builder</div>
          <h1>{id ? `Edit Quotation ${quotation?.quotationNumber || ''}` : "Create Quotation"}</h1>
          <p>Customer: <strong>{customer.name}</strong> ({customer.tier})</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="secondary-button" 
            onClick={() => saveToBackend()} 
            disabled={saving || items.length === 0}
          >
            <Save size={16} /> Save Draft / Calculate
          </button>
          {quotation && (
            <button className="secondary-button" type="button" onClick={() => setSimulatorOpen(true)} disabled={saving}>
              <SlidersHorizontal size={16} /> What-If
            </button>
          )}
          {quotation && quotation.status === "DRAFT" && (
             <button className="primary-button" onClick={() => navigate(`/sales/quotations/${quotation.id}`)}>
               Review & Submit <Send size={16} />
             </button>
          )}
        </div>
      </div>

      {error && (
        <div className="toast" style={{ position: 'relative', top: 0, right: 0, transform: 'none', marginBottom: '1rem', width: '100%', backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #f87171' }}>
          <AlertTriangle size={16} />
          <span style={{ fontSize: '0.875rem', flex: 1 }}>{error}</span>
        </div>
      )}

      {quotation && recommendations.length > 0 && (
        <section className="panel" style={{ marginBottom: "1rem" }}>
          <div className="section-heading"><h2>Product recommendations</h2><span className="badge blue">Backend</span></div>
          <div className="table-wrap"><table><thead><tr><th>Product</th><th>Type</th><th>Reason</th><th>Value</th></tr></thead><tbody>
            {recommendations.map((recommendation) => <tr key={recommendation.product.id}><td><strong>{recommendation.product.name}</strong><small>{recommendation.product.sku}</small></td><td><span className="badge teal">{recommendation.type}</span></td><td>{recommendation.reason}</td><td>{recommendation.potentialValue ? `₹${Number(recommendation.potentialValue).toLocaleString("en-IN")}` : "Available"}</td></tr>)}
          </tbody></table></div>
        </section>
      )}

      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        
        {/* Left Column: Builder Form */}
        <div style={{ flex: 2 }}>
          <section className="panel">
            <div className="section-heading">
              <h2>Line Items</h2>
              <button className="small-button" onClick={addItem}><Plus size={14} /> Add Product</button>
            </div>
            
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th style={{ width: '100px' }}>Quantity</th>
                    <th style={{ width: '120px' }}>Discount (%)</th>
                    <th style={{ width: '60px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <select 
                          value={item.productId} 
                          onChange={(e) => updateItem(index, 'productId', e.target.value)}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                        >
                          {catalog.map(p => (
                            <option key={p.id} value={p.id}>{p.name} - ₹{parseFloat(p.basePrice).toLocaleString()}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input 
                          type="number" 
                          min="1" 
                          value={item.quantity} 
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                        />
                      </td>
                      <td>
                        <input 
                          type="number" 
                          min="0"
                          max="100"
                          value={item.discountPercent}
                          onChange={(e) => updateItem(index, 'discountPercent', parseFloat(e.target.value) || 0)}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #d1d5db' }}
                        />
                      </td>
                      <td>
                        <button className="icon-button" onClick={() => removeItem(index)} style={{ color: '#ef4444' }}>
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: "center", padding: "2rem", color: '#6b7280' }}>
                        Click "Add Product" to begin building the quotation.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Right Column: Backend Authoritative Totals */}
        <div style={{ flex: 1 }}>
          <section className="panel" style={{ position: 'sticky', top: '1rem' }}>
            <div className="section-heading">
              <h2>Calculated Totals</h2>
            </div>
            
            {!quotation ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', fontSize: '0.875rem' }}>
                Save draft to calculate totals using backend pricing rules.
              </div>
            ) : (
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
                  <span style={{ color: '#4b5563' }}>Subtotal</span>
                  <strong>₹{parseFloat(quotation.subtotal).toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
                  <span style={{ color: '#4b5563' }}>Discount Amount</span>
                  <strong style={{ color: '#059669' }}>- ₹{parseFloat(quotation.discountAmount).toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem' }}>
                  <span style={{ color: '#4b5563' }}>Tax Amount</span>
                  <strong>₹{parseFloat(quotation.taxAmount).toLocaleString()}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', paddingTop: '0.5rem' }}>
                  <strong>Final Total</strong>
                  <strong>₹{parseFloat(quotation.total).toLocaleString()}</strong>
                </div>
                
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <small style={{ color: '#4b5563' }}>Status</small>
                    <span className="badge gray">{quotation.status}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <small style={{ color: '#4b5563' }}>Blended Discount</small>
                    <small><strong>{parseFloat(quotation.risk?.blendedDiscountPercent || 0).toFixed(2)}%</strong></small>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <small style={{ color: '#4b5563' }}>Margin</small>
                    <small><strong>{parseFloat(quotation.marginAmount).toLocaleString()}</strong></small>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
        
      </div>
      {simulatorOpen && quotation && (
        <WhatIfSimulator
          quotation={quotation}
          canApply={quotation.status === "DRAFT" && (user?.role === "SALESPERSON" || user?.role === "ADMIN")}
          onApply={applyScenario}
          onClose={() => setSimulatorOpen(false)}
        />
      )}
    </>
  );
}
