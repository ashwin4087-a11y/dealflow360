import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Clock3, FileText, MessageSquare, RefreshCw, Send, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { customerQuotationApi } from "../../api/customerQuotationApi";
import { negotiationApi } from "../../api/negotiationApi";
import { useAuth } from "../../contexts/AuthContext";
import "./CustomerNegotiationPage.css";

const STATUS_LABELS = {
  OPEN: "In Review",
  COUNTEROFFER_REQUESTED: "Counteroffer Requested",
  COUNTEROFFER_DRAFT: "In Review",
  PENDING_APPROVAL: "Awaiting Approval",
  APPROVED: "Revised Offer",
  REJECTED: "Rejected",
  ACCEPTED: "Accepted",
  CLOSED: "Closed",
};

const CUSTOMER_EVENT_LABELS = {
  NEGOTIATION_CREATED: "Negotiation created",
  CUSTOMER_COUNTEROFFER: "Counteroffer submitted",
  SALES_COUNTEROFFER: "Revised offer received",
  ACCEPTED: "Offer accepted",
  CLOSED: "Negotiation closed",
};

const money = (value) => value === null || value === undefined || value === "" ? "Not available" : `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const percent = (value) => value === null || value === undefined || value === "" ? "Not provided" : `${Number(value).toFixed(2)}%`;
const valueOr = (value, fallback = "Not provided") => value === null || value === undefined || value === "" ? fallback : value;
const dateLabel = (value) => value ? new Date(value).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Not available";
const quantityFor = (quotation) => quotation?.items?.reduce((total, item) => total + Number(item.quantity || 0), 0) || null;
const safeStatus = (status) => STATUS_LABELS[status] || "In Review";
const statusClass = (status) => `customer-negotiation-status customer-status-${String(status || "OPEN").toLowerCase()}`;

const customerSafeNegotiation = (negotiation) => {
  const allowedEvents = (negotiation.events || []).filter((event) => CUSTOMER_EVENT_LABELS[event.eventType]);
  return {
    id: negotiation.id,
    quotationId: negotiation.quotationId,
    status: negotiation.status,
    customerRequestedDiscount: negotiation.customerRequestedDiscount,
    customerRequestedQuantity: negotiation.customerRequestedQuantity,
    customerRequestedPaymentTerms: negotiation.customerRequestedPaymentTerms,
    customerMessage: negotiation.customerMessage,
    currentDiscount: negotiation.currentDiscount,
    proposedDiscount: negotiation.proposedDiscount,
    proposedQuantity: negotiation.proposedQuantity,
    proposedPaymentTerms: negotiation.proposedPaymentTerms,
    proposedMessage: negotiation.proposedMessage,
    calculatedTotal: negotiation.calculatedTotal,
    createdAt: negotiation.createdAt,
    updatedAt: negotiation.updatedAt,
    events: allowedEvents.map(({ id, eventType, message, createdAt }) => ({ id, eventType, message, createdAt })),
  };
};

function CustomerShell({ children, title, onBack }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return <div className="customer-negotiation-shell"><header className="customer-portal-header"><div className="customer-portal-brand"><img src="/logo.png" alt="DealFlow360" /><div><strong>DealFlow360</strong><small>Customer Portal</small></div></div><div className="customer-portal-actions"><span>{user?.id || "Customer"}</span><button className="small-button" onClick={() => { logout(); navigate("/login"); }}>Sign out</button></div></header><main className="customer-negotiation-content">{onBack && <button className="back-button" onClick={onBack}><ArrowLeft size={15} /> Back to negotiations</button>}{children}</main></div>;
}

function Field({ label, value }) {
  return <div className="customer-negotiation-field"><small>{label}</small><strong>{value}</strong></div>;
}

function EmptyState() {
  return <div className="customer-negotiation-empty"><FileText size={20} /><strong>No negotiation records are available for your account.</strong></div>;
}

function Timeline({ events }) {
  return <section className="customer-negotiation-panel"><div className="customer-panel-heading"><div><Clock3 size={16} /><h2>Negotiation history</h2></div></div><div className="customer-history">{events.length ? events.map((event, index) => <div className="customer-history-event" key={event.id || `${event.eventType}-${index}`}><span><Check size={11} /></span><div><strong>{CUSTOMER_EVENT_LABELS[event.eventType]}</strong><small>{dateLabel(event.createdAt)}</small>{event.message && <p>{event.message}</p>}</div></div>) : <div className="customer-muted">No history recorded yet.</div>}</div></section>;
}

function AcceptModal({ onCancel, onConfirm, working }) {
  const [checked, setChecked] = useState(false);
  return <div className="customer-modal-backdrop"><section className="customer-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="accept-heading"><div className="customer-modal-heading"><h2 id="accept-heading">Review &amp; Accept</h2><button className="icon-button" onClick={onCancel} aria-label="Close"><X size={16} /></button></div><p>Please confirm that you accept the revised quotation terms shown in this workspace.</p><label className="customer-confirm-check"><input type="checkbox" checked={checked} onChange={(event) => setChecked(event.target.checked)} /> <span>I confirm that I accept these quotation terms.</span></label><div className="customer-modal-actions"><button className="secondary-button" onClick={onCancel}>Cancel</button><button className="primary-button" disabled={!checked || working} onClick={onConfirm}>{working ? "Confirming..." : "Confirm Acceptance"}</button></div></section></div>;
}

function CustomerCounterofferForm({ negotiation, onSaved, setFeedback }) {
  const [form, setForm] = useState({
    customerRequestedDiscount: negotiation.customerRequestedDiscount || "",
    customerRequestedQuantity: negotiation.customerRequestedQuantity || "",
    customerRequestedPaymentTerms: negotiation.customerRequestedPaymentTerms || "",
    customerMessage: "",
  });
  const [saving, setSaving] = useState(false);
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setFeedback(null);
    try { await negotiationApi.createCounteroffer(negotiation.id, form); setFeedback({ type: "success", message: "Counteroffer submitted." }); await onSaved(); }
    catch (error) { setFeedback({ type: "error", message: error.message || "Counteroffer could not be submitted." }); }
    finally { setSaving(false); }
  };
  return <form className="customer-negotiation-panel customer-counteroffer-form" onSubmit={submit}><div className="customer-panel-heading"><div><MessageSquare size={16} /><h2>Request a change</h2></div></div><div className="customer-form-grid"><label>Requested discount<input type="number" min="0" max="100" step="0.01" required value={form.customerRequestedDiscount} onChange={update("customerRequestedDiscount")} /></label><label>Requested quantity<input type="number" min="0.01" step="0.01" required value={form.customerRequestedQuantity} onChange={update("customerRequestedQuantity")} /></label><label>Requested payment terms<input required value={form.customerRequestedPaymentTerms} onChange={update("customerRequestedPaymentTerms")} placeholder="e.g. Net 60" /></label><label className="customer-wide-field">Message / reason<textarea required value={form.customerMessage} onChange={update("customerMessage")} placeholder="Tell Sales what you need changed" /></label></div><button className="primary-button" type="submit" disabled={saving}><Send size={14} />{saving ? "Submitting..." : "Submit Counteroffer"}</button></form>;
}

export default function CustomerNegotiationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { negotiationId } = useParams();
  const [negotiations, setNegotiations] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedQuotation, setSelectedQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [showAccept, setShowAccept] = useState(false);

  const quotationMap = useMemo(() => new Map(quotations.map((quotation) => [quotation.id, quotation])), [quotations]);
  const loadList = async () => {
    setLoading(true); setError(null);
    try { const [negotiationResponse, quotationResponse] = await Promise.all([negotiationApi.getNegotiations(), customerQuotationApi.getQuotations()]); setNegotiations((negotiationResponse.data || []).map(customerSafeNegotiation)); setQuotations(quotationResponse.data || []); }
    catch (loadError) { setError(loadError.message || "Negotiations could not be loaded."); }
    finally { setLoading(false); }
  };
  const loadDetail = async (id) => {
    setLoading(true); setError(null);
    try { const [negotiationResponse, quotationResponse] = await Promise.all([negotiationApi.getNegotiation(id), customerQuotationApi.getQuotations()]); const safeNegotiation = customerSafeNegotiation(negotiationResponse.data); const ownQuotation = (quotationResponse.data || []).find((quotation) => quotation.id === safeNegotiation.quotationId); if (!ownQuotation) throw new Error("Negotiation not found for your account."); setSelected(safeNegotiation); setSelectedQuotation(ownQuotation); setQuotations(quotationResponse.data || []); }
    catch (loadError) { setSelected(null); setError(loadError.message || "Negotiation could not be loaded."); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (user?.role === "CUSTOMER") loadList(); }, [user?.role]);
  useEffect(() => { if (negotiationId && user?.role === "CUSTOMER") loadDetail(negotiationId); else { setSelected(null); setSelectedQuotation(null); } }, [negotiationId, user?.role]);
  const reload = async () => { await loadDetail(negotiationId); await loadList(); };
  const accept = async () => { setAccepting(true); setFeedback(null); try { await negotiationApi.close(selected.id); setShowAccept(false); setFeedback({ type: "success", message: "Quotation accepted successfully." }); await reload(); } catch (acceptError) { setFeedback({ type: "error", message: acceptError.message || "Acceptance failed." }); } finally { setAccepting(false); } };

  if (user?.role !== "CUSTOMER") return <div className="customer-negotiation-page-state"><strong>Customer Portal</strong><span>This workspace is available to authenticated Customer accounts only.</span></div>;
  if (loading && !selected) return <CustomerShell><div className="customer-negotiation-page-state">Loading your negotiations...</div></CustomerShell>;
  if (error && !selected) return <CustomerShell><div className="customer-negotiation-page-state customer-error"><strong>Negotiations unavailable</strong><span>{error}</span><button className="secondary-button" onClick={negotiationId ? () => loadDetail(negotiationId) : loadList}><RefreshCw size={14} /> Retry</button></div></CustomerShell>;
  if (!negotiationId) return <CustomerShell><div className="customer-page-header"><div><div className="customer-eyebrow">Customer Portal / Commercial discussions</div><h1>My Negotiations</h1><p>Review your quotation changes and respond to revised offers.</p></div></div><section className="customer-negotiation-panel"><div className="customer-panel-heading"><div><FileText size={16} /><h2>Your negotiation records</h2></div><span>{negotiations.length} records</span></div>{negotiations.length ? <div className="table-wrap"><table className="customer-negotiation-table"><thead><tr><th>Quotation</th><th>Status</th><th>Current offer</th><th>Requested change</th><th>Last updated</th><th>Action</th></tr></thead><tbody>{negotiations.map((negotiation) => { const quotation = quotationMap.get(negotiation.quotationId); return <tr key={negotiation.id}><td><strong>{valueOr(quotation?.quotationNumber, negotiation.quotationId)}</strong><small>{quotation?.items?.length || 0} items</small></td><td><span className={statusClass(negotiation.status)}>{safeStatus(negotiation.status)}</span></td><td>{money(quotation?.total)}<small>{percent(negotiation.currentDiscount)} discount</small></td><td>{percent(negotiation.customerRequestedDiscount)}<small>{valueOr(negotiation.customerRequestedQuantity)} quantity</small></td><td>{dateLabel(negotiation.updatedAt)}</td><td><button className="small-button" onClick={() => navigate(`/customer/negotiations/${negotiation.id}`)}>Open</button></td></tr>; })}</tbody></table></div> : <EmptyState />}</section></CustomerShell>;
  if (loading && !selected) return <CustomerShell onBack={() => navigate("/customer/negotiations")}><div className="customer-negotiation-page-state">Loading negotiation...</div></CustomerShell>;
  if (error && !selected) return <CustomerShell onBack={() => navigate("/customer/negotiations")}><div className="customer-negotiation-page-state customer-error"><strong>Negotiation unavailable</strong><span>{error}</span><button className="secondary-button" onClick={() => loadDetail(negotiationId)}><RefreshCw size={14} /> Retry</button></div></CustomerShell>;
  const isRevisedOffer = selected.status === "APPROVED";
  const canCounter = !["ACCEPTED", "CLOSED", "REJECTED"].includes(selected.status);
  return <CustomerShell onBack={() => navigate("/customer/negotiations")}><div className="customer-page-header"><div><div className="customer-eyebrow">Customer Portal / Negotiation</div><h1>{valueOr(selectedQuotation?.quotationNumber, selected.quotationId)}</h1><p>Review the quotation and your commercial discussion.</p></div><span className={statusClass(selected.status)}>{safeStatus(selected.status)}</span></div>{feedback && <div className={`customer-feedback ${feedback.type === "error" ? "customer-feedback-error" : ""}`} role="status">{feedback.type === "error" ? <RefreshCw size={15} /> : <Check size={15} />} {feedback.message}</div>}<div className="customer-detail-grid"><section className="customer-negotiation-panel"><div className="customer-panel-heading"><div><FileText size={16} /><h2>Quotation</h2></div></div><div className="customer-offer-grid"><Field label="Customer" value={valueOr(selectedQuotation?.customer?.name)} /><Field label="Current total" value={money(selectedQuotation?.total)} /><Field label="Current discount" value={percent(selected.currentDiscount)} /><Field label="Quantity" value={valueOr(quantityFor(selectedQuotation))} /></div><div className="customer-items"><strong>Products and items</strong>{(selectedQuotation?.items || []).map((item) => <div key={item.id}><span>{item.product?.name || item.productId}</span><small>{item.quantity} × {money(item.unitPrice)}</small></div>)}</div></section><section className="customer-negotiation-panel"><div className="customer-panel-heading"><div><MessageSquare size={16} /><h2>{isRevisedOffer ? "Revised Offer" : "Your request"}</h2></div></div><div className="customer-offer-grid"><Field label="Discount" value={percent(isRevisedOffer ? selected.proposedDiscount : selected.customerRequestedDiscount)} /><Field label="Quantity" value={valueOr(isRevisedOffer ? selected.proposedQuantity : selected.customerRequestedQuantity)} /><Field label="Payment terms" value={valueOr(isRevisedOffer ? selected.proposedPaymentTerms : selected.customerRequestedPaymentTerms)} /><Field label="Total" value={money(isRevisedOffer ? selected.calculatedTotal : selectedQuotation?.total)} /></div><div className="customer-message"><small>{isRevisedOffer ? "Sales response" : "Your message"}</small><p>{valueOr(isRevisedOffer ? selected.proposedMessage : selected.customerMessage)}</p></div></section></div><div className="customer-detail-grid"><Timeline events={selected.events} />{canCounter && <CustomerCounterofferForm negotiation={selected} onSaved={reload} setFeedback={setFeedback} />}</div>{isRevisedOffer && <section className="customer-negotiation-panel customer-revised-actions"><strong>Revised offer ready for your review</strong><div><button className="primary-button" onClick={() => setShowAccept(true)}><Check size={14} />Review &amp; Accept</button><button className="secondary-button" onClick={() => document.querySelector(".customer-counteroffer-form")?.scrollIntoView({ behavior: "smooth" })}>Counter Again</button></div></section>}{showAccept && <AcceptModal onCancel={() => setShowAccept(false)} onConfirm={accept} working={accepting} />}</CustomerShell>;
}