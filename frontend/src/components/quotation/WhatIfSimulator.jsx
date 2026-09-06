import React, { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, RotateCcw, X } from "lucide-react";
import { quotationApi } from "../../api/quotationApi";

const numberValue = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const money = (value) => `₹${numberValue(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const itemsFor = (items) => items.map((item) => ({
  productId: item.productId,
  quantity: String(item.quantity),
  discountPercent: String(item.discountPercent),
}));

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  border: '1.5px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '0.95rem',
  color: '#1e293b',
  background: '#fff',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const inputFocusStyle = {
  borderColor: '#3b82f6',
  boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.15)',
};

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: '#475569',
  letterSpacing: '0.02em',
};

const valueChipStyle = {
  fontSize: '1rem',
  fontWeight: 700,
  color: '#2563eb',
};

export default function WhatIfSimulator({ quotation, canApply, userRole, applyError, onApply, onClose }) {
  const [scenarioItems, setScenarioItems] = useState(() => itemsFor(quotation.items || []));
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedInput, setFocusedInput] = useState(null);
  const [applying, setApplying] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    setScenarioItems(itemsFor(quotation.items || []));
  }, [quotation]);

  useEffect(() => {
    // Lock body scroll when modal opens
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  // Debounced preview - waits 500ms after the user stops typing
  const fetchPreview = useCallback((items) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // Validate items before sending
      const hasInvalidValues = items.some(
        (item) => !item.quantity || !item.discountPercent === undefined ||
          isNaN(Number(item.quantity)) || Number(item.quantity) <= 0
      );
      if (hasInvalidValues) {
        setError("Please enter valid positive numbers for quantity.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      quotationApi.previewQuotation(quotation.id, items)
        .then((response) => setPreview(response.data))
        .catch((requestError) => setError(requestError.message || "Scenario preview unavailable"))
        .finally(() => setLoading(false));
    }, 500);
  }, [quotation.id]);

  useEffect(() => {
    fetchPreview(scenarioItems);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [scenarioItems, fetchPreview]);

  const updateScenario = (index, field, value) => {
    setScenarioItems((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  };

  const reset = () => setScenarioItems(itemsFor(quotation.items || []));
  const currentTotal = numberValue(quotation.total);
  const scenarioTotal = numberValue(preview?.total);
  const currentMargin = quotation.marginAmount;
  const scenarioMargin = preview?.marginAmount;
  const totalChange = scenarioTotal - currentTotal;
  const marginChange = numberValue(scenarioMargin) - numberValue(currentMargin);

  const getInputStyle = (key) => ({
    ...inputStyle,
    ...(focusedInput === key ? inputFocusStyle : {}),
  });

  const getRoleMessage = () => {
    if (userRole === "SALESPERSON" && quotation.status !== "DRAFT")
      return `This quotation is in ${quotation.status} status. You can only apply scenarios to DRAFT quotations.`;
    if (userRole === "MANAGER")
      return "This quotation's status does not allow changes at this stage.";
    if (userRole === "FINANCE")
      return "Finance can only apply scenarios to quotations pending approval.";
    if (userRole === "CUSTOMER")
      return "View-only mode: customers cannot modify quotation scenarios.";
    if (userRole === "OPERATIONS")
      return "View-only mode: operations cannot modify quotation scenarios.";
    return "You do not have permission to apply scenarios to this quotation.";
  };

  return (
    <div className="simulator-overlay">
      <section className="simulator-panel" role="dialog" aria-modal="true" aria-labelledby="what-if-title">
        <div className="simulator-header">
          <div>
            <span className="eyebrow">Quotation / What-If Scenario</span>
            <h2 id="what-if-title">What-If Deal Simulator</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close simulator"><X size={17} /></button>
        </div>
        <div className="simulator-body">
          <p className="simulator-note">Preview changes with the backend pricing, discount governance, and approval rules. The quotation stays unchanged until Apply Scenario.</p>
          {scenarioItems.map((item, index) => {
            const currentItem = quotation.items[index];
            return (
              <div className="simulator-controls" key={item.productId} style={{ marginBottom: '20px', padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <strong style={{ fontSize: '1rem', color: '#0f172a', display: 'block', marginBottom: '14px' }}>{currentItem.product?.name || item.productId}</strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={labelStyle}>
                    <span>Quantity <span style={valueChipStyle}>{item.quantity}</span></span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(event) => updateScenario(index, "quantity", event.target.value)}
                      onFocus={() => setFocusedInput(`qty-${index}`)}
                      onBlur={() => setFocusedInput(null)}
                      style={getInputStyle(`qty-${index}`)}
                    />
                  </div>
                  <div style={labelStyle}>
                    <span>Discount <span style={valueChipStyle}>{item.discountPercent}%</span></span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={item.discountPercent}
                      onChange={(event) => updateScenario(index, "discountPercent", event.target.value)}
                      onFocus={() => setFocusedInput(`disc-${index}`)}
                      onBlur={() => setFocusedInput(null)}
                      style={getInputStyle(`disc-${index}`)}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          {error && <div className="toast" style={{ position: "relative", top: 0, right: 0, transform: "none", width: "100%" }}><AlertTriangle size={16} />{error}</div>}
          {applyError && <div className="toast" style={{ position: "relative", top: 0, right: 0, transform: "none", width: "100%", backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px solid #f87171' }}><AlertTriangle size={16} />{applyError}</div>}
          {loading && <p className="simulator-note" style={{ color: '#3b82f6' }}>⏳ Recalculating with backend rules...</p>}
          {preview && !loading && (
            <>
              <div className="comparison-table">
                <div className="comparison-head"><strong>Metric</strong><strong>Current</strong><strong>Scenario</strong></div>
                <div className="comparison-row"><span>Total</span><strong>{money(currentTotal)}</strong><strong>{money(scenarioTotal)}</strong></div>
                <div className="comparison-row"><span>Margin</span><strong>{money(currentMargin)}</strong><strong>{money(scenarioMargin)}</strong></div>
                <div className="comparison-row"><span>Approval</span><strong>{quotation.status === "PENDING_APPROVAL" ? "Required" : "Not required"}</strong><strong>{preview.approvalRequired ? "Required" : "Not required"}</strong></div>
                <div className="comparison-row"><span>Discount risk</span><strong>{quotation.risk?.hasLineViolations ? "Exception" : "Within rules"}</strong><strong>{preview.risk?.hasLineViolations ? "Exception" : "Within rules"}</strong></div>
              </div>
              <div className="impact-summary">
                <strong>Impact Summary</strong>
                <span style={{ color: totalChange >= 0 ? '#10b981' : '#ef4444' }}>Price change: {totalChange >= 0 ? "+" : ""}{money(totalChange)}</span>
                <span style={{ color: marginChange >= 0 ? '#10b981' : '#ef4444' }}>Margin change: {marginChange >= 0 ? "+" : ""}{money(marginChange)}</span>
              </div>
            </>
          )}
        </div>
        <div className="simulator-footer">
          {!canApply && (
            <div className="manager-sim-note">{getRoleMessage()}</div>
          )}
          <div className="simulator-actions">
            <button className="secondary-button" type="button" onClick={reset}><RotateCcw size={14} /> Reset</button>
            <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
            {canApply && <button className="primary-button" type="button" disabled={loading || applying || Boolean(error)} onClick={() => { setApplying(true); onApply(scenarioItems); }}>{applying ? "Applying..." : "Apply Scenario"}</button>}
          </div>
        </div>
      </section>
    </div>
  );
}
