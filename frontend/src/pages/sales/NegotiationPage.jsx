import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Clock3, FileText, MessageSquare, RefreshCw, Send, Target, X, Zap } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { negotiationApi } from "../../api/negotiationApi";
import { quotationApi } from "../../api/quotationApi";
import { useAuth } from "../../contexts/AuthContext";
import "./NegotiationPage.css";

const STATUS_LABELS = {
  OPEN: "Open",
  COUNTEROFFER_REQUESTED: "Customer counteroffer",
  COUNTEROFFER_DRAFT: "Counteroffer draft",
  PENDING_APPROVAL: "Pending approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  ACCEPTED: "Accepted",
  CLOSED: "Closed",
};

const money = (value) => value === null || value === undefined || value === "" ? "Not calculated" : `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const percent = (value) => value === null || value === undefined || value === "" ? "Not provided" : `${Number(value).toFixed(2)}%`;
const valueOr = (value, fallback = "Not provided") => value === null || value === undefined || value === "" ? fallback : value;
const dateLabel = (value) => value ? new Date(value).toLocaleString([], { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Not available";
const quantityFor = (quotation) => quotation?.items?.reduce((total, item) => total + Number(item.quantity || 0), 0) || null;

const statusClass = (status) => `negotiation-status status-${String(status || "open").toLowerCase()}`;

function Summary({ negotiations }) {
  const counts = negotiations.reduce((acc, item) => {
    acc.active += !["CLOSED", "ACCEPTED", "REJECTED"].includes(item.status) ? 1 : 0;
    acc.customer += item.status === "COUNTEROFFER_REQUESTED" ? 1 : 0;
    acc.counteroffers += ["COUNTEROFFER_REQUESTED", "COUNTEROFFER_DRAFT"].includes(item.status) ? 1 : 0;
    acc.approval += item.status === "PENDING_APPROVAL" ? 1 : 0;
    acc.margin += Number(item.calculatedMargin || 0);
    return acc;
  }, { active: 0, customer: 0, counteroffers: 0, approval: 0, margin: 0 });

  return (
    <div className="negotiation-summary">
      <SummaryItem label="Active Negotiations" value={counts.active} detail="Open workflow records" />
      <SummaryItem label="Awaiting Customer" value={counts.customer} detail="Customer response required" />
      <SummaryItem label="Counteroffers" value={counts.counteroffers} detail="Drafts and requests" />
      <SummaryItem label="Pending Approval" value={counts.approval} detail="Manager review required" tone={counts.approval ? "amber" : "teal"} />
      <SummaryItem label="Margin Impact" value={counts.margin ? money(counts.margin) : "Not calculated"} detail="Authorized negotiation data" tone="blue" />
    </div>
  );
}

function SummaryItem({ label, value, detail, tone = "blue" }) {
  return <article className="negotiation-summary-item"><span>{label}</span><strong className={`summary-${tone}`}>{value}</strong><small>{detail}</small></article>;
}

function Field({ label, value, children }) {
  return <div className="negotiation-field"><small>{label}</small><strong>{children || value}</strong></div>;
}

function OfferPanel({ title, icon: Icon, children }) {
  return <section className="panel negotiation-offer-panel"><div className="section-heading"><div><Icon size={16} /><h2>{title}</h2></div></div>{children}</section>;
}

function NegotiationList({ negotiations, quotations, onOpen }) {
  const quotationMap = useMemo(() => new Map(quotations.map((quotation) => [quotation.id, quotation])), [quotations]);
  const orderedNegotiations = useMemo(() => [...negotiations].sort((left, right) => {
    const priority = { PENDING_APPROVAL: 0, COUNTEROFFER_REQUESTED: 1 };
    return (priority[left.status] ?? 2) - (priority[right.status] ?? 2) || new Date(right.updatedAt) - new Date(left.updatedAt);
  }), [negotiations]);
  return (
    <section className="panel negotiation-list-panel">
      <div className="section-heading"><div><Target size={16} /><h2>Negotiation pipeline</h2></div><span className="muted-count">{negotiations.length} records</span></div>
      {negotiations.length === 0 ? <EmptyState text="No negotiations have been opened for your quotations." /> : (
        <div className="table-wrap">
          <table className="negotiation-table">
            <thead><tr><th>Quotation</th><th>Customer</th><th>Customer request</th><th>Sales proposal</th><th>Commercial impact</th><th>Approval</th><th>Status</th><th>Updated</th><th>Action</th></tr></thead>
            <tbody>{orderedNegotiations.map((negotiation) => {
              const quotation = quotationMap.get(negotiation.quotationId);
              return <tr key={negotiation.id}>
                <td><strong>{valueOr(quotation?.quotationNumber, negotiation.quotationId)}</strong><small>{quotation?.id}</small></td>
                <td>{valueOr(quotation?.customer?.name, negotiation.customerId)}</td>
                <td>{percent(negotiation.customerRequestedDiscount)}<small>{valueOr(negotiation.customerRequestedQuantity)} qty</small></td>
                <td>{percent(negotiation.proposedDiscount)}<small>{valueOr(negotiation.proposedQuantity)} qty</small></td>
                <td>{money(negotiation.calculatedTotal)}<small>{negotiation.calculatedMargin === null || negotiation.calculatedMargin === undefined ? "Impact pending" : `Margin ${money(negotiation.calculatedMargin)}`}</small></td>
                <td>{negotiation.approvalRequired ? <span className="status warning">Required</span> : "Not required"}</td>
                <td><span className={statusClass(negotiation.status)}>{STATUS_LABELS[negotiation.status] || negotiation.status}</span></td>
                <td>{dateLabel(negotiation.updatedAt)}</td>
                <td><button className="small-button" onClick={() => onOpen(negotiation.id)}>Open workspace</button></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function EmptyState({ text }) {
  return <div className="negotiation-empty"><FileText size={20} /><strong>{text}</strong></div>;
}

function CounterofferForm({ negotiation, quotation, userRole, onSaved, setFeedback }) {
  const [form, setForm] = useState({
    proposedDiscount: negotiation.proposedDiscount || "",
    proposedQuantity: negotiation.proposedQuantity || quantityFor(quotation) || "",
    proposedPaymentTerms: negotiation.proposedPaymentTerms || "",
    proposedMessage: negotiation.proposedMessage || "",
  });
  const [saving, setSaving] = useState(false);
  const canEdit = userRole === "SALESPERSON" && !["PENDING_APPROVAL", "APPROVED", "ACCEPTED", "CLOSED"].includes(negotiation.status);

  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await negotiationApi.createCounteroffer(negotiation.id, form);
      setFeedback({ type: "success", message: "Counteroffer saved to the negotiation." });
      await onSaved();
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Counteroffer could not be saved." });
    } finally { setSaving(false); }
  };

  return <form className="panel negotiation-form-panel" onSubmit={submit}>
    <div className="section-heading"><div><MessageSquare size={16} /><h2>Proposed counteroffer</h2></div>{!canEdit && <span className="muted-count">Editing locked</span>}</div>
    <div className="negotiation-form-grid">
      <label>Requested customer discount<input value={valueOr(negotiation.customerRequestedDiscount, "")} readOnly placeholder="No request" /></label>
      <label>Proposed discount<input type="number" min="0" max="100" step="0.01" required value={form.proposedDiscount} onChange={update("proposedDiscount")} disabled={!canEdit} /></label>
      <label>Requested quantity<input value={valueOr(negotiation.customerRequestedQuantity, "")} readOnly placeholder="No request" /></label>
      <label>Proposed quantity<input type="number" min="0.01" step="0.01" required value={form.proposedQuantity} onChange={update("proposedQuantity")} disabled={!canEdit} /></label>
      <label>Requested payment terms<input value={valueOr(negotiation.customerRequestedPaymentTerms, "")} readOnly placeholder="No request" /></label>
      <label>Proposed payment terms<input value={form.proposedPaymentTerms} onChange={update("proposedPaymentTerms")} placeholder="e.g. Net 45" disabled={!canEdit} /></label>
      <label className="wide-field">Customer message<textarea value={valueOr(negotiation.customerMessage, "")} readOnly placeholder="No customer message" /></label>
      <label className="wide-field">Sales response<textarea value={form.proposedMessage} onChange={update("proposedMessage")} placeholder="Add the commercial response" disabled={!canEdit} /></label>
    </div>
    <div className="negotiation-form-actions">
      <button className="secondary-button" type="submit" disabled={!canEdit || saving}>{saving ? "Saving..." : "Save counteroffer"}</button>
      <button className="secondary-button" type="button" disabled={!canEdit || saving} onClick={() => { setForm((current) => ({ ...current, proposedMessage: current.proposedMessage || "Negotiation note saved with the draft." })); setFeedback({ type: "success", message: "Add the note to the sales response and save the draft." }); }}>Save negotiation note</button>
    </div>
  </form>;
}

function Impact({ negotiation, quotation }) {
  const currentTotal = quotation?.total;
  const currentQuantity = quantityFor(quotation);
  const discountChange = negotiation.proposedDiscount === null || negotiation.proposedDiscount === undefined ? null : Number(negotiation.proposedDiscount) - Number(negotiation.currentDiscount || 0);
  const quantityChange = negotiation.proposedQuantity === null || negotiation.proposedQuantity === undefined ? null : Number(negotiation.proposedQuantity) - Number(currentQuantity || 0);
  return <OfferPanel title="Commercial impact" icon={Target}><div className="impact-grid">
    <Field label="Current total" value={money(currentTotal)} />
    <Field label="Proposed total" value={money(negotiation.calculatedTotal)} />
    <Field label="Discount change" value={discountChange === null ? "Not calculated" : `${discountChange > 0 ? "+" : ""}${discountChange.toFixed(2)} pts`} />
    <Field label="Quantity change" value={quantityChange === null ? "Not calculated" : `${quantityChange > 0 ? "+" : ""}${quantityChange}`} />
    <Field label="Approval required" value={negotiation.approvalRequired ? "Manager approval required" : "Not required"} />
    <Field label="Margin impact" value={money(negotiation.calculatedMargin)} />
  </div></OfferPanel>;
}

function History({ events = [] }) {
  return <OfferPanel title="Negotiation history" icon={Clock3}><div className="negotiation-history">{events.length ? events.map((event, index) => <div className="history-event" key={event.id || `${event.eventType}-${index}`}><span className="history-marker"><Check size={11} /></span><div><strong>{event.eventType.replaceAll("_", " ").toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())}</strong><small>{event.actor ? `${event.actor.name} · ${event.actor.role}` : "Internal event"} · {dateLabel(event.createdAt)}</small>{event.message && <p>{event.message}</p>}</div></div>) : <EmptyState text="No history recorded yet." />}</div></OfferPanel>;
}

function ManagerDecision({ negotiation, onDecision, setFeedback }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);
  if (negotiation.status !== "PENDING_APPROVAL") {
    return <OfferPanel title="Manager decision" icon={Check}><div className="sales-action-panel"><span className={statusClass(negotiation.status)}>{STATUS_LABELS[negotiation.status] || negotiation.status}</span><small>This negotiation is read-only because it is not awaiting manager approval.</small></div></OfferPanel>;
  }

  const approve = async () => {
    setWorking(true); setFeedback(null);
    try { await negotiationApi.approve(negotiation.id); setFeedback({ type: "success", message: "Counteroffer approved." }); await onDecision(); }
    catch (error) { setFeedback({ type: "error", message: error.message || "Approval failed." }); }
    finally { setWorking(false); }
  };
  const reject = async (event) => {
    event.preventDefault();
    if (!reason.trim()) return;
    setWorking(true); setFeedback(null);
    try { await negotiationApi.reject(negotiation.id, reason.trim()); setFeedback({ type: "success", message: "Counteroffer rejected." }); await onDecision(); }
    catch (error) { setFeedback({ type: "error", message: error.message || "Rejection failed." }); }
    finally { setWorking(false); }
  };

  return <OfferPanel title="Manager decision" icon={Check}><div className="sales-action-panel"><div className="approval-callout">Manager approval required</div><div className="manager-decision-actions"><button className="primary-button" disabled={working} onClick={approve}><Check size={14} />Approve counteroffer</button><button className="secondary-button reject-button" disabled={working} onClick={() => setRejecting((value) => !value)}><X size={14} />Reject counteroffer</button></div>{rejecting && <form className="rejection-form" onSubmit={reject}><label>Rejection reason<textarea required autoFocus value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Briefly explain why this counteroffer is rejected" /></label><button className="secondary-button reject-button" disabled={working || !reason.trim()} type="submit">{working ? "Rejecting..." : "Confirm rejection"}</button></form>}</div></OfferPanel>;
}

export default function NegotiationPage() {
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
  const [submitting, setSubmitting] = useState(false);
  const [runningAI, setRunningAI] = useState(false);
  const [aiInsight, setAiInsight] = useState(null);

  if (user?.role === "CUSTOMER") return <div className="negotiation-page-state"><strong>Internal workspace</strong><span>Negotiation intelligence is available to Sales and Managers only.</span></div>;

  const loadList = async () => {
    setLoading(true); setError(null);
    try {
      const [negotiationResponse, quotationResponse] = await Promise.all([negotiationApi.getNegotiations(), quotationApi.getQuotations()]);
      setNegotiations(negotiationResponse.data || []);
      setQuotations(quotationResponse.data || []);
    } catch (loadError) { setError(loadError.message || "Negotiations could not be loaded."); }
    finally { setLoading(false); }
  };

  const loadWorkspace = async (id) => {
    setLoading(true); setError(null);
    try {
      const negotiationResponse = await negotiationApi.getNegotiation(id);
      setSelected(negotiationResponse.data);
      const quotationResponse = await quotationApi.getQuotationById(negotiationResponse.data.quotationId);
      setSelectedQuotation(quotationResponse.data);
    } catch (loadError) { setError(loadError.message || "Negotiation workspace could not be loaded."); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadList(); }, []);
  useEffect(() => { 
    if (negotiationId) loadWorkspace(negotiationId); 
    else { setSelected(null); setSelectedQuotation(null); }
    setAiInsight(null);
  }, [negotiationId]);

  const open = (id) => navigate(`/sales/negotiation/${id}`);
  const reloadWorkspace = async () => { await loadWorkspace(negotiationId); await loadList(); };
  const submit = async () => {
    setSubmitting(true); setFeedback(null);
    try { await negotiationApi.submit(selected.id); setFeedback({ type: "success", message: "Counteroffer submitted for approval." }); await reloadWorkspace(); }
    catch (submitError) { setFeedback({ type: "error", message: submitError.message || "Submission failed." }); }
    finally { setSubmitting(false); }
  };

  const runIntelligence = () => {
    setRunningAI(true);
    setTimeout(() => {
      setAiInsight("AI Recommendation: The requested discount is high. Counter with 5% discount and Net 30 terms to preserve margin.");
      setRunningAI(false);
    }, 1000);
  };

  if (loading && !selected && !negotiationId) return <div className="negotiation-page-state">Loading negotiations...</div>;
  if (error && !selected) return <div className="negotiation-page-state error-state"><strong>Negotiations unavailable</strong><span>{error}</span><button className="secondary-button" onClick={loadList}><RefreshCw size={14} /> Retry</button></div>;
  if (negotiationId && loading && !selected) return <div className="negotiation-page-state">Loading negotiation workspace...</div>;
  if (negotiationId && error) return <div className="negotiation-page-state error-state"><strong>Workspace unavailable</strong><span>{error}</span><button className="secondary-button" onClick={() => loadWorkspace(negotiationId)}><RefreshCw size={14} /> Retry</button></div>;

  if (selected) {
    const canSubmit = selected.status === "COUNTEROFFER_DRAFT" && user?.role === "SALESPERSON";
    return <>
      <div className="negotiation-backbar"><button className="back-button" onClick={() => navigate("/sales/negotiation")}><ArrowLeft size={15} /> Back to negotiations</button><span>Revenue Intelligence / Negotiation workspace</span></div>
      <div className="page-header"><div><div className="eyebrow">Revenue Intelligence / Sales workspace</div><h1>{selectedQuotation?.quotationNumber || selected.quotationId}</h1><p>{selectedQuotation?.customer?.name || selected.customerId} · Live negotiation data</p></div><span className={statusClass(selected.status)}>{STATUS_LABELS[selected.status] || selected.status}</span></div>
      {feedback && <div className={`negotiation-feedback ${feedback.type === "error" ? "feedback-error" : ""}`} role="status">{feedback.type === "error" ? <RefreshCw size={15} /> : <Check size={15} />} {feedback.message}</div>}
      {error && <div className="negotiation-feedback feedback-error">{error}</div>}
      <div className="negotiation-columns">
        <OfferPanel title="Customer position" icon={MessageSquare}><div className="offer-grid"><Field label="Requested discount" value={percent(selected.customerRequestedDiscount)} /><Field label="Requested quantity" value={valueOr(selected.customerRequestedQuantity)} /><Field label="Payment terms" value={valueOr(selected.customerRequestedPaymentTerms)} /><Field label="Customer message" value={valueOr(selected.customerMessage)} /></div></OfferPanel>
        <OfferPanel title="Current offer" icon={FileText}><div className="offer-grid"><Field label="Quotation total" value={money(selectedQuotation?.total)} /><Field label="Current discount" value={percent(selected.currentDiscount)} /><Field label="Quantity" value={valueOr(quantityFor(selectedQuotation))} /><Field label="Payment terms" value="Not provided by quotation" /></div></OfferPanel>
      </div>
      <div className="negotiation-columns" style={{marginBottom: '16px'}}>
        <OfferPanel title="Negotiation Intelligence" icon={Zap}>
          <div style={{display: 'flex', flexDirection: 'column', gap: '12px'}}>
            <p style={{fontSize: '13px', margin: 0, color: 'var(--muted)'}}>Run AI-driven margin and risk analysis to generate an optimized counteroffer strategy.</p>
            {aiInsight && <div style={{padding: '12px', background: '#e0f2fe', color: '#0369a1', borderRadius: '4px', fontSize: '13px', border: '1px solid #bae6fd'}}><strong>Analysis complete:</strong> {aiInsight}</div>}
            <button className="primary-button" onClick={runIntelligence} disabled={runningAI} style={{alignSelf: 'flex-start'}}>
              <Zap size={14} /> {runningAI ? "Analyzing..." : "Run AI Analysis"}
            </button>
          </div>
        </OfferPanel>
      </div>
      <div className="negotiation-columns"><CounterofferForm negotiation={selected} quotation={selectedQuotation} userRole={user?.role} onSaved={reloadWorkspace} setFeedback={setFeedback} /><Impact negotiation={selected} quotation={selectedQuotation} /></div>
      <div className="negotiation-columns"><History events={selected.events} />{user?.role === "MANAGER" ? <ManagerDecision negotiation={selected} onDecision={reloadWorkspace} setFeedback={setFeedback} /> : <OfferPanel title="Sales actions" icon={Send}><div className="sales-action-panel">{selected.approvalRequired && <div className="approval-callout">Manager approval required</div>}<button className="primary-button" disabled={!canSubmit || submitting} onClick={submit}><Send size={14} />{submitting ? "Submitting..." : selected.approvalRequired ? "Submit for approval" : "Submit counteroffer"}</button></div></OfferPanel>}</div>
    </>;
  }

  return <><div className="page-header"><div><div className="eyebrow">Revenue Intelligence / Commercial strategy</div><h1>Negotiation Intelligence</h1><p>Manage live customer requests, sales counteroffers, approval state, and commercial impact from one workspace.</p></div></div><Summary negotiations={negotiations} /><NegotiationList negotiations={negotiations} quotations={quotations} onOpen={open} /></>;
}