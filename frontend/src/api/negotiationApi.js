import { apiFetch } from "./api";

export const negotiationApi = {
  getNegotiations: () => apiFetch("/negotiations"),
  getNegotiation: (id) => apiFetch(`/negotiations/${id}`),
  getByQuotation: (quotationId) => apiFetch(`/quotations/${quotationId}/negotiation`),
  create: (quotationId) => apiFetch(`/quotations/${quotationId}/negotiation`, { method: "POST" }),
  createCounteroffer: (id, body) => apiFetch(`/negotiations/${id}/counteroffer`, {
    method: "POST",
    body: JSON.stringify(body),
  }),
  submit: (id) => apiFetch(`/negotiations/${id}/submit`, { method: "POST" }),
  approve: (id) => apiFetch(`/negotiations/${id}/approve`, { method: "POST" }),
  reject: (id, reason) => apiFetch(`/negotiations/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  }),
  close: (id) => apiFetch(`/negotiations/${id}/close`, { method: "POST" }),
};