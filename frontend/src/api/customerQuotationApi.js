import { apiFetch } from "./api";

export const customerQuotationApi = {
  getQuotations: () => apiFetch("/customer/quotations"),
};