import React, { useEffect, useState } from "react";
import { AlertTriangle, RotateCcw, X } from "lucide-react";
import { quotationApi } from "../../api/quotationApi";

const numberValue = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const money = (value) => `₹${numberValue(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const percent = (value) => `${numberValue(value).toFixed(2)}%`;
const itemsFor = (items) => items.map((item) => ({
  productId: item.productId,
  quantity: item.quantity,
  discountPercent: item.discountPercent,
}));

export default function WhatIfSimulator({ quotation, canApply, onApply, onClose }) {
  const [scenarioItems, setScenarioItems] = useState(() => itemsFor(quotation.items || []));
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setScenarioItems(itemsFor(quotation.items || []));
  }, [quotation]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    quotationApi.previewQuotation(quotation.id, scenarioItems)
      .then((response) => { if (active) setPreview(response.data); })
      .catch((requestError) => { if (active) setError(requestError.message || "Scenario preview unavailable"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [quotation.id, scenarioItems]);

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
              <div className="simulator-controls" key={item.productId}>
                <strong>{currentItem.product?.name || item.productId}</strong>
                <label>Quantity <output>{item.quantity}</output><input type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => updateScenario(index, "quantity", event.target.value)} /></label>
                <label>Discount <output>{item.discountPercent}%</output><input type="number" min="0" max="100" step="0.01" value={item.discountPercent} onChange={(event) => updateScenario(index, "discountPercent", event.target.value)} /></label>
              </div>
            );
          })}
          {error && <div className="toast" style={{ position: "relative", top: 0, right: 0, transform: "none", width: "100%" }}><AlertTriangle size={16} />{error}</div>}
          {loading && <p className="simulator-note">Recalculating with backend rules...</p>}
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
                <span>Price change: {totalChange >= 0 ? "+" : ""}{money(totalChange)}</span>
                <span>Margin change: {marginChange >= 0 ? "+" : ""}{money(marginChange)}</span>
                <span>Deal health: backend does not provide a health score; discount governance is shown above.</span>
              </div>
            </>
          )}
        </div>
        <div className="simulator-footer">
          {!canApply && <div className="manager-sim-note">Manager review mode: you can inspect the scenario, but only Sales can apply it.</div>}
          <div className="simulator-actions">
            <button className="secondary-button" type="button" onClick={reset}><RotateCcw size={14} /> Reset</button>
            <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
            {canApply && <button className="primary-button" type="button" disabled={loading || Boolean(error)} onClick={() => onApply(scenarioItems)}>Apply Scenario</button>}
          </div>
        </div>
      </section>
    </div>
  );
}
