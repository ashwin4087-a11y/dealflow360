import { apiFetch } from "./api";

export const intelligenceApi = {
  customerRecommendations: (customerId) => apiFetch(`/recommendations/customer/${customerId}`),
  quotationRecommendations: (quotationId) => apiFetch(`/recommendations/quotation/${quotationId}`),
  dealHealth: () => apiFetch("/deals/health"),
  dealHealthById: (quotationId) => apiFetch(`/deals/${quotationId}/health`),
  dealRescue: () => apiFetch("/deals/rescue"),
  dealRescueById: (quotationId) => apiFetch(`/deals/${quotationId}/rescue`),
};
